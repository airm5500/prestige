/* PLAN DU 06/11, POINT 15 : PSCODE (REFERENCE UBIPHARM) SUR LA FICHE ARTICLE.
 *
 * Precision de l'utilisateur (07/11) : le PSCODE est la reference Ubipharm, rangee sur la fiche article (t_famille) comme
 * le code EAN 13, et non dans t_famille_grossiste. Facultatif, en majuscules, 20 caracteres au plus, non unique.
 *
 * Par les ecrans (compte de test ; le produit est remis a l'identique a la fin) :
 *  1. Fiche article > recherche du produit par son CIP > « Modifier » : champ « PSCODE (Ubipharm) » present, vide ;
 *     taper le code en minuscules, « Enregistrer » -> en base en MAJUSCULES dans t_famille.str_PSCODE ; le reste de la
 *     fiche et les codes grossistes (t_famille_grossiste) sont inchanges ;
 *  2. reouverture de « Modifier » : le code est reaffiche ; le remplacer -> nouveau code en base ;
 *  3. recherche de la fiche article par le PSCODE (tape, Entree) : le produit, et lui seul ;
 *  4. ecran de vente : le PSCODE tape dans le champ produit, Entree -> le produit est ajoute a la vente (ligne en base) ;
 *  5. refus du serveur : plus de 20 caracteres, ou un caractere interdit -> message, rien d'ecrit ;
 *  6. effacer le champ, « Enregistrer » -> NULL en base ;
 *  bilan : seule la colonne str_PSCODE du produit a bouge pendant le test (fiche, grossistes).
 * Lancement seul : node src/test/e2e/retours/test-fiche-pscode-0611.js
 */
const C = require('../prix-reference/commun');
const { ok, q, A } = C;

const P = C.produitSansReference(17);
const CIP = C.cip(P);
const COLONNE = q("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 't_famille' AND column_name = 'str_PSCODE'") === '1';
const psCode = () => (COLONNE ? q("SELECT IFNULL(str_PSCODE, 'NULL') FROM t_famille WHERE lg_FAMILLE_ID = '" + P.id + "'") : 'colonne absente');
const RESTE = "CONCAT_WS('|', str_NAME, str_DESCRIPTION, int_CIP, int_PRICE, int_PAF, IFNULL(int_EAN13, ''), IFNULL(code_ean_fabriquant, ''), IFNULL(str_CODE_GEO_ARTICLE, ''), lg_ZONE_GEO_ID, lg_GROSSISTE_ID, str_STATUT)";
const reste = () => q("SELECT " + RESTE + " FROM t_famille WHERE lg_FAMILLE_ID = '" + P.id + "'");
const grossistes = () => q("SELECT IFNULL(GROUP_CONCAT(CONCAT_WS('/', lg_GROSSISTE_ID, IFNULL(str_CODE_ARTICLE, ''), str_STATUT) ORDER BY lg_GROSSISTE_ID SEPARATOR ' ; '), 'aucun') FROM t_famille_grossiste WHERE lg_FAMILLE_ID = '" + P.id + "'");
const SUFFIXE = String(process.pid).slice(-5);
const CODE1 = 'zze2e' + SUFFIXE, CODE2 = 'ZZE2E-B' + SUFFIXE;

