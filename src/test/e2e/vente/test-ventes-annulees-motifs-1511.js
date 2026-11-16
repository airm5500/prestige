/* PLAN DU 14/11, POINT 10 : VENTES ANNULEES (menu SERVICE CLIENT > Liste des ventes annulees).
 *  - on ne distinguait pas l'onglet actif (« Liste » / « Analyse par motif ») ;
 *  - trier par motif, les motifs les plus utilises d'abord ;
 *  - voir les caissieres concernees.
 *
 * Jeu d'essai : 5 ventes au comptant (quantites 1 a 5, montants differents), cloturees par l'API de l'ecran de vente,
 * puis annulees par l'API du bouton « Annuler.Vente » avec leur motif (preparation, ce n'est pas l'objet du test) :
 * 3 « Erreur de saisie », 1 « Erreur client », 1 « Confusion de produit » ; caissiere : 3 ventes a l'utilisateur
 * d'essai, 2 a un autre utilisateur.
 * Parcours de l'ecran : menu, puis :
 *  - onglet actif visible (fond fonce, texte blanc), l'autre clair ; idem apres passage a l'autre onglet ;
 *  - colonne « Motif » : chaque vente d'essai montre son motif = base ;
 *  - liste des motifs : du plus utilise au moins utilise, nombres = base (annulations du jour) ;
 *  - choix « Erreur de saisie » : exactement les ventes de ce motif en base, total = base ;
 *  - tri « motifs les plus utilises » : un bloc par motif, dans l'ordre des nombres ; aucune vente perdue ;
 *  - onglet « Analyse par motif », tableau « Par caissiere » : une ligne par caissiere, nombres = base, somme = total.
 * Tout le jeu d'essai est retire (ventes, annulations, motifs), stocks remis.
 * Lancement seul : node src/test/e2e/vente/test-ventes-annulees-motifs-1511.js
 */
const C = require('../audits/commun');
const V = require('../outils/vues');
const { ok, q, ADMIN, AUTRE_VENDEUR } = C;

const AUJ = new Date();
const jj = (d) => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const lignes = (s) => s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => l.split('\t'));

