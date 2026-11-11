/* PLAN DU 10/11, POINT 3 : GESTION DES RESERVES, ONGLET « SUGGESTIONS ».
 *
 *  a. Reference courte : prefixe du sens + 5 caracteres (« SR-RAY-7KQ2M »), sans 0/O/1/I/L ; creee par le serveur,
 *     relue en base et dans la grille (lisible en entier).
 *  b. Une suggestion MANUELLE se supprime sans motif : clic sur l'icone de suppression, l'icone passe au rouge
 *     (aucune fenetre) ; sans second clic elle revient seule apres 5 s ; second clic : suppression. Trace : statut
 *     SUPPRIMEE, motif fixe « Suggestion manuelle supprimée sans motif », utilisateur et date de cloture.
 *  c. Une suggestion AUTOMATIQUE garde le motif obligatoire : l'icone demande le motif (ancien comportement), et le
 *     serveur refuse une suppression sans motif.
 *  d. Suppression de la selection : sans motif, acceptee si toutes les cochees sont manuelles ; refusee dans la barre
 *     des qu'une automatique est cochee.
 * Bilan avant / apres : seules les suggestions visees changent ; lignes de suggestion, mouvements de reserve et stocks
 * inchanges. Jeu d'essai (E2E-SM-*) et suggestion creee retires a la fin.
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
const PRODUITS = q(`SELECT lg_FAMILLE_ID FROM t_famille WHERE str_STATUT = 'enable' ORDER BY lg_FAMILLE_ID LIMIT 2 OFFSET 60`).split('\n');
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
const MOTIF_FIXE = 'Suggestion manuelle supprimée sans motif';
const REF = /^SR-(RAY|RES)-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{5}$/;
/* id, origine */
const S = [['E2E-SM-1', 'MANUELLE'], ['E2E-SM-2', 'MANUELLE'], ['E2E-SM-3', 'MANUELLE'], ['E2E-SM-4', 'AUTOMATIQUE'], ['E2E-SM-5', 'MANUELLE']];

/* produit gere en reserve pour la creation par le serveur (comme test-reserve-sans-doublon) */
const P = q("SELECT s.lg_FAMILLE_ID FROM t_famille_stock s JOIN t_type_stock_famille r ON r.lg_FAMILLE_ID = s.lg_FAMILLE_ID AND r.lg_EMPLACEMENT_ID = '1' AND r.lg_TYPE_STOCK_ID = '1'"
  + " JOIN t_famille f ON f.lg_FAMILLE_ID = s.lg_FAMILLE_ID"
  + " WHERE s.lg_EMPLACEMENT_ID = '1' AND f.str_STATUT = 'enable' AND COALESCE(f.bool_DECONDITIONNE, 0) = 0"
  + " AND NOT EXISTS (SELECT 1 FROM t_type_stock_famille v WHERE v.lg_FAMILLE_ID = s.lg_FAMILLE_ID AND v.lg_TYPE_STOCK_ID = '2')"
  + " AND NOT EXISTS (SELECT 1 FROM t_suggestion_reserve_detail d WHERE d.lg_FAMILLE_ID = s.lg_FAMILLE_ID) ORDER BY s.lg_FAMILLE_ID LIMIT 1 OFFSET 7");
const AVANT_P = q(`SELECT CONCAT_WS('|', s.int_NUMBER_AVAILABLE, s.int_NUMBER, r.int_NUMBER, IFNULL(f.bool_RESERVE, 'NULL')) FROM t_famille_stock s
  JOIN t_type_stock_famille r ON r.lg_FAMILLE_ID = s.lg_FAMILLE_ID AND r.lg_EMPLACEMENT_ID = '1' AND r.lg_TYPE_STOCK_ID = '1'
  JOIN t_famille f ON f.lg_FAMILLE_ID = s.lg_FAMILLE_ID WHERE s.lg_FAMILLE_ID = '${P}' AND s.lg_EMPLACEMENT_ID = '1'`).split('|');

