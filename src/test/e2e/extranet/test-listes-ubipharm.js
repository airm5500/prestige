/* ONGLET UBIPHARM (demande du 08/11) : les 9 listes des rubriques Produits, Vos documents et Commandes, par le vrai
 * chemin de l'ecran, contre un FAUX extranet local (faux-extranet.js + faux-listes-ubipharm.js) : jamais le vrai.
 *
 * Parcours : connexion, menu GESTION DES COMMANDES > Extranets grossistes, session saisie dans l'onglet Sessions, puis
 * pour chaque liste : onglet Ubipharm > rubrique > liste, « Lire sur l'extranet ».
 * Rapprochement : chaque ligne est comparee cellule par cellule entre la source (faux extranet), la base
 * (extranet_liste_ligne) et l'ecran (grille) ; reference produit et CIP compares a part ; total annonce = recu.
 * Ergonomie : recherche dans toutes les colonnes, compteur de lignes, date de collecte, message dans l'onglet.
 * Bilan avant / apres : une collecte par lecture, rien dans les tables metier, uniquement des GET ; une session expiree
 * laisse le cache precedent ; une nouvelle lecture remplace les lignes sans doublon. Donnees du test retirees a la fin.
 *
 * Lancement (domain3, base laborex_audit, Payara demarre avec -DEXTRANET_UBIPHARM_URL=http://127.0.0.1:18765) :
 *   BASE=http://localhost:10090/prestige DB_TEST=laborex_audit E2E_BASE_LIBRE=1 node test-listes-ubipharm.js
 */
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const faux = require('./faux-extranet');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright-core');

const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s],
  { encoding: 'utf8' }).replace(/\r/g, '').trim();
const lignes = (s) => { const t = q(s); return t ? t.split('\n').map((l) => l.split('\t')) : []; };
const deHex = (h) => (h === 'NULL' ? null : Buffer.from(h, 'hex').toString('utf8'));

const res = [];
function ok(n, c, d) {
  res.push({ n, c: !!c });
  console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : ''));
}

const METIER = ['t_famille', 't_famille_grossiste', 't_famille_stock', 't_order', 't_order_detail', 't_suggestion_order',
  't_bon_livraison', 't_retour_fournisseur', 't_grossiste'];
const empreinteMetier = () => Object.fromEntries(METIER.map((t) => [t, q('CHECKSUM TABLE ' + t).split('\t')[1]]));
const compterExtranet = () => ({ collectes: Number(q('SELECT COUNT(*) FROM extranet_collecte')), lignes: Number(q('SELECT COUNT(*) FROM extranet_liste_ligne')) });

const ECRAN = 'extranetsgrossistes';
const LISTES = [
  ['PROMOTIONS', 'Produits', 'Promotions', true], ['PRODUITS_UG', 'Produits', 'Produits avec UG', true],
  ['PRODUITS_SUPPRIMES', 'Produits', 'Produits supprimés', true], ['FACTURES', 'Vos documents', 'Factures non relevées', false],
  ['RELEVES', 'Vos documents', 'Derniers relevés', false], ['AVOIRS', 'Vos documents', 'Récapitulatifs d\'avoirs', false],
  ['DERNIERES_COMMANDES', 'Commandes', 'Vos dernières commandes', false], ['COMMANDES_EXTRANET', 'Commandes', 'Vos commandes extranet', false],
  ['PLUS_ACHETES', 'Commandes', 'Les plus achetés', true]];
/* la colonne Reference (pscode) et la colonne CIP suivent la definition : listes avec produit */
const AVEC_PRODUIT = ['PRODUITS_UG', 'PRODUITS_SUPPRIMES', 'PLUS_ACHETES'];

const texte = (p, sel) => p.evaluate((s) => { const c = Ext.ComponentQuery.query('extranetsgrossistes ' + s)[0]; return c && c.el ? c.el.dom.textContent : ''; }, sel);
async function onglet(p, chemin) {
  for (const t of chemin) {
    await vues.cliquer(p, ECRAN + ' #exOnglets tab[text=' + t + ']');
    await p.waitForTimeout(300);
  }
}
/* 08/11 : la lecture tourne en arriere-plan ; on attend l'etat « fini » de la lecture, puis le rechargement de la liste */
async function cliquerEtAttendre(p, requete, morceauUrl) {
  const m = /\/(\w+)\/listes\/(\w+)\/collecte/.exec(morceauUrl);
  const url = '/lectures/' + m[1] + '/' + m[2];
  const finie = p.waitForResponse(async (x) => {
    if (x.url().indexOf(url) < 0) { return false; }
    const j = await x.json().catch(() => ({}));
    return j.lecture && j.lecture.enCours === false;
  }, { timeout: 180000 });
  await vues.cliquer(p, requete);
  const rep = await (await finie).json();
  await p.waitForTimeout(1500);
  return rep.lecture.resultat || {};
}
/* lignes affichees par la grille : texte de chaque cellule visible, dans l'ordre */
const grille = (p, code) => p.evaluate((c) => {
  const g = Ext.ComponentQuery.query('extranetsgrossistes #exListe' + c + 'Grille')[0];
  const cols = g.headerCt.getGridColumns();
  return g.getStore().getRange().map((r) => cols.map((col, i) => { const v = r.get('cellules'); return v ? v[i] : ''; }));
}, code);
const titres = (p, code) => p.evaluate((c) => Ext.ComponentQuery.query('extranetsgrossistes #exListe' + c + 'Grille')[0]
  .headerCt.getGridColumns().map((x) => x.text), code);
