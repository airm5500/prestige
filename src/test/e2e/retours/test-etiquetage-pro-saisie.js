/* ETIQUETTAGE PRO : SAISIE A LA MAIN (retours du 25/10, point 7).
 *
 * Par les vues (admin), GESTION DU STOCK > Étiquettage Pro > « Saisir les produits à la main », au clavier :
 *  - nouvelle ligne : date du jour (celle de la « Date d'édition », jj/mm/aa), 1 etiquette ;
 *  - CIP : 3 chiffres suffisent pour proposer les produits ; Bas + Entree choisit : designation, prix, EAN, grossiste,
 *    code geo repris, et la saisie passe au prix ;
 *  - nom : 3 lettres prises au milieu du nom (« contient ») proposent le produit ;
 *  - Entree : prix -> lot (lots encore actifs du produit, le plus proche d'abord ; le choix pose la peremption)
 *    -> peremption -> nombre d'etiquettes -> ligne suivante creee, curseur sur son CIP ;
 *  - lots d'essai (2 lots actifs + 1 perime) retires a la fin ; aucune erreur JavaScript, aucune fenetre.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const [PID, CIP, NOM, PRIX] = q("SELECT f.lg_FAMILLE_ID, f.int_CIP, f.str_DESCRIPTION, f.int_PRICE FROM t_famille f WHERE f.str_STATUT = 'enable' AND f.int_CIP REGEXP '^[0-9]{7}$'"
  + " AND LENGTH(f.str_DESCRIPTION) >= 10 AND (SELECT COUNT(*) FROM t_famille g WHERE g.str_STATUT = 'enable' AND g.int_CIP LIKE CONCAT(LEFT(f.int_CIP, 5), '%')) <= 5"
  + " ORDER BY f.int_CIP LIMIT 1").split('\t');
const MOT = NOM.split(/\s+/).sort((a, b) => b.length - a.length)[0].substring(1, 5);
const auj = new Date(), jj = (d) => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getFullYear()).slice(2);

(async () => {
  q("DELETE FROM t_lot WHERE lg_LOT_ID LIKE 'E2E-EPS-%'");
  const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
  q("INSERT INTO t_lot (lg_LOT_ID, lg_USER_ID, lg_FAMILLE_ID, int_NUM_LOT, int_NUMBER, dt_CREATED, dt_UPDATED, dt_PEREMPTION, str_STATUT, current_stock) VALUES"
    + ` ('E2E-EPS-1', '${ADMIN}', '${PID}', 'E2ELOTB', 5, NOW(), NOW(), CURDATE() + INTERVAL 400 DAY, 'enable', 5),`
    + ` ('E2E-EPS-2', '${ADMIN}', '${PID}', 'E2ELOTA', 3, NOW(), NOW(), CURDATE() + INTERVAL 90 DAY, 'enable', 3),`
    + ` ('E2E-EPS-3', '${ADMIN}', '${PID}', 'E2ELOTPERIME', 2, NOW(), NOW(), CURDATE() - INTERVAL 10 DAY, 'enable', 2)`);
  const perA = q("SELECT DATE_FORMAT(CURDATE() + INTERVAL 90 DAY, '%d/%m/%Y')");
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = [], dialogues = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  const editee = () => p.evaluate(() => { const g = Ext.ComponentQuery.query('etiquetagepro #grilleProduits')[0], pl = g.getPlugin('editionProduits');
    const a = pl.getActiveEditor && pl.getActiveEditor(); return a && pl.context ? { champ: pl.context.field, ligne: g.getStore().indexOf(pl.context.record) } : null; });
  const ligne = (i) => p.evaluate((k) => Ext.ComponentQuery.query('etiquetagepro')[0].produitsStore.getAt(k).data, i);
  const liste = () => p.evaluate(() => Array.from(document.querySelectorAll('.x-boundlist')).filter((x) => x.offsetParent).map((x) => x.innerText).join(' | '));
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'GESTION DU STOCK', 'Étiquettage Pro');
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('etiquetagepro #saisie')[0]; return e && e.isVisible(true); }, null, { timeout: 60000 });
    await p.waitForTimeout(800);
    await cliquer(p, 'etiquetagepro #saisie');
    await p.waitForTimeout(1200);
    let l = await ligne(0);
    ok('Nouvelle ligne : date du jour, 1 étiquette', l.DATE === jj(auj) && l.NOMBRE === '1', JSON.stringify(l));
    ok('Curseur dans le CIP de la première ligne', JSON.stringify(await editee()) === '{"champ":"CIP","ligne":0}', JSON.stringify(await editee()));

    await p.keyboard.type(MOT, { delay: 60 });
    await p.waitForTimeout(1500);
    let propose = await liste();
    ok('Nom : « ' + MOT + ' » (milieu du nom) propose le produit', propose.includes(CIP), propose.slice(0, 200));
    await p.keyboard.press('Control+A');
    await p.keyboard.type(CIP.substring(0, 3), { delay: 60 });
    await p.waitForTimeout(1500);
    propose = await liste();
    ok('CIP : 3 chiffres proposent des produits', propose.length > 0 && /\d{7}/.test(propose), propose.slice(0, 120));
    await p.keyboard.type(CIP.substring(3), { delay: 60 });
    await p.waitForTimeout(1500);
    await p.keyboard.press('ArrowDown');
    await p.keyboard.press('Enter');
    await p.waitForTimeout(1500);
    l = await ligne(0);
    ok('Produit choisi : désignation et prix repris, saisie sur le prix', l.CIP === CIP && l.DESIGNATION === NOM && String(l.PRIX) === PRIX
      && JSON.stringify(await editee()) === '{"champ":"PRIX","ligne":0}', JSON.stringify({ l, e: await editee() }));
    await p.keyboard.press('Enter');
    await p.waitForTimeout(2000);
    ok('Entrée sur le prix : le lot', JSON.stringify(await editee()) === '{"champ":"LOT","ligne":0}', JSON.stringify(await editee()));
    propose = await liste();
    ok('Lots proposés : les lots actifs du produit, le plus proche d\'abord, sans le lot périmé', /E2ELOTA[\s\S]*E2ELOTB/.test(propose) && !propose.includes('E2ELOTPERIME'), propose);
    await p.keyboard.press('ArrowDown');
    await p.keyboard.press('Enter');
    await p.waitForTimeout(1500);
    l = await ligne(0);
    ok('Lot choisi : péremption posée, saisie sur la péremption', l.LOT === 'E2ELOTA' && l.PEREMPTION === perA && JSON.stringify(await editee()) === '{"champ":"PEREMPTION","ligne":0}',
      JSON.stringify({ lot: l.LOT, per: l.PEREMPTION, e: await editee() }));
    await p.keyboard.press('Enter');
    await p.waitForTimeout(800);
    ok('Entrée sur la péremption : le nombre d\'étiquettes', JSON.stringify(await editee()) === '{"champ":"NOMBRE","ligne":0}', JSON.stringify(await editee()));
    await p.keyboard.press('Control+A');
    await p.keyboard.type('3');
    await p.keyboard.press('Enter');
    await p.waitForTimeout(1500);
    const n = await p.evaluate(() => Ext.ComponentQuery.query('etiquetagepro')[0].produitsStore.getCount());
    const l2 = await ligne(1).catch(() => null);
    ok('Entrée sur le nombre : ligne suivante créée (date du jour), curseur sur son CIP', n === 2 && l2 && l2.DATE === jj(auj) && JSON.stringify(await editee()) === '{"champ":"CIP","ligne":1}',
      JSON.stringify({ n, l2, e: await editee() }));
    l = await ligne(0);
    ok('Ligne 1 complète : 3 étiquettes, sans erreur', l.NOMBRE === '3' && !(l.erreurs || []).length, JSON.stringify(l.erreurs));
    ok('Aucune erreur JavaScript, aucune fenêtre du navigateur', erreurs.length === 0 && dialogues.length === 0, erreurs.concat(dialogues).join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
    q("DELETE FROM t_lot WHERE lg_LOT_ID LIKE 'E2E-EPS-%'");
    ok('Lots d\'essai retirés', q("SELECT COUNT(*) FROM t_lot WHERE lg_LOT_ID LIKE 'E2E-EPS-%'") === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
