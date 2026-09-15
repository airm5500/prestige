/* Evolution 5, point 5 : reglement du carnet de depot, date de creation distincte de la date choisie.
 * Jusqu'ici la date choisie par l'operateur ecrasait createdAt : un reglement saisi aujourd'hui pour une date
 * passee etait indiscernable d'un reglement saisi ce jour-la. La colonne date_creation porte desormais
 * l'instant reel de la saisie, createdAt gardant la date de reglement (celle du dossier, de la caisse et du ticket).
 * Le reglement est joue a l'ecran : ouverture de la fenetre, saisie du montant, choix d'une date passee, clic
 * sur Enregistrer. Le depot, la caisse ouverte et le reglement poses par le test sont retires a la fin. */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 320) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();

const DEPOT = 'E2E-DEPOT-DC';
const CAISSE = 'E2E-CAISSE-DC';
const SOLDE = 500000;
const VERSE = 120000;

function nettoyer() {
  // Le reglement ecrit dans six tables autour du dossier de reglement : on les retire de la feuille vers la
  // racine, en partant des dossiers rattaches au depot du test.
  exec("DROP TEMPORARY TABLE IF EXISTS e2e_dc_dossiers;"
    + "CREATE TEMPORARY TABLE e2e_dc_dossiers (id VARCHAR(40) PRIMARY KEY) AS"
    + " SELECT DISTINCT id_dossier AS id FROM reglement_carnet WHERE tierspayant_id='" + DEPOT + "' AND id_dossier IS NOT NULL;"
    + "DELETE FROM mvttransaction WHERE pkey IN (SELECT id FROM e2e_dc_dossiers);"
    + "DELETE FROM t_mvt_caisse WHERE P_KEY IN (SELECT id FROM e2e_dc_dossiers);"
    + "DELETE FROM t_reglement WHERE str_REF_RESSOURCE IN (SELECT id FROM e2e_dc_dossiers);"
    + "DELETE FROM t_dossier_reglement_detail WHERE lg_DOSSIER_REGLEMENT_ID IN (SELECT id FROM e2e_dc_dossiers);"
    + "DELETE FROM t_dossier_reglement WHERE lg_DOSSIER_REGLEMENT_ID IN (SELECT id FROM e2e_dc_dossiers);"
    + "DELETE FROM reglement_carnet WHERE tierspayant_id='" + DEPOT + "';"
    + "DELETE FROM t_tiers_payant WHERE lg_TIERS_PAYANT_ID='" + DEPOT + "';"
    + "DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID='" + CAISSE + "';"
    + "DROP TEMPORARY TABLE IF EXISTS e2e_dc_dossiers;");
}

/* Preconditions (pas l'objet du test) : un depot avec du solde, et une caisse ouverte pour l'operateur. */
function poser() {
  nettoyer();
  const user = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='admin'");
  const modele = q("SELECT lg_MODEL_FACTURE_ID FROM t_tiers_payant WHERE lg_MODEL_FACTURE_ID IS NOT NULL LIMIT 1");
  const gabarit = q("SELECT lg_TIERS_PAYANT_ID FROM t_tiers_payant WHERE str_STATUT='enable' LIMIT 1");
  exec("INSERT INTO t_tiers_payant (lg_TIERS_PAYANT_ID, lg_MODEL_FACTURE_ID, str_CODE_ORGANISME, str_NAME,"
    + " str_FULLNAME, dt_CREATED, dt_UPDATED, str_STATUT, account, is_depot, lg_VILLE_ID, lg_TYPE_TIERS_PAYANT_ID,"
    + " lg_GROUPE_ID, lg_SEQUENCIER_ID, lg_TYPE_CONTRAT_ID, lg_REGIME_CAISSE_ID, lg_RISQUE_ID)"
    + " SELECT '" + DEPOT + "', '" + modele + "', 'E2EDC', 'E2E DEPOT DC', 'E2E DEPOT DATE CREATION', NOW(), NOW(),"
    + " 'enable', " + SOLDE + ", 1, t.lg_VILLE_ID, t.lg_TYPE_TIERS_PAYANT_ID, t.lg_GROUPE_ID, t.lg_SEQUENCIER_ID,"
    + " t.lg_TYPE_CONTRAT_ID, t.lg_REGIME_CAISSE_ID, t.lg_RISQUE_ID"
    + " FROM t_tiers_payant t WHERE t.lg_TIERS_PAYANT_ID='" + gabarit + "';");
  exec("INSERT INTO t_resume_caisse (ld_CAISSE_ID, lg_USER_ID, int_SOLDE_MATIN, int_SOLDE_SOIR, dt_DAY, dt_CREATED,"
    + " lg_CREATED_BY, dt_UPDATED, lg_UPDATED_BY, str_STATUT)"
    + " VALUES ('" + CAISSE + "', '" + user + "', 0, 0, CURDATE(), NOW(), '" + user + "', NOW(), '" + user + "', 'is_Using');");
  return { user };
}

