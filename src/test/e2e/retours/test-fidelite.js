/* FIDELITE CLIENTS PARAMETRABLE (retours du 09/10 (6)).
 * Jeu d'essai (retire a la fin ; parametres, paliers et exclusions du banc remis en l'etat) : client E2E-FID,
 * ventes du jour (montant pour 1 point 1 000, valeur du point 5) :
 *   V1 comptant 12 500 (specialites)                         -> 12 points (palier Standard)
 *   V2 comptant 10 000 dont 4 000 veterinaires (exclus)      -> base 6 000 x 1,5 (Argent, 12 >= 10) = 9 points
 *   V3 assurance 10 000, tiers payant 7 000                  -> base 3 000 x 1,5 = 4 points
 *   V4 comptant 5 000                                        -> 5 000 x 1,5 = 7 points, puis vente annulee : -7
 *   V5 comptant 8 000 d'avant la date de debut               -> aucun point
 *  - parametres, palier et categorie exclue saisis dans l'ecran ; valeur aberrante refusee ;
 *  - « Mettre a jour les points » : gains, palier, part du client, categorie exclue ; ventes non modifiees ;
 *  - annulation de vente : points retires ; expiration ; utilisation (points les plus anciens d'abord), seuil,
 *    solde insuffisant ; ajustement avec motif ; desactivation : plus aucun gain ; aucune erreur JavaScript.
 */
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const SORTIE = process.env.SORTIE || '/tmp';
const C = 'E2E-FID-C1';
const SPE = '10263736171005327', VETO = '16926123341024423633';
const CAT_VETO = q("SELECT lg_FAMILLEARTICLE_ID FROM t_famille WHERE lg_FAMILLE_ID = '" + VETO + "'");
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin'");
/* ventes : id, type, net, details [famille, montant], tiers payant, heures avant maintenant */
const VENTES = [['E2E-FID-V1', 'VNO', [[SPE, 12500]], 0, 4], ['E2E-FID-V2', 'VNO', [[SPE, 6000], [VETO, 4000]], 0, 3],
  ['E2E-FID-V3', 'VO', [[SPE, 10000]], 7000, 2], ['E2E-FID-V4', 'VNO', [[SPE, 5000]], 0, 1], ['E2E-FID-V5', 'VNO', [[SPE, 8000]], 0, 24 * 5]];

function nettoyer() {
  exec("DELETE FROM t_fidelite_mouvement WHERE lg_CLIENT_ID = '" + C + "';"
    + "DELETE FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID LIKE 'E2E-FID-%';"
    + "DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID LIKE 'E2E-FID-%';"
    + "DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE 'E2E-FID-%';"
    + "DELETE FROM t_client WHERE lg_CLIENT_ID = '" + C + "';");
}
function sauver() {
  exec("DROP TABLE IF EXISTS zz_e2e_fid_param, zz_e2e_fid_palier, zz_e2e_fid_excl;"
    + "CREATE TABLE zz_e2e_fid_param AS SELECT * FROM t_fidelite_parametre;"
    + "CREATE TABLE zz_e2e_fid_palier AS SELECT * FROM t_fidelite_palier;"
    + "CREATE TABLE zz_e2e_fid_excl AS SELECT * FROM t_fidelite_exclusion;");
}
function restaurer() {
  exec("DELETE FROM t_fidelite_parametre; INSERT INTO t_fidelite_parametre SELECT * FROM zz_e2e_fid_param;"
    + "DELETE FROM t_fidelite_palier; INSERT INTO t_fidelite_palier SELECT * FROM zz_e2e_fid_palier;"
    + "DELETE FROM t_fidelite_exclusion; INSERT INTO t_fidelite_exclusion SELECT * FROM zz_e2e_fid_excl;"
    + "DROP TABLE zz_e2e_fid_param, zz_e2e_fid_palier, zz_e2e_fid_excl;");
}
const solde = () => Number(q("SELECT COALESCE(SUM(int_POINTS), 0) FROM t_fidelite_mouvement WHERE lg_CLIENT_ID = '" + C + "'"));
const empreinteVentes = () => q("SELECT GROUP_CONCAT(CONCAT_WS(':', lg_PREENREGISTREMENT_ID, int_PRICE, int_PRICE_REMISE, int_CUST_PART, str_STATUT, b_IS_CANCEL, dt_UPDATED) ORDER BY 1)"
  + " FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE 'E2E-FID-%'");

