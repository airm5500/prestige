/* RETOUR DU 25/11 (point 2) : menu « Ventes », onglet « Ventes en cours et interrompues ». La barre du menu (type en
 * puces, recherche, « Imprimer par vente », « Liste des produits », « Créer un inventaire ») était grisée sur cet
 * onglet ; elle doit porter sur les ventes de l'onglet, comme sur l'onglet « Ventes en attente ».
 *
 * Jeu d'essai fait par les écrans :
 *  - X : caissier JS1 (profil « Caisse/Commande/Stock », sans le droit de voir les ventes en cours des autres), vente
 *    au comptant, P1 x2 et P2 x1, onglet fermé : saisie interrompue ;
 *  - Y : administrateur, vente assurance (client assuré 80 %), P3 x1 et P1 x1, écran laissé ouvert : en cours de saisie.
 * Contrôles (administrateur, autre navigateur) :
 *  1. barre entièrement active sur l'onglet ; colonne « Type » : X « Au comptant », Y « Assurance » (= base) ;
 *  2. puces : « Au comptant » -> X seule, « Assurance / carnet » -> Y seule, « Toutes » -> X et Y (= base) ;
 *  3. recherche (Entrée) : CIP de P3 -> Y seule ; référence de X -> X seule ; texte inconnu -> aucune vente ;
 *  4. rapprochement : « Imprimer par vente » et « Liste des produits » (PDF) = ventes et produits de l'écran (quantités
 *     de la base), filtre de type respecté ; délai d'affichage sous le plafond ;
 *  5. « Créer un inventaire » (recherche = référence de X) : nombre annoncé = 2 produits ; inventaire créé avec P1 et
 *     P2, une fois chacun (bilan : un seul inventaire, ventes X et Y intactes) ;
 *  6. droits : JS1 ne voit que X ; son PDF ne contient pas Y ;
 *  7. onglet « Ventes en attente » : barre et liste inchangées (non-régression) ;
 *  8. ergonomie de l'écran complet à 1280 × 600, 1366 × 768, 1920 × 1080 : barre et onglet entiers, boutons non
 *     recouverts, tableau jusqu'à sa dernière ligne à la molette, colonnes « Type » et reprise atteignables.
 * Lancement seul : node src/test/e2e/vente/test-ventes-en-cours-barre-2511.js
 */
const L = require('../ligne-comptant/commun');
const { chromium, A, vues, ok, q, MARQUE } = L;
const C = require('../audits/commun');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const ENV_E2E = A.ENV_E2E;

