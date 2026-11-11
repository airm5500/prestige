/* PLAN DU 08/11, POINT 15.8 (Q17) : CARTE D'AFFLUENCE DE 0 H A 23 H, SELECTEUR DE GARDE, CONTROLE DES GARDES.
 * Jeu d'essai (retire a la fin) : deux gardes d'essai sur une periode reelle du banc (ventes de nuit) :
 *   G1 du jour J 20 h au lendemain 8 h (couvre la nuit de J) ; G2 du jour J+1 20 h au lendemain 8 h.
 * Par l'ecran (admin, 1366 x 768), Activite des equipes > Analyses, periode J -> J+1 saisie au clavier, « Actualiser » :
 *  - carte : toujours 24 colonnes (0 h a 23 h), 7 jours, cases sans activite en gris, nuit reperee ;
 *  - controle sous la carte = API = base : gardes sans vente, nuits (21 h - 6 h) avec des ventes sans garde, nombre
 *    de ventes par nuit ;
 *  - selecteur de garde (clic dans la liste) : carte de G1 = ses ventes, case par case (jour x heure) = base ;
 *    total au titre = base ; « Toute la période » revient a la carte de la periode ;
 *  - aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).replace(/\r/g, '').trim();
/* jour J : le plus recent du banc avec au moins 5 ventes de nuit (21 h - 6 h) */
const J = q("SELECT d FROM (SELECT DATE(p.dt_CREATED - INTERVAL 6 HOUR) d, COUNT(*) n FROM t_preenregistrement p WHERE p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0"
  + " AND p.int_PRICE > 0 AND p.lg_TYPE_VENTE_ID <> '5' AND (HOUR(p.dt_CREATED) >= 21 OR HOUR(p.dt_CREATED) < 6) AND p.dt_CREATED < CURDATE() - INTERVAL 2 DAY"
  + " GROUP BY 1 HAVING n >= 5 ORDER BY d DESC LIMIT 1) x");
const J1 = q(`SELECT '${J}' + INTERVAL 1 DAY`), J2 = q(`SELECT '${J}' + INTERVAL 2 DAY`), J3 = q(`SELECT '${J}' + INTERVAL 3 DAY`);
const G = [['E2E-G158-1', 'ZZE2E garde 1', `${J} 20:00:00`, `${J1} 08:00:00`], ['E2E-G158-2', 'ZZE2E garde 2', `${J1} 20:00:00`, `${J2} 08:00:00`]];
const fr = (d) => d.split('-').reverse().join('/');
/* ventes comme le serveur les lit : encaissees (dt_UPDATED) du debut au lendemain de la fin, au moins une ligne */
const VENTES = `SELECT p.lg_PREENREGISTREMENT_ID, p.dt_CREATED o FROM t_preenregistrement p WHERE p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0`
  + ` AND p.lg_TYPE_VENTE_ID <> '5' AND EXISTS (SELECT 1 FROM t_preenregistrement_detail d WHERE d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID)`;

function nettoyer() { q("DELETE FROM garde WHERE id LIKE 'E2E-G158-%'"); }

