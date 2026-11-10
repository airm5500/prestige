/* PLAN DU 09/11, POINT 6 : TUILES DE PLUS SUR LA CARTE « ACTIVITE DES EQUIPES » DU TABLEAU DE BORD.
 *
 * Raccourci avant le clic sur le detail : preventes perdues (annulees + abandonnees, sur le total), ventes annulees,
 * BL entres et part saisie a J+2 ou plus, CA conseille (conseils et ventes conseillees).
 *
 * Jeux d'essai varies : trois jours (17/10 le plus charge, 05/10, aujourd'hui) ; sur le 17/10, trois ventes recoivent
 * le temps du test un employe « conseil » (deux employes, montants differents), remis a l'identique a la fin.
 *
 *  - rapprochement : tuile (valeur et detail) = API analyses / indicateurs = base (requetes independantes) ;
 *  - meme style que les reperes : aucune bordure gauche coloree, pas de cadre de couleur ;
 *  - les 4 reperes d'origine sont inchanges (carte = API) ;
 *  - clic sur une tuile de plus : ouvre le detail (fenetre du menu), comme le reste de la carte ;
 *  - bilan : conseils remis a NULL, dates du tableau de bord remises, aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 28 }).replace(/\r/g, '').trim();
const U = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const A2 = q("SELECT lg_USER_ID FROM t_user WHERE str_STATUT = 'enable' AND lg_USER_ID <> '" + U + "' AND lg_USER_ID NOT LIKE 'E2E%' ORDER BY lg_USER_ID LIMIT 1");
const J = q('SELECT CURDATE()');
const JOURS = ['2026-10-17', '2026-10-05', J];
/* trois ventes du 17/10 sans conseil, montants differents */
const CONSEILLEES = q("SELECT lg_PREENREGISTREMENT_ID FROM t_preenregistrement p WHERE p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 AND p.lg_TYPE_VENTE_ID <> '5'"
  + " AND p.dt_UPDATED >= '2026-10-17' AND p.dt_UPDATED < '2026-10-18' AND (p.lg_USER_CONSEIL_ID IS NULL OR p.lg_USER_CONSEIL_ID = '')"
  + " AND EXISTS (SELECT 1 FROM t_preenregistrement_detail d WHERE d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID)"
  + " GROUP BY p.int_PRICE ORDER BY p.int_PRICE DESC LIMIT 3").split('\n').filter(Boolean);
