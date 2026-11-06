/* BILAN AVANT / APRES (regle du 05/11) des archives chiffrees (cas 4, lot 4.C) : une sauvegarde par l'ecran a 1 avec la
 * cle posee, puis une a 0, laissent exactement les traces attendues, ni plus ni moins :
 *  - dossier des sauvegardes : UN fichier de plus, .sql.gz.aes (magie PRSTGA01), aucun .sql.gz en clair, aucun
 *    .partiel ; puis a 0 : UN .sql.gz (gzip) de plus, rien d'autre ;
 *  - dossier prive du domaine : aucun fichier d'options prestige-sauvegarde* qui reste ;
 *  - t_sauvegarde : une ligne de plus par sauvegarde (REUSSIE, fichier = celui du dossier, taille = celle du fichier,
 *    message vide a 1 avec cle) ; les lignes anterieures inchangees ;
 *  - t_parameters identique (aucune valeur touchee par une sauvegarde) ; t_securite_journal identique (une sauvegarde
 *    ne journalise pas) ;
 *  - a 1 SANS la cle : sauvegarde reussie EN CLAIR avec le message qui dit quoi faire (7-cle-archive.ps1 -Creer) ;
 *  - server.log : aucune trace de la cle, du contenu du fichier DPAPI ni d'un mot de passe.
 * E2E_DEFAUT=1 : defaut simule (un fichier en clair de trop depose dans le dossier, comme un .partiel oublie) ; le test
 * doit alors echouer. Reglages : BASE, DB_TEST + E2E_BASE_LIBRE=1, PAYARA_DOMAINE. Parametre remis a 0 a la fin. */
const { chromium } = require('playwright-core');
const A = require('./archives-commun');
const { ENV_E2E, q, exec, parametre, reglages, remettreReglages, connexion, ouvrirOnglet, texteServeur, fs, os, path } = A;

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 600) + ']' : '')); }
if (!ENV_E2E.WINDOWS) { console.log('Test Windows seulement : rien a faire ici.'); process.exit(0); }
const DEFAUT = process.env.E2E_DEFAUT === '1';
const TMP = path.join(os.tmpdir(), 'e2e-archives-bilan');
const DOSSIER = path.join(TMP, 'sauvegardes'), IDENTIFIANTS = path.join(TMP, 'sauvegarde.cnf'), CLE = path.join(TMP, 'archive.cnf');
const PRIVE = ENV_E2E.PAYARA_DOMAINE + '/prestige-prive';
const empreinteParametres = () => q("SELECT MD5(GROUP_CONCAT(CONCAT(str_KEY, '=', COALESCE(str_VALUE, '')) ORDER BY str_KEY SEPARATOR '|')), COUNT(*) FROM t_parameters");
const empreinteJournal = () => q('SELECT MD5(COALESCE(GROUP_CONCAT(CONCAT_WS("|", id, dt_DATE, str_LOGIN, str_ACTION, str_RESULTAT, COALESCE(str_DETAIL, "")) ORDER BY id SEPARATOR "#"), "")), COUNT(*) FROM t_securite_journal');
const empreinteSauvegardes = (jusqua) => q('SELECT MD5(COALESCE(GROUP_CONCAT(CONCAT_WS("|", id, debut, fin, statut, COALESCE(fichier, ""), taille_octets, COALESCE(message, "")) ORDER BY id SEPARATOR "#"), "")), COUNT(*) FROM t_sauvegarde WHERE id <= ' + jusqua);
const prives = () => (fs.existsSync(PRIVE) ? fs.readdirSync(PRIVE).filter((f) => /^prestige-sauvegarde/.test(f)) : []);

