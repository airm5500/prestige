/* RH : EMPREINTES DES EMPLOYES PARTAGEES ENTRE TERMINAUX DE POINTAGE (demandes serveur, point 43).
 *
 * Deux employes d'essai (E2E-EMP-*), des gabarits factices (octets aleatoires), le parametre
 * KEY_EMPREINTES_PARTAGEES remis a sa valeur d'origine. Ce que le test etablit :
 *  - fonction desactivee (parametre 0) : enrolement refuse (code DESACTIVE) ;
 *  - enrolement de 2 gabarits avec consentement ; meme X-Client-Ref : meme reponse, rien de plus ;
 *    sans consentement : refus ;
 *  - en base, le gabarit est chiffre (les octets d'origine n'y figurent pas) ;
 *  - lecture depuis un autre terminal (GET rh/empreintes?depuis&format) : gabarits identiques a l'envoi ; autre format :
 *    rien ;
 *  - suppression : plus de gabarit rendu, la suppression est signalee, gabarit efface en base ;
 *  - employe devenu inactif : son gabarit n'est plus rendu, il est efface (purge) et signale ;
 *  - journal d'audit : une ligne par action, aucune colonne pour le gabarit ; le journal du serveur ne contient pas
 *    le gabarit ;
 *  - sans le droit RH : refus.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const privilegeEssai = require('../support/privilege-essai');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const rh = privilegeEssai(q, exec, ENV_E2E.LOGIN, 'P_SM_RH');
/* demande 52 : P_RH_POINTER ouvre aussi la lecture des gabarits (terminal) ; « sans droit RH » = sans les deux */
const pointer = privilegeEssai(q, exec, ENV_E2E.LOGIN, 'P_RH_POINTER');
const LOG = '/opt/payara5/glassfish/domains/domain1/logs/server.log';
const PARAM = q("SELECT IFNULL((SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_EMPREINTES_PARTAGEES'), 'ABSENT')");
const poser = (v) => exec("UPDATE t_parameters SET str_VALUE = '" + v + "' WHERE str_KEY = 'KEY_EMPREINTES_PARTAGEES'");
function nettoyer() {
  exec("DELETE FROM t_employe_empreinte WHERE employe_id LIKE 'E2E-EMP-%'; DELETE FROM t_empreinte_journal WHERE employe_id LIKE 'E2E-EMP-%';"
    + " DELETE FROM t_employe WHERE id LIKE 'E2E-EMP-%'; DELETE FROM mobile_client_ref WHERE ref LIKE 'E2E-EMP-%';");
}

