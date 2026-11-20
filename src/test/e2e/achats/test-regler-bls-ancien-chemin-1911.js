/* ANCIENNE FENETRE « REGLER LES BL » ET ONGLET « REGLEMENTS FOURNISSEURS » (plan du 19/11, point 16, suite).
 *
 * Defaut : l'ancienne fenetre (paybls.js, POST etat-control-bon/reglement) ecrivait un montant regle ABSOLU : un BL
 * regle deux fois dans l'onglet puis passe par l'ancienne fenetre perdait son cumul et son lien avec l'historique.
 * Correction : l'ancienne fenetre donne le montant regle VOULU ; ce qui manque devient un reglement « Régler les BL »
 * (historique, repartition, journal, sans caisse) ; une baisse sous les reglements de l'onglet est refusee pour tout le
 * lot, rien n'est ecrit.
 *
 * Le bouton de l'ancienne fenetre est masque a l'ecran (point 12) : le test appelle son API, comme paybls.js.
 * Jeux varies :
 *  A. BL X : 2 reglements de l'onglet (cheque 1 000, virement 2 000), puis ancienne fenetre « en partie » 5 000 :
 *     regle 5 000, historique actif = 5 000 (dont une ligne « Régler les BL » de 2 000), 1 journal ;
 *  B. ancienne fenetre « en partie » 1 500 sur X : refusee (baisse sous l'onglet), rien n'est ecrit ;
 *  C. ancienne fenetre « regle » sur X : le reste devient un reglement « Régler les BL », restant 0, statut REGLE ;
 *  D. ancienne fenetre « non regle » sur X : refusee ;
 *  E. BL Y sans reglement de l'onglet : « en partie » 4 000 puis « non regle » : le reglement « Régler les BL » est
 *     annule (journal), regle 0, restant = TTC ;
 *  F. lot mixte [Y, X] « non regle » : tout le lot est refuse, Y n'est pas touche ;
 *  rapprochement, BL par BL : onglet (bls) = « Liste des BL » (resteAPayer) = base (TTC − regle) = TTC − parts actives
 *  de l'historique ; bilan avant / apres a chaque etape (reglements, parts, journal, caisse) ; nettoyage complet.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\r/g, '').trim();
const LOGIN = ENV_E2E.LOGIN;
const ADMIN = q(`SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${LOGIN}'`);
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
const AUJ = q('SELECT CURDATE()');
const DEPART0 = q("SELECT IFNULL((SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_REGLEMENT_FRS_DATE_DEPART'), '∅')");
const DEPART = '2026-10-01';
const T = { REGL: 46, ANNUL: 47, BL: 45 };

/* grossiste avec au moins 2 BL clos depuis le depart, TTC > 10 000, aucun regle */
const G = q(`SELECT o.lg_GROSSISTE_ID FROM t_bon_livraison b JOIN t_order o ON o.lg_ORDER_ID = b.lg_ORDER_ID
  WHERE b.str_STATUT = 'is_Closed' AND b.dt_DATE_LIVRAISON >= '${DEPART}' AND b.int_HTTC > 10000
  GROUP BY o.lg_GROSSISTE_ID HAVING COUNT(*) >= 2 AND SUM(IFNULL(b.int_MONTANT_REGLE, 0)) = 0 ORDER BY COUNT(*) LIMIT 1`);
const COLS = 'b.lg_BON_LIVRAISON_ID, b.str_REF_LIVRAISON, IFNULL(b.int_HTTC, 0), IFNULL(b.int_MONTANT_REGLE, -1), IFNULL(b.int_MONTANT_RESTANT, -1), IFNULL(b.STATUS, \'∅\'), IFNULL(b.dt_REGLEMENT_DATE, \'∅\'), IFNULL((SELECT m.montantRestant FROM MvtTransaction m WHERE m.pkey = b.lg_BON_LIVRAISON_ID AND m.typeTransaction = 2 LIMIT 1), \'∅\')';
const bls = () => q(`SELECT CONCAT_WS('#', ${COLS}) FROM t_bon_livraison b JOIN t_order o ON o.lg_ORDER_ID = b.lg_ORDER_ID
  WHERE o.lg_GROSSISTE_ID = '${G}' AND b.str_STATUT = 'is_Closed' AND b.dt_DATE_LIVRAISON >= '${DEPART}' AND b.int_HTTC > 10000 ORDER BY b.dt_DATE_LIVRAISON, b.lg_BON_LIVRAISON_ID`)
  .split('\n').filter(Boolean).map((l) => { const [id, numero, ttc, regle, restant, statut, regleLe, mvtRestant] = l.split('#');
    return { id, numero, ttc: +ttc, regle: +regle, restant: +restant, statut, regleLe, mvtRestant }; });
