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

function nettoyer() {
  const clients = "('" + STD + "','" + ASS + "','" + CAR + "')";
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
      { libelle: 'PRÉPARATION MAGISTRALE ZZ', quantite: 1 }
    ];
    const ordStd = await api('../api/v1/ordonnance-client/enregistrer', 'POST', { clientId: STD, dateOrdonnance: aujourdhui, produits });
    const ordAss = await api('../api/v1/ordonnance-client/enregistrer', 'POST', { clientId: ASS, dateOrdonnance: aujourdhui, produits: produits.slice(0, 2) });
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
    ok('Aperçu : non repris, chacun avec son motif (déjà servi, stock, hors référentiel)', /déjà servi/.test(apercu) && /stock insuffisant/.test(apercu) && /hors référentiel/.test(apercu), apercu);
    await p.evaluate(() => Ext.MessageBox.msgButtons.yes.el.dom.click());
    await p.waitForTimeout(2500);
    const resultat = await p.evaluate(() => { const t = Ext.MessageBox.isVisible() ? Ext.MessageBox.msg.getEl().dom.textContent : ''; if (Ext.MessageBox.isVisible()) { Ext.MessageBox.msgButtons.ok.el.dom.click(); } return t; });
    ok('Confirmation : « Prévente … créée : reprenez-la à la caisse »', /Prévente .* créée/.test(resultat) && /caisse/.test(resultat), resultat);
    const vente = q("SELECT CONCAT_WS('|', p.lg_PREENREGISTREMENT_ID, p.str_STATUT, p.lg_TYPE_VENTE_ID, p.str_TYPE_VENTE, p.lg_NATURE_VENTE_ID, p.int_PRICE, p.str_REF) FROM t_preenregistrement p WHERE p.lg_CLIENT_ID='" + STD + "'").split('|');
    const lignesStd = q("SELECT GROUP_CONCAT(CONCAT(d.lg_FAMILLE_ID, ':', d.int_QUANTITY) ORDER BY d.lg_FAMILLE_ID) FROM t_preenregistrement_detail d WHERE d.lg_PREENREGISTREMENT_ID='" + vente[0] + "'");
    const attendu = [articles[0][0] + ':2', articles[1][0] + ':2'].sort().join(',');
    ok('En base : une vente EN ATTENTE (pending), au comptant, nature prescription', vente[1] === 'pending' && vente[2] === '1' && vente[4] === '1', vente.join(' | '));
    ok('En base : les deux produits, aux quantités restant à servir', lignesStd === attendu, lignesStd + ' / attendu ' + attendu);
    ok('Le montant est celui des prix de vente', Number(vente[5]) === 2 * Number(articles[0][2]) + 2 * Number(articles[1][2]), vente[5]);
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
    ok('Caisse : la prévente standard se reprend, avec ses 2 produits, au comptant', repriseStd.vente === vente[0] && repriseStd.lignes === 2 && repriseStd.type === '1', JSON.stringify(repriseStd));
    const refAss = q("SELECT str_REF FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID='" + ass[0] + "'");
    const repriseAss = await reprendre(ass[0], refAss);
    ok('Caisse : la prévente assurance se reprend, en assurance, avec son tiers payant et son assuré', repriseAss.vente === ass[0] && repriseAss.lignes === 2 && repriseAss.type === '2' && repriseAss.tp >= 1 && /ZZPVASSURE/.test(repriseAss.assure), JSON.stringify(repriseAss));
    ok('Reprise sans modification : la vente reste en attente, intacte', q("SELECT CONCAT(str_STATUT, '|', (SELECT COUNT(*) FROM t_preenregistrement_detail d WHERE d.lg_PREENREGISTREMENT_ID=p.lg_PREENREGISTREMENT_ID)) FROM t_preenregistrement p WHERE p.lg_PREENREGISTREMENT_ID='" + vente[0] + "'") === 'pending|2');

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
    ok('L\'ordonnance elle-même n\'est pas modifiée par la prévente (quantités servies inchangées)', q("SELECT GROUP_CONCAT(COALESCE(int_QTE_SERVIE, 'x') ORDER BY int_ORDRE) FROM t_ordonnance_client_detail WHERE lg_ORDONNANCE_ID='" + ordStd.id + "'") === '1,x,2,x,x');
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
