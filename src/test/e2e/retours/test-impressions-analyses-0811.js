/* PLAN DU 08/11, POINT 7 : IMPRESSION JRXML DE L'ANALYSE DES AVOIRS ET DU TABLEAU DE BORD DES RETOURS FOURNISSEUR.
 *
 * Retour : « permettre d'imprimer les données de l'onglet analyse pour les avoirs et tableau de bord pour retour
 * FOURNISSEUR ». Avant : bouton Imprimer grisé sur l'analyse des avoirs ; impression du navigateur (window.print) pour
 * le tableau de bord des retours.
 *
 * Par l'écran (menus, dates saisies, onglets et boutons cliqués) :
 *  A. Liste des avoirs, onglet Analyse, jeu d'essai de test-avoirs-analyse (3 ventes avec avoir le 17/09/2026 : un
 *     avoir en cours, deux clôturés, deux produits) :
 *     - le bouton Imprimer est actif sur l'analyse (export et inventaire restent grisés) ;
 *     - le clic produit un PDF (rp_analyse_avoirs_*.pdf) ; rapprochement API = écran = PDF : les quatre indicateurs,
 *       puis chaque ligne de chaque tableau, cellule par cellule et dans l'ordre de l'écran ;
 *     - période sans avoir (18/09/2026) : les messages « Aucun avoir sur la période. » de l'écran sont dans le PDF.
 *  B. Retour fournisseur, onglet Tableau de bord, depuis le 01/01/2024 (données réelles de la base, lecture seule) :
 *     - le clic sur Imprimer produit un PDF (rp_tableau_bord_retours_fournisseur_*.pdf), plus d'impression navigateur ;
 *     - rapprochement API = écran = PDF : indicateurs, mois, produits, motifs, utilisateurs, ligne par ligne ;
 *     - avec le filtre utilisateur : le PDF rappelle « Utilisateur : <nom> » et ne contient que sa ligne.
 * Jeu d'essai A retiré à la fin.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const V = require('../outils/vues');
const { fichierEdition } = require('../support/editions');
const { execFileSync } = require('child_process');
const fs = require('fs');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '--raw'], { input: s, encoding: 'utf8' }).replace(/\r/g, '').trim();
const norm = (s) => String(s || '').replace(/[\s  ]+/g, ' ').trim();
const textePdf = (f) => norm(execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }));

/* Chaque ligne de l'ecran, cellule par cellule, se retrouve dans le PDF dans le meme ordre (recherche sequentielle) */
function rapprocher(lignes, texte) {
  let pos = 0;
  const manquants = [];
  for (const l of lignes) {
    for (const c of l.filter((x) => x !== '')) {
      const i = texte.indexOf(c, pos);
      if (i < 0) { manquants.push(l.join(' | ') + ' -> « ' + c + ' »'); break; }
      pos = i + c.length;
    }
  }
  return manquants;
}

/* ---------- jeu d'essai des avoirs (celui de test-avoirs-analyse) ---------- */
const JOUR = '2026-09-17';
const VA = ['E2E-AVA-V1', 'E2E-AVA-V2', 'E2E-AVA-V3'];
const retirer = () => q(`DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN ('${VA.join("','")}'); DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN ('${VA.join("','")}');`);
const SOURCE = q(`SELECT lg_PREENREGISTREMENT_ID FROM t_preenregistrement WHERE dt_UPDATED >= '${JOUR}' AND dt_UPDATED < '${JOUR}' + INTERVAL 1 DAY AND str_STATUT = 'is_Closed' AND b_IS_CANCEL = 0 AND int_PRICE > 0 ORDER BY dt_UPDATED LIMIT 1`);
const DETAIL = q(`SELECT lg_PREENREGISTREMENT_DETAIL_ID FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '${SOURCE}' LIMIT 1`);
const [PA, PB] = q("SELECT lg_FAMILLE_ID FROM t_famille WHERE str_STATUT = 'enable' AND lg_GROSSISTE_ID IS NOT NULL ORDER BY lg_FAMILLE_ID LIMIT 2").split('\n');
function poser() {
  retirer();
  const vente = (id, heure, ouvert, cloture) => `CREATE TEMPORARY TABLE tp AS SELECT * FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${SOURCE}';`
    + `UPDATE tp SET lg_PREENREGISTREMENT_ID = '${id}', str_REF = '${id.slice(-6)}', str_REF_TICKET = '${id.slice(-6)}', dt_UPDATED = '${JOUR} ${heure}', dt_CREATED = '${JOUR} ${heure}',`
    + ` b_IS_AVOIR = ${ouvert ? 1 : 0}, b_HAS_AVOIR = ${ouvert ? 0 : 1}, dt_CLOTURE_AVOIR = ${cloture ? `'${JOUR} ${heure}' + INTERVAL ${cloture} HOUR` : 'NULL'}, b_IS_CANCEL = 0;`
    + 'INSERT INTO t_preenregistrement SELECT * FROM tp; DROP TEMPORARY TABLE tp;';
  const ligne = (id, produit, qte, servie, pu, ouvert, initial) => `CREATE TEMPORARY TABLE td AS SELECT * FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_DETAIL_ID = '${DETAIL}';`
    + `UPDATE td SET lg_PREENREGISTREMENT_DETAIL_ID = '${id}-D', lg_PREENREGISTREMENT_ID = '${id}', lg_FAMILLE_ID = '${produit}', int_QUANTITY = ${qte}, int_QUANTITY_SERVED = ${servie},`
    + ` int_PRICE_UNITAIR = ${pu}, int_PRICE = ${pu * qte}, int_AVOIR = ${ouvert ? qte - servie : 0}, int_AVOIR_SERVED = ${servie}, int_AVOIR_INITIAL = ${initial}, str_STATUT = 'is_Process';`
    + 'INSERT INTO t_preenregistrement_detail SELECT * FROM td; DROP TEMPORARY TABLE td;'
    + (ouvert ? `UPDATE t_preenregistrement_detail SET b_IS_AVOIR = 1 WHERE lg_PREENREGISTREMENT_DETAIL_ID = '${id}-D';` : '');
  q(vente(VA[0], '10:00:00', true, 0) + ligne(VA[0], PA, 3, 1, 1000, true, 0)
    + vente(VA[1], '11:00:00', false, 48) + ligne(VA[1], PA, 1, 1, 1000, false, 1)
    + vente(VA[2], '12:00:00', false, 24) + ligne(VA[2], PB, 4, 4, 2000, false, 4));
}

