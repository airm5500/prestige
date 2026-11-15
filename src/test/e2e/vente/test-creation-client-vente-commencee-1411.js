/* VIDEO DU 13/11 : CLIENT CREE SUR UNE VENTE DEJA COMMENCEE, « CLIENT ABSENT DE CETTE VENTE ».
 *
 * Parcours de la video : vente au comptant, un produit, « Assurance », recherche d'un nom inconnu, « Oui » a « Voulez-
 * vous ajouter un nouveau client ? », fiche remplie (nom, prenoms, matricule, assurance, pourcentage), « Enregistrer ».
 * Le client etait cree mais pas rattache a la vente : l'ecran montrait « Client absent de cette vente ». La vente
 * existant deja, l'ecran prenait le chemin de la MODIFICATION du tiers-payant d'un client ouvert, sans client.
 *
 * Verifie, pour une vente assurance puis pour une vente carnet commencees par un produit :
 *   1. apres « Enregistrer » : pas de « Client absent », le bloc du tiers-payant du client est affiche ;
 *   2. en base, la vente porte le client cree et UN lien vers son tiers-payant (celui choisi, au pourcentage saisi) ;
 *   3. rapprochement ecran = base : client de l'ecran = client de la vente ; lignes inchangees ;
 *   4. non-regression : sur une vente pas encore commencee (aucun produit), le client cree est pris comme avant.
 * Donnees d'essai retirees (ventes, clients crees), stocks remis.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu, cliquer, repondre } = require('../outils/vues');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const DB = process.env.DB_TEST || ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', DB, '-sN', '--raw', '-e', s], { encoding: 'utf8' }).replace(/\r/g, '').trim();
const P = 'E2ECREA';
const ADMIN = q(`SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN}'`);
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
let produit = null;

const ventesDuTest = () => q(`SELECT IFNULL(GROUP_CONCAT(CONCAT('''', lg_PREENREGISTREMENT_ID, '''')), '''-''') FROM t_preenregistrement
  WHERE dt_CREATED >= '${DEBUT}' AND lg_USER_ID = '${ADMIN}'`);
const clientsDuTest = () => q(`SELECT IFNULL(GROUP_CONCAT(CONCAT('''', lg_CLIENT_ID, '''')), '''-''') FROM t_client WHERE str_NUMERO_SECURITE_SOCIAL LIKE '${P}%'`);
function nettoyer() {
  const v = ventesDuTest(), c = clientsDuTest();
  q(`DELETE FROM prix_reference_saisie WHERE vente_id IN (${v});
     DELETE FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID IN (${v});
     DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (${v});
     UPDATE t_preenregistrement SET lg_PARENT_ID = NULL WHERE lg_PREENREGISTREMENT_ID IN (${v});
     DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (${v});
     DELETE FROM t_ayant_droit WHERE lg_CLIENT_ID IN (${c});
     DELETE FROM t_compte_client_tiers_payant WHERE lg_COMPTE_CLIENT_ID IN (SELECT lg_COMPTE_CLIENT_ID FROM t_compte_client WHERE lg_CLIENT_ID IN (${c}));
     DELETE FROM t_compte_client WHERE lg_CLIENT_ID IN (${c});
     DELETE FROM t_client WHERE lg_CLIENT_ID IN (${c});`);
  if (produit) { q(`UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = ${produit.dispo}, int_NUMBER = ${produit.stock} WHERE lg_FAMILLE_ID = '${produit.id}' AND lg_EMPLACEMENT_ID = '1'`); }
}

(async () => {
  let b = null;
  const erreurs = [];
  try {
    const l = q(`SELECT f.lg_FAMILLE_ID, f.int_CIP, s.int_NUMBER_AVAILABLE, s.int_NUMBER FROM t_famille f
      JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'
      WHERE f.str_STATUT = 'enable' AND f.int_PRICE BETWEEN 300 AND 6000 AND COALESCE(f.bool_DECONDITIONNE, 0) = 0
        AND COALESCE(f.lg_FAMILLE_PARENT_ID, '') = '' AND f.bool_ACCOUNT = 1 AND f.int_CIP REGEXP '^[0-9]{6,8}$'
        AND (SELECT COUNT(*) FROM t_famille g WHERE g.int_CIP = f.int_CIP) = 1
      ORDER BY f.lg_FAMILLE_ID LIMIT 1`).split('\t');
    produit = { id: l[0], cip: l[1], dispo: l[2], stock: l[3] };
    q(`UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = 100, int_NUMBER = 100 WHERE lg_FAMILLE_ID = '${produit.id}' AND lg_EMPLACEMENT_ID = '1'`);

    b = await ENV_E2E.lancer(chromium);
    const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
    p.on('pageerror', (e) => erreurs.push(e.message));
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'SERVICE CLIENT', 'Ventes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('cloturerventemanager #addBtn').some((x) => x.isVisible(true)), null, { timeout: 60000 });

    const nouvelleVente = async () => {
      await p.evaluate(() => { const v = Ext.ComponentQuery.query('doventemanager')[0]; if (v && v.isVisible(true)) { const r = v.down('#btnGoBack') || v.down('[text=RETOUR]'); } return true; });
      if (!await p.evaluate(() => Ext.ComponentQuery.query('cloturerventemanager #addBtn').some((x) => x.isVisible(true)))) {
        await ouvrirMenu(p, 'SERVICE CLIENT', 'Ventes');
        await p.waitForFunction(() => Ext.ComponentQuery.query('cloturerventemanager #addBtn').some((x) => x.isVisible(true)), null, { timeout: 60000 });
      }
      await cliquer(p, 'cloturerventemanager #addBtn');
      await p.waitForFunction(() => Ext.ComponentQuery.query('doventemanager #typeVente').some((x) => x.isVisible(true)), null, { timeout: 60000 });
      await p.waitForTimeout(1500);
    };
    const cliquerType = async (v) => {
      const id = await p.evaluate((x) => { const d = Ext.ComponentQuery.query('doventemanager #typeVente')[0].bodyEl.dom.querySelector('.seg-bouton[data-valeur="' + x + '"]');
        d.id = 'e2e-seg-' + x + Date.now(); return d.id; }, v);
      await p.click('#' + id);
      await p.waitForTimeout(1500);
    };
    const ajouter = async (cip, qte) => {
      await p.evaluate(() => { testextjs.app.getController('VenteCtr').getVnoproduitCombo().focus(); return true; });
      await p.keyboard.type(cip, { delay: 30 });
      await p.waitForFunction(() => { const cb = testextjs.app.getController('VenteCtr').getVnoproduitCombo(); return cb.isExpanded && cb.getStore().getCount() > 0 && !cb.getStore().isLoading(); }, null, { timeout: 30000 });
      await p.keyboard.press('Enter');
      await p.waitForTimeout(800);
      await p.keyboard.press('Control+A');
      await p.keyboard.type(String(qte));
      await p.keyboard.press('Enter');
      await p.waitForTimeout(2500);
    };
    /* recherche d'un nom inconnu, « Oui » a la creation, fiche remplie, « Enregistrer » (parcours de la video) */
    const creerClient = async (fenetre, suffixe, pourcentage) => {
      await cliquer(p, 'doventemanager #contenu #clientSearchTextField');
      await p.keyboard.type(P + 'INCONNU' + suffixe, { delay: 20 });
      await p.keyboard.press('Enter');
      await p.waitForFunction(() => Ext.ComponentQuery.query('messagebox').some((m) => m.isVisible() && /nouveau client/i.test(m.el.dom.textContent)), null, { timeout: 30000 });
      await repondre(p, 'yes');
      await p.waitForFunction((w) => Ext.ComponentQuery.query(w).some((x) => x.isVisible()), fenetre, { timeout: 30000 });
      await p.waitForTimeout(800);
      const champ = async (nom, texte) => { await cliquer(p, `${fenetre} [name=${nom}]`); await p.keyboard.type(texte, { delay: 10 }); };
      await champ('strFIRSTNAME', P);
      await champ('strLASTNAME', 'ESSAI ' + suffixe);
      await champ('strNUMEROSECURITESOCIAL', P + 'MAT' + suffixe);
      /* assurance : la liste ouverte par sa fleche, premier organisme propose */
      const tp = await p.evaluate((w) => { const c = Ext.ComponentQuery.query(w + ' [name=lgTIERSPAYANTID]')[0]; c.onTriggerClick(); return c.getId(); }, fenetre);
      await p.waitForFunction((id) => { const c = Ext.getCmp(id); return c.isExpanded && c.getStore().getCount() > 0 && !c.getStore().isLoading(); }, tp, { timeout: 30000 });
      const liste = await p.evaluate((id) => Ext.getCmp(id).getPicker().getId(), tp);
      await p.locator('#' + liste + ' .x-boundlist-item').first().click();
      await p.waitForTimeout(500);
      const choisi = await p.evaluate((id) => Ext.getCmp(id).getValue(), tp);
      const pct = await p.evaluate((w) => { const c = Ext.ComponentQuery.query(w + ' [name=intPOURCENTAGE]')[0]; return c.getId(); }, fenetre);
      await p.click('#' + pct + '-inputEl');
      await p.keyboard.press('Control+A');
      await p.keyboard.type(String(pourcentage));
      await cliquer(p, `${fenetre} #btnAddClientAssurance`);
      await p.waitForTimeout(3500);
      await p.evaluate(() => Ext.ComponentQuery.query('window').filter((w) => w.isVisible() && /ayant/i.test(w.title || '')).forEach((w) => w.close()));
      return choisi;
    };
    const vente = () => p.evaluate(() => { const c = testextjs.app.getController('VenteCtr').getCurrent(); return c ? c.lgPREENREGISTREMENTID : null; });
    const ecran = () => p.evaluate(() => { const c = testextjs.app.getController('VenteCtr'), v = Ext.ComponentQuery.query('doventemanager')[0];
      return { client: c.getClient() ? c.getClient().get('lgCLIENTID') : null, absent: !!v.down('#clientAbsent'), tp: c.getTpContainerForm().items.getCount(),
        messages: Ext.ComponentQuery.query('messagebox').filter((m) => m.isVisible()).map((m) => m.el.dom.textContent.trim().slice(0, 150)) }; });
    const base = (id) => {
      const [client, typeVente] = q(`SELECT IFNULL(lg_CLIENT_ID, '-'), str_TYPE_VENTE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${id}'`).split('\t');
      const liens = q(`SELECT CONCAT(c.lg_TIERS_PAYANT_ID, ':', l.int_PERCENT) FROM t_preenregistrement_compte_client_tiers_payent l
        JOIN t_compte_client_tiers_payant c ON c.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = l.lg_COMPTE_CLIENT_TIERS_PAYANT_ID WHERE l.lg_PREENREGISTREMENT_ID = '${id}'`).split('\n').filter(Boolean);
      const lignes = q(`SELECT CONCAT(lg_FAMILLE_ID, ':', int_QUANTITY, ':', int_PRICE) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '${id}'`).split('\n').filter(Boolean);
      return { client, typeVente, liens, lignes };
    };
    const clientCree = (suffixe) => q(`SELECT lg_CLIENT_ID FROM t_client WHERE str_NUMERO_SECURITE_SOCIAL = '${P}MAT${suffixe}'`);

    for (const [type, libelle, fenetre, pourcentage] of [['2', 'Assurance', 'addaddclientwindow', 70], ['3', 'Carnet', 'addCarnetwindow', 100]]) {
      await nouvelleVente();
      await ajouter(produit.cip, 2);
      const id = await vente();
      await cliquerType(type);
      const avant = base(id);
      ok(`${libelle} : vente commencée (produit x2), passée en ${libelle.toLowerCase()} sans client`, !!id && avant.client === '-' && avant.lignes.length === 1, JSON.stringify(avant));
      const tp = await creerClient(fenetre, type, pourcentage);
      const cree = clientCree(type), e = await ecran(), apres = base(id);
      ok(`${libelle} : client créé en base`, !!cree, cree);
      ok(`${libelle} 1. après « Enregistrer » : pas de « Client absent », bloc du tiers-payant affiché, aucun message`, !e.absent && e.tp > 0 && e.messages.length === 0, JSON.stringify(e));
      ok(`${libelle} 2. en base : la vente porte le client créé et un lien vers le tiers-payant choisi (${pourcentage} %)`,
        apres.client === cree && apres.liens.length === 1 && apres.liens[0] === `${tp}:${pourcentage}`, JSON.stringify({ apres, tp }));
      ok(`${libelle} 3. écran = base : client de l'écran = client de la vente ; lignes inchangées`, e.client === apres.client && JSON.stringify(apres.lignes) === JSON.stringify(avant.lignes), JSON.stringify({ ecran: e.client, base: apres.client }));
      await p.evaluate(() => { const c = testextjs.app.getController('VenteCtr'); return true; });
      await ouvrirMenu(p, 'SERVICE CLIENT', 'Ventes');
      await p.waitForFunction(() => Ext.ComponentQuery.query('cloturerventemanager #addBtn').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    }
    /* 4. vente pas encore commencee : le client cree est pris comme avant */
    await nouvelleVente();
    await cliquerType('2');
    await creerClient('addaddclientwindow', '4', 80);
    const cree4 = clientCree('4'), e4 = await ecran();
    ok('4. Non-régression : sans vente commencée, le client créé est pris à l\'écran (bloc tiers-payant, pas de « Client absent »)', e4.client === cree4 && !e4.absent && e4.tp > 0, JSON.stringify(e4));
    await ajouter(produit.cip, 1);
    const v4 = base(await vente());
    ok('4. Puis le premier produit crée la vente avec ce client et son tiers-payant', v4.client === cree4 && v4.liens.length === 1 && v4.lignes.length === 1, JSON.stringify(v4));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    if (b) { await b.close(); }
    nettoyer();
    ok('Données d\'essai retirées', clientsDuTest() === "'-'" && ventesDuTest() === "'-'");
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
