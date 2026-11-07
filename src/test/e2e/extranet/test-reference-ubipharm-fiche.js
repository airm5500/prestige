/* REFERENCE UBIPHARM (PSCODE) SUR LA FICHE ARTICLE (reponse de l'utilisateur du 07/11) : rangee dans t_famille, comme
 * le code EAN 13, et pas dans t_famille_grossiste. Test d'ecran, par le vrai chemin :
 *  - GESTION DU STOCK > Fiche Article, recherche, « Modifier » : champ « Référence Ubipharm », saisie, enregistrement ;
 *  - rapprochement : la valeur saisie a l'ecran = la base = celle que l'ecran « Extranets grossistes » retrouve
 *    (onglet Nouveaux produits, « Rapprocher avec Prestige » : statut « référence Ubipharm de la fiche ») ;
 *  - bilan : seule la colonne code_ubipharm de l'article change, le reste de la fiche est identique ;
 *  - reouverture : valeur reaffichee ; enregistrer avant l'arrivee de la valeur ne l'efface pas ; effacer = NULL ;
 *  - donnees retirees : article remis a l'identique, collectes et session du test effacees.
 * Le faux extranet local (faux-extranet.js) sert la page des nouveaux produits : jamais le vrai.
 *
 * Lancement (domain3, laborex_audit, Payara demarre avec -DEXTRANET_UBIPHARM_URL=http://127.0.0.1:18765) :
 *   BASE=http://localhost:10090/prestige DB_TEST=laborex_audit E2E_BASE_LIBRE=1 node test-reference-ubipharm-fiche.js
 */
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const faux = require('./faux-extranet');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright-core');

const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s],
  { encoding: 'utf8' }).replace(/\r/g, '').trim();
const res = [];
function ok(n, c, d) {
  res.push({ n, c: !!c });
  console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : ''));
}

const RESTE = "CONCAT_WS('|', str_NAME, int_CIP, int_PRICE, int_PAF, IFNULL(int_EAN13, ''), IFNULL(code_ean_fabriquant, ''),"
  + " IFNULL(str_CODE_GEO_ARTICLE, ''), lg_ZONE_GEO_ID, str_STATUT, IFNULL(lg_GROSSISTE_ID, ''))";

