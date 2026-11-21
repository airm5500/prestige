/* DEMANDE 71 (application Prestige Pharmacien, 21/11) : Analyse Article, GET v1/info?search=<CIP> lent pour les produits
 * tres vendus. La derniere vente lisait tout l'historique du produit (des dizaines de milliers de lignes).
 *
 * Correctif : les produits sont d'abord lus sur les ventes des 7 derniers jours (depuis minuit) ; un produit dont un
 * emplacement demande n'a aucune vente dans la fenetre est relu sur tout son historique, comme avant.
 * Lancer aussi en lecture seule sur une base au volume d'une officine (appaul : DB_TEST=appaul, aucune ecriture) : le
 * banc (moins de 8 000 lignes par produit) ne reproduit pas la lenteur.
 *
 * Controles (par l'API de l'application, avec une vraie session) :
 *  - delai : v1/info?search=<CIP> du produit le plus vendu de la semaine plus rapide que la seule requete d'origine des
 *    ventes de ce produit, et sous 3 s ;
 *  - rapprochement : pour des produits varies (tres vendus de la semaine, tres vendus sans vente dans la semaine, peu
 *    vendus, jamais vendus, quelconques), chaque information complementaire = requete d'origine un produit a la fois
 *    (derniere vente et quantite du jour, dernier achat, dernier inventaire, code geo, classe, reserve) ;
 *  - bilan : lecture seule, aucune table lue n'est modifiee.
 * Lancement seul : node src/test/e2e/mobile/test-demande71-2111.js
 */
const { execFileSync } = require('child_process');
const ENV_E2E = require('../outils/poste');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\r/g, '').trim();
const API = (process.env.BASE || 'http://localhost:8080/prestige') + '/api/';
const esc = (v) => String(v).replace(/'/g, "''");
const fr = (d) => (d && d !== 'NULL' ? d.slice(8, 10) + '/' + d.slice(5, 7) + '/' + d.slice(0, 4) : null);
const SEUIL = 2000;
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, ENV_E2E.BASE, '-e', s], { encoding: 'utf8' });

/* Jeu d'essai : la base d'essai n'a plus de vente recente. Deux ventes au comptant (quantites 2 et 3) du produit tres
   vendu le plus vendu, par l'API de l'ecran de vente, comme un pharmacien qui vend puis ouvre l'Analyse Article.
   Tout est retire a la fin (ventes, traces, stock remis), comme test-ecran-recette-date-vente.js. */
