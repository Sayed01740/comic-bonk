package com.comicbonk.app

import android.util.Base64
import android.util.Log
import androidx.core.net.toUri
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.solana.mobilewalletadapter.clientlib.ActivityResultSender
import com.solana.mobilewalletadapter.clientlib.ConnectionIdentity
import com.solana.mobilewalletadapter.clientlib.MobileWalletAdapter
import com.solana.mobilewalletadapter.clientlib.TransactionResult
import com.solana.mobilewalletadapter.clientlib.protocol.MobileWalletAdapterClient.AuthorizationResult
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.atomic.AtomicBoolean
import com.solana.mobilewalletadapter.common.signin.SignInWithSolana


@CapacitorPlugin(name = "SolanaWallet")
@Suppress("unused")
class SolanaWalletPlugin : Plugin() {
    private val tag = "SolanaWalletPlugin"

    private val identity = ConnectionIdentity(
        identityUri = "https://comicbonk.com/".toUri(),
        iconUri = "favicon.ico".toUri(),
        identityName = "Comic Bonk"
    )

    private val walletAdapter: MobileWalletAdapter by lazy {
        MobileWalletAdapter(identity, 10000)
    }

    private val scope = CoroutineScope(Dispatchers.IO)
    private lateinit var sender: ActivityResultSender

    @Volatile private var pendingCall: PluginCall? = null
    @Volatile private var connectInProgress = false
    private var retryCount = 0
    private val mwaResultDelivered = AtomicBoolean(false)
    
    // Config & Feature Flags
    private var customRpcUrl = "https://mainnet.helius-rpc.com/?api-key=cebef5c8-9a08-499f-9379-ff5993aa7ba1"
    private var supabaseUrl = "https://kxbknglbeyhcsnywprwd.supabase.co"
    private var collectionMint = "" // Set via configure()
    private var enableGateCheck = false
    private var enableMintPass = false
    private var supabaseAnonKey = ""

    override fun load() {
        super.load()
        sender = ActivityResultSender(activity)
        Log.d(tag, "Plugin loaded, sender initialized")
    }

    override fun handleOnResume() {
        super.handleOnResume()
        scope.launch {
            delay(2500)
            if (pendingCall != null && connectInProgress && !mwaResultDelivered.get()) {
                withContext(Dispatchers.Main) {
                    Log.w(tag, "handleOnResume: MWA timeout — assuming user cancelled")
                    pendingCall?.reject("Connection cancelled by user.")
                    clearState()
                }
            }
        }
    }

    @PluginMethod
    fun connect(call: PluginCall) {
        if (connectInProgress) {
            call.reject("Connect already in progress")
            return
        }
        connectInProgress = true
        mwaResultDelivered.set(false)
        pendingCall = call
        retryCount = 0
        scope.launch {
            doConnect(useSIWS = true)
        }
    }

    private suspend fun doConnect(useSIWS: Boolean) {
        val signInPayload: SignInWithSolana.Payload? = if (useSIWS) {
            try {
                identity.identityUri.host?.let {
                    SignInWithSolana.Payload(it, "Sign in to Comic Bonk to connect your wallet.")
                }
            } catch (@Suppress("UNUSED_PARAMETER") e: Exception) { null }
        } else null

        val result: TransactionResult<AuthorizationResult> = try {
            walletAdapter.transact(sender) {
                authorize(
                    identity.identityUri,
                    identity.iconUri,
                    identity.identityName,
                    chain = "solana:mainnet",
                    signInPayload = signInPayload
                )
            }
        } catch (e: Exception) {
            TransactionResult.Failure("MWA transact failed: ${e.message}", e)
        }

        withContext(Dispatchers.Main) {
            handleResult(result, useSIWS)
        }
    }

    private fun handleResult(result: TransactionResult<AuthorizationResult>, usedSIWS: Boolean) {
        mwaResultDelivered.set(true)
        val call = pendingCall ?: return

        when (result) {
            is TransactionResult.Success -> {
                try {
                    val authResult = result.payload
                    val first = authResult.accounts.first()
                    val pubKeyBytes = first.publicKey
                    val pubKeyBase64 = Base64.encodeToString(pubKeyBytes, Base64.NO_WRAP)
                    val pubKeyBase58 = encodeBase58(pubKeyBytes)
                    val authToken = authResult.authToken

                    val ret = JSObject().apply {
                        put("success", true)
                        put("publicKeyBase64", pubKeyBase64)
                        put("publicKeyBase58", pubKeyBase58)
                        put("authToken", authToken)
                    }

                    authResult.signInResult?.let {
                        ret.put("signature", Base64.encodeToString(it.signature, Base64.NO_WRAP))
                    }
                    call.resolve(ret)
                } catch (e: Exception) {
                    call.reject("Failed to parse wallet response: ${e.message}")
                }
                clearState()
            }
            is TransactionResult.Failure -> {
                if (usedSIWS && retryCount == 0) {
                    retryCount++
                    mwaResultDelivered.set(false)
                    scope.launch {
                        delay(500)
                        doConnect(useSIWS = false)
                    }
                    return
                }
                call.reject("Wallet connection failed: ${result.message}")
                clearState()
            }
            is TransactionResult.NoWalletFound -> {
                call.reject("No compatible wallet found.")
                clearState()
            }
        }
    }

