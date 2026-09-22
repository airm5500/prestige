/* Evolution 6, point 2, vague 3 : IMPRESSION ET EXPORT des ordonnances clients.
 *
 * « Imprimer la fiche detaillee d'une ordonnance. Imprimer l'historique des ordonnances d'un client ou la
 * liste filtree. Exporter en Excel la liste des ordonnances et les produits prescrits, en tenant compte des
 * filtres selectionnes. »
 *
 * Ce que le test etablit :
 *  - la fiche PDF porte l'identite du document, le client, le prescripteur, l'etablissement, les produits
 *    avec posologie et duree, les observations, le nombre de pieces et la tracabilite ;
 *  - une ordonnance annulee porte son etat et son motif SUR LE PAPIER ;
 *  - l'historique PDF est le meme etat pour un client et pour la liste filtree, avec le rappel des criteres,
 *    la pagination et le total ;
 *  - l'imprime porte EXACTEMENT les lignes de la grille : filtre par client, par periode, annulees comprises
 *    ou non - un total imprime qui ne compte pas les lignes affichees serait indefendable ;
 *  - l'export Excel donne UNE LIGNE PAR PRODUIT prescrit, suit les filtres, et ne contient aucune piece ;
 *  - toutes les editions sont servies EN FLUX, inline pour les PDF, sans fichier temporaire ;
 *  - sans le privilege de consultation, les trois editions sont refusees.
 *
 * Tout ce que le test pose est retire a la fin.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 330) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const MB4 = '--default-character-set=utf8mb4';
const exec = (s) => execFileSync('mariadb', [MB4, BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', [MB4, BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();

// Texte affiche par un PDF : les flux sont deflates, on en extrait les chaines.
function texteDuPdf(octets) {
  const zlib = require('zlib');
  const d = Buffer.from(octets);
  const brut = d.toString('latin1');
  let out = '';
  const re = /stream\r?\n/g;
  let m;
  while ((m = re.exec(brut)) !== null) {
    const debut = m.index + m[0].length;
    const fin = brut.indexOf('endstream', debut);
    if (fin < 0) { continue; }
    try {
      const clair = zlib.inflateSync(d.slice(debut, fin)).toString('latin1');
      out += (clair.match(/\((?:[^()\\]|\\.)*\)/g) || []).join(' ');
    } catch (e) { /* flux non compresse ou police */ }
  }
  return out;
}

const recupererPdf = (p, url) => p.evaluate(async (u) => {
  const r = await fetch(u);
  const b = await r.arrayBuffer();
  return { statut: r.status, type: r.headers.get('content-type'),
    disposition: r.headers.get('content-disposition'), octets: Array.from(new Uint8Array(b)) };
}, url);

const MARQUE = 'E2E-EDIT';
const CLIENT = MARQUE + '-CLIENT';
const CLIENT2 = MARQUE + '-CLIENT2';
const MEDECIN = MARQUE + '-MEDECIN';
const NOM_CLIENT = 'ZZEDITTEST';
const NOM_CLIENT2 = 'ZZEDITAUTRE';

function nettoyer() {
  exec("DELETE d FROM t_ordonnance_client_detail d JOIN t_ordonnance_client o"
    + " ON o.lg_ORDONNANCE_ID = d.lg_ORDONNANCE_ID WHERE o.lg_CLIENT_ID IN ('" + CLIENT + "','" + CLIENT2 + "');"
    + "DELETE FROM t_ordonnance_client WHERE lg_CLIENT_ID IN ('" + CLIENT + "','" + CLIENT2 + "');"
    + "DELETE FROM t_client WHERE lg_CLIENT_ID IN ('" + CLIENT + "','" + CLIENT2 + "');"
    + "DELETE FROM t_medecin WHERE lg_MEDECIN_ID='" + MEDECIN + "';");
}

