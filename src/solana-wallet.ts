import { registerPlugin } from '@capacitor/core';

interface SolanaWalletPlugin {
    connect(options: {
        cluster?: string;
        identityName?: string;
        identityUri?: string;
        iconUri?: string;
    }): Promise<{
        success: boolean;
        publicKeyBase58: string;
        publicKeyBase64: string;
        walletLabel: string;
        accountLabel: string;
        authToken: string;
        signature?: string;
    }>;
    disconnect(): Promise<void>;
    signMessage(options: { messageBase64: string }): Promise<{ signatureBase64: string; signatureBase58: string }>;
    signTransaction(options: { txBase64: string }): Promise<{ signedTxBase64: string }>;
    signAndSendTransaction(options: { txBase64: string; rpcUrl: string }): Promise<{ txSignature: string }>;
    getCapabilities(): Promise<{ maxMessages: number; supportsSignAndSend: boolean }>;
    getSolBalance(options: { account: string }): Promise<{ lamports: number }>;
    getTokenAccounts(options: { account: string; mint?: string }): Promise<{ accounts: any[] }>;
    configure(options: {
        customRpcMainnet?: string;
        supabaseUrl?: string;
        supabaseAnonKey?: string;
        collectionMint?: string;
        enableGateCheck?: boolean;
        enableMintPass?: boolean;
    }): Promise<void>;
    gateCheck(options: { publicKey: string }): Promise<{ passed: boolean }>;
    mintPass(options: { publicKey: string }): Promise<{ ok: boolean; signature: string }>;
}

const SolanaWalletNative = registerPlugin<SolanaWalletPlugin>('SolanaWallet');

let connectInProgress = false;

