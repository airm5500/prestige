/* ORDONNANCES CLIENTS : RENOUVELLEMENTS ET RAPPEL SMS (retour du 30/09).
 *
 *  - sur l'ordonnance d'origine : « Renouvelable N fois, tous les X jours » ; periodicite obligatoire des qu'il y a un
 *    renouvellement ;
 *  - « Renouveler » cree une NOUVELLE ordonnance liee (rang 1/2, 2/2), datee du jour, memes produits ; plus de bouton
 *    quand tout est fait ;
 *  - l'historique montre l'avancement (RENOUV.) et se filtre sur « A renouveler (7 jours) » ;
 *  - « Rappel SMS » passe par le module SMS existant : une notification RAPPEL_RENOUVELLEMENT (canal SMS) pour le
 *    client, texte du modele « Rappel de renouvellement » ; un client qui a refuse les SMS n'est pas relance.
 *
 * Joue a la souris et au clavier. Tout ce que le test pose est retire a la fin, notifications comprises.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const MB4 = '--default-character-set=utf8mb4';
const exec = (s) => execFileSync('mariadb', [MB4, BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', [MB4, BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const CLIENT = 'E2E-RN-CLIENT';
const REFUS = 'E2E-RN-REFUS';
const NOM = 'ZZRENOUVELLE';
const clients = "('" + CLIENT + "','" + REFUS + "')";

function nettoyer() {
  exec("DELETE nc FROM notification_client nc JOIN notification n ON n.id = nc.notification_id WHERE nc.client_id IN " + clients + ";"
    + "DELETE FROM notification WHERE type_notification = 23 AND entity_ref IN (SELECT lg_ORDONNANCE_ID FROM t_ordonnance_client WHERE lg_CLIENT_ID IN " + clients + ");"
    + "DELETE d FROM t_ordonnance_client_detail d JOIN t_ordonnance_client o ON o.lg_ORDONNANCE_ID = d.lg_ORDONNANCE_ID WHERE o.lg_CLIENT_ID IN " + clients + ";"
    + "UPDATE t_ordonnance_client SET lg_ORDONNANCE_ORIGINE_ID = NULL WHERE lg_CLIENT_ID IN " + clients + ";"
    + "DELETE FROM t_ordonnance_client WHERE lg_CLIENT_ID IN " + clients + ";"
    + "DELETE FROM t_client WHERE lg_CLIENT_ID IN " + clients + ";");
}

(async () => {
  nettoyer();
  exec("INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, lg_TYPE_CLIENT_ID, str_ADRESSE, dt_CREATED, dt_UPDATED, str_STATUT)"
    + " VALUES ('" + CLIENT + "', '" + NOM + "', 'AYA', '6', '0707070707', NOW(), NOW(), 'enable'),"
    + " ('" + REFUS + "', 'ZZREFUSSMS', 'E2E', '6', '0505050505', NOW(), NOW(), 'enable');"
    + "UPDATE t_client SET bool_CONSENT_SMS = 0 WHERE lg_CLIENT_ID = '" + REFUS + "';");
  const produit = q("SELECT f.str_NAME FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID"
    + " WHERE s.int_NUMBER_AVAILABLE > 5 AND f.str_STATUT = 'enable' AND f.str_NAME LIKE 'DOLIPRANE 1G%' LIMIT 1");
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('ordonnanceclient', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('ordonnanceclient #grilleOrdonnances').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    const idDe = (sel) => p.evaluate((s) => { const c = Ext.ComponentQuery.query(s)[0]; return c ? c.getId() : null; }, sel);
    const clic = async (sel, attente) => { await p.click('#' + (await idDe(sel))); await p.waitForTimeout(attente || 900); };
    const boite = () => p.evaluate(() => Ext.MessageBox.isVisible() ? Ext.MessageBox.msg.getEl().dom.textContent : '');
    const repondre = (bt) => p.evaluate((x) => Ext.MessageBox.msgButtons[x].el.dom.click(), bt);
    const saisir = async (sel, texte) => { const id = await idDe(sel); await p.click('#' + id + '-inputEl', { clickCount: 3 }); await p.keyboard.type(texte, { delay: 30 }); };
    const fiche = () => p.evaluate(() => { const f = Ext.ComponentQuery.query('ordonnanceclient #vueFiche')[0]; const e = Ext.ComponentQuery.query('ordonnanceclient')[0];
      return { id: f.down('#ordonnanceId').getValue(), titre: f.down('#enteteOrdonnance').title, info: f.down('#infoRenouvellement').getEl().dom.textContent,
        reglages: f.down('#renouvellements').isVisible(), renouveler: !f.down('button[itemId=renouvelerFiche]').isDisabled(),
        rappel: !f.down('button[itemId=rappelRenouvellement]').isDisabled(), produits: e.storeProduits.getRange().map((r) => r.get('libelle') + ':' + r.get('quantite')).join(',') }; });

    /* ------------------------------------------------ origine : renouvelable 2 fois, tous les 30 jours */
    await clic('ordonnanceclient #grilleOrdonnances button[itemId=nouvelle]', 1500);
    await p.keyboard.type(NOM, { delay: 40 });
    await p.waitForFunction((nom) => { const c = Ext.ComponentQuery.query('ordonnanceclient #vueFiche #ficheClient')[0]; return c.isExpanded && !c.getStore().isLoading() && c.getStore().getCount() === 1 && c.getStore().getAt(0).get('strFIRSTNAME') === nom; }, NOM, { timeout: 15000 });
    await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter');
    await p.waitForTimeout(800);
    await p.keyboard.type(produit.slice(0, 11), { delay: 50 });
    await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('ordonnanceclient #vueFiche #rechercheProduit')[0]; return c.isExpanded && c.getStore().getCount() > 0; }, null, { timeout: 15000 });
    await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter');
    await p.waitForTimeout(900);
    await p.keyboard.type('1 cp matin et soir', { delay: 20 }); await p.keyboard.press('Enter');
    await p.waitForTimeout(400);
    const avant = await p.evaluate(() => Ext.ComponentQuery.query('ordonnanceclient #vueFiche #periodicite')[0].isDisabled());
    ok('Non renouvelable : « tous les … jours » est grisé', avant === true);
    await saisir('ordonnanceclient #vueFiche #renouvellements', '2');
    await p.waitForTimeout(300);
    await saisir('ordonnanceclient #vueFiche #periodicite', '');
    await p.keyboard.press('Backspace'); await p.keyboard.press('Backspace');
    await clic('ordonnanceclient #vueFiche button[itemId=enregistrer]', 1500);
    const refus = await boite();
    ok('Renouvelable sans périodicité : refusé, avec la raison', /tous les combien de jours/.test(refus), refus);
    if (refus) { await repondre('ok'); await p.waitForTimeout(400); }
    await saisir('ordonnanceclient #vueFiche #periodicite', '30');
    await clic('ordonnanceclient #vueFiche button[itemId=enregistrer]', 2500);
    let f = await fiche();
    const origine = q("SELECT CONCAT_WS('|', lg_ORDONNANCE_ID, str_NUMERO, int_RENOUVELLEMENTS, int_PERIODICITE_JOURS, COALESCE(lg_ORDONNANCE_ORIGINE_ID, '-'), int_RANG_RENOUVELLEMENT) FROM t_ordonnance_client WHERE lg_CLIENT_ID = '" + CLIENT + "'").split('|');
    const dans30 = new Date(); dans30.setDate(dans30.getDate() + 30);
    const dans30fr = dans30.toISOString().slice(0, 10).split('-').reverse().join('/');
    ok('Enregistrée : renouvelable 2 fois, tous les 30 jours (origine, rang 0)', origine[2] === '2' && origine[3] === '30' && origine[4] === '-' && origine[5] === '0', origine.join(' | '));
    ok('La fiche dit « 0/2 renouvellement(s) fait(s) — prochain le " + dans30 + " »', /0\/2 renouvellement\(s\) fait\(s\)/.test(f.info) && f.info.indexOf(dans30fr) >= 0 && f.renouveler && f.rappel, JSON.stringify(f));

    /* ------------------------------------------------ Renouveler : nouvelle ordonnance liee */
    await clic('ordonnanceclient #vueFiche button[itemId=renouvelerFiche]', 800);
    const question = await boite();
    ok('« Renouveler » demande confirmation (renouvellement 1/2)', /renouvellement 1\/2/.test(question), question);
    await repondre('yes');
    await p.waitForFunction((o) => { const v = Ext.ComponentQuery.query('ordonnanceclient #vueFiche #ordonnanceId')[0].getValue(); return v && v !== o; }, origine[0], { timeout: 15000 });
    await p.waitForTimeout(1500);
    f = await fiche();
    const r1 = q("SELECT CONCAT_WS('|', lg_ORDONNANCE_ID, str_NUMERO, lg_ORDONNANCE_ORIGINE_ID, int_RANG_RENOUVELLEMENT, dt_ORDONNANCE = CURDATE(), str_OBSERVATIONS) FROM t_ordonnance_client WHERE lg_ORDONNANCE_ORIGINE_ID = '" + origine[0] + "' AND int_RANG_RENOUVELLEMENT = 1").split('|');
    ok('Nouvelle ordonnance liée : rang 1, datée du jour, observation « Renouvellement 1/2 de … »', r1[2] === origine[0] && r1[3] === '1' && r1[4] === '1' && r1[5] === 'Renouvellement 1/2 de l\'ordonnance ' + origine[1] + '.', r1.join(' | '));
    ok('Elle s\'ouvre en saisie : « Renouvellement 1/2 de " + origine + " », mêmes produits, sans réglages', f.id === r1[0] && /Renouvellement 1\/2/.test(f.info) && f.info.indexOf(origine[1]) >= 0 && !f.reglages && f.produits.indexOf(':1') > 0, JSON.stringify(f));
    ok('Le renouvellement a son propre service (à renseigner) et sa propre prévente possible', q("SELECT COUNT(*) FROM t_ordonnance_client_detail WHERE lg_ORDONNANCE_ID = '" + r1[0] + "' AND int_QTE_SERVIE IS NULL") === '1'
      && !(await p.evaluate(() => Ext.ComponentQuery.query('ordonnanceclient #vueFiche button[itemId=creerPrevente]')[0].isDisabled())));
    /* Depuis le renouvellement, on renouvelle encore : rang 2. */
    await clic('ordonnanceclient #vueFiche button[itemId=renouvelerFiche]', 800);
    ok('Depuis le renouvellement : « renouvellement 2/2 »', /renouvellement 2\/2/.test(await boite()), await boite());
    await repondre('yes');
    await p.waitForFunction((a) => { const v = Ext.ComponentQuery.query('ordonnanceclient #vueFiche #ordonnanceId')[0].getValue(); return v && v !== a; }, r1[0], { timeout: 15000 });
    await p.waitForTimeout(1500);
    f = await fiche();
    ok('Rang 2 créé ; tout est fait : « Renouveler » et « Rappel SMS » grisés', /Renouvellement 2\/2/.test(f.info) && !f.renouveler && !f.rappel, JSON.stringify(f));
    const refusApi = await p.evaluate(async (id) => JSON.parse(await (await fetch('../api/v1/ordonnance-client/renouvellement/' + id, { method: 'POST' })).text()), origine[0]);
    ok('Un 3e renouvellement est refusé par le serveur', refusApi.success === false && /déjà été faits/.test(refusApi.message), refusApi.message);

    /* ------------------------------------------------ historique : avancement et « A renouveler » */
    /* B : origine datee d'il y a 25 jours, renouvelable 1 fois tous les 30 jours -> echeance dans 5 jours. */
    const il25 = new Date(); il25.setDate(il25.getDate() - 25);
    const B = await p.evaluate(async ([c, d, pr]) => JSON.parse(await (await fetch('../api/v1/ordonnance-client/enregistrer', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: c, dateOrdonnance: d, renouvellements: 1, periodicite: 30, produits: [{ libelle: pr, quantite: 2 }] }) })).text()), [CLIENT, il25.toISOString().slice(0, 10), 'PRODUIT RENOUVELLEMENT B']);
    ok('Précondition : ordonnance B, échéance dans 5 jours', B.success === true, JSON.stringify(B));
    await clic('ordonnanceclient #vueFiche button[itemId=retourHistorique]', 800);
    if (await boite()) { await repondre('yes'); await p.waitForTimeout(800); }
    await p.evaluate((nom) => { const e = Ext.ComponentQuery.query('ordonnanceclient')[0]; e.down('#barreCriteres #recherche').setValue(nom); }, NOM);
    await p.waitForFunction(() => { const st = Ext.ComponentQuery.query('ordonnanceclient')[0].storeOrdonnances; return !st.isLoading() && st.getCount() === 4; }, null, { timeout: 20000 });
    await p.waitForTimeout(500);
    const colonne = await p.evaluate(() => { const g = Ext.ComponentQuery.query('ordonnanceclient #grilleOrdonnances')[0];
      const idx = g.headerCt.getVisibleGridColumns().findIndex((c) => c.getItemId() === 'colRenouv');
      return g.getStore().getRange().map((r, i) => r.get('numero') + '=' + g.getView().getNode(i).querySelectorAll('td')[idx].textContent.trim()); });
    const t = colonne.join(' | ');
    ok('Colonne RENOUV. : origine « 2/2 — terminé », renouvellements « Renouv. 1/2 » et « 2/2 », B « 0/1 · date »', t.indexOf(origine[1] + '=2/2 — terminé') >= 0 && t.indexOf(r1[1] + '=Renouv. 1/2') >= 0 && /Renouv\. 2\/2/.test(t) && t.indexOf(B.numero + '=0/1 · ') >= 0, t);
    await p.click('#' + (await idDe('ordonnanceclient #barreCriteres #renouveler')) + '-boxLabelEl');
    await p.waitForFunction(() => { const st = Ext.ComponentQuery.query('ordonnanceclient')[0].storeOrdonnances; return !st.isLoading() && st.getCount() === 1; }, null, { timeout: 20000 });
    const filtre = await p.evaluate(() => Ext.ComponentQuery.query('ordonnanceclient')[0].storeOrdonnances.getAt(0).get('numero'));
    ok('« À renouveler (7 jours) » : seulement B (l\'autre chaîne est terminée)', filtre === B.numero, filtre);

    /* ------------------------------------------------ rappel SMS par le module existant */
    const rappel = await p.evaluate(async (id) => JSON.parse(await (await fetch('../api/v1/ordonnance-client/renouvellement/' + id + '/rappel', { method: 'POST' })).text()), B.id);
    await p.waitForTimeout(2500);
    const notif = q("SELECT CONCAT_WS('|', n.type_notification, n.entity_ref, nc.client_id, n.message) FROM notification n JOIN notification_client nc ON nc.notification_id = n.id WHERE n.entity_ref = '" + B.id + "'").split('|');
    ok('Rappel : une notification RAPPEL_RENOUVELLEMENT (canal SMS) pour le client, liée à l\'ordonnance', rappel.success === true && notif[0] === '23' && notif[1] === B.id && notif[2] === CLIENT, JSON.stringify(rappel) + ' / ' + notif.join(' | '));
    ok('Texte du modèle « Rappel de renouvellement », au nom du client', /ZZRENOUVELLE AYA/.test(notif[3]) && /PRODUIT RENOUVELLEMENT B/.test(notif[3]), notif[3]);
    ok('Ce renouvellement est marqué « rappelé » (pas de second rappel automatique)', q("SELECT int_RANG_RAPPELE FROM t_ordonnance_client WHERE lg_ORDONNANCE_ID = '" + B.id + "'") === '1');
    const Bref = await p.evaluate(async ([c, d]) => JSON.parse(await (await fetch('../api/v1/ordonnance-client/enregistrer', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: c, dateOrdonnance: d, renouvellements: 1, periodicite: 30, produits: [{ libelle: 'PRODUIT REFUS', quantite: 1 }] }) })).text()), [REFUS, il25.toISOString().slice(0, 10)]);
    const refusSms = await p.evaluate(async (id) => JSON.parse(await (await fetch('../api/v1/ordonnance-client/renouvellement/' + id + '/rappel', { method: 'POST' })).text()), Bref.id);
    ok('Client qui a refusé les SMS : pas de rappel, raison dite, aucune notification', refusSms.success === false && /refusé les SMS/.test(refusSms.message)
      && q("SELECT COUNT(*) FROM notification WHERE entity_ref = '" + Bref.id + "'") === '0', refusSms.message);
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Parcours sans exception', false, e.message);
  } finally {
    await b.close();
    nettoyer();
    ok('Jeu d\'essai retiré (ordonnances, clients, notifications)', q("SELECT COUNT(*) FROM t_ordonnance_client WHERE lg_CLIENT_ID IN " + clients) === '0'
      && q("SELECT COUNT(*) FROM notification_client WHERE client_id IN " + clients) === '0');
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
