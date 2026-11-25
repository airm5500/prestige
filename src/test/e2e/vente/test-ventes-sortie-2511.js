/* SORTIE D'UNE VENTE EN SAISIE (retours du 25/11, points 1.2, 1.3 et 1.6), complément de test-ventes-saisie-2411.js.
 *
 * Parcours par les vues, compte réel « Caisse/Commande/Stock » (E2E SO1) et admin (écran d'administration).
 *
 *  1. Vente au comptant, 2 produits ; en-tête « Options > Mon compte » : la fenêtre HTML s'ouvre (mettre en attente
 *     et quitter / abandonner / rester), rien n'est encore fait ; « Rester » : même écran, même vente, journal
 *     inchangé ; Échap de même.
 *  2. Logo « PRESTIGE 3 » (retour au menu principal) puis « Mettre en attente et quitter » : EN_ATTENTE, l'écran de
 *     vente est quitté, la vente est dans « Ventes en attente » avec le même montant qu'en base.
 *  3. Nouvelle vente, 1 produit ; bouton « Accueil » de l'en-tête puis « Abandonner la vente » : la vente est retirée,
 *     ses lignes sont dans « Produits retirés et ventes abandonnées » (mêmes produits, mêmes quantités), journal
 *     « Retour : abandonner », l'écran demandé s'ouvre.
 *  4. Menu de navigation (Ventes) avec une vente en cours : même fenêtre ; « Rester » ; un nouveau clic sur le même
 *     menu repose la question.
 *  5. Vente assurance, client choisi, aucun produit : la fenêtre ne propose que « Abandonner » et « Rester » ; après
 *     « Abandonner », l'écran demandé s'ouvre, rien n'est écrit en base.
 *  6. Vente au comptant sans produit : le menu s'ouvre directement (pas de fenêtre).
 *  7. Rappel (1.6) : vente ouverte avec des produits, « Ventes en attente » > autre vente : trois choix ; « Annuler » :
 *     rien ne change ; « Mettre la vente actuelle en attente et rappeler l'autre » : l'une passe EN_ATTENTE, l'autre
 *     s'ouvre ; « Supprimer la vente actuelle et rappeler l'autre » : la vente ouverte est retirée (lignes gardées
 *     dans « Produits retirés »), l'autre s'ouvre. Vente ouverte sans produit : rappel direct, sans fenêtre.
 *  8. Décompte (1.2) : saisie interrompue (onglet fermé) ; au retour, le bandeau de l'auteur affiche « Abandon
 *     automatique dans 30 s », qui décroît ; l'écran d'administration « Ventes en cours de saisie » ouvert pendant ce
 *     temps ne supprime rien ; écran quitté : décompte arrêté, la vente reste INTERROMPUE ; écran rouvert : nouveau
 *     décompte de 30 s ; au bout, la vente est abandonnée (journal « fin du décompte », cause DECOMPTE) et retirée,
 *     lignes dans « Produits retirés ». Un clic sur « Reprendre » arrête le décompte.
 *  9. Bilan : journal exact de chaque vente, ni plus ni moins ; stock inchangé ; aucune erreur JavaScript.
 * Tout est retiré à la fin.
 */
const C = require('../ligne-comptant/commun');
const { chromium, A, vues, ok, q } = C;
const ENV_E2E = A.ENV_E2E;

const MDP = 'E2e-Sortie-9';
const ID = 'E2E-SO1', LOGIN = 'e2e-so1';
const ROLE_CAISSE = q("SELECT lg_ROLE_ID FROM t_role WHERE str_NAME = 'Caisse/Commande/Stock'");
const J0 = Number(q('SELECT IFNULL(MAX(id), 0) FROM vente_journal_saisie'));
const P1 = C.produitSimple(7);
const P2 = C.produitSimple(8);
const CIP1 = C.cip(P1), CIP2 = C.cip(P2);
const STOCK0 = [A.stock(P1), A.stock(P2)];
const ventes = [];
const CHOIX_SORTIE = JSON.stringify(['attente=Mettre en attente et quitter', 'abandonner=Abandonner la vente', 'rester=Rester sur la vente']);
const CHOIX_RAPPEL = JSON.stringify(['attente=Mettre la vente actuelle en attente et rappeler l’autre',
  'abandonner=Supprimer la vente actuelle et rappeler l’autre', 'rester=Annuler']);