const baseListe = (code, collecte) => lignes('SELECT HEX(cellules), IFNULL(HEX(pscode), \'NULL\'), IFNULL(HEX(cip), \'NULL\') FROM extranet_liste_ligne WHERE liste = \''
  + code + '\' AND collecte_id = ' + collecte + ' ORDER BY position').map((l) => ({ cellules: JSON.parse(deHex(l[0])), pscode: deHex(l[1]), cip: deHex(l[2]) }));

(async () => {
  const srv = await faux.demarrer(18765);
  const navigateur = await ENV_E2E.lancer(chromium);
  const p = await (await navigateur.newContext()).newPage();
  const premiereCollecte = Number(q('SELECT IFNULL(MAX(id), 0) + 1 FROM extranet_collecte'));
  const avant = compterExtranet();
  const metierAvant = empreinteMetier();
  try {
    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await vues.ouvrirMenu(p, 'GESTION DES COMMANDES', 'Extranets grossistes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('extranetsgrossistes')[0], null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    await vues.saisir(p, ECRAN + ' #exCookieUBIPHARM', srv.COOKIE);
    const rs = p.waitForResponse((x) => x.url().indexOf('/sessions/UBIPHARM') >= 0, { timeout: 60000 });
    await vues.cliquer(p, ECRAN + ' #exSaisieUBIPHARM button[text=Enregistrer]');
    await rs;
    await p.waitForTimeout(800);

    for (const [code, rubrique, titre] of LISTES) {
      const source = srv.etat.listes[code].attendu;
      await onglet(p, ['Ubipharm', rubrique, titre]);
      const r = await cliquerEtAttendre(p, ECRAN + ' #exListe' + code + 'Collecter', '/ubipharm/listes/' + code + '/collecte');
      ok(titre + ' : collecte réussie', r.success === true && r.collecte && r.collecte.statut === 'COMPLETE', JSON.stringify(r).slice(0, 300));
      if (!r.success) { continue; }
      const id = r.collecte.id;
      ok(titre + ' : lignes reçues = source (' + source.length + ')', r.collecte.lignesRecues === source.length, r.collecte.lignesRecues);
      const annonce = code === 'PRODUITS_UG' || ['PROMOTIONS', 'PRODUITS_SUPPRIMES', 'FACTURES', 'COMMANDES_EXTRANET'].indexOf(code) >= 0 ? null : source.length;
      ok(titre + ' : lignes annoncées = ' + annonce, r.collecte.lignesAnnoncees === annonce, r.collecte.lignesAnnoncees);
      const base = baseListe(code, id);
      const avecRef = AVEC_PRODUIT.indexOf(code) >= 0;
      ok(titre + ' : base = source, ligne par ligne', JSON.stringify(base.map((b) => b.cellules)) === JSON.stringify(source),
        JSON.stringify([base.length, (base.find((b, i) => JSON.stringify(b.cellules) !== JSON.stringify(source[i])) || {}).cellules,
          source[base.findIndex((b, i) => JSON.stringify(b.cellules) !== JSON.stringify(source[i]))]]));
      if (avecRef) {
        ok(titre + ' : référence et CIP rangés à part = source', base.every((b, i) => b.pscode === source[i][0] && (b.cip || '') === source[i][2]),
          JSON.stringify(base.map((b) => [b.pscode, b.cip])));
      }
      const ecran = await grille(p, code);
      ok(titre + ' : écran = base, ligne par ligne', JSON.stringify(ecran) === JSON.stringify(base.map((b) => b.cellules)),
        JSON.stringify([ecran.length, ecran[0]]));
      const t = await titres(p, code);
      ok(titre + ' : une colonne par cellule' + (avecRef ? ', Référence et CIP présents' : ''), source.length === 0 || t.length === source[0].length
        && (!avecRef || (t[0] === 'Référence' && t.indexOf('CIP') > 0)), t.join('|'));
      ok(titre + ' : date de collecte et nombre de lignes affichés', (await texte(p, '#exListe' + code + 'Date')).indexOf('collectées le') >= 0
        && (await texte(p, '#exListe' + code + 'Nombre')).indexOf(source.length + ' ligne') === 0, await texte(p, '#exListe' + code + 'Nombre'));
      ok(titre + ' : message dans l\'onglet', (await texte(p, '#exListe' + code + 'Msg')).indexOf('Liste lue') >= 0);
    }

    /* ---- ergonomie : recherche dans toutes les colonnes (releves : 130 lignes) */
    await onglet(p, ['Ubipharm', 'Vos documents', 'Derniers relevés']);
    await vues.saisir(p, ECRAN + ' #exListeRELEVESRecherche', 'r49999');
    await p.waitForTimeout(500);
    ok('recherche : une ligne trouvée sur 130, compteur « 1 / 130 »', (await grille(p, 'RELEVES')).length === 1
      && (await texte(p, '#exListeRELEVESNombre')).indexOf('1 / 130') === 0, await texte(p, '#exListeRELEVESNombre'));
    /* effacement comme l'utilisateur : tout selectionner, puis retour arriere */
    await vues.cliquer(p, ECRAN + ' #exListeRELEVESRecherche');
    await p.keyboard.press('Control+A');
    await p.keyboard.press('Backspace');
    await p.waitForTimeout(500);
    ok('recherche effacée : 130 lignes', (await grille(p, 'RELEVES')).length === 130, (await grille(p, 'RELEVES')).length);

    /* ---- relecture : remplace les lignes, sans doublon */
    await onglet(p, ['Ubipharm', 'Commandes', 'Les plus achetés']);
    const r2 = await cliquerEtAttendre(p, ECRAN + ' #exListePLUS_ACHETESCollecter', '/ubipharm/listes/PLUS_ACHETES/collecte');
    ok('relecture : seules les lignes de la dernière collecte sont gardées', r2.success
      && q('SELECT COUNT(*) FROM extranet_liste_ligne WHERE liste = \'PLUS_ACHETES\'') === String(srv.etat.listes.PLUS_ACHETES.attendu.length)
      && q('SELECT COUNT(DISTINCT collecte_id) FROM extranet_liste_ligne WHERE liste = \'PLUS_ACHETES\'') === '1');

    /* ---- lecture longue (08/11) : la demande rend la main, l'onglet reste utilisable, un second clic suit la meme
       lecture (une seule collecte), puis la liste est rechargee */
    srv.etat.retardMs = 1500;
    const debutLongue = Date.now();
    const lancee = p.waitForResponse((x) => x.url().indexOf('/lectures/ubipharm/PLUS_ACHETES') >= 0 && x.request().method() === 'POST');
    const finLongue = p.waitForResponse(async (x) => x.url().indexOf('/lectures/ubipharm/PLUS_ACHETES') >= 0
      && (await x.json().catch(() => ({}))).lecture?.enCours === false, { timeout: 180000 });
    await vues.cliquer(p, ECRAN + ' #exListePLUS_ACHETESCollecter');
    const jl = await (await lancee).json();
    ok('lecture longue : la demande rend la main en moins de 3 s', Date.now() - debutLongue < 3000 && jl.lancee === true
      && jl.lecture.enCours === true, (Date.now() - debutLongue) + ' ms ' + JSON.stringify(jl).slice(0, 200));
    await p.waitForTimeout(3500);
    const pendant = await p.evaluate(() => { const me = Ext.ComponentQuery.query('extranetsgrossistes')[0];
      return { masque: !!me.down('#exListePLUS_ACHETES').el.isMasked(), ecranMasque: !!me.el.isMasked(),
        msg: me.down('#exListePLUS_ACHETESMsg').el.dom.textContent, bouton: me.down('#exListePLUS_ACHETESCollecter').getText(),
        inactif: me.down('#exListePLUS_ACHETESCollecter').isDisabled(), lignes: me.listes.PLUS_ACHETES.getCount() }; });
    ok('lecture longue : onglet non bloqué, « en cours depuis » affiché, bouton inactif, liste gardée visible', !pendant.masque && !pendant.ecranMasque
      && /Lecture sur l'extranet en cours depuis \d+ s/.test(pendant.msg) && pendant.inactif && pendant.bouton === 'Lecture en cours…' && pendant.lignes > 0,
    JSON.stringify(pendant));
    const second = await p.evaluate(() => fetch('../api/v1/extranet/lectures/ubipharm/PLUS_ACHETES', { method: 'POST' }).then((x) => x.json()));
    ok('lecture longue : un second lancement suit la lecture en cours', second.lancee === false && second.lecture.enCours === true
      && second.lecture.debut === jl.lecture.debut, JSON.stringify(second).slice(0, 200));
    await onglet(p, ['Ubipharm', 'Vos documents', 'Derniers relevés']);
    ok('lecture longue : un autre onglet reste utilisable pendant la lecture', (await grille(p, 'RELEVES')).length === 130);
    await onglet(p, ['Ubipharm', 'Commandes', 'Les plus achetés']);
    const jf = await (await finLongue).json();
    await p.waitForTimeout(2000);
    srv.etat.retardMs = 0;
    ok('lecture longue : finie avec succès, durée affichée', jf.lecture.resultat.success === true
      && /Liste lue en \d+/.test(await texte(p, '#exListePLUS_ACHETESMsg')), await texte(p, '#exListePLUS_ACHETESMsg'));
    ok('lecture longue : liste rechargée = base, bouton rendu', JSON.stringify(await grille(p, 'PLUS_ACHETES'))
      === JSON.stringify(baseListe('PLUS_ACHETES', jf.lecture.resultat.collecte.id).map((b) => b.cellules))
      && !(await p.evaluate(() => Ext.ComponentQuery.query('extranetsgrossistes #exListePLUS_ACHETESCollecter')[0].isDisabled())));

    /* ---- session expiree : echec, cache precedent garde et toujours affiche */
    const avantExp = q('SELECT COUNT(*) FROM extranet_liste_ligne WHERE liste = \'PLUS_ACHETES\'');
    srv.etat.mode = 'expire';
    const re = await cliquerEtAttendre(p, ECRAN + ' #exListePLUS_ACHETESCollecter', '/ubipharm/listes/PLUS_ACHETES/collecte');
    ok('expiration : reconnue', re.success === false && re.nature === 'SESSION_EXPIREE', JSON.stringify(re).slice(0, 200));
    ok('expiration : message renvoyant à l\'onglet Sessions', (await texte(p, '#exListePLUS_ACHETESMsg')).indexOf('Sessions') >= 0,
      await texte(p, '#exListePLUS_ACHETESMsg'));
    ok('expiration : cache précédent gardé en base et à l\'écran', q('SELECT COUNT(*) FROM extranet_liste_ligne WHERE liste = \'PLUS_ACHETES\'') === avantExp
      && (await grille(p, 'PLUS_ACHETES')).length === Number(avantExp));
    srv.etat.mode = 'normal';

    /* ---- bilan */
    const journal = lignes('SELECT module, statut FROM extranet_collecte WHERE id >= ' + premiereCollecte + ' ORDER BY id').map((l) => l.join(':'));
    const attendu = LISTES.map((l) => 'LISTE_' + l[0] + ':COMPLETE').concat(['LISTE_PLUS_ACHETES:COMPLETE', 'LISTE_PLUS_ACHETES:COMPLETE',
      'LISTE_PLUS_ACHETES:ECHEC']);
    ok('bilan : une collecte par lecture, statuts attendus', JSON.stringify(journal) === JSON.stringify(attendu), journal.join(', '));
    ok('bilan : aucune table métier modifiée', JSON.stringify(metierAvant) === JSON.stringify(empreinteMetier()));
    ok('lecture seule : uniquement des GET vers l\'extranet', srv.etat.appels.every((a) => a.methode === 'GET'));
    const pagesRel = srv.etat.appels.filter((a) => a.chemin === '/GetRelevesJSON').map((a) => new URLSearchParams(a.requete).get('start'));
    ok('relevés : 2 pages lues (start 0, 100)', pagesRel.join(',') === '0,100', pagesRel.join(','));
    const etabs = srv.etat.appels.filter((a) => a.chemin === '/ReturnDernieresCommandesEtabJSON').map((a) => new URLSearchParams(a.requete).get('etab'));
    ok('dernières commandes : une lecture par agence de la page (BKE, GNA, YOP)', etabs.join(',') === 'BKE,GNA,YOP', etabs.join(','));
  } catch (e) {
    ok('déroulé sans erreur', false, e.stack || e);
    await ENV_E2E.capture(p, 'listes-ubipharm-erreur').catch(() => {});
  } finally {
    q('DELETE FROM extranet_liste_ligne WHERE collecte_id >= ' + premiereCollecte + '; DELETE FROM extranet_collecte WHERE id >= ' + premiereCollecte);
    const apres = compterExtranet();
    ok('nettoyage : tables extranet revenues à leur état de départ', JSON.stringify(avant) === JSON.stringify(apres), JSON.stringify(apres));
    await p.evaluate(() => fetch('../api/v1/extranet/sessions/UBIPHARM', { method: 'DELETE' })).catch(() => {});
    await navigateur.close();
    await srv.arreter();
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
    process.exit(ko ? 1 : 0);
  }
})();
