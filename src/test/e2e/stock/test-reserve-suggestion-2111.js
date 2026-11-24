/* GESTION DES RESERVES, SUGGESTIONS (plan du 21/11, point 13).
 *
 * Par de vrais clics, avec un profil d'essai et un produit mis en reserve (rayon 5, reserve 30, seuil 20, mini 8),
 * tous remis a la fin :
 *  - motif par defaut selon le sens, dans les trois autres facons de creer une suggestion : fleches par ligne (vers
 *    le rayon et vers la reserve), « Faire un reappro … (manuel) » et « Voir les suggestions de reappro … », sur les
 *    deux sens ; creation par la fleche sans toucher au motif : en base, le motif journalier du sens ;
 *  - annulation : fleche de retour rouge (plus de ⏪) ; premier clic = halo rouge et « Cliquez encore pour
 *    confirmer », rien ne bouge ; sans second clic, la demande retombe au bout de 5 s ; second clic = annulation,
 *    sans aucune fenetre ; motif saisi dans la barre repris sur le mouvement inverse ;
 *  - colonnes : une seule colonne « Actions » (ouvrir, inventaire, imprimer, controle, annulation), suppression a
 *    part ; aucun defilement horizontal sur TOUT, REAPPRO, REASSORT et SUGGESTIONS en 1366, 1280 et 1920 px ;
 *  - info-bulle bleue au survol des donnees de la suggestion (motif, reference, sens).
 * Bilan : une suggestion creee (motif, sens, quantite) ; traitement puis annulation : stock rayon / reserve revenus a
 * l'identique, un mouvement et un seul mouvement inverse (quantite, utilisateur, motif), suggestion « ANNULEE ».
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer, saisir } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', '--raw', BASE, '-sN', '-e', s], { encoding: 'utf8' }).replace(/\r\n/g, '\n').trim();
const MDP = 'E2e-R13-2111';
const P = { id: 'E2E-R13', login: 'e2e-r13', com: 'E2E-R13',
  droits: ['P_M_GESTION_STOCK', 'P_SM_RESERVE', 'P_TRAITER_RESERVE', 'P_RESERVE_SUGGESTION', 'P_ANNULER_MOUVEMENT_RESERVE'] };
const MOTIFS = {};
q('SELECT id, libelle FROM motif_suggestion_reserve').split('\n').filter(Boolean).forEach((l) => { const [i, lib] = l.split('\t'); MOTIFS[lib] = i; });
const J_RAYON = 'Reappro rayon journalier', J_RESERVE = 'Reappro reserve journalier';
const ACTIFS_AVANT = q('SELECT GROUP_CONCAT(CONCAT(id, ":", actif) ORDER BY id) FROM motif_suggestion_reserve');
const QTE = 4, MOTIF_ANNUL = 'E2E-R13 erreur de rayon';

const PRODUIT = q("SELECT s.lg_FAMILLE_ID FROM t_famille_stock s JOIN t_type_stock_famille r ON r.lg_FAMILLE_ID = s.lg_FAMILLE_ID AND r.lg_EMPLACEMENT_ID = '1' AND r.lg_TYPE_STOCK_ID = '1'"
  + " JOIN t_famille f ON f.lg_FAMILLE_ID = s.lg_FAMILLE_ID"
  + " WHERE s.lg_EMPLACEMENT_ID = '1' AND s.str_STATUT = 'enable' AND f.str_STATUT = 'enable' AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 AND f.int_CIP IS NOT NULL AND LENGTH(f.int_CIP) >= 5"
  + " AND NOT EXISTS (SELECT 1 FROM t_type_stock_famille v WHERE v.lg_FAMILLE_ID = s.lg_FAMILLE_ID AND v.lg_TYPE_STOCK_ID = '2')"
  + " AND NOT EXISTS (SELECT 1 FROM t_suggestion_reserve_detail d WHERE d.lg_FAMILLE_ID = s.lg_FAMILLE_ID)"
  + " AND NOT EXISTS (SELECT 1 FROM t_mouvement_reserve m WHERE m.lg_FAMILLE_ID = s.lg_FAMILLE_ID)"
  + " AND (SELECT COUNT(*) FROM t_famille_stock x WHERE x.lg_FAMILLE_ID = s.lg_FAMILLE_ID AND x.lg_EMPLACEMENT_ID = '1') = 1"
  + " AND (SELECT COUNT(*) FROM t_famille g WHERE g.int_CIP = f.int_CIP) = 1"
  + " ORDER BY s.lg_FAMILLE_ID LIMIT 1 OFFSET 23");
const LIRE = () => q("SELECT CONCAT_WS('|', s.int_NUMBER_AVAILABLE, s.int_NUMBER, r.int_NUMBER, IFNULL(f.bool_RESERVE, 'NULL'), IFNULL(f.int_SEUIL_RESERVE, 'NULL'), IFNULL(f.int_SEUIL_MINI_RAYON, 'NULL'), f.int_CIP)"
  + " FROM t_famille_stock s JOIN t_type_stock_famille r ON r.lg_FAMILLE_ID = s.lg_FAMILLE_ID AND r.lg_EMPLACEMENT_ID = '1' AND r.lg_TYPE_STOCK_ID = '1'"
  + " JOIN t_famille f ON f.lg_FAMILLE_ID = s.lg_FAMILLE_ID WHERE s.lg_FAMILLE_ID = '" + PRODUIT + "' AND s.lg_EMPLACEMENT_ID = '1'");
const AVANT = PRODUIT ? LIRE().split('|') : [];
const STOCK = () => q("SELECT CONCAT_WS('|', s.int_NUMBER_AVAILABLE, r.int_NUMBER, IFNULL((SELECT int_NUMBER FROM t_type_stock_famille WHERE lg_TYPE_STOCK_FAMILLE_ID = 'E2E-R13-T'), 'X'))"
  + " FROM t_famille_stock s JOIN t_type_stock_famille r ON r.lg_FAMILLE_ID = s.lg_FAMILLE_ID AND r.lg_EMPLACEMENT_ID = '1' AND r.lg_TYPE_STOCK_ID = '1'"
  + " WHERE s.lg_FAMILLE_ID = '" + PRODUIT + "' AND s.lg_EMPLACEMENT_ID = '1'");
const NB_SUGG_AVANT = q('SELECT COUNT(*) FROM t_suggestion_reserve');

function remettre() {
  q("DELETE FROM t_mouvement_reserve WHERE lg_FAMILLE_ID = '" + PRODUIT + "' AND lg_USER_ID = '" + P.id + "'");
  q("DELETE FROM t_type_stock_famille WHERE lg_TYPE_STOCK_FAMILLE_ID = 'E2E-R13-T'");
  ACTIFS_AVANT.split(',').forEach((x) => { const [i, a] = x.split(':'); q('UPDATE motif_suggestion_reserve SET actif = ' + a + ' WHERE id = ' + i); });
  if (AVANT.length !== 7) { return; }
  q("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = " + AVANT[0] + ", int_NUMBER = " + AVANT[1] + " WHERE lg_FAMILLE_ID = '" + PRODUIT + "' AND lg_EMPLACEMENT_ID = '1';"
    + " UPDATE t_type_stock_famille SET int_NUMBER = " + AVANT[2] + " WHERE lg_FAMILLE_ID = '" + PRODUIT + "' AND lg_EMPLACEMENT_ID = '1' AND lg_TYPE_STOCK_ID = '1';"
    + " UPDATE t_famille SET bool_RESERVE = " + AVANT[3] + ", int_SEUIL_RESERVE = " + AVANT[4] + ", int_SEUIL_MINI_RAYON = " + AVANT[5] + " WHERE lg_FAMILLE_ID = '" + PRODUIT + "'");
}
function poser() {
  remettre();
  q("UPDATE t_famille SET bool_RESERVE = 1, int_SEUIL_RESERVE = 20, int_SEUIL_MINI_RAYON = 8 WHERE lg_FAMILLE_ID = '" + PRODUIT + "';"
    + " UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = 5, int_NUMBER = 5 WHERE lg_FAMILLE_ID = '" + PRODUIT + "' AND lg_EMPLACEMENT_ID = '1';"
    + " UPDATE t_type_stock_famille SET int_NUMBER = 5 WHERE lg_FAMILLE_ID = '" + PRODUIT + "' AND lg_EMPLACEMENT_ID = '1' AND lg_TYPE_STOCK_ID = '1';"
    + " INSERT INTO t_type_stock_famille (lg_TYPE_STOCK_FAMILLE_ID, lg_FAMILLE_ID, lg_TYPE_STOCK_ID, lg_EMPLACEMENT_ID, str_NAME, str_DESCRIPTION, dt_CREATED, dt_UPDATED, str_STATUT, int_NUMBER)"
    + " VALUES ('E2E-R13-T', '" + PRODUIT + "', '2', '1', 'E2E', 'E2E', NOW(), NOW(), 'enable', 30)");
}
function nettoyer() {
  q("DELETE d FROM t_suggestion_reserve_detail d JOIN t_suggestion_reserve s ON s.lg_SUGGESTION_RESERVE_ID = d.lg_SUGGESTION_RESERVE_ID WHERE (s.str_COMMENTAIRE LIKE 'E2E-R13%' OR s.lg_USER_CREATEUR_ID = '" + P.id + "');"
    + " DELETE FROM t_suggestion_reserve WHERE (str_COMMENTAIRE LIKE 'E2E-R13%' OR lg_USER_CREATEUR_ID = '" + P.id + "');"
    + " DELETE FROM t_preference_utilisateur WHERE lg_USER_ID = '" + P.id + "';"
    + " DELETE FROM t_role_privelege WHERE lg_ROLE_ID = '" + P.id + "'; DELETE FROM t_role_user WHERE lg_USER_ID = '" + P.id + "';"
    + " DELETE FROM t_role WHERE lg_ROLE_ID = '" + P.id + "'; DELETE FROM t_event_log WHERE lg_USER_ID = '" + P.id + "';"
    + " DELETE FROM t_employe WHERE lg_USER_ID = '" + P.id + "'; DELETE FROM t_user WHERE lg_USER_ID = '" + P.id + "';");
}
function creerProfil() {
  q("INSERT INTO t_role (lg_ROLE_ID, str_NAME, str_DESIGNATION, str_TYPE, str_STATUT, dt_CREATED) VALUES ('" + P.id + "', '" + P.id + "', '" + P.id + "', 'CUSTOMER', 'enable', NOW())");
  P.droits.forEach((d, i) => q("INSERT INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED)"
    + " SELECT '" + P.id + '-' + i + "', '" + P.id + "', lg_PRIVELEGE_ID, NOW() FROM t_privilege WHERE str_NAME = '" + d + "' ORDER BY str_STATUT = 'enable' DESC LIMIT 1"));
  q("INSERT INTO t_user (lg_USER_ID, str_LOGIN, str_PASSWORD, str_FIRST_NAME, str_LAST_NAME, str_FUNCTION, str_STATUT, lg_EMPLACEMENT_ID, dt_CREATED, int_CONNEXION)"
    + " VALUES ('" + P.id + "', '" + P.login + "', MD5('" + MDP + "'), 'E2E', '" + P.id + "', 'Magasinier', 'enable', '1', NOW(), 0)");
  q("INSERT INTO t_role_user (lg_USER_ROLE_ID, lg_ROLE_ID, lg_USER_ID, dt_CREATED) VALUES ('" + P.id + "', '" + P.id + "', '" + P.id + "', NOW())");
}

(async () => {
  nettoyer();
  if (!PRODUIT || AVANT.length !== 7 || !MOTIFS[J_RAYON] || !MOTIFS[J_RESERVE]) {
    console.log('FAIL  Précondition : un produit géré en rayon et les motifs journaliers  [' + PRODUIT + ' ; ' + JSON.stringify(MOTIFS) + ']'); process.exit(1);
  }
  q('UPDATE motif_suggestion_reserve SET actif = 1 WHERE id IN (' + MOTIFS[J_RAYON] + ',' + MOTIFS[J_RESERVE] + ')');
  poser();
  creerProfil();
  const CIP = AVANT[6];
  const b = await ENV_E2E.lancer(chromium);
  const erreurs = [], dialogues = [];
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  p.on('pageerror', (e) => erreurs.push(e.message));
  p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });

  /* fenetre ouverte : attend la liste des motifs chargee, puis lit le motif affiche (texte du champ) */
  const motifDe = async (itemId) => {
    /* recherche par itemId sur tout le registre (une fenetre en cours de construction fait echouer « window combo[...] ») */
    await p.waitForFunction((i) => { try { return Ext.ComponentManager.all.getArray().some((c) => c.itemId === i && !c.isDestroyed && c.rendered && c.isVisible(true)
      && !c.getStore().isLoading() && c.getStore().getCount() > 0); } catch (e) { return false; } }, itemId, { timeout: 15000 });
    await p.waitForTimeout(600);
    return p.evaluate((i) => { const c = Ext.ComponentManager.all.getArray().filter((x) => x.itemId === i && !x.isDestroyed && x.rendered && x.isVisible(true))[0];
      return c ? (c.inputEl.dom.value || '') : null; }, itemId);
  };
  const fermerFenetre = async () => {
    await p.locator('.x-window').filter({ visible: true }).last().locator('.x-tool-close').first().click();
    await p.waitForTimeout(500);
  };
  const onglet = async (titre) => {
    await p.locator('.x-tab').filter({ visible: true, hasText: titre }).first().click();
    await p.waitForFunction(() => { const g = Ext.getCmp('reservemanagerID').getActiveTab(); return g && g.getStore && !g.getStore().isLoading(); }, null, { timeout: 60000 });
    await p.waitForTimeout(900);
  };
  const grille = () => p.evaluate(() => Ext.getCmp('reservemanagerID').getActiveTab().getId());
  const chercherProduit = async () => {
    const g = await grille();
    await cliquer(p, '#' + g + ' textfield[itemId=rechFld]');
    await p.keyboard.press('Control+A'); await p.keyboard.type(CIP); await p.keyboard.press('Enter');
    await p.waitForFunction(([gr, f]) => { const s = Ext.getCmp(gr).getStore(); return !s.isLoading() && s.findExact('lg_FAMILLE_ID', f) >= 0; }, [g, PRODUIT], { timeout: 30000 });
    await p.waitForTimeout(500);
    return g;
  };
  /* clic sur l'icone d'une ligne (par l'image affichee) */
  const icone = async (g, f, src) => {
    const id = await p.evaluate(([gr, fam, s]) => { const grid = Ext.getCmp(gr), i = grid.getStore().findExact('lg_FAMILLE_ID', fam);
      const img = [...grid.getView().getNode(i).querySelectorAll('img')].find((x) => x.src.indexOf(s) >= 0 && x.offsetParent);
      if (!img) { return null; } img.id = img.id || ('e2e-ic-' + Date.now()); return img.id; }, [g, f, src]);
    if (id) { await p.click('#' + id); }
    return !!id;
  };
  const deborde = () => p.evaluate(() => { const g = Ext.getCmp('reservemanagerID').getActiveTab(), v = g.getView().getEl().dom; return { vue: v.clientWidth, contenu: v.scrollWidth }; });

  try {
    await connexion(p, P.login, MDP);
    const libelles = await p.evaluate(() => { let r = null; Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().cascadeBy((n) => {
      if (n.get('id') === 'reservemanager') { r = [n.parentNode.get('text'), n.get('text')]; return false; } }); return r; });
    const texte = (h) => String(h).replace(/<[^>]*>/g, '').trim();
    await ouvrirMenu(p, texte(libelles[0]), texte(libelles[1]));
    await p.waitForFunction(() => { const m = Ext.getCmp('reservemanagerID'); const g = m && m.down('reservegrid'); return g && g.rendered && !g.getStore().isLoading(); }, null, { timeout: 60000 });
    await p.waitForTimeout(800);

    /* ---------------- largeurs : aucun defilement horizontal */
    for (const [l, h] of [[1366, 768], [1280, 720], [1920, 1080]]) {
      await p.setViewportSize({ width: l, height: h }); await p.waitForTimeout(600);
      const mesures = [];
      for (const t of ['TOUT', 'REAPPRO RESERVE', 'REASSORT RAYON', 'SUGGESTIONS']) {
        await onglet(t);
        mesures.push([t, await deborde()]);
      }
      ok(`${l}×${h} : TOUT, REAPPRO, REASSORT et SUGGESTIONS sans défilement horizontal`, mesures.every(([, m]) => m.contenu <= m.vue), JSON.stringify(mesures));
    }
    await p.setViewportSize({ width: 1366, height: 768 }); await p.waitForTimeout(600);

    /* ---------------- motif par defaut : fleches par ligne (onglet TOUT) */
    await onglet('TOUT');
    let g = await chercherProduit();
    ok('Flèche orange (vers la réserve) affichée sur la ligne', await icone(g, PRODUIT, 'fleche_orange_droite'));
    ok('Flèche par ligne, vers la réserve : motif « ' + J_RESERVE + ' » d\'office', await motifDe('cboMotifLigne') === J_RESERVE);
    await fermerFenetre();
    ok('Flèche verte (vers le rayon) affichée sur la ligne', await icone(g, PRODUIT, 'fleche_verte_gauche'));
    const mLigne = await motifDe('cboMotifLigne');
    ok('Flèche par ligne, vers le rayon : motif « ' + J_RAYON + ' » d\'office', mLigne === J_RAYON, mLigne);
    await saisir(p, 'textfield[name=int_NUMBER_REASSORT]', String(QTE));
    await saisir(p, 'textfield[itemId=txtComLigne]', P.com);
    const stock0 = STOCK();
    await cliquer(p, 'button[text=Creer la suggestion]');
    await p.waitForFunction(() => { try { return !Ext.ComponentManager.all.getArray().some((x) => x.itemId === 'cboMotifLigne' && !x.isDestroyed && x.rendered && x.isVisible(true)); } catch (e) { return false; } }, null, { timeout: 20000 }).catch(() => {});
    await p.waitForTimeout(1200);
    const cree = q("SELECT CONCAT_WS('|', s.lg_SUGGESTION_RESERVE_ID, s.str_CATEGORIE, IFNULL(s.motif_id, 'NULL'), s.str_STATUT, d.lg_FAMILLE_ID, d.int_QTE_RETENUE) FROM t_suggestion_reserve s"
      + " JOIN t_suggestion_reserve_detail d ON d.lg_SUGGESTION_RESERVE_ID = s.lg_SUGGESTION_RESERVE_ID WHERE s.str_COMMENTAIRE = '" + P.com + "'").split('|');
    const SID = cree[0];
    ok('Création sans toucher au motif : en base, une suggestion RAYON au motif journalier, ' + QTE + ' unités du produit, à traiter',
      cree.length === 6 && cree[1] === 'RAYON' && cree[2] === MOTIFS[J_RAYON] && cree[3] === 'A_TRAITER' && cree[4] === PRODUIT && cree[5] === String(QTE), cree.join('|'));
    ok('Création : le stock ne bouge pas tant que la suggestion n\'est pas traitée', STOCK() === stock0, stock0 + ' -> ' + STOCK());

    /* ---------------- traitement par l'ecran : la suggestion creee s'ouvre, « Traiter la suggestion » */
    await p.waitForFunction(() => { try { return Ext.ComponentManager.all.getArray().some((x) => x.isXType && x.isXType('button') && x.text === 'Traiter la suggestion' && !x.isDestroyed && x.rendered && x.isVisible(true)); } catch (e) { return false; } }, null, { timeout: 30000 });
    await p.waitForTimeout(800);
    const statut = () => q("SELECT str_STATUT FROM t_suggestion_reserve WHERE lg_SUGGESTION_RESERVE_ID = '" + SID + "'");
    for (let i = 0; i < 2 && statut() !== 'TRAITEE'; i++) {
      await cliquer(p, 'button[text=Traiter la suggestion]');
      /* confirmation existante de l'ecran : « Traiter 1 ligne(s) ? Le stock sera deplace. » -> Oui */
      const oui = p.locator('.x-message-box .x-btn').filter({ visible: true, hasText: /^\s*Oui\s*$/ }).first();
      await oui.waitFor({ state: 'visible', timeout: 10000 }).then(() => oui.click()).catch(() => {});
      for (let k = 0; k < 20 && statut() !== 'TRAITEE'; k++) { await p.waitForTimeout(400); }
    }
    const stockTraite = STOCK();
    ok('« Traiter la suggestion » : rayon 5 + ' + QTE + ', réserve 30 − ' + QTE + ', un mouvement, suggestion traitée', stockTraite === (5 + QTE) + '|' + (5 + QTE) + '|' + (30 - QTE)
      && q("SELECT COUNT(*) FROM t_mouvement_reserve WHERE lg_FAMILLE_ID = '" + PRODUIT + "'") === '1' && statut() === 'TRAITEE', stockTraite + ' ' + statut());
    /* le traitement ouvre le compte rendu par-dessus la fenetre de la suggestion : « Fermer » sur chacune, de la plus haute a la plus basse */
    for (let i = 0; i < 3; i++) {
      const id = await p.evaluate(() => { const ws = Ext.ComponentManager.all.getArray().filter((x) => x.isXType && x.isXType('window') && !x.isXType('messagebox')
          && !x.isXType('tooltip') && !x.isDestroyed && x.rendered && x.isVisible());
        ws.sort((a, c) => Number(c.getEl().getStyle('z-index')) - Number(a.getEl().getStyle('z-index')));
        return ws.length ? ws[0].getId() : null; });
      if (!id) { break; }
      await p.locator('#' + id + ' .x-btn').filter({ visible: true, hasText: /^\s*Fermer\s*$/ }).last().click();
      await p.waitForTimeout(800);
    }

    /* ---------------- motif par defaut : reappro manuel et « Voir les suggestions », dans les deux sens */
    const cas = [['REAPPRO RESERVE', 'Faire un reappro de la reserve (manuel)', 'cboMotifReappro', J_RESERVE],
      ['REAPPRO RESERVE', 'Voir les suggestions de reappro de la reserve', 'cboMotif', J_RESERVE],
      ['REASSORT RAYON', 'Faire un reappro manuel du rayon', 'cboMotifReappro', J_RAYON],
      ['REASSORT RAYON', 'Voir les suggestions de reappro du rayon', 'cboMotif', J_RAYON]];
    for (const [t, bouton, champ, attendu] of cas) {
      await onglet(t);
      g = await grille();
      await cliquer(p, '#' + g + ' button[text=' + bouton + ']');
      const m = await motifDe(champ);
      ok(`${t}, « ${bouton} » : motif « ${attendu} » d'office`, m === attendu, m);
      await fermerFenetre();
    }

    /* ---------------- annulation par l'icone, onglet SUGGESTIONS */
    await onglet('SUGGESTIONS');
    await p.waitForFunction(() => { const t = Ext.getCmp('reservemanagerID').getActiveTab(); const f = t && t.isXType('reservesuggestionsgrid') && t.down('#fSearch');
      return !!(f && f.rendered && f.isVisible(true)); }, null, { timeout: 30000 });
    g = await grille();
    const idRecherche = await p.evaluate(() => Ext.getCmp('reservemanagerID').getActiveTab().down('#fSearch').inputEl.dom.id);
    await p.click('#' + idRecherche);
    await p.keyboard.press('Control+A'); await p.keyboard.type(CIP); await p.keyboard.press('Enter');
    await p.waitForFunction(([gr, id]) => { const s = Ext.getCmp(gr).getStore(); return !s.isLoading() && s.findExact('lg_SUGGESTION_RESERVE_ID', id) >= 0; }, [g, SID], { timeout: 30000 });
    await p.waitForTimeout(800);
    const cols = await p.evaluate((gr) => { const grid = Ext.getCmp(gr), ac = grid.headerCt.getGridColumns().filter((c) => c.xtype === 'actioncolumn');
      return ac.map((c) => ({ titre: c.text, n: (c.items || []).length, icones: (c.items || []).map((it) => String(it.icon || '').split('/').pop()) })); }, g);
    ok('Une seule colonne « Actions » (ouvrir, inventaire, imprimer, contrôle, annulation), la suppression à part', cols.length === 2 && cols[0].titre === 'Actions' && cols[0].n === 5
      && cols[0].icones[4] === 'annuler_mouvement.svg' && !JSON.stringify(cols).includes('control_rewind'), JSON.stringify(cols));
    /* info-bulle bleue au survol du motif */
    const cellule = await p.evaluate(([gr, id]) => { const grid = Ext.getCmp(gr), i = grid.getStore().findExact('lg_SUGGESTION_RESERVE_ID', id);
      const col = grid.headerCt.getGridColumns().find((c) => c.dataIndex === 'motif_libelle'); const td = grid.getView().getCell(i, col);
      td.dom.id = td.dom.id || 'e2e-motif'; return td.dom.id; }, [g, SID]);
    await p.hover('#' + cellule); await p.waitForTimeout(1300);
    const bulle = await p.evaluate(() => { const t = [...document.querySelectorAll('.x-tip')].find((x) => x.offsetParent); const s = t && t.querySelector('.x-tip-body b');
      return t ? { texte: t.textContent, fond: getComputedStyle(t).backgroundColor, couleur: s ? getComputedStyle(s).color : '' } : null; });
    ok('Survol du motif : info-bulle bleue du thème (fond bleu, texte blanc) avec le motif', !!bulle && bulle.texte.indexOf(J_RAYON) >= 0
      && bulle.fond === 'rgb(30, 95, 168)' && bulle.couleur === 'rgb(255, 255, 255)', JSON.stringify(bulle));
    await p.mouse.move(5, 5); await p.waitForTimeout(400);

    const etatIcone = () => p.evaluate(([gr, id]) => { const grid = Ext.getCmp(gr), i = grid.getStore().findExact('lg_SUGGESTION_RESERVE_ID', id);
      if (i < 0) { return { absente: true }; }
      const img = grid.getView().getNode(i).querySelector('img.sugg-annuler'); if (!img) { return { cachee: true }; }
      img.id = img.id || 'e2e-annuler'; return { id: img.id, rouge: img.classList.contains('sugg-annuler-confirmer'), src: img.src.split('/').pop(), bulle: img.getAttribute('data-qtip') || '' }; }, [g, SID]);
    let ic = await etatIcone();
    ok('Suggestion traitée : flèche de retour rouge « annuler le mouvement »', ic.id && ic.src === 'annuler_mouvement.svg' && !ic.rouge && /Annuler le mouvement/.test(ic.bulle), JSON.stringify(ic));
    await p.click('#' + await p.evaluate(() => Ext.getCmp('reservemanagerID').getActiveTab().down('#fMotifSuppression').inputEl.dom.id));
    await p.keyboard.type(MOTIF_ANNUL);
    await p.click('#' + ic.id);
    await p.waitForTimeout(700);
    ic = await etatIcone();
    const boite = await p.evaluate(() => Ext.ComponentManager.all.getArray().filter((w) => (w.isXType && w.isXType('window')) && !w.isDestroyed && w.rendered && w.isVisible()).map((w) => w.title));
    ok('Premier clic : halo rouge et « Cliquez encore pour confirmer » sur l\'icône, aucune fenêtre, rien ne bouge', ic.rouge && /Cliquez encore pour confirmer/.test(ic.bulle)
      && boite.length === 0 && STOCK() === stockTraite && q("SELECT str_STATUT FROM t_suggestion_reserve WHERE lg_SUGGESTION_RESERVE_ID = '" + SID + "'") === 'TRAITEE', JSON.stringify({ ic, boite }));
    await p.waitForTimeout(5300);
    ic = await etatIcone();
    ok('Sans second clic, la demande de confirmation retombe au bout de 5 s (rien n\'est annulé)', !ic.rouge && STOCK() === stockTraite, JSON.stringify(ic));
    await p.click('#' + ic.id); await p.waitForTimeout(700);
    ic = await etatIcone();
    await p.click('#' + ic.id);
    await p.waitForFunction(([gr, id]) => { const s = Ext.getCmp(gr).getStore(); const r = s.findRecord('lg_SUGGESTION_RESERVE_ID', id, 0, false, true, true); return !s.isLoading() && r && r.get('str_STATUT') === 'ANNULEE'; }, [g, SID], { timeout: 20000 }).catch(() => {});
    await p.waitForTimeout(600);
    const apres = STOCK();
    const mvts = q("SELECT CONCAT_WS('|', str_TYPE, int_QTE, lg_USER_ID, IFNULL(lg_MOUVEMENT_SOURCE_ID, '-'), IFNULL(str_MOTIF_ANNULATION, '-'), DATE(dt_CREATED) = CURDATE()) FROM t_mouvement_reserve"
      + " WHERE lg_FAMILLE_ID = '" + PRODUIT + "' ORDER BY dt_CREATED, lg_MOUVEMENT_SOURCE_ID IS NOT NULL").split('\n');
    const inverse = mvts.filter((x) => x.split('|')[3] !== '-');
    ok('Second clic : annulation, stock rayon / réserve revenus à l\'identique (5 / 30)', apres === '5|5|30', stockTraite + ' -> ' + apres);
    ok('Un seul mouvement inverse : quantité ' + QTE + ', à l\'utilisateur, du jour, avec le motif saisi dans la barre', mvts.length === 2 && inverse.length === 1
      && inverse[0].split('|')[1] === String(QTE) && inverse[0].split('|')[2] === P.id && inverse[0].split('|')[4] === MOTIF_ANNUL && inverse[0].split('|')[5] === '1', mvts.join(' ; '));
    const etatS = q("SELECT CONCAT_WS('|', s.str_STATUT, d.str_ETAT, d.str_MOTIF_LIGNE) FROM t_suggestion_reserve s JOIN t_suggestion_reserve_detail d ON d.lg_SUGGESTION_RESERVE_ID = s.lg_SUGGESTION_RESERVE_ID WHERE s.lg_SUGGESTION_RESERVE_ID = '" + SID + "'");
    ok('Suggestion « ANNULEE », ligne annulée avec le motif ; à l\'écran, plus d\'icône d\'annulation', /^ANNULEE\|ANNULEE\|.*E2E-R13 erreur de rayon/.test(etatS) && (await etatIcone()).cachee === true, etatS);
    const toast = await p.evaluate(() => Ext.getCmp('reservemanagerID').down('reservesuggestionsgrid').dernierBilanAnnulation || '');
    ok('Résultat affiché sans fenêtre (message qui disparaît seul)', toast.length > 0 && (await p.evaluate(() => Ext.ComponentQuery.query('messagebox').filter((w) => w.isVisible()).length)) === 0, toast);

    ok('Bilan : une seule suggestion créée pendant tout le parcours', Number(q('SELECT COUNT(*) FROM t_suggestion_reserve')) === Number(NB_SUGG_AVANT) + 1, q('SELECT COUNT(*) FROM t_suggestion_reserve') + ' contre ' + NB_SUGG_AVANT);
    ok('Aucune erreur JavaScript, aucune fenêtre du navigateur', erreurs.length === 0 && dialogues.length === 0, erreurs.concat(dialogues).join(' | '));
  } catch (x) {
    await p.screenshot({ path: (ENV_E2E.TMP || '.') + '/reserve-suggestion-2111-echec.png' }).catch(() => {});
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
    nettoyer();
    remettre();
    ok('Jeu d\'essai retiré (profil, suggestion, mouvements, réserve du produit)', q("SELECT (SELECT COUNT(*) FROM t_user WHERE lg_USER_ID = 'E2E-R13') + (SELECT COUNT(*) FROM t_role WHERE lg_ROLE_ID = 'E2E-R13')"
      + " + (SELECT COUNT(*) FROM t_suggestion_reserve WHERE str_COMMENTAIRE LIKE 'E2E-R13%') + (SELECT COUNT(*) FROM t_type_stock_famille WHERE lg_TYPE_STOCK_FAMILLE_ID = 'E2E-R13-T')"
      + " + (SELECT COUNT(*) FROM t_mouvement_reserve WHERE lg_FAMILLE_ID = '" + PRODUIT + "')") === '0' && q('SELECT COUNT(*) FROM t_suggestion_reserve') === NB_SUGG_AVANT);
    ok('Produit et motifs remis comme avant', LIRE() === AVANT.join('|') && q('SELECT GROUP_CONCAT(CONCAT(id, ":", actif) ORDER BY id) FROM motif_suggestion_reserve') === ACTIFS_AVANT, LIRE());
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
