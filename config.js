// config.js
export const GAME_CONFIG = {
  positions: ["toilet", "col-1", "col-2", "col-3", "col-4"],

  leakColumns: [1,2,3,4],

  maxLives: 3,
  maxDropStage: 3, // stages 0..3

  attractBlinkInterval: 650,
  startBlinkCount: 5,
  startBlinkInterval: 220,
  gameOverBlinkCount: 6,
  gameOverBlinkInterval: 260,

  leakTiming: [
    { col: 1, baseInterval: 1800, jitter: 400 },
    { col: 2, baseInterval: 1500, jitter: 300 },
    { col: 3, baseInterval: 1300, jitter: 300 },
    { col: 4, baseInterval: 1600, jitter: 500 },
  ],

  minLeakInterval: 950,
  leakWarningDuration: 900,
  leakWarningBlinkInterval: 140,
  leakWarningExtend: 260,
  leakWarningBlinkCount: 4,
  dropLandingGap: 700,

  dropFallTimePerStage: 385,      // ms per stage at speedFactor = 1
  dropStageMinTime: 190,
  speedIncreasePerDrop: 0.0035,
  speedFactorMax: 1.6,
  dropStageSpawnThreshold: 3,

  bucketDumpDuration: 700,
  bucketDumpBlinkInterval: 120,
  mushroomScoreStart: 5,
  mushroomScoreEnd: 50,
  mushroomScoreJitter: 4,
  concurrentDropByScore: [
    { score: 0, max: 1 },
    { score: 10, max: 2 },
    { score: 30, max: 3 },
  ],
};
