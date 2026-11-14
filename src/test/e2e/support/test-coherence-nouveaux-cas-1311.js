/* VEILLE DE COHERENCE : NOUVEAUX CAS SEPARES DE L'HISTORIQUE (rapport d'exploitation du 13/11, point 11).
 *
 * Constat chez appaul : chaque nuit, la veille remontait tout l'historique (10 factures sans detail, 2 922 commandes
 * de 2024...) sans dire ce qui etait nouveau. Les 10 factures vides venaient de l'ancienne version (5.9.7, jusqu'au
 * 11/11), qui n'avait pas encore la garde « aucun bon sur la periode : pas de facture » de la facturation groupee.
 *
 * Vrai chemin : Centre de support > Sante application > « Controles de coherence » > Oui ; on lit la fenetre de
 * resultat, ligne « FACTURE_SANS_DETAIL ». Quatre passages :
 *  1. passage de reference (l'historique devient connu) ;
 *  2. deux factures vides posees (A, B) : 2 nouveaux, le reste connu ;
 *  3. B retiree, C posee : 1 nouveau (C), A connue, B oubliee ;
 *  4. B reposee : B est de nouveau « nouvelle », A et C connues.
 * Rapprochement a chaque passage : nombre de cas a l'ecran = requete du controle en base = detail de l'evenement
 * (support/diagnostic/log) ; nouveaux a l'ecran = section « Nouveaux » du detail = identifiants attendus.
 * Bilan : la memoire du controle (t_support_controle_cas) contient exactement les cas presents ; un seul evenement
 * COHERENCE pour le controle ; aucun ticket (controle en observation).
 * Tout est retire : factures posees, memoire restauree a l'identique, tickets crees pendant l'essai.
 * Lancement seul : node src/test/e2e/support/test-coherence-nouveaux-cas-1311.js
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer, repondre } = require('../outils/vues');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const MARQUE = 'E2EFSD' + Date.now().toString(36);
const ID = (x) => MARQUE + x;
const SAUVE = 't_support_controle_cas_e2e_' + Date.now().toString(36);
const CODE = 'FACTURE_SANS_DETAIL';
let memoireSauvee = false;
let ticketsAvant = '';

function poser(x) {
  exec(`INSERT INTO t_facture (lg_FACTURE_ID, str_CODE_FACTURE, dt_DATE_FACTURE, dt_DEBUT_FACTURE, dt_FIN_FACTURE, str_STATUT, template, dt_CREATED, int_NB_DOSSIER, dbl_MONTANT_CMDE)
        VALUES ('${ID(x)}', '${ID(x)}', NOW(), CURDATE(), CURDATE(), 'enable', 0, NOW(), 0, 0)`);
}
function retirerFacture(x) { exec(`DELETE FROM t_facture WHERE lg_FACTURE_ID = '${ID(x)}'`); }

function nettoyer() {
  exec(`DELETE FROM t_facture WHERE lg_FACTURE_ID LIKE '${MARQUE}%'`);
  if (memoireSauvee) {
    exec(`DELETE FROM t_support_controle_cas; INSERT INTO t_support_controle_cas SELECT * FROM ${SAUVE}; DROP TABLE ${SAUVE};`);
    memoireSauvee = false;
  }
  if (ticketsAvant) {
    exec(`DELETE FROM t_support_ticket WHERE id NOT IN (SELECT id FROM ${ticketsAvant}); DROP TABLE ${ticketsAvant};`);
    ticketsAvant = '';
  }
}

/* le controle tel que la veille l'execute (meme requete, en base) */
function casEnBase() {
  const sql = q(`SELECT TO_BASE64(requete_sql) FROM t_support_controle WHERE code = '${CODE}'`);
  const requete = Buffer.from(sql.replace(/\\n|\s/g, ''), 'base64').toString('utf8').trim().replace(/;$/, '');
  return q(`SELECT COUNT(*) FROM (${requete} LIMIT 500) x`);
}
const memoire = () => q(`SELECT IFNULL(GROUP_CONCAT(cas_id ORDER BY cas_id SEPARATOR ','), '') FROM t_support_controle_cas WHERE code = '${CODE}' AND cas_id LIKE '${MARQUE}%'`);

async function passage(p) {
  await cliquer(p, '#btnCoherence');
  await repondre(p, 'yes');
  await p.waitForFunction(() => Ext.ComponentQuery.query('window[title=Résultat des contrôles de cohérence]').some((w) => w.isVisible()), null, { timeout: 300000, polling: 1000 });
  const ligne = await p.evaluate((code) => {
    const w = Ext.ComponentQuery.query('window[title=Résultat des contrôles de cohérence]').filter((x) => x.isVisible())[0];
    const lignes = Array.from(w.getEl().dom.querySelectorAll('tr')).map((tr) => Array.from(tr.querySelectorAll('td,th')).map((c) => c.innerText.trim()));
    const entete = lignes[0];
    return { entete, lignes: lignes.slice(1) };
  }, CODE);
  const libelle = q(`SELECT libelle FROM t_support_controle WHERE code = '${CODE}'`);
  const l = ligne.lignes.find((x) => x[0] === libelle) || [];
  const iNouveaux = ligne.entete.indexOf('dont nouveaux');
  await p.locator('.x-window .x-tool-close').filter({ visible: true }).first().click().catch(() => {});
  await p.waitForTimeout(800);
  return { cas: l[1], nouveaux: iNouveaux >= 0 ? l[iNouveaux] : undefined, entete: ligne.entete.join('|') };
}

