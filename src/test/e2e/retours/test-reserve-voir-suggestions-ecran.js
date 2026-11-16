/* RESERVE : ONGLET SUGGESTIONS ET CLOCHE SELON LE DROIT « VOIR LES SUGGESTIONS DE RESERVE » (demande 60), PAR LES VUES.
 *
 * Deux profils d'essai (roles et utilisateurs crees par le test, retires a la fin), tous deux avec le menu « Gestion des
 * reserves » et le droit de traiter la reserve ; seul AVEC a P_RESERVE_SUGGESTION. Par de vrais clics :
 *  - SANS : menu GESTION DU STOCK > Gestion des reserves ; onglets TOUT, REAPPRO, REASSORT, HISTORIQUE, sans
 *    SUGGESTIONS ; une ligne cochee, « Suggestion sur la selection », motif, « Creer la suggestion » : la suggestion
 *    est creee (en base, a son nom) et le message « Demande <ref> creee : elle sera traitee par une personne
 *    habilitee » s'affiche ; aucune fenetre de traitement ne s'ouvre ;
 *    cloche : ni section ni choix « Suggestions de reserve » ; aucune requete refusee (403) pendant tout le parcours ;
 *  - AVEC : les cinq onglets ; la meme creation bascule sur SUGGESTIONS, comme avant ; la cloche montre la section
 *    des suggestions de reserve (dont la demande de SANS) et la propose dans « Choisir les notifications » ;
 *  - aucune erreur JavaScript, aucune fenetre du navigateur.
 * Independant des donnees (15/11) : le test pose ses deux produits en reserve (rayon sous le seuil, reserve garnie,
 * quantites suggerees differentes : 15 et 9), les retrouve par la recherche de l'ecran et coche leur ligne ; il ne
 * coche plus la premiere ligne venue de TOUT. Produits, seuils et stocks remis a la fin.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer, choisir, saisir, attendreMessage, repondre } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', '--raw', BASE, '-sN', '-e', s], { encoding: 'utf8' }).replace(/\r\n/g, '\n').trim();
const MDP = 'E2e-Rvs-60';
const PROFILS = {
  sans: { id: 'E2E-RVSE-SANS', login: 'e2e-rvse-sans', com: 'E2E-RVSE-SANS', droits: ['P_M_GESTION_STOCK', 'P_SM_RESERVE', 'P_TRAITER_RESERVE'] },
  avec: { id: 'E2E-RVSE-AVEC', login: 'e2e-rvse-avec', com: 'E2E-RVSE-AVEC', droits: ['P_M_GESTION_STOCK', 'P_SM_RESERVE', 'P_TRAITER_RESERVE', 'P_RESERVE_SUGGESTION'] }
};

/* deux produits geres en rayon, sans reserve ni suggestion : le test les met en reserve */
const PRODUITS = q("SELECT s.lg_FAMILLE_ID FROM t_famille_stock s JOIN t_type_stock_famille r ON r.lg_FAMILLE_ID = s.lg_FAMILLE_ID AND r.lg_EMPLACEMENT_ID = '1' AND r.lg_TYPE_STOCK_ID = '1'"
  + " JOIN t_famille f ON f.lg_FAMILLE_ID = s.lg_FAMILLE_ID"
  + " WHERE s.lg_EMPLACEMENT_ID = '1' AND s.str_STATUT = 'enable' AND f.str_STATUT = 'enable' AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 AND f.int_CIP IS NOT NULL AND LENGTH(f.int_CIP) >= 5"
  + " AND NOT EXISTS (SELECT 1 FROM t_type_stock_famille v WHERE v.lg_FAMILLE_ID = s.lg_FAMILLE_ID AND v.lg_TYPE_STOCK_ID = '2')"
  + " AND NOT EXISTS (SELECT 1 FROM t_suggestion_reserve_detail d WHERE d.lg_FAMILLE_ID = s.lg_FAMILLE_ID)"
  + " AND (SELECT COUNT(*) FROM t_famille_stock x WHERE x.lg_FAMILLE_ID = s.lg_FAMILLE_ID AND x.lg_EMPLACEMENT_ID = '1') = 1"
  + " ORDER BY s.lg_FAMILLE_ID LIMIT 2 OFFSET 11").split('\n').filter(Boolean);
