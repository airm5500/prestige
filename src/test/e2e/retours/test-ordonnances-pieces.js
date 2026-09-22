/* Evolution 6, point 2, vague 2 : les PIECES JUSTIFICATIVES des ordonnances clients.
 *
 * « Permettre de joindre une ou plusieurs pieces justificatives : images, fichiers PDF ou documents
 * numerises. Ces pieces doivent pouvoir etre visualisees et telechargees depuis la fiche de l'ordonnance. »
 *
 * Ce que le test etablit, en jouant l'ecran :
 *  - on joint PLUSIEURS pieces a une meme ordonnance, et la fiche les liste avec leur taille et leur auteur ;
 *  - la consultation est servie EN FLUX, inline, avec le bon type MIME ; le telechargement rend le nom d'origine ;
 *  - le fichier est ECRIT SUR DISQUE sous la racine de stockage, dans un dossier par mois, et la base ne
 *    contient que son chemin RELATIF ;
 *  - ce qui doit etre refuse l'est : mauvais type, fichier vide, fichier trop gros, ordonnance annulee ;
 *  - un nom de fichier hostile (../../ et chemin absolu) n'ecrit pas ailleurs que dans le dossier des pieces ;
 *  - une piece se retire (et son fichier avec), mais l'ordonnance, elle, ne se supprime pas ;
 *  - un chemin trafique en base n'est pas suivi : le service ne devient pas un lecteur de fichiers du serveur ;
 *  - la purge ramasse les fichiers orphelins et ne touche pas aux autres ;
 *  - sans le privilege d'ecriture : pas de depot, pas de retrait, mais la consultation reste.
 *
 * Tout ce que le test pose est retire a la fin, fichiers compris.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 320) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const MB4 = '--default-character-set=utf8mb4';
const exec = (s) => execFileSync('mariadb', [MB4, BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', [MB4, BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();

const MARQUE = 'E2E-PIECE';
const CLIENT = MARQUE + '-CLIENT';
const NOM_CLIENT = 'ZZPIECETEST';
/* La racine de stockage du logiciel, hors Windows : <user.home>/prestige (cf. util.StockageDisque). */
const RACINE = path.join(os.homedir(), 'prestige');
const ATELIER = fs.mkdtempSync(path.join(os.tmpdir(), 'pieces-'));

function nettoyer() {
  const chemins = q("SELECT GROUP_CONCAT(p.str_CHEMIN SEPARATOR '|') FROM t_ordonnance_client_piece p"
    + " JOIN t_ordonnance_client o ON o.lg_ORDONNANCE_ID = p.lg_ORDONNANCE_ID"
    + " WHERE o.lg_CLIENT_ID = '" + CLIENT + "'");
  if (chemins) {
    chemins.split('|').forEach((rel) => {
      try { fs.unlinkSync(path.join(RACINE, rel)); } catch (e) { /* deja parti */ }
    });
  }
  exec("DELETE p FROM t_ordonnance_client_piece p JOIN t_ordonnance_client o"
    + " ON o.lg_ORDONNANCE_ID = p.lg_ORDONNANCE_ID WHERE o.lg_CLIENT_ID='" + CLIENT + "';"
    + "DELETE d FROM t_ordonnance_client_detail d JOIN t_ordonnance_client o"
    + " ON o.lg_ORDONNANCE_ID = d.lg_ORDONNANCE_ID WHERE o.lg_CLIENT_ID='" + CLIENT + "';"
    + "DELETE FROM t_ordonnance_client WHERE lg_CLIENT_ID='" + CLIENT + "';"
    + "DELETE FROM t_client WHERE lg_CLIENT_ID='" + CLIENT + "';");
}

/* Un PDF minimal mais VALIDE : le test verifie le type servi, pas seulement le nom du fichier. */
function pdfMinimal() {
  return Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n'
    + '2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n'
    + '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\n'
    + 'trailer<</Root 1 0 R>>\n%%EOF\n', 'latin1');
}