const SolanaWallet = {
    async connect(options?: {
        cluster?: string;
        identityName?: string;
        identityUri?: string;
        iconUri?: string;
    }) {
        if (connectInProgress) {
            console.warn('[SolanaWallet.ts] connect() called while already in progress — ignoring');
            return { ok: false, error: { code: 'ALREADY_IN_PROGRESS', message: 'Connect already in progress' } };
        }

        connectInProgress = true;
        const ts = Date.now();
        console.log(`[SolanaWallet.ts] connect() STARTING at ${ts}`);

        try {
            console.log('[SolanaWallet.ts] calling SolanaWalletNative.connect()...');
            const result = await SolanaWalletNative.connect(options || {});
            console.log('[SolanaWallet.ts] SolanaWalletNative.connect() returned:', JSON.stringify(result));

            if (result && result.success) {
                console.log('[SolanaWallet.ts] ✅ Connected!');
                console.log('[SolanaWallet.ts]   publicKeyBase58:', result.publicKeyBase58);
                console.log('[SolanaWallet.ts]   publicKeyBase64:', result.publicKeyBase64);
                console.log('[SolanaWallet.ts]   authToken:', result.authToken);
                console.log('[SolanaWallet.ts]   walletLabel:', result.walletLabel);
                console.log('[SolanaWallet.ts]   accountLabel:', result.accountLabel);
                if (result.signature) {
                    console.log('[SolanaWallet.ts]   signature:', result.signature);
                }

                // Store for convenience
                (window as any).solanaPublicKey = result.publicKeyBase58;

                return {
                    ok: true,
                    data: {
                        publicKeyBase58: result.publicKeyBase58 || '',
                        publicKeyBase64: result.publicKeyBase64 || '',
                        walletLabel: result.walletLabel || '',
                        accountLabel: result.accountLabel || '',
                        authToken: result.authToken || '',
                        signature: result.signature || '',
                    }
                };
            } else {
                console.warn('[SolanaWallet.ts] Native plugin returned success=false or unexpected shape:', result);
                return {
                    ok: false,
                    error: {
                        code: 'UNEXPECTED_RESULT',
                        message: 'Wallet returned an unexpected result'
                    }
                };
            }
        } catch (e: any) {
            console.error('[SolanaWallet.ts] ❌ connect() caught error:', e);
            console.error('[SolanaWallet.ts]   error.message:', e?.message);
            console.error('[SolanaWallet.ts]   error.code:', e?.code);
            return {
                ok: false,
                error: {
                    code: e.code || 'UNKNOWN_ERROR',
                    message: e.message || 'Failed to connect to wallet'
                }
            };
        } finally {
            connectInProgress = false;
            console.log('[SolanaWallet.ts] connect() FINISHED');
        }
    },

    async disconnect() {
        try {
            await SolanaWalletNative.disconnect();
            (window as any).solanaPublicKey = null;
            console.log('[SolanaWallet.ts] ✅ Disconnected');
            return { ok: true };
        } catch (e: any) {
            console.error('[SolanaWallet.ts] ❌ disconnect failed:', e);
            return { ok: false, error: { code: 'DISCONNECT_ERROR', message: e.message } };
        }
    },

    async signMessage(messageBase64: string) {
        try {
            const result = await SolanaWalletNative.signMessage({ messageBase64 });
            console.log('[SolanaWallet.ts] ✅ Message signed');
            return { ok: true, data: result };
        } catch (e: any) {
            console.error('[SolanaWallet.ts] ❌ signMessage failed:', e);
            return { ok: false, error: { code: e.code || 'SIGN_ERROR', message: e.message } };
        }
    },

    async signTransaction(txBase64: string) {
        try {
            const result = await SolanaWalletNative.signTransaction({ txBase64 });
            console.log('[SolanaWallet.ts] ✅ Transaction signed');
            return { ok: true, data: result };
        } catch (e: any) {
            console.error('[SolanaWallet.ts] ❌ signTransaction failed:', e);
            return { ok: false, error: { code: e.code || 'SIGN_ERROR', message: e.message } };
        }
    },

    async signAndSendTransaction(txBase64: string, rpcUrl: string = 'https://api.mainnet-beta.solana.com') {
        try {
            const result = await SolanaWalletNative.signAndSendTransaction({ txBase64, rpcUrl });
            console.log('[SolanaWallet.ts] ✅ Transaction sent:', result.txSignature);
            return { ok: true, data: result };
        } catch (e: any) {
            console.error('[SolanaWallet.ts] ❌ signAndSendTransaction failed:', e);
            return { ok: false, error: { code: e.code || 'SEND_ERROR', message: e.message } };
        }
    },

    async getCapabilities() {
        try {
            const result = await SolanaWalletNative.getCapabilities();
            return { ok: true, data: result };
        } catch (e: any) {
            return { ok: false, error: e };
        }
    },
    async getSolBalance(account: string) {
        try {
            const result = await SolanaWalletNative.getSolBalance({ account });
            return { ok: true, data: result };
        } catch (e: any) {
            return { ok: false, error: e };
        }
    },
    async getTokenAccounts(account: string, mint?: string) {
        try {
            const result = await SolanaWalletNative.getTokenAccounts({ account, mint });
            return { ok: true, data: result };
        } catch (e: any) {
            return { ok: false, error: e };
        }
    },
    async configure(options: {
        customRpcMainnet?: string;
        supabaseUrl?: string;
        supabaseAnonKey?: string;
        collectionMint?: string;
        enableGateCheck?: boolean;
        enableMintPass?: boolean;
    }) {
        try {
            await SolanaWalletNative.configure(options);
            console.log('[SolanaWallet.ts] ✅ Configured');
            return { ok: true };
        } catch (e: any) {
            console.error('[SolanaWallet.ts] ❌ configure failed:', e);
            return { ok: false, error: { code: 'CONFIG_ERROR', message: e.message } };
        }
    },
    async gateCheck(options: { publicKey: string }) {
        try {
            const result = await SolanaWalletNative.gateCheck(options);
            return { ok: true, ...result };
        } catch (e: any) {
            console.error('[SolanaWallet.ts] ❌ gateCheck failed:', e);
            return { ok: false, error: { code: 'GATE_CHECK_ERROR', message: e.message } };
        }
    },
    async mintPass(options: { publicKey: string }) {
        try {
            const result = await SolanaWalletNative.mintPass(options);
            return { ok: true, ...result };
        } catch (e: any) {
            console.error('[SolanaWallet.ts] ❌ mintPass failed:', e);
            return { ok: false, error: { code: 'MINT_ERROR', message: e.message } };
        }
    }
};

// Expose to window for easy access from game code
(window as any).SolanaWallet = SolanaWallet;

export default SolanaWallet;
