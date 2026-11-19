/* DEFAUT 3 DU 19/11 (Pontmain) : VENTE PAYEE EN ESPECES + MOBILE MONEY, COMPTEE TOUT ENTIERE EN ESPECES.
 *
 * Une vente payee en deux modes n'a qu'une ligne de mouvement (mvttransaction) : mode principal « especes », montant
 * total. Le detail juste est dans vente_reglement. Les etats qui lisent le mode du mouvement mettaient toute la vente en
 * especes : « Total annulation » des ventes annulees (especes rendues), tuile « Ventes annulees » du pilotage
 * (« dont … rendus en especes »), CA comptant par mode de l'ERP (v1/ca-comptant).
 *
 * Par l'ecran (compte de test, caisse ouverte, client standard d'essai) :
 *  V1 : produit P1 x 2, Especes + WAVE (especes sous le net, Entree, « associer un autre mode » : Oui) : Wave = W1, especes tendues = net - W1 + 500 (monnaie) ;
 *  V2 : produit P2 x 3, Especes seules, montant exact (vente de controle, lue comme avant) ;
 *  V3 : produit P1 x 3, Especes + ORANGE, Orange = net - 100 (petite part especes).
 * Puis V1 et V2 annulees par la liste des ventes terminees (« Annuler.Vente »).
 * Controles :
 *  - rapprochement par vente : ecran (net, part mobile saisie) = vente_reglement (une ligne par mode, montants) ;
 *  - bilan : un mouvement par vente (mode especes, montant = net), un de plus par annulation, rien d'autre ;
 *  - ERP, avant les annulations : especes + (part especes V1 + V2 + V3), mobile + (W1 + O3) ;
 *  - ecran Ventes annulees, « Total annulation » : + (part especes V1 + V2), pas + (net V1 + V2) ;
 *  - pilotage, tuile « Ventes annulees » : « dont … rendus en especes » + (part especes V1 + V2).
 * Tout est retire a la fin (audits/commun.js). Lancement seul : node src/test/e2e/caisse/test-paiement-mixte-1911.js
 */
const C = require('../audits/commun');
const L = require('../ligne-comptant/commun');
const vues = require('../outils/vues');
const { ok, q, MARQUE } = C;

const d = new Date();
const JOUR = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const NOM = 'ZZMIXTE';
const nombre = (v) => Number(String(v === undefined || v === null ? '' : v).replace(/[^\d-]/g, '')) || 0;

async function fermerMessages(p) {
  const vus = [];
  for (let i = 0; i < 4; i++) {
    const t = await vues.texteMessage(p).catch(() => '');
    if (!t) { break; }
    vus.push(t);
    await vues.repondre(p, /imprimer le ticket/i.test(t) ? 'no' : 'ok').catch(() => {});
    await p.waitForTimeout(500);
  }
  return vus;
}

/* article par son CIP dans la liste, quantite, Entree */
async function ajouter(p, produit, qte) {
  await vues.cliquer(p, L.CHAMP_PRODUIT);
  await p.keyboard.press('Control+A');
  await p.keyboard.type(produit.cip, { delay: 40 });
  await p.waitForSelector('.x-boundlist-item:visible', { timeout: 20000 });
  await p.locator('.x-boundlist-item:visible').filter({ hasText: produit.cip }).first().click();
  await p.waitForFunction(() => { const f = Ext.ComponentQuery.query('doventemanager #contenu [xtype=fieldcontainer] #qtyField')[0]; return f && document.activeElement === f.inputEl.dom; }, null, { timeout: 15000 }).catch(() => {});
  await vues.cliquer(p, 'doventemanager #contenu [xtype=fieldcontainer] #qtyField');
  await p.keyboard.press('Control+A');
  await p.keyboard.type(String(qte), { delay: 30 });
  const rep = p.waitForResponse((r) => /\/vente\/add\/(vno|item)/.test(r.url()), { timeout: 60000 });
  await p.keyboard.press('Enter');
  await rep;
  await p.waitForTimeout(1500);
  await fermerMessages(p);
}

