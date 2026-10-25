/* AUDIT & RAPPROCHEMENTS, onglet Analyse (besoins du 11/10, point 6). Par l'ecran (menu Centre de support) :
 *  - un ecart connu est pose dans chaque controle, puis l'analyse est lancee depuis l'ecran ;
 *  - chaque tuile passe au rouge et son detail montre la ligne posee, avec l'ecart attendu :
 *    stock reel / historique (+7), stock negatif (-3), caisse ouverte depuis 3 jours, billetage (-1 000),
 *    differe (reste du 4 000 / releve 5 000), carnet depot (+1 000) ; controles de coherence listes ;
 *  - l'analyse n'ecrit rien (sommes de controle des tables lues identiques avant et apres) ;
 *  - aucune fenetre ; sans le droit P_SM_AUDIT, l'API refuse.
 * Tout ce qui est pose est retire a la fin, rapports conserves par « Lancer l'analyse » compris.
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
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const M = 'E2E-AUD';
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
const CAISSE = q('SELECT lg_CAISSE_ID FROM t_caisse LIMIT 1');

/* produit a l'officine dont le stock concorde avec son dernier mouvement */
const [PS, CIP_S, STOCK_S] = q("SELECT CONCAT_WS('|', s.lg_FAMILLE_ID, f.int_CIP, s.int_NUMBER_AVAILABLE) FROM t_famille_stock s JOIN t_famille f ON f.lg_FAMILLE_ID = s.lg_FAMILLE_ID"
  + " WHERE s.lg_EMPLACEMENT_ID = '1' AND f.str_STATUT = 'enable' AND f.int_CIP <> '' AND s.int_NUMBER_AVAILABLE = (SELECT h.qteFinale FROM hmvtproduit h WHERE h.lg_FAMILLE_ID = s.lg_FAMILLE_ID"
  + " AND h.lg_EMPLACEMENT_ID = '1' ORDER BY h.createdAt DESC, h.typeMvt = '05' LIMIT 1) ORDER BY f.str_NAME LIMIT 1").split('|');
/* produit a l'officine sans aucun mouvement, stock positif. Sur une base ou tous les produits ont deja vendu (banc
   peuple sur 3 ans), le test en cree un, copie d'un produit existant, qu'il retire a la fin. */
let [PN, CIP_N, STOCK_N] = q("SELECT CONCAT_WS('|', s.lg_FAMILLE_ID, f.int_CIP, s.int_NUMBER_AVAILABLE) FROM t_famille_stock s JOIN t_famille f ON f.lg_FAMILLE_ID = s.lg_FAMILLE_ID"
  + " WHERE s.lg_EMPLACEMENT_ID = '1' AND f.str_STATUT = 'enable' AND f.int_CIP <> '' AND s.int_NUMBER_AVAILABLE >= 0"
  + " AND NOT EXISTS (SELECT 1 FROM hmvtproduit h WHERE h.lg_FAMILLE_ID = s.lg_FAMILLE_ID) ORDER BY f.str_NAME LIMIT 1").split('|');
const PN_CREE = !PN;
if (PN_CREE) {
  PN = 'E2E-AUD-PN'; CIP_N = '9990417'; STOCK_N = '0';
  exec(`DELETE FROM t_famille_stock WHERE lg_FAMILLE_ID = '${PN}'; DELETE FROM t_famille WHERE lg_FAMILLE_ID = '${PN}';`
    + `CREATE TEMPORARY TABLE tmp_f SELECT * FROM t_famille WHERE lg_FAMILLE_ID = '${PS}';`
    + `UPDATE tmp_f SET lg_FAMILLE_ID = '${PN}', int_CIP = '${CIP_N}', str_NAME = 'ZZ E2E AUDIT SANS MOUVEMENT', int_EAN13 = NULL;`
    + 'INSERT INTO t_famille SELECT * FROM tmp_f; DROP TEMPORARY TABLE tmp_f;'
    + `CREATE TEMPORARY TABLE tmp_s SELECT * FROM t_famille_stock WHERE lg_FAMILLE_ID = '${PS}' AND lg_EMPLACEMENT_ID = '1' LIMIT 1;`
    + `UPDATE tmp_s SET lg_FAMILLE_STOCK_ID = '${PN}', lg_FAMILLE_ID = '${PN}', int_NUMBER_AVAILABLE = 0, int_NUMBER = 0;`
    + 'INSERT INTO t_famille_stock SELECT * FROM tmp_s; DROP TEMPORARY TABLE tmp_s;');
}
const [TP, TP_NOM, TP_SOLDE] = q("SELECT CONCAT_WS('|', lg_TIERS_PAYANT_ID, str_NAME, COALESCE(account, 0)) FROM t_tiers_payant WHERE is_depot = 1 ORDER BY str_NAME LIMIT 1").split('|');
const HIER = q('SELECT CURDATE() - INTERVAL 1 DAY');
const IL_Y_A_3_JOURS = q("SELECT CONCAT(CURDATE() - INTERVAL 3 DAY, ' 08:30:00')");
const tables = ['t_famille_stock', 'hmvtproduit', 't_tiers_payant', 't_resume_caisse', 't_billetage', 'mvttransaction',
  't_preenregistrement_compte_client', 't_support_ticket', 't_support_job_run', 't_event_log'];
