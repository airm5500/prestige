/* BL DU GROSSISTE SAISIS OU NON DANS PRESTIGE (demande du 09/11 : « on peut vérifier les BL du grossiste s'ils ont été
 * saisis ou pas dans le logiciel »).
 * Vrai chemin de l'ecran contre le FAUX extranet local (jamais le vrai) : GESTION DES COMMANDES > Extranets grossistes,
 * session saisie dans l'onglet Sessions, Ubipharm > Vos documents > Factures non relevées, « Lire sur l'extranet ».
 * 12 factures servies, comparees a des BL saisis pour l'essai (ecritures differentes du meme numero, comme a la main) :
 *   - saisi sous le grossiste lie (LABOREX-CI YOP), « yop/999101 » pour YOP-999101 ;
 *   - numero seul sans zeros de tete (« 99900123 » pour 099900123) ;
 *   - saisi sous COPHARMED, grossiste non lie a Ubipharm : signale « autre grossiste » ;
 *   - BL en cours de saisie (statut enable) ;
 *   - BL supprime (statut delete) : compte comme non saisi ;
 *   - 7 factures sans BL saisi.
 * Rapprochement : texte attendu (regle ecrite a part) = colonne « Saisi dans Prestige » de la grille, ligne par ligne,
 * = API = fichier CSV exporte. Ergonomie : compteur « N non saisi(s) », filtre Non saisis / Saisis / Autre grossiste.
 * Bilan : BL et commandes d'essai retires, liens et listes gardees remis a l'identique, connexions d'essai retirees.
 *
 * Lancement (domain2, laborex_perf, toutes les sources d'extranet dirigees vers 127.0.0.1) :
 *   BASE=http://localhost:9080/prestige DB_TEST=laborex_perf E2E_BASE_LIBRE=1 PAYARA_DOMAINE=.../domain2 node test-ecran-bl-saisis-0911.js
 */
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const faux = require('./faux-extranet');
const fauxListes = require('./faux-listes-ubipharm');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright-core');

const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s],
  { encoding: 'utf8' }).replace(/\r/g, '').trim();
const res = [];
function ok(n, c, d) {
  res.push({ n, c: !!c });
  console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : ''));
}

const garde = require('./garde-extranets');
garde.verifier(q, ENV_E2E.BASE, ENV_E2E.PAYARA_DOMAINE);
const TABLES = ['extranet_collecte', 'extranet_liste_ligne', 'extranet_grossiste'];
const ECRAN = 'extranetsgrossistes';
const MENU = '<div class="dropdown"><a href="#">Actions</a></div>';
const YOP = '51217123167082947316', COPHARMED = '51217123424022365243';
const PREFIXE = 'E2EBL0911';

/* factures servies et BL saisis pour l'essai */
const FACTURES = ['YOP-999101', '099900123', 'BKE/999102', 'GNA/999103', 'VRI/999104', 'YOP-999105', 'YOP-999106',
  'BKE/999107', 'GNA/999108', 'F2699109', 'F2699110', 'F2699111'];
const BL = [
  { ref: 'yop/999101', facture: 0, g: YOP, statut: 'is_Closed', date: '2026-11-02' },
  { ref: '99900123', facture: 1, g: YOP, statut: 'is_Closed', date: '2026-11-03' },
  { ref: 'BKE999102', facture: 2, g: COPHARMED, statut: 'is_Closed', date: '2026-11-04' },
  { ref: 'GNA-999103', facture: 3, g: YOP, statut: 'enable', date: '2026-11-05' },
  { ref: 'VRI999104', facture: 4, g: YOP, statut: 'delete', date: '2026-11-06' },
];
const LIBELLE = { [YOP]: 'LABOREX-CI YOP', [COPHARMED]: 'COPHARMED' };

