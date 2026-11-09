/* LECTURES EN ETAPES COURTES (option A du 09/11, lenteurs des extranets).
 * Vrai chemin de l'ecran contre le FAUX extranet local (jamais le vrai) : GESTION DES COMMANDES > Extranets grossistes,
 * session saisie dans l'onglet Sessions, Ubipharm > Vos documents > Derniers relevés, « Lire sur l'extranet ».
 * Jeu d'essai : 2 500 releves (25 pages de 100), numeros, dates et montants differents d'une ligne a l'autre, puis
 * 2 437 releves (dernier paquet incomplet), puis une lecture en echec (page repetee par l'extranet).
 * Controles :
 *  - pendant une lecture lente : la collecte est deja visible EN_COURS en base (journal ecrit hors de la longue
 *    lecture), l'ecran affiche « page n / N », la liste gardee reste affichee ;
 *  - rapprochement base = extranet = ecran, ligne par ligne (position, numero, date, montant), par paquets de 1 000 ;
 *  - echec : collecte ECHEC, aucune ligne a son nom, l'ancien cache intact a l'ecran et en base ;
 *  - bilan : exactement trois collectes de plus, une seule collecte gardee en cache, tables remises a l'identique.
 *
 * Lancement (domain2, laborex_perf, toutes les sources d'extranet dirigees vers 127.0.0.1) :
 *   BASE=http://localhost:9080/prestige DB_TEST=laborex_perf E2E_BASE_LIBRE=1 PAYARA_DOMAINE=.../domain2 node test-ecran-lecture-etapes-0911.js
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
const TABLES = ['extranet_collecte', 'extranet_liste_ligne', 'extranet_grossiste'];
const ECRAN = 'extranetsgrossistes';
const MENU = "<a href='#' class='dropdown-toggle'><i class='fa fa-bars'></i></a>";

/* releves tires d'une graine fixe : valeurs differentes d'une ligne a l'autre */
function releves(n, graine) {
  const l = [];
  let x = graine;
  for (let i = 0; i < n; i++) {
    x = (x * 1103515245 + 12345) % 2147483648;
    const num = 'R' + String(900000 - i * 3 - (x % 3));
    const date = String(1 + (x % 28)).padStart(2, '0') + '/' + String(1 + (i % 12)).padStart(2, '0') + '/2026';
    const m = (x % 5 === 0 ? '0' : String(x % 9000000)) + ' CFA';
    l.push({ c: [MENU, num, date, m], e: [num, date, m] });
  }
  return l;
}

