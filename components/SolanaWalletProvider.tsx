import React, { FC, ReactNode, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { UnsafeBurnerWalletAdapter } from '@solana/wallet-adapter-wallets';
import {
    PhantomWalletAdapter,
    SolflareWalletAdapter,
    TorusWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { SOLANA_CONFIG } from '../config/solana';

// Default styles that can be overridden by your app
import '@solana/wallet-adapter-react-ui/styles.css';

export const SolanaWalletProvider: FC<{ children: ReactNode }> = ({ children }) => {
    // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'.
    const network = SOLANA_CONFIG.CLUSTER as WalletAdapterNetwork;

    // You can also provide a custom RPC endpoint.
    const endpoint = useMemo(() => SOLANA_CONFIG.RPC_ENDPOINT, [network]);

    const wallets = useMemo(
        () => [
            /**
             * Wallets that support either the standard wallet adapter interface or the legacy
             * Solana Mobile Wallet Adapter interface will be automatically detected.
             * 
             * We explicitly add common wallets here for fallback support.
             */
            new PhantomWalletAdapter(),
            new SolflareWalletAdapter(),
            new TorusWalletAdapter(),
            // UnsafeBurner is for devnet testing only
            ...(network === WalletAdapterNetwork.Devnet ? [new UnsafeBurnerWalletAdapter()] : []),
        ],
        [network]
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    {children}
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};
