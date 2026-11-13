/* DEMANDE DU 13/11 (captures « Paramétrage général », « Ventes terminées », « Campagnes ») : ECRAN RABATTU.
 *
 * Symptome : l'ecran (ou le panneau central) ne va plus qu'a ~85 % de la largeur, une bande vide reste a droite, et
 * il y reste apres les gestes suivants. La veille de geometrie ne mesurait qu'a l'ouverture d'un ecran et quand un
 * conteneur changeait de taille : un rabattement survenu apres un geste n'etait jamais corrige.
 * La cause premiere n'est pas reproduite au banc ; le test place l'ecran dans l'etat des captures (largeur figee a
 * 85 %), puis fait un geste ordinaire (clic sur « rechercher ») et verifie que l'ecran reprend toute la largeur :
 *   1. ecran « Ventes terminées » rabattu a 85 % -> apres le clic : >= 97 % de la largeur disponible ;
 *   2. panneau central rabattu a 85 % de la fenetre -> apres le clic : jusqu'au bord droit ;
 *   3. le recalage est trace dans PrestigeGeometrie.journal (ce que le support pourra lire) ;
 *   4. barre de « Ventes terminées » a 1280 et a 1366 : dates et heures lisibles en entier (« 13/11/2C » sur les
 *      captures), liste « Nature.vente » utilisable (« Selectic »), aucun element de la barre coupe a droite ;
 *   5. sans rabattement, un geste ne declenche aucun recalage (journal inchange) ; aucune erreur JavaScript.
 * Ecran en lecture seule : aucune donnee ecrite.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const V = require('../outils/vues');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }

const mesure = () => {
  const vp = Ext.ComponentQuery.query('viewport')[0], c = vp.down('[region=center]'), e = c.items.items.filter((x) => x.isVisible())[0];
  const rc = c.el.dom.getBoundingClientRect(), re = e.el.dom.getBoundingClientRect();
  return { fenetre: document.documentElement.clientWidth, centreDroite: Math.round(rc.right), dispo: c.body.getWidth(true), ecran: Math.round(re.width),
    journal: (window.PrestigeGeometrie && window.PrestigeGeometrie.journal || []).length };
};

(async () => {
  let b = null;
  const err = [];
  try {
    b = await ENV_E2E.lancer(chromium);
    const p = await (await b.newContext({ viewport: { width: 1280, height: 640 } })).newPage();
    p.on('pageerror', (e) => err.push(e.message));
    await V.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const menu = await p.evaluate(() => { let n = null; Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().cascadeBy((x) => {
      if (!n && x.isLeaf() && /ventes? termin/i.test((x.get('text') || '').replace(/<[^>]+>/g, ''))) { n = x; } }); return n ? [n.parentNode.get('text'), n.get('text')] : null; });
    ok('Précondition : menu « Ventes terminées » accessible', !!menu, JSON.stringify(menu));
    await V.ouvrirMenu(p, menu[0], menu[1]);
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('ventemanager')[0]; const gr = g && g.down('gridpanel'); return g && g.rendered && gr && !gr.getStore().isLoading(); }, null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    const rech = await p.evaluate(() => Ext.ComponentQuery.query('ventemanager')[0].down('#rechercher').getId());
    const geste = async () => { await p.click('#' + rech); await p.waitForTimeout(2500); };

    const m0 = await p.evaluate(mesure);
    ok('Départ : écran sur toute la largeur disponible', m0.ecran >= m0.dispo * 0.97 && m0.centreDroite >= m0.fenetre - 2, JSON.stringify(m0));

    /* 5. sans rabattement : aucun recalage */
    await geste();
    const m1 = await p.evaluate(mesure);
    ok('Sans rabattement : un geste ne recale rien (journal inchangé)', m1.journal === m0.journal && m1.ecran === m0.ecran, JSON.stringify(m1));

    /* 1. ecran rabattu a 85 % puis geste */
    /* etat mesure en section 5 de correctifs-affichage.js : l'element a une largeur reduite, la memoire de mise en page
       d'ExtJS (lastBox) garde l'ancienne ; ExtJS, « convaincu que rien n'a change », ne la corrige plus seul */
    await p.evaluate(() => { const e = Ext.ComponentQuery.query('ventemanager')[0], c = e.ownerCt; e.el.dom.style.width = Math.round(c.body.getWidth(true) * 0.85) + 'px'; });
    await p.waitForTimeout(800);
    const m2 = await p.evaluate(mesure);
    ok('Mise en état des captures : écran à 85 % (bande vide à droite)', m2.ecran < m2.dispo * 0.88, JSON.stringify(m2));
    await geste();
    const m3 = await p.evaluate(mesure);
    ok('1. Après un clic sur « rechercher » : l\'écran reprend toute la largeur', m3.ecran >= m3.dispo * 0.97, JSON.stringify(m3));
    ok('3. Recalage tracé dans le journal de géométrie', m3.journal > m2.journal, JSON.stringify(await p.evaluate(() => (window.PrestigeGeometrie.journal || []).slice(-1)[0])));

    /* 2. panneau central rabattu a 85 % de la fenetre puis geste */
    await p.evaluate(() => { const c = Ext.ComponentQuery.query('viewport')[0].down('[region=center]'); c.el.dom.style.width = Math.round(document.documentElement.clientWidth * 0.85) + 'px'; });
    await p.waitForTimeout(800);
    const m4 = await p.evaluate(mesure);
    ok('Mise en état des captures : panneau central à 85 % de la fenêtre', m4.fenetre - m4.centreDroite > 100, JSON.stringify(m4));
    await geste();
    const m5 = await p.evaluate(mesure);
    ok('2. Après un clic : le panneau central va jusqu\'au bord droit, l\'écran le remplit', m5.fenetre - m5.centreDroite <= 2 && m5.ecran >= m5.dispo * 0.97, JSON.stringify(m5));

    /* 4. barre lisible a 1280 et 1366 */
    for (const largeur of [1280, 1366]) {
      await p.setViewportSize({ width: largeur, height: 640 });
      await p.waitForTimeout(1800);
      const barre = await p.evaluate(() => {
        const e = Ext.ComponentQuery.query('ventemanager')[0], champs = ['#dtStart', '#dtEnd', '#hStart', '#hEnd'].map((s) => e.down(s));
        const lisible = champs.map((f) => ({ v: f.inputEl.dom.value, entier: f.inputEl.dom.scrollWidth <= f.inputEl.dom.clientWidth + 1 }));
        const tb = e.down('#dtStart').up('toolbar'), droite = tb.el.dom.getBoundingClientRect().right;
        const coupes = tb.items.items.filter((x) => x.isVisible() && x.el && x.el.dom.getBoundingClientRect().right > droite + 1).map((x) => x.itemId || x.xtype);
        const nature = e.down('#nature').inputEl.dom.clientWidth;
        return { lisible, coupes, nature };
      });
      ok(`4. ${largeur} px : dates et heures lisibles en entier`, barre.lisible.every((x) => x.entier && x.v.length >= 5), JSON.stringify(barre.lisible));
      ok(`4. ${largeur} px : aucun élément de la barre coupé à droite`, barre.coupes.length === 0, barre.coupes.join(','));
      ok(`4. ${largeur} px : la liste « Nature.vente » a une vraie zone de saisie (« Selectic » sur les captures)`, barre.nature >= 80, barre.nature);
    }
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    if (b) { await b.close(); }
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
