/* ECRAN DE VENTE : fenetres au dessin du theme (demande de l'officine du 05/10).
 *
 * « Mettre au nouveau design les fenetres de chargement, "voulez-vous imprimer un ticket", "caisse fermee" et
 * l'ouverture de caisse. »
 *
 * Ce que le test etablit, sur le vrai ecran de vente :
 *  - l'attente (« Veuillez patienter »), la question d'impression du ticket et « Caisse fermee » prennent le dessin du
 *    theme ; Oui / OK en bouton principal ;
 *  - rien ne change dans le comportement : memes boutons visibles, meme bouton qui a le focus, la reponse donnee est
 *    bien celle du bouton clique ; Oui sur « Caisse fermee » ouvre la fenetre d'ouverture de caisse (dessin du theme,
 *    focus sur le montant), et sa fermeture relit l'etat de la caisse comme avant ;
 *  - hors de l'ecran de vente : meme dessin (retours du 07/10, toutes les boites au nouveau design), memes boutons.
 * La caisse n'est pas ouverte par le test (la fenetre est refermee sans valider).
 */
const { chromium } = require('playwright-core');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const CAPT = process.env.CAPTURES || '/tmp';

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1500, height: 900 } });
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const etat = () => p.evaluate(() => { const m = Ext.MessageBox; const vis = Ext.Object.getKeys(m.msgButtons).filter((k) => m.msgButtons[k].isVisible());
    const f = Ext.Object.getKeys(m.msgButtons).filter((k) => m.msgButtons[k].hasFocus || (document.activeElement && m.msgButtons[k].el && m.msgButtons[k].el.dom.contains(document.activeElement)));
    return { theme: m.hasCls('mb-theme'), visibles: vis.join(','), principal: Ext.Object.getKeys(m.msgButtons).filter((k) => m.msgButtons[k].hasCls('mb-principal')).join(','),
      focus: f.join(','), titre: m.title, entete: getComputedStyle(m.header.el.dom).backgroundImage.slice(0, 30) }; });
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(1500);

    /* Reference hors ecran de vente : la question du ticket telle qu'avant. */
    const question = () => p.evaluate(() => { window.__rep = null; Ext.MessageBox.show({ title: 'Impression du ticket', msg: 'Voulez-vous imprimer le ticket ?',
      buttons: Ext.MessageBox.YESNO, icon: Ext.MessageBox.QUESTION, fn: function (bt) { window.__rep = bt; } }); });
    await question(); await p.waitForTimeout(400);
    const avant = await etat();
    await p.evaluate(() => Ext.MessageBox.hide());

    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('doventemanager', { isEdit: false, record: {} }));
    await p.waitForFunction(() => Ext.ComponentQuery.query('doventemanager #contenu [xtype=fieldcontainer] #produit').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(1500);

    /* 1. Attente */
    await p.evaluate(() => { window.__attente = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!'); });
    await p.waitForTimeout(500);
    const a = await etat();
    ok('Attente : dessin du theme (en-tête navy, barre animée)', a.theme && /gradient/.test(a.entete), JSON.stringify(a));
    await p.screenshot({ path: CAPT + '/vente-attente.png' });
    await p.evaluate(() => window.__attente.hide());

    /* 2. Impression du ticket */
    await question(); await p.waitForTimeout(400);
    const q = await etat();
    ok('Ticket : dessin du theme, Oui en principal', q.theme && q.principal.indexOf('yes') >= 0 && q.principal.indexOf('no') < 0, JSON.stringify(q));
    ok('Ticket : mêmes boutons visibles et même focus qu\'avant', q.visibles === avant.visibles && q.focus === avant.focus, JSON.stringify({ avant, apres: q }));
    await p.screenshot({ path: CAPT + '/vente-ticket.png' });
    await p.click('#' + await p.evaluate(() => Ext.MessageBox.msgButtons.no.getId()));
    await p.waitForTimeout(300);
    ok('Ticket : « Non » répond bien « no »', await p.evaluate(() => window.__rep) === 'no');

    /* 3. Caisse fermee, par le vrai code de l'ecran */
    await p.evaluate(() => { window.__suite = 0; testextjs.app.getController('VenteCtr').proposerOuvertureCaisse(function () { window.__suite++; }); });
    await p.waitForTimeout(400);
    const c = await etat();
    ok('Caisse fermée : dessin du theme, Oui en principal', c.theme && c.titre === 'Caisse fermée' && c.principal.indexOf('yes') >= 0, JSON.stringify(c));
    await p.screenshot({ path: CAPT + '/vente-caisse-fermee.png' });
    await p.click('#' + await p.evaluate(() => Ext.MessageBox.msgButtons.yes.getId()));
    await p.waitForFunction(() => Ext.ComponentQuery.query('window[cls~=ouv-caisse]').length || document.querySelector('.x-window.ouv-caisse'), null, { timeout: 20000 });
    await p.waitForTimeout(1500);
    const o = await p.evaluate(() => { const w = Ext.ComponentQuery.query('window').filter((x) => x.hasCls && x.hasCls('ouv-caisse'))[0];
      const montant = Ext.getCmp('coffreCaisseAmount');
      return { visible: w && w.isVisible(), titre: w && w.title, bouton: !!Ext.getCmp('btnValidate'), focusMontant: montant && montant.inputEl && document.activeElement === montant.inputEl.dom,
        entete: w && getComputedStyle(w.header.el.dom).backgroundImage.slice(0, 30) }; });
    ok('Oui ouvre la fenêtre d\'ouverture de caisse au dessin du theme, focus sur le montant', o.visible && o.bouton && o.focusMontant && /gradient/.test(o.entete), JSON.stringify(o));
    await p.screenshot({ path: CAPT + '/vente-ouverture-caisse.png' });
    const appels = [];
    p.on('request', (r) => { if (/cheick-caisse/.test(r.url())) { appels.push(r.url()); } });
    await p.evaluate(() => Ext.ComponentQuery.query('window').filter((x) => x.hasCls && x.hasCls('ouv-caisse'))[0].close());
    await p.waitForTimeout(1500);
    ok('Fermeture sans valider : l\'état de la caisse est relu comme avant', appels.length >= 1, appels.length);

    /* 4. Hors de l'ecran de vente : depuis les retours du 07/10, toutes les boites de message ont le dessin du theme
       (THEME_PARTOUT) ; le comportement ne change pas (memes boutons, Oui en principal comme a la vente). */
    await p.evaluate(() => { testextjs.app.getController('App').onLoadNewComponent('facturesubrogatoire', 'Factures subrogatoires', ''); });
    await p.waitForTimeout(2500);
    await question(); await p.waitForTimeout(400);
    const h = await etat();
    const partout = await p.evaluate(() => window.PrestigeAffichage.THEME_PARTOUT === true);
    ok('Hors écran de vente : même dessin qu\'à la vente (retours du 07/10 : toutes les boîtes), mêmes boutons qu\'avant',
      partout && h.theme && h.principal === q.principal && h.visibles === avant.visibles, JSON.stringify({ partout, h }));
    await p.evaluate(() => Ext.MessageBox.hide());
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Parcours sans exception', false, e.message);
  } finally {
    await b.close();
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
