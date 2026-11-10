/* PLAN DU 09/11, POINT 14 : CAMPAGNES > JOURNAL, LE VIOLET NE PASSAIT PAS AU VERT.
 *
 * Jeu d'essai (retire a la fin) : une campagne WhatsApp envoyee, 4 messages (identifiants Meta d'essai) :
 *   M0 LU, M1 DELIVRE, M2 ENVOYE, M3 ENVOYE.
 * Par l'ecran (admin), Campagnes > Journal, ligne de la campagne selectionnee :
 *  - la ligne selectionnee garde les couleurs de l'indicateur d'envoi (segments lu / distribue / envoye) et reste
 *    lisible (fond clair, texte fonce) ;
 *  - statuts recus par le vrai webhook signe (compte d'essai, secret d'essai remis a la fin) :
 *      M0 « sent » en retard -> reste LU ; M1 « sent » -> reste DELIVRE ; M2 « delivered » -> DELIVRE ;
 *      M3 « read » puis « delivered » -> reste LU ; un statut ne recule jamais (base) ;
 *  - sans aucun clic, en 20 s au plus, le journal se met a jour (indicateur, colonnes Distribues et Lus) et la ligne
 *    reste selectionnee ; le suivi sous le journal suit (rapprochement journal = suivi = base) ;
 *  - onglet du journal quitte : plus aucun rechargement du journal ;
 *  - aucune erreur JavaScript, aucune fenetre.
 */
const crypto = require('crypto');
const C = require('../audits/commun');
const { ok, q, exec } = C;
const { ouvrirMenu } = require('../outils/vues');

const CAMP = 'E2E-CJ-W', SECRET = 'E2E-SECRET-JOURNAL-0911';
const INIT = ['LU', 'DELIVRE', 'ENVOYE', 'ENVOYE'];
const mid = (i) => 'wamid.E2E-CJ-' + i;

function nettoyer() {
  exec(`DELETE FROM whatsapp_message WHERE id LIKE '${CAMP}-%'; DELETE FROM t_campagne_ligne WHERE campagne_id = '${CAMP}';`
    + ` DELETE FROM t_campagne WHERE id = '${CAMP}'; DELETE FROM t_client WHERE lg_CLIENT_ID LIKE '${CAMP}-%';`);
}
const statutsBase = () => q(`SELECT GROUP_CONCAT(statut ORDER BY id SEPARATOR ',') FROM whatsapp_message WHERE id LIKE '${CAMP}-M%'`);

