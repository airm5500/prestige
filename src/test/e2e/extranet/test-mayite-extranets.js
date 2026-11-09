/* EXTRANETS GROSSISTES (demande du 08/11) : base Mayité, par le vrai chemin de l'écran.
 *
 * Parcours : connexion, menu GESTION DES COMMANDES > Extranets grossistes, onglet Mayité : saisie d'un nom, Entrée ;
 * clic sur une spécialité : monographie à droite ; clic sur une spécialité correspondante : sa monographie. Puis onglet
 * Ubipharm > Produits > Fiche produit : recherche Ubipharm, bouton « Monographie » d'un résultat : fenêtre Mayité
 * pré-remplie avec le premier mot de la désignation, résultats affichés, fermeture.
 *
 * Rapprochement : grille = réponse de l'API, ligne par ligne (nom, DCI, liste, dosages, propriétés, prix) ; monographie
 * affichée = réponse (nom, DCI, prix, chaque rubrique remplie, chaque spécialité correspondante et son prix).
 * Bilan : la consultation n'écrit rien (tables extranet_* et métier inchangées).
 *
 * Lit le VRAI Mayité (GET seulement), entré par la session Ubipharm de domain3 : identifiants Ubipharm enregistrés
 * requis. Lancement : BASE=http://localhost:10090/prestige DB_TEST=laborex_audit E2E_BASE_LIBRE=1 node test-mayite-extranets.js
 */
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright-core');

const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s],
  { encoding: 'utf8' }).replace(/\r/g, '').trim();
const res = [];
function ok(n, c, d) {
  res.push({ n, c: !!c });
  console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : ''));
}
const TABLES = ['extranet_collecte', 'extranet_liste_ligne', 'extranet_produit', 'extranet_rafraichissement', 't_famille',
  't_order', 't_grossiste'];
