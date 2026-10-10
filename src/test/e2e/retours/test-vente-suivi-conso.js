/* ECRAN DE VENTE : SUIVI DE CONSOMMATION DU CLIENT (retour du 30/09).
 *
 * Seul ajout a l'ecran de vente, accepte le 30/09 : un bouton « Suivi conso » apres « Commentaire », sur la ligne du
 * client standard d'une vente au comptant. Il ouvre une fenetre modale au dessin propre (pas de boutons ExtJS
 * standard), en lecture seule : achats du client, frequence, dernier achat, montant, stock.
 *
 * Joue par un CAISSIER (KGA3), comme test-point4-ordonnance : vente ouverte, produit au panier, client standard
 * associe par la fenetre de la caisse, puis le bouton. La vente de test est retiree a la fin ; le client consulte (un
 * client standard du jeu d'essai qui a des achats) n'est que lu.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
let venteId = null;

(async () => {
  /* Un client standard du jeu d'essai qui a achete dans les 12 derniers mois (lu, jamais modifie). */
  const client = q("SELECT CONCAT_WS('|', c.lg_CLIENT_ID, c.str_FIRST_NAME, c.str_LAST_NAME) FROM t_preenregistrement p JOIN t_client c ON c.lg_CLIENT_ID = p.lg_CLIENT_ID"
    + " WHERE p.str_STATUT = 'is_Closed' AND c.lg_TYPE_CLIENT_ID = '6' AND c.str_STATUT = 'enable' AND p.dt_UPDATED > DATE_SUB(NOW(), INTERVAL 12 MONTH)"
    + " GROUP BY c.lg_CLIENT_ID HAVING COUNT(*) BETWEEN 5 AND 200 ORDER BY COUNT(*) DESC LIMIT 1").split('|');
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } });
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    ok('Précondition : un client standard avec des achats', !!client[0], client.join(' | '));
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', process.env.E2E_LOGIN || 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(2500);
    const okButton = async () => p.evaluate(() => {
      const box = Ext.ComponentQuery.query('messagebox{isVisible()}')[0];
      if (!box) { return null; }
      const btn = box.query('button{isVisible()}').find((x) => /ok|oui/i.test(x.text || ''));
      return btn ? '#' + btn.el.dom.id : null;
    });

    /* ---------------------------------------------------------------- une vente comptant avec un produit */
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('doventemanager', { isEdit: false, record: {} }));
    await p.waitForFunction(() => Ext.ComponentQuery.query('doventemanager #contenu [xtype=fieldcontainer] #produit').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    let sel = await okButton(); if (sel) { await p.click(sel); await p.waitForTimeout(400); }
    const cip = q("SELECT f.int_CIP FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID WHERE f.str_STATUT = 'enable'"
      + " AND s.int_NUMBER_AVAILABLE > 20 AND f.int_PRICE > 0 AND f.int_CIP IS NOT NULL AND f.int_CIP <> '' ORDER BY s.int_NUMBER_AVAILABLE DESC LIMIT 1");
    const ci = await p.evaluate(() => '#' + Ext.ComponentQuery.query('doventemanager #contenu [xtype=fieldcontainer] #produit')[0].inputEl.id);
    await p.click(ci); await p.keyboard.type(cip, { delay: 40 });
    await p.waitForSelector('.x-boundlist-item', { timeout: 20000 }); await p.locator('.x-boundlist-item').first().click();
    await p.waitForTimeout(600);
    const qi = await p.evaluate(() => '#' + Ext.ComponentQuery.query('doventemanager #contenu [xtype=fieldcontainer] #qtyField')[0].inputEl.id);
    await p.click(qi); await p.keyboard.press('Control+A'); await p.keyboard.type('1'); await p.keyboard.press('Enter');
    await p.waitForFunction(() => { const c = testextjs.app.getController('VenteCtr'); return c.getCurrent && c.getCurrent(); }, null, { timeout: 20000 });
    sel = await okButton(); if (sel) { await p.click(sel); await p.waitForTimeout(400); }
    venteId = await p.evaluate(() => testextjs.app.getController('VenteCtr').getCurrent().lgPREENREGISTREMENTID);
    ok('Une vente comptant est ouverte', !!venteId, venteId);

    /* ---------------------------------------------------------------- client standard associe par la caisse */
    const bouton = await p.evaluate(() => { const b = Ext.ComponentQuery.query('doventemanager #contenu #btnClientComptant')[0]; return b && b.isVisible() ? b.getId() : null; });
    ok('Le bouton « associer un client » de la caisse est là (vente comptant, espèces)', !!bouton);
    await p.click('#' + bouton); await p.waitForTimeout(1500);
    await p.evaluate((nom) => { const g = Ext.ComponentQuery.query('clientLambda #lambdaClientGrid')[0]; const st = g.getStore(); st.getProxy().extraParams = Ext.apply(st.getProxy().extraParams || {}, { query: nom }); st.load(); }, client[1]);
    await p.waitForFunction((id) => { const g = Ext.ComponentQuery.query('clientLambda #lambdaClientGrid')[0]; return g && !g.getStore().isLoading() && g.getStore().findExact('lgCLIENTID', id) >= 0; }, client[0], { timeout: 20000 });
    await p.evaluate((id) => { const g = Ext.ComponentQuery.query('clientLambda #lambdaClientGrid')[0]; const i = g.getStore().findExact('lgCLIENTID', id); testextjs.app.getController('VenteCtr').btnAjouterClientLambda(g, i, i); }, client[0]);
    await p.waitForTimeout(2000);
    sel = await okButton(); if (sel) { await p.click(sel); await p.waitForTimeout(400); }
    const suivi = await p.evaluate(() => { const b = Ext.ComponentQuery.query('doventemanager #contenu #infosClientStandard #suiviConsoClient')[0];
      const c = Ext.ComponentQuery.query('doventemanager #contenu #infosClientStandard #commentaire')[0];
      return b && b.isVisible() ? { id: b.getId(), apresCommentaire: b.getEl().getLeft() > c.getEl().getLeft(), memeLigne: Math.abs(b.getEl().getTop() - c.getEl().getTop()) < 10 } : null; });
    ok('Client associé : « Suivi conso » apparaît sur la ligne du client, après « Commentaire »', suivi && suivi.apresCommentaire && suivi.memeLigne, JSON.stringify(suivi));

    /* ---------------------------------------------------------------- la fenetre */
    await p.click('#' + suivi.id);
    await p.waitForFunction(() => { const w = Ext.ComponentQuery.query('suiviconsofenetre')[0]; return w && w.isVisible() && w.getEl().dom.querySelector('.vc-tuiles, .vc-vide'); }, null, { timeout: 20000 });
    const fen = await p.evaluate(() => { const w = Ext.ComponentQuery.query('suiviconsofenetre')[0]; const d = w.getEl().dom;
      return { modal: w.modal, nom: (d.querySelector('.vc-nom') || {}).textContent, tuiles: [...d.querySelectorAll('.vc-tuile')].map((t) => t.textContent),
        lignes: d.querySelectorAll('.vc-tableau tbody tr').length, boutonsExt: d.querySelectorAll('.x-btn').length, barreExt: !!d.querySelector('.x-window-header'),
        periode: (d.querySelector('.vc-puce-active') || {}).textContent }; });
    ok('Fenêtre modale au nom du client', fen.modal && fen.nom.indexOf(client[1]) >= 0, JSON.stringify(fen));
    ok('Dessin propre : ni barre de titre ni bouton ExtJS standard', fen.boutonsExt === 0 && !fen.barreExt, JSON.stringify(fen));
    ok('Tuiles et tableau des achats (12 mois par défaut)', fen.tuiles.length === 4 && fen.lignes > 0 && fen.periode === '12 mois', JSON.stringify(fen));
    /* Fiche du client en tete (maquette validee le 30/09) : identite pour tous, clinique selon le droit ordonnances. */
    await p.waitForFunction(() => !!Ext.ComponentQuery.query('suiviconsofenetre')[0].getEl().dom.querySelector('.sc-fiche'), null, { timeout: 15000 });
    const fiche = await p.evaluate(async (id) => { const d = Ext.ComponentQuery.query('suiviconsofenetre')[0].getEl().dom;
      const api = JSON.parse(await (await fetch('../api/v1/vente-suivi-conso/client/' + id + '/fiche')).text());
      return { libelles: [...d.querySelectorAll('.sc-fiche .sc-lib')].map((x) => x.textContent), clinique: !!d.querySelector('.sc-clinique'),
        apiClinique: api.clinique, apiTerrains: api.hasOwnProperty('terrains'), type: api.client && api.client.type }; }, client[0]);
    ok('Fiche client en tête : téléphone, naissance · âge, type, assurance', ['Téléphone', 'Naissance · âge', 'Type', 'Assurance'].every((l) => fiche.libelles.indexOf(l) >= 0), JSON.stringify(fiche));
    ok('Partie clinique affichée seulement avec le droit ordonnances (le serveur ne la rend pas sinon)', fiche.clinique === fiche.apiClinique && fiche.apiTerrains === fiche.apiClinique, JSON.stringify(fiche));
    await p.click('.vc-puce[data-mois="3"]');
    await p.waitForFunction(() => { const d = Ext.ComponentQuery.query('suiviconsofenetre')[0].getEl().dom; return (d.querySelector('.vc-puce-active') || {}).textContent === '3 mois' && d.querySelector('.vc-tuiles, .vc-vide'); }, null, { timeout: 20000 });
    ok('La puce « 3 mois » recharge la période', true);
    await p.click('.vc-bouton[data-action="fermer"]');
    await p.waitForTimeout(800);
    ok('« Fermer » ferme la fenêtre', (await p.evaluate(() => Ext.ComponentQuery.query('suiviconsofenetre').length)) === 0);
    await p.click('#' + suivi.id);
    await p.waitForFunction(() => Ext.ComponentQuery.query('suiviconsofenetre').length === 1, null, { timeout: 10000 });
    await p.waitForTimeout(800);
    await p.keyboard.press('Escape');
    await p.waitForTimeout(800);
    ok('Échap ferme aussi la fenêtre', (await p.evaluate(() => Ext.ComponentQuery.query('suiviconsofenetre').length)) === 0);
    const vente = q("SELECT CONCAT_WS('|', str_STATUT, lg_CLIENT_ID) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + venteId + "'");
    ok('La vente n\'est pas touchée par la consultation (toujours en cours, client associé)', vente === 'is_Process|' + client[0], vente);
    const inconnu = await p.evaluate(async () => JSON.parse(await (await fetch('../api/v1/vente-suivi-conso/client/-')).text()));
    ok('Sans client : « Choisissez d\'abord le client de la vente »', inconnu.success === false && /Choisissez d'abord le client/.test(inconnu.message), inconnu.message);
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Parcours sans exception', false, e.message);
  } finally {
    await b.close();
    if (venteId) {
      exec("DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + venteId + "'; DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + venteId + "';");
    }
    ok('Vente de test retirée', !venteId || q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + venteId + "'") === '0');
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
