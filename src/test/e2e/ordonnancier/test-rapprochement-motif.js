/* CAS 3 (ORDONNANCIER), TEST DE RAPPROCHEMENT (regle du 05/11/2026) : le motif de chaque ligne (Sensible, Ordonnancier,
 * rien) est compare ligne par ligne entre tout ce qui le montre : la grille de vente, le detail du registre a l'ecran,
 * le service du detail, l'edition PDF, l'export Excel et la base.
 *
 * Jeu d'essai varie (cinq produits, quantites 2, 1, 3, 1, 2) :
 *   P1 sensible sans code tableau            -> motif Sensible, pastille SENSIBLE ;
 *   P2 soumis a ordonnance, code tableau A   -> motif Ordonnancier, pastille ORDONNANCIER ;
 *   P3 sensible ET soumis, code tableau II   -> motif Sensible (il prime), code II conserve ;
 *   P4 soumis a ordonnance SANS code tableau -> rien (regle historique), absent du registre ;
 *   P5 produit ordinaire                     -> rien, absent du registre.
 * Parcours (compte de test) : KEY_GERE_ORDONCIER a 1, vente comptant des cinq produits par leur CIP, quantites tapees
 * dans la grille, « Terminer la vente » refuse sans medecin, parcours client puis medecin, vente close ; puis
 * Ordonnancier > Registre > detail ; PDF et Excel du registre du jour pour ce medecin.
 * Puis la meme vente, KEY_GERE_ORDONCIER a 0 : la cloture n'exige plus le medecin, les pastilles restent, la vente
 * sans medecin ne va pas au registre (comme avant).
 * Defaut simule (E2E_DEFAUT_SIMULE=1) : entre la cloture et les editions, le code tableau de P2 est efface en base :
 * le rapprochement doit alors echouer (l'ecran disait Ordonnancier, les editions ne le disent plus).
 * Tout est retire a la fin. Lancement seul : node src/test/e2e/ordonnancier/test-rapprochement-motif.js
 */
const { chromium } = require('playwright-core');
const C = require('./commun');

const J = { medecin: 'E2E-MED-RAPP', numOrdre: 'E2E-9003', nomMedecin: 'DOCTEUR ESSAI RAPPROCHEMENT', client: 'E2E-RAPP-CLI', nomClient: 'ZZRAPPROCHEMENT' };
const CAISSE = 'E2E-RAPP-CAISSE';
const DEFAUT_SIMULE = process.env.E2E_DEFAUT_SIMULE === '1';
const P = C.articlesSimples(5);
/* [scheduled, sensible, code tableau, quantite, motif attendu, pastille attendue, au registre] */
const JEU = [[false, true, null, 2, 'Sensible', 'SENSIBLE', true], [true, false, 'A', 1, 'Ordonnancier', 'ORDONNANCIER', true],
  [true, true, 'II', 3, 'Sensible', 'SENSIBLE', true], [true, false, null, 1, '', '', false], [false, false, null, 2, '', '', false]];
const ventes = [];
let paramAvant = null, caisseOuverte = false;
const DEBUT = C.q('SELECT NOW()');

function nettoyer() {
  try { C.retirerVentes(ventes); } catch (e) { console.log('Retrait des ventes incomplet : ' + String(e.message).split('\n').pop()); }
  C.purgerClientEtMedecin(J);
  P.forEach(C.remettreArticle);
  if (paramAvant !== null) { C.remettreParametre(paramAvant); }
  if (caisseOuverte) { C.fermerCaisse(CAISSE); }
}

/* la meme ligne, vue de chaque source : cip / code tableau / motif / quantite / montant */
const cle = (cip, code, motif, qte, montant) => [cip, code || '', motif || '', Number(qte), Number(montant)].join('/');
const lire = (p, url) => p.evaluate(async (u) => { const r = await fetch(u, { credentials: 'same-origin' }); return r.json(); }, url);

