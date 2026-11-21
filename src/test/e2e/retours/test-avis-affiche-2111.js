/* PLAN DU 21/11, POINT 10 : affiche de l'avis client sans l'adresse du lien imprimee sous le QR code.
 * Par l'ecran AVIS CLIENTS > « Réglages et affiche » : deux reglages differents (adresse IP et port), puis les boutons
 * « Affiche A4 » et « Affiche A5 » (le PDF s'ouvre dans un onglet). Pour chaque affiche :
 *  - le QR imprime redonne exactement le lien affiche dans l'ecran (rapprochement ecran / PDF / base) ;
 *  - aucune adresse web n'est imprimee (ni le lien, ni l'adresse IP et le port) ;
 *  - le nom de la pharmacie, l'invitation et le remerciement restent.
 * Reglages remis a l'identique a la fin.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--raw', '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).replace(/\r\n/g, '\n').trim();
const CLES = ['KEY_AVIS_ADRESSE_PUBLIQUE', 'KEY_AVIS_PORT_PUBLIC', 'KEY_AVIS_JETON', 'KEY_AVIS_ACTIF', 'KEY_AVIS_MAX_HEURE', 'KEY_AVIS_ADRESSE_AFFICHEE'];
const origine = {};
CLES.forEach((k) => { origine[k] = q(`SELECT IFNULL((SELECT str_VALUE FROM t_parameters WHERE str_KEY = '${k}'), '__ABSENT__')`); });
const remettre = () => CLES.forEach((k) => {
  if (origine[k] === '__ABSENT__') { q(`DELETE FROM t_parameters WHERE str_KEY = '${k}'`); } else { q(`UPDATE t_parameters SET str_VALUE = '${origine[k].replace(/'/g, "''")}' WHERE str_KEY = '${k}'`); }
});
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-affiche-'));
const decoder = (png) => execFileSync('python3', ['-I', '-c',
  "import sys,zxingcpp\nfrom PIL import Image\nr=zxingcpp.read_barcodes(Image.open(sys.argv[1]))\nprint('\\n'.join(x.text for x in r))", png], { encoding: 'utf8' }).trim();

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  try {
    const ctx = await b.newContext({ viewport: { width: 1500, height: 950 } });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => err.push(e.message));
    p.on('dialog', (d) => { err.push('DIALOGUE ' + d.message()); d.dismiss(); });
    await p.goto(process.env.BASE + '/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('avisclients', 'Avis clients', ''));
    await p.waitForFunction(() => Ext.ComponentQuery.query('avisclients')[0] && Ext.ComponentQuery.query('avisclients')[0].droits.success, null, { timeout: 30000 });
    await p.evaluate(() => { const v = Ext.ComponentQuery.query('avisclients')[0]; v.setActiveTab(v.down('#ongletReglages')); });
    await p.waitForFunction(() => Ext.ComponentQuery.query('avisclients #rgPort')[0].getValue() > 0, null, { timeout: 30000 });
    const remplir = async (id, valeur) => {
      await p.evaluate((i) => Ext.ComponentQuery.query('avisclients #' + i)[0].inputEl.dom.setAttribute('data-e2e', i), id);
      await p.click('[data-e2e=' + id + ']'); await p.keyboard.press('Control+A'); await p.keyboard.type(String(valeur));
    };
    const cliquer = async (id) => {
      await p.evaluate((i) => Ext.ComponentQuery.query('avisclients #' + i)[0].btnEl.dom.setAttribute('data-e2e', i), id);
      await p.click('[data-e2e=' + id + ']');
    };
    const officine = q('SELECT str_NOM_COMPLET FROM t_officine LIMIT 1').toUpperCase();

    for (const [ip, port] of [['10.20.30.40', 18090], ['127.0.0.1', 8090]]) {
      await remplir('rgAdresse', ip); await remplir('rgPort', port);
      await p.evaluate(() => { Ext.ComponentQuery.query('avisclients #rgEtat')[0].setText(''); });
      await cliquer('rgEnregistrer');
      await p.waitForFunction(() => /enregistrés/.test(Ext.ComponentQuery.query('avisclients #rgEtat')[0].getEl().dom.textContent), null, { timeout: 15000 });
      const lien = await p.evaluate(() => Ext.ComponentQuery.query('avisclients #rgLien')[0].getEl().dom.querySelector('.rg-lien').textContent);
      const jeton = q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_AVIS_JETON'");
      ok(ip + ':' + port + ' : lien de l\'écran = réglages et jeton en base', lien.indexOf(ip + ':' + port) > 0 && lien.endsWith('?t=' + jeton), lien);
      for (const format of ['A4', 'A5']) {
        const onglet = ctx.waitForEvent('page');
        await cliquer('rgAffiche' + format);
        const o = await onglet;
        await o.waitForLoadState('domcontentloaded').catch(() => {});
        /* le visualiseur PDF ne livre pas le corps : le meme document est relu a l'adresse ouverte par l'onglet */
        const r = await p.evaluate(async (u) => { const x = await fetch(u); return { t: x.headers.get('content-type'), b: Array.from(new Uint8Array(await x.arrayBuffer())) }; }, o.url());
        r.headers = () => ({ 'content-type': r.t });
        const pdf = path.join(TMP, format + '-' + port + '.pdf');
        fs.writeFileSync(pdf, Buffer.from(r.b));
        execFileSync('pdftoppm', ['-r', '200', '-png', '-singlefile', pdf, pdf.replace(/\.pdf$/, '')]);
        const lu = decoder(pdf.replace(/\.pdf$/, '.png'));
        const texte = execFileSync('pdftotext', ['-enc', 'UTF-8', pdf, '-'], { encoding: 'utf8' });
        const plat = texte.replace(/\s+/g, ' ');
        ok(format + ' ' + ip + ' : bouton de l\'écran → PDF dans un onglet', r.headers()['content-type'] === 'application/pdf' && /affiche\?format=/.test(o.url()), o.url());
        ok(format + ' ' + ip + ' : le QR imprimé redonne exactement le lien de l\'écran', lu === lien, lu);
        ok(format + ' ' + ip + ' : aucune adresse web imprimée (ni lien, ni IP:port)', !/https?:\/\//.test(texte) && texte.indexOf(ip + ':' + port) < 0, plat.slice(-160));
        ok(format + ' ' + ip + ' : pharmacie, invitation et remerciement restent', plat.indexOf(officine.replace(/\s+/g, ' ')) >= 0
          && /Votre avis nous intéresse/.test(plat) && /Scannez ce code/.test(plat) && /Merci de nous aider/.test(plat), plat.slice(0, 200));
        await o.close();
      }
    }
    ok('Aucune erreur JavaScript ni fenêtre', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack || x.message);
  } finally {
    await b.close();
    remettre();
    ok('Réglages remis à l\'identique', CLES.every((k) => q(`SELECT IFNULL((SELECT str_VALUE FROM t_parameters WHERE str_KEY = '${k}'), '__ABSENT__')`) === origine[k]));
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
