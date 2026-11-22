/* PLAN DU 21/11, POINTS 1.3 ET 3 : BARRES DE FILTRES SUR DEUX LIGNES.
 *
 * Trois écrans avaient une barre d'outils trop longue : à 1366 ou à 1280, des boutons sortaient de l'écran ou les
 * champs se tassaient au point de couper leur texte. Chaque barre passe sur deux lignes : les filtres au-dessus, les
 * actions (impression, export, enregistrement) en dessous.
 *  - « Etat de contrôle Achats » (GESTION DES COMMANDES) : filtres / Imprimer, Excel, Inventaire ;
 *  - son onglet « Règlements fournisseurs » : saisie (Grossiste, Montant, Date / Mode, Référence, Enregistrer) et
 *    historique (Du, au, grossiste, Rechercher / Relevé, Annuler le règlement) ;
 *  - « Bons par organisme » (GESTION COURANTE) : dates, heures, recherche / tiers payant, type, groupe, Imprimer.
 *
 * Vrai chemin : connexion par le formulaire, écrans ouverts par le menu, onglets cliqués. Mesures à 1366×768,
 * 1280×720 et 1920×1080 :
 *  - aucun élément d'une barre ne dépasse la barre (rien de coupé, rien hors de l'écran) ;
 *  - chaque champ garde une zone de saisie d'au moins 80 px et son libellé entier ;
 *  - les filtres sont sur une ligne au-dessus des actions ;
 *  - aucune erreur JavaScript ;
 *  - bilan : simple consultation, rien n'est écrit (BL, règlements, ventes, paramètres).
 * Lancement seul : node src/test/e2e/ergonomie/test-barres-deux-lignes-2111.js
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 600) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\r/g, '').trim();

const TAILLES = [[1366, 768], [1280, 720], [1920, 1080]];
/* empreinte des tables que ces écrans pourraient toucher */
const empreinte = () => q("SELECT CONCAT_WS('|', (SELECT MD5(GROUP_CONCAT(CONCAT_WS('#', lg_BON_LIVRAISON_ID, IFNULL(int_MONTANT_REGLE, '-'), IFNULL(STATUS, '-')) ORDER BY lg_BON_LIVRAISON_ID)) FROM t_bon_livraison),"
  + " (SELECT COUNT(*) FROM reglement_fournisseur_bl), (SELECT COUNT(*) FROM t_preenregistrement_compte_client_tiers_payent),"
  + " (SELECT MD5(GROUP_CONCAT(CONCAT(str_KEY, '=', IFNULL(str_VALUE, '')) ORDER BY str_KEY)) FROM t_parameters))");

/* mesure des barres visibles d'un écran : éléments qui dépassent, champs trop étroits ou libellés coupés */
const mesurer = (p, ecran) => p.evaluate((e) => {
  const racine = Ext.ComponentQuery.query(e).filter((c) => c.isVisible(true))[0];
  if (!racine) { return { absent: true }; }
  const barres = Ext.ComponentQuery.query('toolbar', racine).filter((t) => t.isVisible(true) && t.dock && !t.isXType('pagingtoolbar'));
  const defauts = [];
  barres.forEach((t) => {
    const rb = t.getEl().dom.getBoundingClientRect();
    t.items.each((it) => {
      if (!it.isVisible(true) || it.isXType('tbfill') || it.isXType('tbspacer') || it.isXType('tbseparator')) { return; }
      const r = it.getEl().dom.getBoundingClientRect();
      const nom = it.itemId || it.id;
      if (r.right > rb.right + 1 || r.left < rb.left - 1 || r.right > window.innerWidth + 1) { defauts.push(nom + ' dépasse (' + Math.round(r.right) + ' > ' + Math.round(rb.right) + ')'); }
      if (it.inputEl && it.inputEl.dom) {
        const w = it.inputEl.dom.getBoundingClientRect().width;
        if (w < 80) { defauts.push(nom + ' saisie ' + Math.round(w) + ' px'); }
      }
      if (it.labelEl && it.labelEl.dom && it.fieldLabel && it.labelEl.dom.scrollWidth > it.labelEl.dom.clientWidth + 1) { defauts.push(nom + ' libellé coupé'); }
      if (it.btnInnerEl && it.btnInnerEl.dom && it.btnInnerEl.dom.scrollWidth > it.btnInnerEl.dom.clientWidth + 1) { defauts.push(nom + ' texte du bouton coupé'); }
    });
    const ct = t.layout && t.layout.innerCt && t.layout.innerCt.dom;
    if (ct && ct.scrollWidth > ct.clientWidth + 1) { defauts.push((t.itemId || t.id) + ' défile'); }
  });
  return { barres: barres.length, defauts };
}, ecran);