function poser() {
  nettoyer();
  const type = q("SELECT lg_TYPE_CLIENT_ID FROM t_type_client WHERE str_NAME='Standard' LIMIT 1");
  exec("INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, lg_TYPE_CLIENT_ID,"
    + " dt_CREATED, dt_UPDATED, str_STATUT) VALUES ('" + CLIENT + "', '" + NOM_CLIENT + "', 'E2E', '"
    + type + "', NOW(), NOW(), 'enable');");
  fs.writeFileSync(path.join(ATELIER, 'ordonnance-scan.pdf'), pdfMinimal());
  fs.writeFileSync(path.join(ATELIER, 'photo-ordonnance.png'),
    Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex'));
  fs.writeFileSync(path.join(ATELIER, 'macro-interdite.exe'), Buffer.from('MZ interdit'));
  fs.writeFileSync(path.join(ATELIER, 'fichier-vide.pdf'), Buffer.alloc(0));
  /* 10 Mo + 1 octet : juste au-dela de la limite annoncee. */
  fs.writeFileSync(path.join(ATELIER, 'trop-gros.pdf'), Buffer.alloc(10 * 1024 * 1024 + 1, 0x41));
}

(async () => {
  poser();
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1700, height: 1000 } });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('ordonnanceclient', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('ordonnanceclient #grillePieces').length > 0,
      null, { timeout: 30000 });
    await p.waitForTimeout(2500);

    /* --------------------------------------------------------------- une ordonnance a garnir */
    const creee = await p.evaluate(async (client) => {
      const r = await fetch('../api/v1/ordonnance-client/enregistrer', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client, dateOrdonnance: new Date().toISOString().slice(0, 10),
          produits: [{ libelle: 'PRODUIT DU DOSSIER', quantite: 1 }] })
      });
      return JSON.parse(await r.text());
    }, CLIENT);
    ok('Précondition : une ordonnance à garnir', creee.success === true, JSON.stringify(creee));
    const ordonnanceId = creee.id;

    /* --------------------------------------------------------------- la fiche n accepte une pièce qu enregistrée */
    const avantEnregistrement = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('ordonnanceclient')[0];
      const btn = e.down('#grilleOrdonnances button[itemId=nouvelle]');
      btn.el.dom.click();
      const grille = e.down('#grillePieces');
      return { rappel: grille.down('#rappelPieces').getValue(),
        joindre: grille.down('button[itemId=joindrePiece]').isDisabled(),
        fichier: grille.down('#fichierPiece').isDisabled() };
    });
    ok('Sur une saisie non enregistrée, la zone de pièces le dit et reste inactive',
      /Enregistrez/.test(avantEnregistrement.rappel) && avantEnregistrement.joindre === true
      && avantEnregistrement.fichier === true, JSON.stringify(avantEnregistrement));
    await p.evaluate(() => {
      Ext.ComponentQuery.query('ordonnanceclient #vueFiche button[itemId=abandonner]')[0].el.dom.click();
    });
    await p.waitForTimeout(800);

    /* --------------------------------------------------------------- dépôt par l écran, à la souris */
    const ouvrirFiche = async () => {
      await p.evaluate(async (id) => {
        const r = await fetch('../api/v1/ordonnance-client/' + encodeURIComponent(id));
        const reponse = JSON.parse(await r.text());
        testextjs.app.getController('OrdonnanceClientCtr').remplirFiche(reponse, false);
      }, ordonnanceId);
      await p.waitForTimeout(1500);
    };
    await ouvrirFiche();

    const deposerParEcran = async (fichier) => {
      const input = await p.$('ordonnanceclient input[type=file], input[type=file]');
      await p.setInputFiles('input[type=file]', path.join(ATELIER, fichier));
      await p.waitForTimeout(600);
      await p.evaluate(() => {
        Ext.ComponentQuery.query('ordonnanceclient #grillePieces button[itemId=joindrePiece]')[0].el.dom.click();
      });
      await p.waitForTimeout(2500);
      return p.evaluate(() => {
        const e = Ext.ComponentQuery.query('ordonnanceclient')[0];
        const out = [];
        e.storePieces.each((r) => out.push({ id: r.get('id'), nom: r.get('nom'), type: r.get('type'),
          taille: r.get('taille'), par: r.get('deposeePar') }));
        return out;
      });
    };

    let pieces = await deposerParEcran('ordonnance-scan.pdf');
    ok('Une pièce déposée depuis la fiche apparaît dans la liste, avec son type, sa taille et son auteur',
      pieces.length === 1 && pieces[0].nom === 'ordonnance-scan.pdf'
      && pieces[0].type === 'application/pdf' && pieces[0].taille > 0 && pieces[0].par.length > 0,
      JSON.stringify(pieces));

    pieces = await deposerParEcran('photo-ordonnance.png');
    ok('PLUSIEURS pièces cohabitent sur la même ordonnance',
      pieces.length === 2 && pieces.some((x) => x.type === 'image/png'), JSON.stringify(pieces));

    /* --------------------------------------------------------------- sur disque, et le chemin en base */
    const enBase = q("SELECT GROUP_CONCAT(CONCAT(p.str_NOM_ORIGINE, '=', p.str_CHEMIN) SEPARATOR '|')"
      + " FROM t_ordonnance_client_piece p WHERE p.lg_ORDONNANCE_ID='" + ordonnanceId + "'");
    const mois = new Date();
    const dossierAttendu = 'ordonnances/' + mois.getFullYear() + '/'
      + String(mois.getMonth() + 1).padStart(2, '0') + '/';
    ok('La base ne contient qu un chemin RELATIF, rangé par mois',
      enBase.split('|').every((x) => x.split('=')[1].startsWith(dossierAttendu)), enBase);
    const surDisque = enBase.split('|').map((x) => x.split('=')[1])
      .map((rel) => ({ rel: rel, existe: fs.existsSync(path.join(RACINE, rel)) }));
    ok('Les fichiers sont réellement écrits sur le disque, sous la racine de stockage',
      surDisque.every((f) => f.existe), JSON.stringify(surDisque));
    ok('Le nom sur disque ne peut pas écraser celui d un autre client : c est l identifiant de la pièce',
      surDisque.every((f) => !/ordonnance-scan|photo-ordonnance/.test(f.rel)), JSON.stringify(surDisque));

    /* --------------------------------------------------------------- consultation et téléchargement */
    const pdf = pieces.find((x) => x.type === 'application/pdf');
    const servi = await p.evaluate(async (id) => {
      const r = await fetch('../api/v1/ordonnance-client/piece/' + encodeURIComponent(id));
      const octets = await r.arrayBuffer();
      return { statut: r.status, type: r.headers.get('content-type'),
        disposition: r.headers.get('content-disposition'), taille: octets.byteLength,
        debut: new TextDecoder('latin1').decode(octets.slice(0, 8)) };
    }, pdf.id);
    ok('La pièce est servie EN FLUX, inline, avec son vrai type et sous son nom d origine',
      servi.statut === 200 && servi.type === 'application/pdf' && /inline/.test(servi.disposition)
      && /ordonnance-scan\.pdf/.test(servi.disposition), JSON.stringify(servi));
    ok('C est bien le fichier déposé qui revient', servi.debut.indexOf('%PDF') === 0, servi.debut);

    const telecharge = await p.evaluate(async (id) => {
      const r = await fetch('../api/v1/ordonnance-client/piece/' + encodeURIComponent(id) + '/telecharger');
      return { statut: r.status, type: r.headers.get('content-type'),
        disposition: r.headers.get('content-disposition') };
    }, pdf.id);
    ok('Le téléchargement rend le même document en pièce attachée, sous son nom d origine',
      telecharge.statut === 200 && /attachment/.test(telecharge.disposition)
      && /ordonnance-scan\.pdf/.test(telecharge.disposition), JSON.stringify(telecharge));

    /* --------------------------------------------------------------- ce qui doit être refusé */
    const deposerParService = async (nomFichier, nomAnnonce) => p.evaluate(async (a) => {
      const donnees = new FormData();
      const octets = Uint8Array.from(atob(a.contenu), (c) => c.charCodeAt(0));
      donnees.append('fichier', new Blob([octets]), a.nom);
      const r = await fetch('../api/v1/ordonnance-client/pieces/' + encodeURIComponent(a.id), {
        method: 'POST', body: donnees
      });
      return JSON.parse(await r.text());
    }, { id: ordonnanceId, nom: nomAnnonce || nomFichier,
      contenu: fs.readFileSync(path.join(ATELIER, nomFichier)).toString('base64') });

    let r = await deposerParService('macro-interdite.exe');
    ok('Un fichier exécutable est REFUSÉ, et le message dit ce qui est accepté',
      r.success === false && /JPG, PNG, TIFF ou PDF/.test(r.message), JSON.stringify(r));
    r = await deposerParService('fichier-vide.pdf');
    ok('Un fichier vide est refusé', r.success === false && /vide/.test(r.message), JSON.stringify(r));
    r = await deposerParService('trop-gros.pdf');
    ok('Un fichier de plus de 10 Mo est refusé, et le message donne la taille et la limite',
      r.success === false && /limite est de 10 Mo/.test(r.message), JSON.stringify(r));

    /* Un nom hostile : il ne doit rien ecrire ailleurs que dans le dossier des pieces. */
    const avantHostile = q("SELECT COUNT(*) FROM t_ordonnance_client_piece WHERE lg_ORDONNANCE_ID='"
      + ordonnanceId + "'");
    r = await deposerParService('ordonnance-scan.pdf', '../../../evasion.pdf');
    const cheminHostile = q("SELECT p.str_CHEMIN FROM t_ordonnance_client_piece p"
      + " WHERE p.lg_ORDONNANCE_ID='" + ordonnanceId + "' ORDER BY p.dt_CREATED DESC LIMIT 1");
    ok('Un nom de fichier qui remonte l arborescence est désarmé, pas suivi',
      r.success === true && cheminHostile.startsWith(dossierAttendu) && !/\.\./.test(cheminHostile),
      JSON.stringify({ reponse: r.message, chemin: cheminHostile }));
    ok('Et rien n a été écrit hors du dossier des pièces',
      !fs.existsSync(path.join(os.homedir(), 'evasion.pdf')) && !fs.existsSync('/evasion.pdf'));
    const nomConserve = q("SELECT p.str_NOM_ORIGINE FROM t_ordonnance_client_piece p"
      + " WHERE p.str_CHEMIN='" + cheminHostile + "'");
    ok('Le nom conservé est le nom de fichier seul, sans son chemin', nomConserve === 'evasion.pdf',
      nomConserve);

    /* --------------------------------------------------------------- un chemin trafiqué en base */
    const piecePiegee = q("SELECT lg_PIECE_ID FROM t_ordonnance_client_piece WHERE str_CHEMIN='"
      + cheminHostile + "'");
    exec("UPDATE t_ordonnance_client_piece SET str_CHEMIN='../../../../etc/passwd'"
      + " WHERE lg_PIECE_ID='" + piecePiegee + "';");
    const trafique = await p.evaluate(async (id) => {
      const r = await fetch('../api/v1/ordonnance-client/piece/' + encodeURIComponent(id));
      return { statut: r.status, taille: (await r.arrayBuffer()).byteLength };
    }, piecePiegee);
    ok('Un chemin trafiqué EN BASE n est pas suivi : le service ne lit pas les fichiers du serveur',
      trafique.statut === 404, JSON.stringify(trafique));
    exec("UPDATE t_ordonnance_client_piece SET str_CHEMIN='" + cheminHostile + "'"
      + " WHERE lg_PIECE_ID='" + piecePiegee + "';");

    /* --------------------------------------------------------------- retrait d une pièce */
    const fichierAvant = path.join(RACINE, cheminHostile);
    ok('Précondition : le fichier de la pièce à retirer est bien là', fs.existsSync(fichierAvant));
    r = await p.evaluate(async (id) => {
      const rep = await fetch('../api/v1/ordonnance-client/piece/' + encodeURIComponent(id) + '/retirer',
        { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
      return JSON.parse(await rep.text());
    }, piecePiegee);
    ok('Une pièce se retire (une pièce jointe au mauvais patient est un problème de confidentialité)',
      r.success === true, JSON.stringify(r));
    ok('Sa ligne ET son fichier ont disparu',
      q("SELECT COUNT(*) FROM t_ordonnance_client_piece WHERE lg_PIECE_ID='" + piecePiegee + "'") === '0'
      && !fs.existsSync(fichierAvant));
    ok('L ordonnance, elle, est intacte : elle ne se supprime pas',
      q("SELECT COUNT(*) FROM t_ordonnance_client WHERE lg_ORDONNANCE_ID='" + ordonnanceId + "'") === '1');
    ok('Les deux autres pièces sont toujours là',
      q("SELECT COUNT(*) FROM t_ordonnance_client_piece WHERE lg_ORDONNANCE_ID='" + ordonnanceId + "'")
      === avantHostile);

    /* --------------------------------------------------------------- la purge des orphelines */
    const orpheline = path.join(RACINE, dossierAttendu, 'orpheline-e2e.pdf');
    fs.writeFileSync(orpheline, pdfMinimal());
    /* Vieillie d un jour : la purge ignore les fichiers du jour, qui peuvent appartenir a une saisie en cours. */
    const hier = new Date(Date.now() - 2 * 86400000);
    fs.utimesSync(orpheline, hier, hier);
    const gardee = path.join(RACINE, q("SELECT p.str_CHEMIN FROM t_ordonnance_client_piece p"
      + " WHERE p.lg_ORDONNANCE_ID='" + ordonnanceId + "' LIMIT 1"));
    fs.utimesSync(gardee, hier, hier);
    const purge = await p.evaluate(async () => {
      const r = await fetch('../api/v1/ordonnance-client/pieces/purger',
        { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
      return JSON.parse(await r.text());
    });
    ok('La purge ramasse le fichier orphelin', purge.success === true && !fs.existsSync(orpheline),
      JSON.stringify(purge));
    ok('Et ne touche PAS aux fichiers rattachés à une ordonnance', fs.existsSync(gardee), gardee);

    /* --------------------------------------------------------------- ordonnance annulée */
    await p.evaluate(async (id) => {
      await fetch('../api/v1/ordonnance-client/annuler?id=' + encodeURIComponent(id)
        + '&motif=' + encodeURIComponent('Contrôle e2e'),
        { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    }, ordonnanceId);
    r = await deposerParService('ordonnance-scan.pdf');
    ok('On ne joint plus de pièce à une ordonnance annulée : le document est clos',
      r.success === false && /annul/i.test(r.message), JSON.stringify(r));
    ok('Mais ses pièces restent consultables',
      (await p.evaluate(async (id) => {
        const rep = await fetch('../api/v1/ordonnance-client/pieces/' + encodeURIComponent(id));
        return JSON.parse(await rep.text());
      }, ordonnanceId)).total === Number(avantHostile));

    /* --------------------------------------------------------------- sans le privilège d écriture */
    const roleAdmin = q("SELECT ru.lg_ROLE_ID FROM t_role_user ru JOIN t_user u ON u.lg_USER_ID=ru.lg_USER_ID"
      + " WHERE u.str_LOGIN='admin' LIMIT 1");
    const privMaj = q("SELECT lg_PRIVELEGE_ID FROM t_privilege WHERE str_NAME='P_ORDONNANCE_CLIENT_MAJ'");
    const ligne = q("SELECT lg_ROLE_PRIVILEGE FROM t_role_privelege WHERE lg_ROLE_ID='" + roleAdmin + "'"
      + " AND lg_PRIVILEGE_ID='" + privMaj + "' LIMIT 1");
    try {
      exec("DELETE FROM t_role_privelege WHERE lg_ROLE_ID='" + roleAdmin + "'"
        + " AND lg_PRIVILEGE_ID='" + privMaj + "';");
      const ctx2 = await b.newContext({ viewport: { width: 1700, height: 1000 } });
      const p2 = await ctx2.newPage();
      await p2.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
      await p2.fill('#str_login', 'admin'); await p2.fill('#str_password', 'e2etest'); await p2.click('#login');
      await p2.waitForURL('**/general/**', { timeout: 40000 });
      await p2.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
      await p2.waitForTimeout(1500);
      await p2.evaluate(() => testextjs.app.getController('App').onRedirectTo('ordonnanceclient', {}));
      await p2.waitForFunction(() => Ext.ComponentQuery.query('ordonnanceclient #grillePieces').length > 0,
        null, { timeout: 30000 });
      await p2.waitForTimeout(3000);
      const vue = await p2.evaluate(() => {
        const e = Ext.ComponentQuery.query('ordonnanceclient')[0];
        const g = e.down('#grillePieces');
        return { joindre: g.down('button[itemId=joindrePiece]').isVisible(),
          retirer: g.down('button[itemId=retirerPiece]').isVisible(),
          fichier: g.down('#fichierPiece').isVisible(),
          voir: g.down('button[itemId=voirPiece]').isVisible() };
      });
      ok('Sans le privilège d écriture, la zone de dépôt et le retrait disparaissent',
        vue.joindre === false && vue.retirer === false && vue.fichier === false, JSON.stringify(vue));
      ok('Mais le bouton « Voir » reste : la consultation n est pas de l écriture', vue.voir === true);
      const refusDepot = await p2.evaluate(async (id) => {
        const donnees = new FormData();
        donnees.append('fichier', new Blob([new Uint8Array([37, 80, 68, 70])]), 'tentative.pdf');
        const r = await fetch('../api/v1/ordonnance-client/pieces/' + encodeURIComponent(id),
          { method: 'POST', body: donnees });
        return JSON.parse(await r.text());
      }, ordonnanceId);
      ok('Et le service refuse le dépôt, même appelé directement',
        refusDepot.success === false && /profil/i.test(refusDepot.message), JSON.stringify(refusDepot));
      const consultation = await p2.evaluate(async (id) => {
        const r = await fetch('../api/v1/ordonnance-client/pieces/' + encodeURIComponent(id));
        return JSON.parse(await r.text());
      }, ordonnanceId);
      ok('La consultation des pièces, elle, reste possible', consultation.success === true,
        JSON.stringify(consultation.total));
      await p2.close();
      await ctx2.close();
    } finally {
      if (ligne) {
        exec("INSERT IGNORE INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID,"
          + " dt_CREATED, dt_UPDATED) VALUES ('" + ligne + "', '" + roleAdmin + "', '" + privMaj
          + "', NOW(), NOW());");
      }
      ok('Le privilège est rendu à la fin du contrôle',
        q("SELECT COUNT(*) FROM t_role_privelege WHERE lg_ROLE_ID='" + roleAdmin + "'"
          + " AND lg_PRIVILEGE_ID='" + privMaj + "'") === '1');
    }

    ok('Aucune erreur JavaScript pendant tout le parcours', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Le parcours va au bout', false, e.message + ' ' + String(e.stack).slice(0, 280));
  } finally {
    await b.close();
    nettoyer();
    try { fs.rmSync(ATELIER, { recursive: true, force: true }); } catch (e) { /* rien */ }
    ok('Tout ce que le test a posé est retiré (lignes et fichiers)',
      q("SELECT CONCAT((SELECT COUNT(*) FROM t_ordonnance_client WHERE lg_CLIENT_ID='" + CLIENT + "'), '|',"
        + " (SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID='" + CLIENT + "'))") === '0|0');
    const bons = res.filter((x) => x.c).length;
    console.log('\n' + bons + '/' + res.length + ' controles OK');
    process.exit(bons === res.length ? 0 : 1);
  }
})();