(async () => {
  poser();
  const JOUR = q("SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d')");
  const CHOISIE = q("SELECT DATE_FORMAT(CURDATE() - INTERVAL 21 DAY, '%Y-%m-%d')");
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1600, height: 950 } });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);

    await p.evaluate(() => { testextjs.app.getController('App').onRedirectTo('reglementdepot', {}); });
    await p.waitForFunction(() => Ext.ComponentQuery.query('reglementdepot').length > 0, null, { timeout: 25000 });
    await p.waitForTimeout(4000);

    /* les deux colonnes coexistent dans la grille des reglements */
    const colonnes = await p.evaluate(() => {
      const g = Ext.ComponentQuery.query('reglementdepot gridpanel');
      return g.map((x) => x.columns.filter((c) => c.dataIndex).map((c) => [c.dataIndex, c.text]));
    });
    const grilleReglements = colonnes.filter((c) => c.some((x) => x[0] === 'montantRestant'));
    ok('Les grilles de reglements portent la date de reglement ET la date de saisie',
      grilleReglements.length >= 1 && grilleReglements.every((c) => c.some((x) => x[0] === 'createdAt')
        && c.some((x) => x[0] === 'dateCreation')), JSON.stringify(grilleReglements.map((c) => c.map((x) => x[0]))));

    /* le champ dateCreation est bien declare dans les stores, sinon la colonne resterait vide */
    const champs = await p.evaluate(() => Ext.ComponentQuery.query('reglementdepot gridpanel')
      .filter((g) => g.getStore().getProxy().url && /carnet-depot\/reglements/.test(g.getStore().getProxy().url))
      .map((g) => g.getStore().model.getFields().map((f) => f.name)));
    ok('Le champ dateCreation est declare dans les stores des reglements',
      champs.length >= 1 && champs.every((f) => f.indexOf('dateCreation') >= 0), JSON.stringify(champs.length));

    /* parcours reel : on choisit le depot, on ouvre la fenetre de reglement, on saisit une date passee */
    await p.evaluate((depot) => {
      const c = Ext.ComponentQuery.query('reglementdepot combobox')[0];
      const rec = c.getStore().findRecord(c.valueField, depot);
      c.setValue(depot);
      c.fireEvent('select', c, rec ? [rec] : []);
    }, DEPOT);
    await p.waitForTimeout(3500);

    const ctrl = 'GestionCarnetDepotCtr';
    await p.evaluate((nom) => { testextjs.app.getController(nom).reglementForm(); }, ctrl);
    await p.waitForFunction(() => Ext.ComponentQuery.query('window[title="Nouveau règlement"]').length > 0, null, { timeout: 15000 });
    await p.waitForTimeout(1500);

    const champsFenetre = await p.evaluate(() => {
      const w = Ext.ComponentQuery.query('window[title="Nouveau règlement"]')[0];
      return w.down('form').getForm().getFields().getRange().map((f) => f.getName());
    });
    ok('La fenetre de reglement propose bien une date choisie', champsFenetre.indexOf('dateReglement') >= 0,
      JSON.stringify(champsFenetre));

    await p.evaluate(([montant, date]) => {
      const w = Ext.ComponentQuery.query('window[title="Nouveau règlement"]')[0], f = w.down('form').getForm();
      f.findField('montantPaye').setValue(montant);
      f.findField('dateReglement').setValue(new Date(date + 'T00:00:00'));
      f.findField('description').setValue('E2E date de creation');
    }, [VERSE, CHOISIE]);
    await p.waitForTimeout(500);

    const avant = q("SELECT NOW()");
    await p.evaluate(() => {
      const w = Ext.ComponentQuery.query('window[title="Nouveau règlement"]')[0];
      const btn = w.down('toolbar[dock=bottom]').items.getAt(0);
      btn.handler(btn);
    });
    await p.waitForTimeout(8000);
    // la question d'impression du ticket : on repond non, aucune imprimante sur le banc
    await p.evaluate(() => { if (Ext.MessageBox.isVisible() && Ext.MessageBox.msgButtons.no.isVisible()) { Ext.MessageBox.btnCallback(Ext.MessageBox.msgButtons.no); } });
    await p.waitForTimeout(2000);

    const ligne = q("SELECT CONCAT(COUNT(*), '|', COALESCE(MAX(DATE(createdAt)), ''), '|',"
      + " COALESCE(MAX(DATE(date_creation)), ''), '|', COALESCE(MAX(montant_paye), 0))"
      + " FROM reglement_carnet WHERE tierspayant_id='" + DEPOT + "'").split('|');
    ok('Le reglement est enregistre pour le montant saisi', ligne[0] === '1' && ligne[3] === String(VERSE), JSON.stringify(ligne));
    ok('createdAt garde la date de reglement choisie (il y a 21 jours)', ligne[1] === CHOISIE, ligne[1] + ' attendu ' + CHOISIE);
    ok('date_creation porte l instant reel de la saisie (aujourd hui)', ligne[2] === JOUR, ligne[2] + ' attendu ' + JOUR);
    ok('Les deux dates sont bien distinctes', ligne[1] !== ligne[2], ligne[1] + ' vs ' + ligne[2]);

    const precis = q("SELECT IF(date_creation BETWEEN '" + avant + "' - INTERVAL 5 SECOND AND NOW(), 'oui', 'non')"
      + " FROM reglement_carnet WHERE tierspayant_id='" + DEPOT + "'");
    ok('date_creation est bien l horodatage de la saisie, a la seconde', precis === 'oui', precis);

    /* le dossier de reglement, la caisse et le ticket restent sur la date choisie : rien ne change de ce cote */
    const dossier = q("SELECT COALESCE(DATE(d.dt_REGLEMENT), '') FROM t_dossier_reglement d"
      + " JOIN reglement_carnet r ON r.id_dossier = d.lg_DOSSIER_REGLEMENT_ID WHERE r.tierspayant_id='" + DEPOT + "'");
    ok('Le dossier de reglement reste date de la date choisie (aucune regression)', dossier === CHOISIE, dossier);
    const solde = q("SELECT account FROM t_tiers_payant WHERE lg_TIERS_PAYANT_ID='" + DEPOT + "'");
    ok('Le solde du depot est decremente du montant verse', solde === String(SOLDE - VERSE), solde);

    /* l ecran affiche les deux dates cote a cote. On elargit la periode puis on relance la recherche,
       comme le ferait l utilisateur : la grille est filtree sur la date de reglement, et celle du test
       est vieille de trois semaines. */
    await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('reglementdepot')[0];
      e.down('#dtStart').setValue(Ext.Date.add(new Date(), Ext.Date.DAY, -60));
      testextjs.app.getController('GestionCarnetDepotCtr').doSearchReglement();
    });
    await p.waitForTimeout(5000);
    const affiche = await p.evaluate(() => {
      const g = testextjs.app.getController('GestionCarnetDepotCtr').getReglementGrid();
      const lignes = []; g.getStore().each((r) => lignes.push({ c: r.get('createdAt'), d: r.get('dateCreation'), m: r.get('montantPaye') }));
      return lignes;
    });
    const mienne = affiche.find((l) => l.m === VERSE);
    ok('L ecran affiche la date de reglement et la date de saisie, differentes',
      !!mienne && /^\d{2}\/\d{2}\/\d{4}/.test(mienne.c) && /^\d{2}\/\d{2}\/\d{4}/.test(mienne.d)
      && mienne.c.slice(0, 10) !== mienne.d.slice(0, 10), JSON.stringify(mienne));

    ok('Aucune erreur JavaScript pendant tout le parcours', err.length === 0, JSON.stringify(err.slice(0, 3)));
  } catch (e) {
    ok('Parcours complet sans exception', false, e.message + ' | ' + p.url());
  } finally {
    await b.close();
    nettoyer();
    const reste = q("SELECT CONCAT((SELECT COUNT(*) FROM reglement_carnet WHERE tierspayant_id='" + DEPOT + "'), '|',"
      + " (SELECT COUNT(*) FROM t_tiers_payant WHERE lg_TIERS_PAYANT_ID='" + DEPOT + "'), '|',"
      + " (SELECT COUNT(*) FROM t_resume_caisse WHERE ld_CAISSE_ID='" + CAISSE + "'))");
    ok('Tout ce que le test a pose est retire', reste === '0|0|0', reste);
  }
  const echecs = res.filter((r) => !r.c).length;
  console.log('\n' + (res.length - echecs) + '/' + res.length + ' controles OK');
  process.exit(echecs ? 1 : 0);
})();
