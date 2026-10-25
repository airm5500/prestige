/* BANNIERE WHATSAPP (retour du 25/10) : seulement pour l'administrateur, dossier du service connu de lui, « Reconnecter »
 * lance le service.
 *
 * Compte WhatsApp Web d'essai (mode test : aucun envoi reel) dont le service ne repond pas ; le service compagnon est
 * remplace par une imitation (dossier d'essai : package.json du compagnon, src/serveur.js, demarrer.sh ; sous Windows,
 * demarrer.bat). Par les vues :
 *  - admin : la banniere dit que le service ne repond pas et que son dossier est inconnu ; c'est un toast qui flotte
 *    par-dessus l'ecran (retour du 25/10, 2) : le panneau central ne bouge pas ;
 *  - profil Vendeur : ni banniere ni alerte (la route repond « sans droit »), et il ne peut pas lancer le service (403) ;
 *  - dossier renseigne par la route de l'ecran Comptes WhatsApp : la banniere l'affiche ;
 *  - adresse du service sur une autre machine : le lancement est refuse (rien n'est lance) ;
 *  - « Reconnecter » : le service demarre, la banniere disparait, le dossier annonce par le service est garde ;
 *  - aucune erreur JavaScript, aucune fenetre.
 * Le compte WhatsApp Web est remis comme avant ; dossier, service d'essai et compte d'essai retires a la fin.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync, execSync } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');
const { connexion } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const PORT = 18000 + Math.floor(Math.random() * 900);
const DOSSIER = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-whatsapp-web-'));
const ID = 'E2E-WA-VEND', LOGIN = 'e2e-wa-vendeur', MDP = 'E2e-Wa-Vend-7';
const ROLE = q("SELECT lg_ROLE_ID FROM t_role WHERE str_NAME = 'Vendeur'");
const aColonne = () => q("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = '" + BASE + "' AND TABLE_NAME = 'whatsapp_compte' AND COLUMN_NAME = 'web_repertoire'") === '1';

/* imitation du service compagnon : /etat et /sante, et son dossier dans /etat comme le vrai */
function preparerDossier() {
  fs.mkdirSync(path.join(DOSSIER, 'src'));
  fs.writeFileSync(path.join(DOSSIER, 'package.json'), JSON.stringify({ name: 'prestige-whatsapp-web', version: '0.0.0-e2e' }));
  fs.writeFileSync(path.join(DOSSIER, 'src', 'serveur.js'), "require('http').createServer((q, r) => { r.setHeader('Content-Type', 'application/json');"
    + " r.end(JSON.stringify(q.url.startsWith('/etat') ? { etat: 'CONNECTE', numero: '', repertoire: require('path').resolve(__dirname, '..'), file: {} } : { ok: true })); })"
    + ".listen(" + PORT + ", '127.0.0.1');\n");
  fs.writeFileSync(path.join(DOSSIER, 'demarrer.sh'), '#!/bin/sh\ncd "$(dirname "$0")"\nNODE=$(command -v node || echo /opt/node22/bin/node)\n'
    + 'nohup "$NODE" src/serveur.js > journal.txt 2>&1 &\necho $! > service.pid\n');
  fs.writeFileSync(path.join(DOSSIER, 'demarrer.bat'), '@echo off\r\nnode src\\serveur.js\r\n');
}
function nettoyer() {
  try { const pid = fs.readFileSync(path.join(DOSSIER, 'service.pid'), 'utf8').trim(); if (pid) { process.kill(Number(pid)); } } catch (e) { /* pas lance */ }
  try { fs.rmSync(DOSSIER, { recursive: true, force: true }); } catch (e) { /* deja retire */ }
  if (q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = '" + BASE + "' AND TABLE_NAME = 'e2e_wa_sauve'") === '1') {
    q("DELETE FROM whatsapp_compte WHERE mode = 'WEB'; INSERT INTO whatsapp_compte SELECT * FROM e2e_wa_sauve; DROP TABLE e2e_wa_sauve");
  }
  q("DELETE FROM t_role_user WHERE lg_USER_ID = '" + ID + "'; DELETE FROM t_event_log WHERE lg_USER_ID = '" + ID + "';"
    + " DELETE FROM t_session_utilisateur WHERE lg_USER_ID = '" + ID + "'; DELETE FROM t_user WHERE lg_USER_ID = '" + ID + "'");
}
const service = () => { try { execSync('curl -s -m 2 http://127.0.0.1:' + PORT + '/etat', { encoding: 'utf8' }); return true; } catch (e) { return false; } };

