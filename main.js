import { createInitialState, GamePhase } from './gameState.js';
import { GAME_CONFIG } from './config.js';
import { render, initRender } from './render.js';
import { SEGMENTS } from './segments.js';
import { SVG_READY } from './loadSvg.js';

let state = createInitialState();
let audioCtx = null;

const dom = {
  leftBtn: null,
  rightBtn: null,
  startBtn: null,
  score: null,
  scoreValue: null,
};

const SOUND_PRESETS = {
  'drop-step': { freq: 720, duration: 0.06, type: 'square', gain: 0.035 },
  'bucket-fill': { sequence: [
    { freq: 420, duration: 0.05 },
    { freq: 640, duration: 0.05 },
    { freq: 880, duration: 0.07 },
  ], type: 'triangle', gain: 0.08 },
  'bucket-dump': { sequence: [
    { freq: 640, duration: 0.06 },
    { freq: 520, duration: 0.08 },
  ], type: 'square', gain: 0.09 },
  'drop-miss': { sequence: [
    { freq: 480, duration: 0.08 },
    { freq: 320, duration: 0.09 },
    { freq: 240, duration: 0.1 },
  ], type: 'sawtooth', gain: 0.08 },
  'game-over': { sequence: [
    { freq: 480, duration: 0.09 },
    { freq: 320, duration: 0.11 },
    { freq: 240, duration: 0.12 },
    { freq: 480, duration: 0.08 },
    { freq: 320, duration: 0.1 },
    { freq: 220, duration: 0.15 },
  ], type: 'sawtooth', gain: 0.08 },
  'start-fanfare': { sequence: [
    { freq: 620, duration: 0.08 },
    { freq: 780, duration: 0.08 },
    { freq: 960, duration: 0.12 },
  ], type: 'triangle', gain: 0.08 },
  score: { freq: 950, duration: 0.12, type: 'triangle', gain: 0.08 },
};

function bindUi(){
  cacheDom();
  window.addEventListener('keydown', handleKey, { passive: false });
  dom.leftBtn?.addEventListener('pointerdown', ()=>{ moveLeft(); });
  dom.rightBtn?.addEventListener('pointerdown', ()=>{ moveRight(); });
  dom.startBtn?.addEventListener('click', ()=> requestStartGame());

  updateScoreHud();
}

function cacheDom(){
  dom.leftBtn = document.getElementById('leftBtn');
  dom.rightBtn = document.getElementById('rightBtn');
  dom.startBtn = document.getElementById('startBtn');
  dom.score = document.getElementById('score-display');
  dom.scoreValue = dom.score ? dom.score.querySelector('.score-value') : null;
}

function handleKey(e){
  const key = e.key;
  const isMoveLeft = key === 'ArrowLeft' || key === 'a' || key === 'A';
  const isMoveRight = key === 'ArrowRight' || key === 'd' || key === 'D';
  const isAction = key === ' ' || key === 'Enter';

  if(state.phase === GamePhase.ATTRACT || state.phase === GamePhase.GAME_OVER){
    if(isAction){
      e.preventDefault();
      requestStartGame();
      return;
    }
  }

  if(!canControlPlayer()) return;

  if(isMoveLeft){
    e.preventDefault();
    moveLeft();
  } else if(isMoveRight){
    e.preventDefault();
    moveRight();
  } else if(isAction){
    e.preventDefault();
  }
}

function requestStartGame(){
  if(state.phase === GamePhase.STARTING) return;
  ensureAudioContext();
  const preservedHighScore = state.highScore || 0;
  state = createInitialState();
  state.highScore = preservedHighScore;
  state.phase = GamePhase.STARTING;
  state.startBlink = {
    remaining: GAME_CONFIG.startBlinkCount * 2,
    on: true,
    nextToggle: performance.now() + GAME_CONFIG.startBlinkInterval,
  };
  state.textDisplay = state.textDisplay || { new: true, game: true, over: false };
  setTextDisplay({ new: true, game: true, over: false });
  setStartButtonVisible(false);
  playSound('start-fanfare');
  updateScoreHud();
}

