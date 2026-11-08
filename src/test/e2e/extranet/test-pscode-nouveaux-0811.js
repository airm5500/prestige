/* EXTRANETS GROSSISTES : enregistrement du PSCODE depuis les nouveaux produits Ubipharm (retour 6 du 08/11), par le
 * vrai chemin de l'écran, contre le FAUX extranet local (jamais le vrai), sur une copie de mesure (domain2, laborex_perf).
 *
 * Jeu d'essai varié, page de nouveaux produits générée :
 *  P1 : CIP d'une seule fiche sans PSCODE                    -> écrit (en majuscules : saisi « e2eps1 »)
 *  P2 : CIP d'une fiche qui a déjà un autre PSCODE           -> rien
 *  P3 : CIP porté par deux fiches                            -> rien (plusieurs)
 *  P4 : PSCODE déjà sur une fiche, CIP d'une autre fiche     -> rien (trouvé par PSCODE)
 *  P5 : CIP inconnu                                          -> rien
 *  P6, P7 : même CIP, une seule fiche                        -> rien (ambigu : deux produits pour une fiche)
 *  P8 : CIP d'une fiche dont le PSCODE n'est que des blancs  -> écrit
 * Rapprochement : bouton « Enregistrer N PSCODE » = lignes proposées à l'écran = API ; base après = attendu fiche par
 * fiche ; journal : une ligne par fiche écrite (table t_famille, avant -> après) ; nouveau rapprochement : P1 et P8
 * trouvés par PSCODE, bouton inactif. Confirmation dans le bouton (premier clic : rien d'écrit).
 * Bilan : seules les fiches de P1 et P8 changent ; une seconde demande n'écrit plus rien. Données remises à la fin.
 *
 * Lancement (domain2 démarré avec -DEXTRANET_UBIPHARM_URL=http://127.0.0.1:18765, base sans compte d'extranet) :
 *   BASE=http://localhost:9080/prestige DB_TEST=laborex_perf DB_PORT=3307 E2E_BASE_LIBRE=1 node test-pscode-nouveaux-0811.js
 */
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const faux = require('./faux-extranet');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright-core');

const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s],
  { encoding: 'utf8' }).replace(/\r/g, '').trim();
const lignes = (s) => { const t = q(s); return t ? t.split('\n').map((l) => l.split('\t')) : []; };
const res = [];
function ok(n, c, d) {
  res.push({ n, c: !!c });
  console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : ''));
}
const ECRAN = 'extranetsgrossistes';
const texte = (p, sel) => p.evaluate((s) => { const c = Ext.ComponentQuery.query('extranetsgrossistes ' + s)[0]; return c && c.el ? c.el.dom.textContent : ''; }, sel);

/* Garde : comptes reels en base -> toutes les sources doivent viser 127.0.0.1 (garde-extranets.js) */
require('./garde-extranets').verifier(q, ENV_E2E.BASE, ENV_E2E.PAYARA_DOMAINE);

/* codes d'essai absents de la base (préfixe 9 et 13 chiffres) */
const base = 9000000000000 + (Date.now() % 1000000) * 1000;
const C = (i) => String(base + i);
const page = (produits) => '<html><body><table><tbody>' + produits.map((x) => '<tr><td><a href="#" class="popup-produit" data-pscode="'
  + x.ps + '" data-sheettype="1">' + x.nom + '</a></td><td class="td-detail">' + x.cip + '</td><td>MEDICAMENT</td><td>08/11/2026</td>'
  + '<td>Mise en place</td><td>Oui</td></tr>').join('') + '</tbody></table></body></html>';

