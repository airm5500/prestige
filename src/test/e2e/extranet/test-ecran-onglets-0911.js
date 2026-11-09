/* ONGLETS AJOUTES LE 09/11 (retour : « je n'ai pas ces éléments sur Copharmed : arrivages, nouveautés, les commandes en
 * cours, relevés… je n'ai que les onglets promotions et produits » ; « DPCI : je n'ai pas l'onglet produits »).
 * Vrai chemin de l'ecran contre le FAUX extranet local (jamais le vrai) : GESTION DES COMMANDES > Extranets grossistes,
 * sessions Copharmed et DPCI saisies dans l'onglet Sessions, puis pour chaque onglet « Lire sur l'extranet ».
 * Jeu d'essai (structure relevee le 09/11, valeurs inventees) :
 *  - Copharmed > Mes documents > Relevés : 31 releves sur 2 pages de 25, PDF sur 28 (3 sans icone) ;
 *  - Copharmed > Mes commandes > E-Commandes : 13 commandes sur 2 pages de 10, quantites 0 et > 1, etats differents ;
 *  - Copharmed > Mes commandes > Tous les produits commandés : 27 lignes sur 2 pages, facture vide sur certaines ;
 *  - Copharmed > Produits > Arrivages (5) et Nouveautés (4) : blocs de l'accueil, prix et paliers differents ;
 *  - DPCI > Produits > Tous les produits : 230 produits sur 3 pages de 100, statuts, offres et colisages varies.
 * Controles :
 *  - rapprochement source = ecran = base, ligne par ligne et colonne par colonne, pour chaque onglet ;
 *  - Relevés : bouton PDF sur les 28 releves qui en ont un ; « Enregistrer sous » propose Copharmed_Releve_<n°>.pdf, le
 *    fichier ecrit = PDF servi, octet pour octet ; l'appel porte les references de la ligne ; references en base = liens ;
 *  - E-Commandes : le nom d'utilisateur n'est jamais garde (ni a l'ecran, ni en base) ;
 *  - bilan : exactement une collecte COMPLETE par onglet lu, autant de lignes que la source, rien d'autre ; listes
 *    gardees remises a l'identique ; uniquement des GET vers l'extranet.
 *
 * Lancement (domain2, laborex_perf, toutes les sources d'extranet dirigees vers 127.0.0.1) :
 *   BASE=http://localhost:9080/prestige DB_TEST=laborex_perf E2E_BASE_LIBRE=1 PAYARA_DOMAINE=.../domain2 node test-ecran-onglets-0911.js
 */
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const faux = require('./faux-extranet');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright-core');

const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s],
  { encoding: 'utf8' }).replace(/\r/g, '').trim();
const res = [];
function ok(n, c, d) {
  res.push({ n, c: !!c });
  console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : ''));
}

const garde = require('./garde-extranets');
garde.verifier(q, ENV_E2E.BASE, ENV_E2E.PAYARA_DOMAINE);
const TABLES = ['extranet_collecte', 'extranet_liste_ligne', 'extranet_grossiste'];
const ECRAN = 'extranetsgrossistes';
const X = '/INTERSHOP/web/WFS/EASy-Copharmed-Site/fr_FR/-/XOF/';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/'/g, '&#39;');
const cfa = (v) => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' CFA';
const ENTETE = '<header><a href="/fr/account">Mon Espace</a><a href="/fr/logout">Déconnexion</a></header>';
const html = (corps) => ({ type: 'text/html; charset=utf-8', corps: '<html><body>' + ENTETE + corps + '</body></html>' });

