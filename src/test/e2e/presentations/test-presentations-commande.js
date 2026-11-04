/* PRESENTATIONS A L'ESSAI : SAISIE DE COMMANDE / BL, COMMANDE OUVERTE (proposition du 04/11, ecran 2).
 *
 * Jeu d'essai : une commande en cours de deux lignes (2 boites chacune), retiree a la fin avec les fiches produits
 * remises. Parcours : GESTION DES COMMANDES > Commande en cours, recherche de la reference, icone « Modifier ».
 *  - ecran actuel : inchange, seul le selecteur est ajoute, sans recouvrir aucun champ ni bouton ;
 *  - A, B, C : quantite changee par le champ (A, C) ou par « + » (B) : enregistree en base par la meme API que la
 *    grille d'origine, total des boites et montant mis a jour ; quantite remise par le meme chemin ;
 *  - A : quatre etapes, l'etape en cours signalee, un seul bouton mis en avant ;
 *  - B : synthese a droite (montant, lignes, boites) et actions rangees dans l'ordre ;
 *  - C : document « papier », total, « Imprimer » ouvre l'edition d'origine de la commande ;
 *  - ergonomie de chaque variante ; retour a l'ecran actuel ; aucune erreur JavaScript, aucune fenetre.
 */
const { chromium } = require('playwright-core');
const C = require('./commun');
const { q, exec, ok } = C;

const SUF = String(Date.now()).slice(-6);
const OID = 'E2E-PS-CMD' + SUF, REF = 'E2EPSC' + SUF;
/* trois produits : deux lignes de depart, le troisieme ajoute par le cadre « Ajout Produit » en variante C */
const P = C.produits(3);
const G = P.length ? P[0].g : null;
const D = P.slice(0, 2).map((x, i) => OID + '-L' + i);
const ADMIN = q(`SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${C.ENV_E2E.LOGIN}'`);

function retirer() {
  exec("DELETE FROM t_order_detail WHERE lg_ORDER_ID LIKE 'E2E-PS-CMD%'; DELETE FROM t_order WHERE lg_ORDER_ID LIKE 'E2E-PS-CMD%';");
  C.remettre('cmd');
}
const qteBase = (i) => Number(q(`SELECT int_NUMBER FROM t_order_detail WHERE lg_ORDERDETAIL_ID = '${D[i]}'`));
const montantBase = () => Number(q(`SELECT SUM(int_PRICE) FROM t_order_detail WHERE lg_ORDER_ID = '${OID}'`));

