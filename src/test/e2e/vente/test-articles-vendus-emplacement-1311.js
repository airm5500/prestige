/* ARTICLES VENDUS ET SUGGESTION : MEMES LIGNES SANS LA JOINTURE DES VENDEURS (rapport d'exploitation du 13/11, point 5).
 *
 * Constat chez appaul : « ventestats/suggerer » 27,3 s sur 3,5 mois. Le filtre « emplacement du vendeur = emplacement de
 * l'utilisateur » joignait t_user ; MariaDB partait alors des vendeurs (toutes leurs ventes, toutes dates) au lieu de
 * l'index de date (4,2 s contre 1,0 s a cache chaud, 15,7 s a froid). Quand tous les utilisateurs sont sur le meme
 * emplacement, ce filtre ne retire rien : il est remplace par « vente avec un vendeur ».
 *
 * Rapprochement : la route des articles vendus (celle de l'ecran « Articles vendus », meme critere que la suggestion)
 * rend le meme nombre de lignes, le meme montant total et, sur les periodes courtes, les memes lignes (produit,
 * quantite, reference de vente) que la requete d'origine, ecrite a la main en base avec la jointure des vendeurs.
 * Cas tires au hasard (graine fixe) : periodes de 1 jour a 6 mois, avec ou sans recherche, avec ou sans caissier.
 * Puis un second emplacement est cree, avec un vendeur a qui sont pretees quelques ventes de la periode : le filtre
 * d'origine revient et ces ventes sont bien exclues (memes comparaisons). Tout est remis en etat a la fin.
 * Lancement seul : node src/test/e2e/vente/test-articles-vendus-emplacement-1311.js
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion } = require('../outils/vues');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 28 }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const MARQUE = 'E2EEMP' + Date.now().toString(36);
const SAUVE = 't_e2e_vendeurs_' + MARQUE.toLowerCase();
let pretes = [];
const lignesDe = (t) => t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

/* generateur a graine fixe */
let graine = 20261113;
const hasard = () => { graine = (graine * 1103515245 + 12345) % 2147483648; return graine / 2147483648; };
const entier = (n) => Math.floor(hasard() * n);

function nettoyer() {
  /* les vendeurs d'origine sont gardes en base avant le pret : la remise en etat ne depend pas de ce processus */
  if (q(`SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = '${SAUVE}'`) === '1') {
    exec(`UPDATE t_preenregistrement p JOIN ${SAUVE} s ON s.id = p.lg_PREENREGISTREMENT_ID SET p.lg_USER_ID = s.vendeur; DROP TABLE ${SAUVE};`);
  }
  pretes = [];
  exec(`DELETE FROM t_user WHERE lg_USER_ID = '${MARQUE}'; DELETE FROM t_emplacement WHERE lg_EMPLACEMENT_ID = '${MARQUE}';`);
}

const jour = (d) => d.toISOString().slice(0, 10);
function sqlOrigine(c, emp, lignes) {
  const filtres = [`u.lg_EMPLACEMENT_ID = '${emp}'`, 'p.b_IS_CANCEL = 0', `p.str_STATUT = 'is_Closed'`, 'p.int_PRICE > 0',
    `p.dt_UPDATED >= '${c.debut} 00:00:00'`, `p.dt_UPDATED <= '${c.fin} 23:59:59'`, `s.lg_EMPLACEMENT_ID = '${emp}'`];
  if (c.query) { filtres.push(`(f.str_DESCRIPTION LIKE '${c.query}%' OR f.int_CIP LIKE '${c.query}%' OR f.int_EAN13 LIKE '${c.query}%')`); }
  if (c.user) { filtres.push(`p.lg_USER_CAISSIER_ID = '${c.user}'`); }
  const de = `FROM t_preenregistrement_detail d JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID
    JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID
    JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID WHERE ${filtres.join(' AND ')}`;
  if (lignes) {
    return lignesDe(q(`SELECT CONCAT(f.lg_FAMILLE_ID, '/', d.int_QUANTITY, '/', p.str_REF) ${de}`)).sort();
  }
  /* le client mariadb a rendu une fois une sortie vide (code 0) : une seconde lecture, jamais un faux « 0 » */
  let sortie = q(`SELECT COUNT(*), IFNULL(SUM(d.int_PRICE), 0) ${de}`);
  if (!sortie.includes('\t')) { sortie = q(`SELECT COUNT(*), IFNULL(SUM(d.int_PRICE), 0) ${de}`); }
  const [n, m] = sortie.split('\t');
  return { n: Number(n), montant: Number(m) };
}

