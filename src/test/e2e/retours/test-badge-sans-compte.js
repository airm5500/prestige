/* CONNEXION PAR BADGE : « FORMAT » DANS LES TRACES DU SERVEUR (retour du 23/10, carte admin 747474).
 *
 * Le serveur a recu une lecture refusee pour son format. Deux causes, que l'ecran ne distinguait pas :
 *  a) badge imprime pour un employe SANS compte utilisateur : le QR porte un login vide
 *     (PRESTIGE-BADGE|1|numero||secret) et ne peut pas connecter ;
 *  b) lecture qui ne commence meme pas par PRESTIGE-BADGE (douchette reglee sur un autre clavier).
 * Ce que le test etablit (employe et badge d'essai, retires a la fin) :
 *  - onglet Badges : la ligne du badge dit « sans compte utilisateur » ; l'impression en QR depuis l'ecran avertit ;
 *  - page de connexion, a) : « Badge sans compte utilisateur » avec la marche a suivre, sans appel au serveur ;
 *  - page de connexion, b) : « Lecture du badge déformée » avec ce qui a ete lu (sans le secret) ;
 *  - traces du serveur : le refus FORMAT precise la partie en cause (login vide), sans le secret.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const { connexion, cliquer } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const LOG = '/opt/payara5/glassfish/domains/domain1/logs/server.log';
const E = 'E2E-BSC-1', B = 'E2E-BSC-B1', NUM = 'ZZS-26-' + String(Date.now()).slice(-5) + '-A';
const SECRET = crypto.randomBytes(32).toString('base64url');
const nettoyer = () => q("DELETE FROM t_rh_badge WHERE employe_id = '" + E + "'; DELETE FROM t_employe WHERE id = '" + E + "'");
/* frappe d'une douchette reglee en QWERTY sur un poste AZERTY : a<->q, z<->w, '-' -> ')', '|' -> '*' (approximation) */
const qwertySurAzerty = (t) => t.replace(/[aqzwAQZW\-|]/g, (c) => ({ a: 'q', q: 'a', z: 'w', w: 'z', A: 'Q', Q: 'A', Z: 'W', W: 'Z', '-': ')', '|': '*' })[c]);

(async () => {
  nettoyer();
  q("INSERT INTO t_employe (id, matricule, nom, prenoms, poste, statut, lg_USER_ID, badge, created_at) VALUES ('" + E + "', 'E2E-BSC-M1', 'ESSAI', 'Sans compte', 'Test', 'ACTIF', NULL, '" + NUM + "', NOW())");
  q("INSERT INTO t_rh_badge (id, employe_id, numero, statut, dt_emission, created_at) VALUES ('" + B + "', '" + E + "', '" + NUM + "', 'ACTIF', CURDATE(), NOW())");
  const tailleLog = fs.existsSync(LOG) ? fs.statSync(LOG).size : 0;
  const b = await ENV_E2E.lancer(chromium);
  try {
    const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('rhmanager', 'Ressources humaines', ''));
    await p.waitForTimeout(3000);
    await p.evaluate(() => Ext.ComponentQuery.query('tab').filter((x) => /badge/i.test(x.text || ''))[0].el.dom.click());
    await p.waitForFunction((n) => { const g = Ext.ComponentQuery.query('#grilleBadges')[0]; return g && g.getStore().findRecord('numero', n); }, NUM, { timeout: 20000 });
    const ligne = await p.evaluate((n) => { const g = Ext.ComponentQuery.query('#grilleBadges')[0]; const r = g.getStore().findRecord('numero', n);
      g.getSelectionModel().select([r]); return g.getView().getNode(r).textContent; }, NUM);
    ok('Onglet Badges : la ligne dit « sans compte utilisateur »', /sans compte utilisateur/i.test(ligne), ligne.slice(0, 160));
    const pop = p.context().waitForEvent('page', { timeout: 10000 }).catch(() => null);
    await cliquer(p, '#btnImprimerBadges');
    await pop;
    await p.waitForTimeout(800);
    const message = await p.evaluate(() => Ext.ComponentQuery.query('#badgeMessage')[0].getEl().dom.textContent);
    ok('Impression en QR depuis l\'écran : avertissement (le QR ne permettra pas de se connecter)', /sans compte utilisateur/i.test(message) && /connecter/i.test(message), message);

    const page = async () => { const x = await (await b.newContext()).newPage(); await x.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'networkidle' }); return x; };
    const scanner = async (x, lu) => { const appels = []; x.on('request', (r) => { if (/auth-badge/.test(r.url())) { appels.push(1); } });
      await x.click('#pl-badge'); await x.keyboard.type(lu, { delay: 2 }); await x.keyboard.press('Enter'); await x.waitForTimeout(1500);
      return { titre: (await x.textContent('#pl-bz-titre')).trim(), texte: (await x.textContent('#pl-bz-texte')).replace(/\s+/g, ' ').trim(), page: await x.content(), appels: appels.length }; };
    const a = await scanner(await page(), 'PRESTIGE-BADGE|1|' + NUM + '||' + SECRET);
    ok('a) QR sans login : « Badge sans compte utilisateur », marche à suivre, sans appel au serveur', /sans compte utilisateur/i.test(a.titre + a.texte) && /réimprim/i.test(a.texte) && a.appels === 0 && a.page.indexOf(SECRET.slice(0, 12)) < 0, a.titre + ' — ' + a.texte);
    const lu = qwertySurAzerty('PRESTIGE-BADGE|1|' + NUM + '|admin|' + SECRET);
    const bb = await scanner(await page(), lu);
    ok('b) Lecture qui ne commence pas par PRESTIGE-BADGE : « Lecture du badge déformée », ce qui a été lu sans le secret', /déformée/i.test(bb.titre) && bb.texte.indexOf('PRESTIGE)BQDGE') >= 0 && bb.page.indexOf(lu.slice(-30)) < 0, bb.titre + ' — ' + bb.texte);

    const x = await page();
    await x.evaluate(async (c) => fetch('../api/v1/user/auth-badge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contenu: c }) }), 'PRESTIGE-BADGE|1|' + NUM + '||' + SECRET);
    await x.waitForTimeout(1000);
    const ajout = fs.existsSync(LOG) ? fs.readFileSync(LOG).slice(tailleLog).toString('utf8') : '';
    const lignes = (ajout.match(/.*badge refusee : FORMAT.*/g) || []).join(' | ');
    ok('Traces : FORMAT précise « login vide », sans le secret', /FORMAT.*login vide/.test(lignes) && ajout.indexOf(SECRET.slice(0, 12)) < 0, lignes.slice(0, 200));
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
