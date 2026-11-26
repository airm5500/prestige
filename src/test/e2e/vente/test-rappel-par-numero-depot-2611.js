/* Retour du 25/11, suite (manque relevé le 26/11) : l'écran de vente en dépôt (GESTION DES TIERS-PAYANTS > Gestion
 * dépôts extensions) est un clone de l'écran de vente ; sa zone « N° ticket / scan » ouvrait une vente en attente sans
 * le contrôle de rappel du serveur, comme l'écran de vente. Corrigé par VenteEnDepotCtr.rappelerEtCharger ; ce test le
 * vérifie par l'écran du dépôt.
 *
 * Jeu d'essai : dépôt d'extension d'essai avec son stock ; V : vente du dépôt (P1 x2, P2 x3), mise en attente
 * (préparation par l'API ; le geste testé, le numéro tapé, passe par l'écran).
 *  1. droit : E2E-RPD1 (profil Administrateur SANS « Reprendre une vente en attente ») tape le numéro de V dans l'écran
 *     du dépôt : V ne s'ouvre pas, refus sur la ligne de recherche (aucune fenêtre), V reste EN_ATTENTE, refus au journal ;
 *  2. rappel : l'administrateur (poste B) tape le numéro : V s'ouvre, EN_COURS sur son poste, rappel admis au journal ;
 *  3. double ouverture : l'administrateur, sur un autre poste (C), tape le numéro : refusé sur la ligne (« en cours de saisie
 *     sur un poste »), V non ouverte en C, toujours tenue par B ;
 *  4. bilan : lignes de V, stock du dépôt et de l'officine inchangés ; aucune erreur JavaScript ; tout est retiré.
 * Lancement seul : node src/test/e2e/vente/test-rappel-par-numero-depot-2611.js
 */
const C = require('../audits/commun');
const { ADMIN, ok, q } = C;
const vues = require('../outils/vues');
const L = require('../ligne-comptant/commun');
const { chromium, A } = L;
const ENV_E2E = A.ENV_E2E;

