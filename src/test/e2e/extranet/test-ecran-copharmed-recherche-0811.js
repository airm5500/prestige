/* RECHERCHE DE PRODUIT COPHARMED PAR MORCEAUX DE NOM OU DE CODE (retour du 08/11, point 1 : « aucune recherche ne passe
 * par nom de produit ou CIP, seule la DCI fonctionne »). Le moteur du site ne reconnait que des mots entiers ; Prestige
 * complete avec le catalogue Copharmed garde (morceaux de mots, ordre libre, nom, code et DCI).
 *
 * Autorise par l'utilisateur le 08/11 : domain3, base laborex_audit telle quelle, CONSULTATION seulement. Ce test fait
 * des recherches (lecture) sur Copharmed par l'ecran, n'enregistre ni n'efface aucun compte et n'ecrit rien en base.
 *
 * Vrai chemin : GESTION DES COMMANDES > Extranets grossistes > Copharmed > Produits > Recherche de produit, saisie,
 * « Rechercher » (et Entree). Saisies tirees du catalogue garde avec une graine fixe : morceau du nom + morceau du
 * dosage, code partiel, morceau de DCI, mots dans le desordre, minuscules.
 * Rapprochement : le produit vise est trouve ; ecran = API ligne par ligne ; ligne « catalogue » = ligne gardee en base
 * (nom, code, DCI, prix, disponibilite) ; message = nombres en direct / du catalogue.
 * Bilan : aucune collecte ajoutee, comptes inchanges, lignes gardees inchangees.
 *
 * Lancement : BASE=http://localhost:10090/prestige DB_TEST=laborex_audit E2E_BASE_LIBRE=1 node test-ecran-copharmed-recherche-0811.js
 */
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright-core');

const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s],
  { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }).replace(/\r/g, '').trim();
const res = [];
function ok(n, c, d) {
  res.push({ n, c: !!c });
  console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : ''));
}
const ECRAN = 'extranetsgrossistes';
let graine = 20261108;
const hasard = (n) => { graine = (graine * 1103515245 + 12345) % 2147483648; return graine % n; };

/* 09/11 : jamais un vrai extranet (sources dirigees vers 127.0.0.1, sinon arret) */
require('./garde-extranets').verifier(q, ENV_E2E.BASE, ENV_E2E.PAYARA_DOMAINE);

