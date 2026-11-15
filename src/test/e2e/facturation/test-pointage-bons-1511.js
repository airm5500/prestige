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
  const sess = await C.connecter();
  const { p, api, erreurs } = sess;
  const VO = C.venteAssurance(api);
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'pointage-'));
  const nettoyerPointage = () => exec(`DELETE FROM t_pointage_bon WHERE lg_TIERS_PAYANT_ID IN ('${TPA}', '${TPB}'); DELETE FROM t_pointage_annonce WHERE lg_TIERS_PAYANT_ID IN ('${TPA}', '${TPB}')`);
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
    const venteDe = (bon) => q(`SELECT t.lg_PREENREGISTREMENT_ID FROM t_preenregistrement_compte_client_tiers_payent t WHERE t.str_REF_BON = '${bon}'`
      + ` AND t.lg_COMPTE_CLIENT_TIERS_PAYANT_ID IN (SELECT lg_COMPTE_CLIENT_TIERS_PAYANT_ID FROM t_compte_client_tiers_payant WHERE lg_TIERS_PAYANT_ID = '${TPA}') LIMIT 1`);
    exec(`UPDATE t_preenregistrement SET dt_CREATED_ORDONNANCE = CURDATE() - INTERVAL 1 DAY WHERE lg_PREENREGISTREMENT_ID = '${venteDe('PT-1')}';`
      + ` UPDATE t_preenregistrement SET dt_CREATED_ORDONNANCE = CURDATE() - INTERVAL 9 DAY WHERE lg_PREENREGISTREMENT_ID = '${venteDe('PT-2')}'`);
    void v1; void v2;
    const base = bonsEnBase(TPA);
    const lb = Object.values(base).map((b) => b.bon + '=' + b.part).sort();
    const parts = Object.values(base).map((b) => b.part);
    ok('Jeu d\'essai : 5 bons pour PTA (parts différentes), 1 pour PTB', lb.length === 5 && new Set(parts).size >= 4 && Object.keys(bonsEnBase(TPB)).length === 1, lb.join(', '));

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
    const choix = p.waitForEvent('filechooser', { timeout: 30000 });
    await vues.cliquer(p, P + ' #ptReleve');
    await (await choix).setFiles(csv);
    await p.waitForFunction((x) => /ligne\(s\) lue\(s\)|illisible/.test(Ext.ComponentQuery.query(x + ' #ptReleve')[0].getText()), P, { timeout: 30000 });
    const rap = await p.evaluate((x) => Ext.ComponentQuery.query(x)[0].panneau.body.dom.innerText, P);
    await charge();
    c = await compteurs();
    ok('Relevé : 3 lignes, 2 appariées, PT-99 absent chez nous, 3 bons absents du relevé, écart +100 sur PT-2 ; annoncés = 3',
      /3 ligne\(s\) au relevé, 2 appariée\(s\)/.test(rap) && /absents chez nous \(1\)[\s\S]*PT-99/.test(rap) && /absents du relevé \(3\)/.test(rap)
      && new RegExp('PT-2 : chez nous ' + partDe('PT-2') + ', relevé ' + (partDe('PT-2') + 100) + ' \\(écart -100\\)').test(rap) && c.annonces === 3, rap.slice(0, 600));

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
