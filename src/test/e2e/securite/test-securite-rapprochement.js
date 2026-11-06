/* RAPPROCHEMENT (regle du 05/11) de l'onglet « Securite » (cas 4, lot 4.B) : la meme donnee est comparee ligne par ligne
 * partout ou elle apparait :
 *  - journal des actions : tableau de l'ecran = reponse de l'API = table t_securite_journal = lignes de server.log
 *    (action, qui, resultat, dans le meme ordre) ;
 *  - pool : compte et forme affiches = API = domain.xml ;
 *  - copies de domain.xml : nombre et « en clair » affiches = bouton de purge = fichiers du dossier (avant et apres
 *    purge) = detail de la ligne de journal ;
 *  - derniere rotation : date affichee, prochaine recommandee et rappel = API = t_parameters.
 * Aucun changement du pool de Payara (pas de rotation reussie) : une rotation refusee et une purge suffisent a ecrire
 * le journal. E2E_DEFAUT=1 : defaut simule (une ligne du journal modifiee en base apres l'affichage) ; le test doit
 * alors echouer. Reglages : BASE, DB_TEST + E2E_BASE_LIBRE=1, PAYARA_DOMAINE. Parametre remis a 0 a la fin.
 */
const { chromium } = require('playwright-core');
const C = require('./securite-commun');
const { ENV_E2E, q, exec, parametre, reglages, remettreReglages, journal, pool, dossierCopies, connexion, ouvrirOnglet, texte, attendreTexte, etatAffiche, rotationRefusee, purger, attendreJournal, lignesServeur, fs, os, path } = C;

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 600) + ']' : '')); }
if (!ENV_E2E.WINDOWS) { console.log('Test Windows seulement : rien a faire ici.'); process.exit(0); }
const DEFAUT = process.env.E2E_DEFAUT === '1';
const TMP = path.join(os.tmpdir(), 'e2e-securite-rapprochement');
const DATE_ROTATION = '2026-01-05 10:00', PROCHAINE = '2026-07-05';
const sanitize = (s) => String(s || '').replace(/\s+/g, ' ');

