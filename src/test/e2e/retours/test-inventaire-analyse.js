/* Analyse d'inventaire (retours du 13/09) jouee a l'ecran :
 *  - liste des inventaires : boutons « analyse simple » et « analyse avancee » sur la ligne ;
 *  - analyse simple : emplacements du plus gros ecart au plus petit, edition PDF avec l'en-tete de l'officine,
 *    le nombre de produits et de produits touches, la valorisation avant / apres puis l'ecart, cinq emplacements
 *    critiques et dix produits a verifier ;
 *  - analyse avancee : filtre produit et filtre sur le ratio avec operateur dans l'onglet de detail, onglet
 *    « Synthese & recommandations » avec ses quatre sections, edition PDF de la synthese.
 * L'inventaire pose est retire a la fin ; aucun stock n'est modifie (l'analyse ne fait que lire). */
const { chromium } = require('playwright-core');
const { execFileSync, execSync } = require('child_process');
const fs = require('fs');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 320) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const ID = 'E2E-INV-ANALYSE';
const TMP = '/tmp/inv-analyse'; fs.mkdirSync(TMP, { recursive: true });

/* Les 8 zones qui ont le plus de produits utilisables (au lieu de noms de zones d'un autre banc). */
function zonesDuBanc() {
  return q("SELECT GROUP_CONCAT(CONCAT('''', id, '''')) FROM (SELECT z.lg_ZONE_GEO_ID id FROM t_famille f JOIN t_zone_geographique z ON z.lg_ZONE_GEO_ID=f.lg_ZONE_GEO_ID"
    + " JOIN t_famille_stock s ON s.lg_FAMILLE_ID=f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID='1'"
    + " WHERE f.str_STATUT='enable' AND f.int_PAF>0 AND f.int_PRICE>0 AND s.int_NUMBER_AVAILABLE>5"
    + " GROUP BY z.lg_ZONE_GEO_ID ORDER BY COUNT(*) DESC, z.lg_ZONE_GEO_ID LIMIT 8) t") || "''";
}
function poser() {
  exec("DELETE FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID='" + ID + "'; DELETE FROM t_inventaire WHERE lg_INVENTAIRE_ID='" + ID + "';"
    + "INSERT INTO t_inventaire (lg_INVENTAIRE_ID, str_NAME, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED, dt_UPDATED, lg_USER_ID, lg_EMPLACEMENT_ID)"
    + " SELECT '" + ID + "', 'E2E ANALYSE', 'E2E analyse inventaire', 'emplacement', 'enable', NOW(), NOW(), lg_USER_ID, '1' FROM t_user WHERE str_LOGIN='" + (process.env.E2E_LOGIN || 'admin') + "';"
    /* 12 produits par zone sur 8 zones : ecarts negatifs (RAND < 0.3), positifs (RAND < 0.5) ou nuls */
    + "INSERT INTO t_inventaire_famille (lg_INVENTAIRE_ID, lg_FAMILLE_ID, int_NUMBER, int_NUMBER_INIT, str_STATUT, dt_CREATED, dt_UPDATED, bool_INVENTAIRE, str_UPDATED_ID, lg_FAMILLE_STOCK_ID)"
    + " SELECT '" + ID + "', x.lg_FAMILLE_ID,"
    + "   CASE WHEN x.rn % 3 = 0 THEN GREATEST(0, x.stock - 1 - (x.rn % 4)) WHEN x.rn % 3 = 1 THEN x.stock + 1 + (x.rn % 3) ELSE x.stock END,"
    + "   x.stock, 'enable', NOW(), NOW(), 1, '', x.lg_FAMILLE_STOCK_ID"
    + " FROM (SELECT f.lg_FAMILLE_ID, s.lg_FAMILLE_STOCK_ID, s.int_NUMBER_AVAILABLE AS stock, z.str_LIBELLEE,"
    + "        ROW_NUMBER() OVER (PARTITION BY z.lg_ZONE_GEO_ID ORDER BY f.int_PAF DESC) AS rn"
    + "       FROM t_famille f JOIN t_zone_geographique z ON z.lg_ZONE_GEO_ID=f.lg_ZONE_GEO_ID"
    + "        JOIN t_famille_stock s ON s.lg_FAMILLE_ID=f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID='1'"
    + "       WHERE f.str_STATUT='enable' AND f.int_PAF>0 AND f.int_PRICE>0 AND s.int_NUMBER_AVAILABLE>5"
    + "        AND z.lg_ZONE_GEO_ID IN (" + zonesDuBanc() + ")) x"
    + " WHERE x.rn <= 12;");
}
function retirer() {
  exec("DELETE FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID='" + ID + "'; DELETE FROM t_inventaire WHERE lg_INVENTAIRE_ID='" + ID + "';");
}
/* Le texte d'une section du PDF, jusqu'a la section suivante. */
function section(texte, titre) {
  const lignes = texte.split('\n');
  const debut = lignes.findIndex(l => l.includes(titre));
  if (debut < 0) { return []; }
  const suite = [];
  for (let i = debut + 2; i < lignes.length; i++) {
    if (/^[A-ZÉÈÀÇ' ]{8,}$/.test(lignes[i].trim()) && lignes[i].trim() === lignes[i].trim().toUpperCase() && lignes[i].trim().length > 10 && !lignes[i].includes('CFA')) { break; }
    if (lignes[i].trim() !== '') { suite.push(lignes[i].trim()); }
  }
  return suite;
}

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  try {
    poser();
    const attendu = q("SELECT COUNT(*), SUM(int_NUMBER<>int_NUMBER_INIT), COUNT(DISTINCT z.str_LIBELLEE) FROM t_inventaire_famille i JOIN t_famille f ON f.lg_FAMILLE_ID=i.lg_FAMILLE_ID JOIN t_zone_geographique z ON z.lg_ZONE_GEO_ID=f.lg_ZONE_GEO_ID WHERE i.lg_INVENTAIRE_ID='" + ID + "'").split('\t').map(Number);
    ok('Jeu d essai : produits sur plusieurs emplacements, ecarts en plus et en moins', attendu[0] >= 60 && attendu[1] > 10 && attendu[2] >= 7, attendu.join('/'));

    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', process.env.E2E_LOGIN || 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 30000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('inventaire', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('inventaire').length > 0, null, { timeout: 20000 });
    await p.waitForTimeout(2500);

    /* les deux boutons d analyse sont proposes sur la ligne */
    const colonnes = await p.evaluate(() => Ext.ComponentQuery.query('inventaire')[0].headerCt.getGridColumns()
      .filter(c => c.xtype === 'actioncolumn' && !c.isHidden() && (c.items || []).some(i => /analyse/i.test(i.tooltip || '')))
      .map(c => c.items[0].tooltip));
    ok('Liste : les boutons « analyse simple » et « analyse avancee » sont visibles', colonnes.length === 2 && colonnes.some(t => /simple/i.test(t)) && colonnes.some(t => /avanc/i.test(t)), JSON.stringify(colonnes));

    /* ---------------------------------------------- analyse simple, ouverte par le bouton de la ligne */
    await p.evaluate((id) => {
      const g = Ext.ComponentQuery.query('inventaire')[0];
      const i = g.getStore().findBy(r => r.get('lg_INVENTAIRE_ID') === id);
      const col = g.headerCt.getGridColumns().find(c => c.xtype === 'actioncolumn' && (c.items || []).some(x => /analyse simple/i.test(x.tooltip || '')));
      col.items[0].handler.call(g.up('panel') || g, g, i);
    }, ID);
    await p.waitForFunction(() => Ext.ComponentQuery.query('analyseinventaire').length > 0, null, { timeout: 20000 });
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('analyseinventaire gridpanel')[0]; return g && g.getStore().getCount() > 0; }, null, { timeout: 30000 });
    await p.waitForTimeout(1200);
    const simple = await p.evaluate(() => {
      const g = Ext.ComponentQuery.query('analyseinventaire gridpanel')[0];
      const ecarts = g.getStore().getRange().map(r => Math.abs(r.get('ecartValeurAchat')));
      return { lignes: ecarts.length, ecarts: ecarts, rapport: Ext.ComponentQuery.query('analyseinventaire #complianceReport')[0].getValue(),
        pdf: !!Ext.ComponentQuery.query('analyseinventaire #imprimerAnalyse')[0], excel: !!Ext.ComponentQuery.query('analyseinventaire #exporterAnalyse')[0] };
    });
    const trie = simple.ecarts.every((v, i, t) => i === 0 || t[i - 1] >= v);
    ok('Analyse simple : emplacements du plus gros ecart au plus petit', simple.lignes >= 7 && trie, simple.ecarts.slice(0, 5).join(' > '));
    ok('Analyse simple : le rapport de conformite annonce les produits modifies et le taux', /produit\(s\) modifié\(s\) sur \d+ au total \([\d,.]+ %\)/.test(simple.rapport), simple.rapport);
    ok('Analyse simple : boutons PDF et Excel presents', simple.pdf && simple.excel);
    await p.screenshot({ path: TMP + '/analyse-simple.png' });

    /* edition PDF de l analyse simple */
    const pdfSimple = await p.evaluate(async (id) => { const r = await fetch('../api/v1/analyse-inventaire-pdf?inventaireId=' + id + '&inventaireName=E2E&filterType=all'); const b = await r.arrayBuffer(); return { statut: r.status, type: r.headers.get('content-type'), dispo: r.headers.get('content-disposition'), octets: Array.from(new Uint8Array(b)) }; }, ID);
    fs.writeFileSync(TMP + '/analyse-simple.pdf', Buffer.from(pdfSimple.octets));
    ok('Edition simple : PDF servi en flux dans l onglet (inline)', pdfSimple.statut === 200 && /application\/pdf/.test(pdfSimple.type || '') && /inline/.test(pdfSimple.dispo || ''), pdfSimple.statut + ' ' + pdfSimple.type + ' ' + pdfSimple.dispo);
    const texte = execSync('pdftotext -layout ' + TMP + '/analyse-simple.pdf -', { encoding: 'utf8' });
    const officine = q("SELECT str_NOM_ABREGE FROM t_officine LIMIT 1");
    ok('Edition simple : en-tete de la pharmacie', texte.includes(officine) && /Imprimé le .* par /.test(texte), officine);
    ok('Edition simple : nombre de produits, produits touches et taux', /Nombre total d'articles\s+\d/.test(texte) && /Articles en écart\s+[\d ]+/.test(texte) && /Taux d'articles en écart\s+[\d,]+ %/.test(texte), (texte.match(/Nombre total d'articles.*/) || [''])[0]);
    ok('Edition simple : valorisation avant, apres, puis ecart global', /Valorisation avant inventaire\s+[-\d ]+CFA/.test(texte) && /Valorisation après inventaire\s+[-\d ]+CFA/.test(texte) && /Écart global\s+[-\d ]+CFA/.test(texte) && texte.indexOf("Valorisation avant") < texte.indexOf("Écart global"), (texte.match(/Écart global.*/) || [''])[0]);
    const vigilance = section(texte, 'POINTS DE VIGILANCE PAR EMPLACEMENT').filter(l => /CFA/.test(l));
    ok('Edition simple : cinq emplacements critiques, pas un seul', vigilance.length === 5, vigilance.length + ' -> ' + vigilance.slice(0, 2).join(' | '));
    const articles = section(texte, 'ARTICLES LES PLUS CRITIQUES').filter(l => /CFA/.test(l));
    ok('Edition simple : dix produits en points de vigilance', articles.length === 10, articles.length + ' -> ' + (articles[0] || ''));
    ok('Edition simple : detail par emplacement et total general', /DÉTAIL PAR EMPLACEMENT/.test(texte) && /TOTAL GÉNÉRAL/.test(texte));
    await p.evaluate(() => Ext.ComponentQuery.query('analyseinventaire')[0].close());
    await p.waitForTimeout(800);

    /* ---------------------------------------------- analyse avancee */
    await p.evaluate((id) => {
      const g = Ext.ComponentQuery.query('inventaire')[0];
      const i = g.getStore().findBy(r => r.get('lg_INVENTAIRE_ID') === id);
      const col = g.headerCt.getGridColumns().find(c => c.xtype === 'actioncolumn' && (c.items || []).some(x => /analyse avanc/i.test(x.tooltip || '')));
      col.items[0].handler.call(g, g, i);
    }, ID);
    await p.waitForFunction(() => Ext.ComponentQuery.query('analyseavancee').length > 0, null, { timeout: 20000 });
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('analyseavancee #detailGrid')[0]; return g && g.getStore().getCount() > 0; }, null, { timeout: 40000 });
    await p.waitForTimeout(1200);
    const onglets = await p.evaluate(() => Ext.ComponentQuery.query('analyseavancee tabpanel')[0].items.getRange().map(i => i.title));
    ok('Analyse avancee : les quatre onglets', onglets.length === 4 && /Détail Complet/.test(onglets[2]) && /Synthèse/.test(onglets[3]), JSON.stringify(onglets));

    /* onglet detail : filtre produit puis filtre sur le ratio */
    await p.evaluate(() => { const t = Ext.ComponentQuery.query('analyseavancee tabpanel')[0]; t.setActiveTab(2); });
    await p.waitForTimeout(600);
    const total = await p.evaluate(() => Ext.ComponentQuery.query('analyseavancee #detailGrid')[0].getStore().getCount());
    const cible = await p.evaluate(() => { const r = Ext.ComponentQuery.query('analyseavancee #detailGrid')[0].getStore().getAt(0); return { nom: r.get('nom'), cip: r.get('codeCip') }; });
    await p.fill('#' + await p.evaluate(() => Ext.ComponentQuery.query('analyseavancee #filtreProduit')[0].inputEl.id), cible.cip);
    await p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('analyseavancee #appliquerFiltresDetail')[0].id));
    await p.waitForTimeout(600);
    const parCip = await p.evaluate(() => { const s = Ext.ComponentQuery.query('analyseavancee #detailGrid')[0].getStore(); return { n: s.getCount(), cips: s.getRange().map(r => r.get('codeCip')), texte: Ext.ComponentQuery.query('analyseavancee #compteDetail')[0].text }; });
    ok('Onglet detail : le filtre produit ne garde que les lignes cherchees', parCip.n > 0 && parCip.n < total && parCip.cips.every(c => c === cible.cip) && /sur/.test(parCip.texte), parCip.n + '/' + total + ' ' + parCip.texte);

    /* ratio inferieur a 1,45 : les produits a marge faible */
    await p.evaluate(() => { Ext.ComponentQuery.query('analyseavancee #filtreProduit')[0].setValue(''); Ext.ComponentQuery.query('analyseavancee #operateurRatio')[0].setValue('lt'); Ext.ComponentQuery.query('analyseavancee #valeurRatio')[0].setValue(1.45); });
    await p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('analyseavancee #appliquerFiltresDetail')[0].id));
    await p.waitForTimeout(600);
    const parRatio = await p.evaluate(() => { const s = Ext.ComponentQuery.query('analyseavancee #detailGrid')[0].getStore(); return { n: s.getCount(), max: Math.max.apply(null, s.getRange().map(r => Number(r.get('ratioVA')))), texte: Ext.ComponentQuery.query('analyseavancee #compteDetail')[0].text }; });
    ok('Onglet detail : le filtre ratio « inférieur à 1,45 » ne garde que ces produits', parRatio.n > 0 && parRatio.n < total && parRatio.max < 1.45, parRatio.n + '/' + total + ' ratio max ' + parRatio.max);
    /* operateur superieur */
    await p.evaluate(() => { Ext.ComponentQuery.query('analyseavancee #operateurRatio')[0].setValue('gt'); Ext.ComponentQuery.query('analyseavancee #valeurRatio')[0].setValue(1.5); });
    await p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('analyseavancee #appliquerFiltresDetail')[0].id));
    await p.waitForTimeout(600);
    const parRatioSup = await p.evaluate(() => { const s = Ext.ComponentQuery.query('analyseavancee #detailGrid')[0].getStore(); return { n: s.getCount(), min: Math.min.apply(null, s.getRange().map(r => Number(r.get('ratioVA')))) }; });
    ok('Onglet detail : le filtre ratio « supérieur à 1,50 » ne garde que ces produits', parRatioSup.n > 0 && parRatioSup.min > 1.5, parRatioSup.n + ' ratio min ' + parRatioSup.min);
    await p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('analyseavancee #effacerFiltresDetail')[0].id));
    await p.waitForTimeout(600);
    ok('Onglet detail : « Effacer » remet toutes les lignes', await p.evaluate(() => Ext.ComponentQuery.query('analyseavancee #detailGrid')[0].getStore().getCount()) === total);
    await p.screenshot({ path: TMP + '/analyse-avancee-detail.png' });

    /* onglet synthese : quatre sections parlantes */
    await p.evaluate(() => { Ext.ComponentQuery.query('analyseavancee tabpanel')[0].setActiveTab(3); });
    await p.waitForTimeout(800);
    const synth = await p.evaluate(() => {
      const el = Ext.ComponentQuery.query('analyseavancee #summaryPanel')[0].getEl().dom;
      const titres = [];
      Array.prototype.forEach.call(el.querySelectorAll('h3'), (h) => titres.push(String(h.textContent)));
      return { texte: String(el.textContent), titres: titres, tables: el.querySelectorAll('table.si-table').length,
        recos: el.querySelectorAll('.si-reco li').length,
        bouton: Ext.ComponentQuery.query('analyseavancee #imprimerSynthese').length > 0 };
    });
    ok('Onglet synthese : les quatre sections', synth.titres.length === 4 && /1\. Récapitulatif global/.test(synth.titres[0]) && /2\. Points de vigilance/.test(synth.titres[1]) && /3\. Articles les plus critiques/.test(synth.titres[2]) && /4\. Recommandations/.test(synth.titres[3]), JSON.stringify(synth.titres));
    ok('Onglet synthese : recapitulatif achat / vente complet', /Nombre total d'articles/.test(synth.texte) && /Taux d'articles en écart/.test(synth.texte) && /Taux d'articles conformes/.test(synth.texte) && /Valeur machine \/ théorique/.test(synth.texte) && /Valeur inventaire \/ finale/.test(synth.texte) && /Écart de valeur/.test(synth.texte) && /Taux d'évolution du stock/.test(synth.texte) && /Valeur moyenne par article/.test(synth.texte));
    ok('Onglet synthese : emplacements, ecarts positifs, articles et recommandations', synth.tables === 4 && /Emplacement critique :/.test(synth.texte) && /Marge à surveiller :/.test(synth.texte) && synth.recos >= 5, 'tables=' + synth.tables + ' recos=' + synth.recos);
    ok('Onglet synthese : bouton d impression present', synth.bouton);
    await p.screenshot({ path: TMP + '/analyse-avancee-synthese.png' });

    /* edition PDF de la synthese, par le clic du bouton de l onglet */
    const [ongletPdf] = await Promise.all([
      ctx.waitForEvent('page', { timeout: 20000 }),
      p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('analyseavancee #imprimerSynthese')[0].id))
    ]);
    await ongletPdf.waitForLoadState('load').catch(() => null);
    const urlPdf = ongletPdf.url();
    await ongletPdf.close();
    const pdfSynth = await p.evaluate(async (u) => { const r = await fetch(u); const b = await r.arrayBuffer(); return { statut: r.status, type: r.headers.get('content-type'), dispo: r.headers.get('content-disposition'), octets: Array.from(new Uint8Array(b)) }; }, urlPdf);
    fs.writeFileSync(TMP + '/analyse-synthese.pdf', Buffer.from(pdfSynth.octets));
    ok('Edition de la synthese : un clic ouvre le PDF en flux', /analyse-inventaire-avancee-pdf\?inventaireId=/.test(urlPdf) && pdfSynth.statut === 200 && /application\/pdf/.test(pdfSynth.type || '') && /inline/.test(pdfSynth.dispo || ''), urlPdf + ' ' + pdfSynth.type);
    const texteSynth = execSync('pdftotext -layout ' + TMP + '/analyse-synthese.pdf -', { encoding: 'utf8' });
    ok('Edition de la synthese : les memes sections que l onglet', /SYNTHÈSE ET RECOMMANDATIONS/.test(texteSynth) && /RÉCAPITULATIF GLOBAL/.test(texteSynth) && /POINTS DE VIGILANCE PAR EMPLACEMENT/.test(texteSynth) && /ÉCARTS POSITIFS À VÉRIFIER/.test(texteSynth) && /ARTICLES LES PLUS CRITIQUES/.test(texteSynth) && /RECOMMANDATIONS/.test(texteSynth), texteSynth.slice(0, 120).replace(/\n/g, ' | '));
    ok('Edition de la synthese : chiffres achat et vente, et recommandations numerotees', /Valeur machine \/ théorique\s+[\d ]+CFA\s+[\d ]+CFA/.test(texteSynth) && /1\. Audit ciblé sur /.test(texteSynth) && texteSynth.includes(officine), (texteSynth.match(/1\. Audit ciblé sur .{0,40}/) || [''])[0]);
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) { ok('Deroulement sans exception', false, e.stack || e.message); }
  retirer();
  await b.close();
  const ko = res.filter(r => !r.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' PASS');
  process.exit(ko ? 1 : 0);
})();
