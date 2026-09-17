/* Evolution 5, point 1 (premiere partie) : ecran des depots d'extension.
 *
 * Le stock d'un depot d'extension est t_famille_stock pour l'emplacement du depot - la meme table que le
 * stock de l'officine, distinguee par son emplacement. Les donnees existaient donc deja, mais rien ne
 * permettait de les consulter depuis l'officine depot par depot, avec la valorisation de ce que le depot
 * detient, ni de l'emporter en Excel ou en PDF.
 *
 * Le parcours est joue a l'ecran : choix du depot, recherche, filtre famille, filtre emplacement, filtre sur le
 * stock, bascule « masquer les articles a 0 », export Excel et les DEUX editions PDF.
 *
 * Retour du 17/09 couvert ici : la case « masquer les articles a 0 » n'est plus cochee au depart, un filtre sur le
 * stock et un filtre sur l'emplacement s'ajoutent, les stocks negatifs s'affichent en rouge et les stocks a zero en
 * violet, les criteres sont PARTAGES par les deux vues (une recherche faite dans l'une vaut pour l'autre), les deux
 * vues s'appellent desormais « Liste des articles » et « Valorisation par emplacement », la seconde s'imprime, et
 * les editions sont paginees.
 *
 * Le depot et le stock poses par le test sont retires a la fin. Rien n'est ecrit hors des lignes marquees : les
 * rayons des articles sont LUS, jamais modifies - ils appartiennent au referentiel de l'officine. */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 320) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();

const DEPOT = 'E2E-DEPOT-EXT';
const DEPOT2 = 'E2E-DEPOT-EXT2';
const MARQUE = 'E2E-DSTOCK';

function nettoyer() {
  exec("DELETE FROM t_famille_stock WHERE lg_FAMILLE_STOCK_ID LIKE '" + MARQUE + "%';"
    + "DELETE FROM t_emplacement WHERE lg_EMPLACEMENT_ID IN ('" + DEPOT + "','" + DEPOT2 + "');");
}

/* Deux depots d'extension : le second reste vide, pour verifier qu'un depot sans stock s'affiche
   proprement au lieu de montrer le stock du precedent. Quatre articles dans le premier. */
function poser() {
  nettoyer();
  // Un emplacement de depot est rattache a un compte client : c'est par lui qu'il est facture.
  // Le test reprend un compte existant, il n'a pas a en creer un.
  const compte = q("SELECT lg_COMPTE_CLIENT_ID FROM t_compte_client LIMIT 1");
  exec("INSERT INTO t_emplacement (lg_EMPLACEMENT_ID, lg_COMPTE_CLIENT_ID, str_NAME, str_DESCRIPTION, str_LOCALITE,"
    + " str_FIRST_NAME, str_LAST_NAME, str_PHONE, dt_CREATED, dt_UPDATED, str_STATUT, lg_TYPEDEPOT_ID,"
    + " bool_SAME_LOCATION)"
    + " VALUES ('" + DEPOT + "', '" + compte + "', 'DEPOT E2E NORD', 'E2E', 'ABOBO', 'KOFFI', 'Jean',"
    + " '0708473750', NOW(), NOW(), 'enable', '2', 0),"
    + " ('" + DEPOT2 + "', '" + compte + "', 'DEPOT E2E SUD', 'E2E', 'YOPOUGON', 'YAO', 'Awa', '0708473751',"
    + " NOW(), NOW(), 'enable', '2', 0);");
  // Le rayon (lg_ZONE_GEO_ID) est LU et non pose : il appartient au referentiel articles de l'officine, et le
  // test n'ecrit rien en dehors de ses propres lignes. C'est lui qui rend le filtre emplacement verifiable.
  const arts = q("SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, ':', COALESCE(int_PAF,0), ':', COALESCE(int_PRICE,0),"
    + " ':', COALESCE(int_CIP,''), ':', COALESCE(lg_ZONE_GEO_ID,''), ':', COALESCE(str_NAME,'')) SEPARATOR '|')"
    + " FROM (SELECT lg_FAMILLE_ID, int_PAF, int_PRICE, int_CIP, lg_ZONE_GEO_ID, str_NAME"
    + " FROM t_famille WHERE str_STATUT='enable' AND int_PAF>0 AND int_PRICE>0 AND int_CIP IS NOT NULL"
    + " ORDER BY str_NAME LIMIT 5) x").split('|')
    .map((x) => { const p = x.split(':'); return { id: p[0], pa: parseInt(p[1], 10), pv: parseInt(p[2], 10),
      cip: p[3], zone: p[4], nom: p[5] }; });
  // Un stock a zero (violet) ET un stock negatif (rouge) : ce sont les deux cas que l'officine veut reperer.
  const quantites = [12, 5, 40, 0, -3];
  arts.forEach((a, i) => {
    a.stock = quantites[i];
    exec("INSERT INTO t_famille_stock (lg_FAMILLE_STOCK_ID, lg_FAMILLE_ID, int_NUMBER, int_NUMBER_AVAILABLE,"
      + " dt_CREATED, dt_UPDATED, lg_EMPLACEMENT_ID, str_STATUT, int_UG, VERSION)"
      + " VALUES ('" + MARQUE + '-' + i + "', '" + a.id + "', " + a.stock + ", " + a.stock + ", NOW(), NOW(), '"
      + DEPOT + "', 'enable', 0, 0);");
  });
  return arts;
}

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

