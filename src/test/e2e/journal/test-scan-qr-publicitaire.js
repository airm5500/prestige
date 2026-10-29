/* QR CODE PUBLICITAIRE SCANNE EN CAISSE (journal du 16/10 : « vente/findone/https://... » en erreur 404, une vingtaine
 * de fois). Le QR de la boite renvoie vers un site internet : ce n'est pas un code produit.
 *
 * Parcours par les vues (admin, aucune vente enregistree) : chaque ecran est ouvert par son menu et son bouton, le
 * geste prealable de l'ecran est fait (depot choisi, client recherche), puis le lien est tape dans son champ « Produit »
 * et Entree, comme une douchette. Le Proforma demande un client : un client d'essai fictif (« E2ESCANQR ») est cree
 * avant et retire a la fin ; aucun client reel n'est lu.
 *  - vente (SERVICE CLIENT > Ventes > Nouvelle vente) : aucun appel au serveur avec le lien, message « QR code
 *    publicitaire » dans la page (sans fenetre), champ vide ; un vrai code (CIP) scanne ensuite est cherche (la douchette
 *    l'ajoute a une vente en cours, retiree a la fin par la route de suppression de l'ecran Ventes) ;
 *  - vente depot (SERVICE CLIENT > Vente dépôt > Nouvelle vente, depot choisi), proforma (SERVICE CLIENT > Proforma >
 *    Nouveau, client recherche), ajustement (GESTION DU STOCK > Ajustement du Stock > Ajustement rayon), vente en
 *    depot (GESTION DES TIERS-PAYANTS > Gestion depots extensions, depot choisi en haut de l'ecran) : meme refus ;
 *  - code lu contenant « / » et « # » (retour du 23/10) : dans chaque ecran, il part encode a la recherche du produit
 *    (findone/E2E%2F12%233), au lieu d'une adresse coupee ou mal routee ;
 *  - aucun ajustement ni vente cree par l'essai.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer, choisir, texteMessage, repondre } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const CIP = q("SELECT f.int_CIP FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
  + " WHERE f.str_STATUT = 'enable' AND s.int_NUMBER_AVAILABLE > 5 AND LENGTH(f.int_CIP) = 7 LIMIT 1");
const LIEN = 'https://happymamabybledina.com';
const CLIENT = 'E2E-SCAN-CL';
const ventesCreees = [];
const compte = () => q("SELECT CONCAT((SELECT COUNT(*) FROM t_ajustement), '/', (SELECT COUNT(*) FROM t_preenregistrement))");
const retirerClient = () => q("DELETE FROM t_client WHERE lg_CLIENT_ID = '" + CLIENT + "'");
/* la base de travail n'a pas toujours de depot : un depot d'extension d'essai est pose s'il n'y en a aucun, et retire */
const DEPOT = 'E2E-SCAN-DEPOT';
const retirerDepot = () => q("DELETE FROM t_emplacement WHERE lg_EMPLACEMENT_ID = '" + DEPOT + "'");
function poserDepot() {
  retirerDepot();
  if (q("SELECT COUNT(*) FROM t_emplacement WHERE lg_EMPLACEMENT_ID <> '1' AND str_STATUT = 'enable' AND lg_TYPEDEPOT_ID = '2'") !== '0') { return; }
  q("INSERT INTO t_emplacement (lg_EMPLACEMENT_ID, lg_COMPTE_CLIENT_ID, str_NAME, str_DESCRIPTION, str_LOCALITE, str_FIRST_NAME, str_LAST_NAME,"
    + " str_PHONE, dt_CREATED, dt_UPDATED, str_STATUT, lg_TYPEDEPOT_ID, bool_SAME_LOCATION) SELECT '" + DEPOT + "', lg_COMPTE_CLIENT_ID, 'DEPOT E2E SCAN',"
    + " 'E2E', 'ABOBO', 'ESSAI', 'Depot', '0700000000', NOW(), NOW(), 'enable', '2', 0 FROM t_compte_client cc"
    + " WHERE EXISTS (SELECT 1 FROM t_client c WHERE c.lg_CLIENT_ID = cc.lg_CLIENT_ID AND c.str_STATUT = 'enable') LIMIT 1");
}

/* ecran : menu, bouton d'ajout eventuel, champ produit */
const ECRANS = [
  { nom: 'Vente', menu: ['SERVICE CLIENT', 'Ventes'], ajout: 'cloturerventemanager #addBtn', produit: 'doventemanager #contenu [xtype=fieldcontainer] #produit' },
  { nom: 'Vente dépôt', menu: ['SERVICE CLIENT', 'Vente dépôt'], ajout: 'ventedepot #addBtn', avant: (p) => choisir(p, 'addventedepotbis #typeVente', 0), produit: 'addventedepotbis #contenu [xtype=fieldcontainer] #produit' },
  { nom: 'Proforma', menu: ['SERVICE CLIENT', 'Proforma'], ajout: 'devismanager #addBtn', avant: async (p) => {
      await cliquer(p, 'doDevis #contenu #clientSearchTextField');
      await p.keyboard.type('E2ESCANQR'); await p.keyboard.press('Enter');
      await p.waitForFunction(() => { const c = testextjs.app.getController('DevisCtr').client; return !!c; }, null, { timeout: 15000 }); }, produit: 'doDevis #contenu [xtype=fieldcontainer] #produit' },
  { nom: 'Ajustement', menu: ['GESTION DU STOCK', 'Ajustement du Stock'], ajout: 'ajustementgestion #addBtnRayon', produit: 'doajustementmanager #produit' },
  { nom: 'Vente en dépôt (extensions)', menu: ['GESTION DES TIERS-PAYANTS', 'Gestion depots extensions'],
    avant: (p) => choisir(p, 'depotextension #depotEcran', 0), produit: 'depotextension doventeendepot #contenu [xtype=fieldcontainer] #produit' }
];

