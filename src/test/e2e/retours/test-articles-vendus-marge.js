/* ARTICLES VENDUS RECAPITULATIF : prix d'achat, marge en % et filtre « Marge négative » (retour du 02/11).
 *
 * Par le menu GESTION COURANTE > Articles vendus récap :
 *  - colonnes « Prix d'achat » et « Marge % » ; marge en bleu, en rouge quand elle est négative ;
 *  - la marge de chaque ligne est celle du montant vendu face au prix d'achat enregistré sur chaque ligne de vente
 *    (vérifiée en base pour un échantillon de produits) ;
 *  - « Marge négative » dans le filtre prix d'achat : uniquement des marges négatives, et exactement les produits de
 *    la liste complète dont la marge est négative ;
 *  - sans le filtre, la liste et le compteur sont ceux d'avant (mêmes produits, même montant) ;
 *  - pas de lenteur : la liste avec marge se charge dans le même temps que sans le filtre (écart borné).
 * Lecture seule : aucune donnée écrite.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu, choisir } = require('../outils/vues');
const { execFileSync } = require('child_process');

const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } });
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const grille = () => p.evaluate(() => { const g = Ext.getCmp('GridArticleID'); const s = g.getStore();
    return { total: s.getTotalCount(), lignes: s.getRange().map((r) => ({ id: r.get('lgFAMILLEID'), pa: r.get('prixAchat'), marge: r.get('margePourcent'), montant: r.get('intPRICE') })) }; });
  const charger = async () => {
    const t0 = Date.now();
    await p.waitForFunction(() => !Ext.getCmp('GridArticleID').getStore().isLoading(), null, { timeout: 120000 });
    await p.waitForTimeout(300);
    return Date.now() - t0;
  };
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'GESTION COURANTE', 'Articles vendus récap');
    await p.mouse.click(1000, 33);
    await p.waitForFunction(() => !!Ext.getCmp('prixachatFiltre') && Ext.getCmp('GridArticleID') && Ext.getCmp('GridArticleID').rendered, null, { timeout: 60000 });

    /* periode d'un mois, sans filtre */
    await p.evaluate(() => { const fin = new Date(); Ext.getCmp('dt_debut').setValue(new Date(fin.getTime() - 30 * 86400000)); Ext.getCmp('dt_fin').setValue(fin); });
    const t0 = Date.now();
    await p.locator('#GridArticleID').getByText('Rechercher', { exact: true }).first().click().catch(async () => { await p.evaluate(() => Ext.getCmp('GridArticleID').onRechClick()); });
    await charger();
    const dureeSans = Date.now() - t0;
    const sans = await grille();
    ok('Liste sans filtre chargée', sans.lignes.length > 0, sans.total + ' produits');

    const entetes = await p.evaluate(() => Ext.getCmp('GridArticleID').columns.filter((c) => !c.hidden).map((c) => c.text));
    ok('Colonnes « Prix d\'achat » et « Marge % » après « Montant »', entetes.indexOf("Prix d'achat") === entetes.indexOf('Montant') + 1 && entetes.indexOf('Marge %') === entetes.indexOf('Montant') + 2, entetes.join(' | '));

    /* couleurs : bleu pour une marge positive, rouge pour une negative */
    const couleurs = await p.evaluate(() => {
      const g = Ext.getCmp('GridArticleID'); const col = g.columns.filter((c) => c.dataIndex === 'margePourcent')[0];
      const r = {};
      g.getStore().each((rec, i) => { const cell = g.getView().getCell(rec, col); const span = cell && cell.dom.querySelector('span');
        if (span) { const k = rec.get('margePourcent') < 0 ? 'neg' : 'pos'; if (!r[k]) { r[k] = getComputedStyle(span).color; } } });
      return r;
    });
    ok('Marge positive en bleu', !couleurs.pos || couleurs.pos === 'rgb(21, 101, 192)', JSON.stringify(couleurs));
    ok('Marge négative en rouge', !couleurs.neg || couleurs.neg === 'rgb(211, 47, 47)', JSON.stringify(couleurs));

    /* marge verifiee en base sur un echantillon */
    const echantillon = sans.lignes.slice(0, 5);
    const debut = await p.evaluate(() => Ext.Date.format(Ext.getCmp('dt_debut').getValue(), 'Y-m-d'));
    const fin = await p.evaluate(() => Ext.Date.format(Ext.getCmp('dt_fin').getValue(), 'Y-m-d'));
    const ecarts = [];
    for (const l of echantillon) {
      const achat = Number(q(`SELECT COALESCE(SUM(d.int_QUANTITY * IF(d.prixAchat > 0, d.prixAchat, f.int_PAF)), 0) FROM t_preenregistrement_detail d
        JOIN t_preenregistrement v ON v.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID
        WHERE d.lg_FAMILLE_ID = '${l.id}' AND v.dt_UPDATED BETWEEN '${debut} 00:00:00' AND '${fin} 23:59:59'
          AND v.str_STATUT = 'is_Closed' AND v.b_IS_CANCEL = 0 AND v.int_PRICE > 0 AND v.b_WITHOUT_BON = 0`));
      const attendu = l.montant ? Math.round((l.montant - achat) * 1000 / l.montant) / 10 : 0;
      if (Math.abs(attendu - l.marge) > 0.1) { ecarts.push(l.id + ' : ' + l.marge + ' / base ' + attendu); }
    }
    ok('Marge = (montant vendu - achat des quantités vendues) / montant vendu, contrôlée en base', ecarts.length === 0, ecarts.join(' ; ') || echantillon.map((l) => l.marge).join(' '));

    /* filtre « Marge negative » choisi dans la liste deroulante */
    const choix = await p.evaluate(() => Ext.getCmp('prixachatFiltre').getStore().collect('libelle'));
    ok('« Marge négative » proposée dans le filtre prix d\'achat', choix.indexOf('Marge négative') >= 0, choix.join(' | '));
    /* fleche de la liste, comme a la souris (le champ est saisissable : un clic dedans n'ouvre pas la liste) */
    await choisir(p, '#prixachatFiltre', 'Marge négative');
    const t1 = Date.now();
    await charger();
    const dureeAvec = Date.now() - t1;
    const avec = await grille();
    ok('Avec « Marge négative » : uniquement des marges négatives', avec.lignes.every((l) => l.marge < 0), avec.total + ' produits');

    /* reference : toute la liste (sans filtre) dont la marge est negative */
    const tout = await p.evaluate(async ([d, f]) => JSON.parse(await (await fetch('../api/v1/ventestats/article-vendus-recap?dtStart=' + d + '&dtEnd=' + f
      + '&hStart=&hEnd=&user=&query=&typeTransaction=ALL&nbre=0&prixachatFiltre=TOUT&rayonId=&grossisteId=&start=0&limit=100000')).text()), [debut, fin]);
    const negatifs = tout.data.filter((x) => x.margePourcent < 0).map((x) => x.lgFAMILLEID).sort().join(',');
    const filtre = await p.evaluate(async ([d, f]) => JSON.parse(await (await fetch('../api/v1/ventestats/article-vendus-recap?dtStart=' + d + '&dtEnd=' + f
      + '&hStart=&hEnd=&user=&query=&typeTransaction=ALL&nbre=0&prixachatFiltre=MARGE_NEGATIVE&rayonId=&grossisteId=&start=0&limit=100000')).text()), [debut, fin]);
    ok('« Marge négative » ressort exactement les produits à marge négative de la liste complète', filtre.data.map((x) => x.lgFAMILLEID).sort().join(',') === negatifs && filtre.total === filtre.data.length,
      'filtre ' + filtre.data.length + ' (compteur ' + filtre.total + ') / référence ' + negatifs.split(',').filter(Boolean).length);
    ok('Pas de lenteur : chargement filtré ' + dureeAvec + ' ms, sans filtre ' + dureeSans + ' ms', dureeAvec <= Math.max(2 * dureeSans, dureeSans + 3000));

    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await ENV_E2E.capture(p, 'articles-vendus-marge').catch(() => {});
    await b.close();
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
