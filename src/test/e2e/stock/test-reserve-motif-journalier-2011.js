/* GESTION DES RESERVES : LE MOTIF « JOURNALIER » DU SENS EST PROPOSE D'OFFICE (demande du 20/11).
 *
 * Fenetre « Creer une suggestion » (boutons « Suggestion sur la selection » et « Suggestion sur tout le resultat »),
 * par de vrais clics, avec un profil d'essai cree puis retire :
 *  - onglet TOUT, une ligne cochee : sens « reappro du rayon » et motif « Reappro rayon journalier » sans rien toucher ;
 *    sens bascule vers la reserve : « Reappro reserve journalier » ; retour vers le rayon : « Reappro rayon
 *    journalier » ; « Creer la suggestion » sans toucher au motif : en base, une suggestion RAYON a ce motif ;
 *  - onglet REAPPRO RESERVE : « Reappro reserve journalier » ; onglet REASSORT RAYON : « Reappro rayon journalier » ;
 *  - le motif reste modifiable : « Reappro rayon special » choisi a la main est garde ;
 *  - motif journalier du rayon desactive : aucun motif pose, « Creer » refuse comme avant (motif obligatoire), rien
 *    n'est cree ;
 *  - bilan : une seule suggestion creee pendant tout le parcours ; aucune erreur JavaScript, aucune fenetre du
 *    navigateur ; profil, suggestion, produit et motifs remis a la fin.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer, choisir, saisir, attendreMessage } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', '--raw', BASE, '-sN', '-e', s], { encoding: 'utf8' }).replace(/\r\n/g, '\n').trim();
const MDP = 'E2e-Rmj-2011';
const P = { id: 'E2E-RMJ', login: 'e2e-rmj', com: 'E2E-RMJ', droits: ['P_M_GESTION_STOCK', 'P_SM_RESERVE', 'P_TRAITER_RESERVE', 'P_RESERVE_SUGGESTION'] };

/* motifs du referentiel : libelle -> id ; l'etat « actif » du motif journalier du rayon est remis a la fin */
const MOTIFS = {};
q('SELECT id, libelle FROM motif_suggestion_reserve').split('\n').filter(Boolean).forEach((l) => { const [i, lib] = l.split('\t'); MOTIFS[lib] = i; });
const J_RAYON = 'Reappro rayon journalier', J_RESERVE = 'Reappro reserve journalier', S_RAYON = 'Reappro rayon special';
const ACTIF_AVANT = q("SELECT actif FROM motif_suggestion_reserve WHERE id = " + (MOTIFS[J_RAYON] || 0));

/* un produit gere en rayon, sans reserve ni suggestion : le test le met en reserve (rayon 5, seuil 20, reserve 30) */
const PRODUIT = q("SELECT s.lg_FAMILLE_ID FROM t_famille_stock s JOIN t_type_stock_famille r ON r.lg_FAMILLE_ID = s.lg_FAMILLE_ID AND r.lg_EMPLACEMENT_ID = '1' AND r.lg_TYPE_STOCK_ID = '1'"
  + " JOIN t_famille f ON f.lg_FAMILLE_ID = s.lg_FAMILLE_ID"
  + " WHERE s.lg_EMPLACEMENT_ID = '1' AND s.str_STATUT = 'enable' AND f.str_STATUT = 'enable' AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 AND f.int_CIP IS NOT NULL AND LENGTH(f.int_CIP) >= 5"
  + " AND NOT EXISTS (SELECT 1 FROM t_type_stock_famille v WHERE v.lg_FAMILLE_ID = s.lg_FAMILLE_ID AND v.lg_TYPE_STOCK_ID = '2')"
  + " AND NOT EXISTS (SELECT 1 FROM t_suggestion_reserve_detail d WHERE d.lg_FAMILLE_ID = s.lg_FAMILLE_ID)"
  + " AND (SELECT COUNT(*) FROM t_famille_stock x WHERE x.lg_FAMILLE_ID = s.lg_FAMILLE_ID AND x.lg_EMPLACEMENT_ID = '1') = 1"
  + " ORDER BY s.lg_FAMILLE_ID LIMIT 1 OFFSET 17");
