/* HISTORIQUE D'UN RETOUR FOURNISSEUR DANS L'ORDRE DES ACTIONS (defaut suspecte de la demande 59, confirme le 09/11).
 * dt_ACTION est a la seconde ; deux actions de la meme seconde etaient departagees par l'identifiant (UUID tire au
 * hasard) : l'historique de l'ecran pouvait montrer un refus avant la mise en attente.
 * Par les appels de l'ecran (admin, droit de validation) : 8 retours, chacun enchaine sans pause
 *   mise en attente → refus → remise en attente → refus → abandon,
 * puis l'historique lu par l'ecran (GET v1/retourfournisseur/{id}/historique) doit suivre cet ordre, a chaque fois ;
 * l'auteur et le motif du dernier refus (liste) sont ceux du second refus. Le test compte les retours dont deux
 * actions tombent dans la meme seconde (cas du defaut). Bilan : cinq lignes d'historique par retour, ni plus ni
 * moins ; stock et mouvements du produit inchanges. Jeu d'essai retire.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const NOTE = 'E2E-RETOUR-HISTO-ORDRE';
const CYCLES = 8;
const ORDRE = ['MISE_EN_ATTENTE', 'REFUS', 'REMISE_EN_ATTENTE', 'REFUS', 'ABANDON'];
const debut = q('SELECT NOW()');
const [BL, PRODUIT] = q("SELECT CONCAT_WS('|', b.str_REF_LIVRAISON, d.lg_FAMILLE_ID) FROM t_bon_livraison b"
  + " JOIN t_bon_livraison_detail d ON d.lg_BON_LIVRAISON_ID = b.lg_BON_LIVRAISON_ID"
  + " JOIN t_famille_stock s ON s.lg_FAMILLE_ID = d.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' AND s.int_NUMBER_AVAILABLE > 3"
  + " WHERE d.int_QTE_RECUE >= 2 AND b.str_STATUT <> 'delete'"
  + " AND (SELECT COUNT(*) FROM t_bon_livraison x WHERE x.str_REF_LIVRAISON = b.str_REF_LIVRAISON) = 1"
  + " ORDER BY b.dt_CREATED DESC LIMIT 1 OFFSET 3").split('|');
const MOTIF = q('SELECT lg_MOTIF_RETOUR FROM t_motif_retour ORDER BY lg_MOTIF_RETOUR LIMIT 1');
const stock = () => q(`SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_FAMILLE_ID = '${PRODUIT}' AND lg_EMPLACEMENT_ID = '1'`);
const mvts = () => q(`SELECT COUNT(*) FROM HMvtProduit WHERE lg_FAMILLE_ID = '${PRODUIT}'`);
const STOCK0 = stock(), MVT0 = mvts();

function retirer() {
  const ids = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT("'", lg_RETOUR_FRS_ID, "'")), "''") FROM t_retour_fournisseur WHERE str_COMMENTAIRE = '${NOTE}'`);
  const refs = q(`SELECT IFNULL(GROUP_CONCAT(str_REF_RETOUR_FRS SEPARATOR '|'), '') FROM t_retour_fournisseur WHERE str_COMMENTAIRE = '${NOTE}'`).split('|').filter(Boolean);
  exec(`DELETE FROM notification_client WHERE notification_id IN (SELECT id FROM notification WHERE entity_ref IN (${ids}));`
    + `DELETE FROM notification WHERE entity_ref IN (${ids});`
    + `DELETE FROM t_retour_fournisseur_historique WHERE lg_RETOUR_FRS_ID IN (${ids});`
    + (refs.length ? `DELETE FROM t_event_log WHERE dt_CREATED >= '${debut}' AND (` + refs.map((r) => `str_DESCRIPTION LIKE '%${r}%' OR str_TYPE_LOG = '${r}'`).join(' OR ') + ');' : '')
    + `DELETE FROM t_retour_fournisseur_detail WHERE lg_RETOUR_FRS_ID IN (${ids});`
    + `DELETE FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID IN (${ids});`);
}

(async () => {
  retirer();
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext()).newPage();
  const api = (m, u, c) => p.evaluate(async ([m, u, c]) => { const r = await fetch(u, { method: m, headers: { 'Content-Type': 'application/json' }, body: c === undefined ? undefined : JSON.stringify(c) });
    let j = null; try { j = await r.json(); } catch (e) { /* vide */ } return { status: r.status, j }; }, [m, u, c]);
  try {
    ok('Précondition : une ligne de BL en stock, un motif', !!BL && !!PRODUIT && !!MOTIF, BL + ' ' + PRODUIT);
    await p.goto((process.env.BASE || 'http://localhost:8080/prestige') + '/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });

    let enOrdre = 0, memeSeconde = 0, refusOk = 0, appelsOk = 0;
    const ecarts = [];
    for (let i = 0; i < CYCLES; i++) {
      const c = await api('POST', '../api/v1/retourfournisseur/new', { lgBONLIVRAISONID: BL, strCOMMENTAIRE: NOTE, items: [{ produitId: PRODUIT, lgMOTIFRETOUR: MOTIF, intNUMBERRETURN: 1 }] });
      const id = c.j && c.j.data && c.j.data.lgRETOURFRSID;
      const r = [];
      r.push(await api('POST', '../api/v1/retourfournisseur/mettre-en-attente', { description: NOTE, ref: id }));
      r.push(await api('POST', '../api/v1/retourfournisseur/refuser/' + id, { motif: 'Premier refus ' + i }));
      r.push(await api('POST', '../api/v1/retourfournisseur/remettre-en-attente/' + id));
      r.push(await api('POST', '../api/v1/retourfournisseur/refuser/' + id, { motif: 'Second refus ' + i }));
      r.push(await api('POST', '../api/v1/retourfournisseur/abandonner/' + id));
      if (r.every((x) => x.status === 200 && x.j && x.j.success !== false)) { appelsOk++; }
      const h = await api('GET', '../api/v1/retourfournisseur/' + id + '/historique');
      const lignes = (h.j && h.j.data) || [];
      const actions = lignes.map((l) => l.action);
      if (actions.join('>') === ORDRE.join('>')) { enOrdre++; } else { ecarts.push(i + ': ' + actions.join('>')); }
      if (new Set(lignes.map((l) => l.le)).size < lignes.length) { memeSeconde++; }
      const refus = lignes.filter((l) => l.action === 'REFUS').map((l) => l.motif);
      if (refus.join('|') === 'Premier refus ' + i + '|Second refus ' + i) { refusOk++; }
    }
    ok(`Les ${CYCLES} enchaînements d'actions sont acceptés`, appelsOk === CYCLES, appelsOk + '/' + CYCLES);
    console.log(`INFO  retours dont deux actions tombent dans la même seconde : ${memeSeconde}/${CYCLES}`);
    ok(`Historique lu par l'écran dans l'ordre des actions, pour les ${CYCLES} retours`, enOrdre === CYCLES, enOrdre + '/' + CYCLES + ' ' + ecarts.join(' ; '));
    ok('Motifs des deux refus dans l\'ordre (premier puis second)', refusOk === CYCLES, refusOk + '/' + CYCLES);
    const lignesHisto = q(`SELECT COUNT(*) FROM t_retour_fournisseur_historique h JOIN t_retour_fournisseur r ON r.lg_RETOUR_FRS_ID = h.lg_RETOUR_FRS_ID WHERE r.str_COMMENTAIRE = '${NOTE}'`);
    ok('Bilan : cinq lignes d\'historique par retour, ni plus ni moins', lignesHisto === String(5 * CYCLES), lignesHisto);
    ok('Bilan : stock et mouvements du produit inchangés', stock() === STOCK0 && mvts() === MVT0, stock() + '/' + STOCK0 + ' ' + mvts() + '/' + MVT0);
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack);
  } finally {
    await b.close();
    retirer();
    ok('Jeu d\'essai retiré', q(`SELECT COUNT(*) FROM t_retour_fournisseur WHERE str_COMMENTAIRE = '${NOTE}'`) === '0');
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