const sommes = () => tables.map((t) => q('CHECKSUM TABLE ' + t).split('\t')[1]).join(',');
const droit = privilegeEssai(q, exec, ENV_E2E.LOGIN, 'P_SM_AUDIT');

function retirer() {
  exec(`DELETE FROM mvttransaction WHERE uuid = '${M}-RG';`
    + `DELETE FROM t_preenregistrement_compte_client WHERE lg_PREENREGISTREMENT_COMPTE_CLIENT_ID = '${M}-PCC';`
    + `DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${M}-V';`
    + `DELETE FROM t_compte_client WHERE lg_COMPTE_CLIENT_ID = '${M}-CC';`
    + `DELETE FROM t_client WHERE lg_CLIENT_ID = '${M}-C';`
    + `DELETE FROM t_billetage WHERE lg_BILLETAGE_ID = '${M}-B';`
    + `DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID IN ('${M}-OUV', '${M}-FER');`
    + `UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = ${STOCK_S}, int_NUMBER = ${STOCK_S} WHERE lg_FAMILLE_ID = '${PS}' AND lg_EMPLACEMENT_ID = '1';`
    + `UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = ${STOCK_N}, int_NUMBER = ${STOCK_N} WHERE lg_FAMILLE_ID = '${PN}' AND lg_EMPLACEMENT_ID = '1';`
    + `UPDATE t_tiers_payant SET account = ${TP_SOLDE} WHERE lg_TIERS_PAYANT_ID = '${TP}';`);
}

function retirerProduitCree() {
  if (PN_CREE) {
    exec(`DELETE FROM t_famille_stock WHERE lg_FAMILLE_ID = '${PN}'; DELETE FROM t_famille WHERE lg_FAMILLE_ID = '${PN}';`);
  }
}

