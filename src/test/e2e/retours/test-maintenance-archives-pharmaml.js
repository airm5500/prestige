/* CENTRE DE SUPPORT - MAINTENANCE : PURGE DES ARCHIVES ET DU JOURNAL PHARMAML AU-DELA DE 12 MOIS (retours du 08/10 (6)).
 * Par l'ecran (admin) :
 *  - carte « Purger les archives et le journal PharmaML » : 12 mois par defaut, etat calcule avant toute action
 *    (fichiers, volume, ce qui depasse 12 mois, mois conserve a partir duquel) ;
 *  - « Purger » + confirmation : les dossiers de mois de plus de 12 mois (commandes, vidages, infoproduit, log) et les
 *    anciennes archives de la racine sont supprimes ; les 12 derniers mois, le mois en cours et les autres fichiers
 *    du dossier restent ; l'action est tracee (evenement MAINTENANCE) ;
 *  - champ de mois : valeurs absurdes refusees (0, 500, texte) ; mise en page : carte, libelles entiers ;
 *  - aucune erreur JavaScript ; fichiers d'essai et evenement retires.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const archives = require('./archives-pharmaml');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const SORTIE = process.env.SORTIE || '/tmp';
const pad = (n) => String(n).padStart(2, '0');
const mois = (decalage) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - decalage); return d.getFullYear() + '-' + pad(d.getMonth() + 1); };
const D = archives.DOSSIER;
const VIEUX = [`commandes/${mois(13)}/C_E2E-PURGE-1.xml`, `commandes/${mois(13)}/R_E2E-PURGE-1.xml`, `log/${mois(14)}/pharmaml_e2e.log`, `vidages/${mois(30)}/RV_E2E-PURGE-2.xml`];
const GARDES = [`commandes/${mois(12)}/C_E2E-PURGE-3.xml`, `infoproduit/${mois(0)}/RI_E2E-PURGE-4.xml`];
const RACINE_VIEUX = 'RV_E2E-PURGE-ANCIEN.xml', RACINE_AUTRE = 'e2e-purge-autre.txt';
const debut = q('SELECT NOW()');

function poser() {
  [...VIEUX, ...GARDES].forEach((f) => { fs.mkdirSync(path.join(D, path.dirname(f)), { recursive: true }); fs.writeFileSync(path.join(D, f), '<E2E/>' + 'x'.repeat(2000)); });
  const vieux = new Date(Date.now() - 500 * 86400000);
  fs.writeFileSync(path.join(D, RACINE_VIEUX), '<E2E/>'); fs.utimesSync(path.join(D, RACINE_VIEUX), vieux, vieux);
  fs.writeFileSync(path.join(D, RACINE_AUTRE), 'pas PharmaML'); fs.utimesSync(path.join(D, RACINE_AUTRE), vieux, vieux);
}
function nettoyer() {
  [...VIEUX, ...GARDES, RACINE_VIEUX, RACINE_AUTRE].forEach((f) => { const p = path.join(D, f); if (fs.existsSync(p)) { fs.unlinkSync(p); } });
  /* dossiers de mois vides laisses par l'essai */
  [...VIEUX, ...GARDES].map((f) => path.join(D, path.dirname(f))).forEach((d) => { try { if (fs.existsSync(d) && fs.readdirSync(d).length === 0) { fs.rmdirSync(d); } } catch (e) { /* utilise */ } });
}

