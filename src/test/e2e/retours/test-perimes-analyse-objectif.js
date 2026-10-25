/* PERIMES — ONGLET ANALYSE : OBJECTIF, INTERVALLES, PLUS FREQUENTS (retours du 13/10, point 4). Par l'ecran, admin.
 * Jeu d'essai en septembre 2026 (mois de ventes du banc) : 4 saisies sur 3 produits, retirees a la fin.
 *  - taux de peremption (valeur perimee / CA) compare a l'objectif (0,5 % par defaut, reglable a l'ecran) :
 *    vert sous l'objectif, rouge au-dessus ; l'objectif s'enregistre (confirmation dans le bouton, aucune fenetre) ;
 *  - evolution par semaine, mois, trimestre ou annee (au choix) ; les intervalles couvrent toute la valeur ;
 *  - produits « Les plus fréquents » (nombre de saisies) a cote du classement par valeur.
 * L'objectif d'origine est remis.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN'], { input: s, encoding: 'utf8' }).trim();
const USER = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const P = q(`SELECT lg_FAMILLE_ID, int_PRICE FROM t_famille WHERE str_STATUT = 'enable' AND int_PRICE > 1000 ORDER BY lg_FAMILLE_ID LIMIT 3`).split('\n').map((l) => l.split('\t'));
/* P[0] 2 fois (1 + 1 unite), P[1] une fois 6 unites : P[1] pese plus en valeur si son prix le permet, P[0] est le plus frequent */
const SAISIES = [[P[0], 1, '2026-09-05'], [P[0], 1, '2026-09-22'], [P[1], 6, '2026-09-10'], [P[2], 1, '2026-09-15']];
const VALEUR = SAISIES.reduce((s, x) => s + x[1] * Number(x[0][1]), 0);
const OBJECTIF0 = q("SELECT IFNULL((SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_OBJECTIF_TAUX_PEREMPTION'), 'ABSENT')");
const nettoyer = () => q("DELETE FROM t_warehouse WHERE lg_WAREHOUSE_ID LIKE 'E2E-PEO-%'");

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
  const err = [], dialogues = [];
  p.on('pageerror', (e) => err.push(String(e.message)));
  p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  try {
    ok('Précondition : objectif présent (0,5 % par défaut)', OBJECTIF0 !== 'ABSENT', OBJECTIF0);
    nettoyer();
    q(SAISIES.map((s, i) => `INSERT INTO t_warehouse (lg_WAREHOUSE_ID, lg_USER_ID, lg_FAMILLE_ID, int_NUM_LOT, int_NUMBER, dt_CREATED, dt_UPDATED, dt_PEREMPTION, str_STATUT, stock_initial, stock_final)
      VALUES ('E2E-PEO-${i}', '${USER}', '${s[0][0]}', 'LOT${i}', ${s[1]}, '${s[2]} 10:00:00', '${s[2]} 10:00:00', '${s[2]}', 'delete', 10, ${10 - s[1]});`).join(''));
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(2000);
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('saisieperime', 'Saisie des périmés', ''));
    await p.waitForFunction(() => Ext.ComponentQuery.query('saisieperimeonglets').length > 0, null, { timeout: 30000 });
    const ouvrir = async () => {
      await p.evaluate(() => { const o = Ext.ComponentQuery.query('saisieperimeonglets')[0]; o.donnees = null; o.analyse.down('#spDebut').setValue(new Date(2026, 8, 1));
        o.analyse.down('#spFin').setValue(new Date(2026, 8, 30)); o.afficher('analyse'); });
      await p.waitForFunction(() => !!Ext.ComponentQuery.query('saisieperimeonglets')[0].donnees, null, { timeout: 30000 });
    };
    await ouvrir();
    const etat = () => p.evaluate(() => { const o = Ext.ComponentQuery.query('saisieperimeonglets')[0], d = o.analyse.down('#spContenu').getEl().dom;
      const tuile = d.querySelector('.sp-hors-objectif, .sp-objectif-atteint'), tb = d.querySelector('table.sp-par-produit');
      return { tuile: tuile ? tuile.className : '', texteTuile: tuile ? tuile.innerText.replace(/\s+/g, ' ') : '', objectif: o.analyse.down('#spObjectif').getValue(),
        periodes: [...d.querySelectorAll('tr.sp-periode td:first-child')].map((x) => x.innerText), couleurs: [...d.querySelectorAll('tr.sp-periode td:last-child')].map((x) => x.style.color),
        titreProduits: tb ? tb.previousElementSibling.innerText : '', premier: tb && tb.querySelector('tr.sp-produit') ? [...tb.querySelector('tr.sp-produit').children].map((x) => x.innerText) : [],
        donnees: o.donnees }; });
    let e = await etat();
    const api = e.donnees;
    ok('Objectif affiché à l\'écran (valeur enregistrée)', Math.abs(e.objectif - Number(OBJECTIF0)) < 1e-9, e.objectif);
    ok('Tuile « Taux de péremption » comparée à l\'objectif', /Taux de péremption/.test(e.texteTuile) && /objectif </.test(e.texteTuile)
      && (api.total.ratio < api.objectif ? /sp-objectif-atteint/.test(e.tuile) : /sp-hors-objectif/.test(e.tuile)), e.tuile + ' / ' + e.texteTuile);

    /* objectif tres bas : rouge ; tres haut : vert ; enregistre */
    const regler = async (v) => {
      await p.evaluate((v) => { const o = Ext.ComponentQuery.query('saisieperimeonglets')[0]; o.analyse.down('#spObjectif').setValue(v); o.analyse.down('#spObjectifEnregistrer').btnEl.dom.click(); }, v);
      await p.waitForFunction(() => /enregistré|Entre|Refus|répondu/.test(Ext.ComponentQuery.query('saisieperimeonglets #spObjectifEnregistrer')[0].getText()), null, { timeout: 10000 }).catch(() => {});
      return p.evaluate(() => Ext.ComponentQuery.query('saisieperimeonglets #spObjectifEnregistrer')[0].getText());
    };
    let msg = await regler(0.01);
    e = await etat();
    ok('Objectif 0,01 % : enregistré (message dans le bouton), taux en rouge', /Objectif enregistré/.test(msg) && /sp-hors-objectif/.test(e.tuile)
      && q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_OBJECTIF_TAUX_PEREMPTION'") === '0.01' && e.couleurs.every((c) => /192, 57, 43|c0392b/.test(c) || c === ''), msg + ' ' + e.tuile + ' ' + JSON.stringify(e.couleurs));
    await p.waitForTimeout(2800);
    msg = await regler(20);
    e = await etat();
    ok('Objectif 20 % : taux en vert', /sp-objectif-atteint/.test(e.tuile) && q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_OBJECTIF_TAUX_PEREMPTION'") === '20.0', e.tuile);
    await p.waitForTimeout(2800);
    msg = await regler(45);
    ok('Objectif hors bornes : refusé dans le bouton, rien n\'est enregistré', /Entre 0,01 et 20|entre 0,01 et 20/.test(msg) && q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_OBJECTIF_TAUX_PEREMPTION'") === '20.0', msg);

    /* intervalles */
    for (const [pas, motif] of [['trimestre', /^3e trimestre 2026$/], ['semaine', /^Semaine \d{2} 2026$/], ['annee', /^2026$/], ['mois', /^sept\. 2026$/]]) {
      await p.evaluate((pas) => { const o = Ext.ComponentQuery.query('saisieperimeonglets')[0], c = o.analyse.down('#spPas'); o.donnees = null; c.setValue(pas); c.fireEvent('select', c, [c.getStore().findRecord('v', pas)]); }, pas);
      await p.waitForFunction(() => !!Ext.ComponentQuery.query('saisieperimeonglets')[0].donnees, null, { timeout: 30000 });
      e = await etat();
      const somme = e.donnees.periodes.reduce((s, x) => s + x.valeur, 0);
      ok('Par ' + pas + ' : intervalles affichés et valeur totale retrouvée', e.donnees.pas === pas && e.periodes.length >= 1 && e.periodes.every((x) => motif.test(x)) && somme === VALEUR,
        JSON.stringify(e.periodes) + ' somme ' + somme + ' / ' + VALEUR);
    }

    /* plus frequents */
    ok('API : les plus fréquents classés par nombre de saisies', api.frequents.length === 3 && api.frequents[0].fois === 2 && api.frequents[0].quantite === 2, JSON.stringify(api.frequents[0]));
    await p.evaluate(() => Ext.ComponentQuery.query('saisieperimeonglets #spTriFrequence')[0].btnEl.dom.click());
    e = await etat();
    ok('Écran : « Les plus fréquents » en tête le produit périmé 2 fois', /plus souvent/.test(e.titreProduits) && e.premier[3] === '2', JSON.stringify(e.premier) + ' ' + e.titreProduits);
    await p.evaluate(() => Ext.ComponentQuery.query('saisieperimeonglets #spTriValeur')[0].btnEl.dom.click());
    e = await etat();
    ok('Retour « Par valeur »', /par valeur/.test(e.titreProduits), e.titreProduits);
    ok('Aucune fenêtre surgissante, aucune erreur JavaScript', dialogues.length === 0 && err.length === 0, dialogues.concat(err).join(' | '));
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack);
  } finally {
    nettoyer();
    if (OBJECTIF0 !== 'ABSENT') {
      q(`UPDATE t_parameters SET str_VALUE = '${OBJECTIF0}' WHERE str_KEY = 'KEY_OBJECTIF_TAUX_PEREMPTION'`);
    }
    await b.close();
    ok('Saisies d\'essai retirées, objectif d\'origine remis', q("SELECT COUNT(*) FROM t_warehouse WHERE lg_WAREHOUSE_ID LIKE 'E2E-PEO-%'") === '0'
      && q("SELECT IFNULL((SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_OBJECTIF_TAUX_PEREMPTION'), 'ABSENT')") === OBJECTIF0);
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
