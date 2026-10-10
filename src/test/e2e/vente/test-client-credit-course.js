/* BUG ALEATOIRE DE LA VENTE (retours du 10/10, video bugVente.mp4) : « Cette vente n'a plus de client », « TPundefined »,
 * « Taux : undefined% ».
 * Cause : sur une vente deja creee, la recherche client validee par Entree envoyait en meme temps « detacher le client »
 * et « rattacher le client trouve » ; selon celle qui finissait la derniere, la vente restait sans client.
 * Le test joue le chemin de la video par l'ecran : vente au comptant avec un produit, bascule en Carnet, recherche du
 * client (un seul resultat) puis Entree. Le serveur est rendu lent comme le 08/10 (le detachement, s'il est envoye,
 * arrive apres le rattachement). Puis : nouvelle recherche du meme client (pas de ligne de tiers payant en double),
 * net a payer, et rappel d'une vente dont le client a disparu (plus d'« undefined »).
 * Tout est retire a la fin. */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined && d !== '' ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', process.env.DB_TEST || 'capitale', '-sN'], { input: s, encoding: 'utf8' }).trim();
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin'");
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
const CAISSE = 'e2e-course-caisse';
let caisseCreee = false;
/* un produit au comptant, avec du stock */
const [FID, CIP] = q("SELECT CONCAT_WS('|', f.lg_FAMILLE_ID, f.int_CIP) FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
  + " WHERE f.str_STATUT = 'enable' AND f.int_CIP REGEXP '^[0-9]{7}$' AND s.int_NUMBER_AVAILABLE > 20 AND f.int_PRICE > 0 AND COALESCE(f.bool_DECONDITIONNE, 0) = 0"
  + " AND (SELECT COUNT(*) FROM t_famille g WHERE g.int_CIP = f.int_CIP) = 1 ORDER BY f.str_NAME LIMIT 1").split('|');
/* clients carnet ayant un compte de tiers payant actif (le test retient celui que la recherche trouve seul) */
const CANDIDATS = q("SELECT DISTINCT CONCAT_WS('|', c.lg_CLIENT_ID, c.str_FIRST_NAME, c.str_LAST_NAME) FROM t_client c JOIN t_compte_client cc ON cc.lg_CLIENT_ID = c.lg_CLIENT_ID"
  + " JOIN t_compte_client_tiers_payant cctp ON cctp.lg_COMPTE_CLIENT_ID = cc.lg_COMPTE_CLIENT_ID AND cctp.str_STATUT = 'enable'"
  + " JOIN t_tiers_payant tp ON tp.lg_TIERS_PAYANT_ID = cctp.lg_TIERS_PAYANT_ID AND tp.lg_TYPE_TIERS_PAYANT_ID = '2' AND tp.str_STATUT = 'enable'"
  + " WHERE c.str_STATUT = 'enable' AND c.lg_TYPE_CLIENT_ID = '2' LIMIT 40").split('\n').filter(Boolean).map((l) => l.split('|'));