const DEPOT = 'E2E-RPD-DEPOT', MARQUE = 'E2E-RPD-STOCK';
const MDP = 'E2e-Rappel-6';
const ROLE_ADMIN = q("SELECT lg_ROLE_ID FROM t_role_user WHERE lg_USER_ID = '" + ADMIN + "' LIMIT 1");
const ROLE_SANS = 'E2E-ROLE-DEPOT-SANS-REPRISE';
const COMPTE = 'E2E-RPD1';
const J0 = Number(q('SELECT IFNULL(MAX(id), 0) FROM vente_journal_saisie'));
const CHAMP = 'doventeendepot #preventeSearchField';
const etat = (id) => q("SELECT CONCAT_WS('/', IFNULL(etat_saisie, '-'), IFNULL(saisie_poste, '-')) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + id + "'");
const journal = (id) => q("SELECT IFNULL(GROUP_CONCAT(CONCAT(geste, '/', admis, '/', IFNULL(utilisateur_id, '-')) ORDER BY id SEPARATOR ' ; '), '') FROM vente_journal_saisie WHERE vente_id = '" + id + "' AND id > " + J0);
const lignes = (id) => q("SELECT IFNULL(GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, 'x', int_QUANTITY) ORDER BY lg_FAMILLE_ID), '') FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + id + "'");
const stockDe = (pid, empl) => q(`SELECT IFNULL(SUM(int_NUMBER_AVAILABLE), 0) FROM t_famille_stock WHERE lg_FAMILLE_ID = '${pid}' AND lg_EMPLACEMENT_ID = '${empl}'`);
const attendre = async (f, delai) => { const fin = Date.now() + delai; let v; while (Date.now() < fin) { v = f(); if (v) { return v; } await new Promise((r) => setTimeout(r, 500)); } return f(); };

function nettoyer() {
  C.exec(`DELETE FROM vente_journal_saisie WHERE utilisateur_id = '${COMPTE}';`
    + ` DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID LIKE '${COMPTE}%'; DELETE FROM t_role_user WHERE lg_USER_ID = '${COMPTE}';`
    + ` DELETE FROM t_event_log WHERE lg_USER_ID = '${COMPTE}'; DELETE FROM t_user WHERE lg_USER_ID = '${COMPTE}';`
    + ` DELETE FROM t_role_privelege WHERE lg_ROLE_ID = '${ROLE_SANS}'; DELETE FROM t_role WHERE lg_ROLE_ID = '${ROLE_SANS}';`
    + ` DELETE FROM hmvtproduit WHERE lg_EMPLACEMENT_ID = '${DEPOT}'; DELETE FROM t_famille_stock WHERE lg_FAMILLE_STOCK_ID LIKE '${MARQUE}%';`
    + ` DELETE FROM reference WHERE emplacement_id = '${DEPOT}'; DELETE FROM t_emplacement WHERE lg_EMPLACEMENT_ID = '${DEPOT}';`);
}

async function navigateur(login, mdp, l, h) {
  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: l || 1500, height: h || 900 } });
  const p = await ctx.newPage();
  const s = { b, ctx, p, erreurs: [] };
  p.on('pageerror', (e) => s.erreurs.push(String(e.message)));
  await vues.connexion(p, login, mdp);
  await require('../support/fenetre-vente-en-cours').mettreEnAttente(p);
  return s;
}
async function ecranDepot(p) {
  await vues.ouvrirMenu(p, 'GESTION DES TIERS-PAYANTS', 'Gestion dépôts extensions').catch(() => vues.ouvrirMenu(p, 'GESTION DES TIERS-PAYANTS', 'Gestion depots extensions'));
  await p.waitForFunction((r) => Ext.ComponentQuery.query(r).some((x) => x.isVisible(true)), CHAMP, { timeout: 60000 });
  await p.waitForTimeout(2000);
}
const courante = (p) => p.evaluate(() => { const c = testextjs.app.getController('VenteEnDepotCtr').current; return c ? c.lgPREENREGISTREMENTID : null; });
async function taperNumero(p, ref) {
  await vues.cliquer(p, CHAMP);
  await p.waitForTimeout(300);
  await p.keyboard.press('Control+A');
  await p.keyboard.press('Backspace');
  await p.keyboard.type(ref, { delay: 30 });
  await p.keyboard.press('Enter');
  await p.waitForTimeout(4000);
}
const statutLigne = (p) => p.evaluate(() => { const s = Ext.ComponentQuery.query('doventeendepot #preventeStatut')[0];
  if (!s || !s.getEl() || !s.isVisible(true)) { return null; } const r = s.getEl().dom.getBoundingClientRect();
  return { texte: s.getEl().dom.innerText.trim(), dansEcran: r.width > 0 && r.right <= window.innerWidth && r.bottom <= window.innerHeight,
    fenetre: Ext.ComponentQuery.query('messagebox{isVisible()}').length }; });