/* vente au comptant : article x qte ; si operateur : second mode (bouton), client d'essai, part mobile ; especes tendues */
async function vente(p, produit, qte, operateur, partMobile, ecartEspeces) {
  await L.nouvelleVente(p);
  await ajouter(p, produit, qte);
  const venteId = await p.evaluate(() => { const c = testextjs.app.getController('VenteCtr').getCurrent(); return c ? c.lgPREENREGISTREMENTID : null; });
  if (venteId) { C.etat.ventes.push(venteId); }
  const net = await p.evaluate(() => { const x = testextjs.app.getController('VenteCtr').getNetAmountToPay(); return x ? Number(x.montantNet) : 0; });
  let mobile = 0;
  const taperRecu = async (montant) => {
    for (let essai = 0; essai < 3; essai++) {
      await vues.cliquer(p, 'doventemanager #contenu #montantRecu');
      await p.keyboard.press('Control+A');
      await p.keyboard.type(String(montant), { delay: 40 });
      await p.waitForTimeout(300);
      if (nombre(await p.evaluate(() => Ext.ComponentQuery.query('doventemanager #contenu #montantRecu')[0].getValue())) === montant) { break; }
    }
  };
  if (operateur) {
    /* chemin de la caissiere : especes tapees SOUS le net, Entree -> « Voulez-vous associer un autre mode de paiement
       pour la difference ? » -> Oui -> liste des modes -> operateur -> client -> la difference passe en mobile */
    mobile = typeof partMobile === 'function' ? partMobile(net) : partMobile;
    await taperRecu(net - mobile);
    await p.keyboard.press('Enter');
    await vues.attendreMessage(p, 'associer un autre mode', 15000);
    await vues.repondre(p, 'yes');
    await p.waitForFunction(() => { const w = Ext.ComponentQuery.query('reglementGrid')[0]; return w && w.isVisible() && w.down('gridpanel').getStore().getCount() > 0; }, null, { timeout: 20000 });
    await p.locator('.x-window:visible .x-grid-row').filter({ hasText: new RegExp('^\\s*\\d*\\s*' + operateur + '\\s*$') }).first().click();
    await p.waitForTimeout(1500);
    /* pas de client : la fenetre du client s'ouvre d'office ; le client d'essai est cherche puis choisi par son « + » */
    if (await p.evaluate(() => Ext.ComponentQuery.query('clientLambda').some((w) => w.isVisible()))) {
      await p.evaluate((nom) => { const g = Ext.ComponentQuery.query('clientLambda #lambdaClientGrid')[0]; const st = g.getStore();
        st.getProxy().extraParams = Ext.apply(st.getProxy().extraParams || {}, { query: nom }); st.load(); }, NOM);
      const ligne = p.locator('.x-window:visible .x-grid-row').filter({ hasText: NOM }).first();
      await ligne.waitFor({ timeout: 20000 });
      await ligne.locator('.x-action-col-icon').first().click();
      await p.waitForTimeout(1500);
      await fermerMessages(p);
    }
    /* part mobile proposee = difference ; Entree dans le champ la confirme (cadenas) avant de taper le billet tendu */
    await vues.cliquer(p, 'doventemanager #contenu #montantExtra');
    await p.keyboard.press('Control+A');
    await p.keyboard.type(String(mobile), { delay: 40 });
    await p.keyboard.press('Enter');
    await p.waitForTimeout(500);
  }
  const tendu = net - mobile + (ecartEspeces || 0);
  await taperRecu(tendu);
  await p.keyboard.press('Tab');
  await p.waitForTimeout(500);
  const ecran = await p.evaluate(() => { const c = testextjs.app.getController('VenteCtr'), e = c.getMontantExtra();
    return { extra: c.extraModeReglementId || null, mobile: e && e.isVisible() ? Number(e.getValue()) || 0 : 0 }; });
  const rep = p.waitForResponse((r) => /\/vente\/cloturer\/vno/.test(r.url()), { timeout: 120000 });
  await vues.cliquer(p, 'doventemanager #contenu [xtype=toolbar] #btnCloture');
  const corps = await (await rep).json().catch(() => ({}));
  await p.waitForTimeout(1000);
  const messages = await fermerMessages(p);
  return { id: venteId, net, mobile, tendu, ecran, ok: corps.success === true, msg: (corps.msg || '') + ' ' + messages.join(' | ') };
}

