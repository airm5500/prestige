/* PLAN DU 08/11, POINT 4 : VENTES TERMINEES, REPERE D'UNE VENTE SCINDEE EN DEUX (ASSURANCE + COMPTANT).
 *
 * Retour : « ajouter un signe pour marquer une vente scindee en 2 (assurance + comptant) ».
 * Une vente scindee (cas 1 du 03/11) donne deux ventes qui se designent l'une l'autre (lg_VENTE_LIEE_ID).
 *
 * Par l'ecran (menu, dates saisies, recherche) :
 *  - rapprochement liste / API / base, ligne par ligne sur la journee : venteLiee et venteLieeRef de chaque vente
 *    = la vente liee en base (vide pour les ventes ordinaires) ;
 *  - repere « ⇄ » dans la colonne Reference sur les deux ventes du couple, et sur elles seules ; son info-bulle donne
 *    la reference de l'autre vente ;
 *  - clic sur le repere : le detail de l'AUTRE vente s'ouvre (reference, montant = base, « Vente liee n° » = la
 *    premiere). Lecture seule.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const V = require('../outils/vues');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '--raw'], { input: s, encoding: 'utf8' }).replace(/\r/g, '').trim();
const ligne = (s) => q(s).split('\t');

/* couple le plus recent de ventes liees, closes et non annulees */
const [A, REF_A, B, REF_B, JOUR] = ligne(`SELECT p.lg_PREENREGISTREMENT_ID, p.str_REF, l.lg_PREENREGISTREMENT_ID, l.str_REF, DATE(p.dt_UPDATED) FROM t_preenregistrement p
  JOIN t_preenregistrement l ON l.lg_PREENREGISTREMENT_ID = p.lg_VENTE_LIEE_ID AND l.lg_VENTE_LIEE_ID = p.lg_PREENREGISTREMENT_ID
  WHERE p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND l.str_STATUT = 'is_Closed' AND p.int_PRICE > 0 ORDER BY p.dt_UPDATED DESC, p.str_REF DESC LIMIT 1`);
const PRIX_B = q(`SELECT int_PRICE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${B}'`);
const JJ = JOUR ? JOUR.split('-').reverse().join('/') : '';
/* la semaine qui finit ce jour-la : des ventes ordinaires a cote du couple (jeu varie) */
const DEBUT = q(`SELECT DATE_FORMAT(DATE_SUB('${JOUR}', INTERVAL 6 DAY), '%d/%m/%Y')`);