/* ------------------------------------------------------------------ jeux d'essai */
const RELEVES = [];
for (let i = 0; i < 31; i++) {
  const n = String(1400100 + i * 37);
  RELEVES.push({ date: String(1 + (i % 28)).padStart(2, '0') + '/' + String(1 + (i % 11)).padStart(2, '0') + '/2026', n,
    pdf: i % 11 === 5 ? null : { StatementNo: n, SpoolName: 'SPL' + (900 + i) + '.pdf', Year: String(2025 + (i % 2)) } });
}
const ETATS = ['En cours', 'Livrée', 'Annulée', 'Partiellement livrée'];
const CMDS = [];
for (let i = 0; i < 13; i++) {
  const qc = i % 5 === 0 ? 0 : 3 + i * 7, ql = i % 3 === 0 ? 0 : Math.floor(qc / 2);
  CMDS.push({ date: String(1 + i).padStart(2, '0') + '/11/2026 ' + String(8 + (i % 10)).padStart(2, '0') + ':' + String(i * 4).padStart(2, '0'),
    n: '00' + (34000 + i) + 'WB' + (1000000000000 + i * 97), qc, ql, total: cfa(12000 + i * 13579), etat: ETATS[i % 4], user: 'Agent Nominatif ' + i });
}
const PCMD = [];
for (let i = 0; i < 27; i++) {
  const qc = i % 6 === 0 ? 0 : 1 + i * 3;
  PCMD.push([String(1 + (i % 28)).padStart(2, '0') + '/10/26', String(20000 + i * 11), (i % 9 === 0 ? 'SIROP « A & B » ' : 'PRODUIT ') + i + ' CP B/' + (10 + i),
    String(qc), String(Math.floor(qc * 0.7)), cfa(1500 + i * 2311), i % 4 === 0 ? '' : String(500000 + i)]);
}
function produitCop(i) {
  const ht = 1000 + i * 731, tva = [0, 9, 18][i % 3], ttc = Math.round(ht * (100 + tva) / 100), ppv = ht + 250 + i;
  const ug = i % 2 ? [[1 + i, 10 * (i + 1)], [3 + i, 50 * (i + 1)]] : null;
  return { nom: 'ARRIVAGE ' + i + ' 500MG CP B/' + (10 + i), code: String(3400000000000 + i * 101), dci: 'Paracetamol', colis: i % 3 ? (20 + i) + ', 1' : '',
    ht, tva, ttc, ppv, dispo: i % 4 === 1 ? 'Indisponible' : 'Disponible', ug,
    attendu: (s) => [s.nom, s.code, 'Paracetamol', s.colis, String(ht), tva + ',0%', String(ttc), String(ppv), s.dispo, ug ? 'Oui' : '',
      ug ? ug.slice().sort((a, b) => a[1] - b[1]).map((x) => x[0] + ' UG / ' + x[1]).join(' ; ') : ''] };
}
function htmlProduit(p) {
  const ug = p.ug ? '<span>Promotions</span><div class="modal">' + p.ug.map((x) => '<span>' + x[0] + ' U.G. / ' + cfa(x[1]).replace(' CFA', '') + '</span>').join('') + '</div>' : '';
  return '<div class="product-row"><div class="product-row-essential"><div class="product-row-details"><div class="product-row-promotion">' + ug
    + '</div><div class="product-row-infos"><div><div class="product-row-name">' + esc(p.nom) + '</div><div class="fs-14px">Code CIP/ACL/EAN7 : ' + p.code + '</div>'
    + (p.colis ? '<div class="fs-14px">Colisage : ' + p.colis + '</div>' : '') + '</div></div></div><div class="product-row-actions"><div class="product-row-features">'
    + '<a href="/x?DCI=a">Paracetamol</a></div><div class="product-row-price"><strong class="text-nowrap">' + cfa(p.ht) + '</strong><span class="text-nowrap">'
    + p.tva + ',0%</span><span class="text-nowrap">' + cfa(p.ttc) + '</span><span class="text-nowrap">' + cfa(p.ppv) + '</span></div><div class="product-row-buybox">'
    + (p.dispo === 'Indisponible' ? '<div>Indisponible</div>' : '<button>-</button><input name="Quantity" value="0"><button>+</button>') + '</div></div></div></div>';
}
const ARRIVAGES = [0, 1, 2, 3, 4].map(produitCop);
const NOUVEAUTES = [10, 11, 12, 13].map(produitCop);
NOUVEAUTES.forEach((p) => { p.nom = p.nom.replace('ARRIVAGE', 'NOUVEAUTE'); });
const STATUTS = [['DI', 'Disponible'], ['ML', 'Manque labo'], ['RL', 'Retard de livraison'], ['SU', 'Supprimé']];
const DPCI_PRODUITS = [];
for (let i = 0; i < 230; i++) {
  const nr = 500 + i * 37, rm = i % 7 === 0 ? Math.round(nr * 0.9) : nr, ppv = nr + 400 + (i % 13), colis = i % 5 === 0 ? 0 : 1 + (i % 24);
  const st = STATUTS[i % 4], offre = i % 6 === 0 ? [{ operateur: '>=', palier1: 5 + (i % 4), palier2: 0, uniteGratuite: 1 + (i % 3), tauxRemise: 0, montantRemise: 0 }] : null;
  const facture = i % 17 === 3 ? '' : String(3400000100000 + i);
  DPCI_PRODUITS.push({ json: { libelleProduit: 'PRODUIT DPCI ' + i + ' CP B/' + (10 + (i % 40)), codeProduitInterne: String(3400000200000 + i), codeProduitFacture: facture,
    laboratoire: { code: 'L' + (i % 9), libelle: 'LABO ' + (i % 9) },
    disponibiliteProduit: { agenceCommande: { libelleAgence: i % 2 ? 'BOUAKE' : 'ABIDJAN', statut: { code: st[0], libelle: st[1] }, dispo: st[0] === 'DI' }, agences: [] },
    colisageMultiple: colis, tarifNonRemise: { numerique: nr, formatSite: '' }, tarifRemise: { numerique: rm, formatSite: '' },
    prixPublic: { numerique: ppv, formatSite: '' }, tva: i % 3 ? 18 : 0, offreLigne: offre ? { codeOffre: 'O' + i, palierOffreViews: offre } : null, fromRgp: false },
  attendu: ['PRODUIT DPCI ' + i + ' CP B/' + (10 + (i % 40)), facture || String(3400000200000 + i), 'LABO ' + (i % 9), i % 2 ? 'BOUAKE' : 'ABIDJAN', st[1],
    colis === 0 ? '' : String(colis), String(nr), String(rm), String(ppv), i % 3 ? '18' : '0', offre ? 'dès ' + (5 + (i % 4)) + ' : ' + (1 + (i % 3)) + ' UG' : ''] });
}

