/* JOURNAL DES MESSAGES : ANALYSE, IMPRESSION, SELECTEUR DE PERIODE (retour du 22/11, lot 9, point 6).
 *
 * Jeu d'essai sur un jour sans aucun message (copie de travail) : 13 WhatsApp (3 lus, 2 distribues, 3 envoyes, 1 simule,
 * 1 lien ouvert, 2 echecs, 1 en cours ; origines avis, campagne, facture) et 6 SMS au numero d'administration (3
 * envoyes, 1 echec, 2 non envoyes ; ticket Z et cloture de caisse). Aucun texte de message n'est ecrit ni lu.
 *
 * Par les clics (compte e2e), menu CAMPAGNES SMS / WHATSAPP > « Journal des messages » :
 *  1. periode tapee dans le selecteur de periode unique (« du → au ») : le jour d'essai seul ;
 *  2. tuiles des taux (envoi, reception, lecture WhatsApp, echecs, en attente) : valeur et detail = calcul fait a part
 *     sur le jeu d'essai (envoi = envoyes / messages ; reception = distribues / envoyes ; lecture = lus / distribues
 *     WhatsApp ; echec et attente / messages ; une decimale) ;
 *  3. « Voir la répartition » : tableaux par canal et par origine = calcul a part ; somme des lignes = ensemble ;
 *  4. rapprochement : export CSV (bouton) recompte par canal et par origine = tableaux de l'ecran ; edition PDF
 *     (bouton « Imprimer ») : ligne « Ensemble » et lignes par canal = ecran ; delai d'affichage du PDF plafonne ;
 *  5. filtre canal WhatsApp : l'analyse ne porte plus que sur WhatsApp ;
 *  bilan : les lignes d'essai sont retirees, tables revenues a leur compte d'avant ; aucune erreur JS.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { connexion, ouvrirMenu, cliquer, saisirPeriode, choisir } = require('../outils/vues');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 700) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '--raw', '-e', s], { encoding: 'utf8' }).replace(/\r/g, '').replace(/\n$/, '');
const MARQUE = 'e2e-jm-2211-';
const PDF_MAX_MS = 10000;
const comptes = () => q(`SELECT CONCAT_WS('|', (SELECT COUNT(*) FROM whatsapp_message), (SELECT COUNT(*) FROM message_administration))`);

/* un jour sans message dans les trois sources (entre 20 et 80 jours en arriere) */
function jourLibre() {
  for (let k = 20; k < 80; k++) {
    const j = q(`SELECT CURDATE() - INTERVAL ${k} DAY`);
    const n = +q(`SELECT (SELECT COUNT(*) FROM whatsapp_message WHERE DATE(created_at) = '${j}') + (SELECT COUNT(*) FROM message_administration WHERE DATE(created_at) = '${j}')
      + (SELECT COUNT(*) FROM notification_client nc JOIN notification n ON n.id = nc.notification_id WHERE DATE(COALESCE(nc.sent_at, n.created_at)) = '${j}')`);
    if (n === 0) { return j; }
  }
  return null;
}
/* [canal, statut enregistre, origine enregistree, etat attendu] */
const WA = [['LU', 'AVIS'], ['LU', 'AVIS'], ['LU', 'FACTURE'], ['DELIVRE', 'AVIS'], ['DELIVRE', 'CAMPAGNE'], ['ENVOYE', 'CAMPAGNE'], ['ENVOYE', 'CAMPAGNE'],
  ['ENVOYE', 'FACTURE'], ['SIMULE', 'AVIS'], ['OUVERT', 'AVIS'], ['ECHEC', 'CAMPAGNE'], ['ECHEC', 'AVIS'], ['EN_COURS', 'AVIS']];
