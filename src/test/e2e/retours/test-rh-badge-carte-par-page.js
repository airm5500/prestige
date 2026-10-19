/* RH, ONGLET BADGES : IMPRESSION « UNE CARTE PAR PAGE » (imprimante a cartes PVC, demande du 17/10).
 *
 * Par les vues : RESSOURCES HUMAINES > « Ressources humaines », onglet « Badges », la ligne du badge d'essai cochee
 * d'un clic, liste « Format », bouton « Imprimer les badges cochés ».
 *  - ecran : liste « Format », « A4, 10 cartes à découper » par defaut, aide au survol ;
 *  - « Une carte par page » : PDF d'une page au format exact 85,6 x 54 mm, QR lisible avec le numero du badge ;
 *  - non-regression : format A4 par defaut, page A4 ;
 *  - aucune erreur JavaScript. Employe et badge d'essai retires a la fin.
 * Prerequis : jsqr et pngjs (NODE_PATH), pdftoppm, pdfinfo.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const jsQR = require('jsqr');
const { PNG } = require('pngjs');
const { connexion, ouvrirMenu, cliquer, choisir } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const E = 'E2E-BCP-1';
const nettoyer = () => q("DELETE FROM t_rh_badge WHERE employe_id = '" + E + "'; DELETE FROM t_employe WHERE id = '" + E + "'");

/* pages (taille en mm) et QR de la premiere page */
function lire(pdf) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bcp-'));
  const f = path.join(dir, 'b.pdf');
  fs.writeFileSync(f, pdf);
  const info = execFileSync('pdfinfo', [f], { encoding: 'utf8' });
  const pages = Number((info.match(/Pages:\s+(\d+)/) || [])[1]);
  const t = info.match(/Page size:\s+([\d.]+) x ([\d.]+) pts/);
  execFileSync('pdftoppm', ['-r', '300', '-f', '1', '-l', '1', '-png', f, path.join(dir, 'p')]);
  const png = PNG.sync.read(fs.readFileSync(path.join(dir, fs.readdirSync(dir).find((x) => x.endsWith('.png')))));
  const r = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  fs.rmSync(dir, { recursive: true, force: true });
  return { pages, l: t ? Number(t[1]) * 25.4 / 72 : 0, h: t ? Number(t[2]) * 25.4 / 72 : 0, qr: r ? r.data : null };
}

(async () => {
  nettoyer();
  const U = q("SELECT u.lg_USER_ID FROM t_user u WHERE u.str_STATUT = 'enable' AND NOT EXISTS (SELECT 1 FROM t_employe e WHERE e.lg_USER_ID = u.lg_USER_ID) LIMIT 1");
  q("INSERT INTO t_employe (id, matricule, nom, prenoms, statut, lg_USER_ID, created_at) VALUES ('" + E + "', 'E2E-BCP-M1', 'ZZCARTE', 'Badge PVC', 'ACTIF', '" + U + "', NOW())");
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } });
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  try {
    await connexion(p, 'admin', 'e2etest');
    const cree = await p.evaluate(async (e) => (await fetch('../api/v1/rh/badges', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employeId: e }) })).json(), E);
    await ouvrirMenu(p, 'RESSOURCES HUMAINES', 'Ressources humaines');
    await p.waitForFunction(() => Ext.ComponentQuery.query('rhmanager').some((c) => c.isVisible(true)), null, { timeout: 60000 });
    await p.locator('.x-tab').filter({ hasText: /^Badges$/ }).first().click();
    await p.waitForFunction((n) => { const g = Ext.ComponentQuery.query('rhmanager #grilleBadges')[0]; return g && g.isVisible(true) && !g.getStore().isLoading()
      && g.getStore().findExact('numero', n) >= 0; }, cree.numero, { timeout: 30000 });

    const format = await p.evaluate(() => { const c = Ext.ComponentQuery.query('rhmanager #formatBadge')[0];
      return c ? { v: c.getValue(), vis: c.isVisible(true), libelles: c.getStore().getRange().map((r) => r.get('libelle')) } : null; });
    ok('Écran : liste « Format », A4 par défaut, choix « Une carte par page »', format && format.vis && format.v === 'A4' && format.libelles.includes('Une carte par page'), JSON.stringify(format));

    /* cocher la ligne du badge d'essai d'un clic sur sa case */
    const imprimer = async () => {
      const vue = await p.evaluate(() => Ext.ComponentQuery.query('rhmanager #grilleBadges')[0].getView().el.id);
      const ligne = p.locator('#' + vue + ' .x-grid-row').filter({ hasText: cree.numero }).first();
      await ligne.locator('.x-grid-row-checker').click();
      const onglet = ctx.waitForEvent('page', { timeout: 15000 });
      await cliquer(p, 'rhmanager #btnImprimerBadges');
      const pg = await onglet;
      /* Chromium sans affichage remplace le PDF par sa visionneuse : le PDF est relu a l'adresse de l'onglet ouvert */
      const url = pg.url();
      await pg.close();
      await ligne.locator('.x-grid-row-checker').click();
      const b64 = await p.evaluate(async (u) => { const a = new Uint8Array(await (await fetch(u)).arrayBuffer()); let x = ''; a.forEach((c) => { x += String.fromCharCode(c); }); return btoa(x); }, url);
      return { url, corps: Buffer.from(b64, 'base64') };
    };

    let d = await imprimer();
    let l = d && lire(d.corps);
    ok('Par défaut : planche A4 (non-régression)', d && /format=A4/.test(d.url) && l.pages === 1 && Math.abs(l.l - 210) < 1 && Math.abs(l.h - 297) < 1,
      d && (d.url.replace(/^.*\?/, '') + ' ' + JSON.stringify({ pages: l.pages, l: l.l.toFixed(1), h: l.h.toFixed(1) })));

    await choisir(p, 'rhmanager #formatBadge', 'Une carte par page');
    d = await imprimer();
    l = d && lire(d.corps);
    ok('« Une carte par page » : une page au format exact 85,6 × 54 mm', d && /format=CARTE/.test(d.url) && l.pages === 1 && Math.abs(l.l - 85.6) < 0.5 && Math.abs(l.h - 54) < 0.5,
      d && JSON.stringify({ pages: l.pages, l: l.l.toFixed(1), h: l.h.toFixed(1) }));
    ok('« Une carte par page » : QR lisible, numéro du badge', l && l.qr && l.qr.split('|')[2] === cree.numero, l && l.qr && l.qr.replace(/[^|]+$/, '…'));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
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
