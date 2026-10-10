/* CONTROLE DE SAISIE A L'ENREGISTREMENT (demande du 07/10) : ce que le serveur fait quand on lui envoie n'importe quoi.
 *
 * Les ecrans controlent une partie de la saisie, mais le serveur ne doit jamais compter dessus : un autre ecran, un
 * ancien poste ou une erreur de programmation peuvent lui envoyer une valeur absurde. On envoie donc, comme le ferait
 * l'ecran, des valeurs absurdes aux enregistrements principaux, et on verifie :
 *   - jamais d'erreur interne (HTTP 500) ;
 *   - les valeurs impossibles sont REFUSEES avec un message (nom vide, prix en lettres ou negatif, dates inversees...) ;
 *   - ce qui est accepte est enregistre tel quel, sans troncature silencieuse ni date decalee.
 * Fiches visees : client rapide (vente), fiche article (creation), employe et absence (RH), preferences.
 * Tout ce qui est cree par l'essai est retire a la fin (marqueur ZZSAISIE).
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const BASE = process.env.DB_TEST || 'capitale';
const q = (sql) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', sql], { encoding: 'utf8' }).trim();

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const M = 'ZZSAISIE';
const suffixe = String(Date.now()).slice(-6);
const LONG = M + 'X'.repeat(3000);

function nettoyer() {
  /* clients */
  const clients = q("SELECT GROUP_CONCAT(CONCAT('''', lg_CLIENT_ID, '''')) FROM t_client WHERE str_FIRST_NAME LIKE '" + M + "%' OR str_LAST_NAME LIKE '" + M + "%'");
  if (clients && clients !== 'NULL') {
    q('DELETE FROM t_compte_client WHERE lg_CLIENT_ID IN (' + clients + ')');
    q('DELETE FROM t_client WHERE lg_CLIENT_ID IN (' + clients + ')');
  }
  /* articles */
  const ids = q("SELECT GROUP_CONCAT(CONCAT('''', lg_FAMILLE_ID, '''')) FROM t_famille WHERE str_NAME LIKE '" + M + "%' OR str_DESCRIPTION LIKE '" + M + "%' OR int_CIP LIKE '93" + suffixe + "%'");
  if (ids && ids !== 'NULL') {
    const tables = q("SELECT GROUP_CONCAT(TABLE_NAME) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = '" + BASE + "' AND COLUMN_NAME = 'lg_FAMILLE_ID' AND TABLE_NAME <> 't_famille'"
      + " AND TABLE_NAME IN (SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = '" + BASE + "' AND TABLE_TYPE = 'BASE TABLE')").split(',');
    let sql = 'SET FOREIGN_KEY_CHECKS = 0;';
    tables.forEach((t) => { sql += ' DELETE FROM `' + t + '` WHERE lg_FAMILLE_ID IN (' + ids + ');'; });
    q(sql + ' DELETE FROM t_famille WHERE lg_FAMILLE_ID IN (' + ids + '); SET FOREIGN_KEY_CHECKS = 1;');
  }
  /* RH */
  q("DELETE a FROM t_absence a JOIN t_employe e ON e.id = a.employe_id WHERE e.nom LIKE '" + M + "%'");
  q("DELETE FROM t_employe WHERE nom LIKE '" + M + "%'");
  q("DELETE FROM t_preference_utilisateur WHERE str_CLE LIKE 'zzsaisie%'");
}

