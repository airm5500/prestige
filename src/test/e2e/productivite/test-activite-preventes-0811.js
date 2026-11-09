/* PLAN DU 08/11, POINT 15.4 : PREVENTES PAR VENDEUR.
 *
 * Par les vues (admin, 1366 x 768) : ANALYSE DE GESTION > Activité des équipes > Analyses, septembre 2026 saisi au
 * clavier, Actualiser :
 *  - carte « Préventes par vendeur », avec son aide « ? » : tableau rang, vendeur, encaissées, CA, lignes, annulées,
 *    abandonnées, taux ; total en pied ;
 *  - rapprochement, vendeur par vendeur : tableau a l'ecran = API = calcul refait ici depuis la base, vente par vente
 *    (prevente = saisie par un vendeur, encaissee par un autre ; annulee hors modification ; abandonnee = restee en
 *    attente apres le jour de saisie ; taux = (annulees + abandonnees) / total) ;
 *  - total en pied = somme des vendeurs (API) ; tri par encaissees decroissantes ;
 *  - cas varies : plusieurs vendeurs, au moins un avec des annulees ; un vendeur seul (filtre Employé) ;
 *  - ergonomie : tableau lisible dans son cadre (pas de colonne coupee), aucune erreur JavaScript. Lecture seule.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer, saisir } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 28 }).replace(/\r/g, '').trim();
const D = '2026-09-01', F = '2026-10-01';
const arrondi = (x) => Math.round(x * 10) / 10;

/* calcul independant, vente par vente */
function attendu(emp) {
  const m = {};
  const lignes = q(`SELECT p.lg_USER_VENDEUR_ID, p.lg_USER_CAISSIER_ID, p.str_STATUT, p.b_IS_CANCEL + 0, p.int_PRICE, p.dt_UPDATED < CURDATE(),`
    + ` (SELECT COUNT(*) FROM t_preenregistrement_detail d WHERE d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID),`
    + ` EXISTS (SELECT 1 FROM vente_modifiee vm WHERE vm.vente_origine_id = p.lg_PREENREGISTREMENT_ID)`
    + ` FROM t_preenregistrement p WHERE p.dt_CREATED >= '${D}' AND p.dt_CREATED < '${F}' AND p.int_PRICE > 0 AND p.lg_TYPE_VENTE_ID <> '5'`
    + ` AND p.lg_USER_VENDEUR_ID IS NOT NULL` + (emp ? ` AND p.lg_USER_VENDEUR_ID = '${emp}'` : '')).split('\n').filter(Boolean);
  for (const l of lignes) {
    const [v, c, st, cancel, prix, passe, n, modif] = l.split('\t');
    const x = m[v] || (m[v] = { id: v, encaissees: 0, chiffreAffaires: 0, lignes: 0, annulees: 0, abandonnees: 0 });
    const autre = c !== 'NULL' && c !== v;
    if (st === 'is_Closed' && cancel === '0' && autre) { x.encaissees++; x.chiffreAffaires += Number(prix); x.lignes += Number(n); }
    if (st === 'is_Closed' && cancel === '1' && autre && modif === '0') { x.annulees++; }
    if ((st === 'is_Process' || st === 'pending') && passe === '1' && Number(n) > 0) { x.abandonnees++; }
  }
  return Object.values(m).map((x) => Object.assign(x, { total: x.encaissees + x.annulees + x.abandonnees })).filter((x) => x.total > 0)
    .map((x) => Object.assign(x, { taux: arrondi(100 * (x.annulees + x.abandonnees) / x.total) }));
}
const cle = (x) => [x.id, x.encaissees, x.chiffreAffaires, x.lignes, x.annulees, x.abandonnees, x.total, x.taux].join('|');
const trier = (l) => l.map(cle).sort();

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const attendre = () => p.waitForFunction(() => { const a = Ext.ComponentQuery.query('activiteequipes')[0].analyses;
    return a.rendered && !(a.loadMask && a.loadMask.isVisible()) && document.querySelectorAll('.ae-tuile').length > 0; }, null, { timeout: 180000 })
    .then(() => p.waitForTimeout(1500));
  const ecran = () => p.evaluate(() => { const a = Ext.ComponentQuery.query('activiteequipes')[0].analyses, c = a.down('#cPreventes'), t = document.querySelector('table.ae-prev');
    const lire = (tr) => Array.from(tr.children).map((x) => x.innerText.trim());
    const cadre = c ? c.body.dom.getBoundingClientRect() : null, tb = t ? t.getBoundingClientRect() : null;
    return { present: !!c && c.isVisible(true), titre: c ? c.title : '', aide: c ? c.query('tool[type=help]').length : 0,
      lignes: t ? Array.from(t.tBodies[0].rows).map((tr) => ({ id: tr.getAttribute('data-id'), cellules: lire(tr) })) : [],
      pied: t && t.tFoot ? lire(t.tFoot.rows[0]) : [], entete: t ? lire(t.tHead.rows[0]) : [],
      tientDansLeCadre: !!(cadre && tb) && tb.width <= cadre.width + 1 }; });
  const nombre = (s) => Number(String(s).replace(/[^\d,]/g, '').replace(',', '.'));
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'ANALYSE DE GESTION', 'Activité des équipes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('activiteequipes').some((c) => c.isVisible(true)), null, { timeout: 60000 });
    await saisir(p, 'activiteequipes #aeDebut', '01/09/2026');
    await saisir(p, 'activiteequipes #aeFin', '30/09/2026');
    await cliquer(p, 'activiteequipes button[itemId=ae-analyses]');
    await attendre();
    const [rep] = await Promise.all([p.waitForResponse((r) => /activite-equipes\/analyses/.test(r.url()), { timeout: 180000 }), cliquer(p, 'activiteequipes #aeActualiser')]);
    const api = ((await rep.json()).data || {}).preventes || [];
    await attendre();
    let e = await ecran();
    const base = attendu(null);
    ok('Carte « Préventes par vendeur », avec son aide « ? » et ses 8 colonnes', e.present && e.titre === 'Préventes par vendeur' && e.aide === 1
      && e.entete.join('|') === '#|Vendeur|Encaissées|CA|Lignes|Annulées|Abandonnées|Taux', JSON.stringify({ present: e.present, titre: e.titre, aide: e.aide, entete: e.entete }));
    ok('Cas variés : plusieurs vendeurs, au moins un avec des annulées', base.length >= 2 && base.some((x) => x.annulees > 0), base.length + ' vendeurs');
    ok('Rapprochement API = base, vendeur par vendeur (encaissées, CA, lignes, annulées, abandonnées, total, taux)', JSON.stringify(trier(api)) === JSON.stringify(trier(base)),
      JSON.stringify({ api: trier(api).slice(0, 3), base: trier(base).slice(0, 3) }));
    const ecranLignes = e.lignes.map((l) => [l.id, ...l.cellules.slice(2).map(nombre)].join('|'));
    const apiLignes = api.slice(0, 15).map((x) => [x.id, x.encaissees, x.chiffreAffaires, x.lignes, x.annulees, x.abandonnees, x.taux].join('|'));
    ok('Écran = API, ligne par ligne (15 premiers, rang compris)', JSON.stringify(ecranLignes) === JSON.stringify(apiLignes) && e.lignes.every((l, i) => l.cellules[0] === String(i + 1)),
      JSON.stringify({ ecran: ecranLignes.slice(0, 3), api: apiLignes.slice(0, 3) }));
    ok('Tri : encaissées décroissantes', api.every((x, i) => !i || api[i - 1].encaissees >= x.encaissees));
    const somme = (k) => api.reduce((s, x) => s + x[k], 0);
    ok('Pied du tableau = somme des vendeurs (encaissées, CA, lignes, annulées, abandonnées)', JSON.stringify(e.pied.slice(2, 7).map(nombre)) === JSON.stringify(['encaissees', 'chiffreAffaires', 'lignes', 'annulees', 'abandonnees'].map(somme))
      && new RegExp('Total \\(' + api.length + ' vendeurs\\)').test(e.pied[1]), JSON.stringify(e.pied));
    ok('Ergonomie : le tableau tient dans son cadre (1366 × 768)', e.tientDansLeCadre);

    /* un vendeur seul */
    const emp = base.slice().sort((x, y) => y.annulees - x.annulees)[0].id;
    await p.evaluate((id) => { Ext.ComponentQuery.query('activiteequipes #aeEmploye')[0].setValue(id); }, emp);
    const [rep2] = await Promise.all([p.waitForResponse((r) => /activite-equipes\/analyses/.test(r.url()), { timeout: 180000 }), cliquer(p, 'activiteequipes #aeActualiser')]);
    const api2 = ((await rep2.json()).data || {}).preventes || [];
    await attendre();
    e = await ecran();
    const base2 = attendu(emp);
    ok('Un vendeur seul (filtre Employé) : écran = API = base', JSON.stringify(trier(api2)) === JSON.stringify(trier(base2)) && e.lignes.length === 1 && e.lignes[0].id === emp,
      JSON.stringify({ api: trier(api2), base: trier(base2), ecran: e.lignes.map((l) => l.id) }));
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
