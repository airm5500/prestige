/* FICHE TIERS PAYANT : un enregistrement sans modification ne doit rien reecrire (demande du 15/11).
 *
 * Defaut constate (test du point 4 du plan du 14/11) : ouvrir la fiche d'un tiers payant et cliquer sur
 * « Enregistrer » sans rien toucher reecrivait sept colonnes : code paiement (remplace par le code comptable), delai de
 * paiement (NULL -> 0), code bordereau (-> valeur du modele), nombre de bons et montant de facture (-1 -> 0), bons par
 * page (0 -> 20) et police (0 -> 7).
 *
 * Par l'ecran (GESTION DES TIERS-PAYANTS > Tiers-payants > Modifier > Enregistrer), sur trois organismes mis dans des
 * etats varies (valeurs nulles, -1, 0, valeurs reglees, code bordereau ancien) :
 *  - bilan : sans modification, la ligne t_tiers_payant et le compte client sont identiques, colonne par colonne (seule
 *    la date de mise a jour bouge) ; une trace d'evenement par enregistrement ;
 *  - modification reelle (delai, bons par page, nombre de bons ; puis police et modele de facture) : exactement les
 *    colonnes modifiees changent, ni plus ni moins ;
 *  - rapprochement : la fiche rouverte relit les valeurs de la base, et la liste les porte aussi.
 * Nettoyage : lignes remises a l'identique, traces du test retirees.
 *
 * node src/test/e2e/tierspayant/test-fiche-tp-sans-modification-1511.js
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const { execFileSync } = require('child_process');

const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' })
  .replace(/\r/g, '').trim();
const ligne = (table, where) => {
  const t = execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-B', '--raw', '-e', 'SELECT * FROM ' + table + ' WHERE ' + where], { encoding: 'utf8' })
    .replace(/\r/g, '').split('\n').filter((x) => x !== '');
  if (t.length < 2) { return null; }
  const cols = t[0].split('\t'), vals = t[1].split('\t'), o = {};
  cols.forEach((c, i) => { o[c] = vals[i]; });
  return o;
};
const sql = (v) => (v === 'NULL' || v === undefined ? 'NULL' : "'" + String(v).replace(/\\/g, '\\\\').replace(/'/g, "''") + "'");
const res = [];
function ok(n, c, d) { res.push(!!c); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 600) + ']' : '')); }

const U = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
/* colonnes que tout enregistrement met a jour, par construction */
const DATES = ['dt_UPDATED', 'dt_effective'];

/* trois organismes actifs avec compte client, au nom simple (recherche par l'ecran), modele de facture actif */
const TPS = q("SELECT GROUP_CONCAT(CONCAT_WS('|', t.lg_TIERS_PAYANT_ID, t.str_NAME) ORDER BY t.str_NAME SEPARATOR ';') FROM (SELECT t.* FROM t_tiers_payant t"
  + " JOIN t_compte_client c ON c.P_KEY = t.lg_TIERS_PAYANT_ID JOIN t_model_facture m ON m.lg_MODEL_FACTURE_ID = t.lg_MODEL_FACTURE_ID AND m.str_STATUT = 'enable'"
  + " WHERE t.str_STATUT = 'enable' AND t.str_NAME REGEXP '^[A-Z]{4,}( [A-Z]+)?$'"
  + " AND (SELECT COUNT(*) FROM t_tiers_payant x WHERE x.str_NAME = t.str_NAME) = 1 GROUP BY t.lg_TIERS_PAYANT_ID ORDER BY t.dt_CREATED DESC LIMIT 3) t")
  .split(';').filter(Boolean).map((x) => { const [id, nom] = x.split('|'); return { id, nom }; });
const MODELE_AUTRE = (id) => q("SELECT m.str_VALUE FROM t_model_facture m WHERE m.str_STATUT = 'enable' AND m.lg_MODEL_FACTURE_ID <> (SELECT lg_MODEL_FACTURE_ID FROM t_tiers_payant WHERE lg_TIERS_PAYANT_ID = '" + id + "')"
  + " AND m.str_VALUE IS NOT NULL AND m.str_VALUE <> '' ORDER BY m.str_VALUE LIMIT 1");
const fiche = (id) => ligne('t_tiers_payant', "lg_TIERS_PAYANT_ID = '" + id + "'");
const compte = (id) => ligne('t_compte_client', "P_KEY = '" + id + "'");
const AVANT = TPS.map((t) => ({ tp: fiche(t.id), cc: compte(t.id) }));