(async () => {
  const idJournal = Number(q('SELECT COALESCE(MAX(id), 0) FROM t_securite_journal'));
  const reglagesAvant = reglages();
  fs.rmSync(TMP, { recursive: true, force: true });
  const COPIES = dossierCopies(TMP);
  parametre('KEY_SECURITE_BASE', '1'); parametre('KEY_SECURITE_DOSSIER_COPIES', COPIES); parametre('KEY_SAUVEGARDE_ACTIVE', '0');
  parametre('KEY_SECURITE_FICHIER_IDENTIFIANTS', path.join(TMP, 'absent.cnf')); parametre('KEY_SECURITE_DERNIERE_ROTATION', DATE_ROTATION);
  const depuis = Date.now();
  const b = await ENV_E2E.lancer(chromium);
  const dialogues = [], err = [];
  const contexte = await b.newContext({ viewport: { width: 1600, height: 1000 } });
  contexte.on('page', (pg) => { pg.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); }); pg.on('pageerror', (e) => err.push(String(e.message))); });
  const api = (p) => p.evaluate(() => fetch('../api/v1/support/serveur/securite/etat').then((r) => r.json()));
  const fichiersCopies = () => fs.readdirSync(COPIES).filter((f) => /^domain\.xml\.avant-prestige-/.test(f)).sort();
  const enClairSurDisque = () => fichiersCopies().filter((f) => !/\$\{ALIAS=/.test(fs.readFileSync(path.join(COPIES, f), 'utf8'))).length;
  try {
    const p = await contexte.newPage();
    await connexion(p, ENV_E2E.LOGIN_SUPPORT, 'e2etest');
    await ouvrirOnglet(p);

    /* 1. avant toute action : copies, pool, derniere rotation */
    const e0 = await etatAffiche(p), a0 = await api(p), d0 = pool();
    const nb0 = fichiersCopies().length, clair0 = enClairSurDisque();
    ok('Copies : écran « ' + nb0 + ' FICHIER(S), ' + clair0 + ' EN CLAIR » = bouton « Purger les ' + nb0 + ' copie(s) » = API = dossier (' + nb0 + ' fichiers, ' + clair0 + ' en clair)',
      e0.stockage.indexOf(nb0 + ' FICHIER(S), ' + clair0 + ' EN CLAIR') >= 0 && e0.purge === 'Purger les ' + nb0 + ' copie(s) de domain.xml' && a0.copies.nombre === nb0 && a0.copies.enClair === clair0
      && JSON.stringify(a0.copies.fichiers) === JSON.stringify(fichiersCopies()) && a0.copies.dossier === COPIES, sanitize(e0.stockage.match(/Copies[^M]*/) + ' | ' + JSON.stringify(a0.copies)));
    ok('Pool : compte et forme affichés = API = domain.xml (' + d0.user + ', ' + d0.forme + ')', e0.stockage.indexOf('compte ' + d0.user) >= 0 && e0.stockage.indexOf(d0.forme === 'ALIAS' ? 'ALIAS PAYARA' : 'EN CLAIR') >= 0
      && a0.pool.utilisateur === d0.user && a0.pool.forme === d0.forme && (d0.forme !== 'ALIAS' || a0.pool.alias === d0.alias) && e0.aliasDesactive === (d0.forme !== 'CLAIR'), sanitize(e0.stockage.match(/Pool Payara[^A]*/) + ' | ' + JSON.stringify(a0.pool)));
    const dbRotation = q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_SECURITE_DERNIERE_ROTATION'");
    ok('Dernière rotation : date affichée, prochaine recommandée et rappel (> 6 mois) = API = t_parameters (' + dbRotation + ')', e0.rotation.indexOf(DATE_ROTATION) >= 0 && e0.rotation.indexOf('prochaine recommandée : ' + PROCHAINE) >= 0
      && /plus de 6 mois/.test(e0.alerte) && a0.derniereRotation === dbRotation && a0.prochaine === PROCHAINE && a0.rappel === true && dbRotation === DATE_ROTATION, sanitize(e0.rotation + ' | ' + e0.alerte));

    /* 2. deux actions qui ecrivent le journal : rotation refusee, purge */
    await rotationRefusee(p);
    const mPurge = await purger(p);
    /* etat rafraichi comme le ferait l'utilisateur : autre onglet puis retour */
    await p.click('.supportserveur .x-tab:has-text("État")'); await p.waitForTimeout(800);
    await p.click('.supportserveur .x-tab:has-text("Sécurité")'); await attendreTexte(p, '#secStockage', /AUCUNE/);
    await attendreJournal(p, 'PURGE_COPIES');
    const e1 = await etatAffiche(p), a1 = await api(p);
    if (DEFAUT) { exec("UPDATE t_securite_journal SET str_DETAIL = CONCAT(str_DETAIL, ' (défaut simulé)') WHERE id = (SELECT * FROM (SELECT MAX(id) FROM t_securite_journal) x)"); }
    const base = journal(idJournal).reverse(); /* la plus recente en premier, comme l'ecran */
    const serveur = lignesServeur(depuis).reverse();
    const ecran = e1.journal.filter((l) => base.some((x) => x.date === l.date && x.action === l.action && x.detail === l.detail) || e1.journal.indexOf(l) < base.length);
    const ecranNouveau = e1.journal.slice(0, base.length);
    const apiNouveau = (a1.journal || []).slice(0, base.length);
    const ligne = (l) => [l.date, l.login, l.action, l.resultat, l.detail].join(' | ');
    const ecarts = [];
    base.forEach((x, i) => {
      if (!ecranNouveau[i] || ligne(ecranNouveau[i]) !== ligne(x)) { ecarts.push('écran ≠ base, ligne ' + (i + 1) + ' : ' + (ecranNouveau[i] ? ligne(ecranNouveau[i]) : '(absente)') + ' // ' + ligne(x)); }
      if (!apiNouveau[i] || ligne(apiNouveau[i]) !== ligne(x)) { ecarts.push('API ≠ base, ligne ' + (i + 1)); }
      if (!serveur[i] || serveur[i].action !== x.action || serveur[i].login !== x.login || serveur[i].resultat !== x.resultat) { ecarts.push('server.log ≠ base, ligne ' + (i + 1) + ' : ' + JSON.stringify(serveur[i])); }
    });
    ok('Journal : ' + base.length + ' lignes écrites (rotation refusée, purge) ; écran = API = t_securite_journal (date, qui, action, résultat, détail) = server.log (action, qui, résultat), ligne par ligne',
      base.length === 2 && base[0].action === 'PURGE_COPIES' && base[1].action === 'ROTATION' && base[1].resultat === 'REFUSE' && serveur.length === 2 && ecarts.length === 0 && ecran.length >= 2,
      ecarts.join(' ; ') || base.map(ligne).join(' ; '));
    ok('Journal : la ligne « REFUSE » porte le login du super administrateur et le motif, jamais une valeur', base[1] && base[1].login === ENV_E2E.LOGIN_SUPPORT && /mot de passe de session/.test(base[1].detail)
      && base.every((x) => x.detail.indexOf('mauvais-mot-de-passe') < 0 && x.detail.indexOf('ValeurSansImportance') < 0), base[1] && ligne(base[1]));

    /* 3. apres la purge : dossier, ecran, API, detail du journal, bouton */
    const nb1 = fichiersCopies().length;
    ok('Copies après purge : dossier vide de copies (' + nb1 + ', fichier étranger conservé) = écran « AUCUNE » = API 0 = détail du journal « ' + nb0 + ' copie(s) supprimée(s) dans <dossier> » = bouton désactivé',
      nb1 === 0 && fs.existsSync(path.join(COPIES, 'autre-fichier.txt')) && /Copies.*AUCUNE/.test(e1.stockage) && a1.copies.nombre === 0 && base[0] && base[0].detail === nb0 + ' copie(s) supprimée(s) dans ' + COPIES
      && /supprimée/.test(mPurge) && await p.evaluate((s) => Ext.ComponentQuery.query(s)[0].isDisabled(), C.S('#btnSecPurger')), sanitize(mPurge + ' | ' + (base[0] && base[0].detail)));
    ok('Aucune fenêtre, aucune erreur JavaScript', dialogues.length === 0 && err.length === 0, dialogues.concat(err).join(' | '));
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