(async () => {
  nettoyer();
  const compteAvant = q("SELECT CONCAT_WS('|', actif, mode_test, COALESCE(phone_number_id,'~'), COALESCE(access_token,'~'), COALESCE(app_secret,'~')) FROM whatsapp_compte WHERE mode = 'API'");
  const secretLibre = q("SELECT app_secret IS NULL FROM whatsapp_compte WHERE mode = 'API'") === '1';
  exec(`INSERT INTO t_campagne (id, categorie, origine, statut, canal, nb_cibles, nb_envoyes, nb_exclus, created_at, traitee_at)`
    + ` VALUES ('${CAMP}', 'INFO_CLIENTS', 'MANUEL', 'ENVOYEE', 'WHATSAPP', 4, 4, 0, NOW(), NOW() + INTERVAL 3 DAY)`);
  INIT.forEach((etat, i) => {
    const id = `${CAMP}-C${i}`, tel = '22990001900' + i, notif = `${CAMP}-N${i}`;
    exec(`INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, str_ADRESSE, lg_TYPE_CLIENT_ID, str_STATUT, dt_CREATED) VALUES ('${id}', 'E2ECJ', 'J${i}', '${tel}', '6', 'enable', NOW());`
      + ` INSERT INTO t_campagne_ligne (campagne_id, lg_CLIENT_ID, retenu, statut, lg_NOTIFICATION_ID) VALUES ('${CAMP}', '${id}', b'1', 'PREPARE', '${notif}');`
      + ` INSERT INTO whatsapp_message (id, notification_id, client_id, telephone, mode, simule, statut, message_id, created_at) VALUES ('${CAMP}-M${i}', '${notif}', '${id}', '${tel}', 'API', 0, '${etat}', '${mid(i)}', NOW() - INTERVAL 1 HOUR)`);
  });
  if (secretLibre) {
    exec(`UPDATE whatsapp_compte SET app_secret = '${SECRET}' WHERE mode = 'API'`);
  }
  const { b, p, erreurs } = await C.connecter();
  const dialogues = []; p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  let journaux = 0; p.on('request', (r) => { if (/\/campagnes?\/journal(\?|$)/.test(r.url())) { journaux++; } });
  const webhook = async (statuses) => {
    const corps = JSON.stringify({ object: 'whatsapp_business_account', entry: [{ id: 'E2E', changes: [{ field: 'messages', value: { messaging_product: 'whatsapp', statuses } }] }] });
    const sig = 'sha256=' + crypto.createHmac('sha256', SECRET).update(corps, 'utf8').digest('hex');
    return p.evaluate(async ([c, s]) => (await fetch('../api/v1/whatsapp/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': s }, body: c })).status, [corps, sig]);
  };
  /* ligne de la campagne dans le journal : selection, colonnes, indicateur, couleurs */
  const ligne = () => p.evaluate((id) => {
    const g = Ext.ComponentQuery.query('campagnes #journal')[0], i = g.getStore().findExact('id', id);
    if (i < 0) { return null; }
    const r = g.getStore().getAt(i), n = g.getView().getNode(i), col = g.columns.find((c) => c.text === 'Envoi'), td = n.querySelector('.x-grid-cell-' + col.id);
    const titre = n.querySelector('.x-grid-cell-' + g.columns.find((c) => c.text === 'Campagne').id + ' .x-grid-cell-inner');
    const segs = {}; td.querySelectorAll('.cmp-envoi-seg').forEach((s) => { segs[s.className.split(' ').pop()] = getComputedStyle(s).backgroundColor; });
    const lum = (c) => { const m = (c.match(/\d+/g) || [0, 0, 0]).map(Number); return (0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2]) / 255; };
    const fond = getComputedStyle(titre.parentNode).backgroundColor, encre = getComputedStyle(titre).color;
    return { selectionnee: g.getSelectionModel().isSelected(r), distribues: r.get('distribues'), lus: r.get('lus'), partis: r.get('partis'),
      texte: td.querySelector('.cmp-envoi-texte').innerText, segs, fond, encre, clair: lum(fond) > 0.8, fonce: lum(encre) < 0.45, idTitre: (titre.id = titre.id || 'e2e-cj-titre') };
  }, CAMP);
  const suivi = () => p.evaluate(() => { const g = Ext.ComponentQuery.query('campagnes #suivi')[0], c = {};
    g.getStore().each((r) => { c[r.get('etat')] = (c[r.get('etat')] || 0) + 1; }); return c; });
  try {
    ok('Préparation : secret du webhook d\'essai posable (aucun secret réel remplacé)', secretLibre);
    await ouvrirMenu(p, 'CAMPAGNES SMS / WHATSAPP', 'Campagnes');
    await p.waitForFunction(() => { const v = Ext.ComponentQuery.query('campagnes')[0]; return v && v.contexte; }, null, { timeout: 60000 });
    await p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('campagnes')[0].down('#ongletJournal').tab.getEl().dom.id));
    await p.waitForFunction((id) => Ext.ComponentQuery.query('campagnes #journal')[0].getStore().findExact('id', id) >= 0, CAMP, { timeout: 30000 });
    await p.waitForTimeout(500);
    let l = await ligne();
    await p.click('#' + l.idTitre);
    await p.waitForFunction(() => Ext.ComponentQuery.query('campagnes #suivi')[0].getStore().getCount() === 4, null, { timeout: 30000 });
    await p.mouse.move(5, 5);
    await p.waitForTimeout(600);
    l = await ligne();
    ok('Ligne sélectionnée : les couleurs de l\'indicateur restent (lu vert, distribué bleu, envoyé bleu clair)',
      l.selectionnee && l.segs.lu === 'rgb(30, 132, 73)' && l.segs.distribue === 'rgb(36, 113, 163)' && l.segs.envoye === 'rgb(133, 193, 233)', JSON.stringify(l.segs));
    ok('Ligne sélectionnée lisible : fond clair, texte foncé (plus de violet plein)', l.clair && l.fonce, JSON.stringify({ fond: l.fond, encre: l.encre }));
    ok('Avant les statuts : journal = base (2 distribués dont 1 lu, 4 partis)', l.distribues === 2 && l.lus === 1 && l.partis === 4, JSON.stringify(l));

    /* statuts du webhook : des retards et un ordre inverse */
    const st = await webhook([
      { id: mid(0), status: 'sent', timestamp: '1' }, { id: mid(1), status: 'sent', timestamp: '1' },
      { id: mid(2), status: 'delivered', timestamp: '2' }, { id: mid(3), status: 'read', timestamp: '3' }, { id: mid(3), status: 'delivered', timestamp: '2' }]);
    ok('Webhook signé accepté', st === 200, st);
    ok('Base : un statut ne recule jamais (LU, DELIVRE, DELIVRE, LU)', statutsBase() === 'LU,DELIVRE,DELIVRE,LU', statutsBase());

    /* sans clic : le journal se met a jour en 20 s au plus, la ligne reste selectionnee, le suivi suit */
    const t0 = Date.now();
    await p.waitForFunction((id) => { const g = Ext.ComponentQuery.query('campagnes #journal')[0], r = g.getStore().getAt(g.getStore().findExact('id', id));
      return r && r.get('distribues') === 4 && r.get('lus') === 2; }, CAMP, { timeout: 26000 }).catch(() => null);
    const delai = Math.round((Date.now() - t0) / 1000);
    await p.waitForTimeout(800);
    l = await ligne();
    ok(`Sans clic, le journal se met à jour (${delai} s) : 4 distribués dont 2 lus, indicateur « 4 envoyés · 4 distribués · 2 lus · 0 échec »`,
      l.distribues === 4 && l.lus === 2 && l.texte === '4 envoyés · 4 distribués · 2 lus · 0 échec' && delai <= 25, JSON.stringify({ delai, l }));
    ok('Après le rafraîchissement : la ligne reste sélectionnée et garde ses couleurs', l.selectionnee && l.segs.lu === 'rgb(30, 132, 73)' && l.clair, JSON.stringify(l));
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('campagnes #suivi')[0]; let n = 0; g.getStore().each((r) => { if (r.get('etat') === 'Lu') { n++; } }); return n === 2; }, null, { timeout: 26000 }).catch(() => null);
    const s = await suivi();
    ok('Rapprochement journal = suivi = base : 2 lus, 2 distribués', (s['Lu'] || 0) === 2 && (s['Distribué'] || 0) === 2 && !s['Envoyé'], JSON.stringify(s));

    /* onglet quitte : plus de rechargement */
    await p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('campagnes')[0].down('#ongletParametres').tab.getEl().dom.id));
    await p.waitForTimeout(1000);
    const avant = journaux;
    await p.waitForTimeout(23000);
    ok('Onglet du journal quitté : plus aucun rechargement du journal', journaux === avant, journaux - avant);
    ok('Aucune erreur JavaScript, aucune fenêtre', erreurs.length === 0 && dialogues.length === 0
      && await p.evaluate(() => Ext.ComponentQuery.query('messagebox').filter((w) => w.isVisible()).length) === 0, erreurs.concat(dialogues).join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
    nettoyer();
    if (secretLibre) { exec("UPDATE whatsapp_compte SET app_secret = NULL WHERE mode = 'API'"); }
    ok('Jeu d\'essai retiré, compte remis', q(`SELECT COUNT(*) FROM t_campagne WHERE id = '${CAMP}'`) === '0' && q(`SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID LIKE '${CAMP}-%'`) === '0'
      && q("SELECT CONCAT_WS('|', actif, mode_test, COALESCE(phone_number_id,'~'), COALESCE(access_token,'~'), COALESCE(app_secret,'~')) FROM whatsapp_compte WHERE mode = 'API'") === compteAvant);
    C.nettoyer();
  }
  process.exit(C.bilan() ? 1 : 0);
})();
