/* PLAN DU 08/11, POINT 5 : COURBE DU COMPARATEUR DU PILOTAGE EXPLIQUEE.
 * Par l'ecran (admin, 1366 x 768) : Pilotage > Comparateur > « Comparer » (chiffre d'affaires contre achats) :
 *  - au-dessus de la courbe, la phrase « <grandeur> mois par mois : <A> (bleu) comparé à <B> (orange), de <1er mois> à
 *    <dernier mois> » ; les noms en clair dans la legende (pas « A » / « B ») ;
 *  - sous la courbe, la synthese « <A> fait x,x % de plus (de moins) que <B> sur la période », x = |A - B| / |B| des
 *    tuiles A et B ;
 *  - rapprochement : titre = phrase de l'API ; synthese a l'ecran = API = calcul depuis les tuiles affichees ; mois de
 *    la phrase = premier et dernier mois du tableau ; legende = noms des tuiles ;
 *  - cas varies par l'API (deux familles, deux grossistes) : phrase et synthese = leurs tuiles ;
 *  - ergonomie : phrase et synthese entieres et visibles dans l'ecran ; aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).replace(/\r/g, '').trim();

/* la regle, ecrite ici independamment du serveur */
function syntheseAttendue(a, b, ta, tb) {
  if (ta === 0 && tb === 0) { return a + ' et ' + b + ' sont à zéro sur la période.'; }
  if (tb === 0) { return b + ' est à zéro sur la période : l\'écart ne se mesure pas en pourcentage.'; }
  if (Math.abs(ta) > Math.abs(tb) * 100) { return a + ' fait plus de cent fois ' + b + ' sur la période.'; }
  const v = (ta - tb) / Math.abs(tb) * 100;
  if (Math.abs(v) < 0.05) { return a + ' et ' + b + ' font autant sur la période.'; }
  return a + ' fait ' + Math.abs(v).toFixed(1).replace('.', ',') + ' % ' + (v > 0 ? 'de plus' : 'de moins') + ' que ' + b + ' sur la période.';
}
function phraseAttendue(g, a, b, m1, m2) {
  return (g || 'Valeur') + ' mois par mois : ' + a + ' (bleu) comparé à ' + b + ' (orange)' + (!m1 ? '' : m1 === m2 ? ', en ' + m1 : ', de ' + m1 + ' à ' + m2);
}

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto((process.env.BASE || 'http://localhost:8080/prestige') + '/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app && Ext.ComponentQuery.query('navigation').length, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('pilotage', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('pilotage #onglets').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(3000);
    await p.click('#' + await p.evaluate(() => { const o = Ext.ComponentQuery.query('pilotage #onglets')[0]; return o.items.items.find((x) => x.title === 'Comparateur').tab.getEl().dom.id; }));
    await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('pilotage #choixComparateur button[itemId=comparer]')[0]; return c && c.isVisible(true); }, null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    const [rep] = await Promise.all([p.waitForResponse((r) => /pilotage\/onglet\/comparateur/.test(r.url()), { timeout: 120000 }),
      p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('pilotage #choixComparateur button[itemId=comparer]')[0].getEl().dom.id))]);
    const api = await rep.json();
    await p.waitForTimeout(2500);
    const e = await p.evaluate(() => {
      const ecran = Ext.ComponentQuery.query('pilotage')[0], panneau = ecran.down('#graphiquePanneau-comparateur'), syn = panneau.down('#syntheseComparateur');
      const tuiles = []; ecran.stores.comparateur.tuiles.each((r) => tuiles.push({ cle: r.get('cle'), libelle: r.get('libelle'), valeur: r.get('valeur') }));
      const mois = []; ecran.stores.comparateur.mois.each((r) => mois.push(r.get('libelle')));
      const titreEl = panneau.header && panneau.header.getEl().dom.querySelector('.x-header-text, .x-panel-header-text');
      const sEl = syn.getEl().dom, rs = sEl.getBoundingClientRect();
      const legende = ecran.down('#graphique-comparateur').series.items.map((s) => s.title);
      /* le titre est du HTML (encode) : on compare le texte affiche */
      return { titre: titreEl ? titreEl.innerText.trim() : null, titreEntier: titreEl ? titreEl.scrollWidth <= titreEl.clientWidth + 1 : null, synthese: sEl.innerText.trim(), synVisible: syn.isVisible(true),
        synDansEcran: rs.bottom <= window.innerHeight && rs.top >= 0 && rs.height > 0, synEntiere: sEl.scrollWidth <= sEl.clientWidth + 1, tuiles, mois, legende };
    });
    const ta = e.tuiles.find((t) => t.cle === 'a'), tb = e.tuiles.find((t) => t.cle === 'b');
    const c = api.comparaison || {};
    const phrase = phraseAttendue(c.libelleGrandeur, ta.libelle, tb.libelle, e.mois[0], e.mois[e.mois.length - 1]);
    ok('Phrase au-dessus de la courbe = API = noms des tuiles, couleurs, premier et dernier mois du tableau', e.titre === c.phrase && c.phrase === phrase,
      JSON.stringify({ ecran: e.titre, api: c.phrase, attendu: phrase }));
    const syn = syntheseAttendue(ta.libelle, tb.libelle, ta.valeur, tb.valeur);
    ok('Synthèse sous la courbe = API = calcul depuis les tuiles A et B affichées', e.synthese === c.synthese && c.synthese === syn,
      JSON.stringify({ ecran: e.synthese, api: c.synthese, attendu: syn, a: ta.valeur, b: tb.valeur }));
    ok('Légende : les noms en clair (pas « A » / « B »)', e.legende.join('|') === [ta.libelle, tb.libelle].join('|') && !e.legende.includes('A'), JSON.stringify(e.legende));
    ok('Ergonomie : phrase entière ; synthèse visible, entière, dans l\'écran (1366 × 768)', e.titreEntier !== false && e.synVisible && e.synDansEcran && e.synEntiere,
      JSON.stringify({ titreEntier: e.titreEntier, synVisible: e.synVisible, synDansEcran: e.synDansEcran, synEntiere: e.synEntiere }));

    /* cas varies par l'API : deux familles, deux grossistes */
    const familles = q('SELECT GROUP_CONCAT(lg_FAMILLEARTICLE_ID SEPARATOR \'|\') FROM (SELECT lg_FAMILLEARTICLE_ID FROM t_famillearticle LIMIT 2) x').split('|');
    const grossistes = q("SELECT GROUP_CONCAT(id SEPARATOR '|') FROM (SELECT DISTINCT g.lg_GROSSISTE_ID AS id FROM t_grossiste g JOIN t_order o ON o.lg_GROSSISTE_ID = g.lg_GROSSISTE_ID"
      + " JOIN t_bon_livraison bl ON bl.lg_ORDER_ID = o.lg_ORDER_ID WHERE bl.str_STATUT = 'is_Closed' LIMIT 2) x").split('|');
    for (const [nom, url] of [['deux familles', '?axe=MOIS&type=FAMILLE&objetA=' + encodeURIComponent(familles[0]) + '&objetB=' + encodeURIComponent(familles[1]) + '&grandeur=caTTC'],
      ['deux grossistes', '?axe=G12&type=GROSSISTE&objetA=' + encodeURIComponent(grossistes[0]) + '&objetB=' + encodeURIComponent(grossistes[1])],
      ['B contre A (sens inverse)', '?axe=MOIS&type=FAMILLE&objetA=' + encodeURIComponent(familles[1]) + '&objetB=' + encodeURIComponent(familles[0]) + '&grandeur=caTTC']]) {
      const j = await p.evaluate(async (u) => (await fetch('../api/v1/pilotage/onglet/comparateur' + u)).json(), url);
      const a = j.tuiles.find((t) => t.cle === 'a'), bb = j.tuiles.find((t) => t.cle === 'b'), m = j.mois.map((x) => x.libelle);
      ok(`API, ${nom} : phrase et synthèse = leurs tuiles et leurs mois`, j.comparaison.phrase === phraseAttendue(j.comparaison.libelleGrandeur, a.libelle, bb.libelle, m[0], m[m.length - 1])
        && j.comparaison.synthese === syntheseAttendue(a.libelle, bb.libelle, a.valeur, bb.valeur), JSON.stringify({ phrase: j.comparaison.phrase, synthese: j.comparaison.synthese, a: a.valeur, b: bb.valeur }));
    }
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
