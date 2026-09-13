/* Nouveau menu « Analyse article » : matrice marge x rotation, produits achetes ensemble, Excel, PDF, inventaire.
 *
 * Jeu d'essai (avril 2027, periode libre) : quatre produits tailles pour tomber chacun dans un quadrant avec les
 * medianes comme seuils, et trois tickets qui portent P1 et P2 ensemble.
 *   P1 : 10 vendus a 1 000 (achat 500), stock 2   -> marge 50 %, rotation 5     : champion
 *   P2 : 1 vendu a 1 000 (achat 400),   stock 20  -> marge 60 %, rotation 0,05  : rentable mais lent
 *   P3 : 8 vendus a 1 000 (achat 950),  stock 1   -> marge 5 %,  rotation 8     : volume fort, peu rentable
 *   P4 : 1 vendu a 1 000 (achat 900),   stock 50  -> marge 10 %, rotation 0,02  : a risque
 *   P5 : 3 vendus a 500 (achat 250),    stock 0   -> marge 50 %, rotation 3     : champion (epuise)
 * Medianes : taux 50 %, rotation 3.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const fs = require('fs');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 360) + ']' : '')); }
const { q, exec } = require('../support/jeu-balance');
const TMP = '/tmp/claude-0/analyse-article';
const MARQUE = 'E2E-AA';
const DEBUT = '2027-04-01', FIN = '2027-04-30';

let PRODUITS = [], KGA3 = '', STOCKS_AVANT = [];
const STOCKS = [2, 20, 1, 50];
/* [ticket, produit, quantite, prix unitaire, achat unitaire] ; P1 et P2 partagent les tickets T1, T2, T3 */
const LIGNES = [
  ['T1', 0, 4, 1000, 500], ['T2', 0, 3, 1000, 500], ['T3', 0, 3, 1000, 500],
  ['T1', 1, 1, 1000, 400],
  ['T2', 2, 8, 1000, 950],
  ['T3', 3, 1, 1000, 900]
];
// P5, produit temoin epuise (stock 0), partage les trois tickets avec P1 : la paire P1 + P5 vaut 3 tickets.
LIGNES.push(['T1', 4, 1, 500, 250], ['T2', 4, 1, 500, 250], ['T3', 4, 1, 500, 250]);

