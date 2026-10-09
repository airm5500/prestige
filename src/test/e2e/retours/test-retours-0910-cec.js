/* RETOURS DU 09/10, POINTS 2 ET 3 (commandes) :
 *  - liste des suggestions : bouton « Commander par PharmaML » en bas, a cote de la pagination ; sans suggestion
 *    cochee -> message ; deux cochees -> message ; une cochee -> meme apercu/confirmation que l'action de la ligne
 *    (reference, lignes) ; « Non » n'envoie rien ;
 *  - ecran de traitement d'une commande : le bouton est dans la barre du bas, a gauche de « CREER BON DE LIVRAISON »,
 *    plus en haut ; absent si le grossiste n'a pas de lien PharmaML ;
 *  - Commandes en cours : bouton « VÉRIFIER L'IMPORT » retire ;
 *  - droits des onglets Substitutions, Alertes, Tableau de bord : avec les droits, 5 onglets ; sans les droits
 *    Alertes et Tableau de bord, ces onglets disparaissent (hub et ecran « Liste des ruptures »), le serveur refuse
 *    leurs donnees et la pastille Substitutions reste ; les droits sont remis a la fin ;
 *  - rien de tronque, aucune erreur JavaScript ; donnees du test retirees.
 */
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const SORTIE = process.env.SORTIE || '/tmp';
const G = '51217123531215794892';
const SUGG = 'E2E-0910-SUGG', SUGG2 = 'E2E-0910-SUGG2', CMD = 'E2E-0910-CMD';
const ROLE = q("SELECT ru.lg_ROLE_ID FROM t_user u JOIN t_role_user ru ON ru.lg_USER_ID = u.lg_USER_ID WHERE u.str_LOGIN = 'admin' LIMIT 1");
const RETIRES = ['P_CEC_ALERTES', 'P_CEC_TABLEAU_BORD'];
let sauve = null, P = [], droitsRetires = [];

function nettoyer() {
  exec("DELETE FROM t_order_detail WHERE lg_ORDER_ID = '" + CMD + "'; DELETE FROM t_order WHERE lg_ORDER_ID = '" + CMD + "';"
    + "DELETE FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID IN ('" + SUGG + "', '" + SUGG2 + "');"
    + "DELETE FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID IN ('" + SUGG + "', '" + SUGG2 + "');");
}
function remettreDroits() {
  droitsRetires.forEach((l) => exec("INSERT INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED, dt_UPDATED) VALUES ('"
    + l[0] + "', '" + l[1] + "', '" + l[2] + "', NOW(), NOW())"));
  droitsRetires = [];
}
const url = (u) => exec("UPDATE t_grossiste SET str_URL_PHARMAML = " + (u === null ? 'NULL' : "'" + u + "'") + " WHERE lg_GROSSISTE_ID = '" + G + "'");