const bl = (id) => bls().find((x) => x.id === id);
const partsActives = (id, mode) => +q(`SELECT IFNULL(SUM(p.montant), 0) FROM reglement_fournisseur_bl p JOIN reglement_fournisseur f ON f.id = p.reglement_id
  WHERE p.bl_id = '${id}' AND f.annule = 0${mode ? ` AND f.mode = '${mode}'` : ''}`);
const compte = (sql) => +q(`SELECT COUNT(*) FROM ${sql}`);
const traces = () => ({
  reglements: compte(`reglement_fournisseur WHERE created_at >= '${DEBUT}'`),
  annules: compte(`reglement_fournisseur WHERE created_at >= '${DEBUT}' AND annule = 1`),
  parts: compte(`reglement_fournisseur_bl p JOIN reglement_fournisseur f ON f.id = p.reglement_id WHERE f.created_at >= '${DEBUT}'`),
  journalRegl: compte(`t_event_log WHERE dt_CREATED >= '${DEBUT}' AND typeLog = ${T.REGL}`),
  journalAnnul: compte(`t_event_log WHERE dt_CREATED >= '${DEBUT}' AND typeLog = ${T.ANNUL}`),
  journalBl: compte(`t_event_log WHERE dt_CREATED >= '${DEBUT}' AND typeLog = ${T.BL}`),
  caisse: compte(`t_mvt_caisse WHERE lg_USER_ID = '${ADMIN}' AND dt_CREATED >= '${DEBUT}'`),
});
const diff = (a, b) => Object.keys(a).reduce((o, k) => { o[k] = b[k] - a[k]; return o; }, {});
const egal = (a, b) => JSON.stringify(a) === JSON.stringify(b);

