
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

export const connectSolana = async (): Promise<string | null> => {
  if (typeof window === 'undefined') return null;

  const { solana } = window as any;
  if (!solana) {
    alert("Solana Wallet not found! Please install Phantom.");
    return null;
  }

  try {
    const response = await solana.connect();
    return response.publicKey.toString();
  } catch (error) {
    console.error("Solana Connection Error:", error);
    return null;
  }
};

export const truncateAddress = (address: string) => {
  if (!address) return '';
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};

export const mintHighScoreNFT = async (score: number, address: string, chain: 'EVM' | 'SOL'): Promise<boolean> => {
  // SIMULATION: In a real app, this would call a Smart Contract (mint function)
  return new Promise((resolve) => {
    console.log(`Minting NFT for score: ${score} on ${chain} to ${address}`);
    setTimeout(() => {
      resolve(true);
    }, 2000); // Simulate network delay
  });
};
