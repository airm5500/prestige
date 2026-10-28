/* POINT 10 DU 28/10. Lecture seule, compte e2e. « VNO » devient « COMPTANT » et « VO » devient « ASSURANCE » a l'affichage :
 *  - « Ventes terminées », colonne « Type.Vente » (30 derniers jours) ;
 *  - « Liste de caisse » et « Visualisation de caisse », colonne « Type Mouvement » ;
 *  - aucune cellule ne montre plus « VNO » ni « VO » seuls ; les valeurs des enregistrements ne changent pas (filtres) ;
 *  - aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { connexion } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  /* textes affiches d'une colonne et valeurs brutes de son champ */
  const colonne = (xtype, itemId) => p.evaluate((a) => {
    const g = Ext.ComponentQuery.query(a.x + ' gridpanel').find((x) => x.down('#' + a.i));
    if (!g) { return null; }
    const c = g.down('#' + a.i), v = g.getView(), textes = [], brutes = [];
    g.getStore().each((r) => { const n = v.getCell(r, c); if (n) { textes.push(n.dom.innerText.trim()); } brutes.push(r.get(c.dataIndex)); });
    return { textes, brutes };
  }, { x: xtype, i: itemId });
  const ouvrir = async (xtype, titre) => {
    await p.evaluate((a) => testextjs.app.getController('App').onLoadNewComponent(a.x, a.t, ''), { x: xtype, t: titre });
    await p.waitForFunction((x) => { const g = Ext.ComponentQuery.query(x + ' gridpanel')[0]; return g && g.isVisible(true) && !g.getStore().isLoading(); }, xtype, { timeout: 60000 });
    await p.waitForTimeout(1500);
  };
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrir('ventemanager', 'Ventes terminées');
    await p.evaluate(() => {
      const d = new Date(); d.setDate(d.getDate() - 30);
      Ext.ComponentQuery.query('ventemanager #dtStart')[0].setValue(d);
      testextjs.app.getController('VenteFinisCtr').doSearch();
    });
    await p.waitForFunction(() => !Ext.ComponentQuery.query('ventemanager gridpanel')[0].getStore().isLoading(), null, { timeout: 120000 });
    await p.waitForTimeout(1000);
    let c = await colonne('ventemanager', 'colTypeVente');
    ok('Ventes terminées : des ventes VNO ou VO dans la liste', c && c.brutes.some((x) => x === 'VNO' || x === 'VO'), c && [...new Set(c.brutes)].join(','));
    ok('Ventes terminées : « COMPTANT » / « ASSURANCE » affichés, plus « VNO » / « VO »', c && c.textes.length > 0
      && !c.textes.some((t) => /\bVNO\b|\bVO\b/.test(t)) && c.textes.every((t, i) => c.brutes[i] !== 'VNO' || t === 'COMPTANT') && c.textes.every((t, i) => c.brutes[i] !== 'VO' || t === 'ASSURANCE'),
    c && [...new Set(c.textes)].join(','));
    for (const [x, t] of [['listecaissemanager', 'Liste de caisse'], ['visualisercaissemanager', 'Visualisation de caisse']]) {
      await ouvrir(x, t);
      c = await colonne(x, 'colTypeMouvement');
      ok(t + ' : colonne « Type Mouvement » sans « VNO » / « VO »', c && !c.textes.some((v) => /\bVNO\b|\bVO\b/.test(v)), c && [...new Set(c.textes)].join(',') + ' / brutes ' + [...new Set(c.brutes)].join(','));
    }
    ok('Libellés : VNO → COMPTANT, VO → ASSURANCE, ventes N.O. → Ventes comptant, ventes ordonnancees → Ventes assurance',
      await p.evaluate(() => ['VNO', 'VO', 'ventes N.O.', 'ventes ordonnancees', 'Reglements differes'].map((v) => PrestigeLibelleVente.libelle(v)).join('|'))
        === 'COMPTANT|ASSURANCE|Ventes comptant|Ventes assurance|Reglements differes');
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
