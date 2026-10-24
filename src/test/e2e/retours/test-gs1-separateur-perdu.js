/* ETIQUETTE PRESTIGE SCANNEE SANS LE SEPARATEUR GS (retour du 24/10, etiquettes 3232018 « UBIPHARM »).
 *
 * L'etiquette DataMatrix / QR imprimee par Prestige contient 17 <peremption> 10 <lot> <GS> 240 <CIP>. La douchette
 * Sunmi, en mode clavier, perd le separateur GS : le code arrive colle (1726102910012403232018) et le lot avalait le
 * CIP -> « pas une etiquette GS1 », puis « ne contient pas le produit ».
 * Par les vues (admin), sur un vrai produit du banc (CIP a 7 chiffres, en stock), code sans separateur :
 *  - vente, lecture GS1 = 1 : le produit est ajoute a la vente (lot 01 et peremption lus) ;
 *  - vente, lecture GS1 = 0 : le produit est ajoute (CIP tire du code, sans controle du lot) ;
 *  - Etiquetage Pro > Lire une étiquette : le produit de Prestige est trouve, lot 01, peremption ;
 *  - non-regression : le meme code AVEC separateur passe toujours ; un code « date + lot » sans CIP garde son message.
 * Ventes d'essai retirees par la route de l'ecran Ventes, parametre remis.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer, texteMessage, repondre } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const [FID, CIP] = q("SELECT f.lg_FAMILLE_ID, f.int_CIP FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
  + " WHERE f.str_STATUT = 'enable' AND s.int_NUMBER_AVAILABLE > 20 AND f.int_CIP REGEXP '^[0-9]{7}$' ORDER BY f.int_CIP LIMIT 1").split('\t');
const PER = q("SELECT DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 1 YEAR), '%y%m%d')");
const COLLE = '17' + PER + '10' + '01' + '240' + CIP;
const AVEC_GS = '17' + PER + '10' + '01' + '|240' + CIP;
const LECTURE = q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_VENTE_LECTURE_GS1'");
const ventes = [];

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  let p = null;
  const erreurs = [];
  const nouvellePage = async () => { if (p) { await p.context().close(); } p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage(); p.on('pageerror', (e) => erreurs.push(e.message)); };
  const champ = 'doventemanager #contenu [xtype=fieldcontainer] #produit';
  const fermerMessages = async () => { for (let i = 0; i < 3 && await texteMessage(p); i++) { await repondre(p, 'ok').catch(() => {}); await p.waitForTimeout(400); } };
  const nouvelleVente = async () => {
    await ouvrirMenu(p, 'SERVICE CLIENT', 'Ventes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('cloturerventemanager #addBtn').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await cliquer(p, 'cloturerventemanager #addBtn');
    await p.waitForFunction((r) => Ext.ComponentQuery.query(r).some((x) => x.isVisible(true)), champ, { timeout: 60000 });
    await p.waitForTimeout(1500);
  };
  const scanner = async (code) => {
    await cliquer(p, champ);
    await p.keyboard.press('Control+A'); await p.keyboard.press('Backspace');
    await p.keyboard.type(code, { delay: 5 });
    await p.keyboard.press('Enter');
    await p.waitForTimeout(3500);
    const message = await texteMessage(p);
    await fermerMessages();
    await p.waitForTimeout(1500);
    const id = await p.evaluate(() => { const c = testextjs.app.getController('VenteCtr').current; return c && c.lgPREENREGISTREMENTID; });
    if (id && !ventes.includes(id)) { ventes.push(id); }
    const n = id ? Number(q(`SELECT IFNULL(SUM(int_QUANTITY), 0) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '${id}' AND lg_FAMILLE_ID = '${FID}'`)) : 0;
    return { n, message };
  };
  try {
    ok('Précondition : un produit du banc à CIP de 7 chiffres en stock', !!CIP, CIP);
    for (const lect of ['1', '0']) {
      q(`UPDATE t_parameters SET str_VALUE = '${lect}' WHERE str_KEY = 'KEY_VENTE_LECTURE_GS1'`);
      await nouvellePage();
      await connexion(p, 'admin', 'e2etest');
      await nouvelleVente();
      const r = await scanner(COLLE);
      ok('Vente (lecture GS1 = ' + lect + ') : étiquette Prestige sans séparateur -> produit ajouté', r.n >= 1, JSON.stringify(r));
      if (lect === '1') {
        const r2 = await scanner(AVEC_GS);
        ok('Vente (lecture GS1 = 1) : le même code avec séparateur passe toujours', r2.n === r.n + 1, JSON.stringify(r2));
        await cliquer(p, champ);
        await p.keyboard.press('Control+A'); await p.keyboard.press('Backspace');
        await p.keyboard.type('172701011012345678', { delay: 5 });
        await p.keyboard.press('Enter');
        await p.waitForFunction(() => Ext.Msg.isVisible(), null, { timeout: 15000 }).catch(() => {});
        const m = await texteMessage(p);
        await fermerMessages();
        ok('Vente : un code « date + lot » sans CIP garde son message', /ne contient pas le produit/.test(m || ''), m);
      }
    }
    /* Etiquetage Pro */
    await ouvrirMenu(p, 'GESTION DU STOCK', 'Étiquettage Pro');
    await p.waitForFunction(() => Ext.ComponentQuery.query('#outilLecture').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await cliquer(p, '#outilLecture');
    await p.waitForFunction(() => Ext.ComponentQuery.query('etqlecture #lectureCode').some((x) => x.isVisible(true)), null, { timeout: 30000 });
    await p.waitForTimeout(800);
    await cliquer(p, 'etqlecture #lectureCode');
    await p.keyboard.type(COLLE, { delay: 5 });
    await p.keyboard.press('Enter');
    await p.waitForTimeout(2500);
    const lu = await p.evaluate(() => Ext.ComponentQuery.query('etqlecture #lectureResultat')[0].getEl().dom.textContent);
    ok('Étiquetage Pro : produit de Prestige trouvé (CIP, lot 01, péremption), pas de « ne contient pas le produit »',
      /Dans Prestige/.test(lu) && lu.includes(CIP) && /Lot\s*01/.test(lu) && !/ne contient pas le produit/.test(lu), lu.slice(0, 300));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    for (const id of ventes) {
      if (!p) { break; }
      await p.evaluate((id) => fetch('../api/v1/ventestats/remove/' + id, { method: 'POST' }).then((r) => r.status), id).catch(() => 0);
    }
    await b.close();
    q(`UPDATE t_parameters SET str_VALUE = '${LECTURE}' WHERE str_KEY = 'KEY_VENTE_LECTURE_GS1'`);
    ok('Ventes d\'essai retirées, paramètre remis', q(`SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN ('${ventes.join("','")}') AND str_STATUT <> 'is_Devis' AND b_IS_CANCEL = 0 AND str_STATUT = 'is_Process'`) === '0'
      && q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_VENTE_LECTURE_GS1'") === LECTURE, ventes.join(','));
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
