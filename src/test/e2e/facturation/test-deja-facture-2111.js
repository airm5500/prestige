/* FACTURES : « DÉJÀ FACTURÉ ? » (plan du 21/11, point 9).
 *
 * Jeu d'essai (retire a la fin, compteur des numeros de facture remis) : organismes A et B ; client X assure chez A,
 * client Y chez B ; ventes assurance closes, quantites 1 a 3 (montants differents) :
 *   X1, X2 : dans la facture FA1 de A (definitive)                      -> « Facture FA1 »
 *   X3     : dans la facture FA2 de A, annulee par avoir (statut avoir,  -> « Non facturé », FA2 annulee mentionnee
 *            bon libere, comme apres un avoir FNE)
 *   X4     : jamais facture                                             -> « Non facturé », sans mention
 *   Y1     : dans la facture FB de B                                    -> « Facture FB »
 * Par l'ecran (menu Facturation > Factures), a 1366×768, 1280×720 et 1920×1080 : bouton « Déjà facturé ? » dans la
 * barre et dans l'ecran ; il ouvre le panneau, curseur dans le champ.
 * A 1366×768 :
 *  - matricule de X + Entree : X1 a X4 (et rien de Y). Rapprochement ligne par ligne avec la base : numero de bon,
 *    montant de la part tiers payant, date de vente, organisme, facture (numero, date) ou « Non facturé » ;
 *  - nom de X, mots inverses et en minuscules : memes bons ;
 *  - numero de bon X3 : une seule ligne, « Non facturé », FA2 mentionnee comme annulee ;
 *  - numero de bon Y1 : la facture FB ;
 *  - un clic sur « Facture FA1 » ouvre la facture : le bon X1 y est, avec le meme montant ;
 *  - saisie d'un caractere : message, rien n'est cherche ; saisie inconnue : « Aucun bon trouvé ».
 * Bilan : la recherche n'ecrit rien (factures, details, statuts des bons identiques avant / apres).
 */
const C = require('../audits/commun');
const V = require('../outils/vues');
const { ok, q, exec, MARQUE } = C;
const FORM = { 'Content-Type': 'application/x-www-form-urlencoded' };
const TAILLES = [[1366, 768], [1280, 720], [1920, 1080]];

