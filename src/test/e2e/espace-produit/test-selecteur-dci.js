/* ESPACE PRODUIT : LE SELECTEUR DE DCI (demande de l'officine du 21/09).
 *
 * L'Espace produit est la page LIBRE de l'ecran de connexion : on y cherche un produit par CIP ou par nom,
 * sans compte. « Ajouter un selecteur de DCI en bas de la zone de recherche pour afficher les produits
 * concernes par la DCI selectionnee. »
 *
 * CE QUE CE TEST ETABLIT, sur la page reelle, sans connexion :
 *  - le selecteur ne propose que les DCI qui ont des produits, avec leur nombre ;
 *  - choisir une DCI liste EXACTEMENT ses produits, sans rien taper ;
 *  - un texte ET une DCI se restreignent l'un l'autre ;
 *  - « Effacer » rend la recherche par texte, qui marche comme avant (aucune regression) ;
 *  - l'API refuse toujours une recherche sans DCI ni deux caracteres.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1300, height: 900 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    const attendues = q("SELECT CONCAT(d.lg_DCI_ID,'|',d.str_NAME,'|',COUNT(DISTINCT f.lg_FAMILLE_ID)) FROM t_dci d"
      + " JOIN t_famille_dci fd ON fd.lg_DCI_ID=d.lg_DCI_ID AND fd.str_STATUT='enable'"
      + " JOIN t_famille f ON f.lg_FAMILLE_ID=fd.lg_FAMILLE_ID AND f.str_STATUT='enable'"
      + " WHERE d.str_STATUT='enable' GROUP BY d.lg_DCI_ID, d.str_NAME ORDER BY d.str_NAME").split('\n').filter(Boolean).map((l) => l.split('|'));
    ok('Précondition : le banc porte des DCI rattachées à des produits', attendues.length >= 2, attendues.length + ' DCI');

    await p.goto('http://localhost:8080/prestige/security/espace-produit.html', { waitUntil: 'domcontentloaded' });
    await p.waitForSelector('#ep-dci');
    const sousLaRecherche = await p.evaluate(() => document.getElementById('ep-dci').getBoundingClientRect().top > document.getElementById('ep-q').getBoundingClientRect().bottom);
    ok('Le champ de DCI est un champ de SAISIE, placé sous la zone de recherche', sousLaRecherche && await p.evaluate(() => document.getElementById('ep-dci').tagName === 'INPUT'));

    /* On TAPE : la liste des DCI qui contiennent le texte s'ouvre, toutes les DCI, meme sans produit. */
    const [idDci, nomDci] = attendues[0];
    const morceauDci = nomDci.slice(1, 5);
    const attenduesListe = q("SELECT COUNT(*) FROM t_dci WHERE str_STATUT='enable' AND (str_NAME LIKE '%" + morceauDci + "%' OR str_CODE LIKE '%" + morceauDci + "%')");
    await p.fill('#ep-dci', morceauDci);
    await p.waitForFunction(() => document.getElementById('ep-dci-liste').style.display === 'block' && document.querySelectorAll('#ep-dci-liste div[data-id]').length > 0, null, { timeout: 15000 });
    const propositions = await p.evaluate(() => Array.prototype.slice.call(document.querySelectorAll('#ep-dci-liste div[data-id]')).map((d) => d.getAttribute('data-nom')));
    ok('Taper « ' + morceauDci + ' » ouvre la liste des DCI qui le CONTIENNENT, toutes les DCI (30 au plus), pas seulement celles qui ont des produits',
      propositions.length === Math.min(30, Number(attenduesListe)) && propositions.every((n) => n.toUpperCase().indexOf(morceauDci.toUpperCase()) >= 0) && propositions.indexOf(nomDci) >= 0,
      propositions.length + ' proposée(s) pour ' + attenduesListe + ' en base');

    /* On choisit la DCI qui a des produits : ils s'affichent, sans rien taper dans la recherche. */
    const produitsAttendus = q("SELECT f.str_NAME FROM t_famille f JOIN t_famille_dci fd ON fd.lg_FAMILLE_ID=f.lg_FAMILLE_ID AND fd.str_STATUT='enable'"
      + " JOIN t_famille_stock s ON s.lg_FAMILLE_ID=f.lg_FAMILLE_ID AND s.str_STATUT='enable'"
      + " WHERE fd.lg_DCI_ID='" + idDci + "' AND f.str_STATUT='enable' ORDER BY f.str_NAME").split('\n').filter(Boolean);
    await p.click('#ep-dci-liste div[data-id="' + idDci + '"]');
    await p.waitForFunction((n) => document.querySelectorAll('#ep-corps tr').length === n && !document.querySelector('#ep-corps .ep-vide'), produitsAttendus.length, { timeout: 15000 });
    const lignes = await p.evaluate(() => Array.prototype.slice.call(document.querySelectorAll('#ep-corps tr')).map((tr) => tr.children[1].textContent));
    ok('Choisir « ' + nomDci + ' » dans la liste affiche EXACTEMENT ses produits', JSON.stringify(lignes) === JSON.stringify(produitsAttendus) && await p.evaluate(() => document.getElementById('ep-dci').value) === nomDci, lignes.join(' | '));
    const compteur = await p.evaluate(() => document.getElementById('ep-total').textContent);
    ok('Et le compteur les compte', compteur.indexOf(produitsAttendus.length + ' produit') === 0, compteur);

    /* Texte + DCI. */
    const morceau = produitsAttendus[0].slice(0, 12);
    const attendusMixte = produitsAttendus.filter((n) => n.toUpperCase().indexOf(morceau.toUpperCase()) >= 0);
    await p.fill('#ep-q', morceau);
    await p.waitForTimeout(900);
    await p.waitForFunction((n) => document.querySelectorAll('#ep-corps tr').length === n, attendusMixte.length, { timeout: 15000 });
    const mixte = await p.evaluate(() => Array.prototype.slice.call(document.querySelectorAll('#ep-corps tr')).map((tr) => tr.children[1].textContent));
    ok('Un texte ET une DCI se restreignent l un l autre', JSON.stringify(mixte) === JSON.stringify(attendusMixte), mixte.length + ' ligne(s) pour « ' + morceau + ' » dans la DCI');

    /* Effacer : la recherche par texte seule, comme avant. */
    const attendusTexte = Number(q("SELECT COUNT(*) FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID=f.lg_FAMILLE_ID AND s.str_STATUT='enable'"
      + " WHERE f.str_STATUT='enable' AND (f.int_CIP LIKE '%" + morceau + "%' OR f.str_NAME LIKE '%" + morceau + "%' OR f.int_EAN13 LIKE '%" + morceau + "%')"));
    await p.click('#ep-dci-effacer');
    await p.waitForFunction((n) => document.querySelectorAll('#ep-corps tr').length === Math.min(n, 50), attendusTexte, { timeout: 15000 });
    const valeur = await p.evaluate(() => document.getElementById('ep-dci-id').value + '|' + document.getElementById('ep-dci').value);
    const lignesTexte = await p.evaluate(() => document.querySelectorAll('#ep-corps tr').length);
    ok('« Effacer » rend la recherche par texte, qui trouve EXACTEMENT ce qu elle trouvait avant', valeur === '|' && lignesTexte === Math.min(attendusTexte, 50), lignesTexte + ' ligne(s) pour « ' + morceau + ' » seul, ' + attendusTexte + ' en base');

    /* Une DCI SANS produit : on l'informe, au lieu d'une liste muette. */
    await p.fill('#ep-q', '');
    const sansProduit = q("SELECT CONCAT(d.lg_DCI_ID,'|',d.str_NAME) FROM t_dci d WHERE d.str_STATUT='enable' AND NOT EXISTS (SELECT 1 FROM t_famille_dci fd WHERE fd.lg_DCI_ID=d.lg_DCI_ID AND fd.str_STATUT='enable') AND LENGTH(d.str_NAME) BETWEEN 6 AND 20 ORDER BY d.str_NAME LIMIT 1").split('|');
    await p.fill('#ep-dci', sansProduit[1].slice(0, 6));
    await p.waitForFunction((id) => !!document.querySelector('#ep-dci-liste div[data-id="' + id + '"]'), sansProduit[0], { timeout: 15000 });
    await p.click('#ep-dci-liste div[data-id="' + sansProduit[0] + '"]');
    await p.waitForFunction((nom) => { const v = document.querySelector('#ep-corps .ep-vide'); return v && v.textContent.indexOf('Aucun produit trouvé pour la DCI') >= 0 && v.textContent.indexOf(nom) >= 0; }, sansProduit[1], { timeout: 15000 });
    ok('Une DCI existante mais sans produit dit « Aucun produit trouvé pour la DCI « ' + sansProduit[1] + ' » »', true);
    await p.click('#ep-dci-effacer');

    /* L'API, en direct. */
    const refus = await p.evaluate(async () => (await fetch('../api/v1/espace-produit/recherche?q=a')).json());
    ok('L API refuse toujours une recherche sans DCI ni deux caractères', refus.total === 0);
    const parDci = await p.evaluate(async (id) => (await fetch('../api/v1/espace-produit/recherche?dci=' + id)).json(), idDci);
    ok('Et sert une DCI seule', parDci.total === produitsAttendus.length, parDci.total);
    const listeVide = await p.evaluate(async () => (await fetch('../api/v1/espace-produit/dci?q=')).json());
    ok('La liste des DCI exige un texte : sans rien, elle ne rend rien (pas d export du référentiel)', listeVide.total === 0);
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Le parcours va au bout', false, e.message + ' ' + (e.stack || '').split('\n')[1]);
  } finally {
    await b.close();
    const kos = res.filter((r) => !r.c);
    console.log('\n' + res.filter((r) => r.c).length + '/' + res.length + ' controles OK');
    process.exit(kos.length ? 1 : 0);
  }
})();
