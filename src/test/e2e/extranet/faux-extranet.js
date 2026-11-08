/* FAUX EXTRANET UBIPHARM pour les tests d'ecran (plan du 07/11).
 *
 * Serveur HTTP local (127.0.0.1) : les tests n'appellent jamais le vrai extranet. Payara (domain3) le vise par
 * -DEXTRANET_UBIPHARM_URL. Les reponses viennent des jeux d'essai reconstitues de src/test/resources/extranet/ubipharm
 * (a remplacer par des captures reelles) ; la liste des reapprovisionnements est generee, avec des valeurs variees.
 *
 * Le cookie attendu, SESSIONID=essai-e2e-local, n'est pas un secret : il n'ouvre que ce faux serveur. Sans lui, ou en
 * mode « expire », le serveur rend une page de connexion (statut 200), comme un extranet dont la session a expire.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const listes = require('./faux-listes-ubipharm');

const RES = path.resolve(__dirname, '../../resources/extranet/ubipharm');
const COOKIE = 'SESSIONID=essai-e2e-local';
const CONNEXION = '<html><body><form action="/Login" method="post"><input type="hidden" name="_token" value="jeton-e2e">'
  + '<input name="login"><input type="password" name="pwd"></form></body></html>';
/* Identifiants du faux extranet : pas des secrets, ils n'ouvrent que ce serveur local. */
const IDENTIFIANT = 'essai-e2e';
const MOT_DE_PASSE = 'faux-mdp-e2e &=é';
const PDF = Buffer.from('%PDF-1.4\n% faux PDF de reclamation pour les tests\n1 0 obj << >> endobj\ntrailer << >>\n%%EOF\n',
  'latin1');

/* Lignes de reapprovisionnement : 61 lignes (3 pages de 25), meme produit sur deux agences, N/A, colisages
   multiples, produit sans CIP. */
const DISPOS = ['En stock', 'Oui', 'Non', 'N/A'];
const COLIS = [['12', '12'], ['120', '120, 140'], ['24', '24'], ['N/A', 'N/A']];
function lignesReappro(n) {
  const l = [];
  for (let i = 0; i < n; i++) {
    const ps = 'E2E' + String(100 + (i % 50)).padStart(3, '0'); // les lignes 50 a 60 repetent des produits (autre agence)
    const agence = i < 50 ? 'BKE' : 'YOP';
    const cip = i % 17 === 5 ? '' : '30000' + String(1000000 + i * 7);
    const d = DISPOS[i % DISPOS.length];
    const c = COLIS[i % COLIS.length];
    const jour = String(1 + (i % 28)).padStart(2, '0');
    l.push({
      pscode: ps, designation: 'PRODUIT ESSAI ' + i + (i % 9 === 0 ? ' &amp; CIE' : ''), cip, categorie: i % 2 ? 'PARAPHARMACIE' : 'MEDICAMENT',
      date: jour + '/10/2026', agence, statut: i % 11 === 0 ? 'Bloqué' : 'Normal', dispo: d, colisage: c,
      cellules: [
        "<a href='#' class='popup-produit' data-pscode='" + ps + "' data-sheettype='P'>PRODUIT ESSAI " + i + (i % 9 === 0 ? ' &amp; CIE' : '')
          + "</a><br><span class='td-detail'>" + cip + "</span><br><span class='td-detail'>" + (i % 2 ? 'PARAPHARMACIE' : 'MEDICAMENT') + '</span>',
        jour + '/10/2026', agence, i % 11 === 0 ? 'Bloqué' : 'Normal',
        "<div class='tip-viewStock'><div class='tip-viewStock-lgetlib' data-etcoda='" + agence + "'><span class='tip-viewStock-etlib'>"
          + (agence === 'BKE' ? 'UBIPHARM BOUAKE' : 'YOPOUGON CLIENT') + "</span> <span class='tip-viewStock-dispo'>" + d
          + "</span> <span class='tip-viewStock-colisage' data-colisage=\"" + c[0] + '">' + c[1] + '</span></div></div>',
        "<form><input type='hidden' name='pscode_" + i + "' value='" + ps + "'><input type='hidden' name='cip_" + i + "' value='" + cip
          + "'><input type='hidden' name='etcoda_" + i + "' value='" + agence + "'><input type='text' name='qte'></form>"
      ]
    });
  }
  return l;
}

