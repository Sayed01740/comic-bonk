# Solana Wallet Integration Guide for Comic Bonk

This guide explains how the Solana Wallet Adapter was integrated and how to use it.

## 1. Setup & Installation
The following dependencies were installed:
- `@solana/web3.js`
- `@solana/wallet-adapter-base`
- `@solana/wallet-adapter-react`
- `@solana/wallet-adapter-react-ui`
- `@solana/wallet-adapter-wallets`
- `vite-plugin-node-polyfills` (Required for Vite + Web3.js)

## 2. Key Components

### `config/solana.ts`
Central configuration for the Solana Cluster (Devnet/Mainnet), RPC endpoints, and App Metadata.
*Modify this file to switch to Mainnet or change RPC URLs.*

### `components/SolanaWalletProvider.tsx`
Wraps the application with the Solana Context. It initializes:
- **ConnectionProvider**: Connects to the RPC node.
- **WalletProvider**: Initializes wallet adapters (Phantom, Solflare, Mobile Wallet Adapter).
- **WalletModalProvider**: Manages the "Select Wallet" modal.

### `components/SolanaWalletButton.tsx`
A custom UI component that replaces standard buttons.
- **Disconnected**: Shows "CONNECT SOL".
- **Connected**: Shows a pill with the wallet icon and short address.
- **Dropdown**: Click the pill to see Balance, Copy Address, or Disconnect.

### `utils/wallet.ts`
Updated to handle real Solana interactions.
- `mintHighScoreNFT`: Now accepts a `walletContext` to Sign a Message and Send a Transaction on Devnet.

## 3. How to Test

### Running Locally
1. Ensure dependencies are installed: `npm install`
2. Start the dev server: `npm run dev`
3. Open `http://localhost:3000` (or the port shown).
4. Click "CONNECT SOL" in the top right.
5. Select a wallet (e.g., Phantom).
6. Once connected, your address and balance (Devnet SOL) will appear.

### Testing "Mint" (Transaction Flow)
1. Play the game and get a high score (>0).
2. On the Game Over screen, if you have a New High Score, click "MINT SCORE NFT!".
3. **Sign Message**: Approve the signature request in your wallet.
4. **Send Transaction**: Approve the transaction (0.000001 SOL transfer to self).
5. Open browser console (F12) to see the Transaction Signature and Confirmation logs.

### Testing on Solana Seeker (Mobile)
1. Ensure your PC and Seeker are on the same Wi-Fi.
2. Find your PC's local IP (e.g., `192.168.1.5`).
3. Update `vite.config.ts` to host on `0.0.0.0` (Already done).
4. On Seeker, open Chrome/Browser and navigate to `http://YOUR_PC_IP:3000`.
   - *Note: Some wallets require HTTPS. You may need to use `ngrok http 3000` to get an HTTPS URL.*
5. Tap "CONNECT SOL".
6. Select "Mobile Wallet Adapter" or "Phantom" (if installed).
7. The phone's native wallet sheet should slide up. Authenticate and connect.

## 4. Troubleshooting
- **Global is not defined**: Restart the dev server (`npm run dev`) to ensure polyfills are loaded.
- **Wallet not connecting**: Check if you are on Devnet/Mainnet match. The app defaults to **Devnet**.