(async () => {
  const id = q("SELECT IFNULL(MAX(id), 0) FROM extranet_collecte WHERE module = 'LISTE_COPHARMED_CATALOGUE' AND statut = 'COMPLETE'");
  if (id === '0') { console.log('ARRET : aucun catalogue Copharmed gardé dans ' + ENV_E2E.BASE + ' : test non lancé.'); process.exit(2); }
  const lignes = q("SELECT HEX(cellules) FROM extranet_liste_ligne WHERE liste = 'COPHARMED_CATALOGUE' AND collecte_id = " + id + ' ORDER BY position')
    .split('\n').map((h) => JSON.parse(Buffer.from(h, 'hex').toString('utf8')));
  const avant = { collectes: q('SELECT COUNT(*) FROM extranet_collecte'), comptes: q('CHECKSUM TABLE extranet_compte'),
    lignes: q('CHECKSUM TABLE extranet_liste_ligne') };

  /* saisies variees tirees du catalogue (produits avec un nom d'au moins deux mots) */
  const cas = [];
  const choisis = lignes.filter((c) => /^\S{4,}\s+\S*\d/.test(c[0]) && /^\d{6,}$/.test(c[1]));
  for (let k = 0; k < 5; k++) {
    const c = choisis[hasard(choisis.length)];
    const mots = c[0].split(/\s+/), dosage = mots.find((m) => /\d/.test(m)) || mots[1];
    const variantes = [
      [mots[0].slice(0, 4).toLowerCase() + ' ' + dosage.replace(/[^\d]/g, '').slice(0, 3), 'morceau du nom + dosage sans unité'],
      [c[1].slice(0, 5), 'code partiel (5 chiffres)'],
      [dosage.toLowerCase() + ' ' + mots[0].slice(1, 5).toLowerCase(), 'mots dans le désordre, milieu de mot']];
    if (c[2] && c[2].length > 6) { variantes.push([c[2].slice(0, 6).toLowerCase() + ' ' + mots[0].slice(0, 3).toLowerCase(), 'morceau de DCI + début du nom']); }
    const [motif, genre] = variantes[k % variantes.length];
    cas.push({ motif, genre, code: c[1], nom: c[0] });
  }

  const navigateur = await ENV_E2E.lancer(chromium);
  const p = await (await navigateur.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
  const erreurs = [];
  p.on('pageerror', (e) => erreurs.push(String(e.message)));
  /* consultation : aucune lecture de liste sur l'extranet ne doit partir de ce test */
  await p.route(/\/collecte|\/lectures\//, (r) => (r.request().method() === 'GET' && /\/lectures\//.test(r.request().url()) ? r.continue() : r.abort()));
  try {
    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await vues.ouvrirMenu(p, 'GESTION DES COMMANDES', 'Extranets grossistes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('extranetsgrossistes')[0], null, { timeout: 60000 });
    await p.mouse.move(1200, 600);
    await p.waitForTimeout(1500);
    for (const t of ['Copharmed', 'Produits', 'Recherche de produit']) { await vues.cliquer(p, ECRAN + ' #exOnglets tab[text=' + t + ']'); await p.waitForTimeout(400); }

    let i = 0;
    for (const c of cas) {
      const rep = p.waitForResponse((x) => x.url().indexOf('/copharmed/recherche') >= 0, { timeout: 120000 });
      await vues.cliquer(p, ECRAN + ' #exCopharmedMotif');
      await p.keyboard.press('Control+A');
      await p.keyboard.type(c.motif, { delay: 20 });
      if (i++ % 2) { await p.keyboard.press('Enter'); } else { await vues.cliquer(p, ECRAN + ' #exCopharmedRechercher'); }
      const api = await (await rep).json();
      await p.waitForTimeout(800);
      const ecran = await p.evaluate(() => Ext.ComponentQuery.query('extranetsgrossistes #exCopharmedGrille')[0].getStore().getRange()
        .map((r) => ({ designation: r.get('designation'), code: r.get('code'), dci: r.get('dci'), prixHT: r.get('prixHT'), dispo: r.get('dispo'), source: r.get('source') })));
      const msg = await p.evaluate(() => Ext.ComponentQuery.query('extranetsgrossistes #exCopharmedMsg')[0].el.dom.textContent);
      const vise = ecran.find((x) => x.code === c.code);
      ok('« ' + c.motif + ' » (' + c.genre + ') : ' + c.nom + ' trouvé', api.success && !!vise, ecran.length + ' résultat(s) ; ' + msg);
      ok('« ' + c.motif + ' » : écran = API, ligne par ligne', JSON.stringify(ecran) === JSON.stringify((api.resultats || []).map((x) => ({
        designation: x.designation, code: x.code, dci: x.dci, prixHT: x.prixHT, dispo: x.dispo, source: x.source }))), ecran.length + ' / ' + (api.resultats || []).length);
      const cat = ecran.filter((x) => x.source === 'catalogue');
      const ecartsBase = cat.filter((x) => { const l = lignes.find((y) => y[1] === x.code);
        return !l || l[0] !== x.designation || l[2] !== x.dci || l[4] !== x.prixHT || l[8] !== x.dispo; });
      ok('« ' + c.motif + ' » : lignes « catalogue » = lignes gardées en base (' + cat.length + ')', ecartsBase.length === 0, JSON.stringify(ecartsBase.slice(0, 2)));
      ok('« ' + c.motif + ' » : message = ' + api.direct + ' en direct, ' + api.duCatalogue + ' du catalogue', msg.indexOf(api.direct + ' en direct') >= 0
        && (api.duCatalogue ? msg.indexOf(api.duCatalogue + ' du catalogue') >= 0 : true) && api.direct + api.duCatalogue === ecran.length, msg);
    }
    ok('aucune erreur JavaScript', erreurs.length === 0, JSON.stringify(erreurs));
  } catch (e) {
    ok('déroulé sans erreur', false, e.stack || e);
    await ENV_E2E.capture(p, 'copharmed-recherche-erreur').catch(() => {});
  } finally {
    const apres = { collectes: q('SELECT COUNT(*) FROM extranet_collecte'), comptes: q('CHECKSUM TABLE extranet_compte'),
      lignes: q('CHECKSUM TABLE extranet_liste_ligne') };
    ok('bilan : aucune collecte ajoutée, comptes et lignes gardées inchangés', JSON.stringify(avant) === JSON.stringify(apres), JSON.stringify(apres));
    await navigateur.close();
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
    process.exit(ko ? 1 : 0);
  }
})();
