/* RETOUR DU 15/11 (annulations de vente) : « quelle différence entre "Par auteur de la vente d'origine" et "Par
 * caissière de la vente d'origine" ? moi je veux savoir quelle caissière occasionne le plus d'annulations ».
 *
 * Jeu d'essai (préparation, ce n'est pas l'objet du test) : 6 ventes au comptant clôturées par l'API de l'écran de
 * vente, quantités 1 à 6 (montants différents) ; 5 annulées par l'API du bouton « Annuler.Vente » avec leur motif :
 * caissière A (utilisateur d'essai) 3 annulations, caissière B (autre utilisateur) 2 annulations + 1 vente gardée.
 * Parcours de l'écran : menu SERVICE CLIENT › Liste des ventes annulées, onglet « Analyse par motif » (clic).
 * Contrôles :
 *  - tableau « Caissières : qui occasionne le plus d'annulations » : une ligne par caissière ayant annulé, annulations,
 *    ventes encaissées, taux (= annulations / ventes, au dixième) et montant annulé = base, ligne par ligne ;
 *  - ordre : le plus d'annulations d'abord ; rang affiché ; A (3) avant B (2) ;
 *  - rapprochement dans l'écran : annulations de chaque caissière = colonne « Annulations » du tableau « Par
 *    caissière » ; somme = total des annulations (pied du tableau « Par motif ») ;
 *  - les trois explications (classement, auteur, caissière) sont affichées.
 * Tout le jeu d'essai est retiré (ventes, annulations, motifs), stocks remis.
 */
const C = require('../audits/commun');
const V = require('../outils/vues');
const { ok, q, ADMIN, AUTRE_VENDEUR } = C;

