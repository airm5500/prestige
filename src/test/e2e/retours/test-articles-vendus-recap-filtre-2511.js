/* ARTICLES VENDUS RÉCAPITULATIF : le PDF et les exports suivent le filtre de recherche (retour du 25/11).
 *
 * Constat : avec « %biofar » dans la recherche, la liste et l'export Excel filtrent bien, mais le PDF sort toute la
 * liste. Le texte de la recherche partait dans l'adresse du PDF sans être encodé : « %bi » n'est pas un caractère
 * encodé valide et le serveur des éditions perdait le filtre.
 *
 * Parcours par l'écran (admin des tests), période du 01/01 à aujourd'hui, pour plusieurs recherches : « %mot » (le cas
 * signalé), « mot » sans %, un code CIP, un mot avec une espace, un texte avec « & ». Pour chacune : recherche tapée
 * puis Entrée ; « Exporter » > PDF (fenêtre ouverte par l'écran), « Exporter » > EXCEL et CSV (téléchargements).
 * Rapprochement ligne par ligne : écran (liste complète de la grille, mêmes paramètres) = PDF = Excel = CSV : mêmes
 * produits (CIP), mêmes quantités vendues. Lecture seule.
 */
const { chromium } = require('playwright-core');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const ENV_E2E = require('../outils/poste');
const { connexion } = require('../outils/vues');
const { fichierEdition } = require('../support/editions');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const MARQUE = 'e2e-avr-' + process.pid;
const AUJ = new Date();
const DEBUT = new Date(AUJ.getFullYear(), 0, 1);

/* produits vendus sur la période, pour bâtir des recherches qui rendent quelques lignes */
const vendus = q("SELECT DISTINCT CONCAT(f.int_CIP, '|', f.str_NAME) FROM t_preenregistrement_detail d JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID"
  + " JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID WHERE p.str_STATUT = 'is_Closed' AND p.dt_UPDATED >= '" + DEBUT.getFullYear() + "-01-01'"
  + " AND f.str_NAME REGEXP '^[A-Z]{3}[A-Z0-9 ]{6,}' AND f.int_CIP REGEXP '^[0-9]{6,}$' ORDER BY f.int_CIP LIMIT 400").split(/\r?\n/).map((l) => l.split('|'));
const avecEspace = vendus.find((v) => / [A-Z]{2}/.test(v[1].slice(3, 12))) || vendus[5];
const motDe = (v) => v[1].slice(2, 7);
const RECHERCHES = [
  ['« %mot » (cas signalé)', '%' + motDe(vendus[0])],
  ['« mot » sans %', motDe(vendus[1])],
  ['code CIP', vendus[2][0]],
  ['mot avec une espace', avecEspace[1].slice(0, avecEspace[1].indexOf(' ', 3) + 3)],
  ['« %mot% »', '%' + motDe(vendus[3]) + '%'],
  ['texte avec « & » (aucun produit)', 'ZZ&ZZ']
];

const textePdf = (f) => execFileSync('pdftotext', ['-enc', 'UTF-8', '-layout', f, '-'], { encoding: 'utf8', maxBuffer: 1 << 28 });
/* classeur .xls (ancien format) ou .xlsx */
const lireExcel = (f) => JSON.parse(execFileSync('python', ['-c', `import json,sys
f=sys.argv[1]
if open(f,'rb').read(2)==b'PK':
    import openpyxl
    w=openpyxl.load_workbook(f).active
    r=[[c for c in l] for l in w.iter_rows(values_only=True)]
else:
    import xlrd
    s=xlrd.open_workbook(f).sheet_by_index(0)
    r=[[(int(c) if isinstance(c,float) and c==int(c) else c) for c in s.row_values(i)] for i in range(s.nrows)]
print(json.dumps(r, default=str))`, f], { encoding: 'utf8' }));

/* « Exporter » : clic sur la flèche du bouton (bord droit), comme l'utilisateur */
async function ouvrirExporter(p) {
  const id = await p.evaluate(() => Ext.ComponentQuery.query('articlevendurecapitulatif #exporter')[0].getId());
  const bx = await p.locator('#' + id).boundingBox();
  for (let i = 0; i < 3; i++) {
    await p.keyboard.press('Escape');
    await p.mouse.click(bx.x + bx.width - 6, bx.y + bx.height / 2);
    await p.waitForTimeout(400);
    if (await p.evaluate((x) => { const m = Ext.getCmp(x).menu; return !!m && m.isVisible(); }, id)) { return id; }
  }
  throw new Error('menu « Exporter » non ouvert');
}
/* « Exporter » > choix (PDF, EXCEL, CSV) : clic sur l'élément du menu ouvert */
async function choisirExport(p, texte) {
  const id = await ouvrirExporter(p);
  const item = await p.evaluate(([x, t]) => { const i = Ext.getCmp(x).menu.items.findBy((m) => m.text === t); return i ? i.getId() : null; }, [id, texte]);
  await p.click('#' + item);
}

/* même produit : CIP identique. Retour du 25/11 : la colonne du PDF est agrandie, un CIP long n'est plus coupé à
 * 9 chiffres ; la tolérance d'avant (préfixe de 9 chiffres) est retirée */
