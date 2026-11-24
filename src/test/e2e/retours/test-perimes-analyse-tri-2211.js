/* SAISIE DES PERIMES, ONGLET ANALYSE : BOUTONS « PAR VALEUR » ET « LES PLUS FREQUENTS » (retour du 22/11 :
 * « les boutons par valeur et les plus fréquents ne font rien au clic »).
 *
 * Cause : le tableau qu'ils changent (produits) est sous les tuiles et les emplacements, hors de l'ecran (vers 1 100 px
 * pour un ecran de 768) ; et le bouton actif ne se distinguait presque pas de l'autre. Le clic changeait le tableau
 * sans que rien ne bouge a l'ecran.
 * Attendu : le bouton actif est nettement marque (fond fonce, texte blanc ; l'autre clair) ; au clic, l'analyse defile
 * jusqu'au tableau des produits, dont le titre est visible a l'ecran ; le tableau suit le bouton.
 * Vrai chemin : menu GESTION DU STOCK › Saisie des périmés, onglet « Analyse », clics sur les deux boutons, a 1366x768
 * et 1280x720, deux periodes (annee en cours, et 3 mois).
 * Rapprochement : lignes du tableau (fois, quantite, valeur, dans l'ordre) = reponse de l'API = base (meme requete).
 * Lecture seule : rien n'est ecrit en base.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const V = require('../outils/vues');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).replace(/\r/g, '').trim();
const PERIMES = " FROM t_warehouse w JOIN t_famille f ON f.lg_FAMILLE_ID = w.lg_FAMILLE_ID LEFT JOIN t_zone_geographique z ON z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID"
  + " WHERE w.str_STATUT = 'delete' AND w.dt_CREATED >= '%D' AND w.dt_CREATED < '%F' + INTERVAL 1 DAY";
/* cles du tri, dans l'ordre (a cles egales, l'ordre des lignes n'est pas fixe : seules les cles sont comparees) */
const base = (d, f, freq) => q("SELECT IFNULL(GROUP_CONCAT(" + (freq ? "CONCAT_WS('|', x.n, x.qte, x.val)" : "CONCAT_WS('|', x.val, x.n)") + " ORDER BY x.o SEPARATOR ' '), '') FROM (SELECT COUNT(*) n, SUM(w.int_NUMBER) qte,"
  + " SUM(w.int_NUMBER * f.int_PRICE) val, ROW_NUMBER() OVER (ORDER BY " + (freq ? 'COUNT(*) DESC, SUM(w.int_NUMBER) DESC, SUM(w.int_NUMBER * f.int_PRICE) DESC'
    : 'SUM(w.int_NUMBER * f.int_PRICE) DESC, COUNT(*) DESC') + ") o" + PERIMES.replace('%D', d).replace('%F', f)
  + " GROUP BY f.lg_FAMILLE_ID, f.int_CIP, f.str_NAME, z.str_LIBELLEE) x WHERE x.o <= 50");
