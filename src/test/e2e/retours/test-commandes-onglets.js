/* COMMANDES EN COURS « TOUT EN UN » (retours du 08/10 (12)).
 *  - menu et redirection ouvrent l'ecran a onglets : Commandes en cours | Ruptures | Substitutions | Alertes |
 *    Tableau de bord ; la liste des commandes est le premier onglet, inchangee ;
 *  - pastilles : alertes non lues et substitutions a decider (valeurs de la base) ;
 *  - chaque onglet montre le contenu attendu, sans la barre d'onglets interne de l'ecran des ruptures ;
 *  - bandeau d'alerte -> onglet Alertes du meme ecran ; prise de connaissance -> pastille a jour ;
 *  - le menu « Liste des ruptures » reste un ecran a part, avec ses onglets ;
 *  - rien de tronque, pas de defilement horizontal, aucune erreur JavaScript ; donnees du test retirees.
 */
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const SORTIE = process.env.SORTIE || '/tmp';
const ALR = 'E2E-CEC-ALR';
const G = '51217123531215794892';
const nettoyer = () => exec("DELETE FROM t_pharmaml_alerte_produit WHERE lg_ALERTE_ID = '" + ALR + "'; DELETE FROM t_pharmaml_alerte WHERE lg_ID = '" + ALR + "';");

