/* INVENTAIRE : POST v1/inventaire/lignes/retenue - DROIT, CLOTURE, SESSION (demandes serveur, point 48).
 *
 * La route (et sa variante ligne/retenue, une ligne) retient ou ecarte des lignes d'inventaire, donc decide de ce qui sera cloture. Elle ne verifiait aucun
 * droit ni l'etat de l'inventaire. Ce que le test etablit :
 *  - sans session : 401 ;
 *  - avec le droit (P_CREER_INVENTAIRE ou le menu « Travaux d'inventaire » P_SM_INVENTAIRE) : accepte ;
 *  - sans aucun des deux : 403 {interdit:true, msg}, ligne inchangee ;
 *  - inventaire cloture : 409 INVENTAIRE_CLOTURE, ligne inchangee ;
 *  - une ligne d'un AUTRE inventaire designee par son identifiant n'est pas touchee.
 * Le jeu d'essai (inventaires E2E-RET-*) est retire, les droits retires sont remis.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const privilegeEssai = require('../support/privilege-essai');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const creer = privilegeEssai(q, exec, 'admin', 'P_CREER_INVENTAIRE');
const menu = privilegeEssai(q, exec, 'admin', 'P_SM_INVENTAIRE');

(async () => {
  creer.remettre(); menu.remettre();
  /* jeu d'essai : deux inventaires marques (un ouvert, un cloture), copies d'un inventaire du banc, avec chacun une
     ligne NON retenue copiee d'une de ses lignes */
  const SRC = q("SELECT lg_INVENTAIRE_ID FROM t_inventaire_famille GROUP BY lg_INVENTAIRE_ID LIMIT 1");
  const OUVERT = 'E2E-RET-OUVERT', CLOS = 'E2E-RET-CLOS';
  const nettoyer = () => exec("DELETE FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID IN ('" + OUVERT + "', '" + CLOS + "');"
    + " DELETE FROM t_inventaire WHERE lg_INVENTAIRE_ID IN ('" + OUVERT + "', '" + CLOS + "');");
  nettoyer();
  for (const [id, statut] of [[OUVERT, 'enable'], [CLOS, 'is_Closed']]) {
    exec("CREATE TEMPORARY TABLE e2e_i AS SELECT * FROM t_inventaire WHERE lg_INVENTAIRE_ID = '" + SRC + "';"
      + " UPDATE e2e_i SET lg_INVENTAIRE_ID = '" + id + "', str_NAME = '" + id + "', str_STATUT = '" + statut + "';"
      + " INSERT INTO t_inventaire SELECT * FROM e2e_i;"
      + " CREATE TEMPORARY TABLE e2e_f AS SELECT * FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID = '" + SRC + "' LIMIT 1;"
      + " UPDATE e2e_f SET lg_INVENTAIRE_FAMILLE_ID = (SELECT MAX(lg_INVENTAIRE_FAMILLE_ID) + 1 FROM t_inventaire_famille), lg_INVENTAIRE_ID = '" + id + "', bool_INVENTAIRE = 0, str_STATUT = '" + statut + "';"
      + " INSERT INTO t_inventaire_famille SELECT * FROM e2e_f;");
  }
  const ligne = (inv) => q("SELECT lg_INVENTAIRE_FAMILLE_ID FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID = '" + inv + "' LIMIT 1");
  const L_OUVERT = ligne(OUVERT), L_CLOS = ligne(CLOS);
  const etat = (id) => q("SELECT CONCAT(bool_INVENTAIRE, '|', IFNULL(dt_UPDATED, '')) FROM t_inventaire_famille WHERE lg_INVENTAIRE_FAMILLE_ID = " + id);
  const avantOuvert = etat(L_OUVERT), avantClos = etat(L_CLOS);
  ok('Jeu d\'essai : un inventaire ouvert et un clôturé, une ligne non retenue dans chacun', !!SRC && !!L_OUVERT && !!L_CLOS, L_OUVERT + ' / ' + L_CLOS);
  const remettreLignes = () => exec("UPDATE t_inventaire_famille SET bool_INVENTAIRE = 0 WHERE lg_INVENTAIRE_FAMILLE_ID IN (" + L_OUVERT + ", " + L_CLOS + ")");

  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const session = async () => {
    const p = await (await b.newContext()).newPage();
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    return p;
  };
  const connecter = async (p) => {
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
  };
  const retenirUne = (p, corps) => p.evaluate(async (corps) => { const r = await fetch('../api/v1/inventaire/ligne/retenue', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) });
    const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) { /* texte */ } return { s: r.status, j }; }, corps);
  const retenir = (p, corps) => p.evaluate(async (corps) => { const r = await fetch('../api/v1/inventaire/lignes/retenue', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) });
    const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) { /* texte */ } return { s: r.status, j }; }, corps);
  try {
    const p = await session();
    const sans = await retenir(p, { lg_INVENTAIRE_ID: OUVERT, ids: [L_OUVERT], retenue: true });
    ok('Sans session : 401, ligne inchangée', sans.s === 401 && etat(L_OUVERT) === avantOuvert, sans.s + ' ' + JSON.stringify(sans.j));

    await connecter(p);
    const clos = await retenir(p, { lg_INVENTAIRE_ID: CLOS, ids: [L_CLOS], retenue: true });
    ok('Inventaire clôturé : 409 INVENTAIRE_CLOTURE, ligne inchangée', clos.s === 409 && clos.j && clos.j.code === 'INVENTAIRE_CLOTURE' && etat(L_CLOS) === avantClos, clos.s + ' ' + JSON.stringify(clos.j));
    const closParProduit = await retenir(p, { lg_INVENTAIRE_ID: CLOS, produits: [q("SELECT lg_FAMILLE_ID FROM t_inventaire_famille WHERE lg_INVENTAIRE_FAMILLE_ID = " + L_CLOS)], retenue: true });
    ok('Inventaire clôturé désigné par produit : 409 aussi', closParProduit.s === 409 && etat(L_CLOS) === avantClos, closParProduit.s);
    const une = await retenirUne(p, { lg_INVENTAIRE_FAMILLE_ID: L_CLOS, retenue: true });
    ok('ligne/retenue sur un inventaire clôturé : 409 aussi, ligne inchangée', une.s === 409 && une.j && une.j.code === 'INVENTAIRE_CLOTURE' && etat(L_CLOS) === avantClos, une.s + ' ' + JSON.stringify(une.j));
    const autre = await retenir(p, { lg_INVENTAIRE_ID: OUVERT, ids: [L_CLOS], retenue: true });
    ok('Ligne d\'un autre inventaire désignée par son identifiant : pas touchée', etat(L_CLOS) === avantClos && autre.s !== 500, autre.s + ' ' + JSON.stringify(autre.j));
    const bon = await retenir(p, { lg_INVENTAIRE_ID: OUVERT, ids: [L_OUVERT], retenue: true });
    ok('Avec le droit, inventaire ouvert : ligne retenue', bon.s === 200 && bon.j && bon.j.success === 1 && etat(L_OUVERT).startsWith('1|'), bon.s + ' ' + JSON.stringify(bon.j));
    remettreLignes();

    creer.retirer(); menu.retirer();
    const p2 = await session();
    await connecter(p2);
    const refus = await retenir(p2, { lg_INVENTAIRE_ID: OUVERT, ids: [L_OUVERT], retenue: true });
    ok('Sans P_CREER_INVENTAIRE ni P_SM_INVENTAIRE : 403 interdit, ligne inchangée', refus.s === 403 && refus.j && refus.j.interdit === true && !!refus.j.msg && etat(L_OUVERT).startsWith('0|'), refus.s + ' ' + JSON.stringify(refus.j));
    const refusUne = await retenirUne(p2, { lg_INVENTAIRE_FAMILLE_ID: L_OUVERT, retenue: true });
    ok('ligne/retenue sans le droit : 403 interdit aussi', refusUne.s === 403 && refusUne.j && refusUne.j.interdit === true && etat(L_OUVERT).startsWith('0|'), refusUne.s);
    creer.remettre();
    const p3 = await session();
    await connecter(p3);
    const seul = await retenir(p3, { lg_INVENTAIRE_ID: OUVERT, ids: [L_OUVERT], retenue: true });
    ok('Avec P_CREER_INVENTAIRE seul : accepté', seul.s === 200 && etat(L_OUVERT).startsWith('1|'), seul.s);
    remettreLignes();
    creer.retirer(); menu.remettre();
    const p4 = await session();
    await connecter(p4);
    const menuSeul = await retenir(p4, { lg_INVENTAIRE_ID: OUVERT, ids: [L_OUVERT], retenue: true });
    ok('Avec le menu « Travaux d\'inventaire » seul : accepté (aucun profil ne perd l\'écran du poste)', menuSeul.s === 200 && etat(L_OUVERT).startsWith('1|'), menuSeul.s);
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    creer.remettre(); menu.remettre();
    await b.close();
    nettoyer();
    ok('Jeu d\'essai retiré, droits remis', q("SELECT COUNT(*) FROM t_inventaire WHERE lg_INVENTAIRE_ID LIKE 'E2E-RET-%'") === '0'
      && q("SELECT COUNT(*) FROM t_role_privelege rp JOIN t_privilege p ON p.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID JOIN t_role_user ru ON ru.lg_ROLE_ID = rp.lg_ROLE_ID JOIN t_user u ON u.lg_USER_ID = ru.lg_USER_ID WHERE u.str_LOGIN = 'admin' AND p.str_NAME IN ('P_CREER_INVENTAIRE', 'P_SM_INVENTAIRE')") === '2');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
