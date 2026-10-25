/* AJUSTEMENT : LE STOCK N'EST CORRIGE QU'UNE FOIS (demandes serveur des applications mobiles, demandes 13 et 14).
 * Constats reproduits :
 *  - la cloture (PUT ajustement/{id}) ne verifiait pas le statut : rejouee, elle re-appliquait toutes les lignes ;
 *  - l'annulation (DELETE ajustement/{id}) supprimait un ajustement deja cloture et ses lignes, le stock restant
 *    modifie : l'historique etait perdu ;
 *  - les lignes d'un ajustement cloture restaient modifiables.
 * Memes appels que l'ecran Ajustement (AjustementCtr). Jeu d'essai retire a la fin, stock remis.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const DEBUT = q("SELECT NOW() - INTERVAL 1 SECOND");
let produit = null, stockOrigine = null;

function nettoyer() {
  exec("CREATE TEMPORARY TABLE e2e_aji AS SELECT lg_AJUSTEMENT_ID id FROM t_ajustement WHERE lg_USER_ID = '" + ADMIN + "' AND dt_CREATED >= '" + DEBUT + "';"
    + "DELETE FROM hmvtproduit WHERE pkey IN (SELECT lg_AJUSTEMENTDETAIL_ID FROM t_ajustement_detail WHERE lg_AJUSTEMENT_ID IN (SELECT id FROM e2e_aji));"
    + "DELETE FROM notification_client WHERE notification_id IN (SELECT id FROM notification WHERE entity_ref IN (SELECT id FROM e2e_aji));"
    + "DELETE FROM notification WHERE entity_ref IN (SELECT id FROM e2e_aji);"
    + "DELETE FROM t_ajustement_detail WHERE lg_AJUSTEMENT_ID IN (SELECT id FROM e2e_aji);"
    + "DELETE FROM t_ajustement WHERE lg_AJUSTEMENT_ID IN (SELECT id FROM e2e_aji); DROP TEMPORARY TABLE e2e_aji;"
    + "DELETE FROM mobile_client_ref WHERE ref LIKE 'E2E-AJI-%';"
    + (produit ? "DELETE FROM t_suggestion_order_details WHERE lg_FAMILLE_ID = '" + produit + "' AND dt_CREATED >= '" + DEBUT + "';"
      + "DELETE FROM t_event_log WHERE lg_USER_ID = '" + ADMIN + "' AND dt_CREATED >= '" + DEBUT + "' AND str_TYPE_LOG = (SELECT int_CIP FROM t_famille WHERE lg_FAMILLE_ID = '" + produit + "');" : '')
    + (stockOrigine ? "UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = " + stockOrigine[0] + ", int_NUMBER = " + stockOrigine[1] + " WHERE lg_FAMILLE_ID = '" + produit + "' AND lg_EMPLACEMENT_ID = '1';" : ''));
}

(async () => {
  produit = q("SELECT f.lg_FAMILLE_ID FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
    + " WHERE f.str_STATUT = 'enable' AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 ORDER BY f.str_NAME LIMIT 1 OFFSET 11");
  stockOrigine = q("SELECT CONCAT(int_NUMBER_AVAILABLE, '|', int_NUMBER) FROM t_famille_stock WHERE lg_FAMILLE_ID = '" + produit + "' AND lg_EMPLACEMENT_ID = '1'").split('|');
  exec("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = 50, int_NUMBER = 50 WHERE lg_FAMILLE_ID = '" + produit + "' AND lg_EMPLACEMENT_ID = '1'");
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const api = (methode, url, corps, entetes) => p.evaluate(async ([m, u, c, h]) => {
    const r = await fetch(u, { method: m, headers: Object.assign({ 'Content-Type': 'application/json' }, h || {}), body: c ? JSON.stringify(c) : undefined });
    const t = await r.text(); let j; try { j = JSON.parse(t); } catch (e) { j = { success: false, brut: t.slice(0, 200) }; } j.http = r.status; return j;
  }, [methode, url, corps, entetes]);
  const stock = () => Number(q("SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_FAMILLE_ID = '" + produit + "' AND lg_EMPLACEMENT_ID = '1'"));
  const creer = (value, h) => api('POST', '../api/v1/ajustement/creeation', { refParent: null, value, description: 'E2E integrite', refTwo: produit, valueTwo: stock(), valueFour: '1', zone: 'RAYON' }, h);
  const lignes = (id) => q("SELECT COUNT(*) FROM t_ajustement_detail WHERE lg_AJUSTEMENT_ID = '" + id + "'");
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });

    /* 13. double cloture */
    const a1 = (await creer(5)).data.lgAJUSTEMENTID;
    const c1 = await api('PUT', '../api/v1/ajustement/' + a1, { description: 'E2E integrite' });
    ok('Clôture : +5 appliqué (50 → 55), emplacement ajusté indiqué', c1.success === true && stock() === 55 && !!c1.emplacement, JSON.stringify(c1).slice(0, 160) + ' stock ' + stock());
    const c2 = await api('PUT', '../api/v1/ajustement/' + a1, { description: 'E2E integrite' });
    ok('Seconde clôture : refusée (code ETAT, « déjà clôturé »), stock inchangé (55)', c2.success === false && c2.code === 'ETAT' && /déjà clôturé/i.test(c2.msg || '') && stock() === 55,
      JSON.stringify(c2).slice(0, 160) + ' stock ' + stock());
    const a2 = (await creer(3)).data.lgAJUSTEMENTID;
    const [s1, s2] = await p.evaluate(async (u) => Promise.all([1, 2].map(() => fetch(u, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{"description":"x"}' }).then((r) => r.json()))),
      '../api/v1/ajustement/' + a2);
    ok('Deux clôtures simultanées : une seule appliquée (55 → 58)', [s1, s2].filter((x) => x.success === true).length === 1 && stock() === 58, JSON.stringify([s1.success, s1.code, s2.success, s2.code]) + ' stock ' + stock());

    /* lignes d'un ajustement cloture */
    const ligne = q("SELECT lg_AJUSTEMENTDETAIL_ID FROM t_ajustement_detail WHERE lg_AJUSTEMENT_ID = '" + a1 + "'");
    const m1 = await api('PUT', '../api/v1/ajustement/item/' + ligne, { value: 40, valueTwo: 50 });
    const m2 = await api('POST', '../api/v1/ajustement/add/item', { refParent: a1, value: 2, refTwo: produit, valueTwo: stock(), valueFour: '1' });
    const m3 = await api('DELETE', '../api/v1/ajustement/item/' + ligne);
    ok('Ajustement clôturé : lignes ni modifiées, ni ajoutées, ni supprimées (code ETAT)', [m1, m2, m3].every((x) => x.success === false && x.code === 'ETAT')
      && lignes(a1) === '1' && q("SELECT int_NUMBER FROM t_ajustement_detail WHERE lg_AJUSTEMENTDETAIL_ID = '" + ligne + "'") === '5', JSON.stringify([m1.code, m2.code, m3.code]));

    /* 14. annulation d'un ajustement cloture */
    const d1 = await api('DELETE', '../api/v1/ajustement/' + a1);
    ok('Annulation d\'un ajustement clôturé : refusée (code ETAT), ajustement et lignes toujours en base, stock inchangé', d1.success === false && d1.code === 'ETAT'
      && q("SELECT COUNT(*) FROM t_ajustement WHERE lg_AJUSTEMENT_ID = '" + a1 + "'") === '1' && lignes(a1) === '1' && stock() === 58, JSON.stringify(d1).slice(0, 160));
    const a3 = (await creer(4)).data.lgAJUSTEMENTID;
    const d2 = await api('DELETE', '../api/v1/ajustement/' + a3);
    ok('Annulation d\'un ajustement en cours : acceptée comme avant, stock inchangé', d2.success === true && q("SELECT COUNT(*) FROM t_ajustement WHERE lg_AJUSTEMENT_ID = '" + a3 + "'") === '0' && stock() === 58,
      JSON.stringify(d2).slice(0, 120));

    /* X-Client-Ref : creation et cloture rejouees */
    const h = { 'X-Client-Ref': 'E2E-AJI-1' };
    const k1 = await creer(1, h), k2 = await creer(1, h);
    ok('Création rejouée avec le même X-Client-Ref : un seul ajustement, même réponse', k1.success && k2.success && k1.data.lgAJUSTEMENTID === k2.data.lgAJUSTEMENTID
      && q("SELECT COUNT(*) FROM t_ajustement WHERE lg_USER_ID = '" + ADMIN + "' AND dt_CREATED >= '" + DEBUT + "' AND str_STATUT = 'is_Process'") === '1', JSON.stringify([k1.data, k2.data]));
    const hc = { 'X-Client-Ref': 'E2E-AJI-2' };
    const r1 = await api('PUT', '../api/v1/ajustement/' + k1.data.lgAJUSTEMENTID, { description: 'x' }, hc);
    const r2 = await api('PUT', '../api/v1/ajustement/' + k1.data.lgAJUSTEMENTID, { description: 'x' }, hc);
    ok('Clôture rejouée avec le même X-Client-Ref : même réponse (succès), appliquée une fois (58 → 59)', r1.success === true && r2.success === true && stock() === 59, JSON.stringify([r1.success, r2.success]) + ' stock ' + stock());
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Jeu d\'essai retiré, stock remis', q("SELECT COUNT(*) FROM t_ajustement WHERE lg_USER_ID = '" + ADMIN + "' AND dt_CREATED >= '" + DEBUT + "'") === '0'
      && q("SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_FAMILLE_ID = '" + produit + "' AND lg_EMPLACEMENT_ID = '1'") === stockOrigine[0]);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