const MDP = 'E2e-EnCours-5';
const ID_JS = 'E2E-VEC1';
const ROLE_CAISSE = q("SELECT lg_ROLE_ID FROM t_role WHERE str_NAME = 'Caisse/Commande/Stock'");
const P1 = L.produitSimple(7), P2 = L.produitSimple(8), P3 = L.produitSimple(9);
const PLAFOND_PDF_MS = 8000;
const INV0 = q("SELECT IFNULL(MAX(dt_CREATED), '2000-01-01') FROM t_inventaire");
const ventes = [];
const etat = (id) => q("SELECT IFNULL(etat_saisie, '-') FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + id + "'");
const attendre = async (f, delai, pas) => { const fin = Date.now() + delai; let v; while (Date.now() < fin) { v = f(); if (v) { return v; } await new Promise((r) => setTimeout(r, pas || 500)); } return f(); };
const textePdf = (f) => execFileSync('pdftotext', ['-enc', 'UTF-8', '-layout', f, '-'], { encoding: 'utf8', maxBuffer: 1 << 26 });
const inventaires = () => q("SELECT IFNULL(GROUP_CONCAT(lg_INVENTAIRE_ID), '') FROM t_inventaire WHERE str_NAME LIKE 'INVENTAIRE PRODUITS EN COURS DU%' AND dt_CREATED > '" + INV0 + "'");
const empreinte = (id) => q("SELECT CONCAT_WS('|', p.str_STATUT, p.int_PRICE, (SELECT GROUP_CONCAT(CONCAT(d.lg_FAMILLE_ID, 'x', d.int_QUANTITY) ORDER BY d.lg_FAMILLE_ID)"
  + " FROM t_preenregistrement_detail d WHERE d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID)) FROM t_preenregistrement p WHERE p.lg_PREENREGISTREMENT_ID = '" + id + "'");

function nettoyer() {
  const deCompte = q("SELECT IFNULL(GROUP_CONCAT(lg_PREENREGISTREMENT_ID), '') FROM t_preenregistrement WHERE lg_USER_ID = '" + ID_JS + "'");
  const v = A.liste(Array.from(new Set([...ventes, ...(deCompte ? deCompte.split(',') : [])])));
  const inv = inventaires();
  if (inv) {
    const l = inv.split(',').map((x) => "'" + x + "'").join(',');
    q('DELETE FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID IN (' + l + '); DELETE FROM t_inventaire WHERE lg_INVENTAIRE_ID IN (' + l + ')');
  }
  q("DELETE FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + " DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + " DELETE FROM vente_journal_saisie WHERE vente_id IN (" + v + ");"
    + " DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + " DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID LIKE '" + ID_JS + "%';"
    + " DELETE FROM t_role_user WHERE lg_USER_ID = '" + ID_JS + "';"
    + " DELETE FROM t_event_log WHERE lg_USER_ID = '" + ID_JS + "';"
    + " DELETE FROM t_user WHERE lg_USER_ID = '" + ID_JS + "'");
}

async function navigateur(login, mdp) {
  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1500, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const s = { b, ctx, p, erreurs: [] };
  p.on('pageerror', (e) => s.erreurs.push(String(e.message)));
  await vues.connexion(p, login, mdp);
  return s;
}

/* menu « Ventes », onglet « Ventes en cours et interrompues », liste chargee */
async function ouvrirOnglet(p) {
  await L.ouvrirEcran(p, 'cloturerventemanager');
  await L.visible(p, 'cloturerventemanager #addBtn');
  await p.locator('.x-tab', { hasText: 'Ventes en cours et interrompues' }).first().click();
  await chargee(p);
}
const chargee = (p) => p.waitForFunction(() => { const v = Ext.ComponentQuery.query('cloturerventemanager ventesencourssaisie')[0];
  return v && v.ventes.lastOptions && !v.ventes.isLoading(); }, null, { timeout: 20000 }).then(() => p.waitForTimeout(300));
/* ventes du test affichees dans l'onglet : id/type affiche (texte de la pastille) */
const affichees = (p) => p.evaluate((ids) => { const v = Ext.ComponentQuery.query('cloturerventemanager ventesencourssaisie')[0];
  const g = v.down('#vcsGrille'), vue = g.getView();
  return v.ventes.getRange().filter((r) => ids.includes(r.get('id'))).map((r) => { const n = vue.getNode(r);
    const c = n ? n.querySelector('.va-pill') : null; return r.get('id') + '/' + (c ? c.textContent.trim() : '?'); }).sort(); }, ventes);
async function puce(p, texte) {
  const id = await p.evaluate((t) => Ext.ComponentQuery.query('cloturerventemanager #typesPuces button').find((b) => b.getText() === t).getId(), texte);
  await p.click('#' + id);
  await chargee(p);
}
async function chercher(p, texte) {
  await vues.cliquer(p, 'cloturerventemanager #query');
  await p.keyboard.press('Control+A');
  await p.keyboard.press('Backspace');
  if (texte) { await p.keyboard.type(texte, { delay: 15 }); }
  await p.keyboard.press('Enter');
  await p.waitForTimeout(400);
  await chargee(p);
}
/* clic sur un bouton d'impression : URL du PDF ouverte, delai clic -> fenetre, texte du PDF */
async function imprimer(s, bouton, dossier) {
  const id = await s.p.evaluate((b) => Ext.ComponentQuery.query('cloturerventemanager #' + b)[0].getId(), bouton);
  const t0 = Date.now();
  const [pop] = await Promise.all([s.ctx.waitForEvent('page', { timeout: 60000 }), s.p.click('#' + id)]);
  await pop.waitForLoadState('domcontentloaded').catch(() => {});
  const delai = Date.now() - t0;
  const url = pop.url();
  /* le PDF servi par l'application, sinon le fichier ecrit par le serveur (un autre domaine que domain1 ne sert pas
     data/reports/pdf : support/editions.js) */
  const corps = await (await s.p.request.get(url)).body();
  let f = path.join(dossier, bouton + '-' + Date.now() + '.pdf');
  if (corps.slice(0, 4).toString() === '%PDF') {
    fs.writeFileSync(f, corps);
  } else {
    f = require('../support/editions').fichierEdition(url);
    if (!fs.existsSync(f)) { throw new Error('PDF introuvable : ' + url); }
  }
  await pop.close().catch(() => {});
  return { delai, url, texte: textePdf(f) };
}
/* etat de la barre : boutons actifs et non recouverts */
const barre = (p) => p.evaluate(() => { const e = Ext.ComponentQuery.query('cloturerventemanager')[0];
  const ids = ['addBtn', 'typesPuces', 'query', 'rechercher', 'printParVente', 'printListe', 'createInventaire'];
  return { actifs: ids.filter((i) => { const c = e.down('#' + i); return c.isVisible(true) && !c.isDisabled(); }),
    nonRecouverts: ids.filter((i) => { const d = e.down('#' + i).getEl().dom, r = d.getBoundingClientRect();
      const x = document.elementFromPoint(r.left + Math.min(r.width / 2, 20), r.top + r.height / 2);
      return r.width > 0 && r.bottom <= window.innerHeight && r.right <= window.innerWidth && !!x && d.contains(x); }) }; });

(async () => {
  nettoyer();
  q("INSERT INTO t_user (lg_USER_ID, str_LOGIN, str_PASSWORD, str_FIRST_NAME, str_LAST_NAME, str_FUNCTION, str_STATUT, lg_EMPLACEMENT_ID, dt_CREATED, int_CONNEXION)"
    + " VALUES ('" + ID_JS + "', 'e2e-vec1', MD5('" + MDP + "'), 'E2E', 'VEC1', 'Caissier', 'enable', '1', NOW(), 0)");
  q("INSERT INTO t_role_user (lg_USER_ROLE_ID, lg_ROLE_ID, lg_USER_ID, dt_CREATED) VALUES ('" + ID_JS + "', '" + ROLE_CAISSE + "', '" + ID_JS + "', NOW())");
  q("INSERT INTO t_resume_caisse (ld_CAISSE_ID, lg_USER_ID, int_SOLDE_MATIN, int_SOLDE_SOIR, dt_CREATED, lg_CREATED_BY, str_STATUT) VALUES ('" + ID_JS + "-RC', '" + ID_JS + "', 0, 0, NOW(), '" + ID_JS + "', 'is_Using')");
  A.ouvrirCaisse();
  const TA = C.tiersPayant('VEC', '1');
  await C.clientAssure(null, 'VECCL', [{ tp: TA, taux: 80 }]);
  const sessions = [];
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-en-cours-'));
  try {
    /* X : JS1, au comptant, P1 x2 (deux saisies) et P2 x1, onglet ferme */
    const js = await navigateur('e2e-vec1', MDP); sessions.push(js);
    await L.nouvelleVente(js.p);
    await L.taperArticle(js.p, L.cip(P1));
    await L.taperArticle(js.p, L.cip(P2));
    await L.taperArticle(js.p, L.cip(P1));
    const vX = await L.venteCourante(js.p); ventes.push(vX);
    await attendre(() => etat(vX) === 'EN_COURS', 10000);
    await js.p.close({ runBeforeUnload: true });
    /* Y : administrateur, assurance, client assure, P3 x1 et P1 x1 ; ecran laisse ouvert */
    const ad = await L.connecterEtOuvrirVente(); sessions.push(ad); ad.erreurs = ad.erreurs || [];
    await L.choisirType(ad.p, 'Assurance', '2');
    await vues.cliquer(ad.p, 'doventemanager #contenu #clientSearchTextField');
    await ad.p.keyboard.press('Control+A');
    await ad.p.keyboard.type(MARQUE + ' VECCL', { delay: 20 });
    await ad.p.keyboard.press('Enter');
    const ligne = ad.p.locator('.x-window .x-grid-row').filter({ visible: true, hasText: MARQUE + '-VECCL' }).first();
    const pose = ad.p.locator('text=(' + MARQUE + '-VECCL)').filter({ visible: true }).first();
    await Promise.race([ligne.waitFor({ timeout: 30000 }), pose.waitFor({ timeout: 30000 })]);
    if (await ligne.isVisible().catch(() => false)) { await ligne.click(); }
    await ad.p.waitForTimeout(1500);
    await L.taperArticle(ad.p, L.cip(P3));
    await L.taperArticle(ad.p, L.cip(P1));
    const vY = await L.venteCourante(ad.p); ventes.push(vY);
    ok('0. Jeu d\'essai fait par les écrans : X interrompue (VNO, P1 x2, P2 x1), Y en cours (VO, P3 x1, P1 x1)',
      (await attendre(() => etat(vX) === 'INTERROMPUE' && etat(vY) === 'EN_COURS', 20000)) === true
      && q("SELECT str_TYPE_VENTE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + vX + "'") === 'VNO'
      && q("SELECT str_TYPE_VENTE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + vY + "'") === 'VO',
      [etat(vX), etat(vY), empreinte(vX), empreinte(vY)].join(' / '));
    const avantX = empreinte(vX), avantY = empreinte(vY);
    const refX = q("SELECT str_REF FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + vX + "'");
    const refY = q("SELECT str_REF FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + vY + "'");
    const qte = (v, pr) => q("SELECT IFNULL(SUM(int_QUANTITY), 0) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + v + "' AND lg_FAMILLE_ID = '" + pr.id + "'");
    const nom = (pr) => q("SELECT str_NAME FROM t_famille WHERE lg_FAMILLE_ID = '" + pr.id + "'");

    /* 1. administrateur, autre navigateur */
    const vu = await navigateur(ENV_E2E.LOGIN, 'e2etest'); sessions.push(vu);
    await ouvrirOnglet(vu.p);
    const b1 = await barre(vu.p);
    ok('1. Onglet « Ventes en cours et interrompues » : type, recherche, impressions et inventaire actifs (7/7)', b1.actifs.length === 7, JSON.stringify(b1));
    ok('1. Colonne « Type » : X « Au comptant », Y « Assurance » (= type en base)',
      JSON.stringify(await affichees(vu.p)) === JSON.stringify([vX + '/Au comptant', vY + '/Assurance'].sort()), JSON.stringify(await affichees(vu.p)));

    /* 2. puces du type */
    await puce(vu.p, 'Au comptant');
    const a1 = await affichees(vu.p);
    await puce(vu.p, 'Assurance / carnet');
    const a2 = await affichees(vu.p);
    await puce(vu.p, 'Toutes');
    const a3 = await affichees(vu.p);
    ok('2. Puces : « Au comptant » -> X seule ; « Assurance / carnet » -> Y seule ; « Toutes » -> X et Y',
      JSON.stringify(a1) === JSON.stringify([vX + '/Au comptant']) && JSON.stringify(a2) === JSON.stringify([vY + '/Assurance']) && a3.length === 2, JSON.stringify([a1, a2, a3]));
    const totalBase = q("SELECT COUNT(*) FROM t_preenregistrement WHERE etat_saisie IN ('EN_COURS', 'INTERROMPUE') AND str_STATUT IN ('is_Process', 'pending') AND dt_UPDATED >= CURDATE()");
    const totalEcran = await vu.p.evaluate(() => Ext.ComponentQuery.query('cloturerventemanager ventesencourssaisie')[0].ventes.getCount());
    ok('2. Rapprochement : sans filtre, l\'onglet montre toutes les ventes en cours et interrompues du jour (= base)', String(totalEcran) === totalBase, totalEcran + ' / ' + totalBase);

    /* 3. recherche */
    await chercher(vu.p, L.cip(P3));
    const r1 = await affichees(vu.p);
    await chercher(vu.p, refX);
    const r2 = await affichees(vu.p);
    await chercher(vu.p, 'ZZQ' + MARQUE);
    const r3 = await vu.p.evaluate(() => Ext.ComponentQuery.query('cloturerventemanager ventesencourssaisie')[0].ventes.getCount());
    ok('3. Recherche : CIP de P3 -> Y seule ; référence de X -> X seule ; texte inconnu -> aucune vente',
      JSON.stringify(r1) === JSON.stringify([vY + '/Assurance']) && JSON.stringify(r2) === JSON.stringify([vX + '/Au comptant']) && r3 === 0, JSON.stringify([r1, r2, r3]));
    /* la liste rafraichie (« Actualiser ») garde les filtres */
    await chercher(vu.p, refX);
    await vues.cliquer(vu.p, 'cloturerventemanager #vcsActualiser');
    await vu.p.waitForTimeout(300);
    await chargee(vu.p);
    ok('3. « Actualiser » garde la recherche', JSON.stringify(await affichees(vu.p)) === JSON.stringify([vX + '/Au comptant']), JSON.stringify(await affichees(vu.p)));

    /* 4. impressions : recherche vide, toutes les ventes du jour ; puis type « Au comptant » */
    await chercher(vu.p, '');
    const pv = await imprimer(vu, 'printParVente', dossier);
    const pl = await imprimer(vu, 'printListe', dossier);
    const contient = (t, v, prs) => t.indexOf(v) >= 0 && prs.every((pr) => t.indexOf(nom(pr).slice(0, 20)) >= 0);
    ok('4. « Imprimer par vente » : PDF des ventes en cours (titre), X avec P1 et P2, Y avec P3 et P1',
      /VENTES EN COURS/.test(pv.texte) && contient(pv.texte, refX, [P1, P2]) && contient(pv.texte, refY, [P3, P1]), pv.url + '\n' + pv.texte.slice(0, 1500));
    /* quantites lues ligne par ligne : la ligne du PDF qui porte la reference et le produit porte la quantite de la base */
    const quantitePdf = (t, ref, pr) => { const l = t.split('\n').find((x) => x.indexOf(ref) >= 0 && x.indexOf(nom(pr).slice(0, 20)) >= 0);
      return l ? l : ''; };
    const lignesListe = [[refX, vX, P1], [refX, vX, P2], [refY, vY, P3], [refY, vY, P1]].map(([ref, v, pr]) => {
      const l = quantitePdf(pl.texte, ref, pr); return { l, attendu: qte(v, pr), ok: new RegExp('\\b' + qte(v, pr) + '\\b').test(l.replace(ref, '').replace(L.cip(pr), '')) }; });
    ok('4. « Liste des produits » : une ligne par produit et par vente, quantité = base (P1 x2 dans X)',
      /VENTES EN COURS/.test(pl.texte) && lignesListe.every((x) => x.l && x.ok), JSON.stringify(lignesListe));
    ok('4. Délai d\'affichage des deux impressions sous ' + PLAFOND_PDF_MS + ' ms', pv.delai < PLAFOND_PDF_MS && pl.delai < PLAFOND_PDF_MS, pv.delai + ' / ' + pl.delai + ' ms');
    await puce(vu.p, 'Au comptant');
    const pc = await imprimer(vu, 'printParVente', dossier);
    ok('4. Filtre « Au comptant » respecté par l\'impression : X présente, Y absente', pc.texte.indexOf(refX) >= 0 && pc.texte.indexOf(refY) < 0 && /TYPE :\s+VNO/.test(pc.texte), pc.texte.slice(0, 800));
    await puce(vu.p, 'Toutes');

    /* 5. inventaire des produits des ventes affichees (recherche = reference de X) */
    await chercher(vu.p, refX);
    const inv0 = inventaires();
    const idInv = await vu.p.evaluate(() => Ext.ComponentQuery.query('cloturerventemanager #createInventaire')[0].getId());
    await vu.p.click('#' + idInv);
    /* la fenetre d'attente (« Veuillez patienter ») precede la question */
    await vu.p.locator('.x-message-box:visible', { hasText: 'Confirmez' }).first().waitFor({ timeout: 20000 });
    const question = await vu.p.locator('.x-message-box:visible', { hasText: 'Confirmez' }).first().innerText();
    ok('5. « Créer un inventaire » : 2 produits distincts annoncés pour X (P1 deux fois = une), aucun inventaire avant la confirmation',
      /\b2\b/.test(question) && /ventes en cours/.test(question) && inventaires() === inv0, question);
    await vu.p.locator('.x-message-box:visible .x-btn', { hasText: /^(Oui|Yes)$/ }).first().click();
    await attendre(() => inventaires() !== inv0, 20000);
    await vu.p.waitForTimeout(800);
    const invs = inventaires().split(',').filter(Boolean);
    const produitsInv = invs.length === 1 ? q("SELECT GROUP_CONCAT(lg_FAMILLE_ID ORDER BY lg_FAMILLE_ID) FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID = '" + invs[0] + "'") : '';
    ok('5. Inventaire créé : un seul, avec P1 et P2 une fois chacun (= produits de X en base)',
      invs.length === 1 && produitsInv === [P1.id, P2.id].sort().join(','), invs.join(',') + ' : ' + produitsInv + ' attendu ' + [P1.id, P2.id].sort().join(','));
    await vu.p.locator('.x-message-box:visible .x-btn', { hasText: /^OK$/ }).first().click().catch(() => {});
    ok('5. Bilan : ventes X et Y intactes (statut, montant, lignes)', empreinte(vX) === avantX && empreinte(vY) === avantY, [empreinte(vX), empreinte(vY)].join(' / '));

    /* 6. droits : JS1 sans le droit « voir » ne voit que sa vente interrompue, son impression aussi */
    const js2 = await navigateur('e2e-vec1', MDP); sessions.push(js2);
    await ouvrirOnglet(js2.p);
    const vuJs = await affichees(js2.p);
    const pj = await imprimer(js2, 'printParVente', dossier);
    ok('6. Droits : JS1 voit X seule (pas Y, vente d\'un autre en cours) ; son PDF ne contient pas Y',
      JSON.stringify(vuJs) === JSON.stringify([vX + '/Au comptant']) && pj.texte.indexOf(refX) >= 0 && pj.texte.indexOf(refY) < 0, JSON.stringify(vuJs) + ' ' + pj.url);

    /* 7. onglet « Ventes en attente » : barre active, liste = base (non-regression) */
    await chercher(vu.p, '');
    await vu.p.locator('.x-tab', { hasText: 'Ventes en attente' }).first().click();
    await vu.p.waitForTimeout(800);
    const b7 = await barre(vu.p);
    const n7 = await vu.p.evaluate(() => Ext.ComponentQuery.query('cloturerventemanager gridpanel')[0].getStore().getCount());
    ok('7. Onglet « Ventes en attente » : barre active, X et Y absentes de la liste (elles ne sont pas en attente)', b7.actifs.length === 7
      && !(await vu.p.evaluate((ids) => Ext.ComponentQuery.query('cloturerventemanager gridpanel')[0].getStore().getRange().some((r) => ids.includes(r.get('lgPREENREGISTREMENTID'))), ventes)), JSON.stringify(b7) + ' ' + n7);

    /* 8. ergonomie de l'ecran complet */
    await vu.p.locator('.x-tab', { hasText: 'Ventes en cours et interrompues' }).first().click();
    await chargee(vu.p);
    for (const [l, h] of [[1280, 600], [1366, 768], [1920, 1080]]) {
      await vu.p.setViewportSize({ width: l, height: h });
      await vu.p.waitForTimeout(800);
      const b8 = await barre(vu.p);
      const g = await vu.p.evaluate(() => { const v = Ext.ComponentQuery.query('cloturerventemanager ventesencourssaisie')[0];
        const grille = v.down('#vcsGrille'), corps = grille.getView().getEl().dom, rc = corps.getBoundingClientRect();
        const onglet = document.querySelector('.x-tab-active'), ro = onglet.getBoundingClientRect();
        return { cx: rc.left + rc.width / 2, cy: rc.top + Math.min(rc.height / 2, 40), bas: rc.bottom <= window.innerHeight + 1 && rc.height > 30,
          onglet: ro.top >= 0 && ro.bottom <= window.innerHeight, n: v.ventes.getCount() }; });
      await vu.p.mouse.move(g.cx, g.cy);
      for (let i = 0; i < 15; i++) { await vu.p.mouse.wheel(0, 400); await vu.p.waitForTimeout(40); }
      await vu.p.waitForTimeout(300);
      const fin = await vu.p.evaluate(() => { const v = Ext.ComponentQuery.query('cloturerventemanager ventesencourssaisie')[0];
        const grille = v.down('#vcsGrille'), vue = grille.getView(), corps = vue.getEl().dom, rc = corps.getBoundingClientRect();
        const n = v.ventes.getCount(), der = n ? vue.getNode(n - 1) : null, rd = der ? der.getBoundingClientRect() : null;
        const type = grille.down('#vcsColType').getEl().dom.getBoundingClientRect();
        /* bouton de reprise (X, reprenable par l'administrateur) entier dans le tableau, sans defilement de cote */
        const bt = corps.querySelector('.vcs-reprendre'), rb = bt ? bt.getBoundingClientRect() : null;
        return { derniere: !der || (rd.bottom <= rc.bottom + 1 && rd.top >= rc.top - 1), type: type.width > 50,
          reprise: !!rb && rb.width > 0 && rb.left >= rc.left && rb.right <= rc.right + 1,
          defilementH: corps.scrollWidth > corps.clientWidth + 2, larg: [corps.clientWidth, corps.scrollWidth] }; });
      ok(`8. ${l}×${h} : barre entière (7 éléments actifs et non recouverts), onglet visible, tableau jusqu'à sa dernière ligne sans défilement de côté, colonne « Type » et bouton de reprise entiers`,
        b8.nonRecouverts.length === 7 && b8.actifs.length === 7 && g.onglet && g.bas && fin.derniere && fin.type && !fin.defilementH && fin.reprise, JSON.stringify({ b8, g, fin }));
    }
    const erreurs = [].concat(...sessions.map((s) => s.erreurs || []));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (err) {
    ok('Déroulé sans exception', false, err.stack);
  } finally {
    for (const s of sessions) { await Promise.race([s.b.close().catch(() => {}), new Promise((r) => setTimeout(r, 15000))]); }
    nettoyer();
    C.nettoyer();
    ok('Jeu d\'essai retiré (ventes, inventaire, compte, client)', q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + A.liste(ventes) + ")") === '0'
      && inventaires() === '' && q("SELECT COUNT(*) FROM t_user WHERE lg_USER_ID = '" + ID_JS + "'") === '0'
      && q("SELECT COUNT(*) FROM t_client WHERE str_LAST_NAME LIKE '" + MARQUE + "%'") === '0');
  }
  process.exit(C.bilan() ? 1 : 0);
})();
