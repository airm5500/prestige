/* LENTEURS VUES EN RECETTE (30/10) : export ERP, analyse article mobile, lots.
 *
 * Sur la copie laborex_v1_db, l'integration a donne v1/info et v1/checkproduit en 51 s, v1/stock en 121 s et
 * v1/lot/lots au-dela de 30 s. Ce script mesure ces appels, tels que les font l'application mobile et l'ERP (connexion
 * par v1/user/auth puis GET), pour comparer deux versions deployees tour a tour sur le meme serveur et la meme copie.
 *
 * Pour chaque appel : statut, duree, nombre d'elements et empreinte sha256 (16 caracteres) de la reponse triee : deux
 * versions qui rendent les memes donnees ont la meme empreinte. Rien n'est ecrit, aucune donnee n'est affichee.
 * Variables : BASE (http://localhost:9080/prestige), LOGIN (e2e), TOURS (2), APPELS (liste separee par des virgules),
 * VERSION (libelle affiche).
 */
const crypto = require('crypto');
const http = require('http');

const BASE = (process.env.BASE || 'http://localhost:9080/prestige').replace(/\/$/, '') + '/api/';
const LOGIN = process.env.LOGIN || 'e2e';
const TOURS = Number(process.env.TOURS || 2);
const APPELS = (process.env.APPELS || 'v1/info,v1/checkproduit?nompdt=,v1/stock,v1/lot/lots').split(',').map((s) => s.trim()).filter(Boolean);
const VERSION = process.env.VERSION || '';

/* tri des tableaux et des cles : l'empreinte ne depend pas de l'ordre de rendu */
const normaliser = (v) => {
  if (Array.isArray(v)) { return v.map(normaliser).map((x) => JSON.stringify(x)).sort(); }
  if (v && typeof v === 'object') { const o = {}; Object.keys(v).sort().forEach((k) => { o[k] = normaliser(v[k]); }); return o; }
  return v;
};
/* module http plutot que fetch : fetch abandonne au bout de 300 s sans en-tetes, et dev depasse ce delai */
const lire = (url, cookie) => new Promise((ok, ko) => {
  const req = http.get(url, { headers: { Cookie: cookie } }, (r) => {
    const morceaux = []; r.on('data', (c) => morceaux.push(c));
    r.on('end', () => ok({ status: r.statusCode, texte: Buffer.concat(morceaux).toString('utf8') })); r.on('error', ko);
  });
  req.setTimeout(Number(process.env.DELAI_MS || 1800000), () => req.destroy(new Error('delai depasse')));
  req.on('error', ko);
});
const taille = (j) => (Array.isArray(j) ? j.length : j && Array.isArray(j.data) ? j.data.length : j && typeof j === 'object' ? Object.keys(j).length : 0);

(async () => {
  const auth = await fetch(BASE + 'v1/user/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: LOGIN, password: 'e2etest' }) });
  const cookie = (auth.headers.get('set-cookie') || '').split(';')[0];
  if (!cookie) { console.log('connexion refusee (' + auth.status + ')'); process.exit(2); }
  for (let t = 1; t <= TOURS; t++) {
    for (const u of APPELS) {
      const t0 = Date.now();
      let s = 0; let n = 0; let emp = '-';
      try {
        const r = await lire(BASE + u, cookie);
        s = r.status;
        const texte = r.texte;
        let j = null; try { j = JSON.parse(texte); } catch (e) { /* reponse non JSON */ }
        n = taille(j);
        emp = crypto.createHash('sha256').update(j === null ? texte : JSON.stringify(normaliser(j))).digest('hex').slice(0, 16);
      } catch (e) { s = 'ERREUR ' + String(e.message).slice(0, 80); }
      console.log(`${VERSION}\ttour ${t}\t${u}\t${s}\t${Date.now() - t0} ms\t${n} elements\t${emp}`);
    }
  }
})();
