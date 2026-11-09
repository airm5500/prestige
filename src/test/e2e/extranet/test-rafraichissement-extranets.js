/* EXTRANETS GROSSISTES (demande du 08/11) : onglet « Rafraîchissement », par le vrai chemin de l'ecran.
 *
 * Parcours : connexion, menu GESTION DES COMMANDES > Extranets grossistes, onglet Rafraîchissement ; clic sur la cellule
 * « Relire tous les » d'une liste, choix du delai dans la liste deroulante, comme l'utilisateur : le choix suffit a
 * enregistrer (ni Entree ni clic ailleurs), et la cellule n'est plus en edition ensuite.
 *
 * Rapprochement : pour chaque liste, ecran (delai, derniere lecture complete, dernier essai, resultat) = base
 * (extranet_rafraichissement, extranet_collecte) ; la prochaine lecture affichee suit la regle (derniere lecture + delai,
 * « dès que possible » si jamais lue, vide si « Jamais »).
 * Cas varies : liste TEDIS deja lue, liste Ubipharm jamais lue, deux delais differents, modification d'un reglage
 * existant, retour a « Jamais », delai non propose et liste inconnue refuses.
 * Bilan avant / apres : seule extranet_rafraichissement bouge (une ligne par liste reglee, auteur = utilisateur
 * connecte), aucune collecte lancee par les clics, aucune table metier touchee ; les reglages du test sont retires.
 *
 * Aucun faux extranet n'est necessaire : l'ecran ne lit rien sur Internet. Si la tache planifiee passe pendant le test
 * (minute en 0, seconde 40), elle peut lire une liste reglee : ce sont des GET, et le test ecarte ses collectes du bilan.
 *
 * Lancement (domain3, base laborex_audit) :
 *   BASE=http://localhost:10090/prestige DB_TEST=laborex_audit E2E_BASE_LIBRE=1 node test-rafraichissement-extranets.js
 */
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
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

const ECRAN = 'extranetsgrossistes';
const AUTO = 'rafraichissement automatique';
const METIER = ['t_famille', 't_famille_grossiste', 't_order', 't_order_detail', 't_bon_livraison', 't_grossiste'];
const empreinteMetier = () => Object.fromEntries(METIER.map((t) => [t, q('CHECKSUM TABLE ' + t).split('\t')[1]]));
const LIBELLES = { 0: 'Jamais', 30: '30 min', 60: '1 h', 120: '2 h', 240: '4 h', 480: '8 h', 720: '12 h', 1440: '24 h' };

const grille = (p) => p.evaluate(() => Ext.ComponentQuery.query('extranetsgrossistes')[0].rafraichissement.getRange()
  .map((r) => r.data));
/* texte affiche dans la grille, ligne par ligne (cellules dans l'ordre des colonnes) */
const cellules = (p) => p.evaluate(() => {
  const g = Ext.ComponentQuery.query('extranetsgrossistes #exRafraichissementGrille')[0];
  return Array.from(g.getView().getEl().dom.querySelectorAll('tr.x-grid-row')).map((tr) =>
    Array.from(tr.querySelectorAll('td')).map((td) => td.textContent.replace(/ /g, ' ').trim()));
});
const date16 = (v) => (v ? String(v).replace('T', ' ').substring(0, 16) : '');

/* clic sur la cellule « Relire tous les » de la liste, choix du delai, validation par Entree */
async function regler(p, code, delai) {
  const rang = (await grille(p)).findIndex((r) => r.code === code);
  const cellule = p.locator('#' + await p.evaluate(() => Ext.ComponentQuery.query('extranetsgrossistes #exRafraichissementGrille')[0]
    .getView().getEl().dom.id) + ' tr.x-grid-row').nth(rang).locator('td').nth(2);
  await cellule.click();
  await p.waitForTimeout(400);
  const reponse = p.waitForResponse((x) => x.url().indexOf('/rafraichissement/' + code) >= 0 && x.request().method() === 'PUT',
    { timeout: 30000 });
  const choisi = await vues.choisir(p, ECRAN + ' #exRafraichissementGrille combo', LIBELLES[delai]);
  /* ergonomie : le choix suffit, sans Entree ni clic ailleurs */
  const r = await (await reponse).json();
  await p.waitForFunction(() => !Ext.ComponentQuery.query('extranetsgrossistes')[0].rafraichissement.isLoading());
  await p.waitForTimeout(600);
  const enEdition = await p.evaluate(() => Ext.ComponentQuery.query('extranetsgrossistes #exRafraichissementGrille')[0]
    .editingPlugin.editing);
  return { choisi, r, enEdition };
}

