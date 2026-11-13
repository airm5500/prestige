/* PLAN DU 12/11 : CARTE « ACTIVITE DES EQUIPES » DU TABLEAU DE BORD.
 *
 * Demande : « aligner les donnees initiales (voir image) » ; « sur la vue des details, de legeres couleurs par carte
 * pour qu'on sente la difference entre les details » ; « conseil qui a conseille le produit : pourquoi l'afficher sur
 * 2 lignes alors qu'on a de l'espace a droite » (liste « CA attribue a », reponse A : elargie).
 * Constat (capture du 12/11) : un titre de repere sur deux lignes (« Ventes de plus de 10 min », « Delai moyen de
 * saisie des BL », « Operateur le plus rapide ») descend sa valeur : les chiffres d'une meme rangee ne sont pas a la
 * meme hauteur.
 *
 * Vrai chemin : connexion du compte de test, tableau de bord (ecran d'accueil), carte « Activite des equipes » ; lien
 * « Detail → » (fenetre des analyses) ; liste « CA attribue a » ouverte par sa fleche, « Conseil »
 * choisi a la souris. Lecture seule.
 * Controles :
 *  - alignement, a trois largeurs d'ecran (1366, 1600, 1920) : dans chaque rangee de reperes, valeurs a la meme
 *    hauteur (1 px pres), details aussi ; meme controle dans la fenetre de detail ;
 *  - rapprochement : chaque repere de la carte = le meme repere de la fenetre de detail (valeur et detail) ;
 *  - couleurs des cartes du detail : chaque carte a un fond doux (ni blanc, clair a plus de 90 %), deux cartes voisines
 *    n'ont pas le meme, aucun violet (teinte 250 a 320), aucun filet de couleur a gauche ;
 *  - « CA attribue a » : chaque choix de la liste tient sur une ligne ; « Conseil (qui a conseille le client) » se lit
 *    en entier dans le champ ;
 *  - aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { connexion, cliquer, choisir } = require('../outils/vues');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 600) + ']' : '')); }

/* rangees de reperes sous la racine donnee : pour chaque rangee, hauteur des valeurs et des details */
const rangees = (p, racine) => p.evaluate((r) => {
  const base = typeof r === 'string' ? document.querySelector(r) : null;
  if (!base) { return null; }
  const tuiles = Array.prototype.filter.call(base.querySelectorAll('.ae-rep'), (t) => t.offsetParent);
  const parLigne = {};
  tuiles.forEach((t) => {
    const b = t.getBoundingClientRect(), k = Math.round(b.top);
    const v = t.querySelector('.v').getBoundingClientRect(), d = t.querySelector('.d'), l = t.querySelector('.l');
    (parLigne[k] = parLigne[k] || []).push({ code: t.getAttribute('data-rep'), v: v.top, d: d ? d.getBoundingClientRect().top : null,
      hTitre: l.getBoundingClientRect().height });
  });
  return Object.keys(parLigne).map((k) => parLigne[k]);
}, racine);

const ecart = (rs, champ) => Math.max(0, ...rs.map((r) => { const x = r.map((t) => t[champ]).filter((v) => v !== null); return x.length ? Math.max(...x) - Math.min(...x) : 0; }));