const AUJ = new Date();
const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const lignes = (s) => s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => l.split('\t'));
const chiffres = (s) => Number(String(s).replace(/[^0-9]/g, '') || 0);

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
      { qte: 5, motif: 'MVA_SAISIE', caissier: ADMIN }, { qte: 6, motif: null, caissier: AUTRE_VENDEUR },
    ];
    for (const x of PLAN) {
      x.v = await VC.vendre(P, x.qte);
      q(`UPDATE t_preenregistrement SET lg_USER_CAISSIER_ID = '${x.caissier}' WHERE lg_PREENREGISTREMENT_ID = '${x.v}'`);
      if (x.motif) {
        const r = await api('POST', '../api/v1/vente-motifs/annulation/' + x.v, { motifId: x.motif, commentaire: '' });
        x.annulee = !!r.success;
      }
    }
    ok('Précondition : 5 ventes annulées avec motif, 1 gardée, montants différents', PLAN.filter((x) => x.annulee).length === 5
      && Number(q(`SELECT COUNT(DISTINCT int_PRICE) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN ('${PLAN.map((x) => x.v).join("','")}')`)) === 6);

    /* base : annulations du jour (motif valide) par caissiere de la vente d'origine, et ventes encaissees du jour */
    const J = iso(AUJ);
    const annul = lignes(q(`SELECT COALESCE(m.caissier_id, ''), COUNT(*), SUM(m.montant) FROM vente_motif m WHERE m.type_operation = 'ANNULATION'
      AND m.statut = 'VALIDEE' AND m.created_at >= '${J}' AND m.created_at < '${J}' + INTERVAL 1 DAY GROUP BY 1`));
    const ventes = {};
    lignes(q(`SELECT p.lg_USER_CAISSIER_ID, COUNT(*) FROM t_preenregistrement p WHERE p.str_STATUT = 'is_Closed' AND p.int_PRICE > 0
      AND p.lg_TYPE_VENTE_ID IN ('1', '2', '3') AND COALESCE(p.completion_date, p.dt_UPDATED) >= '${J}' AND COALESCE(p.completion_date, p.dt_UPDATED) < '${J}' + INTERVAL 1 DAY
      AND p.lg_USER_CAISSIER_ID IS NOT NULL AND NOT EXISTS (SELECT 1 FROM vente_modifiee vm WHERE vm.vente_origine_id = p.lg_PREENREGISTREMENT_ID)
      GROUP BY 1`)).forEach(([c, n]) => { ventes[c] = Number(n); });
    const nomDe = (id) => (id ? q(`SELECT CONCAT_WS(' ', str_FIRST_NAME, str_LAST_NAME) FROM t_user WHERE lg_USER_ID = '${id}'`) : 'Inconnu');
    const attendu = annul.map(([c, n, m]) => { const v = c ? (ventes[c] || 0) : 0;
      return { id: c, nom: nomDe(c), n: Number(n), m: Number(m), v, t: v ? Math.round(1000 * Number(n) / v) / 10 : null }; })
      .sort((a, b) => b.n - a.n || (b.t === null ? -1 : b.t) - (a.t === null ? -1 : a.t) || b.m - a.m || a.nom.localeCompare(b.nom));
    attendu.forEach((x, i) => { x.rang = i > 0 && attendu[i - 1].n === x.n ? attendu[i - 1].rang : i + 1; });

    await V.ouvrirMenu(p, 'SERVICE CLIENT', 'Liste des ventes annulées');
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('venteannuler gridpanel')[0]; return g && g.isVisible(true) && !g.getStore().isLoading(); }, null, { timeout: 60000 });
    await V.cliquer(p, 'venteannuler #ongletAnalyse');
    await p.waitForFunction(() => !!document.querySelector('.va-classement-caissieres'), null, { timeout: 60000 });
    const lire = (sel) => p.evaluate((s) => Array.from(document.querySelectorAll(s + ' tbody tr')).map((tr) => Array.from(tr.cells).map((c) => c.innerText.trim())), sel);
    const cl = await lire('.va-classement-caissieres');
    const vu = cl.map((l) => ({ rang: Number(l[0]), nom: l[1], n: chiffres(l[2]), v: l[3] === '—' ? 0 : chiffres(l[3]), t: l[4] === '—' ? null : Number(l[4].replace(/[%\s ]/g, '').replace(',', '.')), m: chiffres(l[5]) }));
    const fmt = (x) => [x.rang, x.nom, x.n, x.v, x.t, x.m].join('|');
    ok('Classement = base, ligne par ligne et dans l\'ordre (rang, caissière, annulations, ventes encaissées, taux, montant)', JSON.stringify(vu.map(fmt)) === JSON.stringify(attendu.map(fmt)),
      'écran ' + JSON.stringify(vu.map(fmt)) + ' / base ' + JSON.stringify(attendu.map(fmt)));
    const nomA = nomDe(ADMIN), nomB = nomDe(AUTRE_VENDEUR);
    const ia = vu.findIndex((x) => x.nom === nomA), ib = vu.findIndex((x) => x.nom === nomB);
    ok('Caissière A (au moins 3 annulations) classée avant B, dont 2 annulations sur au moins 3 ventes', ia >= 0 && ib >= 0 && (vu[ia].n > vu[ib].n ? ia < ib : true)
      && vu[ia].n >= 3 && vu[ib].n >= 2 && vu[ib].v >= 3, JSON.stringify([vu[ia], vu[ib]]));
    ok('Ordre : le plus d\'annulations d\'abord, rangs croissants', vu.every((x, i) => i === 0 || (vu[i - 1].n >= x.n && vu[i - 1].rang <= x.rang)));
    ok('Taux = annulations / ventes encaissées, au dixième, jamais négatif', vu.every((x) => x.v === 0 ? x.t === null : x.t === Math.round(1000 * x.n / x.v) / 10 && x.t >= 0));
    /* rapprochement dans l'ecran */
    const pc = await lire('.va-par-caissier');
    ok('Rapprochement : annulations de chaque caissière = colonne « Annulations » du tableau « Par caissière »', vu.every((x) => { const l = pc.find((r) => r[0] === x.nom); return l && chiffres(l[1]) === x.n; })
      && pc.filter((r) => chiffres(r[1]) > 0).length === vu.length, JSON.stringify(pc));
    const pied = await p.evaluate(() => Array.from(document.querySelectorAll('.va-par-motif tfoot th')).map((c) => c.innerText.trim()));
    ok('Rapprochement : somme des annulations du classement = total des annulations (pied « Par motif »)', vu.reduce((s, x) => s + x.n, 0) === chiffres(pied[1]), pied.join(' | '));
    const notes = await p.evaluate(() => Array.from(document.querySelectorAll('.va-analyse-note')).map((n) => n.innerText));
    ok('Explications affichées : classement (encaissé, taux), auteur (saisi), caissière (encaissé)', notes.length === 3 && /encaissé/.test(notes[0]) && /taux/i.test(notes[0])
      && /saisi/.test(notes[1]) && /encaissé/.test(notes[2]), JSON.stringify(notes));
    const ordreBlocs = await p.evaluate(() => Array.from(document.querySelectorAll('.va-analyse-titre')).map((h) => h.innerText));
    ok('Le classement suit « Par motif » et précède « Par auteur »', ordreBlocs[0] === 'Par motif' && /qui occasionne le plus d'annulations/.test(ordreBlocs[1]) && /auteur/.test(ordreBlocs[2]), ordreBlocs.join(' / '));
    ok('Aucune erreur JavaScript à l\'écran', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } catch (e) {
    ok('Déroulé sans exception', false, e.stack);
  } finally {
    await sess.b.close().catch(() => {});
    C.nettoyer();
    process.exit(C.bilan() ? 1 : 0);
  }
})();
