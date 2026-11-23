// EMBERLANES — game state and rules. Pure logic: no DOM, no canvas.
// main.js owns timing and animation; this module decides what happens.

import {
  START_HP, START_HAND, MAX_EMBER, LANES, HAND_LIMIT,
  BEATS, defOf, deckRecipe, shuffle,
} from './config.js';

let nextUid = 1;

function makeCard(defId) {
  const def = defOf(defId);
  return {
    uid: nextUid++,
    defId,
    hp: def.hp,
    shieldUp: !!(def.ability && def.ability.kind === 'shield'),
    sick: true, // summoned this turn: strikes from next round on
  };
}

function makeSide() {
  return { hp: START_HP, ember: 0, maxEmber: 0, deck: [], hand: [], lanes: Array(LANES).fill(null), fatigue: 0 };
}

export function newGame(rng) {
  nextUid = 1;
  const s = {
    screen: 'title',
    round: 0,
    turn: 'player',
    busy: false,
    player: makeSide(),
    ai: makeSide(),
    log: [],
    selected: -1,
    winner: null,
    score: 0,
    scoreLines: [],
    fx: [],
    rng,
  };
  for (const side of [s.player, s.ai]) {
    side.deck = shuffle(deckRecipe(), rng).map(makeCard);
    for (let i = 0; i < START_HAND; i++) drawOne(s, side);
  }
  return s;
}

export function other(state, side) { return side === state.player ? state.ai : state.player; }
export function sideName(state, side) { return side === state.player ? 'You' : 'The Warden'; }

export function log(state, text) {
  state.log.push(text);
  if (state.log.length > 7) state.log.shift();
}

function drawOne(state, side) {
  if (side.deck.length === 0) {
    side.fatigue += 1;
    side.hp -= side.fatigue;
    log(state, `${sideName(state, side)} grasp at an empty deck — the lantern sputters for ${side.fatigue}.`);
    return null;
  }
  const card = side.deck.pop();
  if (side.hand.length >= HAND_LIMIT) {
    log(state, `${sideName(state, side)} are holding too many cards; ${defOf(card.defId).name} burns away.`);
    return null;
  }
  side.hand.push(card);
  return card;
}

export function drawCards(state, side, n) {
  for (let i = 0; i < n; i++) drawOne(state, side);
}

/** Round start: both sides kindle +1 max ember, refill, and draw. */
export function beginRound(state) {
  state.round += 1;
  for (const side of [state.player, state.ai]) {
    side.maxEmber = Math.min(MAX_EMBER, state.round);
    side.ember = side.maxEmber;
    for (const c of side.lanes) if (c) c.sick = false;
    if (state.round > 1) drawCards(state, side, 1);
  }
  state.turn = 'player';
  state.selected = -1;
  checkEnd(state);
}

export function freeLanes(side) {
  const out = [];
  side.lanes.forEach((c, i) => { if (!c) out.push(i); });
  return out;
}

export function canPlay(state, side, handIdx, lane) {
  const card = side.hand[handIdx];
  if (!card) return false;
  if (side.lanes[lane]) return false;
  return defOf(card.defId).cost <= side.ember;
}

/** Play a card from hand into a lane, firing its Kindle ability. */
export function playCard(state, side, handIdx, lane) {
  const card = side.hand[handIdx];
  const def = defOf(card.defId);
  side.hand.splice(handIdx, 1);
  side.ember -= def.cost;
  side.lanes[lane] = card;
  const foe = other(state, side);
  const a = def.ability;
  if (a) {
    if (a.kind === 'splash') {
      foe.hp -= a.n;
      log(state, `${def.name} kindles: ${a.n} damage to the enemy lantern.`);
    } else if (a.kind === 'mend') {
      side.hp = Math.min(START_HP + 10, side.hp + a.n);
      log(state, `${def.name} kindles: your lantern regains ${a.n} flame.`);
    } else if (a.kind === 'draw') {
      drawCards(state, side, a.n);
      log(state, `${def.name} kindles: draw ${a.n === 1 ? 'a card' : `${a.n} cards`}.`);
    } else if (a.kind === 'shield') {
      log(state, `${def.name} raises its shield.`);
    }
  }
  if (state.selected >= side.hand.length) state.selected = -1;
  checkEnd(state);
  return card;
}

/** Damage a creature, honouring its shield. Returns true if it died. */
function wound(state, ownerSide, lane, dmg, fxSide) {
  const c = ownerSide.lanes[lane];
  if (!c) return false;
  if (c.shieldUp && dmg > 0) {
    c.shieldUp = false;
    state.fx.push({ lane, side: fxSide, text: 'SHIELD', color: '#ffd75e', t: 0 });
    log(state, `${defOf(c.defId).name}'s shield drinks the blow.`);
    return false;
  }
  c.hp -= dmg;
  state.fx.push({ lane, side: fxSide, text: `-${dmg}`, color: '#ff7a6b', t: 0 });
  if (c.hp <= 0) {
    log(state, `${defOf(c.defId).name} is snuffed out.`);
    ownerSide.lanes[lane] = null;
    return true;
  }
  return false;
}

