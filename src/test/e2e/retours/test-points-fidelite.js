/* POINTS FIDELITE (retours du 10/10, section 15).
 *  - libelle « Points fidélité » (menu et ecran) ;
 *  - exclusions : interrupteur Familles d'articles <-> Emplacements (zone geographique / rayon), l'un ou l'autre ;
 *    message d'information ; les deux listes sont gardees, seule celle du mode choisi s'applique au calcul :
 *      V1 = A 10 000 (emplacement exclu) + B 5 000 (famille exclue), mode Emplacements -> base 5 000 = 5 points
 *      V2 = A 3 000 + B 2 000, mode Familles                                     -> base 3 000 = 3 points
 *  - editions PDF / Excel : clients, historique du client, analyse ;
 *  - onglet Analyse : tuiles = requete independante, meilleurs clients.
 * Jeu d'essai retire a la fin ; parametres, paliers et exclusions du banc remis en l'etat.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const fs = require('fs');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN'], { input: s, encoding: 'utf8' }).trim();
const C = 'E2E-PFID-C1', NOM = 'E2EPFID', ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin'");
const [A, FA, ZA, B, FB, ZB] = q("SELECT a.lg_FAMILLE_ID, a.lg_FAMILLEARTICLE_ID, a.lg_ZONE_GEO_ID, b.lg_FAMILLE_ID, b.lg_FAMILLEARTICLE_ID, b.lg_ZONE_GEO_ID"
  + " FROM t_famille a JOIN t_famille b ON b.lg_FAMILLEARTICLE_ID <> a.lg_FAMILLEARTICLE_ID AND b.lg_ZONE_GEO_ID <> a.lg_ZONE_GEO_ID"
  + " JOIN t_zone_geographique za ON za.lg_ZONE_GEO_ID = a.lg_ZONE_GEO_ID AND za.str_STATUT = 'enable' JOIN t_zone_geographique zb ON zb.lg_ZONE_GEO_ID = b.lg_ZONE_GEO_ID AND zb.str_STATUT = 'enable'"
  + " JOIN t_famillearticle fa ON fa.lg_FAMILLEARTICLE_ID = a.lg_FAMILLEARTICLE_ID AND fa.str_STATUT = 'enable' JOIN t_famillearticle fb ON fb.lg_FAMILLEARTICLE_ID = b.lg_FAMILLEARTICLE_ID AND fb.str_STATUT = 'enable'"
  + " WHERE a.str_STATUT = 'enable' AND b.str_STATUT = 'enable' LIMIT 1").split('\t');

function vente(id, heures, lignes) {
  const net = lignes.reduce((s, l) => s + l[1], 0);
  return "INSERT INTO t_preenregistrement (lg_PREENREGISTREMENT_ID, str_REF, str_REF_TICKET, lg_USER_ID, int_PRICE, int_PRICE_REMISE, int_CUST_PART, str_STATUT,"
    + " dt_CREATED, dt_UPDATED, str_TYPE_VENTE, lg_TYPE_VENTE_ID, b_IS_CANCEL, lg_CLIENT_ID) VALUES ('" + id + "', '" + id + "', 'TCK-" + id.slice(-2) + "', '" + ADMIN + "', "
    + net + ", 0, 0, 'is_Closed', NOW() - INTERVAL " + heures + " HOUR, NOW() - INTERVAL " + heures + " HOUR, 'VNO', '1', 0, '" + C + "');"
    + lignes.map((l, i) => "INSERT INTO t_preenregistrement_detail (lg_PREENREGISTREMENT_DETAIL_ID, lg_PREENREGISTREMENT_ID, lg_FAMILLE_ID, int_QUANTITY, int_PRICE, int_PRICE_REMISE, prixAchat, str_STATUT, dt_CREATED, dt_UPDATED)"
      + " VALUES ('" + id + "-" + i + "', '" + id + "', '" + l[0] + "', 1, " + l[1] + ", 0, 0, 'is_Closed', NOW(), NOW());").join('');
}
function nettoyer() {
  q(`DELETE FROM t_fidelite_mouvement WHERE lg_CLIENT_ID = '${C}'; DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID LIKE 'E2E-PFID-%';`
    + `DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE 'E2E-PFID-%'; DELETE FROM t_client WHERE lg_CLIENT_ID = '${C}';`);
}
function sauver() {
  q("DROP TABLE IF EXISTS zz_e2e_pfid_param, zz_e2e_pfid_palier, zz_e2e_pfid_excl, zz_e2e_pfid_zone;"
    + "CREATE TABLE zz_e2e_pfid_param AS SELECT * FROM t_fidelite_parametre; CREATE TABLE zz_e2e_pfid_palier AS SELECT * FROM t_fidelite_palier;"
    + "CREATE TABLE zz_e2e_pfid_excl AS SELECT * FROM t_fidelite_exclusion; CREATE TABLE zz_e2e_pfid_zone AS SELECT * FROM t_fidelite_exclusion_zone;");
}
function restaurer() {
  q("DELETE FROM t_fidelite_parametre; INSERT INTO t_fidelite_parametre SELECT * FROM zz_e2e_pfid_param;"
    + "DELETE FROM t_fidelite_palier; INSERT INTO t_fidelite_palier SELECT * FROM zz_e2e_pfid_palier;"
    + "DELETE FROM t_fidelite_exclusion; INSERT INTO t_fidelite_exclusion SELECT * FROM zz_e2e_pfid_excl;"
    + "DELETE FROM t_fidelite_exclusion_zone; INSERT INTO t_fidelite_exclusion_zone SELECT * FROM zz_e2e_pfid_zone;"
    + "DROP TABLE zz_e2e_pfid_param, zz_e2e_pfid_palier, zz_e2e_pfid_excl, zz_e2e_pfid_zone;");
  /* le mode de reglement « Points fidelite » suit l'activation */
  q("UPDATE t_type_reglement SET str_STATUT = IF((SELECT bool_ACTIF FROM t_fidelite_parametre LIMIT 1) = 1, 'enable', 'disable') WHERE lg_TYPE_REGLEMENT_ID = '20';"
    + "UPDATE t_mode_reglement SET str_STATUT = IF((SELECT bool_ACTIF FROM t_fidelite_parametre LIMIT 1) = 1, 'enable', 'disable') WHERE lg_TYPE_REGLEMENT_ID = '20';");
}
const gains = () => q(`SELECT GROUP_CONCAT(CONCAT(lg_PREENREGISTREMENT_ID, ':', int_BASE, ':', int_POINTS) ORDER BY lg_PREENREGISTREMENT_ID) FROM t_fidelite_mouvement WHERE lg_CLIENT_ID = '${C}' AND str_TYPE = 'GAIN'`);

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1500, height: 900 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const cmp = (sel) => p.evaluate((s) => { const c = Ext.ComponentQuery.query('fideliteclients ' + s)[0]; (c.btnEl || c.getEl()).dom.setAttribute('data-e2e', 'x'); }, sel).then(() => p.click('[data-e2e=x]'))
    .then(() => p.evaluate(() => document.querySelectorAll('[data-e2e=x]').forEach((n) => n.removeAttribute('data-e2e'))));
  const message = async () => {
    await p.waitForFunction(() => Ext.MessageBox.isVisible(), null, { timeout: 30000 });
    const t = await p.evaluate(() => Ext.MessageBox.msg.getEl().dom.textContent);
    await p.evaluate(() => Ext.MessageBox.hide()); await p.waitForTimeout(300); return t;
  };
  const cocher = async (grille, id) => {
    await p.evaluate((a) => { const g = Ext.ComponentQuery.query('fideliteclients #' + a[0])[0], r = g.getStore().findRecord('id', a[1]);
      g.getView().getCell(r, g.down('#colExclue')).dom.setAttribute('data-e2e', 'case'); }, [grille, id]);
    await p.click('[data-e2e=case] .x-grid-checkcolumn'); await p.waitForTimeout(800);
    await p.evaluate(() => document.querySelectorAll('[data-e2e=case]').forEach((n) => n.removeAttribute('data-e2e')));
  };
  const ouvrir = async (sel) => { const [pop] = await Promise.all([p.waitForEvent('popup'), cmp(sel)]); await pop.close().catch(() => {});
    return p.evaluate(() => window.__ouverts[window.__ouverts.length - 1]); };
  const telecharger = async (url, fichier) => { const o = await p.evaluate(async (u) => { const r = await fetch(u); return { type: r.headers.get('content-type'), b: Array.from(new Uint8Array(await r.arrayBuffer())) }; }, url);
    fs.writeFileSync(fichier, Buffer.from(o.b)); return o.type; };
  const pdfTexte = (f) => execFileSync('pdftotext', ['-layout', f, '-'], { encoding: 'utf8' });
  const xls = (f) => JSON.parse(execFileSync('python3', ['-I', '-c', 'import sys, json, xlrd; s = xlrd.open_workbook(sys.argv[1]).sheet_by_index(0); print(json.dumps([[str(c.value) for c in s.row(i)] for i in range(s.nrows)]))', f], { encoding: 'utf8' }));
  try {
    ok('Précondition : deux produits de familles et d\'emplacements différents', A && B && FA !== FB && ZA !== ZB, [A, ZA, B, ZB].join(' / '));
    sauver(); nettoyer();
    q("UPDATE t_fidelite_parametre SET bool_ACTIF = 1, dt_DEBUT = CURDATE() - INTERVAL 1 DAY, int_SEUIL_UTILISATION = 0, int_MONTANT_POINT = 1000, int_VALEUR_POINT = 5, str_MODE_EXCLUSION = 'FAMILLES';"
      + "DELETE FROM t_fidelite_exclusion; DELETE FROM t_fidelite_exclusion_zone;"
      + "DELETE FROM t_fidelite_palier; INSERT INTO t_fidelite_palier VALUES ('FID-PALIER-1', 'Standard', 0, 1.00, NOW()), ('FID-PALIER-2', 'Argent', 300, 1.25, NOW()), ('FID-PALIER-3', 'Or', 1000, 1.50, NOW());"
      + `INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, str_TELEPHONE, str_STATUT, dt_CREATED, dt_UPDATED) VALUES ('${C}', '${NOM}', 'Analyse', '0700000098', 'enable', NOW(), NOW());`);
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', process.env.E2E_LOGIN || 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.evaluate(() => { window.__ouverts = []; const o = window.open; window.open = function (u) { window.__ouverts.push(u); return o.apply(this, arguments); }; });
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('fideliteclients', 'Points fidélité', ''));
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('fideliteclients')[0]; return e && e.parametres && e.droits && !e.clients.isLoading(); }, null, { timeout: 60000 });
    /* le titre de l'ecran est repris par le panneau central (menu) : on lit celui de la classe */
    const titres = await p.evaluate(() => ({ ecran: Ext.ClassManager.getByAlias('widget.fideliteclients').prototype.title }));
    ok('Libellé « Points fidélité » (écran et menu)', titres.ecran === 'Points fidélité'
      && q("SELECT str_VALUE FROM t_sous_menu WHERE str_COMPOSANT = 'fideliteclients'") === 'Points fidélité', JSON.stringify(titres));

    /* ------------------------------------------------ exclusions : familles <-> emplacements */
    await p.evaluate(() => { const e = Ext.ComponentQuery.query('fideliteclients')[0]; e.down('#ongletParametres').tab.getEl().dom.setAttribute('data-e2e', 'onglet'); });
    await p.click('[data-e2e=onglet]'); await p.waitForTimeout(600);
    const m1 = await p.evaluate(() => { const e = Ext.ComponentQuery.query('fideliteclients')[0];
      return { familles: e.down('#modeFamilles').pressed, grille: e.down('#panneauExclusions').getLayout().getActiveItem().itemId, info: e.down('#infoExclusions').getEl().dom.textContent }; });
    ok('Mode « Familles d\'articles » par défaut, sa liste affichée, message d\'information', m1.familles && m1.grille === 'grilleCategories' && /emplacements cochés ne s'appliquent pas/.test(m1.info), JSON.stringify(m1));
    await cocher('grilleCategories', FB);
    await cmp('#modeEmplacements'); await p.waitForTimeout(1200);
    const m2 = await p.evaluate(() => { const e = Ext.ComponentQuery.query('fideliteclients')[0];
      return { empl: e.down('#modeEmplacements').pressed, familles: e.down('#modeFamilles').pressed, grille: e.down('#panneauExclusions').getLayout().getActiveItem().itemId,
        info: e.down('#infoExclusions').getEl().dom.textContent, msg: e.down('#infoParametres').getEl().dom.textContent }; });
    ok('Bascule sur « Emplacements » : enregistrée, liste des emplacements, familles annoncées sans effet', m2.empl && !m2.familles && m2.grille === 'grilleEmplacements'
      && /familles cochées ne s'appliquent pas/.test(m2.info) && q("SELECT str_MODE_EXCLUSION FROM t_fidelite_parametre") === 'EMPLACEMENTS', JSON.stringify(m2));
    await cocher('grilleEmplacements', ZA);
    ok('Emplacement exclu enregistré ; la famille exclue est gardée', q(`SELECT COUNT(*) FROM t_fidelite_exclusion_zone WHERE lg_ZONE_GEO_ID = '${ZA}'`) === '1'
      && q(`SELECT COUNT(*) FROM t_fidelite_exclusion WHERE lg_FAMILLEARTICLE_ID = '${FB}'`) === '1');
    /* la vente arrive apres le reglage (l'ecran compte les points des son ouverture) */
    q(vente('E2E-PFID-V1', 3, [[A, 10000], [B, 5000]]));
    await cmp('#synchroniser'); await message();
    ok('Mode Emplacements : seul l\'emplacement exclu compte (V1 : base 5 000 = 5 points)', gains() === 'E2E-PFID-V1:5000:5', gains());
    await cmp('#modeFamilles'); await p.waitForTimeout(1200);
    ok('Retour au mode Familles : enregistré, liste des familles', q("SELECT str_MODE_EXCLUSION FROM t_fidelite_parametre") === 'FAMILLES'
      && await p.evaluate(() => Ext.ComponentQuery.query('fideliteclients #panneauExclusions')[0].getLayout().getActiveItem().itemId === 'grilleCategories'));
    q(vente('E2E-PFID-V2', 1, [[A, 3000], [B, 2000]]));
    await cmp('#synchroniser'); await message();
    ok('Mode Familles : seule la famille exclue compte (V2 : base 3 000 = 3 points)', gains() === 'E2E-PFID-V1:5000:5,E2E-PFID-V2:3000:3', gains());

    /* ------------------------------------------------ clients : utilisation, editions */
    await p.evaluate(() => { const e = Ext.ComponentQuery.query('fideliteclients')[0]; e.down('#ongletClients').tab.getEl().dom.setAttribute('data-e2e', 'onglet2'); });
    await p.click('[data-e2e=onglet2]');
    await p.evaluate((n) => { const e = Ext.ComponentQuery.query('fideliteclients')[0]; e.down('#recherche').setValue(n); e.chercher(); }, NOM);
    await p.waitForFunction((c) => { const e = Ext.ComponentQuery.query('fideliteclients')[0]; return !e.clients.isLoading() && e.clients.findRecord('id', c); }, C, { timeout: 20000 });
    ok('Historique : boutons d\'édition grisés tant qu\'aucun client n\'est choisi', await p.evaluate(() => Ext.ComponentQuery.query('fideliteclients #barreHistorique')[0].isDisabled()));
    await p.evaluate((c) => { const e = Ext.ComponentQuery.query('fideliteclients')[0]; e.down('#grilleClients').getSelectionModel().select(e.clients.findRecord('id', c)); }, C);
    await p.waitForFunction(() => Ext.ComponentQuery.query('fideliteclients')[0].historiqueStore.getCount() > 0, null, { timeout: 15000 });
    await p.evaluate(() => { const e = Ext.ComponentQuery.query('fideliteclients')[0]; e.down('#pointsUtiliser').setValue(2); e.down('#referenceUtiliser').setValue('BON-E2E'); });
    await cmp('#utiliser');
    await p.waitForFunction(() => Ext.MessageBox.isVisible() && Ext.MessageBox.msgButtons.yes.isVisible(), null, { timeout: 10000 });
    await p.evaluate(() => Ext.MessageBox.msgButtons.yes.btnEl.dom.click());
    await p.waitForFunction(() => Ext.ComponentQuery.query('fideliteclients')[0].historiqueStore.findExact('type', 'UTILISATION') >= 0, null, { timeout: 15000 });

    const uClients = await ouvrir('#clientsPdf');
    await telecharger(uClients, '/tmp/e2e-pfid-clients.pdf');
    const tc = pdfTexte('/tmp/e2e-pfid-clients.pdf');
    ok('Clients : PDF (même recherche) avec le client et ses 6 points', /POINTS FIDÉLITÉ — CLIENTS/.test(tc) && new RegExp(NOM + ' Analyse\\s+0700000098\\s+6\\s+30').test(tc) && /1 client\(s\)/.test(tc), uClients);
    const uClientsX = await ouvrir('#clientsExcel');
    await telecharger(uClientsX, '/tmp/e2e-pfid-clients.xls');
    const xc = xls('/tmp/e2e-pfid-clients.xls');
    ok('Clients : Excel avec le client, points en nombre', xc.some((l) => l[0] === NOM + ' Analyse' && l[2] === '6.0' && l[3] === '30.0'), JSON.stringify(xc.slice(0, 4)));
    const uHist = await ouvrir('#historiquePdf');
    await telecharger(uHist, '/tmp/e2e-pfid-hist.pdf');
    const th = pdfTexte('/tmp/e2e-pfid-hist.pdf');
    ok('Historique du client : PDF (gains et utilisation)', /HISTORIQUE DE E2EPFID ANALYSE/.test(th) && /Solde : 6 points · 3 opération/.test(th) && /Points utilisés\s+-2\s+BON-E2E/.test(th), th.slice(0, 300));
    const uHistX = await ouvrir('#historiqueExcel');
    await telecharger(uHistX, '/tmp/e2e-pfid-hist.xls');
    ok('Historique du client : Excel', xls('/tmp/e2e-pfid-hist.xls').filter((l) => /Points (gagnés|utilisés)/.test(l[1])).length === 3);

    /* ------------------------------------------------ analyse */
    await p.evaluate(() => { const e = Ext.ComponentQuery.query('fideliteclients')[0]; e.down('#ongletAnalyse').tab.getEl().dom.setAttribute('data-e2e', 'onglet3'); });
    await p.click('[data-e2e=onglet3]');
    await p.waitForFunction(() => !!Ext.ComponentQuery.query('fideliteclients')[0].analyseDonnees, null, { timeout: 30000 });
    const crit = await p.evaluate(() => Ext.ComponentQuery.query('fideliteclients')[0].criteresAnalyse());
    const w = ` FROM t_fidelite_mouvement WHERE dt_MOUVEMENT >= '${crit.dtStart}' AND dt_MOUVEMENT < '${crit.dtEnd}' + INTERVAL 1 DAY`;
    const att = q("SELECT COUNT(DISTINCT lg_CLIENT_ID), COALESCE(SUM(IF(str_TYPE IN ('GAIN','ANNULATION'), int_POINTS, 0)), 0), COALESCE(SUM(IF(str_TYPE = 'UTILISATION', -int_POINTS, IF(str_TYPE = 'RESTITUTION', -int_POINTS, 0))), 0),"
      + " COALESCE(SUM(IF(str_TYPE = 'EXPIRATION', -int_POINTS, 0)), 0), GREATEST(0, COALESCE(SUM(IF(str_TYPE = 'UTILISATION', COALESCE(int_VALEUR, 0), IF(str_TYPE = 'RESTITUTION', -COALESCE(int_VALEUR, 0), 0))), 0)),"
      + " COALESCE(SUM(IF(str_TYPE = 'AJUSTEMENT', int_POINTS, 0)), 0)" + w).split('\t').map(Number);
    const an = await p.evaluate(() => { const d = Ext.ComponentQuery.query('fideliteclients #anContenu')[0].getEl().dom;
      return { tuiles: [...d.querySelectorAll('.pml-tuile .pml-tuile-valeur')].map((t) => Number(t.textContent.replace(/[\s F]/g, ''))),
        meilleurs: [...d.querySelectorAll('tr.fid-meilleur')].map((r) => r.textContent), mois: d.querySelectorAll('tr.fid-mois').length }; });
    ok('Analyse : tuiles = requête indépendante (clients actifs, gagnés, utilisés, expirés, coût, ajustements)', JSON.stringify(an.tuiles) === JSON.stringify(att),
      JSON.stringify({ ecran: an.tuiles, attendu: att }));
    ok('Analyse : le client de l\'essai parmi les meilleurs clients (8 gagnés, 2 utilisés, solde 6)', an.meilleurs.some((t) => t.indexOf(NOM) >= 0 && /826$/.test(t.replace(/\s+/g, ''))), an.meilleurs.slice(0, 3).join(' | '));
    const uAn = await ouvrir('#analysePdf');
    await telecharger(uAn, '/tmp/e2e-pfid-analyse.pdf');
    const ta = pdfTexte('/tmp/e2e-pfid-analyse.pdf');
    ok('Analyse : PDF (par mois, paliers, meilleurs clients)', /POINTS FIDÉLITÉ — ANALYSE/.test(ta) && /Par mois/.test(ta) && /Clients actifs par palier/.test(ta) && /Meilleurs clients/.test(ta) && ta.indexOf(NOM) >= 0);
    const uAnX = await ouvrir('#analyseExcel');
    await telecharger(uAnX, '/tmp/e2e-pfid-analyse.xls');
    const xa = xls('/tmp/e2e-pfid-analyse.xls');
    ok('Analyse : Excel (rubriques Mois, Palier, Meilleur client)', ['Mois', 'Palier', 'Meilleur client'].every((r) => xa.some((l) => l[0] === r)));
    ok('Infobulles sur les boutons d\'édition et de mode', await p.evaluate(() => ['clientsPdf', 'clientsExcel', 'historiquePdf', 'historiqueExcel', 'analysePdf', 'analyseExcel', 'modeFamilles', 'modeEmplacements', 'anActualiser']
      .every((i) => !!Ext.ComponentQuery.query('fideliteclients #' + i)[0].tooltip)));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Déroulement du test', false, e.stack || e);
  } finally {
    await b.close();
    try { nettoyer(); restaurer(); } catch (e) { console.log('remise en état : ' + e.message); }
    ok('Remise en état : client, ventes, points retirés ; paramètres et exclusions du banc remis', q(`SELECT (SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID = '${C}') + (SELECT COUNT(*) FROM t_fidelite_mouvement WHERE lg_CLIENT_ID = '${C}')`
      + " + (SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE 'E2E-PFID-%') + (SELECT COUNT(*) FROM information_schema.tables WHERE table_name LIKE 'zz_e2e_pfid%')") === '0');
    const n = res.filter((x) => x.c).length;
    console.log('\n' + n + '/' + res.length + (n === res.length ? ' OK' : ' ECHEC'));
    process.exit(n === res.length ? 0 : 1);
  }
})();
