/* PILOTAGE, onglet Rentabilité (besoins du 11/10, point 11 : rentabilite nette = marge brute - charges).
 * Par l'ecran, periode « 12 mois glissants » :
 *  - l'onglet est le dernier, avec ses tuiles (marge brute, charges, resultat net, rentabilite nette) ;
 *  - charges saisies dans la grille, case par case (loyer 250 000 et salaires 400 000 sur le mois precedent) :
 *    enregistrees aussitot, total de la ligne et du mois ;
 *  - tuiles recalculees : charges = 650 000, resultat net = marge brute - 650 000, taux = resultat / CA HT ;
 *  - detail mensuel : le mois precedent porte ses charges et son resultat net ;
 *  - une case videe retire la charge ; sans le droit de saisie, la grille est en lecture seule et l'API refuse ;
 *  - aucune fenetre. Les charges du mois d'essai sont sauvegardees avant et remises apres.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const privilegeEssai = require('../support/privilege-essai');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const MOIS = q("SELECT DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m')");
const [ANNEE, M] = MOIS.split('-');
const CHAMP = 'm' + M;
const droit = privilegeEssai(q, exec, 'admin', 'P_PILOTAGE_CHARGES');
const proche = (a, b) => Math.abs(Number(a) - Number(b)) <= 1;

(async () => {
  droit.remettre();
  exec(`DROP TABLE IF EXISTS zz_e2e_charges; CREATE TABLE zz_e2e_charges AS SELECT * FROM t_charge_mensuelle WHERE mois = '${MOIS}'; DELETE FROM t_charge_mensuelle WHERE mois = '${MOIS}';`);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const dialogues = [];
  const ouvrir = async (p) => {
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('pilotage', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('pilotage #onglets').length > 0, null, { timeout: 30000 });
    await p.waitForFunction(() => { const z = Ext.ComponentQuery.query('pilotage #barrePeriode #zoneProgression')[0]; return !z || z.isHidden(); }, null, { timeout: 300000 });
    await p.evaluate(() => { const a = Ext.ComponentQuery.query('pilotage #barrePeriode combobox')[0]; a.setValue('G12'); a.fireEvent('select', a); });
    await p.waitForTimeout(1500);
    await p.click('.x-tab:has-text("Rentabilité")');
    await p.waitForFunction(() => { const s = Ext.ComponentQuery.query('pilotage #saisieCharges')[0]; return s && s.getStore().getCount() === 9; }, null, { timeout: 60000 });
    await p.waitForTimeout(2500);
  };
  const tuiles = (p) => p.evaluate(() => { const o = {}; Ext.ComponentQuery.query('pilotage')[0].stores.rentabilite.tuiles.each((r) => { o[r.get('cle')] = r.get('valeur'); }); return o; });
  try {
    const p = await (await b.newContext({ viewport: { width: 1700, height: 1000 } })).newPage();
    p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
    await ouvrir(p);
    const ordre = await p.evaluate(() => Ext.ComponentQuery.query('pilotage #onglets')[0].items.items.map((t) => t.title));
    ok('Onglet « Rentabilité » présent', ordre.indexOf('Rentabilité') >= 0, ordre.join(' | '));
    let t = await tuiles(p);
    ok('Tuiles : marge brute, charges, résultat net, rentabilité nette', ['marge', 'charges', 'resultatNet', 'tauxNet'].every((k) => k in t), JSON.stringify(t));

    /* saisie dans la grille, case par case, au clavier */
    const saisir = async (categorie, valeur) => {
      await p.evaluate(([cat, champ]) => { const g = Ext.ComponentQuery.query('pilotage #saisieCharges')[0];
        const r = g.getStore().findRecord('categorie', cat); const col = g.down('#charge-' + champ);
        g.findPlugin('cellediting').startEdit(r, col); }, [categorie, CHAMP]);
      await p.waitForTimeout(400);
      await p.keyboard.press('Control+A');
      await p.keyboard.press('Backspace');
      if (valeur !== '') { await p.keyboard.type(String(valeur)); }
      await p.keyboard.press('Enter');
      await p.waitForTimeout(2500);
    };
    await saisir('LOYER', 250000);
    await saisir('SALAIRES', 400000);
    ok('Charges enregistrées aussitôt (loyer 250 000, salaires 400 000 sur ' + MOIS + ')',
      q(`SELECT GROUP_CONCAT(CONCAT(categorie, ':', montant) ORDER BY categorie) FROM t_charge_mensuelle WHERE mois = '${MOIS}'`) === 'LOYER:250000,SALAIRES:400000');
    await p.waitForTimeout(3000);
    t = await tuiles(p);
    ok('Tuile Charges = 650 000', proche(t.charges, 650000), JSON.stringify(t));
    ok('Résultat net = marge brute − charges', proche(t.resultatNet, t.marge - 650000), t.resultatNet + ' / ' + t.marge);
    const ligne = await p.evaluate((m) => { const r = Ext.ComponentQuery.query('pilotage')[0].stores.rentabilite.detail.findRecord('mois', m); return r ? r.data : null; }, MOIS);
    ok('Détail : le mois ' + MOIS + ' porte ses charges et son résultat net', ligne && proche(ligne.charges, 650000) && proche(ligne.resultatNet, ligne.marge - 650000),
      ligne && JSON.stringify({ marge: ligne.marge, charges: ligne.charges, net: ligne.resultatNet, taux: ligne.tauxNet }));
    ok('Taux de rentabilité nette = résultat net / CA HT', ligne && ligne.caHT > 0 ? Math.abs(ligne.tauxNet - Math.round(ligne.resultatNet / ligne.caHT * 1000) / 10) <= 0.1 : true,
      ligne && ligne.tauxNet);
    const total = await p.evaluate(() => Ext.ComponentQuery.query('pilotage #saisieCharges')[0].getEl().dom.textContent);
    ok('Grille : total de l\'année affiché (650 000)', total.replace(/[^0-9]/g, ' ').indexOf('650') >= 0 && /650[^0-9]?000/.test(total), total.slice(-160));

    /* case videe : la charge est retiree */
    await saisir('LOYER', '');
    ok('Case vidée : la charge est retirée', q(`SELECT GROUP_CONCAT(categorie) FROM t_charge_mensuelle WHERE mois = '${MOIS}'`) === 'SALAIRES');
    ok('Aucune fenêtre', dialogues.length === 0, dialogues.join(' | '));

    /* sans le droit de saisie */
    droit.retirer();
    const p2 = await (await b.newContext({ viewport: { width: 1700, height: 1000 } })).newPage();
    await ouvrir(p2);
    const lecture = await p2.evaluate((champ) => { const g = Ext.ComponentQuery.query('pilotage #saisieCharges')[0];
      const r = g.getStore().findRecord('categorie', 'LOYER'); const ouvert = g.findPlugin('cellediting').startEdit(r, g.down('#charge-' + champ));
      return { edition: ouvert !== false && !!g.findPlugin('cellediting').getActiveEditor(), etat: g.down('#etatCharges').text }; }, CHAMP);
    const refus = await p2.evaluate(async (a) => (await (await fetch('../api/v1/pilotage/charges', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ annee: +a[0], mois: +a[1], categorie: 'LOYER', montant: 1 }) })).json()), [ANNEE, M]);
    ok('Sans le droit : grille en lecture seule, saisie refusée par le serveur', !lecture.edition && /Consultation seule/.test(lecture.etat)
      && refus.success === false, JSON.stringify(lecture) + ' ' + JSON.stringify(refus));
  } finally {
    droit.remettre();
    exec(`DELETE FROM t_charge_mensuelle WHERE mois = '${MOIS}'; INSERT INTO t_charge_mensuelle SELECT * FROM zz_e2e_charges; DROP TABLE zz_e2e_charges;`);
    await b.close();
    ok('Charges du mois d\'essai remises', q(`SELECT COUNT(*) FROM t_charge_mensuelle WHERE mois = '${MOIS}' AND lg_USER_ID IS NOT NULL AND updated_at >= NOW() - INTERVAL 1 HOUR`) === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
  process.exit(ko ? 1 : 0);
})();