(async () => {
  sauve = q("SELECT IFNULL(str_URL_PHARMAML, 'NULL') FROM t_grossiste WHERE lg_GROSSISTE_ID = '" + G + "'");
  P = q("SELECT GROUP_CONCAT(lg_FAMILLE_ID ORDER BY str_NAME SEPARATOR '|') FROM (SELECT lg_FAMILLE_ID, str_NAME FROM t_famille WHERE str_STATUT='enable'"
    + " AND int_CIP REGEXP '^[0-9]{7}$' ORDER BY str_NAME LIMIT 2) x").split('|');
  nettoyer();
  const { chromium } = require('playwright-core');
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  let ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
  let p = await ctx.newPage();
  const err = [];
  const connexion = async () => {
    p.on('pageerror', (e) => err.push(String(e.message)));
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
  };
  const message = async () => {
    await p.waitForFunction(() => Ext.MessageBox.isVisible(), null, { timeout: 20000 });
    return p.evaluate(() => ({ t: Ext.MessageBox.msg.getEl().dom.textContent, oui: Ext.MessageBox.msgButtons.yes.isVisible() }));
  };
  const fermer = async (bouton) => {
    await p.click('#' + await p.evaluate((x) => Ext.MessageBox.msgButtons[x].getId(), bouton));
    await p.waitForTimeout(500);
  };
  const ouvrirHub = async () => {
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('i_order_manager', 'Commande en cours', ''));
    await p.waitForFunction(() => { const h = Ext.ComponentQuery.query('commandesencours')[0]; return h && h.isVisible() && h.droits; }, null, { timeout: 30000 });
    await p.waitForTimeout(1200);
    return p.evaluate(() => Ext.ComponentQuery.query('commandesencours')[0].query('button[cls=cec-onglet]').filter((x) => x.isVisible())
      .map((x) => x.getEl().dom.textContent.trim().replace(/\s*\d+$/, '')).join('|'));
  };
  try {
    await connexion();
    url('http://127.0.0.1:9/inutilise/');

    /* 1) liste des suggestions : bouton du bas */
    [SUGG, SUGG2].forEach((s) => {
      exec("INSERT INTO t_suggestion_order (lg_SUGGESTION_ORDER_ID, str_REF, lg_GROSSISTE_ID, str_STATUT, dt_CREATED, dt_UPDATED) VALUES ('" + s + "', '" + s + "-REF', '" + G + "', 'is_Process', NOW(), NOW())");
      P.forEach((f, i) => exec("INSERT INTO t_suggestion_order_details (lg_SUGGESTION_ORDER_DETAILS_ID, lg_SUGGESTION_ORDER_ID, lg_GROSSISTE_ID, lg_FAMILLE_ID, int_NUMBER, int_PRICE, int_PRICE_DETAIL, int_PAF_DETAIL, dt_CREATED, dt_UPDATED, str_STATUT, b_falg)"
        + " VALUES ('" + s + "-L" + i + "', '" + s + "', '" + G + "', '" + f + "', " + (i + 2) + ", 200, 1500, 1000, NOW(), NOW(), 'is_Process', 0)"));
    });
    await p.evaluate(() => { testextjs.app.getController('App').onRedirectTo('i_sugg_manager', {}); });
    await p.waitForFunction(() => Ext.ComponentQuery.query('i_sugg_manager').length > 0 && Ext.ComponentQuery.query('i_sugg_manager')[0].isVisible(), null, { timeout: 30000 });
    await p.evaluate(() => { const g = Ext.ComponentQuery.query('i_sugg_manager')[0]; g.down('[text=Tout décocher]') && g.down('[text=Tout décocher]').handler.call(g); suggCheckedIds.length = 0; g.majCompteurCoches(); });
    await p.evaluate(() => { Ext.getCmp('rechecher').setValue('E2E-0910-SUGG'); Ext.ComponentQuery.query('i_sugg_manager')[0].onRechClick(); });
    await p.waitForFunction(() => { const st = Ext.ComponentQuery.query('i_sugg_manager')[0].getStore(); return !st.isLoading() && st.getCount() === 2; }, null, { timeout: 30000 });
    const bs = await p.evaluate(() => { const c = Ext.getCmp('btn_sugglist_commander_pml'), g = Ext.ComponentQuery.query('i_sugg_manager')[0];
      if (!c || !c.isVisible()) { return { visible: false }; }
      const r = c.getEl().dom.getBoundingClientRect(), gr = g.getEl().dom.getBoundingClientRect(), txt = c.getEl().dom.querySelector('.x-btn-inner');
      return { visible: true, enBas: c.up('pagingtoolbar') === g.down('pagingtoolbar') && r.bottom > gr.bottom - 60, dedans: r.right <= gr.right + 1 && r.right <= window.innerWidth,
        entier: txt.scrollWidth <= txt.clientWidth + 1, fond: getComputedStyle(c.getEl().dom).backgroundColor }; });
    await p.screenshot({ path: SORTIE + '/0910-sugg-bas.png' });
    ok('Suggestions : bouton « Commander par PharmaML » en bas (barre de pagination), entier, dans l\'écran, vert', bs.visible && bs.enBas && bs.dedans && bs.entier && bs.fond === 'rgb(23, 121, 95)', JSON.stringify(bs));
    await p.click('#btn_sugglist_commander_pml');
    let m = await message();
    ok('Aucune suggestion cochée : message « Cochez la suggestion à commander »', /Cochez la suggestion à commander/.test(m.t) && !m.oui, m.t);
    await fermer('ok');
    const cocher = async (ref) => {
      const cell = await p.evaluate((r) => { const g = Ext.ComponentQuery.query('i_sugg_manager')[0], st = g.getStore(), rec = st.getAt(st.findExact('str_REF', r));
        const col = g.down('checkcolumn'); return g.getView().getCell(rec, col).dom.id; }, ref);
      await p.click('#' + cell + ' div');
      await p.waitForTimeout(300);
    };
    await cocher(SUGG + '-REF'); await cocher(SUGG2 + '-REF');
    await p.click('#btn_sugglist_commander_pml');
    m = await message();
    ok('Deux suggestions cochées : message « cochez-en une seule », rien envoyé', /2 suggestions sont cochées/.test(m.t) && !m.oui, m.t);
    await fermer('ok');
    await cocher(SUGG2 + '-REF');
    await p.click('#btn_sugglist_commander_pml');
    m = await message();
    ok('Une suggestion cochée : même aperçu que l\'action de la ligne (référence, 2 lignes, confirmation)', m.oui && new RegExp(SUGG + '-REF').test(m.t) && /2 ligne\(s\)/.test(m.t), m.t);
    await fermer('no');
    ok('« Non » : rien n\'est envoyé (suggestion toujours en cours, aucune commande créée)',
      q("SELECT str_STATUT FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID = '" + SUGG + "'") === 'is_Process'
      && q("SELECT COUNT(*) FROM t_order WHERE lg_GROSSISTE_ID = '" + G + "' AND dt_CREATED >= NOW() - INTERVAL 5 MINUTE AND lg_ORDER_ID <> '" + CMD + "'") === '0');
    await p.evaluate(() => { suggCheckedIds.length = 0; });

    /* 2) Commandes en cours : bouton « VÉRIFIER L'IMPORT » retire ; 5 onglets avec les droits */
    let onglets = await ouvrirHub();
    ok('Avec les droits : 5 onglets', onglets === 'Commandes en cours|Ruptures|Substitutions|Alertes|Tableau de bord', onglets);
    const barre = await p.evaluate(() => Ext.ComponentQuery.query('i_order_manager')[0].query('button').filter((x) => x.isVisible()).map((x) => x.getText()).join('|'));
    ok('Bouton « VÉRIFIER L\'IMPORT » retiré, les autres boutons restent', !/VÉRIFIER L'IMPORT|Verifier l'importation/i.test(barre) && /IMPORTER UNE COMMANDE/.test(barre) && /FUSIONNER DES COMMANDES/.test(barre) && /RÉPONSES PHARMAML/.test(barre), barre);
    const coupe = await p.evaluate(() => { const g = Ext.ComponentQuery.query('i_order_manager')[0], gr = g.getEl().dom.getBoundingClientRect();
      return g.query('button').filter((x) => x.isVisible()).filter((x) => { const r = x.getEl().dom.getBoundingClientRect(), t = x.getEl().dom.querySelector('.x-btn-inner'); return r.right > gr.right + 1 || (t && t.scrollWidth > t.clientWidth + 1); }).map((x) => x.getText()); });
    ok('Barre d\'outils : aucun bouton coupé ni hors de l\'écran', coupe.length === 0, JSON.stringify(coupe));

    /* 3) ecran de traitement d'une commande : bouton dans la barre du bas */
    exec("INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)"
      + " VALUES ('" + CMD + "', '" + CMD + "', 2, '" + G + "', (SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin' LIMIT 1), 'is_Process', NOW(), NOW(), 0, 0, 0)");
    P.forEach((f, i) => exec("INSERT INTO t_order_detail (lg_ORDERDETAIL_ID, lg_ORDER_ID, lg_FAMILLE_ID, lg_GROSSISTE_ID, int_NUMBER, int_PRICE, int_PAF_DETAIL, int_PRICE_DETAIL, str_STATUT, dt_CREATED, dt_UPDATED)"
      + " VALUES ('" + CMD + "-" + i + "', '" + CMD + "', '" + f + "', '" + G + "', " + (i + 2) + ", 0, 1000, 2000, 'is_Process', NOW(), NOW())"));
    const ouvrirCommande = async () => {
      await p.evaluate(() => { testextjs.app.getController('App').onRedirectTo('i_order_manager', {}); });
      await p.waitForFunction(() => Ext.ComponentQuery.query('i_order_manager').length > 0 && Ext.ComponentQuery.query('i_order_manager')[0].isVisible(), null, { timeout: 30000 });
      await p.waitForTimeout(1000);
      await p.evaluate((r) => { Ext.getCmp('rechecher').setValue(r); Ext.ComponentQuery.query('i_order_manager')[0].onRechClick(); }, CMD);
      await p.waitForFunction((r) => { const st = Ext.ComponentQuery.query('i_order_manager')[0].getStore(); return !st.isLoading() && st.findExact('str_REF_ORDER', r) >= 0; }, CMD, { timeout: 30000 });
      await p.evaluate((r) => { const g = Ext.ComponentQuery.query('i_order_manager')[0]; g.onManageDetailsClick(g, g.getStore().findExact('str_REF_ORDER', r)); }, CMD);
      await p.waitForFunction(() => { const g = Ext.getCmp('gridpanelID'); return g && g.isVisible() && !g.getStore().isLoading() && g.getStore().getCount() === 2; }, null, { timeout: 30000 });
      await p.waitForTimeout(800);
      return p.evaluate(() => { const c = Ext.getCmp('btn_cmd_envoyer_pml'), bl = Ext.getCmp('btn_creerbl');
        if (!c || !c.isVisible()) { return { visible: false }; }
        const r = c.getEl().dom.getBoundingClientRect(), rb = bl.getEl().dom.getBoundingClientRect(), tb = c.up('toolbar'), txt = c.getEl().dom.querySelector('.x-btn-inner');
        return { visible: true, barreBas: tb === bl.up('toolbar') && tb.dock === 'bottom', aGaucheBL: r.right <= rb.left + 1 && Math.abs(r.top - rb.top) < 4,
          dedans: r.right <= window.innerWidth, entier: txt.scrollWidth <= txt.clientWidth + 1, fond: getComputedStyle(c.getEl().dom).backgroundColor,
          enHaut: Ext.ComponentQuery.query('fieldcontainer button[text=Commander par PharmaML]').length }; });
    };
    let bc = await ouvrirCommande();
    await p.screenshot({ path: SORTIE + '/0910-commande-bas.png' });
    ok('Traitement de la commande : bouton dans la barre du bas, à gauche de « CREER BON DE LIVRAISON », plus en haut', bc.visible && bc.barreBas && bc.aGaucheBL && bc.enHaut === 0, JSON.stringify(bc));
    ok('Bouton entier, dans l\'écran, vert', bc.dedans && bc.entier && bc.fond === 'rgb(23, 121, 95)', JSON.stringify(bc));
    url(null);
    bc = await ouvrirCommande();
    ok('Grossiste sans lien PharmaML : bouton absent', !bc.visible, JSON.stringify(bc));

    /* 4) sans les droits Alertes et Tableau de bord */
    droitsRetires = RETIRES.map((n) => q("SELECT CONCAT(rp.lg_ROLE_PRIVILEGE, '|', rp.lg_ROLE_ID, '|', rp.lg_PRIVILEGE_ID) FROM t_role_privelege rp JOIN t_privilege pr ON pr.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID"
      + " WHERE rp.lg_ROLE_ID = '" + ROLE + "' AND pr.str_NAME = '" + n + "' LIMIT 1").split('|')).filter((l) => l.length === 3);
    ok('Droits présents pour le rôle de l\'administrateur (migration)', droitsRetires.length === 2, JSON.stringify(droitsRetires));
    droitsRetires.forEach((l) => exec("DELETE FROM t_role_privelege WHERE lg_ROLE_PRIVILEGE = '" + l[0] + "'"));
    await ctx.close();
    ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
    p = await ctx.newPage();
    await connexion();
    onglets = await ouvrirHub();
    ok('Sans les droits Alertes et Tableau de bord : ces onglets disparaissent', onglets === 'Commandes en cours|Ruptures|Substitutions', onglets);
    const api = await p.evaluate(async () => {
      const j = async (u) => (await fetch(u)).json();
      return { alertes: await j('/prestige/api/v1/pharma/alertes'), tb: await j('/prestige/api/v1/pharma/tableau-bord'), subst: await j('/prestige/api/v1/pharma/substitutions') };
    });
    ok('Le serveur refuse les alertes sans le droit', api.alertes.success === false && api.alertes.interdit === true, JSON.stringify(api.alertes));
    ok('Tableau de bord sans le droit : seulement le compteur Substitutions (pastille), pas les données', api.tb.success === true && 'aDecider' in api.tb && !('alertesNonLues' in api.tb) && !('grossistes' in api.tb), JSON.stringify(api.tb).slice(0, 300));
    ok('Substitutions toujours autorisées', api.subst.success !== false, JSON.stringify(api.subst).slice(0, 200));
    const raccourci = await p.evaluate(() => { const h = Ext.ComponentQuery.query('commandesencours')[0]; return h.afficher('alertes') === null && h.getLayout().getActiveItem().xtype; });
    ok('Raccourci vers l\'onglet Alertes refusé (on reste sur la liste)', raccourci === 'i_order_manager', String(raccourci));
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('rupturepharma', 'Liste des ruptures', ''));
    await p.waitForFunction(() => { const r = Ext.ComponentQuery.query('rupturepharma')[0]; return r && r.isVisible() && r.droits; }, null, { timeout: 30000 });
    const ongletsRup = await p.evaluate(() => Ext.ComponentQuery.query('rupturepharma')[0].down('#ongletsRuptures').getTabBar().items.items.filter((t) => t.isVisible()).map((t) => t.getText().replace(/<[^>]+>/g, '').trim()));
    await p.screenshot({ path: SORTIE + '/0910-ruptures-sans-droits.png' });
    ok('Écran « Liste des ruptures » : onglets Alertes et Tableau de bord masqués aussi', ongletsRup.length === 2 && !ongletsRup.some((t) => /Alertes|Tableau/.test(t)), JSON.stringify(ongletsRup));
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    remettreDroits();
    nettoyer();
    exec("UPDATE t_grossiste SET str_URL_PHARMAML = " + (sauve === 'NULL' ? 'NULL' : "'" + sauve + "'") + " WHERE lg_GROSSISTE_ID = '" + G + "'");
    ok('Données d\'essai retirées, droits et grossiste remis',
      q("SELECT COUNT(*) FROM t_order WHERE lg_ORDER_ID = '" + CMD + "'") === '0'
      && q("SELECT COUNT(*) FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID IN ('" + SUGG + "', '" + SUGG2 + "')") === '0'
      && q("SELECT COUNT(*) FROM t_role_privelege rp JOIN t_privilege pr ON pr.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID WHERE rp.lg_ROLE_ID = '" + ROLE + "' AND pr.str_NAME LIKE 'P_CEC_%'") === '3'
      && q("SELECT IFNULL(str_URL_PHARMAML, 'NULL') FROM t_grossiste WHERE lg_GROSSISTE_ID = '" + G + "'") === sauve);
    const n = res.filter((x) => x.c).length;
    console.log('\n' + n + '/' + res.length + ' OK');
    process.exit(n === res.length ? 0 : 1);
  }
})();