(async () => {
  const arts = poser();
  // « Detenus » au sens de la case a cocher : stock non nul, le negatif compris - c'est une anomalie a voir.
  const attendus = arts.filter((a) => a.stock !== 0);
  const positifs = arts.filter((a) => a.stock > 0);
  const negatifs = arts.filter((a) => a.stock < 0);
  const zeros = arts.filter((a) => a.stock === 0);
  // La valorisation par defaut porte sur TOUT (case decochee) : les zeros n'ajoutent rien, le negatif retranche.
  const valeurAchat = arts.reduce((s, a) => s + a.stock * a.pa, 0);
  const valeurVente = arts.reduce((s, a) => s + a.stock * a.pv, 0);
  const quantite = arts.reduce((s, a) => s + a.stock, 0);

  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1700, height: 950 } });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);

    /* le sous-menu existe et porte son privilege */
    const menu = q("SELECT CONCAT(str_VALUE, '|', str_COMPOSANT, '|', P_KEY, '|', lg_MENU_ID)"
      + " FROM t_sous_menu WHERE str_COMPOSANT='depotextension'");
    // Retour du 17/09 : l ecran ne parle plus seulement de stock (vente, chiffre d affaires, point de
    // caisse), il est passe dans GESTION DES TIERS-PAYANTS.
    ok('Le sous-menu « Gestion depots extensions » est posé dans GESTION DES TIERS-PAYANTS, avec son privilège',
      menu === 'Gestion depots extensions|depotextension|P_SM_DEPOT_EXTENSION|53251827585053722655', menu);
    // Regle de la maison : les libelles et descriptions de menus sont affiches dans une place etroite.
    const longueurs = q("SELECT CONCAT(CHAR_LENGTH(str_VALUE), '|', CHAR_LENGTH(str_DESCRIPTION))"
      + " FROM t_sous_menu WHERE str_COMPOSANT='depotextension'").split('|').map(Number);
    ok('Le libellé et la description tiennent dans la navigation (25 et 30 au plus)',
      longueurs[0] <= 25 && longueurs[1] <= 30, 'libelle=' + longueurs[0] + ' description=' + longueurs[1]);
    const visible = q("SELECT COUNT(*) FROM v_getallsousmenubyconnecteduser v JOIN t_user u ON u.lg_USER_ID=v.lg_USER_ID"
      + " WHERE u.str_LOGIN='admin' AND v.str_COMPOSANT='depotextension'");
    ok('Il est visible pour un profil administrateur', visible === '1', visible);

    await p.evaluate(() => { testextjs.app.getController('App').onRedirectTo('depotextension', {}); });
    await p.waitForFunction(() => Ext.ComponentQuery.query('depotextension').length > 0, null, { timeout: 25000 });
    await p.waitForTimeout(4000);
    /* L ecran s ouvre desormais sur la saisie de vente (retour du 17/09 : « l onglet Saisir vente depot en
     * premier »). Ce test-ci porte sur la valorisation : on va sur son onglet, comme le ferait
     * l utilisateur, et on attend qu il soit rendu - un onglet non active n existe pas encore. */
    await p.evaluate(() => {
      const ong = Ext.ComponentQuery.query('depotextension #onglets')[0];
      ong.setActiveTab(ong.down('#ongletValorisation'));
    });
    await p.waitForFunction(() => {
      const b = Ext.ComponentQuery.query('depotextension #barreVues')[0];
      return b && b.rendered;
    }, null, { timeout: 25000 });
    await p.waitForTimeout(1500);

    /* Les criteres et les actions vivent au-dessus des DEUX vues, et non dans l une d elles. */
    const criteres = () => Ext.ComponentQuery.query('depotextension #barreCriteres')[0];
    const actions = () => Ext.ComponentQuery.query('depotextension #barreVues')[0];

    /* 1. a l ouverture : aucun depot choisi, rien n est demande, editions inactives */
    const depart = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('depotextension depotextensionstock')[0];
      const a = Ext.ComponentQuery.query('depotextension #barreVues')[0];
      const c = Ext.ComponentQuery.query('depotextension #barreCriteres')[0];
      return { lignes: e.getStore().getCount(), excel: a.down('#exporterExcel').isDisabled(),
        pdf: a.down('#imprimer').isDisabled(), message: a.down('#valorisation').el.dom.textContent.trim(),
        // la barre de criteres est commune aux deux vues : elle existe une seule fois
        barres: Ext.ComponentQuery.query('depotextension #barreCriteres').length,
        masquerLesZeros: c.down('#enStock').getValue(), filtreStock: c.down('#filtreStock').getValue(),
        aFiltreEmplacement: !!c.down('#emplacement') };
    });
    ok('Tant qu aucun dépôt n est choisi, rien n est chargé et les éditions restent inactives',
      depart.lignes === 0 && depart.excel === true && depart.pdf === true && /Choisissez un d/.test(depart.message),
      JSON.stringify(depart));
    ok('« masquer les articles à 0 » est DÉCOCHÉE au départ, et le filtre de stock est sur « tous »',
      depart.masquerLesZeros === false && depart.filtreStock === 'TOUS', JSON.stringify(depart));
    ok('Le filtre emplacement est là, à côté du filtre famille',
      depart.aFiltreEmplacement === true);
    ok('Les critères sont partagés : une seule barre pour les deux vues', depart.barres === 1,
      String(depart.barres));
    const libelles = await p.evaluate(() => {
      const a = Ext.ComponentQuery.query('depotextension #barreVues')[0];
      return [a.down('#vueSimple').getText(), a.down('#vueEmplacement').getText()];
    });
    ok('Les deux vues portent les noms demandés',
      libelles[0] === 'Liste des articles' && libelles[1] === 'Valorisation par emplacement',
      JSON.stringify(libelles));

    /* 2. la liste des depots ne propose que les depots d extension, pas l officine */
    const depots = await p.evaluate(() => {
      const c = Ext.ComponentQuery.query('depotextension #depotEcran')[0];
      const v = []; c.getStore().each((r) => v.push([r.get('id'), r.get('nom')]));
      return v;
    });
    ok('Le choix ne propose que les dépôts d extension, jamais l officine',
      depots.length === 2 && depots.every((d) => d[0] !== '1')
      && depots.some((d) => d[1] === 'DEPOT E2E NORD'), JSON.stringify(depots));

    /* 3. choix du depot : stock et valorisation */
    const choisirDepot = async (id) => {
      await p.evaluate((d) => {
        const c = Ext.ComponentQuery.query('depotextension #depotEcran')[0];
        c.setValue(d);
        c.fireEvent('select', c, [c.getStore().findRecord('id', d)].filter(Boolean));
      }, id);
      await p.waitForTimeout(4000);
    };
    await choisirDepot(DEPOT);
    const lireVue = () => p.evaluate(() => {
      const e = Ext.ComponentQuery.query('depotextension depotextensionstock')[0];
      const a = Ext.ComponentQuery.query('depotextension #barreVues')[0];
      const lignes = []; e.getStore().each((r) => lignes.push(r.data));
      return { total: e.getStore().getTotalCount(), lignes: lignes,
        valorisation: a.down('#valorisation').el.dom.textContent.trim(),
        excel: a.down('#exporterExcel').isDisabled(), pdf: a.down('#imprimer').isDisabled() };
    });
    let vue = await lireVue();
    ok('Le stock du dépôt s affiche en entier : les 5 articles posés, zéro et négatif compris',
      vue.total === 5 && vue.lignes.length === 5, JSON.stringify({ total: vue.total }));
    ok('L article à zéro est VISIBLE par défaut, c est ce que l officine a demandé',
      vue.lignes.some((l) => l.stock === 0), JSON.stringify(vue.lignes.map((l) => l.stock)));
    ok('L article au stock négatif est visible lui aussi',
      vue.lignes.some((l) => l.stock < 0), JSON.stringify(vue.lignes.map((l) => l.stock)));
    ok('Les éditions deviennent actives', vue.excel === false && vue.pdf === false);

    /* les couleurs : rouge pour le negatif, violet pour le zero - la classe est posee sur la LIGNE */
    const couleurs = await p.evaluate(() => {
      const g = Ext.ComponentQuery.query('depotextension depotextensionstock')[0];
      const out = [];
      g.getStore().each((r) => {
        const n = g.getView().getNode(r);
        out.push({ stock: r.get('stock'), classe: n ? String(n.className) : '' });
      });
      return out;
    });
    const classeDe = (predicat) => (couleurs.find(predicat) || {}).classe || '';
    ok('Un stock négatif porte la classe rouge, sur toute la ligne',
      /depot-stock-negatif/.test(classeDe((l) => l.stock < 0)), JSON.stringify(couleurs));
    ok('Un stock à zéro porte la classe violette',
      /depot-stock-zero/.test(classeDe((l) => l.stock === 0)), JSON.stringify(couleurs));
    ok('Un stock normal ne porte aucune des deux',
      !/depot-stock-(negatif|zero)/.test(classeDe((l) => l.stock > 0)), JSON.stringify(couleurs));
    // Les couleurs doivent exister dans la feuille de style, sinon la classe ne peint rien.
    const peint = await p.evaluate(() => {
      const g = Ext.ComponentQuery.query('depotextension depotextensionstock')[0];
      let neg = null, zero = null;
      g.getStore().each((r) => {
        const n = g.getView().getNode(r);
        if (!n) { return; }
        const cellule = n.querySelector('.x-grid-cell-inner');
        if (!cellule) { return; }
        if (r.get('stock') < 0) { neg = getComputedStyle(cellule).color; }
        if (r.get('stock') === 0) { zero = getComputedStyle(cellule).color; }
      });
      return { neg: neg, zero: zero };
    });
    ok('Les deux couleurs sont réellement appliquées, et différentes l une de l autre',
      !!peint.neg && !!peint.zero && peint.neg !== peint.zero, JSON.stringify(peint));

    // L'application sépare les milliers par un point ; on compare donc les chiffres seuls,
    // sans dépendre du séparateur retenu par le thème.
    const chiffres = (t) => String(t).replace(/[^0-9]/g, '');
    const contient = (texte, valeur) => chiffres(texte).indexOf(String(valeur)) >= 0;
    const n = (v) => String(v);
    ok('La valorisation du dépôt est exacte et porte sur toutes les lignes retenues (5 articles)',
      contient(vue.valorisation, valeurAchat) && contient(vue.valorisation, valeurVente)
      && contient(vue.valorisation, quantite) && /DEPOT E2E NORD/.test(vue.valorisation),
      vue.valorisation + '  attendu achat=' + valeurAchat + ' vente=' + valeurVente);

    const ligneUn = vue.lignes.find((l) => l.cip === attendus[0].cip);
    ok('Chaque ligne porte son stock, ses prix et ses deux valorisations',
      !!ligneUn && ligneUn.stock === attendus[0].stock && ligneUn.prixAchat === attendus[0].pa
      && ligneUn.valeurAchat === attendus[0].stock * attendus[0].pa
      && ligneUn.valeurVente === attendus[0].stock * attendus[0].pv, JSON.stringify(ligneUn));

    /* 4. un depot sans stock ne montre pas celui du precedent */
    await choisirDepot(DEPOT2);
    vue = await lireVue();
    ok('Un dépôt sans stock s affiche vide, et non avec le stock du dépôt précédent',
      vue.total === 0 && vue.lignes.length === 0 && /DEPOT E2E SUD/.test(vue.valorisation)
      && /0 article/.test(vue.valorisation), JSON.stringify(vue));

    /* 5. la case « masquer les articles a 0 » : cochee, elle enleve le zero et GARDE le negatif */
    await choisirDepot(DEPOT);
    const poserCritere = async (selecteur, valeur) => {
      await p.evaluate((a) => {
        const c = Ext.ComponentQuery.query('depotextension #barreCriteres')[0].down(a.selecteur);
        c.setValue(a.valeur);
        if (c.isXType('combobox')) {
          c.fireEvent('select', c, [c.getStore().findRecord('id', a.valeur)].filter(Boolean));
        }
      }, { selecteur: selecteur, valeur: valeur });
      await p.waitForTimeout(4000);
    };
    const totalAffiche = () => p.evaluate(() =>
      Ext.ComponentQuery.query('depotextension depotextensionstock')[0].getStore().getTotalCount());

    await poserCritere('#enStock', true);
    let total = await totalAffiche();
    ok('Cocher « masquer les articles à 0 » enlève la ligne à zéro et garde le stock négatif',
      total === attendus.length, total + ' attendu ' + attendus.length);
    await poserCritere('#enStock', false);

    /* 5b. le filtre sur le stock : les trois cas, et il l emporte sur la case */
    await poserCritere('#filtreStock', 'NEGATIF');
    total = await totalAffiche();
    ok('Le filtre « négatif » ne garde que les stocks négatifs',
      total === negatifs.length, total + ' attendu ' + negatifs.length);
    const caseGrisee = await p.evaluate(() =>
      Ext.ComponentQuery.query('depotextension #barreCriteres')[0].down('#enStock').isDisabled());
    ok('La case « masquer les articles à 0 » est grisée dès qu un filtre de stock est posé : pas de '
      + 'critère contradictoire', caseGrisee === true, String(caseGrisee));

    await poserCritere('#filtreStock', 'ZERO');
    total = await totalAffiche();
    ok('Le filtre « à zéro » ne garde que les stocks à zéro',
      total === zeros.length, total + ' attendu ' + zeros.length);

    await poserCritere('#filtreStock', 'POSITIF');
    total = await totalAffiche();
    ok('Le filtre « positif » ne garde que les stocks positifs',
      total === positifs.length, total + ' attendu ' + positifs.length);

    await poserCritere('#filtreStock', 'TOUS');
    total = await totalAffiche();
    ok('Revenir à « tous » remontre les 5 lignes, et la case redevient utilisable', total === 5,
      String(total));
    ok('La case n est plus grisée', await p.evaluate(() =>
      Ext.ComponentQuery.query('depotextension #barreCriteres')[0].down('#enStock').isDisabled()) === false);

    /* 5c. le filtre emplacement, comme le filtre famille */
    const zoneCible = arts.map((a) => a.zone).filter(Boolean)[0];
    const attendusZone = zoneCible ? arts.filter((a) => a.zone === zoneCible).length : 0;
    if (zoneCible) {
      const proposee = await p.evaluate((z) => {
        const c = Ext.ComponentQuery.query('depotextension #barreCriteres')[0].down('#emplacement');
        return c.getStore().findExact('id', z) >= 0;
      }, zoneCible);
      ok('Le filtre emplacement propose les rayons de l officine', proposee === true, zoneCible);
      await poserCritere('#emplacement', zoneCible);
      total = await totalAffiche();
      ok('Le filtre emplacement ne garde que les articles de ce rayon',
        total === attendusZone, total + ' attendu ' + attendusZone);
      await poserCritere('#emplacement', 'ALL');
      total = await totalAffiche();
      ok('Revenir à « tous » les emplacements remontre tout', total === 5, String(total));
    } else {
      ok('Le filtre emplacement ne garde que les articles de ce rayon', false,
        'aucun des articles du jeu d essai ne porte de rayon : controle impossible sur ce banc');
    }

    /* 6. recherche par CIP */
    const chercher = async (texte) => {
      await p.evaluate((t) => {
        const c = Ext.ComponentQuery.query('depotextension #barreCriteres')[0];
        c.down('#recherche').setValue(t);
        const btn = c.down('#rechercher');
        btn.el.dom.click();
      }, texte);
      await p.waitForTimeout(4000);
    };
    const basculer = async (bouton) => {
      await p.evaluate((b) => {
        Ext.ComponentQuery.query('depotextension #barreVues')[0].down(b).el.dom.click();
      }, bouton);
      await p.waitForTimeout(4000);
    };

    await chercher(positifs[0].cip);
    const cherche = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('depotextension depotextensionstock')[0];
      const a = Ext.ComponentQuery.query('depotextension #barreVues')[0];
      const lignes = []; e.getStore().each((r) => lignes.push(r.get('cip')));
      return { total: e.getStore().getTotalCount(), lignes: lignes,
        valorisation: a.down('#valorisation').el.dom.textContent.trim() };
    });
    ok('La recherche par CIP ne garde que cet article, et la valorisation suit',
      cherche.total === 1 && cherche.lignes[0] === positifs[0].cip
      && contient(cherche.valorisation, positifs[0].stock * positifs[0].pa), JSON.stringify(cherche));

    /* 6b. LES CRITERES SONT PARTAGES : c est le scenario decrit par l officine.
     *
     * « je recherche un produit qui existe une fois dans l emplacement COMPRIMES ; quand je clique sur par
     * emplacement je vois juste COMPRIMES ; quand je reviens et que je supprime la recherche, l autre vue est
     * mise a jour et affiche tous les emplacements ». */
    await basculer('#vueEmplacement');
    const parEmplacementFiltre = await p.evaluate(() => {
      const g = Ext.ComponentQuery.query('depotextension depotextensionemplacement')[0];
      const l = []; g.getStore().each((r) => l.push(r.data));
      return { lignes: l, visible: !g.isHidden(),
        totaux: g.down('#totaux').el.dom.textContent.trim() };
    });
    ok('La recherche faite dans la liste vaut pour la vue par emplacement : un seul rayon',
      parEmplacementFiltre.lignes.length === 1, JSON.stringify(parEmplacementFiltre.lignes));
    ok('La ligne porte ses deux grandeurs distinctes : les références ET les unités',
      parEmplacementFiltre.lignes.length === 1
      && parEmplacementFiltre.lignes[0].articles === 1
      && parEmplacementFiltre.lignes[0].unites === positifs[0].stock,
      JSON.stringify(parEmplacementFiltre.lignes[0]));
    ok('Les critères restent visibles et modifiables dans la vue par emplacement',
      await p.evaluate(() => {
        const c = Ext.ComponentQuery.query('depotextension #barreCriteres')[0];
        return !!c && !c.isHidden() && c.down('#recherche').getValue() !== '';
      }));

    /* on efface la recherche depuis la vue par emplacement : elle se met a jour tout de suite */
    await chercher('');
    const parEmplacementTout = await p.evaluate(() => {
      const g = Ext.ComponentQuery.query('depotextension depotextensionemplacement')[0];
      const l = []; g.getStore().each((r) => l.push(r.data));
      return l;
    });
    ok('Effacer la recherche remontre tous les emplacements du dépôt',
      parEmplacementTout.length >= 1 && parEmplacementTout.length >= parEmplacementFiltre.lignes.length,
      JSON.stringify(parEmplacementTout.map((l) => l.emplacement)));
    const sommeAchat = parEmplacementTout.reduce((t, l) => t + l.valeurAchat, 0);
    ok('La somme des lignes par emplacement fait bien le total du dépôt',
      sommeAchat === valeurAchat, sommeAchat + ' attendu ' + valeurAchat);

    /* 6c. l edition de la vue par emplacement : « on doit pouvoir imprimer » */
    const pdfEmpl = await recupererPdf(p, '../api/v1/depot-extension/valorisation-emplacement/pdf?depotId='
      + encodeURIComponent(DEPOT) + '&query=&familleId=&zoneGeoId=&filtreStock=TOUS&enStock=false');
    ok('La vue par emplacement s imprime, servie en flux dans l onglet',
      pdfEmpl.statut === 200 && /application\/pdf/.test(pdfEmpl.type) && /inline/.test(pdfEmpl.disposition),
      JSON.stringify({ statut: pdfEmpl.statut, type: pdfEmpl.type, disposition: pdfEmpl.disposition }));
    const texteEmpl = texteDuPdf(pdfEmpl.octets);
    ok('Son édition nomme le dépôt et porte les deux grandeurs, nommées sans ambiguïté',
      /VALORISATION PAR EMPLACEMENT - DEPOT E2E NORD/.test(texteEmpl) && /R.F.RENCES/.test(texteEmpl)
      && /UNIT.S/.test(texteEmpl), texteEmpl.slice(0, 280));
    ok('Son édition est paginée', /Page 1/.test(texteEmpl), texteEmpl.slice(-200));

    /* le bouton imprimer de l ecran vise bien l edition de la vue affichee */
    const cible = await p.evaluate(() => {
      const ctr = testextjs.app.getController('DepotExtensionCtr');
      return ctr.vueCourante();
    });
    ok('Le bouton Imprimer édite la vue affichée', cible === 'depotextensionemplacement', cible);
    ok('L export Excel est mis en retrait dans la vue par emplacement',
      await p.evaluate(() =>
        Ext.ComponentQuery.query('depotextension #barreVues')[0].down('#exporterExcel').isDisabled()) === true);

    await basculer('#vueSimple');
    ok('Revenir à la liste des articles recharge les 5 lignes avec les mêmes critères',
      await totalAffiche() === 5);

    /* 7. l edition PDF, servie en flux */
    const pdf = await recupererPdf(p, '../api/v1/depot-extension/stock/pdf?depotId=' + encodeURIComponent(DEPOT)
      + '&query=&familleId=&familleLibelle=&zoneGeoId=&emplacementLibelle=&filtreStock=TOUS&enStock=true');
    ok('L édition PDF est servie en flux dans l onglet',
      pdf.statut === 200 && /application\/pdf/.test(pdf.type) && /inline/.test(pdf.disposition),
      JSON.stringify({ statut: pdf.statut, type: pdf.type, disposition: pdf.disposition }));
    ok('Le document est un vrai PDF', Buffer.from(pdf.octets).slice(0, 5).toString() === '%PDF-');
    const texte = texteDuPdf(pdf.octets);
    // Le rappel des criteres reprend les MEMES mots que la case a cocher de l'ecran : une edition doit se
    // relire avec le vocabulaire de l'ecran qui l'a produite.
    ok('Le PDF nomme le dépôt et rappelle les critères, avec les mots de l écran',
      /STOCK DU DEPOT - DEPOT E2E NORD/.test(texte) && /D.p.t : DEPOT E2E NORD/.test(texte)
      && /articles . 0 masqu/.test(texte), texte.slice(0, 260));
    ok('Le PDF porte les colonnes de stock et de valorisation',
      /Stock/.test(texte) && /Val\. achat/.test(texte) && /Val\. vente/.test(texte)
      && new RegExp('TOTAL : ' + attendus.length + ' article').test(texte), texte.slice(0, 300));
    // Retour du 17/09 : « impression pdf articles ajouter une pagination ». Une liste de stock fait des
    // dizaines de pages, et une page tombee par terre doit pouvoir se remettre a sa place.
    ok('Le PDF des articles est paginé', /Page 1/.test(texte), texte.slice(-220));

    /* le filtre de stock se retrouve dans le rappel de criteres imprime */
    const pdfNegatif = await recupererPdf(p, '../api/v1/depot-extension/stock/pdf?depotId='
      + encodeURIComponent(DEPOT) + '&query=&familleId=&familleLibelle=&zoneGeoId=&emplacementLibelle='
      + '&filtreStock=NEGATIF&enStock=false');
    const texteNegatif = texteDuPdf(pdfNegatif.octets);
    ok('Le rappel des critères imprimé dit quel filtre de stock a été demandé',
      /stock n.gatif seulement/.test(texteNegatif)
      && new RegExp('TOTAL : ' + negatifs.length + ' article').test(texteNegatif),
      texteNegatif.slice(0, 300));

    /* 8. l export Excel */
    const excel = await p.evaluate(async (d) => {
      const r = await fetch('../api/v1/depot-extension/stock/excel?depotId=' + encodeURIComponent(d)
        + '&query=&familleId=&zoneGeoId=&filtreStock=TOUS&enStock=true');
      const b = await r.arrayBuffer();
      return { statut: r.status, type: r.headers.get('content-type'),
        disposition: r.headers.get('content-disposition'), taille: b.byteLength };
    }, DEPOT);
    ok('L export Excel répond, nommé d après le dépôt',
      excel.statut === 200 && excel.taille > 1000 && /stock_depot_DEPOT_E2E_NORD/.test(excel.disposition),
      JSON.stringify(excel));

    /* 9. aucun service ne sert le stock de l officine */
    const officine = await p.evaluate(async () => {
      const r = await fetch('../api/v1/depot-extension/stock?depotId=1&limit=5');
      return { statut: r.status, corps: await r.text() };
    });
    ok('Demander l emplacement de l officine est refusé, ce n est pas un dépôt d extension',
      /"success":false/.test(officine.corps) && /d.p.t d.extension/.test(officine.corps),
      officine.corps.slice(0, 160));
    const pdfOfficine = await p.evaluate(async () => {
      const r = await fetch('../api/v1/depot-extension/stock/pdf?depotId=1');
      return r.status;
    });
    ok('L édition refuse également l officine', pdfOfficine === 400, String(pdfOfficine));
    const pdfEmplOfficine = await p.evaluate(async () => {
      const r = await fetch('../api/v1/depot-extension/valorisation-emplacement/pdf?depotId=1');
      return r.status;
    });
    ok('La nouvelle édition par emplacement refuse l officine de la même façon',
      pdfEmplOfficine === 400, String(pdfEmplOfficine));

    /* 10. presentation collee */
    const mise = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('depotextension')[0], c = e.ownerCt;
      return { colle: e.collerEnHaut === true, entete: !!e.header,
        largeur: e.getWidth(), largeurConteneur: c.body.getViewSize().width,
        defile: c.body.dom.scrollHeight - c.body.dom.clientHeight };
    });
    ok('L écran est collé au conteneur, sans en-tête en double ni défilement global',
      mise.colle && !mise.entete && Math.abs(mise.largeur - mise.largeurConteneur) < 3 && mise.defile <= 2,
      JSON.stringify(mise));

    ok('Aucune erreur JavaScript pendant tout le parcours', err.length === 0, JSON.stringify(err.slice(0, 3)));
  } catch (e) {
    ok('Parcours complet sans exception', false, e.message + ' | ' + p.url());
  } finally {
    await b.close();
    nettoyer();
    const reste = q("SELECT CONCAT((SELECT COUNT(*) FROM t_emplacement WHERE lg_EMPLACEMENT_ID LIKE 'E2E-DEPOT-EXT%'),"
      + " '|', (SELECT COUNT(*) FROM t_famille_stock WHERE lg_FAMILLE_STOCK_ID LIKE '" + MARQUE + "%'))");
    ok('Tout ce que le test a posé est retiré', reste === '0|0', reste);
  }
  const echecs = res.filter((r) => !r.c).length;
  console.log('\n' + (res.length - echecs) + '/' + res.length + ' controles OK');
  process.exit(echecs ? 1 : 0);
})();
