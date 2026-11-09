/* PLAN AVOIR DU 08/11, POINT 3 : PILOTAGE DE L'OFFICINE SUR UN PORTABLE DE 15 POUCES ET SUR UN PETIT ECRAN.
 *
 * Retours : tuiles de la Synthese cachees sous la barre d'onglets ; « Qualite–Exploitation » a renommer
 * « Exploitation » ; tuiles de « A suivre » dont le texte deborde ; cartes « CA par emplacement » et « CA par famille »
 * qui montrent leurs en-tetes sans les donnees ; KPI Analyse qui defile en largeur et dont les cases debordent ;
 * detail mensuel coupe.
 *
 * Par l'ecran (vrai menu, vrais clics sur les onglets et sur les fleches de la barre), a quatre tailles : 1366 x 768,
 * 1536 x 864 (1920 x 1080 a 125 %), 1280 x 720 (150 %) et 1024 x 600. Pour chaque onglet :
 *   - la barre d'onglets tient sur UNE ligne (flèches de défilement si elle est trop longue) ;
 *   - aucune tuile ne passe sous la barre d'onglets, aucune n'est coupée par son cadre ;
 *   - aucun defilement horizontal dans l'onglet ;
 *   - aucun texte coupé dans les tuiles (largeur et hauteur du texte contenues dans la tuile) ;
 *   - le detail mensuel montre toutes ses lignes (12 mois ou plus selon l'axe) sans barre de defilement propre :
 *     c'est le defilement de l'onglet qui amene chaque ligne a l'ecran (verifie en faisant defiler jusqu'a la
 *     derniere ligne) ;
 *   - A suivre : tuiles d'au moins 150 px, texte qui passe a la ligne ; cartes « CA par emplacement » et « CA par
 *     famille » : leurs lignes de donnees sont visibles une fois la carte amenee a l'ecran ;
 *   - KPI Analyse : le cadre des cases ne defile ni en largeur ni en hauteur : toutes les cases sont visibles.
 * Lecture seule (aucune preference ni charge n'est enregistree).
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const V = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }

const TAILLES = (process.env.TAILLES || '1366x768,1536x864,1280x720,1024x600').split(',').map((t) => t.split('x').map(Number));
const ONGLETS = (process.env.ONGLETS || 'synthese,ventes,marge,achats,caisse,stock,qualite,kpi,comparateur,achatsventes,asuivre,rentabilite').split(',');

/* clic reel sur l'onglet ; s'il est hors de la barre (flèches), clics sur la fleche jusqu'a ce qu'il apparaisse */
async function cliquerOnglet(p, cle) {
  for (let i = 0; i < 30; i++) {
    const etat = await p.evaluate((cle) => {
      const t = Ext.ComponentQuery.query('pilotage #onglets')[0], o = t.down('#onglet-' + cle), tab = o.tab;
      const r = tab.getEl().dom.getBoundingClientRect(), barre = t.getTabBar().body.dom.getBoundingClientRect();
      const visible = r.left >= barre.left - 1 && r.right <= barre.right + 1;
      const d = t.getTabBar().getEl().dom.querySelector('.x-box-scroller-right:not(.x-box-scroller-disabled)'),
        g = t.getTabBar().getEl().dom.querySelector('.x-box-scroller-left:not(.x-box-scroller-disabled)');
      return { id: tab.getEl().id, visible, droite: d && d.offsetWidth ? d.id : null, gauche: g && g.offsetWidth ? g.id : null,
        aDroite: r.left > barre.left };
    }, cle);
    if (etat.visible) { await p.click('#' + etat.id); break; }
    const fleche = etat.aDroite ? etat.droite : etat.gauche;
    if (!fleche) { throw new Error('Onglet ' + cle + ' hors de la barre et sans flèche'); }
    await p.click('#' + fleche);
    await p.waitForTimeout(250);
  }
  await p.waitForFunction((cle) => { const e = Ext.ComponentQuery.query('pilotage')[0];
    return e.down('#onglets').getActiveTab().cleOnglet === cle; }, cle, { timeout: 10000 });
}

async function attendreDonnees(p, cle) {
  await p.waitForFunction((cle) => { const e = Ext.ComponentQuery.query('pilotage')[0];
    if (cle === 'comparateur') { return true; }
    return e.stores[cle].tuiles.getCount() > 0 && !Ext.ComponentQuery.query('pilotage #onglet-' + cle)[0].getEl().down('.x-mask-msg:not(.x-hide-display)'); },
  cle, { timeout: 180000 }).catch(() => {});
  if (cle === 'asuivre') {
    await p.waitForFunction(() => ['emplacements', 'familles'].every((c) => { const x = document.querySelector('.sv-carte[data-carte="' + c + '"] .sv-corps');
      return x && !x.querySelector('.sv-attente'); }), null, { timeout: 180000 }).catch(() => {});
  }
  await p.waitForTimeout(1500);
}

