/* Le selecteur de periodes de comparaison.

   Deux choses sont verifiees ici, et ce sont les deux ou une erreur passerait inapercue.

   1. LA REGLE DES BORNES. « 3 derniers mois » designe les trois mois REVOLUS, et le mois en cours
      est rappele EN PLUS, marque comme tel. Compter le mois entame comme un mois complet ferait
      lire un effondrement du chiffre d'affaires le 2 du mois -- un chiffre faux, mais plausible.

   2. LA BASCULE A DEUX. Une seule periode donne les chiffres bruts ; a partir de deux, les ecarts
      apparaissent. Afficher une colonne d'ecart vide sans rien dire laisserait croire a une
      stagnation. */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }

const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();

/* Les bornes attendues, calculees ici independamment du code teste : si les deux tombent
   d'accord, c'est que la regle est bien celle qu'on croit. */
function moisAttendus(nombre) {
  const t = new Date();
  const attendus = [];
  for (let i = nombre; i >= 1; i--) {
    const d = new Date(t.getFullYear(), t.getMonth() - i, 1);
    attendus.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
  }
  attendus.push(t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0'));
  return attendus;
}

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1700, height: 950 } });
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
  await p.waitForTimeout(3000);

  const lire = (url) => p.evaluate(async (url) => {
    const r = await fetch(url, { credentials: 'same-origin' });
    return await r.json();
  }, url);

  try {
    // ---------------------------------------------------------- le fichier de configuration
    const config = await p.evaluate(() => {
      return {
        present: !!window.PrestigeAnalyse,
        ecrans: (window.PrestigeAnalyse || {}).ECRANS_ANALYSE || [],
        choix: ((window.PrestigeAnalyse || {}).CHOIX || []).map(c => c.id),
        hook: typeof (window.PrestigeAnalyse || {}).appliquerSiConcerne === 'function'
      };
    });
    ok('Le fichier de configuration est charge', config.present);
    ok('Il liste les deux menus demandes',
      config.ecrans.indexOf('cazonegeomanager') >= 0 && config.ecrans.indexOf('balancesalecahs') >= 0,
      config.ecrans.join(', '));
    ok('Il porte les quatre choix', ['TROIS_SEMAINES', 'TROIS_MOIS', 'SIX_MOIS', 'TROIS_ANS']
      .every(c => config.choix.indexOf(c) >= 0), config.choix.join(', '));
    ok('Il expose le point d\'accroche', config.hook);

    // ---------------------------------------------------------- la pose automatique
    const pose = await p.evaluate(async () => {
      const resultat = {};
      // balancesalecahs n'avait pas de selecteur : il doit lui etre pose.
      await new Promise((r, j) => Ext.require('testextjs.view.caisseManager.balance.BalanceSaleCash', r, j));
      const balance = Ext.create('testextjs.view.caisseManager.balance.BalanceSaleCash', {renderTo: Ext.getBody()});
      resultat.avantPose = !!balance.down('#typePeriode');
      window.PrestigeAnalyse.appliquerSiConcerne(balance);
      resultat.apresPose = !!balance.down('#typePeriode');
      resultat.valeurDefaut = balance.down('#typePeriode').getValue();
      // une deuxieme application ne doit pas poser un second selecteur
      window.PrestigeAnalyse.appliquerSiConcerne(balance);
      resultat.nbSelecteurs = balance.query('#typePeriode').length;
      resultat.onglets = balance.down('#ongletsBalance').items.getRange().map(o => o.title);
      resultat.grilleAnalyse = !!balance.down('#ongletAnalyseBalance');
      balance.destroy();

      // cazonegeomanager avait deja le sien : il doit etre laisse tel quel.
      await new Promise((r, j) => Ext.require('testextjs.view.cazonegeo.CaZoneGeoManager', r, j));
      const ca = Ext.create('testextjs.view.cazonegeo.CaZoneGeoManager', {renderTo: Ext.getBody()});
      window.PrestigeAnalyse.appliquerSiConcerne(ca);
      resultat.caSelecteurs = ca.query('#typePeriode').length;
      const listeCa = [];
      ca.down('#typePeriode').getStore().each(r2 => listeCa.push(r2.get('id')));
      resultat.caChoix = listeCa;
      ca.destroy();

      // un ecran hors liste ne doit rien recevoir
      await new Promise((r, j) => Ext.require('testextjs.view.vente.Removed', r, j));
      const hors = Ext.create('testextjs.view.vente.Removed', {renderTo: Ext.getBody()});
      window.PrestigeAnalyse.appliquerSiConcerne(hors);
      resultat.horsListe = !!hors.down('#typePeriode');
      hors.destroy();
      return resultat;
    });
    ok('La balance n\'avait pas de selecteur', pose.avantPose === false);
    ok('Le selecteur lui est pose automatiquement', pose.apresPose === true);
    ok('Il propose 3 derniers mois par defaut', pose.valeurDefaut === 'TROIS_MOIS', pose.valeurDefaut);
    ok('Une seconde application n\'en pose pas un deuxieme', pose.nbSelecteurs === 1, pose.nbSelecteurs);
    ok('La balance a bien deux onglets', pose.onglets.length === 2, pose.onglets.join(' | '));
    ok('Le second est l\'analyse comparative',
      /Analyse/.test(pose.onglets[1] || '') && pose.grilleAnalyse, pose.onglets.join(' | '));
    ok('L\'ecran qui avait deja son selecteur n\'en recoit pas un second',
      pose.caSelecteurs === 1, pose.caSelecteurs);
    ok('Et il lit la MEME liste de choix', ['TROIS_SEMAINES', 'TROIS_MOIS', 'SIX_MOIS', 'TROIS_ANS']
      .every(c => pose.caChoix.indexOf(c) >= 0), pose.caChoix.join(', '));
    ok('Un ecran hors liste ne recoit rien', pose.horsListe === false);

    // ---------------------------------------------------------- la regle des bornes
    let a = await lire('../api/v1/balance/balancesalecash/analyse?typePeriode=TROIS_MOIS');
    let cles = (a.data || []).map(l => l.cle);
    ok('3 derniers mois rend 4 tranches', (a.data || []).length === 4, cles.join(' | '));
    ok('Ce sont les 3 mois revolus, plus le mois en cours',
      JSON.stringify(cles) === JSON.stringify(moisAttendus(3)),
      cles.join(' | ') + ' attendu ' + moisAttendus(3).join(' | '));
    ok('Seule la derniere tranche est marquee en cours',
      (a.data || []).filter(l => l.enCours).length === 1
      && a.data[a.data.length - 1].enCours === true,
      (a.data || []).map(l => l.cle + '=' + l.enCours).join(' | '));
    ok('Les tranches revolues sont completes',
      (a.data || []).slice(0, 3).every(l => {
        const fin = new Date(l.fin);
        const lendemain = new Date(fin.getTime() + 86400000);
        return lendemain.getDate() === 1;
      }), (a.data || []).map(l => l.debut + '..' + l.fin).join(' | '));
    ok('La tranche en cours s\'arrete aujourd\'hui',
      a.data[a.data.length - 1].fin === new Date().toISOString().slice(0, 10),
      a.data[a.data.length - 1].fin);

    a = await lire('../api/v1/balance/balancesalecash/analyse?typePeriode=SIX_MOIS');
    ok('6 derniers mois rend 7 tranches', (a.data || []).length === 7, (a.data || []).length);
    ok('Ce sont les 6 mois revolus, plus le mois en cours',
      JSON.stringify((a.data || []).map(l => l.cle)) === JSON.stringify(moisAttendus(6)),
      (a.data || []).map(l => l.cle).join(' | '));

    a = await lire('../api/v1/balance/balancesalecash/analyse?typePeriode=TROIS_SEMAINES');
    ok('3 dernieres semaines rend 4 tranches', (a.data || []).length === 4,
      (a.data || []).map(l => l.cle).join(' | '));
    ok('Les semaines vont du lundi au dimanche',
      (a.data || []).slice(0, 3).every(l => new Date(l.debut + 'T12:00:00').getDay() === 1
        && new Date(l.fin + 'T12:00:00').getDay() === 0),
      (a.data || []).map(l => l.debut + '..' + l.fin).join(' | '));

    a = await lire('../api/v1/balance/balancesalecash/analyse?typePeriode=TROIS_ANS');
    const anneeCourante = new Date().getFullYear();
    ok('3 dernieres annees rend 4 tranches', (a.data || []).length === 4,
      (a.data || []).map(l => l.cle).join(' | '));
    ok('Ce sont les 3 annees revolues, plus celle en cours',
      JSON.stringify((a.data || []).map(l => l.cle))
      === JSON.stringify([anneeCourante - 3, anneeCourante - 2, anneeCourante - 1, anneeCourante].map(String)),
      (a.data || []).map(l => l.cle).join(' | '));

    // ---------------------------------------------------------- la bascule a deux
    ok('Plusieurs periodes : le mode comparatif est annonce', a.comparatif === true);
    ok('La premiere tranche n\'a pas d\'ecart', a.data[0].ecart === null, JSON.stringify(a.data[0]));
    ok('Les suivantes en ont un', a.data.slice(1).every(l => l.ecart !== undefined),
      a.data.map(l => l.ecart).join(' | '));

    const hier = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const unSeulJour = await lire('../api/v1/balance/balancesalecash/analyse?typePeriode=LIBRE'
      + '&dtStart=' + hier + '&dtEnd=' + hier);
    ok('Une seule periode : le mode comparatif est refuse',
      unSeulJour.comparatif === false && (unSeulJour.data || []).length === 1,
      JSON.stringify(unSeulJour).slice(0, 200));
    ok('Et son ecart reste vide', (unSeulJour.data || [])[0].ecart === null,
      JSON.stringify((unSeulJour.data || [])[0]));

    // ---------------------------------------------------------- l'analyse dit la meme chose que l'onglet 1
    const tranche = a.data[0];
    const balanceSeule = await lire('../api/v1/balance/balancesalecash?dtStart=' + tranche.debut
      + '&dtEnd=' + tranche.fin);
    const resume = balanceSeule.metaData || {};
    ok('L\'analyse d\'une tranche donne les MEMES chiffres que la balance de la meme periode',
      (resume.montantNet || 0) === tranche.montantNet && (resume.nbreVente || 0) === tranche.nbreVente,
      'analyse ' + tranche.montantNet + '/' + tranche.nbreVente
      + ' vs balance ' + resume.montantNet + '/' + resume.nbreVente);

    // ---------------------------------------------------------- l'export
    const excel = await p.evaluate(async () => {
      const r = await fetch('../api/v1/balance/balancesalecash/analyse/excel?typePeriode=TROIS_MOIS',
        { credentials: 'same-origin' });
      const buf = await r.arrayBuffer();
      return { statut: r.status, taille: buf.byteLength, type: r.headers.get('content-type') };
    });
    ok('L\'export Excel de l\'analyse repond',
      excel.statut === 200 && excel.taille > 2000 && /excel/.test(excel.type || ''), JSON.stringify(excel));

    // ---------------------------------------------------------- les classes CSS existent vraiment
    const css = await p.evaluate(() => {
      const trouve = {periode: false, abc: false};
      Ext.Array.each(document.styleSheets, function (feuille) {
        let regles;
        try { regles = feuille.cssRules; } catch (e) { return; }
        Ext.Array.each(regles || [], function (regle) {
          const t = regle.selectorText || '';
          if (t.indexOf('periode-en-cours') >= 0) { trouve.periode = true; }
          if (t.indexOf('classe-abc-') >= 0) { trouve.abc = true; }
        });
      });
      return trouve;
    });
    ok('La classe « periode-en-cours » existe en CSS', css.periode);
    ok('Les classes « classe-abc-* » existent en CSS', css.abc);

    ok('Aucune erreur JavaScript', err.length === 0, err.slice(0, 3).join(' | '));
  } catch (e) {
    ok('Deroulement sans exception', false, e.message + '\n' + e.stack);
  } finally {
    await b.close();
  }
  const ko = res.filter(r => !r.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' assertions');
  process.exit(ko ? 1 : 0);
})();
