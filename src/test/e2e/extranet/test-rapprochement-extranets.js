/* EXTRANETS GROSSISTES (plan du 07/11) : test d'ecran de rapprochement et de bilan, par le vrai chemin de l'ecran.
 *
 * Parcours : connexion, menu GESTION DES COMMANDES > Extranets grossistes, session saisie dans l'onglet Sessions,
 * puis « Lire sur l'extranet » dans chaque onglet, contre un FAUX extranet local (faux-extranet.js) : jamais le vrai.
 *
 * Rapprochement : chaque donnee est comparee entre la source (faux extranet), la base (tables extranet_*) et l'ecran.
 * Bilan avant / apres : une collecte n'ecrit que dans les tables extranet_* (une ligne de collecte par operation, rien
 * dans les tables metier) ; une session expiree laisse le cache precedent. Les donnees du test sont retirees a la fin.
 *
 * Lancement (domain3, base laborex_audit, Payara demarre avec -DEXTRANET_UBIPHARM_URL=http://127.0.0.1:18765) :
 *   BASE=http://localhost:10090/prestige DB_TEST=laborex_audit E2E_BASE_LIBRE=1 node test-rapprochement-extranets.js
 */
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const faux = require('./faux-extranet');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright-core');

const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s],
  { encoding: 'utf8' }).replace(/\r/g, '').trim();
const lignes = (s) => { const t = q(s); return t ? t.split('\n').map((l) => l.split('\t')) : []; };

const res = [];
function ok(n, c, d) {
  res.push({ n, c: !!c });
  console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : ''));
}

const TABLES = ['extranet_collecte', 'extranet_produit', 'extranet_stock_agence', 'extranet_reappro', 'extranet_reappro_agence',
  'extranet_reclamation', 'extranet_reclamation_ligne', 'extranet_document', 'extranet_nouveau_produit', 'extranet_nouveau_produit_agence'];
/* tables metier qui ne doivent jamais bouger */
const METIER = ['t_famille', 't_famille_grossiste', 't_famille_stock', 't_order', 't_order_detail', 't_suggestion_order',
  't_bon_livraison', 't_retour_fournisseur', 't_grossiste'];
const compter = (l) => Object.fromEntries(l.map((t) => [t, Number(q('SELECT COUNT(*) FROM ' + t))]));
const empreinteMetier = () => Object.fromEntries(METIER.map((t) => [t, q('CHECKSUM TABLE ' + t).split('\t')[1]]));

const ECRAN = 'extranetsgrossistes';
const magasin = (p, nom) => p.evaluate((n) => Ext.ComponentQuery.query('extranetsgrossistes')[0][n].getRange().map((r) => r.data), nom);
const texte = (p, sel) => p.evaluate((s) => { const c = Ext.ComponentQuery.query('extranetsgrossistes ' + s)[0]; return c && c.el ? c.el.dom.textContent : ''; }, sel);
/* onglets ranges par grossiste puis par rubrique : on clique chaque niveau, comme l'utilisateur */
const CHEMINS = { 'Fiche produit': ['Ubipharm', 'Produits'], 'Réapprovisionnements': ['Ubipharm', 'Produits'],
  'Nouveaux produits': ['Ubipharm', 'Produits'], 'Réclamations': ['Ubipharm'] };
async function onglet(p, titre) {
  for (const t of (CHEMINS[titre] || []).concat([titre])) {
    await vues.cliquer(p, ECRAN + ' #exOnglets tab[text=' + t + ']');
    await p.waitForTimeout(300);
  }
  await p.waitForTimeout(400);
}
/* clic sur un bouton, en attendant la reponse de l'appel qu'il declenche */
async function cliquerEtAttendre(p, requete, morceauUrl) {
  const r = p.waitForResponse((x) => x.url().indexOf(morceauUrl) >= 0, { timeout: 180000 });
  await vues.cliquer(p, requete);
  /* retour 10 du 08/11 : donnees deja lues -> confirmation dans le bouton (« Déjà lu le … : relire ? ») : second clic */
  await p.waitForTimeout(400);
  if (await p.evaluate((sel) => { const c = Ext.ComponentQuery.query(sel)[0]; return !!c && !!c.getText && /relire \?/.test(c.getText()); }, requete)) {
    await vues.cliquer(p, requete);
  }
  const rep = await r;
  await p.waitForTimeout(600);
  return rep.json().catch(() => ({}));
}

