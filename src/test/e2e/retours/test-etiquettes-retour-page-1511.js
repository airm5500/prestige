/* RETOURS DU 15/11 sur Étiquettage Pro (aperçu « Impression Prestige ») :
 *  - « le bouton Générer le PDF est grisé après qu'on a cliqué dessus, quand on ferme la page du PDF généré » : le
 *    panier est soldé par l'impression, il ne reste rien à imprimer ; le bouton le dit (« ✔ Planche générée ») au lieu
 *    d'un gris muet ;
 *  - « au clic sur le tableau de début de position il ne réagit pas » : la case choisie est encadrée et le résumé dit
 *    « Départ : position N (ligne L, colonne C) » ;
 *  - « après édition on doit revenir à la page précédente qui a conduit à Étiquettage Pro ».
 *
 * Vrai chemin : menu de la gestion des étiquettes, « Creer » (fenêtre), « Imprimer », « Oui » ; l'aperçu s'ouvre ;
 * clic sur la case 7 de la planche ; « Générer le PDF » (vrai onglet ouvert puis fermé) ; retour à la liste.
 * Puis ouverture directe par le menu Étiquettage Pro (aucune page d'origine) : on reste, le bouton dit pourquoi il est
 * grisé.
 * Contrôles : rapprochement position cliquée = champ = résumé = case encadrée = adresse du PDF ; bilan : seules les
 * étiquettes d'essai quittent le panier ; aucune erreur JavaScript. Données d'essai retirées, panier d'origine remis.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer } = require('../outils/vues');

const res = [];
function ok(n, c, d) { res.push(!!c); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN'], { input: s, encoding: 'utf8' }).replace(/\r/g, '').trim();
const M = 'E2E-RET15';
const PANIER_AVANT = q("SELECT IFNULL(GROUP_CONCAT(CONCAT('''', lg_ETIQUETTE_ID, '''')), '''-''') FROM t_etiquette WHERE str_STATUT = 'is_Process'");
const PROD = q("SELECT f.lg_FAMILLE_ID FROM t_famille f WHERE f.str_STATUT = 'enable' AND f.int_CIP REGEXP '^[0-9]{7}$' ORDER BY f.str_NAME LIMIT 2 OFFSET 5").split('\n');
const statuts = () => q(`SELECT IFNULL(GROUP_CONCAT(CONCAT(lg_ETIQUETTE_ID, ':', str_STATUT) ORDER BY lg_ETIQUETTE_ID), '') FROM t_etiquette WHERE lg_ETIQUETTE_ID LIKE '${M}%'`);
const autres = () => q(`SELECT COUNT(*) FROM t_etiquette WHERE lg_ETIQUETTE_ID NOT LIKE '${M}%' AND str_STATUT = 'is_Process'`);
/* panier d'essai : 2 + 1 etiquettes (quantites differentes) */
function remplir(suffixe) {
  q(`INSERT INTO t_etiquette (lg_ETIQUETTE_ID, str_CODE, str_NAME, str_STATUT, int_NUMBER, dt_CREATED, dt_UPDATED, lg_TYPEETIQUETTE_ID, lg_FAMILLE_ID, lg_EMPLACEMENT_ID) VALUES`
    + ` ('${M}-${suffixe}1', '${M}', 'E2E', 'is_Process', '2', NOW(), NOW(), '2', '${PROD[0]}', '1'),`
    + ` ('${M}-${suffixe}2', '${M}', 'E2E', 'is_Process', '1', NOW(), NOW(), '2', '${PROD[1]}', '1');`);
}
function nettoyer() {
  q(`DELETE FROM t_etiquette WHERE lg_ETIQUETTE_ID LIKE '${M}%'; UPDATE t_etiquette SET str_STATUT = 'is_Process' WHERE lg_ETIQUETTE_ID IN (${PANIER_AVANT});`);
}