(async () => {
  const B0 = G ? bls() : [];
  ok('Précondition : un grossiste avec 2 BL clos depuis le 01/10/2026, TTC > 10 000, aucun réglé', B0.length >= 2, G);
  if (B0.length < 2) { process.exit(1); }
  const X = B0[0], Y = B0[1];
  q(`UPDATE t_parameters SET str_VALUE = '${DEPART}' WHERE str_KEY = 'KEY_REGLEMENT_FRS_DATE_DEPART'`);
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext()).newPage();
  let etape = 'connexion';
  try {
    await connexion(p, LOGIN, 'e2etest');
    const api = (methode, url, corps) => p.evaluate(async ([m, u, c]) => { const r = await fetch(u, { method: m, headers: { 'Content-Type': 'application/json' }, body: c ? JSON.stringify(c) : undefined }); const t = await r.text(); try { return JSON.parse(t); } catch (e) { return { brut: t.slice(0, 300), http: r.status }; } }, [methode, url, corps]);
    const ancien = (ids, statut, montantRegle) => api('POST', '../api/v1/etat-control-bon/reglement', { bons: ids, statut, date: AUJ, montantRegle });
    const historiqueBl = async (id) => ((await api('GET', `../api/v1/reglements-fournisseurs/historique?dtStart=${DEPART}&dtEnd=${AUJ}&grossisteId=${G}`)).data || [])
      .filter((r) => !r.annule).flatMap((r) => (r.parts || []).filter((x) => x.blId === id).map((x) => ({ mode: r.mode, libelle: r.libelleMode, montant: x.montant })));

    /* A. deux reglements de l'onglet, puis l'ancienne fenetre */
    etape = 'A';
    const r1 = await api('POST', '../api/v1/reglements-fournisseurs/regler', { grossisteId: G, montant: 1000, date: AUJ, mode: 'CHEQUE', bls: [X.id] });
    const r2 = await api('POST', '../api/v1/reglements-fournisseurs/regler', { grossisteId: G, montant: 2000, date: AUJ, mode: 'VIREMENT', bls: [X.id] });
    ok('A. Onglet : 2 règlements sur X (1 000 + 2 000), réglé = 3 000', r1.success && r2.success && bl(X.id).regle === 3000, JSON.stringify([r1.msg, r2.msg, bl(X.id).regle]));
    let avant = traces();
    const a = await ancien([X.id], 'REGLE EN PARTIE', 5000);
    let x = bl(X.id);
    ok('A. Ancienne fenêtre « en partie » 5 000 : acceptée, réglé 5 000, restant TTC − 5 000', a.success === true && x.regle === 5000 && x.restant === X.ttc - 5000 && x.statut === 'REGLE EN PARTIE', JSON.stringify(a) + ' ' + JSON.stringify(x));
    ok('A. Cumul conservé : historique actif de X = réglé = 5 000 (onglet 3 000 + « Régler les BL » 2 000)', partsActives(X.id) === 5000 && partsActives(X.id, 'ANCIEN_ECRAN') === 2000, partsActives(X.id) + ' / ' + partsActives(X.id, 'ANCIEN_ECRAN'));
    const h = await historiqueBl(X.id);
    ok('A. Historique (écran) : 3 parts actives sur X, dont « Régler les BL » 2 000', h.length === 3 && h.some((y) => y.libelle === 'Régler les BL' && y.montant === 2000) && h.reduce((s, y) => s + y.montant, 0) === 5000, JSON.stringify(h));
    ok('A. Bilan : 1 règlement, 1 part, 1 journal de règlement, 1 trace du BL, 0 caisse', egal(diff(avant, traces()), { reglements: 1, annules: 0, parts: 1, journalRegl: 1, journalAnnul: 0, journalBl: 1, caisse: 0 }), JSON.stringify(diff(avant, traces())));

    /* B. baisse sous l'onglet : refusee */
    etape = 'B';
    avant = traces(); let fige = bls();
    const rb = await ancien([X.id], 'REGLE EN PARTIE', 1500);
    ok('B. « En partie » 1 500 sur X : refusé, message clair', rb.success === false && /onglet « Règlements fournisseurs »/.test(rb.msg || '') && (rb.msg || '').indexOf(X.numero) >= 0, rb.msg);
    ok('B. Rien n\'est écrit (BL, règlements, journal)', egal(bls(), fige) && egal(diff(avant, traces()), { reglements: 0, annules: 0, parts: 0, journalRegl: 0, journalAnnul: 0, journalBl: 0, caisse: 0 }), JSON.stringify(diff(avant, traces())));

    /* C. regle en entier */
    etape = 'C';
    avant = traces();
    const rc = await ancien([X.id], 'REGLE');
    x = bl(X.id);
    ok('C. « Réglé » sur X : réglé = TTC, restant 0, statut REGLE, mouvement d\'achat à 0', rc.success === true && x.regle === X.ttc && x.restant === 0 && x.statut === 'REGLE' && x.mvtRestant === (X.mvtRestant === '∅' ? '∅' : '0'), JSON.stringify(x));
    ok('C. Historique actif de X = TTC (nouvelle part « Régler les BL » = TTC − 5 000)', partsActives(X.id) === X.ttc && partsActives(X.id, 'ANCIEN_ECRAN') === 2000 + X.ttc - 5000, partsActives(X.id));
    ok('C. Bilan : 1 règlement, 1 part, 1 journal, 1 trace du BL, 0 caisse', egal(diff(avant, traces()), { reglements: 1, annules: 0, parts: 1, journalRegl: 1, journalAnnul: 0, journalBl: 1, caisse: 0 }), JSON.stringify(diff(avant, traces())));

    /* D. non regle sur X : refuse */
    etape = 'D';
    avant = traces(); fige = bls();
    const rd = await ancien([X.id], 'NON REGLE');
    ok('D. « Non réglé » sur X : refusé, rien n\'est écrit', rd.success === false && egal(bls(), fige) && traces().journalBl === avant.journalBl, rd.msg);

    /* E. BL sans reglement de l'onglet : hausse puis baisse */
    etape = 'E';
    avant = traces();
    const re1 = await ancien([Y.id], 'REGLE EN PARTIE', 4000);
    let y = bl(Y.id);
    ok('E. Y « en partie » 4 000 : réglé 4 000 = historique « Régler les BL »', re1.success === true && y.regle === 4000 && partsActives(Y.id) === 4000 && partsActives(Y.id, 'ANCIEN_ECRAN') === 4000, JSON.stringify(y));
    const re2 = await ancien([Y.id], 'NON REGLE');
    y = bl(Y.id);
    ok('E. Y « non réglé » : réglé 0, restant TTC, statut NON REGLE, historique actif 0', re2.success === true && y.regle === 0 && y.restant === Y.ttc && y.statut === 'NON REGLE' && y.regleLe === '∅' && partsActives(Y.id) === 0, JSON.stringify(y));
    ok('E. Bilan : 1 règlement créé puis annulé, 1 part, 1 journal de règlement, 1 d\'annulation, 2 traces du BL, 0 caisse', egal(diff(avant, traces()), { reglements: 1, annules: 1, parts: 1, journalRegl: 1, journalAnnul: 1, journalBl: 2, caisse: 0 }), JSON.stringify(diff(avant, traces())));

    /* F. lot mixte : tout ou rien */
    etape = 'F';
    await ancien([Y.id], 'REGLE EN PARTIE', 3000);
    avant = traces(); fige = bls();
    const rf = await ancien([Y.id, X.id], 'NON REGLE');
    ok('F. Lot [Y, X] « non réglé » : tout le lot est refusé, Y n\'est pas touché', rf.success === false && egal(bls(), fige) && egal(diff(avant, traces()), { reglements: 0, annules: 0, parts: 0, journalRegl: 0, journalAnnul: 0, journalBl: 0, caisse: 0 }), rf.msg);

    /* rapprochement : onglet = liste des BL = base = historique */
    etape = 'rapprochement';
    const onglet = Object.fromEntries(((await api('GET', '../api/v1/reglements-fournisseurs/bls?grossisteId=' + G)).data || []).map((z) => [z.id, z.restant]));
    const liste = Object.fromEntries(((await api('GET', `../api/v1/etat-control-bon/list?start=0&limit=500&dtStart=${DEPART}&dtEnd=${AUJ}&grossisteId=${G}&search=`)).data || []).map((z) => [z.lgBONLIVRAISONID, z.resteAPayer]));
    const ecarts = [];
    for (const z of bls()) {
      if (onglet[z.id] === undefined && z.ttc - Math.max(0, z.regle) === 0) { onglet[z.id] = 0; } /* BL solde : absent de « Saisir » */
      const base = z.ttc - Math.max(0, z.regle);
      const histo = z.ttc - partsActives(z.id);
      const mvt = z.mvtRestant === '∅' ? base : +z.mvtRestant;
      if (!(onglet[z.id] === base && liste[z.id] === base && histo === base && mvt === base && z.restant === base)) { ecarts.push(z.numero + ' onglet ' + onglet[z.id] + ' liste ' + liste[z.id] + ' base ' + base + ' restant ' + z.restant + ' mvt ' + mvt + ' histo ' + histo); }
    }
    ok('Rapprochement BL par BL (' + bls().length + ' BL) : onglet = Liste des BL = base (restant, mouvement d’achat) = TTC − historique', ecarts.length === 0, ecarts.join(' | '));
    ok('Rapprochement : X restant 0, Y restant TTC − 3 000', onglet[X.id] === 0 && onglet[Y.id] === Y.ttc - 3000, onglet[X.id] + ' / ' + onglet[Y.id]);
  } catch (e) {
    ok('Parcours sans exception (étape ' + etape + ')', false, e.stack);
  } finally {
    await b.close();
    const regs = q(`SELECT GROUP_CONCAT(CONCAT('''', id, '''')) FROM reglement_fournisseur WHERE created_at >= '${DEBUT}' AND user_id = '${ADMIN}'`);
    if (regs && regs !== 'NULL') {
      q(`DELETE FROM reglement_fournisseur_bl WHERE reglement_id IN (${regs})`);
      q(`DELETE FROM reglement_fournisseur WHERE id IN (${regs})`);
    }
    const nul = (v) => (v === '∅' ? 'NULL' : `'${v}'`);
    for (const z of B0) {
      q(`UPDATE t_bon_livraison SET int_MONTANT_REGLE = ${z.regle < 0 ? 'NULL' : z.regle}, int_MONTANT_RESTANT = ${z.restant < 0 ? 'NULL' : z.restant}, STATUS = ${nul(z.statut)}, dt_REGLEMENT_DATE = ${nul(z.regleLe)} WHERE lg_BON_LIVRAISON_ID = '${z.id}'`);
      q(`UPDATE MvtTransaction SET montantRestant = ${z.mvtRestant === '∅' ? 'NULL' : z.mvtRestant} WHERE pkey = '${z.id}' AND typeTransaction = 2`);
    }
    q(`DELETE FROM t_event_log WHERE dt_CREATED >= '${DEBUT}' AND lg_USER_ID = '${ADMIN}'`);
    q(`UPDATE t_parameters SET str_VALUE = '${DEPART0}' WHERE str_KEY = 'KEY_REGLEMENT_FRS_DATE_DEPART'`);
    ok('Nettoyage : BL, mouvements, règlements, journal et date de départ remis',
      egal(bls(), B0) && compte(`reglement_fournisseur WHERE created_at >= '${DEBUT}'`) === 0 && compte(`t_event_log WHERE dt_CREATED >= '${DEBUT}' AND lg_USER_ID = '${ADMIN}'`) === 0
      && q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_REGLEMENT_FRS_DATE_DEPART'") === DEPART0);
  }
  const ko = res.filter((z) => !z.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
