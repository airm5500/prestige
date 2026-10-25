/* VENTE TERMINEE > « Modifier info client » > « Modifier le tiers-payant » (journaux du 11/09, 20/09 et 19/10).
 *
 *  - « TypeError: can't access property "strFULLNAME", tpRecord.data is undefined » (UpdateVenteClientTpForm.js) :
 *    « Valider » sans tiers-payant choisi plantait la fenetre « TIERS-PAYANTS ASSOCIES » ;
 *  - « ReferenceError: itemId is not defined » : choisir « AJOUTER UN NOUVEAU TIERS-PAYANT » plantait, la creation
 *    d'un tiers-payant depuis la vente n'a jamais pu aboutir.
 *
 * Parcours par les vues (vente VO cloturee du banc avec un tiers-payant), avec le droit P_BTN_UPDATE_VENTE_CLIENT_TP
 * accorde le temps du test :
 *  - menu SERVICE CLIENT > « Vente terminées » ; dates et reference saisies au clavier ; « Modifier info client » ;
 *  - « Modifier le tiers-payant », puis « Valider » sans choix : la liste est marquee en erreur, la fenetre reste,
 *    aucune erreur JavaScript ;
 *  - « AJOUTER UN NOUVEAU TIERS-PAYANT » : la saisie s'ouvre ; nom, telephone, adresse, code saisis au clavier ;
 *    « Enregistrer » : les deux fenetres se ferment, la ligne du tiers-payant de la vente affiche le nouveau ;
 *  - la vente n'est pas enregistree (fenetre fermee sans valider).
 * Donnees retirees a la fin : le tiers-payant cree (nom « E2E TP CHANGE ») et son compte, priorites des comptes du
 * client remises a l'identique, droit d'essai.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer, choisir, saisir } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const LOGIN = ENV_E2E.LOGIN, DROIT = 'E2E-VTE-CHGTP', NOM = 'E2E TP CHANGE';
const PRIVILEGE = q("SELECT lg_PRIVELEGE_ID FROM t_privilege WHERE str_NAME = 'P_BTN_UPDATE_VENTE_CLIENT_TP'");
const ROLE = q("SELECT ru.lg_ROLE_ID FROM t_role_user ru JOIN t_user u ON u.lg_USER_ID = ru.lg_USER_ID WHERE u.str_LOGIN = '" + LOGIN + "' LIMIT 1");
const DEJA = q("SELECT COUNT(*) FROM t_role_privelege WHERE lg_ROLE_ID = '" + ROLE + "' AND lg_PRIVILEGE_ID = '" + PRIVILEGE + "'") !== '0';
/* vente VO cloturee avec un tiers-payant, reference unique dans sa journee */
const [VENTE, REF, JOUR, CLIENT] = q("SELECT p.lg_PREENREGISTREMENT_ID, p.str_REF, DATE_FORMAT(p.dt_UPDATED, '%d/%m/%Y'), p.lg_CLIENT_ID FROM t_preenregistrement p"
  + " WHERE p.str_TYPE_VENTE = 'VO' AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 AND p.lg_CLIENT_ID IS NOT NULL"
  + " AND DATE(p.dt_CREATED) = DATE(p.dt_UPDATED)"
  + " AND EXISTS (SELECT 1 FROM t_preenregistrement_compte_client_tiers_payent t WHERE t.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID)"
  + " AND EXISTS (SELECT 1 FROM t_compte_client cc WHERE cc.lg_CLIENT_ID = p.lg_CLIENT_ID)"
  + " AND (SELECT COUNT(*) FROM t_preenregistrement x WHERE x.str_REF = p.str_REF AND DATE(x.dt_UPDATED) = DATE(p.dt_UPDATED)) = 1"
  + " ORDER BY p.dt_UPDATED DESC LIMIT 1").split('\t');
/* priorites des comptes tiers-payant du client avant le test (la creation les decale de 1) */
const PRIORITES = q("SELECT ct.lg_COMPTE_CLIENT_TIERS_PAYANT_ID, ct.int_PRIORITY, ct.dt_UPDATED FROM t_compte_client_tiers_payant ct"
  + " JOIN t_compte_client cc ON cc.lg_COMPTE_CLIENT_ID = ct.lg_COMPTE_CLIENT_ID WHERE cc.lg_CLIENT_ID = '" + CLIENT + "'")
  .split('\n').filter(Boolean).map((l) => l.split('\t'));
const nettoyer = () => {
  q("DELETE ct FROM t_compte_client_tiers_payant ct JOIN t_tiers_payant t ON t.lg_TIERS_PAYANT_ID = ct.lg_TIERS_PAYANT_ID WHERE t.str_NAME = '" + NOM + "'");
  q("DELETE FROM t_tiers_payant WHERE str_NAME = '" + NOM + "'");
  for (const [id, prio, maj] of PRIORITES) {
    q("UPDATE t_compte_client_tiers_payant SET int_PRIORITY = " + prio + ", dt_UPDATED = " + (maj === 'NULL' ? 'NULL' : "'" + maj + "'")
      + " WHERE lg_COMPTE_CLIENT_TIERS_PAYANT_ID = '" + id + "'");
  }
  q("DELETE FROM t_role_privelege WHERE lg_ROLE_PRIVILEGE = '" + DROIT + "'");
};

