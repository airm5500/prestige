/* MODIFICATION DES INFOS CLIENT D'UNE VENTE TIERS PAYANT AVANT LA FIN DU CHARGEMENT (journal du 15/10).
 *
 * « TypeError: can't access property "strFIRSTNAME", client is null » (UpdateVenteClientTpForm.js, changeClientInfos) :
 * la fenetre s'ouvre tout de suite, la vente arrive ensuite ; un clic sur « Modifier infos client » pendant ce temps
 * lisait un client encore vide.
 *
 * Parcours par les vues (vente VO cloturee du banc, lecture seule, chargement de la vente ralenti de 4 s comme un
 * reseau charge), avec le droit P_BTN_UPDATE_VENTE_CLIENT_TP (sans lui le bouton de la ligne n'est pas affiche) :
 * le droit est accorde au role de l'utilisateur d'essai avant la connexion, puis retire a la fin.
 *  - menu SERVICE CLIENT > « Vente terminées » ; dates et reference saisies au clavier, bouton rechercher ;
 *  - bouton « Modifier info client » de la ligne : pendant le chargement, « Modifier infos client » et « Modifier
 *    infos ayant droit » inactifs, un clic ne fait rien, sans erreur ;
 *  - vente chargee : les deux boutons actifs ; « Modifier infos client » ouvre la saisie avec le nom du client de la
 *    vente (compare, jamais affiche).
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer, saisir } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const LOGIN = 'admin', DROIT = 'E2E-IC-UPDTP';
const PRIVILEGE = q("SELECT lg_PRIVELEGE_ID FROM t_privilege WHERE str_NAME = 'P_BTN_UPDATE_VENTE_CLIENT_TP'");
const ROLE = q("SELECT ru.lg_ROLE_ID FROM t_role_user ru JOIN t_user u ON u.lg_USER_ID = ru.lg_USER_ID WHERE u.str_LOGIN = '" + LOGIN + "' LIMIT 1");
const DEJA = q("SELECT COUNT(*) FROM t_role_privelege WHERE lg_ROLE_ID = '" + ROLE + "' AND lg_PRIVILEGE_ID = '" + PRIVILEGE + "'") !== '0';
const retirerDroit = () => q("DELETE FROM t_role_privelege WHERE lg_ROLE_PRIVILEGE = '" + DROIT + "'");
/* reference unique dans sa journee, pour une seule ligne a l'ecran */
const [VENTE, REF, JOUR] = q("SELECT p.lg_PREENREGISTREMENT_ID, p.str_REF, DATE_FORMAT(p.dt_UPDATED, '%d/%m/%Y') FROM t_preenregistrement p"
  + " JOIN t_client c ON c.lg_CLIENT_ID = p.lg_CLIENT_ID WHERE p.str_TYPE_VENTE = 'VO' AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0"
  + " AND p.int_PRICE > 0 AND DATE(p.dt_CREATED) = DATE(p.dt_UPDATED) AND (SELECT COUNT(*) FROM t_preenregistrement x WHERE x.str_REF = p.str_REF"
  + " AND DATE(x.dt_UPDATED) = DATE(p.dt_UPDATED)) = 1 ORDER BY p.dt_UPDATED DESC LIMIT 1").split('\t');

(async () => {
  retirerDroit();
  if (!DEJA) {
    q("INSERT INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED) VALUES ('" + DROIT + "', '" + ROLE + "', '" + PRIVILEGE + "', NOW())");
  }
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const fenetres = () => p.evaluate(() => Ext.ComponentQuery.query('window').filter((x) => x.isVisible()).length);
  const etat = () => p.evaluate(() => { const w = Ext.ComponentQuery.query('updateClientTpform').filter((x) => x.isVisible())[0];
    return w ? { client: w.down('#btnModifierClient').isDisabled(), ayant: w.down('#btnModifierAyantDroit').isDisabled() } : null; });
  try {
    ok('Jeu d\'essai : une vente VO avec client', !!VENTE && !!REF, REF + ' du ' + JOUR);
    await connexion(p, LOGIN, 'e2etest');
    await ouvrirMenu(p, 'SERVICE CLIENT', 'Vente terminées');
    await p.waitForFunction(() => Ext.ComponentQuery.query('ventemanager #query').some((c) => c.isVisible(true)), null, { timeout: 60000 });
    await saisir(p, 'ventemanager #dtStart', JOUR);
    await saisir(p, 'ventemanager #dtEnd', JOUR);
    await saisir(p, 'ventemanager #query', REF);
    await cliquer(p, 'ventemanager #rechercher');
    const ligne = p.locator('.x-grid-row').filter({ visible: true, hasText: REF }).first();
    await ligne.waitFor({ timeout: 60000 });
    const bouton = ligne.locator('img[data-qtip="Modifier info client"]');
    ok('Avec le droit : bouton « Modifier info client » affiché sur la ligne de la vente', await bouton.isVisible());

    /* chargement de la vente ralenti de 4 s, comme un reseau charge */
    await p.route('**/vente/find/infosclienttpforupdating**', async (route) => { await new Promise((r) => setTimeout(r, 4000)); await route.continue(); });
    await bouton.click();
    await p.waitForFunction(() => Ext.ComponentQuery.query('updateClientTpform').some((x) => x.isVisible()), null, { timeout: 15000 });
    const pendant = await etat(), avant = await fenetres();
    await p.locator('.x-window').filter({ visible: true }).getByText('Modifier infos client', { exact: true }).click({ force: true }).catch(() => {});
    await p.waitForTimeout(300);
    const apresClic = await fenetres();
    ok('Pendant le chargement : les deux boutons inactifs, un clic n\'ouvre rien', pendant && pendant.client && pendant.ayant && apresClic === avant && erreurs.length === 0,
      JSON.stringify(pendant) + ' fenêtres ' + avant + ' → ' + apresClic + ' ' + erreurs.join(' | '));

    await p.waitForFunction(() => { const w = Ext.ComponentQuery.query('updateClientTpform').filter((x) => x.isVisible())[0];
      return w && !w.down('#btnModifierClient').isDisabled(); }, null, { timeout: 15000 }).catch(() => {});
    const charge = await etat();
    ok('Vente chargée : les deux boutons actifs', charge && !charge.client && !charge.ayant, JSON.stringify(charge));
    await p.locator('.x-window').filter({ visible: true }).getByText('Modifier infos client', { exact: true }).click();
    await p.waitForTimeout(800);
    const memeNom = await p.evaluate(() => { const w = Ext.ComponentQuery.query('updateClientTpform').filter((x) => x.isVisible())[0];
      const f = Ext.ComponentQuery.query('textfield[name=strFIRSTNAME]').filter((x) => x.isVisible())[0];
      return !!(f && w.getClient() && f.getValue() && f.getValue() === w.getClient().strFIRSTNAME); });
    ok('« Modifier infos client » ouvre la saisie avec le nom du client de la vente', memeNom);
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    retirerDroit();
    ok('Droit d\'essai retiré, droits du rôle inchangés', q("SELECT COUNT(*) FROM t_role_privelege WHERE lg_ROLE_ID = '" + ROLE + "' AND lg_PRIVILEGE_ID = '" + PRIVILEGE + "'") === (DEJA ? '1' : '0'));
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
