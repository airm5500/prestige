/* RETOUR FOURNISSEUR EN ATTENTE DE VALIDATION (retours du 13/10, point 1). Par l'ecran « Retour fournisseur », admin.
 *  1. SANS le privilege P_VALIDER_RETOUR_FRS (retire au role le temps du test) :
 *     - le bouton de la saisie dit « Mettre en attente de validation » ; la confirmation se fait dans le bouton
 *       (premier clic : « Confirmer… », aucune fenetre) ;
 *     - le retour passe « En attente de validation » ; RIEN ne sort du stock (stock et mouvements inchanges) ;
 *     - la liste le montre avec l'etat « En attente de validation » et l'icone pour l'ouvrir ;
 *     - la validation directe par l'API et le retour du BL complet sont refuses.
 *  2. AVEC le privilege : on ouvre le retour depuis la liste, le bouton dit « Valider le retour » ; la validation
 *     fait sortir la quantite du stock (un mouvement) ; une seconde validation est refusee (pas de double sortie).
 * Tout est retire : retour, lignes, mouvement, notification ; stock remis ; privilege remis.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const privilegeEssai = require('../support/privilege-essai');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const NOTE = 'E2E-RETOUR-ATTENTE';
const droit = privilegeEssai(q, exec, ENV_E2E.LOGIN, 'P_VALIDER_RETOUR_FRS');

/* une ligne de bon de livraison du banc : bon a numero unique, produit recu et en stock au rayon */
const [BL, PRODUIT] = q("SELECT CONCAT_WS('|', b.str_REF_LIVRAISON, d.lg_FAMILLE_ID) FROM t_bon_livraison b"
  + " JOIN t_bon_livraison_detail d ON d.lg_BON_LIVRAISON_ID = b.lg_BON_LIVRAISON_ID"
  + " JOIN t_famille_stock s ON s.lg_FAMILLE_ID = d.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' AND s.int_NUMBER_AVAILABLE > 2"
  + " WHERE d.int_QTE_RECUE >= 1 AND b.str_STATUT <> 'delete'"
  + " AND (SELECT COUNT(*) FROM t_bon_livraison x WHERE x.str_REF_LIVRAISON = b.str_REF_LIVRAISON) = 1"
  + " ORDER BY b.dt_CREATED DESC LIMIT 1").split('|');
const MOTIF = q("SELECT lg_MOTIF_RETOUR FROM t_motif_retour ORDER BY lg_MOTIF_RETOUR LIMIT 1");
const stock = () => q(`SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_FAMILLE_ID = '${PRODUIT}' AND lg_EMPLACEMENT_ID = '1'`);
const mvts = () => q(`SELECT COUNT(*) FROM HMvtProduit WHERE lg_FAMILLE_ID = '${PRODUIT}'`);
const STOCK0 = stock();

function retirer() {
  const ids = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT("'", lg_RETOUR_FRS_ID, "'")), "''") FROM t_retour_fournisseur WHERE str_COMMENTAIRE = '${NOTE}'`);
  const det = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT("'", lg_RETOUR_FRS_DETAIL, "'")), "''") FROM t_retour_fournisseur_detail WHERE lg_RETOUR_FRS_ID IN (${ids})`);
  exec(`DELETE FROM HMvtProduit WHERE pkey IN (${det});`
    + `DELETE FROM notification WHERE entity_ref IN (${ids});`
    + `DELETE FROM t_retour_fournisseur_detail WHERE lg_RETOUR_FRS_ID IN (${ids});`
    + `DELETE FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID IN (${ids});`);
}

