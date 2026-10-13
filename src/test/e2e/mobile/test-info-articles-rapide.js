/* MOBILE (13/10) : v1/info (analyse article des applications) et v1/checkproduit.
 * Avant : 6 a 7 requetes par produit, ~155 s pour 1 793 produits sur le banc. Apres : requetes groupees.
 *  - temps de reponse de v1/info sur tout le catalogue (< 20 s sur le banc) ;
 *  - pour un echantillon de produits, chaque information complementaire est recalculee ici avec la requete d'origine
 *    (un produit a la fois : ORDER BY ... DESC LIMIT 1) et doit etre identique : derniere vente, dernier achat,
 *    dernier inventaire, code geo, classe, stock reserve et seuils ;
 *  - stock reserve : deux produits mis en reserve le temps du test (l'un avec 7 en reserve, l'autre sans ligne
 *    de reserve -> 0) ; un produit hors reserve n'a ni stock reserve ni seuils.
 * Donnees remises a la fin : reserve et seuils d'origine, lignes d'historique t_famille creees par le declencheur
 * supprimees, ligne de reserve d'essai supprimee.
 */
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const API = 'http://localhost:8080/prestige/api/';
const esc = (v) => String(v).replace(/'/g, "''");
const fr = (d) => (d && d !== 'NULL' ? d.slice(8, 10) + '/' + d.slice(5, 7) + '/' + d.slice(0, 4) : null);

/* Requetes d'origine (ProduitExtraInfoServiceImpl.getExtraInfo), un produit a la fois */
function attendu(f, e) {
  const x = { dateDerniereVente: null, qteDerniereVente: null, dateDernierAchat: null, qteDernierAchat: null,
    dateDernierInventaire: null, qteDernierInventaire: null, stockReserve: null, seuilReserve: null, seuilMiniRayon: null };
  const fam = q(`SELECT 'x', COALESCE(f.str_CODE_GEO_ARTICLE,'NULL'), COALESCE(c.str_CODE,'NULL'), COALESCE(f.bool_RESERVE,0),
    COALESCE(f.int_SEUIL_RESERVE,'NULL'), COALESCE(f.int_SEUIL_MINI_RAYON,'NULL') FROM t_famille f
    LEFT JOIN t_classe_abc c ON c.lg_CLASSE_ABC_ID = f.lg_CLASSE_ABC_ID WHERE f.lg_FAMILLE_ID = '${esc(f)}'`).split('\t').slice(1); /* 'x' : un code geo vide en tete n'est pas perdu au trim */
  x.codeGeoArticle = fam[0] === 'NULL' ? null : fam[0];
  x.classe = fam[1] === 'NULL' ? null : fam[1];
  const v = q(`SELECT v.dt_UPDATED FROM t_preenregistrement_detail d JOIN t_preenregistrement v ON v.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID
    JOIN t_user u ON u.lg_USER_ID = v.lg_USER_ID WHERE v.str_STATUT = 'is_Closed' AND u.lg_EMPLACEMENT_ID = '${esc(e)}'
    AND d.lg_FAMILLE_ID = '${esc(f)}' ORDER BY v.dt_UPDATED DESC LIMIT 1`);
  if (v) {
    x.dateDerniereVente = fr(v);
    x.qteDerniereVente = +q(`SELECT COALESCE(SUM(d.int_QUANTITY),0) FROM t_preenregistrement_detail d JOIN t_preenregistrement v ON v.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID
      JOIN t_user u ON u.lg_USER_ID = v.lg_USER_ID WHERE v.str_STATUT = 'is_Closed' AND u.lg_EMPLACEMENT_ID = '${esc(e)}'
      AND d.lg_FAMILLE_ID = '${esc(f)}' AND DATE(v.dt_UPDATED) = DATE('${v}')`);
  }
  const a = q(`SELECT b.dt_UPDATED FROM t_bon_livraison_detail d JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID = d.lg_BON_LIVRAISON_ID
    WHERE d.lg_FAMILLE_ID = '${esc(f)}' ORDER BY b.dt_UPDATED DESC LIMIT 1`);
  if (a) {
    x.dateDernierAchat = fr(a);
    x.qteDernierAchat = +q(`SELECT COALESCE(SUM(d.int_QTE_RECUE),0) FROM t_bon_livraison_detail d JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID = d.lg_BON_LIVRAISON_ID
      WHERE d.lg_FAMILLE_ID = '${esc(f)}' AND DATE(b.dt_UPDATED) = DATE('${a}')`);
  }
  const i = q(`SELECT COALESCE(o.dt_UPDATED,'NULL'), COALESCE(o.int_NUMBER,0) FROM t_inventaire_famille o JOIN t_inventaire i ON i.lg_INVENTAIRE_ID = o.lg_INVENTAIRE_ID
    WHERE o.lg_FAMILLE_ID = '${esc(f)}' AND o.bool_INVENTAIRE = 1 AND i.str_STATUT = 'is_Closed' AND i.lg_EMPLACEMENT_ID = '${esc(e)}'
    ORDER BY o.dt_UPDATED DESC LIMIT 1`);
  if (i) { const [d, n] = i.split('\t'); x.dateDernierInventaire = fr(d); x.qteDernierInventaire = +n; }
  if (fam[2] !== '0') {
    x.seuilReserve = fam[3] === 'NULL' ? null : +fam[3];
    x.seuilMiniRayon = fam[4] === 'NULL' ? null : +fam[4];
    const r = q(`SELECT int_NUMBER FROM t_type_stock_famille WHERE lg_TYPE_STOCK_ID = '2' AND lg_FAMILLE_ID = '${esc(f)}'
      AND lg_EMPLACEMENT_ID = '${esc(e)}' LIMIT 1`);
    x.stockReserve = r ? +r : 0;
  }
  return x;
}
const CHAMPS = ['dateDerniereVente', 'qteDerniereVente', 'dateDernierAchat', 'qteDernierAchat', 'dateDernierInventaire',
  'qteDernierInventaire', 'codeGeoArticle', 'classe', 'stockReserve', 'seuilReserve', 'seuilMiniRayon'];
const norm = (v) => (v === undefined || v === '' ? null : v);

(async () => {
  /* deux produits mis en reserve le temps du test */
  const debut = q('SELECT NOW()');
  const [A, B] = q("SELECT lg_FAMILLE_ID FROM t_famille WHERE str_STATUT = 'enable' AND bool_RESERVE = 0 ORDER BY str_NAME LIMIT 2").split('\n');
  const origine = q(`SELECT lg_FAMILLE_ID, bool_RESERVE, COALESCE(int_SEUIL_RESERVE,'NULL'), COALESCE(int_SEUIL_MINI_RAYON,'NULL')
    FROM t_famille WHERE lg_FAMILLE_ID IN ('${A}','${B}')`).split('\n').map((l) => l.split('\t'));
  const empA = q(`SELECT lg_EMPLACEMENT_ID FROM t_famille_stock WHERE lg_FAMILLE_ID = '${A}' LIMIT 1`);
  try {
    q(`UPDATE t_famille SET bool_RESERVE = 1, int_SEUIL_RESERVE = 12, int_SEUIL_MINI_RAYON = 3 WHERE lg_FAMILLE_ID IN ('${A}','${B}')`);
    q(`INSERT INTO t_type_stock_famille (lg_TYPE_STOCK_FAMILLE_ID, lg_FAMILLE_ID, lg_TYPE_STOCK_ID, lg_EMPLACEMENT_ID, str_NAME, str_DESCRIPTION,
      dt_CREATED, dt_UPDATED, str_STATUT, int_NUMBER) VALUES ('E2E-RESERVE-INFO', '${A}', '2', '${empA}', 'E2E', 'E2E', NOW(), NOW(), 'enable', 7)`);

    const login = await fetch(API + 'v1/user/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: 'admin', password: 'e2etest' }) });
    const cookie = (login.headers.get('set-cookie') || '').split(';')[0];
    const get = async (u) => { const t0 = Date.now(); const r = await fetch(API + u, { headers: { Cookie: cookie } }); const t = await r.text(); return { s: r.status, ms: Date.now() - t0, j: r.status === 200 ? JSON.parse(t) : null }; };

    const tout = await get('v1/info');
    const nb = +q("SELECT COUNT(DISTINCT p.lg_FAMILLE_ID) FROM t_famille p JOIN t_zone_geographique z ON p.lg_ZONE_GEO_ID = z.lg_ZONE_GEO_ID JOIN t_grossiste g ON p.lg_GROSSISTE_ID = g.lg_GROSSISTE_ID JOIN t_famille_stock f ON f.lg_FAMILLE_ID = p.lg_FAMILLE_ID WHERE p.str_STATUT = 'enable'");
    ok('v1/info : tout le catalogue rendu (' + nb + ' produits)', tout.s === 200 && tout.j.length === nb, tout.s + ' ' + (tout.j || []).length);
    ok('v1/info : réponse en moins de 20 s (avant : ~155 s)', tout.ms < 20000, tout.ms + ' ms');

    /* echantillon : produits avec vente, avec achat, avec inventaire, les deux en reserve, et des produits quelconques */
    const parId = new Map(tout.j.map((p) => [p.produitId, p]));
    const ech = new Set([A, B]);
    const ajouter = (sql) => q(sql).split('\n').filter(Boolean).forEach((id) => ech.add(id));
    ajouter("SELECT DISTINCT d.lg_FAMILLE_ID FROM t_preenregistrement_detail d JOIN t_preenregistrement v ON v.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID WHERE v.str_STATUT = 'is_Closed' ORDER BY v.dt_UPDATED DESC LIMIT 15");
    ajouter('SELECT DISTINCT lg_FAMILLE_ID FROM t_bon_livraison_detail ORDER BY dt_UPDATED DESC LIMIT 10');
    ajouter("SELECT DISTINCT o.lg_FAMILLE_ID FROM t_inventaire_famille o JOIN t_inventaire i ON i.lg_INVENTAIRE_ID = o.lg_INVENTAIRE_ID WHERE o.bool_INVENTAIRE = 1 AND i.str_STATUT = 'is_Closed' LIMIT 10");
    ajouter("SELECT lg_FAMILLE_ID FROM t_famille WHERE str_STATUT = 'enable' ORDER BY RAND() LIMIT 15");
    const ecarts = [];
    let compares = 0;
    for (const id of ech) {
      const p = parId.get(id);
      if (!p) { continue; }
      compares++;
      /* la requete principale retient un emplacement de stock par produit : on compare a l'un d'eux */
      const emps = q(`SELECT DISTINCT lg_EMPLACEMENT_ID FROM t_famille_stock WHERE lg_FAMILLE_ID = '${esc(id)}'`).split('\n').filter(Boolean);
      const diffs = emps.map((e) => { const x = attendu(id, e); return CHAMPS.filter((c) => norm(p[c]) !== norm(x[c])).map((c) => p.codeCip + ' ' + c + ' : ' + p[c] + ' / attendu ' + x[c]); });
      if (!diffs.some((d) => d.length === 0)) { ecarts.push(...diffs[0]); }
    }
    ok('v1/info : valeurs identiques à la requête d\'origine (' + compares + ' produits, ' + CHAMPS.length + ' informations)', compares >= 20 && ecarts.length === 0, compares + ' ' + ecarts.slice(0, 5).join(' | '));
    ok('v1/info : stock réserve rendu (produit en réserve : 7, seuils 12 / 3)', parId.get(A) && parId.get(A).stockReserve === 7 && parId.get(A).seuilReserve === 12 && parId.get(A).seuilMiniRayon === 3,
      JSON.stringify(parId.get(A) && [parId.get(A).stockReserve, parId.get(A).seuilReserve, parId.get(A).seuilMiniRayon]));
    ok('v1/info : produit en réserve sans ligne de réserve → 0', parId.get(B) && parId.get(B).stockReserve === 0, parId.get(B) && parId.get(B).stockReserve);
    const hors = tout.j.find((p) => p.produitId !== A && p.produitId !== B);
    ok('v1/info : produit hors réserve sans stock réserve ni seuils', hors && hors.stockReserve == null && hors.seuilReserve == null, hors && JSON.stringify([hors.stockReserve, hors.seuilReserve]));

    const cip = parId.get(A).codeCip;
    const un = await get('v1/info?search=' + encodeURIComponent(cip));
    ok('v1/info?search=CIP : le produit seul, avec son stock réserve', un.s === 200 && un.j.length >= 1 && un.j.every((p) => p.codeCip.startsWith(cip)) && un.j.find((p) => p.produitId === A).stockReserve === 7,
      un.s + ' ' + (un.j || []).length);

    const chk = await get('v1/checkproduit?nompdt=' + encodeURIComponent(cip));
    const lA = (chk.j || []).find((p) => p.stockReserve !== undefined && JSON.stringify(p).includes(cip));
    ok('v1/checkproduit : stock réserve rendu (7)', chk.s === 200 && lA && lA.stockReserve === 7, chk.s + ' ' + JSON.stringify(lA || {}).slice(0, 200));
    const toutChk = await get('v1/checkproduit');
    ok('v1/checkproduit (tout) : réponse en moins de 20 s', toutChk.s === 200 && toutChk.ms < 20000 && toutChk.j.length > 0, toutChk.ms + ' ms, ' + (toutChk.j || []).length);
  } finally {
    for (const [id, r, s, m] of origine) {
      q(`UPDATE t_famille SET bool_RESERVE = ${r}, int_SEUIL_RESERVE = ${s}, int_SEUIL_MINI_RAYON = ${m} WHERE lg_FAMILLE_ID = '${id}'`);
      q(`DELETE FROM t_famille_history WHERE lg_FAMILLE_ID = '${id}' AND dt_CREATED >= '${debut}'`);
    }
    q("DELETE FROM t_type_stock_famille WHERE lg_TYPE_STOCK_FAMILLE_ID = 'E2E-RESERVE-INFO'");
    ok('Données remises (réserve, seuils, historique, ligne d\'essai)', q(`SELECT COUNT(*) FROM t_famille WHERE lg_FAMILLE_ID IN ('${A}','${B}') AND bool_RESERVE = 1`) === '0'
      && q("SELECT COUNT(*) FROM t_type_stock_famille WHERE lg_TYPE_STOCK_FAMILLE_ID = 'E2E-RESERVE-INFO'") === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
  process.exit(ko ? 1 : 0);
})();