(async () => {
  nettoyer();
  if (!DEJA) {
    q("INSERT INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED) VALUES ('" + DROIT + "', '" + ROLE + "', '" + PRIVILEGE + "', NOW())");
  }
  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const fenetre = (titre) => p.evaluate((t) => Ext.ComponentQuery.query('window').some((w) => w.isVisible() && w.title === t), titre);
  const COMBO = 'window[title="TIERS-PAYANTS ASSOCIES"] #compteTp';
  try {
    ok('Jeu d\'essai : une vente VO avec tiers-payant', !!VENTE && !!REF && PRIORITES.length > 0, REF + ' du ' + JOUR + ', ' + PRIORITES.length + ' compte(s)');
    await connexion(p, LOGIN, 'e2etest');
    await ouvrirMenu(p, 'SERVICE CLIENT', 'Vente terminées');
    await p.waitForFunction(() => Ext.ComponentQuery.query('ventemanager #query').some((c) => c.isVisible(true)), null, { timeout: 60000 });
    await saisir(p, 'ventemanager #dtStart', JOUR);
    await saisir(p, 'ventemanager #dtEnd', JOUR);
    await saisir(p, 'ventemanager #query', REF);
    await cliquer(p, 'ventemanager #rechercher');
    const ligne = p.locator('.x-grid-row').filter({ visible: true, hasText: REF }).first();
    await ligne.waitFor({ timeout: 60000 });
    await ligne.locator('img[data-qtip="Modifier info client"]').click();
    await p.waitForFunction(() => { const w = Ext.ComponentQuery.query('updateClientTpform').filter((x) => x.isVisible())[0];
      return w && !w.down('#btnModifierClient').isDisabled(); }, null, { timeout: 30000 });
    const avant = await p.evaluate(() => Ext.ComponentQuery.query('updateClientTpform')[0].down('#tpContainer').down('displayfield').getValue());

    await p.locator('.x-window').filter({ visible: true }).getByText('Modifier le tiers-payant', { exact: true }).first().click();
    await p.waitForFunction(() => Ext.ComponentQuery.query('window[title="TIERS-PAYANTS ASSOCIES"]').some((w) => w.isVisible()), null, { timeout: 15000 });
    await p.waitForTimeout(500);
    await p.locator('.x-window').filter({ visible: true, hasText: 'TIERS-PAYANTS ASSOCIES' }).getByText('Valider', { exact: true }).click();
    await p.waitForTimeout(500);
    const invalide = await p.evaluate((c) => { const f = Ext.ComponentQuery.query(c)[0]; return !!f && f.getActiveErrors().length > 0; }, COMBO);
    ok('« Valider » sans tiers-payant choisi : liste marquée en erreur, fenêtre ouverte, aucune erreur JavaScript',
      invalide && await fenetre('TIERS-PAYANTS ASSOCIES') && erreurs.length === 0, erreurs.join(' | '));

    await choisir(p, COMBO, 'AJOUTER UN NOUVEAU TIERS-PAYANT');
    await p.waitForTimeout(800);
    ok('« AJOUTER UN NOUVEAU TIERS-PAYANT » : la saisie du tiers-payant s\'ouvre, sans erreur', await fenetre('Ajout un tiers-payant') && erreurs.length === 0, erreurs.join(' | '));
    const AJOUT = 'window[title="Ajout un tiers-payant"]';
    await saisir(p, AJOUT + ' #strNAME', NOM);
    await saisir(p, AJOUT + ' #strFULLNAME', NOM);
    await saisir(p, AJOUT + ' #strTELEPHONE', '0102030405');
    await saisir(p, AJOUT + ' #strADRESSE', 'ESSAI');
    await saisir(p, AJOUT + ' #strCODEORGANISME', 'E2E');
    const cree = p.waitForResponse((r) => r.url().includes('client/add-tierspayant/'), { timeout: 30000 });
    await p.locator('.x-window').filter({ visible: true, hasText: 'Ajout un tiers-payant' }).getByText('Enregistrer', { exact: true }).click();
    await cree;
    await p.waitForTimeout(1000);
    const apres = await p.evaluate(() => Ext.ComponentQuery.query('updateClientTpform')[0].down('#tpContainer').down('displayfield').getValue());
    ok('« Enregistrer » : les deux fenêtres se ferment, la ligne de la vente affiche le nouveau tiers-payant',
      !await fenetre('Ajout un tiers-payant') && !await fenetre('TIERS-PAYANTS ASSOCIES') && apres === NOM && avant !== NOM, avant + ' → ' + apres);
    ok('Tiers-payant créé et rattaché au client', q("SELECT COUNT(*) FROM t_compte_client_tiers_payant ct JOIN t_tiers_payant t ON t.lg_TIERS_PAYANT_ID = ct.lg_TIERS_PAYANT_ID"
      + " JOIN t_compte_client cc ON cc.lg_COMPTE_CLIENT_ID = ct.lg_COMPTE_CLIENT_ID WHERE t.str_NAME = '" + NOM + "' AND cc.lg_CLIENT_ID = '" + CLIENT + "'") === '1');
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack + ' ' + erreurs.join(' | '));
  } finally {
    await b.close();
    nettoyer();
    ok('Données d\'essai retirées, comptes du client inchangés',
      q("SELECT COUNT(*) FROM t_tiers_payant WHERE str_NAME = '" + NOM + "'") === '0'
      && q("SELECT COUNT(*) FROM t_role_privelege WHERE lg_ROLE_PRIVILEGE = '" + DROIT + "'") === '0'
      && PRIORITES.every(([id, prio]) => q("SELECT int_PRIORITY FROM t_compte_client_tiers_payant WHERE lg_COMPTE_CLIENT_TIERS_PAYANT_ID = '" + id + "'") === prio));
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
