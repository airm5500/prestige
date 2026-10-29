/* AUDIT & RAPPROCHEMENTS, onglet Regularisations (besoins du 11/10, point 6). Par l'ecran, sur des donnees du test :
 *  - historique pose sur deux produits sans aucun mouvement, en aout 2038 (aucune donnee reelle) :
 *    une entree au depot ecrite a l'envers (4 -> 1 pour +3), un deconditionnement gonfle (104 -> 204) et la vente de la
 *    meme seconde partant du stock d'avant ouverture (4 -> 99 pour 5) ;
 *  - une caisse oubliee (ouverte il y a 3 jours) d'un caissier d'essai ;
 *  - les quatre regularisations sont proposees ; sans commentaire, la validation est refusee a l'ecran ;
 *  - validees : entree 4 -> 7, deconditionnement 4 -> 104 puis vente 104 -> 99 (chaine coherente), caisse fermee au
 *    nom de son caissier avec le montant compte (billetage enregistre) ;
 *  - journal : une ligne par regularisation, auteur, commentaire, valeurs d'avant ; une regularisation appliquee
 *    n'est plus proposee, et la rejouer par l'API ne change rien ;
 *  - les ecarts a corriger ailleurs ouvrent leur ecran habituel ; sans le droit P_AUDIT_REGULARISER, l'API refuse ;
 *  - aucune fenetre. Tout ce qui est pose ou produit est retire a la fin.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const privilegeEssai = require('../support/privilege-essai');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN_SUPPORT + "'");
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
const M = 'E2E-REG', U = 'E2E-REG-U', CAISSE = 'E2E-REG-CAISSE';
const SANS_MVT = "SELECT f.lg_FAMILLE_ID FROM t_famille f WHERE f.str_STATUT = 'enable' AND f.int_CIP <> ''"
  + " AND NOT EXISTS (SELECT 1 FROM hmvtproduit h WHERE h.lg_FAMILLE_ID = f.lg_FAMILLE_ID) ORDER BY f.str_NAME LIMIT 2";
/* deux produits sans aucun mouvement. Sur une base ou tous les produits ont deja bouge (banc peuple sur 3 ans),
   le test les cree, copies d'un produit existant, et les retire a la fin. */
let [F1, F2] = q(SANS_MVT).split(/\r?\n/);
const CREES = [];
if (!F1 || !F2) {
  const MODELE = q("SELECT lg_FAMILLE_ID FROM t_famille WHERE str_STATUT = 'enable' AND int_CIP <> '' ORDER BY str_NAME LIMIT 1");
  [['E2E-REG-F1', '9990421'], ['E2E-REG-F2', '9990422']].forEach(([id, cip]) => {
    exec(`DELETE FROM t_famille WHERE lg_FAMILLE_ID = '${id}';`
      + `CREATE TEMPORARY TABLE tmp_f SELECT * FROM t_famille WHERE lg_FAMILLE_ID = '${MODELE}';`
      + `UPDATE tmp_f SET lg_FAMILLE_ID = '${id}', int_CIP = '${cip}', str_NAME = 'ZZ E2E REGUL ${id.slice(-2)}', int_EAN13 = NULL;`
      + 'INSERT INTO t_famille SELECT * FROM tmp_f; DROP TEMPORARY TABLE tmp_f;');
    CREES.push(id);
  });
  [F1, F2] = CREES;
}
const DEP = q("SELECT lg_EMPLACEMENT_ID FROM t_emplacement WHERE lg_EMPLACEMENT_ID <> '1' ORDER BY lg_EMPLACEMENT_ID LIMIT 1");
const droit = privilegeEssai(q, exec, ENV_E2E.LOGIN_SUPPORT, 'P_AUDIT_REGULARISER');
const ligne = (id, quand, debut, fin, qte, type, f, e) => `('${M}-${id}', b'1', '2038-08-20 ${quand}', '2038-08-20', '${M}-${id}', 100, 200, ${debut}, ${fin}, ${qte}, 0, '${e}', '${f}', '${ADMIN}', '${type}', 0)`;
const h = (id) => q(`SELECT CONCAT(qteDebut, '>', qteFinale) FROM hmvtproduit WHERE uuid = '${M}-${id}'`);

