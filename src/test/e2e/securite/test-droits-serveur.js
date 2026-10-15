/* DROITS VERIFIES PAR LE SERVEUR (demandes serveur des applications mobiles, lot 2 : « masquer un menu n'est pas une
 * securite »). Pour chaque groupe de routes d'ecriture : le droit du menu est retire au role du compte de test, une
 * nouvelle session est ouverte, la route doit repondre 403 {interdit:true} (jamais 401) SANS rien ecrire ; le droit
 * remis, la route repond de nouveau. Les droits retires sont toujours remis (meme apres un test interrompu).
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const privilegeEssai = require('../support/privilege-essai');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 260) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin'");
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
const PRODUIT = q("SELECT f.lg_FAMILLE_ID FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' WHERE f.str_STATUT = 'enable' ORDER BY f.lg_FAMILLE_ID LIMIT 1");

/* chaque cas : privilege(s) a retirer, appels refuses, controle « rien d'ecrit », appel accepte une fois remis */
const CAS = [
  {
    nom: 'Ajustement du stock', privileges: ['P_SM_AJUSTEMENT'],
    refuses: [['POST', '../api/v1/ajustement/creeation', { refParent: null, value: 1, description: 'E2E-DROITS', refTwo: PRODUIT, valueTwo: 0, valueFour: '1', zone: 'RAYON' }],
      ['PUT', '../api/v1/ajustement/zzz-inconnu', { description: 'x' }], ['DELETE', '../api/v1/ajustement/zzz-inconnu'], ['POST', '../api/v2/ajustement/creeation', { refParent: null, value: 1, refTwo: PRODUIT }]],
    rienEcrit: () => q(`SELECT COUNT(*) FROM t_ajustement WHERE lg_USER_ID = '${ADMIN}' AND dt_CREATED >= '${DEBUT}'`) === '0',
    accepte: ['POST', '../api/v1/ajustement/creeation', { refParent: null, value: 1, description: 'E2E-DROITS', refTwo: PRODUIT, valueTwo: 0, valueFour: '1', zone: 'RAYON' }]
  }
];

function nettoyer() {
  exec(`CREATE TEMPORARY TABLE e2e_dr AS SELECT lg_AJUSTEMENT_ID id FROM t_ajustement WHERE lg_USER_ID = '${ADMIN}' AND dt_CREATED >= '${DEBUT}';`
    + 'DELETE FROM t_ajustement_detail WHERE lg_AJUSTEMENT_ID IN (SELECT id FROM e2e_dr); DELETE FROM t_ajustement WHERE lg_AJUSTEMENT_ID IN (SELECT id FROM e2e_dr); DROP TEMPORARY TABLE e2e_dr;');
}

(async () => {
  const droits = {};
  CAS.forEach((c) => c.privileges.forEach((p) => { droits[p] = privilegeEssai(q, exec, 'admin', p); droits[p].remettre(); }));
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const session = async () => {
    const p = await (await b.newContext()).newPage();
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    return p;
  };
  const appel = (p, [m, u, c]) => p.evaluate(async ([m, u, c]) => { const r = await fetch(u, { method: m, headers: { 'Content-Type': 'application/json' }, body: c ? JSON.stringify(c) : undefined });
    const t = await r.text(); let j = {}; try { j = JSON.parse(t); } catch (e) { /* vide */ } return { http: r.status, interdit: j.interdit === true, msg: j.msg || '' }; }, [m, u, c]);
  try {
    for (const c of CAS) {
      c.privileges.forEach((p) => droits[p].retirer());
      const p = await session();
      const r = [];
      for (const a of c.refuses) { r.push(await appel(p, a)); }
      ok(c.nom + ' sans le droit : 403 « Droit manquant », jamais 401', r.every((x) => x.http === 403 && x.interdit && /Droit manquant/.test(x.msg)), JSON.stringify(r));
      ok(c.nom + ' sans le droit : rien n\'est écrit', c.rienEcrit());
      await p.context().close();
      c.privileges.forEach((pr) => droits[pr].remettre());
      const p2 = await session();
      const r2 = await appel(p2, c.accepte);
      ok(c.nom + ' avec le droit : la route répond (pas de refus)', r2.http === 200 && !r2.interdit, JSON.stringify(r2));
      await p2.context().close();
    }
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack);
  } finally {
    Object.values(droits).forEach((d) => d.remettre());
    await b.close();
    nettoyer();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