async function api(p, c, limit) {
  const url = '../api/v1/ventestats/article-vendus?dtStart=' + c.debut + '&dtEnd=' + c.fin + '&start=0&limit=' + limit + '&nbre=0'
    + (c.query ? '&query=' + encodeURIComponent(c.query) : '') + (c.user ? '&user=' + c.user : '');
  return p.evaluate(async (u) => { const r = await fetch(u); return { status: r.status, corps: await r.text() }; }, url);
}

async function comparer(p, c, emp, nom) {
  const attendu = sqlOrigine(c, emp, false);
  const court = attendu.n <= 3000;
  const r = await api(p, c, court ? 5000 : 1);
  let j = {};
  try { j = JSON.parse(r.corps); } catch (e) { /* corps illisible */ }
  const total = Number(j.total);
  const montant = Number(((j.metaData || {}).montantTotal) || 0);
  let lignesOk = true;
  let detail = '';
  if (court && attendu.n > 0) {
    const vues = (j.data || []).map((x) => x.lgFAMILLEID + '/' + x.intQUANTITY + '/' + x.strREF).sort();
    const base = sqlOrigine(c, emp, true);
    lignesOk = vues.join('|') === base.join('|');
    if (!lignesOk) { detail = ' ; lignes ' + vues.length + ' / ' + base.length + ' ; ' + vues.filter((x) => !base.includes(x)).slice(0, 3).join(' '); }
  }
  const bon = r.status === 200 && total === attendu.n && montant === attendu.montant && lignesOk;
  return { bon, texte: `${nom} ${c.debut}→${c.fin}${c.query ? ' « ' + c.query + ' »' : ''}${c.user ? ' caissier' : ''} : route ${total} lignes / ${montant}, base ${attendu.n} / ${attendu.montant}${detail}`, n: attendu.n };
}

