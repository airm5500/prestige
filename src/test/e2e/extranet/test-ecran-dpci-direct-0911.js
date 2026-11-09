/* DPCI : CONSULTATION DES OFFRES EN DIRECT (option A du 09/11 : « pourquoi en ligne sur l'extranet c'est rapide et ici
 * c'est aussi lent ? pourquoi ne pas utiliser la même chose comme en ligne ? »).
 * Vrai chemin de l'ecran contre le FAUX extranet local (jamais le vrai) : GESTION DES COMMANDES > Extranets grossistes,
 * session DPCI saisie dans l'onglet Sessions, DPCI > Mes offres en cours > Consultation en direct, « Afficher les
 * offres », puis clic sur une offre.
 * Jeu d'essai : 9 offres dont 6 en cours aujourd'hui (une finie hier, une qui commence plus tard, une finie l'an passe),
 * de 0 a 5 produits, paliers en % et en UG differents d'un produit a l'autre, une offre que DPCI « prepare » (loading)
 * une fois avant de la rendre, deux societes.
 * Controles :
 *  - liste : un seul appel AllListOffres, aucun detail lu ; offres affichees = offres en cours, ligne par ligne ;
 *  - detail au clic : un seul appel GetOffre (plus la relecture « loading »), avec les references de l'offre cliquee ;
 *    produits affiches = source, ligne par ligne (produit, code, code facture, paliers) ;
 *  - deux clics rapides : seul le detail de la derniere offre cliquee s'affiche ;
 *  - rapprochement : detail en direct = liste complete lue en arriere-plan et gardee en base, ligne par ligne ;
 *  - rien n'est ecrit par la consultation (aucune collecte, aucune ligne) ; references mal formees refusees.
 *
 * Lancement (domain2, laborex_perf, toutes les sources d'extranet dirigees vers 127.0.0.1) :
 *   BASE=http://localhost:9080/prestige DB_TEST=laborex_perf E2E_BASE_LIBRE=1 PAYARA_DOMAINE=.../domain2 node test-ecran-dpci-direct-0911.js
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

/* date du jour au format de DPCI et decalages */
const j = (d) => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };
const OFFRES = [];
for (let i = 0; i < 9; i++) {
  const debut = i === 4 ? j(5) : j(-30 - i);
  const fin = i === 2 ? j(-1) : i === 7 ? j(-400) : j(20 + i);
  const n = i === 3 ? 0 : 1 + ((i * 7) % 5);
  const produits = [];
  for (let k = 0; k < n; k++) {
    const taux = [2.5, 3, 7.25, 10][(i + k) % 4], ug = 1 + ((i + 2 * k) % 4), p2 = 9 + k;
    const cf = (i + k) % 3 === 0 ? '' : String(3400000000000 + i * 1000 + k);
    produits.push({ code: String(1000000 + i * 100 + k), facture: cf, libelle: 'PRODUIT ' + i + '-' + k + ' CPR B' + (10 + k),
      paliers: [{ operateur: 'ENTRE', palier1: 1, palier2: p2, uniteGratuite: 0, tauxRemise: taux, montantRemise: 0 },
        { operateur: '>=', palier1: p2 + 1, palier2: 0, uniteGratuite: ug, tauxRemise: 0, montantRemise: 0 }],
      attendu: '1 à ' + p2 + ' : ' + String(taux) + ' % ; dès ' + (p2 + 1) + ' : ' + ug + ' UG' });
  }
  OFFRES.push({ code: 'PART' + i, numero: String(1 + (i % 3)), societe: i % 2 ? 'DPCI' : 'DREP', nom: 'OFFRE « ' + i + ' » & co',
    labo: 'LABO ' + i, debut, fin, produits, enCours: i !== 2 && i !== 4 && i !== 7, preparation: i === 5 ? 1 : 0 });
}
const EN_COURS = OFFRES.filter((o) => o.enCours);

