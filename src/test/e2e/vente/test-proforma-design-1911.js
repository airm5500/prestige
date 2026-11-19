/* NOUVELLE PROFORMA AU DESIGN ACTUEL (decision du 19/11, cas de Tiassale) : « menu proforma (devismanager) vue
 * decoulant du clic sur "nouvelle proforma" doit etre revue selon le design actuel ; cacher la liste deroulante
 * PRESCRIPTION... mais on continue de recuperer la valeur en arriere ».
 *
 * Parcours a l'ecran, a la souris et au clavier, sur un poste de 1366 x 768 :
 *  1. menu Proforma, bouton « Nouvelle PROFORMA » ;
 *  2. dessin : ligne Type / Vendeur de l'ecran de vente (boutons segmentes), liste de la nature cachee mais posee a
 *     PRESCRIPTION (1), cartes et boutons au style de l'ecran de vente, rien de coupe ni hors de l'ecran ;
 *  3. type « Carnet » puis « Au comptant » d'un clic : la carte des tiers-payants parait puis disparait (la proforma
 *     ne propose pas l'assurance : typedevis l'exclut, comme avant) ;
 *  4. client, deux articles (quantite 3, puis 1), Entree ;
 *  5. rapprochement : lignes et total de l'ecran = base ; nature 1, type 1, statut devis, client en base ;
 *  6. bilan : aucun mouvement de stock ni de caisse, stock inchange ;
 *  7. « Enregistrer la proforma », « Non » a l'impression : retour a la liste, ou la proforma figure avec le montant
 *     de la base.
 * Tout ce que le test pose est retire (proforma, lignes, client).
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 320) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).replace(/\r/g, '').trim();

const CLIENT = 'E2E-PRODES-CLI';
const NOM_CLIENT = 'ZZPROFORMADESIGN';
const CHAMP = 'doDevis #contenu [xtype=fieldcontainer] #produit';

/* deux articles simples, prix differents, CIP uniques, stock large */
const PRODUITS = q("SELECT f.lg_FAMILLE_ID, f.int_CIP, f.int_PRICE, s.int_NUMBER_AVAILABLE FROM t_famille f JOIN t_famille_stock s"
  + " ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' WHERE f.str_STATUT = 'enable' AND s.str_STATUT = 'enable'"
  + " AND f.int_CIP REGEXP '^[0-9]{7}$' AND f.int_PRICE BETWEEN 300 AND 5000 AND s.int_NUMBER_AVAILABLE > 20 AND f.bool_DECONDITIONNE = 0"
  + " AND (SELECT COUNT(*) FROM t_famille x WHERE x.int_CIP = f.int_CIP) = 1"
  + " AND NOT EXISTS (SELECT 1 FROM t_famille e WHERE e.lg_FAMILLE_PARENT_ID = f.lg_FAMILLE_ID)"
  + " GROUP BY f.int_PRICE ORDER BY f.int_CIP LIMIT 2").split('\n').map((l) => l.split('\t'));
const devis = [];

function nettoyer() {
  if (devis.length) {
    const l = "('" + devis.join("','") + "')";
    q("DELETE FROM t_preenregistrement_compte_client WHERE lg_PREENREGISTREMENT_ID IN " + l + ";"
      + " DELETE FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID IN " + l + ";"
      + " DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN " + l + ";"
      + " DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN " + l);
  }
  q("DELETE FROM t_compte_client WHERE lg_CLIENT_ID = '" + CLIENT + "'; DELETE FROM t_client WHERE lg_CLIENT_ID = '" + CLIENT + "'");
}

function poser() {
  q("INSERT INTO t_client (lg_CLIENT_ID, str_CODE_INTERNE, str_FIRST_NAME, str_LAST_NAME, lg_TYPE_CLIENT_ID, dt_CREATED, dt_UPDATED, str_STATUT)"
    + " VALUES ('" + CLIENT + "', '" + CLIENT + "', '" + NOM_CLIENT + "', 'E2E', '6', NOW(), NOW(), 'enable');"
    + " INSERT INTO t_compte_client (lg_COMPTE_CLIENT_ID, str_CODE_COMPTE_CLIENT, str_TYPE, P_KEY, dbl_QUOTA_CONSO_MENSUELLE, dbl_CAUTION, dec_Balance,"
    + " dt_CREATED, dt_UPDATED, str_STATUT, lg_CLIENT_ID, dbl_PLAFOND) VALUES ('" + CLIENT + "', '" + CLIENT + "', 'CLIENT', '" + CLIENT + "', 0, 0, 0,"
    + " NOW(), NOW(), 'enable', '" + CLIENT + "', 0)");
}

/* menu du volet, retrouve par l'ecran qu'il ouvre ; le volet est referme d'un clic a cote */
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

