/*
 * Test de montee en charge de la fiche article.
 *
 * Simule N utilisateurs simultanes, chacun avec sa PROPRE session applicative
 * (comme autant de postes), qui enchainent le parcours reel de l'ecran :
 * recherche d'articles, puis apercu d'un article (double-clic).
 *
 * Mesure les temps de reponse par endpoint (mediane, p95, maximum), le debit et
 * les erreurs. N'utilise aucune dependance : http natif de Node.
 *
 *   node charge-fiche-article.js [nbUtilisateurs] [dureeSecondes]
 *   ex. node charge-fiche-article.js 25 30
 */
const http = require('http');

const HOTE = 'localhost', PORT = 8080, BASE = '/prestige';
const LOGIN = process.env.LOGIN || 'KGA3';
const MOTDEPASSE = process.env.PASSWORD || 'e2etest';
const NB = parseInt(process.argv[2] || '10', 10);
const DUREE = parseInt(process.argv[3] || '20', 10) * 1000;
const TERMES = ['OZEMPIC', 'ZINNIA', 'IMENOR', 'MAGINJ', 'OZE', 'ZIN'];

function requete(options, corps, cookie) {
  return new Promise(resolve => {
    const debut = process.hrtime.bigint();
    const req = http.request({host: HOTE, port: PORT, ...options,
      headers: Object.assign({}, options.headers || {}, cookie ? {Cookie: cookie} : {})}, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({
        code: res.statusCode,
        ms: Number(process.hrtime.bigint() - debut) / 1e6,
        cookie: (res.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; '),
        corps: data
      }));
    });
    req.on('error', e => resolve({code: 0, ms: Number(process.hrtime.bigint() - debut) / 1e6, erreur: e.message, corps: ''}));
    if (corps) req.write(corps);
    req.end();
  });
}

const mesures = {recherche: [], apercu: []};
const erreurs = [];

async function utilisateur(i) {
  // Connexions echelonnees : ce banc mesure les ecrans, pas la contention sur la
  // ligne t_user que provoque l'ouverture simultanee d'un MEME compte (la connexion
  // y met a jour la date et le compteur de connexion).
  await new Promise(r => setTimeout(r, i * 120));
  const auth = await requete({method: 'POST', path: BASE + '/api/v1/user/auth',
    headers: {'Content-Type': 'application/json'}}, JSON.stringify({login: LOGIN, password: MOTDEPASSE}));
  if (auth.code !== 200 || !auth.cookie) {
    erreurs.push('utilisateur ' + i + ' : connexion HTTP ' + auth.code);
    return;
  }
  const cookie = auth.cookie;
  const fin = Date.now() + DUREE;
  while (Date.now() < fin) {
    const terme = TERMES[Math.floor(Math.random() * TERMES.length)];
    const r = await requete({method: 'GET',
      path: BASE + '/api/v1/produit-search/fiche?search_value=' + terme + '&start=0&limit=20'}, null, cookie);
    mesures.recherche.push(r.ms);
    if (r.code !== 200) { erreurs.push('recherche HTTP ' + r.code); continue; }
    let id = null;
    try { const j = JSON.parse(r.corps); if (j.results && j.results.length) id = j.results[0].lg_FAMILLE_ID; } catch (e) {}
    if (id) {
      const a = await requete({method: 'GET', path: BASE + '/api/v1/produit-search/apercu/' + id}, null, cookie);
      mesures.apercu.push(a.ms);
      if (a.code !== 200) erreurs.push('apercu HTTP ' + a.code);
    }
  }
}

function stats(t) {
  if (!t.length) return null;
  const s = t.slice().sort((a, b) => a - b);
  const q = p => s[Math.min(s.length - 1, Math.floor(s.length * p))];
  return {n: s.length, med: q(0.5), p95: q(0.95), max: s[s.length - 1],
          moy: s.reduce((a, b) => a + b, 0) / s.length};
}

(async () => {
  console.log('Charge : ' + NB + ' utilisateurs simultanes pendant ' + (DUREE / 1000) + ' s\n');
  const debut = Date.now();
  await Promise.all(Array.from({length: NB}, (_, i) => utilisateur(i)));
  const secondes = (Date.now() - debut) / 1000;

  const ligne = (nom, s) => s
    ? nom.padEnd(12) + String(s.n).padStart(6) + '  ' + s.med.toFixed(0).padStart(7) + ' ms  '
      + s.p95.toFixed(0).padStart(7) + ' ms  ' + s.max.toFixed(0).padStart(7) + ' ms'
    : nom.padEnd(12) + '   aucun appel';
  console.log('endpoint      appels     mediane        p95         max');
  console.log('-'.repeat(58));
  console.log(ligne('recherche', stats(mesures.recherche)));
  console.log(ligne('apercu', stats(mesures.apercu)));
  const total = mesures.recherche.length + mesures.apercu.length;
  console.log('-'.repeat(58));
  console.log('debit  : ' + (total / secondes).toFixed(1) + ' requetes/s  (' + total + ' en ' + secondes.toFixed(1) + ' s)');
  console.log('erreurs: ' + erreurs.length + (erreurs.length ? '  -> ' + [...new Set(erreurs)].slice(0, 3).join(' | ') : ''));
  process.exit(erreurs.length ? 1 : 0);
})();