/**
 * The given side strikes: each of its ready creatures hits the creature
 * opposite in its lane (+1 when its element beats the defender's), or
 * the enemy lantern when the lane is clear. Returns event tags for sfx.
 */
export function resolveStrike(state, side) {
  const foe = other(state, side);
  const events = [];
  for (let lane = 0; lane < LANES; lane++) {
    const c = side.lanes[lane];
    if (!c || c.sick) continue;
    const def = defOf(c.defId);
    const target = foe.lanes[lane];
    if (target) {
      const tDef = defOf(target.defId);
      const bonus = BEATS[def.element] === tDef.element ? 1 : 0;
      const dmg = def.atk + bonus;
      events.push(wound(state, foe, lane, dmg, side === state.player ? 'top' : 'bottom') ? 'die' : 'hit');
      if (bonus) log(state, `${def.name}'s ${def.element.toLowerCase()} overwhelms ${tDef.name} (+1).`);
    } else {
      foe.hp -= def.atk;
      state.fx.push({ lane, side: side === state.player ? 'topHero' : 'bottomHero', text: `-${def.atk}`, color: '#ffb03a', t: 0 });
      log(state, `${def.name} strikes the lantern for ${def.atk}.`);
      events.push('lantern');
    }
  }
  if (events.length === 0) log(state, `${sideName(state, side)} have no creature ready to strike.`);
  checkEnd(state);
  return events;
}

export function checkEnd(state) {
  if (state.screen !== 'play' && state.screen !== 'title') return state.winner;
  if (state.player.hp <= 0 && state.ai.hp <= 0) state.winner = 'draw';
  else if (state.ai.hp <= 0) state.winner = 'player';
  else if (state.player.hp <= 0) state.winner = 'ai';
  if (state.winner) {
    state.screen = state.winner === 'player' ? 'win' : 'lose';
    computeScore(state);
  }
  return state.winner;
}

function computeScore(state) {
  const lines = [];
  let score = 0;
  if (state.winner === 'player') {
    const base = 500;
    const flame = Math.max(0, state.player.hp) * 30;
    const speed = Math.max(0, 400 - 40 * (state.round - 1));
    const lanes = state.player.lanes.filter(Boolean).length * 25;
    lines.push(['Victory', base], ['Flame kept', flame], ['Swift duel', speed], ['Lanes held', lanes]);
    score = base + flame + speed + lanes;
  } else {
    const rounds = state.round * 20;
    const damage = Math.max(0, START_HP - state.ai.hp) * 10;
    lines.push(['Rounds endured', rounds], ['Lantern damage dealt', damage]);
    score = rounds + damage;
  }
  state.score = score;
  state.scoreLines = lines;
}

/** Score one candidate AI play; higher is better. */
function aiScorePlay(state, card, lane) {
  const def = defOf(card.defId);
  const foe = state.player;
  const target = foe.lanes[lane];
  let score = def.cost * 2 + def.atk * 1.5 + def.hp;
  if (!target) {
    score += 4; // open lane: free lantern pressure next rounds
    if (state.player.hp <= def.atk + 2) score += 6; // closing in
  } else {
    const tDef = defOf(target.defId);
    const dmg = def.atk + (BEATS[def.element] === tDef.element ? 1 : 0);
    if (dmg >= target.hp) score += 7; // a kill
    if (tDef.atk >= card.hp && !card.shieldUp) score -= 3; // it dies on the return strike
    if (def.hp > tDef.atk) score += 2; // survives the exchange
  }
  if (def.ability && def.ability.kind === 'draw') score += 2;
  if (def.ability && def.ability.kind === 'mend' && state.ai.hp <= 10) score += 3;
  return score;
}

/** Play the AI's single best affordable card. Returns false when done. */
export function aiPlayOne(state) {
  const side = state.ai;
  const lanes = freeLanes(side);
  if (lanes.length === 0) return false;
  let best = null;
  side.hand.forEach((card, handIdx) => {
    const def = defOf(card.defId);
    if (def.cost > side.ember) return;
    for (const lane of lanes) {
      const s = aiScorePlay(state, card, lane);
      if (!best || s > best.s) best = { handIdx, lane, s };
    }
  });
  if (!best) return false;
  const card = side.hand[best.handIdx];
  log(state, `The Warden summons ${defOf(card.defId).name}.`);
  playCard(state, side, best.handIdx, best.lane);
  return true;
}