const LIRE = () => q("SELECT CONCAT_WS('|', s.int_NUMBER_AVAILABLE, s.int_NUMBER, r.int_NUMBER, IFNULL(f.bool_RESERVE, 'NULL'), IFNULL(f.int_SEUIL_RESERVE, 'NULL'), IFNULL(f.int_SEUIL_MINI_RAYON, 'NULL'), f.int_CIP)"
  + " FROM t_famille_stock s JOIN t_type_stock_famille r ON r.lg_FAMILLE_ID = s.lg_FAMILLE_ID AND r.lg_EMPLACEMENT_ID = '1' AND r.lg_TYPE_STOCK_ID = '1'"
  + " JOIN t_famille f ON f.lg_FAMILLE_ID = s.lg_FAMILLE_ID WHERE s.lg_FAMILLE_ID = '" + PRODUIT + "' AND s.lg_EMPLACEMENT_ID = '1'");
const AVANT = PRODUIT ? LIRE().split('|') : [];
const NB_SUGG_AVANT = q('SELECT COUNT(*) FROM t_suggestion_reserve');

function remettre() {
  q("DELETE FROM t_type_stock_famille WHERE lg_TYPE_STOCK_FAMILLE_ID = 'E2E-RMJ-T'");
  if (MOTIFS[J_RAYON] && ACTIF_AVANT !== '') { q('UPDATE motif_suggestion_reserve SET actif = ' + ACTIF_AVANT + ' WHERE id = ' + MOTIFS[J_RAYON]); }
  if (AVANT.length !== 7) { return; }
  q("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = " + AVANT[0] + ", int_NUMBER = " + AVANT[1] + " WHERE lg_FAMILLE_ID = '" + PRODUIT + "' AND lg_EMPLACEMENT_ID = '1';"
    + " UPDATE t_type_stock_famille SET int_NUMBER = " + AVANT[2] + " WHERE lg_FAMILLE_ID = '" + PRODUIT + "' AND lg_EMPLACEMENT_ID = '1' AND lg_TYPE_STOCK_ID = '1';"
    + " UPDATE t_famille SET bool_RESERVE = " + AVANT[3] + ", int_SEUIL_RESERVE = " + AVANT[4] + ", int_SEUIL_MINI_RAYON = " + AVANT[5] + " WHERE lg_FAMILLE_ID = '" + PRODUIT + "'");
}
function poser() {
  remettre();
  q("UPDATE t_famille SET bool_RESERVE = 1, int_SEUIL_RESERVE = 20, int_SEUIL_MINI_RAYON = 8 WHERE lg_FAMILLE_ID = '" + PRODUIT + "';"
    + " UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = 5, int_NUMBER = 5 WHERE lg_FAMILLE_ID = '" + PRODUIT + "' AND lg_EMPLACEMENT_ID = '1';"
    + " UPDATE t_type_stock_famille SET int_NUMBER = 5 WHERE lg_FAMILLE_ID = '" + PRODUIT + "' AND lg_EMPLACEMENT_ID = '1' AND lg_TYPE_STOCK_ID = '1';"
    + " INSERT INTO t_type_stock_famille (lg_TYPE_STOCK_FAMILLE_ID, lg_FAMILLE_ID, lg_TYPE_STOCK_ID, lg_EMPLACEMENT_ID, str_NAME, str_DESCRIPTION, dt_CREATED, dt_UPDATED, str_STATUT, int_NUMBER)"
    + " VALUES ('E2E-RMJ-T', '" + PRODUIT + "', '2', '1', 'E2E', 'E2E', NOW(), NOW(), 'enable', 30)");
}
function nettoyer() {
  q("DELETE d FROM t_suggestion_reserve_detail d JOIN t_suggestion_reserve s ON s.lg_SUGGESTION_RESERVE_ID = d.lg_SUGGESTION_RESERVE_ID WHERE (s.str_COMMENTAIRE LIKE 'E2E-RMJ%' OR s.lg_USER_CREATEUR_ID = '" + P.id + "');"
    + " DELETE FROM t_suggestion_reserve WHERE (str_COMMENTAIRE LIKE 'E2E-RMJ%' OR lg_USER_CREATEUR_ID = '" + P.id + "');"
    + " DELETE FROM t_preference_utilisateur WHERE lg_USER_ID = '" + P.id + "';"
    + " DELETE FROM t_role_privelege WHERE lg_ROLE_ID = '" + P.id + "'; DELETE FROM t_role_user WHERE lg_USER_ID = '" + P.id + "';"
    + " DELETE FROM t_role WHERE lg_ROLE_ID = '" + P.id + "'; DELETE FROM t_event_log WHERE lg_USER_ID = '" + P.id + "';"
    + " DELETE FROM t_employe WHERE lg_USER_ID = '" + P.id + "'; DELETE FROM t_user WHERE lg_USER_ID = '" + P.id + "';");
}
function creerProfil() {
  q("INSERT INTO t_role (lg_ROLE_ID, str_NAME, str_DESIGNATION, str_TYPE, str_STATUT, dt_CREATED) VALUES ('" + P.id + "', '" + P.id + "', '" + P.id + "', 'CUSTOMER', 'enable', NOW())");
  P.droits.forEach((d, i) => q("INSERT INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED)"
    + " SELECT '" + P.id + '-' + i + "', '" + P.id + "', lg_PRIVELEGE_ID, NOW() FROM t_privilege WHERE str_NAME = '" + d + "' ORDER BY str_STATUT = 'enable' DESC LIMIT 1"));
  q("INSERT INTO t_user (lg_USER_ID, str_LOGIN, str_PASSWORD, str_FIRST_NAME, str_LAST_NAME, str_FUNCTION, str_STATUT, lg_EMPLACEMENT_ID, dt_CREATED, int_CONNEXION)"
    + " VALUES ('" + P.id + "', '" + P.login + "', MD5('" + MDP + "'), 'E2E', '" + P.id + "', 'Magasinier', 'enable', '1', NOW(), 0)");
  q("INSERT INTO t_role_user (lg_USER_ROLE_ID, lg_ROLE_ID, lg_USER_ID, dt_CREATED) VALUES ('" + P.id + "', '" + P.id + "', '" + P.id + "', NOW())");
}

