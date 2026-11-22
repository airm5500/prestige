/* JOURNAL DES MESSAGES (plan du 21/11, point 8.1).
 *
 * Menu CAMPAGNES SMS / WHATSAPP > « Journal des messages » (droit P_SM_JOURNAL_MESSAGES), ouvert par le menu.
 * Jeu d'essai varie, clients FICTIFS (ZZJM, numeros 01009903xx) :
 *  - SMS a des clients : avoir distribue, rappel a deux destinataires (un envoye, un refuse « numero invalide »),
 *    campagne en attente, notification bloquee (LOCK, motif par defaut) ; une notification servie par WhatsApp n'a
 *    PAS de ligne SMS ;
 *  - WhatsApp : avoir simule, avis lu, facture refusee, rappel distribue, lien wa.me ouvert ;
 *  - SMS au numero d'administration : ticket Z envoye par le vrai bouton « Envoyer SMS » (GESTION COURANTE > Ticket Z),
 *    vers un faux fournisseur local (rien ne sort du poste) ; trace dans le journal, statut seulement.
 * Controles :
 *  - rapprochement ligne par ligne : ecran = API = CSV (bouton « Export CSV ») = attendu calcule depuis la base ;
 *  - compteurs (envoyes, distribues, lus, echecs, en attente) = base ;
 *  - filtres par l'ecran : canal, origine, etat, recherche par nom (sans accent) et par numero ;
 *  - ticket Z : une ligne de journal (origine Ticket Z), etat = celui du bouton, aucun texte garde ;
 *  - droit : sans P_SM_JOURNAL_MESSAGES, l'API refuse ;
 *  - delai de l'export CSV sous 15 s ; 1366x768, 1280x720, 1920x1080 : colonnes et compteurs visibles ;
 *  - bilan : les traces attendues et rien d'autre ; tout est retire.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const http = require('http');
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 700) + ']' : '')); }
const DB = ENV_E2E.BASE;
/* SQL par l'entree standard : les accents passes en argument sont mal transmis sous Windows */
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', '--raw', DB, '-sN'], { input: s, encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\r/g, '').trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', DB], { input: s, encoding: 'utf8' });
const PFX = 'E2E-JM';
const debut = q('SELECT NOW()');
const USER = q(`SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN}'`);
const USER_NOM = q(`SELECT TRIM(CONCAT(COALESCE(str_FIRST_NAME,''),' ',COALESCE(str_LAST_NAME,''))) FROM t_user WHERE lg_USER_ID = '${USER}'`);
const CAT = (n) => q(`SELECT id FROM categorie_notification WHERE name = '${n}'`);

/* clients fictifs : id, prenom, nom, telephone */
const CLIENTS = [[PFX + '-C1', 'ZZJM Aya', 'KOUASSI', '0100990301'], [PFX + '-C2', 'ZZJM Élodie', 'KONÉ', '0100990302'], [PFX + '-C3', 'ZZJM Paul', "N'GUESSAN", '0100990303']];
const nomClient = (i) => (CLIENTS[i][1] + ' ' + CLIENTS[i][2]).trim();

/* faux fournisseur SMS (ticket Z) : rien ne sort du poste */
const recus = [];
const serveur = http.createServer((req, rep) => {
  let corps = '';
  req.on('data', (c) => { corps += c; });
  req.on('end', () => {
    if (req.method === 'POST' && /\/v1\/messages\/send$/.test(req.url)) {
      recus.push(corps.length);
      rep.writeHead(200, { 'Content-Type': 'application/json' });
      rep.end(JSON.stringify({ id: 'FAUX-JM-' + recus.length }));
      return;
    }
    rep.writeHead(404); rep.end('{}');
  });
});

