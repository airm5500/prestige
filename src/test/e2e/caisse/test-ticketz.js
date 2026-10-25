/* TICKET Z et TABLEAU DE BORD (retours du 25/10, points 3 et 4).
 *  - rapidite : le recapitulatif des 24 derniers jours (tous les mouvements, puis ventes seules, tous les caissiers)
 *    repond en moins de 5 s ; chaque vente chargee tirait une a une ses associations (30 s sur une base reelle) ;
 *  - ecran Ticket Z, ouvert par le menu (GESTION COURANTE > Ticket Z) : aucun iframe ; a l'ouverture, une carte par
 *    caissier et le total general, avec les montants de l'API ; « Ventes uniquement » relance la recherche ;
 *  - « Envoyer SMS » et « Imprimer » : l'etat s'affiche dans le bouton, sans fenetre (appels interceptes : aucun SMS
 *    envoye, rien d'imprime) ; « Aperçu » ouvre la page imprimable avec la periode et le recapitulatif ;
 *  - tableau de bord a l'accueil : le composant ExtJS, aucun iframe, meme avec KEY_TABLEAU_BORD_VERSION = ANCIEN.
 *  - retour au tableau de bord depuis le Ticket Z (ecran colle) : toute la largeur, pas un tiers.
 * Le test ne pose aucune donnee ; le parametre du tableau de bord est remis a sa valeur.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const { execFileSync } = require('child_process');
const http = require('http');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 220) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const LIMITE_MS = 5000;

function appel(chemin, corps, cookie) {
  return new Promise((ok_, ko) => {
    const donnees = JSON.stringify(corps);
    const r = http.request({ host: 'localhost', port: 8080, path: '/prestige/api/v1/' + chemin, method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(donnees) }, cookie ? { Cookie: cookie } : {}) },
    (rep) => { let t = ''; rep.on('data', (c) => { t += c; }); rep.on('end', () => ok_({ corps: t, cookie: (rep.headers['set-cookie'] || []).map((c) => c.split(';')[0]).join('; ') })); });
    r.on('error', ko); r.end(donnees);
  });
}
const jour = (decalage) => { const d = new Date(); d.setDate(d.getDate() + decalage); return d.toISOString().slice(0, 10); };
/* montants affiches par une carte : [libelle, montant] dans l'ordre */
const cartes = (p) => p.evaluate(() => Array.from(document.querySelectorAll('.ticketz-carte')).map((c) => ({
  titre: c.querySelector('h6').textContent.trim(),
  lignes: Array.from(c.querySelectorAll('tr')).map((tr) => [tr.children[0].textContent.trim(), tr.children[1].textContent.trim()])
})));