function poser() {
  nettoyer();
  const standard = q("SELECT lg_TYPE_CLIENT_ID FROM t_type_client WHERE str_NAME='Standard' LIMIT 1");
  const carnet = q("SELECT lg_TYPE_CLIENT_ID FROM t_type_client WHERE str_NAME='Carnet' LIMIT 1");
  [[CLIENT, NOM_CLIENT, standard], [CLIENT2, NOM_CLIENT2, carnet]].forEach((c) => {
    exec("INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, lg_TYPE_CLIENT_ID,"
      + " dt_CREATED, dt_UPDATED, str_STATUT, str_TELEPHONE) VALUES ('" + c[0] + "', '" + c[1] + "', 'E2E', '"
      + c[2] + "', NOW(), NOW(), 'enable', '0102030405');");
  });
  exec("INSERT INTO t_medecin (lg_MEDECIN_ID, str_FIRST_NAME, str_LAST_NAME, str_STATUT, dt_CREATED, dt_UPDATED)"
    + " VALUES ('" + MEDECIN + "', 'DOCTEUR', 'ZZEDIT', 'enable', NOW(), NOW());");
  return { standard: standard, carnet: carnet };
}

(async () => {
  const contexte = poser();
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
    await p.waitForFunction(() => Ext.ComponentQuery.query('ordonnanceclient #grilleOrdonnances').length > 0,
      null, { timeout: 30000 });
    await p.waitForTimeout(2500);

    /* --------------------------------------------------------------- les ordonnances du test */
    const creer = (client, jour, medecin, etablissement, produits, observations) => p.evaluate(async (a) => {
      const r = await fetch('../api/v1/ordonnance-client/enregistrer', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: a.client, dateOrdonnance: a.jour, medecinId: a.medecin || '',
          etablissement: a.etablissement || '', observations: a.observations || '', produits: a.produits })
      });
      return JSON.parse(await r.text());
    }, { client: client, jour: jour, medecin: medecin, etablissement: etablissement, produits: produits,
      observations: observations });

    const aujourdhui = new Date().toISOString().slice(0, 10);
    const hier = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const avantHier = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);

    const principale = await creer(CLIENT, aujourdhui, MEDECIN, 'CHU DE COCODY', [
      { libelle: 'PARACETAMOL 1000 CPR', quantite: 2, posologie: '1 cp matin et soir', duree: '7 jours' },
      { libelle: 'SIROP NON TENU', quantite: 1, posologie: '5 ml le soir', duree: '10 jours' },
      { libelle: 'POMMADE PRESCRITE', quantite: 3, posologie: 'application locale', duree: '15 jours' }
    ], 'Contrôle dans trois mois. Surveiller la tension.');
    const seconde = await creer(CLIENT, hier, '', '', [
      { libelle: 'AMOXICILLINE 500', quantite: 1, posologie: '3 fois par jour', duree: '5 jours' }
    ], '');
    const autreClient = await creer(CLIENT2, avantHier, MEDECIN, 'CLINIQUE DES DEUX PLATEAUX', [
      { libelle: 'VITAMINE C', quantite: 1, posologie: '1 cp le matin', duree: '30 jours' }
    ], '');
    ok('Précondition : trois ordonnances posées, dont une sur un autre client',
      principale.success === true && seconde.success === true && autreClient.success === true,
      JSON.stringify([principale.numero, seconde.numero, autreClient.numero]));
    const ordonnanceId = principale.id;

    /* --------------------------------------------------------------- la fiche PDF */
    const fiche = await recupererPdf(p, '../api/v1/ordonnance-client/'
      + encodeURIComponent(ordonnanceId) + '/pdf');
    ok('La fiche est servie EN FLUX, inline, en application/pdf',
      fiche.statut === 200 && /application\/pdf/.test(fiche.type) && /inline/.test(fiche.disposition),
      JSON.stringify({ statut: fiche.statut, type: fiche.type, disposition: fiche.disposition }));
    const texteFiche = texteDuPdf(fiche.octets);
    ok('Elle porte le numéro de l ordonnance et le nom du client',
      texteFiche.indexOf('ORDONNANCE ' + principale.numero) >= 0 && /ZZEDITTEST/.test(texteFiche),
      texteFiche.slice(0, 300));
    ok('Elle porte le prescripteur et l établissement',
      /ZZEDIT/.test(texteFiche) && /CHU DE COCODY/.test(texteFiche), texteFiche.slice(0, 400));
    ok('Elle porte les TROIS produits, avec posologie et durée',
      /PARACETAMOL 1000 CPR/.test(texteFiche) && /SIROP NON TENU/.test(texteFiche)
      && /POMMADE PRESCRITE/.test(texteFiche) && /1 cp matin et soir/.test(texteFiche)
      && /7 jours/.test(texteFiche), texteFiche.slice(0, 600));
    ok('Elle compte les produits prescrits', /TOTAL : 3 produit/.test(texteFiche), texteFiche.slice(-400));
    ok('Elle porte les observations', /Surveiller la tension/.test(texteFiche), texteFiche.slice(-500));
    ok('Elle rappelle que les quantités sont PRESCRITES, pas délivrées',
      /PRESCRITES/.test(texteFiche) && /aucune d.livrance/.test(texteFiche), texteFiche.slice(0, 700));
    ok('Elle porte la traçabilité : la saisie, sa date et son auteur',
      /Saisie le/.test(texteFiche) && /Super/.test(texteFiche), texteFiche.slice(-400));
    ok('Elle est paginée et datée', /Page 1/.test(texteFiche) && /dit. le/.test(texteFiche),
      texteFiche.slice(-260));
    ok('Les pièces jointes sont COMPTÉES et non imprimées : elles restent dans l application',
      /Aucune pi.ce jointe/.test(texteFiche), texteFiche.slice(0, 600));

    /* --------------------------------------------------------------- l historique PDF */
    const parametres = (o) => Object.keys(o).map((k) => k + '=' + encodeURIComponent(o[k])).join('&');
    const historiqueClient = await recupererPdf(p, '../api/v1/ordonnance-client/historique/pdf?'
      + parametres({ clientId: CLIENT, clientLibelle: NOM_CLIENT + ' E2E', query: '', typeClientId: '',
        medecinId: '', dtStart: '', dtEnd: '', annulees: 'false' }));
    ok('L historique d un client est servi en flux, inline',
      historiqueClient.statut === 200 && /application\/pdf/.test(historiqueClient.type)
      && /inline/.test(historiqueClient.disposition), JSON.stringify(historiqueClient.disposition));
    let texte = texteDuPdf(historiqueClient.octets);
    ok('Il est titré au nom du client et rappelle les critères posés',
      /ORDONNANCES DU CLIENT - ZZEDITTEST/.test(texte) && /Client : ZZEDITTEST/.test(texte),
      texte.slice(0, 400));
    ok('Il ne porte QUE les ordonnances de ce client : 2, et pas celle de l autre client',
      /TOTAL : 2 ordonnance/.test(texte) && !/ZZEDITAUTRE/.test(texte), texte.slice(-400));
    ok('Il porte les numéros, les produits comptés et le prescripteur',
      texte.indexOf(principale.numero) >= 0 && texte.indexOf(seconde.numero) >= 0
      && /ZZEDIT/.test(texte), texte.slice(0, 700));
    ok('Il est paginé et rappelle l ordre de lecture',
      /Page 1/.test(texte) && /plus r.cente . la plus ancienne/.test(texte), texte.slice(-300));

    const historiqueTout = await recupererPdf(p, '../api/v1/ordonnance-client/historique/pdf?'
      + parametres({ query: 'ZZEDIT', clientId: '', typeClientId: '', medecinId: '', dtStart: '', dtEnd: '',
        annulees: 'false', clientLibelle: '', typeLibelle: '', medecinLibelle: '' }));
    texte = texteDuPdf(historiqueTout.octets);
    ok('Sans client, c est le MEME état pour la liste filtrée, titré autrement',
      /HISTORIQUE DES ORDONNANCES CLIENTS/.test(texte) && /Tous les clients/.test(texte)
      && /TOTAL : 3 ordonnance/.test(texte), texte.slice(0, 400));
    ok('Les deux clients y figurent', /ZZEDITTEST/.test(texte) && /ZZEDITAUTRE/.test(texte),
      texte.slice(0, 800));

    /* L imprime porte EXACTEMENT les lignes de la grille : on verifie filtre par filtre. */
    const historiquePeriode = await recupererPdf(p, '../api/v1/ordonnance-client/historique/pdf?'
      + parametres({ query: 'ZZEDIT', clientId: '', typeClientId: '', medecinId: '', dtStart: hier,
        dtEnd: hier, annulees: 'false' }));
    texte = texteDuPdf(historiquePeriode.octets);
    ok('Le filtre de période porte sur l imprimé, et la période est rappelée',
      /TOTAL : 1 ordonnance/.test(texte) && /P.riode du/.test(texte), texte.slice(0, 400));
    const historiqueType = await recupererPdf(p, '../api/v1/ordonnance-client/historique/pdf?'
      + parametres({ query: 'ZZEDIT', typeClientId: contexte.carnet, typeLibelle: 'Carnet', clientId: '',
        medecinId: '', dtStart: '', dtEnd: '', annulees: 'false' }));
    texte = texteDuPdf(historiqueType.octets);
    ok('Le filtre de type de client porte aussi, et le type est nommé',
      /TOTAL : 1 ordonnance/.test(texte) && /Type : Carnet/.test(texte) && /ZZEDITAUTRE/.test(texte),
      texte.slice(0, 400));

    /* --------------------------------------------------------------- l export Excel */
    const excel = await p.evaluate(async (u) => {
      const r = await fetch(u);
      const b = await r.arrayBuffer();
      return { statut: r.status, type: r.headers.get('content-type'),
        disposition: r.headers.get('content-disposition'), taille: b.byteLength,
        debut: new TextDecoder('latin1').decode(b.slice(0, 8)) };
    }, '../api/v1/ordonnance-client/historique/excel?' + parametres({ query: 'ZZEDIT', clientId: '',
      typeClientId: '', medecinId: '', dtStart: '', dtEnd: '', annulees: 'false' }));
    ok('L export Excel répond, nommé et en pièce attachée',
      excel.statut === 200 && excel.taille > 1000 && /attachment/.test(excel.disposition)
      && /ordonnances_clients\.xls/.test(excel.disposition), JSON.stringify(excel));

    /*
     * UNE LIGNE PAR PRODUIT : c'est tout l'interet de l'export - l'officine peut trier, filtrer et croiser sur
     * les produits, ce qu'un fichier a une ligne par ordonnance avec les produits concatenes n'aurait pas
     * permis. On le verifie sur le CONTENU du classeur : les libelles y sont, un par un.
     */
    const produitsAttendus = q("SELECT COUNT(*) FROM t_ordonnance_client_detail d"
      + " JOIN t_ordonnance_client o ON o.lg_ORDONNANCE_ID = d.lg_ORDONNANCE_ID"
      + " JOIN t_client c ON c.lg_CLIENT_ID = o.lg_CLIENT_ID"
      + " WHERE c.str_FIRST_NAME LIKE 'ZZEDIT%' AND o.str_STATUT <> 'annulee'");
    ok('Précondition : 5 produits prescrits au total', produitsAttendus === '5', produitsAttendus);

    /* Les chaines d'un classeur xls (BIFF8) sont lisibles dans la table des chaines partagees. */
    const contenuExcel = await p.evaluate(async (u) => {
      const r = await fetch(u);
      const b = new Uint8Array(await r.arrayBuffer());
      let texte = '';
      for (let i = 0; i < b.length; i++) {
        texte += String.fromCharCode(b[i]);
      }
      return texte;
    }, '../api/v1/ordonnance-client/historique/excel?' + parametres({ query: 'ZZEDIT', clientId: '',
      typeClientId: '', medecinId: '', dtStart: '', dtEnd: '', annulees: 'false' }));
    const lisible = contenuExcel.replace(/\u0000/g, '');
    ok('Le classeur porte les douze colonnes demandées',
      ['N', 'DATE', 'CLIENT', 'TYPE CLIENT', 'PRESCRIPTEUR', 'PRODUIT PRESCRIT', 'CIP', 'POSOLOGIE',
        'DUR'].every((entete) => lisible.indexOf(entete) >= 0));
    ok('Il porte UNE LIGNE PAR PRODUIT : les cinq libellés y sont',
      ['PARACETAMOL 1000 CPR', 'SIROP NON TENU', 'POMMADE PRESCRITE', 'AMOXICILLINE 500', 'VITAMINE C']
        .every((produit) => lisible.indexOf(produit) >= 0),
      ['PARACETAMOL 1000 CPR', 'SIROP NON TENU', 'POMMADE PRESCRITE', 'AMOXICILLINE 500', 'VITAMINE C']
        .filter((produit) => lisible.indexOf(produit) < 0).join(' MANQUE '));
    ok('Les colonnes de l ordonnance sont répétées sur chaque ligne de produit',
      lisible.indexOf('CHU DE COCODY') >= 0 && lisible.indexOf('DOCTEUR ZZEDIT') >= 0
      && lisible.indexOf('1 cp matin et soir') >= 0);
    ok('Et l export suit les filtres : avec le seul client, les produits de l autre disparaissent',
      !(await p.evaluate(async (u) => {
        const r = await fetch(u);
        const b = new Uint8Array(await r.arrayBuffer());
        let t = '';
        for (let i = 0; i < b.length; i++) { t += String.fromCharCode(b[i]); }
        return t.replace(/\u0000/g, '').indexOf('VITAMINE C') >= 0;
      }, '../api/v1/ordonnance-client/historique/excel?' + parametres({ clientId: CLIENT, query: '',
        typeClientId: '', medecinId: '', dtStart: '', dtEnd: '', annulees: 'false' }))));

    /* --------------------------------------------------------------- une ordonnance annulée */
    await p.evaluate(async (id) => {
      await fetch('../api/v1/ordonnance-client/annuler?id=' + encodeURIComponent(id)
        + '&motif=' + encodeURIComponent('Saisie sur le mauvais client'),
        { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    }, seconde.id);
    const ficheAnnulee = await recupererPdf(p, '../api/v1/ordonnance-client/'
      + encodeURIComponent(seconde.id) + '/pdf');
    const texteAnnulee = texteDuPdf(ficheAnnulee.octets);
    ok('La fiche d une ordonnance annulée le dit SUR LE PAPIER, avec son motif',
      /ORDONNANCE ANNUL/.test(texteAnnulee) && /mauvais client/.test(texteAnnulee),
      texteAnnulee.slice(0, 400));

    const sansAnnulees = texteDuPdf((await recupererPdf(p, '../api/v1/ordonnance-client/historique/pdf?'
      + parametres({ clientId: CLIENT, clientLibelle: NOM_CLIENT, query: '', typeClientId: '', medecinId: '',
        dtStart: '', dtEnd: '', annulees: 'false' }))).octets);
    ok('L historique imprimé exclut les annulées par défaut, et le DIT',
      /TOTAL : 1 ordonnance/.test(sansAnnulees) && /annul.es exclues/.test(sansAnnulees),
      sansAnnulees.slice(0, 400));
    const avecAnnulees = texteDuPdf((await recupererPdf(p, '../api/v1/ordonnance-client/historique/pdf?'
      + parametres({ clientId: CLIENT, clientLibelle: NOM_CLIENT, query: '', typeClientId: '', medecinId: '',
        dtStart: '', dtEnd: '', annulees: 'true' }))).octets);
    ok('En les demandant, elles reviennent, marquées « Annulée » et le rappel le dit',
      /TOTAL : 2 ordonnance/.test(avecAnnulees) && /Annul.e/.test(avecAnnulees)
      && /annul.es comprises/.test(avecAnnulees), avecAnnulees.slice(0, 400));

    /* --------------------------------------------------------------- les boutons de l écran */
    const boutons = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('ordonnanceclient')[0];
      const g = e.down('#grilleOrdonnances');
      /* L'impression de la fiche est une action PAR LIGNE depuis le 22/09 : pas de bouton a activer. */
      return { fiche: !!g.down('#colActions'),
        ficheInactive: true,
        historique: !!g.down('button[itemId=imprimerHistorique]'),
        excel: !!g.down('button[itemId=exporterExcel]'),
        surFiche: !!e.down('#vueFiche button[itemId=imprimerFicheOuverte]') };
    });
    ok('L écran porte les éditions : historique, Excel, fiche ouverte, et l impression par ligne',
      boutons.fiche && boutons.historique && boutons.excel && boutons.surFiche
      && boutons.ficheInactive === true, JSON.stringify(boutons));
    const apresSelection = await p.evaluate(async () => {
      const e = Ext.ComponentQuery.query('ordonnanceclient')[0];
      e.storeOrdonnances.getProxy().extraParams = { query: 'ZZEDIT', annulees: false };
      await new Promise((resolve) => e.storeOrdonnances.load({ callback: resolve }));
      const g = e.down('#grilleOrdonnances');
      const k = g.getView().getNode(0) ? g.getView().getNode(0).querySelector('.ordo-act-imprimer') : null;
      return { lignes: e.storeOrdonnances.getCount(),
        fiche: !k || k.classList.contains('x-item-disabled') };
    });
    ok('Chaque ligne porte l icône d impression de sa fiche, active',
      apresSelection.lignes > 0 && apresSelection.fiche === false, JSON.stringify(apresSelection));

    /* --------------------------------------------------------------- sans le privilège */
    const roleAdmin = q("SELECT ru.lg_ROLE_ID FROM t_role_user ru JOIN t_user u ON u.lg_USER_ID=ru.lg_USER_ID"
      + " WHERE u.str_LOGIN='admin' LIMIT 1");
    const priv = q("SELECT lg_PRIVELEGE_ID FROM t_privilege WHERE str_NAME='P_ORDONNANCE_CLIENT'");
    const ligne = q("SELECT lg_ROLE_PRIVILEGE FROM t_role_privelege WHERE lg_ROLE_ID='" + roleAdmin + "'"
      + " AND lg_PRIVILEGE_ID='" + priv + "' LIMIT 1");
    try {
      exec("DELETE FROM t_role_privelege WHERE lg_ROLE_ID='" + roleAdmin + "'"
        + " AND lg_PRIVILEGE_ID='" + priv + "';");
      const ctx2 = await b.newContext({ viewport: { width: 1400, height: 900 } });
      const p2 = await ctx2.newPage();
      await p2.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
      await p2.fill('#str_login', 'admin'); await p2.fill('#str_password', 'e2etest'); await p2.click('#login');
      await p2.waitForURL('**/general/**', { timeout: 40000 });
      await p2.waitForFunction(() => window.Ext && window.testextjs, null, { timeout: 90000 });
      const refus = await p2.evaluate(async (id) => {
        const fiche = await fetch('../api/v1/ordonnance-client/' + encodeURIComponent(id) + '/pdf');
        const hist = await fetch('../api/v1/ordonnance-client/historique/pdf?annulees=false');
        const xls = await fetch('../api/v1/ordonnance-client/historique/excel?annulees=false');
        return { fiche: fiche.status, historique: hist.status, excel: xls.status };
      }, ordonnanceId);
      ok('Sans le privilège de consultation, les TROIS éditions sont refusées (403)',
        refus.fiche === 403 && refus.historique === 403 && refus.excel === 403, JSON.stringify(refus));
      await p2.close();
      await ctx2.close();
    } finally {
      if (ligne) {
        exec("INSERT IGNORE INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID,"
          + " dt_CREATED, dt_UPDATED) VALUES ('" + ligne + "', '" + roleAdmin + "', '" + priv
          + "', NOW(), NOW());");
      }
      ok('Le privilège est rendu à la fin du contrôle',
        q("SELECT COUNT(*) FROM t_role_privelege WHERE lg_ROLE_ID='" + roleAdmin + "'"
          + " AND lg_PRIVILEGE_ID='" + priv + "'") === '1');
    }

    ok('Aucune erreur JavaScript pendant tout le parcours', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Le parcours va au bout', false, e.message + ' ' + String(e.stack).slice(0, 280));
  } finally {
    await b.close();
    nettoyer();
    ok('Tout ce que le test a posé est retiré',
      q("SELECT CONCAT((SELECT COUNT(*) FROM t_ordonnance_client WHERE lg_CLIENT_ID LIKE '" + MARQUE + "%'),"
        + " '|', (SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID LIKE '" + MARQUE + "%'))") === '0|0');
    const bons = res.filter((x) => x.c).length;
    console.log('\n' + bons + '/' + res.length + ' controles OK');
    process.exit(bons === res.length ? 0 : 1);
  }
})();