(async () => {
  sauver();
  nettoyer();
  /* on part des valeurs par defaut, fidelite desactivee, aucune exclusion */
  exec("UPDATE t_fidelite_parametre SET bool_ACTIF = 0, dt_DEBUT = NULL, int_SEUIL_UTILISATION = 100; DELETE FROM t_fidelite_exclusion;"
    + "DELETE FROM t_fidelite_palier; INSERT INTO t_fidelite_palier VALUES ('FID-PALIER-1', 'Standard', 0, 1.00, NOW()), ('FID-PALIER-2', 'Argent', 300, 1.25, NOW()), ('FID-PALIER-3', 'Or', 1000, 1.50, NOW());");
  exec("INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, str_TELEPHONE, str_STATUT, dt_CREATED, dt_UPDATED)"
    + " VALUES ('" + C + "', 'E2EFID', 'Fidele', '0700000099', 'enable', NOW(), NOW())");
  VENTES.forEach(([id, type, details, tp, h]) => {
    const net = details.reduce((s, d) => s + d[1], 0);
    exec("INSERT INTO t_preenregistrement (lg_PREENREGISTREMENT_ID, str_REF, str_REF_TICKET, lg_USER_ID, int_PRICE, int_PRICE_REMISE, int_CUST_PART, str_STATUT,"
      + " dt_CREATED, dt_UPDATED, str_TYPE_VENTE, lg_TYPE_VENTE_ID, b_IS_CANCEL, lg_CLIENT_ID) VALUES ('" + id + "', '" + id + "', 'TCK-" + id.slice(-2) + "', '" + ADMIN + "', "
      + net + ", 0, 0, 'is_Closed', NOW() - INTERVAL " + h + " HOUR, NOW() - INTERVAL " + h + " HOUR, '" + type + "', '" + (type === 'VO' ? '2' : '1') + "', 0, '" + C + "')");
    details.forEach(([f, m], i) => exec("INSERT INTO t_preenregistrement_detail (lg_PREENREGISTREMENT_DETAIL_ID, lg_PREENREGISTREMENT_ID, lg_FAMILLE_ID, int_QUANTITY, int_PRICE, int_PRICE_REMISE, prixAchat, str_STATUT, dt_CREATED, dt_UPDATED)"
      + " VALUES ('" + id + "-" + i + "', '" + id + "', '" + f + "', 1, " + m + ", 0, 0, 'is_Closed', NOW(), NOW())"));
    if (tp) {
      exec("INSERT INTO t_preenregistrement_compte_client_tiers_payent (lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID, lg_PREENREGISTREMENT_ID, int_PRICE, str_STATUT, dt_CREATED, dt_UPDATED)"
        + " VALUES ('" + id + "-TP', '" + id + "', " + tp + ", 'is_Closed', NOW(), NOW())");
    }
  });
  const avantVentes = empreinteVentes();
  const { chromium } = require('playwright-core');
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
  const p = await ctx.newPage();
  const err = [];
  p.on('pageerror', (e) => err.push(String(e.message)));
  const E = 'Ext.ComponentQuery.query("fideliteclients")[0]';
  /* un composant Ext rendu (setValue, setActiveTab...) n'est pas renvoye au test */
  const ev = (code) => p.evaluate(new Function('var r = (' + code + '); return r && (r.isComponent || r.isObservable) ? null : r;'));
  const clic = (sel) => ev(E + '.down("' + sel + '").btnEl.dom.click()');
  const message = async () => {
    await p.waitForFunction(() => Ext.MessageBox.isVisible(), null, { timeout: 15000 });
    const t = await p.evaluate(() => Ext.MessageBox.msg.getEl().dom.textContent);
    await p.evaluate(() => Ext.MessageBox.hide());
    await p.waitForTimeout(300);
    return t;
  };
  const oui = async () => {
    await p.waitForFunction(() => Ext.MessageBox.isVisible() && Ext.MessageBox.msgButtons.yes.isVisible(), null, { timeout: 10000 });
    await p.evaluate(() => Ext.MessageBox.msgButtons.yes.btnEl.dom.click());
    await p.waitForTimeout(1500);
  };
  const champ = (id, v) => ev(E + '.down("#' + id + '").setValue(' + JSON.stringify(v) + ')');
  const ligneClient = () => ev('(function(){var r=' + E + '.clients.findRecord("id","' + C + '");return r?r.data:null;})()');
  const chercher = async () => {
    await champ('recherche', 'E2EFID');
    await clic('#rechercher');
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('fideliteclients')[0]; return !e.clients.isLoading() && e.clients.getCount() > 0; }, null, { timeout: 20000 });
    await p.waitForTimeout(300);
  };
  const choisir = async () => {
    await ev('(function(){var e=' + E + ',g=e.down("#grilleClients");g.getSelectionModel().select(e.clients.findRecord("id","' + C + '"));})()');
    await p.waitForTimeout(1500);
  };
  const historique = () => ev(E + '.historiqueStore.getRange().map(function(r){return r.get("type")+":"+r.get("points");})');
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('fideliteclients', 'Fidélité clients', ''));
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('fideliteclients')[0]; return e && e.isVisible() && e.parametres && e.droits; }, null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    ok('Écran ouvert : fidélité désactivée par défaut (bandeau), droits de l\'administrateur', /Fidélité désactivée/.test(await ev(E + '.down("#bandeau").getEl().dom.textContent'))
      && await ev(E + '.droits.parametrer && ' + E + '.droits.utiliser'));
    ok('Désactivée : aucune vente comptée', q("SELECT COUNT(*) FROM t_fidelite_mouvement WHERE lg_CLIENT_ID = '" + C + "'") === '0');

    /* parametres dans l'ecran */
    await ev(E + '.down("#onglets").setActiveTab(' + E + '.down("#ongletParametres"))');
    await p.waitForTimeout(800);
    await champ('valeurPoint', 600);
    await clic('#enregistrerParametres');
    const refus = await message();
    ok('Valeur d\'un point aberrante (600 FCFA pour 1 000) refusée', /trop élevée/.test(refus) && q('SELECT int_VALEUR_POINT FROM t_fidelite_parametre') === '5', refus);
    /* palier Argent : seuil 10, x 1,5, modifie dans la liste */
    const editer = async (champNom, valeur) => {
      await p.evaluate(([c, v]) => { const g = Ext.ComponentQuery.query('fideliteclients #grillePaliers')[0], rec = g.getStore().findRecord('libelle', 'Argent'),
        pl = g.plugins[0], col = g.headerCt.getGridColumns().find((x) => x.dataIndex === c); pl.startEdit(rec, col); pl.getActiveEditor().setValue(v); pl.completeEdit(); }, [champNom, valeur]);
      await p.waitForTimeout(1500);
    };
    await editer('seuil', 10);
    await editer('coefficient', 1.5);
    ok('Palier « Argent » modifié dans la liste : à partir de 10 points, × 1,5', q("SELECT CONCAT(int_SEUIL_POINTS, '|', dbl_COEFFICIENT) FROM t_fidelite_palier WHERE lg_PALIER_ID = 'FID-PALIER-2'") === '10|1.50');
    await editer('seuil', 0);
    ok('Seuil déjà pris par un autre palier : refusé', q("SELECT int_SEUIL_POINTS FROM t_fidelite_palier WHERE lg_PALIER_ID = 'FID-PALIER-2'") === '10' && /déjà ce seuil/.test(await message()));
    /* categorie veterinaires exclue (case) */
    const cell = await p.evaluate((cat) => { const g = Ext.ComponentQuery.query('fideliteclients #grilleCategories')[0], rec = g.getStore().findRecord('id', cat);
      return g.getView().getCell(rec, g.down('#colExclue')).dom.id; }, CAT_VETO);
    await p.click('#' + cell + ' div');
    await p.waitForTimeout(1500);
    ok('Catégorie « Vétérinaires » exclue par sa case', q("SELECT COUNT(*) FROM t_fidelite_exclusion WHERE lg_FAMILLEARTICLE_ID = '" + CAT_VETO + "'") === '1');
    const hier = new Date(Date.now() - 24 * 3600 * 1000);
    await p.evaluate((d) => { const e = Ext.ComponentQuery.query('fideliteclients')[0]; e.down('#actif').setValue(true); e.down('#montantPoint').setValue(1000);
      e.down('#valeurPoint').setValue(5); e.down('#seuil').setValue(10); e.down('#expirationMois').setValue(12); e.down('#assurance').setValue(true);
      e.down('#debut').setValue(new Date(d)); }, hier.getTime());
    ok('Exemple affiché : 10 000 FCFA -> 10 points, 50 FCFA, 0,50 %', /10 point\(s\), soit\s*50\s*FCFA/.test(await ev(E + '.down("#exemple").getEl().dom.textContent')),
      await ev(E + '.down("#exemple").getEl().dom.textContent'));
    await clic('#enregistrerParametres');
    await p.waitForTimeout(2500);
    ok('Paramètres enregistrés (activée, 1 000 FCFA = 1 point, 1 point = 5 FCFA, seuil 10, 12 mois, depuis hier)',
      q('SELECT CONCAT_WS("|", bool_ACTIF, int_MONTANT_POINT, int_VALEUR_POINT, int_SEUIL_UTILISATION, int_EXPIRATION_MOIS, bool_ASSURANCE, dt_DEBUT = CURDATE() - INTERVAL 1 DAY) FROM t_fidelite_parametre') === '1|1000|5|10|12|1|1',
      q('SELECT CONCAT_WS("|", bool_ACTIF, int_MONTANT_POINT, int_VALEUR_POINT, int_SEUIL_UTILISATION, int_EXPIRATION_MOIS, bool_ASSURANCE, dt_DEBUT) FROM t_fidelite_parametre'));
    await p.screenshot({ path: SORTIE + '/fidelite-parametres.png' });

    /* mise a jour des points */
    await ev(E + '.down("#onglets").setActiveTab(' + E + '.down("#ongletClients"))');
    await clic('#synchroniser');
    const m1 = await message();
    ok('« Mettre à jour les points » (déjà faite à l\'activation) : message de synthèse', /vente\(s\) comptée\(s\)/.test(m1), m1);
    const gains = q("SELECT GROUP_CONCAT(CONCAT(lg_PREENREGISTREMENT_ID, '=', int_POINTS) ORDER BY lg_PREENREGISTREMENT_ID) FROM t_fidelite_mouvement WHERE lg_CLIENT_ID = '" + C + "' AND str_TYPE = 'GAIN'");
    ok('Points : V1 12 (Standard), V2 9 (6 000 éligibles × 1,5), V3 4 (part client 3 000 × 1,5), V4 7 ; V5 (avant le début) ignorée',
      gains === 'E2E-FID-V1=12,E2E-FID-V2=9,E2E-FID-V3=4,E2E-FID-V4=7', gains);
    await clic('#synchroniser');
    await message();
    ok('Nouvelle mise à jour : rien compté deux fois', solde() === 32 && q("SELECT COUNT(*) FROM t_fidelite_mouvement WHERE lg_CLIENT_ID = '" + C + "'") === '4');
    ok('Ventes non modifiées par la fidélité', empreinteVentes() === avantVentes);
    await chercher();
    let l = await ligneClient();
    ok('Liste : client trouvé par son nom, 32 points, 160 FCFA, palier Argent', l && l.solde === 32 && l.valeur === 160 && l.palier === 'Argent' && l.prochainPalier === 'Or', JSON.stringify(l));

    /* annulation de vente */
    exec("UPDATE t_preenregistrement SET b_IS_CANCEL = 1, dt_ANNULER = NOW() WHERE lg_PREENREGISTREMENT_ID = 'E2E-FID-V4'");
    await clic('#synchroniser');
    await message();
    ok('Vente V4 annulée : ses 7 points retirés (une seule fois)', solde() === 25 && q("SELECT int_POINTS FROM t_fidelite_mouvement WHERE lg_PREENREGISTREMENT_ID = 'E2E-FID-V4' AND str_TYPE = 'ANNULATION'") === '-7');

    /* utilisation */
    await chercher();
    await choisir();
    let h = await historique();
    ok('Historique du client : achats et annulation', h.includes('ANNULATION:-7') && h.includes('GAIN:12') && h.includes('GAIN:9'), JSON.stringify(h));
    await champ('pointsUtiliser', 10); await champ('referenceUtiliser', 'TCK-E2E-1');
    await clic('#utiliser'); await oui();
    ok('Utilisation de 10 points (50 FCFA), référence enregistrée', solde() === 15
      && q("SELECT CONCAT_WS('|', int_POINTS, int_VALEUR, str_REFERENCE, lg_USER_ID = '" + ADMIN + "') FROM t_fidelite_mouvement WHERE lg_CLIENT_ID = '" + C + "' AND str_TYPE = 'UTILISATION'") === '-10|50|TCK-E2E-1|1');
    ok('Points les plus anciens utilisés d\'abord : V1 (12) -> 2 restants, V2 intacte',
      q("SELECT GROUP_CONCAT(CONCAT(lg_PREENREGISTREMENT_ID, '=', int_RESTANTS) ORDER BY lg_PREENREGISTREMENT_ID) FROM t_fidelite_mouvement WHERE lg_CLIENT_ID = '" + C + "' AND str_TYPE = 'GAIN'")
      === 'E2E-FID-V1=2,E2E-FID-V2=9,E2E-FID-V3=4,E2E-FID-V4=0');
    l = await ligneClient();
    ok('Liste et bandeau du client mis à jour sans recharger', l.solde === 15 && /15 point/.test(await ev(E + '.down("#clientChoisi").getEl().dom.textContent')), JSON.stringify(l));
    await champ('pointsUtiliser', 20);
    await clic('#utiliser'); await oui();
    const m2 = await message();
    ok('Plus de points que le solde : refusé', /n'a que 15 point/.test(m2) && solde() === 15, m2);

    /* ajustement */
    await champ('pointsAjuster', 7); await champ('motifAjuster', '');
    await clic('#ajuster');
    ok('Ajustement sans motif : refusé avant envoi', /motif/.test(await message()) && solde() === 15);
    await champ('motifAjuster', 'Geste commercial E2E');
    await clic('#ajuster'); await oui();
    ok('Ajustement +7 avec motif', solde() === 22 && q("SELECT CONCAT(int_POINTS, '|', str_MOTIF, '|', int_RESTANTS) FROM t_fidelite_mouvement WHERE lg_CLIENT_ID = '" + C + "' AND str_TYPE = 'AJUSTEMENT'") === '7|Geste commercial E2E|7');
    await champ('pointsAjuster', -100); await champ('motifAjuster', 'Retrait trop grand');
    await clic('#ajuster'); await oui();
    ok('Retrait supérieur au solde : refusé', /retrait impossible/.test(await message()) && solde() === 22);

    /* expiration */
    exec("UPDATE t_fidelite_mouvement SET dt_EXPIRATION = CURDATE() - INTERVAL 1 DAY WHERE lg_PREENREGISTREMENT_ID = 'E2E-FID-V1' AND str_TYPE = 'GAIN'");
    await clic('#synchroniser');
    await message();
    ok('Points expirés : les 2 points restants de V1 retirés', solde() === 20 && q("SELECT int_POINTS FROM t_fidelite_mouvement WHERE lg_PREENREGISTREMENT_ID = 'E2E-FID-V1' AND str_TYPE = 'EXPIRATION'") === '-2');

    /* seuil d'utilisation */
    exec('UPDATE t_fidelite_parametre SET int_SEUIL_UTILISATION = 50');
    await chercher(); await choisir();
    await champ('pointsUtiliser', 5);
    await clic('#utiliser'); await oui();
    const m3 = await message();
    ok('Sous le seuil d\'utilisation (50) : refusé', /il en faut 50/.test(m3) && solde() === 20, m3);
    exec('UPDATE t_fidelite_parametre SET int_SEUIL_UTILISATION = 10');
    await p.screenshot({ path: SORTIE + '/fidelite-clients.png' });

    /* desactivation */
    exec("UPDATE t_preenregistrement SET dt_UPDATED = NOW() - INTERVAL 30 MINUTE WHERE lg_PREENREGISTREMENT_ID = 'E2E-FID-V5'");
    await ev(E + '.down("#onglets").setActiveTab(' + E + '.down("#ongletParametres"))');
    await champ('actif', false);
    await clic('#enregistrerParametres');
    await p.waitForTimeout(2500);
    await clic('#synchroniser');
    const m4 = await message();
    ok('Fidélité désactivée : plus aucun gain (V5 non comptée)', /pas activée/.test(m4) && q("SELECT COUNT(*) FROM t_fidelite_mouvement WHERE lg_PREENREGISTREMENT_ID = 'E2E-FID-V5'") === '0', m4);
    ok('Ventes toujours non modifiées (hors annulation simulée de V4 et date de V5)', empreinteVentes().split(',').length === 5);

    const sansDroit = await p.evaluate(async () => (await fetch('/prestige/api/v1/fidelite/client/x/utiliser', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"points":1}' })).json());
    ok('Utilisation pour un client inconnu : refusée', sansDroit.success === false, JSON.stringify(sansDroit));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Déroulement du test', false, e.stack || e);
  } finally {
    await b.close();
    nettoyer();
    restaurer();
    ok('Jeu d\'essai retiré, paramètres du banc remis', q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE 'E2E-FID-%'") === '0'
      && q("SELECT COUNT(*) FROM t_fidelite_mouvement WHERE lg_CLIENT_ID = '" + C + "'") === '0' && q("SELECT bool_ACTIF FROM t_fidelite_parametre") === '0');
    const n = res.filter((r) => r.c).length;
    console.log('\n' + n + '/' + res.length + ' OK');
    process.exit(n === res.length ? 0 : 1);
  }
})();
