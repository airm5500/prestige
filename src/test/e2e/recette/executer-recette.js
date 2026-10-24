/* CAHIER DE RECETTE : execute, UN PAR UN, les tests d'ecran rattaches aux scenarios (docs/recette/correspondance-tests.json)
 * puis le parcours « ouverture et affichage » de tous les ecrans (recette-ecrans.js). Chaque resultat est ecrit au fur
 * et a mesure dans SORTIE (defaut /tmp/recette-resultats.json) : bilan « n/m », lignes FAIL, duree.
 * Un test deja passe dans SORTIE n'est pas relance (reprise apres coupure) ; RELANCER=test1,test2 force leur reprise.
 * SAUTER=test1,test2 : tests non lances (resultat obtenu a part, ex. retours/test-saisie-ecrans.js).
 * La sortie complete de chaque test est gardee a cote de SORTIE (un fichier .log par test).
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
  const relancer = (process.env.RELANCER || '').split(',').includes(t);
  if (res[t] && res[t].fini && !relancer) { continue; }
  if (process.env.RELANCER && !relancer) { continue; }
  if (process.env.SAUTER && process.env.SAUTER.split(',').includes(t)) { continue; }
  const t0 = Date.now();
  /* SORTIE est la variable de cet executeur : plusieurs tests l'utilisent pour leur dossier de captures, on ne la leur passe pas */
  const env = Object.assign({}, process.env, { NODE_PATH });
  delete env.SORTIE; delete env.SAUTER;
  const r = spawnSync('/opt/node22/bin/node', [path.join(E2E, t)], { cwd: RACINE, env, encoding: 'utf8', timeout: 1200000, maxBuffer: 64 * 1024 * 1024 });
  const sortie = (r.stdout || '') + (r.stderr || '');
  /* sortie complete de chaque test, pour diagnostiquer un echec */
  fs.writeFileSync(SORTIE.replace(/\.json$/, '') + '-' + t.replace(/[\/]/g, '_') + '.log', sortie);
  /* bilan « 12/12 OK », « 9/10 ECHEC » ou « ===== 12/12 PASS ===== » ; le dernier de la sortie fait foi */
  const bilans = sortie.match(/^[\s=]*\d+\/\d+\b.*$/gm) || [];
  const bilan = bilans.length ? bilans[bilans.length - 1].replace(/=+/g, '').trim() : null;
  const fails = sortie.split('\n').filter((l) => /^FAIL/.test(l)).map((l) => l.slice(0, 300));
  const n = bilan ? bilan.match(/(\d+)\/(\d+)/) : null;
  res[t] = { fini: true, bilan: bilan ? bilan.trim() : (r.error ? 'interrompu : ' + r.error.code : 'pas de bilan (code ' + r.status + ')'),
    ok: (n ? n[1] === n[2] : r.status === 0) && r.status === 0 && fails.length === 0, fails, code: r.status, secondes: Math.round((Date.now() - t0) / 1000), date: new Date().toISOString() };
  fs.writeFileSync(SORTIE, JSON.stringify(res, null, 1));
  console.log((res[t].ok ? 'PASS' : 'FAIL') + '  ' + t + '  [' + res[t].bilan + ', ' + res[t].secondes + ' s]' + (fails.length ? ' ' + fails.join(' | ').slice(0, 300) : ''));
}
console.log('FIN ' + Object.values(res).filter((x) => x.ok).length + '/' + Object.keys(res).length);
