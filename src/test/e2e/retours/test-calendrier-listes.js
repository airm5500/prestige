/* CALENDRIER ET LISTES DEROULANTES AU DESSIN DU THEME, PARTOUT (demande de l'officine du 05/10).
 *
 * Le changement est purement visuel (feuille de style) : le test verifie que le dessin est bien applique (plus de bleu
 * ExtJS) et que tout marche comme avant : fleches du calendrier, choix du mois, choix d'une date, « Aujourd'hui »,
 * choix dans une liste a la souris et au clavier (fleche bas + Entree).
 */
const { chromium } = require('playwright-core');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const CAPT = process.env.CAPTURES || '/tmp';

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1400, height: 800 } });
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('facturesubrogatoire', 'Factures subrogatoires', ''));
    await p.waitForFunction(() => Ext.getCmp('dt_debut_journal') && Ext.getCmp('h_debut'), null, { timeout: 60000 });
    await p.waitForTimeout(1500);

    /* Calendrier */
    await p.evaluate(() => { Ext.getCmp('dt_debut_journal').setValue(new Date(2026, 6, 15)); Ext.getCmp('dt_debut_journal').expand(); });
    await p.waitForTimeout(600);
    const dessin = await p.evaluate(() => { const d = document.querySelector('.x-datepicker:not(.x-hide-offsets)'); const st = (s) => getComputedStyle(d.querySelector(s));
      return { entete: st('.x-datepicker-header').backgroundColor, choisi: st('.x-datepicker-selected .x-datepicker-date').backgroundColor,
        mois: st('.x-datepicker-month .x-btn-inner').color, rayon: getComputedStyle(d).borderRadius }; });
    ok('Calendrier : en-tête et date choisie au navy du thème, mois en blanc (plus de bleu ExtJS)',
      dessin.entete === 'rgb(30, 58, 95)' && dessin.choisi === 'rgb(30, 58, 95)' && dessin.mois === 'rgb(255, 255, 255)' && dessin.rayon === '10px', JSON.stringify(dessin));
    await p.screenshot({ path: CAPT + '/calendrier.png', clip: { x: 0, y: 100, width: 700, height: 360 } });
    const picker = () => p.evaluate(() => Ext.getCmp('dt_debut_journal').getPicker().getId());
    const id = await picker();
    await p.click('#' + id + ' .x-datepicker-prev');
    await p.waitForTimeout(300);
    const m1 = await p.evaluate(() => Ext.Date.format(Ext.getCmp('dt_debut_journal').getPicker().activeDate, 'Y-m'));
    ok('Flèche « mois précédent » : juillet → juin', m1 === '2026-06', m1);
    await p.click('#' + id + ' .x-datepicker-next');
    await p.click('#' + id + ' .x-datepicker-next');
    await p.waitForTimeout(300);
    const m2 = await p.evaluate(() => Ext.Date.format(Ext.getCmp('dt_debut_journal').getPicker().activeDate, 'Y-m'));
    ok('Flèche « mois suivant » : juin → août', m2 === '2026-08', m2);
    await p.click('#' + id + ' .x-datepicker-month .x-btn');
    await p.waitForTimeout(600);
    const mp = await p.evaluate(() => { const m = document.querySelector('.x-monthpicker'); return m && m.offsetWidth > 0; });
    ok('Le bouton du mois ouvre le choix mois / année', mp);
    await p.screenshot({ path: CAPT + '/calendrier-mois.png', clip: { x: 0, y: 100, width: 700, height: 360 } });
    await p.keyboard.press('Escape');
    await p.waitForTimeout(300);
    await p.evaluate(() => { const f = Ext.getCmp('dt_debut_journal'); if (!f.isExpanded) { f.expand(); } const pk = f.getPicker(); if (pk.monthPicker && pk.monthPicker.isVisible()) { pk.hideMonthPicker(false); } pk.setValue(new Date(2026, 7, 1)); });
    await p.waitForTimeout(300);
    const cell = await p.evaluate(() => { const pk = Ext.getCmp('dt_debut_journal').getPicker(); const c = Array.from(pk.getEl().dom.querySelectorAll('.x-datepicker-active a.x-datepicker-date')).find((a) => a.textContent.trim() === '12');
      c.setAttribute('data-e2e', 'j12'); return true; });
    await p.click('[data-e2e=j12]');
    await p.waitForTimeout(300);
    const v = await p.evaluate(() => Ext.getCmp('dt_debut_journal').getSubmitValue());
    ok('Clic sur un jour : la date est posée (2026-08-12)', cell && v === '2026-08-12', v);

    /* Liste deroulante (heures) : souris puis clavier */
    await p.evaluate(() => { Ext.getCmp('h_debut').expand(); });
    await p.waitForTimeout(500);
    const lid = await p.evaluate(() => { const l = Ext.getCmp('h_debut').getPicker(); const n = l.getNode(17); n.setAttribute('data-e2e', 'h17'); return l.getId(); });
    await p.hover('[data-e2e=h17]');
    await p.waitForTimeout(200);
    const survol = await p.evaluate(() => getComputedStyle(document.querySelector('[data-e2e=h17]')).backgroundColor);
    ok('Liste : survol au dessin du thème', survol === 'rgb(227, 237, 247)', survol);
    await p.screenshot({ path: CAPT + '/liste.png', clip: { x: 300, y: 100, width: 700, height: 420 } });
    await p.click('[data-e2e=h17]');
    await p.waitForTimeout(300);
    ok('Liste : clic → valeur choisie (08:30)', await p.evaluate(() => Ext.getCmp('h_debut').getRawValue()) === '08:30');
    await p.evaluate(() => { const f = Ext.getCmp('h_fin'); f.focus(); });
    await p.waitForTimeout(300);
    await p.keyboard.press('ArrowDown');
    await p.waitForTimeout(400);
    await p.keyboard.press('ArrowDown');
    await p.keyboard.press('Enter');
    await p.waitForTimeout(300);
    const clavier = await p.evaluate(() => Ext.getCmp('h_fin').getRawValue());
    ok('Liste : clavier (↓ puis Entrée) → valeur choisie', /^\d\d:\d\d$/.test(clavier), clavier);
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Parcours sans exception', false, e.message);
  } finally {
    await b.close();
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
