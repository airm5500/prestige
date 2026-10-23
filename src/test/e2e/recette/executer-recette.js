/* CAHIER DE RECETTE : execute, UN PAR UN, les tests d'ecran rattaches aux scenarios (docs/recette/correspondance-tests.json)
 * puis le parcours « ouverture et affichage » de tous les ecrans (recette-ecrans.js). Chaque resultat est ecrit au fur
 * et a mesure dans SORTIE (defaut /tmp/recette-resultats.json) : bilan « n/m », lignes FAIL, duree.
 * Un test deja passe dans SORTIE n'est pas relance (reprise apres coupure). DEJA=test:resultat pour reprendre un
 * resultat obtenu a part (ex. retours/test-saisie-ecrans.js deja execute).
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const RACINE = path.resolve(__dirname, '../../../..');
const E2E = path.join(RACINE, 'src/test/e2e');
const SORTIE = process.env.SORTIE || '/tmp/recette-resultats.json';
const corr = JSON.parse(fs.readFileSync(path.join(RACINE, 'docs/recette/correspondance-tests.json'), 'utf8'));
const tests = [...new Set(Object.keys(corr).filter((k) => k[0] !== '_').flatMap((k) => corr[k].tests || []))];
const res = fs.existsSync(SORTIE) ? JSON.parse(fs.readFileSync(SORTIE, 'utf8')) : {};
const NODE_PATH = [process.env.NODE_PATH, '/opt/node-tools/node_modules'].filter(Boolean).join(':');
for (const t of tests) {
  if (res[t] && res[t].fini) { continue; }
  if (process.env.SAUTER && process.env.SAUTER.split(',').includes(t)) { continue; }
  const t0 = Date.now();
  const r = spawnSync('/opt/node22/bin/node', [path.join(E2E, t)], { cwd: RACINE, env: Object.assign({}, process.env, { NODE_PATH }), encoding: 'utf8', timeout: 1200000, maxBuffer: 64 * 1024 * 1024 });
  const sortie = (r.stdout || '') + (r.stderr || '');
  const bilan = (sortie.match(/^\s*(\d+)\/(\d+)\b.*$/m) || [null])[0];
  const fails = sortie.split('\n').filter((l) => /^FAIL/.test(l)).map((l) => l.slice(0, 300));
  const n = bilan ? bilan.match(/(\d+)\/(\d+)/) : null;
  res[t] = { fini: true, bilan: bilan ? bilan.trim() : (r.error ? 'interrompu : ' + r.error.code : 'pas de bilan (code ' + r.status + ')'),
    ok: !!(n && n[1] === n[2]) && fails.length === 0, fails, secondes: Math.round((Date.now() - t0) / 1000), date: new Date().toISOString() };
  fs.writeFileSync(SORTIE, JSON.stringify(res, null, 1));
  console.log((res[t].ok ? 'PASS' : 'FAIL') + '  ' + t + '  [' + res[t].bilan + ', ' + res[t].secondes + ' s]' + (fails.length ? ' ' + fails.join(' | ').slice(0, 300) : ''));
}
console.log('FIN ' + Object.values(res).filter((x) => x.ok).length + '/' + Object.keys(res).length);
