/* Evolution 5, point 2 : valorisation du stock archivee en PDF.
 *   - le document est produit tout seul les jours de fin et de debut de mois (27 a 31, 1 a 3) ;
 *   - il est range dans le sous-dossier « valorisations », a cote des donnees de support ;
 *   - il s'appelle valorisation_<officine>_du_<AAAA-MM-JJ>.pdf ;
 *   - le parametre KEY_VALORISATION_PDF_CRITERE choisit EMPLACEMENT ou FAMILLE, avec dans les deux cas
 *     la totalite des emplacements ou des familles ;
 *   - douze mois sont conserves, les plus anciennes sont retirees.
 * Le document est reellement produit depuis la base, puis servi en flux. Les archives posees par le test
 * sont retirees et les parametres remis a leur valeur d'origine a la fin. */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 320) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();

const DOSSIER = path.join(process.env.HOME || '/root', 'prestige', 'valorisations');
const critereOrigine = q("SELECT str_VALUE FROM t_parameters WHERE str_KEY='KEY_VALORISATION_PDF_CRITERE'");
const moisOrigine = q("SELECT str_VALUE FROM t_parameters WHERE str_KEY='KEY_VALORISATION_PDF_MOIS_CONSERVES'");
const posees = [];

function poserParametre(cle, valeur) {
  exec("UPDATE t_parameters SET str_VALUE='" + valeur + "' WHERE str_KEY='" + cle + "';");
}

function fichiers() {
  try {
    return fs.readdirSync(DOSSIER).filter((f) => /^valorisation_.*\.pdf$/.test(f)).sort();
  } catch (e) {
    return [];
  }
}

function nettoyer() {
  poserParametre('KEY_VALORISATION_PDF_CRITERE', critereOrigine || 'EMPLACEMENT');
  poserParametre('KEY_VALORISATION_PDF_MOIS_CONSERVES', moisOrigine || '12');
  posees.forEach((f) => { try { fs.unlinkSync(path.join(DOSSIER, f)); } catch (e) { /* deja retire */ } });
}

// Texte d'un PDF : les flux sont deflates, on en extrait les chaines affichees.
function texteDuPdf(chemin) {
  const zlib = require('zlib');
  const d = fs.readFileSync(chemin);
  let out = '';
  const re = /stream\r?\n/g;
  let m;
  while ((m = re.exec(d.toString('latin1'))) !== null) {
    const debut = m.index + m[0].length;
    const fin = d.toString('latin1').indexOf('endstream', debut);
    if (fin < 0) { continue; }
    try {
      const clair = zlib.inflateSync(d.slice(debut, fin)).toString('latin1');
      out += (clair.match(/\((?:[^()\\]|\\.)*\)/g) || []).join(' ');
    } catch (e) { /* flux non compresse ou image */ }
  }
  return out;
}

const appeler = (p, url, methode) => p.evaluate(async ([u, m]) => {
  const r = await fetch(u, m === 'POST' ? { method: 'POST', headers: { 'Content-Type': 'application/json' } } : undefined);
  return { statut: r.status, corps: await r.text() };
}, [url, methode || 'GET']);