(async () => {
  const idSauvegarde = Number(q('SELECT COALESCE(MAX(id), 0) FROM t_sauvegarde'));
  const reglagesAvant = reglages();
  fs.rmSync(TMP, { recursive: true, force: true });
  fs.mkdirSync(DOSSIER, { recursive: true });
  A.identifiants(IDENTIFIANTS);
  /* cle posee par le module (le vrai script 7 est joue par le test de rapprochement) */
  A.ps(". '" + A.MODULE + "'; Ecrire-CleArchive '" + CLE + "' (Octets-Cle 'ABCD-EFGH-JKLM-NPQR-STUV-WXYZ-2345-6789') '" + A.compteWindows + "'");
  parametre('KEY_SECURITE_BASE', '1'); parametre('KEY_SECURITE_FICHIER_IDENTIFIANTS', IDENTIFIANTS); parametre('KEY_SECURITE_FICHIER_CLE_ARCHIVE', CLE);
  parametre('KEY_SECURITE_DOSSIER_COPIES', path.join(TMP, 'copies-vide'));
  parametre('KEY_SAUVEGARDE_DOSSIER', DOSSIER); parametre('KEY_SAUVEGARDE_COPIE', ''); parametre('KEY_SAUVEGARDE_ACTIVE', '0');
  parametre('KEY_SAUVEGARDE_GARDER_HEURES', '48'); parametre('KEY_SAUVEGARDE_GARDER_JOURS', '30');
  const avant = { parametres: empreinteParametres(), journal: empreinteJournal(), sauvegardes: empreinteSauvegardes(idSauvegarde), fichiers: A.listing(DOSSIER), prives: prives(), log: Date.now() };
  const b = await ENV_E2E.lancer(chromium);
  const dialogues = [], err = [];
  const contexte = await b.newContext({ viewport: { width: 1600, height: 1000 } });
  contexte.on('page', (pg) => { pg.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); }); pg.on('pageerror', (e) => err.push(String(e.message))); });
  try {
    const p = await contexte.newPage();
    await connexion(p, ENV_E2E.LOGIN_SUPPORT, 'e2etest');
    await ouvrirOnglet(p);
    await A.ouvrirSauvegardes(p);

    /* 1. a 1 avec la cle */
    const l1 = await A.sauvegarder(p, idSauvegarde);
    if (DEFAUT) { fs.writeFileSync(path.join(DOSSIER, 'prestige_' + A.BASE + '_20261106_0000.sql.gz.partiel'), 'défaut simulé : fichier provisoire en clair oublié'); }
    const apres1 = { parametres: empreinteParametres(), journal: empreinteJournal(), sauvegardes: empreinteSauvegardes(idSauvegarde), fichiers: A.listing(DOSSIER), prives: prives() };
    const nouveaux1 = apres1.fichiers.filter((f) => avant.fichiers.indexOf(f) < 0);
    const f1 = path.join(DOSSIER, nouveaux1[0] || 'absent');
    const b1 = A.ligneSauvegarde(l1.id).split('<|>');
    ok('À 1 avec la clé : exactement UN fichier de plus dans le dossier, .sql.gz.aes, magie PRSTGA01, pas de .sql.gz en clair ni de .partiel',
      nouveaux1.length === 1 && /^prestige_.*\.sql\.gz\.aes$/.test(nouveaux1[0]) && A.lisible(f1) && A.magie(f1) === 'PRSTGA01' && !A.estGzip(f1), nouveaux1.join(',') + ' ' + (b1[5] || ''));
    ok('t_sauvegarde : une ligne de plus, REUSSIE, fichier = celui du dossier, taille = taille du fichier, message vide ; lignes antérieures inchangées',
      Number(q('SELECT COUNT(*) FROM t_sauvegarde WHERE id > ' + idSauvegarde)) === 1 && b1[1] === 'REUSSIE' && b1[2] === nouveaux1[0] && Number(b1[3]) === A.taille(f1) && b1[5] === '' && apres1.sauvegardes === avant.sauvegardes, b1.join(' | '));
    ok('Taille de l\'archive = formule (en-tête 44 + blocs de 16 bourrés + HMAC 32) pour un gzip entier : (taille − 76) multiple de 16', (A.taille(f1) - 76) % 16 === 0 && A.taille(f1) > 1024, String(A.taille(f1)));
    ok('t_parameters identique, t_securite_journal identique (une sauvegarde ne journalise pas), dossier privé sans fichier d\'options qui reste',
      apres1.parametres === avant.parametres && apres1.journal === avant.journal && apres1.prives.length === 0, JSON.stringify(apres1.prives));

    /* 2. a 1 sans la cle : en clair, message */
    parametre('KEY_SECURITE_FICHIER_CLE_ARCHIVE', path.join(TMP, 'absente.cnf'));
    const l2 = await A.sauvegarder(p, l1.id);
    const apres2 = { fichiers: A.listing(DOSSIER) };
    const nouveaux2 = apres2.fichiers.filter((f) => apres1.fichiers.indexOf(f) < 0);
    ok('À 1 SANS la clé : sauvegarde « Réussie » EN CLAIR (.sql.gz, gzip) avec le message « Archive NON chiffrée : clé des archives absente (…7-cle-archive.ps1 -Creer) », un seul fichier de plus',
      l2.statut === 'REUSSIE' && nouveaux2.length === 1 && /\.sql\.gz$/.test(nouveaux2[0]) && A.estGzip(path.join(DOSSIER, nouveaux2[0])) && /Archive NON chiffrée/.test(l2.message) && /7-cle-archive\.ps1 -Creer/.test(l2.message) && l2.message.indexOf('absente.cnf') >= 0, JSON.stringify(l2));

    /* 3. a 0 : comme avant, octet pour octet (gzip), message vide */
    parametre('KEY_SECURITE_BASE', '0'); parametre('KEY_SECURITE_FICHIER_CLE_ARCHIVE', CLE);
    const l0 = await A.sauvegarder(p, l2.id);
    const apres0 = { parametres: empreinteParametres(), journal: empreinteJournal(), fichiers: A.listing(DOSSIER), prives: prives() };
    const nouveaux0 = apres0.fichiers.filter((f) => apres2.fichiers.indexOf(f) < 0);
    ok('À 0 (clé présente mais sécurité inactive) : UN .sql.gz en clair de plus, gzip, message vide, rien d\'autre ; t_parameters et journal toujours identiques',
      l0.statut === 'REUSSIE' && nouveaux0.length === 1 && /\.sql\.gz$/.test(nouveaux0[0]) && A.estGzip(path.join(DOSSIER, nouveaux0[0])) && l0.message === '' && apres0.parametres === avant.parametres && apres0.journal === avant.journal && apres0.prives.length === 0,
      JSON.stringify(l0) + ' ' + nouveaux0.join(','));
    ok('Trois sauvegardes : trois lignes de plus dans t_sauvegarde, trois fichiers de plus dans le dossier, ni plus ni moins',
      Number(q('SELECT COUNT(*) FROM t_sauvegarde WHERE id > ' + idSauvegarde)) === 3 && apres0.fichiers.length === avant.fichiers.length + 3, apres0.fichiers.join(','));

    /* 4. server.log : rien de secret */
    const log = texteServeur(avant.log);
    const dpapi = fs.readFileSync(CLE, 'utf8').split(/\r?\n/)[1] || 'xx';
    ok('server.log écrit pendant le test : ni la clé, ni le bloc DPAPI de la clé, ni « password= » renseigné, ni la magie des archives',
      log.indexOf('ABCD-EFGH-JKLM') < 0 && log.indexOf(dpapi.slice(0, 24)) < 0 && !/password=[^\s*"']{2,}/i.test(log) && log.indexOf('PRSTGA01') < 0, String(log.length) + ' octets');
    ok('Aucune fenêtre, aucune erreur JavaScript', dialogues.length === 0 && err.length === 0, dialogues.concat(err).join(' | '));
  } catch (e) {
    ok('Exécution sans exception', false, e.stack);
  } finally {
    await b.close().catch(() => {});
    remettreReglages(reglagesAvant);
    exec('DELETE FROM t_sauvegarde WHERE id > ' + idSauvegarde + ';');
    for (const f of [CLE, IDENTIFIANTS]) { try { A.execFileSync('icacls', [f, '/grant', process.env.USERNAME + ':F'], { stdio: 'ignore' }); } catch (e) { /* */ } }
    fs.rmSync(TMP, { recursive: true, force: true });
    ok('Paramètres remis (KEY_SECURITE_BASE à sa valeur d\'origine), historique et fichiers d\'essai retirés', reglages() === reglagesAvant && q('SELECT COALESCE(MAX(id), 0) FROM t_sauvegarde') === String(idSauvegarde) && !fs.existsSync(TMP));
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK' + (DEFAUT ? ' (défaut simulé : le test doit échouer)' : ''));
    process.exit(ko ? 1 : 0);
  }
})();