const ADM = [['ENVOYE', 'TICKET_Z'], ['ENVOYE', 'TICKET_Z'], ['ENVOYE', 'CLOTURE_CAISSE'], ['ECHEC', 'TICKET_Z'], ['NON_ENVOYE', 'CLOTURE_CAISSE'], ['NON_ENVOYE', 'CLOTURE_CAISSE']];
const ETAT_WA = { LU: 'lu', DELIVRE: 'distribue', ENVOYE: 'envoye', SIMULE: 'envoye', OUVERT: 'envoye', ECHEC: 'echec', EN_COURS: 'attente' };
const ETAT_ADM = { ENVOYE: 'envoye', ECHEC: 'echec', NON_ENVOYE: 'echec' };
const messages = [...WA.map(([s, o]) => ({ canal: 'WHATSAPP', origine: o, etat: ETAT_WA[s] })), ...ADM.map(([s, o]) => ({ canal: 'SMS', origine: o, etat: ETAT_ADM[s] }))];
const taux = (a, b) => (b === 0 ? 0 : Math.round(a * 1000 / b) / 10);
function analyse(l) {
  const n = (f) => l.filter(f).length;
  const total = l.length, envoyes = n((m) => ['envoye', 'distribue', 'lu'].includes(m.etat)), distribues = n((m) => ['distribue', 'lu'].includes(m.etat)), lus = n((m) => m.etat === 'lu');
  const echecs = n((m) => m.etat === 'echec'), attente = n((m) => m.etat === 'attente');
  const dWa = n((m) => m.canal === 'WHATSAPP' && ['distribue', 'lu'].includes(m.etat)), lWa = n((m) => m.canal === 'WHATSAPP' && m.etat === 'lu');
  return { total, envoyes, distribues, lus, echecs, attente, envoi: taux(envoyes, total), reception: taux(distribues, envoyes), lecture: dWa ? taux(lWa, dWa) : null, echec: taux(echecs, total), enAttente: taux(attente, total) };
}
const signature = (a) => [a.total, a.envoyes, a.distribues, a.lus, a.echecs, a.attente, a.envoi, a.reception, a.lecture === null ? '—' : a.lecture, a.echec].join('|');
const nombre = (t) => (/—/.test(t) ? '—' : Number(String(t).replace(/[^\d,]/g, '').replace(',', '.')));

