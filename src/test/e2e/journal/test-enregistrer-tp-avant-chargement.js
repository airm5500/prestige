/* « ENREGISTRER » DE LA MODIFICATION CLIENT / TIERS PAYANT AVANT LA FIN DU CHARGEMENT (journaux support J26-1).
 *
 * « TypeError: can't access property "lgPREENREGISTREMENTID", wind.getData() is null » (UpdateVenteClientTpForm.js,
 * onSave) : vu le 23/08, le 18/11 et le 25/11 sur capitale. La fenetre s'ouvre tout de suite, la vente arrive
 * ensuite ; « Enregistrer » cliquee deux secondes apres l'ouverture lisait une vente encore vide. Meme chose quand le
 * serveur repond success:false : la vente ne vient jamais.
 *
 * Parcours par les vues, en lecture seule (aucun enregistrement n'est envoye), sur une vente VO cloturee, avec le
 * droit P_BTN_UPDATE_VENTE_CLIENT_TP accorde au role de l'utilisateur d'essai puis retire :
 *  1. chargement ralenti de 4 s : « Enregistrer » inactif ; un clic n'envoie rien et ne leve aucune erreur ;
 *     vente chargee : « Enregistrer » actif ;
 *  2. chargement refuse par le serveur (success:false) : « Enregistrer » reste inactif et dit pourquoi dans le
 *     bouton lui-meme, sans fenetre ; un clic n'envoie rien, aucune erreur.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer, saisir } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const LOGIN = ENV_E2E.LOGIN, DROIT = 'E2E-ENR-UPDTP';
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
  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  /* aucun enregistrement ne doit partir : toute demande est comptee puis bloquee */
  let envois = 0;
  await p.route('**/vente/updateclientortierpayant**', async (route) => { envois++; await route.abort(); });
  const bouton = () => p.evaluate(() => { const w = Ext.ComponentQuery.query('updateClientTpform').filter((x) => x.isVisible())[0];
    const btn = w && w.down('#btnAddClientAssurance');
    return btn ? { inactif: btn.isDisabled(), texte: btn.getText() } : null; });
  const attente = () => p.evaluate(() => Ext.ComponentQuery.query('messagebox').some((x) => x.isVisible()));
  const cliquerEnregistrer = async () => {
    await p.evaluate(() => { const w = Ext.ComponentQuery.query('updateClientTpform').filter((x) => x.isVisible())[0];
      const btn = w.down('#btnAddClientAssurance'); btn.btnEl.dom.scrollIntoView(); });
    await p.locator('.x-window').filter({ visible: true }).getByText('Enregistrer', { exact: true }).last().click({ force: true }).catch(() => {});
    await p.waitForTimeout(500);
  };
  const fermer = async () => {
    await p.evaluate(() => Ext.ComponentQuery.query('updateClientTpform').forEach((x) => x.destroy()));
    await p.unroute('**/vente/find/infosclienttpforupdating**');
  };
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
    const icone = ligne.locator('img[data-qtip="Modifier info client"]');
    ok('Avec le droit : bouton « Modifier info client » affiché sur la ligne de la vente', await icone.isVisible());

    /* 1. chargement ralenti de 4 s, comme un reseau charge */
    await p.route('**/vente/find/infosclienttpforupdating**', async (route) => { await new Promise((r) => setTimeout(r, 4000)); await route.continue(); });
    await icone.click();
    await p.waitForFunction(() => Ext.ComponentQuery.query('updateClientTpform').some((x) => x.isVisible()), null, { timeout: 15000 });
    const pendant = await bouton();
    ok('Pendant le chargement : « Enregistrer » inactif', pendant && pendant.inactif, JSON.stringify(pendant));
    await cliquerEnregistrer();
    ok('Pendant le chargement : un clic sur « Enregistrer » n\'envoie rien, sans fenêtre d\'attente ni erreur',
      envois === 0 && !(await attente()) && erreurs.length === 0, 'envois ' + envois + ' ' + erreurs.join(' | '));
    await p.waitForFunction(() => { const w = Ext.ComponentQuery.query('updateClientTpform').filter((x) => x.isVisible())[0];
      return w && w.getData(); }, null, { timeout: 15000 }).catch(() => {});
    const charge = await bouton();
    ok('Vente chargée : « Enregistrer » actif, libellé d\'origine', charge && !charge.inactif && charge.texte === 'Enregistrer', JSON.stringify(charge));
    await fermer();

    /* 2. chargement refuse par le serveur */
    erreurs.length = 0;
    await p.route('**/vente/find/infosclienttpforupdating**', (route) => route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: false, msg: 'refus d\'essai' }) }));
    await icone.click();
    await p.waitForFunction(() => Ext.ComponentQuery.query('updateClientTpform').some((x) => x.isVisible()), null, { timeout: 15000 });
    await p.waitForTimeout(800);
    const refuse = await bouton();
    ok('Chargement refusé : « Enregistrer » reste inactif et le dit dans le bouton',
      refuse && refuse.inactif && refuse.texte !== 'Enregistrer' && /charg/i.test(refuse.texte), JSON.stringify(refuse));
    await cliquerEnregistrer();
    ok('Chargement refusé : un clic n\'envoie rien, sans fenêtre ni erreur',
      envois === 0 && !(await attente()) && erreurs.length === 0, 'envois ' + envois + ' ' + erreurs.join(' | '));
    await fermer();
    ok('Aucun enregistrement envoyé pendant tout le test', envois === 0, envois);
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