/* client carnet d'essai au nom unique : copie d'un client carnet du banc (client, compte, compte tiers payant, ayants droit) */
const MODELE = CANDIDATS.length ? CANDIDATS[0][0] : '';
const NOM = 'ZZE2E COURSE';
/* colonnes ordinaires d'une table (sans les colonnes calculees) */
const colonnes = (t) => q(`SELECT GROUP_CONCAT(CONCAT('\`', COLUMN_NAME, '\`') ORDER BY ORDINAL_POSITION) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${t}' AND EXTRA NOT LIKE '%GENERATED%'`);
function poserClient() {
  retirerClient();
  const cc = colonnes('t_client'), ccc = colonnes('t_compte_client'), ctp = colonnes('t_compte_client_tiers_payant'), cad = colonnes('t_ayant_droit');
  q(`CREATE TEMPORARY TABLE e2e_c SELECT * FROM t_client WHERE lg_CLIENT_ID = '${MODELE}';
     UPDATE e2e_c SET lg_CLIENT_ID = 'E2E-COURSE-CLI', str_FIRST_NAME = '${NOM}', str_LAST_NAME = 'CARNET', str_CODE_INTERNE = 'E2ECOURSE';
     INSERT INTO t_client (${cc}) SELECT ${cc} FROM e2e_c;
     CREATE TEMPORARY TABLE e2e_cc SELECT * FROM t_compte_client WHERE lg_CLIENT_ID = '${MODELE}' LIMIT 1;
     CREATE TEMPORARY TABLE e2e_cctp SELECT * FROM t_compte_client_tiers_payant WHERE lg_COMPTE_CLIENT_ID = (SELECT lg_COMPTE_CLIENT_ID FROM e2e_cc) AND str_STATUT = 'enable' LIMIT 1;
     UPDATE e2e_cc SET lg_COMPTE_CLIENT_ID = 'E2E-COURSE-CC', lg_CLIENT_ID = 'E2E-COURSE-CLI';
     INSERT INTO t_compte_client (${ccc}) SELECT ${ccc} FROM e2e_cc;
     UPDATE e2e_cctp SET lg_COMPTE_CLIENT_TIERS_PAYANT_ID = 'E2E-COURSE-CCTP', lg_COMPTE_CLIENT_ID = 'E2E-COURSE-CC';
     INSERT INTO t_compte_client_tiers_payant (${ctp}) SELECT ${ctp} FROM e2e_cctp;
     CREATE TEMPORARY TABLE e2e_ad SELECT * FROM t_ayant_droit WHERE lg_CLIENT_ID = '${MODELE}' LIMIT 1;
     UPDATE e2e_ad SET lg_AYANTS_DROITS_ID = 'E2E-COURSE-AD', lg_CLIENT_ID = 'E2E-COURSE-CLI', str_FIRST_NAME = '${NOM}', str_LAST_NAME = 'CARNET';
     INSERT INTO t_ayant_droit (${cad}) SELECT ${cad} FROM e2e_ad;`);
}
function retirerClient() {
  q(`DELETE FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_COMPTE_CLIENT_TIERS_PAYANT_ID = 'E2E-COURSE-CCTP';
     DELETE FROM t_compte_client_tiers_payant WHERE lg_COMPTE_CLIENT_TIERS_PAYANT_ID = 'E2E-COURSE-CCTP';
     DELETE FROM t_compte_client WHERE lg_COMPTE_CLIENT_ID = 'E2E-COURSE-CC';
     DELETE FROM t_ayant_droit WHERE lg_AYANTS_DROITS_ID = 'E2E-COURSE-AD';
     DELETE FROM t_client WHERE lg_CLIENT_ID = 'E2E-COURSE-CLI';`);
}