/* rayon, seuil reserve, seuil mini rayon, reserve -> quantite suggeree = min(reserve, seuil - rayon) */
const JEU = [{ rayon: 5, seuil: 20, mini: 8, reserve: 30, attendu: 15 }, { rayon: 3, seuil: 20, mini: 6, reserve: 9, attendu: 9 }];
const LIRE = (id) => q("SELECT CONCAT_WS('|', s.int_NUMBER_AVAILABLE, s.int_NUMBER, r.int_NUMBER, IFNULL(f.bool_RESERVE, 'NULL'), IFNULL(f.int_SEUIL_RESERVE, 'NULL'), IFNULL(f.int_SEUIL_MINI_RAYON, 'NULL'), f.int_CIP)"
  + " FROM t_famille_stock s JOIN t_type_stock_famille r ON r.lg_FAMILLE_ID = s.lg_FAMILLE_ID AND r.lg_EMPLACEMENT_ID = '1' AND r.lg_TYPE_STOCK_ID = '1'"
  + " JOIN t_famille f ON f.lg_FAMILLE_ID = s.lg_FAMILLE_ID WHERE s.lg_FAMILLE_ID = '" + id + "' AND s.lg_EMPLACEMENT_ID = '1'");
const AVANT = PRODUITS.map((id) => LIRE(id).split('|'));

function remettreProduits() {
  q("DELETE FROM t_type_stock_famille WHERE lg_TYPE_STOCK_FAMILLE_ID LIKE 'E2E-RVSE-T%'");
  PRODUITS.forEach((id, i) => { const a = AVANT[i]; if (a.length !== 7) { return; }
    q("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = " + a[0] + ", int_NUMBER = " + a[1] + " WHERE lg_FAMILLE_ID = '" + id + "' AND lg_EMPLACEMENT_ID = '1';"
      + " UPDATE t_type_stock_famille SET int_NUMBER = " + a[2] + " WHERE lg_FAMILLE_ID = '" + id + "' AND lg_EMPLACEMENT_ID = '1' AND lg_TYPE_STOCK_ID = '1';"
      + " UPDATE t_famille SET bool_RESERVE = " + a[3] + ", int_SEUIL_RESERVE = " + a[4] + ", int_SEUIL_MINI_RAYON = " + a[5] + " WHERE lg_FAMILLE_ID = '" + id + "'"); });
}
function poserProduits() {
  remettreProduits();
  PRODUITS.forEach((id, i) => { const j = JEU[i];
    q("UPDATE t_famille SET bool_RESERVE = 1, int_SEUIL_RESERVE = " + j.seuil + ", int_SEUIL_MINI_RAYON = " + j.mini + " WHERE lg_FAMILLE_ID = '" + id + "';"
      + " UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = " + j.rayon + ", int_NUMBER = " + j.rayon + " WHERE lg_FAMILLE_ID = '" + id + "' AND lg_EMPLACEMENT_ID = '1';"
      + " UPDATE t_type_stock_famille SET int_NUMBER = " + j.rayon + " WHERE lg_FAMILLE_ID = '" + id + "' AND lg_EMPLACEMENT_ID = '1' AND lg_TYPE_STOCK_ID = '1';"
      + " INSERT INTO t_type_stock_famille (lg_TYPE_STOCK_FAMILLE_ID, lg_FAMILLE_ID, lg_TYPE_STOCK_ID, lg_EMPLACEMENT_ID, str_NAME, str_DESCRIPTION, dt_CREATED, dt_UPDATED, str_STATUT, int_NUMBER)"
      + " VALUES ('E2E-RVSE-T" + i + "', '" + id + "', '2', '1', 'E2E', 'E2E', NOW(), NOW(), 'enable', " + j.reserve + ")"); });
}

function nettoyer() {
  const ids = Object.values(PROFILS).map((p) => "'" + p.id + "'").join(',');
  q("DELETE d FROM t_suggestion_reserve_detail d JOIN t_suggestion_reserve s ON s.lg_SUGGESTION_RESERVE_ID = d.lg_SUGGESTION_RESERVE_ID WHERE (s.str_COMMENTAIRE LIKE 'E2E-RVSE-%' OR s.lg_USER_CREATEUR_ID IN (" + ids + "));"
    + " DELETE FROM t_suggestion_reserve WHERE (str_COMMENTAIRE LIKE 'E2E-RVSE-%' OR lg_USER_CREATEUR_ID IN (" + ids + "));"
    + ' DELETE FROM t_preference_utilisateur WHERE lg_USER_ID IN (' + ids + ');'
    + ' DELETE FROM t_role_privelege WHERE lg_ROLE_ID IN (' + ids + '); DELETE FROM t_role_user WHERE lg_USER_ID IN (' + ids + ');'
    + ' DELETE FROM t_role WHERE lg_ROLE_ID IN (' + ids + '); DELETE FROM t_event_log WHERE lg_USER_ID IN (' + ids + ');'
    + ' DELETE FROM t_employe WHERE lg_USER_ID IN (' + ids + '); DELETE FROM t_user WHERE lg_USER_ID IN (' + ids + ');');
}