(async () => {
  C.ouvrirCaisse();
  const P = C.produit(10, 300);
  const sess = await C.connecter();
  const { p, api } = sess;
  try {
    const VC = C.venteComptant(api);
    const PLAN = [
      { qte: 1, motif: 'MVA_SAISIE', caissier: ADMIN }, { qte: 2, motif: 'MVA_CLIENT', caissier: AUTRE_VENDEUR },
      { qte: 3, motif: 'MVA_SAISIE', caissier: AUTRE_VENDEUR }, { qte: 4, motif: 'MVA_PRODUIT', caissier: ADMIN },
      { qte: 5, motif: 'MVA_SAISIE', caissier: ADMIN },
    ];
    for (const x of PLAN) {
      x.v = await VC.vendre(P, x.qte);
      q(`UPDATE t_preenregistrement SET lg_USER_CAISSIER_ID = '${x.caissier}' WHERE lg_PREENREGISTREMENT_ID = '${x.v}'`);
      const r = await api('POST', '../api/v1/vente-motifs/annulation/' + x.v, { motifId: x.motif, commentaire: '' });
      x.annulee = !!r.success;
      x.ref = q(`SELECT str_REF FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${x.v}'`);
    }
    ok('Précondition : 5 ventes annulées avec leur motif, montants différents', PLAN.every((x) => x.annulee)
      && Number(q(`SELECT COUNT(DISTINCT int_PRICE) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN ('${PLAN.map((x) => x.v).join("','")}')`)) === 5,
      PLAN.map((x) => x.qte + ':' + x.annulee).join(' '));

    /* base : annulations du jour avec motif */
    const J = iso(AUJ);
    const baseMotifs = lignes(q(`SELECT motif_libelle, COUNT(*) FROM vente_motif WHERE type_operation = 'ANNULATION' AND statut = 'VALIDEE'
      AND created_at >= '${J}' AND created_at < '${J}' + INTERVAL 1 DAY GROUP BY motif_libelle ORDER BY COUNT(*) DESC, motif_libelle`))
      .map(([m, n]) => ({ m, n: Number(n) }));
    const baseCaissiers = lignes(q(`SELECT COALESCE(caissier_id, ''), COUNT(*) FROM vente_motif WHERE statut = 'VALIDEE'
      AND created_at >= '${J}' AND created_at < '${J}' + INTERVAL 1 DAY GROUP BY 1`)).map(([c, n]) => ({ c, n: Number(n) }));
    const motifDe = {};
    lignes(q(`SELECT vente_id, motif_libelle FROM vente_motif WHERE type_operation = 'ANNULATION' AND statut = 'VALIDEE'
      AND vente_id IN ('${PLAN.map((x) => x.v).join("','")}')`)).forEach(([v, m]) => { motifDe[v] = m; });

    await V.ouvrirMenu(p, 'SERVICE CLIENT', 'Liste des ventes annulées');
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('venteannuler gridpanel')[0]; return g && g.isVisible(true) && !g.getStore().isLoading(); }, null, { timeout: 60000 });
    await p.mouse.move(1000, 600);
    await p.mouse.click(1200, 880);
    await p.waitForTimeout(1200);

    /* onglet actif */
    const styles = () => p.evaluate(() => ['#ongletListe', '#ongletAnalyse'].map((s) => {
      const b = Ext.ComponentQuery.query('venteannuler ' + s)[0].getEl().dom, t = b.querySelector('.x-btn-inner');
      return { fond: getComputedStyle(b).backgroundColor, texte: getComputedStyle(t).color };
    }));
    const fonce = (c) => { const m = c.match(/\d+/g).map(Number); return m[0] + m[1] + m[2] < 300; };
    let s = await styles();
    ok('Onglet « Liste » actif : fond foncé et texte blanc ; « Analyse » clair', fonce(s[0].fond) && /255, 255, 255/.test(s[0].texte) && !fonce(s[1].fond), JSON.stringify(s));

    /* liste du jour, page de 15 au plus : nos ventes portent leur motif */
    const lire = () => p.evaluate(() => Ext.ComponentQuery.query('venteannuler gridpanel')[0].getStore().getRange()
      .map((r) => ({ id: r.get('lgPREENREGISTREMENTID'), motif: (r.raw && r.raw.motif) || '', prix: r.get('intPRICE') })));
    const attendreListe = () => p.waitForFunction(() => !Ext.ComponentQuery.query('venteannuler gridpanel')[0].getStore().isLoading(), null, { timeout: 60000 });
    await V.saisir(p, 'venteannuler #query', '');
    await V.cliquer(p, 'venteannuler #rechercher');
    await p.waitForTimeout(800);
    await attendreListe();
    const total = await p.evaluate(() => Ext.ComponentQuery.query('venteannuler gridpanel')[0].getStore().getTotalCount());
    /* colonne motif, a l'ecran : texte des cellules de nos lignes */
    const cellules = await p.evaluate((ids) => { const g = Ext.ComponentQuery.query('venteannuler gridpanel')[0], col = g.down('#colonneMotif');
      return ids.map((id) => { const i = g.getStore().findExact('lgPREENREGISTREMENTID', id); if (i < 0) { return null; }
        const n = g.getView().getNode(i); const k = g.headerCt.getGridColumns().indexOf(col); const td = n ? n.querySelectorAll('td.x-grid-cell')[k] : null; return td ? td.innerText.trim() : null; }); }, PLAN.map((x) => x.v));
    const absentes = cellules.filter((c) => c === null).length;
    ok('Colonne « Motif » : chaque vente d\'essai affichée montre son motif = base', cellules.every((c, i) => c === null || c === motifDe[PLAN[i].v]) && absentes < PLAN.length,
      cellules.map((c, i) => (c === null ? 'hors page' : c) + '/' + motifDe[PLAN[i].v]).join(' | '));

    /* liste des motifs : ordre et nombres = base */
    await p.waitForTimeout(1500);
    const options = await p.evaluate(() => Ext.ComponentQuery.query('venteannuler #motifFiltre')[0].getStore().getRange().map((r) => r.get('t')));
    const attenduOptions = ['Tous les motifs'].concat(baseMotifs.map((x) => x.m + ' (' + x.n + ')'));
    ok('Liste des motifs : du plus utilisé au moins utilisé, nombres = base', JSON.stringify(options) === JSON.stringify(attenduOptions),
      'écran ' + options.join(', ') + ' / base ' + attenduOptions.join(', '));

    /* filtre « Erreur de saisie » */
    await V.choisir(p, 'venteannuler #motifFiltre', /^Erreur de saisie/);
    await p.waitForTimeout(800);
    await attendreListe();
    const filtre = await p.evaluate(() => { const st = Ext.ComponentQuery.query('venteannuler gridpanel')[0].getStore();
      return { total: st.getTotalCount(), motifs: st.getRange().map((r) => (r.raw && r.raw.motif) || '') }; });
    const nSaisie = (baseMotifs.find((x) => x.m === 'Erreur de saisie') || { n: 0 }).n;
    ok('Filtre « Erreur de saisie » : nombre = base, toutes les lignes de ce motif', filtre.total === nSaisie && filtre.motifs.every((m) => m === 'Erreur de saisie'),
      filtre.total + ' / ' + nSaisie + ' ; ' + filtre.motifs.join(','));
    ok('Filtre : nos 3 ventes « Erreur de saisie » y sont', PLAN.filter((x) => x.motif === 'MVA_SAISIE').length === 3 && filtre.total >= 3);

    /* tri par motif, sans filtre */
    await V.choisir(p, 'venteannuler #motifFiltre', 'Tous les motifs');
    await p.waitForTimeout(500);
    await V.choisir(p, 'venteannuler #triAnnulees', 'Tri : motifs les plus utilisés');
    await p.waitForTimeout(800);
    await attendreListe();
    const trie = await lire();
    const totalTrie = await p.evaluate(() => Ext.ComponentQuery.query('venteannuler gridpanel')[0].getStore().getTotalCount());
    const rang = {}; baseMotifs.forEach((x, i) => { rang[x.m] = i; });
    const r = trie.map((x) => (x.motif ? rang[x.motif] : 999));
    ok('Tri : motifs les plus utilisés d\'abord, ventes sans motif à la fin (page 1)', r.every((v, i) => i === 0 || r[i - 1] <= v), trie.map((x) => x.motif || '—').join(', '));
    ok('Tri : aucune vente perdue (même total qu\'avant le tri)', totalTrie === total, totalTrie + ' / ' + total);

    /* onglet Analyse : tableau par caissiere */
    await V.cliquer(p, 'venteannuler #ongletAnalyse');
    await p.waitForFunction(() => !!document.querySelector('.va-par-caissier'), null, { timeout: 60000 });
    s = await styles();
    ok('Onglet « Analyse » actif : fond foncé ; « Liste » clair', fonce(s[1].fond) && !fonce(s[0].fond), JSON.stringify(s));
    const tab = await p.evaluate(() => Array.from(document.querySelectorAll('.va-par-caissier tbody tr')).map((tr) => Array.from(tr.cells).map((c) => c.innerText.trim())));
    const nomDe = (id) => (id ? q(`SELECT CONCAT_WS(' ', str_FIRST_NAME, str_LAST_NAME) FROM t_user WHERE lg_USER_ID = '${id}'`) : 'Inconnu');
    const attenduCaisse = baseCaissiers.map((x) => ({ nom: nomDe(x.c), n: x.n })).sort((a, b) => b.n - a.n || a.nom.localeCompare(b.nom));
    const vu = tab.map((l) => ({ nom: l[0], n: Number(l[3].replace(/\D/g, '')) }));
    ok('Analyse « Par caissière » : une ligne par caissière, nombres = base', JSON.stringify(vu.map((x) => x.nom + ':' + x.n).sort()) === JSON.stringify(attenduCaisse.map((x) => x.nom + ':' + x.n).sort()),
      'écran ' + JSON.stringify(vu) + ' / base ' + JSON.stringify(attenduCaisse));
    ok('Analyse « Par caissière » : du plus grand nombre au plus petit', vu.every((x, i) => i === 0 || vu[i - 1].n >= x.n), JSON.stringify(vu));
    const somme = vu.reduce((t, x) => t + x.n, 0);
    ok('Analyse « Par caissière » : somme = total des opérations du jour', somme === baseCaissiers.reduce((t, x) => t + x.n, 0), somme);
    ok('Aucune erreur JavaScript à l\'écran', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } catch (e) {
    ok('Déroulé sans exception', false, e.stack);
  } finally {
    await sess.b.close().catch(() => {});
    C.nettoyer();
    process.exit(C.bilan() ? 1 : 0);
  }
})();
