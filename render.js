// render.js
import { SEGMENTS, ALL_SEGMENT_IDS } from './segments.js';

const SEGMENT_PREFIX = 'segment-';
const activeSegments = new Set();
let reportedMissingSegments = false;

function segmentElement(id){
  return document.getElementById(SEGMENT_PREFIX + id) || document.getElementById(id);
}

export function segOn(id){
  const el = segmentElement(id);
  if(!el) return;
  if(el.dataset.segmentGroup === '1' || (el.id && el.id.startsWith(SEGMENT_PREFIX))){
    el.style.display = '';
  } else {
    el.style.opacity = '1';
    el.style.visibility = 'visible';
  }
}

export function segOff(id){
  const el = segmentElement(id);
  if(!el) return;
  if(el.dataset.segmentGroup === '1' || (el.id && el.id.startsWith(SEGMENT_PREFIX))){
    el.style.display = 'none';
  } else {
    el.style.opacity = '0';
    el.style.visibility = 'hidden';
  }
}

export function clearAllSegments(){
  ALL_SEGMENT_IDS.forEach(id => segOff(id));
}

export function render(state){
  if(!document.body || !state) return;
  clearAllSegments();
  const hideToilet = !!state.hideToilet;
  const hidePlayer = !!state.hidePlayer;

  if(state.timeReportActive){
    renderTimeReport(state);
    applyText(state.textDisplay);
    return;
  }

  if(state.phase === 'attract'){
    renderAttract(state, hideToilet, hidePlayer);
    applyText(state.textDisplay);
    return;
  }

  if(!hidePlayer){
    const pos = Math.max(0, Math.min(SEGMENTS.playerPositions.length - 1, Number(state.playerPos || 0)));
    const playerId = SEGMENTS.playerPositions[pos];
    if(playerId) segOn(playerId);
  }

  if(!hidePlayer){
    const bucketPos = Number.isInteger(state.playerPos) ? state.playerPos : null;
    if(state.bucketFilled && bucketPos && bucketPos >= 1 && bucketPos <= 4){
      const id = SEGMENTS.bucketWaterByPos[bucketPos];
      if(id) segOn(id);
    }
  }

  if(Array.isArray(state.drops)){
    state.drops.forEach(drop => {
      if(!drop || !drop.active) return;
      const colIdx = Math.max(0, Math.min((SEGMENTS.drops.length - 1), (drop.col || 1) - 1));
      const frames = SEGMENTS.drops[colIdx] || [];
      if(!frames.length) return;
      const stage = Math.max(0, Math.min(frames.length - 1, drop.stage || 0));
      const id = frames[stage];
      if(id) segOn(id);
    });
  }

  (SEGMENTS.lives || []).forEach((id, idx) => {
    if(idx < (state.lives || 0)) segOn(id);
    else segOff(id);
  });

  if(!hideToilet) segOn(SEGMENTS.toilet);

  if(!hideToilet && state.bucketDump && state.bucketDump.active){
    const staticWater = SEGMENTS.staticWater || [];
    const toiletWater = staticWater.find(id => id === 'water-toilet');
    if(toiletWater) segOn(toiletWater);
    if(state.bucketDump.blinkOn){
      const spill = staticWater.find(id => id === 'water');
      if(spill) segOn(spill);
    }
  }

  if(state.gameOver){
    // When game is over, show all cracks
    SEGMENTS.cracks.forEach(id => {
      if(id) segOn(id);
    });
  } else if(Array.isArray(state.crackWarnings)){
    state.crackWarnings.forEach((on, idx) => {
      if(on){
        const id = SEGMENTS.cracks[idx];
        if(id) segOn(id);
      }
    });
  }

  if(state.waterLevel > 0){
    const lvlIdx = Math.min(state.waterLevel, SEGMENTS.waterLevels.length) - 1;
    const id = SEGMENTS.waterLevels[lvlIdx];
    if(id) segOn(id);
  }

  const mushrooms = Array.isArray(state.mushroomsUnlocked) ? state.mushroomsUnlocked : [];
  mushrooms.forEach(id => {
    if(id) segOn(id);
  });

  applyText(state.textDisplay);
}

function renderAttract(state, hideToilet, hidePlayer){
  if(!hidePlayer){
    const pos = Math.max(0, Math.min(SEGMENTS.playerPositions.length - 1, Number(state.playerPos || 0)));
    const playerId = SEGMENTS.playerPositions[pos];
    if(playerId) segOn(playerId);
  }
  SEGMENTS.drops.forEach(col => {
    if(col[0]) segOn(col[0]);
  });
  if(!hideToilet) segOn(SEGMENTS.toilet);
}

function renderTimeReport(state){
  const unlocked = Array.isArray(state.mushroomsUnlocked) && state.mushroomsUnlocked.length
    ? state.mushroomsUnlocked
    : (SEGMENTS.mushrooms || []);
  unlocked.forEach(id => {
    if(id) segOn(id);
  });
}

function applyText(display = {}){
  Object.entries(SEGMENTS.text).forEach(([key, id]) => {
    if(display[key]) segOn(id);
  });
}

export function initRender(){
  const missing = [];
  ALL_SEGMENT_IDS.forEach(id => {
    const el = segmentElement(id);
    if(!el){
      missing.push(id);
      return;
    }
    if(el.dataset.segmentGroup === '1') el.style.display = 'none';
    else {
      el.style.opacity = '0';
      el.style.visibility = 'hidden';
    }
  });
  if(missing.length && !reportedMissingSegments){
    reportedMissingSegments = true;
    console.warn('[render] Missing LCD segment nodes:', missing);
  }
  activeSegments.clear();
}
