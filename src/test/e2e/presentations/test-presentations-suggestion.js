/* PRESENTATIONS A L'ESSAI : SUGGESTION OUVERTE (proposition du 04/11, ecran 1).
 *
 * Jeu d'essai : une suggestion de deux lignes (3 boites chacune), retiree a la fin avec les fiches produits remises.
 * Parcours : GESTION DES COMMANDES > Suggestion de reappro., recherche de la reference, icone « Modifier ».
 *  - ecran actuel : inchange (grille d'origine, boutons d'origine), seul le selecteur est ajoute, sans recouvrir
 *    aucun champ ni bouton ;
 *  - A, B, C : les deux lignes, une quantite changee par le champ (A, C) ou par « + » (B) : enregistree en base, total
 *    des boites et montant mis a jour ; quantite remise par le meme chemin ;
 *  - A : panneau produit sans fenetre ; « Exporter CSV » de la variante declenche l'export d'origine ;
 *  - B : groupes par urgence, montant dans le bouton de commande ;
 *  - C : recherche au clavier, Entree vers la quantite, « + » / « − » au clavier, Echap ;
 *  - ergonomie de chaque variante ; retour a l'ecran actuel ; aucune erreur JavaScript, aucune fenetre.
 */
const { chromium } = require('playwright-core');
const C = require('./commun');
const { q, exec, ok } = C;

const SUF = String(Date.now()).slice(-6);
const SID = 'E2E-PS-SUG' + SUF, REF = 'E2EPS' + SUF;
const P = C.produits(2);
const G = P.length ? P[0].g : null;
const D = P.map((x, i) => SID + '-L' + i);

function retirer() {
  exec("DELETE FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID LIKE 'E2E-PS-SUG%';"
    + " DELETE FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID LIKE 'E2E-PS-SUG%';");
  C.remettre('sugg');
}
const qteBase = (i) => Number(q(`SELECT int_NUMBER FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_DETAILS_ID = '${D[i]}'`));

