/* Lot D - point 14 : les deux editions PDF de la liste des bons par organisme.
 *
 * Attendu : titre 9 gras, colonnes 8 gras, lignes 8, textes secondaires 7, dates SANS heure,
 * montant attendu en COLONNE apres le taux et en gras, pas de quadrillage.
 * Le test recupere les deux PDF par leur vraie URL et les lit avec pdftotext / pdffonts.
 */
const { chromium } = require('playwright-core');
const { execFileSync, execSync } = require('child_process');
const fs = require('fs');
const zlib = require('zlib');
const res = [];

/* Concatene les flux de contenu decompresses du PDF : c'est la, et nulle part ailleurs,
   que se lisent les operateurs de dessin. */
function fluxDecompresse(fichier) {
  const buf = fs.readFileSync(fichier);
  let sortie = '';
  let i = 0;
  while ((i = buf.indexOf('stream', i)) !== -1) {
    let d = i + 6;
    if (buf[d] === 13) { d++; }
    if (buf[d] === 10) { d++; }
    const fin = buf.indexOf('endstream', d);
    if (fin === -1) { break; }
    try { sortie += zlib.inflateSync(buf.slice(d, fin)).toString('latin1') + '\n'; } catch (e) { }
    i = fin + 9;
  }
  return sortie;
}
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }

const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
const TMP = '/tmp/lot-d';

/* La liste des bons croise t_preenregistrement avec mvttransaction (typeTransaction=1), puis
   remonte la chaine compte client tiers payant -> compte client -> client. Sur ce banc,
   mvttransaction est vide et les comptes clients de cette chaine manquent : aucune edition n'a
   donc de lignes, et le test ne prouverait rien. On pose le strict necessaire autour de quelques
   ventes reelles - un client d'essai, les comptes manquants, le mouvement - et on retire tout a
   la fin. Aucune donnee existante n'est modifiee. */
const MARQUE = 'E2E-LOT-D';
const CLIENT = 'E2E-LOT-D-CLT';

function poserJeuDEssai(jour) {
  const ids = q("SELECT p.lg_PREENREGISTREMENT_ID FROM t_preenregistrement p"
    + " JOIN t_preenregistrement_compte_client_tiers_payent cp ON cp.lg_PREENREGISTREMENT_ID=p.lg_PREENREGISTREMENT_ID"
    + " WHERE DATE(p.dt_UPDATED)='" + jour + "' AND p.str_STATUT='is_Closed' AND p.b_IS_CANCEL=0"
    + " AND p.imported=0 AND p.int_PRICE>0 LIMIT 5").split('\n').filter(Boolean);
  ids.forEach(function (id, i) {
    exec("INSERT INTO mvttransaction (uuid,categorie,createdAt,mvtdate,pkey,reference,typeTransaction,caisse,"
      + "lg_EMPLACEMENT_ID,lg_USER_ID,montant) VALUES ('" + MARQUE + '-' + i + "',1,NOW(),'" + jour + "','" + id
      + "','" + MARQUE + "',1,'1','1',(SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='KGA3'),0);");
  });
  /* Les ventes du banc n'ont plus leurs lignes de detail : sans elles, l'edition « avec
     produits » n'aurait rien a detailler. On en pose une par vente choisie. */
  const produit = q("SELECT f.lg_FAMILLE_ID FROM t_famille f JOIN t_famille_stock s"
    + " ON s.lg_FAMILLE_ID=f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID='1'"
    + " WHERE f.str_STATUT='enable' AND f.int_PRICE>0 LIMIT 1");
  ids.forEach(function (id, i) {
    exec("INSERT INTO t_preenregistrement_detail (lg_PREENREGISTREMENT_DETAIL_ID,lg_PREENREGISTREMENT_ID,"
      + "lg_FAMILLE_ID,int_QUANTITY,int_PRICE,b_IS_AVOIR,valeurTva,prixAchat,montanttvaug,int_AVOIR_INITIAL)"
      + " VALUES ('" + MARQUE + '-D-' + i + "','" + id + "','" + produit + "',2,1500,0,0,0,0,0);");
  });
  exec("INSERT IGNORE INTO t_client (lg_CLIENT_ID,str_FIRST_NAME,str_LAST_NAME,str_STATUT,dt_CREATED,dt_UPDATED,"
    + "lg_TYPE_CLIENT_ID) VALUES ('" + CLIENT + "','LOTD','ESSAI','enable',NOW(),NOW(),'6');");
  exec("INSERT IGNORE INTO t_compte_client (lg_COMPTE_CLIENT_ID,str_CODE_COMPTE_CLIENT,str_TYPE,dec_Balance,"
    + "dt_CREATED,dt_UPDATED,str_STATUT,lg_CLIENT_ID)"
    + " SELECT DISTINCT cl.lg_COMPTE_CLIENT_ID,'" + MARQUE + "','CLIENT',0,NOW(),NOW(),'enable','" + CLIENT + "'"
    + " FROM t_preenregistrement_compte_client_tiers_payent cp"
    + " JOIN t_compte_client_tiers_payant cl ON cp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID=cl.lg_COMPTE_CLIENT_TIERS_PAYANT_ID"
    + " JOIN mvttransaction m ON m.pkey=cp.lg_PREENREGISTREMENT_ID WHERE m.reference='" + MARQUE + "';");
  return ids.length;
}

