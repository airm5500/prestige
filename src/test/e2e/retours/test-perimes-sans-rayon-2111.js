/* PLAN DU 21/11, POINT 17 (defaut suspecte) : un produit sans rayon, sans grossiste ou sans famille disparaissait
 * de « Recherche périmés » (GESTION DU STOCK), a cause de jointures strictes. Compte e2e, base de test.
 * Jeu d'essai : trois produits qui ont des lots perimes en stock, pris dans la base ; on retire au premier son rayon,
 * au deuxieme son grossiste, au troisieme sa famille ; valeurs d'origine remises a la fin.
 * Rapprochement, ligne par ligne :
 *  - base (jointures externes) = total de l'ecran = API = badge (perimes/count) = CSV = PDF ;
 *  - les trois lots sont a l'ecran, avec « (sans rayon) », « (sans grossiste) », « (sans famille) » ;
 *  - totaux du bas (stock, valeurs) = sommes de la base ;
 *  - filtre par le rayon d'origine du premier : son lot n'y est plus, les autres lots de ce rayon si ;
 *  - aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const fs = require('fs');
const editions = require('../support/editions');
const { connexion, ouvrirMenu, cliquer, saisir } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();

/* lots attendus : memes regles que la recherche, sans filtre (perimes jusqu'a aujourd'hui), jointures externes */
const SQL_LOTS = (emp) => `FROM t_lot l JOIN t_famille f ON f.lg_FAMILLE_ID = l.lg_FAMILLE_ID
  JOIN t_famille_stock fs ON fs.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND fs.str_STATUT = 'enable' AND fs.int_NUMBER_AVAILABLE > 0 AND fs.lg_EMPLACEMENT_ID = '${emp}'
  WHERE l.dt_PEREMPTION IS NOT NULL AND l.int_NUM_LOT IS NOT NULL AND l.current_stock > 0 AND f.str_STATUT = 'enable'
  AND l.dt_PEREMPTION < CURDATE() + INTERVAL 1 DAY`;

