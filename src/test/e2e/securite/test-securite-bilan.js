/* BILAN AVANT / APRES (regle du 05/11) de l'onglet « Securite » (cas 4, lot 4.B) : une rotation refusee puis une purge des
 * copies laissent exactement les traces attendues, ni plus ni moins :
 *  - t_securite_journal : deux lignes de plus (ROTATION / REFUSE, PURGE_COPIES / OK), avec le login, l'instant, le
 *    detail attendus ; les lignes anterieures inchangees ;
 *  - t_parameters : toutes les lignes identiques (aucune valeur touchee) ;
 *  - domain.xml identique, pool de Payara inchange, aucun redemarrage, comptes MariaDB inchanges ;
 *  - dossier des copies : les copies supprimees, le fichier etranger conserve, rien d'autre ;
 *  - server.log : exactement deux lignes du service, aucune valeur de mot de passe.
 * E2E_DEFAUT=1 : defaut simule (une trace de trop au journal, comme un service qui ecrirait deux fois) ; le test doit
 * alors echouer. Reglages : BASE, DB_TEST + E2E_BASE_LIBRE=1, PAYARA_DOMAINE. Parametre remis a 0 a la fin.
 */
const { chromium } = require('playwright-core');
const crypto = require('crypto');
const C = require('./securite-commun');
const { ENV_E2E, q, exec, parametre, reglages, remettreReglages, journal, pool, dossierCopies, connexion, ouvrirOnglet, rotationRefusee, purger, lignesServeur, texteServeur, fs, os, path, execFileSync } = C;

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 600) + ']' : '')); }
if (!ENV_E2E.WINDOWS) { console.log('Test Windows seulement : rien a faire ici.'); process.exit(0); }
const DEFAUT = process.env.E2E_DEFAUT === '1';
const TMP = path.join(os.tmpdir(), 'e2e-securite-bilan');
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');
const empreinteParametres = () => q("SELECT MD5(GROUP_CONCAT(CONCAT(str_KEY, '=', COALESCE(str_VALUE, '')) ORDER BY str_KEY SEPARATOR '|')), COUNT(*) FROM t_parameters");
const empreinteJournal = (jusqua) => q('SELECT MD5(GROUP_CONCAT(CONCAT_WS("|", id, dt_DATE, str_LOGIN, str_ACTION, str_RESULTAT, COALESCE(str_DETAIL, "")) ORDER BY id SEPARATOR "#")), COUNT(*) FROM t_securite_journal WHERE id <= ' + jusqua);
const comptesMariadb = () => q('SELECT COUNT(*), MD5(GROUP_CONCAT(CONCAT(User, "@", Host) ORDER BY User, Host)) FROM mysql.user');
const pidPayara = () => { const admin = ((fs.readFileSync(C.XML, 'utf8').match(/<network-listener[^>]*name="admin-listener"[^>]*>/) || [''])[0].match(/port="(\d+)"/) || [])[1] || '4848';
  const l = execFileSync('netstat', ['-ano'], { encoding: 'utf8' }).split(/\r?\n/).find((x) => new RegExp(':' + admin + '\\s.*LISTENING').test(x)); return l ? l.trim().split(/\s+/).pop() : ''; };
const listing = (d) => fs.readdirSync(d).sort().join(',');

