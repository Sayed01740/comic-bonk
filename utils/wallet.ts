import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { SOLANA_CONFIG } from '../config/solana';

export const connectEVM = async (): Promise<string | null> => {
  if (typeof window === 'undefined') return null;

  const { ethereum } = window as any;
  if (!ethereum) {
    alert("EVM Wallet not found! Please install MetaMask or Coinbase Wallet.");
    return null;
  }

  try {
    const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    return accounts[0] || null;
  } catch (error) {
    console.error("EVM Connection Error:", error);
    return null;
  }
};

export const truncateAddress = (address: string) => {
  if (!address) return '';
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};

export const mintHighScoreNFT = async (
  score: number,
  address: string,
  chain: 'EVM' | 'SOL',
  walletContext?: any
): Promise<boolean> => {

  // SOLANA IMPLEMENTATION
  if (chain === 'SOL' && walletContext) {
    console.log("Starting Solana Mint Process...");
    const { signMessage, sendTransaction, publicKey } = walletContext;

    if (!publicKey) {
      alert("Wallet not connected properly!");
      return false;
    }

    const connection = new Connection(SOLANA_CONFIG.RPC_ENDPOINT, 'confirmed');

    try {
      // STEP 1: Sign a Message (Proof of Authority / Login)
      // This proves the user owns the wallet
      const messageContent = `Claim High Score of ${score} on Comic Bonk!`;
      const message = new TextEncoder().encode(messageContent);

      if (signMessage) {
        // Some wallets might not support signMessage (e.g. Ledger sometimes), but most do.
        await signMessage(message);
        console.log("Message signed successfully!");
      }

      // STEP 2: Send a Transaction (Mint Cost / On-Chain Action)
      // We transfer a tiny amount to self to simulate a mint fee or interaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: publicKey, // Send to self to keep it simple
          lamports: 1000, // Tiny amount (lamports)
        })
      );

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signature = await sendTransaction(transaction, connection);
      console.log("Transaction sent:", signature);

      // Wait for confirmation
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
      console.log("Transaction confirmed!");

      return true;

    } catch (error) {
      console.error("Solana Mint Error:", error);
      alert("Mint Failed: " + (error as any).message);
      return false;
    }
  }

  // EVM / DEFAULT SIMULATION
  return new Promise((resolve) => {
    console.log(`Minting NFT for score: ${score} on ${chain} to ${address}`);
    setTimeout(() => {
      resolve(true);
    }, 2000); // Simulate network delay
  });
};
