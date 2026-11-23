/* FICHE ARTICLE : TRACE DES MISES A JOUR EN LOT (retours du 23/11, « trace aussi les mises à jour en lot »).
 *
 * Defaut : les quatre mises a jour en lot de la fiche article ne laissaient aucune trace par article (au mieux une ligne
 * globale « N produit(s) coché(s) ») : on ne pouvait pas dire qui avait change le grossiste, les seuils, le drapeau
 * « sensible » ou « article retenu » d'une fiche, ni quelle etait la valeur d'avant.
 *
 * Jeu d'essai : 4 fiches copiees d'une vraie fiche (prefixe E2ELOT, nom « E2E LOT TRACE n »), valeurs differentes d'une
 * fiche a l'autre et, pour chaque operation, une fiche deja a la valeur voulue (aucune trace attendue pour elle) :
 *            grossiste   Q1 / Q2       sensible   article retenu (bool_ACCOUNT)
 *    1       G1          5 / 10        non        non (1)
 *    2       G1          0 / (vide)    oui        oui (0)
 *    3       G2 (cible)  7 / 20 (cible) non       non (1)
 *    4       G1          100 / 3       non        non (1)
 * Par les clics (compte e2e), recherche « E2E LOT TRACE », « Tous Sélectionner » ou « Cocher tout le résultat » :
 *  1. Fiche article, « Mise à jour des articles » : Grossiste = G2 -> 3 lignes (fiches 1, 2, 4) ;
 *  2. Fiche article, « MAJ seuil » : Q1 = 7, Q2 = 20 -> 3 lignes (1, 2, 4), detail Q1 et Q2 avant -> apres ;
 *  3. Ordonnancier, « Produits sensibles », « Cocher tout le résultat » (deux clics) -> la ligne du lot + 3 lignes (1, 3, 4) ;
 *  4. Produits, « Cocher tout le résultat » (confirmation) -> 3 lignes (1, 3, 4).
 * Pour chaque operation : base = valeur voulue sur les 4 fiches ; une ligne par fiche changee, aucune pour la fiche deja a
 * la valeur, au nom du compte e2e, avec le detail avant -> apres exact ; rien d'autre au journal (bilan avant / apres).
 *  5. Onglet « Historique » de la fiche 1 : 4 lignes « Modification en lot », rapprochement ecran = API = base.
 *  Bilan : donnees d'essai retirees (fiches, tables liees, journal).
 */
