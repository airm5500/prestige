/* FILS DE DISCUSSION WHATSAPP (demande du 25/10, repris du CRM UBIPHARM).
 *
 * Chemin reel des reponses : POST /api/v1/whatsapp/webhook-web avec le jeton partage (comme le service WhatsApp Web),
 * corps {entrants:[{numero, texte, type, nom, id}]}. Puis par les vues (admin) : CAMPAGNES SMS / WHATSAPP >
 * Discussions WhatsApp. Jeu d'essai isole (clients ZZDISC), compte WEB en mode test (aucun envoi reel), remis a la fin.
 *  - deux reponses du client A (dont une depuis l'ancien identifiant a 8 chiffres) et une du client B (qui a dit STOP) ;
 *    le meme message recu deux fois n'est garde qu'une fois ;
 *  - liste : A avec son nom de client et 2 non lus, B marque STOP ; recherche par mot du message ; « Non lues » ;
 *  - clic sur A : le fil, dans l'ordre, et les non lus passent a lus ;
 *  - reponse depuis un texte avec {prenom} : bouton « Envoyer » -> « Confirmer l'envoi » -> envoi simule ; la bulle
 *    affiche le prenom remplace, l'auteur et « simulé » ; reponse avec un PDF joint ;
 *  - B (STOP) : zone de reponse fermee avec le motif ; l'API refuse aussi ;
 *  - sans session : 401 ; le journal du serveur ne contient ni le texte des messages ni les numeros ;
 *  - aucune erreur JavaScript, aucune fenetre du navigateur. Donnees de l'essai retirees.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { connexion, ouvrirMenu, cliquer } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const WEBHOOK = 'http://localhost:8080/prestige/api/v1/whatsapp/webhook-web';
const LOG = '/opt/payara5/glassfish/domains/domain1/logs/server.log';
const JETON = 'jeton-essai-disc-' + Date.now();
const IDS = "('E2E-DISC-A','E2E-DISC-B')";
const NUMS = "('0708771122','0508773344')";
const QUESTION = 'Bonjour, avez-vous du Doliprane 1000 ?';
const lit = (s) => (s === 'NULL' ? 'NULL' : "'" + s.replace(/'/g, "''") + "'");
const envoyer = (entrants) => fetch(WEBHOOK, { method: 'POST', headers: { Authorization: 'Bearer ' + JETON, 'Content-Type': 'application/json' },
  body: JSON.stringify({ statuts: [], entrants }) }).then((r) => r.status);

(async () => {
  const debut = q('SELECT NOW()');
  const sauveCompte = q("SELECT CONCAT_WS('|', actif, mode_test, IFNULL(web_jeton, 'NULL')) FROM whatsapp_compte WHERE mode = 'WEB'").split('|');
  const sauveMode = q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_WHATSAPP_MODE_DEFAUT'");
  const tailleLog = fs.statSync(LOG).size;
  const pdf = path.join(os.tmpdir(), 'essai-discussion.pdf');
  fs.writeFileSync(pdf, '%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
  const table = q("SHOW TABLES LIKE 'whatsapp_discussion'");
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1500, height: 900 } })).newPage();
  const erreurs = [], dialogues = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  try {
    exec('DELETE FROM t_client WHERE lg_CLIENT_ID IN ' + IDS + ';'
      + `UPDATE whatsapp_compte SET web_jeton = '${JETON}', mode_test = 1 WHERE mode = 'WEB';`
      + "UPDATE t_parameters SET str_VALUE = 'WEB' WHERE str_KEY = 'KEY_WHATSAPP_MODE_DEFAUT';"
      + 'INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, lg_TYPE_CLIENT_ID, str_ADRESSE, str_SEXE, dt_CREATED, dt_UPDATED, str_STATUT) VALUES'
      + " ('E2E-DISC-A', 'Awa', 'ZZDISC', '1', '07 08 77 11 22', 'F', NOW(), NOW(), 'enable'),"
      + " ('E2E-DISC-B', 'Bintou', 'ZZDISC', '1', '0508773344', 'F', NOW(), NOW(), 'enable');"
      + "UPDATE t_client SET bool_CONSENT_WHATSAPP = 1 WHERE lg_CLIENT_ID = 'E2E-DISC-A';"
      + "UPDATE t_client SET bool_CONSENT_WHATSAPP = 0 WHERE lg_CLIENT_ID = 'E2E-DISC-B';");
    ok('Table des discussions créée par la migration', table === 'whatsapp_discussion', table);
    const s1 = await envoyer([{ numero: '2250708771122', texte: QUESTION, type: 'TEXTE', nom: 'Awa WA', id: 'E2E-DISC-M1' }]);
    await envoyer([{ numero: '2250708771122', texte: QUESTION, type: 'TEXTE', nom: 'Awa WA', id: 'E2E-DISC-M1' }]);
    await envoyer([{ numero: '22508771122', texte: 'Merci beaucoup', type: 'TEXTE', id: 'E2E-DISC-M2' }]);
    await envoyer([{ numero: '2250508773344', texte: 'Bonjour', type: 'TEXTE', id: 'E2E-DISC-M3' }]);
    const enBase = table ? q("SELECT CONCAT_WS('|', COUNT(*), SUM(client_id = 'E2E-DISC-A'), SUM(lu)) FROM whatsapp_discussion WHERE numero = '0708771122'") : '';
    ok('Webhook : 2 messages gardés pour A (doublon ignoré, ancien numéro à 8 chiffres rattaché), non lus', s1 === 200 && enBase === '2|2|0', s1 + ' ' + enBase);

    await connexion(p, 'admin', 'e2etest');
    await ouvrirMenu(p, 'Campagnes SMS / WhatsApp', 'Discussions WhatsApp');
    await p.waitForFunction(() => Ext.ComponentQuery.query('whatsappdiscussions').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await p.waitForFunction(() => document.querySelectorAll('.wad .wad-item[data-numero="0708771122"]').length === 1, null, { timeout: 30000 });
    const liste = await p.evaluate(() => { const l = (n) => { const e = document.querySelector('.wad .wad-item[data-numero="' + n + '"]'); return e ? { nom: e.querySelector('.wad-nom').textContent,
      nl: (e.querySelector('.wad-nl') || {}).textContent || '0', stop: !!e.querySelector('.wad-stop'), dernier: e.querySelector('.wad-dernier').textContent } : null; }; return { a: l('0708771122'), b: l('0508773344') }; });
    ok('Liste : A au nom du client avec 2 non lus ; B marqué STOP', liste.a && /Awa ZZDISC|ZZDISC Awa/.test(liste.a.nom) && liste.a.nl === '2' && /Merci beaucoup/.test(liste.a.dernier) && liste.b && liste.b.stop, JSON.stringify(liste));

    await cliquer(p, 'whatsappdiscussions #recherche');
    await p.keyboard.type('Doliprane');
    await p.waitForTimeout(1500);
    const recherche = await p.evaluate(() => Array.from(document.querySelectorAll('.wad .wad-item')).map((e) => e.getAttribute('data-numero')));
    ok('Recherche « Doliprane » : seulement la discussion de A', recherche.length >= 1 && recherche.includes('0708771122') && !recherche.includes('0508773344'), recherche.join(','));
    await cliquer(p, 'whatsappdiscussions #recherche');
    await p.keyboard.press('Control+A'); await p.keyboard.press('Backspace');
    await p.waitForTimeout(1500);

    await p.click('.wad .wad-item[data-numero="0708771122"]');
    await p.waitForFunction(() => document.querySelectorAll('.wad .wad-fil .wad-msg').length >= 2, null, { timeout: 20000 });
    const fil = await p.evaluate(() => Array.from(document.querySelectorAll('.wad .wad-fil .wad-msg')).map((m) => (m.classList.contains('wad-E') ? 'E:' : 'S:') + m.childNodes[0].textContent));
    const lus = q("SELECT SUM(lu) FROM whatsapp_discussion WHERE numero = '0708771122' AND sens = 'E'");
    await p.waitForTimeout(500);
    const pastille = await p.evaluate(() => !!document.querySelector('.wad .wad-item[data-numero="0708771122"] .wad-nl'));
    ok('Clic sur A : le fil dans l\'ordre ; messages passés à lus, pastille retirée', fil.length === 2 && fil[0].startsWith('E:' + QUESTION) && fil[1].startsWith('E:Merci beaucoup') && lus === '2' && !pastille, JSON.stringify({ fil, lus, pastille }));

    await cliquer(p, 'whatsappdiscussions #texte');
    await p.keyboard.type('Oui {prenom}, nous l\'avons en stock.');
    await cliquer(p, 'whatsappdiscussions #envoyer');
    await p.waitForTimeout(400);
    const confirmer = await p.evaluate(() => Ext.ComponentQuery.query('whatsappdiscussions #envoyer')[0].getText());
    ok('« Envoyer » : la confirmation se fait dans le bouton (« Confirmer l\'envoi »), rien n\'est parti', confirmer === 'Confirmer l\'envoi' && q("SELECT COUNT(*) FROM whatsapp_discussion WHERE numero = '0708771122' AND sens = 'S'") === '0', confirmer);
    await cliquer(p, 'whatsappdiscussions #envoyer');
    await p.waitForFunction(() => document.querySelectorAll('.wad .wad-fil .wad-msg.wad-S').length === 1, null, { timeout: 20000 });
    const bulle = await p.evaluate(() => { const m = document.querySelector('.wad .wad-fil .wad-msg.wad-S'); return { texte: m.childNodes[0].textContent, meta: m.querySelector('.wad-meta').textContent,
      etat: document.querySelector('.wad .wad-etat').textContent, saisie: Ext.ComponentQuery.query('whatsappdiscussions #texte')[0].getValue() }; });
    const sortant = q("SELECT CONCAT_WS('|', d.statut, d.lg_USER_ID = u.lg_USER_ID, d.texte) FROM whatsapp_discussion d JOIN t_user u ON u.str_LOGIN = 'admin' WHERE d.numero = '0708771122' AND d.sens = 'S'");
    ok('Second clic : réponse simulée (mode test), {prenom} remplacé, auteur et « simulé » dans la bulle, zone vidée', bulle.texte === 'Oui Awa, nous l\'avons en stock.'
      && /simulé/.test(bulle.meta) && /simulée/i.test(bulle.etat) && bulle.saisie === '' && /^SIMULE\|1\|Oui Awa/.test(sortant), JSON.stringify({ bulle, sortant }));
    ok('La réponse figure aussi au journal des envois WhatsApp (sans le texte)', q(`SELECT COUNT(*) FROM whatsapp_message WHERE telephone = '0708771122' AND created_at >= '${debut}'`) === '1');

    const champ = await p.evaluate(() => { const f = Ext.ComponentQuery.query('whatsappdiscussions #piece')[0]; return f.fileInputEl.dom.id; });
    await p.setInputFiles('#' + champ, pdf);
    await p.waitForFunction(() => /essai-discussion\.pdf/.test(Ext.ComponentQuery.query('whatsappdiscussions #nomPiece')[0].getEl().dom.textContent), null, { timeout: 10000 });
    await cliquer(p, 'whatsappdiscussions #envoyer');
    await p.waitForTimeout(300);
    await cliquer(p, 'whatsappdiscussions #envoyer');
    await p.waitForFunction(() => document.querySelectorAll('.wad .wad-fil .wad-msg.wad-S').length === 2, null, { timeout: 20000 });
    const avecPiece = await p.evaluate(() => { const l = document.querySelectorAll('.wad .wad-fil .wad-msg.wad-S'); return (l[1].querySelector('.wad-piece') || {}).textContent || ''; });
    ok('Réponse avec un PDF joint seul : partie (simulée), le fil affiche la pièce', /essai-discussion\.pdf/.test(avecPiece)
      && q("SELECT COUNT(*) FROM whatsapp_discussion WHERE numero = '0708771122' AND sens = 'S' AND piece_nom = 'essai-discussion.pdf' AND type = 'DOCUMENT'") === '1', avecPiece);

    await p.click('.wad .wad-item[data-numero="0508773344"]');
    await p.waitForTimeout(1500);
    const stop = await p.evaluate(() => ({ ferme: Ext.ComponentQuery.query('whatsappdiscussions #reponse')[0].isDisabled(), etat: document.querySelector('.wad .wad-entete').textContent }));
    const api = await p.evaluate(() => fetch('../api/v1/whatsapp-discussions/0508773344', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texte: 'essai' }) }).then((r) => r.json()));
    ok('Client B (STOP) : zone de réponse fermée, le motif lisible dans l\'en-tête ; l\'API refuse aussi, rien n\'est gardé', stop.ferme && /STOP/.test(stop.etat) && api.success === false && /STOP/.test(api.message)
      && q("SELECT COUNT(*) FROM whatsapp_discussion WHERE numero = '0508773344' AND sens = 'S'") === '0', JSON.stringify({ stop, api }));

    await cliquer(p, 'whatsappdiscussions #nonLues');
    await p.waitForTimeout(1500);
    const nonLues = await p.evaluate(() => Array.from(document.querySelectorAll('.wad .wad-item')).map((e) => e.getAttribute('data-numero')));
    ok('« Non lues » : A (lu) n\'y est plus', !nonLues.includes('0708771122'), nonLues.join(','));
    const sansSession = await fetch('http://localhost:8080/prestige/api/v1/whatsapp-discussions').then((r) => r.status);
    ok('Sans session : refusé (401)', sansSession === 401, sansSession);
    const log = fs.readFileSync(LOG, 'utf8').slice(tailleLog);
    ok('Journal du serveur : ni le texte des messages, ni les numéros, ni le jeton', !/Doliprane|Merci beaucoup|nous l'avons|08771122|08773344/.test(log) && !log.includes(JETON));
    ok('Aucune erreur JavaScript, aucune fenêtre du navigateur', erreurs.length === 0 && dialogues.length === 0, erreurs.concat(dialogues).join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    if (table) { exec('DELETE FROM whatsapp_discussion WHERE numero IN ' + NUMS); }
    exec(`DELETE FROM whatsapp_message WHERE telephone IN ${NUMS} AND created_at >= '${debut}';`
      + 'DELETE FROM t_client WHERE lg_CLIENT_ID IN ' + IDS + ';'
      + `UPDATE whatsapp_compte SET actif = ${sauveCompte[0]}, mode_test = ${sauveCompte[1]}, web_jeton = ${lit(sauveCompte[2])} WHERE mode = 'WEB';`
      + `UPDATE t_parameters SET str_VALUE = '${sauveMode}' WHERE str_KEY = 'KEY_WHATSAPP_MODE_DEFAUT';`);
    ok('Données de l\'essai retirées, compte et mode remis', q('SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID IN ' + IDS) === '0'
      && (!table || q('SELECT COUNT(*) FROM whatsapp_discussion WHERE numero IN ' + NUMS) === '0')
      && q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_WHATSAPP_MODE_DEFAUT'") === sauveMode);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