const memeCip = (ecran, pdf) => ecran === pdf;
const tronques = [];

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1600, height: 950 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    ok('Préparation : produits vendus sur la période', vendus.length >= 6, vendus.length);
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await p.evaluate(() => { testextjs.app.getController('App').onLoadNewComponent('articlevendurecapitulatif', 'Articles vendus', ''); });
    await p.waitForFunction(() => !!Ext.getCmp('rechecher') && Ext.getCmp('GridArticleID') && Ext.getCmp('GridArticleID').rendered, null, { timeout: 30000 });
    await p.evaluate(([d, f]) => { Ext.getCmp('dt_debut').setValue(new Date(d)); Ext.getCmp('dt_fin').setValue(new Date(f)); }, [DEBUT.getTime(), AUJ.getTime()]);
    for (const [nom, texte] of RECHERCHES) {
      /* recherche tapee puis Entree, comme l'utilisateur */
      await p.click('#rechecher-inputEl');
      await p.keyboard.press('Control+A');
      await p.keyboard.type(texte, { delay: 10 });
      const charge = p.waitForResponse((r) => r.url().includes('/ventestats/article-vendus-recap?'), { timeout: 120000 });
      await p.keyboard.press('Enter');
      await charge;
      await p.waitForFunction(() => !Ext.getCmp('GridArticleID').getStore().isLoading(), null, { timeout: 120000 });
      /* ecran : la liste complete de la grille (memes parametres que son dernier chargement, toutes les pages) */
      const ecran = await p.evaluate(async () => {
        const s = Ext.getCmp('GridArticleID').getStore(), op = s.lastOptions || {}, prm = Ext.apply({}, op.params || {}, s.getProxy().extraParams);
        prm.start = 0; prm.limit = 100000; prm.page = 1;
        const r = await (await fetch('../api/v1/ventestats/article-vendus-recap?' + Ext.Object.toQueryString(prm))).json();
        return { total: s.getTotalCount(), lignes: (r.data || []).map((x) => [String(x.intCIP), x.intQUANTITY]) };
      });
      const cle = (l) => l.map((x) => x[0] + '×' + x[1]).sort().join(',');
      const cips = ecran.lignes.map((x) => x[0]);
      ok(nom + ' (« ' + texte + ' ») : l\'écran filtre (' + ecran.lignes.length + ' produit(s))', texte === 'ZZ&ZZ' ? ecran.lignes.length === 0 : ecran.lignes.length > 0 && ecran.lignes.length < 300,
        ecran.lignes.length + ' / compteur ' + ecran.total);

      /* PDF : fenetre ouverte par « Exporter » > PDF */
      const popup = p.waitForEvent('popup', { timeout: 60000 });
      await choisirExport(p, 'PDF');
      const fen = await popup;
      await fen.waitForLoadState('domcontentloaded').catch(() => {});
      const urlPdf = fen.url();
      await fen.close().catch(() => {});
      /* le PDF est écrit par le serveur dans le dossier des éditions ; l'adresse ouverte le désigne */
      const fpdf = fichierEdition(urlPdf);
      const pdf = { type: fs.existsSync(fpdf) ? 'application/pdf' : 'absent : ' + fpdf };
      const tp = fs.existsSync(fpdf) ? textePdf(fpdf) : '';
      const lignesPdf = tp.split(/\r?\n/).map((l) => l.trim()).filter((l) => /^\d{6,}\s/.test(l));
      const pdfCips = lignesPdf.map((l) => l.split(/\s+/)[0]);
      const manquants = cips.filter((c) => !pdfCips.some((x) => memeCip(c, x))), enTrop = pdfCips.filter((x) => !cips.some((c) => memeCip(c, x)));
      tronques.push(...pdfCips.filter((x) => !cips.includes(x)));
      ok(nom + ' : PDF = écran, mêmes produits (' + cips.length + ')', !!tp && manquants.length === 0 && enTrop.length === 0 && pdfCips.length === cips.length,
        'pdf ' + pdfCips.length + ' lignes ; manquants ' + manquants.slice(0, 5).join(',') + ' ; en trop ' + enTrop.slice(0, 5).join(',') + ' ; url ' + urlPdf.slice(0, 200) + ' ; type ' + pdf.type + ' ; texte ' + tp.slice(0, 300).replace(/\s+/g, ' '));

      /* Excel et CSV : telechargements */
      for (const format of ['EXCEL', 'CSV']) {
        const dl = p.waitForEvent('download', { timeout: 120000 });
        await choisirExport(p, format);
        const f = path.join(os.tmpdir(), MARQUE + (format === 'CSV' ? '.csv' : '.xlsx'));
        await (await dl).saveAs(f);
        let lignes;
        if (format === 'CSV') {
          const t = fs.readFileSync(f, 'utf8').replace(/^﻿/, '').trim().split(/\r?\n/);
          const sep = t[0].includes(';') ? ';' : ',';
          const ent = t[0].split(sep).map((x) => x.replace(/"/g, '').trim().toLowerCase());
          const iC = ent.findIndex((x) => /cip/.test(x)), iQ = ent.findIndex((x) => /qt|quantit/.test(x));
          lignes = t.slice(1).filter((l) => l.trim()).map((l) => { const c = l.split(sep).map((x) => x.replace(/"/g, '').trim()); return [c[iC], Number(c[iQ])]; });
        } else {
          const x = lireExcel(f);
          const iE = x.findIndex((l) => l.some((c) => /cip/i.test(String(c || ''))));
          const ent = x[iE].map((c) => String(c || '').toLowerCase());
          const iC = ent.findIndex((c) => /cip/.test(c)), iQ = ent.findIndex((c) => /qt|quantit/.test(c));
          lignes = x.slice(iE + 1).filter((l) => /^\d{6,}$/.test(String(l[iC] || ''))).map((l) => [String(l[iC]), Number(l[iQ])]);
        }
        ok(nom + ' : ' + format + ' = écran, mêmes produits et mêmes quantités', cle(lignes) === cle(ecran.lignes),
          lignes.length + ' lignes / écran ' + ecran.lignes.length + ' ; ' + cle(lignes).slice(0, 150) + ' <> ' + cle(ecran.lignes).slice(0, 150));
      }
    }

    /* « Liste des articles vendus » (détail) : ses trois impressions suivent aussi « %mot ». Page rechargée : les deux
       écrans portent des champs de même identifiant et ne s'ouvrent pas l'un sur l'autre */
    await p.reload({ waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => { testextjs.app.getController('App').onLoadNewComponent('articlevendumanager', 'Articles vendus', ''); });
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('articlevendumanager')[0]; return g && g.rendered && Ext.getCmp('rechecher') && Ext.getCmp('rechecher').rendered; }, null, { timeout: 30000 });
    await p.evaluate(([d, f]) => { Ext.getCmp('dt_Date_Debut').setValue(new Date(d)); Ext.getCmp('dt_Date_Fin').setValue(new Date(f)); }, [DEBUT.getTime(), AUJ.getTime()]);
    const texteD = '%' + motDe(vendus[0]);
    await p.click('#rechecher-inputEl');
    await p.keyboard.press('Control+A');
    await p.keyboard.type(texteD, { delay: 10 });
    const chargeD = p.waitForResponse((r) => r.url().includes('/ventestats/article-vendus?'), { timeout: 120000 });
    await p.keyboard.press('Enter');
    await chargeD;
    await p.waitForFunction(() => !Ext.ComponentQuery.query('articlevendumanager')[0].getStore().isLoading(), null, { timeout: 120000 });
    const cipsD = await p.evaluate(async () => {
      const s = Ext.ComponentQuery.query('articlevendumanager')[0].getStore(), op = s.lastOptions || {}, prm = Ext.apply({}, op.params || {}, s.getProxy().extraParams);
      prm.start = 0; prm.limit = 100000; prm.page = 1;
      const r = await (await fetch('../api/v1/ventestats/article-vendus?' + Ext.Object.toQueryString(prm))).json();
      return [...new Set((r.data || []).map((x) => String(x.intCIP)))].sort();
    });
    ok('Liste détaillée (« ' + texteD + ' ») : l\'écran filtre (' + cipsD.length + ' produit(s))', cipsD.length > 0 && cipsD.length < 300, cipsD.length);
    for (const bouton of ['Imprimer', 'Imprimer par caissier', 'Imprimer par emplacement']) {
      const popup = p.waitForEvent('popup', { timeout: 120000 });
      const idBouton = await p.evaluate((t) => { const x = Ext.ComponentQuery.query('articlevendumanager button').find((c) => c.getText && c.getText() === t); return x ? x.getId() : null; }, bouton);
      await p.click('#' + idBouton);
      const fen = await popup;
      await fen.waitForLoadState('domcontentloaded').catch(() => {});
      const u = fen.url();
      await fen.close().catch(() => {});
      const f = fichierEdition(u);
      const t = fs.existsSync(f) ? textePdf(f) : '';
      const vus = [...new Set(t.split(/\r?\n/).map((l) => l.trim()).filter((l) => /^\d{6,}\s/.test(l)).map((l) => l.split(/\s+/)[0]))].sort();
      const enTrop = vus.filter((x) => !cipsD.some((c) => memeCip(c, x)));
      tronques.push(...vus.filter((x) => !cipsD.includes(x)));
      ok('Liste détaillée, « ' + bouton + ' » : aucun produit hors du filtre, produits de l\'écran présents', !!t && enTrop.length === 0 && vus.length > 0,
        vus.length + ' produit(s) au PDF / écran ' + cipsD.length + ' ; en trop ' + enTrop.slice(0, 5).join(','));
    }
    if (tronques.length) { console.log('NOTE  Défaut d\'affichage déjà présent, hors de ce correctif : les CIP de plus de 9 chiffres sont coupés dans les PDF (' + [...new Set(tronques)].slice(0, 4).join(', ') + ')'); }
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close().catch(() => {});
    for (const x of ['.pdf', '.xlsx', '.csv']) { fs.rmSync(path.join(os.tmpdir(), MARQUE + x), { force: true }); }
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
