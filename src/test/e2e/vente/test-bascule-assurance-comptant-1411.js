/* DEMANDE DU 14/11 : BASCULE D'UNE VENTE ASSURANCE (OU CARNET) VERS LE COMPTANT.
 *
 * Avant : « Imposible de modifier une vente assurance en vente au comptant », la vente restait en assurance, et la
 * suite (creation d'un client) finissait sur « Client absent de cette vente ». Desormais le bouton « Au comptant »
 * pose la question dans le bouton (aucune fenetre) ; un second clic confirme, et la vente passe au comptant SANS
 * RESIDU : ni client, ni ayant droit, ni tiers-payants, ni bon, ni prix de reference saisis, ni « premier » marque.
 * Les produits restent.
 *
 * Parcours par les vues : SERVICE CLIENT > Ventes, « Nouvelle vente » ; produit A x2 au comptant ; « Assurance »
 * (immediat, comme avant) ; client E2EBASC (2 tiers-payants, 1 ayant droit) ; produit B x1 ; puis « Au comptant » :
 *   1. premier clic : la question est dans le bouton, rien ne change en base ni a l'ecran ;
 *   2. sans second clic, le bouton redevient « Au comptant » apres quelques secondes, la vente reste en assurance ;
 *   3. second clic : bilan avant / apres en base (type, client, ayant droit, noms, bon, liens tiers-payant, saisies de
 *      prix de reference, marque « premier ») et rapprochement ecran = base des lignes (produits, quantites, prix) ;
 *   4. la vente continue au comptant (produit C ajoute) ;
 *   5. carnet -> comptant : meme question dans le bouton ; comptant -> carnet ou assurance : immediat.
 * Donnees d'essai retirees (vente, lignes, client), stocks remis.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu, cliquer } = require('../outils/vues');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const DB = process.env.DB_TEST || ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', DB, '-sN', '--raw', '-e', s], { encoding: 'utf8' }).replace(/\r/g, '').trim();
const P = 'E2EBASC';
const ADMIN = q(`SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN}'`);
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
let produits = [];

const ventesDuTest = () => q(`SELECT IFNULL(GROUP_CONCAT(CONCAT('''', lg_PREENREGISTREMENT_ID, '''')), '''-''') FROM t_preenregistrement
  WHERE dt_CREATED >= '${DEBUT}' AND lg_USER_ID = '${ADMIN}'`);
function nettoyer() {
  const v = ventesDuTest();
  q(`DELETE FROM prix_reference_saisie WHERE vente_id IN (${v});
     DELETE FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID IN (${v});
     DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (${v});
     UPDATE t_preenregistrement SET lg_PARENT_ID = NULL WHERE lg_PREENREGISTREMENT_ID IN (${v});
     DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (${v});
     DELETE FROM t_ayant_droit WHERE lg_AYANTS_DROITS_ID LIKE '${P}%';
     DELETE FROM t_compte_client_tiers_payant WHERE lg_COMPTE_CLIENT_TIERS_PAYANT_ID LIKE '${P}%';
     DELETE FROM t_compte_client WHERE lg_COMPTE_CLIENT_ID LIKE '${P}%';
     DELETE FROM t_client WHERE lg_CLIENT_ID LIKE '${P}%';`);
  produits.forEach((x) => q(`UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = ${x.dispo}, int_NUMBER = ${x.stock} WHERE lg_FAMILLE_ID = '${x.id}' AND lg_EMPLACEMENT_ID = '1'`));
}

(async () => {
  let b = null;
  const erreurs = [];
  try {
    const tp = q(`SELECT lg_TIERS_PAYANT_ID FROM t_tiers_payant WHERE str_STATUT = 'enable' ORDER BY lg_TIERS_PAYANT_ID LIMIT 2`).split('\n');
    produits = q(`SELECT f.lg_FAMILLE_ID, f.int_CIP, f.int_PRICE, s.int_NUMBER_AVAILABLE, s.int_NUMBER FROM t_famille f
      JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'
      WHERE f.str_STATUT = 'enable' AND f.int_PRICE BETWEEN 300 AND 6000 AND COALESCE(f.bool_DECONDITIONNE, 0) = 0
        AND COALESCE(f.lg_FAMILLE_PARENT_ID, '') = '' AND f.bool_ACCOUNT = 1 AND f.int_CIP REGEXP '^[0-9]{6,8}$'
        AND (SELECT COUNT(*) FROM t_famille g WHERE g.int_CIP = f.int_CIP) = 1
      ORDER BY f.lg_FAMILLE_ID LIMIT 3`).split('\n').map((l) => { const [id, cip, prix, dispo, stock] = l.split('\t'); return { id, cip, prix: Number(prix), dispo, stock }; });
    ok('Précondition : 3 produits et 2 organismes actifs', produits.length === 3 && tp.length === 2, produits.map((x) => x.cip).join(','));
    produits.forEach((x) => q(`UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = 100, int_NUMBER = 100 WHERE lg_FAMILLE_ID = '${x.id}' AND lg_EMPLACEMENT_ID = '1'`));
    q(`INSERT INTO t_client (lg_CLIENT_ID, str_CODE_INTERNE, str_FIRST_NAME, str_LAST_NAME, str_NUMERO_SECURITE_SOCIAL, lg_TYPE_CLIENT_ID, dt_CREATED, dt_UPDATED, str_STATUT)
         VALUES ('${P}-C', '${P}1', '${P}', 'ESSAI', '${P}MAT', '1', NOW(), NOW(), 'enable');
       INSERT INTO t_compte_client (lg_COMPTE_CLIENT_ID, lg_CLIENT_ID, str_STATUT, dt_CREATED, dt_UPDATED, dbl_PLAFOND, dbl_QUOTA_CONSO_MENSUELLE) VALUES ('${P}-K', '${P}-C', 'enable', NOW(), NOW(), 0, 0);
       INSERT INTO t_compte_client_tiers_payant (lg_COMPTE_CLIENT_TIERS_PAYANT_ID, lg_COMPTE_CLIENT_ID, lg_TIERS_PAYANT_ID, dt_CREATED, dt_UPDATED, str_STATUT,
         int_POURCENTAGE, int_PRIORITY, dbl_PLAFOND, dbl_QUOTA_CONSO_MENSUELLE, str_NUMERO_SECURITE_SOCIAL, db_PLAFOND_ENCOURS, db_CONSOMMATION_MENSUELLE, b_IsAbsolute, b_CANBEUSE)
         VALUES ('${P}-L1', '${P}-K', '${tp[0]}', NOW(), NOW(), 'enable', 70, 1, 0, 0, '${P}MAT', 0, 0, 0, 1),
                ('${P}-L2', '${P}-K', '${tp[1]}', NOW(), NOW(), 'enable', 15, 2, 0, 0, '${P}MAT', 0, 0, 0, 1);
       INSERT INTO t_ayant_droit (lg_AYANTS_DROITS_ID, lg_CLIENT_ID, str_CODE_INTERNE, str_FIRST_NAME, str_LAST_NAME, str_NUMERO_SECURITE_SOCIAL, dt_CREATED, dt_UPDATED, str_STATUT)
         VALUES ('${P}-A', '${P}-C', '${P}A', '${P}', 'AYANT', '${P}AD', NOW(), NOW(), 'enable');`);

    b = await ENV_E2E.lancer(chromium);
    const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
    p.on('pageerror', (e) => erreurs.push(e.message));
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'SERVICE CLIENT', 'Ventes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('cloturerventemanager #addBtn').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await cliquer(p, 'cloturerventemanager #addBtn');
    await p.waitForFunction(() => Ext.ComponentQuery.query('doventemanager #typeVente').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await p.waitForTimeout(1500);

    const bouton = (v) => p.evaluate((x) => { const d = Ext.ComponentQuery.query('doventemanager #typeVente')[0].bodyEl.dom.querySelector('.seg-bouton[data-valeur="' + x + '"]');
      return d ? d.textContent.trim() : null; }, v);
    const cliquerType = async (v) => {
      const id = await p.evaluate((x) => { const d = Ext.ComponentQuery.query('doventemanager #typeVente')[0].bodyEl.dom.querySelector('.seg-bouton[data-valeur="' + x + '"]');
        d.id = 'e2e-seg-' + x; return d.id; }, v);
      await p.click('#' + id);
      await p.waitForTimeout(1500);
    };
    const ajouter = async (cip, qte) => {
      await p.evaluate(() => { testextjs.app.getController('VenteCtr').getVnoproduitCombo().focus(); return true; });
      await p.keyboard.type(cip, { delay: 30 });
      await p.waitForFunction((c) => { const cb = testextjs.app.getController('VenteCtr').getVnoproduitCombo(); return cb.isExpanded && cb.getStore().getCount() > 0 && !cb.getStore().isLoading(); }, cip, { timeout: 30000 });
      await p.keyboard.press('Enter');
      await p.waitForTimeout(800);
      await p.keyboard.press('Control+A');
      await p.keyboard.type(String(qte));
      await p.keyboard.press('Enter');
      await p.waitForTimeout(2500);
    };
    const vente = () => p.evaluate(() => { const c = testextjs.app.getController('VenteCtr').getCurrent(); return c ? c.lgPREENREGISTREMENTID : null; });
    const etatBase = (id) => {
      const [type, typeVente, client, ayant, prenom, nom, bon] = q(`SELECT lg_TYPE_VENTE_ID, str_TYPE_VENTE, IFNULL(lg_CLIENT_ID, '-'), IFNULL(lg_AYANTS_DROITS_ID, '-'),
        IFNULL(str_FIRST_NAME_CUSTOMER, '-'), IFNULL(str_LAST_NAME_CUSTOMER, '-'), IFNULL(str_REF_BON, '-') FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${id}'`).split('\t');
      return { type, typeVente, client, ayant, noms: prenom !== '-' || nom !== '-', bon,
        liens: Number(q(`SELECT COUNT(*) FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID = '${id}'`)),
        saisies: Number(q(`SELECT COUNT(*) FROM prix_reference_saisie WHERE vente_id = '${id}'`)),
        premiers: Number(q(`SELECT COUNT(*) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '${id}' AND tp_premier_id IS NOT NULL`)),
        lignes: q(`SELECT CONCAT(lg_FAMILLE_ID, ':', int_QUANTITY, ':', int_PRICE_UNITAIR, ':', int_PRICE) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '${id}' ORDER BY lg_FAMILLE_ID`).split('\n').filter(Boolean) };
    };
    const ecran = () => p.evaluate(() => { const c = testextjs.app.getController('VenteCtr'), v = Ext.ComponentQuery.query('doventemanager')[0];
      return { type: c.getTypeVenteCombo().getValue(), client: c.getClient() ? c.getClient().get('lgCLIENTID') : null,
        assure: c.getAssureContainer().isVisible(), absent: !!v.down('#clientAbsent'), tp: c.getTpContainerForm().items.getCount(),
        messages: Ext.ComponentQuery.query('messagebox').filter((m) => m.isVisible()).map((m) => m.el.dom.textContent.trim().slice(0, 120)),
        lignes: c.getVnogrid().getStore().getRange().map((r) => [r.get('lgFAMILLEID') || r.get('produitId'), r.get('intQUANTITY'), r.get('intPRICEUNITAIR'), r.get('intPRICE')].join(':')).sort() }; });

    /* comptant : produit A x2 */
    await ajouter(produits[0].cip, 2);
    const id = await vente();
    ok('Vente au comptant créée avec le produit A x2', !!id && etatBase(id).lignes.length === 1, id);
    /* assurance : immediat */
    await cliquerType('2');
    let e = await ecran(), base = etatBase(id);
    ok('Comptant -> Assurance : immédiat, sans question (comme avant)', e.type === '2' && base.typeVente === 'VO' && await bouton('2') === 'Assurance', JSON.stringify({ e, base }));
    /* 0. image du 14/11 : retour AUSSITOT au comptant, aucun client encore : immediat, sans question ni message */
    const lignes0 = base.lignes;
    await cliquerType('1');
    e = await ecran(); base = etatBase(id);
    ok('0. Assurance sans client -> Comptant : immédiat, aucun message (« Imposible… » sur l\'image du 14/11)',
      e.type === '1' && e.messages.length === 0 && base.type === '1' && base.typeVente === 'VNO' && await bouton('1') === 'Au comptant', JSON.stringify({ e, base }));
    ok('0. Lignes intactes', JSON.stringify(base.lignes) === JSON.stringify(lignes0), JSON.stringify(base.lignes));
    await cliquerType('2');
    ok('0. Puis de nouveau « Assurance » : immédiat', (await ecran()).type === '2' && etatBase(id).typeVente === 'VO');
    await cliquer(p, 'doventemanager #contenu #clientSearchTextField');
    await p.keyboard.type(P, { delay: 20 });
    await p.keyboard.press('Enter');
    await p.waitForTimeout(3000);
    await p.evaluate(() => Ext.ComponentQuery.query('window').filter((w) => w.isVisible() && /ayant/i.test(w.title || '')).forEach((w) => w.close()));
    await ajouter(produits[1].cip, 1);
    const lienEcran = etatBase(id).liens;
    ok('Client choisi à l\'écran : la vente porte son tiers-payant principal', lienEcran === 1, lienEcran);
    /* residus que la caisse peut laisser : assurance complementaire, prix de reference saisi, « premier » sur une ligne */
    const ligneB = q(`SELECT lg_PREENREGISTREMENT_DETAIL_ID FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '${id}' AND lg_FAMILLE_ID = '${produits[1].id}'`);
    q(`INSERT INTO t_preenregistrement_compte_client_tiers_payent (lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID, lg_PREENREGISTREMENT_ID,
         lg_COMPTE_CLIENT_TIERS_PAYANT_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PERCENT, int_PRICE, int_PRICE_RESTE, str_REF_BON)
       VALUES ('${P}-PC2', '${id}', '${P}-L2', '${ADMIN}', 'is_Process', NOW(), NOW(), 15, 0, 0, 'BON-E2E-2');
       INSERT INTO prix_reference_saisie (id, vente_id, detail_id, produit_id, tiers_payant_id, type_prix, valeur, utilisateur_id, date_saisie)
       VALUES ('${P}-S', '${id}', '${ligneB}', '${produits[1].id}', '${tp[0]}', 'PRIX', 100, '${ADMIN}', NOW());
       UPDATE t_preenregistrement_detail SET tp_premier_id = '${P}-L1' WHERE lg_PREENREGISTREMENT_DETAIL_ID = '${ligneB}';`);
    const avant = etatBase(id);
    ok('Vente assurance avec client, 2 tiers-payants, produit B, prix saisi et « premier » marqué',
      avant.client === `${P}-C` && avant.liens === 2 && avant.lignes.length === 2 && avant.saisies === 1 && avant.premiers === 1, JSON.stringify(avant));

    /* 1. premier clic : question dans le bouton, rien ne change */
    await cliquerType('1');
    e = await ecran();
    const texte = await bouton('1');
    ok('1. Premier clic sur « Au comptant » : la question est dans le bouton', /retirer le client/i.test(texte || ''), texte);
    ok('1. Aucune fenêtre, rien ne change à l\'écran ni en base', e.messages.length === 0 && e.type === '2' && e.client === `${P}-C`
      && JSON.stringify(etatBase(id)) === JSON.stringify(avant), JSON.stringify({ messages: e.messages, type: e.type, client: e.client }));
    /* 2. sans second clic : le bouton se remet */
    await p.waitForTimeout(7000);
    ok('2. Sans second clic, le bouton redevient « Au comptant » ; la vente reste en assurance', await bouton('1') === 'Au comptant'
      && JSON.stringify(etatBase(id)) === JSON.stringify(avant), await bouton('1'));
    /* 3. confirmation */
    await cliquerType('1');
    await cliquerType('1');
    await p.waitForTimeout(2000);
    const apres = etatBase(id);
    e = await ecran();
    ok('3. Base : la vente est au comptant (type 1, VNO)', apres.type === '1' && apres.typeVente === 'VNO', JSON.stringify(apres));
    ok('3. Base : ni client, ni ayant droit, ni noms recopiés, ni bon', apres.client === '-' && apres.ayant === '-' && !apres.noms && apres.bon === '-', JSON.stringify(apres));
    ok('3. Base : plus aucun lien tiers-payant, prix saisi ni « premier » sur ses lignes', apres.liens === 0 && apres.saisies === 0 && apres.premiers === 0, JSON.stringify(apres));
    ok('3. Bilan : les lignes (produits, quantités, prix) sont exactement celles d\'avant', JSON.stringify(apres.lignes) === JSON.stringify(avant.lignes), JSON.stringify(apres.lignes));
    ok('3. Écran : comptant, sans client, sans zone assuré ni « Client absent », aucun message', e.type === '1' && !e.client && !e.assure && !e.absent
      && e.tp === 0 && e.messages.length === 0 && await bouton('1') === 'Au comptant', JSON.stringify(e));
    ok('3. Rapprochement écran = base des lignes', JSON.stringify(e.lignes) === JSON.stringify(apres.lignes), JSON.stringify({ ecran: e.lignes, base: apres.lignes }));
    /* 4. la vente continue */
    await ajouter(produits[2].cip, 3);
    const suite = etatBase(id);
    ok('4. La vente continue au comptant : produit C x3 ajouté, toujours sans client', suite.lignes.length === 3 && suite.typeVente === 'VNO' && suite.client === '-'
      && suite.lignes.some((l) => l.startsWith(produits[2].id + ':3:')), JSON.stringify(suite.lignes));
    /* 5. carnet */
    await cliquerType('3');
    e = await ecran();
    ok('5. Comptant -> Carnet : immédiat', e.type === '3' && etatBase(id).typeVente === 'VO', JSON.stringify(e));
    /* carnet encore sans client : rien a retirer, la bascule est immediate (meme regle que le point 0) */
    await cliquerType('1');
    await p.waitForTimeout(1500);
    const carnet = etatBase(id);
    ok('5. Carnet sans client -> Comptant : immédiat, aucune question ni message', await bouton('1') === 'Au comptant'
      && (await ecran()).messages.length === 0, await bouton('1'));
    ok('5. Vente au comptant, lignes intactes', carnet.type === '1' && carnet.typeVente === 'VNO' && JSON.stringify(carnet.lignes) === JSON.stringify(suite.lignes), JSON.stringify(carnet));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    if (b) { await b.close(); }
    nettoyer();
    ok('Données d\'essai retirées', q(`SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID LIKE '${P}%'`) === '0' && ventesDuTest() === "'-'");
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