    @PluginMethod
    fun signAndSendTransaction(call: PluginCall) {
        val txBase64 = call.getString("txBase64") ?: return call.reject("Missing txBase64")
        if (connectInProgress) return call.reject("Wallet operation already in progress")
        
        connectInProgress = true
        pendingCall = call
        mwaResultDelivered.set(false)

        scope.launch {
            try {
                val txBytes = Base64.decode(txBase64, Base64.DEFAULT)
                val signResult = walletAdapter.transact(sender) {
                    signTransactions(arrayOf(txBytes))
                }

                if (signResult !is TransactionResult.Success) {
                    call.reject("Signing failed")
                    return@launch
                }

                val signedTxBase64 = Base64.encodeToString(signResult.payload.signedPayloads.first(), Base64.NO_WRAP)
                val signature = sendTransactionToRpc(signedTxBase64) ?: throw Exception("RPC submission failed")
                
                if (confirmTransaction(signature)) {
                    call.resolve(JSObject().put("ok", true).put("txSignature", signature))
                } else {
                    call.reject("Confirmation timeout")
                }
            } catch (e: Exception) {
                call.reject(e.message)
            } finally {
                clearState()
            }
        }
    }

    // --- NEW MINT-TO-PLAY METHODS ---

    @PluginMethod
    fun configure(call: PluginCall) {
        customRpcUrl = call.getString("customRpcMainnet") ?: customRpcUrl
        supabaseUrl = call.getString("supabaseUrl") ?: supabaseUrl
        supabaseAnonKey = call.getString("supabaseAnonKey") ?: supabaseAnonKey
        collectionMint = call.getString("collectionMint") ?: collectionMint
        enableGateCheck = call.getBoolean("enableGateCheck") ?: enableGateCheck
        enableMintPass = call.getBoolean("enableMintPass") ?: enableMintPass
        Log.d(tag, "Configured: RPC=$customRpcUrl, Supabase=$supabaseUrl, Mint=$collectionMint, HasAnonKey=${supabaseAnonKey.isNotEmpty()}")
        call.resolve()
    }

    @PluginMethod
    fun gateCheck(call: PluginCall) {
        if (!enableGateCheck) {
            return call.resolve(JSObject().put("passed", true).put("reason", "GateCheck disabled"))
        }

        val publicKey = call.getString("publicKey") ?: return call.reject("Missing publicKey")
        
        scope.launch {
            try {
                val hasNft = verifyCollectionNft(publicKey)
                call.resolve(JSObject().put("passed", hasNft))
            } catch (e: Exception) {
                call.reject("GateCheck error: ${e.message}")
            }
        }
    }

    @PluginMethod
    fun mintPass(call: PluginCall) {
        if (!enableMintPass) return call.reject("MintPass disabled")
        val publicKey = call.getString("publicKey") ?: return call.reject("Missing publicKey")
        val authToken = call.getString("authToken") ?: return call.reject("Missing authToken")
        if (connectInProgress) return call.reject("Wallet operation already in progress")

        connectInProgress = true
        pendingCall = call
        mwaResultDelivered.set(false)

        scope.launch {
            try {
                // 1. Get transaction from backend
                val payload = JSONObject().put("walletPublicKey", publicKey)
                val headers = mutableMapOf<String, String>()
                if (supabaseAnonKey.isNotEmpty()) {
                    headers["apikey"] = supabaseAnonKey
                    headers["Authorization"] = "Bearer $authToken"
                }

                val result = postJsonDetailed("$supabaseUrl/functions/v1/mint-tx", payload, headers)
                val response = result.json ?: throw Exception("Backend request failed: ${result.error ?: "Unknown error"} (check Supabase logs)")
                
                if (response.has("error")) {
                    throw Exception("Backend error: ${response.getString("error")}")
                }
                
                val txBase64 = response.optString("txBase64")
                if (txBase64.isEmpty()) {
                    throw Exception("Response missing txBase64")
                }

                // 2. Sign with MWA
                val signedTxBase64 = signWithMwa(txBase64) ?: throw Exception("Signing cancelled or failed")
                
                // 3. Submit to RPC
                val signature = sendTransactionToRpc(signedTxBase64) ?: throw Exception("RPC submission failed")
                
                // 4. Confirm
                if (confirmTransaction(signature)) {
                    val hasNft = verifyCollectionNft(publicKey)
                    val outResult = JSObject().apply {
                        put("ok", true)
                        put("signature", signature)
                        put("passed", hasNft)
                    }
                    call.resolve(outResult)
                } else {
                    call.reject("Transaction confirmation timeout")
                }
            } catch (e: Exception) {
                Log.e(tag, "mintPass error: ${e.message}", e)
                call.reject("Mint error: ${e.message}")
            } finally {
                clearState()
            }
        }
    }

