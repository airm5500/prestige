/* ETAT DE STOCK (demande du 13/10) : filtres sur la 1re ligne, actions sur une 2e ligne (tout est visible a 1366 px) ;
 * impression « avec reserve » : NOMS des rayons coches dans le rappel des criteres (avant : leurs identifiants).
 * Lecture seule. */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const RAYONS = q("SELECT f.lg_ZONE_GEO_ID FROM t_famille f WHERE f.str_STATUT = 'enable' AND f.lg_ZONE_GEO_ID IS NOT NULL AND f.lg_ZONE_GEO_ID <> '1' GROUP BY 1 ORDER BY COUNT(*) DESC LIMIT 2").split('\n');
const NOMS = RAYONS.map((r) => q("SELECT str_LIBELLEE FROM t_zone_geographique WHERE lg_ZONE_GEO_ID = '" + r + "'"));

(async () => {
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('etatstock', 'Etat de stock', ''));
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('etatstock #actionsEtatStock')[0]; return e && e.rendered; }, null, { timeout: 40000 });
    await p.waitForTimeout(1500);
    const m = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('etatstock')[0], l1 = e.down('#filtresEtatStock'), l2 = e.down('#actionsEtatStock');
      const dansLaLigne = (t) => t.query('button').filter((x) => x.isVisible()).every((x) => x.getEl().getRight() <= t.getEl().getRight() + 1);
      return { l1Haut: l1.getEl().getTop(), l2Haut: l2.getEl().getTop(), actions: l2.query('button').map((x) => x.getText()),
        filtreDansL1: !!l1.down('filtresmulti'), toutVisible: dansLaLigne(l1) && dansLaLigne(l2) };
    });
    ok('Deux lignes : filtres en haut, actions dessous', m.l2Haut > m.l1Haut && m.filtreDansL1, JSON.stringify(m));
    ok('Actions sur la 2e ligne (Imprimer, réserve, inventaire, suggestion, CSV, EXCEL)', ['Imprimer', 'CSV', 'EXCEL'].every((t) => m.actions.join('|').indexOf(t) >= 0) && m.actions.length >= 6, m.actions.join('|'));
    ok('Tous les boutons tiennent dans la largeur (1366 px)', m.toutVisible, JSON.stringify(m));
    const pdf = await p.evaluate(async (u) => { const r = await fetch('../api/v1/etat-stock/pdf-reserve?' + u); return { ct: r.headers.get('content-type'), b: Array.from(new Uint8Array(await r.arrayBuffer())) }; },
      new URLSearchParams({ lg_ZONE_GEO_ID: RAYONS.join(',') }).toString());
    let texte = '';
    if (/pdf/.test(pdf.ct || '')) { const f = path.join(os.tmpdir(), 'etat-' + Date.now() + '.pdf'); fs.writeFileSync(f, Buffer.from(pdf.b));
      texte = execFileSync('pdftotext', ['-layout', f, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' '); fs.unlinkSync(f); }
    ok('Impression avec réserve : les noms des 2 rayons cochés', NOMS.every((n) => texte.indexOf(n.replace(/\s+/g, ' ')) >= 0) && RAYONS.every((r) => texte.indexOf(r) < 0),
      NOMS.join(' / ') + ' :: ' + texte.slice(0, 260));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Exception', false, e.stack);
  } finally {
    await b.close();
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
