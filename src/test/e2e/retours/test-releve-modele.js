/* RELEVE GROSSISTE PRESENTE A SA MANIERE : RECONNAISSANCE DES COLONNES ET REGLAGE MEMORISE (retours du 09/10 (5)).
 * Jeu d'essai (retire a la fin), grossiste TEDIS, septembre 2026 :
 *   BL R11398400 (21 028, rapproche), BL R20262786 (36 000 : ecart de 48 avec le releve).
 * Releves PDF (fixtures, regeneres par ReleveFormatsGrossistesTest.main) :
 *   releve-e2e-modele-dpci.pdf : facon DPCI (sections Factures / Avoirs, milliers « . », avoirs « 280.296- »,
 *     en-tetes sur deux lignes, montants TTC / TVA / Net HT / Brut HT) ;
 *   releve-e2e-modele-listing.pdf : listing a chasse fixe, filets « | », colonne Sequence ;
 *   releve-e2e-pointage.pdf : format standard.
 *  - import DPCI sans reglage : panneau de reconnaissance dans l'onglet (pas de fenetre), colonnes proposees
 *    (N° BL, Date, Montant Net HT), 7 lignes lues en vert, totaux ; un champ obligatoire retire : application
 *    impossible et message ; autre colonne de montant : totaux recalcules ;
 *  - « Appliquer et memoriser » : releve rapproche, reglage enregistre pour le grossiste ;
 *  - nouvel import DPCI : lu directement avec le reglage memorise ;
 *  - releve d'une autre presentation : reglage inadapte detecte, reconnaissance proposee (Sequence reconnue) ;
 *  - « Revenir au format standard » : reglage oublie, releve standard lu comme avant (pas de regression) ;
 *  - jeton inconnu refuse ; aucune erreur JavaScript.
 */
const { execFileSync } = require('child_process');
const path = require('path');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const SORTIE = process.env.SORTIE || '/tmp';
const G = '51217123531215794892', CMD = 'E2E-PRM-CMD';
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin'");
const BLS = [['E2E-PRM-1', 'R11398400', '2026-09-14', 21028], ['E2E-PRM-2', 'R20262786', '2026-09-14', 36000]];
/* reglage deja present pour ce grossiste (banc) : garde et remis a la fin */
const AVANT = q("SELECT COALESCE((SELECT str_MODELE FROM t_releve_modele WHERE lg_GROSSISTE_ID = '" + G + "'), '')");

function nettoyer() {
  exec("DELETE FROM t_releve_grossiste_ligne WHERE lg_RELEVE_ID IN (SELECT lg_RELEVE_ID FROM t_releve_grossiste WHERE str_FICHIER LIKE 'releve-e2e-%');"
    + "DELETE FROM t_releve_grossiste WHERE str_FICHIER LIKE 'releve-e2e-%';"
    + "DELETE FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID LIKE 'E2E-PRM-%';"
    + "DELETE FROM t_order WHERE lg_ORDER_ID = '" + CMD + "';"
    + "DELETE FROM t_releve_modele WHERE lg_GROSSISTE_ID = '" + G + "';");
}

