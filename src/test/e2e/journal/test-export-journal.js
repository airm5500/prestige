/* Point 14 : export Excel du fichier journal. Le bouton existe, l'export porte TOUTES les lignes
   des criteres et non la seule page affichee, et le fichier est un vrai classeur. */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 220) + ']' : '')); }

const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1700, height: 950 } });
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
  await p.waitForTimeout(3000);

  await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('logfile', 'Fichier Journal', ''));
  const ouvert = await p.waitForFunction(() => Ext.ComponentQuery.query('logfile').length > 0, null, { timeout: 20000 }).then(() => true).catch(() => false);
  ok('ecran Fichier Journal ouvert', ouvert);
  await p.waitForTimeout(3000);

  const bouton = await p.evaluate(() => {
    const g = Ext.getCmp('logfileGrid');
    const b2 = g.down('button[text=Excel]');
    return b2 ? { present: true, tooltip: b2.tooltip } : { present: false };
  });
  ok('bouton Excel present dans la barre du journal', bouton.present, JSON.stringify(bouton));

  // periode large : on compare le nombre de lignes exportees au nombre reel en base
  const debut = '2020-01-01';
  const fin = new Date().toISOString().slice(0, 10);
  const compter = () => parseInt(q("SELECT COUNT(*) FROM t_event_log WHERE DATE(dt_CREATED) BETWEEN '"
    + debut + "' AND '" + fin + "'"), 10);

  const dossier = process.env.TMPDIR || '/tmp';
  const fichier = path.join(dossier, 'export-journal-e2e.xlsx');
  // Compte pris juste avant l'export : le parcours du test ecrit lui-meme dans le journal.
  const attendu = compter();
  const telechargement = p.waitForEvent('download', { timeout: 60000 });
  await p.evaluate(([d, f]) => {
    Ext.getCmp('dt_log_start').setValue(new Date(d));
    Ext.getCmp('dt_end_log').setValue(new Date(f));
    Ext.getCmp('logfileGrid').down('button[text=Excel]').fireHandler
        ? Ext.getCmp('logfileGrid').down('button[text=Excel]').fireHandler()
        : Ext.getCmp('logfileGrid').down('button[text=Excel]').fireEvent('click',
            Ext.getCmp('logfileGrid').down('button[text=Excel]'));
  }, [debut, fin]);
  let dl = null;
  try { dl = await telechargement; } catch (e) { }
  ok('le bouton declenche bien un telechargement', !!dl, dl ? dl.suggestedFilename() : 'aucun');
  if (dl) {
    ok('le fichier porte un nom explicite et l extension xlsx',
       /^fichier_journal_\d{8}_\d{6}\.xlsx$/.test(dl.suggestedFilename()), dl.suggestedFilename());
    await dl.saveAs(fichier);
  }

  // Le contenu est verifie via l'appel direct, plus simple a lire que le binaire telecharge.
  const resume = await p.evaluate(async ([d, f]) => {
    const r = await fetch('../api/v1/common/logs/export-excel?dtStart=' + d + '&dtEnd=' + f + '&criteria=-1&query=&userId=');
    const buf = await r.arrayBuffer();
    return { status: r.status, type: r.headers.get('content-type'), taille: buf.byteLength,
             entete: new TextDecoder().decode(new Uint8Array(buf.slice(0, 2))) };
  }, [debut, fin]);
  ok('l export repond en 200', resume.status === 200, JSON.stringify(resume));
  ok('le fichier est un classeur (signature ZIP des .xlsx)', resume.entete === 'PK', JSON.stringify(resume));
  ok('le classeur a un contenu', resume.taille > 1000, 'taille=' + resume.taille);

  // --- le coeur de la demande : le resultat COMPLET, pas la seule page affichee ---
  await p.evaluate(([d, f]) => Ext.getCmp('logfileGrid').getStore().load({
    params: { dtStart: d, dtEnd: f, criteria: -1, query: '', userId: '' }
  }), [debut, fin]);
  await p.waitForTimeout(4000);
  const ecran = await p.evaluate(() => {
    const st = Ext.getCmp('logfileGrid').getStore();
    return { affichees: st.getCount(), total: st.getTotalCount() };
  });
  ok('la grille reste paginee a l ecran', ecran.affichees <= 15 && ecran.total > ecran.affichees,
     JSON.stringify(ecran));

  if (dl && fs.existsSync(fichier)) {
    // Le .xlsx est une archive : on lit la feuille et on compte ses lignes de donnees.
    const feuille = execFileSync('unzip', ['-p', fichier, 'xl/worksheets/sheet1.xml'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    const lignes = (feuille.match(/<row[ >]/g) || []).length;
    // En-tete du classeur : le titre, le rappel de la periode, la ligne des libelles de colonnes.
    // Les deux autres criteres sont vides ici, donc non rappeles ; la ligne de separation n'est
    // qu'un rang laisse libre, elle n'existe pas dans le fichier.
    const donnees = lignes - 3;
    // La borne haute laisse la place aux quelques lignes que le parcours du test ecrit lui-meme
    // dans le journal entre le comptage et la lecture du fichier.
    ok('le classeur porte toutes les lignes de la periode, pas la page affichee',
       donnees >= attendu && donnees <= attendu + 20 && donnees > ecran.affichees,
       'lignes de donnees=' + donnees + ' attendu>=' + attendu + ' page ecran=' + ecran.affichees);
    fs.unlinkSync(fichier);
  }
  console.log('  (lignes en base sur la periode : ' + attendu + ', affichees a l ecran : ' + ecran.affichees + ')');

  ok('aucune erreur JavaScript', err.length === 0, err.join(' || '));
  await b.close();
  const ko = res.filter(r => !r.c).length;
  console.log('\n===== ' + (res.length - ko) + '/' + res.length + (ko ? ' FAIL' : ' PASS') + ' =====');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