const CAISSE = 'e2e-d71-caisse';
const USER = q(`SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN}'`);
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
const ventes = [];
let produit = null, stockOrigine = null, caisseCreee = false, jeuEssai = false;
/* base d'une officine (appaul) ou E2E_LECTURE_SEULE=1 : aucune ecriture, le test lit les ventes reelles de la semaine */
const LECTURE_SEULE = process.env.E2E_LECTURE_SEULE === '1' || /^appaul/.test(ENV_E2E.BASE);
const ventesDuTest = () => {
  const ids = ventes.map((v) => `'${v}'`).join(',') || "'-'";
  return q(`SELECT IFNULL(GROUP_CONCAT(CONCAT('''', lg_PREENREGISTREMENT_ID, '''')), '''-''') FROM t_preenregistrement`
    + ` WHERE lg_PREENREGISTREMENT_ID IN (${ids}) OR lg_PARENT_ID IN (${ids}) OR (dt_CREATED >= '${DEBUT}' AND lg_USER_ID = '${USER}')`);
};
function nettoyer() {
  const v = ventesDuTest();
  exec(`CREATE TEMPORARY TABLE e2e_d71_l AS SELECT lg_PREENREGISTREMENT_DETAIL_ID id FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (${v});`
    + `CREATE TEMPORARY TABLE e2e_d71_r AS SELECT lg_REGLEMENT_ID id FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (${v}) AND lg_REGLEMENT_ID IS NOT NULL;`
    + `DELETE FROM vente_reglement WHERE vente_id IN (${v});`
    + `DELETE FROM hmvtproduit WHERE pkey IN (SELECT id FROM e2e_d71_l);`
    + `DELETE FROM mvttransaction WHERE pkey IN (${v}) OR vente_id IN (${v});`
    + `DELETE FROM t_recettes WHERE str_REF_FACTURE IN (${v});`
    + `DELETE FROM t_preenregistrement_compte_client WHERE lg_PREENREGISTREMENT_ID IN (${v});`
    + `DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (${v});`
    + `UPDATE t_preenregistrement SET lg_PREENGISTREMENT_ANNULE_ID = NULL, lg_PARENT_ID = NULL, lg_REGLEMENT_ID = NULL WHERE lg_PREENREGISTREMENT_ID IN (${v});`
    + `DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (${v});`
    + `DELETE FROM t_reglement WHERE lg_REGLEMENT_ID IN (SELECT id FROM e2e_d71_r);`
    + `DELETE FROM notification_client WHERE notification_id IN (SELECT id FROM notification WHERE user_id = '${USER}' AND created_at >= '${DEBUT}');`
    + `DELETE FROM notification WHERE user_id = '${USER}' AND created_at >= '${DEBUT}';`
    + `DELETE FROM t_event_log WHERE lg_USER_ID = '${USER}' AND dt_CREATED >= '${DEBUT}';`
    + `DROP TEMPORARY TABLE IF EXISTS e2e_d71_l; DROP TEMPORARY TABLE IF EXISTS e2e_d71_r;`);
  if (produit && stockOrigine !== null) {
    exec(`UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = ${stockOrigine[0]}, int_NUMBER = ${stockOrigine[1]} WHERE lg_FAMILLE_ID = '${produit.id}' AND lg_EMPLACEMENT_ID = '1'`);
  }
  if (caisseCreee) { exec(`DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID = '${CAISSE}'`); }
}

