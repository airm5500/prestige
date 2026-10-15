/* PREVISIONS : L'EN-COURS DES COMMANDES N'EST RELU QUE S'IL A CHANGE (demandes serveur des applications mobiles,
 * point 23).
 *
 * Chaque lecture (tableau, chaque page « Afficher plus », fiche produit, exports) relisait toutes les lignes de
 * prevision et reecrivait l'en-cours. Desormais les lignes ne sont relues que si l'en-cours des commandes ou le dernier
 * calcul a change. Ce que le test etablit, par les routes de l'ecran « Prévisions » :
 *  - le tableau donne l'heure de verification de l'en-cours (enCoursAJour) ;
 *  - sans changement de commande, deux lectures ne reecrivent rien (une ligne volontairement faussee le reste) ;
 *  - une commande creee : la lecture suivante relit tout (la ligne faussee est corrigee, le produit commande porte son
 *    en-cours) ;
 *  - la commande supprimee : l'en-cours retombe a 0 a la lecture suivante.
 * Les lignes de prevision touchees sont remises a l'identique, la commande est retiree.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const CMD = 'E2E-PREV-ENC';
const EMPL = '1';
/* deux produits de la prevision, sans aucune commande en cours */
const LIBRES = "SELECT p.lg_FAMILLE_ID FROM t_prevision_produit p WHERE p.lg_EMPLACEMENT_ID = '" + EMPL + "' AND p.en_cours = 0"
  + " AND NOT EXISTS (SELECT 1 FROM t_order_detail od JOIN t_order o ON o.lg_ORDER_ID = od.lg_ORDER_ID"
  + " WHERE od.lg_FAMILLE_ID = p.lg_FAMILLE_ID AND o.str_STATUT IN ('is_Process', 'passed', 'pharma')) ORDER BY p.lg_FAMILLE_ID LIMIT 2";
const ETAT = (f) => "SELECT CONCAT_WS('|', en_cours, IFNULL(recommande, 'N'), IFNULL(couverture_jours, 'N')) FROM t_prevision_produit WHERE lg_EMPLACEMENT_ID = '" + EMPL + "' AND lg_FAMILLE_ID = '" + f + "'";
const enCours = (f) => q("SELECT en_cours FROM t_prevision_produit WHERE lg_EMPLACEMENT_ID = '" + EMPL + "' AND lg_FAMILLE_ID = '" + f + "'");

function retirerCommande() {
  exec("DELETE FROM t_order_detail WHERE lg_ORDER_ID = '" + CMD + "'; DELETE FROM t_order WHERE lg_ORDER_ID = '" + CMD + "';");
}

(async () => {
  retirerCommande();
  const [X, Y] = q(LIBRES).split('\n');
  const origX = q(ETAT(X)), origY = q(ETAT(Y));
  const G = q("SELECT lg_GROSSISTE_ID FROM t_grossiste WHERE str_STATUT = 'enable' LIMIT 1");
  ok('Jeu d\'essai : deux produits prévus sans commande en cours', !!X && !!Y && !!G, X + ' ' + Y);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } });
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const lire = (url) => p.evaluate(async (url) => (await fetch(url)).json(), url);
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });

    const t = await lire('../api/v1/analyse-commande/tableau');
    ok('Tableau : heure de vérification de l\'en-cours (enCoursAJour)', t.success && /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/.test(t.enCoursAJour || ''), t.enCoursAJour);

    /* sans changement de commande : rien n'est relu ni reecrit */
    exec("UPDATE t_prevision_produit SET en_cours = 777 WHERE lg_EMPLACEMENT_ID = '" + EMPL + "' AND lg_FAMILLE_ID = '" + X + "'");
    await lire('../api/v1/analyse-commande/previsions?limit=25');
    await lire('../api/v1/analyse-commande/previsions?limit=25&start=25');
    ok('Deux lectures sans changement de commande : aucune ligne réécrite', enCours(X) === '777', enCours(X));

    /* une commande creee : relecture complete */
    exec("INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)"
      + " VALUES ('" + CMD + "', '" + CMD + "', 1, '" + G + "', (SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin' LIMIT 1), 'is_Process', NOW(), NOW(), 0, 0, 0);"
      + " INSERT INTO t_order_detail (lg_ORDERDETAIL_ID, lg_ORDER_ID, lg_FAMILLE_ID, lg_GROSSISTE_ID, int_NUMBER, int_PRICE, int_PAF_DETAIL, int_PRICE_DETAIL, str_STATUT, dt_CREATED, dt_UPDATED)"
      + " VALUES ('" + CMD + "-1', '" + CMD + "', '" + Y + "', '" + G + "', 6, 0, 1000, 2000, 'is_Process', NOW(), NOW());");
    const page = await lire('../api/v1/analyse-commande/previsions?limit=25');
    ok('Commande créée : le produit commandé porte son en-cours (6)', page.success && enCours(Y) === '6', enCours(Y));
    ok('… et la relecture complète corrige la ligne faussée', enCours(X) === '0', enCours(X));

    /* commande supprimee */
    retirerCommande();
    await lire('../api/v1/analyse-commande/produit/' + Y);
    ok('Commande supprimée : l\'en-cours retombe à 0 (fiche produit)', enCours(Y) === '0', enCours(Y));
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Parcours sans exception', false, e.message);
  } finally {
    await b.close();
    retirerCommande();
    [[X, origX], [Y, origY]].forEach(([f, o]) => {
      const [e, r, c] = o.split('|');
      exec("UPDATE t_prevision_produit SET en_cours = " + e + ", recommande = " + (r === 'N' ? 'NULL' : r) + ", couverture_jours = " + (c === 'N' ? 'NULL' : c)
        + " WHERE lg_EMPLACEMENT_ID = '" + EMPL + "' AND lg_FAMILLE_ID = '" + f + "'");
    });
    ok('Lignes de prévision remises à l\'identique, commande retirée', q(ETAT(X)) === origX && q(ETAT(Y)) === origY
      && q("SELECT COUNT(*) FROM t_order WHERE lg_ORDER_ID = '" + CMD + "'") === '0');
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
