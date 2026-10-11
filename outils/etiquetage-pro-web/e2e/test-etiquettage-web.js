/* ETIQUETTAGE PRO (version web) - chemin reel, dans Chromium, application lancee sur la base de test :
 *  - connexion (premier lancement, mauvais mot de passe, conseil de changement, session expiree, deconnexion) ;
 *  - import en 4 etapes : correspondance proposee, champ ajoute, colonne ignoree, controle (compteurs, erreurs,
 *    doublons), export CSV des erreurs, application, mise a jour par CIP sans effacer, modele memorise ;
 *  - catalogue : recherche contient, scan (Entree coche), clavier, tri, filtres, colonnes, tout cocher ;
 *  - fiche : controles en direct, Enregistrer grise avec le nombre d'erreurs, Entree = champ suivant, Ctrl+S, Echap,
 *    CIP non modifiable, historique, creation (Ctrl+N), suppression confirmee dans la page ;
 *  - impression : type de code, planche, case de depart (apercu), resume, PDF affiche dans la page, page de test,
 *    reglages refuses avec l'erreur sous le champ ;
 *  - personnalisation : apercu dessine, element non imprime, code illisible refuse, enregistrer, retablir, essai ;
 *  - ergonomie : aucune fenetre surgissante, aucune erreur de console ni de CSP, largeur telephone sans defilement
 *    horizontal, cibles de 44 px.
 * Donnees d'essai retirees a la fin (base de test seulement : jamais de base de production).
 * Lancement : application sur ETIQUETTAGE_URL (defaut http://127.0.0.1:8095), base DB_TEST (bd_etiquette_test).
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const URL0 = process.env.ETIQUETTAGE_URL || 'http://127.0.0.1:8095';
const BASE = process.env.DB_TEST || 'bd_etiquette_test';
if (!/_test$/.test(BASE)) {
  throw new Error('Base de test attendue (nom en _test) : ' + BASE);
}
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined && !c ? '  [' + String(d).slice(0, 1500) + ']' : '')); }
const q = (s) => execFileSync('mysql', ['-u' + (process.env.DB_USER || 'etiquettage_test'), '-p' + (process.env.DB_PASSWORD || 'etiquettage_test'),
  '--default-character-set=utf8mb4', BASE, '-sN'], { input: s, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
/* mot de passe d'origine documente (admin / admin), chiffre BCrypt */
const ADMIN = '$2a$10$EFXcEfNG2nOKHLmFAShf7OTmTwuuWbRjvRaS61D2uORKRZb.YN0HC';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-ep-'));

function vider() {
  q('DELETE FROM produit; DELETE FROM historique; DELETE FROM journal_import; DELETE FROM modele_import;'
    + ' DELETE FROM champ WHERE systeme = 0; DELETE FROM reglage; DELETE FROM code_etiquette; DELETE FROM disposition;'
    + " DELETE FROM utilisateur; INSERT INTO utilisateur (login, mot_de_passe, mdp_par_defaut) VALUES ('admin', '" + ADMIN + "', 1);");
}

