/* COMPARAISON STOCK : EXPORTS EXCEL ET CSV (journal de l'officine du 15/10).
 *
 * « BLOCAGE DETECTE : requete en traitement depuis 32s : GET /prestige/api/v1/fichearticle/comparaison/excel ».
 * Sur le banc (3 ans de ventes), l'export des articles en stock prenait 327 s : six lectures PAR ARTICLE
 * (consommations, bons de livraison, inventaire, derniere vente) alors que le fichier ne montre que la derniere vente.
 * Ce que le test etablit (lecture seule, par la session de l'ecran) :
 *  - export CSV des articles en stock : moins de 20 s, autant de lignes que le total de l'ecran ;
 *  - « Derniere vente » de chaque ligne echantillonnee = la derniere vente cloturee de l'article (requete SQL) ;
 *  - export Excel : moins de 20 s, fichier Excel valide.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const MAX_MS = 20000;
const FILTRES = 'seuil=0&stock=0&codeFamile=&codeRayon=&codeGrossiste=&query=&filtreStock=GREATER&filtreSeuil=ALL';

/* lignes CSV separees par « ; », champs eventuellement entre guillemets */
function lignesCsv(t) {
  const lignes = []; let champ = '', ligne = [], guill = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (guill) { if (c === '"' && t[i + 1] === '"') { champ += '"'; i++; } else if (c === '"') { guill = false; } else { champ += c; } continue; }
    if (c === '"') { guill = true; } else if (c === ';') { ligne.push(champ); champ = ''; }
    else if (c === '\n') { ligne.push(champ.replace(/\r$/, '')); lignes.push(ligne); ligne = []; champ = ''; } else { champ += c; }
  }
  if (champ || ligne.length) { ligne.push(champ); lignes.push(ligne); }
  return lignes;
}

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage();
  const telecharger = (u) => p.evaluate(async ([u, max]) => {
    const ctl = new AbortController(); const minuterie = setTimeout(() => ctl.abort(), max * 3);
    const t = performance.now();
    try {
      const r = await fetch(u, { signal: ctl.signal }); const a = new Uint8Array(await r.arrayBuffer());
      let s = ''; a.forEach((x) => { s += String.fromCharCode(x); });
      return { s: r.status, ms: Math.round(performance.now() - t), b64: btoa(s) };
    } catch (e) { return { s: 0, ms: Math.round(performance.now() - t), erreur: String(e) }; } finally { clearTimeout(minuterie); }
  }, [u, MAX_MS]);
  try {
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    const total = await p.evaluate(async (f) => (await (await fetch('../api/v1/fichearticle/comparaison?' + f + '&start=0&limit=1')).json()).total, FILTRES);

    const csv = await telecharger('../api/v1/fichearticle/comparaison/csv?' + FILTRES);
    const texte = csv.b64 ? Buffer.from(csv.b64, 'base64').toString('utf8').replace(/^﻿/, '') : '';
    const lignes = lignesCsv(texte).filter((l) => l.length > 1);
    const entete = lignes.shift() || [];
    ok('Export CSV des articles en stock en moins de 20 s, autant de lignes que l\'écran', csv.s === 200 && csv.ms < MAX_MS && lignes.length === total && total > 0,
      csv.ms + ' ms, ' + lignes.length + ' lignes / total écran ' + total + (csv.erreur ? ' ' + csv.erreur : ''));

    /* derniere vente : echantillon de CIP uniques */
    const iCip = entete.indexOf('CIP'), iVente = entete.indexOf('Dernière vente');
    const echantillon = lignes.filter((l, i) => i % Math.max(1, Math.floor(lignes.length / 40)) === 0).slice(0, 40);
    let compares = 0; const ecarts = [];
    for (const l of echantillon) {
      const cip = l[iCip].replace(/'/g, '');
      const ids = q("SELECT lg_FAMILLE_ID FROM t_famille WHERE int_CIP = '" + cip + "'").split('\n').filter(Boolean);
      if (ids.length !== 1) { continue; }
      const attendu = q("SELECT IFNULL(DATE_FORMAT(MAX(p.dt_UPDATED), '%d/%m/%Y %H:%i'), '') FROM t_preenregistrement_detail d"
        + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID"
        + " WHERE d.lg_FAMILLE_ID = '" + ids[0] + "' AND p.str_STATUT = 'is_Closed' AND u.lg_EMPLACEMENT_ID = '1'");
      compares++;
      if (attendu !== l[iVente]) { ecarts.push(cip + ' : ' + l[iVente] + ' ≠ ' + attendu); }
    }
    ok('« Dernière vente » = dernière vente clôturée de l\'article (échantillon)', compares >= 10 && ecarts.length === 0, compares + ' comparés ; ' + ecarts.slice(0, 3).join(' | '));

    const xls = await telecharger('../api/v1/fichearticle/comparaison/excel?' + FILTRES);
    const debut = xls.b64 ? Buffer.from(xls.b64, 'base64').slice(0, 4).toString('hex') : '';
    ok('Export Excel en moins de 20 s, fichier Excel valide', xls.s === 200 && xls.ms < MAX_MS && (debut === 'd0cf11e0' || debut === '504b0304'), xls.ms + ' ms, ' + debut);
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
