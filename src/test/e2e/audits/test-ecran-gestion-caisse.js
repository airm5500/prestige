/* Gestion de caisse (notice MECANISMES_CODE_GESTION_CAISSE), par les ecrans (clics de l'utilisateur), compte e2e :
 *  - G5 : « Ouverture de Caisse » avec un fond de -500 : aucune caisse ouverte ; puis fond de 0 (usage de l'officine,
 *         2 802 caisses sur 2 804 en 3 ans) : caisse ouverte ;
 *  - G2 : « Mouvements de Caisse » > Creer, sortie de caisse de 0 : refus, rien d'enregistre (le champ n'accepte que
 *         des chiffres : une sortie negative ne se saisit pas) ; sortie de 2 000 et double clic sur « Enregistrer » :
 *         un seul mouvement, de signe negatif ;
 *  - G1 : « Cloture de Caisse » ouverte dans deux onglets, « VALIDER » clique dans les deux en meme temps : un seul
 *         billetage, le second onglet affiche le refus ; total du billetage = somme des coupures ;
 *  - G3 : « Gestion Caisse », cloture validee (icone « Valider la cloture ») : l'icone « Annuler la cloture » n'est
 *         plus proposee, le billetage reste.
 * Les cas sans chemin a l'ecran (cloture du resume d'un autre caissier, total different des coupures, annulation
 * d'une cloture validee) sont refuses par le serveur ; ils ne sont pas rejoues ici (pas d'appel direct de l'API).
 * Donnees : tout ce que le compte e2e cree pendant le test est retire a la fin (base de test seulement).
 * Lancement seul : node src/test/e2e/audits/test-ecran-gestion-caisse.js
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { BASE: URL, connexion, ouvrirMenu, cliquer, choisir, texteMessage, repondre } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();

const USER = q(`SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN}'`);
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
const depuis = (col) => `${col} >= '${DEBUT}'`;
const resumes = () => q(`SELECT IFNULL(GROUP_CONCAT(CONCAT('''', ld_CAISSE_ID, '''')), '''''') FROM t_resume_caisse WHERE lg_USER_ID = '${USER}' AND ${depuis('dt_CREATED')}`);
const resumeOuvert = () => q(`SELECT CONCAT_WS(' ', ld_CAISSE_ID, int_SOLDE_MATIN) FROM t_resume_caisse WHERE lg_USER_ID = '${USER}' AND str_STATUT = 'is_Using' LIMIT 1`);
const mouvements = () => q(`SELECT IFNULL(GROUP_CONCAT(int_AMOUNT ORDER BY dt_CREATED), '') FROM t_mvt_caisse WHERE lg_USER_ID = '${USER}' AND lg_TYPE_MVT_CAISSE_ID = '4' AND ${depuis('dt_CREATED')}`);

function nettoyer() {
  const r = resumes();
  const mvts = `(SELECT lg_MVT_CAISSE_ID FROM t_mvt_caisse WHERE lg_USER_ID = '${USER}' AND ${depuis('dt_CREATED')})`;
  q(`DELETE FROM t_billetage_details WHERE lg_BILLETAGE_ID IN (SELECT lg_BILLETAGE_ID FROM t_billetage WHERE ld_CAISSE_ID IN (${r}));`
    + ` DELETE FROM t_billetage WHERE ld_CAISSE_ID IN (${r}); DELETE FROM ligne_resume_caisse WHERE resume_caisse_id IN (${r});`
    + ` DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID IN (${r});`
    + ` DELETE FROM t_reglement WHERE str_REF_RESSOURCE IN ${mvts}; DELETE FROM mvttransaction WHERE pkey IN ${mvts};`
    + ` DELETE FROM t_mvt_caisse WHERE lg_USER_ID = '${USER}' AND ${depuis('dt_CREATED')};`
    + ` DELETE FROM t_coffre_caisse WHERE lg_USER_ID = '${USER}' AND ${depuis('dt_CREATED')};`
    + ` DELETE FROM t_caisse WHERE lg_USER_ID = '${USER}' AND ${depuis('dt_CREATED')};`
    + ` DELETE FROM notification_client WHERE notification_id IN (SELECT id FROM notification WHERE user_id = '${USER}' AND ${depuis('created_at')});`
    + ` DELETE FROM notification WHERE user_id = '${USER}' AND ${depuis('created_at')};`
    + ` DELETE FROM t_event_log WHERE lg_USER_ID = '${USER}' AND ${depuis('dt_CREATED')}`);
}

(async () => {
  const avant = q(`SELECT CONCAT_WS(' ', (SELECT COUNT(*) FROM t_resume_caisse WHERE lg_USER_ID = '${USER}' AND str_STATUT IN ('is_Using', 'is_Process')),`
    + ` (SELECT COUNT(*) FROM t_coffre_caisse WHERE lg_USER_ID = '${USER}' AND str_STATUT <> 'is_Assign'), (SELECT COUNT(*) FROM t_caisse WHERE lg_USER_ID = '${USER}'))`);
  ok('Précondition : le compte e2e n\'a ni caisse ouverte ou à valider, ni fond en attente, ni caisse', !!USER && avant === '0 0 0', avant);
  if (avant !== '0 0 0') { process.exit(1); }
  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } });
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  /* message visible : texte, puis bouton donne (ok, yes, no) */
  const message = async (page, bouton) => {
    const fin = Date.now() + 20000; let t = '';
    while (Date.now() < fin) { t = await texteMessage(page); if (t && !/patienter|cours de traitement/i.test(t)) { break; } await page.waitForTimeout(250); }
    if (t && bouton) { await repondre(page, bouton).catch(() => {}); await page.waitForTimeout(400); }
    return t.replace(/\s+/g, ' ');
  };
  const champ = async (page, id, texte) => {
    await page.click('#' + id + '-inputEl');
    await page.keyboard.press('Control+A');
    await page.keyboard.type(texte, { delay: 30 });
  };
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');

    /* G5 : fond negatif refuse ; fond de 0, l'usage de l'officine, accepte */
    await ouvrirMenu(p, 'SERVICE CLIENT', 'Ouverture de Caisse');
    await p.waitForFunction(() => Ext.getCmp('btnValidate') && Ext.getCmp('btnValidate').isVisible(true), null, { timeout: 60000 });
    await p.waitForTimeout(800);
    await champ(p, 'coffreCaisseAmount', '-500');
    const saisi = await p.evaluate(() => Ext.getCmp('coffreCaisseAmount').getRawValue());
    await cliquer(p, '#btnValidate');
    const mNeg = await message(p, 'ok');
    const ouvertNeg = resumeOuvert();
    ok('G5 : fond de -500 : signe refusé à la saisie ou fond refusé, aucune caisse ouverte',
        ouvertNeg === '' && (!/-/.test(saisi) || /n.gatif/i.test(mNeg)), saisi + ' | ' + mNeg + ' | ' + ouvertNeg);
    await p.waitForFunction(() => Ext.getCmp('btnValidate') && Ext.getCmp('btnValidate').isVisible(true), null, { timeout: 20000 });
    await champ(p, 'coffreCaisseAmount', '0');
    await cliquer(p, '#btnValidate');
    const m0 = await message(p, 'no'); /* « Confirmation de l'impression du ticket » : non */
    await p.waitForTimeout(1500);
    const ouvert = resumeOuvert();
    ok('G5 : ouverture avec un fond de 0 (usage de l\'officine) : caisse ouverte', /^\S+ 0$/.test(ouvert), m0 + ' | ' + ouvert);
    const RESUME = ouvert.split(' ')[0];

    /* G2 : sortie de caisse de 0, puis 2 000 en double clic */
    await ouvrirMenu(p, 'GESTION COURANTE', 'Mouvements de Caisse');
    const nouveauMouvement = async () => {
      await p.waitForFunction(() => Ext.ComponentQuery.query('mvtcaissemanager button[text=Créer]').some((x) => x.isVisible(true)), null, { timeout: 60000 });
      await cliquer(p, 'mvtcaissemanager button[text=Créer]');
      await p.waitForFunction(() => Ext.getCmp('btn_clt_saveID') && Ext.getCmp('btn_clt_saveID').isVisible(true), null, { timeout: 20000 });
      await p.waitForTimeout(800);
      await choisir(p, '#lg_TYPE_MVT_CAISSE_ID', 'Sorties de caisse');
      await p.waitForTimeout(400);
    };
    await nouveauMouvement();
    await champ(p, 'int_MONTANT_Add_MvtCaisse', '0');
    await cliquer(p, '#btn_clt_saveID');
    const m2 = await message(p, 'ok');
    const mv0 = mouvements();
    ok('G2 : sortie de caisse de 0 refusée, rien d\'enregistré', /sup.rieur . 0/.test(m2) && mv0 === '', m2 + ' | mouvements ' + mv0);
    if (!(await p.evaluate(() => !!Ext.getCmp('btn_clt_saveID') && Ext.getCmp('btn_clt_saveID').isVisible(true)))) { await nouveauMouvement(); }
    await champ(p, 'int_MONTANT_Add_MvtCaisse', '2000');
    await p.dblclick('#' + await p.evaluate(() => Ext.getCmp('btn_clt_saveID').getId()));
    await p.waitForTimeout(3000);
    await message(p, 'ok');
    const mv = mouvements().split(',').filter((x) => x !== '');
    const nouveaux = mv.slice(mv0 === '' ? 0 : mv0.split(',').length);
    ok('G2 : double clic sur « Enregistrer » : un seul mouvement, sortie enregistrée en négatif', nouveaux.length === 1 && Number(nouveaux[0]) === -2000, mv.join(','));

    /* G1 : cloture dans deux onglets, VALIDER en meme temps */
    const p2 = await ctx.newPage();
    p2.on('pageerror', (e) => erreurs.push(e.message));
    await p2.goto(URL + '/general/', { waitUntil: 'domcontentloaded' });
    await p2.waitForFunction(() => window.Ext && window.testextjs && testextjs.app && Ext.ComponentQuery.query('navigation')[0], null, { timeout: 240000 });
    await p2.waitForLoadState('networkidle').catch(() => {});
    const billetage = async (page) => {
      await ouvrirMenu(page, 'SERVICE CLIENT', 'Cloture de Caisse');
      await page.waitForFunction(() => Ext.getCmp('btn_validate') && Ext.getCmp('btn_validate').isVisible(true), null, { timeout: 60000 });
      await page.waitForTimeout(800);
      await cliquer(page, '#btn_validate');
      await message(page, 'yes'); /* « Voulez-vous clôturer votre caisse » : oui */
      await page.waitForFunction(() => Ext.getCmp('int_NB_DIX') && Ext.getCmp('int_NB_DIX').isVisible(true), null, { timeout: 20000 });
      await page.waitForTimeout(500);
      await champ(page, 'int_NB_DIX', '5');
      await champ(page, 'int_NB_MIL', '2');
      return page.locator('.x-window .x-btn').filter({ visible: true }).filter({ hasText: /^\s*VALIDER\s*$/ }).first();
    };
    const v1 = await billetage(p);
    const v2 = await billetage(p2);
    await Promise.all([v1.click(), v2.click()]);
    await p.waitForTimeout(4000);
    const t1 = await message(p, 'ok'), t2 = await message(p2, 'ok');
    const nb = q(`SELECT CONCAT_WS(' ', COUNT(*), IFNULL(ROUND(SUM(int_AMOUNT)), 0)) FROM t_billetage WHERE ld_CAISSE_ID = '${RESUME}'`);
    const statut = q(`SELECT str_STATUT FROM t_resume_caisse WHERE ld_CAISSE_ID = '${RESUME}'`);
    ok('G1 : VALIDER dans deux onglets en même temps : un seul billetage (52 000), caisse fermée', nb === '1 52000' && statut === 'is_Process', nb + ' ' + statut);
    ok('G1 : l\'autre onglet affiche le refus', [t1, t2].some((t) => /d.j. (cl.tur|ferm)/i.test(t)), t1 + ' | ' + t2);
    const coupures = q(`SELECT CONCAT_WS(' ', ROUND(b.int_AMOUNT), d.int_NB_DIX_MIL * 10000 + d.int_NB_CINQ_MIL * 5000 + d.int_NB_DEUX_MIL * 2000 + d.int_NB_MIL * 1000`
      + ` + d.int_NB_CINQ_CENT * 500 + IFNULL(d.int_AUTRE, 0)) FROM t_billetage b JOIN t_billetage_details d ON d.lg_BILLETAGE_ID = b.lg_BILLETAGE_ID WHERE b.ld_CAISSE_ID = '${RESUME}'`);
    ok('G1 : total du billetage = somme des coupures', coupures.split('\n').every((l) => l.split(' ')[0] === l.split(' ')[1]) && coupures !== '', coupures);
    await p2.close();

    /* G3 : validation de la cloture, puis plus d'annulation proposee */
    await ouvrirMenu(p, 'GESTION COURANTE', 'Gestion Caisse');
    await p.waitForFunction(() => Ext.ComponentQuery.query('gestcaissemanager gridpanel').some((g) => g.isVisible(true) && !g.getStore().isLoading()), null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    const ligne = (id) => p.evaluate((r) => { const g = Ext.ComponentQuery.query('gestcaissemanager gridpanel').filter((x) => x.isVisible(true))[0];
      const i = g.getStore().findExact('ldCAISSEID', r); if (i < 0) { return null; } const n = g.getView().getNode(i); n.id = n.id || 'e2e-ligne-caisse'; return n.id; }, id);
    const icone = async (id, src) => { const l = await ligne(id); if (!l) { return 0; }
      return p.locator('#' + l + ' [data-qtip*="' + src + '"]').filter({ visible: true }).count(); };
    ok('G3 : avant validation, la clôture de la caisse est listée avec l\'icône de validation', (await icone(RESUME, 'Valider la cloture')) === 1);
    const lv = await ligne(RESUME);
    if (lv) {
      await p.locator('#' + lv + ' [data-qtip*="Valider la cloture"]').filter({ visible: true }).first().click();
      await message(p, 'yes');
      await message(p, 'ok');
    }
    await p.waitForTimeout(1500);
    const st = q(`SELECT str_STATUT FROM t_resume_caisse WHERE ld_CAISSE_ID = '${RESUME}'`);
    await p.waitForTimeout(1000);
    ok('G3 : clôture validée : l\'icône « Annuler la clôture » n\'est plus proposée, le billetage reste',
      st === 'is_Closed' && (await icone(RESUME, 'Annuler la cl')) === 0 && q(`SELECT COUNT(*) FROM t_billetage WHERE ld_CAISSE_ID = '${RESUME}'`) === '1', st);
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Données d\'essai retirées', q(`SELECT CONCAT_WS(' ', (SELECT COUNT(*) FROM t_resume_caisse WHERE lg_USER_ID = '${USER}'),`
      + ` (SELECT COUNT(*) FROM t_mvt_caisse WHERE lg_USER_ID = '${USER}' AND ${depuis('dt_CREATED')}), (SELECT COUNT(*) FROM t_coffre_caisse WHERE lg_USER_ID = '${USER}'))`) === '0 0 0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
