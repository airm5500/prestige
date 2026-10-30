/* VENTE : POINTS DU CLIENT ET CASE « UTILISER » (retours du 25/10, point 2).
 *
 * Par les vues (admin), SERVICE CLIENT > Ventes > Nouvelle vente, especes, client inscrit a la fidelite avec 200 points
 * (point = 5 FCFA -> 1 000 FCFA), article d'environ 2 000 FCFA. Jeu d'essai retire a la fin (vente, client, points,
 * parametres de fidelite, stock).
 *  - client associe : encadre « 200 point(s) = 1 000 FCFA » et case « Utiliser » ;
 *  - « Utiliser » coche : « Points fidélité » devient le second mode (1 000 FCFA, verrouille) ; decoche : retire ;
 *  - recoche, montant recu = net - 1 000, « Terminer la vente » : vente cloturee avec deux reglements (especes et
 *    Points fidelite), 200 points debites ;
 *  - client non inscrit : pas d'encadre ; l'ancien chemin (mode « Points fidélité ») reste propose ;
 *  - aucune erreur JavaScript, aucune fenetre du navigateur.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer, texteMessage, repondre } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const C = 'E2E-FIDV-C1', C2 = 'E2E-FIDV-C2', NOM = 'ZZFIDVENTE', CAISSE = 'e2e-fidv-caisse';
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
const [PID, CIP, PU] = q("SELECT f.lg_FAMILLE_ID, f.int_CIP, f.int_PRICE FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
  + " WHERE f.str_STATUT = 'enable' AND f.int_PRICE BETWEEN 1500 AND 3000 AND f.int_CIP REGEXP '^[0-9]{7}$' AND COALESCE(f.bool_DECONDITIONNE, 0) = 0"
  + " AND COALESCE(f.lg_FAMILLE_PARENT_ID, '') = '' AND f.bool_ACCOUNT = 1 ORDER BY f.int_CIP LIMIT 1").split('\t');
const STOCK = q(`SELECT CONCAT(int_NUMBER_AVAILABLE, '|', int_NUMBER) FROM t_famille_stock WHERE lg_FAMILLE_ID = '${PID}' AND lg_EMPLACEMENT_ID = '1'`).split('|');
let caisseCreee = false;

const ventesDuTest = () => q("SELECT IFNULL(GROUP_CONCAT(CONCAT('''', lg_PREENREGISTREMENT_ID, '''')), '''-''') FROM t_preenregistrement"
  + " WHERE (dt_CREATED >= '" + DEBUT + "' AND lg_USER_ID = '" + ADMIN + "')"
  /* et celles d'un essai interrompu (arret du serveur) : toutes les ventes des clients d'essai */
  + " OR lg_CLIENT_ID IN ('" + C + "', '" + C2 + "') OR lg_PREENREGISTREMENT_ID IN (SELECT pc.lg_PREENREGISTREMENT_ID"
  + " FROM t_preenregistrement_compte_client pc JOIN t_compte_client cc ON cc.lg_COMPTE_CLIENT_ID = pc.lg_COMPTE_CLIENT_ID"
  + " WHERE cc.lg_CLIENT_ID IN ('" + C + "', '" + C2 + "'))");