(async () => {
  const emp = q(`SELECT lg_EMPLACEMENT_ID FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN}'`);
  /* trois produits distincts, chacun avec un lot perime en stock et un rayon, un grossiste et une famille */
  const choisis = q(`SELECT f.lg_FAMILLE_ID, f.int_CIP, f.lg_ZONE_GEO_ID, f.lg_GROSSISTE_ID, f.lg_FAMILLEARTICLE_ID ${SQL_LOTS(emp)}
    AND f.lg_ZONE_GEO_ID IS NOT NULL AND f.lg_GROSSISTE_ID IS NOT NULL AND f.lg_FAMILLEARTICLE_ID IS NOT NULL
    GROUP BY f.lg_FAMILLE_ID ORDER BY MAX(l.dt_PEREMPTION) DESC LIMIT 3`).split('\n').filter(Boolean).map((l) => {
    const [id, cip, zone, grossiste, famille] = l.split('\t'); return { id, cip, zone, grossiste, famille };
  });
  const [A, B, C] = choisis;
  const remettre = () => {
    if (A) { q(`UPDATE t_famille SET lg_ZONE_GEO_ID = '${A.zone}' WHERE lg_FAMILLE_ID = '${A.id}'`); }
    if (B) { q(`UPDATE t_famille SET lg_GROSSISTE_ID = '${B.grossiste}' WHERE lg_FAMILLE_ID = '${B.id}'`); }
    if (C) { q(`UPDATE t_famille SET lg_FAMILLEARTICLE_ID = '${C.famille}' WHERE lg_FAMILLE_ID = '${C.id}'`); }
  };
  const b = await ENV_E2E.lancer(chromium);
  const erreurs = [];
  try {
    ok('Précondition : trois produits avec un lot périmé en stock', choisis.length === 3, JSON.stringify(choisis.map((x) => x.cip)));
    q(`UPDATE t_famille SET lg_ZONE_GEO_ID = NULL WHERE lg_FAMILLE_ID = '${A.id}';`
      + `UPDATE t_famille SET lg_GROSSISTE_ID = NULL WHERE lg_FAMILLE_ID = '${B.id}';`
      + `UPDATE t_famille SET lg_FAMILLEARTICLE_ID = NULL WHERE lg_FAMILLE_ID = '${C.id}'`);
    const attendus = q(`SELECT l.lg_LOT_ID, f.lg_FAMILLE_ID, l.current_stock, l.int_NUMBER * f.int_PAF, l.int_NUMBER * f.int_PRICE ${SQL_LOTS(emp)}`)
      .split('\n').filter(Boolean).map((l) => l.split('\t'));
    const idsBase = new Set(attendus.map((l) => l[0]));
    const lotsDe = (x) => attendus.filter((l) => l[1] === x.id).map((l) => l[0]);
    const sommes = q(`SELECT SUM(l.current_stock), SUM(l.current_stock * f.int_PAF), SUM(l.current_stock * f.int_PRICE) ${SQL_LOTS(emp)}`).split('\t').map(Number);

    const ctx = await b.newContext({ viewport: { width: 1600, height: 900 }, acceptDownloads: true });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => erreurs.push(e.message));
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');

    /* ecran, par le menu */
    await ouvrirMenu(p, 'GESTION DU STOCK', 'Recherche périmés');
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('peremptionquery gridpanel')[0]; return g && g.isVisible(true) && !g.getStore().isLoading() && g.getStore().getTotalCount() >= 0; }, null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    const totalEcran = await p.evaluate(() => Ext.ComponentQuery.query('peremptionquery gridpanel')[0].getStore().getTotalCount());
    ok('Écran : nombre de lots = base (jointures externes)', totalEcran === attendus.length, totalEcran + ' à l\'écran, ' + attendus.length + ' en base');
    const pied = await p.evaluate(() => ['stock', 'achat', 'vente'].map((i) => { const c = Ext.ComponentQuery.query('peremptionquery #' + i)[0]; return c ? String(c.getValue()).replace(/\D/g, '') : null; }));
    ok('Écran : totaux du bas (stock, achat, vente) = base', pied[0] === String(sommes[0]) && pied[1] === String(sommes[1]) && pied[2] === String(sommes[2]), JSON.stringify([pied, sommes]));

    const ligneEcran = async (x) => {
      const charge = p.waitForResponse((r) => /fichearticle\/perimes\?/.test(r.url()), { timeout: 30000 });
      await saisir(p, 'peremptionquery #query', x.cip);
      await cliquer(p, 'peremptionquery #rechercher'); await charge;
      await p.waitForTimeout(800);
      return p.evaluate(() => {
        const g = Ext.ComponentQuery.query('peremptionquery gridpanel')[0];
        const col = (d) => g.query('gridcolumn').find((c) => c.dataIndex === d);
        return g.getStore().getRange().map((r) => ({ cip: String(r.get('codeCip')), rayon: g.getView().getCell(r, col('libelleRayon')).dom.innerText.trim(),
          grossiste: g.getView().getCell(r, col('libelleGrossiste')).dom.innerText.trim(), famille: g.getView().getCell(r, col('libelleFamille')).dom.innerText.trim() }));
      });
    };
    for (const [x, champ, texte] of [[A, 'rayon', '(sans rayon)'], [B, 'grossiste', '(sans grossiste)'], [C, 'famille', '(sans famille)']]) {
      const lignes = await ligneEcran(x);
      const lots = lotsDe(x);
      const siennes = lignes.filter((l) => l.cip === x.cip);
      ok('Écran : les ' + lots.length + ' lot(s) du produit ' + x.cip + ' sont listés', lots.length > 0 && siennes.length === lots.length, JSON.stringify({ lots, ecran: lignes }));
      ok('Écran : « ' + texte + ' » sur ces lignes', siennes.length > 0 && siennes.every((l) => l[champ] === texte), JSON.stringify(siennes));
    }

    /* API, badge, CSV, PDF : memes lots */
    const api = await p.evaluate(() => fetch('../api/v1/fichearticle/perimes?nbreMois=0&start=0&limit=100000').then((r) => r.json()));
    const idsApi = new Set((api.data || []).map((l) => l.lgLOTID));
    ok('API : mêmes lots que la base', api.total === attendus.length && idsApi.size === idsBase.size && [...idsBase].every((id) => idsApi.has(id)),
      api.total + ' / ' + idsApi.size + ' / ' + idsBase.size);
    const badge = await p.evaluate(() => fetch('../api/v1/fichearticle/perimes/count?nbreMois=0').then((r) => r.json()));
    ok('Badge (perimes/count) = base', badge.total === attendus.length, badge.total);
    const produits = await p.evaluate(() => fetch('../api/v1/fichearticle/perimes/produits/count?nbreMois=0').then((r) => r.json()));
    const nbProduits = new Set(attendus.map((l) => l[1])).size;
    ok('Nombre de produits (création d\'inventaire) = base', JSON.stringify(produits).indexOf(String(nbProduits)) >= 0, JSON.stringify(produits) + ' attendu ' + nbProduits);
    const csv = await p.evaluate(() => fetch('../api/v1/fichearticle/perimes/csv?nbreMois=0').then((r) => r.text()));
    const lignesCsv = csv.split(/\r?\n/).filter((l) => /\d/.test(l));
    for (const [x, texte] of [[A, '(sans rayon)'], [B, '(sans grossiste)'], [C, '(sans famille)']]) {
      ok('CSV : produit ' + x.cip + ' présent avec « ' + texte + ' »', lignesCsv.some((l) => l.indexOf(x.cip) >= 0 && l.indexOf(texte) >= 0));
    }
    /* PDF : bouton « imprimer » de l'ecran, filtre vide */
    await cliquer(p, 'peremptionquery #query'); await p.keyboard.press('Control+A'); await p.keyboard.press('Delete'); await p.keyboard.press('Tab');
    const rechargee = p.waitForResponse((r) => /fichearticle\/perimes\?/.test(r.url()), { timeout: 30000 });
    await cliquer(p, 'peremptionquery #rechercher'); await rechargee; await p.waitForTimeout(800);
    ok('Écran : filtre vidé, de nouveau tous les lots', await p.evaluate(() => Ext.ComponentQuery.query('peremptionquery gridpanel')[0].getStore().getTotalCount()) === attendus.length);
    const redirige = ctx.waitForEvent('response', { predicate: (r) => /BalancePdfServlet/.test(r.url()) && r.status() === 302, timeout: 120000 });
    const popup = ctx.waitForEvent('page', { timeout: 30000 }).catch(() => null);
    await cliquer(p, 'peremptionquery #imprimer');
    const rp = await redirige;
    const pg = await popup; if (pg) { await pg.close().catch(() => {}); }
    await p.waitForTimeout(800);
    const fichier = editions.fichierEdition(rp.headers().location || '');
    const texte = fs.existsSync(fichier) ? execFileSync('pdftotext', ['-enc', 'UTF-8', '-layout', fichier, '-'], { encoding: 'utf8' }) : '';
    ok('PDF : les trois produits y sont, avec « (sans rayon) »', [A, B, C].every((x) => texte.indexOf(x.cip) >= 0) && texte.indexOf('(sans rayon)') >= 0, texte.length + ' caractères');
    /* la colonne CIP du PDF coupe a 10 caracteres (defaut de mise en page distinct, deja present) : 10 premiers */
    const absentsPdf = (api.data || []).filter((l) => texte.indexOf(String(l.codeCip).slice(0, 10)) < 0).map((l) => l.codeCip);
    const coupes = (api.data || []).filter((l) => String(l.codeCip).length > 10 && texte.indexOf(String(l.codeCip)) < 0).map((l) => l.codeCip);
    if (coupes.length) { console.log('  (PDF : CIP coupés à 10 caractères : ' + coupes.join(', ') + ')'); }
    ok('PDF : chaque produit de la liste y figure', (api.data || []).length > 0 && absentsPdf.length === 0, absentsPdf.slice(0, 5).join(', '));

    /* filtres : par le rayon d'origine de A, A n'y est plus ; par le rayon de B (sans grossiste), B y est */
    for (const [x, dans] of [[A, false], [B, true]]) {
      const filtre = await p.evaluate((z) => fetch('../api/v1/fichearticle/perimes?nbreMois=0&start=0&limit=100000&codeRayon=' + z).then((r) => r.json()), x.zone);
      const attendusRayon = q(`SELECT COUNT(*) ${SQL_LOTS(emp)} AND f.lg_ZONE_GEO_ID = '${x.zone}'`);
      const present = (filtre.data || []).some((l) => lotsDe(x).includes(l.lgLOTID));
      ok('Filtre par le rayon ' + (dans ? 'de B : B y est' : "d'origine de A : A n'y est plus") + ', total = base', present === dans && String(filtre.total) === attendusRayon,
        filtre.total + ' / ' + attendusRayon);
    }
    const parGrossiste = await p.evaluate((g) => fetch('../api/v1/fichearticle/perimes?nbreMois=0&start=0&limit=100000&codeGrossiste=' + g).then((r) => r.json()), A.grossiste);
    const attendusGrossiste = q(`SELECT COUNT(*) ${SQL_LOTS(emp)} AND f.lg_GROSSISTE_ID = '${A.grossiste}'`);
    ok('Filtre par le grossiste de A (sans rayon) : A y est, total = base', (parGrossiste.data || []).some((l) => lotsDe(A).includes(l.lgLOTID)) && String(parGrossiste.total) === attendusGrossiste,
      parGrossiste.total + ' / ' + attendusGrossiste);
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
    remettre();
    ok('Produits remis à l\'identique', choisis.length === 3
      && q(`SELECT COUNT(*) FROM t_famille WHERE (lg_FAMILLE_ID = '${A.id}' AND lg_ZONE_GEO_ID = '${A.zone}') OR (lg_FAMILLE_ID = '${B.id}' AND lg_GROSSISTE_ID = '${B.grossiste}') OR (lg_FAMILLE_ID = '${C.id}' AND lg_FAMILLEARTICLE_ID = '${C.famille}')`) === '3');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