function poser() {
  exec(`UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = ${+STOCK_S + 7}, int_NUMBER = ${+STOCK_S + 7} WHERE lg_FAMILLE_ID = '${PS}' AND lg_EMPLACEMENT_ID = '1';`
    + `UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = -3, int_NUMBER = -3 WHERE lg_FAMILLE_ID = '${PN}' AND lg_EMPLACEMENT_ID = '1';`
    + `UPDATE t_tiers_payant SET account = ${+TP_SOLDE + 1000} WHERE lg_TIERS_PAYANT_ID = '${TP}';`
    + "INSERT INTO t_resume_caisse (ld_CAISSE_ID, lg_USER_ID, int_SOLDE_MATIN, int_SOLDE_SOIR, dt_DAY, dt_CREATED, lg_CREATED_BY, dt_UPDATED, lg_UPDATED_BY, str_STATUT) VALUES"
    + ` ('${M}-OUV', '${ADMIN}', 0, 0, '${IL_Y_A_3_JOURS.slice(0, 10)}', '${IL_Y_A_3_JOURS}', '${ADMIN}', '${IL_Y_A_3_JOURS}', '${ADMIN}', 'is_Using'),`
    + ` ('${M}-FER', '${ADMIN}', 0, 10000, '${HIER}', '${HIER} 08:00:00', '${ADMIN}', '${HIER} 18:00:00', '${ADMIN}', 'is_Closed');`
    + `INSERT INTO t_billetage (lg_BILLETAGE_ID, ld_CAISSE_ID, int_AMOUNT, lg_USER_ID, dt_CREATED, dt_UPDATED) VALUES ('${M}-B', '${M}-FER', 9000, '${ADMIN}', '${HIER} 18:00:00', '${HIER} 18:00:00');`
    + `INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, str_STATUT, dt_CREATED) VALUES ('${M}-C', 'ZZAUDIT', 'Differe', 'enable', NOW());`
    + `INSERT INTO t_compte_client (lg_COMPTE_CLIENT_ID, lg_CLIENT_ID, str_STATUT, dt_CREATED) VALUES ('${M}-CC', '${M}-C', 'enable', NOW());`
    + "INSERT INTO t_preenregistrement (lg_PREENREGISTREMENT_ID, str_REF, str_REF_TICKET, int_PRICE, int_PRICE_REMISE, str_STATUT, dt_CREATED, dt_UPDATED,"
    + " lg_TYPE_VENTE_ID, lg_USER_VENDEUR_ID, lg_USER_CAISSIER_ID, lg_USER_ID, b_IS_CANCEL, b_IS_AVOIR, b_WITHOUT_BON, int_PRICE_OTHER, int_ACCOUNT,"
    + " int_REMISE_PARA, montantTva, checked, copy, imported, margeug, montantttcug, montantnetug, int_SENDTOSUGGESTION)"
    + ` VALUES ('${M}-V', '${M}-V', '0', 10000, 0, 'is_Closed', '${HIER} 10:00:00', '${HIER} 10:00:00', '1', '${ADMIN}', '${ADMIN}', '${ADMIN}', 0, 0, 0, 0, 10000, 0, 0, 1, 0, 0, 0, 0, 0, 0);`
    + "INSERT INTO t_preenregistrement_compte_client (lg_PREENREGISTREMENT_COMPTE_CLIENT_ID, lg_PREENREGISTREMENT_ID, lg_COMPTE_CLIENT_ID, lg_USER_ID, str_STATUT,"
    + ` dt_CREATED, dt_UPDATED, int_PRICE, int_PRICE_RESTE) VALUES ('${M}-PCC', '${M}-V', '${M}-CC', '${ADMIN}', 'is_Closed', '${HIER} 10:00:00', '${HIER} 10:00:00', 10000, 4000);`
    + "INSERT INTO mvttransaction (uuid, categorie, createdAt, mvtdate, pkey, reference, typeTransaction, caisse, lg_EMPLACEMENT_ID, lg_USER_ID, montant,"
    + " montantRegle, montantPaye, montantAcc, margeug, montantttcug, montantnetug, montanttvaug, typeMvtCaisseId, checked, organisme)"
    + ` VALUES ('${M}-RG', 1, '${HIER} 12:00:00', '${HIER}', '${M}-RG', '${M}', 0, '${CAISSE}', '1', '${ADMIN}', 5000, 5000, 5000, 0, 0, 0, 0, 0, '2', 1, '${M}-C');`);
}

