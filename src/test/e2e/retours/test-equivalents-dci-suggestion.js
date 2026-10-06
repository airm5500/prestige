/* EQUIVALENTS DCI ET PRODUITS RETIRES D'UNE SUGGESTION (plan d'octobre, lot L2 : sections 1.1 et 1.4).
 *
 * Jeu d'essai (retire a la fin, stocks remis a l'identique) : une DCI d'essai liee a cinq produits du catalogue qui
 * n'ont aucune DCI : CIFRAN 500MG CPR et OSPAMOX 500MG CPR sont suggeres (6 et 5), APRAMOL 500MG CPR (4 en stock) et
 * GRISEOPHARM 500MG CPR (5) sont des equivalents directs, VILDAMET 50MG/500MG (50) est « a adapter ». Une troisieme
 * ligne sans DCI complete la suggestion.
 *
 * Ce que le test etablit, sur le vrai ecran :
 *  - l'ouverture de la suggestion ne lance AUCUNE analyse ; le repere DCI est cache ;
 *  - le bouton « Équivalents DCI » ouvre la fenetre : 2 produits, substituts tries (directs, stock), le « a adapter »
 *    affiche mais non compte ; CIFRAN couvert 6/6, OSPAMOX 3/5 (le stock d'APRAMOL n'est pas compte deux fois) ;
 *  - le repere apparait dans la grille, et son clic ouvre l'analyse de cette seule ligne ;
 *  - le retrait : CIFRAN retire, OSPAMOX « Retirer et commander le reliquat de 2 » -> une suggestion de reliquat du
 *    meme grossiste, commentee « Reliquat substitution — <ref> », avec OSPAMOX x2 ; les deux lignes sont journalisees
 *    avec le motif SUPPRESSION_EQUIVALENCE_DCI ;
 *  - un retrait demande par l'API sans choix pour une ligne partielle est refuse (la couverture est recalculee) ;
 *  - « Produits retirés » : les deux produits ; CIFRAN ramene (quantite modifiee a 4) -> de retour dans la suggestion ;
 *  - une suppression par le bouton existant est journalisee (SUPPRESSION_USER) ;
 *  - l'impression s'ouvre en PDF dans l'onglet ;
 *  - aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const CAPT = process.env.CAPTURES || '/tmp';

const SUGG = 'E2E-EQD-SUGG', REF = 'E2E-EQD-REF', DCI = 'E2E-EQD-DCI', MARQUE = 'E2E-EQD-';
const P = { S1: 'CIFRAN 500MG CPR B/10', S2: 'OSPAMOX 500MG CPR BT 12', A: 'APRAMOL 500MG CPR B/20', G: 'GRISEOPHARM 500MG CPR B/20', V: 'VILDAMET 50MG/500MG CPR PELL B/30' };
const STOCK = { S1: 0, S2: 0, A: 4, G: 5, V: 50 };
let ids = {}, sauvegarde = [];

function nettoyer() {
  exec("DELETE FROM t_suggestion_ligne_retiree WHERE lg_SUGGESTION_ORDER_ID = '" + SUGG + "'"
    + " OR lg_RELIQUAT_SUGGESTION_ID IN (SELECT lg_SUGGESTION_ORDER_ID FROM t_suggestion_order WHERE str_COMMENTAIRE = 'Reliquat substitution — " + REF + "');"
    + "DELETE FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID IN (SELECT lg_SUGGESTION_ORDER_ID FROM t_suggestion_order"
    + " WHERE lg_SUGGESTION_ORDER_ID = '" + SUGG + "' OR str_COMMENTAIRE = 'Reliquat substitution — " + REF + "');"
    + "DELETE FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID = '" + SUGG + "' OR str_COMMENTAIRE = 'Reliquat substitution — " + REF + "';"
    + "DELETE FROM t_famille_dci WHERE lg_DCI_ID = '" + DCI + "'; DELETE FROM t_dci WHERE lg_DCI_ID = '" + DCI + "';");
  sauvegarde.forEach((s) => exec("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = " + s.n + " WHERE lg_FAMILLE_STOCK_ID = '" + s.id + "'"));
}

function poser() {
  for (const k of Object.keys(P)) {
    ids[k] = q("SELECT lg_FAMILLE_ID FROM t_famille WHERE TRIM(str_NAME) = '" + P[k] + "' AND str_STATUT = 'enable' LIMIT 1");
    if (!ids[k]) { return 'produit absent : ' + P[k]; }
    if (q("SELECT COUNT(*) FROM t_famille_dci WHERE lg_FAMILLE_ID = '" + ids[k] + "'") !== '0') { return 'produit deja lie a une DCI : ' + P[k]; }
    const st = q("SELECT CONCAT(lg_FAMILLE_STOCK_ID, '|', int_NUMBER_AVAILABLE) FROM t_famille_stock WHERE lg_FAMILLE_ID = '" + ids[k] + "' AND lg_EMPLACEMENT_ID = '1' LIMIT 1");
    if (!st) { return 'stock absent : ' + P[k]; }
    sauvegarde.push({ id: st.split('|')[0], n: st.split('|')[1] });
  }
  ids.X = q("SELECT f.lg_FAMILLE_ID FROM t_famille f WHERE f.str_STATUT = 'enable' AND NOT EXISTS (SELECT 1 FROM t_famille_dci fd WHERE fd.lg_FAMILLE_ID = f.lg_FAMILLE_ID) AND f.str_NAME LIKE 'A%' ORDER BY f.str_NAME LIMIT 1");
  const grossiste = q("SELECT lg_GROSSISTE_ID FROM t_grossiste LIMIT 1");
  exec("INSERT INTO t_dci (lg_DCI_ID, str_CODE, str_NAME, str_STATUT, dt_CREATED, dt_UPDATED) VALUES ('" + DCI + "', '" + DCI + "', 'E2E MOLECULE', 'enable', NOW(), NOW())");
  for (const k of Object.keys(P)) {
    exec("INSERT INTO t_famille_dci (lg_FAMILLE_DCI_ID, lg_FAMILLE_ID, lg_DCI_ID, str_STATUT, dt_CREATED, dt_UPDATED) VALUES ('" + MARQUE + k + "', '" + ids[k] + "', '" + DCI + "', 'enable', NOW(), NOW())");
    exec("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = " + STOCK[k] + " WHERE lg_FAMILLE_ID = '" + ids[k] + "' AND lg_EMPLACEMENT_ID = '1'");
  }
  exec("INSERT INTO t_suggestion_order (lg_SUGGESTION_ORDER_ID, str_REF, lg_GROSSISTE_ID, str_STATUT, dt_CREATED, dt_UPDATED) VALUES ('" + SUGG + "', '" + REF + "', '" + grossiste + "', 'is_Process', NOW(), NOW())");
  [['S1', 6], ['S2', 5], ['X', 2]].forEach(([k, n]) => exec("INSERT INTO t_suggestion_order_details (lg_SUGGESTION_ORDER_DETAILS_ID, lg_SUGGESTION_ORDER_ID,"
    + " lg_GROSSISTE_ID, lg_FAMILLE_ID, int_NUMBER, int_PRICE, int_PRICE_DETAIL, int_PAF_DETAIL, dt_CREATED, dt_UPDATED, str_STATUT, b_falg)"
    + " VALUES ('" + MARQUE + 'L' + k + "', '" + SUGG + "', '" + grossiste + "', '" + ids[k] + "', " + n + ", " + (n * 100) + ", 150, 100, NOW(), NOW(), 'is_Process', 0)"));
  return null;
}

(async () => {
  try { nettoyer(); } catch (e) { /* rien a retirer */ }
  const erreur = poser();
  if (erreur) { console.log('FATAL : ' + erreur); nettoyer(); process.exit(1); }
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1600, height: 950 } });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const appels = []; p.on('request', (r) => { if (/suggestion-equivalents/.test(r.url())) { appels.push(r.method() + ' ' + r.url()); } });
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);

    /* Ouverture par la liste des suggestions, comme l'utilisateur */
    await p.evaluate(() => { testextjs.app.getController('App').onRedirectTo('i_sugg_manager', {}); });
    await p.waitForFunction(() => Ext.ComponentQuery.query('i_sugg_manager').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(2500);
    await p.evaluate((ref) => { Ext.getCmp('rechecher').setValue(ref); Ext.ComponentQuery.query('i_sugg_manager')[0].onRechClick(); }, REF);
    await p.waitForFunction((ref) => { const st = Ext.ComponentQuery.query('i_sugg_manager')[0].getStore(); return !st.isLoading() && st.findExact('str_REF', ref) >= 0; }, REF, { timeout: 30000 });
    await p.evaluate((ref) => { const g = Ext.ComponentQuery.query('i_sugg_manager')[0]; g.onManageDetailsClick(g, g.getStore().findExact('str_REF', ref)); }, REF);
    await p.waitForFunction(() => { const g = Ext.getCmp('gridpanelSuggestionID'); return g && !g.getStore().isLoading() && g.getStore().getCount() === 3; }, null, { timeout: 30000 });
    await p.waitForTimeout(1200);
    const ouverture = await p.evaluate(() => ({ colonne: Ext.getCmp('gridpanelSuggestionID').down('#colEquivalentDci').isVisible(),
      boutons: !!Ext.getCmp('btn_equivalents_dci') && !!Ext.getCmp('btn_produits_retires') }));
    ok('Ouverture : aucune analyse lancée, repère DCI caché, boutons présents', appels.length === 0 && !ouverture.colonne && ouverture.boutons, JSON.stringify({ appels, ouverture }));

    /* Analyse par le bouton */
    await p.click('#btn_equivalents_dci');
    await p.waitForSelector('.eq-fenetre .eq-tableau', { timeout: 30000 });
    await p.waitForTimeout(500);
    const an = await p.evaluate(() => { const lignes = [...document.querySelectorAll('.eq-fenetre .eq-tableau > table > tbody > tr')];
      return lignes.map((tr) => ({ produit: tr.querySelector('td:nth-child(2) b').textContent, couvert: tr.querySelector('td:nth-child(5)').textContent.trim(),
        subs: [...tr.querySelectorAll('.eq-subs tr')].map((s) => s.querySelector('td:nth-child(2) b').textContent + ':' + s.querySelector('.eq-niv').textContent) })); });
    const cif = an.find((l) => /CIFRAN/.test(l.produit)), osp = an.find((l) => /OSPAMOX/.test(l.produit));
    ok('Fenêtre : 2 produits avec équivalents (la ligne sans DCI n\'y est pas)', an.length === 2 && cif && osp, JSON.stringify(an));
    ok('Couverture : CIFRAN 6/6, OSPAMOX 3/5 (stock partagé compté une seule fois)', cif && cif.couvert === '6' && osp && osp.couvert === '3', JSON.stringify(an));
    ok('Substituts : directs d\'abord (GRISEOPHARM 5 avant APRAMOL 4), VILDAMET « à adapter » affiché en dernier',
      cif && /GRISEOPHARM.*Direct/.test(cif.subs[0]) && /APRAMOL.*Direct/.test(cif.subs[1]) && /VILDAMET.*adapter/.test(cif.subs[cif.subs.length - 1]), JSON.stringify(cif && cif.subs));
    await p.screenshot({ path: CAPT + '/equivalents-dci.png' });
    const marque = await p.evaluate(() => { const g = Ext.getCmp('gridpanelSuggestionID'); return { visible: g.down('#colEquivalentDci').isVisible(), n: g.getEl().dom.querySelectorAll('.eq-marque').length }; });
    ok('Après l\'analyse : repère « ≡ » visible sur les 2 lignes concernées', marque.visible && marque.n === 2, JSON.stringify(marque));

    /* Impression */
    const pdf = await p.evaluate(async (id) => { const r = await fetch('../api/v1/suggestion-equivalents/' + id + '/pdf'); return r.headers.get('content-type') + ' ' + r.headers.get('content-disposition'); }, SUGG);
    ok('Impression : PDF ouvert dans l\'onglet (inline)', /application\/pdf/.test(pdf) && /inline/.test(pdf), pdf);

    /* Refus cote serveur : ligne partielle sans choix */
    const refus = await p.evaluate(async (a) => { const r = await fetch('../api/v1/suggestion-equivalents/' + a.s + '/retirer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lignes: [{ id: a.l }] }) }); return r.json(); }, { s: SUGG, l: MARQUE + 'LS2' });
    ok('API : ligne couverte en partie sans choix → refusée, rien retiré', refus.success === false && q("SELECT COUNT(*) FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID='" + SUGG + "'") === '3', JSON.stringify(refus));

    /* Retrait par l'ecran : tout cocher, reliquat pour OSPAMOX */
    await p.click('.eq-fenetre input[data-action=tout]');
    await p.click('.eq-fenetre [data-action=retirer]');
    await p.waitForSelector('select[data-reliquat]', { timeout: 10000 });
    await p.selectOption('select[data-reliquat]', 'reliquat');
    await p.screenshot({ path: CAPT + '/equivalents-dci-recap.png' });
    await p.click('[data-action=valider]');
    await p.waitForFunction(() => Ext.MessageBox.isVisible() && /retirée/.test(Ext.MessageBox.msg.getEl().dom.textContent), null, { timeout: 30000 });
    const msg = await p.evaluate(() => Ext.MessageBox.msg.getEl().dom.textContent);
    await p.evaluate(() => Ext.MessageBox.hide());
    const reste = q("SELECT GROUP_CONCAT(lg_FAMILLE_ID) FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID='" + SUGG + "'");
    const reliq = q("SELECT CONCAT(s.lg_GROSSISTE_ID = o.lg_GROSSISTE_ID, '|', s.str_STATUT, '|', d.lg_FAMILLE_ID, '|', d.int_NUMBER) FROM t_suggestion_order s JOIN t_suggestion_order_details d ON d.lg_SUGGESTION_ORDER_ID = s.lg_SUGGESTION_ORDER_ID JOIN t_suggestion_order o ON o.lg_SUGGESTION_ORDER_ID='" + SUGG + "' WHERE s.str_COMMENTAIRE = 'Reliquat substitution — " + REF + "'");
    ok('Retrait : seule la ligne sans DCI reste dans la suggestion', reste === ids.X, reste);
    ok('Reliquat : une suggestion du même grossiste, commentée, OSPAMOX × 2', reliq === '1|is_Process|' + ids.S2 + '|2' && /Reliquat/.test(msg), reliq + ' / ' + msg);
    const journal = q("SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, ':', int_NUMBER, ':', str_MOTIF, ':', lg_RELIQUAT_SUGGESTION_ID IS NOT NULL, ':', lg_USER_ID IS NOT NULL) ORDER BY int_NUMBER) FROM t_suggestion_ligne_retiree WHERE lg_SUGGESTION_ORDER_ID='" + SUGG + "'");
    ok('Journal : les 2 lignes, motif SUPPRESSION_EQUIVALENCE_DCI, utilisateur, reliquat lié pour OSPAMOX',
      journal === ids.S2 + ':5:SUPPRESSION_EQUIVALENCE_DCI:1:1,' + ids.S1 + ':6:SUPPRESSION_EQUIVALENCE_DCI:0:1', journal);
    await p.evaluate(() => Ext.ComponentQuery.query('equivalentsdcifenetre')[0].close());
    await p.waitForTimeout(800);

    /* Produits retires : ramener CIFRAN avec 4 */
    await p.click('#btn_produits_retires');
    await p.waitForSelector('.eq-fenetre input[data-retrait]', { timeout: 20000 });
    const nbRet = await p.evaluate(() => document.querySelectorAll('.eq-fenetre input[data-retrait]').length);
    ok('Produits retirés : les 2 produits listés', nbRet === 2, nbRet);
    await p.screenshot({ path: CAPT + '/produits-retires.png' });
    const idCif = q("SELECT lg_ID FROM t_suggestion_ligne_retiree WHERE lg_SUGGESTION_ORDER_ID='" + SUGG + "' AND lg_FAMILLE_ID='" + ids.S1 + "'");
    await p.check('input[data-retrait="' + idCif + '"]');
    await p.fill('input[data-qte="' + idCif + '"]', '4');
    await p.click('.eq-fenetre [data-action=ramener]');
    await p.waitForFunction(() => Ext.MessageBox.isVisible() && /ramené/.test(Ext.MessageBox.msg.getEl().dom.textContent), null, { timeout: 20000 });
    await p.evaluate(() => Ext.MessageBox.hide());
    await p.waitForTimeout(800);
    const retour = q("SELECT int_NUMBER FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID='" + SUGG + "' AND lg_FAMILLE_ID='" + ids.S1 + "'");
    const nbApres = await p.evaluate(() => document.querySelectorAll('.eq-fenetre input[data-retrait]').length);
    const grille = await p.evaluate(() => Ext.getCmp('gridpanelSuggestionID').getStore().getCount());
    ok('Ramené : CIFRAN de retour avec 4, plus dans la liste, grille rechargée', retour === '4' && nbApres === 1 && grille === 2, JSON.stringify({ retour, nbApres, grille }));
    await p.evaluate(() => Ext.ComponentQuery.query('produitsretiresfenetre')[0].close());

    /* Suppression par le service existant : journalisee */
    const idX = q("SELECT lg_SUGGESTION_ORDER_DETAILS_ID FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID='" + SUGG + "' AND lg_FAMILLE_ID='" + ids.X + "'");
    await p.evaluate(async (id) => { await fetch('../api/v1/suggestion/item/' + id, { method: 'DELETE' }); }, idX);
    const jx = q("SELECT CONCAT(str_MOTIF, ':', int_NUMBER, ':', lg_USER_ID IS NOT NULL) FROM t_suggestion_ligne_retiree WHERE lg_SUGGESTION_ORDER_ID='" + SUGG + "' AND lg_FAMILLE_ID='" + ids.X + "'");
    const sup = q("SELECT COUNT(*) FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_DETAILS_ID='" + idX + "'");
    ok('Suppression existante : ligne supprimée comme avant, et journalisée (SUPPRESSION_USER)', sup === '0' && jx === 'SUPPRESSION_USER:2:1', jx + ' / ' + sup);
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Parcours sans exception', false, e.message);
  } finally {
    await b.close();
    nettoyer();
    const restes = q("SELECT (SELECT COUNT(*) FROM t_dci WHERE lg_DCI_ID='" + DCI + "') + (SELECT COUNT(*) FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID='" + SUGG + "' OR str_COMMENTAIRE LIKE 'Reliquat substitution — E2E%')");
    ok('Jeu d\'essai retiré, stocks remis', restes === '0' && sauvegarde.every((s) => q("SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_FAMILLE_STOCK_ID='" + s.id + "'") === String(s.n)), restes);
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