function retirer() {
  const caisses = `(SELECT ld_CAISSE_ID FROM t_resume_caisse WHERE lg_USER_ID = '${U}')`;
  exec(`DELETE FROM hmvtproduit WHERE uuid LIKE '${M}-%';`
    + `DELETE FROM t_billetage_details WHERE lg_BILLETAGE_ID IN (SELECT lg_BILLETAGE_ID FROM t_billetage WHERE lg_USER_ID = '${U}');`
    + `DELETE FROM t_billetage WHERE lg_USER_ID = '${U}';`
    + `DELETE FROM ligne_resume_caisse WHERE resume_caisse_id IN ${caisses};`
    + `DELETE FROM notification_client WHERE notification_id IN (SELECT id FROM notification WHERE user_id = '${U}' OR entity_ref = '${CAISSE}');`
    + `DELETE FROM notification WHERE user_id = '${U}' OR entity_ref = '${CAISSE}';`
    + `DELETE FROM t_event_log WHERE lg_USER_ID = '${U}';`
    + `DELETE FROM t_resume_caisse WHERE lg_USER_ID = '${U}';`
    + `DELETE FROM t_caisse WHERE lg_USER_ID = '${U}';`
    + `DELETE FROM t_user WHERE lg_USER_ID = '${U}';`
    + `DELETE FROM t_audit_regularisation WHERE created_at >= '${DEBUT}';`);
}

function poser() {
  exec('INSERT INTO hmvtproduit (uuid, checked, createdAt, mvtdate, pkey, prixAchat, prixUn, qteDebut, qteFinale, qteMvt, valeurTva,'
    + ' lg_EMPLACEMENT_ID, lg_FAMILLE_ID, lg_USER_ID, typeMvt, ug) VALUES '
    + [ligne('ENT', '10:00:00', 4, 1, 3, '01', F1, DEP), ligne('DEC', '18:42:07', 104, 204, 100, '05', F2, '1'),
      ligne('VTE', '18:42:07', 4, 99, 5, '02', F2, '1')].join(',') + ';'
    + `CREATE TEMPORARY TABLE e2e_u AS SELECT * FROM t_user WHERE lg_USER_ID = '${ADMIN}';`
    + `UPDATE e2e_u SET lg_USER_ID = '${U}', str_LOGIN = 'e2e_reg_caissier', str_FIRST_NAME = 'ZZESSAI', str_LAST_NAME = 'Caissier';`
    + 'INSERT INTO t_user SELECT * FROM e2e_u; DROP TEMPORARY TABLE e2e_u;'
    + 'INSERT INTO t_resume_caisse (ld_CAISSE_ID, lg_USER_ID, int_SOLDE_MATIN, int_SOLDE_SOIR, dt_DAY, dt_CREATED, lg_CREATED_BY, dt_UPDATED, lg_UPDATED_BY, str_STATUT)'
    + ` VALUES ('${CAISSE}', '${U}', 0, 0, CURDATE() - INTERVAL 3 DAY, CONCAT(CURDATE() - INTERVAL 3 DAY, ' 08:30:00'), '${U}', NOW(), '${U}', 'is_Using');`);
}