const CSV = ['Code CIP;Libellé;Prix public;Péremption;Lot;Famille;Remarque interne',
  '3400930000014;Doliprane 1000mg cpr b/8;1 300;12/2027;;Antalgique;a voir',
  '3400930000021;Doliprane 500mg gel b/16;980;30/06/2027;A2398C;Antalgique;',
  '3400930000038;Doliprane 2,4% susp buv;1 640 F;15/02/2027;S1172;Antalgique;',
  '3400930000045;Spasfon lyoc;=1+1;;;Antispasmodique;',
  '3400930000052;;800;;;;',
  '340093;Court;100;;;;',
  '3400930000069;Smecta;700;31/02/2027;;;',
  '3400930000076;Vogalene;400;;;;',
  '3400930000076;Vogalene lyoc;450;;;Antiemetique;'].join('\r\n');

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 950 }, acceptDownloads: true, locale: 'fr-FR' });
  const p = await ctx.newPage();
  const err = [];
  p.on('pageerror', (e) => err.push('page: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/401|409|400|410/.test(m.text())) err.push('console: ' + m.text()); });
  const journalCharger = [];
  p.on('request', (r) => { if (r.url().includes('/personnalisation/charger')) journalCharger.push('-> ' + r.postData()); });
  p.on('response', async (r) => { if (r.url().includes('/personnalisation/charger')) journalCharger.push('<- ' + (await r.text().catch(() => '')).slice(0, 60)); });
  p.on('dialog', (d) => { err.push('DIALOGUE ' + d.message()); d.dismiss(); });
  const texte = (s) => p.locator(s).first().innerText().catch(() => '');
  const attendre = (ms) => p.waitForTimeout(ms);
  /* vrai des que le nombre d'elements attendu est affiche (5 s au plus) */
  const menu = (nom) => p.getByLabel('Menu principal').getByRole('link', { name: nom });
  const compte = (sel, n) => p.waitForFunction(([s2, n2]) => document.querySelectorAll(s2).length === n2, [sel, n], { timeout: 5000 }).then(() => true, () => false);
  const surLigne = () => p.waitForFunction(() => document.activeElement && document.activeElement.getAttribute('data-ligne') !== null, null, { timeout: 3000 }).catch(() => {});
  try {
    vider();
    // existant avant import : prix et lot connus (le lot ne doit pas etre efface par une cellule vide)
    q("INSERT INTO produit (cip, designation, prix, lot, peremption) VALUES ('3400930000014', 'DOLIPRANE 1000MG CPR B/8', 1250, 'A2410B', '2026-06-30')");

    /* ---------------------------------------------------------------- connexion */
    await p.goto(URL0 + '/catalogue');
    await p.waitForURL(/\/connexion/);
    ok('sans session : ecran de connexion', p.url().includes('/connexion?retour=%2Fcatalogue'));
    await p.getByText('Premier lancement').waitFor();
    ok('premier lancement : admin / admin indique', (await texte('.bandeau.alerte')).includes('admin / admin'));
    ok('identifiant propose : admin', (await p.getByLabel('Identifiant').inputValue()) === 'admin');
    await p.getByLabel('Mot de passe').fill('faux');
    await p.getByLabel('Mot de passe').press('Enter');
    await p.getByText('Identifiant ou mot de passe incorrect.').waitFor();
    ok('mauvais mot de passe : message dans la page, champ vide', (await p.getByLabel('Mot de passe').inputValue()) === '');
    await p.getByLabel('Mot de passe').fill('admin');
    await p.getByRole('button', { name: /Se connecter/ }).click();
    await p.waitForURL(/\/catalogue/);
    ok('connexion : retour a la page demandee', p.url().endsWith('/catalogue'));
    ok('conseil : changer le mot de passe d\'origine', (await texte('.conseil')).includes('mot de passe d\'origine'));
    await p.getByRole('button', { name: 'Plus tard' }).click();
    ok('conseil masque par « Plus tard »', await p.locator('.conseil').waitFor({ state: 'detached', timeout: 3000 }).then(() => true, () => false));
    ok('police IBM Plex chargee (hors ligne)', await p.evaluate(() => document.fonts.check('15px "IBM Plex Sans"')));

    /* ---------------------------------------------------------------- import */
    await menu('Importer').click();
    const f = path.join(TMP, 'tarif_octobre.csv');
    fs.writeFileSync(f, CSV);
    await p.locator('input[type=file]').setInputFiles(f);
    await p.getByText('Chaque colonne du fichier devient un champ du catalogue').waitFor();
    ok('etape 2 courante', (await texte('.etapes li.courante')).includes('2. Champs'));
    ok('fichier, lignes, separateur affiches', /tarif_octobre\.csv · 9 lignes.*séparateur « ; »/.test(await texte('main .entre .petit')), await texte('main .entre .petit'));
    const sel = (i) => p.locator('#c-' + i);
    ok('correspondance proposee : CIP, designation, prix, peremption, lot',
      (await sel(0).inputValue()) === 'cip' && (await sel(1).inputValue()) === 'designation' && (await sel(2).inputValue()) === 'prix'
      && (await sel(3).inputValue()) === 'peremption' && (await sel(4).inputValue()) === 'lot');
    ok('colonne inconnue : nouveau champ « Famille »', (await sel(5).inputValue()) === '#nouveau' && (await p.locator('#l-5').inputValue()) === 'Famille');
    ok('role du CIP : cle de mise a jour', (await texte('.correspondance tbody tr:nth-child(1)')).includes('CIP — clé de mise à jour'));
    await sel(6).selectOption('#ignorer');
    ok('colonne ignoree', (await texte('.correspondance tbody tr:nth-child(7)')).includes('Colonne ignorée'));
    ok('nouveaux champs annonces', (await texte('.bandeau.info')).includes('Famille'));
    // un champ ne sert qu'une fois : prendre « lot » pour la colonne 6 libere la colonne 4
    await sel(6).selectOption('lot');
    ok('meme champ choisi deux fois : l\'autre colonne est ignoree', (await sel(4).inputValue()) === '#ignorer');
    await sel(4).selectOption('lot');
    await sel(6).selectOption('#ignorer');
    // sans CIP : refus annonce, bouton grise
    await sel(0).selectOption('#ignorer');
    ok('sans colonne CIP : alerte et controle impossible', (await texte('.bandeau.alerte')).includes('Associez une colonne au CIP')
      && await p.getByRole('button', { name: /Contrôler les/ }).isDisabled());
    await sel(0).selectOption('cip');
    await p.getByRole('button', { name: 'Contrôler les 9 lignes' }).click();
    await p.getByText('Contrôle avant écriture').waitFor();
    const compteurs = await p.locator('.compteur').allInnerTexts();
    ok('controle : 1 mis a jour, 3 nouveaux, 4 en erreur, 1 doublon',
      /^1\b/.test(compteurs[0]) && /^3\b/.test(compteurs[1]) && /^4\b/.test(compteurs[3]) && /^1\b/.test(compteurs[4]), compteurs.join(' | '));
    ok('erreurs ligne par ligne', (await texte('main table')).includes('Date invalide : février n\'a pas de 31.')
      && (await texte('main table')).includes('CIP 340093 : 6 chiffres (7 ou 13 attendus).'));
    ok('rien d\'ecrit avant validation', q("SELECT COUNT(*) FROM produit") === '1' && q('SELECT COUNT(*) FROM champ WHERE systeme = 0') === '0');
    const [tel] = await Promise.all([p.waitForEvent('download'), p.getByRole('link', { name: 'Exporter les erreurs (CSV)' }).first().click()]);
    const csv = fs.readFileSync(await tel.path(), 'utf8');
    ok('export CSV des erreurs (formule neutralisee)', csv.startsWith('﻿Ligne;CIP;Colonne;Valeur;Erreur') && csv.includes("\"'=1+1\""), csv.slice(0, 200));
    await p.locator('details summary', { hasText: 'CIP en double' }).click();
    ok('doublon : derniere ligne gardee', (await texte('details ul')).includes('lignes 9, 10 — ligne 10 gardée'));
    await p.getByRole('button', { name: /Importer 4 produits/ }).click();
    await p.getByText('Import terminé.').waitFor();
    ok('resultat : 3 crees, 1 mis a jour', /^3\b/.test((await p.locator('.compteur').allInnerTexts())[0]) && /^1\b/.test((await p.locator('.compteur').allInnerTexts())[1]));
    ok('mise a jour par CIP : prix change, lot garde', q("SELECT CONCAT(prix, '/', lot) FROM produit WHERE cip = '3400930000014'") === '1300/A2410B');
    ok('champ ajoute au catalogue', q("SELECT libelle FROM champ WHERE systeme = 0") === 'Famille');
    await p.getByRole('link', { name: 'Voir les produits de cet import' }).click();
    await p.waitForURL(/dernierImport=1/);
    await p.locator('tbody tr').nth(3).waitFor();
    ok('catalogue filtre sur le dernier import : 4 produits', (await texte('h1')).includes('4 produits'), await texte('h1'));
    ok('filtre « Dernier import » choisi', (await p.locator('#maj').inputValue()) === '1');

    /* modele memorise : meme format -> correspondance reprise */
    await menu('Importer').click();
    await p.getByText('Derniers imports').waitFor();
    ok('journal des imports affiche', (await texte('main')).includes('Derniers imports') && (await texte('main table')).includes('tarif_octobre.csv'));
    const f2 = path.join(TMP, 'tarif_novembre.csv');
    fs.writeFileSync(f2, CSV.replace('1 300', '1 350'));
    await p.locator('input[type=file]').setInputFiles(f2);
    await p.getByText('Format reconnu').waitFor();
    ok('modele memorise : Famille associee, remarque ignoree', (await sel(5).inputValue()) === 'x_famille' && (await sel(6).inputValue()) === '#ignorer');
    await p.getByRole('button', { name: 'Précédent' }).click();
    await p.getByText('Déposez le fichier ici').waitFor();
    ok('precedent : retour a l\'etape 1', (await texte('.etapes li.courante')).includes('1. Fichier'));

    /* ---------------------------------------------------------------- catalogue */
    await menu('Catalogue').click();
    await p.getByLabel(/Rechercher/).waitFor();
    await p.locator('tbody tr').nth(3).waitFor();
    ok('colonnes : CIP, Désignation, Prix, Lot, Péremption, Famille, Modifié',
      (await p.locator('thead th').allInnerTexts()).map((x) => x.replace(/[▲▼]/g, '').trim()).join('|') === '|CIP|Désignation|Prix|Lot|Péremption|Famille|Modifié',
      (await p.locator('thead th').allInnerTexts()).join('|'));
    ok('focus dans la recherche', await p.evaluate(() => document.activeElement && document.activeElement.id === 'cherche'));
    await p.getByLabel(/Rechercher/).fill('dolip 500');
    await p.waitForFunction(() => document.querySelectorAll('tbody tr').length === 1);
    ok('recherche « contient », plusieurs mots', (await texte('tbody')).includes('DOLIPRANE 500MG GEL B/16'));
    await p.getByLabel(/Rechercher/).fill('');
    await p.getByLabel(/Rechercher/).fill('3400930000038');
    await p.getByLabel(/Rechercher/).press('Enter');
    await p.getByText('coché pour l\'impression').waitFor();
    ok('scan + Entree : produit coche, champ vide pour le scan suivant', (await p.getByLabel(/Rechercher/).inputValue()) === '' && (await texte('nav')).includes('Imprimer\n1') || (await texte('nav .compte')) === '1');
    await p.getByLabel(/Rechercher/).fill('%');
    await p.waitForFunction(() => document.querySelectorAll('tbody tr').length === 1);
    ok('« % » cherche le caractere lui-meme (2,4 %), pas tout', (await texte('tbody')).includes('DOLIPRANE 2,4% SUSP BUV'));
    await p.getByLabel(/Rechercher/).fill('');
    await p.locator('tbody tr').nth(3).waitFor();
    await p.getByRole('button', { name: /^Prix/ }).click();
    await p.waitForFunction(() => document.querySelector('thead [aria-sort="ascending"]') !== null
      && document.querySelector('tbody tr td:nth-child(4)').innerText.trim() === '450');
    const prixCol = await p.locator('tbody tr td:nth-child(4)').allInnerTexts();
    const nums = prixCol.map((x) => Number(x.replace(/\D/g, '')) || 0);
    ok('tri par prix croissant', nums.every((v, i) => i === 0 || nums[i - 1] <= v), prixCol.join(','));
    await p.locator('#per').selectOption('depassee');
    await p.waitForFunction(() => document.querySelectorAll('tbody tr').length === 0 || document.querySelector('.vide'));
    ok('filtre peremption depassee : aucun', (await texte('.vide')).includes('Aucun produit'));
    await p.locator('#per').selectOption('');
    await p.locator('tbody tr').nth(3).waitFor();
    ok('peremption proche signalee', await p.locator('.pastille.alerte').count() >= 1);
    // clavier : fleche bas depuis la recherche, Espace coche, Entree ouvre la fiche
    await p.getByLabel(/Rechercher/).focus();
    /* au rythme d'un clavier rapide : aucune attente entre les touches */
    await p.keyboard.press('ArrowDown');
    await p.keyboard.press('ArrowDown');
    await p.keyboard.press('Space');
    ok('clavier : fleches et Espace cochent la 2e ligne', await compte('tbody tr.choisie', 2)
      && (await texte('tbody tr.choisie')).includes('DOLIPRANE 500MG'), await texte('tbody'));
    await p.getByRole('checkbox', { name: 'Cocher les produits de la page' }).check();
    ok('cocher la page : tous coches', await compte('tbody tr.choisie', 4));
    await p.getByRole('button', { name: 'Supprimer…' }).click();
    ok('suppression : confirmation dans la page', await p.getByText('Supprimer 4 produits du catalogue ?').waitFor({ timeout: 3000 }).then(() => true, () => false));
    await p.getByRole('button', { name: 'Non' }).click();
    await p.getByRole('button', { name: 'Tout décocher' }).click();
    ok('tout decocher', await compte('tbody tr.choisie', 0));
    await p.locator('details.colonnes-choix summary').click();
    await p.getByLabel('Famille', { exact: true }).uncheck();
    ok('colonne masquee (preference gardee)', await compte('thead th', 7) && !(await p.locator('thead').innerText()).includes('Famille'));
    await p.getByLabel('Famille', { exact: true }).check();
    await compte('thead th', 8);
    await p.getByLabel(/Rechercher/).focus();
    await p.keyboard.press('ArrowDown');
    await surLigne();
    await p.keyboard.press('Enter');
    await p.waitForURL(/\/produit\/\d+/);
    ok('Entree sur une ligne : fiche ouverte', /\/produit\/\d{13}$/.test(p.url()));

    /* ---------------------------------------------------------------- fiche */
    await p.goto(URL0 + '/produit/3400930000014');
    await p.locator('#f-prix').waitFor();
    await p.waitForFunction(() => document.querySelector('#f-prix').value === '1300');
    ok('fiche : CIP non modifiable', await p.locator('#f-cip').evaluate((e) => e.readOnly));
    ok('fiche : champ importe signale', (await texte('label[for=f-x_famille]')).includes('(champ importé)'));
    await p.locator('#f-prix').fill('12,5');
    await p.locator('.msg-erreur').first().waitFor();
    ok('erreur sous le champ prix', (await texte('#a-prix')).includes('entier'));
    ok('Enregistrer grise avec le nombre d\'erreurs', (await p.getByRole('button', { name: /Enregistrer \(1 erreur à corriger\)/ }).isDisabled()));
    await p.locator('#f-peremption').fill('31/02/2027');
    await p.getByText('Date invalide : février n\'a pas de 31. Format jj/mm/aaaa.').waitFor();
    ok('date impossible : message clair', (await p.getByRole('button', { name: /2 erreurs à corriger/ }).count()) === 1);
    ok('champ en erreur marque (aria-invalid)', (await p.locator('#f-peremption').getAttribute('aria-invalid')) === 'true');
    await p.locator('#f-peremption').fill('12/2027');
    await p.locator('#f-prix').fill('1 300');
    await p.waitForFunction(() => !document.querySelector('.msg-erreur'));
    await p.locator('#f-prix').fill('1 450');
    await p.locator('#f-prix').press('Enter');
    ok('Entree : champ suivant', await p.evaluate(() => document.activeElement.id === 'f-lot'));
    await attendre(400);
    ok('apercu suit la saisie', (await texte('.etiquette')).includes('1 450'));
    await p.keyboard.press('Control+s');
    await p.getByText('Fiche enregistrée.').waitFor();
    ok('Ctrl+S : enregistre', q("SELECT prix FROM produit WHERE cip = '3400930000014'") === '1450');
    ok('historique : Prix 1300 → 1450 par admin', (await texte('.historique')).includes('Prix : 1300 → 1450') && (await texte('.historique')).includes('admin · Fiche'));
    await p.locator('#f-lot').fill('B1');
    await p.keyboard.press('Escape');
    ok('Echap avec modification : avertissement dans la page', await p.getByText('Des modifications ne sont pas enregistrées.').waitFor({ timeout: 3000 }).then(() => true, () => false));
    await p.getByRole('button', { name: 'Continuer la saisie' }).click();
    ok('continuer : reste sur la fiche', p.url().endsWith('/produit/3400930000014'));
    await p.getByRole('button', { name: 'Aperçu réel (PDF)' }).click();
    await p.locator('iframe.pdf').waitFor();
    ok('apercu reel dans la page (sans code consomme)', q('SELECT COUNT(*) FROM code_etiquette') === '0');
    await p.getByRole('button', { name: 'Cocher pour l\'impression' }).click();
    await p.keyboard.press('Escape');
    await p.getByRole('button', { name: 'Quitter sans enregistrer' }).click();
    await p.waitForURL(/\/catalogue/);
    ok('quitter sans enregistrer : lot inchange', q("SELECT lot FROM produit WHERE cip = '3400930000014'") === 'A2410B');
    await p.getByLabel(/Rechercher/).fill('3400930000038');
    await p.getByLabel(/Rechercher/).press('Enter');
    await p.getByText('coché pour l\'impression').waitFor();
    ok('2 produits coches (fiche + scan)', (await texte('nav .compte')) === '2');

    // creation : Ctrl+N, Entree pour avancer, enregistrement a la fin
    await p.keyboard.press('Control+n');
    await p.waitForURL(/\/produit\/nouveau/);
    await p.locator('#f-cip').waitFor();
    ok('nouveau produit : focus sur le CIP', await p.evaluate(() => document.activeElement.id === 'f-cip'));
    await p.keyboard.type('3400930000083');
    await p.keyboard.press('Enter');
    await p.keyboard.type('gaviscon menthe');
    await p.keyboard.press('Enter');
    await p.keyboard.type('2100');
    await attendre(400);
    await p.getByRole('button', { name: 'Enregistrer', exact: true }).click();
    await p.waitForURL(/\/produit\/3400930000083/);
    ok('creation : designation en majuscules', q("SELECT designation FROM produit WHERE cip = '3400930000083'") === 'GAVISCON MENTHE');
    await p.getByRole('button', { name: 'Supprimer…' }).click();
    await p.getByRole('button', { name: 'Oui, supprimer' }).click();
    await p.waitForURL(/\/catalogue/);
    ok('suppression confirmee dans la page', q("SELECT COUNT(*) FROM produit WHERE cip = '3400930000083'") === '0');

    /* ---------------------------------------------------------------- impression */
    await menu(/^Imprimer/).click();
    await p.getByRole('heading', { name: /Imprimer 2 produits/ }).waitFor();
    await p.locator('.options .petit b').first().waitFor();
    ok('resume : 2 etiquettes sur 1 page', (await texte('.options .petit')).includes('2 étiquettes sur 1 page'), await texte('.options .petit'));
    await p.getByLabel('Commencer à la case').fill('5');
    await p.waitForFunction(() => document.querySelector('.options .petit').innerText.includes('cases sautées'));
    const cases = await p.locator('.feuille .case').evaluateAll((l) => l.map((c) => c.classList.contains('pleine')));
    ok('apercu : 4 cases sautees puis les etiquettes', cases.slice(0, 4).every((x) => !x) && cases[4] && cases[5] && !cases[6], cases.slice(0, 8).join(','));
    await p.getByLabel('Étiquettes par produit').fill('3');
    await p.waitForFunction(() => document.querySelector('.options .petit').innerText.includes('6 étiquettes'));
    ok('etiquettes par produit : 6', true);
    await p.getByLabel('DataMatrix+ (toutes les informations, code unique)').check();
    await p.getByRole('button', { name: 'Imprimer (PDF)' }).click();
    await p.locator('iframe.pdf').waitFor();
    ok('PDF affiche dans la page', (await texte('.apercu h2')).includes('Étiquettes (PDF)'));
    ok('DataMatrix+ : 6 codes uniques donnes', q('SELECT COUNT(DISTINCT code) FROM code_etiquette') === '6');
    await p.getByRole('button', { name: 'Revenir à l\'aperçu' }).click();
    await p.getByRole('button', { name: 'Page de test' }).click();
    await p.locator('iframe.pdf').waitFor();
    ok('page de test affichee', (await texte('.apercu h2')).includes('Page de test'));
    await p.getByLabel('Format de planche').selectOption('PERSONNALISE');
    await p.getByLabel('Colonnes', { exact: true }).fill('0');
    await p.getByRole('button', { name: 'Enregistrer les réglages' }).click();
    await p.getByText('Nombre entier de 1 à 20 attendu.').waitFor();
    ok('reglage invalide : erreur sous le champ', await p.locator('#p-colonnes').evaluate((e) => e.classList.contains('invalide')));
    await p.getByLabel('Colonnes', { exact: true }).fill('3');
    await p.getByLabel('Lignes', { exact: true }).fill('8');
    await p.getByLabel('Largeur d\'une étiquette (mm)').fill('63,5');
    await p.getByLabel('Hauteur d\'une étiquette (mm)').fill('33,9');
    await p.getByLabel('Nom de la pharmacie (sur l\'étiquette)').fill('PHARMACIE DU LAC');
    await p.getByRole('button', { name: 'Enregistrer les réglages' }).click();
    await p.getByText('Réglages enregistrés.').waitFor();
    ok('reglages enregistres', q("SELECT valeur FROM reglage WHERE cle = 'officine'") === 'PHARMACIE DU LAC' && q("SELECT valeur FROM reglage WHERE cle = 'KEY_ETIQUETTE_LARGEUR_MM'") === '63.5');
    await p.waitForFunction(() => document.querySelector('.options .petit').innerText.includes('24 par page'));
    ok('planche personnalisee : 24 par page, 63,5 × 33,9 mm', (await texte('.options .petit')).includes('63,5 × 33,9 mm'));
    ok('options changees : le PDF deja affiche laisse la place a l\'apercu', await p.locator('.feuille').isVisible());
    ok('apercu : 3 colonnes', (await p.locator('.feuille').evaluate((e) => getComputedStyle(e).gridTemplateColumns.split(' ').length)) === 3);
    await p.getByLabel('Colonnes', { exact: true }).fill('4');
    ok('apercu : suit les colonnes saisies avant enregistrement', await p.waitForFunction(() => getComputedStyle(document.querySelector('.feuille')).gridTemplateColumns.split(' ').length === 4, null, { timeout: 3000 }).then(() => true, () => false));
    await p.getByLabel('Colonnes', { exact: true }).fill('3');
    await p.getByLabel('Format de planche').selectOption('CARRE_38X21_2');

    /* ---------------------------------------------------------------- personnalisation */
    await menu('Personnaliser').click();
    await p.getByRole('heading', { name: 'Personnaliser l\'étiquette' }).waitFor();
    /* choix immediat, avant la fin du chargement initial : c'est lui qui doit s'afficher */
    await p.getByLabel('Type de code', { exact: true }).selectOption('QR_PLUS');
    await p.getByLabel('Planche', { exact: true }).selectOption('CARRE_38X21_2');
    await p.locator('svg.svg text').first().waitFor();
    await p.waitForFunction(() => /Disposition proposée|Dessin d'origine|enregistrée|échelle/.test((document.querySelector('main .bandeau.info') || {}).textContent || ''));
    ok('apercu dessine (texte et code)', (await p.locator('svg.svg text').count()) > 2 && (await p.locator('svg.svg rect').count()) > 50);
    ok('disposition proposee annoncee', (await texte('.bandeau.info')).includes('Disposition proposée'),
      (await p.locator('main .bandeau').allInnerTexts()).join(' / ') + ' / code=' + await p.locator('#p-code').inputValue() + ' modele=' + await p.locator('#p-modele').inputValue()
      + ' dispositions=' + q('SELECT cle FROM disposition') + ' ' + journalCharger.join(' | '));
    ok('code 2D : option « dans le code » proposee', await p.waitForFunction(() => document.querySelectorAll('input[aria-label^="Mettre "]').length > 0, null, { timeout: 3000 }).then(() => true, () => false));
    ok('lisible sur ce format', (await texte('.dessin .bandeau.ok')).includes('lisible'), await texte('.dessin'));
    await p.getByLabel('Produit d\'exemple (CIP)').fill('3400930000014');
    await p.waitForFunction(() => Array.from(document.querySelectorAll('svg.svg text')).some((t) => t.textContent.includes('DOLIPRANE')));
    ok('produit d\'exemple du catalogue', true);
    const avant = await p.locator('svg.svg text').count();
    await p.getByLabel('Imprimer Prix').uncheck();
    await p.waitForFunction((n) => document.querySelectorAll('svg.svg text').length < n, avant);
    ok('element decoche : retire de l\'apercu', true);
    await p.getByLabel('Imprimer Prix').check();
    await p.getByLabel('l Code (mm)').fill('3');
    await p.getByLabel('h Code (mm)').fill('3');
    await p.locator('.dessin .bandeau.erreur').first().waitFor();
    ok('code trop petit : probleme bloquant, enregistrement grise', await p.getByRole('button', { name: 'Enregistrer la disposition' }).isDisabled());
    await p.getByLabel('Type de code', { exact: true }).selectOption('CODE128');
    await p.getByLabel('Type de code', { exact: true }).selectOption('QR_PLUS');
    await p.locator('.dessin .bandeau.ok').waitFor();
    await p.getByRole('button', { name: 'Enregistrer la disposition' }).click();
    await p.getByText('Disposition enregistrée : elle sert').waitFor();
    ok('disposition enregistree', q('SELECT COUNT(*) FROM disposition') === '1');
    await p.getByRole('button', { name: 'Essai sur papier (PDF)' }).click();
    await p.locator('iframe.pdf').waitFor();
    ok('essai sur papier dans la page', true);
    await p.getByRole('button', { name: 'Rétablir la disposition d\'origine' }).click();
    await p.getByText('Disposition d\'origine rétablie').waitFor();
    ok('disposition retablie', q('SELECT COUNT(*) FROM disposition') === '0');

    /* ---------------------------------------------------------------- compte, session */
    await p.getByRole('link', { name: 'admin' }).click();
    await p.getByLabel('Mot de passe actuel').fill('admin');
    await p.getByLabel('Nouveau mot de passe', { exact: true }).fill('abc');
    await p.getByLabel('Nouveau mot de passe (encore)').fill('abc');
    await p.getByRole('button', { name: 'Enregistrer le mot de passe' }).click();
    await p.getByText('au moins 6 caractères').waitFor();
    ok('mot de passe trop court : refuse dans la page', true);
    await ctx.clearCookies();
    await menu('Catalogue').click();
    await p.waitForURL(/\/connexion/);
    ok('session expiree : retour a la connexion avec message', (await texte('main, body')).includes('Session expirée'));
    await p.getByLabel('Mot de passe').fill('admin');
    await p.getByLabel('Mot de passe').press('Enter');
    await p.waitForURL(/\/catalogue/);
    await p.getByRole('button', { name: 'Se déconnecter' }).click();
    await p.waitForURL(/\/connexion/);
    ok('deconnexion', true);

    /* ---------------------------------------------------------------- ergonomie */
    const mobile = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const m = await mobile.newPage();
    m.on('pageerror', (e) => err.push('mobile: ' + e.message));
    await m.goto(URL0 + '/connexion');
    await m.getByLabel('Mot de passe').fill('admin');
    await m.getByLabel('Mot de passe').press('Enter');
    await m.waitForURL(/\/catalogue/);
    for (const page of ['/catalogue', '/import', '/impression', '/personnalisation', '/produit/3400930000014']) {
      await m.goto(URL0 + page);
      await m.waitForTimeout(600);
      const deborde = await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      ok('telephone (390 px) sans defilement horizontal : ' + page, !deborde);
    }
    const petits = await m.evaluate(() => Array.from(document.querySelectorAll('button.bouton, a.bouton'))
      .filter((e) => e.offsetParent && e.getBoundingClientRect().height < 44).map((e) => e.textContent.trim()));
    ok('boutons de 44 px au moins', petits.length === 0, petits.join(', '));
    await mobile.close();
    ok('aucune fenetre surgissante, aucune erreur de page ni de CSP', err.length === 0, err.join(' | '));

    /* arret de l'application depuis « Mon compte » (dernier pas : le serveur s'arrete) */
    if (process.env.ETIQUETTAGE_TEST_ARRET !== 'non') {
      await p.goto(URL0 + '/connexion');
      await p.getByLabel('Mot de passe').fill('admin');
      await p.getByLabel('Mot de passe').press('Enter');
      await p.waitForURL(/\/catalogue/);
      await p.goto(URL0 + '/compte');
      await p.getByRole('button', { name: 'Arrêter l\'application…' }).click();
      ok('arret : confirmation dans la page', await p.getByText('Arrêter l\'application maintenant ?').waitFor({ timeout: 3000 }).then(() => true, () => false));
      await p.getByRole('button', { name: 'Oui, arrêter' }).click();
      await p.getByText('Vous pouvez fermer cet onglet.').waitFor();
      let arrete = false;
      for (let i = 0; i < 30 && !arrete; i++) {
        await attendre(500);
        arrete = await fetch(URL0 + '/api/etat').then(() => false, () => true);
      }
      ok('arret : le serveur ne repond plus', arrete);
    }
  } catch (e) {
    ok('deroulement', false, e.stack);
    console.log('URL : ' + p.url() + '\nECRAN :\n' + (await p.locator('body').innerText().catch(() => '')).slice(0, 5000));
    console.log('ERREURS : ' + err.join(' | '));
  } finally {
    await b.close();
    vider();
    fs.rmSync(TMP, { recursive: true, force: true });
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' verifications');
    process.exit(ko ? 1 : 0);
  }
})();