(async () => {
  poserDepot();
  retirerClient();
  const avant = compte();
  q("INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, lg_TYPE_CLIENT_ID, str_STATUT, dt_CREATED) VALUES ('" + CLIENT + "', 'E2ESCANQR', 'ESSAI', '6', 'enable', NOW())");
  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const CODE = 'E2E/12#3';
  const bruts = []; p.on('request', (r) => { if (/vente\/findone\//.test(r.url())) { bruts.push(r.url()); } });
  const appels = []; p.on('request', (r) => { const u = decodeURIComponent(r.url()); if (/happymama/.test(u) || (CIP && u.indexOf(CIP) >= 0)) { appels.push(u); } });
  const scanner = async (champ, texte) => {
    await cliquer(p, champ);
    await p.keyboard.press('Control+A'); await p.keyboard.press('Backspace');
    await p.keyboard.type(texte, { delay: 5 });
    await p.keyboard.press('Enter');
    await p.waitForTimeout(2000);
  };
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    for (const e of ECRANS) {
      try {
        appels.length = 0;
        await ouvrirMenu(p, e.menu[0], e.menu[1]);
        if (e.ajout) {
          await p.waitForFunction((r) => Ext.ComponentQuery.query(r).some((x) => x.isVisible(true)), e.ajout, { timeout: 60000 });
          await cliquer(p, e.ajout);
        }
        await p.waitForFunction((r) => Ext.ComponentQuery.query(r).some((x) => x.isVisible(true)), e.produit, { timeout: 60000 });
        await p.waitForTimeout(1500);
        if (e.avant) { await e.avant(p); await p.waitForTimeout(800); }
        await scanner(e.produit, LIEN);
        const etat = await p.evaluate((r) => ({ champ: Ext.ComponentQuery.query(r).filter((x) => x.isVisible(true))[0].getRawValue(),
          fenetre: Ext.ComponentQuery.query('messagebox{isVisible()}').length > 0, texte: document.body.innerText.indexOf('QR code publicitaire') >= 0 }), e.produit);
        ok(e.nom + ' : lien scanné → aucun appel au serveur, « QR code publicitaire » sans fenêtre, champ vidé',
          appels.length === 0 && etat.texte && !etat.fenetre && etat.champ === '', JSON.stringify(etat) + ' appels : ' + appels.join(' '));
        if (e.nom !== 'Vente') {
          bruts.length = 0;
          await p.waitForFunction(() => document.body.innerText.indexOf('QR code publicitaire') < 0, null, { timeout: 15000 }).catch(() => {});
          await scanner(e.produit, CODE);
          ok(e.nom + ' : code avec « / » et « # » envoyé encodé', bruts.some((u) => u.replace(/\?.*/, '').endsWith('/vente/findone/E2E%2F12%233')), bruts.join(' '));
        }
        if (e.nom === 'Vente') {
          await p.waitForFunction(() => document.body.innerText.indexOf('QR code publicitaire') < 0, null, { timeout: 15000 }).catch(() => {});
          await scanner(e.produit, CIP);
          ok('Vente : un vrai code scanné ensuite est cherché normalement', appels.some((u) => u.indexOf(CIP) >= 0), appels.join(' '));
          await p.waitForFunction(() => { const c = testextjs.app.getController('VenteCtr').current; return c && c.lgPREENREGISTREMENTID; }, null, { timeout: 15000 }).catch(() => {});
          const id = await p.evaluate(() => { const c = testextjs.app.getController('VenteCtr').current; return c && c.lgPREENREGISTREMENTID; });
          if (id) { ventesCreees.push(id); }
        }
      } catch (x) {
        ok(e.nom + ' : parcours sans exception', false, x.message);
      }
      /* un message reste ouvert apres un echec : il est ferme pour l'ecran suivant ; une fenetre (ajustement) aussi, par sa croix */
      for (let i = 0; i < 3 && await texteMessage(p); i++) { await repondre(p, 'ok').catch(() => repondre(p, 'no')).catch(() => {}); await p.waitForTimeout(300); }
      for (const croix of await p.locator('.x-window .x-tool-close').filter({ visible: true }).all()) { await croix.click().catch(() => {}); await p.waitForTimeout(500); }
    }
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    for (const id of ventesCreees) {
      await p.evaluate((id) => fetch('../api/v1/ventestats/remove/' + id, { method: 'POST' }).then((r) => r.status), id).catch(() => 0);
    }
    await b.close();
    retirerClient();
    retirerDepot();
    ok('Aucun ajustement ni vente créé par l\'essai', compte() === avant, avant + ' → ' + compte());
    ok('Client et dépôt d\'essai retirés', q("SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID = '" + CLIENT + "'") === '0'
      && q("SELECT COUNT(*) FROM t_emplacement WHERE lg_EMPLACEMENT_ID = '" + DEPOT + "'") === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
