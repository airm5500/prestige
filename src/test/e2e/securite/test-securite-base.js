/* SECURITE DU STOCKAGE DU MOT DE PASSE DE LA BASE (cas 4, lot 4.A), parametre KEY_SECURITE_BASE. Windows seulement
 * (DPAPI). Par les vrais chemins : le script outils/officine/2-configurer-mariadb.ps1 -CreerCompte (compte dedie et
 * fichier chiffre), puis Centre de support > Stabilite du serveur > Sauvegardes, et Gestion du stock > Fiche Article.
 *  - a 0 : « Sauvegarder maintenant » lit domain.xml comme avant -> empreinte du fichier (tables, lignes, routines) ;
 *  - a 1 : la meme sauvegarde passe par le compte dedie (vu dans la liste des connexions pendant le dump), le fichier
 *    a le meme contenu ; « Valoriser » sur cette sauvegarde donne les memes totaux qu'a 0 ;
 *  - a 1, fichier d'identifiants absent : sauvegarde « Échec » avec un message qui dit quoi faire, aucun mot de passe
 *    dans server.log ni dans les reponses de l'API ;
 *  - a 1, l'edition « Imprimer » de la fiche article (JSP, jconnexion) passe par le pool JNDI (ligne du journal) et
 *    produit son PDF ; a 0, elle repasse par la connexion directe ;
 *  - aucun fichier d'options oublie dans le dossier prive ; aucune fenetre, aucune erreur JavaScript ;
 *  - parametres remis, historique, compte, fichiers du test retires.
 * Reglages : BASE (URL de Prestige), DB_TEST + E2E_BASE_LIBRE=1 (autre base), PAYARA_DOMAINE (journal, domain.xml).
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const readline = require('readline');
const { connexion, ouvrirMenu, cliquer } = require('../outils/vues');
const privilegeEssai = require('../support/privilege-essai');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
if (!ENV_E2E.WINDOWS) { console.log('Test Windows seulement (DPAPI) : rien a faire ici.'); process.exit(0); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const droit = privilegeEssai(q, exec, ENV_E2E.LOGIN_SUPPORT, 'P_SM_SUPPORT_SERVEUR');
const RACINE = path.resolve(__dirname, '..', '..', '..', '..');
const TMP = path.join(os.tmpdir(), 'e2e-securite-base');
const DOSSIER = path.join(TMP, 'sauvegardes');
const FICHIER = path.join(TMP, 'sauvegarde.cnf');
const COMPTE = 'prestige_sauvegarde_e2e';
const CLES = ['KEY_SECURITE_BASE', 'KEY_SECURITE_FICHIER_IDENTIFIANTS', 'KEY_SAUVEGARDE_DOSSIER', 'KEY_SAUVEGARDE_COPIE', 'KEY_SAUVEGARDE_ACTIVE', 'KEY_SAUVEGARDE_GARDER_HEURES', 'KEY_SAUVEGARDE_GARDER_JOURS'];
/* tables que le serveur ecrit entre deux sauvegardes (historique, journaux, sessions) : lignes non comparees */
const VIVANTES = /^(t_sauvegarde|t_support_|t_session|t_parameters$|t_application_event|t_serveur_|t_rum|t_journal|t_poste|t_mobile|t_audit|t_log|t_prestige|t_connexion|t_user$|t_statistique|t_alerte|t_notification|t_sms|t_whatsapp|t_veille|t_pointage|t_anomalie|t_tache|t_incident|t_maintenance)/;
const DOSSIER_PRIVE = ENV_E2E.PAYARA_DOMAINE + '/prestige-prive';
const LOG = ENV_E2E.JOURNAL_SERVEUR;
/* mot de passe du pool : ne doit apparaitre nulle part (lu ici pour le chercher, jamais affiche) */
const MDP = ((fs.readFileSync(ENV_E2E.PAYARA_DOMAINE + '/config/domain.xml', 'utf8').match(/name="laborex_pool"[\s\S]*?<\/jdbc-connection-pool>/) || [''])[0]
  .match(/name="[Pp]assword" value="([^"]*)"/) || [])[1] || '';