(async () => {
  C.ouvrirCaisse();
  const compteur = q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_CODE_FACTURE'");
  C.etat.restaurations.push("UPDATE t_parameters SET str_VALUE = '" + compteur + "' WHERE str_KEY = 'KEY_CODE_FACTURE'");
  const P = C.produit(8, 500, "AND f.lg_CODE_TVA_ID IN (SELECT lg_CODE_TVA_ID FROM t_code_tva WHERE int_VALUE = 0)");
  const sess = await C.connecter();
  const { p, api } = sess;
  const VO = C.venteAssurance(api);
  const jour = q('SELECT CURDATE()');
  const bonDe = (v) => q("SELECT lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID = '" + v + "'");
  const definitive = (tp, bons) => api('POST', '../api/v1/groupe-tierspayant/facturation-bons', { MODE_SELECTION: '2', lg_TIERS_PAYANT_ID: tp, unselectedrecords: '[]',
    listProductSelected: JSON.stringify(bons), dt_start: jour, dt_end: jour }, FORM);
  const factureDe = (b) => q("SELECT IFNULL(MAX(f.lg_FACTURE_ID), '') FROM t_facture_detail d JOIN t_facture f ON f.lg_FACTURE_ID = d.lg_FACTURE_ID WHERE d.str_REF = '" + b + "'");
  /* base : un bon tel que l'ecran doit l'afficher */
  const enBase = (b) => {
    const c = q("SELECT CONCAT_WS('|', COALESCE(NULLIF(t.str_REF_BON, ''), v.str_REF_BON), t.int_PRICE, DATE_FORMAT(v.dt_UPDATED, '%d/%m/%Y'), tp.str_FULLNAME,"
      + " IFNULL((SELECT CONCAT(f.str_CODE_FACTURE, ' du ', DATE_FORMAT(f.dt_DATE_FACTURE, '%d/%m/%Y')) FROM t_facture_detail d JOIN t_facture f ON f.lg_FACTURE_ID = d.lg_FACTURE_ID"
      + "   WHERE d.str_REF = t.lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID AND COALESCE(f.template, 0) = 0 AND f.str_STATUT NOT IN ('avoir', 'delete') ORDER BY f.dt_CREATED DESC LIMIT 1), 'NON'),"
      + " IFNULL((SELECT GROUP_CONCAT(f.str_CODE_FACTURE) FROM t_facture_detail d JOIN t_facture f ON f.lg_FACTURE_ID = d.lg_FACTURE_ID"
      + "   WHERE d.str_REF = t.lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID AND f.str_STATUT IN ('avoir', 'delete')), ''))"
      + " FROM t_preenregistrement_compte_client_tiers_payent t JOIN t_preenregistrement v ON v.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID"
      + " JOIN t_compte_client_tiers_payant l ON l.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = t.lg_COMPTE_CLIENT_TIERS_PAYANT_ID JOIN t_tiers_payant tp ON tp.lg_TIERS_PAYANT_ID = l.lg_TIERS_PAYANT_ID"
      + " WHERE t.lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID = '" + b + "'").split('|');
    return { bon: c[0], montant: Number(c[1]), date: c[2], organisme: c[3], facture: c[4], annulees: c[5] };
  };
  const traces = (bons) => q("SELECT CONCAT((SELECT COUNT(*) FROM t_facture), '/', (SELECT COUNT(*) FROM t_facture_detail), '/',"
    + " (SELECT GROUP_CONCAT(str_STATUT_FACTURE ORDER BY lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID) FROM t_preenregistrement_compte_client_tiers_payent"
    + " WHERE lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID IN (" + bons.map((b) => "'" + b + "'").join(',') + ")))");

  /* ecran : panneau, recherche, lignes affichees */
  const panneau = () => p.evaluate(() => { const g = Ext.ComponentQuery.query('facturemanager')[0], x = g.down('#panneauDejaFacture'), b = g.down('#btnDejaFacture');
    const r = (c) => c.getEl().dom.getBoundingClientRect();
    return { bouton: !!b && b.isVisible(true) && r(b).right <= window.innerWidth + 1 && r(b).width > 40, panneau: !!x && x.isVisible(true),
      focus: !!x && x.down('#dfRecherche').inputEl.dom === document.activeElement }; });
  const chercher = async (texte) => {
    const id = await p.evaluate(() => Ext.ComponentQuery.query('facturemanager #dfRecherche')[0].inputEl.id);
    await p.click('#' + id, { clickCount: 3 });
    await p.keyboard.press('Control+A');
    await p.keyboard.type(texte, { delay: 15 });
    const rep = texte.trim().length >= 2 ? p.waitForResponse((r) => r.url().includes('facture-tiers-payant/deja-facture'), { timeout: 60000 }) : null;
    await p.keyboard.press('Enter');
    const json = rep ? await (await rep).json() : null;
    await p.waitForTimeout(700);
    const ecran = await p.evaluate(() => { const g = Ext.ComponentQuery.query('facturemanager #dfResultats')[0], v = g.getView();
      return { etat: Ext.ComponentQuery.query('facturemanager #dfEtat')[0].getEl().dom.textContent.trim(),
        lignes: g.getStore().getRange().map((r, i) => ({ id: r.get('id'), bon: r.get('bon'), montant: r.get('montant'), date: r.get('dateVente'), organisme: r.get('organisme'),
          texte: v.getNode(i) ? v.getNode(i).textContent.replace(/\s+/g, ' ').trim() : '' })) }; });
    return { json, ecran };
  };
  const conforme = (ligne, b) => {
    const base = enBase(b);
    const factureOk = base.facture === 'NON' ? /Non facturé/.test(ligne.texte) : ligne.texte.includes('Facture ' + base.facture);
    const annuleesOk = base.annulees ? base.annulees.split(',').every((c) => ligne.texte.includes('facture ' + c) && /annulée/.test(ligne.texte)) : !/annulée/.test(ligne.texte);
    return { ok: ligne.bon === base.bon && ligne.montant === base.montant && ligne.date === base.date && ligne.organisme === base.organisme && factureOk && annuleesOk,
      ecran: ligne, base };
  };

  try {
    /* ---- jeu d'essai ---- */
    const A = C.tiersPayant('DFA', '1'), B = C.tiersPayant('DFB', '1');
    const X = await C.clientAssure(api, 'DFX', [{ tp: A, taux: 80 }]);
    const Y = await C.clientAssure(api, 'DFY', [{ tp: B, taux: 70 }]);
    const bonsX = [];
    for (const [i, qte] of [[1, 1], [2, 2], [3, 3], [4, 1]]) {
      bonsX.push(bonDe((await VO.vendre(X, [{ lien: X.lien(A), taux: 80, bon: MARQUE + '-DFX-' + i }], P, qte)).v));
    }
    const y1 = bonDe((await VO.vendre(Y, [{ lien: Y.lien(B), taux: 70, bon: MARQUE + '-DFY-1' }], P, 2)).v);
    const r1 = await definitive(A, [bonsX[0], bonsX[1]]);
    const r2 = await definitive(A, [bonsX[2]]);
    const r3 = await definitive(B, [y1]);
    const fa1 = factureDe(bonsX[0]), fa2 = factureDe(bonsX[2]), fb = factureDe(y1);
    /* FA2 annulee par avoir : effets de l'annulation locale apres un avoir FNE (facture et lignes gardees, bon libere) */
    exec("UPDATE t_facture SET str_STATUT = 'avoir', dbl_MONTANT_RESTANT = 0 WHERE lg_FACTURE_ID = '" + fa2 + "';"
      + " UPDATE t_preenregistrement_compte_client_tiers_payent SET str_STATUT_FACTURE = 'unpaid' WHERE lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID = '" + bonsX[2] + "'");
    const montants = bonsX.map((b) => enBase(b).montant);
    ok('Préalable : 5 bons, factures FA1 (X1, X2), FA2 annulée (X3), FB (Y1), X4 non facturé ; montants différents',
      !!fa1 && !!fa2 && !!fb && fa1 === factureDe(bonsX[1]) && fa1 !== fa2 && !factureDe(bonsX[3]) && new Set(montants).size >= 3,
      JSON.stringify({ r1, r2, r3, fa1, fa2, fb, montants }).slice(0, 400));
    const tous = bonsX.concat([y1]);
    const traces0 = traces(tous);

    /* ---- ecran ---- */
    await V.ouvrirMenu(p, 'FACTURATION', 'Factures');
    await p.waitForFunction(() => Ext.ComponentQuery.query('facturemanager').some((g) => g.isVisible(true)), null, { timeout: 30000 });
    for (const [l, h] of TAILLES) {
      await p.setViewportSize({ width: l, height: h }); await p.waitForTimeout(800);
      const avant = await panneau();
      if (avant.panneau) { await V.cliquer(p, 'facturemanager #btnDejaFacture'); await p.waitForTimeout(300); }
      await V.cliquer(p, 'facturemanager #btnDejaFacture');
      await p.waitForTimeout(600);
      const m = await panneau();
      ok(`${l}×${h} : bouton « Déjà facturé ? » dans la barre, il ouvre le panneau, curseur dans le champ`, m.bouton && m.panneau && m.focus, JSON.stringify(m));
    }
    await p.setViewportSize({ width: 1366, height: 768 }); await p.waitForTimeout(800);

    /* une lettre : rien n'est cherche */
    const court = await chercher('Z');
    ok('Une seule lettre : message, aucune recherche', !court.json && /au moins 2/.test(court.ecran.etat), court.ecran.etat);

    /* matricule de X */
    let r = await chercher(MARQUE + '-DFX');
    const parId = (res, b) => res.ecran.lignes.find((x) => x.id === b);
    ok('Matricule de X : ses 4 bons, rien de Y', r.ecran.lignes.length === 4 && bonsX.every((b) => parId(r, b)) && !parId(r, y1), JSON.stringify(r.ecran.lignes.map((x) => x.bon)));
    const comp = bonsX.map((b) => parId(r, b) ? conforme(parId(r, b), b) : { ok: false, ecran: null, base: enBase(b) });
    ok('Rapprochement écran = base, ligne par ligne (bon, montant, date, organisme, facture ou « Non facturé », factures annulées)', comp.every((c) => c.ok),
      JSON.stringify(comp.filter((c) => !c.ok)).slice(0, 400));
    ok('Rapprochement réponse = écran : total, nombre de bons facturés (2), compteur affiché', r.json.total === 4 && r.json.factures === 2 && /4 bon\(s\) : 2 facturé\(s\), 2 non facturé\(s\)/.test(r.ecran.etat),
      JSON.stringify({ total: r.json.total, factures: r.json.factures, etat: r.ecran.etat }));

    /* nom de X, mots inverses, minuscules */
    const parNom = await chercher('dfx essai');
    ok('Nom « dfx essai » (mots inversés, minuscules) : les mêmes 4 bons', parNom.ecran.lignes.length === 4 && bonsX.every((b) => parId(parNom, b)), JSON.stringify(parNom.ecran.lignes.map((x) => x.bon)));

    /* numero de bon de la facture annulee, puis bon de Y */
    r = await chercher(MARQUE + '-DFX-3');
    ok('Bon X3 : une ligne, « Non facturé », FA2 mentionnée comme annulée', r.ecran.lignes.length === 1 && conforme(r.ecran.lignes[0], bonsX[2]).ok
      && /Non facturé/.test(r.ecran.lignes[0].texte) && /annulée \(avoir\)/.test(r.ecran.lignes[0].texte), JSON.stringify(r.ecran.lignes));
    r = await chercher(MARQUE + '-DFY-1');
    ok('Bon Y1 : la facture FB de l\'organisme B', r.ecran.lignes.length === 1 && conforme(r.ecran.lignes[0], y1).ok && r.ecran.lignes[0].organisme === MARQUE + '-TP-DFB',
      JSON.stringify(r.ecran.lignes));

    /* un clic ouvre la facture FA1 : le bon X1 y est, au meme montant */
    await chercher(MARQUE + '-DFX-1');
    await p.locator('.df-ouvrir').filter({ visible: true }).first().click();
    await p.waitForFunction(() => Ext.ComponentQuery.query('window').filter((w) => /^Detail Bordereau/.test(w.title || '')).some((w) => w.isVisible() && !w.down('gridpanel').getStore().isLoading()
      && w.down('gridpanel').getStore().getCount() > 0), null, { timeout: 30000 });
    await p.waitForTimeout(500);
    const ouverte = await p.evaluate(() => { const w = Ext.ComponentQuery.query('window').filter((w) => /^Detail Bordereau/.test(w.title || '')).filter((x) => x.isVisible())[0];
      const u = w.down('gridpanel').getStore().getProxy().url || ''; return { facture: (u.match(/lg_FACTURE_ID=([^&]+)/) || [])[1], lignes: w.down('gridpanel').getStore().getRange().map((x) => x.get('str_REF_BON') + ':' + Math.round(Number(x.get('dbl_MONTANT')))) }; });
    const x1 = enBase(bonsX[0]);
    ok('Un clic sur « Facture » ouvre FA1 ; le bon X1 y figure au même montant', ouverte.facture === fa1 && ouverte.lignes.includes(x1.bon + ':' + x1.montant),
      JSON.stringify({ ouverte, attendu: x1.bon + ':' + x1.montant }));
    await p.evaluate(() => Ext.ComponentQuery.query('window').filter((w) => /^Detail Bordereau/.test(w.title || '')).forEach((w) => w.close()));
    await p.waitForTimeout(400);

    const inconnu = await chercher(MARQUE + '-INCONNU-DF');
    ok('Saisie inconnue : « Aucun bon trouvé », grille vide', inconnu.ecran.lignes.length === 0 && /Aucun bon trouvé/.test(inconnu.ecran.etat), inconnu.ecran.etat);
    ok('Bilan : la recherche n\'écrit rien (factures, lignes, statuts des bons)', traces(tous) === traces0, traces0 + ' -> ' + traces(tous));
    ok('Aucune erreur JavaScript à l\'écran', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await sess.b.close().catch(() => {});
    C.nettoyer();
    process.exit(C.bilan() ? 1 : 0);
  }
})();