function enterAttractMode(){
  state = createInitialState();
  state.phase = GamePhase.ATTRACT;
  state.attractBlink.nextToggle = performance.now() + GAME_CONFIG.attractBlinkInterval;
  setTextDisplay({ new: false, game: false, over: false });
  setStartButtonVisible(true);
  updateScoreHud();
}

function finalizeGameplayStart(now){
  state.phase = GamePhase.PLAYING;
  state.running = true;
  state.gameOver = false;
  state.bucketFilled = false;
  state.score = 0;
  state.lives = GAME_CONFIG.maxLives;
  state.waterLevel = 0;
  state.drops = [];
  state.bucketDump = { active: false, until: 0, blinkOn: false, nextBlink: 0 };
  state.lastFrameTime = now;
  state.speedFactor = 1;
  state.leaks = GAME_CONFIG.leakTiming.map((cfg) => ({
    col: cfg.col,
    nextSpawnAt: now + 600 + Math.random() * 1200,
    warningUntil: 0,
    nextWarningToggle: 0,
    warningOn: false,
    pendingDrop: false,
    expectedLanding: 0,
    crackHold: false,
    activeDropId: null,
    warningPhase: 'idle',
    warningBlinkRemaining: 0,
  }));
  state.crackWarnings = [false,false,false,false];
  state.maxConcurrentDrops = resolveConcurrentDropLimit();
  state.lastDropCol = null;
  initializeMushroomSchedule();
  setTextDisplay({ new: false, game: false, over: false });
  updateScoreHud();
}

function update(now){
  switch(state.phase){
    case GamePhase.ATTRACT:
      updateAttract();
      break;
    case GamePhase.STARTING:
      updateStarting(now);
      break;
    case GamePhase.PLAYING:
      updatePlaying(now);
      break;
    case GamePhase.GAME_OVER:
      updateGameOver(now);
      break;
    default:
      break;
  }
}

function updateAttract(){
  setTextDisplay({ new: false, game: false, over: false });
}

function updateStarting(now){
  const blink = state.startBlink;
  if(!blink){
    finalizeGameplayStart(now);
    return;
  }
  if(now >= blink.nextToggle){
    blink.on = !blink.on;
    blink.nextToggle = now + GAME_CONFIG.startBlinkInterval;
    blink.remaining -= 1;
    setTextDisplay({ new: blink.on, game: blink.on, over: false });
    if(blink.remaining <= 0){
      state.startBlink = null;
      finalizeGameplayStart(now);
    }
  }
}

function updatePlaying(now){
  state.lastFrameTime = now;
  updateLeakScheduling(now);
  advanceDrops(now);
  handleBucketDump(now);
  updateScoreHud();
}

function updateGameOver(now){
  const blink = state.gameOverBlink;
  if(!blink) return;
  if(now >= blink.nextToggle){
    blink.on = !blink.on;
    blink.nextToggle = now + GAME_CONFIG.gameOverBlinkInterval;
    blink.remaining -= 1;
    setTextDisplay({ game: blink.on, over: blink.on });
    if(blink.remaining <= 0){
      state.gameOverBlink = null;
      setTextDisplay({ game: true, over: true });
    }
  }
}

function updateLeakScheduling(now){
  state.crackWarnings = [false,false,false,false];
  const leaks = shuffledLeaks();
  leaks.forEach((leak) => {
    if(leak.pendingDrop){
      if(leak.warningPhase === 'blink'){
        if(now >= leak.nextWarningToggle){
          leak.warningOn = !leak.warningOn;
          leak.nextWarningToggle = now + GAME_CONFIG.leakWarningBlinkInterval;
          if(!leak.warningOn){
            leak.warningBlinkRemaining = Math.max(0, (leak.warningBlinkRemaining || 0) - 1);
            if(leak.warningBlinkRemaining <= 0){
              leak.warningPhase = 'waiting';
              leak.warningOn = false;
            }
          }
        }
      }
      if(leak.warningPhase === 'waiting'){
        startDropForLeak(leak, now);
      }
    } else if(now >= leak.nextSpawnAt){
      maybeBeginLeakWarning(leak, now);
    }
    const idx = leak.col - 1;
    if(idx >= 0 && idx < state.crackWarnings.length){
      const crackVisible = leak.crackHold || leak.warningOn;
      state.crackWarnings[idx] = crackVisible;
    }
  });
}

