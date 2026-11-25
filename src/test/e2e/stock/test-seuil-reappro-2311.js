/* SEUIL DE REAPPROVISIONNEMENT : UNE SEULE VALEUR PARTOUT (retours du 23/11, « corrige le seuil réaligné en silence »).
 *
 * Defaut : le seuil est garde dans deux colonnes. La fiche article, les suggestions, les ruptures et le tableau de bord
 * lisent int_SEUIL_MIN ; l'ecran « Comparaison stock » (colonne « Seuil.Reappro », filtre « Inferieur au seuil de
 * reappro », exports, suggestion creee depuis l'ecran) lisait int_STOCK_REAPROVISONEMENT. La modification du seuil dans
 * une suggestion (et le calcul des seuils) n'ecrivait que la premiere : les deux divergeaient (5 424 fiches sur 11 650
 * sur la copie), et le simple enregistrement de la fiche changeait ensuite la valeur de « Comparaison stock » sans le
 * dire.
 *
 * Jeu d'essai (copies d'une vraie fiche, prefixe E2ESEU, nom « E2E SEUIL REAPPRO x »), colonnes divergentes comme en base :
 *          int_SEUIL_MIN  int_STOCK_REAPROVISONEMENT  stock rayon   sous le seuil (reference)
 *    A     12             30                          20            non
 *    B     8              2                           5             oui
 *    C     0              5                           3             non
 *    D     15             15                          10            oui
 * Par les clics (compte e2e) :
 *  1. fiche article (« Modifier ») de A et B : seuil affiche = int_SEUIL_MIN ;
 *  2. « Comparaison stock », recherche : colonne « Seuil.Reappro » = fiche = base (reference) pour A, B, C, D ;
 *  3. export CSV de l'ecran : colonne « Seuil réappro » = ecran, ligne par ligne ;
 *  4. filtre « Inferieur au seuil de reappro » : exactement B et D (stock < seuil de la fiche) ;
 *  5. suggestion (jeu d'essai), seuil de A passe a 25 dans la grille : les deux colonnes a 25 en base, et
 *     « Comparaison stock » affiche 25 ;
 *  6. bilan : B enregistree sans changement depuis la fiche -> aucune ligne de journal, aucune valeur qui change a
 *     l'ecran « Comparaison stock » (avant : 2 -> 8 sans trace).
 *  Bilan : donnees d'essai retirees (fiches, tables liees, suggestion, journal).
 */
