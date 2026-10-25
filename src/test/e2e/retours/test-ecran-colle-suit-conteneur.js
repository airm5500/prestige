/* ECRAN COLLE QUI SE RETRACTE DANS LE CONTENEUR DU MILIEU (retour du 25/10, videoprojecteur).
 *
 * L'en-tete garde toute la largeur quelle que soit la taille de l'ecran ; l'ecran « colle » du conteneur du milieu,
 * lui, se retractait. L'en-tete est dimensionne par la mise en page d'ExtJS a chaque passage ; l'ecran colle l'etait
 * par notre code, sur des evenements de redimensionnement : qu'un seul manque (resolution changee par un
 * videoprojecteur sans avis au navigateur) et il gardait l'ancienne taille.
 * Par les vues (admin), ANALYSE DE GESTION > Activité des équipes (ecran colle) :
 *  - l'avis de redimensionnement du conteneur du milieu est perdu, puis la fenetre passe de 1280 a 1024, 1600 et
 *    800 px de large : l'ecran a toujours la largeur et la hauteur du conteneur (comme l'en-tete, qui suit la fenetre), sans defilement global ;
 *  - ecran derange (largeur faussee) puis mise en page sans changement de fenetre : il reprend la taille du conteneur ;
 *  - menu de navigation ouvert puis referme : l'ecran garde la largeur du conteneur ;
 *  - un ecran non colle ouvert ensuite (tableau de bord) garde sa presentation habituelle (pas etire par le conteneur) ;
 *  - aucune erreur JavaScript, aucune fenetre. Rien n'est ecrit en base.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  const erreurs = [], dialogues = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  const mesure = () => p.evaluate(() => { const cp = Ext.getCmp('content-panel'), e = Ext.ComponentQuery.query('activiteequipes')[0], h = Ext.ComponentQuery.query('appHeader')[0];
    const z = cp.body.getViewSize(); return { fenetre: window.innerWidth, entete: h ? h.getWidth() : -1, corps: z.width + 'x' + z.height, ecran: e.getWidth() + 'x' + e.getHeight(),
      defile: cp.body.dom.scrollHeight - cp.body.dom.clientHeight }; });
  try {
    /* le tableau de bord (ecran non colle) : presentation de reference avant l'ecran colle */
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await p.waitForTimeout(3000);
    await ouvrirMenu(p, 'ANALYSE DE GESTION', 'Activité des équipes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('activiteequipes').some((c) => c.isVisible(true)), null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    /* avis de redimensionnement du conteneur du milieu perdu (cas du videoprojecteur) */
    await p.evaluate(() => { Ext.getCmp('content-panel').suspendEvents(false); });
    for (const [w, h] of [[1024, 768], [1600, 900], [800, 600]]) {
      await p.setViewportSize({ width: w, height: h });
      await p.waitForTimeout(1500);
      const m = await mesure();
      ok('Fenêtre ' + w + ' px, avis perdu : l\'écran a la taille du conteneur, l\'en-tête suit la fenêtre', m.ecran === m.corps && m.entete === w && m.defile <= 2, JSON.stringify(m));
    }
    await p.evaluate(() => { Ext.getCmp('content-panel').resumeEvents(); });
    await p.setViewportSize({ width: 1280, height: 720 });
    await p.waitForTimeout(1500);
    /* ecran derange (largeur faussee par une mesure prise au mauvais moment), puis une mise en page qui ne change
       pas la taille de la fenetre : comme l'en-tete, il doit reprendre la taille du conteneur */
    await p.evaluate(() => { Ext.ComponentQuery.query('activiteequipes')[0].setSize(700, 400); });
    await p.waitForTimeout(300);
    await p.evaluate(() => { Ext.ComponentQuery.query('viewport')[0].updateLayout(); });
    await p.waitForTimeout(1200);
    let d = await mesure();
    ok('Écran dérangé puis mise en page : il reprend la taille du conteneur, comme l\'en-tête', d.ecran === d.corps && d.defile <= 2, JSON.stringify(d));
    const barre = await p.evaluate(() => { const r = Ext.ComponentQuery.query('navigation')[0].placeholder.el.dom.getBoundingClientRect(); return [r.x + r.width / 2, r.y + 200]; });
    await p.mouse.click(barre[0], barre[1]);
    await p.waitForTimeout(700);
    await p.mouse.move(900, 400);
    await p.waitForTimeout(1500);
    const m = await mesure();
    ok('Menu de navigation ouvert puis refermé : l\'écran garde la taille du conteneur', m.ecran === m.corps, JSON.stringify(m));

    await p.evaluate(() => { try { testextjs.app.getController('App').onLoadNewComponent('dashboard', 'Tableau de bord', ''); } catch (e) { return e.stack; } }).then((x) => { if (x) { console.log('PILE', x.slice(0, 900)); } });
    await p.waitForTimeout(4000);
    const nc = await p.evaluate(() => { const cp = Ext.getCmp('content-panel'), it = cp.items.getAt(0); return { xtype: it.getXType(), colle: !!it.collerEnHaut, disposition: cp.getLayout().type }; });
    ok('Écran non collé ensuite (tableau de bord) : conteneur revenu à sa disposition habituelle', !nc.colle && nc.disposition !== 'fit', JSON.stringify(nc));
    ok('Aucune erreur JavaScript, aucune fenêtre', erreurs.length === 0 && dialogues.length === 0, erreurs.concat(dialogues).join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
