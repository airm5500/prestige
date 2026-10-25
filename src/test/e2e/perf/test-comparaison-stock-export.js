/* COMPARAISON STOCK : EXPORTS EXCEL ET CSV (journal de l'officine du 15/10).
 *
 * « BLOCAGE DETECTE : requete en traitement depuis 32s : GET /prestige/api/v1/fichearticle/comparaison/excel ».
 * Sur le banc (3 ans de ventes), l'export des articles en stock prenait 327 s : six lectures PAR ARTICLE
 * (consommations, bons de livraison, inventaire, derniere vente) alors que le fichier ne montre que la derniere vente.
 * Ce que le test etablit (lecture seule, par la session de l'ecran) :
 *  - export CSV des articles en stock : moins de 20 s, autant de lignes que le total de l'ecran ;
 *  - « Derniere vente » de chaque ligne echantillonnee = la derniere vente cloturee de l'article (requete SQL) ;
 *  - export Excel : moins de 20 s, fichier Excel valide ;
 *  - impression PDF (meme ecran, consommations sur 6 mois, dernier bon, inventaire) : 311 s avant, moins de 40 s,
 *    une ligne par article ; consommation du mois et dernier bon d'un echantillon conformes a la base.
 * Le modele PDF de l'officine n'est pas dans le depot : le test pose un modele qui imprime les donnees, et le retire.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
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

const DOSSIER = process.env.REPORTS_FILE || '/opt/CONF/LABOREX/REPORTS', MODELE = 'rp_comparaison_surstock';
const CHAMPS = ['code:String', 'consommationUn:Integer', 'dateBon:String', 'dateEntree:String', 'qtyEntree:Integer', 'lastDateVente:String'];
const modelePose = !fs.existsSync(path.join(DOSSIER, MODELE + '.jrxml')) && !fs.existsSync(path.join(DOSSIER, MODELE + '.jasper'));
function poserModele() {
  if (!modelePose) { return; }
  fs.writeFileSync(path.join(DOSSIER, MODELE + '.jrxml'), '<?xml version="1.0" encoding="UTF-8"?>\n<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports" name="' + MODELE
    + '" pageWidth="1400" pageHeight="842" orientation="Landscape" columnWidth="1360" leftMargin="20" rightMargin="20" topMargin="20" bottomMargin="20">'
    + '<parameter name="P_H_CLT_INFOS" class="java.lang.String"/>' + CHAMPS.map((x) => '<field name="' + x.split(':')[0] + '" class="java.lang.' + x.split(':')[1] + '"/>').join('')
    + '<detail><band height="12"><textField isBlankWhenNull="true"><reportElement x="0" y="0" width="1360" height="12"/><textElement><font size="6"/></textElement><textFieldExpression><![CDATA["L|" + '
    + CHAMPS.map((x) => '$F{' + x.split(':')[0] + '}').join(' + "|" + ') + ']]></textFieldExpression></textField></band></detail></jasperReport>');
}
function retirerModele() {
  if (!modelePose) { return; }
  for (const e of ['.jrxml', '.jasper']) { const f = path.join(DOSSIER, MODELE + e); if (fs.existsSync(f)) { fs.unlinkSync(f); } }
}

(async () => {
  poserModele();
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
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

    /* impression PDF */
    const t0 = Date.now();
    const imp = await p.evaluate(async (f) => { const x = await fetch('../DataReportingServlet?mode=COMPARAISON_STOCK&' + f); return { url: x.url, t: (await x.text()).slice(0, 300) }; }, FILTRES);
    const msPdf = Date.now() - t0;
    let lien = null; try { const j = JSON.parse(imp.t); lien = j.msg || j.url; } catch (e) { if (/\/data\/reports\//.test(imp.url)) { lien = imp.url; } }
    const fichier = lien ? path.join(DOSSIER, 'pdf', path.basename(lien.split('?')[0])) : null;
    const lignesPdf = fichier && fs.existsSync(fichier) ? execFileSync('pdftotext', ['-layout', fichier, '-'], { encoding: 'utf8', maxBuffer: 1 << 28 })
      .split('\n').map((l) => l.trim()).filter((l) => l.startsWith('L|')).map((l) => l.split('|')) : [];
    if (fichier && fs.existsSync(fichier)) { fs.unlinkSync(fichier); }
    ok('Impression PDF en moins de 40 s, une ligne par article', msPdf < 40000 && lignesPdf.length === total, msPdf + ' ms, ' + lignesPdf.length + ' lignes / ' + total + ' ' + (lien || imp.t.slice(0, 120)));
    const mois = q("SELECT DATE_FORMAT(CURDATE(), '%Y-%m')");
    let vus = 0; const faux = [];
    for (const l of lignesPdf.filter((x, i) => i % Math.max(1, Math.floor(lignesPdf.length / 30)) === 0)) {
      const ids = q("SELECT lg_FAMILLE_ID FROM t_famille WHERE int_CIP = '" + l[1] + "'").split('\n').filter(Boolean);
      if (ids.length !== 1) { continue; }
      const conso = q("SELECT IFNULL(SUM(d.int_QUANTITY), 0) FROM t_preenregistrement_detail d JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID"
        + " JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID WHERE d.lg_FAMILLE_ID = '" + ids[0] + "' AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0"
        + " AND u.lg_EMPLACEMENT_ID = '1' AND DATE(p.dt_UPDATED) <= CURDATE() AND DATE_FORMAT(p.dt_UPDATED, '%Y-%m') = '" + mois + "'");
      const bon = q("SELECT IFNULL(DATE_FORMAT(MAX(b.dt_DATE_LIVRAISON), '%d/%m/%Y %H:%i'), 'null') FROM t_bon_livraison_detail d JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID = d.lg_BON_LIVRAISON_ID"
        + " WHERE d.lg_FAMILLE_ID = '" + ids[0] + "' AND b.str_STATUT = 'is_Closed'");
      vus++;
      if (String(conso) !== l[2] || bon !== l[3]) { faux.push(l[1] + ' : ' + l[2] + '/' + l[3] + ' ≠ ' + conso + '/' + bon); }
    }
    ok('PDF : consommation du mois et date du dernier bon conformes à la base (échantillon)', vus >= 10 && faux.length === 0, vus + ' comparés ; ' + faux.slice(0, 3).join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    retirerModele();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
