/* CONTROLE DES ACHATS (LISTE DES BL) : FILTRES APRES LA FENETRE « MISE A JOUR DU BL » (journal du 12/10).
 *
 * « Uncaught TypeError: Me.onRechClick is not a function » (EtatControleManager.js) : l'ecran gardait son instance dans
 * la variable globale Me, que la fenetre de mise a jour d'un BL (cmde_passees/action/edit.js) reprend pour elle
 * (Me = this) ; une fois cette fenetre fermee, chaque filtre appelait onRechClick sur la fenetre.
 *
 * Parcours par les vues, avec un utilisateur qui a le droit P_BTN_UPDATEBL (sans lui, le bouton n'est pas affiche) :
 * le droit est accorde au role de l'utilisateur d'essai avant la connexion, puis retire a la fin.
 *  - menu GESTION DES COMMANDES > « Etat de contrôle Achats » ; periode saisie au clavier, bouton Rechercher ;
 *  - bouton « Modifier les informations du bon de livraison » de la premiere ligne : la fenetre s'ouvre, fermee par
 *    sa croix ;
 *  - choix d'un grossiste puis du type de date dans leurs listes : aucune erreur JavaScript, la liste se recharge.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer, choisir, saisir } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const LOGIN = ENV_E2E.LOGIN, DROIT = 'E2E-CA-UPDBL';
const PRIVILEGE = q("SELECT lg_PRIVELEGE_ID FROM t_privilege WHERE str_NAME = 'P_BTN_UPDATEBL'");
const ROLE = q("SELECT ru.lg_ROLE_ID FROM t_role_user ru JOIN t_user u ON u.lg_USER_ID = ru.lg_USER_ID WHERE u.str_LOGIN = '" + LOGIN + "' LIMIT 1");
const DEJA = q("SELECT COUNT(*) FROM t_role_privelege WHERE lg_ROLE_ID = '" + ROLE + "' AND lg_PRIVILEGE_ID = '" + PRIVILEGE + "'") !== '0';
const retirerDroit = () => q("DELETE FROM t_role_privelege WHERE lg_ROLE_PRIVILEGE = '" + DROIT + "'");

(async () => {
  retirerDroit();
  if (!DEJA) {
    q("INSERT INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED) VALUES ('" + DROIT + "', '" + ROLE + "', '" + PRIVILEGE + "', NOW())");
  }
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const ecran = 'etatscontrolemanager';
  const chargements = () => p.evaluate((e) => Ext.ComponentQuery.query(e)[0].e2eChargements || 0, ecran);
  const attendreChargement = async (avant) => p.waitForFunction(([e, n]) => { const g = Ext.ComponentQuery.query(e)[0];
    return (g.e2eChargements || 0) > n && !g.getStore().isLoading(); }, [ecran, avant], { timeout: 60000 }).then(() => true).catch(() => false);
  try {
    await connexion(p, LOGIN, 'e2etest');
    await ouvrirMenu(p, 'GESTION DES COMMANDES', 'Etat de contrôle Achats');
    await p.waitForFunction((e) => Ext.ComponentQuery.query(e).some((g) => g.isVisible(true)) && Ext.getCmp('datedebut'), ecran, { timeout: 60000 });
    /* compteur des chargements de la liste (observation seulement) */
    await p.evaluate((e) => { const g = Ext.ComponentQuery.query(e)[0]; g.getStore().on('load', () => { g.e2eChargements = (g.e2eChargements || 0) + 1; }); }, ecran);

    /* periode avec des bons sur le banc (l'ecran s'ouvre sur la date du jour) */
    await saisir(p, '#datedebut', '01/09/2026');
    await saisir(p, '#datefin', '30/09/2026');
    let n = await chargements();
    await cliquer(p, ecran + ' button[text=Rechercher]');
    const charge = await attendreChargement(n);
    const lignes = await p.evaluate((e) => Ext.ComponentQuery.query(e)[0].getStore().getCount(), ecran);
    ok('Liste des BL de septembre affichée après « Rechercher »', charge && lignes > 0, lignes + ' bons');

    /* bouton de la premiere ligne, visible grace au droit */
    const bouton = p.locator('#' + await p.evaluate((e) => Ext.ComponentQuery.query(e)[0].getView().getId(), ecran)
      + ' .x-grid-row').first().locator('img[data-qtip="Modifier les informations du bon de livraison"]');
    ok('Avec le droit P_BTN_UPDATEBL : bouton « Modifier les informations du BL » affiché sur la ligne', await bouton.isVisible());
    await bouton.click();
    const fen = p.locator('.x-window').filter({ visible: true, hasText: 'Bon de livraison' }).first();
    const ouverte = await fen.waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
    if (ouverte) { await fen.locator('.x-tool-close').first().click(); }
    const fermee = ouverte && await fen.waitFor({ state: 'hidden', timeout: 10000 }).then(() => true).catch(() => false);
    ok('Fenêtre de mise à jour du BL ouverte par le bouton, fermée par sa croix', ouverte && fermee);

    n = await chargements();
    const grossiste = await choisir(p, '#lg_GROSSISTE_ID', 1);
    ok('Après la fenêtre : choix d\'un grossiste → la liste se recharge, sans erreur', await attendreChargement(n) && erreurs.length === 0, grossiste + ' ' + erreurs.join(' | '));
    n = await chargements();
    const typeDate = await choisir(p, '#dateType', 1);
    ok('Après la fenêtre : choix du type de date → la liste se recharge, sans erreur', await attendreChargement(n) && erreurs.length === 0, typeDate + ' ' + erreurs.join(' | '));
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
