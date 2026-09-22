/* ORDONNANCES CLIENTS : LES BOUTONS DE L'HISTORIQUE, CLIQUES POUR DE VRAI (retour de l'officine du 22/09).
 *
 * « Consulter ne fonctionne pas, Modifier pareil, Nouvelle ordonnance : TypeError getId ». Les suites existantes
 * saisissaient une fiche et relisaient par le service, mais AUCUNE ne cliquait Consulter, Modifier ni Nouvelle
 * APRES qu'une fiche ait ete remplie - le seul enchainement qui vide une fiche pleine. Celle-ci le fait, et
 * plusieurs fois de suite, comme au comptoir : consulter, revenir, nouvelle, revenir, modifier, consulter encore.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const MARQUE = 'E2E-BOUTONS';

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1700, height: 950 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const ids = [];
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(1500);
    const client = q("SELECT lg_CLIENT_ID FROM t_client WHERE str_STATUT='enable' ORDER BY str_LAST_NAME LIMIT 1");
    /* Un prescripteur de jeu d'essai : le banc peut n'en avoir aucun. */
    exec("INSERT IGNORE INTO t_medecin (lg_MEDECIN_ID, str_FIRST_NAME, str_LAST_NAME, str_STATUT, dt_CREATED, dt_UPDATED) VALUES ('" + MARQUE + "-MED', 'DOCTEUR', '" + MARQUE + "', 'enable', NOW(), NOW())");
    const medecin = MARQUE + '-MED';
    /* Deux ordonnances par le service : une AVEC prescripteur et etablissement, une SANS - les deux formes. */
    for (const o of [{ med: medecin, etab: 'CHU ' + MARQUE }, { med: '', etab: '' }]) {
      const r = await p.evaluate(async (a) => { const r = await fetch('../api/v1/ordonnance-client/enregistrer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: a.client, dateOrdonnance: new Date().toISOString().slice(0, 10), medecinId: a.med, etablissement: a.etab, produits: [{ libelle: a.marque + ' PRODUIT', quantite: 2, posologie: '1 matin', duree: '5 jours' }] }) }); return JSON.parse(await r.text()); }, { client, med: o.med, etab: o.etab, marque: MARQUE });
      if (r.id) { ids.push(r.id); }
    }
    ok('Précondition : deux ordonnances de jeu d essai', ids.length === 2, JSON.stringify(ids));

    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('ordonnanceclient', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('ordonnanceclient').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(1200);
    const clic = async (sel) => { const id = await p.evaluate((s) => Ext.ComponentQuery.query(s)[0].getId(), sel); await p.click('#' + id); await p.waitForTimeout(1500); };
    const vue = () => p.evaluate(() => Ext.ComponentQuery.query('ordonnanceclient')[0].getLayout().getActiveItem().itemId);
    const fiche = () => p.evaluate(() => { const f = Ext.ComponentQuery.query('ordonnanceclient #vueFiche')[0]; const e = Ext.ComponentQuery.query('ordonnanceclient')[0];
      return { titre: f.down('#titreFiche').getValue(), client: f.down('#ficheClient').getRawValue(), medecin: f.down('#ficheMedecin').getRawValue(), etab: f.down('#ficheEtablissement').getRawValue(), produits: e.storeProduits.getCount(), premierLibelle: e.storeProduits.getCount() ? e.storeProduits.getAt(0).get('libelle') : '', lectureSeule: f.down('#ficheClient').readOnly === true || f.down('#ficheClient').isDisabled(), nbClientsStore: e.storeClients.getCount() }; });
    /* On vise la ligne par l'IDENTIFIANT de l'ordonnance, pas par le rang : la liste va de la plus recente a
       la plus ancienne, et deux ordonnances du meme jour se rangent dans l'ordre de leur creation. */
    /* Les actions sont PAR LIGNE depuis le 22/09 : on clique l'icone de la ligne visee, avec la souris. */
    const icone = async (id, nom) => {
      const c = await p.evaluate((a) => { const g = Ext.ComponentQuery.query('ordonnanceclient #grilleOrdonnances')[0]; const r = g.getStore().findExact('id', a.id); const n = g.getView().getNode(r); n.scrollIntoView(); const k = n.querySelector('.ordo-act-' + a.nom); if (!k) { return null; } const b = k.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, inactif: k.classList.contains('x-item-disabled') }; }, { id, nom });
      if (!c) { throw new Error('icone ' + nom + ' absente'); }
      await p.mouse.click(c.x, c.y); await p.waitForTimeout(1500);
      return c;
    };
    const AVEC = ids[0], SANS = ids[1];
    await clic('ordonnanceclient #rechercher');
    await p.waitForFunction(() => Ext.ComponentQuery.query('ordonnanceclient')[0].storeOrdonnances.getCount() >= 2, null, { timeout: 20000 });
    const icones = await p.evaluate((id) => { const g = Ext.ComponentQuery.query('ordonnanceclient #grilleOrdonnances')[0]; const n = g.getView().getNode(g.getStore().findExact('id', id)); return ['consulter', 'modifier', 'imprimer', 'conso', 'annuler'].map((a) => { const k = n.querySelector('.ordo-act-' + a); return k ? (k.classList.contains('x-item-disabled') ? a + ':inactif' : a) : a + ':absent'; }); }, AVEC);
    ok('Chaque ligne porte ses actions à droite : consulter, modifier, imprimer, suivi conso, annuler - toutes actives', icones.join(',') === 'consulter,modifier,imprimer,conso,annuler', icones.join(','));

    await icone(AVEC, 'consulter');
    let f = await fiche();
    ok('CONSULTER ouvre la fiche, remplie, en lecture', (await vue()) === 'vueFiche' && /Ordonnance ORD/.test(f.titre) && f.client.length > 2 && f.produits === 1, JSON.stringify(f));
    await clic('ordonnanceclient #retourHistorique');
    await clic('ordonnanceclient #nouvelle');
    f = await fiche();
    /* La fiche neuve porte volontairement UNE ligne produit vide, prete a la saisie : c'est « vide ». */
    ok('NOUVELLE ORDONNANCE après une fiche consultée : la fiche s ouvre VIDE (une ligne produit prête), sans erreur', (await vue()) === 'vueFiche' && f.titre === 'Nouvelle ordonnance' && f.client === '' && f.medecin === '' && f.etab === '' && f.produits <= 1 && f.premierLibelle === '' && err.length === 0, JSON.stringify(f) + ' ' + JSON.stringify(err));
    await clic('ordonnanceclient #abandonner');
    await p.waitForTimeout(800);
    /* Une boite de confirmation peut s'ouvrir : on repond oui si elle est la. */
    await p.evaluate(() => { if (Ext.MessageBox.isVisible() && Ext.MessageBox.msgButtons.yes.isVisible()) { Ext.MessageBox.msgButtons.yes.el.dom.click(); } });
    await p.waitForTimeout(800);
    if ((await vue()) !== 'vueHistorique') { await p.evaluate(() => Ext.ComponentQuery.query('ordonnanceclient')[0].getLayout().setActiveItem(0)); }
    await icone(SANS, 'modifier');
    f = await fiche();
    ok('MODIFIER ouvre la seconde ordonnance (sans prescripteur ni établissement) en saisie', (await vue()) === 'vueFiche' && /Ordonnance ORD/.test(f.titre) && f.medecin === '' && f.etab === '' && !f.lectureSeule && f.produits === 1, JSON.stringify(f));
    await clic('ordonnanceclient #retourHistorique');
    await icone(AVEC, 'consulter');
    f = await fiche();
    ok('CONSULTER encore : le prescripteur et l établissement de la première reviennent, rien ne reste de la seconde', /CHU E2E-BOUTONS/.test(f.etab) && f.medecin.length > 1 && f.produits === 1, JSON.stringify(f));
    ok('Le magasin des clients ne s est pas rempli d un doublon à chaque ouverture', f.nbClientsStore <= 2, f.nbClientsStore + ' enregistrement(s)');
    await clic('ordonnanceclient #retourHistorique');
    await clic('ordonnanceclient #nouvelle');
    f = await fiche();
    ok('NOUVELLE une seconde fois : toujours vide, toujours sans erreur', f.titre === 'Nouvelle ordonnance' && f.client === '' && f.produits <= 1 && f.premierLibelle === '', JSON.stringify(f));
    ok('Aucune erreur JavaScript sur tout l enchaînement', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Le parcours va au bout', false, e.message + ' ' + (e.stack || '').split('\n')[1]);
  } finally {
    await b.close();
    for (const id of ids) { exec("DELETE FROM t_ordonnance_client_detail WHERE lg_ORDONNANCE_ID='" + id + "'; DELETE FROM t_ordonnance_client WHERE lg_ORDONNANCE_ID='" + id + "'"); }
    exec("DELETE FROM t_medecin WHERE lg_MEDECIN_ID='" + MARQUE + "-MED'");
    const kos = res.filter((r) => !r.c);
    console.log('\n' + res.filter((r) => r.c).length + '/' + res.length + ' controles OK');
    process.exit(kos.length ? 1 : 0);
  }
})();