(async () => {
  const avant = comptes();
  const J = jourLibre();
  ok('Précondition : un jour sans aucun message', !!J, J);
  if (!J) { process.exit(1); }
  const user = q(`SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN}'`);
  WA.forEach(([s, o], i) => q(`INSERT INTO whatsapp_message (id, telephone, mode, simule, statut, erreur, created_at, origine, utilisateur_id)
    VALUES ('${MARQUE}w${i}', '07000${String(10000 + i)}', 'API', ${s === 'SIMULE' ? 1 : 0}, '${s}', ${s === 'ECHEC' ? "'refus essai'" : 'NULL'}, '${J} 09:${String(10 + i).padStart(2, '0')}:00', '${o}', '${user}')`));
  ADM.forEach(([s, o], i) => q(`INSERT INTO message_administration (id, created_at, canal, origine, telephone, statut, motif, utilisateur_id)
    VALUES ('${MARQUE}a${i}', '${J} 18:${String(10 + i).padStart(2, '0')}:00', 'SMS', '${o}', '0500000000', '${s}', ${s === 'ENVOYE' ? 'NULL' : "'essai'"}, '${user}')`));
  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'jm-'));
  try {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => err.push(e.message));
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'CAMPAGNES SMS / WHATSAPP', 'Journal des messages');
    await p.waitForFunction(() => { const j = Ext.ComponentQuery.query('journalmessages')[0]; return j && j.rendered; }, null, { timeout: 60000 });
    const attendre = () => p.waitForFunction(() => { const g = Ext.ComponentQuery.query('#jmJournal')[0]; return g && !g.getStore().isLoading(); }, null, { timeout: 60000 }).then(() => p.waitForTimeout(500));
    await attendre();

    /* 1. periode */
    const jj = J.slice(8, 10) + '/' + J.slice(5, 7) + '/' + J.slice(0, 4);
    await saisirPeriode(p, 'journalmessages #jmAu', jj, jj);
    await cliquer(p, '#jmChercher');
    await attendre();
    const lignesEcran = await p.evaluate(() => Ext.ComponentQuery.query('#jmJournal')[0].getStore().getTotalCount());
    ok('1. Période du jour d\'essai tapée dans le sélecteur : ' + messages.length + ' messages', lignesEcran === messages.length, lignesEcran);

    /* 2. tuiles */
    const att = analyse(messages);
    const tuiles = await p.evaluate(() => Object.fromEntries(Array.from(document.querySelectorAll('[data-jm-taux]')).filter((e) => e.offsetParent !== null)
      .map((e) => [e.getAttribute('data-jm-taux'), { v: e.querySelector('b').textContent.trim(), d: e.querySelector('i').textContent.trim() }])));
    const attTuiles = { envoi: [att.envoi, att.envoyes + ' envoyés / ' + att.total], reception: [att.reception, att.distribues + ' distribués / ' + att.envoyes + ' envoyés'],
      lecture: [att.lecture, 'WhatsApp : ' + messages.filter((m) => m.canal === 'WHATSAPP' && m.etat === 'lu').length + ' lus / ' + messages.filter((m) => m.canal === 'WHATSAPP' && ['lu', 'distribue'].includes(m.etat)).length + ' distribués'],
      echec: [att.echec, att.echecs + ' / ' + att.total], attente: [att.enAttente, att.attente + ' / ' + att.total] };
    const ko = Object.entries(attTuiles).filter(([k, [v, d]]) => !tuiles[k] || nombre(tuiles[k].v) !== v || tuiles[k].d !== d).map(([k, [v, d]]) => k + ' écran ' + JSON.stringify(tuiles[k]) + ' attendu ' + v + ' / ' + d);
    ok('2. Tuiles des taux = calcul à part (envoi ' + att.envoi + ', réception ' + att.reception + ', lecture ' + att.lecture + ', échec ' + att.echec + ', attente ' + att.enAttente + ')', ko.length === 0, ko.join(' | '));

    /* 3. repartition */
    await p.locator('.jm-voir-repartition').click();
    await p.waitForTimeout(600);
    const tableaux = await p.evaluate(() => Array.from(document.querySelectorAll('.jm-repartition')).filter((t) => t.offsetParent !== null).map((t) => Array.from(t.querySelectorAll('tr')).slice(1)
      .map((r) => Array.from(r.querySelectorAll('td')).map((c) => c.textContent.trim()))));
    const sig = (cols) => [cols[1], cols[2], cols[3], cols[4], cols[5], cols[6], cols[7], cols[8], cols[9], cols[10]].map(nombre).join('|');
    const groupes = (cle) => { const g = {}; messages.forEach((m) => { (g[m[cle]] = g[m[cle]] || []).push(m); }); return Object.values(g).map(analyse).map(signature).sort(); };
    const ecranCanal = (tableaux[0] || []).map(sig).sort(), ecranOrigine = (tableaux[1] || []).map(sig).sort();
    ok('3. Répartition par canal = calcul à part (' + ecranCanal.length + ' canaux)', JSON.stringify(ecranCanal) === JSON.stringify(groupes('canal')), JSON.stringify(ecranCanal) + ' / ' + JSON.stringify(groupes('canal')));
    ok('3. Répartition par origine = calcul à part (' + ecranOrigine.length + ' origines)', JSON.stringify(ecranOrigine) === JSON.stringify(groupes('origine')), JSON.stringify(ecranOrigine) + ' / ' + JSON.stringify(groupes('origine')));
    const somme = (t, i) => (t || []).reduce((s, r) => s + Number(r[i]), 0);
    ok('3. Somme des lignes de chaque tableau = ensemble (messages, envoyés, distribués, lus, échecs, attente)', [0, 1].every((k) => [1, 2, 3, 4, 5, 6].every((i) => somme(tableaux[k], i) === [att.total, att.envoyes, att.distribues, att.lus, att.echecs, att.attente][i - 1])));

    /* 4. CSV par le bouton */
    const [tele] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), cliquer(p, '#jmExport')]);
    const fCsv = path.join(dossier, 'journal.csv');
    await tele.saveAs(fCsv);
    const csv = fs.readFileSync(fCsv, 'utf8').replace(/^﻿/, '').split(/\r\n/).filter(Boolean).map((l) => l.split(';').map((c) => c.replace(/^"|"$/g, '').replace(/""/g, '"')));
    const ent = csv[0], iCanal = ent.indexOf('Canal'), iOrig = ent.indexOf('Origine'), iEtat = ent.indexOf('État');
    const ETAT_TXT = { 'Envoyé': 'envoye', 'Distribué': 'distribue', 'Lu': 'lu', 'Échec': 'echec', 'En attente': 'attente' };
    const duCsv = csv.slice(1).map((c) => ({ canal: c[iCanal], origine: c[iOrig], etat: ETAT_TXT[c[iEtat]] }));
    const parLibelle = (l, cle) => { const g = {}; l.forEach((m) => { (g[m[cle]] = g[m[cle]] || []).push(m); }); return Object.entries(g).map(([k, v]) => k + '=' + signature(analyse(v.map((x) => ({ ...x, canal: /whats/i.test(x.canal) ? 'WHATSAPP' : 'SMS' }))))).sort(); };
    const ecranLib = (t) => (t || []).map((r) => r[0] + '=' + sig(r)).sort();
    ok('4. Export CSV : ' + (csv.length - 1) + ' lignes, recompte par canal = tableau de l\'écran', csv.length - 1 === messages.length && JSON.stringify(parLibelle(duCsv, 'canal')) === JSON.stringify(ecranLib(tableaux[0])),
      JSON.stringify(parLibelle(duCsv, 'canal')) + ' / ' + JSON.stringify(ecranLib(tableaux[0])));
    ok('4. Export CSV : recompte par origine = tableau de l\'écran, libellé par libellé', JSON.stringify(parLibelle(duCsv, 'origine')) === JSON.stringify(ecranLib(tableaux[1])),
      JSON.stringify(parLibelle(duCsv, 'origine')) + ' / ' + JSON.stringify(ecranLib(tableaux[1])));

    /* 4. PDF par le bouton « Imprimer » */
    const t0 = Date.now();
    const [rep] = await Promise.all([ctx.waitForEvent('response', { predicate: (r) => /journal-messages\/pdf/.test(r.url()), timeout: 60000 }), cliquer(p, '#jmImprimer')]);
    const delai = Date.now() - t0;
    /* le PDF s'ouvre dans un nouvel onglet : relu a la meme adresse, avec la meme session */
    const pdf = await (await ctx.request.get(rep.url())).body();
    ok('4. PDF affiché en moins de ' + PDF_MAX_MS / 1000 + ' s', /application\/pdf/.test(rep.headers()['content-type'] || '') && delai < PDF_MAX_MS, delai + ' ms');
    const fPdf = path.join(dossier, 'journal.pdf');
    fs.writeFileSync(fPdf, pdf);
    const texte = execFileSync('pdftotext', ['-layout', fPdf, '-'], { encoding: 'utf8' }).replace(/[  ]/g, ' ').replace(/ {2,}/g, ' ');
    const lignePdf = (lib) => { const l = texte.split('\n').find((x) => x.trim().startsWith(lib + ' ')); return l ? l.trim().slice(lib.length).trim().split(' ').filter((x) => x !== '%') : null; };
    const pdfSig = (cols) => (cols ? cols.slice(0, 10).map(nombre).join('|') : null);
    const ens = pdfSig(lignePdf('Ensemble'));
    ok('4. PDF : ligne « Ensemble » = écran', ens === signature(att), ens + ' / ' + signature(att));
    const canauxPdf = (tableaux[0] || []).map((r) => r[0] + '=' + pdfSig(lignePdf(r[0]))).sort();
    ok('4. PDF : lignes par canal = écran', JSON.stringify(canauxPdf) === JSON.stringify(ecranLib(tableaux[0])), JSON.stringify(canauxPdf) + ' / ' + JSON.stringify(ecranLib(tableaux[0])));
    for (const page of ctx.pages()) { if (page !== p) { await page.close().catch(() => {}); } }

    /* 5. filtre canal WhatsApp */
    await choisir(p, '#jmCanal', 'WhatsApp');
    await cliquer(p, '#jmChercher');
    await attendre();
    const wa = analyse(messages.filter((m) => m.canal === 'WHATSAPP'));
    const envoiWa = await p.evaluate(() => { const e = document.querySelector('[data-jm-taux="envoi"]'); return e ? { v: e.querySelector('b').textContent, d: e.querySelector('i').textContent } : null; });
    ok('5. Canal WhatsApp : l\'analyse ne porte que sur WhatsApp (' + wa.envoyes + ' envoyés / ' + wa.total + ')', envoiWa && nombre(envoiWa.v) === wa.envoi && envoiWa.d === wa.envoyes + ' envoyés / ' + wa.total, JSON.stringify(envoiWa));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Déroulé sans exception', false, x.stack || x);
  } finally {
    q(`DELETE FROM whatsapp_message WHERE id LIKE '${MARQUE}%'`);
    q(`DELETE FROM message_administration WHERE id LIKE '${MARQUE}%'`);
    fs.rmSync(dossier, { recursive: true, force: true });
    ok('Bilan : lignes d\'essai retirées, tables revenues à leur compte d\'avant', comptes() === avant, comptes() + ' / ' + avant);
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