(async () => {
  nettoyer();
  if (!PRODUIT || AVANT.length !== 7 || !MOTIFS[J_RAYON] || !MOTIFS[J_RESERVE] || !MOTIFS[S_RAYON]) {
    console.log('FAIL  Précondition : un produit géré en rayon et les 4 motifs de réserve  [' + PRODUIT + ' ; ' + JSON.stringify(MOTIFS) + ']'); process.exit(1);
  }
  q("UPDATE motif_suggestion_reserve SET actif = 1 WHERE id IN (" + [J_RAYON, J_RESERVE, S_RAYON].map((m) => MOTIFS[m]).join(',') + ')');
  poser();
  creerProfil();
  const b = await ENV_E2E.lancer(chromium);
  const erreurs = [], dialogues = [];
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  p.on('pageerror', (e) => erreurs.push(e.message));
  p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });

  /* fenetre ouverte : attend la liste des motifs chargee, puis lit le motif affiche (texte du champ) */
  const fenetre = async () => {
    await p.waitForFunction(() => Ext.ComponentQuery.query('window combo[itemId=cboMotifRech]').some((c) => c.isVisible(true) && !c.getStore().isLoading() && c.getStore().getCount() > 0), null, { timeout: 15000 });
    await p.waitForTimeout(500);
  };
  const motifAffiche = () => p.evaluate(() => { const c = Ext.ComponentQuery.query('window combo[itemId=cboMotifRech]').filter((x) => x.isVisible(true))[0];
    return c ? (c.inputEl.dom.value || '') : null; });
  const fermer = async () => { await cliquer(p, 'window button[text=Annuler]'); await p.waitForTimeout(400); };
  const onglet = async (titre) => {
    await p.locator('.x-tab').filter({ visible: true, hasText: titre }).first().click();
    await p.waitForFunction(() => { const g = Ext.getCmp('reservemanagerID').getActiveTab(); return g && g.getStore && !g.getStore().isLoading(); }, null, { timeout: 60000 });
    await p.waitForTimeout(800);
  };
  const grille = () => p.evaluate(() => Ext.getCmp('reservemanagerID').getActiveTab().getId());

  try {
    await connexion(p, P.login, MDP);
    const libelles = await p.evaluate(() => { let r = null; Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().cascadeBy((n) => {
      if (n.get('id') === 'reservemanager') { r = [n.parentNode.get('text'), n.get('text')]; return false; } }); return r; });
    const texte = (h) => String(h).replace(/<[^>]*>/g, '').trim();
    await ouvrirMenu(p, texte(libelles[0]), texte(libelles[1]));
    await p.waitForFunction(() => { const m = Ext.getCmp('reservemanagerID'); const g = m && m.down('reservegrid');
      return g && g.rendered && !g.getStore().isLoading(); }, null, { timeout: 60000 });
    await p.waitForTimeout(800);

    /* ---- onglet TOUT : le produit retrouve par la recherche, sa case cochee, « Suggestion sur la selection » */
    let g = await grille();
    await cliquer(p, '#' + g + ' textfield[itemId=rechFld]');
    await p.keyboard.press('Control+A');
    await p.keyboard.type(AVANT[6]);
    await p.keyboard.press('Enter');
    await p.waitForFunction(([gr, f]) => { const s = Ext.getCmp(gr).getStore(); return !s.isLoading() && s.findExact('lg_FAMILLE_ID', f) >= 0; }, [g, PRODUIT], { timeout: 30000 });
    await p.waitForTimeout(400);
    const ligne = await p.evaluate(([gr, f]) => Ext.getCmp(gr).getStore().findExact('lg_FAMILLE_ID', f), [g, PRODUIT]);
    const cases = p.locator('#' + g + ' .x-grid-row-checker').filter({ visible: true });
    await cases.nth(ligne).waitFor({ state: 'visible', timeout: 30000 });
    await cases.nth(ligne).click();
    await cliquer(p, '#' + g + ' button[text=Suggestion sur la selection]');
    await fenetre();
    ok('TOUT : à l\'ouverture, motif « ' + J_RAYON + ' » sans rien toucher', await motifAffiche() === J_RAYON, await motifAffiche());
    await choisir(p, 'window combo[itemId=cboSens]', 'Reappro de la reserve');
    await fenetre();
    ok('TOUT : sens vers la réserve → « ' + J_RESERVE + ' »', await motifAffiche() === J_RESERVE, await motifAffiche());
    await choisir(p, 'window combo[itemId=cboSens]', 'Reappro du rayon');
    await fenetre();
    ok('TOUT : retour vers le rayon → « ' + J_RAYON + ' »', await motifAffiche() === J_RAYON, await motifAffiche());
    await saisir(p, 'window textfield[itemId=txtComRech]', P.com);
    await cliquer(p, 'window button[text=Creer la suggestion]');
    await p.waitForFunction((c) => !Ext.ComponentQuery.query('window combo[itemId=cboMotifRech]').some((x) => x.isVisible(true)), null, { timeout: 20000 }).catch(() => {});
    const cree = q("SELECT CONCAT_WS('|', str_CATEGORIE, IFNULL(motif_id, 'NULL'), lg_USER_CREATEUR_ID) FROM t_suggestion_reserve WHERE str_COMMENTAIRE = '" + P.com + "'");
    ok('TOUT : « Créer » sans toucher au motif → en base, suggestion RAYON au motif « ' + J_RAYON + ' », à son nom', cree === 'RAYON|' + MOTIFS[J_RAYON] + '|' + P.id, cree);

    /* ---- onglet REAPPRO RESERVE : « Suggestion sur tout le resultat » */
    await onglet('REAPPRO RESERVE');
    g = await grille();
    await cliquer(p, '#' + g + ' button[text=Suggestion sur tout le resultat]');
    await fenetre();
    ok('REAPPRO RESERVE : motif « ' + J_RESERVE + ' » d\'office', await motifAffiche() === J_RESERVE, await motifAffiche());
    await fermer();

    /* ---- onglet REASSORT RAYON : motif du rayon, puis choix manuel d'un autre motif garde */
    await onglet('REASSORT RAYON');
    g = await grille();
    await cliquer(p, '#' + g + ' button[text=Suggestion sur tout le resultat]');
    await fenetre();
    ok('REASSORT RAYON : motif « ' + J_RAYON + ' » d\'office', await motifAffiche() === J_RAYON, await motifAffiche());
    await choisir(p, 'window combo[itemId=cboMotifRech]', S_RAYON);
    await p.waitForTimeout(800);
    ok('REASSORT RAYON : le motif reste modifiable, « ' + S_RAYON + ' » choisi à la main est gardé', await motifAffiche() === S_RAYON, await motifAffiche());
    await fermer();

    /* ---- motif journalier du rayon desactive : rien n'est pose, le motif reste obligatoire */
    q('UPDATE motif_suggestion_reserve SET actif = 0 WHERE id = ' + MOTIFS[J_RAYON]);
    await cliquer(p, '#' + g + ' button[text=Suggestion sur tout le resultat]');
    await fenetre();
    ok('Motif journalier du rayon désactivé : aucun motif posé d\'office', await motifAffiche() === '', await motifAffiche());
    const nbAvantRefus = q('SELECT COUNT(*) FROM t_suggestion_reserve');
    await cliquer(p, 'window button[text=Creer la suggestion]');
    const refus = await attendreMessage(p, 'Indiquez le motif', 8000);
    ok('… et « Créer » est refusé comme avant (motif obligatoire), rien n\'est créé', !!refus && q('SELECT COUNT(*) FROM t_suggestion_reserve') === nbAvantRefus, refus);
    await p.evaluate(() => Ext.ComponentQuery.query('messagebox').forEach((m) => m.isVisible() && m.close()));
    await fermer();
    q('UPDATE motif_suggestion_reserve SET actif = 1 WHERE id = ' + MOTIFS[J_RAYON]);

    ok('Bilan : une seule suggestion créée pendant tout le parcours', Number(q('SELECT COUNT(*) FROM t_suggestion_reserve')) === Number(NB_SUGG_AVANT) + 1, q('SELECT COUNT(*) FROM t_suggestion_reserve') + ' contre ' + NB_SUGG_AVANT);
    ok('Aucune erreur JavaScript, aucune fenêtre du navigateur', erreurs.length === 0 && dialogues.length === 0, erreurs.concat(dialogues).join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
    nettoyer();
    remettre();
    ok('Jeu d\'essai retiré (profil, suggestion, réserve du produit)', q("SELECT (SELECT COUNT(*) FROM t_user WHERE lg_USER_ID = 'E2E-RMJ') + (SELECT COUNT(*) FROM t_role WHERE lg_ROLE_ID = 'E2E-RMJ')"
      + " + (SELECT COUNT(*) FROM t_suggestion_reserve WHERE str_COMMENTAIRE LIKE 'E2E-RMJ%') + (SELECT COUNT(*) FROM t_type_stock_famille WHERE lg_TYPE_STOCK_FAMILLE_ID = 'E2E-RMJ-T')") === '0'
      && q('SELECT COUNT(*) FROM t_suggestion_reserve') === NB_SUGG_AVANT);
    ok('Produit et motifs remis comme avant', LIRE() === AVANT.join('|') && q('SELECT actif FROM motif_suggestion_reserve WHERE id = ' + MOTIFS[J_RAYON]) === ACTIF_AVANT, LIRE());
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