function nettoyer() {
  q("DELETE FROM t_suggestion_reserve_detail WHERE lg_SUGGESTION_RESERVE_ID LIKE 'E2E-SM-%'; DELETE FROM t_suggestion_reserve WHERE lg_SUGGESTION_RESERVE_ID LIKE 'E2E-SM-%';"
    + "DELETE d FROM t_suggestion_reserve_detail d JOIN t_suggestion_reserve s ON s.lg_SUGGESTION_RESERVE_ID = d.lg_SUGGESTION_RESERVE_ID WHERE s.str_COMMENTAIRE = 'E2E-SM-CREEE';"
    + "DELETE FROM t_suggestion_reserve WHERE str_COMMENTAIRE = 'E2E-SM-CREEE';"
    + `DELETE FROM t_mouvement_reserve WHERE lg_FAMILLE_ID = '${P}' AND dt_CREATED >= '${DEBUT}';`
    + "DELETE FROM t_type_stock_famille WHERE lg_TYPE_STOCK_FAMILLE_ID = 'E2E-SM-T';");
  if (AVANT_P.length === 4) {
    q(`UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = ${AVANT_P[0]}, int_NUMBER = ${AVANT_P[1]} WHERE lg_FAMILLE_ID = '${P}' AND lg_EMPLACEMENT_ID = '1';`
      + `UPDATE t_type_stock_famille SET int_NUMBER = ${AVANT_P[2]} WHERE lg_FAMILLE_ID = '${P}' AND lg_EMPLACEMENT_ID = '1' AND lg_TYPE_STOCK_ID = '1';`
      + `UPDATE t_famille SET bool_RESERVE = ${AVANT_P[3]} WHERE lg_FAMILLE_ID = '${P}';`);
  }
}
function poser() {
  nettoyer();
  q(S.map(([id, origine]) => `INSERT INTO t_suggestion_reserve (lg_SUGGESTION_RESERVE_ID, str_REF, str_CATEGORIE, str_ORIGINE, str_STATUT, str_COMMENTAIRE, lg_EMPLACEMENT_ID,
    lg_USER_CREATEUR_ID, dt_CREATED, dt_UPDATED) VALUES ('${id}', '${id}', 'RAYON', '${origine}', 'A_TRAITER', 'E2E commentaire', '${EMPL}', '${MOI}', NOW(), NOW());`).join('')
    + PRODUITS.map((f, i) => `INSERT INTO t_suggestion_reserve_detail (lg_SUGGESTION_RESERVE_DETAIL_ID, lg_SUGGESTION_RESERVE_ID, lg_FAMILLE_ID, int_QTE_PROPOSEE, int_QTE_RETENUE, int_QTE_DEPLACEE,
    str_ETAT, dt_CREATED, dt_UPDATED) VALUES ('E2E-SM-1-L${i}', 'E2E-SM-1', '${f}', ${3 + i}, ${2 + i}, 0, 'PROPOSEE', NOW(), NOW());`).join('')
    + `UPDATE t_famille SET bool_RESERVE = 1 WHERE lg_FAMILLE_ID = '${P}';`
    + `INSERT INTO t_type_stock_famille (lg_TYPE_STOCK_FAMILLE_ID, lg_FAMILLE_ID, lg_TYPE_STOCK_ID, lg_EMPLACEMENT_ID, str_NAME, str_DESCRIPTION, dt_CREATED, dt_UPDATED, str_STATUT, int_NUMBER)`
    + ` VALUES ('E2E-SM-T', '${P}', '2', '1', 'E2E', 'E2E', NOW(), NOW(), 'enable', 10);`
    + `UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = 20, int_NUMBER = 20 WHERE lg_FAMILLE_ID = '${P}' AND lg_EMPLACEMENT_ID = '1';`
    + `UPDATE t_type_stock_famille SET int_NUMBER = 20 WHERE lg_FAMILLE_ID = '${P}' AND lg_EMPLACEMENT_ID = '1' AND lg_TYPE_STOCK_ID = '1';`);
}
const etat = (id) => q(`SELECT CONCAT_WS('|', str_STATUT, IFNULL(str_COMMENTAIRE, ''), IFNULL(lg_USER_CLOTURE_ID, ''), IF(dt_CLOTURE >= '${DEBUT}', 'cloture', IFNULL(dt_CLOTURE, ''))) FROM t_suggestion_reserve WHERE lg_SUGGESTION_RESERVE_ID = '${id}'`);
const lignes = () => q("SELECT GROUP_CONCAT(CONCAT_WS(':', lg_SUGGESTION_RESERVE_DETAIL_ID, int_QTE_PROPOSEE, int_QTE_RETENUE, int_QTE_DEPLACEE, str_ETAT, dt_UPDATED) ORDER BY 1) FROM t_suggestion_reserve_detail WHERE lg_SUGGESTION_RESERVE_ID LIKE 'E2E-SM-%'");
const mouvements = () => q(`SELECT COUNT(*) FROM t_mouvement_reserve WHERE dt_CREATED >= '${DEBUT}'`);
const SUPPRIMEE = `SUPPRIMEE|${MOTIF_FIXE}|${MOI}|cloture`;

