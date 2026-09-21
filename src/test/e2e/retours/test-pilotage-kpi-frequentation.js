/* KPI « FREQUENTATION HORAIRE » : le seul indicateur qu'on ne voyait pas (retour de l'officine du 21/09).
 *
 * « De facon aleatoire quand je selectionne un KPI a ajouter je ne le vois pas en tuile, en courbe et dans les
 * donnees mensuelles. » Ce n'etait pas aleatoire : c'etait CE KPI. Il ne se lit pas par mois - il dit a quelle
 * heure on sert le plus de clients - et n'alimentait qu'un tableau pose tout en bas de l'onglet, apres la
 * courbe. Coche, il semblait n'apparaitre nulle part. Les quatorze autres indicateurs, eux, se montraient.
 *
 * CE QUE CE TEST ETABLIT, sur le parcours reel :
 *  - CHAQUE indicateur du catalogue, coche seul, donne une tuile ; les mensuels donnent aussi une colonne ;
 *  - la frequentation cochee donne la tuile « Heure de pointe » ET un diagramme horaire visible SOUS les
 *    tuiles, avec autant de bandes que d'heures de vente ;
 *  - l'heure de pointe affichee est EXACTEMENT celle de la base ;
 *  - decochee, le diagramme disparait ;
 *  - quatre indicateurs coches en rafale donnent quatre tuiles de plus, aucune perdue.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const VENTES = "p.int_PRICE>0 AND p.str_STATUT='is_Closed' AND p.b_IS_CANCEL=0 AND p.lg_TYPE_VENTE_ID<>'5'";

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1700, height: 1000 } });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('pilotage', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('pilotage #onglets').length > 0, null, { timeout: 30000 });
    await p.waitForFunction(() => { const z = Ext.ComponentQuery.query('pilotage #barrePeriode #zoneProgression')[0]; return !z || z.isHidden(); }, null, { timeout: 300000 });

    /* Douze mois glissants : le mois en cours du banc n'a pas de vente, l'annee ecoulee en a. */
    await p.evaluate(() => { const a = Ext.ComponentQuery.query('pilotage #barrePeriode combobox')[0]; a.setValue('G12'); a.fireEvent('select', a); });
    await p.waitForTimeout(2500);
    await p.evaluate(() => { const o = Ext.ComponentQuery.query('pilotage #onglets')[0]; o.setActiveTab(o.items.items.filter((t) => t.title === 'KPI Analyse')[0]); });
    const attendre = async () => {
      await p.waitForFunction(() => { const o = Ext.ComponentQuery.query('pilotage #onglet-kpi')[0]; return o && !o.loadMask || (o.loadMask && !o.loadMask.isVisible()); }, null, { timeout: 60000 });
      await p.waitForTimeout(1200);
    };
    await attendre();

    const etat = () => p.evaluate(() => {
      const e = Ext.ComponentQuery.query('pilotage')[0];
      const tuiles = []; e.stores.kpi.tuiles.each((r) => tuiles.push({ cle: r.get('cle'), valeur: r.get('valeur'), sous: r.get('sousTitre') }));
      const cols = e.down('#detail-kpi').headerCt.getGridColumns().map((c) => c.dataIndex);
      const h = Ext.ComponentQuery.query('pilotage #frequentation')[0];
      const g = h ? h.down('chart') : null;
      const cadre = h && h.isVisible(true) && h.getEl() ? h.getEl().dom.getBoundingClientRect() : null;
      const tuilesEl = e.down('#tuiles-kpi') && e.down('#tuiles-kpi').getEl() ? e.down('#tuiles-kpi').getEl().dom.getBoundingClientRect() : null;
      return { tuiles, cols, horaireVisible: !!(h && h.isVisible(true)), bandes: g ? g.store.getCount() : -1,
        sousLesTuiles: !!(cadre && tuilesEl && cadre.top >= tuilesEl.bottom - 2) };
    });
    const clic = (k, v) => p.evaluate(([k, v]) => { Ext.ComponentQuery.query('pilotage #casesKpi checkbox').filter((c) => c.cleKpi === k)[0].setValue(v); }, [k, v]);
    const cles = await p.evaluate(() => Ext.ComponentQuery.query('pilotage #casesKpi checkbox').map((c) => c.cleKpi));
    ok('Le catalogue porte ses quinze indicateurs, dont la fréquentation', cles.length === 15 && cles.indexOf('frequentation') >= 0, cles.join(','));

    const parDefaut = ['caTTC', 'nbVentes', 'panier'];
    const manques = [];
    for (const k of cles) {
      if (parDefaut.indexOf(k) >= 0) { continue; }
      await clic(k, true); await attendre();
      const s = await etat();
      const tuile = s.tuiles.some((t) => t.cle === k);
      const colonne = k === 'frequentation' ? true : s.cols.indexOf(k) >= 0;
      if (!tuile || !colonne) { manques.push(k + (tuile ? '' : ' sans tuile') + (colonne ? '' : ' sans colonne')); }
      await clic(k, false); await attendre();
    }
    ok('CHAQUE indicateur coché seul apparaît en tuile, et en colonne mensuelle quand il se lit par mois', manques.length === 0, manques.join(' | ') || 'les douze non cochés par défaut, un par un');

    /* La frequentation, en detail. */
    await clic('frequentation', true); await attendre();
    const s = await etat();
    const tuile = s.tuiles.filter((t) => t.cle === 'frequentation')[0];
    ok('Cochée, la fréquentation a sa tuile « Heure de pointe »', !!tuile, JSON.stringify(tuile));
    ok('Et un diagramme horaire VISIBLE, placé sous les tuiles', s.horaireVisible && s.sousLesTuiles, 'visible=' + s.horaireVisible + ' sousLesTuiles=' + s.sousLesTuiles);
    /* La periode servie par l'ecran, « 01/09/2025 -> 31/08/2026 », relue en bornes SQL (fin exclue). */
    const periode = await p.evaluate(async () => { const r = await fetch('../api/v1/pilotage/onglet/kpi?axe=G12&kpis=frequentation', { credentials: 'same-origin' }).then((x) => x.json()); return r.axe.periode; });
    const iso = (d) => d.trim().split('/').reverse().join('-');
    const [d1, d2] = periode.split('->');
    const debut = iso(d1);
    const fin = new Date(new Date(iso(d2)).getTime() + 86400000).toISOString().slice(0, 10);
    const attendu = q("SELECT CONCAT(HOUR(p.dt_UPDATED),' ',COUNT(*)) FROM t_preenregistrement p WHERE " + VENTES
      + " AND p.dt_UPDATED >= '" + debut + "' AND p.dt_UPDATED < '" + fin + "' GROUP BY HOUR(p.dt_UPDATED) ORDER BY COUNT(*) DESC LIMIT 1").split(' ');
    const heures = q("SELECT COUNT(DISTINCT HOUR(p.dt_UPDATED)) FROM t_preenregistrement p WHERE " + VENTES
      + " AND p.dt_UPDATED >= '" + debut + "' AND p.dt_UPDATED < '" + fin + "'");
    ok('L heure de pointe affichée est EXACTEMENT celle de la base', tuile && Number(tuile.valeur) === Number(attendu[0]) && String(tuile.sous).indexOf(String(Number(attendu[1]).toLocaleString('fr-FR').replace(/ | /g, ' '))) >= 0,
      'écran ' + (tuile && tuile.valeur) + 'h « ' + (tuile && tuile.sous) + ' » contre base ' + attendu.join('h, ') + ' clients');
    ok('Le diagramme porte une bande par heure de vente', s.bandes === Number(heures), s.bandes + ' bandes contre ' + heures + ' heures en base');
    await clic('frequentation', false); await attendre();
    const s2 = await etat();
    ok('Décochée, le diagramme disparaît et la tuile aussi', !s2.horaireVisible && !s2.tuiles.some((t) => t.cle === 'frequentation'));

    /* Rafale. */
    const rafale = cles.filter((k) => parDefaut.indexOf(k) < 0 && k !== 'frequentation').slice(0, 4);
    for (const k of rafale) { await clic(k, true); await p.waitForTimeout(120); }
    await p.waitForTimeout(1500); await attendre();
    const s3 = await etat();
    const perdus = rafale.filter((k) => !s3.tuiles.some((t) => t.cle === k));
    ok('Quatre indicateurs cochés en rafale : quatre tuiles de plus, aucune perdue', perdus.length === 0 && s3.tuiles.length === 7, s3.tuiles.length + ' tuiles, perdus : ' + (perdus.join(',') || 'aucun'));

    ok('Aucune erreur JavaScript pendant tout le parcours', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Le parcours va au bout', false, e.message + ' ' + (e.stack || '').split('\n')[1]);
  } finally {
    await b.close();
    const kos = res.filter((r) => !r.c);
    console.log('\n' + res.filter((r) => r.c).length + '/' + res.length + ' controles OK');
    process.exit(kos.length ? 1 : 0);
  }
})();
