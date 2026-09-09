/* Retours du 09/09 - lot J : gestion du carnet depot (point 5), joue a l'ecran.
 *  - le solde suit les mouvements faits ailleurs : relu a chaque onglet et a chaque recherche ;
 *  - « Tout » dans le selecteur de tiers payant ;
 *  - formulaire de reglement : rappel du solde, date du jour ;
 *  - onglet FACTURES : Voir / Imprimer / Supprimer chacun dans sa colonne, visualisation paginee
 *    (beneficiaires puis medicaments), edition simple au modele du detail avec la reference de vente ;
 *  - creation : trois filtres (massive, par tiers payant, par selection de bons), retour direct dans
 *    l'onglet FACTURES ;
 *  - facturation ordinaire : pas de bouton Regler sur une facture de carnet depot ;
 *  - aucune fenetre surgissante : une seule ouverture, dans le clic.
 */
const { chromium } = require('playwright-core');
const { execFileSync, execSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
const TP = '1619143351587397512';
const JOUR = '2026-06-22';
const MARQUE = 'E2E-LJ';
let compteurAvant = '', compteAvant = '', typeAvant = '';

function bonsUnpaid() {
  return q("SELECT COUNT(*) FROM t_preenregistrement_compte_client_tiers_payent cp"
    + " JOIN t_compte_client_tiers_payant cl ON cl.lg_COMPTE_CLIENT_TIERS_PAYANT_ID=cp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID"
    + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID=cp.lg_PREENREGISTREMENT_ID"
    + " WHERE cl.lg_TIERS_PAYANT_ID='" + TP + "' AND cp.str_STATUT_FACTURE='UNPAID' AND cp.str_STATUT='is_Closed'"
    + " AND p.str_STATUT='is_Closed' AND p.b_IS_CANCEL=0 AND p.int_PRICE>0 AND DATE(p.dt_UPDATED)='" + JOUR + "'");
}
function facturesDuJeu() {
  return q("SELECT lg_FACTURE_ID FROM t_facture WHERE tiersPayant='" + TP + "' AND dt_DEBUT_FACTURE='" + JOUR + " 00:00:00'"
    + " AND dt_FIN_FACTURE='" + JOUR + " 00:00:00'").split('\n').filter(Boolean);
}
function poserComptesManquants() {
  exec("INSERT IGNORE INTO t_client (lg_CLIENT_ID,str_FIRST_NAME,str_LAST_NAME,str_STATUT,dt_CREATED,dt_UPDATED,lg_TYPE_CLIENT_ID)"
    + " VALUES ('" + MARQUE + "-CLT','CLIENT','" + MARQUE + "','enable',NOW(),NOW(),(SELECT lg_TYPE_CLIENT_ID FROM t_type_client LIMIT 1));");
  exec("INSERT IGNORE INTO t_compte_client (lg_COMPTE_CLIENT_ID,str_CODE_COMPTE_CLIENT,str_TYPE,dec_Balance,dt_CREATED,dt_UPDATED,str_STATUT,lg_CLIENT_ID)"
    + " SELECT DISTINCT cl.lg_COMPTE_CLIENT_ID,'" + MARQUE + "','CREDIT',0,NOW(),NOW(),'enable','" + MARQUE + "-CLT'"
    + " FROM t_compte_client_tiers_payant cl LEFT JOIN t_compte_client cc ON cc.lg_COMPTE_CLIENT_ID=cl.lg_COMPTE_CLIENT_ID"
    + " WHERE cl.lg_TIERS_PAYANT_ID='" + TP + "' AND cc.lg_COMPTE_CLIENT_ID IS NULL;");
}
function poserUtilisateursManquants() {
  const manquants = q("SELECT DISTINCT cp.lg_USER_ID FROM t_preenregistrement_compte_client_tiers_payent cp"
    + " JOIN t_compte_client_tiers_payant cl ON cl.lg_COMPTE_CLIENT_TIERS_PAYANT_ID=cp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID"
    + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID=cp.lg_PREENREGISTREMENT_ID"
    + " LEFT JOIN t_user u ON u.lg_USER_ID=cp.lg_USER_ID"
    + " WHERE cl.lg_TIERS_PAYANT_ID='" + TP + "' AND DATE(p.dt_UPDATED)='" + JOUR + "' AND u.lg_USER_ID IS NULL"
    + " UNION SELECT DISTINCT p.lg_USER_ID FROM t_preenregistrement_compte_client_tiers_payent cp"
    + " JOIN t_compte_client_tiers_payant cl ON cl.lg_COMPTE_CLIENT_TIERS_PAYANT_ID=cp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID"
    + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID=cp.lg_PREENREGISTREMENT_ID"
    + " LEFT JOIN t_user u ON u.lg_USER_ID=p.lg_USER_ID"
    + " WHERE cl.lg_TIERS_PAYANT_ID='" + TP + "' AND DATE(p.dt_UPDATED)='" + JOUR + "' AND u.lg_USER_ID IS NULL").split('\n').filter(Boolean);
  manquants.forEach(function (id, i) {
    exec("CREATE TEMPORARY TABLE tmp_u AS SELECT * FROM t_user WHERE str_LOGIN='KGA3';"
      + " UPDATE tmp_u SET lg_USER_ID='" + id + "', str_LOGIN='" + MARQUE + "-U" + i + "';"
      + " INSERT INTO t_user SELECT * FROM tmp_u; DROP TEMPORARY TABLE tmp_u;");
  });
}
function retirerComptesManquants() {
  exec("SET FOREIGN_KEY_CHECKS=0; DELETE FROM t_compte_client WHERE str_CODE_COMPTE_CLIENT='" + MARQUE + "';"
    + " DELETE FROM t_client WHERE lg_CLIENT_ID='" + MARQUE + "-CLT';"
    + " DELETE FROM t_user WHERE str_LOGIN LIKE '" + MARQUE + "-U%'; SET FOREIGN_KEY_CHECKS=1;");
}
function retirerJeuDEssai() {
  exec("DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_DETAIL_ID='" + MARQUE + "-D'");
  facturesDuJeu().forEach(function (id) {
    exec("UPDATE t_preenregistrement_compte_client_tiers_payent SET str_STATUT_FACTURE='UNPAID'"
      + " WHERE lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID IN (SELECT str_REF FROM t_facture_detail WHERE lg_FACTURE_ID='" + id + "');"
      + "DELETE FROM t_facture_detail WHERE lg_FACTURE_ID='" + id + "'; DELETE FROM t_facture WHERE lg_FACTURE_ID='" + id + "';");
  });
  exec("UPDATE t_tiers_payant SET is_depot=0, account=" + (compteAvant || 0) + (typeAvant ? ", lg_TYPE_TIERS_PAYANT_ID='" + typeAvant + "'" : "") + " WHERE lg_TIERS_PAYANT_ID='" + TP + "';");
  if (compteurAvant) {
    exec("UPDATE t_parameters SET str_VALUE='" + compteurAvant + "' WHERE str_KEY='KEY_CODE_FACTURE';");
  }
  retirerComptesManquants();
}

(async () => {
  compteurAvant = q("SELECT str_VALUE FROM t_parameters WHERE str_KEY='KEY_CODE_FACTURE'");
  compteAvant = q("SELECT IFNULL(account,0) FROM t_tiers_payant WHERE lg_TIERS_PAYANT_ID='" + TP + "'");
  typeAvant = q("SELECT lg_TYPE_TIERS_PAYANT_ID FROM t_tiers_payant WHERE lg_TIERS_PAYANT_ID='" + TP + "'");
  /* Le selecteur du menu ne propose que les tiers payants de type CARNET : le jeu d'essai le devient le temps du test. */
  exec("UPDATE t_tiers_payant SET is_depot=1, account=15400, lg_TYPE_TIERS_PAYANT_ID='2' WHERE lg_TIERS_PAYANT_ID='" + TP + "';");
  poserComptesManquants();
  poserUtilisateursManquants();
  const bonsAvant = parseInt(bonsUnpaid(), 10);
  ok('Jeu d\'essai : un carnet depot avec des bons non factures', bonsAvant > 0, 'bons=' + bonsAvant);

  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1700, height: 950 } });
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  const requetes = []; p.on('request', r => { if (/carnet-depot|facturation/.test(r.url())) requetes.push(r.url().replace(/^.*\/prestige\//, '')); });
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
  await p.waitForTimeout(2500);
  const appel = (m, u, c) => p.evaluate(async ([m, u, c]) => {
    const o = { method: m, headers: { 'Content-Type': 'application/json' } };
    if (c) { o.body = JSON.stringify(c); }
    const r = await fetch(u, o); return { statut: r.status, corps: await r.text() };
  }, [m, u, c || null]);
  const cliquerOnglet = async (itemId) => {
    const id = await p.evaluate((i) => Ext.ComponentQuery.query('reglementdepot #' + i)[0].tab.getId(), itemId);
    await p.click('#' + id);
    await p.waitForTimeout(1500);
  };
  const soldeAffiche = () => p.evaluate(() => {
    const v = Ext.ComponentQuery.query('reglementdepot')[0];
    return { reglement: v.down('#accountReglement').getValue(), depense: v.down('#account').getValue() };
  });
  /* Aucune fenetre surgissante : on remplace window.open par un compteur, et on verifie qu'une
     edition n'en demande qu'UNE, dans le clic. */
  await p.evaluate(() => { window.__ouvertures = []; window.open = function (u) { window.__ouvertures.push(u); return null; }; });

  try {
    /* ---------------------------------------------------------- l'ecran, le tiers payant, le solde */
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('reglementdepot', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('reglementdepot').length > 0, null, { timeout: 20000 });
    await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('reglementdepot #tiersPayantsExclus')[0]; return c && c.getStore().getCount() > 0 && !c.getStore().isLoading(); }, null, { timeout: 20000 });
    await p.waitForTimeout(800);
    const combo = await p.evaluate(() => {
      const c = Ext.ComponentQuery.query('reglementdepot #tiersPayantsExclus')[0];
      return { premier: c.getStore().getAt(0).get('nomComplet'), premierId: c.getStore().getAt(0).get('id'), n: c.getStore().getCount() };
    });
    ok('Le selecteur de tiers payant commence par « Tout »', combo.premier === 'Tout' && combo.premierId === 'TOUT', JSON.stringify(combo));
    // Choix du carnet depot d'essai, a la souris
    const idCombo = await p.evaluate(() => Ext.ComponentQuery.query('reglementdepot #tiersPayantsExclus')[0].getId());
    await p.click('#' + idCombo + ' .x-form-trigger');
    await p.waitForSelector('.x-boundlist:visible .x-boundlist-item', { timeout: 5000 });
    const propositions = await p.evaluate(() => Array.from(document.querySelectorAll('.x-boundlist-item')).filter(e => e.offsetParent).map(e => e.innerText.trim()));
    console.log('PROPOSITIONS ' + JSON.stringify(propositions));
    const libelleTp = q("SELECT str_FULLNAME FROM t_tiers_payant WHERE lg_TIERS_PAYANT_ID='" + TP + "'").split(' ')[0];
    await p.click('.x-boundlist:visible .x-boundlist-item:has-text("' + libelleTp + '")', { timeout: 10000 });
    await p.waitForTimeout(1500);
    await cliquerOnglet('reglementPanel');
    let solde = await soldeAffiche();
    ok('Onglet REGLEMENTS : le solde du carnet est affiche (15 400)', Number(solde.reglement) === 15400, JSON.stringify(solde));

    // Une vente est modifiee ailleurs : le compte du tiers payant change en base
    exec("UPDATE t_tiers_payant SET account=4890 WHERE lg_TIERS_PAYANT_ID='" + TP + "';");
    await cliquerOnglet('ventePanel');
    await cliquerOnglet('reglementPanel');
    solde = await soldeAffiche();
    const direct = JSON.parse((await appel('GET', '../api/v2/carnet-depot/solde/' + TP)).corps);
    console.log('DEBUG solde requetes=' + JSON.stringify(requetes.filter(r => /solde/.test(r))) + ' direct=' + JSON.stringify(direct));
    ok('Le solde suit la modification faite ailleurs, sans quitter le menu (4 890)', Number(solde.reglement) === 4890, JSON.stringify(solde));
    exec("UPDATE t_tiers_payant SET account=7000 WHERE lg_TIERS_PAYANT_ID='" + TP + "';");
    const idRechercher = await p.evaluate(() => Ext.ComponentQuery.query('reglementdepot #btnVentePanel')[0].getId());
    await p.click('#' + idRechercher);
    await p.waitForTimeout(1500);
    solde = await soldeAffiche();
    ok('« Rechercher » relit aussi le solde (7 000), sur les deux onglets', Number(solde.reglement) === 7000 && Number(solde.depense) === 7000, JSON.stringify(solde));

    /* ---------------------------------------------------------- formulaire de reglement */
    const idNouveau = await p.evaluate(() => Ext.ComponentQuery.query('reglementdepot #btnReglement')[0].getId());
    await p.click('#' + idNouveau);
    await p.waitForSelector('.x-window:visible', { timeout: 5000 });
    await p.waitForTimeout(500);
    const formulaire = await p.evaluate(() => {
      const w = Ext.ComponentQuery.query('window{isVisible()}').find(x => /r.glement/i.test(x.title));
      const rappel = w.down('#rappelSolde');
      const date = w.down('datefield[name=dateReglement]');
      const r = { titre: w.title, rappel: rappel && rappel.getValue(), date: date && Ext.Date.format(date.getValue(), 'Y-m-d') };
      w.destroy();
      return r;
    });
    ok('Le formulaire de reglement rappelle le solde du carnet', /7[ .,]?000/.test(formulaire.rappel || ''), JSON.stringify(formulaire));
    ok('La date de reglement est la date du jour par defaut', formulaire.date === q('SELECT CURDATE()'), JSON.stringify(formulaire));

    /* ---------------------------------------------------------- « Tout » */
    await p.click('#' + idCombo + ' .x-form-trigger');
    await p.waitForSelector('.x-boundlist:visible .x-boundlist-item', { timeout: 5000 });
    await p.click('.x-boundlist:visible .x-boundlist-item:text-is("Tout")');
    await p.waitForTimeout(1500);
    const toutes = requetes.filter(r => /carnet-depot\/(ventes|reglements|produits)/.test(r)).slice(-1)[0] || '';
    ok('« Tout » interroge sans filtre de tiers payant', /tiersPayantId=(&|$)/.test(toutes), toutes);

    /* ---------------------------------------------------------- creation : trois filtres, retour dans FACTURES */
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('oneditfacture', { carnetDepot: true, tiersPayantId: '' }));
    await p.waitForFunction(() => Ext.ComponentQuery.query('oneditfacture').length > 0, null, { timeout: 20000 });
    await p.waitForTimeout(1200);
    const filtres = await p.evaluate(() => Ext.ComponentQuery.query('oneditfacture #modeSelection')[0].getStore().getRange().map(r => r.get('name')));
    ok('En mode carnet depot, trois filtres : massive, par tiers payant, par selection de bons',
      filtres.join('|') === 'Sélection massive|Par tiers payant|Par Sélection de bons', filtres.join('|'));
    const avantRetour = requetes.length;
    await p.evaluate(() => testextjs.app.getController('GestionCarnetDepotCtr').revenirAuxFacturesDepot());
    await p.waitForFunction(() => Ext.ComponentQuery.query('reglementdepot').length > 0 && Ext.ComponentQuery.query('reglementdepot')[0].getActiveTab(), null, { timeout: 20000 });
    await p.waitForTimeout(1500);
    const retour = await p.evaluate(() => Ext.ComponentQuery.query('reglementdepot')[0].getActiveTab().getItemId());
    const ventesChargees = requetes.slice(avantRetour).some(r => /carnet-depot\/ventes/.test(r));
    ok('Le retour ouvre DIRECTEMENT l\'onglet FACTURES', retour === 'facturesPanel', retour);
    ok('...sans passer par l\'onglet des ventes (aucun chargement des ventes)', !ventesChargees, requetes.slice(avantRetour).join(' | '));

    /* ---------------------------------------------------------- une facture, sa visualisation, ses editions */
    const gen = JSON.parse((await appel('POST', '../api/v1/facturation/carnet-depot/generer',
      { mode: 'TP', tpid: TP, dtStart: JOUR, dtEnd: JOUR, datas: [] })).corps);
    ok('Une facture de carnet depot est generee', gen.success === true && gen.total === 1, JSON.stringify(gen).slice(0, 200));
    const facture = (gen.factures || [])[0] || {};
    const idRafraichir = await p.evaluate(() => Ext.ComponentQuery.query('reglementdepot #btnRafraichirFacturesDepot')[0].getId());
    await p.click('#' + idRafraichir);
    await p.waitForFunction((id) => { const g = Ext.ComponentQuery.query('reglementdepot #grilleFacturesDepot')[0]; return g && !g.getStore().isLoading() && g.getStore().getRange().some(r => r.get('lgFACTUREID') === id); }, facture.id, { timeout: 20000 });
    const colonnes = await p.evaluate(() => Ext.ComponentQuery.query('reglementdepot #grilleFacturesDepot')[0].columns.filter(c => c.xtype === 'actioncolumn').map(c => c.text + ':' + c.width));
    ok('Trois colonnes d\'action distinctes : Voir, Imprimer, Supprimer', colonnes.join('|') === 'Voir:50|Imprimer:70|Supprimer:80', colonnes.join('|'));

    // Voir : clic sur l'icone de la ligne
    const cible = await p.evaluate((id) => {
      const g = Ext.ComponentQuery.query('reglementdepot #grilleFacturesDepot')[0];
      const i = g.getStore().findBy(r => r.get('lgFACTUREID') === id);
      const img = g.getView().getNode(i).querySelector('img[alt="Voir"], .x-action-col-icon');
      const r = img.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }, facture.id);
    await p.mouse.click(cible.x, cible.y);
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('window{isVisible()} #grilleBonsFacture')[0]; return g && g.getStore().getCount() > 0 && !g.getStore().isLoading(); }, null, { timeout: 20000 });
    const nbDossier = parseInt(q("SELECT int_NB_DOSSIER FROM t_facture WHERE lg_FACTURE_ID='" + facture.id + "'"), 10);
    /* Le banc anonymise n'a plus les lignes de medicaments de ces ventes : on en pose une sur une
       vente de la facture, retiree a la fin. */
    const venteFixture = q("SELECT cp.lg_PREENREGISTREMENT_ID FROM t_facture_detail d JOIN t_preenregistrement_compte_client_tiers_payent cp"
      + " ON cp.lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID=d.str_REF WHERE d.lg_FACTURE_ID='" + facture.id + "' LIMIT 1");
    const produitFixture = q("SELECT lg_FAMILLE_ID FROM t_famille WHERE str_STATUT='enable' ORDER BY str_NAME LIMIT 1");
    exec("INSERT INTO t_preenregistrement_detail (lg_PREENREGISTREMENT_DETAIL_ID, lg_PREENREGISTREMENT_ID, lg_FAMILLE_ID, int_QUANTITY,"
      + " int_QUANTITY_SERVED, int_AVOIR, int_AVOIR_SERVED, int_PRICE, int_PRICE_UNITAIR, int_NUMBER, dt_CREATED, dt_UPDATED, int_PRICE_REMISE,"
      + " b_IS_AVOIR, int_FREE_PACK_NUMBER, int_PRICE_OTHER, int_PRICE_DETAIL_OTHER, int_UG, bool_ACCOUNT, montantTva, valeurTva, prixAchat, montanttvaug, int_AVOIR_INITIAL)"
      + " VALUES ('" + MARQUE + "-D','" + venteFixture + "','" + produitFixture + "',2,2,0,0,3000,1500,0,NOW(),NOW(),0,0,0,0,0,0,1,0,0,0,0,0)");
    const voir = await p.evaluate(() => {
      const g = Ext.ComponentQuery.query('window{isVisible()} #grilleBonsFacture')[0];
      const premiere = g.getStore().getAt(0).getData();
      return { total: g.getStore().getTotalCount(), page: g.getStore().getCount(), premiere: premiere, texte: g.up('window').down('#totalBons').el.dom.innerText };
    });
    ok('La visualisation liste les ventes de la facture, paginees', voir.total === nbDossier && voir.page <= 25, JSON.stringify(voir).slice(0, 250));
    ok('Chaque ligne porte la reference de la VENTE, pas un identifiant technique',
      voir.premiere.strREFVENTE && !/^[0-9a-f]{8}-[0-9a-f]{4}-/.test(voir.premiere.strREFVENTE), voir.premiere.strREFVENTE);
    ok('Le total des ventes et le montant sont annonces', /vente\(s\)/.test(voir.texte), voir.texte);
    // Choisir la premiere vente : ses medicaments
    // On cherche la vente portant la ligne de medicament (recherche par sa reference, au clavier)
    const refFixture = q("SELECT str_REF FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID='" + venteFixture + "'");
    const idRecherche = await p.evaluate(() => Ext.ComponentQuery.query('window{isVisible()} #rechercheBon')[0].inputEl.id);
    await p.click('#' + idRecherche);
    await p.keyboard.type(refFixture);
    await p.keyboard.press('Enter');
    await p.waitForFunction((v) => { const g = Ext.ComponentQuery.query('window{isVisible()} #grilleBonsFacture')[0]; return g && !g.getStore().isLoading() && g.getStore().getCount() >= 1 && g.getStore().getAt(0).get('venteId') === v; }, venteFixture, { timeout: 20000 });
    ok('La recherche par reference de vente retrouve la vente', true);
    await p.evaluate(() => { const g = Ext.ComponentQuery.query('window{isVisible()} #grilleBonsFacture')[0]; g.getSelectionModel().select(0); });
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('window{isVisible()} #grilleArticlesFacture')[0]; return g && !g.getStore().isLoading() && g.getStore().getCount() > 0; }, null, { timeout: 20000 });
    const articles = await p.evaluate(() => { const g = Ext.ComponentQuery.query('window{isVisible()} #grilleArticlesFacture')[0]; const w = g.up('window'); const r = { n: g.getStore().getCount(), premier: g.getStore().getAt(0).getData() }; w.destroy(); return r; });
    ok('La vente choisie montre ses medicaments, pagines', articles.n === 1 && !!articles.premier.strNAME && articles.premier.intPRICE === 3000, JSON.stringify(articles).slice(0, 200));

    // Editions : une seule ouverture, dans le clic, sur un flux PDF
    await p.evaluate((id) => {
      const vue = Ext.ComponentQuery.query('reglementdepot')[0];
      const rec = vue.down('#grilleFacturesDepot').getStore().getRange().find(r => r.get('lgFACTUREID') === id);
      vue.fireEvent('imprimerFactureDepot', rec);
    }, facture.id);
    await p.waitForSelector('.x-window:visible', { timeout: 5000 });
    const idImprimer = await p.evaluate(() => { const w = Ext.ComponentQuery.query('window{isVisible()}').find(x => !!x.down('#choixEdition')); return w.down('button[text=Imprimer]').getId(); });
    await p.click('#' + idImprimer);
    await p.waitForTimeout(800);
    const ouvertures = await p.evaluate(() => window.__ouvertures.splice(0));
    ok('L\'edition simple n\'ouvre qu\'UNE seule fois, dans le clic', ouvertures.length === 1 && /carnet-depot\/pdf$/.test(ouvertures[0]), JSON.stringify(ouvertures));
    // Le PDF simple : meme modele que le detail, reference de vente, pas d'identifiant technique
    const pdfSimple = await p.evaluate(async (u) => { const r = await fetch(u); const b = await r.arrayBuffer(); return { statut: r.status, type: r.headers.get('content-type'), octets: Array.from(new Uint8Array(b)) }; }, ouvertures[0]);
    require('fs').writeFileSync('/tmp/claude-0/facture_simple.pdf', Buffer.from(pdfSimple.octets));
    const texte = execSync('pdftotext -layout /tmp/claude-0/facture_simple.pdf -', { encoding: 'utf8' });
    ok('L\'edition simple est un PDF', pdfSimple.statut === 200 && /pdf/.test(pdfSimple.type || ''), pdfSimple.statut + ' ' + pdfSimple.type);
    ok('Elle suit le modele du detail : FACTURE N°, colonnes Vente n° / N° bon / Beneficiaire / Matricule / Montant, TOTAL GENERAL',
      /FACTURE N°/.test(texte) && /Vente n°/.test(texte) && /N° bon/.test(texte) && /Bénéficiaire/.test(texte) && /TOTAL GÉNÉRAL/.test(texte), texte.slice(0, 400));
    ok('Plus d\'identifiant technique en guise de numero de bon', !/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/.test(texte), (texte.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/) || [''])[0]);
    ok('La reference de la premiere vente y figure', texte.indexOf(voir.premiere.strREFVENTE) >= 0, voir.premiere.strREFVENTE);
    // Edition avec les medicaments : meme regle, une ouverture sur un flux
    await p.evaluate((id) => {
      const vue = Ext.ComponentQuery.query('reglementdepot')[0];
      const rec = vue.down('#grilleFacturesDepot').getStore().getRange().find(r => r.get('lgFACTUREID') === id);
      vue.fireEvent('imprimerFactureDepot', rec);
    }, facture.id);
    await p.waitForSelector('.x-window:visible', { timeout: 5000 });
    await p.evaluate(() => { const w = Ext.ComponentQuery.query('window{isVisible()}').find(x => !!x.down('#choixEdition')); w.down('#choixEdition').setValue({ edition: 'details' }); });
    const idImprimer2 = await p.evaluate(() => { const w = Ext.ComponentQuery.query('window{isVisible()}').find(x => !!x.down('#choixEdition')); return w.down('button[text=Imprimer]').getId(); });
    await p.click('#' + idImprimer2);
    await p.waitForTimeout(800);
    const ouvertures2 = await p.evaluate(() => window.__ouvertures.splice(0));
    ok('L\'edition detaillee aussi : une ouverture, dans le clic, sur le flux PDF', ouvertures2.length === 1 && /detail-articles\/pdf$/.test(ouvertures2[0]), JSON.stringify(ouvertures2));
    const detailStatut = await p.evaluate(async (u) => { const r = await fetch(u); return r.status + ' ' + (r.headers.get('content-type') || ''); }, ouvertures2[0]);
    ok('Le flux detaille repond en PDF', /^200 .*pdf/.test(detailStatut), detailStatut);

    /* ---------------------------------------------------------- facturation ordinaire : pas de Regler */
    const liste = JSON.parse((await appel('GET', '../api/v1/facture-tiers-payant/list?start=0&limit=500&dtStart=' + JOUR + '&dtEnd=' + JOUR)).corps);
    const ligne = (liste.results || liste.data || []).find(f => f.lg_FACTURE_ID === facture.id);
    ok('La liste ordinaire marque la facture comme facture de carnet depot', !!ligne && ligne.carnetDepot === true, JSON.stringify(ligne || liste).slice(0, 200));
    const classe = await p.evaluate(() => {
      const vue = Ext.create('testextjs.view.sm_user.editfacture.EditFactureManager', {renderTo: Ext.getBody(), width: 900, height: 300});
      const colonne = vue.columns.filter(c => c.xtype === 'actioncolumn').find(c => c.items.some(i => typeof i.getClass === 'function' && /nonregle/.test(String(i.getClass))));
      const item = colonne.items.find(i => typeof i.getClass === 'function');
      const faux = (d) => ({ get: (k) => d[k] });
      const r = { depot: item.getClass(null, {}, faux({ carnetDepot: true, str_STATUT: 'enable', ACTION_REGLER_FACTURE: true })),
        ordinaire: item.getClass(null, {}, faux({ carnetDepot: false, str_STATUT: 'enable', ACTION_REGLER_FACTURE: true })) };
      vue.destroy();
      return r;
    });
    ok('Le bouton Regler est masque pour une facture de carnet depot, present pour une ordinaire',
      classe.depot === 'x-hide-display' && classe.ordinaire === 'nonregle', JSON.stringify(classe));

    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Deroulement sans exception', false, e.message + '\n' + e.stack);
  } finally {
    await b.close();
    retirerJeuDEssai();
    ok('Jeu d\'essai retire (tiers payant, compte, compteur, factures)',
      q("SELECT CONCAT(is_depot, '|', lg_TYPE_TIERS_PAYANT_ID, '|', account) FROM t_tiers_payant WHERE lg_TIERS_PAYANT_ID='" + TP + "'") === '0|' + typeAvant + '|' + compteAvant
      && q("SELECT str_VALUE FROM t_parameters WHERE str_KEY='KEY_CODE_FACTURE'") === compteurAvant
      && facturesDuJeu().length === 0 && parseInt(bonsUnpaid(), 10) === bonsAvant);
  }
  const ko = res.filter(r => !r.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' assertions');
  process.exit(ko ? 1 : 0);
})();
