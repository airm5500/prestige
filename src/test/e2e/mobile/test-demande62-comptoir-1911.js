/* DEMANDE 62, POINT 3b : prevente deja payee par mobile money a la borne, terminee au comptoir sans redemander
 * l'argent.
 *
 * Jeu d'essai (copie d'essai, simulateur de paiement actif) : deux preventes comptant d'un client standard, payees par
 * le simulateur SANS cloture automatique (cloturer:false, ou cloture refusee : caisse de la borne fermee) :
 *  A. Wave, quantite 3 ; B. Orange Money, quantite 1, autre article.
 * Parcours a l'ecran (compte de connexion, caisse ouverte) :
 *  1. menu Pre-vente : la liste montre « Payée Wave … » et « Payée Orange Money … », montants = base ;
 *  2. Ventes > nouvelle vente, numero de la prevente A tape dans « Rechercher une prevente », Entree : bandeau
 *     « Déjà payée par Wave : … F · n° … », mode Wave impose (liste verrouillee), montant recu = montant paye ;
 *  3. « Terminer la vente », « Non » au ticket : vente cloturee avec un reglement Wave du montant paye, un mouvement
 *     de caisse, stock - 3, client garde, paiement marque cloture ; une seconde notification ne change rien ;
 *  4. B terminee en especes (requete de l'ecran rejouee avec le mode especes) : refusee, message qui nomme Orange
 *     Money et le montant, rien d'ecrit ; B reste a encaisser dans la liste.
 * Tout ce qui est pose est retire, stock compris.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 320) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).replace(/\r/g, '').trim();

const CLIENT = 'E2E-D62C-CLI', NOM_CLIENT = 'ZZCOMPTOIRMOBILE';
const CAISSE = 'E2E-D62C-RC';
const PRODUITS = q("SELECT f.lg_FAMILLE_ID, f.int_CIP, f.int_PRICE, s.int_NUMBER_AVAILABLE, s.int_NUMBER FROM t_famille f JOIN t_famille_stock s"
  + " ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' WHERE f.str_STATUT = 'enable' AND s.str_STATUT = 'enable'"
  + " AND f.int_CIP REGEXP '^[0-9]{7}$' AND f.int_PRICE BETWEEN 500 AND 4000 AND s.int_NUMBER_AVAILABLE > 20 AND f.bool_DECONDITIONNE = 0"
  + " AND (f.lg_FAMILLEARTICLE_ID IS NULL OR 1 = 1) AND NOT EXISTS (SELECT 1 FROM t_famille e WHERE e.lg_FAMILLE_PARENT_ID = f.lg_FAMILLE_ID)"
  + " GROUP BY f.int_PRICE ORDER BY f.int_CIP LIMIT 2").split('\n').map((l) => l.split('\t'));
const ventes = [];
let caissePosee = false;

function nettoyer() {
  for (const v of ventes) {
    const det = "(SELECT lg_PREENREGISTREMENT_DETAIL_ID FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + v + "')";
    const regl = q("SELECT IFNULL(MAX(lg_REGLEMENT_ID), '') FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v + "'");
    q("DELETE FROM paiement_mobile WHERE vente_id = '" + v + "'; DELETE FROM hmvtproduit WHERE lg_PREENREGISTREMENT_DETAIL_ID IN " + det + " OR pkey = '" + v + "';"
      + " DELETE FROM mvttransaction WHERE vente_id = '" + v + "' OR pkey = '" + v + "'; DELETE FROM vente_reglement WHERE vente_id = '" + v + "';"
      + " DELETE FROM t_recettes WHERE str_REF_FACTURE = '" + v + "'; DELETE FROM t_cash_transaction WHERE lg_REGLEMENT_ID = '" + regl + "';"
      + " DELETE FROM t_preenregistrement_compte_client WHERE lg_PREENREGISTREMENT_ID = '" + v + "';"
      + " DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + v + "'; DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v + "';"
      + " DELETE FROM t_reglement WHERE lg_REGLEMENT_ID = '" + regl + "' OR str_REF_RESSOURCE = '" + v + "'");
  }
  for (const x of PRODUITS) {
    q("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = " + x[3] + ", int_NUMBER = " + x[4] + " WHERE lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID = '" + x[0] + "'");
  }
  q("DELETE FROM t_compte_client WHERE lg_CLIENT_ID = '" + CLIENT + "'; DELETE FROM t_client WHERE lg_CLIENT_ID = '" + CLIENT + "';"
    + (caissePosee ? " DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID = '" + CAISSE + "'" : ''));
}

function poser(user) {
  q("INSERT INTO t_client (lg_CLIENT_ID, str_CODE_INTERNE, str_FIRST_NAME, str_LAST_NAME, str_ADRESSE, lg_TYPE_CLIENT_ID, dt_CREATED, dt_UPDATED, str_STATUT)"
    + " VALUES ('" + CLIENT + "', '" + CLIENT + "', '" + NOM_CLIENT + "', 'E2E', '0707070707', '6', NOW(), NOW(), 'enable');"
    + " INSERT INTO t_compte_client (lg_COMPTE_CLIENT_ID, str_CODE_COMPTE_CLIENT, str_TYPE, P_KEY, dbl_QUOTA_CONSO_MENSUELLE, dbl_CAUTION, dec_Balance,"
    + " dt_CREATED, dt_UPDATED, str_STATUT, lg_CLIENT_ID, dbl_PLAFOND) VALUES ('" + CLIENT + "', '" + CLIENT + "', 'CLIENT', '" + CLIENT + "', 0, 0, 0,"
    + " NOW(), NOW(), 'enable', '" + CLIENT + "', 0)");
  if (q("SELECT COUNT(*) FROM t_resume_caisse WHERE lg_USER_ID = '" + user + "' AND str_STATUT = 'is_Using'") === '0') {
    caissePosee = true;
    q("INSERT INTO t_resume_caisse (ld_CAISSE_ID, lg_USER_ID, int_SOLDE_MATIN, int_SOLDE_SOIR, dt_DAY, dt_CREATED, lg_CREATED_BY, dt_UPDATED, lg_UPDATED_BY, str_STATUT)"
      + " VALUES ('" + CAISSE + "', '" + user + "', 0, 0, CURDATE(), NOW(), '" + user + "', NOW(), '" + user + "', 'is_Using')");
  }
}

async function ouvrirEcran(p, composant) {
  const lib = await p.evaluate((c) => { let r = null; Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode()
    .cascadeBy((n) => { if (!r && n.get('id') === c && n.parentNode) { r = [n.parentNode.get('text'), n.get('text')]; } }); return r; }, composant);
  if (!lib) { throw new Error('Menu absent pour ' + composant); }
  await vues.ouvrirMenu(p, lib[0], lib[1]);
  await p.waitForTimeout(800);
  if (await p.locator('.prestige-nav .x-grid-row').filter({ visible: true }).count() > 0) {
    await p.mouse.click(1000, 33);
    await p.locator('.prestige-nav .x-grid-row').filter({ visible: true }).first().waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  }
}
const visible = (p, requete) => p.waitForFunction((r) => Ext.ComponentQuery.query(r).some((x) => x.isVisible(true)), requete, { timeout: 60000 });
const api = (p, m, u, c) => p.evaluate(async ([m, u, c]) => {
  const r = await fetch(u, { method: m, headers: { 'Content-Type': 'application/json' }, body: c === undefined ? undefined : JSON.stringify(c) });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch (e) { j = { brut: t.slice(0, 160) }; } j.http = r.status; return j;
}, [m, u, c]);

(async () => {
  const user = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
  nettoyer();
  poser(user);
  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } });
  await ctx.route(/\/api\/v1\/vente\/ticket\//, (r) => r.abort());
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const traces = [];
  p.on('response', (r) => { if (/ventestats|vente\/cloturer/.test(r.url())) { r.text().then((t) => traces.push(r.status() + ' ' + r.url().replace(/^.*\/api\/v1\//, '') + ' ' + t.slice(0, 300))).catch(() => {}); } });
  try {
    ok('Jeu d\'essai : deux articles de prix différents', PRODUITS.length === 2 && PRODUITS[0][2] !== PRODUITS[1][2], JSON.stringify(PRODUITS.map((x) => [x[1], x[2]])));
    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const cap = await api(p, 'GET', '../api/v1/paiements-mobile/capacites');
    ok('Simulateur de paiement actif', cap.fournisseur === 'simulateur', JSON.stringify(cap).slice(0, 120));

    /* deux preventes payees a la borne, sans cloture automatique */
    const preventePayee = async (x, qte, operateur) => {
      const r = await api(p, 'POST', '../api/v1/vente/add/vno', { typeVenteId: '1', natureVenteId: '1', produitId: x[0], itemPu: Number(x[2]), qte, qteServie: qte,
        devis: false, prevente: true, remiseId: '', venteId: null, userVendeurId: user, clientId: CLIENT });
      const v = r.data && r.data.lgPREENREGISTREMENTID; if (v) { ventes.push(v); }
      if (v) { await api(p, 'PUT', '../api/v1/vente/terminerprevente/' + v); }
      const pm = await api(p, 'POST', '../api/v1/paiements-mobile', { venteId: v, operateur, cloturer: false });
      const id = pm.data && pm.data.id;
      if (id) { await api(p, 'POST', '../api/v1/paiements-mobile/' + id + '/simuler?payer=true'); }
      return { v, id, ref: v ? q("SELECT str_REF FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v + "'") : '',
        montant: id ? Number(q("SELECT montant FROM paiement_mobile WHERE id = '" + id + "'")) : 0,
        refFournisseur: id ? q("SELECT IFNULL(ref_fournisseur, '') FROM paiement_mobile WHERE id = '" + id + "'") : '' };
    };
    const A = await preventePayee(PRODUITS[0], 3, 'WAVE');
    const B = await preventePayee(PRODUITS[1], 1, 'OM');
    ok('Jeu d\'essai : A payée Wave (3 × prix), B payée Orange Money, ni l\'une ni l\'autre clôturée',
      A.montant === 3 * Number(PRODUITS[0][2]) && B.montant === Number(PRODUITS[1][2])
      && q("SELECT GROUP_CONCAT(CONCAT(statut, '/', cloture) ORDER BY operateur) FROM paiement_mobile WHERE vente_id IN ('" + A.v + "', '" + B.v + "')") === 'paye/0,paye/0'
      && q("SELECT GROUP_CONCAT(str_STATUT) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN ('" + A.v + "', '" + B.v + "')") === 'is_Process,is_Process',
      JSON.stringify([A, B]));

    /* 1. liste des preventes */
    await ouvrirEcran(p, 'preenregistrementmanager');
    await visible(p, 'preenregistrementmanager gridpanel');
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('preenregistrementmanager gridpanel')[0]; return g && !g.getStore().isLoading() && g.getStore().getCount() > 0; }, null, { timeout: 30000 }).catch(() => {});
    const liste = await p.evaluate(([a, b]) => {
      const g = Ext.ComponentQuery.query('preenregistrementmanager gridpanel')[0], view = g.getView(), r = {};
      [a, b].forEach((ref) => { const rec = g.getStore().findRecord('strREF', ref, 0, false, false, true); const n = rec ? view.getNode(rec) : null; r[ref] = n ? n.innerText.replace(/\s+/g, ' ') : null; });
      return r;
    }, [A.ref, B.ref]);
    const f = (n) => n.toLocaleString('fr-FR').replace(/ | /g, ' ');
    const contient = (t, s) => !!t && t.replace(/[\s  .,]/g, '').indexOf(s.replace(/[\s  .,]/g, '')) >= 0;
    ok('Liste des préventes : « Payée Wave » et « Payée Orange Money », montants = base',
      contient(liste[A.ref], 'Payée Wave ' + f(A.montant) + ' F') && contient(liste[B.ref], 'Payée Orange Money ' + f(B.montant) + ' F'), JSON.stringify(liste));

    /* 2. reprise de A au comptoir par son numero */
    await ouvrirEcran(p, 'cloturerventemanager');
    await visible(p, 'cloturerventemanager #addBtn');
    await vues.cliquer(p, 'cloturerventemanager #addBtn');
    await visible(p, 'doventemanager #preventeSearchField');
    await p.waitForTimeout(1500);
    await vues.cliquer(p, 'doventemanager #preventeSearchField');
    await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('doventemanager #preventeSearchField')[0]; return c && document.activeElement === c.inputEl.dom; }, null, { timeout: 10000 }).catch(() => {});
    await p.waitForTimeout(500);
    await p.keyboard.type(A.ref, { delay: 30 });
    await p.keyboard.press('Enter');
    await p.waitForFunction((v) => { const c = testextjs.app.getController('VenteCtr').current; return c && c.lgPREENREGISTREMENTID === v; }, A.v, { timeout: 30000 }).catch(() => {});
    await p.waitForTimeout(3000);
    const ecran = await p.evaluate(() => {
      const c = testextjs.app.getController('VenteCtr'), b = Ext.ComponentQuery.query('doventemanager #bandeauPaiementMobile')[0];
      const mode = c.getVnotypeReglement(), recu = c.getMontantRecu();
      return { bandeau: b && b.isVisible(true) ? b.getEl().dom.innerText.replace(/\s+/g, ' ') : null, mode: mode ? String(mode.getValue()) : null,
        verrou: mode ? mode.readOnly === true : null, recu: recu ? Number(recu.getValue()) : null, recuVerrou: recu ? recu.readOnly === true : null };
    });
    ok('Bandeau : « Déjà payée par Wave », montant et n° du paiement', !!ecran.bandeau && contient(ecran.bandeau, 'Déjà payée par Wave : ' + f(A.montant) + ' F')
      && (!A.refFournisseur || ecran.bandeau.indexOf(A.refFournisseur) >= 0) && /Ne rien encaisser/.test(ecran.bandeau), ecran.bandeau);
    ok('Mode Wave (10) imposé, liste verrouillée ; montant reçu = montant payé, non modifiable',
      ecran.mode === '10' && ecran.verrou && ecran.recu === A.montant && ecran.recuVerrou, JSON.stringify(ecran));
    await p.screenshot({ path: ENV_E2E.TMP + '/prevente-payee-mobile.png' });

    /* 3. « Terminer la vente » */
    const stockAvant = Number(q("SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID = '" + PRODUITS[0][0] + "'"));
    const rep = p.waitForResponse((r) => /\/vente\/cloturer\/vno/.test(r.url()), { timeout: 120000 });
    await vues.cliquer(p, 'doventemanager #contenu [xtype=toolbar] #btnCloture');
    const corps = await (await rep).json().catch(() => ({}));
    await p.waitForTimeout(1000);
    const message = await vues.texteMessage(p).catch(() => '');
    if (/imprimer le ticket/i.test(message)) { await vues.repondre(p, 'no'); }
    await p.waitForTimeout(1000);
    ok('Vente terminée au comptoir, sans autre question', corps.success === true, JSON.stringify(corps).slice(0, 200) + ' ' + message);
    const vente = q("SELECT CONCAT_WS('|', str_STATUT, IFNULL(lg_CLIENT_ID, '-'), int_PRICE - IFNULL(int_PRICE_REMISE, 0)) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + A.v + "'").split('|');
    const regl = q("SELECT CONCAT(COUNT(*), '|', IFNULL(GROUP_CONCAT(type_regelement), '-'), '|', IFNULL(SUM(montant), 0)) FROM vente_reglement WHERE vente_id = '" + A.v + "'");
    ok('Rapprochement : écran = paiement = règlement = vente (' + A.montant + ' F, Wave), client gardé',
      vente[0] === 'is_Closed' && vente[1] === CLIENT && Number(vente[2]) === A.montant && regl === '1|10|' + A.montant, vente.join('|') + ' ; ' + regl);
    const stockApres = Number(q("SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID = '" + PRODUITS[0][0] + "'"));
    ok('Bilan : un mouvement de caisse, stock - 3', q("SELECT COUNT(*) FROM mvttransaction WHERE vente_id = '" + A.v + "'") === '1' && stockAvant - stockApres === 3,
      q("SELECT COUNT(*) FROM mvttransaction WHERE vente_id = '" + A.v + "'") + ' ; ' + stockAvant + ' -> ' + stockApres);
    ok('Paiement marqué clôturé (« Vente terminée au comptoir »)', q("SELECT CONCAT(statut, '|', cloture, '|', IFNULL(message, '-')) FROM paiement_mobile WHERE id = '" + A.id + "'") === 'paye|1|Vente terminée au comptoir',
      q("SELECT CONCAT(statut, '|', cloture, '|', IFNULL(message, '-')) FROM paiement_mobile WHERE id = '" + A.id + "'"));
    await api(p, 'POST', '../api/v1/paiements-mobile/' + A.id + '/simuler?payer=true');
    await api(p, 'GET', '../api/v1/paiements-mobile/' + A.id);
    ok('Seconde notification : rien de plus (un règlement, un mouvement)', q("SELECT COUNT(*) FROM vente_reglement WHERE vente_id = '" + A.v + "'") === '1'
      && q("SELECT COUNT(*) FROM mvttransaction WHERE vente_id = '" + A.v + "'") === '1');
    const bandeauApres = await p.evaluate(() => Ext.ComponentQuery.query('doventemanager #bandeauPaiementMobile').length);
    ok('Écran remis à zéro : plus de bandeau', bandeauApres === 0, bandeauApres);

    /* 4. B en especes : refus */
    const net = Number(q("SELECT int_PRICE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + B.v + "'"));
    const especes = await api(p, 'POST', '../api/v1/vente/cloturer/vno', { venteId: B.v, typeRegleId: '1', typeVenteId: '1', natureVenteId: '1', clientId: CLIENT,
      montantPaye: net, montantRecu: net, montantRemis: 0, totalRecap: net, devis: false, userVendeurId: user, reglements: [{ typeReglement: '1', montant: net, montantAttentu: net }] });
    ok('B terminée en espèces : refusée, message qui nomme Orange Money et le montant', especes.success === false && /Orange Money/.test(especes.msg || '')
      && contient(especes.msg, f(B.montant) + ' F'), JSON.stringify(especes).slice(0, 240));
    ok('… rien d\'écrit : B toujours en prévente, aucun règlement ni mouvement, paiement toujours à encaisser',
      q("SELECT str_STATUT FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + B.v + "'") === 'is_Process'
      && q("SELECT COUNT(*) FROM vente_reglement WHERE vente_id = '" + B.v + "'") === '0' && q("SELECT COUNT(*) FROM mvttransaction WHERE vente_id = '" + B.v + "'") === '0'
      && q("SELECT cloture FROM paiement_mobile WHERE id = '" + B.id + "'") === '0');
    const fiche = await api(p, 'GET', '../api/v1/ventestats/' + B.v);
    ok('Fiche de B : paiement à encaisser signalé (Orange Money, montant), mode proposé 7',
      fiche.data && fiche.data.paiementMobile && fiche.data.paiementMobile.operateurLibelle === 'Orange Money' && fiche.data.paiementMobile.montant === B.montant
      && fiche.data.typeReglementAttente === '7', JSON.stringify(fiche.data && fiche.data.paiementMobile).slice(0, 200));
    const ficheA = await api(p, 'GET', '../api/v1/ventestats/' + A.v);
    ok('Fiche de A (terminée) : plus de paiement à encaisser', ficheA.data && !ficheA.data.paiementMobile);
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    await p.screenshot({ path: ENV_E2E.TMP + '/prevente-payee-mobile-echec.png' }).catch(() => {});
    ok('Parcours sans exception', false, e.stack);
    console.log('Traces :\n' + traces.join('\n'));
  } finally {
    await b.close();
    nettoyer();
    ok('Données d\'essai retirées, stock remis', q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN ('" + (ventes.join("','") || '-') + "')") === '0'
      && q("SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID = '" + CLIENT + "'") === '0'
      && PRODUITS.every((x) => q("SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID = '" + x[0] + "'") === x[3]));
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
