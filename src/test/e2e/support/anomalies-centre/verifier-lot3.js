/* LOT 3 et S3 DU RAPPORT ANOMALIES_CENTRE_SUPPORT_2026-10-26 : verification apres deploiement, en lecture seule par
 * l'API du centre de support (compte e2e-sa).
 *  - SC8 : les evenements survenus depuis DEPUIS (horodatage ISO, par defaut l'heure de lancement moins 30 min) portent
 *    la version du build (versionApp, colonne version_app de la migration V7.2.25) ;
 *  - S3 : le diagnostic du pool rend un nombre de connexions dormantes (>= 0) : la nouvelle requete passe sur MariaDB
 *    (-1 si elle echouait).
 * node support/anomalies-centre/verifier-lot3.js   (BASE=http://localhost:9080/prestige ; DEPUIS=2026-10-29T00:00)
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../../outils/poste');
const { connexion } = require('../../outils/vues');

const res = [];
function ok(n, c, d) { res.push(!!c); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage();
  try {
    await connexion(p, ENV_E2E.LOGIN_SUPPORT, 'e2etest');
    const lire = (u) => p.evaluate(async (x) => { const r = await fetch(x); return { statut: r.status, corps: await r.text() }; }, u);
    const ev = await lire('../api/v1/support/events?start=0&limit=300');
    const data = (JSON.parse(ev.corps).data || []);
    ok('SC8 : le journal rend le champ versionApp', ev.statut === 200 && data.length > 0 && data.some((e) => 'versionApp' in e), ev.statut + ' ' + Object.keys(data[0] || {}).join(','));
    const depuis = process.env.DEPUIS ? new Date(process.env.DEPUIS) : new Date(Date.now() - 30 * 60000);
    const quand = (e) => new Date(e.lastSeenAt || e.lastSeen || e.dtUpdated || e.updatedAt || e.lastOccurrence || 0);
    const recents = data.filter((e) => quand(e) >= depuis);
    console.log('evenements depuis ' + depuis.toISOString() + ' : ' + recents.length);
    recents.slice(0, 8).forEach((e) => console.log('   ' + [e.code || e.type, quand(e).toISOString(), JSON.stringify(e.versionApp)].join(' | ')));
    ok('SC8 : les événements récents portent la version du build', recents.length > 0 && recents.every((e) => /^\d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC$/.test(e.versionApp || '')),
      recents.map((e) => e.versionApp).join(','));
    const pool = await lire('../api/v1/support/diagnostic/pool');
    const m = (JSON.parse(pool.corps).data) || {};
    console.log('pool : ' + JSON.stringify(m).slice(0, 400));
    const dorm = Object.keys(m).filter((k) => /dormant/i.test(k)).map((k) => k + '=' + m[k]);
    ok('S3 : la requête des connexions dormantes passe sur MariaDB', pool.statut === 200 && Object.keys(m).some((k) => /^dormantes$/i.test(k) && Number(m[k]) >= 0), dorm.join(' '));
  } finally {
    await b.close();
    const echecs = res.filter((x) => !x).length;
    console.log('\n' + (res.length - echecs) + '/' + res.length + ' PASS');
    process.exit(echecs ? 1 : 0);
  }
})();