function demarrer(port) {
  /* cookieAttendu : session reconnue ; cookieDonne : session ouverte par le prochain POST /Login reussi */
  const etat = { mode: 'normal', appels: [], reappro: lignesReappro(61), cookieAttendu: COOKIE, cookieDonne: COOKIE, connexions: [], listes: listes.generer() };
  const serveur = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://127.0.0.1');
    etat.appels.push({ methode: req.method, chemin: u.pathname, requete: u.search, cookie: req.headers.cookie || '' });
    const envoyer = (statut, type, corps) => { res.writeHead(statut, { 'Content-Type': type }); res.end(corps); };
    if (req.method === 'POST' && u.pathname === '/Login') {
      let corps = '';
      req.on('data', (d) => { corps += d; });
      req.on('end', () => {
        const f = new URLSearchParams(corps);
        const reussie = f.get('_token') === 'jeton-e2e' && f.get('login') === IDENTIFIANT && f.get('pwd') === MOT_DE_PASSE;
        etat.connexions.push({ reussie, champs: [...f.keys()].sort().join(',') });
        if (!reussie) { return envoyer(200, 'text/html; charset=utf-8', CONNEXION); }
        res.writeHead(302, { Location: '/Accueil', 'Set-Cookie': etat.cookieDonne + '; Path=/; HttpOnly' });
        res.end();
      });
      return undefined;
    }
    if (req.method !== 'GET') { return envoyer(405, 'text/plain', 'lecture seule'); }
    if (etat.mode === 'expire' || (req.headers.cookie || '').indexOf(etat.cookieAttendu) < 0) {
      return envoyer(200, 'text/html; charset=utf-8', CONNEXION);
    }
    const json = (o) => envoyer(200, 'application/json; charset=utf-8', typeof o === 'string' ? o : JSON.stringify(o));
    const html = (f) => envoyer(200, 'text/html; charset=utf-8', fs.readFileSync(path.join(RES, f)));
    const liste = listes.repondre(etat.listes, u, json, (h) => envoyer(200, 'text/html; charset=utf-8', h));
    if (liste !== null) { return liste; }
    switch (u.pathname) {
      case '/SavoirPlusJSON':
        return u.searchParams.get('pscode') === 'FAIR248' ? json(fs.readFileSync(path.join(RES, 'fiche/reconstitue-FAIR248.json'), 'utf8'))
          : envoyer(404, 'text/plain', 'absent');
      case '/ReturnProduitsReapproJSON': {
        const start = Number(u.searchParams.get('start')), length = Number(u.searchParams.get('length'));
        const page = etat.reappro.slice(start, start + length).map((x) => x.cellules);
        /* FAUX_DEFAUT=ligne-perdue : une ligne annoncee mais jamais servie, pour verifier que le test d'ecran echoue */
        const total = etat.reappro.length + (process.env.FAUX_DEFAUT === 'ligne-perdue' ? 1 : 0);
        return json({ msg: [], datatables: { recordsFiltered: total, recordsTotal: total,
          data: page, draw: u.searchParams.get('draw') } });
      }
      case '/ReturnReclamationsTransmisesJSON':
        return json(fs.readFileSync(path.join(RES, 'reclamations/reconstitue-liste-all.json'), 'utf8'));
      case '/AfficherReclamation':
        return u.searchParams.get('id') === '1408456' ? html('reclamations/reconstitue-detail-EXT1408456VRI.html')
          : html('reclamations/reconstitue-detail-variantes.html');
      case '/ReclamationPDF':
        return envoyer(200, 'application/pdf', PDF);
      case '/Accueil':
        return envoyer(200, 'text/html; charset=utf-8', '<html><body>Accueil</body></html>');
      case '/NouveauxProduits':
        return html('nouveaux/reconstitue-nouveaux-produits.html');
      default:
        return envoyer(404, 'text/plain', 'absent');
    }
  });
  return new Promise((ok) => serveur.listen(port, '127.0.0.1', () => ok({
    etat, COOKIE, IDENTIFIANT, MOT_DE_PASSE, PDF, sha256Pdf: crypto.createHash('sha256').update(PDF).digest('hex'),
    arreter: () => new Promise((f) => serveur.close(f))
  })));
}

module.exports = { demarrer };
