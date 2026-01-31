import React from 'react';
import { soundManager } from '../utils/audio';
import { truncateAddress } from '../utils/wallet';
import { HammerConfig } from './GameCanvas';
import { SolanaWalletButton } from './SolanaWalletButton';

interface UIOverlayProps {
  score: number;
  highScore: number;
  timeLeft: number;
  gameOver: boolean;
  combo: number;
  onRestart: () => void;
  missionDescription: string;
  missionProgress: string;
  evmAddress: string | null;
  solanaAddress: string | null;
  onConnectEVM: () => void;
  onConnectSolana: () => void;
  isCustomizing: boolean;
  onToggleCustomize: () => void;
  hammerConfig: HammerConfig;
  onUpdateHammerConfig: (config: HammerConfig) => void;
  isNewHighScore: boolean;
  onMintNFT: () => void;
  isMinting: boolean;
  hasMinted: boolean;
  powerCharge: number;
  onTriggerPower: () => void;
}

const UIOverlay: React.FC<UIOverlayProps> = ({
  score, highScore, timeLeft, gameOver, combo, onRestart, missionDescription, missionProgress,
  evmAddress, solanaAddress, onConnectEVM, onConnectSolana, isCustomizing, onToggleCustomize,
  hammerConfig, onUpdateHammerConfig, isNewHighScore, onMintNFT, isMinting, hasMinted,
  powerCharge, onTriggerPower
}) => {
  const displayTime = Math.max(0, Math.ceil(timeLeft));
  const isLowTime = displayTime <= 5;
  const isPowerReady = powerCharge >= 100;
  const isConnected = !!evmAddress || !!solanaAddress;

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-10 flex flex-col justify-between p-5">



      {/* Top HUD */}
      <div className="flex justify-between items-start w-full relative mt-8 md:mt-0">
        <div className="text-left z-20">
          <div className="text-2xl text-black drop-shadow-sm rotate-[-2deg]">SCORE</div>
          <div className="text-5xl md:text-6xl text-comic-blue drop-shadow-[3px_3px_0_#000] rotate-[-2deg]">{score}</div>
          <div className="text-xl text-black/60 font-bold mt-1 rotate-[-2deg]">HI: {highScore}</div>
        </div>

        <div className="text-center mx-2 absolute top-20 left-1/2 transform -translate-x-1/2 md:top-0 md:static md:transform-none z-10">
          <div className="bg-white border-4 border-black px-4 py-2 rotate-1 shadow-[4px_4px_0_rgba(0,0,0,0.2)]">
            <div className="text-xs md:text-lg text-black uppercase tracking-widest">CURRENT MISSION</div>
            <div className="text-xl md:text-2xl text-red-600 font-bold leading-none">{missionDescription}</div>
            <div className="text-sm md:text-xl text-black font-bold mt-1">{missionProgress}</div>
          </div>
        </div>

        <div className="text-right z-20 flex flex-col items-end">
          <div className="pointer-events-auto mb-2 relative z-50 transform translate-x-1">
            <SolanaWalletButton />
          </div>
          <div className="text-2xl text-black drop-shadow-sm rotate-[2deg]">TIME</div>
          <div className={`text-5xl md:text-6xl drop-shadow-[3px_3px_0_#000] rotate-[2deg] ${isLowTime ? 'text-red-600 animate-pulse' : 'text-white'}`}>
            {displayTime}s
          </div>
        </div>
      </div>

      {/* Center Combo & Power HUD */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
        {combo > 1 && (
          <div className="opacity-80 pointer-events-none animate-pulse mb-4">
            <div className="text-6xl md:text-8xl font-black text-yellow-300 drop-shadow-[4px_4px_0_#000] rotate-[-5deg]" style={{ WebkitTextStroke: "2px black" }}>{combo}x</div>
            <div className="text-3xl md:text-5xl font-bold text-white drop-shadow-[2px_2px_0_#000] rotate-[-3deg]">COMBO!</div>
          </div>
        )}

        {!gameOver && !isCustomizing && (
          <div className="mt-4 pointer-events-auto flex flex-col items-center">
            <div className="w-48 h-6 bg-black border-2 border-black p-0.5 mb-1 relative overflow-hidden rounded-full shadow-[2px_2px_0_#000]">
              <div
                className={`h-full bg-gradient-to-r from-blue-600 to-blue-300 transition-all duration-300 ${isPowerReady ? 'animate-pulse' : ''}`}
                style={{ width: `${powerCharge}%` }}
              ></div>
            </div>
            {isPowerReady && (
              <button
                onClick={(e) => { e.stopPropagation(); onTriggerPower(); }}
                className="bg-red-600 text-white border-2 border-black px-4 py-1 text-xl font-black shadow-[3px_3px_0_#000] hover:scale-110 active:scale-95 transition-transform uppercase animate-bounce"
              >
                ULTRA-BONK! (SPACE)
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom Controls (Hidden on Game Over) */}
      {!gameOver && !isCustomizing && (
        <div className="w-full flex justify-between items-end">
          <div className="w-1/4 pointer-events-auto z-20">
            <button
              onClick={() => { soundManager.playClick(); onToggleCustomize(); }}
              className="px-4 py-2 bg-yellow-400 border-2 border-black font-bold text-sm md:text-lg shadow-[2px_2px_0_rgba(0,0,0,1)] hover:bg-yellow-300 active:translate-y-1 active:shadow-none rotate-2"
            >
              🛠 CUSTOMIZE
            </button>
          </div>
          <div className="w-auto md:w-1/4 flex flex-col items-end gap-2 pointer-events-auto z-20">
            <button onClick={onConnectEVM} disabled={!!evmAddress} className={`px-3 py-1 border-2 border-black font-bold text-sm md:text-base shadow-[2px_2px_0_rgba(0,0,0,0.5)] ${evmAddress ? 'bg-green-400 text-black' : 'bg-blue-500 text-white hover:bg-blue-400 -rotate-1'}`}>
              {evmAddress ? `BASE: ${truncateAddress(evmAddress)}` : 'CONNECT BASE'}
            </button>
            {/* REMOVED OLD SOL BUTTON HERE */}
          </div>
        </div>
      )}

      {/* Customization Modal */}
      {isCustomizing && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-auto backdrop-blur-sm p-4 z-50">
          <div className="bg-white border-8 border-black p-6 md:p-8 w-full max-w-lg transform rotate-1 shadow-[10px_10px_0_#FFD700]">
            <h2 className="text-4xl text-center font-black mb-6 rotate-[-1deg]">WORKBENCH</h2>
            <div className="mb-4">
              <label className="block text-xl font-bold mb-2">HEAD SHAPE</label>
              <div className="flex gap-2">
                {(['sledge', 'mallet'] as const).map(type => (
                  <button key={type} onClick={() => { soundManager.playClick(); onUpdateHammerConfig({ ...hammerConfig, headType: type }); }} className={`flex-1 py-3 border-2 border-black font-bold uppercase ${hammerConfig.headType === type ? 'bg-comic-blue text-white' : 'bg-gray-100 text-black'}`}>{type}</button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-xl font-bold mb-2">ALLOY</label>
              <div className="flex gap-2">
                {(['classic', 'gold', 'fire', 'void'] as const).map(color => (
                  <button key={color} onClick={() => { soundManager.playClick(); onUpdateHammerConfig({ ...hammerConfig, color: color }); }} className={`flex-1 py-4 border-2 border-black font-bold uppercase text-sm ${hammerConfig.color === color ? 'ring-4 ring-comic-blue bg-slate-700 text-white' : 'bg-gray-100 text-black'}`}>{color}</button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-xl font-bold mb-2">GRIP STYLE</label>
              <div className="flex gap-2">
                {(['wood', 'tape', 'metal'] as const).map(type => (
                  <button key={type} onClick={() => { soundManager.playClick(); onUpdateHammerConfig({ ...hammerConfig, handleType: type }); }} className={`flex-1 py-3 border-2 border-black font-bold uppercase text-sm ${hammerConfig.handleType === type ? 'bg-comic-blue text-white' : 'bg-gray-100 text-black'}`}>{type}</button>
                ))}
              </div>
            </div>
            <button onClick={() => { soundManager.playClick(); onToggleCustomize(); }} className="w-full bg-green-500 text-white border-4 border-black py-3 text-2xl font-bold shadow-[4px_4px_0_rgba(0,0,0,1)]">DONE</button>
          </div>
        </div>
      )}

      {/* Game Over Modal with NFT Minting */}
      {gameOver && !isCustomizing && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center pointer-events-auto backdrop-blur-md p-4 z-50 overflow-y-auto">
          <div className="bg-white border-8 border-black p-6 md:p-10 w-full max-w-xl transform rotate-[-1deg] shadow-[12px_12px_0_#FFD700] my-auto">

            {isNewHighScore && (
              <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-yellow-400 border-4 border-black px-8 py-3 rotate-[-3deg] shadow-[6px_6px_0_#000] z-50 whitespace-nowrap">
                <span className="text-3xl md:text-4xl font-black text-red-600 animate-bounce block">🏆 NEW WORLD RECORD! 🏆</span>
              </div>
            )}

            <h1 className="text-6xl md:text-8xl text-center text-red-600 drop-shadow-[5px_5px_0_#000] mb-6 mt-4">K.O.!</h1>

            <div className="text-center mb-8 border-b-4 border-black pb-6">
              <div className="text-3xl text-black font-bold uppercase tracking-tighter">FINAL SCORE</div>
              <div className="text-7xl md:text-8xl text-comic-blue drop-shadow-[4px_4px_0_#000] leading-none">{score}</div>
            </div>

            {/* NFT Minting Section - Only for New High Scores */}
            {isNewHighScore && (
              <div className="bg-blue-50 border-4 border-dashed border-blue-400 p-4 mb-8 rotate-1">
                <h3 className="text-2xl font-black text-center mb-4 text-blue-800 underline decoration-yellow-400 underline-offset-4 uppercase">ETERNALIZ THE SMASH!</h3>

                {!isConnected ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-center font-bold text-gray-700 mb-2">Connect a wallet to mint your score as an NFT!</p>
                    <div className="flex gap-2">
                      <button
                        onClick={onConnectEVM}
                        className="flex-1 bg-blue-600 text-white border-2 border-black font-black py-2 shadow-[2px_2px_0_#000] hover:scale-105 active:scale-95 transition-transform"
                      >
                        BASE
                      </button>
                      <button
                        onClick={onConnectSolana}
                        className="flex-1 bg-purple-600 text-white border-2 border-black font-black py-2 shadow-[2px_2px_0_#000] hover:scale-105 active:scale-95 transition-transform"
                      >
                        SOLANA
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    {hasMinted ? (
                      <div className="bg-green-100 text-green-700 border-4 border-green-600 p-4 font-black text-2xl rotate-[-2deg] animate-pulse">
                        SCORE MINTED ON-CHAIN! ✅
                      </div>
                    ) : (
                      <button
                        onClick={onMintNFT}
                        disabled={isMinting}
                        className={`w-full text-white border-4 border-black py-4 text-3xl font-black shadow-[4px_4px_0_#000] hover:scale-105 active:scale-95 transition-transform uppercase ${isMinting ? 'bg-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-yellow-500 via-red-500 to-yellow-500 animate-shimmer bg-[length:200%_100%]'}`}
                      >
                        {isMinting ? 'MINTING...' : 'MINT SCORE NFT!'}
                      </button>
                    )}
                    <p className="mt-2 text-xs font-bold text-gray-500">Connected: {truncateAddress(evmAddress || solanaAddress || '')}</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-4">
              <button
                onClick={() => { soundManager.playClick(); onRestart(); }}
                className="w-full bg-comic-yellow hover:bg-yellow-400 text-4xl text-black border-4 border-black py-4 shadow-[6px_6px_0_#000] font-black uppercase tracking-tighter hover:scale-[1.02] active:translate-y-1 active:shadow-none transition-all"
              >
                STILL HUNGRY? (RETRY)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UIOverlay;