function purger() {
  exec("DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "-%'");
  exec("DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "-%'");
  exec("DELETE FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID IN (SELECT lg_INVENTAIRE_ID FROM t_inventaire WHERE str_NAME LIKE 'INVENTAIRE ANALYSE ARTICLE%" + MARQUE + "%')");
  exec("DELETE FROM t_inventaire WHERE str_NAME LIKE 'INVENTAIRE ANALYSE ARTICLE%" + MARQUE + "%'");
  STOCKS_AVANT.forEach((s, i) => {
    if (s !== null && PRODUITS[i]) {
      exec("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE=" + s + " WHERE lg_FAMILLE_ID='" + PRODUITS[i] + "' AND lg_EMPLACEMENT_ID='1'");
    }
  });
}
function semer() {
  KGA3 = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='KGA3'");
  PRODUITS = q("SELECT f.lg_FAMILLE_ID FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID=f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID='1'"
    + " WHERE f.str_STATUT='enable' AND f.bool_DECONDITIONNE=0 ORDER BY f.str_NAME LIMIT 5").split('\n').filter(Boolean).map(x => x.trim());
  if (!KGA3 || PRODUITS.length !== 5) { return false; }
  STOCKS_AVANT = PRODUITS.map(id => q("SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_FAMILLE_ID='" + id + "' AND lg_EMPLACEMENT_ID='1' LIMIT 1"));
  purger();
  STOCKS.concat([0]).forEach((s, i) => exec("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE=" + s + " WHERE lg_FAMILLE_ID='" + PRODUITS[i] + "' AND lg_EMPLACEMENT_ID='1'"));
  const tickets = {};
  LIGNES.forEach(l => { tickets[l[0]] = (tickets[l[0]] || 0) + l[2] * l[3]; });
  Object.keys(tickets).forEach((t, i) => {
    const id = MARQUE + '-' + t, quand = '2027-04-1' + i + ' 10:00:00';
    exec("INSERT INTO t_preenregistrement (lg_PREENREGISTREMENT_ID, str_REF, str_REF_TICKET, int_PRICE, int_PRICE_REMISE, str_STATUT, dt_CREATED, dt_UPDATED, lg_TYPE_VENTE_ID,"
      + " lg_USER_VENDEUR_ID, lg_USER_CAISSIER_ID, lg_USER_ID, b_IS_CANCEL, b_IS_AVOIR, b_WITHOUT_BON, int_PRICE_OTHER, int_ACCOUNT, int_REMISE_PARA, montantTva, checked, copy, imported, margeug, montantttcug, montantnetug, int_SENDTOSUGGESTION)"
      + " VALUES ('" + id + "','" + id + "','0'," + tickets[t] + ",0,'is_Closed','" + quand + "','" + quand + "',1,'" + KGA3 + "','" + KGA3 + "','" + KGA3 + "',0,0,0,0,0,0,0,1,0,0,0,0,0,0)");
  });
  LIGNES.forEach((l, k) => {
    const id = MARQUE + '-' + l[0];
    exec("INSERT INTO t_preenregistrement_detail (lg_PREENREGISTREMENT_DETAIL_ID, lg_PREENREGISTREMENT_ID, lg_FAMILLE_ID, int_QUANTITY, int_QUANTITY_SERVED, int_AVOIR, int_AVOIR_SERVED, int_PRICE,"
      + " int_PRICE_UNITAIR, int_NUMBER, dt_CREATED, dt_UPDATED, int_PRICE_REMISE, b_IS_AVOIR, int_FREE_PACK_NUMBER, int_PRICE_OTHER, int_PRICE_DETAIL_OTHER, int_UG, bool_ACCOUNT, montantTva, valeurTva, prixAchat, montanttvaug, int_AVOIR_INITIAL)"
      + " VALUES ('" + id + "-" + k + "','" + id + "','" + PRODUITS[l[1]] + "'," + l[2] + ",0,0,0," + (l[2] * l[3]) + "," + l[3] + ",0,'2027-04-10 10:00:00','2027-04-10 10:00:00',0,0,0,0,0,0,1,0,0," + l[4] + ",0,0)");
  });
  return true;
}

(async () => {
  fs.mkdirSync(TMP, { recursive: true });
  if (!semer()) { console.log('FATAL : jeu d\'essai incomplet'); purger(); process.exit(1); }
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1800, height: 1000 } });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
  await p.waitForTimeout(2500);
  const appel = (url) => p.evaluate(async (u) => { const r = await fetch(u, { credentials: 'same-origin' }); return await r.json(); }, url);
  const octets = (url) => p.evaluate(async (u) => { const r = await fetch(u, { credentials: 'same-origin' }); const buf = await r.arrayBuffer(); return { statut: r.status, type: r.headers.get('content-type'), octets: Array.from(new Uint8Array(buf)) }; }, url);
  const PERIODE = 'typePeriode=LIBRE&dtStart=' + DEBUT + '&dtEnd=' + FIN;
  const par = (data, i) => (data || []).find(l => l.produitId === PRODUITS[i]) || {};

  try {
    /* ------------------------------------------------------------- API */
    const m = await appel('../api/v1/analyse-article/matrice?' + PERIODE + '&limit=0');
    const p1 = par(m.data, 0), p2 = par(m.data, 1), p3 = par(m.data, 2), p4 = par(m.data, 3), p5 = par(m.data, 4);
    ok('API : la periode libre est reprise (30 jours), 5 produits vendus, seuils = medianes (marge 50 %, rotation 3)',
      m.success && m.periode && m.periode.jours === 30 && m.totalProduits === 5 && m.seuils.marge === 50 && m.seuils.rotation === 3
      && m.seuils.medianeMarge === 50 && m.seuils.medianeRotation === 3, JSON.stringify(m.seuils) + ' ' + JSON.stringify(m.periode));
    ok('API : marge et rotation par produit (P1 50 % / 5 ; P2 60 % / 0,05 ; P3 5 % / 8 ; P4 10 % / 0,02 ; P5 epuise : rotation = 3)',
      p1.tauxMarge === 50 && p1.rotation === 5 && p2.tauxMarge === 60 && p2.rotation === 0.05 && p3.tauxMarge === 5 && p3.rotation === 8
      && p4.tauxMarge === 10 && p4.rotation === 0.02 && p5.stock === 0 && p5.rotation === 3, JSON.stringify([p1, p2, p3, p4, p5].map(x => [x.tauxMarge, x.rotation, x.stock])));
    ok('API : chaque produit dans son quadrant avec sa decision (P1 champion, P2 rentable mais lent, P3 volume fort, P4 a risque)',
      p1.quadrant === 1 && /conseil actif/.test(p1.decision) && p2.quadrant === 2 && /à la demande/.test(p2.decision)
      && p3.quadrant === 3 && /prix d'achat/.test(p3.decision) && p4.quadrant === 4 && /déréférencement/.test(p4.decision),
      JSON.stringify([p1.quadrant, p2.quadrant, p3.quadrant, p4.quadrant, p5.quadrant]));
    ok('API : couverture en jours (P2 : 20 en stock pour 1 vendu en 30 jours = 600 j), valeur de stock (P2 : 20 x 400 = 8 000), classe ABC a cote',
      p2.couverture === 600 && p2.valeurStock === 8000 && p1.classe === 'A' && p4.classe === 'C', JSON.stringify([p2.couverture, p2.valeurStock, p1.classe, p3.classe, p4.classe]));
    const resume = m.quadrants || [];
    ok('API : le resume des quadrants cumule produits, CA, marge, stock et part du CA (champions : 2 produits dont P5, CA 11 500)',
      resume.length === 4 && resume[0].produits === 2 && resume[0].montant === 11500 && resume[3].produits === 1 && resume[3].montant === 1000
      && resume.every(r => r.decision && r.libelle), JSON.stringify(resume.map(r => [r.libelle, r.produits, r.montant])));
    const filtre = await appel('../api/v1/analyse-article/matrice?' + PERIODE + '&quadrant=4&limit=0');
    ok('API : le filtre par quadrant isole (quadrant 4 -> P4 seul)', filtre.total === 1 && filtre.data[0].produitId === PRODUITS[3], JSON.stringify(filtre.total));
    const seuils = await appel('../api/v1/analyse-article/matrice?' + PERIODE + '&seuilMarge=55&seuilRotation=1&limit=0');
    ok('API : des seuils saisis remplacent les medianes (marge >= 55 : seul P2 en marge elevee ; rotation >= 1 : P1, P3, P5)',
      seuils.seuils.marge === 55 && seuils.seuils.rotation === 1 && par(seuils.data, 0).quadrant === 3 && par(seuils.data, 1).quadrant === 2 && par(seuils.data, 3).quadrant === 4,
      JSON.stringify(seuils.data.map(x => x.quadrant)));
    const paires = await appel('../api/v1/analyse-article/paires?' + PERIODE + '&minimum=3&limite=100');
    const paire = (paires.data || [])[0] || {};
    ok('API : la paire la plus frequente est P1 + P5 (3 tickets ensemble, 100 % des tickets de chacun) ; aucune autre n atteint 3',
      paires.total === 1 && [paire.produit1Id, paire.produit2Id].sort().join() === [PRODUITS[0], PRODUITS[4]].sort().join() && paire.tickets === 3
      && paire.part1 === 100 && paire.part2 === 100, JSON.stringify(paires.data));
    const paires2 = await appel('../api/v1/analyse-article/paires?' + PERIODE + '&minimum=1&limite=100');
    ok('API : avec un minimum de 1, les autres paires apparaissent (P1+P2, P1+P3, P1+P4, P2+P5, ...), la plus frequente en tete',
      paires2.total >= 5 && paires2.data[0].tickets === 3 && paires2.data.every(x => x.tickets >= 1), JSON.stringify(paires2.total));

    const xls = await octets('../api/v1/analyse-article/matrice/excel?' + PERIODE);
    fs.writeFileSync(TMP + '/matrice.xlsx', Buffer.from(xls.octets));
    const cellules = execFileSync('python3', ['-c', "import openpyxl,sys; ws=openpyxl.load_workbook(sys.argv[1]).active; print('|'.join(str(c.value) for r in ws.iter_rows() for c in r if c.value is not None))", TMP + '/matrice.xlsx'], { encoding: 'utf8' });
    ok('Excel matrice : titre, seuils, colonnes (Quadrant ... Décision) et les quatre quadrants',
      xls.statut === 200 && /MARGE × ROTATION/.test(cellules) && /Quadrant\|CIP\|Produit\|Quantité\|Tickets\|Chiffre d'affaires\|Marge\|Taux marge %\|Stock\|Rotation\|Couverture/.test(cellules)
      && /Champions/.test(cellules) && /Produits à risque/.test(cellules) && /déréférencement/.test(cellules), cellules.slice(0, 300));
    const xlsP = await octets('../api/v1/analyse-article/paires/excel?' + PERIODE + '&minimum=3');
    fs.writeFileSync(TMP + '/paires.xlsx', Buffer.from(xlsP.octets));
    const cellulesP = execFileSync('python3', ['-c', "import openpyxl,sys; ws=openpyxl.load_workbook(sys.argv[1]).active; print('|'.join(str(c.value) for r in ws.iter_rows() for c in r if c.value is not None))", TMP + '/paires.xlsx'], { encoding: 'utf8' });
    ok('Excel paires : les deux produits, les tickets ensemble et les parts', xlsP.statut === 200 && /ACHETÉS ENSEMBLE/.test(cellulesP) && /Tickets ensemble/.test(cellulesP) && /\|3\.0\|/.test(cellulesP), cellulesP.slice(0, 300));
    const pdf = await octets('../api/v1/analyse-article/matrice/pdf?' + PERIODE);
    fs.writeFileSync(TMP + '/matrice.pdf', Buffer.from(pdf.octets));
    const texte = execFileSync('pdftotext', ['-layout', TMP + '/matrice.pdf', '-'], { encoding: 'utf8' });
    ok('PDF matrice : rendu en flux, resume des quadrants avec decisions, liste avec quadrant, ABC et total',
      pdf.statut === 200 && /application\/pdf/.test(pdf.type || '') && /MARGE × ROTATION/.test(texte) && /Champions : 2 produit/.test(texte)
      && /conseil actif/.test(texte) && /TOTAL : 5 produit/.test(texte), texte.replace(/\n/g, ' | ').slice(0, 400));

    /* ------------------------------------------------------------- ecran */
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('analysearticle', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('analysearticle #grilleArticles').length > 0, null, { timeout: 20000 });
    await p.waitForFunction(() => !Ext.ComponentQuery.query('analysearticle')[0].articleStore.isLoading(), null, { timeout: 60000 });
    await p.waitForTimeout(800);
    const ouverture = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('analysearticle')[0];
      return { periode: e.down('#typePeriode').getValue(), entete: e.down('#quadrants').el.dom.innerText, onglets: e.down('#ongletsAnalyse').items.getCount(),
        boutons: ['creerInventaire', 'exporterExcel', 'imprimer', 'analyser', 'seuilMarge', 'seuilRotation', 'filtreQuadrant', 'filtreRayon', 'filtreFamille', 'filtreGrossiste', 'recherche'].every(id => !!e.down('#' + id)) };
    });
    ok('ecran : ouvert sur « 3 derniers mois », deux onglets, quatre quadrants et les boutons (inventaire, Excel, imprimer, seuils, filtres)',
      ouverture.periode === 'TROIS_MOIS' && ouverture.onglets === 2 && ouverture.boutons && /Champions/.test(ouverture.entete) && /Produits à risque/.test(ouverture.entete)
      && /Période/.test(ouverture.entete), JSON.stringify(ouverture).slice(0, 300));
    // periode libre au clavier
    const ids = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('analysearticle')[0];
      const c = e.down('#typePeriode'); c.setValue('LIBRE'); c.fireEvent('select', c, [c.findRecordByValue('LIBRE')]);
      return { du: e.down('#dtStart').inputEl.id, au: e.down('#dtEnd').inputEl.id, analyser: e.down('#analyser').el.id };
    });
    await p.fill('#' + ids.du, '01/04/2027'); await p.keyboard.press('Tab');
    await p.fill('#' + ids.au, '30/04/2027'); await p.keyboard.press('Tab');
    await p.click('#' + ids.analyser);
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('analysearticle')[0]; return !e.articleStore.isLoading() && e.derniereAnalyse && e.derniereAnalyse.totalProduits === 5; }, null, { timeout: 60000 });
    await p.waitForTimeout(800);
    const analyse = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('analysearticle')[0];
      const cases = Array.from(e.down('#quadrants').el.dom.querySelectorAll('.aa-quadrant')).map(d => d.innerText.replace(/\s+/g, ' '));
      return { entete: e.down('#quadrants').el.dom.querySelector('.aa-entete').innerText, cases, lignes: e.articleStore.getCount(),
        colonnes: e.down('#grilleArticles').headerCt.getGridColumns().map(c => c.text) };
    });
    ok('ecran : l en-tete rappelle la periode, les seuils et les medianes ; chaque case porte ses chiffres et sa decision',
      /01\/04\/2027 au 30\/04\/2027/.test(analyse.entete) && /50,0 %/.test(analyse.entete) && /3,00/.test(analyse.entete) && analyse.cases.length === 4
      && /Champions.*2 produit\(s\).*conseil actif/.test(analyse.cases[0]) && /Produits à risque.*1 produit\(s\).*déréférencement/.test(analyse.cases[3]) && analyse.lignes === 5,
      analyse.entete + ' || ' + analyse.cases.join(' || ').slice(0, 300));
    ok('ecran : colonnes Quadrant, CIP, Produit, Qté, Tickets, Chiffre, Marge, Taux %, Stock, Rotation, Couv., Valeur stock, ABC',
      ['Quadrant', 'CIP', 'Produit', 'Qté', 'Tickets', 'Chiffre', 'Marge', 'Taux %', 'Stock', 'Rotation', 'Couv. (j)', 'Valeur stock', 'ABC'].every(c => analyse.colonnes.indexOf(c) >= 0), analyse.colonnes.join(' | '));
    // clic sur la case « Produits a risque » : la liste se filtre ; second clic : tous
    await p.click('.aa-quadrant[data-quadrant="4"]');
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('analysearticle')[0]; return !e.articleStore.isLoading() && e.articleStore.getCount() === 1; }, null, { timeout: 30000 });
    const risque = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('analysearticle')[0];
      return { filtre: e.down('#filtreQuadrant').getValue(), produit: e.articleStore.getAt(0).get('produitId'), actif: e.down('#quadrants').el.dom.querySelectorAll('.aa-quadrant.aa-actif').length };
    });
    ok('ecran : un clic sur une case filtre la liste sur ce quadrant et la met en avant', risque.filtre === 4 && risque.produit === PRODUITS[3] && risque.actif === 1, JSON.stringify(risque));
    await p.click('.aa-quadrant[data-quadrant="4"]');
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('analysearticle')[0]; return !e.articleStore.isLoading() && e.articleStore.getCount() === 5; }, null, { timeout: 30000 });
    // exports et impression : en flux, une seule fenetre
    await p.evaluate(() => { window.__ouvertures = []; window.__openOrig = window.open; window.open = function (u) { window.__ouvertures.push(u); return null; }; });
    for (const id of ['exporterExcel', 'imprimer']) {
      const bid = await p.evaluate((i) => Ext.ComponentQuery.query('analysearticle #' + i)[0].el.id, id);
      await p.click('#' + bid); await p.waitForTimeout(400);
    }
    const ouvertures = await p.evaluate(() => window.__ouvertures.splice(0));
    ok('ecran : Exporter Excel et Imprimer ouvrent chacun UNE fois l edition en flux avec la periode libre',
      ouvertures.length === 2 && /matrice\/excel\?.*typePeriode=LIBRE.*dtStart=2027-04-01/.test(ouvertures[0]) && /matrice\/pdf\?.*dtEnd=2027-04-30/.test(ouvertures[1]), JSON.stringify(ouvertures));
    // inventaire des produits coches
    await p.evaluate((ids) => {
      const g = Ext.ComponentQuery.query('analysearticle #grilleArticles')[0];
      g.getSelectionModel().select(g.getStore().getRange().filter(r => ids.indexOf(r.get('produitId')) >= 0));
    }, [PRODUITS[0], PRODUITS[2]]);
    const compte = await p.evaluate(() => Ext.ComponentQuery.query('analysearticle #compteCoches')[0].text);
    const idInv = await p.evaluate(() => Ext.ComponentQuery.query('analysearticle #creerInventaire')[0].el.id);
    await p.click('#' + idInv);
    await p.waitForTimeout(800);
    const question = await p.evaluate(() => Ext.MessageBox.isVisible() ? Ext.MessageBox.el.dom.innerText : '');
    await p.evaluate(() => { const boutonOui = Ext.MessageBox.msgButtons.yes; boutonOui.el.dom.click(); });
    await p.waitForFunction(() => Ext.MessageBox.isVisible() && /Inventaire/.test(Ext.MessageBox.el.dom.innerText) && !/patienter/i.test(Ext.MessageBox.el.dom.innerText), null, { timeout: 30000 });
    const reponse = await p.evaluate(() => Ext.MessageBox.el.dom.innerText);
    await p.evaluate(() => Ext.MessageBox.hide());
    const inventaires = q("SELECT COUNT(*) FROM t_inventaire WHERE str_NAME LIKE 'INVENTAIRE ANALYSE ARTICLE%'");
    const dernierInv = q("SELECT lg_INVENTAIRE_ID FROM t_inventaire WHERE str_NAME LIKE 'INVENTAIRE ANALYSE ARTICLE%' ORDER BY dt_CREATED DESC LIMIT 1");
    const lignesInv = q("SELECT COUNT(*) FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID='" + dernierInv + "'");
    ok('ecran : « Créer un inventaire » demande confirmation pour les 2 produits coches, puis cree l inventaire avec 2 produits',
      /2 produit\(s\) coché/.test(compte.replace(/<[^>]+>/g, '')) && /2 produit\(s\) coché/.test(question) && /créé avec 2 produit/.test(reponse) && parseInt(inventaires, 10) >= 1 && lignesInv === '2',
      JSON.stringify({ compte, question: question.slice(0, 120), reponse: reponse.slice(0, 120), inventaires, lignesInv }));
    // onglet Achetes ensemble
    const tab = await p.evaluate(() => Ext.ComponentQuery.query('analysearticle #ongletPaires')[0].tab.el.id);
    await p.click('#' + tab);
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('analysearticle')[0]; return !e.paireStore.isLoading() && e.paireStore.getCount() > 0; }, null, { timeout: 30000 });
    const pairesEcran = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('analysearticle')[0];
      return { n: e.paireStore.getCount(), premiere: e.paireStore.getAt(0).getData(), colonnes: e.down('#ongletPaires').headerCt.getGridColumns().map(c => c.text) };
    });
    ok('ecran : l onglet « Achetés ensemble » montre la paire P1 + P5 (3 tickets, 100 %) avec ses colonnes',
      pairesEcran.n === 1 && pairesEcran.premiere.tickets === 3 && pairesEcran.premiere.part1 === 100 && pairesEcran.colonnes.indexOf('Tickets ensemble') >= 0
      && pairesEcran.colonnes.indexOf('% des tickets du produit 1') >= 0, JSON.stringify(pairesEcran).slice(0, 300));
    await p.screenshot({ path: TMP + '/paires.png' });
    const tabM = await p.evaluate(() => Ext.ComponentQuery.query('analysearticle #ongletMatrice')[0].tab.el.id);
    await p.click('#' + tabM); await p.waitForTimeout(800);
    await p.screenshot({ path: TMP + '/matrice.png' });
    ok('aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('deroulement sans exception', false, e.stack || e.message);
    await p.screenshot({ path: TMP + '/erreur.png' }).catch(() => {});
  } finally {
    await b.close();
    exec("DELETE FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID IN (SELECT lg_INVENTAIRE_ID FROM t_inventaire WHERE str_NAME LIKE 'INVENTAIRE ANALYSE ARTICLE%')");
    exec("DELETE FROM t_inventaire WHERE str_NAME LIKE 'INVENTAIRE ANALYSE ARTICLE%'");
    purger();
  }
  const echecs = res.filter(r => !r.c).length;
  console.log('\nanalyse article : ' + (res.length - echecs) + '/' + res.length + ' PASS');
  process.exit(echecs ? 1 : 0);
})();
