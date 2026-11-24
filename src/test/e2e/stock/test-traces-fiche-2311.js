/* FICHE ARTICLE : QUI A FAIT QUOI (retours du 23/11, propositions 1 a 3).
 *
 * Defauts :
 *  1. la modification d'une fiche (libelle, prix, grossiste, seuils...) ne laissait aucune trace de son auteur ;
 *  2. la fiche n'avait pas d'historique : desactivation, suppression, recreation (cas R-LUME) restaient invisibles ;
 *  3. a la creation, rien ne signalait qu'une fiche supprimee ou desactivee avait deja le CIP ou l'EAN saisi : le
 *     produit etait recree et son historique restait sur l'ancienne fiche.
 *
 * Jeu d'essai (copies d'une vraie fiche, prefixe E2ETRC) :
 *  A  fiche supprimee, CIP_A, suppression au journal par le compte e2e ;
 *  B  fiche desactivee, EAN_B, desactivation au journal par un autre utilisateur ;
 *  C  fiche active creee hier, CIP_C ; une suppression au journal sur CIP_C datee d'il y a 30 jours (fiche precedente).
 * Par les clics (compte e2e, 1366×768) :
 *  1. « Créer un Article » : CIP_A saisi -> bandeau (CIP, nom, « supprimée le <jour> par <auteur> ») ; EAN_B -> seconde
 *     ligne (EAN, desactivee, autre auteur) ; CIP et EAN sans fiche inactive -> bandeau masque ; « Réactiver » : premier
 *     clic = confirmation dans le bouton (rien d'ecrit), second clic = fiche A active, une ligne d'activation, aucune
 *     fiche creee, fenetre fermee, A affichee dans la liste ;
 *  2. « Modifier » C : libelle et prix de vente changes -> une seule ligne de journal (auteur, champs avant -> apres) ;
 *     enregistrer sans rien changer -> aucune ligne de plus ;
 *  3. onglet « Historique » de C : rapprochement ecran = API = base (modification, champs, auteur), suppression de la
 *     fiche precedente signalee, creation presente, date sur une ligne.
 *  Bilan : toutes les donnees d'essai retirees (toutes les tables qui portent lg_FAMILLE_ID, journal, notifications).
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu } = require('../outils/vues');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 700) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '--raw'], { input: s, encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\r/g, '').replace(/\n$/, '');
const lignes = (s) => { const r = q(s); return r ? r.split('\n').map((l) => l.split('\t')) : []; };
const sql = (v) => "'" + String(v).replace(/\\/g, '\\\\').replace(/'/g, "''") + "'";

const M = 'E2ETRC';
const USER = q(`SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN}'`);
const AUTRE = q(`SELECT lg_USER_ID FROM t_user WHERE lg_USER_ID <> '${USER}' AND str_STATUT = 'enable' AND TRIM(CONCAT(IFNULL(str_FIRST_NAME,''),' ',IFNULL(str_LAST_NAME,''))) <> '' ORDER BY lg_USER_ID LIMIT 1`);
const nomDe = (u) => q(`SELECT TRIM(CONCAT(IFNULL(str_FIRST_NAME, ''), ' ', IFNULL(str_LAST_NAME, ''))) FROM t_user WHERE lg_USER_ID = '${u}'`);
const NOM_E2E = nomDe(USER);
const NOM_AUTRE = nomDe(AUTRE);
const MODELE = q(`SELECT f.lg_FAMILLE_ID FROM t_famille f WHERE f.str_STATUT = 'enable' AND f.bool_DECONDITIONNE = 0 AND IFNULL(f.bool_DECONDITIONNE_EXIST, 0) = 0
  AND (f.lg_FAMILLE_PARENT_ID IS NULL OR f.lg_FAMILLE_PARENT_ID = '') AND f.int_PRICE > 0 AND f.lg_FAMILLEARTICLE_ID IS NOT NULL
  AND f.lg_ZONE_GEO_ID IS NOT NULL AND f.lg_CODE_TVA_ID IS NOT NULL AND f.lg_GROSSISTE_ID IS NOT NULL
  AND EXISTS (SELECT 1 FROM t_famille_stock s WHERE s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1')
  AND EXISTS (SELECT 1 FROM t_famille_grossiste g WHERE g.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND g.lg_GROSSISTE_ID = f.lg_GROSSISTE_ID AND g.str_STATUT = 'enable')
  ORDER BY f.dt_UPDATED DESC LIMIT 1`);
const PRIX = Number(q(`SELECT int_PRICE FROM t_famille WHERE lg_FAMILLE_ID = '${MODELE}'`));
const SEUIL = Number(q(`SELECT IFNULL(int_SEUIL_MIN, 0) FROM t_famille WHERE lg_FAMILLE_ID = '${MODELE}'`));
const PRIX_TIPS = Number(q(`SELECT int_PRICE_TIPS FROM t_famille WHERE lg_FAMILLE_ID = '${MODELE}'`));

function cipLibre(prefixe, n) {
  for (let i = 0; i < 200; i++) {
    let c = prefixe;
    while (c.length < n) { c += Math.floor(Math.random() * 10); }
    const pris = q(`SELECT (SELECT COUNT(*) FROM t_famille WHERE int_CIP = '${c}' OR int_EAN13 = '${c}') + (SELECT COUNT(*) FROM t_famille_grossiste WHERE str_CODE_ARTICLE = '${c}')`);
    if (pris === '0') { return c; }
  }
  throw new Error('aucun code libre');
}
const CIP_A = cipLibre('97', 7);
const CIP_B = cipLibre('96', 7);
const EAN_B = cipLibre('2', 13);
const CIP_C = cipLibre('95', 7);
const CIP_D = cipLibre('93', 7);
const CIP_LIBRE = cipLibre('94', 7);
const EAN_LIBRE = cipLibre('3', 13);
const ID = { A: M + '-A', B: M + '-B', C: M + '-C', D: M + '-D' };
const NOM = { A: 'E2E TRACES ALPHA', B: 'E2E TRACES BRAVO', C: 'E2E TRACES CHARLIE', D: 'E2E TRACES DELTA' };
const REFS = [ID.A, ID.B, ID.C, ID.D, CIP_A, CIP_B, CIP_C, CIP_D, EAN_B].map(sql).join(',');
const TABLES = q(`SELECT GROUP_CONCAT(c.TABLE_NAME) FROM information_schema.COLUMNS c JOIN information_schema.TABLES t ON t.TABLE_SCHEMA = c.TABLE_SCHEMA AND t.TABLE_NAME = c.TABLE_NAME AND t.TABLE_TYPE = 'BASE TABLE'
  WHERE c.TABLE_SCHEMA = DATABASE() AND c.COLUMN_NAME = 'lg_FAMILLE_ID'`).split(',').filter((t) => t && t !== 't_famille');
const cle = (t) => q(`SELECT COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${t}' AND CONSTRAINT_NAME = 'PRIMARY'`);
const jour = (() => { const d = new Date(); return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear(); })();

function nettoyer() {
  q(`SET FOREIGN_KEY_CHECKS = 0;
     ${TABLES.map((t) => `DELETE FROM ${t} WHERE lg_FAMILLE_ID LIKE '${M}-%';`).join('\n')}
     DELETE FROM t_famille WHERE lg_FAMILLE_ID LIKE '${M}-%';
     DELETE FROM t_event_log WHERE lg_EVENT_LOG_ID LIKE '${M}-%' OR str_TYPE_LOG IN (${REFS});
     DELETE FROM notification WHERE entity_ref LIKE '${M}-%';
     SET FOREIGN_KEY_CHECKS = 1;`);
}
function restes() {
  const t = TABLES.map((x) => `(SELECT COUNT(*) FROM ${x} WHERE lg_FAMILLE_ID LIKE '${M}-%')`).join(' + ');
  return q(`SELECT CONCAT((SELECT COUNT(*) FROM t_famille WHERE lg_FAMILLE_ID LIKE '${M}-%' OR int_CIP IN (${REFS}) OR int_EAN13 IN (${REFS})), '/', ${t}, '/',
    (SELECT COUNT(*) FROM t_event_log WHERE lg_EVENT_LOG_ID LIKE '${M}-%' OR str_TYPE_LOG IN (${REFS})), '/', (SELECT COUNT(*) FROM notification WHERE entity_ref LIKE '${M}-%'))`);
}

function copier(cleFiche, cip, ean, statut, nom, creeIlYa, tableau) {
  let s = `DROP TEMPORARY TABLE IF EXISTS e2e_f; CREATE TEMPORARY TABLE e2e_f AS SELECT * FROM t_famille WHERE lg_FAMILLE_ID = '${MODELE}';
    UPDATE e2e_f SET lg_FAMILLE_ID = '${ID[cleFiche]}', int_CIP = '${cip}', int_EAN13 = ${ean ? sql(ean) : 'NULL'}, str_NAME = ${sql(nom)}, str_DESCRIPTION = ${sql(nom)},
      int_T = ${tableau === null ? 'NULL' : sql(tableau)}, str_STATUT = '${statut}', dt_CREATED = NOW() - INTERVAL ${creeIlYa} SECOND, dt_UPDATED = NOW(), bool_DECONDITIONNE_EXIST = 0;
    INSERT INTO t_famille SELECT * FROM e2e_f;\n`;
  for (const t of ['t_famille_stock', 't_famille_grossiste', 't_famille_zonegeo', 't_type_stock_famille']) {
    const k = cle(t);
    s += `DROP TEMPORARY TABLE IF EXISTS e2e_t; CREATE TEMPORARY TABLE e2e_t AS SELECT * FROM ${t} WHERE lg_FAMILLE_ID = '${MODELE}';
      UPDATE e2e_t SET ${k} = CONCAT('${ID[cleFiche]}-', RIGHT(${k}, 20)), lg_FAMILLE_ID = '${ID[cleFiche]}'${t === 't_famille_grossiste' ? `, str_CODE_ARTICLE = '${cip}'` : ''}${t === 't_famille_stock' || t === 't_famille_grossiste' ? `, str_STATUT = '${statut}'` : ''};
      INSERT INTO ${t} SELECT * FROM e2e_t;\n`;
  }
  return s;
}
function journal(cleLigne, user, type, ref, description) {
  return `INSERT INTO t_event_log (lg_EVENT_LOG_ID, lg_USER_ID, dt_CREATED, dt_UPDATED, str_STATUT, str_TABLE_CONCERN, typeLog, str_TYPE_LOG, str_DESCRIPTION)
    VALUES ('${M}-${cleLigne}', '${user}', NOW(), NOW(), 'enable', 'dal.TFamille', ${type}, '${ref}', ${sql(description + ' référence [' + ref + ' ]')});\n`;
}

function installer() {
  nettoyer();
  q(copier('A', CIP_A, null, 'delete', NOM.A, 86400 * 40, '') + copier('B', CIP_B, EAN_B, 'disable', NOM.B, 86400 * 40, '') + copier('C', CIP_C, null, 'enable', NOM.C, 86400, '') + copier('D', CIP_D, null, 'enable', NOM.D, 86400, null)
    + journal('JA', USER, 5, CIP_A, 'Suppression  du produit ' + CIP_A + ' ' + NOM.A + ' stock = 0, par ' + NOM_E2E)
    + journal('JB', AUTRE, 4, CIP_B, 'Désactivation  du produit ' + CIP_B + ' ' + NOM.B + ' stock = 0, par ' + NOM_AUTRE)
    + journal('JC', AUTRE, 5, CIP_C, 'Suppression  du produit ' + CIP_C + ' ANCIENNE FICHE stock = 0, par ' + NOM_AUTRE)
    /* le declencheur date la ligne a l'insertion : la suppression de la fiche precedente est reculee ensuite */
    + `UPDATE t_event_log SET dt_CREATED = NOW() - INTERVAL 30 DAY WHERE lg_EVENT_LOG_ID = '${M}-JC';`);
}

