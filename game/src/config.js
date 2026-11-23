// EMBERLANES — card definitions and tuning.
//
// An original three-lane card duel. Both duelists guard a lantern of 20
// flame. Each round you kindle one more ember of mana, draw, and summon
// creatures into the three lanes. When a side strikes, every creature
// hits whatever stands opposite it in its lane — or the enemy lantern
// when the lane is clear. The element wheel grants +1 strike when your
// creature's element beats the defender's:
//
//   EMBER beats GROVE, GROVE beats STORM, STORM beats TIDE, TIDE beats EMBER

export const W = 1280;
export const H = 720;

export const START_HP = 20;
export const START_HAND = 4;
export const MAX_EMBER = 8;
export const LANES = 3;
export const HAND_LIMIT = 9;

export const ELEMENTS = {
  EMBER: { name: 'Ember', color: '#e4572e', soft: '#f6a03c', glyph: 'flame' },
  TIDE: { name: 'Tide', color: '#2e7de4', soft: '#57b6f0', glyph: 'wave' },
  GROVE: { name: 'Grove', color: '#3da35d', soft: '#7ed491', glyph: 'leaf' },
  STORM: { name: 'Storm', color: '#8b5cf6', soft: '#c4a5ff', glyph: 'bolt' },
};

// BEATS[x] is the element that x strikes with +1 power.
export const BEATS = { EMBER: 'GROVE', GROVE: 'STORM', STORM: 'TIDE', TIDE: 'EMBER' };

// ability: null, or { kind: 'splash'|'mend'|'draw'|'shield', n }
//   splash n — when summoned, deal n damage to the enemy lantern
//   mend n   — when summoned, restore n flame to your lantern
//   draw n   — when summoned, draw n cards
//   shield   — ignores the first damage it would take (shield flag on card)
export const CARD_DEFS = [
  { id: 'cinder-imp', name: 'Cinder Imp', element: 'EMBER', cost: 1, atk: 2, hp: 1, ability: null, art: 'imp' },
  { id: 'ash-hound', name: 'Ash Hound', element: 'EMBER', cost: 2, atk: 3, hp: 2, ability: null, art: 'hound' },
  { id: 'pyre-phoenix', name: 'Pyre Phoenix', element: 'EMBER', cost: 4, atk: 4, hp: 3, ability: { kind: 'splash', n: 1 }, art: 'phoenix' },
  { id: 'magma-golem', name: 'Magma Golem', element: 'EMBER', cost: 5, atk: 5, hp: 4, ability: { kind: 'shield' }, art: 'golem' },
  { id: 'coral-crab', name: 'Coral Crab', element: 'TIDE', cost: 2, atk: 1, hp: 4, ability: { kind: 'shield' }, art: 'crab' },
  { id: 'mist-archer', name: 'Mist Archer', element: 'TIDE', cost: 3, atk: 3, hp: 2, ability: { kind: 'splash', n: 1 }, art: 'archer' },
  { id: 'tide-serpent', name: 'Tide Serpent', element: 'TIDE', cost: 3, atk: 3, hp: 4, ability: null, art: 'serpent' },
  { id: 'deep-leviathan', name: 'Deep Leviathan', element: 'TIDE', cost: 6, atk: 6, hp: 6, ability: null, art: 'leviathan' },
  { id: 'mossback', name: 'Mossback', element: 'GROVE', cost: 2, atk: 1, hp: 5, ability: null, art: 'turtle' },
  { id: 'thorn-stag', name: 'Thorn Stag', element: 'GROVE', cost: 3, atk: 3, hp: 3, ability: { kind: 'mend', n: 2 }, art: 'stag' },
  { id: 'grove-ancient', name: 'Grove Ancient', element: 'GROVE', cost: 5, atk: 4, hp: 6, ability: { kind: 'mend', n: 2 }, art: 'ancient' },
  { id: 'storm-kite', name: 'Storm Kite', element: 'STORM', cost: 2, atk: 3, hp: 1, ability: null, art: 'kite' },
  { id: 'volt-fox', name: 'Volt Fox', element: 'STORM', cost: 3, atk: 2, hp: 3, ability: { kind: 'draw', n: 1 }, art: 'fox' },
  { id: 'thunder-roc', name: 'Thunder Roc', element: 'STORM', cost: 4, atk: 4, hp: 4, ability: { kind: 'splash', n: 1 }, art: 'roc' },
];

const DEF_BY_ID = new Map(CARD_DEFS.map((d) => [d.id, d]));
export function defOf(id) { return DEF_BY_ID.get(id); }

// Two copies of everything except the two biggest bodies: 24-card decks.
export function deckRecipe() {
  const ids = [];
  for (const d of CARD_DEFS) {
    ids.push(d.id);
    if (d.cost <= 5) ids.push(d.id);
  }
  return ids;
}

export function abilityText(def) {
  const a = def.ability;
  if (!a) return '';
  if (a.kind === 'splash') return `Kindle: deal ${a.n} to the enemy lantern`;
  if (a.kind === 'mend') return `Kindle: restore ${a.n} flame to yours`;
  if (a.kind === 'draw') return 'Kindle: draw a card';
  if (a.kind === 'shield') return 'Shield: ignores its first wound';
  return '';
}

/** Deterministic RNG for shot mode and tests (mulberry32). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(list, rng) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