function nettoyer() {
  const v = ventesDuTest();
  exec("CREATE TEMPORARY TABLE e2e_fv_l AS SELECT lg_PREENREGISTREMENT_DETAIL_ID id FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "CREATE TEMPORARY TABLE e2e_fv_r AS SELECT lg_REGLEMENT_ID id FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + v + ") AND lg_REGLEMENT_ID IS NOT NULL;"
    + "DELETE FROM t_fidelite_mouvement WHERE lg_CLIENT_ID IN ('" + C + "', '" + C2 + "') OR lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DELETE FROM vente_reglement WHERE vente_id IN (" + v + ");"
    + "DELETE FROM annulation_recette WHERE preenregistrement_id IN (" + v + ");"
    + "DELETE FROM hmvtproduit WHERE pkey IN (SELECT id FROM e2e_fv_l);"
    + "DELETE FROM mvttransaction WHERE pkey IN (" + v + ") OR vente_id IN (" + v + ");"
    + "DELETE FROM t_recettes WHERE str_REF_FACTURE IN (" + v + ");"
    + "DELETE FROM t_preenregistrement_compte_client WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "UPDATE t_preenregistrement SET lg_PREENGISTREMENT_ANNULE_ID = NULL, lg_PARENT_ID = NULL, lg_REGLEMENT_ID = NULL WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DELETE FROM vente_exclu WHERE preenregistrement_id IN (" + v + ");"
    + "DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DELETE FROM t_reglement WHERE lg_REGLEMENT_ID IN (SELECT id FROM e2e_fv_r);"
    + "DELETE FROM t_compte_client WHERE lg_CLIENT_ID IN ('" + C + "', '" + C2 + "');"
    + "DELETE FROM t_client WHERE lg_CLIENT_ID IN ('" + C + "', '" + C2 + "');"
    + "DROP TEMPORARY TABLE IF EXISTS e2e_fv_l; DROP TEMPORARY TABLE IF EXISTS e2e_fv_r;");
  exec(`UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = ${STOCK[0]}, int_NUMBER = ${STOCK[1]} WHERE lg_FAMILLE_ID = '${PID}' AND lg_EMPLACEMENT_ID = '1'`);
  if (caisseCreee) { exec("DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID = '" + CAISSE + "'"); }
}