const { chromium } = require('playwright-core');
const C = require('../ordonnancier/commun');
const ENV_E2E = C.ENV_E2E;
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 700) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '--raw'], { input: s, encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\r/g, '').replace(/\n$/, '');
const sql = (v) => (v === null ? 'NULL' : "'" + String(v).replace(/\\/g, '\\\\').replace(/'/g, "''") + "'");
const URL = process.env.BASE || 'http://localhost:8080/prestige';

const M = 'E2ESEU';
const RECHERCHE = 'E2E SEUIL REAPPRO';
const MODELE = q(`SELECT f.lg_FAMILLE_ID FROM t_famille f WHERE f.str_STATUT = 'enable' AND f.bool_DECONDITIONNE = 0 AND IFNULL(f.bool_DECONDITIONNE_EXIST, 0) = 0
  AND (f.lg_FAMILLE_PARENT_ID IS NULL OR f.lg_FAMILLE_PARENT_ID = '') AND f.int_PRICE > 0 AND f.lg_FAMILLEARTICLE_ID IS NOT NULL
  AND f.lg_ZONE_GEO_ID IS NOT NULL AND f.lg_CODE_TVA_ID IS NOT NULL AND f.lg_GROSSISTE_ID IS NOT NULL AND f.int_T IS NOT NULL
  AND (SELECT COUNT(*) FROM t_famille_stock s WHERE s.lg_FAMILLE_ID = f.lg_FAMILLE_ID) = 1
  AND EXISTS (SELECT 1 FROM t_famille_stock s WHERE s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' AND s.str_STATUT = 'enable')
  AND EXISTS (SELECT 1 FROM t_famille_grossiste g WHERE g.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND g.lg_GROSSISTE_ID = f.lg_GROSSISTE_ID AND g.str_STATUT = 'enable')
  ORDER BY f.dt_UPDATED DESC LIMIT 1`);
const G = q(`SELECT lg_GROSSISTE_ID FROM t_famille WHERE lg_FAMILLE_ID = '${MODELE}'`);
function cipLibre(prefixe, n) {
  for (let i = 0; i < 200; i++) {
    let c = prefixe;
    while (c.length < n) { c += Math.floor(Math.random() * 10); }
    const pris = q(`SELECT (SELECT COUNT(*) FROM t_famille WHERE int_CIP = '${c}' OR int_EAN13 = '${c}') + (SELECT COUNT(*) FROM t_famille_grossiste WHERE str_CODE_ARTICLE = '${c}')`);
    if (pris === '0') { return c; }
  }
  throw new Error('aucun code libre');
}
const FICHES = [
  { k: 'A', seuil: 12, miroir: 30, stock: 20 },
  { k: 'B', seuil: 8, miroir: 2, stock: 5 },
  { k: 'C', seuil: 0, miroir: 5, stock: 3 },
  { k: 'D', seuil: 15, miroir: 15, stock: 10 },
].map((f) => Object.assign(f, { id: M + '-' + f.k, cip: cipLibre('89', 7), nom: RECHERCHE + ' ' + f.k }));
const F = {}; FICHES.forEach((f) => { F[f.k] = f; });
const IDS = FICHES.map((f) => sql(f.id)).join(',');
const TABLES = q(`SELECT GROUP_CONCAT(c.TABLE_NAME) FROM information_schema.COLUMNS c JOIN information_schema.TABLES t ON t.TABLE_SCHEMA = c.TABLE_SCHEMA AND t.TABLE_NAME = c.TABLE_NAME AND t.TABLE_TYPE = 'BASE TABLE'
  WHERE c.TABLE_SCHEMA = DATABASE() AND c.COLUMN_NAME = 'lg_FAMILLE_ID'`).split(',').filter((t) => t && t !== 't_famille');
const cle = (t) => q(`SELECT COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${t}' AND CONSTRAINT_NAME = 'PRIMARY'`);
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');

function nettoyer() {
  q(`SET FOREIGN_KEY_CHECKS = 0;
     DELETE FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID = '${M}-S'; DELETE FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID = '${M}-S';
     ${TABLES.map((t) => `DELETE FROM ${t} WHERE lg_FAMILLE_ID LIKE '${M}-%';`).join('\n')}
     DELETE FROM t_famille WHERE lg_FAMILLE_ID LIKE '${M}-%';
     DELETE FROM t_event_log WHERE str_TYPE_LOG IN (${IDS}, ${FICHES.map((f) => sql(f.cip)).join(',')});
     SET FOREIGN_KEY_CHECKS = 1;`);
}
function restes() {
  const t = TABLES.map((x) => `(SELECT COUNT(*) FROM ${x} WHERE lg_FAMILLE_ID LIKE '${M}-%')`).join(' + ');
  return q(`SELECT CONCAT((SELECT COUNT(*) FROM t_famille WHERE lg_FAMILLE_ID LIKE '${M}-%'), '/', ${t}, '/',
    (SELECT COUNT(*) FROM t_event_log WHERE str_TYPE_LOG IN (${IDS})), '/', (SELECT COUNT(*) FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID = '${M}-S'))`);
}
function copier(f) {
  let s = `DROP TEMPORARY TABLE IF EXISTS e2e_f; CREATE TEMPORARY TABLE e2e_f AS SELECT * FROM t_famille WHERE lg_FAMILLE_ID = '${MODELE}';
    UPDATE e2e_f SET lg_FAMILLE_ID = '${f.id}', int_CIP = '${f.cip}', int_EAN13 = NULL, str_NAME = ${sql(f.nom)}, str_DESCRIPTION = ${sql(f.nom)},
      str_STATUT = 'enable', dt_CREATED = NOW() - INTERVAL 2 DAY, bool_DECONDITIONNE_EXIST = 0;
    INSERT INTO t_famille SELECT * FROM e2e_f;
    /* colonnes divergentes comme en base ; le declencheur d'insertion pose aussi dt_UPDATED */
    UPDATE t_famille SET int_SEUIL_MIN = ${f.seuil}, int_STOCK_REAPROVISONEMENT = ${f.miroir}, dt_UPDATED = NOW() - INTERVAL 2 DAY WHERE lg_FAMILLE_ID = '${f.id}';\n`;
  for (const t of ['t_famille_stock', 't_famille_grossiste', 't_famille_zonegeo', 't_type_stock_famille']) {
    const k = cle(t);
    s += `DROP TEMPORARY TABLE IF EXISTS e2e_t; CREATE TEMPORARY TABLE e2e_t AS SELECT * FROM ${t} WHERE lg_FAMILLE_ID = '${MODELE}'${t === 't_famille_grossiste' ? ` AND lg_GROSSISTE_ID = '${G}'` : ''};
      UPDATE e2e_t SET ${k} = CONCAT('${f.id}-', RIGHT(${k}, 20)), lg_FAMILLE_ID = '${f.id}'${t === 't_famille_grossiste' ? `, str_CODE_ARTICLE = '${f.cip}'` : ''};
      INSERT INTO ${t} SELECT * FROM e2e_t;\n`;
  }
  s += `UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = ${f.stock}, int_NUMBER = ${f.stock} WHERE lg_FAMILLE_ID = '${f.id}';\n`;
  return s;
}
const base = () => { const m = {}; q(`SELECT lg_FAMILLE_ID, int_SEUIL_MIN, IFNULL(int_STOCK_REAPROVISONEMENT, 'NULL') FROM t_famille WHERE lg_FAMILLE_ID IN (${IDS})`).split('\n').filter(Boolean)
  .forEach((l) => { const [id, s, mi] = l.split('\t'); m[id] = { seuil: Number(s), miroir: mi }; }); return m; };
const journalFiches = () => q(`SELECT COUNT(*) FROM t_event_log WHERE str_TYPE_LOG IN (${IDS}) AND dt_CREATED >= '${DEBUT}'`);

let etape = '';
async function ouvrirFicheArticle(p) {
  await C.vues.ouvrirMenu(p, 'GESTION DU STOCK', 'Fiche Article');
  await p.waitForFunction(() => Ext.ComponentQuery.query('famillemanager')[0] && Ext.ComponentQuery.query('famillemanager')[0].rendered, null, { timeout: 60000 });
  await p.waitForTimeout(1500);
}
async function ouvrirModification(p, f) {
  etape = 'fiche ' + f.k;
  const champ = p.locator('input[placeholder="Recherche"]').filter({ visible: true }).first();
  await champ.click(); await p.keyboard.press('Control+A'); await p.keyboard.type(f.cip); await p.keyboard.press('Enter');
  await p.waitForFunction(() => { const s = Ext.ComponentQuery.query('famillemanager')[0].getStore(); return !s.isLoading() && s.getCount() > 0; }, null, { timeout: 60000 });
  await p.waitForTimeout(500);
  await p.locator('.x-grid-row:visible').filter({ hasText: f.cip }).first().locator('.fa-action-edit').first().click();
  await p.waitForFunction(() => { const w = window.winModifArticleOuverte; return w && !w.isDestroyed && w.down('#int_CIP') && w.down('#int_CIP').getValue(); }, null, { timeout: 60000 });
  await p.waitForTimeout(1200);
  return p.evaluate(() => window.winModifArticleOuverte.down('#int_STOCK_REAPROVISONEMENT').getValue());
}
async function boutonFiche(p, texte) {
  const id = await p.evaluate((t) => { const b = window.winModifArticleOuverte.query('button').filter((c) => c.text === t && c.isVisible(true))[0]; return b ? b.getId() : null; }, texte);
  if (!id) { throw new Error('bouton absent : ' + texte); }
  await p.click('#' + id);
}
/* « Comparaison stock » : recherche (et filtre de stock), lignes de la grille */
async function comparaison(p, filtre) {
  etape = 'comparaison stock' + (filtre ? ' (' + filtre + ')' : '');
  if (!(await p.evaluate(() => Ext.ComponentQuery.query('famillestockcomparaisonmanager').some((x) => x.isVisible(true))))) {
    await C.ouvrirEcran(p, 'famillestockcomparaisonmanager');
    await p.waitForFunction(() => Ext.ComponentQuery.query('famillestockcomparaisonmanager').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await p.waitForTimeout(1500);
  }
  await C.vues.saisir(p, 'famillestockcomparaisonmanager #query', RECHERCHE);
  if (filtre) {
    await C.vues.choisir(p, 'famillestockcomparaisonmanager #stockFiltre', filtre);
    await p.waitForTimeout(400);
  }
  const rep = p.waitForResponse((r) => /fichearticle\/comparaison\?/.test(r.url()), { timeout: 60000 });
  await C.vues.cliquer(p, 'famillestockcomparaisonmanager #rechercher');
  await rep;
  await p.waitForTimeout(800);
  return p.evaluate(() => Ext.ComponentQuery.query('famillestockcomparaisonmanager grid')[0].getStore().getRange()
    .map((r) => ({ id: r.get('id'), code: r.get('code'), seuil: Number(r.get('seuiRappro')), stock: Number(r.get('stock')) })));
}
const parFiche = (lignes) => { const m = {}; lignes.forEach((l) => { const f = FICHES.find((x) => x.id === l.id); if (f) { m[f.k] = l.seuil; } }); return m; };

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  try {
    ok('Jeu d\'essai : fiche modèle et grossiste', MODELE && G, MODELE + ' / ' + G);
    nettoyer();
    q(FICHES.map(copier).join('\n')
      + `INSERT INTO t_suggestion_order (lg_SUGGESTION_ORDER_ID, str_REF, lg_GROSSISTE_ID, str_STATUT, dt_CREATED, dt_UPDATED) VALUES ('${M}-S', '${M}-S', '${G}', 'is_Process', NOW(), NOW());`
      + FICHES.map((f, i) => 'INSERT INTO t_suggestion_order_details (lg_SUGGESTION_ORDER_DETAILS_ID, lg_SUGGESTION_ORDER_ID, lg_GROSSISTE_ID, lg_FAMILLE_ID,'
        + ` int_NUMBER, int_PRICE, int_PRICE_DETAIL, int_PAF_DETAIL, dt_CREATED, dt_UPDATED, str_STATUT, b_falg) VALUES ('${M}-L${i}', '${M}-S', '${G}', '${f.id}',`
        + ` ${i + 1}, ${100 * (i + 1)}, 150, 100, NOW(), NOW(), 'is_Process', 0);`).join(''));
    const b0 = base();
    ok('Jeu d\'essai : 4 fiches, colonnes divergentes comme en base (12/30, 8/2, 0/5, 15/15)', FICHES.every((f) => b0[f.id] && b0[f.id].seuil === f.seuil && b0[f.id].miroir === String(f.miroir)), JSON.stringify(b0));

    const ctx = await b.newContext({ viewport: { width: 1600, height: 950 } });
    const p = await ctx.newPage();
    /* retour du 25/11 : la question « Nettoyer la suggestion ? » (fenetre a l'ouverture) recoit « Non, garder » */
    await require('../support/question-nettoyage-suggestion').garder(p);
    p.on('pageerror', (e) => err.push(e.message));
    await C.vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');

    /* ---------- 1. fiche article ---------- */
    await ouvrirFicheArticle(p);
    const fiche = {};
    for (const k of ['A', 'B']) {
      fiche[k] = Number(await ouvrirModification(p, F[k]));
      await boutonFiche(p, 'Retour');
      await p.waitForTimeout(800);
    }
    ok('1. Fiche article : seuil affiché = int_SEUIL_MIN (A 12, B 8)', fiche.A === 12 && fiche.B === 8, JSON.stringify(fiche));

    /* ---------- 2. Comparaison stock ---------- */
    let lignes = await comparaison(p);
    let vu = parFiche(lignes);
    ok('2. Comparaison stock : les 4 fiches trouvées', Object.keys(vu).length === 4, JSON.stringify(lignes));
    ok('2. Rapprochement « Seuil.Reappro » = fiche = base (A 12, B 8, C 0, D 15)', vu.A === 12 && vu.B === 8 && vu.C === 0 && vu.D === 15 && vu.A === fiche.A && vu.B === fiche.B, JSON.stringify(vu));

    /* ---------- 3. export CSV ---------- */
    etape = 'export CSV';
    /* le bouton ouvre l'export dans un onglet : l'adresse construite par l'ecran est relevee, puis telechargee */
    await p.evaluate(() => { window.__ouvert = null; window.__open = window.open; window.open = (u) => { window.__ouvert = u; return null; }; });
    await C.vues.cliquer(p, 'famillestockcomparaisonmanager button[text=CSV]');
    await p.waitForFunction(() => !!window.__ouvert, null, { timeout: 15000 });
    const adresse = await p.evaluate(() => { const u = window.__ouvert; window.open = window.__open; return u; });
    const fichier = await C.telecharger(p, adresse, 'comparaison-seuil.csv');
    const csv = require('fs').readFileSync(fichier.chemin).toString('utf8').replace(/^﻿/, '').split(/\r?\n/).filter(Boolean).map((l) => l.split(/;|,/).map((x) => x.replace(/^"|"$/g, '').trim()));
    const entete = csv.findIndex((l) => l.includes('Seuil réappro'));
    const col = entete >= 0 ? csv[entete].indexOf('Seuil réappro') : -1;
    const ecarts = [];
    FICHES.forEach((f) => {
      const l = csv.find((x) => x[0] === f.cip);
      if (!l || Number(l[col]) !== vu[f.k]) { ecarts.push(f.k + ' : csv ' + (l ? l[col] : 'absente') + ' écran ' + vu[f.k]); }
    });
    ok('3. Export CSV : « Seuil réappro » = écran, ligne par ligne', col >= 0 && ecarts.length === 0, ecarts.join(' ; ') || csv.slice(0, 3).join(' | '));

    /* ---------- 4. filtre « Inferieur au seuil de reappro » ---------- */
    lignes = await comparaison(p, 'Inferieur au seuil de reappro');
    const sous = Object.keys(parFiche(lignes)).sort().join(',');
    ok('4. Filtre « Inferieur au seuil de reappro » : exactement B et D (stock sous le seuil de la fiche)', sous === 'B,D', sous);
    await C.vues.choisir(p, 'famillestockcomparaisonmanager #stockFiltre', 'Tous');

    /* ---------- 5. seuil modifie dans une suggestion ---------- */
    etape = 'suggestion';
    await p.evaluate(() => { testextjs.app.getController('App').onRedirectTo('i_sugg_manager', {}); });
    await p.waitForFunction(() => Ext.ComponentQuery.query('i_sugg_manager').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(2000);
    await p.evaluate((r) => { const g = Ext.ComponentQuery.query('i_sugg_manager')[0]; if (g.down('#filtreStatut')) { g.down('#filtreStatut').setValue(''); }
      Ext.getCmp('rechecher').setValue(r); g.onRechClick(); }, M + '-S');
    await p.waitForFunction((r) => { const st = Ext.ComponentQuery.query('i_sugg_manager')[0].getStore(); return !st.isLoading() && st.findExact('str_REF', r) >= 0; }, M + '-S', { timeout: 30000 });
    await p.evaluate((r) => { const g = Ext.ComponentQuery.query('i_sugg_manager')[0]; g.onManageDetailsClick(g, g.getStore().findExact('str_REF', r)); }, M + '-S');
    await p.waitForFunction(() => { const g = Ext.getCmp('gridpanelSuggestionID'); return g && g.getStore().isLoading() === false && g.getStore().getCount() > 0; }, null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    const cellule = await p.evaluate((id) => { const g = Ext.getCmp('gridpanelSuggestionID'); const i = g.getStore().findExact('lg_FAMILLE_ID', id);
      const c = g.columns.filter((x) => x.dataIndex === 'int_SEUIL')[0]; if (i < 0 || !c) { return null; }
      return { seuil: g.getStore().getAt(i).get('int_SEUIL'), sel: '#' + g.getView().getNode(i).id + ' .' + c.getCellSelector().replace(/^\./, '') }; }, F.A.id);
    ok('5. Suggestion : la grille montre le seuil de la fiche pour A (12)', cellule && Number(cellule.seuil) === 12, JSON.stringify(cellule));
    if (cellule) {
      await p.click(cellule.sel);
      await p.waitForTimeout(600);
      await p.keyboard.press('Control+A'); await p.keyboard.type('25');
      const maj = p.waitForResponse((r) => /suggestion\/item\/update-seuil/.test(r.url()), { timeout: 60000 });
      await p.keyboard.press('Enter');
      await maj;
      await p.waitForTimeout(1500);
    }
    const b5 = base();
    ok('5. Seuil de A passé à 25 dans la suggestion : les deux colonnes à 25 en base', b5[F.A.id].seuil === 25 && b5[F.A.id].miroir === '25', JSON.stringify(b5[F.A.id]));
    vu = parFiche(await comparaison(p));
    ok('5. Rapprochement : « Comparaison stock » affiche 25 pour A', vu.A === 25, JSON.stringify(vu));

    /* ---------- 6. bilan : enregistrement sans changement ---------- */
    const avantB = vu.B;
    const j0 = journalFiches();
    await ouvrirFicheArticle(p);
    await ouvrirModification(p, F.B);
    etape = 'enregistrement de B';
    const [enr] = await Promise.all([
      p.waitForResponse((r) => /fichearticle\/enregistrer\?mode=update/.test(r.url()), { timeout: 60000 }),
      boutonFiche(p, 'Enregistrer'),
    ]);
    await enr.text();
    await p.waitForFunction(() => !window.winModifArticleOuverte || window.winModifArticleOuverte.isDestroyed, null, { timeout: 30000 });
    await p.waitForTimeout(1200);
    const b6 = base();
    ok('6. B enregistrée sans changement : aucune ligne de journal', journalFiches() === j0, j0 + ' -> ' + journalFiches());
    ok('6. B : seuil de la fiche inchangé (8), les deux colonnes égales', b6[F.B.id].seuil === 8 && b6[F.B.id].miroir === '8', JSON.stringify(b6[F.B.id]));
    vu = parFiche(await comparaison(p));
    ok('6. Bilan : « Comparaison stock » ne change pas pour B (' + avantB + ' avant, ' + vu.B + ' après)', vu.B === avantB && vu.B === 8, avantB + ' -> ' + vu.B);
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
    await ctx.close();
  } catch (e) {
    ok('Parcours sans exception', false, etape + ' : ' + e.message);
  } finally {
    nettoyer();
    ok('Bilan : données d\'essai retirées (fiches, tables liées, journal, suggestion)', restes() === '0/0/0/0', restes());
    await b.close();
    const n = res.filter((x) => x.c).length;
    console.log('\n' + n + '/' + res.length + ' PASS');
    process.exit(n === res.length ? 0 : 1);
  }
})();
