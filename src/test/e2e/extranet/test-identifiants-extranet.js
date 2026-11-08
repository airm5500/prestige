/* EXTRANETS GROSSISTES : identifiant et mot de passe saisis dans l'onglet Sessions (decision du 07/11), par le vrai
 * chemin de l'ecran, contre le FAUX extranet local (faux-extranet.js) : jamais le vrai.
 *
 * Parcours : menu GESTION DES COMMANDES > Extranets grossistes > Sessions ; saisie d'un mauvais mot de passe,
 * « Enregistrer » connecte aussitot (refus marque dans le bouton), « Se connecter » : pas de nouvel essai avec les memes identifiants ; correction du seul mot de passe ;
 * connexion reussie ; lecture d'une fiche ; session expiree cote extranet : reconnexion seule et meme lecture ;
 * effacement confirme dans le bouton.
 *
 * Rapprochement : identifiant ecran = base = API ; etat de connexion ecran = API ; fiche lue = source.
 * Coherence : mot de passe jamais en clair (base, API, ecran apres enregistrement, journal du serveur).
 * Bilan avant / apres : une ligne extranet_compte, les collectes attendues, aucune table metier touchee ; tout est
 * retire a la fin.
 *
 * Lancement (domain3, base laborex_audit, Payara demarre avec -DEXTRANET_UBIPHARM_URL=http://127.0.0.1:18765) :
 *   BASE=http://localhost:10090/prestige DB_TEST=laborex_audit E2E_BASE_LIBRE=1 PAYARA_DOMAINE=... node test-identifiants-extranet.js
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

const METIER = ['t_famille', 't_famille_grossiste', 't_famille_stock', 't_order', 't_order_detail', 't_suggestion_order',
  't_bon_livraison', 't_retour_fournisseur', 't_grossiste', 't_parameters'];
const empreinteMetier = () => Object.fromEntries(METIER.map((t) => [t, q('CHECKSUM TABLE ' + t).split('\t')[1]]));
const MAUVAIS = 'mauvais-mdp-e2e';

const ECRAN = 'extranetsgrossistes';
const texte = (p, sel) => p.evaluate((s) => { const c = Ext.ComponentQuery.query('extranetsgrossistes ' + s)[0]; return c && c.el ? c.el.dom.textContent : ''; }, sel);
const valeur = (p, sel) => p.evaluate((s) => Ext.ComponentQuery.query('extranetsgrossistes ' + s)[0].getValue(), sel);
const desactive = (p, sel) => p.evaluate((s) => Ext.ComponentQuery.query('extranetsgrossistes ' + s)[0].isDisabled(), sel);
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
async function cliquerEtAttendre(p, requete, morceauUrl) {
  const r = p.waitForResponse((x) => x.url().indexOf(morceauUrl) >= 0, { timeout: 180000 });
  await vues.cliquer(p, requete);
  const rep = await r;
  await p.waitForTimeout(800);
  return rep.json().catch(() => ({}));
}
/* « Enregistrer » : PUT des identifiants puis, s'ils sont acceptes, connexion aussitot (demande du 08/11) */
async function enregistrer(p, connexionAttendue) {
  const put = p.waitForResponse((x) => x.request().method() === 'PUT' && /\/comptes\/UBIPHARM$/.test(x.url()), { timeout: 180000 });
  const cnx = connexionAttendue ? p.waitForResponse((x) => /\/comptes\/UBIPHARM\/connexion$/.test(x.url()), { timeout: 180000 }) : null;
  await vues.cliquer(p, ECRAN + ' #exCompteEnregistrerUBIPHARM');
  const enr = await (await put).json().catch(() => ({}));
  const c = cnx ? await (await cnx).json().catch(() => ({})) : null;
  await p.waitForTimeout(1200);
  return { enr, cnx: c, bouton: await texte(p, '#exCompteEnregistrerUBIPHARM') };
}
/* frappe au clavier dans le champ, valeur verifiee ensuite */
async function taper(p, sel, t) {
  const id = await p.evaluate((s) => Ext.ComponentQuery.query('extranetsgrossistes ' + s)[0].inputEl.dom.id, sel);
  await p.click('#' + id);
  await p.keyboard.press('Control+A');
  await p.keyboard.press('Delete');
  await p.waitForTimeout(300);
  await p.keyboard.type(t, { delay: 25 });
  await p.keyboard.press('Tab');
  return valeur(p, sel);
}
const compte = () => lignes("SELECT identifiant, mot_de_passe_chiffre, modifie_par FROM extranet_compte WHERE source = 'UBIPHARM'");
const sessionsApi = (p) => p.evaluate(() => fetch('../api/v1/extranet/sessions').then((r) => r.text()));

