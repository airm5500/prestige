/* STYLE DU MENU VENTE sur les anciens ecrans (demande de l'officine du 30/09) : lot 1, preventes et devis.
 *
 * L'habillage (correctifs-affichage.js, habillerStyleVente) ne doit toucher qu'a la presentation. Le test pose une
 * proforma et une prevente de test, ouvre chaque ecran par son menu et verifie : fond et barre du theme, pagination
 * numerotee, icones au trait, et surtout qu'un clic sur chaque icone emet TOUJOURS le meme evenement vers le
 * controleur (capture sans executer l'action). Jeu d'essai retire a la fin.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const crees = [];

/* Ecrans du lot : xtype, evenements attendus des icones de la ligne de test (dans l'ordre des colonnes). */
const ECRANS = [
  { xtype: 'preenregistrementmanager', evenements: ['toEdit', 'toPrint', 'toRemove'], ligne: 'prevente' },
  { xtype: 'devismanager', evenements: ['toTransform', 'toClone', 'toEdit', 'toRemove', 'toPrintTicket', 'toPdf', 'toBonPdf', 'toExportCsv', 'toExportWord', 'toExportExcel', 'toInventaireFromOneDevis'], ligne: 'devis' }
];

(async () => {
  const produit = q("SELECT CONCAT_WS('|', f.lg_FAMILLE_ID, f.int_PRICE) FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID=f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID='1'"
    + " WHERE s.int_NUMBER_AVAILABLE>10 AND f.int_PRICE>0 AND f.str_STATUT='enable' ORDER BY f.str_NAME LIMIT 1").split('|');
  const user = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='admin'");
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } });
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(2000);
    const poster = (url, corps) => p.evaluate(async (a) => JSON.parse(await (await fetch(a.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(a.corps) })).text()), { url, corps });
    const base = { typeVenteId: '1', natureVenteId: '1', produitId: produit[0], itemPu: Number(produit[1]), qte: 1, qteServie: 1, remiseId: '', venteId: null, userVendeurId: user };
    const devis = (await poster('../api/v1/vente/devis', Object.assign({}, base, { devis: true, prevente: false }))).data.lgPREENREGISTREMENTID; crees.push(devis);
    const prevente = (await poster('../api/v1/vente/add/vno', Object.assign({}, base, { devis: false, prevente: true }))).data.lgPREENREGISTREMENTID; crees.push(prevente);
    const refs = { devis: q("SELECT str_REF FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID='" + devis + "'"), prevente: q("SELECT str_REF FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID='" + prevente + "'") };
    ok('Jeu d\'essai : une proforma et une prévente', !!refs.devis && !!refs.prevente, JSON.stringify(refs));

    for (const e of ECRANS) {
      await p.evaluate((x) => { testextjs.app.getController('App').onLoadNewComponent(x, x, ''); }, e.xtype);
      await p.waitForFunction((x) => { const c = Ext.ComponentQuery.query(x)[0]; return c && c.down('gridpanel') && c.down('gridpanel').rendered; }, e.xtype, { timeout: 30000 });
      await p.waitForTimeout(1500);
      /* la ligne de test, cherchee par sa reference comme l'utilisateur */
      await p.evaluate((a) => { const c = Ext.ComponentQuery.query(a.x)[0]; c.down('#query').setValue(a.ref); const s = c.down('#statut'); if (s) { s.setValue('ALL'); } const bt = c.down('#rechercher'); bt.fireEvent('click', bt); }, { x: e.xtype, ref: refs[e.ligne] });
      await p.waitForFunction((a) => { const g = Ext.ComponentQuery.query(a.x + ' gridpanel')[0]; return !g.getStore().isLoading() && g.getStore().findExact('strREF', a.ref) >= 0; }, { x: e.xtype, ref: refs[e.ligne] }, { timeout: 20000 });
      await p.waitForTimeout(500);
      const d = await p.evaluate((a) => { const c = Ext.ComponentQuery.query(a.x)[0]; const g = c.down('gridpanel'); const n = g.getView().getNode(g.getStore().findExact('strREF', a.ref));
        const barres = c.query('toolbar').filter((t) => t.hasCls('mv-barre'));
        return { theme: c.hasCls('theme-liste'), barre: barres.length, grille: g.hasCls('theme-grille'), pages: !!c.down('#pagesNumerotees'),
          icones: [...n.querySelectorAll('.act-ico')].filter((i) => i.offsetParent !== null).length, images: [...n.querySelectorAll('img.x-action-col-icon')].filter((i) => i.offsetParent !== null && !i.classList.contains('act-ico')).length,
          deborde: barres.some((t) => [...t.getEl().dom.querySelectorAll('.x-btn, .x-form-text')].some((x) => x.getBoundingClientRect().right > t.getEl().getRight() + 1)) }; }, { x: e.xtype, ref: refs[e.ligne] });
      ok(e.xtype + ' : fond et barre du thème, tableau, pagination numérotée, sans débordement', d.theme && d.barre >= 1 && d.grille && d.pages && !d.deborde, JSON.stringify(d));
      ok(e.xtype + ' : toutes les icônes de la ligne au trait (' + e.evenements.length + ')', d.icones === e.evenements.length && d.images === 0, JSON.stringify(d));
      /* chaque icone : l'evenement emis est capture (et annule) pour verifier le branchement sans executer l'action */
      const emis = await p.evaluate(async (a) => { const c = Ext.ComponentQuery.query(a.x)[0]; const g = c.down('gridpanel'); const vus = [];
        g.query('actioncolumn').forEach((col) => Ext.util.Observable.capture(col, (nom) => { if (/^to/.test(nom)) { vus.push(nom); return false; } return true; }));
        const n = g.getView().getNode(g.getStore().findExact('strREF', a.ref));
        for (const i of [...n.querySelectorAll('.act-ico')].filter((x) => x.offsetParent !== null)) { i.dispatchEvent(new MouseEvent('click', { bubbles: true })); await new Promise((r) => setTimeout(r, 50)); }
        g.query('actioncolumn').forEach((col) => Ext.util.Observable.releaseCapture(col));
        return vus; }, { x: e.xtype, ref: refs[e.ligne] });
      ok(e.xtype + ' : chaque icône émet le même événement qu\'avant vers le contrôleur', JSON.stringify(emis) === JSON.stringify(e.evenements), emis.join(','));
      await p.screenshot({ path: '/home/user/prestige/captures/style-' + e.xtype + '.png' });
    }
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (ex) {
    ok('Parcours sans exception', false, ex.message);
  } finally {
    await b.close();
    for (const id of crees) {
      exec("DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID='" + id + "'; DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID='" + id + "';");
    }
    ok('Jeu d\'essai retiré', crees.every((id) => q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID='" + id + "'") === '0'));
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