function creerProfil(p) {
  q("INSERT INTO t_role (lg_ROLE_ID, str_NAME, str_DESIGNATION, str_TYPE, str_STATUT, dt_CREATED) VALUES ('" + p.id + "', '" + p.id + "', '" + p.id + "', 'CUSTOMER', 'enable', NOW())");
  p.droits.forEach((d, i) => q("INSERT INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED)"
    + " SELECT '" + p.id + '-' + i + "', '" + p.id + "', lg_PRIVELEGE_ID, NOW() FROM t_privilege WHERE str_NAME = '" + d + "' ORDER BY str_STATUT = 'enable' DESC LIMIT 1"));
  q("INSERT INTO t_user (lg_USER_ID, str_LOGIN, str_PASSWORD, str_FIRST_NAME, str_LAST_NAME, str_FUNCTION, str_STATUT, lg_EMPLACEMENT_ID, dt_CREATED, int_CONNEXION)"
    + " VALUES ('" + p.id + "', '" + p.login + "', MD5('" + MDP + "'), 'E2E', '" + p.id + "', 'Magasinier', 'enable', '1', NOW(), 0)");
  q("INSERT INTO t_role_user (lg_USER_ROLE_ID, lg_ROLE_ID, lg_USER_ID, dt_CREATED) VALUES ('" + p.id + "', '" + p.id + "', '" + p.id + "', NOW())");
}

