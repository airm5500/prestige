/* TICKET Z : rapidite du recapitulatif.
 *  - le recapitulatif des 24 derniers jours (tous les mouvements, tous les caissiers) repond en moins de 5 s : chaque
 *    vente chargee tirait une a une ses associations (reglement, client, ayant droit...), 30 s sur une base reelle ;
 *  - meme limite pour « Ventes uniquement ».
 * Le test ne pose aucune donnee : il lit le ticket Z de la periode.
 */
const ENV_E2E = require('../outils/poste');
const http = require('http');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 220) + ']' : '')); }
const LIMITE_MS = 5000;

function appel(chemin, corps, cookie) {
  return new Promise((ok_, ko) => {
    const donnees = JSON.stringify(corps);
    const r = http.request({ host: 'localhost', port: 8080, path: '/prestige/api/v1/' + chemin, method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(donnees) }, cookie ? { Cookie: cookie } : {}) },
    (rep) => { let t = ''; rep.on('data', (c) => { t += c; }); rep.on('end', () => ok_({ corps: t, cookie: (rep.headers['set-cookie'] || []).map((c) => c.split(';')[0]).join('; ') })); });
    r.on('error', ko); r.end(donnees);
  });
}
const jour = (decalage) => { const d = new Date(); d.setDate(d.getDate() + decalage); return d.toISOString().slice(0, 10); };

(async () => {
  try {
    const cnx = await appel('user/auth', { login: ENV_E2E.LOGIN, password: 'e2etest' });
    ok('Connexion du compte d\'essai', /"success"\s*:\s*true|lg_EMPLACEMENT_ID/.test(cnx.corps), cnx.corps.slice(0, 80));
    for (const type of ['ALL', 'VENTE']) {
      const params = { dtStart: jour(-24), dtEnd: jour(-1), hrStart: '00:00', hrEnd: '23:59', userId: 'ALL', description: type };
      const t0 = Date.now();
      const r = await appel('caisse/fetch-tickez', params, cnx.cookie);
      const ms = Date.now() - t0;
      const o = JSON.parse(r.corps);
      ok('Ticket Z sur 24 jours (' + type + ') : recapitulatif rendu', o.data && Array.isArray(o.data.datas) && o.data.datas.length > 0,
        o.data ? o.data.datas.length + ' caissiers' : r.corps.slice(0, 80));
      ok('Ticket Z sur 24 jours (' + type + ') en moins de ' + LIMITE_MS / 1000 + ' s', ms < LIMITE_MS, ms + ' ms');
    }
  } catch (e) { ok('Parcours sans exception', false, e.message); }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
  process.exit(ko ? 1 : 0);
})();
