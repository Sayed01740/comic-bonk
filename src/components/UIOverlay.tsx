import React from 'react';
import { soundManager } from '../utils/audio';
import { HammerConfig } from './GameCanvas';

interface UIOverlayProps {
  score: number;
  highScore: number;
  timeLeft: number;
  gameOver: boolean;
  combo: number;
  onRestart: () => void;
  missionDescription: string;
  missionProgress: string;
  isCustomizing: boolean;
  onToggleCustomize: () => void;
  hammerConfig: HammerConfig;
  onUpdateHammerConfig: (config: HammerConfig) => void;
  isNewHighScore: boolean;
  powerCharge: number;
  onTriggerPower: () => void;
}

const UIOverlay: React.FC<UIOverlayProps> = ({
  score, highScore, timeLeft, gameOver, combo, onRestart, missionDescription, missionProgress,
  isCustomizing, onToggleCustomize, hammerConfig, onUpdateHammerConfig, isNewHighScore,
  powerCharge, onTriggerPower
}) => {
  const [walletPubKey, setWalletPubKey] = React.useState<string | null>((window as any).solanaPublicKey || null);
  const [isConnecting, setIsConnecting] = React.useState(false);
  const displayTime = Math.max(0, Math.ceil(timeLeft));
  const isLowTime = displayTime <= 5;
  const isPowerReady = powerCharge >= 100;

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-10 flex flex-col justify-between p-3 md:p-5">

      {/* Top HUD */}
      <div className="flex justify-between items-start w-full relative">
        <div className="text-left z-20">
          <div className="text-xl md:text-2xl text-black drop-shadow-sm rotate-[-2deg]">SCORE</div>
          <div className="text-4xl md:text-6xl text-comic-blue drop-shadow-[2px_2px_0_#000] rotate-[-2deg]">{score}</div>
          <div className="text-sm md:text-xl text-black/60 font-bold mt-1 rotate-[-2deg]">HI: {highScore}</div>
        </div>

        <div className="text-center mx-1 absolute top-14 left-1/2 transform -translate-x-1/2 md:top-0 md:static md:transform-none z-10 w-48 md:w-auto">
          <div className="bg-white border-2 md:border-4 border-black px-2 py-1 md:px-4 md:py-2 rotate-1 shadow-[2px_2px_0_rgba(0,0,0,0.2)] md:shadow-[4px_4px_0_rgba(0,0,0,0.2)]">
            <div className="text-[10px] md:text-lg text-black uppercase tracking-widest">CURRENT MISSION</div>
            <div className="text-lg md:text-2xl text-red-600 font-bold leading-none">{missionDescription}</div>
            <div className="text-xs md:text-xl text-black font-bold mt-0.5">{missionProgress}</div>
          </div>
        </div>

        <div className="text-right z-20">
          <div className="text-xl md:text-2xl text-black drop-shadow-sm rotate-[2deg]">TIME</div>
          <div className={`text-4xl md:text-6xl drop-shadow-[2px_2px_0_#000] rotate-[2deg] ${isLowTime ? 'text-red-600 animate-pulse' : 'text-white'}`}>
            {displayTime}s
          </div>
        </div>
      </div>

      {/* Center Combo & Power HUD */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center w-full pointer-events-none">
        {combo > 1 && (
          <div className="opacity-80 animate-pulse mb-4">
            <div className="text-5xl md:text-8xl font-black text-yellow-300 drop-shadow-[3px_3px_0_#000] rotate-[-5deg]" style={{ WebkitTextStroke: "1.5px black" }}>{combo}x</div>
            <div className="text-2xl md:text-5xl font-bold text-white drop-shadow-[2px_2px_0_#000] rotate-[-3deg]">COMBO!</div>
          </div>
        )}

        {!gameOver && !isCustomizing && (
          <div className="mt-4 pointer-events-auto flex flex-col items-center">
            <div className="w-32 md:w-48 h-4 md:h-6 bg-black border-2 border-black p-0.5 mb-1 relative overflow-hidden rounded-full shadow-[2px_2px_0_#000]">
              <div
                className={`h-full bg-gradient-to-r from-blue-600 to-blue-300 transition-all duration-300 ${isPowerReady ? 'animate-pulse' : ''}`}
                style={{ width: `${powerCharge}%` }}
              ></div>
            </div>
            {isPowerReady && (
              <button
                onClick={(e) => { e.stopPropagation(); onTriggerPower(); }}
                className="bg-red-600 text-white border-2 border-black px-3 py-1 md:px-4 md:py-1 text-base md:text-xl font-black shadow-[3px_3px_0_#000] hover:scale-110 active:scale-95 transition-transform uppercase animate-bounce whitespace-nowrap"
              >
                ULTRA-BONK! (SPACE)
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom Controls (Hidden on Game Over) */}
      {!gameOver && !isCustomizing && (
        <div className="w-full flex justify-between items-end pointer-events-none">
          <div className="pointer-events-auto z-20 flex flex-col items-start gap-2">
            {walletPubKey && (
              <div className="bg-black/60 text-white text-[10px] md:text-sm px-2 py-1 rounded border border-white/20 font-mono">
                {walletPubKey.slice(0, 4)}...{walletPubKey.slice(-4)}
              </div>
            )}
            <button
              disabled={isConnecting}
              onClick={async () => {
                if (isConnecting) {
                  console.log('[UIOverlay] connect button tapped but already connecting — ignoring');
                  return;
                }
                setIsConnecting(true);
                console.log('[UIOverlay] connect button tapped, calling SolanaWallet.connect()...');
                soundManager.playClick();
                try {
                  const res = await (window as any).SolanaWallet.connect();
                  console.log('[UIOverlay] SolanaWallet.connect() returned:', JSON.stringify(res));
                  if (res && res.ok && res.data) {
                    (window as any).solanaPublicKey = res.data.publicKeyBase58;
                    (window as any).userPublicKey = res.data.publicKeyBase58;
                    setWalletPubKey(res.data.publicKeyBase58);
                    console.log('[UIOverlay] ✅ Wallet connected:', res.data.publicKeyBase58);

                    // Trigger Mint-to-Play check
                    if (typeof (window as any).setupMintingAndCheckGate === 'function') {
                      (window as any).setupMintingAndCheckGate();
                    }
                  } else {
                    console.warn('[UIOverlay] ❌ Wallet connect failed or returned unexpected data:', res);
                  }
                } catch (err) {
                  console.error('[UIOverlay] 🚨 SolanaWallet.connect() threw:', err);
                } finally {
                  setIsConnecting(false);
                  console.log('[UIOverlay] connect flow finished');
                }
              }}
              className={`px-3 py-1.5 md:px-4 md:py-2 border-2 border-black font-bold text-xs md:text-lg shadow-[2px_2px_0_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none rotate-[-2deg] ${isConnecting
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-500'
                }`}
            >
              {isConnecting ? '⏳ CONNECTING...' : walletPubKey ? '✅ CONNECTED' : '🔌 CONNECT WALLET'}
            </button>
            {walletPubKey && (
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    const res = await (window as any).SolanaWallet.signMessage(btoa("Comic Bonk! " + Date.now()));
                    alert(res.ok ? "Signed!" : "Failed: " + res.error.message);
                  }}
                  className="px-2 py-1 bg-blue-500 text-white text-[10px] md:text-xs border border-black"
                >SIGN MSG</button>
                <button
                  onClick={async () => {
                    // This is just a stub, real tx needs proper construction
                    alert("Sign & Send (Stub): Construct a real transaction in your app logic first!");
                  }}
                  className="px-2 py-1 bg-green-500 text-white text-[10px] md:text-xs border border-black"
                >SEND TEST</button>
              </div>
            )}
          </div>
          <div className="pointer-events-auto z-20">
            <button
              onClick={() => { soundManager.playClick(); onToggleCustomize(); }}
              className="px-3 py-1.5 md:px-4 md:py-2 bg-yellow-400 border-2 border-black font-bold text-xs md:text-lg shadow-[2px_2px_0_rgba(0,0,0,1)] hover:bg-yellow-300 active:translate-y-1 active:shadow-none rotate-2"
            >
              🛠 CUSTOMIZE
            </button>
          </div>
        </div>
      )
      }

      {/* Customization Modal */}
      {
        isCustomizing && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-auto backdrop-blur-sm p-4 z-50">
            <div className="bg-white border-4 md:border-8 border-black p-4 md:p-8 w-full max-w-sm md:max-w-lg transform rotate-1 shadow-[8px_8px_0_#FFD700]">
              <h2 className="text-3xl md:text-4xl text-center font-black mb-4 md:mb-6 rotate-[-1deg]">WORKBENCH</h2>
              <div className="mb-3 md:mb-4">
                <label className="block text-lg md:text-xl font-bold mb-1 md:mb-2">HEAD SHAPE</label>
                <div className="flex gap-2">
                  {(['sledge', 'mallet'] as const).map(type => (
                    <button key={type} onClick={() => { soundManager.playClick(); onUpdateHammerConfig({ ...hammerConfig, headType: type }); }} className={`flex-1 py-2 md:py-3 border-2 border-black font-bold uppercase text-sm md:text-base ${hammerConfig.headType === type ? 'bg-comic-blue text-white' : 'bg-gray-100 text-black'}`}>{type}</button>
                  ))}
                </div>
              </div>
              <div className="mb-3 md:mb-4">
                <label className="block text-lg md:text-xl font-bold mb-1 md:mb-2">ALLOY</label>
                <div className="flex gap-2">
                  {(['classic', 'gold', 'fire', 'void'] as const).map(color => (
                    <button key={color} onClick={() => { soundManager.playClick(); onUpdateHammerConfig({ ...hammerConfig, color: color }); }} className={`flex-1 py-2 md:py-4 border-2 border-black font-bold uppercase text-xs md:text-sm ${hammerConfig.color === color ? 'ring-2 md:ring-4 ring-comic-blue bg-slate-700 text-white' : 'bg-gray-100 text-black'}`}>{color}</button>
                  ))}
                </div>
              </div>
              <div className="mb-3 md:mb-4">
                <label className="block text-lg md:text-xl font-bold mb-1 md:mb-2">GRIP STYLE</label>
                <div className="flex gap-2">
                  {(['wood', 'tape', 'metal'] as const).map(type => (
                    <button key={type} onClick={() => { soundManager.playClick(); onUpdateHammerConfig({ ...hammerConfig, handleType: type }); }} className={`flex-1 py-2 md:py-3 border-2 border-black font-bold uppercase text-xs md:text-sm ${hammerConfig.handleType === type ? 'bg-comic-blue text-white' : 'bg-gray-100 text-black'}`}>{type}</button>
                  ))}
                </div>
              </div>
              <button onClick={() => { soundManager.playClick(); onToggleCustomize(); }} className="w-full bg-green-500 text-white border-2 md:border-4 border-black py-2 md:py-3 text-xl md:text-2xl font-bold shadow-[3px_3px_0_rgba(0,0,0,1)]">DONE</button>
            </div>
          </div>
        )
      }

      {/* Game Over Modal */}
      {
        gameOver && !isCustomizing && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center pointer-events-auto backdrop-blur-md p-4 z-50 overflow-y-auto">
            <div className="bg-white border-4 md:border-8 border-black p-6 md:p-10 w-full max-w-sm md:max-w-xl transform rotate-[-1deg] shadow-[8px_8px_0_#FFD700] my-auto">

              {isNewHighScore && (
                <div className="absolute -top-6 md:-top-10 left-1/2 transform -translate-x-1/2 bg-yellow-400 border-2 md:border-4 border-black px-4 md:px-8 py-2 md:py-3 rotate-[-3deg] shadow-[4px_4px_0_#000] z-50 whitespace-nowrap">
                  <span className="text-xl md:text-4xl font-black text-red-600 animate-bounce block">🏆 NEW RECORD! 🏆</span>
                </div>
              )}

              <h1 className="text-5xl md:text-8xl text-center text-red-600 drop-shadow-[4px_4px_0_#000] mb-4 md:mb-6 mt-2 md:mt-4">K.O.!</h1>

              <div className="text-center mb-6 md:mb-8 border-b-4 border-black pb-4 md:pb-6">
                <div className="text-xl md:text-3xl text-black font-bold uppercase tracking-tighter">FINAL SCORE</div>
                <div className="text-6xl md:text-8xl text-comic-blue drop-shadow-[4px_4px_0_#000] leading-none">{score}</div>
              </div>

              <div className="flex flex-col gap-4">
                <button
                  onClick={() => { soundManager.playClick(); onRestart(); }}
                  className="w-full bg-comic-yellow hover:bg-yellow-400 text-2xl md:text-4xl text-black border-4 border-black py-3 md:py-4 shadow-[4px_4px_0_#000] md:shadow-[6px_6px_0_#000] font-black uppercase tracking-tighter hover:scale-[1.02] active:translate-y-1 active:shadow-none transition-all"
                >
                  STILL HUNGRY? (RETRY)
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default UIOverlay;