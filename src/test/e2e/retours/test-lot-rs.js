/* Retours des tests 3 - lots R (balance) et S (gardes).
 *
 * R : balance sur trois rangees (balance + caisse / clients + part du CA + TVA / resume en 2 lignes de 6) ;
 *     graphique de l'analyse comparative : barres fines, indicateur au choix (net TTC, ventes, achat,
 *     panier moyen, especes, mobile, tiers payant), axe entier pour les petits nombres.
 * S : indicateurs de la garde sans « ligne(s) » ni « unite(s) » ; colonne « Heures tenues » cachee ;
 *     Imprimer / Exporter des vendeurs ; filtre vendu / non vendu et colonne « % de vente » des commandes ;
 *     une seule garde cochee sur l'onglet Analyse (avertissement) ; indicateurs de chargement.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const fs = require('fs');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 360) + ']' : '')); }
const { q, exec, MOIS_A, MOIS_B, FIN_B, fr, poserJeuDEssai, retirerJeuDEssai } = require('../support/jeu-balance');
const TMP = '/tmp/claude-0/lot-rs';
const MARQUE = 'E2E-RS';

let PRODUITS = [], KGA3 = '', AUTRE = '', GROSSISTE = '';
/* Garde « nuit » du 5 au 6 mars 2027 (20 h - 8 h) : V1 P0 x2 = 1 000 (KGA3), V2 P1 x1 = 4 000 (autre),
   V3 P0 x3 = 1 500 (KGA3) ; commande a 23 h : P0 x5 (vendu 5 -> 100 %), P2 x4 (non vendu -> 0 %).
   Garde « nuit 2 » du 12 au 13 mars : V4 P1 x1 = 2 000 (autre). */
const DEBUT = '2027-03-05 20:00', FIN = '2027-03-06 08:00', DEBUT2 = '2027-03-12 20:00', FIN2 = '2027-03-13 08:00';
const VENTES = [
  { id: MARQUE + '-1', quand: '2027-03-05 20:30:00', prod: 0, qte: 2, montant: 1000, vendeur: 'KGA3' },
  { id: MARQUE + '-2', quand: '2027-03-05 21:00:00', prod: 1, qte: 1, montant: 4000, vendeur: 'AUTRE' },
  { id: MARQUE + '-3', quand: '2027-03-05 22:00:00', prod: 0, qte: 3, montant: 1500, vendeur: 'KGA3' },
  { id: MARQUE + '-4', quand: '2027-03-12 21:00:00', prod: 1, qte: 1, montant: 2000, vendeur: 'AUTRE' }
];
const COMMANDES = [{ id: MARQUE + '-ORD-1', quand: '2027-03-05 23:00:00', lignes: [[0, 5], [2, 4]] }];