/* ------------------------------------------------------------------ pages servies */
function liens(page, pages, action, pageable, taille) {
  let h = '<nav class="pagination-sites"><ul class="pagination-site-list">';
  for (let k = 0; k < pages; k++) {
    if (k !== page) {
      h += "<li class='pagination-site-item'><a href='https://www.copharmed.com" + X + action + '?PageNumber=' + k + '&amp;PageSize=' + taille + '&amp;ViewType='
        + (pageable ? '&amp;PageableID=Pg_e2e42' : '') + "'>aller à la page" + (k + 1) + 'de' + pages + '</a></li>';
    }
  }
  return h + '</ul></nav>';
}
function pageReleves(k) {
  let h = "<table class='table'><thead><tr><th>Date</th><th>Numéro de relevé</th><th></th></tr></thead><tbody>";
  RELEVES.slice(k * 25, k * 25 + 25).forEach((r) => {
    h += '<tr><td>' + r.date + '</td><td>' + r.n + '</td><td>' + (r.pdf ? "<a href='https://www.copharmed.com" + X + 'ViewPharmacy-DownloadStatementsPDF?StatementNo='
      + r.pdf.StatementNo + '&amp;SpoolName=' + r.pdf.SpoolName + '&amp;Year=' + r.pdf.Year + "' target='_blank'><i></i></a>" : '') + '</td></tr>';
  });
  return html(h + '</tbody></table>' + liens(k, 2, 'ViewPharmacy-PagingStatements', true, 25));
}
function pageCommandes(k) {
  let h = "<div class='list-header'><div class='list-header-item'>Date de la commande</div><div class='list-header-item'>Détails de l’e-commande</div>"
    + "<div class='list-header-item'>Nom d'utilisateur</div><div class='list-header-item'>État</div><div class='list-header-item'>Total</div></div><div class='list-body'>";
  CMDS.slice(k * 10, k * 10 + 10).forEach((c, i) => {
    const det = 'https://www.copharmed.com' + X + 'ViewOrders-Detail?OrderID=oE2e' + k + 'x' + i;
    h += "<div class='list-item-row list-item-row-big row'><div class='col-sm-1 list-item'>" + c.date + "</div><div class='col-sm-2 list-item'>" + c.total
      + "</div><div class='col-sm-1 list-item'><a href='" + det + "'><i></i> Détails</a></div><div class='col-sm-3 list-item'><a href='" + det + "'>" + c.n
      + '</a><br>Quantité commandée : ' + c.qc + '<br>Quantité à livrer : ' + c.ql + "</div><div class='col-sm-3 list-item'>" + c.user
      + "</div><div class='col-sm-2 list-item'>État : " + c.etat + '</div></div>';
  });
  return html(h + '</div>' + liens(k, 2, 'ViewOrders-SimpleOrderSearch', false, 10));
}
function pageProduitsCommandes(k) {
  let h = "<table class='table'><thead><tr><th>Date</th><th>Code Article</th><th>Libellé Article</th><th>Quantité Commandée</th><th>Quantité Livrée</th>"
    + '<th>Montant total</th><th>N° Facture</th></tr></thead><tbody>';
  PCMD.slice(k * 25, k * 25 + 25).forEach((l) => { h += '<tr>' + l.map((c) => '<td>' + esc(c) + '</td>').join('') + '</tr>'; });
  return html(h + '</tbody></table>' + liens(k, 2, 'ViewEASyOrders-SimpleOrderSearch', true, 25));
}
const section = (t, ps) => "<section class='py-14'><div class='flex'><h2 class='m-0'>" + t + "</h2><a href='" + X + "ViewArrivals-Start'>Voir tout</a></div>"
  + ps.map(htmlProduit).join('') + '</section>';
