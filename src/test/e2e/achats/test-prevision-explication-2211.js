/* PLAN DU 21/11, POINT 15 (reponse du 22/11 : « le calcul pour la valeur prevue doit etre clairement explique et la
 * valeur a commander ») : fenetre de prevision d'un produit sans defilement, tableau des unites et de l'indice
 * saisonnier sous le graphe, explication de la valeur prevue (chiffres du calcul du serveur) et de la quantite a
 * commander.
 *
 * Parcours : GESTION DES COMMANDES > Prévisions, onglet Tableau, « Recalculer maintenant » (l'explication est ecrite au
 * calcul), puis onglet Prévisions : recherche du CIP, clic sur la ligne, la fenetre s'ouvre.
 * Jeu d'essai : produits reels de la base d'essai, un par methode retenue (moyenne, saison, Holt, Holt-Winters), un a
 * historique court (moins de 12 mois), un avec quelque chose a commander et un sans.
 * Controles :
 *  - base : chaque ligne de prevision porte son explication apres le calcul, dont la valeur = la prevision enregistree ;
 *  - rapprochement ecran = base, produit par produit : valeur de la barre orange, formule et derniere etape de la bulle
 *    = prevu_mois ; pour la moyenne, les 3 nombres de la formule = les 3 derniers mois de l'historique en base ;
 *    tableau des unites = historique en base mois par mois ; indices = recalcules ici depuis l'historique ;
 *  - coherence de la phrase « En clair » : arrondi − stock − en cours − equivalents (jamais negatif) = a commander, et
 *    = recommande en base (sinon la phrase le signale) ;
 *  - bulles : barre orange (etapes du calcul), ligne de methode (« se trompait de »), au survol ;
 *  - sans defilement a 1366x768, 1280x720 et 1920x1080, fenetre entiere dans l'ecran ;
 *  - delai : fenetre ouverte en moins de 3 s ;
 *  - bilan : ouvrir les fenetres ne modifie aucune ligne de prevision.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer, saisir } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '--raw'], { input: s, encoding: 'utf8' }).replace(/\r/g, '').trim();
const EMPL = '1';
const PLAFOND_MS = 3000;
const dec = (v) => String(Math.round(v * 10) / 10).replace('.', ',');
const empreinte = () => q(`SELECT MD5(GROUP_CONCAT(CONCAT_WS('|', lg_FAMILLE_ID, methode, prevu_mois, recommande, en_cours, stock, IFNULL(explication, ''), dt_CALCUL) ORDER BY lg_FAMILLE_ID))
  FROM t_prevision_produit WHERE lg_EMPLACEMENT_ID = '${EMPL}'`);

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  try {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => err.push(e.message));
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'GESTION DES COMMANDES', 'Prévisions');
    await p.waitForFunction(() => Ext.ComponentQuery.query('analysecommande').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await p.waitForTimeout(1500);

    /* ----- calcul par l'ecran ----- */
    await p.evaluate(() => { const a = Ext.ComponentQuery.query('analysecommande')[0]; const t = a.isXType('tabpanel') ? a : a.down('tabpanel'); t.setActiveTab(t.down('#ongletTableau')); });
    await p.waitForTimeout(800);
    const [calcul] = await Promise.all([p.waitForResponse((r) => /analyse-commande\/recalculer/.test(r.url()), { timeout: 600000 }), cliquer(p, 'analysecommande #btnRecalculer')]);
    ok('« Recalculer maintenant » : calcul fait', calcul.status() === 200 && (await calcul.json()).success !== false, calcul.status());
    const lignes = Number(q(`SELECT COUNT(*) FROM t_prevision_produit WHERE lg_EMPLACEMENT_ID = '${EMPL}'`));
    const sans = Number(q(`SELECT COUNT(*) FROM t_prevision_produit WHERE lg_EMPLACEMENT_ID = '${EMPL}' AND (explication IS NULL OR explication = '')`));
    const faux = Number(q(`SELECT COUNT(*) FROM t_prevision_produit WHERE lg_EMPLACEMENT_ID = '${EMPL}' AND ABS(CAST(JSON_VALUE(explication, '$.valeur') AS DECIMAL(14,2)) - prevu_mois) > 0.001`));
    ok(`Base : les ${lignes} lignes de prévision portent leur explication, de valeur = prévision enregistrée`, lignes > 100 && sans === 0 && faux === 0, JSON.stringify({ lignes, sans, faux }));

    /* ----- jeu d'essai : produits varies ----- */
    const un = (cond) => q(`SELECT pp.lg_FAMILLE_ID FROM t_prevision_produit pp JOIN t_famille f ON f.lg_FAMILLE_ID = pp.lg_FAMILLE_ID
      WHERE pp.lg_EMPLACEMENT_ID = '${EMPL}' AND f.int_CIP REGEXP '^[0-9]{6,}$' AND ${cond} ORDER BY pp.ventes_12_mois DESC LIMIT 1`);
    const cas = {
      'moyenne': un(`pp.methode = 'MOYENNE' AND pp.prevu_mois > 0`),
      'saison': un(`pp.methode = 'SAISON' AND pp.prevu_mois > 0`),
      'Holt': un(`pp.methode = 'HOLT' AND pp.prevu_mois > 0`),
      'Holt-Winters': un(`pp.methode = 'HOLT_WINTERS' AND pp.prevu_mois > 0`),
      'historique court': un(`(LENGTH(pp.historique) - LENGTH(REPLACE(pp.historique, ',', ''))) BETWEEN 3 AND 10`),
      'à commander > 1': un(`pp.recommande > 1`),
      'rien à commander': un(`pp.recommande = 0 AND pp.prevu_mois > 0 AND pp.stock > 0`)
    };
    const ids = Object.entries(cas).filter(([, v]) => v);
    ok('Jeu d\'essai : un produit pour chaque méthode, historique court, à commander et rien à commander', ids.length === 7, JSON.stringify(cas));
    const avant = empreinte();

    await p.evaluate(() => { const a = Ext.ComponentQuery.query('analysecommande')[0]; const t = a.isXType('tabpanel') ? a : a.down('tabpanel'); t.setActiveTab(t.down('#ongletPrevisions')); });
    await p.waitForTimeout(1200);
    const ouvrir = async (id) => {
      const cip = q(`SELECT int_CIP FROM t_famille WHERE lg_FAMILLE_ID = '${id}'`);
      await saisir(p, 'analysecommande #ongletPrevisions #query', cip);
      const charge = p.waitForResponse((r) => /analyse-commande\/previsions\?/.test(r.url()), { timeout: 30000 }).catch(() => null);
      await cliquer(p, 'analysecommande #ongletPrevisions button[text=Rechercher]');
      await charge; await p.waitForTimeout(1000);
      const ligne = await p.evaluate((f) => { const g = Ext.ComponentQuery.query('analysecommande #ongletPrevisions')[0];
        const i = g.getStore().findBy((r) => r.get('id') === f); const n = i >= 0 ? g.getView().getNode(i) : null;
        if (n) { n.id = 'e2e-ligne-prev-' + i; } return n ? '#' + n.id + ' td' : null; }, id);
      if (!ligne) { return null; }
      const t0 = Date.now();
      await p.locator(ligne).nth(2).click();
      await p.waitForFunction(() => Ext.ComponentQuery.query('#fenPrevision').some((w) => w.isVisible() && w.body.dom.querySelector('.pv-explication')), null, { timeout: 30000 });
      return Date.now() - t0;
    };
    const lire = () => p.evaluate(() => { const w = Ext.ComponentQuery.query('#fenPrevision').find((x) => x.isVisible()); const d = w.body.dom;
      const t = (s) => { const e = d.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; };
      const barre = d.querySelector('rect.pv-barre-prevue');
      const r = w.getEl().dom.getBoundingClientRect();
      return { explication: t('.pv-explication'), bulle: barre ? barre.getAttribute('data-qtip') : '', etiquette: Array.from(d.querySelectorAll('text.pv-qte')).pop().textContent,
        annees: Array.from(d.querySelectorAll('tr.pv-annee')).map((tr) => Array.from(tr.cells).map((c) => c.textContent.trim())),
        indices: Array.from(d.querySelectorAll('tr.pv-indice td')).slice(1).map((c) => c.textContent.trim()),
        phrase: t('.pv-phrase'), aCommander: t('.pv-a-commander'), ecartCalcul: t('.pv-ecart-calcul'), total: t('tr.pv-total td.n'),
        defile: w.body.dom.scrollHeight - w.body.dom.clientHeight, dansEcran: r.top >= 0 && r.left >= 0 && r.bottom <= window.innerHeight && r.right <= window.innerWidth,
        methodes: Array.from(d.querySelectorAll('tr.pv-methode')).map((x) => x.getAttribute('data-qtip')) }; });
    const fermer = () => p.evaluate(() => Ext.ComponentQuery.query('#fenPrevision').forEach((w) => w.close()));

    const ko = { valeur: [], moyenne: [], tableau: [], indices: [], phrase: [], delai: [], bulles: [] };
    let plusLong = 0;
    for (const [nom, id] of ids) {
      const ms = await ouvrir(id);
      if (ms === null) { ko.valeur.push(nom + ' : absent de la liste'); continue; }
      plusLong = Math.max(plusLong, ms);
      const f = await lire();
      const [methode, prevu, hist, recommande, stock, enCours, eq] = q(`SELECT methode, prevu_mois, historique, recommande, stock, en_cours, equivalents FROM t_prevision_produit WHERE lg_FAMILLE_ID = '${id}' AND lg_EMPLACEMENT_ID = '${EMPL}'`).split('\t');
      const pv = dec(Number(prevu));
      /* valeur prevue : barre, formule, derniere etape de la bulle */
      const derniere = (f.bulle.match(/<td class="n"><b>([^<]*)<\/b><\/td><\/tr><\/table>$/) || [])[1];
      if (f.etiquette !== pv || !f.explication.endsWith('= ' + pv + ' ⓘ détail') || derniere !== pv) { ko.valeur.push(`${nom} (${methode}) : base ${pv}, barre ${f.etiquette}, formule « ${f.explication} », bulle ${derniere}`); }
      /* moyenne : les 3 derniers mois de l'historique */
      const h = hist.split(',').map(Number);
      if (methode === 'MOYENNE') { const k = Math.min(3, h.length), d3 = h.slice(-k); const attendu = (k > 1 ? '(' + d3.join(' + ') + ') ÷ ' + k : String(d3[0])) + ' = ' + pv;
        if (f.explication.indexOf(attendu) < 0) { ko.moyenne.push(nom + ' : « ' + f.explication + ' » au lieu de « ' + attendu + ' »'); } }
      /* tableau des unites = historique, mois par mois ; indices recalcules ici */
      const dernier = new Date(); dernier.setDate(1); dernier.setMonth(dernier.getMonth() - 1);
      const parMois = {}, somme = Array(12).fill(0), nb = Array(12).fill(0);
      h.forEach((v, i) => { const m = new Date(dernier.getFullYear(), dernier.getMonth() - (h.length - 1 - i), 1); parMois[m.getFullYear() + '-' + m.getMonth()] = v; somme[m.getMonth()] += v; nb[m.getMonth()]++; });
      const ecran = {};
      f.annees.forEach((l) => l.slice(1).forEach((v, m) => { if (v !== '·') { ecran[l[0] + '-' + m] = Number(v); } }));
      if (JSON.stringify(Object.keys(parMois).sort().map((k) => [k, parMois[k]])) !== JSON.stringify(Object.keys(ecran).sort().map((k) => [k, ecran[k]]))) { ko.tableau.push(nom); }
      const moyenne = h.reduce((a, x) => a + x, 0) / h.length;
      const ind = somme.map((s, m) => (moyenne === 0 || nb[m] === 0 ? 0 : Math.round(s / nb[m] / moyenne * 100) / 100).toFixed(2).replace('.', ','));
      if (JSON.stringify(ind) !== JSON.stringify(f.indices)) { ko.indices.push(nom + ' : ' + f.indices.join(' ') + ' / ' + ind.join(' ')); }
      /* phrase « En clair » */
      const arr = Number((f.phrase.match(/soit (\d+) en arrondissant/) || [])[1]);
      const nombres = (f.phrase.match(/stock rayon et réserve (-?\d+), moins ce qui est déjà commandé (\d+), moins les équivalents en stock (\d+)/) || []).slice(1).map(Number);
      const calc = Math.max(0, arr - Math.max(0, nombres[0]) - nombres[1] - nombres[2]);
      if (!(nombres.length === 3 && nombres[0] === Number(stock) && nombres[1] === Number(enCours) && nombres[2] === Number(eq) && Number(f.aCommander) === calc
        && (calc === Number(recommande) ? !f.ecartCalcul : /La liste affiche/.test(f.ecartCalcul)) && f.total === recommande)) {
        ko.phrase.push(`${nom} : « ${f.phrase} » base ${stock}/${enCours}/${eq} → ${recommande}`);
      }
      if (!f.bulle.includes('Prévu en') || !f.methodes.length || !f.methodes.every((x) => /se trompait de \d+ %/.test(x))) { ko.bulles.push(nom); }
      if (f.defile > 0 || !f.dansEcran) { ko.delai.push(nom + ' : défilement ' + f.defile + ' px, dans l\'écran ' + f.dansEcran); }
      await fermer();
    }
    ok('Écran = base : valeur prévue de la barre orange, de la formule et de la bulle = prévision enregistrée, pour chaque produit', ko.valeur.length === 0, ko.valeur.join(' / '));
    ok('Moyenne : les nombres de la formule = les 3 derniers mois de l\'historique en base', ko.moyenne.length === 0 && !!cas.moyenne, ko.moyenne.join(' / '));
    ok('Tableau des unités = historique en base, mois par mois, année par année', ko.tableau.length === 0, ko.tableau.join(' / '));
    ok('Indices saisonniers = ventes moyennes du mois ÷ mois moyen, recalculés depuis l\'historique', ko.indices.length === 0, ko.indices.join(' / '));
    ok('« En clair » : arrondi − stock − en cours − équivalents = à commander = recommandé en base (chiffres = base)', ko.phrase.length === 0, ko.phrase.join(' / '));
    ok('Bulles : étapes du calcul sur la valeur prévue, « se trompait de … % » sur chaque méthode', ko.bulles.length === 0, ko.bulles.join(' / '));
    ok('1366×768 : aucune fenêtre ne défile, toutes entières dans l\'écran', ko.delai.length === 0, ko.delai.join(' / '));
    ok('Chaque fenêtre ouverte en moins de ' + PLAFOND_MS + ' ms', plusLong < PLAFOND_MS, plusLong + ' ms au plus');

    /* ----- survol reel de la barre orange et d'une methode ----- */
    await ouvrir(cas['Holt-Winters'] || ids[0][1]);
    await p.locator('.x-window rect.pv-barre-prevue').hover();
    await p.waitForTimeout(1200);
    const tip = await p.evaluate(() => { const t = Array.from(document.querySelectorAll('.x-tip')).find((x) => x.offsetWidth > 0); return t ? t.textContent.replace(/\s+/g, ' ') : ''; });
    ok('Survol de la barre orange : la bulle montre les étapes du calcul', /Prévu en .*méthode .*Prévu en/.test(tip), tip.slice(0, 300));
    await p.locator('.x-window tr.pv-methode').first().hover();
    await p.waitForTimeout(1200);
    const tip2 = await p.evaluate(() => { const t = Array.from(document.querySelectorAll('.x-tip')).find((x) => x.offsetWidth > 0); return t ? t.textContent.replace(/\s+/g, ' ') : ''; });
    ok('Survol d\'une méthode : explication simple de son erreur', /se trompait de \d+ %/.test(tip2), tip2.slice(0, 200));
    await fermer();

    /* ----- autres tailles d'ecran ----- */
    for (const [l, hh] of [[1280, 720], [1920, 1080]]) {
      await p.setViewportSize({ width: l, height: hh }); await p.waitForTimeout(800);
      const pires = [];
      for (const id of [cas['Holt-Winters'], cas.saison, cas['à commander > 1']].filter(Boolean)) {
        await ouvrir(id); const f = await lire(); if (f.defile > 0 || !f.dansEcran) { pires.push(id + ' ' + f.defile + ' px ' + f.dansEcran); } await fermer();
      }
      ok(`${l}×${hh} : fenêtre sans défilement, entière dans l'écran`, pires.length === 0, pires.join(' / '));
    }
    ok('Bilan : ouvrir les fenêtres ne modifie aucune ligne de prévision', empreinte() === avant);
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
  }
  const n = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - n) + '/' + res.length + (n ? ' ECHEC' : ' OK'));
  process.exit(n ? 1 : 0);
})();
