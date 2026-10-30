/* MESURE DES PARCOURS DEMANDES PAR L'OFFICINE (rapport docs/notices/RAPPORT_PERFORMANCES_2026-10-28.md).
 *
 * Onze parcours, par le vrai chemin de l'ecran : formulaire de connexion, menu clique, dates saisies dans les champs,
 * bouton clique. Pour chaque geste :
 *   - le temps a l'ecran : du clic jusqu'a ce que le reseau soit au repos et qu'aucun masque de chargement ne reste ;
 *   - chaque appel d'API ou de JSP du geste : duree totale, attente du premier octet (temps serveur), taille ;
 *   - le nombre de lignes affichees (total du magasin de la grille, ou cartes du ticket Z).
 * Trois passages par cas : le premier (cache froid) est rendu a part, puis la mediane des trois.
 *
 * Un quatrieme passage, facultatif (SQL_LOG=1), active le journal des requetes lentes de MariaDB au seuil 0 et compte,
 * geste par geste, les requetes SQL de la base mesuree et leur temps cumule. Il n'entre pas dans les medianes : le
 * journal ralentit le serveur. Les reglages d'origine du journal sont remis a la fin.
 *
 * La generation de suggestion ECRIT : apres chaque passage, les suggestions, leurs lignes et les couples
 * produit-grossiste crees sont supprimes, et l'indicateur int_ORERSTATUS des produits touches (pose par le
 * declencheur t_sugesstion_indicateur) reprend sa valeur d'avant. A n'executer que sur une copie de travail.
 *
 * Variables : BASE (url de Prestige, defaut http://localhost:8080/prestige), DB_TEST et E2E_BASE_LIBRE (voir
 * outils/poste.js), MARIADB_OPTIONS, DATE_REF (dernier jour mesure, AAAA-MM-JJ, defaut : veille), PASSAGES (3),
 * PARCOURS (liste de numeros, defaut : tous), SORTIE (fichier JSON des resultats), SQL_LOG (0/1).
 *
 * Exemple (PowerShell) :
 *   $env:DB_TEST='laborex_v1_db'; $env:DATE_REF='2026-10-27'; $env:SQL_LOG='1'
 *   node src/test/e2e/perf/mesure-parcours-officine.js
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const BASE_DB = ENV_E2E.BASE;
const PASSAGES = Number(process.env.PASSAGES || 3);
const SQL_LOG = process.env.SQL_LOG === '1';
const CHOIX = process.env.PARCOURS ? process.env.PARCOURS.split(',').map(Number) : null;
const SORTIE = process.env.SORTIE || path.join(ENV_E2E.TMP, 'mesure-parcours-' + BASE_DB + '.json');
const jourIso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const DATE_REF = process.env.DATE_REF || jourIso(new Date(Date.now() - 86400000));
const q = (s, db) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', db === undefined ? BASE_DB : db,
  '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }).replace(/\r/g, '').trim(); /* client Windows : fins de ligne CR LF */

/* debut d'une periode de n jours finissant a DATE_REF */
function debut(n) { const d = new Date(DATE_REF + 'T12:00:00'); d.setDate(d.getDate() - (n - 1)); return jourIso(d); }
const PERIODES_Z = [['1 jour', 1], ['3 jours', 3], ['1 semaine', 7]];
const PERIODES_VT = PERIODES_Z.concat([['1 mois', 30]]);
const PERIODES_AV = [['1 jour', 1], ['3 jours', 3], ['1 semaine', 7], ['15 jours', 15], ['1 mois', 30], ['3 mois', 90]];

const resultats = { base: BASE_DB, url: vues.BASE, dateRef: DATE_REF, passages: PASSAGES, debut: new Date().toISOString(), cas: [] };
const med = (t) => { const s = t.slice().sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };

