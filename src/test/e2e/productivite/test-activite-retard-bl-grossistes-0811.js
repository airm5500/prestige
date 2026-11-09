/* PLAN DU 08/11, POINT 15.2 : DELAI DE SAISIE DES BL, GROSSISTES D'UNE TRANCHE.
 *
 * Par les vues (admin, 1366 x 768) : ANALYSE DE GESTION > Activité des équipes > Analyses, septembre 2026 saisi au
 * clavier, Actualiser, puis clic à la souris sur chaque part du camembert « Délai de saisie des BL » :
 *  - une petite fenêtre de consultation s'ouvre, titrée par la tranche : grossiste, nombre de BL, délai moyen ;
 *  - rapprochement, tranche par tranche et grossiste par grossiste : fenêtre = API = calcul refait ici BL par BL
 *    depuis la base (écart en jours entre la date de livraison et l'entrée du BL) ;
 *  - total en pied = nombre de la tranche = part du camembert ; somme des tranches = BL de la période ;
 *  - cas variés : plusieurs tranches non vides, plusieurs grossistes dans au moins une tranche ;
 *  - ergonomie : la fenêtre se ferme par « Fermer », aucune erreur JavaScript. Lecture seule.
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

/* calcul independant, BL par BL */
function attendu() {
  const t = { J0: {}, J1: {}, J2: {}, SANS: {} };
  const lignes = q(`SELECT IFNULL(g.str_LIBELLE, 'Sans grossiste'), IFNULL(DATEDIFF(DATE(b.dt_CREATED), b.dt_DATE_LIVRAISON), 'NULL') FROM t_bon_livraison b`
    + ` JOIN t_order o ON o.lg_ORDER_ID = b.lg_ORDER_ID LEFT JOIN t_grossiste g ON g.lg_GROSSISTE_ID = o.lg_GROSSISTE_ID`
    + ` WHERE b.str_STATUT = 'is_Closed' AND b.dt_CREATED >= '${D}' AND b.dt_CREATED < '${F}'`
    + ` AND EXISTS (SELECT 1 FROM t_bon_livraison_detail d WHERE d.lg_BON_LIVRAISON_ID = b.lg_BON_LIVRAISON_ID)`).split('\n').filter(Boolean);
  for (const l of lignes) {
    const [g, j] = l.split('\t');
    const code = j === 'NULL' ? 'SANS' : Number(j) <= 0 ? 'J0' : Number(j) === 1 ? 'J1' : 'J2';
    const x = t[code][g] || (t[code][g] = { nom: g, bl: 0, jours: 0 });
    x.bl++; x.jours += j === 'NULL' ? 0 : Number(j);
  }
  const r = {};
  for (const code of Object.keys(t)) {
    r[code] = Object.values(t[code]).map((x) => [x.nom, x.bl, code === 'SANS' ? '' : arrondi(x.jours / x.bl)].join('|')).sort();
  }
  return { tranches: r, total: lignes.length };
}

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const attendre = () => p.waitForFunction(() => { const a = Ext.ComponentQuery.query('activiteequipes')[0].analyses;
    return a.rendered && !(a.loadMask && a.loadMask.isVisible()) && document.querySelectorAll('.ae-tuile').length > 0; }, null, { timeout: 180000 })
    .then(() => p.waitForTimeout(2000));
  const nombre = (s) => Number(String(s).replace(/[^\d,-]/g, '').replace(',', '.'));
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'ANALYSE DE GESTION', 'Activité des équipes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('activiteequipes').some((c) => c.isVisible(true)), null, { timeout: 60000 });
    await saisir(p, 'activiteequipes #aeDebut', '01/09/2026');
    await saisir(p, 'activiteequipes #aeFin', '30/09/2026');
    await cliquer(p, 'activiteequipes button[itemId=ae-analyses]');
    await attendre();
    const [rep] = await Promise.all([p.waitForResponse((r) => /activite-equipes\/analyses/.test(r.url()), { timeout: 180000 }), cliquer(p, 'activiteequipes #aeActualiser')]);
    const api = ((await rep.json()).data || {}).retardBl || [];
    await attendre();
    const base = attendu();
    const cle = (l) => (l || []).map((g) => [g.nom, g.bl, g.delaiMoyen === null || g.delaiMoyen === undefined ? '' : g.delaiMoyen].join('|')).sort();
    ok('Cas variés : au moins deux tranches non vides, plusieurs grossistes dans une tranche',
      Object.values(base.tranches).filter((l) => l.length).length >= 2 && Object.values(base.tranches).some((l) => l.length >= 2), JSON.stringify(base.tranches).slice(0, 300));
    ok('Rapprochement API = base, tranche par tranche et grossiste par grossiste (BL, délai moyen)',
      api.every((t) => JSON.stringify(cle(t.grossistes)) === JSON.stringify(base.tranches[t.code])) && api.reduce((s, t) => s + t.nombre, 0) === base.total
      && api.every((t) => t.nombre === (t.grossistes || []).reduce((s, g) => s + g.bl, 0)),
    JSON.stringify(api.map((t) => ({ code: t.code, api: cle(t.grossistes).slice(0, 2), base: (base.tranches[t.code] || []).slice(0, 2) }))));

    /* clic a la souris sur chaque part non vide du camembert */
    await p.evaluate(() => Ext.ComponentQuery.query('activiteequipes')[0].analyses.down('#cRetard').getEl().dom.scrollIntoView());
    await p.waitForTimeout(800);
    let parts = 0, conformes = 0, fermees = 0; const ecarts = [];
    for (let i = 0; i < api.length; i++) {
      if (!api[i].nombre) { continue; }
      parts++;
      const pt = await p.evaluate((k) => {
        const g = Ext.ComponentQuery.query('activiteequipes')[0].analyses.down('#gRetard'), s = g.series.get(0), it = s.items[k];
        const xy = g.getEl().getXY(), m = it.middle || {};
        let x = m.x, y = m.y;
        if (x === undefined) { const bb = it.sprite.getBBox(); x = bb.x + bb.width / 2; y = bb.y + bb.height / 2; }
        return { x: xy[0] + x, y: xy[1] + y, libelle: it.storeItem.get('libelle') };
      }, i);
      await p.mouse.move(pt.x, pt.y);
      await p.waitForTimeout(300);
      await p.mouse.click(pt.x, pt.y);
      const ouverte = await p.waitForFunction(() => { const w = Ext.ComponentQuery.query('#aeGrossistesRetard')[0]; return w && w.isVisible(); }, null, { timeout: 8000 })
        .then(() => true, () => false);
      if (!ouverte) { ecarts.push(pt.libelle + ' : pas de fenêtre'); continue; }
      const w = await p.evaluate(() => { const w = Ext.ComponentQuery.query('#aeGrossistesRetard')[0], t = w.body.dom.querySelector('table.ae-gr');
        const lire = (tr) => Array.from(tr.children).map((x) => x.innerText.trim());
        return { titre: w.title, lignes: t ? Array.from(t.tBodies[0].rows).map(lire) : [], pied: t && t.tFoot ? lire(t.tFoot.rows[0]) : [] }; });
      const sans = api[i].code === 'SANS';
      const ecran = w.lignes.map((l) => [l[0], nombre(l[1]), sans ? '' : nombre(l[2])].join('|')).sort();
      const bon = w.titre === 'Délai de saisie des BL : ' + api[i].libelle && JSON.stringify(ecran) === JSON.stringify(cle(api[i].grossistes))
        && nombre(w.pied[1]) === api[i].nombre;
      if (bon) { conformes++; } else { ecarts.push(JSON.stringify({ code: api[i].code, titre: w.titre, ecran: ecran.slice(0, 3), pied: w.pied })); }
      await p.click('#aeGrossistesRetard button:has-text("Fermer")').catch(() => p.evaluate(() => Ext.ComponentQuery.query('#aeGrossistesRetard')[0].close()));
      await p.waitForTimeout(400);
      if (!(await p.evaluate(() => Ext.ComponentQuery.query('#aeGrossistesRetard').some((x) => x.isVisible())))) { fermees++; }
    }
    ok('Clic sur chaque part : fenêtre titrée par la tranche, grossistes = API, total en pied = part', parts >= 2 && conformes === parts, parts + ' parts ; ' + ecarts.join(' ; '));
    ok('Ergonomie : la fenêtre se ferme par « Fermer »', fermees === parts && parts > 0);
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