const ventes = () => q("SELECT IFNULL(GROUP_CONCAT(CONCAT('''', lg_PREENREGISTREMENT_ID, '''')), '''-''') FROM t_preenregistrement WHERE dt_CREATED >= '" + DEBUT + "' AND lg_USER_ID = '" + ADMIN + "'");
function nettoyer() {
  const v = ventes();
  q("CREATE TEMPORARY TABLE e2e_cc_l AS SELECT lg_PREENREGISTREMENT_DETAIL_ID id FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DELETE FROM hmvtproduit WHERE pkey IN (SELECT id FROM e2e_cc_l);"
    + "DELETE FROM mvttransaction WHERE pkey IN (" + v + ") OR vente_id IN (" + v + ");"
    + "DELETE FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DELETE FROM t_preenregistrement_compte_client WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "UPDATE t_preenregistrement SET lg_PREENGISTREMENT_ANNULE_ID = NULL, lg_PARENT_ID = NULL, lg_REGLEMENT_ID = NULL WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DROP TEMPORARY TABLE IF EXISTS e2e_cc_l;"
    + (caisseCreee ? `DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID = '${CAISSE}';` : ''));
}

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1500, height: 950 } });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const detachements = [];
  try {
    ok('Précondition : un produit (' + CIP + ') et des clients carnet', !!FID && CANDIDATS.length > 0, CANDIDATS.length);
    if (q(`SELECT COUNT(*) FROM t_resume_caisse WHERE lg_USER_ID = '${ADMIN}' AND str_STATUT = 'is_Using'`) === '0') {
      q(`INSERT INTO t_resume_caisse (ld_CAISSE_ID, lg_USER_ID, int_SOLDE_MATIN, int_SOLDE_SOIR, dt_DAY, dt_CREATED, lg_CREATED_BY, dt_UPDATED, lg_UPDATED_BY, str_STATUT)`
        + ` VALUES ('${CAISSE}', '${ADMIN}', 0, 0, CURDATE(), NOW(), '${ADMIN}', NOW(), '${ADMIN}', 'is_Using')`);
      caisseCreee = true;
    }
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });

    /* le client que la recherche trouve seul (meme chemin que l'ecran : client/all, clients carnet) */
    poserClient();
    const trouves = await p.evaluate(async (a) => (await (await fetch('../api/v1/client/all?typeClientId=2&query=' + encodeURIComponent(a))).json()), NOM);
    const liste = trouves.data || [];
    const CLIENT = liste.length === 1 && liste[0].lgCLIENTID === 'E2E-COURSE-CLI' ? { id: 'E2E-COURSE-CLI', recherche: NOM } : null;
    ok('Précondition : un client carnet trouvé seul par la recherche', !!CLIENT, CLIENT && CLIENT.recherche);

    /* serveur lent comme le 08/10 : un detachement envoye par l'ecran part 1,5 s plus tard */
    await ctx.route('**/api/v1/vente/retmoveClient/**', async (route) => {
      detachements.push(route.request().url());
      await new Promise((r) => setTimeout(r, 1500));
      route.continue();
    });

    const nouvelleVente = async () => {
      await p.reload({ waitUntil: 'domcontentloaded' });
      await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
      await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('doventemanager', {}));
      await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('doventemanager #produit')[0]; return c && c.isVisible(); }, null, { timeout: 30000 });
      await p.waitForTimeout(1500);
    };
    const attendre = async () => {
      await p.waitForTimeout(800);
      await p.waitForFunction(() => !Ext.Ajax.isLoading(), null, { timeout: 30000 }).catch(() => {});
      await p.waitForTimeout(2500); /* le detachement retarde a le temps d'arriver */
      await p.waitForFunction(() => !Ext.Ajax.isLoading(), null, { timeout: 30000 }).catch(() => {});
    };
    const scanner = async (texte) => {
      await p.evaluate(() => { const c = Ext.ComponentQuery.query('doventemanager #produit')[0]; c.clearValue(); c.inputEl.dom.setAttribute('data-e2e', 'produit'); c.focus(); });
      await p.click('[data-e2e=produit]');
      await p.keyboard.type(texte, { delay: 5 });
      await p.keyboard.press('Enter');
      await attendre();
    };
    const rechercherClient = async (texte) => {
      await p.evaluate(() => { const c = Ext.ComponentQuery.query('doventemanager #contenu #clientSearchTextField')[0]; c.setValue(''); c.inputEl.dom.setAttribute('data-e2e', 'client'); c.focus(); });
      await p.click('[data-e2e=client]');
      await p.keyboard.type(texte, { delay: 5 });
      await p.keyboard.press('Enter');
      await attendre();
      await p.evaluate(() => { if (Ext.Msg.isVisible()) { Ext.Msg.hide(); } });
    };
    const vente = () => p.evaluate(() => { const v = testextjs.app.getController('VenteCtr').getCurrent(); return v ? v.lgPREENREGISTREMENTID : null; });
    const enBase = (v) => q(`SELECT CONCAT(IFNULL(lg_CLIENT_ID, 'SANS CLIENT'), '|', lg_TYPE_VENTE_ID, '|', (SELECT COUNT(*) FROM t_preenregistrement_compte_client_tiers_payent x WHERE x.lg_PREENREGISTREMENT_ID = '${v}')) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${v}'`);
    const blocTp = () => p.evaluate(() => { const f = testextjs.app.getController('VenteCtr').getTpContainerForm(); return f && f.getEl() ? f.getEl().dom.textContent.replace(/\s+/g, ' ').trim() : ''; });

    /* ------------------------------------------- comptant -> Carnet -> client */
    await nouvelleVente();
    await scanner(CIP);
    const v = await vente();
    ok('Vente au comptant commencée (un produit)', !!v && enBase(v).endsWith('|1|0'), v && enBase(v));
    await p.evaluate(() => { const ctr = testextjs.app.getController('VenteCtr'); const c = ctr.getTypeVenteCombo(); c.setValue('3'); ctr.onTypeVenteSelect(c); });
    await attendre();
    ok('Bascule en Carnet enregistrée', enBase(v).split('|')[1] === '3', enBase(v));
    await rechercherClient(CLIENT.recherche);
    ok('Client choisi par la recherche + Entrée : il RESTE sur la vente (serveur lent)', enBase(v) === CLIENT.id + '|3|1', enBase(v) + ' ; détachements envoyés : ' + detachements.length);
    let tp = await blocTp();
    ok('Bloc tiers payant complet à l\'écran (jamais « undefined »)', tp.length > 0 && !/undefined/.test(tp), tp);

    /* -------------------------------- meme client recherche une 2e fois */
    await rechercherClient(CLIENT.recherche);
    ok('Nouvelle recherche du même client : toujours rattaché, une seule ligne de tiers payant', enBase(v) === CLIENT.id + '|3|1', enBase(v));

    /* -------------------------------------------------------- net a payer */
    await p.evaluate(() => { const ctr = testextjs.app.getController('VenteCtr'); const bon = ctr.champDuBlocTp(ctr.getTpContainerForm(), 'textfield', 'refBon'); if (bon) { bon.setValue('E2E545454'); } });
    await p.evaluate(() => { testextjs.app.getController('VenteCtr').showNetPaidAssurance(); });
    await attendre();
    const boite = await p.evaluate(() => (Ext.Msg.isVisible() ? Ext.Msg.msg.getEl().dom.textContent : ''));
    await p.evaluate(() => { if (Ext.Msg.isVisible()) { Ext.Msg.hide(); } });
    const net = await p.evaluate(() => { const n = testextjs.app.getController('VenteCtr').getNetAmountToPay(); return n ? n.montantNet : null; });
    ok('Net à payer calculé (pas de « Cette vente n\'a plus de client »)', !/plus de client/.test(boite) && net !== null, boite + ' / net ' + net);

    /* ------------------- vente rappelee dont le client a disparu en base */
    q(`DELETE FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID = '${v}'; UPDATE t_preenregistrement SET lg_CLIENT_ID = NULL WHERE lg_PREENREGISTREMENT_ID = '${v}';`);
    await p.evaluate((id) => { const ctr = testextjs.app.getController('VenteCtr'); ctr.loadVenteData(id); }, v);
    await attendre();
    tp = await blocTp();
    const message = await p.evaluate(() => (Ext.Msg.isVisible() ? Ext.Msg.msg.getEl().dom.textContent : ''));
    await p.evaluate(() => { if (Ext.Msg.isVisible()) { Ext.Msg.hide(); } });
    ok('Vente Carnet rappelée sans client : aucun bloc « TPundefined / undefined% »', !/undefined/.test(tp), tp);
    ok('… et la caissière est prévenue que le client manque', /client/i.test(tp + ' ' + message), tp + ' / ' + message);
    /* cloture d'une vente ordonnanciere sans client : pas de client comptant propose sur une vente a credit */
    await p.evaluate(() => { testextjs.app.getController('VenteCtr').ouvrirParcoursOrdonnance(); });
    await p.waitForTimeout(800);
    const parcours = await p.evaluate(() => ({ fenetre: Ext.ComponentQuery.query('window').some((w) => w.isVisible() && /OrdonnanceParcours/.test(w.$className)),
      boite: Ext.Msg.isVisible() ? Ext.Msg.msg.getEl().dom.textContent : '' }));
    await p.evaluate(() => { if (Ext.Msg.isVisible()) { Ext.Msg.hide(); } });
    ok('Vente ordonnancière à crédit sans client : renvoi à la recherche du client assuré (pas de client comptant)', !parcours.fenetre && /recherchez le client assuré/.test(parcours.boite), JSON.stringify(parcours));

    /* la caissiere recherche le client sur la vente rappelee : il est rattache, le bloc revient */
    await rechercherClient(CLIENT.recherche);
    tp = await blocTp();
    ok('Vente rappelée sans client : la recherche le rattache (base et écran)', enBase(v) === CLIENT.id + '|3|1' && /Taux:100%/.test(tp) && !/absent/.test(tp), enBase(v) + ' / ' + tp);

    /* serveur : les deux ordres envoyes en meme temps (ancien ecran, autre poste) ne laissent jamais d'etat incoherent */
    await ctx.unroute('**/api/v1/vente/retmoveClient/**');
    const etats = {};
    for (let i = 0; i < 20; i++) {
      await p.evaluate(async (a) => {
        const put = (u, corps) => fetch(u, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: corps ? JSON.stringify(corps) : undefined });
        const r1 = put('../api/v1/vente/retmoveClient/' + a.v);
        await new Promise((r) => setTimeout(r, a.delai));
        const r2 = put('../api/v1/vente/client/' + a.v, { clientId: a.client, ayantDroitId: null, tierspayants: [{ compteTp: 'E2E-COURSE-CCTP', taux: 100, numBon: 'E2E1' }] });
        await Promise.all([r1, r2]);
      }, { v, client: CLIENT.id, delai: i % 3 });
      const e = enBase(v);
      etats[e] = (etats[e] || 0) + 1;
    }
    ok('Ordres simultanés sur le serveur : jamais de ligne orpheline ni en double (client ET 1 ligne, ou ni l\'un ni l\'autre)',
      Object.keys(etats).every((e) => e === CLIENT.id + '|3|1' || e === 'SANS CLIENT|3|0'), JSON.stringify(etats));
    /* rattachement refuse (client sans compte tiers payant) : la vente garde son client */
    await p.evaluate(async (a) => fetch('../api/v1/vente/client/' + a.v, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: a.client, tierspayants: [{ compteTp: 'E2E-COURSE-CCTP', taux: 100 }] }) }), { v, client: CLIENT.id });
    const refus = await p.evaluate(async (a) => (await (await fetch('../api/v1/vente/client/' + a.v, { method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: a.client, tierspayants: [] }) })).json()), { v, client: CLIENT.id });
    ok('Rattachement sans compte tiers payant refusé avec explication, la vente garde son client', refus.success === false && /compte tiers payant/.test(refus.msg) && enBase(v) === CLIENT.id + '|3|1',
      JSON.stringify(refus) + ' ' + enBase(v));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Déroulement du test', false, e.stack || e);
  } finally {
    await b.close();
    try { nettoyer(); } catch (e) { console.log('nettoyage : ' + e.message); }
    try { retirerClient(); } catch (e) { console.log('client : ' + e.message); }
    ok('Remise en état : ventes et client du test retirés', q(`SELECT COUNT(*) FROM t_preenregistrement WHERE dt_CREATED >= '${DEBUT}' AND lg_USER_ID = '${ADMIN}'`) === '0'
      && q("SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID = 'E2E-COURSE-CLI'") === '0');
    const n = res.filter((x) => x.c).length;
    console.log('\n' + n + '/' + res.length + (n === res.length ? ' OK' : ' ECHEC'));
    process.exit(n === res.length ? 0 : 1);
  }
})();