(async () => {
  const VERSION = q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_TABLEAU_BORD_VERSION'");
  const b = await ENV_E2E.lancer(chromium);
  const dialogues = [];
  try {
    /* 1. rapidite (API) */
    const cnx = await appel('user/auth', { login: ENV_E2E.LOGIN, password: 'e2etest' });
    ok('Connexion du compte d\'essai', /lg_EMPLACEMENT_ID/.test(cnx.corps), cnx.corps.slice(0, 80));
    for (const type of ['ALL', 'VENTE']) {
      const params = { dtStart: jour(-24), dtEnd: jour(-1), hrStart: '00:00', hrEnd: '23:59', userId: 'ALL', description: type };
      const t0 = Date.now();
      const r = await appel('caisse/fetch-tickez', params, cnx.cookie);
      const ms = Date.now() - t0;
      const o = JSON.parse(r.corps);
      ok('Ticket Z sur 24 jours (' + type + ') : recapitulatif rendu', o.data && Array.isArray(o.data.datas) && o.data.datas.length > 0,
        o.data ? o.data.datas.length + ' caissiers' : r.corps.slice(0, 80));
      ok('Ticket Z sur 24 jours (' + type + ') en moins de ' + LIMITE_MS / 1000 + ' s', ms < LIMITE_MS, ms + ' ms');
    }

    /* 2. tableau de bord : jamais d'iframe, meme si le parametre demande l'ancien */
    q("UPDATE t_parameters SET str_VALUE = 'ANCIEN' WHERE str_KEY = 'KEY_TABLEAU_BORD_VERSION'");
    const ctx = await b.newContext({ viewport: { width: 1600, height: 950 } });
    const p = await ctx.newPage();
    p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await p.waitForFunction(() => Ext.ComponentQuery.query('dashboard tableaubord').length > 0, null, { timeout: 60000 }).catch(() => {});
    const accueil = await p.evaluate(() => ({ tableau: Ext.ComponentQuery.query('dashboard tableaubord').length,
      iframes: document.querySelectorAll('#dashboard-panel iframe').length }));
    ok('Tableau de bord : composant ExtJS, aucun iframe (paramètre sur ANCIEN)', accueil.tableau === 1 && accueil.iframes === 0, JSON.stringify(accueil));
    q(`UPDATE t_parameters SET str_VALUE = '${VERSION}' WHERE str_KEY = 'KEY_TABLEAU_BORD_VERSION'`);

    /* 3. ecran Ticket Z par le menu */
    const lus = [];
    p.on('request', (r) => { if (r.url().indexOf('/caisse/fetch-tickez') > 0) { lus.push(JSON.parse(r.postData() || '{}')); } });
    await vues.ouvrirMenu(p, 'GESTION COURANTE', 'Ticket Z');
    await p.waitForSelector('.ticketz-carte, .ticketz-vide', { timeout: 60000 });
    ok('Ticket Z : ouvert par le menu, sans iframe', await p.evaluate(() => Ext.ComponentQuery.query('ticketzmanager').length === 1
      && document.querySelectorAll('.ticketz iframe').length === 0));
    const auj = jour(0);
    ok('Ticket Z : chargé à l\'ouverture sur la journée (00:00 - 23:59, tous)', lus.length === 1 && lus[0].dtStart === auj && lus[0].dtEnd === auj
      && lus[0].hrStart === '00:00' && lus[0].hrEnd === '23:59' && lus[0].userId === 'ALL' && lus[0].description === 'ALL', JSON.stringify(lus[0]));

    /* la veille, pour avoir des mouvements quel que soit le jour du test */
    const veille = jour(-1).split('-').reverse().join('/');
    await p.evaluate((d) => { const t = Ext.ComponentQuery.query('ticketzmanager')[0];
      t.down('#dtStart').setValue(Ext.Date.parse(d, 'd/m/Y')); t.down('#dtEnd').setValue(Ext.Date.parse(d, 'd/m/Y')); }, veille);
    await p.click('.ticketz .x-btn:has-text("Afficher")');
    await p.waitForFunction(() => !Ext.ComponentQuery.query('ticketzmanager')[0].loadMask || !Ext.ComponentQuery.query('ticketzmanager')[0].loadMask.isVisible(), null, { timeout: 30000 });
    await p.waitForTimeout(500);
    const api = JSON.parse((await appel('caisse/fetch-tickez', { dtStart: jour(-1), dtEnd: jour(-1), hrStart: '00:00', hrEnd: '23:59', userId: 'ALL', description: 'ALL' }, cnx.cookie)).corps).data;
    let c = await cartes(p);
    const attendu = api.datas.map((u) => ({ titre: 'Récapitulatif de ' + u.user,
      lignes: u.modePaymentAmounts.concat(u.totaux).map((l) => [l.modeLibelle, l.montant]) }))
      .concat([{ titre: 'Total général', lignes: api.totaux.map((l) => [l.modeLibelle, l.montant]) }]);
    ok('Ticket Z de la veille : une carte par caissier + le total général, montants de l\'API',
      JSON.stringify(c) === JSON.stringify(attendu), c.length + ' cartes / ' + attendu.length);

    await p.evaluate(() => Ext.ComponentQuery.query('ticketzmanager #description')[0].setValue('VENTE'));
    const avant = lus.length;
    await p.click('.ticketz .x-btn:has-text("Afficher")');
    await p.waitForTimeout(1500);
    ok('« Ventes uniquement » relance la recherche avec ce filtre', lus.length === avant + 1 && lus[avant].description === 'VENTE', JSON.stringify(lus[avant]));

    /* SMS et impression : appels interceptes, etat dans le bouton */
    const envoyes = [];
    await p.route('**/api/v1/caisse/send-sms', (r) => { envoyes.push('sms'); r.fulfill({ status: 200, body: 'Envoie en cours' }); });
    await p.route('**/api/v1/caisse/tickez', (r) => { envoyes.push('impression'); r.fulfill({ status: 200, body: '' }); });
    await p.click('.ticketz .x-btn:has-text("Envoyer SMS")');
    await p.waitForTimeout(400);
    const sms = await p.evaluate(() => Ext.ComponentQuery.query('ticketzmanager #sms')[0].getText());
    await p.click('.ticketz .x-btn:has-text("Imprimer")');
    await p.waitForTimeout(400);
    const imp = await p.evaluate(() => Ext.ComponentQuery.query('ticketzmanager #imprimer')[0].getText());
    ok('« Envoyer SMS » et « Imprimer » : appel envoyé, état dans le bouton', envoyes.join(',') === 'sms,impression'
      && sms === 'SMS envoyé' && /imprimante/.test(imp), sms + ' / ' + imp);
    await p.waitForTimeout(2800);
    ok('Les boutons reprennent leur libellé', await p.evaluate(() => { const t = Ext.ComponentQuery.query('ticketzmanager')[0];
      return t.down('#sms').getText() === 'Envoyer SMS' && t.down('#imprimer').getText() === 'Imprimer' && !t.down('#sms').isDisabled(); }));

    /* apercu : page imprimable dans un nouvel onglet */
    const [apercu] = await Promise.all([ctx.waitForEvent('page'), p.click('.ticketz .x-btn:has-text("Aperçu")')]);
    await apercu.waitForSelector('.ticketz-carte', { timeout: 15000 });
    const texte = await apercu.evaluate(() => document.body.innerText);
    ok('Aperçu : période, filtre et récapitulatif', texte.indexOf('Période : du ' + veille + ' 00:00 au ' + veille + ' 23:59') >= 0
      && /Ventes uniquement/.test(texte) && /Total général/i.test(texte), texte.slice(0, 160));
    await apercu.close();

    /* retour au tableau de bord par l'icone de l'en-tete (video du 25/10 : il restait sur un tiers de la largeur) */
    await p.evaluate(() => prestigeShowMetro());
    await p.waitForFunction(() => Ext.ComponentQuery.query('dashboard tableaubord').length > 0, null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    const retour = await p.evaluate(() => { const cp = Ext.getCmp('content-panel'), d = Ext.ComponentQuery.query('dashboard')[0];
      return { corps: cp.body.getViewSize().width, tableau: d.down('tableaubord').getWidth() }; });
    ok('Retour au tableau de bord après le Ticket Z : toute la largeur', retour.tableau >= retour.corps - 40, JSON.stringify(retour));
    ok('Aucune boîte de dialogue', dialogues.length === 0, dialogues.join(' | '));
  } catch (e) { ok('Parcours sans exception', false, e.message); } finally {
    q(`UPDATE t_parameters SET str_VALUE = '${VERSION}' WHERE str_KEY = 'KEY_TABLEAU_BORD_VERSION'`);
    await b.close();
    ok('Paramètre du tableau de bord remis', q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_TABLEAU_BORD_VERSION'") === VERSION);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
  process.exit(ko ? 1 : 0);
})();