(async () => {
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const erreurs = [], dialogues = [];
  try {
    preparerDossier();
    q("DROP TABLE IF EXISTS e2e_wa_sauve; CREATE TABLE e2e_wa_sauve AS SELECT * FROM whatsapp_compte WHERE mode = 'WEB'");
    q("UPDATE whatsapp_compte SET actif = 1, mode_test = 1, web_url = 'http://127.0.0.1:" + PORT + "', web_jeton = 'e2e-jeton', sante = NULL, sante_raison = NULL"
      + (aColonne() ? ', web_repertoire = NULL' : '') + " WHERE mode = 'WEB'");
    ok('Précondition : service d\'essai arrêté', !service());

    const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
    p.on('pageerror', (e) => erreurs.push(e.message));
    p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const banniere = () => p.evaluate(() => { const e = document.getElementById('pwa-banniere'); return e && e.getBoundingClientRect().height > 0 ? e.textContent.replace(/\s+/g, ' ').trim() : ''; });
    await p.waitForFunction(() => !!document.getElementById('pwa-banniere'), null, { timeout: 30000 }).catch(() => {});
    const t1 = await banniere();
    /* retour du 25/10 (2) : un toast, sans prendre de place (la banniere faisait descendre la page et laissait un vide) */
    const toast = await p.evaluate(() => { const e = document.getElementById('pwa-banniere'), cp = Ext.getCmp('content-panel');
      if (!e) { return null; }
      const r = e.getBoundingClientRect(), corps = cp.body.dom.getBoundingClientRect(), tete = cp.header && cp.header.isVisible() ? cp.header.el.dom.getBoundingClientRect().bottom : cp.el.dom.getBoundingClientRect().top;
      return { position: getComputedStyle(e).position, dansLePanneau: cp.el.dom.contains(e), corpsColle: Math.abs(corps.top - tete) <= 2, bas: Math.round(innerHeight - r.bottom), droite: Math.round(innerWidth - r.right) }; });
    ok('Toast : flotte par-dessus l\'écran, hors du panneau central, qui ne bouge pas', toast && toast.position === 'fixed' && !toast.dansLePanneau && toast.corpsColle && toast.bas >= 0 && toast.droite >= 0, JSON.stringify(toast));
    ok('Admin : bannière « le service ne répond pas », dossier inconnu signalé', /ne répond pas/.test(t1) && /dossier/i.test(t1) && /inconnu/i.test(t1), t1);

    /* profil Vendeur : rien */
    q("INSERT INTO t_user (lg_USER_ID, str_LOGIN, str_PASSWORD, str_FIRST_NAME, str_LAST_NAME, str_FUNCTION, str_STATUT, lg_EMPLACEMENT_ID, dt_CREATED, int_CONNEXION)"
      + " VALUES ('" + ID + "', '" + LOGIN + "', MD5('" + MDP + "'), 'E2E', 'WA', 'Vendeur', 'enable', '1', NOW(), 0)");
    q("INSERT INTO t_role_user (lg_USER_ROLE_ID, lg_ROLE_ID, lg_USER_ID, dt_CREATED) VALUES ('" + ID + "', '" + ROLE + "', '" + ID + "', NOW())");
    const v = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
    v.on('pageerror', (e) => erreurs.push(e.message));
    await connexion(v, LOGIN, MDP);
    await v.waitForTimeout(6000);
    const vend = await v.evaluate(async () => {
      const a = await (await fetch('../api/v1/whatsapp/web/alerte')).json();
      const d = await fetch('../api/v1/whatsapp/web/demarrer', { method: 'POST' });
      return { alerte: a, banniere: !!document.getElementById('pwa-banniere'), demarrer: d.status };
    });
    ok('Profil Vendeur : ni bannière ni alerte, et lancement du service refusé (403)', vend.alerte.sansDroit === true && !vend.banniere && vend.demarrer === 403, JSON.stringify(vend));

    /* dossier renseigne par la route de l'ecran Comptes WhatsApp */
    const enr = await p.evaluate(async (d) => (await fetch('../api/v1/whatsapp/comptes/WEB', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ webRepertoire: d }) })).json(), DOSSIER);
    await p.evaluate(() => window.PrestigeAlerteWhatsApp.verifier());
    await p.waitForTimeout(1500);
    const t2 = await banniere();
    ok('Dossier renseigné (écran Comptes) : la bannière l\'affiche', enr.success !== false && t2.indexOf(DOSSIER) >= 0, JSON.stringify(enr).slice(0, 100) + ' / ' + t2);

    /* adresse sur une autre machine : refuse */
    await p.evaluate(async () => fetch('../api/v1/whatsapp/comptes/WEB', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ webUrl: 'http://192.0.2.10:18000' }) }));
    const loin = await p.evaluate(async () => (await fetch('../api/v1/whatsapp/web/demarrer', { method: 'POST' })).json());
    await p.waitForTimeout(1500);
    ok('Service sur une autre machine : lancement refusé, rien n\'est lancé', loin.success === false && /autre machine|ce serveur/i.test(loin.msg || '') && !service(), JSON.stringify(loin));
    await p.evaluate(async (port) => fetch('../api/v1/whatsapp/comptes/WEB', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ webUrl: 'http://127.0.0.1:' + port }) }), PORT);
    await p.evaluate(() => window.PrestigeAlerteWhatsApp.verifier());
    await p.waitForTimeout(1500);

    /* « Reconnecter » : le service demarre */
    await p.click('#pwa-banniere [data-pwa="reconnecter"]');
    await p.waitForTimeout(500);
    const pendant = await banniere();
    let fin = Date.now() + 60000, t3 = 'x';
    while (Date.now() < fin) { t3 = await banniere(); if (!t3) { break; } await p.waitForTimeout(1000); }
    ok('« Reconnecter » : le bouton annonce le démarrage', /Démarrage/i.test(pendant), pendant);
    ok('« Reconnecter » : le service démarre et la bannière disparaît', service() && t3 === '', 'service ' + service() + ' / ' + t3);
    ok('Le dossier annoncé par le service est gardé', aColonne() && q("SELECT web_repertoire FROM whatsapp_compte WHERE mode = 'WEB'") === fs.realpathSync(DOSSIER), aColonne() ? q("SELECT web_repertoire FROM whatsapp_compte WHERE mode = 'WEB'") : 'colonne absente');
    ok('Aucune erreur JavaScript, aucune fenêtre', erreurs.length === 0 && dialogues.length === 0, erreurs.concat(dialogues).join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Compte WhatsApp Web remis, essais retirés', q("SELECT COUNT(*) FROM t_user WHERE lg_USER_ID = '" + ID + "'") === '0' && !fs.existsSync(DOSSIER) && !service());
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