/* ---------- journal SQL (passage de diagnostic) ----------
 * long_query_time est copie dans chaque connexion a son ouverture : les connexions deja ouvertes du pool de Payara
 * garderaient l'ancien seuil. Le pool est donc vide (asadmin flush-connection-pool) apres chaque changement, sur le
 * Payara mesure seulement : ASADMIN (chemin d'asadmin) et ASADMIN_PORT (port d'administration, 4848 ou 9048). */
let journalOrigine = null;
function viderPool() {
  if (!process.env.ASADMIN) { return; }
  execFileSync(process.env.ASADMIN, ['--port', process.env.ASADMIN_PORT || '4848', 'flush-connection-pool', process.env.POOL || 'laborex_pool'],
    { encoding: 'utf8', shell: process.platform === 'win32' });
}
function journalActiver() {
  journalOrigine = q("SELECT CONCAT_WS('|', @@global.slow_query_log, @@global.long_query_time, @@global.log_output, @@global.log_slow_admin_statements)", '');
  q("SET GLOBAL log_output='TABLE'; SET GLOBAL long_query_time=0; TRUNCATE TABLE mysql.slow_log; SET GLOBAL slow_query_log=1", '');
  viderPool();
}
function journalRemettre() {
  if (!journalOrigine) { return; }
  const [on, lqt, out] = journalOrigine.split('|');
  q(`SET GLOBAL slow_query_log=${on === '1' || on === 'ON' ? 1 : 0}; SET GLOBAL long_query_time=${Number(lqt)}; SET GLOBAL log_output='${out}'`, '');
  journalOrigine = null;
  viderPool();
}
/* requetes de la base mesuree entre deux instants (heure du serveur MariaDB) */
function journalLire(t0, t1) {
  const lignes = q(`SELECT ROUND(TIME_TO_SEC(query_time)*1000), rows_examined, rows_sent, REPLACE(REPLACE(LEFT(sql_text, 20000), '\\n', ' '), '\\t', ' ')
    FROM mysql.slow_log WHERE db='${BASE_DB}' AND start_time BETWEEN '${t0}' AND '${t1}'`, '');
  const r = lignes ? lignes.split('\n').map((l) => { const c = l.split('\t'); return { ms: Number(c[0]), examinees: Number(c[1]), envoyees: Number(c[2]), sql: c[3] }; }) : [];
  const total = r.reduce((a, x) => a + x.ms, 0);
  return { requetes: r.length, msTotal: total, lignesExaminees: r.reduce((a, x) => a + x.examinees, 0),
    pires: r.slice().sort((a, b) => b.ms - a.ms).slice(0, 5).map((x) => Object.assign({}, x, { sql: x.sql.slice(0, 600) })),
    /* une suggestion passe 26 000 requetes de 0 a 3 ms : les garder toutes depasse la taille d'une chaine JSON. Le rejeu
       (rejouer-sql-ecrans.js) ne reprend que les requetes d'au moins 20 ms. */
    toutes: r.filter((x) => x.ms >= 5).sort((a, b) => b.ms - a.ms).slice(0, 1000) };
}
const heureServeur = () => q('SELECT NOW(6)', '');