(async () => {
  nettoyer(); // reprise apres un essai interrompu : ses donnees d'essai sont retirees d'abord
  exec("CREATE TABLE IF NOT EXISTS zz_e2e_fv_param AS SELECT * FROM t_fidelite_parametre;"
    + "CREATE TABLE IF NOT EXISTS zz_e2e_fv_mode AS SELECT lg_TYPE_REGLEMENT_ID, str_STATUT FROM t_type_reglement WHERE lg_TYPE_REGLEMENT_ID = '20';");
  exec(`UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = 100, int_NUMBER = 100 WHERE lg_FAMILLE_ID = '${PID}' AND lg_EMPLACEMENT_ID = '1'`);
  exec(`INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, str_ADRESSE, lg_TYPE_CLIENT_ID, str_STATUT, dt_CREATED) VALUES ('${C}', '${NOM}', 'INSCRIT', '0700000071', '6', 'enable', NOW()),`
    + ` ('${C2}', '${NOM}', 'NONINSCRIT', '0700000072', '6', 'enable', NOW());`
    + `INSERT INTO t_compte_client (lg_COMPTE_CLIENT_ID, lg_CLIENT_ID, str_STATUT, dt_CREATED) VALUES ('${C}-cpt', '${C}', 'enable', NOW()), ('${C2}-cpt', '${C2}', 'enable', NOW());`
    + `UPDATE t_client SET bool_FIDELITE = 0 WHERE lg_CLIENT_ID = '${C2}';`);
  if (q("SELECT COUNT(*) FROM t_resume_caisse WHERE lg_USER_ID = '" + ADMIN + "' AND str_STATUT = 'is_Using'") === '0') {
    exec("INSERT INTO t_resume_caisse (ld_CAISSE_ID, lg_USER_ID, int_SOLDE_MATIN, int_SOLDE_SOIR, dt_DAY, dt_CREATED, lg_CREATED_BY, dt_UPDATED, lg_UPDATED_BY, str_STATUT)"
      + " VALUES ('" + CAISSE + "', '" + ADMIN + "', 0, 0, CURDATE(), NOW(), '" + ADMIN + "', NOW(), '" + ADMIN + "', 'is_Using')");
    caisseCreee = true;
  }
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
  const erreurs = [], dialogues = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  const api = (m, u, c) => p.evaluate(async ([mm, uu, cc]) => { const r = await fetch(uu, { method: mm, headers: { 'Content-Type': 'application/json' }, body: cc ? JSON.stringify(cc) : undefined }); return r.json(); }, [m, u, c]);
  const solde = () => Number(q("SELECT COALESCE(SUM(int_POINTS), 0) FROM t_fidelite_mouvement WHERE lg_CLIENT_ID = '" + C + "'"));
  const fermerMessages = async () => { for (let i = 0; i < 4 && await texteMessage(p); i++) { await repondre(p, 'ok').catch(() => p.evaluate(() => Ext.MessageBox.hide())); await p.waitForTimeout(300); } };
  const associer = async (id) => {
    await cliquer(p, 'doventemanager #contenu #btnClientComptant');
    await p.waitForTimeout(1500);
    await p.evaluate((nom) => { const g = Ext.ComponentQuery.query('clientLambda #lambdaClientGrid')[0]; const st = g.getStore(); st.getProxy().extraParams = Ext.apply(st.getProxy().extraParams || {}, { query: nom }); st.load(); }, NOM);
    await p.waitForFunction((x) => { const g = Ext.ComponentQuery.query('clientLambda #lambdaClientGrid')[0]; return g && !g.getStore().isLoading() && g.getStore().findExact('lgCLIENTID', x) >= 0; }, id, { timeout: 20000 });
    await p.evaluate((x) => { const g = Ext.ComponentQuery.query('clientLambda #lambdaClientGrid')[0]; const i = g.getStore().findExact('lgCLIENTID', x); testextjs.app.getController('VenteCtr').btnAjouterClientLambda(g, i, i); }, id);
    await p.waitForTimeout(2500);
    await fermerMessages();
  };
  const encadre = () => p.evaluate(() => { const z = Ext.ComponentQuery.query('doventemanager #contenu #fideliteVente')[0]; const c = z && z.down('#utiliserPoints');
    return z ? { vue: z.isVisible(true), texte: z.down('#fideliteSolde').getEl() ? z.down('#fideliteSolde').getEl().dom.textContent : '', actif: c && !c.isDisabled() } : null; });
  const extra = () => p.evaluate(() => { const c = testextjs.app.getController('VenteCtr'); const m = c.getMontantExtra();
    return { mode: c.getExtraModeReglementId(), vue: m.isVisible(), valeur: m.getValue(), libelle: m.getFieldLabel(), verrou: m.readOnly }; });
  const clicCase = async () => { await p.evaluate(() => { const c = Ext.ComponentQuery.query('doventemanager #contenu #utiliserPoints')[0]; c.getEl().dom.setAttribute('data-e2e', 'utiliser'); });
    await p.click('[data-e2e=utiliser] input'); await p.waitForTimeout(800); };
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    let r = await api('PUT', '../api/v1/fidelite/parametres', { actif: true, montantPoint: 1000, valeurPoint: 5, seuil: 0, expirationMois: 12, assurance: true, debut: q('SELECT CURDATE()') });
    r = await api('POST', '../api/v1/fidelite/client/' + C + '/ajuster', { points: 200, motif: 'Essai case Utiliser' });
    ok('Précondition : fidélité active, client inscrit avec 200 points (1 000 FCFA), article de ' + PU + ' FCFA', r.success && solde() === 200 && !!CIP, JSON.stringify(r));

    await ouvrirMenu(p, 'SERVICE CLIENT', 'Ventes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('cloturerventemanager #addBtn').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await cliquer(p, 'cloturerventemanager #addBtn');
    const champ = 'doventemanager #contenu [xtype=fieldcontainer] #produit';
    await p.waitForFunction((x) => Ext.ComponentQuery.query(x).some((y) => y.isVisible(true)), champ, { timeout: 60000 });
    await p.waitForTimeout(1500);
    await cliquer(p, champ);
    await p.keyboard.type(CIP, { delay: 5 });
    await p.keyboard.press('Enter');
    await p.waitForTimeout(3500);
    await fermerMessages();
    const net = await p.evaluate(() => { const d = testextjs.app.getController('VenteCtr').getNetAmountToPay(); return d ? parseInt(d.montantNet, 10) : 0; });
    ok('Article ajouté : net à payer > 1 000 FCFA', net > 1000, String(net));

    await associer(C2);
    let e = await encadre();
    ok('Client non inscrit : pas d\'encadré des points', e && !e.vue, JSON.stringify(e));
    const modes = await p.evaluate(() => { const c = Ext.ComponentQuery.query('doventemanager #typeReglement')[0]; const l = []; c.getStore().each((x) => l.push(x.get('lgTYPEREGLEMENTID'))); return l; });
    ok('L\'ancien chemin reste : mode « Points fidélité » proposé dans la liste', modes.includes('20'), modes.join(','));

    await associer(C);
    await p.waitForFunction(() => { const z = Ext.ComponentQuery.query('doventemanager #contenu #fideliteVente')[0]; return z && z.isVisible(true); }, null, { timeout: 15000 }).catch(() => {});
    e = await encadre();
    ok('Client inscrit associé : « 200 point(s) = 1 000 FCFA » et la case « Utiliser » active', e && e.vue && /200 point\(s\) = 1[\s  ,.]?000 FCFA/.test(e.texte) && e.actif, JSON.stringify(e));
    await clicCase();
    let x = await extra();
    ok('« Utiliser » coché : « Points fidélité » en second mode, 1 000 FCFA, verrouillé', x.mode === '20' && x.vue && x.valeur === 1000 && x.verrou && /POINTS FIDÉLITÉ/.test(x.libelle), JSON.stringify(x));
    await clicCase();
    x = await extra();
    ok('Décoché : second mode retiré', !x.mode && !x.vue, JSON.stringify(x));
    await clicCase();
    x = await extra();
    ok('Recoché : de nouveau 1 000 FCFA en points', x.mode === '20' && x.valeur === 1000, JSON.stringify(x));

    const especes = net - 1000;
    await cliquer(p, 'doventemanager #contenu #montantRecu');
    await p.waitForTimeout(500);
    await p.keyboard.press('Control+A');
    await p.keyboard.type(String(especes), { delay: 20 });
    await p.waitForTimeout(800);
    const vente = await p.evaluate(() => testextjs.app.getController('VenteCtr').current.lgPREENREGISTREMENTID);
    await cliquer(p, 'doventemanager #contenu [xtype=toolbar] #btnCloture');
    let etat = '';
    for (const fin = Date.now() + 30000; Date.now() < fin;) {
      etat = q(`SELECT str_STATUT FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${vente}'`);
      if (etat === 'is_Closed') { break; }
      await p.waitForTimeout(500);
      await fermerMessages();
    }
    const regl = q(`SELECT GROUP_CONCAT(CONCAT(type_regelement, ':', montant) ORDER BY type_regelement) FROM vente_reglement WHERE vente_id = '${vente}'`);
    ok('« Terminer la vente » : vente clôturée, espèces ' + especes + ' + Points fidélité 1 000', etat === 'is_Closed' && /20:1000/.test(regl), etat + ' / ' + regl);
    ok('200 points débités au client', q(`SELECT -SUM(int_POINTS) FROM t_fidelite_mouvement WHERE lg_CLIENT_ID = '${C}' AND str_TYPE = 'UTILISATION' AND lg_PREENREGISTREMENT_ID = '${vente}'`) === '200');
    await fermerMessages();
    ok('Aucune erreur JavaScript, aucune fenêtre du navigateur', erreurs.length === 0 && dialogues.length === 0, erreurs.concat(dialogues).join(' | '));
  } catch (y) {
    ok('Parcours sans exception', false, y.stack);
  } finally {
    await b.close();
    nettoyer();
    exec("DELETE FROM t_fidelite_parametre; INSERT INTO t_fidelite_parametre SELECT * FROM zz_e2e_fv_param; DROP TABLE zz_e2e_fv_param;"
      + "UPDATE t_type_reglement t JOIN zz_e2e_fv_mode m ON m.lg_TYPE_REGLEMENT_ID = t.lg_TYPE_REGLEMENT_ID SET t.str_STATUT = m.str_STATUT;"
      + "UPDATE t_mode_reglement t JOIN zz_e2e_fv_mode m ON m.lg_TYPE_REGLEMENT_ID = t.lg_TYPE_REGLEMENT_ID SET t.str_STATUT = m.str_STATUT; DROP TABLE zz_e2e_fv_mode;");
    ok('Jeu d\'essai retiré, paramètres remis', q(`SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID IN ('${C}', '${C2}')`) === '0');
  }
  const ko = res.filter((z) => !z.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
