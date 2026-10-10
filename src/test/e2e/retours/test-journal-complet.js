/* FICHIER JOURNAL COMPLET (retours du 10/10, Q10 : tout le lot).
 *  - « Ce poste » : nom saisi une fois dans le journal, memorise par le navigateur, envoye avec chaque requete ;
 *  - les ventes ne sont PAS journalisees (precision du 10/10) : chaque vente garde son poste de saisie, son poste et
 *    son adresse IP d'encaissement ; « Ventes terminees » filtre par poste et le detail l'affiche ;
 *  - ajustement (avant / apres) et suppression de facture journalises avec poste, adresse IP et application ;
 *  - colonnes Poste / Adresse IP / Application ; filtre par poste ;
 *  - alertes : annulations en serie (3 en 30 min) et operations hors horaires (avant 07:00 / apres 21:00) ;
 *  - export Excel : colonnes Poste, Adresse IP, Application, Avant / apres.
 * Jeu d'essai (ventes, lignes de journal, caisse si besoin) retire a la fin ; stock remis.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', process.env.DB_TEST || 'capitale', '-sN'], { input: s, encoding: 'utf8' }).trim();
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin'");
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
const POSTE = 'E2E POSTE 7', CAISSE = 'e2e-jrn-caisse', MARQUE = 'E2E-JRN';
let caisseCreee = false, stockOrigine = null;
const a = q("SELECT CONCAT(f.lg_FAMILLE_ID, ':', f.int_PRICE) FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
  + " WHERE f.str_STATUT = 'enable' AND f.int_PRICE BETWEEN 200 AND 400 AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 AND COALESCE(f.lg_FAMILLE_PARENT_ID, '') = ''"
  + " AND f.bool_ACCOUNT = 1 ORDER BY f.str_NAME LIMIT 1").split(':');
const produit = { id: a[0], pu: parseInt(a[1], 10) };

const ventes = () => q("SELECT IFNULL(GROUP_CONCAT(CONCAT('''', lg_PREENREGISTREMENT_ID, '''')), '''-''') FROM t_preenregistrement WHERE dt_CREATED >= '" + DEBUT + "' AND lg_USER_ID = '" + ADMIN + "'");
function nettoyer() {
  const v = ventes();
  q("CREATE TEMPORARY TABLE e2e_jrn_l AS SELECT lg_PREENREGISTREMENT_DETAIL_ID id FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "CREATE TEMPORARY TABLE e2e_jrn_r AS SELECT lg_REGLEMENT_ID id FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + v + ") AND lg_REGLEMENT_ID IS NOT NULL;"
    + "DELETE FROM vente_reglement WHERE vente_id IN (" + v + ");"
    + "DELETE FROM hmvtproduit WHERE pkey IN (SELECT id FROM e2e_jrn_l);"
    + "DELETE FROM mvttransaction WHERE pkey IN (" + v + ") OR vente_id IN (" + v + ");"
    + "DELETE FROM t_recettes WHERE str_REF_FACTURE IN (" + v + ");"
    + "DELETE FROM t_preenregistrement_compte_client WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "UPDATE t_preenregistrement SET lg_PREENGISTREMENT_ANNULE_ID = NULL, lg_PARENT_ID = NULL, lg_REGLEMENT_ID = NULL WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DELETE FROM t_reglement WHERE lg_REGLEMENT_ID IN (SELECT id FROM e2e_jrn_r);"
    + "DROP TEMPORARY TABLE IF EXISTS e2e_jrn_l; DROP TEMPORARY TABLE IF EXISTS e2e_jrn_r;"
    + "CREATE TEMPORARY TABLE e2e_jrn_a AS SELECT lg_AJUSTEMENT_ID id FROM t_ajustement WHERE lg_USER_ID = '" + ADMIN + "' AND dt_CREATED >= '" + DEBUT + "';"
    + "DELETE FROM hmvtproduit WHERE pkey IN (SELECT lg_AJUSTEMENTDETAIL_ID FROM t_ajustement_detail WHERE lg_AJUSTEMENT_ID IN (SELECT id FROM e2e_jrn_a));"
    + "DELETE FROM t_ajustement_detail WHERE lg_AJUSTEMENT_ID IN (SELECT id FROM e2e_jrn_a);"
    + "DELETE FROM t_ajustement WHERE lg_AJUSTEMENT_ID IN (SELECT id FROM e2e_jrn_a); DROP TEMPORARY TABLE e2e_jrn_a;"
    + "DELETE FROM t_suggestion_order_details WHERE lg_FAMILLE_ID = '" + produit.id + "' AND dt_CREATED >= '" + DEBUT + "';"
    + "DELETE FROM t_event_log WHERE lg_EVENT_LOG_ID LIKE '" + MARQUE + "%' OR (lg_USER_ID = '" + ADMIN + "' AND dt_CREATED >= '" + DEBUT + "' AND typeLog IN (" + ORD.AUTHENTIFICATION + ", " + ORD.AJUSTEMENT_DE_PRODUIT + ")) OR str_TYPE_LOG = '" + MARQUE + "-FACT';"
    + "DELETE FROM t_facture WHERE lg_FACTURE_ID LIKE '" + MARQUE + "%';"
    + (stockOrigine ? "UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = " + stockOrigine[0] + ", int_NUMBER = " + stockOrigine[1] + " WHERE lg_FAMILLE_ID = '" + produit.id + "' AND lg_EMPLACEMENT_ID = '1';" : '')
    + (caisseCreee ? "DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID = '" + CAISSE + "';" : ''));
}
/* ordinaux du type de journal (colonne typeLog), lus dans l'enum par l'API des filtres */
const ORD = {};

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  /* appels par Ext.Ajax, comme l'application : l'en-tete du poste y est ajoute */
  const api = (m, u, c) => p.evaluate(([m, u, c]) => new Promise((ok2) => Ext.Ajax.request({ url: u, method: m, jsonData: c || undefined,
    success: (r) => { try { ok2(JSON.parse(r.responseText)); } catch (e) { ok2({ brut: r.responseText }); } }, failure: (r) => ok2({ success: false, status: r.status }) })), [m, u, c]);
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    const filtres = await api('GET', '../api/v1/common/log-filtres');
    (filtres.data || []).forEach((f) => { ORD[{ Vente: 'VENTE', 'Prévente': 'PREVENTE', 'Annulation de vente': 'ANNULATION_DE_VENTE', 'Ajustement de produit': 'AJUSTEMENT_DE_PRODUIT', Authentification: 'AUTHENTIFICATION', 'Suppression de facture': 'SUPPRESION_DE_FACTURE' }[f.strDESCRIPTION] || '_'] = f.order; });
    ok('Journal : pas de type « Vente » ni « Prévente » (les ventes ne sont pas journalisées)', ORD.VENTE === undefined && ORD.PREVENTE === undefined
      && ORD.AJUSTEMENT_DE_PRODUIT !== undefined, JSON.stringify(ORD));
    nettoyer();
    stockOrigine = q("SELECT CONCAT(int_NUMBER_AVAILABLE, '|', int_NUMBER) FROM t_famille_stock WHERE lg_FAMILLE_ID = '" + produit.id + "' AND lg_EMPLACEMENT_ID = '1'").split('|');
    q("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = 100, int_NUMBER = 100 WHERE lg_FAMILLE_ID = '" + produit.id + "' AND lg_EMPLACEMENT_ID = '1'");
    if (q("SELECT COUNT(*) FROM t_resume_caisse WHERE lg_USER_ID = '" + ADMIN + "' AND str_STATUT = 'is_Using'") === '0') {
      q("INSERT INTO t_resume_caisse (ld_CAISSE_ID, lg_USER_ID, int_SOLDE_MATIN, int_SOLDE_SOIR, dt_DAY, dt_CREATED, lg_CREATED_BY, dt_UPDATED, lg_UPDATED_BY, str_STATUT)"
        + " VALUES ('" + CAISSE + "', '" + ADMIN + "', 0, 0, CURDATE(), NOW(), '" + ADMIN + "', NOW(), '" + ADMIN + "', 'is_Using')");
      caisseCreee = true;
    }
    /* lignes d'essai pour les alertes et le filtre de poste (10/06/2025) */
    const ligne = (id, quand, type, desc) => `('${MARQUE}-${id}', '${quand}', '${quand}', '${desc}', 'admin', 'enable', '${ADMIN}', ${type}, '${MARQUE}', 'E2E-POSTE-ALERTE', '10.9.9.9', 'Chrome 120 · Windows')`;
    q("INSERT INTO t_event_log (lg_EVENT_LOG_ID, dt_CREATED, dt_UPDATED, str_DESCRIPTION, str_CREATED_BY, str_STATUT, lg_USER_ID, typeLog, str_TYPE_LOG, remote_host, remote_addr, str_APPLICATION) VALUES "
      + [ligne(1, '2025-06-10 10:00:00', ORD.ANNULATION_DE_VENTE, 'Annulation essai 1'), ligne(2, '2025-06-10 10:05:00', ORD.ANNULATION_DE_VENTE, 'Annulation essai 2'),
        ligne(3, '2025-06-10 10:12:00', ORD.ANNULATION_DE_VENTE, 'Annulation essai 3'), ligne(4, '2025-06-10 05:30:00', ORD.AJUSTEMENT_DE_PRODUIT, 'Ajustement de nuit')].join(','));
    /* le declencheur d'insertion impose dt_CREATED = NOW() : la date d'essai est posee ensuite */
    q("UPDATE t_event_log SET dt_CREATED = dt_UPDATED WHERE lg_EVENT_LOG_ID LIKE '" + MARQUE + "-%'");

    /* ------------------------------------------------ nom du poste */
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('logfile', 'Fichier Journal', ''));
    await p.waitForFunction(() => Ext.getCmp('logfileGrid') && Ext.getCmp('logfileGrid').down('#nomCePoste'), null, { timeout: 30000 });
    await p.evaluate(() => { Ext.getCmp('logfileGrid').down('#nomCePoste').inputEl.dom.setAttribute('data-e2e', 'poste'); });
    await p.click('[data-e2e=poste]'); await p.keyboard.press('Control+A'); await p.keyboard.type(POSTE);
    await p.evaluate(() => { Ext.getCmp('logfileGrid').down('#btnNomPoste').btnEl.dom.setAttribute('data-e2e', 'enr'); });
    await p.click('[data-e2e=enr]');
    ok('« Ce poste » : nom mémorisé sur le poste', await p.evaluate(() => window.localStorage.getItem('prestige.poste')) === POSTE);

    /* ------------------------------------------------ vente et prevente : poste garde sur la vente, rien au journal */
    const add = await api('POST', '../api/v1/vente/add/vno', { typeVenteId: '1', natureVenteId: '1', produitId: produit.id, itemPu: produit.pu, qte: 1, qteServie: 1,
      devis: false, prevente: false, remiseId: '', userVendeurId: ADMIN });
    const venteId = add.data && add.data.lgPREENREGISTREMENTID;
    const net = await api('POST', '../api/v1/vente/net/vno', { venteId, remiseId: '', checkUg: false });
    const data = net.data || {}, montant = data.montantNet;
    const clo = await api('POST', '../api/v1/vente/cloturer/vno', { venteId, typeVenteId: '1', natureVenteId: '1', devis: false, remiseId: '', userVendeurId: ADMIN,
      montantRecu: montant, montantRemis: 0, montantPaye: montant, totalRecap: montant, partTP: 0, typeRegleId: '1', clientId: '', nom: '', commentaire: '', banque: '', lieux: '',
      marge: data.marge || 0, data, reglements: [{ typeReglement: '1', montant, montantAttentu: montant }] });
    const ref = q("SELECT str_REF FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + venteId + "'");
    const pv = q("SELECT CONCAT_WS('|', str_POSTE_SAISIE, str_POSTE, str_IP IS NOT NULL) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + venteId + "'");
    const logsVente = () => q("SELECT COUNT(*) FROM t_event_log WHERE dt_CREATED >= '" + DEBUT + "' AND (str_TYPE_LOG IN ('" + ref + "', '" + venteId + "') OR str_DESCRIPTION LIKE '%" + ref + "%')");
    ok('Vente clôturée : poste de saisie, poste et adresse IP d\'encaissement gardés sur la vente', clo.success && pv === POSTE + '|' + POSTE + '|1', JSON.stringify(clo).slice(0, 120) + ' / ' + pv);
    ok('Vente clôturée : aucune ligne dans le journal', logsVente() === '0', logsVente());
    const pre = await api('POST', '../api/v1/vente/add/vno', { typeVenteId: '1', natureVenteId: '1', produitId: produit.id, itemPu: produit.pu, qte: 1, qteServie: 1,
      devis: false, prevente: true, remiseId: '', userVendeurId: ADMIN });
    const preId = pre.data && pre.data.lgPREENREGISTREMENTID;
    await api('PUT', '../api/v1/vente/terminerprevente/' + preId);
    const refPre = q("SELECT str_REF FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + preId + "'");
    const jp = q("SELECT CONCAT_WS('|', str_POSTE_SAISIE, (SELECT COUNT(*) FROM t_event_log WHERE dt_CREATED >= '" + DEBUT + "' AND str_TYPE_LOG = '" + refPre + "')) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + preId + "'");
    ok('Prévente : poste de saisie gardé, aucune ligne dans le journal', jp === POSTE + '|0', jp);

    /* « Ventes terminees » : filtre par poste et detail (chemin de l'ecran) */
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('ventemanager', {}));
    await p.waitForFunction(() => { const v = Ext.ComponentQuery.query('ventemanager')[0]; return v && v.down('#posteVente') && !v.down('gridpanel').getStore().isLoading(); }, null, { timeout: 60000 });
    const filtrerPoste = async (texte) => {
      await p.evaluate(() => { Ext.ComponentQuery.query('ventemanager #posteVente')[0].inputEl.dom.setAttribute('data-e2e', 'posteVente'); });
      await p.click('[data-e2e=posteVente]'); await p.keyboard.press('Control+A'); await p.keyboard.type(texte); await p.keyboard.press('Enter');
      await p.waitForTimeout(400);
      await p.waitForFunction(() => !Ext.ComponentQuery.query('ventemanager gridpanel')[0].getStore().isLoading(), null, { timeout: 30000 });
      return p.evaluate(() => { const st = Ext.ComponentQuery.query('ventemanager gridpanel')[0].getStore(); return { refs: st.getRange().map((r) => r.get('strREF')), poste: st.lastOptions && st.lastOptions.params && st.lastOptions.params.poste }; });
    };
    const postesConnus = await p.evaluate(() => new Promise((r) => { const st = Ext.ComponentQuery.query('ventemanager #posteVente')[0].getStore(); st.load({ callback: () => r(st.collect('poste')) }); }));
    ok('Ventes terminées : le poste figure dans la liste des postes', postesConnus.indexOf(POSTE) >= 0, JSON.stringify(postesConnus).slice(0, 200));
    const avecPoste = await filtrerPoste(POSTE);
    ok('Ventes terminées : filtre par poste → la vente faite depuis ce poste', avecPoste.refs.indexOf(ref) >= 0 && avecPoste.poste === POSTE, JSON.stringify(avecPoste));
    const autre = await filtrerPoste('E2E-POSTE-INCONNU');
    ok('Ventes terminées : autre poste → la vente n\'apparaît pas', autre.refs.indexOf(ref) < 0, JSON.stringify(autre));
    await filtrerPoste(POSTE);
    await p.evaluate((r) => { const g = Ext.ComponentQuery.query('ventemanager gridpanel')[0], i = g.getStore().findExact('strREF', r);
      const ligne = g.getView().getNode(i); ligne.querySelector('img[data-qtip="Voir détail"]').setAttribute('data-e2e', 'detail'); }, ref);
    await p.click('[data-e2e=detail]');
    await p.waitForFunction(() => Ext.ComponentQuery.query('window').some((w) => w.isVisible() && w.down('#posteVente')), null, { timeout: 30000 });
    const detail = await p.evaluate(() => { const w = Ext.ComponentQuery.query('window').find((x) => x.isVisible() && x.down('#posteVente'));
      const f = w.down('#posteVente'); const t = { visible: f.isVisible(), texte: f.getEl().dom.textContent, saisieCachee: !w.down('#posteSaisieVente').isVisible() }; w.close(); return t; });
    ok('Détail de la vente : « Poste » avec l\'adresse IP (saisie et encaissement sur le même poste)', detail.visible && detail.texte.indexOf(POSTE) >= 0 && /\(.+\)/.test(detail.texte) && detail.saisieCachee, JSON.stringify(detail));


    /* ajustement de stock (memes appels que l'ecran Ajustement) : l'avant / apres est conserve */
    const stockAvant = parseInt(q("SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_FAMILLE_ID = '" + produit.id + "' AND lg_EMPLACEMENT_ID = '1'"), 10);
    const cree = await api('POST', '../api/v1/ajustement/creeation', { refParent: null, value: 2, description: 'E2E journal', refTwo: produit.id,
      valueTwo: stockAvant, valueFour: '1', zone: 'RAYON' });
    const ajId = cree.data && cree.data.lgAJUSTEMENTID;
    const clos = await api('PUT', '../api/v1/ajustement/' + ajId, { description: 'E2E journal' });
    const cip = q("SELECT int_CIP FROM t_famille WHERE lg_FAMILLE_ID = '" + produit.id + "'");
    const ja = q("SELECT CONCAT_WS('|', str_DETAIL, remote_host) FROM t_event_log WHERE typeLog = " + ORD.AJUSTEMENT_DE_PRODUIT + " AND str_TYPE_LOG = '" + cip + "' AND dt_CREATED >= '" + DEBUT + "' ORDER BY dt_CREATED DESC LIMIT 1");
    ok('Ajustement : journalisé avec « Stock : avant X → après X+2 » et le poste', clos.success && ja === 'Stock : avant ' + stockAvant + ' → après ' + (stockAvant + 2) + '|' + POSTE, JSON.stringify(clos).slice(0, 150) + ' / ' + ja);

    /* suppression de facture (bouton de la liste des factures) : tracee avec son numero et son montant */
    q("INSERT INTO t_facture (lg_FACTURE_ID, str_CODE_FACTURE, dbl_MONTANT_CMDE, dt_CREATED, str_STATUT) VALUES ('" + MARQUE + "-F1', '" + MARQUE + "-FACT', 12345, NOW(), 'enable')");
    await p.evaluate(() => new Promise((r) => Ext.Ajax.request({ url: '../api/v1/facturation/E2E-JRN-F1', method: 'DELETE', callback: () => r() })));
    const jf = q("SELECT CONCAT_WS('|', str_DESCRIPTION, remote_host) FROM t_event_log WHERE typeLog = " + ORD.SUPPRESION_DE_FACTURE + " AND str_TYPE_LOG = '" + MARQUE + "-FACT'");
    ok('Suppression de facture : journalisée (numéro, montant, poste)', q("SELECT COUNT(*) FROM t_facture WHERE lg_FACTURE_ID = '" + MARQUE + "-F1'") === '0'
      && jf.startsWith('Suppression de la facture N° ' + MARQUE + '-FACT, montant 12345 ') && jf.endsWith('|' + POSTE), jf);

    /* ------------------------------------------------ ecran : colonnes, filtre poste, alertes */
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('logfile', 'Fichier Journal', ''));
    await p.waitForFunction(() => Ext.getCmp('logfileGrid') && Ext.getCmp('dt_log_start') && Ext.getCmp('cmbposte'), null, { timeout: 30000 });
    const chercher = async (du, au) => {
      await p.evaluate(([d, a2]) => { Ext.getCmp('dt_log_start').setValue(Ext.Date.parse(d, 'Y-m-d')); Ext.getCmp('dt_end_log').setValue(Ext.Date.parse(a2, 'Y-m-d')); }, [du, au]);
      await p.evaluate(() => { Ext.ComponentQuery.query('#logfileGrid button[text=Rechercher]')[0].btnEl.dom.setAttribute('data-e2e', 'rech'); });
      await p.click('[data-e2e=rech]');
      await p.waitForFunction(() => !Ext.getCmp('logfileGrid').getStore().isLoading(), null, { timeout: 30000 });
      await p.waitForTimeout(500);
    };
    const aujourdhui = q('SELECT CURDATE()');
    await chercher(aujourdhui, aujourdhui);
    const colonnes = await p.evaluate(() => Ext.getCmp('logfileGrid').headerCt.getGridColumns().map((c) => c.text));
    const lv = await p.evaluate((r) => { const s = Ext.getCmp('logfileGrid').getStore(), i = s.findBy((x) => x.get('strTYPELOG') === r); return i < 0 ? null : s.getAt(i).data; }, cip);
    ok('Liste : colonnes Poste / Adresse IP / Application renseignées pour l\'ajustement', ['Poste', 'Adresse IP', 'Application'].every((c) => colonnes.indexOf(c) >= 0)
      && lv && lv.poste === POSTE && lv.ip && /Chrome/.test(lv.application), JSON.stringify(colonnes) + ' ' + JSON.stringify(lv));
    await p.evaluate(() => { Ext.getCmp('cmbposte').setValue('E2E-POSTE-ALERTE'); });
    await chercher('2025-06-10', '2025-06-10');
    const filtre = await p.evaluate(() => Ext.getCmp('logfileGrid').getStore().getRange().map((r) => r.get('poste')));
    ok('Filtre par poste : les 4 lignes de ce poste seulement', filtre.length === 4 && filtre.every((x) => x === 'E2E-POSTE-ALERTE'), JSON.stringify(filtre));
    await p.evaluate(() => { Ext.getCmp('logfileGrid').down('#btnAlertesJournal').btnEl.dom.setAttribute('data-e2e', 'alertes'); });
    await p.click('[data-e2e=alertes]');
    await p.waitForFunction(() => /Annulations en série/.test(Ext.getCmp('logfileGrid').down('#alertesJournal').getEl().dom.textContent), null, { timeout: 30000 });
    const al = await p.evaluate(() => { const d = Ext.getCmp('logfileGrid').down('#alertesJournal').getEl().dom;
      return { series: [...d.querySelectorAll('.journal-series li')].map((x) => x.textContent), hors: [...d.querySelectorAll('.journal-hors-horaires li')].map((x) => x.textContent) }; });
    ok('Alertes : 3 annulations en 12 minutes signalées (série)', al.series.length === 1 && /3 annulations du 10\/06\/2025 10:00 au 10\/06\/2025 10:12/.test(al.series[0]) && /E2E-POSTE-ALERTE/.test(al.series[0]), JSON.stringify(al.series));
    ok('Alertes : l\'ajustement de 05:30 est hors horaires', al.hors.some((x) => /10\/06\/2025 05:30/.test(x) && /Ajustement/.test(x)), JSON.stringify(al.hors));
    /* export Excel avec les nouvelles colonnes */
    const xlsx = await p.evaluate(async () => { const u = '../api/v1/common/logs/export-excel?' + Ext.Object.toQueryString({ dtStart: '2025-06-10', dtEnd: '2025-06-10', criteria: -1, query: '', userId: '', poste: 'E2E-POSTE-ALERTE' });
      return Array.from(new Uint8Array(await (await fetch(u)).arrayBuffer())); });
    require('fs').writeFileSync('/tmp/e2e-journal.xlsx', Buffer.from(xlsx));
    const lignes = JSON.parse(execFileSync('python3', ['-I', '-c', 'import sys, json, openpyxl\nw = openpyxl.load_workbook(sys.argv[1]).active\nprint(json.dumps([[("" if c is None else str(c)) for c in r] for r in w.iter_rows(values_only=True)]))', '/tmp/e2e-journal.xlsx'], { encoding: 'utf8' }));
    const entete = lignes.find((l) => l.indexOf('Poste') >= 0) || [];
    ok('Export Excel : colonnes Poste, Adresse IP, Application, Avant / après ; filtre de poste appliqué', ['Poste', 'Adresse IP', 'Application', 'Avant / après'].every((c) => entete.indexOf(c) >= 0)
      && lignes.filter((l) => l.indexOf('E2E-POSTE-ALERTE') >= 0).length === 4, JSON.stringify(entete));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Déroulement du test', false, e.stack || e);
  } finally {
    await p.evaluate(() => { try { window.localStorage.removeItem('prestige.poste'); } catch (e) { /* */ } }).catch(() => {});
    await b.close();
    try { nettoyer(); } catch (e) { console.log('nettoyage : ' + e.message); }
    ok('Remise en état : ventes, lignes de journal de l\'essai retirées', q("SELECT (SELECT COUNT(*) FROM t_preenregistrement WHERE dt_CREATED >= '" + DEBUT + "' AND lg_USER_ID = '" + ADMIN + "')"
      + " + (SELECT COUNT(*) FROM t_event_log WHERE lg_EVENT_LOG_ID LIKE '" + MARQUE + "%')") === '0');
    const n = res.filter((x) => x.c).length;
    console.log('\n' + n + '/' + res.length + (n === res.length ? ' OK' : ' ECHEC'));
    process.exit(n === res.length ? 0 : 1);
  }
})();
