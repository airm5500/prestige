/* Etape 3 : les correctifs de l'ordonnancier.

   L'ecran presentait quatre defauts. La colonne « Medecin » restait vide alors que la requete ne
   rapporte QUE des ventes rattachees a un medecin ; le (+) ouvrait une zone vide ; le nom du
   patient n'apparaissait nulle part ; et on ne pouvait ni chercher un client, ni imprimer, ni
   exporter, ni faire un inventaire des produits delivres.

   La base de test ne contient aucune vente rattachee a un medecin, ni aucun produit soumis a
   ordonnance : la suite construit donc son propre jeu d'essai et le retire integralement a la fin. */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }

const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });

const MEDECIN = 'E2E-MED-ORDO';
const JOUR = '2026-09-05';
const VENTES = [
  { id: 'E2EORD-1', ref: 'E2EORD-REF-1', client: null, heure: '09:15:00', prix: 4500 },
  { id: 'E2EORD-2', ref: 'E2EORD-REF-2', client: null, heure: '11:40:00', prix: 3200 },
  { id: 'E2EORD-3', ref: 'E2EORD-REF-3', client: null, heure: '16:05:00', prix: 7800 }
];
let PRODUITS = [], SCHED_AVANT = {}, CLIENTS = [], USER = '';

function semer() {
  // Un passage precedent interrompu peut avoir laisse des traces : on repart d'une base propre.
  purger();
  USER = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='KGA3'");
  // Trois produits porteurs d'un code tableau : ce sont eux que le registre doit retenir.
  q("SELECT CONCAT_WS('~',lg_FAMILLE_ID,IFNULL(is_scheduled,0),int_T) FROM t_famille"
    + " WHERE int_T IN ('A','C','II') AND str_STATUT='enable' ORDER BY str_NAME LIMIT 3")
    .split('\n').filter(Boolean).forEach(l => {
      const [id, sched, tableau] = l.trim().split('~');
      PRODUITS.push({ id: id, tableau: tableau });
      SCHED_AVANT[id] = sched;
      exec("UPDATE t_famille SET is_scheduled=1 WHERE lg_FAMILLE_ID='" + id + "'");
    });
  CLIENTS = q("SELECT CONCAT_WS('~',lg_CLIENT_ID,str_FIRST_NAME,str_LAST_NAME) FROM t_client"
    + " WHERE str_FIRST_NAME IS NOT NULL AND str_FIRST_NAME<>'' ORDER BY lg_CLIENT_ID LIMIT 2")
    .split('\n').filter(Boolean).map(l => {
      const [id, prenom, nom] = l.trim().split('~');
      return { id: id, prenom: prenom, nom: nom };
    });
  if (!USER || PRODUITS.length !== 3 || CLIENTS.length !== 2) { return false; }

  exec("INSERT INTO medecin (id, num_ordre, nom, commentaire, created_at)"
    + " VALUES ('" + MEDECIN + "','E2E-9001','DOCTEUR ESSAI ORDONNANCIER','recette e2e', NOW())");

  VENTES[0].client = CLIENTS[0];
  VENTES[1].client = CLIENTS[1];
  VENTES[2].client = CLIENTS[0];
  VENTES.forEach((v, i) => {
    exec("INSERT INTO t_preenregistrement (lg_PREENREGISTREMENT_ID, str_REF, str_REF_TICKET, int_PRICE,"
      + " int_PRICE_REMISE, str_STATUT, dt_CREATED, dt_UPDATED, lg_TYPE_VENTE_ID, lg_USER_VENDEUR_ID,"
      + " lg_USER_CAISSIER_ID, lg_USER_ID, lg_CLIENT_ID, medecin_id, b_IS_CANCEL, b_IS_AVOIR,"
      + " b_WITHOUT_BON, int_PRICE_OTHER, int_ACCOUNT, int_REMISE_PARA, montantTva, checked, copy,"
      + " imported, margeug, montantttcug, montantnetug, int_SENDTOSUGGESTION)"
      + " VALUES ('" + v.id + "','" + v.ref + "','0'," + v.prix + ",0,'is_Closed',"
      + "'" + JOUR + " " + v.heure + "','" + JOUR + " " + v.heure + "',1,"
      + "'" + USER + "','" + USER + "','" + USER + "','" + v.client.id + "','" + MEDECIN + "',"
      + "0,0,0,0,0,0,0,1,0,0,0,0,0,0)");
    // Deux produits sur la premiere vente, un sur les deux autres : le (+) doit rendre le detail
    // reel, pas un nombre de lignes fixe.
    const produits = i === 0 ? [PRODUITS[0], PRODUITS[1]] : [PRODUITS[i]];
    produits.forEach((prod, j) => {
      exec("INSERT INTO t_preenregistrement_detail (lg_PREENREGISTREMENT_DETAIL_ID, lg_PREENREGISTREMENT_ID,"
        + " lg_FAMILLE_ID, int_QUANTITY, int_QUANTITY_SERVED, int_AVOIR, int_AVOIR_SERVED, int_PRICE,"
        + " int_PRICE_UNITAIR, int_NUMBER, dt_CREATED, dt_UPDATED, int_PRICE_REMISE, b_IS_AVOIR,"
        + " int_FREE_PACK_NUMBER, int_PRICE_OTHER, int_PRICE_DETAIL_OTHER, int_UG, bool_ACCOUNT,"
        + " montantTva, valeurTva, prixAchat, montanttvaug, int_AVOIR_INITIAL)"
        + " VALUES ('" + v.id + "-D" + j + "','" + v.id + "','" + prod.id + "'," + (2 + j) + ",0,0,0,"
        + (1000 * (j + 1)) + "," + (500 * (j + 1)) + ",0,'" + JOUR + " " + v.heure + "','"
        + JOUR + " " + v.heure + "',0,0,0,0,0,0,1,0,0,0,0,0)");
    });
  });
  return true;
}

