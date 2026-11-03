/* Audit 05 (LI-01..08) et notice litiges (L1..L5), par l'ecran « Litiges tiers payant » (clics de l'utilisateur) :
 *  - creation : le dossier se choisit dans une liste reelle (LI-04), le litige est complet (type, montants, date, statut,
 *    dossier lie : LI-01, LI-06, L1) et le dossier sort de la facturation (is_Litige) ;
 *  - un dossier deja en litige n'est plus propose (L4) ;
 *  - annulation par l'icone, confirmee dans l'icone : litige annule, dossier remis comme avant (LI-03, L2) ;
 *  - cloture avec remboursement : montant superieur a la part refuse a l'ecran ; montant accepte : part ramenee au montant
 *    accorde, dossier refacturable, encours du compte diminue de l'ecart, litige clos et non rejouable (LI-02, L2, L3) ;
 *  - cloture sans remboursement : motif exige, dossier sorti de la facturation, reste 0 (L3) ;
 *  - filtres de la liste (LI-05) et fenetre de detail remplie (LI-08).
 * Donnees : un dossier tiers payant non facture de la base de test ; son etat est remis et les litiges d'essai retires.
 * Lancement seul : node src/test/e2e/audits/test-ecran-litiges.js
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const URL = process.env.BASE || 'http://localhost:8080/prestige';
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });

/* dossier non facture, vente cloturee non annulee, part >= 1000, compte client avec encours, hors litige */
const ligne = q("SELECT CONCAT_WS('|', c.lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID, p.str_REF, c.int_PRICE, IFNULL(c.int_PRICE_RESTE, 'NULL'),"
  + " cc.lg_COMPTE_CLIENT_TIERS_PAYANT_ID, IFNULL(cc.db_CONSOMMATION_MENSUELLE, 'NULL'), IFNULL(cc.b_CANBEUSE + 0, 'NULL'))"
  + " FROM t_preenregistrement_compte_client_tiers_payent c"
  + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = c.lg_PREENREGISTREMENT_ID"
  + " JOIN t_compte_client_tiers_payant cc ON cc.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = c.lg_COMPTE_CLIENT_TIERS_PAYANT_ID"
  + " WHERE c.str_STATUT_FACTURE = 'unpaid' AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0"
  + " AND c.int_PRICE >= 1000 AND IFNULL(cc.db_CONSOMMATION_MENSUELLE, 0) >= c.int_PRICE AND p.str_REF IS NOT NULL"
  + " AND NOT EXISTS (SELECT 1 FROM t_preenregistrement_compte_client_tiers_payent c2"
  + "   WHERE c2.lg_PREENREGISTREMENT_ID = c.lg_PREENREGISTREMENT_ID AND c2.lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID <> c.lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID)"
  + " ORDER BY p.dt_UPDATED DESC LIMIT 1");
const [DOSSIER, REF, PART, RESTE, COMPTE, CONSO, PEUT] = ligne.split('|');
/* nom de l'organisme (pas une donnee nominative) : il se choisit avant le dossier */
const TP = DOSSIER ? q(`SELECT tp.str_FULLNAME FROM t_compte_client_tiers_payant cc JOIN t_tiers_payant tp ON tp.lg_TIERS_PAYANT_ID = cc.lg_TIERS_PAYANT_ID WHERE cc.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = '${COMPTE}'`) : '';
const etatDossier = () => q(`SELECT CONCAT_WS(' ', str_STATUT_FACTURE, int_PRICE, IFNULL(int_PRICE_RESTE, 'NULL'), dt_UPDATED) FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID = '${DOSSIER}'`);
const conso = () => q(`SELECT IFNULL(db_CONSOMMATION_MENSUELLE, 'NULL') FROM t_compte_client_tiers_payant WHERE lg_COMPTE_CLIENT_TIERS_PAYANT_ID = '${COMPTE}'`);
const litiges = (cond) => q(`SELECT COUNT(*) FROM t_litige WHERE lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID = '${DOSSIER}'${cond ? ' AND ' + cond : ''}`);
const nul = (v) => (v === 'NULL' || v === undefined ? 'NULL' : v);
function remettre() {
  exec(`DELETE FROM t_litige WHERE lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID = '${DOSSIER}';`
    + `UPDATE t_preenregistrement_compte_client_tiers_payent SET str_STATUT_FACTURE = 'unpaid', int_PRICE = ${PART}, int_PRICE_RESTE = ${nul(RESTE)}`
    + ` WHERE lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID = '${DOSSIER}';`
    + `UPDATE t_compte_client_tiers_payant SET db_CONSOMMATION_MENSUELLE = ${nul(CONSO)}, b_CANBEUSE = ${nul(PEUT)}`
    + ` WHERE lg_COMPTE_CLIENT_TIERS_PAYANT_ID = '${COMPTE}';`);
}