const etat = (id) => q("SELECT CONCAT_WS('|', IFNULL(etat_saisie, '-'), IFNULL(saisie_interruption, '-'))"
  + " FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + id + "'").split('|');
const existe = (id) => q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + id + "'") === '1';
const journal = (id) => q("SELECT IFNULL(GROUP_CONCAT(CONCAT_WS('/', geste, admis, IFNULL(etat_apres, '-'), IFNULL(cause, '-'), IFNULL(utilisateur_id, 'SERVEUR')) ORDER BY id SEPARATOR ' ; '), '')"
  + " FROM vente_journal_saisie WHERE id > " + J0 + " AND vente_id = '" + id + "'");
const lignes = (id) => q("SELECT IFNULL(GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, 'x', int_QUANTITY) ORDER BY lg_FAMILLE_ID), '') FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + id + "'");
const retirees = (id) => q("SELECT IFNULL(GROUP_CONCAT(CONCAT(produit_id, 'x', quantite) ORDER BY produit_id), '') FROM vente_suppression WHERE vente_id = '" + id + "'");
const ref = (id) => q("SELECT str_REF FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + id + "'");
const attendre = async (p, f, delai, pas) => { const fin = Date.now() + delai; let v; while (Date.now() < fin) { v = f(); if (v) { return v; } await p.waitForTimeout(pas || 1000); } return f(); };

function nettoyer() {
  const v = A.liste(ventes);
  q("DELETE FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + " DELETE FROM t_preenregistrement_compte_client WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + " DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + " DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + " DELETE FROM vente_suppression WHERE vente_id IN (" + v + ");"
    + " DELETE FROM vente_journal_saisie WHERE id > " + J0 + ";"
    + " DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID LIKE 'E2E-SO%';"
    + " DELETE FROM t_role_user WHERE lg_USER_ID LIKE 'E2E-SO%';"
    + " DELETE FROM t_event_log WHERE lg_USER_ID LIKE 'E2E-SO%';"
    + " DELETE FROM t_user WHERE lg_USER_ID LIKE 'E2E-SO%'");
}

async function poste(login) {
  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1500, height: 900 } });
  const s = { b, ctx, erreurs: [] };
  await nouvellePage(s, login);
  return s;
}
/* nouvelle session de navigateur (l'onglet precedent est ferme) : nouveau contexte, nouvelle connexion */
async function nouvellePage(s, login) {
  if (s.p && !s.p.isClosed()) {
    s.ctx = await s.b.newContext({ viewport: { width: 1500, height: 900 } });
  } else if (s.p) {
    await s.ctx.close().catch(() => {});
    s.ctx = await s.b.newContext({ viewport: { width: 1500, height: 900 } });
  }
  s.p = await s.ctx.newPage();
  s.p.on('pageerror', (e) => s.erreurs.push(String(e.message)));
  await vues.connexion(s.p, login, login === ENV_E2E.LOGIN ? 'e2etest' : MDP);
}
const courante = (p) => C.venteCourante(p);
const ecranVente = (p) => p.evaluate(() => Ext.ComponentQuery.query('doventemanager').some((e) => !e.isDestroyed && e.isVisible(true)));
const fenetre = (p) => p.evaluate(() => { const f = document.getElementById('psv-fenetre');
  return f ? [...f.querySelectorAll('button[id^="psv-choix-"]')].map((b) => b.id.slice(10) + '=' + b.textContent) : null; });
const attendreFenetre = (p) => p.waitForSelector('#psv-fenetre', { timeout: 8000 }).then(() => true).catch(() => false);
const bandeau = (p) => p.evaluate(() => { const b = document.getElementById('psv-bandeau'); return b && b.style.display !== 'none' ? b.textContent : ''; });
const secondes = (p) => p.evaluate(() => { const d = document.getElementById('psv-decompte'); const m = d && /(\d+) s/.exec(d.textContent); return m ? Number(m[1]) : null; });
const modaleExt = (p) => p.evaluate(() => { const w = Ext.WindowManager.getActive(); return !!(w && w.isVisible() && w.modal); });

