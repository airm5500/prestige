/* BOUTON « RECHERCHER » APRES LE CHOIX DE LA PERIODE (retour du 08/11, point 5).
 * Avant : les dates filtraient la liste sans action visible, aucun bouton pour lancer la recherche. Attendu : un bouton
 * « Rechercher » a cote des dates (listes datees), Entree dans une date fait de meme ; message « Du … au … : N ligne(s) ».
 * Vrai chemin de l'ecran contre le FAUX extranet local (jamais le vrai) : GESTION DES COMMANDES > Extranets grossistes,
 * session saisie dans l'onglet Sessions, Ubipharm > Vos documents > Derniers relevés, « Lire sur l'extranet » ; la liste
 * servie compte 1 234 lignes toutes differentes (numero, date, montant).
 * Rapprochement : pour trois periodes (05-12, 01-01, 20-28 octobre), puis Entree (03-04) et texte + periode : lignes de
 * l'ecran = lignes de la source dont la date tombe dans la periode, dans l'ordre ; compteur « n / 1234 » et message.
 * Bilan : donnees d'extranet gardees copiees puis remises a l'identique, connexions d'essai retirees, uniquement des GET.
 *
 * Lancement (domain2, laborex_perf, toutes les sources d'extranet dirigees vers 127.0.0.1) :
 *   BASE=http://localhost:9080/prestige DB_TEST=laborex_perf E2E_BASE_LIBRE=1 PAYARA_DOMAINE=.../domain2 node test-ecran-periode-recherche-0811.js
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

    /* periode choisie au clavier dans les champs Du / Au, puis bouton « Rechercher » */
    const visible = await p.evaluate(() => { const b = Ext.ComponentQuery.query('extranetsgrossistes #exListeRELEVESChercher')[0];
      return !!b && b.isVisible(); });
    ok('bouton « Rechercher » visible à côté des dates (liste datée)', visible);
    const choisir = async (champ, valeur) => {
      await vues.cliquer(p, ECRAN + ' #exListeRELEVES' + champ);
      await p.keyboard.press('Control+A');
      await p.keyboard.type(valeur, { delay: 20 });
    };
    const attendus = (a, b) => source.filter((l) => { const j = Number(l[1].slice(0, 2)); return j >= a && j <= b; });
    const ecranRel = () => p.evaluate(() => Ext.ComponentQuery.query('extranetsgrossistes #exListeRELEVESGrille')[0].getStore().getRange()
      .map((r) => r.get('cellules')));
    for (const [a, b] of [[5, 12], [1, 1], [20, 28]]) {
      await choisir('Du', String(a).padStart(2, '0') + '/10/2026');
      await choisir('Au', String(b).padStart(2, '0') + '/10/2026');
      await vues.cliquer(p, ECRAN + ' #exListeRELEVESChercher');
      await p.waitForTimeout(900);
      const att = attendus(a, b), vu = await ecranRel(), msg = await texte(p, '#exListeRELEVESMsg'), nb = await texte(p, '#exListeRELEVESNombre');
      ok('période du ' + a + ' au ' + b + '/10 : écran = lignes attendues (' + att.length + ')', JSON.stringify(vu) === JSON.stringify(att), vu.length);
      ok('période du ' + a + ' au ' + b + '/10 : compteur et message', nb.indexOf(att.length + ' / ' + N + ' ligne') === 0
        && msg.indexOf(String(a).padStart(2, '0') + '/10/2026') >= 0 && msg.indexOf(att.length + ' ligne') >= 0, nb + ' | ' + msg);
    }
    /* la touche Entrée dans un champ de date lance aussi la recherche */
    await choisir('Du', '03/10/2026');
    await choisir('Au', '04/10/2026');
    await p.keyboard.press('Enter');
    await p.waitForTimeout(900);
    const ent = attendus(3, 4), vuEnt = await ecranRel();
    ok('Entrée dans la date : écran = lignes attendues (' + ent.length + ')', JSON.stringify(vuEnt) === JSON.stringify(ent), vuEnt.length);
    /* recherche de texte + periode ensemble */
    const cible = ent[3];
    await vues.cliquer(p, ECRAN + ' #exListeRELEVESRecherche');
    await p.keyboard.type(cible[0], { delay: 20 });
    await vues.cliquer(p, ECRAN + ' #exListeRELEVESChercher');
    await p.waitForTimeout(900);
    const vuTxt = await ecranRel();
    ok('texte + période : une ligne, la bonne', vuTxt.length === 1 && JSON.stringify(vuTxt[0]) === JSON.stringify(cible), JSON.stringify(vuTxt));
    ok('lecture seule : uniquement des GET vers l\'extranet', srv.etat.appels.every((a) => a.methode === 'GET'));
    ok('aucune erreur JavaScript', erreurs.length === 0, JSON.stringify(erreurs));
  } catch (e) {
    ok('déroulé sans erreur', false, e.stack || e);
    await ENV_E2E.capture(p, 'periode-recherche-erreur').catch(() => {});
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
