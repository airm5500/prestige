/* VENTES EN SAISIE (cahier des charges du 24/11, point 2) : états, droits, Retour, interruption, reprise, journal.
 *
 * Parcours par les vues, quatre comptes à la fois (navigateurs séparés = postes différents) :
 *  - admin (compte des tests, tous les droits) ;
 *  - E2E CAISSE1 et E2E CAISSE2 : profil réel « Caisse/Commande/Stock » (mettre en attente, reprendre ; ni voir les
 *    ventes en cours, ni reprendre la saisie d'un autre) ;
 *  - E2E CAISSE3 : même profil SANS « mettre en attente » ni « reprendre une vente en attente ».
 *
 *  1. CAISSE1 commence une vente (2 articles) : EN_COURS, poste et session notés, « début de saisie » au journal.
 *  2. Elle n'est ni dans « Ventes en attente », ni rappelable, ni supprimable par un autre poste (refus journalisés).
 *  3. Écran « Ventes en cours de saisie » (admin) : la ligne = la base (numéro, lignes, montant, utilisateur, poste).
 *  4. CAISSE1 « METTRE EN ATTENTE » : EN_ATTENTE, dans la liste, avec le même montant.
 *  5. CAISSE2 la rappelle par la fenêtre « Ventes en attente » : EN_COURS sur SA session.
 *  6. CAISSE2 « RETOUR » : choix dans la barre (aucune fenêtre) ; Annuler ; puis « Supprimer la vente » confirmé dans
 *     le bouton (1er clic : rien n'est supprimé) ; la vente disparaît, ses lignes sont dans « Produits retirés et
 *     ventes abandonnées » (mêmes produits, mêmes quantités), stock inchangé.
 *  7. CAISSE1 commence une vente puis change de menu : INTERROMPUE (cause « menu quitté »), absente de la liste.
 *  8. CAISSE2 (pas l'auteur, sans le droit) ne peut pas la reprendre ; elle ne la voit même pas.
 *  9. CAISSE1 rouvre l'écran de vente : le bandeau lui propose SA saisie interrompue ; reprise confirmée dans le
 *     bouton ; la vente revient à l'écran, EN_COURS.
 * 10. Réseau coupé (poste hors ligne) : sans signal depuis 2 min, la saisie passe INTERROMPUE (« plus de signal ») ;
 *     réseau revenu : le signal la reprend (même poste, même session).
 * 11. CAISSE3 (sans le droit) : « METTRE EN ATTENTE » et « Mettre en attente et quitter » refusés, motif affiché,
 *     la vente reste ouverte ; refus journalisés.
 * 12. Journal (admin) : écran et export CSV = base ; chaîne intacte ; une ligne retouchée en base est désignée,
 *     remise en état : intacte.
 * 13. Bilan : exactement les gestes attendus au journal, ni plus ni moins ; stock des articles inchangé.
 * Tout est retiré à la fin (ventes, lignes retirées, journal du test, comptes, profil, caisses).
 */
const C = require('../ligne-comptant/commun');
const { chromium, A, vues, ok, q } = C;
const ENV_E2E = A.ENV_E2E;

const MDP = 'E2e-Saisie-7';
const COMPTES = [['E2E-SV1', 'e2e-caisse1', 'CAISSE1'], ['E2E-SV2', 'e2e-caisse2', 'CAISSE2'], ['E2E-SV3', 'e2e-caisse3', 'CAISSE3']];
const ROLE_CAISSE = q("SELECT lg_ROLE_ID FROM t_role WHERE str_NAME = 'Caisse/Commande/Stock'");
const ROLE_SANS = 'E2E-SV-ROLE';
const J0 = Number(q('SELECT IFNULL(MAX(id), 0) FROM vente_journal_saisie'));
const P1 = C.produitSimple(7);
const P2 = C.produitSimple(8);
const CIP1 = C.cip(P1), CIP2 = C.cip(P2);
const STOCK0 = [A.stock(P1), A.stock(P2)];
const ventes = [];

