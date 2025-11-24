// gameState.js
import { GAME_CONFIG } from './config.js';

export const GamePhase = Object.freeze({
  ATTRACT: 'attract',
  STARTING: 'starting',
  PLAYING: 'playing',
  GAME_OVER: 'game-over',
});

export function createInitialState(){
  return {
    phase: GamePhase.ATTRACT,
    running: false,
    gameOver: false,
    lastFrameTime: 0,

    playerPos: 2,
    bucketFilled: false,

    score: 0,
    lives: GAME_CONFIG.maxLives,
    highScore: 0,

    waterLevel: 0,
    mushroomsUnlocked: [],
    mushroomSchedule: [],

    speedFactor: 1,

    drops: [],
    leaks: GAME_CONFIG.leakTiming.map(l => ({
      col: l.col,
      nextSpawnAt: 0,
      warningUntil: 0,
      nextWarningToggle: 0,
      warningOn: false,
      pendingDrop: false,
      expectedLanding: 0,
      crackHold: false,
      activeDropId: null,
      warningPhase: 'idle',
      warningBlinkRemaining: 0,
    })),

    crackWarnings: [false,false,false,false],

    textDisplay: { new: true, game: true, over: false },

    bucketDump: { active: false, until: 0, blinkOn: false, nextBlink: 0 },
    startBlink: null,
    gameOverBlink: null,
    attractBlink: { on: true, nextToggle: 0 },

    lastDropCol: null,

    maxConcurrentDrops: 1,
  };
}
