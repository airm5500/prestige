/* TEST DE CHARGE DES CONNEXIONS (retours du 13/10, point 20).
 *
 * Simule des utilisateurs qui se connectent EN MEME TEMPS, sur le poste (navigateur) et sur Prestige Mobile (Android),
 * puis ouvrent leur premier ecran, et mesure ce que vit un utilisateur deja connecte pendant ce temps (fluidite).
 *
 *   node outils/charge/charge-connexion.js [paliers] [adresse]
 *     paliers : nombres d'utilisateurs simultanes, ex. 1,5,10,20,40 (par defaut)
 *     adresse : http://localhost:8080/prestige (par defaut)
 *   Variables : CHARGE_LOGIN / CHARGE_MOT_DE_PASSE (compte de test, admin / e2etest par defaut),
 *               CHARGE_MOBILE=0 pour ne pas simuler les telephones.
 *
 * A lancer SEUL (aucun autre test en meme temps), sur une copie de travail : les telephones d'essai crees sont
 * retires par le script de nettoyage affiche a la fin (t_mobile_terminal, appareils « CHARGE-… »).
 * Aucun mot de passe n'est ecrit dans les journaux ni dans le rapport.
 */
const http = require('http');
const { URL } = require('url');

const PALIERS = (process.argv[2] || '1,5,10,20,40').split(',').map(Number).filter((n) => n > 0);
const BASE = (process.argv[3] || 'http://localhost:8080/prestige').replace(/\/$/, '');
const LOGIN = process.env.CHARGE_LOGIN || 'admin';
const MDP = process.env.CHARGE_MOT_DE_PASSE || 'e2etest';
const MOBILE = process.env.CHARGE_MOBILE !== '0';
/* premier ecran : les appels que fait le navigateur entre la connexion et le tableau de bord (releves le 14/10/2026) */
const JOUR = new Date().toISOString().slice(0, 10), ANNEE = JOUR.slice(0, 4);
const PREMIER_ECRAN = process.env.CHARGE_PREMIER_ECRAN ? process.env.CHARGE_PREMIER_ECRAN.split(',') : [
  '/general/', '/api/v1/app-params/couleurs-lignes', '/api/v1/magasin/find-depots?page=1&start=0&limit=25',
  '/api/v1/type-reglements/client-requis', '/api/v1/type-reglements/mobile-money', '/api/v1/user/account',
  '/webservices/menumanagement/ws_tree_menu.jsp?node=root', '/api/v1/tableau-bord/version', '/api/v1/officine',
  '/api/v1/preferences/tableau-bord', '/api/v1/tableau-bord/tuiles?date=' + JOUR + '&achats=saisie&rup=7&frais=0',
  '/api/v1/tableau-bord/evolution?annee=' + ANNEE + '&frais=0', '/api/v1/tableau-bord/valorisation?frais=0',
  '/api/v1/tableau-bord/mouvements?date=' + JOUR + '&frais=0', '/api/v1/tableau-bord/alertes?frais=0&per=6&rup=7&ren=7&sug=2&nv=30',
  '/api/v1/tableau-bord/encaissements?date=' + JOUR + '&frais=0', '/api/v1/preferences/cloche', '/api/v1/ventes-ratees/compteur-jour',
  '/api/v1/app-params/value/KEY_NOTIFICATION_REFRESH_SECONDS', '/api/v1/notifications-centre/compteurs?cles=reserve%2Cperimes%2Cavoirs%2Ccampagnes'];
/* comme un navigateur : au plus 6 requetes en parallele vers le serveur */
const PARALLELE_NAVIGATEUR = 6;
/* temps par appel du premier ecran, pour le palier en cours */
let parAppel = {};

function requete(methode, chemin, corps, cookies, entetes) {
  return new Promise((resolve) => {
    const u = new URL(BASE + chemin);
    const t0 = Date.now();
    const donnees = corps ? JSON.stringify(corps) : null;
    const r = http.request({ hostname: u.hostname, port: u.port, path: u.pathname + u.search, method: methode, agent: false,
      headers: Object.assign({ 'Content-Type': 'application/json', Cookie: cookies.join('; ') }, entetes || {}, donnees ? { 'Content-Length': Buffer.byteLength(donnees) } : {}) }, (rep) => {
      let texte = '';
      rep.on('data', (c) => { texte += c; });
      rep.on('end', () => {
        (rep.headers['set-cookie'] || []).forEach((c) => { const v = c.split(';')[0]; const nom = v.split('=')[0];
          const i = cookies.findIndex((x) => x.startsWith(nom + '=')); if (i >= 0) { cookies[i] = v; } else { cookies.push(v); } });
        resolve({ ms: Date.now() - t0, code: rep.statusCode, texte });
      });
    });
    r.setTimeout(120000, () => { r.destroy(); resolve({ ms: Date.now() - t0, code: 0, texte: 'delai depasse' }); });
    r.on('error', (e) => resolve({ ms: Date.now() - t0, code: 0, texte: e.message }));
    if (donnees) { r.write(donnees); }
    r.end();
  });
}

