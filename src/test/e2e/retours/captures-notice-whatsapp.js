/* Captures d'ecran de la notice WhatsApp Web (docs/notices/NOTICE_WHATSAPP_WEB.md), refaites a la demande :
 *   NODE_PATH=... node captures-notice-whatsapp.js
 * Service compagnon d'essai (WHATSAPP_FAUX=1, aucun envoi reel), compte WEB pointe dessus le temps des captures,
 * puis remis tel quel. Le jeton n'apparait pas a l'ecran (jamais renvoye au navigateur).
 */
const { chromium } = require('playwright-core');
const { execFileSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const IMAGES = path.join(__dirname, '../../../../docs/notices/images');
const JETON = 'jeton-capture-' + Date.now(), PORT = 3012, DOSSIER = fs.mkdtempSync('/tmp/wa-capture-');
const lit = (s) => (s === undefined || s === 'NULL' || s === '' ? 'NULL' : "'" + s.replace(/'/g, "''") + "'");

(async () => {
  const sauve = q("SELECT CONCAT_WS('#~#', actif, mode_test, IFNULL(web_url, 'NULL'), IFNULL(web_jeton, 'NULL'), IFNULL(web_regles, 'NULL')) FROM whatsapp_compte WHERE mode = 'WEB'").split('#~#');
  const srv = spawn('/opt/node22/bin/node', [path.join(__dirname, '../../../../outils/whatsapp-web/src/serveur.js')],
    { env: Object.assign({}, process.env, { WHATSAPP_FAUX: '1', WHATSAPP_FAUX_CONNECTE: '1', JETON, PORT: String(PORT), DOSSIER }), stdio: 'ignore' });
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  try {
    await new Promise((r) => setTimeout(r, 1500));
    q("UPDATE whatsapp_compte SET actif = 1, mode_test = 1, web_url = 'http://127.0.0.1:" + PORT + "', web_jeton = '" + JETON + "', web_regles = NULL WHERE mode = 'WEB'");
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('whatsappcomptes', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('whatsappcomptes').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(2500);
    await p.screenshot({ path: path.join(IMAGES, 'whatsapp-web-1-comptes.png') });
    await p.evaluate(() => { const t = Ext.ComponentQuery.query('whatsappcomptes #ongletsWhatsApp')[0]; t.setActiveTab(t.down('#ongletWeb')); });
    await p.waitForFunction(() => { const x = Ext.ComponentQuery.query('whatsappcomptes #qrWeb')[0]; return x && x.getEl().down('img.wa-qr'); }, null, { timeout: 20000 });
    await p.waitForTimeout(500);
    await p.screenshot({ path: path.join(IMAGES, 'whatsapp-web-2-qr.png') });
    await p.waitForFunction(() => /Connecté/.test(Ext.ComponentQuery.query('whatsappcomptes #etatWeb')[0].getEl().dom.textContent), null, { timeout: 20000 });
    await p.waitForTimeout(800);
    await p.screenshot({ path: path.join(IMAGES, 'whatsapp-web-3-connecte.png') });
    console.log('captures faites dans ' + IMAGES);
  } finally {
    await b.close();
    srv.kill();
    q('UPDATE whatsapp_compte SET actif = ' + sauve[0] + ', mode_test = ' + sauve[1] + ', web_url = ' + lit(sauve[2]) + ', web_jeton = ' + lit(sauve[3])
      + ', web_regles = ' + lit(sauve[4]) + " WHERE mode = 'WEB'");
    fs.rmSync(DOSSIER, { recursive: true, force: true });
  }
})();
