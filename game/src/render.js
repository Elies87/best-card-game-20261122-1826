// EMBERLANES — all drawing. Canvas 2D, CSS/canvas art only, no images.

import { W, H, ELEMENTS, BEATS, LANES, defOf, abilityText } from './config.js';

// ---- shared layout (main.js hit-tests with the same numbers) ----
export const STRIKE_RECT = { x: 24, y: 612, w: 260, h: 76 };
export const LANE_X = [494, 694, 894];
export const LANE_W = 176;
export const AI_LANE_Y = 108;
export const PL_LANE_Y = 338;
export const LANE_H = 184;
export const HAND_W = 124;
export const HAND_H = 172;
export const HAND_Y = 540;

export function laneRect(isAi, lane) {
  return { x: LANE_X[lane], y: isAi ? AI_LANE_Y : PL_LANE_Y, w: LANE_W, h: LANE_H };
}

export function handCardRect(state, i) {
  const n = state.player.hand.length;
  const overlap = n > 6 ? HAND_W - Math.floor((6 * HAND_W + (n - 6) * 62 - HAND_W) / (n - 1)) : 0;
  const step = n > 6 ? 62 : HAND_W + 10;
  const total = n > 0 ? (n - 1) * step + HAND_W : 0;
  const startX = 308 + Math.floor((948 - total) / 2);
  const raised = state.ui && (state.ui.hoverHand === i || state.selected === i);
  return { x: startX + i * step, y: HAND_Y - (raised ? 22 : 0), w: HAND_W, h: HAND_H, overlap };
}

export function inRect(x, y, r) { return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; }

// ---- small helpers ----
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrap(ctx, text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; }
    else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

function flame(ctx, cx, cy, s, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - s);
  ctx.bezierCurveTo(cx + s * 0.7, cy - s * 0.2, cx + s * 0.45, cy + s * 0.5, cx, cy + s * 0.72);
  ctx.bezierCurveTo(cx - s * 0.45, cy + s * 0.5, cx - s * 0.7, cy - s * 0.2, cx, cy - s);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,240,190,0.85)';
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.25);
  ctx.bezierCurveTo(cx + s * 0.3, cy + s * 0.1, cx + s * 0.2, cy + s * 0.4, cx, cy + s * 0.55);
  ctx.bezierCurveTo(cx - s * 0.2, cy + s * 0.4, cx - s * 0.3, cy + s * 0.1, cx, cy - s * 0.25);
  ctx.fill();
  ctx.restore();
}

