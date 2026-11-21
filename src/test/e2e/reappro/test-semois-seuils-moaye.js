/* SEUILS SEMOIS NON CALCULES (Moaye, analyse du 21/11, corrections validees le 21/11).
 *  Defaut 1 : en SEMOIS ABC et par produit, seuls les produits vendus dans la fenetre etaient traites ; les autres
 *             gardaient d'anciennes valeurs (Moaye : 4 064 produits restes a seuil 100 / quantite 1 de la reprise).
 *  Defaut 2 : la consommation par semaine etait divisee par Q3 x 4 meme quand la fenetre comptait moins de Q3 mois
 *             (Moaye : un mois de ventes divise par 12 semaines, seuils trois fois trop bas).
 *  Correction : diviser par les mois reellement retenus (trois modes) ; en ABC et par produit, produits actifs sans vente
 *             a seuil et quantite 0 (bool_CALCUL_SEUIL respecte) ; en ABC, sans classe = SEMOIS standard.
 *
 * Parcours de l'ecran : connexion, Fiche article, bouton « Recalculer seuils », Oui, message de fin. Le serveur doit
 * tourner en reappro.mode=semois. Le poste local est en « default » : ne pas toucher a son dicisms.properties, mais
 * lancer un domaine d'essai isole (21/11 : domain4) avec l'option JVM -Duser.home=D:\essai-semois\home, dont
 * Documents\dicisms.properties ne contient que « application.mode=client » et « reappro.mode=semois », et son pool
 * pointe sur la base d'essai. Remettre le domaine en l'etat apres le test.
 * Cas de Moaye reproduit sur le banc : calendrier d'aout et septembre 2026 ramene sous 20 jours, la fenetre se reduit a
 * octobre ; tous les produits actifs partent des valeurs de la reprise (seuil 100, quantite 1).
 *
 * Controles :
 *  A. ABC, fenetre d'un mois : chaque produit actif (hors details) = calcul attendu, recalcule ici independamment
 *     (classe ou repli standard, vendu ou non, un mois = 4 semaines) ; bool_CALCUL_SEUIL = 0 laisse intact (vendu et
 *     non vendu) ; rapprochement base = journal semois_abc (seuil, quantite, mois retenus) = grille de la Fiche article ;
 *  B. standard, fenetre d'un mois : produits simples vendus = conso / 4 semaines x Q ; produits actifs sans vente a 0
 *     (decision du 21/11 : « oui aussi en standard »), bool_CALCUL_SEUIL respecte ; rapprochement base = journal
 *     semois_normal ; second recalcul sans aucune reecriture ;
 *  C. par produit, fenetre d'un mois : Q de la fiche ou Q globaux, non vendus a 0 ;
 *  D. ABC, historique complet (3 mois) : identique a l'ancien calcul (aucune regression) ;
 *  E, F. parametre SEMOIS_DIVISEUR_MOIS_REELS a 0 : ancienne formule ; non vendus a 0 en ABC et en standard ;
 *  bilan : aucune autre colonne ni table modifiee ; tout est remis a l'identique (CHECKSUM).
 * Lancement seul : node src/test/e2e/reappro/test-semois-seuils-moaye.js
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const ENV_E2E = require('../outils/poste');
const V = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 28 }).replace(/\r/g, '').trim();
const lignes = (s) => { const t = q(s); return t ? t.split('\n').map((l) => l.split('\t')) : []; };
const SAUV = 'e2e_semois_sauv';
const PARAMS = ['SEMOIS', 'SEMOIS_ABC', 'SEMOIS_PAR_PRODUIT', 'SEMOIS_DIVISEUR_MOIS_REELS', 'Q1', 'Q2', 'Q3', 'KEY_DAY_SEUIL_REAPPRO'];
const AUJ = new Date().toISOString().slice(0, 10);
const JOURNAUX = 'D:/prestige/reappro_logs';
/* t_famille : son declencheur pose dt_UPDATED = NOW() a chaque UPDATE (aucune restauration possible, comme dans les autres
   tests) et ajoute une ligne a t_famille_history (retiree a la fin) : l'empreinte porte sur toutes les autres colonnes */
const COLS_FAMILLE = q("SELECT GROUP_CONCAT(CONCAT('IFNULL(`', COLUMN_NAME, '`, ''~'')') ORDER BY ORDINAL_POSITION SEPARATOR ',') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_famille' AND COLUMN_NAME <> 'dt_UPDATED'");
const EMPREINTE = () => q(`SELECT CONCAT(COUNT(*), ':', SUM(CRC32(CONCAT_WS('|', ${COLS_FAMILLE})))) FROM t_famille`) + ','
  + q('CHECKSUM TABLE t_parameters, t_calendrier, t_classe_abc, t_famille_history').split('\n').map((l) => l.split('\t')[1]).join(',');
const PARAMETRES = () => new Map(lignes("SELECT str_KEY, CONCAT_WS('|', str_VALUE, dt_UPDATED, str_STATUT) FROM t_parameters"));

/* mois de la fenetre : les trois mois pleins precedant le mois en cours */
const moisAvant = (n) => { const d = new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - n); return d.toISOString().slice(0, 7); };
const FENETRE = [moisAvant(3), moisAvant(2), moisAvant(1)];