async function ouvrirMonCompte(p) {
  await vues.cliquer(p, '#commonsettingapp');
  await p.waitForTimeout(400);
  await p.locator('.prestige-flyout-menu .pft-item', { hasText: 'Mon compte' }).first().click();
}
async function venteAvec(p, cips) {
  await C.nouvelleVente(p);
  for (const c of cips) { await C.taperArticle(p, c); }
  const v = await courante(p); ventes.push(v);
  await attendre(p, () => etat(v)[0] === 'EN_COURS', 10000, 300);
  return v;
}

(async () => {
  nettoyer();
  q("INSERT INTO t_user (lg_USER_ID, str_LOGIN, str_PASSWORD, str_FIRST_NAME, str_LAST_NAME, str_FUNCTION, str_STATUT, lg_EMPLACEMENT_ID, dt_CREATED, int_CONNEXION)"
    + " VALUES ('" + ID + "', '" + LOGIN + "', MD5('" + MDP + "'), 'E2E', 'SO1', 'Caissier', 'enable', '1', NOW(), 0)");
  q("INSERT INTO t_role_user (lg_USER_ROLE_ID, lg_ROLE_ID, lg_USER_ID, dt_CREATED) VALUES ('" + ID + "', '" + ROLE_CAISSE + "', '" + ID + "', NOW())");
  q("INSERT INTO t_resume_caisse (ld_CAISSE_ID, lg_USER_ID, int_SOLDE_MATIN, int_SOLDE_SOIR, dt_CREATED, lg_CREATED_BY, str_STATUT) VALUES ('" + ID + "-RC', '" + ID + "', 0, 0, NOW(), '" + ID + "', 'is_Using')");
  A.ouvrirCaisse();
  const TP = A.tiersPayant('SO', '1');
  await A.clientAssure(null, 'SOA', [{ tp: TP, taux: 70 }]);
  const postes = [];
  try {
    const c1 = await poste(LOGIN); postes.push(c1);

    /* 1. en-tete « Mon compte » */
    const v1 = await venteAvec(c1.p, [CIP1, CIP2]);
    const lignes1 = lignes(v1);
    await ouvrirMonCompte(c1.p);
    const f1 = (await attendreFenetre(c1.p)) ? await fenetre(c1.p) : null;
    ok('1. « Mon compte » avec une vente de 2 produits : fenêtre HTML (pas ExtJS) mettre en attente / abandonner / rester ; rien n\'est encore fait',
      JSON.stringify(f1) === CHOIX_SORTIE && !(await modaleExt(c1.p)) && etat(v1)[0] === 'EN_COURS' && (await ecranVente(c1.p)), JSON.stringify(f1));
    await c1.p.click('#psv-choix-rester'); await c1.p.waitForTimeout(500);
    ok('1. « Rester » : fenêtre fermée, même écran, même vente, EN_COURS, journal inchangé',
      (await fenetre(c1.p)) === null && (await ecranVente(c1.p)) && (await courante(c1.p)) === v1 && etat(v1)[0] === 'EN_COURS'
      && journal(v1) === 'DEBUT_SAISIE/1/EN_COURS/-/' + ID, journal(v1));
    await ouvrirMonCompte(c1.p);
    await attendreFenetre(c1.p);
    await c1.p.keyboard.press('Escape'); await c1.p.waitForTimeout(500);
    ok('1. Échap : de même, on reste sur la vente', (await fenetre(c1.p)) === null && (await ecranVente(c1.p)) && (await courante(c1.p)) === v1);

    /* 2. logo PRESTIGE 3 > mettre en attente et quitter */
    await c1.p.click('#app-header-title .hdr-brand');
    await attendreFenetre(c1.p);
    await c1.p.click('#psv-choix-attente');
    await attendre(c1.p, () => etat(v1)[0] === 'EN_ATTENTE', 10000, 300);
    await c1.p.waitForTimeout(1500);
    const montant1 = Number(q("SELECT int_PRICE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v1 + "'"));
    const l2 = await c1.p.evaluate(async () => (await (await fetch('../api/v1/ventestats/preventes?query=&typeVenteId=&statut=ALL&start=0&limit=300')).json()).data || []);
    const r2 = l2.find((x) => (x.lgPREENREGISTREMENTID || x.id) === v1);
    ok('2. Logo « PRESTIGE 3 » puis « Mettre en attente et quitter » : EN_ATTENTE, écran de vente quitté, lignes intactes',
      etat(v1)[0] === 'EN_ATTENTE' && !(await ecranVente(c1.p)) && (await fenetre(c1.p)) === null && lignes(v1) === lignes1, etat(v1).join('|'));
    ok('2. Dans « Ventes en attente », même montant qu\'en base', !!r2 && Number(r2.intPRICE !== undefined ? r2.intPRICE : r2.montant) === montant1, JSON.stringify(r2 || {}).slice(0, 200));

    /* 3. bouton Accueil > abandonner */
    const v3 = await venteAvec(c1.p, [CIP2]);
    const lignes3 = lignes(v3);
    await c1.p.click('#hdr-metro-btn .hdr-metro');
    await attendreFenetre(c1.p);
    await c1.p.click('#psv-choix-abandonner');
    await attendre(c1.p, () => !existe(v3), 15000, 300);
    await c1.p.waitForTimeout(1500);
    ok('3. « Accueil » puis « Abandonner la vente » (un clic) : vente retirée ; lignes dans « Produits retirés » (mêmes produits, mêmes quantités) ; écran demandé ouvert',
      !existe(v3) && retirees(v3) === lignes3 && lignes3 !== '' && !(await ecranVente(c1.p)) && (await fenetre(c1.p)) === null, retirees(v3) + ' / ' + lignes3);
    ok('3. Journal : début puis « Retour : abandonner » (ABANDONNEE), une seule fois', journal(v3) === 'DEBUT_SAISIE/1/EN_COURS/-/' + ID + ' ; RETOUR_SUPPRIMER/1/ABANDONNEE/-/' + ID, journal(v3));

    /* 4. menu de navigation */
    const v4 = await venteAvec(c1.p, [CIP1]);
    const lib = await c1.p.evaluate(() => { let r = null; Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode()
      .cascadeBy((n) => { if (!r && n.get('id') === 'cloturerventemanager' && n.parentNode) { r = [n.parentNode.get('text'), n.get('text')]; } }); return r; });
    await vues.ouvrirMenu(c1.p, lib[0], lib[1]);
    const f4 = (await attendreFenetre(c1.p)) ? await fenetre(c1.p) : null;
    ok('4. Menu « ' + lib[1] + ' » avec une vente en cours : même fenêtre', JSON.stringify(f4) === CHOIX_SORTIE, JSON.stringify(f4));
    await c1.p.click('#psv-choix-rester'); await c1.p.waitForTimeout(500);
    ok('4. « Rester » : la vente reste à l\'écran', (await ecranVente(c1.p)) && (await courante(c1.p)) === v4 && etat(v4)[0] === 'EN_COURS');
    await vues.ouvrirMenu(c1.p, lib[0], lib[1]);
    ok('4. Nouveau clic sur le même menu : la question est reposée', await attendreFenetre(c1.p));
    await c1.p.click('#psv-choix-attente');
    await attendre(c1.p, () => etat(v4)[0] === 'EN_ATTENTE', 10000, 300);
    await C.visible(c1.p, 'cloturerventemanager #addBtn');
    ok('4. « Mettre en attente et quitter » : EN_ATTENTE, le menu demandé s\'ouvre', etat(v4)[0] === 'EN_ATTENTE');

    /* 5. assurance, client choisi, aucun produit */
    await vues.cliquer(c1.p, 'cloturerventemanager #addBtn');
    await C.visible(c1.p, C.CHAMP_PRODUIT); await c1.p.waitForTimeout(1500);
    await C.passerEnAssurance(c1.p);
    await C.choisirClient(c1.p, C.MARQUE + ' SOA');
    const avant5 = q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_USER_ID = '" + ID + "'");
    await ouvrirMonCompte(c1.p);
    const f5 = (await attendreFenetre(c1.p)) ? await fenetre(c1.p) : null;
    ok('5. Assurance, client choisi, aucun produit : seulement « Abandonner » et « Rester »',
      JSON.stringify(f5) === JSON.stringify(['abandonner=Abandonner la vente', 'rester=Rester sur la vente']), JSON.stringify(f5));
    await c1.p.click('#psv-choix-abandonner');
    await c1.p.waitForFunction(() => Ext.ComponentQuery.query('myaccountmanager').some((e) => e.isVisible(true)), null, { timeout: 15000 }).catch(() => {});
    ok('5. « Abandonner » : l\'écran « Mon compte » s\'ouvre ; aucune vente écrite en base',
      !(await ecranVente(c1.p)) && await c1.p.evaluate(() => Ext.ComponentQuery.query('myaccountmanager').some((e) => e.isVisible(true)))
      && q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_USER_ID = '" + ID + "'") === avant5);

    /* 6. comptant sans produit */
    await C.nouvelleVente(c1.p);
    await ouvrirMonCompte(c1.p);
    await c1.p.waitForFunction(() => Ext.ComponentQuery.query('myaccountmanager').some((e) => e.isVisible(true)), null, { timeout: 15000 }).catch(() => {});
    ok('6. Vente au comptant sans produit : « Mon compte » s\'ouvre directement, sans fenêtre',
      (await fenetre(c1.p)) === null && await c1.p.evaluate(() => Ext.ComponentQuery.query('myaccountmanager').some((e) => e.isVisible(true))));

    /* 7. rappel d'une autre vente (1.6) */
    const rappelerDepuisEcran = async (refVoulue) => {
      await c1.p.click('#' + await c1.p.evaluate(() => Ext.ComponentQuery.query('doventemanager #preventeSearchBtn')[0].getId()));
      await c1.p.waitForFunction((r) => [...document.querySelectorAll('.va-carte .va-ticket')].some((x) => x.textContent === r), refVoulue, { timeout: 20000 });
      await c1.p.evaluate((r) => { document.querySelectorAll('#carte-visee').forEach((x) => x.removeAttribute('id'));
        const c = [...document.querySelectorAll('.va-carte')].find((x) => x.querySelector('.va-ticket').textContent === r); c.id = 'carte-visee'; }, refVoulue);
      await c1.p.click('#carte-visee'); await c1.p.waitForTimeout(800);
      await c1.p.keyboard.press('Enter');
    };
    const ouverte = (id) => c1.p.waitForFunction((v) => { const c = testextjs.app.getController('VenteCtr'); return c.current && c.current.lgPREENREGISTREMENTID === v; }, id, { timeout: 20000 });
    const v7 = await venteAvec(c1.p, [CIP1, CIP2]);
    const lignes7 = lignes(v7);
    await rappelerDepuisEcran(ref(v1));
    const f7 = (await attendreFenetre(c1.p)) ? await fenetre(c1.p) : null;
    ok('7. Rappel d\'une vente en attente, vente ouverte avec 2 produits : trois choix', JSON.stringify(f7) === CHOIX_RAPPEL, JSON.stringify(f7));
    await c1.p.click('#psv-choix-rester'); await c1.p.waitForTimeout(800);
    ok('7. « Annuler » : la vente ouverte reste, l\'autre reste en attente', (await courante(c1.p)) === v7 && etat(v7)[0] === 'EN_COURS' && etat(v1)[0] === 'EN_ATTENTE');
    await rappelerDepuisEcran(ref(v1));
    await attendreFenetre(c1.p);
    await c1.p.click('#psv-choix-attente');
    await ouverte(v1);
    await attendre(c1.p, () => etat(v1)[0] === 'EN_COURS' && etat(v7)[0] === 'EN_ATTENTE', 10000, 300);
    ok('7. « Mettre la vente actuelle en attente et rappeler l\'autre » : la vente ouverte passe EN_ATTENTE (lignes intactes), l\'autre s\'ouvre EN_COURS',
      etat(v7)[0] === 'EN_ATTENTE' && lignes(v7) === lignes7 && etat(v1)[0] === 'EN_COURS' && (await courante(c1.p)) === v1, etat(v7).join('|') + ' ' + etat(v1).join('|'));
    await rappelerDepuisEcran(ref(v7));
    await attendreFenetre(c1.p);
    await c1.p.click('#psv-choix-abandonner');
    await ouverte(v7);
    await attendre(c1.p, () => !existe(v1), 15000, 300);
    ok('7. « Supprimer la vente actuelle et rappeler l\'autre » : la vente ouverte est retirée (lignes dans « Produits retirés »), l\'autre s\'ouvre',
      !existe(v1) && retirees(v1) === lignes1 && (await courante(c1.p)) === v7 && etat(v7)[0] === 'EN_COURS', retirees(v1) + ' / ' + lignes1);
    await vues.cliquer(c1.p, 'doventemanager #contenu [xtype=toolbar] #btnStandBy');
    await attendre(c1.p, () => etat(v7)[0] === 'EN_ATTENTE', 10000, 300);
    await c1.p.waitForTimeout(1500);
    await rappelerDepuisEcran(ref(v7));
    await ouverte(v7);
    ok('7. Écran sans vente en cours : rappel direct, sans fenêtre', (await fenetre(c1.p)) === null && etat(v7)[0] === 'EN_COURS');
    await vues.cliquer(c1.p, 'doventemanager #contenu [xtype=toolbar] #btnGoBack');
    await attendreFenetre(c1.p);
    await c1.p.click('#psv-choix-abandonner');
    await attendre(c1.p, () => !existe(v7), 15000, 300);

    /* 8. decompte (1.2) */
    const v8 = await venteAvec(c1.p, [CIP1, CIP2]);
    const lignes8 = lignes(v8);
    await c1.p.close({ runBeforeUnload: true });
    const e8 = await attendre({ waitForTimeout: (ms) => new Promise((r) => setTimeout(r, ms)) }, () => etat(v8)[0] === 'INTERROMPUE', 15000, 500);
    ok('8. Onglet fermé : INTERROMPUE (« FERMETURE »)', e8 && etat(v8)[1] === 'FERMETURE', etat(v8).join('|'));
    const ad = await poste(ENV_E2E.LOGIN); postes.push(ad);
    await C.ouvrirEcran(ad.p, 'ventesencourssaisie');
    await C.visible(ad.p, 'ventesencourssaisie #vcsGrille');
    await nouvellePage(c1, LOGIN);
    await C.nouvelleVente(c1.p);
    await c1.p.waitForFunction(() => !!document.getElementById('psv-decompte'), null, { timeout: 20000 }).catch(() => {});
    const s1 = await secondes(c1.p);
    await c1.p.waitForTimeout(3000);
    const s2 = await secondes(c1.p);
    ok('8. Bandeau de l\'auteur : la vente (numéro) et « Abandon automatique dans 30 s », qui décroît',
      (await bandeau(c1.p)).indexOf(ref(v8)) >= 0 && s1 >= 27 && s1 <= 30 && s2 !== null && s2 <= s1 - 2 && s2 >= s1 - 4, (await bandeau(c1.p)) + ' ' + s1 + ' -> ' + s2);
    /* ecran quitte pendant le decompte */
    await C.ouvrirEcran(c1.p, 'cloturerventemanager');
    await c1.p.waitForTimeout(2500);
    ok('8. Écran de vente quitté : bandeau et décompte retirés', (await bandeau(c1.p)) === '' && (await secondes(c1.p)) === null, await bandeau(c1.p));
    await c1.p.waitForTimeout(31000);
    ok('8. 31 s plus tard, écran quitté : la vente est toujours INTERROMPUE, rien au journal', etat(v8)[0] === 'INTERROMPUE'
      && journal(v8) === 'DEBUT_SAISIE/1/EN_COURS/-/' + ID + ' ; INTERROMPRE/1/INTERROMPUE/FERMETURE/' + ID, journal(v8));
    await vues.cliquer(c1.p, 'cloturerventemanager #addBtn');
    await c1.p.waitForFunction(() => !!document.getElementById('psv-decompte'), null, { timeout: 20000 }).catch(() => {});
    const s3 = await secondes(c1.p);
    ok('8. Écran rouvert : nouveau décompte de 30 s', s3 >= 27 && s3 <= 30, String(s3));
    const fin8 = await attendre(c1.p, () => !existe(v8), 45000, 1000);
    await ad.p.evaluate(() => { const v = Ext.ComponentQuery.query('ventesencourssaisie')[0]; if (v && v.ventes) { v.ventes.load(); } });
    ok('8. Fin du décompte sans reprise : vente retirée ; lignes dans « Produits retirés » (mêmes produits, mêmes quantités)',
      fin8 && retirees(v8) === lignes8 && lignes8 !== '', retirees(v8) + ' / ' + lignes8);
    ok('8. Journal : « fin du décompte » par l\'auteur (cause DECOMPTE), ABANDONNEE, une seule fois',
      journal(v8) === ['DEBUT_SAISIE/1/EN_COURS/-/' + ID, 'INTERROMPRE/1/INTERROMPUE/FERMETURE/' + ID, 'ABANDONNER_INTERROMPUE/1/ABANDONNEE/DECOMPTE/' + ID].join(' ; '), journal(v8));
    ok('8. Bandeau retiré une fois la vente abandonnée', !(await bandeau(c1.p)).includes(ref(v8) || 'x'));
    ok('8. L\'écran d\'administration, resté ouvert, n\'a rien supprimé lui-même (aucun geste de l\'admin au journal)',
      q("SELECT COUNT(*) FROM vente_journal_saisie WHERE id > " + J0 + " AND utilisateur_id = '" + A.ADMIN + "'") === '0');
    /* un clic sur Reprendre arrete le decompte */
    const v9 = await venteAvec(c1.p, [CIP2]);
    await c1.p.close({ runBeforeUnload: true });
    await attendre({ waitForTimeout: (ms) => new Promise((r) => setTimeout(r, ms)) }, () => etat(v9)[0] === 'INTERROMPUE', 15000, 500);
    await nouvellePage(c1, LOGIN);
    await C.nouvelleVente(c1.p);
    await c1.p.waitForFunction(() => !!document.getElementById('psv-decompte'), null, { timeout: 20000 }).catch(() => {});
    await c1.p.click('#psv-action'); await c1.p.waitForTimeout(500);
    ok('8. 1er clic sur « Reprendre » : le décompte s\'arrête, la reprise est demandée en confirmation', (await secondes(c1.p)) === null
      && (await c1.p.textContent('#psv-action')) === 'Confirmer la reprise ?');
    await c1.p.waitForTimeout(32000);
    ok('8. 32 s plus tard : toujours INTERROMPUE', etat(v9)[0] === 'INTERROMPUE', etat(v9).join('|'));
    await c1.p.click('#psv-action');
    await c1.p.waitForFunction((id) => { const c = testextjs.app.getController('VenteCtr'); return c.current && c.current.lgPREENREGISTREMENTID === id; }, v9, { timeout: 20000 });
    ok('8. 2e clic : la vente revient, EN_COURS', (await attendre(c1.p, () => etat(v9)[0] === 'EN_COURS', 10000, 300)) === true);
    await vues.cliquer(c1.p, 'doventemanager #contenu [xtype=toolbar] #btnGoBack');
    await attendreFenetre(c1.p);
    await c1.p.click('#psv-choix-abandonner');
    await attendre(c1.p, () => !existe(v9), 15000, 300);

    /* 9. bilan */
    const gestes = q("SELECT IFNULL(GROUP_CONCAT(geste ORDER BY id), '') FROM vente_journal_saisie WHERE id > " + J0);
    ok('9. Bilan du journal : exactement les gestes du parcours, ni plus ni moins', gestes === [
      'DEBUT_SAISIE', 'METTRE_EN_ATTENTE', // v1 (2)
      'DEBUT_SAISIE', 'RETOUR_SUPPRIMER', // v3 (3)
      'DEBUT_SAISIE', 'METTRE_EN_ATTENTE', // v4 (4)
      'DEBUT_SAISIE', 'METTRE_EN_ATTENTE', 'REPRENDRE_ATTENTE', 'RETOUR_SUPPRIMER', 'REPRENDRE_ATTENTE', 'METTRE_EN_ATTENTE', 'REPRENDRE_ATTENTE', 'RETOUR_SUPPRIMER', // 7
      'DEBUT_SAISIE', 'INTERROMPRE', 'ABANDONNER_INTERROMPUE', // v8
      'DEBUT_SAISIE', 'INTERROMPRE', 'REPRENDRE_INTERROMPUE', 'RETOUR_SUPPRIMER' // v9
    ].join(','), gestes);
    ok('9. Stock inchangé (aucune vente clôturée)', A.stock(P1) === STOCK0[0] && A.stock(P2) === STOCK0[1], [A.stock(P1), A.stock(P2), STOCK0].join(' '));
    ok('9. Aucune erreur JavaScript', postes.every((s) => s.erreurs.length === 0), postes.map((s) => s.erreurs.join(' | ')).join(' || '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    for (const s of postes) { await s.b.close().catch(() => {}); }
    nettoyer();
    A.nettoyer();
    ok('Nettoyage : ventes, lignes retirées, journal du test, compte retirés',
      q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + A.liste(ventes) + ")") === '0'
      && q('SELECT COUNT(*) FROM vente_journal_saisie WHERE id > ' + J0) === '0' && q("SELECT COUNT(*) FROM t_user WHERE lg_USER_ID LIKE 'E2E-SO%'") === '0');
    process.exit(A.bilan() ? 1 : 0);
  }
})();
