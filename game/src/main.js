// EMBERLANES — entry point: input, turn flow, the Warden's pacing,
// and the deterministic ?shot= states the screenshots are taken from.

import { mulberry32, defOf } from './config.js';
import {
  newGame, beginRound, playCard, canPlay, resolveStrike, aiPlayOne, log,
} from './state.js';
import { draw, laneRect, handCardRect, inRect, STRIKE_RECT } from './render.js';
import { sfx, toggleMute } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') ?? 7) || 7;

let state = newGame(mulberry32(seed));
state.ui = { mouseX: -1, mouseY: -1, hoverHand: -1 };

function announce(text) { if (status) status.textContent = text; }

function startDuel() {
  state = newGame(mulberry32((Math.random() * 1e9) | 0));
  state.ui = { mouseX: -1, mouseY: -1, hoverHand: -1 };
  state.screen = 'play';
  beginRound(state);
  log(state, 'The duel begins. Your lantern burns at 20 flame.');
  log(state, 'Summon a creature, then STRIKE.');
  announce('The duel begins. Your move.');
}

// ---- player actions ----
function tryPlay(handIdx, lane) {
  if (state.screen !== 'play' || state.busy || state.turn !== 'player') return;
  if (!canPlay(state, state.player, handIdx, lane)) { sfx.error(); return; }
  const card = playCard(state, state.player, handIdx, lane);
  state.selected = -1;
  sfx.play();
  announce(`You summon ${defOf(card.defId).name} in lane ${lane + 1}.`);
  if (state.winner) { sfx.win(); return; }
}

function playerStrike() {
  if (state.screen !== 'play' || state.busy || state.turn !== 'player') return;
  state.busy = true;
  state.selected = -1;
  const events = resolveStrike(state, state.player);
  if (events.includes('lantern')) sfx.lanternHit();
  else if (events.includes('die')) sfx.die();
  else if (events.length) sfx.hit();
  announce('Your creatures strike.');
  setTimeout(() => {
    if (state.winner) { state.busy = false; sfx.win(); announce('Victory!'); return; }
    state.turn = 'ai';
    state.busy = false;
    wardenTurn();
  }, 650);
}

function wardenTurn() {
  if (state.winner) return;
  state.busy = true;
  sfx.turn();
  announce('The Warden is thinking.');
  const step = () => {
    if (state.winner) { state.busy = false; sfx.lose(); return; }
    let played = false;
    try { played = aiPlayOne(state); } catch { played = false; }
    if (played) {
      sfx.play();
      setTimeout(step, 520);
      return;
    }
    // the Warden strikes
    setTimeout(() => {
      const events = resolveStrike(state, state.ai);
      if (events.includes('lantern')) sfx.lanternHit();
      else if (events.includes('die')) sfx.die();
      else if (events.length) sfx.hit();
      announce('The Warden’s creatures strike.');
      setTimeout(() => {
        state.busy = false;
        if (state.winner) { sfx.lose(); announce('Defeat.'); return; }
        beginRound(state);
        log(state, `Round ${state.round}. Your lantern: ${state.player.hp} flame.`);
        sfx.draw();
        announce(`Round ${state.round}. Your move.`);
      }, 650);
    }, 420);
  };
  setTimeout(step, 550);
}

// ---- input ----
function canvasPos(evt) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (evt.clientX - r.left) * (canvas.width / r.width),
    y: (evt.clientY - r.top) * (canvas.height / r.height),
  };
}

canvas.addEventListener('mousemove', (evt) => {
  const p = canvasPos(evt);
  state.ui.mouseX = p.x; state.ui.mouseY = p.y;
  state.ui.hoverHand = -1;
  if (state.screen === 'play') {
    for (let i = 0; i < state.player.hand.length; i++) {
      if (inRect(p.x, p.y, handCardRect(state, i))) state.ui.hoverHand = i;
    }
  }
});

canvas.addEventListener('click', (evt) => {
  const p = canvasPos(evt);
  if (state.screen === 'title') { startDuel(); sfx.turn(); return; }
  if (state.screen === 'win' || state.screen === 'lose') { startDuel(); return; }
  if (state.busy || state.turn !== 'player') return;
  if (inRect(p.x, p.y, STRIKE_RECT)) { playerStrike(); return; }
  // hand selection
  for (let i = state.player.hand.length - 1; i >= 0; i--) {
    if (inRect(p.x, p.y, handCardRect(state, i))) {
      if (state.selected === i) state.selected = -1;
      else {
        const def = defOf(state.player.hand[i].defId);
        if (def.cost > state.player.ember) { sfx.error(); announce(`${def.name} costs ${def.cost} ember — not enough flame.`); return; }
        state.selected = i;
        sfx.select();
        announce(`${def.name} selected. Click a lane to summon it.`);
      }
      return;
    }
  }
  // lane placement
  if (state.selected >= 0) {
    for (let lane = 0; lane < 3; lane++) {
      if (inRect(p.x, p.y, laneRect(false, lane))) { tryPlay(state.selected, lane); return; }
    }
    state.selected = -1;
  }
});