(async () => {
  const origine = psCode();
  const resteAvant = reste(), grossistesAvant = grossistes();
  const sess = await C.connecterEtOuvrirVente();
  const { p } = sess;
  const rechercherFiche = async (texte) => {
    await C.vues.cliquer(p, '#rechecher');
    await p.keyboard.press('Control+A');
    await p.keyboard.type(texte, { delay: 20 });
    const rep = p.waitForResponse((r) => /produit-search\/fiche/.test(r.url()), { timeout: 30000 }).catch(() => null);
    await p.keyboard.press('Enter');
    await rep;
    await p.waitForTimeout(1200);
    return p.evaluate(() => Ext.ComponentQuery.query('famillemanager')[0].getStore().getRange().map((r) => r.get('lg_FAMILLE_ID')));
  };
  const ouvrirModifier = async () => {
    const ligne = p.locator('.x-grid-row').filter({ visible: true, hasText: CIP }).first();
    await ligne.waitFor({ timeout: 30000 });
    if (await ligne.locator('.fa-action-edit').count() > 0) {
      await ligne.locator('.fa-action-edit').first().click({ timeout: 10000 });
    } else {
      await ligne.locator('.fa-action-plus').first().click({ timeout: 10000 });
      await p.locator('.x-menu-item').filter({ visible: true, hasText: 'Modifier' }).first().click({ timeout: 10000 });
    }
    await p.waitForFunction(() => { const w = window.winModifArticleOuverte; return w && !w.isDestroyed && w.isVisible() && w.down('#int_CIP') && w.down('#int_CIP').getValue(); }, null, { timeout: 30000 });
    await p.waitForTimeout(1200);
  };
  const champ = () => p.evaluate(() => { const w = window.winModifArticleOuverte; const f = w && w.down('#str_PSCODE');
    return f ? { id: f.inputEl ? f.inputEl.dom.id : null, valeur: f.getValue(), libelle: f.fieldLabel, visible: f.isVisible(true) } : null; });
  const taperDansChamp = async (texte) => {
    const c = await champ();
    await p.click('#' + c.id);
    await p.waitForTimeout(500);
    await p.keyboard.press('Control+A');
    await p.keyboard.press('Backspace');
    if (texte) { await p.keyboard.type(texte, { delay: 25 }); }
  };
  const enregistrer = async () => {
    const id = await p.evaluate(() => window.winModifArticleOuverte.query('button').filter((x) => x.text === 'Enregistrer')[0].getId());
    const rep = p.waitForResponse((r) => /fichearticle\/enregistrer/.test(r.url()), { timeout: 30000 });
    await p.click('#' + id);
    const r = await rep;
    await p.waitForFunction(() => !window.winModifArticleOuverte || window.winModifArticleOuverte.isDestroyed, null, { timeout: 30000 }).catch(() => {});
    await p.waitForTimeout(1200);
    return r.json().catch(() => ({}));
  };
  try {
    ok('Préparation : colonne t_famille.str_PSCODE présente, produit sans PSCODE', COLONNE && origine === 'NULL', origine);

    /* 1. fiche article : saisir */
    await C.ouvrirEcran(p, 'famillemanager');
    await p.waitForFunction(() => Ext.getCmp('rechecher') && Ext.getCmp('rechecher').isVisible(true), null, { timeout: 60000 });
    await rechercherFiche(CIP);
    await ouvrirModifier();
    const c1 = await champ();
    ok('1. « Modifier » : champ « PSCODE (Ubipharm) » présent, visible, vide', c1 && c1.visible && /PSCODE/.test(c1.libelle) && !c1.valeur, JSON.stringify(c1));
    await taperDansChamp(CODE1);
    const r1 = await enregistrer();
    ok('1. Tapé en minuscules, « Enregistrer » : enregistré en majuscules dans t_famille.str_PSCODE', psCode() === CODE1.toUpperCase(), psCode() + ' ' + JSON.stringify(r1));
    ok('1. Le reste de la fiche et les codes grossistes sont inchangés', reste() === resteAvant && grossistes() === grossistesAvant, reste() + ' || ' + grossistes());

    /* 2. relecture et remplacement */
    await ouvrirModifier();
    const c2 = await champ();
    ok('2. Réouverture : le PSCODE est réaffiché', c2 && c2.valeur === CODE1.toUpperCase(), JSON.stringify(c2));
    await taperDansChamp(CODE2);
    await enregistrer();
    ok('2. Remplacé : nouveau PSCODE en base', psCode() === CODE2, psCode());

    /* 3. recherche de la fiche par le PSCODE */
    const trouves = await rechercherFiche(CODE2);
    ok('3. Recherche de la fiche article par le PSCODE : le produit, et lui seul', trouves.length === 1 && trouves[0] === P.id, JSON.stringify(trouves));
    const minuscules = await rechercherFiche(CODE2.toLowerCase());
    ok('3. La recherche en minuscules le trouve aussi', minuscules.length === 1 && minuscules[0] === P.id, JSON.stringify(minuscules));

    /* 5. refus du serveur (avant la vente : la fenetre est fermee) */
    const refus = await p.evaluate(async (args) => {
      const envoi = async (code) => { const r = await fetch('../api/v1/fichearticle/enregistrer?mode=update&lg_FAMILLE_ID=' + args.id, { method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'str_PSCODE=' + encodeURIComponent(code) }); return r.json(); };
      return { long: await envoi('A'.repeat(21)), interdit: await envoi('FORT 256!') };
    }, { id: P.id });
    ok('5. Plus de 20 caractères ou caractère interdit : refusé avec un message, rien n\'est écrit',
      /PSCODE/.test(refus.long.errors) && /PSCODE/.test(refus.interdit.errors) && psCode() === CODE2, JSON.stringify(refus));

    /* 4. ecran de vente : le PSCODE dans le champ produit */
    await C.nouvelleVente(p);
    await C.taperArticle(p, CODE2);
    const vente = await C.venteCourante(p);
    C.noterVente(vente);
    const lignes = vente ? q("SELECT IFNULL(GROUP_CONCAT(lg_FAMILLE_ID), 'aucune') FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + vente + "'") : 'pas de vente';
    ok('4. Écran de vente : le PSCODE tapé dans le champ produit puis Entrée ajoute le produit à la vente', lignes === P.id, lignes);

    /* 6. effacer */
    await C.ouvrirEcran(p, 'famillemanager');
    await p.waitForFunction(() => Ext.getCmp('rechecher') && Ext.getCmp('rechecher').isVisible(true), null, { timeout: 60000 });
    await rechercherFiche(CIP);
    await ouvrirModifier();
    await taperDansChamp('');
    await enregistrer();
    ok('6. Champ vidé, « Enregistrer » : NULL en base', psCode() === 'NULL', psCode());
    ok('Bilan : seule la colonne PSCODE a bougé (reste de la fiche et codes grossistes identiques)', reste() === resteAvant && grossistes() === grossistesAvant, reste() + ' || ' + grossistes());
    ok('Aucune erreur JavaScript', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack + ' ' + sess.erreurs.join(' | '));
  } finally {
    if (COLONNE) { C.exec("UPDATE t_famille SET str_PSCODE = " + (origine === 'NULL' ? 'NULL' : "'" + origine + "'") + " WHERE lg_FAMILLE_ID = '" + P.id + "'"); }
    C.noterVente(await C.venteCourante(p).catch(() => null));
    await sess.b.close().catch(() => {});
    C.nettoyer();
    ok('Produit remis à l\'identique', (!COLONNE || psCode() === origine) && reste() === resteAvant, psCode() + ' ' + reste());
    process.exit(A.bilan() ? 1 : 0);
  }
})();
