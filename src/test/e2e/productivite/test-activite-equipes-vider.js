/* ACTIVITE DES EQUIPES : BOUTON « VIDER LES CHAMPS » (retour du 25/10).
 *
 * Par les vues (admin), ANALYSE DE GESTION > Activité des équipes :
 *  - apres avoir choisi des dates, un employe et une recherche dans le journal, « Vider les champs » remet la periode
 *    par defaut (du 1er du mois a aujourd'hui), « Tous les employés » et une recherche vide ;
 *  - la liste est relue sans filtre d'employe ni de recherche ;
 *  - le bouton est sur la ligne des filtres, a cote d'« Actualiser » ;
 *  - aucune erreur JavaScript, aucune fenetre. Rien n'est ecrit en base.
 */
const { chromium } = require('playwright-core');
const { connexion, ouvrirMenu, cliquer, saisir } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const deux = (n) => String(n).padStart(2, '0');
const auj = new Date(), jj = (d) => deux(d.getDate()) + '/' + deux(d.getMonth() + 1) + '/' + d.getFullYear();
const premier = new Date(auj.getFullYear(), auj.getMonth(), 1);

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = [], dialogues = [], journal = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  p.on('request', (r) => { if (/activite-equipes\/journal/.test(r.url())) { journal.push(new URL(r.url()).searchParams); } });
  try {
    await connexion(p, 'admin', 'e2etest');
    await ouvrirMenu(p, 'ANALYSE DE GESTION', 'Activité des équipes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('activiteequipes').some((c) => c.isVisible(true)), null, { timeout: 60000 });
    await p.waitForFunction(() => Ext.ComponentQuery.query('activiteequipes')[0].employes.getCount() > 0, null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    const place = await p.evaluate(() => { const v = Ext.ComponentQuery.query('activiteequipes #aeVider')[0], a = Ext.ComponentQuery.query('activiteequipes #aeActualiser')[0];
      return !!v && v.up('toolbar') === a.up('toolbar') && v.isVisible(true); });
    ok('« Vider les champs » sur la ligne des filtres, à côté d\'« Actualiser »', place);
    await saisir(p, 'activiteequipes #aeDebut', '01/01/2026');
    await saisir(p, 'activiteequipes #aeFin', '15/01/2026');
    const employe = await p.evaluate(() => { const c = Ext.ComponentQuery.query('activiteequipes #aeEmploye')[0]; const r = c.getStore().findRecord('id', /./); c.setValue(r.get('id')); c.fireEvent('select', c, [r]); return r.get('id'); });
    await p.evaluate(() => { Ext.ComponentQuery.query('activiteequipes #aeRecherche')[0].setValue('E2EVIDER'); });
    await p.waitForTimeout(2500);
    journal.length = 0;
    await cliquer(p, 'activiteequipes #aeVider');
    await p.waitForTimeout(3000);
    const v = await p.evaluate(() => { const c = (s) => Ext.ComponentQuery.query('activiteequipes ' + s)[0];
      return { debut: c('#aeDebut').getRawValue(), fin: c('#aeFin').getRawValue(), employe: c('#aeEmploye').getValue(), libelle: c('#aeEmploye').getRawValue(),
        recherche: c('#aeRecherche').getValue() }; });
    ok('Période par défaut : du 1er du mois à aujourd\'hui', v.debut === jj(premier) && v.fin === jj(auj), JSON.stringify(v));
    ok('Employé vidé (« Tous les employés »), recherche vide', !!employe && !v.employe && v.libelle === '' && v.recherche === '', JSON.stringify(v) + ' / avant : ' + employe);
    const derniere = journal[journal.length - 1];
    ok('La liste est relue sans employé ni recherche, sur la période par défaut', !!derniere && !derniere.get('employeId') && !derniere.get('q')
      && derniere.get('debut') === `${premier.getFullYear()}-${deux(premier.getMonth() + 1)}-01`, derniere ? derniere.toString() : 'aucune lecture');
    ok('Aucune erreur JavaScript, aucune fenêtre', erreurs.length === 0 && dialogues.length === 0
      && await p.evaluate(() => Ext.ComponentQuery.query('window').filter((w) => w.isVisible()).length) === 0, erreurs.concat(dialogues).join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
