/* ORDONNANCES, RETOURS DU 30/09 (suite) : recherche du client par telephone, nouveau client au clavier, date de
 * naissance a saisie guidee, Entree apres la posologie.
 *
 * Joue a la souris et au clavier comme un pharmacien (admin). Le client et les ordonnances de test (marqueur ZZNAISS)
 * sont retires a la fin ; les clients reels ne sont que lus.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const NOM = 'ZZNAISS';
const PRENOM = 'ESSAI' + Date.now().toString().slice(-5);
const TEL = '07 31 ' + Date.now().toString().slice(-6, -4) + ' ' + Date.now().toString().slice(-4, -2) + ' ' + Date.now().toString().slice(-2);

(async () => {
  /* Un client ASSURANCE reel avec un telephone dans l'ancien champ et une date de naissance (lu seulement). */
  const assure = q("SELECT CONCAT_WS('|', lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, str_ADRESSE, DATE(dt_NAISSANCE)) FROM t_client"
    + " WHERE str_STATUT='enable' AND lg_TYPE_CLIENT_ID='1' AND dt_NAISSANCE IS NOT NULL AND str_ADRESSE REGEXP '^[0-9]{10}$'"
    + " AND dt_NAISSANCE < DATE_SUB(NOW(), INTERVAL 2 YEAR) LIMIT 1").split('|');
  const produitStock = q("SELECT f.str_NAME FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID=f.lg_FAMILLE_ID WHERE f.str_STATUT='enable'"
    + " AND s.int_NUMBER_AVAILABLE > 5 AND f.str_NAME REGEXP '^[A-Z]{4}' ORDER BY s.int_NUMBER_AVAILABLE DESC LIMIT 1");
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1700, height: 1000 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    ok('Précondition : un client assurance avec téléphone et date de naissance', !!assure[0] && !!assure[4], assure.join(' | '));
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('ordonnanceclient', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('ordonnanceclient #grilleOrdonnances').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(1200);
    const idDe = (sel) => p.evaluate((s) => { const c = Ext.ComponentQuery.query(s)[0]; return c ? c.getId() : null; }, sel);
    const clic = async (sel, t) => { await p.click('#' + (await idDe(sel))); await p.waitForTimeout(t || 900); };
    const actif = (sel) => p.evaluate((s) => { const c = Ext.ComponentQuery.query(s)[0]; return !!c && document.activeElement === c.inputEl.dom; }, sel);
    const brut = (sel) => p.evaluate((s) => Ext.ComponentQuery.query(s)[0].getRawValue(), sel);
    const liste = (sel) => p.evaluate((s) => { const c = Ext.ComponentQuery.query(s)[0]; return [...c.getPicker().getEl().dom.querySelectorAll('.ordo-client-ligne')].map((l) => ({
      nom: (l.querySelector('.ordo-client-nom') || {}).textContent, type: (l.querySelector('.ordo-client-type') || {}).textContent, tel: (l.querySelector('.ordo-client-tel') || {}).textContent })); }, sel);

    /* ------------------------------------------------ filtre de l'historique : telephone « contient » */
    const milieu = assure[3].slice(3, 8);
    await p.click('#' + (await idDe('ordonnanceclient #barreCriteres #client')) + '-inputEl');
    await p.keyboard.type(milieu, { delay: 60 });
    await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('ordonnanceclient #barreCriteres #client')[0]; return c.isExpanded && !c.getStore().isLoading() && c.getStore().getCount() > 0; }, null, { timeout: 15000 });
    let lignes = await liste('ordonnanceclient #barreCriteres #client');
    const trouve = lignes.find((l) => l.tel === assure[3]);
    ok('Historique : 5 chiffres du MILIEU du numéro trouvent le client (« contient »)', !!trouve, milieu + ' → ' + JSON.stringify(lignes.slice(0, 4)));
    ok('Historique : chaque ligne montre nom, type et téléphone', trouve && trouve.type === 'Assurance' && trouve.nom.indexOf(assure[1]) >= 0, JSON.stringify(trouve));
    await p.keyboard.press('Escape');
    await p.evaluate(() => Ext.ComponentQuery.query('ordonnanceclient #barreCriteres #client')[0].clearValue());
    const court = await p.evaluate(async () => JSON.parse(await (await fetch('../api/v1/ordonnance-client/clients?query=07')).text()));
    const parNom = await p.evaluate(async (n) => JSON.parse(await (await fetch('../api/v1/ordonnance-client/clients?query=' + encodeURIComponent(n))).text()), assure[1]);
    ok('Deux chiffres seulement : pas de recherche dans les téléphones (trop large)', court.success === true && court.total < 50, court.total);
    ok('Par le nom : toujours « commence par », avec type et téléphone rendus', parNom.data.some((c) => c.lgCLIENTID === assure[0] && c.libelleTypeClient === 'Assurance' && c.strTELEPHONE === assure[3]), parNom.total);

    /* ------------------------------------------------ nouveau client au clavier */
    await clic('ordonnanceclient #grilleOrdonnances button[itemId=nouvelle]', 1500);
    await clic('ordonnanceclient #vueFiche button[itemId=nouveauClient]', 900);
    ok('« Nouveau client » : le curseur est dans le Nom', await actif('window#fenNouveauClient #ncNom'));
    await p.keyboard.type(NOM); await p.keyboard.press('Enter'); await p.waitForTimeout(250);
    ok('Entrée : on passe au Prénom', await actif('window#fenNouveauClient #ncPrenom'));
    await p.keyboard.type(PRENOM); await p.keyboard.press('Enter'); await p.waitForTimeout(250);
    ok('Entrée : on passe au Téléphone', await actif('window#fenNouveauClient #ncTelephone'));
    await p.keyboard.type(TEL); await p.keyboard.press('Enter'); await p.waitForTimeout(250);
    ok('Entrée : on passe à la Date de naissance', await actif('window#fenNouveauClient #ncNaissance'));
    ok('Rien n\'a été créé en passant d\'un champ à l\'autre', q("SELECT COUNT(*) FROM t_client WHERE str_FIRST_NAME='" + NOM + "'") === '0');
    await p.keyboard.type('2'); await p.keyboard.press('Enter'); await p.waitForTimeout(150);
    const jour = await brut('window#fenNouveauClient #ncNaissance');
    await p.keyboard.type('3'); await p.keyboard.press('Enter'); await p.waitForTimeout(150);
    const mois = await brut('window#fenNouveauClient #ncNaissance');
    ok('Saisie guidée : jour + Entrée → « 02/ », mois + Entrée → « 02/03/ »', jour === '02/' && mois === '02/03/', jour + ' ' + mois);
    await p.keyboard.type('85'); await p.keyboard.press('Enter');
    await p.waitForFunction(() => Ext.ComponentQuery.query('window#fenNouveauClient').length === 0, null, { timeout: 15000 });
    await p.waitForTimeout(600);
    const cree = q("SELECT CONCAT_WS('|', lg_CLIENT_ID, lg_TYPE_CLIENT_ID, str_ADRESSE, DATE(dt_NAISSANCE)) FROM t_client WHERE str_FIRST_NAME='" + NOM + "'").split('|');
    ok('Année « 85 » + Entrée : client STANDARD créé, né le 1985-03-02', cree[1] === '6' && cree[2] === TEL && cree[3] === '1985-03-02', cree.join(' | '));
    const age85 = new Date().getFullYear() - 1985 - ((new Date().getMonth() < 2 || (new Date().getMonth() === 2 && new Date().getDate() < 2)) ? 1 : 0);
    let f = await p.evaluate(() => { const x = Ext.ComponentQuery.query('ordonnanceclient #vueFiche')[0]; return { client: x.down('#ficheClient').getRawValue(), naissance: x.down('#naissancePatient').getRawValue(), age: x.down('#agePatient').getValue(), ageFige: x.down('#agePatient').readOnly }; });
    ok('Fiche : le client est choisi, sa date passe dans le contexte, l\'âge est calculé et non modifiable', /ZZNAISS/.test(f.client) && f.naissance === '02/03/1985' && f.age === age85 && f.ageFige, JSON.stringify(f));

    /* ------------------------------------------------ controles de la date dans la fiche */
    const champ = '#' + (await idDe('ordonnanceclient #vueFiche #naissancePatient')) + '-inputEl';
    const taper = async (morceaux) => { await p.click(champ, { clickCount: 3 }); await p.keyboard.press('Backspace'); for (const m of morceaux) { await p.keyboard.type(m); await p.keyboard.press('Enter'); await p.waitForTimeout(120); } };
    const etat = () => p.evaluate(() => { const c = Ext.ComponentQuery.query('ordonnanceclient #vueFiche #naissancePatient')[0]; return { brut: c.getRawValue(), erreur: (c.getActiveError() || ''), age: Ext.ComponentQuery.query('ordonnanceclient #vueFiche #agePatient')[0].getValue() }; });
    await taper(['32']);
    let e = await etat();
    ok('Jour 32 refusé', /jour va de 1 à 31/.test(e.erreur) && e.brut === '32', JSON.stringify(e));
    await taper(['31', '13']);
    e = await etat();
    ok('Mois 13 refusé', /mois va de 1 à 12/.test(e.erreur), JSON.stringify(e));
    await taper(['31', '02', '20']);
    e = await etat();
    ok('31/02 refusé : la date n\'existe pas', /n'existe pas/.test(e.erreur), JSON.stringify(e));
    await taper(['01', '12', '2026']);
    e = await etat();
    ok('Année sur 4 chiffres acceptée, mais une date future est refusée', /futur/.test(e.erreur) && e.brut === '01/12/2026', JSON.stringify(e));
    await taper(['15', '6', '12']);
    e = await etat();
    const age12 = new Date().getFullYear() - 2012 - ((new Date().getMonth() < 5 || (new Date().getMonth() === 5 && new Date().getDate() < 15)) ? 1 : 0);
    ok('« 12 » → 2012 ; l\'âge suit la date', e.brut === '15/06/2012' && !e.erreur && e.age === age12, JSON.stringify(e));
    ok('Date complète + Entrée : le curseur repart dans la recherche produit', await actif('ordonnanceclient #vueFiche #rechercheProduit'));

    /* ------------------------------------------------ produit : posologie puis Entree */
    await p.keyboard.type(produitStock.slice(0, 8), { delay: 50 });
    await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('ordonnanceclient #vueFiche #rechercheProduit')[0]; return c.isExpanded && c.getStore().getCount() > 0; }, null, { timeout: 15000 });
    await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter');
    await p.waitForTimeout(900);
    await p.keyboard.type('1 cp matin', { delay: 20 });
    await p.keyboard.press('Enter');
    await p.waitForTimeout(700);
    const apres = await p.evaluate(() => { const e = Ext.ComponentQuery.query('ordonnanceclient')[0]; const r = e.storeProduits.getAt(0); return { poso: r.get('posologie'), n: e.storeProduits.getCount() }; });
    ok('Posologie + Entrée : la posologie est gardée et le curseur revient à la recherche produit', apres.poso === '1 cp matin' && await actif('ordonnanceclient #vueFiche #rechercheProduit'), JSON.stringify(apres));

    /* ------------------------------------------------ enregistrement */
    await p.evaluate((m) => { Ext.ComponentQuery.query('ordonnanceclient #vueFiche #observations')[0].setValue(m); }, NOM);
    await clic('ordonnanceclient #vueFiche button[itemId=enregistrer]', 1200);
    const ordo = q("SELECT CONCAT_WS('|', lg_ORDONNANCE_ID, dt_NAISSANCE_PATIENT, int_AGE_PATIENT) FROM t_ordonnance_client WHERE lg_CLIENT_ID='" + cree[0] + "'").split('|');
    ok('Ordonnance : date de naissance et âge déduit enregistrés', ordo[1] === '2012-06-15' && ordo[2] === String(age12), ordo.join(' | '));
    ok('Client STANDARD : sa fiche reprend la date saisie dans l\'ordonnance', q("SELECT DATE(dt_NAISSANCE) FROM t_client WHERE lg_CLIENT_ID='" + cree[0] + "'") === '2012-06-15');
    const faux = await p.evaluate(async (c) => {
      const env = (d) => fetch('../api/v1/ordonnance-client/enregistrer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: c, dateOrdonnance: new Date().toISOString().slice(0, 10), dateNaissance: d, produits: [{ libelle: 'X', quantite: 1 }] }) }).then((r) => r.json());
      return { futur: await env('2099-01-01'), impossible: await env('2020-02-30'), vieux: await env('1850-01-01') };
    }, cree[0]);
    ok('Serveur : date future, impossible ou de plus de 130 ans refusée', !faux.futur.success && /futur/.test(faux.futur.message) && !faux.impossible.success && !faux.vieux.success && /130/.test(faux.vieux.message), JSON.stringify(faux));

    /* Reouverture : la date revient, l'age reste fige. */
    await clic('ordonnanceclient #vueFiche button[itemId=retourHistorique]', 1200);
    await p.evaluate((id) => { const g = Ext.ComponentQuery.query('ordonnanceclient #grilleOrdonnances')[0]; const s = g.getStore(); s.getProxy().extraParams = Ext.apply(s.getProxy().extraParams || {}, { query: '' }); }, ordo[0]);
    await p.evaluate((id) => testextjs.app.getController('OrdonnanceClientCtr').ouvrirParId ? testextjs.app.getController('OrdonnanceClientCtr').ouvrirParId(id, false) : null, ordo[0]);
    await p.waitForFunction(() => Ext.ComponentQuery.query('ordonnanceclient #vueFiche #naissancePatient')[0].getRawValue() !== '', null, { timeout: 15000 });
    f = await p.evaluate(() => { const x = Ext.ComponentQuery.query('ordonnanceclient #vueFiche')[0]; return { naissance: x.down('#naissancePatient').getRawValue(), age: x.down('#agePatient').getValue(), ageFige: x.down('#agePatient').readOnly }; });
    ok('Réouverture : date de naissance relue, âge figé', f.naissance === '15/06/2012' && f.age === age12 && f.ageFige, JSON.stringify(f));

    /* ------------------------------------------------ client assurance : sa date est reprise, sa fiche n'est pas touchee */
    await p.evaluate(() => { const c = Ext.ComponentQuery.query('ordonnanceclient #vueFiche #naissancePatient')[0]; c.setIso(''); });
    await p.click('#' + (await idDe('ordonnanceclient #vueFiche #ficheClient')) + '-inputEl', { clickCount: 3 });
    await p.keyboard.type(assure[3], { delay: 40 });
    await p.waitForFunction((id) => { const c = Ext.ComponentQuery.query('ordonnanceclient #vueFiche #ficheClient')[0]; return c.isExpanded && !c.getStore().isLoading() && c.getStore().findExact('lgCLIENTID', id) >= 0; }, assure[0], { timeout: 15000 });
    lignes = await liste('ordonnanceclient #vueFiche #ficheClient');
    ok('Fiche : le numéro complet trouve le client, avec type et téléphone', lignes.some((l) => l.tel === assure[3] && l.type === 'Assurance'), JSON.stringify(lignes.slice(0, 3)));
    await p.evaluate((id) => { const c = Ext.ComponentQuery.query('ordonnanceclient #vueFiche #ficheClient')[0]; const r = c.getStore().getAt(c.getStore().findExact('lgCLIENTID', id)); c.select(r); c.fireEvent('select', c, [r]); c.collapse(); }, assure[0]);
    await p.waitForTimeout(600);
    const attendu = assure[4].split('-').reverse().join('/');
    f = await p.evaluate(() => { const x = Ext.ComponentQuery.query('ordonnanceclient #vueFiche')[0]; return { naissance: x.down('#naissancePatient').getRawValue(), ageFige: x.down('#agePatient').readOnly }; });
    ok('Client assurance choisi : sa date de naissance est reprise dans le contexte', f.naissance === attendu && f.ageFige, JSON.stringify(f) + ' attendu ' + attendu);
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (x) {
    ok('Le parcours va au bout', false, x.message + ' ' + (x.stack || '').split('\n')[1]);
  } finally {
    await b.close();
    const ids = q("SELECT GROUP_CONCAT(CONCAT(\"'\", lg_CLIENT_ID, \"'\")) FROM t_client WHERE str_FIRST_NAME='" + NOM + "'");
    if (ids && ids !== 'NULL') {
      exec('DELETE t FROM t_ordonnance_client_terrain t JOIN t_ordonnance_client o ON o.lg_ORDONNANCE_ID=t.lg_ORDONNANCE_ID WHERE o.lg_CLIENT_ID IN (' + ids + ')');
      exec('DELETE d FROM t_ordonnance_client_detail d JOIN t_ordonnance_client o ON o.lg_ORDONNANCE_ID=d.lg_ORDONNANCE_ID WHERE o.lg_CLIENT_ID IN (' + ids + ')');
      exec('DELETE FROM t_ordonnance_client WHERE lg_CLIENT_ID IN (' + ids + ')');
      exec('DELETE FROM t_compte_client WHERE lg_CLIENT_ID IN (' + ids + ')');
      exec('DELETE FROM t_client WHERE lg_CLIENT_ID IN (' + ids + ')');
    }
    ok('Remise en état : client et ordonnances de test retirés', q("SELECT COUNT(*) FROM t_client WHERE str_FIRST_NAME='" + NOM + "'") === '0');
    const kos = res.filter((r) => !r.c);
    console.log('\n' + res.filter((r) => r.c).length + '/' + res.length + ' controles OK');
    process.exit(kos.length ? 1 : 0);
  }
})();