/* mesures de l'onglet actif */
function mesurer(cle) {
  const e = Ext.ComponentQuery.query('pilotage')[0], t = e.down('#onglets'), o = t.down('#onglet-' + cle);
  const corps = o.body ? o.body.dom : o.getEl().dom, rc = corps.getBoundingClientRect();
  const barre = t.getTabBar().getEl().dom.getBoundingClientRect();
  const tabs = t.items.items.map((x) => x.tab.getEl().dom.getBoundingClientRect());
  const lignesBarre = new Set(tabs.filter((r) => r.width > 0).map((r) => Math.round(r.top))).size;
  const coupe = (el) => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;
  const m = { cle, lignesBarre, hauteurBarre: Math.round(barre.height), defileH: corps.scrollWidth > corps.clientWidth + 1,
    titres: t.items.items.map((x) => x.title).join('|') };
  /* barre de periode : aucun bouton ni champ coupe au bord droit */
  const bp = e.down('#barrePeriode'), rb = bp.getEl().dom.getBoundingClientRect();
  m.barrePeriodeCoupee = bp.query('button,combobox,datefield').filter((c) => c.isVisible(true))
    .filter((c) => c.getEl().dom.getBoundingClientRect().right > rb.right + 1).map((c) => c.itemId || c.text);
  /* tuiles : sous la barre ? coupees par leur cadre ? texte coupe ? */
  m.tuilesSousBarre = []; m.tuilesCoupees = []; m.textesCoupes = []; m.tuilesEtroites = [];
  corps.querySelectorAll('.pilotage-tuiles').forEach((vue) => {
    const rv = vue.getBoundingClientRect();
    vue.querySelectorAll('.pilotage-tuile').forEach((tu) => {
      const r = tu.getBoundingClientRect(), id = tu.getAttribute('data-cle');
      if (r.top < barre.bottom - 1 && r.bottom > rc.top && r.top > rc.top - 2000 && r.top >= rv.top - 1 && vue.closest('.x-panel-body') === corps
          && corps.scrollTop === 0) { m.tuilesSousBarre.push(id); }
      if (r.bottom > rv.bottom + 1 || r.right > rv.right + 1) { m.tuilesCoupees.push(id + ':' + Math.round(r.bottom - rv.bottom)); }
      if (coupe(tu) || [...tu.children].some((c) => c.scrollWidth > c.clientWidth + 1)) { m.textesCoupes.push(id); }
      if (r.width < 150) { m.tuilesEtroites.push(id + ':' + Math.round(r.width)); }
    });
  });
  /* detail mensuel */
  const grille = o.down('#detail-' + cle);
  if (grille && grille.getStore && grille.getStore() === e.stores[cle].detail) {
    const vue = grille.getView().getEl().dom;
    m.detail = { lignes: e.stores[cle].detail.getCount(), dessinees: vue.querySelectorAll('.x-grid-row').length,
      defilePropre: vue.scrollHeight > vue.clientHeight + 1, hauteur: Math.round(vue.clientHeight), contenu: vue.scrollHeight };
  }
  if (cle === 'kpi') {
    const k = e.down('#casesKpi'), kb = k.body.dom;
    m.kpi = { defileH: kb.scrollWidth > kb.clientWidth + 1, defileV: kb.scrollHeight > kb.clientHeight + 1,
      cases: k.query('checkbox').length, sw: kb.scrollWidth, cw: kb.clientWidth, sh: kb.scrollHeight, ch: kb.clientHeight };
  }
  return m;
}

