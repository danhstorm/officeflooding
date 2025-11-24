// render.js
import { SEGMENTS, ALL_SEGMENT_IDS } from './segments.js';

const SEGMENT_PREFIX = 'segment-';
const DEBUG_LAYER_ID = 'mask-debug-layer';
const GRID_LAYER_ID = 'lcd-alignment-grid';
const activeSegments = new Set();
let reportedMissingSegments = false;

function segmentElement(id){
  return document.getElementById(SEGMENT_PREFIX + id) || document.getElementById(id);
}

export function getActiveSegments(){
  return Array.from(activeSegments);
}

export function segOn(id){
  const el = segmentElement(id);
  if(!el) return;
  activeSegments.add(id);
  if(el.dataset.segmentGroup === '1' || (el.id && el.id.startsWith(SEGMENT_PREFIX))){
    el.style.display = '';
  } else {
    el.style.opacity = '1';
    el.style.visibility = 'visible';
  }
}

export function segOff(id){
  activeSegments.delete(id);
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
  activeSegments.clear();
}

export function render(state){
  if(!document.body || !state) return;
  clearAllSegments();

  if(state.phase === 'attract'){
    renderAttract(state);
    applyText(state.textDisplay);
    return;
  }

  const pos = Math.max(0, Math.min(SEGMENTS.playerPositions.length - 1, Number(state.playerPos || 0)));
  const playerId = SEGMENTS.playerPositions[pos];
  if(playerId) segOn(playerId);

  const bucketPos = Number.isInteger(state.playerPos) ? state.playerPos : null;
  if(state.bucketFilled && bucketPos && bucketPos >= 1 && bucketPos <= 4){
    const id = SEGMENTS.bucketWaterByPos[bucketPos];
    if(id) segOn(id);
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

  segOn(SEGMENTS.toilet);

  if(state.bucketDump && state.bucketDump.active){
    const staticWater = SEGMENTS.staticWater || [];
    const toiletWater = staticWater.find(id => id === 'water-toilet');
    if(toiletWater) segOn(toiletWater);
    if(state.bucketDump.blinkOn){
      const spill = staticWater.find(id => id === 'water');
      if(spill) segOn(spill);
    }
  }

  if(Array.isArray(state.crackWarnings)){
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

function renderAttract(state){
  SEGMENTS.playerPositions.forEach(id => segOn(id));
  SEGMENTS.drops.forEach(col => {
    if(col[0]) segOn(col[0]);
  });
  segOn(SEGMENTS.toilet);
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

export function setDebugVisuals(enabled){
  const svg = document.querySelector('#svg-root svg');
  if(!svg) return;
  const ns = 'http://www.w3.org/2000/svg';
  let layer = svg.querySelector('#' + DEBUG_LAYER_ID);
  if(!enabled){
    if(layer) layer.remove();
    return;
  }
  if(!layer){
    layer = document.createElementNS(ns, 'g');
    layer.setAttribute('id', DEBUG_LAYER_ID);
    layer.setAttribute('pointer-events', 'none');
    svg.appendChild(layer);
  }
  layer.innerHTML = '';
  ALL_SEGMENT_IDS.forEach(id => {
    const source = svg.getElementById ? svg.getElementById(id) : svg.querySelector('#' + cssEscape(id));
    if(!source) return;
    try{
      const outline = source.cloneNode(true);
      outline.removeAttribute('id');
      outline.setAttribute('data-debug-outline', id);
      outline.setAttribute('fill', 'none');
      outline.setAttribute('stroke', 'rgb(0,255,180)');
      outline.setAttribute('stroke-width', '6');
      outline.setAttribute('opacity', '0.65');
      layer.appendChild(outline);
    }catch(err){ /* noop */ }
  });
}

export function setAlignmentGrid(enabled, spacing = 32){
  const svg = document.querySelector('#svg-root svg');
  if(!svg) return;
  const ns = 'http://www.w3.org/2000/svg';
  let grid = svg.querySelector('#' + GRID_LAYER_ID);
  if(!enabled){
    if(grid) grid.remove();
    return;
  }
  if(grid) grid.remove();
  grid = document.createElementNS(ns, 'g');
  grid.setAttribute('id', GRID_LAYER_ID);
  grid.setAttribute('pointer-events', 'none');

  const vb = svg.viewBox && svg.viewBox.baseVal;
  const width = vb && vb.width ? vb.width : (svg.clientWidth || 320);
  const height = vb && vb.height ? vb.height : (svg.clientHeight || 160);

  for(let x = 0; x <= width; x += spacing){
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', x);
    line.setAttribute('y1', 0);
    line.setAttribute('x2', x);
    line.setAttribute('y2', height);
    line.setAttribute('stroke', x % (spacing * 4) === 0 ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.18)');
    line.setAttribute('stroke-width', x % (spacing * 4) === 0 ? '1.2' : '0.6');
    grid.appendChild(line);
  }

  for(let y = 0; y <= height; y += spacing){
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', 0);
    line.setAttribute('y1', y);
    line.setAttribute('x2', width);
    line.setAttribute('y2', y);
    line.setAttribute('stroke', y % (spacing * 4) === 0 ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.18)');
    line.setAttribute('stroke-width', y % (spacing * 4) === 0 ? '1.2' : '0.6');
    grid.appendChild(line);
  }

  svg.appendChild(grid);
}

function cssEscape(id){
  return id.replace(/([\W])/g, '\\$1');
}
