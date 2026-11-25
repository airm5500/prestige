/* VENTES EN SAISIE : PROFIL QUI VEND SEULEMENT EN DÉPÔT (cahier des charges du 24/11, point 2 ; non-régression).
 *
 * Défaut trouvé le 24/11 en relisant les profils des copies d'officine : la migration V2203 donne « mettre en
 * attente » et « reprendre une vente en attente » aux profils qui ont l'écran de vente (P_SM_CLOTURER_CAISSE) ou de
 * vente en dépôt (P_SM_VENTEDEPOT), mais pas à ceux qui vendent seulement par l'onglet de vente de « Gestion dépôts
 * extensions » (P_VENTE_DEPOT_EXTENSION). Profils réels concernés : « Gestion du stock » (appaul), « Chargé Commande et
 * Stock » (laborex_v1_db). Avant la mise à jour, ils mettaient leurs ventes en attente et les rappelaient : refus
 * « droit manquant » après, donc régression.
 *
 * Le profil d'essai est créé AVANT la migration (comme en officine), avec les droits réels d'un profil de caisse moins
 * l'écran de vente, la vente en dépôt et les deux droits d'attente. La migration est ensuite jouée comme Flyway le fera
 * (fichiers V7.6.41.2204 et suivants qui existent ; aucun sur l'ancien code).
 *
 *  1. Base : le profil « dépôt seul » reçoit les deux droits, une fois ; le profil sans vente en dépôt ne reçoit rien ;
 *     rejouée, la migration n'ajoute rien.
 *  2. Écran : vente dans l'onglet de vente du dépôt, « Retour » > « Mettre en attente et quitter » : EN_ATTENTE.
 *  3. Écran : rappel par la fenêtre « Ventes en attente » de l'écran dépôt : la vente s'ouvre, EN_COURS, mêmes lignes.
 *  4. Journal exact (début, attente, rappel), aucun refus ; stock du dépôt et de l'officine inchangés.
 * Tout est retiré à la fin.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const C = require('../ligne-comptant/commun');
const { chromium, A, vues, ok, q, exec } = C;
const ENV_E2E = A.ENV_E2E;

const MDP = 'E2e-Saisie-9';
const ROLE_CAISSE = q("SELECT lg_ROLE_ID FROM t_role WHERE str_NAME = 'Caisse/Commande/Stock'");
const ROLE_DEPOT = 'E2E-PD-ROLE';
const ROLE_SANS_VENTE = 'E2E-PD-ROLE2';
const RETIRES = "'P_SM_CLOTURER_CAISSE', 'P_SM_VENTEDEPOT', 'P_VENTE_METTRE_EN_ATTENTE', 'P_VENTE_REPRENDRE_ATTENTE'";
const DROITS = "'P_VENTE_METTRE_EN_ATTENTE', 'P_VENTE_REPRENDRE_ATTENTE'";
const J0 = Number(q('SELECT IFNULL(MAX(id), 0) FROM vente_journal_saisie'));
const DEPOT = 'E2E-PD-DEPOT';
const STOCK_DEPOT = 30;
const P1 = C.produitSimple(7);
const CIP1 = C.cip(P1);
const STOCK0 = A.stock(P1);
const MIGRATIONS = path.join(__dirname, '..', '..', '..', 'main', 'resources', 'db', 'migration');
const ventes = [];

const etat = (id) => q("SELECT CONCAT_WS('|', IFNULL(etat_saisie, '-'), IFNULL(saisie_session, '-'), IFNULL(lg_EMPLACEMENT_VENTE_ID, '-'))"
  + " FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + id + "'").split('|');
const journal = (id) => q("SELECT IFNULL(GROUP_CONCAT(CONCAT_WS('/', geste, admis, IFNULL(etat_apres, '-'), IFNULL(utilisateur_id, 'SERVEUR')) ORDER BY id SEPARATOR ' ; '), '')"
  + " FROM vente_journal_saisie WHERE id > " + J0 + " AND vente_id = '" + id + "'");
const droitsDe = (role) => q("SELECT IFNULL(GROUP_CONCAT(p.str_NAME ORDER BY p.str_NAME), '') FROM t_role_privelege rp JOIN t_privilege p ON p.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID"
  + " WHERE rp.lg_ROLE_ID = '" + role + "' AND p.str_NAME IN (" + DROITS + ")");
const nbAttributions = () => Number(q("SELECT COUNT(*) FROM t_role_privelege rp JOIN t_privilege p ON p.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID WHERE p.str_NAME IN (" + DROITS + ")"));
const attendre = async (p, f, delai, pas) => { const fin = Date.now() + delai; let v; while (Date.now() < fin) { v = f(); if (v) { return v; } await p.waitForTimeout(pas || 1000); } return f(); };
const stockDepot = () => Number(q("SELECT IFNULL(MAX(int_NUMBER_AVAILABLE), -1) FROM t_famille_stock WHERE lg_FAMILLE_ID = '" + P1.id + "' AND lg_EMPLACEMENT_ID = '" + DEPOT + "'"));
const ref = (id) => q("SELECT str_REF FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + id + "'");
const nbLignes = (id) => q("SELECT COUNT(*) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + id + "'");

/* migrations de rattrapage des droits de ce plan, postérieures à V2203 : jouées comme Flyway, dans l'ordre */
const rattrapages = () => fs.readdirSync(MIGRATIONS).filter((f) => /^V7\.6\.41\.(\d+)__.*\.sql$/.test(f) && Number(f.match(/^V7\.6\.41\.(\d+)/)[1]) > 2203
  && /droits_attente/.test(f)).sort();
