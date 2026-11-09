/* FICHIERS DES DOCUMENTS DE L'EXTRANET (demande du 09/11, point 4 : « pour les documents dans chaque onglet en ligne on
 * a l'option de téléchargement en csv, excel et txt pour certains sur extranet, peut-on les avoir ici pour permettre les
 * importations ? on utilise juste ce qui y est disponible »).
 * Vrai chemin de l'ecran contre le FAUX extranet local (jamais le vrai) : GESTION DES COMMANDES > Extranets grossistes,
 * session saisie dans l'onglet Sessions, Ubipharm > Vos documents > Factures non relevées, « Lire sur l'extranet », puis
 * clic sur CSV, Excel ou TXT dans la colonne « Fichier ».
 * Jeu d'essai : 7 factures, liens BLV comme sur l'extranet (menu de la ligne) ; une facture sans lien ; etablissements
 * differents (YOP, BKE, GNA, VRI) ; numero avec « / » ; contenu avec accents (ISO-8859-1), Excel binaire, TXT servi avec
 * un type HTML (comme TEDIS) ; une facture dont l'extranet renvoie une page d'erreur au lieu du fichier.
 * Rapprochement : fichier recu au navigateur = fichier servi par l'extranet, octet pour octet ; nom = Ubipharm_BLV_<n°> ;
 * l'appel parti vers l'extranet porte les references de la bonne ligne ; references gardees en base = liens de la page.
 * Ergonomie : formats visibles par ligne, ligne sans lien vide, erreur affichee en rouge, colonne absente de l'export.
 * Bilan : listes gardees remises a l'identique, aucun fichier laisse, connexions d'essai retirees, uniquement des GET.
 *
 * Lancement (domain2, laborex_perf, toutes les sources d'extranet dirigees vers 127.0.0.1) :
 *   BASE=http://localhost:9080/prestige DB_TEST=laborex_perf E2E_BASE_LIBRE=1 PAYARA_DOMAINE=.../domain2 node test-ecran-fichiers-0911.js
 */
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const faux = require('./faux-extranet');
const fauxListes = require('./faux-listes-ubipharm');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
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

