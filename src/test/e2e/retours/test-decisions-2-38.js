/* DECISIONS 2 ET 38 DU PHARMACIEN (15/10, confirmees le 19/10).
 *
 *  - 2 : POST v1/pharma/reponses (releve des reponses des grossistes) exige le droit des commandes, comme l'envoi
 *        d'une suggestion : un profil sans ce droit recoit 403 interdit ; avec, la route repond (plus de 403).
 *  - 38 : « Racheté » se marque a la main : POST v1/rappels-habitude/marquer?statut=ACHETE est accepte (avant :
 *        « Statut inconnu »). Un statut inconnu reste refuse.
 * Un compte sans droit et une ligne de rappel d'essai (identifiants seulement, aucune colonne nominative lue) sont
 * poses puis retires.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const ID = 'E2E-D2-SANS', LOGIN = 'e2e-d2-sans', MDP = 'E2e-D2-Sans-4', RAPPEL = 'E2E-D38-R1';
const ROLE_VENDEUR = q("SELECT lg_ROLE_ID FROM t_role WHERE str_NAME = 'Vendeur'");
const retirer = () => q(`DELETE FROM t_rappel_habitude WHERE id = '${RAPPEL}'; DELETE FROM t_role_user WHERE lg_USER_ID = '${ID}';`
  + ` DELETE FROM t_event_log WHERE lg_USER_ID = '${ID}'; DELETE FROM t_user WHERE lg_USER_ID = '${ID}'`);

(async () => {
  retirer();
  q(`INSERT INTO t_user (lg_USER_ID, str_LOGIN, str_PASSWORD, str_FIRST_NAME, str_LAST_NAME, str_FUNCTION, str_STATUT, lg_EMPLACEMENT_ID, dt_CREATED, int_CONNEXION)`
    + ` VALUES ('${ID}', '${LOGIN}', MD5('${MDP}'), 'E2E', 'SANS COMMANDE', 'Vendeur', 'enable', '1', NOW(), 0)`);
  q(`INSERT INTO t_role_user (lg_USER_ROLE_ID, lg_ROLE_ID, lg_USER_ID, dt_CREATED) VALUES ('${ID}', '${ROLE_VENDEUR}', '${ID}', NOW())`);
  q(`INSERT INTO t_rappel_habitude (id, lg_CLIENT_ID, lg_FAMILLE_ID, dt_DERNIER_ACHAT, dt_PREVU, int_FREQUENCE, int_ACHATS, str_STATUT, dt_CREATED)`
    + ` SELECT '${RAPPEL}', (SELECT lg_CLIENT_ID FROM t_client LIMIT 1), (SELECT lg_FAMILLE_ID FROM t_famille LIMIT 1), CURDATE() - INTERVAL 30 DAY, CURDATE(), 30, 3, 'A_PREPARER', NOW()`);
  const b = await ENV_E2E.lancer(chromium);
  const post = (p, u, c) => p.evaluate(async ([u, c]) => { const r = await fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: c });
    let j = null; try { j = await r.json(); } catch (e) { /* vide */ } return { status: r.status, j }; }, [u, c]);
  try {
    const sans = await (await b.newContext()).newPage();
    await connexion(sans, LOGIN, MDP);
    const r1 = await post(sans, '../api/v1/pharma/reponses?grossiste=E2E-INCONNU', '');
    ok('2 : sans le droit des commandes, pharma/reponses → 403 interdit', r1.status === 403 && r1.j && r1.j.interdit === true, JSON.stringify(r1));
    const adm = await (await b.newContext()).newPage();
    await connexion(adm, ENV_E2E.LOGIN, 'e2etest');
    const r2 = await post(adm, '../api/v1/pharma/reponses?grossiste=E2E-INCONNU', '');
    ok('2 : avec le droit, la route répond (pas de 403)', r2.status !== 403 && r2.status !== 401, r2.status + ' ' + JSON.stringify(r2.j).slice(0, 120));

    const m = await post(adm, '../api/v1/rappels-habitude/marquer?statut=ACHETE', JSON.stringify([RAPPEL]));
    ok('38 : « Racheté » marqué à la main (statut ACHETE) : accepté', m.j && m.j.success === true
      && q(`SELECT str_STATUT FROM t_rappel_habitude WHERE id = '${RAPPEL}'`) === 'ACHETE', JSON.stringify(m.j));
    const x = await post(adm, '../api/v1/rappels-habitude/marquer?statut=NIMPORTE', JSON.stringify([RAPPEL]));
    ok('38 : statut inconnu toujours refusé', x.j && x.j.success === false, JSON.stringify(x.j));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    retirer();
    ok('Compte et rappel d\'essai retirés', q(`SELECT COUNT(*) FROM t_user WHERE lg_USER_ID = '${ID}'`) === '0' && q(`SELECT COUNT(*) FROM t_rappel_habitude WHERE id = '${RAPPEL}'`) === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
