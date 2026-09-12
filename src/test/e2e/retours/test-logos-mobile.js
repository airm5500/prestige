/* Logos des operateurs sur les tuiles de « SELECTION RAPIDE MOBILE MONEY » (fenetre client de la caisse).
   Chaque tuile porte l'image resources/images/modes/<LIBELLE>.png, chargee ; sans fichier, la tuile garde son texte. */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 320) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });

// un client par defaut sur un mode de chaque operateur mobile, pour que les tuiles existent ; retabli a la fin
const sauve = q("SELECT lg_MODE_REGLEMENT_ID, IFNULL(lg_CLIENT_DEFAUT_ID,'') FROM t_mode_reglement WHERE lg_TYPE_REGLEMENT_ID IN ('7','10','19','8','9') AND str_STATUT='enable'")
  .split('\n').filter(Boolean).map(l => l.split('\t'));
function poser() {
  const client = q("SELECT lg_CLIENT_ID FROM t_client WHERE str_STATUT='enable' LIMIT 1");
  const vus = {};
  q("SELECT lg_MODE_REGLEMENT_ID, lg_TYPE_REGLEMENT_ID FROM t_mode_reglement WHERE lg_TYPE_REGLEMENT_ID IN ('7','10','19','8','9') AND str_STATUT='enable'")
    .split('\n').filter(Boolean).forEach(l => { const [id, type] = l.split('\t'); if (!vus[type]) { vus[type] = id; exec("UPDATE t_mode_reglement SET lg_CLIENT_DEFAUT_ID='" + client + "' WHERE lg_MODE_REGLEMENT_ID='" + id + "'"); } });
}
function retablir() { sauve.forEach(([id, c]) => exec("UPDATE t_mode_reglement SET lg_CLIENT_DEFAUT_ID=" + (c ? "'" + c + "'" : "NULL") + " WHERE lg_MODE_REGLEMENT_ID='" + id + "'")); }

(async () => {
  poser();
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 30000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('doventemanager', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('doventemanager').length > 0, null, { timeout: 20000 });
    await p.waitForTimeout(2500);
    const clients = JSON.parse(await p.evaluate(async () => (await fetch('../api/v1/modereglement/clients-mobile-money')).text()));
    ok('des clients mobile money sont parametres (tuiles attendues)', (clients.data || []).length >= 5, JSON.stringify((clients.data || []).map(c => c.modeLibelle)));
    await p.evaluate(() => { const c = testextjs.app.getController('VenteCtr'); c.getVnotypeReglement().setValue('7'); c.openClientLambdaSearchWindow(); });
    await p.waitForFunction(() => document.querySelectorAll('img[src*="images/modes/"]').length >= 5, null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    const images = await p.evaluate(() => Array.from(document.querySelectorAll('img[src*="images/modes/"]')).map(i => ({ src: i.getAttribute('src').split('/').pop(), chargee: i.complete && i.naturalWidth > 0, visible: i.style.display !== 'none' })));
    ok('chaque tuile porte le logo de son operateur', ['ORANGE.png', 'WAVE.png', 'DJAMO.png', 'MOOV.png', 'MTN.png'].every(n => images.some(i => i.src === n)), JSON.stringify(images));
    ok('les cinq logos sont charges et visibles', images.filter(i => /ORANGE|WAVE|DJAMO|MOOV|MTN/.test(i.src)).every(i => i.chargee && i.visible), JSON.stringify(images));
    const inconnues = images.filter(i => !/ORANGE|WAVE|DJAMO|MOOV|MTN/.test(i.src));
    ok('un operateur sans logo garde une tuile sans image cassee', inconnues.every(i => !i.visible), JSON.stringify(inconnues));
    await p.screenshot({ path: '/tmp/lot-u/tuiles.png' });
    ok('aucune erreur javascript', err.length === 0, err.join(' | '));
  } finally {
    retablir();
    await b.close();
  }
  const ko = res.filter(r => !r.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' PASS' + (ko ? '  (' + ko + ' FAIL)' : ''));
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); retablir(); process.exit(2); });