(async () => {
  const idJournal = Number(q('SELECT COALESCE(MAX(id), 0) FROM t_securite_journal'));
  const reglagesAvant = reglages();
  fs.rmSync(TMP, { recursive: true, force: true });
  const COPIES = dossierCopies(TMP);
  parametre('KEY_SECURITE_BASE', '1'); parametre('KEY_SECURITE_DOSSIER_COPIES', COPIES); parametre('KEY_SAUVEGARDE_ACTIVE', '0');
  parametre('KEY_SECURITE_FICHIER_IDENTIFIANTS', path.join(TMP, 'absent.cnf')); parametre('KEY_SECURITE_DERNIERE_ROTATION', '');
  /* bilan AVANT (apres les reglages du test) */
  const avant = { parametres: empreinteParametres(), journal: empreinteJournal(idJournal), xml: md5(fs.readFileSync(C.XML)), pool: JSON.stringify(pool()), comptes: comptesMariadb(), pid: pidPayara(), copies: listing(COPIES), log: Date.now(), instant: q('SELECT NOW()') };
  const b = await ENV_E2E.lancer(chromium);
  const dialogues = [], err = [];
  const contexte = await b.newContext({ viewport: { width: 1600, height: 1000 } });
  contexte.on('page', (pg) => { pg.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); }); pg.on('pageerror', (e) => err.push(String(e.message))); });
  try {
    const p = await contexte.newPage();
    await connexion(p, ENV_E2E.LOGIN_SUPPORT, 'e2etest');
    await ouvrirOnglet(p);
    const mRefus = await rotationRefusee(p);
    const mPurge = await purger(p);
    await p.evaluate(() => fetch('../api/v1/support/serveur/securite/etat').then((r) => r.json()));
    if (DEFAUT) { exec("INSERT INTO t_securite_journal (dt_DATE, str_LOGIN, str_ACTION, str_RESULTAT, str_DETAIL) VALUES (NOW(), '" + ENV_E2E.LOGIN_SUPPORT + "', 'PURGE_COPIES', 'OK', 'défaut simulé : trace écrite deux fois')"); }
    await p.waitForTimeout(1000);

    /* bilan APRES */
    const apres = { parametres: empreinteParametres(), journal: empreinteJournal(idJournal), xml: md5(fs.readFileSync(C.XML)), pool: JSON.stringify(pool()), comptes: comptesMariadb(), pid: pidPayara(), copies: listing(COPIES), instant: q('SELECT NOW()') };
    const nouvelles = journal(idJournal);
    const attendues = [
      { login: ENV_E2E.LOGIN_SUPPORT, action: 'ROTATION', resultat: 'REFUSE', detail: /^mot de passe de session : Votre mot de passe Prestige est incorrect\.$/ },
      { login: ENV_E2E.LOGIN_SUPPORT, action: 'PURGE_COPIES', resultat: 'OK', detail: new RegExp('^3 copie\\(s\\) supprimée\\(s\\) dans ' + COPIES.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$') }
    ];
    const ecarts = [];
    attendues.forEach((a, i) => { const l = nouvelles[i]; if (!l) { ecarts.push('ligne ' + (i + 1) + ' absente'); return; }
      if (l.login !== a.login || l.action !== a.action || l.resultat !== a.resultat || !a.detail.test(l.detail) || l.date < avant.instant || l.date > apres.instant) { ecarts.push('ligne ' + (i + 1) + ' : ' + JSON.stringify(l)); } });
    if (nouvelles.length > attendues.length) { ecarts.push('lignes de trop : ' + nouvelles.slice(attendues.length).map((l) => l.action + ' ' + l.resultat + ' ' + l.detail).join(' ; ')); }
    ok('Journal de sécurité : exactement 2 lignes de plus (ROTATION/REFUSE puis PURGE_COPIES/OK), login, instant entre avant et après, détail attendus ; ni plus ni moins', nouvelles.length === 2 && ecarts.length === 0, ecarts.join(' ; ') || nouvelles.map((l) => l.action + ' ' + l.resultat).join(' ; '));
    ok('Journal de sécurité : les lignes antérieures sont intactes (même empreinte, même nombre)', apres.journal === avant.journal, avant.journal + ' / ' + apres.journal);
    ok('t_parameters : toutes les lignes identiques (empreinte et nombre)', apres.parametres === avant.parametres, avant.parametres + ' / ' + apres.parametres);
    ok('Payara : domain.xml identique, pool inchangé (compte, forme), aucun redémarrage (même processus)', apres.xml === avant.xml && apres.pool === avant.pool && apres.pid === avant.pid && avant.pid !== '', avant.pool + ' pid ' + avant.pid + ' / ' + apres.pid);
    ok('MariaDB : comptes inchangés (nombre et liste)', apres.comptes === avant.comptes, avant.comptes);
    ok('Dossier des copies : les 3 copies supprimées, le fichier étranger conservé, rien d\'autre', avant.copies === 'autre-fichier.txt,domain.xml.avant-prestige-20261101-120000,domain.xml.avant-prestige-20261102-120000,domain.xml.avant-prestige-20261103-120000'
      && apres.copies === 'autre-fichier.txt', avant.copies + ' -> ' + apres.copies);
    const lignes = lignesServeur(avant.log);
    const brut = texteServeur(avant.log);
    ok('server.log : exactement 2 lignes du service (ROTATION REFUSE, PURGE_COPIES OK), aucune valeur de mot de passe', lignes.length === 2 && lignes[0].action === 'ROTATION' && lignes[0].resultat === 'REFUSE' && lignes[1].action === 'PURGE_COPIES' && lignes[1].resultat === 'OK'
      && brut.indexOf('mauvais-mot-de-passe') < 0 && brut.indexOf('ValeurSansImportance') < 0 && !/IDENTIFIED BY '[^*]/.test(brut), JSON.stringify(lignes));
    ok('Écran : messages attendus (refus, purge), aucune fenêtre, aucune erreur JavaScript', /incorrect/.test(mRefus) && /3 copie\(s\) supprimée/.test(mPurge) && dialogues.length === 0 && err.length === 0, mRefus + ' | ' + mPurge + ' | ' + dialogues.concat(err).join(' | '));
  } catch (e) {
    ok('Exécution sans exception', false, e.stack);
  } finally {
    await b.close().catch(() => {});
    remettreReglages(reglagesAvant);
    exec('DELETE FROM t_securite_journal WHERE id > ' + idJournal);
    fs.rmSync(TMP, { recursive: true, force: true });
    ok('Paramètres remis (KEY_SECURITE_BASE à sa valeur d\'origine), journal, dossier d\'essai retirés', reglages() === reglagesAvant && q('SELECT COALESCE(MAX(id), 0) FROM t_securite_journal') === String(idJournal) && !fs.existsSync(TMP));
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK' + (DEFAUT ? ' (défaut simulé : le test doit échouer)' : ''));
    process.exit(ko ? 1 : 0);
  }
})();