/* etats varies, poses en base avant le passage par l'ecran */
const ETATS = [
  { dt_DELAI_PAIEMENT: null, int_NBREBONS: -1, int_MONTANTFAC: -1, int_NB_BONS_PAR_PAGE: 0, int_TAILLE_POLICE: 0, str_CODE_PAIEMENT: null, str_CODE_EDIT_BORDEREAU: 'ANCIEN' },
  { dt_DELAI_PAIEMENT: 45, int_NBREBONS: 12, int_MONTANTFAC: 150000, int_NB_BONS_PAR_PAGE: 25, int_TAILLE_POLICE: 9, str_CODE_PAIEMENT: 'VIR-E2E', str_CODE_EDIT_BORDEREAU: null },
  { dt_DELAI_PAIEMENT: 0, int_NBREBONS: 0, int_MONTANTFAC: null, int_NB_BONS_PAR_PAGE: 0, int_TAILLE_POLICE: 8, str_CODE_PAIEMENT: '', str_CODE_EDIT_BORDEREAU: '' }
];
const poserEtat = (id, e) => q('UPDATE t_tiers_payant SET ' + Object.keys(e).map((c) => '`' + c + '` = ' + (e[c] === null ? 'NULL' : sql(e[c]))).join(', ')
  + ", str_CODE_COMPTABLE = '41100000' WHERE lg_TIERS_PAYANT_ID = '" + id + "'");
const traces = () => Number(q("SELECT COUNT(*) FROM t_event_log WHERE lg_USER_ID = '" + U + "' AND dt_CREATED >= '" + DEBUT + "' AND str_TABLE_CONCERN = 't_tiers_payant'"));
const ecarts = (a, b) => Object.keys(a).filter((c) => DATES.indexOf(c) < 0 && a[c] !== b[c]).map((c) => c + ' ' + a[c] + ' -> ' + b[c]);

function nettoyer() {
  TPS.forEach((t, i) => {
    const tp = AVANT[i].tp, cc = AVANT[i].cc;
    q('UPDATE t_tiers_payant SET ' + Object.keys(tp).filter((c) => c !== 'lg_TIERS_PAYANT_ID').map((c) => '`' + c + '` = ' + sql(tp[c])).join(', ') + " WHERE lg_TIERS_PAYANT_ID = '" + t.id + "'");
    if (cc) { q('UPDATE t_compte_client SET ' + Object.keys(cc).filter((c) => c !== 'lg_COMPTE_CLIENT_ID').map((c) => '`' + c + '` = ' + sql(cc[c])).join(', ') + " WHERE lg_COMPTE_CLIENT_ID = '" + cc.lg_COMPTE_CLIENT_ID + "'"); }
  });
  q("DELETE FROM t_event_log WHERE lg_USER_ID = '" + U + "' AND dt_CREATED >= '" + DEBUT + "'");
}

