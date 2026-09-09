/* Retour du 08/09 - point 2 : factures de carnet depot.
 *
 * Une facture de carnet depot est une VRAIE facture : numerotee, definitive, creee d'un coup depuis
 * le menu du carnet depot. Elle ne figure jamais dans la facturation ordinaire, dont les selecteurs
 * ne proposent plus les carnets depot. Elle se supprime simplement (sans avoir FNE), ses bons
 * redevenant facturables. A l'ecran : imprimer et supprimer sur la ligne, suppression multiple en
 * haut, plus de statut « provisoire », plus de fenetre de modele.
 *
 * Jeu d'essai : un tiers payant reel, marque « depot » le temps du test ; la facture generee est
 * supprimee par le test lui-meme ; le compteur de numeros de facture est remis a sa valeur.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
const TP = '1619143351587397512';
const JOUR = '2026-06-22';
let compteurAvant = null;

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
/* Le banc n'a plus les comptes clients de ce tiers payant (export anonymise) : la generation les
   traverse (client, plafond) et tomberait sur EntityNotFoundException. On pose les comptes
   manquants, rattaches a un client d'essai, et on les retire a la fin - la contrainte est levee le
   temps du retrait, comme au lot D, pour rendre la base exactement dans son etat. */
const MARQUE = 'E2E-P2';
function poserComptesManquants() {
  exec("INSERT IGNORE INTO t_client (lg_CLIENT_ID,str_FIRST_NAME,str_LAST_NAME,str_STATUT,dt_CREATED,dt_UPDATED,lg_TYPE_CLIENT_ID)"
    + " VALUES ('" + MARQUE + "-CLT','P2','ESSAI','enable',NOW(),NOW(),'6');");
  exec("INSERT IGNORE INTO t_compte_client (lg_COMPTE_CLIENT_ID,str_CODE_COMPTE_CLIENT,str_TYPE,dec_Balance,dt_CREATED,dt_UPDATED,str_STATUT,lg_CLIENT_ID)"
    + " SELECT DISTINCT cl.lg_COMPTE_CLIENT_ID,'" + MARQUE + "','CLIENT',0,NOW(),NOW(),'enable','" + MARQUE + "-CLT'"
    + " FROM t_compte_client_tiers_payant cl LEFT JOIN t_compte_client cc ON cc.lg_COMPTE_CLIENT_ID=cl.lg_COMPTE_CLIENT_ID"
    + " WHERE cl.lg_TIERS_PAYANT_ID='" + TP + "' AND cc.lg_COMPTE_CLIENT_ID IS NULL;");
}
/* Meme lacune pour les utilisateurs des bons : on cree les identifiants manquants comme copies
   minimales de l'utilisateur de test, et on les retire a la fin. */
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
    + " WHERE cl.lg_TIERS_PAYANT_ID='" + TP + "' AND DATE(p.dt_UPDATED)='" + JOUR + "' AND u.lg_USER_ID IS NULL")
    .split('\n').filter(Boolean);
  manquants.forEach(function (id, i) {
    exec("INSERT IGNORE INTO t_user SELECT * FROM t_user WHERE str_LOGIN='KGA3';"); // sans effet : cle identique
    exec("CREATE TEMPORARY TABLE IF NOT EXISTS tmp_u AS SELECT * FROM t_user WHERE str_LOGIN='KGA3';"
      + " UPDATE tmp_u SET lg_USER_ID='" + id + "', str_LOGIN='" + MARQUE + "-U" + i + "';"
      + " INSERT IGNORE INTO t_user SELECT * FROM tmp_u; DROP TEMPORARY TABLE tmp_u;");
  });
  return manquants.length;
}
function retirerComptesManquants() {
  exec("SET FOREIGN_KEY_CHECKS=0; DELETE FROM t_compte_client WHERE str_CODE_COMPTE_CLIENT='" + MARQUE + "';"
    + " DELETE FROM t_client WHERE lg_CLIENT_ID='" + MARQUE + "-CLT';"
    + " DELETE FROM t_user WHERE str_LOGIN LIKE '" + MARQUE + "-U%'; SET FOREIGN_KEY_CHECKS=1;");
}

