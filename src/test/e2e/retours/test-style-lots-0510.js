/* NOUVEAU DESIGN SUR LES ECRANS LISTES PAR L'OFFICINE LE 05/10, par lots (LOT=A|B|C|D, ou tous).
 *
 * L'habillage (correctifs-affichage.js, habillerStyleVente) ne touche qu'a la presentation. Pour chaque ecran, le test
 * l'ouvre une fois SANS habillage puis une fois habille et compare : memes composants nommes (itemId), meme
 * configuration des icones d'action (fonctions, info-bulles, masquage), et sur la premiere ligne, memes icones et memes
 * evenements emis vers le controleur (captures et annules : aucune action n'est executee). Il verifie aussi le dessin
 * (fond, barres, tableau, pagination numerotee, icones au trait), l'absence de debordement et d'erreur JavaScript, et
 * prend une capture de chaque ecran. Seule la recherche de l'ecran est lancee (lecture).
 */
const { chromium } = require('playwright-core');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const CAPT = process.env.CAPTURES || '/tmp';

const LOTS = {
  A: ['facturemanager', 'listecaissemanager', 'visualisercaissemanager', 'caisserecetterecap', 'facturesubrogatoire', 'delayed',
    'factureprovisoire', 'groupeInvoices', 'recapOrganisme', 'modelfacture', 'modelfacturedynamique', 'factureenattenteedition'],
  B: ['promotionhistorymanager', 'promotionmanager', 'logfile', 'ventesmodifieesmanager', 'tierspayantmanager', 'clientmanager',
    'groupetierspayant', 'reglementdepot', 'balanceagee', 'balanceagee_detail', 'remisemanager', 'suiviremise'],
  C: ['etatscontrolemanager', 'bonlivraisonmanager', 'i_order_manager', 'retourfrsmanager', 'detailsmanager', 'ajustementmanager',
    'inventaire', 'peremptionquery', 'monitoringarticlecomplet', 'etatstock', 'evaluationventemoyenne', 'reservemanager', 'saisieperime',
    'gestionsurstock', 'i_sugg_manager'],
  D: ['info_officine', 'parametermanager', 'grossistemanager', 'smsfournisseur', 'dcimanager', 'cazonegeomanager', 'gardemanager',
    'tvastat', 'margeproducts', 'abcmanager', 'feuilledematch', 'recap', 'usermanager', 'rolemanager', 'myaccountmanager',
    'menunotification', 'evolutionstock', 'stockmort', 'articlemvtgrid']
};
const ECRANS = process.env.LOT ? process.env.LOT.split(',').map((l) => LOTS[l]).flat() : [].concat(...Object.values(LOTS));

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } });
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(2000);
    const releve = (x, habille) => p.evaluate(async (a) => {
      const liste = window.PrestigeAffichage.ECRANS_STYLE_VENTE, garde = liste.slice();
      if (!a.habille) { liste.length = 0; }
      try {
        Ext.ComponentQuery.query(a.x).forEach((c) => c.destroy());
        testextjs.app.getController('App').onLoadNewComponent(a.x, a.x, '');
      } finally { liste.length = 0; garde.forEach((y) => liste.push(y)); }
      const attendre = async (f, ms) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (f()) { return true; } } catch (e) { /* pas encore */ } await new Promise((r) => setTimeout(r, 200)); } return false; };
      await attendre(() => { const c = Ext.ComponentQuery.query(a.x)[0]; return c && c.rendered; }, 30000);
      await new Promise((r) => setTimeout(r, 1500));
      const c = Ext.ComponentQuery.query(a.x)[0];
      if (!c) { return { absent: true }; }
      const g = c.isXType('gridpanel') ? c : c.down('gridpanel');
      if (g && g.getStore && g.getStore().isLoading()) { await attendre(() => !g.getStore().isLoading(), 60000); }
      await new Promise((r) => setTimeout(r, 600));
      const n = g && g.getView && g.getView().getNode(0);
      const barres = c.query('toolbar').filter((t) => t.hasCls('mv-barre'));
      const sortie = { lignes: g && g.getStore ? g.getStore().getCount() : -1, grille: !!g, theme: c.hasCls('theme-liste'), barres: barres.length,
        /* barres de pagination affichees : chacune doit porter les numeros (ceux d'un onglet cache se dessinent a son affichage) */
        pages: c.query('pagingtoolbar').filter((y) => y.rendered && y.child('#pagesNumerotees')).length, barresPages: c.query('pagingtoolbar').filter((y) => y.rendered).length,
        /* les intercalaires vides (item sans icone ni info-bulle : image transparente) ne comptent pas */
        images: n ? [...n.querySelectorAll('img.x-action-col-icon')].filter((i) => i.offsetParent !== null && !i.classList.contains('act-ico')
          && !(/^data:image\/gif/.test(i.getAttribute('src') || '') && !i.getAttribute('data-qtip') && i.className.trim().split(/\s+/).length <= 2)).length : -1,
        traits: n ? [...n.querySelectorAll('.act-ico')].filter((i) => i.offsetParent !== null).length : -1,
        deborde: barres.filter((t) => t.rendered && t.isVisible(true)).some((t) => [...t.getEl().dom.querySelectorAll('.x-btn, .x-form-text')].filter((x) => x.offsetParent !== null).some((x) => x.getBoundingClientRect().right > t.getEl().getRight() + 1)),
        config: c.query('actioncolumn').map((col) => (col.items || []).map((it) => (it.tooltip || '') + ' | ' + (it.handler ? String(it.handler).replace(/\s+/g, ' ').slice(0, 160) : '') + ' | ' + (it.getClass ? 'getClass' : '')).join(' / ')),
        itemIds: c.query('[itemId]').map((y) => y.itemId).filter((i) => !/^pagesNumerotees$/.test(i)).sort().join(','),
        boutons: c.query('button').map((y) => (y.text || y.tooltip || '') + (y.hidden ? '(cache)' : '')).join('|'),
        icones: [], evenements: [] };
      if (n) {
        g.query('actioncolumn').forEach((col) => Ext.util.Observable.capture(col, (nom, v, ri, ci, item) => { sortie.evenements.push(nom + (item && item.action ? ':' + item.action : '')); return false; }));
        for (const col of g.query('actioncolumn')) {
          const cell = n.querySelector('.x-grid-cell-' + col.getItemId());
          for (let i = 0; cell && i < (col.items || []).length; i++) {
            const el = cell.querySelector('.x-action-col-' + i);
            if (!el || el.offsetParent === null || el.classList.contains('x-hide-display')) { continue; }
            const item = col.items[i];
            const code = item.handler ? String(item.handler).replace(/\s+/g, ' ') : '';
            sortie.icones.push((item.tooltip || item.altText || '') + ' | ' + code.slice(0, 160));
            if (!item.handler || /this\.fireEvent/.test(code)) { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); await new Promise((r) => setTimeout(r, 50)); }
          }
        }
        g.query('actioncolumn').forEach((col) => Ext.util.Observable.releaseCapture(col));
      }
      return sortie;
    }, { x, habille });

    for (const x of ECRANS) {
      const e0 = err.length;
      const avant = await releve(x, false);
      const apres = await releve(x, true);
      await p.screenshot({ path: CAPT + '/design-' + x + '.png' });
      if (avant.absent || apres.absent) { ok(x + ' : écran ouvert', false, JSON.stringify({ avant, apres })); continue; }
      ok(x + ' : habillé (fond, barres du thème, pagination numérotée), sans débordement', !avant.theme && apres.theme && (apres.barres >= 1 || avant.barres === 0)
        && apres.pages === apres.barresPages && !apres.deborde, JSON.stringify({ barres: apres.barres, pages: apres.pages, barresPages: apres.barresPages, deborde: apres.deborde }));
      ok(x + ' : mêmes composants nommés et mêmes boutons qu\'avant', apres.itemIds === avant.itemIds && apres.boutons === avant.boutons,
        apres.itemIds === avant.itemIds ? 'boutons avant ' + avant.boutons + ' / après ' + apres.boutons : 'itemId avant ' + avant.itemIds + ' / après ' + apres.itemIds);
      ok(x + ' : icônes d\'action : même configuration, même fonction, même événement' + (apres.lignes > 0 ? ' (sur une ligne)' : ' (sans ligne sur le banc)'),
        JSON.stringify(apres.config) === JSON.stringify(avant.config) && JSON.stringify(apres.icones) === JSON.stringify(avant.icones)
        && JSON.stringify(apres.evenements) === JSON.stringify(avant.evenements) && (apres.lignes <= 0 || (apres.images === 0 && apres.traits >= avant.images) || avant.images === 0),
        'avant ' + avant.images + ' images / après ' + apres.traits + ' traits ' + apres.images + ' images ; ' + avant.evenements.join(',') + ' / ' + apres.evenements.join(','));
      ok(x + ' : aucune erreur JavaScript', err.length === e0, JSON.stringify(err.slice(e0)));
    }
  } catch (ex) {
    ok('Parcours sans exception', false, ex.message);
  } finally {
    await b.close();
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