    private suspend fun signWithMwa(txBase64: String): String? = withContext(Dispatchers.IO) {
        val txBytes = Base64.decode(txBase64, Base64.DEFAULT)
        val result = walletAdapter.transact(sender) {
            signTransactions(arrayOf(txBytes))
        }
        if (result is TransactionResult.Success) {
            Base64.encodeToString(result.payload.signedPayloads.first(), Base64.NO_WRAP)
        } else null
    }

    private fun verifyCollectionNft(publicKey: String): Boolean {
        if (collectionMint.isEmpty()) return false
        
        // Use Helius DAS API to check for assets in collection
        val params = JSONObject()
            .put("ownerAddress", publicKey)
            .put("page", 1)
            .put("limit", 1000)
            .put("options", JSONObject().put("showCollectionMetadata", true))

        val request = JSONObject()
            .put("jsonrpc", "2.0")
            .put("id", 1)
            .put("method", "getAssetsByOwner")
            .put("params", params)

        val headers = mutableMapOf<String, String>()
        val response = postJsonDetailed(customRpcUrl, request, headers).json ?: return false
        val assets = response.optJSONObject("result")?.optJSONArray("items") ?: return false
        
        for (i in 0 until assets.length()) {
            val asset = assets.getJSONObject(i)
            val grouping = asset.optJSONArray("grouping")
            if (grouping != null) {
                for (j in 0 until grouping.length()) {
                    val group = grouping.getJSONObject(j)
                    if (group.optString("group_key") == "collection" && 
                        group.optString("group_value") == collectionMint) {
                        return true
                    }
                }
            }
        }
        return false
    }

    // --- HELPER METHODS ---

    private fun sendTransactionToRpc(signedTxBase64: String): String? {
        val params = JSONArray().put(signedTxBase64).put(JSONObject().put("encoding", "base64"))
        val request = JSONObject().put("jsonrpc", "2.0").put("id", 1).put("method", "sendTransaction").put("params", params)
        
        val result = postJsonDetailed(customRpcUrl, request, emptyMap())
        val response = result.json

        if (response != null && response.has("error")) {
            val errorObj = response.optJSONObject("error")
            val message = errorObj?.optString("message") ?: "Unknown RPC error"
            throw Exception("RPC Error: $message")
        }

        return response?.optString("result")
    }

    private suspend fun confirmTransaction(signature: String): Boolean {
        val start = System.currentTimeMillis()
        while (System.currentTimeMillis() - start < 60000) {
            delay(2000)
            val params = JSONArray().put(JSONArray().put(signature))
            val request = JSONObject().put("jsonrpc", "2.0").put("id", 1).put("method", "getSignatureStatuses").put("params", params)
            val result = postJson(customRpcUrl, request)?.optJSONObject("result")?.optJSONArray("value")
            if (result != null && result.length() > 0 && !result.isNull(0)) {
                val status = result.getJSONObject(0).optString("confirmationStatus")
                if (status == "confirmed" || status == "finalized") return true
            }
        }
        return false
    }

    data class PostResult(val json: JSONObject?, val error: String? = null)

    private fun postJson(urlStr: String, jsonBody: JSONObject): JSONObject? {
        return postJsonDetailed(urlStr, jsonBody, emptyMap()).json
    }

