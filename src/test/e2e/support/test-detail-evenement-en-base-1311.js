/* DETAIL D'UN EVENEMENT DE CAISSE LISIBLE DEPUIS LE SERVEUR (rapport d'exploitation du 13/11, point 7).
 *
 * Constat chez appaul le 13/11 : 6 evenements du Centre de support affichaient au serveur « Fichier de detail
 * introuvable sur le disque » : l'evenement etait en base, mais son fichier de detail restait sur le disque de la
 * caisse qui l'avait constate. Seul un extrait de 4 000 caracteres etait garde en base.
 *
 * Vrai chemin : une erreur JavaScript survient dans l'ecran (lancee dans la page : window.onerror la capte et la
 * remonte, comme sur une caisse). Le serveur ecrit le fichier de detail et l'evenement.
 *  - Rapprochement : fichier de detail = detail garde en base, caractere par caractere ;
 *  - le fichier est ensuite retire du disque (comme s'il etait reste sur la caisse) : le detail affiche par le Centre
 *    de support (route support/diagnostic/log, celle de l'ecran) est identique au fichier ;
 *  - Bilan : un evenement, une occurrence, une anomalie ; rien d'autre ne porte la marque.
 * Deux erreurs differentes (pile courte, et message long avec accents) : deux evenements, chacun rapproche.
 * Tout ce que le test pose est retire (evenements, occurrences, anomalies, fichiers).
 * Lancement seul : node src/test/e2e/support/test-detail-evenement-en-base-1311.js
 */
const fs = require('fs');
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion } = require('../outils/vues');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const b64 = (s) => (s && s !== 'NULL' ? Buffer.from(s.replace(/\\n|\s/g, ''), 'base64').toString('utf8') : null);
const MARQUE = 'E2E-DET-1311-' + Date.now().toString(36);

function retirer() {
  const lignes = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT_WS('|', id, IFNULL(TO_BASE64(log_ref), '')) SEPARATOR ';'), '') FROM t_application_event WHERE message_court LIKE '%${MARQUE}%'`)
    .split(';').filter(Boolean).map((l) => l.split('|'));
  lignes.forEach(([id, ref]) => {
    const f = b64(ref);
    if (f) { try { fs.unlinkSync(f); } catch (e) { /* deja retire */ } }
    exec(`DELETE FROM t_application_event_occurrence WHERE event_id = '${id}'; DELETE FROM t_application_event WHERE id = '${id}';`);
  });
  exec(`DELETE FROM t_anomalie_employe WHERE message LIKE '%${MARQUE}%';`);
}

async function attendre(f, ms) {
  const fin = Date.now() + ms;
  for (;;) {
    const v = f();
    if (v || Date.now() > fin) { return v; }
    await new Promise((r) => setTimeout(r, 500));
  }
}

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  try {
    const ctx = await b.newContext({ viewport: { width: 1600, height: 950 } });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => err.push(e.message));
    await connexion(p, ENV_E2E.LOGIN_SUPPORT, 'e2etest');
    await p.waitForTimeout(3000);

    const cas = [
      { nom: 'pile courte', message: MARQUE + ' A : lecture de la remise impossible' },
      { nom: 'message long avec accents', message: MARQUE + ' B : ' + 'référence à vérifier, quantité reçue ≠ commandée ; '.repeat(60) },
    ];
    for (const c of cas) {
      /* l'erreur survient dans l'ecran, hors de tout try : window.onerror la remonte */
      await p.evaluate((m) => { setTimeout(() => { throw new Error(m); }, 0); }, c.message);
      const ligne = await attendre(() => q(`SELECT CONCAT_WS('|', id, occurrences, IFNULL(TO_BASE64(log_ref), ''), IFNULL(TO_BASE64(stack_extrait), '')) FROM t_application_event`
        + ` WHERE message_court LIKE '%${c.message.slice(0, 40)}%' LIMIT 1`), 20000);
      ok(`${c.nom} : événement enregistré`, !!ligne, ligne ? 'oui' : 'aucun');
      if (!ligne) { continue; }
      const [id, occ, refB64, extraitB64] = ligne.split('|');
      const fichier = b64(refB64);
      const enBase = b64(extraitB64);
      const surDisque = fichier && fs.existsSync(fichier) ? fs.readFileSync(fichier, 'utf8') : null;
      ok(`${c.nom} : fichier de détail écrit`, !!surDisque && surDisque.includes(c.message.slice(0, 40)), fichier);
      ok(`${c.nom} : rapprochement fichier = détail en base`, surDisque !== null && enBase === surDisque,
        'fichier ' + (surDisque || '').length + ' car., base ' + (enBase || '').length + ' car.');
      /* le fichier reste sur la caisse : le serveur ne le trouve pas */
      if (fichier && fs.existsSync(fichier)) { fs.renameSync(fichier, fichier + '.ailleurs'); }
      const affiche = await p.evaluate(async (e) => { const r = await fetch('../api/v1/support/diagnostic/log?eventId=' + encodeURIComponent(e)); return { status: r.status, texte: await r.text() }; }, id);
      if (fichier && fs.existsSync(fichier + '.ailleurs')) { fs.renameSync(fichier + '.ailleurs', fichier); }
      ok(`${c.nom} : fichier absent du serveur, le Centre de support affiche le même détail que le fichier`, affiche.status === 200 && affiche.texte === surDisque,
        affiche.status + ' ' + affiche.texte.slice(0, 160).replace(/\n/g, ' / '));
      const nbOcc = q(`SELECT COUNT(*) FROM t_application_event_occurrence WHERE event_id = '${id}'`);
      const nbAno = q(`SELECT COUNT(*) FROM t_anomalie_employe WHERE message LIKE '%${c.message.slice(0, 40)}%'`);
      ok(`${c.nom} : bilan, un événement, une occurrence, une anomalie`, occ === '1' && nbOcc === '1' && nbAno === '1', `occurrences ${occ}/${nbOcc}, anomalies ${nbAno}`);
    }
    const total = q(`SELECT COUNT(*) FROM t_application_event WHERE message_court LIKE '%${MARQUE}%'`);
    ok('Bilan : deux erreurs différentes, deux événements', total === '2', total);
    ok('Aucune autre erreur JavaScript que les deux lancées', err.length === 2 && err.every((m) => m.includes(MARQUE)), err.join(' || ').slice(0, 300));
    await ctx.close();
  } finally {
    await b.close();
    retirer();
  }
  ok('Données d\'essai retirées', q(`SELECT COUNT(*) FROM t_application_event WHERE message_court LIKE '%${MARQUE}%'`) === '0'
    && q(`SELECT COUNT(*) FROM t_anomalie_employe WHERE message LIKE '%${MARQUE}%'`) === '0');
  const echecs = res.filter((r) => !r.c).length;
  console.log('\n' + (res.length - echecs) + '/' + res.length + ' réussis');
  process.exitCode = echecs ? 1 : 0;
})().catch((e) => { console.error('FATAL', e); try { retirer(); } catch (_) { /* rien */ } process.exit(2); });
