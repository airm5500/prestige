/* SC8, COMPLEMENT DU § 19 DU RAPPORT ANOMALIES_CENTRE_SUPPORT_2026-10-26 : l'export Excel du journal porte la version.
 *
 * Parcours par le menu (compte e2e-sa) : CENTRE DE SUPPORT > Diagnostic & bugs, bouton « Excel ». Le fichier telecharge
 * est lu par Python (xlrd) : derniere colonne « Version », et la version du build sur au moins une ligne. Lecture seule.
 *
 * node support/anomalies-centre/test-export-version.js   (BASE=http://localhost:9080/prestige ; PYTHON=python)
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const path = require('path');
const os = require('os');
const ENV_E2E = require('../../outils/poste');
const { connexion, ouvrirMenu, cliquer } = require('../../outils/vues');

const res = [];
function ok(n, c, d) { res.push(!!c); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }

const LIRE = 'import sys, json, xlrd\ns = xlrd.open_workbook(sys.argv[1]).sheet_by_index(0)\n'
  + 'e = [str(c.value) for c in s.row(2)]\n'
  + 'v = [str(s.row(r)[len(e) - 1].value) for r in range(3, s.nrows)]\n'
  + 'print(json.dumps({"entetes": e, "lignes": s.nrows - 3, "versions": sorted(set(v))[:5]}, ensure_ascii=True))\n';

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage({ acceptDownloads: true });
  const fichier = path.join(os.tmpdir(), 'e2e-journal-support-' + Date.now() + '.xls');
  try {
    await connexion(p, ENV_E2E.LOGIN_SUPPORT, 'e2etest');
    await ouvrirMenu(p, 'CENTRE DE SUPPORT', 'Diagnostic & bugs');
    await p.waitForFunction(() => Ext.ComponentQuery.query('supportdiagnostic #btnExcel').some((c) => c.isVisible(true)), null, { timeout: 60000 });
    /* le bouton ouvre l'export dans un nouvel onglet (window.open) : le telechargement part de cet onglet */
    const attente = new Promise((ok_, ko) => { p.on('download', ok_); p.context().on('page', (pg) => pg.on('download', ok_));
      setTimeout(() => ko(new Error('aucun téléchargement en 120 s')), 120000); });
    await cliquer(p, 'supportdiagnostic #btnExcel');
    const telechargement = await attente;
    await telechargement.saveAs(fichier);
    const lu = JSON.parse(execFileSync(process.env.PYTHON || 'python', ['-I', '-c', LIRE, fichier], { encoding: 'utf8' }));
    console.log(JSON.stringify(lu));
    ok('export : dernière colonne « Version », les autres à leur place', lu.entetes[lu.entetes.length - 1] === 'Version'
      && lu.entetes[0] === 'Première apparition' && lu.entetes[lu.entetes.length - 2] === 'Détail (début)', JSON.stringify(lu.entetes));
    ok('export : la version du build figure sur les lignes récentes', lu.versions.some((v) => / UTC$/.test(v)), JSON.stringify(lu.versions));
  } catch (x) { ok('parcours sans exception', false, x.message); } finally {
    await b.close();
    try { require('fs').unlinkSync(fichier); } catch (e) { /* absent */ }
    const echecs = res.filter((x) => !x).length;
    console.log('\n' + (res.length - echecs) + '/' + res.length + ' PASS');
    process.exit(echecs ? 1 : 0);
  }
})();
