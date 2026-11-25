/* JOURNAL DES VENTES EN SAISIE ET ONGLET DU MENU « VENTES » (retours du 25/11, points 1.4 et 1.5).
 *
 * Jeu d'essai fait par les écrans, deux caissiers réels (profil « Caisse/Commande/Stock ») sur deux postes :
 *  - JS1 : vente A (P1 x1, P2 x1) mise en attente ; vente B (P1 x3) abandonnée par Retour ;
 *  - JS2 : vente C (P3 x2) abandonnée par Retour ; vente D (P2 x1) interrompue (onglet fermé).
 *
 *  1. Onglet (1.4) : le menu « Ventes » de JS2 a deux onglets ; le premier reste la liste des ventes en attente
 *     (barre de recherche visible) ; l'onglet « Ventes en cours et interrompues » montre la vente D (= base), la
 *     barre de la liste est masquée ; « Reprendre » (deux clics) rouvre D à l'écran de vente.
 *  2. Journal (admin) : un seul champ « Période » (les deux champs de date sont masqués) ; listes poste / utilisateur
 *     remplies à partir de la période.
 *  3. Filtres un par un et combinés (utilisateur, geste, poste, motif / cause, utilisateur + geste) : l'écran montre
 *     exactement les lignes de la base pour ce filtre ; le CSV et le PDF (mêmes filtres) ont les mêmes numéros.
 *  4. « Effacer les filtres » : toutes les lignes de la période reviennent.
 *  5. « Imprimer » : le PDF s'affiche sous le plafond ; titre, filtres et état de la chaîne en tête.
 *  6. « Créer un inventaire », filtre utilisateur JS2 : 1er clic = nombre de produits dans le bouton, aucun inventaire
 *     créé ; 2e clic = inventaire créé, ses produits = produits des ventes affichées (lignes en vente et lignes
 *     retirées), une fois chacun ; filtre sans vente : « Aucun produit », rien n'est créé.
 *  7. Bilan : aucune erreur JavaScript ; tout est retiré (ventes, journal du test, inventaires, comptes).
 */
const C = require('../ligne-comptant/commun');
const { chromium, A, vues, ok, q } = C;
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const ENV_E2E = A.ENV_E2E;

const MDP = 'E2e-Journal-5';
const COMPTES = [['E2E-JS1', 'e2e-js1', 'JS1'], ['E2E-JS2', 'e2e-js2', 'JS2']];
const ROLE_CAISSE = q("SELECT lg_ROLE_ID FROM t_role WHERE str_NAME = 'Caisse/Commande/Stock'");
const J0 = Number(q('SELECT IFNULL(MAX(id), 0) FROM vente_journal_saisie'));
const P1 = C.produitSimple(7), P2 = C.produitSimple(8), P3 = C.produitSimple(9);
const PLAFOND_PDF_MS = 5000;
const ventes = [];
const INV0 = q("SELECT IFNULL(MAX(dt_CREATED), '2000-01-01') FROM t_inventaire");

