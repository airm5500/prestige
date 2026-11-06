/* RAPPROCHEMENT (regle du 05/11) des archives chiffrees (cas 4, lot 4.C) : la meme donnee est comparee partout ou
 * elle apparait :
 *  - cle des archives : posee par le VRAI script 7 -> fichier DPAPI (en-tete, rien en clair), date dans t_parameters
 *    (KEY_SECURITE_CLE_ARCHIVE_DATE) = ligne CLE_ARCHIVE de t_securite_journal = onglet Securite (« CHIFFREES (AES) »,
 *    « cle posee le ... ») = API securite/etat = onglet Sauvegardes (« Archives : chiffrees ») = API sauvegardes/etat ;
 *  - dernier essai de restauration : t_parameters (date, resultat) = onglet (ligne, rappel a plus d'un mois) = API ;
 *  - sauvegarde a 1 par l'ecran : fichier .sql.gz.aes du dossier (magie PRSTGA01, pas gzip) = t_sauvegarde.fichier =
 *    ligne de l'historique = onglet Securite (« derniere sauvegarde integree : ... (chiffree) ») ; dechiffre avec la cle
 *    captee a la creation (module PowerShell), c'est un dump complet (« Dump completed ») de MEME empreinte (tables,
 *    lignes INSERT) que la sauvegarde en clair faite a 0 juste apres ; « Valoriser » sur l'archive chiffree donne les
 *    memes totaux que sur l'archive en clair ;
 *  - instructions de restauration de l'ecran : citent le fichier .aes et le script 7 -Dechiffrer.
 * E2E_DEFAUT=1 : defaut simule (la date de la cle changee en base apres l'affichage) ; le test doit alors echouer.
 * Reglages : BASE, DB_TEST + E2E_BASE_LIBRE=1, PAYARA_DOMAINE. Parametre remis a 0 a la fin, tout retire. */
const { chromium } = require('playwright-core');
const A = require('./archives-commun');
const { ENV_E2E, q, exec, parametre, reglages, remettreReglages, journal, connexion, ouvrirOnglet, etatAffiche, attendreTexte, texte, fs, os, path } = A;

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 600) + ']' : '')); }
if (!ENV_E2E.WINDOWS) { console.log('Test Windows seulement : rien a faire ici.'); process.exit(0); }
const DEFAUT = process.env.E2E_DEFAUT === '1';
const TMP = path.join(os.tmpdir(), 'e2e-archives-rapprochement');
const DOSSIER = path.join(TMP, 'sauvegardes'), IDENTIFIANTS = path.join(TMP, 'sauvegarde.cnf'), CLE = path.join(TMP, 'archive.cnf');
const ESSAI = '2026-09-20 08:00', ESSAI_RESULTAT = 'CONFORME';
const sanitize = (s) => String(s || '').replace(/\s+/g, ' ');

