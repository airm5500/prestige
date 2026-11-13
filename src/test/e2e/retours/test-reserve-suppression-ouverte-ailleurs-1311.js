/* DEMANDE DU 13/11 : GESTION DES RESERVES, ONGLET « SUGGESTIONS ».
 *
 * Une suggestion ouverte sur un autre poste (verrou de saisie recent d'un autre utilisateur) se supprime quand meme.
 * Avant : refus « X a ouvert cette suggestion depuis... » pendant 20 minutes, meme pour un poste oublie ouvert.
 *
 * Jeu d'essai (E2E-OA-*, retire a la fin), toutes ouvertes par un autre utilisateur :
 *   OA-1 manuelle a traiter, verrou recent, 2 lignes : icone rouge puis second clic -> supprimee (motif fixe), verrou
 *        efface, message « ... Elle était ouverte par ... ».
 *   OA-2 automatique en cours, verrou recent : icone -> motif (fenetre existante) -> supprimee avec le motif.
 *   OA-3 manuelle, verrou recent, une ligne deja TRAITEE : toujours refusee (un mouvement execute ne se masque pas).
 *   OA-4 manuelle, verrou ancien (30 min, perime) : supprimee, message ordinaire (sans « ouverte par »).
 *   OA-5 manuelle, verrou recent, non touchee : inchangee.
 * Puis l'autre poste continue sur OA-1 supprimee : modifier une quantite et lancer le traitement sont refuses
 * (SUGGESTION_SUPPRIMEE), la ligne ne change pas, le verrou n'est pas repris.
 * Bilan avant / apres (base) : seules OA-1, OA-2, OA-4 changent ; lignes de suggestion inchangees ; aucun mouvement de
 * reserve ; stocks inchanges ; aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const V = require('../outils/vues');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '--raw'], { input: s, encoding: 'utf8' }).replace(/\r/g, '').trim();
const MOI = q(`SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN}'`);
const EMPL = q(`SELECT lg_EMPLACEMENT_ID FROM t_user WHERE lg_USER_ID = '${MOI}'`);
const AUTRE = q(`SELECT lg_USER_ID FROM t_user WHERE lg_USER_ID <> '${MOI}' AND str_STATUT = 'enable' ORDER BY lg_USER_ID LIMIT 1`);
const PRODUITS = q(`SELECT lg_FAMILLE_ID FROM t_famille WHERE str_STATUT = 'enable' ORDER BY lg_FAMILLE_ID LIMIT 3 OFFSET 80`).split('\n');
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
const MOTIF_FIXE = 'Suggestion manuelle supprimée sans motif';
const MOTIF_AUTO = 'E2E motif ouverte ailleurs 1311';
/* id, origine, statut, verrou (minutes avant maintenant, null = aucun) */
const S = [['E2E-OA-1', 'MANUELLE', 'A_TRAITER', 0], ['E2E-OA-2', 'AUTOMATIQUE', 'EN_COURS', 1], ['E2E-OA-3', 'MANUELLE', 'EN_COURS', 0],
  ['E2E-OA-4', 'MANUELLE', 'A_TRAITER', 30], ['E2E-OA-5', 'MANUELLE', 'A_TRAITER', 0]];
/* lignes : OA-1 deux lignes proposees (quantites 3 et 4), OA-3 une ligne traitee */
const L = [['E2E-OA-1-L0', 'E2E-OA-1', 0, 3, 2, 0, 'PROPOSEE'], ['E2E-OA-1-L1', 'E2E-OA-1', 1, 4, 4, 0, 'MODIFIEE'], ['E2E-OA-3-L0', 'E2E-OA-3', 2, 5, 5, 5, 'TRAITEE']];
const nettoyer = () => q("DELETE FROM t_suggestion_reserve_detail WHERE lg_SUGGESTION_RESERVE_ID LIKE 'E2E-OA-%'; DELETE FROM t_suggestion_reserve WHERE lg_SUGGESTION_RESERVE_ID LIKE 'E2E-OA-%';");
function poser() {
  nettoyer();
  q(S.map(([id, origine, st, min]) => `INSERT INTO t_suggestion_reserve (lg_SUGGESTION_RESERVE_ID, str_REF, str_CATEGORIE, str_ORIGINE, str_STATUT, str_COMMENTAIRE, lg_EMPLACEMENT_ID,
    lg_USER_CREATEUR_ID, dt_CREATED, dt_UPDATED, lg_USER_VERROU_ID, dt_VERROU) VALUES ('${id}', '${id}', 'RAYON', '${origine}', '${st}', 'E2E commentaire', '${EMPL}', '${MOI}', NOW(), NOW(),
    '${AUTRE}', NOW() - INTERVAL ${min} MINUTE);`).join('')
    + L.map(([id, s, f, prop, ret, dep, etat]) => `INSERT INTO t_suggestion_reserve_detail (lg_SUGGESTION_RESERVE_DETAIL_ID, lg_SUGGESTION_RESERVE_ID, lg_FAMILLE_ID, int_QTE_PROPOSEE, int_QTE_RETENUE,
    int_QTE_DEPLACEE, str_ETAT, dt_CREATED, dt_UPDATED) VALUES ('${id}', '${s}', '${PRODUITS[f]}', ${prop}, ${ret}, ${dep}, '${etat}', NOW(), NOW());`).join(''));
}
const etat = (id) => q(`SELECT CONCAT_WS('|', str_STATUT, IFNULL(str_COMMENTAIRE, ''), IFNULL(lg_USER_CLOTURE_ID, ''), IF(dt_CLOTURE >= '${DEBUT}', 'cloture', IFNULL(dt_CLOTURE, '')),
  IFNULL(lg_USER_VERROU_ID, 'sans-verrou')) FROM t_suggestion_reserve WHERE lg_SUGGESTION_RESERVE_ID = '${id}'`);
