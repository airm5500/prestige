/* PLAN DU 06/11, POINT 2 : PILOTAGE, ONGLET « À SUIVRE » - LE DEFILEMENT S'ARRETE TROP TOT.
 *
 * Retour de l'utilisateur : en faisant defiler l'onglet vers le bas, on voit le titre des dernieres cartes, pas leur
 * contenu. La hauteur de la page etait calculee a l'ouverture, quand les cartes ne disaient que « Chargement… ».
 *
 * Par les vues (1366 × 768, ecran courant d'officine) : menu ANALYSE DE GESTION > « Pilotage de l'officine », clic sur
 * l'onglet « À suivre », attente de toutes les cartes remplies, puis defilement A LA MOLETTE jusqu'en bas.
 *  - la zone des cartes n'est pas coupee : sa hauteur affichee couvre tout son contenu ;
 *  - en bas du defilement, la derniere carte est entierement visible (bas de la carte dans la fenetre) ;
 *  - chaque carte, amenee a l'ecran a la molette, montre son contenu en entier (aucune carte tronquee) ;
 *  - grands tableaux (CA par emplacement, CA par famille) : hauteur limitee, defilement dans la carte, et la derniere
 *    ligne s'atteint a la molette ;
 *  - rapprochement : nombre de lignes de ces deux tableaux = nombre de lignes de la reponse du serveur ;
 *  - la meme chose apres un changement de periode (les cartes sont redessinees) ;
 *  - aucune fenetre, aucune erreur JavaScript. Aucune ecriture.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu, choisir } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));

  /* toutes les cartes remplies (plus de « Chargement… »), tuiles demasquees */
  const remplies = () => p.waitForFunction(() => {
    const e = Ext.ComponentQuery.query('pilotage')[0];
    const c = e && e.down('#suiviCartes');
    const t = e && e.down('#tuiles-asuivre');
    return c && c.getEl() && !(t.el && t.el.isMasked()) && !c.getEl().dom.querySelector('.sv-attente');
  }, null, { timeout: 120000, polling: 100 });

  /* conteneur qui defile : le premier parent des cartes dont le contenu deborde et qui defile */
  const MESURES = () => {
    const cartes = Ext.ComponentQuery.query('pilotage #suiviCartes')[0].getEl().dom;
    let z = cartes.parentElement;
    while (z && !(/(auto|scroll)/.test(getComputedStyle(z).overflowY) && z.scrollHeight > z.clientHeight)) { z = z.parentElement; }
    if (!z) { z = cartes.parentElement; }
    const zr = z.getBoundingClientRect();
    const liste = [...cartes.querySelectorAll('.sv-carte')].map((x) => {
      const r = x.getBoundingClientRect();
      const corps = x.querySelector('.sv-corps');
      return { cle: x.dataset.carte, haut: r.top, bas: r.bottom, tronquee: x.scrollHeight > x.clientHeight + 1 || corps.scrollHeight > corps.clientHeight + 1 && getComputedStyle(corps).overflowY === 'hidden' };
    });
    return {
      scrollTop: z.scrollTop, maxScroll: z.scrollHeight - z.clientHeight, zoneHaut: zr.top, zoneBas: zr.bottom,
      hauteurCartes: cartes.offsetHeight, contenuCartes: cartes.scrollHeight, cartes: liste,
    };
  };
  const mesures = () => p.evaluate(MESURES);

  /* molette sur les cartes jusqu'a ce que le defilement ne bouge plus */
  const enBas = async () => {
    const m0 = await mesures();
    await p.mouse.move(683, Math.round((m0.zoneHaut + m0.zoneBas) / 2));
    let avant = -1;
    for (let i = 0; i < 60; i++) {
      await p.mouse.wheel(0, 400);
      await p.waitForTimeout(120);
      const m = await mesures();
      if (m.scrollTop === avant) { return m; }
      avant = m.scrollTop;
    }
    return mesures();
  };
  /* molette jusqu'a voir une carte : on remonte en haut, puis on descend pas a pas */
  const amener = async (cle) => {
    const m0 = await mesures();
    await p.mouse.move(683, Math.round((m0.zoneHaut + m0.zoneBas) / 2));
    for (let i = 0; i < 60; i++) { await p.mouse.wheel(0, -400); }
    await p.waitForTimeout(200);
    /* une carte plus haute que la fenetre ne tient pas d'un bloc : on doit en voir le haut, puis le bas */
    let hautVu = false;
    for (let i = 0; i < 80; i++) {
      const m = await mesures();
      const c = m.cartes.find((x) => x.cle === cle);
      hautVu = hautVu || (c.haut >= m.zoneHaut - 1 && c.haut < m.zoneBas);
      if (hautVu && c.bas <= m.zoneBas + 1 && c.bas > m.zoneHaut) { return { m, c, vue: true }; }
      if (m.scrollTop >= m.maxScroll) { return { m, c, vue: false }; }
      await p.mouse.wheel(0, 120);
      await p.waitForTimeout(80);
    }
    const m = await mesures();
    return { m, c: m.cartes.find((x) => x.cle === cle), vue: false };
  };

  const verifier = async (quand) => {
    const m = await mesures();
    ok(quand + ' : la zone des cartes n\'est pas coupée (hauteur affichée ≥ contenu)', m.hauteurCartes >= m.contenuCartes - 1,
      'affichée ' + m.hauteurCartes + ' px, contenu ' + m.contenuCartes + ' px');
    const bas = await enBas();
    const derniere = bas.cartes.reduce((a, x) => (x.bas > a.bas ? x : a));
    ok(quand + ' : défilement à la molette jusqu\'en bas, la dernière carte (« ' + derniere.cle + ' ») est entièrement visible',
      derniere.bas <= bas.zoneBas + 1, 'bas de la carte ' + Math.round(derniere.bas) + ', bas de la fenêtre ' + Math.round(bas.zoneBas)
      + ', défilement ' + bas.scrollTop + '/' + bas.maxScroll);
    const pasVues = [];
    for (const c of bas.cartes) {
      const r = await amener(c.cle);
      if (!r.vue || r.c.tronquee) { pasVues.push(c.cle + (r.c.tronquee ? ' (tronquée)' : ' (bas jamais atteint : ' + Math.round(r.c.bas) + ' > ' + Math.round(r.m.zoneBas) + ')')); }
    }
    ok(quand + ' : chaque carte (' + bas.cartes.length + '), amenée à la molette, se voit en entier', pasVues.length === 0, pasVues.join(' ; '));

    /* grands tableaux : hauteur limitee, derniere ligne atteinte a la molette dans la carte */
    for (const cle of ['emplacements', 'familles']) {
      const r = await amener(cle);
      const info = await p.evaluate((k) => {
        const e = Ext.ComponentQuery.query('pilotage')[0];
        const carte = e.carteSuivi(k);
        const lignes = carte.querySelectorAll('table.sv-table tr');
        const d = carte.querySelector('.sv-defile');
        const rc = (d || carte).getBoundingClientRect();
        return { lignes: lignes.length - 1, serveur: ((e.donneesSuivi || {})[k] || []).length, defile: !!d, hauteur: Math.round(carte.getBoundingClientRect().height),
          x: Math.round(rc.left + rc.width / 2), y: Math.round(rc.top + rc.height / 2) };
      }, cle);
      ok(quand + ' : « ' + cle + ' » : lignes affichées = lignes du serveur', info.lignes === Math.max(info.serveur, 1) && info.serveur > 0,
        info.lignes + ' affichées, ' + info.serveur + ' du serveur');
      ok(quand + ' : « ' + cle + ' » : tableau à hauteur limitée, défilant dans la carte (carte ≤ 400 px)', info.defile && info.hauteur <= 400,
        'cadre défilant ' + info.defile + ', hauteur ' + info.hauteur + ' px, carte vue ' + r.vue);
      if (info.defile) {
        await p.mouse.move(info.x, info.y);
        for (let i = 0; i < 40; i++) { await p.mouse.wheel(0, 300); await p.waitForTimeout(40); }
        const vue = await p.evaluate((k) => {
          const d = Ext.ComponentQuery.query('pilotage')[0].carteSuivi(k).querySelector('.sv-defile');
          const l = [...d.querySelectorAll('tr')].pop().getBoundingClientRect();
          const z = d.getBoundingClientRect();
          return { bas: Math.round(l.bottom), zone: Math.round(z.bottom), haut: Math.round(l.top), zh: Math.round(z.top) };
        }, cle);
        ok(quand + ' : « ' + cle + ' » : la dernière ligne s\'atteint à la molette', vue.bas <= vue.zone + 1 && vue.haut >= vue.zh - 1, JSON.stringify(vue));
      }
    }
  };

  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'ANALYSE DE GESTION', "Pilotage de l'officine");
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('pilotage')[0]; return e && e.isVisible(true) && e.down('#onglet-asuivre'); }, null, { timeout: 120000 });
    await p.waitForLoadState('networkidle');
    const idOnglet = await p.evaluate(() => Ext.ComponentQuery.query('pilotage #onglet-asuivre')[0].tab.getId());
    await p.click('#' + idOnglet);
    await remplies();
    await p.waitForLoadState('networkidle');
    await p.waitForTimeout(800);
    await verifier('Ouverture');

    /* changement de periode : les cartes sont redessinees */
    const rep = p.waitForResponse((r) => r.url().includes('pilotage/onglet/asuivre') && r.url().includes('axe=G12'), { timeout: 180000 });
    await choisir(p, 'pilotage #barrePeriode #axe', 'Glissant 12 mois');
    await rep;
    await remplies();
    await p.waitForLoadState('networkidle');
    await p.waitForTimeout(800);
    await verifier('Glissant 12 mois');

    ok('Aucune fenêtre surgissante', !(await p.evaluate(() => Ext.ComponentQuery.query('window').some((w) => w.isVisible()))));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close().catch(() => null);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
