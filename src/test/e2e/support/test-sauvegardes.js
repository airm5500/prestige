/* SAUVEGARDES DE LA BASE (retour du 01/11 : Prestige n'avait pas de sauvegarde integree), Centre de support, par
 * l'ecran « Stabilité du serveur », onglet « Sauvegardes ».
 *  - etat : outil de sauvegarde trouve (mariadb-dump de MariaDB), dossier, espace libre ;
 *  - reglages par l'ecran : dossier, copie (second disque), sauvegarde automatique, conservation ;
 *  - « Sauvegarder maintenant » : fichier compresse complet (« Dump completed »), toutes les tables, copie identique,
 *    ligne « Réussie » dans l'historique ;
 *  - conservation : une ancienne sauvegarde au-dela du delai est retiree, une recente gardee, un fichier qui n'est pas
 *    une sauvegarde de Prestige n'est jamais touche ;
 *  - aucun mot de passe : ni dans les reponses de l'API, ni dans le journal du serveur, ni dans le dossier ;
 *  - sans le droit, l'API refuse ; aucune fenetre, aucune erreur JavaScript ;
 *  - reglages, historique et fichiers du test retires.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const privilegeEssai = require('./privilege-essai');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const droit = privilegeEssai(q, exec, ENV_E2E.LOGIN_SUPPORT, 'P_SM_SUPPORT_SERVEUR');
const DOSSIER = (ENV_E2E.WINDOWS ? 'D:/' : '/tmp/') + 'e2e-sauvegardes';
const COPIE = DOSSIER + '/copie';
const CLES = ['KEY_SAUVEGARDE_DOSSIER', 'KEY_SAUVEGARDE_COPIE', 'KEY_SAUVEGARDE_ACTIVE', 'KEY_SAUVEGARDE_GARDER_HEURES', 'KEY_SAUVEGARDE_GARDER_JOURS'];
/* mot de passe du pool : ne doit apparaitre nulle part (lu ici pour le chercher, jamais affiche) */
const MDP = ((fs.readFileSync(ENV_E2E.PAYARA_DOMAINE + '/config/domain.xml', 'utf8').match(/name="laborex_pool"[\s\S]*?<\/jdbc-connection-pool>/) || [''])[0]
  .match(/name="[Pp]assword" value="([^"]*)"/) || [])[1] || '';
const nomFichier = (d) => 'prestige_' + BASE + '_' + d.toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '_') + '.sql.gz';
const ilYa = (jours) => new Date(Date.now() - jours * 86400000);

