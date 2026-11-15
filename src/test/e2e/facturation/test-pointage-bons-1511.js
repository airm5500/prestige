/* POINTAGE DES BONS PAR ORGANISME (15/11) : onglet « Pointage » de « Liste des Bons par Organisme ».
 *
 * Jeu d'essai (retire a la fin) : un groupe d'essai, l'organisme PTA dans ce groupe, un autre organisme PTB ; ventes
 * assurance du jour (quantites et produits differents) :
 *   PT-1 client A, taux 80 = contrat, ordonnance la veille       -> tout verifie ;
 *   PT-2 client A, ordonnance 9 jours avant                       -> alerte de delai selon le reglage ;
 *   PT-3 client B, taux saisi 60 alors que le contrat dit 70      -> alerte de taux ; numero repris sur une autre vente ;
 *   PT-3 client B (deuxieme vente, meme numero)                   -> alerte de doublon ;
 *   PT-4 client C, meme matricule que le client B chez PTA        -> alerte « matricule deja pris » (PT-3 aussi) ;
 *   PB-1 sur PTB                                                   -> n'apparait jamais dans le pointage de PTA.
 * Parcours a la souris et au clavier : menu « Bons par organisme », onglet « Pointage », organisme choisi, delais regles
 * dans l'ecran (vide, groupe 3 j, organisme 10 j, organisme vide), n° de bon tape + Entree, Entree = conforme, 6 + motif +
 * Entree = anomalie, A = absent, bons annonces, releve CSV importe, filtres, Excel, PDF.
 * Controles :
 *  - rapprochement liste / base, ligne par ligne (n° de bon, part) ; compteurs = base ; PTB absent ;
 *  - delai : sans reglage aucune alerte de delai (choix du 15/11), groupe 3 j -> alerte, organisme 10 j passe avant le
 *    groupe -> plus d'alerte, organisme vide -> le groupe revient ; valeurs relues en base ;
 *  - bilan du pointage : exactement 3 lignes t_pointage_bon (conforme, anomalie bloc 6 + motif, absent), montant et
 *    utilisateur gardes ; un bon modifie ensuite repasse « a pointer » ;
 *  - bons annonces : ecart affiche = base - annonces, valeur en base ;
 *  - releve : appariement par n°, absents des deux cotes, ecart de montant ;
 *  - Excel complet / base et PDF des anomalies / base, ligne par ligne ; delais d'affichage sous plafond (regle du 15/11) ;
 *  - demande du 15/11 : PB-2 sur PTB (taux 90), deux lignes, la premiere a un prix de reference : la fiche montre les
 *    lignes comme le ticket qui imprime le detail (KEY_LIGNE_COMPTANT_VO a 1) : designation, quantite x prix, montant,
 *    « P[reference] * T[90%] : part » sous la ligne a reference, « Taux 90 % : part » sous l'autre ; la fiche est la
 *    meme avec le parametre a 0 et a 1 ; rapprochement fiche / apercu du ticket / base (part = reference x quantite x
 *    90 %, somme des parts du ticket = part de l'organisme en base) ;
 *  - aucune fenetre surgissante, aucune erreur JavaScript.
 * Lancement seul : node src/test/e2e/facturation/test-pointage-bons-1511.js
 */
const C = require('../audits/commun');
const { ok, q, exec, MARQUE, ADMIN } = C;
const vues = require('../outils/vues');
const { fichierEdition } = require('../support/editions');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const GROUPE = MARQUE + '-G1511';
const P = 'pointagebons';
const PLAFOND_LISTE_MS = 5000, PLAFOND_EXCEL_MS = 15000, PLAFOND_PDF_MS = 30000;
const lireXlsx = (f) => JSON.parse(execFileSync('python', ['-X', 'utf8', '-c', `import json,sys,openpyxl
wb=openpyxl.load_workbook(sys.argv[1])
print(json.dumps({ws.title:[[c.value for c in r] for r in ws.iter_rows()] for ws in wb.worksheets},ensure_ascii=False,default=str))`, f], { encoding: 'utf8', maxBuffer: 1 << 28 }));
const textePdf = (f) => execFileSync('pdftotext', ['-enc', 'UTF-8', '-layout', f, '-'], { encoding: 'utf8', maxBuffer: 1 << 28 });

