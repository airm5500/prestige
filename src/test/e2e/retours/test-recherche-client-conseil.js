/* RECHERCHE CLIENT ET « CONSEIL » A LA VENTE (retours du 13/10, point 11). Admin.
 *  A. Recherche des clients « Commence par » (defaut, comme avant) ou « Contient », et par numero :
 *     - client standard (vente) : par nom, telephone saisi avec ou sans separateurs, code interne ; « OUASSI » ne trouve
 *       qu'en « Contient » ;
 *     - client assure (vente VO) : par prenoms, matricule, « Contient » ;
 *     - gestion des clients : selecteur « Commence par / Contient » a cote de la recherche, memorise ; la recherche le
 *       suit ; sans mode, comportement d'avant.
 *  B. « Conseil » a la vente (facultatif) : liste a cote du Vendeur, vide par defaut ; la cloture enregistre le conseil
 *     choisi (inconnu : ignore ; absent : rien) ; statistiques d'activite par operateur : ventes conseillees.
 * Clients et ventes d'essai retires, stock remis.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin'");
const CONSEIL = q(`SELECT lg_USER_ID FROM t_user WHERE str_STATUT = 'enable' AND lg_USER_ID <> '${ADMIN}' AND str_LOGIN NOT LIKE 'E2E%' ORDER BY lg_USER_ID LIMIT 1`);
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
const CS = 'E2E-RCH-STD', CA = 'E2E-RCH-ASS', CAISSE = 'e2e-rch-caisse';
let produit = null, stockOrigine = null, caisseCreee = false;

const ventesDuTest = () => q("SELECT IFNULL(GROUP_CONCAT(CONCAT('''', lg_PREENREGISTREMENT_ID, '''')), '''-''') FROM t_preenregistrement"
  + " WHERE dt_CREATED >= '" + DEBUT + "' AND lg_USER_ID = '" + ADMIN + "'");
function nettoyer() {
  exec(`DELETE FROM t_compte_client WHERE lg_CLIENT_ID IN ('${CS}', '${CA}'); DELETE FROM t_client WHERE lg_CLIENT_ID IN ('${CS}', '${CA}');`);
  const v = ventesDuTest();
  exec("CREATE TEMPORARY TABLE e2e_rc_l AS SELECT lg_PREENREGISTREMENT_DETAIL_ID id FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "CREATE TEMPORARY TABLE e2e_rc_r AS SELECT lg_REGLEMENT_ID id FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + v + ") AND lg_REGLEMENT_ID IS NOT NULL;"
    + "DELETE FROM t_fidelite_mouvement WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DELETE FROM vente_reglement WHERE vente_id IN (" + v + ");"
    + "DELETE FROM annulation_recette WHERE preenregistrement_id IN (" + v + ");"
    + "DELETE FROM hmvtproduit WHERE pkey IN (SELECT id FROM e2e_rc_l);"
    + "DELETE FROM mvttransaction WHERE pkey IN (" + v + ") OR vente_id IN (" + v + ");"
    + "DELETE FROM t_recettes WHERE str_REF_FACTURE IN (" + v + ");"
    + "DELETE FROM t_preenregistrement_compte_client WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "UPDATE t_preenregistrement SET lg_PREENGISTREMENT_ANNULE_ID = NULL, lg_PARENT_ID = NULL, lg_REGLEMENT_ID = NULL WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DELETE FROM t_reglement WHERE lg_REGLEMENT_ID IN (SELECT id FROM e2e_rc_r);"
    + "DROP TEMPORARY TABLE IF EXISTS e2e_rc_l; DROP TEMPORARY TABLE IF EXISTS e2e_rc_r;");
  if (produit && stockOrigine !== null) {
    exec("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = " + stockOrigine[0] + ", int_NUMBER = " + stockOrigine[1] + " WHERE lg_FAMILLE_ID = '" + produit.id + "' AND lg_EMPLACEMENT_ID = '1'");
  }
  if (caisseCreee) {
    exec("DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID = '" + CAISSE + "'");
  }
}

(async () => {
  nettoyer();
  exec(`INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, str_TELEPHONE, str_CODE_INTERNE, str_STATUT, dt_CREATED, lg_TYPE_CLIENT_ID) VALUES`
    + ` ('${CS}', 'ZZRCHKOUASSI', 'Adjoua', '07 08 09 10 11', 'E2ERCH42', 'enable', NOW(), '6'),`
    + ` ('${CA}', 'ZZRCHYAPO', 'Marius', '05-44-33-22-11', NULL, 'enable', NOW(), '1');`
    + `UPDATE t_client SET str_NUMERO_SECURITE_SOCIAL = 'E2ENSS77' WHERE lg_CLIENT_ID = '${CA}';`
    + `INSERT INTO t_compte_client (lg_COMPTE_CLIENT_ID, lg_CLIENT_ID, str_STATUT, dt_CREATED) VALUES ('${CS}-c', '${CS}', 'enable', NOW()), ('${CA}-c', '${CA}', 'enable', NOW());`);
  const a = q("SELECT CONCAT(f.lg_FAMILLE_ID, ':', f.int_PRICE) FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
    + " WHERE f.str_STATUT = 'enable' AND f.int_PRICE BETWEEN 200 AND 5000 AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 AND COALESCE(f.lg_FAMILLE_PARENT_ID, '') = ''"
    + " AND f.bool_ACCOUNT = 1 AND s.int_NUMBER_AVAILABLE >= 0 ORDER BY f.str_NAME LIMIT 1").split(':');
  produit = { id: a[0], pu: parseInt(a[1], 10) };
  stockOrigine = q("SELECT CONCAT(int_NUMBER_AVAILABLE, '|', int_NUMBER) FROM t_famille_stock WHERE lg_FAMILLE_ID = '" + produit.id + "' AND lg_EMPLACEMENT_ID = '1'").split('|');
  exec("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = 100, int_NUMBER = 100 WHERE lg_FAMILLE_ID = '" + produit.id + "' AND lg_EMPLACEMENT_ID = '1'");
  if (q("SELECT COUNT(*) FROM t_resume_caisse WHERE lg_USER_ID = '" + ADMIN + "' AND str_STATUT = 'is_Using'") === '0') {
    exec("INSERT INTO t_resume_caisse (ld_CAISSE_ID, lg_USER_ID, int_SOLDE_MATIN, int_SOLDE_SOIR, dt_DAY, dt_CREATED, lg_CREATED_BY, dt_UPDATED, lg_UPDATED_BY, str_STATUT)"
      + " VALUES ('" + CAISSE + "', '" + ADMIN + "', 0, 0, CURDATE(), NOW(), '" + ADMIN + "', NOW(), '" + ADMIN + "', 'is_Using')");
    caisseCreee = true;
  }
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const err = [];
  try {
    const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
    p.on('pageerror', (e) => err.push(e.message));
    const api = (methode, url, corps) => p.evaluate(async ([m, u, c]) => {
      const r = await fetch(u, { method: m, headers: { 'Content-Type': 'application/json' }, body: c ? JSON.stringify(c) : undefined });
      const t = await r.text(); try { return JSON.parse(t); } catch (e) { return { success: false, brut: t.slice(0, 200) }; }
    }, [methode, url, corps]);
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => { try { localStorage.removeItem('prestige.rechercheClient.mode'); } catch (e) { /* */ } });

    /* ---------- A. recherche (fetch : sans le reglage de l'ecran) ---------- */
    const ids = (r) => (r.data || []).map((x) => x.lgCLIENTID || x.lg_CLIENT_ID);
    const lambda = (query, mode) => api('GET', '../api/v1/client/lambda?query=' + encodeURIComponent(query) + (mode ? '&mode=' + mode : ''));
    ok('Standard, commence par le nom (sans mode : comme avant)', ids(await lambda('ZZRCHKOU')).includes(CS));
    ok('« OUASSI » : introuvable en « Commence par »', !ids(await lambda('OUASSI', 'commence')).includes(CS));
    ok('« OUASSI » : trouvé en « Contient »', ids(await lambda('OUASSI', 'contient')).includes(CS));
    ok('Téléphone saisi sans séparateurs : trouvé', ids(await lambda('0708091011')).includes(CS));
    ok('Téléphone saisi avec d\'autres séparateurs : trouvé', ids(await lambda('07.08.09')).includes(CS));
    ok('Code interne : trouvé', ids(await lambda('E2ERCH42')).includes(CS));
    const tous = (query, mode) => api('GET', '../api/v1/client/all?typeClientId=1&query=' + encodeURIComponent(query) + (mode ? '&mode=' + mode : ''));
    ok('Assuré : par matricule et par prénoms', ids(await tous('E2ENSS77')).includes(CA) && ids(await tous('Marius')).includes(CA));
    ok('Assuré : « APO » seulement en « Contient »', !ids(await tous('APO')).includes(CA) && ids(await tous('APO', 'contient')).includes(CA));
    ok('Assuré : téléphone sans séparateurs', ids(await tous('0544332211')).includes(CA));

    /* gestion des clients : selecteur, memorise, la recherche le suit */
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('clientmanager', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('clientgestion').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(2500);
    const selecteur = await p.evaluate(() => { const c = Ext.ComponentQuery.query('clientgestion #modeRechercheClient')[0];
      return c ? c.items.getRange().map((x) => x.text + (x.pressed ? '*' : '')) : null; });
    ok('Gestion des clients : « Commence par / Contient » à côté de la recherche, « Commence par » par défaut', JSON.stringify(selecteur) === '["Commence par*","Contient"]', JSON.stringify(selecteur));
    /* ergonomie : le choix actif se voit, et la barre tient sur 1366 px (recherche sur une ligne, actions sur l'autre) */
    const tailleAvant = p.viewportSize();
    await p.setViewportSize({ width: 1366, height: 768 }); await p.waitForTimeout(800);
    const barre = await p.evaluate(() => { const g = Ext.ComponentQuery.query('clientgestion')[0];
      const actif = g.down('#modeRechercheClient').items.getAt(0).getEl().dom, autre = g.down('#modeRechercheClient').items.getAt(1).getEl().dom;
      return { fondActif: getComputedStyle(actif).backgroundColor, fondAutre: getComputedStyle(autre).backgroundColor,
        deborde: g.query('toolbar').filter((t) => t.isVisible(true)).some((t) => [...t.getEl().dom.querySelectorAll('.x-btn, .x-form-text')]
          .filter((x) => x.offsetParent !== null).some((x) => x.getBoundingClientRect().right > t.getEl().getRight() + 1)) }; });
    ok('Choix actif bien visible (fond foncé), barres sans débordement sur 1366 px', barre.fondActif === 'rgb(30, 58, 95)' && barre.fondAutre !== barre.fondActif && !barre.deborde, JSON.stringify(barre));
    await p.setViewportSize(tailleAvant); await p.waitForTimeout(800);
    const chercher = (texte) => p.evaluate((t) => new Promise((ok) => { const e = Ext.ComponentQuery.query('clientgestion')[0];
      Ext.getCmp('rechecher').setValue(t); e.getStore().on('load', (s) => ok(s.collect('lg_CLIENT_ID')), null, { single: true }); e.onRechClick(); }), texte);
    ok('Gestion, « Commence par » : « RCHKOUASS » ne trouve pas', !(await chercher('RCHKOUASS')).includes(CS));
    await p.evaluate(() => Ext.ComponentQuery.query('clientgestion #modeRechercheClient button')[1].btnEl.dom.click());
    const memo = await p.evaluate(() => localStorage.getItem('prestige.rechercheClient.mode'));
    ok('« Contient » choisi : mémorisé sur le poste', memo === 'contient', memo);
    ok('Gestion, « Contient » : « RCHKOUASS » trouve le client', (await chercher('RCHKOUASS')).includes(CS));
    ok('Gestion : le téléphone sans séparateurs trouve le client', (await chercher('0708091011')).includes(CS));
    const typeEtTel = await api('GET', '../api/v1/client/gestion?search_value=0708091011&lg_TYPE_CLIENT_ID=6&limit=50');
    ok('Gestion : téléphone et filtre de type ensemble', (typeEtTel.results || typeEtTel.data || []).some((x) => (x.lg_CLIENT_ID || x.lgCLIENTID) === CS), JSON.stringify(typeEtTel).slice(0, 150));
    await p.evaluate(() => Ext.ComponentQuery.query('clientgestion #modeRechercheClient button')[0].btnEl.dom.click());

    /* ---------- B. conseil ---------- */
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('doventemanager', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('doventemanager #conseil').length > 0, null, { timeout: 30000 }).catch(() => {});
    const combo = await p.evaluate(() => { const c = Ext.ComponentQuery.query('doventemanager #conseil')[0], u = Ext.ComponentQuery.query('doventemanager #user')[0];
      if (!c) { return null; } const bc = c.getEl().getBox(), bu = u.getEl().getBox();
      return { vide: !c.getValue(), aCote: Math.abs(bc.y - bu.y) < 6 && bc.x > bu.x, facultatif: c.allowBlank !== false, envoi: /userConseilId/.test(String(testextjs.app.getController('VenteCtr').onbtncloturer || '')) || true }; });
    ok('Vente : liste « Conseil » à côté du Vendeur, vide et facultative', combo && combo.vide && combo.aCote && combo.facultatif, JSON.stringify(combo));
    const sources = await p.evaluate(() => { const ctr = testextjs.app.getController('VenteCtr'), noms = []; for (const k in ctr) { if (typeof ctr[k] === 'function' && /userConseilId/.test(String(ctr[k]))) { noms.push(k); } } return noms.length; });
    ok('Les deux clôtures de l\'écran (comptant, assurance) envoient le conseil', sources >= 2, sources);
    const nouvelleVente = async () => { const r = await api('POST', '../api/v1/vente/add/vno', { typeVenteId: '1', natureVenteId: '1', produitId: produit.id, itemPu: produit.pu, qte: 1, qteServie: 1,
      devis: false, prevente: false, remiseId: '', userVendeurId: ADMIN }); return r.data ? r.data.lgPREENREGISTREMENTID : null; };
    const cloturer = async (venteId, conseil) => {
      const net = await api('POST', '../api/v1/vente/net/vno', { venteId, remiseId: '', checkUg: false });
      const data = net.data || {}, m = data.montantNet;
      const corps = { venteId, typeVenteId: '1', natureVenteId: '1', devis: false, remiseId: '', userVendeurId: ADMIN, montantRecu: m, montantRemis: 0, montantPaye: m,
        totalRecap: m, partTP: 0, typeRegleId: '1', clientId: '', nom: '', commentaire: '', banque: '', lieux: '', marge: data.marge || 0, data,
        reglements: [{ typeReglement: '1', montant: m, montantAttentu: m }] };
      if (conseil !== undefined) { corps.userConseilId = conseil; }
      return api('POST', '../api/v1/vente/cloturer/vno', corps);
    };
    const conseilDe = (v) => q(`SELECT IFNULL(lg_USER_CONSEIL_ID, 'AUCUN') FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${v}'`);
    const v1 = await nouvelleVente(), c1 = await cloturer(v1, CONSEIL);
    ok('Clôture avec un conseil : enregistré', c1.success === true && conseilDe(v1) === CONSEIL, conseilDe(v1));
    const v2 = await nouvelleVente(), c2 = await cloturer(v2, undefined);
    ok('Clôture sans conseil : vente normale, aucun conseil', c2.success === true && conseilDe(v2) === 'AUCUN', conseilDe(v2));
    const v3 = await nouvelleVente(), c3 = await cloturer(v3, 'INCONNU-E2E');
    ok('Conseil inconnu : ignoré, la vente se clôture', c3.success === true && conseilDe(v3) === 'AUCUN', conseilDe(v3));

    /* statistiques d'activite par operateur : ventes conseillees */
    const jour = q('SELECT CURDATE()');
    const net1 = Number(q(`SELECT int_PRICE - IFNULL(int_PRICE_REMISE, 0) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${v1}'`));
    const attendu = q(`SELECT CONCAT_WS('|', COUNT(*), SUM(int_PRICE - IFNULL(int_PRICE_REMISE, 0))) FROM t_preenregistrement WHERE lg_USER_CONSEIL_ID = '${CONSEIL}'`
      + ` AND dt_CREATED >= CURDATE() AND str_STATUT = 'is_Closed' AND b_IS_CANCEL = 0 AND int_PRICE > 0`).split('|').map(Number);
    const stat = await api('GET', '../webservices/Report/Operateur/ws_data.jsp?dt_start_vente=' + jour + '&dt_end_vente=' + jour + '&page=1&start=0&limit=100');
    const ligne = (stat.data || []).find((x) => x.userId === CONSEIL);
    ok('Activité par opérateur : ventes conseillées (nombre, montant) de la personne choisie', ligne && ligne.NB_CONSEIL === attendu[0] && ligne.MONTANT_CONSEIL === attendu[1] && attendu[1] >= net1,
      JSON.stringify(ligne || {}).slice(0, 200) + ' attendu ' + attendu.join('|'));
    const autres = (stat.data || []).filter((x) => x.userId !== CONSEIL);
    ok('Les autres opérateurs ont leurs chiffres d\'avant et 0 vente conseillée si aucune', autres.every((x) => typeof x.NB_CONSEIL === 'number'), autres.length);
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('statActiviteOperateurManager', 'Activité', ''));
    await p.waitForFunction(() => Ext.getCmp('opGrid') && Ext.getCmp('opGrid').down('#colConseil'), null, { timeout: 30000 }).catch(() => {});
    ok('Écran de l\'activité par opérateur : colonnes « Conseil » (nombre, montant)', await p.evaluate(() => { const g = Ext.getCmp('opGrid'); return !!g && !!g.down('#colNbConseil') && !!g.down('#colMontantConseil'); }));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Clients et ventes d\'essai retirés', q(`SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID IN ('${CS}', '${CA}')`) === '0'
      && q("SELECT COUNT(*) FROM t_preenregistrement WHERE dt_CREATED >= '" + DEBUT + "' AND lg_USER_ID = '" + ADMIN + "'") === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
  process.exit(ko ? 1 : 0);
})();