/* teinte, saturation, clarte d'une couleur « rgb(a) » */
const tsl = (c) => {
  const m = String(c).match(/\d+(\.\d+)?/g) || [0, 0, 0];
  const [r, g, b] = m.slice(0, 3).map((x) => Number(x) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) { return { h: 0, s: 0, l }; }
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s, l };
};

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  try {
    const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
    const erreurs = []; p.on('pageerror', (e) => erreurs.push(String(e.message)));
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await p.waitForFunction(() => { const c = document.querySelector('[data-corps="activite"]');
      return c && c.querySelector('.ae-rep[data-rep="CONSEIL"] .v') && !/…/.test(c.querySelector('.ae-rep[data-rep="CONSEIL"] .v').textContent); }, null, { timeout: 120000 });

    /* --- alignement sur la carte du tableau de bord, a trois largeurs */
    let titresSurDeuxLignes = 0;
    for (const largeur of [1366, 1600, 1920]) {
      await p.setViewportSize({ width: largeur, height: 950 });
      await p.waitForTimeout(800);
      const rs = await rangees(p, '[data-corps="activite"]');
      if (rs) { const tous = rs.flat(), h1 = Math.min(...tous.map((t) => t.hTitre)); titresSurDeuxLignes += tous.filter((t) => t.hTitre > h1 * 1.5).length; }
      ok('carte, ' + largeur + ' px : valeurs d\'une rangee a la meme hauteur', rs && rs.length && ecart(rs, 'v') <= 1,
        rs ? 'ecart ' + ecart(rs, 'v').toFixed(1) + ' px ; ' + rs.map((r) => r.map((t) => t.code + ':' + Math.round(t.v)).join(' ')).join(' | ') : 'carte absente');
      ok('carte, ' + largeur + ' px : details d\'une rangee a la meme hauteur', rs && rs.length && ecart(rs, 'd') <= 1, rs ? 'ecart ' + ecart(rs, 'd').toFixed(1) + ' px' : '');
    }
    ok('jeu d\'essai : des titres passent bien sur deux lignes', titresSurDeuxLignes > 0, titresSurDeuxLignes);
    await p.setViewportSize({ width: 1600, height: 950 });
    await p.waitForTimeout(500);
    const carte = await p.evaluate(() => Array.prototype.map.call(document.querySelectorAll('[data-corps="activite"] .ae-rep'), (t) => ({
      code: t.getAttribute('data-rep'), v: t.querySelector('.v').textContent.trim(), d: (t.querySelector('.d') || {}).textContent || '' })));

    /* --- fenetre de detail */
    await p.click('[data-activite="1"].tb-lien');
    await p.waitForFunction(() => Ext.ComponentQuery.query('window activiteequipes').some((c) => c.isVisible(true)), null, { timeout: 60000 });
    await p.waitForFunction(() => { const w = Ext.ComponentQuery.query('window activiteequipes')[0]; return w && w.getEl().dom.querySelectorAll('.ae-rep .v').length >= 4; }, null, { timeout: 120000 });
    await p.waitForTimeout(1500);
    const idFenetre = await p.evaluate(() => Ext.ComponentQuery.query('window activiteequipes')[0].getEl().dom.id);
    const detail = await p.evaluate((id) => Array.prototype.map.call(document.querySelectorAll('#' + id + ' .ae-rep'), (t) => ({
      code: t.getAttribute('data-rep'), v: t.querySelector('.v').textContent.trim(), d: (t.querySelector('.d') || {}).textContent || '' })), idFenetre);
    const communs = carte.filter((c) => detail.some((d) => d.code === c.code));
    const differents = communs.filter((c) => { const d = detail.find((x) => x.code === c.code); return d.v !== c.v || d.d.trim() !== c.d.trim(); });
    ok('rapprochement : reperes de la carte = reperes du detail (valeur et detail)', communs.length >= 4 && differents.length === 0,
      communs.length + ' communs ; ecarts ' + JSON.stringify(differents.map((c) => [c, detail.find((x) => x.code === c.code)])));
    const rsDetail = await rangees(p, '#' + idFenetre);
    ok('detail : valeurs d\'une rangee de reperes a la meme hauteur', rsDetail && rsDetail.length && ecart(rsDetail, 'v') <= 1, rsDetail ? 'ecart ' + ecart(rsDetail, 'v').toFixed(1) + ' px' : '');

    /* --- couleurs des cartes du detail (la fenetre ne montre que les analyses, lues a l'ouverture) */
    await p.waitForFunction(() => { const a = Ext.ComponentQuery.query('window activiteequipes')[0].analyses;
      return a && a.rendered && !(a.loadMask && a.loadMask.isVisible()) && a.getEl().dom.querySelectorAll('.ae-graphe').length > 3; }, null, { timeout: 180000 });
    await p.waitForTimeout(1500);
    const cartes = await p.evaluate((id) => Array.prototype.filter.call(document.querySelectorAll('#' + id + ' .ae-graphe'), (x) => x.offsetParent).map((x) => {
      const t = x.querySelector('.x-panel-header'), c = x.querySelector('.x-panel-body'), s = getComputedStyle(x);
      return { titre: (t ? t.textContent : '').trim().slice(0, 40), entete: t ? getComputedStyle(t).backgroundColor : '', corps: c ? getComputedStyle(c).backgroundColor : '',
        bordGauche: s.borderLeftWidth + ' ' + s.borderLeftColor, bordHaut: s.borderTopWidth + ' ' + s.borderTopColor };
    }), idFenetre);
    const blancs = cartes.filter((c) => /255, 255, 255/.test(c.corps) || /255, 255, 255/.test(c.entete) || c.corps === 'rgba(0, 0, 0, 0)');
    ok('detail : chaque carte a un fond doux (pas blanc)', cartes.length > 3 && blancs.length === 0, cartes.length + ' cartes ; blanches : ' + blancs.map((c) => c.titre).join(', '));
    const voisinsEgaux = cartes.filter((c, i) => i > 0 && c.corps === cartes[i - 1].corps);
    ok('detail : deux cartes voisines n\'ont pas le meme fond', voisinsEgaux.length === 0, voisinsEgaux.map((c) => c.titre + ' ' + c.corps).join(' ; '));
    const fonces = cartes.filter((c) => tsl(c.corps).l < 0.9 || tsl(c.entete).l < 0.9);
    ok('detail : fonds clairs (plus de 90 %)', fonces.length === 0, fonces.map((c) => c.titre + ' ' + c.corps + ' ' + c.entete).join(' ; '));
    const violets = cartes.filter((c) => [c.corps, c.entete].some((x) => { const v = tsl(x); return v.s > 0.15 && v.h >= 250 && v.h <= 320; }));
    ok('detail : aucun violet', violets.length === 0, violets.map((c) => c.titre + ' ' + c.corps).join(' ; '));
    const filets = cartes.filter((c) => c.bordGauche !== c.bordHaut);
    ok('detail : aucun filet de couleur a gauche', filets.length === 0, filets.map((c) => c.titre + ' ' + c.bordGauche + ' / ' + c.bordHaut).join(' ; '));
    console.log('fonds : ' + cartes.map((c) => c.titre.slice(0, 18) + '=' + c.corps).join(' | '));

    /* --- liste « CA attribue a » */
    await p.evaluate(() => { const c = Ext.ComponentQuery.query('window activiteequipes #aeTrancheAttribution')[0]; c.getEl().dom.scrollIntoView({ block: 'center' }); });
    await p.waitForTimeout(500);
    const choisi = await choisir(p, 'window activiteequipes #aeTrancheAttribution', /Conseil/);
    await p.waitForTimeout(1500);
    /* liste rouverte par sa fleche pour la mesurer, puis refermee */
    const fleche = await p.evaluate(() => { const c = Ext.ComponentQuery.query('window activiteequipes #aeTrancheAttribution')[0];
      const t = c.triggerEl && (c.triggerEl.first ? c.triggerEl.first() : c.triggerEl.item(0)); return t.dom.id; });
    await p.click('#' + fleche);
    await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('window activiteequipes #aeTrancheAttribution')[0]; return c.getPicker().isVisible(); }, null, { timeout: 10000 });
    await p.waitForTimeout(300);
    const liste = await p.evaluate(() => {
      const c = Ext.ComponentQuery.query('window activiteequipes #aeTrancheAttribution')[0], l = c.getPicker().getEl().dom;
      const items = Array.prototype.map.call(l.querySelectorAll('.x-boundlist-item'), (i) => ({ t: i.textContent.trim(), h: i.getBoundingClientRect().height,
        lh: parseFloat(getComputedStyle(i).lineHeight) || 16, pad: (parseFloat(getComputedStyle(i).paddingTop) || 0) + (parseFloat(getComputedStyle(i).paddingBottom) || 0)
          + (parseFloat(getComputedStyle(i).borderTopWidth) || 0) + (parseFloat(getComputedStyle(i).borderBottomWidth) || 0) }));
      const inp = c.inputEl.dom;
      return { items, valeur: inp.value, coupe: inp.scrollWidth > inp.clientWidth + 1, largeur: c.getWidth() };
    });
    await p.keyboard.press('Escape');
    const surDeux = liste.items.filter((i) => !(i.h > 0) || i.h - i.pad > i.lh * 1.5);
    ok('« CA attribue a » : chaque choix de la liste sur une ligne', liste.items.length === 3 && surDeux.length === 0,
      liste.items.map((i) => i.t + ' ' + Math.round(i.h) + ' px').join(' ; '));
    ok('« CA attribue a » : « ' + choisi + ' » se lit en entier dans le champ', /Conseil/.test(liste.valeur) && !liste.coupe, liste.valeur + ' ; coupe ' + liste.coupe + ' ; largeur ' + liste.largeur);
    ok('aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('deroulement du test', false, e.stack);
  } finally {
    await b.close();
  }
  const n = res.filter((r) => r.c).length;
  console.log('===== ' + n + '/' + res.length + (n === res.length ? ' PASS' : ' ECHEC') + ' =====');
  process.exit(n === res.length ? 0 : 1);
})();
