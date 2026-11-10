/* POINTAGE BL : RELEVE TEDIS (plan du 09/11). Rapprochement par l'ecran, compare ligne par ligne a l'ecran, au PDF
 * d'edition et en base (test de rapprochement), puis bilan avant / apres.
 * Fixture releve-e2e-tedis.pdf (regeneree par ReleveTedisTest.main), mars 2027 (periode vide sur le banc) :
 *   BL 2625920370-BKE  24 534 HT / 27 601 TTC  -> Prestige identique              : RAPPROCHE
 *   BL 2625910091-VRI  34 705                   -> saisi « 26255910091-VRI », meme montant, meme jour : A CONFIRMER
 *   BL 2626011868-VRI   7 718 (« 11 » serres)  -> Prestige identique              : RAPPROCHE (perdu avant le correctif)
 *   BL 2626115106-VRI   7 478 HT / 8 824 TTC   -> Prestige 7 500 HT / 8 824 TTC  : ECART -22 en HT, RAPPROCHE en TTC
 *   AV AV-2627127450-BKE -347 050              -> retour du BL 2626222101 sans reference d'avoir : A CONFIRMER
 *   AV AV-2627127451-BKE   -1 180              -> retour avec la reference d'avoir saisie : RAPPROCHE
 *   PR-ABO 2627337319-BKE  6 356               -> abonnement : IGNOREE
 *   BL 2626222101-BKE (Prestige seul, 791 980) : ABSENT_RELEVE
 * Deroule : import -> reconnaissance (HT Net propose, abonnement ignore) -> « Appliquer » -> statuts ; « Pointer les
 * rapproches » : seuls les RAPPROCHE sont pointes ; nouvel import en TTC (case cochee par clic, colonne Montant TTC).
 */
const { execFileSync } = require('child_process');
const ENV_E2E = require('../outils/poste');
const path = require('path');
const fs = require('fs');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const rangees = (s) => q(s).split(/\r?\n/).filter((x) => x).map((x) => x.split('\t'));
const G = '51217123531215794892', CMD = 'E2E-TED-CMD', FICHIER = 'releve-e2e-tedis.pdf';
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
/* id, reference, date, HT, TTC */
const BLS = [['E2E-TED-1', '2625920370-BKE', '2027-03-16', 24534, 27601], ['E2E-TED-2', '26255910091-VRI', '2027-03-16', 34705, 34705],
  ['E2E-TED-3', '2626011868-VRI', '2027-03-17', 7718, 7718], ['E2E-TED-4', '2626115106-VRI', '2027-03-18', 7500, 8824],
  ['E2E-TED-5', '2626222101-BKE', '2027-03-19', 791980, 791980]];
/* id, BL, date, montant, reference d'avoir */
const RETOURS = [['E2E-TED-R1', 'E2E-TED-5', '2027-03-28', 347050, null], ['E2E-TED-R2', 'E2E-TED-5', '2027-03-29', 1180, 'AV-2627127451-BKE']];
const AVANT = q("SELECT COALESCE((SELECT str_MODELE FROM t_releve_modele WHERE lg_GROSSISTE_ID = '" + G + "'), '')");

function nettoyer() {
  exec("DELETE FROM t_releve_grossiste_ligne WHERE lg_RELEVE_ID IN (SELECT lg_RELEVE_ID FROM t_releve_grossiste WHERE str_FICHIER = '" + FICHIER + "');"
    + "DELETE FROM t_releve_grossiste WHERE str_FICHIER = '" + FICHIER + "';"
    + "DELETE FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID LIKE 'E2E-TED-%';"
    + "DELETE FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID LIKE 'E2E-TED-%';"
    + "DELETE FROM t_order WHERE lg_ORDER_ID = '" + CMD + "';"
    + "DELETE FROM t_releve_modele WHERE lg_GROSSISTE_ID = '" + G + "';");
}

/* releve conserve en base : statut, numero, montant releve, piece, montant piece, ecart, dans l'ordre */
const enBase = (id) => rangees("SELECT str_STATUT, COALESCE(str_NUMERO,''), COALESCE(int_MONTANT_HT,''), COALESCE(lg_PIECE_ID,''),"
  + " COALESCE(int_PIECE_HT,''), COALESCE(int_ECART,'') FROM t_releve_grossiste_ligne WHERE lg_RELEVE_ID = '" + id + "' ORDER BY int_RANG");
