/* ORDONNANCES CLIENTS : PREVENTE CREEE DEPUIS L'ORDONNANCE (retour du 30/09).
 *
 *  - client STANDARD : prevente au comptant, au nom du client ;
 *  - client ASSURANCE : prevente assurance avec son tiers payant PRINCIPAL (taux repris) et son ayant droit ;
 *  - client CARNET : prevente carnet avec son tiers payant principal ;
 *  - quantite = ce qui RESTE a servir (prescrite - servie) ; produit hors referentiel, deja servi ou sans stock :
 *    ecarte AVEC son motif, montre avant la creation ;
 *  - la prevente est une vente EN ATTENTE (statut pending), visible dans la liste des preventes de la caisse ;
 *  - le lien ordonnance - prevente est garde et affiche sur la fiche ; une seconde demande le signale ;
 *  - ordonnance annulee : refus.
 *
 * Joue a la souris pour le client standard (icone Consulter, bouton, boite de confirmation). Tout ce que le test
 * pose est retire a la fin : clients, comptes, liens tiers payant, ordonnances, preventes.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const MB4 = '--default-character-set=utf8mb4';
const exec = (s) => execFileSync('mariadb', [MB4, BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', [MB4, BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const M = 'E2E-PV';
const STD = M + '-STD', ASS = M + '-ASS', CAR = M + '-CAR';

const CAISSE = M + '-CAISSE';
let stocksOrigine = [];

/* Ventes de test : celles des clients d'essai, et leurs clones d'annulation. */
function ventesDuTest() {
  const clients = "('" + STD + "','" + ASS + "','" + CAR + "')";
  const ids = q("SELECT GROUP_CONCAT(lg_PREENREGISTREMENT_ID) FROM t_preenregistrement WHERE lg_CLIENT_ID IN " + clients);
  const liste = ids && ids !== 'NULL' ? ids.split(',') : [];
  if (liste.length) {
    const filles = q("SELECT GROUP_CONCAT(lg_PREENREGISTREMENT_ID) FROM t_preenregistrement WHERE lg_PARENT_ID IN ('" + liste.join("','")
      + "') OR lg_PREENGISTREMENT_ANNULE_ID IN ('" + liste.join("','") + "')");
    (filles && filles !== 'NULL' ? filles.split(',') : []).forEach((x) => { if (liste.indexOf(x) < 0) { liste.push(x); } });
  }
  return liste;
}