function purger() {
  exec("DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "-%'");
  exec("DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "-%'");
  exec("DELETE FROM t_order_detail WHERE lg_ORDER_ID LIKE '" + MARQUE + "-ORD-%'");
  exec("DELETE FROM t_order WHERE lg_ORDER_ID LIKE '" + MARQUE + "-ORD-%'");
  exec("DELETE FROM garde WHERE libelle LIKE '" + MARQUE + " %'");
}
function semer() {
  KGA3 = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='KGA3'");
  AUTRE = q("SELECT lg_USER_ID FROM t_user WHERE str_STATUT='enable' AND str_LOGIN<>'KGA3' ORDER BY str_LOGIN DESC LIMIT 1");
  GROSSISTE = q("SELECT lg_GROSSISTE_ID FROM t_grossiste WHERE str_STATUT='enable' LIMIT 1");
  PRODUITS = q("SELECT f.lg_FAMILLE_ID FROM t_famille f WHERE f.str_STATUT='enable' AND f.lg_GROSSISTE_ID IS NOT NULL"
    + " AND f.bool_DECONDITIONNE=0 AND EXISTS (SELECT 1 FROM t_famille_stock s WHERE s.lg_FAMILLE_ID=f.lg_FAMILLE_ID AND s.str_STATUT='enable')"
    + " ORDER BY f.str_NAME LIMIT 3").split('\n').filter(Boolean).map(x => x.trim());
  purger();
  if (!KGA3 || !AUTRE || !GROSSISTE || PRODUITS.length !== 3) { return false; }
  VENTES.forEach(v => {
    const vendeur = v.vendeur === 'KGA3' ? KGA3 : AUTRE;
    exec("INSERT INTO t_preenregistrement (lg_PREENREGISTREMENT_ID, str_REF, str_REF_TICKET, int_PRICE, int_PRICE_REMISE, str_STATUT, dt_CREATED, dt_UPDATED, lg_TYPE_VENTE_ID,"
      + " lg_USER_VENDEUR_ID, lg_USER_CAISSIER_ID, lg_USER_ID, b_IS_CANCEL, b_IS_AVOIR, b_WITHOUT_BON, int_PRICE_OTHER, int_ACCOUNT, int_REMISE_PARA, montantTva, checked, copy, imported, margeug, montantttcug, montantnetug, int_SENDTOSUGGESTION)"
      + " VALUES ('" + v.id + "','" + v.id + "','0'," + v.montant + ",0,'is_Closed','" + v.quand + "','" + v.quand + "',1,'" + vendeur + "','" + KGA3 + "','" + KGA3 + "',0,0,0,0,0,0,0,1,0,0,0,0,0,0)");
    exec("INSERT INTO t_preenregistrement_detail (lg_PREENREGISTREMENT_DETAIL_ID, lg_PREENREGISTREMENT_ID, lg_FAMILLE_ID, int_QUANTITY, int_QUANTITY_SERVED, int_AVOIR, int_AVOIR_SERVED, int_PRICE,"
      + " int_PRICE_UNITAIR, int_NUMBER, dt_CREATED, dt_UPDATED, int_PRICE_REMISE, b_IS_AVOIR, int_FREE_PACK_NUMBER, int_PRICE_OTHER, int_PRICE_DETAIL_OTHER, int_UG, bool_ACCOUNT, montantTva, valeurTva, prixAchat, montanttvaug, int_AVOIR_INITIAL)"
      + " VALUES ('" + v.id + "-D','" + v.id + "','" + PRODUITS[v.prod] + "'," + v.qte + ",0,0,0," + v.montant + "," + Math.round(v.montant / v.qte) + ",0,'" + v.quand + "','" + v.quand + "',0,0,0,0,0,0,1,0,0," + Math.round(v.montant / v.qte / 2) + ",0,0)");
  });
  COMMANDES.forEach(c => {
    exec("INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)"
      + " VALUES ('" + c.id + "','" + c.id + "'," + c.lignes.length + ",'" + GROSSISTE + "','" + KGA3 + "','is_Process','" + c.quand + "','" + c.quand + "',0,0,0)");
    c.lignes.forEach((l, i) => {
      exec("INSERT INTO t_order_detail (lg_ORDERDETAIL_ID, lg_ORDER_ID, lg_FAMILLE_ID, lg_GROSSISTE_ID, int_NUMBER, int_PRICE, str_STATUT, dt_CREATED, dt_UPDATED)"
        + " VALUES ('" + c.id + "-" + i + "','" + c.id + "','" + PRODUITS[l[0]] + "','" + GROSSISTE + "'," + l[1] + ",0,'is_Process','" + c.quand + "','" + c.quand + "')");
    });
  });
  return true;
}

(async () => {
  fs.mkdirSync(TMP, { recursive: true });
  poserJeuDEssai();
  if (!semer()) { console.log('FATAL : jeu d\'essai incomplet'); purger(); retirerJeuDEssai(); process.exit(1); }
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
  const appel = (url) => p.evaluate(async (u) => { const r = await fetch(u, { credentials: 'same-origin' }); return await r.json(); }, url);
  const octets = (url) => p.evaluate(async (u) => { const r = await fetch(u, { credentials: 'same-origin' }); const buf = await r.arrayBuffer(); return { statut: r.status, type: r.headers.get('content-type'), octets: Array.from(new Uint8Array(buf)) }; }, url);
  const poster = (params) => p.evaluate(async (params) => {
    const corps = Object.keys(params).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');
    const r = await fetch('../api/v1/gardes', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: corps });
    return await r.json();
  }, params);
  const choisir = async (itemId, libelle) => {
    const id = await p.evaluate((i) => Ext.ComponentQuery.query(i)[0].getId(), itemId);
    await p.click('#' + id + ' .x-form-trigger');
    await p.waitForSelector('.x-boundlist:visible .x-boundlist-item', { timeout: 5000 });
    await p.click('.x-boundlist:visible .x-boundlist-item:text-is("' + libelle + '")');
  };
  const cliquerOnglet = async (itemId) => {
    const id = await p.evaluate((i) => Ext.ComponentQuery.query('gardemanager #' + i)[0].tab.el.id, itemId);
    await p.click('#' + id);
    await p.waitForTimeout(1500);
  };
  const cliquerGarde = async (libelle, checker) => {
    const pt = await p.evaluate(({ libelle, checker }) => {
      const g = Ext.ComponentQuery.query('gardemanager #grilleGardes')[0];
      const i = g.getStore().findExact('libelle', libelle);
      const cellule = g.getView().getNode(i).querySelector(checker ? '.x-grid-row-checker' : '.x-grid-cell:not(.x-grid-cell-row-checker) .x-grid-cell-inner');
      cellule.scrollIntoView();
      const r = cellule.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }, { libelle, checker });
    await p.mouse.click(pt.x, pt.y);
  };
  const analyseFinie = async () => {
    await p.waitForFunction(() => !/Analyse en cours/.test(Ext.ComponentQuery.query('gardemanager #gardeIndicateurs')[0].el.dom.innerHTML), null, { timeout: 20000 });
    await p.waitForTimeout(600);
  };

  try {
    /* =========================================================== R : balance */
    const ans = await appel('../api/v1/balance/balancesalecash/analyse?typePeriode=TROIS_ANS');
    const serie = ((ans.graphique || {}).series || []).find(s => (s.libelle || '').indexOf(MOIS_A.slice(0, 4)) >= 0) || {};
    const moisA = parseInt(MOIS_A.slice(5, 7), 10) - 1;
    const v = serie.valeurs || {};
    ok('R : le graphique porte chaque indicateur par serie (net TTC 35 000, 3 ventes, panier moyen, especes, mobile, tiers payant, achat)',
      v.montantNet && v.montantNet[moisA] === 35000 && v.nbreVente && v.nbreVente[moisA] === 3 && v.panierMoyen && Math.round(v.panierMoyen[moisA]) === 11667
      && v.montantEsp && v.montantMobilePayment && v.montantTp && v.montantAchat, JSON.stringify(Object.keys(v)) + ' ' + JSON.stringify({ net: (v.montantNet || [])[moisA], ventes: (v.nbreVente || [])[moisA], panier: (v.panierMoyen || [])[moisA] }));

    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('balancesalecahs', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('balancesalecahs #ventilationBalance').length > 0, null, { timeout: 20000 });
    await p.waitForTimeout(1500);
    const ids = await p.evaluate(() => {
      const vue = Ext.ComponentQuery.query('balancesalecahs')[0];
      return { du: vue.down('#dtStart').inputEl.id, au: vue.down('#dtEnd').inputEl.id, rechercher: vue.down('#rechercher').el.id, synthese: !!vue.down('#syntheseBalance') };
    });
    await p.fill('#' + ids.du, fr(MOIS_A)); await p.keyboard.press('Tab');
    await p.fill('#' + ids.au, fr(FIN_B)); await p.keyboard.press('Tab');
    await p.click('#' + ids.rechercher);
    await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('balancesalecahs #ventilationBalance')[0]; return c && c.el && /RÉSUMÉ/.test(c.el.dom.innerText); }, null, { timeout: 20000 });
    await p.waitForTimeout(800);
    const balance = await p.evaluate(() => {
      const el = Ext.ComponentQuery.query('balancesalecahs #ventilationBalance')[0].el.dom;
      const rangees = Array.from(el.querySelectorAll('.vb-rangee'));
      const titres = rangees.map(r => Array.from(r.querySelectorAll('.vb-titre')).map(t => t.innerText.trim()));
      const kpis = el.querySelector('.vb-kpis');
      const val = el.querySelector('.vb-kpi-val');
      const titre = el.querySelector('.vb-titre');
      return {
        v2: el.querySelector('.vb-v2') !== null || /vb-v2/.test(el.className) || el.querySelector('.ventilation-balance.vb-v2') !== null,
        titres, colonnesKpis: kpis ? getComputedStyle(kpis).gridTemplateColumns.split(' ').length : 0,
        nbKpis: el.querySelectorAll('.vb-kpi').length, tailleKpi: val ? parseFloat(getComputedStyle(val).fontSize) : 0,
        fondTitre: titre ? getComputedStyle(titre).backgroundColor : '', couleurTitre: titre ? getComputedStyle(titre).color : '',
        texte: el.innerText
      };
    });
    ok('R : la balance n a plus de bloc de synthese separe ; trois rangees : balance + caisse / clients + part du CA + TVA / resume',
      !ids.synthese && balance.titres.length === 3 && /BALANCE VENTE/.test(balance.titres[0][0]) && /CAISSE/.test(balance.titres[0][1])
      && /CLIENTS ET VENTES/.test(balance.titres[1][0]) && /PART DANS LE CHIFFRE/.test(balance.titres[1][1]) && /TVA/.test(balance.titres[1][2])
      && /RÉSUMÉ/.test(balance.titres[2][0]), JSON.stringify(balance.titres));
    ok('R : le resume tient sur 2 lignes de 6 indicateurs, en gros caracteres, et tous les en-tetes ont la meme couleur de bande',
      balance.nbKpis === 12 && balance.colonnesKpis === 6 && balance.tailleKpi >= 15 && balance.fondTitre === 'rgb(46, 117, 182)' && balance.couleurTitre === 'rgb(255, 255, 255)',
      JSON.stringify({ kpis: balance.nbKpis, colonnes: balance.colonnesKpis, taille: balance.tailleKpi, fond: balance.fondTitre }));
    ok('R : les chiffres restent ceux du jeu d essai (COMPTANT 3 / 23 000, TOTAL 5 / 53 000, SORTIES 500, ESPECES 22 000)',
      /COMPTANT\s+3\s+23[\s .,]000/.test(balance.texte) && /TOTAL\s+5\s+53[\s .,]000/.test(balance.texte)
      && /SORTIES\s+500/.test(balance.texte) && /ESPÈCES\s+22[\s .,]000/.test(balance.texte), balance.texte.replace(/\n/g, ' | ').slice(0, 300));
    await p.screenshot({ path: TMP + '/balance.png' });

    // analyse comparative : indicateur au choix, barres fines
    const ongletAnalyse = await p.evaluate(() => Ext.ComponentQuery.query('balancesalecahs #ongletAnalyseBalance')[0].tab.el.id);
    await p.click('#' + ongletAnalyse);
    await p.waitForTimeout(2500);
    await choisir('balancesalecahs #typePeriode', '3 dernières années');
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('balancesalecahs')[0]; return e.graphiqueCourant && e.graphiqueCourant.type === 'ANNEES'; }, null, { timeout: 60000 });
    await p.waitForTimeout(2000);
    const lireGraphique = () => p.evaluate(() => {
      const c = Ext.ComponentQuery.query('balancesalecahs #graphiqueAnalyse chart')[0];
      if (!c) { return null; }
      const serie = c.series.getAt(0);
      const store = c.store;
      const hauteur = c.getHeight();
      return { axe: c.axes.getAt(0).title, gutter: serie.gutter, groupGutter: serie.groupGutter, hauteur,
        valeurs: store.getRange().map(r => r.get('s2')), max: c.axes.getAt(0).maximum, pas: c.axes.getAt(0).majorTickSteps };
    });
    const gNet = await lireGraphique();
    ok('R : le graphique est plus bas (230 px) et ses barres plus fines (espace entre groupes 60 %)',
      gNet && gNet.hauteur <= 240 && gNet.gutter === 60 && gNet.groupGutter === 10 && gNet.axe === 'Net TTC', JSON.stringify(gNet));
    const optionsIndicateur = await p.evaluate(() => Ext.ComponentQuery.query('balancesalecahs #indicateurGraphique')[0].getStore().getRange().map(r => r.get('libelle')));
    ok('R : la liste « Graphique » propose net TTC, ventes, achat, panier moyen, especes, mobile et tiers payant',
      optionsIndicateur.length === 7 && /Net TTC/.test(optionsIndicateur[0]) && optionsIndicateur.some(l => /ventes/i.test(l)) && optionsIndicateur.some(l => /Achat/i.test(l))
      && optionsIndicateur.some(l => /Panier/i.test(l)) && optionsIndicateur.some(l => /Esp/i.test(l)) && optionsIndicateur.some(l => /Mobile/i.test(l)) && optionsIndicateur.some(l => /Tiers/i.test(l)),
      JSON.stringify(optionsIndicateur));
    await choisir('balancesalecahs #indicateurGraphique', 'Nombre de ventes');
    await p.waitForTimeout(1500);
    const gVentes = await lireGraphique();
    const serieAnnee = await p.evaluate((annee) => {
      const e = Ext.ComponentQuery.query('balancesalecahs')[0];
      return e.graphiqueCourant.series.findIndex(s => (s.libelle || '').indexOf(annee) >= 0);
    }, MOIS_A.slice(0, 4));
    const valeursAnnee = await p.evaluate((i) => Ext.ComponentQuery.query('balancesalecahs #graphiqueAnalyse chart')[0].store.getRange().map(r => r.get('s' + i)), serieAnnee);
    ok('R : choisir « Nombre de ventes » redessine le graphique sans rappeler le serveur : axe « Nombre de ventes », 3 puis 2 ventes sur les mois du jeu d essai, axe en unites entieres',
      gVentes && gVentes.axe === 'Nombre de ventes' && valeursAnnee[moisA] === 3 && valeursAnnee[parseInt(MOIS_B.slice(5, 7), 10) - 1] === 2 && gVentes.max === 3 && gVentes.pas === 2,
      JSON.stringify({ axe: gVentes && gVentes.axe, valeurs: valeursAnnee, max: gVentes && gVentes.max, pas: gVentes && gVentes.pas }));
    await p.screenshot({ path: TMP + '/analyse.png' });
    // retours des tests 4 : sur une periode libre (une barre par periode), TOUS les indicateurs a la fois
    const idsLibre = await p.evaluate(() => {
      const vue = Ext.ComponentQuery.query('balancesalecahs')[0];
      vue.down('#typePeriode').setValue('LIBRE');
      return { du: vue.down('#dtStartAnalyse').inputEl.id, au: vue.down('#dtEndAnalyse').inputEl.id, rechercher: vue.down('#rechercherAnalyse').el.id };
    });
    await p.fill('#' + idsLibre.du, fr(MOIS_A)); await p.keyboard.press('Tab');
    await p.fill('#' + idsLibre.au, fr(FIN_B)); await p.keyboard.press('Tab');
    await p.click('#' + idsLibre.rechercher);
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('balancesalecahs')[0]; return e.graphiqueCourant && e.graphiqueCourant.type === 'PERIODES'; }, null, { timeout: 60000 });
    await p.waitForTimeout(2000);
    const tous = await p.evaluate(() => {
      const c = Ext.ComponentQuery.query('balancesalecahs #graphiqueAnalyse chart')[0];
      const col = c.series.getAt(0);
      const ligne = c.store.getRange().find(r => r.get('montantNet') === 35000);
      return { series: c.series.getCount(), types: c.series.getRange().map(s => s.type), axes: c.axes.getRange().map(a => a.position),
        barres: col.yField, courbes: c.series.getRange().slice(1).map(s => s.yField), gutter: col.gutter,
        selecteurDesactive: Ext.ComponentQuery.query('balancesalecahs #indicateurGraphique')[0].isDisabled(),
        ligne: ligne ? { esp: ligne.get('montantEsp'), mobile: ligne.get('montantMobilePayment'), tp: ligne.get('montantTp'), ventes: ligne.get('nbreVente'), panier: ligne.get('panierMoyen') } : null };
    });
    ok('R4 : periode libre -> tous les indicateurs : 5 barres fines de montants (axe gauche) + 2 courbes ventes / panier (axe droit), liste « Graphique » desactivee',
      tous.series === 3 && tous.types[0] === 'column' && tous.types[1] === 'line' && tous.axes.indexOf('right') >= 0 && tous.barres.length === 5 && tous.barres[0] === 'montantNet'
      && tous.courbes.join() === 'nbreVente,panierMoyen' && tous.gutter === 40 && tous.selecteurDesactive
      && tous.ligne && tous.ligne.esp === 11000 && tous.ligne.mobile === 9000 && tous.ligne.tp === 15000 && tous.ligne.ventes === 3 && Math.abs(tous.ligne.panier - 11666.67) < 1, JSON.stringify(tous));
    const defaut = await p.evaluate(() => Ext.ComponentQuery.query('balancesalecahs #typePeriodeModes')[0].getValue());
    ok('R4 : la periode par defaut des onglets d analyse est « 3 dernieres semaines »', defaut === 'TROIS_SEMAINES', defaut);

    /* =========================================================== S : gardes */
    const g1 = await poster({ libelle: MARQUE + ' nuit', dateDebut: DEBUT, dateFin: FIN });
    const g2 = await poster({ libelle: MARQUE + ' nuit 2', dateDebut: DEBUT2, dateFin: FIN2 });
    const gardeId = (g1.data || {}).id, gardeId2 = (g2.data || {}).id;
    ok('S : deux gardes de jeu d essai enregistrees', g1.success && gardeId && g2.success && gardeId2, JSON.stringify([g1, g2]).slice(0, 200));
    const pdfV = await octets('../api/v1/gardes/' + gardeId + '/vendeurs/pdf');
    fs.writeFileSync(TMP + '/vendeurs.pdf', Buffer.from(pdfV.octets));
    const texteV = execFileSync('pdftotext', ['-layout', TMP + '/vendeurs.pdf', '-'], { encoding: 'utf8' });
    ok('S : API : le PDF des vendeurs est rendu en flux (application/pdf) avec le nom de la garde et les deux vendeurs',
      pdfV.statut === 200 && /application\/pdf/.test(pdfV.type || '') && /E2E-RS nuit/.test(texteV) && /VENDEUR/i.test(texteV) && /4[\s,.]?000/.test(texteV) && /2[\s,.]?500/.test(texteV),
      texteV.replace(/\n/g, ' | ').slice(0, 300));
    const xlsV = await octets('../api/v1/gardes/' + gardeId + '/vendeurs/excel');
    fs.writeFileSync(TMP + '/vendeurs.xlsx', Buffer.from(xlsV.octets));
    const celles = execFileSync('python3', ['-c', "import openpyxl,sys; ws=openpyxl.load_workbook(sys.argv[1]).active; print('|'.join(str(c.value) for r in ws.iter_rows() for c in r if c.value is not None))", TMP + '/vendeurs.xlsx'], { encoding: 'utf8' });
    ok('S : API : l export Excel des vendeurs porte les colonnes attendues et la part du chiffre', xlsV.statut === 200 && /Vendeur\|Ventes\|Clients\|% du chiffre\|Chiffre/.test(celles) && /61\.5/.test(celles), celles.slice(0, 300));
    const cumul = await octets('../api/v1/gardes/' + gardeId + '/vendeurs/pdf?ids=' + gardeId + ',' + gardeId2);
    fs.writeFileSync(TMP + '/vendeurs-cumul.pdf', Buffer.from(cumul.octets));
    const texteCumul = execFileSync('pdftotext', ['-layout', TMP + '/vendeurs-cumul.pdf', '-'], { encoding: 'utf8' });
    ok('S : API : sur les gardes cochees, le PDF dit « gardes cumulées » et cumule (autre vendeur 6 000)', /gardes cumul/.test(texteCumul) && /6[\s,.]?000/.test(texteCumul), texteCumul.replace(/\n/g, ' | ').slice(0, 300));

    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('gardemanager', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('gardemanager').length > 0, null, { timeout: 20000 });
    await p.waitForFunction(() => { const s = Ext.ComponentQuery.query('gardemanager')[0].gardeStore; return s && !s.isLoading() && s.getCount() > 0; }, null, { timeout: 20000 });
    await p.waitForTimeout(800);
    // espion des masques de chargement
    await p.evaluate(() => {
      window.__masques = [];
      const v = Ext.ComponentQuery.query('gardemanager')[0];
      ['ongletAnalyseGarde', 'ongletVendeurs', 'ongletCommandes', 'ongletActivite', 'ongletComparaison'].forEach(id => {
        const c = v.down('#' + id); const orig = c.setLoading;
        c.setLoading = function (x) { window.__masques.push(id + ':' + (x === false ? 'off' : 'on')); return orig.apply(this, arguments); };
      });
    });
    await cliquerGarde(MARQUE + ' nuit', false);
    await analyseFinie();
    const analyse = await p.evaluate(() => {
      const v = Ext.ComponentQuery.query('gardemanager')[0];
      const colonnes = v.down('#grilleTranches').headerCt.getGridColumns();
      const heures = colonnes.find(c => /Heures tenues/.test(c.text));
      return { indicateurs: v.down('#gardeIndicateurs').el.dom.innerText, heuresCachee: heures ? heures.hidden === true : null,
        masques: window.__masques.slice(), vendeursBoutons: !!v.down('#vendeursImprimer') && !!v.down('#vendeursExporter'),
        commandesFiltre: !!v.down('#commandesFiltre'), colonnePourcentage: v.down('#ongletCommandes').headerCt.getGridColumns().some(c => /% de vente/.test(c.text)) };
    });
    ok('S : les indicateurs de la garde ne disent plus ni « ligne(s) » ni « unité(s) » (ventes, produits, total, par heure, marge restent)',
      /3 vente\(s\)/.test(analyse.indicateurs) && /2 produit\(s\)/.test(analyse.indicateurs) && /au total/.test(analyse.indicateurs) && /par heure/.test(analyse.indicateurs)
      && !/ligne\(s\)/.test(analyse.indicateurs) && !/unit/.test(analyse.indicateurs), analyse.indicateurs);
    ok('S : la colonne « Heures tenues » est cachee', analyse.heuresCachee === true, JSON.stringify(analyse.heuresCachee));
    ok('S : choisir une garde pose l indicateur de chargement sur l onglet Analyse, puis le retire',
      analyse.masques.indexOf('ongletAnalyseGarde:on') >= 0 && analyse.masques.indexOf('ongletAnalyseGarde:off') > analyse.masques.indexOf('ongletAnalyseGarde:on'), JSON.stringify(analyse.masques));
    ok('S : boutons Imprimer / Exporter des vendeurs, filtre des commandes et colonne « % de vente » presents',
      analyse.vendeursBoutons && analyse.commandesFiltre && analyse.colonnePourcentage, JSON.stringify(analyse));
    // filtre : indicateur de chargement
    await p.evaluate(() => { window.__masques = []; });
    await choisir('gardemanager #abcClasse', 'A');
    await analyseFinie();
    const masquesFiltre = await p.evaluate(() => window.__masques.slice());
    ok('S : changer un filtre pose l indicateur de chargement sur l onglet Analyse', masquesFiltre[0] === 'ongletAnalyseGarde:on' && masquesFiltre.indexOf('ongletAnalyseGarde:off') > 0, JSON.stringify(masquesFiltre));
    await p.evaluate(() => Ext.ComponentQuery.query('gardemanager #abcClasse')[0].setValue(''));

    // une seule garde sur l'onglet Analyse
    await cliquerGarde(MARQUE + ' nuit 2', true);
    await p.waitForTimeout(1200);
    const avert = await p.evaluate(() => {
      const box = Ext.MessageBox;
      const texte = box.isVisible() ? box.el.dom.innerText : '';
      const sel = Ext.ComponentQuery.query('gardemanager #grilleGardes')[0].getSelectionModel().getSelection().map(r => r.get('libelle'));
      return { visible: box.isVisible(), texte, sel };
    });
    ok('S : sur l onglet Analyse, cocher une deuxieme garde avertit et ne garde que la derniere cochee',
      avert.visible && /une seule garde/.test(avert.texte) && avert.sel.length === 1 && avert.sel[0] === MARQUE + ' nuit 2', JSON.stringify(avert));
    await p.evaluate(() => Ext.MessageBox.hide());
    await analyseFinie();
    const indicateurs2 = await p.evaluate(() => Ext.ComponentQuery.query('gardemanager #gardeIndicateurs')[0].el.dom.innerText);
    ok('S : l analyse suit la garde restee cochee (nuit 2 : 1 vente)', /nuit 2/.test(indicateurs2) && /1 vente\(s\)/.test(indicateurs2), indicateurs2);

    // vendeurs : plusieurs gardes acceptees, chargement, editions en flux
    await p.evaluate(() => { window.__masques = []; });
    await cliquerOnglet('ongletVendeurs');
    await p.waitForFunction(() => Ext.ComponentQuery.query('gardemanager')[0].vendeurStore.getCount() > 0, null, { timeout: 15000 });
    await cliquerGarde(MARQUE + ' nuit', true);
    await p.waitForTimeout(1500);
    const vend = await p.evaluate(() => {
      const v = Ext.ComponentQuery.query('gardemanager')[0];
      return { alerte: Ext.MessageBox.isVisible(), sel: v.down('#grilleGardes').getSelectionModel().getSelection().length, masques: window.__masques.slice(), lignes: v.vendeurStore.getCount() };
    });
    ok('S : sur l onglet Vendeurs, deux gardes peuvent rester cochees (pas d avertissement), avec l indicateur de chargement',
      !vend.alerte && vend.sel === 2 && vend.masques.indexOf('ongletVendeurs:on') >= 0 && vend.masques.indexOf('ongletVendeurs:off') >= 0, JSON.stringify(vend));
    const nbPopups = popups.length;
    const idImprimerV = await p.evaluate(() => Ext.ComponentQuery.query('gardemanager #vendeursImprimer')[0].el.id);
    await p.click('#' + idImprimerV);
    await p.waitForTimeout(2500);
    const popupV = popups[popups.length - 1];
    ok('S : Imprimer (vendeurs) ouvre UNE fois l edition en flux (vendeurs/pdf), sans fenetre intermediaire',
      popups.length === nbPopups + 1 && /\/vendeurs\/pdf/.test(popupV ? popupV.url() : ''), popupV ? popupV.url() : '');
    const idHisto = await p.evaluate(() => Ext.ComponentQuery.query('gardemanager #vendeursHistorique')[0].el.id);
    await p.click('#' + idHisto);
    await p.waitForTimeout(1500);
    // un telechargement ferme aussitot sa fenetre : on espionne window.open plutot que la fenetre
    await p.evaluate(() => { window.__ouvertures = []; window.__openOrig = window.open; window.open = function (u) { window.__ouvertures.push(u); return null; }; });
    const idExporterV = await p.evaluate(() => Ext.ComponentQuery.query('gardemanager #vendeursExporter')[0].el.id);
    await p.click('#' + idExporterV);
    await p.waitForTimeout(800);
    const ouvertures = await p.evaluate(() => { const o = window.__ouvertures.splice(0); window.open = window.__openOrig; return o; });
    ok('S : Exporter (vendeurs) sur les gardes cochees passe les deux identifiants (vendeurs/excel?ids=)',
      ouvertures.length === 1 && /\/vendeurs\/excel\?ids=[^,]+,[^,]+/.test(ouvertures[0]), JSON.stringify(ouvertures));
    await p.click('#' + idHisto);
    await p.waitForTimeout(800);

    // commandes : % de vente et filtre vendu / non vendu
    await p.evaluate((libelle) => {
      const g = Ext.ComponentQuery.query('gardemanager #grilleGardes')[0];
      const sm = g.getSelectionModel();
      sm.select([g.getStore().getAt(g.getStore().findExact('libelle', libelle))], false, true);
    }, MARQUE + ' nuit');
    await p.evaluate(() => { window.__masques = []; });
    await cliquerOnglet('ongletCommandes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('gardemanager')[0].commandeStore.getCount() > 0, null, { timeout: 15000 });
    await p.waitForTimeout(600);
    const lireCommandes = () => p.evaluate(() => {
      const v = Ext.ComponentQuery.query('gardemanager')[0];
      const grille = v.down('#ongletCommandes');
      const idx = grille.headerCt.getGridColumns().findIndex(c => /% de vente/.test(c.text));
      return { lignes: Array.from(grille.getView().getEl().dom.querySelectorAll('tr.x-grid-row')).map(tr => {
        const tds = tr.querySelectorAll('td.x-grid-cell');
        return { pct: tds[idx].innerText.trim(), statut: tds[tds.length - 1].innerText.trim() };
      }), masques: window.__masques.slice() };
    });
    const cmdTous = await lireCommandes();
    ok('S : commandes : « % de vente » = quantite vendue / quantite commandee (P0 5/5 = 100,00), les non vendus restent a 0 ; indicateur de chargement',
      cmdTous.lignes.length === 2 && cmdTous.lignes.some(l => l.statut === 'Vendu' && /^100[.,]00$/.test(l.pct)) && cmdTous.lignes.some(l => l.statut === 'Non vendu' && /^0[.,]00$/.test(l.pct))
      && cmdTous.masques.indexOf('ongletCommandes:on') >= 0, JSON.stringify(cmdTous));
    await choisir('gardemanager #commandesFiltre', 'Non vendus');
    await p.waitForTimeout(600);
    const cmdNon = await lireCommandes();
    await choisir('gardemanager #commandesFiltre', 'Vendus');
    await p.waitForTimeout(600);
    const cmdVendus = await lireCommandes();
    await choisir('gardemanager #commandesFiltre', 'Tous');
    await p.waitForTimeout(600);
    const cmdRetour = await lireCommandes();
    ok('S : le filtre « Non vendus » / « Vendus » / « Tous » s applique sur place (1 / 1 / 2 lignes)',
      cmdNon.lignes.length === 1 && cmdNon.lignes[0].statut === 'Non vendu' && cmdVendus.lignes.length === 1 && cmdVendus.lignes[0].statut === 'Vendu' && cmdRetour.lignes.length === 2,
      JSON.stringify([cmdNon.lignes, cmdVendus.lignes, cmdRetour.lignes.length]));
    await p.screenshot({ path: TMP + '/commandes.png' });

    // retour sur Analyse avec deux gardes cochees : avertissement a l'ouverture de l'onglet
    await p.evaluate((libelle) => {
      const g = Ext.ComponentQuery.query('gardemanager #grilleGardes')[0];
      g.getSelectionModel().select([g.getStore().getAt(g.getStore().findExact('libelle', libelle))], true, true);
    }, MARQUE + ' nuit 2');
    await cliquerOnglet('ongletAnalyseGarde');
    const retour = await p.evaluate(() => ({ alerte: Ext.MessageBox.isVisible(), sel: Ext.ComponentQuery.query('gardemanager #grilleGardes')[0].getSelectionModel().getSelection().length }));
    ok('S : ouvrir l onglet Analyse avec deux gardes cochees avertit et n en garde qu une', retour.alerte && retour.sel === 1, JSON.stringify(retour));
    await p.evaluate(() => Ext.MessageBox.hide());

    ok('aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('deroulement sans exception', false, e.stack || e.message);
    await p.screenshot({ path: TMP + '/erreur.png' }).catch(() => {});
  } finally {
    await b.close();
    purger();
    retirerJeuDEssai();
  }
  const echecs = res.filter(r => !r.c).length;
  console.log('\nlot R/S : ' + (res.length - echecs) + '/' + res.length + ' PASS');
  process.exit(echecs ? 1 : 0);
})();
