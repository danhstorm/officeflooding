// loadSvg.js
// Fetches the external SVG file, inlines it, and builds clipped PNG segments
// so we can toggle LCD elements by id with minimal runtime work.

import { ALL_SEGMENT_IDS } from './segments.js';

const SVG_URL = 'img/flooding_LCD_sheet_mask.svg';
const PNG_TEXTURE_URL = 'img/flooding_LCD_sheet.png';
const XLINK_NS = 'http://www.w3.org/1999/xlink';
const SEGMENT_PREFIX = 'segment-';
const CLIP_PREFIX = 'clip-';
const KEEP_NODE_IDS = new Set(['segment-layer']);

export async function loadAndInlineSvg(targetSelector = '#svg-root'){
  const target = document.querySelector(targetSelector);
  if(!target) throw new Error('SVG target container not found: ' + targetSelector);

  const resp = await fetch(SVG_URL, { cache: 'no-store' });
  if(!resp.ok) throw new Error('Failed loading SVG: ' + resp.statusText);
  const text = await resp.text();
  target.innerHTML = text;

  const svg = target.querySelector('svg');
  if(svg && !svg.id) svg.id = 'lcd-sheet';
  return svg || null;
}

export const SVG_READY = (async ()=>{
  if(typeof document === 'undefined') return null;
  if(document.readyState === 'loading') await new Promise(r=>window.addEventListener('DOMContentLoaded', r));
  const svg = await loadAndInlineSvg().catch(err=>{ throw err; });
  if(svg) enhanceSvg(svg);
  return svg;
})();

function enhanceSvg(svg){
  const ns = svg.namespaceURI || 'http://www.w3.org/2000/svg';
  const defs = ensureDefs(svg, ns);
  const viewBox = getViewBox(svg);

  const segmentLayer = document.createElementNS(ns, 'g');
  segmentLayer.setAttribute('id', 'segment-layer');
  segmentLayer.setAttribute('data-role', 'segments');
  segmentLayer.style.mixBlendMode = 'darken';
  segmentLayer.style.opacity = '0.82';
  segmentLayer.style.filter = 'grayscale(1) brightness(0.3) contrast(1.35)';
  svg.appendChild(segmentLayer);

  const uniqueIds = Array.from(new Set(ALL_SEGMENT_IDS));
  uniqueIds.forEach(id => buildSegment(svg, defs, segmentLayer, id, ns, viewBox));

  hideOriginalSegments(svg, uniqueIds);
  removeOriginalGeometry(svg);
}

function ensureDefs(svg, ns){
  let defs = svg.querySelector('defs');
  if(!defs){
    defs = document.createElementNS(ns, 'defs');
    svg.insertBefore(defs, svg.firstChild);
  }
  return defs;
}

function getViewBox(svg){
  const vb = svg.viewBox && svg.viewBox.baseVal;
  if(vb && vb.width && vb.height){
    return { x: vb.x || 0, y: vb.y || 0, width: vb.width, height: vb.height };
  }
  const width = svg.width && svg.width.baseVal && svg.width.baseVal.value;
  const height = svg.height && svg.height.baseVal && svg.height.baseVal.value;
  return { x: 0, y: 0, width: width || 320, height: height || 160 };
}

function buildSegment(svg, defs, layer, id, ns, viewBox){
  const original = svg.getElementById ? svg.getElementById(id) : svg.querySelector('#' + cssEscape(id));
  if(!original) return;

  const clip = document.createElementNS(ns, 'clipPath');
  clip.setAttribute('id', CLIP_PREFIX + id);
  clip.setAttribute('clipPathUnits', 'userSpaceOnUse');
  const clipContent = cloneForClip(original);
  if(!clipContent) return;
  clip.appendChild(clipContent);
  defs.appendChild(clip);

  const group = document.createElementNS(ns, 'g');
  group.setAttribute('id', SEGMENT_PREFIX + id);
  group.setAttribute('clip-path', `url(#${CLIP_PREFIX + id})`);
  group.setAttribute('data-segment', id);
  group.dataset.segmentGroup = '1';
  group.style.display = 'none';

  const image = createSegmentImage(ns, viewBox);
  group.appendChild(image);
  layer.appendChild(group);

  if(original && original.parentNode){
    original.parentNode.removeChild(original);
  }
}

function cssEscape(id){
  return id.replace(/([\W])/g, '\\$1');
}

const CLIP_SHAPE_TAGS = new Set(['path','polygon','polyline','rect','circle','ellipse','line']);

function cloneForClip(node){
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
  const tag = node.tagName ? node.tagName.toLowerCase() : '';
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
  cleanupClipShape(node);
  Array.from(node.childNodes).forEach(child => child.remove());
}

function stripAttributes(node, attrs){
  attrs.forEach(attr => node.removeAttribute(attr));
}

function cleanupClipShape(node){
  ['id','class','style','clip-path','mask','stroke-width','stroke','fill-opacity','stroke-opacity'].forEach(attr => {
    node.removeAttribute(attr);
  });
  if(!node.getAttribute('fill')) node.setAttribute('fill', '#fff');
}

function createSegmentImage(ns, viewBox){
  const img = document.createElementNS(ns, 'image');
  img.setAttributeNS(XLINK_NS, 'href', PNG_TEXTURE_URL);
  img.setAttribute('href', PNG_TEXTURE_URL);
  img.setAttribute('x', viewBox.x);
  img.setAttribute('y', viewBox.y);
  img.setAttribute('width', viewBox.width);
  img.setAttribute('height', viewBox.height);
  img.setAttribute('preserveAspectRatio', 'none');
  img.setAttribute('loading', 'lazy');
  img.setAttribute('decoding', 'async');
  return img;
}

function hideOriginalSegments(svg, ids){
  ids.forEach(id => {
    const node = svg.getElementById ? svg.getElementById(id) : svg.querySelector('#' + cssEscape(id));
    if(!node) return;
    node.style.visibility = 'hidden';
    node.style.opacity = '0';
    node.style.pointerEvents = 'none';
    node.style.display = 'none';
  });
}

function removeOriginalGeometry(svg){
  const removable = [];
  svg.childNodes.forEach(node => {
    if(node.nodeType !== 1) return;
    const tag = node.tagName ? node.tagName.toLowerCase() : '';
    if(tag === 'defs') return;
    if(node.id && KEEP_NODE_IDS.has(node.id)) return;
    removable.push(node);
  });
  removable.forEach(node => node.remove());
}

// Export prefixes for other modules if needed
export const SEGMENT_GROUP_PREFIX = SEGMENT_PREFIX;