(async () => {
  nettoyer();
  exec("INSERT INTO t_pharmaml_alerte (lg_ID, lg_GROSSISTE_ID, str_TYPE, str_NUMERO, str_MOTIF, str_DESIGNATION, b_ARRET_IMMEDIAT, b_RENVOI, dt_RECU)"
    + " VALUES ('" + ALR + "', '" + G + "', 'REGLEMENTAIRE', '" + ALR + "', 'Qualité', 'Alerte E2E onglets', 0, 0, NOW())");
  const { chromium } = require('playwright-core');
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const etat = () => p.evaluate(() => {
    const h = Ext.ComponentQuery.query('commandesencours')[0];
    if (!h) { return null; }
    const actif = h.getLayout().getActiveItem(), pml = h.ecranPml;
    const boutons = h.query('button[cls=cec-onglet]').map((x) => ({ t: x.getEl().dom.textContent.trim(), presse: !!x.pressed,
      fond: getComputedStyle(x.getEl().dom).backgroundColor,
      coupe: (() => { const i = x.getEl().dom.querySelector('.x-btn-inner'); return i.scrollWidth > i.clientWidth + 1; })() }));
    const corps = Ext.getBody().dom;
    return { boutons, actif: actif.xtype, ongletPml: pml ? pml.down('#ongletsRuptures').getActiveTab().itemId : '',
      barreInterne: pml ? pml.down('#ongletsRuptures').getTabBar().isVisible() : null,
      hub: { l: h.getWidth(), h: h.getHeight() }, centre: { l: h.ownerCt.body.getWidth(), h: h.ownerCt.body.getHeight() },
      defilementH: corps.scrollWidth > corps.clientWidth + 1 };
  });
  const cliquerOnglet = async (cle) => {
    const id = await p.evaluate((c) => Ext.ComponentQuery.query('commandesencours')[0].down('#cec-' + c).getEl().dom.id, cle);
    await p.click('#' + id);
    await p.waitForTimeout(900);
  };
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);

    /* ouverture par le menu */
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('i_order_manager', 'Commande en cours', ''));
    await p.waitForFunction(() => { const h = Ext.ComponentQuery.query('commandesencours')[0]; return h && h.isVisible() && !Ext.ComponentQuery.query('i_order_manager')[0].getStore().isLoading(); }, null, { timeout: 30000 });
    await p.waitForFunction(() => /Alertes\s*\d/.test(Ext.ComponentQuery.query('commandesencours')[0].down('#cec-alertes').getEl().dom.textContent), null, { timeout: 20000 });
    let e = await etat();
    const nonLues = q("SELECT COUNT(*) FROM t_pharmaml_alerte WHERE dt_LU IS NULL"), aDecider = q("SELECT COUNT(*) FROM t_pharmaml_remplacement WHERE str_STATUT = 'PROPOSE'");
    ok('Menu « Commande en cours » : 6 onglets, « Commandes en cours » actif, la liste des commandes affichée',
      e && e.boutons.map((x) => x.t.replace(/\s*\d+$/, '')).join('|') === 'Commandes en cours|Ruptures|Risque de rupture|Substitutions|Alertes|Tableau de bord' && e.boutons[0].presse && e.actif === 'i_order_manager', JSON.stringify(e));
    ok('Pastilles : alertes non lues et substitutions à décider = base', e.boutons[4].t === 'Alertes ' + nonLues
      && (aDecider === '0' ? e.boutons[3].t === 'Substitutions' : e.boutons[3].t === 'Substitutions ' + aDecider), JSON.stringify(e.boutons) + ' base=' + nonLues + '/' + aDecider);
    ok('L\'onglet actif se distingue des autres (fond foncé)', e.boutons[0].fond === 'rgb(31, 59, 90)' && e.boutons.slice(1).every((x) => x.fond !== 'rgb(31, 59, 90)'), JSON.stringify(e.boutons.map((x) => x.fond)));
    ok('Mise en page : écran à la taille du panneau central, onglets entiers, pas de défilement horizontal',
      Math.abs(e.hub.l - e.centre.l) <= 2 && e.hub.h >= e.centre.h - 2 && e.boutons.every((x) => !x.coupe) && !e.defilementH, JSON.stringify(e));
    await p.screenshot({ path: SORTIE + '/cec-commandes.png' });

    /* chaque onglet */
    const attendu = { ruptures: ['ongletRuptures', '#grilleRuptures'], substitutions: ['ongletSubstitutions', '#grilleSubstitutions'], alertes: ['ongletAlertes', '#grilleAlertes'], tableau: ['ongletTableauBord', '#tuilesPml'] };
    for (const cle of Object.keys(attendu)) {
      await cliquerOnglet(cle);
      e = await etat();
      const vu = await p.evaluate((sel) => { const c = Ext.ComponentQuery.query('commandesencours')[0].ecranPml.down(sel); return !!c && c.isVisible(true); }, attendu[cle][1]);
      ok('Onglet ' + cle + ' : contenu affiché dans le même écran, sans la barre d\'onglets interne',
        e.actif === 'rupturepharma' && e.ongletPml === attendu[cle][0] && vu && e.barreInterne === false && e.boutons.filter((x) => x.presse).length === 1, JSON.stringify(e));
      await p.screenshot({ path: SORTIE + '/cec-' + cle + '.png' });
    }
    await p.waitForFunction(() => Ext.ComponentQuery.query('commandesencours')[0].ecranPml.down('#tuilesPml').getEl().dom.querySelectorAll('.pml-tuile').length === 6, null, { timeout: 20000 });
    ok('Tableau de bord : tuiles chargées', true);

    /* bandeau -> onglet Alertes, puis prise de connaissance */
    await cliquerOnglet('commandes');
    await p.waitForFunction(() => { const bd = Ext.ComponentQuery.query('i_order_manager')[0].down('#bandeauAlertesPml'); return bd.isVisible() && /non lue/.test(bd.getEl().dom.textContent); }, null, { timeout: 20000 });
    await p.evaluate(() => { Ext.ComponentQuery.query('i_order_manager')[0].down('#bandeauAlertesPml').getEl().dom.querySelector('[data-ouvrir-alertes]').id = 'e2e-voir'; });
    await p.click('#e2e-voir');
    await p.waitForTimeout(900);
    e = await etat();
    const memeEcran = await p.evaluate(() => Ext.ComponentQuery.query('rupturepharma').length === 1 && !!Ext.ComponentQuery.query('commandesencours')[0]);
    ok('Bandeau « Voir les alertes » : onglet Alertes du même écran (pas de changement de menu)', memeEcran && e.ongletPml === 'ongletAlertes' && e.boutons[4].presse, JSON.stringify(e));
    await p.waitForFunction((alr) => { const st = Ext.ComponentQuery.query('commandesencours')[0].ecranPml.down('#grilleAlertes').getStore(); return st.findExact('numero', alr) >= 0; }, ALR, { timeout: 20000 });
    await p.evaluate((alr) => { const g = Ext.ComponentQuery.query('commandesencours')[0].ecranPml.down('#grilleAlertes'), st = g.getStore();
      g.getView().getNode(st.getAt(st.findExact('numero', alr))).querySelector('[data-alerte-lue]').id = 'e2e-lue'; }, ALR);
    await p.click('#e2e-lue');
    const attenduApres = String(Number(nonLues) - 1);
    await p.waitForFunction((n) => { const t = Ext.ComponentQuery.query('commandesencours')[0].down('#cec-alertes').getEl().dom.textContent.trim(); return n === '0' ? t === 'Alertes' : t === 'Alertes ' + n; }, attenduApres, { timeout: 20000 }).catch(() => {});
    e = await etat();
    ok('Alerte lue : pastille de l\'onglet Alertes mise à jour', (attenduApres === '0' ? e.boutons[4].t === 'Alertes' : e.boutons[4].t === 'Alertes ' + attenduApres) && q("SELECT dt_LU IS NOT NULL FROM t_pharmaml_alerte WHERE lg_ID = '" + ALR + "'") === '1', JSON.stringify(e.boutons[4]));

    /* redirection (retour d'une commande) : meme ecran a onglets */
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('i_order_manager', {}));
    await p.waitForFunction(() => { const h = Ext.ComponentQuery.query('commandesencours')[0]; return h && h.isVisible() && Ext.ComponentQuery.query('i_order_manager')[0].isVisible(); }, null, { timeout: 30000 });
    e = await etat();
    ok('Redirection vers les commandes en cours : écran à onglets, liste active', e && e.actif === 'i_order_manager' && e.boutons[0].presse, JSON.stringify(e));

    /* le menu « Liste des ruptures » reste un ecran a part */
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('rupturepharma', 'Liste des ruptures', ''));
    await p.waitForFunction(() => { const r = Ext.ComponentQuery.query('rupturepharma')[0]; return r && r.isVisible(); }, null, { timeout: 30000 });
    const seul = await p.evaluate(() => { const r = Ext.ComponentQuery.query('rupturepharma')[0]; return { hub: Ext.ComponentQuery.query('commandesencours').length, barre: r.down('#ongletsRuptures').getTabBar().isVisible(),
      onglets: r.down('#ongletsRuptures').items.getRange().map((t) => t.itemId).join('|') }; });
    ok('Menu « Liste des ruptures » inchangé : écran seul, avec sa barre d\'onglets', seul.hub === 0 && seul.barre && seul.onglets === 'ongletRuptures|ongletSubstitutions|ongletAlertes|ongletTableauBord', JSON.stringify(seul));

    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (ex) {
    ok('Exécution sans exception', false, ex.stack);
    await p.screenshot({ path: SORTIE + '/cec-erreur.png' }).catch(() => {});
  } finally {
    await b.close();
    nettoyer();
    ok('Nettoyage', q("SELECT COUNT(*) FROM t_pharmaml_alerte WHERE lg_ID = '" + ALR + "'") === '0');
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