const pointes = () => q("SELECT GROUP_CONCAT(x ORDER BY x) FROM (SELECT lg_BON_LIVRAISON_ID x FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID LIKE 'E2E-TED-%' AND dt_POINTAGE IS NOT NULL"
  + " UNION ALL SELECT lg_RETOUR_FRS_ID FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID LIKE 'E2E-TED-%' AND dt_POINTAGE IS NOT NULL) t");

(async () => {
  nettoyer();
  exec("INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)"
    + " VALUES ('" + CMD + "', '" + CMD + "', 0, '" + G + "', '" + ADMIN + "', 'is_Closed', NOW(), NOW(), 0, 1, 0)");
  BLS.forEach(([id, ref, d, ht, ttc]) => exec("INSERT INTO t_bon_livraison (lg_BON_LIVRAISON_ID, str_REF_LIVRAISON, dt_DATE_LIVRAISON, int_MHT, int_TVA, int_HTTC, str_STATUT,"
    + " dt_CREATED, dt_UPDATED, lg_USER_ID, lg_ORDER_ID) VALUES ('" + id + "', '" + ref + "', '" + d + "', " + ht + ", " + (ttc - ht) + ", " + ttc + ", 'is_Closed', NOW(), NOW(), '"
    + ADMIN + "', '" + CMD + "')"));
  RETOURS.forEach(([id, bl, d, m, ref]) => exec("INSERT INTO t_retour_fournisseur (lg_RETOUR_FRS_ID, str_REF_RETOUR_FRS, lg_BON_LIVRAISON_ID, lg_GROSSISTE_ID, lg_USER_ID,"
    + " str_STATUT, dt_DATE, dt_CREATED, dt_UPDATED, dl_AMOUNT, str_REF_AVOIR) VALUES ('" + id + "', '" + id + "', '" + bl + "', '" + G + "', '" + ADMIN + "', 'is_Closed', '"
    + d + "', NOW(), NOW(), " + m + ", " + (ref ? "'" + ref + "'" : 'NULL') + ")"));
  const avant = { bl: q("SELECT COUNT(*) FROM t_bon_livraison WHERE dt_POINTAGE IS NOT NULL"), rf: q("SELECT COUNT(*) FROM t_retour_fournisseur WHERE dt_POINTAGE IS NOT NULL"),
    releves: q("SELECT COUNT(*) FROM t_releve_grossiste"), stock: q("SELECT COALESCE(SUM(int_NUMBER_AVAILABLE),0) FROM t_famille_stock") };
  const { chromium } = require('playwright-core');
  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const err = [];
  p.on('pageerror', (e) => err.push(String(e.message)));
  const E = 'Ext.ComponentQuery.query("pointagebl")[0]';
  const ev = (code) => p.evaluate(new Function('return (' + code + ');'));
  const carte = () => ev(E + '.down("#ongletRapprochement").getLayout().getActiveItem().itemId');
  const cliquer = async (itemId) => { await p.click('#' + await ev(E + '.down("#' + itemId + '").getId()')); };
  const importer = async () => {
    await ev(E + '.releveCourant = null');
    const avantJ = await ev(E + '.jeton || ""');
    const input = await ev(E + '.down("#fichierReleve").fileInputEl.dom.id');
    await p.setInputFiles('#' + input, path.join(__dirname, 'fixtures', FICHIER));
    await p.waitForFunction((a) => { const e = Ext.ComponentQuery.query('pointagebl')[0];
      return (e.jeton && e.jeton !== a) && (e.releveCourant || e.down('#ongletRapprochement').getLayout().getActiveItem().itemId === 'reconnaissance'); }, avantJ, { timeout: 60000 });
    await p.waitForTimeout(1500);
  };
  const info = async () => (await ev(E + '.down("#recoInfo").getEl().dom.textContent')).replace(/(\d)[   .](?=\d{3}\b)/g, '$1 ');
  /* choix d'une colonne par clics : ouvre la liste du champ, clique l'entree de la colonne */
  const choisirClic = async (champ, rang) => {
    const id = await ev(E + '.down("#champ-' + champ + '").getId()');
    await p.click('#' + id + ' .x-form-trigger');
    const texte = await ev(E + '.down("#champ-' + champ + '").getStore().findRecord("rang",' + rang + ').get("libelle")');
    await p.locator('.x-boundlist:visible .x-boundlist-item', { hasText: texte }).first().click();
    await p.waitForTimeout(1500);
  };
  const appliquer = async () => {
    await cliquer('appliquerModele');
    await p.waitForFunction(() => Ext.ComponentQuery.query('pointagebl')[0].releveCourant, null, { timeout: 30000 });
    await p.waitForTimeout(1500);
  };
  /* ecran : statut, numero, montant releve, piece, montant piece, ecart (grille du releve) */
  const aLEcran = () => ev('(function(){return ' + E + '.down("#grilleReleve").getStore().getRange().map(function(r){'
    + 'return [r.get("statut"),r.get("numero")||"",r.get("montantReleve"),r.get("pieceReference")||"",r.get("montantPrestige"),r.get("ecart")||0];});})()');
  const pdf = async (id) => {
    const r = await p.evaluate(async (u) => { const x = await fetch(u); const a = new Uint8Array(await x.arrayBuffer()); let s = ''; a.forEach((c) => { s += String.fromCharCode(c); }); return btoa(s); },
      '/prestige/api/v1/pointage-bl/releve/' + id + '/pdf');
    const f = path.join(ENV_E2E.TMP, 'rapprochement-tedis-' + id.slice(0, 8) + '.pdf');
    fs.writeFileSync(f, Buffer.from(r, 'base64'));
    return execFileSync('pdftotext', ['-layout', f, '-'], { encoding: 'utf8' }).replace(/(\d)[   .](?=\d{3}\b)/g, '$1 ');
  };
  const n = (v) => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  /* rapprochement ecran / PDF / base, ligne par ligne */
  const comparer = async (titre, attendu) => {
    const id = await ev(E + '.releveCourant.id');
    const base = enBase(id);
    const ecran = await aLEcran();
    const texte = await pdf(id);
    ok(titre + ' : statuts en base', JSON.stringify(base.map((x) => x[0] + ':' + x[1])) === JSON.stringify(attendu.map((x) => x[0] + ':' + x[1])),
      JSON.stringify(base.map((x) => x[0] + ':' + x[1])));
    attendu.forEach((a, i) => {
      const bz = base[i] || [], ec = ecran.find((x) => x[0] === a[0] && x[1] === a[1]);
      const pieceB = bz[3] || '';
      ok(titre + ' : ligne ' + (i + 1) + ' ' + a[0] + ' ' + a[1] + ' — base = écran = PDF',
        bz.length && pieceB === (a[2] || '') && String(bz[5] || 0) === String(a[3] || 0)
        && ec && Number(ec[2] || 0) === Number(bz[2] || 0) && Number(ec[4] || 0) === Number(bz[4] || 0) && Number(ec[5] || 0) === Number(bz[5] || 0)
        && (a[0] === 'ABSENT_RELEVE' || texte.indexOf(a[1].split(' ').pop()) >= 0)
        && (!a[3] || texte.indexOf(n(Math.abs(a[3]))) >= 0),
        JSON.stringify({ base: bz, ecran: ec }));
    });
    return { id, base, texte };
  };
  try {
    const { connexion } = require('../outils/vues');
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('pointagebl', 'Pointage BL / avoirs', ''));
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('pointagebl')[0]; return e && e.isVisible() && e.down('#grossiste').getStore().getCount() > 0; }, null, { timeout: 30000 });
    await p.evaluate((g) => { const e = Ext.ComponentQuery.query('pointagebl')[0]; e.down('#du').setValue(new Date(2027, 2, 1)); e.down('#au').setValue(new Date(2027, 2, 31));
      const c = e.down('#grossiste'); c.setValue(g); c.fireEvent('select', c, [c.getStore().findRecord('id', g)]);
      e.down('#ongletsPointage').setActiveTab(e.down('#ongletRapprochement')); }, G);
    await p.waitForTimeout(1500);

    /* 1. import : reconnaissance, HT Net propose, abonnement ignore */
    await importer();
    ok('Relevé TEDIS : panneau de reconnaissance (pas au format standard)', await carte() === 'reconnaissance', await info());
    ok('Montant proposé : HT Net ; ligne à ignorer « ABO » ; TTC décoché',
      /HT Net/.test(await ev(E + '.down("#champ-MONTANT").getRawValue()')) && await ev(E + '.down("#marqueursIgnores").getValue()') === 'ABO' && !(await ev(E + '.down("#montantTtc").getValue()')),
      await ev(E + '.down("#champ-MONTANT").getRawValue()'));
    const i1 = await info();
    ok('Essai : 6 lignes lues, BL 74 435, avoirs -348 230, 1 ignorée', /6 ligne\(s\) lue\(s\) : BL 74 435, avoirs -348 230, 1 ignorée/.test(i1), i1);
    const resumes = await ev(E + '.down("#grilleApercu").getStore().getRange().filter(function(r){return r.get("lu");}).map(function(r){return r.get("resume");})');
    ok('Aperçu : n° 2626011868 lu en entier, abonnement marqué « Ignorée »', resumes.some((x) => /^BL 2626011868 /.test(x)) && resumes.some((x) => /^Ignorée 2627337319/.test(x)), JSON.stringify(resumes));

    /* 2. appliquer : rapprochement HT */
    await appliquer();
    const HT = [['RAPPROCHE', '2625920370', 'E2E-TED-1', 0], ['PROBABLE', '2625910091', 'E2E-TED-2', 0], ['RAPPROCHE', '2626011868', 'E2E-TED-3', 0],
      ['ECART', '2626115106', 'E2E-TED-4', -22], ['PROBABLE', '2627127450', 'E2E-TED-R1', 0], ['RAPPROCHE', '2627127451', 'E2E-TED-R2', 0],
      ['ABSENT_RELEVE', '', 'E2E-TED-5', 0], ['IGNOREE', '2627337319', '', 0]];
    const r1 = await comparer('HT', HT);
    ok('PDF : statuts « À confirmer » et « Ignorée (pas une livraison) » imprimés', /À confirmer/.test(r1.texte) && /Ignorée \(pas une livraison\)/.test(r1.texte), r1.texte.slice(0, 300));
    const cpt = await ev(E + '.releveCourant.compteurs');
    ok('Compteurs : 3 rapprochés, 1 écart, 2 à confirmer, 1 absent du relevé, 1 ignorée, 0 absent chez nous',
      cpt.RAPPROCHE === 3 && cpt.ECART === 1 && cpt.PROBABLE === 2 && cpt.ABSENT_RELEVE === 1 && cpt.IGNOREE === 1 && cpt.ABSENT_PRESTIGE === 0, JSON.stringify(cpt));
    const tot = rangees("SELECT int_LIGNES, int_TOTAL_BL, int_TOTAL_AVOIRS FROM t_releve_grossiste WHERE lg_RELEVE_ID = '" + r1.id + "'")[0];
    ok('Relevé en base : 6 lignes, totaux BL 74 435 et avoirs -348 230 (abonnement exclu)', tot.join('|') === '6|74435|-348230', tot.join('|'));
    const modele = q("SELECT str_MODELE FROM t_releve_modele WHERE lg_GROSSISTE_ID = '" + G + "'");
    ok('Réglage mémorisé : lignes ignorées « ABO », montant HT', /"marqueursIgnores":"ABO"/.test(modele) && /"montantTtc":false/.test(modele), modele);

    /* 3. pointer les rapproches : seuls les RAPPROCHE (jamais les « a confirmer ») */
    const btn = await ev(E + '.down("#pointerRapproches").getId()');
    await p.click('#' + btn);
    const arme = await ev('Ext.getCmp("' + btn + '").getText()');
    ok('Premier clic : confirmation dans le bouton (rouge), aucune fenêtre', /Confirmer : pointer 3 pièce/.test(arme) && !(await ev('Ext.MessageBox.isVisible()'))
      && /192, 57, 43|c0392b/i.test(await p.evaluate((id) => document.getElementById(id).style.background + ' ' + document.getElementById(id).style.backgroundColor, btn)), arme);
    ok('Rien n\'est pointé avant le second clic', ['', 'NULL'].includes(pointes()), pointes());
    await p.waitForTimeout(600);
    await p.click('#' + btn);
    await p.waitForTimeout(2500);
    ok('Résultat en avis non bloquant, sans fenêtre', !(await ev('Ext.MessageBox.isVisible()')) && await p.locator('.prestige-toast').count() > 0);
    ok('Pointage : seuls E2E-TED-1, E2E-TED-3 et E2E-TED-R2 pointés', pointes() === 'E2E-TED-1,E2E-TED-3,E2E-TED-R2', pointes());

    /* 4. nouvel import en TTC (case cochee par clic, colonne Montant TTC) */
    await cliquer('reglerColonnes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('pointagebl')[0].down('#ongletRapprochement').getLayout().getActiveItem().itemId === 'reconnaissance', null, { timeout: 15000 });
    await p.waitForTimeout(1500);
    const rangTtc = await ev('(function(){var s=' + E + '.down("#champ-MONTANT").getStore(),r=-1;s.each(function(x){if(/TTC/.test(x.get("libelle")))r=x.get("rang");});return r;})()');
    await choisirClic('MONTANT', rangTtc);
    await p.click('#' + await ev(E + '.down("#montantTtc").inputEl.dom.id'));
    await p.waitForTimeout(1500);
    ok('Case « TTC » cochée par clic', await ev(E + '.down("#montantTtc").getValue()'));
    await appliquer();
    const TTC = [['RAPPROCHE', '2625920370', 'E2E-TED-1', 0], ['PROBABLE', '2625910091', 'E2E-TED-2', 0], ['RAPPROCHE', '2626011868', 'E2E-TED-3', 0],
      ['RAPPROCHE', '2626115106', 'E2E-TED-4', 0], ['PROBABLE', '2627127450', 'E2E-TED-R1', 0], ['RAPPROCHE', '2627127451', 'E2E-TED-R2', 0],
      ['ABSENT_RELEVE', '', 'E2E-TED-5', 0], ['IGNOREE', '2627337319', '', 0]];
    const r2 = await comparer('TTC', TTC);
    ok('TTC : montant Prestige de 2626115106 = 8 824 (TTC du BL), sans écart', r2.base[3][4] === '8824' && r2.base[3][2] === '8824', JSON.stringify(r2.base[3]));
    ok('Réglage mémorisé en TTC', /"montantTtc":true/.test(q("SELECT str_MODELE FROM t_releve_modele WHERE lg_GROSSISTE_ID = '" + G + "'")));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Déroulement du test', false, e.stack || e);
  } finally {
    await b.close();
    /* bilan : 2 releves conserves, 3 pieces pointees, aucun autre pointage, stock inchange */
    ok('Bilan : 2 relevés conservés, rien d\'autre pointé, stock inchangé',
      Number(q("SELECT COUNT(*) FROM t_releve_grossiste")) === Number(avant.releves) + 2
      && Number(q("SELECT COUNT(*) FROM t_bon_livraison WHERE dt_POINTAGE IS NOT NULL")) === Number(avant.bl) + 2
      && Number(q("SELECT COUNT(*) FROM t_retour_fournisseur WHERE dt_POINTAGE IS NOT NULL")) === Number(avant.rf) + 1
      && q("SELECT COALESCE(SUM(int_NUMBER_AVAILABLE),0) FROM t_famille_stock") === avant.stock);
    nettoyer();
    if (AVANT) {
      exec("INSERT INTO t_releve_modele (lg_GROSSISTE_ID, str_MODELE, dt_UPDATED) VALUES ('" + G + "', '" + AVANT.replace(/'/g, "''") + "', NOW())");
    }
    ok('Jeu d\'essai retiré', q("SELECT COUNT(*) FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID LIKE 'E2E-TED-%'") === '0'
      && q("SELECT COUNT(*) FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID LIKE 'E2E-TED-%'") === '0'
      && q("SELECT COUNT(*) FROM t_releve_grossiste WHERE str_FICHIER = '" + FICHIER + "'") === '0');
    const k = res.filter((r) => r.c).length;
    console.log('\n' + k + '/' + res.length + ' OK');
    process.exit(k === res.length ? 0 : 1);
  }
})();