/* ---------- suggestions : etat avant, retrait apres ---------- */
function etatSuggestions() {
  return {
    ordres: new Set(q('SELECT lg_SUGGESTION_ORDER_ID FROM t_suggestion_order').split('\n').filter(Boolean)),
    lignes: new Set(q('SELECT lg_SUGGESTION_ORDER_DETAILS_ID FROM t_suggestion_order_details').split('\n').filter(Boolean)),
    couples: new Set(q('SELECT lg_FAMILLE_GROSSISTE_ID FROM t_famille_grossiste').split('\n').filter(Boolean)),
    indicateur: new Map(q("SELECT lg_FAMILLE_ID, IFNULL(int_ORERSTATUS,'NULL') FROM t_famille").split('\n').filter(Boolean).map((l) => l.split('\t')))
  };
}
const liste = (ids) => ids.map((i) => "'" + i.replace(/'/g, "''") + "'").join(',');
function retirerSuggestions(avant) {
  const nouveaux = (sql, set) => q(sql).split('\n').filter(Boolean).filter((i) => !set.has(i));
  const lignes = nouveaux('SELECT lg_SUGGESTION_ORDER_DETAILS_ID FROM t_suggestion_order_details', avant.lignes);
  const ordres = nouveaux('SELECT lg_SUGGESTION_ORDER_ID FROM t_suggestion_order', avant.ordres);
  const couples = nouveaux('SELECT lg_FAMILLE_GROSSISTE_ID FROM t_famille_grossiste', avant.couples);
  const produits = new Set();
  /* empreinte du resultat (rapport des performances, par. 4.1) : produit, grossiste, quantite, prix et statut de chaque
     ligne creee, indicateur pose sur le produit ; identique avant et apres une correction de la generation */
  const contenu = [];
  for (let i = 0; i < lignes.length; i += 500) {
    q(`SELECT CONCAT_WS('|', d.lg_FAMILLE_ID, d.lg_GROSSISTE_ID, d.int_NUMBER, d.int_PRICE, d.int_PRICE_DETAIL, d.int_PAF_DETAIL,
      d.str_STATUT, IFNULL(f.int_ORERSTATUS, 'NULL')) FROM t_suggestion_order_details d JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID
      WHERE d.lg_SUGGESTION_ORDER_DETAILS_ID IN (${liste(lignes.slice(i, i + 500))})`).split('\n').filter(Boolean).forEach((l) => contenu.push(l));
  }
  const empreinte = require('crypto').createHash('sha256').update(contenu.sort().join('\n')).digest('hex').slice(0, 16);
  for (let i = 0; i < lignes.length; i += 500) {
    const lot = liste(lignes.slice(i, i + 500));
    q(`SELECT DISTINCT lg_FAMILLE_ID FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_DETAILS_ID IN (${lot})`).split('\n').filter(Boolean).forEach((f) => produits.add(f));
    q(`DELETE FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_DETAILS_ID IN (${lot})`);
  }
  for (let i = 0; i < ordres.length; i += 500) { q(`DELETE FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID IN (${liste(ordres.slice(i, i + 500))})`); }
  for (let i = 0; i < couples.length; i += 500) { q(`DELETE FROM t_famille_grossiste WHERE lg_FAMILLE_GROSSISTE_ID IN (${liste(couples.slice(i, i + 500))})`); }
  /* indicateur pose par le declencheur : valeur d'avant, par produit */
  const parValeur = new Map();
  produits.forEach((f) => { const v = avant.indicateur.has(f) ? avant.indicateur.get(f) : 'NULL'; if (!parValeur.has(v)) { parValeur.set(v, []); } parValeur.get(v).push(f); });
  parValeur.forEach((ids, v) => { for (let i = 0; i < ids.length; i += 500) { q(`UPDATE t_famille SET int_ORERSTATUS=${v === 'NULL' ? 'NULL' : Number(v)} WHERE lg_FAMILLE_ID IN (${liste(ids.slice(i, i + 500))})`); } });
  return { lignes: lignes.length, ordres: ordres.length, couples: couples.length, produits: produits.size, empreinte };
}

(async () => {
  if ((!CHOIX || CHOIX.some((n) => n === 7 || n === 8)) && process.env.ECRITURE_SUGGESTION !== '1' && BASE_DB !== 'laborex_v1_db') {
    throw new Error('La generation de suggestion ecrit dans la base : ECRITURE_SUGGESTION=1 exige une copie de travail.');
  }
  resultats.volumes = {
    ventes: q("SELECT COUNT(*) FROM t_preenregistrement WHERE str_STATUT='is_Closed'"),
    lignesVente: q('SELECT COUNT(*) FROM t_preenregistrement_detail'),
    clients: q('SELECT COUNT(*) FROM t_client'), tiersPayants: q('SELECT COUNT(*) FROM t_tiers_payant'), produits: q('SELECT COUNT(*) FROM t_famille')
  };
  console.log('Base ' + BASE_DB + ' sur ' + vues.BASE + ', periodes finissant le ' + DATE_REF + ' ; volumes ' + JSON.stringify(resultats.volumes));

  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1600, height: 950 } });
  let p = await ctx.newPage();

  /* ---------- reseau : requetes en vol et appels du geste en cours ---------- */
  let enVol = 0, derniere = Date.now(), appels = null, debutGeste = 0;
  const suivi = (r) => ['xhr', 'fetch', 'document', 'script'].indexOf(r.resourceType()) >= 0;
  function brancher(page) {
    page.on('dialog', (d) => d.dismiss().catch(() => {}));
    page.on('request', (r) => { if (suivi(r)) { enVol++; derniere = Date.now(); } });
    const fin = async (r, echec) => {
      if (!suivi(r)) { return; }
      enVol = Math.max(0, enVol - 1); derniere = Date.now();
      if (!appels) { return; }
      const liste = appels, finA = Date.now() - debutGeste;
      const t = r.timing();
      let taille = null;
      try { taille = (await r.sizes()).responseBodySize; } catch (e) { /* requete abandonnee */ }
      const u = new URL(r.url());
      /* les scripts et pages chargees en cours de geste comptent aussi : ils retardent l'ecran */
      const api = /\/api\/v1\/|\.jsp|SockServlet/.test(r.url());
      liste.push({ appel: (api ? '' : r.resourceType() + ' ') + r.method() + ' ' + u.pathname.replace(/^\/prestige/, ''), requete: u.search.slice(0, 300),
        ms: Math.round(t.responseEnd), serveurMs: Math.round(t.responseStart - t.requestStart), finA, octets: taille, echec: !!echec });
    };
    page.on('requestfinished', (r) => fin(r, false));
    page.on('requestfailed', (r) => fin(r, true));
  }
  brancher(p);

  /* repos : aucune requete en vol depuis 400 ms et aucun masque de chargement visible */
  async function repos(limite) {
    const fin = Date.now() + (limite || 600000);
    while (Date.now() < fin) {
      const masque = await p.evaluate(() => !!(window.Ext && (Ext.ComponentQuery.query('loadmask{isVisible()}').length
        || Array.prototype.some.call(document.querySelectorAll('.x-mask-msg'), (e) => e.offsetParent !== null)
        || Ext.ComponentQuery.query('messagebox{isVisible()}').some((m) => /patienter|chargement|cours/i.test(m.el.dom.textContent))))).catch(() => false);
      if (!masque && enVol === 0 && Date.now() - derniere >= 400) { return derniere; }
      await p.waitForTimeout(50);
    }
    throw new Error('Pas de repos apres ' + (limite || 600000) + ' ms');
  }

  /* un geste mesure : action, repos, lignes ; option sql pour le passage de diagnostic */
  async function geste(action, lignes, sql) {
    const s0 = sql ? heureServeur() : null;
    appels = [];
    const t0 = debutGeste = Date.now();
    await action();
    const tFin = await repos();
    const ms = Math.max(0, tFin - t0);
    const s1 = sql ? heureServeur() : null;
    let n = null;
    try { n = lignes ? await lignes() : null; } catch (e) { n = 'erreur : ' + e.message; }
    const r = { ms, lignes: n, appels: appels.slice() };
    appels = null;
    if (sql) { r.sql = journalLire(s0, s1); }
    return r;
  }

  /* boucle des passages d'un cas, puis le passage SQL */
  async function cas(parcours, libelle, preparer, action, lignes, apres) {
    const passages = [];
    for (let i = 0; i < PASSAGES + (SQL_LOG ? 1 : 0); i++) {
      const diag = i === PASSAGES;
      if (preparer) { await preparer(i); }
      if (diag && !journalOrigine) { journalActiver(); }
      let r;
      try { r = await geste(action, lignes, diag); } catch (e) { r = { ms: null, erreur: String(e.message).slice(0, 300), appels: appels || [] }; appels = null; }
      finally { if (diag && PASSAGES > 0) { journalRemettre(); } }
      if (apres) { r.retrait = await apres(i); }
      r.diagnostic = diag;
      passages.push(r);
    }
    const mesures = passages.filter((x) => !x.diagnostic && x.ms !== null).map((x) => x.ms);
    const c = { parcours, libelle, froid: passages[0].ms, mediane: med(mesures), suivants: mesures.slice(1), lignes: passages[0].lignes, passages };
    /* appels lents : mediane par appel sur les passages mesures */
    const parAppel = {};
    passages.filter((x) => !x.diagnostic).forEach((x) => (x.appels || []).forEach((a) => { (parAppel[a.appel] = parAppel[a.appel] || []).push(a); }));
    c.appels = Object.keys(parAppel).map((k) => ({ appel: k, n: parAppel[k].length, msMediane: med(parAppel[k].map((a) => a.ms)),
      serveurMediane: med(parAppel[k].map((a) => a.serveurMs)), octets: med(parAppel[k].map((a) => a.octets || 0)) }))
      .sort((a, b) => b.msMediane - a.msMediane);
    resultats.cas.push(c);
    fs.writeFileSync(SORTIE, JSON.stringify(resultats, null, 1));
    console.log(('[' + parcours + '] ' + libelle).padEnd(60) + ' froid ' + String(c.froid).padStart(7) + ' ms  mediane ' + String(c.mediane).padStart(7)
      + ' ms  lignes ' + c.lignes + (c.appels[0] ? '  appel le plus long : ' + c.appels[0].appel + ' ' + c.appels[0].msMediane + ' ms' : '')
      + (passages.some((x) => x.retrait && x.retrait.empreinte) ? '  empreinte ' + [...new Set(passages.map((x) => x.retrait && x.retrait.empreinte))].join('/') : '')
      + (passages.some((x) => x.erreur) ? '  ERREUR ' + passages.find((x) => x.erreur).erreur : ''));
    return c;
  }
  const veut = (n) => !CHOIX || CHOIX.indexOf(n) >= 0;
  /* ouverture d'un ecran en deux temps, comme vues.ouvrirMenu : le trajet dans le menu (volet, menu parent) se fait
     avant le chrono, qui ne part qu'au clic sur l'entree */
  let entreeMenu = null;
  async function versLeMenu(xtype) {
    await fermerEcrans();
    /* libelles propres a chaque officine (« Ticket Z » s'appelle « Recapitulatif de caisse » chez l'une) : on les lit
       dans l'arbre du menu de l'utilisateur, par l'ecran vise */
    const lib = await p.evaluate((x) => { let r = null; Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode()
      .cascadeBy((n) => { if (!r && n.get('id') === x && n.parentNode) { r = [n.parentNode.get('text'), n.get('text')]; } }); return r; }, xtype);
    if (!lib) { throw new Error('Ecran ' + xtype + ' absent du menu de ' + ENV_E2E.LOGIN); }
    const [parent, entree] = lib;
    const visible = (sel) => p.locator(sel).filter({ visible: true });
    if (await visible('.prestige-nav .x-grid-row').count() === 0) {
      const id = await p.evaluate(() => { const n = Ext.ComponentQuery.query('navigation')[0]; return n.placeholder ? n.placeholder.getId() : null; });
      await p.click('#' + id);
      await visible('.prestige-nav .x-grid-row').first().waitFor({ timeout: 10000 });
    }
    const exact = (t) => new RegExp('^\\s*' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$');
    await visible('.prestige-nav .x-grid-row').filter({ has: p.getByText(exact(parent)) }).first().click();
    /* un menu long deborde du volet flottant : l'entree peut etre sous le bord, on la fait defiler jusqu'a la vue */
    await visible('.prestige-flyout-menu').first().waitFor({ timeout: 10000 });
    entreeMenu = visible('.prestige-flyout-menu').first().locator('.x-menu-item').filter({ has: p.getByText(exact(entree)) }).first();
    await entreeMenu.waitFor({ state: 'attached', timeout: 10000 });
    await entreeMenu.scrollIntoViewIfNeeded();
  }
  const clicMenu = () => entreeMenu.click();
  const ouvrir = async (xtype) => { await versLeMenu(xtype); await clicMenu(); };
  const fermerEcrans = () => p.evaluate(() => { try { prestigeShowMetro(); } catch (e) { /* ancien en-tete */ } }).then(() => p.waitForTimeout(800));
  const poser = (requete, iso) => p.evaluate(([r, d]) => { const c = r.charAt(0) === '#' && r.indexOf(' ') < 0 ? Ext.getCmp(r.slice(1)) : Ext.ComponentQuery.query(r)[0];
    c.setValue(Ext.Date.parse(d, 'Y-m-d')); }, [requete, iso]);
  /* clic reel sur le bouton visible de libelle donne dans l'ecran (xtype) */
  async function bouton(xtype, texte) {
    const id = await p.evaluate(([x, t]) => { const v = Ext.ComponentQuery.query(x)[0];
      const btn = v.query('button').filter((b) => b.isVisible(true) && new RegExp('^\\s*' + t + '\\s*$', 'i').test(b.getText() || ''))[0];
      return btn ? btn.getId() : null; }, [xtype, texte]);
    if (!id) { throw new Error('Bouton « ' + texte + ' » introuvable dans ' + xtype); }
    await p.click('#' + id);
  }
  /* lignes de la grille principale de l'ecran : la plus grande grille visible */
  const total = () => () => p.evaluate(() => { const g = Ext.ComponentQuery.query('tablepanel').filter((x) => x.getStore && x.isVisible(true) && x.getEl())
    .sort((a, b) => b.getWidth() * b.getHeight() - a.getWidth() * a.getHeight())[0];
    return g ? g.getStore().getTotalCount() || g.getStore().getCount() : null; });

  try {
    /* ---- 9. Tableau de bord apres la connexion : chaque passage est une connexion */
    if (veut(9)) {
      await cas(9, 'Tableau de bord apres connexion', async (i) => {
        if (i > 0) { await ctx.clearCookies(); await p.goto('about:blank'); }
        await p.goto(vues.BASE + '/security/index.html', { waitUntil: 'domcontentloaded' });
        await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest');
      }, async () => {
        await p.click('#login');
        await p.waitForURL('**/general/**', { timeout: 120000 });
        await p.waitForFunction(() => window.Ext && Ext.ComponentQuery && Ext.ComponentQuery.query('dashboard tableaubord').length > 0
          && document.querySelector('[data-tuile="ca"] .tb-v') && document.querySelector('[data-tuile="ca"] .tb-v').textContent.trim() !== '…', null, { timeout: 300000 });
      }, () => p.evaluate(() => document.querySelectorAll('[data-tuile]').length));
    } else {
      await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    }
    await repos();

    /* ---- 1. Ticket Z */
    if (veut(1)) {
      await fermerEcrans();
      await ouvrir('ticketzmanager');
      await p.waitForSelector('.ticketz-carte, .ticketz-vide', { timeout: 120000 });
      await repos();
      for (const [lib, n] of PERIODES_Z) {
        await cas(1, 'Ticket Z, ' + lib, async () => { await poser('ticketzmanager #dtStart', debut(n)); await poser('ticketzmanager #dtEnd', DATE_REF); },
          () => bouton('ticketzmanager', 'Afficher'), () => p.evaluate(() => document.querySelectorAll('.ticketz-carte').length));
      }
    }

    /* ---- 2 et 3. Clients et tiers payants (GESTION DES TIERS-PAYANTS) */
    for (const [num, entree, xtype] of [[2, 'Clients', 'clientmanager'], [3, 'Tiers-payants', 'tierspayantmanager']]) {
      if (!veut(num)) { continue; }
      await cas(num, 'Liste des ' + entree.toLowerCase() + ' : ouverture par le menu', () => versLeMenu(xtype),
        clicMenu, total(xtype));
      await cas(num, 'Liste des ' + entree.toLowerCase() + ' : bouton rechercher', null,
        () => bouton(xtype, 'rechercher'), total(xtype));
    }

    /* ---- 4. Ventes terminees */
    if (veut(4)) {
      await fermerEcrans();
      await ouvrir('ventemanager');
      await repos();
      for (const [lib, n] of PERIODES_VT) {
        await cas(4, 'Ventes terminees, ' + lib, async () => { await poser('ventemanager #dtStart', debut(n)); await poser('ventemanager #dtEnd', DATE_REF); },
          () => vues.cliquer(p, 'ventemanager #rechercher'), total('ventemanager'));
      }
    }

    /* ---- 5, 7 et 8. Articles vendus recap, puis suggestions depuis cet ecran */
    if (veut(5) || veut(7) || veut(8)) {
      await fermerEcrans();
      await ouvrir('articlevendurecapitulatif');
      await repos();
      const periode = (n) => async () => { await poser('#dt_debut', debut(n)); await poser('#dt_fin', DATE_REF); };
      if (veut(5)) {
        for (const [lib, n] of PERIODES_AV) {
          await cas(5, 'Articles vendus recap, ' + lib, periode(n), () => bouton('articlevendurecapitulatif', 'rechercher'), total('articlevendurecapitulatif'));
        }
      }
      /* suggestion : la quantite vendue (filtre « Tous »), puis le seuil (filtre « Seuil atteint » et quantite de reappro) */
      const modes = [];
      if (veut(7)) { modes.push([7, 'quantites vendues', 'ALL', /quantités vendues/]); }
      if (veut(8)) { modes.push([8, 'seuil atteint, quantites de reappro', 'SEUIL', /quantités de réappro/]); }
      for (const [num, lib, filtre, item] of modes) {
        for (const [plib, n] of PERIODES_AV) {
          let avant = null;
          await cas(num, 'Suggestion ' + lib + ', ' + plib, async () => {
            await periode(n)();
            await p.evaluate((f) => { Ext.getCmp('str_TYPE_TRANSACTION').setValue(f); }, filtre);
            await repos();
            avant = etatSuggestions();
          }, async () => {
            const id = await p.evaluate(() => { const b = Ext.ComponentQuery.query('articlevendurecapitulatif splitbutton[text=Suggerer]')[0]; return b.getId(); });
            /* la fleche du bouton partage ouvre le menu */
            const box = await p.locator('#' + id).boundingBox();
            await p.mouse.click(box.x + box.width - 6, box.y + box.height / 2);
            await p.locator('.x-menu-item:visible').filter({ hasText: item }).first().click();
            await p.waitForFunction(() => Ext.ComponentQuery.query('messagebox{isVisible()}').some((m) => /produits suggérés/.test(m.el.dom.textContent)), null, { timeout: 2400000 });
          }, () => p.evaluate(() => { const t = Ext.ComponentQuery.query('messagebox{isVisible()}').map((m) => m.el.dom.textContent).join(' ');
            const m = /suggérés : (\d+)/.exec(t), ig = /ignorés\) : (\d+)/.exec(t); return (m ? Number(m[1]) : 0) + ' suggérés, ' + (ig ? Number(ig[1]) : 0) + ' ignorés'; }),
          async () => {
            /* la boite est fermee sans OK : OK ouvrirait la liste des suggestions */
            await p.evaluate(() => Ext.MessageBox.hide());
            return retirerSuggestions(avant);
          });
        }
      }
      await p.evaluate(() => { Ext.getCmp('str_TYPE_TRANSACTION').setValue('ALL'); });
    }

    /* ---- 6. Liste des articles vendus (memes identifiants que le recap : l'autre ecran est ferme d'abord) */
    if (veut(6)) {
      await fermerEcrans();
      await ouvrir('articlevendumanager');
      await repos();
      for (const [lib, n] of PERIODES_AV) {
        await cas(6, 'Articles vendus, ' + lib, async () => { await poser('#dt_Date_Debut', debut(n)); await poser('#dt_Date_Fin', DATE_REF); },
          () => bouton('articlevendumanager', 'rechercher'), total('articlevendumanager'));
      }
    }

    /* ---- 10. Fiche article : ouverture, recherche, affichage d'une fiche */
    if (veut(10)) {
      const grille = 'famillemanager';
      await cas(10, 'Fiche article : ouverture par le menu', () => versLeMenu('famillemanager'), clicMenu, total(grille));
      await cas(10, 'Fiche article : recherche « PARA »', async () => {
        await p.evaluate(() => { Ext.getCmp('rechecher').setValue(''); });
      }, async () => { await vues.saisir(p, '#rechecher', 'PARA'); await p.keyboard.press('Enter'); }, total(grille));
      /* une ligne differente a chaque passage : l'apercu d'un produit deja affiche ne se recharge pas */
      let rang = 0;
      await cas(10, 'Fiche article : apercu (double-clic sur une ligne)', async (i) => { rang = i + 1; },
        async () => { await p.locator('.x-grid-row:visible').nth(rang).locator('td').nth(2).dblclick(); }, null);
      /* fiche complete : action « Modifier » de la ligne, fenetre refermee apres la mesure */
      await cas(10, 'Fiche article : fiche complete (Modifier)', async (i) => { rang = i + 1; },
        async () => {
          await p.locator('.x-grid-row:visible').nth(rang).locator('.fa-action-edit').first().click();
          await p.waitForFunction(() => Ext.ComponentQuery.query('window{isVisible()}').some((w) => /Modification Article/.test(w.title || '')), null, { timeout: 120000 });
        }, null,
        () => p.evaluate(() => { Ext.ComponentQuery.query('window{isVisible()}').filter((w) => /Modification Article/.test(w.title || '')).forEach((w) => w.close()); }));
    }

    /* ---- 11. Pilotage (ANALYSE DE GESTION) : ouverture, puis chaque onglet par un clic sur son titre */
    if (veut(11)) {
      await cas(11, 'Pilotage : ouverture par le menu', () => versLeMenu('pilotage'), async () => {
        await clicMenu();
        await p.waitForFunction(() => Array.prototype.some.call(document.querySelectorAll('.pilotage-tuile'), (e) => /[0-9]/.test(e.textContent || '')), null, { timeout: 300000 });
      }, null);
      const onglets = await p.evaluate(() => Ext.ComponentQuery.query('pilotage #onglets')[0].items.items.map((o) => ({ cle: o.cleOnglet || o.itemId, titre: o.title })));
      for (const o of onglets) {
        await cas(11, 'Pilotage : onglet ' + o.cle, async () => {
          /* depart d'un autre onglet : le dernier pour la synthese, la synthese pour les autres */
          await p.evaluate((c) => { const o = Ext.ComponentQuery.query('pilotage #onglets')[0];
            o.setActiveTab((o.items.items[0].cleOnglet || o.items.items[0].itemId) === c ? o.items.length - 1 : 0); }, o.cle);
          await repos();
        }, async () => {
          const id = await p.evaluate((c) => Ext.ComponentQuery.query('pilotage #onglets')[0].items.items.filter((x) => (x.cleOnglet || x.itemId) === c)[0].tab.getId(), o.cle);
          await p.click('#' + id);
        }, null);
      }
    }
  } catch (e) {
    console.log('FAIL  parcours interrompu  [' + String(e.stack || e.message).slice(0, 500) + ']');
    resultats.erreur = String(e.message);
  } finally {
    journalRemettre();
    if (SQL_LOG) { q('TRUNCATE TABLE mysql.slow_log', ''); }
    resultats.fin = new Date().toISOString();
    fs.writeFileSync(SORTIE, JSON.stringify(resultats, null, 1));
    console.log('Resultats : ' + SORTIE);
    await b.close();
  }
})();
