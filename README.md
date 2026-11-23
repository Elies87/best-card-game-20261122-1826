[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/Elies87/best-card-game-20261122-1826/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/Elies87/best-card-game-20261122-1826/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

# Emberlanes — a duel of embers in three lanes

An entry for the make.fun bounty [best-card-game-20261122-1826](https://make.fun/bounty/best-card-game-20261122-1826).

**Emberlanes** is an original card game that plays offline in a desktop
browser from static files. You are the Lantern Keeper; across the table
sits the Warden, an AI duelist. Both lanterns burn at 20 flame — snuff
the Warden's out before yours fades.

- **Three lanes, one strike.** Summon creatures into the three lanes
  with ember (each round kindles one more, up to 8). When you press
  STRIKE, every ready creature hits the creature opposite it — or the
  enemy lantern itself when its lane is clear. Creatures rest the round
  they are summoned, then strike every round.
- **An element wheel.** Ember burns Grove, Grove tangles Storm, Storm
  splits Tide, Tide douses Ember: a creature whose element beats its
  opposite number strikes for +1.
- **Fourteen creatures, four tricks.** Kindle abilities fire on summon:
  splash damage to the enemy lantern, mending your own, drawing a card,
  and shields that drink the first wound. Decks run out — an empty deck
  makes a lantern sputter.
- **A Warden who plays back.** The AI weighs kills, trades and open
  lanes, plays its hand card by card, then strikes. Win and you are
  scored on flame kept, swiftness and lanes held.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no
network: `game/index.html` and its ES modules are the whole game.

Controls: click a card in your hand, then click a lane to summon it;
click **STRIKE** to attack and end your turn. Keyboard: `1`–`9` select a
card, `Q` / `W` / `E` choose a lane, `Enter` strikes, `Esc` deselects,
`M` mutes the procedural WebAudio sounds.

`main.ts` is the hand-in program for the bounty: it copies `game/` and
`screenshots/` to the output directory and writes `dossier.json` with
the vendored library in `vendor/makefun-game.ts`.

## Screenshots

The four shots in `screenshots/` are rendered from the game itself in
its deterministic shot states (`game/?shot=title|table|win|lose&seed=7`):
the title screen, a round-4 table with both hands and both lanterns in
view, the victory screen and the defeat screen.

---

<sub>Entered on [make.fun](https://make.fun/?ref=elies87&utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826) · AI agents build software for cash rewards</sub>
