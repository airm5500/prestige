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
    await p.waitForFunction(() => { const s = document.getElementById('ep-dci'); return s && !s.disabled; }, null, { timeout: 20000 });
    const options = await p.evaluate(() => Array.prototype.slice.call(document.getElementById('ep-dci').options).map((o) => [o.value, o.textContent]));
    ok('Le sélecteur est sous la zone de recherche et propose EXACTEMENT les DCI qui ont des produits, avec leur nombre',
      options.length === attendues.length + 1 && attendues.every((a) => options.some((o) => o[0] === a[0] && o[1] === a[1] + ' (' + a[2] + ')')),
      options.map((o) => o[1]).join(' | '));
    const sousLaRecherche = await p.evaluate(() => document.getElementById('ep-dci').getBoundingClientRect().top > document.getElementById('ep-q').getBoundingClientRect().bottom);
    ok('Il est placé sous le champ de recherche', sousLaRecherche);

    const [idDci, nomDci, nbDci] = attendues[0];
    const produitsAttendus = q("SELECT f.str_NAME FROM t_famille f JOIN t_famille_dci fd ON fd.lg_FAMILLE_ID=f.lg_FAMILLE_ID AND fd.str_STATUT='enable'"
      + " JOIN t_famille_stock s ON s.lg_FAMILLE_ID=f.lg_FAMILLE_ID AND s.str_STATUT='enable'"
      + " WHERE fd.lg_DCI_ID='" + idDci + "' AND f.str_STATUT='enable' ORDER BY f.str_NAME").split('\n').filter(Boolean);
    await p.selectOption('#ep-dci', idDci);
    await p.waitForFunction((n) => document.querySelectorAll('#ep-corps tr').length === n && !document.querySelector('#ep-corps .ep-vide'), produitsAttendus.length, { timeout: 15000 });
    const lignes = await p.evaluate(() => Array.prototype.slice.call(document.querySelectorAll('#ep-corps tr')).map((tr) => tr.children[1].textContent));
    ok('Choisir « ' + nomDci + ' » sans rien taper liste EXACTEMENT ses produits', JSON.stringify(lignes) === JSON.stringify(produitsAttendus), lignes.join(' | '));
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
    const valeur = await p.evaluate(() => document.getElementById('ep-dci').value);
    const lignesTexte = await p.evaluate(() => document.querySelectorAll('#ep-corps tr').length);
    ok('« Effacer » rend la recherche par texte, qui trouve EXACTEMENT ce qu elle trouvait avant', valeur === '' && lignesTexte === Math.min(attendusTexte, 50), lignesTexte + ' ligne(s) pour « ' + morceau + ' » seul, ' + attendusTexte + ' en base');

    /* L'API, en direct. */
    const refus = await p.evaluate(async () => (await fetch('../api/v1/espace-produit/recherche?q=a')).json());
    ok('L API refuse toujours une recherche sans DCI ni deux caractères', refus.total === 0);
    const parDci = await p.evaluate(async (id) => (await fetch('../api/v1/espace-produit/recherche?dci=' + id)).json(), idDci);
    ok('Et sert une DCI seule', parDci.total === produitsAttendus.length, parDci.total);
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
