/* CONNEXION PAR BADGE (demande du 16/10).
 *
 * Le QR du badge contient PRESTIGE-BADGE|1|numero|login|secret ; le serveur verifie le badge actif, non expire, de
 * l'employe actif rattache a l'utilisateur de ce login, et l'empreinte du secret ; il ouvre alors la meme session
 * qu'avec le mot de passe. Ce que le test etablit (badge d'essai de l'utilisateur admin, retire a la fin) :
 *  - page : bouton « Se connecter avec mon badge » -> zone « Presentez votre badge » ; la douchette (frappe + Entree)
 *    connecte et ouvre l'accueil, avec la session de l'utilisateur du badge ;
 *  - lecture directe dans le champ Identifiant (sans le bouton) : connexion aussi, le contenu lu ne reste pas affiche ;
 *  - refus « Badge non reconnu » sans session : secret faux, badge desactive, expire, employe inactif, login d'un autre,
 *    contenu illisible, connexion par badge coupee (KEY_CONNEXION_BADGE = 0) ;
 *  - journal de connexion : « par badge » ; le secret n'apparait ni dans le journal ni dans les traces du serveur ;
 *  - 10 echecs sur un badge (retour du 25/10, 5 avant) : le suivant est refuse avec un delai d'attente, meme avec le bon secret ;
 *  - la connexion par mot de passe fonctionne toujours.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const LOG = '/opt/payara5/glassfish/domains/domain1/logs/server.log';
const E = 'E2E-BC-1', B = 'E2E-BC-B1';
let rang = 0;
const nouveauNum = () => 'ZZE-26-' + String(Date.now() + rang++).slice(-5) + '-A';
let NUM = nouveauNum();
const SECRET = crypto.randomBytes(32).toString('base64url');
const PARAM = q("SELECT IFNULL((SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_CONNEXION_BADGE'), 'ABSENT')");
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const LIEN = q("SELECT IFNULL((SELECT id FROM t_employe WHERE lg_USER_ID = '" + ADMIN + "'), '')");
const contenu = (s, login) => 'PRESTIGE-BADGE|1|' + NUM + '|' + (login || ENV_E2E.LOGIN) + '|' + s;
/* chaque refus sur un numero neuf : les essais sont limites par numero de badge (verifie a part, en dernier) */
const renumeroter = () => { NUM = nouveauNum(); q("UPDATE t_rh_badge SET numero = '" + NUM + "' WHERE id = '" + B + "'; UPDATE t_employe SET badge = '" + NUM + "' WHERE id = '" + E + "'"); };
function nettoyer() {
  q("DELETE FROM t_rh_badge WHERE id = '" + B + "'; DELETE FROM t_employe WHERE id = '" + E + "'");
  if (LIEN) { q("UPDATE t_employe SET lg_USER_ID = '" + ADMIN + "' WHERE id = '" + LIEN + "'"); }
}