const enBase = (code) => lignes("SELECT source, delai_minutes, modifie_par, modifie_le IS NOT NULL FROM extranet_rafraichissement"
  + " WHERE liste = '" + code + "'")[0] || null;

(async () => {
  const navigateur = await ENV_E2E.lancer(chromium);
  const p = await (await navigateur.newContext()).newPage();
  const reglagesAvant = q('SELECT COUNT(*) FROM extranet_rafraichissement');
  const collecteAvant = Number(q('SELECT IFNULL(MAX(id), 0) FROM extranet_collecte'));
  const metierAvant = empreinteMetier();
  const TEDIS = 'TEDIS_PROMOS_EXCLUSIVES';
  const UBI = 'PRODUITS_SUPPRIMES';
  const deja = q("SELECT COUNT(*) FROM extranet_rafraichissement WHERE liste IN ('" + TEDIS + "', '" + UBI + "')");
  try {
    ok('départ : aucune des deux listes du test n\'est réglée', deja === '0', deja);
    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await vues.ouvrirMenu(p, 'GESTION DES COMMANDES', 'Extranets grossistes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('extranetsgrossistes')[0], null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    const chargement = p.waitForResponse((x) => /\/extranet\/rafraichissement(\?|$)/.test(x.url()), { timeout: 30000 });
    await vues.cliquer(p, ECRAN + ' #exOnglets tab[text=Rafraîchissement]');
    await chargement;
    await p.waitForTimeout(800);

    /* ---- rapprochement ecran / base pour toutes les listes */
    const g = await grille(p);
    const cel = await cellules(p);
    ok('grille : 9 listes Ubipharm + 10 listes TEDIS', g.filter((r) => r.source === 'UBIPHARM').length === 9
      && g.filter((r) => r.source === 'TEDIS').length === 10, g.length);
    let ecarts = [];
    g.forEach((r, i) => {
      const module = r.source === 'TEDIS' ? 'LISTE_' + r.code : 'LISTE_' + r.code;
      const complete = q("SELECT IFNULL(DATE_FORMAT(MAX(debut), '%Y-%m-%d %H:%i'), '') FROM extranet_collecte WHERE source = '"
        + r.source + "' AND module = '" + module + "' AND statut = 'COMPLETE'");
      const dernier = lignes("SELECT DATE_FORMAT(debut, '%Y-%m-%d %H:%i'), statut FROM extranet_collecte WHERE source = '" + r.source
        + "' AND module = '" + module + "' ORDER BY id DESC LIMIT 1")[0] || ['', ''];
      const delai = Number(q("SELECT IFNULL(MAX(delai_minutes), 0) FROM extranet_rafraichissement WHERE liste = '" + r.code + "'"));
      const c = cel[i] || [];
      const attendu = [r.source, r.libelle, LIBELLES[delai] + ' ▾', complete, dernier[0], dernier[1]];
      attendu.forEach((v, k) => { if ((c[k] || '') !== v) { ecarts.push(r.code + ' col ' + k + ' écran ' + c[k] + ' base ' + v); } });
      if (Number(r.delai) !== delai) { ecarts.push(r.code + ' délai'); }
    });
    ok('rapprochement écran = base, ligne par ligne (délai, lecture complète, dernier essai, résultat)', ecarts.length === 0,
      ecarts.slice(0, 5).join(' | '));

    /* ---- liste TEDIS deja lue : 2 h */
    let x = await regler(p, TEDIS, 120);
    ok('TEDIS : choix « 2 h » dans la liste, enregistré aussitôt', x.choisi === '2 h' && x.r.success === true && !x.enEdition,
      JSON.stringify(x.r));
    let b = enBase(TEDIS);
    ok('TEDIS : base relue = TEDIS, 120 min, auteur ' + ENV_E2E.LOGIN, b && b[0] === 'TEDIS' && b[1] === '120'
      && b[2] === ENV_E2E.LOGIN && b[3] === '1', b && b.join(' '));
    let r = (await grille(p)).find((l) => l.code === TEDIS);
    const completeTedis = q("SELECT DATE_FORMAT(MAX(debut), '%Y-%m-%d %H:%i:%s') FROM extranet_collecte WHERE module = 'LISTE_"
      + TEDIS + "' AND statut = 'COMPLETE'");
    const dernierTedis = q("SELECT DATE_FORMAT(debut, '%Y-%m-%d %H:%i:%s') FROM extranet_collecte WHERE module = 'LISTE_" + TEDIS
      + "' ORDER BY id DESC LIMIT 1");
    const plus = (s, m) => { const d = new Date(s.replace(' ', 'T') + 'Z'); d.setUTCMinutes(d.getUTCMinutes() + m);
      return d.toISOString().substring(0, 16).replace('T', ' '); };
    const attendueTedis = completeTedis ? [plus(completeTedis, 120), dernierTedis ? plus(dernierTedis, 30) : ''].sort().pop()
      : 'dès que possible';
    ok('TEDIS : prochaine lecture = max(dernière complète + 2 h, dernier essai + 30 min)', date16(r.prochaine) === attendueTedis,
      date16(r.prochaine) + ' / ' + attendueTedis);
    ok('TEDIS : cellule affichée « 2 h »', (await cellules(p))[(await grille(p)).findIndex((l) => l.code === TEDIS)][2] === '2 h ▾');
    ok('TEDIS : message de confirmation dans la barre', (await p.evaluate(() => Ext.ComponentQuery.query(
      'extranetsgrossistes #exRafraichissementMsg')[0].el.dom.textContent)).indexOf('2 h') >= 0);

    /* ---- liste Ubipharm jamais lue : 24 h -> des que possible */
    const jamaisLue = q("SELECT COUNT(*) FROM extranet_collecte WHERE module = 'LISTE_" + UBI + "'") === '0';
    x = await regler(p, UBI, 1440);
    b = enBase(UBI);
    ok('Ubipharm : base relue = UBIPHARM, 1440 min', x.r.success && b && b[0] === 'UBIPHARM' && b[1] === '1440', b && b.join(' '));
    r = (await grille(p)).find((l) => l.code === UBI);
    ok('Ubipharm : prochaine lecture « dès que possible » si jamais lue', !jamaisLue || r.prochaine === 'dès que possible',
      r.prochaine);

    /* ---- modification d'un reglage existant : TEDIS 2 h -> 30 min */
    x = await regler(p, TEDIS, 30);
    b = enBase(TEDIS);
    ok('modification : TEDIS passe à 30 min, une seule ligne en base', b && b[1] === '30'
      && q("SELECT COUNT(*) FROM extranet_rafraichissement WHERE liste = '" + TEDIS + "'") === '1', b && b.join(' '));

    /* ---- refus : delai non propose, liste inconnue (base inchangee) */
    const refus = await p.evaluate(async () => {
      const put = (c, d) => fetch('../api/v1/extranet/rafraichissement/' + c, { method: 'PUT',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ delai: d }) }).then((y) => y.json());
      return [await put('TEDIS_PROMOS_EXCLUSIVES', 45), await put('INCONNUE', 60), await put('TEDIS_PROMOS_EXCLUSIVES', -30)];
    });
    ok('refus : délai 45 min, liste inconnue, délai négatif', refus.every((y) => y.success === false), JSON.stringify(refus));
    ok('refus : base inchangée (30 min)', enBase(TEDIS)[1] === '30');

    /* ---- retour a « Jamais » */
    x = await regler(p, TEDIS, 0);
    await regler(p, UBI, 0);
    r = (await grille(p)).find((l) => l.code === TEDIS);
    ok('« Jamais » : délai 0 en base, prochaine lecture vide', enBase(TEDIS)[1] === '0' && enBase(UBI)[1] === '0' && !r.prochaine,
      String(r.prochaine));

    /* ---- bilan */
    const parClic = q('SELECT COUNT(*) FROM extranet_collecte WHERE id > ' + collecteAvant + " AND utilisateur <> '" + AUTO + "'");
    ok('bilan : aucune collecte lancée par les clics', parClic === '0', parClic);
    ok('bilan : tables métier inchangées', JSON.stringify(empreinteMetier()) === JSON.stringify(metierAvant));
  } catch (e) {
    ok('déroulement sans erreur', false, e.message);
    await ENV_E2E.capture(p, 'rafraichissement-erreur').catch(() => {});
  } finally {
    q("DELETE FROM extranet_rafraichissement WHERE liste IN ('" + TEDIS + "', '" + UBI + "')");
    ok('nettoyage : réglages du test retirés', q('SELECT COUNT(*) FROM extranet_rafraichissement') === reglagesAvant);
    await navigateur.close();
    const e = res.filter((y) => !y.c).length;
    console.log('\n' + (res.length - e) + '/' + res.length + ' PASS');
    process.exit(e ? 1 : 0);
  }
})();
