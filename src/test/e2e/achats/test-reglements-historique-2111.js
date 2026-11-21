/* ETAT DE CONTROLE DES ACHATS, « REGLEMENTS FOURNISSEURS » > « HISTORIQUE » : LA SELECTION SURVIT AU RETOUR (plan du
 * 21/11, point 1).
 *
 * Defaut signale : on choisit un grossiste puis un reglement, sa repartition s'affiche en bas ; on change de sous-onglet
 * puis on revient : le bas dit « Sélectionnez un règlement… » alors que la ligne parait toujours choisie, et un nouveau
 * clic sur elle n'affiche plus rien ; un message rouge « Choisissez le grossiste du relevé » reste affiche alors que le
 * grossiste est choisi.
 *
 * Vrai chemin : menu GESTION DES COMMANDES > « Etat de contrôle Achats », bouton « Règlements fournisseurs ».
 * Donnees : deux reglements par cheque (aucun mouvement de caisse) sur des BL differents d'un meme grossiste, crees par
 * l'onglet « Saisir » de l'ecran (meme chemin que l'utilisateur), retires a la fin avec les BL remis.
 *  1. « Relevé » sans grossiste : message rouge ; le grossiste choisi ensuite, le message disparait ;
 *  2. clic sur R1 : repartition de R1 = base ; clic sur R2 : repartition de R2 = base (montants differents) ;
 *  3. sous-onglet « À régler » puis retour : grossiste toujours choisi (valeur, pas seulement le texte), R2 toujours
 *     choisi et sa repartition affichee = base ;
 *  4. nouveau clic sur R2 : repartition affichee ; clic sur R1 : repartition de R1 ;
 *  5. bouton du haut « Liste des BL » puis retour sur « Règlements fournisseurs » : meme chose ;
 *  6. « Saisir » : deux BL coches, sous-onglet « Historique » puis retour : les memes BL coches, l'apercu « Part du
 *     règlement » ne porte que sur eux (somme = montant saisi) ;
 *  7. bilan : aucun reglement, aucune part, aucun BL modifie par les seules navigations.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer, saisir } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const DB = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', DB, '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\r/g, '').trim();
const LOGIN = ENV_E2E.LOGIN;
const ADMIN = q(`SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${LOGIN}'`);
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
const DEPART0 = q("SELECT IFNULL((SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_REGLEMENT_FRS_DATE_DEPART'), '∅')");
const CAISSE0 = q("SELECT IFNULL((SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_REGLEMENT_FRS_SORTIE_CAISSE'), '∅')");
const DEPART = '2026-10-01';
const MARQUE = 'E2E-RFH-2111';
const jj = (iso) => iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4);
const parametre = (cle, v) => q(`UPDATE t_parameters SET str_VALUE = '${v}' WHERE str_KEY = '${cle}'`);

/* grossiste avec au moins 4 BL clos depuis le depart, TTC > 5 000, sans reglement */
const G = q(`SELECT o.lg_GROSSISTE_ID FROM t_bon_livraison b JOIN t_order o ON o.lg_ORDER_ID = b.lg_ORDER_ID
  WHERE b.str_STATUT = 'is_Closed' AND b.dt_DATE_LIVRAISON >= '${DEPART}' AND b.int_HTTC > 5000
  GROUP BY o.lg_GROSSISTE_ID HAVING COUNT(*) >= 4 AND SUM(IFNULL(b.int_MONTANT_REGLE, 0)) = 0 ORDER BY COUNT(*) LIMIT 1`);
const NOM_G = G && q(`SELECT str_LIBELLE FROM t_grossiste WHERE lg_GROSSISTE_ID = '${G}'`);
const COLS = 'b.lg_BON_LIVRAISON_ID, b.str_REF_LIVRAISON, IFNULL(b.int_HTTC, 0), IFNULL(b.int_MONTANT_REGLE, -1), IFNULL(b.int_MONTANT_RESTANT, -1), IFNULL(b.STATUS, \'∅\'), IFNULL(b.dt_REGLEMENT_DATE, \'∅\'), IFNULL((SELECT m.montantRestant FROM MvtTransaction m WHERE m.pkey = b.lg_BON_LIVRAISON_ID AND m.typeTransaction = 2 LIMIT 1), \'∅\')';
const bls = () => q(`SELECT CONCAT_WS('#', ${COLS}) FROM t_bon_livraison b JOIN t_order o ON o.lg_ORDER_ID = b.lg_ORDER_ID
  WHERE o.lg_GROSSISTE_ID = '${G}' AND b.str_STATUT = 'is_Closed' AND b.dt_DATE_LIVRAISON >= '${DEPART}' ORDER BY b.dt_DATE_LIVRAISON, b.lg_BON_LIVRAISON_ID`)
  .split('\n').filter(Boolean).map((l) => { const [id, numero, ttc, regle, restant, statut, regleLe, mvtRestant] = l.split('#');
    return { id, numero, ttc: +ttc, regle: +regle, restant: +restant, statut, regleLe, mvtRestant }; });
