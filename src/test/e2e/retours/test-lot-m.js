/* Retours des tests du 09/09 (2e) - lot M : gardes (point 4).
 *
 *  - perimetre aligne sur la balance : ventes de l'emplacement de l'utilisateur, non importees,
 *    hors ventes exclues -> les chiffres de la garde ne depassent plus ceux de la balance ;
 *  - menu garde dans correctifs-affichage ; selecteur de tranche et export des tranches sur l'onglet
 *    « Suivi de l'activite » ; infobulle complete sur la courbe ;
 *  - onglet Analyse en deux volets : resume par classe sans defilement a gauche (clic = filtre),
 *    produits pagines a droite avec leur stock ; filtres emplacement / famille / grossiste ;
 *    bouton « Creer une suggestion de garde » ;
 *  - commandes non vendues : export Excel et impression PDF (en flux, sans fenetre intermediaire) ;
 *  - comparaison : liste deroulante sans entites HTML ; gardes triees par periode.
 *
 * Jeu d'essai (retire a la fin) : une garde, trois ventes valides (1 000, 4 000, 600) et trois ventes
 * qui doivent etre IGNOREES (importee, d'un autre emplacement, exclue des etats), un stock, une commande.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const fs = require('fs');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 320) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
const MARQUE = 'E2E-LM';
const TMP = '/tmp/claude-0/lot-m';
const EMPL2 = MARQUE + '-EMPL';
const USER2 = MARQUE + '-USER';

let PRODUITS = [], USER = '', GROSSISTES = [], TP = '';
const DEBUT = '2027-01-05 20:00', FIN = '2027-01-06 08:00';
/* P0 et P2 partagent un grossiste, P1 en a un autre : le filtre grossiste doit separer les deux. */
const VENTES = [
  { id: MARQUE + '-1', quand: '2027-01-05 20:30:00', prod: 0, qte: 2, montant: 1000, achat: 300 },
  { id: MARQUE + '-2', quand: '2027-01-05 23:15:00', prod: 1, qte: 10, montant: 4000, achat: 200 },
  { id: MARQUE + '-3', quand: '2027-01-06 03:00:00', prod: 2, qte: 1, montant: 600, achat: 900 },
  { id: MARQUE + '-IMP', quand: '2027-01-05 21:00:00', prod: 0, qte: 5, montant: 5000, achat: 300, imported: 1 },
  { id: MARQUE + '-AUTRE', quand: '2027-01-05 22:00:00', prod: 1, qte: 7, montant: 7000, achat: 200, autreEmplacement: true },
  { id: MARQUE + '-EXCLUE', quand: '2027-01-05 23:00:00', prod: 2, qte: 9, montant: 9000, achat: 900, exclue: true }
];