(async () => {
  const srv = await faux.demarrer(18765);
  const navigateur = await ENV_E2E.lancer(chromium);
  const p = await (await navigateur.newContext()).newPage();
  const erreursJs = [];
  p.on('pageerror', (e) => erreursJs.push(String(e)));
  const premiereCollecte = Number(q('SELECT IFNULL(MAX(id), 0) + 1 FROM extranet_collecte'));
  const metierAvant = empreinteMetier();
  const journalServeur = process.env.PAYARA_DOMAINE ? path.join(process.env.PAYARA_DOMAINE, 'logs', 'server.log') : null;
  const tailleJournal = journalServeur && fs.existsSync(journalServeur) ? fs.statSync(journalServeur).size : 0;
  const cleAvant = q('SELECT COUNT(*) FROM extranet_cle');
  const FICHIER_CLE = 'D:/prestige/cles/extranet.cle';
  try {
    ok('départ : aucun identifiant UBIPHARM en base', compte().length === 0, JSON.stringify(compte()));
    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await vues.ouvrirMenu(p, 'GESTION DES COMMANDES', 'Extranets grossistes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('extranetsgrossistes')[0], null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    await onglet(p, 'Sessions');
    await p.waitForTimeout(800);
    ok('écran : « Aucun identifiant enregistré »', (await texte(p, '#exCompteEtatUBIPHARM')).indexOf('Aucun identifiant') >= 0, await texte(p, '#exCompteEtatUBIPHARM'));
    ok('écran : « Se connecter » et « Effacer » inactifs sans identifiants', await desactive(p, '#exConnecterUBIPHARM') && await desactive(p, '#exCompteEffacerUBIPHARM'));

    /* ---- saisie avec un mauvais mot de passe */
    ok('saisie : identifiant tapé', (await taper(p, '#exIdentifiantUBIPHARM', srv.IDENTIFIANT)) === srv.IDENTIFIANT);
    ok('saisie : mot de passe tapé (champ masqué)', (await taper(p, '#exMotDePasseUBIPHARM', MAUVAIS)) === MAUVAIS
      && (await p.evaluate(() => Ext.ComponentQuery.query('#exMotDePasseUBIPHARM')[0].inputEl.dom.type)) === 'password');
    const e1 = await enregistrer(p, true);
    const r1 = e1.enr;
    ok('enregistrer : connexion aussitôt, refusée par l\'extranet, « Non connecté » dans le bouton', e1.cnx && e1.cnx.success === false
      && e1.cnx.nature === 'CONNEXION_REFUSEE' && e1.bouton.indexOf('Non connecté') >= 0, e1.bouton + ' ' + JSON.stringify(e1.cnx));
    ok('connexion : un seul POST /Login, avec jeton, identifiant et mot de passe', srv.etat.connexions.length === 1
      && srv.etat.connexions[0].champs === '_token,login,pwd' && !srv.etat.connexions[0].reussie, JSON.stringify(srv.etat.connexions));
    ok('écran : échec affiché', (await texte(p, '#exCompteEtatUBIPHARM')).indexOf('Identifiant ou mot de passe refusé') >= 0
      && (await texte(p, '#exSessionsMsg')).indexOf('connexion impossible') >= 0, await texte(p, '#exSessionsMsg'));
    ok('enregistrement : réponse sans mot de passe', r1.success === true && JSON.stringify(r1).indexOf(MAUVAIS) < 0, JSON.stringify(r1));
    let c = compte();
    ok('base : une ligne, identifiant = saisie, auteur = utilisateur', c.length === 1 && c[0][0] === srv.IDENTIFIANT && c[0][2] === ENV_E2E.LOGIN, JSON.stringify(c.map((l) => [l[0], l[2]])));
    ok('base : mot de passe chiffré (v1:), jamais en clair', c[0][1].startsWith('v1:') && c[0][1].indexOf(MAUVAIS) < 0
      && Buffer.from(c[0][1].slice(3), 'base64').toString('latin1').indexOf(MAUVAIS) < 0);
    const chiffre1 = c[0][1];
    const cleBase = q('SELECT cle FROM extranet_cle WHERE id = 1');
    ok('clé : rangée en base (une ligne, 32 octets), aucun fichier sur le poste', Number(q('SELECT COUNT(*) FROM extranet_cle')) === 1
      && Buffer.from(cleBase, 'base64').length === 32 && !fs.existsSync(FICHIER_CLE));
    ok('écran : champ mot de passe vidé après enregistrement', (await valeur(p, '#exMotDePasseUBIPHARM')) === '');
    let api = await sessionsApi(p);
    ok('API : ni le mot de passe, ni le chiffré, ni la clé', api.indexOf(MAUVAIS) < 0 && api.indexOf(chiffre1.slice(3, 20)) < 0
      && api.indexOf(cleBase.slice(0, 16)) < 0);
    const apiCompte = JSON.parse(api).data.find((s) => s.source === 'UBIPHARM').compte;
    const etatEcran = await texte(p, '#exCompteEtatUBIPHARM');
    ok('rapprochement : identifiant écran = base = API', apiCompte.identifiant === c[0][0] && etatEcran.indexOf(c[0][0]) >= 0
      && (await valeur(p, '#exIdentifiantUBIPHARM')) === c[0][0], etatEcran);
    ok('écran : « mot de passe enregistré »', etatEcran.indexOf('mot de passe enregistré') >= 0 && apiCompte.motDePasseEnregistre === true, etatEcran);

    /* ---- connexion refusee, puis pas de nouvel essai avec les memes identifiants */
    const r3 = await cliquerEtAttendre(p, ECRAN + ' #exConnecterUBIPHARM', '/connexion');
    ok('connexion : mêmes identifiants refusés sans nouvel essai (compte jamais bloqué)', r3.success === false
      && srv.etat.connexions.length === 1 && /déjà refusés/.test(r3.msg), r3.msg);

    /* ---- correction du seul mot de passe (identifiant garde) */
    await taper(p, '#exMotDePasseUBIPHARM', srv.MOT_DE_PASSE);
    const e2 = await enregistrer(p, true);
    ok('enregistrer : connexion aussitôt réussie, « Connecté » dans le bouton et l\'état', e2.cnx && e2.cnx.success === true
      && e2.bouton.indexOf('✓ Connecté') >= 0 && srv.etat.connexions.length === 2 && srv.etat.connexions[1].reussie
      && (await texte(p, '#exCompteEtatUBIPHARM')).indexOf('Connecté automatiquement') >= 0
      && (await texte(p, '#exSessionsMsg')).indexOf('connecté à l\'extranet') >= 0, e2.bouton + ' ' + JSON.stringify(e2.cnx));
    c = compte();
    ok('base : identifiant inchangé, chiffré remplacé', c.length === 1 && c[0][0] === srv.IDENTIFIANT && c[0][1] !== chiffre1 && c[0][1].indexOf(srv.MOT_DE_PASSE) < 0);
    /* ---- page de connexion reglee dans l'ecran (aucun fichier) : autre site refuse, adresse complete ramenee au chemin */
    await taper(p, '#exPageUBIPHARM', 'https://ailleurs.exemple/login');
    const rp = (await enregistrer(p, false)).enr;
    ok('page de connexion : autre site refusé, base inchangée', rp.success === false && /doit être sur/.test(rp.msg)
      && q("SELECT IFNULL(page_connexion, 'NULL') FROM extranet_compte WHERE source = 'UBIPHARM'") === 'NULL', rp.msg);
    /* ---- identifiant saisi par erreur dans « Nom de la case » (cas du 08/11) : refuse, base inchangee */
    ok('écran : libellé « Nom de la case », vide par défaut, aide au survol', (await texte(p, '#exChampUBIPHARM')).indexOf('Nom de la case') >= 0
      && (await texte(p, '#exChampUBIPHARM')).indexOf('Champ identifiant') < 0
      && (await p.evaluate(() => Ext.ComponentQuery.query('extranetsgrossistes #exChampUBIPHARM')[0].labelEl.dom.getAttribute('data-qtip') || '')).indexOf('Ne saisissez pas votre identifiant') >= 0);
    await taper(p, '#exPageUBIPHARM', '');
    await taper(p, '#exChampUBIPHARM', srv.IDENTIFIANT);
    const rc = (await enregistrer(p, false)).enr;
    ok('enregistrements refusés : aucune connexion tentée', srv.etat.connexions.length === 2, srv.etat.connexions.length);
    ok('nom de la case = identifiant : refusé avec explication, base inchangée', rc.success === false && /ne doit pas contenir votre identifiant/.test(rc.msg)
      && q("SELECT IFNULL(champ_identifiant, 'NULL') FROM extranet_compte WHERE source = 'UBIPHARM'") === 'NULL'
      && (await texte(p, '#exSessionsMsg')).indexOf('laissez-la vide') >= 0, rc.msg);
    /* ---- case reglee absente du formulaire : la connexion trouve seule la case de l'identifiant */
    await taper(p, '#exPageUBIPHARM', 'http://127.0.0.1:18765/');
    await taper(p, '#exChampUBIPHARM', 'case-absente');
    const e3 = await enregistrer(p, true);
    ok('enregistrer : case absente remplacée par la détection automatique, connecté', e3.cnx && e3.cnx.success === true
      && e3.bouton.indexOf('✓ Connecté') >= 0 && srv.etat.connexions.length === 3, e3.bouton);
    const pc = lignes("SELECT page_connexion, champ_identifiant FROM extranet_compte WHERE source = 'UBIPHARM'")[0];
    const apiPage = JSON.parse(await sessionsApi(p)).data.find((s) => s.source === 'UBIPHARM').compte;
    const PAGE = 'http://127.0.0.1:18765/';
    ok('page de connexion : gardée telle que saisie, base = écran = API (case « case-absente »)', pc[0] === PAGE && pc[1] === 'case-absente'
      && apiPage.pageConnexion === PAGE && apiPage.champIdentifiant === 'case-absente' && (await valeur(p, '#exPageUBIPHARM')) === PAGE
      && (await valeur(p, '#exChampUBIPHARM')) === 'case-absente', JSON.stringify(pc));
    ok('aucun fichier extranet.properties créé', !fs.existsSync('D:/prestige/extranet.properties'));
    const r4 = await cliquerEtAttendre(p, ECRAN + ' #exConnecterUBIPHARM', '/connexion');
    ok('« Se connecter » : nouvelle connexion réussie', r4.success === true && r4.session && r4.session.mode === 'CONNEXION', JSON.stringify(r4));
    ok('extranet : quatre POST /Login au total, le dernier réussi', srv.etat.connexions.length === 4 && srv.etat.connexions[3].reussie);
    ok('écran : « Connecté automatiquement »', (await texte(p, '#exCompteEtatUBIPHARM')).indexOf('Connecté automatiquement') >= 0, await texte(p, '#exCompteEtatUBIPHARM'));
    api = await sessionsApi(p);
    ok('API : jamais la valeur du cookie ouvert par la connexion', api.indexOf('essai-e2e-local') < 0 && api.indexOf(srv.MOT_DE_PASSE) < 0);

    /* ---- fiche produit avec la session ouverte, puis session expiree cote extranet : reconnexion seule */
    await onglet(p, 'Fiche produit');
    await taper(p, '#exPscode', 'FAIR248');
    const f1 = await cliquerEtAttendre(p, ECRAN + ' #exFicheCollecter', '/collecte');
    ok('fiche : lue avec la session de la connexion automatique', f1.success === true && f1.fiche && f1.fiche.pscode === 'FAIR248', JSON.stringify(f1).slice(0, 200));
    srv.etat.cookieAttendu = 'SESSIONID=essai-e2e-2';
    srv.etat.cookieDonne = 'SESSIONID=essai-e2e-2';
    const f2 = await cliquerEtAttendre(p, ECRAN + ' #exFicheCollecter', '/collecte');
    ok('expiration : reconnexion seule et même lecture réussie', f2.success === true && f2.fiche && f2.fiche.pscode === 'FAIR248', JSON.stringify(f2).slice(0, 200));
    ok('expiration : un seul POST de plus', srv.etat.connexions.length === 5 && srv.etat.connexions[4].reussie);
    const source = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../resources/extranet/ubipharm/fiche/reconstitue-FAIR248.json'), 'utf8'));
    const libelle = (source.produit || source).pslib;
    ok('rapprochement : fiche écran = source', libelle && (await texte(p, '#exFicheEntete')).indexOf(libelle) >= 0, libelle);
    const journal = lignes('SELECT module, statut FROM extranet_collecte WHERE id >= ' + premiereCollecte + ' ORDER BY id').map((l) => l.join(':'));
    ok('bilan : deux collectes de fiche, toutes deux complètes', JSON.stringify(journal) === JSON.stringify(['FICHE_PRODUIT:COMPLETE', 'FICHE_PRODUIT:COMPLETE']), journal.join(', '));
    const nonGet = srv.etat.appels.filter((a) => a.methode !== 'GET').map((a) => a.methode + ' ' + a.chemin);
    ok('lecture seule : le seul envoi est POST /Login', nonGet.length === 5 && nonGet.every((x) => x === 'POST /Login'), nonGet.join(', '));

    /* ---- effacement des identifiants : confirmation dans le bouton */
    await onglet(p, 'Sessions');
    await vues.cliquer(p, ECRAN + ' #exCompteEffacerUBIPHARM');
    ok('effacement : le premier clic demande confirmation dans le bouton', (await texte(p, '#exCompteEffacerUBIPHARM')).indexOf('Confirmer') >= 0
      && compte().length === 1);
    await p.waitForTimeout(600);
    await cliquerEtAttendre(p, ECRAN + ' #exCompteEffacerUBIPHARM', '/comptes/UBIPHARM');
    ok('effacement : ligne retirée de la base', compte().length === 0);
    ok('effacement : écran à jour', (await texte(p, '#exCompteEtatUBIPHARM')).indexOf('Aucun identifiant') >= 0
      && (await valeur(p, '#exIdentifiantUBIPHARM')) === '' && await desactive(p, '#exConnecterUBIPHARM'), await texte(p, '#exCompteEtatUBIPHARM'));

    ok('bilan : aucune table métier modifiée', JSON.stringify(metierAvant) === JSON.stringify(empreinteMetier()));
    ok('écran : aucune erreur JavaScript', erreursJs.length === 0, erreursJs.join(' | '));
  } catch (e) {
    ok('déroulé sans erreur', false, e.stack || e);
    await ENV_E2E.capture(p, 'identifiants-extranet-erreur').catch(() => {});
  } finally {
    q("DELETE FROM extranet_compte WHERE source = 'UBIPHARM'");
    if (cleAvant === '0') { q('DELETE FROM extranet_cle'); }
    q('DELETE FROM extranet_stock_agence WHERE collecte_id >= ' + premiereCollecte + '; DELETE FROM extranet_produit WHERE collecte_id >= '
      + premiereCollecte + '; DELETE FROM extranet_collecte WHERE id >= ' + premiereCollecte);
    await p.evaluate(() => fetch('../api/v1/extranet/sessions/UBIPHARM', { method: 'DELETE' })).catch(() => {});
    ok('nettoyage : identifiants, clé créée par le test et collectes retirés', compte().length === 0
      && q('SELECT COUNT(*) FROM extranet_cle') === cleAvant
      && Number(q('SELECT COUNT(*) FROM extranet_collecte WHERE id >= ' + premiereCollecte)) === 0);
    if (journalServeur && fs.existsSync(journalServeur)) {
      const fd = fs.openSync(journalServeur, 'r');
      const n = Math.max(0, fs.statSync(journalServeur).size - tailleJournal);
      const b = Buffer.alloc(n);
      fs.readSync(fd, b, 0, n, tailleJournal);
      fs.closeSync(fd);
      const t = b.toString('utf8');
      ok('journal du serveur : ni mot de passe, ni identifiant, ni cookie', [MAUVAIS, srv.MOT_DE_PASSE, srv.IDENTIFIANT, 'essai-e2e-local', 'essai-e2e-2', 'jeton-e2e']
        .every((s) => t.indexOf(s) < 0) && t.indexOf('connexion 127.0.0.1/Login') >= 0, n + ' octets lus');
    } else {
      ok('journal du serveur : PAYARA_DOMAINE requis pour le contrôle', false, journalServeur);
    }
    await navigateur.close();
    await srv.arreter();
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
    process.exit(ko ? 1 : 0);
  }
})();
