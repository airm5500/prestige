/* SEUILS SEMOIS : LECTURE DES VENTES EN PANNE (garde-fous du 21/11, demandes « aucune regression en production »).
 *  Defaut : depuis la correction de Moaye (8b68a979e), les modes ABC et par produit traitent aussi les produits actifs
 *           sans vente (seuil et quantite a 0). La lecture des ventes rendait une liste vide sur une erreur SQL : une
 *           simple panne de lecture aurait mis tout le catalogue a zero.
 *  Garde-fous : (1) lecture en echec distinguee d'une liste vide : aucun produit modifie ; (2) aucune vente lue sur des
 *           mois retenus (au moins 20 jours d'activite au calendrier) : situation anormale, aucun produit modifie.
 *
 * Parcours de l'ecran : connexion, Fiche article, « Recalculer seuils », Oui, message de fin, dans les trois modes.
 * Meme environnement que test-semois-seuils-moaye.js : serveur en reappro.mode=semois (domaine d'essai isole, option
 * -Duser.home=D:\essai-semois\home), base d'essai.
 *
 * Controles, dans chaque mode (standard, ABC, par produit), tous les produits actifs partant de 100 / 100 / 1 :
 *  G. panne : la table des lignes de vente est renommee pendant le recalcul (erreur SQL a la lecture) ; aucune fiche
 *     modifiee, aucune ligne d'historique, l'anomalie est notee au journal du serveur ;
 *  H. fenetre sans vente : la table est remplacee par une copie vide (lecture sans erreur, zero vente) ; meme resultat ;
 *  temoin : la table remise, un recalcul normal modifie bien les fiches (le parcours fonctionne) ;
 *  bilan : table des lignes de vente remise (nom, nombre de lignes, empreinte), seuils, parametres et historique remis.
 * Lancement seul : node src/test/e2e/reappro/test-semois-panne-lecture.js
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const ENV_E2E = require('../outils/poste');
const V = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 28 }).replace(/\r/g, '').trim();
const lignes = (s) => { const t = q(s); return t ? t.split('\n').map((l) => l.split('\t')) : []; };
const SAUV = 'e2e_semois_panne';
const DETAIL = 't_preenregistrement_detail';
const CACHEE = 'e2e_semois_detail_cache';
const PARAMS = ['SEMOIS', 'SEMOIS_ABC', 'SEMOIS_PAR_PRODUIT', 'SEMOIS_DIVISEUR_MOIS_REELS', 'KEY_DAY_SEUIL_REAPPRO'];
const AUJ = new Date().toISOString().slice(0, 10);
const JOURNAUX = 'D:/prestige/reappro_logs';
const LOG_SERVEUR = path.join('D:/payara5/payara5/glassfish/domains', process.env.PAYARA_DOMAINE || 'domain4', 'logs/server.log');
const COLS_FAMILLE = q("SELECT GROUP_CONCAT(CONCAT('IFNULL(`', COLUMN_NAME, '`, ''~'')') ORDER BY ORDINAL_POSITION SEPARATOR ',') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_famille' AND COLUMN_NAME <> 'dt_UPDATED'");
const EMPREINTE = () => q(`SELECT CONCAT(COUNT(*), ':', SUM(CRC32(CONCAT_WS('|', ${COLS_FAMILLE})))) FROM t_famille`) + ','
  + q('CHECKSUM TABLE t_parameters, t_famille_history').split('\n').map((l) => l.split('\t')[1]).join(',');
const EMPREINTE_DETAIL = () => q(`SELECT COUNT(*) FROM ${DETAIL}`) + ':' + q(`CHECKSUM TABLE ${DETAIL}`).split('\t')[1];
const PARAMETRES = () => new Map(lignes("SELECT str_KEY, CONCAT_WS('|', str_VALUE, dt_UPDATED, str_STATUT) FROM t_parameters"));
const existe = (t) => q(`SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${t}'`) === '1';

function sauvegarder() {
  if (existe(SAUV)) { restaurer(); }
  q(`CREATE TABLE ${SAUV} AS SELECT lg_FAMILLE_ID, int_SEUIL_MIN, int_STOCK_REAPROVISONEMENT, int_QTE_REAPPROVISIONNEMENT FROM t_famille;
    ALTER TABLE ${SAUV} ADD PRIMARY KEY (lg_FAMILLE_ID);
    CREATE TABLE ${SAUV}_p AS SELECT * FROM t_parameters WHERE str_KEY IN (${PARAMS.map((x) => `'${x}'`).join(',')});`);
}
function remettreTable() {
  /* la vraie table est toujours remise sous son nom, meme si le test s'arrete en route */
  if (existe(CACHEE)) {
    if (existe(DETAIL)) { q(`DROP TABLE ${DETAIL}`); } // copie vide du cas H
    q(`RENAME TABLE ${CACHEE} TO ${DETAIL}`);
  }
}
function restaurer() {
  remettreTable();
  q(`UPDATE t_famille f JOIN ${SAUV} s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID SET f.int_SEUIL_MIN = s.int_SEUIL_MIN,
      f.int_STOCK_REAPROVISONEMENT = s.int_STOCK_REAPROVISONEMENT, f.int_QTE_REAPPROVISIONNEMENT = s.int_QTE_REAPPROVISIONNEMENT;
    DELETE FROM t_parameters WHERE str_KEY IN (${PARAMS.map((x) => `'${x}'`).join(',')}); INSERT INTO t_parameters SELECT * FROM ${SAUV}_p;
    DROP TABLE ${SAUV}; DROP TABLE ${SAUV}_p;`);
}
const param = (k, v) => q(`UPDATE t_parameters SET str_VALUE = '${v}' WHERE str_KEY = '${k}'`);
const reprise = () => q(`UPDATE t_famille SET int_SEUIL_MIN = 100, int_STOCK_REAPROVISONEMENT = 100, int_QTE_REAPPROVISIONNEMENT = 1 WHERE str_STATUT = 'enable'`);
const nonReprise = () => q(`SELECT COUNT(*) FROM t_famille WHERE str_STATUT = 'enable' AND NOT (int_SEUIL_MIN <=> 100 AND int_STOCK_REAPROVISONEMENT <=> 100 AND int_QTE_REAPPROVISIONNEMENT <=> 1)`);
const tailleLog = () => { try { return fs.statSync(LOG_SERVEUR).size; } catch (e) { return 0; } };
const logDepuis = (pos) => { try { const b = fs.readFileSync(LOG_SERVEUR); return b.slice(Math.min(pos, b.length)).toString('utf8'); } catch (e) { return ''; } };

