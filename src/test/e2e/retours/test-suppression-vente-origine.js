/* Evolution 5, point 6 : mouchard des ventes supprimees, utilisateur d'origine de la vente.
 * L'auteur de la suppression est conserve (« Systeme » pour les ventes abandonnees supprimees a minuit) et
 * l'utilisateur qui avait ouvert la vente s'ajoute a cote, affiche dans l'ecran des suppressions de vente.
 * Le parcours est joue a l'ecran : ouverture des preventes, clic sur l'action de suppression de la ligne,
 * confirmation, puis lecture de l'ecran des suppressions. La vente posee et sa trace sont retirees a la fin. */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 320) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();

const VENTE = 'E2E-SUPPR-ORIG';
const REF = 'E2E260915';

function nettoyer() {
  exec("DELETE FROM vente_suppression WHERE vente_id='" + VENTE + "' OR vente_ref='" + REF + "';"
    + "DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID='" + VENTE + "';"
    + "DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID='" + VENTE + "';");
}

/* Une vente en attente ouverte par un AUTRE operateur que celui qui va la supprimer : c'est le seul
   moyen de voir que les deux colonnes portent bien deux personnes differentes. */
function poser() {
  nettoyer();
  const ouvreur = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='BLAISE'");
  const produit = q("SELECT lg_FAMILLE_ID FROM t_famille WHERE str_STATUT='enable' AND int_CIP IS NOT NULL"
    + " ORDER BY lg_FAMILLE_ID LIMIT 1");
  exec("INSERT INTO t_preenregistrement (lg_PREENREGISTREMENT_ID, str_REF, str_REF_TICKET, lg_USER_ID, int_PRICE,"
    + " int_PRICE_REMISE, int_CUST_PART, str_STATUT, dt_CREATED, dt_UPDATED, lg_NATURE_VENTE_ID, lg_TYPE_VENTE_ID,"
    + " str_TYPE_VENTE, b_IS_AVOIR, b_WITHOUT_BON, lg_USER_VENDEUR_ID, lg_USER_CAISSIER_ID, margeug, montantttcug,"
    + " montantnetug, montanttvaug, b_HAS_AVOIR)"
    + " VALUES ('" + VENTE + "', '" + REF + "', '" + REF + "', '" + ouvreur + "', 3000, 0, 3000, 'pending', NOW(),"
    + " NOW(), '2', '1', 'VNO', 0, 0, '" + ouvreur + "', '" + ouvreur + "', 0, 0, 0, 0, 0);");
  exec("INSERT INTO t_preenregistrement_detail (lg_PREENREGISTREMENT_DETAIL_ID, lg_PREENREGISTREMENT_ID,"
    + " lg_FAMILLE_ID, int_QUANTITY, int_QUANTITY_SERVED, int_PRICE, int_PRICE_UNITAIR, str_STATUT, dt_CREATED,"
    + " dt_UPDATED, b_IS_AVOIR, valeurTva, prixAchat, montanttvaug, int_AVOIR_INITIAL)"
    + " VALUES ('" + VENTE + "-D1', '" + VENTE + "', '" + produit + "', 2, 2, 3000, 1500, 'pending', NOW(), NOW(),"
    + " 0, 0, 1000, 0, 0);");
  return { ouvreur: q("SELECT CONCAT(TRIM(str_FIRST_NAME), ' ', TRIM(str_LAST_NAME)) FROM t_user WHERE str_LOGIN='BLAISE'") };
}

