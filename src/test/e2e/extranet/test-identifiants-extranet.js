/* EXTRANETS GROSSISTES : identifiant et mot de passe saisis dans l'onglet Sessions (decision du 07/11), par le vrai
 * chemin de l'ecran, contre le FAUX extranet local (faux-extranet.js) : jamais le vrai.
 *
 * Parcours : menu GESTION DES COMMANDES > Extranets grossistes > Sessions ; saisie d'un mauvais mot de passe,
 * « Se connecter » refuse, pas de nouvel essai avec les memes identifiants ; correction du seul mot de passe ;
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
async function onglet(p, titre) {
  await vues.cliquer(p, ECRAN + ' #exOnglets tab[text=' + titre + ']');
  await p.waitForTimeout(400);
}
async function cliquerEtAttendre(p, requete, morceauUrl) {
  const r = p.waitForResponse((x) => x.url().indexOf(morceauUrl) >= 0, { timeout: 180000 });
  await vues.cliquer(p, requete);
  const rep = await r;
  await p.waitForTimeout(800);
  return rep.json().catch(() => ({}));
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
    const r1 = await cliquerEtAttendre(p, ECRAN + ' #exCompteEnregistrerUBIPHARM', '/comptes/UBIPHARM');
    ok('enregistrement : réponse sans mot de passe', r1.success === true && JSON.stringify(r1).indexOf(MAUVAIS) < 0, JSON.stringify(r1));
    let c = compte();
    ok('base : une ligne, identifiant = saisie, auteur = utilisateur', c.length === 1 && c[0][0] === srv.IDENTIFIANT && c[0][2] === ENV_E2E.LOGIN, JSON.stringify(c.map((l) => [l[0], l[2]])));
    ok('base : mot de passe chiffré (v1:), jamais en clair', c[0][1].startsWith('v1:') && c[0][1].indexOf(MAUVAIS) < 0
      && Buffer.from(c[0][1].slice(3), 'base64').toString('latin1').indexOf(MAUVAIS) < 0);
    const chiffre1 = c[0][1];
    ok('écran : champ mot de passe vidé après enregistrement', (await valeur(p, '#exMotDePasseUBIPHARM')) === '');
    let api = await sessionsApi(p);
    ok('API : ni le mot de passe ni le chiffré', api.indexOf(MAUVAIS) < 0 && api.indexOf(chiffre1.slice(3, 20)) < 0);
    const apiCompte = JSON.parse(api).data.find((s) => s.source === 'UBIPHARM').compte;
    const etatEcran = await texte(p, '#exCompteEtatUBIPHARM');
    ok('rapprochement : identifiant écran = base = API', apiCompte.identifiant === c[0][0] && etatEcran.indexOf(c[0][0]) >= 0
      && (await valeur(p, '#exIdentifiantUBIPHARM')) === c[0][0], etatEcran);
    ok('écran : « mot de passe enregistré »', etatEcran.indexOf('mot de passe enregistré') >= 0 && apiCompte.motDePasseEnregistre === true, etatEcran);

    /* ---- connexion refusee, puis pas de nouvel essai avec les memes identifiants */
    const r2 = await cliquerEtAttendre(p, ECRAN + ' #exConnecterUBIPHARM', '/connexion');
    ok('connexion : refusée par l\'extranet', r2.success === false && r2.nature === 'CONNEXION_REFUSEE', JSON.stringify(r2));
    ok('connexion : un seul POST /Login, avec jeton, identifiant et mot de passe', srv.etat.connexions.length === 1
      && srv.etat.connexions[0].champs === '_token,login,pwd' && !srv.etat.connexions[0].reussie, JSON.stringify(srv.etat.connexions));
    ok('écran : échec affiché', (await texte(p, '#exCompteEtatUBIPHARM')).indexOf('Identifiant ou mot de passe refusé') >= 0
      && (await texte(p, '#exSessionsMsg')).indexOf('refusé') >= 0, await texte(p, '#exCompteEtatUBIPHARM'));
    const r3 = await cliquerEtAttendre(p, ECRAN + ' #exConnecterUBIPHARM', '/connexion');
    ok('connexion : mêmes identifiants refusés sans nouvel essai (compte jamais bloqué)', r3.success === false
      && srv.etat.connexions.length === 1 && /déjà refusés/.test(r3.msg), r3.msg);

    /* ---- correction du seul mot de passe (identifiant garde) */
    await taper(p, '#exMotDePasseUBIPHARM', srv.MOT_DE_PASSE);
    await cliquerEtAttendre(p, ECRAN + ' #exCompteEnregistrerUBIPHARM', '/comptes/UBIPHARM');
    c = compte();
    ok('base : identifiant inchangé, chiffré remplacé', c.length === 1 && c[0][0] === srv.IDENTIFIANT && c[0][1] !== chiffre1 && c[0][1].indexOf(srv.MOT_DE_PASSE) < 0);
    const r4 = await cliquerEtAttendre(p, ECRAN + ' #exConnecterUBIPHARM', '/connexion');
    ok('connexion : réussie après correction', r4.success === true && r4.session && r4.session.mode === 'CONNEXION', JSON.stringify(r4));
    ok('extranet : deux POST /Login au total, le second réussi', srv.etat.connexions.length === 2 && srv.etat.connexions[1].reussie);
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
    ok('expiration : un seul POST de plus', srv.etat.connexions.length === 3 && srv.etat.connexions[2].reussie);
    const source = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../resources/extranet/ubipharm/fiche/reconstitue-FAIR248.json'), 'utf8'));
    const libelle = (source.produit || source).pslib;
    ok('rapprochement : fiche écran = source', libelle && (await texte(p, '#exFicheEntete')).indexOf(libelle) >= 0, libelle);
    const journal = lignes('SELECT module, statut FROM extranet_collecte WHERE id >= ' + premiereCollecte + ' ORDER BY id').map((l) => l.join(':'));
    ok('bilan : deux collectes de fiche, toutes deux complètes', JSON.stringify(journal) === JSON.stringify(['FICHE_PRODUIT:COMPLETE', 'FICHE_PRODUIT:COMPLETE']), journal.join(', '));
    const nonGet = srv.etat.appels.filter((a) => a.methode !== 'GET').map((a) => a.methode + ' ' + a.chemin);
    ok('lecture seule : le seul envoi est POST /Login', nonGet.length === 3 && nonGet.every((x) => x === 'POST /Login'), nonGet.join(', '));

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
    q('DELETE FROM extranet_stock_agence WHERE collecte_id >= ' + premiereCollecte + '; DELETE FROM extranet_produit WHERE collecte_id >= '
      + premiereCollecte + '; DELETE FROM extranet_collecte WHERE id >= ' + premiereCollecte);
    await p.evaluate(() => fetch('../api/v1/extranet/sessions/UBIPHARM', { method: 'DELETE' })).catch(() => {});
    ok('nettoyage : identifiants et collectes du test retirés', compte().length === 0
      && Number(q('SELECT COUNT(*) FROM extranet_collecte WHERE id >= ' + premiereCollecte)) === 0);
    if (journalServeur && fs.existsSync(journalServeur)) {
      const fd = fs.openSync(journalServeur, 'r');
      const n = Math.max(0, fs.statSync(journalServeur).size - tailleJournal);
      const b = Buffer.alloc(n);
      fs.readSync(fd, b, 0, n, tailleJournal);
      fs.closeSync(fd);
      const t = b.toString('utf8');
      ok('journal du serveur : ni mot de passe, ni identifiant, ni cookie', [MAUVAIS, srv.MOT_DE_PASSE, srv.IDENTIFIANT, 'essai-e2e-local', 'essai-e2e-2', 'jeton-e2e']
        .every((s) => t.indexOf(s) < 0) && t.indexOf('connexion /Login') >= 0, n + ' octets lus');
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