function sauvegarder() {
  if (q(`SHOW TABLES LIKE '${SAUV}'`)) { restaurer(); }
  q(`CREATE TABLE ${SAUV} AS SELECT lg_FAMILLE_ID, int_SEUIL_MIN, int_STOCK_REAPROVISONEMENT, int_QTE_REAPPROVISIONNEMENT, bool_CALCUL_SEUIL, int_Q1_SEUIL_REAPPRO, int_Q2_QTE_REAPPRO, lg_CLASSE_ABC_ID FROM t_famille;
    ALTER TABLE ${SAUV} ADD PRIMARY KEY (lg_FAMILLE_ID);
    CREATE TABLE ${SAUV}_p AS SELECT * FROM t_parameters WHERE str_KEY IN (${PARAMS.map((x) => `'${x}'`).join(',')});
    CREATE TABLE ${SAUV}_c AS SELECT * FROM t_calendrier;`);
}
function restaurer() {
  q(`UPDATE t_famille f JOIN ${SAUV} s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID SET f.int_SEUIL_MIN = s.int_SEUIL_MIN, f.int_STOCK_REAPROVISONEMENT = s.int_STOCK_REAPROVISONEMENT,
      f.int_QTE_REAPPROVISIONNEMENT = s.int_QTE_REAPPROVISIONNEMENT, f.bool_CALCUL_SEUIL = s.bool_CALCUL_SEUIL, f.int_Q1_SEUIL_REAPPRO = s.int_Q1_SEUIL_REAPPRO, f.int_Q2_QTE_REAPPRO = s.int_Q2_QTE_REAPPRO, f.lg_CLASSE_ABC_ID = s.lg_CLASSE_ABC_ID;
    DELETE FROM t_parameters WHERE str_KEY IN (${PARAMS.map((x) => `'${x}'`).join(',')}); INSERT INTO t_parameters SELECT * FROM ${SAUV}_p;
    DELETE FROM t_calendrier; INSERT INTO t_calendrier SELECT * FROM ${SAUV}_c;
    DROP TABLE ${SAUV}; DROP TABLE ${SAUV}_p; DROP TABLE ${SAUV}_c;`);
}
const param = (k, v) => q(`UPDATE t_parameters SET str_VALUE = '${v}' WHERE str_KEY = '${k}'`);
/* cas de Moaye : aout et septembre sous 20 jours (fenetre = octobre seul), ou historique complet */
const calendrier = (court) => q(`UPDATE t_calendrier t JOIN ${SAUV}_c s ON s.lg_CALENDRIER_ID = t.lg_CALENDRIER_ID SET t.int_NUMBER_JOUR = `
  + (court ? `IF(DATE_FORMAT(t.dt_day, '%Y-%m') IN ('${FENETRE[0]}', '${FENETRE[1]}'), 5, s.int_NUMBER_JOUR)` : 's.int_NUMBER_JOUR'));
/* valeurs de la reprise sur tous les produits actifs */
const reprise = () => q(`UPDATE t_famille SET int_SEUIL_MIN = 100, int_STOCK_REAPROVISONEMENT = 100, int_QTE_REAPPROVISIONNEMENT = 1 WHERE str_STATUT = 'enable'`);

/* consommation mensuelle en equivalent boite, par produit effectif (meme lecture que le calcul) */
function consoMensuelle() {
  const m = new Map();
  for (const [id, ym, v] of lignes(`SELECT t.eff_id, t.ym, SUM(t.qty_equiv) FROM (SELECT CASE WHEN f.bool_DECONDITIONNE=1 AND f.lg_FAMILLE_PARENT_ID IS NOT NULL AND f.lg_FAMILLE_PARENT_ID<>''
      THEN f.lg_FAMILLE_PARENT_ID ELSE f.lg_FAMILLE_ID END AS eff_id, DATE_FORMAT(p.dt_UPDATED,'%Y-%m') AS ym,
      CASE WHEN f.bool_DECONDITIONNE=1 AND f.lg_FAMILLE_PARENT_ID IS NOT NULL AND f.lg_FAMILLE_PARENT_ID<>'' THEN d.int_QUANTITY/COALESCE(NULLIF(parent.int_NUMBERDETAIL,0),1) ELSE d.int_QUANTITY END AS qty_equiv
      FROM t_preenregistrement p JOIN t_preenregistrement_detail d ON p.lg_PREENREGISTREMENT_ID=d.lg_PREENREGISTREMENT_ID JOIN t_famille f ON f.lg_FAMILLE_ID=d.lg_FAMILLE_ID
      LEFT JOIN t_famille parent ON parent.lg_FAMILLE_ID=f.lg_FAMILLE_PARENT_ID
      WHERE p.str_STATUT='is_Closed' AND p.int_PRICE>0 AND p.lg_TYPE_VENTE_ID<>'5' AND f.str_STATUT='enable' AND DATE(p.dt_UPDATED) BETWEEN '${FENETRE[0]}-01' AND LAST_DAY('${FENETRE[2]}-01')) t GROUP BY t.eff_id, t.ym`)) {
    if (!m.has(id)) { m.set(id, {}); }
    m.get(id)[ym] = parseFloat(v);
  }
  return m;
}
/* produits actifs hors details : id, classe, Q1/Q2 de la fiche, calcul autorise, CIP, simple (ni boite ni detail) */
const actifs = () => lignes(`SELECT lg_FAMILLE_ID, IFNULL(lg_CLASSE_ABC_ID, ''), IFNULL(int_Q1_SEUIL_REAPPRO, 0), IFNULL(int_Q2_QTE_REAPPRO, 0), IFNULL(bool_CALCUL_SEUIL, 1), int_CIP, IFNULL(bool_DECONDITIONNE_EXIST, 0)
  FROM t_famille WHERE str_STATUT='enable' AND IFNULL(bool_DECONDITIONNE, 0) = 0`);
