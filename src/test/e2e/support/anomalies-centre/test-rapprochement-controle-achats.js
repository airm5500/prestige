/* Rapprochement de l'etat de controle des achats (journal du support du 03/11, regle de test du 05/11).
 *
 * Une meme periode se lit a cinq endroits : la liste a l'ecran (nombre total et references de la page), le nombre
 * seul (route des applications mobiles, memes criteres), le PDF de « Imprimer » (periode, nombre de bons,
 * references) et l'export Excel (lignes et references). Ils doivent tous dire la meme chose.
 *
 * Par le menu (compte e2e) : GESTION DES COMMANDES > Etat de contrôle Achats ; les dates sont saisies ou videes au
 * clavier, puis « Rechercher », « Imprimer » et « Exporter ».
 * Cas varies :
 *  1. les deux dates videes (= aujourd'hui) ;
 *  2. date de debut videe, fin = aujourd'hui ;
 *  3. debut = jour du dernier BL de la base, fin videe ;
 *  4. les memes dates saisies (doit egaler le cas 3) ;
 *  5. une longue periode (plusieurs pages) : nombres seulement.
 * Lecture seule : aucune donnee ecrite, les fichiers telecharges sont effaces.
 *
 * node support/anomalies-centre/test-rapprochement-controle-achats.js   (BASE=http://localhost:10090/prestige)
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const ENV_E2E = require('../../outils/poste');
const { BASE, connexion, ouvrirMenu, cliquer, saisir } = require('../../outils/vues');

const res = [];
function ok(n, c, d) { res.push(!!c); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const affiche = (s) => s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4);
const AUJOURDHUI = iso(new Date());
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'rappr-ctrl-achats-'));

/* lignes de la premiere feuille : [nombre de lignes de donnees, references (colonne « Réf Bon »)] */
const LIRE_XLSX = 'import sys, json, openpyxl\n'
  + 'f = openpyxl.load_workbook(sys.argv[1], read_only=True).worksheets[0]\n'
  + 'l = [[("" if c is None else str(c)) for c in r] for r in f.iter_rows(values_only=True)]\n'
  + 'i = next((k for k, r in enumerate(l) if "Réf Bon" in r), None)\n'
  + 'c = l[i].index("Réf Bon") if i is not None else -1\n'
  + 'd = [r for r in l[i + 1:] if any(x.strip() for x in r)] if i is not None else []\n'
  + 'print(json.dumps({"lignes": len(d), "refs": [r[c] for r in d] if c >= 0 else []}))\n';

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1600, height: 950 }, acceptDownloads: true });
  const p = await ctx.newPage();
  p.setDefaultTimeout(60000);
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const http = []; p.on('response', (r) => { if (/etat-control-bon/.test(r.url()) && r.status() >= 400) { http.push(r.status() + ' ' + r.url()); } });
  ctx.on('page', (o) => { if (o !== p) { o.close().catch(() => {}); } }); // l'onglet du PDF : on lit le fichier nous-memes
  await p.route('**/api/v1/support/events', (r) => r.request().method() === 'POST' ? r.fulfill({ status: 200, body: '{}' }) : r.continue());

  const poserDate = async (id, valeur) => {
    if (valeur) { await saisir(p, '#' + id, affiche(valeur)); return; }
    await cliquer(p, '#' + id);
    await p.keyboard.press('Control+A'); await p.keyboard.press('Delete'); await p.keyboard.press('Tab');
  };
  const rechercher = async () => {
    const rep = p.waitForResponse((r) => /etat-control-bon\/list/.test(r.url()), { timeout: 120000 });
    await p.locator('text=/^\\s*Rechercher\\s*$/').filter({ visible: true }).first().click();
    const r = await rep;
    await p.waitForFunction(() => !Ext.ComponentQuery.query('etatscontrolemanager')[0].getStore().isLoading());
    return r;
  };
  const ecran = () => p.evaluate(() => { const s = Ext.ComponentQuery.query('etatscontrolemanager')[0].getStore();
    return { total: s.getTotalCount(), page: s.getCount(), refs: s.getRange().map((x) => String(x.get('strREFLIVRAISON'))),
      dates: s.getRange().map((x) => String(x.get('dtDATELIVRAISON') || '')),
      saisies: [Ext.getCmp('datedebut').getSubmitValue() || '', Ext.getCmp('datefin').getSubmitValue() || ''] }; });
  const nombre = async () => { const c = await p.evaluate(() => criteresControleAchat());
    const r = await p.request.get(BASE + '/api/v1/etat-control-bon/nombre?' + new URLSearchParams(c).toString());
    return (await r.json()).nombre; };
  const imprimer = async () => {
    const rep = p.waitForResponse((r) => /etat-control-bon\/print/.test(r.url()), { timeout: 180000 });
    await cliquer(p, 'etatscontrolemanager button[text=Imprimer]');
    const j = await (await rep).json();
    await p.waitForTimeout(800);
    if (!j.success) { return { erreur: j.msg }; }
    const f = path.join(dossier, 'etat.pdf');
    fs.writeFileSync(f, await (await p.request.get(BASE + '/' + j.msg.replace(/^\/+/, ''))).body());
    const texte = execFileSync('pdftotext', ['-enc', 'UTF-8', '-layout', f, '-'], { encoding: 'utf8' });
    fs.unlinkSync(f);
    const periode = (texte.match(/Période du (\S*) au (\S*)/) || []);
    const n = texte.match(/(\d+) bon\(s\)/);
    return { texte, debut: periode[1], fin: periode[2], nombre: n ? Number(n[1]) : null };
  };
  const exporter = async () => {
    const tel = p.waitForEvent('download', { timeout: 180000 });
    await cliquer(p, 'etatscontrolemanager button[tooltip="Exporter la liste en Excel"]');
    const d = await tel;
    const f = path.join(dossier, 'etat.xlsx'); await d.saveAs(f);
    const x = JSON.parse(execFileSync('python', ['-I', '-c', LIRE_XLSX, f], { encoding: 'utf8' }));
    fs.unlinkSync(f);
    return x;
  };

  const rapprocher = async (nom, debut, fin, attendu, refsAussi) => {
    await poserDate('datedebut', debut);
    await poserDate('datefin', fin);
    const r = await rechercher();
    const e = await ecran();
    ok(nom + ' : la liste répond', r.status() === 200, r.status());
    const n = await nombre();
    const pdf = await imprimer();
    const xl = await exporter();
    ok(nom + ' : liste = nombre = PDF = Excel', !pdf.erreur && e.total === n && e.total === pdf.nombre && e.total === xl.lignes,
      JSON.stringify({ liste: e.total, nombre: n, pdf: pdf.nombre || pdf.erreur, excel: xl.lignes }));
    ok(nom + ' : période imprimée = période de la liste', pdf.debut === attendu[0] && pdf.fin === attendu[1],
      JSON.stringify({ imprime: [pdf.debut, pdf.fin], attendu, saisies: e.saisies }));
    if (refsAussi) {
      const absentesPdf = e.refs.filter((x) => pdf.texte.indexOf(x) < 0);
      const xlTriees = xl.refs.slice().sort(), ecranTriees = e.refs.slice().sort();
      ok(nom + ' : mêmes références à l\'écran, dans le PDF et dans l\'Excel', e.total === e.page && absentesPdf.length === 0
        && JSON.stringify(xlTriees) === JSON.stringify(ecranTriees),
        JSON.stringify({ ecran: e.refs.length, absentesPdf, excel: xl.refs.length }));
    }
    return e;
  };

  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const ouverture = p.waitForResponse((r) => /etat-control-bon\/list/.test(r.url()), { timeout: 120000 });
    await ouvrirMenu(p, 'GESTION DES COMMANDES', 'Etat de contrôle Achats');
    await ouverture;
    await p.waitForTimeout(1500);

    /* jour du dernier BL : liste sur une longue periode, triee du plus recent au plus ancien */
    const long = await rapprocher('Cas 5, du 2020-01-01 à aujourd\'hui', '2020-01-01', AUJOURDHUI, ['2020-01-01', AUJOURDHUI], false);
    ok('Cas 5 : la base de test a des BL sur la période', long.total > 0, long.total);
    const brut = long.dates[0] || '', fr = brut.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    const dernier = fr ? fr[3] + '-' + fr[2] + '-' + fr[1] : brut.slice(0, 10);
    ok('Jour du dernier BL lu à l\'écran', /^\d{4}-\d{2}-\d{2}$/.test(dernier), long.dates[0]);

    await rapprocher('Cas 1, deux dates vidées', '', '', [AUJOURDHUI, AUJOURDHUI], true);
    await rapprocher('Cas 2, début vidé', '', AUJOURDHUI, [AUJOURDHUI, AUJOURDHUI], true);
    const c3 = await rapprocher('Cas 3, début = ' + dernier + ', fin vidée', dernier, '', [dernier, AUJOURDHUI], true);
    const c4 = await rapprocher('Cas 4, ' + dernier + ' à aujourd\'hui saisis', dernier, AUJOURDHUI, [dernier, AUJOURDHUI], true);
    ok('Cas 3 = cas 4 : une fin vidée vaut aujourd\'hui', c3.total === c4.total && c3.total > 0
      && JSON.stringify(c3.refs) === JSON.stringify(c4.refs), c3.total + ' / ' + c4.total);

    ok('Aucune réponse HTTP en erreur', http.length === 0, http.join(' | '));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
    fs.rmSync(dossier, { recursive: true, force: true });
    const echecs = res.filter((x) => !x).length;
    console.log('\n' + (res.length - echecs) + '/' + res.length + ' PASS');
    process.exit(echecs ? 1 : 0);
  }
})();