(async () => {
  let b = null;
  const err = [];
  try {
    ok('Jeu d\'essai : un couple de ventes liées dans la base', A && B, [REF_A, REF_B, JOUR].join(' | '));
    b = await ENV_E2E.lancer(chromium);
    const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
    p.on('pageerror', (e) => err.push(e.message));
    await V.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const menu = await p.evaluate(() => { const r = Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().findChild('id', 'ventemanager', true); return r ? [r.parentNode.get('text'), r.get('text')] : null; });
    await V.ouvrirMenu(p, menu[0], menu[1]);
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('ventemanager gridpanel')[0]; return g && g.getStore && !g.getStore().isLoading(); }, null, { timeout: 30000 });
    await V.saisir(p, 'ventemanager #dtStart', DEBUT);
    await V.saisir(p, 'ventemanager #dtEnd', JJ);
    await V.cliquer(p, 'ventemanager #rechercher');
    await p.waitForTimeout(500);
    await p.waitForFunction(() => !Ext.ComponentQuery.query('ventemanager gridpanel')[0].getStore().isLoading(), null, { timeout: 30000 });
    /* toutes les ventes du jour, page par page de l'ecran */
    const lignes = await p.evaluate(async () => {
      const g = Ext.ComponentQuery.query('ventemanager gridpanel')[0], s = g.getStore(), out = [];
      const lire = () => s.getRange().forEach((r, i) => { const n = g.getView().getNode(i), c = n && n.querySelector('[data-vente-liee]');
        out.push({ id: r.get('lgPREENREGISTREMENTID'), ref: r.get('strREF'), liee: r.get('venteLiee') || '', lieeRef: r.get('venteLieeRef') || '', repere: !!c, tip: c ? (c.getAttribute('data-qtip') || '') : '' }); });
      const pages = Math.ceil(s.getTotalCount() / s.pageSize);
      for (let pg = 1; pg <= pages; pg++) {
        if (pg > 1) { await new Promise((ok) => s.loadPage(pg, { callback: ok })); }
        lire();
      }
      if (pages > 1) { await new Promise((ok) => s.loadPage(1, { callback: ok })); }
      return out;
    });
    const base = {};
    /* une vente qui designe une vente absente de la base (lien orphelin) ne porte pas de repere : la vente liee
       attendue est celle qui existe vraiment */
    q(`SELECT p.lg_PREENREGISTREMENT_ID, IFNULL(l.lg_PREENREGISTREMENT_ID, ''), IFNULL(l.str_REF, '') FROM t_preenregistrement p LEFT JOIN t_preenregistrement l ON l.lg_PREENREGISTREMENT_ID = p.lg_VENTE_LIEE_ID
      WHERE p.lg_PREENREGISTREMENT_ID IN ('${lignes.map((x) => x.id).join("','")}')`).split('\n').forEach((l) => { const [id, liee, ref] = l.split('\t'); base[id] = { liee: liee || '', ref: ref || '' }; });
    const ecarts = lignes.filter((x) => !base[x.id] || base[x.id].liee !== x.liee || base[x.id].ref !== x.lieeRef);
    ok(`Liste = base, ligne par ligne (${lignes.length} ventes du ${DEBUT} au ${JJ}, dont ${lignes.filter((x) => !x.liee).length} ordinaires) : vente liée et sa référence`,
      lignes.length > 2 && lignes.some((x) => !x.liee) && ecarts.length === 0, JSON.stringify(ecarts.slice(0, 3)));
    const avec = lignes.filter((x) => x.repere).map((x) => x.ref).sort();
    ok('Repère « ⇄ » sur les deux ventes du couple et sur elles seules', JSON.stringify(avec) === JSON.stringify([REF_A, REF_B].sort()), avec.join(','));
    const la = lignes.find((x) => x.id === A) || {}, lb = lignes.find((x) => x.id === B) || {};
    ok('Info-bulle : chaque vente donne la référence de l\'autre', la.tip.includes(REF_B) && lb.tip.includes(REF_A), la.tip + ' / ' + lb.tip);

    /* clic sur le repere de A : detail de B */
    await V.saisir(p, 'ventemanager #query', REF_A);
    await V.cliquer(p, 'ventemanager #rechercher');
    await p.waitForTimeout(500);
    await p.waitForFunction((a) => { const s = Ext.ComponentQuery.query('ventemanager gridpanel')[0].getStore(); return !s.isLoading() && s.findExact('lgPREENREGISTREMENTID', a) >= 0; }, A, { timeout: 30000 });
    const rep = await p.evaluate((a) => { const g = Ext.ComponentQuery.query('ventemanager gridpanel')[0]; const n = g.getView().getNode(g.getStore().findExact('lgPREENREGISTREMENTID', a));
      const c = n.querySelector('[data-vente-liee]'); c.id = c.id || 'e2e-vente-liee'; return c.id; }, A);
    await p.click('#' + rep);
    await p.waitForFunction(() => Ext.ComponentQuery.query('window{isVisible()}').some((w) => /D[ée]tail/i.test(w.title || '')), null, { timeout: 20000 });
    await p.waitForTimeout(800);
    const det = await p.evaluate(() => { const w = Ext.ComponentQuery.query('window{isVisible()}').filter((x) => /D[ée]tail/i.test(x.title || '')).pop(); const t = w.getEl().dom.textContent.replace(/\s+/g, ' '); return { titre: w.title, t }; });
    ok(`Clic sur le repère de ${REF_A} : détail de ${REF_B}, montant ${PRIX_B} (base), « Vente liée n° ${REF_A} »`,
      det.t.includes(REF_B) && /Vente liée n°/.test(det.t) && det.t.includes(REF_A) && det.t.replace(/[\s.  ]/g, '').includes(PRIX_B), det.titre + ' | ' + det.t.slice(0, 300));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    if (b) { await b.close(); }
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
