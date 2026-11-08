/* DEFILEMENT DES LISTES D'EXTRANET (retour du 08/11, point 3 : « 500 affichées par défaut, je n'ai pas de scroll »).
 * Avant : la grille ne recevait que les 500 premieres lignes ; arrive en bas, l'utilisateur ne pouvait pas aller plus loin
 * (catalogue TEDIS : 16 940 lignes). Attendu : toutes les lignes sont atteignables en faisant defiler la grille a la
 * molette, sans figer l'ecran (rendu par tampon : quelques dizaines de lignes dans la page a la fois).
 *
 * Vrai chemin de l'ecran contre le FAUX extranet local (jamais le vrai) : GESTION DES COMMANDES > Extranets grossistes,
 * session saisie dans l'onglet Sessions, Ubipharm > Vos documents > Derniers relevés, « Lire sur l'extranet » ; la liste
 * servie compte 1 234 lignes toutes differentes (numero, date, montant).
 * Rapprochement : source = base = ecran, ligne par ligne ; derniere ligne atteinte a la molette = derniere ligne source.
 * Ergonomie : compteur « 1234 ligne(s) » sans « affinez », recherche d'une ligne au-dela de la 500e, lignes dans la page
 * bornees (fluidite).
 * Bilan : donnees d'extranet gardees copiees puis remises a l'identique, connexions d'essai retirees, uniquement des GET.
 *
 * Lancement (domain2, laborex_perf, toutes les sources d'extranet dirigees vers 127.0.0.1) :
 *   BASE=http://localhost:9080/prestige DB_TEST=laborex_perf E2E_BASE_LIBRE=1 PAYARA_DOMAINE=.../domain2 node test-ecran-defilement-0811.js
 */
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const faux = require('./faux-extranet');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright-core');

const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s],
  { encoding: 'utf8' }).replace(/\r/g, '').trim();
const res = [];
function ok(n, c, d) {
  res.push({ n, c: !!c });
  console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : ''));
}

const garde = require('./garde-extranets');
garde.verifier(q, ENV_E2E.BASE, ENV_E2E.PAYARA_DOMAINE);
const CACHES = ['extranet_collecte', 'extranet_liste_ligne'];
const ECRAN = 'extranetsgrossistes';
const N = 1234;
const MENU = '<div class="dropdown"><a href="#">Actions</a></div>';

const texte = (p, sel) => p.evaluate((s) => { const c = Ext.ComponentQuery.query('extranetsgrossistes ' + s)[0]; return c && c.el ? c.el.dom.textContent : ''; }, sel);
async function cliquerConfirme(p, requete) {
  await vues.cliquer(p, requete);
  await p.waitForTimeout(400);
  if (await p.evaluate((sel) => { const c = Ext.ComponentQuery.query(sel)[0]; return !!c && /relire \?/.test(c.getText()); }, requete)) {
    await vues.cliquer(p, requete);
  }
}

