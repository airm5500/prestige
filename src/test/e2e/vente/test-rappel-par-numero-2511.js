/* DÉFAUT SUSPECTÉ (noté le 25/11) : écran de vente, zone « N° ticket / scan » : une vente en attente retrouvée par
 * son numéro est ouverte directement (VenteCtr.searchAndLoadPrevente -> loadExistantSale), sans le contrôle de rappel
 * du serveur (POST vente/rappel/{id}) que passent la fenêtre « Ventes en attente » et le menu « Ventes ».
 *
 * Ce test REPRODUIT le défaut ; il ne corrige rien. Il décrit le comportement attendu : chaque contrôle en échec est
 * un constat.
 *
 * Jeu d'essai fait par les écrans :
 *  - V : caissier JS1, vente au comptant (P1 x1), mise en attente (« METTRE EN ATTENTE ») ;
 *  - JS2 : profil d'essai copié de « Caisse/Commande/Stock » SANS le droit « Reprendre une vente en attente ».
 * Contrôles :
 *  1. droit : JS2 tape le numéro de V : la vente ne doit pas s'ouvrir (la fenêtre « Ventes en attente » la refuse) ;
 *     V reste EN_ATTENTE ; le refus est au journal ;
 *  2. rappel : l'administrateur (poste B) tape le numéro de V : V s'ouvre ET le serveur l'enregistre : EN_COURS sur
 *     le poste B, rappel (REPRENDRE_ATTENTE admis) au journal, aucun bandeau de refus à l'écran ;
 *  3. double ouverture : JS1 (poste A) rappelle V depuis le menu « Ventes » (bouton « Modifier ») : refusé, V est
 *     déjà ouverte sur le poste B ;
 *  4. bilan : si les deux postes ont V ouverte, chacun y ajoute un produit : un seul ajout doit être accepté
 *     (lignes de V en base).
 * Tout est retiré à la fin (ventes, journal, comptes, profil).
 * Lancement seul : node src/test/e2e/vente/test-rappel-par-numero-2511.js
 */
const L = require('../ligne-comptant/commun');
const { chromium, A, vues, ok, q } = L;
const C = require('../audits/commun');
const ENV_E2E = A.ENV_E2E;

const MDP = 'E2e-Rappel-5';
const ROLE_CAISSE = q("SELECT lg_ROLE_ID FROM t_role WHERE str_NAME = 'Caisse/Commande/Stock'");
const ROLE_SANS = 'E2E-ROLE-SANS-REPRISE';
const COMPTES = [['E2E-RPN1', 'e2e-rpn1', 'RPN1', ROLE_CAISSE], ['E2E-RPN2', 'e2e-rpn2', 'RPN2', ROLE_SANS]];
const J0 = Number(q('SELECT IFNULL(MAX(id), 0) FROM vente_journal_saisie'));
const P1 = L.produitSimple(7), P2 = L.produitSimple(8), P3 = L.produitSimple(9);
const ventes = [];
const etat = (id) => q("SELECT CONCAT_WS('/', IFNULL(etat_saisie, '-'), IFNULL(saisie_poste, '-')) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + id + "'");
const journal = (id) => q("SELECT IFNULL(GROUP_CONCAT(CONCAT(geste, '/', admis, '/', IFNULL(utilisateur_id, '-')) ORDER BY id SEPARATOR ' ; '), '') FROM vente_journal_saisie WHERE vente_id = '" + id + "' AND id > " + J0);
const lignes = (id) => q("SELECT IFNULL(GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, 'x', int_QUANTITY) ORDER BY lg_FAMILLE_ID), '') FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + id + "'");
const attendre = async (f, delai, pas) => { const fin = Date.now() + delai; let v; while (Date.now() < fin) { v = f(); if (v) { return v; } await new Promise((r) => setTimeout(r, pas || 500)); } return f(); };

function nettoyer() {
  const deComptes = q("SELECT IFNULL(GROUP_CONCAT(lg_PREENREGISTREMENT_ID), '') FROM t_preenregistrement WHERE lg_USER_ID LIKE 'E2E-RPN%'");
  const v = A.liste(Array.from(new Set([...ventes, ...(deComptes ? deComptes.split(',') : [])])));
  q("DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + " DELETE FROM vente_suppression WHERE vente_id IN (" + v + ");"
    + " DELETE FROM vente_journal_saisie WHERE vente_id IN (" + v + ");"
    + " DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + " DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID LIKE 'E2E-RPN%';"
    + " DELETE FROM t_role_user WHERE lg_USER_ID LIKE 'E2E-RPN%';"
    + " DELETE FROM t_event_log WHERE lg_USER_ID LIKE 'E2E-RPN%';"
    + " DELETE FROM t_user WHERE lg_USER_ID LIKE 'E2E-RPN%';"
    + " DELETE FROM t_role_privelege WHERE lg_ROLE_ID = '" + ROLE_SANS + "';"
    + " DELETE FROM t_role WHERE lg_ROLE_ID = '" + ROLE_SANS + "'");
}

async function navigateur(login, mdp) {
  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1500, height: 900 } });
  const p = await ctx.newPage();
  const s = { b, ctx, p, erreurs: [] };
  p.on('pageerror', (e) => s.erreurs.push(String(e.message)));
  await vues.connexion(p, login, mdp);
  return s;
}
const courante = (p) => p.evaluate(() => { const c = testextjs.app.getController('VenteCtr').current; return c ? c.lgPREENREGISTREMENTID : null; });
const bandeauTexte = (p) => p.evaluate(() => { const b = document.querySelector('#psv-bandeau, .psv-bandeau'); return b && b.offsetParent ? b.innerText.trim() : ''; });
/* zone « N° ticket / scan » de l'ecran de vente : numero tape puis Entree, comme a la caisse */
async function taperNumero(p, ref) {
  await L.nouvelleVente(p);
  await vues.cliquer(p, 'doventemanager #preventeSearchField');
  await p.waitForTimeout(300);
  await p.keyboard.type(ref, { delay: 40 });
  await p.keyboard.press('Enter');
  await p.waitForTimeout(4000);
}