(async () => {
  const idJournal = Number(q('SELECT COALESCE(MAX(id), 0) FROM t_securite_journal'));
  const idSauvegarde = Number(q('SELECT COALESCE(MAX(id), 0) FROM t_sauvegarde'));
  const reglagesAvant = reglages();
  fs.rmSync(TMP, { recursive: true, force: true });
  fs.mkdirSync(DOSSIER, { recursive: true });
  A.identifiants(IDENTIFIANTS);
  parametre('KEY_SECURITE_BASE', '1'); parametre('KEY_SECURITE_FICHIER_IDENTIFIANTS', IDENTIFIANTS); parametre('KEY_SECURITE_FICHIER_CLE_ARCHIVE', CLE);
  parametre('KEY_SECURITE_DOSSIER_COPIES', path.join(TMP, 'copies-vide')); parametre('KEY_SECURITE_DERNIERE_ROTATION', '2026-11-01 10:00');
  parametre('KEY_SAUVEGARDE_DOSSIER', DOSSIER); parametre('KEY_SAUVEGARDE_COPIE', ''); parametre('KEY_SAUVEGARDE_ACTIVE', '0');
  parametre('KEY_SAUVEGARDE_GARDER_HEURES', '48'); parametre('KEY_SAUVEGARDE_GARDER_JOURS', '30');
  parametre('KEY_SECURITE_DERNIER_ESSAI_RESTAURATION', ESSAI); parametre('KEY_SECURITE_DERNIER_ESSAI_RESULTAT', ESSAI_RESULTAT); parametre('KEY_SECURITE_CLE_ARCHIVE_DATE', '');

  /* 1. la cle par le vrai script 7 : fichier, trace en base, cle affichee une fois (captee ici pour lire les archives) */
  const c = A.creerCle(CLE, IDENTIFIANTS);
  const contenuCle = fs.existsSync(CLE) ? fs.readFileSync(CLE, 'utf8') : '';
  const dateCle = q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_SECURITE_CLE_ARCHIVE_DATE'");
  const jCle = journal(idJournal);
  ok('Script 7 -Creer : clé affichée une fois (8 groupes de 4), fichier DPAPI (en-tête, rien en clair), date posée dans t_parameters = ligne CLE_ARCHIVE du journal (sans la valeur)',
    c.cle.length === 39 && /^# Prestige : cle des archives chiffrees \(DPAPI\)/.test(contenuCle) && contenuCle.indexOf(c.cle) < 0 && contenuCle.indexOf(c.cle.slice(0, 9)) < 0
    && /^\d{4}-\d\d-\d\d \d\d:\d\d$/.test(dateCle) && jCle.length === 1 && jCle[0].action === 'CLE_ARCHIVE' && jCle[0].resultat === 'OK' && jCle[0].date.slice(0, 16) === dateCle
    && jCle[0].detail.indexOf(c.cle) < 0 && /cle generee/.test(jCle[0].detail), sanitize(c.sortie).slice(-300) + ' | ' + JSON.stringify(jCle));

  const b = await ENV_E2E.lancer(chromium);
  const dialogues = [], err = [];
  const contexte = await b.newContext({ viewport: { width: 1600, height: 1000 } });
  contexte.on('page', (pg) => { pg.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); }); pg.on('pageerror', (e) => err.push(String(e.message))); });
  const api = (p, chemin) => p.evaluate((u) => fetch(u).then((r) => r.json()), '../api/v1/support/' + chemin);
  try {
    const p = await contexte.newPage();
    await connexion(p, ENV_E2E.LOGIN_SUPPORT, 'e2etest');
    await ouvrirOnglet(p);

    /* 2. onglet Securite : archives, cle, essai = API = base */
    const e0 = await etatAffiche(p), s0 = await api(p, 'serveur/securite/etat'), a0 = s0.archives || {};
    ok('Archives : écran « CHIFFRÉES (AES) », « clé posée le ' + dateCle + ' » = API (clePresente, cleDate, fichierCle) = t_parameters = fichier du dossier d\'essai',
      /Archives de sauvegarde/.test(e0.stockage) && /CHIFFRÉES \(AES\)/.test(e0.stockage) && e0.stockage.indexOf('clé posée le ' + dateCle) >= 0 && a0.clePresente === true && a0.chiffrees === true
      && a0.cleDate === dateCle && path.normalize(a0.fichierCle) === path.normalize(CLE), sanitize(e0.stockage.match(/Archives de sauvegarde[^C]*C[^·]*/) + ' | ' + JSON.stringify(a0)));
    ok('Dernier essai de restauration : écran « ' + ESSAI + ' — CONFORME » + rappel (plus d\'un mois) = API = t_parameters',
      e0.stockage.indexOf(ESSAI + ' — ' + ESSAI_RESULTAT) >= 0 && /obligatoire chaque mois.*à faire maintenant/.test(e0.stockage) && /Essai de restauration obligatoire chaque mois : dernier le 2026-09-20 08:00 \(CONFORME\), plus d.un mois/.test(e0.alerte)
      && a0.dernierEssai === ESSAI && a0.dernierEssaiResultat === ESSAI_RESULTAT && a0.rappelEssai === true && a0.prochainEssai === '2026-10-20'
      && q("SELECT CONCAT(str_VALUE, '|') FROM t_parameters WHERE str_KEY IN ('KEY_SECURITE_DERNIER_ESSAI_RESTAURATION', 'KEY_SECURITE_DERNIER_ESSAI_RESULTAT') ORDER BY str_KEY").replace(/\s/g, '') === ESSAI.replace(' ', '') + '|' + ESSAI_RESULTAT + '|',
      sanitize(e0.stockage.match(/Dernier essai[^C]*/) + ' | ' + e0.alerte));
    const lj = e0.journal.filter((l) => l.action === 'CLE_ARCHIVE');
    ok('Journal : la ligne CLE_ARCHIVE du script 7 affichée à l\'écran = API = t_securite_journal (date, qui, résultat, détail), libellé « Clé des archives de sauvegarde (script 7) »',
      lj.length === 1 && lj[0].date === jCle[0].date && lj[0].login === jCle[0].login && lj[0].resultat === 'OK' && lj[0].detail === jCle[0].detail
      && (s0.journal || []).some((l) => l.action === 'CLE_ARCHIVE' && l.detail === jCle[0].detail)
      && await p.evaluate(() => document.body.textContent.indexOf('Clé des archives de sauvegarde (script 7)') >= 0), JSON.stringify(lj));

    /* 3. sauvegarde a 1 par l'ecran : archive chiffree ; a 0 : en clair ; memes contenus */
    await A.ouvrirSauvegardes(p);
    const t1 = await A.texteSauvegardes(p);
    const l1 = await A.sauvegarder(p, idSauvegarde);
    const f1 = path.join(DOSSIER, l1.fichier || '');
    const base1 = A.ligneSauvegarde(l1.id);
    const fichiers1 = A.listing(DOSSIER);
    ok('À 1 : « Sauvegarder maintenant » → ligne « Réussie », fichier .sql.gz.aes (' + l1.duree + ' s) = t_sauvegarde.fichier = seul fichier du dossier, taille écran = taille du fichier, onglet « Archives : chiffrées »',
      l1.statut === 'REUSSIE' && /\.sql\.gz\.aes$/.test(l1.fichier) && l1.chiffree === true && A.lisible(f1) && fichiers1.length === 1 && fichiers1[0] === l1.fichier
      && base1.split('<|>')[2] === l1.fichier && Number(base1.split('<|>')[3]) === A.taille(f1) && Math.abs(l1.tailleMo - A.taille(f1) / 1048576) < 0.1
      && /Archives : chiffrées \(AES/.test(t1), JSON.stringify(l1) + ' | ' + base1);
    ok('Le fichier commence par la magie PRSTGA01 (pas un gzip en clair) ; déchiffré avec la clé affichée par le script 7, c\'est un dump gzip complet',
      A.magie(f1) === 'PRSTGA01' && !A.estGzip(f1) && (() => { try { if (!A.lisible(f1)) { return false; } A.dechiffrer(f1, f1 + '.clair.gz', c.cle); return A.estGzip(f1 + '.clair.gz'); } catch (e) { console.log(e.message); return false; } })(), A.magie(f1));
    const emp1 = A.lisible(f1 + '.clair.gz') ? await A.empreinte(f1 + '.clair.gz').catch((e) => ({ erreur: String(e) })) : { erreur: 'absent' };
    const v1 = await A.valoriser(p);
    ok('« Valoriser » sur l\'archive chiffrée : totaux calculés (famille, rayon, grossiste)', /calculée en/.test(v1.entete) && v1[1] && v1[1].lignes > 0 && v1[2].lignes > 0 && v1[3].lignes > 0, sanitize(v1.entete) + ' ' + JSON.stringify(v1[1]));
    const r1 = await A.texteRestaurer(p);
    ok('Instructions de restauration : citent le fichier .aes et « 7-cle-archive.ps1 -Dechiffrer »', r1.indexOf(l1.fichier) >= 0 && /7-cle-archive\.ps1 -Dechiffrer/.test(r1), sanitize(r1).slice(0, 300));

    parametre('KEY_SECURITE_BASE', '0');
    const l0 = await A.sauvegarder(p, l1.id);
    const f0 = path.join(DOSSIER, l0.fichier || '');
    const emp0 = A.lisible(f0) ? await A.empreinte(f0).catch((e) => ({ erreur: String(e) })) : { erreur: 'absent' };
    const ecarts = [];
    Object.keys(Object.assign({}, emp0.tables || {}, emp1.tables || {})).forEach((t) => { if ((emp0.tables || {})[t] !== (emp1.tables || {})[t] && !/^(t_sauvegarde|t_parameters|t_securite_journal|t_application_event|t_serveur_|t_rum|t_session|t_support_|t_journal|t_poste|t_log|t_prestige|t_connexion|t_user$|t_statistique|t_alerte|t_notification|t_pointage|t_tache|t_incident|t_maintenance)/.test(t)) { ecarts.push(t + ' : ' + (emp0.tables || {})[t] + ' / ' + (emp1.tables || {})[t]); } });
    ok('À 0 juste après : fichier .sql.gz en clair (gzip), même nombre de tables créées et mêmes lignes INSERT par table que l\'archive chiffrée déchiffrée (' + Object.keys(emp1.tables || {}).length + ' tables), les deux finissent par « Dump completed »',
      l0.statut === 'REUSSIE' && /\.sql\.gz$/.test(l0.fichier) && l0.chiffree === false && A.estGzip(f0) && emp0.creees > 100 && emp0.creees === emp1.creees && emp0.fin === 'Dump completed' && emp1.fin === 'Dump completed' && ecarts.length === 0,
      ecarts.join(' ; ') || (emp1.creees + ' tables, ' + emp1.fin));
    const v0 = await A.valoriser(p);
    ok('Valorisation de l\'archive en clair : mêmes totaux que sur l\'archive chiffrée', /calculée en/.test(v0.entete) && JSON.stringify([v0[1], v0[2], v0[3]]) === JSON.stringify([v1[1], v1[2], v1[3]]), JSON.stringify(v0[1]) + ' / ' + JSON.stringify(v1[1]));

    /* 4. onglet Securite rafraichi : derniere sauvegarde = t_sauvegarde ; defaut simule */
    parametre('KEY_SECURITE_BASE', '1');
    await p.click('.supportserveur .x-tab:has-text("Sécurité")'); await p.waitForTimeout(500);
    await p.click('.supportserveur .x-tab:has-text("État")'); await p.waitForTimeout(800);
    await p.click('.supportserveur .x-tab:has-text("Sécurité")'); await attendreTexte(p, '#secStockage', /dernière sauvegarde intégrée/);
    if (DEFAUT) { exec("UPDATE t_parameters SET str_VALUE = '2026-01-01 00:00' WHERE str_KEY = 'KEY_SECURITE_CLE_ARCHIVE_DATE'"); }
    const e2 = await etatAffiche(p), a2 = (await api(p, 'serveur/securite/etat')).archives || {};
    const derniere = q("SELECT fichier FROM t_sauvegarde WHERE statut = 'REUSSIE' ORDER BY id DESC LIMIT 1");
    const dateCle2 = q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_SECURITE_CLE_ARCHIVE_DATE'");
    ok('Onglet rafraîchi : « dernière sauvegarde intégrée : ' + derniere + ' (en clair) » = t_sauvegarde = API ; date de la clé affichée = t_parameters',
      e2.stockage.indexOf('dernière sauvegarde intégrée : ' + derniere + ' (en clair)') >= 0 && a2.derniereArchive === derniere && a2.derniereArchiveChiffree === false
      && e2.stockage.indexOf('clé posée le ' + dateCle2) >= 0 && a2.cleDate === dateCle2, sanitize(e2.stockage.match(/Archives de sauvegarde[^·]*·[^C]*/)));
    ok('Aucune fenêtre, aucune erreur JavaScript', dialogues.length === 0 && err.length === 0, dialogues.concat(err).join(' | '));
  } catch (e) {
    ok('Exécution sans exception', false, e.stack);
  } finally {
    await b.close().catch(() => {});
    remettreReglages(reglagesAvant);
    exec('DELETE FROM t_securite_journal WHERE id > ' + idJournal + '; DELETE FROM t_sauvegarde WHERE id > ' + idSauvegarde + '; DROP DATABASE IF EXISTS prestige_valo_tmp;');
    for (const f of [CLE, IDENTIFIANTS]) { try { A.execFileSync('icacls', [f, '/grant', process.env.USERNAME + ':F'], { stdio: 'ignore' }); } catch (e) { /* */ } }
    fs.rmSync(TMP, { recursive: true, force: true });
    ok('Paramètres remis (KEY_SECURITE_BASE à sa valeur d\'origine), journal, historique, clé et fichiers d\'essai retirés', reglages() === reglagesAvant && q('SELECT COALESCE(MAX(id), 0) FROM t_securite_journal') === String(idJournal)
      && q('SELECT COALESCE(MAX(id), 0) FROM t_sauvegarde') === String(idSauvegarde) && !fs.existsSync(TMP));
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK' + (DEFAUT ? ' (défaut simulé : le test doit échouer)' : ''));
    process.exit(ko ? 1 : 0);
  }
})();
