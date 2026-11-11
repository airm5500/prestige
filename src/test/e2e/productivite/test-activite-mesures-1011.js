/* PLAN DU 09/11, POINT 10 : MESURES DE L'ACTIVITE CORRIGEES (RAPPROCHEMENT ECRAN = API = BASE, OCTOBRE 2026).
 *
 * Par les vues (compte de test) : ANALYSE DE GESTION > Activite des equipes > Analyses, octobre 2026 saisi au clavier,
 * Actualiser. Lecture seule. Le calcul de reference est refait ici vente par vente et BL par BL depuis la base :
 *  - vitesse par operateur : mediane des secondes entre deux produits saisis, sur ses ventes mesurees (encaissees, d'au
 *    plus 1 h, d'au moins 2 lignes -- la vente et sa premiere ligne naissent a la meme seconde --, saisie = de l'ouverture
 *    a la derniere ligne sans depasser la vente, preventes reprises -- vendeur different de la caissiere -- ecartees) ; nombre de ventes mesurees ; graphique de l'ecran = API = base, operateur par operateur ;
 *  - vitesse par type de vente : meme calcul par type ;
 *  - charge au clavier par jour : ventes = somme des saisies plafonnees a 15 min, BL = de l'ouverture du BL a sa derniere
 *    ligne (BL de plus de 4 h ecartes) ; ecran (minutes) = API (secondes) = base, jour par jour ;
 *  - saisie des BL par grossiste : secondes par ligne depuis l'ouverture du BL ;
 *  - coherence : somme des ventes des jours = tuile « Ventes encaissees » ; charge des ventes d'un jour <= ventes x 15 min ;
 *    mediane entre la plus rapide et la plus lente des ventes de l'operateur ;
 *  - cas varies : plusieurs operateurs, des preventes reprises, des ventes aberrantes (ligne retouchee apres
 *    l'encaissement ou vente laissee ouverte) dans la periode ;
 *  - l'aide des cartes dit la mesure, ce qu'elle apprend et le gain ; aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer, saisir } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 600) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 28 }).replace(/\r/g, '').trim();
const D = '2026-10-01', F = '2026-11-01';
const arrondi = (x) => Math.round(x * 10) / 10;
const TYPES = { 1: 'Comptant', 2: 'Assurance', 3: 'Carnet', 4: 'Dépôt', 5: 'Dépôt' };
const mediane = (l) => { const d = l.slice().sort((a, b) => a - b); return d.length === 0 ? 0 : d.length % 2 ? d[(d.length - 1) / 2] : (d[d.length / 2 - 1] + d[d.length / 2]) / 2; };

/* references independantes, vente par vente et BL par BL */
function base() {
  const ventes = q('SELECT p.lg_USER_ID, TIMESTAMPDIFF(SECOND, p.dt_CREATED, MAX(d.dt_UPDATED)),'
    + ' TIMESTAMPDIFF(SECOND, p.dt_CREATED, COALESCE(p.completion_date, p.dt_UPDATED)), COUNT(*), DATE(COALESCE(p.completion_date, p.dt_UPDATED)),'
    + ' (p.lg_USER_VENDEUR_ID IS NOT NULL AND p.lg_USER_VENDEUR_ID <> p.lg_USER_CAISSIER_ID), p.lg_TYPE_VENTE_ID, p.b_IS_AVOIR'
    + ' FROM t_preenregistrement p JOIN t_preenregistrement_detail d ON d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID'
    + " WHERE p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 AND p.lg_TYPE_VENTE_ID <> '5'"
    + ` AND p.dt_UPDATED >= '${D}' AND p.dt_UPDATED < '${F}' AND p.dt_CREATED IS NOT NULL GROUP BY p.lg_PREENREGISTREMENT_ID`)
    .split('\n').filter(Boolean).map((l) => { const [emp, s, du, li, jour, rep, typ, av] = l.split('\t');
      return { emp, saisieBrute: Number(s), duree: Number(du), lignes: Number(li), jour, reprise: rep === '1', type: av === '1' ? 'Avoir' : (TYPES[typ] || 'Autre') }; });
  const ops = {}, types = {}, jours = {};
  let aberrantes = 0, reprises = 0;
  for (const v of ventes) {
    const retenue = v.duree >= 0 && v.duree <= 3600 && v.lignes > 0;
    const saisie = Math.max(0, Math.min(v.saisieBrute, v.duree));
    if (v.saisieBrute > v.duree || v.duree > 3600) { aberrantes++; }
    if (v.reprise) { reprises++; }
    const j = jours[v.jour] || (jours[v.jour] = { ventes: 0, saisieVentes: 0, bl: 0, saisieBl: 0 });
    j.ventes++;
    if (retenue) { j.saisieVentes += Math.min(saisie, 900); }
    for (const [m, k] of [[ops, v.emp], [types, v.type]]) {
      const o = m[k] || (m[k] = { ventes: 0, parLigne: [] });
      o.ventes++;
      if (retenue && !v.reprise && v.lignes >= 2) { o.parLigne.push(saisie / (v.lignes - 1)); }
    }
  }
  const bls = q("SELECT IFNULL(g.str_LIBELLE, '?'), TIMESTAMPDIFF(SECOND, b.dt_CREATED, MAX(d.dt_UPDATED)), DATE(MAX(d.dt_UPDATED)), COUNT(*)"
    + ' FROM t_bon_livraison b JOIN t_order o ON o.lg_ORDER_ID = b.lg_ORDER_ID LEFT JOIN t_grossiste g ON g.lg_GROSSISTE_ID = o.lg_GROSSISTE_ID'
    + ' JOIN t_bon_livraison_detail d ON d.lg_BON_LIVRAISON_ID = b.lg_BON_LIVRAISON_ID'
    + ` WHERE b.str_STATUT = 'is_Closed' AND b.dt_CREATED >= '${D}' AND b.dt_CREATED < '${F}' GROUP BY b.lg_BON_LIVRAISON_ID`)
    .split('\n').filter(Boolean).map((l) => { const [g, t, jour, li] = l.split('\t'); return { g, t: Number(t), jour, lignes: Number(li) }; });
  const gros = {};
  for (const b of bls) {
    const j = jours[b.jour] || (jours[b.jour] = { ventes: 0, saisieVentes: 0, bl: 0, saisieBl: 0 });
    j.bl++;
    if (b.t >= 0 && b.t <= 4 * 3600 && b.lignes > 0) {
      j.saisieBl += b.t;
      const x = gros[b.g] || (gros[b.g] = { bl: 0, lignes: 0, t: 0 });
      x.bl++; x.lignes += b.lignes; x.t += b.t;
    }
  }
  return { ventes: ventes.length, ops, types, jours, gros, aberrantes, reprises };
}

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const attendre = () => p.waitForFunction(() => { const a = Ext.ComponentQuery.query('activiteequipes')[0].analyses;
    return a.rendered && !(a.loadMask && a.loadMask.isVisible()) && document.querySelectorAll('.ae-tuile').length > 0; }, null, { timeout: 180000 })
    .then(() => p.waitForTimeout(1500));
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'ANALYSE DE GESTION', 'Activité des équipes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('activiteequipes').some((c) => c.isVisible(true)), null, { timeout: 60000 });
    await saisir(p, 'activiteequipes #aeDebut', '01/10/2026');
    await saisir(p, 'activiteequipes #aeFin', '31/10/2026');
    await cliquer(p, 'activiteequipes button[itemId=ae-analyses]');
    await attendre();
    const [rep] = await Promise.all([p.waitForResponse((r) => /activite-equipes\/analyses\?/.test(r.url()) && /debut=2026-10-01/.test(r.url()), { timeout: 180000 }),
      cliquer(p, 'activiteequipes #aeActualiser')]);
    const api = (await rep.json()).data;
    await attendre();
    const B = base();
    const ecran = await p.evaluate(() => { const a = Ext.ComponentQuery.query('activiteequipes')[0], st = a.st, l = (s) => s.getRange().map((r) => r.data);
      const aide = (id) => { const c = a.analyses.down('#' + id), t = c.tools && (c.tools[0] || (c.tools.items && c.tools.items[0]));
        return t ? String(t.tooltip || (t.initialConfig && t.initialConfig.tooltip) || '') : ''; };
      return { ops: l(st.operateurs), types: l(st.typesVente), jours: l(st.jours), gros: l(st.grossistes),
        ventes: Number(document.querySelector('.ae-tuile[data-code="VENTES"] .v').getAttribute('data-cible')),
        aides: { jours: aide('cJours'), ops: aide('cOperateurs'), types: aide('cTypesVente'), gros: aide('cGrossistes') } }; });

    ok('Cas variés : plusieurs opérateurs, des préventes reprises, des ventes aberrantes dans la période',
      Object.keys(B.ops).length >= 3 && B.reprises > 100 && B.aberrantes > 0, JSON.stringify({ ops: Object.keys(B.ops).length, reprises: B.reprises, aberrantes: B.aberrantes }));

    /* vitesse par operateur */
    const ecOps = Object.fromEntries(ecran.ops.map((o) => [o.id, o]));
    const ecartsOps = [];
    for (const o of api.operateurs) {
      const r = B.ops[o.id] || { ventes: 0, parLigne: [] };
      const med = arrondi(mediane(r.parLigne));
      const e = ecOps[o.id];
      if (o.secondesParLigne !== med || o.ventesMesurees !== r.parLigne.length || o.ventes !== r.ventes || (e && (e.secondesParLigne !== med || e.ventesMesurees !== r.parLigne.length))) {
        ecartsOps.push({ id: o.id.slice(0, 6), api: o.secondesParLigne + '/' + o.ventesMesurees, ecran: e ? e.secondesParLigne + '/' + e.ventesMesurees : '-', base: med + '/' + r.parLigne.length });
      }
    }
    ok('Vitesse par opérateur : médiane et ventes mesurées, écran = API = base, opérateur par opérateur', ecartsOps.length === 0 && api.operateurs.length === Object.keys(B.ops).length
      && ecran.ops.length === Math.min(15, api.operateurs.length), JSON.stringify(ecartsOps.slice(0, 5)));
    const bornes = api.operateurs.filter((o) => B.ops[o.id].parLigne.length).every((o) => { const l = B.ops[o.id].parLigne;
      return o.secondesParLigne >= arrondi(Math.min(...l)) && o.secondesParLigne <= arrondi(Math.max(...l)) && o.secondesParLigne <= 3600; });
    ok('Cohérence : chaque médiane est entre la vente la plus rapide et la plus lente de l\'opérateur, jamais plus d\'une heure par ligne', bornes);

    /* vitesse par type */
    const ecartsTypes = api.typesVente.filter((t) => { const r = B.types[t.nom] || { parLigne: [], ventes: 0 }; const e = ecran.types.find((x) => x.id === t.id);
      return t.secondesParLigne !== arrondi(mediane(r.parLigne)) || t.ventes !== r.ventes || !e || e.secondesParLigne !== t.secondesParLigne; })
      .map((t) => t.nom + ' ' + t.secondesParLigne + ' / ' + arrondi(mediane((B.types[t.nom] || { parLigne: [] }).parLigne)));
    ok('Vitesse par type de vente : même calcul, écran = API = base, type par type', ecartsTypes.length === 0 && api.typesVente.length >= 2, ecartsTypes.join(' ; '));

    /* charge au clavier par jour */
    const ecartsJours = [];
    for (const j of api.jours) {
      const r = B.jours[j.date] || {};
      const e = ecran.jours.find((x) => x.libelle === j.date.slice(8, 10) + '/' + j.date.slice(5, 7));
      if (j.saisieVentes !== r.saisieVentes || j.saisieBl !== r.saisieBl || j.ventes !== r.ventes || j.bl !== r.bl || !e
        || e.saisieVentes !== Math.round(r.saisieVentes / 6) / 10 || e.saisieBl !== Math.round(r.saisieBl / 6) / 10) {
        ecartsJours.push({ jour: j.date, api: [j.ventes, j.saisieVentes, j.bl, j.saisieBl], base: [r.ventes, r.saisieVentes, r.bl, r.saisieBl], ecran: e && [e.saisieVentes, e.saisieBl] });
      }
    }
    ok('Charge au clavier : ventes (saisie plafonnée à 15 min) et BL (depuis l\'ouverture du BL), écran = API = base, jour par jour',
      ecartsJours.length === 0 && api.jours.length >= 20 && api.jours.some((j) => j.saisieBl > 0), JSON.stringify(ecartsJours.slice(0, 4)));
    ok('Cohérence : somme des ventes des jours = tuile « Ventes encaissées » = base ; charge d\'un jour ≤ ventes × 15 min',
      api.jours.reduce((s, j) => s + j.ventes, 0) === ecran.ventes && ecran.ventes === B.ventes && api.jours.every((j) => j.saisieVentes <= j.ventes * 900),
      JSON.stringify({ jours: api.jours.reduce((s, j) => s + j.ventes, 0), tuile: ecran.ventes, base: B.ventes }));

    /* grossistes */
    const ecartsGros = api.grossistes.filter((g) => { const r = B.gros[g.nom]; return !r || g.bl !== r.bl || g.secondesParLigne !== arrondi(r.t / r.lignes); })
      .map((g) => g.nom + ' ' + g.secondesParLigne + ' / ' + (B.gros[g.nom] ? arrondi(B.gros[g.nom].t / B.gros[g.nom].lignes) : '-'));
    ok('Saisie des BL par grossiste : secondes par ligne depuis l\'ouverture du BL, API = base', ecartsGros.length === 0 && api.grossistes.length === Object.keys(B.gros).length
      && ecran.gros.length === api.grossistes.length, ecartsGros.join(' ; '));

    /* l'aide dit la mesure, l'apprentissage et le gain */
    const a = ecran.aides;
    ok('Aide des cartes : mesure, ce que cela apprend, gain (charge, vitesse par opérateur, par type) ; BL depuis l\'ouverture',
      [a.jours, a.ops, a.types].every((t) => /Mesure/.test(t) && /Ce que cela apprend/.test(t) && /Gain/.test(t)) && /15 min/.test(a.jours)
      && /médian/.test(a.ops) && /deux produits/.test(a.ops) && /préventes reprises/.test(a.ops) && /ouverture du BL/.test(a.gros) && !/de la commande/.test(a.gros), JSON.stringify(a).slice(0, 300));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
