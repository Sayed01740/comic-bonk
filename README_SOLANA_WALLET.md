# Solana Wallet Plugin
This plugin provides advanced Solana wallet functionality for the Capacitor Android app, supporting MWA connections and direct on-chain interactions via Helius.

## Features
- **Mainnet Only**: Enforces `solana:mainnet` cluster.
- **Custom RPC**: Configurable Helius RPC endpoint for reliable transactions and data fetching.
- **MWA Integration**: Uses official `mobile-wallet-adapter-clientlib-ktx`.
- **Direct Submission**: Submits transactions via the app's custom RPC.
- **On-Chain Helpers**: Fetch SOL and SPL token balances directly.

## Configuration
The plugin defaults to the Comic Bonk Helius Mainnet RPC. You can override this at runtime.

```typescript
import SolanaWallet from './solana-wallet';

await SolanaWallet.configure({
    customRpcMainnet: 'https://mainnet.helius-rpc.com/?api-key=YOUR_KEY'
});
```

## Usage

### Connect
Connects to a compatible wallet app.

```typescript
const result = await SolanaWallet.connect({
    identityName: 'Comic Bonk',
    identityUri: 'https://comicbonk.com',
    iconUri: 'favicon.ico'
});

if (result.ok) {
    console.log('Connected:', result.data.publicKeyBase58);
}
```

### Get Balances (Astro-Level)
Fetch balances directly from the chain without relying on the wallet UI.

```typescript
// Get SOL Balance
const sol = await SolanaWallet.getSolBalance(publicKey);
if (sol.ok) {
    console.log('Balance:', sol.data.lamports / 1e9, 'SOL');
}

// Get Token Accounts
const tokens = await SolanaWallet.getTokenAccounts(publicKey);
if (tokens.ok) {
    tokens.data.accounts.forEach(t => {
        console.log('Mint:', t.account.data.parsed.info.mint);
        console.log('Amount:', t.account.data.parsed.info.tokenAmount.uiAmount);
    });
}
```

### Sign & Send Transaction
Signs a transaction via the wallet and submits it using the configured custom RPC.

```typescript
const result = await SolanaWallet.signAndSendTransaction(txBase64);

if (result.ok) {
    console.log('Signature:', result.data.txSignature);
}
```

### Sign Message
Signs a UTF-8 message.

```typescript
const msgBase64 = btoa("Sign this message to authenticate");
const result = await SolanaWallet.signMessage(msgBase64);

if (result.ok) {
    console.log('Signature:', result.data.signatureBase64);
}
```

## Troubleshooting
- **Build Errors**: Ensure `compileSdk` is 34 and Java 17 compatibility is set.
- **Connection Issues**: Ensure a compatible wallet (Phantom, Solflare) is installed.
- **"Method not implemented"**: Verify the plugin is registered correctly.
- **Timeout**: Transaction confirmation waits for 60 seconds.
