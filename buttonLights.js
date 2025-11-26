// buttonLights.js
// Creates a masked overlay for physical console buttons using console_buttons.png
// and exposes helpers to pulse those lights when inputs fire.

const BUTTON_IDS = ['left', 'right', 'game', 'time', 'alarm'];
const MASK_SOURCE = 'img/flooding_LCD_sheet_mask.svg';
const BUTTON_TEXTURE = 'img/console_buttons.png';
const NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';
const CLIP_SHAPE_TAGS = new Set(['path','polygon','polyline','rect','circle','ellipse','line']);

const lights = new Map();

function escapeSelector(id){
  if(typeof CSS !== 'undefined' && typeof CSS.escape === 'function'){
    return CSS.escape(id);
  }
  return String(id).replace(/([\0-\x1f\x7f-\x9f!"#$%&'()*+,./:;<=>?@\[\]^`{|}~])/g, '\\$1');
}

function findButtonSource(svg, id){
  if(!svg) return null;
  const canQuery = typeof svg.querySelector === 'function';
  if(canQuery){
    const escaped = escapeSelector(id);
    const byData = svg.querySelector(`[data-name="${escaped}"]`);
    if(byData) return byData;
  }
  if(typeof svg.getElementById === 'function'){
    const byId = svg.getElementById(id);
    if(byId) return byId;
  }
  if(canQuery){
    const escaped = escapeSelector(id);
    return svg.querySelector(`#${escaped}`);
  }
  return null;
}

async function loadMaskDocument(){
  const resp = await fetch(MASK_SOURCE, { cache: 'no-store' });
  if(!resp.ok) throw new Error(`Failed to load button mask SVG: ${resp.status}`);
  const text = await resp.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'image/svg+xml');
  const svg = doc.documentElement && doc.documentElement.tagName.toLowerCase() === 'svg'
    ? doc.documentElement
    : doc.querySelector('svg');
  if(!svg) throw new Error('Mask SVG missing root <svg>');
  return svg;
}

function getViewBox(svg){
  const vb = svg.viewBox && svg.viewBox.baseVal;
  if(vb && vb.width && vb.height){
    return { x: vb.x || 0, y: vb.y || 0, width: vb.width, height: vb.height };
  }
  const width = svg.width && svg.width.baseVal && svg.width.baseVal.value;
  const height = svg.height && svg.height.baseVal && svg.height.baseVal.value;
  return { x: 0, y: 0, width: width || 3427, height: height || 2262 };
}

function cloneForClip(node){
  if(!node) return null;
  const clone = node.cloneNode(true);
  sanitizeClipTree(clone);
  if(clone.nodeType !== 1) return null;
  return clone;
}

function sanitizeClipTree(node){
  if(node.nodeType !== 1){
    node.remove();
    return;
  }
  const tag = (node.tagName || '').toLowerCase();
  if(tag === 'g'){
    stripAttributes(node, ['id','class','style','clip-path','mask','stroke','fill','opacity']);
    Array.from(node.childNodes).forEach(child => sanitizeClipTree(child));
    if(!node.childNodes.length) node.remove();
    return;
  }
  if(!CLIP_SHAPE_TAGS.has(tag)){
    node.remove();
    return;
  }
  stripAttributes(node, ['id','class','style','clip-path','mask','stroke','stroke-width','stroke-opacity','fill-opacity']);
  if(!node.getAttribute('fill')) node.setAttribute('fill', '#fff');
  Array.from(node.childNodes).forEach(child => child.remove());
}

function stripAttributes(node, attrs){
  attrs.forEach(attr => node.removeAttribute(attr));
}

function createButtonOverlay(svg, container){
  const viewBox = getViewBox(svg);
  const overlay = document.createElementNS(NS, 'svg');
  overlay.setAttribute('viewBox', `0 0 ${viewBox.width} ${viewBox.height}`);
  overlay.setAttribute('preserveAspectRatio', 'none');
  overlay.setAttribute('aria-hidden', 'true');
  overlay.classList.add('button-lights-svg');
  const defs = document.createElementNS(NS, 'defs');
  overlay.appendChild(defs);

  BUTTON_IDS.forEach(id => {
    const sourceNode = findButtonSource(svg, id);
    if(!sourceNode) return;
    const clip = document.createElementNS(NS, 'clipPath');
    clip.setAttribute('id', `button-clip-${id}`);
    clip.setAttribute('clipPathUnits', 'userSpaceOnUse');
    const clipShape = cloneForClip(sourceNode);
    if(!clipShape) return;
    clip.appendChild(clipShape);
    defs.appendChild(clip);

    const image = document.createElementNS(NS, 'image');
    image.setAttributeNS(XLINK_NS, 'href', BUTTON_TEXTURE);
    image.setAttribute('href', BUTTON_TEXTURE);
    image.setAttribute('x', viewBox.x);
    image.setAttribute('y', viewBox.y);
    image.setAttribute('width', viewBox.width);
    image.setAttribute('height', viewBox.height);
    image.setAttribute('preserveAspectRatio', 'none');
    image.setAttribute('clip-path', `url(#button-clip-${id})`);
    image.dataset.buttonLight = id;
    overlay.appendChild(image);
    lights.set(id, image);
  });

  container.appendChild(overlay);
  return overlay;
}

async function initButtonLights(){
  if(typeof document === 'undefined') return null;
  const container = document.getElementById('button-lights');
  if(!container) return null;
  const svg = await loadMaskDocument();
  return createButtonOverlay(svg, container);
}

export const BUTTON_LIGHTS_READY = initButtonLights();

export function setButtonLight(id, on){
  const node = lights.get(id);
  if(!node) return;
  node.classList.toggle('is-active', !!on);
}

export function pulseButtonLight(id, duration = 140){
  setButtonLight(id, true);
  window.setTimeout(() => setButtonLight(id, false), duration);
}