window.addEventListener('keydown', (evt) => {
  const k = evt.key.toLowerCase();
  if (k === 'm') { toggleMute(); return; }
  if (state.screen === 'title' || state.screen === 'win' || state.screen === 'lose') {
    if (k === 'enter' || k === ' ') { evt.preventDefault(); startDuel(); }
    return;
  }
  if (state.busy || state.turn !== 'player') return;
  if (k === 'enter' || k === ' ') { evt.preventDefault(); playerStrike(); return; }
  if (k === 'escape') { state.selected = -1; return; }
  const num = Number(k);
  if (num >= 1 && num <= state.player.hand.length) {
    const def = defOf(state.player.hand[num - 1].defId);
    if (def.cost > state.player.ember) { sfx.error(); return; }
    state.selected = num - 1;
    sfx.select();
    return;
  }
  const laneKeys = { q: 0, w: 1, e: 2 };
  if (k in laneKeys && state.selected >= 0) tryPlay(state.selected, laneKeys[k]);
});

// ---- shot mode: deterministic states for the screenshots ----
function scriptedCard(defId, hpOverride, opts = {}) {
  const def = defOf(defId);
  return {
    uid: 900 + scriptedCard.n++,
    defId,
    hp: hpOverride ?? def.hp,
    shieldUp: opts.shield ?? (def.ability && def.ability.kind === 'shield' ? true : false),
    sick: opts.sick ?? false,
  };
}
scriptedCard.n = 0;

function setupShot(name) {
  state = newGame(mulberry32(seed));
  state.ui = { mouseX: -1, mouseY: -1, hoverHand: -1 };
  if (name === 'title') { state.screen = 'title'; return; }
  state.screen = 'play';
  state.round = 4;
  state.player.maxEmber = 5; state.player.ember = 4;
  state.ai.maxEmber = 5; state.ai.ember = 1;
  state.player.hp = 14;
  state.ai.hp = 16;
  state.ai.lanes[0] = scriptedCard('tide-serpent', 3);
  state.ai.lanes[1] = scriptedCard('storm-kite', 1);
  state.ai.lanes[2] = null;
  state.player.lanes[0] = scriptedCard('ash-hound', 2);
  state.player.lanes[1] = null;
  state.player.lanes[2] = scriptedCard('coral-crab', 4);
  state.player.hand = [
    scriptedCard('pyre-phoenix'),
    scriptedCard('mossback'),
    scriptedCard('volt-fox'),
    scriptedCard('cinder-imp'),
  ];
  state.ai.hand = [scriptedCard('ash-hound'), scriptedCard('mossback'), scriptedCard('storm-kite'), scriptedCard('grove-ancient'), scriptedCard('cinder-imp')];
  state.player.deck = Array.from({ length: 11 }, () => scriptedCard('cinder-imp'));
  state.ai.deck = Array.from({ length: 9 }, () => scriptedCard('cinder-imp'));
  state.selected = 0;
  state.log = [
    'The duel begins. Your lantern burns at 20 flame.',
    'The Warden summons Tide Serpent.',
    'Ash Hound strikes the lantern for 3.',
    'The Warden summons Storm Kite.',
    'Coral Crab raises its shield.',
    'Round 4. Your lantern: 14 flame.',
  ];
  if (name === 'win') {
    state.ai.hp = 0;
    state.player.hp = 11;
    state.round = 7;
    state.winner = 'player';
    state.screen = 'win';
    state.score = 500 + 11 * 30 + Math.max(0, 400 - 40 * 6) + 2 * 25;
    state.scoreLines = [['Victory', 500], ['Flame kept', 330], ['Swift duel', 160], ['Lanes held', 50]];
    state.score = 1040;
    state.selected = -1;
  }
  if (name === 'lose') {
    state.player.hp = 0;
    state.ai.hp = 6;
    state.round = 8;
    state.winner = 'ai';
    state.screen = 'lose';
    state.scoreLines = [['Rounds endured', 160], ['Lantern damage dealt', 140]];
    state.score = 300;
    state.selected = -1;
  }
}

if (shot) setupShot(shot);

// Test hook: lets the Playwright play-test drive the same clicks a
// player would and read back the resulting state.
window.__emberlanes = {
  get state() { return state; },
  startDuel,
  handCardRect,
  laneRect,
  STRIKE_RECT,
};

function frame(now) {
  draw(ctx, state, now);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
