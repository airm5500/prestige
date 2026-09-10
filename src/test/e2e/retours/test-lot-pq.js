/* Retours des tests 2 - lots P (balance) et Q (gardes).
 *
 * P : sorties de caisse en rouge et separateur de milliers ; « COMPTANT / CREDIT » sans VNO / VO ; TVA dans
 *     l'ordre des taux ; onglet cache « Balance (ancienne) » sous privilege P_BALANCE_ANCIENNE_PRESENTATION
 *     (grille historique, barres de resume, edition historique) ; nouvelle edition PDF de la nouvelle
 *     presentation ; l'analyse sur 3 ans repond vite.
 * Q : stock de la fiche article ; garde de plus de 8 jours : avertissement et confirmation ; bouton
 *     « Actualiser l'analyse » ; lignes du resume ABC aux couleurs des classes ; filtres numeriques combinables
 *     (stock, quantite vendue, % marge) ; part de chaque vendeur dans le chiffre ; axe « Gardes comparees ».
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const fs = require('fs');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 360) + ']' : '')); }
const { q, exec, MOIS_A, FIN_B, fr, poserJeuDEssai, retirerJeuDEssai } = require('../support/jeu-balance');
const TMP = '/tmp/claude-0/lot-pq';
const MARQUE = 'E2E-PQ';
const ROLE_KGA3 = q("SELECT ru.lg_ROLE_ID FROM t_role_user ru JOIN t_user u ON u.lg_USER_ID=ru.lg_USER_ID WHERE u.str_LOGIN='KGA3' LIMIT 1");
const PRIVILEGE = q("SELECT lg_PRIVELEGE_ID FROM t_privilege WHERE str_NAME='P_BALANCE_ANCIENNE_PRESENTATION'");

let PRODUITS = [], USER = '', STOCK_AVANT = null;
const DEBUT = '2027-02-05 20:00', FIN = '2027-02-06 08:00';
const VENTES = [
  { id: MARQUE + '-1', quand: '2027-02-05 20:30:00', prod: 0, qte: 2, montant: 1000, achat: 300 },   // marge 40 %
  { id: MARQUE + '-2', quand: '2027-02-05 23:15:00', prod: 1, qte: 10, montant: 4000, achat: 200 },  // marge 50 %
  { id: MARQUE + '-3', quand: '2027-02-06 03:00:00', prod: 2, qte: 1, montant: 600, achat: 900 }     // marge -50 %
];
function purgerGarde() {
  exec("DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "-%'");
  exec("DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "-%'");
  exec("DELETE FROM garde WHERE libelle LIKE '" + MARQUE + " %'");
  if (PRODUITS[0] && STOCK_AVANT !== null) {
    exec("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE=" + STOCK_AVANT + " WHERE lg_FAMILLE_ID='" + PRODUITS[0] + "' AND lg_EMPLACEMENT_ID='1'");
    STOCK_AVANT = null;
  }
  exec("DELETE FROM t_role_privelege WHERE lg_ROLE_PRIVILEGE='" + MARQUE + "-PRIV'");
}
function semerGarde() {
  USER = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='KGA3'");
  PRODUITS = q("SELECT f.lg_FAMILLE_ID FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID=f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID='1'"
    + " WHERE f.str_STATUT='enable' AND f.bool_DECONDITIONNE=0 ORDER BY f.str_NAME LIMIT 3").split('\n').filter(Boolean).map(x => x.trim());
  if (!USER || PRODUITS.length !== 3) { return false; }
  STOCK_AVANT = q("SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_FAMILLE_ID='" + PRODUITS[0] + "' AND lg_EMPLACEMENT_ID='1' LIMIT 1");
  exec("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE=7 WHERE lg_FAMILLE_ID='" + PRODUITS[0] + "' AND lg_EMPLACEMENT_ID='1'");
  VENTES.forEach(v => {
    exec("INSERT INTO t_preenregistrement (lg_PREENREGISTREMENT_ID, str_REF, str_REF_TICKET, int_PRICE, int_PRICE_REMISE, str_STATUT, dt_CREATED, dt_UPDATED, lg_TYPE_VENTE_ID,"
      + " lg_USER_VENDEUR_ID, lg_USER_CAISSIER_ID, lg_USER_ID, b_IS_CANCEL, b_IS_AVOIR, b_WITHOUT_BON, int_PRICE_OTHER, int_ACCOUNT, int_REMISE_PARA, montantTva, checked, copy, imported, margeug, montantttcug, montantnetug, int_SENDTOSUGGESTION)"
      + " VALUES ('" + v.id + "','" + v.id + "','0'," + v.montant + ",0,'is_Closed','" + v.quand + "','" + v.quand + "',1,'" + USER + "','" + USER + "','" + USER + "',0,0,0,0,0,0,0,1,0,0,0,0,0,0)");
    exec("INSERT INTO t_preenregistrement_detail (lg_PREENREGISTREMENT_DETAIL_ID, lg_PREENREGISTREMENT_ID, lg_FAMILLE_ID, int_QUANTITY, int_QUANTITY_SERVED, int_AVOIR, int_AVOIR_SERVED, int_PRICE,"
      + " int_PRICE_UNITAIR, int_NUMBER, dt_CREATED, dt_UPDATED, int_PRICE_REMISE, b_IS_AVOIR, int_FREE_PACK_NUMBER, int_PRICE_OTHER, int_PRICE_DETAIL_OTHER, int_UG, bool_ACCOUNT, montantTva, valeurTva, prixAchat, montanttvaug, int_AVOIR_INITIAL)"
      + " VALUES ('" + v.id + "-D','" + v.id + "','" + PRODUITS[v.prod] + "'," + v.qte + ",0,0,0," + v.montant + "," + Math.round(v.montant / v.qte) + ",0,'" + v.quand + "','" + v.quand + "',0,0,0,0,0,0,1,0,0," + v.achat + ",0,0)");
  });
  return true;
}

(async () => {
  fs.mkdirSync(TMP, { recursive: true });
  poserJeuDEssai();
  purgerGarde();
  if (!semerGarde()) { console.log('FATAL : jeu d\'essai incomplet'); purgerGarde(); retirerJeuDEssai(); process.exit(1); }
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1800, height: 1000 } });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  const popups = []; ctx.on('page', pg => popups.push(pg));
  const connexion = async () => {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 30000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
    await p.waitForTimeout(2500);
  };
  await connexion();
  const appel = (url) => p.evaluate(async (u) => { const r = await fetch(u, { credentials: 'same-origin' }); return await r.json(); }, url);
  const octets = (url) => p.evaluate(async (u) => { const r = await fetch(u, { credentials: 'same-origin' }); const buf = await r.arrayBuffer(); return { statut: r.status, type: r.headers.get('content-type'), octets: Array.from(new Uint8Array(buf)) }; }, url);
  const poster = (params) => p.evaluate(async (params) => {
    const corps = Object.keys(params).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');
    const r = await fetch('../api/v1/gardes', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: corps });
    return await r.json();
  }, params);
  const ouvrirBalance = async () => {
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('balancesalecahs', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('balancesalecahs #ventilationBalance').length > 0, null, { timeout: 20000 });
    await p.waitForTimeout(1500);
  };
  const analyseFinie = async () => {
    await p.waitForFunction(() => !/Analyse en cours/.test(Ext.ComponentQuery.query('gardemanager #gardeIndicateurs')[0].el.dom.innerHTML), null, { timeout: 20000 });
    await p.waitForTimeout(500);
  };

  try {
    /* =========================================================== P : balance */
    const t0 = Date.now();
    const ans = await appel('../api/v1/balance/balancesalecash/analyse?typePeriode=TROIS_ANS');
    const dureeAns = Date.now() - t0;
    ok('P : l analyse sur 3 ans repond (sous-requete bornee) en moins de 15 s sur le banc', ans.success && dureeAns < 15000, dureeAns + ' ms');
    const priv = await appel('../api/v1/balance/balancesalecash/privileges');
    ok('P : sans le privilege, l ancienne presentation n est pas proposee (API)', priv.success && priv.anciennePresentation === false, JSON.stringify(priv));

    await ouvrirBalance();
    const ids = await p.evaluate(() => {
      const vue = Ext.ComponentQuery.query('balancesalecahs')[0];
      return { du: vue.down('#dtStart').inputEl.id, au: vue.down('#dtEnd').inputEl.id, rechercher: vue.down('#rechercher').el.id,
        ancienneVisible: vue.down('#ongletBalanceAncienne').tab.isVisible(), grilleAncienneVisible: vue.down('#balanceGrid').isVisible() };
    });
    ok('P : sur l onglet Balance, l ancienne grille n est plus affichee ; l onglet « Balance (ancienne) » est cache pour KGA3',
      !ids.ancienneVisible && !ids.grilleAncienneVisible, JSON.stringify(ids));
    await p.fill('#' + ids.du, fr(MOIS_A)); await p.keyboard.press('Tab');
    await p.fill('#' + ids.au, fr(FIN_B)); await p.keyboard.press('Tab');
    await p.click('#' + ids.rechercher);
    await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('balancesalecahs #ventilationBalance')[0]; return c && c.el && /TOTAL/.test(c.el.dom.innerText); }, null, { timeout: 20000 });
    await p.waitForTimeout(800);
    const balance = await p.evaluate(() => {
      const vue = Ext.ComponentQuery.query('balancesalecahs')[0];
      const rouge = vue.down('#ventilationBalance').el.dom.querySelector('.vb-kpi-rouge .vb-kpi-val');
      return { sortiesRouge: rouge ? getComputedStyle(rouge).color : null, sortiesTexte: rouge ? rouge.innerText : null,
        ventilation: vue.down('#ventilationBalance').el.dom.innerText };
    });
    ok('P : les sorties de caisse du resume sont en rouge, avec le separateur de milliers',
      balance.sortiesRouge === 'rgb(160, 0, 0)' && /^\d{1,3}([ .,]\d{3})*$/.test(balance.sortiesTexte || ''), JSON.stringify([balance.sortiesRouge, balance.sortiesTexte]));
    ok('P : « Clients et ventes » dit COMPTANT et CREDIT, sans VNO / VO',
      /COMPTANT\t/.test(balance.ventilation) && !/VNO/.test(balance.ventilation) && !/\(VO\)/.test(balance.ventilation), balance.ventilation.replace(/\n/g, ' | ').slice(0, 200));
    // impression de la nouvelle presentation, en flux
    const nbPopups = popups.length;
    const idImprimer = await p.evaluate(() => Ext.ComponentQuery.query('balancesalecahs #imprimer')[0].el.id);
    await p.click('#' + idImprimer);
    await p.waitForTimeout(3000);
    const popup = popups[popups.length - 1];
    ok('P : Imprimer ouvre UNE fois la nouvelle edition (balancesalecash/pdf), en flux',
      popups.length === nbPopups + 1 && /balancesalecash\/pdf\?/.test(popup ? popup.url() : ''), popup ? popup.url() : '');
    const pdf = await octets('../api/v1/balance/balancesalecash/pdf?dtStart=' + MOIS_A + '&dtEnd=' + FIN_B);
    fs.writeFileSync(TMP + '/balance.pdf', Buffer.from(pdf.octets));
    const texte = execFileSync('pdftotext', ['-layout', TMP + '/balance.pdf', '-'], { encoding: 'utf8' });
    ok('P : le PDF suit la nouvelle presentation (balance, resume, clients et ventes, part dans le CA, caisse, TVA)',
      /pdf/.test(pdf.type || '') && /BALANCE VENTE \/ CAISSE/.test(texte) && /CLIENTS ET VENTES/.test(texte) && /PART DANS LE CHIFFRE D'AFFAIRES/.test(texte)
      && /RÉPARTITION PAR TAUX DE TVA/.test(texte) && /COMPTANT\s+3\s+23 000/.test(texte) && /WAVE/.test(texte) && /Sorties\s+1\s+500/.test(texte),
      texte.replace(/\n/g, ' | ').slice(0, 600));

    // le privilege est donne au role de KGA3 : l'onglet « Balance (ancienne) » apparait, complet
    exec("INSERT INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED, dt_UPDATED) VALUES ('" + MARQUE + "-PRIV','" + ROLE_KGA3 + "','" + PRIVILEGE + "',NOW(),NOW())");
    // le privilege est relu en base a chaque ouverture de l'ecran : on quitte l'ecran et on y revient
    const privApres = await appel('../api/v1/balance/balancesalecash/privileges');
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('gardemanager', {}));
    await p.waitForTimeout(1500);
    await ouvrirBalance();
    await p.waitForFunction(() => Ext.ComponentQuery.query('balancesalecahs #ongletBalanceAncienne')[0].tab.isVisible(), null, { timeout: 10000 }).catch(() => {});
    const ancienneTab = await p.evaluate(() => Ext.ComponentQuery.query('balancesalecahs #ongletBalanceAncienne')[0].tab.el.id);
    await p.click('#' + ancienneTab);
    await p.waitForTimeout(1500);
    const idsA = await p.evaluate(() => {
      const vue = Ext.ComponentQuery.query('balancesalecahs')[0];
      return { du: vue.down('#dtStartAncienne').inputEl.id, au: vue.down('#dtEndAncienne').inputEl.id, rechercher: vue.down('#rechercherAncienne').el.id };
    });
    await p.fill('#' + idsA.du, fr(MOIS_A)); await p.keyboard.press('Tab');
    await p.fill('#' + idsA.au, fr(FIN_B)); await p.keyboard.press('Tab');
    await p.click('#' + idsA.rechercher);
    await p.waitForFunction(() => Ext.ComponentQuery.query('balancesalecahs #balanceGridAncienne')[0].getStore().getCount() === 2, null, { timeout: 20000 });
    await p.waitForTimeout(800);
    const ancienne = await p.evaluate(() => {
      const vue = Ext.ComponentQuery.query('balancesalecahs')[0];
      const g = vue.down('#balanceGridAncienne');
      return { visibleTab: vue.down('#ongletBalanceAncienne').tab.isVisible(), lignes: g.getView().getEl().dom.querySelectorAll('tr.x-grid-row').length,
        barres: ['recapBas1', 'recapBas2', 'recapBas3'].map(id => vue.down('#' + id).isVisible()), montantVente: vue.down('#montantTTC').getValue(), especes: vue.down('#montantEsp').getValue(),
        imprimer: !!vue.down('#imprimerAncienne') };
    });
    ok('P : avec le privilege, l onglet « Balance (ancienne) » est visible et complet (grille 2 lignes, barres du bas, resume 53 000 / especes 22 000, son Imprimer)',
      privApres.anciennePresentation === true && ancienne.visibleTab && ancienne.lignes === 2 && ancienne.barres.every(Boolean)
      && Number(ancienne.montantVente) === 53000 && Number(ancienne.especes) === 22000 && ancienne.imprimer, JSON.stringify(ancienne));
    await p.screenshot({ path: TMP + '/balance-ancienne.png' });
    exec("DELETE FROM t_role_privelege WHERE lg_ROLE_PRIVILEGE='" + MARQUE + "-PRIV'");

    /* =========================================================== Q : gardes */
    const g = await poster({ libelle: MARQUE + ' nuit test', dateDebut: DEBUT, dateFin: FIN });
    const gardeId = (g.data || {}).id;
    ok('Q : garde de jeu d essai enregistree', g.success && gardeId, JSON.stringify(g).slice(0, 120));
    const rapport = await appel('../api/v1/gardes/' + gardeId + '/rapport?heures=2');
    const p0 = (rapport.abc || []).find(l => l.produitId === PRODUITS[0]) || {};
    ok('Q : le stock affiche est celui de la fiche article (stock disponible 7 pour P0)', p0.stock === 7, JSON.stringify(rapport.abc));
    const fStock = await appel('../api/v1/gardes/' + gardeId + '/rapport?heures=2&stockOp=>=&stockVal=7');
    const fQte = await appel('../api/v1/gardes/' + gardeId + '/rapport?heures=2&qteOp=>&qteVal=5');
    const fMarge = await appel('../api/v1/gardes/' + gardeId + '/rapport?heures=2&margeOp=<&margeVal=0');
    const fCombine = await appel('../api/v1/gardes/' + gardeId + '/rapport?heures=2&qteOp=>=&qteVal=2&margeOp=>=&margeVal=45');
    ok('Q : filtres numeriques : stock >= 7 -> P0 ; qte vendue > 5 -> P1 (4 000) ; marge < 0 -> P2 (600) ; qte >= 2 ET marge >= 45 -> P1 seul',
      fStock.totalFiltre === 1 && fStock.abc[0].produitId === PRODUITS[0] && fQte.totalFiltre === 1 && fQte.abc[0].montant === 4000
      && fMarge.totalFiltre === 1 && fMarge.abc[0].montant === 600 && fCombine.totalFiltre === 1 && fCombine.abc[0].montant === 4000,
      JSON.stringify([fStock.totalFiltre, fQte.totalFiltre, fMarge.totalFiltre, fCombine.totalFiltre]));
    const vendeurs = await appel('../api/v1/gardes/' + gardeId + '/vendeurs');
    ok('Q : chaque vendeur porte sa part du chiffre (un seul vendeur : 100 %)',
      (vendeurs.data || []).length === 1 && vendeurs.data[0].part === 100, JSON.stringify(vendeurs.data));

    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('gardemanager', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('gardemanager').length > 0, null, { timeout: 20000 });
    await p.waitForFunction(() => { const s = Ext.ComponentQuery.query('gardemanager')[0].gardeStore; return s && !s.isLoading() && s.getCount() > 0; }, null, { timeout: 20000 });
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
      const resume = v.down('#grilleResumeAbc').getView().getEl().dom;
      const a = resume.querySelector('tr.resume-classe-a td');
      const chart = v.down('#courbeComparaison');
      return {
        actualiser: !!v.down('#gardeActualiser'),
        filtres: ['abcStockOp', 'abcStockVal', 'abcQteOp', 'abcQteVal', 'abcMargeOp', 'abcMargeVal'].every(id => !!v.down('#' + id)),
        ligneA: a ? getComputedStyle(a).color + ' ' + getComputedStyle(a).fontWeight : null,
        stocks: v.down('#grilleAbc').getStore().getRange().map(r => r.get('stock')),
        axe: chart ? chart.axes.getAt(2).title : '',
        vendeursColonne: v.down('#ongletVendeurs').headerCt.getGridColumns().map(c => c.text).indexOf('% du chiffre') >= 0
      };
    });
    ok('Q : bouton « Actualiser l analyse », filtres numeriques, colonne « % du chiffre » des vendeurs, axe « Gardes comparées » sans entite',
      ecran.actualiser && ecran.filtres && ecran.vendeursColonne && ecran.axe === 'Gardes comparées', JSON.stringify(ecran));
    ok('Q : la ligne de la classe A du resume est entierement en vert gras', ecran.ligneA === 'rgb(23, 122, 23) 700' || ecran.ligneA === 'rgb(23, 122, 23) bold', ecran.ligneA);
    ok('Q : la colonne Stock de la liste porte le stock de la fiche article (7)', ecran.stocks.indexOf(7) >= 0, JSON.stringify(ecran.stocks));
    // filtre au clavier : quantite vendue > 5
    const idOp = await p.evaluate(() => Ext.ComponentQuery.query('gardemanager #abcQteOp')[0].getId());
    await p.click('#' + idOp + ' .x-form-trigger');
    await p.waitForSelector('.x-boundlist:visible .x-boundlist-item', { timeout: 5000 });
    await p.click('.x-boundlist:visible .x-boundlist-item:text-is(">")');
    const idVal = await p.evaluate(() => Ext.ComponentQuery.query('gardemanager #abcQteVal')[0].inputEl.id);
    await p.click('#' + idVal);
    await p.keyboard.type('5');
    await p.waitForTimeout(1200);
    await analyseFinie();
    const filtre = await p.evaluate(() => Ext.ComponentQuery.query('gardemanager #grilleAbc')[0].getStore().getRange().map(r => r.get('montant')));
    ok('Q : le filtre « Qte vendue > 5 » saisi a l ecran ne laisse que P1 (4 000)', filtre.length === 1 && filtre[0] === 4000, JSON.stringify(filtre));
    const idActualiser = await p.evaluate(() => Ext.ComponentQuery.query('gardemanager #gardeActualiser')[0].el.id);
    await p.click('#' + idActualiser);
    await analyseFinie();
    const apresActualiser = await p.evaluate(() => Ext.ComponentQuery.query('gardemanager #grilleAbc')[0].getStore().getCount());
    ok('Q : « Actualiser l analyse » recalcule avec les memes filtres', apresActualiser === 1, apresActualiser);

    // creation d'une garde de 10 jours : avertissement et confirmation
    const idNouvelle = await p.evaluate(() => Ext.ComponentQuery.query('gardemanager #gardeNouvelle')[0].el.id);
    await p.click('#' + idNouvelle);
    await p.waitForFunction(() => Ext.ComponentQuery.query('gardeform').length > 0, null, { timeout: 10000 });
    await p.waitForTimeout(500);
    await p.evaluate((libelle) => {
      const f = Ext.ComponentQuery.query('gardeform')[0];
      f.down('#gardeLibelle').setValue(libelle);
      f.down('#gardeJourDebut').setValue(new Date(2027, 2, 1));
      f.down('#gardeHeureDebut').setValue('20:00');
      f.down('#gardeJourFin').setValue(new Date(2027, 2, 11));
      f.down('#gardeHeureFin').setValue('08:00');
    }, MARQUE + ' dix jours');
    const idEnregistrer = await p.evaluate(() => Ext.ComponentQuery.query('gardeform #gardeEnregistrer')[0].el.id);
    await p.click('#' + idEnregistrer);
    await p.waitForTimeout(1000);
    const confirmation = await p.evaluate(() => {
      const box = Ext.MessageBox;
      return { visible: box.isVisible(), texte: box.msg ? box.msg.getValue ? box.msg.getValue() : (box.msg.el ? box.msg.el.dom.innerText : '') : (box.el ? box.el.dom.innerText : '') };
    });
    ok('Q : une garde de 10 jours declenche un avertissement (depasse 8 jours) avec confirmation', confirmation.visible && /8 jours/.test(confirmation.texte), JSON.stringify(confirmation));
    // Non : rien n'est enregistre
    await p.click('.x-message-box:visible button:has-text("Non")', { timeout: 5000 }).catch(async () => { await p.evaluate(() => Ext.MessageBox.hide()); });
    await p.waitForTimeout(800);
    ok('Q : « Non » n enregistre pas la garde', q("SELECT COUNT(*) FROM garde WHERE libelle='" + MARQUE + " dix jours'") === '0');
    await p.evaluate(() => Ext.each(Ext.ComponentQuery.query('gardeform'), f => f.up('window') ? f.up('window').close() : f.destroy()));

    ok('aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('parcours sans exception', false, e.stack || e.message);
  } finally {
    await b.close();
    purgerGarde();
    retirerJeuDEssai();
    ok('jeu d essai retire', q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "-%'") === '0'
      && q("SELECT COUNT(*) FROM t_role_privelege WHERE lg_ROLE_PRIVILEGE='" + MARQUE + "-PRIV'") === '0');
  }
  const ko = res.filter(r => !r.c).length;
  console.log('\nTOTAL ' + (res.length - ko) + '/' + res.length + (ko ? '  FAIL=' + ko : '  OK'));
  process.exit(ko ? 1 : 0);
})();
