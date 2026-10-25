/* DOUBLE CLIC SUR LES ICONES QUI OUVRENT UNE FENETRE APRES UN APPEL SERVEUR (retour du 15/10).
 *
 * Ces actions demandent d'abord les donnees au serveur, puis ouvrent la fenetre dans la reponse : un double clic
 * lancait deux appels et ouvrait DEUX fenetres. Le test passe par le vrai chemin (menu, grille, double clic souris
 * sur l'icone de la premiere ligne) ; la reponse du serveur est retardee de 600 ms pour reproduire un poste charge.
 * Ce que le test etablit, pour chaque ecran :
 *  - double clic : UNE seule fenetre, UN seul appel ;
 *  - pendant l'attente, un message d'ouverture est visible ;
 *  - apres fermeture, un nouveau clic rouvre la fenetre (le verrou est bien libere).
 * Puis le verrou lui-meme : refus d'un second appel, liberation, liberation de secours si la reponse ne vient jamais.
 * Une vente en attente du jour (E2E-DBLCLIC) est posee pour l'ecran des ventes en attente - copie d'une vente en attente
 * existante et de ses lignes, sous des identifiants marques - puis retiree.
 * Les ecrans clients (fiche client) ne sont pas ouverts ici : ils
 * affichent des donnees nominatives.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const V = 'E2E-DBLCLIC';
const nettoyer = () => q(`DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '${V}'; DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${V}'`);
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }

/* [menu xtype, titre, classe de l'ecran, infobulle de l'icone, classe de la fenetre (ou « titre: » + debut du titre), morceau d'URL, preparation] */
const ECRANS = [
  ['ventemanager', 'Ventes terminées', 'testextjs.view.vente.VentesFinis', /^Voir détail$/, 'testextjs.view.vente.DetailVente', 'ventestats/find-one/', 'periode'],
  ['cloturerventemanager', 'Ventes en attente', 'testextjs.view.vente.Pending', /^Voir le détail$/, 'testextjs.view.vente.PreventeDetail', 'ventestats/find-one/'],
  ['famillemanager', 'Fiche article', 'testextjs.view.configmanagement.famille.FamilleManager', /^Détail sur l'article$/, 'titre:^Detail sur l\'article', 'produit-search/produits/']
];

