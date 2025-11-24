// segments.js
// Central registry of every SVG segment we might toggle.
// This is the ONLY place in the codebase that knows the raw SVG IDs.

export const SEGMENTS = {
  // PLAYER + BUCKET -----------------------------------

  // player always carries the bucket, just in a different position
  // indices: 0..4 (0 could be "at toilet", 1..4 under leak columns)
  playerPositions: [
    "man-0",
    "man-1",
    "man-2",
    "man-3",
    "man-4",
  ],

  // bucket water segments by player position index
  // there is no bucketwater-0 (at the toilet), so we map explicitly
  bucketWaterByPos: {
    1: "bucketwater-1",
    2: "bucketwater-2",
    3: "bucketwater-3",
    4: "bucketwater-4",
  },

  // DROPLETS & LEAKS ----------------------------------

  // 4 columns of leaking water, each with 4 vertical stages.
  // drops[colIndex][stageIndex]
  drops: [
    ["droplet-1-1", "droplet-1-2", "droplet-1-3", "droplet-1-4"], // column 0
    ["droplet-2-1", "droplet-2-2", "droplet-2-3", "droplet-2-4"], // column 1
    ["droplet-3-1", "droplet-3-2", "droplet-3-3", "droplet-3-4"], // column 2
    ["droplet-4-1", "droplet-4-2", "droplet-4-3", "droplet-4-4"], // column 3
  ],

  // ceiling cracks above each leak column
  cracks: ["crack1", "crack2", "crack3", "crack4"],

  // toilet (player empties bucket here)
  toilet: "toilet",

  // WATER / LEVELS ------------------------------------

  // optional water levels you may want to toggle as the office fills up
  waterLevels: ["level-1", "level-2", "level-3"],

  // parts of the water that are always present (if you want them on)
  staticWater: ["water", "water-toilet"],

  // HUD -----------------------------------------------

  lives: ["life1", "life2", "life3"],

  text: {
    new: "new",
    game: "game",
    over: "over",
  },

  // DECOR ---------------------------------------------

  mushrooms: [
    "mush1",
    "mush2",
    "mush3",
    "mush4",
    "mush5",
    "mush6",
    "mush7",
    "mush8",
    "mush9",
    "mush10",
    "mush11",
    "mush12",
    "mush13",
  ],
};

// Optional convenience: a flat list of all known segment IDs.
// Useful for "clear everything" operations.
export const ALL_SEGMENT_IDS = (() => {
  const ids = new Set();

  SEGMENTS.playerPositions.forEach(id => ids.add(id));
  Object.values(SEGMENTS.bucketWaterByPos).forEach(id => ids.add(id));

  SEGMENTS.drops.flat().forEach(id => ids.add(id));
  SEGMENTS.cracks.forEach(id => ids.add(id));
  ids.add(SEGMENTS.toilet);

  SEGMENTS.waterLevels.forEach(id => ids.add(id));
  SEGMENTS.staticWater.forEach(id => ids.add(id));

  SEGMENTS.lives.forEach(id => ids.add(id));
  Object.values(SEGMENTS.text).forEach(id => ids.add(id));

  SEGMENTS.mushrooms.forEach(id => ids.add(id));

  return Array.from(ids);
})();
