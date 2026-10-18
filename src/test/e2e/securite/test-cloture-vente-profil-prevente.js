/* VENTE TERMINEE AU NOM D'UN PROFIL « PREVENTE » (cas d'officine du 17/10 : vente cloturee, caissier et vendeur =
 * STAGIAIRE, dont le role n'a que « Pre-vente »).
 *
 * Le droit « prevente seule » n'etait tenu que par l'ecran : le menu Pre-vente masque « Terminer la vente ». Le
 * serveur, lui, cloturait au nom de l'utilisateur de la session des qu'il avait une caisse ouverte. Et une connexion
 * dans un autre onglet du meme navigateur remplace l'utilisateur de la session : l'onglet deja ouvert garde ses
 * boutons, le serveur agit au nom du nouveau compte.
 *
 * Parcours par les vues (utilisateur d'essai au role « Vendeur », caisse ouverte pour lui comme celle du stagiaire ;
 * tout est retire a la fin, stock compris) :
 *  - onglet 2, meme navigateur : la page de connexion est deja affichee (ouverte avant, ou restee apres une
 *    deconnexion) ; une page de connexion ouverte apres renvoie directement dans l'application ;
 *  - onglet 1 : admin, SERVICE CLIENT > Ventes > Nouvelle vente, un article ;
 *  - onglet 2 : l'utilisateur « Vendeur » valide le formulaire ;
 *  - onglet 1 : montant recu, « Terminer la vente » : la vente ne doit PAS etre cloturee au nom du profil prevente ;
 *  - la requete de cloture rejouee depuis la session du profil prevente : refusee (403), rien d'ecrit.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer, texteMessage } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const ID = 'E2E-STAG', LOGIN = 'e2e-stagiaire', MDP = 'E2e-Stag-7', CAISSE = 'E2E-STAG-RC';
const ROLE = q("SELECT lg_ROLE_ID FROM t_role WHERE str_NAME = 'Vendeur'");
const [PRODUIT, CIP, STOCK] = q("SELECT f.lg_FAMILLE_ID, f.int_CIP, s.int_NUMBER_AVAILABLE FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID"
  + " AND s.lg_EMPLACEMENT_ID = '1' WHERE f.str_STATUT = 'enable' AND s.int_NUMBER_AVAILABLE > 5 AND LENGTH(f.int_CIP) = 7 LIMIT 1").split('\t');
const ventes = [];

function nettoyer() {
  for (const v of ventes) {
    const det = "(SELECT lg_PREENREGISTREMENT_DETAIL_ID FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + v + "')";
    const regl = q("SELECT IFNULL(lg_REGLEMENT_ID, '') FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v + "'");
    q("DELETE FROM hmvtproduit WHERE lg_PREENREGISTREMENT_DETAIL_ID IN " + det + "; DELETE FROM mvttransaction WHERE vente_id = '" + v + "';"
      + " DELETE FROM vente_reglement WHERE vente_id = '" + v + "'; DELETE FROM t_recettes WHERE str_REF_FACTURE = '" + v + "'; DELETE FROM t_cash_transaction WHERE lg_REGLEMENT_ID = '" + regl + "';"
      + " DELETE FROM t_preenregistrement_compte_client WHERE lg_PREENREGISTREMENT_ID = '" + v + "';"
      + " DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + v + "'; DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v + "';"
      + " DELETE FROM t_reglement WHERE lg_REGLEMENT_ID = '" + regl + "'");
  }
  q("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = " + STOCK + ", int_NUMBER = " + STOCK + " WHERE lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID = '" + PRODUIT + "'");
  q("DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID = '" + CAISSE + "'; DELETE FROM t_role_user WHERE lg_USER_ID = '" + ID + "';"
    + " DELETE FROM t_event_log WHERE lg_USER_ID = '" + ID + "'; DELETE FROM t_recettes WHERE lg_USER_ID = '" + ID + "'; DELETE FROM t_user WHERE lg_USER_ID = '" + ID + "'");
}

(async () => {
  nettoyer();
  q("INSERT INTO t_user (lg_USER_ID, str_LOGIN, str_PASSWORD, str_FIRST_NAME, str_LAST_NAME, str_FUNCTION, str_STATUT, lg_EMPLACEMENT_ID, dt_CREATED, int_CONNEXION)"
    + " VALUES ('" + ID + "', '" + LOGIN + "', MD5('" + MDP + "'), 'E2E', 'STAGIAIRE', 'Vendeur', 'enable', '1', NOW(), 0)");
  q("INSERT INTO t_role_user (lg_USER_ROLE_ID, lg_ROLE_ID, lg_USER_ID, dt_CREATED) VALUES ('" + ID + "', '" + ROLE + "', '" + ID + "', NOW())");
  q("INSERT INTO t_resume_caisse (ld_CAISSE_ID, lg_USER_ID, int_SOLDE_MATIN, int_SOLDE_SOIR, dt_CREATED, lg_CREATED_BY, str_STATUT) VALUES ('" + CAISSE + "', '" + ID + "', 0, 0, NOW(), '" + ID + "', 'is_Using')");
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } });
  let corpsCloture = null;
  try {
    ok('Jeu d\'essai : rôle « Vendeur » sans le menu Ventes, article en stock', ROLE && q("SELECT COUNT(*) FROM t_role_privelege WHERE lg_ROLE_ID = '" + ROLE + "' AND lg_PRIVILEGE_ID = (SELECT lg_PRIVELEGE_ID FROM t_privilege WHERE str_NAME = 'P_SM_CLOTURER_CAISSE')") === '0' && !!CIP);

    /* onglet 2 : page de connexion deja affichee */
    const p2 = await ctx.newPage();
    await p2.goto(require('../outils/vues').BASE + '/security/index.html', { waitUntil: 'networkidle' });

    /* onglet 1 : admin commence une vente */
    const p1 = await ctx.newPage();
    p1.on('request', (r) => { if (/vente\/cloturer\/vno/.test(r.url())) { corpsCloture = r.postData(); } });
    await connexion(p1, 'admin', 'e2etest');
    await ouvrirMenu(p1, 'SERVICE CLIENT', 'Ventes');
    await p1.waitForFunction(() => Ext.ComponentQuery.query('cloturerventemanager #addBtn').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await cliquer(p1, 'cloturerventemanager #addBtn');
    const produit = 'doventemanager #contenu [xtype=fieldcontainer] #produit';
    await p1.waitForFunction((r) => Ext.ComponentQuery.query(r).some((x) => x.isVisible(true)), produit, { timeout: 60000 });
    await p1.waitForTimeout(1500);
    await cliquer(p1, produit);
    await p1.keyboard.type(CIP, { delay: 30 });
    await p1.keyboard.press('Enter');
    await p1.waitForFunction(() => { const c = testextjs.app.getController('VenteCtr').current; return c && parseInt(c.intPRICE, 10) > 0; }, null, { timeout: 20000 });
    const vente = await p1.evaluate(() => testextjs.app.getController('VenteCtr').current.lgPREENREGISTREMENTID);
    ventes.push(vente);
    ok('Onglet admin : vente commencée (un article)', !!vente, vente);

    /* onglet 2 : le profil prevente valide le formulaire deja affiche */
    await p2.bringToFront();
    await p2.fill('#str_login', LOGIN); await p2.fill('#str_password', MDP); await p2.click('#login');
    await p2.waitForURL('**/general/**', { timeout: 60000 });
    await p2.waitForFunction(() => { const n = window.Ext && Ext.ComponentQuery.query('navigation')[0]; return n && n.getStore().getRootNode().childNodes.length > 0; }, null, { timeout: 240000 });
    await p1.bringToFront();
    const menu2 = await p2.evaluate(() => { const o = []; Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().cascadeBy((n) => { o.push(n.get('id')); }); return o; });
    ok('Onglet 2 : profil prévente connecté, sans le menu Ventes', menu2.indexOf('preenregistrementmanager') >= 0 && menu2.indexOf('cloturerventemanager') < 0);

    /* onglet 1 : « Terminer la vente » */
    const net = await p1.evaluate(() => testextjs.app.getController('VenteCtr').current.intPRICE);
    await cliquer(p1, 'doventemanager #contenu #montantRecu');
    await p1.keyboard.press('Control+A');
    await p1.keyboard.type(String(net), { delay: 20 });
    await cliquer(p1, 'doventemanager #contenu [xtype=toolbar] #btnCloture');
    await p1.waitForTimeout(6000);
    const etat = q("SELECT CONCAT(p.str_STATUT, '|', IFNULL(c.str_LOGIN, ''), '|', IFNULL(v.str_LOGIN, '')) FROM t_preenregistrement p LEFT JOIN t_user c ON c.lg_USER_ID = p.lg_USER_CAISSIER_ID"
      + " LEFT JOIN t_user v ON v.lg_USER_ID = p.lg_USER_VENDEUR_ID WHERE p.lg_PREENREGISTREMENT_ID = '" + vente + "'");
    ok('Onglet admin après la connexion du profil prévente : la vente n\'est PAS terminée au nom de ce profil',
      !/^is_Closed\|e2e-stagiaire/.test(etat) && !/\|e2e-stagiaire$/.test(etat.replace(/^is_Process.*/, '')), etat + ' | message : ' + (await texteMessage(p1)).slice(0, 150));

    /* la requete de cloture rejouee par le profil prevente seul */
    if (corpsCloture && /^is_Process/.test(q("SELECT str_STATUT FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + vente + "'"))) {
      const r = await p2.evaluate(async (corps) => { const x = await fetch('../api/v1/vente/cloturer/vno', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: corps });
        return { s: x.status, t: (await x.text()).slice(0, 200) }; }, corpsCloture);
      const apres = q("SELECT str_STATUT FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + vente + "'");
      ok('Clôture rejouée depuis la session du profil prévente : refusée (403), vente non terminée', r.s === 403 && apres === 'is_Process', r.s + ' ' + r.t + ' → ' + apres);
    } else {
      ok('Clôture rejouée depuis la session du profil prévente : refusée (403), vente non terminée', false, corpsCloture ? 'vente déjà terminée' : 'requête de clôture non capturée');
    }
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Données d\'essai retirées, stock remis', q("SELECT COUNT(*) FROM t_user WHERE lg_USER_ID = '" + ID + "'") === '0'
      && q("SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID = '" + PRODUIT + "'") === STOCK
      && ventes.every((v) => q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v + "'") === '0'));
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
