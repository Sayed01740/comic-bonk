import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';

export const SolanaWalletButton: React.FC = () => {
    const { publicKey, wallet, disconnect, connecting } = useWallet();
    const { setVisible } = useWalletModal(); // To open the wallet selection modal
    const { connection } = useConnection();

    const [balance, setBalance] = useState<number | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Fetch balance when connected
    useEffect(() => {
        if (!connection || !publicKey) {
            setBalance(null);
            return;
        }

        const fetchBalance = async () => {
            try {
                const bal = await connection.getBalance(publicKey);
                setBalance(bal / LAMPORTS_PER_SOL);
            } catch (e) {
                console.error("Failed to fetch balance", e);
            }
        };

        fetchBalance();
        const id = connection.onAccountChange(publicKey, (accountInfo) => {
            setBalance(accountInfo.lamports / LAMPORTS_PER_SOL);
        });

        return () => {
            connection.removeAccountChangeListener(id);
        };
    }, [connection, publicKey]);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleConnectClick = useCallback(() => {
        setVisible(true);
    }, [setVisible]);

    const handleDisconnect = useCallback(() => {
        disconnect();
        setIsDropdownOpen(false);
    }, [disconnect]);

    const handleCopyAddress = useCallback(() => {
        if (publicKey) {
            navigator.clipboard.writeText(publicKey.toBase58());
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }, [publicKey]);

    const truncate = (str: string) => str.slice(0, 4) + '...' + str.slice(-4);

    if (!publicKey) {
        return (
            <button
                onClick={handleConnectClick}
                className="px-3 py-1 bg-purple-600 text-white border-2 border-black font-bold text-sm md:text-base shadow-[2px_2px_0_rgba(0,0,0,0.5)] hover:bg-purple-500 rotate-1 transition-transform active:translate-y-1 active:shadow-none"
            >
                {connecting ? 'CONNECTING...' : 'CONNECT SOL'}
            </button>
        );
    }

    return (
        <div className="relative inline-block" ref={dropdownRef}>
            <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1 bg-purple-400 text-black border-2 border-black font-bold text-sm md:text-base shadow-[2px_2px_0_rgba(0,0,0,0.5)] hover:bg-purple-300 transition-colors"
            >
                {/* Wallet Icon */}
                {wallet?.adapter.icon && (
                    <img src={wallet.adapter.icon} alt="Wallet" className="w-5 h-5" />
                )}
                <span>{truncate(publicKey.toBase58())}</span>
            </button>

            {/* Dropdown Pill */}
            {isDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border-4 border-black shadow-[4px_4px_0_rgba(0,0,0,1)] z-50 flex flex-col p-2 gap-2 text-sm font-bold rotate-1">
                    <div className="text-center border-b-2 border-black pb-2 text-xs text-gray-500">
                        SOLANA NETWORK
                    </div>

                    {balance !== null && (
                        <div className="flex justify-between items-center text-comic-blue">
                            <span>BAL:</span>
                            <span>{balance.toFixed(3)} SOL</span>
                        </div>
                    )}

                    <button
                        onClick={handleCopyAddress}
                        className="w-full text-left px-2 py-1 hover:bg-gray-200 border-2 border-transparent hover:border-black transition-colors"
                    >
                        {copied ? 'COPIED!' : 'COPY ADDRESS'}
                    </button>

                    <button
                        onClick={handleDisconnect}
                        className="w-full text-left px-2 py-1 text-red-600 hover:bg-red-100 border-2 border-transparent hover:border-black transition-colors"
                    >
                        DISCONNECT
                    </button>
                </div>
            )}
        </div>
    );
};
