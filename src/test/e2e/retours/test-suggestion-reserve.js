/* SUGGESTION DE COMMANDE ET RESERVE (retours du 13/10, point 7, valide le 14/10).
 * Cas de l'officine : stock rayon 19, reserve 272, seuil 126, qte reappro 126, seuil mini rayon 20, capacite rayon 20.
 * Le produit etait suggere a la commande alors que la reserve le couvre, et le rayon ne peut pas en prendre plus.
 *  - un produit gere en reserve n'est suggere a la COMMANDE que si rayon + reserve atteint le seuil ;
 *  - la quantite commandee tient compte de la reserve : (seuil - (rayon + reserve)) + qte reappro ;
 *  - a cote, le REASSORT reserve -> rayon est propose, plafonne a la capacite du rayon : 20 - 19 = 1 ;
 *  - le diagnostic des manques ne le compte plus comme oublie ;
 *  - non-regression : un produit sans reserve au meme stock est toujours suggere, avec la meme quantite qu'avant.
 * Parcours de la caisse par son API (vente de 2 unites qui fait passer le rayon de 21 a 19). Tout est retire.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
const R = 'E2E-SRES-R', S = 'E2E-SRES-S', CAISSE = 'e2e-sres-caisse';
const GROSSISTE = q("SELECT lg_GROSSISTE_ID FROM t_grossiste WHERE str_STATUT = 'enable' ORDER BY str_LIBELLE LIMIT 1");
const MODELE = q("SELECT f.lg_FAMILLE_ID FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
  + " WHERE f.str_STATUT = 'enable' AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 AND COALESCE(f.lg_FAMILLE_PARENT_ID, '') = '' AND f.int_PRICE BETWEEN 500 AND 3000"
  + " ORDER BY f.str_NAME LIMIT 1");
let caisseCreee = false;
const ventes = () => q(`SELECT IFNULL(GROUP_CONCAT(CONCAT('''', lg_PREENREGISTREMENT_ID, '''')), '''-''') FROM t_preenregistrement WHERE dt_CREATED >= '${DEBUT}' AND lg_USER_ID = '${ADMIN}'`);

/* tables qui pointent vers le produit (declencheurs : historique, instantanes de vente...) */
const enfants = () => q("SELECT DISTINCT TABLE_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE()"
  + " AND REFERENCED_TABLE_NAME = 't_famille' AND COLUMN_NAME = 'lg_FAMILLE_ID' AND TABLE_NAME NOT IN ('t_famille_stock', 't_type_stock_famille', 't_famille_grossiste',"
  + " 't_suggestion_order_details', 't_preenregistrement_detail', 'hmvtproduit')").split(/\r?\n/).filter(Boolean);

function retirer() {
  const v = ventes();
  exec(`CREATE TEMPORARY TABLE e2e_sres_l AS SELECT lg_PREENREGISTREMENT_DETAIL_ID id FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (${v});`
    + `CREATE TEMPORARY TABLE e2e_sres_r AS SELECT lg_REGLEMENT_ID id FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (${v}) AND lg_REGLEMENT_ID IS NOT NULL;`
    + `DELETE FROM vente_reglement WHERE vente_id IN (${v});`
    + `DELETE FROM hmvtproduit WHERE pkey IN (SELECT id FROM e2e_sres_l) OR lg_FAMILLE_ID IN ('${R}', '${S}');`
    + `DELETE FROM mvttransaction WHERE pkey IN (${v}) OR vente_id IN (${v});`
    + `DELETE FROM t_recettes WHERE str_REF_FACTURE IN (${v});`
    + `DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (${v});`
    + `UPDATE t_preenregistrement SET lg_REGLEMENT_ID = NULL WHERE lg_PREENREGISTREMENT_ID IN (${v});`
    + `DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (${v});`
    + `DELETE FROM t_reglement WHERE lg_REGLEMENT_ID IN (SELECT id FROM e2e_sres_r);`
    + `DROP TEMPORARY TABLE e2e_sres_l; DROP TEMPORARY TABLE e2e_sres_r;`
    + `CREATE TEMPORARY TABLE e2e_sres_s AS SELECT DISTINCT lg_SUGGESTION_ORDER_ID id FROM t_suggestion_order_details WHERE lg_FAMILLE_ID IN ('${R}', '${S}');`
    + `DELETE FROM t_suggestion_order_details WHERE lg_FAMILLE_ID IN ('${R}', '${S}');`
    + `DELETE FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID IN (SELECT id FROM e2e_sres_s) AND dt_CREATED >= '${DEBUT}'`
    + `  AND NOT EXISTS (SELECT 1 FROM t_suggestion_order_details d WHERE d.lg_SUGGESTION_ORDER_ID = t_suggestion_order.lg_SUGGESTION_ORDER_ID);`
    + `DROP TEMPORARY TABLE e2e_sres_s;`
    + `DELETE FROM t_famille_grossiste WHERE lg_FAMILLE_ID IN ('${R}', '${S}');`
    + `DELETE FROM t_type_stock_famille WHERE lg_FAMILLE_ID IN ('${R}', '${S}');`
    + `DELETE FROM t_famille_stock WHERE lg_FAMILLE_ID IN ('${R}', '${S}');`
    + enfants().map((t) => `DELETE FROM \`${t}\` WHERE lg_FAMILLE_ID IN ('${R}', '${S}');`).join('')
    + `DELETE FROM t_famille WHERE lg_FAMILLE_ID IN ('${R}', '${S}');`);
  if (caisseCreee) { exec(`DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID = '${CAISSE}'`); }
}

