/* CAMPAGNES : WHATSAPP SEUL PAR DEFAUT (retours du 25/10, point 14).
 *
 * Par les vues (admin), Campagnes SMS / WhatsApp > Campagnes :
 *  - chaque onglet d'envoi (Anniversaires, Fêtes, Infos clients, Infos pharmacie, Personnalisé) et l'onglet
 *    Propositions s'ouvrent sur le canal « WhatsApp » ;
 *  - les modeles proposes sont ceux du canal WhatsApp ;
 *  - SMS et « WhatsApp, repli SMS » restent au choix ;
 *  - aucune erreur JavaScript, aucune fenetre du navigateur. Rien n'est envoye ni ecrit.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  const erreurs = [], dialogues = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'CAMPAGNES SMS / WHATSAPP', 'Campagnes');
    await p.waitForFunction(() => { const v = Ext.ComponentQuery.query('campagnes')[0]; return v && v.contexte; }, null, { timeout: 60000 });
    await p.waitForTimeout(1000);
    const canaux = await p.evaluate(() => Ext.ComponentQuery.query('campagnes #canal').filter((c) => !c.up('#ongletParametres'))
      .map((c) => (c.up('[itemId^=onglet]') || {}).itemId + '=' + c.getValue()));
    ok('Onglets d\'envoi et Propositions : canal WhatsApp par défaut', canaux.length >= 6 && canaux.every((x) => /=WHATSAPP$/.test(x)), canaux.join(', '));
    const choix = await p.evaluate(() => { const c = Ext.ComponentQuery.query('campagnes #onglet-INFO_CLIENTS #canal')[0]; return c.getStore().collect('v').join(','); });
    ok('SMS et « WhatsApp, repli SMS » restent au choix', choix === 'SMS,WHATSAPP,SMS_WHATSAPP', choix);
    await p.evaluate(() => { const v = Ext.ComponentQuery.query('campagnes')[0]; v.setActiveTab(v.down('#onglet-INFO_CLIENTS')); });
    await p.waitForTimeout(2000);
    const modeles = await p.evaluate(() => { const o = Ext.ComponentQuery.query('campagnes #onglet-INFO_CLIENTS')[0]; return o.modeles.getProxy().extraParams.canal; });
    ok('Modèles proposés : ceux du canal WhatsApp', modeles === 'WHATSAPP', modeles);
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