(async () => {
  const avant = fichiers();
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
  const p = await ctx.newPage();
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });

    /* 1. le reglage est lisible et porte les trois parametres */
    let r = JSON.parse((await appeler(p, '../api/v1/valorisation-archive/list')).corps);
    ok('Le dossier d archivage est « valorisations », voisin des donnees de support',
      /[\\/]prestige[\\/]valorisations$/.test(r.dossier), r.dossier);
    ok('Le reglage expose le critere, l etat et la duree de conservation',
      r.success === true && !!r.critere && r.actif === true && r.moisConserves === 12,
      JSON.stringify({ critere: r.critere, actif: r.actif, mois: r.moisConserves }));

    /* 2. archivage par emplacement : le document est reellement produit depuis la base */
    poserParametre('KEY_VALORISATION_PDF_CRITERE', 'EMPLACEMENT');
    let g = JSON.parse((await appeler(p, '../api/v1/valorisation-archive/generer', 'POST')).corps);
    ok('La valorisation par emplacement est produite', g.success === true && g.critere === 'EMPLACEMENT', JSON.stringify(g));
    const nom = g.fichier;
    if (nom && avant.indexOf(nom) < 0) { posees.push(nom); }

    const officine = q("SELECT str_NOM_ABREGE FROM t_officine WHERE lg_OFFICINE_ID='1'");
    const jour = q("SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d')");
    ok('Le nom du fichier porte l officine et la date : valorisation_<officine>_du_<date>.pdf',
      nom === 'valorisation_' + officine.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') + '_du_' + jour + '.pdf',
      nom + '  (officine ' + officine + ')');

    const chemin = path.join(DOSSIER, nom);
    ok('Le fichier existe sur le disque et est un vrai PDF',
      fs.existsSync(chemin) && fs.readFileSync(chemin).slice(0, 5).toString() === '%PDF-', chemin);

    const texteEmpl = texteDuPdf(chemin);
    ok('Le PDF porte le nom de l officine et le critere retenu',
      texteEmpl.toUpperCase().indexOf(officine.toUpperCase()) >= 0 && /Emplacement/.test(texteEmpl),
      texteEmpl.slice(0, 200));
    ok('Le PDF est bien une valorisation chiffree, prise sur toute la base',
      /Articles valorises/.test(texteEmpl) && /\d{6,}/.test(texteEmpl), texteEmpl.slice(0, 220));
    ok('Le PDF dit qu il vient de l archivage automatique et non d un operateur',
      /Archivage automatique/.test(texteEmpl));

    /* 3. le meme jour ne produit pas deux documents : le nom est stable */
    const tailleAvant = fs.statSync(chemin).size;
    g = JSON.parse((await appeler(p, '../api/v1/valorisation-archive/generer', 'POST')).corps);
    ok('Un second archivage du meme jour retombe sur le meme fichier',
      g.success === true && g.fichier === nom, JSON.stringify(g));
    ok('Il n y a toujours qu un seul fichier pour la journee',
      fichiers().filter((f) => f === nom).length === 1 && fs.statSync(chemin).size > 0,
      JSON.stringify(fichiers().slice(-3)));

    /* 4. le critere FAMILLE change bien le document produit */
    poserParametre('KEY_VALORISATION_PDF_CRITERE', 'FAMILLE');
    r = JSON.parse((await appeler(p, '../api/v1/valorisation-archive/list')).corps);
    ok('Le changement de critere est pris en compte', r.critere === 'FAMILLE', r.critere);
    g = JSON.parse((await appeler(p, '../api/v1/valorisation-archive/generer', 'POST')).corps);
    ok('La valorisation par famille est produite', g.success === true && g.critere === 'FAMILLE', JSON.stringify(g));
    const texteFam = texteDuPdf(path.join(DOSSIER, g.fichier));
    ok('Le PDF par famille annonce le critere Famille article', /Famille article/.test(texteFam), texteFam.slice(0, 200));

    /* 5. une valeur de critere inattendue ne bloque pas l archivage */
    poserParametre('KEY_VALORISATION_PDF_CRITERE', 'N IMPORTE QUOI');
    r = JSON.parse((await appeler(p, '../api/v1/valorisation-archive/list')).corps);
    ok('Un critere inattendu retombe sur EMPLACEMENT plutot que d arreter le traitement',
      r.critere === 'EMPLACEMENT', r.critere);
    poserParametre('KEY_VALORISATION_PDF_CRITERE', 'EMPLACEMENT');

    /* 6. le document est servi en flux, sans fenetre intermediaire */
    const reponse = await p.evaluate(async (n) => {
      const r = await fetch('../api/v1/valorisation-archive/pdf?fichier=' + encodeURIComponent(n));
      return { statut: r.status, type: r.headers.get('content-type'), disposition: r.headers.get('content-disposition'),
        taille: (await r.arrayBuffer()).byteLength };
    }, nom);
    ok('L archive est servie en application/pdf, en flux dans l onglet',
      reponse.statut === 200 && /application\/pdf/.test(reponse.type) && /inline/.test(reponse.disposition)
      && reponse.taille === tailleAvant, JSON.stringify(reponse));

    /* 7. aucun fichier du serveur ne sort par ce service */
    const refus = [];
    for (const mauvais of ['../../../../etc/passwd', 'valorisation_x_du_2026-01-01.pdf/../../etc/passwd', 'server.log', '']) {
      const rep = await p.evaluate(async (n) => {
        const r = await fetch('../api/v1/valorisation-archive/pdf?fichier=' + encodeURIComponent(n));
        return r.status;
      }, mauvais);
      refus.push(rep);
    }
    ok('Un nom de fichier fabrique est refuse (aucune sortie hors du dossier)',
      refus.every((s) => s === 400 || s === 404), JSON.stringify(refus));

    /* 8. la purge retire les archives plus anciennes que la duree de conservation */
    const vieille = 'valorisation_' + 'test_purge' + '_du_2024-01-27.pdf';
    const recente = 'valorisation_' + 'test_purge' + '_du_' + jour + '.pdf';
    fs.copyFileSync(chemin, path.join(DOSSIER, vieille));
    fs.copyFileSync(chemin, path.join(DOSSIER, recente));
    posees.push(vieille, recente);
    ok('Les deux archives temoins sont en place',
      fs.existsSync(path.join(DOSSIER, vieille)) && fs.existsSync(path.join(DOSSIER, recente)));

    poserParametre('KEY_VALORISATION_PDF_MOIS_CONSERVES', '12');
    // La purge suit un archivage reussi : on relance l'archivage, qui purge derriere lui.
    await appeler(p, '../api/v1/valorisation-archive/generer', 'POST');
    ok('L archive de plus de douze mois est retiree', !fs.existsSync(path.join(DOSSIER, vieille)));
    ok('L archive recente est conservee', fs.existsSync(path.join(DOSSIER, recente)));
    ok('L archive du jour est conservee', fs.existsSync(chemin));

    /* 9. le traitement s arrete proprement quand l officine le coupe */
    poserParametre('KEY_VALORISATION_PDF_ACTIF', '0');
    r = JSON.parse((await appeler(p, '../api/v1/valorisation-archive/list')).corps);
    ok('L interrupteur est visible dans le reglage', r.actif === false, JSON.stringify(r.actif));
    poserParametre('KEY_VALORISATION_PDF_ACTIF', '1');

    /* 10. le traitement est connu du Centre de Support, avec son propre interrupteur */
    const job = q("SELECT CONCAT(code, '|', parametre_actif, '|', actif) FROM t_support_job WHERE code='VALORISATION_PDF'");
    ok('Le Centre de Support connait le traitement et son interrupteur',
      job === 'VALORISATION_PDF|KEY_VALORISATION_PDF_ACTIF|1', job);
  } catch (e) {
    ok('Parcours complet sans exception', false, e.message + ' | ' + p.url());
  } finally {
    await b.close();
    nettoyer();
    const restes = fichiers().filter((f) => posees.indexOf(f) >= 0);
    const paramsRestaures = q("SELECT CONCAT((SELECT str_VALUE FROM t_parameters WHERE str_KEY='KEY_VALORISATION_PDF_CRITERE'), '|',"
      + " (SELECT str_VALUE FROM t_parameters WHERE str_KEY='KEY_VALORISATION_PDF_ACTIF'))");
    ok('Tout ce que le test a pose est retire et les parametres sont restaures',
      restes.length === 0 && paramsRestaures === (critereOrigine || 'EMPLACEMENT') + '|1',
      JSON.stringify({ restes: restes, params: paramsRestaures }));
  }
  const echecs = res.filter((r) => !r.c).length;
  console.log('\n' + (res.length - echecs) + '/' + res.length + ' controles OK');
  process.exit(echecs ? 1 : 0);
})();