(async () => {
  droit.remettre();
  retirer();
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const err = [], dialogues = [];
  let retourId = '';
  const connecter = async () => {
    const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
    p.on('pageerror', (e) => err.push(e.message));
    p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
    return p;
  };
  const boite = (p) => p.evaluate(() => Ext.ComponentQuery.query('messagebox').some((m) => m.isVisible()));
  /* liste des retours, puis ouverture du retour d'essai par l'icone de la ligne */
  const ouvrirDepuisListe = async (p) => {
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('retourfrsmanager', {}));
    await p.waitForFunction((id) => { const g = Ext.ComponentQuery.query('retourfrsmanager')[0]; return g && !g.getStore().isLoading() && g.getStore().findExact('lg_RETOUR_FRS_ID', id) >= 0; }, retourId, { timeout: 30000 });
    await p.waitForTimeout(800);
    const ligne = await p.evaluate((id) => { const g = Ext.ComponentQuery.query('retourfrsmanager')[0], r = g.getStore().getAt(g.getStore().findExact('lg_RETOUR_FRS_ID', id));
      const n = g.getView().getNode(r), img = [...n.querySelectorAll('img.act-modifier, img[src*="page_white_edit"]')].find((i) => !i.classList.contains('x-hide-display'));
      if (img) { img.id = 'e2e-ouvrir-retour'; }
      return { etat: (n.querySelector('.retour-attente') || {}).textContent || n.textContent.replace(/\s+/g, ' '), icone: !!img }; }, retourId);
    return ligne;
  };
  const enregistrer = async (p) => {
    const b1 = await p.evaluate(() => { const b = Ext.getCmp('btn_save'), t = b.getText(); b.btnEl.dom.click(); return t; });
    await p.waitForTimeout(300);
    const arme = await p.evaluate(() => Ext.getCmp('btn_save').getText());
    const boiteApres1 = await boite(p);
    await p.evaluate(() => Ext.getCmp('btn_save').btnEl.dom.click());
    return { b1, arme, boiteApres1 };
  };
  try {
    ok('Précondition : une ligne de bon de livraison en stock et un motif', !!BL && !!PRODUIT && !!MOTIF && Number(STOCK0) > 2, BL + ' ' + PRODUIT + ' stock ' + STOCK0);

    /* ----- 1. sans le privilege ----- */
    droit.retirer();
    let p = await connecter();
    const cree = await p.evaluate(async ([bl, f, m, note]) => (await fetch('../api/v1/retourfournisseur/new', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lgBONLIVRAISONID: bl, strCOMMENTAIRE: note, items: [{ produitId: f, lgMOTIFRETOUR: m, intNUMBERRETURN: 1 }] }) })).json(), [BL, PRODUIT, MOTIF, NOTE]);
    retourId = cree.data && cree.data.lgRETOURFRSID;
    ok('Retour créé en saisie (une ligne)', !!retourId && q(`SELECT str_STATUT FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID = '${retourId}'`) === 'is_Process', JSON.stringify(cree).slice(0, 200));
    await p.evaluate(([id, note]) => testextjs.app.getController('App').onLoadNewComponentWithDataSource('retourfournisseurmanagerlist', 'Modification fiche retour fournisseur', id,
      { lg_RETOUR_FRS_ID: id, str_REF_LIVRAISON: '', str_REPONSE_FRS: '', str_COMMENTAIRE: note, str_GROSSISTE_LIBELLE: '' }), [retourId, NOTE]);
    await p.waitForFunction(() => { const b = Ext.getCmp('btn_save'); return b && /attente/i.test(b.getText()); }, null, { timeout: 15000 }).catch(() => {});
    const stockA = stock(), mvtA = mvts();
    const e1 = await enregistrer(p);
    ok('Sans le droit : le bouton dit « Mettre en attente de validation »', /Mettre en attente de validation/.test(e1.b1), e1.b1);
    ok('Confirmation dans le bouton, aucune fenêtre', /Confirmer/.test(e1.arme) && !e1.boiteApres1, JSON.stringify(e1));
    for (let i = 0; i < 30 && q(`SELECT str_STATUT FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID = '${retourId}'`) !== 'is_Waiting'; i++) { await p.waitForTimeout(500); }
    const attente = q(`SELECT CONCAT_WS('|', str_STATUT, IF(dt_ATTENTE IS NULL, 'sans date', 'date'), IF(lg_USER_ATTENTE IS NULL, 'sans auteur', 'auteur')) FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID = '${retourId}'`);
    ok('Le retour est en attente (date et auteur notés)', attente === 'is_Waiting|date|auteur', attente);
    ok('Rien ne sort du stock tant qu\'il attend (stock et mouvements inchangés)', stock() === stockA && mvts() === mvtA, stockA + '->' + stock() + ' mvt ' + mvtA + '->' + mvts());
    const msg1 = await p.waitForFunction(() => { const b = Ext.getCmp('btn_save'); return !b || b.isDestroyed || /attente de validation/.test(b.getText()) && /✓/.test(b.getText()); }, null, { timeout: 5000 }).then(() => true).catch(() => false);
    ok('Le bouton annonce la mise en attente, puis on revient à la liste', msg1);
    const l1 = await ouvrirDepuisListe(p);
    ok('La liste montre le retour « En attente de validation » et l\'icône pour l\'ouvrir', /En attente de validation/.test(l1.etat) && l1.icone, JSON.stringify(l1));
    const direct = await p.evaluate(async (id) => (await fetch('../api/v1/produit/validerretourfour', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: id }) })).json(), retourId);
    ok('Sans le droit : la validation directe est refusée par le serveur', direct.success === false && q(`SELECT str_STATUT FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID = '${retourId}'`) === 'is_Waiting' && stock() === stockA, JSON.stringify(direct));
    const complet = await p.evaluate(async () => (await fetch('../api/v1/retourfournisseur/full-bl/inexistant-e2e', { method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lgMOTIFRETOUR: '' }) })).json());
    ok('Sans le droit : le retour du BL complet est refusé', complet.success === false && /droit/.test(complet.msg || ''), JSON.stringify(complet));
    await p.context().close();

    /* ----- 2. avec le privilege : validation depuis la liste ----- */
    droit.remettre();
    p = await connecter();
    const l2 = await ouvrirDepuisListe(p);
    await p.click('#e2e-ouvrir-retour');
    await p.waitForFunction(() => { const b = Ext.getCmp('btn_save'); return b && /Valider le retour/.test(b.getText()); }, null, { timeout: 15000 }).catch(() => {});
    const stockB = stock(), mvtB = mvts();
    const e2 = await enregistrer(p);
    ok('Avec le droit : retour ouvert depuis la liste, le bouton dit « Valider le retour »', l2.icone && /Valider le retour/.test(e2.b1), e2.b1);
    ok('Avec le droit : confirmation dans le bouton (« les quantités sortent du stock »), aucune fenêtre', /sortent du stock/.test(e2.arme) && !e2.boiteApres1, JSON.stringify(e2));
    for (let i = 0; i < 30 && q(`SELECT str_STATUT FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID = '${retourId}'`) !== 'enable'; i++) { await p.waitForTimeout(500); }
    ok('Validé : la quantité sort du stock, un mouvement', q(`SELECT str_STATUT FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID = '${retourId}'`) === 'enable'
      && Number(stock()) === Number(stockB) - 1 && Number(mvts()) === Number(mvtB) + 1, stockB + '->' + stock() + ' mvt ' + mvtB + '->' + mvts());
    await p.waitForTimeout(1500);
    const stockC = stock();
    const deux = await p.evaluate(async (id) => (await fetch('../api/v1/produit/validerretourfour', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: id }) })).json(), retourId);
    ok('Une seconde validation est refusée : pas de double sortie du stock', deux.success === false && stock() === stockC, JSON.stringify(deux));
    const l3 = await ouvrirDepuisListe(p);
    ok('La liste le montre « Validé »', /Validé/.test(l3.etat) && !l3.icone, JSON.stringify(l3));
    ok('Aucune fenêtre surgissante, aucune erreur JavaScript', dialogues.length === 0 && err.length === 0, dialogues.concat(err).join(' | '));
  } catch (x) {
    ok('Déroulé sans erreur', false, x.message);
  } finally {
    await b.close();
    droit.remettre();
    const sorti = Number(STOCK0) - Number(stock());
    retirer();
    if (sorti > 0) {
      exec(`UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = int_NUMBER_AVAILABLE + ${sorti}, int_NUMBER = int_NUMBER_AVAILABLE WHERE lg_FAMILLE_ID = '${PRODUIT}' AND lg_EMPLACEMENT_ID = '1'`);
    }
    ok('Données d\'essai retirées, stock remis, privilège remis', q(`SELECT COUNT(*) FROM t_retour_fournisseur WHERE str_COMMENTAIRE = '${NOTE}'`) === '0' && stock() === STOCK0
      && q("SELECT COUNT(*) FROM t_role_privelege rp JOIN t_privilege p ON p.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID JOIN t_role_user ru ON ru.lg_ROLE_ID = rp.lg_ROLE_ID JOIN t_user u ON u.lg_USER_ID = ru.lg_USER_ID WHERE u.str_LOGIN = '" + ENV_E2E.LOGIN + "' AND p.str_NAME = 'P_VALIDER_RETOUR_FRS'") !== '0',
      'stock ' + STOCK0 + ' -> ' + stock());
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
  process.exit(ko ? 1 : 0);
})();
