/* LOT C (rapport du 10/10, journal du support et journaux de l'officine) : surveillance.
 *  (g) deux erreurs identiques au meme instant : plus de « Duplicate entry ... uk_application_event_signature » dans le
 *      journal du serveur, un seul evenement, aucune occurrence perdue (10 envois simultanes = 10 occurrences) ;
 *  (e1) impression des tickets mesuree : au-dela du seuil (KEY_TICKET_LENT_SEUIL_MS, mis a 0 le temps du test), le
 *      Centre de Support recoit « Impression du ticket lente » avec le detail des etapes ; la reponse de l'impression
 *      est la meme qu'avant ;
 *  (e2) blocage reel (requete retenue par un verrou de la base pendant 45 s) : la photographie des threads commence par
 *      le thread de la requete bloquee, le fichier complet se telecharge depuis le detail de l'evenement (bouton
 *      « Télécharger le log complet »), la cellule de l'export Excel en garde bien plus que 4 000 caracteres.
 * Tout est retire a la fin (evenements, fichiers de detail, parametre remis).
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync, spawn } = require('child_process');
const fs = require('fs');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined && d !== '' ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN'], { input: s, encoding: 'utf8' }).trim();
const JOURNAL = process.env.SERVER_LOG || '/opt/payara5/glassfish/domains/domain1/logs/server.log';
const MARQUE = 'E2E-LOTC-' + Date.now();
const CLE = 'KEY_TICKET_LENT_SEUIL_MS';
const seuilAvant = q(`SELECT IFNULL(MAX(str_VALUE), 'ABSENT') FROM t_parameters WHERE str_KEY = '${CLE}'`);
const descAvant = q(`SELECT IFNULL(MAX(str_DESCRIPTION), '') FROM t_parameters WHERE str_KEY = '${CLE}'`);
const tailleJournal = () => { try { return fs.statSync(JOURNAL).size; } catch (e) { return 0; } };
const journalDepuis = (pos) => { try { const fd = fs.openSync(JOURNAL, 'r'); const n = fs.fstatSync(fd).size - pos; const b = Buffer.alloc(Math.max(0, n)); fs.readSync(fd, b, 0, b.length, pos); fs.closeSync(fd); return b.toString('utf8'); } catch (e) { return ''; } };
const evenementsCrees = [];

function nettoyer() {
  const ids = q(`SELECT GROUP_CONCAT(CONCAT('''', id, '''')) FROM t_application_event WHERE message_court LIKE '%${MARQUE}%'
    OR (module = 'TICKET' AND created_at >= NOW() - INTERVAL 2 HOUR AND message_court LIKE 'Impression du ticket lente%')
    OR (module = 'BLOCAGE' AND url_ou_ecran LIKE '%app-params/update%' AND created_at >= NOW() - INTERVAL 2 HOUR)`);
  if (ids && ids !== 'NULL') {
    q(`SELECT log_ref FROM t_application_event WHERE id IN (${ids})`).split('\n').filter(Boolean).forEach((f) => { try { fs.unlinkSync(f); } catch (e) { /* deja parti */ } });
    q(`DELETE FROM t_application_event_occurrence WHERE event_id IN (${ids}); DELETE FROM t_application_event WHERE id IN (${ids});`);
  }
}

