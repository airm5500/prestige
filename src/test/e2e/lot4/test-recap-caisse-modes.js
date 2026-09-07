/* Lot 4 — point 22 : récapitulatif caisse / recette.
   - sous-detail des paiements mobiles, construit selon les modes REELLEMENT presents ;
   - le total du sous-detail vaut le montant Mobile de la ligne parente ;
   - onglet « Suivi des modes de reglement » : synthese, courbe, legende et valeurs exactes ;
   - mise en forme : solde rouge, billetage violet, nombre de clients orange et gras. */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 280) + ']' : '')); }

const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
const MARQUE = 'E2EL4B';

/* Deux journees, quatre modes dont TROIS mobiles : le sous-detail doit donc porter trois lignes
   et leur somme doit valoir le montant Mobile. Les montants sont choisis pour etre reconnaissables
   et ne jamais s'egaler entre eux. */
const JOURNEES = [
  { jour: 1, reglements: [['1', 500000], ['7', 120000], ['10', 80000], ['3', 60000]] },
  { jour: 2, reglements: [['1', 300000], ['7', 40000], ['9', 25000], ['10', 15000]] }
];
const LIBELLES = {};
const attendu = {};

function nettoyer() {
  exec("DELETE FROM vente_reglement WHERE id LIKE '" + MARQUE + "%'");
  exec("DELETE FROM mvttransaction WHERE uuid LIKE '" + MARQUE + "%'");
  exec("DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "%'");
}

function semer() {
  nettoyer();
  const utilisateur = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='KGA3'");
  const emplacement = q("SELECT lg_EMPLACEMENT_ID FROM t_user WHERE str_LOGIN='KGA3'");
  const caisse = q("SELECT lg_CAISSE_ID FROM t_caisse LIMIT 1");
  if (!utilisateur || !caisse) { return false; }
  q("SELECT 1").toString();
  ['1', '3', '7', '9', '10'].forEach(id => {
    LIBELLES[id] = q("SELECT str_NAME FROM t_type_reglement WHERE lg_TYPE_REGLEMENT_ID='" + id + "'");
  });

  attendu.parMode = {};
  attendu.parJour = {};
  JOURNEES.forEach(j => {
    const venteId = MARQUE + '-V' + j.jour;
    const total = j.reglements.reduce((s, r) => s + r[1], 0);
    const dateSql = "DATE_SUB(CURDATE(), INTERVAL " + j.jour + " DAY)";
    // La vente et le mouvement de caisse sont CLONES : ils portent des dizaines de colonnes liees,
    // et une insertion a la main en oublierait toujours une.
    exec("CREATE TEMPORARY TABLE tmp_v SELECT * FROM t_preenregistrement WHERE str_STATUT='is_Closed' LIMIT 1;"
      + " UPDATE tmp_v SET lg_PREENREGISTREMENT_ID='" + venteId + "', lg_USER_ID='" + utilisateur + "',"
      + " dt_UPDATED=" + dateSql + ", dt_CREATED=" + dateSql + ", b_IS_CANCEL=0, str_STATUT='is_Closed',"
      + " int_PRICE=" + total + ", int_PRICE_REMISE=0, imported=0, lg_TYPE_VENTE_ID='1';"
      + " INSERT INTO t_preenregistrement SELECT * FROM tmp_v; DROP TEMPORARY TABLE tmp_v;");
    exec("INSERT INTO mvttransaction (uuid, categorie, createdAt, montant, montantCredit, montantNet,"
      + " montantRemise, montantRestant, montantTva, mvtdate, pkey, reference, typeTransaction, caisse,"
      + " lg_EMPLACEMENT_ID, lg_USER_ID, vente_id, montantAcc) VALUES ('" + MARQUE + "-M" + j.jour + "', 0, NOW(),"
      + " " + total + ", 0, " + total + ", 0, 0, 0, " + dateSql + ", '" + MARQUE + "-M" + j.jour + "',"
      + " '" + MARQUE + "-M" + j.jour + "', 0, '" + caisse + "', '" + emplacement + "', '" + utilisateur + "',"
      + " '" + venteId + "', 0)");
    let mobileDuJour = 0;
    j.reglements.forEach((r, i) => {
      const [mode, montant] = r;
      exec("INSERT INTO vente_reglement (id, flaged_amount, montant, montant_attentu, mvtDate, vente_id,"
        + " type_regelement, ug_amount, ug_amount_net, amount_non_ca) VALUES ('" + MARQUE + "-R" + j.jour + "-" + i + "',"
        + " 0, " + montant + ", " + montant + ", " + dateSql + ", '" + venteId + "', '" + mode + "', 0, 0, 0)");
      attendu.parMode[mode] = (attendu.parMode[mode] || 0) + montant;
      if (mode !== '1' && mode !== '3') { mobileDuJour += montant; }
    });
    attendu.parJour[j.jour] = { total: total, mobile: mobileDuJour };
  });
  attendu.totalGeneral = Object.keys(attendu.parMode).reduce((s, m) => s + attendu.parMode[m], 0);
  return true;
}

(async () => {
  if (!semer()) { console.log('FATAL : impossible de semer les encaissements'); process.exit(1); }
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1700, height: 950 } });
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
  await p.waitForTimeout(3000);

  const appel = (url) => p.evaluate(async (u) => {
    const r = await fetch(u);
    const t = await r.text();
    let json = null; try { json = JSON.parse(t); } catch (e) { }
    return { status: r.status, json: json, texte: t.slice(0, 300) };
  }, url);

  const isoDebut = new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10);
  const isoFin = new Date().toISOString().slice(0, 10);

  try {
    // ---------------- sous-detail des paiements mobiles
    const recap = await appel('../api/v1/stats-recette-caisse/data?dtStart=' + isoDebut + '&dtEnd=' + isoFin
      + '&groupByYear=false');
    const lignes = (recap.json && recap.json.data) || [];
    ok('point 22 : le recapitulatif rend les journees semees', lignes.length >= 2, 'lignes=' + lignes.length);

    const avecMobile = lignes.filter(l => l.montantMobile > 0);
    ok('point 22 : chaque journee porte le detail de ses paiements mobiles',
       avecMobile.length >= 2 && avecMobile.every(l => l.detailMobile && Object.keys(l.detailMobile).length > 0),
       JSON.stringify(avecMobile.map(l => ({ d: l.displayMvtDate, mobile: l.montantMobile, detail: l.detailMobile }))));

    ok('point 22 : le total du sous-detail vaut le montant Mobile de la ligne',
       avecMobile.every(l => Object.keys(l.detailMobile).reduce((s, k) => s + l.detailMobile[k], 0) === l.montantMobile),
       JSON.stringify(avecMobile.map(l => ({ mobile: l.montantMobile,
         somme: Object.keys(l.detailMobile).reduce((s, k) => s + l.detailMobile[k], 0) }))));

    // Le sous-detail est construit sur les modes PRESENTS : deux le premier jour, trois le second.
    const parNombre = avecMobile.map(l => Object.keys(l.detailMobile).length).sort();
    ok('point 22 : le sous-detail suit les modes reellement presents, pas une liste figee',
       parNombre.join(',') === '2,3', 'nombres de modes par journee = ' + parNombre.join(','));
    ok('point 22 : les modes du sous-detail portent leur libelle, pas leur identifiant',
       avecMobile.every(l => Object.keys(l.detailMobile).every(k => /[A-Za-z]/.test(k))),
       JSON.stringify(avecMobile.map(l => Object.keys(l.detailMobile))));
    const totalMobileAttendu = Object.keys(attendu.parJour).reduce((s, j) => s + attendu.parJour[j].mobile, 0);
    const totalMobileRendu = avecMobile.reduce((s, l) => s + l.montantMobile, 0);
    ok('point 22 : le montant mobile total correspond aux encaissements semes',
       totalMobileRendu === totalMobileAttendu, 'rendu=' + totalMobileRendu + ' attendu=' + totalMobileAttendu);

    // ---------------- onglet « Suivi des modes de reglement »
    const suivi = await appel('../api/v1/stats-recette-caisse/modes?dtStart=' + isoDebut + '&dtEnd=' + isoFin
      + '&groupByYear=false');
    const modes = (suivi.json && suivi.json.data) || [];
    ok('point 22 : le suivi des modes repond', suivi.json && suivi.json.success && modes.length > 0,
       'modes=' + modes.length);
    ok('point 22 : chaque mode seme est retrouve avec son montant exact',
       Object.keys(attendu.parMode).every(id => {
         const m = modes.filter(x => x.modeId === id)[0];
         return m && m.montant === attendu.parMode[id];
       }),
       'attendu=' + JSON.stringify(attendu.parMode) + ' rendu='
         + JSON.stringify(modes.map(m => [m.modeId, m.montant])));
    ok('point 22 : le total general vaut la somme des modes',
       suivi.json.totalGeneral === attendu.totalGeneral,
       'rendu=' + suivi.json.totalGeneral + ' attendu=' + attendu.totalGeneral);
    ok('point 22 : les parts sont calculees et totalisent 100 %',
       Math.abs(modes.reduce((s, m) => s + m.part, 0) - 100) < 0.5,
       JSON.stringify(modes.map(m => [m.mode, m.part])));
    ok('point 22 : le panier moyen par mode est renseigne',
       modes.every(m => m.montantMoyen === Math.round(m.montant / m.operations)),
       JSON.stringify(modes.map(m => [m.mode, m.operations, m.montantMoyen])));
    ok('point 22 : les modes mobiles sont signales comme tels',
       modes.filter(m => m.mobile).map(m => m.modeId).sort().join(',') === '10,7,9',
       JSON.stringify(modes.map(m => [m.modeId, m.mobile])));

    const series = (suivi.json && suivi.json.series) || [];
    const tranches = (suivi.json && suivi.json.tranches) || [];
    ok('point 22 : la courbe porte une serie par mode et une valeur par tranche',
       series.length === modes.length && series.every(s => (s.points || []).length === tranches.length),
       'series=' + series.length + ' modes=' + modes.length + ' tranches=' + tranches.length);
    ok('point 22 : les tranches sans encaissement valent zero et non un trou',
       series.every(s => s.points.every(v => typeof v === 'number')),
       JSON.stringify(series.map(s => [s.mode, s.points])));
    ok('point 22 : la somme d une serie vaut le montant de son mode',
       series.every(s => {
         const m = modes.filter(x => x.modeId === s.modeId)[0];
         return m && s.points.reduce((a, v) => a + v, 0) === m.montant;
       }), JSON.stringify(series.map(s => [s.mode, s.points.reduce((a, v) => a + v, 0)])));

    // ---------------- l'ecran
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('caisserecetterecap', {}));
    await p.waitForTimeout(3000);
    const ecran = await p.evaluate(async (bornes) => {
      const vue = Ext.ComponentQuery.query('caisserecetterecap')[0];
      if (!vue) { return { ouvert: false }; }
      const ctr = testextjs.app.getController('RecapRecetteCaisseCtr');
      vue.down('#dtStart').setValue(new Date(bornes.debut));
      vue.down('#dtEnd').setValue(new Date(bornes.fin));
      ctr.doSearch();
      await new Promise(r => setTimeout(r, 6000));
      const grille = vue.down('#caisserecetterecapGrid');
      const grilleModes = vue.down('#grilleModes');
      const onglets = vue.down('#ongletsRecap');
      const colonnes = grille.headerCt.items.items.map(c => ({ t: (c.text || '').replace(/<[^>]*>/g, ''),
        di: c.dataIndex }));
      const enr = grille.getStore().getAt(0);
      const rendu = {};
      ['montantSolde', 'montantBilletage', 'nbreClient'].forEach(function (champ) {
        const col = grille.headerCt.items.items.filter(c => c.dataIndex === champ)[0];
        rendu[champ] = col && col.renderer ? col.renderer(enr ? enr.get(champ) : 0, {}, enr) : null;
      });
      return {
        ouvert: true,
        onglets: onglets ? onglets.items.items.map(o => o.title) : [],
        lignes: grille.getStore().getCount(),
        modes: grilleModes ? grilleModes.getStore().getCount() : -1,
        courbe: !!vue.down('#courbeModes chart'),
        legende: !!(vue.down('#courbeModes chart') && vue.down('#courbeModes chart').legend),
        extenseur: grille.plugins && grille.plugins.some(pl => pl.ptype === 'rowexpander'
          || (pl.getPluginId && pl.getPluginId() === 'rowexpander') || pl.rowBodyTpl),
        rendu: rendu,
        colonnes: colonnes.map(c => c.t)
      };
    }, { debut: isoDebut, fin: isoFin });

    ok('point 22 : l ecran s ouvre avec ses deux onglets',
       ecran.ouvert && ecran.onglets.length === 2
         && ecran.onglets[1].indexOf('Suivi des modes') !== -1, JSON.stringify(ecran.onglets));
    ok('point 22 : le tableau du recapitulatif est toujours rempli', ecran.lignes >= 2, 'lignes=' + ecran.lignes);
    ok('point 22 : chaque ligne peut s ouvrir sur son sous-detail', !!ecran.extenseur, String(ecran.extenseur));
    ok('point 22 : la synthese par mode est remplie', ecran.modes > 0, 'modes=' + ecran.modes);
    ok('point 22 : la courbe est tracee', ecran.courbe, String(ecran.courbe));
    ok('point 22 : la courbe porte une legende', ecran.legende, String(ecran.legende));
    ok('point 22 : le solde est affiche en rouge',
       /color:#c0392b/.test(ecran.rendu.montantSolde || ''), ecran.rendu.montantSolde);
    ok('point 22 : le billetage est affiche en violet',
       /color:#7d3c98/.test(ecran.rendu.montantBilletage || ''), ecran.rendu.montantBilletage);
    ok('point 22 : le nombre de clients est en orange et en gras',
       /color:#e67e22/.test(ecran.rendu.nbreClient || '') && /font-weight:bold/.test(ecran.rendu.nbreClient || ''),
       ecran.rendu.nbreClient);

    ok('aucune erreur JavaScript', err.length === 0, err.slice(0, 3).join(' | '));
  } finally {
    await b.close();
    nettoyer();
  }
  const total = res.length, passes = res.filter(r => r.c).length;
  console.log('\n===== ' + passes + '/' + total + ' PASS =====');
  process.exit(passes === total ? 0 : 1);
})();