function purger() {
  exec("DELETE FROM vente_exclu WHERE preenregistrement_id LIKE '" + MARQUE + "-%'");
  exec("DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "-%'");
  exec("DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "-%'");
  exec("DELETE FROM t_order_detail WHERE lg_ORDER_ID LIKE '" + MARQUE + "-%'");
  exec("DELETE FROM t_order WHERE lg_ORDER_ID LIKE '" + MARQUE + "-%'");
  exec("DELETE FROM t_type_stock_famille WHERE lg_TYPE_STOCK_FAMILLE_ID LIKE '" + MARQUE + "-%'");
  exec("DELETE FROM garde WHERE libelle LIKE '" + MARQUE + " %'");
  exec("DELETE FROM t_user WHERE lg_USER_ID='" + USER2 + "'");
  exec("DELETE FROM t_emplacement WHERE lg_EMPLACEMENT_ID='" + EMPL2 + "'");
}

function semer() {
  purger();
  USER = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='KGA3'");
  TP = q("SELECT lg_TIERS_PAYANT_ID FROM t_tiers_payant LIMIT 1");
  // deux produits du meme grossiste, un troisieme d'un autre
  const l = q("SELECT f.lg_FAMILLE_ID, f.lg_GROSSISTE_ID FROM t_famille f JOIN t_grossiste g ON g.lg_GROSSISTE_ID=f.lg_GROSSISTE_ID"
    + " WHERE f.str_STATUT='enable' AND f.lg_FAMILLEARTICLE_ID IS NOT NULL AND f.bool_DECONDITIONNE=0"
    + " GROUP BY f.lg_GROSSISTE_ID ORDER BY g.str_LIBELLE LIMIT 2").split('\n').filter(Boolean).map(x => x.split('\t'));
  if (l.length < 2) { return false; }
  const p2 = q("SELECT lg_FAMILLE_ID FROM t_famille WHERE str_STATUT='enable' AND lg_GROSSISTE_ID='" + l[0][1]
    + "' AND lg_FAMILLE_ID<>'" + l[0][0] + "' AND bool_DECONDITIONNE=0 LIMIT 1");
  PRODUITS = [l[0][0], l[1][0], p2];
  GROSSISTES = [l[0][1], l[1][1]];
  if (!USER || PRODUITS.some(x => !x)) { return false; }
  // un second emplacement et un utilisateur qui y vend : ses ventes ne concernent pas la garde
  exec("INSERT INTO t_emplacement (lg_EMPLACEMENT_ID, lg_COMPTE_CLIENT_ID, str_NAME, str_DESCRIPTION, str_STATUT, lg_TYPEDEPOT_ID)"
    + " VALUES ('" + EMPL2 + "','3','E2E autre site','E2E autre site','enable','0')");
  exec("INSERT INTO t_user (lg_USER_ID, lg_EMPLACEMENT_ID, str_LOGIN, str_TYPE, str_PASSWORD, str_FIRST_NAME, str_LAST_NAME, str_STATUT)"
    + " VALUES ('" + USER2 + "','" + EMPL2 + "','" + USER2 + "','CUSTOMER','x','E2E','AUTRE SITE','enable')");
  VENTES.forEach(v => {
    const u = v.autreEmplacement ? USER2 : USER;
    exec("INSERT INTO t_preenregistrement (lg_PREENREGISTREMENT_ID, str_REF, str_REF_TICKET, int_PRICE,"
      + " int_PRICE_REMISE, str_STATUT, dt_CREATED, dt_UPDATED, lg_TYPE_VENTE_ID, lg_USER_VENDEUR_ID,"
      + " lg_USER_CAISSIER_ID, lg_USER_ID, b_IS_CANCEL, b_IS_AVOIR, b_WITHOUT_BON, int_PRICE_OTHER,"
      + " int_ACCOUNT, int_REMISE_PARA, montantTva, checked, copy, imported, margeug, montantttcug,"
      + " montantnetug, int_SENDTOSUGGESTION)"
      + " VALUES ('" + v.id + "','" + v.id + "','0'," + v.montant + ",0,'is_Closed','" + v.quand + "','"
      + v.quand + "',1,'" + u + "','" + u + "','" + u + "',0,0,0,0,0,0,0,1,0," + (v.imported ? 1 : 0) + ",0,0,0,0)");
    exec("INSERT INTO t_preenregistrement_detail (lg_PREENREGISTREMENT_DETAIL_ID, lg_PREENREGISTREMENT_ID,"
      + " lg_FAMILLE_ID, int_QUANTITY, int_QUANTITY_SERVED, int_AVOIR, int_AVOIR_SERVED, int_PRICE,"
      + " int_PRICE_UNITAIR, int_NUMBER, dt_CREATED, dt_UPDATED, int_PRICE_REMISE, b_IS_AVOIR,"
      + " int_FREE_PACK_NUMBER, int_PRICE_OTHER, int_PRICE_DETAIL_OTHER, int_UG, bool_ACCOUNT,"
      + " montantTva, valeurTva, prixAchat, montanttvaug, int_AVOIR_INITIAL)"
      + " VALUES ('" + v.id + "-D','" + v.id + "','" + PRODUITS[v.prod] + "'," + v.qte + ",0,0,0,"
      + v.montant + "," + Math.round(v.montant / v.qte) + ",0,'" + v.quand + "','" + v.quand
      + "',0,0,0,0,0,0,1,0,0," + v.achat + ",0,0)");
    if (v.exclue) {
      exec("INSERT INTO vente_exclu (id, created_at, modified_at, status, montant_client, montantPaye, montantRegle, montantTiersPayant, montantVente, mvtDate,"
        + " mvt_transaction_key, type_tiers_payant, preenregistrement_id, tiersPayant_id, type_reglement_id)"
        + " VALUES ('" + v.id + "',NOW(),NOW(),'enable',0,0,0,0," + v.montant + ",'" + v.quand.slice(0, 10) + "','" + v.id + "','ASSURANCE','" + v.id + "','" + TP + "','1')");
    }
  });
  // un stock de 12 pour P0, en plus de ce qu'il a deja
  exec("INSERT INTO t_type_stock_famille (lg_TYPE_STOCK_FAMILLE_ID, lg_FAMILLE_ID, lg_TYPE_STOCK_ID, lg_EMPLACEMENT_ID, str_NAME, str_DESCRIPTION, dt_CREATED, dt_UPDATED, str_STATUT, int_NUMBER)"
    + " VALUES ('" + MARQUE + "-STOCK','" + PRODUITS[0] + "','2','1','E2E','E2E',NOW(),NOW(),'enable',12)");
  // une commande de P1 (vendu) et de P2 x 0 ? non : P2 commande et vendu, plus un produit jamais vendu (P0 commande 3)
  exec("INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)"
    + " VALUES ('" + MARQUE + "-CMD','" + MARQUE + "-CMD',2,'" + GROSSISTES[0] + "','" + USER + "','is_Process','2027-01-05 22:30:00','2027-01-05 22:30:00',0,0,0)");
  exec("INSERT INTO t_order_detail (lg_ORDERDETAIL_ID, lg_ORDER_ID, lg_FAMILLE_ID, lg_GROSSISTE_ID, int_NUMBER, int_PRICE, str_STATUT, dt_CREATED, dt_UPDATED)"
    + " VALUES ('" + MARQUE + "-CMD-0','" + MARQUE + "-CMD','" + PRODUITS[0] + "','" + GROSSISTES[0] + "',3,0,'is_Process','2027-01-05 22:30:00','2027-01-05 22:30:00')");
  return true;
}

(async () => {
  fs.mkdirSync(TMP, { recursive: true });
  if (!semer()) { console.log('FATAL : jeu d\'essai incomplet'); purger(); process.exit(1); }
  const stockAttendu = parseInt(q("SELECT COALESCE(SUM(int_NUMBER),0) FROM t_type_stock_famille WHERE lg_FAMILLE_ID='" + PRODUITS[0] + "' AND lg_TYPE_STOCK_ID='2' AND str_STATUT='enable' AND lg_EMPLACEMENT_ID='1'"), 10);
  const libelleG2 = q("SELECT str_LIBELLE FROM t_grossiste WHERE lg_GROSSISTE_ID='" + GROSSISTES[1] + "'");
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1800, height: 1000 } });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  const popups = []; ctx.on('page', pg => popups.push(pg));
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
  await p.waitForTimeout(2500);

  const poster = (params) => p.evaluate(async (params) => {
    const corps = Object.keys(params).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');
    const r = await fetch('../api/v1/gardes', { method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: corps });
    return await r.json();
  }, params);
  const lire = (chemin) => p.evaluate(async (chemin) => {
    const r = await fetch('../api/v1/gardes' + chemin, { credentials: 'same-origin' });
    return await r.json();
  }, chemin);
  const octets = (url) => p.evaluate(async (u) => {
    const r = await fetch(u, { credentials: 'same-origin' });
    const buf = await r.arrayBuffer();
    return { statut: r.status, type: r.headers.get('content-type'), octets: Array.from(new Uint8Array(buf)) };
  }, url);
  const attendreStore = (expr) => p.waitForFunction((expr) => { const s = eval(expr); return s && !s.isLoading(); }, expr, { timeout: 20000 });
  const analyseFinie = async () => {
    await p.waitForFunction(() => !/Analyse en cours/.test(Ext.ComponentQuery.query('gardemanager #gardeIndicateurs')[0].el.dom.innerHTML), null, { timeout: 20000 });
    await p.waitForTimeout(500);
  };

  try {
    const g = await poster({ libelle: MARQUE + ' nuit test', dateDebut: DEBUT, dateFin: FIN });
    ok('garde de jeu d essai enregistree', g.success, JSON.stringify(g));
    const gardeId = (g.data || g.garde || {}).id || q("SELECT id FROM garde WHERE libelle='" + MARQUE + " nuit test'");

    /* ------------------------------------------------------- perimetre (API) */
    const rapport = await lire('/' + gardeId + '/rapport?heures=2');
    const i = rapport.indicateurs || {};
    ok('perimetre : 3 ventes retenues et 5 600 de chiffre ; la vente importee, celle de l autre site et la vente exclue sont ignorees',
      i.ventes === 3 && i.montant === 5600, JSON.stringify(i));
    ok('perimetre : le classement ABC ne porte que les 3 produits, avec leur stock',
      rapport.totalAbc === 3 && (rapport.abc || []).some(l => l.produitId === PRODUITS[0] && l.stock === stockAttendu),
      JSON.stringify((rapport.abc || []).map(l => [l.produitId === PRODUITS[0] ? 'P0' : '', l.montant, l.stock])) + ' attendu=' + stockAttendu);
    const filtre = await lire('/' + gardeId + '/rapport?heures=2&grossiste=' + GROSSISTES[1]);
    ok('API : le filtre grossiste ne laisse que le produit de ce grossiste (4 000)',
      filtre.totalFiltre === 1 && (filtre.abc || []).length === 1 && filtre.abc[0].montant === 4000, JSON.stringify(filtre.abc));
    const page = await lire('/' + gardeId + '/rapport?heures=2&start=1&limit=1');
    ok('API : la pagination rend la page demandee (1 produit sur 3, le deuxieme)',
      page.totalFiltre === 3 && (page.abc || []).length === 1 && page.abc[0].montant === 1000, JSON.stringify(page.abc));
    const listeGardes = await lire('?annee=');
    const dates = (listeGardes.data || []).map(x => x.dateDebut);
    ok('les gardes sont rendues par periode decroissante (pas par date de creation)',
      dates.every((d, k) => k === 0 || d <= dates[k - 1]), dates.slice(0, 5).join(' | '));

    /* ------------------------------------------------------- ecran */
    const colle = await p.evaluate(() => (window.PrestigeAffichage.ECRANS_COLLES || []).indexOf('gardemanager') >= 0);
    ok('le menu garde est dans correctifs-affichage.js (ECRANS_COLLES)', colle);
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('gardemanager', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('gardemanager').length > 0, null, { timeout: 20000 });
    await attendreStore("Ext.ComponentQuery.query('gardemanager')[0].gardeStore");
    await p.waitForTimeout(800);
    const ligne = await p.evaluate((libelle) => {
      const g = Ext.ComponentQuery.query('gardemanager #grilleGardes')[0];
      const i = g.getStore().findExact('libelle', libelle);
      const cellule = g.getView().getNode(i).querySelector('.x-grid-cell:not(.x-grid-cell-row-checker) .x-grid-cell-inner');
      cellule.scrollIntoView();
      const r = cellule.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }, MARQUE + ' nuit test');
    await p.mouse.click(ligne.x, ligne.y);
    await analyseFinie();

    const ecran = await p.evaluate(() => {
      const v = Ext.ComponentQuery.query('gardemanager')[0];
      const dans = (itemId, onglet) => !!v.down('#' + onglet).down('#' + itemId);
      const resume = v.down('#grilleResumeAbc'), abc = v.down('#grilleAbc');
      const vue = resume.getView().getEl().dom;
      return {
        heuresAnalyse: dans('gardeHeures', 'ongletAnalyseGarde'), heuresActivite: dans('gardeHeures', 'ongletActivite'),
        exportTranchesActivite: dans('gardeExporterTranches', 'ongletActivite'),
        resumeLignes: resume.getStore().getCount(), resumeScroll: vue.scrollHeight > vue.clientHeight + 2,
        resumeX: resume.el.getX(), abcX: abc.el.getX(), resumeVisible: resume.isVisible(true),
        pagination: !!abc.down('pagingtoolbar'), pageSize: abc.getStore().pageSize,
        colonnes: abc.headerCt.getGridColumns().map(c => (c.text || '').replace(/&eacute;/g, 'é')),
        boutonSuggestion: (v.down('#gardeSuggestion').getText() || '').replace(/&eacute;/g, 'é'),
        filtres: ['abcRayon', 'abcFamille', 'abcGrossiste'].map(id => !!v.down('#' + id)),
        stockP0: abc.getStore().getRange().map(r => r.get('stock')),
        indicateurs: v.down('#gardeIndicateurs').el.dom.innerText,
        infobulle: v.infobulleTranche(Ext.create('Ext.data.Store', {fields: ['libelle', 'clients', 'ventes', 'quantite', 'montant', 'heuresCouvertes', 'clientsParHeure'],
          data: [{libelle: '20h - 22h', clients: 2, ventes: 2, quantite: 3, montant: 1500, heuresCouvertes: 2, clientsParHeure: 1}]}).getAt(0))
      };
    });
    ok('le selecteur de tranche horaire et l export des tranches sont sur « Suivi de l activite », plus sur Analyse',
      !ecran.heuresAnalyse && ecran.heuresActivite && ecran.exportTranchesActivite, JSON.stringify(ecran));
    ok('le resume par classe est a gauche, toutes ses classes visibles sans defilement',
      ecran.resumeVisible && ecran.resumeLignes >= 2 && !ecran.resumeScroll && ecran.resumeX < ecran.abcX,
      'lignes=' + ecran.resumeLignes + ' scroll=' + ecran.resumeScroll + ' x=' + ecran.resumeX + '/' + ecran.abcX);
    ok('les produits sont pagines a droite, avec une colonne Stock, et le stock de P0 est celui de l emplacement',
      ecran.pagination && ecran.pageSize === 50 && ecran.colonnes.indexOf('Stock') >= 0 && ecran.stockP0.indexOf(stockAttendu) >= 0,
      ecran.colonnes.join(' | ') + ' stocks=' + ecran.stockP0.join(',') + ' attendu=' + stockAttendu);
    ok('bouton « Créer une suggestion de garde » et filtres emplacement / famille / grossiste presents',
      /Créer une suggestion de garde/.test(ecran.boutonSuggestion) && ecran.filtres.every(Boolean), ecran.boutonSuggestion + ' ' + JSON.stringify(ecran.filtres));
    ok('les indicateurs de l ecran donnent 3 ventes et 5 600 (perimetre aligne)',
      /\b3\b\s*vente/.test(ecran.indicateurs) && /5[\s .,]600/.test(ecran.indicateurs), ecran.indicateurs);
    ok('l infobulle de la courbe porte toutes les valeurs de la tranche',
      /2 client\(s\), 2 vente\(s\), 3 unité\(s\), CA 1[\s .,]500, 2 h tenue\(s\), 1[.,]0 client\(s\)\/h/.test(ecran.infobulle), ecran.infobulle);

    // clic sur la classe A du resume : la liste de droite ne montre que la classe A ; second clic : tout
    const celluleA = await p.evaluate(() => {
      const g = Ext.ComponentQuery.query('gardemanager #grilleResumeAbc')[0];
      const i = g.getStore().findExact('classe', 'A');
      const r = g.getView().getNode(i).querySelector('.x-grid-cell-inner').getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    await p.mouse.click(celluleA.x, celluleA.y);
    await analyseFinie();
    const apresA = await p.evaluate(() => {
      const v = Ext.ComponentQuery.query('gardemanager')[0];
      return { classe: v.down('#abcClasse').getValue(), classes: v.down('#grilleAbc').getStore().getRange().map(r => r.get('classe')) };
    });
    ok('un clic sur la classe A du resume filtre les produits de droite sur A',
      apresA.classe === 'A' && apresA.classes.length >= 1 && apresA.classes.every(c => c === 'A'), JSON.stringify(apresA));
    await p.mouse.click(celluleA.x, celluleA.y);
    await analyseFinie();
    const apresTout = await p.evaluate(() => Ext.ComponentQuery.query('gardemanager #grilleAbc')[0].getStore().getCount());
    ok('un second clic sur la meme classe ramene tous les produits', apresTout === 3, apresTout);

    // filtre grossiste, au clavier : les premieres lettres puis le choix dans la liste
    const idGrossiste = await p.evaluate(() => Ext.ComponentQuery.query('gardemanager #abcGrossiste')[0].inputEl.id);
    await p.click('#' + idGrossiste);
    await p.type('#' + idGrossiste, libelleG2.slice(0, 4), { delay: 40 });
    await p.waitForSelector('.x-boundlist:visible .x-boundlist-item', { timeout: 8000 });
    await p.click('.x-boundlist:visible .x-boundlist-item:text-is("' + libelleG2 + '")');
    await analyseFinie();
    const apresGrossiste = await p.evaluate(() => Ext.ComponentQuery.query('gardemanager #grilleAbc')[0].getStore().getRange().map(r => r.get('montant')));
    ok('le filtre grossiste (saisi au clavier) ne laisse que le produit de ce grossiste', apresGrossiste.length === 1 && apresGrossiste[0] === 4000, JSON.stringify(apresGrossiste) + ' ' + libelleG2);
    const idEffacer = await p.evaluate(() => Ext.ComponentQuery.query('gardemanager #abcEffacer')[0].el.id);
    await p.click('#' + idEffacer);
    await analyseFinie();
    const apresEffacer = await p.evaluate(() => Ext.ComponentQuery.query('gardemanager #grilleAbc')[0].getStore().getCount());
    ok('« Effacer les filtres » ramene les 3 produits', apresEffacer === 3, apresEffacer);

    /* ------------------------------------------------------- commandes non vendues : exports */
    const ongletCmd = await p.evaluate(() => Ext.ComponentQuery.query('gardemanager #ongletCommandes')[0].tab.el.id);
    await p.click('#' + ongletCmd);
    await p.waitForTimeout(1500);
    const cmd = await p.evaluate(() => {
      const v = Ext.ComponentQuery.query('gardemanager')[0];
      return { imprimer: !!v.down('#commandesImprimer'), exporter: !!v.down('#commandesExporter'), lignes: v.commandeStore.getCount() };
    });
    ok('l onglet commandes non vendus a ses boutons Imprimer et Exporter, et la commande de jeu d essai', cmd.imprimer && cmd.exporter && cmd.lignes === 1, JSON.stringify(cmd));
    const nbPopups = popups.length;
    const idImp = await p.evaluate(() => Ext.ComponentQuery.query('gardemanager #commandesImprimer')[0].el.id);
    await p.click('#' + idImp);
    await p.waitForTimeout(3000);
    const popup = popups[popups.length - 1];
    ok('Imprimer ouvre UNE fois le PDF en flux, sans fenetre intermediaire',
      popups.length === nbPopups + 1 && /commandes\/pdf/.test(popup ? popup.url() : ''), popup ? popup.url() : '');
    const pdf = await octets('../api/v1/gardes/' + gardeId + '/commandes/pdf');
    fs.writeFileSync(TMP + '/commandes.pdf', Buffer.from(pdf.octets));
    const texte = execFileSync('pdftotext', ['-layout', TMP + '/commandes.pdf', '-'], { encoding: 'utf8' });
    ok('PDF des commandes : titre, garde, la ligne P0 commandee 3 / vendue 2, statut',
      /pdf/.test(pdf.type || '') && /COMMANDÉS NON VENDUS/.test(texte) && /nuit test/.test(texte) && /\b3\s+2\s+Vendu/.test(texte),
      texte.replace(/\n/g, ' | ').slice(0, 400));
    const xlsx = await octets('../api/v1/gardes/' + gardeId + '/commandes/excel');
    fs.writeFileSync(TMP + '/commandes.xlsx', Buffer.from(xlsx.octets));
    const feuille = execFileSync('python3', ['-c', "import openpyxl,sys,warnings\nwarnings.simplefilter('ignore')\nwb=openpyxl.load_workbook(sys.argv[1])\nws=wb.active\nprint('\\n'.join(' ; '.join('' if c.value is None else str(c.value) for c in row) for row in ws.iter_rows()))", TMP + '/commandes.xlsx'], { encoding: 'utf8' });
    ok('Excel des commandes : en-tetes et la ligne commandee 3 / vendue 2',
      /CIP ; Produit ; Qté commandée ; Qté vendue ; Statut/.test(feuille) && /3(\.0)? ; 2(\.0)? ; Vendu/.test(feuille), feuille.replace(/\n/g, ' | ').slice(0, 300));

    /* ------------------------------------------------------- comparaison : encodage */
    const combo = await p.evaluate(() => {
      const c = Ext.ComponentQuery.query('gardemanager #nombreGardes')[0];
      return c.getStore().getRange().map(r => r.get(c.displayField));
    });
    ok('la liste « comparer les N dernieres » affiche des caracteres reels, pas &egrave;',
      combo.some(t => /dernières/.test(t)) && !combo.some(t => /&egrave;/.test(t)), combo.join(' | '));

    ok('aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('parcours sans exception', false, e.stack || e.message);
  } finally {
    await b.close();
    purger();
    ok('jeu d essai retire', q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "-%'") === '0'
      && q("SELECT COUNT(*) FROM t_user WHERE lg_USER_ID='" + USER2 + "'") === '0');
  }
  const ko = res.filter(r => !r.c).length;
  console.log('\nTOTAL ' + (res.length - ko) + '/' + res.length + (ko ? '  FAIL=' + ko : '  OK'));
  process.exit(ko ? 1 : 0);
})();
