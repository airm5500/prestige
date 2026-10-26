/* DOSSIER DES EDITIONS PDF : data/reports/pdf manquait apres chaque deploiement (constate 4 fois le 26/10 sur les deux
 * Payara du poste). Sans lui, les editions PDF echouent (FileNotFoundException) et la page renvoie du HTML.
 * Prestige cree desormais ce dossier lui-meme au demarrage de l'application.
 * Parcours :
 *  - le dossier est retire, comme apres un deploiement neuf ;
 *  - l'application est redemarree (asadmin disable / enable, sans redeploiement) ;
 *  - le dossier existe de nouveau, et l'edition PDF du tableau RH s'ouvre (%PDF).
 * A la fin, le dossier est toujours la (recree au besoin) : le serveur n'est jamais laisse sans lui.
 * Redemarre l'application : a lancer seul, dans un creneau reserve.
 * Variables : PRESTIGE_APP_DIR (dossier deploye), PAYARA_ASADMIN (commande asadmin), PAYARA_ADMIN_PORT (4848).
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { connexion } = require('../outils/vues');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 220) + ']' : '')); }
const APP = process.env.PRESTIGE_APP_DIR || (ENV_E2E.WINDOWS ? 'D:/payara5/payara5/glassfish/domains/domain1/applications/prestige' : '/opt/payara/glassfish/domains/domain1/applications/prestige');
const ASADMIN = process.env.PAYARA_ASADMIN || (ENV_E2E.WINDOWS ? 'D:/payara5/payara5/bin/asadmin.bat' : 'asadmin');
const PORT = process.env.PAYARA_ADMIN_PORT || '4848';
const DOSSIER = path.join(APP, 'data', 'reports', 'pdf');
const URL = 'http://localhost:8080/prestige/';
const asadmin = (...a) => execFileSync(ASADMIN, ['--port', PORT, ...a], { encoding: 'utf8', shell: ENV_E2E.WINDOWS });

async function attendreApplication() {
  for (let i = 0; i < 120; i++) {
    try { if ((await fetch(URL + 'api/v1/borne-pointage/moi')).status === 401) { return true; } } catch (e) { /* demarrage en cours */ }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}

(async () => {
  let b;
  try {
    ok('Dossier de l\'application trouvé', fs.existsSync(path.join(APP, 'WEB-INF')), APP);
    fs.rmSync(DOSSIER, { recursive: true, force: true });
    ok('Dossier des PDF retiré (comme après un déploiement neuf)', !fs.existsSync(DOSSIER));
    asadmin('disable', 'prestige');
    asadmin('enable', 'prestige');
    ok('Application redémarrée', await attendreApplication());
    ok('Au démarrage, Prestige a recréé data/reports/pdf', fs.existsSync(DOSSIER), DOSSIER);

    b = await ENV_E2E.lancer(chromium);
    const p = await (await b.newContext()).newPage();
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const pdf = await p.evaluate(async () => { const r = await fetch('../api/v1/rh/tableau/pdf?du=2026-09-28&au=2026-10-01'); const t = new Uint8Array(await r.arrayBuffer());
      return r.headers.get('content-type') + '|' + String.fromCharCode(t[0], t[1], t[2], t[3]); });
    ok('Édition PDF du tableau RH : un vrai PDF', /application\/pdf\|%PDF/.test(pdf), pdf);
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    if (b) { await b.close(); }
    if (!fs.existsSync(DOSSIER)) { fs.mkdirSync(DOSSIER, { recursive: true }); }
    ok('Le dossier des PDF est en place à la fin', fs.existsSync(DOSSIER));
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
