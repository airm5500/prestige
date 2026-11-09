/* Correspondance produits grossistes / Prestige, lot 5 : disponibilite a la demande, vue par produit.
   Un faux grossiste PharmaML tourne pendant le test (serveur HTTP local, reponse REP_INFO_PRODUIT : code envoye pair
   -> non disponible avec motif, date de retour et remplacant ; impair -> disponible ; chemin /panne -> erreur 500).
   Le grossiste regle est LABOREX-CI YOP ; ses URL et reglages sont remis a la fin.
   Sur le vrai ecran « Correspondance grossistes » > « Par produit » > « Vérifier » :
   - reglage 0 (defaut, comportement d'avant) : PharmaML seul ; une demande d'INFORMATION, jamais une COMMANDE ;
     ecran = base (t_disponibilite_produit) = faux grossiste : statut, detail, heure de lecture ;
   - cache : second « Vérifier » dans les 15 minutes -> aucun nouvel appel, lecture rendue avec sa date ;
     « Relire » -> nouvel appel et nouvelle ligne en base ;
   - reglage 1 (regle a l'ecran « Sources de disponibilité », confirme dans le bouton) : extranet seul -> « absente »,
     aucun appel PharmaML, rien d'ecrit ;
   - reglage 2 : les deux reponses, chacune avec sa source ;
   - panne du grossiste : echec affiche, aucune valeur inventee, aucune ligne ecrite ;
   - API derniere lecture = base ; reglage relu en base ; refus sans session (401), reglage hors 0..2 refuse (400).
   Bilan : seules les lignes de disponibilite attendues sont ecrites (une par appel reel), rien d'autre. */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const http = require('http');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }

const URL_PRESTIGE = process.env.E2E_URL || 'http://localhost:8080/prestige';
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, BASE, '--raw', '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 28 }).replace(/\r\n/g, '\n').trim();
const lignes = (s) => { const t = q(s); return t ? t.split('\n').map((l) => l.split('\t')) : []; };
const PORT = 18766;
const GL = q("SELECT lg_GROSSISTE_ID FROM t_grossiste WHERE str_LIBELLE = 'LABOREX-CI YOP' AND str_STATUT = 'enable' LIMIT 1");
const colonne = q("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_grossiste' AND COLUMN_NAME = 'int_SOURCE_DISPO'") === '1';

const recus = [];
function repondre(xml) {
  const v3 = /SRP_ENVELOPPE/.test(xml) && !/CSRP_ENVELOPPE/.test(xml);
  const ls = [...xml.matchAll(/<LIGNE_REQ_INFO_PRODUIT Num_Ligne="(\d+)"[^>]*Code_Produit="([^"]*)"/g)];
  const ns = v3 ? 'urn:x-srp:fr.srp.protocole' : 'urn:x-csrp:fr.csrp.protocole', env = v3 ? 'SRP_ENVELOPPE' : 'CSRP_ENVELOPPE';
  return '<?xml version="1.0" encoding="UTF-8"?><' + env + ' xmlns="' + ns + ':enveloppe"><CORPS><MESSAGE_REPARTITEUR xmlns="' + ns + ':message"><CORPS><REP_INFO_PRODUIT><NORMALE>'
    + ls.map((m) => { const pair = Number(m[2].slice(-1)) % 2 === 0;
      return '<LIGNE_REP_INFO_PRODUIT Num_Ligne="' + m[1] + '" Type_Codification="CIP39" Code_Produit="' + m[2] + '" Disponibilite="' + (pair ? 'Non' : 'Oui') + '">'
        + (pair ? '<INDISPONIBILITE Code_Reponse="4" Additif="MANQUE FABRICANT"><INFO_DISPO Date_Mise_Dispo="2026-11-20" Quantite_Dispo="12"/><PRODUIT_REMPLACANT Type_Remplacement="EQ" Code_Produit="1234567" Designation="GENERIQUE E2E"/></INDISPONIBILITE>' : '<PRIX_N Nature="PFHT" Valeur="1000"/>')
        + '</LIGNE_REP_INFO_PRODUIT>'; }).join('')
    + '</NORMALE></REP_INFO_PRODUIT></CORPS></MESSAGE_REPARTITEUR></CORPS></' + env + '>';
}
const serveur = http.createServer((req, rep) => { let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => {
  recus.push({ chemin: req.url, xml: b });
  if (req.url === '/panne') { rep.writeHead(500, { 'Content-Type': 'text/plain' }); rep.end('panne'); return; }
  rep.writeHead(200, { 'Content-Type': 'text/xml' }); rep.end(repondre(b)); }); });

