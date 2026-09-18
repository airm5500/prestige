/* Evolution 6, point 2, vague 1 : « GESTION ORDONNANCES CLIENTS ».
 *
 * Ce que le test etablit, en jouant l'ecran a la souris et au clavier :
 *  - le menu existe, dans SERVICE CLIENT, avec ses deux privileges ;
 *  - on saisit une ordonnance de bout en bout : client, date, prescripteur, etablissement, produits
 *    (un du referentiel, un en saisie libre), posologie, duree, observations ;
 *  - elle apparait dans l'historique avec son numero, et un client peut en avoir PLUSIEURS sans que la
 *    nouvelle remplace les precedentes ;
 *  - l'historique se lit du plus recent au plus ancien, et ses filtres portent (client, type, periode,
 *    prescripteur, recherche) ;
 *  - la modification remplace les produits et conserve le numero ;
 *  - l'annulation garde le document, avec son motif, et interdit ensuite de le modifier ;
 *  - AUCUNE VENTE, AUCUN MOUVEMENT DE STOCK : c'est la garantie de non-regression de ce menu ;
 *  - sans le privilege d'ecriture, les boutons disparaissent ET le service refuse.
 *
 * Tout ce que le test pose est retire a la fin.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 340) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
/*
 * --default-character-set=utf8mb4 : sans cela le client MariaDB rend les accents en latin1 et une valeur
 * pourtant correcte en base (« PRODUIT CORRIGE » avec son accent) ne correspond plus a ce que le test
 * attend. C'est le test qui lisait mal, pas l'application qui ecrivait mal.
 */