(async () => {
  const jeu = poser();
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
    const moi = await p.evaluate(() => document.title) && 'admin';

    /* colonnes de l'ecran des suppressions : l'auteur ET l'utilisateur d'origine */
    await p.evaluate(() => { testextjs.app.getController('App').onRedirectTo('suppressionsvente', {}); });
    await p.waitForFunction(() => Ext.ComponentQuery.query('suppressionsvente').length > 0, null, { timeout: 25000 });
    await p.waitForTimeout(3000);
    const colonnes = await p.evaluate(() => Ext.ComponentQuery.query('suppressionsvente gridpanel')[0].columns
      .filter((c) => c.dataIndex).map((c) => [c.dataIndex, c.text]));
    ok('L ecran des suppressions porte « Supprime par » et « Vente ouverte par »',
      colonnes.some((c) => c[0] === 'userName' && /Supprim/.test(c[1]))
      && colonnes.some((c) => c[0] === 'origineUserName' && /ouverte par/.test(c[1])), JSON.stringify(colonnes));
    const champs = await p.evaluate(() => Ext.ComponentQuery.query('suppressionsvente gridpanel')[0]
      .getStore().model.getFields().map((f) => f.name));
    ok('Le champ origineUserName est declare dans le store', champs.indexOf('origineUserName') >= 0, JSON.stringify(champs));

    /* parcours reel : suppression de la vente en attente depuis l'ecran des preventes */
    await p.evaluate(() => { testextjs.app.getController('App').onRedirectTo('preenregistrementmanager', {}); });
    await p.waitForFunction(() => Ext.ComponentQuery.query('preenregistrementmanager gridpanel').length > 0, null, { timeout: 25000 });
    await p.waitForTimeout(4000);

    const trouvee = await p.evaluate((ref) => {
      const g = Ext.ComponentQuery.query('preenregistrementmanager gridpanel')[0];
      let idx = -1; g.getStore().each((r, i) => { if (r.get('strREF') === ref || r.get('ref') === ref) { idx = i; } });
      return { idx: idx, total: g.getStore().getCount() };
    }, REF);
    ok('La vente en attente posee apparait dans l ecran des preventes', trouvee.idx >= 0, JSON.stringify(trouvee));

    // clic reel sur l'icone de suppression de la ligne
    await p.evaluate((idx) => {
      const g = Ext.ComponentQuery.query('preenregistrementmanager gridpanel')[0];
      const ligne = g.getView().getNode(idx);
      const icones = ligne.querySelectorAll('.x-action-col-icon');
      icones[icones.length - 1].click();
    }, trouvee.idx);
    await p.waitForTimeout(1500);
    // une confirmation peut apparaitre selon l'ecran : on repond oui si c'est le cas
    await p.evaluate(() => {
      if (Ext.MessageBox.isVisible() && Ext.MessageBox.msgButtons.yes.isVisible()) {
        Ext.MessageBox.btnCallback(Ext.MessageBox.msgButtons.yes);
      }
    });
    await p.waitForTimeout(7000);

    const trace = q("SELECT CONCAT(COUNT(*), '|', COALESCE(MAX(user_name), ''), '|',"
      + " COALESCE(MAX(origine_user_name), ''), '|', COALESCE(MAX(type_suppression), ''))"
      + " FROM vente_suppression WHERE vente_ref='" + REF + "'").split('|');
    ok('La suppression est tracee (une ligne par produit de la vente)', trace[0] === '1', JSON.stringify(trace));
    ok('L auteur de la suppression est conserve : l operateur connecte', /Super|admin/i.test(trace[1]), trace[1]);
    ok('L utilisateur d origine est celui qui avait ouvert la vente', trace[2] === jeu.ouvreur,
      trace[2] + ' attendu ' + jeu.ouvreur);
    ok('Les deux utilisateurs sont bien distincts', trace[1] !== trace[2], trace[1] + ' vs ' + trace[2]);
    ok('La vente est bien supprimee', q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID='" + VENTE + "'") === '0');

    /* l ecran affiche les deux noms cote a cote */
    await p.evaluate(() => { testextjs.app.getController('App').onRedirectTo('suppressionsvente', {}); });
    await p.waitForFunction(() => Ext.ComponentQuery.query('suppressionsvente gridpanel').length > 0, null, { timeout: 25000 });
    await p.waitForTimeout(5000);
    const lignes = await p.evaluate((ref) => {
      const g = Ext.ComponentQuery.query('suppressionsvente gridpanel')[0];
      const out = []; g.getStore().each((r) => { if (r.get('venteRef') === ref) { out.push({ a: r.get('userName'), o: r.get('origineUserName') }); } });
      return out;
    }, REF);
    ok('L ecran affiche l auteur de la suppression et l utilisateur d origine',
      lignes.length === 1 && !!lignes[0].a && lignes[0].o === jeu.ouvreur && lignes[0].a !== lignes[0].o,
      JSON.stringify(lignes));

    /* l export Excel emporte la nouvelle colonne */
    const attente = p.waitForResponse((r) => r.url().indexOf('/vente-suppressions/export/excel') >= 0, { timeout: 20000 });
    // clic reel sur le bouton : son action passe par son handler, pas par un ecouteur d evenement
    const cliqueExport = await p.evaluate(() => {
      const btn = Ext.ComponentQuery.query('suppressionsvente button')
        .filter((x) => /excel/i.test(x.text || ''))[0];
      if (!btn) { return false; }
      btn.el.dom.click();
      return true;
    });
    ok('Le bouton « Exporter (Excel) » est present dans l ecran', cliqueExport === true, cliqueExport);
    let statutExport = 0;
    try { statutExport = (await attente).status(); } catch (e) { statutExport = -1; }
    ok('L export Excel repond (il porte desormais les deux colonnes d utilisateur)', statutExport === 200, statutExport);

    ok('Aucune erreur JavaScript pendant tout le parcours', err.length === 0, JSON.stringify(err.slice(0, 3)));
  } catch (e) {
    ok('Parcours complet sans exception', false, e.message + ' | ' + p.url());
  } finally {
    await b.close();
    nettoyer();
    const reste = q("SELECT CONCAT((SELECT COUNT(*) FROM vente_suppression WHERE vente_ref='" + REF + "'), '|',"
      + " (SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID='" + VENTE + "'))");
    ok('Tout ce que le test a pose est retire', reste === '0|0', reste);
  }
  const echecs = res.filter((r) => !r.c).length;
  console.log('\n' + (res.length - echecs) + '/' + res.length + ' controles OK');
  process.exit(echecs ? 1 : 0);
})();
