/* ONGLETS A GAUCHE (demande du 13/10). Lecture seule.
 * Les 7 ecrans a onglets « boutons » (barre cec-onglets) : onglets alignes A GAUCHE de leur barre et centres
 * VERTICALEMENT dans la barre (1,5 px pres) ; l'onglet actif reste le premier ; aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const ECRANS = [['rappelstraitement', 'ongletsRp', 'Rappels traitement'], ['saisieperimeonglets', 'ongletsSp', 'Saisie produits périmés'],
  ['produitsonglets', 'ongletsPa', 'Produits'], ['gestioncaisseonglets', 'ongletsGc', 'Gestion de caisse'],
  ['controleachats', 'ongletsCa', 'Contrôle des achats'], ['retoursfournisseur', 'ongletsRf', 'Retours fournisseur'],
  ['commandesencours', 'ongletsCec', 'Commandes en cours']];

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(1500);
    for (const [x, barre, titre] of ECRANS) {
      await p.evaluate((a) => testextjs.app.getController('App').onLoadNewComponent(a.x, a.t, ''), { x, t: titre });
      await p.waitForFunction((a) => { const t = Ext.ComponentQuery.query(a.x + ' #' + a.b)[0]; return t && t.rendered && t.isVisible(); }, { x, b: barre }, { timeout: 30000 });
      await p.waitForTimeout(700);
      const m = await p.evaluate((a) => {
        const t = Ext.ComponentQuery.query(a.x + ' #' + a.b)[0], bs = t.query('button').filter((y) => y.isVisible());
        const z = t.getEl().getBox(), pr = bs[0].getEl().getBox(), de = bs[bs.length - 1].getEl().getBox();
        return { n: bs.length, gauche: Math.round(pr.x - z.x), droite: Math.round(z.right - de.right),
          ecartVertical: Math.abs((pr.y + pr.height / 2) - (z.y + z.height / 2)), actifPremier: bs[0].pressed === true };
      }, { x, b: barre });
      ok(titre + ' : onglets à gauche', m.n >= 2 && m.gauche <= 12 && m.droite > m.gauche, JSON.stringify(m));
      ok(titre + ' : onglets centrés verticalement dans la barre', m.ecartVertical <= 1.5, JSON.stringify(m));
      ok(titre + ' : le premier onglet est actif à l\'ouverture', m.actifPremier, JSON.stringify(m));
    }
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
