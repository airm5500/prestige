/* VENTES TERMINEES - colonnes (retours du 11/10) :
 *  - date et heure dans une seule colonne « Date » ;
 *  - « Montant différé » devient « Différé » (ecran et export Excel) ;
 *  - colonne « P » : poste de saisie de la vente, coupe selon la place, en entier dans l'infobulle avec le poste
 *    d'encaissement ; vide (sans erreur) pour une vente sans poste connu ;
 *  - presentation : en 1366 points, toutes les colonnes tiennent sans barre de defilement horizontale.
 * Chemin de l'ecran (menu, grille, export). Ventes d'essai retirees a la fin, stock remis.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN'], { input: s, encoding: 'utf8' }).trim();
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin'");
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
const POSTE = 'E2E POSTE ACCUEIL COMPTOIR NUMERO 3', CAISSE = 'e2e-vtc-caisse';
let caisseCreee = false, stockOrigine = null;
const a = q("SELECT CONCAT(f.lg_FAMILLE_ID, ':', f.int_PRICE) FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
  + " WHERE f.str_STATUT = 'enable' AND f.int_PRICE BETWEEN 200 AND 400 AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 AND COALESCE(f.lg_FAMILLE_PARENT_ID, '') = ''"
  + " AND f.bool_ACCOUNT = 1 ORDER BY f.str_NAME LIMIT 1").split(':');
const produit = { id: a[0], pu: parseInt(a[1], 10) };

const ventes = () => q("SELECT IFNULL(GROUP_CONCAT(CONCAT('''', lg_PREENREGISTREMENT_ID, '''')), '''-''') FROM t_preenregistrement WHERE dt_CREATED >= '" + DEBUT + "' AND lg_USER_ID = '" + ADMIN + "'");
function nettoyer() {
  const v = ventes();
  q("CREATE TEMPORARY TABLE e2e_vtc_l AS SELECT lg_PREENREGISTREMENT_DETAIL_ID id FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "CREATE TEMPORARY TABLE e2e_vtc_r AS SELECT lg_REGLEMENT_ID id FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + v + ") AND lg_REGLEMENT_ID IS NOT NULL;"
    + "DELETE FROM vente_reglement WHERE vente_id IN (" + v + ");"
    + "DELETE FROM hmvtproduit WHERE pkey IN (SELECT id FROM e2e_vtc_l);"
    + "DELETE FROM mvttransaction WHERE pkey IN (" + v + ") OR vente_id IN (" + v + ");"
    + "DELETE FROM t_recettes WHERE str_REF_FACTURE IN (" + v + ");"
    + "DELETE FROM t_preenregistrement_compte_client WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "UPDATE t_preenregistrement SET lg_PREENGISTREMENT_ANNULE_ID = NULL, lg_PARENT_ID = NULL, lg_REGLEMENT_ID = NULL WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DELETE FROM t_reglement WHERE lg_REGLEMENT_ID IN (SELECT id FROM e2e_vtc_r);"
    + "DROP TEMPORARY TABLE IF EXISTS e2e_vtc_l; DROP TEMPORARY TABLE IF EXISTS e2e_vtc_r;"
    + "DELETE FROM t_suggestion_order_details WHERE lg_FAMILLE_ID = '" + produit.id + "' AND dt_CREATED >= '" + DEBUT + "';"
    + (stockOrigine ? "UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = " + stockOrigine[0] + ", int_NUMBER = " + stockOrigine[1] + " WHERE lg_FAMILLE_ID = '" + produit.id + "' AND lg_EMPLACEMENT_ID = '1';" : '')
    + (caisseCreee ? "DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID = '" + CAISSE + "';" : ''));
}

(async () => {
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const ctx = await b.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const api = (m, u, c) => p.evaluate(([m, u, c]) => new Promise((ok2) => Ext.Ajax.request({ url: u, method: m, jsonData: c || undefined,
    success: (r) => { try { ok2(JSON.parse(r.responseText)); } catch (e) { ok2({ brut: r.responseText }); } }, failure: (r) => ok2({ success: false, status: r.status }) })), [m, u, c]);
  const vendre = async () => {
    const add = await api('POST', '../api/v1/vente/add/vno', { typeVenteId: '1', natureVenteId: '1', produitId: produit.id, itemPu: produit.pu, qte: 1, qteServie: 1,
      devis: false, prevente: false, remiseId: '', userVendeurId: ADMIN });
    const venteId = add.data && add.data.lgPREENREGISTREMENTID;
    const net = await api('POST', '../api/v1/vente/net/vno', { venteId, remiseId: '', checkUg: false });
    const data = net.data || {}, montant = data.montantNet;
    await api('POST', '../api/v1/vente/cloturer/vno', { venteId, typeVenteId: '1', natureVenteId: '1', devis: false, remiseId: '', userVendeurId: ADMIN,
      montantRecu: montant, montantRemis: 0, montantPaye: montant, totalRecap: montant, partTP: 0, typeRegleId: '1', clientId: '', nom: '', commentaire: '', banque: '', lieux: '',
      marge: data.marge || 0, data, reglements: [{ typeReglement: '1', montant, montantAttentu: montant }] });
    return venteId;
  };
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    nettoyer();
    stockOrigine = q("SELECT CONCAT(int_NUMBER_AVAILABLE, '|', int_NUMBER) FROM t_famille_stock WHERE lg_FAMILLE_ID = '" + produit.id + "' AND lg_EMPLACEMENT_ID = '1'").split('|');
    q("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = 100, int_NUMBER = 100 WHERE lg_FAMILLE_ID = '" + produit.id + "' AND lg_EMPLACEMENT_ID = '1'");
    if (q("SELECT COUNT(*) FROM t_resume_caisse WHERE lg_USER_ID = '" + ADMIN + "' AND str_STATUT = 'is_Using'") === '0') {
      q("INSERT INTO t_resume_caisse (ld_CAISSE_ID, lg_USER_ID, int_SOLDE_MATIN, int_SOLDE_SOIR, dt_DAY, dt_CREATED, lg_CREATED_BY, dt_UPDATED, lg_UPDATED_BY, str_STATUT)"
        + " VALUES ('" + CAISSE + "', '" + ADMIN + "', 0, 0, CURDATE(), NOW(), '" + ADMIN + "', NOW(), '" + ADMIN + "', 'is_Using')");
      caisseCreee = true;
    }
    /* vente saisie depuis un poste nomme (nom long, pour verifier la coupe), puis vente sans poste connu */
    await p.evaluate((n) => window.localStorage.setItem('prestige.poste', n), POSTE);
    const v1 = await vendre();
    await p.evaluate(() => window.localStorage.removeItem('prestige.poste'));
    const v2 = await vendre();
    q("UPDATE t_preenregistrement SET str_POSTE_SAISIE = NULL, str_POSTE = 'E2E ENC' WHERE lg_PREENREGISTREMENT_ID = '" + v2 + "'");
    const ref1 = q("SELECT str_REF FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v1 + "'");
    const ref2 = q("SELECT str_REF FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v2 + "'");
    const dh1 = q("SELECT DATE_FORMAT(dt_UPDATED, '%d/%m/%Y %H:%i') FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v1 + "'");
    ok('Jeu d\'essai : vente avec poste de saisie', q("SELECT str_POSTE_SAISIE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v1 + "'") === POSTE);

    /* ecran par le menu */
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('ventemanager', {}));
    await p.waitForFunction(() => { const v = Ext.ComponentQuery.query('ventemanager')[0]; return v && !v.down('gridpanel').getStore().isLoading() && v.down('gridpanel').getStore().getCount() > 0; }, null, { timeout: 60000 });
    const ecran = await p.evaluate(([r1, r2]) => {
      const g = Ext.ComponentQuery.query('ventemanager gridpanel')[0], st = g.getStore();
      const cols = g.headerCt.getGridColumns().filter((c) => !c.hidden);
      const entetes = cols.map((c) => (c.text || '').replace(/&#160;/g, '').trim());
      const cellule = (ref, itemId) => { const i = st.findExact('strREF', ref); if (i < 0) { return null; } const n = g.getView().getNode(i);
        const td = n && n.querySelector('.x-grid-cell-' + itemId); return td ? { texte: td.textContent.trim(), qtip: td.getAttribute('data-qtip') } : null; };
      const colP = g.down('#colPoste'), colA = g.down('#actionsVente');
      const body = g.getView().getEl().dom;
      return { entetes, d1: cellule(r1, 'colDateHeure'), p1: cellule(r1, 'colPoste'), p2: cellule(r2, 'colPoste'),
        tooltipP: colP && colP.tooltip, largeurP: colP && colP.getWidth(),
        debordement: body.scrollWidth - body.clientWidth, actionsVisibles: colA && colA.getEl().getBox().right <= g.getEl().getBox().right + 1 };
    }, [ref1, ref2]);
    ok('Colonnes : « Heure » retirée, une seule colonne « Date »', ecran.entetes.indexOf('Heure') < 0 && ecran.entetes.filter((e) => e === 'Date').length === 1, ecran.entetes.join(' | '));
    ok('Colonne « Date » : date et heure ensemble (jj/mm/aaaa hh:mm)', ecran.d1 && ecran.d1.texte.indexOf(dh1) === 0 && /^\d\d\/\d\d\/\d{4} \d\d:\d\d$/.test(ecran.d1.texte), JSON.stringify(ecran.d1) + ' attendu ' + dh1);
    ok('En-tête « Différé » (plus de « Montant différé »)', ecran.entetes.indexOf('Différé') >= 0 && !ecran.entetes.some((e) => /Montant diff/.test(e)), ecran.entetes.join(' | '));
    ok('Colonne « P » présente, après « Caissier », infobulle « Poste de saisie »', ecran.entetes.indexOf('P') === ecran.entetes.indexOf('Caissier') + 1 && ecran.tooltipP === 'Poste de saisie', ecran.entetes.join(' | '));
    ok('Colonne « P » : nom du poste de saisie', ecran.p1 && POSTE.indexOf(ecran.p1.texte) === 0 && ecran.p1.texte.length > 0, JSON.stringify(ecran.p1));
    ok('Colonne « P » : infobulle avec le nom entier', ecran.p1 && ecran.p1.qtip && ecran.p1.qtip.indexOf('Saisie : ' + POSTE) === 0, JSON.stringify(ecran.p1));
    ok('Colonne « P » : vente sans poste connu → vide, encaissement dans l\'infobulle', ecran.p2 && ecran.p2.texte === '' && /Saisie : non connu.*Encaissement : E2E ENC/.test(ecran.p2.qtip), JSON.stringify(ecran.p2));
    ok('Présentation 1366 : pas de défilement horizontal, actions visibles', ecran.debordement <= 0 && ecran.actionsVisibles, JSON.stringify({ d: ecran.debordement, a: ecran.actionsVisibles, lP: ecran.largeurP }));
    /* nom long coupe a la largeur : la cellule ne deborde pas sur la colonne suivante */
    const coupe = await p.evaluate((r) => { const g = Ext.ComponentQuery.query('ventemanager gridpanel')[0], i = g.getStore().findExact('strREF', r);
      const inner = g.getView().getNode(i).querySelector('.x-grid-cell-colPoste .x-grid-cell-inner'); const s = getComputedStyle(inner);
      return { ellipse: s.textOverflow, overflow: s.overflow, plein: inner.scrollWidth > inner.clientWidth }; }, ref1);
    ok('Colonne « P » : nom long coupé proprement (points de suspension)', coupe.ellipse === 'ellipsis' && coupe.overflow === 'hidden', JSON.stringify(coupe));
    await p.screenshot({ path: process.env.CAPTURE || ENV_E2E.TMP + '/ventes-terminees-colonnes.png' });

    /* export Excel (bouton de l'ecran) */
    await p.evaluate(() => { Ext.ComponentQuery.query('ventemanager #exporterExcel')[0].btnEl.dom.setAttribute('data-e2e', 'xls'); });
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), p.click('[data-e2e=xls]')]);
    const chemin = await dl.path();
    const xls = execFileSync('python3', ['-c', "import sys,xlrd;s=xlrd.open_workbook(sys.argv[1]).sheet_by_index(0);print('\\n'.join('\\t'.join(str(c.value) for c in s.row(r)) for r in range(s.nrows)))", chemin], { encoding: 'utf8' });
    const lignesXls = xls.split('\n');
    const entXls = lignesXls.find((l) => l.indexOf('Reference') === 0) || '';
    ok('Export Excel : « Différé » et « Poste de saisie » en en-tête', /\tDifféré\t/.test(entXls) && /\tPoste de saisie$/.test(entXls), entXls);
    const l1 = lignesXls.find((l) => l.indexOf(ref1 + '\t') === 0) || '';
    ok('Export Excel : poste de saisie de la vente', l1.endsWith('\t' + POSTE), l1);
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' / '));
  } catch (e) {
    ok('Exécution sans exception', false, e.stack);
  } finally {
    try { nettoyer(); } catch (e) { console.log('nettoyage : ' + e.message); }
    ok('Nettoyage : ventes d\'essai retirées', ventes() === "'-'");
    await b.close();
    const k = res.filter((r) => r.c).length;
    console.log('\n' + k + '/' + res.length + ' OK');
    process.exit(k === res.length ? 0 : 1);
  }
})();