(async () => {
  /* domain2 dirige DPCI vers 127.0.0.1:18799 (-DEXTRANET_DPCI_URL) */
  const srv = await faux.demarrer(18799);
  const etatPrep = {};
  srv.etat.fichiers = {
    '/offres': () => ({ type: 'text/html; charset=utf-8', corps: '<html><body><a href="/logout">Déconnexion</a> offres</body></html>' }),
    '/module/offre/AllListOffres.action': () => ({ type: 'application/json', corps: JSON.stringify({ allOffresList: OFFRES.map((o) => ({
      libelleRemise: o.nom, remise: { numero: Number(o.numero), dateDebut: o.debut + 'T00:00:00', dateFin: o.fin + 'T00:00:00' },
      partenariat: { code: o.code, laboratoire: { code: 'L', libelle: o.labo }, societe: { code: o.societe } } })) }) }),
    '/module/offre/GetOffre.action': (u) => {
      const o = OFFRES.find((x) => x.code === u.searchParams.get('idPartenariat') && x.numero === u.searchParams.get('numeroRemise')
        && x.societe === u.searchParams.get('codeSociete'));
      if (!o) { return null; }
      etatPrep[o.code] = (etatPrep[o.code] || 0) + 1;
      if (etatPrep[o.code] <= o.preparation) { return { type: 'application/json', corps: JSON.stringify({ offreVue: { loading: true } }) }; }
      return { type: 'application/json', corps: JSON.stringify({ offreVue: { loading: false, offreLigneList: o.produits.map((p) => ({
        codeProduit: p.code, palierOffreViews: p.paliers, produit: { code: p.code, codeFacture: p.facture, libelle: p.libelle } })) } }) };
    }
  };
  const navigateur = await ENV_E2E.lancer(chromium);
  const ctx = await navigateur.newContext({ viewport: { width: 1600, height: 950 } });
  const p = await ctx.newPage();
  const erreurs = [];
  p.on('pageerror', (e) => erreurs.push(String(e.message)));
  const debut = q("SELECT DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s')");
  const journalTotal = q('SELECT COUNT(*) FROM t_event_log');
  const sauve = garde.sauver(q, TABLES);
  const collectesAvant = q('SELECT COUNT(*) FROM extranet_collecte');
  const lignesAvant = q('SELECT COUNT(*) FROM extranet_liste_ligne');
  const appels = (chemin, depuis) => srv.etat.appels.slice(depuis).filter((a) => a.chemin === chemin);
  const grille = (sel, champs) => p.evaluate(([s, c]) => Ext.ComponentQuery.query('extranetsgrossistes ' + s)[0].getStore().getRange()
    .map((r) => c.map((k) => String(r.get(k) === null || r.get(k) === undefined ? '' : r.get(k)))), [sel, champs]);
  const cliquerOffre = async (nom) => {
    const id = await p.evaluate((n) => {
      const g = Ext.ComponentQuery.query('extranetsgrossistes #exDpciDirectOffres')[0];
      const r = g.getStore().findRecord('nom', n, 0, false, true, true);
      return g.getView().getNode(r).id;
    }, nom);
    await p.click('#' + id);
  };
  try {
    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await vues.ouvrirMenu(p, 'GESTION DES COMMANDES', 'Extranets grossistes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('extranetsgrossistes')[0], null, { timeout: 60000 });
    await p.mouse.move(1200, 600);
    await p.waitForTimeout(1500);
    await vues.cliquer(p, ECRAN + ' #exOnglets tab[text=Sessions]');
    await p.waitForTimeout(400);
    await vues.saisir(p, ECRAN + ' #exCookieDPCI', srv.COOKIE);
    const rs = p.waitForResponse((x) => x.url().indexOf('/sessions/DPCI') >= 0, { timeout: 60000 });
    await vues.cliquer(p, ECRAN + ' #exSaisieDPCI button[text=Enregistrer]');
    await rs;
    for (const t of ['DPCI', 'Mes offres en cours', 'Consultation en direct']) { await vues.cliquer(p, ECRAN + ' #exOnglets tab[text=' + t + ']'); await p.waitForTimeout(400); }

    /* liste en direct */
    let a0 = srv.etat.appels.length;
    const rl = p.waitForResponse((x) => x.url().indexOf('/dpci/direct/offres') >= 0, { timeout: 60000 });
    await vues.cliquer(p, ECRAN + ' #exDpciDirectLire');
    await rl;
    await p.waitForTimeout(500);
    ok('liste : un seul appel AllListOffres, aucun détail lu', appels('/module/offre/AllListOffres.action', a0).length === 1
      && appels('/module/offre/GetOffre.action', a0).length === 0, srv.etat.appels.slice(a0).map((a) => a.chemin).join(','));
    const liste = await grille('#exDpciDirectOffres', ['nom', 'labo', 'debut', 'fin']);
    const attendue = EN_COURS.map((o) => [o.nom, o.labo, o.debut, o.fin]);
    ok('liste : offres affichées = offres en cours (6), ligne par ligne', JSON.stringify(liste) === JSON.stringify(attendue), JSON.stringify(liste));
    const msgListe = await p.evaluate(() => Ext.ComponentQuery.query('extranetsgrossistes #exDpciDirectMsg')[0].el.dom.textContent);
    ok('liste : message « 6 offre(s), lues en direct : rien n\'est gardé »', /^6 offre\(s\), lues en direct/.test(msgListe), msgListe);

    /* detail au clic, pour chaque offre en cours (dont une vide et une « en preparation ») */
    for (const o of EN_COURS) {
      a0 = srv.etat.appels.length;
      const rd = p.waitForResponse((x) => x.url().indexOf('/dpci/direct/offre?') >= 0, { timeout: 60000 });
      await cliquerOffre(o.nom);
      await rd;
      await p.waitForTimeout(400);
      const g = appels('/module/offre/GetOffre.action', a0);
      const prm = g.map((a) => new URLSearchParams(a.requete));
      ok(o.code + ' : ' + (1 + o.preparation) + ' appel(s) GetOffre, références de l\'offre cliquée', g.length === 1 + o.preparation
        && prm.every((x) => x.get('idPartenariat') === o.code && x.get('numeroRemise') === o.numero && x.get('codeSociete') === o.societe),
      g.map((a) => a.requete).join(' '));
      const d = await grille('#exDpciDirectDetail', ['produit', 'code', 'codeFacture', 'paliers']);
      const att = o.produits.map((x) => [x.libelle, x.code, x.facture, x.attendu]);
      ok(o.code + ' : produits affichés = source (' + att.length + '), ligne par ligne', JSON.stringify(d) === JSON.stringify(att), JSON.stringify(d).slice(0, 300));
      const titre = await p.evaluate(() => Ext.ComponentQuery.query('extranetsgrossistes #exDpciDirectDetail')[0].title);
      ok(o.code + ' : titre « … ' + att.length + ' produit(s) »', titre.indexOf(att.length + ' produit(s)') > 0, titre);
    }

    /* deux clics rapides : seul le dernier detail s'affiche */
    srv.etat.retardMs = 900;
    const premiere = EN_COURS[0], derniere = EN_COURS[EN_COURS.length - 1];
    await cliquerOffre(premiere.nom);
    await p.waitForTimeout(150);
    await cliquerOffre(derniere.nom);
    await p.waitForTimeout(4000);
    srv.etat.retardMs = 0;
    const dd = await grille('#exDpciDirectDetail', ['produit']);
    ok('deux clics rapides : détail de la dernière offre cliquée seulement', JSON.stringify(dd) === JSON.stringify(derniere.produits.map((x) => [x.libelle])), JSON.stringify(dd));

    ok('consultation : rien d\'écrit (aucune collecte, aucune ligne gardée)', q('SELECT COUNT(*) FROM extranet_collecte') === collectesAvant
      && q('SELECT COUNT(*) FROM extranet_liste_ligne') === lignesAvant);
    const refus = await p.evaluate(() => Promise.all([
      fetch('../api/v1/extranet/dpci/direct/offre?codeSociete=DREP&idPartenariat=P%26x%3D1&numeroRemise=1').then((r) => r.json()),
      fetch('../api/v1/extranet/dpci/direct/offre?codeSociete=DREP&numeroRemise=1').then((r) => r.json()),
      fetch('../api/v1/extranet/dpci/direct/offres?du=2026-13-01&au=2026-11-09').then((r) => r.json())]));
    ok('refus : références mal formées ou absentes, date illisible', refus.every((r) => r.success === false), JSON.stringify(refus).slice(0, 300));

    /* rapprochement : liste complete lue en arriere-plan (onglet « Offres en cours ») = details en direct */
    await vues.cliquer(p, ECRAN + ' #exOnglets tab[text=Offres en cours]');
    await p.waitForTimeout(600);
    const finie = p.waitForResponse(async (x) => x.url().indexOf('/lectures/dpci/DPCI_OFFRES') >= 0
      && (await x.json().catch(() => ({}))).lecture?.enCours === false, { timeout: 180000 });
    await vues.cliquer(p, ECRAN + ' #exListeDPCI_OFFRESCollecter');
    await p.waitForTimeout(400);
    if (await p.evaluate(() => /relire \?/.test(Ext.ComponentQuery.query('extranetsgrossistes #exListeDPCI_OFFRESCollecter')[0].getText()))) {
      await vues.cliquer(p, ECRAN + ' #exListeDPCI_OFFRESCollecter');
    }
    const lu = (await (await finie).json()).lecture.resultat;
    const c = q("SELECT IFNULL(MAX(id), 0) FROM extranet_collecte WHERE module = 'LISTE_DPCI_OFFRES' AND statut = 'COMPLETE'");
    const base = q("SELECT cellules FROM extranet_liste_ligne WHERE liste = 'DPCI_OFFRES' AND collecte_id = " + c + ' ORDER BY position')
      .split('\n').filter((x) => x).map((l) => { const t = JSON.parse(l); return [t[0], t[4], t[5], t[6], t[7]]; });
    const direct = [];
    EN_COURS.forEach((o) => o.produits.forEach((x) => direct.push([o.nom, x.libelle, x.code, x.facture, x.attendu])));
    ok('rapprochement : liste gardée en base = détails en direct, ligne par ligne (' + direct.length + ' produits)',
      lu.success && JSON.stringify(base) === JSON.stringify(direct), JSON.stringify(base).slice(0, 300));

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
