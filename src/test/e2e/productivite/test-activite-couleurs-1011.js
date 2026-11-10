/* PLAN DU 09/11, POINT 10 : COULEURS DE L'ACTIVITE DES EQUIPES.
 *
 * Par les vues (compte de test) : ANALYSE DE GESTION > Activite des equipes, octobre 2026 saisi au clavier, chaque onglet
 * ouvert par un vrai clic. Lecture seule.
 *  - chaque onglet porte sa couleur (texte de la couleur sur fond doux) ; l'onglet choisi est plein de sa couleur, texte
 *    blanc ; trois couleurs differentes, celles des cartes du tableau de bord ;
 *  - aucune tuile, aucun constat, aucun message n'a de filet de couleur sur le cote gauche (bordure gauche de plus de
 *    1 px ou d'une autre couleur que les autres cotes), dans les trois onglets ;
 *  - le bandeau des reperes n'a plus la ligne « n alertes : ... » (les 4 reperes restent) ;
 *  - legende du graphique « Ventes et saisie par heure » : la pastille « Ventes » a la couleur des barres ;
 *  - aucune fenetre ouverte, aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu, cliquer, saisir } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 600) + ']' : '')); }
const ATTENDU = { donnees: '#1d4ed8', analyses: '#7c3aed', anomalies: '#e11d48' };
const rgb = (h) => 'rgb(' + [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(', ') + ')';

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const fenetres = () => p.evaluate(() => Ext.ComponentQuery.query('window').filter((w) => w.isVisible()).length);
  /* couleurs calculees des trois onglets */
  const onglets = () => p.evaluate(() => ['donnees', 'analyses', 'anomalies'].map((k) => {
    const btn = Ext.ComponentQuery.query('activiteequipes button[itemId=ae-' + k + ']')[0], el = btn.getEl().dom, inner = el.querySelector('.x-btn-inner');
    const s = getComputedStyle(el);
    return { k, presse: !!btn.pressed, fond: s.backgroundColor, bord: s.borderTopColor, texte: getComputedStyle(inner).color };
  }));
  /* filets gauches : bordure gauche epaisse ou d'une autre couleur que la bordure du haut */
  const filets = () => p.evaluate(() => {
    const racine = Ext.ComponentQuery.query('activiteequipes')[0].getEl().dom, l = [];
    racine.querySelectorAll('.ae-hub div, .ae-hub li, .ae-hub span, .ae-hub td').forEach((x) => {
      if (!x.offsetParent || /x-(grid|toolbar|btn|panel-header|tool|form|field|trigger|resizable|splitter)/.test(x.className || '')) { return; }
      const s = getComputedStyle(x), g = parseFloat(s.borderLeftWidth) || 0;
      if (g >= 3 || (g > 0 && s.borderLeftStyle !== 'none' && s.borderLeftColor !== s.borderTopColor && (parseFloat(s.borderTopWidth) || 0) === 0)) {
        l.push((x.className || x.tagName) + ' ' + g + 'px ' + s.borderLeftColor);
      }
    });
    return l;
  });
  const attendreAnalyses = () => p.waitForFunction(() => { const a = Ext.ComponentQuery.query('activiteequipes')[0].analyses;
    return a.rendered && !(a.loadMask && a.loadMask.isVisible()) && document.querySelectorAll('.ae-tuile').length > 0 && document.querySelector('.ae-constat'); }, null, { timeout: 180000 })
    .then(() => p.waitForTimeout(1500));
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const fenetresAvant = await fenetres();
    await ouvrirMenu(p, 'ANALYSE DE GESTION', 'Activité des équipes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('activiteequipes').some((c) => c.isVisible(true)), null, { timeout: 60000 });
    await saisir(p, 'activiteequipes #aeDebut', '01/10/2026');
    await saisir(p, 'activiteequipes #aeFin', '31/10/2026');

    const vus = {};
    for (const k of ['analyses', 'donnees', 'anomalies']) {
      await cliquer(p, 'activiteequipes button[itemId=ae-' + k + ']');
      if (k === 'analyses') { await cliquer(p, 'activiteequipes #aeActualiser'); await attendreAnalyses(); } else { await p.waitForTimeout(2500); }
      vus[k] = { onglets: await onglets(), filets: await filets() };
    }
    /* onglets */
    const ecarts = [];
    for (const [choisi, v] of Object.entries(vus)) {
      for (const o of v.onglets) {
        const c = rgb(ATTENDU[o.k]);
        const bon = o.k === choisi ? o.presse && o.fond === c && o.texte === 'rgb(255, 255, 255)'
          : !o.presse && o.texte === c && o.bord === c && o.fond !== c && o.fond !== 'rgb(255, 255, 255)';
        if (!bon) { ecarts.push(choisi + '/' + o.k + ' ' + JSON.stringify(o)); }
      }
    }
    ok('Onglets : chacun sa couleur (texte coloré sur fond doux), l\'onglet choisi plein de sa couleur, texte blanc ; vérifié onglet par onglet',
      ecarts.length === 0 && new Set(Object.values(ATTENDU)).size === 3, ecarts.slice(0, 3).join(' ; '));
    for (const [k, v] of Object.entries(vus)) {
      ok('Onglet « ' + k + ' » : aucun filet de couleur à gauche (tuiles, constats, messages)', v.filets.length === 0, v.filets.slice(0, 5).join(' ; '));
    }

    /* analyses : reperes sans ligne d'alerte, legende */
    await cliquer(p, 'activiteequipes button[itemId=ae-analyses]');
    await p.waitForTimeout(1000);
    const a = await p.evaluate(() => {
      const r = Ext.ComponentQuery.query('activiteequipes')[0].getEl().dom;
      const ch = Ext.ComponentQuery.query('activiteequipes chart[itemId=gHeures]')[0];
      const s = ch.series.get(0), legende = ch.legend && ch.legend.items && ch.legend.items[0];
      const pastille = legende && legende.items ? legende.items.filter((x) => x.type === 'rect').map((x) => x.attr && x.attr.fill)[0] : null;
      const barre = (s.items || []).map((x) => x.sprite && x.sprite.attr && x.sprite.attr.fill).filter(Boolean)[0];
      return { reperes: r.querySelectorAll('.ae-rep').length, alerte: r.querySelectorAll('.ae-rep-alerte').length,
        constats: r.querySelectorAll('.ae-constat').length, titre: s.title, couleurLegende: s.getLegendColor(0), pastille, barre };
    });
    ok('Bandeau des repères : les 4 repères, plus de ligne « alertes »', a.reperes >= 4 && a.alerte === 0, JSON.stringify(a));
    ok('Constats présents (vérification des filets non vide)', a.constats > 0, a.constats);
    /* une couleur lue en #rrggbb ou en rgb(r,g,b) */
    const hexa = (c) => { const m = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.exec(String(c || '').trim());
      return m ? '#' + m.slice(1).map((x) => Number(x).toString(16).padStart(2, '0')).join('') : String(c || '').toLowerCase(); };
    ok('Légende « Ventes » de la couleur des barres (#2563eb)', a.titre === 'Ventes' && hexa(a.couleurLegende) === '#2563eb'
      && hexa(a.pastille) === '#2563eb' && hexa(a.barre) === '#2563eb', JSON.stringify(a));

    ok('Consultation en place : aucune fenêtre ouverte', (await fenetres()) === fenetresAvant);
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Déroulé sans exception', false, e.stack);
  } finally {
    await b.close();
    const ko = res.filter((x) => !x.c).length;
    console.log(`\n${res.length - ko}/${res.length} OK`);
    process.exit(ko ? 1 : 0);
  }
})();