(async () => {
  nettoyer();
  if (LIEN) { q("UPDATE t_employe SET lg_USER_ID = NULL WHERE id = '" + LIEN + "'"); }
  q("INSERT INTO t_employe (id, matricule, nom, prenoms, statut, lg_USER_ID, badge, created_at) VALUES ('" + E + "', 'E2E-BC-M1', 'ESSAI', 'Badge connexion', 'ACTIF', '" + ADMIN + "', '" + NUM + "', NOW())");
  q("INSERT INTO t_rh_badge (id, employe_id, numero, statut, dt_emission, created_at, secret_hash, dt_secret) VALUES ('" + B + "', '" + E + "', '" + NUM + "', 'ACTIF', CURDATE(), NOW(), '"
    + crypto.createHash('sha256').update(SECRET).digest('hex') + "', NOW())");
  const tailleLog = fs.existsSync(LOG) ? fs.statSync(LOG).size : 0;
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const page = async () => { const p = await (await b.newContext()).newPage(); await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'networkidle' }); return p; };
  const essai = (p, c) => p.evaluate(async (c) => { const r = await fetch('../api/v1/user/auth-badge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contenu: c }) });
    const j = await r.json(); const s = await (await fetch('../api/v1/app/info', { cache: 'no-store' })).json(); return { j, connecte: !!s.connecte }; }, c);
  try {
    /* 1. par le bouton */
    const p1 = await page();
    await p1.click('#pl-badge');
    await p1.waitForSelector('#pl-badge-zone', { state: 'visible', timeout: 5000 });
    const zone = await p1.textContent('#pl-badge-zone');
    ok('Bouton « Se connecter avec mon badge » : zone « Présentez votre badge »', /Présentez votre badge/.test(zone), zone.replace(/\s+/g, ' ').slice(0, 120));
    await p1.keyboard.type(contenu(SECRET), { delay: 2 });
    await p1.keyboard.press('Enter');
    await p1.waitForURL('**/general/**', { timeout: 30000 }).catch(() => null);
    const qui = await p1.evaluate(async () => { try { return (await (await fetch('../api/v1/user/account')).json()).accountInfo; } catch (e) { return null; } });
    ok('Douchette (frappe + Entrée) : accueil ouvert avec la session de l\'utilisateur du badge', /general/.test(p1.url()) && qui && /admin/i.test(JSON.stringify(qui)), p1.url());

    /* 2. directement dans le champ Identifiant */
    const p2 = await page();
    await p2.click('#str_login');
    let vuTexte = false;
    p2.on('console', () => {});
    await p2.keyboard.type(contenu(SECRET), { delay: 1 });
    vuTexte = await p2.evaluate((s) => document.getElementById('str_login').value.indexOf(s) >= 0, SECRET);
    await p2.keyboard.press('Enter');
    await p2.waitForURL('**/general/**', { timeout: 30000 }).catch(() => null);
    ok('Lecture directe dans « Identifiant » : connexion, le secret ne reste pas affiché', /general/.test(p2.url()) && !vuTexte, p2.url() + ' secret visible : ' + vuTexte);

    /* 3. refus */
    const p3 = await page();
    const refus = async (nom, c, avant) => { renumeroter(); if (avant) { q(avant); } const r = await essai(p3, typeof c === 'function' ? c() : c);
      ok('Refus — ' + nom + ' : « Badge non reconnu », aucune session', r.j.success === false && /Badge non reconnu/.test(r.j.message || '') && !r.connecte, JSON.stringify(r.j).slice(0, 140)); };
    await refus('secret faux', () => contenu('faux' + SECRET.slice(4)));
    await refus('login d\'un autre utilisateur', () => contenu(SECRET, 'zz-autre'));
    await refus('contenu illisible', () => 'PRESTIGE-BADGE|1|' + NUM);
    await refus('badge désactivé', () => contenu(SECRET), "UPDATE t_rh_badge SET statut = 'DESACTIVE' WHERE id = '" + B + "'");
    await refus('badge expiré', () => contenu(SECRET), "UPDATE t_rh_badge SET statut = 'ACTIF', dt_expiration = CURDATE() - INTERVAL 1 DAY WHERE id = '" + B + "'");
    await refus('employé inactif', () => contenu(SECRET), "UPDATE t_rh_badge SET dt_expiration = NULL WHERE id = '" + B + "'; UPDATE t_employe SET statut = 'INACTIF' WHERE id = '" + E + "'");
    q("UPDATE t_employe SET statut = 'ACTIF' WHERE id = '" + E + "'");
    if (PARAM === 'ABSENT') { q("INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED) VALUES ('KEY_CONNEXION_BADGE', '0', 'E2E', 'NUMBER', 'enable', NOW())"); }
    await refus('connexion par badge coupée (KEY_CONNEXION_BADGE = 0)', () => contenu(SECRET), "UPDATE t_parameters SET str_VALUE = '0' WHERE str_KEY = 'KEY_CONNEXION_BADGE'");
    if (PARAM === 'ABSENT') { q("DELETE FROM t_parameters WHERE str_KEY = 'KEY_CONNEXION_BADGE'"); } else { q("UPDATE t_parameters SET str_VALUE = '" + PARAM + "' WHERE str_KEY = 'KEY_CONNEXION_BADGE'"); }
    const bonDeNouveau = await essai(p3, contenu(SECRET));
    ok('Badge rétabli : connexion acceptée', bonDeNouveau.j.success === true && bonDeNouveau.connecte, JSON.stringify(bonDeNouveau.j).slice(0, 100));

    /* 4. journal et traces */
    const journal = q("SELECT IFNULL(GROUP_CONCAT(str_DESCRIPTION SEPARATOR ' || '), '') FROM t_event_log WHERE dt_CREATED >= NOW() - INTERVAL 10 MINUTE AND str_DESCRIPTION LIKE '%badge%'");
    ok('Journal de connexion : « par badge », sans le secret', /par badge/i.test(journal) && journal.indexOf(SECRET) < 0, journal.slice(0, 200));
    const ajout = fs.existsSync(LOG) ? fs.readFileSync(LOG).slice(tailleLog).toString('utf8') : '';
    ok('Traces du serveur : le secret n\'y figure pas', ajout.indexOf(SECRET) < 0 && ajout.indexOf(SECRET.slice(0, 20)) < 0);

    /* 5. mot de passe toujours valable */
    const p5 = await page();
    await p5.fill('#str_login', ENV_E2E.LOGIN); await p5.fill('#str_password', 'e2etest'); await p5.click('#login');
    await p5.waitForURL('**/general/**', { timeout: 60000 }).catch(() => null);
    ok('La connexion par mot de passe fonctionne toujours', /general/.test(p5.url()));

    /* 6. limite d'essais (en dernier : le badge d'essai reste bloque) */
    const p6 = await page();
    for (let i = 0; i < 10; i++) { await essai(p6, contenu('mauvais' + i + SECRET.slice(8))); }
    const bloque = await essai(p6, contenu(SECRET));
    ok('10 échecs sur un badge : le suivant est refusé avec délai, même avec le bon secret', bloque.j.success === false && bloque.j.attente > 0 && !bloque.connecte, JSON.stringify(bloque.j).slice(0, 160));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Badge et employé d\'essai retirés', q("SELECT COUNT(*) FROM t_employe WHERE id = '" + E + "'") === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
