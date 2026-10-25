/* TITRE DE LA BARRE DU PANNEAU CENTRAL APRES « RETOUR » (retour du 25/10).
 *
 * Par les vues (admin), GESTION DES COMMANDES > Retour fournisseur :
 *  - a l'ouverture, la barre du panneau central affiche « Retour fournisseur » ;
 *  - « NOUVEAU RETOUR » : la barre change (« Ajouter detail retour fournisseur ») ;
 *  - « Retour » : la liste revient et la barre affiche de nouveau « Retour fournisseur » (elle restait vide) ;
 *  - le Metro (ouvert sans titre, hors menu) n'herite pas du titre d'un autre ecran ;
 *  - aucune erreur JavaScript, aucune fenetre. Rien n'est ecrit en base.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }

(async () => {
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = [], dialogues = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  const titre = () => p.evaluate(() => { const t = Ext.getCmp('content-panel').title; return String(t || '').replace(/&nbsp;/g, '').trim(); });
  const cliquerTexte = async (texte) => {
    const id = await p.evaluate((t) => { const b2 = Ext.ComponentQuery.query('button').find((x) => x.isVisible(true) && String(x.text || '').trim() === t); return b2 ? b2.btnEl.dom.id : null; }, texte);
    if (!id) { throw new Error('Bouton introuvable : ' + texte); }
    await p.click('#' + id);
  };
  try {
    await connexion(p, 'admin', 'e2etest');
    await ouvrirMenu(p, 'GESTION DES COMMANDES', 'Retour fournisseur');
    await p.waitForFunction(() => Ext.ComponentQuery.query('retourfrsmanager').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await p.waitForTimeout(1200);
    ok('Ouverture : la barre affiche « Retour fournisseur »', await titre() === 'Retour fournisseur', await titre());
    await cliquerTexte('NOUVEAU RETOUR');
    await p.waitForFunction(() => Ext.getCmp('btn_cancel') && Ext.getCmp('btn_cancel').isVisible(true), null, { timeout: 60000 });
    await p.waitForTimeout(1000);
    const nouveau = await titre();
    ok('« NOUVEAU RETOUR » : la barre change', nouveau !== '' && nouveau !== 'Retour fournisseur', nouveau);
    await p.click('#' + await p.evaluate(() => Ext.getCmp('btn_cancel').btnEl.dom.id));
    await p.waitForFunction(() => Ext.ComponentQuery.query('retourfrsmanager').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await p.waitForTimeout(1000);
    ok('« Retour » : la barre affiche de nouveau « Retour fournisseur »', await titre() === 'Retour fournisseur', await titre());
    /* le Metro (ecran sans titre, hors menu) garde son comportement : pas de titre d'un autre ecran */
    await p.evaluate(() => { loadMainMenu(); });
    await p.waitForTimeout(2500);
    ok('Métro : pas de titre hérité d\'un autre écran', await titre() === '', await titre());
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