(async () => {
  droit.remettre();
  retirer();
  const b = await ENV_E2E.lancer(chromium);
  const dialogues = [];
  try {
    poser();
    const p = await (await b.newContext({ viewport: { width: 1500, height: 950 } })).newPage();
    p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    const menu = q("SELECT str_DESCRIPTION FROM t_sous_menu WHERE str_COMPOSANT = 'auditrapprochements'");
    ok('Menu « Audit & rapprochements » (≤ 25 caractères) dans le Centre de support', menu === 'Audit & rapprochements'
      && q("SELECT m.str_DESCRIPTION FROM t_sous_menu s JOIN t_menu m ON m.lg_MENU_ID = s.lg_MENU_ID WHERE s.str_COMPOSANT = 'auditrapprochements'") !== '', menu);

    const avant = sommes();
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('auditrapprochements', 'Audit & rapprochements', ''));
    await p.waitForFunction(() => document.querySelectorAll('.audit-tuile').length >= 7, null, { timeout: 60000 });
    /* periode du billetage : la semaine passee */
    await p.evaluate((h) => { const a = Ext.ComponentQuery.query('auditrapprochements #ongletAnalyse')[0];
      a.down('#debut').setValue(Ext.Date.add(new Date(), Ext.Date.DAY, -7)); a.down('#fin').setValue(new Date()); }, HIER);
    await p.click('text=Lancer l\'analyse');
    await p.waitForTimeout(800);
    await p.waitForFunction(() => { const a = Ext.ComponentQuery.query('auditrapprochements #ongletAnalyse')[0]; return a && !a.loadMask?.isVisible?.(); }, null, { timeout: 60000 }).catch(() => {});
    await p.waitForTimeout(1500);
    ok('L\'analyse n\'écrit rien (sommes de contrôle de ' + tables.length + ' tables identiques)', sommes() === avant);

    const tuile = (code) => p.evaluate((c) => { const t = document.querySelector('.audit-tuile[data-code="' + c + '"]');
      return t ? { rouge: t.classList.contains('ecart'), n: t.querySelector('.n').textContent, m: t.querySelector('.m').textContent } : null; }, code);
    const detail = async (code) => { await p.click('.audit-tuile[data-code="' + code + '"]'); await p.waitForTimeout(300);
      return p.evaluate(() => { const g = Ext.ComponentQuery.query('auditrapprochements #grilleDetail')[0]; return g ? g.getStore().getRange().map((r) => r.data) : []; }); };

    let t = await tuile('STOCK'); let d = await detail('STOCK');
    let l = d.find((x) => x.cip === CIP_S);
    ok('Stock / historique : tuile rouge, produit modifié présent avec un écart de +7', t && t.rouge && l && l.ecart === 7 && l.stockReel === +STOCK_S + 7, JSON.stringify(l));
    t = await tuile('STOCK_NEGATIF'); d = await detail('STOCK_NEGATIF');
    l = d.find((x) => x.cip === CIP_N);
    ok('Stocks négatifs : produit à −3 présent', t && t.rouge && l && l.stockReel === -3, JSON.stringify(l));
    t = await tuile('CAISSES_OUVERTES'); d = await detail('CAISSES_OUVERTES');
    l = d.find((x) => x.caisse === M + '-OUV');
    ok('Caisses ouvertes : caisse ouverte il y a 3 jours présente (3 jours)', t && t.rouge && l && l.jours === 3, JSON.stringify(l));
    t = await tuile('BILLETAGE'); d = await detail('BILLETAGE');
    l = d.find((x) => x.caisse === M + '-FER');
    ok('Billetage : manquant de 1 000 sur la caisse de la veille', t && t.rouge && l && l.ecart === -1000 && l.attendu === 10000, JSON.stringify(l));
    t = await tuile('DIFFERES'); d = await detail('DIFFERES');
    l = d.find((x) => x.clientId === M + '-C');
    ok('Différés : reste dû 4 000 / relevé 5 000 (écart −1 000)', t && t.rouge && l && l.resteDu === 4000 && l.soldeReleve === 5000 && l.ecart === -1000, JSON.stringify(l));
    t = await tuile('CARNETS'); d = await detail('CARNETS');
    l = d.find((x) => x.tiersPayantId === TP);
    ok('Carnets dépôt : ' + TP_NOM + ' avec un écart de +1 000', t && t.rouge && l && l.ecart === 1000, JSON.stringify(l));
    d = await detail('CONTROLES');
    ok('Contrôles de cohérence : les contrôles actifs sont listés', d.length === +q('SELECT COUNT(*) FROM t_support_controle WHERE actif = 1'), d.length);
    const expl = await p.evaluate(() => Ext.ComponentQuery.query('auditrapprochements #explication')[0].getEl().dom.textContent);
    ok('Le détail choisi s\'explique en clair au-dessus de la liste', /Contrôles automatiques/.test(expl), expl.slice(0, 80));
    ok('Aucune fenêtre affichée', dialogues.length === 0, dialogues.join(' | '));

    /* apres retrait des ecarts poses : les tuiles des sections posees redeviennent sans la ligne */
    retirer();
    await p.click('text=Lancer l\'analyse');
    await p.waitForTimeout(2500);
    d = await detail('DIFFERES');
    ok('Écart retiré : il disparaît à l\'analyse suivante', !d.some((x) => x.clientId === M + '-C'));

    /* sans le droit */
    /* sans le droit (les droits sont lus a la connexion : nouvelle connexion) */
    droit.retirer();
    const p2 = await (await b.newContext()).newPage();
    await p2.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p2.fill('#str_login', ENV_E2E.LOGIN); await p2.fill('#str_password', 'e2etest'); await p2.click('#login');
    await p2.waitForURL('**/general/**', { timeout: 60000 });
    const refus = await p2.evaluate(async () => (await (await fetch('../api/v1/audit/analyse')).json()));
    ok('Sans le droit P_SM_AUDIT : analyse refusée par le serveur', refus.success === false && /droit|connecter/.test(refus.msg || ''), JSON.stringify(refus));
  } finally {
    droit.remettre();
    retirer();
    retirerProduitCree();
    exec(`DELETE FROM t_audit_rapport WHERE created_at >= '${DEBUT}'`); /* rapports conserves par « Lancer l'analyse » */
    await b.close();
    ok('Données d\'essai retirées', q(`SELECT COUNT(*) FROM t_resume_caisse WHERE ld_CAISSE_ID LIKE '${M}-%'`) === '0'
      && q(`SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID = '${M}-C'`) === '0'
      && q(`SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_FAMILLE_ID = '${PS}' AND lg_EMPLACEMENT_ID = '1'`) === STOCK_S
      && q(`SELECT COALESCE(account, 0) FROM t_tiers_payant WHERE lg_TIERS_PAYANT_ID = '${TP}'`) === TP_SOLDE);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
  process.exit(ko ? 1 : 0);
})();