(async () => {
  const srv = await faux.demarrer(18765);
  const navigateur = await ENV_E2E.lancer(chromium);
  const ctx = await navigateur.newContext({ viewport: { width: 1600, height: 950 } });
  const p = await ctx.newPage();
  const erreurs = [];
  p.on('pageerror', (e) => erreurs.push(String(e.message)));
  const debut = q("SELECT DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s')");
  const journalTotal = q('SELECT COUNT(*) FROM t_event_log');
  const sauve = garde.sauver(q, TABLES);
  const collectesAvant = Number(q("SELECT IFNULL(MAX(id), 0) FROM extranet_collecte"));
  const msg = () => p.evaluate(() => Ext.ComponentQuery.query('extranetsgrossistes #exListeRELEVESMsg')[0].el.dom.textContent);
  /* lignes gardees affichees a l'ecran : compteur « n / N ligne(s) » (N = toutes, quel que soit le filtre de periode) */
  const lignesEcran = () => p.evaluate(() => {
    const t = Ext.ComponentQuery.query('extranetsgrossistes #exListeRELEVESNombre')[0].el.dom.textContent;
    const m = /^(\d+)(?: \/ (\d+))? ligne/.exec(t);
    return m ? Number(m[2] || m[1]) : t;
  });
  const lire = async () => {
    const finie = p.waitForResponse(async (x) => x.url().indexOf('/lectures/ubipharm/RELEVES') >= 0
      && (await x.json().catch(() => ({}))).lecture?.enCours === false, { timeout: 300000 });
    await vues.cliquer(p, ECRAN + ' #exListeRELEVESCollecter');
    await p.waitForTimeout(400);
    if (await p.evaluate(() => /relire \?/.test(Ext.ComponentQuery.query('extranetsgrossistes #exListeRELEVESCollecter')[0].getText()))) {
      await vues.cliquer(p, ECRAN + ' #exListeRELEVESCollecter');
    }
    return finie;
  };
  const base = (id) => q('SELECT position, cellules FROM extranet_liste_ligne WHERE liste = \'RELEVES\' AND collecte_id = ' + id + ' ORDER BY position')
    .split('\n').filter((x) => x).map((l) => { const t = l.split('\t'); return [Number(t[0]), JSON.parse(t[1])]; });
  const rapprocher = (nom, id, attendu) => {
    const b = base(id);
    const ecarts = [];
    attendu.forEach((r, i) => {
      if (!b[i] || b[i][0] !== i || JSON.stringify(b[i][1]) !== JSON.stringify(r.e)) { ecarts.push(i + ' : ' + JSON.stringify(b[i])); }
    });
    ok(nom + ' : base = extranet, ligne par ligne (' + attendu.length + ' lignes, positions 0..' + (attendu.length - 1) + ')',
      b.length === attendu.length && ecarts.length === 0, b.length + ' lignes ; ' + ecarts.slice(0, 3).join(' | '));
  };
  try {
    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await vues.ouvrirMenu(p, 'GESTION DES COMMANDES', 'Extranets grossistes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('extranetsgrossistes')[0], null, { timeout: 60000 });
    await p.mouse.move(1200, 600);
    await p.waitForTimeout(1500);
    await vues.cliquer(p, ECRAN + ' #exOnglets tab[text=Sessions]');
    await p.waitForTimeout(400);
    await vues.saisir(p, ECRAN + ' #exCookieUBIPHARM', srv.COOKIE);
    const rs = p.waitForResponse((x) => x.url().indexOf('/sessions/UBIPHARM') >= 0, { timeout: 60000 });
    await vues.cliquer(p, ECRAN + ' #exSaisieUBIPHARM button[text=Enregistrer]');
    await rs;
    for (const t of ['Ubipharm', 'Vos documents', 'Derniers relevés']) { await vues.cliquer(p, ECRAN + ' #exOnglets tab[text=' + t + ']'); await p.waitForTimeout(400); }

    /* 1. 2 500 releves, lecture rapide */
    const jeu1 = releves(2500, 20261109);
    srv.etat.listes.RELEVES = { chemin: '/GetRelevesJSON', pagine: jeu1, attendu: jeu1.map((x) => x.e) };
    const r1 = (await (await lire()).json()).lecture.resultat;
    const c1 = Number(q("SELECT IFNULL(MAX(id), 0) FROM extranet_collecte WHERE module = 'LISTE_RELEVES' AND statut = 'COMPLETE'"));
    ok('lecture 1 : complète, 2 500 lignes reçues', r1.success && r1.collecte && r1.collecte.lignesRecues === 2500 && c1 > collectesAvant,
      JSON.stringify(r1.collecte || r1).slice(0, 200));
    rapprocher('lecture 1', c1, jeu1);
    await p.waitForTimeout(1500);
    ok('lecture 1 : écran = base (2 500 lignes)', (await lignesEcran()) === 2500, await lignesEcran());

    /* 2. lecture lente de 2 437 releves : journal visible pendant la lecture, avancement, ancien cache affiche */
    const jeu2 = releves(2437, 7);
    srv.etat.listes.RELEVES = { chemin: '/GetRelevesJSON', pagine: jeu2, attendu: jeu2.map((x) => x.e) };
    srv.etat.retardMs = 600;
    const fin2 = lire();
    let enCoursBase = '', avancement = '', ecranPendant = -1, pageVue = 0;
    for (let k = 0; k < 60; k++) {
      await p.waitForTimeout(1000);
      const m = await msg();
      const e = q("SELECT COUNT(*) FROM extranet_collecte WHERE module = 'LISTE_RELEVES' AND statut = 'EN_COURS' AND id > " + c1);
      if (e === '1') { enCoursBase = e; }
      const pg = /page (\d+) \/ (\d+)/.exec(m);
      if (pg && Number(pg[1]) >= 3) { avancement = m; pageVue = Number(pg[1]); ecranPendant = await lignesEcran(); }
      if (enCoursBase && avancement) { break; }
    }
    ok('pendant la lecture : collecte déjà visible EN_COURS en base (journal écrit hors de la longue lecture)', enCoursBase === '1');
    ok('pendant la lecture : écran « page n / 25 » (25 pages de 100)', /page \d+ \/ 25\b/.test(avancement), avancement);
    ok('pendant la lecture : la liste gardée reste affichée (2 500 lignes)', ecranPendant === 2500, ecranPendant + ' (page ' + pageVue + ')');
    const r2 = (await (await fin2).json()).lecture.resultat;
    srv.etat.retardMs = 0;
    const c2 = Number(q("SELECT IFNULL(MAX(id), 0) FROM extranet_collecte WHERE module = 'LISTE_RELEVES' AND statut = 'COMPLETE'"));
    ok('lecture 2 : complète, 2 437 lignes (dernier paquet de 437)', r2.success && r2.collecte.lignesRecues === 2437 && c2 > c1, JSON.stringify(r2.collecte || r2).slice(0, 200));
    rapprocher('lecture 2', c2, jeu2);
    ok('lecture 2 : une seule collecte gardée en cache', q("SELECT COUNT(DISTINCT collecte_id) FROM extranet_liste_ligne WHERE liste = 'RELEVES'") === '1');
    await p.waitForTimeout(1500);
    ok('lecture 2 : écran = base (2 437 lignes)', (await lignesEcran()) === 2437, await lignesEcran());

    /* 3. echec : l'extranet renvoie toujours la meme page */
    const premiere = jeu2.slice(0, 100).map((x) => x.c);
    srv.etat.listes.RELEVES = { chemin: '/GetRelevesJSON', json: () => ({ msg: [], datatables: { recordsTotal: 2437, recordsFiltered: 2437, data: premiere } }) };
    const r3 = (await (await lire()).json()).lecture.resultat;
    const c3 = Number(q("SELECT IFNULL(MAX(id), 0) FROM extranet_collecte WHERE module = 'LISTE_RELEVES'"));
    ok('lecture 3 : échec signalé, collecte ECHEC', !r3.success && q('SELECT statut FROM extranet_collecte WHERE id = ' + c3) === 'ECHEC', JSON.stringify(r3).slice(0, 200));
    ok('lecture 3 : aucune ligne écrite au nom de la collecte en échec', q("SELECT COUNT(*) FROM extranet_liste_ligne WHERE collecte_id = " + c3) === '0');
    rapprocher('lecture 3 : ancien cache intact', c2, jeu2);
    await p.waitForTimeout(1500);
    const m3 = await p.evaluate(() => Ext.ComponentQuery.query('extranetsgrossistes #exListeRELEVESMsg')[0].el.dom.innerHTML);
    ok('lecture 3 : message rouge, la liste gardée reste à l\'écran', /c0392b|rgb\(192, 57, 43\)/.test(m3) && (await lignesEcran()) === 2437, m3);

    /* bilan */
    ok('bilan : exactement trois collectes de plus (COMPLETE, COMPLETE, ECHEC), aucune laissée EN_COURS',
      q('SELECT GROUP_CONCAT(statut ORDER BY id) FROM extranet_collecte WHERE id > ' + collectesAvant) === 'COMPLETE,COMPLETE,ECHEC',
      q('SELECT GROUP_CONCAT(module, \':\', statut ORDER BY id) FROM extranet_collecte WHERE id > ' + collectesAvant));
    ok('faux extranet : uniquement des GET', srv.etat.appels.every((a) => a.methode === 'GET'));
    ok('aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('déroulé sans exception', false, e.stack || e.message);
  } finally {
    await navigateur.close();
    await srv.arreter();
    const ecarts = garde.restaurer(q, TABLES, sauve);
    q("DELETE FROM t_event_log WHERE dt_CREATED >= '" + debut + "' AND lg_USER_ID = (SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '"
      + ENV_E2E.LOGIN.replace(/'/g, "''") + "') AND str_TABLE_CONCERN = 'dal.TUser'");
    ok('bilan : listes gardées remises à l\'identique', ecarts.length === 0, ecarts.join(', '));
    ok('bilan : journal des connexions d\'essai retiré', q('SELECT COUNT(*) FROM t_event_log') === journalTotal);
    const n = res.filter((x) => x.c).length;
    console.log('\n' + n + '/' + res.length + (n === res.length ? ' OK' : ' ECHEC'));
    process.exit(n === res.length ? 0 : 1);
  }
})();