(async () => {
  rh.remettre(); pointer.remettre();
  nettoyer();
  ok('Paramètre présent après migration (désactivé par défaut)', PARAM !== 'ABSENT', PARAM);
  exec("INSERT INTO t_employe (id, matricule, nom, prenoms, statut, created_at) VALUES"
    + " ('E2E-EMP-1', 'E2E-EMP-M1', 'ESSAI', 'Un', 'ACTIF', NOW()), ('E2E-EMP-2', 'E2E-EMP-M2', 'ESSAI', 'Deux', 'ACTIF', NOW())");
  const g1 = crypto.randomBytes(400), g2 = crypto.randomBytes(500), g3 = crypto.randomBytes(300);
  const tailleLogAvant = fs.existsSync(LOG) ? fs.statSync(LOG).size : 0;
  const b = await ENV_E2E.lancer(chromium);
  const session = async () => { const p = await (await b.newContext()).newPage();
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 }); return p; };
  const appel = (p, m, u, c, ref) => p.evaluate(async ([m, u, c, ref]) => { const h = { 'Content-Type': 'application/json' }; if (ref) { h['X-Client-Ref'] = ref; }
    const r = await fetch(u, { method: m, headers: h, body: c === undefined ? undefined : JSON.stringify(c) }); const t = await r.text(); let j; try { j = JSON.parse(t); } catch (e) { j = { brut: t.slice(0, 100) }; } j.http = r.status; return j; }, [m, u, c, ref]);
  const corps = (gs) => ({ modeles: gs.map((g) => g.toString('base64')), format: 'SUNMI_A400_RAW', capteur: 'A400', doigt: 'INDEX_D', consentement: { le: '2026-10-15T09:00:00', par: 'Pharmacien titulaire' } });
  try {
    const p = await session();
    const T0 = q('SELECT DATE_FORMAT(NOW() - INTERVAL 2 SECOND, \'%Y-%m-%dT%H:%i:%s\')');
    poser('0');
    const off = await appel(p, 'POST', '../api/v1/rh/employes/E2E-EMP-1/empreintes', corps([g1]));
    ok('Fonction désactivée : enrôlement refusé (DESACTIVE)', off.success === false && off.code === 'DESACTIVE' && q("SELECT COUNT(*) FROM t_employe_empreinte WHERE employe_id = 'E2E-EMP-1'") === '0', JSON.stringify(off).slice(0, 160));
    poser('1');
    const e1 = await appel(p, 'POST', '../api/v1/rh/employes/E2E-EMP-1/empreintes', corps([g1, g2]), 'E2E-EMP-REF1');
    ok('Enrôlement : 2 gabarits enregistrés', e1.success === true && e1.nombre === 2 && q("SELECT COUNT(*) FROM t_employe_empreinte WHERE employe_id = 'E2E-EMP-1'") === '2', JSON.stringify(e1).slice(0, 200));
    const e1b = await appel(p, 'POST', '../api/v1/rh/employes/E2E-EMP-1/empreintes', corps([g1, g2]), 'E2E-EMP-REF1');
    ok('Même X-Client-Ref : même réponse, rien de plus', e1b.success === true && JSON.stringify(e1b.ids) === JSON.stringify(e1.ids) && q("SELECT COUNT(*) FROM t_employe_empreinte WHERE employe_id = 'E2E-EMP-1'") === '2', JSON.stringify(e1b).slice(0, 160));
    const sansConsentement = await appel(p, 'POST', '../api/v1/rh/employes/E2E-EMP-2/empreintes', Object.assign(corps([g3]), { consentement: null }));
    ok('Sans consentement : refus', sansConsentement.success === false && q("SELECT COUNT(*) FROM t_employe_empreinte WHERE employe_id = 'E2E-EMP-2'") === '0', JSON.stringify(sansConsentement).slice(0, 160));
    const brut = q("SELECT GROUP_CONCAT(HEX(modele)) FROM t_employe_empreinte WHERE employe_id = 'E2E-EMP-1'");
    ok('En base : gabarit chiffré (octets d\'origine absents)', brut.length > 0 && brut.indexOf(g1.toString('hex').toUpperCase().slice(0, 64)) < 0 && brut.indexOf(g2.toString('hex').toUpperCase().slice(0, 64)) < 0);

    await appel(p, 'POST', '../api/v1/rh/employes/E2E-EMP-2/empreintes', corps([g3]));
    const lus = await appel(p, 'GET', '../api/v1/rh/empreintes?depuis=' + T0 + '&format=SUNMI_A400_RAW');
    const de1 = (lus.modeles || []).filter((x) => x.employeId === 'E2E-EMP-1').map((x) => x.modele).sort();
    ok('Lecture (autre terminal) : gabarits identiques à l\'envoi', lus.success === true && JSON.stringify(de1) === JSON.stringify([g1.toString('base64'), g2.toString('base64')].sort())
      && (lus.modeles || []).every((x) => x.format === 'SUNMI_A400_RAW' && x.doigt && x.id), JSON.stringify(lus).slice(0, 200));
    const autre = await appel(p, 'GET', '../api/v1/rh/empreintes?depuis=' + T0 + '&format=AUTRE_FORMAT');
    ok('Autre format : aucun gabarit', autre.success === true && !(autre.modeles || []).some((x) => /^E2E-EMP-/.test(x.employeId)), (autre.modeles || []).length);

    const sup = await appel(p, 'DELETE', '../api/v1/rh/employes/E2E-EMP-1/empreintes');
    const apres = await appel(p, 'GET', '../api/v1/rh/empreintes?depuis=' + T0 + '&format=SUNMI_A400_RAW');
    ok('Suppression : plus de gabarit rendu, suppressions signalées, gabarit effacé en base', sup.success === true && !(apres.modeles || []).some((x) => x.employeId === 'E2E-EMP-1')
      && (apres.suppressions || []).filter((x) => x.employeId === 'E2E-EMP-1').length === 2
      && q("SELECT COUNT(*) FROM t_employe_empreinte WHERE employe_id = 'E2E-EMP-1' AND (modele IS NOT NULL OR dt_suppression IS NULL)") === '0', JSON.stringify(apres.suppressions || []).slice(0, 200));

    exec("UPDATE t_employe SET statut = 'INACTIF' WHERE id = 'E2E-EMP-2'");
    const inactif = await appel(p, 'GET', '../api/v1/rh/empreintes?depuis=' + T0 + '&format=SUNMI_A400_RAW');
    ok('Employé inactif : gabarit plus rendu, effacé (purge) et signalé', !(inactif.modeles || []).some((x) => x.employeId === 'E2E-EMP-2')
      && (inactif.suppressions || []).some((x) => x.employeId === 'E2E-EMP-2')
      && q("SELECT COUNT(*) FROM t_employe_empreinte WHERE employe_id = 'E2E-EMP-2' AND modele IS NOT NULL") === '0', JSON.stringify(inactif.suppressions || []).slice(0, 200));

    const journal = q("SELECT GROUP_CONCAT(action ORDER BY id) FROM t_empreinte_journal WHERE employe_id LIKE 'E2E-EMP-%' OR (action = 'LIRE' AND horodatage >= '" + T0.replace('T', ' ') + "')");
    const colonnes = q("SELECT GROUP_CONCAT(COLUMN_NAME) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_empreinte_journal'");
    ok('Journal d\'audit : enrôlement, lecture, suppression, purge ; aucune colonne pour le gabarit', /ENROLER/.test(journal) && /LIRE/.test(journal) && /SUPPRIMER/.test(journal) && /PURGER/.test(journal) && !/modele/i.test(colonnes), journal + ' | ' + colonnes);
    const ajoutLog = fs.existsSync(LOG) ? fs.readFileSync(LOG).slice(tailleLogAvant).toString('utf8') : '';
    ok('Journal du serveur : aucun gabarit', [g1, g2, g3].every((g) => ajoutLog.indexOf(g.toString('base64').slice(0, 40)) < 0));

    rh.retirer(); pointer.retirer();
    const p2 = await session();
    const refus = await appel(p2, 'GET', '../api/v1/rh/empreintes?depuis=' + T0 + '&format=SUNMI_A400_RAW');
    ok('Sans P_SM_RH ni P_RH_POINTER : refus, aucun gabarit', refus.success === false && !refus.modeles, JSON.stringify(refus).slice(0, 160));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    rh.remettre(); pointer.remettre();
    await b.close();
    nettoyer();
    if (PARAM !== 'ABSENT') { poser(PARAM); }
    ok('Données d\'essai retirées, paramètre remis', q("SELECT COUNT(*) FROM t_employe_empreinte WHERE employe_id LIKE 'E2E-EMP-%'") === '0'
      && q("SELECT COUNT(*) FROM t_employe WHERE id LIKE 'E2E-EMP-%'") === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
