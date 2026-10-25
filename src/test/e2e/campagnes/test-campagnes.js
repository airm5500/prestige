/* CAMPAGNES SMS / WHATSAPP (besoins du 11/10, lot 4), par l'ecran.
 *
 * Jeu d'essai isole (clients fictifs ZZCAMPAGNE, numeros fictifs) et compte WhatsApp en MODE TEST : aucun message
 * reel ne part (les envois du test passent par WhatsApp simule, jamais par SMS).
 *  - menu : 9 onglets dont « Rappels traitement » (l'ecran existant) ; volet automatique desactive par defaut ;
 *  - propositions : « Préparer les propositions du jour » -> anniversaires du jour (refus SMS et numero invalide
 *    ecartes avec leur motif) ; la cloche compte les messages proposes ; on decoche un client, on envoie en WhatsApp
 *    (confirmation dans le bouton, sans fenetre) ; le decoche ne recoit rien ; pas de seconde proposition le meme jour ;
 *  - fetes : date d'une fete « a saisir » renseignee dans le calendrier ; proposition de la fete ; abandon (rien
 *    n'est envoye) ;
 *  - infos clients : filtres (recherche, sexe), motifs d'exclusion, « accord explicite seulement », message modifie
 *    (texte libre), apercu personnalise (nom de famille / prenom), envoi WhatsApp simule ;
 *  - journal ; le texte libre n'est conserve ni dans les tables des campagnes ni dans les journaux du serveur ;
 *  - sans le droit P_SM_CAMPAGNES, l'API refuse ; aucune fenetre, aucune erreur JavaScript ; tout est remis.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const fs = require('fs');
const privilegeEssai = require('../support/privilege-essai');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const URL = 'http://localhost:8080/prestige';
const LOG = '/opt/payara5/glassfish/domains/domain1/logs/server.log';
const droit = privilegeEssai(q, exec, 'admin', 'P_SM_CAMPAGNES');

const A = 'E2E-CMP-A', B = 'E2E-CMP-B', C = 'E2E-CMP-C', D = 'E2E-CMP-D', E = 'E2E-CMP-E';
const clients = "('" + [A, B, C, D, E].join("','") + "')";
const AUJ = q('SELECT CURDATE()');
const ANNEE = AUJ.slice(0, 4);
const NAISS = (an) => an + AUJ.slice(4);
const TEXTE_LIBRE = 'Bonjour {prenom}, essai e2e ' + Date.now() + ' de la pharmacie.';
const CAT = q("SELECT id FROM categorie_notification WHERE name = 'CAMPAGNE'");

function nettoyer(debut) {
  exec("DELETE FROM whatsapp_message WHERE client_id IN " + clients + ";"
    + "DELETE nc FROM notification_client nc WHERE nc.client_id IN " + clients + ";"
    + "DELETE FROM notification WHERE type_notification = " + CAT + " AND entity_ref IN " + clients + ";"
    + (debut ? "DELETE l FROM t_campagne_ligne l JOIN t_campagne c ON c.id = l.campagne_id WHERE c.created_at >= '" + debut + "';"
      + "DELETE FROM t_campagne WHERE created_at >= '" + debut + "';" : '')
    + "DELETE FROM t_campagne_ligne WHERE lg_CLIENT_ID IN " + clients + ";"
    + "DELETE FROM t_client WHERE lg_CLIENT_ID IN " + clients + ";");
}

(async () => {
  droit.remettre();
  nettoyer(null);
  const debut = q('SELECT NOW()');
  const compteAvant = q("SELECT CONCAT_WS('|', actif, mode_test, COALESCE(phone_number_id,'~'), COALESCE(access_token,'~')) FROM whatsapp_compte WHERE mode = 'API'");
  const modeAvant = q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_WHATSAPP_MODE_DEFAUT'");
  const paramsAvant = q("SELECT GROUP_CONCAT(CONCAT(str_KEY, '=', str_VALUE) ORDER BY str_KEY SEPARATOR ';') FROM t_parameters WHERE str_KEY LIKE 'KEY_CAMPAGNE_%'");
  const tabaskiAvant = q(`SELECT COALESCE(MAX(date_fete), '') FROM t_fete_date WHERE code = 'TABASKI' AND annee = ${ANNEE}`);
  const tabaskiActif = q("SELECT actif + 0 FROM t_fete WHERE code = 'TABASKI'");
  const tailleLog = fs.statSync(LOG).size;
  ok('Précondition : aucun vrai client actif né un ' + AUJ.slice(5), q("SELECT COUNT(*) FROM t_client WHERE str_STATUT = 'enable' AND DATE_FORMAT(dt_NAISSANCE, '%m-%d') = DATE_FORMAT(CURDATE(), '%m-%d')") === '0');
  exec("UPDATE whatsapp_compte SET actif = 1, mode_test = 1, phone_number_id = COALESCE(phone_number_id, '1234567890'), access_token = COALESCE(access_token, 'E2E-CMP-JETON') WHERE mode = 'API';"
    + "UPDATE t_parameters SET str_VALUE = 'API' WHERE str_KEY = 'KEY_WHATSAPP_MODE_DEFAUT';"
    + "INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, lg_TYPE_CLIENT_ID, str_ADRESSE, str_SEXE, dt_NAISSANCE, dt_CREATED, dt_UPDATED, str_STATUT) VALUES"
    + ` ('${A}', 'ZZCAMPAGNE', 'AWA', '1', '07 07 07 07 11', 'F', '${NAISS(1990)}', NOW(), NOW(), 'enable'),`
    + ` ('${B}', 'ZZCAMPAGNE', 'BINTOU', '1', '0707070712', 'F', '${NAISS(1985)}', NOW(), NOW(), 'enable'),`
    + ` ('${C}', 'ZZCAMPAGNE', 'CHANTAL', '1', '', 'F', '${NAISS(2000)}', NOW(), NOW(), 'enable'),`
    + ` ('${D}', 'ZZCAMPAGNE', 'DRISSA', '1', '0707070714', 'M', '1970-05-05', NOW(), NOW(), 'enable'),`
    + ` ('${E}', 'ZZCAMPAGNE', 'EMMA', '1', '0707070715', 'F', '${NAISS(1995)}', NOW(), NOW(), 'enable');`
    + `UPDATE t_client SET bool_CONSENT_SMS = 0 WHERE lg_CLIENT_ID = '${B}';`
    + `UPDATE t_client SET bool_CONSENT_WHATSAPP = 1 WHERE lg_CLIENT_ID = '${D}';`);

  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const dialogues = [], err = [];
  const ouvrir = async (p) => {
    p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
    p.on('pageerror', (e) => err.push(String(e.message)));
    await p.goto(URL + '/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(2000);
  };
  const onglet = async (p, titre) => { await p.click('.campagnes .x-tab:has-text("' + titre + '")'); await p.waitForTimeout(1500); };
  /* clic reel sur un composant trouve par requete Ext (les itemId ne sont pas des id HTML) */
  const cliquer = async (p, requete) => {
    const id = await p.evaluate((r) => { const c = Ext.ComponentQuery.query(r)[0]; return c && c.getEl() ? c.getEl().id : null; }, requete);
    if (!id) { throw new Error('Composant introuvable : ' + requete); }
    await p.click('#' + id);
  };
  const texteBouton = (p, requete) => p.evaluate((r) => Ext.ComponentQuery.query(r)[0].getText(), requete);
  try {
    const p = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
    await ouvrir(p);
    const nav = await p.evaluate(() => { let t = null; Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().cascadeBy((n) => {
      if (n.get('id') === 'campagnes') { const m = n.parentNode; t = m.get('text') + ' > ' + m.childNodes.map((x) => x.get('text')).join(', '); } }); return t; });
    /* 25/10 : « Discussions WhatsApp » ajoute au meme menu */
    ok('Menu « Campagnes SMS / WhatsApp » (menu principal) : sous-menus Campagnes, Comptes WhatsApp et Discussions WhatsApp', nav === 'Campagnes SMS / WhatsApp > Campagnes, Comptes WhatsApp, Discussions WhatsApp', nav);
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('campagnes', {}));
    await p.waitForFunction(() => { const v = Ext.ComponentQuery.query('campagnes')[0]; return v && v.contexte; }, null, { timeout: 60000 });
    await p.waitForTimeout(1000);
    const tabs = await p.evaluate(() => Ext.ComponentQuery.query('campagnes')[0].items.items.filter((t) => t.tab && !t.tab.hidden).map((t) => t.title.replace(/ \(\d+\)$/, '')));
    ok('9 onglets, dont Rappels traitement', tabs.join('|') === 'Propositions|Anniversaires|Fêtes|Infos clients|Infos pharmacie|Personnalisé|Rappels traitement|Journal|Paramètres', tabs.join('|'));
    const bandeau = await p.evaluate(() => Ext.ComponentQuery.query('campagnes #ongletPropositions #bandeau')[0].getEl().dom.textContent);
    ok('Volet automatique désactivé par défaut (bandeau)', /préparation automatique est désactivée/.test(bandeau) && q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_CAMPAGNE_AUTO_ACTIF'") === '0', bandeau);

    /* --- propositions : anniversaires du jour */
    await p.click('.campagnes .x-btn:has-text("Préparer les propositions du jour")');
    await p.waitForFunction(() => Ext.ComponentQuery.query('campagnes #listePropositions')[0].getStore().getCount() > 0, null, { timeout: 30000 });
    await p.waitForTimeout(1200);
    const prop = await p.evaluate(() => { const o = Ext.ComponentQuery.query('campagnes #ongletPropositions')[0]; const g = o.down('#destinataires');
      const l = {}; g.getStore().each((r) => { l[r.get('client')] = r.get('joignable') ? 'OK' : r.get('motif'); });
      return { titre: o.down('#listePropositions').getStore().getAt(0).get('titre'), l, coches: g.getSelectionModel().getCount(), onglet: o.title }; });
    ok('Proposition « Anniversaires du jour » : seuls les clients nés ce jour', /^Anniversaires du /.test(prop.titre) && Object.keys(prop.l).sort().join(',') === 'ZZCAMPAGNE AWA,ZZCAMPAGNE BINTOU,ZZCAMPAGNE CHANTAL,ZZCAMPAGNE EMMA', JSON.stringify(prop));
    ok('Refus SMS et numéro invalide écartés avec leur motif ; joignables cochés', prop.l['ZZCAMPAGNE BINTOU'] === 'A refusé les SMS' && prop.l['ZZCAMPAGNE CHANTAL'] === 'Numéro absent ou invalide'
      && prop.l['ZZCAMPAGNE AWA'] === 'OK' && prop.coches === 2 && prop.onglet === 'Propositions (2)', JSON.stringify(prop));
    const cloche = await p.evaluate(async () => { const r = await (await fetch('../api/v1/notifications-centre/compteurs?cles=campagnes')).json();
      return { n: r.compteurs.campagnes, actif: PrestigeNotif.actives().some((x) => x.key === 'campagnes') }; });
    ok('Cloche : 2 messages proposés, catégorie affichée d\'office', cloche.n === 2 && cloche.actif, JSON.stringify(cloche));
    /* on decoche EMMA, on passe en WhatsApp (simule), on envoie */
    await p.evaluate((e) => { const g = Ext.ComponentQuery.query('campagnes #ongletPropositions #destinataires')[0]; g.getSelectionModel().deselect(g.getStore().findRecord('clientId', e)); }, E);
    await p.evaluate(() => { Ext.ComponentQuery.query('campagnes #ongletPropositions #canal')[0].setValue('WHATSAPP'); });
    await p.waitForTimeout(1200);
    await p.evaluate(() => { Ext.ComponentQuery.query('campagnes #ongletPropositions #modele')[0].setValue('MODELE_ANNIVERSAIRE'); });
    const avant = await texteBouton(p, 'campagnes #envoyerProposition');
    await cliquer(p, 'campagnes #envoyerProposition');
    await p.waitForTimeout(300);
    const conf = await texteBouton(p, 'campagnes #envoyerProposition');
    ok('Bouton « Envoyer à 1 client(s) », confirmation dans le bouton (sans fenêtre)', avant === 'Envoyer à 1 client(s)' && /Confirmer l'envoi à 1 client/.test(conf), avant + ' → ' + conf);
    await cliquer(p, 'campagnes #envoyerProposition');
    await p.waitForFunction(() => /en cours d'envoi/.test(Ext.ComponentQuery.query('campagnes #ongletPropositions #etat')[0].getEl().dom.textContent), null, { timeout: 30000 });
    await p.waitForTimeout(4000);
    const lignes = q(`SELECT GROUP_CONCAT(CONCAT(l.lg_CLIENT_ID, ':', l.statut) ORDER BY l.lg_CLIENT_ID) FROM t_campagne_ligne l JOIN t_campagne c ON c.id = l.campagne_id WHERE c.categorie = 'ANNIVERSAIRE' AND c.origine = 'AUTO' AND c.created_at >= '${debut}'`);
    ok('Envoyé à AWA seulement ; EMMA décochée ; écartés conservés', lignes === `${A}:PREPARE,${B}:EXCLU,${C}:EXCLU,${E}:DECOCHE`, lignes);
    const wa = q(`SELECT GROUP_CONCAT(CONCAT(client_id, ':', statut, ':', simule + 0)) FROM whatsapp_message WHERE client_id IN ${clients}`);
    ok('WhatsApp simulé (mode test) pour AWA, rien pour EMMA', wa === `${A}:SIMULE:1`, wa);
    ok('Proposition envoyée, cloche à 0', q(`SELECT statut FROM t_campagne WHERE categorie = 'ANNIVERSAIRE' AND origine = 'AUTO' AND created_at >= '${debut}'`) === 'ENVOYEE'
      && await p.evaluate(async () => (await (await fetch('../api/v1/notifications-centre/compteurs?cles=campagnes')).json()).compteurs.campagnes) === 0);
    await p.click('.campagnes .x-btn:has-text("Préparer les propositions du jour")');
    await p.waitForTimeout(2500);
    ok('Pas de seconde proposition le même jour', q(`SELECT COUNT(*) FROM t_campagne WHERE categorie = 'ANNIVERSAIRE' AND origine = 'AUTO' AND date_cible = CURDATE()`) === '1');

    /* --- fetes : date saisie dans le calendrier, proposition, abandon */
    await onglet(p, 'Fêtes');
    await p.evaluate(() => { Ext.ComponentQuery.query('campagnes #calendrier')[0].expand(false); });
    await p.waitForTimeout(1500);
    await p.evaluate(() => { const g = Ext.ComponentQuery.query('campagnes #calendrier')[0]; const r = g.getStore().findRecord('code', 'TABASKI');
      g.findPlugin('cellediting').startEdit(r, g.down('#colDate')); });
    await p.waitForTimeout(400);
    await p.keyboard.press('Control+A');
    await p.keyboard.type(AUJ.slice(8, 10) + '/' + AUJ.slice(5, 7) + '/' + ANNEE);
    await p.keyboard.press('Enter');
    await p.waitForTimeout(2500);
    ok('Calendrier : date de Tabaski saisie pour ' + ANNEE, q(`SELECT date_fete FROM t_fete_date WHERE code = 'TABASKI' AND annee = ${ANNEE}`) === AUJ);
    exec("UPDATE t_fete SET actif = 1 WHERE code = 'TABASKI'");
    await onglet(p, 'Propositions');
    await p.click('.campagnes .x-btn:has-text("Préparer les propositions du jour")');
    await p.waitForFunction(() => Ext.ComponentQuery.query('campagnes #listePropositions')[0].getStore().getCount() > 0, null, { timeout: 30000 });
    const fete = await p.evaluate(() => Ext.ComponentQuery.query('campagnes #listePropositions')[0].getStore().getAt(0).get('titre'));
    ok('Proposition de la fête du jour', /^Fêtes — Tabaski/.test(fete), fete);
    await cliquer(p, 'campagnes #abandonner');
    await p.waitForTimeout(300);
    ok('Abandon à confirmer dans le bouton', await texteBouton(p, 'campagnes #abandonner') === 'Confirmer : ne rien envoyer');
    await cliquer(p, 'campagnes #abandonner');
    await p.waitForTimeout(2500);
    ok('Abandon : rien n\'est envoyé', q(`SELECT CONCAT(statut, ':', nb_envoyes) FROM t_campagne WHERE categorie = 'FETE' AND created_at >= '${debut}'`) === 'ABANDONNEE:0'
      && q(`SELECT COUNT(*) FROM t_campagne_ligne l JOIN t_campagne c ON c.id = l.campagne_id WHERE c.categorie = 'FETE' AND c.created_at >= '${debut}' AND l.lg_NOTIFICATION_ID IS NOT NULL`) === '0');

    /* --- infos clients : filtres, accord explicite, texte libre, envoi */
    await onglet(p, 'Infos clients');
    await p.evaluate(() => { const o = Ext.ComponentQuery.query('campagnes #onglet-INFO_CLIENTS')[0]; o.down('#recherche').setValue('ZZCAMPAGNE'); o.down('#sexe').setValue('F'); o.down('#canal').setValue('SMS'); });
    await p.waitForTimeout(1000);
    await cliquer(p, 'campagnes #onglet-INFO_CLIENTS #voir');
    await p.waitForTimeout(2500);
    let pop = await p.evaluate(() => { const g = Ext.ComponentQuery.query('campagnes #onglet-INFO_CLIENTS #destinataires')[0]; const l = []; g.getStore().each((r) => l.push(r.get('client') + '=' + (r.get('joignable') ? 'OK' : r.get('motif')))); return { l, titre: g.title, c: g.getSelectionModel().getCount() }; });
    ok('Filtres recherche + sexe F : 4 clientes, joignables d\'abord', pop.l.length === 4 && pop.l[0].endsWith('=OK') && pop.l[1].endsWith('=OK') && pop.c === 2 && /2 joignable\(s\) sur 4/.test(pop.titre), JSON.stringify(pop));
    await p.evaluate(() => { const o = Ext.ComponentQuery.query('campagnes #onglet-INFO_CLIENTS')[0]; o.down('#sexe').setValue(''); o.down('#canal').setValue('WHATSAPP'); o.down('#accord').setValue(true); });
    await p.waitForTimeout(1000);
    await cliquer(p, 'campagnes #onglet-INFO_CLIENTS #voir');
    await p.waitForTimeout(2500);
    pop = await p.evaluate(() => { const g = Ext.ComponentQuery.query('campagnes #onglet-INFO_CLIENTS #destinataires')[0]; const l = {}; g.getStore().each((r) => { l[r.get('client')] = r.get('joignable') ? 'OK' : r.get('motif'); }); return { l, c: g.getSelectionModel().getCount() }; });
    ok('WhatsApp + accord explicite seulement : DRISSA seul joignable, les autres « Pas d\'accord explicite »', pop.c === 1 && pop.l['ZZCAMPAGNE DRISSA'] === 'OK' && pop.l['ZZCAMPAGNE AWA'] === 'Pas d\'accord explicite', JSON.stringify(pop));
    /* cocher un non-joignable est impossible */
    const forcer = await p.evaluate((a) => { const g = Ext.ComponentQuery.query('campagnes #onglet-INFO_CLIENTS #destinataires')[0]; g.getSelectionModel().select(g.getStore().findRecord('clientId', a), true); return g.getSelectionModel().getCount(); }, A);
    ok('Un client non joignable ne se coche pas', forcer === 1, forcer);
    await p.evaluate((t) => { Ext.ComponentQuery.query('campagnes #onglet-INFO_CLIENTS #texte')[0].setValue(t); }, TEXTE_LIBRE);
    await p.waitForTimeout(2000);
    const ap = await p.evaluate(() => Ext.ComponentQuery.query('campagnes #onglet-INFO_CLIENTS #apercu')[0].getEl().dom.textContent);
    ok('Aperçu personnalisé : prénom (DRISSA), nom de famille non pris pour le prénom', ap.indexOf('Bonjour DRISSA, essai e2e') === 0 && /Pour ZZCAMPAGNE DRISSA/.test(ap), ap);
    ok('Bouton « Envoyer à 1 client(s) »', await texteBouton(p, 'campagnes #onglet-INFO_CLIENTS #envoyer') === 'Envoyer à 1 client(s)');
    await cliquer(p, 'campagnes #onglet-INFO_CLIENTS #envoyer');
    await p.waitForTimeout(300);
    await cliquer(p, 'campagnes #onglet-INFO_CLIENTS #envoyer');
    await p.waitForFunction(() => /en cours d'envoi/.test(Ext.ComponentQuery.query('campagnes #onglet-INFO_CLIENTS #etat')[0].getEl().dom.textContent), null, { timeout: 30000 });
    await p.waitForTimeout(4000);
    ok('Campagne manuelle « Infos clients » : DRISSA, WhatsApp simulé, message saisi (pas de modèle)',
      q(`SELECT CONCAT(origine, ':', statut, ':', canal, ':', COALESCE(lg_MODELE, 'LIBRE'), ':', nb_envoyes, ':', accord_explicite + 0) FROM t_campagne WHERE categorie = 'INFO_CLIENTS' AND created_at >= '${debut}'`) === 'MANUEL:ENVOYEE:WHATSAPP:LIBRE:1:1'
      && q(`SELECT statut FROM whatsapp_message WHERE client_id = '${D}'`) === 'SIMULE');

    /* --- journal, confidentialite */
    await onglet(p, 'Journal');
    await p.waitForTimeout(1000);
    const journal = await p.evaluate(() => { const l = []; Ext.ComponentQuery.query('campagnes #journal')[0].getStore().each((r) => l.push(r.get('titre') + '|' + r.get('statut') + '|' + r.get('origine'))); return l; });
    ok('Journal : proposition envoyée, fête abandonnée, campagne manuelle', journal.some((x) => /^Anniversaires.*\|ENVOYEE\|Proposition$/.test(x)) && journal.some((x) => /^Fêtes — Tabaski.*\|ABANDONNEE\|Proposition$/.test(x))
      && journal.some((x) => /^Infos clients.*\|ENVOYEE\|Manuelle$/.test(x)), journal.slice(0, 4).join(' ; '));
    const marque = TEXTE_LIBRE.slice(16, 40);
    const log = fs.readFileSync(LOG, 'utf8').slice(tailleLog);
    ok('Texte libre absent des tables des campagnes et des journaux du serveur',
      q(`SELECT COUNT(*) FROM t_campagne c JOIN t_campagne_ligne l ON l.campagne_id = c.id WHERE CONCAT_WS('|', c.id, c.lg_MODELE, l.motif) LIKE '%${marque.replace(/'/g, "''")}%'`) === '0' && log.indexOf(marque) < 0);

    /* --- sans le droit */
    droit.retirer();
    const p2 = await (await b.newContext()).newPage();
    await ouvrir(p2);
    const refus = await p2.evaluate(async () => [(await (await fetch('../api/v1/campagnes/contexte')).json()),
      (await (await fetch('../api/v1/campagnes/envoyer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ categorie: 'PERSONNALISE', clientIds: ['x'], message: 'x' }) })).json())]);
    ok('Sans le droit : l\'API refuse', refus.every((x) => x.success === false && /accès aux campagnes/.test(x.message)), JSON.stringify(refus));
    droit.remettre();
    ok('Aucune fenêtre, aucune erreur JavaScript', dialogues.length === 0 && err.length === 0, dialogues.concat(err).join(' | '));
  } catch (e) {
    ok('Exécution sans exception', false, e.stack);
  } finally {
    droit.remettre();
    await b.close();
    nettoyer(debut);
    const v = compteAvant.split('|').map((x) => (x === '~' ? 'NULL' : "'" + x.replace(/'/g, "''") + "'"));
    exec(`UPDATE whatsapp_compte SET actif = ${v[0]}, mode_test = ${v[1]}, phone_number_id = ${v[2]}, access_token = ${v[3]} WHERE mode = 'API';`
      + `UPDATE t_parameters SET str_VALUE = '${modeAvant}' WHERE str_KEY = 'KEY_WHATSAPP_MODE_DEFAUT';`
      + paramsAvant.split(';').map((kv) => `UPDATE t_parameters SET str_VALUE = '${kv.split('=')[1]}' WHERE str_KEY = '${kv.split('=')[0]}';`).join('')
      + (tabaskiAvant ? `UPDATE t_fete_date SET date_fete = '${tabaskiAvant}' WHERE code = 'TABASKI' AND annee = ${ANNEE};` : `DELETE FROM t_fete_date WHERE code = 'TABASKI' AND annee = ${ANNEE};`)
      + `UPDATE t_fete SET actif = ${tabaskiActif} WHERE code = 'TABASKI';`);
    ok('Jeu d\'essai, campagnes, compte, paramètres et calendrier remis', q("SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID IN " + clients) === '0'
      && q(`SELECT COUNT(*) FROM t_campagne WHERE created_at >= '${debut}'`) === '0'
      && q("SELECT CONCAT_WS('|', actif, mode_test, COALESCE(phone_number_id,'~'), COALESCE(access_token,'~')) FROM whatsapp_compte WHERE mode = 'API'") === compteAvant);
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
