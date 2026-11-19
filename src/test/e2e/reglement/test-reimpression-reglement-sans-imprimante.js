/* REIMPRESSION D'UN REGLEMENT DE FACTURE SANS IMPRIMANTE (question de l'utilisateur du 18/11).
 *
 * « que se passe-t-il quand on fait un reglement de facture via un lien direct sur le serveur (serveur:8080/prestige) »
 * Le ticket sort sur l'imprimante par defaut du Payara qui sert la page : celui du serveur, pas celui de la caisse. Le
 * service Payara du serveur tourne sous le compte systeme, sans imprimante par defaut : le serveur repond alors
 * success:false et un message (imprimanteAbsente). Avant : la reimpression depuis la liste des reglements ne disait
 * rien.
 *
 * Le Payara d'essai, lui, voit une imprimante : la reponse « imprimante absente » du serveur (telle que la renvoie
 * GenerateTicketServiceImpl, prouvee par ImprimanteAbsenteTest) est donc posee sur la route, et aucun ticket ne sort.
 *
 * Ce que le test etablit, par les clics de l'utilisateur (reglement seme puis retire) :
 *  - clic sur l'imprimante de la ligne : un message « Ticket non imprimé » s'affiche, avec le texte du serveur ;
 *  - bilan : aucun reglement ajoute ni retire par la reimpression ;
 *  - aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, BASE, '-e', s], { encoding: 'utf8' });
const MARQUE = 'E2E-R1811';
const MSG = "Ticket non imprimé : le serveur Prestige du poste SERVEUR ne voit pas d'imprimante par défaut. "
  + "Le règlement est bien enregistré. Prévenez le support : l'imprimante des tickets doit être l'imprimante par défaut "
  + "du compte qui fait tourner le service Payara.";

function nettoyer() {
  exec("DELETE FROM t_reglement WHERE lg_REGLEMENT_ID='" + MARQUE + "'");
  exec("DELETE FROM t_dossier_reglement_detail WHERE lg_DOSSIER_REGLEMENT_DETAIL_ID='" + MARQUE + "-DET'");
  exec("DELETE FROM t_dossier_reglement WHERE lg_DOSSIER_REGLEMENT_ID='" + MARQUE + "-DOS'");
}
/** Reglement de facture seme sur un organisme et une facture existants ; rend l'identifiant du dossier. */
function semer() {
  nettoyer();
  const organisme = q("SELECT lg_TIERS_PAYANT_ID FROM t_tiers_payant p JOIN t_type_tiers_payant tt ON tt.lg_TYPE_TIERS_PAYANT_ID = p.lg_TYPE_TIERS_PAYANT_ID"
    + " WHERE p.str_STATUT='enable' ORDER BY p.str_FULLNAME LIMIT 1");
  const facture = q("SELECT lg_FACTURE_ID FROM t_facture ORDER BY dt_CREATED DESC LIMIT 1");
  const user = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='" + ENV_E2E.LOGIN + "'");
  exec("INSERT INTO t_dossier_reglement (lg_DOSSIER_REGLEMENT_ID, str_LIBELLE, str_NATURE_DOSSIER, dbl_AMOUNT, str_ORGANISME_ID, dt_CREATED, dt_UPDATED,"
    + " str_STATUT, lg_FACTURE_ID, lg_USER_ID, dbl_MONTANT_ATTENDU, dt_REGLEMENT) VALUES ('" + MARQUE + "-DOS', 'E2E reglement', 'FACTURE', 15000, '" + organisme + "',"
    + " NOW(), NOW(), 'enable', '" + facture + "', '" + user + "', 15000, NOW())");
  exec("INSERT INTO t_dossier_reglement_detail (lg_DOSSIER_REGLEMENT_DETAIL_ID, lg_DOSSIER_REGLEMENT_ID, str_REF, dbl_AMOUNT, str_STATUT, dt_UPDATED, dt_CREATED, lg_FACTURE_DETAIL_ID)"
    + " SELECT '" + MARQUE + "-DET', '" + MARQUE + "-DOS', 'E2E', 15000, 'enable', NOW(), NOW(), lg_FACTURE_DETAIL_ID FROM t_facture_detail"
    + " ORDER BY (lg_FACTURE_ID = '" + facture + "') DESC LIMIT 1");
  const mode = q("SELECT lg_MODE_REGLEMENT_ID FROM t_mode_reglement WHERE str_STATUT='enable' LIMIT 1");
  exec("INSERT INTO t_reglement (lg_REGLEMENT_ID, str_REF_RESSOURCE, lg_MODE_REGLEMENT_ID, dt_CREATED, dt_UPDATED, str_STATUT, dt_REGLEMENT, lg_USER_ID, bool_CHECKED)"
    + " VALUES ('" + MARQUE + "', '" + MARQUE + "-DOS', '" + mode + "', NOW(), NOW(), 'enable', NOW(), '" + user + "', 0)");
  return MARQUE + '-DOS';
}
const compter = () => q("SELECT CONCAT((SELECT COUNT(*) FROM t_reglement), '/', (SELECT COUNT(*) FROM t_dossier_reglement), '/', (SELECT COUNT(*) FROM mvttransaction))");