const empreinteBls = () => q(`SELECT MD5(GROUP_CONCAT(CONCAT_WS('#', lg_BON_LIVRAISON_ID, IFNULL(int_MONTANT_REGLE, '∅'), IFNULL(int_MONTANT_RESTANT, '∅'), IFNULL(STATUS, '∅'), IFNULL(dt_REGLEMENT_DATE, '∅')) ORDER BY lg_BON_LIVRAISON_ID)) FROM t_bon_livraison`);
const compte = (sql) => +q(`SELECT COUNT(*) FROM ${sql}`);
const partsBase = (id) => q(`SELECT GROUP_CONCAT(CONCAT(bl_id, '#', montant) ORDER BY bl_id) FROM reglement_fournisseur_bl WHERE reglement_id = '${id}'`);

(async () => {
  ok('Précondition : un grossiste avec au moins 4 BL clos depuis le 01/10/2026, aucun réglé', !!G, NOM_G);
  if (!G) { process.exit(1); }
  const B0 = bls();
  const empreinte0 = empreinteBls();
  parametre('KEY_REGLEMENT_FRS_DATE_DEPART', DEPART);
  parametre('KEY_REGLEMENT_FRS_SORTIE_CAISSE', '0');
  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } });
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  let etape = 'connexion';
  try {
    await connexion(p, LOGIN, 'e2etest');
    const etat = (sel) => p.evaluate((s) => { const c = Ext.ComponentQuery.query(s)[0]; return c ? { visible: c.isVisible(true), texte: (c.getText ? c.getText() : (c.text || '')).replace(/<[^>]+>/g, ''), valeur: c.getValue ? c.getValue() : null, brut: c.getRawValue ? c.getRawValue() : null } : null; }, sel);
    const attendreStore = (grille) => p.waitForFunction((g) => { const c = Ext.ComponentQuery.query(g)[0]; return c && c.isVisible(true) && !c.getStore().isLoading(); }, grille, { timeout: 60000 }).then(() => p.waitForTimeout(400));
    const sousOnglet = async (id) => { await p.click('#' + await p.evaluate((i) => Ext.ComponentQuery.query('#' + i)[0].tab.getId(), id)); };
    const partsEcran = () => p.evaluate(() => Ext.ComponentQuery.query('#rfParts')[0].getStore().getRange().map((r) => r.get('blId') + '#' + r.get('montant')).sort().join(','));
    const choisi = () => p.evaluate(() => { const r = Ext.ComponentQuery.query('#rfReglements')[0].getSelectionModel().getSelection()[0]; return r ? r.get('reference') : null; });
    const ligne = async (grille, texte) => p.locator('#' + await p.evaluate((g) => Ext.ComponentQuery.query(g)[0].getView().getId(), grille) + ' .x-grid-row').filter({ hasText: texte }).first();
    const enregistrer = async () => {
      await cliquer(p, '#rfEnregistrer');
      await p.waitForTimeout(600);
      await cliquer(p, '#rfEnregistrer');
      await p.waitForFunction(() => { const t = Ext.ComponentQuery.query('#rfMessage')[0].text || ''; return t && t.indexOf('Enregistrement') < 0; }, null, { timeout: 60000 });
      return (await etat('#rfMessage')).texte;
    };

    etape = 'menu';
    await ouvrirMenu(p, 'GESTION DES COMMANDES', 'Etat de contrôle Achats');
    await p.mouse.move(1200, 700);
    await p.waitForFunction(() => Ext.ComponentQuery.query('controleachats').some((c) => c.isVisible(true)), null, { timeout: 90000 });
    await cliquer(p, 'controleachats button[itemId=ca-reglements]');
    await attendreStore('#rfARegler');

    /* donnees : deux reglements par cheque, saisis par l'ecran */
    etape = 'donnees';
    const [b1, b2, b3, b4] = B0;
    await (await ligne('#rfARegler', NOM_G)).dblclick();
    await attendreStore('#rfSaisir');
    const reglements = [];
    for (const [x, montant, ref] of [[b1, b1.ttc, MARQUE + '-1'], [b2, Math.floor(b2.ttc / 2), MARQUE + '-2']]) {
      await (await ligne('#rfSaisir', x.numero)).locator('.x-grid-row-checker').click();
      await saisir(p, '#rfMontant', String(montant));
      await p.evaluate(() => { Ext.ComponentQuery.query('#rfMode')[0].setValue('CHEQUE'); });
      await saisir(p, '#rfReference', ref);
      const m = await enregistrer();
      const id = q(`SELECT id FROM reglement_fournisseur WHERE reference_paiement = '${ref}'`);
      reglements.push({ id, ref: q(`SELECT reference FROM reglement_fournisseur WHERE id = '${id}'`), parts: partsBase(id) });
      await attendreStore('#rfSaisir');
      ok('Données : règlement ' + ref + ' enregistré par l\'écran (chèque, 1 BL)', /enregistré/.test(m) && !!id, m);
    }
    const [R1, R2] = reglements;
    const marqueCaisse = compte(`t_mvt_caisse WHERE lg_USER_ID = '${ADMIN}' AND dt_CREATED >= '${DEBUT}'`);
    ok('Données : aucun mouvement de caisse (chèque)', marqueCaisse === 0, marqueCaisse);

    /* 1. message du releve sans grossiste, puis grossiste choisi */
    etape = 'historique';
    await sousOnglet('rfHistorique');
    await attendreStore('#rfReglements');
    await saisir(p, '#rfDu', jj(DEPART));
    await cliquer(p, '#rfReleve');
    await p.locator('.x-menu-item').filter({ hasText: 'Excel' }).filter({ visible: true }).first().click();
    const msg0 = (await etat('#rfHistoMessage')).texte;
    ok('Relevé sans grossiste : « Choisissez le grossiste du relevé. »', msg0 === 'Choisissez le grossiste du relevé.', msg0);
    await p.keyboard.press('Escape');
    const champ = await p.evaluate(() => Ext.ComponentQuery.query('#rfHistoGrossiste')[0].inputEl.id);
    await p.click('#' + champ);
    await p.keyboard.type(NOM_G.slice(0, 8), { delay: 60 });
    const item = p.locator('.x-boundlist-item').filter({ hasText: NOM_G }).filter({ visible: true }).first();
    await item.waitFor({ timeout: 30000 });
    await item.click();
    await attendreStore('#rfReglements');
    const g1 = await etat('#rfHistoGrossiste');
    const msg1 = (await etat('#rfHistoMessage')).texte;
    ok('Grossiste choisi dans la liste : valeur = ' + NOM_G, g1.valeur === G && g1.brut === NOM_G, JSON.stringify(g1));
    ok('Grossiste choisi : le message « Choisissez le grossiste du relevé » disparaît', msg1 === '', msg1);

    /* 2. clics R1 puis R2 */
    await (await ligne('#rfReglements', R1.ref)).click();
    await p.waitForTimeout(300);
    const p1 = await partsEcran();
    ok('Clic sur R1 : répartition affichée = base', p1 === R1.parts, p1 + ' / ' + R1.parts);
    await (await ligne('#rfReglements', R2.ref)).click();
    await p.waitForTimeout(300);
    const p2 = await partsEcran();
    ok('Clic sur R2 : répartition affichée = base (autre BL, autre montant)', p2 === R2.parts && p2 !== p1, p2 + ' / ' + R2.parts);

    /* 3. sous-onglet « À régler » puis retour */
    etape = 'retour sous-onglet';
    await sousOnglet('rfARegler');
    await attendreStore('#rfARegler');
    await sousOnglet('rfHistorique');
    await attendreStore('#rfReglements');
    const g3 = await etat('#rfHistoGrossiste');
    ok('Retour sur Historique : grossiste toujours choisi (valeur et texte)', g3.valeur === G && g3.brut === NOM_G, JSON.stringify(g3));
    const c3 = await choisi(), p3 = await partsEcran();
    ok('Retour sur Historique : R2 toujours choisi et sa répartition affichée = base', c3 === R2.ref && p3 === R2.parts, c3 + ' / ' + p3);
    ok('Retour sur Historique : pas de message rouge', (await etat('#rfHistoMessage')).texte === '', (await etat('#rfHistoMessage')).texte);

    /* 4. nouveaux clics */
    await (await ligne('#rfReglements', R2.ref)).click();
    await p.waitForTimeout(300);
    const p4 = await partsEcran();
    ok('Nouveau clic sur R2 : répartition affichée = base', p4 === R2.parts, p4);
    await (await ligne('#rfReglements', R1.ref)).click();
    await p.waitForTimeout(300);
    const p4b = await partsEcran();
    ok('Clic sur R1 ensuite : répartition de R1 = base', p4b === R1.parts, p4b);

    /* 5. bouton du haut « Liste des BL » puis retour */
    etape = 'retour onglet du haut';
    await cliquer(p, 'controleachats button[itemId=ca-liste]');
    await p.waitForTimeout(800);
    await cliquer(p, 'controleachats button[itemId=ca-reglements]');
    await attendreStore('#rfReglements');
    const g5 = await etat('#rfHistoGrossiste'), c5 = await choisi(), p5 = await partsEcran();
    ok('Retour par « Règlements fournisseurs » : grossiste, R1 choisi et sa répartition = base', g5.valeur === G && c5 === R1.ref && p5 === R1.parts, JSON.stringify(g5) + ' ' + c5 + ' / ' + p5);
    await (await ligne('#rfReglements', R1.ref)).click();
    await p.waitForTimeout(300);
    ok('Puis nouveau clic sur R1 : répartition affichée = base', (await partsEcran()) === R1.parts, await partsEcran());

    /* 6. Saisir : coches conservees au retour */
    etape = 'saisir';
    await sousOnglet('rfSaisir');
    await attendreStore('#rfSaisir');
    for (const x of [b3, b4]) { await (await ligne('#rfSaisir', x.numero)).locator('.x-grid-row-checker').click(); }
    const montant6 = b3.ttc + 500;
    await saisir(p, '#rfMontant', String(montant6));
    const coches = () => p.evaluate(() => Ext.ComponentQuery.query('#rfSaisir')[0].getSelectionModel().getSelection().map((r) => r.get('id')).sort().join(','));
    const apercu = () => p.evaluate(() => Ext.ComponentQuery.query('#rfSaisir')[0].getStore().getRange().filter((r) => r.get('part') > 0).map((r) => r.get('id') + '#' + r.get('part')).join(','));
    const attendu6 = b3.id + '#' + b3.ttc + ',' + b4.id + '#500';
    const a6 = await apercu();
    ok('Saisir : BL3 et BL4 cochés, aperçu sur eux seulement', a6 === attendu6, a6);
    await sousOnglet('rfHistorique');
    await attendreStore('#rfReglements');
    await sousOnglet('rfSaisir');
    await attendreStore('#rfSaisir');
    const c6 = await coches(), a6b = await apercu();
    ok('Retour sur Saisir : les mêmes BL cochés', c6 === [b3.id, b4.id].sort().join(','), c6);
    ok('Retour sur Saisir : aperçu « Part du règlement » sur les BL cochés, somme = montant saisi', a6b === attendu6, a6b);
    await saisir(p, '#rfMontant', '');

    /* 7. bilan des navigations */
    ok('Bilan : 2 règlements et 2 parts (ceux des données), rien d\'autre',
      compte(`reglement_fournisseur WHERE created_at >= '${DEBUT}'`) === 2 && compte(`reglement_fournisseur_bl p JOIN reglement_fournisseur f ON f.id = p.reglement_id WHERE f.created_at >= '${DEBUT}'`) === 2);
    const B7 = bls();
    ok('Bilan : seuls BL1 et BL2 ont changé (les règlements des données), les autres BL identiques', B7.slice(2).every((x, i) => JSON.stringify(x) === JSON.stringify(B0[i + 2])), JSON.stringify(B7.slice(2, 4)));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception (étape ' + etape + ')', false, e.stack);
  } finally {
    await b.close();
    const regs = q(`SELECT GROUP_CONCAT(CONCAT('''', id, '''')) FROM reglement_fournisseur WHERE created_at >= '${DEBUT}' AND user_id = '${ADMIN}'`);
    if (regs && regs !== 'NULL') {
      q(`DELETE FROM reglement_fournisseur_bl WHERE reglement_id IN (${regs})`);
      q(`DELETE FROM reglement_fournisseur WHERE id IN (${regs})`);
    }
    const nul = (v) => (v === '∅' ? 'NULL' : `'${v}'`);
    for (const x of B0) {
      q(`UPDATE t_bon_livraison SET int_MONTANT_REGLE = ${x.regle < 0 ? 'NULL' : x.regle}, int_MONTANT_RESTANT = ${x.restant < 0 ? 'NULL' : x.restant}, STATUS = ${nul(x.statut)}, dt_REGLEMENT_DATE = ${nul(x.regleLe)} WHERE lg_BON_LIVRAISON_ID = '${x.id}'`);
      q(`UPDATE MvtTransaction SET montantRestant = ${x.mvtRestant === '∅' ? 'NULL' : x.mvtRestant} WHERE pkey = '${x.id}' AND typeTransaction = 2`);
    }
    q(`DELETE FROM t_event_log WHERE dt_CREATED >= '${DEBUT}' AND lg_USER_ID = '${ADMIN}'`);
    parametre('KEY_REGLEMENT_FRS_DATE_DEPART', DEPART0);
    parametre('KEY_REGLEMENT_FRS_SORTIE_CAISSE', CAISSE0);
    ok('Nettoyage : BL remis, règlements, journal et paramètres retirés',
      JSON.stringify(bls()) === JSON.stringify(B0) && empreinteBls() === empreinte0 && compte(`reglement_fournisseur WHERE created_at >= '${DEBUT}'`) === 0
      && q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_REGLEMENT_FRS_DATE_DEPART'") === DEPART0);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