/* 3 fiches actives, au CIP de 7 chiffres, sans correspondance ni lecture chez Laborex Yopougon ; le test pose lui-meme
   leurs correspondances validees (ligne a l'ecran) et les retire a la fin : il ne depend pas d'un calcul anterieur */
const CODES5 = ['E2ECG5A', 'E2ECG5B', 'E2ECG5C'];
function fiches() {
  return lignes("SELECT f.lg_FAMILLE_ID, f.int_CIP FROM t_famille f"
    + " WHERE f.str_STATUT = 'enable' AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 AND f.int_CIP REGEXP '^[0-9]{7}$'"
    + " AND (SELECT COUNT(*) FROM t_famille x WHERE x.int_CIP = f.int_CIP AND x.str_STATUT = 'enable') = 1"
    + " AND NOT EXISTS (SELECT 1 FROM correspondance_grossiste c WHERE c.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND c.cle_grossiste = '" + GL + "')"
    + " AND NOT EXISTS (SELECT 1 FROM t_disponibilite_produit d WHERE d.lg_FAMILLE_ID = f.lg_FAMILLE_ID)"
    + " ORDER BY f.lg_FAMILLE_ID LIMIT 3 OFFSET 200").map(([f, cip]) => ({ f, cip }));
}

let sauve = null, F = [], debut = '';
let poses = false;
function retirer() {
  if (poses) { q(`DELETE FROM correspondance_grossiste WHERE cle_grossiste = '${GL}' AND code_grossiste IN ('${CODES5.join("','")}')`); }
  if (F.length && debut) { q(`DELETE FROM t_disponibilite_produit WHERE lg_FAMILLE_ID IN ('${F.join("','")}') AND lg_GROSSISTE_ID = '${GL}' AND dt_CREATED >= '${debut}'`); }
  if (sauve) {
    q(`UPDATE t_grossiste SET str_URL_PHARMAML = ${sauve[0] === 'NULL' ? 'NULL' : "'" + sauve[0] + "'"}, str_PHARMAML_VERSION_INFO = '${sauve[1]}', int_PHARMAML_DISPO = ${sauve[2]}`
      + (colonne ? `, int_SOURCE_DISPO = ${sauve[3]}` : '') + ` WHERE lg_GROSSISTE_ID = '${GL}'`);
  }
}
const nbLignes = () => Number(q(`SELECT COUNT(*) FROM t_disponibilite_produit WHERE lg_FAMILLE_ID IN ('${F.join("','")}') AND lg_GROSSISTE_ID = '${GL}' AND dt_CREATED >= '${debut}'`));
const derniere = (f) => lignes(`SELECT str_STATUT, str_SOURCE, DATE_FORMAT(dt_CREATED, '%Y-%m-%d %H:%i:%s'), IFNULL(str_LIBELLE,''), IFNULL(str_DATE_DISPO,''), IFNULL(str_REMPLACANT_NOM,''), str_CODE_ENVOYE`
  + ` FROM t_disponibilite_produit WHERE lg_FAMILLE_ID = '${f}' AND lg_GROSSISTE_ID = '${GL}' ORDER BY dt_CREATED DESC LIMIT 1`)[0] || [];

