/* SAISIE DE PRODUITS PERIMES PAR L'API (retours du 22/11, lot 11) :
 *  - « recherche de produit » : la liste des produits vient de l'API (/api/v1/gestionperime/produits), plus de
 *    webservices/Report/saisieperimes/ws_article_list.jsp ; meme regle (produit actif dont le nom, la designation, le
 *    CIP ou l'EAN commence par le texte) ; chaque choix montre le CIP et le stock ;
 *  - « on ne voit pas le bas de page, peu importe si on agrandit » : pagination et boutons entiers dans la fenetre ;
 *  - « Enregistrer » devient « Ajouter » ;
 *  - « je ne vois pas comment valider la saisie » : bouton « Valider la saisie (n) » toujours visible, grise sans le droit
 *    (l'infobulle dit lequel), confirmation dans le bouton ;
 *  - « les produits avec des anciennes dates, c'est en attente ? » : colonnes « SAISI PAR » et « EN ATTENTE », lignes
 *    de plus de 30 jours en rouge, bas de fenetre « n depuis plus de 30 jours (la plus ancienne : ...) ».
 *
 * Vrai chemin : menu GESTION DU STOCK › Saisie de produits périmés, « Saisir des produits » (fenetre modale), saisie au
 * clavier, clic sur « Ajouter », icone de retrait, « Valider la saisie », a 1366x768, 1280x720 et 1920x1080.
 * Jeu d'essai (laborex_audit, retire a la fin ; les saisies en attente deja presentes sont mises de cote) : P1 au stock
 * 10, P2 au stock 3 ; lignes en attente W1 (P1, 2, saisie il y a 45 j), W2 (P2, 1, il y a 400 j), W3 (P1, 1, il y a
 * 10 j) ; ajout a l'ecran de P1 lot E2EPA4 x 2.
 * Controles :
 *  - rapprochement recherche : liste a l'ecran = API = base (total, produits de la 1re page, CIP, stock), pour 5 textes
 *    (debut de CIP, debut de nom, EAN, texte absent, « _ » pris a la lettre) ; API = ancienne JSP (sans joker) ;
 *  - mise en page aux 3 tailles : pagination, « Valider », « RETOUR », « Imprimer » entiers dans la fenetre et l'ecran ;
 *  - rapprochement saisie en cours : ecran = base (lot, quantite, auteur, jours) ; bas de fenetre = base (nombre,
 *    anciennes, plus ancienne) ; lignes de plus de 30 jours en rouge, et elles seules ;
 *  - droit retire : bouton grise, infobulle du droit ; rendu : bouton actif ;
 *  - retrait : 1er clic « Retirer ? » sans rien retirer, sans 2e clic rien ne bouge ; 2e clic : la ligne W3 disparait ;
 *  - validation : 1er clic « Confirmer : retirer 3 lignes du stock ? » sans rien changer, sans 2e clic rien ne bouge ;
 *    2e clic : bilan P1 10 → 6, P2 3 → 2, les 3 lignes validees, un mouvement par ligne, rien d'autre ;
 *  - une ligne validee ne peut plus etre retiree (API) ; aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push(!!c); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN'], { input: s, encoding: 'utf8' }).replace(/\r/g, '').trim();
const M = 'E2E-PA22-';
const PARK = 'e2e-pa22-attente';
const PRIV = 'P_CLOTURE_SAISIE_PERIMES';
const debut = q('SELECT NOW()');
const PROD = q("SELECT CONCAT_WS('|', f.lg_FAMILLE_ID, f.int_CIP, f.str_NAME, IFNULL(f.int_EAN13, '')) FROM t_famille f"
  + " JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' AND s.str_STATUT = 'enable'"
  + " WHERE f.str_STATUT = 'enable' AND f.int_PRICE > 0 AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 AND LENGTH(f.int_CIP) >= 6"
  + " AND LENGTH(f.str_NAME) >= 8 AND f.str_NAME NOT LIKE '%\\_%' AND f.str_NAME NOT LIKE '%\\%%'"
  + " AND (SELECT COUNT(*) FROM t_famille_stock x WHERE x.lg_FAMILLE_ID = f.lg_FAMILLE_ID) = 1"
  + " AND NOT EXISTS (SELECT 1 FROM t_lot l WHERE l.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND l.current_stock > 0)"
  + " AND NOT EXISTS (SELECT 1 FROM t_warehouse w WHERE w.lg_FAMILLE_ID = f.lg_FAMILLE_ID)"
  + " ORDER BY f.lg_FAMILLE_ID LIMIT 2 OFFSET 57").split('\n').map((l) => l.split('|'));
const [P1, P2] = PROD.map((x) => x[0]);
const ADMIN = q(`SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN}'`);
const NOM_ADMIN = q(`SELECT TRIM(CONCAT_WS(' ', str_FIRST_NAME, str_LAST_NAME)) FROM t_user WHERE lg_USER_ID = '${ADMIN}'`);
const AVANT = Object.fromEntries(PROD.map(([id]) => [id, q(`SELECT CONCAT_WS('|', int_NUMBER_AVAILABLE, int_NUMBER) FROM t_famille_stock WHERE lg_FAMILLE_ID = '${id}' AND lg_EMPLACEMENT_ID = '1'`)]));
const PARQUES = Number(q("SELECT COUNT(*) FROM t_warehouse WHERE str_STATUT = 'pending'"));
const PRIV0 = q(`SELECT str_STATUT FROM t_privilege WHERE str_NAME = '${PRIV}'`);
const stock = (id) => Number(q(`SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_FAMILLE_ID = '${id}' AND lg_EMPLACEMENT_ID = '1'`));
const nosLignes = () => q("SELECT IFNULL(GROUP_CONCAT(CONCAT(int_NUM_LOT, ':', int_NUMBER, ':', str_STATUT) ORDER BY int_NUM_LOT SEPARATOR ' '), '') FROM t_warehouse WHERE int_NUM_LOT LIKE 'E2EPA%'");
const idsLignes = () => q("SELECT IFNULL(GROUP_CONCAT(CONCAT('''', lg_WAREHOUSE_ID, '''')), '''-''') FROM t_warehouse WHERE int_NUM_LOT LIKE 'E2EPA%'");
/* motif « commence par » de la base, jokers pris a la lettre (meme regle que l'API) */
const motif = (t) => t.trim().replace(/\\/g, '\\\\\\\\').replace(/%/g, '\\\\%').replace(/_/g, '\\\\_').replace(/'/g, "''") + '%';
const filtre = (t) => `FROM t_famille f WHERE f.str_STATUT = 'enable' AND (f.str_NAME LIKE '${motif(t)}' OR f.str_DESCRIPTION LIKE '${motif(t)}' OR f.int_CIP LIKE '${motif(t)}' OR f.int_EAN13 LIKE '${motif(t)}')`;

function retirer() {
  const ids = idsLignes();
  q(`DELETE FROM HMvtProduit WHERE pkey IN (${ids}) OR pkey LIKE '${M}%'; DELETE FROM t_warehouse WHERE int_NUM_LOT LIKE 'E2EPA%';`
    + `DELETE FROM t_event_log WHERE dt_CREATED >= '${debut}' AND str_TYPE_LOG IN ('${PROD.map((x) => x[1]).join("','")}');`
    + `DELETE FROM notification WHERE created_at >= '${debut}';`
    + `DELETE FROM t_suggestion_reserve_detail WHERE lg_FAMILLE_ID IN ('${P1}','${P2}') AND dt_CREATED >= '${debut}';`
    + PROD.map(([id]) => { const [a, n] = AVANT[id].split('|');
      return `UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = ${a}, int_NUMBER = ${n} WHERE lg_FAMILLE_ID = '${id}' AND lg_EMPLACEMENT_ID = '1';`; }).join('')
    + `UPDATE t_privilege SET str_STATUT = '${PRIV0}' WHERE str_NAME = '${PRIV}';`
    + `UPDATE t_warehouse SET str_STATUT = 'pending' WHERE str_STATUT = '${PARK}';`);
}
function poser() {
  q(`UPDATE t_warehouse SET str_STATUT = '${PARK}' WHERE str_STATUT = 'pending';`
    + `UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = 10, int_NUMBER = 10 WHERE lg_FAMILLE_ID = '${P1}' AND lg_EMPLACEMENT_ID = '1';`
    + `UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = 3, int_NUMBER = 3 WHERE lg_FAMILLE_ID = '${P2}' AND lg_EMPLACEMENT_ID = '1';`
    + `INSERT INTO t_warehouse (lg_WAREHOUSE_ID, lg_USER_ID, lg_FAMILLE_ID, int_NUM_LOT, int_NUMBER, dt_CREATED, dt_UPDATED, dt_PEREMPTION, str_STATUT, stock_initial, stock_final) VALUES`
    + ` ('${M}W1', '${ADMIN}', '${P1}', 'E2EPA1', 2, NOW() - INTERVAL 45 DAY, NOW() - INTERVAL 45 DAY, CURDATE() - INTERVAL 50 DAY, 'pending', 10, 8),`
    + ` ('${M}W2', '${ADMIN}', '${P2}', 'E2EPA2', 1, NOW() - INTERVAL 400 DAY, NOW() - INTERVAL 400 DAY, CURDATE() - INTERVAL 410 DAY, 'pending', 3, 2),`
    + ` ('${M}W3', '${ADMIN}', '${P1}', 'E2EPA3', 1, NOW() - INTERVAL 10 DAY, NOW() - INTERVAL 10 DAY, CURDATE() - INTERVAL 12 DAY, 'pending', 8, 7);`);
}

(async () => {
  ok('Préconditions : 2 produits sans lot ni saisie, un compte, le droit de validation', PROD.length === 2 && !!ADMIN && PRIV0 === 'enable', PROD.map((x) => x[1] + ' ' + x[2]).join(', '));
  retirer();
  poser();
  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  const jsp = [];
  try {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
    const p = await ctx.newPage();
    ctx.on('page', (pop) => { if (pop !== p) { pop.close().catch(() => {}); } });
    p.on('pageerror', (e) => err.push(e.message));
    p.on('request', (r) => { if (/saisieperimes\/ws_article_list\.jsp/.test(r.url())) { jsp.push(r.url()); } });
    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const lib = await p.evaluate(() => { const n = Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().findChild('id', 'saisieperime', true);
      return n ? [n.parentNode.get('text'), n.get('text')] : null; });
    if (!lib) { throw new Error('menu saisieperime absent pour ce compte'); }
    await vues.ouvrirMenu(p, lib[0], lib[1]);
    await p.waitForFunction(() => Ext.ComponentQuery.query('saisieperime').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await p.waitForTimeout(1200);
    const charge = () => p.waitForFunction(() => Ext.getCmp('gridpanelArticlePerimes') && Ext.getCmp('gridpanelArticlePerimes').isVisible(true)
      && !Ext.getCmp('gridpanelArticlePerimes').getStore().isLoading(), null, { timeout: 30000 });
    const ouvrir = async () => {
      await vues.cliquer(p, 'saisieperime button[text=Saisir des produits]');
      await charge();
      await p.waitForFunction(() => { const x = Ext.getCmp('btn_create_perime'); return x && x.rendered && !/Vérification/.test(x.getEl().dom.getAttribute('data-qtip') || 'Vérification'); }, null, { timeout: 20000 }).catch(() => {});
      await p.waitForTimeout(800);
    };
    const fermer = async () => { await vues.cliquer(p, 'addPerimer button[text=RETOUR]'); await p.waitForTimeout(900); };

    /* 1. mise en page aux trois tailles */
    for (const [lg, ht] of [[1366, 768], [1280, 720], [1920, 1080]]) {
      await p.setViewportSize({ width: lg, height: ht });
      await p.waitForTimeout(600);
      await ouvrir();
      const m = await p.evaluate(() => {
        const a = Ext.ComponentQuery.query('addPerimer')[0], w = a.up('window'), R = (el) => el.getBoundingClientRect(), wr = R(w.getEl().dom);
        const dans = (c) => { if (!c || !c.getEl()) { return false; } const r = R(c.getEl().dom);
          return r.height > 0 && r.top >= wr.top - 1 && r.bottom <= wr.bottom + 1 && r.left >= wr.left - 1 && r.right <= wr.right + 1 && r.bottom <= window.innerHeight; };
        const grille = Ext.getCmp('gridpanelArticlePerimes');
        return { fenetre: wr.top >= 0 && wr.bottom <= window.innerHeight, pager: dans(grille.down('pagingtoolbar')),
          valider: dans(Ext.getCmp('btn_create_perime')), retour: dans(Ext.getCmp('btn_cancel')), imprimer: dans(Ext.getCmp('btn_print_perime')),
          hauteurListe: Math.round(grille.getView().getEl().getHeight()), hauteurFormulaire: Math.round(a.items.getAt(0).getHeight()),
          ajouter: Ext.getCmp('btn_add').getText() };
      });
      ok(`${lg}×${ht} : pagination, « Valider », « RETOUR » et « Imprimer » entiers dans la fenêtre et l'écran ; la liste prend la place (≥ 150 px), le formulaire sa hauteur (< 110 px)`,
        m.fenetre && m.pager && m.valider && m.retour && m.imprimer && m.hauteurListe >= 150 && m.hauteurFormulaire < 110, JSON.stringify(m));
      ok(`${lg}×${ht} : le bouton d'ajout s'appelle « Ajouter »`, m.ajouter === 'Ajouter', m.ajouter);
      await fermer();
    }
    await p.setViewportSize({ width: 1366, height: 768 });
    await p.waitForTimeout(500);

    /* 2. droit retire : bouton grise, infobulle ; rendu : actif */
    q(`UPDATE t_privilege SET str_STATUT = 'disable' WHERE str_NAME = '${PRIV}'`);
    await ouvrir();
    const sans = await p.evaluate(() => { const x = Ext.getCmp('btn_create_perime'); return { visible: x.isVisible(true), grise: x.isDisabled(), info: x.getEl().dom.getAttribute('data-qtip') || '' }; });
    ok('Sans le droit : « Valider la saisie » visible, grisé, l\'infobulle nomme le droit', sans.visible && sans.grise && /Autorisation cloture saisie de perim/i.test(sans.info), JSON.stringify(sans));
    await fermer();
    q(`UPDATE t_privilege SET str_STATUT = '${PRIV0}' WHERE str_NAME = '${PRIV}'`);
    await ouvrir();

    /* 3. saisie en cours : ecran = base, bas de fenetre, lignes anciennes en rouge */
    const lireGrille = () => p.evaluate(() => { const g = Ext.getCmp('gridpanelArticlePerimes');
      return g.getStore().getRange().filter((r) => /^E2EPA/.test(r.get('lot'))).map((r, i) => {
        const n = g.getView().getNode(r), td = n && n.querySelector('td.perime-ancienne');
        return [r.get('lot'), r.get('quantity'), r.get('utilisateur'), r.get('joursAttente'), td ? 'rouge' : '-'].join(':'); }).sort().join(' '); });
    const base = () => q(`SELECT IFNULL(GROUP_CONCAT(CONCAT_WS(':', w.int_NUM_LOT, w.int_NUMBER, TRIM(CONCAT_WS(' ', u.str_FIRST_NAME, u.str_LAST_NAME)), DATEDIFF(CURDATE(), w.dt_CREATED),`
      + ` IF(DATEDIFF(CURDATE(), w.dt_CREATED) > 30, 'rouge', '-')) ORDER BY w.int_NUM_LOT SEPARATOR ' '), '') FROM t_warehouse w JOIN t_user u ON u.lg_USER_ID = w.lg_USER_ID WHERE w.int_NUM_LOT LIKE 'E2EPA%' AND w.str_STATUT = 'pending'`);
    const g0 = await lireGrille();
    ok('Rapprochement écran / base : lot, quantité, « SAISI PAR », jours d\'attente, rouge au-delà de 30 jours (45 j et 400 j rouges, 10 j non)',
      g0 === base() && g0 === `E2EPA1:2:${NOM_ADMIN}:45:rouge E2EPA2:1:${NOM_ADMIN}:400:rouge E2EPA3:1:${NOM_ADMIN}:10:-`, 'écran « ' + g0 + ' » ; base « ' + base() + ' »');
    const pied = () => p.evaluate(() => Ext.ComponentQuery.query('addPerimer #resumeEnCours')[0].getEl().dom.innerText.replace(/\s+/g, ' ').trim());
    const plusAncienne = q("SELECT DATE_FORMAT(MIN(dt_CREATED), '%d/%m/%Y') FROM t_warehouse WHERE str_STATUT = 'pending'");
    const t0 = await pied();
    ok('Bas de fenêtre = base : « 3 lignes en attente de validation · 2 depuis plus de 30 jours (la plus ancienne : …) »',
      t0 === `3 lignes en attente de validation · 2 depuis plus de 30 jours (la plus ancienne : ${plusAncienne})`, t0);

    /* 4. recherche des produits : ecran = API = base ; API = ancienne JSP */
    const textes = [PROD[0][1].slice(0, 5), PROD[0][2].slice(0, 4), PROD[1][3] || PROD[1][1], 'ZZQX9E2E', PROD[0][1].slice(0, 2) + '_'];
    for (const t of textes) {
      const api = await p.evaluate(async (x) => (await fetch('../api/v1/gestionperime/produits?query=' + encodeURIComponent(x) + '&start=0&limit=20')).json(), t);
      const nb = q(`SELECT COUNT(*) ${filtre(t)}`);
      const page = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT_WS('/', x.lg_FAMILLE_ID, x.int_CIP, IFNULL(x.st, '')) ORDER BY x.o SEPARATOR ' '), '') FROM (SELECT f.lg_FAMILLE_ID, f.int_CIP,`
        + ` (SELECT MAX(s.int_NUMBER_AVAILABLE) FROM t_famille_stock s WHERE s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' AND s.str_STATUT = 'enable') st,`
        + ` ROW_NUMBER() OVER (ORDER BY f.str_DESCRIPTION, f.lg_FAMILLE_ID) o ${filtre(t)} ORDER BY f.str_DESCRIPTION, f.lg_FAMILLE_ID LIMIT 20) x`);
      const vuApi = (api.data || []).map((d) => [d.lg_FAMILLE_ID, d.int_CIP, d.stock === null ? '' : d.stock].join('/')).join(' ');
      ok(`Recherche « ${t} » : API = base (total ${nb}, 1re page : produit, CIP, stock)`, String(api.total) === nb && vuApi === page, api.total + ' / ' + nb + ' ; ' + vuApi.slice(0, 200) + ' | ' + page.slice(0, 200));
      if (!/[_%]/.test(t)) {
        const ancien = await p.evaluate(async (x) => (await fetch('../webservices/Report/saisieperimes/ws_article_list.jsp?query=' + encodeURIComponent(x) + '&start=0&limit=500')).json(), t);
        const tous = await p.evaluate(async (x) => (await fetch('../api/v1/gestionperime/produits?query=' + encodeURIComponent(x) + '&start=0&limit=200')).json(), t);
        const a = (ancien.data || []).map((d) => d.lg_FAMILLE_ID).sort().join(' '), n = (tous.data || []).map((d) => d.lg_FAMILLE_ID).sort().join(' ');
        ok(`Recherche « ${t} » : API = ancienne JSP (même total, mêmes produits)`, String(ancien.total) === String(tous.total) && (Number(tous.total) > 200 || a === n), ancien.total + ' / ' + tous.total);
      } else {
        ok(`Recherche « ${t} » : « _ » pris à la lettre (la JSP le prenait pour un joker)`, String(api.total) === nb);
      }
    }
    /* a l'ecran : le texte tape au clavier, la liste deroulante */
    const cip5 = PROD[0][1];
    await p.locator('#cmb_Article-inputEl').click();
    const rep = p.waitForResponse((r) => /api\/v1\/gestionperime\/produits\?/.test(r.url()) && r.url().includes('query=' + cip5), { timeout: 30000 });
    await p.keyboard.type(cip5, { delay: 80 });
    const corps = await (await rep).json();
    await p.waitForTimeout(700);
    const liste = await p.evaluate(() => Array.from(document.querySelectorAll('.x-boundlist-item')).filter((e) => e.offsetParent).map((e) => e.innerText.replace(/\s+/g, ' ').trim()));
    const attendu = (corps.data || []).map((d) => (d.int_CIP + ' ' + d.str_NAME + (d.stock === null ? '' : ' (stock ' + d.stock + ')')).replace(/\s+/g, ' ').trim());
    ok(`Liste à l'écran (« ${cip5} » tapé) = réponse de l'API, ligne par ligne : CIP, nom, stock`, liste.length > 0 && JSON.stringify(liste) === JSON.stringify(attendu), JSON.stringify(liste).slice(0, 300) + ' / ' + JSON.stringify(attendu).slice(0, 300));
    ok('Le texte tapé reste celui de l\'utilisateur (pas remplacé par un nom)', await p.locator('#cmb_Article-inputEl').inputValue() === cip5, await p.locator('#cmb_Article-inputEl').inputValue());
    ok('Plus aucun appel à ws_article_list.jsp par l\'écran', jsp.filter((u) => !/limit=500/.test(u)).length === 0, jsp.join(' ; '));

    /* 5. ajout par « Ajouter » : P1 lot E2EPA4 x 2 */
    await p.locator('.x-boundlist-item').filter({ visible: true, hasText: PROD[0][2].trim() }).first().click({ timeout: 20000 });
    await p.locator('#str_CODE_LOT-inputEl').fill('E2EPA4');
    await p.locator('#perimeQTY-inputEl').fill('2');
    const j = new Date(Date.now() - 5 * 86400000);
    await p.locator('#str_DATEPERMTION-inputEl').fill(String(j.getDate()).padStart(2, '0') + '/' + String(j.getMonth() + 1).padStart(2, '0') + '/' + j.getFullYear());
    const repAjout = p.waitForResponse((r) => r.url().includes('gestionperime/add'), { timeout: 30000 });
    await vues.cliquer(p, 'addPerimer button[text=Ajouter]');
    const ra = await (await repAjout).json().catch(() => ({}));
    await p.waitForTimeout(900);
    await charge();
    const g1 = await lireGrille();
    ok('« Ajouter » : la ligne E2EPA4 × 2 est dans la saisie en cours, saisie aujourd\'hui par l\'utilisateur ; écran = base',
      ra.success && g1 === base() && g1.includes(`E2EPA4:2:${NOM_ADMIN}:0:-`), JSON.stringify(ra).slice(0, 200) + ' ; ' + g1);
    const cellule = await p.evaluate(() => { const g = Ext.getCmp('gridpanelArticlePerimes'), r = g.getStore().findRecord('lot', 'E2EPA4');
      const col = g.headerCt.getGridColumns().find((c) => c.itemId === 'colEnAttente'); const c = col && g.getView().getCell(r, col); return c ? c.dom.innerText.trim() : '(cellule absente)'; });
    ok('« EN ATTENTE » de la ligne du jour : « aujourd\'hui »', cellule === 'aujourd\'hui', cellule);
    const btnTexte = () => p.evaluate(() => Ext.getCmp('btn_create_perime').getText());
    ok('Bouton « Valider la saisie (4) » (4 lignes en attente), actif', await btnTexte() === 'Valider la saisie (4)' && !(await p.evaluate(() => Ext.getCmp('btn_create_perime').isDisabled())), await btnTexte());

    /* 6. retrait de W3 : confirmation dans l'icone */
    const icone = async (lot) => { const sel = await p.evaluate((l) => { const g = Ext.getCmp('gridpanelArticlePerimes'), r = g.getStore().findRecord('lot', l), n = g.getView().getNode(r);
      const i = n.querySelector('.x-action-col-icon'); i.setAttribute('data-e2e-retirer', l); return '[data-e2e-retirer="' + l + '"]'; }, lot); return p.locator(sel); };
    await (await icone('E2EPA3')).click();
    await p.waitForTimeout(500);
    const arme = await p.evaluate(() => { const x = document.querySelector('.prestige-confirmer-icone'); return x ? x.innerText : ''; });
    ok('Retrait, 1er clic : « Retirer ? » dans la ligne, aucune fenêtre, rien de retiré', arme === 'Retirer ?' && !(await p.evaluate(() => Ext.Msg.isVisible())) && nosLignes().includes('E2EPA3:1:pending'), arme + ' ; ' + nosLignes());
    await p.waitForTimeout(5600);
    ok('Retrait, sans 2e clic : l\'icône revient au bout de 5 s, rien de retiré', await p.locator('.prestige-confirmer-icone').count() === 0 && nosLignes().includes('E2EPA3:1:pending'), nosLignes());
    await (await icone('E2EPA3')).click();
    await p.waitForTimeout(600);
    const repSuppr = p.waitForResponse((r) => r.request().method() === 'DELETE' && r.url().includes('gestionperime/'), { timeout: 30000 });
    await p.locator('.prestige-confirmer-icone').click();
    const rs = await (await repSuppr).json().catch(() => ({}));
    await p.waitForTimeout(900);
    await charge();
    ok('Retrait, 2e clic : la ligne E2EPA3 est retirée (écran et base), les autres restent', rs.success && !nosLignes().includes('E2EPA3') && !(await lireGrille()).includes('E2EPA3') && (await lireGrille()) === base(), JSON.stringify(rs) + ' ; ' + nosLignes());

    /* 7. validation : confirmation dans le bouton, bilan */
    const s0 = [stock(P1), stock(P2)];
    await vues.cliquer(p, 'addPerimer #btn_create_perime');
    await p.waitForTimeout(500);
    ok('Validation, 1er clic : « Confirmer : retirer 3 lignes du stock ? » dans le bouton, aucune fenêtre, rien de changé',
      await btnTexte() === 'Confirmer : retirer 3 lignes du stock ?' && !(await p.evaluate(() => Ext.Msg.isVisible())) && stock(P1) === s0[0] && /E2EPA1:2:pending/.test(nosLignes()), await btnTexte());
    await p.waitForTimeout(5600);
    ok('Validation, sans 2e clic : le bouton revient au bout de 5 s, rien de changé', await btnTexte() === 'Valider la saisie (3)' && stock(P1) === 10 && stock(P2) === 3 && !/delete/.test(nosLignes()), await btnTexte() + ' ; ' + nosLignes());
    await vues.cliquer(p, 'addPerimer #btn_create_perime');
    await p.waitForTimeout(600);
    await vues.cliquer(p, 'addPerimer #btn_create_perime');
    await p.waitForFunction(() => Ext.Msg.isVisible() && /retir/i.test(Ext.Msg.msg.getEl().dom.innerText), null, { timeout: 60000 });
    const msg = await p.evaluate(() => Ext.Msg.msg.getEl().dom.innerText.replace(/\s+/g, ' '));
    await p.evaluate(() => { const x = Ext.Msg.down('button[itemId=ok]'); if (x) { x.btnEl.dom.click(); } });
    await p.waitForTimeout(900);
    ok('Validation, 2e clic : message « retiré : 3 »', /retiré\s*:\s*3\b/.test(msg), msg);
    ok('Bilan : stock P1 10 → 6 (2 + 2), P2 3 → 2', stock(P1) === 6 && stock(P2) === 2, stock(P1) + ' / ' + stock(P2));
    ok('Bilan : les 3 lignes sont validées (E2EPA1, E2EPA2, E2EPA4), aucune autre ligne d\'essai', nosLignes() === 'E2EPA1:2:delete E2EPA2:1:delete E2EPA4:2:delete', nosLignes());
    const mvt = q(`SELECT COUNT(*) FROM HMvtProduit WHERE pkey IN (${idsLignes()})`);
    ok('Bilan : un mouvement de stock par ligne validée (3), pas plus', mvt === '3', mvt);
    ok('Bilan : les saisies mises de côté ne sont pas touchées', Number(q(`SELECT COUNT(*) FROM t_warehouse WHERE str_STATUT = '${PARK}'`)) === PARQUES);
    await charge();
    ok('Après validation : liste vide, bouton « Valider la saisie » grisé, bas de fenêtre « 0 ligne en attente de validation »',
      (await lireGrille()) === '' && await btnTexte() === 'Valider la saisie' && await p.evaluate(() => Ext.getCmp('btn_create_perime').isDisabled()) && await pied() === '0 ligne en attente de validation',
      await btnTexte() + ' ; ' + await pied());
    /* une ligne validee ne se retire plus */
    const refus = await p.evaluate(async (id) => (await fetch('../api/v1/gestionperime/' + id, { method: 'DELETE' })).json(), M + 'W1');
    ok('Une ligne validée ne peut plus être retirée (refus de l\'API, ligne intacte)', refus.success === false && /déjà validée/.test(refus.message || '')
      && q(`SELECT str_STATUT FROM t_warehouse WHERE lg_WAREHOUSE_ID = '${M}W1'`) === 'delete', JSON.stringify(refus));
    await fermer();
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Déroulement', false, x.stack + ' ' + err.join(' | '));
  } finally {
    await b.close();
    retirer();
    ok('Données d\'essai retirées, stocks, droit et saisies en attente remis', nosLignes() === ''
      && PROD.every(([id]) => q(`SELECT CONCAT_WS('|', int_NUMBER_AVAILABLE, int_NUMBER) FROM t_famille_stock WHERE lg_FAMILLE_ID = '${id}' AND lg_EMPLACEMENT_ID = '1'`) === AVANT[id])
      && q(`SELECT str_STATUT FROM t_privilege WHERE str_NAME = '${PRIV}'`) === PRIV0
      && Number(q("SELECT COUNT(*) FROM t_warehouse WHERE str_STATUT = 'pending'")) === PARQUES);
    const n = res.filter(Boolean).length;
    console.log(n + '/' + res.length + (n === res.length ? ' OK' : ' ÉCHEC'));
    process.exit(n === res.length ? 0 : 1);
  }
})();
