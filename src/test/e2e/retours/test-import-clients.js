/* Evolution 5, point 3 (suite) : import de clients standards avec choix des colonnes, controle des lignes
 * et privilege.
 *
 * L'import historique lisait les colonnes par leur POSITION, figee dans le code (tabString[0] a
 * tabString[9]), sans aucun controle : un fichier dont les colonnes etaient dans un autre ordre etait
 * importe de travers, et une seule ligne fautive faisait echouer le lot entier. Le nouvel import fait
 * designer les colonnes par l'operateur, juge chaque ligne separement, rend son rapport AVANT d'ecrire,
 * et n'est ouvert qu'aux profils portant P_IMPORT_CLIENTS.
 *
 * Le parcours est joue a l'ecran : choix du fichier, lecture des colonnes, designation, controle, import.
 * Les clients crees et le mot de passe de l'operateur d'essai sont remis en etat a la fin. */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 320) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();

const NOM = 'E2EIMPORT';
const TMP = '/tmp/e2e-import-clients';
const MDP_VENDEUR_ORIGINE = q("SELECT str_PASSWORD FROM t_user WHERE str_LOGIN='VENDEUR'");
// md5('e2etest')
const MDP_E2E = '484555f12d770efb8b0be1260cbf7a1b';
// Numero deja porte par un client standard existant : il doit etre refuse a l'import.
const DEJA_PRIS = q("SELECT str_TELEPHONE FROM t_client WHERE lg_TYPE_CLIENT_ID='6' AND str_TELEPHONE IS NOT NULL LIMIT 1");

function nettoyer() {
  exec("DELETE FROM t_compte_client WHERE lg_CLIENT_ID IN (SELECT lg_CLIENT_ID FROM t_client WHERE str_FIRST_NAME LIKE '" + NOM + "%');"
    + "DELETE FROM t_client WHERE str_FIRST_NAME LIKE '" + NOM + "%';"
    + "UPDATE t_user SET str_PASSWORD='" + MDP_VENDEUR_ORIGINE + "' WHERE str_LOGIN='VENDEUR';");
}

/* Un fichier volontairement penible : colonnes dans un ordre inattendu, en-tete, une ligne sans
   telephone, un numero invalide, un doublon interne, un numero deja en base, une ligne vide, et un
   numero ecrit avec des separateurs. */
function ecrireFichier() {
  fs.mkdirSync(TMP, { recursive: true });
  const lignes = [
    'TELEPHONE;PRENOMS;NOM',
    '07 08 47 30 01;Jean Marc;' + NOM + '-A',
    '0708473002;Awa;' + NOM + '-B',
    ';Paul;' + NOM + '-SANSTEL',
    'pas-un-numero;Ali;' + NOM + '-INVALIDE',
    '0708473001;Bis;' + NOM + '-DOUBLON',
    ';;',
    (DEJA_PRIS || '0708473003') + ';Deja;' + NOM + '-EXISTANT',
    '0508473004;Awa Marie;' + NOM + '-C'
  ];
  const chemin = path.join(TMP, 'clients.csv');
  fs.writeFileSync(chemin, '﻿' + lignes.join('\r\n') + '\r\n', 'utf8');
  return chemin;
}

const connexion = async (p, login) => {
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', login); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 40000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
  await p.waitForTimeout(1500);
};

