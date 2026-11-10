/* POINTAGE BL : RELEVES COPHARMED ET TEDIS (plan du 09/11).
 * Jeu d'essai (retire a la fin), octobre 2026 :
 *   Copharmed : BL 10-298560-00 (HT 124 603, TTC 144 218), 30-298560-00 (HT 50 000, TTC 57 400), 20401627-00 saisi
 *     sans tiret (TTC 88 000 : ecart de 120), 10-298999-00 (absent du releve) ;
 *   TEDIS : BL 2627120001-BKE (45 300), avoirs AV-2627127450-BKE (15 000) et « AV 2627127451 BKE » (7 000 : ecart 200).
 * Releves PDF (fixtures, regenerees par ReleveFormatsGrossistesTest.main) : releve-e2e-copharmed.pdf (N° avec agence,
 * montant TTC, un avoir non saisi) ; releve-e2e-tedis.pdf (une facture, une ligne PR-ABO, deux avoirs par leur numero).
 *  - Copharmed : colonnes reconnues, case « Montant du releve en TTC » cochee d'un clic, appliquer : 10- et 30- ne sont
 *    pas confondus, compare au TTC, 20401627-00 = 20-401627-00 ; reglage memorise avec le TTC ;
 *  - TEDIS : PR-ABO ignoree, avoirs rapproches par leur propre numero ;
 *  - rapprochement ecran / base ligne par ligne ; bilan : autant de lignes en base que de lignes a l'ecran ;
 *  - nouvel import Copharmed : lu avec le reglage memorise, toujours en TTC ;
 *  - aucune erreur JavaScript ; jeu d'essai retire.
 */
const { execFileSync } = require('child_process');
const ENV_E2E = require('../outils/poste');
const { connexion } = require('../outils/vues');
const path = require('path');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const COP = '51217123424022365243', TED = '51217123531215794892';
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const BLS = [[COP, 'E2E-PFG-C1', '10-298560-00', '2026-10-06', 124603, 144218], [COP, 'E2E-PFG-C2', '30-298560-00', '2026-10-07', 50000, 57400],
  [COP, 'E2E-PFG-C3', '20401627-00', '2026-10-15', 75000, 88000], [COP, 'E2E-PFG-C4', '10-298999-00', '2026-10-10', 30000, 34500],
  [TED, 'E2E-PFG-T1', '2627120001-BKE', '2026-10-05', 45300, 52000]];
const AVOIRS = [['E2E-PFG-R1', 'AV-2627127450-BKE', '2026-10-12', 15000], ['E2E-PFG-R2', 'AV 2627127451 BKE', '2026-10-14', 7000]];
/* reglages deja presents (banc) : gardes et remis a la fin */
const avant = (g) => q("SELECT COALESCE((SELECT str_MODELE FROM t_releve_modele WHERE lg_GROSSISTE_ID = '" + g + "'), '')");
const AVANT = { [COP]: avant(COP), [TED]: avant(TED) };
const FICHIERS = "('releve-e2e-copharmed.pdf', 'releve-e2e-tedis.pdf')";

function nettoyer() {
  exec("DELETE FROM t_releve_grossiste_ligne WHERE lg_RELEVE_ID IN (SELECT lg_RELEVE_ID FROM t_releve_grossiste WHERE str_FICHIER IN " + FICHIERS + ");"
    + "DELETE FROM t_releve_grossiste WHERE str_FICHIER IN " + FICHIERS + ";"
    + "DELETE FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID LIKE 'E2E-PFG-%';"
    + "DELETE FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID LIKE 'E2E-PFG-%';"
    + "DELETE FROM t_order WHERE lg_ORDER_ID LIKE 'E2E-PFG-CMD-%';"
    + "DELETE FROM t_releve_modele WHERE lg_GROSSISTE_ID IN ('" + COP + "', '" + TED + "');");
}

