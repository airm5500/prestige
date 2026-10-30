/* CAMPAGNES : DESTINATAIRES CHARGES A LA DEMANDE (retours du 25/10, point 14, lenteur des onglets).
 *
 * Par les vues (admin), Campagnes SMS / WhatsApp > Campagnes :
 *  - ouvrir les onglets Infos clients, Infos pharmacie et Personnalisé n'envoie aucune recherche de destinataires
 *    (avant : jusqu'a 5 000 clients charges a l'ouverture) ; la grille invite a cliquer sur « Voir les destinataires » ;
 *  - l'onglet Anniversaires charge toujours ses destinataires a son ouverture (clients du jour) ;
 *  - « Voir les destinataires » sur Infos pharmacie charge la liste ;
 *  - aucune erreur JavaScript, aucune fenetre du navigateur. Rien n'est envoye ni ecrit.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu, cliquer } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  const erreurs = [], dialogues = [], recherches = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  p.on('request', (r) => { if (/campagnes\/population/.test(r.url())) { recherches.push((JSON.parse(r.postData() || '{}').categorie) || '?'); } });
  const onglet = async (code) => {
    await p.click('#' + await p.evaluate((c) => Ext.ComponentQuery.query('campagnes #onglet-' + c)[0].tab.getEl().dom.id, code));
    await p.waitForTimeout(2500);
  };
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'CAMPAGNES SMS / WHATSAPP', 'Campagnes');
    await p.waitForFunction(() => { const v = Ext.ComponentQuery.query('campagnes')[0]; return v && v.contexte; }, null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    await onglet('ANNIVERSAIRE');
    ok('Anniversaires : destinataires chargés à l\'ouverture', recherches.includes('ANNIVERSAIRE'), recherches.join(','));
    recherches.length = 0;
    for (const c of ['INFO_CLIENTS', 'INFO_PHARMACIE', 'PERSONNALISE']) {
      await onglet(c);
    }
    ok('Infos clients, Infos pharmacie, Personnalisé : aucune recherche à l\'ouverture', recherches.length === 0, recherches.join(','));
    const vide = await p.evaluate(() => ['INFO_CLIENTS', 'INFO_PHARMACIE'].map((c) => Ext.ComponentQuery.query('campagnes #onglet-' + c + ' #destinataires')[0])
      .map((g) => g.getStore().getCount() + ':' + /Voir les destinataires/.test(g.getView().getEl().dom.innerText)));
    ok('La grille invite à cliquer sur « Voir les destinataires »', vide.every((x) => x === '0:true'), vide.join(' | '));
    await onglet('INFO_PHARMACIE');
    await cliquer(p, 'campagnes #onglet-INFO_PHARMACIE #voir');
    await p.waitForFunction(() => /Destinataires : \d+ joignable/.test(Ext.ComponentQuery.query('campagnes #onglet-INFO_PHARMACIE #destinataires')[0].title), null, { timeout: 60000 });
    ok('« Voir les destinataires » charge la liste', recherches.join(',') === 'INFO_PHARMACIE'
      && await p.evaluate(() => Ext.ComponentQuery.query('campagnes #onglet-INFO_PHARMACIE #destinataires')[0].getStore().getCount()) > 0, recherches.join(','));
    ok('Aucune erreur JavaScript, aucune fenêtre du navigateur', erreurs.length === 0 && dialogues.length === 0, erreurs.concat(dialogues).join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