(async () => {
  nettoyer();
  ok('Précondition : un jour du banc avec des ventes de nuit, aucune garde déclarée sur J -> J+2', !!J && q(`SELECT COUNT(*) FROM garde WHERE date_debut < '${J3}' AND date_fin > '${J}'`) === '0', J);
  G.forEach(([id, l, d, f]) => q(`INSERT INTO garde (id, libelle, date_debut, date_fin, created_at) VALUES ('${id}', '${l}', '${d}', '${f}', NOW())`));
  /* attendus, base */
  const ventesPeriode = `${VENTES} AND p.dt_UPDATED >= '${J}' AND p.dt_UPDATED < '${J3}'`;
  const parGarde = G.map(([id, l, d, f]) => Number(q(`SELECT COUNT(*) FROM (${ventesPeriode}) v WHERE v.o >= '${d}' AND v.o < '${f}'`)));
  const couvert = G.map(([, , d, f]) => `(v.o >= '${d}' AND v.o < '${f}')`).join(' OR ');
  const nuits = [J, J1].map((d) => ({ d, n: Number(q(`SELECT COUNT(*) FROM (${ventesPeriode}) v WHERE v.o >= '${d} 21:00:00' AND v.o < '${d}' + INTERVAL 30 HOUR AND NOT (${couvert})`)) }))
    .filter((x) => x.n > 0);
  const carteG1 = {};
  q(`SELECT CONCAT(WEEKDAY(v.o) + 1, '|', HOUR(v.o), '|', COUNT(*)) FROM (${VENTES} AND p.dt_UPDATED >= '${J}' AND p.dt_UPDATED < '${J2}') v`
    + ` WHERE v.o >= '${G[0][2]}' AND v.o < '${G[0][3]}' GROUP BY WEEKDAY(v.o), HOUR(v.o)`).split('\n').filter(Boolean)
    .forEach((l) => { const [j, h, n] = l.split('|').map(Number); carteG1[j * 100 + h] = n; });

  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto((process.env.BASE || 'http://localhost:8080/prestige') + '/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app && Ext.ComponentQuery.query('navigation').length, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('activiteequipes', 'Activité des équipes', ''));
    await p.waitForFunction(() => { const a = Ext.ComponentQuery.query('activiteequipes')[0]; return a && a.down('#ae-analyses') && a.down('#ae-analyses').isVisible(true); }, null, { timeout: 60000 });
    await p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('activiteequipes #ae-analyses')[0].getEl().dom.id));
    const saisir = async (item, v) => {
      await p.click('#' + await p.evaluate((x) => Ext.ComponentQuery.query('activiteequipes #' + x)[0].inputEl.dom.id, item));
      await p.keyboard.press('Control+A'); await p.keyboard.type(v, { delay: 15 }); await p.keyboard.press('Tab');
    };
    await saisir('aeDebut', fr(J));
    await saisir('aeFin', fr(J1));
    const [rg] = await Promise.all([p.waitForResponse((r) => /activite-equipes\/gardes/.test(r.url()), { timeout: 180000 }),
      p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('activiteequipes #aeActualiser')[0].getEl().dom.id))]);
    const api = (await rg.json()).data;
    await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('activiteequipes #aeGardes')[0]; return c && c.getEl() && c.getEl().dom.innerText.trim().length > 0; }, null, { timeout: 60000 });
    await p.waitForTimeout(800);
    const e = await p.evaluate(() => { const a = Ext.ComponentQuery.query('activiteequipes')[0], c = a.down('#aeCarte').getEl().dom, t = c.querySelector('table.ae-carte');
      return { th: t ? t.rows[0].cells.length : 0, lignes: t ? t.rows.length : 0, vides: t ? Array.from(t.querySelectorAll('td.vide')).every((x) => /rgb\((223|238)/.test(getComputedStyle(x).backgroundColor)) : false,
        sansVente: Array.from(document.querySelectorAll('.ae-garde-sans-vente')).map((x) => x.innerText), nuits: Array.from(document.querySelectorAll('.ae-nuit-sans-garde')).map((x) => x.innerText),
        ok: (document.querySelector('.ae-gardes-ok') || {}).innerText || '' }; });
    ok('Carte : 0 h à 23 h (24 colonnes), 7 jours, cases sans activité en gris', e.th === 25 && e.lignes === 8 && e.vides, JSON.stringify({ th: e.th, lignes: e.lignes, vides: e.vides }));
    const attSans = G.filter((g, i) => parGarde[i] === 0).map((g) => g[1]);
    ok('Gardes sans vente : écran = API = base', JSON.stringify(e.sansVente.map((x) => (x.match(/ZZE2E garde \d/) || [''])[0])) === JSON.stringify(attSans)
      && JSON.stringify(api.gardesSansVente.map((g) => g.libelle)) === JSON.stringify(attSans), JSON.stringify({ ecran: e.sansVente, api: api.gardesSansVente, base: attSans, parGarde }));
    const nuitsEcran = e.nuits.map((x) => Number((x.match(/: (\d[\d\s ]*) vente/) || [0, -1])[1].replace(/\D/g, '')));
    ok('Nuits avec ventes sans garde : écran = API = base, nuit par nuit (nombre de ventes)', JSON.stringify(nuitsEcran) === JSON.stringify(nuits.map((x) => x.n))
      && JSON.stringify(api.nuitsSansGarde.map((x) => [x.nuit, x.ventes])) === JSON.stringify(nuits.map((x) => [x.d, x.n])), JSON.stringify({ ecran: e.nuits, api: api.nuitsSansGarde, base: nuits }));
    ok('Gardes de la période : chaque garde avec son nombre de ventes = base', JSON.stringify(api.gardes.map((g) => g.ventes)) === JSON.stringify(parGarde), JSON.stringify({ api: api.gardes, base: parGarde }));

    /* selecteur de garde : clic dans la liste */
    await p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('activiteequipes #aeGarde')[0].triggerEl.item(0).dom.id));
    const item = p.locator('.x-boundlist-item').filter({ hasText: 'ZZE2E garde 1' }).first();
    await item.waitFor({ timeout: 15000 });
    const [rc] = await Promise.all([p.waitForResponse((r) => /activite-equipes\/carte-garde\//.test(r.url()), { timeout: 60000 }), item.click()]);
    const apiCarte = (await rc.json()).data;
    await p.waitForTimeout(600);
    const c = await p.evaluate(() => { const t = document.querySelector('.ae-carte'), o = {};
      for (let j = 1; j <= 7; j++) { for (let h = 0; h <= 23; h++) { const v = Number(t.rows[j].cells[h + 1].innerText.replace(/\D/g, '') || 0); if (v) { o[j * 100 + h] = v; } } }
      return { o, titre: (document.querySelector('.ae-carte-titre') || {}).innerText || '', periode: !Ext.ComponentQuery.query('activiteequipes #aeCartePeriode')[0].isDisabled() }; });
    ok('Carte de G1 : case par case (jour × heure) = API = base ; total au titre = base', JSON.stringify(c.o) === JSON.stringify(carteG1) && apiCarte.ventes === parGarde[0]
      && new RegExp('ZZE2E garde 1 : ' + parGarde[0] + ' vente').test(c.titre.replace(/(?<=\d)[\s ](?=\d{3})/g, '')), JSON.stringify({ ecran: c.o, base: carteG1, titre: c.titre, api: apiCarte.ventes }));
    await p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('activiteequipes #aeCartePeriode')[0].getEl().dom.id));
    await p.waitForTimeout(400);
    const retour = await p.evaluate(() => ({ titre: !!document.querySelector('.ae-carte-titre'), garde: Ext.ComponentQuery.query('activiteequipes #aeGarde')[0].getValue(),
      bouton: Ext.ComponentQuery.query('activiteequipes #aeCartePeriode')[0].isDisabled() }));
    ok('« Toute la période » : retour à la carte de la période (sans titre de garde), sélecteur vidé', c.periode && !retour.titre && !retour.garde && retour.bouton, JSON.stringify(retour));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Gardes d\'essai retirées', q("SELECT COUNT(*) FROM garde WHERE id LIKE 'E2E-G158-%'") === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