/* regle attendue, ecrite a part de l'ecran */
function attendu(i) {
  const b = BL.find((x) => x.facture === i && x.statut !== 'delete');
  if (!b) { return 'Non saisi'; }
  const d = b.date.split('-').reverse().join('/'), autre = b.g !== YOP;
  return (b.statut === 'enable' ? 'En cours de saisie' : 'Saisi') + ' le ' + d + (autre ? ' sous ' : ' — ') + LIBELLE[b.g]
    + (autre ? ' (autre grossiste)' : '');
}

const texte = (p, sel) => p.evaluate((s) => { const c = Ext.ComponentQuery.query('extranetsgrossistes ' + s)[0]; return c && c.el ? c.el.dom.textContent : ''; }, sel);
const colonneEcran = (p) => p.evaluate(() => {
  const g = Ext.ComponentQuery.query('extranetsgrossistes #exListeFACTURESGrille')[0];
  const col = g.headerCt.getGridColumns().filter((c) => c.text === 'Saisi dans Prestige')[0];
  if (!col) { return null; }
  const vue = g.getView();
  return g.getStore().getRange().map((r) => ({ n: r.get('cellules')[0], t: vue.getCell(r, col) ? vue.getCell(r, col).dom.textContent.trim() : '?' }));
});
async function cliquerConfirme(p, requete) {
  await vues.cliquer(p, requete);
  await p.waitForTimeout(400);
  if (await p.evaluate((sel) => { const c = Ext.ComponentQuery.query(sel)[0]; return !!c && /relire \?/.test(c.getText()); }, requete)) {
    await vues.cliquer(p, requete);
  }
}