(async () => {
  nettoyer();
  poser();
  const autres = archives.fichiers().filter((f) => !/E2E-PURGE|pharmaml_e2e/.test(f));
  const { chromium } = require('playwright-core');
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => { testextjs.app.getController('App').onLoadNewComponent('supportmaintenance', 'Maintenance', ''); });
    await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('supportmaintenance #lblArchivesPharmaMl')[0]; return c && /Mo au total|Aucun dossier/.test(c.getEl().dom.textContent); }, null, { timeout: 30000 });
    const carte = await p.evaluate(() => { const e = Ext.ComponentQuery.query('supportmaintenance')[0]; const c = e.down('#carteArchivesPharmaMl'); const champ = e.down('#numMoisPML');
      const lab = champ.labelEl.dom; const t = c.getEl().dom.querySelector('.x-panel-header-text, .x-header-text');
      return { titre: c.title, valeur: champ.getValue(), etat: e.down('#lblArchivesPharmaMl').getEl().dom.textContent, libelleTronque: lab.scrollWidth > lab.clientWidth + 1,
        titreTronque: t ? t.scrollWidth > t.clientWidth + 1 : true, boutons: [e.down('#btnRecalculerPML').getText(), e.down('#btnPurgerPML').getText()] }; });
    await p.evaluate(() => { const c = Ext.ComponentQuery.query('supportmaintenance #carteArchivesPharmaMl')[0]; c.getEl().dom.scrollIntoView(); });
    await p.screenshot({ path: SORTIE + '/maintenance-archives-pharmaml.png' });
    ok('Carte de maintenance : titre, 12 mois par défaut, boutons Recalculer / Purger, libellés entiers', carte.titre === 'Purger les archives et le journal PharmaML' && carte.valeur === 12
      && carte.boutons.join('|') === 'Recalculer|Purger' && !carte.libelleTronque && !carte.titreTronque, JSON.stringify(carte));
    ok('État calculé AVANT toute action : 5 fichiers de plus de 12 mois, conservé à partir de ' + mois(12),
      new RegExp('5 fichier\\(s\\), [\\d.]+ Mo de plus de 12 mois \\(conservé à partir de ' + mois(12) + '\\)').test(carte.etat), carte.etat);
    ok('Le calcul ne supprime rien', VIEUX.every((f) => fs.existsSync(path.join(D, f))) && fs.existsSync(path.join(D, RACINE_VIEUX)));

    /* controle de saisie du nombre de mois */
    const saisie = await p.evaluate(() => { const c = Ext.ComponentQuery.query('supportmaintenance #numMoisPML')[0]; const r = {};
      ['0', '500', 'abc', '12'].forEach((v) => { c.setRawValue(v); r[v] = c.isValid() && c.getValue() !== null; }); return r; });
    ok('Nombre de mois : 0, 500 et texte refusés, 12 accepté', !saisie['0'] && !saisie['500'] && !saisie.abc && saisie['12'], JSON.stringify(saisie));

    /* purge par l'ecran */
    const idPurger = await p.evaluate(() => Ext.ComponentQuery.query('supportmaintenance #btnPurgerPML')[0].getId());
    await p.click('#' + idPurger);
    await p.waitForFunction(() => Ext.MessageBox.isVisible() && /IRRÉVERSIBLE/.test(Ext.MessageBox.msg.getEl().dom.textContent), null, { timeout: 10000 });
    const conf = await p.evaluate(() => Ext.MessageBox.msg.getEl().dom.textContent);
    ok('Confirmation : irréversible, mois purgés, base non touchée', /plus de 12 mois/.test(conf) && /ne sont pas touchées/.test(conf), conf);
    const oui = await p.evaluate(() => { const bt = Ext.MessageBox.down('button[itemId=yes]') || Ext.MessageBox.msgButtons.yes; return bt.getId(); });
    await p.click('#' + oui);
    await p.waitForFunction(() => Ext.MessageBox.isVisible() && /Mo libérés/.test(Ext.MessageBox.msg.getEl().dom.textContent), null, { timeout: 30000 });
    const fin = await p.evaluate(() => Ext.MessageBox.msg.getEl().dom.textContent);
    await p.evaluate(() => Ext.MessageBox.hide());
    ok('Résultat affiché : 5 fichier(s) supprimé(s), 3 dossier(s) de mois', /^5 fichier\(s\) supprimé\(s\), [\d.]+ Mo libérés \(3 dossier\(s\) de mois\)/.test(fin), fin);
    ok('Mois de plus de 12 mois supprimés (commandes, log, vidages) et ancienne archive de la racine', VIEUX.every((f) => !fs.existsSync(path.join(D, f)))
      && !fs.existsSync(path.join(D, path.dirname(VIEUX[0]))) && !fs.existsSync(path.join(D, RACINE_VIEUX)));
    ok('Conservés : 12 derniers mois, mois en cours, fichier non PharmaML, toutes les autres archives', GARDES.every((f) => fs.existsSync(path.join(D, f)))
      && fs.existsSync(path.join(D, RACINE_AUTRE)) && autres.every((f) => fs.existsSync(path.join(D, f))), autres.length + ' autres');
    const evt = q("SELECT COUNT(*) FROM t_application_event WHERE type = 'MAINTENANCE' AND url_ou_ecran = 'maintenance:ARCHIVES_PHARMAML' AND created_at >= '" + debut + "' AND message_court LIKE '%plus de 12 mois (5 fichier(s)%'");
    ok('Action tracée dans le journal des événements (MAINTENANCE, qui, quoi)', evt === '1', evt);
    await p.waitForFunction(() => /0 fichier\(s\), [\d.]+ Mo de plus de 12 mois/.test(Ext.ComponentQuery.query('supportmaintenance #lblArchivesPharmaMl')[0].getEl().dom.textContent), null, { timeout: 15000 });
    ok('État recalculé après la purge : plus rien au-delà de 12 mois', true);
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    nettoyer();
    try { exec("DELETE FROM t_application_event WHERE type = 'MAINTENANCE' AND url_ou_ecran = 'maintenance:ARCHIVES_PHARMAML' AND created_at >= '" + debut + "'"); } catch (e) { console.log('evenement : ' + e.message); }
    ok('Fichiers d\'essai et événement retirés', !archives.fichiers().some((f) => /E2E-PURGE|pharmaml_e2e/.test(f)) && !fs.existsSync(path.join(D, RACINE_AUTRE)));
    const n = res.filter((x) => x.c).length;
    console.log('\n' + n + '/' + res.length + ' OK');
    process.exit(n === res.length ? 0 : 1);
  }
})();