/* les filtres (premier sélecteur) sont sur une barre au-dessus de celle des actions (second sélecteur) */
const ordre = (p, ecran, filtre, action) => p.evaluate(([e, f, a]) => {
  const racine = Ext.ComponentQuery.query(e).filter((c) => c.isVisible(true))[0];
  const barre = (s) => { const c = Ext.ComponentQuery.query(s, racine).filter((x) => x.isVisible(true))[0]; const t = c && c.up('toolbar'); return t ? t.getEl().dom.getBoundingClientRect().top : null; };
  const hf = barre(f), ha = barre(a);
  return { filtres: hf, actions: ha, ok: hf !== null && ha !== null && hf < ha };
}, [ecran, filtre, action]);

(async () => {
  const empreinte0 = empreinte();
  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const attendre = (sel) => p.waitForFunction((s) => Ext.ComponentQuery.query(s).some((c) => c.isVisible(true)), sel, { timeout: 90000 }).then(() => p.waitForTimeout(800));
  const taille = async (l, h) => { await p.setViewportSize({ width: l, height: h }); await p.waitForTimeout(900); };
  const sousOnglet = async (id) => { await p.click('#' + await p.evaluate((i) => Ext.ComponentQuery.query('#' + i)[0].tab.getId(), id)); await p.waitForTimeout(700); };
  const controler = async (titre, ecran, filtre, action) => {
    for (const [l, h] of TAILLES) {
      await taille(l, h);
      const m = await mesurer(p, ecran);
      ok(titre + ' à ' + l + '×' + h + ' : rien ne dépasse, champs lisibles', !m.absent && m.barres > 0 && m.defauts.length === 0, JSON.stringify(m));
      if (filtre) {
        const o = await ordre(p, ecran, filtre, action);
        ok(titre + ' à ' + l + '×' + h + ' : filtres au-dessus des actions', o.ok, JSON.stringify(o));
      }
    }
    await taille(1366, 768);
  };
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');

    await ouvrirMenu(p, 'GESTION DES COMMANDES', 'Etat de contrôle Achats');
    await p.mouse.move(1200, 700);
    await attendre('etatscontrolemanager');
    await controler('Etat de contrôle Achats', 'etatscontrolemanager', '#dateType', 'button[text=Imprimer]');

    await cliquer(p, 'controleachats button[itemId=ca-reglements]');
    await attendre('#rfARegler');
    /* saisie : premier grossiste de la liste ouvert d'un double clic */
    const lignes = await p.evaluate(() => Ext.ComponentQuery.query('#rfARegler')[0].getStore().getCount());
    if (lignes > 0) {
      const vue = await p.evaluate(() => Ext.ComponentQuery.query('#rfARegler')[0].getView().getId());
      await p.locator('#' + vue + ' .x-grid-row').first().dblclick();
      await attendre('#rfSaisir');
      await controler('Règlements fournisseurs, saisie', 'reglementsfournisseurs', '#rfMontant', '#rfEnregistrer');
    } else {
      await sousOnglet('rfSaisir');
      await controler('Règlements fournisseurs, saisie', 'reglementsfournisseurs', '#rfMontant', '#rfEnregistrer');
    }
    await sousOnglet('rfHistorique');
    await controler('Règlements fournisseurs, historique', 'reglementsfournisseurs', '#rfDu', '#rfAnnuler');

    await ouvrirMenu(p, 'GESTION COURANTE', 'Bons par organisme');
    await p.mouse.move(1200, 700);
    await attendre('facturesubrogatoireother');
    await controler('Bons par organisme', 'facturesubrogatoireother', '#dtStart', '#printable');

    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack || e.message);
  } finally {
    await b.close();
  }
  const empreinte1 = empreinte();
  ok('Bilan : simple consultation, rien n\'est écrit (BL, règlements, bons, paramètres)', empreinte0 === empreinte1, empreinte0 + ' / ' + empreinte1);
  const n = res.filter((r) => r.c).length;
  console.log('\n' + n + '/' + res.length + (n === res.length ? ' OK' : ' ECHEC'));
  process.exit(n === res.length ? 0 : 1);
})();