(async () => {
  const P = GL ? fiches() : [];
  if (!GL || P.length < 3) { console.error('Jeu d\'essai introuvable (Laborex Yopougon, 3 fiches rattachees)'); process.exit(2); }
  F = P.map((x) => x.f);
  ok('aucune correspondance d\'essai restee d\'un passage precedent', q(`SELECT COUNT(*) FROM correspondance_grossiste WHERE cle_grossiste = '${GL}' AND code_grossiste IN ('${CODES5.join("','")}')`) === '0');
  poses = true;
  q(P.map((x, i) => `INSERT INTO correspondance_grossiste (cle_grossiste, lg_GROSSISTE_ID, code_grossiste, designation_grossiste, lg_FAMILLE_ID, etat, source, motif, score, candidats, dt_creation, dt_maj)`
    + ` VALUES ('${GL}', '${GL}', '${CODES5[i]}', 'E2E LOT5 ${i + 1}', '${x.f}', 'VALIDEE', 'HUMAIN', 'E2E', 1.000, '["${x.f}"]', NOW(3), NOW(3));`).join(''));
  await new Promise((r) => serveur.listen(PORT, '127.0.0.1', r));
  debut = q('SELECT DATE_FORMAT(NOW() - INTERVAL 1 SECOND, \'%Y-%m-%d %H:%i:%s\')');
  sauve = q(`SELECT CONCAT(IFNULL(str_URL_PHARMAML, 'NULL'), '|', str_PHARMAML_VERSION_INFO, '|', int_PHARMAML_DISPO, '|', ${colonne ? 'int_SOURCE_DISPO' : "'0'"}) FROM t_grossiste WHERE lg_GROSSISTE_ID = '${GL}'`).split('|');
  ok('colonne t_grossiste.int_SOURCE_DISPO presente (migration V7.6.5), reglage 0 par defaut', colonne && sauve[3] === '0', sauve.join('|'));
  q(`UPDATE t_grossiste SET str_URL_PHARMAML = 'http://127.0.0.1:${PORT}/a', str_PHARMAML_VERSION_INFO = '3.0.0.0', int_PHARMAML_DISPO = 1 WHERE lg_GROSSISTE_ID = '${GL}'`);

  const b = await ENV_E2E.lancer(chromium);
  try {
    const anonyme = await b.newPage();
    await anonyme.goto(URL_PRESTIGE + '/', { waitUntil: 'domcontentloaded' });
    const st = await anonyme.evaluate(async (a) => [(await fetch(a.u + '/api/v1/correspondance-grossiste/produit/x/disponibilite')).status,
      (await fetch(a.u + '/api/v1/correspondance-grossiste/produit/x/disponibilite/' + a.g, { method: 'POST' })).status,
      (await fetch(a.u + '/api/v1/correspondance-grossiste/sources-disponibilite')).status,
      (await fetch(a.u + '/api/v1/correspondance-grossiste/sources-disponibilite/' + a.g, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"reglage":1}' })).status], { u: URL_PRESTIGE, g: GL });
    ok('disponibilite et reglage refuses sans session (401), aucun appel au grossiste', st.join(',') === '401,401,401,401' && recus.length === 0, st.join(','));
    await anonyme.close();

    const p = await b.newPage({ viewport: { width: 1700, height: 950 } });
    const erreursJs = [];
    p.on('pageerror', (e) => erreursJs.push(String(e)));
    await p.goto(URL_PRESTIGE + '/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    const api = (chemin, methode, corps) => p.evaluate(async (a) => {
      const r = await fetch(a.u + '/api/v1/correspondance-grossiste/' + a.c, { method: a.m || 'GET', headers: a.b ? { 'Content-Type': 'application/json' } : {}, body: a.b || undefined });
      return { status: r.status, corps: await r.json().catch(() => null) };
    }, { u: URL_PRESTIGE, c: chemin, m: methode, b: corps ? JSON.stringify(corps) : null });

    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponentWithDataSource('correspondancesgrossistes', '', '', ''));
    await p.waitForSelector('.cgr-barre [data-action=vue][data-vue=produit]', { timeout: 20000 });
    await p.click('.cgr-barre [data-action=vue][data-vue=produit]');
    await p.waitForSelector('[data-action=chercher-produit]', { timeout: 10000 });
    const ligneGL = `[data-e2e=ligne-grossiste][data-grossiste="${GL}"]`;
    const voir = async (i) => {
      await p.fill('[data-action=chercher-produit]', P[i].cip);
      const v = `[data-e2e=resultats-produit] [data-action=voir-produit][data-famille="${F[i]}"]`;
      await p.waitForSelector(v, { timeout: 15000 });
      await p.click(v);
      await p.waitForSelector(ligneGL + ' [data-action=verifier-dispo]', { timeout: 15000 });
    };
    const reponses = () => p.evaluate((sel) => [...document.querySelectorAll(sel + ' [data-e2e=reponse]')].map((x) => ({
      source: x.getAttribute('data-source'), statut: x.getAttribute('data-statut'), lu: x.getAttribute('data-lu'), texte: x.textContent })), ligneGL);
    const cliquer = async (action) => {
      const avant = recus.length;
      await p.click(ligneGL + ` [data-action=${action}]`);
      await p.waitForFunction((sel) => { const c = document.querySelector(sel + ' [data-e2e=dispo]'); return c && c.querySelector('[data-e2e=reponse]') && !/en cours/.test(c.textContent); }, ligneGL, { timeout: 60000 });
      return recus.length - avant;
    };

    /* ---- reglage 0 : PharmaML seul */
    await voir(0);
    ok('vue par produit : ligne Laborex avec « Vérifier », aucune lecture affichee, aucun appel a l\'ouverture',
      (await p.$$(ligneGL + ' [data-e2e=derniere]')).length === 0 && recus.length === 0);
    let appels = await cliquer('verifier-dispo');
    let r = await reponses();
    let d = derniere(F[0]);
    const code0 = d[6] || '';
    const attendu0 = Number(code0.slice(-1)) % 2 === 0 ? 'NON' : 'OUI';
    ok('reglage 0 : un seul appel PharmaML, information produit (REQ_INFO_PRODUIT), jamais une commande', appels === 1 && recus[0].chemin === '/a'
      && /<REQ_INFO_PRODUIT /.test(recus[0].xml) && !/<COMMANDE[ >]|LIGNE_N /.test(recus[0].xml), appels);
    ok('reglage 0 : une reponse, source PharmaML, statut = faux grossiste = base, heure de lecture = base', r.length === 1 && r[0].source === 'PHARMAML'
      && r[0].statut === attendu0 && d[0] === attendu0 && d[1] === 'FICHE' && r[0].lu === d[2] && /lu le/.test(r[0].texte) && !/moins de 15 min/.test(r[0].texte), JSON.stringify(r) + ' ' + d.join('|'));
    ok('bilan : une ligne de disponibilite ecrite', nbLignes() === 1, nbLignes());
    appels = await cliquer('verifier-dispo');
    r = await reponses();
    ok('cache : second « Vérifier » sans appel, meme lecture rendue avec sa date, « Relire » propose', appels === 0 && r.length === 1 && r[0].lu === d[2]
      && /moins de 15 min/.test(r[0].texte) && (await p.$$(ligneGL + ' [data-action=relire-dispo]')).length === 1 && nbLignes() === 1, appels + ' ' + JSON.stringify(r));
    await p.waitForTimeout(1100);
    appels = await cliquer('relire-dispo');
    r = await reponses();
    const d2 = derniere(F[0]);
    ok('« Relire » : nouvel appel, nouvelle ligne, heure de lecture nouvelle', appels === 1 && nbLignes() === 2 && r[0].lu === d2[2] && d2[2] > d[2], appels + ' ' + d2[2]);
    const dern = await api('produit/' + encodeURIComponent(F[0]) + '/disponibilite');
    const dl = dern.corps && dern.corps.dernieres && dern.corps.dernieres[GL];
    ok('API derniere lecture = base', dl && dl.statut === d2[0] && dl.luLe === d2[2] && dl.origine === 'FICHE', JSON.stringify(dl));

    /* ---- reglage 1 : extranet seul, regle a l'ecran « Sources de disponibilité » */
    const regler = async (val) => {
      await p.click('.cgr-barre [data-action=vue][data-vue=sources]');
      const sel = `[data-e2e=ligne-source][data-grossiste="${GL}"]`;
      await p.waitForSelector(sel + ' [data-e2e=reglage]', { timeout: 15000 });
      await p.selectOption(sel + ' [data-e2e=reglage]', String(val));
      await p.click(sel + ' [data-action=source-dispo]');
      const confirme = await p.textContent(sel + ' [data-action=source-dispo]');
      const avantClic = q(`SELECT int_SOURCE_DISPO FROM t_grossiste WHERE lg_GROSSISTE_ID = '${GL}'`);
      await Promise.all([p.waitForResponse((x) => x.url().includes('/sources-disponibilite/'), { timeout: 15000 }), p.click(sel + ' [data-action=source-dispo]')]);
      await p.waitForFunction((a) => { const s = document.querySelector(a.sel + ' [data-e2e=reglage]'); return s && s.value === a.v && !document.querySelector(a.sel + ' [data-action=source-dispo]').disabled; }, { sel, v: String(val) }, { timeout: 15000 });
      await p.click('.cgr-barre [data-action=vue][data-vue=produit]');
      await p.waitForSelector('[data-action=chercher-produit]', { timeout: 10000 });
      return { confirme, avantClic };
    };
    const rg1 = await regler(1);
    ok('reglage : le premier clic demande confirmation dans le bouton, rien d\'enregistre ; le second enregistre (base = 1)',
      /Confirmer/.test(rg1.confirme) && rg1.avantClic === '0' && q(`SELECT int_SOURCE_DISPO FROM t_grossiste WHERE lg_GROSSISTE_ID = '${GL}'`) === '1', JSON.stringify(rg1));
    const lues = await api('sources-disponibilite');
    ok('API sources = base', lues.corps && lues.corps.data.some((x) => x.grossisteId === GL && x.reglage === 1));
    await voir(1);
    appels = await cliquer('verifier-dispo');
    r = await reponses();
    ok('reglage 1 : extranet seul, « absente », aucun statut ni valeur, aucun appel PharmaML, rien d\'ecrit', appels === 0 && r.length === 1 && r[0].source === 'EXTRANET'
      && r[0].statut === '' && /absente/.test(r[0].texte) && nbLignes() === 2, JSON.stringify(r));

    /* ---- reglage 2 : les deux */
    await regler(2);
    await voir(1);
    appels = await cliquer('verifier-dispo');
    r = await reponses();
    d = derniere(F[1]);
    const attendu1 = Number((d[6] || '').slice(-1)) % 2 === 0 ? 'NON' : 'OUI';
    ok('reglage 2 : deux reponses, PharmaML puis extranet, chacune avec sa source ; un seul appel PharmaML', appels === 1 && r.length === 2
      && r[0].source === 'PHARMAML' && r[1].source === 'EXTRANET' && r[0].statut === attendu1 && d[0] === attendu1 && r[0].lu === d[2] && r[1].statut === '', JSON.stringify(r));
    if (attendu1 === 'NON') {
      ok('non disponible : motif, date de retour et remplacant affiches = base', /MANQUE FABRICANT/.test(r[0].texte) && r[0].texte.indexOf(d[4]) >= 0 && /GENERIQUE E2E/.test(r[0].texte), r[0].texte);
    }
    const reg400 = await api('sources-disponibilite/' + GL, 'POST', { reglage: 3 });
    ok('reglage hors 0..2 refuse (400), base inchangee', reg400.status === 400 && q(`SELECT int_SOURCE_DISPO FROM t_grossiste WHERE lg_GROSSISTE_ID = '${GL}'`) === '2', reg400.status);

    /* ---- panne du grossiste, reglage 0 */
    await regler(0);
    q(`UPDATE t_grossiste SET str_URL_PHARMAML = 'http://127.0.0.1:${PORT}/panne' WHERE lg_GROSSISTE_ID = '${GL}'`);
    const avantPanne = nbLignes();
    await voir(2);
    appels = await cliquer('verifier-dispo');
    r = await reponses();
    ok('panne : echec affiche avec sa source, aucun statut ni valeur, aucune ligne ecrite', appels >= 1 && r.length === 1 && r[0].source === 'PHARMAML' && r[0].statut === ''
      && !/Disponible|Non disponible/.test(r[0].texte) && nbLignes() === avantPanne, appels + ' ' + JSON.stringify(r));
    ok('aucune erreur JavaScript', erreursJs.length === 0, erreursJs.join(' | '));
    await p.close();
  } catch (e) {
    ok('execution sans exception', false, e && e.stack);
  } finally {
    await b.close();
    serveur.close();
    retirer();
    ok('remise en etat : lignes de disponibilite retirees, URL et reglages du grossiste remis', nbLignes() === 0
      && q(`SELECT CONCAT(IFNULL(str_URL_PHARMAML, 'NULL'), '|', str_PHARMAML_VERSION_INFO, '|', int_PHARMAML_DISPO, '|', ${colonne ? 'int_SOURCE_DISPO' : "'0'"}) FROM t_grossiste WHERE lg_GROSSISTE_ID = '${GL}'`) === sauve.join('|'));
  }
  const echecs = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - echecs) + '/' + res.length + ' PASS');
  process.exit(echecs ? 1 : 0);
})();