/* Garde (incident du 08/11) : avec des comptes reels en base, l'ecran s'y connecte seul ; le test n'est accepte que si
 * toutes les sources visent 127.0.0.1 (garde-extranets.js). Ce test n'efface aucun compte (seulement la session collee). */
const garde = require('./garde-extranets');
garde.verifier(q, ENV_E2E.BASE, ENV_E2E.PAYARA_DOMAINE);
/* compte Ubipharm reel en base : l'ecran s'y reconnecte seul ; sa page de connexion (vrai site) est refusee avant envoi */
const compteReel = q("SELECT COUNT(*) FROM extranet_compte WHERE source = 'UBIPHARM'") !== '0';

(async () => {
  const srv = await faux.demarrer(18765);
  const navigateur = await ENV_E2E.lancer(chromium);
  const p = await (await navigateur.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
  const premiereCollecte = Number(q('SELECT IFNULL(MAX(id), 0) + 1 FROM extranet_collecte'));
  const avant = compter(TABLES);
  const metierAvant = empreinteMetier();
  const debut = q("SELECT DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s')");
  const journalTotal = q('SELECT COUNT(*) FROM t_event_log');
  /* donnees d'extranet deja gardees (lues sur les vrais sites) : copiees avant, remises a l'identique apres */
  const caches = garde.sauver(q, TABLES);
  let fichierPdf = null;
  try {
    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await vues.ouvrirMenu(p, 'GESTION DES COMMANDES', 'Extranets grossistes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('extranetsgrossistes')[0], null, { timeout: 60000 });
    await p.mouse.move(1200, 600);
    await p.waitForTimeout(1500);
    await onglet(p, 'Sessions');

    /* ---- session : saisie par l'administrateur, jamais reaffichee */
    /* compte reel en base : la reconnexion automatique vers le vrai site est refusee avant envoi, l'etat le dit */
    ok('session : « Non connecté » au départ' + (compteReel ? ' (reconnexion vers un autre site refusée)' : ''), compteReel
      ? /Non connecté : La connexion envoie vers un autre site/.test(await texte(p, '#exEtatUBIPHARM'))
      : (await texte(p, '#exEtatUBIPHARM')).indexOf('État : Non connecté') >= 0, await texte(p, '#exEtatUBIPHARM'));
    await vues.saisir(p, ECRAN + ' #exCookieUBIPHARM', srv.COOKIE);
    await cliquerEtAttendre(p, ECRAN + ' #exSaisieUBIPHARM button[text=Enregistrer]', '/sessions/UBIPHARM');
    await p.waitForTimeout(800);
    ok('session : « Connecté (cookie collé) »', (await texte(p, '#exEtatUBIPHARM')).indexOf('✓ Connecté (cookie collé)') >= 0, await texte(p, '#exEtatUBIPHARM'));
    const etatApi = await p.evaluate(() => fetch('../api/v1/extranet/sessions').then((r) => r.text()));
    ok('session : la valeur n\'est jamais renvoyée par l\'API', etatApi.indexOf('essai-e2e-local') < 0 && etatApi.indexOf('SESSIONID') < 0);
    ok('session : champ vidé après enregistrement', (await p.evaluate(() => Ext.ComponentQuery.query('#exCookieUBIPHARM')[0].getValue())) === '');

    /* ---- fiche produit FAIR248 : source = base = ecran */
    await onglet(p, 'Fiche produit');
    await vues.saisir(p, ECRAN + ' #exPscode', 'FAIR248');
    const rf = await cliquerEtAttendre(p, ECRAN + ' #exFicheCollecter', '/produits/FAIR248/collecte');
    ok('fiche : collecte réussie', rf.success === true, JSON.stringify(rf).slice(0, 200));
    const source = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../resources/extranet/ubipharm/fiche/reconstitue-FAIR248.json'), 'utf8')).produit;
    const b = lignes("SELECT pslib, pslibc, picode, pspven, psppub, tvtaux, psstk_soc FROM extranet_produit WHERE pscode = 'FAIR248'")[0] || [];
    ok('fiche : base = source (désignation, code, prix, TVA, stock société)', b[0] === source.pslib && b[1] === source.pslibc
      && b[2] === source.picode && Number(b[3]) === source.pspven && Number(b[4]) === source.psppub && Number(b[5]) === source.tvtaux
      && Number(b[6]) === source.psstkSoc, b.join('|'));
    const entete = await texte(p, '#exFicheEntete');
    ok('fiche : écran = source', entete.indexOf(source.pslib) >= 0 && entete.indexOf('6431') >= 0 && entete.indexOf('9110') >= 0
      && entete.indexOf('3000001262862') >= 0, entete.slice(0, 200));
    /* base des prix : CFA, HT pour la parapharmacie (TVA > 0), TTC pour les medicaments (exoneres) */
    ok('fiche : prix FAIR248 (TVA 18) présentés en CFA HT, parapharmacie', entete.indexOf('CFA HT, parapharmacie') >= 0, entete.slice(0, 300));
    const bases = await p.evaluate(() => { const e = Ext.ComponentQuery.query('extranetsgrossistes')[0];
      return [18, 5.5, '18', 0, '0', null, undefined, '', 'abc'].map((x) => e.basePrix(x)); });
    ok('fiche : base des prix selon la TVA (18, 5,5 → HT ; 0 → TTC ; inconnue → non attribuée)', JSON.stringify(bases) === JSON.stringify([
      'CFA HT, parapharmacie', 'CFA HT, parapharmacie', 'CFA HT, parapharmacie', 'CFA TTC, médicament', 'CFA TTC, médicament',
      'CFA, HT ou TTC selon la catégorie : TVA inconnue', 'CFA, HT ou TTC selon la catégorie : TVA inconnue',
      'CFA, HT ou TTC selon la catégorie : TVA inconnue', 'CFA, HT ou TTC selon la catégorie : TVA inconnue']), JSON.stringify(bases));
    const agEcran = (await magasin(p, 'agencesFiche')).map((a) => a.etcode + ':' + (a.psstk === null ? 'inconnu' : a.psstk) + ':' + (a.colisages || []).join(','));
    const agBase = lignes("SELECT etcode, IFNULL(psstk, 'inconnu'), IFNULL(colisages, '') FROM extranet_stock_agence WHERE pscode = 'FAIR248' ORDER BY rang")
      .map((l) => l[0] + ':' + l[1] + ':' + l[2].replace(/[\[\] ]/g, ''));
    const agSource = source.infosParEtablissement.map((a) => a.etcode + ':' + a.psstk + ':' + (a.colisages || []).join(','));
    ok('fiche : stocks par agence, ligne par ligne, source = base = écran', JSON.stringify(agSource) === JSON.stringify(agBase)
      && JSON.stringify(agSource) === JSON.stringify(agEcran), JSON.stringify([agSource, agBase, agEcran]));

    /* ---- reapprovisionnements : 261 lignes, 3 pages de 100 (08/11) */
    const appelsAvant = srv.etat.appels.length;
    await onglet(p, 'Réapprovisionnements');
    const rr = await cliquerEtAttendre(p, ECRAN + ' #exReapproCollecter', '/reappro/collecte');
    ok('réappro : collecte complète, 261 annoncées = 261 reçues', rr.success && rr.collecte && rr.collecte.statut === 'COMPLETE'
      && rr.collecte.lignesAnnoncees === 261 && rr.collecte.lignesRecues === 261, JSON.stringify(rr.collecte));
    const pages = srv.etat.appels.slice(appelsAvant).filter((a) => a.chemin === '/ReturnProduitsReapproJSON').map((a) => new URLSearchParams(a.requete).get('start'));
    ok('réappro : 3 pages lues (start 0, 100, 200)', pages.join(',') === '0,100,200', pages.join(','));
    const baseR = lignes('SELECT pscode, designation, IFNULL(code, \'\'), code_agence, statut, date_affichee FROM extranet_reappro WHERE collecte_id = '
      + rr.collecte.id + ' ORDER BY position');
    const srcR = srv.etat.reappro.map((x) => [x.pscode, x.designation.replace('&amp;', '&'), x.cip, x.agence, x.statut, x.date]);
    ok('réappro : base = source, 61 lignes dans l\'ordre (même produit sur deux agences gardé)', JSON.stringify(baseR) === JSON.stringify(srcR),
      baseR.length + ' / ' + JSON.stringify(baseR.find((l, i) => JSON.stringify(l) !== JSON.stringify(srcR[i]))));
    await p.waitForFunction(() => !Ext.ComponentQuery.query('extranetsgrossistes')[0].reappro.isLoading());
    const ecranR = (await magasin(p, 'reappro')).map((x) => [x.pscode, x.designation, x.code || '', x.codeAgence, x.statut, x.dateAffichee]);
    ok('réappro : écran (page 1, 50 lignes) = base', ecranR.length === 50 && JSON.stringify(ecranR) === JSON.stringify(baseR.slice(0, 50)), ecranR.length);
    const dispoBase = lignes('SELECT IFNULL(dispo, \'NULL\'), IFNULL(colisage_texte, \'NULL\') FROM extranet_reappro_agence WHERE collecte_id = '
      + rr.collecte.id + ' ORDER BY position, rang');
    const dispoSrc = srv.etat.reappro.map((x) => [x.dispo, x.colisage[1]]);
    ok('réappro : disponibilité et colisages par agence = source, ligne par ligne (N/A gardé tel quel)',
      JSON.stringify(dispoBase) === JSON.stringify(dispoSrc), JSON.stringify(dispoBase.find((l, i) => JSON.stringify(l) !== JSON.stringify(dispoSrc[i]))));
    ok('réappro : aucune disponibilité inconnue changée en 0', dispoBase.every((l) => l[0] !== '0'));
    ok('réappro : date de collecte affichée', (await texte(p, '#exReapproDate')).indexOf('collectées le') >= 0, await texte(p, '#exReapproDate'));

    /* ---- reclamations : liste, detail, PDF */
    await onglet(p, 'Réclamations');
    const rl = await cliquerEtAttendre(p, ECRAN + ' #exReclamationsCollecter', '/reclamations/collecte');
    ok('réclamations : collecte de la liste réussie', rl.success === true, JSON.stringify(rl).slice(0, 200));
    await p.waitForFunction(() => !Ext.ComponentQuery.query('extranetsgrossistes')[0].reclamations.isLoading());
    const refsSrc = ['EXT1408456VRI', 'YOP1410730GNA', 'VRI1399001EXT', 'EXT1400002ABJ', 'EXT1400003SP'];
    const refsBase = lignes("SELECT reference, rec_id, eta, appl FROM extranet_reclamation WHERE nature = 'LISTE' AND filtre = 'ALL' ORDER BY rang");
    const refsEcran = (await magasin(p, 'reclamations')).map((r) => [r.reference, r.id, r.eta, r.appl]);
    ok('réclamations : références source = base = écran', JSON.stringify(refsBase.map((l) => l[0])) === JSON.stringify(refsSrc)
      && JSON.stringify(refsEcran) === JSON.stringify(refsBase), JSON.stringify(refsEcran));
    ok('réclamations : id, eta, appl tirés du lien (appl YOP gardé)', refsBase[1] && refsBase[1][1] === '1410730' && refsBase[1][2] === 'GNA' && refsBase[1][3] === 'YOP',
      JSON.stringify(refsBase[1]));
    /* premiere ligne choisie au clic, puis detail lu */
    const ligne1 = await p.evaluate(() => { const g = Ext.ComponentQuery.query('#exGrilleReclamations')[0]; return g.getView().getNode(0).id; });
    await p.click('#' + ligne1);
    await p.waitForTimeout(800);
    const rd = await cliquerEtAttendre(p, ECRAN + ' #exDetailCollecter', '/reclamations/detail/collecte');
    ok('réclamation : détail lu', rd.success === true, JSON.stringify(rd).slice(0, 200));
    const detBase = lignes("SELECT l.pscode, l.cip, l.quantite, l.prix, l.motif FROM extranet_reclamation_ligne l JOIN extranet_reclamation r"
      + " ON r.id = l.reclamation_id WHERE r.nature = 'DETAIL' AND r.rec_id = '1408456' ORDER BY l.position");
    const detEcran = (await magasin(p, 'lignesReclamation')).map((l) => [l.pscode, l.cip, String(l.quantite), l.motif]);
    ok('réclamation : ligne RABE102 = source (CIP 3000000218945, quantité 1, 2 736 CFA → 2736, motif)', detBase[0] && detBase[0][0] === 'RABE102'
      && detBase[0][1] === '3000000218945' && detBase[0][2] === '1' && Number(detBase[0][3]) === 2736 && detBase[0][4] === 'PEREMPTION PROCHE.', JSON.stringify(detBase[0]));
    ok('réclamation : écran = base, ligne par ligne', JSON.stringify(detEcran) === JSON.stringify(detBase.map((l) => [l[0], l[1], l[2], l[4]])),
      JSON.stringify(detEcran));
    const rp = await cliquerEtAttendre(p, ECRAN + ' #exPdfCollecter', '/reclamations/pdf/collecte');
    const doc = lignes("SELECT sha256, taille, fichier FROM extranet_document WHERE type_document = 'RECLAMATION' ORDER BY id DESC LIMIT 1")[0] || [];
    fichierPdf = doc[2] ? path.join(ENV_E2E.STOCKAGE, doc[2]) : null;
    ok('PDF : téléchargé, SHA-256 et taille = source', rp.success && doc[0] === srv.sha256Pdf && Number(doc[1]) === srv.PDF.length, doc.join('|'));
    const pdfServi = await p.evaluate(() => fetch('../api/v1/extranet/ubipharm/reclamations/pdf?id=1408456&eta=VRI&appl=EXT')
      .then((r) => r.arrayBuffer()).then((a) => String.fromCharCode.apply(null, new Uint8Array(a).slice(0, 5))));
    ok('PDF : servi par Prestige, signature %PDF-', pdfServi === '%PDF-', pdfServi);

    /* ---- nouveaux produits + rapprochement (proposition seulement) */
    await onglet(p, 'Nouveaux produits');
    const rn = await cliquerEtAttendre(p, ECRAN + ' #exNouveauxCollecter', '/nouveaux/collecte');
    ok('nouveaux : collecte réussie', rn.success === true, JSON.stringify(rn).slice(0, 200));
    await p.waitForFunction(() => !Ext.ComponentQuery.query('extranetsgrossistes')[0].nouveaux.isLoading());
    const nvBase = lignes("SELECT IFNULL(pscode, 'NULL'), IFNULL(cip, 'NULL') FROM extranet_nouveau_produit ORDER BY position");
    const nvEcran = (await magasin(p, 'nouveaux')).map((x) => [x.pscode === null ? 'NULL' : x.pscode, x.cip === null ? 'NULL' : x.cip]);
    ok('nouveaux : produits de la page (scripts ignorés) = base = écran', JSON.stringify(nvBase) === JSON.stringify(nvEcran)
      && nvBase.map((l) => l[0]).join(',').indexOf('SCRIPT') < 0 && nvBase.some((l) => l[0] === 'FAIR248'), JSON.stringify(nvEcran));
    await cliquerEtAttendre(p, ECRAN + ' #exRapprocher', '/nouveaux/rapprochement');
    const rap = (await magasin(p, 'nouveaux')).map((x) => x.prestige && x.prestige.statut);
    ok('rapprochement : un statut par produit', rap.every((s) => ['PSCODE', 'CIP', 'PLUSIEURS', 'INTROUVABLE'].indexOf(s) >= 0), rap.join(','));

    /* ---- session expiree : page de connexion en 200, cache precedent garde */
    const nvAvant = q('SELECT COUNT(*) FROM extranet_nouveau_produit');
    srv.etat.mode = 'expire';
    const re = await cliquerEtAttendre(p, ECRAN + ' #exNouveauxCollecter', '/nouveaux/collecte');
    ok('expiration : reconnue (page de connexion en 200)' + (compteReel ? ', compte réel : reconnexion vers un autre site refusée' : ''),
      re.success === false && (compteReel ? re.nature === 'CONNEXION_REFUSEE' && /autre site/.test(re.msg) : re.nature === 'SESSION_EXPIREE'),
      JSON.stringify(re).slice(0, 200));
    ok('expiration : message dans l\'onglet', (await texte(p, '#exNouveauxMsg')).indexOf(compteReel ? 'refusé' : 'Sessions') >= 0, await texte(p, '#exNouveauxMsg'));
    ok('expiration : cache précédent gardé', q('SELECT COUNT(*) FROM extranet_nouveau_produit') === nvAvant);
    await onglet(p, 'Sessions');
    await p.waitForTimeout(800);
    ok('expiration : « ' + (compteReel ? 'reconnexion refusée' : 'Session expirée') + ' »', (await texte(p, '#exEtatUBIPHARM'))
      .indexOf(compteReel ? 'autre site' : 'Session expirée') >= 0, await texte(p, '#exEtatUBIPHARM'));
    srv.etat.mode = 'normal';

    /* ---- journal et bilan avant / apres */
    const journal = lignes('SELECT module, statut FROM extranet_collecte WHERE id >= ' + premiereCollecte + ' ORDER BY id').map((l) => l.join(':'));
    ok('bilan : une collecte par opération, statuts attendus', JSON.stringify(journal) === JSON.stringify(['FICHE_PRODUIT:COMPLETE', 'REAPPRO:COMPLETE',
      'RECLAMATIONS:COMPLETE', 'RECLAMATION_DETAIL:COMPLETE', 'RECLAMATION_PDF:COMPLETE', 'NOUVEAUX_PRODUITS:COMPLETE', 'NOUVEAUX_PRODUITS:ECHEC']),
    journal.join(', '));
    const metierApres = empreinteMetier();
    ok('bilan : aucune table métier modifiée', JSON.stringify(metierAvant) === JSON.stringify(metierApres));
    ok('lecture seule : uniquement des GET vers l\'extranet', srv.etat.appels.every((a) => a.methode === 'GET'));
    ok('collectes : journal affiché à l\'écran', await (async () => { await onglet(p, 'Collectes');
      await p.waitForFunction(() => !Ext.ComponentQuery.query('extranetsgrossistes')[0].collectes.isLoading());
      return (await magasin(p, 'collectes')).filter((c) => c.id >= premiereCollecte).length === 7; })());

    /* ---- effacement de la session : confirmation dans le bouton (deux clics) */
    await onglet(p, 'Sessions');
    await vues.saisir(p, ECRAN + ' #exCookieUBIPHARM', srv.COOKIE);
    await cliquerEtAttendre(p, ECRAN + ' #exSaisieUBIPHARM button[text=Enregistrer]', '/sessions/UBIPHARM');
    await vues.cliquer(p, ECRAN + ' #exEffacerUBIPHARM');
    ok('effacement : le premier clic demande confirmation dans le bouton', (await texte(p, '#exEffacerUBIPHARM')).indexOf('Confirmer') >= 0);
    await p.waitForTimeout(600);
    await cliquerEtAttendre(p, ECRAN + ' #exEffacerUBIPHARM', '/sessions/UBIPHARM');
    await p.waitForTimeout(800);
    ok('effacement : « Non connecté »', (await texte(p, '#exEtatUBIPHARM')).indexOf('État : Non connecté') >= 0, await texte(p, '#exEtatUBIPHARM'));
  } catch (e) {
    ok('déroulé sans erreur', false, e.stack || e);
    await ENV_E2E.capture(p, 'extranets-erreur').catch(() => {});
  } finally {
    /* retrait des donnees du test */
    q('DELETE FROM extranet_stock_agence WHERE collecte_id >= ' + premiereCollecte + '; DELETE FROM extranet_produit WHERE collecte_id >= ' + premiereCollecte
      + '; DELETE FROM extranet_reappro_agence WHERE collecte_id >= ' + premiereCollecte + '; DELETE FROM extranet_reappro WHERE collecte_id >= ' + premiereCollecte
      + '; DELETE FROM extranet_reclamation_ligne WHERE reclamation_id IN (SELECT id FROM extranet_reclamation WHERE collecte_id >= ' + premiereCollecte
      + '); DELETE FROM extranet_reclamation WHERE collecte_id >= ' + premiereCollecte + '; DELETE FROM extranet_document WHERE collecte_id >= ' + premiereCollecte
      + '; DELETE FROM extranet_nouveau_produit WHERE collecte_id >= ' + premiereCollecte + '; DELETE FROM extranet_collecte WHERE id >= ' + premiereCollecte);
    if (fichierPdf && fs.existsSync(fichierPdf)) { fs.unlinkSync(fichierPdf); }
    ok('nettoyage : fichier PDF du test retiré du disque', !fichierPdf || !fs.existsSync(fichierPdf), fichierPdf);
    const ecartsCaches = garde.restaurer(q, TABLES, caches);
    ok('nettoyage : données d’extranet gardées remises à l’identique (CHECKSUM)', ecartsCaches.length === 0, JSON.stringify(ecartsCaches));
    const apres = compter(TABLES);
    ok('nettoyage : tables extranet revenues à leur état de départ', JSON.stringify(avant) === JSON.stringify(apres), JSON.stringify(apres));
    /* connexion de l'utilisateur d'essai : trace du test, retiree */
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