function elementGlyph(ctx, glyph, cx, cy, s, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(2, s * 0.14);
  ctx.lineCap = 'round';
  if (glyph === 'flame') { flame(ctx, cx, cy, s * 0.9, color); }
  else if (glyph === 'wave') {
    ctx.beginPath();
    for (let r = 0; r < 2; r++) {
      const yy = cy - s * 0.3 + r * s * 0.55;
      ctx.moveTo(cx - s * 0.8, yy);
      ctx.bezierCurveTo(cx - s * 0.4, yy - s * 0.45, cx, yy + s * 0.45, cx + s * 0.4, yy);
      ctx.bezierCurveTo(cx + s * 0.6, yy - s * 0.3, cx + s * 0.75, yy, cx + s * 0.85, yy);
    }
    ctx.stroke();
  } else if (glyph === 'leaf') {
    ctx.beginPath();
    ctx.moveTo(cx, cy + s * 0.8);
    ctx.bezierCurveTo(cx - s * 0.85, cy + s * 0.1, cx - s * 0.4, cy - s * 0.7, cx + s * 0.1, cy - s * 0.85);
    ctx.bezierCurveTo(cx + s * 0.8, cy - s * 0.2, cx + s * 0.5, cy + s * 0.6, cx, cy + s * 0.8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.moveTo(cx, cy + s * 0.7); ctx.lineTo(cx + s * 0.05, cy - s * 0.6); ctx.stroke();
  } else if (glyph === 'bolt') {
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.25, cy - s * 0.9);
    ctx.lineTo(cx - s * 0.45, cy + s * 0.15);
    ctx.lineTo(cx - s * 0.02, cy + s * 0.15);
    ctx.lineTo(cx - s * 0.25, cy + s * 0.9);
    ctx.lineTo(cx + s * 0.45, cy - s * 0.15);
    ctx.lineTo(cx + s * 0.02, cy - s * 0.15);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// Simple creature silhouettes drawn over the element wash of the art box.
function creatureArt(ctx, art, cx, cy, s, dark) {
  ctx.save();
  ctx.fillStyle = dark;
  ctx.strokeStyle = dark;
  ctx.lineWidth = s * 0.09;
  ctx.lineCap = 'round';
  const circ = (x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
  const ell = (x, y, rx, ry) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); };
  const line = (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
  switch (art) {
    case 'imp': circ(cx, cy + s * 0.1, s * 0.42); line(cx - s * 0.3, cy - s * 0.2, cx - s * 0.55, cy - s * 0.6); line(cx + s * 0.3, cy - s * 0.2, cx + s * 0.55, cy - s * 0.6); break;
    case 'hound': ell(cx - s * 0.05, cy + s * 0.15, s * 0.55, s * 0.3); circ(cx + s * 0.5, cy - s * 0.15, s * 0.26); line(cx - s * 0.55, cy, cx - s * 0.85, cy - s * 0.35); line(cx - s * 0.3, cy + s * 0.4, cx - s * 0.3, cy + s * 0.65); line(cx + s * 0.3, cy + s * 0.4, cx + s * 0.3, cy + s * 0.65); break;
    case 'phoenix': circ(cx, cy + s * 0.25, s * 0.3); ctx.beginPath(); ctx.moveTo(cx - s * 0.15, cy); ctx.quadraticCurveTo(cx - s * 0.9, cy - s * 0.7, cx - s * 0.75, cy + s * 0.1); ctx.quadraticCurveTo(cx - s * 0.4, cy - s * 0.1, cx - s * 0.1, cy + s * 0.2); ctx.fill(); ctx.beginPath(); ctx.moveTo(cx + s * 0.15, cy); ctx.quadraticCurveTo(cx + s * 0.9, cy - s * 0.7, cx + s * 0.75, cy + s * 0.1); ctx.quadraticCurveTo(cx + s * 0.4, cy - s * 0.1, cx + s * 0.1, cy + s * 0.2); ctx.fill(); flame(ctx, cx, cy - s * 0.55, s * 0.3, dark); break;
    case 'golem': rr(ctx, cx - s * 0.45, cy - s * 0.55, s * 0.9, s * 1.05, s * 0.18); ctx.fill(); circ(cx - s * 0.62, cy + s * 0.1, s * 0.16); circ(cx + s * 0.62, cy + s * 0.1, s * 0.16); break;
    case 'crab': ell(cx, cy + s * 0.2, s * 0.5, s * 0.32); circ(cx - s * 0.62, cy - s * 0.25, s * 0.2); circ(cx + s * 0.62, cy - s * 0.25, s * 0.2); line(cx - s * 0.4, cy + s * 0.45, cx - s * 0.6, cy + s * 0.65); line(cx + s * 0.4, cy + s * 0.45, cx + s * 0.6, cy + s * 0.65); break;
    case 'archer': circ(cx, cy - s * 0.45, s * 0.22); line(cx, cy - s * 0.2, cx, cy + s * 0.5); ctx.beginPath(); ctx.arc(cx + s * 0.3, cy, s * 0.5, -1.1, 1.1); ctx.stroke(); line(cx + s * 0.3 + Math.cos(-1.1) * s * 0.5, cy + Math.sin(-1.1) * s * 0.5, cx + s * 0.3 + Math.cos(1.1) * s * 0.5, cy + Math.sin(1.1) * s * 0.5); break;
    case 'serpent': ctx.beginPath(); ctx.moveTo(cx - s * 0.7, cy + s * 0.5); ctx.bezierCurveTo(cx - s * 0.2, cy - s * 0.5, cx + s * 0.2, cy + s * 0.6, cx + s * 0.55, cy - s * 0.2); ctx.lineWidth = s * 0.24; ctx.stroke(); circ(cx + s * 0.6, cy - s * 0.3, s * 0.17); break;
    case 'leviathan': ell(cx, cy + s * 0.1, s * 0.75, s * 0.36); ctx.beginPath(); ctx.moveTo(cx - s * 0.7, cy); ctx.lineTo(cx - s * 1.0, cy - s * 0.4); ctx.lineTo(cx - s * 0.95, cy + s * 0.25); ctx.fill(); circ(cx + s * 0.55, cy - s * 0.05, s * 0.1); break;
    case 'turtle': ctx.beginPath(); ctx.ellipse(cx, cy + s * 0.15, s * 0.55, s * 0.38, 0, Math.PI, 0); ctx.fill(); circ(cx + s * 0.62, cy + s * 0.1, s * 0.18); line(cx - s * 0.4, cy + s * 0.5, cx + s * 0.4, cy + s * 0.5); break;
    case 'stag': circ(cx, cy + s * 0.15, s * 0.3); line(cx - s * 0.2, cy - s * 0.1, cx - s * 0.5, cy - s * 0.6); line(cx - s * 0.5, cy - s * 0.6, cx - s * 0.7, cy - s * 0.45); line(cx - s * 0.5, cy - s * 0.6, cx - s * 0.35, cy - s * 0.8); line(cx + s * 0.2, cy - s * 0.1, cx + s * 0.5, cy - s * 0.6); line(cx + s * 0.5, cy - s * 0.6, cx + s * 0.7, cy - s * 0.45); line(cx + s * 0.5, cy - s * 0.6, cx + s * 0.35, cy - s * 0.8); break;
    case 'ancient': line(cx, cy + s * 0.65, cx, cy - s * 0.1); circ(cx, cy - s * 0.35, s * 0.42); circ(cx - s * 0.35, cy - s * 0.15, s * 0.28); circ(cx + s * 0.35, cy - s * 0.15, s * 0.28); break;
    case 'kite': ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.6); ctx.lineTo(cx + s * 0.55, cy); ctx.lineTo(cx, cy + s * 0.6); ctx.lineTo(cx - s * 0.55, cy); ctx.closePath(); ctx.fill(); line(cx, cy + s * 0.6, cx - s * 0.15, cy + s * 0.9); break;
    case 'fox': ctx.beginPath(); ctx.moveTo(cx - s * 0.5, cy - s * 0.5); ctx.lineTo(cx - s * 0.15, cy - s * 0.1); ctx.lineTo(cx + s * 0.15, cy - s * 0.1); ctx.lineTo(cx + s * 0.5, cy - s * 0.5); ctx.lineTo(cx + s * 0.4, cy + s * 0.3); ctx.lineTo(cx, cy + s * 0.65); ctx.lineTo(cx - s * 0.4, cy + s * 0.3); ctx.closePath(); ctx.fill(); break;
    case 'roc': circ(cx, cy + s * 0.1, s * 0.34); ctx.beginPath(); ctx.moveTo(cx - s * 0.2, cy - s * 0.05); ctx.quadraticCurveTo(cx - s * 1.0, cy - s * 0.6, cx - s * 0.9, cy + s * 0.35); ctx.quadraticCurveTo(cx - s * 0.45, cy + s * 0.05, cx - s * 0.15, cy + s * 0.3); ctx.fill(); ctx.beginPath(); ctx.moveTo(cx + s * 0.2, cy - s * 0.05); ctx.quadraticCurveTo(cx + s * 1.0, cy - s * 0.6, cx + s * 0.9, cy + s * 0.35); ctx.quadraticCurveTo(cx + s * 0.45, cy + s * 0.05, cx + s * 0.15, cy + s * 0.3); ctx.fill(); break;
    default: circ(cx, cy, s * 0.4);
  }
  ctx.restore();
}

// ---- the card ----
export function drawCard(ctx, card, x, y, w, h, opts = {}) {
  const def = defOf(card.defId);
  const el = ELEMENTS[def.element];
  const scale = w / 150;
  ctx.save();
  if (opts.glow) { ctx.shadowColor = el.soft; ctx.shadowBlur = 22; }
  rr(ctx, x, y, w, h, 10 * scale + 4);
  ctx.fillStyle = '#f4ecd9';
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 2;
  ctx.strokeStyle = el.color;
  ctx.stroke();
  ctx.clip();
  // header band
  ctx.fillStyle = el.color;
  ctx.fillRect(x, y, w, h * 0.16);
  // art box
  const artY = y + h * 0.16;
  const artH = h * 0.4;
  const grad = ctx.createLinearGradient(x, artY, x, artY + artH);
  grad.addColorStop(0, el.soft);
  grad.addColorStop(1, el.color);
  ctx.fillStyle = grad;
  ctx.fillRect(x, artY, w, artH);
  creatureArt(ctx, def.art, x + w / 2, artY + artH / 2, Math.min(w, artH) * 0.36, 'rgba(20,16,28,0.78)');
  elementGlyph(ctx, el.glyph, x + w - 16 * scale - 6, artY + 15 * scale + 4, 10 * scale, 'rgba(255,255,255,0.9)');
  ctx.restore();

  ctx.save();
  rr(ctx, x, y, w, h, 10 * scale + 4);
  ctx.clip();
  // cost gem
  ctx.beginPath();
  ctx.arc(x + 15 * scale + 3, y + 15 * scale + 3, 12.5 * scale + 2, 0, Math.PI * 2);
  ctx.fillStyle = '#ffb03a';
  ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = '#7a4a12'; ctx.stroke();
  ctx.fillStyle = '#3a2404';
  ctx.font = `bold ${Math.round(17 * scale + 3)}px Georgia, serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(def.cost), x + 15 * scale + 3, y + 16 * scale + 3);
  // name
  ctx.fillStyle = '#fff7e6';
  ctx.font = `bold ${Math.round(12.5 * scale + 2.5)}px Georgia, serif`;
  ctx.textAlign = 'left';
  const nameLines = wrap(ctx, def.name, w - 40 * scale);
  nameLines.slice(0, 1).forEach((ln, i) => ctx.fillText(ln, x + 31 * scale + 3, y + (15 + i * 13) * scale + 3));
  // ability text
  const ab = abilityText(def);
  if (ab) {
    ctx.fillStyle = '#4a4232';
    ctx.font = `${Math.round(9.5 * scale + 2)}px Georgia, serif`;
    ctx.textAlign = 'center';
    wrap(ctx, ab, w - 14).slice(0, 3).forEach((ln, i) => {
      ctx.fillText(ln, x + w / 2, y + h * 0.62 + i * (11.5 * scale + 2));
    });
  }
  // element tag
  ctx.fillStyle = el.color;
  ctx.font = `bold ${Math.round(9 * scale + 2)}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.fillText(`${el.name.toUpperCase()} · beats ${ELEMENTS[BEATS[def.element]].name}`, x + w / 2, y + h - 26 * scale - 12);
  // attack / health
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.round(19 * scale + 3)}px Georgia, serif`;
  ctx.fillStyle = '#8c2f1b';
  ctx.textAlign = 'left';
  ctx.fillText(`⚔ ${def.atk}`, x + 8, y + h - 13 * scale - 4);
  const hurt = card.hp < def.hp;
  ctx.fillStyle = hurt ? '#c22424' : '#1d6b35';
  ctx.textAlign = 'right';
  ctx.fillText(`${card.hp} ♥`, x + w - 8, y + h - 13 * scale - 4);
  // shield badge
  if (card.shieldUp) {
    ctx.beginPath();
    ctx.arc(x + w - 15 * scale - 3, y + h * 0.16 + 13 * scale, 10 * scale + 2, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd75e'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#7a5c10'; ctx.stroke();
    ctx.fillStyle = '#5c430a';
    ctx.font = `bold ${Math.round(11 * scale + 2)}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.fillText('S', x + w - 15 * scale - 3, y + h * 0.16 + 13 * scale + 1);
  }
  // resting veil
  if (card.sick && !opts.noSick) {
    ctx.fillStyle = 'rgba(24,22,44,0.38)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(230,230,255,0.95)';
    ctx.font = `bold ${Math.round(10.5 * scale + 2)}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.fillText('☾ RESTING — strikes next round', x + w / 2, y + h * 0.16 + 13 * scale);
  }
  ctx.restore();
  if (opts.dim) { ctx.save(); rr(ctx, x, y, w, h, 12); ctx.fillStyle = 'rgba(16,16,30,0.30)'; ctx.fill(); ctx.restore(); }
}

function drawCardBack(ctx, x, y, w, h) {
  ctx.save();
  rr(ctx, x, y, w, h, 7);
  ctx.fillStyle = '#2c2140';
  ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = '#ffb03a'; ctx.stroke();
  rr(ctx, x + 5, y + 5, w - 10, h - 10, 5);
  ctx.strokeStyle = 'rgba(255,176,58,0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();
  flame(ctx, x + w / 2, y + h / 2, Math.min(w, h) * 0.26, '#ffb03a');
  ctx.restore();
}

// ---- panels ----
function hpBar(ctx, x, y, w, hp, max) {
  rr(ctx, x, y, w, 16, 8);
  ctx.fillStyle = '#241d30'; ctx.fill();
  const frac = Math.max(0, Math.min(1, hp / max));
  if (frac > 0) {
    const g = ctx.createLinearGradient(x, y, x + w, y);
    g.addColorStop(0, '#e4572e'); g.addColorStop(1, '#ffb03a');
    rr(ctx, x, y, w * frac, 16, 8);
    ctx.fillStyle = g; ctx.fill();
  }
}

function emberPips(ctx, x, y, ember, maxEmber) {
  for (let i = 0; i < Math.max(maxEmber, 1); i++) {
    ctx.beginPath();
    ctx.arc(x + i * 20 + 8, y + 8, 7, 0, Math.PI * 2);
    ctx.fillStyle = i < ember ? '#ffb03a' : 'rgba(255,176,58,0.22)';
    ctx.fill();
    if (i < ember) flame(ctx, x + i * 20 + 8, y + 8, 5, '#ffdf8a');
  }
}

function sidePanel(ctx, state, side, isAi, y) {
  const x = 24, w = 260, h = 128;
  ctx.save();
  rr(ctx, x, y, w, h, 12);
  ctx.fillStyle = isAi ? 'rgba(46,32,64,0.92)' : 'rgba(24,44,52,0.92)';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = isAi ? '#8b5cf6' : '#57b6f0';
  ctx.stroke();
  // portrait
  ctx.beginPath(); ctx.arc(x + 36, y + 38, 24, 0, Math.PI * 2);
  ctx.fillStyle = isAi ? '#1d1430' : '#0f2c38'; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = isAi ? '#c4a5ff' : '#9adcf5'; ctx.stroke();
  if (isAi) {
    ctx.beginPath(); ctx.arc(x + 36, y + 34, 13, Math.PI, 0); ctx.fillStyle = '#c4a5ff'; ctx.fill();
    ctx.fillStyle = '#efe8ff';
    ctx.fillRect(x + 27, y + 34, 18, 12);
    ctx.fillStyle = '#1d1430';
    ctx.fillRect(x + 30, y + 38, 4, 4); ctx.fillRect(x + 38, y + 38, 4, 4);
  } else {
    flame(ctx, x + 36, y + 36, 13, '#ffb03a');
    ctx.fillStyle = '#9adcf5';
    ctx.fillRect(x + 24, y + 50, 24, 4);
  }
  ctx.fillStyle = '#f5efe0';
  ctx.font = 'bold 16px Georgia, serif';
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(isAi ? 'THE WARDEN' : 'YOU', x + 70, y + 32);
  ctx.font = '11px Georgia, serif';
  ctx.fillStyle = 'rgba(245,239,224,0.75)';
  ctx.fillText(isAi ? 'keeper of the cold lantern' : 'the lantern keeper', x + 70, y + 49);
  // hp
  ctx.font = 'bold 21px Georgia, serif';
  ctx.fillStyle = '#ffb03a';
  ctx.fillText(`${Math.max(0, side.hp)}`, x + 16, y + 88);
  ctx.font = '11px Georgia, serif';
  ctx.fillStyle = 'rgba(245,239,224,0.75)';
  ctx.fillText('flame', x + 44, y + 88);
  hpBar(ctx, x + 82, y + 74, w - 98, Math.max(0, side.hp), 20);
  // ember + counts
  emberPips(ctx, x + 12, y + 98, side.ember, side.maxEmber);
  ctx.font = '11px Georgia, serif';
  ctx.fillStyle = 'rgba(245,239,224,0.8)';
  ctx.textAlign = 'right';
  ctx.fillText(`deck ${side.deck.length} · hand ${side.hand.length}`, x + w - 10, y + 112);
  ctx.textAlign = 'left';
  ctx.restore();
}

function logPanel(ctx, state) {
  const x = 24, y = 168, w = 260, h = 296;
  ctx.save();
  rr(ctx, x, y, w, h, 12);
  ctx.fillStyle = 'rgba(14,16,26,0.88)';
  ctx.fill();
  ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,176,58,0.35)'; ctx.stroke();
  ctx.fillStyle = '#ffb03a';
  ctx.font = 'bold 12px Georgia, serif';
  ctx.fillText('DUEL LOG', x + 14, y + 24);
  ctx.font = '12.5px Georgia, serif';
  let ly = y + 48;
  for (const entry of state.log) {
    ctx.fillStyle = 'rgba(240,236,220,0.92)';
    for (const ln of wrap(ctx, entry, w - 26)) {
      if (ly > y + h - 12) break;
      ctx.fillText(ln, x + 13, ly);
      ly += 16;
    }
    ly += 5;
    if (ly > y + h - 12) break;
  }
  ctx.restore();
}

// ---- screens ----
function drawTable(ctx, state, now) {
  // felt
  const g = ctx.createRadialGradient(640, 360, 120, 640, 360, 760);
  g.addColorStop(0, '#175263');
  g.addColorStop(0.6, '#0f3543');
  g.addColorStop(1, '#081a26');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(255,176,58,0.16)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(782, 330, 500, 268, 0, 0, Math.PI * 2); ctx.stroke();

  sidePanel(ctx, state, state.ai, true, 24);
  logPanel(ctx, state);
  sidePanel(ctx, state, state.player, false, 476);

  // opponent hand (backs)
  const n = state.ai.hand.length;
  const bw = 46, bh = 64, step = 40;
  const startX = 782 - ((n - 1) * step + bw) / 2;
  for (let i = 0; i < n; i++) drawCardBack(ctx, startX + i * step, 26, bw, bh);
  ctx.fillStyle = 'rgba(245,239,224,0.8)';
  ctx.font = '12px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(`the Warden holds ${n} card${n === 1 ? '' : 's'}`, 782, 104);
  ctx.textAlign = 'left';

  // lanes
  for (let lane = 0; lane < LANES; lane++) {
    for (const isAi of [true, false]) {
      const r = laneRect(isAi, lane);
      const occupant = isAi ? state.ai.lanes[lane] : state.player.lanes[lane];
      ctx.save();
      rr(ctx, r.x, r.y, r.w, r.h, 12);
      const legal = !isAi && state.selected >= 0 && !occupant && state.turn === 'player' && !state.busy;
      ctx.fillStyle = legal ? 'rgba(255,176,58,0.20)' : 'rgba(6,14,20,0.45)';
      ctx.fill();
      ctx.setLineDash([6, 5]);
      ctx.lineWidth = legal ? 2.5 : 1.5;
      ctx.strokeStyle = legal ? '#ffb03a' : 'rgba(230,230,240,0.28)';
      ctx.stroke();
      ctx.setLineDash([]);
      if (!occupant) {
        ctx.fillStyle = 'rgba(230,230,240,0.4)';
        ctx.font = '12px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText(legal ? 'click to summon here' : 'empty lane', r.x + r.w / 2, r.y + r.h / 2 + 4);
        ctx.textAlign = 'left';
      }
      ctx.restore();
      if (occupant) {
        drawCard(ctx, occupant, r.x + 14, r.y + 8, r.w - 28, r.h - 16, {});
      }
    }
    // lane arrow in the divider
    const cx = LANE_X[lane] + LANE_W / 2;
    ctx.fillStyle = 'rgba(255,176,58,0.55)';
    ctx.beginPath();
    ctx.moveTo(cx - 7, 322); ctx.lineTo(cx + 7, 322); ctx.lineTo(cx, 332); ctx.closePath(); ctx.fill();
  }

  // divider label
  ctx.fillStyle = '#f5efe0';
  ctx.font = 'bold 15px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(`ROUND ${Math.max(1, state.round)}`, 782, 322);
  ctx.textAlign = 'left';
  // turn status lives in the strip under the STRIKE button, clear of the table
  ctx.font = '12.5px Georgia, serif';
  ctx.fillStyle = state.turn === 'player' ? '#9adcf5' : '#c4a5ff';
  ctx.fillText(state.busy ? 'the duel unfolds…' : state.turn === 'player' ? 'your move — play cards, then STRIKE' : 'the Warden is thinking…', 24, 709);

  // player hand
  const hand = state.player.hand;
  for (let i = hand.length - 1; i >= 0; i--) {
    const r = handCardRect(state, i);
    const card = hand[i];
    const def = defOf(card.defId);
    const afford = def.cost <= state.player.ember;
    drawCard(ctx, card, r.x, r.y, r.w, r.h, {
      noSick: true,
      glow: state.selected === i,
      dim: state.turn !== 'player' || !afford,
    });
    if (state.selected === i) {
      ctx.save();
      rr(ctx, r.x - 3, r.y - 3, r.w + 6, r.h + 6, 13);
      ctx.lineWidth = 3; ctx.strokeStyle = '#ffb03a'; ctx.stroke();
      ctx.restore();
    }
  }
  if (hand.length === 0) {
    ctx.fillStyle = 'rgba(245,239,224,0.65)';
    ctx.font = 'italic 14px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('your hand is empty — strike with what stands', 782, 640);
    ctx.textAlign = 'left';
  }

  // strike button
  const canStrike = state.turn === 'player' && !state.busy && state.screen === 'play';
  ctx.save();
  rr(ctx, STRIKE_RECT.x, STRIKE_RECT.y, STRIKE_RECT.w, STRIKE_RECT.h, 14);
  const bg = ctx.createLinearGradient(0, STRIKE_RECT.y, 0, STRIKE_RECT.y + STRIKE_RECT.h);
  if (canStrike) { bg.addColorStop(0, '#f6a03c'); bg.addColorStop(1, '#d3542a'); }
  else { bg.addColorStop(0, '#4a4038'); bg.addColorStop(1, '#38302a'); }
  ctx.fillStyle = bg; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = canStrike ? '#ffe1a8' : 'rgba(255,255,255,0.2)'; ctx.stroke();
  ctx.fillStyle = canStrike ? '#fff7e6' : 'rgba(255,247,230,0.45)';
  ctx.font = 'bold 25px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('⚔ STRIKE', STRIKE_RECT.x + STRIKE_RECT.w / 2, STRIKE_RECT.y + 40);
  ctx.font = '12px Georgia, serif';
  ctx.fillText('end your turn — your creatures attack', STRIKE_RECT.x + STRIKE_RECT.w / 2, STRIKE_RECT.y + 60);
  ctx.restore();

  // fx floaters
  const nowMs = now || 0;
  state.fx = state.fx.filter((f) => {
    if (!f.t) f.t = nowMs;
    return nowMs - f.t < 950;
  });
  for (const f of state.fx) {
    const age = (nowMs - f.t) / 950;
    let fx, fy;
    if (f.side === 'topHero') { fx = 154; fy = 60; }
    else if (f.side === 'bottomHero') { fx = 154; fy = 512; }
    else {
      const r = laneRect(f.side === 'top', f.lane);
      fx = r.x + r.w / 2; fy = r.y + r.h / 2;
    }
    ctx.save();
    ctx.globalAlpha = 1 - age * age;
    ctx.fillStyle = f.color;
    ctx.font = 'bold 26px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(f.text, fx, fy - age * 34);
    ctx.restore();
  }
}

function drawTitle(ctx, state) {
  const g = ctx.createRadialGradient(640, 330, 100, 640, 360, 780);
  g.addColorStop(0, '#1d3a52');
  g.addColorStop(0.55, '#122433');
  g.addColorStop(1, '#070d16');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // scattered embers
  for (let i = 0; i < 26; i++) {
    const px = (i * 173) % W, py = (i * 269) % H;
    flame(ctx, px, py, 5 + (i % 3) * 2, i % 2 ? 'rgba(255,176,58,0.5)' : 'rgba(87,182,240,0.4)');
  }
  ctx.textAlign = 'center';
  flame(ctx, 640, 92, 34, '#ffb03a');
  ctx.fillStyle = '#ffe9bd';
  ctx.font = 'bold 74px Georgia, serif';
  ctx.fillText('EMBERLANES', 640, 168);
  ctx.fillStyle = 'rgba(245,239,224,0.9)';
  ctx.font = 'italic 21px Georgia, serif';
  ctx.fillText('a duel of embers in three lanes', 640, 204);
  // sample cards
  const samples = [
    { defId: 'cinder-imp', hp: 1, shieldUp: false, sick: false },
    { defId: 'tide-serpent', hp: 4, shieldUp: false, sick: false },
    { defId: 'thunder-roc', hp: 4, shieldUp: false, sick: false },
  ];
  samples.forEach((c, i) => drawCard(ctx, c, 388 + i * 188, 238, 164, 226, { noSick: true }));
  // rules
  ctx.fillStyle = 'rgba(245,239,224,0.92)';
  ctx.font = '16.5px Georgia, serif';
  const rules = [
    'Guard your lantern’s 20 flame. Summon creatures into the three lanes with ember;',
    'each round kindles one more. When you STRIKE, your creatures hit the foe across',
    'their lane — or the enemy lantern itself when the way is clear.',
    'Ember burns Grove · Grove tangles Storm · Storm splits Tide · Tide douses Ember (+1 strike).',
  ];
  rules.forEach((ln, i) => ctx.fillText(ln, 640, 512 + i * 24));
  ctx.fillStyle = '#ffb03a';
  ctx.font = 'bold 22px Georgia, serif';
  ctx.fillText('Click anywhere — or press Enter — to light your lantern', 640, 640);
  ctx.fillStyle = 'rgba(245,239,224,0.6)';
  ctx.font = '13px Georgia, serif';
  ctx.fillText('mouse + keyboard · 1–9 select a card · Q / W / E choose a lane · Enter strikes · M mutes', 640, 676);
  ctx.textAlign = 'left';
}

function drawEnd(ctx, state, now) {
  drawTable(ctx, state, now);
  ctx.fillStyle = 'rgba(5,6,12,0.72)';
  ctx.fillRect(0, 0, W, H);
  const win = state.winner === 'player';
  const pw = 560, ph = win ? 360 : 300;
  const px = (W - pw) / 2, py = (H - ph) / 2;
  ctx.save();
  rr(ctx, px, py, pw, ph, 18);
  ctx.fillStyle = win ? '#1d2f1a' : '#2f1a1d';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = win ? '#7ed491' : '#ff7a6b';
  ctx.stroke();
  ctx.textAlign = 'center';
  flame(ctx, W / 2, py + 62, win ? 26 : 15, win ? '#ffb03a' : 'rgba(255,122,107,0.7)');
  ctx.fillStyle = win ? '#d9f5d0' : '#ffd9d4';
  ctx.font = 'bold 46px Georgia, serif';
  ctx.fillText(win ? 'VICTORY' : 'DEFEAT', W / 2, py + 122);
  ctx.fillStyle = 'rgba(245,239,224,0.9)';
  ctx.font = 'italic 16.5px Georgia, serif';
  ctx.fillText(win ? 'The Warden’s lantern gutters out. Yours burns on.' : 'Your lantern fades to a single coal. The Warden bows.', W / 2, py + 152);
  ctx.font = '17px Georgia, serif';
  let ly = py + 196;
  for (const [label, val] of state.scoreLines) {
    ctx.fillStyle = 'rgba(245,239,224,0.85)';
    ctx.textAlign = 'right';
    ctx.fillText(label, W / 2 - 14, ly);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffb03a';
    ctx.fillText(String(val), W / 2 + 14, ly);
    ly += 27;
  }
  ctx.textAlign = 'center';
  ctx.font = 'bold 25px Georgia, serif';
  ctx.fillStyle = '#ffe9bd';
  ctx.fillText(`SCORE  ${state.score}`, W / 2, ly + 12);
  ctx.font = '15px Georgia, serif';
  ctx.fillStyle = 'rgba(245,239,224,0.75)';
  ctx.fillText('click or press Enter to duel again', W / 2, py + ph - 22);
  ctx.restore();
  ctx.textAlign = 'left';
}

export function draw(ctx, state, now) {
  ctx.clearRect(0, 0, W, H);
  if (state.screen === 'title') drawTitle(ctx, state);
  else if (state.screen === 'win' || state.screen === 'lose') drawEnd(ctx, state, now);
  else drawTable(ctx, state, now);
}