/* clic sur un bouton d'impression : la reponse {success, url} et le PDF ecrit sur le disque */
async function imprimer(p, bouton, motif) {
  const [rep] = await Promise.all([
    p.waitForResponse((r) => motif.test(r.url()), { timeout: 120000 }),
    p.context().waitForEvent('page', { timeout: 120000 }).then((pg) => pg.close().catch(() => {})).catch(() => {}),
    V.cliquer(p, bouton)
  ]);
  const o = await rep.json().catch(() => ({}));
  const f = o.url ? fichierEdition(o.url) : '';
  return { o, f, existe: !!f && fs.existsSync(f) };
}

const lignesTable = (p, racine, sel, sauf) => p.evaluate(([r, s, x]) => [...Ext.ComponentQuery.query(r)[0].getEl().dom.querySelectorAll(s)]
  .map((tr) => [...tr.cells].filter((td, i) => !(x || []).includes(i)).map((td) => td.innerText.replace(/[\s ]+/g, ' ').trim())), [racine, sel, sauf]);

(async () => {
  let b = null;
  const err = [];
  try {
    ok('Jeu d\'essai : une vente du 17/09/2026 à cloner, deux produits', SOURCE && DETAIL && PA && PB, SOURCE);
    poser();
    b = await ENV_E2E.lancer(chromium);
    const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
    p.on('pageerror', (e) => err.push(e.message));
    await V.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const menu = (id) => p.evaluate((x) => { const r = Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().findChild('id', x, true); return r ? [r.parentNode.get('text'), r.get('text')] : null; }, id);

    /* ===== A. analyse des avoirs ===== */
    const mA = await menu('venteavoirmanager');
    await V.ouvrirMenu(p, mA[0], mA[1]);
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('venteavoirmanager')[0]; return e && e.down('#tabAnalyse') && e.isVisible(true); }, null, { timeout: 60000 });
    await p.waitForTimeout(1000);
    for (const [jour, vide] of [['17/09/2026', false], ['18/09/2026', true]]) {
      await V.saisir(p, 'venteavoirmanager #dtStart', jour);
      await V.saisir(p, 'venteavoirmanager #dtEnd', jour);
      if (!vide) {
        await p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('venteavoirmanager #tabAnalyse')[0].tab.getId()));
      } else {
        await V.cliquer(p, 'venteavoirmanager #rechercher');
      }
      await p.waitForTimeout(500);
      await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('venteavoirmanager')[0]; return !!e.analyseAvoirs && !(e.down('#tabAnalyse').loadMask && e.down('#tabAnalyse').loadMask.isVisible()); }, null, { timeout: 60000 });
      const boutons = await p.evaluate(() => { const e = Ext.ComponentQuery.query('venteavoirmanager')[0]; return ['#printPdf', '#exporterExcel', '#creerInventaire'].map((s) => !e.down(s).isDisabled()); });
      if (!vide) {
        ok('A. Onglet Analyse : Imprimer actif, export et inventaire grisés', boutons[0] && !boutons[1] && !boutons[2], JSON.stringify(boutons));
      }
      const api = await p.evaluate(() => Ext.ComponentQuery.query('venteavoirmanager')[0].analyseAvoirs);
      const racine = 'venteavoirmanager #avAnalyseContenu';
      const tuiles = await p.evaluate((r) => [...Ext.ComponentQuery.query(r)[0].getEl().dom.querySelectorAll('.pml-tuile')]
        .map((t) => [t.querySelector('.pml-tuile-titre').innerText, t.querySelector('.pml-tuile-valeur').innerText].map((x) => x.replace(/[\s ]+/g, ' ').trim())), racine);
      const tables = [];
      for (const s of ['tr.av-produit', 'tr.av-grossiste', 'tr.av-age', 'tr.av-mois']) { tables.push(...await lignesTable(p, racine, s)); }
      const messages = await p.evaluate((r) => [...Ext.ComponentQuery.query(r)[0].getEl().dom.querySelectorAll('td[colspan]')].map((td) => td.innerText.trim()), racine);
      const imp = await imprimer(p, 'venteavoirmanager #printPdf', /avoirs\/analyse\/pdf/);
      ok(`A. ${jour} : le clic sur Imprimer écrit un PDF rp_analyse_avoirs`, imp.o.success === true && /rp_analyse_avoirs_/.test(imp.o.url) && imp.existe, JSON.stringify(imp.o));
      const pdf = imp.existe ? textePdf(imp.f) : '';
      ok(`A. ${jour} : en-tête du PDF (titre, période)`, /ANALYSE DES AVOIRS/.test(pdf) && pdf.includes('Du ' + jour + ' au ' + jour), pdf.slice(0, 200));
      const manqueTuiles = tuiles.filter(([titre, val]) => !pdf.includes(norm(titre + ' : ' + val)));
      ok(`A. ${jour} : les 4 indicateurs de l'écran = PDF`, tuiles.length === 4 && manqueTuiles.length === 0, JSON.stringify(manqueTuiles));
      const t = api.total || {};
      ok(`A. ${jour} : indicateurs écran = API (avoirs ${t.avoirs}, en cours ${t.enCours}, clôturés ${t.clotures})`,
        tuiles[0][1] === String(t.avoirs) && tuiles[1][1] === String(t.enCours) && (vide ? t.avoirs === 0 : t.avoirs === 3 && t.enCours === 1 && t.clotures === 2), JSON.stringify(tuiles));
      const nbApi = (api.produits || []).length + (api.grossistes || []).length + (api.anciennete || []).length + (api.mois || []).length;
      ok(`A. ${jour} : lignes écran = API (${tables.length} = ${nbApi})`, tables.length === nbApi, tables.length + ' / ' + nbApi);
      const manque = rapprocher(tables, pdf);
      ok(`A. ${jour} : chaque ligne des tableaux de l'écran est dans le PDF, cellule par cellule, dans l'ordre`, manque.length === 0, manque.slice(0, 3).join(' || '));
      if (vide) {
        ok('A. Période sans avoir : les messages de l\'écran sont dans le PDF', messages.length > 0 && messages.filter((m) => m).every((m) => pdf.includes(m)), JSON.stringify(messages));
      } else {
        ok('A. Produit le plus souvent en avoir en tête du PDF, après son en-tête', /CIP Produit Grossiste Fois Quantité due Encore due Valeur/.test(pdf) && tables[0] && pdf.indexOf(tables[0][1]) > pdf.indexOf('Quantité due'), JSON.stringify(tables[0]));
      }
    }

    /* ===== B. tableau de bord des retours fournisseur ===== */
    const mB = await menu('retourfrsmanager') || ['GESTION DES COMMANDES', 'Retour fournisseur'];
    await V.ouvrirMenu(p, mB[0], mB[1]);
    await p.waitForFunction(() => Ext.ComponentQuery.query('retoursfournisseur').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await p.locator('.x-btn').filter({ visible: true }).filter({ hasText: 'Tableau de bord' }).first().click();
    const pret = () => p.waitForFunction(() => { const t = Ext.ComponentQuery.query('retoursfournisseur #tableauRetours')[0];
      return t && t.isVisible(true) && !(t.loadMask && t.loadMask.isVisible()) && /Retours par utilisateur/.test(t.down('#tbContenu').getEl().dom.innerText); }, null, { timeout: 240000 });
    await pret();
    await V.saisir(p, 'retoursfournisseur #tbDebut', '01/01/2024');
    await V.cliquer(p, 'retoursfournisseur #tbActualiser');
    await p.waitForTimeout(500);
    await pret();
    const racineB = 'retoursfournisseur #tbContenu';
    const lireTableau = async () => {
      const l = [];
      l.push(...await lignesTable(p, racineB, 'tr.rf-mois', [6]));
      l.push(...await lignesTable(p, racineB, 'tr.rf-produit', [0]));
      l.push(...await lignesTable(p, racineB, 'tr.rf-motif', [4]));
      l.push(...await lignesTable(p, racineB, 'tr.rf-utilisateur', [6]));
      return l;
    };
    const tabB = await lireTableau();
    const apiB = await p.evaluate(() => Ext.ComponentQuery.query('retoursfournisseur')[0].donnees);
    const nbB = ['mois', 'produits', 'motifs', 'utilisateurs'].reduce((s, k) => s + (apiB[k] || []).length, 0);
    ok(`B. Tableau de bord depuis le 01/01/2024 : lignes écran = API (${tabB.length} = ${nbB}), plusieurs mois et produits`,
      tabB.length === nbB && (apiB.mois || []).length > 1 && (apiB.produits || []).length > 1, tabB.length + ' / ' + nbB);
    const tuilesB = await p.evaluate((r) => [...Ext.ComponentQuery.query(r)[0].getEl().dom.querySelectorAll('.rf-tuiles .pml-tuile-valeur')].map((t) => t.innerText.replace(/[\s ]+/g, ' ').trim()), racineB);
    /* demande 59, partie 2 : tuiles des retours par etat (titre, nombre, unites), a retrouver aussi dans le PDF */
    const etatsB = await p.evaluate((r) => [...Ext.ComponentQuery.query(r)[0].getEl().dom.querySelectorAll('.rf-etats .pml-tuile')]
      .map((t) => ['titre', 'valeur', 'detail'].map((k) => t.querySelector('.pml-tuile-' + k).innerText.replace(/\s+/g, ' ').trim())), racineB);
    const impB = await imprimer(p, 'retoursfournisseur #tbImprimer', /tableau-bord\/pdf/);
    ok('B. Le clic sur Imprimer écrit un PDF rp_tableau_bord_retours_fournisseur', impB.o.success === true && /rp_tableau_bord_retours_fournisseur_/.test(impB.o.url) && impB.existe, JSON.stringify(impB.o));
    const pdfB = impB.existe ? textePdf(impB.f) : '';
    ok('B. En-tête du PDF : titre et période', /TABLEAU DE BORD DES RETOURS FOURNISSEURS/.test(pdfB) && pdfB.includes('Du 01/01/2024 au'), pdfB.slice(0, 200));
    ok('B. Indicateurs écran = PDF (retours, quantité, acceptée, montant)', tuilesB.length === 4 && pdfB.includes('Retours : ' + tuilesB[0]) && pdfB.includes('Quantité retournée : ' + tuilesB[1])
      && pdfB.includes('Acceptée en avoir : ' + tuilesB[2]) && pdfB.includes('Montant retourné : ' + tuilesB[3]), JSON.stringify(tuilesB));
    const pdfBPlat = pdfB.replace(/\s+/g, ' ');
    ok('B. Retours par état écran = PDF (en attente, refusés, abandonnés, validés : nombre et unités)', etatsB.length === 4
      && etatsB.every(([titre, valeur, detail]) => pdfBPlat.includes(titre + ' : ' + valeur + ' (' + detail + ')')), JSON.stringify(etatsB));
    const manqueB = rapprocher(tabB, pdfB);
    ok(`B. Chaque ligne de l'écran (${tabB.length}) est dans le PDF, cellule par cellule, dans l'ordre`, manqueB.length === 0, manqueB.slice(0, 3).join(' || '));

    /* filtre utilisateur : le premier utilisateur du tableau */
    const nom = (tabB.find((l, i) => i >= tabB.length - (apiB.utilisateurs || []).length) || [])[0];
    if (nom) {
      const choisi = await V.choisir(p, 'retoursfournisseur #tbUtilisateur', nom);
      await p.waitForTimeout(500);
      await pret();
      const un = await lignesTable(p, racineB, 'tr.rf-utilisateur', [6]);
      const impU = await imprimer(p, 'retoursfournisseur #tbImprimer', /tableau-bord\/pdf/);
      const pdfU = impU.existe ? textePdf(impU.f) : '';
      const autres = (apiB.utilisateurs || []).map((u) => u.libelle).filter((x) => x !== nom && pdfU.includes(x + ' '));
      ok(`B. Filtre « ${nom} » : le PDF rappelle l'utilisateur et ne contient que sa ligne`, choisi === nom && un.length === 1 && pdfU.includes('Utilisateur : ' + nom)
        && rapprocher(un, pdfU).length === 0 && autres.length === 0, JSON.stringify({ choisi, un, autres }));
    } else {
      ok('B. Un utilisateur dans le tableau pour le filtre', false);
    }
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    if (b) { await b.close(); }
    retirer();
    ok('Jeu d\'essai retiré', q(`SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN ('${VA.join("','")}')`) === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