async function recalculer(p, nom) {
  await V.cliquer(p, 'famillemanager button[text=Recalculer seuils]');
  await V.attendreMessage(p, 'Lancer le recalcul', 10000);
  await V.repondre(p, 'yes');
  let msg = null;
  for (const fin = Date.now() + 20 * 60000; Date.now() < fin && !msg; await p.waitForTimeout(1000)) {
    const t = await V.texteMessage(p);
    if (/terminé|échoué/.test(t)) { msg = t; }
  }
  await V.repondre(p, 'ok').catch(() => {});
  ok(nom + ' : recalcul lancé par le bouton, message de fin affiché', !!msg, msg);
}

const MODES = [['standard', 0, 0], ['ABC', 1, 0], ['par produit', 0, 1]];

(async () => {
  const histoMax = q('SELECT IFNULL(MAX(lg_ID), 0) FROM t_famille_history');
  const avant = EMPREINTE(), paramsAvant = PARAMETRES(), detailAvant = EMPREINTE_DETAIL();
  const journaux = ['semois_abc', 'semois_normal', 'semois_par_produit'].map((m) => path.join(JOURNAUX, m + '_' + AUJ + '.json')).filter((f) => !fs.existsSync(f));
  remettreTable();
  sauvegarder();
  const actifs = +q("SELECT COUNT(*) FROM t_famille WHERE str_STATUT = 'enable'");
  const vendus = +q(`SELECT COUNT(DISTINCT d.lg_FAMILLE_ID) FROM t_preenregistrement p JOIN ${DETAIL} d ON d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
    WHERE p.str_STATUT = 'is_Closed' AND p.dt_UPDATED >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 3 MONTH)`);
  ok('Jeu d\'essai : produits actifs et ventes sur les trois derniers mois', actifs > 1000 && vendus > 100, actifs + ' actifs, ' + vendus + ' produits vendus');

  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1500, height: 900 } })).newPage();
  try {
    await V.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const parent = await p.evaluate(() => { let t = null; Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().cascadeBy((n) => { if (n.get('id') === 'famillemanager') { t = n.parentNode.get('text'); } }); return t; });
    await V.ouvrirEcran(p, (parent || '').replace(/<[^>]+>/g, '').trim(), 'Fiche Article', 'famillemanager');
    await p.waitForFunction(() => Ext.ComponentQuery.query('famillemanager button[text=Recalculer seuils]').some((c) => c.isVisible(true)), null, { timeout: 60000 });
    param('SEMOIS', 1); param('SEMOIS_DIVISEUR_MOIS_REELS', 1);

    for (const [mode, abc, pp] of MODES) {
      param('SEMOIS_ABC', abc); param('SEMOIS_PAR_PRODUIT', pp);

      /* G. panne de lecture : la table des lignes de vente n'existe plus pendant le recalcul */
      reprise();
      let h = q('SELECT IFNULL(MAX(lg_ID), 0) FROM t_famille_history'), pos = tailleLog();
      q(`RENAME TABLE ${DETAIL} TO ${CACHEE}`);
      try { await recalculer(p, 'G. ' + mode + ', lecture en panne'); } finally { remettreTable(); }
      let changes = nonReprise(), histo = q('SELECT COUNT(*) FROM t_famille_history WHERE lg_ID > ' + h);
      ok('G. ' + mode + ', lecture en panne : aucune fiche modifiée, aucune ligne d\'historique', changes === '0' && histo === '0', changes + ' fiches modifiées sur ' + actifs + ', ' + histo + ' lignes d\'historique');
      let log = logDepuis(pos);
      ok('G. ' + mode + ' : l\'erreur de lecture et l\'anomalie sont notées au journal du serveur', /doesn't exist/.test(log) && /aucun (produit remis a zero|seuil modifie)/.test(log),
        (log.match(/semois[^\n]*aucun[^\n]*/) || ['(aucune ligne semois)'])[0]);

      /* H. fenetre sans vente : copie vide de la table, lecture sans erreur et zero vente */
      reprise();
      h = q('SELECT IFNULL(MAX(lg_ID), 0) FROM t_famille_history'); pos = tailleLog();
      q(`RENAME TABLE ${DETAIL} TO ${CACHEE}; CREATE TABLE ${DETAIL} LIKE ${CACHEE};`);
      try { await recalculer(p, 'H. ' + mode + ', aucune vente lue'); } finally { remettreTable(); }
      changes = nonReprise(); histo = q('SELECT COUNT(*) FROM t_famille_history WHERE lg_ID > ' + h);
      ok('H. ' + mode + ', aucune vente lue sur des mois actifs : aucune fiche modifiée, aucune ligne d\'historique', changes === '0' && histo === '0', changes + ' fiches modifiées sur ' + actifs + ', ' + histo + ' lignes d\'historique');
      log = logDepuis(pos);
      ok('H. ' + mode + ' : l\'anomalie est notée au journal du serveur', /aucun (produit remis a zero|seuil modifie)/.test(log), (log.match(/semois[^\n]*aucun[^\n]*/) || ['(aucune ligne semois)'])[0]);

      /* temoin : la vraie table remise, le meme parcours modifie bien les fiches */
      reprise();
      await recalculer(p, 'Témoin ' + mode);
      changes = +nonReprise();
      ok('Témoin ' + mode + ' : table remise, le recalcul modifie bien les fiches', changes > 100, changes + ' fiches modifiées');
    }
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
    restaurer();
    q('DELETE FROM t_famille_history WHERE lg_ID > ' + histoMax);
    for (const f of journaux) { try { fs.unlinkSync(f); } catch (e) { /* absent */ } }
    const apres = EMPREINTE(), paramsApres = PARAMETRES(), detailApres = EMPREINTE_DETAIL();
    ok('Bilan : table des lignes de vente remise sous son nom, mêmes lignes (empreinte)', existe(DETAIL) && !existe(CACHEE) && detailApres === detailAvant, detailAvant + ' / ' + detailApres);
    const diff = [...new Set([...paramsAvant.keys(), ...paramsApres.keys()])].filter((k) => paramsAvant.get(k) !== paramsApres.get(k)).map((k) => k + ' : ' + paramsAvant.get(k) + ' -> ' + paramsApres.get(k));
    ok('Bilan : seuils, paramètres et historique remis à l\'identique (CHECKSUM)', apres === avant, avant + ' / ' + apres + ' ; paramètres modifiés : ' + diff.join(' ; '));
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