function shuffledLeaks(){
  return shuffleArray(state.leaks);
}

function maybeBeginLeakWarning(leak, now){
  if(shouldDeferLeak(leak, now)){
    leak.nextSpawnAt = now + 120;
    return;
  }
  leak.pendingDrop = true;
  leak.warningOn = true;
  leak.warningPhase = 'blink';
  leak.warningBlinkRemaining = GAME_CONFIG.leakWarningBlinkCount || 3;
  leak.nextWarningToggle = now + GAME_CONFIG.leakWarningBlinkInterval;
  leak.crackHold = false;
  leak.activeDropId = null;
}

function extendLeakWarning(leak, now){
  leak.pendingDrop = true;
  leak.warningOn = false;
  leak.warningPhase = 'waiting';
  leak.warningBlinkRemaining = 0;
}

function startDropForLeak(leak, now){
  if(countActiveDrops() >= state.maxConcurrentDrops){
    extendLeakWarning(leak, now);
    return false;
  }
  if(!readyForNextDrop()){
    extendLeakWarning(leak, now);
    return false;
  }
  const drop = createDrop(leak, now);
  state.drops.push(drop);
  leak.pendingDrop = false;
  leak.warningOn = false;
  leak.warningPhase = 'idle';
  leak.warningBlinkRemaining = 0;
  leak.warningUntil = 0;
  leak.nextWarningToggle = 0;
  leak.nextSpawnAt = now + spawnDelayFor(leak, now);
  leak.expectedLanding = drop.expectedLanding;
  leak.crackHold = true;
  leak.activeDropId = drop.id;
  state.lastDropCol = leak.col;
  playSound('drop-step');
  return true;
}

function createDrop(leak, now){
  const duration = stageDuration();
  const remaining = GAME_CONFIG.maxDropStage + 1;
  return {
    id: cryptoRandomId(),
    col: leak.col,
    sourceLeak: leak.col,
    stage: 0,
    active: true,
    nextStageAt: now + duration,
    expectedLanding: now + duration * remaining,
  };
}

function advanceDrops(now){
  for(let i = state.drops.length - 1; i >= 0; i--){
    const drop = state.drops[i];
    if(!drop || !drop.active) continue;
    if(now < drop.nextStageAt) continue;
    drop.stage += 1;
    if(drop.stage > GAME_CONFIG.maxDropStage){
      const hadSimultaneous = countActiveDrops() > 1;
      state.drops.splice(i,1);
      resolveDropLanding(drop, now, hadSimultaneous);
      continue;
    }
    const nextDuration = stageDuration();
    const remaining = GAME_CONFIG.maxDropStage - drop.stage + 1;
    drop.nextStageAt = now + nextDuration;
    drop.expectedLanding = now + nextDuration * remaining;
    playSound('drop-step');
  }
}

function resolveDropLanding(drop, now, clearOthers){
  const leak = state.leaks.find(l => l.col === drop.col);
  const playerAtCol = state.playerPos === drop.col;
  const bucketBusy = state.bucketFilled;
  const caught = playerAtCol && !bucketBusy;
  if(caught){
    state.bucketFilled = true;
    playSound('bucket-fill');
  } else {
    loseLife();
    clearCracksAndDropsAfterMiss();
    playSound('drop-miss');
  }
  if(leak){
    leak.expectedLanding = now;
    leak.pendingDrop = false;
    leak.warningOn = false;
    leak.nextSpawnAt = now + spawnDelayFor(leak, now);
    leak.crackHold = false;
    leak.activeDropId = null;
  }
  state.lastDropCol = drop.col;
  if(clearOthers && !caught) resetActiveDrops();
  bumpSpeed();
}

function countActiveDrops(){
  return state.drops.reduce((count, drop) => (
    drop && drop.active ? count + 1 : count
  ), 0);
}

function resetActiveDrops(){
  state.drops = [];
}

function clearCracksAndDropsAfterMiss(){
  state.drops = [];
  state.leaks.forEach(leak => {
    leak.pendingDrop = false;
    leak.warningOn = false;
    leak.warningUntil = 0;
    leak.nextWarningToggle = 0;
    leak.expectedLanding = 0;
    leak.crackHold = false;
    leak.activeDropId = null;
    leak.warningPhase = 'idle';
    leak.warningBlinkRemaining = 0;
  });
  state.crackWarnings = [false,false,false,false];
  state.lastDropCol = null;
}