(async () => {
  retirer();
  ok('Précondition : deux produits ordinaires avec un grossiste', P.length === 2 && !!G, JSON.stringify(P.map((x) => x.id)));
  C.sauver('sugg', P.map((x) => x.id));
  exec(`INSERT INTO t_suggestion_order (lg_SUGGESTION_ORDER_ID, str_REF, lg_GROSSISTE_ID, int_NUMBER, dt_CREATED, dt_UPDATED, str_STATUT)`
    + ` VALUES ('${SID}', '${REF}', '${G}', 2, NOW(), NOW(), 'is_Process');`
    + P.map((x, i) => `INSERT INTO t_suggestion_order_details (lg_SUGGESTION_ORDER_DETAILS_ID, lg_SUGGESTION_ORDER_ID, lg_GROSSISTE_ID, lg_FAMILLE_ID, int_NUMBER,`
      + ` int_PRICE, int_PRICE_DETAIL, int_PAF_DETAIL, dt_CREATED, dt_UPDATED, str_STATUT) VALUES ('${D[i]}', '${SID}', '${G}', '${x.id}', 3, ${3 * x.paf},`
      + ` ${x.prix}, ${x.paf}, NOW(), NOW(), 'is_Process');`).join(''));

  let b = null, p = null, erreurs = [];
  try {
    ({ b, p, erreurs } = await C.demarrer(chromium));
    await C.ouvrirDocument(p, 'Suggestion de reappro.', 'i_sugg_manager', 'str_REF', REF, 'Modifier');
    await p.waitForFunction(() => { const g = Ext.getCmp('gridpanelSuggestionID'); return g && g.isVisible(true) && !g.getStore().isLoading() && g.getStore().getCount() === 2; }, null, { timeout: 60000 });
    await p.waitForTimeout(800);

    /* ---------- ecran actuel */
    const actuel = await p.evaluate(() => {
      const sel = document.querySelector('.pp-selecteur'), s = sel.getBoundingClientRect();
      const chevauche = Ext.ComponentQuery.query('suggerercdemanager button, suggerercdemanager field').filter((c) => c.isVisible(true) && c.getEl())
        .filter((c) => { const r = c.getEl().dom.getBoundingClientRect(); return r.width > 0 && !(r.right <= s.left || r.left >= s.right || r.bottom <= s.top || r.top >= s.bottom); })
        .map((c) => c.getId());
      return { on: sel.querySelector('button.on').getAttribute('data-pp-v'), vue: !!document.querySelector('.pp-vue'),
        grille: Ext.getCmp('gridpanelSuggestionID').isVisible(true), csv: Ext.getCmp('btn_export_csv').isVisible(true), chevauche };
    });
    ok('Actuelle : écran d\'origine par défaut (grille et boutons d\'origine, aucune variante)', actuel.on === 'actuel' && !actuel.vue && actuel.grille && actuel.csv, JSON.stringify(actuel));
    ok('Actuelle : le sélecteur ne recouvre aucun champ ni bouton', !actuel.chevauche.length, actuel.chevauche.join(','));
    await C.ENV_E2E.capture(p, 'suggestion-actuelle');

    /* les variantes lisent la page de la grille d'origine : aucune demande de lignes au-dela de sa taille de page */
    const limites = [];
    p.on('request', (r) => { const m = /suggestion\/list\/items\?.*\blimit=(\d+)/.exec(r.url()); if (m) { limites.push(Number(m[1])); } });

    for (const v of ['A', 'B', 'C']) {
      await C.choisirPresentation(p, v);
      const pages = await p.evaluate(() => { const e = document.querySelector('.pp-vue [data-pp-pages]');
        return e ? { t: e.textContent, prec: document.querySelector('.pp-vue [data-pp-page="-1"]').disabled, suiv: document.querySelector('.pp-vue [data-pp-page="1"]').disabled } : null; });
      ok(v + ' : pagination d\'origine affichée (lignes 1–2 sur 2, pas d\'autre page)', pages && pages.t === 'Lignes 1–2 sur 2' && pages.prec && pages.suiv, JSON.stringify(pages));
      if (v === 'B') {
        /* groupes replies (confort) : on les ouvre d'un clic */
        for (let k = 0; k < 3; k++) {
          const replie = await p.$('.pp-vue .pp-groupe[aria-expanded="false"]');
          if (!replie) { break; }
          await replie.click();
          await p.waitForTimeout(200);
        }
      }
      const lignes = await p.evaluate(() => document.querySelectorAll('.pp-vue input[data-pp-qte]').length);
      ok(v + ' : les deux lignes de la suggestion', lignes === 2, lignes);
      const avant = { boites: await C.total(p, 'boites'), montant: await C.total(p, 'montant') };
      ok(v + ' : totaux affichés (6 boîtes)', avant.boites === 6, JSON.stringify(avant));

      if (v === 'B') {
        await p.click(`.pp-vue button[data-pp-pas="1"][data-pp-ligne="${D[0]}"]`);
        await C.attendreCalme(p);
      } else {
        await C.saisirQuantite(p, D[0], 4);
      }
      const apres = { boites: await C.total(p, 'boites'), montant: await C.total(p, 'montant') };
      ok(v + ' : quantité enregistrée en base (3 → 4)', qteBase(0) === 4, qteBase(0));
      ok(v + ' : total des boîtes +1 et montant + PA de la ligne', apres.boites === 7 && apres.montant - avant.montant === P[0].paf,
        JSON.stringify({ avant, apres, paf: P[0].paf }));

      if (v === 'A') {
        await p.click(`.pp-vue tr[data-pp-sel="${D[1]}"] td.des`);
        await p.waitForTimeout(800);
        const cote = await p.evaluate(() => { const c = document.querySelector('.pp-vue .pp-cote h4'); return c ? c.textContent : ''; });
        const nom2 = q(`SELECT str_NAME FROM t_famille WHERE lg_FAMILLE_ID = '${P[1].id}'`);
        ok('A : le panneau produit suit la ligne cliquée, sans fenêtre', cote === nom2 && !(await p.evaluate(() => Ext.WindowManager.getActive() && Ext.WindowManager.getActive().isVisible())), cote);
        const [tele] = await Promise.all([p.waitForEvent('download', { timeout: 20000 }).catch(() => null), p.click('.pp-vue button[data-pp-action="btn_export_csv"]')]);
        ok('A : « Exporter CSV » déclenche l\'export d\'origine', !!tele && /\.csv$/i.test(tele.suggestedFilename()), tele ? tele.suggestedFilename() : 'aucun fichier');
      }
      if (v === 'B') {
        const b2 = await p.evaluate(() => { const g = [...document.querySelectorAll('.pp-vue .pp-groupe')].map((e) => e.textContent.trim());
          const cmd = document.querySelector('.pp-vue [data-pp-action="btn_sugg_commander_pml"]'); return { g, cmd: cmd ? cmd.textContent : null }; });
        ok('B : trois groupes par urgence (rupture, sous le seuil, confort)', b2.g.length === 3 && /rupture/i.test(b2.g[0]) && /seuil/i.test(b2.g[1]) && /Confort/.test(b2.g[2]), b2.g.join(' | '));
        ok('B : le bouton de commande donne le montant', !b2.cmd || /Commander \([\d.]+ F\)/.test(b2.cmd), b2.cmd);
        await p.click(`.pp-vue button[data-pp-pas="-1"][data-pp-ligne="${D[0]}"]`);
        await C.attendreCalme(p);
      } else if (v === 'C') {
        await C.saisirQuantite(p, D[0], 3);
        /* clavier : recherche, Entree vers la quantite, « + » puis « − », Echap */
        await p.click('.pp-vue input[data-pp-filtre]');
        await p.keyboard.type(P[1].cip, { delay: 30 });
        await p.waitForFunction(() => document.querySelectorAll('.pp-vue input[data-pp-qte]').length === 1, null, { timeout: 20000 }).catch(() => {});
        await C.attendreCalme(p);
        const filtrees = await p.evaluate(() => document.querySelectorAll('.pp-vue input[data-pp-qte]').length);
        ok('C : la recherche au clavier filtre les lignes (CIP)', filtrees === 1, filtrees);
        await p.keyboard.press('Enter');
        await p.waitForTimeout(300);
        const focus = await p.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-pp-qte'));
        ok('C : Entrée place le curseur dans la quantité de la ligne', focus === D[1], focus);
        await p.keyboard.press('+');
        await C.attendreCalme(p);
        ok('C : « + » au clavier enregistre la quantité (3 → 4)', qteBase(1) === 4, qteBase(1));
        await p.keyboard.press('-');
        await C.attendreCalme(p);
        ok('C : « − » au clavier la remet (4 → 3)', qteBase(1) === 3, qteBase(1));
        await p.keyboard.press('Escape');
        const retour = await p.evaluate(() => document.activeElement && document.activeElement.hasAttribute('data-pp-filtre'));
        ok('C : Échap revient à la recherche', retour);
        await p.click('.pp-vue input[data-pp-filtre]');
        await p.keyboard.press('Control+A');
        await p.keyboard.press('Backspace');
        await p.waitForFunction(() => document.querySelectorAll('.pp-vue input[data-pp-qte]').length === 2, null, { timeout: 20000 }).catch(() => {});
        await C.attendreCalme(p);
      } else {
        await C.saisirQuantite(p, D[0], 3);
      }
      ok(v + ' : quantité remise par le même chemin (3)', qteBase(0) === 3, qteBase(0));
      ok(v + ' : total des boîtes revenu à 6', (await C.total(p, 'boites')) === 6, await C.total(p, 'boites'));
      const bt = await C.boutonsVariante(p);
      ok(v + ' : actions d\'origine présentes (Exporter CSV, Fermer)', bt.some((t) => /Exporter CSV|Plus/.test(t)) && bt.includes('Fermer'), bt.join(' | '));
      await C.ergonomie(p, 'Suggestion ' + v);
      await C.tete(p, v, 'Suggestion ' + v, 'lg_GROSSISTE_ID');
    }

    ok('Lignes lues page par page, comme la grille d\'origine (limite ≤ 50)', limites.length > 0 && Math.max(...limites) <= 50, JSON.stringify(limites));
    await C.choisirPresentation(p, 'actuel');
    await p.waitForFunction(() => { const g = Ext.getCmp('gridpanelSuggestionID'); return g && g.isVisible(true) && !g.getStore().isLoading() && g.getStore().getCount() === 2; }, null, { timeout: 60000 });
    ok('Retour à l\'écran actuel : grille d\'origine, sans variante', !(await p.$('.pp-vue')));
    ok('Aucune erreur JavaScript ni fenêtre du navigateur', !erreurs.length, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack || e);
    if (p) { await C.ENV_E2E.capture(p, 'exception').catch(() => {}); }
  } finally {
    if (b) { await b.close().catch(() => {}); }
    retirer();
    ok('Données du test retirées', q(`SELECT COUNT(*) FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID LIKE 'E2E-PS-SUG%'`) === '0');
    process.exit(C.bilan());
  }
})();
