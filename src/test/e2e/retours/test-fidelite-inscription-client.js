/* FIDELITE : CASE « CLIENT FIDELITE » DE LA FICHE CLIENT (retours du 25/10, point 2).
 *
 * Tous les clients sont inscrits par defaut ; on retire ceux qu'on ne veut pas. Par les vues (admin),
 * GESTION DES TIERS-PAYANTS > Clients > Modifier, client d'essai (retire a la fin, parametres de fidelite remis) :
 *  - migration : tous les clients existants inscrits ; un nouveau client est inscrit ;
 *  - fiche (modification) : case « Client fidélité » cochee ; decochee + Enregistrer : client retire ;
 *  - retire : sa vente ne rapporte pas de points ; le paiement en points est refuse (caisse et cloture) ;
 *  - recoche : reinscrit ; seules les ventes faites apres la reinscription rapportent des points ;
 *  - la fiche n'a rien change d'autre ; aucune erreur JavaScript, aucune fenetre du navigateur.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN'], { input: s, encoding: 'utf8' }).trim();
const C = 'E2E-FINS-C1', ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const PRODUIT = q("SELECT lg_FAMILLE_ID FROM t_famille WHERE str_STATUT = 'enable' LIMIT 1");

function vente(id, minutes) {
  return "INSERT INTO t_preenregistrement (lg_PREENREGISTREMENT_ID, str_REF, str_REF_TICKET, lg_USER_ID, int_PRICE, int_PRICE_REMISE, int_CUST_PART, str_STATUT,"
    + " dt_CREATED, dt_UPDATED, str_TYPE_VENTE, lg_TYPE_VENTE_ID, b_IS_CANCEL, lg_CLIENT_ID) VALUES ('" + id + "', '" + id + "', 'TCK-" + id.slice(-2) + "', '" + ADMIN + "', "
    + "10000, 0, 0, 'is_Closed', NOW() - INTERVAL " + minutes + " MINUTE, NOW() - INTERVAL " + minutes + " MINUTE, 'VNO', '1', 0, '" + C + "');"
    + "INSERT INTO t_preenregistrement_detail (lg_PREENREGISTREMENT_DETAIL_ID, lg_PREENREGISTREMENT_ID, lg_FAMILLE_ID, int_QUANTITY, int_PRICE, int_PRICE_REMISE, prixAchat, str_STATUT, dt_CREATED, dt_UPDATED)"
    + " VALUES ('" + id + "-0', '" + id + "', '" + PRODUIT + "', 1, 10000, 0, 0, 'is_Closed', NOW(), NOW());";
}
function nettoyer() {
  q(`DELETE FROM t_fidelite_mouvement WHERE lg_CLIENT_ID = '${C}'; DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID LIKE 'E2E-FINS-%';`
    + `DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE 'E2E-FINS-%'; DELETE FROM t_compte_client_tiers_payant WHERE lg_COMPTE_CLIENT_ID = 'E2E-FINS-CPT'; DELETE FROM t_compte_client WHERE lg_CLIENT_ID = '${C}'; DELETE FROM t_ayant_droit WHERE lg_CLIENT_ID = '${C}'; DELETE FROM t_client WHERE lg_CLIENT_ID = '${C}';`);
}
function sauver() {
  q("DROP TABLE IF EXISTS zz_e2e_fins_param, zz_e2e_fins_excl, zz_e2e_fins_zone, zz_e2e_fins_palier;"
    + "CREATE TABLE zz_e2e_fins_param AS SELECT * FROM t_fidelite_parametre; CREATE TABLE zz_e2e_fins_excl AS SELECT * FROM t_fidelite_exclusion;"
    + "CREATE TABLE zz_e2e_fins_zone AS SELECT * FROM t_fidelite_exclusion_zone; CREATE TABLE zz_e2e_fins_palier AS SELECT * FROM t_fidelite_palier;");
}
function restaurer() {
  q("DELETE FROM t_fidelite_parametre; INSERT INTO t_fidelite_parametre SELECT * FROM zz_e2e_fins_param;"
    + "DELETE FROM t_fidelite_exclusion; INSERT INTO t_fidelite_exclusion SELECT * FROM zz_e2e_fins_excl;"
    + "DELETE FROM t_fidelite_exclusion_zone; INSERT INTO t_fidelite_exclusion_zone SELECT * FROM zz_e2e_fins_zone;"
    + "DELETE FROM t_fidelite_palier; INSERT INTO t_fidelite_palier SELECT * FROM zz_e2e_fins_palier;"
    + "DROP TABLE zz_e2e_fins_param, zz_e2e_fins_excl, zz_e2e_fins_zone, zz_e2e_fins_palier;"
    + "UPDATE t_type_reglement SET str_STATUT = IF((SELECT bool_ACTIF FROM t_fidelite_parametre LIMIT 1) = 1, 'enable', 'disable') WHERE lg_TYPE_REGLEMENT_ID = '20';"
    + "UPDATE t_mode_reglement SET str_STATUT = IF((SELECT bool_ACTIF FROM t_fidelite_parametre LIMIT 1) = 1, 'enable', 'disable') WHERE lg_TYPE_REGLEMENT_ID = '20';");
}
const gains = () => q(`SELECT IFNULL(GROUP_CONCAT(lg_PREENREGISTREMENT_ID ORDER BY lg_PREENREGISTREMENT_ID), '') FROM t_fidelite_mouvement WHERE lg_CLIENT_ID = '${C}' AND str_TYPE = 'GAIN'`);

(async () => {
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  const erreurs = [], dialogues = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  const api = (m, u) => p.evaluate((a) => fetch(a[1], { method: a[0] }).then((r) => r.json()), [m, u]);
  const fiche = async () => {
    await p.evaluate(() => { Ext.getCmp('rechecher').setValue('ZZFIDINSCRIT'); Ext.ComponentQuery.query('clientgestion')[0].onRechClick(); });
    await p.waitForTimeout(3000);
    const o = await p.evaluate((c) => { const g = Ext.ComponentQuery.query('clientgestion')[0]; const i = g.getStore().findExact('lg_CLIENT_ID', c);
      if (i < 0) { return 'absent'; } g.onEditClick(g, i); return 'ok'; }, C);
    await p.waitForFunction(() => { const c = Ext.getCmp('client_FIDELITE'); return c && c.isVisible(); }, null, { timeout: 15000 }).catch(() => {});
    return o;
  };
  const enregistrer = async (valeur) => {
    await p.evaluate((v) => { Ext.getCmp('client_FIDELITE').setValue(v); }, valeur);
    const inscription = p.waitForResponse((r) => /fidelite\/client\/.*\/inscription/.test(r.url()) && r.request().method() === 'POST', { timeout: 20000 }).catch(() => null);
    await p.click('#' + await p.evaluate(() => Ext.getCmp('client_FIDELITE').up('window').down('button[text=Enregistrer]').getId()));
    await inscription;
    await p.waitForTimeout(1500);
    await p.evaluate(() => { while (Ext.MessageBox.isVisible()) { Ext.MessageBox.hide(); } });
  };
  try {
    sauver(); nettoyer();
    ok('Migration : tous les clients existants sont inscrits', q('SELECT COUNT(*) FROM t_client WHERE bool_FIDELITE <> 1') === '0');
    q("UPDATE t_fidelite_parametre SET bool_ACTIF = 1, dt_DEBUT = CURDATE() - INTERVAL 1 DAY, int_SEUIL_UTILISATION = 0, int_MONTANT_POINT = 1000, int_VALEUR_POINT = 5, str_MODE_EXCLUSION = 'FAMILLES';"
      + "DELETE FROM t_fidelite_exclusion; DELETE FROM t_fidelite_exclusion_zone; DELETE FROM t_fidelite_palier;"
      + `INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, lg_TYPE_CLIENT_ID, str_ADRESSE, dt_CREATED, dt_UPDATED, str_STATUT) VALUES ('${C}', 'ZZFIDINSCRIT', 'TEST', '1', '0707070799', NOW(), NOW(), 'enable');`
      + `UPDATE t_client SET str_NUMERO_SECURITE_SOCIAL = 'E2EFINS01' WHERE lg_CLIENT_ID = '${C}';`
      + `INSERT INTO t_compte_client (lg_COMPTE_CLIENT_ID, P_KEY, lg_CLIENT_ID, dt_CREATED, dt_UPDATED, str_STATUT, dbl_PLAFOND, dbl_CAUTION) VALUES ('E2E-FINS-CPT', '${C}', '${C}', NOW(), NOW(), 'enable', -1, -1);`
      /* comme un vrai client assure : la fiche exige un tiers payant en modification */
      + "INSERT INTO t_compte_client_tiers_payant (lg_COMPTE_CLIENT_TIERS_PAYANT_ID, lg_COMPTE_CLIENT_ID, lg_TIERS_PAYANT_ID, dt_CREATED, dt_UPDATED, str_STATUT, int_POURCENTAGE, int_PRIORITY)"
      + " SELECT 'E2E-FINS-CTP', 'E2E-FINS-CPT', t.lg_TIERS_PAYANT_ID, NOW(), NOW(), 'enable', 80, 1 FROM t_compte_client_tiers_payant t"
      + " JOIN t_tiers_payant tp ON tp.lg_TIERS_PAYANT_ID = t.lg_TIERS_PAYANT_ID WHERE t.str_STATUT = 'enable' AND tp.str_STATUT = 'enable' AND tp.lg_TYPE_TIERS_PAYANT_ID = '1' LIMIT 1;"
      + "INSERT INTO t_ayant_droit (lg_AYANTS_DROITS_ID, lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, str_NUMERO_SECURITE_SOCIAL, str_SEXE, dt_CREATED, dt_UPDATED, str_STATUT)"
      + ` VALUES ('${C}', '${C}', 'ZZFIDINSCRIT', 'TEST', 'E2EFINS01', 'F', NOW(), NOW(), 'enable');`);
    ok('Nouveau client : inscrit par défaut', q(`SELECT bool_FIDELITE FROM t_client WHERE lg_CLIENT_ID = '${C}'`) === '1');

    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'GESTION DES TIERS-PAYANTS', 'Clients');
    await p.waitForFunction(() => Ext.getCmp('rechecher') && Ext.ComponentQuery.query('clientgestion').length, null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    let o = await fiche();
    let cas = await p.evaluate(() => { const c = Ext.getCmp('client_FIDELITE'); return c ? { vue: c.isVisible(), coche: c.getValue(), libelle: c.boxLabel } : null; });
    ok('Fiche client (modification) : case « Client fidélité » cochée', o === 'ok' && cas && cas.vue && cas.coche === true, o + ' ' + JSON.stringify(cas));
    await enregistrer(false);
    ok('Décochée puis enregistrée : client retiré de la fidélité', q(`SELECT bool_FIDELITE FROM t_client WHERE lg_CLIENT_ID = '${C}'`) === '0');
    ok('La fiche n\'a rien changé d\'autre (nom, téléphone)', q(`SELECT CONCAT(str_FIRST_NAME, '|', str_LAST_NAME, '|', str_ADRESSE) FROM t_client WHERE lg_CLIENT_ID = '${C}'`) === 'ZZFIDINSCRIT|TEST|0707070799');

    q(vente('E2E-FINS-V1', 30) + `INSERT INTO t_fidelite_mouvement (lg_MOUVEMENT_ID, lg_CLIENT_ID, str_TYPE, int_POINTS, int_RESTANTS, dt_MOUVEMENT, dt_CREATED) VALUES ('E2E-FINS-M0', '${C}', 'AJUSTEMENT', 100, 100, NOW() - INTERVAL 2 HOUR, NOW());`);
    const paie = await api('GET', '../api/v1/fidelite/paiement?client=' + C);
    ok('Retiré : sa vente ne rapporte pas de points', gains() === '', gains());
    ok('Retiré : la caisse refuse le paiement en points, motif clair', paie.success && paie.inscrit === false && paie.utilisable === false && /pas inscrit/.test(paie.msg), JSON.stringify(paie));

    await p.waitForTimeout(1200);
    o = await fiche();
    cas = await p.evaluate(() => Ext.getCmp('client_FIDELITE').getValue());
    ok('Fiche rouverte : case décochée', o === 'ok' && cas === false);
    await enregistrer(true);
    ok('Recochée : client réinscrit (date de réinscription notée)', q(`SELECT CONCAT(bool_FIDELITE, '|', dt_FIDELITE_INSCRIPTION IS NOT NULL) FROM t_client WHERE lg_CLIENT_ID = '${C}'`) === '1|1');
    q(vente('E2E-FINS-V2', -1));
    const paie2 = await api('GET', '../api/v1/fidelite/paiement?client=' + C);
    ok('Réinscrit : seule la vente faite après la réinscription rapporte des points', gains() === 'E2E-FINS-V2', gains());
    ok('Réinscrit : le paiement en points redevient possible', paie2.inscrit === true && paie2.utilisable === true, JSON.stringify(paie2));
    ok('Aucune erreur JavaScript, aucune fenêtre du navigateur', erreurs.length === 0 && dialogues.length === 0, erreurs.concat(dialogues).join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
    nettoyer(); restaurer();
    ok('Jeu d\'essai retiré, paramètres remis', q(`SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID = '${C}'`) === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