(async () => {
  nettoyer();
  const sessions = [];
  const { b, p, api, erreurs } = await C.connecter();
  sessions.push({ b, p, erreurs });
  try {
    C.ouvrirCaisse();
    const compte = q('SELECT lg_COMPTE_CLIENT_ID FROM t_compte_client LIMIT 1');
    C.exec("INSERT INTO t_emplacement (lg_EMPLACEMENT_ID, lg_COMPTE_CLIENT_ID, str_NAME, str_DESCRIPTION, str_LOCALITE, str_FIRST_NAME, str_LAST_NAME,"
      + ` str_PHONE, dt_CREATED, dt_UPDATED, str_STATUT, lg_TYPEDEPOT_ID, bool_SAME_LOCATION) VALUES ('${DEPOT}', '${compte}', 'DEPOT E2E RAPPEL',`
      + " 'E2E', 'ABOBO', 'KOFFI', 'Jean', '0700000000', NOW(), NOW(), 'enable', '2', 0)");
    const pa = C.produit(0, 40), pb = C.produit(1, 40);
    [pa, pb].forEach((x, i) => C.exec("INSERT INTO t_famille_stock (lg_FAMILLE_STOCK_ID, lg_FAMILLE_ID, int_NUMBER, int_NUMBER_AVAILABLE, dt_CREATED,"
      + ` dt_UPDATED, lg_EMPLACEMENT_ID, str_STATUT, int_UG, VERSION) VALUES ('${MARQUE}-${i}', '${x.id}', 30, 30, NOW(), NOW(), '${DEPOT}', 'enable', 0, 0)`));
    const stocks = () => [stockDe(pa.id, DEPOT), stockDe(pb.id, DEPOT), C.stock(pa), C.stock(pb)].join('|');
    /* profil d'essai : Administrateur sans « Reprendre une vente en attente » (le menu du depot reste ouvert) */
    C.exec(`CREATE TEMPORARY TABLE tmp_r SELECT * FROM t_role WHERE lg_ROLE_ID = '${ROLE_ADMIN}';`
      + ` UPDATE tmp_r SET lg_ROLE_ID = '${ROLE_SANS}', str_NAME = '${ROLE_SANS}'; INSERT INTO t_role SELECT * FROM tmp_r; DROP TEMPORARY TABLE tmp_r;`
      + " INSERT INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED, dt_UPDATED)"
      + ` SELECT LEFT(CONCAT('E2E-RPD-', UUID()), 40), '${ROLE_SANS}', rp.lg_PRIVILEGE_ID, NOW(), NOW() FROM t_role_privelege rp`
      + ` JOIN t_privilege p ON p.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID WHERE rp.lg_ROLE_ID = '${ROLE_ADMIN}' AND p.str_NAME <> 'P_VENTE_REPRENDRE_ATTENTE';`
      + " INSERT INTO t_user (lg_USER_ID, str_LOGIN, str_PASSWORD, str_FIRST_NAME, str_LAST_NAME, str_FUNCTION, str_STATUT, lg_EMPLACEMENT_ID, dt_CREATED, int_CONNEXION)"
      + ` VALUES ('${COMPTE}', 'e2e-rpd1', MD5('${MDP}'), 'E2E', 'RPD1', 'Caissier', 'enable', '1', NOW(), 0);`
      + ` INSERT INTO t_role_user (lg_USER_ROLE_ID, lg_ROLE_ID, lg_USER_ID, dt_CREATED) VALUES ('${COMPTE}', '${ROLE_SANS}', '${COMPTE}', NOW());`
      + " INSERT INTO t_resume_caisse (ld_CAISSE_ID, lg_USER_ID, int_SOLDE_MATIN, int_SOLDE_SOIR, dt_CREATED, lg_CREATED_BY, str_STATUT)"
      + ` VALUES ('${COMPTE}-RC', '${COMPTE}', 0, 0, NOW(), '${COMPTE}', 'is_Using')`);

    /* V : vente du depot, deux lignes de quantites differentes, mise en attente */
    const v = C.venteComptant(api);
    let id = await v.ajouter(pa, 2, null, { depotVenteId: DEPOT });
    id = await v.ajouter(pb, 3, id, { depotVenteId: DEPOT });
    await api('POST', '../api/v1/vente-saisie/' + id + '/attente');
    const ref = q("SELECT str_REF FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + id + "'");
    const lignes0 = lignes(id), stocks0 = stocks();
    ok('0. Jeu d\'essai : V (dépôt, P1 x2, P2 x3) en attente, numéro ' + ref,
      etat(id).startsWith('EN_ATTENTE') && lignes0 === [pa.id + 'x2', pb.id + 'x3'].sort().join(','), etat(id) + ' ' + lignes0);

    /* 1. droit refuse, a 1280 x 600 puis 1920 x 1080 */
    for (const [l, h] of [[1280, 600], [1920, 1080]]) {
      const s1 = await navigateur('e2e-rpd1', MDP, l, h); sessions.push(s1);
      await ecranDepot(s1.p);
      await taperNumero(s1.p, ref);
      const st = await statutLigne(s1.p);
      const c1 = await courante(s1.p);
      ok(`1. ${l}×${h} : sans le droit de reprise, le numéro tapé dans l'écran du dépôt n'ouvre pas V ; refus « Droit manquant » sur la ligne, sans fenêtre`,
        c1 !== id && !!st && /Droit manquant/.test(st.texte) && st.dansEcran && st.fenetre === 0, JSON.stringify({ c1, st, etat: etat(id) }));
      await Promise.race([s1.b.close().catch(() => {}), new Promise((r) => setTimeout(r, 15000))]);
    }
    ok('1. V reste en attente ; les refus sont au journal (REPRENDRE_ATTENTE refusé pour E2E-RPD1)',
      etat(id).startsWith('EN_ATTENTE') && /REPRENDRE_ATTENTE\/0\/E2E-RPD1/.test(journal(id)), etat(id) + ' ; journal : ' + journal(id));

    /* 2. administrateur, poste B */
    await ecranDepot(p);
    await taperNumero(p, ref);
    await attendre(() => etat(id).startsWith('EN_COURS'), 8000);
    ok('2. Rappel par le numéro dans l\'écran du dépôt : V s\'ouvre', (await courante(p)) === id, await courante(p));
    ok('2. Rappel enregistré au serveur : V EN_COURS sur le poste de l\'administrateur, rappel admis au journal',
      etat(id).startsWith('EN_COURS') && new RegExp('REPRENDRE_ATTENTE/1/' + ADMIN).test(journal(id)), etat(id) + ' ; journal : ' + journal(id));
    const tenueB = etat(id);

    /* 3. double ouverture : poste C */
    const sc = await navigateur(ENV_E2E.LOGIN, 'e2etest', 1366, 768); sessions.push(sc);
    await ecranDepot(sc.p);
    await taperNumero(sc.p, ref);
    const stC = await statutLigne(sc.p);
    /* V n'est plus en attente : la recherche ne la trouve pas (« Aucune vente en attente ») ; si elle la trouvait, le
       serveur refuserait le rappel (« en cours de saisie sur un poste ») */
    ok('3. Double ouverture : sur un autre poste, le numéro de V ne l\'ouvre pas, refus sur la ligne, sans fenêtre ; V reste au poste B',
      (await courante(sc.p)) !== id && !!stC && /Aucune vente en attente|en cours de saisie sur un poste/.test(stC.texte) && stC.dansEcran && stC.fenetre === 0
      && etat(id) === tenueB && !new RegExp('REPRENDRE_ATTENTE/1/' + ADMIN + '.*REPRENDRE_ATTENTE/1/').test(journal(id)),
      JSON.stringify({ stC, etat: etat(id), tenueB, journal: journal(id) }));

    /* 4. bilan */
    ok('4. Bilan : lignes de V, stock du dépôt et de l\'officine inchangés', lignes(id) === lignes0 && stocks() === stocks0,
      JSON.stringify({ lignes: lignes(id), lignes0, stocks: stocks(), stocks0 }));
    const errs = [].concat(...sessions.map((s) => s.erreurs));
    ok('Aucune erreur JavaScript', errs.length === 0, errs.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    for (const s of sessions) { await Promise.race([s.b.close().catch(() => {}), new Promise((r) => setTimeout(r, 15000))]); }
    const ids = C.ventesDuTest();
    C.exec(`DELETE FROM vente_journal_saisie WHERE vente_id IN (${C.liste(ids)})`);
    C.nettoyer();
    nettoyer();
    ok('Jeu d\'essai retiré : vente, journal, compte, profil, dépôt et son stock',
      q(`SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (${C.liste(ids)})`) === '0'
      && q(`SELECT COUNT(*) FROM vente_journal_saisie WHERE vente_id IN (${C.liste(ids)})`) === '0'
      && q(`SELECT COUNT(*) FROM t_user WHERE lg_USER_ID = '${COMPTE}'`) === '0' && q(`SELECT COUNT(*) FROM t_role WHERE lg_ROLE_ID = '${ROLE_SANS}'`) === '0'
      && q(`SELECT COUNT(*) FROM t_emplacement WHERE lg_EMPLACEMENT_ID = '${DEPOT}'`) === '0');
  }
  process.exit(C.bilan() ? 1 : 0);
})();
