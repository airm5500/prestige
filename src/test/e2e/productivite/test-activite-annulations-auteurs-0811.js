/* PLAN DU 08/11, POINT 15.1 : ANNULATIONS PAR AUTEUR DE LA VENTE, SUIVI DES CAISSIERES.
 *
 * Par les vues (admin, 1366 x 768) : ANALYSE DE GESTION > Activité des équipes > Analyses, période saisie au
 * clavier (septembre et octobre 2026 : octobre porte une modification de vente au comptant), Actualiser :
 *  - carte « Annulations par auteur de la vente », avec son aide « ? » : tableau des vendeurs (ventes, annulées
 *    ensuite, taux) et tableau des caissières (annulations comptant, modifications comptant, modifications crédit) ;
 *  - rapprochement : écran = API = calcul refait ici vente par vente depuis la base (l'annulation est rattachée au
 *    vendeur de la vente, pas à celui qui annule ; ventes remplacées par une modification écartées) ;
 *  - clic sur une ligne vendeur puis sur une ligne caissière : détail en place, sans fenêtre ; nombre de lignes et
 *    références = API = base ;
 *  - cas variés : plusieurs vendeurs avec annulées, plusieurs caissières, des modifications au comptant et à crédit ;
 *    un employé seul (filtre Employé) ;
 *  - ergonomie : tableaux dans leur cadre, aucune fenêtre ouverte, aucune erreur JavaScript. Lecture seule.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer, saisir } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 28 }).replace(/\r/g, '').trim();
const lignesSql = (s) => q(s).split('\n').filter(Boolean).map((l) => l.split('\t'));
const D = '2026-09-01', F = '2026-11-01';
const arrondi = (x) => Math.round(x * 10) / 10;
const MODIF = `EXISTS (SELECT 1 FROM vente_modifiee vm WHERE vm.vente_origine_id = p.lg_PREENREGISTREMENT_ID)`;

/* calcul independant, vente par vente */
function vendeurs(emp) {
  const m = {};
  for (const [v, cancel, typ, prix, modif] of lignesSql(`SELECT p.lg_USER_VENDEUR_ID, p.b_IS_CANCEL + 0, p.lg_TYPE_VENTE_ID, p.int_PRICE, ${MODIF}`
    + ` FROM t_preenregistrement p WHERE p.str_STATUT = 'is_Closed' AND p.dt_CREATED >= '${D}' AND p.dt_CREATED < '${F}'`
    + ` AND p.lg_USER_VENDEUR_ID IS NOT NULL` + (emp ? ` AND p.lg_USER_VENDEUR_ID = '${emp}'` : ''))) {
    if (Number(prix) <= 0 || typ === '5' || modif === '1') { continue; }
    const x = m[v] || (m[v] = { id: v, ventes: 0, annulees: 0 });
    x.ventes++;
    if (cancel === '1') { x.annulees++; }
  }
  return Object.values(m).map((x) => Object.assign(x, { taux: arrondi(100 * x.annulees / x.ventes) }));
}
function caissieres(emp) {
  const m = {}, de = (c) => m[c] || (m[c] = { id: c, annulationsComptant: 0, modificationsComptant: 0, modificationsCredit: 0 });
  for (const [c, typ, prix, modif] of lignesSql(`SELECT p.lg_USER_CAISSIER_ID, p.lg_TYPE_VENTE_ID, p.int_PRICE, ${MODIF} FROM t_preenregistrement p`
    + ` WHERE p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 1 AND p.dt_ANNULER >= '${D}' AND p.dt_ANNULER < '${F}'`
    + (emp ? ` AND p.lg_USER_CAISSIER_ID = '${emp}'` : ''))) {
    if (c !== 'NULL' && typ === '1' && Number(prix) > 0 && modif === '0') { de(c).annulationsComptant++; }
  }
  for (const [c, typ] of lignesSql(`SELECT p.lg_USER_CAISSIER_ID, p.lg_TYPE_VENTE_ID FROM vente_modifiee vm JOIN t_preenregistrement p`
    + ` ON p.lg_PREENREGISTREMENT_ID = IFNULL(vm.vente_origine_id, vm.vente_id) WHERE vm.mvt_date >= '${D}' AND vm.mvt_date < '${F}'`
    + (emp ? ` AND p.lg_USER_CAISSIER_ID = '${emp}'` : ''))) {
    if (c === 'NULL') { continue; }
    if (typ === '1') { de(c).modificationsComptant++; } else if (typ === '2' || typ === '3') { de(c).modificationsCredit++; }
  }
  return Object.values(m).map((x) => Object.assign(x, { total: x.annulationsComptant + x.modificationsComptant + x.modificationsCredit }))
    .filter((x) => x.total > 0);
}
const cleV = (x) => [x.id, x.ventes, x.annulees, x.taux].join('|');
const cleC = (x) => [x.id, x.annulationsComptant, x.modificationsComptant, x.modificationsCredit, x.total].join('|');
const trier = (l, k) => l.map(k).sort();

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const attendre = () => p.waitForFunction(() => { const a = Ext.ComponentQuery.query('activiteequipes')[0].analyses;
    return a.rendered && !(a.loadMask && a.loadMask.isVisible()) && document.querySelectorAll('.ae-tuile').length > 0; }, null, { timeout: 180000 })
    .then(() => p.waitForTimeout(1500));
  const ecran = () => p.evaluate(() => { const a = Ext.ComponentQuery.query('activiteequipes')[0].analyses, c = a.down('#cAnnulAuteurs');
    const lire = (tr) => Array.from(tr.children).map((x) => x.innerText.trim());
    const table = (sel) => { const t = document.querySelector(sel); return t ? { entete: lire(t.tHead.rows[0]),
      lignes: Array.from(t.tBodies[0].rows).map((tr) => ({ id: tr.getAttribute('data-id'), cellules: lire(tr) })) } : { entete: [], lignes: [] }; };
    const cadre = c ? c.body.dom.getBoundingClientRect() : null;
    const dedans = (sel) => { const t = document.querySelector(sel); if (!t || !cadre) { return false; } const r = t.getBoundingClientRect();
      return r.left >= cadre.left - 1 && r.right <= cadre.right + 1; };
    return { present: !!c && c.isVisible(true), titre: c ? c.title : '', aide: c ? c.query('tool[type=help]').length : 0,
      v: table('table.ae-ann-vendeurs'), c: table('table.ae-ann-caissiers'), dansLeCadre: dedans('table.ae-ann-vendeurs') && dedans('table.ae-ann-caissiers') }; });
  const nombre = (s) => Number(String(s).replace(/[^\d,]/g, '').replace(',', '.'));
  const fenetres = () => p.evaluate(() => Ext.ComponentQuery.query('window').filter((w) => w.isVisible()).length);
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'ANALYSE DE GESTION', 'Activité des équipes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('activiteequipes').some((c) => c.isVisible(true)), null, { timeout: 60000 });
    await saisir(p, 'activiteequipes #aeDebut', '01/09/2026');
    await saisir(p, 'activiteequipes #aeFin', '31/10/2026');
    await cliquer(p, 'activiteequipes button[itemId=ae-analyses]');
    await attendre();
    const [rep] = await Promise.all([p.waitForResponse((r) => /activite-equipes\/annulations\?/.test(r.url()), { timeout: 180000 }), cliquer(p, 'activiteequipes #aeActualiser')]);
    const api = (await rep.json()).data || {};
    await attendre();
    const fenetresAvant = await fenetres();
    let e = await ecran();
    const bv = vendeurs(null), bc = caissieres(null);
    ok('Carte « Annulations par auteur de la vente », avec son aide « ? » et ses deux tableaux', e.present && e.titre === 'Annulations par auteur de la vente' && e.aide === 1
      && e.v.entete.join('|') === 'Vendeur|Ventes|Annulées ensuite|Taux' && e.c.entete.join('|') === 'Caissière|Annul. comptant|Modif. comptant|Modif. crédit',
    JSON.stringify({ present: e.present, titre: e.titre, aide: e.aide, v: e.v.entete, c: e.c.entete }));
    ok('Cas variés : plusieurs vendeurs avec annulées, plusieurs caissières, modifications au comptant et à crédit',
      bv.filter((x) => x.annulees > 0).length >= 2 && bc.length >= 2 && bc.some((x) => x.modificationsComptant > 0) && bc.some((x) => x.modificationsCredit > 0),
      JSON.stringify({ vendeurs: bv.length, caissieres: bc.length }));
    const av = api.parVendeur || [], ac = api.parCaissier || [];
    ok('Rapprochement vendeurs : API = base (ventes, annulées ensuite, taux)', JSON.stringify(trier(av, cleV)) === JSON.stringify(trier(bv, cleV)),
      JSON.stringify({ api: trier(av, cleV).slice(0, 3), base: trier(bv, cleV).slice(0, 3) }));
    ok('Rapprochement caissières : API = base (annulations comptant, modifications comptant et crédit)', JSON.stringify(trier(ac, cleC)) === JSON.stringify(trier(bc, cleC)),
      JSON.stringify({ api: trier(ac, cleC).slice(0, 3), base: trier(bc, cleC).slice(0, 3) }));
    ok('Somme : annulées des vendeurs = ventes annulées de la base sur la période (hors modifications)',
      av.reduce((s, x) => s + x.annulees, 0) === Number(q(`SELECT COUNT(*) FROM t_preenregistrement p WHERE p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 1`
        + ` AND p.int_PRICE > 0 AND p.lg_TYPE_VENTE_ID <> '5' AND p.lg_USER_VENDEUR_ID IS NOT NULL AND p.dt_CREATED >= '${D}' AND p.dt_CREATED < '${F}' AND NOT ${MODIF}`)));
    const ev = e.v.lignes.map((l) => [l.id, ...l.cellules.slice(1).map(nombre)].join('|'));
    const ec = e.c.lignes.map((l) => [l.id, ...l.cellules.slice(1).map(nombre)].join('|'));
    ok('Écran = API, ligne par ligne, dans l\'ordre (12 premiers de chaque tableau)',
      JSON.stringify(ev) === JSON.stringify(av.slice(0, 12).map((x) => [x.id, x.ventes, x.annulees, x.taux].join('|')))
      && JSON.stringify(ec) === JSON.stringify(ac.slice(0, 12).map((x) => [x.id, x.annulationsComptant, x.modificationsComptant, x.modificationsCredit].join('|'))),
    JSON.stringify({ ev: ev.slice(0, 2), ec: ec.slice(0, 2) }));
    ok('Ergonomie : les deux tableaux tiennent dans leur cadre (1366 × 768)', e.dansLeCadre);

    /* detail d'un vendeur : clic sur sa ligne */
    const vId = av.find((x) => x.annulees > 0).id;
    const [rd] = await Promise.all([p.waitForResponse((r) => /annulations\/detail/.test(r.url()), { timeout: 60000 }),
      p.click(`table.ae-ann-vendeurs tr[data-id="${vId}"]`)]);
    const dv = (await rd.json()).data || [];
    await p.waitForTimeout(800);
    const refsEcran = () => p.evaluate(() => Array.from(document.querySelectorAll('table.ae-ann-liste tbody tr')).map((tr) => tr.children[0].innerText.trim()));
    let re = await refsEcran();
    const rbv = q(`SELECT p.str_REF FROM t_preenregistrement p WHERE p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 1 AND p.int_PRICE > 0`
      + ` AND p.lg_TYPE_VENTE_ID <> '5' AND p.lg_USER_VENDEUR_ID = '${vId}' AND p.dt_CREATED >= '${D}' AND p.dt_CREATED < '${F}' AND NOT ${MODIF}`).split('\n').filter(Boolean);
    ok('Détail d\'un vendeur (clic sur sa ligne) : références écran = API = base, nombre = « annulées ensuite »',
      JSON.stringify(re.slice().sort()) === JSON.stringify(dv.map((x) => x.reference).sort()) && JSON.stringify(re.slice().sort()) === JSON.stringify(rbv.slice().sort())
      && re.length === av.find((x) => x.id === vId).annulees, JSON.stringify({ ecran: re.length, api: dv.length, base: rbv.length }));
    ok('Détail : chaque ligne dit l\'opération, par qui et quand', dv.length > 0 && dv.every((x) => x.operation && x.parQui && x.quand && x.dateVente));

    /* detail d'une caissiere */
    const cx = ac.find((x) => x.annulationsComptant > 0 && x.modificationsComptant + x.modificationsCredit > 0) || ac[0];
    const [rd2] = await Promise.all([p.waitForResponse((r) => /annulations\/detail/.test(r.url()), { timeout: 60000 }),
      p.click(`table.ae-ann-caissiers tr[data-id="${cx.id}"]`)]);
    const dc = (await rd2.json()).data || [];
    await p.waitForTimeout(800);
    re = await refsEcran();
    ok('Détail d\'une caissière : nombre de lignes = annulations + modifications comptant et crédit ; écran = API',
      dc.length === cx.total && re.length === dc.length && dc.filter((x) => x.operation === 'Annulation').length === cx.annulationsComptant,
      JSON.stringify({ ecran: re.length, api: dc.length, attendu: cx }));
    ok('Consultation en place : aucune fenêtre ouverte', (await fenetres()) === fenetresAvant);

    /* un employe seul */
    const emp = bv.slice().sort((x, y) => y.annulees - x.annulees)[0].id;
    await p.evaluate((id) => { Ext.ComponentQuery.query('activiteequipes #aeEmploye')[0].setValue(id); }, emp);
    const [rep2] = await Promise.all([p.waitForResponse((r) => /activite-equipes\/annulations\?/.test(r.url()), { timeout: 180000 }), cliquer(p, 'activiteequipes #aeActualiser')]);
    const api2 = (await rep2.json()).data || {};
    await attendre();
    e = await ecran();
    ok('Un employé seul (filtre Employé) : vendeurs et caissières = base, écran = API',
      JSON.stringify(trier(api2.parVendeur || [], cleV)) === JSON.stringify(trier(vendeurs(emp), cleV))
      && JSON.stringify(trier(api2.parCaissier || [], cleC)) === JSON.stringify(trier(caissieres(emp), cleC))
      && e.v.lignes.length === (api2.parVendeur || []).length && e.v.lignes.every((l) => l.id === emp),
    JSON.stringify({ api: trier(api2.parVendeur || [], cleV), base: trier(vendeurs(emp), cleV) }));
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
