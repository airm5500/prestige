/* RETOUR FOURNISSEUR : STOCK JAMAIS NEGATIF, MESSAGES CLAIRS (demandes serveur des applications mobiles, 3 et D2).
 * Memes appels que l'ecran « Retour fournisseur » (retourfournisseur/new, add-item, update-item, produit/validerretourfour).
 *  - produit absent du BL : message « pas sur le BL » (avant : erreur 500) ;
 *  - ligne au-dela du stock disponible : refusee avec le stock (preparation) ;
 *  - validation alors que le stock a baisse sous la quantite : refusee, RIEN ne sort (stock, statut inchanges) ;
 *  - validation normale : la quantite sort une fois ; seconde validation : code ETAT.
 * Jeu d'essai retire ; stock remis.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const NOTE = 'E2E-RETOUR-STOCK';
const [BL, PRODUIT, RECUE] = q("SELECT CONCAT_WS('|', b.str_REF_LIVRAISON, d.lg_FAMILLE_ID, d.int_QTE_RECUE) FROM t_bon_livraison b"
  + " JOIN t_bon_livraison_detail d ON d.lg_BON_LIVRAISON_ID = b.lg_BON_LIVRAISON_ID"
  + " JOIN t_famille_stock s ON s.lg_FAMILLE_ID = d.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
  + " WHERE d.int_QTE_RECUE >= 4 AND b.str_STATUT <> 'delete'"
  + " AND (SELECT COUNT(*) FROM t_bon_livraison x WHERE x.str_REF_LIVRAISON = b.str_REF_LIVRAISON) = 1"
  + " AND (SELECT COUNT(*) FROM t_bon_livraison_detail y WHERE y.lg_BON_LIVRAISON_ID = b.lg_BON_LIVRAISON_ID AND y.lg_FAMILLE_ID = d.lg_FAMILLE_ID) = 1"
  + " ORDER BY b.dt_CREATED DESC LIMIT 1").split('|');
const ABSENT = q(`SELECT f.lg_FAMILLE_ID FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'
  WHERE NOT EXISTS (SELECT 1 FROM t_bon_livraison_detail d JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID = d.lg_BON_LIVRAISON_ID WHERE b.str_REF_LIVRAISON = '${BL}' AND d.lg_FAMILLE_ID = f.lg_FAMILLE_ID) LIMIT 1`);
const MOTIF = q("SELECT lg_MOTIF_RETOUR FROM t_motif_retour ORDER BY lg_MOTIF_RETOUR LIMIT 1");
const STOCK0 = q(`SELECT CONCAT(int_NUMBER_AVAILABLE, '|', int_NUMBER) FROM t_famille_stock WHERE lg_FAMILLE_ID = '${PRODUIT}' AND lg_EMPLACEMENT_ID = '1'`).split('|');
const stock = () => Number(q(`SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_FAMILLE_ID = '${PRODUIT}' AND lg_EMPLACEMENT_ID = '1'`));
const fixer = (n) => exec(`UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = ${n}, int_NUMBER = ${n} WHERE lg_FAMILLE_ID = '${PRODUIT}' AND lg_EMPLACEMENT_ID = '1'`);

function retirer() {
  const ids = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT("'", lg_RETOUR_FRS_ID, "'")), "''") FROM t_retour_fournisseur WHERE str_COMMENTAIRE = '${NOTE}'`);
  const det = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT("'", lg_RETOUR_FRS_DETAIL, "'")), "''") FROM t_retour_fournisseur_detail WHERE lg_RETOUR_FRS_ID IN (${ids})`);
  exec(`DELETE FROM HMvtProduit WHERE pkey IN (${det});`
    + `DELETE FROM notification_client WHERE notification_id IN (SELECT id FROM notification WHERE entity_ref IN (${ids}));`
    + `DELETE FROM notification WHERE entity_ref IN (${ids});`
    + `DELETE FROM t_retour_fournisseur_detail WHERE lg_RETOUR_FRS_ID IN (${ids});`
    + `DELETE FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID IN (${ids});`);
}

(async () => {
  retirer();
  fixer(5);
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await (await b.newContext()).newPage();
  const api = (u, c) => p.evaluate(async ([u, c]) => { const r = await fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) });
    const t = await r.text(); let j; try { j = JSON.parse(t); } catch (e) { j = { brut: t.slice(0, 120) }; } j.http = r.status; return j; }, [u, c]);
  const nouveau = (produitId, qte) => api('../api/v1/retourfournisseur/new', { lgBONLIVRAISONID: BL, strCOMMENTAIRE: NOTE, items: [{ produitId, lgMOTIFRETOUR: MOTIF, intNUMBERRETURN: qte }] });
  const valider = (ref) => api('../api/v1/produit/validerretourfour', { ref, refTwo: '', description: NOTE });
  const statut = (id) => q(`SELECT str_STATUT FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID = '${id}'`);
  try {
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });

    const a = await nouveau(ABSENT, 1);
    ok('Produit absent du BL : refus lisible « pas sur le BL » (plus d\'erreur 500)', a.http === 200 && a.success === false && /pas sur le BL/i.test(a.msg || ''), JSON.stringify(a).slice(0, 200));
    const s = await nouveau(PRODUIT, 6);
    ok('Quantité au-delà du stock (6 pour 5 en stock) : refusée, stock indiqué', s.success === false && /stock/i.test(s.msg || '') && /5/.test(s.msg || ''), JSON.stringify(s).slice(0, 200));
    const c = await nouveau(PRODUIT, 3);
    const id = c.data && c.data.lgRETOURFRSID;
    ok('Retour de 3 boîtes préparé (5 en stock)', c.success === true && !!id, JSON.stringify(c).slice(0, 160));
    fixer(2);
    const v1 = await valider(id);
    ok('Stock tombé à 2 avant la validation : refus (code STOCK_INSUFFISANT, produit et stock nommés), rien ne sort', v1.success === false && v1.code === 'STOCK_INSUFFISANT'
      && /2/.test(v1.msg || '') && stock() === 2 && statut(id) !== 'enable', JSON.stringify(v1).slice(0, 220) + ' stock ' + stock());
    fixer(5);
    const v2 = await valider(id);
    ok('Validation normale : 3 sortent (5 → 2)', v2.success === true && stock() === 2 && statut(id) === 'enable', JSON.stringify(v2).slice(0, 120) + ' stock ' + stock());
    const v3 = await valider(id);
    ok('Seconde validation : refusée (code ETAT), stock inchangé', v3.success === false && v3.code === 'ETAT' && stock() === 2, JSON.stringify(v3).slice(0, 160));
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack);
  } finally {
    await b.close();
    retirer();
    exec(`UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = ${STOCK0[0]}, int_NUMBER = ${STOCK0[1]} WHERE lg_FAMILLE_ID = '${PRODUIT}' AND lg_EMPLACEMENT_ID = '1'`);
    ok('Jeu d\'essai retiré, stock remis', q(`SELECT COUNT(*) FROM t_retour_fournisseur WHERE str_COMMENTAIRE = '${NOTE}'`) === '0' && String(stock()) === STOCK0[0]);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
