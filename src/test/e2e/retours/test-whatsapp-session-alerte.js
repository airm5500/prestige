/* BANNIERE « SESSION WHATSAPP A RECONNECTER » (demande du 25/10, repris du CRM UBIPHARM).
 *
 * Service WhatsApp Web d'essai (WHATSAPP_FAUX=1) lance par le test, compte WEB actif en mode test, remis a la fin.
 * Par les vues (admin) :
 *  - service connecte, reception saine : aucune banniere ;
 *  - le service signale une reception degradee (POST webhook-web {sante:{sante:'DEGRADE', raisonSante}}, chemin reel) :
 *    banniere sur l'ecran, avec la raison et « Reconnecter », qui ouvre Comptes WhatsApp sur l'onglet de connexion ;
 *  - le service signale la reception redevenue saine : la banniere disparait ;
 *  - le service s'arrete : banniere « ne répond pas » ;
 *  - « Masquer » : la banniere disparait et ne revient pas au rechargement suivant ;
 *  - compte WhatsApp Web inactif : aucune banniere ;
 *  - aucune erreur JavaScript, aucune fenetre ; ni le jeton ni la raison complete dans le journal du serveur.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { connexion, cliquer } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const LOG = '/opt/payara5/glassfish/domains/domain1/logs/server.log';
const JETON = 'jeton-essai-alerte-' + Date.now();
const PORT = 3012;
const DOSSIER = fs.mkdtempSync(ENV_E2E.TMP + '/wa-alerte-');
const RAISON = 'Messages entrants illisibles (chiffrement désynchronisé) : reconnectez le téléphone.';
const lit = (s) => (s === 'NULL' ? 'NULL' : "'" + s.replace(/'/g, "''") + "'");
const sante = (etat) => fetch('http://localhost:8080/prestige/api/v1/whatsapp/webhook-web', { method: 'POST',
  headers: { Authorization: 'Bearer ' + JETON, 'Content-Type': 'application/json' },
  body: JSON.stringify({ sante: { sante: etat, raisonSante: etat === 'DEGRADE' ? RAISON : null, illisibles: etat === 'DEGRADE' ? 5 : 0 } }) }).then((r) => r.status);

(async () => {
  const sauve = q("SELECT CONCAT_WS('#~#', actif, mode_test, IFNULL(web_url, 'NULL'), IFNULL(web_jeton, 'NULL')) FROM whatsapp_compte WHERE mode = 'WEB'").split('#~#');
  const colonnes = q("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'whatsapp_compte' AND COLUMN_NAME = 'sante'");
  const tailleLog = fs.statSync(LOG).size;
  let srv = spawn('/opt/node22/bin/node', [path.join(__dirname, '../../../../outils/whatsapp-web/src/serveur.js')],
    { env: Object.assign({}, process.env, { WHATSAPP_FAUX: '1', WHATSAPP_FAUX_CONNECTE: '1', JETON, PORT: String(PORT), DOSSIER }), stdio: ['ignore', 'ignore', 'ignore'] });
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await (await b.newContext({ viewport: { width: 1500, height: 900 } })).newPage();
  const erreurs = [], dialogues = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  /* banniere apres un chargement de l'application (verification au demarrage) ; position fixe : pas d'offsetParent */
  const banniere = async () => {
    await p.waitForTimeout(6000);
    return p.evaluate(() => { const e = document.getElementById('pwa-banniere'); return e && e.getBoundingClientRect().height > 0 ? e.textContent : ''; });
  };
  const recharger = async () => {
    await p.reload({ waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app && Ext.ComponentQuery.query('navigation').length, null, { timeout: 120000 });
  };
  try {
    ok('Colonnes de santé de la réception créées par la migration', colonnes === '1', colonnes);
    await new Promise((r) => setTimeout(r, 1500));
    exec(`UPDATE whatsapp_compte SET actif = 1, mode_test = 1, web_url = 'http://127.0.0.1:${PORT}', web_jeton = '${JETON}' WHERE mode = 'WEB'`);
    if (colonnes === '1') { exec("UPDATE whatsapp_compte SET sante = NULL, sante_raison = NULL, sante_maj = NULL WHERE mode = 'WEB'"); }
    /* le service d'essai passe a « connecte » quelques secondes apres la lecture de son QR code */
    await fetch(`http://127.0.0.1:${PORT}/qr`, { headers: { Authorization: 'Bearer ' + JETON } }).catch(() => {});
    await new Promise((r) => setTimeout(r, 4000));
    await fetch(`http://127.0.0.1:${PORT}/etat`, { headers: { Authorization: 'Bearer ' + JETON } }).catch(() => {});

    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    ok('Service connecté, réception saine : aucune bannière', await banniere() === '');

    ok('Le service signale une réception dégradée (webhook) : accepté', await sante('DEGRADE') === 200);
    await recharger();
    let t = await banniere();
    ok('Bannière « session à reconnecter », avec la raison', /reconnect/i.test(t) && t.includes('illisibles'), t);
    const bouton = await p.$('#pwa-banniere [data-pwa="reconnecter"]');
    if (bouton) { await bouton.click(); }
    await p.waitForFunction(() => Ext.ComponentQuery.query('whatsappcomptes').some((x) => x.isVisible(true)), null, { timeout: 30000 }).catch(() => {});
    const onglet = await p.evaluate(() => { const t2 = Ext.ComponentQuery.query('whatsappcomptes #ongletsWhatsApp')[0]; return t2 ? t2.getActiveTab().itemId : null; });
    ok('« Reconnecter » ouvre Comptes WhatsApp sur l\'onglet de connexion (QR code)', onglet === 'ongletWeb', onglet);

    await sante('OK');
    await recharger();
    ok('Réception redevenue saine : la bannière disparaît', await banniere() === '');

    srv.kill('SIGTERM'); srv = null;
    await new Promise((r) => setTimeout(r, 22000));
    await recharger();
    t = await banniere();
    ok('Service arrêté : bannière « ne répond pas »', /ne répond pas/.test(t), t);
    await p.click('#pwa-banniere [data-pwa="masquer"]');
    await p.waitForTimeout(500);
    const masquee = await p.evaluate(() => { const e = document.getElementById('pwa-banniere'); return !e || e.getBoundingClientRect().height === 0; });
    await recharger();
    ok('« Masquer » : la bannière disparaît et ne revient pas au rechargement', masquee && await banniere() === '');

    await p.evaluate(() => { try { localStorage.removeItem('prestige.alerteWhatsApp.masquee'); } catch (e) { /* */ } });
    exec("UPDATE whatsapp_compte SET actif = 0 WHERE mode = 'WEB'");
    await new Promise((r) => setTimeout(r, 22000));
    await recharger();
    ok('Compte WhatsApp Web inactif : aucune bannière', await banniere() === '');
    const log = fs.readFileSync(LOG, 'utf8').slice(tailleLog);
    ok('Journal du serveur : ni le jeton ni la raison', !log.includes(JETON) && !log.includes('chiffrement désynchronisé'));
    ok('Aucune erreur JavaScript, aucune fenêtre du navigateur', erreurs.length === 0 && dialogues.length === 0, erreurs.concat(dialogues).join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    if (srv) { srv.kill('SIGTERM'); }
    exec(`UPDATE whatsapp_compte SET actif = ${sauve[0]}, mode_test = ${sauve[1]}, web_url = ${lit(sauve[2])}, web_jeton = ${lit(sauve[3])} WHERE mode = 'WEB'`);
    if (colonnes === '1') { exec("UPDATE whatsapp_compte SET sante = NULL, sante_raison = NULL, sante_maj = NULL WHERE mode = 'WEB'"); }
    fs.rmSync(DOSSIER, { recursive: true, force: true });
    ok('Compte WhatsApp Web remis', q("SELECT CONCAT_WS('#~#', actif, mode_test, IFNULL(web_url, 'NULL'), IFNULL(web_jeton, 'NULL')) FROM whatsapp_compte WHERE mode = 'WEB'") === sauve.join('#~#'));
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
