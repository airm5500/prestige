/* ORDONNANCES CLIENTS : RESTE A DELIVRER (retour du 30/09, comparaison avec LGPI, Winpharma, LEO).
 *
 *  - une ligne est « due » quand son service est RENSEIGNE et inferieur a la prescription ; une ligne « a renseigner »
 *    n'est pas un reste (on ne sait pas) ; une ordonnance annulee n'a plus de reste ;
 *  - l'historique montre le reste de chaque ordonnance et se filtre sur « Avec un reste a delivrer » ;
 *  - la fiche montre le reste de chaque ligne ;
 *  - des que le client est choisi, la fiche signale ses AUTRES ordonnances encore dues, avec un lien « Voir » qui
 *    ouvre l'historique filtre (apres confirmation si une saisie est en cours).
 *
 * Joue a la souris et au clavier. Tout ce que le test pose est retire a la fin.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const MB4 = '--default-character-set=utf8mb4';
const exec = (s) => execFileSync('mariadb', [MB4, BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', [MB4, BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const CLIENT = 'E2E-RS-CLIENT';
const NOM = 'ZZRESTEDU';

function nettoyer() {
  exec("DELETE d FROM t_ordonnance_client_detail d JOIN t_ordonnance_client o ON o.lg_ORDONNANCE_ID=d.lg_ORDONNANCE_ID WHERE o.lg_CLIENT_ID='" + CLIENT + "';"
    + "DELETE FROM t_ordonnance_client WHERE lg_CLIENT_ID='" + CLIENT + "';"
    + "DELETE FROM t_client WHERE lg_CLIENT_ID='" + CLIENT + "';");
}

(async () => {
  nettoyer();
  exec("INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, lg_TYPE_CLIENT_ID, dt_CREATED, dt_UPDATED, str_STATUT)"
    + " VALUES ('" + CLIENT + "', '" + NOM + "', 'E2E', '6', NOW(), NOW(), 'enable');");
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('ordonnanceclient', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('ordonnanceclient #grilleOrdonnances').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    const api = (url, methode, corps) => p.evaluate(async ([u, m, c]) => {
      const r = await fetch(u, { method: m, headers: { 'Content-Type': 'application/json' }, body: c ? JSON.stringify(c) : undefined });
      return JSON.parse(await r.text());
    }, [url, methode, corps]);
    const jour = (decalage) => { const d = new Date(); d.setDate(d.getDate() - decalage); return d.toISOString().slice(0, 10); };
    /* A : ancienne, 2 dus sur la 1re ligne, 2e ligne servie. B : a renseigner (pas un reste). C : non servie (2 dus).
       D : annulee avec un reste (plus rien a delivrer). */
    const A = await api('../api/v1/ordonnance-client/enregistrer', 'POST', { clientId: CLIENT, dateOrdonnance: jour(10),
      produits: [{ libelle: 'PRODUIT RESTE A1', quantite: 3, qteServie: 1 }, { libelle: 'PRODUIT RESTE A2', quantite: 1, qteServie: 1 }] });
    const B = await api('../api/v1/ordonnance-client/enregistrer', 'POST', { clientId: CLIENT, dateOrdonnance: jour(5),
      produits: [{ libelle: 'PRODUIT RESTE B', quantite: 2 }] });
    const C = await api('../api/v1/ordonnance-client/enregistrer', 'POST', { clientId: CLIENT, dateOrdonnance: jour(1),
      produits: [{ libelle: 'PRODUIT RESTE C', quantite: 2, qteServie: 0 }] });
    const D = await api('../api/v1/ordonnance-client/enregistrer', 'POST', { clientId: CLIENT, dateOrdonnance: jour(3),
      produits: [{ libelle: 'PRODUIT RESTE D', quantite: 4, qteServie: 1 }] });
    await p.evaluate(async (id) => { await fetch('../api/v1/ordonnance-client/annuler?id=' + encodeURIComponent(id) + '&motif=E2E', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }); }, D.id);
    ok('Préconditions : quatre ordonnances, dont une annulée', A.success && B.success && C.success && D.success, [A, B, C, D].map((o) => o.numero).join(' '));

    /* ------------------------------------------------ historique : colonne RESTE */
    const idDe = (sel) => p.evaluate((s) => { const c = Ext.ComponentQuery.query(s)[0]; return c ? c.getId() : null; }, sel);
    await p.click('#' + (await idDe('ordonnanceclient #barreCriteres #recherche')) + '-inputEl');
    await p.keyboard.type(NOM, { delay: 30 });
    await p.waitForFunction(() => { const st = Ext.ComponentQuery.query('ordonnanceclient')[0].storeOrdonnances; return !st.isLoading() && st.getCount() === 3; }, null, { timeout: 20000 });
    await p.waitForTimeout(500);
    const colonne = await p.evaluate(() => {
      const g = Ext.ComponentQuery.query('ordonnanceclient #grilleOrdonnances')[0];
      const idx = g.headerCt.getVisibleGridColumns().findIndex((c) => c.getItemId() === 'colReste');
      return g.getStore().getRange().map((r, i) => r.get('numero') + '=' + g.getView().getNode(i).querySelectorAll('td')[idx].textContent.trim());
    });
    const txt = colonne.join(' | ');
    ok('Historique : colonne RESTE — A « 2 à servir », C « 2 à servir », B (à renseigner) rien', txt.indexOf(A.numero + '=2 à servir') >= 0 && txt.indexOf(C.numero + '=2 à servir') >= 0 && txt.indexOf(B.numero + '=') >= 0 && txt.indexOf(B.numero + '=2') < 0, txt);
    ok('L\'ordonnance annulée n\'apparaît pas (masquée par défaut)', txt.indexOf(D.numero) < 0, txt);
    await p.click('#' + (await idDe('ordonnanceclient #barreCriteres #reste')) + '-boxLabelEl');
    await p.waitForFunction(() => { const st = Ext.ComponentQuery.query('ordonnanceclient')[0].storeOrdonnances; return !st.isLoading() && st.getCount() === 2; }, null, { timeout: 20000 });
    const filtre = await p.evaluate(() => Ext.ComponentQuery.query('ordonnanceclient')[0].storeOrdonnances.getRange().map((r) => r.get('numero')).sort().join(','));
    ok('« Avec un reste à délivrer » coché : A et C seulement', filtre === [A.numero, C.numero].sort().join(','), filtre);
    await p.click('#' + (await idDe('ordonnanceclient #barreCriteres #annulees')) + '-boxLabelEl');
    await p.waitForTimeout(1500);
    const avecAnnulees = await p.evaluate(() => Ext.ComponentQuery.query('ordonnanceclient')[0].storeOrdonnances.getRange().map((r) => r.get('numero')));
    ok('Même avec les annulées affichées, une annulée n\'a pas de reste', avecAnnulees.indexOf(D.numero) < 0 && avecAnnulees.length === 2, avecAnnulees.join(','));
    await p.click('#' + (await idDe('ordonnanceclient #barreCriteres button[itemId=reinitialiser]')));
    await p.waitForTimeout(1500);
    const remis = await p.evaluate(() => { const e = Ext.ComponentQuery.query('ordonnanceclient')[0]; return { reste: e.down('#barreCriteres #reste').getValue(), annulees: e.down('#barreCriteres #annulees').getValue() }; });
    ok('« Réinitialiser » décoche le filtre du reste', remis.reste === false && remis.annulees === false, JSON.stringify(remis));

    /* ------------------------------------------------ API : le reste d'un client */
    const reste = await api('../api/v1/ordonnance-client/client/' + CLIENT + '/reste', 'GET');
    ok('Reste du client : 2 ordonnances, 4 à servir, la plus ancienne d\'abord', reste.total === 2 && reste.qteReste === 4 && reste.data[0].numero === A.numero && reste.data[1].numero === C.numero, JSON.stringify(reste).slice(0, 300));

    /* ------------------------------------------------ fiche neuve : le client est signale */
    await p.click('#' + (await idDe('ordonnanceclient #grilleOrdonnances button[itemId=nouvelle]')));
    await p.waitForTimeout(1500);
    await p.keyboard.type(NOM, { delay: 40 });
    await p.waitForFunction((nom) => { const c = Ext.ComponentQuery.query('ordonnanceclient #vueFiche #ficheClient')[0]; return c.isExpanded && !c.getStore().isLoading() && c.getStore().getCount() === 1 && c.getStore().getAt(0).get('strFIRSTNAME') === nom; }, NOM, { timeout: 15000 });
    await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter');
    await p.waitForFunction(() => { const z = Ext.ComponentQuery.query('ordonnanceclient #vueFiche #resteClient')[0]; return z.isVisible(); }, null, { timeout: 15000 });
    const bandeau = await p.evaluate(() => Ext.ComponentQuery.query('ordonnanceclient #vueFiche #resteClient')[0].getEl().dom.textContent);
    ok('Client choisi : « 2 autre(s) ordonnance(s) avec un reste à délivrer — 4 à servir. Voir »', /2 autre\(s\) ordonnance\(s\) avec un reste à délivrer/.test(bandeau) && /4 à servir/.test(bandeau) && /Voir/.test(bandeau), bandeau);
    await p.click('ordonnanceclient a.ordo-lien-reste, a.ordo-lien-reste');
    await p.waitForTimeout(800);
    const question = await p.evaluate(() => Ext.MessageBox.isVisible() ? Ext.MessageBox.msg.getEl().dom.textContent : '');
    ok('« Voir » avec une saisie en cours : confirmation demandée', /Abandonner la saisie/.test(question), question);
    await p.evaluate(() => Ext.MessageBox.msgButtons.yes.el.dom.click());
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('ordonnanceclient')[0]; return e.getLayout().getActiveItem().itemId === 'onglets' && !e.storeOrdonnances.isLoading(); }, null, { timeout: 15000 });
    await p.waitForTimeout(1200);
    const vue = await p.evaluate(() => { const e = Ext.ComponentQuery.query('ordonnanceclient')[0]; return { client: e.down('#barreCriteres #client').getValue(), reste: e.down('#barreCriteres #reste').getValue(), lignes: e.storeOrdonnances.getRange().map((r) => r.get('numero')).sort().join(',') }; });
    ok('L\'historique s\'ouvre filtré sur ce client et son reste à délivrer', vue.client === CLIENT && vue.reste === true && vue.lignes === [A.numero, C.numero].sort().join(','), JSON.stringify(vue));

    /* ------------------------------------------------ fiche consultee : reste par ligne, et les AUTRES ordonnances */
    const icone = await p.evaluate((num) => { const g = Ext.ComponentQuery.query('ordonnanceclient #grilleOrdonnances')[0]; const i = g.getStore().findExact('numero', num); const k = g.getView().getNode(i).querySelector('.ordo-act-consulter'); k.id = 'consulterA'; return k.id; }, A.numero);
    await p.click('#' + icone);
    await p.waitForFunction(() => Ext.ComponentQuery.query('ordonnanceclient')[0].storeProduits.getCount() === 2, null, { timeout: 15000 });
    await p.waitForTimeout(1500);
    const lignes = await p.evaluate(() => {
      const g = Ext.ComponentQuery.query('ordonnanceclient #grilleProduits')[0];
      const idx = g.headerCt.getVisibleGridColumns().findIndex((c) => c.getItemId() === 'colResteLigne');
      return [0, 1].map((i) => g.getView().getNode(i).querySelectorAll('td')[idx].textContent.trim());
    });
    ok('Fiche : colonne RESTE par ligne (2 pour la première, rien pour la ligne servie)', lignes[0] === '2' && lignes[1] === '', JSON.stringify(lignes));
    const autre = await p.evaluate(() => { const z = Ext.ComponentQuery.query('ordonnanceclient #vueFiche #resteClient')[0]; return z.isVisible() ? z.getEl().dom.textContent : ''; });
    ok('Fiche de A : seule l\'AUTRE ordonnance due (C) est signalée, pas A elle-même', /1 autre\(s\) ordonnance\(s\)/.test(autre) && /2 à servir/.test(autre), autre);
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Parcours sans exception', false, e.message);
  } finally {
    await b.close();
    nettoyer();
    ok('Jeu d\'essai retiré', q("SELECT COUNT(*) FROM t_ordonnance_client WHERE lg_CLIENT_ID='" + CLIENT + "'") === '0' && q("SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID='" + CLIENT + "'") === '0');
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
