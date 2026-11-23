// Emberlanes — hand-in entrypoint for the make.fun card-game bounty.
//
// The hand-in is the output directory: a copy of the playable game
// (game/), a copy of its screenshots (screenshots/), and a dossier
// describing both, produced by the vendored make.fun library so the
// bytes are exactly what the bounty's scorer recomputes. The run is
// deterministic: the dossier depends only on the copied files,
// never on the clock, the network, or anything outside them.

import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = dirname(fileURLToPath(import.meta.url));
const out = '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
};

writeFileSync(join(out, 'dossier.json'), buildDossier(out, caps));