const AVANT = CONSEILLEES.map((id) => q("SELECT IFNULL(lg_USER_CONSEIL_ID, 'NULL') FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + id + "'"));
const remettre = () => CONSEILLEES.forEach((id, i) => q("UPDATE t_preenregistrement SET lg_USER_CONSEIL_ID = " + (AVANT[i] === 'NULL' ? 'NULL' : "'" + AVANT[i] + "'")
  + " WHERE lg_PREENREGISTREMENT_ID = '" + id + "'"));

function base(d) {
  const f = `'${d}' + INTERVAL 1 DAY`;
  const pv = q(`SELECT IFNULL(SUM(p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.lg_USER_CAISSIER_ID <> p.lg_USER_VENDEUR_ID), 0),`
    + ` IFNULL(SUM(p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 1 AND p.lg_USER_CAISSIER_ID <> p.lg_USER_VENDEUR_ID AND NOT EXISTS (SELECT 1 FROM vente_modifiee vm WHERE vm.vente_origine_id = p.lg_PREENREGISTREMENT_ID)), 0),`
    + ` IFNULL(SUM(p.str_STATUT IN ('is_Process', 'pending') AND p.dt_UPDATED < CURDATE() AND EXISTS (SELECT 1 FROM t_preenregistrement_detail x WHERE x.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID)), 0)`
    + ` FROM t_preenregistrement p WHERE p.dt_CREATED >= '${d}' AND p.dt_CREATED < ${f} AND p.int_PRICE > 0 AND p.lg_TYPE_VENTE_ID <> '5' AND p.lg_USER_VENDEUR_ID IS NOT NULL`).split('\t').map(Number);
  const annul = Number(q(`SELECT COUNT(*) FROM t_preenregistrement p WHERE p.b_IS_CANCEL = 1 AND p.int_PRICE > 0 AND p.dt_ANNULER >= '${d}' AND p.dt_ANNULER < ${f}`
    + ' AND NOT EXISTS (SELECT 1 FROM vente_modifiee vm WHERE vm.vente_origine_id = p.lg_PREENREGISTREMENT_ID)'));
  const bl = q(`SELECT COUNT(*), IFNULL(SUM(DATEDIFF(b.dt_CREATED, b.dt_DATE_LIVRAISON) >= 2), 0) FROM t_bon_livraison b WHERE b.str_STATUT = 'is_Closed' AND b.dt_CREATED >= '${d}' AND b.dt_CREATED < ${f}`
    + ' AND EXISTS (SELECT 1 FROM t_order o WHERE o.lg_ORDER_ID = b.lg_ORDER_ID) AND EXISTS (SELECT 1 FROM t_bon_livraison_detail x WHERE x.lg_BON_LIVRAISON_ID = b.lg_BON_LIVRAISON_ID)').split('\t').map(Number);
  const co = q(`SELECT COUNT(*), IFNULL(SUM(p.int_PRICE), 0) FROM t_preenregistrement p WHERE p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 AND p.lg_TYPE_VENTE_ID <> '5'`
    + ` AND p.dt_UPDATED >= '${d}' AND p.dt_UPDATED < ${f} AND TRIM(IFNULL(p.lg_USER_CONSEIL_ID, '')) <> ''`
    + ' AND EXISTS (SELECT 1 FROM t_preenregistrement_detail x WHERE x.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID)').split('\t').map(Number);
  return { perdues: pv[1] + pv[2], total: pv[0] + pv[1] + pv[2], annul, bl: bl[0], blRetard: bl[0] ? Math.round(1000 * bl[1] / bl[0]) / 10 : 0, conseils: co[0], caConseille: co[1] };
}
const n = (s) => Number(String(s).replace(/[\s  ]/g, '').replace(',', '.'));

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    ok('Jeu d\'essai : trois ventes du 17/10 à montants différents', CONSEILLEES.length === 3, CONSEILLEES.join(','));
    q("UPDATE t_preenregistrement SET lg_USER_CONSEIL_ID = '" + A2 + "' WHERE lg_PREENREGISTREMENT_ID IN ('" + CONSEILLEES.slice(0, 2).join("','") + "')");
    q("UPDATE t_preenregistrement SET lg_USER_CONSEIL_ID = '" + U + "' WHERE lg_PREENREGISTREMENT_ID = '" + CONSEILLEES[2] + "'");
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await p.waitForFunction(() => Ext.ComponentQuery.query('tableaubord').length && document.querySelector('[data-carte="activite"]'), null, { timeout: 120000 });
    const varies = [];
    for (const d of JOURS) {
      await p.evaluate((d) => { document.querySelectorAll('[data-carte="activite"] .ae-rep').forEach((x) => x.setAttribute('data-ancien', '1'));
        testextjs.view.tableaubord.TableauBord.dateForcee = d; const t = Ext.ComponentQuery.query('tableaubord')[0]; t.chargerPreferences(() => t.construire()); }, d);
      await p.waitForFunction(() => { const k = document.querySelector('[data-carte="activite"]'); if (k) { k.scrollIntoView(); }
        const c = document.querySelector('[data-carte="activite"] [data-rep="CONSEIL"]:not([data-ancien])'); return c && c.getAttribute('data-v') !== ''; }, null, { timeout: 120000 }).catch(() => {});
      await p.waitForTimeout(500);
      const carte = await p.evaluate(() => { const el = document.querySelector('[data-carte="activite"]'); const v = {};
        el.querySelectorAll('.tb-activite-plus .ae-rep').forEach((x) => { const s = getComputedStyle(x);
          v[x.getAttribute('data-rep')] = { v: x.querySelector('.v').textContent, d: x.querySelector('.d').textContent.replace(/\s+/g, ' '), dv: x.getAttribute('data-v'),
            bord: s.borderLeftWidth + ' ' + s.borderLeftColor, haut: s.borderTopColor }; });
        v.reperes = Array.from(el.querySelectorAll('.ae-reps:not(.tb-activite-plus) .ae-rep')).map((x) => x.getAttribute('data-rep') + '=' + x.querySelector('.v').textContent);
        return v; });
      const api = await p.evaluate(async (d) => { const a = await (await fetch('../api/v1/activite-equipes/analyses?debut=' + d + '&fin=' + d)).json();
        const i = await (await fetch('../api/v1/activite-equipes/indicateurs?debut=' + d + '&fin=' + d)).json(); return { a: a.data, i: i.data }; }, d);
      const ind = {}; (api.a.indicateurs || []).forEach((x) => { ind[x.code] = x.valeur; });
      const pa = (api.a.preventes || []).reduce((s, x) => ({ perdues: s.perdues + x.annulees + x.abandonnees, total: s.total + x.total }), { perdues: 0, total: 0 });
      const ref = base(d);
      const c = carte;
      ok(d + ' : préventes perdues ' + ref.perdues + ' sur ' + ref.total + ' : tuile = API = base', c.PREVENTES_PERDUES && n(c.PREVENTES_PERDUES.v) === ref.perdues && pa.perdues === ref.perdues
        && pa.total === ref.total && c.PREVENTES_PERDUES.d.startsWith('sur ' + ref.total.toLocaleString('fr-FR').replace(/\s/g, ' ') + ' préventes')
        && (ref.total === 0 || c.PREVENTES_PERDUES.d.includes((Math.round(ref.perdues * 1000 / ref.total) / 10).toLocaleString('fr-FR') + ' %')), JSON.stringify({ c: c.PREVENTES_PERDUES, pa, ref }));
      ok(d + ' : ventes annulées ' + ref.annul + ' : tuile = API = base', c.ANNULATIONS && n(c.ANNULATIONS.v) === ref.annul && ind.ANNULATIONS === ref.annul, JSON.stringify([c.ANNULATIONS, ind.ANNULATIONS, ref.annul]));
      ok(d + ' : BL entrés ' + ref.bl + ' (' + ref.blRetard + ' % à J+2) : tuile = API = base', c.BL && n(c.BL.v) === ref.bl && ind.BL === ref.bl
        && (ref.bl === 0 ? /aucun BL/.test(c.BL.d) : Math.abs(n(c.BL.d.split('%')[0]) - ref.blRetard) < 0.051 && Math.abs(ind.BL_RETARD - ref.blRetard) < 0.051), JSON.stringify([c.BL, ind.BL, ind.BL_RETARD, ref]));
      const tc = (api.i.CONSEIL || {}).total || {};
      ok(d + ' : CA conseillé ' + ref.caConseille + ' (' + ref.conseils + ' conseils) : tuile = API = base', c.CONSEIL && n(c.CONSEIL.v) === ref.caConseille && Number(c.CONSEIL.dv) === ref.caConseille
        && tc.caConseille === ref.caConseille && tc.conseils === ref.conseils && c.CONSEIL.d.startsWith(ref.conseils + ' conseil'), JSON.stringify([c.CONSEIL, tc.caConseille, tc.conseils, ref]));
      ok(d + ' : sans cadre coloré ni bordure gauche colorée (bordure fine grise sur les 4 tuiles)', Object.keys(c).length === 5 && Object.keys(c).filter((k) => k !== 'reperes').every((k) => c[k].bord === '1px rgb(226, 232, 240)' && c[k].haut === 'rgb(226, 232, 240)'),
        JSON.stringify(Object.keys(c).filter((k) => k !== 'reperes').map((k) => c[k].bord + '/' + c[k].haut)));
      const r = api.a.resume;
      ok(d + ' : les 4 repères d\'origine restent (carte = API)', c.reperes.length === 4 && c.reperes[0] === 'LONGUES=' + String(r.ventesLongues), c.reperes.join(' ; '));
      varies.push(ref);
    }
    ok('Jours variés : préventes perdues, annulations, BL et conseils non nuls sur au moins un jour, plusieurs conseils',
      varies.some((x) => x.perdues > 0) && varies.some((x) => x.annul > 0) && varies.some((x) => x.bl > 0) && varies[0].conseils === 3, JSON.stringify(varies));

    /* clic sur une tuile de plus : ouvre le detail */
    await p.click('[data-carte="activite"] [data-rep="ANNULATIONS"]');
    await p.waitForFunction(() => Ext.ComponentQuery.query('#tbActiviteFenetre').length > 0, null, { timeout: 60000 }).catch(() => {});
    const fen = await p.evaluate(() => { const w = Ext.ComponentQuery.query('#tbActiviteFenetre')[0]; const r = !!w && w.isVisible(); if (w) { w.close(); } return r; });
    ok('Clic sur « Ventes annulées » : fenêtre du détail (menu Activité des équipes)', fen);
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Déroulement sans exception', false, e.stack || e.message);
  } finally {
    remettre();
    ok('Bilan : conseils d\'essai retirés (valeurs d\'origine)', CONSEILLEES.every((id, i) => q("SELECT IFNULL(lg_USER_CONSEIL_ID, 'NULL') FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + id + "'") === AVANT[i]));
    await b.close();
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' controles OK');
    process.exit(ko ? 1 : 0);
  }
})();
