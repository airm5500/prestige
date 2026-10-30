/* CONNEXION PAR BADGE : LECTURE DEFORMEE PAR LA DOUCHETTE (retour du 23/10).
 *
 * « Badge non reconnu » apres le scan d'un badge imprime par le menu Ressources humaines. Sur le banc, le meme parcours
 * (impression par l'onglet Badges, QR decode, lecture sur la page) connecte : le contenu du QR est bon. Ce qui arrive a
 * la page peut en revanche etre deforme par la douchette (clavier AZERTY : « | » se tape avec AltGr ; verrouillage
 * majuscules : casse inversee), et l'ecran ne le disait pas. Ce que le test etablit (badge d'essai de l'utilisateur
 * admin, retire a la fin) :
 *  - « | » remplace par un autre caractere : « Lecture du badge déformée », ce qui a ete lu est montre SANS le secret,
 *    avec la consigne sur la douchette ; aucune session ;
 *  - casse inversee (verrouillage majuscules) : message qui le dit ; aucune session ;
 *  - lecture correcte mais badge non valable (secret d'un ancien exemplaire) : « Badge non reconnu » comme avant ;
 *  - traces du serveur : la raison du refus (secret) est notee, sans le secret ;
 *  - la bonne lecture connecte toujours ;
 *  - douchette restee en clavier americain (QWERTY) sur un poste AZERTY (cas de la Sunmi Blink 2, retour du 23/10) :
 *    « PRESTIGE)BQDGEµ&µ... » est remis dans l'ordre et connecte, par le bouton badge comme dans « Identifiant » ;
 *  - retour du 24/10 : la meme douchette avec le verrouillage majuscules actif (active pour lire les chiffres GS1) :
 *    « PRESTIGE°BQDGE*1*PEL°26°... » (chiffres justes, - en °, _ en ), | en *) connecte aussi, par les deux chemins.
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
const LOG = ENV_E2E.JOURNAL_SERVEUR;
const E = 'E2E-BL-1', B = 'E2E-BL-B1';
const NUM = 'ZZL-26-' + String(Date.now()).slice(-5) + '-A';
const SECRET = crypto.randomBytes(32).toString('base64url');
const ANCIEN = crypto.randomBytes(32).toString('base64url');
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const LIEN = q("SELECT IFNULL((SELECT id FROM t_employe WHERE lg_USER_ID = '" + ADMIN + "'), '')");
const contenu = (s, sep) => ['PRESTIGE-BADGE', '1', NUM, ENV_E2E.LOGIN, s].join(sep || '|');
/* frappe US lue par un poste AZERTY : touches des lettres, chiffres (non majuscules), '-', '_' et '|' */
const US = '1234567890-_|aqzwmAQZWM', FR = '&é"\'(-è_çà)°µqawz,QAWZ?';
/* meme frappe, verrouillage majuscules actif : chiffres et touches ) ° * µ inverses, lettres inchangees */
const US_MAJ = '-_|aqzwmAQZWM', FR_MAJ = '°)*qawz,QAWZ?';
const qwertyMajSurAzerty = (t) => t.split('').map((c) => { const i = US_MAJ.indexOf(c); return i < 0 ? c : FR_MAJ[i]; }).join('');
const qwertySurAzerty = (t) => t.split('').map((c) => { const i = US.indexOf(c); return i < 0 ? c : FR[i]; }).join('');
const inverse = (t) => t.split('').map((c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase())).join('');
function nettoyer() {
  q("DELETE FROM t_rh_badge WHERE id = '" + B + "'; DELETE FROM t_employe WHERE id = '" + E + "'");
  if (LIEN) { q("UPDATE t_employe SET lg_USER_ID = '" + ADMIN + "' WHERE id = '" + LIEN + "'"); }
}