function preparer(port) {
  exec("DROP TABLE IF EXISTS e2e_jm_sms_param; CREATE TABLE e2e_jm_sms_param AS SELECT p.* FROM sms_fournisseur_param p JOIN sms_fournisseur f ON f.id = p.fournisseur_id WHERE f.code = 'LETEXTO';"
    + 'DROP TABLE IF EXISTS e2e_jm_sms_f; CREATE TABLE e2e_jm_sms_f AS SELECT * FROM sms_fournisseur;');
  const lt = q("SELECT id FROM sms_fournisseur WHERE code = 'LETEXTO'");
  exec(`UPDATE sms_fournisseur SET en_vigueur = 0; UPDATE sms_fournisseur SET actif = 1, en_vigueur = 1, dlr_callback_url = NULL WHERE id = '${lt}';`
    + `DELETE FROM sms_fournisseur_param WHERE fournisseur_id = '${lt}';`
    + [['base_url', 'http://127.0.0.1:' + port], ['api_key', 'essai-e2e'], ['sender_name', 'ESSAI']].map(([c, v]) => `INSERT INTO sms_fournisseur_param (id, fournisseur_id, cle, valeur) VALUES (LEFT(UUID(), 36), '${lt}', '${c}', '${v}');`).join(''));
  exec(CLIENTS.map(([id, pre, nom, tel]) => 'INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, str_TELEPHONE, str_ADRESSE, str_SEXE, lg_TYPE_CLIENT_ID, str_STATUT,'
    + ` dt_CREATED, dt_UPDATED, bool_CONSENT_WHATSAPP, bool_CONSENT_SMS) VALUES ('${id}', '${pre.replace(/'/g, "''")}', '${nom.replace(/'/g, "''")}', '${tel}', NULL, 'F', '6', 'enable', NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 1 DAY, 1, 1);`).join(''));
  /* notifications SMS : [id, categorie, statut notification, secondes avant maintenant, [[client, statut, livraison, code, motif, envoyeAvant]]] */
  const N = [
    ['N1', 'AVOIR_PRODUIT', 'SENT', 400, [[0, 'SENT', 'DELIVERED_TO_TERMINAL', null, null, 390]]],
    ['N2', 'RAPPEL_HABITUDE', 'SENT', 380, [[0, 'SENT', 'ACCEPTED_BY_PROVIDER', null, null, 370], [1, 'NOT_SEND', null, 'NUMERO_INVALIDE', 'Numéro non mobile ivoirien : préfixe inconnu', null]]],
    ['N3', 'CAMPAGNE', 'SENT', 360, [[2, 'NOT_SEND', null, null, null, null]]],
    ['N4', 'ENTREE_EN_STOCK', 'LOCK', 340, [[1, 'NOT_SEND', null, null, null, null]]],
    ['N5', 'AVOIR_PRODUIT', 'SENT', 320, [[2, 'NOT_SEND', null, null, null, null]]]
  ];
  let s = '';
  N.forEach(([id, cat, st, av, dest], k) => {
    s += `INSERT INTO notification (id, created_at, modfied_at, user_id, message, statut, type_notification, number_attempt, entity_ref) VALUES ('${PFX}-${id}', NOW() - INTERVAL ${av} SECOND, NOW(), '${USER}', 'E2E', '${st}', ${CAT(cat)}, 0, '${PFX}');`;
    dest.forEach(([c, ncs, liv, code, motif, env], j) => {
      s += 'INSERT INTO notification_client (id, notification_id, client_id, statut, sent_at, delivery_status, error_code, error_message, poll_count) VALUES ('
        + `'${PFX}-NC${k + 1}${j}', '${PFX}-${id}', '${CLIENTS[c][0]}', '${ncs}', ${env ? `NOW() - INTERVAL ${env} SECOND` : 'NULL'}, ${liv ? `'${liv}'` : 'NULL'}, ${code ? `'${code}'` : 'NULL'}, ${motif ? `'${motif}'` : 'NULL'}, 0);`;
    });
  });
  /* WhatsApp : [id, notification, client, statut, erreur, origine, mode, utilisateur, secondes avant] */
  const W = [
    ['W1', 'N5', 2, 'SIMULE', null, 'AVOIR', 'API', null, 315],
    ['W2', null, 0, 'LU', null, 'AVIS', 'API', USER, 300],
    ['W3', null, 1, 'ECHEC', 'Le client a refusé WhatsApp', 'FACTURE', 'API', USER, 290],
    ['W4', null, 0, 'DELIVRE', null, 'RAPPEL', 'WEB', null, 280],
    ['W5', null, 1, 'OUVERT', null, 'LIEN', 'LIEN', USER, 270]
  ];
  W.forEach(([id, n, c, st, err, ori, mode, u, av]) => {
    s += 'INSERT INTO whatsapp_message (id, notification_id, client_id, telephone, mode, simule, statut, message_id, erreur, repli_sms, created_at, updated_at, origine, utilisateur_id) VALUES ('
      + `'${PFX}-${id}', ${n ? `'${PFX}-${n}'` : 'NULL'}, '${CLIENTS[c][0]}', '${CLIENTS[c][3]}', '${mode}', ${st === 'SIMULE' ? 1 : 0}, '${st}', NULL, ${err ? `'${err.replace(/'/g, "''")}'` : 'NULL'}, 0,`
      + ` NOW() - INTERVAL ${av} SECOND, NOW() - INTERVAL ${av} SECOND, '${ori}', ${u ? `'${u}'` : 'NULL'});`;
  });
  exec(s);
}
function remettre() {
  exec(`DELETE FROM whatsapp_message WHERE id LIKE '${PFX}-%' OR client_id LIKE '${PFX}-C%';`
    + `DELETE FROM notification_client WHERE notification_id LIKE '${PFX}-%' OR client_id LIKE '${PFX}-C%';`
    + `DELETE FROM notification WHERE id LIKE '${PFX}-%';`
    + `DELETE FROM t_client WHERE lg_CLIENT_ID LIKE '${PFX}-C%';`
    + `DELETE FROM message_administration WHERE created_at >= '${debut}' AND utilisateur_id = '${USER}';`
    + `DELETE FROM t_event_log WHERE dt_CREATED >= '${debut}' AND str_DESCRIPTION LIKE 'Ticket Z envoy%pharmacien (SMS)%' AND lg_USER_ID = '${USER}';`);
  if (q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'e2e_jm_sms_param'") === '1') {
    exec("DELETE p FROM sms_fournisseur_param p JOIN sms_fournisseur f ON f.id = p.fournisseur_id WHERE f.code = 'LETEXTO';"
      + 'INSERT INTO sms_fournisseur_param SELECT * FROM e2e_jm_sms_param; DROP TABLE e2e_jm_sms_param;'
      + 'UPDATE sms_fournisseur f JOIN e2e_jm_sms_f s ON s.id = f.id SET f.actif = s.actif, f.en_vigueur = s.en_vigueur, f.dlr_mode = s.dlr_mode, f.dlr_callback_url = s.dlr_callback_url;'
      + 'DROP TABLE e2e_jm_sms_f;');
  }
}