function nettoyer() {
  const clients = "('" + STD + "','" + ASS + "','" + CAR + "')";
  const ventes = ventesDuTest();
  if (ventes.length) {
    const liste = "('" + ventes.join("','") + "')";
    /* Ce que la cloture et l'annulation ecrivent, retire comme dans test-vente-contexte-depot. */
    exec("CREATE TEMPORARY TABLE e2e_pv_lignes AS SELECT lg_PREENREGISTREMENT_DETAIL_ID id FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN " + liste + ";"
      + "DELETE FROM hmvtproduit WHERE lg_PREENREGISTREMENT_DETAIL_ID IN (SELECT id FROM e2e_pv_lignes);"
      + "DELETE FROM hmvtproduit WHERE pkey IN " + liste + ";"
      + "DELETE FROM mvttransaction WHERE pkey IN " + liste + ";"
      + "DELETE FROM t_recettes WHERE str_REF_FACTURE IN " + liste + ";"
      + "CREATE TEMPORARY TABLE e2e_pv_regl AS SELECT lg_REGLEMENT_ID id FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN " + liste + " AND lg_REGLEMENT_ID IS NOT NULL;"
      + "UPDATE t_preenregistrement SET lg_PREENGISTREMENT_ANNULE_ID=NULL, lg_PARENT_ID=NULL, lg_REGLEMENT_ID=NULL WHERE lg_PREENREGISTREMENT_ID IN " + liste + ";"
      + "DELETE FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID IN " + liste + ";"
      + "DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN " + liste + ";"
      + "DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN " + liste + ";"
      + "DELETE FROM t_reglement WHERE lg_REGLEMENT_ID IN (SELECT id FROM e2e_pv_regl);"
      + "DELETE FROM t_reglement WHERE str_REF_RESSOURCE IN " + liste + ";"
      + "DROP TEMPORARY TABLE IF EXISTS e2e_pv_regl; DROP TEMPORARY TABLE IF EXISTS e2e_pv_lignes;");
  }
  exec("DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID='" + CAISSE + "';");
  stocksOrigine.forEach((st) => exec("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE=" + st.dispo + ", int_NUMBER=" + st.total
    + " WHERE lg_FAMILLE_STOCK_ID='" + st.id + "'"));
  exec("DELETE t FROM t_preenregistrement_compte_client_tiers_payent t JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID=t.lg_PREENREGISTREMENT_ID WHERE p.lg_CLIENT_ID IN " + clients + ";"
    + "DELETE d FROM t_preenregistrement_detail d JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID=d.lg_PREENREGISTREMENT_ID WHERE p.lg_CLIENT_ID IN " + clients + ";"
    + "DELETE FROM t_preenregistrement WHERE lg_CLIENT_ID IN " + clients + ";"
    + "DELETE l FROM t_ordonnance_client_prevente l JOIN t_ordonnance_client o ON o.lg_ORDONNANCE_ID=l.lg_ORDONNANCE_ID WHERE o.lg_CLIENT_ID IN " + clients + ";"
    + "DELETE d FROM t_ordonnance_client_detail d JOIN t_ordonnance_client o ON o.lg_ORDONNANCE_ID=d.lg_ORDONNANCE_ID WHERE o.lg_CLIENT_ID IN " + clients + ";"
    + "DELETE FROM t_ordonnance_client WHERE lg_CLIENT_ID IN " + clients + ";"
    + "DELETE FROM t_compte_client_tiers_payant WHERE lg_COMPTE_CLIENT_TIERS_PAYANT_ID LIKE '" + M + "%';"
    + "DELETE FROM t_compte_client WHERE lg_COMPTE_CLIENT_ID LIKE '" + M + "%';"
    + "DELETE FROM t_ayant_droit WHERE lg_AYANTS_DROITS_ID LIKE '" + M + "%';"
    + "DELETE FROM t_client WHERE lg_CLIENT_ID IN " + clients + ";");
}

function poser() {
  nettoyer();
  const tpAssurance = q("SELECT lg_TIERS_PAYANT_ID FROM t_tiers_payant WHERE str_STATUT='enable' AND b_CANBEUSE=1 AND lg_TYPE_TIERS_PAYANT_ID='1' LIMIT 1");
  const tpCarnet = q("SELECT lg_TIERS_PAYANT_ID FROM t_tiers_payant WHERE str_STATUT='enable' AND b_CANBEUSE=1 AND lg_TYPE_TIERS_PAYANT_ID='2' LIMIT 1");
  const client = (id, nom, type) => "INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, lg_TYPE_CLIENT_ID, str_ADRESSE, dt_CREATED, dt_UPDATED, str_STATUT)"
    + " VALUES ('" + id + "', '" + nom + "', 'E2E', '" + type + "', '0700000000', NOW(), NOW(), 'enable');";
  const compte = (id, clientId, tp, taux) => "INSERT INTO t_compte_client (lg_COMPTE_CLIENT_ID, lg_CLIENT_ID, str_STATUT, dt_CREATED, dt_UPDATED) VALUES ('" + id + "', '" + clientId + "', 'enable', NOW(), NOW());"
    + "INSERT INTO t_compte_client_tiers_payant (lg_COMPTE_CLIENT_TIERS_PAYANT_ID, lg_COMPTE_CLIENT_ID, lg_TIERS_PAYANT_ID, str_STATUT, int_POURCENTAGE, int_PRIORITY, dbl_PLAFOND, dt_CREATED, dt_UPDATED, b_CANBEUSE)"
    + " VALUES ('" + id + "-TP', '" + id + "', '" + tp + "', 'enable', " + taux + ", 1, 0, NOW(), NOW(), 1);";
  exec(client(STD, 'ZZPVSTANDARD', '6') + client(ASS, 'ZZPVASSURE', '1') + client(CAR, 'ZZPVCARNET', '2')
    + compte(M + '-CC-ASS', ASS, tpAssurance, 80) + compte(M + '-CC-CAR', CAR, tpCarnet, 100)
    + "INSERT INTO t_ayant_droit (lg_AYANTS_DROITS_ID, lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, str_STATUT, dt_CREATED, dt_UPDATED) VALUES ('" + M + "-AD', '" + ASS + "', 'ZZPVASSURE', 'E2E', 'enable', NOW(), NOW());");
}

