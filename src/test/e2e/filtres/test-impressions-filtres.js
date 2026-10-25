/* IMPRESSIONS ET FILTRE MULTIPLE (demande du 13/10) : chaque impression des menus a filtre multiple rappelle les NOMS
 * des rayons coches (jamais leurs identifiants). 2 rayons coches, periode d'aout a debut octobre. Lecture seule. */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const { fichierEdition } = require('../support/editions');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const R = q("SELECT f.lg_ZONE_GEO_ID FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
  + " WHERE f.str_STATUT = 'enable' AND f.lg_ZONE_GEO_ID IS NOT NULL AND f.lg_ZONE_GEO_ID NOT IN ('', '1') GROUP BY 1 ORDER BY COUNT(*) DESC LIMIT 2").split('\n');
const NOMS = R.map((r) => q("SELECT str_LIBELLEE FROM t_zone_geographique WHERE lg_ZONE_GEO_ID = '" + r + "'").replace(/\s+/g, ' '));
const L = encodeURIComponent(R.join(','));
const D = 'dtStart=2026-08-01&dtEnd=2026-10-06';
const IMPRESSIONS = [
  ['Marge sur produits vendus', '../DataReportingServlet?mode=MARGE_PRODUITS&' + D + '&codeGrossiste=&codeRayon=' + L + '&codeFamile=&query=&critere=&filtre=ALL'],
  ['Articles invendus', '../DataReportingServlet?mode=ARTICLES_NON_VENDUES&' + D + '&codeGrossiste=&codeRayon=' + L + '&query=&codeFamile=&stock=0&stockFiltre=ALL&nombreMois=3'],
  ['Comparaison de stock', '../DataReportingServlet?mode=COMPARAISON_STOCK&codeGrossiste=&codeRayon=' + L + '&query=&codeFamile=&stock=0&seuil=0&filtreStock=ALL&filtreSeuil=ALL'],
  ['Comparaison de stock (réserve)', '../api/v1/fichearticle/comparaison/pdf-reserve?codeGrossiste=&codeRayon=' + L + '&query=&codeFamile=&stock=0&seuil=0&filtreStock=ALL&filtreSeuil=ALL'],
  ['Saisie des périmés', '../BalancePdfServlet?mode=SAISIE_PERIMES&query=&codeGrossiste=&codeRayon=' + L + '&codeFamile=&' + D + '&groupby=0'],
  ['Surstocks', '../api/v1/surstock/pdf?moisHistorique=3&moisProjection=3&query=&codeRayon=' + L + '&codeGrossiste=&codeFamille='],
  ['Articles dormants', '../api/v1/articles-dormants/pdf?jours=30&query=&rayon=' + L + '&grossiste=&famille='],
  ['État de stock', '../webservices/stockmanagement/stock/ws_etatstock_pdf.jsp?lg_FAMILLEARTICLE_ID=&lg_GROSSISTE_ID=&lg_ZONE_GEO_ID=' + L + '&search_value=&int_NUMBER=0&str_TYPE_TRANSACTION=ALL'],
  ['État de stock (réserve)', '../api/v1/etat-stock/pdf-reserve?lg_ZONE_GEO_ID=' + L],
  ['Articles vendus récap', '../SockServlet?mode=ARTICLE_VENDUS_RECAP&' + D + '&hStart=00:00&hEnd=23:59&query=&typeTransaction=&nbre=0&prixachatFiltre=&stock=0&stockFiltre=&user=&grossisteId=&rayonId=' + L + '&type=detail&qteVendu=0&qteVenduFiltre=&avecStockReserve=false'],
  ['Évaluation des ventes', '../EvaluationVenteServlet?familleId=&emplacementId=' + L + '&query=&filtre=&filtreValue='],
  ['Classification ABC', '../api/v1/articles/abc/print?' + D + '&type=CA&classe=ALL&search=&codeFamille=&codeRayon=' + L + '&codeGrossiste=&stockFilter=ALL&topN=0'],
  ['Feuille de match', '../api/v1/articles/abc/feuille-match/print?' + D + '&type=CA&classe=ALL&search=&codeFamille=&codeRayon=' + L + '&codeGrossiste=&stockFilter=ALL&topN=50'],
  ['Feuille de match simple', '../api/v1/articles/abc/feuille-match/simple/pdf?' + D + '&type=CA&classe=ALL&search=&codeFamille=&codeRayon=' + L + '&codeGrossiste=&stockFilter=ALL&topN=50'],
  /* fiche article : le titre vient de l'ecran (noms des rayons coches) ; on verifie surtout que la liste des rayons
     filtre les donnees sans erreur (avant : egalite sur un seul rayon) */
  ['Fiche article (liste)', '../webservices/sm_user/famille/ws_generate_pdf.jsp?str_TYPE_TRANSACTION=ALL&lg_DCI_ID=&lg_ZONE_GEO_ID=' + L
    + '&stock_operator=&stock_value=&lg_CODE_TVA_ID=&titre_filtre=' + encodeURIComponent('rayons ' + NOMS.join(', ')) + '&search_value='],
  ['Analyse article', '../api/v1/analyse-article/matrice/pdf?typePeriode=TROIS_MOIS&rayon=' + L + '&famille=&grossiste=']
];