const empreinte = () => TABLES.map((t) => t + ':' + q('CHECKSUM TABLE ' + t).split('\t')[1]).join(' ');
const ECRAN = 'extranetsgrossistes';
/* format attendu : espace pour les milliers, virgule décimale, sans zéro inutile (12 345,5) */
const montant = (v) => {
  if (v === '' || v === null || v === undefined) { return ''; }
  const a = Math.round(Math.abs(Number(v)) * 100);
  const d = a % 100;
  return (Number(v) < 0 ? '-' : '') + String(Math.floor(a / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    + (d ? ',' + String(d < 10 ? '0' + d : d).replace(/0$/, '') : '');
};

/* lignes affichées d'une grille (texte des cellules) */
const cellules = (p, sel) => p.evaluate((s) => {
  const g = Ext.ComponentQuery.query(s)[0];
  return Array.from(g.getView().getEl().dom.querySelectorAll('tr.x-grid-row')).map((tr) =>
    Array.from(tr.querySelectorAll('td')).map((td) => td.textContent.replace(/ /g, ' ').trim()));
}, sel);

async function verifierMonographie(p, cadre, m, nom) {
  const t = await p.evaluate((s) => Ext.ComponentQuery.query(s)[0].getEl().dom.innerText, cadre + ' #exMayiteMonographie');
  const plat = (x) => String(x || '').replace(/\s+/g, ' ').trim();
  const tp = plat(t);
  const manquants = [];
  if (tp.indexOf(plat(m.nom)) < 0) { manquants.push('nom'); }
  if (m.dci && tp.indexOf(plat(m.dci)) < 0) { manquants.push('dci'); }
  if (m.prix && tp.indexOf(plat(m.prix)) < 0) { manquants.push('prix'); }
  m.rubriques.filter((r) => r.texte).forEach((r) => {
    if (tp.indexOf(plat(r.titre)) < 0 || tp.indexOf(plat(r.texte)) < 0) { manquants.push('rubrique ' + r.titre); }
  });
  const eq = await p.evaluate((s) => Array.from(Ext.ComponentQuery.query(s)[0].getEl().dom.querySelectorAll('.ex-mayite-equivalent'))
    .map((a) => [a.getAttribute('data-id'), a.textContent.trim(), a.closest('tr').cells[1].textContent.replace(/ /g, ' ').trim()]),
  cadre + ' #exMayiteMonographie');
  m.equivalents.forEach((e, i) => {
    const l = eq[i] || [];
    if (l[0] !== e.id || l[1] !== e.nom.trim() || l[2] !== montant(e.prix) + ' FCFA') { manquants.push('équivalent ' + i); }
  });
  ok(nom + ' : monographie affichée = réponse (nom, DCI, prix, ' + m.rubriques.filter((r) => r.texte).length
    + ' rubriques, ' + m.equivalents.length + ' équivalents)', manquants.length === 0 && eq.length === m.equivalents.length,
  manquants.join(', '));
  ok(nom + ' : retours à la ligne gardés', m.rubriques.every((r) => !r.texte || r.texte.indexOf('\n') < 0
    || t.indexOf(r.texte.split('\n')[1].trim()) >= 0));
}

/* 09/11 : jamais un vrai extranet (sources dirigees vers 127.0.0.1, sinon arret) */
require('./garde-extranets').verifier(q, ENV_E2E.BASE, ENV_E2E.PAYARA_DOMAINE);

(async () => {
  const navigateur = await ENV_E2E.lancer(chromium);
  const p = await (await navigateur.newContext()).newPage();
  const avant = empreinte();
  try {
    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await vues.ouvrirMenu(p, 'GESTION DES COMMANDES', 'Extranets grossistes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('extranetsgrossistes')[0], null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    await vues.cliquer(p, ECRAN + ' #exOnglets tab[text=Mayité]');
    await p.waitForTimeout(500);

    /* ---- sans critère : refus dans la barre, aucun appel */
    let appels = 0;
    p.on('request', (r) => { if (r.url().indexOf('/mayite/') >= 0) { appels++; } });
    await vues.cliquer(p, ECRAN + ' #exMayite #exMayiteRechercher');
    await p.waitForTimeout(400);
    ok('sans critère : message dans la barre, aucun appel', appels === 0 && (await p.evaluate(() => Ext.ComponentQuery.query(
      'extranetsgrossistes #exMayite #exMayiteMsg')[0].el.dom.textContent)).indexOf('Saisissez') >= 0);

    /* ---- recherche par nom, Entrée */
    const rep = p.waitForResponse((x) => x.url().indexOf('/mayite/recherche') >= 0, { timeout: 120000 });
    await vues.cliquer(p, ECRAN + ' #exMayite #exMayiteNom');
    await p.keyboard.type('doliprane', { delay: 20 });
    await p.keyboard.press('Enter');
    const r = await (await rep).json();
    await p.waitForTimeout(800);
    ok('recherche « doliprane » : réponse', r.success && r.resultats.length > 0, r.msg || r.trouves);
    const lignes = await cellules(p, ECRAN + ' #exMayite #exMayiteGrille');
    const ecarts = [];
    r.resultats.forEach((o, i) => {
      const a = [o.nom, o.dci, o.liste, o.dosages, o.proprietes, montant(o.prix)];
      a.forEach((v, k) => { if ((lignes[i] || [])[k] !== v) { ecarts.push(i + '/' + k + ' écran ' + (lignes[i] || [])[k] + ' api ' + v); } });
    });
    ok('rapprochement grille = réponse, ' + r.resultats.length + ' lignes × 6 colonnes', ecarts.length === 0
      && lignes.length === r.resultats.length, ecarts.slice(0, 3).join(' | '));
    ok('titre de la grille : nombre trouvé', (await p.evaluate(() => Ext.ComponentQuery.query(
      'extranetsgrossistes #exMayite #exMayiteGrille')[0].title)).indexOf(r.trouves + ' trouvée') >= 0);

    /* ---- clic sur une ligne : monographie */
    const rangAvecEq = 0;
    let rm = p.waitForResponse((x) => x.url().indexOf('/mayite/monographie/') >= 0, { timeout: 120000 });
    await p.locator('#' + await p.evaluate(() => Ext.ComponentQuery.query('extranetsgrossistes #exMayite #exMayiteGrille')[0]
      .getView().getEl().dom.id) + ' tr.x-grid-row').nth(rangAvecEq).click();
    let m = await (await rm).json();
    await p.waitForTimeout(600);
    ok('monographie : réponse', m.success && m.rubriques.length > 0, m.msg);
    if (m.success) { await verifierMonographie(p, ECRAN + ' #exMayite', m, 'ligne 1'); }

    /* ---- clic sur une spécialité correspondante */
    if (m.success && m.equivalents.length) {
      const cible = m.equivalents[m.equivalents.length - 1];
      rm = p.waitForResponse((x) => x.url().indexOf('/mayite/monographie/' + cible.id) >= 0, { timeout: 120000 });
      await p.locator('.ex-mayite-equivalent[data-id="' + cible.id + '"]').first().click();
      const m2 = await (await rm).json();
      await p.waitForTimeout(600);
      ok('équivalent : sa monographie s\'ouvre (' + cible.nom + ')', m2.success && m2.id === cible.id, m2.msg);
      if (m2.success) { await verifierMonographie(p, ECRAN + ' #exMayite', m2, 'équivalent'); }
    } else {
      ok('équivalents présents pour l\'essai', false);
    }

    /* ---- bouton « Monographie » d'un résultat Ubipharm : fenêtre de consultation */
    for (const t of ['Ubipharm', 'Produits', 'Fiche produit']) {
      await vues.cliquer(p, ECRAN + ' #exOnglets tab[text=' + t + ']');
      await p.waitForTimeout(300);
    }
    const ru = p.waitForResponse((x) => x.url().indexOf('/ubipharm/recherche') >= 0, { timeout: 120000 });
    await vues.saisir(p, ECRAN + ' #exPscode', 'doliprane');
    await vues.cliquer(p, ECRAN + ' #exRechercher');
    const u = await (await ru).json();
    await p.waitForTimeout(800);
    ok('recherche Ubipharm : résultats', u.success && u.resultats.length > 0, u.msg);
    const designation = u.resultats[0].designation;
    const premierMot = designation.match(/[A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9-]+/)[0];
    const rf = p.waitForResponse((x) => x.url().indexOf('/mayite/recherche') >= 0, { timeout: 120000 });
    await p.locator('#' + await p.evaluate(() => Ext.ComponentQuery.query('extranetsgrossistes #exRechercheGrille')[0]
      .getView().getEl().dom.id) + ' tr.x-grid-row').first().locator('.ex-bouton-mayite').click();
    const rfj = await (await rf).json();
    await p.waitForTimeout(800);
    const fen = await p.evaluate(() => { const f = Ext.ComponentQuery.query('#exFenetreMayite')[0];
      return f && f.isVisible() ? { nom: f.down('#exMayiteNom').getValue(), n: f.down('#exMayiteGrille').getStore().getCount() } : null; });
    ok('fenêtre Mayité : ouverte, nom pré-rempli « ' + premierMot + ' »', fen && fen.nom === premierMot, JSON.stringify(fen));
    ok('fenêtre Mayité : résultats affichés = réponse', fen && rfj.success && fen.n === rfj.resultats.length, rfj.msg);
    ok('la fiche Ubipharm n\'a pas été lue par le clic sur le bouton', await p.evaluate(() =>
      Ext.ComponentQuery.query('extranetsgrossistes #exPscode')[0].getValue()) === 'doliprane');
    await vues.cliquer(p, '#exFenetreMayite button[text=Fermer]');
    await p.waitForTimeout(500);
    ok('fenêtre fermée', await p.evaluate(() => !Ext.ComponentQuery.query('#exFenetreMayite').some((f) => f.isVisible())));

    ok('bilan : la consultation n\'écrit rien en base', empreinte() === avant);
  } catch (e) {
    ok('déroulement sans erreur', false, e.message);
    await ENV_E2E.capture(p, 'mayite-erreur').catch(() => {});
  } finally {
    await navigateur.close();
    const e = res.filter((y) => !y.c).length;
    console.log('\n' + (res.length - e) + '/' + res.length + ' PASS');
    process.exit(e ? 1 : 0);
  }
})();