(async () => {
  nettoyer();
  exec("INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)"
    + " VALUES ('" + CMD + "', '" + CMD + "', 0, '" + G + "', '" + ADMIN + "', 'is_Closed', NOW(), NOW(), 0, 1, 0)");
  BLS.forEach(([id, ref, d, ht]) => exec("INSERT INTO t_bon_livraison (lg_BON_LIVRAISON_ID, str_REF_LIVRAISON, dt_DATE_LIVRAISON, int_MHT, int_TVA, int_HTTC, str_STATUT,"
    + " dt_CREATED, dt_UPDATED, lg_USER_ID, lg_ORDER_ID) VALUES ('" + id + "', '" + ref + "', '" + d + "', " + ht + ", 0, " + ht + ", 'is_Closed', NOW(), NOW(), '"
    + ADMIN + "', '" + CMD + "')"));
  const { chromium } = require('playwright-core');
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
  const p = await ctx.newPage();
  const err = [];
  p.on('pageerror', (e) => err.push(String(e.message)));
  const E = 'Ext.ComponentQuery.query("pointagebl")[0]';
  const ev = (code) => p.evaluate(new Function('return (' + code + ');'));
  const carte = () => ev(E + '.down("#ongletRapprochement").getLayout().getActiveItem().itemId');
  const importer = async (fichier) => {
    await ev(E + '.releveCourant = null, ' + E + '.essaiFait = 0');
    const avant = await ev(E + '.jeton || ""');
    const input = await ev(E + '.down("#fichierReleve").fileInputEl.dom.id');
    await p.setInputFiles('#' + input, path.join(__dirname, 'fixtures', fichier));
    await p.waitForFunction((a) => { const e = Ext.ComponentQuery.query('pointagebl')[0];
      return (e.jeton && e.jeton !== a) && (e.releveCourant || e.down('#ongletRapprochement').getLayout().getActiveItem().itemId === 'reconnaissance')
        || (Ext.MessageBox.isVisible() && !/Lecture du relevé/.test(Ext.MessageBox.msg.getEl().dom.textContent)); }, avant, { timeout: 60000 });
    await p.waitForTimeout(1500);
  };
  const choix = () => ev('(function(){var e=' + E + ',r={};Ext.Array.each(e.CHAMPS,function(c){r[c.champ]=e.down("#champ-"+c.champ).getValue();});return r;})()');
  const choisir = async (champ, rang) => {
    await ev('(function(){var c=' + E + '.down("#champ-' + champ + '");c.setValue(' + rang + ');c.fireEvent("select",c,[c.findRecordByValue(' + rang + ')]);})()');
    await p.waitForTimeout(1500);
  };
  /* separateur de milliers de l'ecran (point ou espace) ramene a l'espace */
  const info = async () => (await ev(E + '.down("#recoInfo").getEl().dom.textContent')).replace(/(\d)[\u00a0\u202f .](?=\d{3}\b)/g, '$1 ');
  const lus = async () => (await ev(E + '.down("#grilleApercu").getStore().getRange().filter(function(r){return r.get("lu");}).map(function(r){return r.get("resume");})'))
    .map((x) => x.replace(/(\d)[\u00a0\u202f .](?=\d{3}\b)/g, '$1 '));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('pointagebl', 'Pointage BL / avoirs', ''));
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('pointagebl')[0]; return e && e.isVisible() && e.down('#grossiste').getStore().getCount() > 0; }, null, { timeout: 30000 });
    await p.evaluate((g) => { const e = Ext.ComponentQuery.query('pointagebl')[0]; e.down('#du').setValue(new Date(2026, 8, 1)); e.down('#au').setValue(new Date(2026, 8, 30));
      const c = e.down('#grossiste'); c.setValue(g); c.fireEvent('select', c, [c.getStore().findRecord('id', g)]);
      e.down('#ongletsPointage').setActiveTab(e.down('#ongletRapprochement')); }, G);
    await p.waitForTimeout(1500);
    ok('Sans réglage : bouton « Revenir au format standard » masqué, « Régler les colonnes » inactif avant import',
      await ev('!' + E + '.down("#oublierModele").isVisible() && ' + E + '.down("#reglerColonnes").isDisabled()'));

    /* 1. releve DPCI sans reglage : reconnaissance */
    await importer('releve-e2e-modele-dpci.pdf');
    ok('Relevé DPCI non standard : panneau de reconnaissance dans l\'onglet, sans fenêtre', await carte() === 'reconnaissance' && !(await ev('Ext.MessageBox.isVisible()'))
      && /pas au format standard/.test(await info()), (await carte()) + ' ' + (await info()));
    const c1 = await choix();
    ok('Colonnes proposées : N° BL = C2, Date = C1, Montant = C5 (Net HT, pas le TTC ni la TVA)', c1.NUMERO === 1 && c1.DATE === 0 && c1.MONTANT === 4 && c1.TYPE === -1, JSON.stringify(c1));
    const entete = await ev(E + '.down("#grilleApercu").down("#apercu-c4").text');
    ok('En-tête de colonne : en-tête du relevé et champ désigné', /Montant Net/.test(entete) && /Montant HT/.test(entete), entete);
    let l = await lus();
    ok('7 lignes lues en vert (5 factures, 2 avoirs), titres et totaux ignorés', l.length === 7 && /^BL R?\S*11398400.*21 028$/.test(l[0]) && l.some((x) => /^Avoir .*11398365.*-280 296$/.test(x)), JSON.stringify(l));
    ok('Totaux de l\'essai : BL 724 007, avoirs -348 731', /7 ligne\(s\) lue\(s\) : BL 724 007, avoirs -348 731/.test((await info()).replace(/ | /g, ' ')), await info());
    await choisir('MONTANT', 2);
    ok('Autre colonne de montant (TTC) : totaux recalculés', /BL 805 592/.test((await info()).replace(/ | /g, ' ')), await info());
    await choisir('MONTANT', 4);
    await choisir('DATE', -1);
    ok('Date retirée : application impossible et message', await ev(E + '.down("#appliquerModele").isDisabled()') && /colonne de la date/.test(await info()), await info());
    await choisir('DATE', 0);
    ok('Date remise : application possible', !(await ev(E + '.down("#appliquerModele").isDisabled()')));
    await p.screenshot({ path: SORTIE + '/releve-modele-reconnaissance.png' });

    /* 2. appliquer et memoriser */
    await ev(E + '.down("#appliquerModele").btnEl.dom.click()');
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('pointagebl')[0]; return e.releveCourant; }, null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    let rel = await ev('(function(){var o=' + E + '.releveCourant;return {lignes:o.lignes,v:o.data.map(function(x){return x.statut+":"+x.numero+":"+(x.ecart||"")}).join(" | ")};})()');
    ok('Relevé rapproché avec ces colonnes : R11398400 rapproché, R20262786 en écart de 48', await carte() === 'grilleReleve' && rel.lignes === 7
      && /RAPPROCHE:11398400:/.test(rel.v) && /ECART:20262786:48/.test(rel.v), JSON.stringify(rel));
    const m = q("SELECT str_MODELE FROM t_releve_modele WHERE lg_GROSSISTE_ID = '" + G + "'");
    ok('Réglage mémorisé pour le grossiste (positions des colonnes N° BL, Date, Montant)', /"NUMERO"/.test(m) && /"DATE"/.test(m) && /"MONTANT"/.test(m), m);
    ok('Bandeau : relevé lu avec le réglage mémorisé, « Revenir au format standard » visible',
      /réglage mémorisé/.test(await ev(E + '.down("#etatModele").getEl().dom.textContent')) && await ev(E + '.down("#oublierModele").isVisible()'));

    /* 3. nouvel import du meme grossiste : lu directement */
    await importer('releve-e2e-modele-dpci.pdf');
    rel = await ev('(function(){var o=' + E + '.releveCourant;return o?{lignes:o.lignes,lecture:o.lecture}:null;})()');
    ok('Nouvel import DPCI : lu directement avec le réglage mémorisé (pas de reconnaissance)', rel && rel.lignes === 7 && rel.lecture === 'MODELE' && await carte() === 'grilleReleve', JSON.stringify(rel));

    /* 4. releve d'une autre presentation : reglage inadapte detecte */
    await importer('releve-e2e-modele-listing.pdf');
    const c2 = await choix();
    ok('Autre présentation : réglage inadapté signalé, reconnaissance proposée', await carte() === 'reconnaissance' && /ne lit plus ce relevé/.test(await info()), await info());
    ok('Listing : N° de facture, Séquence, Date, Montant reconnus', c2.NUMERO === 0 && c2.SEQUENCE === 1 && c2.DATE === 2 && c2.MONTANT === 3, JSON.stringify(c2));
    l = await lus();
    ok('Listing : 4 lignes lues (N° 350112 / séquence 100 / 11 255)', l.length === 4 && /^BL 350112 \/ 100 · 14\/09\/2026 · 11 255$/.test(l[0].replace(/ | /g, ' ')), JSON.stringify(l));
    await ev(E + '.down("#annulerReconnaissance").btnEl.dom.click()');
    await p.waitForTimeout(500);
    ok('Annuler : retour à la liste, réglage du grossiste inchangé', await carte() === 'grilleReleve' && q("SELECT str_MODELE FROM t_releve_modele WHERE lg_GROSSISTE_ID = '" + G + "'") === m);

    /* 5. retour au format standard (pas de regression) */
    await ev(E + '.down("#oublierModele").btnEl.dom.click()');
    await p.waitForFunction(() => Ext.MessageBox.isVisible() && Ext.MessageBox.msgButtons.yes.isVisible(), null, { timeout: 10000 });
    await p.evaluate(() => Ext.MessageBox.msgButtons.yes.btnEl.dom.click());
    await p.waitForTimeout(1500);
    ok('« Revenir au format standard » : réglage oublié', q("SELECT COUNT(*) FROM t_releve_modele WHERE lg_GROSSISTE_ID = '" + G + "'") === '0' && !(await ev(E + '.down("#oublierModele").isVisible()')));
    await importer('releve-e2e-pointage.pdf');
    rel = await ev('(function(){var o=' + E + '.releveCourant;return o?{lignes:o.lignes,lecture:o.lecture,t:o.totaux.releveBl}:null;})()');
    ok('Relevé au format standard lu comme avant', rel && rel.lignes === 4 && rel.lecture === 'STANDARD' && rel.t === 93593, JSON.stringify(rel));
    await ev(E + '.down("#reglerColonnes").btnEl.dom.click()');
    await p.waitForFunction(() => Ext.ComponentQuery.query('pointagebl')[0].down('#ongletRapprochement').getLayout().getActiveItem().itemId === 'reconnaissance', null, { timeout: 15000 });
    await p.waitForTimeout(1500);
    const c3 = await choix();
    ok('« Régler les colonnes » sur un relevé standard : Type, N° BL / Séq, Date, Montant proposés', c3.TYPE === 0 && c3.NUMERO === 1 && c3.DATE === 2 && c3.MONTANT === 3 && (await lus()).length === 4, JSON.stringify(c3));
    await ev(E + '.down("#annulerReconnaissance").btnEl.dom.click()');

    const inconnu = await p.evaluate(async () => (await fetch('/prestige/api/v1/pointage-bl/releve/essai', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jeton: 'inconnu', champs: {} }) })).json());
    ok('Jeton inconnu refusé', inconnu.success === false && /réimporter/.test(inconnu.msg), JSON.stringify(inconnu));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Déroulement du test', false, e.stack || e);
  } finally {
    await b.close();
    nettoyer();
    if (AVANT) {
      exec("INSERT INTO t_releve_modele (lg_GROSSISTE_ID, str_MODELE, dt_UPDATED) VALUES ('" + G + "', '" + AVANT.replace(/'/g, "''") + "', NOW())");
    }
    ok('Jeu d\'essai retiré', q("SELECT COUNT(*) FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID LIKE 'E2E-PRM-%'") === '0'
      && q("SELECT COUNT(*) FROM t_releve_grossiste WHERE str_FICHIER LIKE 'releve-e2e-%'") === '0');
    const n = res.filter((r) => r.c).length;
    console.log('\n' + n + '/' + res.length + ' OK');
    process.exit(n === res.length ? 0 : 1);
  }
})();