(async () => {
  nettoyer();
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage();
  const supportAvant = Number(q('SELECT COALESCE(SUM(occurrences), 0) FROM t_application_event'));
  /* envoi comme l'ecran : rend {s: statut HTTP, o: reponse lue (ou texte)} */
  const envoyer = (methode, url, corps, type) => p.evaluate(async ([m, u, c, t]) => {
    const r = await fetch(u, { method: m, headers: { 'Content-Type': t }, body: c });
    const x = await r.text(); let o; try { o = JSON.parse(x); } catch (e) { o = { brut: x.slice(0, 200) }; }
    return { s: r.status, o };
  }, [methode, url, corps, type]);
  const json = (m, u, o) => envoyer(m, u, JSON.stringify(o), 'application/json');
  const formulaire = (u, o) => envoyer('POST', u, new URLSearchParams(o).toString(), 'application/x-www-form-urlencoded');
  /* refus : statut 4xx ou success faux ; les anciens services repondent success « 0 » */
  const refus = (r) => r.s < 500 && (r.s >= 400 || (r.o && (r.o.success === false || r.o.success === '0' || r.o.success === 0)));
  const message = (r) => r.o && (r.o.message || r.o.msg || r.o.errors || '');
  const resume = (r) => r.s + ' ' + JSON.stringify(r.o).slice(0, 160);
  const tous = [];
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });

    /* ------------------------------------------------ client rapide (ecran de vente) */
    const type = q("SELECT lg_TYPE_CLIENT_ID FROM t_type_client ORDER BY lg_TYPE_CLIENT_ID LIMIT 1");
    const client = (o) => json('POST', '../api/v1/client/add/lambda', Object.assign({ lgTYPECLIENTID: type, strSEXE: 'M' }, o));
    let r = await client({ strFIRSTNAME: '', strLASTNAME: '' }); tous.push(r);
    ok('Client : nom et prénom vides refusés', refus(r) && q("SELECT COUNT(*) FROM t_client WHERE dt_CREATED >= NOW() - INTERVAL 1 MINUTE AND COALESCE(str_FIRST_NAME, '') = '' AND COALESCE(str_LAST_NAME, '') = ''") === '0', resume(r));
    r = await client({ strFIRSTNAME: LONG, strLASTNAME: M }); tous.push(r);
    ok('Client : nom de 3 000 caractères refusé proprement (pas d\'erreur interne)', refus(r) && /long|caract/i.test(message(r)), resume(r));
    r = await client({ strFIRSTNAME: M + 'DATE', strLASTNAME: M, dtNAISSANCE: '31/02/2026' }); tous.push(r);
    const naiss = q("SELECT COALESCE(DATE_FORMAT(dt_NAISSANCE, '%Y-%m-%d'), 'NULL') FROM t_client WHERE str_FIRST_NAME = '" + M + "DATE' LIMIT 1");
    ok('Client : date de naissance impossible (31/02) refusée ou ignorée, jamais décalée', r.s < 500 && (refus(r) || naiss === 'NULL'), resume(r) + ' / ' + naiss);
    r = await client({ strFIRSTNAME: M + 'FUTUR', strLASTNAME: M, dtNAISSANCE: '2099-01-01' }); tous.push(r);
    const futur = q("SELECT COALESCE(DATE_FORMAT(dt_NAISSANCE, '%Y-%m-%d'), 'NULL') FROM t_client WHERE str_FIRST_NAME = '" + M + "FUTUR' LIMIT 1");
    ok('Client : date de naissance dans le futur jamais enregistrée', r.s < 500 && (refus(r) || futur === 'NULL'), resume(r) + ' / ' + futur);
    r = await client({ strFIRSTNAME: M + '<script>alert(1)</script>', strLASTNAME: "O'Brien" }); tous.push(r);
    const brut = q("SELECT str_FIRST_NAME FROM t_client WHERE str_FIRST_NAME LIKE '" + M + "<script>%' LIMIT 1");
    /* retours du 10/10 : nom enregistre en majuscules */
    ok('Client : balise et apostrophe enregistrées comme du texte (en majuscules), pas de code', r.s < 500 && (refus(r) || brut === M + '<SCRIPT>ALERT(1)</SCRIPT>'), resume(r) + ' / ' + brut);
    r = await client({ strFIRSTNAME: M + 'TYPE', strLASTNAME: M, lgTYPECLIENTID: 'type-inexistant' }); tous.push(r);
    ok('Client : type de client inexistant refusé proprement', refus(r), resume(r));

    /* ------------------------------------------------ fiche article (creation) */
    const grossiste = q("SELECT lg_GROSSISTE_ID FROM t_grossiste WHERE str_STATUT = 'enable' ORDER BY str_LIBELLE LIMIT 1");
    const famArt = q("SELECT lg_FAMILLEARTICLE_ID FROM t_famillearticle WHERE str_STATUT = 'enable' ORDER BY str_LIBELLE LIMIT 1");
    const tva = q('SELECT lg_CODE_TVA_ID FROM t_code_tva ORDER BY lg_CODE_TVA_ID LIMIT 1');
    const zone = q("SELECT lg_ZONE_GEO_ID FROM t_zone_geographique WHERE lg_EMPLACEMENT_ID = '1' LIMIT 1");
    let n = 0;
    const article = (o) => formulaire('../api/v1/fichearticle/enregistrer?mode=create', Object.assign({
      lg_GROSSISTE_ID: grossiste, int_PAF: '1000', int_PAT: '1000', int_PRICE: '1500', lg_FAMILLEARTICLE_ID: famArt, lg_ZONE_GEO_ID: zone,
      lg_CODE_TVA_ID: tva, int_T: '', int_EAN13: '', str_CODE_REMISE: '0', int_CIP: '93' + suffixe + (n++), str_DESCRIPTION: M + ' ARTICLE ' + n }, o));
    const cree = (cip) => q("SELECT COUNT(*) FROM t_famille WHERE int_CIP = '" + cip + "'") !== '0';
    let cip = '93' + suffixe + n; r = await article({ int_PRICE: 'abc' }); tous.push(r);
    ok('Article : prix de vente en lettres refusé', refus(r) && !cree(cip), resume(r));
    cip = '93' + suffixe + n; r = await article({ int_PRICE: '-1500' }); tous.push(r);
    ok('Article : prix de vente négatif refusé', refus(r) && !cree(cip), resume(r));
    cip = '93' + suffixe + n; r = await article({ int_PAF: '-5', int_PAT: '-5' }); tous.push(r);
    ok('Article : prix d\'achat négatif refusé', refus(r) && !cree(cip), resume(r));
    cip = '93' + suffixe + n; r = await article({ str_DESCRIPTION: LONG }); tous.push(r);
    ok('Article : libellé de 3 000 caractères refusé proprement', refus(r) && !cree(cip), resume(r));
    cip = '93' + suffixe + n; r = await article({ str_DESCRIPTION: '' }); tous.push(r);
    ok('Article : libellé vide refusé', refus(r) && !cree(cip), resume(r));
    cip = '93' + suffixe + n; r = await article({ int_PAF: '99999999999999' }); tous.push(r);
    ok('Article : prix d\'achat démesuré refusé proprement', refus(r) && !cree(cip), resume(r));

    /* ------------------------------------------------ RH : employe et absence */
    const employe = (o) => json('POST', '../api/v1/rh/employes', Object.assign({ matricule: M + suffixe, nom: M, prenoms: 'Essai', statut: 'ACTIF', dtEntree: '2026-01-05' }, o));
    r = await employe({ nom: '' }); tous.push(r);
    ok('Employé : nom vide refusé', refus(r), resume(r));
    r = await employe({ nom: LONG }); tous.push(r);
    ok('Employé : nom de 3 000 caractères refusé proprement', refus(r), resume(r));
    r = await employe({ dtEntree: 'abc' }); tous.push(r);
    ok('Employé : date d\'entrée illisible refusée', refus(r), resume(r));
    r = await employe({ dtEntree: '2026-05-01', dtSortie: '2026-01-01' }); tous.push(r);
    ok('Employé : sortie avant l\'entrée refusée', refus(r), resume(r));
    r = await employe({ matricule: M + 'OK' + suffixe }); tous.push(r);
    const emp = q("SELECT id FROM t_employe WHERE matricule = '" + M + 'OK' + suffixe + "'");
    ok('Employé : une fiche correcte est acceptée (contrôle, pas blocage)', r.s === 200 && r.o.success !== false && !!emp, resume(r));
    const absence = (o) => json('POST', '../api/v1/rh/absences', Object.assign({ employeId: emp, type: 'CONGE', debut: '2026-11-10', fin: '2026-11-12', motif: M }, o));
    r = await absence({ debut: '2026-11-20', fin: '2026-11-10' }); tous.push(r);
    ok('Absence : fin avant le début refusée', refus(r), resume(r));
    r = await absence({ debut: '31/02/2026', fin: 'abc' }); tous.push(r);
    ok('Absence : dates illisibles refusées', refus(r), resume(r));
    r = await absence({ type: "TYPE'INEXISTANT" }); tous.push(r);
    ok('Absence : type inconnu refusé', refus(r), resume(r));
    r = await absence({ employeId: 'inexistant' }); tous.push(r);
    ok('Absence : employé inexistant refusé', refus(r), resume(r));
    r = await absence({ motif: LONG }); tous.push(r);
    ok('Absence : motif de 3 000 caractères refusé proprement', refus(r) && /trop long/.test(message(r)), resume(r));

    /* ------------------------------------------------ preferences (corps enorme) */
    r = await envoyer('PUT', '../api/v1/preferences/zzsaisie-enorme', JSON.stringify({ x: 'y'.repeat(2 * 1024 * 1024) }), 'application/json'); tous.push(r);
    ok('Préférences : valeur de 2 Mo refusée proprement', refus(r), resume(r));
    r = await envoyer('PUT', '../api/v1/preferences/zzsaisie-illisible', '{pas du json', 'application/json'); tous.push(r);
    ok('Préférences : contenu illisible refusé proprement', refus(r), resume(r));

    ok('Aucune erreur interne (HTTP 500) sur ' + tous.length + ' enregistrements absurdes', tous.every((x) => x.s < 500), tous.filter((x) => x.s >= 500).map(resume).join(' | '));
    ok('Aucune nouvelle erreur au Centre de support', Number(q('SELECT COALESCE(SUM(occurrences), 0) FROM t_application_event')) === supportAvant);
  } catch (e) {
    ok('Déroulé sans exception', false, e.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Données d\'essai retirées', q("SELECT (SELECT COUNT(*) FROM t_client WHERE str_FIRST_NAME LIKE '" + M + "%' OR str_LAST_NAME LIKE '" + M + "%') + (SELECT COUNT(*) FROM t_famille WHERE str_DESCRIPTION LIKE '" + M + "%' OR str_NAME LIKE '" + M + "%') + (SELECT COUNT(*) FROM t_employe WHERE nom LIKE '" + M + "%')") === '0');
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
