/* TAUX DE RUPTURE : UN SEUL REGLAGE POUR LA PREVISION ET LE TABLEAU DE BORD (plan du 09/11, points 5 et 6).
 *
 * Regle : produit vendu frequemment = vendu dans au moins N mois des M derniers mois complets et au moins Q unites sur
 * la periode ; taux = produits frequents dont le stock actuel (rayon + reserve) est nul / produits frequents.
 *
 *  - rapprochement : tuile du menu Prevision = API tableau = API rupture = tuile du tableau de bord (data-taux) = base
 *    (calcul refait ici depuis l'historique des ventes, les parametres et le stock actuel, emplacement 1) ;
 *  - reglage change par l'ecran (champs du panneau « Parametres de calcul », bouton Enregistrer), jeux varies :
 *    (3, 2, 3) d'origine, (6, 1, 1), (2, 2, 10), N plus grand que M : les deux taux suivent, sans recalcul ;
 *  - filtre « En rupture (vendus frequemment) » (clic sur la tuile) : total = ruptures, identifiants = base ;
 *  - liste du tableau de bord (clic sur la ligne du taux) = base, ligne par ligne ;
 *  - filtre « Fiabilite >= X % » saisi dans l'ecran : total = base, chaque ligne au moins X, 0 et 100 essayes ;
 *  - texte « N derniers mois » qui suit KEY_PREVISION_MOIS_TEST ;
 *  - bilan : parametres remis a leur valeur d'origine, aucune autre ecriture.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 28 }).trim();
const CLES = ['KEY_PREVISION_RUPTURE_MOIS', 'KEY_PREVISION_RUPTURE_MOIS_VENTE', 'KEY_PREVISION_RUPTURE_QTE_MIN', 'KEY_PREVISION_MOIS_TEST'];
const valeur = (c) => q("SELECT IFNULL((SELECT str_VALUE FROM t_parameters WHERE str_KEY = '" + c + "'), 'ABSENT')");
const origine = {};
CLES.forEach((c) => { origine[c] = valeur(c); });
const empreinte = () => q("SELECT CONCAT(COUNT(*), '|', IFNULL(MAX(dt_UPDATED), '')) FROM t_parameters WHERE str_KEY NOT IN ('" + CLES.join("','") + "')");

/* reference independante : historique, stock rayon et reserve lus a la source */
const produits = q("SELECT p.lg_FAMILLE_ID, p.historique,"
  + " COALESCE((SELECT SUM(int_NUMBER_AVAILABLE) FROM t_famille_stock s WHERE s.lg_FAMILLE_ID = p.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'), 0),"
  + " COALESCE((SELECT SUM(int_NUMBER) FROM t_type_stock_famille t WHERE t.lg_FAMILLE_ID = p.lg_FAMILLE_ID AND t.lg_EMPLACEMENT_ID = '1' AND t.lg_TYPE_STOCK_ID = '2'), 0)"
  + " FROM t_prevision_produit p JOIN t_famille f ON f.lg_FAMILLE_ID = p.lg_FAMILLE_ID AND f.str_STATUT = 'enable'"
  + " WHERE p.lg_EMPLACEMENT_ID = '1' AND p.historique IS NOT NULL AND p.historique <> ''").split('\n').filter(Boolean).map((l) => {
  const [id, h, rayon, reserve] = l.split('\t');
  return { id, h: h.split(',').map((x) => Number(x.trim()) || 0), rayon: Number(rayon), reserve: Number(reserve) };
});
function reference(m, n, qm) {
  const nn = Math.min(Math.max(1, n), m);
  let frequents = 0; const ids = [];
  for (const p of produits) {
    const d = p.h.slice(Math.max(0, p.h.length - m));
    const vendus = d.filter((v) => v > 0).length, total = d.reduce((a, v) => a + v, 0);
    if (vendus >= nn && total >= qm) {
      frequents++;
      if (Math.max(0, p.rayon) + Math.max(0, p.reserve) <= 0) { ids.push(p.id); }
    }
  }
  return { frequents, ruptures: ids.length, taux: frequents ? Math.round(ids.length * 1000 / frequents) / 10 : 0, ids: ids.sort() };
}

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } });
  const d = await ctx.newPage();
  const err = []; const suivre = (pg) => pg.on('pageerror', (e) => err.push(String(e.message)));
  suivre(d);
  const avant = empreinte();
  try {
    await d.goto((process.env.BASE || 'http://localhost:8080/prestige') + '/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await d.fill('#str_login', ENV_E2E.LOGIN); await d.fill('#str_password', 'e2etest'); await d.click('#login');
    await d.waitForURL('**/general/**', { timeout: 60000 });
    const accueil = d.url();
    await d.waitForFunction(() => Ext.ComponentQuery.query('tableaubord').length && document.querySelector('[data-liste="tauxRupture"]'), null, { timeout: 120000 });

    /* page de la Prevision, meme session */
    const p = await ctx.newPage(); suivre(p);
    await p.goto(accueil, { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app && Ext.ComponentQuery.query('navigation').length
      && Ext.ComponentQuery.query('navigation')[0].getStore()._menuCharge, null, { timeout: 120000 });
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('analysecommande', 'Prévisions', ''));
    await p.waitForFunction(() => { const pc = Ext.ComponentQuery.query('analysecommande #parametresCalcul')[0]; return pc && pc.query('numberfield').length > 0
      && document.querySelector('analysecommande, .ac-tuile'); }, null, { timeout: 90000 });
    const get = (pg, u) => pg.evaluate(async (u) => (await fetch(u)).json(), u);

    const tuilePrevision = () => p.evaluate(() => { const t = Array.from(document.querySelectorAll('.ac-tuile')).find((x) => /Taux de rupture/.test(x.querySelector('.ac-t').textContent));
      const e = (s) => s.replace(/\s+/g, ' ');
      return t ? { v: e(t.querySelector('.ac-v').textContent), txt: e(t.textContent), aide: e(t.getAttribute('data-qtip') || '') } : null; });
    const tuileBord = () => d.evaluate(() => { const x = document.querySelector('[data-liste="tauxRupture"]');
      return x ? { taux: Number(x.getAttribute('data-taux')), txt: x.textContent.replace(/\s+/g, ' ') } : null; });
    const fr = (n) => n.toLocaleString('fr-FR').replace(/\s+/g, ' ');

    /* reglage par l'ecran : valeurs saisies puis vrai clic sur Enregistrer ; la tuile se recharge */
    const regler = async (vals) => {
      /* retour a l'onglet Tableau par un clic sur son titre */
      await p.evaluate(() => { const a = Ext.ComponentQuery.query('analysecommande')[0]; a.down('#ongletTableau').tab.getEl().dom.setAttribute('data-e2e', 'ot'); });
      await p.click('[data-e2e=ot]');
      await p.waitForFunction(() => Ext.ComponentQuery.query('analysecommande #ongletTableau')[0].isVisible(), null, { timeout: 20000 });
      const change = await p.evaluate((v) => { const pc = Ext.ComponentQuery.query('analysecommande #parametresCalcul')[0]; if (pc.collapsed) { pc.expand(false); }
        return Object.keys(v).some((c) => Number(pc.down('#p-' + c).getValue()) !== v[c]); }, vals);
      if (!change) { await d.click('[data-tb="actualiser"]'); await d.waitForTimeout(2500); return; }
      await p.evaluate((v) => { const pc = Ext.ComponentQuery.query('analysecommande #parametresCalcul')[0];
        Object.keys(v).forEach((c) => pc.down('#p-' + c).setValue(v[c]));
        const a = Ext.ComponentQuery.query('analysecommande')[0]; a.__tab = 0; a.__lu = a.down('#tuiles').getEl().dom.innerHTML;
        pc.down('#btnEnregistrer').getEl().dom.setAttribute('data-e2e', 'enr'); }, vals);
      await p.click('[data-e2e=enr]');
      await p.waitForFunction(() => { const a = Ext.ComponentQuery.query('analysecommande')[0]; return /Enregistré/.test(a.down('#etatParam').getEl().dom.textContent)
        && a.down('#tuiles').getEl().dom.innerHTML !== a.__lu; }, null, { timeout: 60000 }).catch(() => {});
      await p.waitForTimeout(800);
      /* tableau de bord : bouton Actualiser (vrai clic), relit la base */
      await d.click('[data-tb="actualiser"]');
      await d.waitForTimeout(2500);
    };

    const verifier = async (nom, m, n, qm) => {
      const ref = reference(m, n, qm);
      const t = await get(p, '../api/v1/analyse-commande/tableau');
      const r = await get(p, '../api/v1/analyse-commande/rupture');
      const tp = await tuilePrevision(), tb = await tuileBord();
      ok(nom + ' : réglage en base = ' + [m, n, qm].join(', '), [valeur(CLES[0]), valeur(CLES[1]), valeur(CLES[2])].join(',') === [m, n, qm].join(','));
      ok(nom + ' : base ' + ref.taux + ' % (' + ref.ruptures + '/' + ref.frequents + ') = API tableau = API rupture',
        t.tauxRupture === ref.taux && t.ruptures === ref.ruptures && t.produitsReguliers === ref.frequents && r.taux === ref.taux && r.ruptures === ref.ruptures
        && r.frequents === ref.frequents && t.ruptureMois === m && t.ruptureMoisVente === Math.min(n, m) && t.ruptureQuantiteMin === qm,
        JSON.stringify({ ref: [ref.taux, ref.ruptures, ref.frequents], t: [t.tauxRupture, t.ruptures, t.produitsReguliers, t.ruptureMois, t.ruptureMoisVente, t.ruptureQuantiteMin], r: [r.taux, r.ruptures, r.frequents] }));
      ok(nom + ' : tuile Prévision = base (taux, n sur m, réglage dans l\'aide)', tp && tp.v.trim() === fr(ref.taux) + ' %'
        && tp.txt.includes(fr(ref.ruptures) + ' sur ' + fr(ref.frequents) + ' produits vendus fréquemment') && tp.aide.includes('au moins ' + Math.min(n, m) + ' mois sur les ' + m + ' derniers')
        && tp.aide.includes(qm + ' unités'), JSON.stringify(tp));
      ok(nom + ' : tuile du tableau de bord = même taux, mêmes nombres', tb && tb.taux === ref.taux && tb.txt.includes(fr(ref.taux) + ' %')
        && tb.txt.includes(fr(ref.ruptures) + ' sur ' + fr(ref.frequents)), JSON.stringify(tb));
      const lr = r.liste.map((x) => x.id).sort();
      ok(nom + ' : liste de l\'API = produits comptés en base (' + ref.ruptures + ')', JSON.stringify(lr) === JSON.stringify(ref.ids.slice().sort()) || (ref.ruptures > 500 && lr.length === 500),
        lr.length + ' / ' + ref.ids.length);
      return ref;
    };

    /* 1. reglage d'origine (valeurs par defaut 3, 2, 3 si absent) */
    if (origine[CLES[0]] === 'ABSENT') { ok('Migration V7.6.7 : les 3 paramètres existent', false, JSON.stringify(origine)); }
    await regler({ KEY_PREVISION_RUPTURE_MOIS: 3, KEY_PREVISION_RUPTURE_MOIS_VENTE: 2, KEY_PREVISION_RUPTURE_QTE_MIN: 3 });
    const ref1 = await verifier('Réglage 3, 2, 3', 3, 2, 3);
    ok('Jeu d\'essai utile : des produits fréquents et des ruptures', ref1.frequents > 20 && ref1.ruptures > 0, JSON.stringify([ref1.frequents, ref1.ruptures]));

    /* filtre « En rupture » par clic sur la tuile : exactement les produits comptes */
    await p.evaluate(() => { const t = Array.from(document.querySelectorAll('.ac-tuile[data-filtre="RUPTURE"]'))[0]; t.setAttribute('data-e2e', 'tr'); });
    await p.click('[data-e2e=tr]');
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('analysecommande #ongletPrevisions')[0]; return g.isVisible() && !g.getStore().isLoading() && g.down('#filtre').getValue() === 'RUPTURE'; }, null, { timeout: 60000 });
    await p.waitForTimeout(1000);
    const grille = await p.evaluate(() => { const g = Ext.ComponentQuery.query('analysecommande #ongletPrevisions')[0];
      return { total: g.getStore().getTotalCount(), libelle: g.down('#filtre').getRawValue() }; });
    const toutes = await get(p, '../api/v1/analyse-commande/previsions?filtre=RUPTURE&start=0&limit=5000');
    ok('Filtre « En rupture (vendus fréquemment) » (clic sur la tuile) : total = ruptures, produits = base', grille.total === ref1.ruptures && /fréquemment/.test(grille.libelle)
      && JSON.stringify(toutes.data.map((x) => x.id).sort()) === JSON.stringify(ref1.ids), JSON.stringify([grille, toutes.total, ref1.ruptures]));

    /* liste du tableau de bord : clic sur la ligne du taux, fenetre de consultation */
    await d.click('[data-liste="tauxRupture"]');
    await d.waitForFunction(() => Ext.ComponentQuery.query('window[hidden=false]').some((w) => /Produits fréquents à stock nul/.test(w.title)), null, { timeout: 30000 });
    const fen = await d.evaluate(() => { const w = Ext.ComponentQuery.query('window[hidden=false]').find((x) => /Produits fréquents à stock nul/.test(x.title));
      const l = Array.from(w.getEl().dom.querySelectorAll('table.tb-fixe tr')).slice(1).map((tr) => Array.from(tr.querySelectorAll('td')).map((td) => td.textContent.trim()));
      const r = { titre: w.title, lignes: l }; w.close(); return r; });
    const r1 = await get(p, '../api/v1/analyse-commande/rupture');
    const attendu = r1.liste.map((x) => [x.nom.trim(), String(x.cip), x.vendus, x.moisVendus, x.rayon]);
    const vu = fen.lignes.map((c) => [c[0], c[1], Number(c[2].replace(/\s/g, '')), Number(c[3]), Number(c[4].replace(/\s/g, '').replace('−', '-'))]);
    const ecart = attendu.findIndex((x, i) => JSON.stringify(x) !== JSON.stringify(vu[i]));
    ok('Tableau de bord : liste = produits comptés, ligne par ligne (nom, CIP, vendus, mois vendus, stock rayon)', fen.titre.includes('(' + Math.min(500, ref1.ruptures) + ')')
      && vu.length === attendu.length && ecart < 0, JSON.stringify({ titre: fen.titre, n: [vu.length, attendu.length], ecart, vu: vu[ecart], attendu: attendu[ecart] }));
    const tri = r1.liste.every((x, i, a) => i === 0 || a[i - 1].vendus >= x.vendus);
    const regle = r1.liste.every((x) => x.vendus >= 3 && x.moisVendus >= 2 && x.rayon <= 0 && x.reserve <= 0);
    ok('Liste : du plus vendu au moins vendu, chaque produit respecte la règle (≥ 3 unités, ≥ 2 mois, stock nul)', tri && regle);

    /* 2. jeux varies : N = 1 et Q = 1, puis Q eleve, puis N plus grand que M (borne a M) */
    await regler({ KEY_PREVISION_RUPTURE_MOIS: 6, KEY_PREVISION_RUPTURE_MOIS_VENTE: 1, KEY_PREVISION_RUPTURE_QTE_MIN: 1 });
    const ref2 = await verifier('Réglage 6, 1, 1', 6, 1, 1);
    await regler({ KEY_PREVISION_RUPTURE_MOIS: 2, KEY_PREVISION_RUPTURE_MOIS_VENTE: 2, KEY_PREVISION_RUPTURE_QTE_MIN: 10 });
    const ref3 = await verifier('Réglage 2, 2, 10', 2, 2, 10);
    await regler({ KEY_PREVISION_RUPTURE_MOIS: 1, KEY_PREVISION_RUPTURE_MOIS_VENTE: 4, KEY_PREVISION_RUPTURE_QTE_MIN: 1 });
    const ref4 = await verifier('Réglage 1, 4, 1 (N borné à M)', 1, 4, 1);
    ok('Le réglage change vraiment le résultat (plus large = plus de produits fréquents)', ref2.frequents > ref1.frequents && ref3.frequents < ref2.frequents && ref4.frequents > 0,
      JSON.stringify([ref1.frequents, ref2.frequents, ref3.frequents, ref4.frequents]));

    /* saisie hors bornes refusee par le serveur, rien n'est ecrit */
    const refus = await p.evaluate(async () => (await fetch('../api/v1/analyse-commande/parametres', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ KEY_PREVISION_RUPTURE_MOIS: 0 }) })).json());
    ok('Mois observés à 0 : refusé par le serveur, valeur inchangée', refus.success === false && valeur(CLES[0]) === '1', JSON.stringify(refus));

    /* 3. filtre de fiabilite, saisi dans l'ecran */
    const fiab = async (x) => {
      await p.evaluate(() => { const a = Ext.ComponentQuery.query('analysecommande')[0]; a.down('#ongletPrevisions').tab.getEl().dom.setAttribute('data-e2e', 'op'); });
      await p.click('[data-e2e=op]');
      await p.waitForFunction(() => Ext.ComponentQuery.query('analysecommande #ongletPrevisions')[0].isVisible(), null, { timeout: 20000 });
      await p.evaluate(() => { const g = Ext.ComponentQuery.query('analysecommande #ongletPrevisions')[0]; g.down('#filtre').setValue(''); g.__lu = 0;
        g.getStore().on('load', () => { g.__lu++; }); });
      await p.waitForTimeout(800);
      await p.evaluate(() => { const g = Ext.ComponentQuery.query('analysecommande #ongletPrevisions')[0]; g.__lu = 0; g.down('#fiabiliteMin').inputEl.dom.setAttribute('data-e2e', 'fm'); });
      await p.fill('[data-e2e=fm]', String(x));
      await p.press('[data-e2e=fm]', 'Enter');
      await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('analysecommande #ongletPrevisions')[0]; return g.__lu > 0 && !g.getStore().isLoading(); }, null, { timeout: 60000 });
      await p.waitForTimeout(900);
      const g = await p.evaluate(() => { const g = Ext.ComponentQuery.query('analysecommande #ongletPrevisions')[0];
        return { total: g.getStore().getTotalCount(), min: Math.min(...g.getStore().collect('fiabilite').concat([1000])), n: g.getStore().getCount() }; });
      const base = Number(q("SELECT COUNT(*) FROM t_prevision_produit p JOIN t_famille f ON f.lg_FAMILLE_ID = p.lg_FAMILLE_ID WHERE p.lg_EMPLACEMENT_ID = '1' AND p.fiabilite >= " + x));
      ok('Fiabilité ≥ ' + x + ' % : total = base (' + base + '), chaque ligne au moins ' + x, g.total === base && (g.n === 0 || g.min >= x), JSON.stringify([g, base]));
      return base;
    };
    const f0 = await fiab(0), f60 = await fiab(60), f100 = await fiab(100);
    ok('Fiabilité : jeux variés (0, 60, 100), plus exigeant = moins de lignes', f0 >= f60 && f60 >= f100 && f0 > f100, JSON.stringify([f0, f60, f100]));
    const xl = await p.evaluate(async () => (await fetch('../api/v1/analyse-commande/previsions?fiabiliteMin=60&start=0&limit=1')).json());
    ok('API : fiabiliteMin appliqué (même total que l\'écran)', xl.total === f60, xl.total + ' / ' + f60);

    /* 4. texte « N derniers mois » qui suit KEY_PREVISION_MOIS_TEST */
    await regler({ KEY_PREVISION_MOIS_TEST: Number(origine.KEY_PREVISION_MOIS_TEST) === 4 ? 5 : 4 });
    const mt = Number(valeur('KEY_PREVISION_MOIS_TEST'));
    const textes = await p.evaluate(() => { const a = Ext.ComponentQuery.query('analysecommande')[0]; return a.down('#tuiles').getEl().dom.innerHTML; });
    ok('Fiabilité : « ' + mt + ' derniers mois » suit le paramètre des mois d\'essai, plus de « 6 » figé', textes.includes('les ' + mt + ' derniers mois') && !textes.includes('les 6 derniers mois'),
      (textes.match(/les \d+ derniers mois/g) || []).join(' ; '));

    ok('Aucune fenêtre surgissante dans la Prévision', await p.evaluate(() => Ext.ComponentQuery.query('window[hidden=false]').length === 0));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Déroulement sans exception', false, e.stack || e.message);
  } finally {
    for (const c of CLES) {
      if (origine[c] === 'ABSENT') { q("DELETE FROM t_parameters WHERE str_KEY = '" + c + "'"); } else { q("UPDATE t_parameters SET str_VALUE = '" + origine[c] + "' WHERE str_KEY = '" + c + "'"); }
    }
    ok('Bilan : paramètres remis à leur valeur d\'origine, aucun autre paramètre touché', CLES.every((c) => valeur(c) === origine[c]) && empreinte() === avant,
      JSON.stringify(origine));
    await b.close();
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' controles OK');
    process.exit(ko ? 1 : 0);
  }
})();