const etat = (id) => q("SELECT IFNULL(etat_saisie, '-') FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + id + "'");
const attendre = async (p, f, delai, pas) => { const fin = Date.now() + delai; let v; while (Date.now() < fin) { v = f(); if (v) { return v; } await p.waitForTimeout(pas || 1000); } return f(); };
const textePdf = (f) => execFileSync('pdftotext', ['-enc', 'UTF-8', '-layout', f, '-'], { encoding: 'utf8', maxBuffer: 1 << 26 });
const inventairesDuTest = () => q("SELECT IFNULL(GROUP_CONCAT(lg_INVENTAIRE_ID), '') FROM t_inventaire WHERE str_NAME LIKE 'INVENTAIRE VENTES EN SAISIE%' AND dt_CREATED > '" + INV0 + "'");

function nettoyer() {
  /* les ventes notees par le test, et toute vente des comptes d'essai (un passage interrompu en laisse) */
  const deComptes = q("SELECT IFNULL(GROUP_CONCAT(lg_PREENREGISTREMENT_ID), '') FROM t_preenregistrement WHERE lg_USER_ID LIKE 'E2E-JS%'");
  const v = A.liste(Array.from(new Set([...ventes, ...(deComptes ? deComptes.split(',') : [])])));
  const inv = inventairesDuTest();
  if (inv) {
    const l = inv.split(',').map((x) => "'" + x + "'").join(',');
    q('DELETE FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID IN (' + l + '); DELETE FROM t_inventaire WHERE lg_INVENTAIRE_ID IN (' + l + ')');
  }
  q("DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + " DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + " DELETE FROM vente_suppression WHERE vente_id IN (" + v + ");"
    + " DELETE FROM vente_journal_saisie WHERE id > " + J0 + ";"
    + " DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID LIKE 'E2E-JS%';"
    + " DELETE FROM t_role_user WHERE lg_USER_ID LIKE 'E2E-JS%';"
    + " DELETE FROM t_event_log WHERE lg_USER_ID LIKE 'E2E-JS%';"
    + " DELETE FROM t_user WHERE lg_USER_ID LIKE 'E2E-JS%'");
}

async function poste(login) {
  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1500, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const s = { b, ctx, p, erreurs: [] };
  p.on('pageerror', (e) => s.erreurs.push(String(e.message)));
  await vues.connexion(p, login, login === ENV_E2E.LOGIN ? 'e2etest' : MDP);
  return s;
}
async function venteAvec(p, articles) {
  await C.nouvelleVente(p);
  for (const [cip, qte] of articles) {
    if (qte === 1) {
      await C.taperArticle(p, cip);
      continue;
    }
    /* quantite > 1 comme a la caisse : produit choisi dans la liste, champ quantite, Entree */
    await vues.cliquer(p, C.CHAMP_PRODUIT);
    await p.keyboard.press('Control+A');
    await p.keyboard.type(cip, { delay: 40 });
    await p.waitForSelector('.x-boundlist-item:visible', { timeout: 20000 });
    await p.locator('.x-boundlist-item:visible').filter({ hasText: cip }).first().click();
    await p.waitForFunction(() => { const f = Ext.ComponentQuery.query('doventemanager #contenu [xtype=fieldcontainer] #qtyField')[0]; return f && document.activeElement === f.inputEl.dom; }, null, { timeout: 15000 }).catch(() => {});
    await vues.cliquer(p, 'doventemanager #contenu [xtype=fieldcontainer] #qtyField');
    await p.keyboard.press('Control+A');
    await p.keyboard.type(String(qte), { delay: 30 });
    const rep = p.waitForResponse((r) => /\/vente\/add\/(vno|item)/.test(r.url()), { timeout: 60000 });
    await p.keyboard.press('Enter');
    await rep;
    await p.waitForTimeout(1500);
  }
  const v = await C.venteCourante(p); ventes.push(v);
  await attendre(p, () => etat(v) === 'EN_COURS', 10000, 300);
  return v;
}
async function retourAbandon(p) {
  await vues.cliquer(p, 'doventemanager #contenu [xtype=toolbar] #btnGoBack');
  await p.waitForSelector('#psv-fenetre', { timeout: 8000 });
  await p.click('#psv-choix-abandonner');
}

/* journal en base pour un filtre : ids, du plus recent au plus ancien (ordre de l'ecran) */
function idsBase(f) {
  let w = 'id > ' + J0 + ' AND DATE(cree_le) = CURDATE()';
  if (f.utilisateur) { w += " AND utilisateur_id = '" + f.utilisateur + "'"; }
  if (f.geste) { w += " AND geste = '" + f.geste + "'"; }
  if (f.poste) { w += " AND poste = '" + f.poste + "'"; }
  if (f.motif) { w += " AND (motif LIKE '%" + f.motif + "%' OR cause LIKE '%" + f.motif + "%')"; }
  return q('SELECT IFNULL(GROUP_CONCAT(id ORDER BY id DESC), \'\') FROM vente_journal_saisie WHERE ' + w);
}
/* lignes de la base hors jeu d'essai (autres tests du jour) : ecartees des comparaisons */
const limiter = (ids) => ids.split(',').filter((x) => x && Number(x) > J0).join(',');

(async () => {
  nettoyer();
  for (const [id, login, nom] of COMPTES) {
    q("INSERT INTO t_user (lg_USER_ID, str_LOGIN, str_PASSWORD, str_FIRST_NAME, str_LAST_NAME, str_FUNCTION, str_STATUT, lg_EMPLACEMENT_ID, dt_CREATED, int_CONNEXION)"
      + " VALUES ('" + id + "', '" + login + "', MD5('" + MDP + "'), 'E2E', '" + nom + "', 'Caissier', 'enable', '1', NOW(), 0)");
    q("INSERT INTO t_role_user (lg_USER_ROLE_ID, lg_ROLE_ID, lg_USER_ID, dt_CREATED) VALUES ('" + id + "', '" + ROLE_CAISSE + "', '" + id + "', NOW())");
    q("INSERT INTO t_resume_caisse (ld_CAISSE_ID, lg_USER_ID, int_SOLDE_MATIN, int_SOLDE_SOIR, dt_CREATED, lg_CREATED_BY, str_STATUT) VALUES ('" + id + "-RC', '" + id + "', 0, 0, NOW(), '" + id + "', 'is_Using')");
  }
  A.ouvrirCaisse();
  const postes = [];
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-journal-'));
  try {
    const j1 = await poste('e2e-js1'); postes.push(j1);
    const j2 = await poste('e2e-js2'); postes.push(j2);

    /* jeu d'essai par les ecrans */
    const vA = await venteAvec(j1.p, [[C.cip(P1), 1], [C.cip(P2), 1]]);
    await vues.cliquer(j1.p, 'doventemanager #contenu [xtype=toolbar] #btnStandBy');
    await attendre(j1.p, () => etat(vA) === 'EN_ATTENTE', 10000, 300);
    await j1.p.waitForTimeout(1500);
    const vB = await venteAvec(j1.p, [[C.cip(P1), 3]]);
    const lignesB = q("SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, 'x', int_QUANTITY)) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + vB + "'");
    await retourAbandon(j1.p);
    await attendre(j1.p, () => q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + vB + "'") === '0', 15000, 300);
    const vC = await venteAvec(j2.p, [[C.cip(P3), 2]]);
    await retourAbandon(j2.p);
    await attendre(j2.p, () => q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + vC + "'") === '0', 15000, 300);
    await j2.p.waitForTimeout(1500);
    const vD = await venteAvec(j2.p, [[C.cip(P2), 1]]);
    await j2.p.close({ runBeforeUnload: true });
    await attendre({ waitForTimeout: (ms) => new Promise((r) => setTimeout(r, ms)) }, () => etat(vD) === 'INTERROMPUE', 15000, 500);
    ok('0. Jeu d\'essai fait par les écrans : A en attente, B et C abandonnées (lignes retirées), D interrompue ; B a une quantité 3',
      etat(vA) === 'EN_ATTENTE' && etat(vD) === 'INTERROMPUE' && /x3$/.test(lignesB || '')
      && q("SELECT COUNT(DISTINCT vente_id) FROM vente_suppression WHERE vente_id IN ('" + vB + "', '" + vC + "')") === '2', [etat(vA), etat(vD), lignesB].join(' '));

    /* 1. onglet du menu Ventes (JS2, nouvelle session) */
    await j2.ctx.close().catch(() => {});
    j2.ctx = await j2.b.newContext({ viewport: { width: 1500, height: 900 } });
    j2.p = await j2.ctx.newPage();
    j2.p.on('pageerror', (e) => j2.erreurs.push(String(e.message)));
    await vues.connexion(j2.p, 'e2e-js2', MDP);
    await C.ouvrirEcran(j2.p, 'cloturerventemanager');
    await C.visible(j2.p, 'cloturerventemanager #addBtn');
    const o1 = await j2.p.evaluate(() => { const e = Ext.ComponentQuery.query('cloturerventemanager')[0]; const t = e.down('#ongletsVentes');
      return { onglets: t.items.getRange().map((x) => x.title), actif: t.getActiveTab().itemId, barre: e.down('#barreMenuVente').isVisible(true),
        premiereGrille: e.down('gridpanel') === t.items.getAt(0).down('gridpanel') }; });
    ok('1. Menu « Ventes » : deux onglets ; le premier (actif) reste la liste des ventes en attente, barre visible',
      JSON.stringify(o1.onglets) === JSON.stringify(['Ventes en attente', 'Ventes en cours et interrompues']) && o1.actif === 'ongletAttente' && o1.barre && o1.premiereGrille, JSON.stringify(o1));
    await j2.p.locator('.x-tab', { hasText: 'Ventes en cours et interrompues' }).first().click();
    await j2.p.waitForFunction((r) => { const v = Ext.ComponentQuery.query('cloturerventemanager ventesencourssaisie')[0]; return v && !v.ventes.isLoading() && v.ventes.findRecord('numero', r); },
      q("SELECT str_REF FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + vD + "'"), { timeout: 20000 });
    /* etat de la barre lu dans la page : visible a l'ecran, et bouton par bouton actif ou grise */
    const barreMenu = () => j2.p.evaluate(() => { const e = Ext.ComponentQuery.query('cloturerventemanager')[0];
      const b = e.down('#barreMenuVente'), r = b.getEl() ? b.getEl().dom.getBoundingClientRect() : { height: 0 };
      const ids = ['addBtn', 'typesPuces', 'query', 'rechercher', 'printParVente', 'printListe', 'createInventaire'];
      return { barre: b.isVisible(true) && r.height > 0, actifs: ids.filter((i) => { const c = e.down('#' + i); return c.isVisible(true) && !c.isDisabled(); }),
        titres: ids.filter((i) => /Ventes en attente/.test(e.down('#' + i).getEl().dom.title || '')) }; });
    const o2 = await j2.p.evaluate(() => { const e = Ext.ComponentQuery.query('cloturerventemanager')[0]; const v = e.down('ventesencourssaisie');
      return { lignes: v.ventes.getRange().map((r) => r.get('id') + '/' + r.get('etat') + '/' + r.get('lignes')) }; });
    ok('1. Onglet « Ventes en cours et interrompues » : la vente D de JS2 (INTERROMPUE, 1 ligne, comme en base)',
      o2.lignes.includes(vD + '/INTERROMPUE/1') && q("SELECT COUNT(*) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + vD + "'") === '1', JSON.stringify(o2));
    /* retour du 25/11 (point 2) : la barre porte aussi sur cet onglet (test-ventes-en-cours-barre-2511.js) : tout est actif */
    const b2 = await barreMenu();
    ok('1. Onglet « Ventes en cours et interrompues » : barre toujours visible, entièrement active (type, recherche, impressions et inventaire portent sur cet onglet)',
      b2.barre && b2.actifs.length === 7 && b2.titres.length === 0, JSON.stringify(b2));
    await j2.p.locator('.x-tab', { hasText: 'Ventes en attente' }).first().click();
    await j2.p.waitForTimeout(300);
    const b1 = await barreMenu();
    ok('1. Retour à l\'onglet « Ventes en attente » : toute la barre redevient active, sans message de survol ajouté',
      b1.barre && b1.actifs.length === 7 && b1.titres.length === 0, JSON.stringify(b1));
    await j2.p.locator('.x-tab', { hasText: 'Ventes en cours et interrompues' }).first().click();
    await j2.p.waitForTimeout(300);
    const refD = q("SELECT str_REF FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + vD + "'");
    const bouton = () => j2.p.locator('.x-grid-row', { hasText: refD }).locator('.vcs-reprendre').first();
    await bouton().click(); await j2.p.waitForTimeout(400);
    await bouton().click();
    await j2.p.waitForFunction((id) => { const c = testextjs.app.getController('VenteCtr'); return c.current && c.current.lgPREENREGISTREMENTID === id; }, vD, { timeout: 20000 });
    ok('1. « Reprendre » (deux clics) depuis l\'onglet : la vente D s\'ouvre à l\'écran de vente, EN_COURS',
      (await attendre(j2.p, () => etat(vD) === 'EN_COURS', 10000, 300)) === true);

    /* 2. journal (admin) */
    const ad = await poste(ENV_E2E.LOGIN); postes.push(ad);
    await C.ouvrirEcran(ad.p, 'journalsaisievente');
    await C.visible(ad.p, 'journalsaisievente #jsvGrille');
    await ad.p.waitForFunction(() => /intacte|ROMPUE/.test(Ext.ComponentQuery.query('journalsaisievente #jsvChaine')[0].getEl().dom.textContent), null, { timeout: 30000 });
    await ad.p.waitForTimeout(1000);
    const e2 = await ad.p.evaluate(() => { const v = Ext.ComponentQuery.query('journalsaisievente')[0];
      const unique = [...v.getEl().dom.querySelectorAll('input')].filter((i) => i.offsetParent !== null && / → /.test(i.value));
      return { du: v.down('#jsvDu').isVisible(true), au: v.down('#jsvAu').isVisible(true), periode: unique.map((i) => i.value),
        postes: v.down('#jsvPoste').getStore().getRange().map((r) => r.get('valeur')), utilisateurs: v.down('#jsvUtilisateur').getStore().getRange().map((r) => r.get('valeur')) }; });
    const postesBase = q("SELECT IFNULL(GROUP_CONCAT(DISTINCT poste ORDER BY poste), '') FROM vente_journal_saisie WHERE DATE(cree_le) = CURDATE() AND poste IS NOT NULL AND poste <> ''");
    ok('2. Un seul champ « Période » (les deux champs de date masqués)', !e2.du && !e2.au && e2.periode.length === 1, JSON.stringify(e2.periode));
    ok('2. Listes : postes de la période = base ; JS1 et JS2 parmi les utilisateurs', e2.postes.filter(Boolean).join(',') === postesBase
      && e2.utilisateurs.includes('E2E-JS1') && e2.utilisateurs.includes('E2E-JS2'), e2.postes.join(',') + ' / ' + postesBase);

    /* 3. filtres : ecran = base = CSV = PDF */
    const choisir = async (itemId, valeur) => {
      const trig = await ad.p.evaluate((i) => Ext.ComponentQuery.query('journalsaisievente #' + i)[0].triggerEl.first().dom.id, itemId);
      await ad.p.click('#' + trig);
      await ad.p.waitForTimeout(300);
      /* les lignes de la liste n'ont pas d'id : la n-ieme ligne de la liste ouverte */
      const item = await ad.p.evaluate(([i, val]) => { const c = Ext.ComponentQuery.query('journalsaisievente #' + i)[0];
        return { liste: c.getPicker().getEl().dom.id, rang: c.getStore().findExact('valeur', val) }; }, [itemId, valeur]);
      const rep = ad.p.waitForResponse((r) => r.url().includes('/vente-saisie/journal?'), { timeout: 30000 }); rep.catch(() => null);
      await ad.p.locator('#' + item.liste + ' .x-boundlist-item').nth(item.rang).click();
      await rep; await ad.p.waitForTimeout(600);
    };
    const motif = async (texte) => {
      await ad.p.click('#' + await ad.p.evaluate(() => Ext.ComponentQuery.query('journalsaisievente #jsvMotif')[0].inputEl.dom.id));
      await ad.p.keyboard.press('Control+A');
      await ad.p.keyboard.type(texte);
      const rep = ad.p.waitForResponse((r) => r.url().includes('/vente-saisie/journal?'), { timeout: 30000 }); rep.catch(() => null);
      await ad.p.keyboard.press('Enter');
      await rep; await ad.p.waitForTimeout(600);
    };
    const ecranIds = () => ad.p.evaluate(() => Ext.ComponentQuery.query('journalsaisievente')[0].journal.getRange().map((r) => r.get('id')).join(','));
    const filtresEcran = () => ad.p.evaluate(() => Ext.ComponentQuery.query('journalsaisievente')[0].filtres());
    const csvIds = async () => { const f = await filtresEcran();
      const t = await ad.p.evaluate(async (x) => (await fetch('../api/v1/vente-saisie/journal/export?' + new URLSearchParams(x))).text(), f);
      return t.split(/\r?\n/).slice(1).map((l) => (l.match(/^"(\d+)"/) || [])[1]).filter(Boolean).join(','); };
    const pdfIds = async (nom) => { const f = await filtresEcran();
      const b64 = await ad.p.evaluate(async (x) => { const r = await fetch('../api/v1/vente-saisie/journal/pdf?' + new URLSearchParams(x)); const a = new Uint8Array(await r.arrayBuffer());
        let s = ''; for (let i = 0; i < a.length; i += 8192) { s += String.fromCharCode.apply(null, a.subarray(i, i + 8192)); } return btoa(s); }, f);
      const fichier = path.join(dossier, nom + '.pdf'); fs.writeFileSync(fichier, Buffer.from(b64, 'base64'));
      const t = textePdf(fichier);
      return { texte: t, ids: t.split(/\r?\n/).map((l) => (l.match(/^\s*(\d{1,9})\s+\d{2}\/\d{2}\/\d{4}/) || [])[1]).filter(Boolean).join(',') }; };
    const verifier = async (libelle, f, nom) => {
      const base = idsBase(f), ecran = await ecranIds(), csv = await csvIds(), pdf = await pdfIds(nom);
      ok('3. ' + libelle + ' : écran = base = CSV = PDF, ligne par ligne', base !== '' && limiter(ecran) === base && limiter(csv) === base && limiter(pdf.ids) === base,
        'base ' + base + ' | écran ' + limiter(ecran) + ' | csv ' + limiter(csv) + ' | pdf ' + limiter(pdf.ids));
      return pdf;
    };
    await choisir('jsvUtilisateur', 'E2E-JS1');
    const pdf1 = await verifier('Utilisateur JS1', { utilisateur: 'E2E-JS1' }, 'js1');
    ok('3. PDF : titre, filtre (utilisateur) et état de la chaîne en tête', /JOURNAL DES VENTES EN SAISIE/.test(pdf1.texte) && /utilisateur : E2E JS1/.test(pdf1.texte) && /cha[iî]ne d.empreintes intacte/i.test(pdf1.texte),
      pdf1.texte.slice(0, 400));
    await choisir('jsvGeste', 'RETOUR_SUPPRIMER');
    await verifier('Utilisateur JS1 + geste « Retour : vente abandonnée »', { utilisateur: 'E2E-JS1', geste: 'RETOUR_SUPPRIMER' }, 'js1-retour');
    await choisir('jsvUtilisateur', '');
    await verifier('Geste « Retour : vente abandonnée » (tous)', { geste: 'RETOUR_SUPPRIMER' }, 'retour');
    await choisir('jsvGeste', '');
    const posteJ2 = q("SELECT poste FROM vente_journal_saisie WHERE id > " + J0 + " AND utilisateur_id = 'E2E-JS2' LIMIT 1");
    await choisir('jsvPoste', posteJ2);
    await verifier('Poste ' + posteJ2, { poste: posteJ2 }, 'poste');
    await choisir('jsvPoste', '');
    await motif('FERMETURE');
    await verifier('Motif / cause « FERMETURE »', { motif: 'FERMETURE' }, 'motif');

    /* 4. effacer */
    const repTout = ad.p.waitForResponse((r) => r.url().includes('/vente-saisie/journal?'), { timeout: 30000 });
    await vues.cliquer(ad.p, 'journalsaisievente #jsvToutVoir');
    await repTout; await ad.p.waitForTimeout(600);
    ok('4. « Effacer les filtres » : toutes les lignes du jour reviennent (= base)', limiter(await ecranIds()) === idsBase({}), limiter(await ecranIds()).slice(0, 200));

    /* 5. impression : delai d'affichage */
    await choisir('jsvUtilisateur', 'E2E-JS2');
    const t0 = Date.now();
    /* ecoute posee sur tout le contexte AVANT le clic : la fenetre peut recevoir le PDF avant qu'on l'observe */
    const attentePdf = ad.p.context().waitForEvent('response', { predicate: (r) => r.url().includes('/vente-saisie/journal/pdf'), timeout: 30000 }).catch(() => null);
    /* chaque attente est bornee : dans la visionneuse PDF, la fin du telechargement n'est pas toujours signalee
     * (finished() ne revenait jamais, le test restait bloque des heures) ; le corps lu suffit a dater l'affichage */
    const borne = (pr, ms) => Promise.race([pr.catch(() => null), new Promise((r) => setTimeout(() => r(null), ms))]);
    const [fen] = await Promise.all([borne(ad.p.waitForEvent('popup', { timeout: 15000 }), 16000), vues.cliquer(ad.p, 'journalsaisievente #jsvImprimer')]);
    const repPdf = await borne(attentePdf, 31000);
    /* le corps n'est pas lisible par le test quand il part dans la visionneuse : on verifie la reponse (200, PDF) et
     * que la fenetre ouverte est bien celle du PDF */
    const duree = Date.now() - t0;
    const urlFen = fen ? fen.url() : '';
    ok('5. « Imprimer » : PDF (200, application/pdf) ouvert dans sa fenêtre sous ' + PLAFOND_PDF_MS + ' ms', !!repPdf && repPdf.status() === 200
      && /pdf/.test(repPdf.headers()['content-type'] || '') && /journal\/pdf/.test(urlFen) && duree < PLAFOND_PDF_MS,
      duree + ' ms ; ' + (repPdf ? repPdf.status() + ' ' + (repPdf.headers()['content-type'] || '') : 'aucune réponse') + ' ; fenêtre ' + urlFen);
    if (fen) { await borne(fen.close(), 5000); }

    /* 6. inventaire (filtre JS2) */
    const attendus = [P3.id, P2.id].sort().join(',');
    const avant = inventairesDuTest();
    await vues.cliquer(ad.p, 'journalsaisievente #jsvInventaire');
    await ad.p.waitForFunction(() => /Confirmer/.test(Ext.ComponentQuery.query('journalsaisievente #jsvInventaire')[0].getText()), null, { timeout: 15000 }).catch(() => {});
    const t6 = await ad.p.evaluate(() => Ext.ComponentQuery.query('journalsaisievente #jsvInventaire')[0].getText());
    ok('6. 1er clic : le bouton annonce 2 produits (P3 retiré de C, P2 de D) et demande confirmation ; aucun inventaire créé',
      t6 === 'Confirmer : inventaire de 2 produit(s)' && inventairesDuTest() === avant, t6);
    await vues.cliquer(ad.p, 'journalsaisievente #jsvInventaire');
    await attendre(ad.p, () => inventairesDuTest() !== avant, 20000, 500);
    const inv = inventairesDuTest().split(',').filter((x) => x && !avant.split(',').includes(x));
    const produitsInv = inv.length === 1 ? q("SELECT IFNULL(GROUP_CONCAT(lg_FAMILLE_ID ORDER BY lg_FAMILLE_ID), '') FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID = '" + inv[0] + "'") : '';
    const message6 = await ad.p.evaluate(() => Ext.ComponentQuery.query('journalsaisievente #jsvMessage')[0].getEl().dom.textContent);
    ok('6. 2e clic : un inventaire créé, ses produits = produits des ventes affichées, une fois chacun ; message à l\'écran',
      inv.length === 1 && produitsInv === attendus && /Inventaire créé : 2 produit/.test(message6), produitsInv + ' / ' + attendus + ' ; ' + message6);
    await choisir('jsvGeste', 'CLOTURER');
    const avant6 = inventairesDuTest();
    await vues.cliquer(ad.p, 'journalsaisievente #jsvInventaire');
    await ad.p.waitForTimeout(2000);
    const m6 = await ad.p.evaluate(() => Ext.ComponentQuery.query('journalsaisievente #jsvMessage')[0].getEl().dom.textContent);
    ok('6. Filtre sans vente : « Aucun produit », rien n\'est créé', /Aucun produit/.test(m6) && inventairesDuTest() === avant6, m6);

    ok('7. Aucune erreur JavaScript', postes.every((s) => s.erreurs.length === 0), postes.map((s) => s.erreurs.join(' | ')).join(' || '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    for (const s of postes) { await Promise.race([s.b.close().catch(() => {}), new Promise((r) => setTimeout(r, 15000))]); }
    nettoyer();
    A.nettoyer();
    fs.rmSync(dossier, { recursive: true, force: true });
    ok('Nettoyage : ventes, lignes retirées, journal du test, inventaires, comptes retirés',
      q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + A.liste(ventes) + ")") === '0'
      && q('SELECT COUNT(*) FROM vente_journal_saisie WHERE id > ' + J0) === '0' && inventairesDuTest() === ''
      && q("SELECT COUNT(*) FROM t_user WHERE lg_USER_ID LIKE 'E2E-JS%'") === '0');
    process.exit(A.bilan() ? 1 : 0);
  }
})();
