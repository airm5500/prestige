/* RH, ONGLET BADGES : QR CODE OU CODE-BARRES SUR LE BADGE IMPRIME (demande du 16/10).
 *
 * QR code par defaut ; il contient le numero du badge (genere automatiquement), le login de l'employe et un SECRET
 * propre au badge (jamais le mot de passe) dont seule l'empreinte SHA-256 est gardee en base. Ce que le test etablit
 * (badge d'un employe d'essai lie a un utilisateur, retire a la fin) :
 *  - ecran : choix « QR code / Code-barres », QR code par defaut ;
 *  - impression par defaut : QR lisible (decode depuis le PDF rendu), au format PRESTIGE-BADGE|1|numero|login|secret ;
 *    numero = badge, login = celui de l'utilisateur, SHA-256(secret) = empreinte en base ; le mot de passe n'y est pas ;
 *  - reimpression : nouveau secret (l'ancien exemplaire n'est plus valable) ;
 *  - impression en code-barres : pas de QR, secret inchange.
 * Prerequis : jsqr et pngjs (NODE_PATH), pdftoppm.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const jsQR = require('jsqr');
const { PNG } = require('pngjs');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const E = 'E2E-BQ-1';
const nettoyer = () => exec("DELETE FROM t_rh_badge WHERE employe_id = '" + E + "'; DELETE FROM t_employe WHERE id = '" + E + "';");

/* rend la premiere page du PDF et cherche un QR dans la premiere carte (en haut a gauche) */
function lireQr(pdf) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bq-'));
  fs.writeFileSync(path.join(dir, 'b.pdf'), pdf);
  execFileSync('pdftoppm', ['-r', '300', '-f', '1', '-l', '1', '-png', path.join(dir, 'b.pdf'), path.join(dir, 'p')]);
  const fichier = fs.readdirSync(dir).find((f) => f.endsWith('.png'));
  const png = PNG.sync.read(fs.readFileSync(path.join(dir, fichier)));
  const r = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  fs.rmSync(dir, { recursive: true, force: true });
  return r ? r.data : null;
}

(async () => {
  nettoyer();
  /* un utilisateur actif sans employe rattache */
  const U = q("SELECT CONCAT(u.lg_USER_ID, '|', u.str_LOGIN) FROM t_user u WHERE u.str_STATUT = 'enable' AND NOT EXISTS (SELECT 1 FROM t_employe e WHERE e.lg_USER_ID = u.lg_USER_ID) LIMIT 1").split('|');
  exec("INSERT INTO t_employe (id, matricule, nom, prenoms, statut, lg_USER_ID, created_at) VALUES ('" + E + "', 'E2E-BQ-M1', 'ESSAI', 'Badge QR', 'ACTIF', '" + U[0] + "', NOW())");
  const MDP = q("SELECT str_PASSWORD FROM t_user WHERE lg_USER_ID = '" + U[0] + "'");
  ok('Jeu d\'essai : employé lié à un utilisateur', !!U[1], U[1]);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const api = (m, u, c) => p.evaluate(async ([m, u, c]) => { const r = await fetch(u, { method: m, headers: { 'Content-Type': 'application/json' }, body: c === undefined ? undefined : JSON.stringify(c) }); return r.json(); }, [m, u, c]);
  const pdf = (u) => p.evaluate(async (u) => { const r = await fetch(u); const a = new Uint8Array(await r.arrayBuffer()); let s = ''; a.forEach((x) => { s += String.fromCharCode(x); }); return { type: r.headers.get('content-type'), b64: btoa(s) }; }, u);
  const empreinte = () => q("SELECT IFNULL(secret_hash, 'NULL') FROM t_rh_badge WHERE employe_id = '" + E + "' AND statut = 'ACTIF'");
  try {
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });

    const cree = await api('POST', '../api/v1/rh/badges', { employeId: E });
    ok('Badge créé, numéro généré automatiquement (PRE-AA-NNNNN-C)', cree.success === true && /^[A-Z]{3}-\d{2}-\d{5}-[A-Z]$/.test(cree.numero || ''), JSON.stringify(cree).slice(0, 160));

    /* ecran : choix du code, QR par defaut */
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('rhmanager', 'Ressources humaines', ''));
    await p.waitForTimeout(3000);
    const choix = await p.evaluate(() => { const t = Ext.ComponentQuery.query('tab').filter((x) => /badge/i.test(x.text || ''))[0]; if (t) { t.el.dom.click(); }
      const c = Ext.ComponentQuery.query('#typeCodeBadge')[0]; return c ? { v: c.getValue(), vis: c.isVisible(), libelles: (c.getStore ? c.getStore().getRange().map((r) => r.get(c.displayField)) : (c.items ? c.items.items.map((x) => x.boxLabel) : [])) } : null; });
    ok('Écran : choix QR code / Code-barres, QR code par défaut', choix && choix.v === 'QR' && choix.libelles.join('|').indexOf('QR') >= 0 && /barre/i.test(choix.libelles.join('|')), JSON.stringify(choix));

    const d1 = await pdf('../api/v1/rh/badges/pdf?ids=' + cree.id);
    const c1 = lireQr(Buffer.from(d1.b64, 'base64'));
    const parts = (c1 || '').split('|');
    ok('Impression par défaut : QR lisible au format PRESTIGE-BADGE|1|numéro|login|secret', d1.type === 'application/pdf' && parts.length === 5 && parts[0] === 'PRESTIGE-BADGE' && parts[1] === '1', c1 && c1.replace(/[^|]+$/, '…'));
    ok('QR : numéro du badge et login de l\'employé', parts[2] === cree.numero && parts[3] === U[1], parts.slice(2, 4).join(' / '));
    ok('QR : SHA-256(secret) = empreinte en base ; secret long et aléatoire', parts[4] && parts[4].length >= 40 && crypto.createHash('sha256').update(parts[4]).digest('hex') === empreinte(), empreinte().slice(0, 12));
    ok('QR : le mot de passe (même haché) n\'y figure pas', !!c1 && (!MDP || c1.indexOf(MDP) < 0));

    const h1 = empreinte();
    const d2 = await pdf('../api/v1/rh/badges/pdf?ids=' + cree.id + '&code=QR');
    const c2 = lireQr(Buffer.from(d2.b64, 'base64'));
    ok('Réimpression : nouveau secret, l\'ancien exemplaire n\'est plus valable', c2 && c2 !== c1 && empreinte() !== h1 && crypto.createHash('sha256').update(c2.split('|')[4]).digest('hex') === empreinte());

    const h2 = empreinte();
    const d3 = await pdf('../api/v1/rh/badges/pdf?ids=' + cree.id + '&code=CODE128');
    ok('Code-barres : pas de QR, secret inchangé', d3.type === 'application/pdf' && lireQr(Buffer.from(d3.b64, 'base64')) === null && empreinte() === h2, empreinte() === h2);
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