async function detail(p) {
  const id = q(`SELECT id FROM t_application_event WHERE url_ou_ecran = 'controle:${CODE}' AND type = 'COHERENCE' LIMIT 1`);
  const nb = q(`SELECT COUNT(*) FROM t_application_event WHERE url_ou_ecran = 'controle:${CODE}' AND type = 'COHERENCE'`);
  const r = await p.evaluate(async (e) => { const x = await fetch('../api/v1/support/diagnostic/log?eventId=' + encodeURIComponent(e)); return x.text(); }, id);
  const total = (r.match(new RegExp('Controle : ' + 'FACTURE_SANS_DETAIL' + ' \\((\\d+) cas')) || [])[1];
  const sectionNouveaux = (r.split(/Nouveaux depuis le passage precedent \(\d+\) :\n/)[1] || '').split(/\nDeja connus/)[0] || '';
  const sectionConnus = r.split(/Deja connus \(\d+\) :\n/)[1] || '';
  const marques = (t) => [...new Set(t.match(new RegExp(MARQUE + '[A-Z]', 'g')) || [])].sort().join(','); /* l'identifiant revient dans le contexte « Facture <code> » */
  return { nbEvenements: nb, total, nouveaux: marques(sectionNouveaux), connus: marques(sectionConnus), nbNouveaux: (r.match(/Nouveaux depuis le passage precedent \((\d+)\)/) || [])[1] };
}

(async () => {
  exec(`CREATE TABLE IF NOT EXISTS t_support_controle_cas (code VARCHAR(60) NOT NULL, cas_id VARCHAR(191) NOT NULL, premier_vu DATETIME NOT NULL, PRIMARY KEY (code, cas_id));`
    + ` CREATE TABLE ${SAUVE} AS SELECT * FROM t_support_controle_cas;`);
  memoireSauvee = true;
  ticketsAvant = 't_support_ticket_e2e_' + Date.now().toString(36);
  exec(`CREATE TABLE ${ticketsAvant} AS SELECT id FROM t_support_ticket;`);
  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  try {
    const ctx = await b.newContext({ viewport: { width: 1600, height: 950 } });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => err.push(e.message));
    await connexion(p, ENV_E2E.LOGIN_SUPPORT, 'e2etest');
    await ouvrirMenu(p, 'CENTRE DE SUPPORT', 'Santé application');
    await p.waitForFunction(() => Ext.ComponentQuery.query('#btnCoherence').some((c) => c.isVisible(true)), null, { timeout: 60000 });

    const r1 = await passage(p);
    ok('Passage de référence : l\'écran a une colonne « dont nouveaux »', /dont nouveaux/.test(r1.entete), r1.entete);

    const etapes = [
      { nom: '2 factures vides posées (A, B)', faire: () => { poser('A'); poser('B'); }, nouveaux: 'A,B', connus: '', memoire: 'A,B' },
      { nom: 'B retirée, C posée', faire: () => { retirerFacture('B'); poser('C'); }, nouveaux: 'C', connus: 'A', memoire: 'A,C' },
      { nom: 'B reposée', faire: () => { poser('B'); }, nouveaux: 'B', connus: 'A,C', memoire: 'A,B,C' },
    ];
    const m = (s) => s.split(',').filter(Boolean).map(ID).sort().join(',');
    for (const e of etapes) {
      e.faire();
      const enBase = casEnBase();
      const r = await passage(p);
      const d = await detail(p);
      ok(`${e.nom} : rapprochement écran = base = détail de l'événement`, String(r.cas) === enBase && d.total === enBase,
        `écran ${r.cas}, base ${enBase}, détail ${d.total}`);
      ok(`${e.nom} : nouveaux à l'écran = section « Nouveaux » du détail = ${e.nouveaux}`, String(r.nouveaux) === String(e.nouveaux.split(',').length)
        && d.nbNouveaux === String(r.nouveaux) && d.nouveaux === m(e.nouveaux), `écran ${r.nouveaux}, détail ${d.nbNouveaux} (${d.nouveaux})`);
      ok(`${e.nom} : déjà connus = ${e.connus || 'aucune'}`, d.connus === m(e.connus), d.connus);
      ok(`${e.nom} : bilan, mémoire du contrôle = cas présents`, memoire() === m(e.memoire), memoire());
      ok(`${e.nom} : un seul événement COHÉRENCE pour le contrôle`, d.nbEvenements === '1', d.nbEvenements);
    }
    const nouveauxTickets = q(`SELECT COUNT(*) FROM t_support_ticket WHERE id NOT IN (SELECT id FROM ${ticketsAvant}) AND event_signature = '${CODE}'`);
    ok('Contrôle en observation : aucun ticket pour les factures vides', nouveauxTickets === '0', nouveauxTickets);
    /* les factures retirees, un dernier passage remet l'evenement du controle dans son etat reel */
    exec(`DELETE FROM t_facture WHERE lg_FACTURE_ID LIKE '${MARQUE}%'`);
    await passage(p);
    const apres = await detail(p);
    ok('Après retrait : plus aucune facture d’essai dans le détail de l’événement', !apres.nouveaux && !apres.connus, apres.nouveaux + ' / ' + apres.connus);
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' || '));
    await ctx.close();
  } finally {
    await b.close();
    nettoyer();
  }
  ok('Données d\'essai retirées, mémoire restaurée', q(`SELECT COUNT(*) FROM t_facture WHERE lg_FACTURE_ID LIKE '${MARQUE}%'`) === '0'
    && q(`SELECT COUNT(*) FROM t_support_controle_cas WHERE cas_id LIKE '${MARQUE}%'`) === '0'
    && q(`SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name LIKE 't_support_%_e2e_%'`) === '0');
  const echecs = res.filter((r) => !r.c).length;
  console.log('\n' + (res.length - echecs) + '/' + res.length + ' réussis');
  process.exitCode = echecs ? 1 : 0;
})().catch((e) => { console.error('FATAL', e); try { nettoyer(); } catch (_) { /* rien */ } process.exit(2); });
