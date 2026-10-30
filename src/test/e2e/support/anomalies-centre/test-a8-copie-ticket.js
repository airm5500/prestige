/* § 20 DU RAPPORT ANOMALIES_CENTRE_SUPPORT_2026-10-26 (journal de leana) : A8, reimpression d'un ticket « copie ».
 *
 * Une vente marquee « copy » partait vers ../api/v1/vente/copy/{id}, route retiree du serveur en juin 2024 : 404,
 * et le ticket ne sortait pas.
 *
 * Parcours par les vues (compte e2e) : SERVICE CLIENT > « Vente terminées », bouton rechercher, icone « Réimprimer le
 * ticket » de la ligne. La liste est SIMULEE (une vente fictive marquee copy) et les routes d'impression sont
 * interceptees : rien n'est imprime, aucune donnee n'est lue ni ecrite.
 *
 * node support/anomalies-centre/test-a8-copie-ticket.js   (BASE=http://localhost:9080/prestige)
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../../outils/poste');
const { connexion, ouvrirMenu, cliquer } = require('../../outils/vues');

const res = [];
function ok(n, c, d) { res.push(!!c); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const json = (r, o) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
const REF = 'E2EA8COPIE';
const ligne = (type) => ({ lgPREENREGISTREMENTID: 'E2E-A8-' + type, strREF: REF + type, lgTYPEVENTEID: type, copy: true, mvdate: new Date().toISOString(),
  intPRICE: 1500, intCUSTPART: 1500, strTYPEVENTE: type === '1' ? 'VNO' : 'VO', userFullName: 'E2E', clientFullName: '', beCancel: false, cancel: false });

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const impressions = [];
  await p.route('**/api/v1/support/events', (r) => r.request().method() === 'POST' ? r.fulfill({ status: 200, body: '{}' }) : r.continue());
  await p.route('**/api/v1/ventestats?**', (r) => json(r, { success: true, total: 2, data: [ligne('1'), ligne('2')] }));
  /* impression coupee : la route d'origine (copy) n'existe plus sur le serveur, elle repond 404 comme en officine */
  await p.route(/\/api\/v1\/vente\/(copy|ticket)\//, (r) => { const u = r.request().url().replace(/.*\/api\/v1\//, ''); impressions.push(u);
    return /^vente\/copy\//.test(u) ? r.fulfill({ status: 404, body: '' }) : json(r, { success: true }); });
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'SERVICE CLIENT', 'Vente terminées');
    await p.waitForFunction(() => Ext.ComponentQuery.query('ventemanager #rechercher').some((c) => c.isVisible(true)), null, { timeout: 60000 });
    await p.waitForTimeout(1000);
    await cliquer(p, 'ventemanager #rechercher');
    for (const [type, attendu] of [['1', 'vente/ticket/vno/E2E-A8-1'], ['2', 'vente/ticket/vo/E2E-A8-2']]) {
      const l = p.locator('.x-grid-row').filter({ visible: true, hasText: REF + type }).first();
      await l.waitFor({ timeout: 60000 });
      impressions.length = 0;
      await l.locator('img[data-qtip="Réimprimer le ticket"]').click();
      await p.waitForTimeout(1500);
      ok('A8 vente ' + (type === '1' ? 'VNO' : 'VO') + ' marquée copie : le ticket part par la route d\'impression existante', impressions.length === 1 && impressions[0] === attendu, JSON.stringify(impressions));
      await p.evaluate(() => Ext.ComponentQuery.query('messagebox{isVisible()}').forEach((m) => m.close()));
    }
    ok('A8 aucune erreur JavaScript', erreurs.length === 0, JSON.stringify(erreurs));
  } catch (x) { ok('parcours sans exception', false, x.message); } finally {
    await b.close();
    const echecs = res.filter((x) => !x).length;
    console.log('\n' + (res.length - echecs) + '/' + res.length + ' PASS');
    process.exit(echecs ? 1 : 0);
  }
})();
