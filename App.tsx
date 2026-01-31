import React, { useState, useCallback, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { SolanaWalletProvider } from './components/SolanaWalletProvider';
import GameCanvas, { HammerConfig } from './components/GameCanvas';
import UIOverlay from './components/UIOverlay';
import { connectEVM, mintHighScoreNFT } from './utils/wallet';

const GameContent: React.FC = () => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameOver, setGameOver] = useState(false);
  const [combo, setCombo] = useState(0);
  const [gameKey, setGameKey] = useState(0);
  const [missionInfo, setMissionInfo] = useState({ description: "GET READY!", progress: "" });
  const [powerCharge, setPowerCharge] = useState(0);
  const [powerRequested, setPowerRequested] = useState(false);

  const [highScore, setHighScore] = useState(0);
  const [isNewHighScore, setIsNewHighScore] = useState(false);

  const [isCustomizing, setIsCustomizing] = useState(false);
  const [hammerConfig, setHammerConfig] = useState<HammerConfig>({
    headType: 'sledge',
    color: 'classic',
    handleType: 'wood'
  });

  const [evmAddress, setEvmAddress] = useState<string | null>(null);

  // SOLANA HOOKS
  const { publicKey, wallet, signMessage, sendTransaction } = useWallet();
  const { setVisible } = useWalletModal();
  const solanaAddress = publicKey ? publicKey.toBase58() : null;

  const [isMinting, setIsMinting] = useState(false);
  const [hasMinted, setHasMinted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('comicBonkHighScore');
    if (stored) setHighScore(parseInt(stored, 10));
  }, []);

  const handleRestart = useCallback(() => {
    setScore(0); setTimeLeft(30); setGameOver(false); setCombo(0);
    setMissionInfo({ description: "GET READY!", progress: "" });
    setPowerCharge(0); setPowerRequested(false);
    setIsNewHighScore(false); setHasMinted(false);
    setGameKey(prev => prev + 1);
  }, []);

  const handleGameOver = useCallback(() => {
    setGameOver(true);
    if (score > highScore && score > 0) {
      setHighScore(score); setIsNewHighScore(true);
      localStorage.setItem('comicBonkHighScore', score.toString());
    }
  }, [score, highScore]);

  const handlePowerUpdate = useCallback((charge: number) => {
    setPowerCharge(charge);
  }, []);

  const triggerPower = useCallback(() => {
    if (powerCharge >= 100) setPowerRequested(true);
  }, [powerCharge]);

  const handlePowerExecuted = useCallback(() => {
    setPowerRequested(false);
  }, []);

  const handleConnectEVM = useCallback(async () => {
    const address = await connectEVM();
    if (address) setEvmAddress(address);
  }, []);

  // Open Solana Wallet Modal
  const handleConnectSolana = useCallback(() => {
    setVisible(true);
  }, [setVisible]);

  const handleMintNFT = useCallback(async () => {
    if (!evmAddress && !solanaAddress) { alert("Please connect a wallet first!"); return; }
    setIsMinting(true);
    const address = evmAddress || solanaAddress || "";
    const chain = evmAddress ? 'EVM' : 'SOL';

    // Pass wallet context for signing if on Solana
    // We'll update the util function to handle this or just pass it as an extra arg it might ignore for now
    const walletContext = chain === 'SOL' ? { signMessage, sendTransaction, publicKey } : undefined;

    const success = await mintHighScoreNFT(score, address, chain, walletContext);
    setIsMinting(false);
    if (success) setHasMinted(true);
  }, [evmAddress, solanaAddress, score, signMessage, sendTransaction, publicKey]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-comic-yellow font-comic cursor-crosshair">
      <GameCanvas
        key={gameKey}
        onScoreUpdate={setScore}
        onTimeUpdate={setTimeLeft}
        onGameOver={handleGameOver}
        onMissionUpdate={(d, p) => setMissionInfo({ description: d, progress: p })}
        onComboUpdate={setCombo}
        onPowerUpdate={handlePowerUpdate}
        powerRequested={powerRequested}
        onPowerExecuted={handlePowerExecuted}
        hammerConfig={hammerConfig}
        isPaused={isCustomizing}
      />
      <UIOverlay
        score={score} highScore={highScore} timeLeft={timeLeft} gameOver={gameOver} combo={combo}
        onRestart={handleRestart} missionDescription={missionInfo.description} missionProgress={missionInfo.progress}
        evmAddress={evmAddress} solanaAddress={solanaAddress} onConnectEVM={handleConnectEVM} onConnectSolana={handleConnectSolana}
        isCustomizing={isCustomizing} onToggleCustomize={() => setIsCustomizing(!isCustomizing)}
        hammerConfig={hammerConfig} onUpdateHammerConfig={setHammerConfig}
        isNewHighScore={isNewHighScore} onMintNFT={handleMintNFT} isMinting={isMinting} hasMinted={hasMinted}
        powerCharge={powerCharge} onTriggerPower={triggerPower}
      />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <SolanaWalletProvider>
      <GameContent />
    </SolanaWalletProvider>
  );
};

export default App;