/* BARRE DE PROGRESSION DU BAS DES LISTES (Ext.ux.ProgressBarPager) : un clic dessus doit mener a la page visee
 * (demande du 15/11 : corriger la cause de la « page NaN » de l'ecran Tiers-payants, pas seulement la recherche).
 *
 * Cause : le greffon prenait la taille de page sur la barre (qui n'en a pas) : pages = NaN, page demandee = NaN ;
 * la liste affichait « Page NaN », la demande partait avec page=NaN&start=NaN et la recherche suivante, qui reprenait
 * la page courante, etait rejetee. De plus le clic contournait « beforechange » : le filtre de l'ecran etait perdu.
 *
 * Par l'ecran GESTION DES TIERS-PAYANTS > Tiers-payants, en cliquant sur la barre a differents endroits :
 *  - sans filtre : la page demandee est celle de l'endroit clique (1/4, 3/4, extremite droite = derniere page) ;
 *  - rapprochement : la page affichee = la meme page demandee directement au service (memes organismes, meme ordre),
 *    et le texte de la barre dit la bonne page ;
 *  - avec une recherche : le clic garde la recherche (meme total, organismes conformes au filtre) ;
 *  - une nouvelle recherche repart de la page 1 ; aucune demande ne part avec NaN.
 * Lecture seule : rien n'est ecrit.
 *
 * node src/test/e2e/tierspayant/test-pager-barre-progression-1511.js
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');

const res = [];
function ok(n, c, d) { res.push(!!c); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 500) + ']' : '')); }

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } });
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  await p.route('**/api/v1/support/events', (r) => (r.request().method() === 'POST' ? r.fulfill({ status: 200, body: '{}' }) : r.continue()));
  const demandes = [];
  p.on('request', (r) => { if (/api\/v1\/tierspayant\/list/.test(r.url())) { demandes.push(new URL(r.url()).searchParams); } });

  const etat = () => p.evaluate(() => { const g = Ext.ComponentQuery.query('tierspayantmanager')[0], s = g.getStore();
    const barre = g.down('pagingtoolbar'); const saisie = barre.down('#inputItem');
    return { page: s.currentPage, total: s.getTotalCount(), taille: s.pageSize, ids: s.getRange().map((r) => r.get('lg_TIERS_PAYANT_ID')),
      noms: s.getRange().map((r) => r.get('str_NAME') + ' ' + r.get('str_FULLNAME')), saisie: saisie ? saisie.getValue() : null, charge: s.isLoading() }; });
  const attendreCharge = async () => { await p.waitForTimeout(300); await p.waitForFunction(() => !Ext.ComponentQuery.query('tierspayantmanager')[0].getStore().isLoading(), null, { timeout: 30000 }); await p.waitForTimeout(300); };
  /* clic sur la barre a une fraction de sa largeur ; page attendue calculee comme l'utilisateur la lit */
  const cliquerBarre = async (frac) => {
    const id = await p.evaluate(() => Ext.ComponentQuery.query('tierspayantmanager')[0].down('pagingtoolbar').displayItem.getEl().id);
    const barre = p.locator('#' + id);
    const bb = await barre.boundingBox();
    const x = Math.min(bb.x + bb.width - 1, bb.x + bb.width * frac);
    await p.mouse.click(x, bb.y + bb.height / 2);
    await attendreCharge();
    return { position: x - bb.x, largeur: bb.width };
  };
  const pageAttendue = (pos, largeur, total, taille) => { const pages = Math.ceil(total / taille); return Math.min(pages, Math.max(1, Math.ceil(pos / (largeur / pages)))); };
  const pageService = async (page, taille, recherche) => {
    const u = vues.BASE + '/api/v1/tierspayant/list?page=' + page + '&start=' + ((page - 1) * taille) + '&limit=' + taille + '&search_value=' + encodeURIComponent(recherche || '') + '&lg_TYPE_TIERS_PAYANT_ID=';
    const j = await (await ctx.request.get(u)).json();
    return j.results.map((r) => r.lg_TIERS_PAYANT_ID);
  };

  try {
    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await vues.ouvrirMenu(p, 'GESTION DES TIERS-PAYANTS', 'Tiers-payants');
    await p.waitForFunction(() => Ext.getCmp('rechecher') && Ext.getCmp('rechecher').isVisible(true), null, { timeout: 60000 });
    await attendreCharge();
    const e0 = await etat();
    ok('Préparation : liste chargée sur plusieurs pages', e0.total > e0.taille * 3, e0.total + ' organismes, ' + e0.taille + ' par page');
    /* apparence (retour du 15/11 : « agrandir et centrer ») : barre large, texte lisible, centree entre le dernier
       bouton de la barre et son bord droit */
    const forme = await p.evaluate(() => { const tb = Ext.ComponentQuery.query('tierspayantmanager')[0].down('pagingtoolbar'), bar = tb.displayItem.getEl().dom;
      const rb = bar.getBoundingClientRect(), rt = tb.getEl().dom.getBoundingClientRect();
      const boutons = Array.from(tb.getEl().dom.querySelectorAll('.x-btn')).map((x) => x.getBoundingClientRect()).filter((r) => r.width && r.right <= rb.left);
      const gauche = boutons.length ? Math.max.apply(null, boutons.map((r) => r.right)) : rt.left;
      const texte = bar.querySelector('.x-progress-text');
      return { largeur: Math.round(rb.width), hauteur: Math.round(rb.height), police: parseFloat(getComputedStyle(texte).fontSize), ecart: Math.round(((rb.left + rb.right) / 2) - ((gauche + rt.right) / 2)), texte: texte.textContent.trim() }; });
    ok('Apparence : barre de pagination large (≥ 300 px), texte de 13 px, centrée dans l’espace libre (± 15 px)', forme.largeur >= 300 && forme.police >= 13 && Math.abs(forme.ecart) <= 15 && /Page/.test(forme.texte), JSON.stringify(forme));

    /* 1. sans filtre, trois endroits de la barre */
    for (const frac of [0.25, 0.75, 1]) {
      const n = demandes.length;
      const { position, largeur } = await cliquerBarre(frac);
      const e = await etat(), attendu = pageAttendue(position, largeur, e0.total, e0.taille);
      const d = demandes.slice(n).pop();
      ok('Clic à ' + Math.round(frac * 100) + ' % de la barre : page ' + attendu + ' demandée et affichée', e.page === attendu && d && d.get('page') === String(attendu) && d.get('start') === String((attendu - 1) * e0.taille),
        'page ' + e.page + ', demande ' + (d ? d.toString() : 'aucune'));
      const service = await pageService(attendu, e0.taille, '');
      ok('Rapprochement (page ' + attendu + ') : organismes affichés = page du service, même ordre ; saisie de la barre = ' + attendu,
        JSON.stringify(service) === JSON.stringify(e.ids) && Number(e.saisie) === attendu, e.ids.length + ' / ' + service.length + ' ; saisie ' + e.saisie);
    }

    /* 2. avec une recherche qui tient sur plusieurs pages : le clic garde le filtre */
    const lettre = 'A';
    await vues.saisir(p, '#rechecher', lettre);
    await p.locator('.x-panel .x-btn').filter({ visible: true }).filter({ hasText: /^\s*rechercher\s*$/ }).first().click();
    await attendreCharge();
    const ef = await etat();
    ok('Recherche « ' + lettre + ' » : repart de la page 1, total filtré', ef.page === 1 && ef.total > ef.taille && ef.total < e0.total, 'page ' + ef.page + ', total ' + ef.total);
    const n2 = demandes.length;
    const { position, largeur } = await cliquerBarre(0.6);
    const e2 = await etat(), att2 = pageAttendue(position, largeur, ef.total, ef.taille), d2 = demandes.slice(n2).pop();
    ok('Clic sur la barre pendant la recherche : la recherche est gardée (même total, demande filtrée), page ' + att2,
      e2.total === ef.total && e2.page === att2 && d2 && d2.get('search_value') === lettre, 'total ' + e2.total + ', page ' + e2.page + ', demande ' + (d2 ? d2.toString() : 'aucune'));
    const service2 = await pageService(att2, ef.taille, lettre);
    ok('Rapprochement (recherche, page ' + att2 + ') : organismes affichés = page filtrée du service ; tous contiennent « ' + lettre + ' »',
      JSON.stringify(service2) === JSON.stringify(e2.ids) && e2.noms.every((x) => x.toUpperCase().indexOf(lettre) >= 0), e2.ids.length + ' / ' + service2.length);

    /* 3. nouvelle recherche depuis une page avancee : page 1 */
    const champ = p.locator('#rechecher input, input#rechecher-inputEl').first();
    await champ.click();
    await p.keyboard.press('Control+A');
    await p.keyboard.press('Backspace');
    await champ.press('Enter');
    await attendreCharge();
    const e3 = await etat();
    ok('Nouvelle recherche (touche Entrée) depuis la page ' + e2.page + ' : page 1, liste complète', e3.page === 1 && e3.total === e0.total, 'page ' + e3.page + ', total ' + e3.total);
    ok('Aucune demande partie avec NaN', demandes.every((d) => !/NaN/.test(d.toString())), demandes.filter((d) => /NaN/.test(d.toString())).map(String).join(' | '));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Déroulement', false, e.stack);
  } finally {
    await b.close();
    const n = res.filter(Boolean).length;
    console.log(n + '/' + res.length + (n === res.length ? ' OK' : ' ÉCHEC'));
    process.exit(n === res.length ? 0 : 1);
  }
})();