(async () => {
  nettoyer();
  if (PRODUITS.length !== 2 || AVANT.some((a) => a.length !== 7)) { console.log('FAIL  Précondition : deux produits gérés en rayon, sans réserve  [' + PRODUITS.join(',') + ']'); process.exit(1); }
  poserProduits();
  Object.values(PROFILS).forEach(creerProfil);
  const b = await ENV_E2E.lancer(chromium);
  const erreurs = [], dialogues = [];
  const ouvrir = async (pr) => {
    const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
    p.on('pageerror', (e) => erreurs.push(pr.login + ' : ' + e.message));
    p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
    p.refus = [];
    p.on('response', (r) => { if (r.status() === 403) { p.refus.push(r.request().method() + ' ' + r.url().replace(/^.*\/api\//, '')); } });
    await connexion(p, pr.login, MDP);
    /* libelles du menu tels qu'affiches (parent et entree « Gestion des reserves ») */
    const libelles = await p.evaluate(() => { let r = null; Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().cascadeBy((n) => {
      if (n.get('id') === 'reservemanager') { r = [n.parentNode.get('text'), n.get('text')]; return false; } }); return r; });
    if (!libelles) { throw new Error('Menu « Gestion des réserves » absent pour ' + pr.login); }
    const texte = (h) => String(h).replace(/<[^>]*>/g, '').trim();
    await ouvrirMenu(p, texte(libelles[0]), texte(libelles[1]));
    await p.waitForFunction(() => { const m = Ext.getCmp('reservemanagerID'); const g = m && m.down('reservegrid');
      return g && g.rendered && !g.getStore().isLoading() && g.getStore().getCount() > 0; }, null, { timeout: 60000 });
    await p.waitForTimeout(800);
    return p;
  };
  const onglets = (p) => p.evaluate(() => Ext.getCmp('reservemanagerID').items.items.filter((t) => t.tab && t.tab.isVisible()).map((t) => t.baseTitle).join(','));
  /* le produit du test retrouve par la recherche de l'ecran (code tape, Entree), sa ligne cochee par un clic sur sa
   * case, puis « Suggestion sur la selection », motif, commentaire, creation */
  const creerParLaSelection = async (p, rang, commentaire) => {
    const grille = await p.evaluate(() => Ext.getCmp('reservemanagerID').getActiveTab().getId());
    const id = PRODUITS[rang];
    await cliquer(p, '#' + grille + ' textfield[itemId=rechFld]');
    await p.keyboard.press('Control+A');
    await p.keyboard.type(AVANT[rang][6]);
    await p.keyboard.press('Enter');
    await p.waitForFunction(([g, f]) => { const s = Ext.getCmp(g).getStore(); return !s.isLoading() && s.findExact('lg_FAMILLE_ID', f) >= 0; }, [grille, id], { timeout: 30000 });
    await p.waitForTimeout(400);
    const ligne = await p.evaluate(([g, f]) => Ext.getCmp(g).getStore().findExact('lg_FAMILLE_ID', f), [grille, id]);
    /* la grille peut se redessiner juste apres son chargement : on attend une case visible */
    const cases = p.locator('#' + grille + ' .x-grid-row-checker').filter({ visible: true });
    await cases.nth(ligne).waitFor({ state: 'visible', timeout: 30000 });
    await cases.nth(ligne).click();
    await cliquer(p, '#' + grille + ' button[text=Suggestion sur la selection]');
    await p.waitForFunction(() => Ext.ComponentQuery.query('window combo[itemId=cboMotifRech]').some((c) => c.isVisible(true) && c.getStore().getCount() > 0), null, { timeout: 15000 });
    await choisir(p, 'window combo[itemId=cboMotifRech]', 0);
    await saisir(p, 'window textfield[itemId=txtComRech]', commentaire);
    await cliquer(p, 'window button[text=Creer la suggestion]');
  };
  const cloche = async (p) => {
    await p.click('#notif-bell .hdr-bell');
    await p.waitForFunction(() => Ext.getCmp('notif-center-win'), null, { timeout: 30000 });
    const panneau = await p.evaluate(() => Ext.getCmp('notif-center-win').body.dom.textContent);
    await p.click('#notif-center-win .x-tool-gear, #notif-center-win .x-tool img.x-tool-gear');
    await p.waitForFunction(() => Ext.getCmp('notif-config-win'), null, { timeout: 10000 });
    const choix = await p.evaluate(() => Array.from(document.querySelectorAll('#notif-config-win .pn-choix')).map((e) => e.getAttribute('data-cle')));
    await p.evaluate(() => { Ext.getCmp('notif-config-win').close(); const w = Ext.getCmp('notif-center-win'); if (w) { w.close(); } });
    return { panneau, choix };
  };
  try {
    /* ---- SANS */
    let p = await ouvrir(PROFILS.sans);
    ok('SANS : onglets TOUT, REAPPRO, REASSORT, HISTORIQUE, sans SUGGESTIONS', await onglets(p) === 'TOUT,REAPPRO RESERVE (ENVOI EN RESERVE),REASSORT RAYON (ENVOI EN RAYON),HISTORIQUE,LISTE RÉSERVE', await onglets(p));
    await creerParLaSelection(p, 0, PROFILS.sans.com);
    const msg = await attendreMessage(p, 'elle sera traitée par une personne habilitée', 20000);
    const cree = q("SELECT CONCAT_WS('|', str_REF, lg_USER_CREATEUR_ID, str_STATUT, (SELECT GROUP_CONCAT(CONCAT(d.lg_FAMILLE_ID, '=', d.int_QTE_PROPOSEE)) FROM t_suggestion_reserve_detail d WHERE d.lg_SUGGESTION_RESERVE_ID = s.lg_SUGGESTION_RESERVE_ID)) FROM t_suggestion_reserve s WHERE str_COMMENTAIRE = '" + PROFILS.sans.com + "'").split('|');
    ok('SANS : création permise, la suggestion est en base à son nom (à traiter, une ligne : son produit, ' + JEU[0].attendu + ' proposés)', cree[1] === PROFILS.sans.id && cree[2] === 'A_TRAITER' && cree[3] === PRODUITS[0] + '=' + JEU[0].attendu, cree.join('|'));
    ok('SANS : message « Demande <ref> créée : elle sera traitée par une personne habilitée »', !!msg && msg.indexOf('Demande ' + cree[0] + ' créée : elle sera traitée par une personne habilitée.') >= 0, msg);
    ok('SANS : aucune fenêtre de traitement ouverte, toujours sans onglet SUGGESTIONS', await p.evaluate(() => Ext.ComponentQuery.query('window').filter((w) => w.isVisible() && /traitement|Suggestion\s+SR/i.test(w.title || '')).length === 0)
      && !(await onglets(p)).includes('SUGGESTIONS'));
    if (msg) { await repondre(p, 'ok'); }
    const cs = await cloche(p);
    ok('SANS : cloche sans section ni choix « Suggestions de réserve »', !/Suggestions de reserve/i.test(cs.panneau) && cs.choix.length > 0 && cs.choix.indexOf('reserve') < 0, JSON.stringify(cs.choix));
    ok('SANS : aucune requête refusée (403) pendant le parcours', p.refus.length === 0, p.refus.join(' ; '));
    await p.context().close();

    /* ---- AVEC */
    p = await ouvrir(PROFILS.avec);
    ok('AVEC : les cinq onglets, plus LISTE RÉSERVE (15/11)', await onglets(p) === 'TOUT,REAPPRO RESERVE (ENVOI EN RESERVE),REASSORT RAYON (ENVOI EN RAYON),SUGGESTIONS,HISTORIQUE,LISTE RÉSERVE', await onglets(p));
    await creerParLaSelection(p, 1, PROFILS.avec.com);
    await p.waitForFunction(() => { const m = Ext.getCmp('reservemanagerID'); return m.getActiveTab() === m.down('#ongletSuggestions'); }, null, { timeout: 20000 }).catch(() => {});
    const lignesAvec = q("SELECT GROUP_CONCAT(CONCAT(d.lg_FAMILLE_ID, '=', d.int_QTE_PROPOSEE)) FROM t_suggestion_reserve_detail d JOIN t_suggestion_reserve s ON s.lg_SUGGESTION_RESERVE_ID = d.lg_SUGGESTION_RESERVE_ID WHERE s.str_COMMENTAIRE = '" + PROFILS.avec.com + "'");
    ok('AVEC : sa suggestion porte sur son produit, ' + JEU[1].attendu + ' proposés (plafond de la réserve)', lignesAvec === PRODUITS[1] + '=' + JEU[1].attendu, lignesAvec);
    const refAvec = q("SELECT str_REF FROM t_suggestion_reserve WHERE str_COMMENTAIRE = '" + PROFILS.avec.com + "' AND lg_USER_CREATEUR_ID = '" + PROFILS.avec.id + "'");
    ok('AVEC : la création bascule sur l\'onglet SUGGESTIONS, sans le message des demandes', !!refAvec && await p.evaluate(() => { const m = Ext.getCmp('reservemanagerID'); return m.getActiveTab() === m.down('#ongletSuggestions'); })
      && !(await attendreMessage(p, 'personne habilitée', 1500)), refAvec);
    /* la liste se charge apres la bascule : on attend qu'elle soit remplie */
    await p.waitForFunction(() => { const g = Ext.getCmp('reservemanagerID').down('#ongletSuggestions'); return g && g.store && !g.store.isLoading() && g.store.getCount() > 0; }, null, { timeout: 30000 }).catch(() => {});
    const vues = await p.evaluate(() => Ext.getCmp('reservemanagerID').down('#ongletSuggestions').store.collect('str_REF'));
    ok('AVEC : l\'onglet SUGGESTIONS liste sa suggestion et la demande de SANS', vues.indexOf(refAvec) >= 0 && vues.indexOf(cree[0]) >= 0, JSON.stringify(vues.slice(0, 6)));
    const ca = await cloche(p);
    ok('AVEC : la cloche montre les suggestions de réserve et les propose dans « Choisir les notifications »', /Suggestions de reserve a traiter/.test(ca.panneau) && ca.choix.indexOf('reserve') >= 0, ca.panneau.slice(0, 120));
    ok('AVEC : aucune requête refusée (403)', p.refus.length === 0, p.refus.join(' ; '));
    await p.context().close();
    ok('Aucune erreur JavaScript, aucune fenêtre du navigateur', erreurs.length === 0 && dialogues.length === 0, erreurs.concat(dialogues).join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
    nettoyer();
    remettreProduits();
    ok('Jeu d\'essai retiré (profils, rôles, suggestions)', q("SELECT (SELECT COUNT(*) FROM t_user WHERE lg_USER_ID LIKE 'E2E-RVSE-%') + (SELECT COUNT(*) FROM t_role WHERE lg_ROLE_ID LIKE 'E2E-RVSE-%')"
      + " + (SELECT COUNT(*) FROM t_suggestion_reserve WHERE str_COMMENTAIRE LIKE 'E2E-RVSE-%' OR lg_USER_CREATEUR_ID LIKE 'E2E-RVSE-%')"
      + " + (SELECT COUNT(*) FROM t_type_stock_famille WHERE lg_TYPE_STOCK_FAMILLE_ID LIKE 'E2E-RVSE-T%')") === '0');
    const apres = PRODUITS.map(LIRE);
    ok('Produits remis : stocks, seuils et indicateur de réserve comme avant', apres.join(';') === AVANT.map((a) => a.join('|')).join(';'), apres.join(';'));
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