(async () => {
  nettoyer();
  const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin'");
  const SRC = q("SELECT p.lg_PREENREGISTREMENT_ID FROM t_preenregistrement p WHERE p.str_STATUT = 'is_Process' AND p.lg_NATURE_VENTE_ID <> '3' AND p.lg_USER_VENDEUR_ID IS NOT NULL"
    + " AND EXISTS (SELECT 1 FROM t_preenregistrement_detail d WHERE d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID) LIMIT 1");
  q(`CREATE TEMPORARY TABLE e2e_p AS SELECT * FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${SRC}';
    UPDATE e2e_p SET lg_PREENREGISTREMENT_ID = '${V}', str_REF = '${V}', str_REF_TICKET = 'E2E-DBL', lg_USER_ID = '${ADMIN}', lg_USER_VENDEUR_ID = '${ADMIN}', dt_CREATED = NOW(), dt_UPDATED = NOW();
    INSERT INTO t_preenregistrement SELECT * FROM e2e_p;
    CREATE TEMPORARY TABLE e2e_d AS SELECT * FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '${SRC}';
    UPDATE e2e_d SET lg_PREENREGISTREMENT_DETAIL_ID = CONCAT('E2EDBL-', SUBSTRING(lg_PREENREGISTREMENT_DETAIL_ID, 8)), lg_PREENREGISTREMENT_ID = '${V}';
    INSERT INTO t_preenregistrement_detail SELECT * FROM e2e_d;`);
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  let appels = 0, morceauSuivi = null;
  await p.route('**/api/v1/**', async (route) => {
    if (morceauSuivi && route.request().url().indexOf(morceauSuivi) >= 0) {
      appels++;
      await new Promise((r) => setTimeout(r, 600));
    }
    route.continue();
  });
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(1500);

    for (const [xtype, titre, classe, infobulle, fenetre, morceau, prep] of ECRANS) {
      const nom = classe.split('.').pop();
      try {
        await p.evaluate((a) => { Ext.each(Ext.ComponentQuery.query('[closable=true]'), (c) => { if (c.up && c.up('tabpanel') && c.close) { try { c.close(); } catch (e) {} } });
          testextjs.app.getController('App').onLoadNewComponent(a.x, a.t, ''); }, { x: xtype, t: titre });
        await p.waitForFunction((c) => { const e = Ext.ComponentQuery.query('*').filter((x) => Ext.getClassName(x) === c && x.rendered && x.isVisible())[0];
          const g = e && (e.is('grid') ? e : e.down('grid'));
          return g && g.getStore().getCount() > 0; }, classe, { timeout: 40000 }).catch(() => null);
        await p.evaluate((a) => { const e = Ext.ComponentQuery.query('*').filter((x) => Ext.getClassName(x) === a.c && x.isVisible())[0];
          const g = e.is('grid') ? e : e.down('grid');
          if (a.prep === 'periode') {
            /* aucune vente aujourd'hui sur le banc : periode ramenee sur des jours qui en ont, puis « rechercher » */
            e.down('#dtStart').setValue(new Date(2026, 9, 6)); e.down('#dtEnd').setValue(new Date(2026, 9, 14));
            e.query('button').filter((x) => x.isVisible() && /^\s*rechercher\s*$/i.test(x.text || ''))[0].el.dom.click();
          } else if (g.getStore().getCount() === 0 && g.loadStore) {
            g.loadStore();
          } else if (g.getStore().getCount() === 0) {
            const bt = e.query('button').filter((x) => x.isVisible() && /recherch/i.test(x.text || ''))[0];
            if (bt) { bt.el.dom.click(); } else { g.getStore().load(); }
          } }, { c: classe, prep });
        await p.waitForFunction((c) => { const e = Ext.ComponentQuery.query('*').filter((x) => Ext.getClassName(x) === c && x.isVisible())[0];
          const g = e.is('grid') ? e : e.down('grid');
          return g.getStore().getCount() > 0 && !g.getStore().isLoading(); }, classe, { timeout: 90000 });
        await p.waitForTimeout(800);
        /* icone de la premiere ligne, trouvee par son infobulle */
        const cible = await p.evaluate((a) => {
          const e = Ext.ComponentQuery.query('*').filter((x) => Ext.getClassName(x) === a.c && x.isVisible())[0];
          const g = e.is('grid') ? e : e.down('grid'), re = new RegExp(a.r);
          let sel = null;
          Ext.each(g.query('actioncolumn'), (col) => { Ext.each(col.items, (it, i) => { if (!sel && re.test(it.tooltip || '')) {
            const n = g.getView().getCellByPosition({ row: 0, column: g.headerCt.getHeaderIndex(col) });
            const img = n && n.dom.querySelector('.x-action-col-' + i);
            if (img) { img.setAttribute('data-e2e-cible', '1'); sel = '[data-e2e-cible="1"]'; } } }); });
          return sel;
        }, { c: classe, r: infobulle.source });
        if (!cible) { ok(nom + ' : icône trouvée sur la première ligne', false); continue; }
        await p.evaluate(() => { window.e2eFenetre = (w, f) => (f.indexOf('titre:') === 0 ? new RegExp(f.slice(6)).test(w.title || '') : Ext.getClassName(w) === f); });
        const compter = () => p.evaluate((f) => Ext.ComponentQuery.query('window').filter((w) => e2eFenetre(w, f) && !w.isDestroyed && w.isVisible()).length, fenetre);
        const fermer = () => p.evaluate((f) => { Ext.ComponentQuery.query('window').filter((w) => e2eFenetre(w, f)).forEach((w) => { try { w.close(); } catch (e) {} }); }, fenetre);
        await fermer();

        appels = 0; morceauSuivi = morceau;
        await p.dblclick(cible);
        await p.waitForTimeout(250);
        const message = await p.evaluate(() => Array.from(document.querySelectorAll('.x-mask-msg-text')).filter((x) => x.offsetParent !== null).map((x) => x.textContent).join(' | '));
        ok(nom + ' : message d\'ouverture visible pendant l\'attente', /ouverture|chargement/i.test(message), message || '(aucun)');
        await p.waitForFunction((f) => Ext.ComponentQuery.query('window').some((w) => e2eFenetre(w, f) && !w.isDestroyed && w.isVisible()), fenetre, { timeout: 15000 }).catch(() => null);
        await p.waitForTimeout(2000);
        const n = await compter();
        ok(nom + ' : double clic → une seule fenêtre, un seul appel', n === 1 && appels === 1, n + ' fenêtre(s), ' + appels + ' appel(s)');

        await fermer();
        appels = 0;
        await p.waitForTimeout(500);
        await p.click(cible);
        await p.waitForFunction((f) => Ext.ComponentQuery.query('window').some((w) => e2eFenetre(w, f) && !w.isDestroyed && w.isVisible()), fenetre, { timeout: 15000 }).catch(() => null);
        await p.waitForTimeout(1000);
        ok(nom + ' : après fermeture, un nouveau clic rouvre la fenêtre', (await compter()) === 1 && appels === 1, appels + ' appel(s)');
        await fermer();
        morceauSuivi = null;
      } catch (e) {
        ok(nom + ' : parcours', false, e.message);
        morceauSuivi = null;
      }
    }

    /* le verrou lui-meme */
    const v = await p.evaluate(async () => {
      const V = window.PrestigeChargement && window.PrestigeChargement.verrou;
      if (!V) { return { absent: true }; }
      const f1 = V('e2e-essai', null, 'Ouverture'), f2 = V('e2e-essai', null, 'Ouverture');
      f1(); const f3 = V('e2e-essai', null, 'Ouverture'); f3(); f3();
      const g1 = V('e2e-secours', null, 'Ouverture', 300);
      const pris = V('e2e-secours', null, 'Ouverture', 300) === null;
      await new Promise((r) => setTimeout(r, 450));
      const g2 = V('e2e-secours', null, 'Ouverture'); g2();
      return { premier: typeof f1 === 'function', second: f2 === null, rendu: typeof f3 === 'function', pris, secours: typeof g2 === 'function', barre: (document.getElementById('pr-barre-chargement') || { style: {} }).style.display };
    });
    ok('Verrou : le second appel est refusé tant que le premier n\'a pas répondu', v.premier && v.second, JSON.stringify(v));
    ok('Verrou : libéré à la réponse', v.rendu, JSON.stringify(v));
    ok('Verrou : libéré de secours si la réponse ne vient jamais', v.pris && v.secours, JSON.stringify(v));
    ok('Verrou : barre de chargement retirée une fois tout libéré', v.barre === 'none', v.barre);
    ok('Aucune erreur JavaScript', err.length === 0, err.slice(0, 3).join(' | '));
  } catch (e) {
    ok('Exception', false, e.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Vente d\'essai retirée', q(`SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${V}'`) === '0');
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
    process.exit(ko ? 1 : 0);
  }
})();