const lignes = () => q("SELECT GROUP_CONCAT(CONCAT_WS(':', lg_SUGGESTION_RESERVE_DETAIL_ID, int_QTE_PROPOSEE, int_QTE_RETENUE, int_QTE_DEPLACEE, str_ETAT, dt_UPDATED) ORDER BY 1) FROM t_suggestion_reserve_detail WHERE lg_SUGGESTION_RESERVE_ID LIKE 'E2E-OA-%'");
const stocks = () => q(`SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, ':', lg_TYPE_STOCK_ID, ':', int_NUMBER) ORDER BY 1) FROM t_type_stock_famille WHERE lg_FAMILLE_ID IN ('${PRODUITS.join("','")}')`);
const mouvements = () => q(`SELECT COUNT(*) FROM t_mouvement_reserve WHERE dt_CREATED >= '${DEBUT}'`);

(async () => {
  let b = null;
  const err = [];
  try {
    ok('Précondition : un autre utilisateur actif et trois produits', !!AUTRE && AUTRE !== MOI && PRODUITS.length === 3, AUTRE);
    poser();
    const lignesAvant = lignes(), stocksAvant = stocks(), etatsAvant = S.map(([id]) => etat(id));
    b = await ENV_E2E.lancer(chromium);
    const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
    p.on('pageerror', (e) => err.push(e.message));
    await V.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const menu = await p.evaluate(() => { const r = Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().findChild('id', 'reservemanager', true); return r ? [r.parentNode.get('text'), r.get('text')] : null; });
    await V.ouvrirMenu(p, menu[0], menu[1]);
    await p.waitForFunction(() => Ext.getCmp('reservemanagerID'), null, { timeout: 30000 });
    const onglet = await p.evaluate(() => Ext.getCmp('reservemanagerID').down('#ongletSuggestions').tab.getId());
    await p.click('#' + onglet);
    const charge = () => p.waitForFunction(() => { const g = Ext.getCmp('reservemanagerID').down('#ongletSuggestions'); return g && g.filtreInitialise && !g.getStore().isLoading(); }, null, { timeout: 30000 });
    await charge();
    const icone = async (id) => p.evaluate((id) => { const g = Ext.getCmp('reservemanagerID').down('#ongletSuggestions'), i = g.getStore().findExact('lg_SUGGESTION_RESERVE_ID', id);
      if (i < 0) { return null; } const img = g.getView().getNode(i).querySelector('img.sugg-suppr'); if (!img) { return null; }
      img.id = img.id || ('e2e-suppr-' + id); return { id: img.id, rouge: img.classList.contains('sugg-suppr-confirmer') }; }, id);
    const bilan = () => p.evaluate(() => Ext.getCmp('reservemanagerID').down('#ongletSuggestions').dernierBilanSuppression || '');
    const raz = () => p.evaluate(() => { Ext.getCmp('reservemanagerID').down('#ongletSuggestions').dernierBilanSuppression = null; });
    const toastAlerte = () => p.evaluate(() => Array.from(document.querySelectorAll('body *')).filter((e) => e.childElementCount === 0 && /a ouvert cette suggestion|déjà traitées|deja traitees/.test(e.textContent)).map((e) => e.textContent).join(' / '));
    /* manuelle : premier clic (icone rouge), second clic (suppression) */
    const supprimerManuelle = async (id) => {
      await raz();
      let i = await icone(id);
      if (!i) { return false; }
      await p.click('#' + i.id);
      await p.waitForTimeout(700);
      i = await icone(id);
      await p.click('#' + i.id);
      await p.waitForTimeout(1500);
      await charge();
      return true;
    };
    const visibles = await p.evaluate(() => Ext.getCmp('reservemanagerID').down('#ongletSuggestions').getStore().getRange().map((r) => r.get('lg_SUGGESTION_RESERVE_ID')).filter((x) => /E2E-OA/.test(x)));
    ok('Les suggestions d\'essai sont listées avec leur icône de suppression', ['E2E-OA-1', 'E2E-OA-2', 'E2E-OA-3', 'E2E-OA-4', 'E2E-OA-5'].every((x) => visibles.includes(x)), visibles.join(','));

    /* OA-1 : manuelle ouverte ailleurs */
    await supprimerManuelle('E2E-OA-1');
    const e1 = etat('E2E-OA-1'), m1 = await bilan();
    ok('OA-1 manuelle ouverte ailleurs : supprimée (motif fixe, moi, date de clôture), verrou effacé', e1 === `SUPPRIMEE|${MOTIF_FIXE}|${MOI}|cloture|sans-verrou`, e1 + ' / ' + await toastAlerte());
    ok('OA-1 : le message dit qui l\'avait ouverte et que ses modifications ne seront plus enregistrées', /^Suggestion E2E-OA-1 supprimée\. Elle était ouverte par .+ : ses modifications ne seront plus enregistrées\.$/.test(m1), m1);

    /* OA-2 : automatique ouverte ailleurs, motif dans la fenetre existante */
    await raz();
    const i2 = await icone('E2E-OA-2');
    await p.click('#' + i2.id);
    await p.waitForFunction(() => Ext.ComponentQuery.query('messagebox{isVisible()}').length > 0, null, { timeout: 10000 });
    const ids = await p.evaluate(() => { const m = Ext.ComponentQuery.query('messagebox{isVisible()}')[0]; return { champ: m.textField.inputEl.dom.id, ok: m.down('button[itemId=ok]').getId() }; });
    await p.click('#' + ids.champ);
    await p.keyboard.type(MOTIF_AUTO, { delay: 10 });
    await p.click('#' + ids.ok);
    await p.waitForTimeout(1500);
    await charge();
    const e2 = etat('E2E-OA-2'), m2 = await bilan();
    ok('OA-2 automatique ouverte ailleurs : supprimée avec le motif saisi, verrou effacé', e2 === `SUPPRIMEE|${MOTIF_AUTO}|${MOI}|cloture|sans-verrou`, e2);
    ok('OA-2 : message « ouverte par » affiché, aucune fenêtre d\'erreur', /^Suggestion E2E-OA-2 supprimée\. Elle était ouverte par /.test(m2)
      && await p.evaluate(() => Ext.ComponentQuery.query('messagebox{isVisible()}').length) === 0, m2);

    /* OA-3 : ligne deja traitee, toujours refusee */
    await supprimerManuelle('E2E-OA-3');
    ok('OA-3 avec une ligne traitée : refusée, inchangée', etat('E2E-OA-3') === etatsAvant[2], etat('E2E-OA-3'));

    /* OA-4 : verrou perime */
    await supprimerManuelle('E2E-OA-4');
    const e4 = etat('E2E-OA-4'), m4 = await bilan();
    ok('OA-4 verrou ancien : supprimée, message ordinaire sans « ouverte par »', e4 === `SUPPRIMEE|${MOTIF_FIXE}|${MOI}|cloture|sans-verrou` && m4 === 'Suggestion E2E-OA-4 supprimée.', e4 + ' / ' + m4);

    /* l'autre poste continue sur OA-1 : refus du serveur */
    const lignesOA1 = q("SELECT GROUP_CONCAT(CONCAT_WS(':', int_QTE_RETENUE, str_ETAT, dt_UPDATED) ORDER BY 1) FROM t_suggestion_reserve_detail WHERE lg_SUGGESTION_RESERVE_ID = 'E2E-OA-1'");
    const suite = await p.evaluate(async () => {
      const appel = async (url, corps) => (await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: corps ? JSON.stringify(corps) : undefined })).json();
      return { quantite: await appel('../api/v1/suggestion-reserve/ligne/E2E-OA-1-L0/quantite', { int_QTE: 5 }), traiter: await appel('../api/v1/suggestion-reserve/E2E-OA-1/traiter') };
    });
    ok('Après suppression : modifier une quantité de OA-1 est refusé (SUGGESTION_SUPPRIMEE)', suite.quantite.success === false && suite.quantite.code === 'SUGGESTION_SUPPRIMEE', JSON.stringify(suite.quantite));
    ok('Après suppression : traiter OA-1 est refusé', suite.traiter.success === false, JSON.stringify(suite.traiter));
    ok('OA-1 : lignes inchangées, statut et verrou inchangés après ces refus',
      q("SELECT GROUP_CONCAT(CONCAT_WS(':', int_QTE_RETENUE, str_ETAT, dt_UPDATED) ORDER BY 1) FROM t_suggestion_reserve_detail WHERE lg_SUGGESTION_RESERVE_ID = 'E2E-OA-1'") === lignesOA1
      && etat('E2E-OA-1') === e1, etat('E2E-OA-1'));

    /* bilan */
    ok('Base : OA-5 (non touchée) inchangée', etat('E2E-OA-5') === etatsAvant[4], etat('E2E-OA-5'));
    ok('Base : lignes de suggestion inchangées (quantités, état, date)', lignes() === lignesAvant, lignes());
    ok('Base : aucun mouvement de réserve, stocks inchangés', mouvements() === '0' && stocks() === stocksAvant, mouvements());
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    if (b) { await b.close(); }
    nettoyer();
    ok('Données d\'essai retirées', q("SELECT COUNT(*) FROM t_suggestion_reserve WHERE lg_SUGGESTION_RESERVE_ID LIKE 'E2E-OA-%'") === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
