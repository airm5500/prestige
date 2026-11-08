/* PLAN DU 08/11, POINT 3 : « FACTURE DE GROUPE » ET « GROUPE ET COMPAGNIE » NE PRENNENT PAS TOUT L'ECRAN.
 *
 * Retour : « a l'affichage il ne prend pas tout l'ecran, le bas est remonte ; il faut cliquer sur Prestige
 * navigation pour le voir prendre tout le bas ».
 * Les deux ecrans (groupetierspayant, groupeInvoices) declarent une hauteur fixe de 570 px ; le panneau central est en
 * disposition « fit » : l'ajustement relevait la hauteur maximale sans relancer la mise en page.
 *
 * Par l'ecran, a trois tailles de fenetre (1366 x 768, 1600 x 950, 1920 x 1080), a la PREMIERE ouverture de chaque
 * ecran, sans autre clic : le bas de l'ecran touche le bas du panneau central (ecart <= 2 px), aucune bande vide.
 * Les autres ecrans colles ouverts au passage (« Factures », « Balance agee ») restent pleine hauteur. Lecture seule.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const V = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }

/* xtype, menu parent, entree du menu (libelles affiches) */
const ECRANS = [['groupetierspayant', 'GESTION DES TIERS-PAYANTS', "Groupe et Compagnie d'Ass"], ['groupeInvoices', 'FACTURATION', 'Factures Compagnies Ass'],
  ['facturemanager', 'FACTURATION', 'Factures'], ['balanceagee', 'GESTION DES TIERS-PAYANTS', 'Balance âgée récap']];
const TAILLES = [[1366, 768], [1600, 950], [1920, 1080]];

(async () => {
  let b = null;
  const err = [];
  try {
    b = await ENV_E2E.lancer(chromium);
    for (const [l, h] of TAILLES) {
      const p = await (await b.newContext({ viewport: { width: l, height: h } })).newPage();
      p.on('pageerror', (e) => err.push(e.message));
      await V.connexion(p, ENV_E2E.LOGIN, 'e2etest');
      for (const [xtype, parent, titre] of ECRANS) {
        await V.ouvrirMenu(p, parent, titre);
        await p.waitForFunction((x) => { const c = Ext.ComponentQuery.query(x)[0]; return c && c.rendered && c.isVisible(true); }, xtype, { timeout: 30000 });
        await p.waitForTimeout(1500);
        const m = await p.evaluate((x) => {
          const c = Ext.ComponentQuery.query(x)[0], cont = c.ownerCt;
          const r = c.getEl().dom.getBoundingClientRect(), z = (cont.body || cont.getEl()).dom.getBoundingClientRect();
          return { basEcran: Math.round(r.bottom), basPanneau: Math.round(z.bottom), hauteur: Math.round(r.height), place: Math.round(z.height) };
        }, xtype);
        ok(`${l}x${h} — ${titre} : pleine hauteur dès l'ouverture`, Math.abs(m.basPanneau - m.basEcran) <= 2 && m.hauteur >= m.place - 2, JSON.stringify(m));
      }
      await p.context().close();
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
