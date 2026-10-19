/* LISTE DES UTILISATEURS : LE MOT DE PASSE HACHE NE PART PAS VERS LE NAVIGATEUR (19/10).
 *
 * Constat du 17/10 : la liste des utilisateurs renvoyait str_PASSWORD (empreinte MD5) de chaque compte.
 * Par les vues : GESTION DES UTILISATEURS > « Utilisateurs ».
 *  - la reponse de la liste (route REST lue par l'ecran) ne contient pas str_PASSWORD ;
 *  - l'ancienne route ws_data.jsp, encore lue par deux ecrans, et les trois ws_privilege.jsp non plus ;
 *  - non-regression : la grille affiche les comptes, la fenetre « Modifier » s'ouvre avec le login ;
 *  - aucune erreur JavaScript. Le test ne cree ni ne modifie rien.
 */
const { chromium } = require('playwright-core');
const { connexion, ouvrirMenu } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const corps = []; p.on('response', async (r) => { if (/utilisateurs|utilisateur\/ws_data/.test(r.url())) { try { corps.push(await r.text()); } catch (e) { /* ignore */ } } });
  try {
    await connexion(p, 'admin', 'e2etest');
    await ouvrirMenu(p, 'GESTION DES UTILISATEURS', 'Utilisateurs');
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('usermanager gridpanel, usermanager grid')[0] || Ext.ComponentQuery.query('usermanager')[0];
      const s = g && g.getStore && g.getStore(); return s && !s.isLoading() && s.getCount() > 0; }, null, { timeout: 60000 });
    await p.waitForTimeout(500);
    const n = await p.evaluate(() => Ext.ComponentQuery.query('usermanager')[0].getStore().getCount());
    ok('La grille affiche les comptes', n > 0, n);
    ok('Réponse de la liste lue par l\'écran : sans str_PASSWORD', corps.length > 0 && corps.every((c) => c.indexOf('str_PASSWORD') < 0),
      corps.length + ' réponses ; ' + corps.filter((c) => c.indexOf('str_PASSWORD') >= 0).length + ' avec le champ');
    const ancienne = await p.evaluate(async () => (await fetch('../webservices/sm_user/utilisateur/ws_data.jsp?search_value=&start=0&limit=20')).text());
    ok('Ancienne route ws_data.jsp : sans str_PASSWORD, toujours des comptes', ancienne.indexOf('str_PASSWORD') < 0 && ancienne.indexOf('str_LOGIN') >= 0,
      ancienne.trim().slice(0, 200));

    const privileges = await p.evaluate(async () => Promise.all(['utilisateur', 'alertevent', 'outboudmessage']
      .map(async (d) => (await fetch('../webservices/sm_user/' + d + '/ws_privilege.jsp?start=0&limit=20')).text())));
    ok('Anciennes routes ws_privilege.jsp (3) : sans str_PASSWORD', privileges.every((t) => t.indexOf('str_PASSWORD') < 0),
      privileges.map((t) => t.trim().slice(0, 60)).join(' | '));

    /* non-regression : la fenetre de modification se remplit toujours */
    const login = await p.evaluate(() => Ext.ComponentQuery.query('usermanager')[0].getStore().getAt(0).get('str_LOGIN'));
    const vue = await p.evaluate(() => Ext.ComponentQuery.query('usermanager')[0].getView().el.id);
    const icone = p.locator('#' + vue + ' img.act-modifier').first();
    await icone.click();
    await p.waitForFunction(() => Ext.getCmp('str_LOGIN') && Ext.getCmp('str_LOGIN').isVisible(), null, { timeout: 15000 });
    const lu = await p.evaluate(() => Ext.getCmp('str_LOGIN').getValue());
    ok('« Modifier » : la fenêtre s\'ouvre avec le login du compte', lu === login, lu + ' / ' + login);
    await p.evaluate(() => { const w = Ext.getCmp('str_LOGIN').up('window'); if (w) { w.close(); } });
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
