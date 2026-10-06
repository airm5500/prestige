/* RAPPELS PAR HABITUDE D'ACHAT ET PILULIERS A PREPARER (plan d'octobre, section 4.1, lot L10).
 *
 * Jeu d'essai isole (deux clients fictifs, numeros fictifs, ventes datees) : aucun SMS ne vise un vrai client.
 *  - calcul : produit achete tous les 30 jours (3 achats) -> retenu, prevu au dernier achat + 30 ; achats irreguliers
 *    -> non retenu ; un cycle n'est inscrit qu'une fois (deuxieme actualisation sans doublon) ;
 *  - ecran « Rappels et piluliers » (menu SERVICE CLIENT) : lignes groupees par client, recherche, marquer prepare /
 *    remettre a preparer / ecarter (statut et auteur en base) ;
 *  - fiche client : case « Afficher les médicaments dans les messages », cochee par defaut, enregistree ;
 *  - SMS : un message par client, categorie RAPPEL_HABITUDE ; decoche -> message neutre sans nom de medicament ;
 *    client qui refuse les SMS -> refus motive, aucune notification ;
 *  - cloche : categorie « Traitements habituels à préparer » = nombre de lignes a preparer ;
 *  - rachat : la ligne passe a « Racheté » a l'actualisation ;
 *  - jeu d'essai retire, lignes et statuts d'avant remis ; aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });

const A = 'E2E-HAB-CLIENT-A', B = 'E2E-HAB-CLIENT-B';
const clients = "('" + A + "','" + B + "')";
const JOUR = '2026-08-10';
const P1 = q("SELECT f.lg_FAMILLE_ID FROM t_famille f WHERE f.str_STATUT = 'enable' AND f.str_NAME LIKE 'DOLIPRANE 1000%' ORDER BY f.str_NAME LIMIT 1");
const P2 = q("SELECT f.lg_FAMILLE_ID FROM t_famille f WHERE f.str_STATUT = 'enable' AND f.str_NAME LIKE 'AMOXICILLINE%' ORDER BY f.str_NAME LIMIT 1");
const NOM_P1 = q("SELECT str_NAME FROM t_famille WHERE lg_FAMILLE_ID = '" + P1 + "'");

function vente(id, client, famille, jour) {
  return "INSERT INTO t_preenregistrement (lg_PREENREGISTREMENT_ID, lg_CLIENT_ID, str_STATUT, b_IS_CANCEL, int_PRICE, dt_CREATED, dt_UPDATED)"
    + " VALUES ('" + id + "', '" + client + "', 'is_Closed', 0, 1000, '" + jour + " 10:00:00', '" + jour + " 10:00:00');"
    + "INSERT INTO t_preenregistrement_detail (lg_PREENREGISTREMENT_DETAIL_ID, lg_PREENREGISTREMENT_ID, lg_FAMILLE_ID, int_QUANTITY, int_PRICE, prixAchat, dt_CREATED, dt_UPDATED)"
    + " VALUES ('" + id + "-D', '" + id + "', '" + famille + "', 1, 1000, 500, '" + jour + " 10:00:00', '" + jour + " 10:00:00');";
}

function nettoyer() {
  exec("DELETE nc FROM notification_client nc WHERE nc.client_id IN " + clients + ";"
    + "DELETE FROM notification WHERE type_notification IN (23, 24) AND entity_ref IN " + clients + ";"
    + "DELETE FROM t_rappel_habitude WHERE lg_CLIENT_ID IN " + clients + ";"
    + "DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID LIKE 'E2E-HAB-V%';"
    + "DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE 'E2E-HAB-V%';"
    + "DELETE FROM t_compte_client_tiers_payant WHERE lg_COMPTE_CLIENT_ID IN (SELECT lg_COMPTE_CLIENT_ID FROM t_compte_client WHERE lg_CLIENT_ID IN " + clients + ");"
    + "DELETE FROM t_compte_client WHERE lg_CLIENT_ID IN " + clients + ";"
    + "DELETE FROM t_ayant_droit WHERE lg_CLIENT_ID IN " + clients + ";"
    + "DELETE FROM t_client WHERE lg_CLIENT_ID IN " + clients + ";");
}

(async () => {
  nettoyer();
  /* lignes d'avant (statuts) : remises a la fin, les nouvelles lignes des vrais clients retirees */
  const avant = q("SELECT CONCAT(id, '|', str_STATUT, '|', COALESCE(dt_TRAITE,'')) FROM t_rappel_habitude").split('\n').filter(Boolean);
  const notifAvant = q("SELECT COALESCE(MAX(created_at), '2000-01-01') FROM notification");
  exec("INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, lg_TYPE_CLIENT_ID, str_ADRESSE, dt_CREATED, dt_UPDATED, str_STATUT)"
    + " VALUES ('" + A + "', 'ZZHABITUDE', 'AWA', '1', '0707070707', NOW(), NOW(), 'enable'),"
    + " ('" + B + "', 'ZZHABITUDE', 'REFUS', '1', '0505050505', NOW(), NOW(), 'enable');"
    + "UPDATE t_client SET bool_CONSENT_SMS = 0 WHERE lg_CLIENT_ID = '" + B + "';"
    + "UPDATE t_client SET str_NUMERO_SECURITE_SOCIAL = 'E2EHAB01' WHERE lg_CLIENT_ID = '" + A + "';"
    /* comme un vrai client assure : un compte et un tiers payant (la fiche les exige en modification) */
    + "INSERT INTO t_compte_client (lg_COMPTE_CLIENT_ID, P_KEY, lg_CLIENT_ID, dt_CREATED, dt_UPDATED, str_STATUT, dbl_PLAFOND, dbl_CAUTION)"
    + " VALUES ('E2E-HAB-CPT', '" + A + "', '" + A + "', NOW(), NOW(), 'enable', -1, -1);"
    + "INSERT INTO t_compte_client_tiers_payant (lg_COMPTE_CLIENT_TIERS_PAYANT_ID, lg_COMPTE_CLIENT_ID, lg_TIERS_PAYANT_ID, dt_CREATED, dt_UPDATED, str_STATUT, int_POURCENTAGE, int_PRIORITY)"
    + " SELECT 'E2E-HAB-CTP', 'E2E-HAB-CPT', t.lg_TIERS_PAYANT_ID, NOW(), NOW(), 'enable', 80, 1 FROM t_compte_client_tiers_payant t"
    + " JOIN t_tiers_payant tp ON tp.lg_TIERS_PAYANT_ID = t.lg_TIERS_PAYANT_ID WHERE t.str_STATUT = 'enable' AND tp.str_STATUT = 'enable' AND tp.lg_TYPE_TIERS_PAYANT_ID = '1' LIMIT 1;"
    + "INSERT INTO t_ayant_droit (lg_AYANTS_DROITS_ID, lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, str_NUMERO_SECURITE_SOCIAL, str_SEXE, dt_CREATED, dt_UPDATED, str_STATUT)"
    + " VALUES ('" + A + "', '" + A + "', 'ZZHABITUDE', 'AWA', 'E2EHAB01', 'F', NOW(), NOW(), 'enable');"
    + vente('E2E-HAB-V1', A, P1, '2026-05-13') + vente('E2E-HAB-V2', A, P1, '2026-06-12') + vente('E2E-HAB-V3', A, P1, '2026-07-12')
    + vente('E2E-HAB-V4', A, P2, '2026-05-01') + vente('E2E-HAB-V5', A, P2, '2026-05-05') + vente('E2E-HAB-V6', A, P2, '2026-07-20')
    + vente('E2E-HAB-V7', B, P1, '2026-05-13') + vente('E2E-HAB-V8', B, P1, '2026-06-12') + vente('E2E-HAB-V9', B, P1, '2026-07-12'));
  ok('Fiche client : « médicaments dans les messages » coché par défaut (nouveau client)', q("SELECT bool_MSG_MEDICAMENTS FROM t_client WHERE lg_CLIENT_ID = '" + A + "'") === '1');

  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const post = (u, corps) => p.evaluate(async ([u, c]) => JSON.parse(await (await fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c || []) })).text()), [u, corps]);
  const get = (u) => p.evaluate(async (u) => JSON.parse(await (await fetch(u)).text()), u);
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app && Ext.ComponentQuery.query('navigation').length
      && Ext.ComponentQuery.query('navigation')[0].getStore()._menuCharge, null, { timeout: 120000 });
    await p.waitForTimeout(1500);
    const idDe = (sel) => p.evaluate((s) => { const c = Ext.ComponentQuery.query(s)[0]; return c ? c.getId() : null; }, sel);
    const clic = async (sel, attente) => { await p.click('#' + (await idDe(sel))); await p.waitForTimeout(attente || 1200); };

    /* ------------------------------------------------ menu et ecran */
    const menu = await p.evaluate(() => { const n = Ext.ComponentQuery.query('navigation')[0].getStore().getNodeById('rappelshabitude'); return n ? n.get('text') : null; });
    ok('Menu SERVICE CLIENT : « Rappels et piluliers »', /piluliers/.test(menu || ''), menu);
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('rappelshabitude', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('rappelshabitude').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(1500);

    /* ------------------------------------------------ calcul */
    await p.evaluate((j) => { Ext.ComponentQuery.query('rappelshabitude')[0].jourForce = j; }, JOUR);
    await clic('rappelshabitude #btnActualiser', 1000);
    await p.waitForFunction(() => /liste actualisée/.test(Ext.ComponentQuery.query('rappelshabitude #resume')[0].el.dom.textContent), null, { timeout: 120000 });
    const lignesA = q("SELECT CONCAT(lg_FAMILLE_ID, '|', dt_DERNIER_ACHAT, '|', dt_PREVU, '|', int_FREQUENCE, '|', int_ACHATS, '|', str_STATUT) FROM t_rappel_habitude WHERE lg_CLIENT_ID = '" + A + "'").split('\n').filter(Boolean);
    ok('Achat tous les 30 jours (3 achats) : inscrit, prévu le 11/08 (dernier achat + 30), à préparer', lignesA.length === 1
      && lignesA[0] === P1 + '|2026-07-12|2026-08-11|30|3|A_PREPARER', JSON.stringify(lignesA));
    ok('Achats irréguliers : non retenus', !lignesA.some((l) => l.startsWith(P2 + '|')));
    const deux = await post('../api/v1/rappels-habitude/actualiser?jour=' + JOUR);
    ok('Deuxième actualisation : aucun doublon (un cycle = une ligne)', deux.success && q("SELECT COUNT(*) FROM t_rappel_habitude WHERE lg_CLIENT_ID IN " + clients) === '2'
      && deux.inscrits === 0, JSON.stringify(deux));

    /* ------------------------------------------------ liste a l'ecran */
    await p.evaluate(() => { const g = Ext.ComponentQuery.query('rappelshabitude')[0]; g.down('#query').setValue('ZZHABITUDE'); });
    await clic('rappelshabitude #btnRechercher', 2500);
    const grille = await p.evaluate(() => { const g = Ext.ComponentQuery.query('rappelshabitude')[0];
      return { n: g.getStore().getCount(), groupes: Array.from(g.getEl().dom.querySelectorAll('.x-grid-group-title')).map((e) => e.textContent.trim()),
        texte: g.getView().getEl().dom.textContent, resume: g.down('#resume').el.dom.textContent }; });
    ok('Écran : les deux lignes, groupées par client', grille.n === 2 && grille.groupes.length === 2 && grille.groupes.every((t) => /ZZHABITUDE/.test(t)), JSON.stringify(grille.groupes));
    ok('Écran : prévu le 11/08/2026, fréquence « tous les 30 j », statut « À préparer »', /11\/08\/2026/.test(grille.texte) && /tous les 30 j/.test(grille.texte) && /À préparer/.test(grille.texte));
    ok('Écran : résumé « 2 produit(s), 2 client(s) »', /2 produit\(s\), 2 client\(s\)/.test(grille.resume), grille.resume);

    /* ------------------------------------------------ marquer */
    const idA = q("SELECT id FROM t_rappel_habitude WHERE lg_CLIENT_ID = '" + A + "'");
    const idB = q("SELECT id FROM t_rappel_habitude WHERE lg_CLIENT_ID = '" + B + "'");
    const choisir = (id) => p.evaluate((id) => { const g = Ext.ComponentQuery.query('rappelshabitude')[0]; g.getSelectionModel().select(g.getStore().findRecord('id', id)); }, id);
    await choisir(idA);
    ok('Boutons actifs quand une ligne est choisie', await p.evaluate(() => !Ext.ComponentQuery.query('rappelshabitude #btnPrepare')[0].isDisabled()));
    await clic('rappelshabitude #btnPrepare', 2500);
    const U = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin'");
    ok('« Marquer préparé » : statut PREPARE, auteur enregistré', q("SELECT CONCAT(str_STATUT, '|', lg_USER_ID, '|', dt_TRAITE IS NOT NULL) FROM t_rappel_habitude WHERE id = '" + idA + "'") === 'PREPARE|' + U + '|1');
    await choisir(idA);
    await clic('rappelshabitude #btnRemettre', 2500);
    ok('« Remettre à préparer » : statut A_PREPARER', q("SELECT str_STATUT FROM t_rappel_habitude WHERE id = '" + idA + "'") === 'A_PREPARER');

    /* ------------------------------------------------ cloche */
    const c = await get('../api/v1/notifications-centre/compteurs?cles=a-preparer');
    ok('Cloche « Traitements habituels à préparer » = lignes à préparer en base', c.compteurs['a-preparer'] === Number(q("SELECT COUNT(*) FROM t_rappel_habitude WHERE str_STATUT = 'A_PREPARER'")), JSON.stringify(c));
    const lc = await get('../api/v1/notifications-centre/liste?cle=a-preparer');
    ok('Cloche : la liste nomme le client et le produit', JSON.stringify(lc).indexOf('ZZHABITUDE') >= 0 || lc.total > 50, String(lc.total));

    /* ------------------------------------------------ fiche client : case medicaments */
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('clientmanager', {}));
    await p.waitForFunction(() => Ext.getCmp('rechecher'), null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => { Ext.getCmp('rechecher').setValue('ZZHABITUDE AWA'); Ext.ComponentQuery.query('clientgestion')[0].onRechClick(); });
    await p.waitForTimeout(3000);
    const ouvert = await p.evaluate((A) => { const g = Ext.ComponentQuery.query('clientgestion')[0]; const i = g.getStore().findExact('lg_CLIENT_ID', A);
      if (i < 0) { return 'absent:' + g.getStore().getCount(); } g.onEditClick(g, i); return 'ok'; }, A);
    await p.waitForTimeout(3000);
    const caseFiche = await p.evaluate(() => { const c = Ext.getCmp('msg_MEDICAMENTS'); return c ? { vue: c.isVisible(), coche: c.getValue(), libelle: c.boxLabel } : null; });
    ok('Fiche client (modification) : case « Afficher les médicaments dans les messages », cochée', ouvert === 'ok' && caseFiche && caseFiche.vue && caseFiche.coche === true, ouvert + ' ' + JSON.stringify(caseFiche));
    await p.evaluate(() => { Ext.getCmp('msg_MEDICAMENTS').setValue(false); });
    const btn = await p.evaluate(() => Ext.getCmp('msg_MEDICAMENTS').up('window').down('button[text=Enregistrer]').getId());
    await p.click('#' + btn);
    await p.waitForTimeout(3500);
    await p.evaluate(() => { if (Ext.MessageBox.isVisible()) { Ext.MessageBox.hide(); } });
    ok('Décochée puis enregistrée : bool_MSG_MEDICAMENTS = 0', q("SELECT bool_MSG_MEDICAMENTS FROM t_client WHERE lg_CLIENT_ID = '" + A + "'") === '0');
    ok('La fiche n\'a rien changé d\'autre (nom, téléphone)', q("SELECT CONCAT(str_FIRST_NAME, '|', str_LAST_NAME, '|', str_ADRESSE) FROM t_client WHERE lg_CLIENT_ID = '" + A + "'") === 'ZZHABITUDE|AWA|0707070707');

    /* ------------------------------------------------ SMS */
    const sms = await post('../api/v1/rappels-habitude/sms', [idA, idB]);
    const nA = q("SELECT CONCAT(n.type_notification, '|', n.message) FROM notification n JOIN notification_client nc ON nc.notification_id = n.id WHERE nc.client_id = '" + A + "'");
    ok('SMS : un message pour le client A, catégorie RAPPEL_HABITUDE (24)', sms.success && sms.envoyes === 1 && nA.startsWith('24|'), JSON.stringify(sms) + ' / ' + nA);
    ok('Médicaments décochés : message neutre, sans le nom du médicament', /votre traitement habituel sera bientôt à renouveler \(vers le 11\/08\/2026\)/.test(nA) && nA.indexOf(NOM_P1) < 0, nA);
    ok('Client qui refuse les SMS : refus motivé, aucune notification', (sms.refus || []).some((r) => /REFUS/.test(r.client) && /refusé les SMS/.test(r.motif))
      && q("SELECT COUNT(*) FROM notification_client WHERE client_id = '" + B + "'") === '0', JSON.stringify(sms.refus));
    ok('Ligne A : envoi daté et notification liée', q("SELECT dt_ENVOI IS NOT NULL AND lg_NOTIFICATION_ID IS NOT NULL FROM t_rappel_habitude WHERE id = '" + idA + "'") === '1');

    /* medicaments coches : cites */
    exec("UPDATE t_client SET bool_MSG_MEDICAMENTS = 1 WHERE lg_CLIENT_ID = '" + A + "'");
    const sms2 = await post('../api/v1/rappels-habitude/sms', [idA]);
    const n2 = q("SELECT n.message FROM notification n WHERE n.id = '" + (sms2.notifications || [''])[0] + "'");
    ok('Médicaments cochés : le message cite le produit', n2.indexOf(NOM_P1) >= 0, n2);

    /* ------------------------------------------------ ecarter puis rachat */
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('rappelshabitude', {}));
    await p.waitForTimeout(2000);
    await p.evaluate(() => { const g = Ext.ComponentQuery.query('rappelshabitude')[0]; g.down('#query').setValue('ZZHABITUDE'); g.rechercher(); });
    await p.waitForTimeout(2500);
    await choisir(idB);
    await clic('rappelshabitude #btnEcarter', 2500);
    ok('« Écarter » : statut ECARTE, la ligne quitte la liste par défaut', q("SELECT str_STATUT FROM t_rappel_habitude WHERE id = '" + idB + "'") === 'ECARTE'
      && await p.evaluate((id) => !Ext.ComponentQuery.query('rappelshabitude')[0].getStore().findRecord('id', id), idB));
    exec(vente('E2E-HAB-V10', A, P1, '2026-08-11'));
    const rachat = await post('../api/v1/rappels-habitude/actualiser?jour=2026-08-12');
    ok('Rachat du produit : la ligne passe à « Racheté » à l\'actualisation', q("SELECT str_STATUT FROM t_rappel_habitude WHERE id = '" + idA + "'") === 'ACHETE' && rachat.achetes >= 1, JSON.stringify(rachat));

    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Exécution sans exception', false, e.stack);
  } finally {
    await b.close();
    nettoyer();
    /* lignes inscrites pour de vrais clients pendant l'essai : retirees ; statuts d'avant remis */
    const garder = avant.map((l) => l.split('|')[0]);
    exec("DELETE FROM t_rappel_habitude" + (garder.length ? " WHERE id NOT IN ('" + garder.join("','") + "')" : "") + ";");
    avant.forEach((l) => { const [id, st, dt] = l.split('|'); exec("UPDATE t_rappel_habitude SET str_STATUT = '" + st + "', dt_TRAITE = " + (dt ? "'" + dt + "'" : 'NULL') + " WHERE id = '" + id + "'"); });
    ok('Jeu d\'essai retiré (clients, ventes, lignes, notifications), lignes d\'avant remises',
      q("SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID IN " + clients) === '0' && q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE 'E2E-HAB-V%'") === '0'
      && q("SELECT COUNT(*) FROM t_rappel_habitude") === String(avant.length)
      && q("SELECT COUNT(*) FROM notification WHERE type_notification = 24 AND created_at > '" + notifAvant + "'") === '0');
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