(async () => {
  const srv = await faux.demarrer(18765);
  /* 1 234 releves, tous differents : numero, date (sur 28 jours), montant */
  const rel = [];
  for (let i = 0; i < N; i++) {
    const m = String(1000 + ((i * 7919) % 900000)) + ' CFA', d = String(1 + (i % 28)).padStart(2, '0') + '/10/2026';
    rel.push({ c: [MENU, 'R' + String(90000 - i), d, m], e: ['R' + String(90000 - i), d, m] });
  }
  srv.etat.listes.RELEVES.pagine = rel;
  srv.etat.listes.RELEVES.attendu = rel.map((x) => x.e);
  const source = srv.etat.listes.RELEVES.attendu;

  const navigateur = await ENV_E2E.lancer(chromium);
  const p = await (await navigateur.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const erreurs = [];
  p.on('pageerror', (e) => erreurs.push(String(e.message)));
  const premiereCollecte = Number(q('SELECT IFNULL(MAX(id), 0) + 1 FROM extranet_collecte'));
  const debut = q("SELECT DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s')");
  const journalTotal = q('SELECT COUNT(*) FROM t_event_log');
  const caches = garde.sauver(q, CACHES);
  try {
    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await vues.ouvrirMenu(p, 'GESTION DES COMMANDES', 'Extranets grossistes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('extranetsgrossistes')[0], null, { timeout: 60000 });
    await p.mouse.move(1000, 600);
    await p.waitForTimeout(1500);
    await vues.cliquer(p, ECRAN + ' #exOnglets tab[text=Sessions]');
    await p.waitForTimeout(400);
    await vues.saisir(p, ECRAN + ' #exCookieUBIPHARM', srv.COOKIE);
    const rs = p.waitForResponse((x) => x.url().indexOf('/sessions/UBIPHARM') >= 0, { timeout: 60000 });
    await vues.cliquer(p, ECRAN + ' #exSaisieUBIPHARM button[text=Enregistrer]');
    await rs;
    for (const t of ['Ubipharm', 'Vos documents', 'Derniers relevés']) { await vues.cliquer(p, ECRAN + ' #exOnglets tab[text=' + t + ']'); await p.waitForTimeout(400); }

    const finie = p.waitForResponse(async (x) => x.url().indexOf('/lectures/ubipharm/RELEVES') >= 0
      && (await x.json().catch(() => ({}))).lecture?.enCours === false, { timeout: 180000 });
    await cliquerConfirme(p, ECRAN + ' #exListeRELEVESCollecter');
    const lu = (await (await finie).json()).lecture.resultat;
    await p.waitForTimeout(2500);
    ok('lecture : ' + N + ' lignes reçues', lu.success && lu.collecte.lignesRecues === N, JSON.stringify(lu.collecte || lu).slice(0, 200));
    const base = q("SELECT COUNT(*) FROM extranet_liste_ligne WHERE liste = 'RELEVES' AND collecte_id = " + lu.collecte.id);
    ok('base : ' + N + ' lignes gardées', base === String(N), base);

    /* toutes les dates : « Toute la période » */
    if (await p.evaluate(() => { const c = Ext.ComponentQuery.query('extranetsgrossistes #exListeRELEVESTout')[0]; return !!c && c.isVisible() && !c.pressed; })) {
      await vues.cliquer(p, ECRAN + ' #exListeRELEVESTout');
      await p.waitForTimeout(800);
    }
    const nombre = await texte(p, '#exListeRELEVESNombre');
    ok('compteur : « ' + N + ' ligne(s) », sans limite à 500', new RegExp('^(' + N + ' / )?' + N + ' ligne').test(nombre) && nombre.indexOf('affinez') < 0, nombre);
    const ecran = await p.evaluate(() => Ext.ComponentQuery.query('extranetsgrossistes #exListeRELEVESGrille')[0].getStore().getRange()
      .map((r) => r.get('cellules')));
    ok('rapprochement : écran = source, ligne par ligne (' + N + ')', JSON.stringify(ecran) === JSON.stringify(source),
      ecran.length + ' / ' + source.length);

    /* defilement a la molette, comme l'utilisateur, jusqu'en bas */
    const vue = await p.evaluate(() => { const r = Ext.ComponentQuery.query('extranetsgrossistes #exListeRELEVESGrille')[0].getView().el.dom.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await p.mouse.move(vue.x, vue.y);
    let enBas = false;
    for (let i = 0; i < 80 && !enBas; i++) {
      await p.mouse.wheel(0, 2500);
      await p.waitForTimeout(120);
      enBas = await p.evaluate(() => { const v = Ext.ComponentQuery.query('extranetsgrossistes #exListeRELEVESGrille')[0].getView().el.dom;
        return v.scrollTop + v.clientHeight >= v.scrollHeight - 2; });
    }
    await p.waitForTimeout(600);
    const bas = await p.evaluate(() => { const v = Ext.ComponentQuery.query('extranetsgrossistes #exListeRELEVESGrille')[0].getView().el.dom;
      const r = v.getBoundingClientRect(); const rangs = v.querySelectorAll('.x-grid-row');
      const visibles = Array.prototype.filter.call(rangs, (x) => { const b = x.getBoundingClientRect(); return b.bottom > r.top && b.top < r.bottom; });
      return { derniere: visibles.length ? visibles[visibles.length - 1].textContent : '', rangs: rangs.length, barre: v.scrollHeight > v.clientHeight }; });
    const der = source[N - 1];
    ok('défilement : la molette atteint la dernière ligne (' + der[0] + ')', enBas && bas.derniere.indexOf(der[0]) >= 0
      && bas.derniere.indexOf(der[2]) >= 0, JSON.stringify(bas).slice(0, 300));
    ok('fluidité : lignes dans la page bornées (rendu par tampon)', bas.rangs > 0 && bas.rangs <= 200, bas.rangs);

    /* recherche d'une ligne au-dela de la 500e */
    const cible = source[987];
    await vues.saisir(p, ECRAN + ' #exListeRELEVESRecherche', cible[0]);
    await p.waitForTimeout(900);
    const trouve = await p.evaluate(() => Ext.ComponentQuery.query('extranetsgrossistes #exListeRELEVESGrille')[0].getStore().getRange()
      .map((r) => r.get('cellules')));
    ok('recherche : la 988e ligne est trouvée', trouve.length === 1 && JSON.stringify(trouve[0]) === JSON.stringify(cible), JSON.stringify(trouve));
    await vues.cliquer(p, ECRAN + ' #exListeRELEVESRecherche');
    await p.keyboard.press('Control+A');
    await p.keyboard.press('Backspace');
    await p.waitForTimeout(900);
    ok('recherche effacée : ' + N + ' lignes', (await p.evaluate(() => Ext.ComponentQuery.query('extranetsgrossistes #exListeRELEVESGrille')[0]
      .getStore().getCount())) === N);
    ok('lecture seule : uniquement des GET vers l\'extranet', srv.etat.appels.every((a) => a.methode === 'GET'));
    ok('aucune erreur JavaScript', erreurs.length === 0, JSON.stringify(erreurs));
  } catch (e) {
    ok('déroulé sans erreur', false, e.stack || e);
    await ENV_E2E.capture(p, 'defilement-erreur').catch(() => {});
  } finally {
    q('DELETE FROM extranet_liste_ligne WHERE collecte_id >= ' + premiereCollecte + '; DELETE FROM extranet_collecte WHERE id >= ' + premiereCollecte);
    const ecarts = garde.restaurer(q, CACHES, caches);
    ok('nettoyage : données d’extranet gardées remises à l’identique (CHECKSUM)', ecarts.length === 0, JSON.stringify(ecarts));
    q("DELETE FROM t_event_log WHERE dt_CREATED >= '" + debut + "' AND lg_USER_ID = (SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '"
      + ENV_E2E.LOGIN.replace(/'/g, "''") + "') AND str_TABLE_CONCERN = 'dal.TUser'");
    ok('bilan : journal des événements revenu à son nombre de lignes de départ', q('SELECT COUNT(*) FROM t_event_log') === journalTotal);
    await p.evaluate(() => fetch('../api/v1/extranet/sessions/UBIPHARM', { method: 'DELETE' })).catch(() => {});
    await navigateur.close();
    await srv.arreter();
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
    process.exit(ko ? 1 : 0);
  }
})();