(async () => {
  nettoyer();
  [COP, TED].forEach((g) => exec("INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)"
    + " VALUES ('E2E-PFG-CMD-" + (g === COP ? 'C' : 'T') + "', 'E2E-PFG-CMD', 0, '" + g + "', '" + ADMIN + "', 'is_Closed', NOW(), NOW(), 0, 1, 0)"));
  BLS.forEach(([g, id, ref, d, ht, ttc]) => exec("INSERT INTO t_bon_livraison (lg_BON_LIVRAISON_ID, str_REF_LIVRAISON, dt_DATE_LIVRAISON, int_MHT, int_TVA, int_HTTC, str_STATUT,"
    + " dt_CREATED, dt_UPDATED, lg_USER_ID, lg_ORDER_ID) VALUES ('" + id + "', '" + ref + "', '" + d + "', " + ht + ", " + (ttc - ht) + ", " + ttc + ", 'is_Closed', NOW(), NOW(), '"
    + ADMIN + "', 'E2E-PFG-CMD-" + (g === COP ? 'C' : 'T') + "')"));
  AVOIRS.forEach(([id, ref, d, ht]) => exec("INSERT INTO t_retour_fournisseur (lg_RETOUR_FRS_ID, str_REF_RETOUR_FRS, dt_DATE, str_STATUT, dt_CREATED, dt_UPDATED, dl_AMOUNT,"
    + " lg_USER_ID, lg_GROSSISTE_ID, lg_BON_LIVRAISON_ID, str_REF_AVOIR, dt_AVOIR, int_AVOIR_HT) VALUES ('" + id + "', '" + id + "', '" + d + "', 'is_Closed', NOW(), NOW(), " + ht
    + ", '" + ADMIN + "', '" + TED + "', 'E2E-PFG-T1', '" + ref + "', '" + d + "', " + ht + ")"));
  const { chromium } = require('playwright-core');
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const err = [];
  p.on('pageerror', (e) => err.push(String(e.message)));
  const E = 'Ext.ComponentQuery.query("pointagebl")[0]';
  const ev = (code) => p.evaluate(new Function('return (' + code + ');'));
  const carte = () => ev(E + '.down("#ongletRapprochement").getLayout().getActiveItem().itemId');
  const cliquer = async (sel, el) => p.click('#' + await ev(E + '.down("' + sel + '").' + (el || 'btnEl') + '.dom.id'));
  const choisirGrossiste = async (g) => {
    await p.evaluate((x) => { const e = Ext.ComponentQuery.query('pointagebl')[0]; e.down('#du').setValue(new Date(2026, 9, 1)); e.down('#au').setValue(new Date(2026, 9, 31));
      const c = e.down('#grossiste'); c.setValue(x); c.fireEvent('select', c, [c.getStore().findRecord('id', x)]);
      e.down('#ongletsPointage').setActiveTab(e.down('#ongletRapprochement')); }, g);
    await p.waitForTimeout(1500);
  };
  const importer = async (fichier) => {
    await ev(E + '.releveCourant = null');
    const avantJeton = await ev(E + '.jeton || ""');
    await p.setInputFiles('#' + await ev(E + '.down("#fichierReleve").fileInputEl.dom.id'), path.join(__dirname, 'fixtures', fichier));
    await p.waitForFunction((a) => { const e = Ext.ComponentQuery.query('pointagebl')[0];
      return (e.jeton && e.jeton !== a) && (e.releveCourant || e.down('#ongletRapprochement').getLayout().getActiveItem().itemId === 'reconnaissance')
        || (Ext.MessageBox.isVisible() && !/Lecture du relevé/.test(Ext.MessageBox.msg.getEl().dom.textContent)); }, avantJeton, { timeout: 60000 });
    await p.waitForTimeout(1500);
  };
  const appliquer = async () => {
    await cliquer('#appliquerModele');
    await p.waitForFunction(() => Ext.ComponentQuery.query('pointagebl')[0].releveCourant, null, { timeout: 30000 });
    await p.waitForTimeout(1500);
  };
  /* le banc a d'autres BL du mois : seules les pieces du jeu d'essai comptent parmi les absentes du releve */
  const NOS = BLS.map((x) => x[2]);
  const nos = (l) => l.filter((x) => !/^ABSENT_RELEVE:/.test(x) || NOS.includes(x.split(':').pop()));
  const ecranBrut = () => ev('(function(){var o=' + E + '.releveCourant;return {lecture:o.lecture,lignes:o.data.map(function(x){return [x.statut,x.numero||"",x.ecart||0,x.pieceReference||""].join(":")}).sort()};})()');
  /* lignes du dernier releve de ce fichier, en base, meme forme que l'ecran */
  const base = (fichier) => nos(q("SELECT CONCAT_WS(':', l.str_STATUT, COALESCE(l.str_NUMERO, ''), COALESCE(l.int_ECART, 0), COALESCE(l.str_PIECE_REF, ''))"
    + " FROM t_releve_grossiste_ligne l WHERE l.lg_RELEVE_ID = (SELECT lg_RELEVE_ID FROM t_releve_grossiste WHERE str_FICHIER = '" + fichier + "' ORDER BY dt_IMPORT DESC LIMIT 1)")
    .split(/\r?\n/).map((x) => x.trim()).filter(Boolean).sort());
  const ecran = async () => { const o = await ecranBrut(); o.tous = o.lignes; o.lignes = nos(o.lignes); return o; };
  const ligneBase = (fichier, numero) => q("SELECT CONCAT_WS(':', l.str_STATUT, l.int_MONTANT_HT, COALESCE(l.int_PIECE_HT, ''), COALESCE(l.lg_PIECE_ID, ''))"
    + " FROM t_releve_grossiste_ligne l WHERE l.str_NUMERO = '" + numero + "' AND l.lg_RELEVE_ID = (SELECT lg_RELEVE_ID FROM t_releve_grossiste WHERE str_FICHIER = '"
    + fichier + "' ORDER BY dt_IMPORT DESC LIMIT 1)");
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('pointagebl', 'Pointage BL / avoirs', ''));
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('pointagebl')[0]; return e && e.isVisible() && e.down('#grossiste').getStore().getCount() > 0; }, null, { timeout: 30000 });

    /* 1. Copharmed : agence et TTC */
    await choisirGrossiste(COP);
    await importer('releve-e2e-copharmed.pdf');
    ok('Copharmed : reconnaissance des colonnes proposée', await carte() === 'reconnaissance', await carte());
    ok('Case « Montant du relevé en TTC » décochée par défaut', (await ev(E + '.down("#montantTtc").getValue()')) === false);
    await cliquer('#montantTtc', 'inputEl');
    ok('Case TTC cochée d\'un clic', (await ev(E + '.down("#montantTtc").getValue()')) === true);
    await appliquer();
    let e = await ecran();
    const attendu = ['ABSENT_PRESTIGE:10-298561-00:0:', 'ABSENT_RELEVE::0:10-298999-00', 'ECART:20-401627-00:120:20401627-00',
      'RAPPROCHE:10-298560-00:0:10-298560-00', 'RAPPROCHE:30-298560-00:0:30-298560-00'].sort();
    ok('Copharmed : 10- et 30- distincts, comparés au TTC, 20401627-00 = 20-401627-00 (écart 120), avoir non saisi, BL absent du relevé',
      JSON.stringify(e.lignes) === JSON.stringify(attendu), JSON.stringify(e.lignes));
    ok('Rapprochement écran / base, ligne par ligne (Copharmed)', JSON.stringify(base('releve-e2e-copharmed.pdf')) === JSON.stringify(e.lignes)
      && q("SELECT COUNT(*) FROM t_releve_grossiste_ligne WHERE lg_RELEVE_ID = (SELECT lg_RELEVE_ID FROM t_releve_grossiste WHERE str_FICHIER = 'releve-e2e-copharmed.pdf' ORDER BY dt_IMPORT DESC LIMIT 1)") === String(e.tous.length),
      JSON.stringify(base('releve-e2e-copharmed.pdf')));
    ok('Base : 10-298560-00 rapproché au TTC (144 218 = 144 218) sur la bonne pièce',
      ligneBase('releve-e2e-copharmed.pdf', '10-298560-00') === 'RAPPROCHE:144218:144218:E2E-PFG-C1', ligneBase('releve-e2e-copharmed.pdf', '10-298560-00'));
    ok('Base : 30-298560-00 sur sa propre pièce', ligneBase('releve-e2e-copharmed.pdf', '30-298560-00') === 'RAPPROCHE:57400:57400:E2E-PFG-C2',
      ligneBase('releve-e2e-copharmed.pdf', '30-298560-00'));
    ok('Bilan : un seul relevé Copharmed, 5 lignes du jeu de test', q("SELECT COUNT(*) FROM t_releve_grossiste WHERE str_FICHIER = 'releve-e2e-copharmed.pdf'") === '1'
      && base('releve-e2e-copharmed.pdf').length === 5);
    const m = q("SELECT str_MODELE FROM t_releve_modele WHERE lg_GROSSISTE_ID = '" + COP + "'");
    ok('Réglage Copharmed mémorisé avec le TTC', /"montantTtc":true/.test(m), m);
    ok('Pièces Prestige inchangées (pas de pointage par l\'import)', q("SELECT COUNT(*) FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID LIKE 'E2E-PFG-%' AND dt_POINTAGE IS NOT NULL") === '0');

    /* 2. nouvel import : reglage memorise, toujours en TTC */
    await importer('releve-e2e-copharmed.pdf');
    e = await ecran();
    ok('Nouvel import Copharmed : réglage mémorisé, même résultat en TTC', e.lecture === 'MODELE' && JSON.stringify(e.lignes) === JSON.stringify(attendu), JSON.stringify(e));

    /* 3. TEDIS : PR-ABO et avoirs par leur numero */
    await choisirGrossiste(TED);
    await importer('releve-e2e-tedis.pdf');
    ok('TEDIS : reconnaissance proposée, case TTC décochée', await carte() === 'reconnaissance' && (await ev(E + '.down("#montantTtc").getValue()')) === false);
    await appliquer();
    e = await ecran();
    const attenduT = ['ECART:2627127451:200:2627120001-BKE', 'RAPPROCHE:2627120001:0:2627120001-BKE', 'RAPPROCHE:2627127450:0:2627120001-BKE'].sort();
    ok('TEDIS : PR-ABO ignorée, avoirs rapprochés par leur propre numéro (écart 200 signalé)', JSON.stringify(e.lignes) === JSON.stringify(attenduT), JSON.stringify(e.lignes));
    ok('Rapprochement écran / base, ligne par ligne (TEDIS)', JSON.stringify(base('releve-e2e-tedis.pdf')) === JSON.stringify(e.lignes)
      && q("SELECT COUNT(*) FROM t_releve_grossiste_ligne WHERE lg_RELEVE_ID = (SELECT lg_RELEVE_ID FROM t_releve_grossiste WHERE str_FICHIER = 'releve-e2e-tedis.pdf' ORDER BY dt_IMPORT DESC LIMIT 1)") === String(e.tous.length), JSON.stringify(base('releve-e2e-tedis.pdf')));
    ok('Base : avoir AV-2627127450-BKE sur le bon retour, en HT', ligneBase('releve-e2e-tedis.pdf', '2627127450') === 'RAPPROCHE:-15000:-15000:E2E-PFG-R1',
      ligneBase('releve-e2e-tedis.pdf', '2627127450'));
    ok('Réglage TEDIS sans TTC', !/montantTtc/.test(q("SELECT str_MODELE FROM t_releve_modele WHERE lg_GROSSISTE_ID = '" + TED + "'")));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Déroulement du test', false, x.stack || x);
  } finally {
    await b.close();
    nettoyer();
    Object.keys(AVANT).filter((g) => AVANT[g]).forEach((g) => exec("INSERT INTO t_releve_modele (lg_GROSSISTE_ID, str_MODELE, dt_UPDATED) VALUES ('" + g + "', '"
      + AVANT[g].replace(/'/g, "''") + "', NOW())"));
    ok('Jeu d\'essai retiré', q("SELECT COUNT(*) FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID LIKE 'E2E-PFG-%'") === '0'
      && q("SELECT COUNT(*) FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID LIKE 'E2E-PFG-%'") === '0'
      && q("SELECT COUNT(*) FROM t_releve_grossiste WHERE str_FICHIER IN " + FICHIERS) === '0');
    const n = res.filter((r) => r.c).length;
    console.log('\n' + n + '/' + res.length + ' OK');
    process.exit(n === res.length ? 0 : 1);
  }
})();
