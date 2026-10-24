/* ACTIVITE DES EQUIPES : CHAQUE PASTILLE FILTRE SANS FAIRE DISPARAITRE LES AUTRES (retour du 24/10).
 *
 * « Au clic sur Ajustement et Connexion les tuiles disparaissent, il faut sortir du menu pour les ravoir. »
 * Cause : le journal filtre sur un seul type renvoyait une erreur 500 (colonne NULL sans type), et l'ecran effacait
 * alors toutes les pastilles.
 * Par les vues : ANALYSE DE GESTION > « Activité des équipes ». Pour CHAQUE pastille, une par une :
 *  - clic : les pastilles restent toutes affichees, celle-ci est active ; le journal ne montre que ce type et son
 *    total egale le nombre de la pastille ; aucun message d'erreur ;
 *  - second clic : toutes les actions reviennent ;
 *  - y compris une pastille a 0 (journal vide, pastilles conservees).
 * Aucune erreur JavaScript. Lecture seule.
 */
const { chromium } = require('playwright-core');
const { connexion, ouvrirMenu, texteMessage } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  try {
    await connexion(p, 'admin', 'e2etest');
    await ouvrirMenu(p, 'ANALYSE DE GESTION', 'Activité des équipes');
    await p.waitForFunction(() => document.querySelectorAll('.ae-pastille').length > 0, null, { timeout: 120000 });
    await p.waitForTimeout(1000);
    const pastilles = () => p.evaluate(() => Array.from(document.querySelectorAll('.ae-pastille')).map((e) => ({
      type: e.getAttribute('data-type'), nombre: Number(e.querySelector('b').textContent.replace(/\D/g, '')), active: e.classList.contains('ae-active') })));
    const depart = await pastilles();
    const total = () => p.evaluate(() => Ext.ComponentQuery.query('activiteequipes #aeJournal')[0].getStore().getTotalCount());
    const totalDepart = await total();
    ok('Pastilles affichées au départ', depart.length >= 8, depart.map((x) => x.type + '=' + x.nombre).join(' '));
    const charge = async () => {
      await p.waitForTimeout(300);
      await p.waitForFunction(() => !Ext.ComponentQuery.query('activiteequipes #aeJournal')[0].getStore().isLoading(), null, { timeout: 180000 });
      await p.waitForTimeout(500);
    };
    for (const x of depart) {
      if (!(await p.locator('.ae-pastille[data-type="' + x.type + '"]').count())) { ok(x.type + ' : pastille encore cliquable', false, 'les pastilles ont disparu'); break; }
      await p.click('.ae-pastille[data-type="' + x.type + '"]');
      await charge();
      const apres = await pastilles();
      const types = await p.evaluate(() => Ext.Array.unique(Ext.ComponentQuery.query('activiteequipes #aeJournal')[0].getStore().collect('type')));
      const message = await texteMessage(p);
      ok(x.type + ' : pastilles toujours affichées, celle-ci active ; journal de ce seul type (' + x.nombre + ')',
        apres.length === depart.length && apres.filter((a) => a.active).map((a) => a.type).join() === x.type
          && (x.nombre === 0 ? types.length === 0 : types.join() === x.type) && await total() === x.nombre && !message,
        apres.length + ' pastilles, actives ' + apres.filter((a) => a.active).map((a) => a.type) + ', types ' + types + ', total ' + await total() + (message ? ', message : ' + message : ''));
      if (await p.locator('.ae-pastille[data-type="' + x.type + '"]').count()) {
        await p.click('.ae-pastille[data-type="' + x.type + '"]');
        await charge();
      }
      ok(x.type + ' : second clic, toutes les actions reviennent', await total() === totalDepart && (await pastilles()).every((a) => !a.active), await total());
    }
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
