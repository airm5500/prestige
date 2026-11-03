/* CAS 3 DU 03/11/2026, TEST D'ECRAN 2 : un produit « ordonnancier » SANS code tableau.
 *
 * Regle conservee (Q3.1) : coche mais sans code tableau, le produit n'entre pas au registre et la cloture n'exige pas
 * de medecin. Avant le cas 3, ce produit faisait PLANTER la cloture (NullPointerException sur int_T a NULL).
 *
 * Parcours a l'ecran (KEY_GERE_ORDONCIER mis a 1) :
 *  1. Ordonnancier > onglet « Produits ordonnancier » : le produit est coche par un clic, et la grille le signale
 *     par le badge « SANS CODE TABLEAU » ;
 *  2. Ventes : l'article n'a pas de pastille ; « Terminer la vente » passe sans medecin et sans plantage.
 * Tout est retire a la fin.
 */
const { chromium } = require('playwright-core');
const C = require('./commun');

const CAISSE = 'E2E-SCT-CAISSE';
const article = C.articleSimple();
const ventes = [];
let paramAvant = null, caisseOuverte = false;
const DEBUT = C.q('SELECT NOW()');

function nettoyer() {
  try { C.retirerVentes(ventes); } catch (e) { console.log('Retrait des ventes incomplet : ' + String(e.message).split('\n').pop()); }
  C.remettreArticle(article);
  if (paramAvant !== null) { C.remettreParametre(paramAvant); }
  if (caisseOuverte) { C.fermerCaisse(CAISSE); }
  C.q("DELETE FROM t_event_log WHERE str_TYPE_LOG = '" + article.id + "' AND dt_CREATED >= '" + DEBUT + "'");
}

(async () => {
  C.ok('Jeu d\'essai : un article simple sans code tableau', !!article.cip && article.intT === '' && article.scheduled === '0', article.cip);
  paramAvant = C.parametreOrdonnancier('1');
  caisseOuverte = C.ouvrirCaisse(CAISSE);
  const b = await C.ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } });
  await ctx.route(/\/api\/v1\/vente\/ticket\//, (r) => r.abort());
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  try {
    await C.vues.connexion(p, C.ENV_E2E.LOGIN, 'e2etest');

    /* 1. cocher « ordonnancier » un produit sans code tableau */
    await C.ouvrirOnglet(p, 'Produits ordonnancier', 'ongletProduitsOrdonnancier');
    let lignes = await C.chercherProduits(p, 'ongletProduitsOrdonnancier', article.cip, 'Tous');
    C.ok('Le produit est trouvé, non coché, sans code tableau', lignes.length === 1 && lignes[0].scheduled === false && lignes[0].intT === '', JSON.stringify(lignes));
    const badgeAvant = await p.evaluate(() => !!document.querySelector('.ordo-badge-sans-code'));
    C.ok('Non coché : aucun badge', !badgeAvant);
    const rep = await C.cliquerCase(p, 'ongletProduitsOrdonnancier', 0);
    C.ok('Clic sur la case Ordonnancier : enregistré aussitôt', rep.success === true && C.q("SELECT is_scheduled FROM t_famille WHERE lg_FAMILLE_ID = '" + article.id + "'") === '1', JSON.stringify(rep));
    lignes = await C.chercherProduits(p, 'ongletProduitsOrdonnancier', article.cip, 'Produits cochés');
    C.ok('Après rechargement, il est dans les cochés', lignes.length === 1 && lignes[0].scheduled === true);
    const badge = await p.evaluate(() => { const e = document.querySelector('.ordo-badge-sans-code'); return e ? e.textContent : ''; });
    C.ok('La grille signale « SANS CODE TABLEAU »', badge === 'SANS CODE TABLEAU', badge);
    C.ok('Le cochage est journalisé', C.q("SELECT COUNT(*) FROM t_event_log WHERE str_TYPE_LOG = '" + article.id + "' AND str_DESCRIPTION LIKE '%coché ordonnancier%' AND dt_CREATED >= '" + DEBUT + "'") === '1');

    /* 2. la vente : pas de pastille, pas de medecin exige, pas de plantage */
    await C.nouvelleVente(p);
    await C.taperArticle(p, article.cip);
    const venteId = await C.venteCourante(p);
    if (venteId) { ventes.push(venteId); }
    const ligne = await C.ligneVente(p, article.cip);
    C.ok('Sans code tableau : pas de pastille sur la ligne (règle conservée)', ligne && ligne.motif === '' && ligne.pastille === '', JSON.stringify(ligne));
    const fin = await C.terminer(p);
    C.ok('Terminer la vente passe sans médecin et sans plantage', fin.ok && fin.codeError === undefined, fin.msg);
    const v = C.q("SELECT CONCAT_WS('|', str_STATUT, IFNULL(medecin_id, '')) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + venteId + "'").split('|');
    C.ok('La vente est close, sans médecin', v[0] === 'is_Closed' && v[1] === '', v.join(' '));
    const detail = await p.evaluate(async (u) => { const r = await fetch(u, { credentials: 'same-origin' }); return r.json(); },
      '../api/v1/ventestats/ventesordonnanciers/detail/' + venteId);
    C.ok('Le produit n\'entre pas au registre tant que le code tableau manque', detail.success === true && (detail.data || []).length === 0, JSON.stringify(detail));
    C.ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    await p.screenshot({ path: C.ENV_E2E.TMP + '/ordonnancier-sans-code-echec.png' }).catch(() => {});
    C.ok('Parcours sans exception', false, (await C.vues.texteMessage(p).catch(() => '')) + ' ' + e.stack);
  } finally {
    await b.close();
    nettoyer();
    C.ok('Données d\'essai retirées, produit et paramètre remis',
      C.q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN ('" + (ventes.join("','") || '-') + "')") === '0'
      && C.q("SELECT CONCAT(is_scheduled, is_sensible, IFNULL(int_T, '')) FROM t_famille WHERE lg_FAMILLE_ID = '" + article.id + "'") === article.scheduled + article.sensible + article.intT
      && C.q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_GERE_ORDONCIER'") === paramAvant);
  }
  process.exit(C.bilan() ? 1 : 0);
})();