const etat = () => new Map(lignes(`SELECT lg_FAMILLE_ID, int_SEUIL_MIN, int_STOCK_REAPROVISONEMENT, int_QTE_REAPPROVISIONNEMENT FROM t_famille WHERE str_STATUT='enable'`).map((r) => [r[0], r.slice(1).map(Number)]));
/* seuil et quantite attendus (meme arithmetique que le serveur : conso / semaines, puis x Q, arrondi superieur) */
/* diviseurMois : absent = mois reellement retenus (defaut) ; sinon Q3 (SEMOIS_DIVISEUR_MOIS_REELS = 0, ancienne formule) */
function attendu(parMois, nbMois, q1, q2, diviseurMois) {
  const fen = FENETRE.slice(3 - nbMois);
  let total = 0;
  for (const m of fen) { if (parMois && parMois[m] !== undefined) { total += parMois[m]; } }
  const c = total / ((diviseurMois || fen.length) * 4);
  return [Math.ceil(c * q1), Math.ceil(c * q2)];
}

/* comparaison ligne par ligne ; retourne les ecarts (10 premiers) */
function comparer(prods, base, calc) {
  const ecarts = [];
  let n = 0;
  for (const p of prods) {
    const att = calc(p);
    if (!att) { continue; }
    n++;
    const b = base.get(p[0]);
    if (!b || b[0] !== att[0] || b[1] !== att[0] || b[2] !== att[1]) { ecarts.push(p[5] + ' base ' + (b || []).join('/') + ' attendu ' + att[0] + '/' + att[0] + '/' + att[1]); }
  }
  return { n, ecarts };
}

async function recalculer(p, nom) {
  await V.cliquer(p, 'famillemanager button[text=Recalculer seuils]');
  await V.attendreMessage(p, 'Lancer le recalcul', 10000);
  const t0 = Date.now();
  await V.repondre(p, 'yes');
  let msg = null;
  for (const fin = Date.now() + 20 * 60000; Date.now() < fin && !msg; await p.waitForTimeout(1000)) {
    const t = await V.texteMessage(p);
    if (/terminé|échoué/.test(t)) { msg = t; }
  }
  const ms = Date.now() - t0;
  await V.repondre(p, 'ok').catch(() => {});
  ok(nom + ' : recalcul lancé par le bouton, message de fin affiché (' + Math.round(ms / 1000) + ' s)', !!msg && /terminé/.test(msg), msg);
}