const MB4 = '--default-character-set=utf8mb4';
const exec = (s) => execFileSync('mariadb', [MB4, BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', [MB4, BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();

const MARQUE = 'E2E-ORDO';
const CLIENT = MARQUE + '-CLIENT';
const CLIENT2 = MARQUE + '-CLIENT2';
const MEDECIN = MARQUE + '-MEDECIN';
const NOM_CLIENT = 'ZZORDOTEST';
const NOM_CLIENT2 = 'ZZORDOAUTRE';

function nettoyer() {
  exec("DELETE d FROM t_ordonnance_client_detail d JOIN t_ordonnance_client o"
    + " ON o.lg_ORDONNANCE_ID = d.lg_ORDONNANCE_ID WHERE o.lg_CLIENT_ID IN ('" + CLIENT + "','" + CLIENT2 + "');"
    + "DELETE FROM t_ordonnance_client WHERE lg_CLIENT_ID IN ('" + CLIENT + "','" + CLIENT2 + "');"
    + "DELETE FROM t_client WHERE lg_CLIENT_ID IN ('" + CLIENT + "','" + CLIENT2 + "');"
    + "DELETE FROM t_medecin WHERE lg_MEDECIN_ID='" + MEDECIN + "';");
}

function poser() {
  nettoyer();
  const typeStandard = q("SELECT lg_TYPE_CLIENT_ID FROM t_type_client WHERE str_NAME='Standard' LIMIT 1");
  const typeCarnet = q("SELECT lg_TYPE_CLIENT_ID FROM t_type_client WHERE str_NAME='Carnet' LIMIT 1");
  [[CLIENT, NOM_CLIENT, typeStandard], [CLIENT2, NOM_CLIENT2, typeCarnet]].forEach((c) => {
    exec("INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, lg_TYPE_CLIENT_ID,"
      + " dt_CREATED, dt_UPDATED, str_STATUT, str_TELEPHONE)"
      + " VALUES ('" + c[0] + "', '" + c[1] + "', 'E2E', '" + c[2] + "', NOW(), NOW(), 'enable', '0102030405');");
  });
  exec("INSERT INTO t_medecin (lg_MEDECIN_ID, str_FIRST_NAME, str_LAST_NAME, str_STATUT, dt_CREATED, dt_UPDATED)"
    + " VALUES ('" + MEDECIN + "', 'DOCTEUR', 'ZZORDO', 'enable', NOW(), NOW());");
  const article = q("SELECT CONCAT(lg_FAMILLE_ID, '|', str_NAME) FROM t_famille WHERE str_STATUT='enable'"
    + " AND str_NAME IS NOT NULL ORDER BY str_NAME LIMIT 1").split('|');
  return { articleId: article[0], articleNom: article[1], typeStandard: typeStandard, typeCarnet: typeCarnet };
}

(async () => {
  const contexte = poser();
  /* Photo AVANT de ce qui ne doit pas bouger : la non-regression de ce menu, c'est justement qu'il n'ecrit
   * ni vente ni mouvement de stock. */
  const ventesAvant = q("SELECT COUNT(*) FROM t_preenregistrement");
  const mvtsAvant = q("SELECT COUNT(*) FROM HMvtProduit");
  const stockAvant = q("SELECT COALESCE(SUM(int_NUMBER_AVAILABLE),0) FROM t_famille_stock");

  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1700, height: 1000 } });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    /* --------------------------------------------------------------- le menu et les droits */
    const menu = q("SELECT CONCAT(s.str_VALUE, '|', s.P_KEY, '|', m.str_VALUE) FROM t_sous_menu s"
      + " JOIN t_menu m ON m.lg_MENU_ID = s.lg_MENU_ID WHERE s.str_COMPOSANT='ordonnanceclient'");
    ok('Le menu « Ordonnances clients » est dans SERVICE CLIENT, sous son privilège',
      menu === 'Ordonnances clients|P_ORDONNANCE_CLIENT|SERVICE CLIENT', menu);
    const libelle = q("SELECT CONCAT(CHAR_LENGTH(str_VALUE), '/', CHAR_LENGTH(str_DESCRIPTION))"
      + " FROM t_sous_menu WHERE str_COMPOSANT='ordonnanceclient'").split('/');
    ok('Libellé et description restent courts (règle de l officine : 25 et 30)',
      Number(libelle[0]) <= 25 && Number(libelle[1]) <= 30, libelle.join('/'));
    const privileges = q("SELECT GROUP_CONCAT(str_NAME ORDER BY str_NAME) FROM t_privilege"
      + " WHERE str_NAME IN ('P_ORDONNANCE_CLIENT','P_ORDONNANCE_CLIENT_MAJ')");
    ok('Deux privilèges distincts : consulter, et saisir/modifier',
      privileges === 'P_ORDONNANCE_CLIENT,P_ORDONNANCE_CLIENT_MAJ', privileges);

    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);

    const ouvert = await p.evaluate(() => {
      try { testextjs.app.getController('App').onRedirectTo('ordonnanceclient', {}); return 'ok'; }
      catch (e) { return 'ERREUR ' + e.message; }
    });
    ok('L écran s ouvre', ouvert === 'ok', ouvert);
    await p.waitForFunction(() => Ext.ComponentQuery.query('ordonnanceclient #grilleOrdonnances').length > 0,
      null, { timeout: 30000 });
    await p.waitForTimeout(2500);

    const droits = await p.evaluate(async () => {
      const r = await fetch('../api/v1/ordonnance-client/droits');
      return JSON.parse(await r.text());
    });
    ok('Le service dit à quoi l opérateur a droit',
      droits.success === true && droits.consulter === true && droits.modifier === true, JSON.stringify(droits));

    /* --------------------------------------------------------------- saisie d une ordonnance */
    const clicBouton = async (selecteur) => {
      await p.evaluate((s) => {
        const btn = Ext.ComponentQuery.query(s)[0];
        /* fireEvent('click') n invoque PAS le handler dans ExtJS 4.2 : on clique le DOM. */
        btn.el.dom.click();
      }, selecteur);
      await p.waitForTimeout(900);
    };

    await clicBouton('ordonnanceclient #barreCriteres button[itemId=nouvelle]');
    const surFiche = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('ordonnanceclient')[0];
      return {
        vue: e.getLayout().getActiveItem().getItemId(),
        lignesProduits: e.storeProduits.getCount(),
        dateDuJour: Ext.Date.format(e.down('#vueFiche #ficheDate').getValue(), 'Y-m-d'),
        aujourdhui: Ext.Date.format(new Date(), 'Y-m-d')
      };
    });
    ok('« Nouvelle ordonnance » ouvre la fiche DANS l écran, sans fenêtre surgissante',
      surFiche.vue === 'vueFiche', JSON.stringify(surFiche));
    ok('La date est prérenseignée au jour, et une ligne de produit est amorcée',
      surFiche.dateDuJour === surFiche.aujourdhui && surFiche.lignesProduits === 1, JSON.stringify(surFiche));

    /* Le client se cherche comme au comptoir : on tape, la liste distante repond, on choisit. */
    const choisirClient = async (selecteur, nom) => {
      await p.evaluate(async (a) => {
        const c = Ext.ComponentQuery.query(a.selecteur)[0];
        c.expand();
        c.getStore().getProxy().extraParams = { query: a.nom, typeClientId: '' };
        await new Promise((resolve) => c.getStore().load({ callback: resolve }));
      }, { selecteur: selecteur, nom: nom });
      await p.waitForTimeout(600);
      return p.evaluate((a) => {
        const c = Ext.ComponentQuery.query(a.selecteur)[0];
        const trouve = c.getStore().findBy((r) => String(r.get('strFIRSTNAME') || '').indexOf(a.nom) >= 0);
        if (trouve < 0) { return 'ABSENT'; }
        const rec = c.getStore().getAt(trouve);
        c.setValue(rec.get('lgCLIENTID'));
        c.fireEvent('select', c, [rec]);
        return rec.get('lgCLIENTID');
      }, { selecteur: selecteur, nom: nom });
    };

    const clientChoisi = await choisirClient('ordonnanceclient #vueFiche #ficheClient', NOM_CLIENT);
    ok('Le client se cherche et se choisit dans la fiche (carnet, assurance ou standard)',
      clientChoisi === CLIENT, clientChoisi);

    await p.evaluate((a) => {
      const f = Ext.ComponentQuery.query('ordonnanceclient #vueFiche')[0];
      const med = f.down('#ficheMedecin');
      const rec = med.getStore().findRecord('id', a.medecin);
      if (rec) { med.setValue(rec.get('id')); }
      f.down('#ficheEtablissement').setValue('CHU DE COCODY');
      f.down('#observations').setValue('Ordonnance de contrôle, à renouveler dans 3 mois.');
    }, { medecin: MEDECIN });

    const prescripteurPose = await p.evaluate(() =>
      Ext.ComponentQuery.query('ordonnanceclient #vueFiche #ficheMedecin')[0].getValue());
    ok('Le prescripteur vient du référentiel médecins existant', prescripteurPose === MEDECIN, prescripteurPose);
    ok('L établissement se saisit librement (aucun référentiel à alimenter)',
      await p.evaluate(() =>
        Ext.ComponentQuery.query('ordonnanceclient #vueFiche #ficheEtablissement')[0].getRawValue())
        === 'CHU DE COCODY');

    /* Deux produits : un du referentiel (avec son CIP), un saisi librement (non tenu par l officine). */
    await p.evaluate((a) => {
      const e = Ext.ComponentQuery.query('ordonnanceclient')[0];
      const premier = e.storeProduits.getAt(0);
      premier.set('articleId', a.articleId);
      premier.set('libelle', a.articleNom);
      premier.set('quantite', 2);
      premier.set('posologie', '1 cp matin et soir');
      premier.set('duree', '7 jours');
      e.storeProduits.add({ articleId: '', libelle: 'SIROP PRESCRIT NON TENU', cip: '', quantite: 1,
        posologie: '5 ml le soir', duree: '10 jours' });
    }, contexte);

    await clicBouton('ordonnanceclient #vueFiche button[itemId=enregistrer]');
    await p.waitForTimeout(2000);

    const enBase = q("SELECT CONCAT(o.str_NUMERO, '|', o.dt_ORDONNANCE, '|', o.str_ETABLISSEMENT, '|',"
      + " (SELECT COUNT(*) FROM t_ordonnance_client_detail d WHERE d.lg_ORDONNANCE_ID=o.lg_ORDONNANCE_ID),"
      + " '|', o.str_STATUT) FROM t_ordonnance_client o WHERE o.lg_CLIENT_ID='" + CLIENT + "'");
    const morceaux = enBase.split('|');
    ok('L ordonnance est enregistrée, avec un numéro lisible ORD-AAAAMM-0001',
      /^ORD-\d{6}-\d{4}$/.test(morceaux[0]), enBase);
    ok('Elle porte sa date, son établissement, ses DEUX produits et son statut',
      morceaux[2] === 'CHU DE COCODY' && morceaux[3] === '2' && morceaux[4] === 'enable', enBase);
    const libre = q("SELECT CONCAT(d.str_LIBELLE, '|', IFNULL(d.lg_FAMILLE_ID,'SANS-ARTICLE'), '|',"
      + " d.str_POSOLOGIE, '|', d.str_DUREE) FROM t_ordonnance_client_detail d"
      + " JOIN t_ordonnance_client o ON o.lg_ORDONNANCE_ID=d.lg_ORDONNANCE_ID"
      + " WHERE o.lg_CLIENT_ID='" + CLIENT + "' AND d.str_LIBELLE='SIROP PRESCRIT NON TENU'");
    ok('Un produit PRESCRIT MAIS NON TENU est accepté, sans article du référentiel',
      libre === 'SIROP PRESCRIT NON TENU|SANS-ARTICLE|5 ml le soir|10 jours', libre);
    const reference = q("SELECT CONCAT(d.str_LIBELLE, '|', d.int_QUANTITE) FROM t_ordonnance_client_detail d"
      + " JOIN t_ordonnance_client o ON o.lg_ORDONNANCE_ID=d.lg_ORDONNANCE_ID"
      + " WHERE o.lg_CLIENT_ID='" + CLIENT + "' AND d.lg_FAMILLE_ID='" + contexte.articleId + "'");
    ok('Le produit du référentiel garde SON libellé recopié et sa quantité prescrite',
      reference === contexte.articleNom + '|2', reference);
    const tracabilite = q("SELECT CONCAT(IF(o.lg_USER_CREATED IS NULL,'SANS','AVEC'), '|',"
      + " IF(o.dt_CREATED IS NULL,'SANS','AVEC')) FROM t_ordonnance_client o"
      + " WHERE o.lg_CLIENT_ID='" + CLIENT + "'");
    ok('La traçabilité est conservée : auteur et date de création', tracabilite === 'AVEC|AVEC', tracabilite);

    const ordonnanceId = q("SELECT lg_ORDONNANCE_ID FROM t_ordonnance_client WHERE lg_CLIENT_ID='" + CLIENT + "'");
    const numero = morceaux[0];

    /* --------------------------------------------------------------- l historique */
    const lireHistorique = async (parametres) => {
      await p.evaluate((prm) => {
        const e = Ext.ComponentQuery.query('ordonnanceclient')[0];
        e.storeOrdonnances.getProxy().extraParams = prm;
        e.storeOrdonnances.loadPage(1);
      }, parametres || {});
      await p.waitForTimeout(1800);
      return p.evaluate(() => {
        const e = Ext.ComponentQuery.query('ordonnanceclient')[0];
        const out = [];
        e.storeOrdonnances.each((r) => out.push({
          numero: r.get('numero'), date: r.get('dateOrdonnance'), client: r.get('client'),
          type: r.get('typeClient'), medecin: r.get('medecin'), produits: r.get('nbProduits'),
          statut: r.get('statut'), creePar: r.get('creePar')
        }));
        return { total: e.storeOrdonnances.getTotalCount(), lignes: out };
      });
    };

    let vue = await lireHistorique({ clientId: CLIENT });
    ok('L historique du client montre son ordonnance, avec le nom du prescripteur et l auteur de la saisie',
      vue.total === 1 && vue.lignes[0].numero === numero && /ZZORDO/.test(vue.lignes[0].medecin)
      && vue.lignes[0].produits === 2 && vue.lignes[0].creePar.length > 0, JSON.stringify(vue));

    /* « Un client peut avoir PLUSIEURS ordonnances, chacune enregistree separement, sans remplacer les
     * precedentes. » On en pose deux de plus, a des dates differentes, par le service. */
    const creer = async (jour, libelleProduit) => p.evaluate(async (a) => {
      const r = await fetch('../api/v1/ordonnance-client/enregistrer', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: a.client, dateOrdonnance: a.jour,
          produits: [{ libelle: a.produit, quantite: 1, posologie: 'à la demande', duree: '3 jours' }] })
      });
      return JSON.parse(await r.text());
    }, { client: CLIENT, jour: jour, produit: libelleProduit });

    const hier = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const avantHier = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
    const deuxieme = await creer(hier, 'PARACETAMOL PRESCRIT');
    const troisieme = await creer(avantHier, 'AMOXICILLINE PRESCRITE');
    ok('Deux ordonnances de plus sont enregistrées pour le même client, chacune avec son numéro',
      deuxieme.success === true && troisieme.success === true && deuxieme.numero !== troisieme.numero,
      JSON.stringify([deuxieme.numero, troisieme.numero]));
    ok('Aucune n a remplacé les précédentes',
      q("SELECT COUNT(*) FROM t_ordonnance_client WHERE lg_CLIENT_ID='" + CLIENT + "'") === '3');

    vue = await lireHistorique({ clientId: CLIENT });
    ok('L historique va de la plus RÉCENTE à la plus ancienne',
      vue.total === 3 && vue.lignes[0].date >= vue.lignes[1].date && vue.lignes[1].date >= vue.lignes[2].date,
      JSON.stringify(vue.lignes.map((l) => l.date)));

    /* Les filtres demandes : client, type de client, periode. Et le prescripteur, en plus. */
    vue = await lireHistorique({ typeClientId: contexte.typeCarnet, query: 'ZZORDO' });
    ok('Le filtre « type de client » écarte le client standard (aucune ordonnance sur le carnet)',
      vue.total === 0, JSON.stringify(vue));
    vue = await lireHistorique({ typeClientId: contexte.typeStandard, query: 'ZZORDOTEST' });
    ok('Le filtre « type de client » retient bien le client standard', vue.total === 3, JSON.stringify(vue));
    vue = await lireHistorique({ clientId: CLIENT, dtStart: hier, dtEnd: hier });
    ok('Le filtre de période ne garde que les ordonnances de la période',
      vue.total === 1 && vue.lignes[0].date === hier, JSON.stringify(vue));
    vue = await lireHistorique({ medecinId: MEDECIN });
    ok('Le filtre par prescripteur ne garde que ses ordonnances',
      vue.total === 1 && vue.lignes[0].numero === numero, JSON.stringify(vue));
    vue = await lireHistorique({ query: numero });
    ok('La recherche par numéro d ordonnance trouve le document',
      vue.total === 1 && vue.lignes[0].numero === numero, JSON.stringify(vue));
    vue = await lireHistorique({ query: 'CHU DE COCODY' });
    ok('La recherche trouve aussi par établissement', vue.total === 1, JSON.stringify(vue));

    /* --------------------------------------------------------------- consultation et modification */
    const fiche = await p.evaluate(async (id) => {
      const r = await fetch('../api/v1/ordonnance-client/' + encodeURIComponent(id));
      return JSON.parse(await r.text());
    }, ordonnanceId);
    ok('La fiche rend l ordonnance et ses produits dans l ordre de saisie',
      fiche.success === true && fiche.produits.length === 2 && fiche.produits[0].ordre === 1
      && fiche.produits[1].ordre === 2, JSON.stringify(fiche.produits.map((x) => x.libelle)));
    ok('Le produit référencé rend son CIP, le produit libre n en a pas',
      String(fiche.produits[0].cip || '').length > 0 && String(fiche.produits[1].cip || '') === '',
      JSON.stringify(fiche.produits.map((x) => x.cip)));

    const modifie = await p.evaluate(async (a) => {
      const r = await fetch('../api/v1/ordonnance-client/enregistrer', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: a.id, clientId: a.client, dateOrdonnance: a.jour,
          etablissement: 'CHU DE TREICHVILLE',
          produits: [{ libelle: 'PRODUIT CORRIGÉ', quantite: 3, posologie: '2 cp le matin', duree: '5 jours' }] })
      });
      return JSON.parse(await r.text());
    }, { id: ordonnanceId, client: CLIENT, jour: new Date().toISOString().slice(0, 10) });
    ok('La modification est acceptée et conserve le NUMÉRO du document',
      modifie.success === true && modifie.numero === numero, JSON.stringify(modifie));
    const apresModif = q("SELECT CONCAT(o.str_ETABLISSEMENT, '|',"
      + " (SELECT COUNT(*) FROM t_ordonnance_client_detail d WHERE d.lg_ORDONNANCE_ID=o.lg_ORDONNANCE_ID),"
      + " '|', (SELECT d.str_LIBELLE FROM t_ordonnance_client_detail d"
      + "        WHERE d.lg_ORDONNANCE_ID=o.lg_ORDONNANCE_ID LIMIT 1), '|',"
      + " IF(o.lg_USER_UPDATED IS NULL,'SANS','AVEC')) FROM t_ordonnance_client o"
      + " WHERE o.lg_ORDONNANCE_ID='" + ordonnanceId + "'");
    ok('Les produits sont remplacés par ceux de la correction, et le modificateur est tracé',
      apresModif === 'CHU DE TREICHVILLE|1|PRODUIT CORRIGÉ|AVEC', apresModif);

    /* --------------------------------------------------------------- les refus du serveur */
    const refuse = async (corps) => p.evaluate(async (c) => {
      const r = await fetch('../api/v1/ordonnance-client/enregistrer', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c)
      });
      return JSON.parse(await r.text());
    }, corps);

    let r = await refuse({ dateOrdonnance: new Date().toISOString().slice(0, 10),
      produits: [{ libelle: 'X', quantite: 1 }] });
    ok('Sans client, le service REFUSE (et pas seulement l écran)',
      r.success === false && /client/i.test(r.message), JSON.stringify(r));
    r = await refuse({ clientId: CLIENT, produits: [{ libelle: 'X', quantite: 1 }] });
    ok('Sans date, le service refuse', r.success === false && /date/i.test(r.message), JSON.stringify(r));
    r = await refuse({ clientId: CLIENT, dateOrdonnance: new Date().toISOString().slice(0, 10), produits: [] });
    ok('Sans aucun produit, le service refuse',
      r.success === false && /produit/i.test(r.message), JSON.stringify(r));
    const demain = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    r = await refuse({ clientId: CLIENT, dateOrdonnance: demain, produits: [{ libelle: 'X', quantite: 1 }] });
    ok('Une ordonnance datée de DEMAIN est refusée : la faute de frappe sur l année ne passe pas',
      r.success === false && /futur/i.test(r.message), JSON.stringify(r));

    /* --------------------------------------------------------------- annulation, pas suppression */
    const annuler = async (id, motif) => p.evaluate(async (a) => {
      const r = await fetch('../api/v1/ordonnance-client/annuler?id=' + encodeURIComponent(a.id)
        + '&motif=' + encodeURIComponent(a.motif),
        /* Meme en-tete que celui qu'ExtJS pose sur un POST sans corps JSON : sans Content-Type, le
         * conteneur ne sait pas a quelle methode remettre l'appel et rend une page d'erreur HTML. */
        { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
      return JSON.parse(await r.text());
    }, { id: id, motif: motif });

    r = await annuler(ordonnanceId, '');
    ok('Une annulation sans motif est refusée', r.success === false && /motif/i.test(r.message),
      JSON.stringify(r));
    r = await annuler(ordonnanceId, 'Ordonnance saisie sur le mauvais client');
    ok('L annulation est enregistrée', r.success === true, JSON.stringify(r));
    const apresAnnulation = q("SELECT CONCAT(str_STATUT, '|', str_MOTIF_ANNULATION) FROM t_ordonnance_client"
      + " WHERE lg_ORDONNANCE_ID='" + ordonnanceId + "'");
    ok('Le document RESTE, annulé, avec son motif : rien n est supprimé',
      apresAnnulation === 'annulee|Ordonnance saisie sur le mauvais client', apresAnnulation);
    ok('Et ses produits restent eux aussi',
      q("SELECT COUNT(*) FROM t_ordonnance_client_detail WHERE lg_ORDONNANCE_ID='" + ordonnanceId + "'") === '1');

    r = await refuse({ id: ordonnanceId, clientId: CLIENT,
      dateOrdonnance: new Date().toISOString().slice(0, 10), produits: [{ libelle: 'Y', quantite: 1 }] });
    ok('Une ordonnance annulée ne se modifie plus : le document est clos',
      r.success === false && /annul/i.test(r.message), JSON.stringify(r));

    vue = await lireHistorique({ clientId: CLIENT });
    ok('L historique courant masque l ordonnance annulée', vue.total === 2, JSON.stringify(vue.total));
    vue = await lireHistorique({ clientId: CLIENT, annulees: true });
    ok('Elle reste consultable en la demandant explicitement',
      vue.total === 3 && vue.lignes.filter((l) => l.statut === 'annulee').length === 1, JSON.stringify(vue.total));

    /* --------------------------------------------------------------- le privilège d écriture */
    const roleAdmin = q("SELECT ru.lg_ROLE_ID FROM t_role_user ru JOIN t_user u ON u.lg_USER_ID=ru.lg_USER_ID"
      + " WHERE u.str_LOGIN='admin' LIMIT 1");
    const privMaj = q("SELECT lg_PRIVELEGE_ID FROM t_privilege WHERE str_NAME='P_ORDONNANCE_CLIENT_MAJ'");
    const lignesRendues = q("SELECT GROUP_CONCAT(lg_ROLE_PRIVILEGE) FROM t_role_privelege"
      + " WHERE lg_ROLE_ID='" + roleAdmin + "' AND lg_PRIVILEGE_ID='" + privMaj + "'");
    try {
      exec("DELETE FROM t_role_privelege WHERE lg_ROLE_ID='" + roleAdmin + "'"
        + " AND lg_PRIVILEGE_ID='" + privMaj + "';");
      /*
       * Les privileges sont lus a l ouverture de session : on se reconnecte, comme le ferait l operateur.
       * Dans un contexte NEUF, et non un simple onglet de plus : le cookie de session etant partage, un
       * nouvel onglet arrive deja connecte et ne repasse pas par l ecran de connexion.
       */
      const ctx2 = await b.newContext({ viewport: { width: 1700, height: 1000 } });
      const p2 = await ctx2.newPage();
      await p2.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
      await p2.fill('#str_login', 'admin'); await p2.fill('#str_password', 'e2etest'); await p2.click('#login');
      await p2.waitForURL('**/general/**', { timeout: 40000 });
      await p2.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
      await p2.waitForTimeout(1500);
      await p2.evaluate(() => testextjs.app.getController('App').onRedirectTo('ordonnanceclient', {}));
      await p2.waitForFunction(() => Ext.ComponentQuery.query('ordonnanceclient #grilleOrdonnances').length > 0,
        null, { timeout: 30000 });
      await p2.waitForTimeout(3000);
      const sansDroit = await p2.evaluate(async () => {
        const r = await fetch('../api/v1/ordonnance-client/droits');
        const droits = JSON.parse(await r.text());
        const e = Ext.ComponentQuery.query('ordonnanceclient')[0];
        const visible = (s) => { const c = e.down(s); return c ? c.isVisible() : null; };
        return { droits: droits,
          nouvelle: visible('#barreCriteres button[itemId=nouvelle]'),
          modifier: visible('#grilleOrdonnances button[itemId=modifier]'),
          annuler: visible('#grilleOrdonnances button[itemId=annuler]') };
      });
      ok('Sans le privilège d écriture, le service ne l accorde pas',
        sansDroit.droits.consulter === true && sansDroit.droits.modifier === false,
        JSON.stringify(sansDroit.droits));
      ok('Les boutons de saisie et de modification disparaissent de l écran',
        sansDroit.nouvelle === false && sansDroit.modifier === false && sansDroit.annuler === false,
        JSON.stringify(sansDroit));
      const refuseEcriture = await p2.evaluate(async (client) => {
        const r = await fetch('../api/v1/ordonnance-client/enregistrer', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId: client, dateOrdonnance: '2026-09-01',
            produits: [{ libelle: 'INTERDIT', quantite: 1 }] })
        });
        return JSON.parse(await r.text());
      }, CLIENT);
      ok('Et le service REFUSE l écriture, même appelé directement',
        refuseEcriture.success === false && /profil/i.test(refuseEcriture.message),
        JSON.stringify(refuseEcriture));
      ok('La consultation, elle, reste possible',
        (await p2.evaluate(async () => {
          const r = await fetch('../api/v1/ordonnance-client/liste?limit=5');
          return JSON.parse(await r.text());
        })).success === true);
      await p2.close();
      await ctx2.close();
    } finally {
      /* On rend le privilège dans TOUS les cas : un test qui laisse un droit retiré casse l officine. */
      if (lignesRendues) {
        exec("INSERT IGNORE INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID,"
          + " dt_CREATED, dt_UPDATED) VALUES ('" + lignesRendues.split(',')[0] + "', '" + roleAdmin + "', '"
          + privMaj + "', NOW(), NOW());");
      }
      ok('Le privilège est rendu à la fin du contrôle',
        q("SELECT COUNT(*) FROM t_role_privelege WHERE lg_ROLE_ID='" + roleAdmin + "'"
          + " AND lg_PRIVILEGE_ID='" + privMaj + "'") === '1');
    }

    /* --------------------------------------------------------------- la non-régression */
    ok('AUCUNE vente n a été créée par ce menu',
      q("SELECT COUNT(*) FROM t_preenregistrement") === ventesAvant,
      q("SELECT COUNT(*) FROM t_preenregistrement") + ' contre ' + ventesAvant);
    ok('AUCUN mouvement de stock n a été écrit',
      q("SELECT COUNT(*) FROM HMvtProduit") === mvtsAvant);
    ok('AUCUNE unité de stock n a bougé',
      q("SELECT COALESCE(SUM(int_NUMBER_AVAILABLE),0) FROM t_famille_stock") === stockAvant);
    ok('Aucune erreur JavaScript pendant tout le parcours', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Le parcours va au bout', false, e.message + ' ' + String(e.stack).slice(0, 300));
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