function produit(id, cip, reserve) {
  exec(`CREATE TEMPORARY TABLE tmp_f SELECT * FROM t_famille WHERE lg_FAMILLE_ID = '${MODELE}';`
    + `UPDATE tmp_f SET lg_FAMILLE_ID = '${id}', int_CIP = '${cip}', str_NAME = 'ZZ E2E SUGGESTION ${id.slice(-1)}', str_DESCRIPTION = 'ZZ E2E SUGGESTION ${id.slice(-1)}',`
    + ` int_EAN13 = NULL, lg_GROSSISTE_ID = '${GROSSISTE}', int_SEUIL_MIN = 126, int_QTE_REAPPROVISIONNEMENT = 126, lg_CODE_GESTION_ID = NULL,`
    + ` bool_SUGGERABLE = 1, bool_RESERVE = ${reserve ? 1 : 0}, int_SEUIL_MINI_RAYON = ${reserve ? 20 : 'NULL'}, int_SEUIL_RESERVE = ${reserve ? 20 : 'NULL'};`
    + 'INSERT INTO t_famille SELECT * FROM tmp_f; DROP TEMPORARY TABLE tmp_f;'
    + `CREATE TEMPORARY TABLE tmp_s SELECT * FROM t_famille_stock WHERE lg_FAMILLE_ID = '${MODELE}' AND lg_EMPLACEMENT_ID = '1' LIMIT 1;`
    + `UPDATE tmp_s SET lg_FAMILLE_STOCK_ID = '${id}', lg_FAMILLE_ID = '${id}', int_NUMBER_AVAILABLE = 21, int_NUMBER = 21, str_STATUT = 'enable';`
    + 'INSERT INTO t_famille_stock SELECT * FROM tmp_s; DROP TEMPORARY TABLE tmp_s;'
    + (reserve ? `INSERT INTO t_type_stock_famille (lg_TYPE_STOCK_FAMILLE_ID, str_NAME, str_DESCRIPTION, dt_CREATED, dt_UPDATED, str_STATUT, int_NUMBER, lg_EMPLACEMENT_ID, lg_FAMILLE_ID, lg_TYPE_STOCK_ID)`
      + ` VALUES ('${id}', 'reserve', 'reserve', NOW(), NOW(), 'enable', 272, '1', '${id}', '2');` : ''));
}