(async () => {
  nettoyer();
  if (LIEN) { q("UPDATE t_employe SET lg_USER_ID = NULL WHERE id = '" + LIEN + "'"); }
  q("INSERT INTO t_employe (id, matricule, nom, prenoms, statut, lg_USER_ID, badge, created_at) VALUES ('" + E + "', 'E2E-BL-M1', 'ESSAI', 'Badge lecture', 'ACTIF', '" + ADMIN + "', '" + NUM + "', NOW())");
  q("INSERT INTO t_rh_badge (id, employe_id, numero, statut, dt_emission, created_at, secret_hash, dt_secret) VALUES ('" + B + "', '" + E + "', '" + NUM + "', 'ACTIF', CURDATE(), NOW(), '"
    + crypto.createHash('sha256').update(SECRET).digest('hex') + "', NOW())");
  const tailleLog = fs.existsSync(LOG) ? fs.statSync(LOG).size : 0;
  const b = await ENV_E2E.lancer(chromium);
  const page = async () => { const p = await (await b.newContext()).newPage(); await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'networkidle' }); return p; };
  const connecte = (p) => p.evaluate(async () => !!(await (await fetch('../api/v1/app/info', { cache: 'no-store' })).json()).connecte);
  const scanner = async (p, lu) => {
    await p.click('#pl-badge');
    await p.waitForSelector('#pl-badge-zone', { state: 'visible', timeout: 5000 });
    await p.keyboard.type(lu, { delay: 2 });
    await p.keyboard.press('Enter');
    await p.waitForTimeout(1500);
    return { titre: (await p.textContent('#pl-bz-titre')).trim(), texte: (await p.textContent('#pl-bz-texte')).replace(/\s+/g, ' ').trim(),
      page: await p.content(), connecte: await connecte(p) };
  };
  try {
    const r1 = await scanner(await page(), contenu(SECRET, 'µ'));
    ok('« | » remplacé par la douchette : « Lecture du badge déformée », consigne sur la douchette, aucune session',
      /déformée/i.test(r1.titre) && /douchette/i.test(r1.texte) && /AZERTY|clavier/i.test(r1.texte) && !r1.connecte, r1.titre + ' — ' + r1.texte);
    ok('Ce qui a été lu est montré, sans le secret', r1.texte.indexOf('PRESTIGE-BADGEµ1µ' + NUM + 'µ' + ENV_E2E.LOGIN + 'µ') >= 0 && r1.page.indexOf(SECRET) < 0 && r1.page.indexOf(SECRET.slice(0, 12)) < 0, r1.texte);

    const r2 = await scanner(await page(), inverse(contenu(SECRET)));
    ok('Casse inversée (verrouillage majuscules) : message qui le dit, aucune session', /majuscule/i.test(r2.texte) && !r2.connecte && r2.page.indexOf(inverse(SECRET).slice(0, 12)) < 0, r2.titre + ' — ' + r2.texte);

    const r3 = await scanner(await page(), contenu(ANCIEN));
    ok('Lecture correcte d\'un ancien exemplaire : « Badge non reconnu » comme avant', /Badge non reconnu/.test(r3.titre) && /réimprimé/.test(r3.texte) && !r3.connecte, r3.titre + ' — ' + r3.texte);

    await new Promise((x) => setTimeout(x, 1500));
    const ajout = fs.existsSync(LOG) ? fs.readFileSync(LOG).slice(tailleLog).toString('utf8') : '';
    ok('Traces du serveur : raison du refus notée (secret), sans le secret', /badge refus[ée]+.*SECRET/i.test(ajout) && ajout.indexOf(ANCIEN.slice(0, 12)) < 0 && ajout.indexOf(SECRET.slice(0, 12)) < 0,
      (ajout.match(/.*badge refus.*/i) || ['rien'])[0].slice(0, 160));

    const p4 = await page();
    await scanner(p4, contenu(SECRET)).catch(() => null);
    await p4.waitForURL('**/general/**', { timeout: 30000 }).catch(() => null);
    ok('La bonne lecture connecte toujours', /general/.test(p4.url()), p4.url());

    const lu = qwertySurAzerty(contenu(SECRET));
    const p5 = await page();
    await scanner(p5, lu).catch(() => null);
    await p5.waitForURL('**/general/**', { timeout: 30000 }).catch(() => null);
    ok('Douchette en QWERTY sur poste AZERTY (« ' + lu.slice(0, 22) + '… ») : connexion par le bouton badge', /general/.test(p5.url()), p5.url());
    const p6 = await page();
    await p6.click('#str_login');
    await p6.keyboard.type(lu, { delay: 1 });
    await p6.keyboard.press('Enter');
    await p6.waitForURL('**/general/**', { timeout: 30000 }).catch(() => null);
    ok('Même lecture dans « Identifiant » : connexion aussi', /general/.test(p6.url()), p6.url());
    const luMaj = qwertyMajSurAzerty(contenu(SECRET));
    const p7 = await page();
    await scanner(p7, luMaj).catch(() => null);
    await p7.waitForURL('**/general/**', { timeout: 30000 }).catch(() => null);
    ok('QWERTY et verrouillage majuscules (« ' + luMaj.slice(0, 22) + '… ») : connexion par le bouton badge', /general/.test(p7.url()), p7.url());
    const p8 = await page();
    await p8.click('#str_login');
    await p8.keyboard.type(luMaj, { delay: 1 });
    await p8.keyboard.press('Enter');
    await p8.waitForURL('**/general/**', { timeout: 30000 }).catch(() => null);
    ok('Même lecture dans « Identifiant » : connexion aussi', /general/.test(p8.url()), p8.url());
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
