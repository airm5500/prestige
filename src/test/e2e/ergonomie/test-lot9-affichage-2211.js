/* LOT 9 (retour du 22/11) : SELECTEUR DE PERIODE, SAISIE DE PAGE DE L'INVENTAIRE, HABILLAGE, MENUS TRIES.
 *
 * Par les clics (compte e2e), sur l'ecran a 1366 x 768 :
 *  point 0 : le selecteur de periode (Journal des messages) n'a plus de raccourcis en boutons bleus ExtJS : fond
 *            transparent sans degrade, texte sombre ; survol gris clair ; « Hier » remplit bien la periode ;
 *  point 2 : Travaux d'Inventaire, icone « Ouvrir l'inventaire » d'une fiche ouverte de plusieurs pages : la barre de
 *            pagination garde la case « Page [ ] sur N » ; le numero 3 tape puis Entree charge la page 3 (requete
 *            start = 2 x taille de page, numero 3 actif) ; la Fiche Article, elle, garde les seuls numeros ;
 *  point 4 : « Liste des Reglements » (reglementmanager) colle a son conteneur et « Vente dépôt » (ventedepot) a
 *            l'habillage des listes (theme-liste, barre de pagination au theme) ;
 *  point 5 : chaque menu du volet « Prestige Navigation » ouvre ses sous-menus par ordre alphabetique (accents et
 *            casse ignores), sans entree en plus ni en moins par rapport aux droits ;
 *  aucune erreur JavaScript. Rien n'est ecrit en base.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu } = require('../outils/vues');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 600) + ']' : '')); }
/* chaque menu ouvert remplace l'ecran precedent (App.onLoadNewComponent) : rien a fermer */
const fermerOnglets = async () => {};

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  try {
    const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
    p.on('pageerror', (e) => err.push(e.message));
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');

    /* ---------- point 5 : sous-menus tries ---------- */
    const parents = await p.evaluate(() => Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().childNodes
      .filter((n) => n.childNodes.length > 1).map((n) => ({ texte: n.get('text'), enfants: n.childNodes.map((c) => c.get('text')) })));
    const pasTries = [], ecartsDroits = [];
    const cmp = (a, b2) => a.localeCompare(b2, 'fr', { sensitivity: 'base', numeric: true });
    const visible = (sel) => p.locator(sel).filter({ visible: true });
    for (const par of parents) {
      if (await visible('.prestige-nav .x-grid-row').count() === 0) {
        const id = await p.evaluate(() => { const n = Ext.ComponentQuery.query('navigation')[0]; return n.placeholder ? n.placeholder.getId() : null; });
        await p.click('#' + id);
        await visible('.prestige-nav .x-grid-row').first().waitFor({ timeout: 10000 });
      }
      const exact = new RegExp('^\\s*' + par.texte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$');
      await visible('.prestige-nav .x-grid-row').filter({ has: p.getByText(exact) }).first().click();
      await visible('.prestige-flyout-menu .x-menu-item').first().waitFor({ timeout: 10000 });
      /* toutes les entrees du volet ouvert, y compris celles sous le pli (le volet defile par ses fleches) */
      const affiches = await p.evaluate(() => { const v = Array.from(document.querySelectorAll('.prestige-flyout-menu')).filter((m) => m.offsetParent !== null && getComputedStyle(m).visibility !== 'hidden').pop();
        return v ? Array.from(v.querySelectorAll('.x-menu-item')).map((e) => e.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean) : []; });
      /* l'en-tete du volet (titre du module) n'est pas un sous-menu : on garde les entrees des droits */
      const norm = (t) => t.replace(/\s+/g, ' ').trim();
      const entrees = affiches.filter((t) => par.enfants.map(norm).includes(t));
      const triee = entrees.slice().sort(cmp);
      if (entrees.join('|') !== triee.join('|')) { pasTries.push(par.texte + ' : ' + entrees.join(', ')); }
      if (entrees.length !== par.enfants.length) { ecartsDroits.push(par.texte + ' ' + entrees.length + '/' + par.enfants.length); }
      await p.keyboard.press('Escape');
      await p.mouse.click(900, 600);
      await p.waitForTimeout(300);
    }
    ok('Point 5 : ' + parents.length + ' menus, sous-menus par ordre alphabétique', parents.length > 3 && pasTries.length === 0, pasTries.join(' | '));
    ok('Point 5 : mêmes entrées que les droits, ni plus ni moins', ecartsDroits.length === 0, ecartsDroits.join(' | '));

    /* ---------- point 0 : raccourcis du selecteur de periode ---------- */
    await ouvrirMenu(p, 'CAMPAGNES SMS / WHATSAPP', 'Journal des messages');
    await p.waitForFunction(() => Ext.ComponentQuery.query('journalmessages')[0], null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    const idPeriode = await p.evaluate(() => { const c = Ext.ComponentQuery.query('journalmessages datefield').filter((x) => x.champPeriode)[0]; return c ? c.champPeriode.inputEl.dom.id : null; });
    ok('Point 0 : le Journal des messages a le sélecteur de période', !!idPeriode);
    if (idPeriode) {
      await p.click('#' + idPeriode);
      const r = p.locator('.champ-periode-raccourci').filter({ visible: true });
      await r.first().waitFor({ timeout: 8000 });
      const styles = await r.evaluateAll((els) => els.map((e) => { const s = getComputedStyle(e); const texte = e.querySelector('.x-btn-inner') || e; return { t: e.textContent.trim(), bg: s.backgroundColor, img: s.backgroundImage, col: getComputedStyle(texte).color, bord: s.borderTopWidth }; }));
      const transparent = (c) => c === 'transparent' || /rgba\(\d+, \d+, \d+, 0\)/.test(c);
      const bleu = styles.filter((s) => !transparent(s.bg) || s.img !== 'none' || s.col !== 'rgb(30, 42, 54)' || s.bord !== '0px');
      ok('Point 0 : ' + styles.length + ' raccourcis sans bouton bleu (fond transparent, sans dégradé ni bordure, texte sombre)', styles.length >= 3 && bleu.length === 0, JSON.stringify(bleu.length ? bleu : styles[0]));
      const hier = r.filter({ hasText: /^\s*Hier\s*$/ }).first();
      await hier.hover();
      await p.waitForTimeout(250);
      const survol = await hier.evaluate((e) => getComputedStyle(e).backgroundColor);
      ok('Point 0 : survol gris clair (#eef2f6)', survol === 'rgb(238, 242, 246)', survol);
      await hier.click();
      await p.waitForTimeout(800);
      const valeur = await p.evaluate((id) => document.getElementById(id).value, idPeriode);
      const j = new Date(Date.now() - 86400000);
      const h = String(j.getDate()).padStart(2, '0') + '/' + String(j.getMonth() + 1).padStart(2, '0') + '/' + j.getFullYear();
      ok('Point 0 : « Hier » remplit la période', valeur.replace(/\s/g, '') === h + '→' + h, valeur);
      await p.keyboard.press('Escape');
    }
    await fermerOnglets(p);

    /* ---------- point 2 : saisie du numero de page dans l'inventaire ---------- */
    await ouvrirMenu(p, 'GESTION DU STOCK', 'Travaux d\'Inventaire');
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('inventaireManager grid, inventairemanager grid')[0]
      || Ext.ComponentQuery.query('gridpanel').filter((x) => x.isVisible(true) && x.getStore().getCount() > 0)[0]; return g && g.getStore().getCount() > 0; }, null, { timeout: 60000 });
    /* une fiche ouverte dont l'ecran affiche au moins 3 pages : nombre de lignes lu par la ressource de l'ecran */
    const cible = await p.evaluate(async () => {
      const g = Ext.ComponentQuery.query('inventaire')[0];
      const recs = g.getStore().getRange().filter((r) => r.get('etat') === 'enable');
      for (const r of recs) {
        const rep = await fetch('../api/v1/inventaire/detail?lg_INVENTAIRE_ID=' + encodeURIComponent(r.get('lg_INVENTAIRE_ID')) + '&page=1&start=0&limit=30').then((x) => x.json()).catch(() => ({}));
        if ((rep.total || 0) >= 90) {
          const n = g.getView().getNode(r);
          const img = Array.from(n.querySelectorAll('img, [data-qtip]')).find((x) => /paste_plain/.test(x.getAttribute('src') || '') || /^Ouvrir l.inventaire$/.test(x.getAttribute('data-qtip') || ''));
          if (img) { img.id = img.id || 'e2e-ouvrir-inventaire'; return { id: img.id, inv: r.get('lg_INVENTAIRE_ID'), total: rep.total }; }
        }
      }
      return null;
    });
    ok('Point 2 : une fiche d\'inventaire ouverte de 3 pages et plus, avec son icône « Ouvrir l\'inventaire »', !!cible, JSON.stringify(cible));
    if (cible) {
      await p.click('#' + cible.id);
      await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('editinventaireManager')[0]; const t = e && e.query('pagingtoolbar').filter((x) => x.isVisible(true))[0];
        return t && t.getStore().getTotalCount() > 0 && !t.getStore().isLoading(); }, null, { timeout: 120000 });
      const etat = await p.evaluate(() => { const t = Ext.ComponentQuery.query('editinventaireManager pagingtoolbar').filter((x) => x.isVisible(true))[0];
        const champ = t.down('#inputItem'); const s = t.getStore();
        return { saisie: !!(champ && champ.isVisible(true)), id: champ && champ.inputEl ? champ.inputEl.dom.id : null, pages: Math.ceil(s.getTotalCount() / s.pageSize), taille: s.pageSize, cls: t.hasCls('pg-saisie-page') }; });
      ok('Point 2 : la case « Page [ ] » est visible dans la barre de l\'inventaire', etat.saisie && etat.cls, JSON.stringify(etat));
      if (etat.saisie && etat.pages >= 3) {
        const [req] = await Promise.all([
          p.waitForRequest((r) => /[?&]start=/.test(r.url()) && /[?&]page=3\b/.test(r.url()), { timeout: 60000 }),
          (async () => { await p.click('#' + etat.id); await p.keyboard.press('Control+A'); await p.keyboard.type('3'); await p.keyboard.press('Enter'); })(),
        ]);
        await p.waitForFunction(() => { const t = Ext.ComponentQuery.query('editinventaireManager pagingtoolbar').filter((x) => x.isVisible(true))[0]; return !t.getStore().isLoading() && t.getStore().currentPage === 3; }, null, { timeout: 60000 });
        const start = Number(new URL(req.url()).searchParams.get('start'));
        const apres = await p.evaluate(() => { const t = Ext.ComponentQuery.query('editinventaireManager pagingtoolbar').filter((x) => x.isVisible(true))[0];
          const actif = t.el.dom.querySelector('.pg-actif, .pg-num.actif, .pg-num-actif, [aria-pressed="true"]');
          return { page: t.getStore().currentPage, champ: t.down('#inputItem').getValue(), actif: actif ? actif.textContent.trim() : null, lignes: t.getStore().getCount() }; });
        ok('Point 2 : page 3 tapée puis Entrée : requête start = 2 × ' + etat.taille + ', page 3 chargée, affichée, numéro 3 actif', start === 2 * etat.taille && apres.page === 3 && String(apres.champ) === '3' && apres.actif === '3' && apres.lignes > 0,
          'start ' + start + ' ' + JSON.stringify(apres));
        /* les numeros suivent (un ecouteur 'change' de l'ecran renvoyait false : numeros figes sur « 1 ») :
           clic sur le dernier numero, qui doit etre la derniere page */
        const dernier = await p.evaluate(() => { const t = Ext.ComponentQuery.query('editinventaireManager pagingtoolbar').filter((x) => x.isVisible(true))[0];
          const bs = Array.from(t.el.dom.querySelectorAll('button.pg-num')); const d = bs[bs.length - 1]; d.id = d.id || 'e2e-dernier-numero'; return { id: d.id, n: Number(d.textContent) }; });
        ok('Point 2 : les numéros vont jusqu\'à la dernière page (' + etat.pages + ')', dernier.n === etat.pages, JSON.stringify(dernier));
        if (dernier.n > 3) {
          await p.click('#' + dernier.id);
          await p.waitForFunction((n) => { const t = Ext.ComponentQuery.query('editinventaireManager pagingtoolbar').filter((x) => x.isVisible(true))[0]; return !t.getStore().isLoading() && t.getStore().currentPage === n; }, dernier.n, { timeout: 60000 });
          const fin = await p.evaluate(() => { const t = Ext.ComponentQuery.query('editinventaireManager pagingtoolbar').filter((x) => x.isVisible(true))[0];
            return { champ: t.down('#inputItem').getValue(), actif: (t.el.dom.querySelector('.pg-actif') || {}).textContent }; });
          ok('Point 2 : clic sur le dernier numéro : la case « Page » et le numéro actif suivent', String(fin.champ) === String(dernier.n) && fin.actif === String(dernier.n), JSON.stringify(fin));
        }
      } else {
        ok('Point 2 : la fiche d\'inventaire a au moins 3 pages', false, JSON.stringify(etat));
      }
    }
    await fermerOnglets(p);
    await ouvrirMenu(p, 'GESTION DU STOCK', 'Fiche Article');
    await p.waitForFunction(() => Ext.ComponentQuery.query('famillemanager pagingtoolbar').filter((x) => x.rendered)[0], null, { timeout: 30000 });
    const ficheSaisie = await p.evaluate(() => { const t = Ext.ComponentQuery.query('famillemanager pagingtoolbar')[0]; const c = t.down('#inputItem'); return !!(c && c.isVisible(true)); });
    ok('Point 2 : la Fiche Article garde la pagination numérotée seule (pas de case « Page »)', !ficheSaisie);
    await fermerOnglets(p);

    /* ---------- point 4 : habillage de reglementmanager et ventedepot ---------- */
    await ouvrirMenu(p, 'FACTURATION', 'Liste des Reglements');
    await p.waitForFunction(() => Ext.ComponentQuery.query('reglementmanager')[0] && Ext.ComponentQuery.query('reglementmanager')[0].rendered, null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    const rg = await p.evaluate(() => { const e = Ext.ComponentQuery.query('reglementmanager')[0]; const c = e.ownerCt; const be = e.el.getBox(), bc = (c.body || c.el).getBox();
      return { colle: e.collerEnHaut === true, haut: Math.round(be.y - bc.y), bas: Math.round(bc.bottom - be.bottom), entete: !!(e.header && e.header.isVisible && e.header.isVisible()) }; });
    ok('Point 4 : « Liste des Reglements » collée au conteneur (en haut, jusqu\'en bas, sans titre en double)', rg.colle && Math.abs(rg.haut) <= 2 && Math.abs(rg.bas) <= 4 && !rg.entete, JSON.stringify(rg));
    await fermerOnglets(p);
    await ouvrirMenu(p, 'SERVICE CLIENT', 'Vente dépôt');
    await p.waitForFunction(() => Ext.ComponentQuery.query('ventedepot')[0] && Ext.ComponentQuery.query('ventedepot')[0].rendered, null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    const vd = await p.evaluate(() => { const e = Ext.ComponentQuery.query('ventedepot')[0]; const t = e.query('pagingtoolbar')[0];
      return { liste: e.hasCls('theme-liste') && e.hasCls('mv-panneau'), pagination: !!(t && t.hasCls('theme-pagination')), colle: e.collerEnHaut === true }; });
    ok('Point 4 : « Vente dépôt » au thème des listes (theme-liste, pagination au thème, collée)', vd.liste && vd.pagination && vd.colle, JSON.stringify(vd));
    await fermerOnglets(p);

    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Déroulé sans exception', false, x.stack || x);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
