# Comic Bonk Mint-to-Play Backend

This folder contains Supabase Edge Functions for the Solana Mint-to-Play system.

## Setup Instructions

1.  **Install Supabase CLI**: If you haven't, install the Supabase CLI.
2.  **Initialize Supabase**: Run `supabase init` in this folder (or the root of your project).
3.  **Set Environment Variables**:
    Run the following commands to set your secrets:
    ```bash
    supabase secrets set HELIUS_RPC_URL="https://mainnet.helius-rpc.com/?api-key=cebef5c8-9a08-499f-9379-ff5993aa7ba1"
    supabase secrets set TREASURY_WALLET="3XKu3YQ5HCQrE2XgaT9fkffkDJVK7rhpynsY9pDsLsZT"
    supabase secrets set BACKEND_AUTHORITY_KEY="[YOUR_AUTHORITY_PRIVATE_KEY_JSON_ARRAY]"
    ```
4.  **Deploy Functions**:
    ```bash
    supabase functions deploy create-collection
    supabase functions deploy rpc
    supabase functions deploy mint-tx
    ```

## Phase 1: Create Collection
1.  Invoke the `create-collection` function once to create your NFT Game Pass collection:
    ```bash
    curl -X POST https://[PROJECT_REF].supabase.co/functions/v1/create-collection \
      -H "Authorization: Bearer [SERVICE_ROLE_KEY]"
    ```
2.  Copy the `collectionMint` address from the response.
3.  Set it as an environment variable:
    ```bash
    supabase secrets set COLLECTION_MINT="[COLLECTION_MINT_ADDRESS]"
    ```

## Phase 2: RPC Proxy
The `rpc` function acts as a secure proxy to Helius, preventing API key exposure on the client.

## Phase 3: Mint Transaction
The `mint-tx` function builds a partially signed transaction for the user to mint a Game Pass. It includes a 0.001 SOL transfer to the treasury.

## Phase 4: Android Integration
The Android app calls these functions via the updated `SolanaWalletPlugin.kt`.
Ensure you call `configure` in your JS code with the `collectionMint` and set feature flags to `true`.