/* attendu, calcule depuis la base par une regle ecrite a part (pas celle du serveur) */
function attenduBase() {
  const l = [];
  const etatW = (s) => ({ ECHEC: 'Échec', LU: 'Lu', DELIVRE: 'Distribué', ENVOYE: 'Envoyé', SIMULE: 'Envoyé', OUVERT: 'Envoyé' }[s] || 'En attente');
  const ORI = { AVOIR: 'Avoir', AVIS: 'Avis client', FACTURE: 'Facture', RAPPEL: 'Rappel', LIEN: 'Lien wa.me', CAMPAGNE: 'Campagne' };
  q(`SELECT CONCAT_WS('|', w.id, DATE_FORMAT(w.created_at, '%d/%m/%Y %H:%i:%s'), w.statut, IFNULL(w.erreur, ''), w.telephone, TRIM(CONCAT(c.str_FIRST_NAME, ' ', c.str_LAST_NAME)), w.origine, IFNULL(w.utilisateur_id, ''))`
    + ` FROM whatsapp_message w JOIN t_client c ON c.lg_CLIENT_ID = w.client_id WHERE w.id LIKE '${PFX}-%'`).split('\n').filter(Boolean).forEach((x) => {
    const [id, date, st, err, tel, nom, ori, u] = x.split('|');
    const etat = etatW(st);
    l.push({ id: 'W' + id, date, canal: 'WhatsApp', origine: ORI[ori], destinataire: nom, numero: tel, etat, motif: etat === 'Échec' ? (err || 'Refusé par WhatsApp') : '', utilisateur: u ? USER_NOM : '' });
  });
  q(`SELECT CONCAT_WS('|', nc.id, DATE_FORMAT(COALESCE(nc.sent_at, n.created_at), '%d/%m/%Y %H:%i:%s'), n.statut, nc.statut, IFNULL(nc.delivery_status, ''), IFNULL(nc.error_code, ''), IFNULL(nc.error_message, ''), c.str_TELEPHONE, TRIM(CONCAT(c.str_FIRST_NAME, ' ', c.str_LAST_NAME)), cat.name)`
    + ` FROM notification_client nc JOIN notification n ON n.id = nc.notification_id JOIN categorie_notification cat ON cat.id = n.type_notification JOIN t_client c ON c.lg_CLIENT_ID = nc.client_id`
    + ` WHERE n.id LIKE '${PFX}-%' AND NOT EXISTS (SELECT 1 FROM whatsapp_message w WHERE w.notification_id = n.id AND w.client_id = nc.client_id)`).split('\n').filter(Boolean).forEach((x) => {
    const [id, date, ns, ncs, liv, code, msg, tel, nom, cat] = x.split('|');
    const etat = liv === 'DELIVERED_TO_TERMINAL' ? 'Distribué' : liv === 'DELIVERY_IMPOSSIBLE' ? 'Échec' : ncs === 'SENT' ? 'Envoyé' : (ns === 'LOCK' || code) ? 'Échec' : 'En attente';
    const origine = { AVOIR_PRODUIT: 'Avoir', RAPPEL_HABITUDE: 'Rappel', CAMPAGNE: 'Campagne' }[cat] || 'Notification';
    l.push({ id: 'S' + id, date, canal: 'SMS', origine, destinataire: nom, numero: tel, etat, motif: etat === 'Échec' ? (msg || code || 'Refusé par le fournisseur SMS') : '', utilisateur: USER_NOM });
  });
  /* plus recent d'abord, puis identifiant decroissant */
  const cle = (x) => x.date.replace(/^(\d\d)\/(\d\d)\/(\d{4}) /, '$3$2$1 ');
  l.sort((a, b) => (cle(a) < cle(b) ? 1 : cle(a) > cle(b) ? -1 : (a.id < b.id ? 1 : -1)));
  return l;
}
const CHAMPS = ['date', 'canal', 'origine', 'destinataire', 'numero', 'etat', 'motif', 'utilisateur'];
const enLigne = (x) => CHAMPS.map((c) => x[c] || '').join(' | ');
function lireCsv(t) {
  const l = []; let ligne = [], champ = '', dans = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (dans) { if (ch === '"' && t[i + 1] === '"') { champ += '"'; i++; } else if (ch === '"') { dans = false; } else { champ += ch; } }
    else if (ch === '"') { dans = true; } else if (ch === ';') { ligne.push(champ); champ = ''; } else if (ch === '\r') { continue; }
    else if (ch === '\n') { ligne.push(champ); champ = ''; l.push(ligne); ligne = []; } else { champ += ch; }
  }
  return l;
}