const iso = (dt) => dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
const fr = (s) => s.split('-').reverse().join('/');

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  try {
    const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
    p.on('pageerror', (e) => err.push(e.message));
    await V.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const lib = await p.evaluate(() => { const n = Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().findChild('id', 'saisieperime', true);
      return n ? [n.parentNode.get('text'), n.get('text')] : null; });
    if (!lib) { throw new Error('menu saisieperime absent pour ce compte'); }
    await V.ouvrirMenu(p, lib[0], lib[1]);
    await p.waitForFunction(() => Ext.ComponentQuery.query('saisieperimeonglets').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    await V.cliquer(p, 'saisieperimeonglets button[text=Analyse]');
    const auj = new Date();
    const periodes = [[iso(new Date(auj.getFullYear(), 0, 1)), iso(auj)], [iso(new Date(auj.getFullYear(), auj.getMonth() - 3, 1)), iso(auj)]];
    const lire = () => p.evaluate(() => {
      const a = Ext.ComponentQuery.query('#analysePerimes')[0], t = a.down('#spContenu').getEl().dom.querySelector('table.sp-par-produit');
      const corps = a.body.dom.getBoundingClientRect(), titre = t ? t.previousElementSibling : null, rt = titre ? titre.getBoundingClientRect() : null;
      const fond = (c) => getComputedStyle(c.getEl().dom).backgroundColor, texte = (c) => getComputedStyle(c.getEl().dom.querySelector('.x-btn-inner')).color;
      const v = a.down('#spTriValeur'), f = a.down('#spTriFrequence');
      return { titre: titre ? titre.innerText : '', titreVisible: !!rt && rt.top >= corps.top - 1 && rt.bottom <= Math.min(corps.bottom, window.innerHeight) + 1,
        lignes: t ? Array.from(t.querySelectorAll('tr.sp-produit')).map((r) => { const c = r.querySelectorAll('td'); return [3, 4, 5].map((i) => c[i].innerText.replace(/\s/g, '')).join('|'); }).join(' ') : '',
        valeur: { appuye: v.pressed, fond: fond(v), texte: texte(v) }, frequence: { appuye: f.pressed, fond: fond(f), texte: texte(f) } };
    });
    /* fond « fonce » : luminance < 0,35 ; « clair » : > 0,7 (texte blanc sur le bouton actif) */
    const lum = (c) => { const m = (c || '').match(/\d+(\.\d+)?/g); if (!m) { return 1; } const [r, g, bl, a] = m.map(Number); if (a === 0) { return 1; } return (0.2126 * r + 0.7152 * g + 0.0722 * bl) / 255; };
    for (const [lg, ht] of [[1366, 768], [1280, 720]]) {
      await p.setViewportSize({ width: lg, height: ht });
      for (const [d, f] of periodes) {
        await p.evaluate(([x, y]) => { const a = Ext.ComponentQuery.query('#analysePerimes')[0]; a.down('#spDebut').setValue(Ext.Date.parse(x, 'Y-m-d')); a.down('#spFin').setValue(Ext.Date.parse(y, 'Y-m-d')); }, [d, f]);
        const rep = p.waitForResponse((r) => r.url().includes('gestionperime/analyse?') && r.url().includes('dtStart=' + d), { timeout: 60000 });
        await V.cliquer(p, '#analysePerimes #spActualiser');
        const api = await (await rep).json();
        await p.waitForTimeout(800);
        await p.evaluate(() => { Ext.ComponentQuery.query('#analysePerimes')[0].body.scrollTo('top', 0); });
        for (const [bouton, freq] of [['spTriFrequence', true], ['spTriValeur', false]]) {
          await V.cliquer(p, '#analysePerimes #' + bouton);
          await p.waitForTimeout(900);
          const e = await lire();
          const actif = freq ? e.frequence : e.valeur, autre = freq ? e.valeur : e.frequence;
          const nom = `${lg}×${ht}, ${fr(d)} → ${fr(f)}, « ${freq ? 'Les plus fréquents' : 'Par valeur'} »`;
          ok(`${nom} : bouton actif nettement marqué (fond foncé, texte blanc), l'autre clair`, actif.appuye && !autre.appuye && lum(actif.fond) < 0.35 && lum(actif.texte) > 0.85 && lum(autre.fond) > 0.7,
            JSON.stringify({ actif, autre }));
          ok(`${nom} : au clic, l'analyse défile jusqu'au tableau des produits (titre visible à l'écran)`, e.titreVisible && (freq ? /plus souvent/.test(e.titre) : /par valeur/.test(e.titre)), e.titre);
          const liste = freq ? api.frequents : api.produits;
          const attendu = liste.map((x) => [x.fois, x.quantite, x.valeur].join('|')).join(' ');
          const cles = liste.map((x) => (freq ? [x.fois, x.quantite, x.valeur] : [x.valeur, x.fois]).join('|')).join(' ');
          ok(`${nom} : tableau = API, ligne par ligne (fois, quantité, valeur ; ${liste.length} lignes) ; ordre de l'API = base (${freq ? 'fois, puis quantité, puis valeur' : 'valeur, puis fois'})`,
            e.lignes === attendu && cles === base(d, f, freq) && attendu !== '', e.lignes.slice(0, 120) + ' / ' + cles.slice(0, 120) + ' / ' + base(d, f, freq).slice(0, 120));
        }
      }
    }
    ok('Les deux classements diffèrent sur la période (le clic change bien le tableau)', base(periodes[0][0], periodes[0][1], true) !== base(periodes[0][0], periodes[0][1], false));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Déroulé sans exception', false, x.stack || x);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