(async () => {
  retirer();
  produit(R, '9990431', true);
  produit(S, '9990432', false);
  if (q(`SELECT COUNT(*) FROM t_resume_caisse WHERE lg_USER_ID = '${ADMIN}' AND str_STATUT = 'is_Using'`) === '0') {
    exec(`INSERT INTO t_resume_caisse (ld_CAISSE_ID, lg_USER_ID, int_SOLDE_MATIN, int_SOLDE_SOIR, dt_DAY, dt_CREATED, lg_CREATED_BY, dt_UPDATED, lg_UPDATED_BY, str_STATUT)`
      + ` VALUES ('${CAISSE}', '${ADMIN}', 0, 0, CURDATE(), NOW(), '${ADMIN}', NOW(), '${ADMIN}', 'is_Using')`);
    caisseCreee = true;
  }
  const b = await ENV_E2E.lancer(chromium);
  try {
    const p = await (await b.newContext()).newPage();
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    const api = (m, u, c) => p.evaluate(async ([m, u, c]) => { const r = await fetch(u, { method: m, headers: { 'Content-Type': 'application/json' }, body: c ? JSON.stringify(c) : undefined });
      const t = await r.text(); try { return JSON.parse(t); } catch (e) { return { success: false, brut: t.slice(0, 200) }; } }, [m, u, c]);
    const pu = Number(q(`SELECT int_PRICE FROM t_famille WHERE lg_FAMILLE_ID = '${R}'`));
    const vendre = async (id) => {
      const a = await api('POST', '../api/v1/vente/add/vno', { typeVenteId: '1', natureVenteId: '1', produitId: id, itemPu: pu, qte: 2, qteServie: 2,
        devis: false, prevente: false, remiseId: '', userVendeurId: ADMIN });
      const venteId = a.data && a.data.lgPREENREGISTREMENTID;
      const net = await api('POST', '../api/v1/vente/net/vno', { venteId, remiseId: '', checkUg: false });
      const data = net.data || {}, montant = data.montantNet;
      const r = await api('POST', '../api/v1/vente/cloturer/vno', { venteId, typeVenteId: '1', natureVenteId: '1', devis: false, remiseId: '', userVendeurId: ADMIN,
        montantRecu: montant, montantRemis: 0, montantPaye: montant, totalRecap: montant, partTP: 0, typeRegleId: '1', clientId: '', nom: '', commentaire: '', banque: '', lieux: '',
        marge: data.marge || 0, data, reglements: [{ typeReglement: '1', montant, montantAttentu: montant }] });
      return r.success === true;
    };
    const suggere = (id) => q(`SELECT IFNULL(MAX(d.int_NUMBER), 'AUCUNE') FROM t_suggestion_order_details d JOIN t_suggestion_order o ON o.lg_SUGGESTION_ORDER_ID = d.lg_SUGGESTION_ORDER_ID`
      + ` WHERE d.lg_FAMILLE_ID = '${id}' AND o.str_STATUT = 'auto'`);

    ok('Vente de 2 unités du produit en réserve (rayon 21 → 19)', await vendre(R)
      && q(`SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_FAMILLE_ID = '${R}' AND lg_EMPLACEMENT_ID = '1'`) === '19');
    ok('Rayon 19 + réserve 272 = 291 au-dessus du seuil 126 : pas de suggestion de commande', suggere(R) === 'AUCUNE', suggere(R));
    const reassort = await api('GET', '../api/v1/reserve/suggestions?search_value=ZZ%20E2E%20SUGGESTION&start=0&limit=20');
    const ligne = (reassort.results || []).find((x) => x.lg_FAMILLE_ID === R);
    ok('Réassort réserve → rayon proposé, plafonné à la capacité du rayon : 20 − 19 = 1', ligne && ligne.int_QTE_SUGGEREE === 1, JSON.stringify(ligne || reassort).slice(0, 200));
    const manques = await api('GET', '../api/v1/suggestion/diagnostic?manques=1&start=0&limit=5000');
    ok('Diagnostic des manques : le produit couvert par la réserve n\'y figure pas', !(manques.results || []).some((x) => x.lg_FAMILLE_ID === R || x.id === R || JSON.stringify(x).includes(R)),
      (manques.results || []).length + ' manques');

    ok('Non-régression : vente de 2 unités du produit sans réserve (rayon 21 → 19)', await vendre(S));
    ok('Produit sans réserve sous le seuil : suggéré, quantité (126 − 19) + 126 = 233 comme avant', suggere(S) === '233', suggere(S));

    /* reserve videe : le rayon seul est sous le seuil, le produit redevient a commander */
    exec(`UPDATE t_type_stock_famille SET int_NUMBER = 0 WHERE lg_FAMILLE_ID = '${R}'`);
    exec(`UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = 21, int_NUMBER = 21 WHERE lg_FAMILLE_ID = '${R}' AND lg_EMPLACEMENT_ID = '1'`);
    ok('Réserve vide : nouvelle vente (rayon 21 → 19)', await vendre(R));
    ok('Réserve vide : le produit est suggéré à la commande, (126 − 19) + 126 = 233', suggere(R) === '233', suggere(R));
  } catch (x) {
    ok('Déroulé sans erreur', false, x.message);
  } finally {
    await b.close();
    retirer();
    ok('Données d\'essai retirées', q(`SELECT COUNT(*) FROM t_famille WHERE lg_FAMILLE_ID IN ('${R}', '${S}')`) === '0' && q(`SELECT COUNT(*) FROM t_suggestion_order_details WHERE lg_FAMILLE_ID IN ('${R}', '${S}')`) === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
  process.exit(ko ? 1 : 0);
})();