function retirerJeuDEssai() {
  /* Les comptes clients poses ici sont references par des lignes t_compte_client_tiers_payant
     deja presentes - c'est justement le lien qui manquait. La contrainte est donc levee le temps
     du retrait, pour rendre la base exactement dans l'etat ou elle etait. */
  exec("DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_DETAIL_ID LIKE '" + MARQUE + "-D-%';"
    + "DELETE FROM mvttransaction WHERE reference='" + MARQUE + "';"
    + "SET FOREIGN_KEY_CHECKS=0;"
    + "DELETE FROM t_compte_client WHERE str_CODE_COMPTE_CLIENT='" + MARQUE + "';"
    + "DELETE FROM t_client WHERE lg_CLIENT_ID='" + CLIENT + "';"
    + "SET FOREIGN_KEY_CHECKS=1;");
}

(async () => {
  fs.mkdirSync(TMP, { recursive: true });
  const jour = q("SELECT DATE(p.dt_UPDATED) FROM t_preenregistrement p"
    + " JOIN t_preenregistrement_compte_client_tiers_payent cp ON cp.lg_PREENREGISTREMENT_ID=p.lg_PREENREGISTREMENT_ID"
    + " WHERE p.str_STATUT='is_Closed' AND p.b_IS_CANCEL=0 AND p.imported=0 AND p.int_PRICE>0"
    + " ORDER BY p.dt_UPDATED DESC LIMIT 1");
  ok('une journee avec des bons existe en base', !!jour, jour);
  retirerJeuDEssai();
  const poses = poserJeuDEssai(jour);
  ok('jeu d essai en place : des bons sont editables', poses > 0, poses + ' bon(s)');

  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } });
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
  await p.waitForTimeout(2000);

  const recuperer = async (mode, fichier) => {
    const r = await p.evaluate(async ([j, m]) => {
      const url = '../ListBonsServlet?dtStart=' + j + '&dtEnd=' + j
        + '&tiersPayantId=&query=&hStart=&hEnd=&typeTiersPayantId=&groupeId=&mode=' + m;
      const rep = await fetch(url, { redirect: 'follow' });
      const buf = new Uint8Array(await rep.arrayBuffer());
      let bin = ''; for (let i = 0; i < buf.length; i++) { bin += String.fromCharCode(buf[i]); }
      return { statut: rep.status, type: rep.headers.get('content-type') || '', b64: btoa(bin) };
    }, [jour, mode]);
    fs.writeFileSync(fichier, Buffer.from(r.b64, 'base64'));
    return r;
  };

  for (const cas of [{ mode: '', nom: 'liste simple' }, { mode: 'produits', nom: 'liste avec produits' }]) {
    const f = TMP + '/bons_' + (cas.mode || 'simple') + '.pdf';
    const r = await recuperer(cas.mode, f);
    ok(cas.nom + ' : le serveur repond 200 (et non un 404 d edition manquante)', r.statut === 200,
       'statut=' + r.statut + ' type=' + r.type);
    const entete = fs.readFileSync(f).slice(0, 5).toString('latin1');
    ok(cas.nom + ' : le contenu recu est bien un PDF', entete === '%PDF-', entete);

    const texte = execSync('pdftotext -layout ' + f + ' -', { encoding: 'latin1' });
    fs.writeFileSync(f + '.txt', texte);

    ok(cas.nom + ' : le montant attendu est une colonne', /Montant attendu/.test(texte));
    ok(cas.nom + ' : la ligne pleine largeur « Montant attendu : » a disparu',
       !/Montant attendu\s*:/.test(texte));
    ok(cas.nom + ' : la colonne du taux precede celle du montant',
       texte.indexOf('%') !== -1 && texte.indexOf('%') < texte.indexOf('Montant attendu'));
    ok(cas.nom + ' : l en-tete de la colonne date ne parle plus d heure',
       /(^|\s)Date(\s|$)/m.test(texte) && !/Date et heure/.test(texte));

    // aucune date suivie d'une heure dans le corps de l'etat
    const avecHeure = (texte.match(/\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}/g) || []);
    ok(cas.nom + ' : aucune date n est suivie d une heure', avecHeure.length === 0, avecHeure.join(' '));

    const dates = (texte.match(/\d{2}\/\d{2}\/\d{4}/g) || []);
    ok(cas.nom + ' : des lignes de bons sont bien editees', dates.length > 0, dates.length + ' date(s)');

    ok(cas.nom + ' : le total general est edite', /TOTAL GENERAL/.test(texte));

    // polices : seules Helvetica et Helvetica-Bold, equivalents PDF d'Arial
    const polices = execSync('pdffonts ' + f, { encoding: 'utf8' });
    const noms = polices.split('\n').slice(2).map(l => l.trim().split(/\s+/)[0]).filter(Boolean);
    ok(cas.nom + ' : uniquement Helvetica et Helvetica-Bold (equivalents Arial)',
       noms.length > 0 && noms.every(n => /Helvetica(-Bold)?$/.test(n)), noms.join(','));
    ok(cas.nom + ' : le gras est present (titre, colonnes, montant)',
       noms.some(n => /Helvetica-Bold$/.test(n)), noms.join(','));

    // Pas de quadrillage : dans le flux de contenu, un rectangle « re » suivi de « S » (stroke)
    // est un trait de bordure. Les aplats gris des bandes de titre et de total sont des « re f »
    // (fill) : ils restent legitimes.
    const flux = fluxDecompresse(f);
    const traits = (flux.match(/\bre\s+S\b/g) || []).length;
    ok(cas.nom + ' : aucune bordure de cellule tracee', traits === 0, traits + ' trait(s)');
  }

  // la liste avec produits contient bien des lignes de produits que la simple n'a pas
  const simple = fs.readFileSync(TMP + '/bons_simple.pdf.txt', 'latin1');
  const produits = fs.readFileSync(TMP + '/bons_produits.pdf.txt', 'latin1');
  ok('la liste avec produits detaille les articles (x quantite)', /\sx\s?\d+/.test(produits));
  ok('la liste simple ne detaille pas les articles', !/\sx\s?\d+/.test(simple));
  ok('le titre distingue les deux editions',
     /LISTE DES BONS AVEC PRODUITS/.test(produits) && !/AVEC PRODUITS/.test(simple));

  ok('aucune erreur javascript', err.length === 0, err.join(' | '));
  retirerJeuDEssai();
  ok('jeu d essai entierement retire',
     q("SELECT COUNT(*) FROM mvttransaction WHERE reference='" + MARQUE + "'") === '0'
     && q("SELECT COUNT(*) FROM t_compte_client WHERE str_CODE_COMPTE_CLIENT='" + MARQUE + "'") === '0');
  await b.close();
  const echecs = res.filter(x => !x.c);
  console.log('\n' + (res.length - echecs.length) + '/' + res.length + ' OK');
  process.exit(echecs.length ? 1 : 0);
})().catch(e => { console.error(e); try { retirerJeuDEssai(); } catch (x) { } process.exit(1); });