(async () => {
  ok('Préparation : trois organismes actifs avec compte client', TPS.length === 3 && AVANT.every((a) => a.tp && a.cc), TPS.map((t) => t.nom).join(', '));
  if (TPS.length < 3) { process.exit(1); }
  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } });
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  await p.route('**/api/v1/support/events', (r) => (r.request().method() === 'POST' ? r.fulfill({ status: 200, body: '{}' }) : r.continue()));
  const fermerVolet = () => p.mouse.click(1550, 870);
  const message = async (bouton) => {
    const fin = Date.now() + 30000; let t = '';
    while (Date.now() < fin) { t = await vues.texteMessage(p); if (t && !/patienter|cours de traitement/i.test(t)) { break; } t = ''; await p.waitForTimeout(250); }
    if (t && bouton) { await vues.repondre(p, bouton).catch(() => {}); await p.waitForTimeout(400); }
    return t.replace(/\s+/g, ' ');
  };
  let ecranOuvert = false;
  const chercher = async (tp) => {
    if (!ecranOuvert) {
      await vues.ouvrirMenu(p, 'GESTION DES TIERS-PAYANTS', 'Tiers-payants');
      await fermerVolet();
      await p.waitForFunction(() => Ext.getCmp('rechecher') && Ext.getCmp('rechecher').isVisible(true), null, { timeout: 60000 });
      ecranOuvert = true;
    }
    await vues.saisir(p, '#rechecher', tp.nom);
    await p.locator('.x-panel .x-btn').filter({ visible: true }).filter({ hasText: /^\s*rechercher\s*$/ }).first().click();
    await p.waitForFunction((id) => { const g = Ext.ComponentQuery.query('tierspayantmanager')[0]; const s = g && g.getStore(); return s && !s.isLoading() && s.findExact('lg_TIERS_PAYANT_ID', id) >= 0; }, tp.id, { timeout: 30000 });
  };
  const ouvrirFiche = async (tp) => {
    await chercher(tp);
    /* la liste peut se recharger juste apres (chargement initial de l'ecran) : la ligne est reprise a chaque essai */
    for (let essai = 0; ; essai++) {
      await p.waitForTimeout(600);
      await p.waitForFunction((id) => { const s = Ext.ComponentQuery.query('tierspayantmanager')[0].getStore(); return !s.isLoading() && s.findExact('lg_TIERS_PAYANT_ID', id) >= 0; }, tp.id, { timeout: 30000 });
      const noeud = await p.evaluate((id) => { const g = Ext.ComponentQuery.query('tierspayantmanager')[0]; return g.getView().getNode(g.getStore().findExact('lg_TIERS_PAYANT_ID', id)).id; }, tp.id);
      try { await p.locator('#' + noeud + ' img[data-qtip="Modifier"]').first().click({ timeout: 5000 }); break; } catch (e) { if (essai >= 3) { throw e; } }
    }
    await p.waitForFunction(() => Ext.getCmp('str_MAIL') && Ext.getCmp('int_TAILLE_POLICE') && Ext.getCmp('str_MAIL').getValue() !== undefined, null, { timeout: 30000 });
    await p.waitForTimeout(1000);
  };
  /* onglet qui porte un champ, montre comme le ferait l'utilisateur */
  const montrer = async (champ) => {
    const onglet = await p.evaluate((c) => { const f = Ext.getCmp(c); const t = f.up('tabpanel'); if (!t) { return null; }
      const pan = t.items.items.find((x) => x.contains && x.contains(f)); return pan && pan.tab ? pan.tab.getId() : null; }, champ);
    if (onglet) { await p.click('#' + onglet); await p.waitForTimeout(300); }
  };
  const enregistrer = async () => { await p.locator('.x-window .x-btn').filter({ visible: true }).filter({ hasText: /^\s*Enregistrer\s*$/ }).first().click(); return message('ok'); };
  const fermerFiche = async () => { await p.evaluate(() => Ext.ComponentQuery.query('window').filter((w) => w.isVisible(true) && w.down && w.down('#str_MAIL')).forEach((w) => w.close())); };
  const valeursFiche = () => p.evaluate(() => { const v = (i) => Ext.getCmp(i).getValue(); return { delai: v('dt_DELAI_PAIEMENT'), codePaiement: v('str_CODE_PAIEMENT'), bons: v('int_NB_BONS_PAR_PAGE'),
    police: v('int_TAILLE_POLICE'), bordereau: v('str_CODE_EDIT_BORDEREAU'), nbrbons: v('nbrbons'), montant: v('montantFact') }; });
  const ligneListe = (id) => p.evaluate((i) => { const s = Ext.ComponentQuery.query('tierspayantmanager')[0].getStore(); const r = s.getAt(s.findExact('lg_TIERS_PAYANT_ID', i)); return r ? r.raw : null; }, id);

  try {
    TPS.forEach((t, i) => poserEtat(t.id, ETATS[i]));
    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');

    /* 1. sans modification : rien n'est reecrit */
    for (let i = 0; i < TPS.length; i++) {
      const t = TPS[i], ref = fiche(t.id), refCc = compte(t.id), tr = traces();
      await ouvrirFiche(t);
      const m = await enregistrer();
      await fermerFiche();
      const apres = fiche(t.id), apresCc = compte(t.id);
      ok('Sans modification (' + t.nom + ', état ' + (i + 1) + ') : ligne du tiers payant identique, colonne par colonne', ecarts(ref, apres).length === 0,
        (ecarts(ref, apres).join(' ; ') || 'aucun écart') + ' | ' + m);
      ok('Sans modification (' + t.nom + ') : compte client identique ; une trace d\'enregistrement', ecarts(refCc, apresCc).length === 0 && traces() === tr + 1,
        (ecarts(refCc, apresCc).join(' ; ') || 'aucun écart') + ' | traces +' + (traces() - tr));
    }

    /* 2. modification reelle, organisme 1 : delai, bons par page, nombre de bons a facturer ; rien d'autre ne bouge
       (le code paiement est dans une zone masquee de la fiche : l'utilisateur ne peut pas le saisir) */
    const t1 = TPS[0], ref1 = fiche(t1.id);
    await ouvrirFiche(t1);
    await montrer('dt_DELAI_PAIEMENT');
    await vues.saisir(p, '#dt_DELAI_PAIEMENT', '30');
    await montrer('nbrbons');
    await vues.saisir(p, '#nbrbons', '8');
    await montrer('int_NB_BONS_PAR_PAGE');
    await vues.saisir(p, '#int_NB_BONS_PAR_PAGE', '15');
    await enregistrer();
    await fermerFiche();
    const apres1 = fiche(t1.id);
    const attendu1 = { dt_DELAI_PAIEMENT: '30', int_NBREBONS: '8', int_NB_BONS_PAR_PAGE: '15' };
    const diff1 = ecarts(ref1, apres1), cols1 = Object.keys(ref1).filter((c) => DATES.indexOf(c) < 0 && ref1[c] !== apres1[c]);
    ok('Modification (délai 30, 8 bons à facturer, 15 bons par page) : exactement ces trois colonnes changent',
      cols1.sort().join(',') === Object.keys(attendu1).sort().join(',') && Object.keys(attendu1).every((c) => apres1[c] === attendu1[c]), diff1.join(' ; '));
    /* rapprochement : fiche rouverte = base = liste */
    await ouvrirFiche(t1);
    const f1 = await valeursFiche(), l1 = await ligneListe(t1.id);
    await fermerFiche();
    ok('Rapprochement : fiche rouverte = base = liste (délai, bons à facturer, bons par page)',
      String(f1.delai) === '30' && Number(f1.nbrbons) === 8 && Number(f1.bons) === 15
      && String(l1.dt_DELAI_PAIEMENT) === '30' && Number(l1.nbrbons) === 8 && Number(l1.int_NB_BONS_PAR_PAGE) === 15, JSON.stringify(f1) + ' | ' + JSON.stringify(l1 && { d: l1.dt_DELAI_PAIEMENT, n: l1.nbrbons, b: l1.int_NB_BONS_PAR_PAGE }));

    /* 3. modification reelle, organisme 2 : police et modele de facture ; le code bordereau suit le modele */
    const t2 = TPS[1], ref2 = fiche(t2.id), autre = MODELE_AUTRE(t2.id);
    const idAutre = q("SELECT lg_MODEL_FACTURE_ID FROM t_model_facture WHERE str_VALUE = '" + autre + "' AND str_STATUT = 'enable' LIMIT 1");
    await ouvrirFiche(t2);
    await montrer('int_TAILLE_POLICE');
    await vues.choisir(p, '#int_TAILLE_POLICE', '11 points');
    await montrer('str_CODE_EDIT_BORDEREAU');
    await vues.choisir(p, '#str_CODE_EDIT_BORDEREAU', autre);
    await enregistrer();
    await fermerFiche();
    const apres2 = fiche(t2.id);
    const attendu2 = { int_TAILLE_POLICE: '11', lg_MODEL_FACTURE_ID: idAutre, str_CODE_EDIT_BORDEREAU: autre };
    const cols2 = Object.keys(ref2).filter((c) => DATES.indexOf(c) < 0 && ref2[c] !== apres2[c]);
    ok('Modification (police 11, modèle ' + autre + ') : police, modèle et code bordereau changent, rien d\'autre',
      !!autre && cols2.sort().join(',') === Object.keys(attendu2).sort().join(',') && Object.keys(attendu2).every((c) => apres2[c] === attendu2[c]), ecarts(ref2, apres2).join(' ; '));

    /* 4. les memes fiches, enregistrees une seconde fois sans modification : toujours rien */
    for (const t of [t1, t2]) {
      const ref = fiche(t.id);
      await ouvrirFiche(t);
      await enregistrer();
      await fermerFiche();
      ok('Second enregistrement sans modification (' + t.nom + ') : rien ne change', ecarts(ref, fiche(t.id)).length === 0, ecarts(ref, fiche(t.id)).join(' ; ') || 'aucun écart');
    }
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Déroulement', false, e.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Nettoyage : lignes remises à l\'identique, traces retirées', TPS.every((t, i) => ecarts(AVANT[i].tp, fiche(t.id)).length === 0 && fiche(t.id).dt_UPDATED === AVANT[i].tp.dt_UPDATED)
      && traces() === 0, '');
    const n = res.filter(Boolean).length;
    console.log(n + '/' + res.length + (n === res.length ? ' OK' : ' ÉCHEC'));
    process.exit(n === res.length ? 0 : 1);
  }
})();