(async () => {
  let b = null;
  const err = [];
  let creee = null;
  try {
    ok('Précondition : un produit sans réserve pour la création, deux produits pour les lignes', !!P && AVANT_P.length === 4 && PRODUITS.length === 2, P);
    poser();
    const lignesAvant = lignes(), etatsAvant = S.map(([id]) => etat(id));
    b = await ENV_E2E.lancer(chromium);
    const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
    p.on('pageerror', (e) => err.push(e.message));
    await V.connexion(p, ENV_E2E.LOGIN, 'e2etest');

    /* a. creation par le serveur (session de l'ecran), comme le bouton de creation du volet Reserve */
    const MOTIF = Number(q("SELECT id FROM motif_suggestion_reserve WHERE actif = 1 AND (categorie = 'RAYON' OR categorie IS NULL) ORDER BY id LIMIT 1"));
    const c = await p.evaluate(async (corps) => { const r = await fetch('../api/v1/suggestion-reserve/creer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) }); return r.json(); },
      { categorie: 'RAYON', motifId: MOTIF, commentaire: 'E2E-SM-CREEE', items: [{ lg_FAMILLE_ID: P, int_QTE: 2 }] });
    creee = c.lg_SUGGESTION_RESERVE_ID;
    const refBase = creee ? q(`SELECT str_REF FROM t_suggestion_reserve WHERE lg_SUGGESTION_RESERVE_ID = '${creee}'`) : '';
    ok('a. Référence courte créée : « SR-RAY- » + 5 caractères sans 0/O/1/I/L, réponse = base', c.success === true && REF.test(refBase) && refBase.length === 12 && c.str_REF === refBase,
      JSON.stringify({ succes: c.success, msg: c.message || c.msg, reponse: c.str_REF, base: refBase }));

    /* ouverture de l'ecran par le menu */
    const menu = await p.evaluate(() => { const r = Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().findChild('id', 'reservemanager', true); return r ? [r.parentNode.get('text'), r.get('text')] : null; });
    await V.ouvrirMenu(p, menu[0], menu[1]);
    await p.waitForFunction(() => Ext.getCmp('reservemanagerID'), null, { timeout: 30000 });
    const onglet = await p.evaluate(() => Ext.getCmp('reservemanagerID').down('#ongletSuggestions').tab.getId());
    await p.click('#' + onglet);
    await p.waitForFunction(() => { const g = Ext.getCmp('reservemanagerID').down('#ongletSuggestions'); return g && g.filtreInitialise && !g.getStore().isLoading(); }, null, { timeout: 30000 });
    const G = "Ext.getCmp('reservemanagerID').down('#ongletSuggestions')";
    const affichee = await p.evaluate((id) => { const g = Ext.getCmp('reservemanagerID').down('#ongletSuggestions'), i = g.getStore().findExact('lg_SUGGESTION_RESERVE_ID', id);
      if (i < 0) { return null; } const col = g.columns.find((x) => x.dataIndex === 'str_REF'), td = g.getView().getNode(i).querySelector('.x-grid-cell-' + col.id + ' .x-grid-cell-inner');
      return { texte: td.innerText.trim(), entiere: td.scrollWidth <= td.clientWidth + 1 }; }, creee);
    ok('a. Écran = base : la grille affiche la référence courte, lisible en entier', !!affichee && affichee.texte === refBase && affichee.entiere, JSON.stringify(affichee));

    /* icone de suppression d'une ligne de la grille */
    const icone = async (id) => p.evaluate((id) => { const g = Ext.getCmp('reservemanagerID').down('#ongletSuggestions'), i = g.getStore().findExact('lg_SUGGESTION_RESERVE_ID', id);
      if (i < 0) { return null; } const img = g.getView().getNode(i).querySelector('img.sugg-suppr'); if (!img) { return null; }
      img.id = img.id || ('e2e-suppr-' + id); return { id: img.id, rouge: img.classList.contains('sugg-suppr-confirmer') }; }, id);
    const fenetres = () => p.evaluate(() => Ext.ComponentQuery.query('messagebox{isVisible()}').length);

    /* b. manuelle : premier clic, icone rouge, rien supprime ; retour seul apres 5 s */
    let i1 = await icone('E2E-SM-2');
    await p.click('#' + i1.id);
    await p.waitForTimeout(300);
    let i2 = await icone('E2E-SM-2');
    ok('b. Manuelle, premier clic : l\'icône passe au rouge, aucune fenêtre, rien supprimé', i2 && i2.rouge && await fenetres() === 0 && etat('E2E-SM-2') === etatsAvant[1], JSON.stringify(i2));
    await p.waitForTimeout(5400);
    i2 = await icone('E2E-SM-2');
    ok('b. Sans second clic : l\'icône redevient normale après 5 s, rien supprimé', i2 && !i2.rouge && etat('E2E-SM-2') === etatsAvant[1], JSON.stringify(i2));
    /* premier clic puis second clic */
    i1 = await icone('E2E-SM-2');
    await p.click('#' + i1.id);
    await p.waitForTimeout(700);
    i1 = await icone('E2E-SM-2');
    await p.click('#' + i1.id);
    await p.waitForFunction(() => !Ext.getCmp('reservemanagerID').down('#ongletSuggestions').getStore().isLoading(), null, { timeout: 20000 });
    await p.waitForTimeout(800);
    ok('b. Second clic : suggestion manuelle supprimée sans motif ni fenêtre (motif fixe, utilisateur, date de clôture)', etat('E2E-SM-2') === SUPPRIMEE && await fenetres() === 0, etat('E2E-SM-2'));
    const toast = await p.evaluate(() => Array.from(document.querySelectorAll('body *')).filter((e) => e.childElementCount === 0 && /Suggestion E2E-SM-2 supprimée/.test(e.textContent)).length);
    ok('b. Message de confirmation « Suggestion E2E-SM-2 supprimée »', toast > 0, toast);

    /* c. automatique : l'icone demande toujours le motif ; le serveur refuse sans motif */
    const i4 = await icone('E2E-SM-4');
    await p.click('#' + i4.id);
    await p.waitForFunction(() => Ext.ComponentQuery.query('messagebox{isVisible()}').length > 0, null, { timeout: 10000 }).catch(() => {});
    const demande = await p.evaluate(() => { const m = Ext.ComponentQuery.query('messagebox{isVisible()}')[0]; return m ? m.msg.getEl().dom.innerText : ''; });
    ok('c. Automatique : l\'icône demande le motif (obligatoire), rien supprimé', /Motif de la suppression \(obligatoire/.test(demande) && etat('E2E-SM-4') === etatsAvant[3], demande);
    await p.evaluate(() => { const m = Ext.ComponentQuery.query('messagebox{isVisible()}')[0]; if (m) { m.down('button[itemId=cancel]').btnEl.dom.click(); } });
    await p.waitForTimeout(400);
    const refusApi = await p.evaluate(async () => { const r = await fetch('../api/v1/suggestion-reserve/E2E-SM-4', { method: 'DELETE' }); return r.json(); });
    ok('c. Serveur : suppression d\'une automatique sans motif refusée', refusApi.success === false && /motif/i.test(refusApi.message || '') && etat('E2E-SM-4') === etatsAvant[3], JSON.stringify(refusApi));

    /* d. selection : manuelle + automatique sans motif refusee dans la barre ; manuelles seules acceptees */
    const cocher = async (id) => { const sel = await p.evaluate((id) => { const g = Ext.getCmp('reservemanagerID').down('#ongletSuggestions'), i = g.getStore().findExact('lg_SUGGESTION_RESERVE_ID', id);
      if (i < 0) { return null; } const c = g.getView().getNode(i).querySelector('.x-grid-row-checker'); c.id = c.id || ('e2e-coche-' + id); return c.id; }, id);
      if (sel) { await p.click('#' + sel); } return !!sel; };
    await cocher('E2E-SM-3'); await cocher('E2E-SM-4');
    const bouton = await p.evaluate(() => Ext.getCmp('reservemanagerID').down('#btnSupprimerSelection').getId());
    await p.click('#' + bouton);
    await p.waitForTimeout(600);
    const refus = await p.evaluate(() => { const g = Ext.getCmp('reservemanagerID').down('#ongletSuggestions'), c = g.down('#fMotifSuppression'); return { erreur: c.getActiveError(), texte: g.down('#btnSupprimerSelection').getText() }; });
    ok('d. Manuelle + automatique cochées sans motif : refus dans la barre (motif obligatoire pour l\'automatique), rien supprimé',
      /automatiques \(1\)/.test(refus.erreur || '') && refus.texte === 'Supprimer la sélection (2)' && etat('E2E-SM-3') === etatsAvant[2] && etat('E2E-SM-4') === etatsAvant[3] && await fenetres() === 0, JSON.stringify(refus));
    await cocher('E2E-SM-4'); await cocher('E2E-SM-5');
    await p.click('#' + bouton);
    await p.waitForTimeout(700);
    const conf = await p.evaluate(() => Ext.getCmp('reservemanagerID').down('#btnSupprimerSelection').getText());
    await p.click('#' + bouton);
    await p.waitForFunction(() => Ext.getCmp('reservemanagerID').down('#ongletSuggestions').dernierBilanSuppression, null, { timeout: 20000 });
    await p.waitForFunction(() => !Ext.getCmp('reservemanagerID').down('#ongletSuggestions').getStore().isLoading(), null, { timeout: 20000 });
    const bilan = await p.evaluate(() => Ext.getCmp('reservemanagerID').down('#ongletSuggestions').dernierBilanSuppression);
    ok('d. Deux manuelles cochées, sans motif : confirmation dans le bouton puis « 2 suggestion(s) supprimée(s) »',
      conf === 'Confirmer : supprimer 2 ?' && /^2 suggestion\(s\) supprimée\(s\)\.$/.test(bilan), conf + ' / ' + bilan);

    /* bilan avant / apres */
    ok('Bilan : E2E-SM-2, 3 et 5 supprimées avec le motif fixe ; E2E-SM-1 (manuelle non visée) et E2E-SM-4 (automatique) inchangées',
      ['E2E-SM-2', 'E2E-SM-3', 'E2E-SM-5'].every((id) => etat(id) === SUPPRIMEE) && etat('E2E-SM-1') === etatsAvant[0] && etat('E2E-SM-4') === etatsAvant[3],
      S.map(([id]) => id + '=' + etat(id)).join(' ; '));
    ok('Bilan : lignes de suggestion inchangées, aucun mouvement de réserve', lignes() === lignesAvant && mouvements() === '0', mouvements());
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    if (b) { await b.close(); }
    nettoyer();
    ok('Données d\'essai retirées, produit remis', q("SELECT COUNT(*) FROM t_suggestion_reserve WHERE lg_SUGGESTION_RESERVE_ID LIKE 'E2E-SM-%' OR str_COMMENTAIRE = 'E2E-SM-CREEE'") === '0'
      && q(`SELECT CONCAT_WS('|', s.int_NUMBER_AVAILABLE, s.int_NUMBER) FROM t_famille_stock s WHERE s.lg_FAMILLE_ID = '${P}' AND s.lg_EMPLACEMENT_ID = '1'`) === AVANT_P[0] + '|' + AVANT_P[1]
      && q("SELECT COUNT(*) FROM t_type_stock_famille WHERE lg_TYPE_STOCK_FAMILLE_ID = 'E2E-SM-T'") === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
