/* PLAN DU 08/11, POINT 18 : MOTIF OBLIGATOIRE DE L'ANNULATION D'UNE VENTE, ANALYSE PAR MOTIF.
 * Jeu d'essai (retire a la fin, stock remis) : trois ventes au comptant d'un produit, quantites 1, 2 et 3 (montants
 * differents), vendeur = compte de test. Par les ecrans :
 *  - « Ventes terminées », icone « Annuler » de la vente A : un menu de motifs s'ouvre sur l'icone, aucune fenetre ;
 *    premier clic sur « Erreur de saisie » : le motif devient « Confirmer l'annulation (Erreur de saisie) ? », rien
 *    n'est annule ; second clic : A est annulee ;
 *  - vente B : « Autre » sans texte est refuse (« Précisez le motif »), rien n'est annule ; avec un texte, B est annulee ;
 *  - vente C : menu ouvert puis Echap : rien n'est annule, aucun motif ;
 *  - base : un motif par annulation (type, motif, texte, montant d'origine, vendeur d'origine, annulateur), aucun pour C ;
 *    stock : A et B rendent leurs quantites, C non ;
 *  - « Liste des ventes annulées » > onglet « Analyse par motif » : tableaux par motif et par auteur = recapitulatif de
 *    l'API = base, ligne par ligne ; A et B dans le detail avec leurs valeurs ;
 *  - « Activité des équipes » > « Analyses » : rubrique « Annulations et modifications par motif » = base (mois en cours).
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const { execFileSync } = require('child_process');
const privilegeEssai = require('../support/privilege-essai');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).replace(/\r/g, '').trim();
const CAISSE = 'e2e-p18-caisse';
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
let produit = null, stockOrigine = null, caisseCreee = false;
const droitAnnul = privilegeEssai(q, exec, ENV_E2E.LOGIN, 'P_BT_ANNULER_VENTE');

const ventesDuTest = () => q("SELECT IFNULL(GROUP_CONCAT(CONCAT('''', lg_PREENREGISTREMENT_ID, '''')), '''-''') FROM t_preenregistrement"
  + " WHERE dt_CREATED >= '" + DEBUT + "' AND lg_USER_ID = '" + ADMIN + "'");
function nettoyer() {
  const v = ventesDuTest();
  exec("CREATE TEMPORARY TABLE e2e_p18_l AS SELECT lg_PREENREGISTREMENT_DETAIL_ID id FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "CREATE TEMPORARY TABLE e2e_p18_r AS SELECT lg_REGLEMENT_ID id FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + v + ") AND lg_REGLEMENT_ID IS NOT NULL;"
    + "DELETE FROM vente_motif WHERE vente_id IN (" + v + ");"
    + "DELETE FROM vente_reglement WHERE vente_id IN (" + v + ");"
    + "DELETE FROM annulation_recette WHERE preenregistrement_id IN (" + v + ");"
    + "DELETE FROM hmvtproduit WHERE pkey IN (SELECT id FROM e2e_p18_l);"
    + "DELETE FROM mvttransaction WHERE pkey IN (" + v + ") OR vente_id IN (" + v + ");"
    + "DELETE FROM t_recettes WHERE str_REF_FACTURE IN (" + v + ");"
    + "DELETE FROM t_preenregistrement_compte_client WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "UPDATE t_preenregistrement SET lg_PREENGISTREMENT_ANNULE_ID = NULL, lg_PARENT_ID = NULL, lg_REGLEMENT_ID = NULL WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DELETE FROM t_reglement WHERE lg_REGLEMENT_ID IN (SELECT id FROM e2e_p18_r);"
    + "DROP TEMPORARY TABLE IF EXISTS e2e_p18_l; DROP TEMPORARY TABLE IF EXISTS e2e_p18_r;");
  if (produit && stockOrigine !== null) {
    exec("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = " + stockOrigine[0] + ", int_NUMBER = " + stockOrigine[1] + " WHERE lg_FAMILLE_ID = '" + produit.id + "' AND lg_EMPLACEMENT_ID = '1'");
  }
}

(async () => {
  const a = q("SELECT CONCAT(f.lg_FAMILLE_ID, ':', f.int_PRICE) FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
    + " WHERE f.str_STATUT = 'enable' AND f.int_PRICE BETWEEN 500 AND 20000 AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 AND COALESCE(f.lg_FAMILLE_PARENT_ID, '') = ''"
    + " AND f.bool_ACCOUNT = 1 AND s.int_NUMBER_AVAILABLE >= 0 ORDER BY f.str_NAME LIMIT 1 OFFSET 3").split(':');
  produit = { id: a[0], pu: parseInt(a[1], 10) };
  stockOrigine = q("SELECT CONCAT(int_NUMBER_AVAILABLE, '|', int_NUMBER) FROM t_famille_stock WHERE lg_FAMILLE_ID = '" + produit.id + "' AND lg_EMPLACEMENT_ID = '1'").split('|');
  exec("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = 100, int_NUMBER = 100 WHERE lg_FAMILLE_ID = '" + produit.id + "' AND lg_EMPLACEMENT_ID = '1'");
  if (q("SELECT COUNT(*) FROM t_resume_caisse WHERE lg_USER_ID = '" + ADMIN + "' AND str_STATUT = 'is_Using'") === '0') {
    exec("INSERT INTO t_resume_caisse (ld_CAISSE_ID, lg_USER_ID, int_SOLDE_MATIN, int_SOLDE_SOIR, dt_DAY, dt_CREATED, lg_CREATED_BY, dt_UPDATED, lg_UPDATED_BY, str_STATUT)"
      + " VALUES ('" + CAISSE + "', '" + ADMIN + "', 0, 0, CURDATE(), NOW(), '" + ADMIN + "', NOW(), '" + ADMIN + "', 'is_Using')");
    caisseCreee = true;
  }
  droitAnnul.accorder();
  const stock = () => Number(q("SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_FAMILLE_ID = '" + produit.id + "' AND lg_EMPLACEMENT_ID = '1'"));
  const annulee = (id) => q("SELECT b_IS_CANCEL FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + id + "'") === '1';
  const motifs = (id) => q("SELECT IFNULL(GROUP_CONCAT(CONCAT_WS('|', type_operation, statut, motif_libelle, IFNULL(commentaire, ''), montant, IFNULL(vendeur_id, ''), operateur_id) SEPARATOR ';'), '')"
    + " FROM vente_motif WHERE vente_id = '" + id + "'");
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const dialogues = []; p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  const api = (methode, url, corps) => p.evaluate(async ([m, u, c]) => {
    const r = await fetch(u, { method: m, headers: { 'Content-Type': 'application/json' }, body: c ? JSON.stringify(c) : undefined });
    const t = await r.text(); try { return JSON.parse(t); } catch (e) { return { success: false, brut: t.slice(0, 200) }; }
  }, [methode, url, corps]);
  const appels = []; p.on('request', (r) => { if (/vente-motifs\/annulation|vente\/annulation/.test(r.url())) { appels.push(r.url()); } });
  const vendre = async (qte) => {
    const add = await api('POST', '../api/v1/vente/add/vno', { typeVenteId: '1', natureVenteId: '1', produitId: produit.id, itemPu: produit.pu, qte, qteServie: qte,
      devis: false, prevente: false, remiseId: '', userVendeurId: ADMIN });
    const vente = add.data && add.data.lgPREENREGISTREMENTID;
    const net = await api('POST', '../api/v1/vente/net/vno', { venteId: vente, remiseId: '', checkUg: false });
    const data = net.data || {}, montant = data.montantNet || produit.pu * qte;
    await api('POST', '../api/v1/vente/cloturer/vno', { venteId: vente, typeVenteId: '1', natureVenteId: '1', devis: false, remiseId: '', userVendeurId: ADMIN,
      montantRecu: montant, montantRemis: 0, montantPaye: montant, totalRecap: montant, partTP: 0, typeRegleId: '1', clientId: '', nom: '', commentaire: '', banque: '', lieux: '',
      marge: data.marge || 0, data, reglements: [{ typeReglement: '1', montant, montantAttentu: montant }] });
    const l = q("SELECT CONCAT(str_REF, '|', int_PRICE, '|', str_STATUT) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + vente + "'").split('|');
    return { id: vente, ref: l[0], prix: Number(l[1]), statut: l[2], qte };
  };
  /* « Ventes terminées » : recherche de la reference, clic sur l'icone « Annuler » de la ligne */
  const ouvrirMenuAnnulation = async (v) => {
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('ventemanager', 'Ventes terminées', ''));
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('ventemanager gridpanel')[0]; return g && g.isVisible(true) && !g.getStore().isLoading(); }, null, { timeout: 60000 });
    await p.waitForTimeout(1200);
    await p.evaluate((r) => { const c = Ext.ComponentQuery.query('ventemanager #query')[0]; c.setValue(r); testextjs.app.getController('VenteFinisCtr').doSearch(); }, v.ref);
    await p.waitForFunction((id) => { const g = Ext.ComponentQuery.query('ventemanager gridpanel')[0], s = g.getStore();
      if (s.isLoading()) { return false; }
      const i = s.findExact('lgPREENREGISTREMENTID', id), n = i >= 0 ? g.getView().getNode(i) : null;
      const img = n && Array.from(n.querySelectorAll('[data-qtip="Annuler.Vente"]')).find((x) => !/x-hide-display/.test(x.className));
      if (!img) { return false; }
      img.id = 'e2e-annuler-' + id; return true; }, v.id, { timeout: 60000 });
    await p.click('#e2e-annuler-' + v.id);
    await p.waitForSelector('.prestige-motif-vente .x-menu-item', { state: 'visible', timeout: 15000 });
  };
  const fenetre = () => p.evaluate(() => Ext.Msg.isVisible() || Ext.ComponentQuery.query('window').some((w) => w.isVisible() && !w.isXType('menu')));
  const item = (texte) => p.locator('.prestige-motif-vente .x-menu-item').filter({ hasText: texte }).first();
  const fermerTicket = async () => {
    /* l'annulation reussie propose toujours l'impression du ticket (fenetre existante, non modifiee) : « Non » */
    await p.waitForFunction(() => Ext.Msg.isVisible(), null, { timeout: 30000 }).catch(() => {});
    await p.evaluate(() => { if (Ext.Msg.isVisible()) { const n = Ext.Msg.down('button[itemId=no]'); (n && n.isVisible() ? n : Ext.Msg.down('button[itemId=ok]')).btnEl.dom.click(); } });
  };
  try {
    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const A = await vendre(1), B = await vendre(2), C = await vendre(3);
    ok('Préparation : trois ventes au comptant clôturées, montants différents', [A, B, C].every((v) => v.statut === 'is_Closed' && v.prix > 0)
      && new Set([A.prix, B.prix, C.prix]).size === 3 && stock() === 94, JSON.stringify([A, B, C]) + ' stock ' + stock());

    /* ----- A : Erreur de saisie, confirmation dans le motif ----- */
    await ouvrirMenuAnnulation(A);
    const libelles = await p.locator('.prestige-motif-vente .x-menu-item').allInnerTexts();
    ok('Icône « Annuler » : menu de motifs sur l\'icône (Erreur de saisie, Confusion de produit, Erreur client, Autre), aucune fenêtre',
      ['Erreur de saisie', 'Confusion de produit', 'Erreur client', 'Autre'].every((m) => libelles.some((l) => l.trim() === m)) && !(await fenetre()) && appels.length === 0, JSON.stringify(libelles));
    await item('Erreur de saisie').click();
    await p.waitForTimeout(300);
    const arme = await item('Confirmer').innerText().catch(() => '');
    ok('Premier clic : « Confirmer l\'annulation (Erreur de saisie) ? » dans le motif, rien n\'est annulé', /Confirmer l'annulation \(Erreur de saisie\) \?/.test(arme)
      && !annulee(A.id) && appels.length === 0 && !(await fenetre()), arme);
    await p.waitForTimeout(400);
    await item('Confirmer').click();
    await p.waitForFunction(() => !document.querySelector('.prestige-motif-vente') || !document.querySelector('.prestige-motif-vente').offsetParent, null, { timeout: 10000 }).catch(() => {});
    for (let k = 0; k < 40 && !annulee(A.id); k++) { await p.waitForTimeout(500); }
    await fermerTicket();
    ok('Second clic : A annulée, un seul appel (avec motif)', annulee(A.id) && appels.length === 1 && /vente-motifs\/annulation/.test(appels[0]), JSON.stringify(appels));

    /* ----- B : Autre, texte obligatoire ----- */
    await ouvrirMenuAnnulation(B);
    await item('Autre').click();
    await p.waitForTimeout(300);
    const refus = await p.locator('.prestige-motif-vente .x-menu-item').filter({ hasText: 'Précisez' }).count();
    ok('« Autre » sans texte : refusé dans le menu (« Précisez le motif »), rien n\'est annulé', refus === 1 && !annulee(B.id) && appels.length === 1, refus);
    await p.fill('.prestige-motif-vente .prestige-motif-texte input', 'Client parti sans payer');
    await p.locator('.prestige-motif-vente .x-menu-item').filter({ hasText: 'Précisez' }).first().click();
    await p.waitForTimeout(500);
    await item('Confirmer').click();
    for (let k = 0; k < 40 && !annulee(B.id); k++) { await p.waitForTimeout(500); }
    await fermerTicket();
    ok('« Autre » avec texte : B annulée', annulee(B.id) && appels.length === 2, JSON.stringify(appels));

    /* ----- C : menu ouvert puis Echap ----- */
    await ouvrirMenuAnnulation(C);
    await p.keyboard.press('Escape');
    await p.waitForTimeout(800);
    ok('Menu fermé par Échap : C n\'est pas annulée, aucun appel', !annulee(C.id) && appels.length === 2
      && await p.evaluate(() => !document.querySelector('.prestige-motif-vente') || !document.querySelector('.prestige-motif-vente').offsetParent));

    /* ----- base et bilan ----- */
    ok('Base : un motif par annulation (motif, texte, montant d\'origine, vendeur d\'origine, annulateur), aucun pour C',
      motifs(A.id) === ['ANNULATION', 'VALIDEE', 'Erreur de saisie', '', A.prix, ADMIN, ADMIN].join('|')
      && motifs(B.id) === ['ANNULATION', 'VALIDEE', 'Autre', 'Client parti sans payer', B.prix, ADMIN, ADMIN].join('|') && motifs(C.id) === '',
      JSON.stringify([motifs(A.id), motifs(B.id), motifs(C.id)]));
    ok('Bilan stock : A et B rendent 1 + 2, C non (100 − 3)', stock() === 97, stock());
    ok('Bilan : exactement 2 lignes de motif créées par le test', q("SELECT COUNT(*) FROM vente_motif WHERE created_at >= '" + DEBUT + "'") === '2');

    /* ----- onglet « Analyse par motif » = API = base ----- */
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('venteannuler', 'Liste des ventes annulées', ''));
    await p.waitForFunction(() => Ext.ComponentQuery.query('venteannuler #ongletAnalyse').length === 1, null, { timeout: 60000 });
    await p.click('.x-btn:has-text("Analyse par motif")');
    await p.waitForSelector('table.va-par-motif', { timeout: 30000 });
    const ecran = await p.evaluate(() => {
      const lire = (c) => Array.from(document.querySelectorAll('table.' + c + ' tbody tr')).map((tr) => Array.from(tr.children).map((td) => td.textContent.trim()));
      return { motif: lire('va-par-motif'), auteur: lire('va-par-auteur'), detail: lire('va-detail'),
        total: Array.from(document.querySelectorAll('table.va-par-motif tfoot th')).map((x) => x.textContent.trim()) };
    });
    const jour = q('SELECT CURDATE()');
    const rec = await api('GET', '../api/v1/vente-motifs/recap?dtStart=' + jour + '&dtEnd=' + jour);
    const n = (v) => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    const baseMotifs = q("SELECT GROUP_CONCAT(CONCAT_WS('|', motif_libelle, a, m, a + m, t) ORDER BY a + m DESC, motif_libelle SEPARATOR ';') FROM ("
      + " SELECT motif_libelle, SUM(type_operation = 'ANNULATION') a, SUM(type_operation = 'MODIFICATION') m, SUM(montant) t FROM vente_motif"
      + " WHERE statut = 'VALIDEE' AND DATE(created_at) = CURDATE() GROUP BY motif_libelle) x").split(';').filter(Boolean).map((l) => l.split('|'));
    const ecranMotifs = ecran.motif.map((r) => [r[0], r[1], r[2], r[3], r[5].replace(/\s/g, '')]);
    const apiMotifs = (rec.parMotif || []).map((m) => [m.motif, String(m.annulations), String(m.modifications), String(m.nb), String(m.montant)]);
    const tri = (l) => l.map((x) => x.join('|')).sort().join(';');
    ok('Analyse par motif : écran = API = base, ligne par ligne (annulations, modifications, total, montant)',
      tri(ecranMotifs) === tri(apiMotifs) && tri(apiMotifs) === tri(baseMotifs) && baseMotifs.length >= 2, JSON.stringify({ ecranMotifs, apiMotifs, baseMotifs }));
    const parts = ecran.motif.map((r) => Number(r[4].replace(/[^\d.]/g, '')));
    ok('Parts : leur somme fait 100 % (à l\'arrondi près) ; pied = total de l\'API', Math.abs(parts.reduce((x, y) => x + y, 0) - 100) <= 0.5
      && ecran.total[3] === n(rec.total.nb) && ecran.total[5] === n(rec.total.montant), JSON.stringify({ parts, total: ecran.total }));
    const auteurAdmin = ecran.auteur.find((r) => (rec.parAuteur || []).some((x) => x.auteurId === ADMIN && x.auteur === r[0]));
    const baseAdmin = q("SELECT CONCAT_WS('|', SUM(type_operation = 'ANNULATION'), SUM(type_operation = 'MODIFICATION'), COUNT(*)) FROM vente_motif WHERE statut = 'VALIDEE' AND DATE(created_at) = CURDATE() AND vendeur_id = '" + ADMIN + "'");
    ok('Par auteur de la vente : la ligne du compte de test = base (annulations, modifications, total)',
      !!auteurAdmin && [auteurAdmin[1], auteurAdmin[2], auteurAdmin[3]].join('|') === baseAdmin, JSON.stringify({ auteurAdmin, baseAdmin }));
    const ligneDetail = (v) => ecran.detail.find((r) => r[2] === v.ref);
    const dA = ligneDetail(A), dB = ligneDetail(B);
    ok('Détail : A et B avec opération, montant, motif et précision ; C absente', !!dA && !!dB && !ligneDetail(C)
      && dA[1] === 'Annulation' && dA[3].replace(/\s/g, '') === String(A.prix) && dA[4] === 'Erreur de saisie' && dA[5] === ''
      && dB[3].replace(/\s/g, '') === String(B.prix) && dB[4] === 'Autre' && dB[5] === 'Client parti sans payer', JSON.stringify({ dA, dB }));

    /* ----- Activite des equipes > Analyses : rubrique des motifs ----- */
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('activiteequipes', 'Activité des équipes', ''));
    await p.waitForFunction(() => Ext.ComponentQuery.query('activiteequipes #ae-analyses').length === 1, null, { timeout: 60000 });
    await p.click('.x-btn:has-text("Analyses")');
    await p.waitForSelector('#' + await p.evaluate(() => Ext.ComponentQuery.query('activiteequipes #aeMotifs')[0].getEl().id) + ' table.ae-motifs', { timeout: 90000 });
    const ae = await p.evaluate(() => { const c = Ext.ComponentQuery.query('activiteequipes #aeMotifs')[0].getEl().dom;
      return Array.from(c.querySelectorAll('table.ae-motifs')).map((t) => Array.from(t.querySelectorAll('tfoot th')).map((x) => x.textContent.trim())); });
    const baseMois = q("SELECT CONCAT_WS('|', SUM(type_operation = 'ANNULATION'), SUM(type_operation = 'MODIFICATION'), COUNT(*)) FROM vente_motif"
      + " WHERE statut = 'VALIDEE' AND created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01') AND created_at < CURDATE() + INTERVAL 1 DAY");
    ok('Activité des équipes : rubrique « par motif », totaux (auteurs et motifs) = base du mois', ae.length === 2
      && ae.every((t) => t.slice(1).join('|') === baseMois), JSON.stringify({ ae, baseMois }));
    ok('Aucune erreur JavaScript, aucune boîte de dialogue du navigateur', err.length === 0 && dialogues.length === 0, JSON.stringify(err.concat(dialogues)));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    nettoyer();
    if (caisseCreee) { exec("DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID = '" + CAISSE + "'"); }
    droitAnnul.reprendre();
    ok('Jeu d\'essai retiré, stock remis', q("SELECT COUNT(*) FROM t_preenregistrement WHERE dt_CREATED >= '" + DEBUT + "' AND lg_USER_ID = '" + ADMIN + "'") === '0'
      && q("SELECT COUNT(*) FROM vente_motif WHERE created_at >= '" + DEBUT + "'") === '0'
      && q("SELECT CONCAT(int_NUMBER_AVAILABLE, '|', int_NUMBER) FROM t_famille_stock WHERE lg_FAMILLE_ID = '" + produit.id + "' AND lg_EMPLACEMENT_ID = '1'") === stockOrigine.join('|'));
  }
  const k = res.filter((x) => x.c).length;
  console.log('\n' + k + '/' + res.length + ' OK');
  process.exit(k === res.length ? 0 : 1);
})();
