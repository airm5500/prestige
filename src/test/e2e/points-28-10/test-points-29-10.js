/* POINTS DU 29/10. Compte e2e, par les vrais ecrans : menus, boutons, icones et listes cliques a la souris, champs
 * saisis au clavier ; la base et l'API ne servent qu'a preparer le jeu d'essai et a controler le resultat. Jeu d'essai : une vente au comptant d'un produit, cloturee puis
 * modifiee (sa copie cloturee) ; tout est retire a la fin, stock remis.
 *  1. Retours fournisseurs : tableau de bord avec « Retours par utilisateur » (nombre, part), filtre utilisateur,
 *     « Imprimer » et « Export Excel » ; la liste a son filtre utilisateur ; l'API filtre bien par utilisateur ;
 *  3. ecran de vente : « nombre(s) de ligne(s) » en gras ;
 *  4. produits perimes : filtres grossiste, famille et emplacement regroupes (filtre multiple de la fiche article) ;
 *  5. vente a credit deja facturee : « Modifier » n'ouvre pas l'ecran de vente, message « a été facturée le ... » ;
 *  6. ventes terminees : « Modifier » puis « Retour » ramene a « Ventes terminées » avec le meme critere ;
 *     une vente issue d'une vente modifiee se modifie (la copie est chargee a l'ecran) ;
 *     la colonne d'actions contient toutes ses icones (aucune coupee) en 1366 x 768 ;
 *  aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu, cliquer, choisir, saisir, texteMessage, repondre } = require('../outils/vues');
const fs = require('fs');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).replace(/[[0-9;]*m/g, '').slice(0, 1500) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const CAISSE = 'e2e-p2910-caisse';
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
let produit = null, stockOrigine = null, caisseCreee = false;

const ventesDuTest = () => q("SELECT IFNULL(GROUP_CONCAT(CONCAT('''', lg_PREENREGISTREMENT_ID, '''')), '''-''') FROM t_preenregistrement"
  + " WHERE dt_CREATED >= '" + DEBUT + "' AND lg_USER_ID = '" + ADMIN + "'");
function nettoyer() {
  const v = ventesDuTest();
  exec("CREATE TEMPORARY TABLE e2e_p29_l AS SELECT lg_PREENREGISTREMENT_DETAIL_ID id FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "CREATE TEMPORARY TABLE e2e_p29_r AS SELECT lg_REGLEMENT_ID id FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + v + ") AND lg_REGLEMENT_ID IS NOT NULL;"
    + "DELETE FROM vente_modifiee_ligne WHERE modification_id IN (SELECT id FROM vente_modifiee WHERE vente_id IN (" + v + ") OR vente_origine_id IN (" + v + "));"
    + "DELETE FROM vente_modifiee WHERE vente_id IN (" + v + ") OR vente_origine_id IN (" + v + ");"
    + "DELETE FROM vente_reglement WHERE vente_id IN (" + v + ");"
    + "DELETE FROM annulation_recette WHERE preenregistrement_id IN (" + v + ");"
    + "DELETE FROM hmvtproduit WHERE pkey IN (SELECT id FROM e2e_p29_l);"
    + "DELETE FROM mvttransaction WHERE pkey IN (" + v + ") OR vente_id IN (" + v + ");"
    + "DELETE FROM t_recettes WHERE str_REF_FACTURE IN (" + v + ");"
    + "DELETE FROM t_preenregistrement_compte_client WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "UPDATE t_preenregistrement SET lg_PREENGISTREMENT_ANNULE_ID = NULL, lg_PARENT_ID = NULL, lg_REGLEMENT_ID = NULL WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DELETE FROM t_reglement WHERE lg_REGLEMENT_ID IN (SELECT id FROM e2e_p29_r);"
    + "DROP TEMPORARY TABLE IF EXISTS e2e_p29_l; DROP TEMPORARY TABLE IF EXISTS e2e_p29_r;");
  if (produit && stockOrigine !== null) {
    exec("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = " + stockOrigine[0] + ", int_NUMBER = " + stockOrigine[1] + " WHERE lg_FAMILLE_ID = '" + produit.id + "' AND lg_EMPLACEMENT_ID = '1'");
  }
}

(async () => {
  const a = q("SELECT CONCAT(f.lg_FAMILLE_ID, ':', f.int_PRICE) FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
    + " WHERE f.str_STATUT = 'enable' AND f.int_PRICE BETWEEN 500 AND 20000 AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 AND COALESCE(f.lg_FAMILLE_PARENT_ID, '') = ''"
    + " AND f.bool_ACCOUNT = 1 AND s.int_NUMBER_AVAILABLE >= 0 ORDER BY f.str_NAME LIMIT 1").split(':');
  produit = { id: a[0], pu: parseInt(a[1], 10) };
  stockOrigine = q("SELECT CONCAT(int_NUMBER_AVAILABLE, '|', int_NUMBER) FROM t_famille_stock WHERE lg_FAMILLE_ID = '" + produit.id + "' AND lg_EMPLACEMENT_ID = '1'").split('|');
  exec("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = 100, int_NUMBER = 100 WHERE lg_FAMILLE_ID = '" + produit.id + "' AND lg_EMPLACEMENT_ID = '1'");
  if (q("SELECT COUNT(*) FROM t_resume_caisse WHERE lg_USER_ID = '" + ADMIN + "' AND str_STATUT = 'is_Using'") === '0') {
    exec("INSERT INTO t_resume_caisse (ld_CAISSE_ID, lg_USER_ID, int_SOLDE_MATIN, int_SOLDE_SOIR, dt_DAY, dt_CREATED, lg_CREATED_BY, dt_UPDATED, lg_UPDATED_BY, str_STATUT)"
      + " VALUES ('" + CAISSE + "', '" + ADMIN + "', 0, 0, CURDATE(), NOW(), '" + ADMIN + "', NOW(), '" + ADMIN + "', 'is_Using')");
    caisseCreee = true;
  }
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  p.on('dialog', (d) => d.dismiss().catch(() => {}));
  const api = (methode, url, corps) => p.evaluate(async ([m, u, c]) => {
    const r = await fetch(u, { method: m, headers: { 'Content-Type': 'application/json' }, body: c ? JSON.stringify(c) : undefined });
    const t = await r.text(); try { return JSON.parse(t); } catch (e) { return { success: false, brut: t.slice(0, 200), statut: r.status }; }
  }, [methode, url, corps]);
  const cloturer = async (id) => {
    const net = await api('POST', '../api/v1/vente/net/vno', { venteId: id, remiseId: '', checkUg: false });
    const data = net.data || {}, m = data.montantNet || produit.pu;
    return api('POST', '../api/v1/vente/cloturer/vno', { venteId: id, typeVenteId: '1', natureVenteId: '1', devis: false, remiseId: '', userVendeurId: ADMIN,
      montantRecu: m, montantRemis: 0, montantPaye: m, totalRecap: m, partTP: 0, typeRegleId: '1', clientId: '', nom: '', commentaire: '', banque: '', lieux: '',
      marge: data.marge || 0, data, reglements: [{ typeReglement: '1', montant: m, montantAttentu: m }] });
  };
  /* « Ventes terminées » ouvert par le menu, reference saisie dans « Recherche », clic sur « rechercher » */
  const listeAvec = async (ref, id, debut) => {
    if (!(await p.evaluate(() => Ext.ComponentQuery.query('ventemanager').some((x) => x.isVisible(true))))) {
      await ouvrirMenu(p, 'SERVICE CLIENT', 'Vente terminées');
      await p.waitForFunction(() => Ext.ComponentQuery.query('ventemanager').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    }
    if (debut) { await saisir(p, 'ventemanager #dtStart', debut); }
    await saisir(p, 'ventemanager #query', ref);
    await cliquer(p, 'ventemanager #rechercher');
    return p.waitForFunction((x) => { const g = Ext.ComponentQuery.query('ventemanager gridpanel')[0]; return !g.getStore().isLoading() && g.getStore().findExact('lgPREENREGISTREMENTID', x) >= 0; }, id, { timeout: 90000 }).then(() => true, () => false);
  };
  /* vrai clic sur l'icone « Modifier » (crayon) de la ligne de la vente */
  const modifier = async (id) => {
    const cible = await p.evaluate((x) => {
      const g = Ext.ComponentQuery.query('ventemanager gridpanel')[0], i = g.getStore().findExact('lgPREENREGISTREMENTID', x), n = g.getView().getNode(i);
      const img = n && [...n.querySelectorAll('img.x-action-col-icon')].find((e) => e.getAttribute('data-qtip') === 'Modifier' && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden');
      if (!img) { const r = g.getStore().getAt(i); return r ? 'ABSENTE:' + JSON.stringify({ i, intPRICE: r.get('intPRICE'), cancel: r.get('cancel'), modification: r.get('modification'), copy: r.get('copy'), statut: r.get('strSTATUT') }) : 'ABSENTE:ligne ' + i; }
      img.id = img.id || 'e2e-modifier-' + i; img.scrollIntoView({ block: 'center', inline: 'center' }); return img.id;
    }, id);
    if (!cible || cible.startsWith('ABSENTE:')) { throw new Error('Icône « Modifier » absente ou masquée pour la vente ' + id + ' ' + cible); }
    await p.click('#' + cible);
  };
  const copieChargee = () => p.waitForFunction(() => { const c = testextjs.app.getController('VenteCtr'); return c.current && c.current.lgPREENREGISTREMENTID
    && Ext.ComponentQuery.query('doventemanager #btnCloture').some((x) => x.isVisible(true)) && c.getVnoproduitCombo && c.getVnoproduitCombo(); }, null, { timeout: 30000 }).then(() => true, () => false);
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await p.waitForTimeout(1000);

    /* jeu d'essai : vente, cloture, modification (quantite 2), cloture de la copie */
    const add = await api('POST', '../api/v1/vente/add/vno', { typeVenteId: '1', natureVenteId: '1', produitId: produit.id, itemPu: produit.pu, qte: 1, qteServie: 1,
      devis: false, prevente: false, remiseId: '', userVendeurId: ADMIN });
    const v0 = add.data.lgPREENREGISTREMENTID;
    await cloturer(v0);
    const m1 = await api('PUT', '../api/v1/vente/modifier-vente-terme/' + v0);
    const c1 = m1.data.lgPREENREGISTREMENTID;
    const ligne = q("SELECT lg_PREENREGISTREMENT_DETAIL_ID FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + c1 + "' LIMIT 1");
    await api('POST', '../api/v1/vente/update/item/vno', { itemId: ligne, qte: 2, qteServie: 2, itemPu: produit.pu, produitId: produit.id });
    const cc1 = await cloturer(c1);
    const refC1 = q("SELECT str_REF FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + c1 + "'");
    ok('Précondition : vente issue d\'une vente modifiée, clôturée', cc1.success === true && q("SELECT CONCAT(str_STATUT, copy) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + c1 + "'") === 'is_Closed1', JSON.stringify(cc1).slice(0, 150) + ' ' + refC1);

    /* 6 : modifier la vente issue d'une vente modifiee */
    await listeAvec(refC1, c1);
    await modifier(c1);
    const charge = await copieChargee();
    if (charge) { await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('doventemanager #contenu gridpanel')[0]; return g && g.getStore().getCount() > 0; }, null, { timeout: 10000 }).catch(() => null); }
    const lignesCopie = charge ? await p.evaluate(() => { const c = testextjs.app.getController('VenteCtr'); const g = Ext.ComponentQuery.query('doventemanager #contenu gridpanel')[0]; return { id: c.current.lgPREENREGISTREMENTID, lignes: g ? g.getStore().getCount() : -1 }; }) : null;
    ok('6. Vente issue d\'une vente modifiée : « Modifier » charge sa copie avec ses lignes', charge && lignesCopie && lignesCopie.id !== c1 && lignesCopie.lignes > 0, JSON.stringify(lignesCopie));

    /* 3 : nombre de lignes en gras */
    const gras = await p.evaluate(() => { const b = document.querySelector('.vp-nombre-lignes'); return b ? { texte: b.innerText, poids: getComputedStyle(b).fontWeight } : null; });
    ok('3. « nombre(s) de ligne(s) » en gras', gras && /ligne/.test(gras.texte) && Number(gras.poids) >= 600, JSON.stringify(gras));

    /* 6 : « Retour » ramene a « Ventes terminées » avec le meme critere */
    /* bandeau d'alerte WhatsApp (service absent sur le poste d'essai) : l'utilisateur le masque s'il couvre l'ecran */
    const masquer = p.locator('#pwa-banniere').getByText('Masquer', { exact: true });
    if (await masquer.count() && await masquer.first().isVisible()) { await masquer.first().click(); await p.waitForTimeout(300); }
    await cliquer(p, 'doventemanager #btnGoBack');
    const retour = await p.waitForFunction(() => Ext.ComponentQuery.query('ventemanager').some((x) => x.isVisible(true)), null, { timeout: 30000 }).then(() => true, () => false);
    await p.waitForTimeout(2000);
    const critere = retour ? await p.evaluate(() => Ext.ComponentQuery.query('ventemanager #query')[0].getValue()) : null;
    ok('6. « Retour » d\'une modification : « Ventes terminées » avec le même critère (pas les ventes en attente)', retour && critere === refC1
      && !(await p.evaluate(() => Ext.ComponentQuery.query('cloturerventemanager').some((x) => x.isVisible(true)))), critere);
    ok('6. La copie abandonnée est retirée', q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PARENT_ID = '" + c1 + "' AND str_STATUT = 'is_Process'") === '0');

    /* 6 : colonne d'actions de « Ventes terminées » en 1366 x 768 */
    const actions = await p.evaluate(() => {
      const g = Ext.ComponentQuery.query('ventemanager gridpanel')[0], col = g.down('#actionsVente'), n = g.getView().getNode(0);
      const cell = n && n.querySelector('.x-grid-cell-' + col.getItemId()), inner = cell && cell.querySelector('.x-grid-cell-inner');
      if (!inner) { return null; }
      const boite = inner.getBoundingClientRect(), icones = [...inner.querySelectorAll('.x-action-col-icon')];
      const visibles = icones.filter((i) => getComputedStyle(i).visibility !== 'hidden' && getComputedStyle(i).display !== 'none');
      return { emplacements: icones.length, visibles: visibles.length, coupees: visibles.filter((i) => i.getBoundingClientRect().right > boite.right + 1 || i.getBoundingClientRect().left < boite.left - 1).length,
        largeur: col.getWidth(), defile: g.getView().getEl().dom.scrollWidth > g.getView().getEl().dom.clientWidth + 1 };
    });
    ok('6. Colonne d\'actions : aucune icône coupée, pas de défilement horizontal (1366 x 768)', actions && actions.coupees === 0 && !actions.defile, JSON.stringify(actions));

    /* 5 : vente a credit deja facturee */
    const facturee = q("SELECT p.lg_PREENREGISTREMENT_ID FROM t_preenregistrement p JOIN t_preenregistrement_compte_client_tiers_payent t ON t.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID"
      + " WHERE t.str_STATUT_FACTURE <> 'unpaid' AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 AND p.caution_id IS NULL ORDER BY p.dt_UPDATED DESC LIMIT 1");
    if (facturee) {
      const refF = q("SELECT str_REF FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + facturee + "'");
      const avantCopies = q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PARENT_ID = '" + facturee + "'");
      const d5 = new Date(); d5.setFullYear(d5.getFullYear() - 5);
      const trouvee = await listeAvec(refF, facturee, String(d5.getDate()).padStart(2, '0') + '/' + String(d5.getMonth() + 1).padStart(2, '0') + '/' + d5.getFullYear());
      if (trouvee) {
        await modifier(facturee);
        await p.waitForTimeout(2500);
        const m5 = await texteMessage(p);
        ok('5. Vente facturée : « Modifier » affiche « La vente ... a été facturée le ... (facture n° ...) »', new RegExp('La vente ' + refF + ' a été facturée le \\d\\d/\\d\\d/\\d{4} \\(facture n° ').test(m5 || ''), m5);
        ok('5. « Modifier » : l\'écran de vente ne s\'ouvre pas', !(await p.evaluate(() => Ext.ComponentQuery.query('doventemanager').some((x) => x.isVisible(true)))));
        if (m5) { await repondre(p, 'ok'); }
      } else {
        ok('5. Vente facturée retrouvée dans « Ventes terminées »', false, refF);
      }
      ok('5. Aucune copie créée pour la vente facturée', q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PARENT_ID = '" + facturee + "'") === avantCopies);
    } else {
      ok('5. Précondition : une vente à crédit facturée dans la base', false, 'aucune');
    }

    /* 4 : perimes, filtres regroupes */
    await ouvrirMenu(p, 'GESTION DU STOCK', 'Recherche périmés');
    await p.waitForFunction(() => Ext.ComponentQuery.query('peremptionquery').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    const f4 = await p.evaluate(() => { const v = Ext.ComponentQuery.query('peremptionquery')[0];
      return { multi: v.query('filtresmulti').length, combosVisibles: ['#rayons', '#grossiste', '#codeFamile'].filter((s) => { const c = v.down(s); return c && c.isVisible(true); }).length }; });
    ok('4. Produits périmés : un seul filtre regroupé (grossiste, famille, emplacement), anciennes listes masquées', f4.multi === 1 && f4.combosVisibles === 0, JSON.stringify(f4));

    /* 1 : retours fournisseurs, par l'ecran : onglet « Tableau de bord », periode, « Actualiser » */
    await ouvrirMenu(p, 'GESTION DES COMMANDES', 'Retour fournisseur');
    await p.waitForFunction(() => Ext.ComponentQuery.query('retoursfournisseur').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    const ecran1 = { liste: await p.evaluate(() => { const c = Ext.getCmp('retourFrsUtilisateur'); return !!c && c.isVisible(true); }) };
    await p.locator('.x-btn').filter({ visible: true }).filter({ hasText: 'Tableau de bord' }).first().click();
    await p.waitForFunction(() => { const t = Ext.ComponentQuery.query('retoursfournisseur #tableauRetours')[0]; return t && t.isVisible(true); }, null, { timeout: 30000 });
    const tableauPret = () => p.waitForFunction(() => { const t = Ext.ComponentQuery.query('retoursfournisseur #tableauRetours')[0];
      return !(t.loadMask && t.loadMask.isVisible()) && /Retours par utilisateur/.test(t.down('#tbContenu').getEl().dom.innerText); }, null, { timeout: 240000 });
    const lignesUtilisateurs = () => p.evaluate(() => [...Ext.ComponentQuery.query('retoursfournisseur #tbContenu')[0].getEl().dom.querySelectorAll('table.rf-utilisateurs tr.rf-utilisateur')]
      .map((tr) => [...tr.cells].slice(0, 3).map((td) => td.innerText.trim())));
    await saisir(p, 'retoursfournisseur #tbDebut', '01/01/2020');
    await cliquer(p, 'retoursfournisseur #tbActualiser');
    await p.waitForTimeout(500);
    await tableauPret();
    const tous1 = await lignesUtilisateurs();
    ok('1. Tableau de bord : « Retours par utilisateur » (nombre, part en %)', tous1.length > 0 && /^\d+$/.test(tous1[0][1]) && /%$/.test(tous1[0][2]), JSON.stringify(tous1.slice(0, 2)));
    ecran1.imprimer = await p.evaluate(() => Ext.ComponentQuery.query('retoursfournisseur #tbImprimer').some((x) => x.isVisible(true)));
    ecran1.excel = await p.evaluate(() => Ext.ComponentQuery.query('retoursfournisseur #tbExcel').some((x) => x.isVisible(true)));
    ok('1. Écran : filtre utilisateur sur la liste, « Imprimer » et « Export Excel » sur le tableau', ecran1.liste && ecran1.imprimer && ecran1.excel, JSON.stringify(ecran1));
    if (tous1.length) {
      const nom = tous1[0][0], nb = tous1[0][1];
      const choisi = await choisir(p, 'retoursfournisseur #tbUtilisateur', nom);
      await p.waitForTimeout(500);
      await tableauPret();
      const un = await lignesUtilisateurs();
      ok('1. Filtre utilisateur du tableau : lui seul, mêmes retours, 100 %', choisi === nom && un.length === 1 && un[0][0] === nom && un[0][1] === nb && /^100\b/.test(un[0][2]), JSON.stringify({ choisi, un }));
      /* « Imprimer » : page d'impression avec le filtre et le seul utilisateur */
      const [impression] = await Promise.all([p.context().waitForEvent('page', { timeout: 30000 }).catch(() => null), cliquer(p, 'retoursfournisseur #tbImprimer')]);
      const imp = impression ? await impression.waitForLoadState().then(() => impression.evaluate(() => ({ titre: document.title, filtre: /Utilisateur :/.test(document.body.innerText),
        lignes: document.querySelectorAll('table.rf-utilisateurs tr.rf-utilisateur').length }))).catch((e) => ({ erreur: String(e) })) : null;
      ok('1. « Imprimer » : page du tableau, filtre utilisateur rappelé', imp && /retours fournisseurs/i.test(imp.titre) && imp.filtre && imp.lignes === 1, JSON.stringify(imp));
      if (impression) { await impression.close().catch(() => {}); }
      /* « Export Excel » : classeur telecharge */
      const telechargement = new Promise((res) => {
        const minuterie = setTimeout(() => res(null), 120000);
        const fini = (d) => { clearTimeout(minuterie); res(d); };
        p.once('download', fini);
        p.context().once('page', (pg) => pg.waitForEvent('download', { timeout: 120000 }).then(fini, () => {}));
      });
      await cliquer(p, 'retoursfournisseur #tbExcel');
      const dl = await telechargement;
      let x1 = null;
      if (dl) { const chemin = await dl.path(); const bt = fs.readFileSync(chemin); x1 = { nom: dl.suggestedFilename(), pk: bt[0] === 0x50 && bt[1] === 0x4b, n: bt.length }; }
      ok('1. « Export Excel » : classeur .xlsx téléchargé', x1 && x1.pk && /\.xlsx$/.test(x1.nom) && x1.n > 2000, JSON.stringify(x1));
      /* liste des retours : meme utilisateur choisi dans sa liste, periode elargie */
      await p.locator('.x-btn').filter({ visible: true }).filter({ hasText: 'Liste des retours' }).first().click();
      await p.waitForFunction(() => { const c = Ext.getCmp('retourFrsUtilisateur'); return c && c.isVisible(true); }, null, { timeout: 30000 });
      await saisir(p, '#datedebut', '01/01/2020');
      await choisir(p, 'retourfrsmanager #filtreUtilisateur', nom);
      await p.waitForTimeout(500);
      await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('retourfrsmanager')[0]; return g && !g.getStore().isLoading(); }, null, { timeout: 120000 });
      const l1 = await p.evaluate(() => { const st = Ext.ComponentQuery.query('retourfrsmanager')[0].getStore();
        return { total: st.getTotalCount(), utilisateurs: [...new Set(st.getRange().map((r) => r.get('lg_USER_ID')))] }; });
      ok('1. Filtre utilisateur de la liste : seuls ses retours', l1.total > 0 && l1.utilisateurs.length === 1 && l1.utilisateurs[0] === nom, JSON.stringify(l1));
    }
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    nettoyer();
    if (caisseCreee) { exec("DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID = '" + CAISSE + "'"); }
    ok('Jeu d\'essai retiré, stock remis', q("SELECT COUNT(*) FROM t_preenregistrement WHERE dt_CREATED >= '" + DEBUT + "' AND lg_USER_ID = '" + ADMIN + "'") === '0'
      && q("SELECT CONCAT(int_NUMBER_AVAILABLE, '|', int_NUMBER) FROM t_famille_stock WHERE lg_FAMILLE_ID = '" + produit.id + "' AND lg_EMPLACEMENT_ID = '1'") === stockOrigine.join('|'));
  }
  const k = res.filter((x) => x.c).length;
  console.log('\n' + k + '/' + res.length + (k === res.length ? ' OK' : ' ECHEC'));
  process.exit(k === res.length ? 0 : 1);
})();