(async () => {
  ok('Précondition : un dossier tiers payant non facturé', !!DOSSIER && !!REF, REF + ' part ' + PART);
  if (!DOSSIER) { process.exit(1); }
  const avant = etatDossier();
  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  try {
    const ctx = await b.newContext({ viewport: { width: 1600, height: 950 } });
    const p = await ctx.newPage();
    ctx.on('page', (pop) => { if (pop !== p) { pop.close().catch(() => {}); } });
    p.on('pageerror', (e) => err.push(e.message));
    await p.goto(URL + '/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
    const m = p.locator('text=Masquer').filter({ visible: true }).first();
    if (await m.count()) { await m.click().catch(() => {}); }

    const message = async () => {
      await p.waitForFunction(() => Ext.Msg.isVisible() && !/patienter|Chargement/i.test(Ext.Msg.msg.getEl().dom.innerText), null, { timeout: 30000 });
      const t = await p.evaluate(() => Ext.Msg.msg.getEl().dom.innerText);
      await p.evaluate(() => { const x = Ext.Msg.down('button[itemId=ok]'); if (x) { x.btnEl.dom.click(); } });
      await p.waitForTimeout(400);
      return t.replace(/\s+/g, ' ');
    };
    const attendreListe = async () => {
      await p.waitForFunction(() => Ext.getCmp('litigeID') && !Ext.getCmp('litigeID').getStore().isLoading(), null, { timeout: 30000 });
      await p.waitForTimeout(400);
    };
    const filtre = async (libelle) => {
      await p.locator('#litigeID [id^=combobox] .x-form-trigger').first().click();
      await p.locator('.x-boundlist:visible .x-boundlist-item').filter({ hasText: libelle }).first().click();
      await attendreListe();
    };
    const rechercher = async (texte) => {
      const champ = p.locator('#litigeID input[placeholder^="Vente, bon"], #litigeID input').filter({ visible: true }).nth(2);
      await champ.fill(texte); await champ.press('Enter');
      await attendreListe();
    };
    const rangee = async () => {
      const i = await p.evaluate((d) => Ext.getCmp('litigeID').getStore().findExact('lg_DOSSIER_ID', d), DOSSIER);
      return i < 0 ? null : p.locator('#litigeID .x-grid-row').nth(i);
    };

    /* creation par l'ecran : dossier choisi dans la liste, montant conteste, type */
    const creer = async () => {
      await p.locator('#litigeID').getByText('Créer', { exact: true }).click();
      await p.waitForFunction(() => Ext.getCmp('AjoutLitige') && Ext.getCmp('AjoutLitige').isVisible(), null, { timeout: 15000 });
      const fen = p.locator('#AjoutLitige');
      const tp = await p.evaluate(() => Ext.getCmp('AjoutLitige').down('#litigeTiersPayant').id);
      await p.locator('#' + tp + '-inputEl').click();
      await p.locator('#' + tp + '-inputEl').pressSequentially(TP.slice(0, 6), { delay: 40 });
      await p.locator('.x-boundlist:visible .x-boundlist-item').filter({ hasText: TP }).first().click({ timeout: 20000 });
      await p.waitForTimeout(300);
      const dossier = await p.evaluate(() => Ext.getCmp('AjoutLitige').down('#litigeDossier').id);
      await p.locator('#' + dossier + '-inputEl').click();
      await p.locator('#' + dossier + '-inputEl').pressSequentially(REF, { delay: 30 });
      const item = p.locator('.x-boundlist:visible .x-boundlist-item').filter({ hasText: REF });
      await item.first().waitFor({ timeout: 20000 }).catch(() => {});
      return { fen, item };
    };
    const choisirType = async () => {
      const type = await p.evaluate(() => Ext.getCmp('AjoutLitige').down('#litigeType').id);
      await p.locator('#' + type + ' .x-form-trigger').first().click();
      await p.locator('.x-boundlist:visible .x-boundlist-item').filter({ hasText: 'Bon refusé' }).first().click();
    };
    const montantChamp = async (fenetre, itemId) => p.locator('#' + await p.evaluate(([f, i]) => Ext.getCmp(f).down('#' + i).id, [fenetre, itemId]) + '-inputEl');

    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('litige', 'Litiges', ''));
    await p.waitForFunction(() => Ext.getCmp('litigeID') && Ext.getCmp('litigeID').isVisible(true), null, { timeout: 30000 });
    await attendreListe();

    let c = await creer();
    ok('LI-04 : le dossier de la vente se choisit dans une liste réelle', await c.item.count() > 0, REF);
    await c.item.first().click();
    const montant = await montantChamp('AjoutLitige', 'litigeMontant');
    await montant.fill(String(Number(PART) + 1));
    await choisirType();
    await c.fen.getByText('Enregistrer', { exact: true }).click();
    const refus = await message();
    ok('L3 : montant contesté au-delà de la part refusé à l’écran, rien d’enregistré', /au plus la part/i.test(refus) && litiges() === '0', refus);
    await montant.fill(String(Number(PART) - 200));
    const rep = p.waitForResponse((r) => r.url().includes('/api/v1/litiges/create'), { timeout: 15000 });
    await c.fen.getByText('Enregistrer', { exact: true }).click();
    await rep;
    const t1 = await message();
    const lit = q(`SELECT CONCAT_WS('|', str_STATUT, lg_TYPELITIGE_ID, int_AMOUNT_TOTAL_LITIGE, int_AMOUNT_DUS_LITIGE, str_REFERENCE_VENTE_LITIGE, dt_CREATED_LITIGE IS NOT NULL, str_STATUT_FACTURE_AVANT, lg_USER_ID IS NOT NULL) FROM t_litige WHERE lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID = '${DOSSIER}'`);
    ok('LI-01, LI-06, L1 : litige complet (statut, type, part, contesté, vente, date, état d’avant, auteur)',
      lit === ['enable', 'TL-BON-REFUSE', PART, Number(PART) - 200, REF, '1', 'unpaid', '1'].join('|'), lit + ' ; ' + t1);
    ok('L1 : le dossier sort de la facturation (is_Litige), sa date ne change pas (période de facturation)',
      etatDossier() === avant.replace(/^unpaid/, 'is_Litige'), etatDossier() + ' / ' + avant);
    await attendreListe();
    await rechercher(REF);
    const r1 = await rangee();
    ok('LI-05 : la recherche trouve le litige ouvert', !!r1 && /Ouvert/.test(await r1.innerText()), r1 ? await r1.innerText() : 'absent');

    /* L4 : le dossier en litige n'est plus propose */
    c = await creer();
    ok('L4 : un dossier déjà en litige n’est plus proposé', await c.item.count() === 0);
    await p.evaluate(() => Ext.getCmp('AjoutLitige').close());

    /* LI-03, L2 : annulation par l'icone, confirmee dans l'icone */
    await (await rangee()).locator('img[data-qtip^="Annuler le litige"]').first().click();
    await p.waitForTimeout(600);
    const rAnnul = p.waitForResponse((r) => r.url().includes('/annuler'), { timeout: 15000 });
    await p.locator('.prestige-confirmer-icone').first().click();
    await rAnnul;
    await attendreListe();
    ok('LI-03, L2 : annulation réelle : litige annulé, dossier remis exactement comme avant',
      litiges("str_STATUT = 'delete'") === '1' && etatDossier() === avant, etatDossier() + ' / ' + avant);
    ok('LI-05 : le filtre « Litiges ouverts » ne montre plus le litige annulé', await rangee() === null);
    await filtre('Annulés');
    ok('LI-05 : le filtre « Annulés » le montre', await rangee() !== null);
    await filtre('Litiges ouverts');

    /* cloture avec remboursement */
    c = await creer();
    await c.item.first().click();
    await choisirType();
    await c.fen.getByText('Enregistrer', { exact: true }).click();
    await message();
    await attendreListe();
    const consoAvant = Number(conso());
    await (await rangee()).locator('img[data-qtip^="D"]').first().click();
    await p.waitForFunction(() => Ext.getCmp('detailtransactionlitigeID') && Ext.getCmp('detailtransactionlitigeID').down('#btnCloturer').isVisible(), null, { timeout: 15000 });
    const det = await p.evaluate(() => { const w = Ext.getCmp('detailtransactionlitigeID'); return [w.down('#dVente').getValue(), w.down('#dPart').getValue(), w.down('grid').getStore().getCount()].join(' | '); });
    ok('LI-08 : la fenêtre de détail est remplie (vente, part, lignes de la vente)', det.includes(REF) && /\| [1-9]\d*$/.test(det), det);
    const accord = await montantChamp('detailtransactionlitigeID', 'clotureMontant');
    const btn = p.locator('#detailtransactionlitigeID').getByText('Clôturer', { exact: true });
    await accord.fill(String(Number(PART) + 5));
    await btn.click();
    const tx = await message();
    ok('L3 : montant accordé supérieur à la part d’origine refusé', /au plus la part/i.test(tx) && litiges("str_STATUT = 'enable'") === '1', tx);
    await accord.fill(String(Number(PART) - 300));
    await btn.click();
    await p.waitForTimeout(600);
    const rClot = p.waitForResponse((r) => r.url().includes('/cloturer'), { timeout: 15000 });
    await p.locator('#detailtransactionlitigeID').getByText('Confirmer la clôture ?').click();
    await rClot;
    const t2 = await message();
    const d2 = etatDossier().split(' ');
    ok('L2, L3 : clôture avec remboursement : dossier refacturable au montant accordé, litige clos avec l’écart',
      d2[0] === 'unpaid' && d2[1] === String(Number(PART) - 300) && d2[2] === String(Number(PART) - 300)
        && litiges(`str_STATUT = 'is_Closed' AND int_AMOUNT_PAYE_LITIGE = ${Number(PART) - 300} AND int_ECART = 300 AND dt_CLOTURE IS NOT NULL`) === '1', d2.join(' ') + ' ; ' + t2);
    ok('L3 : encours du compte client diminué de l’écart (300)', Number(conso()) === consoAvant - 300, consoAvant + ' -> ' + conso());
    await filtre('Clôturés');
    await (await rangee()).locator('img[data-qtip^="D"]').first().click();
    await p.waitForFunction(() => Ext.getCmp('detailtransactionlitigeID') && Ext.getCmp('detailtransactionlitigeID').litige, null, { timeout: 15000 });
    ok('L2 : un litige clos ne se rejoue pas (aucun bouton de clôture)', !(await p.evaluate(() => Ext.getCmp('detailtransactionlitigeID').down('#btnCloturer').isVisible())));
    await p.evaluate(() => Ext.getCmp('detailtransactionlitigeID').close());

    /* cloture sans remboursement : remise de la part d'origine pour repartir d'un dossier eligible */
    exec(`UPDATE t_preenregistrement_compte_client_tiers_payent SET int_PRICE = ${PART}, int_PRICE_RESTE = ${PART} WHERE lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID = '${DOSSIER}'`);
    await filtre('Litiges ouverts');
    c = await creer();
    await c.item.first().click();
    await choisirType();
    await c.fen.getByText('Enregistrer', { exact: true }).click();
    await message();
    await attendreListe();
    await (await rangee()).locator('img[data-qtip^="D"]').first().click();
    await p.waitForFunction(() => Ext.getCmp('detailtransactionlitigeID') && Ext.getCmp('detailtransactionlitigeID').down('#btnCloturer').isVisible(), null, { timeout: 15000 });
    await p.locator('#detailtransactionlitigeID').getByText('Sans remboursement (abandon)').click();
    const btn2 = p.locator('#detailtransactionlitigeID').getByText('Clôturer', { exact: true });
    await btn2.click();
    const t3 = await message();
    ok('L3 : sans remboursement, le motif est exigé', /motif/i.test(t3) && litiges("str_STATUT = 'enable'") === '1', t3);
    await (await montantChamp('detailtransactionlitigeID', 'clotureMotif')).fill('Assuré hors droits à la date de la vente');
    await btn2.click();
    await p.waitForTimeout(600);
    const rClot2 = p.waitForResponse((r) => r.url().includes('/cloturer'), { timeout: 15000 });
    await p.locator('#detailtransactionlitigeID').getByText('Confirmer la clôture ?').click();
    await rClot2;
    const t4 = await message();
    const d3 = etatDossier().split(' ');
    ok('L3 : abandon tracé : dossier hors facturation, reste 0, litige clos (accordé 0, écart = part, motif)',
      d3[0] === 'is_Closed' && d3[2] === '0'
        && litiges(`str_STATUT = 'is_Closed' AND int_AMOUNT_PAYE_LITIGE = 0 AND int_ECART = ${PART} AND str_MOTIF_CLOTURE LIKE 'Assur%'`) === '1', d3.join(' ') + ' ; ' + t4);
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack + ' ' + err.join(' | '));
  } finally {
    await b.close();
    remettre();
    ok('Données d’essai retirées, dossier et compte remis', litiges() === '0' && etatDossier() === avant && conso() === nul(CONSO), etatDossier() + ' / ' + avant);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