(async () => {
  const dossier = semer();
  const avant = compter();
  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage({ viewport: { width: 1800, height: 950 } });
  const err = [], appels = [];
  p.on('pageerror', (e) => err.push(String(e.message)));
  await p.route('**/api/v1/facturation/ticket-facture/**', (route) => {
    appels.push(route.request().url());
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: false, imprimanteAbsente: true, msg: MSG }) });
  });
  try {
    await p.goto((process.env.BASE || 'http://localhost:8080/prestige') + '/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
    await p.waitForTimeout(3000);
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('reglementmanager', 'Règlements', ''));
    await p.waitForFunction(() => Ext.ComponentQuery.query('reglementmanager').length > 0, null, { timeout: 20000 });
    // la ligne semee apparait dans la liste
    await p.waitForFunction((d) => { const g = Ext.getCmp('Grid_Reglement_ID'); return g && g.getStore().findExact('lg_DOSSIER_REGLEMENT_ID', d) >= 0; }, dossier, { timeout: 30000 });
    const icone = await p.evaluateHandle((d) => {
      const g = Ext.getCmp('Grid_Reglement_ID'); const i = g.getStore().findExact('lg_DOSSIER_REGLEMENT_ID', d);
      const n = g.getView().getNode(i);
      return Array.from(n.querySelectorAll('img, [role="button"], .x-action-col-icon')).filter((e) => /imprimer|printer/i.test((e.getAttribute('data-qtip') || '') + (e.getAttribute('title') || '') + (e.getAttribute('src') || '') + (e.getAttribute('style') || '') + (e.getAttribute('alt') || '')))[0] || null;
    }, dossier);
    ok('Ligne du règlement : icône « Re-imprimer le ticket » présente', !!(await icone.asElement()), await p.evaluate((d) => { const g = Ext.getCmp('Grid_Reglement_ID'); const n = g.getView().getNode(g.getStore().findExact('lg_DOSSIER_REGLEMENT_ID', d)); return n ? (n.innerHTML.match(/<img[^>]*>/g) || []).join(' ') : 'pas de ligne'; }, dossier));
    await icone.asElement().click();
    const affiche = await p.waitForFunction(() => {
      const w = Ext.Msg && Ext.Msg.isVisible && Ext.Msg.isVisible() ? Ext.Msg : null;
      return w ? { titre: w.header && w.header.title ? (w.header.title.text || w.header.title) : (w.title || ''), texte: w.el.dom.innerText } : null;
    }, null, { timeout: 8000 }).then((h) => h.jsonValue()).catch(() => null);
    ok('Clic sur l\'imprimante : la route du ticket est appelée une fois', appels.length === 1, appels.join(' | '));
    ok('Un message « Ticket non imprimé » s\'affiche', !!affiche && /Ticket non imprimé/.test(affiche.texte), JSON.stringify(affiche));
    ok('Le message dit pourquoi et que le règlement est enregistré', !!affiche && /imprimante par défaut/.test(affiche.texte) && /Le règlement est bien enregistré/.test(affiche.texte), affiche && affiche.texte);
    ok('Le message ne parle pas d\'une vente', !!affiche && !/vente/i.test(affiche.texte), affiche && affiche.texte);
    ok('Bilan : la réimpression n\'ajoute ni ne retire aucun règlement, dossier ou mouvement', compter() === avant, avant + ' -> ' + compter());
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Déroulé sans exception', false, e.stack || e);
  } finally {
    await b.close();
    nettoyer();
    ok('Données du test retirées', q("SELECT COUNT(*) FROM t_reglement WHERE lg_REGLEMENT_ID='" + MARQUE + "'") === '0'
      && q("SELECT COUNT(*) FROM t_dossier_reglement WHERE lg_DOSSIER_REGLEMENT_ID LIKE '" + MARQUE + "%'") === '0', '');
  }
  const ko = res.filter((r) => !r.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' PASS');
  process.exit(ko ? 1 : 0);
})();
