/* VENTES EN ATTENTE (maquette validee le 30/09) : nouvelle fenetre, liste en cartes et detail.
 *
 * Caissier KGA3 : deux ventes mises en attente (memes appels que l'ecran de vente), puis l'ecran de vente, bouton
 * « VENTES EN ATTENTE ». La premiere est ouverte d'office, les fleches changent de vente, la recherche filtre, Entree
 * rappelle la vente choisie dans la caisse. Ventes de test retirees a la fin.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const crees = [];

(async () => {
  const produits = q("SELECT f.lg_FAMILLE_ID, f.int_PRICE FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID=f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID='1'"
    + " WHERE s.int_NUMBER_AVAILABLE>10 AND f.int_PRICE>0 AND f.str_STATUT='enable' ORDER BY f.str_NAME LIMIT 2").split('\n').map((l) => l.split('\t'));
  const user = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='" + (process.env.E2E_LOGIN || 'admin') + "'");
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } });
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', process.env.E2E_LOGIN || 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(2000);
    /* Deux ventes en attente, d'un produit chacune. */
    const ajouter = (produit, venteId) => p.evaluate(async (a) => JSON.parse(await (await fetch('../api/v1/vente/add/vno', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(a) })).text()),
      { typeVenteId: '1', natureVenteId: '1', produitId: produit[0], itemPu: Number(produit[1]), qte: 1, qteServie: 1, devis: false, remiseId: '', venteId: venteId, userVendeurId: user, prevente: false });
    const v1 = (await ajouter(produits[0], null)).data.lgPREENREGISTREMENTID; crees.push(v1);
    await p.waitForTimeout(1100);
    const v2 = (await ajouter(produits[1], null)).data.lgPREENREGISTREMENTID; crees.push(v2);
    const refs = q("SELECT GROUP_CONCAT(str_REF ORDER BY dt_CREATED) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN ('" + v1 + "','" + v2 + "')").split(',');
    ok('Deux ventes en attente créées', refs.length === 2, refs.join(','));

    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('doventemanager', { isEdit: false, record: {} }));
    await p.waitForFunction(() => Ext.ComponentQuery.query('doventemanager #preventeSearchBtn').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    await p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('doventemanager #preventeSearchBtn')[0].getId()));
    await p.waitForFunction(() => { const w = Ext.ComponentQuery.query('ventesattentefenetre')[0]; return w && w.getEl().dom.querySelectorAll('.va-carte').length >= 2; }, null, { timeout: 20000 });
    await p.waitForFunction(() => !!document.querySelector('.va-droite .vc-tableau tbody tr'), null, { timeout: 20000 });
    const f = await p.evaluate(() => { const w = Ext.ComponentQuery.query('ventesattentefenetre')[0]; const d = w.getEl().dom;
      return { modal: w.modal, barreExt: !!d.querySelector('.x-window-header'), boutonsExt: d.querySelectorAll('.x-btn').length, cartes: [...d.querySelectorAll('.va-carte')].map((c) => c.querySelector('.va-ticket').textContent),
        active: (d.querySelector('.va-carte-active .va-ticket') || {}).textContent, tuiles: d.querySelectorAll('.va-droite .vc-tuile').length, lignes: d.querySelectorAll('.va-droite tbody tr').length,
        titre: d.querySelector('[data-va=titre]').textContent, focus: document.activeElement === d.querySelector('[data-va=recherche]'), ancienne: Ext.ComponentQuery.query('#preventeListGrid').length }; });
    ok('Nouvelle fenêtre : dessin propre (ni barre de titre ni bouton ExtJS), l\'ancienne grille n\'existe plus', f.modal && !f.barreExt && f.boutonsExt === 0 && f.ancienne === 0, JSON.stringify(f));
    ok('Liste en cartes, la plus récente d\'abord ; la première est ouverte d\'office (détail et articles affichés)', f.cartes[0] === refs[1] && f.cartes.indexOf(refs[0]) > 0 && f.active === refs[1] && f.tuiles === 4 && f.lignes === 1, JSON.stringify(f));
    const actif = await p.evaluate(() => { const a = document.activeElement; return a ? a.tagName + '#' + a.id + '.' + a.className : ''; });
    ok('Titre : nombre de préventes, curseur dans la recherche', /prévente/.test(f.titre) && f.focus, f.titre + ' ' + actif);
    const pied = await p.evaluate(() => { const d = Ext.ComponentQuery.query('ventesattentefenetre')[0].getEl().dom; const f = d.querySelector('[data-action=fermer].vc-bouton-second'), r = d.querySelector('[data-action=rappeler]');
      return { memeLigne: Math.abs(f.getBoundingClientRect().top - r.getBoundingClientRect().top) < 3, texte: r.textContent }; });
    ok('Pied : « Fermer » et « Rappeler cette prévente » sur la même ligne, sans « Entrée » dans le bouton', pied.memeLigne && pied.texte === 'Rappeler cette prévente', JSON.stringify(pied));
    const i1 = f.cartes.indexOf(refs[0]);
    for (let i = 0; i < i1; i++) { await p.keyboard.press('ArrowDown'); await p.waitForTimeout(150); }
    await p.waitForTimeout(1200);
    const apres = await p.evaluate(() => { const d = Ext.ComponentQuery.query('ventesattentefenetre')[0].getEl().dom; return { active: (d.querySelector('.va-carte-active .va-ticket') || {}).textContent, lignes: d.querySelectorAll('.va-droite tbody tr').length }; });
    ok('Flèche bas : la vente suivante est choisie, son détail suit', apres.active === refs[0] && apres.lignes === 1, JSON.stringify(apres));
    await p.keyboard.type(refs[1].slice(-5));
    await p.waitForTimeout(400);
    const filtre = await p.evaluate(() => [...document.querySelectorAll('.va-carte .va-ticket')].map((x) => x.textContent));
    ok('La recherche filtre la liste en direct', filtre.length === 1 && filtre[0] === refs[1], filtre.join(','));
    await p.keyboard.press('Backspace'); await p.keyboard.press('Backspace'); await p.keyboard.press('Backspace'); await p.keyboard.press('Backspace'); await p.keyboard.press('Backspace');
    await p.waitForTimeout(300);
    /* Clic sur une carte, puis Entree : rappel. */
    await p.evaluate((r) => { const c = [...document.querySelectorAll('.va-carte')].find((x) => x.querySelector('.va-ticket').textContent === r); c.id = 'carte-visee'; }, refs[0]);
    await p.click('#carte-visee'); await p.waitForTimeout(900);
    await p.keyboard.press('Enter');
    await p.waitForFunction(() => Ext.ComponentQuery.query('ventesattentefenetre').length === 0, null, { timeout: 10000 });
    await p.waitForFunction((id) => { const c = testextjs.app.getController('VenteCtr'); return c.getCurrent && c.getCurrent() && c.getCurrent().lgPREENREGISTREMENTID === id; }, v1, { timeout: 20000 });
    ok('Entrée : la fenêtre se ferme et la vente choisie est rappelée dans la caisse', true);
    await p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('doventemanager #preventeSearchBtn')[0].getId()));
    await p.waitForFunction(() => Ext.ComponentQuery.query('ventesattentefenetre').length === 1, null, { timeout: 10000 });
    await p.waitForTimeout(800);
    await p.keyboard.press('Escape'); await p.waitForTimeout(500);
    ok('Échap ferme la fenêtre', (await p.evaluate(() => Ext.ComponentQuery.query('ventesattentefenetre').length)) === 0);
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Parcours sans exception', false, e.message);
  } finally {
    await b.close();
    for (const id of crees) {
      exec("DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID='" + id + "'; DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID='" + id + "';");
    }
    ok('Ventes de test retirées', crees.every((id) => q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID='" + id + "'") === '0'));
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