(async () => {
  nettoyer();
  exec("UPDATE t_user SET str_PASSWORD='" + MDP_E2E + "' WHERE str_LOGIN='VENDEUR';");
  const fichier = ecrireFichier();
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const err = [];
  // Une session par operateur : revenir a la page de connexion avec une session ouverte
  // renvoie directement dans l'application, on ne pourrait pas changer d'operateur.
  const nouvelOnglet = async () => {
    const c = await b.newContext({ viewport: { width: 1700, height: 950 } });
    const page = await c.newPage();
    page.on('pageerror', (e) => err.push(String(e.message)));
    return page;
  };
  let p = await nouvelOnglet();
  try {
    /* ---------- 1. le privilege commande l acces ---------- */
    await connexion(p, 'VENDEUR');
    let autorise = await p.evaluate(async () => {
      const r = await fetch('../api/v1/client/import/autorise');
      return JSON.parse(await r.text());
    });
    ok('Un profil sans le privilège n est pas autorisé à importer', autorise.authorize === false, JSON.stringify(autorise));

    await p.evaluate(() => { testextjs.app.getController('App').onRedirectTo('clientmanager', {}); });
    await p.waitForFunction(() => Ext.ComponentQuery.query('clientgestion').length > 0, null, { timeout: 25000 });
    await p.waitForTimeout(4000);
    let visible = await p.evaluate(() => {
      const btn = Ext.ComponentQuery.query('clientgestion #btnImportClientStandard')[0];
      return btn ? !btn.isHidden() : null;
    });
    ok('Le bouton d import lui reste caché', visible === false, String(visible));

    // Et le service refuse meme si on l appelle directement.
    const refus = await p.evaluate(async () => {
      const fd = new FormData();
      fd.append('fichier', new Blob(['NOM;PRENOMS;TEL\nA;B;0708473750'], { type: 'text/csv' }), 'x.csv');
      fd.append('entete', 'true');
      const r = await fetch('../api/v1/client/import/analyse', { method: 'POST', body: fd });
      return (await r.text());
    });
    ok('Le service d import refuse ce profil même appelé directement',
      /ne permet pas d.importer/.test(refus), refus.slice(0, 200));

    /* ---------- 2. le profil autorise : lecture des colonnes ---------- */
    p = await nouvelOnglet();
    await connexion(p, 'admin');
    autorise = await p.evaluate(async () => {
      const r = await fetch('../api/v1/client/import/autorise');
      return JSON.parse(await r.text());
    });
    ok('Un profil portant le privilège est autorisé', autorise.authorize === true, JSON.stringify(autorise));

    await p.evaluate(() => { testextjs.app.getController('App').onRedirectTo('clientmanager', {}); });
    await p.waitForFunction(() => Ext.ComponentQuery.query('clientgestion').length > 0, null, { timeout: 25000 });
    await p.waitForTimeout(4000);
    visible = await p.evaluate(() => {
      const btn = Ext.ComponentQuery.query('clientgestion #btnImportClientStandard')[0];
      return btn ? !btn.isHidden() : null;
    });
    ok('Le bouton d import lui est proposé, à côté de l import historique', visible === true, String(visible));
    const importHistorique = await p.evaluate(() => !!Ext.getCmp('btn_import'));
    ok('L import historique est conservé', importHistorique === true);

    await p.evaluate(() => {
      const btn = Ext.ComponentQuery.query('clientgestion #btnImportClientStandard')[0];
      btn.handler.call(btn.scope || btn, btn);
    });
    await p.waitForFunction(() => Ext.ComponentQuery.query('importclientstandard').length > 0, null, { timeout: 15000 });
    await p.waitForTimeout(1000);

    const etapes = await p.evaluate(() => {
      const w = Ext.ComponentQuery.query('importclientstandard')[0];
      return {
        colonnesDesactivees: w.down('#zoneColonnes').isDisabled(),
        importDesactive: w.down('#importer').isDisabled(),
        message: w.down('#message').el.dom.textContent.trim()
      };
    });
    ok('À l ouverture, seules les étapes déjà possibles sont actives',
      etapes.colonnesDesactivees === true && etapes.importDesactive === true, JSON.stringify(etapes));

    await p.setInputFiles('#' + await p.evaluate(() => Ext.ComponentQuery.query('importclientstandard #fichier')[0].fileInputEl.id), fichier);
    await p.evaluate(() => {
      const w = Ext.ComponentQuery.query('importclientstandard')[0];
      const btn = w.down('#analyser');
      btn.handler(btn);
    });
    await p.waitForTimeout(6000);

    const analyse = await p.evaluate(() => {
      const w = Ext.ComponentQuery.query('importclientstandard')[0];
      const combo = w.down('#colonneTelephone');
      const v = []; combo.getStore().each((r) => v.push([r.get('index'), r.get('libelle'), r.get('exemples')]));
      return {
        message: w.down('#message').el.dom.textContent.trim(),
        colonnes: v,
        colonnesActives: !w.down('#zoneColonnes').isDisabled(),
        preNom: w.down('#colonneNom').getValue(),
        prePrenoms: w.down('#colonnePrenoms').getValue(),
        preTel: w.down('#colonneTelephone').getValue()
      };
    });
    ok('Les colonnes du fichier sont rendues telles qu elles sont, avec un échantillon',
      analyse.colonnes.length === 3 && analyse.colonnes[0][1] === 'TELEPHONE'
      && /07 08 47 30 01/.test(analyse.colonnes[0][2]), JSON.stringify(analyse.colonnes));
    ok('Le séparateur est détecté et annoncé', /séparateur/.test(analyse.message) && /;/.test(analyse.message), analyse.message);
    ok('L étape des colonnes s active après la lecture', analyse.colonnesActives === true);
    const jeton = await p.evaluate(() => Ext.ComponentQuery.query('importclientstandard')[0].jeton);
    ok('Le fichier n est envoyé qu une fois : un jeton le désigne pour les étapes suivantes',
      !!jeton && jeton.length > 10, String(jeton));
    ok('Les colonnes sont pré-désignées d après les titres, malgré leur ordre inattendu',
      analyse.preTel === 0 && analyse.prePrenoms === 1 && analyse.preNom === 2,
      JSON.stringify([analyse.preNom, analyse.prePrenoms, analyse.preTel]));

    /* ---------- 3. controle : rapport ligne a ligne, sans rien ecrire ---------- */
    const avantControle = q("SELECT COUNT(*) FROM t_client WHERE str_FIRST_NAME LIKE '" + NOM + "%'");
    await p.evaluate(() => {
      const w = Ext.ComponentQuery.query('importclientstandard')[0];
      const btn = w.down('#controler');
      btn.handler(btn);
    });
    await p.waitForTimeout(6000);

    const rapport = await p.evaluate(() => {
      const w = Ext.ComponentQuery.query('importclientstandard')[0];
      const lignes = []; w.down('#rapport').getStore().each((r) => lignes.push(r.data));
      return { message: w.down('#message').el.dom.textContent.trim(), lignes: lignes,
        importActif: !w.down('#importer').isDisabled() };
    });
    ok('Le contrôle n écrit rien en base',
      q("SELECT COUNT(*) FROM t_client WHERE str_FIRST_NAME LIKE '" + NOM + "%'") === avantControle, avantControle);
    ok('Le rapport annonce 3 lignes retenues et 4 rejetées',
      /3 ligne\(s\) retenue\(s\), 4 rejetée\(s\)/.test(rapport.message), rapport.message);

    const parNom = {};
    rapport.lignes.forEach((l) => { parNom[l.nom] = l; });
    ok('La ligne sans téléphone est rejetée avec son motif',
      parNom[NOM + '-SANSTEL'] && /Num.ro de t.l.phone invalide/.test(parNom[NOM + '-SANSTEL'].motif),
      parNom[NOM + '-SANSTEL'] && parNom[NOM + '-SANSTEL'].motif);
    ok('Le numéro invalide est rejeté avec son motif',
      parNom[NOM + '-INVALIDE'] && /01, 05 ou 07/.test(parNom[NOM + '-INVALIDE'].motif),
      parNom[NOM + '-INVALIDE'] && parNom[NOM + '-INVALIDE'].motif);
    ok('Le doublon interne au fichier est rejeté en disant à quelle ligne',
      parNom[NOM + '-DOUBLON'] && /doublon dans le fichier \(déjà ligne 2\)/.test(parNom[NOM + '-DOUBLON'].motif),
      parNom[NOM + '-DOUBLON'] && parNom[NOM + '-DOUBLON'].motif);
    ok('Le numéro déjà attribué en base est rejeté',
      parNom[NOM + '-EXISTANT'] && /déjà attribué à un client standard existant/.test(parNom[NOM + '-EXISTANT'].motif),
      parNom[NOM + '-EXISTANT'] && parNom[NOM + '-EXISTANT'].motif);
    ok('La ligne entièrement vide est ignorée et non rejetée',
      rapport.lignes.length === 7, rapport.lignes.length);
    ok('Le numéro saisi avec des séparateurs est normalisé',
      parNom[NOM + '-A'] && parNom[NOM + '-A'].telephone === '0708473001' && parNom[NOM + '-A'].etat === 'Retenue',
      parNom[NOM + '-A'] && JSON.stringify(parNom[NOM + '-A']));
    ok('Le bouton d import ne s active qu une fois le contrôle fait', rapport.importActif === true);

    /* ---------- 4. import : seules les lignes retenues sont ecrites ---------- */
    await p.evaluate(() => {
      const w = Ext.ComponentQuery.query('importclientstandard')[0];
      const btn = w.down('#importer');
      btn.handler(btn);
    });
    await p.waitForTimeout(9000);

    const apres = await p.evaluate(() => {
      const w = Ext.ComponentQuery.query('importclientstandard')[0];
      const lignes = []; w.down('#rapport').getStore().each((r) => lignes.push(r.data));
      return { message: w.down('#message').el.dom.textContent.trim(), lignes: lignes,
        importActif: !w.down('#importer').isDisabled() };
    });
    ok('L import annonce 3 clients créés', /3 client\(s\) créé\(s\)/.test(apres.message), apres.message);
    ok('Le bouton d import se désactive après écriture (pas de double import)',
      apres.importActif === false, String(apres.importActif));

    const crees = q("SELECT GROUP_CONCAT(CONCAT(str_FIRST_NAME, '=', COALESCE(str_TELEPHONE,'')) ORDER BY str_FIRST_NAME SEPARATOR '|')"
      + " FROM t_client WHERE str_FIRST_NAME LIKE '" + NOM + "%'");
    ok('Exactement les trois lignes retenues sont créées, avec leur numéro normalisé',
      crees === NOM + '-A=0708473001|' + NOM + '-B=0708473002|' + NOM + '-C=0508473004', crees);
    const types = q("SELECT COUNT(*) FROM t_client WHERE str_FIRST_NAME LIKE '" + NOM + "%' AND lg_TYPE_CLIENT_ID='6' AND str_STATUT='enable'");
    ok('Les clients importés sont des clients standards actifs', types === '3', types);
    const comptes = q("SELECT COUNT(*) FROM t_compte_client WHERE lg_CLIENT_ID IN"
      + " (SELECT lg_CLIENT_ID FROM t_client WHERE str_FIRST_NAME LIKE '" + NOM + "%')");
    ok('Chaque client importé a son compte client, comme par le formulaire', comptes === '3', comptes);
    const prenoms = q("SELECT str_LAST_NAME FROM t_client WHERE str_FIRST_NAME='" + NOM + "-C'");
    ok('Les prénoms viennent bien de la colonne désignée', prenoms === 'Awa Marie', prenoms);

    /* ---------- 5. rejouer le meme fichier ne cree aucun doublon ---------- */
    await p.evaluate(() => {
      const w = Ext.ComponentQuery.query('importclientstandard')[0];
      const btn = w.down('#controler');
      btn.handler(btn);
    });
    await p.waitForTimeout(6000);
    const deuxieme = await p.evaluate(() => Ext.ComponentQuery.query('importclientstandard')[0]
      .down('#message').el.dom.textContent.trim());
    ok('Rejouer le même fichier ne retient plus aucune ligne',
      /0 ligne\(s\) retenue\(s\), 7 rejetée\(s\)/.test(deuxieme), deuxieme);

    ok('Aucune erreur JavaScript pendant tout le parcours', err.length === 0, JSON.stringify(err.slice(0, 3)));
  } catch (e) {
    ok('Parcours complet sans exception', false, e.message + ' | ' + (p ? p.url() : ''));
  } finally {
    await b.close();
    nettoyer();
    try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* deja retire */ }
    const reste = q("SELECT CONCAT((SELECT COUNT(*) FROM t_client WHERE str_FIRST_NAME LIKE '" + NOM + "%'), '|',"
      + " (SELECT str_PASSWORD FROM t_user WHERE str_LOGIN='VENDEUR'))");
    ok('Tout ce que le test a posé est retiré et le mot de passe d essai restauré',
      reste === '0|' + MDP_VENDEUR_ORIGINE, reste);
  }
  const echecs = res.filter((r) => !r.c).length;
  console.log('\n' + (res.length - echecs) + '/' + res.length + ' controles OK');
  process.exit(echecs ? 1 : 0);
})();