(async () => {
  const [P, cip, nom] = q("SELECT CONCAT_WS('|', f.lg_FAMILLE_ID, f.int_CIP, f.str_NAME) FROM t_famille f WHERE f.str_STATUT = 'enable'"
    + " AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 AND f.int_CIP REGEXP '^[0-9]{7}$' AND f.code_ubipharm IS NULL"
    + " ORDER BY f.str_NAME LIMIT 1 OFFSET 5").split('|');
  const code = () => q("SELECT IFNULL(code_ubipharm, 'NULL') FROM t_famille WHERE lg_FAMILLE_ID = '" + P + "'");
  const reste = () => q('SELECT ' + RESTE + " FROM t_famille WHERE lg_FAMILLE_ID = '" + P + "'");
  const resteAvant = reste();
  const grossisteAvant = q('CHECKSUM TABLE t_famille_grossiste');
  const autresAvant = q("SELECT COUNT(*) FROM t_famille WHERE code_ubipharm IS NOT NULL");
  const premiereCollecte = Number(q('SELECT IFNULL(MAX(id), 0) + 1 FROM extranet_collecte'));
  const srv = await faux.demarrer(18765);
  const navigateur = await ENV_E2E.lancer(chromium);
  const p = await (await navigateur.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
  const erreurs = [];
  p.on('pageerror', (e) => erreurs.push(String(e.message)));

  const fenetre = () => p.waitForFunction(() => { const w = window.winModifArticleOuverte;
    return w && !w.isDestroyed && w.isVisible() && w.down('#int_CIP') && w.down('#int_CIP').getValue(); }, null, { timeout: 30000 });
  async function chercher() {
    await vues.saisir(p, 'famillemanager #rechecher', cip);
    await p.keyboard.press('Shift+Tab');
    await p.keyboard.press('Enter');
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('famillemanager')[0]; return g && !g.getStore().isLoading(); }, null, { timeout: 30000 });
    await p.locator('.x-grid-row:visible', { hasText: cip }).first().waitFor({ timeout: 30000 });
  }
  async function ouvrirModifier() {
    await chercher();
    await p.locator('.x-grid-row:visible', { hasText: cip }).first().locator('.fa-action-edit').first().click();
    await fenetre();
    /* la fenetre deplace le focus pendant ses chargements : on attend qu'elle soit posee, comme l'utilisateur */
    await p.waitForTimeout(3000);
  }
  async function enregistrer() {
    const id = await p.evaluate(() => window.winModifArticleOuverte.query('button').filter((b) => b.text === 'Enregistrer')[0].getId());
    await p.click('#' + id);
    await p.waitForFunction(() => !window.winModifArticleOuverte || window.winModifArticleOuverte.isDestroyed, null, { timeout: 30000 });
    await p.waitForTimeout(1200);
  }
  /* clic dans la zone de saisie elle-meme, tout effacer, frappe, Tab (comme l'utilisateur) */
  async function saisirReference(texte) {
    const id = await p.evaluate(() => window.winModifArticleOuverte.down('#code_UBIPHARM').inputEl.id);
    await p.click('#' + id);
    await p.keyboard.press('Control+A');
    await p.keyboard.press('Delete');
    await p.waitForTimeout(300);
    if (texte) { await p.keyboard.type(texte, { delay: 20 }); }
    const focus = await p.evaluate((id) => document.activeElement && document.activeElement.id === id, id);
    if (!focus) { console.log('NOTE  le focus a quitté le champ pendant la frappe'); }
    await p.keyboard.press('Tab');
  }
  const champ = () => p.evaluate(() => { const f = window.winModifArticleOuverte.down('#code_UBIPHARM');
    return f ? { v: f.getValue(), libelle: f.fieldLabel, visible: f.isVisible() } : null; });

  try {
    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');

    /* ---- cache des nouveaux produits (FAIR248 en fait partie), par l'ecran des extranets */
    await vues.ouvrirMenu(p, 'GESTION DES COMMANDES', 'Extranets grossistes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('extranetsgrossistes')[0], null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    await vues.saisir(p, 'extranetsgrossistes #exCookieUBIPHARM', srv.COOKIE);
    await vues.cliquer(p, 'extranetsgrossistes #exSaisieUBIPHARM button[text=Enregistrer]');
    await p.waitForTimeout(1200);
    await vues.cliquer(p, 'extranetsgrossistes #exOnglets tab[text=Nouveaux produits]');
    const collecte = p.waitForResponse((x) => x.url().indexOf('/nouveaux/collecte') >= 0, { timeout: 120000 });
    await vues.cliquer(p, 'extranetsgrossistes #exNouveauxCollecter');
    ok('nouveaux produits lus (faux extranet)', (await (await collecte).json()).success === true);
    await p.waitForTimeout(1000);

    async function rapprocher() {
      await vues.cliquer(p, 'extranetsgrossistes #exOnglets tab[text=Nouveaux produits]');
      await p.waitForFunction(() => { const st = Ext.ComponentQuery.query('extranetsgrossistes')[0].nouveaux;
        return !st.isLoading() && st.getCount() > 0; }, null, { timeout: 30000 });
      const r = p.waitForResponse((x) => x.url().indexOf('/nouveaux/rapprochement') >= 0, { timeout: 60000 });
      await vues.cliquer(p, 'extranetsgrossistes #exRapprocher');
      const api = await (await r).json();
      await p.waitForTimeout(800);
      const ecran = await p.evaluate(() => Ext.ComponentQuery.query('extranetsgrossistes')[0].nouveaux.getRange()
        .map((x) => ({ pscode: x.get('pscode'), prestige: x.get('prestige') })));
      const cellule = await p.evaluate(() => { const g = Ext.ComponentQuery.query('extranetsgrossistes #exOngletNouveaux gridpanel')[0];
        const i = g.getStore().findExact('pscode', 'FAIR248'); const n = i >= 0 && g.getView().getNode(i); return n ? n.textContent : ''; });
      return { api, ecran, cellule, fair: ecran.find((x) => x.pscode === 'FAIR248') };
    }
    const avant = await rapprocher();
    ok('avant saisie : FAIR248 absent de Prestige par la référence', avant.fair && avant.fair.prestige
      && avant.fair.prestige.statut !== 'PSCODE', JSON.stringify(avant.fair));

    /* ---- fiche article : saisie de la reference */
    await vues.ouvrirMenu(p, 'GESTION DU STOCK', 'Fiche Article');
    await p.waitForFunction(() => Ext.ComponentQuery.query('famillemanager').length > 0, null, { timeout: 60000 });
    await p.waitForTimeout(2000);
    await ouvrirModifier();
    await p.waitForFunction(() => window.winModifArticleOuverte.down('#code_UBIPHARM').codeLu === true, null, { timeout: 15000 });
    const c0 = await champ();
    ok('fiche : champ « Référence Ubipharm » visible et vide', c0 && c0.visible && /Ubipharm/.test(c0.libelle) && !c0.v, JSON.stringify(c0));
    await saisirReference('FAIR 248 ');
    const saisi = await p.evaluate(() => window.winModifArticleOuverte.down('#code_UBIPHARM').getValue());
    ok('fiche : saisie reçue telle quelle dans le champ', saisi === 'FAIR 248 ', JSON.stringify(saisi));
    await enregistrer();
    ok('base : référence enregistrée sans blancs (FAIR248)', code() === 'FAIR248', code());
    ok('bilan : le reste de la fiche est identique', reste() === resteAvant);
    ok('bilan : aucun autre article ne reçoit de référence', q("SELECT COUNT(*) FROM t_famille WHERE code_ubipharm IS NOT NULL AND lg_FAMILLE_ID <> '" + P + "'") === autresAvant);
    ok('bilan : t_famille_grossiste inchangée (la référence n’y est pas rangée)', q('CHECKSUM TABLE t_famille_grossiste') === grossisteAvant);

    await ouvrirModifier();
    await p.waitForFunction(() => window.winModifArticleOuverte.down('#code_UBIPHARM').getValue() === 'FAIR248', null, { timeout: 10000 }).catch(() => {});
    const c1 = await champ();
    ok('réouverture : référence réaffichée = base', c1 && c1.v === code(), JSON.stringify(c1));
    await enregistrer();

    /* enregistrer avant l'arrivee de la valeur : elle n'est pas effacee */
    await p.route('**/code-ubipharm', async (r) => { await new Promise((f) => setTimeout(f, 4000)); await r.continue(); });
    await ouvrirModifier();
    await enregistrer();
    await p.unroute('**/code-ubipharm');
    ok('enregistrer avant la lecture de la référence : elle est gardée', code() === 'FAIR248', code());

    /* ---- rapprochement : ecran fiche = base = ecran des extranets = API */
    await vues.ouvrirMenu(p, 'GESTION DES COMMANDES', 'Extranets grossistes');
    await p.waitForTimeout(1000);
    const apres = await rapprocher();
    const pApi = apres.api.data.find((x) => x.pscode === 'FAIR248');
    ok('rapprochement : FAIR248 trouvé par la référence de la fiche, un seul article = celui modifié', apres.fair && apres.fair.prestige
      && apres.fair.prestige.statut === 'PSCODE' && apres.fair.prestige.candidats.length === 1
      && apres.fair.prestige.candidats[0].familleId === P, JSON.stringify(apres.fair));
    ok('rapprochement : écran = API', JSON.stringify(pApi) === JSON.stringify(apres.fair.prestige));
    ok('rapprochement : libellé et nom de l\'article affichés', apres.cellule.indexOf('référence Ubipharm de la fiche') >= 0
      && apres.cellule.indexOf(nom.slice(0, 15)) >= 0, apres.cellule);
    ok('rapprochement : les autres produits ne changent pas', JSON.stringify(apres.ecran.filter((x) => x.pscode !== 'FAIR248'))
      === JSON.stringify(avant.ecran.filter((x) => x.pscode !== 'FAIR248')));

    /* ---- effacer depuis la fiche */
    await vues.ouvrirMenu(p, 'GESTION DU STOCK', 'Fiche Article');
    await p.waitForTimeout(1000);
    await ouvrirModifier();
    await p.waitForFunction(() => window.winModifArticleOuverte.down('#code_UBIPHARM').getValue() === 'FAIR248', null, { timeout: 10000 });
    await saisirReference('');
    await enregistrer();
    ok('effacer : NULL en base', code() === 'NULL', code());
    ok('bilan : le reste de la fiche est toujours identique', reste() === resteAvant);
    ok('aucune erreur JavaScript', erreurs.length === 0, JSON.stringify(erreurs));
  } catch (e) {
    ok('déroulé sans erreur', false, e.stack || e);
    await ENV_E2E.capture(p, 'reference-ubipharm-erreur').catch(() => {});
  } finally {
    q("UPDATE t_famille SET code_ubipharm = NULL WHERE lg_FAMILLE_ID = '" + P + "'");
    q('DELETE FROM extranet_nouveau_produit WHERE collecte_id >= ' + premiereCollecte + '; DELETE FROM extranet_collecte WHERE id >= ' + premiereCollecte);
    await p.evaluate(() => fetch('../api/v1/extranet/sessions/UBIPHARM', { method: 'DELETE' })).catch(() => {});
    ok('nettoyage : article remis à l\'identique', code() === 'NULL' && reste() === resteAvant);
    await navigateur.close();
    await srv.arreter();
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
    process.exit(ko ? 1 : 0);
  }
})();