(async () => {
  droit.remettre();
  retirer();
  const b = await ENV_E2E.lancer(chromium);
  const dialogues = [];
  try {
    poser();
    const ctx = await b.newContext({ viewport: { width: 1500, height: 950 } });
    const p = await ctx.newPage();
    p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN_SUPPORT); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('auditrapprochements', 'Audit & rapprochements', ''));
    await p.waitForFunction(() => document.querySelectorAll('.audit-tuile').length >= 7, null, { timeout: 60000 });
    await p.click('.x-tab:has-text("Régularisations")');
    const grille = () => p.evaluate(() => Ext.ComponentQuery.query('auditrapprochements #grilleRegul')[0].getStore().getRange().map((r) => r.data));
    await p.waitForFunction(() => Ext.ComponentQuery.query('auditrapprochements #grilleRegul')[0].getStore().getCount() > 0, null, { timeout: 30000 });
    let props = await grille();
    const cherche = (type, cle) => props.find((x) => x.type === type && x.cle === cle);
    ok('Proposées : entrée au dépôt à l\'envers, déconditionnement gonflé, vente après ouverture, caisse oubliée',
      cherche('HISTO_ENTREE_DEPOT', F1 + '|' + DEP) && cherche('HISTO_DECON_204', F2 + '|1') && cherche('HISTO_VENTE_DECON', F2 + '|1') && cherche('CAISSE_OUVERTE', CAISSE),
      props.filter((x) => x.cle.indexOf(F1) === 0 || x.cle.indexOf(F2) === 0 || x.cle === CAISSE).map((x) => x.type).join(', '));
    ok('Chaque proposition dit ce qui sera fait', props.every((x) => x.effet && x.effet.length > 20));

    const cocher = (pred) => p.evaluate((src) => { const f = eval(src); const g = Ext.ComponentQuery.query('auditrapprochements #grilleRegul')[0];
      g.getSelectionModel().deselectAll(); g.getSelectionModel().select(g.getStore().getRange().filter((r) => f(r.data))); }, pred);
    const valider = async () => { await p.click('text=Valider la sélection'); await p.waitForTimeout(400);
      await p.waitForFunction(() => !Ext.ComponentQuery.query('auditrapprochements #ongletRegularisations')[0].loadMask?.isVisible?.(), null, { timeout: 30000 }).catch(() => {});
      await p.waitForTimeout(1500); };
    /* saisie au clavier dans un champ de la barre */
    const saisir = async (champ, v) => { const id = await p.evaluate((c) => Ext.ComponentQuery.query('auditrapprochements #' + c)[0].inputEl.id, champ);
      await p.fill('#' + id, v); };
    const etat = () => p.evaluate(() => Ext.ComponentQuery.query('auditrapprochements #etat')[0].text);

    /* sans commentaire : refuse a l'ecran */
    await cocher(`(d) => d.cle === '${F1}|${DEP}'`);
    await valider();
    ok('Sans commentaire : rien n\'est appliqué, message dans la page', h('ENT') === '4>1' && /commentaire est obligatoire/.test(await etat()), await etat());

    /* historique : entree au depot, puis deconditionnement et vente (dans cet ordre, une a une) */
    await saisir('commentaire', 'Correction e2e de l\'historique');
    await cocher(`(d) => d.cle === '${F1}|${DEP}' || (d.cle === '${F2}|1' && d.type === 'HISTO_DECON_204')`);
    await valider();
    ok('Entrée au dépôt : 4 → 7 (hausse)', h('ENT') === '4>7', h('ENT'));
    ok('Déconditionnement : 104 → 204 ramené à 4 → 104', h('DEC') === '4>104', h('DEC'));
    props = await grille();
    ok('Appliquées : elles ne sont plus proposées', !cherche('HISTO_ENTREE_DEPOT', F1 + '|' + DEP) && !cherche('HISTO_DECON_204', F2 + '|1') && !!cherche('HISTO_VENTE_DECON', F2 + '|1'));
    await saisir('commentaire', 'Vente e2e');
    await cocher(`(d) => d.cle === '${F2}|1' && d.type === 'HISTO_VENTE_DECON'`);
    await valider();
    ok('Vente : part de 104 (stock après ouverture) → 99 : chaîne 4 → 104 → 99', h('VTE') === '104>99' && h('DEC') === '4>104', h('VTE'));

    /* caisse oubliee : seule, avec le montant compte */
    await cocher(`(d) => d.cle === '${CAISSE}' || d.cle === '${F1}|${DEP}' || d.type === 'HISTO_VENTE_DECON'`);
    const bloque = await p.evaluate(() => Ext.ComponentQuery.query('auditrapprochements #valider')[0].isDisabled());
    await cocher(`(d) => d.cle === '${CAISSE}'`);
    const seule = await p.evaluate(() => ({ valider: !Ext.ComponentQuery.query('auditrapprochements #valider')[0].isDisabled(),
      montant: !Ext.ComponentQuery.query('auditrapprochements #montant')[0].isDisabled() }));
    ok('Caisse : se valide seule, le montant compté se saisit alors', seule.valider && seule.montant, JSON.stringify(seule) + ' bloquée avec d\'autres : ' + bloque);
    await saisir('commentaire', 'Caisse oubliée, comptée le matin');
    await valider();
    ok('Caisse sans montant : refusée à l\'écran', /montant compté/.test(await etat()) && q(`SELECT str_STATUT FROM t_resume_caisse WHERE ld_CAISSE_ID = '${CAISSE}'`) === 'is_Using', await etat());
    await saisir('montant', '12500');
    await valider();
    const caisse = q(`SELECT CONCAT(rc.str_STATUT, '|', (SELECT int_AMOUNT FROM t_billetage b WHERE b.ld_CAISSE_ID = rc.ld_CAISSE_ID AND b.lg_USER_ID = rc.lg_USER_ID LIMIT 1)) FROM t_resume_caisse rc WHERE rc.ld_CAISSE_ID = '${CAISSE}'`);
    ok('Caisse fermée au nom de son caissier, billetage de 12 500 enregistré', /^is_Process\|12500/.test(caisse), caisse);

    /* journal */
    const jour = await p.evaluate(() => Ext.ComponentQuery.query('auditrapprochements #grilleJournal')[0].getStore().getRange().map((r) => r.data));
    const j = q(`SELECT COUNT(*), SUM(lg_USER_ID = '${ADMIN}'), SUM(avant LIKE '%qteDebut%' OR avant LIKE '%is_Using%') FROM t_audit_regularisation WHERE created_at >= '${DEBUT}'`).split('\t');
    ok('Journal : 4 régularisations, auteur et valeurs d\'avant enregistrés', j[0] === '4' && j[1] === '4' && j[2] === '4', j.join(' '));
    ok('Journal affiché : commentaire, objet et montant de la caisse', jour.length >= 4 && jour.some((x) => x.commentaire === 'Caisse oubliée, comptée le matin' && +x.montant === 12500),
      JSON.stringify(jour.slice(0, 2)));

    /* rejouer une regularisation appliquee : rien ne change */
    const rejeu = await p.evaluate(async (c) => (await (await fetch('../api/v1/audit/regularisations/appliquer', { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'HISTO_ENTREE_DEPOT', cle: c, commentaire: 'rejeu' }) })).json()), F1 + '|' + DEP);
    ok('Rejouée par l\'API : refusée (« plus d\'objet »), historique inchangé', rejeu.success === false && h('ENT') === '4>7', JSON.stringify(rejeu));

    /* renvois vers les ecrans habituels */
    const renvois = await p.evaluate(() => [...document.querySelectorAll('.audit-renvoi a')].map((a) => a.getAttribute('data-ecran')));
    ok('Écarts à corriger ailleurs : liens vers leur écran (ajustement, caisse, différés, carnets, diagnostic)', renvois.length > 0
      && renvois.every((e) => ['ajustementmanager', 'gestcaissemanager', 'delayed', 'reglementdepot', 'supportdiagnostic'].indexOf(e) >= 0), renvois.join(', '));
    ok('Aucune fenêtre', dialogues.length === 0, dialogues.join(' | '));

    /* sans le droit de valider (droits lus a la connexion) */
    droit.retirer();
    const p2 = await (await b.newContext()).newPage();
    await p2.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p2.fill('#str_login', ENV_E2E.LOGIN_SUPPORT); await p2.fill('#str_password', 'e2etest'); await p2.click('#login');
    await p2.waitForURL('**/general/**', { timeout: 60000 });
    const sans = await p2.evaluate(async () => ({
      liste: await (await fetch('../api/v1/audit/regularisations')).json(),
      appli: await (await fetch('../api/v1/audit/regularisations/appliquer', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'HISTO_ENTREE_DEPOT', cle: 'x|y', commentaire: 'essai' }) })).json() }));
    ok('Sans le droit : consultation possible, validation refusée par le serveur', sans.liste.success && sans.liste.peutValider === false
      && sans.appli.success === false && /droit/.test(sans.appli.msg), JSON.stringify(sans.appli));
  } finally {
    droit.remettre();
    retirer();
    if (CREES.length) exec(`DELETE FROM t_famille WHERE lg_FAMILLE_ID IN ('${CREES.join("','")}')`);
    await b.close();
    ok('Données du test retirées', q(`SELECT COUNT(*) FROM hmvtproduit WHERE uuid LIKE '${M}-%'`) === '0'
      && q(`SELECT COUNT(*) FROM t_user WHERE lg_USER_ID = '${U}'`) === '0' && q(`SELECT COUNT(*) FROM t_audit_regularisation WHERE created_at >= '${DEBUT}'`) === '0'
      && q("SELECT COUNT(*) FROM t_famille WHERE lg_FAMILLE_ID LIKE 'E2E-REG-F%'") === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
  process.exit(ko ? 1 : 0);
})();
