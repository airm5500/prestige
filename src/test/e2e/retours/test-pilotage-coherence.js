/* COHERENCE DES CHIFFRES DU MENU DE PILOTAGE.
 *
 * POURQUOI CETTE SUITE EXISTE. Les autres suites verifient qu'un onglet affiche ce que la base contient.
 * Celle-ci verifie autre chose, et c'est ce qui manquait : que les onglets ne se CONTREDISENT pas entre eux,
 * et que les grandeurs derivees se deduisent bien de celles dont elles sortent.
 *
 * Un ecran d'analyse peut etre juste onglet par onglet et faux dans son ensemble : il suffit qu'un onglet
 * compte les ventes de depot et qu'un autre les exclue, ou qu'un onglet arrete un mois au dernier jour
 * ecoule et l'autre au dernier jour du mois. L'officine l'a vecu avec les annulations - deux cent cinquante
 * d'un cote, trois cent quinze de l'autre. Ces contradictions-la ne se voient qu'en comparant.
 *
 * TROIS FAMILLES DE CONTROLES :
 *
 *  1. CONTRE LA BASE : chaque grandeur mensuelle est recalculee par une requete SQL independante, ecrite
 *     ici et non reprise du code du logiciel - sans quoi on ne verifierait que la coherence d'une erreur
 *     avec elle-meme.
 *
 *  2. ENTRE ONGLETS : le chiffre d'affaires d'un mois doit etre le MEME dans la Synthese, les Ventes, la
 *     Marge, la Caisse, la Qualite, les KPI et les Achats / Ventes. Sept lectures du meme mois.
 *
 *  3. IDENTITES INTERNES : ce qui doit se deduire. Encaisse plus credit font le chiffre d'affaires ; la
 *     somme des modes de reglement fait l'encaisse ; la somme des colonnes de grossistes fait les achats ;
 *     la somme des quatre trimestres fait l'annee ; le panier moyen est le chiffre d'affaires divise par le
 *     nombre de clients servis. Ces controles ne demandent aucune requete : une identite qui se brise
 *     signale un defaut meme quand les deux termes sont, chacun, tires de la base.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const MB4 = '--default-character-set=utf8mb4';
const q = (s) => execFileSync('mariadb', [MB4, BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();

/* Le perimetre des ventes retenues par le logiciel, ecrit ICI pour etre independant de son code. */
const VENTES = "p.int_PRICE>0 AND p.str_STATUT='is_Closed' AND p.b_IS_CANCEL=0 AND p.lg_TYPE_VENTE_ID<>'5'";
const ACHATS = "b.str_STATUT='is_Closed'";
const proche = (a, b, marge) => Math.abs(Number(a) - Number(b)) <= (marge === undefined ? 1 : marge);

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1700, height: 1000 } });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('pilotage', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('pilotage #onglets').length > 0, null,
      { timeout: 30000 });
    /* L'ouverture du menu lance le controle des corrections tardives : on lui laisse le temps. */
    await p.waitForTimeout(25000);

    /* Une seule lecture par onglet, sur la plus longue fenetre, pour comparer les memes mois partout. */
    const charger = (onglet, extra) => p.evaluate(async (u) => {
      const r = await fetch('../api/v1/pilotage/onglet/' + u, { credentials: 'same-origin' });
      return JSON.parse(await r.text());
    }, onglet + '?axe=G12' + (extra || ''));

    const onglets = {};
    for (const nom of ['synthese', 'ventes', 'marge', 'caisse', 'qualite', 'stock', 'achats']) {
      onglets[nom] = await charger(nom);
    }
    onglets.kpi = await charger('kpi', '&kpis=caTTC,nbVentes,panier,marge,tauxMarge,encaisse,credit,achatTTC');
    onglets.achatsventes = await charger('achatsventes', '&decoupage=TRIMESTRE');

    ok('Tous les onglets ont répondu',
      Object.keys(onglets).every((k) => onglets[k] && onglets[k].success === true),
      JSON.stringify(Object.keys(onglets).map((k) => k + '=' + (onglets[k] || {}).success)));

    const lignes = (nom) => (onglets[nom].mois || []);
    const ligne = (nom, mois) => lignes(nom).filter((x) => x.mois === mois)[0] || {};
    /* Les mois que TOUS les onglets mensuels portent : c'est sur eux que la comparaison a un sens. */
    const moisCommuns = lignes('synthese').map((x) => x.mois)
      .filter((m) => ['ventes', 'marge', 'caisse', 'qualite', 'kpi'].every((o) => !!ligne(o, m).mois));
    ok('Les onglets couvrent les mêmes mois : la comparaison porte sur au moins douze d entre eux',
      moisCommuns.length >= 12, moisCommuns.length + ' mois communs');

    /* ---------------------------------------------------------------- 1. contre la base */
    let ecartsBase = [];
    for (const m of moisCommuns) {
      const attendu = q("SELECT CONCAT("
        + " ROUND(COALESCE(SUM(p.int_PRICE - COALESCE(p.int_PRICE_REMISE,0)),0)), '|', COUNT(*), '|',"
        + " ROUND(COALESCE((SELECT SUM(vr.montant) FROM vente_reglement vr"
        + "   JOIN t_preenregistrement p2 ON p2.lg_PREENREGISTREMENT_ID=vr.vente_id"
        + "   WHERE p2.int_PRICE>0 AND p2.str_STATUT='is_Closed' AND p2.b_IS_CANCEL=0"
        + "   AND p2.lg_TYPE_VENTE_ID<>'5' AND DATE_FORMAT(p2.dt_UPDATED,'%Y-%m')='" + m + "'),0)))"
        + " FROM t_preenregistrement p WHERE " + VENTES
        + " AND DATE_FORMAT(p.dt_UPDATED,'%Y-%m')='" + m + "'").split('|');
      const s = ligne('synthese', m);
      const c = ligne('caisse', m);
      if (!proche(s.caTTC, attendu[0], 2)) {
        ecartsBase.push(m + ' CA ' + s.caTTC + '<>' + attendu[0]);
      }
      if (Number(s.nbVentes) !== Number(attendu[1])) {
        ecartsBase.push(m + ' ventes ' + s.nbVentes + '<>' + attendu[1]);
      }
      if (!proche(c.encaisse, attendu[2], 2)) {
        ecartsBase.push(m + ' encaisse ' + c.encaisse + '<>' + attendu[2]);
      }
    }
    ok('Chiffre d affaires, nombre de ventes et encaissé sont EXACTEMENT ceux de la base, mois par mois',
      ecartsBase.length === 0, ecartsBase.slice(0, 4).join(' ; ') || 'aucun écart sur ' + moisCommuns.length + ' mois');

    let ecartsAchats = [];
    for (const m of moisCommuns) {
      const attendu = q("SELECT ROUND(COALESCE(SUM(b.int_HTTC),0)) FROM t_bon_livraison b WHERE " + ACHATS
        + " AND DATE_FORMAT(b.dt_UPDATED,'%Y-%m')='" + m + "'");
      if (!proche(ligne('achats', m).achatTTC, attendu, 2)) {
        ecartsAchats.push(m + ' ' + ligne('achats', m).achatTTC + '<>' + attendu);
      }
    }
    ok('Les achats mensuels sont EXACTEMENT ceux de la base',
      ecartsAchats.length === 0, ecartsAchats.slice(0, 4).join(' ; ') || 'aucun écart');

    /* ---------------------------------------------------------------- 2. entre onglets */
    const tousLesOnglets = ['synthese', 'ventes', 'marge', 'caisse', 'qualite', 'kpi'];
    let divergences = [];
    for (const m of moisCommuns) {
      const reference = Number(ligne('synthese', m).caTTC);
      for (const o of tousLesOnglets) {
        if (!proche(ligne(o, m).caTTC, reference, 2)) {
          divergences.push(m + ' ' + o + '=' + ligne(o, m).caTTC + ' vs synthese=' + reference);
        }
      }
    }
    ok('Le chiffre d affaires d un mois est le MÊME dans les six onglets qui le portent',
      divergences.length === 0,
      divergences.slice(0, 4).join(' ; ') || (moisCommuns.length * 6) + ' lectures concordantes');

    let divergencesAchats = [];
    for (const m of moisCommuns) {
      const a = Number(ligne('achats', m).achatTTC);
      for (const o of ['synthese', 'marge', 'kpi']) {
        if (!proche(ligne(o, m).achatTTC, a, 2)) {
          divergencesAchats.push(m + ' ' + o + '=' + ligne(o, m).achatTTC + ' vs achats=' + a);
        }
      }
    }
    ok('Et les achats d un mois sont les mêmes dans les onglets qui les portent',
      divergencesAchats.length === 0, divergencesAchats.slice(0, 4).join(' ; ') || 'concordants');

    /* ---------------------------------------------------------------- 3. identités internes */
    let identites = [];
    for (const m of moisCommuns) {
      const c = ligne('caisse', m);
      const v = ligne('ventes', m);
      const g = ligne('marge', m);
      /* Encaisse plus credit font le chiffre d'affaires : c'est la definition du credit. */
      if (!proche(Number(c.encaisse) + Number(c.credit), c.caTTC, 2)) {
        identites.push(m + ' encaisse+credit=' + (Number(c.encaisse) + Number(c.credit))
          + ' <> CA=' + c.caTTC);
      }
      /* Le panier moyen est le chiffre d'affaires divise par le nombre de clients servis. */
      if (Number(v.nbVentes) > 0 && !proche(v.panier, Number(v.caTTC) / Number(v.nbVentes), 1)) {
        identites.push(m + ' panier=' + v.panier + ' <> ' + (Number(v.caTTC) / Number(v.nbVentes)));
      }
      /* La marge est le chiffre d'affaires hors taxes moins le cout d'achat. */
      if (!proche(g.marge, Number(g.caHT) - Number(g.coutAchat), 2)) {
        identites.push(m + ' marge=' + g.marge + ' <> caHT-cout=' + (Number(g.caHT) - Number(g.coutAchat)));
      }
      /* Le taux de marge est la marge rapportee au chiffre d'affaires hors taxes. */
      if (Number(g.caHT) > 0
          && !proche(g.tauxMarge, Number(g.marge) / Number(g.caHT) * 100, 0.2)) {
        identites.push(m + ' tauxMarge=' + g.tauxMarge + ' <> '
          + (Number(g.marge) / Number(g.caHT) * 100).toFixed(2));
      }
    }
    ok('Les grandeurs dérivées se déduisent bien de celles dont elles sortent',
      identites.length === 0, identites.slice(0, 4).join(' ; ') || 'quatre identités vérifiées sur '
        + moisCommuns.length + ' mois');

    /* La somme des modes de reglement fait l'encaisse du mois. */
    const modes = (onglets.ventes.modes || []).map((x) => x.cle);
    let ecartsModes = [];
    if (modes.length) {
      for (const m of moisCommuns) {
        const l = ligne('ventes', m);
        const total = modes.reduce((t, cle) => t + (Number(l[cle]) || 0), 0);
        const encaisse = Number(ligne('caisse', m).encaisse);
        if (!proche(total, encaisse, 2)) {
          ecartsModes.push(m + ' modes=' + Math.round(total) + ' <> encaisse=' + encaisse);
        }
      }
    }
    ok('La somme des modes de règlement fait l encaissé du mois',
      modes.length > 0 && ecartsModes.length === 0,
      ecartsModes.slice(0, 4).join(' ; ') || modes.length + ' modes, concordants');

    /* La somme des colonnes de grossistes fait les achats du mois. */
    const grossistes = (onglets.achats.grossistesColonnes || []).map((x) => x.cle);
    let ecartsGrossistes = [];
    if (grossistes.length) {
      for (const m of moisCommuns) {
        const l = ligne('achats', m);
        const total = grossistes.reduce((t, cle) => t + (Number(l[cle]) || 0), 0);
        if (!proche(total, l.achatTTC, 2)) {
          ecartsGrossistes.push(m + ' grossistes=' + Math.round(total) + ' <> achats=' + l.achatTTC);
        }
      }
    }
    ok('La somme des colonnes de grossistes fait les achats du mois',
      grossistes.length > 0 && ecartsGrossistes.length === 0,
      ecartsGrossistes.slice(0, 4).join(' ; ') || grossistes.length + ' grossistes, concordants');

    /*
     * L'onglet Achats / Ventes doit retomber sur les MEMES mois : la somme de ses quatre trimestres est le
     * total de l'annee, et ce total est celui qu'on obtient en additionnant les mois de l'annee dans la
     * Synthese. C'est le controle qui relie les deux decoupages.
     */
    const annees = onglets.achatsventes.annees || [];
    let ecartsTrimestres = [];
    for (const an of annees) {
      const somme = (onglets.achatsventes.lignes || [])
        .reduce((t, l) => t + (Number(l['an' + an + '_ca']) || 0), 0);
      const parMois = lignes('synthese')
        .filter((x) => String(x.mois).substring(0, 4) === String(an))
        .reduce((t, x) => t + (Number(x.caTTC) || 0), 0);
      /* La Synthese ne porte que la fenetre demandee : on ne compare que les annees qu'elle couvre en entier. */
      const moisDeLAnnee = lignes('synthese').filter((x) => String(x.mois).substring(0, 4) === String(an)).length;
      if (moisDeLAnnee === 12 && !proche(somme, parMois, 4)) {
        ecartsTrimestres.push(an + ' trimestres=' + Math.round(somme) + ' <> mois=' + Math.round(parMois));
      }
    }
    ok('Les trimestres de l onglet Achats / Ventes retombent sur la somme des mois de la Synthèse',
      ecartsTrimestres.length === 0, ecartsTrimestres.join(' ; ') || 'concordants sur ' + annees.join(', '));

    /* ---------------------------------------------------------------- l ecran affiche bien ce que l API rend */
    await p.evaluate(() => {
      const o = Ext.ComponentQuery.query('pilotage #onglets')[0];
      o.setActiveTab(o.items.items.filter((x) => x.title === 'Synthèse')[0]);
      const axe = Ext.ComponentQuery.query('pilotage #barrePeriode #axe')[0];
      axe.setValue('G12');
      axe.fireEvent('select', axe, [axe.getStore().findRecord('code', 'G12')]);
    });
    await p.waitForTimeout(20000);
    const alEcran = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('pilotage')[0];
      const out = [];
      e.stores.synthese.mois.each((r) => out.push({ mois: r.get('mois'), ca: r.get('caTTC') }));
      return out;
    });
    let ecartsEcran = [];
    for (const l of alEcran) {
      const attendu = ligne('synthese', l.mois).caTTC;
      if (attendu !== undefined && !proche(l.ca, attendu, 2)) {
        ecartsEcran.push(l.mois + ' écran=' + l.ca + ' <> service=' + attendu);
      }
    }
    ok('Et l ÉCRAN affiche exactement ce que le service rend : la chaîne complète est vérifiée',
      alEcran.length > 0 && ecartsEcran.length === 0,
      ecartsEcran.slice(0, 3).join(' ; ') || alEcran.length + ' mois concordants');

    ok('Aucune erreur JavaScript pendant tout le parcours', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Le parcours va au bout', false, e.message + ' ' + e.stack);
  } finally {
    await b.close();
    const kos = res.filter((r) => !r.c);
    console.log('\n' + res.filter((r) => r.c).length + '/' + res.length + ' controles OK');
    process.exit(kos.length ? 1 : 0);
  }
})();