const jouer = (f) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE],
  { input: fs.readFileSync(path.join(MIGRATIONS, f), 'utf8'), encoding: 'utf8' });

function nettoyer() {
  const v = A.liste(ventes);
  q("DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + " DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + " DELETE FROM vente_suppression WHERE vente_id IN (" + v + ");"
    + " DELETE FROM vente_journal_saisie WHERE id > " + J0 + ";"
    + " DELETE FROM t_famille_stock WHERE lg_FAMILLE_STOCK_ID = 'E2E-PD-STK';"
    + " DELETE FROM reference WHERE emplacement_id = '" + DEPOT + "';"
    + " DELETE FROM t_emplacement WHERE lg_EMPLACEMENT_ID = '" + DEPOT + "';"
    + " DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID LIKE 'E2E-PD%';"
    + " DELETE FROM t_role_user WHERE lg_USER_ID LIKE 'E2E-PD%';"
    + " DELETE FROM t_event_log WHERE lg_USER_ID LIKE 'E2E-PD%';"
    + " DELETE FROM t_user WHERE lg_USER_ID LIKE 'E2E-PD%';"
    + " DELETE FROM t_role_privelege WHERE lg_ROLE_ID IN ('" + ROLE_DEPOT + "', '" + ROLE_SANS_VENTE + "');"
    + " DELETE FROM t_role WHERE lg_ROLE_ID IN ('" + ROLE_DEPOT + "', '" + ROLE_SANS_VENTE + "')");
}

function creerRole(id, nom, retires) {
  q("INSERT INTO t_role (lg_ROLE_ID, str_NAME, str_DESIGNATION, str_STATUT, dt_CREATED) VALUES ('" + id + "', '" + id + "', '" + nom + "', 'enable', NOW())");
  q("INSERT INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED, dt_UPDATED) SELECT LEFT(CONCAT('E2E-PD-', UUID()), 40), '" + id + "', rp.lg_PRIVILEGE_ID, NOW(), NOW()"
    + " FROM t_role_privelege rp JOIN t_privilege p ON p.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID WHERE rp.lg_ROLE_ID = '" + ROLE_CAISSE + "'"
    + " AND p.str_NAME NOT IN (" + retires + ")");
}

async function ouvrirDepot(p) {
  await C.ouvrirEcran(p, 'depotextension');
  await C.visible(p, 'depotextension #depotEcran');
  await p.evaluate(() => { Ext.ComponentQuery.query('depotextension #depotEcran')[0].getStore().load(); });
  await p.waitForFunction((d) => Ext.ComponentQuery.query('depotextension #depotEcran')[0].getStore().findRecord('id', d), DEPOT, { timeout: 20000 });
  await p.evaluate((d) => { const c = Ext.ComponentQuery.query('depotextension #depotEcran')[0]; const r = c.getStore().findRecord('id', d);
    c.setValue(d); c.fireEvent('select', c, [r]); }, DEPOT);
  await p.waitForTimeout(800);
  await p.evaluate(() => { const o = Ext.ComponentQuery.query('depotextension #onglets')[0]; o.setActiveTab(o.down('#ongletVente')); });
  await p.waitForFunction((d) => { const c = Ext.ComponentQuery.query('depotextension doventeendepot #depotVente')[0]; return c && c.getValue() === d; }, DEPOT, { timeout: 20000 });
  await p.waitForTimeout(1500);
}
async function taperArticleDepot(p, cipProduit) {
  const champ = 'doventeendepot #contenu #produitContainer [xtype=fieldcontainer] #produit';
  await C.visible(p, champ);
  await vues.cliquer(p, champ);
  await p.keyboard.press('Control+A');
  await p.keyboard.type(cipProduit, { delay: 15 });
  const rep = p.waitForResponse((r) => /\/vente\/add\/(item|vno)/.test(r.url()), { timeout: 60000 });
  await p.keyboard.press('Enter');
  await rep;
  await p.waitForTimeout(1500);
}
const couranteDepot = (p) => p.evaluate(() => { const v = testextjs.app.getController('VenteEnDepotCtr').current; return v ? v.lgPREENREGISTREMENTID : null; });
const BARRE_D = 'doventeendepot #contenu [xtype=toolbar] #';

