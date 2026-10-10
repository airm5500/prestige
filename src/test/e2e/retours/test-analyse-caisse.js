/* GESTION DE CAISSE — ANALYSE DES ECARTS (retours du 10/10, section 16 ; Q9 : negatif = manquant).
 * Jeu d'essai en mars-avril 2025 (aucune caisse du banc sur ces dates), retire a la fin :
 *   Super Admin : 07/03 ven. ferme 20:10, attendu 100 000, billetage  98 000 -> -2 000 (manquant)
 *                 14/03 ven. ferme 20:30, attendu  50 000, billetage  45 000 -> -5 000 (manquant)
 *                 04/04 ven. ferme 20:05, attendu  80 000, billetage  79 500 ->   -500 (manquant)
 *                 07/04 lun. ferme 13:00, attendu  30 000, billetage  30 000 ->      0 (juste)
 *   2e caissier : 08/04 mar. ferme 13:00, attendu  20 000, billetage  21 000 -> +1 000 (surplus)
 *                 09/04 fermee sans billetage (hors des ecarts) ; 10/04 caisse encore ouverte (ignoree)
 *  - le menu ouvre « Liste » / « Analyse » ; la liste donne le meme ecart (-5 000 le 14/03) ;
 *  - tuiles = requete independante ; par caissier (recurrence), par mois, par semaine, jour / heure ; plus gros ecarts ;
 *    tendance ; pistes (caissier recurrent, vendredi, 20 h) ; filtre par caissier ; tolerance.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', process.env.DB_TEST || 'capitale', '-sN'], { input: s, encoding: 'utf8' }).trim();
const LOGIN = process.env.E2E_LOGIN || 'admin';
const [U1, NOM1, EMP] = q(`SELECT lg_USER_ID, CONCAT_WS(' ', str_FIRST_NAME, str_LAST_NAME), lg_EMPLACEMENT_ID FROM t_user WHERE str_LOGIN = '${LOGIN}'`).split('\t');
const [U2, NOM2] = q(`SELECT lg_USER_ID, CONCAT_WS(' ', str_FIRST_NAME, str_LAST_NAME) FROM t_user WHERE str_STATUT = 'enable' AND lg_EMPLACEMENT_ID = '${EMP}' AND lg_USER_ID <> '${U1}' ORDER BY str_LOGIN LIMIT 1`).split('\t');
const CAISSES = [ // id, user, ouverture, fermeture, attendu, billetage, statut
  ['E2E-GC-1', U1, '2025-03-07 08:00', '2025-03-07 20:10', 100000, 98000],
  ['E2E-GC-2', U1, '2025-03-14 08:00', '2025-03-14 20:30', 50000, 45000],
  ['E2E-GC-3', U1, '2025-04-04 08:00', '2025-04-04 20:05', 80000, 79500],
  ['E2E-GC-4', U1, '2025-04-07 08:00', '2025-04-07 13:00', 30000, 30000],
  ['E2E-GC-5', U2, '2025-04-08 08:00', '2025-04-08 13:00', 20000, 21000],
  ['E2E-GC-6', U2, '2025-04-09 08:00', '2025-04-09 13:00', 15000, null],
  ['E2E-GC-7', U2, '2025-04-10 08:00', null, 9000, null, 'is_Using']];

function semer() {
  q(CAISSES.map((c) => "INSERT INTO t_resume_caisse (ld_CAISSE_ID, lg_USER_ID, int_SOLDE_MATIN, int_SOLDE_SOIR, dt_DAY, dt_CREATED, dt_UPDATED, str_STATUT, lg_CREATED_BY)"
    + ` VALUES ('${c[0]}', '${c[1]}', 0, ${c[4]}, DATE('${c[2]}'), '${c[2]}', ${c[3] ? "'" + c[3] + "'" : 'NULL'}, '${c[6] || 'is_Process'}', '${c[1]}');`
    + (c[5] === null ? '' : "INSERT INTO t_billetage (lg_BILLETAGE_ID, ld_CAISSE_ID, int_AMOUNT, lg_USER_ID, dt_CREATED, dt_UPDATED)"
      + ` VALUES ('${c[0]}-B', '${c[0]}', ${c[5]}, '${c[1]}', '${c[3]}', '${c[3]}');`)).join(''));
}
function nettoyer() {
  q("DELETE FROM t_billetage WHERE ld_CAISSE_ID LIKE 'E2E-GC-%'; DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID LIKE 'E2E-GC-%';");
}

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1500, height: 950 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const clic = async (sel) => { await p.evaluate((s) => { const c = Ext.ComponentQuery.query(s)[0]; (c.btnEl || c.getEl()).dom.setAttribute('data-e2e', 'x'); }, sel);
    await p.click('[data-e2e=x]'); await p.evaluate(() => document.querySelectorAll('[data-e2e=x]').forEach((n) => n.removeAttribute('data-e2e'))); };
  const analyse = async () => { await p.evaluate(() => { Ext.ComponentQuery.query('gestioncaisseonglets')[0].donnees = null; });
    await clic('gestioncaisseonglets #anActualiser');
    await p.waitForFunction(() => !!Ext.ComponentQuery.query('gestioncaisseonglets')[0].donnees, null, { timeout: 30000 });
    return p.evaluate(() => Ext.ComponentQuery.query('gestioncaisseonglets')[0].donnees); };
  try {
    ok('Précondition : deux caissiers du même dépôt, aucune caisse du banc en mars-avril 2025', U1 && U2
      && q("SELECT COUNT(*) FROM t_resume_caisse WHERE dt_CREATED BETWEEN '2025-03-01' AND '2025-05-01' AND ld_CAISSE_ID NOT LIKE 'E2E-GC-%'") === '0', NOM1 + ' / ' + NOM2);
    nettoyer(); semer();
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('gestcaissemanager', 'Gestion de caisse', ''));
    await p.waitForFunction(() => Ext.ComponentQuery.query('gestioncaisseonglets gestcaissemanager').length > 0, null, { timeout: 30000 });
    const hub = await p.evaluate(() => { const h = Ext.ComponentQuery.query('gestioncaisseonglets')[0];
      return { onglets: h.query('#ongletsGc button').map((x) => x.getText()), liste: h.getLayout().getActiveItem().isXType('gestcaissemanager') }; });
    ok('Le menu ouvre « Liste » / « Analyse », la liste active', JSON.stringify(hub.onglets) === '["Liste","Analyse"]' && hub.liste, JSON.stringify(hub));

    /* la liste existante : meme ecart, meme signe */
    await p.evaluate(() => { const g = Ext.ComponentQuery.query('gestcaissemanager')[0]; g.down('#dtStart').setValue(new Date(2025, 2, 14)); g.down('#dtEnd').setValue(new Date(2025, 2, 14)); });
    await clic('gestcaissemanager #rechercher');
    await p.waitForFunction(() => { const s = Ext.ComponentQuery.query('gestcaissemanager gridpanel')[0].getStore(); return !s.isLoading() && s.findExact('ldCAISSEID', 'E2E-GC-2') >= 0; }, null, { timeout: 30000 });
    const ligne = await p.evaluate(() => { const g = Ext.ComponentQuery.query('gestcaissemanager gridpanel')[0], r = g.getStore().findRecord('ldCAISSEID', 'E2E-GC-2');
      const col = g.headerCt.getGridColumns().filter((c) => c.dataIndex === 'ecart')[0];
      return { ecart: r.get('ecart'), billetage: r.get('billetage'), tip: col.tooltip, couleur: g.getView().getCell(r, col).dom.innerHTML }; });
    ok('Liste : écart du 14/03 = −5 000 (billetage − attendu), en rouge, infobulle « négatif = manquant »', ligne.ecart === -5000 && /red/.test(ligne.couleur)
      && /négatif = manquant/.test(ligne.tip), JSON.stringify(ligne));

    /* analyse */
    await clic('gestioncaisseonglets #gc-analyse');
    await p.waitForFunction(() => !!Ext.ComponentQuery.query('gestioncaisseonglets')[0].donnees, null, { timeout: 30000 });
    await p.evaluate(() => { const a = Ext.ComponentQuery.query('gestioncaisseonglets')[0].analyse; a.down('#anDebut').setValue(new Date(2025, 2, 1)); a.down('#anFin').setValue(new Date(2025, 3, 30)); });
    const o = await analyse();
    const w = " FROM t_resume_caisse rc JOIN t_user u ON u.lg_USER_ID = rc.lg_USER_ID LEFT JOIN (SELECT ld_CAISSE_ID, lg_USER_ID, SUM(int_AMOUNT) m FROM t_billetage GROUP BY 1, 2) b"
      + " ON b.ld_CAISSE_ID = rc.ld_CAISSE_ID AND b.lg_USER_ID = rc.lg_USER_ID"
      + ` WHERE rc.str_STATUT <> 'is_Using' AND DATE(rc.dt_CREATED) BETWEEN '2025-03-01' AND '2025-04-30' AND u.lg_EMPLACEMENT_ID = '${EMP}'`;
    const att = q("SELECT SUM(b.m IS NOT NULL), SUM(b.m IS NULL), SUM(b.m - ABS(rc.int_SOLDE_SOIR) < 0), COALESCE(SUM(IF(b.m - ABS(rc.int_SOLDE_SOIR) < 0, b.m - ABS(rc.int_SOLDE_SOIR), 0)), 0),"
      + " SUM(b.m - ABS(rc.int_SOLDE_SOIR) > 0), COALESCE(SUM(IF(b.m - ABS(rc.int_SOLDE_SOIR) > 0, b.m - ABS(rc.int_SOLDE_SOIR), 0)), 0)" + w).split('\t').map(Number);
    const t = o.total;
    ok('Tuiles = requête indépendante (billetées 5, sans billetage 1, 3 manquants −7 500, 1 surplus +1 000)',
      JSON.stringify([t.caisses, t.sansBilletage, t.manquants, t.montantManquant, t.surplus, t.montantSurplus]) === JSON.stringify(att) && t.net === -6500,
      JSON.stringify({ ecran: t, attendu: att }));
    const ecran = await p.evaluate(() => { const d = Ext.ComponentQuery.query('gestioncaisseonglets #anContenu')[0].getEl().dom;
      return { tuiles: [...d.querySelectorAll('.pml-tuile')].map((x) => x.textContent), regle: d.querySelector('.gc-regle').textContent,
        caissiers: [...d.querySelectorAll('tr.gc-caissier')].map((r) => r.textContent), gros: [...d.querySelectorAll('tr.gc-gros')].map((r) => r.textContent),
        pistes: d.querySelector('.gc-pistes').textContent, manquantRouge: !!d.querySelector('tr.gc-gros .gc-manquant') }; });
    ok('Règle affichée et manquants en rouge, signés « − »', /négatif = manquant/.test(ecran.regle) && ecran.tuiles[1] === '3Manquants−7 500 F' && ecran.tuiles[2] === '1Surplus+1 000 F' && ecran.manquantRouge,
      JSON.stringify(ecran.tuiles));
    const c1 = o.caissiers.filter((c) => c.libelle === NOM1)[0] || {}, c2 = o.caissiers.filter((c) => c.libelle === NOM2)[0] || {};
    ok('Par caissier : ' + NOM1 + ' 3 manquants sur 4 (75 %), ' + NOM2 + ' un surplus de 1 000', c1.manquants === 3 && c1.caisses === 4 && c1.recurrence === 75 && c2.surplus === 1 && c2.montantSurplus === 1000,
      JSON.stringify(o.caissiers));
    ok('Par mois (mars, avril) et par semaine (4 semaines, le 07/04 et le 08/04 ensemble)', o.mois.map((m) => m.mois).join() === '2025-03,2025-04' && o.mois[0].montantManquant === -7000
      && o.semaines.length === 4 && o.semaines[0].debut === '03/03/2025' && o.semaines[3].caisses === 2, JSON.stringify(o.semaines.map((s) => s.semaine + ':' + s.debut)));
    ok('Plus gros écarts : −5 000 du 14/03 en tête, puis −2 000, +1 000', o.plusGros.map((g) => g.ecart).join() === '-5000,-2000,1000,-500' && /14\/03\/2025/.test(o.plusGros[0].ouverture),
      JSON.stringify(o.plusGros.map((g) => g.ecart)));
    ok('Tendance : manquants en baisse en avril', o.tendance.sens === 'BAISSE', o.tendance.texte);
    ok('Pistes : caissier récurrent, vendredi, fermeture 20 h', /manquants récurrents : / .test(ecran.pistes) && ecran.pistes.indexOf(NOM1) >= 0 && /vendredi/.test(ecran.pistes) && /20 h - 21 h/.test(ecran.pistes),
      ecran.pistes);
    /* filtre caissier */
    await p.evaluate((u) => { const a = Ext.ComponentQuery.query('gestioncaisseonglets')[0].analyse, c = a.down('#anCaissier'); c.setValue(u); }, U2);
    const o2 = await analyse();
    ok('Filtre par caissier : ' + NOM2 + ' seul (1 caisse billetée, 1 sans billetage)', o2.total.caisses === 1 && o2.total.sansBilletage === 1 && o2.total.surplus === 1, JSON.stringify(o2.total));
    /* tolerance */
    await p.evaluate(() => { const a = Ext.ComponentQuery.query('gestioncaisseonglets')[0].analyse; a.down('#anCaissier').setValue(''); a.down('#anTolerance').setValue(500); });
    const o3 = await analyse();
    ok('Tolérance 500 F : l\'écart de −500 compte comme une caisse juste', o3.total.manquants === 2 && o3.total.justes === 2, JSON.stringify(o3.total));
    await clic('gestioncaisseonglets #gc-liste');
    ok('Retour à la liste', await p.evaluate(() => Ext.ComponentQuery.query('gestioncaisseonglets')[0].getLayout().getActiveItem().isXType('gestcaissemanager')));
    ok('Infobulles sur les critères et boutons de l\'analyse', await p.evaluate(() => Ext.ComponentQuery.query('gestioncaisseonglets #analyseCaisse')[0]
      .getDockedItems('toolbar[dock=top]')[0].query('button,combobox,datefield,numberfield').every((x) => !!x.tooltip)));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Déroulement du test', false, e.stack || e);
  } finally {
    await b.close();
    try { nettoyer(); } catch (e) { console.log('nettoyage : ' + e.message); }
    ok('Remise en état : caisses et billetages de l\'essai retirés', q("SELECT (SELECT COUNT(*) FROM t_resume_caisse WHERE ld_CAISSE_ID LIKE 'E2E-GC-%') + (SELECT COUNT(*) FROM t_billetage WHERE ld_CAISSE_ID LIKE 'E2E-GC-%')") === '0');
    const n = res.filter((x) => x.c).length;
    console.log('\n' + n + '/' + res.length + (n === res.length ? ' OK' : ' ECHEC'));
    process.exit(n === res.length ? 0 : 1);
  }
})();