/* Requetes d'origine (ProduitExtraInfoServiceImpl.getExtraInfo), un produit a la fois */
function attendu(f, e) {
  const x = { dateDerniereVente: null, qteDerniereVente: null, dateDernierAchat: null, qteDernierAchat: null,
    dateDernierInventaire: null, qteDernierInventaire: null, stockReserve: null, seuilReserve: null, seuilMiniRayon: null };
  const fam = q(`SELECT 'x', COALESCE(f.str_CODE_GEO_ARTICLE,'NULL'), COALESCE(c.str_CODE,'NULL'), COALESCE(f.bool_RESERVE,0),
    COALESCE(f.int_SEUIL_RESERVE,'NULL'), COALESCE(f.int_SEUIL_MINI_RAYON,'NULL') FROM t_famille f
    LEFT JOIN t_classe_abc c ON c.lg_CLASSE_ABC_ID = f.lg_CLASSE_ABC_ID WHERE f.lg_FAMILLE_ID = '${esc(f)}'`).split('\t').slice(1);
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
const liste = (sql) => q(sql).split('\n').filter(Boolean);
const EMPREINTE = () => q('CHECKSUM TABLE t_famille, t_famille_stock, t_preenregistrement, t_preenregistrement_detail, t_bon_livraison_detail, t_inventaire_famille, t_type_stock_famille')
  .split('\n').map((l) => l.split('\t')[1]).join(',');

(async () => {
  let avant = null;
  const login = await fetch(API + 'v1/user/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: ENV_E2E.LOGIN, password: 'e2etest' }) });
  const cookie = (login.headers.get('set-cookie') || '').split(';')[0];
  const get = async (u) => { const t0 = Date.now(); const r = await fetch(API + u, { headers: { Cookie: cookie } }); const t = await r.text();
    return { s: r.status, ms: Date.now() - t0, j: r.status === 200 ? JSON.parse(t) : null }; };
  const post = async (u, c) => { const r = await fetch(API + u, { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(c) });
    const t = await r.text(); try { return JSON.parse(t); } catch (e) { return { success: false, brut: t.slice(0, 200) }; } };
  const venteComptant = async (qte) => {
    const add = await post('v1/vente/add/vno', { typeVenteId: '1', natureVenteId: '1', produitId: produit.id, itemPu: produit.pu, qte, qteServie: qte,
      devis: false, prevente: false, remiseId: '', userVendeurId: USER });
    const id = add.data && add.data.lgPREENREGISTREMENTID;
    if (!id) { throw new Error('vente non créée ' + JSON.stringify(add).slice(0, 200)); }
    ventes.push(id);
    const net = await post('v1/vente/net/vno', { venteId: id, remiseId: '', checkUg: false });
    const data = net.data || {}, montant = data.montantNet || produit.pu * qte;
    const c = await post('v1/vente/cloturer/vno', { venteId: id, typeVenteId: '1', natureVenteId: '1', devis: false, remiseId: '', userVendeurId: USER,
      montantRecu: montant, montantRemis: 0, montantPaye: montant, totalRecap: montant, partTP: 0, typeRegleId: '1', clientId: '', nom: '', commentaire: '', banque: '', lieux: '',
      marge: data.marge || 0, data, reglements: [{ typeReglement: '1', montant, montantAttentu: montant }] });
    if (!c.success) { throw new Error('vente non clôturée ' + JSON.stringify(c).slice(0, 200)); }
  };
  try {
    /* produits tres vendus (plus de SEUIL lignes), et ceux d'entre eux vendus depuis 7 jours (minuit) */
    const recents = "(SELECT DISTINCT d.lg_FAMILLE_ID FROM t_preenregistrement v JOIN t_preenregistrement_detail d ON d.lg_PREENREGISTREMENT_ID = v.lg_PREENREGISTREMENT_ID"
      + " WHERE v.str_STATUT = 'is_Closed' AND v.dt_UPDATED >= CURDATE() - INTERVAL 7 DAY)";
    const lireChaudsRecents = () => liste(`SELECT d.lg_FAMILLE_ID FROM t_preenregistrement_detail d WHERE d.lg_FAMILLE_ID IN ${recents} GROUP BY d.lg_FAMILLE_ID HAVING COUNT(*) > ${SEUIL} ORDER BY COUNT(*) DESC LIMIT 6`);
    let chaudsRecents = lireChaudsRecents();
    if (chaudsRecents.length === 0 && !LECTURE_SEULE) {
      /* jeu d'essai : le produit tres vendu (non deconditionne) qui a le plus de lignes de vente, vendu deux fois */
      const a = q(`SELECT CONCAT(f.lg_FAMILLE_ID, ':', f.int_PRICE) FROM (SELECT lg_FAMILLE_ID, COUNT(*) n FROM t_preenregistrement_detail GROUP BY lg_FAMILLE_ID HAVING COUNT(*) > ${SEUIL}) z
        JOIN t_famille f ON f.lg_FAMILLE_ID = z.lg_FAMILLE_ID JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'
        WHERE f.str_STATUT = 'enable' AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 AND COALESCE(f.lg_FAMILLE_PARENT_ID, '') = '' AND f.int_PRICE > 0 ORDER BY z.n DESC LIMIT 1`).split(':');
      produit = { id: a[0], pu: parseInt(a[1], 10) };
      stockOrigine = q(`SELECT CONCAT(int_NUMBER_AVAILABLE, '|', int_NUMBER) FROM t_famille_stock WHERE lg_FAMILLE_ID = '${produit.id}' AND lg_EMPLACEMENT_ID = '1'`).split('|');
      jeuEssai = true;
      exec(`UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = 100, int_NUMBER = 100 WHERE lg_FAMILLE_ID = '${produit.id}' AND lg_EMPLACEMENT_ID = '1'`);
      if (q(`SELECT COUNT(*) FROM t_resume_caisse WHERE lg_USER_ID = '${USER}' AND str_STATUT = 'is_Using'`) === '0') {
        exec("INSERT INTO t_resume_caisse (ld_CAISSE_ID, lg_USER_ID, int_SOLDE_MATIN, int_SOLDE_SOIR, dt_DAY, dt_CREATED, lg_CREATED_BY, dt_UPDATED, lg_UPDATED_BY, str_STATUT)"
          + ` VALUES ('${CAISSE}', '${USER}', 0, 0, CURDATE(), NOW(), '${USER}', NOW(), '${USER}', 'is_Using')`);
        caisseCreee = true;
      }
      await venteComptant(2);
      await venteComptant(3);
      ok('Jeu d\'essai : deux ventes clôturées du produit très vendu, quantités 2 et 3', q(`SELECT COUNT(*), SUM(d.int_QUANTITY) FROM t_preenregistrement v
        JOIN t_preenregistrement_detail d ON d.lg_PREENREGISTREMENT_ID = v.lg_PREENREGISTREMENT_ID WHERE v.lg_PREENREGISTREMENT_ID IN (${ventesDuTest()}) AND v.str_STATUT = 'is_Closed'`) === '2\t5');
      chaudsRecents = lireChaudsRecents();
    }
    avant = EMPREINTE();
    const chauds = liste(`SELECT lg_FAMILLE_ID FROM t_preenregistrement_detail GROUP BY lg_FAMILLE_ID HAVING COUNT(*) > ${SEUIL} ORDER BY COUNT(*) DESC`);
    const chaudsAnciens = chauds.filter((f) => !chaudsRecents.includes(f)).filter((f) => q(`SELECT COUNT(*) FROM t_preenregistrement v JOIN t_preenregistrement_detail d ON d.lg_PREENREGISTREMENT_ID = v.lg_PREENREGISTREMENT_ID
      WHERE d.lg_FAMILLE_ID = '${esc(f)}' AND v.str_STATUT = 'is_Closed' AND v.dt_UPDATED >= CURDATE() - INTERVAL 7 DAY`) === '0').slice(0, 4);
    ok('Précondition : produits très vendus vendus cette semaine, et très vendus sans vente cette semaine', chaudsRecents.length >= 1 && chaudsAnciens.length >= 1,
      chaudsRecents.length + ' / ' + chaudsAnciens.length);

    /* ---- delai : le plus vendu de la semaine ---- */
    const H = chaudsRecents[0];
    const cipH = q(`SELECT int_CIP FROM t_famille WHERE lg_FAMILLE_ID = '${esc(H)}'`);
    const lignesH = q(`SELECT COUNT(*) FROM t_preenregistrement_detail WHERE lg_FAMILLE_ID = '${esc(H)}'`);
    const t0 = Date.now();
    q(`SELECT x.f, x.e, x.dmax, x.qte FROM (SELECT j.f, j.e, MAX(j.dt) dmax, SUM(j.q) qte, ROW_NUMBER() OVER (PARTITION BY j.f, j.e ORDER BY MAX(j.dt) DESC) rn FROM (
      SELECT d.lg_FAMILLE_ID f, u.lg_EMPLACEMENT_ID e, v.dt_UPDATED dt, d.int_QUANTITY q FROM t_preenregistrement_detail d
      JOIN t_preenregistrement v ON v.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID JOIN t_user u ON u.lg_USER_ID = v.lg_USER_ID
      WHERE v.str_STATUT = 'is_Closed' AND d.lg_FAMILLE_ID IN ('${esc(H)}') AND u.lg_EMPLACEMENT_ID IS NOT NULL) j GROUP BY j.f, j.e, DATE(j.dt)) x WHERE x.rn = 1`);
    const msOrigine = Date.now() - t0;
    await get('v1/info?search=' + encodeURIComponent(cipH)); /* premier appel : chauffe */
    const essais = [];
    for (let k = 0; k < 3; k++) { essais.push(await get('v1/info?search=' + encodeURIComponent(cipH))); }
    const ms = Math.min(...essais.map((e) => e.ms));
    /* au volume d'une officine (20 000 lignes et plus), la lecture complete prend des secondes : v1/info entier doit
       prendre moins de la moitie de la seule requete d'origine. Le banc (moins de 8 000 lignes) ne reproduit pas la
       lenteur : seul le plafond y est controle. */
    const volume = +lignesH >= 20000;
    ok('Délai : v1/info?search=' + cipH + ' (' + lignesH + ' lignes de vente) sous 3 s'
      + (volume ? ', et moins de la moitié de la seule requête d\'origine des ventes' : ' (volume du banc : plafond seul)'),
      essais.every((e) => e.s === 200 && e.j.length >= 1) && ms < 3000 && (!volume || ms * 2 < msOrigine),
      ms + ' ms contre ' + msOrigine + ' ms pour la requête d\'origine seule');

    /* ---- rapprochement : produits varies ---- */
    const ech = new Set([...chaudsRecents, ...chaudsAnciens]);
    liste(`SELECT lg_FAMILLE_ID FROM t_preenregistrement_detail GROUP BY lg_FAMILLE_ID HAVING COUNT(*) BETWEEN 1 AND 30 ORDER BY lg_FAMILLE_ID LIMIT 4`).forEach((f) => ech.add(f));
    liste(`SELECT d.lg_FAMILLE_ID FROM t_preenregistrement_detail d WHERE d.lg_FAMILLE_ID IN ${recents} GROUP BY d.lg_FAMILLE_ID HAVING COUNT(*) BETWEEN 100 AND ${SEUIL} ORDER BY COUNT(*) DESC LIMIT 3`).forEach((f) => ech.add(f));
    liste("SELECT f.lg_FAMILLE_ID FROM t_famille f WHERE f.str_STATUT = 'enable' AND NOT EXISTS (SELECT 1 FROM t_preenregistrement_detail d WHERE d.lg_FAMILLE_ID = f.lg_FAMILLE_ID) ORDER BY f.lg_FAMILLE_ID LIMIT 3").forEach((f) => ech.add(f));
    liste("SELECT lg_FAMILLE_ID FROM t_famille WHERE str_STATUT = 'enable' ORDER BY CRC32(lg_FAMILLE_ID) LIMIT 6").forEach((f) => ech.add(f));
    const ecarts = [];
    let compares = 0;
    let comparesChauds = 0;
    for (const id of ech) {
      const cip = q(`SELECT int_CIP FROM t_famille WHERE lg_FAMILLE_ID = '${esc(id)}' AND str_STATUT = 'enable'`);
      if (!cip) { continue; }
      const r = await get('v1/info?search=' + encodeURIComponent(cip));
      const p = (r.j || []).find((x) => x.produitId === id);
      if (!p) { continue; }
      compares++;
      if (chauds.includes(id)) { comparesChauds++; }
      const emps = liste(`SELECT DISTINCT lg_EMPLACEMENT_ID FROM t_famille_stock WHERE lg_FAMILLE_ID = '${esc(id)}'`);
      const diffs = emps.map((e) => { const x = attendu(id, e); return CHAMPS.filter((c) => norm(p[c]) !== norm(x[c])).map((c) => cip + ' ' + c + ' : ' + p[c] + ' / attendu ' + x[c]); });
      if (!diffs.length) { ecarts.push(id + ' : aucun emplacement de stock'); } else if (!diffs.some((d) => d.length === 0)) { ecarts.push(...diffs[0]); }
    }
    ok('Rapprochement : v1/info = requête d\'origine, produit par produit (' + compares + ' produits dont ' + comparesChauds + ' très vendus, ' + CHAMPS.length + ' informations)',
      compares >= 12 && comparesChauds >= 2 && ecarts.length === 0, ecarts.slice(0, 6).join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    ok('Bilan : les lectures v1/info n\'écrivent rien (aucune table lue modifiée)', avant !== null && EMPREINTE() === avant);
    if (jeuEssai) {
      try { nettoyer(); } catch (x) { ok('Nettoyage', false, x.message); }
      ok('Bilan : jeu d\'essai retiré (aucune vente du test, stock remis)', ventesDuTest() === "'-'" && q(`SELECT CONCAT(int_NUMBER_AVAILABLE, '|', int_NUMBER)
        FROM t_famille_stock WHERE lg_FAMILLE_ID = '${produit.id}' AND lg_EMPLACEMENT_ID = '1'`) === stockOrigine.join('|'));
    }
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