const journalDepuis = (depuis) => { const n = fs.statSync(LOG).size - depuis; if (n <= 0) { return ''; } const fd = fs.openSync(LOG, 'r'); const b = Buffer.alloc(n); fs.readSync(fd, b, 0, n, depuis); fs.closeSync(fd); return b.toString('utf8'); };
const parametre = (cle, valeur) => exec(valeur === null ? "DELETE FROM t_parameters WHERE str_KEY = '" + cle + "'"
  : "INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED) VALUES ('" + cle + "', '" + valeur.replace(/\\/g, '\\\\').replace(/'/g, "''") + "', 'essai e2e', 'SYSTEME', 'enable', NOW()) ON DUPLICATE KEY UPDATE str_VALUE = VALUES(str_VALUE)");
const sanitize = (s) => String(s || '').replace(/\s+/g, ' ');

/* empreinte d'une sauvegarde : lignes INSERT par table (nombre, condensat), tables creees, routines, declencheurs, fin */
function empreinte(fichier) {
  return new Promise((fini, echec) => {
    const r = { tables: {}, creees: 0, declencheurs: false, routines: false, evenements: false, fin: '' };
    const rl = readline.createInterface({ input: fs.createReadStream(fichier).pipe(zlib.createGunzip()).on('error', echec), crlfDelay: Infinity });
    rl.on('line', (l) => {
      if (l.startsWith('INSERT INTO `')) {
        const t = l.slice(13, l.indexOf('`', 13));
        const e = r.tables[t] || (r.tables[t] = { n: 0, h: crypto.createHash('sha1') });
        e.n++; e.h.update(l); e.h.update('\n');
      } else if (l.startsWith('CREATE TABLE `')) { r.creees++; } else if (/^(\/\*!\d+ )?CREATE\b/.test(l)) {
        r.declencheurs = r.declencheurs || /\bTRIGGER\b/.test(l); r.routines = r.routines || /\b(PROCEDURE|FUNCTION)\b/.test(l); r.evenements = r.evenements || /\bEVENT\b/.test(l);
      }
      if (l.trim()) { r.fin = l.slice(0, 120); }
    });
    rl.on('close', () => { for (const t of Object.keys(r.tables)) { r.tables[t].h = r.tables[t].h.digest('hex'); } fini(r); });
  });
}
function comparer(a, b) {
  const ecarts = [], vivantes = [];
  for (const t of new Set([...Object.keys(a.tables), ...Object.keys(b.tables)])) {
    const x = a.tables[t], y = b.tables[t];
    if (!x || !y || x.n !== y.n || x.h !== y.h) { (VIVANTES.test(t) ? vivantes : ecarts).push(t + (x && y ? ' (' + x.n + '/' + y.n + ')' : ' (absente)')); }
  }
  return { ecarts, vivantes };
}

(async () => {
  droit.remettre();
  const idAvant = Number(q('SELECT COALESCE(MAX(id), 0) FROM t_sauvegarde'));
  const reglagesAvant = q("SELECT GROUP_CONCAT(CONCAT(str_KEY, '=', str_VALUE) ORDER BY str_KEY SEPARATOR '|') FROM t_parameters WHERE str_KEY IN ('" + CLES.join("','") + "')");
  fs.rmSync(TMP, { recursive: true, force: true });
  fs.mkdirSync(DOSSIER, { recursive: true });
  exec("DROP USER IF EXISTS '" + COMPTE + "'@'localhost'");
  const optionsRoot = (ENV_E2E.MARIADB[0] || '').replace('--defaults-extra-file=', '');
  const port = q('SELECT @@port');

  /* 1. compte dedie et fichier chiffre par le vrai script (my.ini : une copie d'essai, jamais le vrai) */
  fs.writeFileSync(path.join(TMP, 'my.ini'), '[mysqld]\r\ndatadir=' + q('SELECT @@datadir').replace(/\\/g, '/') + '\r\n');
  let sortie = '';
  try {
    sortie = execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(RACINE, 'outils', 'officine', '2-configurer-mariadb.ps1'),
      '-Ini', path.join(TMP, 'my.ini'), '-DossierJournal', path.join(TMP, 'journal'), '-SansMemoire', '-CreerCompte', '-Compte', COMPTE, '-Port', port,
      '-OptionsRoot', optionsRoot, '-FichierOptions', FICHIER, '-ComptePayara', process.env.USERDOMAIN + '\\' + process.env.USERNAME, '-Base', BASE], { encoding: 'utf8' });
  } catch (e) { sortie = String(e.stdout) + String(e.stderr); }
  const contenu = fs.existsSync(FICHIER) ? fs.readFileSync(FICHIER, 'utf8') : '';
  ok('Script 2 -CreerCompte : compte dédié créé, fichier d\'options chiffré (en-tête DPAPI, rien en clair)', /options chiffrees/.test(sortie)
    && q("SELECT COUNT(*) FROM mysql.user WHERE User = '" + COMPTE + "'") === '1' && /^# Prestige : identifiants de sauvegarde chiffres \(DPAPI\)/.test(contenu)
    && contenu.indexOf('[client]') < 0 && contenu.indexOf(COMPTE) < 0, sanitize(sortie).slice(-300));
  const droits = q("SHOW GRANTS FOR '" + COMPTE + "'@'localhost'");
  ok('Droits du compte dédié : lecture, sauvegarde, journal et base temporaire de valorisation seulement', /GRANT SELECT, RELOAD, LOCK TABLES, BINLOG MONITOR, SHOW VIEW, EVENT, TRIGGER ON \*\.\*/.test(droits)
    && /GRANT ALL PRIVILEGES ON `prestige_valo_tmp`\.\*/.test(droits) && !/GRANT ALL PRIVILEGES ON \*\.\*/.test(droits), droits.replace(/IDENTIFIED BY PASSWORD '[^']*'/g, 'IDENTIFIED BY ***'));

  /* reglages de la sauvegarde pour le test (dossier du test, pas de copie, automatique coupee) */
  parametre('KEY_SAUVEGARDE_DOSSIER', DOSSIER); parametre('KEY_SAUVEGARDE_COPIE', ''); parametre('KEY_SAUVEGARDE_ACTIVE', '0');
  parametre('KEY_SAUVEGARDE_GARDER_HEURES', '48'); parametre('KEY_SAUVEGARDE_GARDER_JOURS', '30');
  parametre('KEY_SECURITE_BASE', '0'); parametre('KEY_SECURITE_FICHIER_IDENTIFIANTS', FICHIER);
  const b = await ENV_E2E.lancer(chromium);
  const dialogues = [], err = [], reponses = [], editions = [];
  const contexte = await b.newContext({ viewport: { width: 1600, height: 950 } });
  contexte.on('page', (pg) => { pg.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); }); pg.on('pageerror', (e) => err.push(String(e.message))); });
  contexte.on('response', async (r) => {
    if (/api\/v1\/support\/sauvegardes/.test(r.url())) { try { reponses.push(await r.text()); } catch (e) { /* */ } }
    if (/ws_generate_pdf\.jsp/.test(r.url())) { editions.push({ statut: r.status(), type: r.headers()['content-type'] || '' }); }
  });
  const S = (sel) => 'supportserveur #ongletSauvegardes ' + sel;
  const id = (p, sel) => p.evaluate((s) => Ext.ComponentQuery.query(s)[0].getId(), S(sel));
  const sauvegarder = async (p, apres) => {
    await p.click('#' + await id(p, '#btnSauvMaintenant'));
    const t0 = Date.now();
    await p.waitForFunction(([s, i]) => { const r = Ext.ComponentQuery.query(s)[0].getStore().getAt(0); return r && r.get('id') > i && r.get('statut') !== 'EN_COURS'; },
      [S('#sauvListe'), apres], { timeout: 900000, polling: 3000 }).catch(() => {});
    const ligne = await p.evaluate((s) => Ext.ComponentQuery.query(s)[0].getStore().getAt(0).getData(), S('#sauvListe'));
    ligne.duree = Math.round((Date.now() - t0) / 1000);
    return ligne;
  };
  const totauxValorisation = async (p) => {
    const t = {};
    for (const m of [1, 2, 3]) {
      await p.evaluate(([s, v]) => Ext.ComponentQuery.query(s)[0].select(v), [S('#sauvValoPar'), String(m)]);
      await p.waitForTimeout(800);
      t[m] = await p.evaluate((s) => { const r = { lignes: 0, achatRayon: 0, venteRayon: 0, achatReserve: 0, venteReserve: 0 };
        Ext.ComponentQuery.query(s)[0].getStore().each((x) => { r.lignes++; ['achatRayon', 'venteRayon', 'achatReserve', 'venteReserve'].forEach((k) => { r[k] += x.get(k); }); }); return r; }, S('#sauvValoListe'));
    }
    return t;
  };
  try {
    const p = await contexte.newPage();
    await connexion(p, ENV_E2E.LOGIN_SUPPORT, 'e2etest');
    await ouvrirMenu(p, 'CENTRE DE SUPPORT', 'Stabilité du serveur');
    await p.waitForFunction(() => Ext.ComponentQuery.query('supportserveur').length > 0, null, { timeout: 30000 });
    await p.click('.supportserveur .x-tab:has-text("Sauvegardes")');
    await p.waitForFunction((s) => { const e = Ext.ComponentQuery.query(s)[0]; return e && /Outil de sauvegarde/.test(e.getEl().dom.textContent); }, S('#sauvEtat'), { timeout: 30000 });

    /* 2. parametre a 0 : comme avant (domain.xml) */
    let depuis = fs.statSync(LOG).size;
    const l0 = await sauvegarder(p, idAvant);
    ok('À 0 : sauvegarde « Réussie » par l\'écran, comme avant (' + l0.duree + ' s)', l0.statut === 'REUSSIE' && l0.fichier, JSON.stringify(l0));
    const e0 = l0.fichier ? await empreinte(path.join(DOSSIER, l0.fichier)) : null;
    const tables = Number(q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'"));
    ok('À 0 : fichier complet (« Dump completed », toutes les tables, routines, déclencheurs)', e0 && /^-- Dump completed/.test(e0.fin) && e0.creees === tables && e0.routines && e0.declencheurs,
      e0 && (e0.creees + '/' + tables + ' tables, ' + Object.keys(e0.tables).length + ' avec des lignes'));
    ok('À 0 : aucun fichier d\'options oublié dans le dossier privé du domaine', !fs.existsSync(DOSSIER_PRIVE) || fs.readdirSync(DOSSIER_PRIVE).filter((f) => /\.cnf$/.test(f)).length === 0);
    const t0 = await (async () => { await p.click('.supportserveur .sauv-valoriser >> nth=0');
      await p.waitForFunction((s) => { const g = Ext.ComponentQuery.query(s)[0]; return g && g.isVisible(true) && g.getStore().getCount() > 0; }, S('#sauvValoListe'), { timeout: 600000, polling: 2000 });
      return totauxValorisation(p); })();
    ok('À 0 : valorisation de la sauvegarde affichée (famille, rayon, grossiste)', t0[1].lignes > 0 && t0[2].lignes > 0 && t0[3].lignes > 0, JSON.stringify(t0[1]));

    /* 3. parametre a 1 : compte dedie, fichier chiffre */
    parametre('KEY_SECURITE_BASE', '1');
    const id1 = Number(q('SELECT COALESCE(MAX(id), 0) FROM t_sauvegarde'));
    depuis = fs.statSync(LOG).size;
    let compteVu = false;
    const sonde = setInterval(() => { try { if (q("SELECT COUNT(*) FROM information_schema.PROCESSLIST WHERE USER = '" + COMPTE + "'") !== '0') { compteVu = true; } } catch (e) { /* */ } }, 1500);
    const l1 = await sauvegarder(p, id1);
    clearInterval(sonde);
    ok('À 1 : sauvegarde « Réussie » par l\'écran avec le compte dédié (' + l1.duree + ' s)', l1.statut === 'REUSSIE' && l1.fichier && compteVu, JSON.stringify(l1) + ' compte vu : ' + compteVu);
    const e1 = l1.fichier ? await empreinte(path.join(DOSSIER, l1.fichier)) : null;
    const c = e0 && e1 ? comparer(e0, e1) : { ecarts: ['sauvegarde manquante'], vivantes: [] };
    ok('À 1 : même contenu qu\'à 0 (tables, lignes, routines, déclencheurs, événements)', e1 && c.ecarts.length === 0 && e1.creees === e0.creees && e1.routines === e0.routines
      && e1.declencheurs === e0.declencheurs && e1.evenements === e0.evenements && /^-- Dump completed/.test(e1.fin),
      'écarts : ' + (c.ecarts.join(', ') || 'aucun') + ' ; tables vivantes différentes : ' + (c.vivantes.join(', ') || 'aucune'));
    ok('À 1 : aucun fichier d\'options oublié dans le dossier privé, et le dossier privé n\'est lisible que par le compte du serveur',
      fs.existsSync(DOSSIER_PRIVE) && fs.readdirSync(DOSSIER_PRIVE).filter((f) => /\.cnf$/.test(f)).length === 0
      && !/BUILTIN|Utilisateurs|Users|Tout le monde|Everyone/.test(execFileSync('icacls', [DOSSIER_PRIVE], { encoding: 'utf8' })), fs.existsSync(DOSSIER_PRIVE) ? sanitize(execFileSync('icacls', [DOSSIER_PRIVE], { encoding: 'utf8' })) : 'absent');
    await p.click('.supportserveur .sauv-valoriser >> nth=0');
    await p.waitForTimeout(1500);
    await p.waitForFunction((s) => { const g = Ext.ComponentQuery.query(s)[0]; return g && g.isVisible(true) && g.getStore().getCount() > 0; }, S('#sauvValoListe'), { timeout: 600000, polling: 2000 });
    const t1 = await totauxValorisation(p);
    ok('À 1 : valorisation par le compte dédié, mêmes totaux qu\'à 0', JSON.stringify(t1) === JSON.stringify(t0), JSON.stringify(t1[1]) + ' / ' + JSON.stringify(t0[1]));

    /* 4. a 1, fichier absent : echec propre, sans secret */
    parametre('KEY_SECURITE_FICHIER_IDENTIFIANTS', path.join(TMP, 'absent.cnf'));
    const id2 = Number(q('SELECT COALESCE(MAX(id), 0) FROM t_sauvegarde'));
    const l2 = await sauvegarder(p, id2);
    ok('À 1 sans fichier d\'identifiants : sauvegarde « Échec » avec la marche à suivre, pas de fichier', l2.statut === 'ECHEC' && /introuvable/.test(l2.message) && /-CreerCompte/.test(l2.message) && !l2.fichier, JSON.stringify(l2));
    const journal = journalDepuis(depuis);
    ok('Aucun mot de passe dans le journal du serveur ni dans les réponses de l\'API', MDP.length > 0 && journal.indexOf(MDP) < 0 && !/password=(?!\*\*\*)[^\s"&*]+/i.test(journal)
      && reponses.every((t) => t.indexOf(MDP) < 0), journal.length + ' octets de journal');
    parametre('KEY_SECURITE_FICHIER_IDENTIFIANTS', FICHIER);

    /* 5. anciens ecrans : Fiche Article > Imprimer (JSP) par le pool a 1, par la connexion directe a 0 */
    await ouvrirMenu(p, 'GESTION DU STOCK', 'Fiche Article');
    await p.waitForFunction(() => Ext.ComponentQuery.query('famillemanager').some((c) => c.isVisible(true)), null, { timeout: 120000 });
    await p.waitForTimeout(2000);
    /* recherche au clavier pour une edition courte (l'edition complete liste tous les articles) */
    await cliquer(p, 'famillemanager #rechecher');
    await p.keyboard.type('PARA');
    await p.keyboard.press('Enter');
    await p.waitForTimeout(3000);
    const imprimer = async () => {
      const avant = editions.length;
      const [popup] = await Promise.all([contexte.waitForEvent('page', { timeout: 60000 }), cliquer(p, 'famillemanager button[text=Imprimer]')]);
      await popup.waitForLoadState('load', { timeout: 300000 }).catch(() => {});
      const fin = Date.now() + 300000;
      while (editions.length <= avant && Date.now() < fin) { await p.waitForTimeout(1000); }
      const url = popup.url();
      await popup.close().catch(() => {});
      /* la JSP ecrit le PDF puis redirige (302) vers lui ; le journal du serveur peut s'ecrire quelques secondes apres */
      return Object.assign(editions[avant] || { statut: 0, type: 'aucune réponse' }, { url });
    };
    const journalAttendu = async (depuis, motif) => { const fin = Date.now() + 15000; let j = journalDepuis(depuis);
      while (!motif.test(j) && Date.now() < fin) { await p.waitForTimeout(1000); j = journalDepuis(depuis); } return j; };
    const edite = (r) => (r.statut === 200 || r.statut === 302) && (/pdf/i.test(r.type) || /\.pdf(\?|$)/i.test(r.url));
    await p.waitForTimeout(16000); /* le parametre est relu toutes les 15 s par les anciens ecrans */
    depuis = fs.statSync(LOG).size;
    const r1 = await imprimer();
    let j = await journalAttendu(depuis, /par le pool JNDI jdbc\/__laborex_pool/);
    ok('À 1 : « Imprimer » de la fiche article (JSP) produit son PDF et passe par le pool JNDI (ligne du journal)', edite(r1) && /par le pool JNDI jdbc\/__laborex_pool/.test(j),
      JSON.stringify(r1) + ' ' + (j.match(/Anciens écrans[^\n]*/) || [''])[0]);
    ok('À 1 : aucune URL JDBC ni mot de passe dans le journal', j.indexOf(MDP) < 0 && !/jdbc:mysql:\/\/[^\s*]/.test(j));
    parametre('KEY_SECURITE_BASE', '0');
    await p.waitForTimeout(16000);
    depuis = fs.statSync(LOG).size;
    const r0 = await imprimer();
    j = await journalAttendu(depuis, /connexion JDBC directe/);
    ok('À 0 : « Imprimer » repasse par la connexion directe (ligne du journal) et produit son PDF', edite(r0) && /connexion JDBC directe/.test(j),
      JSON.stringify(r0) + ' ' + (j.match(/Anciens écrans[^\n]*/) || [''])[0]);
    ok('Aucune fenêtre, aucune erreur JavaScript', dialogues.length === 0 && err.length === 0, dialogues.concat(err).join(' | '));
  } catch (e) {
    ok('Exécution sans exception', false, e.stack);
  } finally {
    droit.remettre();
    await b.close().catch(() => {});
    exec("DELETE FROM t_parameters WHERE str_KEY IN ('" + CLES.join("','") + "');"
      + (reglagesAvant && reglagesAvant !== 'NULL' ? reglagesAvant.split('|').map((kv) => { const i = kv.indexOf('=');
        return "INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED) VALUES ('" + kv.slice(0, i) + "', '" + kv.slice(i + 1).replace(/\\/g, '\\\\').replace(/'/g, "''") + "', 'Sauvegardes / sécurité', 'SYSTEME', 'enable', NOW());"; }).join('') : '')
      + 'DELETE FROM t_sauvegarde WHERE id > ' + idAvant + ';'
      + "DROP USER IF EXISTS '" + COMPTE + "'@'localhost'; DROP DATABASE IF EXISTS prestige_valo_tmp;");
    try { execFileSync('icacls', [FICHIER, '/grant', process.env.USERNAME + ':F'], { stdio: 'ignore' }); } catch (e) { /* */ }
    fs.rmSync(TMP, { recursive: true, force: true });
    ok('Paramètres remis, historique, compte dédié et fichiers du test retirés', !fs.existsSync(TMP) && q("SELECT COUNT(*) FROM mysql.user WHERE User = '" + COMPTE + "'") === '0'
      && q("SELECT COALESCE(GROUP_CONCAT(CONCAT(str_KEY, '=', str_VALUE) ORDER BY str_KEY SEPARATOR '|'), 'NULL') FROM t_parameters WHERE str_KEY IN ('" + CLES.join("','") + "')") === (reglagesAvant || 'NULL')
      && q('SELECT COALESCE(MAX(id), 0) FROM t_sauvegarde') === String(idAvant));
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