(async () => {
  const srv = await faux.demarrer(18765);
  const navigateur = await ENV_E2E.lancer(chromium);
  const p = await (await navigateur.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
  const erreurs = [];
  p.on('pageerror', (e) => erreurs.push(String(e.message)));
  /* 8 fiches actives sans PSCODE ni EAN 13 : leurs valeurs sont gardées pour la remise en état */
  const fiches = lignes("SELECT lg_FAMILLE_ID, IFNULL(int_EAN13, 'NULL'), IFNULL(str_PSCODE, 'NULL'), IFNULL(DATE_FORMAT(dt_UPDATED, '%Y-%m-%d %H:%i:%s'), 'NULL')"
    + " FROM t_famille WHERE str_STATUT = 'enable' AND (str_PSCODE IS NULL OR str_PSCODE = '') AND (int_EAN13 IS NULL OR int_EAN13 = '')"
    + ' ORDER BY lg_FAMILLE_ID LIMIT 8');
  const F = fiches.map((f) => f[0]);
  const debut = q('SELECT DATE_FORMAT(NOW(), \'%Y-%m-%d %H:%i:%s\')');
  const sql = (v) => (v === 'NULL' ? 'NULL' : "'" + v.replace(/'/g, "''") + "'");
  const etatFiches = () => lignes('SELECT lg_FAMILLE_ID, IFNULL(str_PSCODE, \'NULL\') FROM t_famille WHERE lg_FAMILLE_ID IN ('
    + F.map(sql).join(',') + ') ORDER BY lg_FAMILLE_ID');
  const premiereCollecte = Number(q('SELECT IFNULL(MAX(id), 0) + 1 FROM extranet_collecte'));
  try {
    ok('jeu : 8 fiches d\'essai disponibles, codes d\'essai absents de la base', F.length === 8
      && q('SELECT COUNT(*) FROM t_famille WHERE int_EAN13 LIKE \'' + String(base).slice(0, 10) + '%\' OR int_CIP LIKE \'' + String(base).slice(0, 10) + '%\'') === '0');
    /* préparation : EAN 13 d'essai et PSCODE de départ */
    const prep = [[F[0], C(1), null], [F[1], C(2), 'AUTREPS'], [F[2], C(3), null], [F[3], C(3), null], [F[4], null, 'E2EPS4'],
      [F[5], C(4), null], [F[6], C(6), null], [F[7], C(8), '   ']];
    prep.forEach(([id, ean, ps]) => q('UPDATE t_famille SET int_EAN13 = ' + (ean ? "'" + ean + "'" : 'int_EAN13') + ', str_PSCODE = '
      + (ps === null ? 'NULL' : "'" + ps + "'") + " WHERE lg_FAMILLE_ID = '" + id + "'"));
    srv.etat.nouveauxHtml = page([{ ps: 'e2eps1', cip: C(1), nom: 'ESSAI P1' }, { ps: 'E2EPS2', cip: C(2), nom: 'ESSAI P2' },
      { ps: 'E2EPS3', cip: C(3), nom: 'ESSAI P3' }, { ps: 'E2EPS4', cip: C(4), nom: 'ESSAI P4' }, { ps: 'E2EPS5', cip: C(5), nom: 'ESSAI P5' },
      { ps: 'E2EPS6', cip: C(6), nom: 'ESSAI P6' }, { ps: 'E2EPS7', cip: C(6), nom: 'ESSAI P7' }, { ps: 'E2EPS8', cip: C(8), nom: 'ESSAI P8' }]);
    const avant = etatFiches();
    const journalAvant = Number(q("SELECT COUNT(*) FROM t_event_log WHERE str_TABLE_CONCERN = 't_famille' AND dt_CREATED >= '" + debut + "'"));

    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await vues.ouvrirMenu(p, 'GESTION DES COMMANDES', 'Extranets grossistes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('extranetsgrossistes')[0], null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    for (const t of ['Sessions']) { await vues.cliquer(p, ECRAN + ' #exOnglets tab[text=' + t + ']'); await p.waitForTimeout(400); }
    await vues.saisir(p, ECRAN + ' #exCookieUBIPHARM', srv.COOKIE);
    const rs = p.waitForResponse((x) => x.url().indexOf('/sessions/UBIPHARM') >= 0);
    await vues.cliquer(p, ECRAN + ' #exSaisieUBIPHARM button[text=Enregistrer]');
    await rs;
    for (const t of ['Ubipharm', 'Produits', 'Nouveaux produits']) { await vues.cliquer(p, ECRAN + ' #exOnglets tab[text=' + t + ']'); await p.waitForTimeout(400); }
    const rn = p.waitForResponse((x) => x.url().indexOf('/nouveaux/collecte') >= 0, { timeout: 120000 });
    await vues.cliquer(p, ECRAN + ' #exNouveauxCollecter');
    await rn;
    await p.waitForTimeout(1500);
    const rr = p.waitForResponse((x) => x.url().indexOf('/nouveaux/rapprochement') >= 0);
    await vues.cliquer(p, ECRAN + ' #exRapprocher');
    const rap = await (await rr).json();
    await p.waitForTimeout(800);
    const parPs = Object.fromEntries(rap.data.map((x) => [x.pscode, x]));
    ok('rapprochement : statuts attendus par produit', JSON.stringify(['e2eps1', 'E2EPS2', 'E2EPS3', 'E2EPS4', 'E2EPS5', 'E2EPS6', 'E2EPS7', 'E2EPS8']
      .map((k) => parPs[k] && parPs[k].statut)) === JSON.stringify(['CIP', 'CIP', 'PLUSIEURS', 'PSCODE', 'INTROUVABLE', 'CIP', 'CIP', 'CIP']),
    JSON.stringify(rap.data.map((x) => x.pscode + ':' + x.statut)));
    const proposes = rap.data.filter((x) => x.aEnregistrer).map((x) => x.pscode);
    ok('rapprochement : proposés à l\'écriture = P1, P6, P7, P8 (API)', JSON.stringify(proposes) === JSON.stringify(['e2eps1', 'E2EPS6', 'E2EPS7', 'E2EPS8']), JSON.stringify(proposes));
    const b1 = await p.evaluate(() => { const b = Ext.ComponentQuery.query('extranetsgrossistes #exEnregistrerPscode')[0]; return { t: b.getText(), off: b.isDisabled() }; });
    ok('écran : bouton « Enregistrer 4 PSCODE » actif = API', b1.t === 'Enregistrer 4 PSCODE' && !b1.off, JSON.stringify(b1));

    await vues.cliquer(p, ECRAN + ' #exEnregistrerPscode');
    await p.waitForTimeout(700);
    ok('confirmation dans le bouton : premier clic, rien d\'écrit', (await texte(p, '#exEnregistrerPscode')) === 'Écrire 4 PSCODE ?'
      && JSON.stringify(etatFiches()) === JSON.stringify(avant), await texte(p, '#exEnregistrerPscode'));
    const re = p.waitForResponse((x) => x.url().indexOf('/nouveaux/pscode') >= 0 && x.request().method() === 'POST');
    const rr2 = p.waitForResponse((x) => x.url().indexOf('/nouveaux/rapprochement') >= 0);
    await vues.cliquer(p, ECRAN + ' #exEnregistrerPscode');
    const r = await (await re).json();
    const rap2 = await (await rr2).json();
    await p.waitForTimeout(1000);
    ok('réponse : 2 enregistrés (P1, P8), 2 ambigus (P6, P7)', r.success && r.enregistres === 2 && r.ignores === 2
      && JSON.stringify(r.data.map((x) => [x.familleId, x.pscode])) === JSON.stringify([[F[0], 'E2EPS1'], [F[7], 'E2EPS8']]), JSON.stringify(r));
    ok('écran : message « 2 PSCODE enregistré(s), 2 ambigu(s) laissé(s) »', (await texte(p, '#exNouveauxMsg')).indexOf('2 PSCODE enregistré(s), 2 ambigu(s) laissé(s)') >= 0,
      await texte(p, '#exNouveauxMsg'));
    const attendu = [[F[0], 'E2EPS1'], [F[1], 'AUTREPS'], [F[2], 'NULL'], [F[3], 'NULL'], [F[4], 'E2EPS4'], [F[5], 'NULL'], [F[6], 'NULL'], [F[7], 'E2EPS8']]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1));
    ok('base : fiche par fiche = attendu (seules P1 et P8 écrites)', JSON.stringify(etatFiches()) === JSON.stringify(attendu), JSON.stringify(etatFiches()));
    const journal = lignes("SELECT str_TYPE_LOG, str_DETAIL, typeLog FROM t_event_log WHERE str_TABLE_CONCERN = 't_famille' AND dt_CREATED >= '" + debut + "' ORDER BY str_TYPE_LOG");
    ok('journal : une ligne par fiche écrite, avant -> après', journal.length === journalAvant + 2
      && JSON.stringify(journal.map((l) => [l[0], l[1]]).slice(-2).sort()) === JSON.stringify([[F[0], 'str_PSCODE : (vide) -> E2EPS1'], [F[7], 'str_PSCODE : (vide) -> E2EPS8']].sort()),
    JSON.stringify(journal));
    const parPs2 = Object.fromEntries(rap2.data.map((x) => [x.pscode, x.statut]));
    const b2 = await p.evaluate(() => { const b = Ext.ComponentQuery.query('extranetsgrossistes #exEnregistrerPscode')[0]; return { t: b.getText(), off: b.isDisabled() }; });
    ok('relecture : P1 et P8 trouvés par PSCODE ; bouton = 2 restants (P6, P7 ambigus)', parPs2.e2eps1 === 'PSCODE' && parPs2.E2EPS8 === 'PSCODE'
      && b2.t === 'Enregistrer 2 PSCODE', JSON.stringify([parPs2, b2]));
    const r3 = await p.evaluate(() => fetch('../api/v1/extranet/ubipharm/nouveaux/pscode', { method: 'POST' }).then((x) => x.json()));
    ok('bilan : une seconde demande n\'écrit plus rien', r3.success && r3.enregistres === 0 && JSON.stringify(etatFiches()) === JSON.stringify(attendu), JSON.stringify(r3));
    ok('lecture seule vers l\'extranet : uniquement des GET', srv.etat.appels.every((a) => a.methode === 'GET'));
    ok('aucune erreur JavaScript', erreurs.length === 0, JSON.stringify(erreurs));
  } catch (e) {
    ok('déroulé sans erreur', false, e.stack || e);
    await ENV_E2E.capture(p, 'pscode-nouveaux-erreur').catch(() => {});
  } finally {
    fiches.forEach(([id, ean, ps, maj]) => q('UPDATE t_famille SET int_EAN13 = ' + sql(ean) + ', str_PSCODE = ' + sql(ps) + ', dt_UPDATED = ' + sql(maj)
      + " WHERE lg_FAMILLE_ID = '" + id + "'"));
    q("DELETE FROM t_event_log WHERE str_TABLE_CONCERN = 't_famille' AND str_DETAIL LIKE 'str_PSCODE : (vide) -> E2EPS%' AND dt_CREATED >= '" + debut + "'");
    q('DELETE FROM extranet_nouveau_produit_agence WHERE produit_id IN (SELECT id FROM extranet_nouveau_produit WHERE collecte_id >= ' + premiereCollecte
      + '); DELETE FROM extranet_nouveau_produit WHERE collecte_id >= ' + premiereCollecte + '; DELETE FROM extranet_collecte WHERE id >= ' + premiereCollecte);
    const remis = lignes("SELECT lg_FAMILLE_ID, IFNULL(int_EAN13, 'NULL'), IFNULL(str_PSCODE, 'NULL'), IFNULL(DATE_FORMAT(dt_UPDATED, '%Y-%m-%d %H:%i:%s'), 'NULL')"
      + ' FROM t_famille WHERE lg_FAMILLE_ID IN (' + F.map(sql).join(',') + ') ORDER BY lg_FAMILLE_ID');
    ok('nettoyage : fiches remises à l\'identique, journal et collectes du test retirés', JSON.stringify(remis) === JSON.stringify(fiches)
      && q("SELECT COUNT(*) FROM t_event_log WHERE str_DETAIL LIKE 'str_PSCODE : (vide) -> E2EPS%'") === '0'
      && q('SELECT COUNT(*) FROM extranet_collecte WHERE id >= ' + premiereCollecte) === '0');
    await p.evaluate(() => fetch('../api/v1/extranet/sessions/UBIPHARM', { method: 'DELETE' })).catch(() => {});
    await navigateur.close();
    await srv.arreter();
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
    process.exit(ko ? 1 : 0);
  }
})();