(async () => {
  droit.remettre();
  const tableExiste = q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_sauvegarde'") === '1';
  const idAvant = tableExiste ? Number(q('SELECT COALESCE(MAX(id), 0) FROM t_sauvegarde')) : 0;
  const reglagesAvant = q("SELECT GROUP_CONCAT(CONCAT(str_KEY, '=', str_VALUE) ORDER BY str_KEY SEPARATOR '|') FROM t_parameters WHERE str_KEY IN ('" + CLES.join("','") + "')");
  fs.rmSync(DOSSIER, { recursive: true, force: true });
  fs.mkdirSync(DOSSIER, { recursive: true });
  /* conservation : 40 jours (au-dela de 30 : retiree), 10 jours (gardee), fichier etranger (jamais touche) */
  const vieille = nomFichier(ilYa(40)), recente = nomFichier(ilYa(10));
  [vieille, recente].forEach((f) => fs.writeFileSync(path.join(DOSSIER, f), zlib.gzipSync('-- essai e2e\n-- Dump completed\n')));
  fs.writeFileSync(path.join(DOSSIER, 'notes-pharmacien.txt'), 'ne pas toucher');
  const LOG = ENV_E2E.JOURNAL_SERVEUR, tailleLog = fs.statSync(LOG).size;

  const b = await ENV_E2E.lancer(chromium);
  const dialogues = [], err = [], reponses = [];
  const ouvrir = async (p) => {
    p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
    p.on('pageerror', (e) => err.push(String(e.message)));
    p.on('response', async (r) => { if (/api\/v1\/support\/sauvegardes/.test(r.url())) { try { reponses.push(await r.text()); } catch (e) { /* */ } } });
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN_SUPPORT); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(2000);
  };
  const S = (sel) => 'supportserveur #ongletSauvegardes ' + sel;
  try {
    const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
    await ouvrir(p);
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('supportserveur', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('supportserveur').length > 0, null, { timeout: 30000 });
    await p.click('.supportserveur .x-tab:has-text("Sauvegardes")');
    await p.waitForFunction((s) => { const e = Ext.ComponentQuery.query(s)[0]; return e && /Outil de sauvegarde/.test(e.getEl().dom.textContent); }, S('#sauvEtat'), { timeout: 30000 });
    const etat = await p.evaluate((s) => Ext.ComponentQuery.query(s)[0].getEl().dom.textContent, S('#sauvEtat'));
    ok('État : outil de sauvegarde de MariaDB trouvé, espace libre affiché', /Outil de sauvegarde : .*(mariadb-dump|mysqldump)/i.test(etat) && /Espace libre/.test(etat), etat.slice(0, 250));

    /* reglages par l'ecran : dossier et copie du test, automatique coupee le temps du test, conservation 48 h / 30 j */
    await p.evaluate(([s, d, c]) => {
      const f = (id) => Ext.ComponentQuery.query(s + ' ' + id)[0];
      f('#sauvDossier').setValue(d); f('#sauvCopie').setValue(c); f('#sauvActive').setValue(false);
      f('#sauvGarderHeures').setValue(48); f('#sauvGarderJours').setValue(30);
    }, [S(''), DOSSIER, COPIE]);
    await p.click('#' + await p.evaluate((s) => Ext.ComponentQuery.query(s)[0].getId(), S('#btnSauvReglages')));
    await p.waitForTimeout(1500);
    ok('Réglages enregistrés par l\'écran', q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_SAUVEGARDE_DOSSIER'") === DOSSIER
      && q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_SAUVEGARDE_COPIE'") === COPIE && q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_SAUVEGARDE_ACTIVE'") === '0');

    /* sauvegarde maintenant */
    const t0 = Date.now();
    await p.click('#' + await p.evaluate((s) => Ext.ComponentQuery.query(s)[0].getId(), S('#btnSauvMaintenant')));
    await p.waitForFunction((s) => /en cours/i.test(Ext.ComponentQuery.query(s)[0].getEl().dom.textContent), S('#sauvEtat'), { timeout: 15000 }).catch(() => {});
    ok('« Sauvegarder maintenant » : sauvegarde en cours affichée', await p.evaluate((s) => /en cours/i.test(Ext.ComponentQuery.query(s)[0].getEl().dom.textContent), S('#sauvEtat')));
    await p.waitForFunction(([s, id]) => { const g = Ext.ComponentQuery.query(s)[0]; const r = g && g.getStore().getAt(0);
      return r && r.get('id') > id && r.get('statut') !== 'EN_COURS'; }, [S('#sauvListe'), idAvant], { timeout: 900000, polling: 3000 });
    const ligne = await p.evaluate((s) => Ext.ComponentQuery.query(s)[0].getStore().getAt(0).getData(), S('#sauvListe'));
    ok('Historique : sauvegarde « Réussie », manuelle, avec taille et durée', ligne.statut === 'REUSSIE' && ligne.origine === 'MANUELLE' && ligne.tailleMo > 0 && ligne.dureeS >= 0,
      JSON.stringify(ligne));
    console.log('      durée ' + Math.round((Date.now() - t0) / 1000) + ' s, ' + ligne.tailleMo + ' Mo');

    const fichiers = fs.readdirSync(DOSSIER).filter((f) => /^prestige_.*\.sql\.gz$/.test(f));
    const nouveau = fichiers.find((f) => f !== recente && f !== vieille);
    ok('Fichier compressé créé dans le dossier, nommé par base et heure', !!nouveau && ligne.fichier === nouveau && !fichiers.some((f) => /partiel/.test(f)), fichiers.join(', '));
    /* relu par morceaux : decompresse, le fichier depasse la taille d'une chaine de Node (2,3 Go le 01/11) */
    const lu = !nouveau ? {} : await new Promise((fini, echec) => {
      const r = { tables: 0, declencheurs: false, routines: false, fin: '' };
      const rl = require('readline').createInterface({ input: fs.createReadStream(path.join(DOSSIER, nouveau)).pipe(zlib.createGunzip()).on('error', echec), crlfDelay: Infinity });
      rl.on('line', (l) => {
        if (l.startsWith('CREATE TABLE `')) { r.tables++; } else if (/^(\/\*!\d+ )?CREATE\b/.test(l)) {
          r.declencheurs = r.declencheurs || /\bTRIGGER\b/.test(l); r.routines = r.routines || /\b(PROCEDURE|FUNCTION)\b/.test(l);
        }
        if (l.trim()) { r.fin = l.slice(0, 200); }
      });
      rl.on('close', () => fini(r));
    });
    const tables = Number(q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'"));
    ok('Sauvegarde complète : « Dump completed », toutes les tables, déclencheurs et routines', /^-- Dump completed/.test(lu.fin || '') && lu.tables === tables
      && lu.declencheurs && lu.routines, JSON.stringify(lu) + ' / ' + tables + ' tables');
    ok('Copie identique sur le second dossier', !!nouveau && fs.existsSync(path.join(COPIE, nouveau))
      && fs.statSync(path.join(COPIE, nouveau)).size === fs.statSync(path.join(DOSSIER, nouveau)).size);
    ok('Conservation : la sauvegarde de 40 jours est retirée, celle de 10 jours gardée', !fs.existsSync(path.join(DOSSIER, vieille)) && fs.existsSync(path.join(DOSSIER, recente)));
    ok('Un fichier qui n\'est pas une sauvegarde de Prestige n\'est jamais touché', fs.readFileSync(path.join(DOSSIER, 'notes-pharmacien.txt'), 'utf8') === 'ne pas toucher');

    const restaurer = await p.evaluate((s) => Ext.ComponentQuery.query(s)[0].getEl().dom.textContent, S('#sauvRestaurer'));
    ok('Marche à suivre pour restaurer affichée', /Restaurer/.test(restaurer) && /mariadb/.test(restaurer), restaurer.slice(0, 200));

    /* aucun mot de passe */
    const fd = fs.openSync(LOG, 'r'); const n = fs.statSync(LOG).size - tailleLog; const buf = Buffer.alloc(Math.max(0, n)); fs.readSync(fd, buf, 0, buf.length, tailleLog); fs.closeSync(fd);
    const restes = fs.readdirSync(DOSSIER).concat(fs.readdirSync(COPIE)).filter((f) => !/\.sql\.gz$/.test(f) && f !== 'notes-pharmacien.txt' && f !== 'copie');
    ok('Aucun mot de passe : réponses de l\'API, journal du serveur, dossier', MDP.length > 0 && reponses.every((t) => t.indexOf(MDP) < 0)
      && buf.toString('utf8').indexOf(MDP) < 0 && restes.length === 0, restes.join(', '));

    droit.retirer();
    const p2 = await (await b.newContext()).newPage();
    await ouvrir(p2);
    const refus = await p2.evaluate(async () => Promise.all([['GET', 'etat'], ['POST', 'maintenant'], ['POST', 'reglages']].map(async ([m, u]) =>
      (await (await fetch('../api/v1/support/sauvegardes/' + u, { method: m, headers: { 'Content-Type': 'application/json' }, body: m === 'POST' ? '{}' : undefined })).json()))));
    ok('Sans le droit : l\'API refuse (état, sauvegarde, réglages)', refus.every((x) => x.success === false), JSON.stringify(refus[0]));
    ok('Aucune fenêtre, aucune erreur JavaScript', dialogues.length === 0 && err.length === 0, dialogues.concat(err).join(' | '));
  } catch (e) {
    ok('Exécution sans exception', false, e.stack);
  } finally {
    droit.remettre();
    await b.close();
    exec("DELETE FROM t_parameters WHERE str_KEY IN ('" + CLES.join("','") + "');"
      + (reglagesAvant && reglagesAvant !== 'NULL' ? reglagesAvant.split('|').map((kv) => { const i = kv.indexOf('=');
        return "INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED) VALUES ('" + kv.slice(0, i) + "', '" + kv.slice(i + 1).replace(/\\/g, '\\\\').replace(/'/g, "''") + "', 'Sauvegardes', 'SYSTEME', 'enable', NOW());"; }).join('') : '')
      + (q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_sauvegarde'") === '1' ? 'DELETE FROM t_sauvegarde WHERE id > ' + idAvant + ';' : ''));
    fs.rmSync(DOSSIER, { recursive: true, force: true });
    ok('Réglages, historique et fichiers du test retirés', !fs.existsSync(DOSSIER)
      && q("SELECT COALESCE(GROUP_CONCAT(CONCAT(str_KEY, '=', str_VALUE) ORDER BY str_KEY SEPARATOR '|'), 'NULL') FROM t_parameters WHERE str_KEY IN ('" + CLES.join("','") + "')") === (reglagesAvant || 'NULL'));
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
