/* DEMANDE 58 (Prestige Mobile, 31/10) : modifier ou effacer la date de naissance depuis la fiche client.
 * Par la route du telephone, POST v1/ordonnance-client/client/{id}/identite, avec la session de l'utilisateur :
 *  - sans « remplacer » : comportement d'avant (une date deja renseignee n'est pas ecrasee) ;
 *  - « remplacer » + date : la date est remplacee ; date a venir, impossible ou de plus de AGE_MAX ans refusee ;
 *  - « remplacer » + date vide ou null : la date est effacee ;
 *  - capacite « naissanceModifiable » dans GET droits et dans le dossier du client ;
 *  - le journal nomme le client et l'utilisateur, jamais la date.
 * Client d'essai cree puis retire.
 */
const { chromium } = require('playwright-core');
const fs = require('fs');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const C = 'E2E-NAISS-MOD';
const retirer = () => q(`DELETE FROM t_compte_client WHERE lg_CLIENT_ID = '${C}'; DELETE FROM t_client WHERE lg_CLIENT_ID = '${C}';`);
const naissance = () => q(`SELECT IFNULL(DATE(dt_NAISSANCE), 'NULL') FROM t_client WHERE lg_CLIENT_ID = '${C}'`);
const JOURNAL = ENV_E2E.JOURNAL_SERVEUR || 'D:/payara5/payara5/glassfish/domains/domain1/logs/server.log';

(async () => {
  retirer();
  q(`INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, str_STATUT, dt_CREATED, dt_UPDATED, dt_NAISSANCE, lg_TYPE_CLIENT_ID)`
    + ` VALUES ('${C}', 'ZZNAISS', 'Essai', 'enable', NOW(), '2020-01-01', '1975-05-12', '6');`
    + `INSERT INTO t_compte_client (lg_COMPTE_CLIENT_ID, lg_CLIENT_ID, str_STATUT, dt_CREATED) VALUES ('${C}-cpt', '${C}', 'enable', NOW())`);
  const tailleJournal = fs.existsSync(JOURNAL) ? fs.statSync(JOURNAL).size : 0;
  const b = await ENV_E2E.lancer(chromium);
  try {
    const p = await (await b.newContext()).newPage();
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const envoi = (corps) => p.evaluate(async ([c, corps]) => (await fetch('../api/v1/ordonnance-client/client/' + c + '/identite',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) })).json(), [C, corps]);
    const lire = (u) => p.evaluate(async (u) => (await fetch(u)).json(), u);

    const droits = await lire('../api/v1/ordonnance-client/droits');
    ok('Capacité annoncée dans GET droits', droits.naissanceModifiable === true, JSON.stringify(droits));
    const dossier = await lire('../api/v1/ordonnance-client/client/' + C + '/dossier');
    ok('Capacité annoncée dans le dossier du client', dossier.client && dossier.client.naissanceModifiable === true, JSON.stringify(dossier.client && dossier.client.naissanceModifiable));

    let r = await envoi({ naissance: '1980-02-03' });
    ok('Sans « remplacer » : une date renseignée n\'est pas écrasée (comportement d\'avant)', r.success === false && naissance() === '1975-05-12', JSON.stringify(r));

    r = await envoi({ naissance: '1980-02-03', remplacer: true });
    ok('« remplacer » + date : date remplacée', r.success === true && naissance() === '1980-02-03', JSON.stringify(r));
    ok('Réponse : message et date AAAA-MM-JJ', r.message === 'Date de naissance modifiée.' && r.naissance === '1980-02-03', JSON.stringify(r));
    ok('Fiche datée du jour (dt_UPDATED)', q(`SELECT DATE(dt_UPDATED) = CURDATE() FROM t_client WHERE lg_CLIENT_ID = '${C}'`) === '1');

    const demain = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
    r = await envoi({ naissance: demain, remplacer: true });
    ok('Date à venir refusée, rien de changé', r.success === false && naissance() === '1980-02-03', JSON.stringify(r));
    r = await envoi({ naissance: '1981-02-31', remplacer: true });
    ok('Date impossible refusée', r.success === false && naissance() === '1980-02-03', JSON.stringify(r));
    r = await envoi({ naissance: '1850-01-01', remplacer: true });
    ok('Plus de 130 ans refusé', r.success === false && /130/.test(r.message || '') && naissance() === '1980-02-03', JSON.stringify(r));

    r = await envoi({ naissance: '', remplacer: true });
    ok('« remplacer » + date vide : date effacée', r.success === true && r.message === 'Date de naissance effacée.' && r.naissance === '' && naissance() === 'NULL', JSON.stringify(r));
    q(`UPDATE t_client SET dt_NAISSANCE = '1975-05-12' WHERE lg_CLIENT_ID = '${C}'`);
    r = await envoi({ naissance: null, remplacer: true });
    ok('« remplacer » + null : date effacée', r.success === true && naissance() === 'NULL', JSON.stringify(r));

    r = await envoi({ naissance: '1990-06-07' });
    ok('Après effacement, l\'ajout simple fonctionne toujours', r.success === true && naissance() === '1990-06-07', JSON.stringify(r));

    await p.waitForTimeout(1500);
    const ajout = fs.existsSync(JOURNAL) ? fs.readFileSync(JOURNAL, 'utf8').slice(tailleJournal) : '';
    const lignes = ajout.split(/\r?\n/).filter((l) => l.includes(C));
    ok('Journal : « Date de naissance du client … modifiée par … »', lignes.some((l) => /Date de naissance du client .* (modifi|effac)\S{1,3} par /.test(l)), lignes.slice(0, 2).join(' / '));
    ok('Journal : aucune date de naissance écrite', !/1980-02-03|1975-05-12|03\/02\/1980|12\/05\/1975/.test(ajout), '');
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack || x.message);
  } finally {
    await b.close();
    retirer();
    ok('Client d\'essai retiré', q(`SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID = '${C}'`) === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