const pdfDe = (r) => Buffer.from('%PDF-1.4\n% releve ' + r.n + ' ' + r.pdf.SpoolName + ' ' + r.pdf.Year + '\n' + 'x'.repeat(200 + Number(r.n) % 300) + '\n%%EOF\n');

(async () => {
  /* domain2 dirige Copharmed et DPCI vers 127.0.0.1:18799 */
  const srv = await faux.demarrer(18799);
  const page = (u) => Number(u.searchParams.get('PageNumber') || 0);
  srv.etat.fichiers = {
    [X + 'ViewPharmacy-Statements']: () => pageReleves(0),
    [X + 'ViewPharmacy-PagingStatements']: (u) => pageReleves(page(u)),
    [X + 'ViewOrders-SimpleOrderSearch']: (u) => pageCommandes(page(u)),
    [X + 'ViewEASyOrders-SimpleOrderSearch']: (u) => pageProduitsCommandes(page(u)),
    '/fr/': () => html(section('Arrivages', ARRIVAGES) + section('Nouveautés', NOUVEAUTES)),
    [X + 'ViewPharmacy-DownloadStatementsPDF']: (u) => {
      const r = RELEVES.find((x) => x.pdf && x.pdf.StatementNo === u.searchParams.get('StatementNo') && x.pdf.SpoolName === u.searchParams.get('SpoolName')
        && x.pdf.Year === u.searchParams.get('Year'));
      return r ? { type: 'application/pdf', corps: pdfDe(r) } : null;
    },
    '/produits': () => ({ type: 'text/html; charset=utf-8', corps: '<html><body><a href="/module/compte/Deconnexion.action">Déconnexion</a> produits</body></html>' }),
    '/module/catalogue/RechercheCatalogue.action': (u) => {
      const s = Number(u.searchParams.get('start')), l = Number(u.searchParams.get('length'));
      return { type: 'application/json', corps: JSON.stringify({ draw: u.searchParams.get('draw'), recordsTotal: DPCI_PRODUITS.length,
        recordsFiltered: DPCI_PRODUITS.length, data: DPCI_PRODUITS.slice(s, s + l).map((x) => x.json) }) };
    }
  };
  const navigateur = await ENV_E2E.lancer(chromium);
  const ctx = await navigateur.newContext({ viewport: { width: 1600, height: 950 } });
  await ctx.addInitScript(() => {
    window.__ecrits = [];
    window.__proposes = [];
    window.showSaveFilePicker = (o) => {
      window.__proposes.push(o && o.suggestedName);
      return Promise.resolve({ name: o.suggestedName, createWritable: async () => {
        const parts = [];
        return { write: async (b) => { parts.push(...new Uint8Array(await b.arrayBuffer())); }, close: async () => { window.__ecrits.push({ nom: o.suggestedName, octets: parts }); } };
      } });
    };
  });
  const p = await ctx.newPage();
  const erreurs = [];
  p.on('pageerror', (e) => erreurs.push(String(e.message)));
  const debut = q("SELECT DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s')");
  const journalTotal = q('SELECT COUNT(*) FROM t_event_log');
  const sauve = garde.sauver(q, TABLES);
  const collMax = q('SELECT IFNULL(MAX(id), 0) FROM extranet_collecte');
  const lues = [];

  const ouvrir = async (chemin) => {
    for (const [cont, t] of chemin) { await vues.cliquer(p, ECRAN + ' ' + cont + ' tab[text=' + t + ']'); await p.waitForTimeout(400); }
  };
  const lire = async (famille, code) => {
    const finie = p.waitForResponse(async (x) => x.url().indexOf('/lectures/' + famille + '/' + code) >= 0
      && (await x.json().catch(() => ({}))).lecture?.enCours === false, { timeout: 240000 });
    await vues.cliquer(p, ECRAN + ' #exListe' + code + 'Collecter');
    await p.waitForTimeout(400);
    if (await p.evaluate((c) => /relire \?/.test(Ext.ComponentQuery.query('extranetsgrossistes #exListe' + c + 'Collecter')[0].getText()), code)) {
      await vues.cliquer(p, ECRAN + ' #exListe' + code + 'Collecter');
    }
    const lu = (await (await finie).json()).lecture.resultat;
    await p.waitForTimeout(2500);
    if (await p.evaluate((c) => { const b = Ext.ComponentQuery.query('extranetsgrossistes #exListe' + c + 'Tout')[0]; return !!b && b.isVisible() && !b.pressed; }, code)) {
      await vues.cliquer(p, ECRAN + ' #exListe' + code + 'Tout');
      await p.waitForTimeout(800);
    }
    lues.push(code);
    return lu;
  };
  const ecran = (code) => p.evaluate((c) => Ext.ComponentQuery.query('extranetsgrossistes #exListe' + c + 'Grille')[0].getStore().getRange()
    .map((r) => r.get('cellules').map((x) => String(x === null || x === undefined ? '' : x))), code);
  const base = (code) => {
    const c = q("SELECT IFNULL(MAX(id), 0) FROM extranet_collecte WHERE module = 'LISTE_" + code + "' AND statut = 'COMPLETE'");
    return q("SELECT cellules FROM extranet_liste_ligne WHERE liste = '" + code + "' AND collecte_id = " + c + ' ORDER BY position')
      .split('\n').filter((x) => x).map((l) => JSON.parse(l));
  };
  const rapprocher = (titre, code, source, lu) => {
    const e = ecran(code), b = base(code);
    return Promise.resolve(e).then((ec) => {
      ok(titre + ' : lecture réussie, ' + source.length + ' lignes', lu.success && lu.collecte.lignesRecues === source.length, JSON.stringify(lu.collecte || lu).slice(0, 200));
      const ecartE = source.map((s, i) => JSON.stringify(s) === JSON.stringify(ec[i]) ? null : i + ' ' + JSON.stringify(ec[i])).filter((x) => x);
      ok(titre + ' : écran = source, ligne par ligne (' + source.length + ')', ec.length === source.length && ecartE.length === 0, ecartE.slice(0, 3).join(' | '));
      const ecartB = source.map((s, i) => JSON.stringify(s) === JSON.stringify(b[i]) ? null : i + ' ' + JSON.stringify(b[i])).filter((x) => x);
      ok(titre + ' : base = source, ligne par ligne', b.length === source.length && ecartB.length === 0, ecartB.slice(0, 3).join(' | '));
      return ec;
    });
  };

  try {
    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await vues.ouvrirMenu(p, 'GESTION DES COMMANDES', 'Extranets grossistes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('extranetsgrossistes')[0], null, { timeout: 60000 });
    await p.mouse.move(1200, 600);
    await p.waitForTimeout(1500);
    for (const s of ['COPHARMED', 'DPCI']) {
      await vues.cliquer(p, ECRAN + ' #exOnglets tab[text=Sessions]');
      await p.waitForTimeout(400);
      await vues.saisir(p, ECRAN + ' #exCookie' + s, srv.COOKIE);
      const rs = p.waitForResponse((x) => x.url().indexOf('/sessions/' + s) >= 0, { timeout: 60000 });
      await vues.cliquer(p, ECRAN + ' #exSaisie' + s + ' button[text=Enregistrer]');
      await rs;
    }

    /* ---- onglets presents a l'ecran, a leur place */
    const titres = await p.evaluate(() => {
      const t = (id) => Ext.ComponentQuery.query('extranetsgrossistes ' + id)[0].items.items.map((x) => x.title);
      return { cop: t('#exOngletCopharmed'), prod: t('#exRubriqueCopharmedProduits'), cmd: t('#exRubriqueCopharmedCommandes'),
        docs: t('#exRubriqueCopharmedDocuments'), dpci: t('#exOngletDpci'), dprod: t('#exRubriqueDpciProduits') };
    });
    ok('Copharmed : rubriques Promotions, Produits, Mes commandes, Mes documents', JSON.stringify(titres.cop) === JSON.stringify(['Promotions', 'Produits', 'Mes commandes', 'Mes documents']), JSON.stringify(titres.cop));
    ok('Copharmed > Produits : … Arrivages, Nouveautés', JSON.stringify(titres.prod.slice(-2)) === JSON.stringify(['Arrivages', 'Nouveautés']), JSON.stringify(titres.prod));
    ok('Copharmed > Mes commandes : E-Commandes, Tous les produits commandés', JSON.stringify(titres.cmd) === JSON.stringify(['E-Commandes', 'Tous les produits commandés']), JSON.stringify(titres.cmd));
    ok('Copharmed > Mes documents : Factures, Avoirs, Relevés', JSON.stringify(titres.docs) === JSON.stringify(['Factures', 'Avoirs', 'Relevés']), JSON.stringify(titres.docs));
    ok('DPCI : rubriques existantes inchangées, Produits ajouté en dernier', JSON.stringify(titres.dpci) === JSON.stringify(['Mes offres en cours', 'Mes commandes', 'Mes documents', 'Mes réclamations', 'Produits'])
      && JSON.stringify(titres.dprod) === JSON.stringify(['Tous les produits']), JSON.stringify(titres));

    /* ---- Copharmed > Mes documents > Releves, avec PDF */
    await ouvrir([['#exOnglets', 'Copharmed'], ['#exOngletCopharmed', 'Mes documents'], ['#exRubriqueCopharmedDocuments', 'Relevés']]);
    let lu = await lire('copharmed', 'COPHARMED_RELEVES');
    await rapprocher('Relevés', 'COPHARMED_RELEVES', RELEVES.map((r) => [r.date, r.n]), lu);
    const cr = q("SELECT IFNULL(MAX(id), 0) FROM extranet_collecte WHERE module = 'LISTE_COPHARMED_RELEVES' AND statut = 'COMPLETE'");
    const docs = q("SELECT IFNULL(document, '-') FROM extranet_liste_ligne WHERE liste = 'COPHARMED_RELEVES' AND collecte_id = " + cr + ' ORDER BY position').split('\n');
    /* objet JSON : l'ordre des cles n'est pas garanti, comparaison cle par cle */
    const trie = (o) => JSON.stringify(Object.keys(o).sort().map((k) => [k, o[k]]));
    const ecartsDocs = RELEVES.map((r, i) => (docs[i] === '-' ? '-' : trie(JSON.parse(docs[i]))) === (r.pdf ? trie(r.pdf) : '-') ? null : r.n + ' ' + docs[i])
      .filter((x) => x);
    ok('Relevés : références du PDF gardées en base = liens de la page (28 avec, 3 sans)', docs.length === 31 && ecartsDocs.length === 0, ecartsDocs.join(', '));
    const fichiers = await p.evaluate(() => {
      const g = Ext.ComponentQuery.query('extranetsgrossistes #exListeCOPHARMED_RELEVESGrille')[0];
      const col = g.headerCt.getGridColumns().filter((c) => c.text === 'Fichier')[0];
      return col ? g.getStore().getRange().map((r) => g.getView().getCell(r, col).dom.textContent.trim()) : null;
    });
    ok('Relevés : bouton « PDF » sur les 28 relevés qui en ont un, rien sur les 3 autres', !!fichiers
      && RELEVES.every((r, i) => fichiers[i] === (r.pdf ? 'PDF' : '')), JSON.stringify(fichiers).slice(0, 200));
    for (const r of [RELEVES[0], RELEVES[28]]) {
      await p.mouse.move(10, 700);
      await p.evaluate(() => { const t = Ext.tip.QuickTipManager.getQuickTip(); if (t) { t.hide(); } });
      const a0 = srv.etat.appels.length, e0 = await p.evaluate(() => window.__ecrits.length);
      const pos = await p.evaluate((num) => {
        const g = Ext.ComponentQuery.query('extranetsgrossistes #exListeCOPHARMED_RELEVESGrille')[0];
        const col = g.headerCt.getGridColumns().filter((c) => c.text === 'Fichier')[0];
        const rec = g.getStore().getRange().filter((x) => x.get('cellules')[1] === num)[0];
        const cell = g.getView().getCell(rec, col);
        cell.dom.scrollIntoView({ block: 'center' });
        const b = cell.dom.querySelector('a.exFichier').getBoundingClientRect();
        return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
      }, r.n);
      await p.mouse.click(pos.x, pos.y);
      await p.waitForFunction((k) => window.__ecrits.length > k, e0, { timeout: 60000 });
      const e = await p.evaluate(() => window.__ecrits[window.__ecrits.length - 1]);
      const nom = 'Copharmed_Releve_' + r.n + '.pdf';
      ok('Relevé ' + r.n + ' : « Enregistrer sous » propose « ' + nom + ' »', e.nom === nom, e.nom);
      const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
      ok('Relevé ' + r.n + ' : PDF écrit = PDF servi, octet pour octet', sha(Buffer.from(e.octets)) === sha(pdfDe(r)));
      const ap = srv.etat.appels.slice(a0).filter((a) => a.chemin === X + 'ViewPharmacy-DownloadStatementsPDF');
      const prm = ap.length === 1 ? new URLSearchParams(ap[0].requete) : null;
      ok('Relevé ' + r.n + ' : un seul appel GET, références de la ligne', !!prm && ap[0].methode === 'GET' && prm.get('StatementNo') === r.pdf.StatementNo
        && prm.get('SpoolName') === r.pdf.SpoolName && prm.get('Year') === r.pdf.Year, JSON.stringify(ap));
    }

    /* ---- Copharmed > Mes commandes */
    await ouvrir([['#exOngletCopharmed', 'Mes commandes'], ['#exRubriqueCopharmedCommandes', 'E-Commandes']]);
    lu = await lire('copharmed', 'COPHARMED_COMMANDES');
    const ec = await rapprocher('E-Commandes', 'COPHARMED_COMMANDES', CMDS.map((c) => [c.date, c.n, String(c.qc), String(c.ql), c.etat, c.total]), lu);
    ok('E-Commandes : nom d\'utilisateur jamais gardé (écran et base)', !JSON.stringify(ec).includes('Nominatif')
      && q("SELECT COUNT(*) FROM extranet_liste_ligne WHERE liste = 'COPHARMED_COMMANDES' AND cellules LIKE '%Nominatif%'") === '0');
    await ouvrir([['#exRubriqueCopharmedCommandes', 'Tous les produits commandés']]);
    lu = await lire('copharmed', 'COPHARMED_PRODUITS_COMMANDES');
    await rapprocher('Tous les produits commandés', 'COPHARMED_PRODUITS_COMMANDES', PCMD, lu);

    /* ---- Copharmed > Produits > Arrivages, Nouveautes */
    await ouvrir([['#exOngletCopharmed', 'Produits'], ['#exRubriqueCopharmedProduits', 'Arrivages']]);
    lu = await lire('copharmed', 'COPHARMED_ARRIVAGES');
    await rapprocher('Arrivages', 'COPHARMED_ARRIVAGES', ARRIVAGES.map((x) => x.attendu(x)), lu);
    await ouvrir([['#exRubriqueCopharmedProduits', 'Nouveautés']]);
    lu = await lire('copharmed', 'COPHARMED_NOUVEAUTES');
    await rapprocher('Nouveautés', 'COPHARMED_NOUVEAUTES', NOUVEAUTES.map((x) => x.attendu(x)), lu);

    /* ---- DPCI > Produits > Tous les produits */
    await ouvrir([['#exOnglets', 'DPCI'], ['#exOngletDpci', 'Produits']]);
    const a0 = srv.etat.appels.length;
    lu = await lire('dpci', 'DPCI_PRODUITS');
    await rapprocher('DPCI Tous les produits', 'DPCI_PRODUITS', DPCI_PRODUITS.map((x) => x.attendu), lu);
    const pagesDpci = srv.etat.appels.slice(a0).filter((a) => a.chemin === '/module/catalogue/RechercheCatalogue.action').map((a) => new URLSearchParams(a.requete));
    ok('DPCI : 3 pages de 100 (start 0, 100, 200)', pagesDpci.length === 3 && pagesDpci.every((x, i) => x.get('length') === '100' && x.get('start') === String(100 * i)),
      pagesDpci.map((x) => x.get('start') + '/' + x.get('length')).join(' '));
    const codes = q("SELECT CONCAT(IFNULL(pscode, '-'), ' ', IFNULL(cip, '-')) FROM extranet_liste_ligne WHERE liste = 'DPCI_PRODUITS' AND collecte_id = "
      + q("SELECT MAX(id) FROM extranet_collecte WHERE module = 'LISTE_DPCI_PRODUITS' AND statut = 'COMPLETE'") + ' ORDER BY position').split('\n');
    const ecCodes = DPCI_PRODUITS.map((x, i) => codes[i] === x.json.codeProduitInterne + ' ' + (x.json.codeProduitFacture || x.json.codeProduitInterne) ? null : i + ' ' + codes[i]).filter((x) => x);
    ok('DPCI : code produit (interne) et CIP (code facture, sinon interne) gardés en base', codes.length === 230 && ecCodes.length === 0, ecCodes.slice(0, 3).join(' | '));

    /* ---- bilan */
    const nouvelles = q('SELECT module, statut FROM extranet_collecte WHERE id > ' + collMax + ' ORDER BY id').split('\n').filter((x) => x);
    const attendues = lues.map((c) => 'LISTE_' + c + '\tCOMPLETE');
    ok('bilan : exactement une collecte COMPLETE par onglet lu (' + lues.length + '), rien d\'autre', JSON.stringify(nouvelles) === JSON.stringify(attendues), nouvelles.join(' | '));
    ok('faux extranet : uniquement des GET', srv.etat.appels.every((a) => a.methode === 'GET'));
    ok('aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('déroulé sans exception', false, e.stack || e.message);
    await ENV_E2E.capture(p, 'onglets-0911-erreur').catch(() => {});
  } finally {
    await navigateur.close();
    await srv.arreter();
    const ecarts = garde.restaurer(q, TABLES, sauve);
    q("DELETE FROM t_event_log WHERE dt_CREATED >= '" + debut + "' AND lg_USER_ID = (SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '"
      + ENV_E2E.LOGIN.replace(/'/g, "''") + "') AND str_TABLE_CONCERN = 'dal.TUser'");
    ok('bilan : listes gardées remises à l\'identique', ecarts.length === 0, ecarts.join(', '));
    ok('bilan : journal des connexions d\'essai retiré', q('SELECT COUNT(*) FROM t_event_log') === journalTotal);
    const n = res.filter((x) => x.c).length;
    console.log('\n' + n + '/' + res.length + (n === res.length ? ' OK' : ' ECHEC'));
    process.exit(n === res.length ? 0 : 1);
  }
})();