function retirerJeuDEssai() {
  retirerComptesManquants();
  facturesDuJeu().forEach(id => {
    exec("UPDATE t_preenregistrement_compte_client_tiers_payent SET str_STATUT_FACTURE='UNPAID'"
      + " WHERE lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID IN (SELECT str_REF FROM t_facture_detail WHERE lg_FACTURE_ID='" + id + "');"
      + "DELETE FROM t_facture_detail WHERE lg_FACTURE_ID='" + id + "'; DELETE FROM t_facture WHERE lg_FACTURE_ID='" + id + "';");
  });
  exec("UPDATE t_tiers_payant SET is_depot=0 WHERE lg_TIERS_PAYANT_ID='" + TP + "';");
  if (compteurAvant !== null) {
    exec("UPDATE t_parameters SET str_VALUE='" + compteurAvant + "' WHERE str_KEY='KEY_CODE_FACTURE';");
  }
}

(async () => {
  try { retirerJeuDEssai(); } catch (e) { }
  compteurAvant = q("SELECT str_VALUE FROM t_parameters WHERE str_KEY='KEY_CODE_FACTURE'");
  exec("UPDATE t_tiers_payant SET is_depot=1 WHERE lg_TIERS_PAYANT_ID='" + TP + "';");
  poserComptesManquants();
  poserUtilisateursManquants();
  const bonsAvant = parseInt(bonsUnpaid(), 10);
  ok('jeu d essai : un carnet depot avec des bons non factures', bonsAvant > 0, 'bons=' + bonsAvant + ' compteur=' + compteurAvant);

  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } });
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
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

  /* ----------------------------------------------- les selecteurs de tiers payant */
  const ordinaire = JSON.parse((await appel('GET', '../api/v1/client/tiers-payants?carnetDepot=false')).corps);
  ok('la facturation ordinaire ne propose PAS le carnet depot',
     !(ordinaire.data || []).some(t => t.lgTIERSPAYANTID === TP), 'total=' + (ordinaire.data || []).length);
  const depots = JSON.parse((await appel('GET', '../api/v1/client/tiers-payants?carnetDepot=true')).corps);
  ok('le menu du carnet depot ne propose QUE les carnets depot',
     (depots.data || []).length >= 1 && (depots.data || []).every(t => t.lgTIERSPAYANTID === TP), JSON.stringify(depots.data || []).slice(0, 150));
  const tous = JSON.parse((await appel('GET', '../api/v1/client/tiers-payants')).corps);
  ok('sans parametre, la liste reste celle de toujours (aucun autre appelant ne change)',
     (tous.data || []).some(t => t.lgTIERSPAYANTID === TP) && (tous.data || []).length > (depots.data || []).length);

  /* ----------------------------------------------- generation : definitive, numerotee */
  const gen = JSON.parse((await appel('POST', '../api/v1/facturation/carnet-depot/generer',
    { mode: 'TP', tpid: TP, dtStart: JOUR, dtEnd: JOUR, datas: [] })).corps);
  ok('la generation depuis le menu du carnet depot repond', gen.success === true && gen.total === 1, JSON.stringify(gen).slice(0, 200));
  const facture = (gen.factures || [])[0] || {};
  const enBase = q("SELECT template, str_CODE_FACTURE, int_NB_DOSSIER FROM t_facture WHERE lg_FACTURE_ID='" + facture.id + "'").split('\t');
  ok('la facture est DEFINITIVE (pas une provisoire)', enBase[0] !== '' && enBase[0] !== '1', 'template=' + JSON.stringify(enBase[0]));
  ok('la facture porte un numero, le suivant du compteur',
     enBase[1] === String(parseInt(compteurAvant, 10)) || enBase[1] === facture.code, 'code=' + enBase[1] + ' attendu=' + compteurAvant);
  ok('la facture porte tous les bons du jour', parseInt(enBase[2], 10) === bonsAvant, enBase[2] + ' / ' + bonsAvant);
  ok('les bons sont marques factures', bonsUnpaid() === '0', 'restants=' + bonsUnpaid());

  /* ----------------------------------------------- ou elle apparait, ou elle n apparait pas */
  const listeDepot = JSON.parse((await appel('GET', '../api/v1/facturation/summary/carnet-depot?start=0&limit=50&tpid=' + TP)).corps);
  ok('elle figure dans le menu du carnet depot', (listeDepot.data || []).some(f => f.lgFACTUREID === facture.id));
  const ordinaires = JSON.parse((await appel('GET', '../api/v1/facturation/invoices?start=0&limit=500&dtStart=' + JOUR + '&dtEnd=' + JOUR)).corps);
  ok('elle ne figure PAS dans les factures ordinaires', !(ordinaires.data || []).some(f => f.lgFACTUREID === facture.id), 'total=' + ordinaires.total);
  const provisoires = JSON.parse((await appel('GET', '../api/v1/facturation/provisoires?start=0&limit=500')).corps);
  ok('elle ne figure PAS dans les provisoires', !(provisoires.data || []).some(f => f.lgFACTUREID === facture.id));

  /* ----------------------------------------------- editions */
  const sans = await p.evaluate(async (id) => { const r = await fetch('../api/v1/facturation/facture/' + id + '/carnet-depot/pdf'); return r.status; }, facture.id);
  ok('edition sans les produits : 200', sans === 200, sans);
  const avec = JSON.parse((await appel('GET', '../api/v1/facturation/facture/' + facture.id + '/detail-articles')).corps);
  ok('edition avec les produits : le modele DETAIL_ARTICLE repond', avec.success === true, JSON.stringify(avec).slice(0, 150));

  /* ----------------------------------------------- ecran */
  await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('reglementdepot', {}));
  await p.waitForFunction(() => Ext.ComponentQuery.query('reglementdepot').length > 0, null, { timeout: 20000 });
  await p.waitForTimeout(800);
  await p.evaluate(() => { const v = Ext.ComponentQuery.query('reglementdepot')[0]; v.setActiveTab(v.down('#facturesPanel')); });
  await p.waitForTimeout(2500);
  const ecran = await p.evaluate(() => {
    const grille = Ext.ComponentQuery.query('reglementdepot #grilleFacturesDepot')[0];
    const actions = grille.columns.filter(c => c.xtype === 'actioncolumn');
    return {
      colonnes: grille.columns.map(c => c.text || c.header),
      statut: grille.columns.some(c => /statut/i.test(c.text || '')),
      /* Retour du 09/09 : une colonne par action (Voir, Imprimer, Supprimer), les icones ne se touchent plus. */
      iconesLigne: actions.reduce((n, c) => n + c.items.length, 0),
      colonnesAction: actions.map(c => c.text),
      boutonHaut: (grille.down('#btnSupprimerFactureDepot') || {}).text,
      ancienBoutonImprimer: !!grille.down('#btnImprimerFactureDepot')
    };
  });
  ok('ecran : plus de colonne « Statut »', ecran.statut === false, ecran.colonnes.join(' | '));
  ok('ecran : voir, imprimer et supprimer sur la ligne, chacun dans sa colonne',
     ecran.iconesLigne === 3 && ecran.colonnesAction.join('|') === 'Voir|Imprimer|Supprimer', JSON.stringify(ecran));
  ok('ecran : le bouton du haut ne sert qu a la suppression multiple',
     /s[eé]lection/i.test(ecran.boutonHaut || '') && ecran.ancienBoutonImprimer === false, JSON.stringify(ecran));

  // l'imprimante de la ligne : la fenetre propose « avec » ou « sans » les produits, sans modele
  const fenetre = await p.evaluate((id) => {
    const vue = Ext.ComponentQuery.query('reglementdepot')[0];
    const grille = vue.down('#grilleFacturesDepot');
    const rec = grille.getStore().getRange().find(r => r.get('lgFACTUREID') === id);
    if (!rec) { return null; }
    vue.fireEvent('imprimerFactureDepot', rec);
    const w = Ext.ComponentQuery.query('window{isVisible()}').find(x => !!x.down('#choixEdition'));
    if (!w) { return { fenetre: false }; }
    const choix = w.down('#choixEdition').query('radiofield').map(r => r.boxLabel);
    const titre = w.title;
    w.destroy();
    return { fenetre: true, choix: choix, titre: titre };
  }, facture.id);
  ok('ecran : l imprimante de la ligne ouvre le choix avec / sans les produits, sans modele de facture',
     fenetre && fenetre.fenetre && fenetre.choix.length === 2 && /N/.test(fenetre.titre || ''), JSON.stringify(fenetre));

  // l'ecran de creation : titre et retour
  await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('oneditfacture', { carnetDepot: true, tiersPayantId: '' }));
  await p.waitForFunction(() => Ext.ComponentQuery.query('oneditfacture').length > 0, null, { timeout: 20000 });
  await p.waitForTimeout(1200);
  const creation = await p.evaluate(() => {
    const v = Ext.ComponentQuery.query('oneditfacture')[0];
    return { titre: v.title, depot: v.enCarnetDepot === true, extra: v.down('#tpayant').getStore().getProxy().extraParams };
  });
  ok('ecran de creation : il ne parle plus de « factures provisoires »',
     creation.depot && !/provisoire/i.test(creation.titre), JSON.stringify(creation));
  ok('ecran de creation : le selecteur ne propose que les carnets depot', !!creation.extra && creation.extra.carnetDepot === true, JSON.stringify(creation.extra));
  await p.evaluate(() => testextjs.app.getController('FactureCtr').onCancel());
  await p.waitForTimeout(1500);
  const retour = await p.evaluate(() => {
    const v = Ext.ComponentQuery.query('reglementdepot')[0];
    return v ? (v.getActiveTab() ? v.getActiveTab().getItemId() : '?') : 'absent';
  });
  ok('ecran de creation : « Annuler » ramene au menu du carnet depot, onglet FACTURES', retour === 'facturesPanel', retour);

  /* ----------------------------------------------- suppression */
  const autre = q("SELECT f.lg_FACTURE_ID FROM t_facture f JOIN t_tiers_payant t ON t.lg_TIERS_PAYANT_ID=f.tiersPayant WHERE (t.is_depot IS NULL OR t.is_depot=0) LIMIT 1");
  const refus = JSON.parse((await appel('POST', '../api/v1/facturation/carnet-depot/supprimer', { ids: [autre] })).corps);
  ok('suppression : une facture ordinaire est refusee', refus.success === true && refus.supprimees === 0 && (refus.refusees || []).length === 1, JSON.stringify(refus).slice(0, 200));
  ok('suppression : la facture ordinaire est toujours la', q("SELECT COUNT(*) FROM t_facture WHERE lg_FACTURE_ID='" + autre + "'") === '1');
  exec("UPDATE t_facture SET dbl_MONTANT_PAYE=100 WHERE lg_FACTURE_ID='" + facture.id + "';");
  const refusPaye = JSON.parse((await appel('POST', '../api/v1/facturation/carnet-depot/supprimer', { ids: [facture.id] })).corps);
  ok('suppression : une facture deja reglee est refusee, avec le motif', refusPaye.supprimees === 0 && /r[eè]glement/i.test(JSON.stringify(refusPaye.refusees)), JSON.stringify(refusPaye).slice(0, 200));
  exec("UPDATE t_facture SET dbl_MONTANT_PAYE=0 WHERE lg_FACTURE_ID='" + facture.id + "';");
  const suppr = JSON.parse((await appel('POST', '../api/v1/facturation/carnet-depot/supprimer', { ids: [facture.id] })).corps);
  ok('suppression : la facture de carnet depot est supprimee', suppr.success === true && suppr.supprimees === 1, JSON.stringify(suppr).slice(0, 150));
  ok('suppression : plus de facture ni de lignes en base',
     q("SELECT COUNT(*) FROM t_facture WHERE lg_FACTURE_ID='" + facture.id + "'") === '0'
     && q("SELECT COUNT(*) FROM t_facture_detail WHERE lg_FACTURE_ID='" + facture.id + "'") === '0');
  ok('suppression : les bons redeviennent facturables', parseInt(bonsUnpaid(), 10) === bonsAvant, bonsUnpaid() + ' / ' + bonsAvant);

  ok('aucune erreur javascript', err.length === 0, err.join(' | '));
  await b.close();
  retirerJeuDEssai();
  ok('jeu d essai retire (tiers payant, compteur de numeros)',
     q("SELECT is_depot FROM t_tiers_payant WHERE lg_TIERS_PAYANT_ID='" + TP + "'") === '0'
     && q("SELECT str_VALUE FROM t_parameters WHERE str_KEY='KEY_CODE_FACTURE'") === compteurAvant
     && parseInt(bonsUnpaid(), 10) === bonsAvant);
  const echecs = res.filter(x => !x.c);
  console.log('\n' + (res.length - echecs.length) + '/' + res.length + ' OK');
  process.exit(echecs.length ? 1 : 0);
})().catch(e => { console.error(e); try { retirerJeuDEssai(); } catch (x) { } process.exit(1); });