function readyForNextDrop(){
  const active = state.drops.filter(drop => drop && drop.active);
  if(active.length === 0) return true;
  if(active.length >= state.maxConcurrentDrops) return false;
  if(state.maxConcurrentDrops <= 1) return false;
  const threshold = GAME_CONFIG.dropStageSpawnThreshold ?? GAME_CONFIG.maxDropStage;
  return active.every(drop => drop.stage >= threshold);
}

function spawnDelayFor(leak, now){
  const cfg = GAME_CONFIG.leakTiming.find(entry => entry.col === leak.col) || {};
  const min = GAME_CONFIG.minLeakInterval || 600;
  const base = cfg.baseInterval ?? min;
  const jitter = cfg.jitter ?? 0;
  let delay = base + (Math.random() * 2 - 1) * jitter;
  delay = Math.max(min, delay);
  const gap = GAME_CONFIG.dropLandingGap || 0;
  if(gap && leak.expectedLanding){
    const earliest = leak.expectedLanding + gap;
    if(now + delay < earliest) delay = Math.max(delay, earliest - now);
  }
  return delay;
}

function shouldDeferLeak(leak, now){
  if(state.lastDropCol == null) return false;
  if(leak.col !== state.lastDropCol) return false;
  return state.leaks.some(other => other !== leak && now >= (other.nextSpawnAt || 0) - 50);
}