(async () => {
  ok('Préalable : migration passée (table, droit, sous-menu), numéros fictifs libres, utilisateur d\'essai',
    q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'message_administration'") === '1'
    && q("SELECT COUNT(*) FROM t_sous_menu WHERE str_COMPOSANT = 'journalmessages' AND P_KEY = 'P_SM_JOURNAL_MESSAGES'") === '1'
    && q("SELECT COUNT(*) FROM t_client WHERE str_TELEPHONE LIKE '01009903%'") === '0' && !!USER);
  if (res.some((x) => !x.c)) { process.exit(1); }
  await new Promise((r) => serveur.listen(0, '127.0.0.1', r));
  remettre();
  const admin0 = q('SELECT COUNT(*) FROM message_administration');
  const notif0 = q('SELECT COUNT(*) FROM notification');
  let b = null;
  try {
    preparer(serveur.address().port);
    b = await ENV_E2E.lancer(chromium);
    const ctx = await b.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true });
    const p = await ctx.newPage();
    const erreurs = []; p.on('pageerror', (e) => erreurs.push(String(e.message)));
    const dialogues = []; p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');

    /* 1. ticket Z par SMS, par le vrai bouton */
    await vues.ouvrirMenu(p, 'GESTION COURANTE', 'Ticket Z');
    await p.waitForSelector('.ticketz-carte, .ticketz-vide', { timeout: 60000 });
    const periode = async (jour) => {
      const champ = async (sel) => {
        const id = await p.evaluate((s) => Ext.ComponentQuery.query('ticketzmanager ' + s)[0].inputEl.id, sel);
        await p.click('#' + id); await p.keyboard.press('Control+A'); await p.keyboard.type(jour, { delay: 15 }); await p.keyboard.press('Tab');
      };
      await champ('#dtStart'); await champ('#dtEnd');
      await p.click('.ticketz .x-btn:has-text("Afficher")');
      await p.waitForTimeout(1500);
      await p.waitForSelector('.ticketz-carte, .ticketz-vide', { timeout: 60000 });
    };
    /* a) periode sans mouvement : rien n'est envoye, le bouton le dit (avant : erreur interne, « Échec : réessayer ») */
    await periode('01/01/2001');
    const [repVide] = await Promise.all([
      p.waitForResponse((r) => r.url().indexOf('/caisse/send-sms') > 0, { timeout: 60000 }),
      p.click('.ticketz .x-btn:has-text("Envoyer SMS")')]);
    const oVide = await repVide.json().catch(() => ({ brut: true }));
    await p.waitForTimeout(300);
    const boutonVide = await p.evaluate(() => Ext.ComponentQuery.query('ticketzmanager #sms')[0].getText());
    ok('Ticket Z d\'une période sans mouvement : « Non envoyé : aucun mouvement sur la période » dans le bouton, aucun SMS, aucune trace d\'envoi',
      oVide.statut === 'Non envoyé : aucun mouvement sur la période' && boutonVide === 'SMS : Non envoyé : aucun mouvement sur la période' && recus.length === 0
      && q(`SELECT COUNT(*) FROM message_administration WHERE created_at >= '${debut}' AND utilisateur_id = '${USER}'`) === '0', JSON.stringify({ oVide, boutonVide }));
    await p.waitForTimeout(2700);
    /* b) dernier jour de vente de la base : un vrai ticket Z */
    const jourVente = q("SELECT DATE_FORMAT(MAX(dt_UPDATED), '%d/%m/%Y') FROM t_preenregistrement WHERE str_STATUT = 'is_Closed' AND dt_UPDATED <= NOW()");
    await periode(jourVente);
    ok('Ticket Z du ' + jourVente + ' affiché', await p.locator('.ticketz-carte').count() > 0);
    const [repZ] = await Promise.all([
      p.waitForResponse((r) => r.url().indexOf('/caisse/send-sms') > 0, { timeout: 60000 }),
      p.click('.ticketz .x-btn:has-text("Envoyer SMS")')]);
    const oZ = await repZ.json().catch(() => ({}));
    await p.waitForTimeout(300);
    const bouton = await p.evaluate(() => Ext.ComponentQuery.query('ticketzmanager #sms')[0].getText());
    const trace = q(`SELECT CONCAT_WS('|', origine, statut, IFNULL(motif, ''), IFNULL(telephone, ''), IFNULL(fournisseur, ''), canal) FROM message_administration WHERE created_at >= '${debut}' AND utilisateur_id = '${USER}'`).split('\n').filter(Boolean);
    const t = (trace[0] || '').split('|');
    ok('Ticket Z par SMS : une ligne au journal (origine TICKET_Z, canal SMS), état = réponse = bouton',
      trace.length === 1 && t[0] === 'TICKET_Z' && t[5] === 'SMS'
      && ((t[1] === 'ENVOYE' && oZ.statut === 'Envoyé' && bouton === 'SMS envoyé' && recus.length === 1)
        || (t[1] !== 'ENVOYE' && oZ.statut === t[2] && bouton === 'SMS : ' + t[2] && recus.length === 0)),
      JSON.stringify({ trace, oZ, bouton, recus: recus.length }));
    const colonnes = q("SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY ORDINAL_POSITION) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'message_administration'");
    ok('La trace ne garde aucun texte de message', colonnes === 'id,created_at,canal,origine,telephone,statut,motif,fournisseur,message_id,utilisateur_id', colonnes);

    /* 2. ecran par le menu */
    await vues.ouvrirMenu(p, 'CAMPAGNES SMS / WHATSAPP', 'Journal des messages');
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('journalmessages')[0]; return e && e.isVisible(true) && !e.journal.isLoading() && e.journal.lastOptions; }, null, { timeout: 60000 });
    const derniere = { rep: null };
    p.on('response', async (r) => { if (/api\/v1\/journal-messages\?/.test(r.url())) { derniere.rep = await r.json().catch(() => null); } });
    const lancer = async () => {
      derniere.rep = null;
      const att = p.waitForResponse((r) => /api\/v1\/journal-messages\?/.test(r.url()), { timeout: 60000 });
      await vues.cliquer(p, 'journalmessages #jmChercher');
      const r = await att;
      const j = await r.json();
      await p.waitForFunction(() => !Ext.ComponentQuery.query('journalmessages')[0].journal.isLoading(), null, { timeout: 30000 });
      await p.waitForTimeout(400);
      return j;
    };
    const saisirRecherche = async (texte) => {
      const id = await p.evaluate(() => Ext.ComponentQuery.query('journalmessages #jmRecherche')[0].inputEl.id);
      await p.click('#' + id); await p.keyboard.press('Control+A'); await p.keyboard.press('Delete');
      if (texte) { await p.keyboard.type(texte, { delay: 15 }); }
    };
    const lireEcran = () => p.evaluate(() => {
      const e = Ext.ComponentQuery.query('journalmessages')[0], g = e.down('#jmJournal'), v = g.getView(), cols = g.columns;
      const lignes = [];
      e.journal.each((r) => {
        const n = v.getNode(r);
        const t = cols.map((c) => { const td = n && n.querySelector(v.getCellSelector(c)); return td ? td.textContent.trim() : null; });
        lignes.push(t);
      });
      const comp = {};
      document.querySelectorAll('.jm-compteurs [data-jm]').forEach((x) => { comp[x.getAttribute('data-jm')] = Number(x.querySelector('b').textContent.replace(/\s/g, '')); });
      return { lignes, comp, entetes: cols.map((c) => c.text) };
    });
    const versEcran = (x) => [x.date, x.canal, x.origine, x.destinataire, x.numero, x.etat, x.motif, x.utilisateur || 'Automatique'];
    const comparer = async (titre, filtre) => {
      const j = await lancer();
      const e = await lireEcran();
      const ref = attenduBase().filter(filtre);
      const api = (j.data || []).map((x) => ({ date: x.date, canal: x.canal, origine: x.origineLibelle, destinataire: x.destinataire, numero: x.numero, etat: x.etat, motif: x.motif, utilisateur: x.utilisateur }));
      const ecarts = [];
      const n = Math.max(ref.length, api.length, e.lignes.length);
      for (let i = 0; i < n; i++) {
        const r0 = ref[i] ? enLigne(ref[i]) : '-', a0 = api[i] ? enLigne(api[i]) : '-', e0 = e.lignes[i] ? e.lignes[i].join(' | ') : '-';
        if (r0 !== a0 || (ref[i] && e0 !== versEcran(ref[i]).join(' | '))) { ecarts.push(`#${i} base ${r0} / api ${a0} / écran ${e0}`); }
      }
      const cpt = { total: ref.length, envoyes: ref.filter((x) => ['Envoyé', 'Distribué', 'Lu'].includes(x.etat)).length,
        distribues: ref.filter((x) => ['Distribué', 'Lu'].includes(x.etat)).length, lus: ref.filter((x) => x.etat === 'Lu').length,
        echecs: ref.filter((x) => x.etat === 'Échec').length, attente: ref.filter((x) => x.etat === 'En attente').length };
      const cptOk = Object.keys(cpt).every((k) => cpt[k] === e.comp[k] && cpt[k] === j.compteurs[k]);
      ok(titre, ecarts.length === 0 && cptOk && j.total === ref.length, ecarts.join(' ; ') + ' compteurs base ' + JSON.stringify(cpt) + ' écran ' + JSON.stringify(e.comp) + ' api ' + JSON.stringify(j.compteurs));
      return { j, e, ref };
    };

    await saisirRecherche('ZZJM');
    const tous = await comparer('Recherche « ZZJM » : écran = API = base, ligne par ligne, même ordre ; compteurs identiques', () => true);
    ok('Jeu attendu : 10 messages (5 SMS, 5 WhatsApp) ; envoyés 6, distribués 3, lus 1, échecs 3, en attente 1 ; la notification servie par WhatsApp n\'a pas de ligne SMS',
      tous.ref.length === 10 && tous.ref.filter((x) => x.canal === 'SMS').length === 5
      && Object.entries({ total: 10, attente: 1, envoyes: 6, distribues: 3, lus: 1, echecs: 3 }).every(([k, v]) => tous.j.compteurs[k] === v)
      && !tous.ref.some((x) => x.id === 'S' + PFX + '-NC50'), JSON.stringify(tous.j.compteurs));
    ok('Colonnes : Date, Canal, Origine, Destinataire, Numéro, État, Motif d\'échec, Utilisateur',
      tous.e.entetes.join('|') === "Date|Canal|Origine|Destinataire|Numéro|État|Motif d'échec|Utilisateur", tous.e.entetes.join('|'));

    /* 3. export CSV par le bouton : memes lignes, meme ordre ; delai */
    const t0 = Date.now();
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), vues.cliquer(p, 'journalmessages #jmExport')]);
    const chemin = await dl.path();
    const delai = Date.now() - t0;
    const contenu = require('fs').readFileSync(chemin, 'utf8');
    const csv = lireCsv(contenu.replace(/^﻿/, ''));
    const attenduCsv = tous.ref.map((x) => CHAMPS.map((c) => x[c] || ''));
    ok('Export CSV (bouton) : en-tête, puis les 10 lignes de l\'écran, mêmes valeurs, même ordre ; UTF-8 avec BOM',
      contenu.charCodeAt(0) === 0xFEFF && csv[0].join(';') === "Date;Canal;Origine;Destinataire;Numéro;État;Motif d'échec;Utilisateur"
      && JSON.stringify(csv.slice(1)) === JSON.stringify(attenduCsv) && /^journal-messages-\d{4}-\d\d-\d\d\.csv$/.test(dl.suggestedFilename()),
      dl.suggestedFilename() + ' ' + JSON.stringify(csv.slice(0, 3)));
    ok('Délai de l\'export CSV sous 15 s', delai < 15000, delai + ' ms');

    /* 4. filtres par l'ecran */
    await vues.choisir(p, 'journalmessages #jmCanal', 'WhatsApp');
    await comparer('Filtre canal WhatsApp : 5 lignes, écran = API = base', (x) => x.canal === 'WhatsApp');
    await vues.choisir(p, 'journalmessages #jmCanal', 'Tous');
    await vues.choisir(p, 'journalmessages #jmOrigine', 'Avoir');
    const av = await comparer('Filtre origine Avoir : SMS distribué + WhatsApp simulé, écran = API = base', (x) => x.origine === 'Avoir');
    ok('Origine Avoir : 2 lignes', av.ref.length === 2, av.ref.length);
    await vues.choisir(p, 'journalmessages #jmOrigine', 'Toutes');
    await vues.choisir(p, 'journalmessages #jmEtat', 'Échec');
    const ec = await comparer('Filtre état Échec : numéro invalide, notification bloquée, refus WhatsApp ; motifs', (x) => x.etat === 'Échec');
    ok('Motifs d\'échec : celui du fournisseur, le motif par défaut, celui de WhatsApp', ec.ref.map((x) => x.motif).sort().join(' / ') === 'Le client a refusé WhatsApp / Numéro non mobile ivoirien : préfixe inconnu / Refusé par le fournisseur SMS',
      ec.ref.map((x) => x.motif).join(' / '));
    await vues.choisir(p, 'journalmessages #jmEtat', 'Tous');
    await saisirRecherche('kone');
    await comparer('Recherche par nom sans accent (« kone » trouve « KONÉ »)', (x) => x.destinataire === nomClient(1));
    await saisirRecherche('01 00 99 03 03');
    await comparer('Recherche par numéro (avec espaces)', (x) => x.numero === CLIENTS[2][3]);

    /* 5. ticket Z dans le journal (numero d'administration) */
    await saisirRecherche('');
    await vues.choisir(p, 'journalmessages #jmOrigine', 'Ticket Z');
    const jz = await lancer();
    const ez = await lireEcran();
    const zBase = q(`SELECT COUNT(*) FROM message_administration WHERE origine = 'TICKET_Z' AND DATE(created_at) = CURDATE()`);
    const notre = (jz.data || []).filter((x) => x.utilisateur === USER_NOM && x.destinataire === "Numéro d'administration");
    ok('Filtre origine Ticket Z : le SMS du ticket Z apparaît (numéro d\'administration, canal SMS, état de la trace) ; nombre = base ; écran = API',
      Number(zBase) === jz.total && notre.length >= 1 && notre[0].canal === 'SMS' && notre[0].etat === (t[1] === 'ENVOYE' ? 'Envoyé' : 'Échec')
      && ez.lignes.length === Math.min(jz.total, 50) && ez.lignes.every((l, i) => l[5] === jz.data[i].etat && l[3] === jz.data[i].destinataire),
      JSON.stringify({ zBase, total: jz.total, notre }));
    await vues.choisir(p, 'journalmessages #jmOrigine', 'Toutes');
    await saisirRecherche('ZZJM');
    await lancer();

    /* 6. tailles d'ecran */
    for (const [lg, ht] of [[1366, 768], [1280, 720], [1920, 1080]]) {
      await p.setViewportSize({ width: lg, height: ht }); await p.waitForTimeout(900);
      const v = await p.evaluate(() => {
        const e = Ext.ComponentQuery.query('journalmessages')[0], g = e.down('#jmJournal');
        const r = g.getEl().dom.getBoundingClientRect();
        const cols = g.columns.map((c) => { const x = c.getEl().dom.getBoundingClientRect(); return x.right <= r.right + 1 && x.width >= 50; });
        const comp = Array.from(document.querySelectorAll('.jm-compteurs [data-jm]')).every((x) => { const y = x.getBoundingClientRect(); return y.width > 0 && y.right <= window.innerWidth; });
        const etats = Array.from(g.getEl().dom.querySelectorAll('.av-msg')).every((x) => { const td = x.closest('td').getBoundingClientRect(), y = x.getBoundingClientRect(); return y.right <= td.right + 1; });
        const boutons = ['#jmChercher', '#jmExport'].every((s) => { const c = e.down(s); const y = c.getEl().dom.getBoundingClientRect(); return c.isVisible(true) && y.right <= window.innerWidth && y.width > 40; });
        return { cols: cols.every(Boolean), comp, etats, boutons, bas: r.bottom <= window.innerHeight + 1 };
      });
      ok(`${lg}×${ht} : 8 colonnes dans la grille, compteurs, états entiers, boutons Rechercher et Export visibles`, v.cols && v.comp && v.etats && v.boutons && v.bas, JSON.stringify(v));
    }

    /* 7. droit */
    const sansDroit = await p.evaluate(async () => {
      const r = await fetch('../api/v1/journal-messages?dtStart=2026-11-01&dtEnd=2026-11-01'); return r.json();
    });
    ok('Avec le droit : l\'API répond', sansDroit.success === true);
    const role = q(`SELECT ru.lg_ROLE_ID FROM t_role_user ru WHERE ru.lg_USER_ID = '${USER}' LIMIT 1`);
    const priv = q("SELECT lg_PRIVELEGE_ID FROM t_privilege WHERE str_NAME = 'P_SM_JOURNAL_MESSAGES'");
    exec(`DROP TABLE IF EXISTS e2e_jm_rp; CREATE TABLE e2e_jm_rp AS SELECT rp.* FROM t_role_privelege rp JOIN t_role_user ru ON ru.lg_ROLE_ID = rp.lg_ROLE_ID WHERE ru.lg_USER_ID = '${USER}' AND rp.lg_PRIVILEGE_ID = '${priv}';`
      + `DELETE rp FROM t_role_privelege rp JOIN t_role_user ru ON ru.lg_ROLE_ID = rp.lg_ROLE_ID WHERE ru.lg_USER_ID = '${USER}' AND rp.lg_PRIVILEGE_ID = '${priv}';`);
    let refus = null, menu = null;
    try {
      const p2 = await (await b.newContext()).newPage();
      await vues.connexion(p2, ENV_E2E.LOGIN, 'e2etest');
      refus = await p2.evaluate(async () => (await fetch('../api/v1/journal-messages')).json());
      menu = await p2.evaluate(() => { let t = false; Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().cascadeBy((n) => { if (n.get('id') === 'journalmessages') { t = true; } }); return t; });
      await p2.close();
    } finally {
      exec('INSERT INTO t_role_privelege SELECT * FROM e2e_jm_rp; DROP TABLE e2e_jm_rp;');
    }
    ok('Sans le droit : menu absent et API refusée', refus && refus.success === false && /accès au journal/.test(refus.msg) && menu === false, JSON.stringify({ refus, menu, role }));

    /* 8. bilan */
    ok('Bilan : une seule trace d\'administration ajoutée (le ticket Z), aucune notification créée par le journal, aucun SMS au faux fournisseur hors ticket Z',
      Number(q('SELECT COUNT(*) FROM message_administration')) === Number(admin0) + 1
      && Number(q(`SELECT COUNT(*) FROM notification WHERE id NOT LIKE '${PFX}-%'`)) === Number(notif0) && recus.length <= 1,
      q('SELECT COUNT(*) FROM message_administration') + ' / ' + admin0 + ' ; SMS ' + recus.length);
    ok('Aucune erreur JavaScript, aucune fenêtre du navigateur', erreurs.length === 0 && dialogues.length === 0, erreurs.concat(dialogues).join(' | '));
  } catch (e) {
    ok('Exécution sans exception', false, e && e.stack);
  } finally {
    if (b) { await b.close(); }
    serveur.close();
    try { remettre(); } catch (e) { console.log('nettoyage : ' + e.message); }
    ok('Nettoyage : données d\'essai, trace du ticket Z et fournisseur SMS remis',
      q(`SELECT COUNT(*) FROM notification WHERE id LIKE '${PFX}-%'`) === '0' && q(`SELECT COUNT(*) FROM whatsapp_message WHERE id LIKE '${PFX}-%'`) === '0'
      && q(`SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID LIKE '${PFX}-C%'`) === '0' && q('SELECT COUNT(*) FROM message_administration') === admin0
      && q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE 'e2e\\_jm\\_%'") === '0');
    const k = res.filter((x) => x.c).length;
    console.log('\n' + k + '/' + res.length + (k === res.length ? ' OK' : ' ECHEC'));
    process.exit(k === res.length ? 0 : 1);
  }
})();