/* ---- lectures ---- */
const reglements = (id) => q("SELECT IFNULL(GROUP_CONCAT(CONCAT(type_regelement, ':', montant) ORDER BY CAST(type_regelement AS UNSIGNED)), '-') FROM vente_reglement WHERE vente_id = '" + id + "'");
const mouvements = (id) => q("SELECT IFNULL(GROUP_CONCAT(CONCAT(IFNULL(typeReglementId, '-'), ':', montantPaye, ':', checked + 0) ORDER BY montantPaye DESC SEPARATOR ' ; '), '-') FROM mvttransaction WHERE pkey = '" + id + "'");
const refDe = (id) => q("SELECT IFNULL(str_REF, '') FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + id + "'");

async function totalAnnulationEcran(p) {
  await L.ouvrirEcran(p, 'venteannuler');
  await L.visible(p, 'venteannuler #rechercher');
  await p.waitForTimeout(1000);
  const rep = p.waitForResponse((r) => /ventestats\/annulations/.test(r.url()), { timeout: 60000 });
  await vues.cliquer(p, 'venteannuler #rechercher');
  await rep;
  await p.waitForTimeout(1500);
  return p.evaluate(() => { const f = Ext.ComponentQuery.query('venteannuler #totalAmount')[0]; return f ? Number(String(f.getValue()).replace(/[^\d-]/g, '')) || 0 : null; });
}
async function pilotageEspeces(api) {
  const r = await api('GET', '../api/v1/pilotage/onglet/qualite?axe=PERSO&dtStart=' + JOUR + '&dtEnd=' + JOUR + 'T' + Date.now());
  const tuile = ((r.data && r.data.tuiles) || r.tuiles || []).find((t) => t.cle === 'annulees') || null;
  const texte = tuile ? JSON.stringify(tuile) : JSON.stringify(r).slice(0, 300);
  const m = texte.match(/dont\s+(-?[\d\s  ]+)\s*FCFA rendus en esp/);
  return { valeur: m ? nombre(m[1]) : null, texte };
}
async function erp(api) {
  const r = await api('GET', '../api/v1/ca-comptant?dtStart=' + JOUR + '&dtEnd=' + JOUR);
  const l = (r.liste || [])[0] || {};
  return { esp: Number(l.totEsp || 0), mobile: Number(l.totMobile || 0), brut: JSON.stringify(l).slice(0, 200) };
}

(async () => {
  C.ouvrirCaisse();
  const HORS = "AND IFNULL(f.is_scheduled, 0) = 0 AND IFNULL(f.is_sensible, 0) = 0 AND f.int_CIP REGEXP '^[0-9]{6,8}$'"
    + " AND (SELECT COUNT(*) FROM t_famille x WHERE x.int_CIP = f.int_CIP) = 1";
  const P1 = C.produit(12, 500, HORS);
  const P2 = C.produit(12, 500, HORS + " AND f.int_PRICE <> " + P1.pu + " AND f.lg_FAMILLE_ID <> '" + P1.id + "'");
  for (const pr of [P1, P2]) { pr.cip = q("SELECT int_CIP FROM t_famille WHERE lg_FAMILLE_ID = '" + pr.id + "'"); }
  const sess = await C.connecter();
  const { p, api, erreurs } = sess;
  await p.context().route(/\/api\/v1\/vente\/ticket\//, (r) => r.abort());
  try {
    const cree = await api('POST', '../api/v1/client/add/lambda', { strFIRSTNAME: NOM, strLASTNAME: MARQUE + 'MIX', strADRESSE: '', lgTYPECLIENTID: '6', consentSms: 'false' });
    ok('Jeu d\'essai : deux produits de prix différents, un client standard d\'essai', !!(P1 && P2 && P1.cip && P2.cip && cree.data), [P1.cip, P1.pu, P2.cip, P2.pu].join(' '));
    await p.waitForFunction(() => { const n = Ext.ComponentQuery.query('navigation')[0]; return n && n.getStore().getRootNode().childNodes.length > 0; }, null, { timeout: 120000 });

    const erpAvant = await erp(api);
    const v1 = await vente(p, P1, 2, 'WAVE', (net) => Math.round(net / 3 / 5) * 5, 500);
    const v2 = await vente(p, P2, 3, null, 0, 0);
    const v3 = await vente(p, P1, 3, 'ORANGE', (net) => net - 100, 0);
    const especes = (v) => v.net - v.mobile;
    ok('Trois ventes terminées à l\'écran (espèces + Wave, espèces, espèces + Orange)', v1.ok && v2.ok && v3.ok,
      JSON.stringify([v1, v2, v3].map((v) => [v.net, v.mobile, v.tendu, v.ecran, v.msg])));

    /* rapprochement ecran = vente_reglement, bilan des mouvements */
    ok('V1 : écran (Wave saisi) = règlements : Wave ' + v1.mobile + ', espèces ' + especes(v1) + ' (monnaie 500 rendue, non comptée)',
      v1.ecran.extra === '10' && reglements(v1.id) === '1:' + especes(v1) + ',10:' + v1.mobile, reglements(v1.id) + ' ' + JSON.stringify(v1.ecran));
    ok('V2 : un seul règlement espèces = net', reglements(v2.id) === '1:' + v2.net, reglements(v2.id));
    ok('V3 : écran (Orange saisi) = règlements : Orange ' + v3.mobile + ', espèces 100', v3.ecran.extra === '7' && reglements(v3.id) === '1:100,7:' + v3.mobile, reglements(v3.id));
    ok('Bilan : un mouvement par vente, mode espèces, montant = net (une seule ligne, détail dans les règlements)',
      [v1, v2, v3].every((v) => mouvements(v.id) === '1:' + v.net + ':1'), [v1, v2, v3].map((v) => mouvements(v.id)).join(' || '));

    /* ERP avant les annulations */
    const erpApres = await erp(api);
    const attenduEsp = especes(v1) + v2.net + especes(v3), attenduMobile = v1.mobile + v3.mobile;
    ok('ERP ca-comptant : espèces + ' + attenduEsp + ' (parts espèces), mobile + ' + attenduMobile,
      erpApres.esp - erpAvant.esp === attenduEsp && erpApres.mobile - erpAvant.mobile === attenduMobile,
      'espèces +' + (erpApres.esp - erpAvant.esp) + ', mobile +' + (erpApres.mobile - erpAvant.mobile) + ' ; ' + erpApres.brut);

    /* annulations par l'ecran */
    const totalAvant = await totalAnnulationEcran(p);
    const h1 = await L.annulerVente(p, refDe(v1.id));
    const h2 = await L.annulerVente(p, refDe(v2.id));
    const annulee = (id) => q("SELECT b_IS_CANCEL + 0 FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + id + "'") === '1';
    ok('V1 et V2 annulées par « Annuler.Vente »', h1 === 200 && h2 === 200 && annulee(v1.id) && annulee(v2.id), h1 + ' ' + h2);
    ok('Bilan de l\'annulation : un mouvement opposé de plus par vente, rien pour V3',
      q("SELECT COUNT(*) FROM mvttransaction WHERE pkey IN (SELECT lg_PREENREGISTREMENT_ID FROM t_preenregistrement WHERE lg_PREENGISTREMENT_ANNULE_ID IN ('" + v1.id + "', '" + v2.id + "'))") === '2'
      && mouvements(v3.id) === '1:' + v3.net + ':1');
    const totalApres = await totalAnnulationEcran(p);
    const rendu = especes(v1) + v2.net;
    ok('Écran Ventes annulées, « Total annulation » : + ' + rendu + ' (espèces rendues), pas + ' + (v1.net + v2.net),
      totalAvant !== null && totalApres - totalAvant === rendu, totalAvant + ' -> ' + totalApres);
    /* le pilotage garde ses chiffres en cache quelques minutes : un seul appel, apres les annulations, compare a la
       base (part especes de chaque vente annulee du jour : reglements si plusieurs, sinon le mode du mouvement) */
    const pilot = await pilotageEspeces(api);
    const oracle = Number(q("SELECT COALESCE(SUM(CASE WHEN (SELECT COUNT(*) FROM vente_reglement c WHERE c.vente_id = m.pkey) > 1"
      + " THEN (SELECT COALESCE(SUM(v.montant), 0) FROM vente_reglement v WHERE v.vente_id = m.pkey AND v.type_regelement = '1')"
      + " WHEN m.typeReglementId = '1' THEN m.montantPaye ELSE 0 END), 0) FROM mvttransaction m JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = m.pkey"
      + " WHERE p.b_IS_CANCEL = 1 AND p.str_STATUT = 'is_Closed' AND p.dt_ANNULER >= CURDATE() AND p.dt_ANNULER < CURDATE() + INTERVAL 1 DAY AND m.montantPaye > 0"));
    const oracleAncien = Number(q("SELECT COALESCE(SUM(m.montantPaye), 0) FROM mvttransaction m JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = m.pkey"
      + " WHERE p.b_IS_CANCEL = 1 AND p.str_STATUT = 'is_Closed' AND p.dt_ANNULER >= CURDATE() AND p.dt_ANNULER < CURDATE() + INTERVAL 1 DAY AND m.montantPaye > 0 AND m.typeReglementId = '1'"));
    ok('Pilotage, tuile « Ventes annulées » : « dont … rendus en espèces » = parts espèces des annulations du jour (' + oracle + ', ancienne lecture ' + oracleAncien + ')',
      oracle !== oracleAncien && pilot.valeur === oracle && totalApres === oracle, pilot.valeur + ' ; écran ' + totalApres + ' ; ' + pilot.texte.slice(0, 200));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await sess.b.close();
    C.nettoyer();
  }
  process.exit(C.bilan() ? 1 : 0);
})();
