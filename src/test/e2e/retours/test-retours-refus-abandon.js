/* RETOURS FOURNISSEURS EN ATTENTE (transmission du 07/11, choix du 08/11). Par l'ecran « Retour fournisseur », admin.
 *  1. Sans P_VALIDER_RETOUR_FRS : mise en attente (confirmation dans le bouton) ; compteur 403 ; ni pastille ni avis ;
 *     le refus est interdit (403).
 *  2. Avec le droit : pastille du menu et avis de connexion = nombre de retours en attente en base ; filtre d'etat.
 *     Refus : sans motif, le bouton dit « Motif obligatoire » et rien ne part ; avec motif, confirmation dans le
 *     bouton ; etat, motif, auteur, date et historique en base ; la liste montre « Refusé » et le motif en infobulle ;
 *     la pastille baisse d'un.
 *  3. Retour refuse rouvert : motif visible, pas de « Valider », « Remettre en attente » et « Abandonner » ; remise en
 *     attente (motif efface), second refus (deux refus de suite, historique), puis abandon ; un retour abandonne ne se
 *     valide ni ne se refuse plus.
 *  4. Un tiers sans le droit ne remet pas en attente le retour refuse d'un autre (403).
 *  Bilan : le stock et les mouvements du produit ne bougent jamais. Tout est retire ; droit remis.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const privilegeEssai = require('../support/privilege-essai');
const { connexion, ouvrirMenu, cliquer, choisir, saisir } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const NOTE = 'E2E-RETOUR-REFUS';
const MOTIF1 = 'Quantité fausse (essai)', MOTIF2 = 'Lot à préciser (essai)';
const debut = q('SELECT NOW()');
const droit = privilegeEssai(q, exec, ENV_E2E.LOGIN, 'P_VALIDER_RETOUR_FRS');
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const TIERS = q(`SELECT lg_USER_ID FROM t_user WHERE lg_USER_ID <> '${ADMIN}' AND str_STATUT = 'enable' ORDER BY lg_USER_ID LIMIT 1`);
const [BL, PRODUIT] = q("SELECT CONCAT_WS('|', b.str_REF_LIVRAISON, d.lg_FAMILLE_ID) FROM t_bon_livraison b"
  + " JOIN t_bon_livraison_detail d ON d.lg_BON_LIVRAISON_ID = b.lg_BON_LIVRAISON_ID"
  + " JOIN t_famille_stock s ON s.lg_FAMILLE_ID = d.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' AND s.int_NUMBER_AVAILABLE > 3"
  + " WHERE d.int_QTE_RECUE >= 2 AND b.str_STATUT <> 'delete'"
  + " AND (SELECT COUNT(*) FROM t_bon_livraison x WHERE x.str_REF_LIVRAISON = b.str_REF_LIVRAISON) = 1"
  + " ORDER BY b.dt_CREATED DESC LIMIT 1 OFFSET 2").split('|');
const MOTIF = q("SELECT lg_MOTIF_RETOUR FROM t_motif_retour ORDER BY lg_MOTIF_RETOUR LIMIT 1");
const stock = () => q(`SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_FAMILLE_ID = '${PRODUIT}' AND lg_EMPLACEMENT_ID = '1'`);
const mvts = () => q(`SELECT COUNT(*) FROM HMvtProduit WHERE lg_FAMILLE_ID = '${PRODUIT}'`);
const etat = (id) => q(`SELECT str_STATUT FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID = '${id}'`);
const enAttente = () => Number(q("SELECT COUNT(*) FROM t_retour_fournisseur WHERE str_STATUT = 'is_Waiting'"));
const historique = (id) => q(`SELECT IFNULL(GROUP_CONCAT(CONCAT_WS(':', action, IFNULL(motif, ''), lg_USER_ID = '${ADMIN}') ORDER BY dt_ACTION, id SEPARATOR '|'), '')`
  + ` FROM t_retour_fournisseur_historique WHERE lg_RETOUR_FRS_ID = '${id}'`);
const STOCK0 = stock(), MVT0 = mvts();

function retirer() {
  const ids = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT("'", lg_RETOUR_FRS_ID, "'")), "''") FROM t_retour_fournisseur WHERE str_COMMENTAIRE = '${NOTE}'`);
  const refs = q(`SELECT IFNULL(GROUP_CONCAT(str_REF_RETOUR_FRS SEPARATOR '|'), '') FROM t_retour_fournisseur WHERE str_COMMENTAIRE = '${NOTE}'`).split('|').filter(Boolean);
  const det = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT("'", lg_RETOUR_FRS_DETAIL, "'")), "''") FROM t_retour_fournisseur_detail WHERE lg_RETOUR_FRS_ID IN (${ids})`);
  exec(`DELETE FROM HMvtProduit WHERE pkey IN (${det});`
    + `DELETE FROM notification WHERE entity_ref IN (${ids});`
    + (q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_retour_fournisseur_historique'") === '1' ? `DELETE FROM t_retour_fournisseur_historique WHERE lg_RETOUR_FRS_ID IN (${ids});` : '')
    + (refs.length ? `DELETE FROM t_event_log WHERE dt_CREATED >= '${debut}' AND (` + refs.map((r) => `str_DESCRIPTION LIKE '%${r}%' OR str_TYPE_LOG = '${r}'`).join(' OR ') + ');' : '')
    + `DELETE FROM t_retour_fournisseur_detail WHERE lg_RETOUR_FRS_ID IN (${ids});`
    + `DELETE FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID IN (${ids});`);
}

(async () => {
  droit.remettre();
  retirer();
  const b = await ENV_E2E.lancer(chromium);
  const err = [], dialogues = [];
  let p, R1 = '', R2 = '';
  const ouvrir = async () => {
    if (p) { await p.context().close(); }
    p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
    p.on('pageerror', (e) => err.push(e.message));
    p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await p.waitForTimeout(4000); // la pastille et l'avis arrivent apres le menu
  };
  const api = (m, u, c) => p.evaluate(async ([m, u, c]) => { const r = await fetch(u, { method: m, headers: { 'Content-Type': 'application/json' }, body: c === undefined ? undefined : JSON.stringify(c) });
    let j = null; try { j = await r.json(); } catch (e) { /* vide */ } return { status: r.status, j }; }, [m, u, c]);
  const creer = async () => { const r = await api('POST', '../api/v1/retourfournisseur/new', { lgBONLIVRAISONID: BL, strCOMMENTAIRE: NOTE, items: [{ produitId: PRODUIT, lgMOTIFRETOUR: MOTIF, intNUMBERRETURN: 2 }] });
    return r.j && r.j.data && r.j.data.lgRETOURFRSID; };
  /* pastille sur la ligne du menu parent (DOM) ; le texte du noeud reste le libelle seul */
  const pastille = () => p.evaluate(() => { const e = document.querySelector('.prestige-nav .pastille-retours'); return e ? Number(e.textContent) : 0; });
  const libelleNoeud = () => p.evaluate(() => { const n = Ext.ComponentQuery.query('treepanel').map((t) => t.getStore().getNodeById && t.getStore().getNodeById('retourfrsmanager')).find(Boolean);
    return n ? n.get('text') : null; });
  /* clic sur la ligne du menu parent (volet deplie au besoin), comme ouvrirMenu, sans choisir d'entree */
  const ouvrirMenuParent = async () => {
    const visible = (sel) => p.locator(sel).filter({ visible: true });
    if (await visible('.prestige-nav .x-grid-row').count() === 0) {
      const id = await p.evaluate(() => { const n = Ext.ComponentQuery.query('navigation')[0]; return n.placeholder ? n.placeholder.getId() : null; });
      await p.click('#' + id);
      await visible('.prestige-nav .x-grid-row').first().waitFor({ timeout: 10000 });
    }
    await visible('.prestige-nav .x-grid-row').filter({ has: p.getByText(/^\s*GESTION DES COMMANDES\s*$/) }).first().click();
    await visible('.prestige-flyout-menu .x-menu-item').first().waitFor({ timeout: 10000 });
    await p.waitForTimeout(300);
  };
  const avis = () => p.evaluate(() => { const a = document.querySelector('.avis-retours-attente'); return a ? a.textContent.replace(/\s+/g, ' ') : ''; });
  const attendreEtat = async (id, s) => { for (let i = 0; i < 40 && etat(id) !== s; i++) { await p.waitForTimeout(500); } return etat(id); };
  /* liste des retours par le menu, filtre d'etat choisi dans la liste deroulante */
  const liste = async (filtre) => {
    if (!(await p.evaluate(() => Ext.ComponentQuery.query('retourfrsmanager').some((g) => g.isVisible(true))))) {
      await ouvrirMenu(p, 'GESTION DES COMMANDES', 'Retour fournisseur');
    }
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('retourfrsmanager')[0]; return g && g.isVisible(true) && !g.getStore().isLoading() && Ext.getCmp('retourFrsEtat'); }, null, { timeout: 60000 });
    if (filtre) {
      await choisir(p, '#retourFrsEtat', filtre);
      await p.waitForTimeout(400);
      await p.waitForFunction(() => !Ext.ComponentQuery.query('retourfrsmanager')[0].getStore().isLoading(), null, { timeout: 60000 });
    }
    await p.waitForTimeout(500);
  };
  const ligne = (id) => p.evaluate((id) => { const g = Ext.ComponentQuery.query('retourfrsmanager')[0], st = g.getStore(), i = st.findExact('lg_RETOUR_FRS_ID', id);
    const statuts = st.collect('str_STATUT');
    if (i < 0) { return { present: false, statuts, total: st.getCount() }; }
    const n = g.getView().getNode(st.getAt(i)), img = [...n.querySelectorAll('img.act-modifier, img[src*="page_white_edit"]')].find((x) => !x.classList.contains('x-hide-display'));
    if (img) { img.id = 'e2e-ouvrir-retour'; }
    const tip = [...n.querySelectorAll('[data-qtip]')].map((x) => x.getAttribute('data-qtip')).join(' ');
    return { present: true, statuts, total: st.getCount(), texte: n.textContent.replace(/\s+/g, ' '), tip, icone: !!img }; }, id);
  const boutons = () => p.evaluate(() => { const v = (id) => { const c = Ext.getCmp(id); return c && !c.isDestroyed && c.isVisible() ? c.getText ? c.getText() : (c.getEl() ? c.getEl().dom.textContent : 'oui') : null; };
    return { valider: v('btn_save'), attente: v('btn_attente'), refuser: v('btn_refuser'), abandonner: v('btn_abandonner'), motif: !!(Ext.getCmp('retourMotifRefus') && Ext.getCmp('retourMotifRefus').isVisible()), info: v('retourRefusInfo') }; });
  const ouvrirRetour = async (id) => {
    await liste('Tous les états');
    const l = await ligne(id);
    if (!l.icone) { return l; }
    await p.click('#e2e-ouvrir-retour');
    await p.waitForFunction(() => { const b = Ext.getCmp('btn_save'); return b && !b.isDestroyed && Ext.getCmp('btn_attente'); }, null, { timeout: 30000 });
    await p.waitForTimeout(1500); // droits charges, boutons poses
    return l;
  };
  /* clic, puis lecture du bouton arme, puis second clic */
  const deuxClics = async (sel) => {
    await cliquer(p, sel);
    await p.waitForTimeout(300);
    const arme = await p.evaluate((s) => ({ texte: Ext.ComponentQuery.query(s)[0].getText(), boite: Ext.ComponentQuery.query('messagebox').some((m) => m.isVisible()) }), sel);
    await cliquer(p, sel);
    return arme;
  };
  try {
    ok('Précondition : une ligne de BL en stock, un motif, un autre utilisateur', !!BL && !!PRODUIT && !!MOTIF && !!TIERS && Number(STOCK0) > 3, BL + ' ' + PRODUIT + ' ' + STOCK0);

    /* ----- 1. sans le droit de validation ----- */
    droit.retirer();
    await ouvrir();
    R1 = await creer();
    ok('Retour créé en saisie', !!R1 && etat(R1) === 'is_Process', R1);
    const n403 = await api('GET', '../api/v1/retourfournisseur/en-attente/nombre');
    ok('Sans le droit : compteur refusé (403), ni pastille ni avis', n403.status === 403 && (await pastille()) === 0 && (await avis()) === '', JSON.stringify(n403));
    await p.evaluate(([id, note]) => testextjs.app.getController('App').onLoadNewComponentWithDataSource('retourfournisseurmanagerlist', 'Modification fiche retour fournisseur', id,
      { lg_RETOUR_FRS_ID: id, str_REF_LIVRAISON: '', str_REPONSE_FRS: '', str_COMMENTAIRE: note, str_GROSSISTE_LIBELLE: '' }), [R1, NOTE]);
    await p.waitForFunction(() => { const b = Ext.getCmp('btn_save'); return b && /attente/i.test(b.getText()); }, null, { timeout: 15000 });
    const bt0 = await boutons();
    ok('Sans le droit : « Mettre en attente de validation » seul, ni Refuser ni Abandonner', /Mettre en attente de validation/.test(bt0.valider) && !bt0.refuser && !bt0.abandonner && !bt0.attente, JSON.stringify(bt0));
    await deuxClics('#btn_save');
    ok('Mise en attente (confirmation dans le bouton)', (await attendreEtat(R1, 'is_Waiting')) === 'is_Waiting' && /^MISE_EN_ATTENTE::1$/.test(historique(R1)), historique(R1));
    const refusSansDroit = await api('POST', '../api/v1/retourfournisseur/refuser/' + R1, { motif: 'x' });
    ok('Sans le droit : refus interdit (403), retour toujours en attente', refusSansDroit.status === 403 && etat(R1) === 'is_Waiting', JSON.stringify(refusSansDroit));

    /* ----- 2. avec le droit : pastille, avis, filtre, refus ----- */
    droit.remettre();
    await ouvrir();
    const n1 = enAttente();
    const nb = await api('GET', '../api/v1/retourfournisseur/en-attente/nombre');
    ok('Compteur = retours en attente en base', nb.status === 200 && nb.j && nb.j.nombre === n1, JSON.stringify(nb.j) + ' base ' + n1);
    ok('Pastille du menu = base ; le libellé du menu reste « Retour fournisseur » seul', (await pastille()) === n1 && (await libelleNoeud()) === 'Retour fournisseur',
      (await pastille()) + ' / ' + n1 + ' / ' + (await libelleNoeud()));
    /* menu flottant du parent : la pastille sur l'entree, a cote du libelle (le libelle reste entier) */
    await ouvrirMenuParent();
    const flot = await p.evaluate(() => { const i = [...document.querySelectorAll('.prestige-flyout-menu .x-menu-item')].find((x) => x.querySelector('.pastille-retours'));
      return i ? { libelle: [...i.querySelectorAll('.x-menu-item-text > span')].map((s) => s.textContent).find((t) => t && t.trim()), nombre: Number(i.querySelector('.pastille-retours').textContent),
        brut: /<span/.test(i.textContent) } : null; });
    ok('Menu flottant : pastille sur « Retour fournisseur », sans HTML affiché', flot && flot.libelle === 'Retour fournisseur' && flot.nombre === n1 && !flot.brut, JSON.stringify(flot));
    /* second clic sur la ligne parente : le menu flottant se referme (bascule) */
    await p.locator('.prestige-nav .x-grid-row').filter({ visible: true }).filter({ has: p.getByText(/^\s*GESTION DES COMMANDES\s*$/) }).first().click();
    await p.waitForTimeout(400);
    const a1 = await avis();
    ok('Avis discret à la connexion, avec le nombre, sans fenêtre', a1.includes(n1 + ' retour') && !(await p.evaluate(() => Ext.ComponentQuery.query('messagebox').some((m) => m.isVisible()))), a1);
    await liste('En attente de validation');
    let l = await ligne(R1);
    ok('Filtre « En attente » : le retour y est, rien d\'autre que des retours en attente', l.present && l.statuts.every((s) => s === 'is_Waiting'), JSON.stringify(l.statuts.slice(0, 10)));
    l = await ouvrirRetour(R1);
    let bt = await boutons();
    ok('Retour en attente, valideur : « Valider le retour », « Refuser » et le champ du motif', l.icone && /Valider le retour/.test(bt.valider) && bt.refuser === 'Refuser' && bt.motif && !bt.abandonner, JSON.stringify(bt));
    await cliquer(p, '#btn_refuser');
    await p.waitForTimeout(300);
    const sansMotif = await p.evaluate(() => Ext.getCmp('btn_refuser').getText());
    await p.waitForTimeout(800);
    ok('Refus sans motif : « Motif obligatoire » dans le bouton, rien n\'est envoyé', sansMotif === 'Motif obligatoire' && etat(R1) === 'is_Waiting', sansMotif);
    await saisir(p, '#retourMotifRefus', MOTIF1);
    const ar = await deuxClics('#btn_refuser');
    ok('Refus avec motif : confirmation dans le bouton, aucune fenêtre', ar.texte === 'Confirmer le refus' && !ar.boite, JSON.stringify(ar));
    const r1 = await attendreEtat(R1, 'is_Refused');
    const col = q(`SELECT CONCAT_WS('|', str_MOTIF_REFUS, lg_USER_REFUS = '${ADMIN}', IF(dt_REFUS IS NULL, '-', 'date')) FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID = '${R1}'`);
    ok('Base : refusé, motif, auteur et date du refus ; historique', r1 === 'is_Refused' && col === MOTIF1 + '|1|date' && historique(R1) === 'MISE_EN_ATTENTE::1|REFUS:' + MOTIF1 + ':1', col + ' / ' + historique(R1));
    await p.waitForTimeout(2500); // retour a la liste, pastille actualisee
    ok('Pastille : un de moins (= base)', (await pastille()) === enAttente() && enAttente() === n1 - 1, (await pastille()) + ' / ' + enAttente());
    await liste('Refusés');
    l = await ligne(R1);
    ok('Liste « Refusés » : « Refusé », motif en infobulle, icône pour corriger', l.present && /Refusé/.test(l.texte) && l.tip.includes(MOTIF1) && l.icone && l.statuts.every((s) => s === 'is_Refused'), JSON.stringify(l));
    ok('Stock et mouvements inchangés après le refus', stock() === STOCK0 && mvts() === MVT0);

    /* ----- 3. retour refuse : remise en attente, second refus, abandon ----- */
    await ouvrirRetour(R1);
    bt = await boutons();
    ok('Retour refusé rouvert : motif visible, pas de « Valider », « Remettre en attente » et « Abandonner »', !bt.valider && bt.attente === 'Remettre en attente' && bt.abandonner === 'Abandonner'
      && (bt.info || '').includes(MOTIF1) && !bt.refuser, JSON.stringify(bt));
    const am = await deuxClics('#btn_attente');
    const r2 = await attendreEtat(R1, 'is_Waiting');
    const efface = q(`SELECT CONCAT_WS('|', IFNULL(str_MOTIF_REFUS, '-'), IFNULL(dt_REFUS, '-')) FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID = '${R1}'`);
    ok('Remise en attente : confirmation dans le bouton, motif effacé, historique', am.texte === 'Confirmer la remise en attente' && !am.boite && r2 === 'is_Waiting' && efface === '-|-'
      && /\|REMISE_EN_ATTENTE::1$/.test(historique(R1)), am.texte + ' / ' + efface + ' / ' + historique(R1));
    await p.waitForTimeout(2000);
    await ouvrirRetour(R1);
    await saisir(p, '#retourMotifRefus', MOTIF2);
    await deuxClics('#btn_refuser');
    const r3 = await attendreEtat(R1, 'is_Refused');
    ok('Second refus de suite : refusé, nouveau motif, deux refus à l\'historique', r3 === 'is_Refused' && q(`SELECT str_MOTIF_REFUS FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID = '${R1}'`) === MOTIF2
      && (historique(R1).match(/REFUS:/g) || []).length === 2, historique(R1));
    const h = await api('GET', '../api/v1/retourfournisseur/' + R1 + '/historique');
    ok('Route de l\'historique = base (4 actions dans l\'ordre)', h.j && JSON.stringify(h.j).includes(MOTIF2) && (h.j.historique || h.j.data || []).length === 4, JSON.stringify(h.j).slice(0, 300));
    await p.waitForTimeout(2000);
    await ouvrirRetour(R1);
    const ab = await deuxClics('#btn_abandonner');
    const r4 = await attendreEtat(R1, 'is_Abandoned');
    ok('Abandon : confirmation dans le bouton, abandonné, historique', ab.texte === 'Confirmer l\'abandon' && !ab.boite && r4 === 'is_Abandoned' && /\|ABANDON::1$/.test(historique(R1)), ab.texte + ' / ' + historique(R1));
    await p.waitForTimeout(2000);
    await liste('Abandonnés');
    l = await ligne(R1);
    ok('Liste « Abandonnés » : « Abandonné », plus d\'icône de modification', l.present && /Abandonné/.test(l.texte) && !l.icone, JSON.stringify(l));
    const v = await api('POST', '../api/v1/produit/validerretourfour', { ref: R1 });
    const rf = await api('POST', '../api/v1/retourfournisseur/refuser/' + R1, { motif: 'encore' });
    ok('Un retour abandonné ne se valide ni ne se refuse plus', v.j && v.j.success === false && rf.status === 409 && etat(R1) === 'is_Abandoned', JSON.stringify(v.j) + ' ' + JSON.stringify(rf));

    /* ----- 4. un tiers sans le droit ----- */
    R2 = await creer();
    exec(`UPDATE t_retour_fournisseur SET str_STATUT = 'is_Refused', lg_USER_ID = '${TIERS}', lg_USER_ATTENTE = '${TIERS}', str_MOTIF_REFUS = 'essai', dt_REFUS = NOW() WHERE lg_RETOUR_FRS_ID = '${R2}'`);
    droit.retirer();
    await ouvrir();
    const t = await api('POST', '../api/v1/retourfournisseur/remettre-en-attente/' + R2);
    const t2 = await api('POST', '../api/v1/retourfournisseur/abandonner/' + R2);
    ok('Tiers sans le droit : ni remise en attente ni abandon du retour d\'un autre (403)', t.status === 403 && t2.status === 403 && etat(R2) === 'is_Refused', JSON.stringify(t) + ' ' + JSON.stringify(t2));
    droit.remettre();

    ok('Bilan : stock et mouvements du produit jamais modifiés', stock() === STOCK0 && mvts() === MVT0, STOCK0 + '->' + stock() + ' mvt ' + MVT0 + '->' + mvts());
    ok('Aucune fenêtre surgissante, aucune erreur JavaScript', dialogues.length === 0 && err.length === 0, dialogues.concat(err).join(' | '));
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack);
  } finally {
    await b.close();
    droit.remettre();
    retirer();
    ok('Données d\'essai retirées, stock et droit remis', q(`SELECT COUNT(*) FROM t_retour_fournisseur WHERE str_COMMENTAIRE = '${NOTE}'`) === '0' && stock() === STOCK0 && mvts() === MVT0
      && q("SELECT COUNT(*) FROM t_role_privelege rp JOIN t_privilege p ON p.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID JOIN t_role_user ru ON ru.lg_ROLE_ID = rp.lg_ROLE_ID JOIN t_user u ON u.lg_USER_ID = ru.lg_USER_ID WHERE u.str_LOGIN = '" + ENV_E2E.LOGIN + "' AND p.str_NAME = 'P_VALIDER_RETOUR_FRS'") !== '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