function shuffleArray(source){
  const arr = [...(source || [])];
  for(let i = arr.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function loseLife(){
  state.lives = Math.max(0, state.lives - 1);
  const levels = SEGMENTS.waterLevels.length;
  const lost = GAME_CONFIG.maxLives - state.lives;
  state.waterLevel = Math.min(levels, Math.max(0, lost));
  if(state.lives <= 0){
    triggerGameOver();
  }
}

function triggerGameOver(){
  state.phase = GamePhase.GAME_OVER;
  state.running = false;
  state.gameOver = true;
  state.highScore = Math.max(state.highScore || 0, state.score || 0);
  state.gameOverBlink = {
    remaining: GAME_CONFIG.gameOverBlinkCount * 2,
    on: true,
    nextToggle: performance.now() + GAME_CONFIG.gameOverBlinkInterval,
  };
  setTextDisplay({ game: true, over: true });
  setStartButtonVisible(true);
  playSound('game-over');
}

function handleBucketDump(now){
  const dump = state.bucketDump || { active: false };
  state.bucketDump = dump;
  const readyToDump = state.bucketFilled && state.playerPos === 0;
  if(readyToDump){
    state.bucketFilled = false;
    playSound('bucket-dump');
    awardBucketDeposit();
    if(GAME_CONFIG.bucketDumpDuration > 0){
      dump.active = true;
      dump.until = now + GAME_CONFIG.bucketDumpDuration;
      dump.nextBlink = now + GAME_CONFIG.bucketDumpBlinkInterval;
      dump.blinkOn = true;
    } else {
      dump.active = false;
      dump.blinkOn = false;
    }
  }
  if(!dump.active) return;
  if(now >= dump.nextBlink){
    dump.blinkOn = !dump.blinkOn;
    dump.nextBlink = now + GAME_CONFIG.bucketDumpBlinkInterval;
  }
  if(now >= dump.until){
    dump.active = false;
    dump.blinkOn = false;
  }
}

function awardBucketDeposit(){
  state.score += 1;
  updateScoreHud();
  updateMushrooms();
  state.maxConcurrentDrops = resolveConcurrentDropLimit();
  playSound('score');
}

function updateMushrooms(){
  if(!Array.isArray(state.mushroomSchedule)) return;
  const unlocked = new Set(state.mushroomsUnlocked || []);
  let changed = false;
  state.mushroomSchedule.forEach(entry => {
    if(state.score >= entry.score && !unlocked.has(entry.id)){
      unlocked.add(entry.id);
      changed = true;
    }
  });
  if(changed) state.mushroomsUnlocked = Array.from(unlocked);
}

function initializeMushroomSchedule(){
  const ids = shuffleArray(SEGMENTS.mushrooms || []);
  state.mushroomSchedule = [];
  state.mushroomsUnlocked = [];
  if(!ids.length) return;
  const start = GAME_CONFIG.mushroomScoreStart ?? 5;
  const end = Math.max(start, GAME_CONFIG.mushroomScoreEnd ?? 50);
  const jitter = Math.max(0, GAME_CONFIG.mushroomScoreJitter ?? 0);
  const count = ids.length;
  state.mushroomSchedule = ids.map((id, idx) => {
    const ratio = count <= 1 ? 0 : idx / (count - 1);
    let target = Math.round(start + ratio * (end - start));
    if(jitter > 0){
      target += Math.round((Math.random() * 2 - 1) * jitter);
    }
    target = Math.max(start, Math.min(end, target));
    return { id, score: target };
  });
}

function moveLeft(){
  if(!canControlPlayer()) return;
  state.playerPos = Math.max(0, state.playerPos - 1);
}

function moveRight(){
  if(!canControlPlayer()) return;
  state.playerPos = Math.min(SEGMENTS.playerPositions.length - 1, state.playerPos + 1);
}

function updateScoreHud(){
  if(!dom.score) return;
  const showScore = state.phase === GamePhase.PLAYING || state.phase === GamePhase.GAME_OVER;
  dom.score.style.display = showScore ? 'flex' : 'none';
  if(!showScore || !dom.scoreValue) return;
  const raw = Math.max(0, state.score || 0);
  dom.scoreValue.textContent = raw === 0 ? '0' : String(Math.min(999, raw));
}

function setStartButtonVisible(show){
  if(!dom.startBtn) return;
  dom.startBtn.classList.toggle('hidden', !show);
}

function setTextDisplay(values){
  state.textDisplay = state.textDisplay || { new: false, game: false, over: false };
  Object.assign(state.textDisplay, values);
}

function stageDuration(){
  const base = GAME_CONFIG.dropFallTimePerStage / Math.max(0.4, state.speedFactor || 1);
  return Math.max(GAME_CONFIG.dropStageMinTime, base);
}

function bumpSpeed(mult = 1){
  const step = GAME_CONFIG.speedIncreasePerDrop || 0.03;
  const max = GAME_CONFIG.speedFactorMax || 2.5;
  state.speedFactor = Math.min(max, (state.speedFactor || 1) + step * mult);
}

function canControlPlayer(){
  return state.phase === GamePhase.PLAYING || state.phase === GamePhase.STARTING;
}

function resolveConcurrentDropLimit(){
  let max = 1;
  (GAME_CONFIG.concurrentDropByScore || []).forEach(rule => {
    if(state.score >= rule.score) max = Math.max(max, rule.max);
  });
  return max;
}

function cryptoRandomId(){
  if(window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
  return `drop-${Math.random().toString(36).slice(2,9)}`;
}

function loop(now){
  if(!state.lastFrameTime) state.lastFrameTime = now;
  update(now);
  render(state);
  requestAnimationFrame(loop);
}

function ensureAudioContext(){
  if(audioCtx) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if(!Ctx) return;
  audioCtx = new Ctx();
}

function playSound(name){
  const preset = SOUND_PRESETS[name];
  if(!preset) return;
  ensureAudioContext();
  if(!audioCtx) return;
  const startTime = audioCtx.currentTime + 0.01;
  if(preset.sequence){
    let cursor = startTime;
    preset.sequence.forEach(step => {
      createTone(step.freq, step.duration, preset.type || 'square', preset.gain ?? 0.1, cursor);
      cursor += step.duration * 0.85;
    });
  } else {
    createTone(preset.freq, preset.duration, preset.type || 'square', preset.gain ?? 0.1, startTime);
  }
}

function createTone(freq, duration, type, gainValue, startTime){
  if(!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(gainValue, startTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

if(typeof document !== 'undefined'){
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindUi, { once: true });
  else bindUi();

  SVG_READY.then(()=>{
    initRender();
    enterAttractMode();
    requestAnimationFrame(loop);
  }).catch(()=>{
    initRender();
    enterAttractMode();
    requestAnimationFrame(loop);
  });
}