/* factures servies : numero affiche, fcnum et etcoda des liens BLV (null : pas de lien) */
const FACTURES = [
  { n: 'F2699201', fcnum: '2699201', etcoda: 'YOP' },
  { n: 'F2699202', fcnum: '2699202', etcoda: 'BKE' },
  { n: 'F2699203', fcnum: null, etcoda: null },
  { n: 'BKE/999204', fcnum: 'BKE/999204', etcoda: 'BKE' },
  { n: 'F2699205', fcnum: '2699205', etcoda: 'GNA' },
  { n: 'F2699206', fcnum: '2699206', etcoda: 'VRI' },
  { n: 'F2699207', fcnum: 'ERREUR207', etcoda: 'YOP' },
];
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/'/g, '&#39;');
function menu(f) {
  if (!f.fcnum) { return "<div class='dropdown'><a href='#'>Actions</a></div>"; }
  const p = 'fcnum=' + encodeURIComponent(f.fcnum) + '&etcoda=' + f.etcoda;
  return "<div class='dropdown'><a href='GetPDF?format=pdf&amp;fcnum=" + encodeURIComponent(f.fcnum) + "'>Consulter au format PDF</a>"
    + "<a class='link-nodblclick dlblv' href='" + esc('/BLVCSV?' + p) + "'>Exporter le BLV au format CSV</a>"
    + "<a class='link-nodblclick dlblv' href='" + esc('/BLVExcel?' + p) + "'>Exporter le BLV au format Excel</a>"
    + "<a class='link-nodblclick' href='" + esc('/BLVTxt?' + p) + "'>Exporter le BLV au format TXT</a></div>";
}
/* contenu servi : depend de la ligne et du format (jamais deux fichiers identiques) */
function contenu(chemin, fcnum, etcoda) {
  const graine = crypto.createHash('sha256').update(chemin + '|' + fcnum + '|' + etcoda).digest();
  if (chemin === '/BLVExcel') {
    const b = Buffer.alloc(1536);
    for (let i = 0; i < b.length; i++) { b[i] = graine[i % 32] ^ (i & 0xff); }
    /* essai reel du 09/11 : le BLV Excel d'Ubipharm est un classeur xlsx (signature ZIP) ; l'ancien xls (OLE) reste couvert */
    if (fcnum === '2699205') {
      b[0] = 0x50; b[1] = 0x4B; b[2] = 0x03; b[3] = 0x04;
      return { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', corps: b };
    }
    b[0] = 0xD0; b[1] = 0xCF; b[2] = 0x11; b[3] = 0xE0;
    return { type: 'application/vnd.ms-excel', corps: b };
  }
  const lignes = [];
  for (let i = 0; i < 3 + (graine[0] % 9); i++) {
    lignes.push([fcnum, '34000000' + String(10000 + graine[i % 32] * 7 + i), 'PRODUIT ÉTÉ n°' + i, 1 + (graine[(i + 3) % 32] % 40),
      (graine[(i + 5) % 32] * 113) + ',' + (i % 10) + '0'].join(chemin === '/BLVTxt' ? '|' : ';'));
  }
  const texte = (chemin === '/BLVCSV' ? 'N° BL;CIP;Désignation;Qté;Prix\r\n' : '') + lignes.join('\r\n') + '\r\n';
  return chemin === '/BLVTxt' ? { type: 'text/html; charset=ISO-8859-1', corps: Buffer.from(texte, 'latin1') }
    : { type: 'text/csv; charset=ISO-8859-1', corps: Buffer.from(texte, 'latin1') };
}

(async () => {
  const srv = await faux.demarrer(18765);
  srv.etat.listes.FACTURES = { chemin: '/ListeFactures', html: fauxListes.page('factures', ['', 'N° Facture', 'Ref Commande', 'Date', 'Montant (CFA)'],
    FACTURES.map((f, i) => [menu(f), f.n, 'CDE-' + i, String(1 + i).padStart(2, '0') + '/11/2026 10:00:00', '<span>' + (1000 * (i + 1)) + '</span>'])),
  attendu: [] };
  const servis = [];
  srv.etat.fichiers = {};
  ['/BLVCSV', '/BLVExcel', '/BLVTxt'].forEach((c) => {
    srv.etat.fichiers[c] = (u) => {
      const fcnum = u.searchParams.get('fcnum'), etcoda = u.searchParams.get('etcoda');
      if (fcnum === 'ERREUR207') {
        return { type: 'text/html; charset=utf-8', corps: '<!DOCTYPE html><html><body>Erreur interne</body></html>' };
      }
      const f = contenu(c, fcnum, etcoda);
      servis.push({ chemin: c, fcnum, etcoda, sha: crypto.createHash('sha256').update(f.corps).digest('hex') });
      return f;
    };
  });

  const navigateur = await ENV_E2E.lancer(chromium);
  const ctx = await navigateur.newContext({ viewport: { width: 1600, height: 950 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const erreurs = [];
  p.on('pageerror', (e) => erreurs.push(String(e.message)));
  const debut = q("SELECT DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s')");
  const journalTotal = q('SELECT COUNT(*) FROM t_event_log');
  const sauve = garde.sauver(q, TABLES);
  const fichiers = [];
  try {
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
    await vues.cliquer(p, ECRAN + ' #exListeFACTURESCollecter');
    await p.waitForTimeout(400);
    if (await p.evaluate(() => /relire \?/.test(Ext.ComponentQuery.query('extranetsgrossistes #exListeFACTURESCollecter')[0].getText()))) {
      await vues.cliquer(p, ECRAN + ' #exListeFACTURESCollecter');
    }
    const lu = (await (await finie).json()).lecture.resultat;
    await p.waitForTimeout(2500);
    ok('lecture : ' + FACTURES.length + ' factures', lu.success && lu.collecte.lignesRecues === FACTURES.length, JSON.stringify(lu.collecte || lu).slice(0, 200));
    if (await p.evaluate(() => { const c = Ext.ComponentQuery.query('extranetsgrossistes #exListeFACTURESTout')[0]; return !!c && c.isVisible() && !c.pressed; })) {
      await vues.cliquer(p, ECRAN + ' #exListeFACTURESTout');
      await p.waitForTimeout(800);
    }

    /* base : references gardees = liens de la page, ligne par ligne (la donnee ecrite est relue) */
    const coll = q("SELECT id FROM extranet_collecte WHERE module = 'LISTE_FACTURES' AND statut = 'COMPLETE' ORDER BY id DESC LIMIT 1");
    const docs = q("SELECT position, IFNULL(document, '-') FROM extranet_liste_ligne WHERE liste = 'FACTURES' AND collecte_id = " + coll + ' ORDER BY position')
      .split('\n').map((l) => l.split('\t'));
    const ecartsBase = [];
    FACTURES.forEach((f, i) => {
      const d = docs[i] ? docs[i][1] : 'absente';
      const voulu = f.fcnum ? JSON.stringify({ fcnum: f.fcnum, etcoda: f.etcoda }) : '-';
      if ((d === '-' ? '-' : JSON.stringify(JSON.parse(d))) !== voulu) { ecartsBase.push(f.n + ' : ' + d); }
    });
    ok('base : références du BLV gardées = liens de la page (7 lignes, une sans lien)', docs.length === FACTURES.length && ecartsBase.length === 0, ecartsBase.join(' | '));

    /* ecran : colonne Fichier, formats par ligne */
    const cellules = await p.evaluate(() => {
      const g = Ext.ComponentQuery.query('extranetsgrossistes #exListeFACTURESGrille')[0];
      const col = g.headerCt.getGridColumns().filter((c) => c.text === 'Fichier')[0];
      if (!col) { return null; }
      return g.getStore().getRange().map((r) => ({ n: r.get('cellules')[0], t: g.getView().getCell(r, col).dom.textContent.trim() }));
    });
    ok('colonne « Fichier » présente', !!cellules);
    const ecartsEcran = FACTURES.filter((f) => {
      const c = (cellules || []).find((x) => x.n === f.n);
      return !c || c.t !== (f.fcnum ? 'CSV · Excel · TXT' : '');
    }).map((f) => f.n);
    ok('écran : « CSV · Excel · TXT » sur les 6 factures avec lien, vide sur la facture sans lien', ecartsEcran.length === 0, ecartsEcran.join(', '));

    /* telechargements : clic reel sur le lien de la ligne */
    const cliquerFormat = async (n, libelle) => {
      const pos = await p.evaluate(([num, lib]) => {
        const g = Ext.ComponentQuery.query('extranetsgrossistes #exListeFACTURESGrille')[0];
        const col = g.headerCt.getGridColumns().filter((c) => c.text === 'Fichier')[0];
        const r = g.getStore().getRange().filter((x) => x.get('cellules')[0] === num)[0];
        const cell = g.getView().getCell(r, col);
        cell.dom.scrollIntoView({ block: 'center' });
        const a = Array.prototype.filter.call(cell.dom.querySelectorAll('a.exFichier'), (x) => x.textContent === lib)[0];
        const b = a.getBoundingClientRect();
        return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
      }, [n, libelle]);
      await p.mouse.click(pos.x, pos.y);
    };
    const cas = [['F2699201', 'CSV', '/BLVCSV', 'csv'], ['F2699202', 'Excel', '/BLVExcel', 'xls'], ['BKE/999204', 'TXT', '/BLVTxt', 'txt'],
      ['BKE/999204', 'CSV', '/BLVCSV', 'csv'], ['F2699205', 'Excel', '/BLVExcel', 'xlsx'], ['F2699206', 'TXT', '/BLVTxt', 'txt']];
    for (const [n, lib, chemin, ext] of cas) {
      const f = FACTURES.find((x) => x.n === n);
      const avantAppels = srv.etat.appels.length;
      const attente = p.waitForEvent('download', { timeout: 60000 });
      await cliquerFormat(n, lib);
      const d = await attente;
      const fichier = path.join(ENV_E2E.TMP, 'e2e-fichier-' + Date.now() + '.' + ext);
      await d.saveAs(fichier);
      fichiers.push(fichier);
      const recu = crypto.createHash('sha256').update(fs.readFileSync(fichier)).digest('hex');
      const servi = servis.filter((x) => x.chemin === chemin && x.fcnum === f.fcnum && x.etcoda === f.etcoda).pop();
      ok(n + ' ' + lib + ' : fichier reçu = fichier servi par l\'extranet, octet pour octet', servi && servi.sha === recu, (servi || {}).sha + ' / ' + recu);
      ok(n + ' ' + lib + ' : nom « Ubipharm_BLV_' + n.replace('/', '-') + '.' + ext + ' »', d.suggestedFilename() === 'Ubipharm_BLV_' + n.replace('/', '-') + '.' + ext, d.suggestedFilename());
      const appels = srv.etat.appels.slice(avantAppels).filter((a) => a.chemin === chemin);
      ok(n + ' ' + lib + ' : un seul appel GET, références de la ligne', appels.length === 1 && appels[0].methode === 'GET'
        && new URLSearchParams(appels[0].requete).get('fcnum') === f.fcnum && new URLSearchParams(appels[0].requete).get('etcoda') === f.etcoda,
      JSON.stringify(appels));
      const msg = await p.evaluate(() => Ext.ComponentQuery.query('extranetsgrossistes #exListeFACTURESMsg')[0].text);
      ok(n + ' ' + lib + ' : message « Fichier téléchargé »', /^Fichier téléchargé : Ubipharm_BLV_/.test(msg), msg);
    }

    /* extranet en erreur : message rouge, aucun fichier */
    let telecharge = false;
    const surveiller = () => { telecharge = true; };
    p.on('download', surveiller);
    await cliquerFormat('F2699207', 'CSV');
    await p.waitForTimeout(2500);
    p.off('download', surveiller);
    const msgErreur = await p.evaluate(() => Ext.ComponentQuery.query('extranetsgrossistes #exListeFACTURESMsg')[0].el.dom.innerHTML);
    ok('extranet en erreur : message rouge « Réponse inattendue », aucun fichier', !telecharge && /c0392b|rgb\(192, 57, 43\)/.test(msgErreur) && /inattendue/i.test(msgErreur), msgErreur);

    /* refus cote serveur : format non propose, ligne inconnue */
    const refus = await p.evaluate(() => Promise.all([
      fetch('../api/v1/extranet/ubipharm/listes/FACTURES/fichier?position=0&format=PDF').then((r) => r.status),
      fetch('../api/v1/extranet/ubipharm/listes/FACTURES/fichier?position=999&format=CSV').then((r) => r.status),
      fetch('../api/v1/extranet/ubipharm/listes/FACTURES/fichier?position=2&format=CSV').then((r) => r.status),
      fetch('../api/v1/extranet/ubipharm/listes/RELEVES/fichier?position=0&format=CSV').then((r) => r.status)]));
    ok('refus : format non proposé 400, ligne absente 404, ligne sans lien 404, liste sans fichier 400', JSON.stringify(refus) === '[400,404,404,400]', refus);

    /* export de la liste : la colonne Fichier n'y entre pas */
    const attente = p.waitForEvent('download', { timeout: 120000 });
    await vues.cliquer(p, ECRAN + ' #exListeFACTURESExport');
    await p.waitForTimeout(300);
    await vues.cliquer(p, 'menuitem#exListeFACTURESExportAffichageCsv');
    const d = await attente;
    const chemin = path.join(ENV_E2E.TMP, 'e2e-fichiers-liste-' + Date.now() + '.csv');
    await d.saveAs(chemin);
    fichiers.push(chemin);
    const entete = fs.readFileSync(chemin, 'utf8').replace(/^﻿/, '').split('\r\n')[0].split(';');
    ok('export de la liste : sans colonne « Fichier »', entete.indexOf('Fichier') < 0 && entete.indexOf('N° facture') >= 0, entete.join(';'));

    ok('faux extranet : uniquement des GET', srv.etat.appels.every((a) => a.methode === 'GET'));
    ok('aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('déroulé sans exception', false, e.stack || e.message);
  } finally {
    await navigateur.close();
    await srv.arreter();
    fichiers.forEach((f) => { try { fs.unlinkSync(f); } catch (e) { /* deja retire */ } });
    ok('bilan : fichiers d\'essai retirés', fichiers.every((f) => !fs.existsSync(f)));
    const ecarts = garde.restaurer(q, TABLES, sauve);
    q("DELETE FROM t_event_log WHERE dt_CREATED >= '" + debut + "' AND lg_USER_ID = (SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '"
      + ENV_E2E.LOGIN.replace(/'/g, "''") + "') AND str_TABLE_CONCERN = 'dal.TUser'");
    ok('bilan : listes gardées remises à l\'identique', ecarts.length === 0, ecarts.join(', '));
    ok('bilan : journal des connexions d\'essai retiré', q('SELECT COUNT(*) FROM t_event_log') === journalTotal);
    const n = res.filter((x) => x.c).length;
    console.log('\n' + n + '/' + res.length + (n === res.length ? ' OK' : ' ECHEC'));
    process.exit(n === res.length ? 0 : 1);
  }
})();
