/* VALORISATION DU STOCK D'UNE SAUVEGARDE (retour du 02/11 : valoriser sans restaurer la base sur un autre poste),
 * Centre de support > Stabilité du serveur > Sauvegardes.
 *  - une sauvegarde faite par l'ecran, puis « Valoriser » sur sa ligne : resultat dans l'onglet, sans fenetre ;
 *  - non-regression : par famille, par rayon et par grossiste, les totaux (rayon et reserve, achat et vente) sont ceux
 *    de la valorisation du jour de Prestige (stock inchange entre la sauvegarde et le calcul) ;
 *  - autant de lignes que de groupes dans la base ; export Excel ;
 *  - la base en service n'est pas touchee (sommes de controle du stock) ; la base temporaire est supprimee ;
 *  - sans le droit, l'API refuse ; aucune fenetre, aucune erreur JavaScript ; donnees du test retirees.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const fs = require('fs');
const privilegeEssai = require('./privilege-essai');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const droit = privilegeEssai(q, exec, ENV_E2E.LOGIN_SUPPORT, 'P_SM_SUPPORT_SERVEUR');
const DOSSIER = (ENV_E2E.WINDOWS ? 'D:/' : '/tmp/') + 'e2e-valo-sauvegarde';
const CLES = ['KEY_SAUVEGARDE_DOSSIER', 'KEY_SAUVEGARDE_COPIE', 'KEY_SAUVEGARDE_ACTIVE', 'KEY_SAUVEGARDE_GARDER_HEURES', 'KEY_SAUVEGARDE_GARDER_JOURS'];
const empreinteStock = () => q('CHECKSUM TABLE t_famille, t_famille_stock, t_type_stock_famille').split(/\r?\n/).map((l) => l.split('\t')[1]).join('|');
const MODES = { 1: ['Famille', 't_famillearticle', 'lg_FAMILLEARTICLE_ID'], 2: ['Rayon', 't_zone_geographique', 'lg_ZONE_GEO_ID'], 3: ['Grossiste', 't_grossiste', 'lg_GROSSISTE_ID'] };

(async () => {
  droit.remettre();
  const idAvant = Number(q('SELECT COALESCE(MAX(id), 0) FROM t_sauvegarde'));
  const reglagesAvant = q("SELECT GROUP_CONCAT(CONCAT(str_KEY, '=', str_VALUE) ORDER BY str_KEY SEPARATOR '|') FROM t_parameters WHERE str_KEY IN ('" + CLES.join("','") + "')");
  fs.rmSync(DOSSIER, { recursive: true, force: true });
  const stockAvant = empreinteStock();
  const EMP = q("SELECT lg_EMPLACEMENT_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN_SUPPORT + "'");

  const b = await ENV_E2E.lancer(chromium);
  const dialogues = [], err = [];
  const ouvrir = async (p) => {
    p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
    p.on('pageerror', (e) => err.push(String(e.message)));
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN_SUPPORT); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(2000);
  };
  const S = (sel) => 'supportserveur #ongletSauvegardes ' + sel;
  const id = (p, sel) => p.evaluate((s) => Ext.ComponentQuery.query(s)[0].getId(), S(sel));
  try {
    const p = await (await b.newContext({ viewport: { width: 1600, height: 950 }, acceptDownloads: true })).newPage();
    await ouvrir(p);
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('supportserveur', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('supportserveur').length > 0, null, { timeout: 30000 });
    await p.click('.supportserveur .x-tab:has-text("Sauvegardes")');
    await p.waitForFunction((s) => { const e = Ext.ComponentQuery.query(s)[0]; return e && /Outil de sauvegarde/.test(e.getEl().dom.textContent); }, S('#sauvEtat'), { timeout: 30000 });
    await p.evaluate(([s, d]) => { const f = (x) => Ext.ComponentQuery.query(s + ' ' + x)[0]; f('#sauvDossier').setValue(d); f('#sauvCopie').setValue(''); f('#sauvActive').setValue(false); },
      [S(''), DOSSIER]);
    await p.click('#' + await id(p, '#btnSauvReglages'));
    await p.waitForTimeout(1500);
    await p.click('#' + await id(p, '#btnSauvMaintenant'));
    await p.waitForFunction(([s, i]) => { const r = Ext.ComponentQuery.query(s)[0].getStore().getAt(0); return r && r.get('id') > i && r.get('statut') !== 'EN_COURS'; },
      [S('#sauvListe'), idAvant], { timeout: 900000, polling: 3000 });
    const ligne = await p.evaluate((s) => Ext.ComponentQuery.query(s)[0].getStore().getAt(0).getData(), S('#sauvListe'));
    ok('Sauvegarde faite par l\'écran', ligne.statut === 'REUSSIE', JSON.stringify(ligne));
    const dateDuJour = q('SELECT CURDATE()');
    const apresSauvegarde = empreinteStock();

    /* « Valoriser » sur la ligne de la sauvegarde */
    const t0 = Date.now();
    await p.click('.supportserveur .sauv-valoriser >> nth=0');
    await p.waitForFunction((s) => { const g = Ext.ComponentQuery.query(s)[0]; return g && g.isVisible(true) && g.getStore().getCount() > 0; }, S('#sauvValoListe'), { timeout: 600000, polling: 2000 });
    const duree = Math.round((Date.now() - t0) / 1000);
    const entete = await p.evaluate((s) => Ext.ComponentQuery.query(s)[0].getEl().dom.textContent, S('#sauvValoEntete'));
    ok('Valorisation affichée dans l\'onglet, avec la date et l\'heure de la sauvegarde (' + duree + ' s)', entete.indexOf(ligne.debut.slice(0, 16).split(' ')[1]) >= 0 && /Valorisation du stock/.test(entete), entete.slice(0, 200));

    for (const m of [1, 2, 3]) {
      await p.evaluate(([s, v]) => Ext.ComponentQuery.query(s)[0].select(v), [S('#sauvValoPar'), m]);
      await p.waitForTimeout(800);
      const ecran = await p.evaluate((s) => { const t = { lignes: 0, achatRayon: 0, venteRayon: 0, achatReserve: 0, venteReserve: 0 };
        Ext.ComponentQuery.query(s)[0].getStore().each((r) => { t.lignes++; ['achatRayon', 'venteRayon', 'achatReserve', 'venteReserve'].forEach((k) => { t[k] += r.get(k); }); }); return t; }, S('#sauvValoListe'));
      const api = await p.evaluate(async ([mode, jour]) => (await (await fetch('../api/v1/produit/valorisation?mode=' + mode + '&dtStart=' + jour)).json()).data, [m, dateDuJour]);
      const [nom, table, cle] = MODES[m];
      const groupes = Number(q(`SELECT COUNT(DISTINCT g.${cle}) FROM t_famille o JOIN ${table} g ON g.${cle} = o.${cle} WHERE o.str_STATUT = 'enable'
        AND (EXISTS (SELECT 1 FROM t_famille_stock s WHERE s.lg_FAMILLE_ID = o.lg_FAMILLE_ID AND s.str_STATUT = 'enable' AND s.lg_EMPLACEMENT_ID = '${EMP}')
          OR EXISTS (SELECT 1 FROM t_type_stock_famille z WHERE z.lg_FAMILLE_ID = o.lg_FAMILLE_ID AND z.lg_TYPE_STOCK_ID = '2' AND z.str_STATUT = 'enable' AND z.lg_EMPLACEMENT_ID = '${EMP}'))`));
      ok('Par ' + nom.toLowerCase() + ' : totaux identiques à la valorisation du jour de Prestige (rayon et réserve, achat et vente)',
        ecran.achatRayon === api.value && ecran.venteRayon === api.valueTwo && ecran.achatReserve === api.reserveValue && ecran.venteReserve === api.reserveValueTwo,
        JSON.stringify(ecran) + ' / ' + JSON.stringify(api));
      ok('Par ' + nom.toLowerCase() + ' : une ligne par groupe (' + groupes + ')', ecran.lignes === groupes, ecran.lignes + ' / ' + groupes);
    }

    const [tel] = await Promise.all([p.waitForEvent('download', { timeout: 120000 }), p.click('#' + await id(p, '#btnSauvValoExport'))]);
    const xlsx = await tel.path();
    const octets = xlsx ? fs.readFileSync(xlsx) : Buffer.alloc(0);
    ok('Export Excel', /\.xlsx$/.test(tel.suggestedFilename()) && octets.slice(0, 2).toString() === 'PK' && octets.length > 3000, tel.suggestedFilename() + ' ' + octets.length + ' octets');

    ok('Base en service non touchée (stock identique avant et après la valorisation)', empreinteStock() === apresSauvegarde && apresSauvegarde === stockAvant);
    ok('Base temporaire supprimée', q("SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME LIKE 'prestige_valo%'") === '0');

    droit.retirer();
    const p2 = await (await b.newContext()).newPage();
    await ouvrir(p2);
    const refus = await p2.evaluate(async (i) => (await (await fetch('../api/v1/support/sauvegardes/valoriser', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: i }) })).json()), ligne.id);
    ok('Sans le droit : l\'API refuse', refus.success === false, JSON.stringify(refus));
    ok('Aucune fenêtre, aucune erreur JavaScript', dialogues.length === 0 && err.length === 0, dialogues.concat(err).join(' | '));
  } catch (e) {
    ok('Exécution sans exception', false, e.stack);
  } finally {
    droit.remettre();
    await b.close();
    exec("DELETE FROM t_parameters WHERE str_KEY IN ('" + CLES.join("','") + "');"
      + (reglagesAvant && reglagesAvant !== 'NULL' ? reglagesAvant.split('|').map((kv) => { const i = kv.indexOf('=');
        return "INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED) VALUES ('" + kv.slice(0, i) + "', '" + kv.slice(i + 1).replace(/\\/g, '\\\\').replace(/'/g, "''") + "', 'Sauvegardes', 'SYSTEME', 'enable', NOW());"; }).join('') : '')
      + 'DELETE FROM t_sauvegarde WHERE id > ' + idAvant + ';');
    fs.rmSync(DOSSIER, { recursive: true, force: true });
    ok('Réglages, historique et fichiers du test retirés', !fs.existsSync(DOSSIER) && q('SELECT COUNT(*) FROM t_sauvegarde WHERE id > ' + idAvant) === '0'
      && q("SELECT COALESCE(GROUP_CONCAT(CONCAT(str_KEY, '=', str_VALUE) ORDER BY str_KEY SEPARATOR '|'), 'NULL') FROM t_parameters WHERE str_KEY IN ('" + CLES.join("','") + "')") === (reglagesAvant || 'NULL'));
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
