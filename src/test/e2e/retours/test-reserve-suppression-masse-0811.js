/* PLAN DU 08/11, POINT 9a ET 9b : GESTION DES RESERVES, ONGLET « SUGGESTIONS ».
 *
 * 9a. Suppression en masse des suggestions cochees : un seul motif saisi dans la barre, confirmation dans le bouton
 *     (premier clic : « Confirmer : supprimer n ? », second clic : suppression), aucune fenetre surgissante.
 * 9b. Une suggestion encore a traiter reste affichee quelle que soit la periode (retour du 03/11) ; anterieure a la
 *     periode choisie, elle porte le repere « ancienne ».
 *
 * Jeu d'essai (references E2E-SUP-*, retire a la fin) sur l'emplacement de l'utilisateur :
 *   S1 a traiter (aujourd'hui, 2 lignes), S2 en cours (15/09/2026, ancienne), S3 a traiter (aujourd'hui),
 *   S4 traitee (non supprimable), S5 a traiter ouverte par un autre poste (verrou recent : supprimee quand meme depuis le 13/11), S6 a traiter non
 *   cochee (doit rester).
 * Bilan avant / apres (base) : S1, S2, S3, S5 passent SUPPRIMEE avec le motif, l'utilisateur et la date de cloture ; S4,
 * S6 inchangees ; aucune ligne de suggestion modifiee ; aucun mouvement de reserve ; stocks inchanges.
 * Ecran : compteur du bouton = suggestions cochees supprimables ; motif vide refuse sans rien supprimer ; le bouton
 * revient seul sans second clic ; message de bilan (4 supprimees, dont 1 ouverte sur un autre poste).
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
const PRODUITS = q(`SELECT lg_FAMILLE_ID FROM t_famille WHERE str_STATUT = 'enable' ORDER BY lg_FAMILLE_ID LIMIT 2 OFFSET 40`).split('\n');
const MOTIF = 'E2E motif suppression en masse 0811';
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
/* id, ref, statut, date de creation, verrou */
const S = [
  ['E2E-SUP-1', 'A_TRAITER', 'NOW()', null], ['E2E-SUP-2', 'EN_COURS', "'2026-09-15 09:30:00'", null], ['E2E-SUP-3', 'A_TRAITER', 'NOW()', null],
  ['E2E-SUP-4', 'TRAITEE', 'NOW()', null], ['E2E-SUP-5', 'A_TRAITER', 'NOW()', AUTRE], ['E2E-SUP-6', 'A_TRAITER', 'NOW()', null]
];
/* plan du 10/11, point 3 : une suggestion manuelle se supprime sans motif ; S1 et S2 sont automatiques pour que le motif
   reste obligatoire sur cette selection */
const AUTO = ['E2E-SUP-1', 'E2E-SUP-2'];
const nettoyer = () => q("DELETE FROM t_suggestion_reserve_detail WHERE lg_SUGGESTION_RESERVE_ID LIKE 'E2E-SUP-%'; DELETE FROM t_suggestion_reserve WHERE lg_SUGGESTION_RESERVE_ID LIKE 'E2E-SUP-%';");
function poser() {
  nettoyer();
  q(S.map(([id, st, dt, verrou]) => `INSERT INTO t_suggestion_reserve (lg_SUGGESTION_RESERVE_ID, str_REF, str_CATEGORIE, str_ORIGINE, str_STATUT, str_COMMENTAIRE, lg_EMPLACEMENT_ID,
    lg_USER_CREATEUR_ID, dt_CREATED, dt_UPDATED, lg_USER_VERROU_ID, dt_VERROU) VALUES ('${id}', '${id}', 'RAYON', '${AUTO.includes(id) ? 'AUTOMATIQUE' : 'MANUELLE'}', '${st}', 'E2E commentaire', '${EMPL}', '${MOI}', ${dt}, ${dt},
    ${verrou ? `'${verrou}'` : 'NULL'}, ${verrou ? 'NOW()' : 'NULL'});`).join('')
    + PRODUITS.map((f, i) => `INSERT INTO t_suggestion_reserve_detail (lg_SUGGESTION_RESERVE_DETAIL_ID, lg_SUGGESTION_RESERVE_ID, lg_FAMILLE_ID, int_QTE_PROPOSEE, int_QTE_RETENUE, int_QTE_DEPLACEE,
    str_ETAT, dt_CREATED, dt_UPDATED) VALUES ('E2E-SUP-1-L${i}', 'E2E-SUP-1', '${f}', ${3 + i}, ${2 + i}, 0, 'PROPOSEE', NOW(), NOW());`).join(''));
}
const etat = (id) => q(`SELECT CONCAT_WS('|', str_STATUT, IFNULL(str_COMMENTAIRE, ''), IFNULL(lg_USER_CLOTURE_ID, ''), IF(dt_CLOTURE >= '${DEBUT}', 'cloture', IFNULL(dt_CLOTURE, ''))) FROM t_suggestion_reserve WHERE lg_SUGGESTION_RESERVE_ID = '${id}'`);
const lignes = () => q("SELECT GROUP_CONCAT(CONCAT_WS(':', lg_SUGGESTION_RESERVE_DETAIL_ID, int_QTE_PROPOSEE, int_QTE_RETENUE, int_QTE_DEPLACEE, str_ETAT, dt_UPDATED) ORDER BY 1) FROM t_suggestion_reserve_detail WHERE lg_SUGGESTION_RESERVE_ID LIKE 'E2E-SUP-%'");
const stocks = () => q(`SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, ':', lg_TYPE_STOCK_ID, ':', int_NUMBER) ORDER BY 1) FROM t_type_stock_famille WHERE lg_FAMILLE_ID IN ('${PRODUITS.join("','")}')`);
const mouvements = () => q(`SELECT COUNT(*) FROM t_mouvement_reserve WHERE dt_CREATED >= '${DEBUT}'`);

