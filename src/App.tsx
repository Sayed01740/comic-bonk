
import React, { useState, useCallback, useEffect } from 'react';
import GameCanvas, { HammerConfig } from './components/GameCanvas';
import UIOverlay from './components/UIOverlay';

// Main Game Component
const Game: React.FC = () => {
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

  useEffect(() => {
    const stored = localStorage.getItem('comicBonkHighScore');
    if (stored) setHighScore(parseInt(stored, 10));
  }, []);

  const handleRestart = useCallback(() => {
    setScore(0); setTimeLeft(30); setGameOver(false); setCombo(0);
    setMissionInfo({ description: "GET READY!", progress: "" });
    setPowerCharge(0); setPowerRequested(false);
    setIsNewHighScore(false);
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
        isCustomizing={isCustomizing} onToggleCustomize={() => setIsCustomizing(!isCustomizing)}
        hammerConfig={hammerConfig} onUpdateHammerConfig={setHammerConfig}
        isNewHighScore={isNewHighScore}
        powerCharge={powerCharge} onTriggerPower={triggerPower}
      />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Game />
  );
};

export default App;