(async () => {
  nettoyer();
  /* profil d'essai : celui du caissier sans le droit « Reprendre une vente en attente » */
  q("CREATE TEMPORARY TABLE tmp_r SELECT * FROM t_role WHERE lg_ROLE_ID = '" + ROLE_CAISSE + "';"
    + " UPDATE tmp_r SET lg_ROLE_ID = '" + ROLE_SANS + "', str_NAME = '" + ROLE_SANS + "';"
    + " INSERT INTO t_role SELECT * FROM tmp_r; DROP TEMPORARY TABLE tmp_r;"
    + " INSERT INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED, dt_UPDATED)"
    + " SELECT LEFT(CONCAT('E2E-RPN-', UUID()), 40), '" + ROLE_SANS + "', rp.lg_PRIVILEGE_ID, NOW(), NOW() FROM t_role_privelege rp"
    + " JOIN t_privilege p ON p.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID WHERE rp.lg_ROLE_ID = '" + ROLE_CAISSE + "' AND p.str_NAME <> 'P_VENTE_REPRENDRE_ATTENTE'");
  for (const [id, login, nom, role] of COMPTES) {
    q("INSERT INTO t_user (lg_USER_ID, str_LOGIN, str_PASSWORD, str_FIRST_NAME, str_LAST_NAME, str_FUNCTION, str_STATUT, lg_EMPLACEMENT_ID, dt_CREATED, int_CONNEXION)"
      + " VALUES ('" + id + "', '" + login + "', MD5('" + MDP + "'), 'E2E', '" + nom + "', 'Caissier', 'enable', '1', NOW(), 0)");
    q("INSERT INTO t_role_user (lg_USER_ROLE_ID, lg_ROLE_ID, lg_USER_ID, dt_CREATED) VALUES ('" + id + "', '" + role + "', '" + id + "', NOW())");
    q("INSERT INTO t_resume_caisse (ld_CAISSE_ID, lg_USER_ID, int_SOLDE_MATIN, int_SOLDE_SOIR, dt_CREATED, lg_CREATED_BY, str_STATUT) VALUES ('" + id + "-RC', '" + id + "', 0, 0, NOW(), '" + id + "', 'is_Using')");
  }
  A.ouvrirCaisse();
  const sessions = [];
  try {
    /* V : JS1, comptant, P1 x1, mise en attente */
    const a = await navigateur('e2e-rpn1', MDP); sessions.push(a);
    await L.nouvelleVente(a.p);
    await L.taperArticle(a.p, L.cip(P1));
    const v = await L.venteCourante(a.p); ventes.push(v);
    await attendre(() => etat(v).startsWith('EN_COURS'), 10000);
    await vues.cliquer(a.p, 'doventemanager #contenu [xtype=toolbar] #btnStandBy');
    await attendre(() => etat(v).startsWith('EN_ATTENTE'), 10000);
    const ref = q("SELECT str_REF FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v + "'");
    const lignes0 = lignes(v);
    ok('0. Jeu d\'essai par les écrans : V (P1 x1) en attente, numéro ' + ref, etat(v).startsWith('EN_ATTENTE') && lignes0 === P1.id + 'x1', etat(v) + ' ' + lignes0);

    /* 1. droit : JS2 (sans le droit de reprise) tape le numero */
    const s2 = await navigateur('e2e-rpn2', MDP); sessions.push(s2);
    await taperNumero(s2.p, ref);
    const c2 = await courante(s2.p);
    ok('1. Droit : JS2, sans le droit « Reprendre une vente en attente », tape le numéro de V : V ne doit pas s\'ouvrir',
      c2 !== v, 'vente ouverte à l\'écran de JS2 : ' + c2 + ' ; état ' + etat(v) + ' ; bandeau « ' + (await bandeauTexte(s2.p)) + ' »');
    ok('1. Droit : V reste en attente, le refus est au journal (REPRENDRE_ATTENTE refusé pour JS2)',
      etat(v).startsWith('EN_ATTENTE') && /REPRENDRE_ATTENTE\/0\/E2E-RPN2/.test(journal(v)), etat(v) + ' ; journal : ' + journal(v));
    /* ce que voit JS2 : le refus sur la ligne de recherche (pas de fenetre), lisible a 1280 × 600 comme a 1920 × 1080 */
    const statutLigne = () => s2.p.evaluate(() => { const s = Ext.ComponentQuery.query('doventemanager #preventeStatut')[0];
      if (!s || !s.getEl() || !s.isVisible(true)) { return null; } const r = s.getEl().dom.getBoundingClientRect();
      return { texte: s.getEl().dom.innerText.trim(), dansEcran: r.width > 0 && r.right <= window.innerWidth && r.bottom <= window.innerHeight,
        fenetre: Ext.ComponentQuery.query('messagebox{isVisible()}').length }; });
    for (const [l, h] of [[1280, 600], [1920, 1080]]) {
      await s2.p.setViewportSize({ width: l, height: h });
      await taperNumero(s2.p, ref);
      const st = await statutLigne();
      ok(`1. ${l}×${h} : refus affiché sur la ligne de recherche (droit manquant), sans fenêtre, vente non ouverte`,
        !!st && /Droit manquant/.test(st.texte) && st.dansEcran && st.fenetre === 0 && (await courante(s2.p)) !== v, JSON.stringify(st));
    }
    await Promise.race([s2.b.close().catch(() => {}), new Promise((r) => setTimeout(r, 15000))]);
    await attendre(() => etat(v).startsWith('EN_ATTENTE'), 5000);

    /* 2. administrateur, poste B : numero tape */
    const b = await navigateur(ENV_E2E.LOGIN, 'e2etest'); sessions.push(b);
    await taperNumero(b.p, ref);
    await b.p.waitForTimeout(3000);
    const cB = await courante(b.p);
    const bandeauB = await bandeauTexte(b.p);
    ok('2. Rappel par le numéro (administrateur) : V s\'ouvre à l\'écran', cB === v, cB);
    ok('2. Rappel enregistré au serveur : V EN_COURS sur le poste de l\'administrateur, rappel admis au journal',
      etat(v).startsWith('EN_COURS') && new RegExp('REPRENDRE_ATTENTE/1/' + A.ADMIN).test(journal(v)), etat(v) + ' ; journal : ' + journal(v));
    ok('2. Aucun bandeau de refus à l\'écran de l\'administrateur', !bandeauB, bandeauB);

    /* 3. JS1 rappelle V depuis le menu « Ventes » (Modifier) */
    await L.ouvrirEcran(a.p, 'cloturerventemanager');
    await L.visible(a.p, 'cloturerventemanager #addBtn');
    await a.p.waitForTimeout(1500);
    const listee = await a.p.evaluate((id) => Ext.ComponentQuery.query('cloturerventemanager gridpanel')[0].getStore().getRange().some((r) => r.get('lgPREENREGISTREMENTID') === id), v);
    let ouverteA = null, refus = '';
    if (listee) {
      await a.p.locator('.x-grid-row', { hasText: ref }).first().locator('.act-modifier').first().click();
      await a.p.waitForTimeout(4000);
      refus = await a.p.evaluate(() => { const m = Ext.ComponentQuery.query('messagebox{isVisible()}')[0]; return m ? m.getEl().dom.innerText.trim() : ''; });
      ouverteA = await courante(a.p).catch(() => null);
    }
    ok('3. Double ouverture : JS1 ne peut plus rappeler V (absente de la liste ou rappel refusé), elle est ouverte chez l\'administrateur',
      !listee || (ouverteA !== v && !!refus), JSON.stringify({ listee, ouverteA, refus, etat: etat(v), journal: journal(v) }));

    /* 4. bilan : si les deux postes tiennent V, chacun ajoute un produit */
    if (ouverteA === v) {
      await L.taperArticle(a.p, L.cip(P2)).catch(() => {});
    }
    if ((await courante(b.p)) === v) {
      await L.taperArticle(b.p, L.cip(P3)).catch(() => {});
    }
    await b.p.waitForTimeout(1500);
    const l4 = lignes(v);
    const ajouts = [P2.id, P3.id].filter((x) => l4.indexOf(x) >= 0);
    ok('4. Bilan : un seul poste peut ajouter un produit à V (lignes en base)', ajouts.length <= 1, 'lignes de V : ' + l4 + ' ; ajouts acceptés : ' + ajouts.length + ' ; état ' + etat(v));
    const erreurs = [].concat(...sessions.map((s) => s.erreurs));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (err) {
    ok('Déroulé sans exception', false, err.stack);
  } finally {
    for (const s of sessions) { await Promise.race([s.b.close().catch(() => {}), new Promise((r) => setTimeout(r, 15000))]); }
    nettoyer();
    ok('Jeu d\'essai retiré (ventes, journal, comptes, profil)', q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + A.liste(ventes) + ")") === '0'
      && q("SELECT COUNT(*) FROM t_user WHERE lg_USER_ID LIKE 'E2E-RPN%'") === '0' && q("SELECT COUNT(*) FROM t_role WHERE lg_ROLE_ID = '" + ROLE_SANS + "'") === '0');
  }
  process.exit(C.bilan() ? 1 : 0);
})();