(async () => {
  let b = null;
  const err = [];
  try {
    poser();
    const lignesAvant = lignes(), stocksAvant = stocks(), etatsAvant = S.map(([id]) => etat(id));
    b = await ENV_E2E.lancer(chromium);
    const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
    p.on('pageerror', (e) => err.push(e.message));
    await V.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const menu = await p.evaluate(() => { const r = Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().findChild('id', 'reservemanager', true); return r ? [r.parentNode.get('text'), r.get('text')] : null; });
    await V.ouvrirMenu(p, menu[0], menu[1]);
    await p.waitForFunction(() => Ext.getCmp('reservemanagerID'), null, { timeout: 30000 });
    /* clic sur l'onglet « Suggestions » */
    const onglet = await p.evaluate(() => Ext.getCmp('reservemanagerID').down('#ongletSuggestions').tab.getId());
    await p.click('#' + onglet);
    await p.waitForFunction(() => { const g = Ext.getCmp('reservemanagerID').down('#ongletSuggestions'); return g && g.filtreInitialise && !g.getStore().isLoading(); }, null, { timeout: 30000 });
    const grille = () => p.evaluate(() => Ext.getCmp('reservemanagerID').down('#ongletSuggestions').getStore().getRange().map((r) => r.get('lg_SUGGESTION_RESERVE_ID')));

    /* 9b : periode du jour, S2 (septembre, en cours) affichee avec le repere « ancienne », les autres non */
    const vus = await grille();
    ok('Période du jour : les suggestions d\'essai ouvertes sont listées, S2 (15/09) comprise', ['E2E-SUP-1', 'E2E-SUP-2', 'E2E-SUP-3', 'E2E-SUP-5', 'E2E-SUP-6'].every((x) => vus.includes(x)), vus.filter((x) => /E2E/.test(x)).join(','));
    const reperes = await p.evaluate(() => { const g = Ext.getCmp('reservemanagerID').down('#ongletSuggestions'), o = {};
      g.getStore().each((r, i) => { if (/^E2E-SUP/.test(r.get('lg_SUGGESTION_RESERVE_ID'))) { o[r.get('lg_SUGGESTION_RESERVE_ID')] = !!g.getView().getNode(i).querySelector('.sugg-ancienne'); } }); return o; });
    ok('Repère « ancienne » sur S2 seulement', reperes['E2E-SUP-2'] === true && Object.keys(reperes).filter((k) => reperes[k]).length === 1, JSON.stringify(reperes));

    /* 9a : cocher S1, S2, S3, S4 (traitee), S5 (verrouillee) par la case de chaque ligne */
    for (const id of ['E2E-SUP-1', 'E2E-SUP-2', 'E2E-SUP-3', 'E2E-SUP-4', 'E2E-SUP-5']) {
      const sel = await p.evaluate((id) => { const g = Ext.getCmp('reservemanagerID').down('#ongletSuggestions'); const i = g.getStore().findExact('lg_SUGGESTION_RESERVE_ID', id);
        if (i < 0) { return null; } const c = g.getView().getNode(i).querySelector('.x-grid-row-checker'); c.id = c.id || ('e2e-coche-' + id); return c.id; }, id);
      if (sel) { await p.click('#' + sel); } else { ok('Ligne ' + id + ' visible pour être cochée', false); }
    }
    const bouton = await p.evaluate(() => { const b = Ext.getCmp('reservemanagerID').down('#btnSupprimerSelection'); return { id: b.getId(), texte: b.getText(), actif: !b.isDisabled() }; });
    ok('Bouton « Supprimer la sélection (4) » : les 4 cochées supprimables (S4 traitée exclue)', bouton.actif && bouton.texte === 'Supprimer la sélection (4)', JSON.stringify(bouton));

    /* motif vide : refus dans la barre, rien de supprime */
    await p.click('#' + bouton.id);
    await p.waitForTimeout(600);
    const refusMotif = await p.evaluate(() => { const g = Ext.getCmp('reservemanagerID').down('#ongletSuggestions'); return { invalide: !!g.down('#fMotifSuppression').getActiveError() && g.down('#fMotifSuppression').getEl().dom.querySelector('.x-form-invalid-field') !== null, texte: g.down('#btnSupprimerSelection').getText(), fenetres: Ext.ComponentQuery.query('messagebox{isVisible()}').length }; });
    ok('Motif vide : champ signalé, bouton inchangé, aucune fenêtre, rien supprimé', refusMotif.invalide && refusMotif.texte === 'Supprimer la sélection (4)' && refusMotif.fenetres === 0 && etat('E2E-SUP-1').startsWith('A_TRAITER|'), JSON.stringify(refusMotif));

    /* motif saisi ; premier clic : confirmation dans le bouton ; sans second clic, il revient seul */
    await V.saisir(p, 'reservesuggestionsgrid #fMotifSuppression', MOTIF);
    await p.click('#' + bouton.id);
    await p.waitForTimeout(300);
    const conf = await p.evaluate(() => Ext.getCmp('reservemanagerID').down('#btnSupprimerSelection').getText());
    ok('Premier clic : le bouton demande « Confirmer : supprimer 4 ? » (aucune fenêtre)', conf === 'Confirmer : supprimer 4 ?' && await p.evaluate(() => Ext.ComponentQuery.query('messagebox{isVisible()}').length) === 0, conf);
    await p.waitForTimeout(5600);
    const revenu = await p.evaluate(() => Ext.getCmp('reservemanagerID').down('#btnSupprimerSelection').getText());
    ok('Sans second clic : le bouton revient après 5 s, rien supprimé', revenu === 'Supprimer la sélection (4)' && etat('E2E-SUP-1').startsWith('A_TRAITER|'), revenu);

    /* premier clic puis second clic : suppression */
    await p.click('#' + bouton.id);
    await p.waitForTimeout(700);
    await p.click('#' + bouton.id);
    await p.waitForFunction(() => Ext.getCmp('reservemanagerID').down('#ongletSuggestions').dernierBilanSuppression, null, { timeout: 20000 });
    await p.waitForFunction(() => !Ext.getCmp('reservemanagerID').down('#ongletSuggestions').getStore().isLoading(), null, { timeout: 20000 });
    const bilan = await p.evaluate(() => Ext.getCmp('reservemanagerID').down('#ongletSuggestions').dernierBilanSuppression);
    ok('Message de bilan : 4 supprimées, dont 1 ouverte sur un autre poste (S5, demande du 13/11)', bilan === '4 suggestion(s) supprimée(s) (dont 1 ouverte(s) sur un autre poste).', bilan);

    /* bilan en base */
    const apres = S.map(([id]) => etat(id));
    [0, 1, 2, 4].forEach((i) => ok(`Base : ${S[i][0]} supprimée avec le motif, l'utilisateur et la date de clôture`, apres[i] === `SUPPRIMEE|${MOTIF}|${MOI}|cloture`, apres[i]));
    [3, 5].forEach((i) => ok(`Base : ${S[i][0]} inchangée`, apres[i] === etatsAvant[i], etatsAvant[i] + ' -> ' + apres[i]));
    ok('Base : lignes de suggestion inchangées (quantités, état, date)', lignes() === lignesAvant, lignes());
    ok('Base : aucun mouvement de réserve, stocks inchangés', mouvements() === '0' && stocks() === stocksAvant, mouvements());
    const vusApres = await grille();
    ok('Écran : liste rechargée, statut SUPPRIMEE affiché pour S1 à S3, sélection vidée, bouton désactivé', await p.evaluate(() => {
      const g = Ext.getCmp('reservemanagerID').down('#ongletSuggestions'), s = g.getStore();
      const st = (id) => { const r = s.findRecord('lg_SUGGESTION_RESERVE_ID', id, 0, false, true, true); return r ? r.get('str_STATUT') : 'absente'; };
      return ['E2E-SUP-1', 'E2E-SUP-3'].every((id) => ['SUPPRIMEE', 'absente'].includes(st(id))) && g.getSelectionModel().getCount() === 0 && g.down('#btnSupprimerSelection').isDisabled();
    }), vusApres.filter((x) => /E2E/.test(x)).join(','));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    if (b) { await b.close(); }
    nettoyer();
    ok('Données d\'essai retirées', q("SELECT COUNT(*) FROM t_suggestion_reserve WHERE lg_SUGGESTION_RESERVE_ID LIKE 'E2E-SUP-%'") === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