async function taperArticle(p, cip, qte, url) {
  await vues.cliquer(p, CHAMP);
  await p.keyboard.press('Control+A');
  await p.keyboard.type(cip, { delay: 15 });
  await p.waitForTimeout(2500);
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('doDevis #qtyField')[0]; return c && document.activeElement === c.inputEl.dom; }, null, { timeout: 15000 });
  await p.keyboard.press('Control+A');
  await p.keyboard.type(String(qte), { delay: 15 });
  const rep = p.waitForResponse((r) => url.test(r.url()), { timeout: 60000 });
  await p.keyboard.press('Enter');
  await rep;
  await p.waitForTimeout(1500);
}

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(String(e.message)));
  try {
    ok('Jeu d\'essai : deux articles de prix différents', PRODUITS.length === 2 && PRODUITS[0][2] !== PRODUITS[1][2], JSON.stringify(PRODUITS.map((x) => [x[1], x[2]])));
    nettoyer();
    poser();
    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');

    /* 1. menu Proforma, « Nouvelle PROFORMA » */
    await ouvrirEcran(p, 'devismanager');
    await visible(p, 'devismanager #addBtn');
    await vues.cliquer(p, 'devismanager #addBtn');
    await visible(p, 'doDevis #clientSearchTextField');
    await p.waitForFunction(() => { const n = Ext.ComponentQuery.query('doDevis #nature')[0], t = Ext.ComponentQuery.query('doDevis #typeVente')[0];
      return n && t && n.getValue() !== null && t.getValue() !== null; }, null, { timeout: 20000 }).catch(() => {});
    await p.waitForTimeout(1200);

    /* 2. dessin */
    const dessin = await p.evaluate(() => {
      const ecran = Ext.ComponentQuery.query('doDevis')[0], nature = ecran.down('#nature'), type = ecran.down('#typeVente');
      const corps = ecran.down('#contenu').down('panel');
      const boutons = Array.from(ecran.getEl().dom.querySelectorAll('button.seg-bouton')).filter((x) => x.offsetParent !== null);
      const texte = ecran.getEl().dom.innerText;
      const cls = (id) => { const c = ecran.down('#' + id); return c ? String(c.cls || '') + ' ' + c.getEl().dom.className : ''; };
      return {
        natureVisible: nature.isVisible(true), natureValeur: nature.getValue(), typeValeur: type.getValue(),
        texteNature: /PRESCRIPTION|nature \.\.\./i.test(texte),
        segments: boutons.map((x) => x.textContent.trim()), actif: boutons.filter((x) => /seg-actif/.test(x.className)).map((x) => x.textContent.trim()),
        ligne: !!ecran.down('#ligneTypeVente') && ecran.down('#ligneTypeVente').hasCls('seg-ligne'),
        shell: ecran.hasCls('vp-shell'), corps: !!corps && corps.hasCls('vp-vente'),
        cloture: cls('btnCloture'), net: cls('netBtn'), retour: cls('btnGoBack'),
        cartes: ['clientSearchBox', 'assureCmp', 'tpContainer', 'produitContainer', 'infoscontainer', 'gridContainer']
          .map((id) => id + ':' + (/vp-[a-z-]*card/.test(cls(id)) ? 'carte' : 'non')),
        total: cls('totalField')
      };
    });
    ok('La liste de la nature (PRESCRIPTION) est cachée', dessin.natureVisible === false && !dessin.texteNature, JSON.stringify([dessin.natureVisible, dessin.texteNature]));
    ok('La nature reste posée en arrière : PRESCRIPTION (1)', dessin.natureValeur === '1', dessin.natureValeur);
    ok('Type de vente en boutons segmentés, comme l\'écran de vente : Au comptant, Carnet (types de la proforma)',
      dessin.ligne && JSON.stringify(dessin.segments) === JSON.stringify(['Au comptant', 'Carnet']) && JSON.stringify(dessin.actif) === '["Au comptant"]',
      JSON.stringify([dessin.ligne, dessin.segments, dessin.actif]));
    ok('Enveloppe et corps au style de l\'écran de vente (vp-shell, vp-vente)', dessin.shell && dessin.corps, JSON.stringify([dessin.shell, dessin.corps]));
    ok('Sections en cartes', dessin.cartes.every((x) => /carte$/.test(x)), dessin.cartes.join(' '));
    ok('Boutons au nouveau style : Enregistrer (btn-primary), Net (btn-primarya), Retour (btn-secondary)',
      /\bbtn-primary\b/.test(dessin.cloture) && /\bbtn-primarya\b/.test(dessin.net) && /\bbtn-secondary\b/.test(dessin.retour),
      JSON.stringify([dessin.cloture, dessin.net, dessin.retour]).replace(/x-[a-z-]+/g, '').replace(/\s+/g, ' '));
    ok('Total en badge (vp-total-badge)', /vp-total-badge/.test(dessin.total), dessin.total.replace(/x-[a-z-]+/g, ''));

    /* ergonomie : rien hors de l'ecran, aucun libelle coupe */
    const ergo = await p.evaluate(() => {
      const ecran = Ext.ComponentQuery.query('doDevis')[0], W = window.innerWidth;
      const hors = [], coupes = [];
      ['btnCloture', 'netBtn', 'btnGoBack', 'user', 'clientSearchTextField', 'produit', 'qtyField'].forEach((id) => {
        const c = ecran.down('#' + id); if (!c || !c.isVisible(true)) { hors.push(id + ' absent'); return; }
        const r = c.getEl().dom.getBoundingClientRect();
        if (r.left < 0 || r.right > W + 1 || r.width < 20) { hors.push(id + ' ' + Math.round(r.left) + '-' + Math.round(r.right)); }
        const inner = c.btnInnerEl ? c.btnInnerEl.dom : null;
        if (inner && inner.scrollWidth > inner.clientWidth + 1) { coupes.push(id); }
      });
      Array.from(ecran.getEl().dom.querySelectorAll('button.seg-bouton')).forEach((x) => {
        const r = x.getBoundingClientRect(); if (r.right > W + 1 || x.scrollWidth > x.clientWidth + 1) { coupes.push(x.textContent); }
      });
      return { hors, coupes, defilement: document.documentElement.scrollWidth > W + 1 };
    });
    ok('Ergonomie 1366 px : boutons et champs dans l\'écran, aucun libellé coupé, pas de défilement horizontal',
      !ergo.hors.length && !ergo.coupes.length && !ergo.defilement, JSON.stringify(ergo));
    await p.screenshot({ path: ENV_E2E.TMP + '/proforma-design.png' });

    /* 3. type d'un clic : Carnet puis Au comptant */
    const segment = (t) => p.locator('.x-panel:visible button.seg-bouton', { hasText: t }).first();
    const tpVisible = () => p.evaluate(() => Ext.ComponentQuery.query('doDevis #tpContainer')[0].isVisible(true));
    let bascule = null;
    if (await segment('Carnet').count()) {
      await segment('Carnet').click(); await p.waitForTimeout(800);
      const avecTp = await tpVisible(), typeA = await p.evaluate(() => Ext.ComponentQuery.query('doDevis #typeVente')[0].getValue());
      await segment('Au comptant').click(); await p.waitForTimeout(800);
      bascule = { avecTp, typeA, sansTp: !(await tpVisible()), typeC: await p.evaluate(() => Ext.ComponentQuery.query('doDevis #typeVente')[0].getValue()) };
    }
    ok('Un clic sur « Carnet » montre les tiers-payants, un clic sur « Au comptant » les retire',
      !!bascule && bascule.avecTp && bascule.typeA === '3' && bascule.sansTp && bascule.typeC === '1', JSON.stringify(bascule));

    /* 4. client, puis deux articles */
    await vues.cliquer(p, 'doDevis #clientSearchTextField');
    await p.keyboard.type(NOM_CLIENT, { delay: 15 });
    await p.keyboard.press('Enter');
    await p.waitForTimeout(2500);
    if (await p.evaluate(() => Ext.ComponentQuery.query('clientDevis').some((w) => w.isVisible()))) {
      const icone = p.locator('.x-window:visible .x-grid-row').filter({ hasText: NOM_CLIENT }).first().locator('.x-action-col-icon').first();
      await icone.click();
      await p.waitForTimeout(1500);
    }
    const client = await p.evaluate(() => { const c = testextjs.app.getController('DevisCtr').getClient(); return c ? String(c.get('strFIRSTNAME') || '') : ''; });
    ok('Le client est choisi', client === NOM_CLIENT, client);

    await taperArticle(p, PRODUITS[0][1], 3, /\/vente\/devis/);
    const id = await p.evaluate(() => { const v = testextjs.app.getController('DevisCtr').getCurrent(); return v ? v.lgPREENREGISTREMENTID : null; });
    if (id) { devis.push(id); }
    await taperArticle(p, PRODUITS[1][1], 1, /\/vente\/add\/item/);

    /* 5. rapprochement ecran / base */
    const ecran = await p.evaluate(() => {
      const g = Ext.ComponentQuery.query('doDevis #venteGrid')[0];
      const lignes = []; g.getStore().each((r) => lignes.push([String(r.get('intCIP')), Number(r.get('intQUANTITY')), Number(r.get('intPRICEUNITAIR')), Number(r.get('intPRICE'))]));
      return { lignes, total: Number(Ext.ComponentQuery.query('doDevis #totalField')[0].getValue()) };
    });
    const base = id ? q("SELECT f.int_CIP, d.int_QUANTITY, d.int_PRICE_UNITAIR, d.int_PRICE FROM t_preenregistrement_detail d JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID"
      + " WHERE d.lg_PREENREGISTREMENT_ID = '" + id + "' ORDER BY f.int_CIP").split('\n').filter(Boolean).map((l) => l.split('\t')).map((x) => [x[0], Number(x[1]), Number(x[2]), Number(x[3])]) : [];
    const attendu = [[PRODUITS[0][1], 3, Number(PRODUITS[0][2]), 3 * Number(PRODUITS[0][2])], [PRODUITS[1][1], 1, Number(PRODUITS[1][2]), Number(PRODUITS[1][2])]]
      .sort((x, y) => (x[0] < y[0] ? -1 : 1));
    const ecranTrie = ecran.lignes.slice().sort((x, y) => (x[0] < y[0] ? -1 : 1));
    ok('Rapprochement ligne à ligne : écran = base = attendu (CIP, quantité, prix, montant)',
      JSON.stringify(ecranTrie) === JSON.stringify(base) && JSON.stringify(base) === JSON.stringify(attendu), JSON.stringify({ ecran: ecranTrie, base, attendu }));
    const entete = id ? q("SELECT CONCAT_WS('|', int_PRICE, IFNULL(lg_NATURE_VENTE_ID, '-'), IFNULL(lg_TYPE_VENTE_ID, '-'), str_STATUT, IFNULL(lg_CLIENT_ID, '-'))"
      + " FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + id + "'").split('|') : [];
    const somme = attendu.reduce((s, x) => s + x[3], 0);
    ok('Total : écran = base = somme des lignes', ecran.total === somme && Number(entete[0]) === somme, ecran.total + ' / ' + entete[0] + ' / ' + somme);
    ok('En base : nature PRESCRIPTION (1), type au comptant (1), statut devis, client de la proforma',
      entete[1] === '1' && entete[2] === '1' && entete[3] === 'devis' && entete[4] === CLIENT, entete.join('|'));

    /* 6. bilan : une proforma ne touche ni au stock ni a la caisse */
    const lignesIds = id ? "(SELECT lg_PREENREGISTREMENT_DETAIL_ID FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + id + "')" : "('-')";
    const traces = id ? q("SELECT CONCAT((SELECT COUNT(*) FROM hmvtproduit WHERE pkey = '" + id + "' OR pkey IN " + lignesIds + " OR lg_PREENREGISTREMENT_DETAIL_ID IN " + lignesIds + "), '|',"
      + " (SELECT COUNT(*) FROM mvttransaction WHERE pkey = '" + id + "' OR vente_id = '" + id + "'), '|',"
      + " (SELECT COUNT(*) FROM vente_reglement WHERE vente_id = '" + id + "'))") : '?';
    const stocks = PRODUITS.map((x) => q("SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID = '" + x[0] + "'"));
    ok('Bilan : aucun mouvement de stock, de caisse ni de règlement ; stock inchangé', traces === '0|0|0' && stocks[0] === PRODUITS[0][3] && stocks[1] === PRODUITS[1][3],
      traces + ' ; stock ' + stocks.join(',') + ' (avant ' + PRODUITS[0][3] + ',' + PRODUITS[1][3] + ')');

    /* 7. enregistrer, « Non » a l'impression : retour a la liste */
    await vues.cliquer(p, 'doDevis #btnCloture');
    const non = p.locator('.x-message-box:visible .x-btn', { hasText: /^\s*(Non|No)\s*$/ }).first();
    await non.waitFor({ timeout: 15000 });
    await non.click();
    await visible(p, 'devismanager #addBtn');
    await p.waitForTimeout(2500);
    const ref = id ? q("SELECT str_REF FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + id + "'") : '';
    const liste = await p.evaluate((r) => {
      const g = Ext.ComponentQuery.query('devismanager gridpanel')[0]; const rec = g.getStore().findRecord('strREF', r, 0, false, false, true);
      return rec ? { ref: rec.get('strREF'), montant: Number(rec.get('intPRICE')), client: String(rec.get('clientFullName') || '') } : null;
    }, ref);
    ok('Liste des proformas : la proforma y figure, montant = base, client', !!liste && liste.montant === Number(entete[0]) && liste.client.indexOf(NOM_CLIENT) >= 0, JSON.stringify(liste) + ' ref ' + ref);
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    await p.screenshot({ path: ENV_E2E.TMP + '/proforma-design-echec.png' }).catch(() => {});
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Données d\'essai retirées', q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN ('" + (devis.join("','") || '-') + "')") === '0'
      && q("SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID = '" + CLIENT + "'") === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