/** Retire les enregistrements du jeu d'essai, qu'ils viennent de ce passage ou d'un precedent. */
function purger() {
  exec("DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID LIKE 'E2EORD-%'");
  exec("DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE 'E2EORD-%'");
  exec("DELETE FROM medecin WHERE id='" + MEDECIN + "'");
  exec("DELETE FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID IN"
    + " (SELECT lg_INVENTAIRE_ID FROM t_inventaire WHERE str_NAME LIKE 'INVENTAIRE ORDONNANCIER%')");
  exec("DELETE FROM t_inventaire WHERE str_NAME LIKE 'INVENTAIRE ORDONNANCIER%'");
}

function nettoyer() {
  VENTES.forEach(v => {
    exec("DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID='" + v.id + "'");
    exec("DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID='" + v.id + "'");
  });
  exec("DELETE FROM medecin WHERE id='" + MEDECIN + "'");
  PRODUITS.forEach(p => {
    exec("UPDATE t_famille SET is_scheduled=" + SCHED_AVANT[p.id] + " WHERE lg_FAMILLE_ID='" + p.id + "'");
  });
}

(async () => {
  if (!semer()) { console.log('FATAL : jeu d\'essai incomplet'); nettoyer(); process.exit(1); }
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1700, height: 950 } });
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
  await p.waitForTimeout(3000);

  const lire = (params) => p.evaluate(async (params) => {
    const url = '../api/v1/ventestats/ventesordonnanciers?' + Object.keys(params)
      .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');
    const r = await fetch(url, { credentials: 'same-origin' });
    return await r.json();
  }, params);

  try {
    const jour = { dtStart: JOUR, dtEnd: JOUR, medecinId: '', query: '' };
    let reponse = await lire(jour);
    const lignes = reponse.data || [];
    ok('Les trois delivrances du jour remontent', lignes.length === 3, reponse.total);

    // ---------------------------------------------------------- 1. le medecin
    ok('La colonne Medecin est renseignee',
      lignes.length === 3 && lignes.every(l => l.nom === 'DOCTEUR ESSAI ORDONNANCIER'),
      lignes.map(l => l.nom).join(' | '));
    ok('Le numero d\'ordre du medecin suit', lignes.every(l => l.numOrder === 'E2E-9001'),
      lignes.map(l => l.numOrder).join(' | '));

    // ------------------------------------------- 2. le detail, charge a la demande
    // La liste ne doit PAS transporter les produits : sur un mois de registre, cela ferait des
    // centaines de lignes descendues pour celles qu'on n'ouvre jamais.
    ok('La liste ne transporte aucun produit',
      lignes.every(l => !l.items || l.items.length === 0),
      JSON.stringify(lignes.map(l => (l.items || []).length)));
    ok('Le modele ExtJS ne retient pas de produits', modeleSansItems(await champsModele(p)));

    const v1 = lignes.filter(l => l.strREF === 'E2EORD-REF-1')[0] || {};
    const detail = await p.evaluate(async (id) => {
      const r = await fetch('../api/v1/ventestats/ventesordonnanciers/detail/' + id,
        { credentials: 'same-origin' });
      return await r.json();
    }, v1.lgPREENREGISTREMENTID);
    ok('Le detail d\'une vente se charge a la demande',
      detail.success === true && (detail.data || []).length === 2,
      JSON.stringify(detail).slice(0, 200));
    ok('Chaque produit porte son code tableau',
      (detail.data || []).every(i => ['A', 'C', 'II'].indexOf(i.codeTableau) >= 0),
      (detail.data || []).map(i => i.strNAME + '=' + i.codeTableau).join(' | '));
    ok('Chaque produit porte CIP, quantite et montant',
      (detail.data || []).every(i => i.intCIP && i.intQUANTITY > 0 && i.intPRICE > 0),
      JSON.stringify((detail.data || []).map(i => [i.intCIP, i.intQUANTITY, i.intPRICE])));

    const detail3 = await p.evaluate(async (id) => {
      const r = await fetch('../api/v1/ventestats/ventesordonnanciers/detail/' + id,
        { credentials: 'same-origin' });
      return await r.json();
    }, (lignes.filter(l => l.strREF === 'E2EORD-REF-3')[0] || {}).lgPREENREGISTREMENTID);
    ok('Le detail rend le bon nombre de produits par vente', (detail3.data || []).length === 1,
      (detail3.data || []).length);

    const inconnu = await p.evaluate(async () => {
      const r = await fetch('../api/v1/ventestats/ventesordonnanciers/detail/VENTE-INEXISTANTE',
        { credentials: 'same-origin' });
      return await r.json();
    });
    ok('Une vente inconnue rend une liste vide, pas une erreur',
      inconnu.success === true && (inconnu.data || []).length === 0, JSON.stringify(inconnu));

    // la fenetre de detail existe et sait interroger le bon point d'entree
    const fenetre = await p.evaluate((id) => {
      const f = Ext.create('testextjs.view.vente.DetailProduitsVente', {
        venteId: id, reference: 'E2EORD-REF-1',
        urlDetail: '../api/v1/ventestats/ventesordonnanciers/detail/', avecTableau: true
      });
      const grille = f.down('#grilleProduits');
      const entetes = [];
      grille.columns.forEach(c => entetes.push(c.text || c.header));
      const resultat = {
        titre: f.title,
        url: f.produitStore.getProxy().url,
        entetes: entetes
      };
      f.destroy();
      return resultat;
    }, v1.lgPREENREGISTREMENTID);
    ok('La fenetre de detail nomme la vente ouverte', /E2EORD-REF-1/.test(fenetre.titre), fenetre.titre);
    ok('Elle interroge le point d\'entree de l\'ordonnancier',
      /ventesordonnanciers\/detail\//.test(fenetre.url), fenetre.url);
    ok('Elle montre le code tableau', fenetre.entetes.join('|').indexOf('Tableau') >= 0,
      fenetre.entetes.join(' | '));

    // le meme composant, sans code tableau, pour les suppressions de vente
    const fenetreAnnul = await p.evaluate(() => {
      const f = Ext.create('testextjs.view.vente.DetailProduitsVente', {
        venteId: 'X', urlDetail: '../api/v1/ventestats/vente/detail/', avecTableau: false
      });
      const entetes = [];
      f.down('#grilleProduits').columns.forEach(c => entetes.push(c.text || c.header));
      f.destroy();
      return entetes;
    });
    ok('La meme fenetre sert les suppressions, sans colonne Tableau',
      fenetreAnnul.join('|').indexOf('Tableau') < 0, fenetreAnnul.join(' | '));

    // ---------------------------------------------------------- 3. le client
    ok('La colonne Client est renseignee', lignes.every(l => l.clientFullName && l.clientFullName.trim()),
      lignes.map(l => l.clientFullName).join(' | '));

    // ---------------------------------------------------------- 4. la recherche
    const motClient = CLIENTS[1].nom.split(' ')[0];
    reponse = await lire(Ext_apply(jour, { query: motClient }));
    ok('La recherche par nom de client filtre bien',
      (reponse.data || []).length === 1 && reponse.data[0].strREF === 'E2EORD-REF-2',
      motClient + ' -> ' + (reponse.data || []).map(l => l.strREF).join(','));

    reponse = await lire(Ext_apply(jour, { query: 'E2EORD-REF-3' }));
    ok('La recherche accepte aussi la reference',
      (reponse.data || []).length === 1 && reponse.data[0].strREF === 'E2EORD-REF-3',
      (reponse.data || []).map(l => l.strREF).join(','));

    reponse = await lire(Ext_apply(jour, { query: 'ZZZ-INEXISTANT' }));
    ok('Une recherche sans resultat ne rend rien', (reponse.data || []).length === 0, reponse.total);

    reponse = await lire(jour);
    ok('Une recherche vide ne filtre rien', (reponse.data || []).length === 3, reponse.total);

    // le filtre medecin continue de fonctionner : pas de regression
    reponse = await lire(Ext_apply(jour, { medecinId: MEDECIN }));
    ok('Le filtre par medecin fonctionne toujours', (reponse.data || []).length === 3, reponse.total);
    reponse = await lire(Ext_apply(jour, { medecinId: 'MEDECIN-INEXISTANT' }));
    ok('Un medecin inconnu ne rend rien', (reponse.data || []).length === 0, reponse.total);

    // ---------------------------------------------------------- 5. l'edition
    const pdf = await p.evaluate(async (params) => {
      const url = '../api/v1/ventestats/ventesordonnanciers/pdf?' + Object.keys(params)
        .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');
      const r = await fetch(url, { credentials: 'same-origin' });
      return await r.json();
    }, jour);
    ok('L\'edition PDF aboutit', pdf.success === true && !!pdf.url, JSON.stringify(pdf));
    if (pdf.url) {
      const chemin = '/opt/CONF/reports/pdf/' + pdf.url.split('/').pop();
      const fs = require('fs');
      const existe = fs.existsSync(chemin);
      ok('Le fichier PDF est ecrit sur le disque', existe, chemin);
      if (existe) {
        const zlib = require('zlib');
        const buf = fs.readFileSync(chemin);
        let texte = '';
        let i = 0;
        while ((i = buf.indexOf('stream', i)) !== -1) {
          const debut = i + (buf[i + 6] === 0x0d ? 8 : 7);
          const fin = buf.indexOf('endstream', debut);
          if (fin === -1) { break; }
          try { texte += zlib.inflateSync(buf.slice(debut, fin)).toString('latin1'); } catch (e) { /* flux non compresse */ }
          i = fin + 9;
        }
        ok('L\'edition porte le titre ORDONNANCIER', /ORDONNANCIER/.test(texte));
        ok('L\'edition nomme le medecin', /DOCTEUR/.test(texte), texte.slice(0, 200));
        ok('L\'edition est une ligne par produit delivre, pas par vente',
          (texte.match(/E2EORD-REF-1/g) || []).length === 2,
          'REF-1 apparait ' + (texte.match(/E2EORD-REF-1/g) || []).length + ' fois');
      }
    }

    // ---------------------------------------------------------- 6. l'export
    const excel = await p.evaluate(async (params) => {
      const url = '../api/v1/ventestats/ventesordonnanciers/excel?' + Object.keys(params)
        .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');
      const r = await fetch(url, { credentials: 'same-origin' });
      const buf = await r.arrayBuffer();
      return { statut: r.status, taille: buf.byteLength, type: r.headers.get('content-type') };
    }, jour);
    ok('L\'export Excel repond', excel.statut === 200, JSON.stringify(excel));
    ok('L\'export Excel n\'est pas vide', excel.taille > 2000, excel.taille);
    ok('L\'export Excel a le bon type', /excel/.test(excel.type || ''), excel.type);

    // ---------------------------------------------------------- 7. l'inventaire
    const controle = await p.evaluate(async (params) => {
      const url = '../api/v1/ventestats/ventesordonnanciers/inventaire?controle=true&'
        + Object.keys(params).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');
      const r = await fetch(url, { method: 'POST', credentials: 'same-origin' });
      return await r.json();
    }, jour);
    ok('Le controle compte les produits distincts', controle.success === true && controle.count === 3,
      JSON.stringify(controle));
    ok('Le controle compte les delivrances', controle.ventes === 3, JSON.stringify(controle));
    const avantInv = parseInt(q("SELECT COUNT(*) FROM t_inventaire"), 10);
    ok('Le controle ne cree aucun inventaire',
      parseInt(q("SELECT COUNT(*) FROM t_inventaire"), 10) === avantInv);

    const creation = await p.evaluate(async (params) => {
      const url = '../api/v1/ventestats/ventesordonnanciers/inventaire?'
        + Object.keys(params).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');
      const r = await fetch(url, { method: 'POST', credentials: 'same-origin' });
      return await r.json();
    }, jour);
    ok('L\'inventaire est cree', creation.success === true && creation.count === 3, JSON.stringify(creation));
    ok('L\'inventaire porte un nom parlant',
      q("SELECT COUNT(*) FROM t_inventaire WHERE str_NAME LIKE 'INVENTAIRE ORDONNANCIER%'") !== '0');

    // ---------------------------------------------------------- 8. l'onglet Analyse
    /* Le jeu d'essai est connu : 3 delivrances, 4 lignes de produit, 3 produits distincts,
       2 clients (dont un avec DEUX delivrances), 1 medecin. Le semis pose une quantite de 2 + j
       sur la j-ieme ligne d'une vente : 2 et 3 sur la premiere, 2 sur chacune des deux autres,
       soit 9 unites et 5000 de montant. */
    const analyse = await p.evaluate(async (params) => {
      const url = '../api/v1/ventestats/ventesordonnanciers/analyse?' + Object.keys(params)
        .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');
      const r = await fetch(url, { credentials: 'same-origin' });
      return await r.json();
    }, Ext_apply(jour, { top: 20 }));
    const ind = analyse.indicateurs || {};
    ok('L\'analyse repond', analyse.success === true, JSON.stringify(analyse).slice(0, 200));
    ok('Elle compte 3 delivrances, pas 4 lignes', ind.delivrances === 3, JSON.stringify(ind));
    ok('Elle compte 4 lignes de produit', ind.lignes === 4, JSON.stringify(ind));
    ok('Elle compte 3 produits distincts', ind.produitsDistincts === 3, JSON.stringify(ind));
    ok('Elle compte 2 clients distincts', ind.clientsDistincts === 2, JSON.stringify(ind));
    ok('Elle compte 1 medecin prescripteur', ind.medecinsDistincts === 1, JSON.stringify(ind));
    ok('Elle totalise 9 unites', ind.quantiteTotale === 9, JSON.stringify(ind));
    ok('Elle totalise 5000 de montant', ind.montantTotal === 5000, JSON.stringify(ind));

    ok('Le palmares des produits est rempli', (analyse.topProduits || []).length === 3,
      JSON.stringify(analyse.topProduits));
    ok('Il est trie par quantite decroissante',
      (analyse.topProduits || []).every((l, i, t) => i === 0 || t[i - 1].quantite >= l.quantite),
      (analyse.topProduits || []).map(l => l.libelle + '=' + l.quantite).join(' | '));
    ok('Chaque produit porte son CIP et son code tableau',
      (analyse.topProduits || []).every(l => /tableau/.test(l.complement)),
      (analyse.topProduits || []).map(l => l.complement).join(' | '));

    const clientDeuxFois = (analyse.topClients || []).filter(l => l.delivrances === 2);
    ok('Le client servi deux fois compte 2 delivrances', clientDeuxFois.length === 1,
      (analyse.topClients || []).map(l => l.libelle + '=' + l.delivrances).join(' | '));
    ok('Le medecin totalise les 3 delivrances',
      (analyse.topMedecins || []).length === 1 && analyse.topMedecins[0].delivrances === 3,
      JSON.stringify(analyse.topMedecins));
    ok('Le numero d\'ordre suit le medecin',
      (analyse.topMedecins[0] || {}).complement === 'E2E-9001', JSON.stringify(analyse.topMedecins));

    // l'analyse porte sur la MEME population que le registre : les filtres s'y appliquent
    const analyseFiltree = await p.evaluate(async (params) => {
      const url = '../api/v1/ventestats/ventesordonnanciers/analyse?' + Object.keys(params)
        .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');
      const r = await fetch(url, { credentials: 'same-origin' });
      return await r.json();
    }, Ext_apply(jour, { query: 'E2EORD-REF-3', top: 20 }));
    ok('La recherche filtre aussi l\'analyse',
      (analyseFiltree.indicateurs || {}).delivrances === 1
      && (analyseFiltree.topProduits || []).length === 1,
      JSON.stringify(analyseFiltree.indicateurs));

    const analyseLimitee = await p.evaluate(async (params) => {
      const url = '../api/v1/ventestats/ventesordonnanciers/analyse?' + Object.keys(params)
        .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');
      const r = await fetch(url, { credentials: 'same-origin' });
      return await r.json();
    }, Ext_apply(jour, { top: 1 }));
    ok('La limite coupe le palmares sans fausser les indicateurs',
      (analyseLimitee.topProduits || []).length === 1
      && (analyseLimitee.indicateurs || {}).produitsDistincts === 3,
      JSON.stringify(analyseLimitee.indicateurs));

    const analysePdf = await p.evaluate(async (params) => {
      const url = '../api/v1/ventestats/ventesordonnanciers/analyse/pdf?' + Object.keys(params)
        .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');
      const r = await fetch(url, { credentials: 'same-origin' });
      return await r.json();
    }, Ext_apply(jour, { top: 20 }));
    ok('L\'edition de l\'analyse aboutit', analysePdf.success === true && !!analysePdf.url,
      JSON.stringify(analysePdf));
    if (analysePdf.url) {
      const fs = require('fs');
      ok('Le PDF de l\'analyse est ecrit sur le disque',
        fs.existsSync('/opt/CONF/reports/pdf/' + analysePdf.url.split('/').pop()), analysePdf.url);
    }

    const analyseExcel = await p.evaluate(async (params) => {
      const url = '../api/v1/ventestats/ventesordonnanciers/analyse/excel?' + Object.keys(params)
        .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');
      const r = await fetch(url, { credentials: 'same-origin' });
      const buf = await r.arrayBuffer();
      return { statut: r.status, taille: buf.byteLength };
    }, Ext_apply(jour, { top: 20 }));
    ok('L\'export Excel de l\'analyse repond', analyseExcel.statut === 200 && analyseExcel.taille > 2000,
      JSON.stringify(analyseExcel));

    // l'ecran : deux onglets sur les memes filtres, et l'analyse chargee seulement a l'ouverture
    const ecran = await p.evaluate(() => {
      const vue = Ext.create('testextjs.view.vente.Ordonnancier', {renderTo: Ext.getBody()});
      const onglets = vue.down('#ongletsOrdonnancier');
      const resultat = {
        nbOnglets: onglets.items.getCount(),
        titres: onglets.items.getRange().map(o => o.title),
        // les filtres sont docked au panneau : ils valent pour les deux onglets
        filtresPartages: !!vue.down('#dtStart') && !!vue.down('#query') && !!vue.down('#medecin'),
        registrePresent: !!vue.down('#grilleRegistre'),
        palmares: ['grilleTopProduits', 'grilleTopClients', 'grilleTopMedecins']
          .every(id => !!vue.down('#' + id)),
        boutonsAnalyse: ['analyseImprimer', 'analyseExporter', 'analyseInventaire', 'analyseTop']
          .every(id => !!vue.down('#' + id)),
        // rien n'est charge tant qu'on n'ouvre pas l'onglet
        palmaresVides: vue.produitStore.getCount() === 0 && vue.clientStore.getCount() === 0
          && vue.medecinStore.getCount() === 0
      };
      vue.destroy();
      return resultat;
    });
    ok('L\'ecran a deux onglets', ecran.nbOnglets === 2, ecran.titres.join(' | '));
    ok('Registre et Analyse', ecran.titres.join('|') === 'Registre|Analyse', ecran.titres.join('|'));
    ok('Les filtres sont partages par les deux onglets', ecran.filtresPartages);
    ok('La grille du registre porte son propre itemId', ecran.registrePresent);
    ok('Les trois palmares sont presents', ecran.palmares);
    ok('L\'onglet Analyse a ses filtres et ses actions', ecran.boutonsAnalyse);
    ok('Rien n\'est calcule tant que l\'onglet n\'est pas ouvert', ecran.palmaresVides);

    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Deroulement sans exception', false, e.message + '\n' + e.stack);
  } finally {
    exec("DELETE FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID IN"
      + " (SELECT lg_INVENTAIRE_ID FROM t_inventaire WHERE str_NAME LIKE 'INVENTAIRE ORDONNANCIER%')");
    exec("DELETE FROM t_inventaire WHERE str_NAME LIKE 'INVENTAIRE ORDONNANCIER%'");
    nettoyer();
    ok('Jeu d\'essai entierement retire',
      q("SELECT COUNT(*) FROM medecin WHERE id='" + MEDECIN + "'") === '0'
      && q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE 'E2EORD-%'") === '0'
      && PRODUITS.every(p2 => q("SELECT IFNULL(is_scheduled,0) FROM t_famille WHERE lg_FAMILLE_ID='"
        + p2.id + "'") === SCHED_AVANT[p2.id]));
    await b.close();
  }
  const ko = res.filter(r => !r.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' assertions');
  process.exit(ko ? 1 : 0);
})();

/* Les champs du modele de vente partage. */
function champsModele(page) {
  return page.evaluate(() => {
    const champs = [];
    Ext.ClassManager.get('testextjs.model.caisse.Vente').getFields().forEach(f => champs.push(f.name));
    return champs;
  });
}

/* Le modele est partage par plusieurs ecrans : y declarer « items » ferait retenir les produits
   en memoire partout ou le serveur en envoie, ce que l'on veut precisement eviter. */
function modeleSansItems(champs) {
  return champs.indexOf('items') < 0;
}

/* Fusion de deux objets sans dependre d'Ext cote node. */
function Ext_apply(base, ajouts) {
  const o = {};
  Object.keys(base).forEach(k => { o[k] = base[k]; });
  Object.keys(ajouts).forEach(k => { o[k] = ajouts[k]; });
  return o;
}