(async () => {
  ok('Préconditions : deux produits d\'essai', PROD.length === 2 && PROD.every(Boolean), PROD.join(','));
  nettoyer();
  q(`UPDATE t_etiquette SET str_STATUT = 'e2e_attente' WHERE lg_ETIQUETTE_ID IN (${PANIER_AVANT});`);
  remplir('A');
  const b = await ENV_E2E.lancer(chromium);
  const erreurs = [];
  try {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => erreurs.push(e.message));
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const lib = await p.evaluate(() => { const n = Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().findChild('id', 'etiquette', true);
      return n ? [n.parentNode.get('text'), n.get('text')] : null; });
    if (!lib) { throw new Error('menu etiquette absent pour ce compte'); }
    await ouvrirMenu(p, lib[0], lib[1]);
    await p.waitForFunction(() => Ext.ComponentQuery.query('etiquette').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await p.waitForTimeout(2000);
    const titreListe = await p.evaluate(() => Ext.ComponentQuery.query('etiquette')[0].titre || '');
    await cliquer(p, 'etiquette button[text=Creer]');
    await p.waitForFunction(() => Ext.getCmp('gridpanelID') && !Ext.getCmp('gridpanelID').getStore().isLoading(), null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    await cliquer(p, 'doEtiquette button[text=Imprimer]');
    await p.waitForFunction(() => Ext.MessageBox.isVisible(), null, { timeout: 10000 });
    await p.evaluate(() => { Ext.MessageBox.msgButtons.yes.btnEl.dom.setAttribute('data-e2e', 'oui'); });
    await p.click('[data-e2e=oui]');
    const pret = () => p.waitForFunction(() => { const v = Ext.ComponentQuery.query('etqimpression')[0]; return v && v.isVisible(true) && v.etat && !v.getEl().isMasked(); }, null, { timeout: 20000 });
    await pret();
    await p.waitForTimeout(1200);
    const etat = () => p.evaluate(() => { const v = Ext.ComponentQuery.query('etqimpression')[0], bt = v.down('#impPdf'), r = Ext.ComponentQuery.query('etiquetagepro #retourCommande')[0];
      const encadree = Array.from(v.getEl().dom.querySelectorAll('.etqp-case')).filter((c) => /solid/.test(c.style.outline || '')).map((c) => c.getAttribute('data-position'));
      return { source: v.source(), total: v.etat.total, position: v.down('#impPosition').getValue(), pdf: { grise: bt.isDisabled(), texte: bt.getText() },
        resume: v.down('#impResume').getEl().dom.innerText.replace(/\s+/g, ' ').trim(), encadree, retour: r && r.isVisible(true) ? r.getText() : null }; });
    const e0 = await etat();
    ok('Imprimer depuis la gestion des étiquettes : aperçu ouvert sur le panier (' + e0.total + ' étiquettes)', e0.source === 'PANIER' && e0.total >= 3, JSON.stringify(e0));
    ok('Bouton « Retour à (page d’origine) » visible', e0.retour === 'Retour à ' + titreListe, e0.retour + ' / ' + titreListe);

    /* 1. clic reel sur la case 7 */
    await p.locator('.etqp-case[data-position="7"]').click();
    await p.waitForTimeout(600);
    const e1 = await etat();
    ok('Clic sur la case 7 : champ = 7, case 7 encadrée (seule), résumé « Départ : position 7 (ligne 2, colonne 2) »',
      e1.position === 7 && e1.encadree.join() === '7' && /Départ : position 7 \(ligne 2, colonne 2\)/.test(e1.resume), JSON.stringify(e1));
    await p.locator('.etqp-case[data-position="13"]').click();
    await p.waitForTimeout(600);
    const e2 = await etat();
    ok('Clic sur la case 13 : champ = 13, case 13 encadrée, ligne 3 colonne 3', e2.position === 13 && e2.encadree.join() === '13' && /position 13 \(ligne 3, colonne 3\)/.test(e2.resume), JSON.stringify(e2));
    await p.locator('.etqp-case[data-position="7"]').click();
    await p.waitForTimeout(600);

    /* 2. PDF : vrai onglet ouvert, puis ferme ; retour a la liste */
    const [onglet] = await Promise.all([ctx.waitForEvent('page', { timeout: 15000 }), p.click('text=Générer le PDF')]);
    const url = onglet.url();
    await onglet.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
    await p.waitForTimeout(1500);
    await onglet.close();
    ok('PDF : moteur de Prestige, panier, position 7 (rapprochement case → adresse)', /Etiquete\?/.test(url) && /etiquettes=EN_PREPARATION/.test(url) && /int_NUMBER=7(&|$)/.test(url), url.replace(/^.*\/prestige/, ''));
    const revenu = await p.waitForFunction(() => Ext.ComponentQuery.query('etiquette').some((x) => x.isVisible(true)) && Ext.ComponentQuery.query('etiquetagepro').length === 0, null, { timeout: 10000 })
      .then(() => true).catch(() => false);
    ok('Après le PDF : retour à la page d\'origine (liste des étiquettes), Étiquettage Pro fermé', revenu,
      await p.evaluate(() => Ext.ComponentQuery.query('etiquetagepro').length + ' écran(s) Étiquettage Pro ; titre : ' + document.title));
    const s1 = statuts();
    ok('Bilan : les 2 étiquettes d\'essai ont quitté le panier ; les autres paniers sont intacts (aucun)', !/is_Process/.test(s1) && s1.split(',').length === 2 && autres() === '0', s1);

    /* 3. ouverture directe par le menu : pas de page d'origine, on reste ; le bouton dit pourquoi il est grise */
    remplir('B');
    await ouvrirMenu(p, 'GESTION DU STOCK', 'Étiquettage Pro');
    await p.waitForFunction(() => { const x = Ext.ComponentQuery.query('etiquetagepro')[0]; return x && x.isVisible(true); }, null, { timeout: 30000 });
    await p.waitForTimeout(1000);
    await cliquer(p, 'etiquetagepro #outilImpression');
    await pret();
    await p.waitForTimeout(1000);
    const d0 = await etat();
    ok('Ouverture directe : aperçu du panier (3 étiquettes), pas de bouton de retour, « Générer le PDF » actif', d0.total === 3 && d0.retour === null && !d0.pdf.grise && d0.pdf.texte === 'Générer le PDF', JSON.stringify(d0));
    const [onglet2] = await Promise.all([ctx.waitForEvent('page', { timeout: 15000 }), p.click('text=Générer le PDF')]);
    await onglet2.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
    await p.waitForTimeout(1000);
    await onglet2.close();
    await p.waitForFunction(() => { const v = Ext.ComponentQuery.query('etqimpression')[0]; return v && v.etat && v.etat.total === 0; }, null, { timeout: 15000 }).catch(() => {});
    await p.waitForTimeout(500);
    const d1 = await etat();
    ok('Après le PDF (ouverture directe) : on reste ; bouton grisé « ✔ Planche générée », le résumé dit que le panier est soldé',
      d1.total === 0 && d1.pdf.grise && d1.pdf.texte === '✔ Planche générée' && /Planche générée : le panier est soldé/.test(d1.resume)
      && await p.evaluate(() => Ext.ComponentQuery.query('etiquetagepro').length === 1), JSON.stringify(d1));
    ok('Bilan : les 2 nouvelles étiquettes d\'essai ont quitté le panier', !/is_Process/.test(statuts()) && statuts().split(',').length === 4, statuts());
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (x) {
    ok('Déroulement', false, x.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Nettoyage : étiquettes d\'essai retirées, panier d\'origine remis', q(`SELECT COUNT(*) FROM t_etiquette WHERE lg_ETIQUETTE_ID LIKE '${M}%'`) === '0'
      && q("SELECT COUNT(*) FROM t_etiquette WHERE str_STATUT = 'e2e_attente'") === '0');
    const n = res.filter(Boolean).length;
    console.log(n + '/' + res.length + (n === res.length ? ' OK' : ' ÉCHEC'));
    process.exit(n === res.length ? 0 : 1);
  }
})();