(async () => {
  const srv = await faux.demarrer(18765);
  srv.etat.listes.FACTURES = { chemin: '/ListeFactures', html: fauxListes.page('factures', ['', 'N° Facture', 'Ref Commande', 'Date', 'Montant (CFA)'],
    FACTURES.map((f, i) => [MENU, f, 'CDE-' + i, String(1 + i).padStart(2, '0') + '/11/2026 10:00:00', '<span>' + (1000 * (i + 1)) + '</span>'])),
  attendu: FACTURES.map((f, i) => [f, 'CDE-' + i, String(1 + i).padStart(2, '0') + '/11/2026 10:00:00', String(1000 * (i + 1))]) };

  const navigateur = await ENV_E2E.lancer(chromium);
  const ctx = await navigateur.newContext({ viewport: { width: 1600, height: 950 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const erreurs = [];
  p.on('pageerror', (e) => erreurs.push(String(e.message)));
  const debut = q("SELECT DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s')");
  const journalTotal = q('SELECT COUNT(*) FROM t_event_log');
  const avant = { bl: q('CHECKSUM TABLE t_bon_livraison').split('\t')[1], cde: q('CHECKSUM TABLE t_order').split('\t')[1] };
  const sauve = garde.sauver(q, TABLES);
  const fichiers = [];
  try {
    q("DELETE FROM extranet_grossiste; INSERT INTO extranet_grossiste (lg_GROSSISTE_ID, source, modifie_le, modifie_par) VALUES ('" + YOP
      + "', 'UBIPHARM', NOW(), 'e2e')");
    BL.forEach((b, i) => {
      q("INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, lg_GROSSISTE_ID, str_STATUT, dt_CREATED, dt_UPDATED, recu) VALUES ('" + PREFIXE + i
        + "', '" + PREFIXE + i + "', '" + b.g + "', 'is_Closed', NOW(), NOW(), 1); INSERT INTO t_bon_livraison (lg_BON_LIVRAISON_ID, str_REF_LIVRAISON,"
        + " dt_DATE_LIVRAISON, lg_ORDER_ID, str_STATUT, dt_CREATED, dt_UPDATED) VALUES ('" + PREFIXE + i + "', '" + b.ref + "', '" + b.date
        + "', '" + PREFIXE + i + "', '" + b.statut + "', NOW(), NOW())");
    });
    /* aucun autre BL du banc ne doit porter un de ces numeros (sinon l'attendu serait faux) */
    const norm = (s) => s.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^0+(?=\d+$)/, '');
    const autres = q("SELECT str_REF_LIVRAISON FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID NOT LIKE '" + PREFIXE + "%' AND str_REF_LIVRAISON IS NOT NULL")
      .split('\n').map(norm);
    const collisions = FACTURES.filter((f) => autres.indexOf(norm(f)) >= 0);
    ok('jeu d\'essai : aucun BL du banc ne porte ces numéros', collisions.length === 0, collisions.join(', '));

    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await vues.ouvrirMenu(p, 'GESTION DES COMMANDES', 'Extranets grossistes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('extranetsgrossistes')[0], null, { timeout: 60000 });
    await p.mouse.move(1200, 600);
    await p.waitForTimeout(1500);
    await vues.cliquer(p, ECRAN + ' #exOnglets tab[text=Sessions]');
    await p.waitForTimeout(400);
    await vues.saisir(p, ECRAN + ' #exCookieUBIPHARM', srv.COOKIE);
    const rs = p.waitForResponse((x) => x.url().indexOf('/sessions/UBIPHARM') >= 0, { timeout: 60000 });
    await vues.cliquer(p, ECRAN + ' #exSaisieUBIPHARM button[text=Enregistrer]');
    await rs;
    for (const t of ['Ubipharm', 'Vos documents', 'Factures non relevées']) { await vues.cliquer(p, ECRAN + ' #exOnglets tab[text=' + t + ']'); await p.waitForTimeout(400); }
    const finie = p.waitForResponse(async (x) => x.url().indexOf('/lectures/ubipharm/FACTURES') >= 0
      && (await x.json().catch(() => ({}))).lecture?.enCours === false, { timeout: 180000 });
    await cliquerConfirme(p, ECRAN + ' #exListeFACTURESCollecter');
    const lu = (await (await finie).json()).lecture.resultat;
    await p.waitForTimeout(2500);
    ok('lecture : ' + FACTURES.length + ' factures', lu.success && lu.collecte.lignesRecues === FACTURES.length, JSON.stringify(lu.collecte || lu).slice(0, 200));
    if (await p.evaluate(() => { const c = Ext.ComponentQuery.query('extranetsgrossistes #exListeFACTURESTout')[0]; return !!c && c.isVisible() && !c.pressed; })) {
      await vues.cliquer(p, ECRAN + ' #exListeFACTURESTout');
      await p.waitForTimeout(800);
    }

    /* rapprochement : attendu = ecran = API, ligne par ligne */
    const ecran = await colonneEcran(p);
    ok('colonne « Saisi dans Prestige » présente', !!ecran);
    const ecarts = [];
    FACTURES.forEach((f, i) => {
      const e = (ecran || []).find((x) => x.n === f);
      if (!e || e.t !== attendu(i)) { ecarts.push(f + ' : « ' + (e ? e.t : 'absente') + ' » au lieu de « ' + attendu(i) + ' »'); }
    });
    ok('rapprochement : écran = règle, ligne par ligne (12 factures, 6 cas)', ecran && ecran.length === FACTURES.length && ecarts.length === 0, ecarts.join(' | '));
    const api = await p.evaluate(() => fetch('../api/v1/extranet/ubipharm/listes/FACTURES').then((r) => r.json()));
    const apiSaisis = (api.lignes || []).filter((l) => l.saisi).map((l) => l.cellules[0] + '=' + l.saisi.reference).sort();
    const voulus = BL.filter((b) => b.statut !== 'delete').map((b) => FACTURES[b.facture] + '=' + b.ref).sort();
    ok('API : référence saisie renvoyée telle que tapée (' + voulus.length + ')', JSON.stringify(apiSaisis) === JSON.stringify(voulus), apiSaisis.join(', '));
    ok('API : résumé saisis 4, non saisis 8, autre grossiste 1', api.saisie && api.saisie.saisis === 4 && api.saisie.nonSaisis === 8
      && api.saisie.autreGrossiste === 1, JSON.stringify(api.saisie));

    /* ergonomie : compteur et filtre */
    const nombre = await texte(p, '#exListeFACTURESNombre');
    ok('compteur : « 12 ligne(s) — 8 non saisi(s) »', /^12 ligne\(s\) — 8 non saisi\(s\)/.test(nombre), nombre);
    const filtre = async (libelle) => { await vues.choisir(p, ECRAN + ' #exListeFACTURESSaisie', libelle); await p.waitForTimeout(500); return colonneEcran(p); };
    const nonSaisis = await filtre('Non saisis');
    ok('filtre « Non saisis » : 8 lignes, toutes « Non saisi »', nonSaisis.length === 8 && nonSaisis.every((x) => x.t === 'Non saisi'), nonSaisis.length);
    const n2 = await texte(p, '#exListeFACTURESNombre');
    ok('compteur filtré : « 8 / 12 ligne(s) »', /^8 \/ 12 ligne/.test(n2), n2);
    const autre = await filtre('Saisis sous un autre grossiste');
    ok('filtre « autre grossiste » : BKE/999102 seule', autre.length === 1 && autre[0].n === 'BKE/999102', JSON.stringify(autre));

    /* export CSV des lignes affichees (filtre « Saisis ») : la colonne suit */
    const saisis = await filtre(2); /* « Saisis » (par son rang : « Non saisis » contient aussi le mot) */
    ok('filtre « Saisis » : 4 lignes', saisis.length === 4, saisis.length);
    const attente = p.waitForEvent('download', { timeout: 120000 });
    await vues.cliquer(p, ECRAN + ' #exListeFACTURESExport');
    await p.waitForTimeout(300);
    await vues.cliquer(p, 'menuitem#exListeFACTURESExportAffichageCsv');
    const d = await attente;
    const chemin = path.join(ENV_E2E.TMP, 'e2e-bl-' + Date.now() + '.csv');
    await d.saveAs(chemin);
    fichiers.push(chemin);
    const csv = fs.readFileSync(chemin, 'utf8').replace(/^﻿/, '').split('\r\n').filter(Boolean).map((l) => l.split(';'));
    const kc = csv[0].indexOf('Saisi dans Prestige');
    const csvLignes = csv.slice(1).map((l) => l[0] + '=' + l[kc]).sort();
    const csvAttendu = saisis.map((x) => x.n + '=' + x.t).sort();
    ok('export CSV : colonne « Saisi dans Prestige » = écran (4 lignes)', kc >= 0 && JSON.stringify(csvLignes) === JSON.stringify(csvAttendu), csvLignes.join(' | '));

    ok('aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('déroulé sans exception', false, e.stack || e.message);
  } finally {
    await navigateur.close();
    await srv.arreter();
    fichiers.forEach((f) => { try { fs.unlinkSync(f); } catch (e) { /* deja retire */ } });
    q("DELETE FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID LIKE '" + PREFIXE + "%'; DELETE FROM t_order WHERE lg_ORDER_ID LIKE '" + PREFIXE + "%'");
    const ecarts = garde.restaurer(q, TABLES, sauve);
    q("DELETE FROM t_event_log WHERE dt_CREATED >= '" + debut + "' AND lg_USER_ID = (SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '"
      + ENV_E2E.LOGIN.replace(/'/g, "''") + "') AND str_TABLE_CONCERN = 'dal.TUser'");
    ok('bilan : BL et commandes d\'essai retirés (t_bon_livraison, t_order identiques)', q('CHECKSUM TABLE t_bon_livraison').split('\t')[1] === avant.bl
      && q('CHECKSUM TABLE t_order').split('\t')[1] === avant.cde);
    ok('bilan : listes gardées et liens remis à l\'identique', ecarts.length === 0, ecarts.join(', '));
    ok('bilan : journal des connexions d\'essai retiré', q('SELECT COUNT(*) FROM t_event_log') === journalTotal);
    const n = res.filter((x) => x.c).length;
    console.log('\n' + n + '/' + res.length + (n === res.length ? ' OK' : ' ECHEC'));
    process.exit(n === res.length ? 0 : 1);
  }
})();