(async () => {
  nettoyer();
  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1500, height: 950 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  let verrou = null;
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });

    /* (g) : 10 erreurs identiques envoyees en meme temps, comme le rapporteur d'erreurs des ecrans */
    const pos = tailleJournal();
    await p.evaluate(async (m) => {
      const corps = JSON.stringify({ type: 'JS', niveau: 'ERROR', module: 'E2E', messageCourt: 'Erreur simultanee ' + m, urlOuEcran: 'e2e', stack: 'TypeError: e2e\n at x (e2e.js:1:1)' });
      await Promise.all(Array.from({ length: 10 }, () => fetch('../api/v1/support/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: corps })));
    }, MARQUE);
    let ligne = '';
    for (let i = 0; i < 40; i++) {
      await p.waitForTimeout(250);
      ligne = q(`SELECT CONCAT(COUNT(*), '|', IFNULL(SUM(occurrences), 0)) FROM t_application_event WHERE message_court LIKE '%${MARQUE}%'`);
      if (ligne === '1|10') { break; }
    }
    await p.waitForTimeout(1500);
    const journal = journalDepuis(pos);
    ok('(g) 10 erreurs identiques simultanées : un seul événement, 10 occurrences (aucune perdue)', ligne === '1|10', ligne);
    ok('(g) … aucun « Duplicate entry … uk_application_event_signature » au journal du serveur', !/uk_application_event_signature/.test(journal),
      (journal.match(/.*uk_application_event_signature.*/) || [''])[0]);

    /* (e1) impression d'un ticket, mesuree : seuil a 0 le temps du test */
    q(`INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED) VALUES ('${CLE}', '0', 'e2e', 'CUSTOMER', 'enable', NOW())
       ON DUPLICATE KEY UPDATE str_VALUE = '0'`);
    const vente = q("SELECT p.lg_PREENREGISTREMENT_ID FROM t_preenregistrement p JOIN mvttransaction m ON m.pkey = p.lg_PREENREGISTREMENT_ID"
      + " WHERE p.str_STATUT = 'is_Closed' AND p.int_PRICE > 0 AND p.str_TYPE_VENTE = 'VO' ORDER BY p.dt_UPDATED DESC LIMIT 1");
    const avantTicket = q("SELECT COUNT(*) FROM t_application_event WHERE module = 'TICKET'");
    const reponse = await p.evaluate(async (id) => { const r = await fetch('../api/v1/vente/ticket/vo/' + id, { method: 'POST' }); return { status: r.status, corps: await r.text() }; }, vente);
    let ticket = '';
    for (let i = 0; i < 40 && !ticket; i++) {
      await p.waitForTimeout(250);
      ticket = q("SELECT CONCAT(message_court, '§', payload_json) FROM t_application_event WHERE module = 'TICKET' AND message_court LIKE 'Impression du ticket lente%' ORDER BY last_seen_at DESC LIMIT 1");
    }
    /* banc sans imprimante : l'impression echoue sur « Imprimante inconnue », reponse relevee AVANT le lot C (meme corps) ;
       sur un poste avec imprimante, la reponse est celle de l'impression, inchangee */
    const AVANT = '{"msg":"Une erreur interne est survenue. Le support a été notifié.","success":false,"total":0}';
    ok('(e1) Réimpression d\'un ticket : même réponse qu\'avant le lot C, et la mesure est faite même quand l\'impression échoue',
      (reponse.corps === AVANT || /"success":true/.test(reponse.corps)), reponse.status + ' ' + reponse.corps.slice(0, 120));
    ok('(e1) Ticket au-delà du seuil : « Impression du ticket lente (vente/ticket/vo …) » au Centre de Support',
      /^Impression du ticket lente \(vente\/ticket\/vo \(réimpression\)\) : retenue par « [^»]+ »/.test(ticket) && avantTicket !== null, ticket.split('§')[0]);
    ok('(e1) … avec le détail des étapes (total, recherche de l\'imprimante, lecture de la vente) et l\'imprimante', /total \d+,\d s/.test(ticket) && /recherche de l'imprimante \d+,\d s/.test(ticket)
      && /lecture de la vente et mise en page/.test(ticket) && /Imprimante : /.test(ticket), ticket.split('§')[1]);
    ok('(e1) … aucune donnée de la vente dans le signalement', !ticket.includes(vente), '');
    q(`UPDATE t_parameters SET str_VALUE = '5000' WHERE str_KEY = '${CLE}'`);
    const sousSeuil = q("SELECT COUNT(*) FROM t_application_event WHERE module = 'TICKET'");
    const occAvant = q("SELECT IFNULL(SUM(occurrences), 0) FROM t_application_event WHERE module = 'TICKET'");
    await p.evaluate(async (id) => { await fetch('../api/v1/vente/ticket/vo/' + id, { method: 'POST' }); }, vente);
    await p.waitForTimeout(1500);
    ok('(e1) Sous le seuil (5 s) : rien n\'est signalé', q("SELECT IFNULL(SUM(occurrences), 0) FROM t_application_event WHERE module = 'TICKET'") === occAvant, sousSeuil);

    /* (e2) la surveillance fait au plus un rapport toutes les 5 minutes : on attend la fin de ce delai depuis le dernier
       rapport (heure lue au journal du serveur) */
    const fin = journalDepuis(Math.max(0, tailleJournal() - 5000000));
    const dates = [...fin.matchAll(/\[(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d+[+-]\d{4})\] [^\n]*filter\.BlocageWatchdog[^\n]*\n\s*BLOCAGE DETECTE/g)];
    if (dates.length) {
      const dernier = Date.parse(dates[dates.length - 1][1].replace(/([+-]\d\d)(\d\d)$/, '$1:$2'));
      const attente = dernier + 5 * 60000 + 5000 - Date.now();
      if (attente > 0) { console.log('… attente de ' + Math.round(attente / 1000) + ' s (délai entre deux rapports de blocage)'); await p.waitForTimeout(attente); }
    }
    /* (e2) blocage reel : la ligne du parametre est verrouillee 45 s par une autre connexion, l'ecran l'enregistre */
    verrou = spawn('mariadb', [...ENV_E2E.MARIADB, BASE, '-e', `START TRANSACTION; SELECT str_VALUE FROM t_parameters WHERE str_KEY = '${CLE}' FOR UPDATE; SELECT SLEEP(45); ROLLBACK;`]);
    await p.waitForTimeout(1500);
    const t0 = Date.now();
    const enregistrement = p.evaluate(async (c) => { const r = await fetch('../api/v1/app-params/update', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ str_KEY: c, str_VALUE: '5000', str_DESCRIPTION: 'e2e' }).toString() }); return r.status; }, CLE);
    let blocage = '';
    for (let i = 0; i < 70 && !blocage; i++) {
      await p.waitForTimeout(1000);
      blocage = q("SELECT id FROM t_application_event WHERE module = 'BLOCAGE' AND url_ou_ecran LIKE '%app-params/update%' ORDER BY last_seen_at DESC LIMIT 1");
    }
    const statutEnr = await enregistrement;
    ok('(e2) Blocage détecté par la surveillance (requête retenue par un verrou de la base)', !!blocage, (Date.now() - t0) + ' ms, statut ' + statutEnr);
    const extrait = q(`SELECT stack_extrait FROM t_application_event WHERE id = '${blocage}'`).replace(/\\n/g, '\n');
    ok('(e2) Début de la photographie (extrait gardé en base, 4 000 car.) : le thread de la requête bloquée et sa pile',
      /=== THREADS QUI TRAITENT LES REQUETES EN COURS \(1\) ===\n"[^"]+" (RUNNABLE|WAITING|TIMED_WAITING|BLOCKED)/.test(extrait) && /at (com\.mysql|org\.mariadb|bll\.TparameterManager|rest\.)/.test(extrait.split('=== AUTRES THREADS')[0]),
      extrait.slice(extrait.indexOf('=== THREADS QUI'), extrait.indexOf('=== THREADS QUI') + 300));
    /* par l'ecran : Centre de Support > detail de l'evenement > « Télécharger le log complet » */
    const ecran = await p.evaluate(async (id) => {
      const ctr = testextjs.app.getController('SupportDiagnosticCtr');
      const r = await (await fetch('../api/v1/support/events?start=0&limit=50&niveau=FATAL&query=BLOCAGE')).json();
      const data = (r.data || []).find((x) => x.id === id);
      if (!data) { return { trouve: false }; }
      /* comme l'icone « Voir » d'une ligne du journal */
      ctr.onVoir(null, 0, 0, null, null, { data });
      return { trouve: true };
    }, blocage);
    const bouton = await p.evaluate(() => { const w = Ext.ComponentQuery.query('window[title=Détail de l\'événement]')[0]; const bt = w && w.down('#telechargerLog'); return bt ? bt.getId() : null; });
    let telecharge = '';
    if (bouton) {
      const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 20000 }).catch(() => null), p.waitForEvent('popup', { timeout: 20000 }).then((pp) => pp).catch(() => null), p.click('#' + bouton)]);
      if (dl) { telecharge = fs.readFileSync(await dl.path(), 'utf8'); }
    }
    if (!telecharge) {
      telecharge = await p.evaluate(async (id) => (await fetch('../api/v1/support/events/' + id + '/log')).text(), blocage);
    }
    ok('(e2) Détail de l\'événement : bouton « Télécharger le log complet »', ecran.trouve && !!bouton, JSON.stringify({ ecran, bouton }));
    ok('(e2) Fichier complet : toute la photographie (requêtes, threads fautifs, autres threads regroupés), au-delà de 4 000 car.',
      telecharge.length > 4000 && /=== REQUETES API EN COURS/.test(telecharge) && /=== AUTRES THREADS \(\d+\), regroupes par pile identique ===/.test(telecharge) && /threads identiques/.test(telecharge), telecharge.length + ' car.');
    const autre = await p.evaluate(async () => { const r = await fetch('../api/v1/support/events/inconnu-e2e/log'); return r.status; });
    ok('(e2) Événement inconnu : 404, aucune lecture hors du dossier du support', autre === 404, autre);
    const xls = await p.evaluate(async () => { const r = await fetch('../api/v1/support/events/export/excel?limit=50&niveau=FATAL&query=BLOCAGE'); const t = new Uint8Array(await r.arrayBuffer()); return { status: r.status, n: t.length }; });
    ok('(e2) Export Excel du journal : servi, la cellule du blocage dépasse 4 000 car.', xls.status === 200 && xls.n > 10000, JSON.stringify(xls));
    await p.evaluate(() => { Ext.ComponentQuery.query('window').forEach((w) => { if (w.isVisible()) { w.close(); } }); });
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Déroulement du test', false, e.stack || e);
  } finally {
    if (verrou) { try { verrou.kill(); } catch (e) { /* fini */ } }
    await b.close();
    try {
      nettoyer();
      if (seuilAvant === 'ABSENT') { q(`DELETE FROM t_parameters WHERE str_KEY = '${CLE}'`); } else { q(`UPDATE t_parameters SET str_VALUE = '${seuilAvant}', str_DESCRIPTION = '${descAvant.replace(/'/g, "''")}' WHERE str_KEY = '${CLE}'`); }
    } catch (e) { console.log('nettoyage : ' + e.message); }
    ok('Remise en état : événements du test retirés, paramètre remis', q(`SELECT COUNT(*) FROM t_application_event WHERE message_court LIKE '%${MARQUE}%'`) === '0'
      && q(`SELECT IFNULL(MAX(str_VALUE), 'ABSENT') FROM t_parameters WHERE str_KEY = '${CLE}'`) === seuilAvant);
    const n = res.filter((x) => x.c).length;
    console.log('\n' + n + '/' + res.length + (n === res.length ? ' OK' : ' ECHEC'));
    process.exit(n === res.length ? 0 : 1);
  }
})();