(async () => {
  nettoyer();
  creerRole(ROLE_DEPOT, 'Essai vente en depot seule', RETIRES);
  creerRole(ROLE_SANS_VENTE, 'Essai sans vente', RETIRES.replace("'P_SM_CLOTURER_CAISSE'", "'P_SM_CLOTURER_CAISSE', 'P_VENTE_DEPOT_EXTENSION'"));
  ok('0. Profil d\'essai : vente en dépôt (P_VENTE_DEPOT_EXTENSION), ni écran de vente, ni vente en dépôt, ni droits d\'attente',
    q("SELECT GROUP_CONCAT(p.str_NAME ORDER BY p.str_NAME) FROM t_role_privelege rp JOIN t_privilege p ON p.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID WHERE rp.lg_ROLE_ID = '" + ROLE_DEPOT
      + "' AND p.str_NAME IN ('P_SM_DEPOT_EXTENSION', 'P_VENTE_DEPOT_EXTENSION', " + RETIRES + ")") === 'P_SM_DEPOT_EXTENSION,P_VENTE_DEPOT_EXTENSION');
  q("INSERT INTO t_user (lg_USER_ID, str_LOGIN, str_PASSWORD, str_FIRST_NAME, str_LAST_NAME, str_FUNCTION, str_STATUT, lg_EMPLACEMENT_ID, dt_CREATED, int_CONNEXION)"
    + " VALUES ('E2E-PD1', 'e2e-pd1', MD5('" + MDP + "'), 'E2E', 'PD1', 'Gestion stock', 'enable', '1', NOW(), 0)");
  q("INSERT INTO t_role_user (lg_USER_ROLE_ID, lg_ROLE_ID, lg_USER_ID, dt_CREATED) VALUES ('E2E-PD1', '" + ROLE_DEPOT + "', 'E2E-PD1', NOW())");
  q("INSERT INTO t_resume_caisse (ld_CAISSE_ID, lg_USER_ID, int_SOLDE_MATIN, int_SOLDE_SOIR, dt_CREATED, lg_CREATED_BY, str_STATUT) VALUES ('E2E-PD1-RC', 'E2E-PD1', 0, 0, NOW(), 'E2E-PD1', 'is_Using')");
  const compte = q('SELECT lg_COMPTE_CLIENT_ID FROM t_compte_client LIMIT 1');
  exec("INSERT INTO t_emplacement (lg_EMPLACEMENT_ID, lg_COMPTE_CLIENT_ID, str_NAME, str_DESCRIPTION, str_LOCALITE, str_FIRST_NAME, str_LAST_NAME, str_PHONE, dt_CREATED, dt_UPDATED, str_STATUT, lg_TYPEDEPOT_ID, bool_SAME_LOCATION)"
    + " VALUES ('" + DEPOT + "', '" + compte + "', 'DEPOT E2E PROFIL', 'E2E', 'ABOBO', 'E2E', 'Depot', '0700000000', NOW(), NOW(), 'enable', '2', 0);"
    + "INSERT INTO t_famille_stock (lg_FAMILLE_STOCK_ID, lg_FAMILLE_ID, int_NUMBER, int_NUMBER_AVAILABLE, dt_CREATED, dt_UPDATED, lg_EMPLACEMENT_ID, str_STATUT, int_UG, VERSION)"
    + " VALUES ('E2E-PD-STK', '" + P1.id + "', " + STOCK_DEPOT + ", " + STOCK_DEPOT + ", NOW(), NOW(), '" + DEPOT + "', 'enable', 0, 0)");
  A.ouvrirCaisse();
  let b = null; const erreurs = [];
  try {
    /* 1. migration de rattrapage, jouée comme au démarrage du serveur */
    const avant = nbAttributions();
    const fichiers = rattrapages();
    for (const f of fichiers) { jouer(f); }
    ok('1. Profil « vente en dépôt seule » : mettre en attente et reprendre donnés par la mise à jour',
      droitsDe(ROLE_DEPOT) === 'P_VENTE_METTRE_EN_ATTENTE,P_VENTE_REPRENDRE_ATTENTE', droitsDe(ROLE_DEPOT) + ' ; migrations jouées : ' + (fichiers.join(', ') || 'aucune'));
    ok('1. Profil sans aucune vente : rien donné', droitsDe(ROLE_SANS_VENTE) === '', droitsDe(ROLE_SANS_VENTE));
    const apres = nbAttributions();
    for (const f of fichiers) { jouer(f); }
    ok('1. Rejouée : aucune attribution de plus, aucune erreur', nbAttributions() === apres, avant + ' > ' + apres + ' > ' + nbAttributions());

    /* 2. vente dans l'onglet de vente du depot, mise en attente par le Retour */
    b = await ENV_E2E.lancer(chromium);
    const ctx = await b.newContext({ viewport: { width: 1500, height: 900 } });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => erreurs.push(String(e.message)));
    await vues.connexion(p, 'e2e-pd1', MDP);
    await ouvrirDepot(p);
    await taperArticleDepot(p, CIP1);
    const v = await couranteDepot(p); ventes.push(v);
    const e1 = await attendre(p, () => { const e = etat(v); return e[0] === 'EN_COURS' ? e : null; }, 10000, 300);
    ok('2. Vente saisie dans l\'onglet de vente du dépôt : EN_COURS sur le dépôt', !!e1 && e1[2] === DEPOT, JSON.stringify(etat(v)));
    await vues.cliquer(p, BARRE_D + 'btnGoBack');
    /* fenetre HTML de sortie (retours du 25/11) */
    await p.waitForSelector('#psv-fenetre', { timeout: 5000 });
    await p.click('#psv-choix-attente');
    await attendre(p, () => etat(v)[0] === 'EN_ATTENTE', 10000, 300);
    ok('2. « Mettre en attente et quitter » : EN_ATTENTE (aucun refus « droit manquant »)', etat(v)[0] === 'EN_ATTENTE', etat(v).join('|') + ' ; ' + journal(v));

    /* 3. rappel par la fenetre « Ventes en attente » de l'ecran depot */
    await p.waitForTimeout(1500);
    await ouvrirDepot(p);
    const refV = ref(v);
    await p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('doventeendepot #preventeSearchBtn')[0].getId()));
    await p.waitForFunction(() => { const w = Ext.ComponentQuery.query('ventesattentefenetre')[0]; return w && w.getEl().dom.querySelectorAll('.va-carte').length >= 1; }, null, { timeout: 20000 });
    const trouvee = await p.evaluate((r) => { const c = [...document.querySelectorAll('.va-carte')].find((x) => x.querySelector('.va-ticket').textContent === r); if (c) { c.id = 'carte-visee'; } return !!c; }, refV);
    ok('3. La vente est dans « Ventes en attente » de l\'écran dépôt', trouvee, refV);
    await p.click('#carte-visee'); await p.waitForTimeout(800);
    await p.keyboard.press('Enter');
    await p.waitForFunction((id) => { const c = testextjs.app.getController('VenteEnDepotCtr'); return c.current && c.current.lgPREENREGISTREMENTID === id; }, v, { timeout: 20000 }).catch(() => {});
    const e3 = await attendre(p, () => { const e = etat(v); return e[0] === 'EN_COURS' ? e : null; }, 10000, 300);
    ok('3. Rappel : la vente s\'ouvre dans l\'écran dépôt, EN_COURS, même ligne', !!e3 && (await couranteDepot(p)) === v && nbLignes(v) === '1', JSON.stringify(etat(v)) + ' ; ' + journal(v));

    /* 4. bilan */
    ok('4. Journal exact : début, attente, rappel ; aucun refus', journal(v) === ['DEBUT_SAISIE/1/EN_COURS/E2E-PD1', 'METTRE_EN_ATTENTE/1/EN_ATTENTE/E2E-PD1',
      'REPRENDRE_ATTENTE/1/EN_COURS/E2E-PD1'].join(' ; '), journal(v));
    ok('4. Stock du dépôt et de l\'officine inchangés (vente non clôturée)', stockDepot() === STOCK_DEPOT && A.stock(P1) === STOCK0, stockDepot() + ' ' + A.stock(P1) + ' ' + STOCK0);
    ok('4. Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    if (b) { await b.close().catch(() => {}); }
    nettoyer();
    A.nettoyer();
    ok('Nettoyage : vente, journal du test, dépôt, compte et profils retirés',
      q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + A.liste(ventes) + ")") === '0'
      && q('SELECT COUNT(*) FROM vente_journal_saisie WHERE id > ' + J0) === '0' && q("SELECT COUNT(*) FROM t_user WHERE lg_USER_ID LIKE 'E2E-PD%'") === '0'
      && q("SELECT COUNT(*) FROM t_role WHERE lg_ROLE_ID LIKE 'E2E-PD%'") === '0' && q("SELECT COUNT(*) FROM t_emplacement WHERE lg_EMPLACEMENT_ID = '" + DEPOT + "'") === '0');
    process.exit(A.bilan() ? 1 : 0);
  }
})();