(async () => {
  let b = null;
  const err = [];
  try {
    b = await ENV_E2E.lancer(chromium);
    for (const [l, h] of TAILLES) {
      const T = l + 'x' + h;
      const p = await (await b.newContext({ viewport: { width: l, height: h } })).newPage();
      p.on('pageerror', (e) => err.push(T + ' ' + e.message));
      await V.connexion(p, ENV_E2E.LOGIN, 'e2etest');
      await V.ouvrirMenu(p, 'ANALYSE DE GESTION', "Pilotage de l'officine");
      await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('pilotage')[0]; return e && e.stores.synthese.mois.getCount() > 0; }, null, { timeout: 180000 });
      for (const cle of ONGLETS) {
        await cliquerOnglet(p, cle);
        await attendreDonnees(p, cle);
        const m = await p.evaluate(mesurer, cle);
        if (cle === ONGLETS[0]) {
          ok(`${T} — libellé « Exploitation » (et plus « Qualité–Exploitation »)`, /\|Exploitation\|/.test('|' + m.titres + '|') && !/Qualit/.test(m.titres), m.titres);
        }
        if (cle === ONGLETS[0]) {
          ok(`${T} — barre de période : aucun bouton coupé au bord droit`, !m.barrePeriodeCoupee.length, m.barrePeriodeCoupee.join(','));
        }
        ok(`${T} ${cle} — barre d'onglets sur une ligne`, m.lignesBarre === 1, JSON.stringify({ l: m.lignesBarre, h: m.hauteurBarre }));
        ok(`${T} ${cle} — aucune tuile sous la barre d'onglets ni coupée par son cadre`, !m.tuilesSousBarre.length && !m.tuilesCoupees.length,
          JSON.stringify({ sous: m.tuilesSousBarre, coupees: m.tuilesCoupees }));
        ok(`${T} ${cle} — aucun texte coupé dans les tuiles`, !m.textesCoupes.length, m.textesCoupes.join(','));
        ok(`${T} ${cle} — aucun défilement horizontal`, !m.defileH);
        /* le Comparateur n'a pas de detail tant qu'on n'a pas choisi quoi comparer */
        if (m.detail && !(cle === 'comparateur' && m.detail.lignes === 0)) {
          ok(`${T} ${cle} — détail mensuel : toutes les lignes (${m.detail.lignes}) dessinées, sans défilement propre`,
            m.detail.lignes >= 1 && m.detail.dessinees === m.detail.lignes && !m.detail.defilePropre, JSON.stringify(m.detail));
          /* la derniere ligne, amenee a l'ecran par le defilement de l'onglet, est entierement visible */
          const vis = await p.evaluate((cle) => {
            const e = Ext.ComponentQuery.query('pilotage')[0], o = e.down('#onglet-' + cle), g = o.down('#detail-' + cle);
            const rows = g.getView().getEl().dom.querySelectorAll('.x-grid-row'); const der = rows[rows.length - 1];
            if (!der) { return null; }
            der.scrollIntoView({ block: 'end' });
            const r = der.getBoundingClientRect(), c = o.body.dom.getBoundingClientRect(), v = g.getView().getEl().dom.getBoundingClientRect();
            const res = { bas: Math.round(r.bottom), basOnglet: Math.round(c.bottom), basVue: Math.round(v.bottom), scrollVue: g.getView().getEl().dom.scrollTop };
            o.body.dom.scrollTop = 0;
            return res;
          }, cle);
          ok(`${T} ${cle} — dernière ligne du détail visible en faisant défiler l'onglet`, vis && vis.bas <= vis.basOnglet + 1 && vis.bas <= vis.basVue + 1 && vis.scrollVue === 0, JSON.stringify(vis));
        }
        if (cle === 'asuivre') {
          ok(`${T} À suivre — tuiles d'au moins 150 px`, !m.tuilesEtroites.length, m.tuilesEtroites.join(','));
          for (const carte of ['emplacements', 'familles']) {
            const c = await p.evaluate((carte) => {
              const el = document.querySelector('.sv-carte[data-carte="' + carte + '"]');
              el.scrollIntoView({ block: 'start' });
              const lignes = [...el.querySelectorAll('.sv-table tr')].slice(1);
              const rc = el.getBoundingClientRect(), corps = el.querySelector('.sv-corps').getBoundingClientRect();
              const vues = lignes.filter((tr) => { const r = tr.getBoundingClientRect(); return r.height > 0 && r.top >= rc.top && r.bottom <= Math.min(rc.bottom, window.innerHeight) + 1; });
              const rows = lignes.slice(0, 3).map((tr) => { const r = tr.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.height)]; });
              return { lignes: lignes.length, visibles: vues.length, carte: [Math.round(rc.top), Math.round(rc.height)], corps: [Math.round(corps.top), Math.round(corps.height)],
                rows, texte: (lignes[0] ? lignes[0].textContent : el.querySelector('.sv-corps').textContent).slice(0, 80) };
            }, carte);
            ok(`${T} À suivre — carte « ${carte} » : lignes de données visibles`, c.lignes > 0 && c.visibles > 0, JSON.stringify(c));
          }
        }
        if (m.kpi) {
          ok(`${T} KPI — cases sans défilement horizontal ni vertical (toutes visibles)`, m.kpi.cases > 0 && !m.kpi.defileH && !m.kpi.defileV, JSON.stringify(m.kpi));
        }
      }
      await p.context().close();
    }
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
