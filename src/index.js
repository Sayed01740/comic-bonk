// SolanaWallet connect handler — loaded on window.load
// This file provides a fallback direct connect button handler (connect-button-id).
// The primary connect button is in UIOverlay.tsx, which calls window.SolanaWallet.connect().

// --- START: Code to add for Mint-to-Play ---

// The user's public key
let userPublicKey = null;

// A. Function to set up and check the mint pass status
async function setupMintingAndCheckGate() {
  const currentPubKey = window.userPublicKey || userPublicKey;
  if (!currentPubKey) {
    console.error("Cannot set up minting, user public key is missing.");
    return;
  }

  console.log('[index.js] Running setupMintingAndCheckGate for:', currentPubKey);

  // A.1. Configure the plugin to enable the new features
  await SolanaWallet.configure({
    enableMintPass: true,
    enableGateCheck: true,
    collectionMint: 'C9w13TDCsxHJWky46BPiEhTsKY7MnUssJWwrgNeJWj8H',
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4YmtuZ2xiZXloY3NueXdwcndkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NzcxMDcsImV4cCI6MjA4NzE1MzEwN30.rFYgM5OVkUJFwBbQsixDhsQo0_z69mhDcmA0DuQSek0',
  });

  // A.2. Run the gate check
  const gateMessage = document.getElementById('gateMessage');
  const mintButton = document.getElementById('mintButton');

  try {
    const result = await SolanaWallet.gateCheck({ publicKey: currentPubKey });
    console.log('[index.js] gateCheck result:', result);
    if (result.passed) {
      gateMessage.innerText = 'Game Pass activated!';
      mintButton.style.display = 'none';
    } else {
      gateMessage.innerText = 'Pass required to play.';
      mintButton.style.display = 'block';
    }
  } catch (e) {
    gateMessage.innerText = `Gate Check Error: ${e.message}`;
  }
}

// Expose to window for React components
window.setupMintingAndCheckGate = setupMintingAndCheckGate;

// B. Wire up the mint button's click event
window.addEventListener('load', () => {

  // Setup Mint Button listener
  const mintBtn = document.getElementById('mintButton');
  if (mintBtn) {
    mintBtn.addEventListener('click', async () => {
      const currentPubKey = window.userPublicKey || userPublicKey;
      if (!currentPubKey) {
        alert('Please connect your wallet first.');
        return;
      }

      try {
        console.log('[index.js] Mint button clicked. Public Key:', currentPubKey);
        gateMessage.innerText = 'Confirm in wallet...';
        mintButton.disabled = true;

        // Stage 1: Call Native Mint
        console.log('[index.js] Calling SolanaWallet.mintPass...');
        const result = await SolanaWallet.mintPass({ publicKey: currentPubKey });
        console.log('[index.js] SolanaWallet.mintPass result:', result);

        if (result && result.ok) {
          console.log('[index.js] ✅ Mint Successful!');
          gateMessage.innerText = 'Mint successful! Pass is now active.';
          alert('Mint successful! Signature: ' + result.signature);
          mintButton.style.display = 'none'; // Hide button after successful mint

          // Refresh gate check to update UI
          setupMintingAndCheckGate();
        } else {
          // Robust error extraction
          let errStr = 'Unknown error';
          if (result && result.error) {
            if (typeof result.error === 'object') {
              errStr = result.error.message || JSON.stringify(result.error);
            } else {
              errStr = String(result.error);
            }
          }
          console.error('[index.js] ❌ Mint Failed (not ok):', result);
          gateMessage.innerText = `Mint failed: ${errStr}`;
        }
      } catch (error) {
        console.error('[index.js] 🚨 Mint Promise Rejected:', error);
        let errorMsg = 'An unexpected error occurred';
        if (error) {
          if (error.message) errorMsg = error.message;
          else if (typeof error === 'object') errorMsg = JSON.stringify(error);
          else errorMsg = String(error);
        }
        gateMessage.innerText = `App Error: ${errorMsg}`;
      } finally {
        mintButton.disabled = false;
      }
    });
  }

  const connectButton = document.getElementById('connect-button-id');
  if (connectButton) {
    connectButton.addEventListener('click', handleConnect);
  } else {
    console.warn("[index.js] No element with id='connect-button-id' found. This is OK if the connect button is in a React component.");
  }

  let isConnecting = false;

  async function handleConnect() {
    if (isConnecting) {
      console.log("[index.js] handleConnect: already in progress, ignoring tap");
      return;
    }

    const ts = Date.now();
    console.log(`[index.js] handleConnect: STARTING at ${ts}`);

    try {
      isConnecting = true;
      if (connectButton) connectButton.disabled = true;

      console.log("[index.js] handleConnect: calling SolanaWallet.connect()...");
      const res = await SolanaWallet.connect();

      console.log("[index.js] handleConnect: SolanaWallet.connect() returned:", JSON.stringify(res));

      if (res && res.ok && res.data) {
        console.log("[index.js] ✅ Wallet connected successfully!");
        console.log("[index.js]   publicKeyBase58:", res.data.publicKeyBase58);
        console.log("[index.js]   publicKeyBase64:", res.data.publicKeyBase64);
        console.log("[index.js]   authToken:", res.data.authToken);
        console.log("[index.js]   walletLabel:", res.data.walletLabel);

        // --- Integration for Mint-to-Play ---
        userPublicKey = res.data.publicKeyBase58;
        setupMintingAndCheckGate();
        // ------------------------------------
      } else if (res && res.ok === false) {
        console.warn("[index.js] ❌ Wallet connect returned error:", res.error);
      } else {
        console.warn("[index.js] ⚠️ Wallet response did not contain expected data. Full response:", res);
      }

    } catch (error) {
      console.error("[index.js] 🚨 Wallet connection threw:", error);
    } finally {
      isConnecting = false;
      if (connectButton) connectButton.disabled = false;
      console.log("[index.js] handleConnect: FINISHED");
    }
  }

});