(async () => {
  const [min, max] = q(`SELECT DATE(MIN(dt_UPDATED)), DATE(MAX(dt_UPDATED)) FROM t_preenregistrement WHERE str_STATUT = 'is_Closed' AND dt_UPDATED >= '2025-01-01'`).split('\t');
  const caissiers = lignesDe(q(`SELECT DISTINCT lg_USER_CAISSIER_ID FROM t_preenregistrement WHERE dt_UPDATED >= '2026-06-01' AND lg_USER_CAISSIER_ID IS NOT NULL LIMIT 8`));
  const recherches = ['', '', '', 'A', 'PARA', 'DOLI', '34', 'B', 'AMOX'];
  const t0 = new Date(min).getTime();
  const t1 = new Date(max).getTime();
  const tirer = () => {
    const duree = [1, 1, 3, 7, 15, 31, 92, 183][entier(8)];
    const debut = new Date(t0 + entier(Math.max(1, (t1 - t0) / 86400000 - duree)) * 86400000);
    const fin = new Date(debut.getTime() + (duree - 1) * 86400000);
    return { debut: jour(debut), fin: jour(fin), query: recherches[entier(recherches.length)], user: entier(4) === 0 ? caissiers[entier(caissiers.length)] : '' };
  };
  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  try {
    const ctx = await b.newContext({ viewport: { width: 1600, height: 950 } });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => err.push(e.message));
    await connexion(p, ENV_E2E.LOGIN_SUPPORT, 'e2etest');
    const emp = q(`SELECT lg_EMPLACEMENT_ID FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN_SUPPORT}'`);

    /* 1. un seul emplacement : la jointure des vendeurs est retiree */
    ok('Base d\'essai : tous les utilisateurs sur un seul emplacement', q(`SELECT COUNT(DISTINCT IFNULL(lg_EMPLACEMENT_ID, '-')) FROM t_user`) === '1');
    let echecs = [];
    let avecLignes = 0;
    const N = Number(process.env.CAS || 60);
    for (let i = 0; i < N; i++) {
      const c = tirer();
      const r = await comparer(p, c, emp, 'cas ' + i);
      if (!r.bon) { echecs.push(r.texte); }
      if (r.n > 0) { avecLignes++; }
    }
    ok(`Un emplacement : ${N} recherches tirées au hasard, route = requête d'origine (lignes, total, montant)`, echecs.length === 0, echecs.slice(0, 3).join(' || '));
    ok('Jeux variés : la plupart des recherches ont des lignes', avecLignes >= N / 2, avecLignes + '/' + N);

    /* 2. deux emplacements : le filtre d'origine revient, les ventes pretees au vendeur du depot sont exclues */
    exec(`CREATE TEMPORARY TABLE e AS SELECT * FROM t_emplacement WHERE lg_EMPLACEMENT_ID = '${emp}';
          UPDATE e SET lg_EMPLACEMENT_ID = '${MARQUE}', str_DESCRIPTION = 'DEPOT ESSAI';
          INSERT INTO t_emplacement SELECT * FROM e;`);
    exec(`CREATE TEMPORARY TABLE x AS SELECT * FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN_SUPPORT}';
          UPDATE x SET lg_USER_ID = '${MARQUE}', str_LOGIN = '${MARQUE}', lg_EMPLACEMENT_ID = '${MARQUE}';
          INSERT INTO t_user SELECT * FROM x;`);
    const c2 = { debut: '2026-10-01', fin: '2026-10-07', query: '', user: '' };
    exec(`CREATE TABLE ${SAUVE} AS SELECT lg_PREENREGISTREMENT_ID AS id, lg_USER_ID AS vendeur FROM t_preenregistrement
          WHERE str_STATUT = 'is_Closed' AND b_IS_CANCEL = 0 AND int_PRICE > 0
          AND dt_UPDATED BETWEEN '${c2.debut}' AND '${c2.fin} 23:59:59' ORDER BY lg_PREENREGISTREMENT_ID LIMIT 5`);
    pretes = lignesDe(q(`SELECT id FROM ${SAUVE}`));
    const avant = sqlOrigine(c2, emp, false);
    exec(`UPDATE t_preenregistrement p JOIN ${SAUVE} s ON s.id = p.lg_PREENREGISTREMENT_ID SET p.lg_USER_ID = '${MARQUE}'`);
    const apres = sqlOrigine(c2, emp, false);
    ok('Deux emplacements : les ventes prêtées au dépôt sortent de la requête d\'origine', pretes.length === 5 && apres.n < avant.n, avant.n + ' → ' + apres.n);
    echecs = [];
    const r2 = await comparer(p, c2, emp, 'dépôt');
    if (!r2.bon) { echecs.push(r2.texte); }
    for (let i = 0; i < 15; i++) {
      const r = await comparer(p, tirer(), emp, 'deux emplacements ' + i);
      if (!r.bon) { echecs.push(r.texte); }
    }
    ok('Deux emplacements : route = requête d\'origine, ventes du dépôt exclues (16 recherches)', echecs.length === 0, echecs.slice(0, 3).join(' || ') || r2.texte);
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' || '));
    await ctx.close();
  } finally {
    await b.close();
    nettoyer();
  }
  ok('Données d\'essai retirées', q(`SELECT COUNT(*) FROM t_user WHERE lg_USER_ID = '${MARQUE}'`) === '0'
    && q(`SELECT COUNT(*) FROM t_emplacement WHERE lg_EMPLACEMENT_ID = '${MARQUE}'`) === '0'
    && q(`SELECT COUNT(*) FROM t_preenregistrement WHERE lg_USER_ID = '${MARQUE}'`) === '0'
    && q(`SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = '${SAUVE}'`) === '0');
  const n = res.filter((r) => !r.c).length;
  console.log('\n' + (res.length - n) + '/' + res.length + ' réussis');
  process.exitCode = n ? 1 : 0;
})().catch((e) => { console.error('FATAL', e); try { nettoyer(); } catch (_) { /* rien */ } process.exit(2); });