/* PDF texte minimal (Helvetica, une page) : [[x, y, texte], ...] ; sert de releve d'organisme en PDF (demande du 15/11) */
const pdfTexte = (cellules) => {
  const flux = cellules.map(([x, y, t]) => 'BT /F1 9 Tf ' + x + ' ' + y + ' Td (' + String(t).replace(/[()\\]/g, '\\$&') + ') Tj ET').join('\n');
  const objets = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    '<< /Length ' + Buffer.byteLength(flux, 'latin1') + ' >>\nstream\n' + flux + '\nendstream',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'];
  let s = '%PDF-1.4\n';
  const pos = objets.map((o, i) => { const d = Buffer.byteLength(s, 'latin1'); s += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; return d; });
  const xref = Buffer.byteLength(s, 'latin1');
  s += 'xref\n0 ' + (objets.length + 1) + '\n0000000000 65535 f \n' + pos.map((d) => String(d).padStart(10, '0') + ' 00000 n \n').join('')
    + 'trailer\n<< /Size ' + (objets.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
  return Buffer.from(s, 'latin1');
};
/* bons de l'organisme en base (vente terminee, non annulee) : id -> {bon, part} */
const bonsEnBase = (tp) => Object.fromEntries(q("SELECT CONCAT_WS('|', t.lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID, t.str_REF_BON, t.int_PRICE)"
  + " FROM t_preenregistrement_compte_client_tiers_payent t JOIN t_compte_client_tiers_payant l ON l.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = t.lg_COMPTE_CLIENT_TIERS_PAYANT_ID"
  + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID"
  + " WHERE l.lg_TIERS_PAYANT_ID = '" + tp + "' AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0").split(/\r?\n/).filter(Boolean)
  .map((l) => l.split('|')).map((x) => [x[0], { bon: x[1], part: Number(x[2]) }]));
const pointages = (tp) => q("SELECT CONCAT_WS('|', b.str_REF_BON, pb.str_RESULTAT, IFNULL(pb.int_BLOC, ''), IFNULL(pb.str_MOTIF, ''), pb.int_PRICE_POINTE = b.int_PRICE, pb.lg_USER_ID)"
  + " FROM t_pointage_bon pb JOIN t_preenregistrement_compte_client_tiers_payent b ON b.lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID = pb.lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID"
  + " WHERE pb.lg_TIERS_PAYANT_ID = '" + tp + "' ORDER BY b.str_REF_BON").split(/\r?\n/).filter(Boolean);

(async () => {
  C.ouvrirCaisse();
  exec("DELETE FROM t_groupe_tierspayant WHERE str_LIBELLE = '" + GROUPE + "'; INSERT INTO t_groupe_tierspayant (str_LIBELLE) VALUES ('" + GROUPE + "')");
  const groupeId = q("SELECT lg_GROUPE_ID FROM t_groupe_tierspayant WHERE str_LIBELLE = '" + GROUPE + "'");
  const TPA = C.tiersPayant('PTA', '1', 'lg_GROUPE_ID = ' + groupeId), TPB = C.tiersPayant('PTB', '1');
  const P1 = C.produit(6, 200), P2 = C.produit(7, 200), P3 = C.produit(8, 200), P4 = C.produit(9, 200);
  const SANS_REF = ' AND NOT EXISTS (SELECT 1 FROM prix_reference r WHERE r.produit_id = f.lg_FAMILLE_ID)';
  const P5 = C.produit(10, 200, SANS_REF), P6 = C.produit(11, 200, SANS_REF);
  const REF5 = Math.round(P5.pu * 0.6);
  const sess = await C.connecter();
  const { p, api, erreurs } = sess;
  const VO = C.venteAssurance(api);
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'pointage-'));
  const ID_REF = MARQUE + '-PTREF';
  const nettoyerPointage = () => exec(`DELETE FROM prix_reference WHERE id = '${ID_REF}'; DELETE FROM t_pointage_bon WHERE lg_TIERS_PAYANT_ID IN ('${TPA}', '${TPB}'); DELETE FROM t_pointage_annonce WHERE lg_TIERS_PAYANT_ID IN ('${TPA}', '${TPB}')`);
  try {
    const clA = await C.clientAssure(api, 'PTA', [{ tp: TPA, taux: 80 }]);
    const clB = await C.clientAssure(api, 'PTB', [{ tp: TPA, taux: 70 }]);
    const clC = await C.clientAssure(api, 'PTC', [{ tp: TPA, taux: 80 }]);
    const clD = await C.clientAssure(api, 'PTD', [{ tp: TPB, taux: 90 }]);
    exec(`UPDATE t_compte_client_tiers_payant SET str_NUMERO_SECURITE_SOCIAL = '${MARQUE}-PTB-0' WHERE lg_COMPTE_CLIENT_TIERS_PAYANT_ID = '${clC.lien(TPA)}'`);
    const v1 = await VO.vendre(clA, [{ lien: clA.lien(TPA), taux: 80, bon: 'PT-1' }], P1, 2);
    const v2 = await VO.vendre(clA, [{ lien: clA.lien(TPA), taux: 80, bon: 'PT-2' }], P2, 1);
    await VO.vendre(clB, [{ lien: clB.lien(TPA), taux: 60, bon: 'PT-3' }], P3, 3);
    /* la cloture refuse un numero deja pris : le doublon nait d'une modification posterieure (simulee ici) */
    await VO.vendre(clB, [{ lien: clB.lien(TPA), taux: 70, bon: 'PT-3B' }], P4, 1);
    exec(`UPDATE t_preenregistrement_compte_client_tiers_payent SET str_REF_BON = 'PT-3' WHERE str_REF_BON = 'PT-3B' AND lg_COMPTE_CLIENT_TIERS_PAYANT_ID = '${clB.lien(TPA)}'`);
    await VO.vendre(clC, [{ lien: clC.lien(TPA), taux: 80, bon: 'PT-4' }], P1, 1);
    await VO.vendre(clD, [{ lien: clD.lien(TPB), taux: 90, bon: 'PB-1' }], P2, 2);
    /* PB-2 : deux lignes, la premiere avec un prix de reference de l'organisme (60 % du prix), quantites 3 et 2 */
    exec(`INSERT INTO prix_reference (id, type_prix, valeur, produit_id, tiersPayant_id, enabled, valeur_taux) VALUES ('${ID_REF}', 'PRIX_REFERENCE', ${REF5}, '${P5.id}', '${TPB}', 1, NULL)`);
    const tpsB2 = [{ lien: clD.lien(TPB), taux: 90, bon: 'PB-2' }];
    const vB2 = await VO.ajouter(clD, tpsB2, P5, 3);
    await VO.ajouter(clD, tpsB2, P6, 2, vB2);
    const cB2 = await VO.cloturer(clD, vB2, tpsB2);
    if (!cB2.success) { throw new Error('clôture PB-2 : ' + JSON.stringify(cB2).slice(0, 300)); }
    const venteDe = (bon) => q(`SELECT t.lg_PREENREGISTREMENT_ID FROM t_preenregistrement_compte_client_tiers_payent t WHERE t.str_REF_BON = '${bon}'`
      + ` AND t.lg_COMPTE_CLIENT_TIERS_PAYANT_ID IN (SELECT lg_COMPTE_CLIENT_TIERS_PAYANT_ID FROM t_compte_client_tiers_payant WHERE lg_TIERS_PAYANT_ID = '${TPA}') LIMIT 1`);
    exec(`UPDATE t_preenregistrement SET dt_CREATED_ORDONNANCE = CURDATE() - INTERVAL 1 DAY WHERE lg_PREENREGISTREMENT_ID = '${venteDe('PT-1')}';`
      + ` UPDATE t_preenregistrement SET dt_CREATED_ORDONNANCE = CURDATE() - INTERVAL 9 DAY WHERE lg_PREENREGISTREMENT_ID = '${venteDe('PT-2')}'`);
    void v1; void v2;
    const base = bonsEnBase(TPA);
    const lb = Object.values(base).map((b) => b.bon + '=' + b.part).sort();
    const parts = Object.values(base).map((b) => b.part);
    ok('Jeu d\'essai : 5 bons pour PTA (parts différentes), 2 pour PTB', lb.length === 5 && new Set(parts).size >= 4 && Object.keys(bonsEnBase(TPB)).length === 2, lb.join(', '));

    /* menu, onglet Pointage */
    await vues.ouvrirMenu(p, 'GESTION COURANTE', 'Bons par organisme');
    await p.waitForFunction(() => Ext.ComponentQuery.query('bonsorganismeonglets').some((c) => c.isVisible(true)), null, { timeout: 60000 });
    const onglets = await p.evaluate(() => Ext.ComponentQuery.query('bonsorganismeonglets button[cls=cec-onglet]').filter((b) => b.isVisible(true)).map((b) => b.getText()));
    ok('L\'écran a un onglet « Pointage »', onglets.join('|') === 'Bons|Bordereaux / suivi|Pointage', onglets.join('|'));
    await vues.cliquer(p, 'bonsorganismeonglets #bo-pointage');
    await p.waitForFunction((x) => Ext.ComponentQuery.query(x).some((c) => c.isVisible(true)), P, { timeout: 30000 });
    const charge = async () => {
      await p.waitForTimeout(300);
      await p.waitForFunction((x) => { const c = Ext.ComponentQuery.query(x)[0]; return c && !c.store.isLoading(); }, P, { timeout: 60000 });
      await p.waitForTimeout(300);
    };
    let t0 = Date.now();
    await vues.choisir(p, P + ' #ptOrganisme', TPA);
    await charge();
    const dListe = Date.now() - t0;
    const lignes = () => p.evaluate((x) => Ext.ComponentQuery.query(x)[0].store.getRange().map((r) => r.data), P);
    const compteurs = () => p.evaluate((x) => Ext.ComponentQuery.query(x)[0].dernierCompteurs, P);
    const filtre = async (v) => { await vues.cliquer(p, P + ' #ptFiltre button[valeur=' + v + ']'); await charge(); };
    await filtre('TOUS');
    let L = await lignes();
    ok('Délai : liste de l\'organisme affichée en moins de ' + PLAFOND_LISTE_MS + ' ms', dListe < PLAFOND_LISTE_MS, dListe + ' ms');
    ok('Rapprochement liste / base, ligne par ligne (n° de bon, part) ; PB-1 de PTB absent', JSON.stringify(L.map((l) => l.bon + '=' + l.part).sort()) === JSON.stringify(lb),
      JSON.stringify(L.map((l) => l.bon + '=' + l.part)));
    const parBon = (b) => L.filter((l) => l.bon === b);
    const niveau = (l, bloc) => (l.controles.find((c) => c.bloc === bloc) || {}).niveau;
    const texteBloc = (l, bloc) => (l.controles.find((c) => c.bloc === bloc) || {}).texte;
    const p1 = parBon('PT-1')[0], p2 = parBon('PT-2')[0], p4 = parBon('PT-4')[0];
    ok('PT-1 : assuré, ayant droit, taux, montant et date vérifiés (vert), produits à comparer', [1, 2, 3, 5, 6].every((b) => niveau(p1, b) === 'OK') && niveau(p1, 4) === 'INFO' && p1.alerte === 'INFO',
      JSON.stringify(p1.controles));
    ok('PT-1 : montant attendu = base × 80 % = part enregistrée', new RegExp('80 % = ' + p1.part + ' = part enregistrée ' + p1.part).test(texteBloc(p1, 5)), texteBloc(p1, 5));
    ok('Sans délai réglé (défaut) : PT-2 (9 j) sans alerte de délai', niveau(p2, 6) === 'OK' && /aucun maximum/.test(texteBloc(p2, 6)), texteBloc(p2, 6));
    const p3 = parBon('PT-3');
    ok('PT-3 : taux 60 % ≠ contrat 70 % en alerte ; les deux bons PT-3 en alerte de doublon', p3.length === 2 && p3.some((l) => niveau(l, 3) === 'ALERTE' && /60 % ≠ contrat \(70 %\)/.test(texteBloc(l, 3)))
      && p3.every((l) => l.alerte === 'ALERTE' && l.alertesBon.some((a) => /déjà utilisé sur 1 autre/.test(a))), JSON.stringify(p3.map((l) => [l.alertesBon, texteBloc(l, 3)])));
    ok('PT-4 : matricule déjà pris par un autre client de l\'organisme', niveau(p4, 1) === 'ALERTE' && /déjà pris par 1 autre/.test(texteBloc(p4, 1)), texteBloc(p4, 1));
    let c = await compteurs();
    ok('Compteurs = base : 5 en base, 0 pointé, 3 alertes (PT-3 ×2, PT-4), montant = somme des parts', c.enBase === 5 && c.pointes === 0 && c.alertes === 3 && c.montant === parts.reduce((a, b) => a + b, 0),
      JSON.stringify(c));

    /* delais regles dans l'ecran */
    const reglerDelai = async (org, gr) => {
      /* le bouton garde un instant « ✓ Délai enregistré » : on attend son libelle avant un nouveau reglage */
      await p.waitForFunction((x) => Ext.ComponentQuery.query(x + ' #ptDelaiOk')[0].getText() === 'Enregistrer le délai', P, { timeout: 30000 });
      await p.waitForFunction((x) => !Ext.ComponentQuery.query(x + ' #ptDelaiGroupe')[0].isDisabled(), P, { timeout: 15000 })
        .catch(() => { throw new Error('Délai du groupe grisé : délais non lus'); });
      for (const [id, v] of [['#ptDelai', org], ['#ptDelaiGroupe', gr]]) {
        const champ = await p.evaluate((r) => Ext.ComponentQuery.query(r)[0].inputEl.id, P + ' ' + id);
        await p.click('#' + champ, { clickCount: 3 });
        await p.keyboard.press('Control+A');
        await p.keyboard.press('Backspace');
        if (v !== null) { await p.keyboard.type(String(v)); }
        await p.keyboard.press('Tab');
      }
      await vues.cliquer(p, P + ' #ptDelaiOk');
      const conf = await p.evaluate((x) => Ext.ComponentQuery.query(x + ' #ptDelaiOk')[0].getText(), P);
      await p.waitForTimeout(400);
      await vues.cliquer(p, P + ' #ptDelaiOk');
      await p.waitForFunction((x) => /enregistré/.test(Ext.ComponentQuery.query(x + ' #ptDelaiOk')[0].getText()), P, { timeout: 30000 });
      await charge();
      return conf;
    };
    const delaisBase = () => q(`SELECT CONCAT_WS('|', IFNULL(tp.int_DELAI_SAISIE_BON, 'N'), IFNULL(g.int_DELAI_SAISIE_BON, 'N')) FROM t_tiers_payant tp JOIN t_groupe_tierspayant g ON g.lg_GROUPE_ID = tp.lg_GROUPE_ID WHERE tp.lg_TIERS_PAYANT_ID = '${TPA}'`);
    const conf = await reglerDelai(null, 3);
    ok('Délai du groupe : confirmation dans le bouton, puis 3 j en base, organisme vide', /Confirmer : organisme sans délai, groupe 3 j/.test(conf) && delaisBase() === 'N|3', conf + ' | ' + delaisBase());
    L = await lignes();
    ok('Groupe 3 j : PT-2 (9 j) en alerte « maximum 3 j, groupe » ; PT-1 (1 j) reste vert', niveau(parBon('PT-2')[0], 6) === 'ALERTE' && /Délai 9 j : maximum 3 j, groupe/.test(texteBloc(parBon('PT-2')[0], 6))
      && niveau(parBon('PT-1')[0], 6) === 'OK', texteBloc(parBon('PT-2')[0], 6));
    await reglerDelai(10, 3);
    L = await lignes();
    ok('Organisme 10 j (passe avant le groupe) : plus d\'alerte de délai sur PT-2 ; base 10|3', niveau(parBon('PT-2')[0], 6) === 'OK' && /maximum 10 j, organisme/.test(texteBloc(parBon('PT-2')[0], 6)) && delaisBase() === '10|3',
      texteBloc(parBon('PT-2')[0], 6) + ' | ' + delaisBase());
    await reglerDelai(null, 3);
    L = await lignes();
    c = await compteurs();
    ok('Organisme vidé : le délai du groupe revient (alerte sur PT-2) ; 4 alertes', niveau(parBon('PT-2')[0], 6) === 'ALERTE' && delaisBase() === 'N|3' && c.alertes === 4, JSON.stringify(c));
    ok('Aucune fenêtre surgissante', await p.evaluate(() => !Ext.ComponentQuery.query('messagebox, window').some((w) => w.isVisible() && w.modal)));

    /* pointage au clavier */
    await filtre('A_POINTER');
    const scanner = async (bon) => {
      await vues.cliquer(p, P + ' #ptScan');
      await p.keyboard.press('Control+A');
      await p.keyboard.type(bon, { delay: 15 });
      await p.keyboard.press('Enter');
      await p.waitForFunction((a) => { const x = Ext.ComponentQuery.query(a[0])[0]; return x.fiche && x.fiche.bon.bon === a[1]; }, [P, bon], { timeout: 30000 });
      await p.waitForTimeout(200);
    };
    const attendrePointe = async (n) => {
      await p.waitForFunction((a) => { const x = Ext.ComponentQuery.query(a[0])[0]; return !x.fiche && x.dernierCompteurs && x.dernierCompteurs.pointes === a[1] && !x.store.isLoading(); }, [P, n], { timeout: 30000 });
      await p.waitForTimeout(200);
    };
    await scanner('PT-1');
    const blocs = await p.evaluate((x) => Array.from(Ext.ComponentQuery.query(x)[0].panneau.body.dom.querySelectorAll('.pt-bloc')).map((b) => b.className.replace(/.*pt-(OK|INFO|ALERTE).*/, '$1')), P);
    ok('Fiche PT-1 : six blocs, verts sauf « Produits et prix » (à comparer)', blocs.join() === 'OK,OK,OK,INFO,OK,OK', blocs.join());
    ok('Fiche ouverte : le focus est dans la fiche (Entrée = conforme)', await p.evaluate(() => document.activeElement && document.activeElement.classList.contains('pt-fiche-corps')));
    await p.keyboard.press('Enter');
    await attendrePointe(1);
    ok('Après Entrée : le curseur revient sur le n° de bon', await p.evaluate((x) => Ext.ComponentQuery.query(x + ' #ptScan')[0].hasFocus, P));
    await scanner('PT-2');
    await p.keyboard.press('6');
    await p.waitForTimeout(200);
    await p.keyboard.type('Délai dépassé sur le papier', { delay: 10 });
    await p.keyboard.press('Enter');
    await attendrePointe(2);
    await scanner('PT-4');
    await p.keyboard.press('a');
    await attendrePointe(3);
    let pts = pointages(TPA);
    ok('Bilan : exactement 3 pointages en base (conforme, anomalie bloc 6 avec motif, absent), montant et utilisateur gardés',
      JSON.stringify(pts) === JSON.stringify(['PT-1|CONFORME|||1|' + ADMIN, 'PT-2|ANOMALIE|6|Délai dépassé sur le papier|1|' + ADMIN, 'PT-4|ABSENT|||1|' + ADMIN]), JSON.stringify(pts));
    c = await compteurs();
    ok('Compteurs après pointage : 3 pointés, 1 conforme, 2 anomalies, 2 à pointer', c.pointes === 3 && c.conformes === 1 && c.anomalies === 2 && c.aPointer === 2, JSON.stringify(c));
    L = await lignes();
    ok('Filtre « À pointer » : les 2 bons PT-3 seulement', L.length === 2 && L.every((l) => l.bon === 'PT-3'), L.map((l) => l.bon).join());
    await filtre('ANOMALIES');
    L = await lignes();
    ok('Filtre « Anomalies » : PT-2 et PT-4', L.map((l) => l.bon).sort().join() === 'PT-2,PT-4', L.map((l) => l.bon).join());

    /* bon modifie apres pointage */
    exec(`UPDATE t_preenregistrement_compte_client_tiers_payent SET dt_UPDATED = NOW() + INTERVAL 1 MINUTE WHERE str_REF_BON = 'PT-1'`
      + ` AND lg_COMPTE_CLIENT_TIERS_PAYANT_ID = '${clA.lien(TPA)}'`);
    await filtre('A_POINTER');
    L = await lignes();
    ok('Bon modifié après pointage : PT-1 repasse « à pointer » (marqué modifié)', L.some((l) => l.bon === 'PT-1' && l.modifieDepuis === true && l.etat === 'A_POINTER'), L.map((l) => l.bon + ':' + l.etat).join());

    /* bons annonces */
    await vues.cliquer(p, P + ' #ptAnnonces');
    await p.keyboard.press('Control+A');
    await p.keyboard.type('6');
    await vues.cliquer(p, P + ' #ptAnnoncesOk');
    const confA = await p.evaluate((x) => Ext.ComponentQuery.query(x + ' #ptAnnoncesOk')[0].getText(), P);
    await p.waitForTimeout(400);
    await vues.cliquer(p, P + ' #ptAnnoncesOk');
    await p.waitForFunction((x) => /Enregistré/.test(Ext.ComponentQuery.query(x + ' #ptAnnoncesOk')[0].getText()), P, { timeout: 30000 });
    await charge();
    c = await compteurs();
    ok('Bons annoncés 6 : confirmation dans le bouton, écart −1 affiché, 6 en base', /Confirmer : 6 bon\(s\) annoncé\(s\)/.test(confA) && c.annonces === 6 && c.ecart === -1
      && q(`SELECT int_ANNONCES FROM t_pointage_annonce WHERE lg_TIERS_PAYANT_ID = '${TPA}'`) === '6', confA + ' | ' + JSON.stringify(c));

    /* releve CSV de l'organisme */
    const partDe = (b) => Object.values(base).find((x) => x.bon === b).part;
    const csv = path.join(dossier, 'releve.csv');
    fs.writeFileSync(csv, 'Relevé ' + TPA + ';;;\n\nN° bon;Matricule;Date;Montant\nPT-1;;' + new Date().toLocaleDateString('fr-FR') + ';' + partDe('PT-1')
      + '\nPT-2;;;' + (partDe('PT-2') + 100) + '\nPT-99;M-INCONNU;01/11/2026;5 000\n', 'latin1');
    /* demande du 15/11 : import en deux temps (colonnes reconnues, puis rapprochement) et tableau de comparaison */
    const importer = async (fichier) => {
      await p.evaluate((x) => { const c = Ext.ComponentQuery.query(x)[0]; c.storeComparaison.removeAll(); c.analyseReleve = null; }, P);
      const choix = p.waitForEvent('filechooser', { timeout: 30000 });
      await vues.cliquer(p, P + ' #ptReleve');
      await (await choix).setFiles(fichier);
      await p.waitForFunction((x) => { const c = Ext.ComponentQuery.query(x)[0]; return !!c.analyseReleve || /illisible|PDF/.test(Ext.ComponentQuery.query(x + ' #ptReleve')[0].getText()); }, P, { timeout: 30000 });
    };
    const attendreComparaison = () => p.waitForFunction((x) => Ext.ComponentQuery.query(x)[0].storeComparaison.getCount() > 0, P, { timeout: 30000 });
    const comparaison = () => p.evaluate((x) => { const c = Ext.ComponentQuery.query(x)[0];
      return { visible: c.comparaison.isVisible(true), lignes: c.storeComparaison.getRange().map((r) => r.get('statut') + ':' + (r.get('bonReleve') || r.get('bon')) + ':' + (r.get('ecart') || 0)).sort(),
        colonnes: c.colonnesChoisies(), apercu: c.down('#ptApercu').getEl().dom.querySelectorAll('tr').length, resume: c.down('#ptResumeComp').text,
        scanVisible: c.down('#ptScan').isVisible(true), excelVisible: c.down('#ptExcel').isVisible(true) }; }, P);
    const attendu = ['ABSENT_CHEZ_NOUS:PT-99:0', 'ABSENT_DU_RELEVE:PT-3:0', 'ABSENT_DU_RELEVE:PT-3:0', 'ABSENT_DU_RELEVE:PT-4:0', 'APPARIE:PT-1:0', 'ECART:PT-2:-100'];
    await importer(csv);
    await attendreComparaison();
    const rap = await p.evaluate((x) => Ext.ComponentQuery.query(x)[0].panneau.body.dom.innerText, P);
    await charge();
    c = await compteurs();
    let cmp = await comparaison();
    ok('Relevé : 3 lignes, 2 appariées, PT-99 absent chez nous, 3 bons absents du relevé, écart +100 sur PT-2 ; annoncés = 3',
      /3 ligne\(s\) au relevé, 2 appariée\(s\)/.test(rap) && /absents chez nous \(1\)[\s\S]*PT-99/.test(rap) && /absents du relevé \(3\)/.test(rap)
      && new RegExp('PT-2 : chez nous ' + partDe('PT-2') + ', relevé ' + (partDe('PT-2') + 100) + ' \\(écart -100\\)').test(rap) && c.annonces === 3, rap.slice(0, 600));
    ok('Après import : tableau de comparaison affiché, colonnes reconnues (bon 1, matricule 2, date 3, montant 4), aperçu des lignes',
      cmp.visible && JSON.stringify(cmp.colonnes) === '{"bon":0,"matricule":1,"date":2,"montant":3}' && cmp.apercu === 4, JSON.stringify(cmp));
    ok('Rapprochement tableau / relevé / base : une ligne par ligne du relevé, une par bon absent du relevé, écart = part − montant du relevé',
      JSON.stringify(cmp.lignes) === JSON.stringify(attendu), JSON.stringify(cmp.lignes));
    ok('Ergonomie : le scan du n° de bon, Excel et PDF restent visibles au-dessus du tableau', cmp.scanVisible && cmp.excelVisible, JSON.stringify(cmp));
    await vues.cliquer(p, P + ' #ptFiltreComp button[valeur=ECART]');
    const ecarts = await p.evaluate((x) => Ext.ComponentQuery.query(x)[0].storeComparaison.getRange().map((r) => r.get('bon')), P);
    ok('Filtre « Écarts » du tableau : PT-2 seul', JSON.stringify(ecarts) === '["PT-2"]', JSON.stringify(ecarts));
    const ligneEcart = await p.evaluate((x) => '#' + Ext.ComponentQuery.query(x)[0].comparaison.getView().getNode(0).id, P);
    await p.click(ligneEcart + ' td:nth-child(3)');
    const ficheEcart = await p.waitForFunction((x) => { const c = Ext.ComponentQuery.query(x)[0]; return c.fiche && c.fiche.bon.bon === 'PT-2'; }, P, { timeout: 30000 }).then(() => true, () => false);
    ok('Clic sur la ligne en écart : la fiche de PT-2 s\'ouvre à droite', ficheEcart);

    /* releve PDF, en-tetes inconnus, colonnes dans un autre ordre : choisies a l'ecran puis rapprochement relance */
    const pdfReleve = path.join(dossier, 'releve.pdf');
    fs.writeFileSync(pdfReleve, pdfTexte([[40, 800, 'RELEVE ORGANISME'], [40, 760, 'Montant'], [160, 760, 'Reference'], [300, 760, 'Jour'], [420, 760, 'Assure'],
      [40, 740, String(partDe('PT-1'))], [160, 740, 'PT-1'], [300, 740, new Date().toLocaleDateString('fr-FR')], [420, 740, 'X'],
      [40, 725, String(partDe('PT-2') + 100)], [160, 725, 'PT-2'], [300, 725, '01/11/2026'], [420, 725, 'Y'],
      [40, 710, '5 000'], [160, 710, 'PT-99'], [300, 710, '01/11/2026'], [420, 710, 'Z']]));
    await importer(pdfReleve);
    await p.waitForTimeout(500);
    cmp = await comparaison();
    ok('Relevé PDF sans en-tête connu : seul le montant reconnu, rien de rapproché, message pour choisir les colonnes, « Relancer » grisé',
      cmp.lignes.length === 0 && JSON.stringify(cmp.colonnes) === '{"bon":-1,"matricule":-1,"date":-1,"montant":0}'
      && /Colonnes non reconnues/.test(await p.evaluate((x) => Ext.ComponentQuery.query(x + ' #ptMessage')[0].text, P))
      && await p.evaluate((x) => Ext.ComponentQuery.query(x + ' #ptRapprocher')[0].isDisabled(), P), JSON.stringify(cmp));
    await vues.choisir(p, P + ' #ptCol-bon', '2 · Reference');
    await vues.choisir(p, P + ' #ptCol-montant', '1 · Montant');
    await vues.choisir(p, P + ' #ptCol-date', '3 · Jour');
    const surligne = await p.evaluate((x) => Array.from(Ext.ComponentQuery.query(x + ' #ptApercu')[0].getEl().dom.querySelectorAll('th.pt-col-choisie')).map((t) => t.textContent), P);
    ok('Colonnes choisies : surlignées dans l\'aperçu avec leur rôle', JSON.stringify(surligne) === JSON.stringify(['MontantMontant', 'ReferenceN° de bon', 'JourDate']), JSON.stringify(surligne));
    await vues.cliquer(p, P + ' #ptRapprocher');
    await attendreComparaison();
    cmp = await comparaison();
    ok('Relevé PDF, colonnes choisies : même comparaison que le CSV (rapprochement PDF / CSV / base)', JSON.stringify(cmp.lignes) === JSON.stringify(attendu), JSON.stringify(cmp.lignes));
    await vues.cliquer(p, P + ' #ptFiltre button[valeur=TOUS]');
    await charge();
    ok('Un filtre de la liste ramène aux bons', await p.evaluate((x) => Ext.ComponentQuery.query(x)[0].grille.isVisible(true), P));

    /* Excel complet */
    let tele = p.waitForEvent('download', { timeout: 60000 }); tele.catch(() => {});
    t0 = Date.now();
    await vues.cliquer(p, P + ' #ptExcel');
    const dl = await tele;
    const fx = path.join(dossier, 'pointage.xlsx');
    await dl.saveAs(fx);
    const dExcel = Date.now() - t0;
    const X = lireXlsx(fx)['Pointage des bons'];
    const lx = X.slice(5).map((l) => l[0] + '=' + l[7] + '=' + l[9]).sort();
    const etatsBase = Object.fromEntries(pointages(TPA).map((l) => l.split('|')).map((x) => [x[0], x]));
    const libelle = (b) => { const x = etatsBase[b]; if (!x || b === 'PT-1') { return b === 'PT-1' ? 'Modifié : à repointer' : 'À pointer'; }
      return x[1] === 'ANOMALIE' ? 'Anomalie ' + x[2] + ' · Date' : x[1] === 'ABSENT' ? 'Absent du papier' : 'Conforme'; };
    const lxBase = Object.values(base).map((b) => b.bon + '=' + b.part + '=' + libelle(b.bon)).sort();
    ok('Rapprochement Excel / base, ligne par ligne (n° de bon, part, pointage)', JSON.stringify(lx) === JSON.stringify(lxBase), JSON.stringify(lx) + ' / ' + JSON.stringify(lxBase));
    ok('Délai : Excel en moins de ' + PLAFOND_EXCEL_MS + ' ms', dExcel < PLAFOND_EXCEL_MS, dExcel + ' ms');

    /* PDF des anomalies */
    const rep = p.waitForResponse((r) => /pointage-bons\/pdf/.test(r.url()), { timeout: 120000 });
    const pop = p.waitForEvent('popup', { timeout: 120000 }).catch(() => null);
    t0 = Date.now();
    await vues.cliquer(p, P + ' #ptPdf');
    const o = await (await rep).json();
    const w = await pop;
    let adresse = null;
    if (w) { await w.waitForURL((u) => String(u) !== 'about:blank', { timeout: 30000 }).catch(() => {}); adresse = w.url(); await w.close().catch(() => {}); }
    const dPdf = Date.now() - t0;
    ok("PDF : la fenêtre ouverte pointe sur l'édition, dans l'application", !!adresse && adresse.endsWith('/prestige' + o.url), adresse + ' / ' + o.url);
    const octets = Buffer.from(await p.evaluate(async (u) => Array.from(new Uint8Array(await (await fetch(u)).arrayBuffer())), adresse || ('..' + o.url)));
    let fp = path.join(dossier, 'anomalies.pdf');
    if (octets.slice(0, 4).toString() === '%PDF') { fs.writeFileSync(fp, octets); } else { fp = fichierEdition(o.url); }
    const tp = textePdf(fp);
    const lp = [['PT-2', 'Anomalie 6 · Date', 'Délai dépassé sur le papier'], ['PT-4', 'Absent du papier', '']].filter((x) =>
      !new RegExp(x[0] + '[^\\n]*\\s' + partDe(x[0]) + '\\s+' + x[1].replace(/[·]/g, '.') + (x[2] ? '[\\s\\S]{0,40}' + x[2].slice(0, 12) : '')).test(tp));
    ok('Rapprochement PDF des anomalies / base : PT-2 et PT-4, part et motif ; rien d\'autre', o.lignes === 2 && lp.length === 0 && !/PT-1|PT-3/.test(tp) && /ANOMALIES DU POINTAGE DES BONS/.test(tp),
      JSON.stringify(lp) + ' | ' + tp.slice(0, 900));
    ok('Délai : PDF des anomalies affiché en moins de ' + PLAFOND_PDF_MS + ' ms', dPdf < PLAFOND_PDF_MS, dPdf + ' ms');

    /* demande du 15/11 : vente a prix de reference, lignes de la fiche comme sur le ticket */
    await vues.choisir(p, P + ' #ptOrganisme', TPB);
    await charge();
    await filtre('TOUS');
    const PARAM = 'KEY_LIGNE_COMPTANT_VO';
    const paramAvant = q(`SELECT str_VALUE FROM t_parameters WHERE str_KEY = '${PARAM}'`);
    const lireFiche = () => p.evaluate((x) => Array.from(Ext.ComponentQuery.query(x)[0].panneau.body.dom.querySelectorAll('.pt-bloc[data-bloc="4"] .pt-art')).map((a) => ({
      designation: a.querySelector('.pt-art-l span').textContent, montant: a.querySelector('.pt-art-l b').textContent,
      detail: a.querySelector('.pt-art-d').textContent, lignes: Array.from(a.querySelectorAll('.pt-art-t')).map((t) => t.textContent) })), P);
    const fiches = {};
    let ticket = [];
    try {
      for (const v of ['0', '1']) {
        exec(`UPDATE t_parameters SET str_VALUE = '${v}' WHERE str_KEY = '${PARAM}'`);
        await scanner('PB-2');
        fiches[v] = await lireFiche();
        await p.keyboard.press('Escape');
        await p.evaluate((x) => { const c = Ext.ComponentQuery.query(x)[0]; c.fiche = null; }, P);
      }
      /* le ticket de reference : celui qui imprime le detail des lignes (parametre a 1) */
      const apercu = await api('GET', '../api/v1/vente/ticket/vo/' + vB2 + '/apercu');
      const doc = (apercu.tickets || []).find((t) => t.modele === 'VENTE_ASSURANCE') || (apercu.tickets || [])[0] || { blocs: [] };
      const corps = (doc.blocs.find((b) => b.id === 'CORPS') || { elements: [] }).elements;
      corps.forEach((e) => { if (e.genre === 'ARTICLE') { ticket.push({ designation: e.a, montant: e.d, detail: e.b + (e.c ? ' · lot ' + e.c : ''), lignes: [] }); }
        else if (e.genre === 'TEXTE' && ticket.length) { ticket[ticket.length - 1].lignes.push(e.a); } });
    } finally {
      exec(`UPDATE t_parameters SET str_VALUE = '${paramAvant}' WHERE str_KEY = '${PARAM}'`);
    }
    const fiche = fiches['0'];
    ok('PB-2 : la fiche montre les lignes du ticket à l\'identique (désignation, quantité × prix, montant, prix de référence, taux et part)',
      fiche.length === 2 && JSON.stringify(fiche) === JSON.stringify(ticket), JSON.stringify(fiche) + ' / ' + JSON.stringify(ticket));
    ok('PB-2 : même fiche avec ' + PARAM + ' à 0 et à 1 (le détail ne dépend pas du réglage du ticket)', JSON.stringify(fiches['0']) === JSON.stringify(fiches['1']), JSON.stringify(fiches['1']));
    const num = (t) => Number(String(t).replace(/[^\d]/g, ''));
    const nomP5 = q(`SELECT UPPER(str_DESCRIPTION) FROM t_famille WHERE lg_FAMILLE_ID = '${P5.id}'`), nomP6 = q(`SELECT UPPER(str_DESCRIPTION) FROM t_famille WHERE lg_FAMILLE_ID = '${P6.id}'`);
    const l5 = fiche.find((x) => x.designation === nomP5) || { lignes: [] }, l6 = fiche.find((x) => x.designation === nomP6) || { lignes: [] };
    const part5 = Math.round(REF5 * 3 * 0.9), part6 = Math.round(P6.pu * 2 * 0.9);
    const t5 = l5.lignes.join(' | '), t6 = l6.lignes.join(' | ');
    ok('PB-2, ligne à prix de référence : « P[' + REF5 + '] * T[90%] : ' + part5 + ' » (référence × 3 × 90 %) ; autre ligne : « Taux 90 % : ' + part6 + ' »',
      l5.lignes.length === 1 && /^P\[[\d\s\u00a0\u202f]+\] \* T\[90%\] : /.test(t5) && num((t5.match(/^P\[([^\]]+)\]/) || [])[1]) === REF5 && num(t5.split(':').pop()) === part5
      && l6.lignes.length === 1 && /^Taux 90 % : /.test(t6) && num(t6.split(':').pop()) === part6, t5 + ' || ' + t6);
    const partBase = Number(q(`SELECT int_PRICE FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID = '${vB2}'`));
    const baseCalc = q(`SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, '=', IFNULL(calculation_base_price, 'NULL'), 'x', int_QUANTITY) ORDER BY lg_FAMILLE_ID) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '${vB2}'`);
    ok('PB-2 : somme des parts de la fiche = part de l\'organisme en base (' + (part5 + part6) + ')', partBase === num(t5.split(':').pop()) + num(t6.split(':').pop()) && Math.abs(partBase - (part5 + part6)) <= 1, partBase + ' | ' + baseCalc);
    ok('Paramètre ' + PARAM + ' remis', q(`SELECT str_VALUE FROM t_parameters WHERE str_KEY = '${PARAM}'`) === paramAvant, paramAvant);
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Déroulé sans exception', false, e.stack);
  } finally {
    await sess.b.close().catch(() => {});
    nettoyerPointage();
    fs.rmSync(dossier, { recursive: true, force: true });
    C.nettoyer();
    exec("DELETE FROM t_groupe_tierspayant WHERE str_LIBELLE = '" + GROUPE + "'");
    ok('Nettoyage : pointages, annonces et groupe d\'essai retirés', q(`SELECT COUNT(*) FROM t_pointage_bon WHERE lg_TIERS_PAYANT_ID IN ('${TPA}', '${TPB}')`) === '0'
      && q("SELECT COUNT(*) FROM t_groupe_tierspayant WHERE str_LIBELLE = '" + GROUPE + "'") === '0');
    process.exit(C.bilan() ? 1 : 0);
  }
})();