async function ouvrirFiche(p) {
  await ouvrirMenu(p, 'GESTION DU STOCK', 'Fiche Article');
  await p.waitForFunction(() => Ext.ComponentQuery.query('famillemanager')[0] && Ext.ComponentQuery.query('famillemanager')[0].rendered, null, { timeout: 60000 });
  await p.waitForTimeout(1500);
}
let etape = '';
async function rechercher(p, texte) {
  etape = 'recherche ' + texte;
  const champ = p.locator('input[placeholder="Recherche"]').filter({ visible: true }).first();
  await champ.click(); await p.keyboard.press('Control+A'); await p.keyboard.type(texte); await p.keyboard.press('Enter');
  await p.waitForFunction(() => { const s = Ext.ComponentQuery.query('famillemanager')[0].getStore(); return !s.isLoading() && s.getCount() > 0; }, null, { timeout: 60000 });
  await p.waitForTimeout(500);
}
const fenetre = (p, titre) => p.waitForFunction((t) => Ext.ComponentQuery.query('window').some((w) => w.isVisible() && new RegExp(t).test(w.title || '')), titre, { timeout: 60000 });
async function saisirChamp(p, nom, valeur) {
  const c = p.locator(`.x-window input[name="${nom}"]`).filter({ visible: true }).first();
  await c.click({ clickCount: 3 }); await p.keyboard.press('Control+A'); await p.keyboard.press('Backspace');
  if (valeur) { await p.keyboard.type(valeur); }
  await p.keyboard.press('Tab');
}
const bandeau = (p) => p.evaluate(() => Array.from(document.querySelectorAll('.fiche-inactive-texte')).filter((e) => e.offsetParent !== null).map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
async function attendreBandeau(p, n) {
  try {
    await p.waitForFunction((k) => Array.from(document.querySelectorAll('.fiche-inactive-texte')).filter((e) => e.offsetParent !== null).length === k, n, { timeout: 15000 });
    return true;
  } catch (e) { return false; }
}
const modifications = () => lignes(`SELECT e.lg_USER_ID, REPLACE(e.str_DETAIL, CHAR(10), '¶'), e.str_DESCRIPTION FROM t_event_log e WHERE e.str_TYPE_LOG = '${ID.C}' AND e.str_DESCRIPTION LIKE 'Modification de la fiche%' ORDER BY e.dt_CREATED`);
async function cliquerBoutonFenetre(p, titre, texte) {
  const id = await p.evaluate(([t, x]) => { const w = Ext.ComponentQuery.query('window').filter((v) => v.isVisible() && new RegExp(t).test(v.title || ''))[0];
    const b = w && w.query('button').filter((v) => v.text === x && v.isVisible(true))[0]; return b ? b.getId() : null; }, [titre, texte]);
  if (!id) { throw new Error('bouton absent : ' + texte); }
  await p.click('#' + id);
}
async function ouvrirModification(p, cip) {
  await rechercher(p, cip || CIP_C);
  etape = 'ouverture de la modification ' + (cip || CIP_C);
  await p.locator('.x-grid-row:visible').filter({ hasText: cip || CIP_C }).first().locator('.fa-action-edit').first().click();
  await fenetre(p, 'Modification Article');
  await p.waitForFunction(() => { const w = window.winModifArticleOuverte; return w && !w.isDestroyed && w.down('#int_CIP') && w.down('#int_CIP').getValue(); }, null, { timeout: 60000 });
  await p.waitForTimeout(1200);
}
async function enregistrerModification(p) {
  etape = 'enregistrement';
  const [rep] = await Promise.all([
    p.waitForResponse((r) => /fichearticle\/enregistrer\?mode=update/.test(r.url()), { timeout: 60000 }),
    cliquerBoutonFenetre(p, 'Modification Article', 'Enregistrer'),
  ]);
  const corps = await rep.text();
  etape = 'enregistrement, réponse ' + corps.slice(0, 300);
  await p.waitForFunction(() => !window.winModifArticleOuverte || window.winModifArticleOuverte.isDestroyed, null, { timeout: 30000 });
  await p.waitForTimeout(1500);
  return corps;
}

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  try {
    ok('Jeu d\'essai : deux utilisateurs, une fiche modèle complète', USER && AUTRE && NOM_E2E && NOM_AUTRE && NOM_E2E !== NOM_AUTRE && MODELE && PRIX > 0, [NOM_E2E, NOM_AUTRE, MODELE, PRIX].join(' / '));
    installer();
    ok('Jeu d\'essai : 3 fiches (supprimée, désactivée, active), 3 lignes de journal', q(`SELECT CONCAT(GROUP_CONCAT(str_STATUT ORDER BY lg_FAMILLE_ID), '/', (SELECT COUNT(*) FROM t_event_log WHERE lg_EVENT_LOG_ID LIKE '${M}-%')) FROM t_famille WHERE lg_FAMILLE_ID LIKE '${M}-%'`) === 'delete,disable,enable,enable/3');

    const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => err.push(e.message));
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirFiche(p);

    /* ---------- 1. creation : fiches inactives au meme CIP / EAN ---------- */
    await p.click('#btn_add');
    await fenetre(p, 'Ajouter Article');
    await p.waitForTimeout(1500);
    await saisirChamp(p, 'int_CIP', CIP_A);
    const vu1 = await attendreBandeau(p, 1);
    const t1 = await bandeau(p);
    ok('1. CIP d\'une fiche supprimée saisi : bandeau avec CIP, nom, « supprimée le ' + jour + ' par ' + NOM_E2E + ' »', vu1 && t1.length === 1
      && t1[0].includes('Une fiche supprimée a déjà ce CIP') && t1[0].includes(CIP_A + ' ' + NOM.A) && t1[0].includes('(supprimée le ' + jour + ' par ' + NOM_E2E + ')'), JSON.stringify(t1));
    await saisirChamp(p, 'int_EAN13', EAN_B);
    const vu2 = await attendreBandeau(p, 2);
    const t2 = await bandeau(p);
    ok('1. EAN d\'une fiche désactivée saisi en plus : seconde ligne (EAN, désactivée, autre auteur)', vu2 && t2.some((x) => x.includes('Une fiche désactivée a déjà ce EAN') && x.includes(CIP_B + ' ' + NOM.B) && x.includes('(désactivée le ' + jour + ' par ' + NOM_AUTRE + ')')), JSON.stringify(t2));
    /* ergonomie : chaque bouton « Réactiver » est visible, dans la fenetre, sans chevaucher son texte */
    const geo = await p.evaluate(() => {
      const w = window.winModifArticleOuverte.getEl().dom.getBoundingClientRect();
      return Array.from(document.querySelectorAll('.fiche-inactive-texte')).filter((e) => e.offsetParent !== null).map((e) => {
        const t = e.getBoundingClientRect(); const bt = e.parentElement.closest('.x-container').querySelector('.x-btn').getBoundingClientRect();
        return { dedans: bt.left >= w.left && bt.right <= w.right && bt.top >= w.top && bt.bottom <= w.bottom && t.left >= w.left, chevauche: t.right > bt.left + 1, haut: bt.height };
      });
    });
    ok('1. Ergonomie : boutons « Réactiver » dans la fenêtre, sans chevaucher le texte', geo.length === 2 && geo.every((x) => x.dedans && !x.chevauche && x.haut > 15), JSON.stringify(geo));
    await saisirChamp(p, 'int_CIP', CIP_LIBRE);
    await saisirChamp(p, 'int_EAN13', EAN_LIBRE);
    const masque = await attendreBandeau(p, 0);
    ok('1. CIP et EAN sans fiche inactive : bandeau masqué', masque, JSON.stringify(await bandeau(p)));
    await saisirChamp(p, 'int_EAN13', '');
    await saisirChamp(p, 'int_CIP', CIP_A);
    await attendreBandeau(p, 1);
    const activations = () => q(`SELECT COUNT(*) FROM t_event_log WHERE str_TYPE_LOG IN ('${CIP_A}', '${ID.A}') AND typeLog = 6`);
    let premier = false;
    try {
      const bouton = p.locator('.x-window .x-btn').filter({ hasText: 'Réactiver cette fiche' }).first();
      await bouton.click({ timeout: 10000 });
      await p.waitForTimeout(800);
      premier = (await p.locator('.x-window .x-btn').filter({ hasText: 'Confirmer la réactivation' }).count()) === 1;
    } catch (e) { premier = false; }
    ok('1. « Réactiver » : premier clic = confirmation dans le bouton, rien d\'écrit', premier && q(`SELECT str_STATUT FROM t_famille WHERE lg_FAMILLE_ID = '${ID.A}'`) === 'delete' && activations() === '0',
      premier + ' / ' + q(`SELECT str_STATUT FROM t_famille WHERE lg_FAMILLE_ID = '${ID.A}'`));
    let ferme = false;
    if (premier) {
      await p.locator('.x-window .x-btn').filter({ hasText: 'Confirmer la réactivation' }).first().click();
      try { await p.waitForFunction(() => !window.winModifArticleOuverte || window.winModifArticleOuverte.isDestroyed, null, { timeout: 30000 }); ferme = true; } catch (e) { ferme = false; }
      await p.waitForFunction(() => { const s = Ext.ComponentQuery.query('famillemanager')[0].getStore(); return !s.isLoading(); }, null, { timeout: 60000 });
      await p.waitForTimeout(800);
    }
    const etatA = lignes(`SELECT f.str_STATUT, (SELECT COUNT(*) FROM t_famille g WHERE g.int_CIP = '${CIP_A}'), (SELECT GROUP_CONCAT(DISTINCT s.str_STATUT) FROM t_famille_stock s WHERE s.lg_FAMILLE_ID = f.lg_FAMILLE_ID) FROM t_famille f WHERE f.lg_FAMILLE_ID = '${ID.A}'`)[0] || [];
    const actA = lignes(`SELECT lg_USER_ID, typeLog FROM t_event_log WHERE str_TYPE_LOG IN ('${CIP_A}', '${ID.A}') AND typeLog = 6`);
    ok('1. Second clic : fiche A active (fiche et stock), une seule fiche à ce CIP (aucune créée), fenêtre fermée', ferme && etatA[0] === 'enable' && etatA[1] === '1' && etatA[2] === 'enable', JSON.stringify([ferme, etatA]));
    ok('1. Bilan : une seule ligne de réactivation au journal, au nom du compte e2e', actA.length === 1 && actA[0][0] === USER, JSON.stringify(actA));
    const dansListe = await p.evaluate((i) => Ext.ComponentQuery.query('famillemanager')[0].getStore().findExact('lg_FAMILLE_ID', i) >= 0, ID.A);
    ok('1. Fiche réactivée affichée dans la liste (recherche sur son CIP)', dansListe);

    /* sans reactivation (ancien code), la fenetre de creation est refermee par « Retour » : rien n'est cree */
    if (await p.evaluate(() => !!window.winModifArticleOuverte && !window.winModifArticleOuverte.isDestroyed)) {
      await cliquerBoutonFenetre(p, 'Ajouter Article', 'Retour');
      await p.waitForTimeout(800);
    }

    /* ---------- 2. modification : une trace par enregistrement qui change quelque chose ---------- */
    await ouvrirModification(p);
    const nouveauPrix = PRIX + 250;
    await saisirChamp(p, 'str_DESCRIPTION', NOM.C + ' MODIF');
    await saisirChamp(p, 'int_PRICE', String(nouveauPrix));
    await saisirChamp(p, 'int_STOCK_REAPROVISONEMENT', String(SEUIL + 1));
    await enregistrerModification(p);
    const m1 = modifications();
    const detail = m1.length ? m1[0][1].split('¶') : [];
    const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    /* le formulaire recopie le prix de vente dans le prix TIPS a la frappe (comportement de la fiche) : trace des que l'ancien TIPS differe */
    const attendus = ['Libellé : avant ' + NOM.C + ' → après ' + NOM.C + ' MODIF', 'Désignation : avant ' + NOM.C + ' → après ' + NOM.C + ' MODIF',
      'Prix de vente : avant ' + fmt(PRIX) + ' → après ' + fmt(nouveauPrix)];
    if (PRIX_TIPS !== nouveauPrix) { attendus.splice(3, 0, 'Prix TIPS : avant ' + fmt(PRIX_TIPS) + ' → après ' + fmt(nouveauPrix)); }
    attendus.push('Seuil de réapprovisionnement : avant ' + fmt(SEUIL) + ' → après ' + fmt(SEUIL + 1));
    ok('2. Une seule ligne de journal pour l\'enregistrement, au nom du compte e2e', m1.length === 1 && m1[0][0] === USER, JSON.stringify(m1));
    ok('2. Détail : libellé, désignation, prix de vente et seuil, avant → après', attendus.every((a) => detail.includes(a)), JSON.stringify(detail));
    ok('2. Détail : aucun autre champ (le formulaire ne réécrit pas la fiche en silence)', detail.length === attendus.length, JSON.stringify(detail.filter((d) => !attendus.includes(d))));
    ok('2. Description lisible : CIP, nouveau nom, auteur, champs', m1.length === 1 && m1[0][2] === 'Modification de la fiche ' + CIP_C + ' ' + NOM.C + ' MODIF par ' + NOM_E2E + ' : libellé, désignation, prix de vente' + (PRIX_TIPS !== PRIX + 250 ? ', prix tips' : '') + ', seuil de réapprovisionnement', m1.length && m1[0][2]);
    ok('2. Base : nom, prix et seuil enregistrés', q(`SELECT CONCAT(str_NAME, '|', int_PRICE, '|', int_SEUIL_MIN) FROM t_famille WHERE lg_FAMILLE_ID = '${ID.C}'`) === NOM.C + ' MODIF|' + nouveauPrix + '|' + (SEUIL + 1));
    await ouvrirModification(p);
    await enregistrerModification(p);
    ok('2. Enregistrer sans rien changer : aucune ligne de plus', modifications().length === 1, modifications().length);

    /* ---------- 2 bis. fiche dont le « Tableau » est vide en base (NULL) : la modification passait en erreur ---------- */
    await ouvrirModification(p, CIP_D);
    const repD = await enregistrerModification(p).catch((e) => 'échec : ' + etape);
    ok('2 bis. Fiche au « Tableau » vide en base : enregistrement accepté, fenêtre fermée', /"success":"1"/.test(repD), repD);
    if (await p.evaluate(() => !!window.winModifArticleOuverte && !window.winModifArticleOuverte.isDestroyed)) {
      await p.evaluate(() => Ext.MessageBox.hide());
      await cliquerBoutonFenetre(p, 'Modification Article', 'Retour');
      await p.waitForTimeout(800);
    }

    /* ---------- 3. onglet « Historique » ---------- */
    await ouvrirModification(p);
    let onglet = false;
    try { await p.locator('.x-window .x-tab').filter({ hasText: 'Historique' }).first().click({ timeout: 10000 }); onglet = true; } catch (e) { onglet = false; }
    ok('3. Onglet « Historique » dans la fiche en modification', onglet);
    let ecran = [];
    if (onglet) {
      await p.waitForFunction(() => { const g = window.winModifArticleOuverte.down('#historiqueFiche'); return g && g.getStore().getCount() > 0; }, null, { timeout: 30000 });
      await p.waitForTimeout(600);
      ecran = await p.evaluate(() => Array.from(window.winModifArticleOuverte.down('#historiqueFiche').getEl().dom.querySelectorAll('.x-grid-row')).map((r) => {
        const c = Array.from(r.querySelectorAll('td'));
        /* lignes occupees par le texte de la date (noeuds texte seuls, pas le cadre de la cellule) */
        const tops = new Set(); const w = document.createTreeWalker(c[0], NodeFilter.SHOW_TEXT);
        for (let n = w.nextNode(); n; n = w.nextNode()) { if (n.textContent.trim()) { const range = document.createRange(); range.selectNodeContents(n); Array.from(range.getClientRects()).forEach((x) => tops.add(Math.round(x.top))); } }
        return { le: c[0].textContent.trim(), lignesDate: tops.size, action: c[1].textContent.trim(),
          auteur: c[2].textContent.trim(), champs: Array.from(c[3].querySelectorAll('.histo-champ')).map((d) => d.textContent.replace(/\s+/g, ' ').trim()),
          quoi: c[3].textContent.replace(/\s+/g, ' ').trim(), fiche: c[4].textContent.trim() };
      }));
    }
    etape = "API de l'historique";
    let api = {};
    try { api = JSON.parse(await (await ctx.request.get((process.env.BASE || 'http://localhost:8080/prestige') + '/api/v1/fichearticle/historique/' + ID.C)).text()); } catch (e) { api = {}; }
    const modif = ecran.find((x) => x.action === 'Modification de la fiche');
    ok('3. Rapprochement écran = base : la modification, son auteur et ses champs', modif && modif.auteur === NOM_E2E && attendus.every((a) => modif.champs.includes(a.replace(' : avant ', ' : ').replace(' → après ', ' → '))) && modif.champs.length === attendus.length,
      JSON.stringify(modif));
    ok('3. Rapprochement écran = API : mêmes lignes, même ordre', api.success && api.data.length === ecran.length && api.data.every((d, i) => d.le === ecran[i].le && d.action === ecran[i].action && d.fiche === ecran[i].fiche && (d.auteur || 'inconnu') === ecran[i].auteur),
      JSON.stringify(api.data && api.data.map((d) => d.action)) + ' / ' + JSON.stringify(ecran.map((x) => x.action)));
    const prec = ecran.find((x) => x.action === 'Suppression');
    ok('3. Suppression de la fiche précédente au même CIP : signalée, avec son auteur', prec && prec.fiche === 'fiche précédente (même CIP)' && prec.auteur === NOM_AUTRE, JSON.stringify(prec));
    ok('3. Création de la fiche présente, à sa date', ecran.some((x) => x.action === 'Création' && x.fiche === 'cette fiche'), JSON.stringify(ecran.map((x) => x.action + ' ' + x.le)));
    ok('3. Ergonomie : la date de chaque ligne tient sur une ligne', ecran.length >= 3 && ecran.every((x) => x.lignesDate === 1), JSON.stringify(ecran.map((x) => x.lignesDate)));
    ok('3. Ordre : de la plus récente à la plus ancienne', ecran.length >= 3 && ecran[0].action === 'Modification de la fiche' && ecran[ecran.length - 1].action === 'Suppression', JSON.stringify(ecran.map((x) => x.action)));
    await cliquerBoutonFenetre(p, 'Modification Article', 'Retour').catch(() => {});
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
    await ctx.close();
  } catch (e) {
    ok('Parcours sans exception', false, etape + ' : ' + e.message);
  } finally {
    nettoyer();
    ok('Bilan : données d\'essai retirées (fiches, tables liées, journal, notifications)', restes() === '0/0/0/0', restes());
    await b.close();
    const n = res.filter((r) => r.c).length;
    console.log(n + '/' + res.length + ' OK');
    process.exit(n === res.length ? 0 : 1);
  }
})();