    private fun postJsonDetailed(urlStr: String, jsonBody: JSONObject, headers: Map<String, String>): PostResult {
        var conn: HttpURLConnection? = null
        return try {
            if (BuildConfig.DEBUG) {
                val safeHeaders = headers.toMutableMap().apply {
                    if (containsKey("x-app-key")) this["x-app-key"] = "REDACTED"
                    if (containsKey("Authorization")) this["Authorization"] = "REDACTED"
                    if (containsKey("apikey")) this["apikey"] = "REDACTED"
                }
                Log.d(tag, "postJson to: $urlStr body: $jsonBody headers: $safeHeaders")
            }
            val url = URL(urlStr)
            conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            headers.forEach { (k, v) -> conn.setRequestProperty(k, v) }
            conn.doOutput = true
            val writer = OutputStreamWriter(conn.outputStream)
            writer.write(jsonBody.toString())
            writer.flush()
            
            val code = conn.responseCode
            if (BuildConfig.DEBUG) {
                Log.d(tag, "postJson response code: $code")
            }
            
            if (code in 200..299) {
                val reader = BufferedReader(InputStreamReader(conn.inputStream))
                val text = reader.readText()
                if (BuildConfig.DEBUG) {
                    Log.d(tag, "postJson response text: $text")
                }
                PostResult(JSONObject(text))
            } else {
                val errorStreamText = try {
                    conn.errorStream?.bufferedReader()?.readText() ?: hostErrorStream(conn)
                } catch (@Suppress("UNUSED_PARAMETER") e: Exception) { "Failed to read error stream" }
                Log.e(tag, "postJson error ($code): $errorStreamText")
                PostResult(null, "HTTP $code: $errorStreamText")
            }
        } catch (e: Exception) { 
            Log.e(tag, "postJson exception: ${e.message}", e)
            PostResult(null, "Exception: ${e.message}")
        }
        finally { conn?.disconnect() }
    }

    private fun hostErrorStream(conn: HttpURLConnection): String {
        return try {
            conn.inputStream?.bufferedReader()?.readText() ?: "No stream"
        } catch (@Suppress("UNUSED_PARAMETER") e: Exception) { "No stream" }
    }

    private fun clearState() {
        pendingCall = null
        connectInProgress = false
        retryCount = 0
    }

    private fun encodeBase58(input: ByteArray): String {
        val alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
        if (input.isEmpty()) return ""
        var zeros = 0
        while (zeros < input.size && input[zeros].toInt() == 0) zeros++
        val copy = input.copyOf()
        val encoded = CharArray(copy.size * 2)
        var outputStart = encoded.size
        var inputStart = zeros
        while (inputStart < copy.size) {
            var remainder = 0
            for (i in inputStart until copy.size) {
                val temp = remainder * 256 + (copy[i].toInt() and 0xFF)
                copy[i] = (temp / 58).toByte()
                remainder = temp % 58
            }
            if (copy[inputStart].toInt() == 0) inputStart++
            encoded[--outputStart] = alphabet[remainder]
        }
        while (outputStart < encoded.size && encoded[outputStart] == alphabet[0]) outputStart++
        repeat(zeros) { encoded[--outputStart] = alphabet[0] }
        return String(encoded, outputStart, encoded.size - outputStart)
    }

    @PluginMethod
    fun testMint(call: PluginCall) {
        if (!enableMintPass) return call.reject("MintPass disabled")
        val publicKey = call.getString("publicKey") ?: return call.reject("Missing publicKey")
        val authToken = call.getString("authToken") ?: return call.reject("Missing authToken")

        scope.launch {
            try {
                // 1. Get transaction from backend
                val payload = JSONObject().put("walletPublicKey", publicKey)
                val headers = mutableMapOf<String, String>()
                if (supabaseAnonKey.isNotEmpty()) {
                    headers["apikey"] = supabaseAnonKey
                    headers["Authorization"] = "Bearer $authToken"
                }

                val result = postJsonDetailed("$supabaseUrl/functions/v1/mint-tx", payload, headers)
                val response = result.json ?: throw Exception("Backend request failed: ${result.error ?: "Unknown error"} (check Supabase logs)")

                if (response.has("error")) {
                    throw Exception("Backend error: ${response.getString("error")}")
                }

                val txBase64 = response.optString("txBase64")
                if (txBase64.isEmpty()) {
                    throw Exception("Response missing txBase64")
                }

                call.resolve(JSObject().put("ok", true).put("txBase64", txBase64))
            } catch (e: Exception) {
                Log.e(tag, "testMint error: ${e.message}", e)
                call.reject("Mint test error: ${e.message}")
            }
        }
    }

    @PluginMethod fun signMessages(call: PluginCall) { call.reject("Not implemented") }
    @PluginMethod fun signTransaction(call: PluginCall) { call.reject("Not implemented") }
    @PluginMethod fun signMessage(call: PluginCall) { call.reject("Not implemented") }
    @PluginMethod fun disconnect(call: PluginCall) { call.resolve() }
    @PluginMethod fun getCapabilities(call: PluginCall) { call.resolve(JSObject().put("supportsSignAndSend", true)) }
}