/* Modeles minimaux POSES PAR LE TEST quand le modele de l'officine est absent du banc (ils ne sont pas dans le
   depot) : ils n'impriment que le titre P_H_CLT_INFOS, ce qui suffit a verifier le rappel des filtres. Retires a la fin. */
const DOSSIER_MODELES = process.env.REPORTS_FILE || '/opt/CONF/LABOREX/REPORTS';
const MODELES = ['rp_margeproduits', 'rp_articles_invendus', 'rp_comparaison_surstock', 'rp_perimev2', 'rp_perimegroup', 'rp_gestion_surstock',
  'rp_etatdestock', 'rp_articlesvendus', 'rp_articlesvendusgroup', 'rp_articlesvendus_rayon', 'rp_articlesvendusgroup_rayon', 'rp_evaluation_vente', 'rp_feuille_de_match', 'rp_fiche_article'];
const poses = [];
function poserModeles() {
  for (const m of MODELES) {
    const f = path.join(DOSSIER_MODELES, m + '.jrxml');
    if (fs.existsSync(f) || fs.existsSync(path.join(DOSSIER_MODELES, m + '.jasper'))) { continue; }
    fs.writeFileSync(f, '<?xml version="1.0" encoding="UTF-8"?>\n<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports" name="' + m
      + '" pageWidth="842" pageHeight="595" orientation="Landscape" columnWidth="802" leftMargin="20" rightMargin="20" topMargin="20" bottomMargin="20" whenNoDataType="AllSectionsNoDetail">'
      + '<parameter name="P_H_CLT_INFOS" class="java.lang.String"/><title><band height="60"><textField isStretchWithOverflow="true" isBlankWhenNull="true">'
      + '<reportElement x="0" y="0" width="802" height="20"/><textFieldExpression><![CDATA[$P{P_H_CLT_INFOS}]]></textFieldExpression></textField></band></title></jasperReport>');
    poses.push(m);
  }
}
function retirerModeles() {
  for (const m of poses) { for (const ext of ['.jrxml', '.jasper']) { const f = path.join(DOSSIER_MODELES, m + ext); if (fs.existsSync(f)) { fs.unlinkSync(f); } } }
}

(async () => {
  poserModeles();
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await b.newPage();
  try {
    ok('Précondition : 2 rayons nommés', NOMS.length === 2 && NOMS.every((n) => n), NOMS.join(' / '));
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    for (const [nom, url] of IMPRESSIONS) {
      try {
        const r = await p.evaluate(async (u) => { const x = await fetch(u); const ct = x.headers.get('content-type') || ''; const a = new Uint8Array(await x.arrayBuffer());
          const debut = new TextDecoder().decode(a.slice(0, 4)); return { s: x.status, ct, url: x.url, pdf: debut === '%PDF' ? Array.from(a) : null, texte: debut === '%PDF' ? '' : new TextDecoder().decode(a).slice(0, 600) }; }, url);
        let fichier = null;
        if (r.pdf) { fichier = path.join(os.tmpdir(), 'imp-' + Date.now() + '.pdf'); fs.writeFileSync(fichier, Buffer.from(r.pdf)); }
        else { let j = null; try { j = JSON.parse(r.texte); } catch (e) {} const lien = (j && (j.msg || j.url)) || (/\/data\/reports\//.test(r.url) ? r.url : null);
          if (lien && /\.pdf/.test(lien)) { fichier = fichierEdition(lien); } }
        const texte = fichier && fs.existsSync(fichier) ? execFileSync('pdftotext', ['-layout', fichier, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ') : '';
        ok(nom + ' : noms des 2 rayons dans l\'impression, sans identifiant', texte && NOMS.every((n) => texte.indexOf(n) >= 0) && R.every((id) => texte.indexOf(id) < 0),
          texte ? texte.slice(0, 220) : (r.s + ' ' + r.ct + ' ' + r.url + ' ' + r.texte.slice(0, 160)));
      } catch (e) {
        ok(nom + ' : impression', false, e.message);
      }
    }
  } catch (e) {
    ok('Exception', false, e.stack);
  } finally {
    retirerModeles();
    await b.close();
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