(async () => {
  retirer();
  ok('Précondition : trois produits ordinaires avec un grossiste', P.length === 3 && !!G && !!ADMIN, JSON.stringify(P.map((x) => x.id)));
  C.sauver('cmd', P.map((x) => x.id));
  exec(`INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)`
    + ` VALUES ('${OID}', '${REF}', 2, '${G}', '${ADMIN}', 'is_Process', NOW(), NOW(), 0, 0, 0);`);
  /* une instruction par ligne : le declencheur de t_order_detail modifie t_famille */
  P.slice(0, 2).forEach((x, i) => exec(`INSERT INTO t_order_detail (lg_ORDERDETAIL_ID, lg_ORDER_ID, lg_FAMILLE_ID, lg_GROSSISTE_ID, int_NUMBER, int_PRICE, int_PAF_DETAIL,`
    + ` int_PRICE_DETAIL, prixAchat, prixUnitaire, str_STATUT, dt_CREATED, dt_UPDATED) VALUES ('${D[i]}', '${OID}', '${x.id}', '${G}', 2, ${2 * x.paf}, ${x.paf},`
    + ` ${x.prix}, ${x.paf}, ${x.prix}, 'is_Process', NOW(), NOW())`));

  let b = null, p = null, erreurs = [];
  try {
    ({ b, p, erreurs } = await C.demarrer(chromium));
    await C.ouvrirDocument(p, 'Commande en cours', 'i_order_manager', 'str_REF_ORDER', REF, 'Modifier');
    await p.waitForFunction(() => { const g = Ext.getCmp('gridpanelID'); return g && g.isVisible(true) && !g.getStore().isLoading() && g.getStore().getCount() === 2; }, null, { timeout: 60000 });
    await p.waitForTimeout(800);

    const actuel = await p.evaluate(() => {
      const sel = document.querySelector('.pp-selecteur'), s = sel.getBoundingClientRect();
      const chevauche = Ext.ComponentQuery.query('ordermanagerlist button, ordermanagerlist field').filter((c) => c.isVisible(true) && c.getEl())
        .filter((c) => { const r = c.getEl().dom.getBoundingClientRect(); return r.width > 0 && !(r.right <= s.left || r.left >= s.right || r.bottom <= s.top || r.top >= s.bottom); })
        .map((c) => c.getId());
      return { on: sel.querySelector('button.on').getAttribute('data-pp-v'), vue: !!document.querySelector('.pp-vue'),
        grille: Ext.getCmp('gridpanelID').isVisible(true), bl: Ext.getCmp('btn_creerbl').isVisible(true), chevauche };
    });
    ok('Actuelle : écran d\'origine par défaut (grille et boutons d\'origine, aucune variante)', actuel.on === 'actuel' && !actuel.vue && actuel.grille && actuel.bl, JSON.stringify(actuel));
    ok('Actuelle : le sélecteur ne recouvre aucun champ ni bouton', !actuel.chevauche.length, actuel.chevauche.join(','));
    ok('Actuelle : cadres du haut d\'origine (titres et habillage inchangés)', !(await p.$('fieldset.pp-tete'))
      && (await p.evaluate(() => [...document.querySelectorAll('.x-fieldset-header-text')].map((e) => e.textContent).join('|'))).includes('Infos Generales'));
    await C.ENV_E2E.capture(p, 'commande-actuelle');

    for (const v of ['A', 'B', 'C']) {
      await C.choisirPresentation(p, v);
      const lignes = await p.evaluate(() => document.querySelectorAll('.pp-vue input[data-pp-qte]').length);
      ok(v + ' : les deux lignes de la commande', lignes === 2, lignes);
      const avant = { boites: await C.total(p, 'boites'), montant: await C.total(p, 'montant') };
      ok(v + ' : totaux affichés (4 boîtes, montant de la base)', avant.boites === 4 && avant.montant === montantBase(), JSON.stringify(avant) + ' base ' + montantBase());

      if (v === 'B') {
        await p.click(`.pp-vue button[data-pp-pas="1"][data-pp-ligne="${D[0]}"]`);
        await C.attendreCalme(p);
      } else {
        await C.saisirQuantite(p, D[0], 3);
      }
      await p.waitForFunction((n) => { const e = document.querySelector('.pp-vue [data-pp-total="boites"]'); return e && Number(e.textContent.replace(/\D/g, '')) === n; }, 5, { timeout: 15000 }).catch(() => {});
      const apres = { boites: await C.total(p, 'boites'), montant: await C.total(p, 'montant') };
      ok(v + ' : quantité enregistrée en base (2 → 3)', qteBase(0) === 3, qteBase(0));
      ok(v + ' : total des boîtes +1, montant = base (+ PA de la ligne)', apres.boites === 5 && apres.montant === montantBase() && apres.montant - avant.montant === P[0].paf,
        JSON.stringify({ avant, apres, base: montantBase(), paf: P[0].paf }));

      if (v === 'A') {
        const et = await p.evaluate(() => ({ n: document.querySelectorAll('.pp-vue .pp-etape').length, cours: (document.querySelector('.pp-vue .pp-etape[aria-current]') || {}).textContent,
          prim: [...document.querySelectorAll('.pp-vue .pp-barre .pp-btn.prim')].map((x) => x.textContent) }));
        ok('A : quatre étapes, l\'étape en cours signalée', et.n === 4 && !!et.cours, JSON.stringify(et));
        ok('A : un seul bouton mis en avant (étape suivante)', et.prim.length === 1, et.prim.join(' | '));
      }
      if (v === 'B') {
        const cote = await p.evaluate(() => { const c = document.querySelector('.pp-vue .pp-cote'); return c ? c.innerText.replace(/\s+/g, ' ') : ''; });
        ok('B : synthèse à droite (montant, lignes, boîtes, disponibilité, à décider)', /Montant de la commande/.test(cote) && /2 lignes/.test(cote) && /Disponibilité/.test(cote) && /À décider/.test(cote), cote.slice(0, 200));
        await p.click(`.pp-vue button[data-pp-pas="-1"][data-pp-ligne="${D[0]}"]`);
        await C.attendreCalme(p);
      } else {
        await C.saisirQuantite(p, D[0], 2);
      }
      if (v === 'C') {
        const papier = await p.evaluate(() => { const e = document.querySelector('.pp-vue .pp-papier h4'); return e ? e.textContent : ''; });
        ok('C : document « Bon de commande » avec la référence', papier.indexOf('E2EPSC') >= 0, papier);
        const [onglet] = await Promise.all([p.context().waitForEvent('page', { timeout: 20000 }).catch(() => null), p.click('.pp-vue button[data-pp-methode="imprimer-commande"]')]);
        const adresse = onglet ? (onglet.url() || '') : '';
        /* EditionCommandeServlet renvoie vers le PDF qu'il vient de produire */
        ok('C : « Imprimer » ouvre l\'édition d\'origine de la commande', /EditionCommandeServlet\?orderId=E2E-PS-CMD|rp_order_items_.*\.pdf$/.test(adresse), adresse);
        if (onglet) { await onglet.close().catch(() => {}); }
      }
      ok(v + ' : quantité remise par le même chemin (2)', qteBase(0) === 2, qteBase(0));
      const bt = await C.boutonsVariante(p);
      ok(v + ' : actions d\'origine présentes (Créer le bon de livraison, Fermer)', bt.some((t) => /Créer le bon de livraison/.test(t)) && bt.includes('Fermer'), bt.join(' | '));
      await C.ergonomie(p, 'Commande ' + v);
      await C.tete(p, v, 'Commande ' + v, 'lgGROSSISTEID');
    }

    /* variante C : un produit ajoute par le cadre d'origine « Ajout Produit » (article, quantite, Entree) */
    await p.click('#str_NAME-inputEl');
    await p.keyboard.press('Control+A');
    await p.keyboard.type(P[2].cip, { delay: 15 });
    await p.waitForFunction(() => { const x = Ext.getCmp('str_NAME'); return x.isExpanded && x.getStore().getCount() > 0 && !x.getStore().isLoading(); }, null, { timeout: 30000 });
    await p.locator('#' + await p.evaluate(() => Ext.getCmp('str_NAME').picker.getId()) + ' .x-boundlist-item').first().click();
    await p.waitForFunction(() => document.activeElement && /int_QUANTITE/.test(document.activeElement.id), null, { timeout: 15000 });
    await p.keyboard.press('Control+A');
    await p.keyboard.type('2');
    await p.keyboard.press('Enter');
    await p.waitForFunction(() => document.querySelectorAll('.pp-vue input[data-pp-qte]').length === 3, null, { timeout: 30000 }).catch(() => {});
    await C.attendreCalme(p);
    const ajout = Number(q(`SELECT IFNULL(SUM(int_NUMBER), 0) FROM t_order_detail WHERE lg_ORDER_ID = '${OID}' AND lg_FAMILLE_ID = '${P[2].id}'`));
    ok('C : produit ajouté par le cadre « Ajout Produit » d\'origine : en base et dans la variante (3 lignes, 6 boîtes)', ajout === 2
      && (await p.evaluate(() => document.querySelectorAll('.pp-vue input[data-pp-qte]').length)) === 3 && (await C.total(p, 'boites')) === 6,
      JSON.stringify({ ajout, boites: await C.total(p, 'boites') }));

    await C.choisirPresentation(p, 'actuel');
    await p.waitForFunction(() => { const g = Ext.getCmp('gridpanelID'); return g && g.isVisible(true) && !g.getStore().isLoading() && g.getStore().getCount() === 3; }, null, { timeout: 60000 });
    ok('Retour à l\'écran actuel : cadres du haut rendus à l\'identique', !(await p.$('fieldset.pp-tete'))
      && (await p.evaluate(() => [...document.querySelectorAll('.x-fieldset-header-text')].map((e) => e.textContent).join('|'))).includes('Infos Generales'));
    ok('Retour à l\'écran actuel : grille d\'origine, sans variante', !(await p.$('.pp-vue')));
    ok('Aucune erreur JavaScript ni fenêtre du navigateur', !erreurs.length, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack || e);
    if (p) { await C.ENV_E2E.capture(p, 'exception').catch(() => {}); }
  } finally {
    if (b) { await b.close().catch(() => {}); }
    retirer();
    ok('Données du test retirées', q(`SELECT COUNT(*) FROM t_order WHERE lg_ORDER_ID LIKE 'E2E-PS-CMD%'`) === '0');
    process.exit(C.bilan());
  }
})();