async function posteWeb() {
  const cookies = [];
  const t0 = Date.now();
  const auth = await requete('POST', '/api/v1/user/auth', { login: LOGIN, password: MDP }, cookies);
  let ok = auth.code === 200 && /"success"\s*:\s*true/.test(auth.texte);
  const premier = Date.now();
  const file = [...PREMIER_ECRAN];
  const canal = async () => { while (file.length) { const c = file.shift(); const r = await requete('GET', c, null, cookies); ok = ok && r.code === 200;
    const cle = c.split('?')[0]; (parAppel[cle] = parAppel[cle] || []).push(r.ms); } };
  await Promise.all(Array.from({ length: PARALLELE_NAVIGATEUR }, canal));
  return { ok, connexion: auth.ms, total: Date.now() - t0, ecran: Date.now() - premier };
}

async function telephone(i) {
  const cookies = [];
  const t0 = Date.now();
  const c = await requete('POST', '/api/v1/mobile/connexion', { login: LOGIN, motDePasse: MDP, appareil: 'CHARGE-' + i, nomAppareil: 'Test de charge ' + i }, cookies);
  let jeton = null;
  try { jeton = JSON.parse(c.texte).jeton; } catch (e) { /* refus */ }
  let ok = c.code === 200 && !!jeton;
  if (jeton) {
    const m = await requete('GET', '/api/v1/mobile/moi', null, cookies, { Authorization: 'Bearer ' + jeton });
    ok = ok && m.code === 200;
  }
  return { ok, connexion: c.ms, total: Date.now() - t0 };
}

/* utilisateur deja connecte : une requete legere toutes les 300 ms pendant le palier */
async function temoin(cookies, fin) {
  const mesures = [];
  while (Date.now() < fin.t) {
    const r = await requete('GET', '/api/v1/app/info', null, cookies);
    mesures.push(r.ms);
    await new Promise((x) => setTimeout(x, 300));
  }
  return mesures;
}

const centile = (l, p) => { if (!l.length) { return 0; } const s = [...l].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.ceil(p / 100 * s.length) - 1)]; };

(async () => {
  const lignes = [];
  const temoinCookies = [];
  await requete('POST', '/api/v1/user/auth', { login: LOGIN, password: MDP }, temoinCookies);
  const repos = await temoin(temoinCookies, { t: Date.now() + 3000 });
  console.log('Témoin au repos : médiane ' + centile(repos, 50) + ' ms, 95 % ' + centile(repos, 95) + ' ms');
  for (const n of PALIERS) {
    parAppel = {};
    const fin = { t: Infinity };
    const tem = temoin(temoinCookies, fin);
    const t0 = Date.now();
    const taches = [];
    for (let i = 0; i < n; i++) {
      taches.push(posteWeb());
      if (MOBILE) { taches.push(telephone(i)); }
    }
    const r = await Promise.all(taches);
    const duree = Date.now() - t0;
    fin.t = 0;
    const t = await tem;
    const web = r.filter((x) => x.ecran !== undefined), tel = r.filter((x) => x.ecran === undefined);
    const ligne = { simultanes: n, duree, echecs: r.filter((x) => !x.ok).length,
      webConnexion50: centile(web.map((x) => x.connexion), 50), webConnexion95: centile(web.map((x) => x.connexion), 95),
      webTotal95: centile(web.map((x) => x.total), 95), webMax: Math.max(...web.map((x) => x.total)),
      telConnexion50: centile(tel.map((x) => x.connexion), 50), telConnexion95: centile(tel.map((x) => x.connexion), 95),
      temoin50: centile(t, 50), temoin95: centile(t, 95), temoinMax: t.length ? Math.max(...t) : 0 };
    ligne.lents = Object.keys(parAppel).map((k) => ({ k, p95: centile(parAppel[k], 95) })).sort((a, b) => b.p95 - a.p95).slice(0, 4).map((x) => x.k + ' ' + x.p95 + ' ms').join(' ; ');
    lignes.push(ligne);
    console.log(JSON.stringify(ligne));
    await new Promise((x) => setTimeout(x, 2000));
  }
  console.log('\n| Simultanés (poste + tél.) | Durée | Échecs | Connexion poste médiane / 95 % | Connexion + 1er écran 95 % / max | Connexion tél. médiane / 95 % | Témoin médiane / 95 % / max |');
  console.log('|---|---|---|---|---|---|---|');
  lignes.forEach((l) => console.log(`| ${l.simultanes} + ${MOBILE ? l.simultanes : 0} | ${l.duree} ms | ${l.echecs} | ${l.webConnexion50} / ${l.webConnexion95} ms | ${l.webTotal95} / ${l.webMax} ms | ${MOBILE ? l.telConnexion50 + ' / ' + l.telConnexion95 + ' ms' : '—'} | ${l.temoin50} / ${l.temoin95} / ${l.temoinMax} ms |`));
  console.log('\nAppels les plus lents (95 %) par palier :');
  lignes.forEach((l) => console.log('- ' + l.simultanes + ' : ' + l.lents));
  console.log('\nNettoyage (copie de travail) : DELETE FROM t_mobile_terminal WHERE appareil LIKE \'CHARGE-%\'; (les jetons ne sont pas stockés)');
})();