(async () => {
  const histoMax = q('SELECT IFNULL(MAX(lg_ID), 0) FROM t_famille_history');
  const avant = EMPREINTE(), paramsAvant = PARAMETRES();
  const journal = path.join(JOURNAUX, 'semois_abc_' + AUJ + '.json');
  const journaux = ['semois_abc', 'semois_normal', 'semois_par_produit'].map((m) => path.join(JOURNAUX, m + '_' + AUJ + '.json')).filter((f) => !fs.existsSync(f));
  sauvegarder();
  const conso = consoMensuelle();
  const classes = new Map(lignes(`SELECT lg_CLASSE_ABC_ID, int_Q1, int_Q2, int_Q3, str_UNITE_CALCUL FROM t_classe_abc WHERE str_STATUT='enable'`).map((r) => [r[0], r.slice(1)]));
  const G = Object.fromEntries(lignes(`SELECT str_KEY, str_VALUE FROM t_parameters WHERE str_KEY IN ('Q1','Q2','Q3')`).map(([k, v]) => [k, +v]));
  let prods = actifs();
  /* produits non vendus avec classe (Moaye : 320, dont A, B et C) : le banc n'en a pas, 30 en recoivent une */
  const sansVente = prods.filter((x) => !conso.has(x[0])).slice(0, 30).map((x) => x[0]);
  sansVente.forEach((id, i) => q(`UPDATE t_famille SET lg_CLASSE_ABC_ID = '${['ABC_CLASSE_A', 'ABC_CLASSE_B', 'ABC_CLASSE_C'][i % 3]}' WHERE lg_FAMILLE_ID = '${id}'`));
  /* produits vendus sans classe (Moaye en a parmi les calcules) : 10 produits vendus perdent leur classe */
  const venduSansClasse = prods.filter((x) => x[1] && conso.has(x[0]) && conso.get(x[0])[FENETRE[2]] > 1).slice(0, 10).map((x) => x[0]);
  q(`UPDATE t_famille SET lg_CLASSE_ABC_ID = NULL WHERE lg_FAMILLE_ID IN (${venduSansClasse.map((x) => `'${x}'`).join(',')})`);
  prods = actifs();
  /* jeu d'essai : calcul interdit sur un produit vendu et un non vendu de chaque sorte (classe, sans classe) */
  const vendus = prods.filter((x) => conso.has(x[0]) && conso.get(x[0])[FENETRE[2]] > 1);
  const nonVendus = prods.filter((x) => !conso.has(x[0]));
  const interdits = [vendus.find((x) => x[1]), vendus.find((x) => !x[1]), nonVendus.find((x) => x[1]), nonVendus.find((x) => !x[1])].filter(Boolean).map((x) => x[0]);
  q(`UPDATE t_famille SET bool_CALCUL_SEUIL = 0 WHERE lg_FAMILLE_ID IN (${interdits.map((x) => `'${x}'`).join(',')})`);
  /* Q de fiche varies pour le mode par produit : 0 (repli global), 1, 3, 5 */
  q(`UPDATE t_famille SET int_Q1_SEUIL_REAPPRO = CASE MOD(CRC32(lg_FAMILLE_ID), 4) WHEN 0 THEN 0 WHEN 1 THEN 1 WHEN 2 THEN 3 ELSE 5 END,
     int_Q2_QTE_REAPPRO = CASE MOD(CRC32(lg_FAMILLE_ID), 3) WHEN 0 THEN 0 WHEN 1 THEN 2 ELSE 4 END WHERE str_STATUT='enable'`);
  prods = actifs();
  const libre = (x) => x[4] !== '0';
  const vendusL = prods.filter((x) => conso.has(x[0]) && conso.get(x[0])[FENETRE[2]] > 1);
  const nonVendusL = prods.filter((x) => !conso.has(x[0]));
  ok('Jeu d\'essai : produits vendus en ' + FENETRE[2] + ', non vendus, avec et sans classe, calcul interdit',
    vendus.length > 100 && nonVendus.length > 100 && interdits.length === 4 && venduSansClasse.length === 10 && prods.some((x) => x[1] && !conso.has(x[0])) && prods.some((x) => !x[1] && conso.has(x[0])),
    prods.length + ' actifs, ' + vendus.length + ' vendus, ' + nonVendus.length + ' non vendus, interdits ' + interdits.length);

  /* parametre de la methode de division (migration V7.6.41.2111) : valeur 1 par defaut, descriptif valide le 21/11 dans
     t_parameters et dans l'explication de l'ecran des parametres */
  const DESCRIPTIF = 'Méthode de division du calcul SEMOIS (standard, ABC, par produit). 1 = les ventes sont divisées par le nombre de mois réellement présents dans l\'historique × 4 semaines (valeur par défaut, adaptée à une officine qui démarre). 0 = ancienne formule : division par Q3 × 4 semaines, quel que soit l\'historique disponible.';
  const pd = lignes("SELECT str_VALUE, str_DESCRIPTION FROM " + SAUV + "_p WHERE str_KEY = 'SEMOIS_DIVISEUR_MOIS_REELS'")[0];
  let regle = null;
  try { regle = JSON.parse(execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', '-sN', '--raw', ENV_E2E.BASE, '-e',
    "SELECT explication FROM parametre_explication WHERE str_KEY = 'SEMOIS_DIVISEUR_MOIS_REELS'"], { encoding: 'utf8' }).trim()).regle; } catch (e) { /* absent */ }
  ok('Paramètre SEMOIS_DIVISEUR_MOIS_REELS créé à 1, descriptif validé dans t_parameters et dans son explication', !!pd && pd[0] === '1' && pd[1] === DESCRIPTIF && regle === DESCRIPTIF,
    JSON.stringify(pd || null).slice(0, 120) + ' / ' + String(regle).slice(0, 80));

  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1500, height: 900 } })).newPage();
  try {
    await V.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const parent = await p.evaluate(() => { let t = null; Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().cascadeBy((n) => { if (n.get('id') === 'famillemanager') { t = n.parentNode.get('text'); } }); return t; });
    await V.ouvrirEcran(p, (parent || '').replace(/<[^>]+>/g, '').trim(), 'Fiche Article', 'famillemanager');
    await p.waitForFunction(() => Ext.ComponentQuery.query('famillemanager button[text=Recalculer seuils]').some((c) => c.isVisible(true)), null, { timeout: 60000 });
    /* rapprochement base / service de l'ecran des parametres : valeur, descriptif et explication du nouveau parametre */
    const vu = await p.evaluate(async () => ((await (await fetch('../api/v1/app-params/liste?start=0&limit=0')).json()).results || []).find((x) => x.str_KEY === 'SEMOIS_DIVISEUR_MOIS_REELS') || null);
    let regleVue = null;
    try { regleVue = JSON.parse(vu.explication).regle; } catch (e) { /* absente */ }
    ok('Écran des paramètres (service de la liste) : SEMOIS_DIVISEUR_MOIS_REELS, valeur, descriptif et explication = base', !!vu && vu.str_VALUE === pd[0]
      && vu.str_DESCRIPTION === DESCRIPTIF && regleVue === DESCRIPTIF, JSON.stringify(vu).slice(0, 200));
    /* migration V7.6.41.2112 : l'explication rappelle la remise a zero des non vendus, dans les trois modes */
    const RAPPEL = 'Dans les trois modes, un produit actif sans vente sur les mois retenus passe à seuil 0 et quantité 0, sauf si le calcul du seuil est désactivé sur sa fiche.';
    let rappelsVus = [];
    try { rappelsVus = JSON.parse(vu.explication).rappels || []; } catch (e) { /* absente */ }
    ok('Écran des paramètres : l\'explication rappelle les non vendus à 0 dans les trois modes (une seule fois)', rappelsVus.filter((x) => x === RAPPEL).length === 1, rappelsVus.length + ' rappels');

    /* A. SEMOIS ABC, fenetre d'un mois (Moaye) */
    param('SEMOIS', 1); param('SEMOIS_ABC', 1); param('SEMOIS_PAR_PRODUIT', 0); param('SEMOIS_DIVISEUR_MOIS_REELS', 1);
    calendrier(true); reprise();
    const hA = q('SELECT IFNULL(MAX(lg_ID), 0) FROM t_famille_history');
    await recalculer(p, 'A. ABC, un mois');
    let base = etat();
    const changes = [...base.values()].filter((v) => v.join('/') !== '100/100/1').length;
    const histoA = q('SELECT COUNT(*) FROM t_famille_history WHERE lg_ID > ' + hA);
    ok('A. bilan : une ligne d\'historique par fiche dont le seuil change, aucune pour les autres', +histoA === changes, histoA + ' lignes, ' + changes + ' fiches changées');
    const calcAbc = (nbMois) => (x) => {
      if (!libre(x)) { return null; }
      const c = classes.get(x[1]);
      const q1 = c ? +c[0] : G.Q1, q2 = c ? +c[1] : G.Q2, q3 = c ? (+c[2] > 0 ? +c[2] : G.Q3) : G.Q3;
      return attendu(conso.get(x[0]), Math.min(q3, nbMois), q1, q2);
    };
    const vendOct = (x) => !!conso.get(x[0]) && conso.get(x[0])[FENETRE[2]] > 0;
    const groupes = [['vendus en ' + FENETRE[2] + ' avec classe', (x) => classes.has(x[1]) && vendOct(x)], ['vendus en ' + FENETRE[2] + ' sans classe (standard)', (x) => !classes.has(x[1]) && vendOct(x)],
      ['non vendus en ' + FENETRE[2] + ' avec classe : 0/0', (x) => classes.has(x[1]) && !vendOct(x)], ['non vendus en ' + FENETRE[2] + ' sans classe : 0/0', (x) => !classes.has(x[1]) && !vendOct(x)]];
    for (const [nom, f] of groupes) {
      const r = comparer(prods.filter(f), base, calcAbc(1));
      ok('A. ' + nom + ' : ' + r.n + ' produits = calcul attendu (un mois = 4 semaines)', r.n > 0 && r.ecarts.length === 0, r.ecarts.length + ' écarts : ' + r.ecarts.slice(0, 5).join(' ; '));
    }
    ok('A. calcul interdit (bool_CALCUL_SEUIL = 0) : vendus et non vendus restent à 100 / 1', interdits.every((id) => (base.get(id) || []).join('/') === '100/100/1'), interdits.map((id) => base.get(id)).join(' ; '));
    const cip = (id) => prods.find((x) => x[0] === id)[5];
    const exemple = vendusL.filter((x) => libre(x) && classes.has(x[1])).sort((u, v) => conso.get(v[0])[FENETRE[2]] - conso.get(u[0])[FENETRE[2]])[0];
    ok('A. exemple : ' + exemple[5] + ' (' + conso.get(exemple[0])[FENETRE[2]] + ' vendus en ' + FENETRE[2] + ', classe ' + exemple[1] + ') seuil = conso / 4 x Q1',
      base.get(exemple[0])[0] === attendu(conso.get(exemple[0]), 1, +classes.get(exemple[1])[0], 0)[0], base.get(exemple[0]).join('/'));
    /* rapprochement : journal de calcul */
    let lu = null; // relu en E
    try { lu = JSON.parse(fs.readFileSync(journal, 'utf8')); } catch (e) { /* absent */ }
    const parId = new Map((lu || []).map((o) => [o.produitId, o]));
    const ecartsJ = prods.filter(libre).filter((x) => { const o = parId.get(x[0]); const bb = base.get(x[0]); return !o || o.seuilMini !== bb[0] || o.quantiteReappro !== bb[2] || o.moisRetenus !== 1; });
    ok('A. rapprochement journal semois_abc = base, pour chaque produit actif (seuil, quantité, 1 mois retenu)', lu && ecartsJ.length === 0,
      (lu ? lu.length + ' entrées, ' : 'journal absent, ') + ecartsJ.length + ' écarts ' + ecartsJ.slice(0, 3).map((x) => x[5] + ' ' + JSON.stringify(parId.get(x[0]) || null)).join(' ; '));
    /* rapprochement : grille de la Fiche article (colonnes Seuil et Qte.Reap) */
    const temoins = [exemple, nonVendusL.find((x) => libre(x) && classes.has(x[1])), nonVendusL.find((x) => libre(x) && !x[1]), vendusL.find((x) => libre(x) && !x[1])].filter(Boolean);
    const vus = [];
    for (const x of temoins) {
      await V.cliquer(p, 'famillemanager textfield[emptyText=Recherche]');
      await p.keyboard.press('Control+A');
      await p.keyboard.type(x[5], { delay: 20 });
      await p.keyboard.press('Enter');
      await p.waitForFunction((c) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; const s = g && g.getStore();
        return s && !s.isLoading() && s.getCount() > 0 && s.getRange().some((r) => String(r.get('int_CIP')) === c); }, x[5], { timeout: 30000 }).catch(() => {});
      const cellules = await p.evaluate((c) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; const r = g.getStore().getRange().find((y) => String(y.get('int_CIP')) === c);
        if (!r) { return null; } const ligne = g.getView().getNode(r); const cols = g.headerCt.getGridColumns();
        const txt = (di) => { const col = cols.find((y) => y.dataIndex === di); const td = col && ligne && ligne.querySelector('.x-grid-cell-' + col.id); return td ? td.textContent.trim() : null; };
        return [txt('int_STOCK_REAPROVISONEMENT'), txt('int_QTE_REAPPROVISIONNEMENT')]; }, x[5]);
      vus.push(x[5] + ' écran ' + (cellules || []).join('/') + ' base ' + base.get(x[0])[1] + '/' + base.get(x[0])[2]);
      if (!cellules || cellules[0] !== String(base.get(x[0])[1]) || cellules[1] !== String(base.get(x[0])[2])) { vus.push('ÉCART'); }
    }
    ok('A. rapprochement écran Fiche article (Seuil, Qte.Reap) = base, vendus et non vendus, avec et sans classe', temoins.length >= 3 && !vus.includes('ÉCART'), vus.join(' ; '));
    /* bilan : seules les colonnes de seuil des produits actifs ont bouge */
    const autres = q(`SELECT COUNT(*) FROM t_famille f JOIN ${SAUV} s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID WHERE f.str_STATUT <> 'enable'
      AND NOT (f.int_SEUIL_MIN <=> s.int_SEUIL_MIN AND f.int_STOCK_REAPROVISONEMENT <=> s.int_STOCK_REAPROVISONEMENT AND f.int_QTE_REAPPROVISIONNEMENT <=> s.int_QTE_REAPPROVISIONNEMENT)`);
    ok('A. bilan : aucun produit inactif modifié', autres === '0', autres);
    /* second recalcul identique : valeurs deja justes, aucune fiche reecrite (ni dt_UPDATED ni historique) */
    const hA2 = q('SELECT IFNULL(MAX(lg_ID), 0) FROM t_famille_history');
    const majAvant = q("SELECT MAX(dt_UPDATED) FROM t_famille WHERE str_STATUT = 'enable'");
    await recalculer(p, 'A2. ABC, même recalcul une seconde fois');
    const base2 = etat();
    const differents = [...base.keys()].filter((k) => base.get(k).join('/') !== (base2.get(k) || []).join('/')).length;
    const histoA2 = q('SELECT COUNT(*) FROM t_famille_history WHERE lg_ID > ' + hA2);
    ok('A2. même résultat, aucune ligne d\'historique, aucune date de modification changée', differents === 0 && histoA2 === '0'
      && q("SELECT MAX(dt_UPDATED) FROM t_famille WHERE str_STATUT = 'enable'") === majAvant, differents + ' valeurs différentes, ' + histoA2 + ' lignes d\'historique');

    /* B. SEMOIS standard, fenetre d'un mois : produits simples vendus = conso / 4 semaines ; non vendus intacts */
    param('SEMOIS_ABC', 0); reprise();
    await recalculer(p, 'B. standard, un mois');
    base = etat();
    const simples = lignes(`SELECT f.lg_FAMILLE_ID, SUM(d.int_QUANTITY) FROM t_preenregistrement p JOIN t_preenregistrement_detail d ON p.lg_PREENREGISTREMENT_ID=d.lg_PREENREGISTREMENT_ID JOIN t_famille f ON f.lg_FAMILLE_ID=d.lg_FAMILLE_ID
      WHERE p.str_STATUT='is_Closed' AND p.int_PRICE>0 AND DATE(p.dt_UPDATED) BETWEEN '${FENETRE[2]}-01' AND LAST_DAY('${FENETRE[2]}-01') AND f.str_STATUT='enable' AND p.lg_TYPE_VENTE_ID<>'5'
      AND IFNULL(f.bool_DECONDITIONNE,0)=0 AND IFNULL(f.bool_DECONDITIONNE_EXIST,0)=0 GROUP BY f.lg_FAMILLE_ID`);
    const qSimple = new Map(simples.map(([id, n]) => [id, +n]));
    let r = comparer(prods.filter((x) => qSimple.has(x[0])), base, (x) => (libre(x) ? [Math.ceil(qSimple.get(x[0]) / 4 * G.Q1), Math.ceil(qSimple.get(x[0]) / 4 * G.Q2)] : null));
    ok('B. standard : ' + r.n + ' produits simples vendus = conso / 4 semaines x Q (un mois retenu)', r.n > 100 && r.ecarts.length === 0, r.ecarts.length + ' écarts : ' + r.ecarts.slice(0, 5).join(' ; '));
    /* produits actifs sans vente dans la fenetre (un mois) : 0 / 0 / 0 ; calcul interdit : intacts */
    const venduFenetre = (x) => !!conso.get(x[0]) && conso.get(x[0])[FENETRE[2]] !== undefined;
    const nonVendusB = prods.filter((x) => libre(x) && !venduFenetre(x));
    const pasAZero = nonVendusB.filter((x) => base.get(x[0]).join('/') !== '0/0/0');
    ok('B. standard : ' + nonVendusB.length + ' produits actifs sans vente en ' + FENETRE[2] + ' à seuil 0 et quantité 0', nonVendusB.length > 100 && pasAZero.length === 0,
      pasAZero.length + ' restés : ' + pasAZero.slice(0, 5).map((x) => x[5] + ' ' + base.get(x[0]).join('/')).join(' ; '));
    ok('B. standard : calcul interdit (bool_CALCUL_SEUIL = 0), vendus et non vendus restent à 100 / 1', interdits.every((id) => base.get(id).join('/') === '100/100/1'), interdits.map((id) => base.get(id)).join(' ; '));
    const vendusNonNuls = prods.filter((x) => libre(x) && venduFenetre(x) && conso.get(x[0])[FENETRE[2]] >= 1 && base.get(x[0]).join('/') === '0/0/0');
    ok('B. standard : aucun produit vendu remis à zéro', vendusNonNuls.length === 0, vendusNonNuls.slice(0, 5).map((x) => x[5]).join(' ; '));
    /* rapprochement : journal semois_normal = base ; chaque non vendu y figure en « non vendu » a 0 */
    let ln = null;
    try { ln = JSON.parse(fs.readFileSync(path.join(JOURNAUX, 'semois_normal_' + AUJ + '.json'), 'utf8')); } catch (e) { /* absent */ }
    const parIdN = new Map((ln || []).map((y) => [y.produitId, y]));
    const ecartsN = (ln || []).filter((y) => { const bb = base.get(y.produitId); const pr = prods.find((x) => x[0] === y.produitId);
      return pr && libre(pr) && (!bb || bb[0] !== y.seuil || bb[2] !== y.quantiteReappro); });
    const absents = nonVendusB.filter((x) => { const y = parIdN.get(x[0]); return !y || y.type !== 'non vendu' || y.seuil !== 0 || y.quantiteReappro !== 0 || y.conso !== 0; });
    ok('B. rapprochement journal semois_normal = base (seuil, quantité) ; chaque non vendu noté « non vendu » à 0', !!ln && ecartsN.length === 0 && absents.length === 0,
      (ln ? ln.length + ' entrées, ' : 'journal absent, ') + ecartsN.length + ' écarts, ' + absents.length + ' non vendus absents ' + absents.slice(0, 3).map((x) => x[5]).join(' ; '));
    /* second recalcul : les zeros sont deja en place, aucune fiche reecrite */
    const hB = q('SELECT IFNULL(MAX(lg_ID), 0) FROM t_famille_history');
    await recalculer(p, 'B2. standard, même recalcul une seconde fois');
    const baseB2 = etat();
    const diffB = [...base.keys()].filter((k) => base.get(k).join('/') !== (baseB2.get(k) || []).join('/')).length;
    const histoB = q('SELECT COUNT(*) FROM t_famille_history WHERE lg_ID > ' + hB);
    ok('B2. même résultat, aucune ligne d\'historique', diffB === 0 && histoB === '0', diffB + ' valeurs différentes, ' + histoB + ' lignes d\'historique');
    /* inactifs : valeurs d'origine ; details deconditionnes actifs : valeurs de la reprise (le calcul ne les touche pas) */
    const autresB = q(`SELECT COUNT(*) FROM t_famille f JOIN ${SAUV} s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID WHERE f.str_STATUT <> 'enable'
      AND NOT (f.int_SEUIL_MIN <=> s.int_SEUIL_MIN AND f.int_STOCK_REAPROVISONEMENT <=> s.int_STOCK_REAPROVISONEMENT AND f.int_QTE_REAPPROVISIONNEMENT <=> s.int_QTE_REAPPROVISIONNEMENT)`);
    const details = q(`SELECT CONCAT(COUNT(*), '/', SUM(NOT (int_SEUIL_MIN <=> 100 AND int_STOCK_REAPROVISONEMENT <=> 100 AND int_QTE_REAPPROVISIONNEMENT <=> 1))) FROM t_famille WHERE str_STATUT = 'enable' AND IFNULL(bool_DECONDITIONNE, 0) = 1`).split('/');
    ok('B. bilan : aucun produit inactif modifié ; ' + details[0] + ' détails déconditionnés non touchés', autresB === '0' && +details[0] > 0 && details[1] === '0', autresB + ' inactifs, ' + details[1] + ' détails modifiés');

    /* C. SEMOIS par produit, fenetre d'un mois : Q de la fiche, sinon Q globaux ; non vendus a 0 */
    param('SEMOIS_PAR_PRODUIT', 1); reprise();
    await recalculer(p, 'C. par produit, un mois');
    base = etat();
    r = comparer(prods, base, (x) => (libre(x) ? attendu(conso.get(x[0]), 1, +x[2] > 0 ? +x[2] : G.Q1, +x[3] > 0 ? +x[3] : G.Q2) : null));
    ok('C. par produit : ' + r.n + ' produits actifs (vendus et non vendus, Q de fiche 0/1/3/5) = calcul attendu', r.n > 1000 && r.ecarts.length === 0, r.ecarts.length + ' écarts : ' + r.ecarts.slice(0, 5).join(' ; '));
    ok('C. calcul interdit : intact', interdits.every((id) => base.get(id).join('/') === '100/100/1'));

    /* D. SEMOIS ABC, historique complet (3 mois) : identique a l'ancien calcul */
    param('SEMOIS_PAR_PRODUIT', 0); param('SEMOIS_ABC', 1); calendrier(false); reprise();
    await recalculer(p, 'D. ABC, trois mois');
    base = etat();
    r = comparer(prods.filter((x) => conso.has(x[0])), base, calcAbc(3));
    ok('D. ABC, historique complet : ' + r.n + ' produits vendus = conso des 3 mois / 12 semaines x Q (inchangé)', r.n > 1000 && r.ecarts.length === 0, r.ecarts.length + ' écarts : ' + r.ecarts.slice(0, 5).join(' ; '));

    /* E. SEMOIS_DIVISEUR_MOIS_REELS = 0, ABC, fenetre d'un mois : ancienne formule (Q3 x 4) ; non vendus toujours a 0 */
    param('SEMOIS_DIVISEUR_MOIS_REELS', 0); calendrier(true); reprise();
    await recalculer(p, 'E. ABC, un mois, ancienne formule');
    base = etat();
    r = comparer(prods, base, (x) => {
      if (!libre(x)) { return null; }
      const c = classes.get(x[1]);
      const q3 = c ? (+c[2] > 0 ? +c[2] : G.Q3) : G.Q3;
      return attendu(conso.get(x[0]), 1, c ? +c[0] : G.Q1, c ? +c[1] : G.Q2, q3);
    });
    ok('E. ancienne formule (paramètre à 0) : ' + r.n + ' produits actifs = ventes d\'un mois / (Q3 x 4), non vendus à 0', r.n > 1000 && r.ecarts.length === 0, r.ecarts.length + ' écarts : ' + r.ecarts.slice(0, 5).join(' ; '));
    ok('E. exemple : ' + exemple[5] + ' seuil = ventes d\'octobre / 12 x Q1', base.get(exemple[0])[0] === attendu(conso.get(exemple[0]), 1, +classes.get(exemple[1])[0], 0, 3)[0], base.get(exemple[0]).join('/'));
    lu = null;
    try { lu = JSON.parse(fs.readFileSync(journal, 'utf8')); } catch (e) { /* absent */ }
    const o = (lu || []).find((y) => y.produitId === exemple[0]);
    ok('E. journal : méthode et diviseur notés (diviseurMoisReels false, 12 semaines)', o && o.diviseurMoisReels === false && o.nombreSemaines === 12 && o.moisRetenus === 1, JSON.stringify(o || null));

    /* F. SEMOIS_DIVISEUR_MOIS_REELS = 0, standard, fenetre d'un mois : ancienne formule */
    param('SEMOIS_ABC', 0); reprise();
    await recalculer(p, 'F. standard, un mois, ancienne formule');
    base = etat();
    r = comparer(prods.filter((x) => qSimple.has(x[0])), base, (x) => (libre(x) ? [Math.ceil(qSimple.get(x[0]) / (G.Q3 * 4) * G.Q1), Math.ceil(qSimple.get(x[0]) / (G.Q3 * 4) * G.Q2)] : null));
    ok('F. standard, ancienne formule : ' + r.n + ' produits simples vendus = conso / (Q3 x 4)', r.n > 100 && r.ecarts.length === 0, r.ecarts.length + ' écarts : ' + r.ecarts.slice(0, 5).join(' ; '));
    const pasAZeroF = prods.filter((x) => libre(x) && !(conso.get(x[0]) && conso.get(x[0])[FENETRE[2]] !== undefined)).filter((x) => base.get(x[0]).join('/') !== '0/0/0');
    ok('F. standard, ancienne formule : produits actifs sans vente à 0 aussi', pasAZeroF.length === 0, pasAZeroF.length);
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
    restaurer();
    q('DELETE FROM t_famille_history WHERE lg_ID > ' + histoMax);
    for (const f of journaux) { try { fs.unlinkSync(f); } catch (e) { /* absent */ } }
    const apres = EMPREINTE(), paramsApres = PARAMETRES();
    const diff = [...new Set([...paramsAvant.keys(), ...paramsApres.keys()])].filter((k) => paramsAvant.get(k) !== paramsApres.get(k)).map((k) => k + ' : ' + paramsAvant.get(k) + ' -> ' + paramsApres.get(k));
    ok('Bilan : seuils, paramètres, calendrier et classes remis à l\'identique (CHECKSUM)', apres === avant, avant + ' / ' + apres + ' ; paramètres modifiés : ' + diff.join(' ; '));
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
