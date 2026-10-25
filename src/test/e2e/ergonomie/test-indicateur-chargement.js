/* INDICATEUR DE CHARGEMENT (retours du 13/10, points 8 et 9). Par l'ecran, admin.
 *  - Articles invendus, « Exporter » : le bouton montre aussitot une roue et le temps ecoule, une fine barre court en
 *    haut de l'ecran ; le fichier arrive (telechargement), le bouton dit « Fichier prêt » puis reprend son libelle ;
 *  - Previsions, « Recalculer maintenant » : meme indicateur pendant le calcul, puis « Prévisions recalculées » ;
 *  - aucune fenetre surgissante, aucune erreur JavaScript.
 * Le recalcul des previsions ecrit le calcul du jour (comme la tache de nuit) : rien a retirer.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }

(async () => {
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const err = [], dialogues = [];
  try {
    const ctx = await b.newContext({ viewport: { width: 1600, height: 950 }, acceptDownloads: true });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => err.push(e.message));
    p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
    const etat = (sel) => p.evaluate((sel) => { const btn = Ext.ComponentQuery.query(sel)[0]; const barre = document.getElementById('pr-barre-chargement');
      return { texte: btn.getEl().dom.innerText.replace(/\s+/g, ' ').trim(), roue: !!btn.getEl().dom.querySelector('.pr-roue'), inactif: btn.isDisabled(),
        barre: !!barre && barre.style.display === 'block', boite: Ext.ComponentQuery.query('messagebox').some((m) => m.isVisible()) }; }, sel);

    /* 1. export des invendus (periode d'un jour : beaucoup d'articles) */
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('stockmort', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('stockmort #btnExportExcel').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    const libelle = (await etat('stockmort #btnExportExcel')).texte;
    const telechargement = p.waitForEvent('download', { timeout: 120000 });
    await p.evaluate(() => Ext.ComponentQuery.query('stockmort #btnExportExcel')[0].btnEl.dom.click());
    await p.waitForTimeout(150);
    let e = await etat('stockmort #btnExportExcel');
    ok('Export : le bouton montre aussitôt une roue et le travail en cours, et ne se relance pas', e.roue && e.inactif && /Préparation/.test(e.texte), JSON.stringify(e));
    ok('Export : une barre de progression court en haut de l\'écran', e.barre, JSON.stringify(e));
    const fichier = await telechargement;
    ok('Export : le fichier arrive', /\.(xls|xlsx)$/i.test(fichier.suggestedFilename()), fichier.suggestedFilename());
    await p.waitForFunction(() => /prêt/.test(Ext.ComponentQuery.query('stockmort #btnExportExcel')[0].getEl().dom.innerText), null, { timeout: 10000 }).catch(() => {});
    e = await etat('stockmort #btnExportExcel');
    ok('Export : le bouton dit que le fichier est prêt, la barre disparaît', /Fichier prêt/.test(e.texte) && !e.roue && !e.inactif && !e.barre, JSON.stringify(e));
    await p.waitForTimeout(3000);
    ok('Export : le bouton reprend son libellé', (await etat('stockmort #btnExportExcel')).texte === libelle, (await etat('stockmort #btnExportExcel')).texte + ' / ' + libelle);

    /* 2. recalcul des previsions */
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('analysecommande', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('analysecommande #btnRecalculer').length > 0, null, { timeout: 30000 });
    await p.evaluate(() => { const c = Ext.ComponentQuery.query('analysecommande')[0]; const t = c.down('#ongletTableau'); if (t && t.up('tabpanel')) { t.up('tabpanel').setActiveTab(t); } });
    await p.waitForTimeout(1000);
    await p.evaluate(() => Ext.ComponentQuery.query('analysecommande #btnRecalculer')[0].btnEl.dom.click());
    await p.waitForTimeout(150);
    e = await etat('analysecommande #btnRecalculer');
    ok('Prévisions : roue, travail en cours et barre pendant le calcul', e.roue && e.inactif && /Calcul des prévisions/.test(e.texte) && e.barre, JSON.stringify(e));
    await p.waitForTimeout(2600);
    e = await etat('analysecommande #btnRecalculer');
    ok('Prévisions : le temps écoulé s\'affiche pendant un calcul long', !e.roue || / \d+ s$/.test(e.texte), e.texte);
    await p.waitForFunction(() => /recalculées|Échec|répondu/.test(Ext.ComponentQuery.query('analysecommande #btnRecalculer')[0].getEl().dom.innerText), null, { timeout: 300000 });
    e = await etat('analysecommande #btnRecalculer');
    ok('Prévisions : le bouton dit comment le calcul s\'est terminé', /Prévisions recalculées/.test(e.texte) && !e.barre, JSON.stringify(e));
    ok('Aucune fenêtre surgissante', dialogues.length === 0 && !e.boite, dialogues.join(' | '));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Déroulé sans erreur', false, x.message);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
  process.exit(ko ? 1 : 0);
})();
