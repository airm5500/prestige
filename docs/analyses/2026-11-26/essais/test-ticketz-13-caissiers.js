/* ESSAI DU 26/11 : ecran Ticket Z sur une journee a plus de 10 caissiers (29/10/2026 sur la copie de travail : 13).
 * Lecture seule : aucune donnee posee, rien d'imprime (l'appel d'impression n'est pas lance). */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const path = require('path');
const JOUR = process.env.JOUR_Z || '29/10/2026';
const CAP = process.env.CAPTURES_ESSAI;
const res = [];
function ok(n, c, d) { res.push(!!c); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
(async () => {
  const b = await ENV_E2E.lancer(chromium);
  try {
    for (const taille of [{ width: 1280, height: 600 }, { width: 1600, height: 950 }]) {
      const ctx = await b.newContext({ viewport: taille });
      const p = await ctx.newPage();
      let api = null;
      p.on('response', async (r) => { if (r.url().indexOf('/caisse/fetch-tickez') > 0) { try { api = (await r.json()).data; } catch (e) { /* rien */ } } });
      await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');
      await vues.ouvrirMenu(p, 'GESTION COURANTE', 'Ticket Z');
      await p.waitForSelector('.ticketz-carte, .ticketz-vide', { timeout: 60000 });
      await p.evaluate((d) => { const t = Ext.ComponentQuery.query('ticketzmanager')[0];
        t.down('#dtStart').setValue(Ext.Date.parse(d, 'd/m/Y')); t.down('#dtEnd').setValue(Ext.Date.parse(d, 'd/m/Y')); }, JOUR);
      api = null;
      await p.click('.ticketz .x-btn:has-text("Afficher")');
      await p.waitForFunction(() => document.querySelectorAll('.ticketz-carte').length > 1, null, { timeout: 60000 });
      await p.waitForTimeout(1500);
      const e = await p.evaluate(() => {
        const cartes = Array.from(document.querySelectorAll('.ticketz-carte'));
        const zone = (el) => { while (el && el !== document.body) { const s = getComputedStyle(el); if (/(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 2) { return el; } el = el.parentElement; } return null; };
        const z = zone(cartes[cartes.length - 1]);
        const rogne = cartes.filter((c) => c.scrollWidth > c.clientWidth + 1 || c.scrollHeight > c.clientHeight + 1).length;
        const lignesRognees = Array.from(document.querySelectorAll('.ticketz-carte td, .ticketz-carte th')).filter((c) => c.scrollWidth > c.clientWidth + 1).length;
        let dernierVisible = null;
        if (z) { z.scrollTop = z.scrollHeight; }
        const r = cartes[cartes.length - 1].getBoundingClientRect();
        dernierVisible = r.bottom <= window.innerHeight + 1 && r.top >= 0;
        return { cartes: cartes.length, caissiers: cartes.filter((c) => !c.classList.contains('total')).length, total: cartes.filter((c) => c.classList.contains('total')).length,
          defilement: !!z, hauteur: z ? z.scrollHeight + '/' + z.clientHeight : '', rogne, lignesRognees, dernierVisible,
          lignes: cartes.map((c) => c.querySelectorAll('tr').length) };
      });
      const attendus = api && api.datas ? api.datas.length : -1;
      const t = taille.width + '×' + taille.height;
      ok(t + ' : une carte par caissier (' + attendus + ' rendus par le serveur) et le total général', e.caissiers === attendus && e.total === 1 && attendus >= 10, JSON.stringify(e));
      ok(t + ' : aucune carte ni ligne rognée', e.rogne === 0 && e.lignesRognees === 0, 'cartes ' + e.rogne + ', cellules ' + e.lignesRognees);
      ok(t + ' : la dernière carte (total général) s\'atteint par le défilement', e.dernierVisible === true, 'défilement ' + e.defilement + ' ' + e.hauteur);
      await p.screenshot({ path: path.join(CAP, 'z-ecran-' + taille.width + '-bas.png') });
      if (taille.width === 1600) {
        const [apercu] = await Promise.all([ctx.waitForEvent('page'), p.click('.ticketz .x-btn:has-text("Aperçu")')]);
        await apercu.waitForSelector('.ticketz-carte', { timeout: 15000 });
        const n = await apercu.evaluate(() => document.querySelectorAll('.ticketz-carte:not(.total)').length);
        ok('Aperçu imprimable : les ' + attendus + ' caissiers et le total', n === attendus && await apercu.evaluate(() => document.querySelectorAll('.ticketz-carte.total').length === 1), n);
        await apercu.pdf({ path: path.join(CAP, 'z-apercu.pdf'), format: 'A4' }).catch((x) => console.log('INFO  pdf : ' + x.message.slice(0, 80)));
        await apercu.close();
        console.log('INFO  lignes par caissier (serveur) : ' + api.datas.map((u) => u.modePaymentAmounts.length + u.totaux.length).join(', ') + ' ; total général ' + api.totaux.length);
      }
      await ctx.close();
    }
  } catch (e) { console.log('ERREUR  ' + (e && e.stack || e)); } finally { await b.close(); console.log('\n' + res.filter(Boolean).length + '/' + res.length); }
})();