// Make sure the SolanaWallet plugin is defined.
// This is typically handled by Capacitor, but this check doesn't hurt.
// Use the global SolanaWallet wrapper defined in solana-wallet.ts
const SolanaWallet = window.SolanaWallet;
if (!SolanaWallet) {
  console.error("[index.js] SolanaWallet bridge is not available. Make sure solana-wallet.ts is loaded.");
}

// --- PHASE 4: VERIFICATION TOOL ---
// Call window.testSolanaWallet() from console to verify advanced features.
window.testSolanaWallet = async () => {
  console.log("🚀 Starting Solana Wallet Verification...");

  if (!SolanaWallet) {
    console.error("❌ SolanaWallet bridge not found!");
    return;
  }

  try {
    // 1. Capabilities
    console.log("Checking Capabilities...");
    const caps = await SolanaWallet.getCapabilities();
    console.log("✅ Capabilities:", caps);

    // 2. Connect (if needed)
    console.log("Connecting...");
    const conn = await SolanaWallet.connect();
    if (!conn.data || !conn.data.publicKeyBase58) {
      console.error("❌ Connect failed:", conn);
      return;
    }
    const pubKey = conn.data.publicKeyBase58;
    console.log("✅ Connected as:", pubKey);

    // 3. Balance (Astro-Level)
    console.log("Checking Balance...");
    const balance = await SolanaWallet.getSolBalance({ account: pubKey });
    console.log("✅ Balance:", balance.data ? (balance.data.lamports / 1e9) + " SOL" : balance);

    // 4. Token Accounts
    console.log("Checking Token Accounts...");
    const tokens = await SolanaWallet.getTokenAccounts({ account: pubKey });
    console.log("✅ Tokens:", tokens.data ? tokens.data.accounts.length : tokens);

    // 5. Sign Message
    console.log("Testing Sign Message...");
    const msg = btoa("Hello Comic Bonk!");
    const signed = await SolanaWallet.signMessage({ messageBase64: msg });
    console.log("✅ Signed Message:", signed);

    console.log("🎉 Verification Complete! Ready for Astro-Level Gaming.");

  } catch (err) {
    console.error("🚨 Verification Failed:", err);
  }
};
