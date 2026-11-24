/* CODE INTERNE D'UN NOUVEAU CLIENT (21/11). Defaut : le code interne etait tire de l'heure (minute, seconde, millieme,
 * coupe a six chiffres). Sur une base de plusieurs dizaines de milliers de clients il retombait sur un code deja pris :
 * « Créer client standard » et « Créer » refusaient alors la creation (« Le code interne existe déjà ») ; la creation
 * depuis la vente, elle, enregistrait un second client portant le meme code.
 *
 * Reproduction sans hasard : tous les codes que l'ancien calcul peut donner pendant les cinq minutes du test (les
 * codes commencant par la minute en cours, et les quatre suivantes) sont occupes en base par des clients d'essai
 * supprimes (statut « delete », invisibles des ecrans). Puis, par les ecrans :
 *  - GESTION DES TIERS-PAYANTS > Clients, « Créer client standard », deux clients (valeurs differentes) ;
 *  - « Créer », client assure (organisme AMAT-CI, 80 %), code interne laisse vide ;
 *  - « Créer » avec un code interne saisi et deja pris : toujours refuse, rien d'enregistre ;
 *  - SERVICE CLIENT > Ventes, vente « Assurance », nouveau client cree depuis la vente.
 * Controles : chaque creation aboutit ; code de six chiffres, porte par ce seul client, differents entre eux ; code de
 * la liste des clients = code en base ; un compte client par client ; bilan : exactement les clients crees, aucune
 * vente laissee. Clients d'essai retires par l'ecran puis en base ; codes occupes retires.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, saisir, cliquer } = require('../outils/vues');
const { gestes } = require('./outils-clients');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--raw', '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).replace(/\r\n/g, '\n').trim();
const MARQUE = 'E2ECODEINT';
const PRIS = 'E2ECODEPRIS';
const ORGANISME = 'AMAT-CI';
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

const retirerBase = () => {
  const ids = q(`SELECT GROUP_CONCAT(CONCAT("'", lg_CLIENT_ID, "'")) FROM t_client WHERE str_FIRST_NAME LIKE '${MARQUE}%'`);
  if (ids && ids !== 'NULL') {
    q(`DELETE FROM t_compte_client_tiers_payant WHERE lg_COMPTE_CLIENT_ID IN (SELECT lg_COMPTE_CLIENT_ID FROM t_compte_client WHERE lg_CLIENT_ID IN (${ids}));`
      + `DELETE FROM t_ayant_droit WHERE lg_CLIENT_ID IN (${ids});`
      + `DELETE FROM t_compte_client WHERE lg_CLIENT_ID IN (${ids});`
      + `DELETE FROM t_client WHERE lg_CLIENT_ID IN (${ids});`);
  }
  q(`DELETE FROM t_client WHERE str_FIRST_NAME = '${PRIS}' AND lg_CLIENT_ID LIKE 'E2ECODEPRIS-%'`);
};
const fiches = () => q(`SELECT CONCAT_WS('|', c.str_LAST_NAME, c.str_CODE_INTERNE,`
  + ` (SELECT COUNT(*) FROM t_client d WHERE d.str_CODE_INTERNE = c.str_CODE_INTERNE),`
  + ` (SELECT COUNT(*) FROM t_compte_client cc WHERE cc.lg_CLIENT_ID = c.lg_CLIENT_ID), c.lg_CLIENT_ID)`
  + ` FROM t_client c WHERE c.str_FIRST_NAME = '${MARQUE}' ORDER BY c.str_LAST_NAME`)
  .split('\n').filter(Boolean).map((l) => { const [prenom, code, porteurs, comptes, id] = l.split('|'); return { prenom, code, porteurs: +porteurs, comptes: +comptes, id }; });

(async () => {
  retirerBase();
  /* fenetre : cinq minutes a deux chiffres devant nous, et le temps de preparer */
  for (;;) {
    const d = new Date();
    if (d.getMinutes() >= 10 && d.getMinutes() <= 54 && d.getSeconds() <= 40) { break; }
    await attendre(5000);
  }
  const m0 = new Date().getMinutes();
  const minutes = [0, 1, 2, 3, 4].map((i) => m0 + i);
  /* l'ancien calcul donne « minute » + seconde + millieme : avec une minute a deux chiffres, le code commence par elle */
  q('SET SESSION max_recursive_iterations = 100000;'
    + ` INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, str_CODE_INTERNE, str_STATUT, dt_CREATED, dt_UPDATED)`
    + ` WITH RECURSIVE n AS (SELECT 0 AS i UNION ALL SELECT i + 1 FROM n WHERE i < 9999)`
    + ` SELECT CONCAT('E2ECODEPRIS-', m.mm, LPAD(n.i, 4, '0')), '${PRIS}', 'Code pris', CONCAT(m.mm, LPAD(n.i, 4, '0')), 'delete', NOW(), NOW()`
    + ` FROM n CROSS JOIN (${minutes.map((m) => `SELECT '${m}' AS mm`).join(' UNION ALL ')}) m`);
  const occupes = +q(`SELECT COUNT(*) FROM t_client WHERE str_FIRST_NAME = '${PRIS}'`);
  ok('Jeu d\'essai : codes de l\'ancien calcul occupés pour les minutes ' + minutes.join(', '), occupes === 50000, occupes);
  const clientsAvant = +q(`SELECT COUNT(*) FROM t_client WHERE str_FIRST_NAME <> '${PRIS}'`);
  const comptesAvant = +q('SELECT COUNT(*) FROM t_compte_client');
  const ventesAvant = +q('SELECT COUNT(*) FROM t_preenregistrement');

  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  let g = null;
  try {
    const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
    p.setDefaultTimeout(60000);
    p.on('pageerror', (e) => err.push(e.message));
    await p.context().route('**/api/v1/support/events', (r) => r.request().method() === 'POST' ? r.fulfill({ status: 200, body: '{}' }) : r.continue());
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    g = gestes(p, { ORGANISME, MARQUE, PREFIXE: MARQUE });
    await g.ouvrirClients();

    /* 1. deux clients standards par la fenetre « Créer client standard » */
    const id = (item) => p.evaluate((i) => Ext.ComponentQuery.query('addclientstandard #' + i)[0].inputEl.id, item);
    for (const [prenom, tel] of [['Standard Un', '0799212111'], ['Standard Deux', '0799212112']]) {
      await p.evaluate(() => Ext.ComponentQuery.query('clientgestion button').find((x) => /client standard/i.test(x.text || '')).btnEl.dom.click());
      await p.waitForFunction(() => Ext.ComponentQuery.query('addclientstandard').some((w) => w.isVisible()), null, { timeout: 10000 });
      await p.waitForTimeout(400);
      await p.fill('#' + await id('nom'), MARQUE); await p.fill('#' + await id('prenoms'), prenom); await p.fill('#' + await id('telephone'), tel);
      const reponse = p.waitForResponse((r) => /client\/gestion\/create-standard$/.test(r.url()), { timeout: 20000 });
      await p.evaluate(() => Ext.ComponentQuery.query('addclientstandard #enregistrer')[0].btnEl.dom.click());
      const r = await (await reponse).json().catch(() => ({}));
      await p.waitForTimeout(800);
      ok('« Créer client standard » ' + prenom + ' : créé, sans « code interne existe déjà »', String(r.success) === 'true', JSON.stringify(r));
      await p.evaluate(() => { Ext.ComponentQuery.query('addclientstandard').forEach((w) => w.isVisible() && w.close()); while (Ext.MessageBox.isVisible()) { Ext.MessageBox.hide(); } });
    }

    /* 2. « Créer » avec un code interne saisi et deja pris : toujours refuse */
    const codePris = minutes[2] + '4321';
    await g.remplirCreation('Code Saisi', ORGANISME);
    await saisir(p, '#str_CODE_INTERNE', codePris);
    const refus = await g.enregistrerCreation();
    ok('« Créer » avec un code saisi déjà pris : refusé et dit', String(refus.r.success) === '0' && /code interne existe/i.test(refus.message || refus.r.errors || ''), JSON.stringify(refus));
    await g.fermerFenetres();
    ok('Base : aucun client « Code Saisi »', q(`SELECT COUNT(*) FROM t_client WHERE str_FIRST_NAME = '${MARQUE}' AND str_LAST_NAME = 'Code Saisi'`) === '0');
    ok('Base : le code pris reste porté par un seul client', q(`SELECT COUNT(*) FROM t_client WHERE str_CODE_INTERNE = '${codePris}'`) === '1');

    /* 3. « Créer », code interne laisse vide */
    await g.remplirCreation('Assure', ORGANISME);
    const vide = await p.evaluate(() => Ext.getCmp('str_CODE_INTERNE').getValue() || '');
    const cree = await g.enregistrerCreation();
    await g.fermerFenetres();
    ok('« Créer » assuré, code vide : créé', vide === '' && String(cree.r.success) !== '0', JSON.stringify(cree));

    /* 4. nouveau client depuis la vente « Assurance » */
    const v = await g.remplirCreationVente('Vente', ORGANISME);
    const parVente = await g.enregistrerCreationVente();
    ok('Vente : nouveau client créé', v && String(parVente.succes) === 'true', JSON.stringify(parVente));
    await g.fermerFenetres();

    /* 5. controles en base */
    const f = fiches();
    ok('Base : les quatre clients sont créés', f.map((x) => x.prenom.toUpperCase()).sort().join(',') === 'ASSURE,STANDARD DEUX,STANDARD UN,VENTE', JSON.stringify(f));
    ok('Base : codes de six chiffres', f.every((x) => /^[1-9][0-9]{5}$/.test(x.code)), f.map((x) => x.code).join(','));
    ok('Base : chaque code n\'est porté que par son client', f.every((x) => x.porteurs === 1), JSON.stringify(f.map((x) => [x.prenom, x.code, x.porteurs])));
    ok('Base : codes différents entre eux', new Set(f.map((x) => x.code)).size === f.length);
    ok('Base : un compte client par client', f.every((x) => x.comptes === 1), JSON.stringify(f.map((x) => [x.prenom, x.comptes])));

    /* 6. rapprochement : code de la liste des clients = code en base */
    await g.ouvrirClients();
    await g.chercherClients(false);
    const liste = await p.evaluate((m) => Ext.ComponentQuery.query('clientgestion')[0].getStore().getRange()
      .filter((r) => (r.get('str_FIRST_LAST_NAME') || '').indexOf(m) >= 0)
      .map((r) => [r.get('lg_CLIENT_ID'), r.get('str_CODE_INTERNE')]), MARQUE);
    const enTexte = (l) => l.map((x) => x.join(',')).sort().join(';');
    ok('Liste des clients : mêmes clients et mêmes codes qu\'en base', enTexte(liste) === enTexte(f.map((x) => [x.id, x.code])),
      JSON.stringify({ liste, base: f.map((x) => [x.id, x.code]) }));

    /* 7. bilan avant / apres */
    ok('Bilan : exactement quatre clients de plus', +q(`SELECT COUNT(*) FROM t_client WHERE str_FIRST_NAME <> '${PRIS}'`) - clientsAvant === 4);
    ok('Bilan : exactement quatre comptes clients de plus', +q('SELECT COUNT(*) FROM t_compte_client') - comptesAvant === 4);
    ok('Bilan : aucune vente laissée', +q('SELECT COUNT(*) FROM t_preenregistrement') === ventesAvant);
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
    const reste = await g.nettoyerClients();
    ok('Clients d\'essai supprimés par l\'écran', reste === 0, reste);
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack || x.message);
  } finally {
    await b.close();
    retirerBase();
    ok('Aucun client d\'essai ni code occupé en base', q(`SELECT COUNT(*) FROM t_client WHERE str_FIRST_NAME IN ('${MARQUE}', '${PRIS}')`) === '0');
    ok('Bilan final : nombre de clients revenu à l\'identique', +q('SELECT COUNT(*) FROM t_client') === clientsAvant);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