(async () => {
  C.ok('Jeu d\'essai : cinq articles simples distincts', P.length === 5 && new Set(P.map((a) => a.cip)).size === 5, P.map((a) => a.cip).join(','));
  JEU.forEach((j, i) => C.poserDrapeaux(P[i], j[0], j[1], j[2]));
  paramAvant = C.parametreOrdonnancier('1');
  C.poserClientEtMedecin(J);
  caisseOuverte = C.ouvrirCaisse(CAISSE);
  const attendus = JEU.map((j, i) => ({ cip: P[i].cip, nom: P[i].nom, code: j[2] || '', motif: j[4], pastille: j[5], qte: j[3], montant: P[i].prix * j[3], registre: j[6] }));
  const auRegistre = attendus.filter((a) => a.registre);
  const b = await C.ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } });
  await ctx.route(/\/api\/v1\/vente\/ticket\//, (r) => r.abort());
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  try {
    await C.vues.connexion(p, C.ENV_E2E.LOGIN, 'e2etest');

    /* 1. la vente : cinq lignes, quantites, pastilles */
    await C.nouvelleVente(p);
    for (const a of attendus) { await C.taperArticle(p, a.cip); }
    const venteId = await C.venteCourante(p);
    ventes.push(venteId);
    for (const a of attendus.filter((x) => x.qte !== 1)) { await C.saisirQuantite(p, a.cip, a.qte); }
    const grille = [];
    for (const a of attendus) { grille.push(await C.ligneVente(p, a.cip)); }
    C.ok('Grille de vente : les cinq lignes, motif et pastille de chacune (Sensible, Ordonnancier, Sensible, rien, rien)',
      grille.every((l, i) => l && (l.motif || '') === attendus[i].motif && (l.pastille || '') === attendus[i].pastille),
      JSON.stringify(grille.map((l) => l && [l.motif, l.pastille])));
    const enBase = C.q("SELECT GROUP_CONCAT(CONCAT_WS('/', f.int_CIP, IFNULL(f.int_T, ''), CASE WHEN f.is_sensible = 1 THEN 'Sensible' WHEN f.is_scheduled = 1 AND IFNULL(f.int_T, '') <> '' THEN 'Ordonnancier' ELSE '' END,"
      + " d.int_QUANTITY, d.int_PRICE) ORDER BY f.int_CIP SEPARATOR '\n') FROM t_preenregistrement_detail d JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID"
      + " WHERE d.lg_PREENREGISTREMENT_ID = '" + venteId + "'").split('\n').sort();
    const attendusBase = attendus.map((a) => cle(a.cip, a.code, a.motif, a.qte, a.montant)).sort();
    C.ok('Base : les cinq lignes avec leurs quantites et montants (prix x quantite), motif selon la regle', enBase.join('|') === attendusBase.join('|'), enBase.join(' ; '));

    /* 2. cloture : refusee sans medecin (trois lignes entrent au registre), puis client et medecin, puis close */
    const refus = await C.terminer(p);
    C.ok('Paramètre à 1 : Terminer la vente est refusé sans médecin', !refus.ok && refus.codeError === 1 && /m[ée]decin/i.test(refus.msg), refus.msg);
    const r = await C.rattacherClientEtMedecin(p, J, venteId);
    C.ok('Parcours client puis médecin suivi à l\'écran, les deux rattachés', r.clientOk && r.medecinOk, JSON.stringify(r));
    const fin = await C.terminer(p);
    C.ok('Avec le médecin, la vente se termine', fin.ok && C.q("SELECT str_STATUT FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + venteId + "'") === 'is_Closed', fin.msg);
    if (DEFAUT_SIMULE) { C.q("UPDATE t_famille SET int_T = NULL WHERE lg_FAMILLE_ID = '" + P[1].id + "'"); console.log('DEFAUT SIMULE : code tableau de P2 efface apres la cloture'); }

    /* 3. le registre a l'ecran et son detail */
    await C.ouvrirOnglet(p, 'Registre', 'grilleRegistre');
    const repReg = p.waitForResponse((x) => /ventesordonnanciers\?/.test(x.url()), { timeout: 60000 });
    await C.vues.cliquer(p, 'ordonnancier #rechercher');
    await repReg;
    await p.waitForTimeout(800);
    const rang = await p.evaluate((id) => Ext.ComponentQuery.query('ordonnancier #grilleRegistre')[0].getStore().findExact('lgPREENREGISTREMENTID', id), venteId);
    C.ok('La vente est au registre du jour', rang >= 0, rang);
    const idGrille = await p.evaluate(() => Ext.ComponentQuery.query('ordonnancier #grilleRegistre')[0].getId());
    const repDetail = p.waitForResponse((x) => /ventesordonnanciers\/detail\//.test(x.url()), { timeout: 60000 });
    await p.locator('#' + idGrille + ' .x-grid-row').nth(rang).locator('.x-action-col-icon').first().click();
    await repDetail;
    await p.waitForTimeout(800);
    const detailEcran = await p.evaluate(() => { const f = Ext.ComponentQuery.query('detailproduitsvente')[0];
      return f ? f.produitStore.getRange().map((x) => x.getData()) : []; });
    await p.evaluate(() => Ext.ComponentQuery.query('detailproduitsvente').forEach((f) => f.close()));
    const detailService = await lire(p, '../api/v1/ventestats/ventesordonnanciers/detail/' + venteId);
    const clesEcran = detailEcran.map((l) => cle(l.intCIP, l.codeTableau, l.motif, l.intQUANTITY, l.intPRICE)).sort();
    const clesService = (detailService.data || []).map((l) => cle(l.intCIP, l.codeTableau, l.motif, l.intQUANTITY, l.intPRICE)).sort();
    const clesAttendues = auRegistre.map((a) => cle(a.cip, a.code, a.motif, a.qte, a.montant)).sort();
    C.ok('Détail à l\'écran : exactement les trois lignes qui entrent (P1, P2, P3), code tableau, motif, quantité et montant ligne par ligne',
      clesEcran.join('|') === clesAttendues.join('|'), clesEcran.join(' ; '));
    C.ok('Service du détail = écran, ligne par ligne', clesService.join('|') === clesEcran.join('|'), clesService.join(' ; '));
    C.ok('P4 (soumis sans code) et P5 (ordinaire) sont absents du détail', !detailEcran.some((l) => l.intCIP === P[3].cip || l.intCIP === P[4].cip));

    /* 4. l'edition PDF, ligne par ligne */
    const jour = new Date().toISOString().slice(0, 10);
    const filtre = 'dtStart=' + jour + '&dtEnd=' + jour + '&medecinId=' + J.medecin + '&query=';
    const pdf = await lire(p, '../api/v1/ventestats/ventesordonnanciers/pdf?' + filtre);
    C.ok('L\'édition PDF du registre aboutit', pdf.success === true && !!pdf.url, JSON.stringify(pdf));
    const fichierPdf = await C.telecharger(p, '..' + pdf.url, 'ordonnancier-rapprochement.pdf');
    const lignesPdf = C.lignesPdf(fichierPdf.chemin);
    const clesPdf = [];
    for (const a of attendus) {
      const l = lignesPdf.filter((x) => x.indexOf(a.cip) >= 0);
      if (!l.length) { continue; }
      const colonnes = l[0].trim().split(/\s{2,}/);
      /* ... | CIP | Produit | Tabl. | Motif | Qté | Montant | Vendeur : les colonnes vides sont absentes du texte, on lit par position relative au CIP */
      const i = colonnes.indexOf(a.cip);
      const suite = colonnes.slice(i + 1);
      const nombres = suite.map((x) => x.replace(/[\s  ]/g, '')).filter((x) => /^\d+$/.test(x));
      const motif = suite.find((x) => x === 'Sensible' || x === 'Ordonnancier') || '';
      const code = suite.find((x) => /^(A|B|C|I|II|III)$/.test(x)) || '';
      clesPdf.push(cle(a.cip, code, motif, nombres[nombres.length - 2], nombres[nombres.length - 1]));
    }
    C.ok('PDF : les trois lignes du registre, chacune avec son code tableau, son motif, sa quantité et son montant (= écran = base)',
      clesPdf.sort().join('|') === clesAttendues.join('|'), clesPdf.join(' ; ') + ' // ' + lignesPdf.filter((x) => attendus.some((a) => x.indexOf(a.cip) >= 0)).join(' // '));
    C.ok('PDF : P4 et P5 n\'y sont pas', !lignesPdf.some((x) => x.indexOf(P[3].cip) >= 0 || x.indexOf(P[4].cip) >= 0));

    /* 5. l'export Excel, ligne par ligne */
    const xls = await C.telecharger(p, '../api/v1/ventestats/ventesordonnanciers/excel?' + filtre, 'ordonnancier-rapprochement.xls');
    C.ok('L\'export Excel du registre répond', xls.statut === 200 && xls.taille > 2000, JSON.stringify(xls));
    const lignesXls = C.lignesXls(xls.chemin);
    const entete = lignesXls.find((l) => l.indexOf('Motif') >= 0) || [];
    const col = { cip: entete.indexOf('CIP'), code: entete.indexOf('Tableau'), motif: entete.indexOf('Motif'), qte: entete.indexOf('Qté'), montant: entete.indexOf('Montant') };
    C.ok('Excel : en-têtes CIP, Tableau, Motif, Qté, Montant', Object.keys(col).every((k) => col[k] >= 0), entete.join(' | '));
    const clesXls = lignesXls.filter((l) => attendus.some((a) => String(l[col.cip]) === a.cip))
      .map((l) => cle(String(l[col.cip]), l[col.code], l[col.motif], l[col.qte], l[col.montant])).sort();
    C.ok('Excel : les trois lignes, code tableau, motif, quantité et montant identiques à l\'écran, au PDF et à la base', clesXls.join('|') === clesAttendues.join('|'), clesXls.join(' ; '));
    C.ok('Excel : P4 et P5 n\'y sont pas', !lignesXls.some((l) => String(l[col.cip]) === P[3].cip || String(l[col.cip]) === P[4].cip));

    /* 6. parametre a 0 : meme vente, cloture sans medecin, pastilles conservees, pas au registre */
    C.remettreParametre('0');
    await C.nouvelleVente(p);
    for (const a of attendus) { await C.taperArticle(p, a.cip); }
    const vente0 = await C.venteCourante(p);
    ventes.push(vente0);
    const grille0 = [];
    for (const a of attendus) { grille0.push(await C.ligneVente(p, a.cip)); }
    C.ok('Paramètre à 0 : les pastilles de la grille de vente sont les mêmes', grille0.every((l, i) => l && (l.pastille || '') === attendus[i].pastille), JSON.stringify(grille0.map((l) => l && l.pastille)));
    const fin0 = await C.terminer(p);
    C.ok('Paramètre à 0 : la vente se termine sans médecin', fin0.ok && C.q("SELECT str_STATUT FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + vente0 + "'") === 'is_Closed', fin0.msg);
    const detail0 = await lire(p, '../api/v1/ventestats/ventesordonnanciers?dtStart=' + jour + '&dtEnd=' + jour + '&medecinId=&query=&start=0&limit=500');
    C.ok('Paramètre à 0 : la vente sans médecin n\'est pas au registre (comme avant) ; celle avec médecin y est',
      !(detail0.data || []).some((v) => v.lgPREENREGISTREMENTID === vente0) && (detail0.data || []).some((v) => v.lgPREENREGISTREMENTID === venteId), (detail0.data || []).length);
    C.ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    await p.screenshot({ path: C.ENV_E2E.TMP + '/ordonnancier-rapprochement-echec.png' }).catch(() => {});
    C.ok('Parcours sans exception', false, (await C.vues.texteMessage(p).catch(() => '')) + ' ' + e.stack);
  } finally {
    await b.close();
    nettoyer();
    C.ok('Données d\'essai retirées : ventes, client, médecin, drapeaux et stocks des cinq produits, paramètre',
      C.q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN ('" + (ventes.join("','") || '-') + "')") === '0'
      && C.q("SELECT COUNT(*) FROM medecin WHERE id = '" + J.medecin + "'") === '0'
      && P.every((a) => C.q("SELECT CONCAT(is_scheduled, is_sensible, IFNULL(int_T, '')) FROM t_famille WHERE lg_FAMILLE_ID = '" + a.id + "'") === a.scheduled + a.sensible + a.intT
        && C.stock(a.id) === Number(a.stock))
      && C.q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_GERE_ORDONCIER'") === paramAvant);
  }
  process.exit(C.bilan() ? 1 : 0);
})();
