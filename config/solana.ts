import { Cluster } from '@solana/web3.js';

export const SOLANA_CONFIG = {
    // Default to devnet for testing as requested
    CLUSTER: (import.meta.env.VITE_SOLANA_CLUSTER as Cluster) || 'devnet',

    // Custom RPC URL can be set via env var, otherwise use default public endpoints
    RPC_ENDPOINT: import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com',

    // App Metadata for Wallet UI
    APP_NAME: 'Comic Bonk',
    APP_DESCRIPTION: 'The hardest hitting comic game on Solana',
    APP_URL: typeof window !== 'undefined' ? window.location.origin : 'https://comicbonk.com',
    APP_ICON: 'https://cdn-icons-png.flaticon.com/512/2525/2525046.png', // Placeholder hammer icon
};