(async () => {
  poser();
  /* Deux articles vendables (actifs, en stock, avec un prix) et un article sans stock, a l'emplacement de l'admin. */
  const emplacement = q("SELECT lg_EMPLACEMENT_ID FROM t_user WHERE str_LOGIN='admin'");
  const articles = q("SELECT f.lg_FAMILLE_ID, f.str_NAME, f.int_PRICE FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID=f.lg_FAMILLE_ID"
    + " WHERE s.lg_EMPLACEMENT_ID='" + emplacement + "' AND s.int_NUMBER_AVAILABLE >= 20 AND f.int_PRICE > 0 AND f.str_STATUT='enable'"
    + " AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 ORDER BY f.str_NAME LIMIT 2").split('\n').map((l) => l.split('\t'));
  const sansStock = q("SELECT f.lg_FAMILLE_ID, f.str_NAME FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID=f.lg_FAMILLE_ID"
    + " WHERE s.lg_EMPLACEMENT_ID='" + emplacement + "' AND s.int_NUMBER_AVAILABLE = 0 AND f.int_PRICE > 0 AND f.str_STATUT='enable'"
    + " AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 LIMIT 1").split('\t');
  /* Un article au stock FAIBLE (2 a 5) : prescrit au-dela, il est pris en partie (retour du 30/09). */
  const faible = q("SELECT f.lg_FAMILLE_ID, f.str_NAME, s.int_NUMBER_AVAILABLE FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID=f.lg_FAMILLE_ID"
    + " WHERE s.lg_EMPLACEMENT_ID='" + emplacement + "' AND s.int_NUMBER_AVAILABLE BETWEEN 2 AND 5 AND f.int_PRICE > 0 AND f.str_STATUT='enable'"
    + " AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 AND COALESCE(f.lg_FAMILLE_PARENT_ID, '') = '' LIMIT 1").split('\t');
  const stockFaible = Number(faible[2]);
  /* La cloture bouge le stock : il est remis a l'identique a la fin. */
  stocksOrigine = articles.concat([faible]).map((a) => { const r = q("SELECT CONCAT_WS('|', lg_FAMILLE_STOCK_ID, int_NUMBER_AVAILABLE, int_NUMBER) FROM t_famille_stock WHERE lg_FAMILLE_ID='" + a[0] + "' AND lg_EMPLACEMENT_ID='" + emplacement + "'").split('|'); return { id: r[0], dispo: r[1], total: r[2] }; });
  /* La cloture exige une caisse ouverte pour l'operateur (precondition, pas l'objet du test). */
  const admin = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='admin'");
  if (q("SELECT COUNT(*) FROM t_resume_caisse WHERE lg_USER_ID='" + admin + "' AND str_STATUT='is_Using'") === '0') {
    exec("INSERT INTO t_resume_caisse (ld_CAISSE_ID, lg_USER_ID, int_SOLDE_MATIN, int_SOLDE_SOIR, dt_DAY, dt_CREATED, lg_CREATED_BY, dt_UPDATED, lg_UPDATED_BY, str_STATUT)"
      + " VALUES ('" + CAISSE + "', '" + admin + "', 0, 0, CURDATE(), NOW(), '" + admin + "', NOW(), '" + admin + "', 'is_Using');");
  }
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('ordonnanceclient', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('ordonnanceclient #grilleOrdonnances').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(1500);

    const api = (url, methode, corps) => p.evaluate(async ([u, m, c]) => {
      const r = await fetch(u, { method: m, headers: { 'Content-Type': 'application/json' }, body: c ? JSON.stringify(c) : undefined });
      return JSON.parse(await r.text());
    }, [url, methode, corps]);
    const aujourdhui = new Date().toISOString().slice(0, 10);
    const produits = [
      { articleId: articles[0][0], libelle: articles[0][1], quantite: 3, qteServie: 1 },
      { articleId: articles[1][0], libelle: articles[1][1], quantite: 2 },
      { articleId: articles[0][0], libelle: articles[0][1], quantite: 2, qteServie: 2 },
      { articleId: sansStock[0], libelle: sansStock[1], quantite: 1 },
      { libelle: 'PRÉPARATION MAGISTRALE ZZ', quantite: 1 },
      { articleId: faible[0], libelle: faible[1], quantite: stockFaible + 2 }
    ];
    const ordStd = await api('../api/v1/ordonnance-client/enregistrer', 'POST', { clientId: STD, dateOrdonnance: aujourdhui, produits });
    const ordAss = await api('../api/v1/ordonnance-client/enregistrer', 'POST', { clientId: ASS, dateOrdonnance: aujourdhui, produits: produits.slice(0, 2) });
    ok('Précondition : un article au stock faible (' + stockFaible + ')', stockFaible >= 2 && !!faible[0], faible.join(' | '));
    const ordCar = await api('../api/v1/ordonnance-client/enregistrer', 'POST', { clientId: CAR, dateOrdonnance: aujourdhui, produits: produits.slice(1, 2) });
    ok('Préconditions : trois ordonnances (standard, assurance, carnet)', ordStd.success && ordAss.success && ordCar.success, JSON.stringify([ordStd, ordAss, ordCar]).slice(0, 300));

    /* ---------------------------------------------------------------- client standard, a la souris */
    await p.evaluate(() => { const e = Ext.ComponentQuery.query('ordonnanceclient')[0]; e.down('#barreCriteres #recherche').setValue('ZZPVSTANDARD'); });
    await p.waitForFunction(() => Ext.ComponentQuery.query('ordonnanceclient')[0].storeOrdonnances.getCount() === 1, null, { timeout: 20000 });
    await p.waitForTimeout(600);
    const icone = await p.evaluate(() => { const g = Ext.ComponentQuery.query('ordonnanceclient #grilleOrdonnances')[0]; const k = g.getView().getNode(0).querySelector('.ordo-act-consulter'); k.id = 'consulterPv'; return k.id; });
    await p.click('#' + icone); await p.waitForTimeout(1800);
    const bouton = await p.evaluate(() => { const bt = Ext.ComponentQuery.query('ordonnanceclient #vueFiche button[itemId=creerPrevente]')[0]; return { visible: bt.isVisible(), actif: !bt.isDisabled(), id: bt.getId() }; });
    ok('Fiche consultée : « Créer la prévente » visible et actif', bouton.visible && bouton.actif, JSON.stringify(bouton));
    await p.click('#' + bouton.id); await p.waitForTimeout(1500);
    const apercu = await p.evaluate(() => Ext.MessageBox.isVisible() ? Ext.MessageBox.msg.getEl().dom.textContent : '');
    ok('Aperçu avant création : comptant, au nom du client', /Au comptant/.test(apercu) && /ZZPVSTANDARD/.test(apercu), apercu);
    ok('Aperçu : quantités = reste à servir (3 - 1 = 2 et 2)', apercu.indexOf(articles[0][1] + ' × 2') >= 0 && apercu.indexOf(articles[1][1] + ' × 2') >= 0, apercu);
    ok('Aperçu : non repris, chacun avec son motif (déjà servi, rupture, hors référentiel)', /déjà servi/.test(apercu) && /en rupture/.test(apercu) && /hors référentiel/.test(apercu), apercu);
    ok('Aperçu : stock insuffisant, la ligne est prise EN PARTIE et le reste dû est dit', apercu.indexOf(faible[1] + ' × ' + stockFaible) >= 0 && apercu.indexOf('partiel : ' + stockFaible + ' en stock pour ' + (stockFaible + 2) + ' à servir, 2 restera à servir') >= 0, apercu);
    await p.evaluate(() => Ext.MessageBox.msgButtons.yes.el.dom.click());
    await p.waitForTimeout(2500);
    const resultat = await p.evaluate(() => { const t = Ext.MessageBox.isVisible() ? Ext.MessageBox.msg.getEl().dom.textContent : ''; if (Ext.MessageBox.isVisible()) { Ext.MessageBox.msgButtons.ok.el.dom.click(); } return t; });
    ok('Confirmation : « Prévente … créée : reprenez-la à la caisse »', /Prévente .* créée/.test(resultat) && /caisse/.test(resultat), resultat);
    const vente = q("SELECT CONCAT_WS('|', p.lg_PREENREGISTREMENT_ID, p.str_STATUT, p.lg_TYPE_VENTE_ID, p.str_TYPE_VENTE, p.lg_NATURE_VENTE_ID, p.int_PRICE, p.str_REF) FROM t_preenregistrement p WHERE p.lg_CLIENT_ID='" + STD + "'").split('|');
    const lignesStd = q("SELECT GROUP_CONCAT(CONCAT(d.lg_FAMILLE_ID, ':', d.int_QUANTITY) ORDER BY d.lg_FAMILLE_ID) FROM t_preenregistrement_detail d WHERE d.lg_PREENREGISTREMENT_ID='" + vente[0] + "'");
    const attendu = [articles[0][0] + ':2', articles[1][0] + ':2', faible[0] + ':' + stockFaible].sort().join(',');
    ok('En base : une vente EN ATTENTE (pending), au comptant, nature prescription', vente[1] === 'pending' && vente[2] === '1' && vente[4] === '1', vente.join(' | '));
    ok('En base : les produits aux quantités restant à servir, le stock faible pris en entier', lignesStd === attendu, lignesStd + ' / attendu ' + attendu);
    const prixFaible = Number(q("SELECT int_PRICE FROM t_famille WHERE lg_FAMILLE_ID='" + faible[0] + "'"));
    ok('Le montant est celui des prix de vente', Number(vente[5]) === 2 * Number(articles[0][2]) + 2 * Number(articles[1][2]) + stockFaible * prixFaible, vente[5]);
    ok('Le lien ordonnance - prévente est gardé', q("SELECT COUNT(*) FROM t_ordonnance_client_prevente WHERE lg_ORDONNANCE_ID='" + ordStd.id + "' AND lg_PREENREGISTREMENT_ID='" + vente[0] + "'") === '1');
    const etiquette = await p.evaluate(() => Ext.ComponentQuery.query('ordonnanceclient #vueFiche #preventesFiche')[0].getEl().dom.textContent);
    ok('La fiche affiche la prévente et son état', etiquette.indexOf(vente[6]) >= 0 && /En attente à la caisse/.test(etiquette), etiquette);
    const listeCaisse = await api('../api/v1/ventestats/preventes?start=0&limit=50&statut=pending&query=' + encodeURIComponent(vente[6]), 'GET');
    ok('Elle figure dans la liste des préventes de la caisse', JSON.stringify(listeCaisse).indexOf(vente[0]) >= 0, JSON.stringify(listeCaisse).slice(0, 200));
    await p.click('#' + bouton.id); await p.waitForTimeout(1500);
    const second = await p.evaluate(() => { const t = Ext.MessageBox.isVisible() ? Ext.MessageBox.msg.getEl().dom.textContent : ''; if (Ext.MessageBox.isVisible()) { Ext.MessageBox.msgButtons.no.el.dom.click(); } return t; });
    ok('Seconde demande : prévient qu\'une prévente est déjà en attente ; « Annuler » ne crée rien', /déjà en attente/.test(second) && q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_CLIENT_ID='" + STD + "'") === '1', second);

    /* ---------------------------------------------------------------- assurance et carnet */
    const pvAss = await api('../api/v1/ordonnance-client/prevente/' + ordAss.id, 'POST');
    const ass = q("SELECT CONCAT_WS('|', p.lg_PREENREGISTREMENT_ID, p.str_STATUT, p.lg_TYPE_VENTE_ID, p.str_TYPE_VENTE, p.lg_AYANTS_DROITS_ID) FROM t_preenregistrement p WHERE p.lg_CLIENT_ID='" + ASS + "'").split('|');
    const tpAss = q("SELECT CONCAT_WS('|', lg_COMPTE_CLIENT_TIERS_PAYANT_ID, int_PERCENT) FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID='" + ass[0] + "'");
    ok('Assurance : vente assurance en attente, avec l\'ayant droit du client', pvAss.success === true && ass[1] === 'pending' && ass[2] === '2' && ass[3] === 'VO' && ass[4] === M + '-AD', JSON.stringify(pvAss).slice(0, 200) + ' / ' + ass.join(' | '));
    ok('Assurance : le tiers payant PRINCIPAL, à son taux (80 %)', tpAss === M + '-CC-ASS-TP|80', tpAss);
    const pvCar = await api('../api/v1/ordonnance-client/prevente/' + ordCar.id, 'POST');
    const car = q("SELECT CONCAT_WS('|', p.lg_PREENREGISTREMENT_ID, p.str_STATUT, p.lg_TYPE_VENTE_ID) FROM t_preenregistrement p WHERE p.lg_CLIENT_ID='" + CAR + "'").split('|');
    const tpCar = q("SELECT lg_COMPTE_CLIENT_TIERS_PAYANT_ID FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID='" + car[0] + "'");
    ok('Carnet : vente carnet en attente, avec son tiers payant principal', pvCar.success === true && car[1] === 'pending' && car[2] === '3' && tpCar === M + '-CC-CAR-TP', JSON.stringify(pvCar).slice(0, 200) + ' / ' + car.join('|') + ' / ' + tpCar);

    /* ---------------------------------------------------------------- reprise a la caisse */
    /* Comme le clic sur une ligne de la liste des preventes (PreVentesCtr.onEdite) : l'ecran de vente reprend la
       prevente avec ses produits, son client et, en assurance, son tiers payant. */
    const reprendre = async (venteId, ref) => {
      const liste = await api('../api/v1/ventestats/preventes?start=0&limit=50&statut=pending&query=' + encodeURIComponent(ref), 'GET');
      const ligne = (liste.data || []).find((l) => l.lgPREENREGISTREMENTID === venteId);
      if (!ligne) { return { absente: true }; }
      await p.evaluate((r) => testextjs.app.getController('App').onRedirectTo('doventemanager', { isEdit: true, record: r, isDevis: false, categorie: 'PREVENTE' }), ligne);
      await p.waitForFunction(() => Ext.ComponentQuery.query('doventemanager #contenu #gridContainer #venteGrid').length > 0, null, { timeout: 30000 });
      await p.waitForTimeout(5000);
      const vue = await p.evaluate(() => {
        const c = testextjs.app.getController('VenteCtr');
        const g = Ext.ComponentQuery.query('doventemanager #contenu #gridContainer #venteGrid')[0];
        const f = c.getTpContainerForm && c.getTpContainerForm();
        const courant = c.getCurrent ? c.getCurrent() : null;
        return { vente: courant ? courant.lgPREENREGISTREMENTID : null, lignes: g.getStore().getCount(),
          type: c.getTypeVenteCombo().getValue(), tp: f ? f.items.getCount() : 0,
          assure: c.getNomAssure && c.getNomAssure() ? c.getNomAssure().getValue() : '' };
      });
      /* On ressort sans rien changer : retour a l'ecran des ordonnances. */
      await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('ordonnanceclient', {}));
      await p.waitForTimeout(2000);
      await p.evaluate(() => { if (Ext.MessageBox.isVisible()) { const bt = Ext.MessageBox.msgButtons.yes.isVisible() ? Ext.MessageBox.msgButtons.yes : Ext.MessageBox.msgButtons.ok; bt.el.dom.click(); } });
      await p.waitForTimeout(800);
      return vue;
    };
    const repriseStd = await reprendre(vente[0], vente[6]);
    ok('Caisse : la prévente standard se reprend, avec ses 3 produits, au comptant', repriseStd.vente === vente[0] && repriseStd.lignes === 3 && repriseStd.type === '1', JSON.stringify(repriseStd));
    const refAss = q("SELECT str_REF FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID='" + ass[0] + "'");
    const repriseAss = await reprendre(ass[0], refAss);
    ok('Caisse : la prévente assurance se reprend, en assurance, avec son tiers payant et son assuré', repriseAss.vente === ass[0] && repriseAss.lignes === 2 && repriseAss.type === '2' && repriseAss.tp >= 1 && /ZZPVASSURE/.test(repriseAss.assure), JSON.stringify(repriseAss));
    ok('Reprise sans modification : la vente reste en attente, intacte', q("SELECT CONCAT(str_STATUT, '|', (SELECT COUNT(*) FROM t_preenregistrement_detail d WHERE d.lg_PREENREGISTREMENT_ID=p.lg_PREENREGISTREMENT_ID)) FROM t_preenregistrement p WHERE p.lg_PREENREGISTREMENT_ID='" + vente[0] + "'") === 'pending|3');

    /* ---------------------------------------------------------------- cloture a la caisse : report du service */
    const servies = () => q("SELECT GROUP_CONCAT(COALESCE(int_QTE_SERVIE, 'x') ORDER BY int_ORDRE) FROM t_ordonnance_client_detail WHERE lg_ORDONNANCE_ID='" + ordStd.id + "'");
    const avantCloture = servies();
    ok('La prévente elle-même ne change pas l\'ordonnance (quantités servies inchangées)', avantCloture === '1,x,2,x,x,x', avantCloture);
    const cloture = await api('../api/v1/vente/cloturer/vno', 'POST', { venteId: vente[0], typeVenteId: '1', typeRegleId: '1',
      montantRecu: Number(vente[5]), montantRendu: 0, montantPaye: Number(vente[5]), montantVerse: Number(vente[5]) });
    ok('Précondition : la prévente est clôturée par le service de la caisse', cloture.success === true && q("SELECT str_STATUT FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID='" + vente[0] + "'") === 'is_Closed', JSON.stringify(cloture).slice(0, 200));
    ok('La clôture elle-même ne touche pas l\'ordonnance (la caisse n\'est pas modifiée)', servies() === avantCloture, servies());
    /* Ouvrir la fiche (icone Consulter) : le service vendu y est reporte. */
    /* L'ecran des ordonnances a ete rouvert apres le passage a la caisse : on refiltre sur le client standard. */
    await p.evaluate(() => { const e = Ext.ComponentQuery.query('ordonnanceclient')[0]; e.getLayout().setActiveItem(0); e.down('#barreCriteres #recherche').setValue('ZZPVSTANDARD'); });
    await p.waitForFunction(() => { const st = Ext.ComponentQuery.query('ordonnanceclient')[0].storeOrdonnances; return !st.isLoading() && st.getCount() === 1 && /ZZPVSTANDARD/.test(st.getAt(0).get('client')); }, null, { timeout: 20000 });
    await p.waitForTimeout(600);
    const icone2 = await p.evaluate(() => { const g = Ext.ComponentQuery.query('ordonnanceclient #grilleOrdonnances')[0]; const k = g.getView().getNode(0).querySelector('.ordo-act-consulter'); k.id = 'consulterPv2'; return k.id; });
    await p.click('#' + icone2); await p.waitForTimeout(2000);
    const fiche = await p.evaluate(() => Ext.ComponentQuery.query('ordonnanceclient')[0].storeProduits.getRange().map((r) => r.get('qteServie') === null ? 'x' : r.get('qteServie')).join(','));
    const apres = '3,2,2,x,x,' + stockFaible;
    ok('Après clôture : qté servie reportée (1 → 3, à renseigner → 2, ligne partielle → ' + stockFaible + '), les autres intactes', servies() === apres && fiche === apres, servies() + ' / fiche ' + fiche);
    const etiquette2 = await p.evaluate(() => Ext.ComponentQuery.query('ordonnanceclient #vueFiche #preventesFiche')[0].getEl().dom.textContent);
    ok('La fiche dit « Clôturée — N servi(s) reporté(s) »', new RegExp('Clôturée — ' + (4 + stockFaible) + ' servi\\(s\\) reporté\\(s\\)').test(etiquette2), etiquette2);
    const historique = await api('../api/v1/ordonnance-client/liste?query=ZZPVSTANDARD', 'GET');
    ok('L\'historique la dit « partielle » (3 lignes servies en entier sur 6) ; une seconde lecture ne reporte pas deux fois', historique.data && historique.data[0].etatService === 'partielle' && servies() === apres, JSON.stringify(historique.data && historique.data[0]).slice(0, 200));
    /* Annulation de la vente a la caisse : le report est defait. */
    const annulation = await api('../api/v1/vente/annulation/' + vente[0], 'GET');
    await api('../api/v1/ordonnance-client/' + ordStd.id, 'GET');
    ok('Vente annulée à la caisse : le report est défait (retour à 1 et à « à renseigner »)', servies() === avantCloture, JSON.stringify(annulation).slice(0, 150) + ' / ' + servies());

    /* ---------------------------------------------------------------- refus */
    exec("UPDATE t_compte_client_tiers_payant SET str_STATUT='disable' WHERE lg_COMPTE_CLIENT_TIERS_PAYANT_ID='" + M + "-CC-CAR-TP'");
    const sansTp = await api('../api/v1/ordonnance-client/prevente/' + ordCar.id + '/apercu', 'GET');
    ok('Carnet sans tiers payant actif : refus expliqué', sansTp.success === false && /aucun tiers payant actif/.test(sansTp.message), sansTp.message);
    await p.evaluate(async (id) => {
      await fetch('../api/v1/ordonnance-client/annuler?id=' + encodeURIComponent(id) + '&motif=E2E',
        { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    }, ordAss.id);
    const annulee = await api('../api/v1/ordonnance-client/prevente/' + ordAss.id, 'POST');
    ok('Ordonnance annulée : refus, aucune nouvelle vente', annulee.success === false && /annulée/.test(annulee.message) && q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_CLIENT_ID='" + ASS + "'") === '1', annulee.message);
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Parcours sans exception', false, e.message);
  } finally {
    await b.close();
    nettoyer();
    const reste = q("SELECT (SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID LIKE '" + M + "%') + (SELECT COUNT(*) FROM t_preenregistrement WHERE lg_CLIENT_ID LIKE '" + M + "%') + (SELECT COUNT(*) FROM t_compte_client WHERE lg_COMPTE_CLIENT_ID LIKE '" + M + "%')");
    ok('Jeu d\'essai retiré (clients, comptes, ordonnances, préventes)', reste === '0', reste);
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