const etat = (id) => q("SELECT CONCAT_WS('|', IFNULL(etat_saisie, '-'), IFNULL(saisie_session, '-'), IFNULL(saisie_interruption, '-'), IFNULL(saisie_poste, '-'))"
  + " FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + id + "'").split('|');
const journal = (id) => q("SELECT IFNULL(GROUP_CONCAT(CONCAT_WS('/', geste, admis, IFNULL(etat_apres, '-'), IFNULL(cause, '-'), IFNULL(utilisateur_id, 'SERVEUR')) ORDER BY id SEPARATOR ' ; '), '')"
  + " FROM vente_journal_saisie WHERE id > " + J0 + " AND vente_id = '" + id + "'");
const attendre = async (p, f, delai, pas) => { const fin = Date.now() + delai; let v; while (Date.now() < fin) { v = f(); if (v) { return v; } await p.waitForTimeout(pas || 1000); } return f(); };

function nettoyer() {
  const v = A.liste(ventes);
  q("DELETE FROM t_preenregistrement_compte_client WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + " DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + " DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + " DELETE FROM vente_suppression WHERE vente_id IN (" + v + ");"
    /* le journal du test est en queue : le retirer ne casse pas la chaine des lignes d'avant */
    + " DELETE FROM vente_journal_saisie WHERE id > " + J0 + ";"
    + " DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID LIKE 'E2E-SV%';"
    + " DELETE FROM t_role_user WHERE lg_USER_ID LIKE 'E2E-SV%';"
    + " DELETE FROM t_event_log WHERE lg_USER_ID LIKE 'E2E-SV%';"
    + " DELETE FROM t_user WHERE lg_USER_ID LIKE 'E2E-SV%';"
    + " DELETE FROM t_role_privelege WHERE lg_ROLE_ID = '" + ROLE_SANS + "';"
    + " DELETE FROM t_role WHERE lg_ROLE_ID = '" + ROLE_SANS + "'");
}

async function poste(login) {
  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1500, height: 900 } });
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(String(e.message)));
  await vues.connexion(p, login, login === ENV_E2E.LOGIN ? 'e2etest' : MDP);
  const api = (m, u) => p.evaluate(async ([mm, uu]) => { const r = await fetch(uu, { method: mm }); const t = await r.text();
    let j; try { j = JSON.parse(t); } catch (e) { j = { brut: t.slice(0, 2000) }; } j.http = r.status; return j; }, [m, u]);
  return { b, ctx, p, api, erreurs };
}
const courante = (p) => C.venteCourante(p);
const bandeau = (p) => p.evaluate(() => { const b = document.getElementById('psv-bandeau'); return b && b.style.display !== 'none' ? b.textContent : ''; });
const boutons = (p) => p.evaluate(() => ['btnGoBack', 'btnRetourAttente', 'btnRetourSupprimer', 'btnRetourAnnuler'].map((i) => {
  const c = Ext.ComponentQuery.query('doventemanager #contenu [xtype=toolbar] #' + i)[0]; return c && c.isVisible(true) ? (c.getText ? c.getText() : 'ok') : null; }));
const fenetreModale = (p) => p.evaluate(() => Ext.WindowManager.getActive() && Ext.WindowManager.getActive().isVisible() && Ext.WindowManager.getActive().modal ? Ext.WindowManager.getActive().getXType() : '');