const { chromium } = require('playwright-core');
const C = require('../ordonnancier/commun');
const ENV_E2E = C.ENV_E2E;
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 700) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '--raw'], { input: s, encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\r/g, '').replace(/\n$/, '');
const lignes = (s) => { const r = q(s); return r ? r.split('\n').map((l) => l.split('\t')) : []; };
const sql = (v) => (v === null ? 'NULL' : "'" + String(v).replace(/\\/g, '\\\\').replace(/'/g, "''") + "'");

const M = 'E2ELOT';
const RECHERCHE = 'E2E LOT TRACE';
const USER = q(`SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN}'`);
const NOM_E2E = q(`SELECT TRIM(CONCAT(IFNULL(str_FIRST_NAME, ''), ' ', IFNULL(str_LAST_NAME, ''))) FROM t_user WHERE lg_USER_ID = '${USER}'`);
const MODELE = q(`SELECT f.lg_FAMILLE_ID FROM t_famille f WHERE f.str_STATUT = 'enable' AND f.bool_DECONDITIONNE = 0 AND IFNULL(f.bool_DECONDITIONNE_EXIST, 0) = 0
  AND (f.lg_FAMILLE_PARENT_ID IS NULL OR f.lg_FAMILLE_PARENT_ID = '') AND f.int_PRICE > 0 AND f.lg_FAMILLEARTICLE_ID IS NOT NULL
  AND f.lg_ZONE_GEO_ID IS NOT NULL AND f.lg_CODE_TVA_ID IS NOT NULL AND f.lg_GROSSISTE_ID IS NOT NULL
  AND EXISTS (SELECT 1 FROM t_famille_stock s WHERE s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' AND s.str_STATUT = 'enable')
  AND EXISTS (SELECT 1 FROM t_famille_grossiste g WHERE g.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND g.lg_GROSSISTE_ID = f.lg_GROSSISTE_ID AND g.str_STATUT = 'enable')
  ORDER BY f.dt_UPDATED DESC LIMIT 1`);
const G1 = q(`SELECT lg_GROSSISTE_ID FROM t_famille WHERE lg_FAMILLE_ID = '${MODELE}'`);
/* G2 : un grossiste actif au libelle unique, qui n'est le debut d'aucun autre libelle (choix sans ambiguite dans la liste) */
const G2 = q(`SELECT g.lg_GROSSISTE_ID FROM t_grossiste g WHERE g.str_STATUT = 'enable' AND g.lg_GROSSISTE_ID <> '${G1}' AND TRIM(g.str_LIBELLE) <> ''
  AND NOT EXISTS (SELECT 1 FROM t_grossiste h WHERE h.lg_GROSSISTE_ID <> g.lg_GROSSISTE_ID AND h.str_STATUT = 'enable' AND h.str_LIBELLE LIKE CONCAT('%', g.str_LIBELLE, '%'))
  ORDER BY g.str_LIBELLE LIMIT 1`);
const libelleG = (g) => q(`SELECT TRIM(str_LIBELLE) FROM t_grossiste WHERE lg_GROSSISTE_ID = '${g}'`);
const NOM_G1 = libelleG(G1);
const NOM_G2 = libelleG(G2);

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
  { n: 1, g: G1, q1: 5, q2: 10, sensible: 0, account: 1 },
  { n: 2, g: G1, q1: 0, q2: null, sensible: 1, account: 0 },
  { n: 3, g: G2, q1: 7, q2: 20, sensible: 0, account: 1 },
  { n: 4, g: G1, q1: 100, q2: 3, sensible: 0, account: 1 },
].map((f) => Object.assign(f, { id: M + '-' + f.n, cip: cipLibre('92', 7), nom: RECHERCHE + ' ' + f.n }));
const IDS = FICHES.map((f) => sql(f.id)).join(',');
const F = (n) => FICHES[n - 1];
const TABLES = q(`SELECT GROUP_CONCAT(c.TABLE_NAME) FROM information_schema.COLUMNS c JOIN information_schema.TABLES t ON t.TABLE_SCHEMA = c.TABLE_SCHEMA AND t.TABLE_NAME = c.TABLE_NAME AND t.TABLE_TYPE = 'BASE TABLE'
  WHERE c.TABLE_SCHEMA = DATABASE() AND c.COLUMN_NAME = 'lg_FAMILLE_ID'`).split(',').filter((t) => t && t !== 't_famille');
const cle = (t) => q(`SELECT COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${t}' AND CONSTRAINT_NAME = 'PRIMARY'`);
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');

function nettoyer() {
  q(`SET FOREIGN_KEY_CHECKS = 0;
     ${TABLES.map((t) => `DELETE FROM ${t} WHERE lg_FAMILLE_ID LIKE '${M}-%';`).join('\n')}
     DELETE FROM t_famille WHERE lg_FAMILLE_ID LIKE '${M}-%';
     DELETE FROM t_event_log WHERE str_TYPE_LOG IN (${IDS}, ${FICHES.map((f) => sql(f.cip)).join(',')});
     DELETE FROM t_event_log WHERE str_TYPE_LOG = 'lot' AND str_DESCRIPTION LIKE '%${RECHERCHE}%' AND dt_CREATED >= '${DEBUT}';
     SET FOREIGN_KEY_CHECKS = 1;`);
}
function restes() {
  const t = TABLES.map((x) => `(SELECT COUNT(*) FROM ${x} WHERE lg_FAMILLE_ID LIKE '${M}-%')`).join(' + ');
  return q(`SELECT CONCAT((SELECT COUNT(*) FROM t_famille WHERE lg_FAMILLE_ID LIKE '${M}-%'), '/', ${t}, '/',
    (SELECT COUNT(*) FROM t_event_log WHERE str_TYPE_LOG IN (${IDS}) OR (str_TYPE_LOG = 'lot' AND str_DESCRIPTION LIKE '%${RECHERCHE}%' AND dt_CREATED >= '${DEBUT}')))`);
}
function copier(f) {
  let s = `DROP TEMPORARY TABLE IF EXISTS e2e_f; CREATE TEMPORARY TABLE e2e_f AS SELECT * FROM t_famille WHERE lg_FAMILLE_ID = '${MODELE}';
    UPDATE e2e_f SET lg_FAMILLE_ID = '${f.id}', int_CIP = '${f.cip}', int_EAN13 = NULL, str_NAME = ${sql(f.nom)}, str_DESCRIPTION = ${sql(f.nom)},
      lg_GROSSISTE_ID = '${f.g}', int_Q1_SEUIL_REAPPRO = ${sql(f.q1)}, int_Q2_QTE_REAPPRO = ${sql(f.q2)}, is_sensible = ${f.sensible}, is_scheduled = 0,
      bool_ACCOUNT = ${f.account}, str_STATUT = 'enable', dt_CREATED = NOW() - INTERVAL 2 DAY, dt_UPDATED = NOW() - INTERVAL 2 DAY, bool_DECONDITIONNE_EXIST = 0;
    INSERT INTO t_famille SELECT * FROM e2e_f;
    /* le declencheur d'insertion force bool_ACCOUNT a 1 */
    UPDATE t_famille SET bool_ACCOUNT = ${f.account}, dt_UPDATED = NOW() - INTERVAL 2 DAY WHERE lg_FAMILLE_ID = '${f.id}';\n`;
  for (const t of ['t_famille_stock', 't_famille_grossiste', 't_famille_zonegeo', 't_type_stock_famille']) {
    const k = cle(t);
    s += `DROP TEMPORARY TABLE IF EXISTS e2e_t; CREATE TEMPORARY TABLE e2e_t AS SELECT * FROM ${t} WHERE lg_FAMILLE_ID = '${MODELE}'${t === 't_famille_grossiste' ? ` AND lg_GROSSISTE_ID = '${G1}'` : ''};
      UPDATE e2e_t SET ${k} = CONCAT('${f.id}-', RIGHT(${k}, 20)), lg_FAMILLE_ID = '${f.id}'${t === 't_famille_grossiste' ? `, str_CODE_ARTICLE = '${f.cip}', lg_GROSSISTE_ID = '${f.g}'` : ''};
      INSERT INTO ${t} SELECT * FROM e2e_t;\n`;
  }
  return s;
}

/* journal : lignes ecrites depuis un instant pour les fiches d'essai (et la ligne globale d'un lot) */
const journal = (depuis) => lignes(`SELECT str_TYPE_LOG, lg_USER_ID, IFNULL(str_CREATED_BY, ''), typeLog, str_DESCRIPTION, REPLACE(IFNULL(str_DETAIL, ''), CHAR(10), '¶')
  FROM t_event_log WHERE dt_CREATED >= '${depuis}' AND (str_TYPE_LOG IN (${IDS}) OR (str_TYPE_LOG = 'lot' AND str_DESCRIPTION LIKE '%${RECHERCHE}%')) ORDER BY str_TYPE_LOG, str_DESCRIPTION`);
const TYPE_MODIF = () => q(`SELECT typeLog FROM t_event_log WHERE str_DESCRIPTION LIKE 'Modification de la fiche %' AND str_DETAIL IS NOT NULL ORDER BY dt_CREATED DESC LIMIT 1`);
const valeurs = (col) => q(`SELECT GROUP_CONCAT(IFNULL(${col}, 'NULL') ORDER BY lg_FAMILLE_ID SEPARATOR ',') FROM t_famille WHERE lg_FAMILLE_ID IN (${IDS})`);

/* controle d'une operation : base, lignes attendues (une par fiche changee), rien d'autre */
function controler(titre, operation, depuis, attendu, autres) {
  const j = journal(depuis);
  const parFiche = j.filter((l) => l[0] !== 'lot');
  const vues = parFiche.map((l) => l[0]).join(',');
  const voulues = Object.keys(attendu).map((n) => F(Number(n)).id).sort().join(',');
  ok(titre + ' : une ligne par fiche changée (' + voulues + '), aucune pour la fiche déjà à la valeur', vues === voulues, vues);
  const typeModif = TYPE_MODIF();
  ok(titre + ' : chaque ligne au nom du compte e2e, type « Modification de fiche article »', parFiche.length > 0 && parFiche.every((l) => l[1] === USER && l[2] === ENV_E2E.LOGIN && (!typeModif || l[3] === typeModif)), JSON.stringify(parFiche.map((l) => l.slice(1, 4))));
  const ecarts = [];
  Object.keys(attendu).forEach((n) => {
    const f = F(Number(n));
    const l = parFiche.find((x) => x[0] === f.id);
    const champs = attendu[n].map((c) => c.split(' : ')[0].toLowerCase()).join(', ');
    const desc = 'Modification en lot (' + operation + ') de la fiche ' + f.cip + ' ' + f.nom + ' par ' + NOM_E2E + ' : ' + champs;
    if (!l || l[4] !== desc || l[5] !== attendu[n].join('¶')) { ecarts.push(f.id + ' : ' + (l ? l[4] + ' | ' + l[5] : 'absente')); }
  });
  ok(titre + ' : description (CIP, nom, auteur, champs) et détail avant → après exacts', ecarts.length === 0, ecarts.join(' ; '));
  const lot = j.filter((l) => l[0] === 'lot');
  ok(titre + ' : bilan, rien d\'autre au journal' + (autres ? ' (plus la ligne globale du lot)' : ''), lot.length === (autres || 0) && j.length === parFiche.length + lot.length, j.length + ' ligne(s), dont ' + lot.length + ' globale(s)');
}

let etape = '';
/* les fenetres « MAJ sélective » et « MAJ seuil » sont des fenetres globales (winMajSelectiveOuverte, winMajSeuilOuverte) */
const fenetreVisible = (p, v) => p.waitForFunction((x) => { const w = window[x]; return w && !w.isDestroyed && w.isVisible(); }, v, { timeout: 60000 });
async function boutonFenetre(p, v, texte) {
  const id = await p.evaluate(([x, t]) => { const w = window[x]; const b = w && w.query('button').filter((c) => c.text === t && c.isVisible(true))[0]; return b ? b.getId() : null; }, [v, texte]);
  if (!id) { throw new Error('bouton absent : ' + texte); }
  await p.click('#' + id);
}
async function repondreMessage(p, texte, bouton) {
  const t = await C.vues.attendreMessage(p, texte, 30000);
  if (t === null) { throw new Error('message absent : ' + texte + ' (vu : ' + await C.vues.texteMessage(p) + ')'); }
  await C.vues.repondre(p, bouton);
  await p.waitForTimeout(500);
  return t;
}
async function ouvrirFicheArticle(p) {
  await C.vues.ouvrirMenu(p, 'GESTION DU STOCK', 'Fiche Article');
  await p.waitForFunction(() => Ext.ComponentQuery.query('famillemanager')[0] && Ext.ComponentQuery.query('famillemanager')[0].rendered, null, { timeout: 60000 });
  await p.waitForTimeout(1500);
}
/* recherche dans une fenetre de mise a jour en lot, puis « Tous Sélectionner » */
async function chercherEtToutSelectionner(p, fenetre, grille, champ, liste, caseTous) {
  await C.vues.saisir(p, '#' + champ, RECHERCHE);
  const rep = p.waitForResponse((r) => r.url().includes(liste), { timeout: 60000 });
  await boutonFenetre(p, fenetre, 'rechercher');
  await rep;
  await p.waitForTimeout(800);
  const n = await p.evaluate((g) => Ext.getCmp(g).getStore().getCount(), grille);
  await p.click('#' + caseTous + '-inputEl');
  await p.waitForTimeout(500);
  return n;
}
async function appliquer(p, fenetre, confirmation, url) {
  await boutonFenetre(p, fenetre, 'Appliquer');
  const rep = p.waitForResponse((r) => r.url().includes(url), { timeout: 120000 });
  await repondreMessage(p, confirmation, 'yes');
  const corps = await (await rep).json().catch(() => ({}));
  await repondreMessage(p, 'produit(s)', 'ok');
  return corps;
}

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  try {
    ok('Jeu d\'essai : compte e2e nommé, fiche modèle, deux grossistes distincts', USER && NOM_E2E && MODELE && G1 && G2 && NOM_G1 && NOM_G2 && NOM_G1 !== NOM_G2, [NOM_E2E, MODELE, NOM_G1, NOM_G2].join(' / '));
    nettoyer();
    q(FICHES.map(copier).join('\n'));
    ok('Jeu d\'essai : 4 fiches aux valeurs variées, journal vide', valeurs('lg_GROSSISTE_ID') === [G1, G1, G2, G1].join(',') && valeurs('int_Q2_QTE_REAPPRO') === '10,NULL,20,3'
      && valeurs('is_sensible') === '0,1,0,0' && valeurs('bool_ACCOUNT') === '1,0,1,1' && journal(DEBUT).length === 0, [valeurs('lg_GROSSISTE_ID'), valeurs('int_Q2_QTE_REAPPRO'), valeurs('is_sensible'), valeurs('bool_ACCOUNT')].join(' | '));

    const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => err.push(e.message));
    await C.vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirFicheArticle(p);

    /* ---------- 1. « Mise à jour des articles » : grossiste ---------- */
    etape = 'MAJ sélective';
    let t0 = q('SELECT NOW()');
    await C.vues.cliquer(p, 'famillemanager #btn_maj_selective');
    await fenetreVisible(p, 'winMajSelectiveOuverte');
    await p.waitForTimeout(1500);
    let n = await chercherEtToutSelectionner(p, 'winMajSelectiveOuverte', 'majSelectiveGridID', 'selRech', 'maj-selective/list', 'selAll');
    ok('1. « Mise à jour des articles » : la recherche rend les 4 fiches', n === 4, n);
    await C.vues.choisir(p, '#selChamp', 'Grossiste');
    await p.waitForTimeout(500);
    const choisi = await C.vues.choisir(p, '#selValGrossiste', NOM_G2);
    let r = await appliquer(p, 'winMajSelectiveOuverte', 'Affecter', 'maj-selective/apply');
    ok('1. Appliqué aux 4 fiches, grossiste ' + NOM_G2 + ' en base', r.success === true && r.count === 4 && valeurs('lg_GROSSISTE_ID') === [G2, G2, G2, G2].join(','), choisi + ' ' + JSON.stringify(r));
    const gros = ['Grossiste : avant ' + NOM_G1 + ' → après ' + NOM_G2];
    controler('1', 'Mise à jour des articles', t0, { 1: gros, 2: gros, 4: gros });
    await boutonFenetre(p, 'winMajSelectiveOuverte', 'Fermer');
    await p.waitForTimeout(800);

    /* ---------- 2. « MAJ seuil » : Q1 et Q2 ---------- */
    etape = 'MAJ seuil';
    t0 = q('SELECT NOW()');
    await C.vues.cliquer(p, 'famillemanager #btn_maj_seuil');
    await fenetreVisible(p, 'winMajSeuilOuverte');
    await p.waitForTimeout(1500);
    n = await chercherEtToutSelectionner(p, 'winMajSeuilOuverte', 'majSeuilGridID', 'majRech', 'maj-seuil/list', 'majAll');
    ok('2. « MAJ seuil » : la recherche rend les 4 fiches', n === 4, n);
    for (const [champ, v] of [['majQ1', '7'], ['majQ2', '20']]) {
      await p.click('#' + champ + '-inputEl'); await p.keyboard.press('Control+A'); await p.keyboard.type(v); await p.keyboard.press('Tab');
    }
    r = await appliquer(p, 'winMajSeuilOuverte', 'Mettre à jour Q1', 'maj-seuil/apply');
    ok('2. Appliqué aux 4 fiches, Q1 = 7 et Q2 = 20 en base', r.success === true && r.count === 4 && valeurs('int_Q1_SEUIL_REAPPRO') === '7,7,7,7' && valeurs('int_Q2_QTE_REAPPRO') === '20,20,20,20', JSON.stringify(r));
    controler('2', 'MAJ seuil', t0, {
      1: ['Q1 : avant 5 → après 7', 'Q2 : avant 10 → après 20'],
      2: ['Q1 : avant 0 → après 7', 'Q2 : avant (vide) → après 20'],
      4: ['Q1 : avant 100 → après 7', 'Q2 : avant 3 → après 20'],
    });
    await boutonFenetre(p, 'winMajSeuilOuverte', 'Fermer');
    await p.waitForTimeout(800);

    /* ---------- 3. Ordonnancier, « Produits sensibles », « Cocher tout le résultat » ---------- */
    etape = 'sensibles en lot';
    t0 = q('SELECT NOW()');
    await C.ouvrirOnglet(p, 'Produits sensibles', 'ongletSensibles');
    const vus = await C.chercherProduits(p, 'ongletSensibles', RECHERCHE, 'Tous');
    ok('3. Ordonnancier : la recherche rend les 4 fiches', vus.length === 4, vus.length);
    const clicLot = async () => {
      const rep = p.waitForResponse((x) => /fichearticle\/ordonnancier\/lot/.test(x.url()), { timeout: 120000 });
      await C.vues.cliquer(p, 'ordonnancier #ongletSensibles #btnCocherTout');
      const corps = await (await rep).json().catch(() => ({}));
      await p.waitForTimeout(800);
      return corps;
    };
    await clicLot();
    r = await clicLot();
    ok('3. Deux clics : le lot est appliqué, les 4 fiches sensibles en base', r.success === true && valeurs('is_sensible') === '1,1,1,1', JSON.stringify(r));
    const sens = ['Sensible : avant non → après oui'];
    controler('3', 'Ordonnancier', t0, { 1: sens, 3: sens, 4: sens }, 1);

    /* ---------- 4. Produits, « Cocher tout le résultat » ---------- */
    etape = 'gestion des articles';
    t0 = q('SELECT NOW()');
    await C.ouvrirEcran(p, 'produitsxx');
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('produitsxx')[0]; return g && g.isVisible(true) && !g.getStore().isLoading(); }, null, { timeout: 60000 });
    await C.vues.saisir(p, 'produitsxx #recherche', RECHERCHE);
    let rep = p.waitForResponse((x) => /fichearticle\/account\?/.test(x.url()), { timeout: 60000 });
    await C.vues.cliquer(p, 'produitsxx button[text=Rechercher]');
    await rep;
    await p.waitForTimeout(800);
    n = await p.evaluate(() => Ext.ComponentQuery.query('produitsxx')[0].getStore().getTotalCount());
    ok('4. Produits : la recherche rend les 4 fiches', n === 4, n);
    await C.vues.cliquer(p, 'produitsxx #btnCocherTout');
    rep = p.waitForResponse((x) => /fichearticle\/account-lot/.test(x.url()), { timeout: 120000 });
    await repondreMessage(p, 'article(s) du résultat', 'yes');
    r = await (await rep).json().catch(() => ({}));
    await p.waitForTimeout(1000);
    ok('4. Confirmé : les 4 fiches retenues en base (bool_ACCOUNT à 0)', r.success === true && valeurs('bool_ACCOUNT') === '0,0,0,0', JSON.stringify(r));
    const ret = ['Article retenu : avant non → après oui'];
    controler('4', 'Gestion des articles', t0, { 1: ret, 3: ret, 4: ret });

    /* ---------- 5. onglet « Historique » de la fiche 1 ---------- */
    etape = 'historique';
    await ouvrirFicheArticle(p);
    const champ = p.locator('input[placeholder="Recherche"]').filter({ visible: true }).first();
    await champ.click(); await p.keyboard.press('Control+A'); await p.keyboard.type(F(1).cip); await p.keyboard.press('Enter');
    await p.waitForFunction(() => { const s = Ext.ComponentQuery.query('famillemanager')[0].getStore(); return !s.isLoading() && s.getCount() > 0; }, null, { timeout: 60000 });
    await p.waitForTimeout(500);
    await p.locator('.x-grid-row:visible').filter({ hasText: F(1).cip }).first().locator('.fa-action-edit').first().click();
    await p.waitForFunction(() => { const w = window.winModifArticleOuverte; return w && !w.isDestroyed && w.down('#int_CIP') && w.down('#int_CIP').getValue(); }, null, { timeout: 60000 });
    await p.waitForTimeout(1200);
    await p.locator('.x-window .x-tab').filter({ hasText: 'Historique' }).first().click({ timeout: 10000 });
    await p.waitForFunction(() => { const g = window.winModifArticleOuverte.down('#historiqueFiche'); return g && g.getStore().getCount() > 0; }, null, { timeout: 30000 });
    await p.waitForTimeout(600);
    const ecran = await p.evaluate(() => Array.from(window.winModifArticleOuverte.down('#historiqueFiche').getEl().dom.querySelectorAll('.x-grid-row')).map((x) => {
      const c = Array.from(x.querySelectorAll('td'));
      return { action: c[1].textContent.trim(), auteur: c[2].textContent.trim(), champs: Array.from(c[3].querySelectorAll('.histo-champ')).map((d) => d.textContent.replace(/\s+/g, ' ').trim()) };
    }));
    let api = {};
    try { api = JSON.parse(await (await ctx.request.get((process.env.BASE || 'http://localhost:8080/prestige') + '/api/v1/fichearticle/historique/' + F(1).id)).text()); } catch (e) { api = {}; }
    const enLot = ecran.filter((x) => x.action === 'Modification en lot');
    const base = journal(DEBUT).filter((l) => l[0] === F(1).id);
    const attendusEcran = ['Grossiste : ' + NOM_G1 + ' → ' + NOM_G2, 'Q1 : 5 → 7', 'Q2 : 10 → 20', 'Sensible : non → oui', 'Article retenu : non → oui'];
    const tousChamps = [].concat(...enLot.map((x) => x.champs));
    ok('5. Historique de la fiche 1 : 4 lignes « Modification en lot », au nom du compte e2e', enLot.length === 4 && base.length === 4 && enLot.every((x) => x.auteur === NOM_E2E), JSON.stringify(ecran.map((x) => x.action + ' / ' + x.auteur)));
    ok('5. Rapprochement écran = base : chaque champ avant → après', attendusEcran.every((a) => tousChamps.includes(a)) && tousChamps.length === attendusEcran.length, JSON.stringify(tousChamps));
    ok('5. Rapprochement écran = API : mêmes lignes, même ordre', api.success && api.data.length === ecran.length && api.data.every((d, i) => d.action === ecran[i].action), JSON.stringify(api.data && api.data.map((d) => d.action)));
    await p.evaluate(() => window.winModifArticleOuverte && window.winModifArticleOuverte.close());
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
    await ctx.close();
  } catch (e) {
    ok('Parcours sans exception', false, etape + ' : ' + e.message);
  } finally {
    nettoyer();
    ok('Bilan : données d\'essai retirées (fiches, tables liées, journal)', restes() === '0/0/0', restes());
    await b.close();
    const k = res.filter((x) => x.c).length;
    console.log('\n' + k + '/' + res.length + ' PASS');
    process.exit(k === res.length ? 0 : 1);
  }
})();
