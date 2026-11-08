/* PLAN DU 08/11, POINTS 15.5 ET 15.7 : VITESSE PAR TYPE DE VENTE.
 *
 * Par les vues (admin, 1366 x 768) : ANALYSE DE GESTION > Activité des équipes > Analyses, septembre 2026 saisi au
 * clavier, Actualiser :
 *  - carte « Vitesse par type de vente » a cote de « Vitesse par opérateur », avec son aide « ? » ;
 *  - rapprochement, type par type : barres a l'ecran = API = calcul refait ici depuis la base (une ligne par vente :
 *    type, avoir, duree, saisie, lignes, montant ; memes regles : vente retenue si 0 <= duree <= 1 h et au moins une
 *    ligne) : nombre de ventes, secondes par ligne, lignes par vente, panier ;
 *  - somme des ventes par type = tuile « Ventes encaissées » ;
 *  - cas varies : plusieurs types (comptant, assurance, carnet...), et un employe seul (filtre Employé) ;
 *  - survol d'une barre : infobulle avec le type et le detail ; aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer, saisir } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 28 }).replace(/\r/g, '').trim();
const D = '2026-09-01', F = '2026-10-01';
const TYPES = ['Comptant', 'Assurance', 'Carnet', 'Dépôt', 'Avoir', 'Autre'];
const libelle = (id, avoir) => (avoir === '1' ? 'Avoir' : { 1: 'Comptant', 2: 'Assurance', 3: 'Carnet', 4: 'Dépôt', 5: 'Dépôt' }[String(id).trim()] || 'Autre');
const arrondi = (x) => Math.round(x * 10) / 10;

/* calcul independant : une ligne par vente, memes filtres que l'ecran */
function attendu(emp) {
  const lignes = q(`SELECT p.lg_TYPE_VENTE_ID, p.b_IS_AVOIR + 0, TIMESTAMPDIFF(SECOND, p.dt_CREATED, COALESCE(p.completion_date, p.dt_UPDATED)),`
    + ` GREATEST(0, TIMESTAMPDIFF(SECOND, p.dt_CREATED, MAX(d.dt_UPDATED))), COUNT(*), p.int_PRICE FROM t_preenregistrement p`
    + ` JOIN t_preenregistrement_detail d ON d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID`
    + ` WHERE p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 AND p.lg_TYPE_VENTE_ID <> '5'`
    + ` AND p.dt_UPDATED >= '${D}' AND p.dt_UPDATED < '${F}'` + (emp ? ` AND p.lg_USER_ID = '${emp}'` : '') + ' GROUP BY p.lg_PREENREGISTREMENT_ID').split('\n').filter(Boolean);
  const m = {};
  for (const l of lignes) {
    const [typ, avoir, duree, saisie, n, prix] = l.split('\t');
    const k = libelle(typ, avoir), x = m[k] || (m[k] = { ventes: 0, lignes: 0, saisie: 0, retenues: 0, montant: 0 });
    x.ventes++; x.montant += Number(prix);
    if (Number(duree) >= 0 && Number(duree) <= 3600 && Number(n) > 0) { x.retenues++; x.lignes += Number(n); x.saisie += Number(saisie); }
  }
  return TYPES.filter((t) => m[t]).map((t) => ({ nom: t, ventes: m[t].ventes, secondesParLigne: arrondi(m[t].lignes ? m[t].saisie / m[t].lignes : 0),
    lignesParVente: arrondi(m[t].retenues ? m[t].lignes / m[t].retenues : 0), panierMoyen: Math.round(m[t].montant / m[t].ventes) }));
}

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const attendre = () => p.waitForFunction(() => { const a = Ext.ComponentQuery.query('activiteequipes')[0].analyses;
    return a.rendered && !(a.loadMask && a.loadMask.isVisible()) && document.querySelectorAll('.ae-tuile').length > 0; }, null, { timeout: 180000 })
    .then(() => p.waitForTimeout(1500));
  const ecran = () => p.evaluate(() => { const a = Ext.ComponentQuery.query('activiteequipes')[0].analyses, c = a.down('#cTypesVente'), g = a.down('#gTypesVente');
    const l = []; if (g) { g.getStore().each((r) => l.push({ nom: r.get('libelle'), ventes: r.get('ventes'), secondesParLigne: r.get('secondesParLigne'),
      lignesParVente: r.get('lignesParVente'), panierMoyen: r.get('panierMoyen') })); }
    const op = a.down('#cOperateurs');
    return { present: !!c && c.isVisible(true), titre: c ? c.title : '', aide: c ? c.query('tool[type=help]').length : 0, barres: g && g.rendered ? g.series.getAt(0).items.length : -1,
      voisin: !!c && !!op && Math.abs(c.getEl().getTop() - op.getEl().getTop()) < 400, l,
      tuile: Number(((document.querySelector('.ae-tuile[data-code="VENTES"] .v') || {}).textContent || '').replace(/\D/g, '')) }; });
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'ANALYSE DE GESTION', 'Activité des équipes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('activiteequipes').some((c) => c.isVisible(true)), null, { timeout: 60000 });
    await saisir(p, 'activiteequipes #aeDebut', '01/09/2026');
    await saisir(p, 'activiteequipes #aeFin', '30/09/2026');
    await cliquer(p, 'activiteequipes button[itemId=ae-analyses]');
    await attendre();
    const [rep] = await Promise.all([p.waitForResponse((r) => /activite-equipes\/analyses/.test(r.url()), { timeout: 180000 }), cliquer(p, 'activiteequipes #aeActualiser')]);
    const api = (await rep.json()).data || {};
    await attendre();
    let e = await ecran();
    const base = attendu(null);
    ok('Carte « Vitesse par type de vente » à côté de « Vitesse par opérateur », avec son aide « ? »', e.present && e.titre === 'Vitesse par type de vente' && e.aide === 1 && e.voisin, JSON.stringify({ present: e.present, titre: e.titre, aide: e.aide, voisin: e.voisin }));
    ok('Plusieurs types de vente sur septembre (cas variés)', base.length >= 2 && e.barres === base.length, JSON.stringify(base.map((x) => x.nom)) + ' barres ' + e.barres);
    ok('Rapprochement, type par type : écran = API = base (ventes, s par ligne, lignes par vente, panier)',
      JSON.stringify(e.l) === JSON.stringify(base) && JSON.stringify((api.typesVente || []).map((o) => ({ nom: o.nom, ventes: o.ventes, secondesParLigne: o.secondesParLigne,
        lignesParVente: o.lignesParVente, panierMoyen: o.panierMoyen }))) === JSON.stringify(base), JSON.stringify({ ecran: e.l, base }));
    ok('Somme des ventes par type = tuile « Ventes encaissées »', e.l.reduce((s, x) => s + x.ventes, 0) === e.tuile && e.tuile > 0, e.tuile);

    /* survol d'une barre */
    const box = await p.evaluate(() => { const g = Ext.ComponentQuery.query('activiteequipes')[0].analyses.down('#gTypesVente'); g.getEl().dom.scrollIntoView({ block: 'center' });
      const it = g.series.getAt(0).items[0], bb = it.sprite.getBBox(), r = g.getEl().dom.getBoundingClientRect(); return { x: r.left + bb.x + bb.width / 2, y: r.top + bb.y + bb.height / 2 }; });
    await p.mouse.move(box.x, box.y); await p.waitForTimeout(900);
    const bulle = await p.evaluate(() => Array.from(document.querySelectorAll('.x-tip')).filter((t) => t.offsetParent).map((t) => t.innerText).join(' | '));
    ok('Survol d\'une barre : infobulle avec le type et le détail (ventes, lignes, panier)', /s par ligne/.test(bulle) && /ventes/.test(bulle) && /panier/.test(bulle), bulle.slice(0, 160));

    /* un employe seul */
    const emp = q(`SELECT p.lg_USER_ID FROM t_preenregistrement p WHERE p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 AND p.dt_UPDATED >= '${D}' AND p.dt_UPDATED < '${F}'`
      + ` GROUP BY p.lg_USER_ID ORDER BY COUNT(DISTINCT p.lg_TYPE_VENTE_ID) DESC, COUNT(*) DESC LIMIT 1`);
    await p.evaluate((id) => { const c = Ext.ComponentQuery.query('activiteequipes #aeEmploye')[0]; c.setValue(id); }, emp);
    await Promise.all([p.waitForResponse((r) => /activite-equipes\/analyses/.test(r.url()), { timeout: 180000 }), cliquer(p, 'activiteequipes #aeActualiser')]);
    await attendre();
    e = await ecran();
    const baseEmp = attendu(emp);
    ok('Un employé seul : écran = base, type par type', JSON.stringify(e.l) === JSON.stringify(baseEmp) && baseEmp.length >= 1, JSON.stringify({ ecran: e.l, base: baseEmp }));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