(async () => {
  nettoyer();
  q("INSERT INTO t_role (lg_ROLE_ID, str_NAME, str_DESIGNATION, str_STATUT, dt_CREATED) VALUES ('" + ROLE_SANS + "', 'E2E-SV-ROLE', 'Essai ventes en saisie', 'enable', NOW())");
  q("INSERT INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED, dt_UPDATED) SELECT LEFT(CONCAT('E2E-SV-', UUID()), 40), '" + ROLE_SANS + "', rp.lg_PRIVILEGE_ID, NOW(), NOW()"
    + " FROM t_role_privelege rp JOIN t_privilege p ON p.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID WHERE rp.lg_ROLE_ID = '" + ROLE_CAISSE + "'"
    + " AND p.str_NAME NOT IN ('P_VENTE_METTRE_EN_ATTENTE', 'P_VENTE_REPRENDRE_ATTENTE')");
  for (const [id, login, nom] of COMPTES) {
    q("INSERT INTO t_user (lg_USER_ID, str_LOGIN, str_PASSWORD, str_FIRST_NAME, str_LAST_NAME, str_FUNCTION, str_STATUT, lg_EMPLACEMENT_ID, dt_CREATED, int_CONNEXION)"
      + " VALUES ('" + id + "', '" + login + "', MD5('" + MDP + "'), 'E2E', '" + nom + "', 'Caissier', 'enable', '1', NOW(), 0)");
    q("INSERT INTO t_role_user (lg_USER_ROLE_ID, lg_ROLE_ID, lg_USER_ID, dt_CREATED) VALUES ('" + id + "', '" + (id === 'E2E-SV3' ? ROLE_SANS : ROLE_CAISSE) + "', '" + id + "', NOW())");
    q("INSERT INTO t_resume_caisse (ld_CAISSE_ID, lg_USER_ID, int_SOLDE_MATIN, int_SOLDE_SOIR, dt_CREATED, lg_CREATED_BY, str_STATUT) VALUES ('" + id + "-RC', '" + id + "', 0, 0, NOW(), '" + id + "', 'is_Using')");
  }
  ok('Préparation : profil réel « Caisse/Commande/Stock » avec les deux droits de base, sans « voir » ni « reprendre celle d\'un autre »',
    q("SELECT GROUP_CONCAT(p.str_NAME ORDER BY p.str_NAME) FROM t_role_privelege rp JOIN t_privilege p ON p.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID WHERE rp.lg_ROLE_ID = '" + ROLE_CAISSE
      + "' AND p.str_NAME LIKE 'P_VENTE_%' AND p.str_NAME IN ('P_VENTE_METTRE_EN_ATTENTE','P_VENTE_REPRENDRE_ATTENTE','P_VENTE_VOIR_EN_COURS','P_VENTE_REPRENDRE_INTERROMPUE_AUTRUI')")
      === 'P_VENTE_METTRE_EN_ATTENTE,P_VENTE_REPRENDRE_ATTENTE');
  A.ouvrirCaisse();
  const postes = [];
  try {
    const c1 = await poste('e2e-caisse1'); postes.push(c1);
    const c2 = await poste('e2e-caisse2'); postes.push(c2);
    const ad = await poste(ENV_E2E.LOGIN); postes.push(ad);

    /* 1. debut de saisie */
    await C.nouvelleVente(c1.p);
    await C.taperArticle(c1.p, CIP1);
    await C.taperArticle(c1.p, CIP2);
    const v1 = await courante(c1.p); ventes.push(v1);
    const e1 = await attendre(c1.p, () => { const e = etat(v1); return e[0] === 'EN_COURS' ? e : null; }, 10000);
    const ref1 = q("SELECT str_REF FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v1 + "'");
    const lignes1 = q("SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, 'x', int_QUANTITY) ORDER BY lg_FAMILLE_ID) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + v1 + "'");
    const montant1 = Number(q("SELECT int_PRICE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v1 + "'"));
    ok('1. Vente commencée : EN_COURS, session et poste notés', e1 && e1[1] !== '-' && e1[3] !== '-', JSON.stringify(e1));
    ok('1. Journal : « début de saisie » par CAISSE1', journal(v1) === 'DEBUT_SAISIE/1/EN_COURS/-/E2E-SV1', journal(v1));

    /* 2. ni listee, ni rappelable, ni supprimable ailleurs */
    const liste = async (s) => ((await s.api('GET', '../api/v1/ventestats/preventes?query=&typeVenteId=&statut=ALL&start=0&limit=200')).data || []).map((x) => x.lgPREENREGISTREMENTID || x.id);
    ok('2. Vente en cours de saisie absente de « Ventes en attente » (autre poste)', !(await liste(c2)).includes(v1));
    const rap = await c2.api('POST', '../api/v1/vente/rappel/' + v1);
    ok('2. Rappel par CAISSE2 refusé : « en cours de saisie sur un poste »', rap.success === false && rap.verrouillee === true && /en cours de saisie/.test(rap.msg), JSON.stringify(rap));
    const sup = await ad.api('POST', '../api/v1/ventestats/remove/' + v1);
    ok('2. Suppression par l\'admin refusée, la vente et ses lignes restent', sup.success === false && /en cours de saisie/.test(sup.msg)
      && q("SELECT COUNT(*) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + v1 + "'") === '2', JSON.stringify(sup));
    ok('2. Les deux refus sont au journal (qui, quoi)', journal(v1) === 'DEBUT_SAISIE/1/EN_COURS/-/E2E-SV1 ; REPRENDRE_ATTENTE/0/EN_COURS/-/E2E-SV2 ; SUPPRIMER_ATTENTE/0/EN_COURS/-/' + A.ADMIN, journal(v1));

    /* 3. ecran des ventes en cours (admin) */
    await C.ouvrirEcran(ad.p, 'ventesencourssaisie');
    await C.visible(ad.p, 'ventesencourssaisie #vcsGrille');
    await ad.p.waitForFunction((r) => Ext.ComponentQuery.query('ventesencourssaisie')[0].ventes.findRecord('numero', r), ref1, { timeout: 20000 });
    const ligneEcran = await ad.p.evaluate((r) => { const g = Ext.ComponentQuery.query('ventesencourssaisie #vcsGrille')[0]; const i = g.getStore().find('numero', r);
      const tr = g.getView().getNode(i); return { cellules: [...tr.querySelectorAll('td')].map((td) => td.textContent.trim()), bouton: !!tr.querySelector('.vcs-reprendre') }; }, ref1);
    ok('3. Écran « Ventes en cours de saisie » = base : numéro, état, utilisateur, poste, lignes, montant ; pas de reprise d\'une vente en cours',
      ligneEcran.cellules[0] === ref1 && ligneEcran.cellules[1] === 'En cours de saisie' && ligneEcran.cellules[2] === 'E2E CAISSE1' && ligneEcran.cellules[3] === e1[3]
      && ligneEcran.cellules[7] === '2' && C.chiffres(ligneEcran.cellules[8]) === montant1 && !ligneEcran.bouton, JSON.stringify(ligneEcran) + ' base ' + montant1 + ' ' + e1[3]);

    /* 4. mise en attente par CAISSE1 */
    await vues.cliquer(c1.p, 'doventemanager #contenu [xtype=toolbar] #btnStandBy');
    await attendre(c1.p, () => etat(v1)[0] === 'EN_ATTENTE', 10000, 300);
    await c1.p.waitForTimeout(1500);
    const e4 = etat(v1);
    ok('4. « METTRE EN ATTENTE » : EN_ATTENTE, plus de session, l\'écran est vidé', e4[0] === 'EN_ATTENTE' && e4[1] === '-' && (await courante(c1.p)) === null, JSON.stringify(e4));
    const l4 = (await c2.api('GET', '../api/v1/ventestats/preventes?query=&typeVenteId=&statut=ALL&start=0&limit=200')).data || [];
    const r4 = l4.find((x) => (x.lgPREENREGISTREMENTID || x.id) === v1);
    ok('4. Dans « Ventes en attente » de l\'autre poste, même montant qu\'en base', !!r4 && Number(r4.intPRICE !== undefined ? r4.intPRICE : r4.montant) === montant1, JSON.stringify(r4));

    /* 5. rappel par CAISSE2, par la fenetre */
    await C.nouvelleVente(c2.p);
    await c2.p.click('#' + await c2.p.evaluate(() => Ext.ComponentQuery.query('doventemanager #preventeSearchBtn')[0].getId()));
    await c2.p.waitForFunction(() => { const w = Ext.ComponentQuery.query('ventesattentefenetre')[0]; return w && w.getEl().dom.querySelectorAll('.va-carte').length >= 1; }, null, { timeout: 20000 });
    await c2.p.evaluate((r) => { const c = [...document.querySelectorAll('.va-carte')].find((x) => x.querySelector('.va-ticket').textContent === r); c.id = 'carte-visee'; }, ref1);
    await c2.p.click('#carte-visee'); await c2.p.waitForTimeout(800);
    await c2.p.keyboard.press('Enter');
    await c2.p.waitForFunction((id) => { const c = testextjs.app.getController('VenteCtr'); return c.current && c.current.lgPREENREGISTREMENTID === id; }, v1, { timeout: 20000 });
    const e5 = await attendre(c2.p, () => { const e = etat(v1); return e[0] === 'EN_COURS' ? e : null; }, 10000, 300);
    ok('5. Rappel par CAISSE2 : la vente s\'ouvre, EN_COURS sur une autre session que celle de CAISSE1', e5 && e5[1] !== e1[1], JSON.stringify(e5));

    /* 6. Retour : choix dans la barre */
    await vues.cliquer(c2.p, 'doventemanager #contenu [xtype=toolbar] #btnGoBack');
    await c2.p.waitForTimeout(500);
    const b6 = await boutons(c2.p);
    ok('6. « RETOUR » : trois choix dans la barre, Retour masqué, aucune fenêtre', b6[0] === null && b6[1] === 'METTRE EN ATTENTE ET QUITTER' && b6[2] === 'SUPPRIMER LA VENTE' && b6[3] === 'ANNULER'
      && (await fenetreModale(c2.p)) === '', JSON.stringify(b6));
    await vues.cliquer(c2.p, 'doventemanager #contenu [xtype=toolbar] #btnRetourAnnuler');
    await c2.p.waitForTimeout(400);
    ok('6. « ANNULER » : Retour revient, la vente reste ouverte et EN_COURS', JSON.stringify(await boutons(c2.p)) === JSON.stringify(['RETOUR', null, null, null])
      && (await courante(c2.p)) === v1 && etat(v1)[0] === 'EN_COURS', JSON.stringify(await boutons(c2.p)));
    await vues.cliquer(c2.p, 'doventemanager #contenu [xtype=toolbar] #btnGoBack');
    await c2.p.waitForTimeout(400);
    await vues.cliquer(c2.p, 'doventemanager #contenu [xtype=toolbar] #btnRetourSupprimer');
    await c2.p.waitForTimeout(600);
    ok('6. 1er clic sur « SUPPRIMER LA VENTE » : le bouton demande confirmation, rien n\'est supprimé', (await boutons(c2.p))[2] === 'CONFIRMER LA SUPPRESSION'
      && q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v1 + "'") === '1');
    await vues.cliquer(c2.p, 'doventemanager #contenu [xtype=toolbar] #btnRetourSupprimer');
    await attendre(c2.p, () => q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v1 + "'") === '0', 15000, 300);
    const retirees = q("SELECT GROUP_CONCAT(CONCAT(produit_id, 'x', quantite) ORDER BY produit_id) FROM vente_suppression WHERE vente_id = '" + v1 + "'");
    ok('6. 2e clic : vente supprimée ; ses lignes sont dans « Produits retirés et ventes abandonnées », mêmes produits, mêmes quantités',
      q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v1 + "'") === '0' && retirees === lignes1, retirees + ' / ' + lignes1);
    ok('6. Journal : rappel par CAISSE2 puis « Retour : supprimer » (ABANDONNEE), une seule fois',
      journal(v1).endsWith('REPRENDRE_ATTENTE/1/EN_COURS/-/E2E-SV2 ; RETOUR_SUPPRIMER/1/ABANDONNEE/-/E2E-SV2'), journal(v1));

    /* 7. interruption par changement de menu */
    await C.nouvelleVente(c1.p);
    await C.taperArticle(c1.p, CIP2);
    const v2 = await courante(c1.p); ventes.push(v2);
    const ref2 = q("SELECT str_REF FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v2 + "'");
    await attendre(c1.p, () => etat(v2)[0] === 'EN_COURS', 10000, 300);
    await C.ouvrirEcran(c1.p, 'cloturerventemanager');
    const e7 = await attendre(c1.p, () => { const e = etat(v2); return e[0] === 'INTERROMPUE' ? e : null; }, 15000, 500);
    ok('7. Menu quitté : INTERROMPUE, cause « MENU »', e7 && e7[2] === 'MENU', JSON.stringify(etat(v2)));
    ok('7. Une saisie interrompue n\'est pas dans « Ventes en attente »', !(await liste(c1)).includes(v2));

    /* 8. CAISSE2 : ni vue, ni reprise */
    const vu2 = await c2.api('GET', '../api/v1/vente-saisie/en-cours');
    ok('8. CAISSE2 (sans « voir ») ne reçoit que ses propres saisies interrompues : pas celle de CAISSE1', vu2.success && vu2.tout === false && !(vu2.data || []).some((x) => x.id === v2), JSON.stringify(vu2).slice(0, 300));
    const rep8 = await c2.api('POST', '../api/v1/vente-saisie/' + v2 + '/reprendre');
    ok('8. Reprise par CAISSE2 refusée : droit manquant ; la saisie reste interrompue', rep8.success === false && /Droit manquant/.test(rep8.msg) && etat(v2)[0] === 'INTERROMPUE', JSON.stringify(rep8));

    /* 9. CAISSE1 : bandeau de reprise sur l'ecran de vente */
    await vues.cliquer(c1.p, 'cloturerventemanager #addBtn');
    await C.visible(c1.p, C.CHAMP_PRODUIT);
    await c1.p.waitForFunction(() => !!document.getElementById('psv-action'), null, { timeout: 15000 });
    const b9 = await bandeau(c1.p);
    ok('9. Écran de vente : le bandeau propose la saisie interrompue de CAISSE1 (numéro, lignes)', b9.indexOf(ref2) >= 0 && /1 ligne/.test(b9), b9);
    await c1.p.click('#psv-action'); await c1.p.waitForTimeout(400);
    ok('9. 1er clic : le bouton demande confirmation, rien ne change', (await c1.p.textContent('#psv-action')) === 'Confirmer la reprise ?' && etat(v2)[0] === 'INTERROMPUE');
    await c1.p.click('#psv-action');
    await c1.p.waitForFunction((id) => { const c = testextjs.app.getController('VenteCtr'); return c.current && c.current.lgPREENREGISTREMENTID === id; }, v2, { timeout: 20000 });
    const e9 = await attendre(c1.p, () => { const e = etat(v2); return e[0] === 'EN_COURS' ? e : null; }, 10000, 300);
    ok('9. 2e clic : la vente revient à l\'écran, EN_COURS', !!e9, JSON.stringify(etat(v2)));

    /* 10. reseau coupe puis revenu */
    await c1.ctx.setOffline(true);
    const e10 = await attendre(c1.p, () => { const e = etat(v2); return e[0] === 'INTERROMPUE' ? e : null; }, 200000, 5000);
    ok('10. Poste hors ligne : INTERROMPUE après 2 min sans signal (« SIGNAL_PERDU »)', e10 && e10[2] === 'SIGNAL_PERDU', JSON.stringify(etat(v2)));
    await c1.ctx.setOffline(false);
    const e10b = await attendre(c1.p, () => { const e = etat(v2); return e[0] === 'EN_COURS' ? e : null; }, 45000, 1000);
    ok('10. Réseau revenu : le signal du même poste reprend la saisie (EN_COURS)', !!e10b && (await courante(c1.p)) === v2, JSON.stringify(etat(v2)));

    /* 11. CAISSE3 sans le droit */
    const c3 = await poste('e2e-caisse3'); postes.push(c3);
    await C.nouvelleVente(c3.p);
    await C.taperArticle(c3.p, CIP1);
    const v3 = await courante(c3.p); ventes.push(v3);
    await attendre(c3.p, () => etat(v3)[0] === 'EN_COURS', 10000, 300);
    await vues.cliquer(c3.p, 'doventemanager #contenu [xtype=toolbar] #btnStandBy');
    await c3.p.waitForFunction(() => /Droit manquant/.test((document.getElementById('psv-bandeau') || {}).textContent || ''), null, { timeout: 10000 }).catch(() => {});
    ok('11. CAISSE3 « METTRE EN ATTENTE » : refus affiché (droit manquant), la vente reste ouverte et EN_COURS',
      /Droit manquant : Mettre une vente en attente/.test(await bandeau(c3.p)) && (await courante(c3.p)) === v3 && etat(v3)[0] === 'EN_COURS', await bandeau(c3.p));
    await vues.cliquer(c3.p, 'doventemanager #contenu [xtype=toolbar] #btnGoBack');
    await c3.p.waitForTimeout(400);
    await vues.cliquer(c3.p, 'doventemanager #contenu [xtype=toolbar] #btnRetourAttente');
    await c3.p.waitForTimeout(1500);
    ok('11. « Mettre en attente et quitter » refusé de même ; Retour revient', /Droit manquant/.test(await bandeau(c3.p)) && (await courante(c3.p)) === v3
      && (await boutons(c3.p))[0] === 'RETOUR' && etat(v3)[0] === 'EN_COURS');
    ok('11. Les deux refus de CAISSE3 sont au journal', journal(v3) === 'DEBUT_SAISIE/1/EN_COURS/-/E2E-SV3 ; METTRE_EN_ATTENTE/0/EN_COURS/-/E2E-SV3 ; METTRE_EN_ATTENTE/0/EN_COURS/-/E2E-SV3', journal(v3));

    /* 12. journal : ecran, export, chaine */
    await C.ouvrirEcran(ad.p, 'journalsaisievente');
    await C.visible(ad.p, 'journalsaisievente #jsvGrille');
    await ad.p.waitForFunction(() => /intacte|ROMPUE/.test(Ext.ComponentQuery.query('journalsaisievente #jsvChaine')[0].getEl().dom.textContent), null, { timeout: 20000 });
    const ecranJ = await ad.p.evaluate((j0) => { const s = Ext.ComponentQuery.query('journalsaisievente')[0].journal;
      return { chaine: Ext.ComponentQuery.query('journalsaisievente #jsvChaine')[0].getEl().dom.textContent,
        lignes: s.getRange().filter((r) => r.get('id') > j0).map((r) => r.get('id') + '/' + r.get('geste') + '/' + (r.get('admis') ? 1 : 0)).sort().join(' ') }; }, J0);
    const baseJ = q("SELECT GROUP_CONCAT(CONCAT(id, '/', geste, '/', admis) ORDER BY CONCAT(id, '/', geste, '/', admis) SEPARATOR ' ') FROM vente_journal_saisie WHERE id > " + J0 + " AND DATE(cree_le) = CURDATE()");
    ok('12. Écran du journal = base (mêmes lignes), chaîne annoncée intacte', /intacte/.test(ecranJ.chaine) && ecranJ.lignes === baseJ, ecranJ.chaine + ' | ' + ecranJ.lignes.slice(0, 200) + ' / ' + baseJ.slice(0, 200));
    const csv = await ad.p.evaluate(async () => (await fetch('../api/v1/vente-saisie/journal/export')).text());
    const idsCsv = csv.split(/\r?\n/).slice(1).map((l) => (l.match(/^"(\d+)"/) || [])[1]).filter(Boolean).map(Number).filter((x) => x > J0).sort((a, b) => a - b).join(',');
    ok('12. Export CSV = base : toutes les lignes du test, empreintes comprises, mention « intacte »', idsCsv === q('SELECT GROUP_CONCAT(id ORDER BY id) FROM vente_journal_saisie WHERE id > ' + J0)
      && /intacte/.test(csv) && /;"[0-9a-f]{64}"\r?\n/.test(csv), idsCsv);
    const cible = q('SELECT MIN(id) FROM vente_journal_saisie WHERE id > ' + J0 + " AND geste = 'RETOUR_SUPPRIMER'");
    q('UPDATE vente_journal_saisie SET montant = montant + 1 WHERE id = ' + cible);
    const rompu = await ad.api('GET', '../api/v1/vente-saisie/journal');
    q('UPDATE vente_journal_saisie SET montant = montant - 1 WHERE id = ' + cible);
    const repare = await ad.api('GET', '../api/v1/vente-saisie/journal');
    ok('12. Une ligne retouchée en base (montant + 1) est désignée ; remise en état : chaîne intacte',
      rompu.intact === false && String(rompu.rupture) === cible && repare.intact === true, JSON.stringify({ i: rompu.intact, r: rompu.rupture, cible, ok: repare.intact }));

    /* 13. bilan */
    const bilan = q("SELECT GROUP_CONCAT(CONCAT(geste, '/', admis) ORDER BY geste, admis SEPARATOR ' ') FROM vente_journal_saisie WHERE id > " + J0);
    const attendu = ['DEBUT_SAISIE/1', 'DEBUT_SAISIE/1', 'DEBUT_SAISIE/1', 'INTERROMPRE/1', 'INTERROMPRE/1', 'METTRE_EN_ATTENTE/0', 'METTRE_EN_ATTENTE/0', 'METTRE_EN_ATTENTE/1',
      'REPRENDRE_ATTENTE/0', 'REPRENDRE_ATTENTE/1', 'REPRENDRE_INTERROMPUE/0', 'REPRENDRE_INTERROMPUE/1', 'RETOUR_SUPPRIMER/1', 'SIGNAL_RETROUVE/1', 'SUPPRIMER_ATTENTE/0'].join(' ');
    ok('13. Bilan du journal : exactement les gestes du parcours, ni plus ni moins', bilan === attendu, bilan);
    ok('13. Stock des articles inchangé (aucune vente clôturée)', A.stock(P1) === STOCK0[0] && A.stock(P2) === STOCK0[1], [A.stock(P1), A.stock(P2), STOCK0].join(' '));
    ok('13. Aucune erreur JavaScript sur les quatre postes', postes.every((s) => s.erreurs.length === 0), postes.map((s) => s.erreurs.join(' | ')).join(' || '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    for (const s of postes) { await s.b.close().catch(() => {}); }
    nettoyer();
    A.nettoyer();
    ok('Nettoyage : ventes, lignes retirées, journal du test, comptes et profil retirés',
      q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + A.liste(ventes) + ")") === '0'
      && q('SELECT COUNT(*) FROM vente_journal_saisie WHERE id > ' + J0) === '0' && q("SELECT COUNT(*) FROM t_user WHERE lg_USER_ID LIKE 'E2E-SV%'") === '0');
    process.exit(A.bilan() ? 1 : 0);
  }
})();
