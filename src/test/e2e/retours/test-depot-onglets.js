/* Evolution 5, point 1 : « Gestion dépôts extensions » et ses trois onglets.
 *
 * L'officine a demandé un seul écran pour tout ce qui concerne un dépôt : on choisit le dépôt UNE FOIS en
 * haut, et les onglets suivent — Valorisation (vue simple ou par emplacement), Saisir vente dépôt, Chiffre
 * d'affaires. Le menu séparé « Vente du dépôt » a disparu : l'écran de vente ne peut exister qu'à un seul
 * endroit, son contrôleur ne retrouvant que le PREMIER composant correspondant à ses sélecteurs.
 *
 * Ce que le test établit, à la souris :
 *  - les trois onglets sont là, et le menu séparé de vente n'existe plus ;
 *  - un seul sélecteur de dépôt pilote l'écran ; la saisie de vente garde le sien, prérenseigné ;
 *  - la vue « par emplacement » ventile la valorisation par rayon, et la somme des lignes fait le total ;
 *  - l'onglet Chiffre d'affaires lit le CA du dépôt sur une période ;
 *  - aucune collision entre les onglets : chacun a ses propres composants, et le contrôleur ne pilote pas
 *    l'onglet du voisin.
 *
 * Tout ce que le test pose est retiré à la fin.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

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

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 340) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();

const DEPOT = 'E2E-ONG-DEPOT';
const NOM = 'DEPOT E2E ONGLETS';
const MARQUE = 'E2E-ONG-STOCK';

function nettoyer() {
  exec("DELETE FROM t_famille_stock WHERE lg_FAMILLE_STOCK_ID LIKE '" + MARQUE + "%';"
    + "DELETE FROM t_emplacement WHERE lg_EMPLACEMENT_ID='" + DEPOT + "';");
}

/* Trois articles dans DEUX rayons differents : c'est ce qui rend la ventilation par emplacement verifiable. */
function poser() {
  nettoyer();
  const compte = q("SELECT lg_COMPTE_CLIENT_ID FROM t_compte_client LIMIT 1");
  exec("INSERT INTO t_emplacement (lg_EMPLACEMENT_ID, lg_COMPTE_CLIENT_ID, str_NAME, str_DESCRIPTION,"
    + " str_LOCALITE, str_FIRST_NAME, str_LAST_NAME, str_PHONE, dt_CREATED, dt_UPDATED, str_STATUT,"
    + " lg_TYPEDEPOT_ID, bool_SAME_LOCATION)"
    + " VALUES ('" + DEPOT + "', '" + compte + "', '" + NOM + "', 'E2E', 'ABOBO', 'KOFFI', 'Jean',"
    + " '0708473750', NOW(), NOW(), 'enable', '2', 0);");
  // Deux rayons distincts, et des articles qui les portent.
  const zones = q("SELECT GROUP_CONCAT(lg_ZONE_GEO_ID) FROM (SELECT lg_ZONE_GEO_ID FROM t_zone_geographique"
    + " LIMIT 2) z").split(',');
  const arts = [];
  zones.forEach((zone, i) => {
    const liste = q("SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_ID,':',COALESCE(int_PAF,0),':',COALESCE(int_PRICE,0))"
      + " SEPARATOR '|') FROM (SELECT lg_FAMILLE_ID, int_PAF, int_PRICE FROM t_famille"
      + " WHERE str_STATUT='enable' AND int_PAF>0 AND int_PRICE>0 AND lg_ZONE_GEO_ID='" + zone + "'"
      + " ORDER BY str_NAME LIMIT " + (i === 0 ? 2 : 1) + ") x");
    if (!liste) { return; }
    liste.split('|').forEach((x, j) => {
      const pr = x.split(':');
      const stock = 10 * (i + 1) + j;
      arts.push({ id: pr[0], pa: parseInt(pr[1], 10), pv: parseInt(pr[2], 10), stock: stock, zone: zone });
      exec("INSERT INTO t_famille_stock (lg_FAMILLE_STOCK_ID, lg_FAMILLE_ID, int_NUMBER,"
        + " int_NUMBER_AVAILABLE, dt_CREATED, dt_UPDATED, lg_EMPLACEMENT_ID, str_STATUT, int_UG, VERSION)"
        + " VALUES ('" + MARQUE + '-' + i + '-' + j + "', '" + pr[0] + "', " + stock + ", " + stock
        + ", NOW(), NOW(), '" + DEPOT + "', 'enable', 0, 0);");
    });
  });
  return arts;
}

(async () => {
  const arts = poser();
  const attendus = arts.filter((a) => a.stock > 0);
  const totalAchat = attendus.reduce((s, a) => s + a.stock * a.pa, 0);
  const totalVente = attendus.reduce((s, a) => s + a.stock * a.pv, 0);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1700, height: 1000 } });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    ok('Précondition : des articles dans plusieurs rayons', attendus.length >= 2, JSON.stringify(arts));

    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);

    /* ------------------------------------------- le menu séparé de vente n existe plus */
    ok('Le menu séparé « Vente du dépôt » a disparu : la vente vit dans l onglet',
      q("SELECT COUNT(*) FROM t_sous_menu WHERE str_COMPOSANT='doventeendepot'") === '0');
    ok('Son privilège est conservé : il garde son sens pour l onglet',
      q("SELECT COUNT(*) FROM t_privilege WHERE str_NAME='P_VENTE_DEPOT_EXTENSION'") === '1');

    /* Retour du 17/09 : « deplacer le menu gestion depot extension dans GESTION DES TIERS-PAYANTS ». */
    const rubrique = q("SELECT CONCAT(m.lg_MENU_ID, '|', m.str_VALUE) FROM t_sous_menu s"
      + " JOIN t_menu m ON m.lg_MENU_ID = s.lg_MENU_ID WHERE s.str_COMPOSANT='depotextension'");
    ok('Le menu est passé dans GESTION DES TIERS-PAYANTS',
      rubrique === '53251827585053722655|GESTION DES TIERS-PAYANTS', rubrique);
    // Le sous-menu garde son identite : seule sa rubrique a change.
    const identite = q("SELECT CONCAT(lg_SOUS_MENU_ID, '|', P_KEY) FROM t_sous_menu"
      + " WHERE str_COMPOSANT='depotextension'");
    ok('Il garde son identifiant et son privilège : seule la rubrique a changé',
      identite === '20260917|P_SM_DEPOT_EXTENSION', identite);

    /* Un privilege par onglet, attribue d apres la configuration du site et non devine. */
    const privileges = q("SELECT GROUP_CONCAT(CONCAT(p.str_NAME, '=',"
      + " (SELECT COUNT(*) FROM t_role_privelege rp WHERE rp.lg_PRIVILEGE_ID = p.lg_PRIVELEGE_ID))"
      + " ORDER BY p.str_NAME SEPARATOR ' ') FROM t_privilege p"
      + " WHERE p.str_NAME IN ('P_DEPOT_EXT_VALORISATION','P_VENTE_DEPOT_EXTENSION','P_DEPOT_EXT_CA',"
      + "'P_DEPOT_EXT_POINT_CAISSE')");
    ok('Les quatre onglets ont chacun leur privilège', (privileges.match(/=/g) || []).length === 4, privileges);
    /* AUCUNE REGRESSION LE JOUR DE LA LIVRAISON : mettre les onglets sous privilege ne doit rien retirer
     * a personne. Tous ceux qui peuvent ouvrir l ecran portent donc les quatre privileges ; c est ensuite,
     * depuis l ecran des roles, que l officine resserre. L inverse - livrer l ecran deja cloisonne sur une
     * repartition que personne n a demandee - ferait disparaitre des onglets sous les yeux de gens qui les
     * avaient hier. Mesure au banc de la premiere version : le compte administrateur perdait aussitot deux
     * onglets sur quatre. */
    const manquants = (privilege) => q("SELECT COUNT(*) FROM t_role_privelege ecran"
      + " JOIN t_privilege pe ON pe.lg_PRIVELEGE_ID = ecran.lg_PRIVILEGE_ID"
      + " AND pe.str_NAME = 'P_SM_DEPOT_EXTENSION'"
      + " WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege onglet"
      + " JOIN t_privilege po ON po.lg_PRIVELEGE_ID = onglet.lg_PRIVILEGE_ID"
      + " AND po.str_NAME = '" + privilege + "' WHERE onglet.lg_ROLE_ID = ecran.lg_ROLE_ID)");
    ['P_DEPOT_EXT_VALORISATION', 'P_VENTE_DEPOT_EXTENSION', 'P_DEPOT_EXT_CA', 'P_DEPOT_EXT_POINT_CAISSE']
      .forEach((priv) => {
        ok('Qui ouvre l écran garde l onglet ' + priv, manquants(priv) === '0',
          manquants(priv) + ' rôle(s) privé(s) de cet onglet');
      });

    /* ------------------------------------------- l écran et ses trois onglets */
    const ouvert = await p.evaluate(() => {
      try { testextjs.app.getController('App').onRedirectTo('depotextension', {}); return 'ok'; }
      catch (e) { return 'ERREUR ' + e.message; }
    });
    ok('L écran s ouvre', ouvert === 'ok', ouvert);
    await p.waitForFunction(() => Ext.ComponentQuery.query('depotextension depotextensionstock').length > 0,
      null, { timeout: 30000 });
    await p.waitForTimeout(3000);

    const structure = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('depotextension')[0];
      const ong = e.down('#onglets');
      return {
        onglets: ong.items.items.map((x) => x.title),
        unSeulSelecteurEcran: Ext.ComponentQuery.query('depotextension #depotEcran').length,
        selecteurDansLaVente: Ext.ComponentQuery.query('depotextension doventeendepot #depotVente').length,
        // Les composants de critères n appartiennent qu à l onglet Valorisation
        recherchesHorsStock: Ext.ComponentQuery.query('depotextension textfield[itemId=recherche]').length
      };
    });
    /* Retour du 17/09 : « l onglet Saisir vente depot EN PREMIER », et un onglet Point de caisse de plus. */
    ok('Les quatre onglets sont là, la saisie de vente en premier',
      structure.onglets.join(' | ')
        === 'Saisir vente dépôt | Valorisation | Chiffre d\'affaires | Point de caisse',
      JSON.stringify(structure.onglets));
    ok('L écran s ouvre donc sur la saisie de vente',
      await p.evaluate(() => {
        const ong = Ext.ComponentQuery.query('depotextension #onglets')[0];
        return ong.getActiveTab().getItemId();
      }) === 'ongletVente');

    /* Retour du 18/09 : « j ai demandé les onglets en couleur pas les textes ». Ce qui doit etre teinte, c est
     * donc le FOND de l onglet ; le libelle, lui, est blanc sur les quatre. Et l onglet ouvert doit se
     * distinguer des trois autres, sinon on ne lit plus ou l on est. */
    const couleursOnglets = await p.evaluate(() => {
      const ong = Ext.ComponentQuery.query('depotextension #onglets')[0];
      const actif = ong.getActiveTab().getItemId();
      return ong.items.items.map((o) => {
        const tab = o.tab;
        const interieur = tab && tab.el ? tab.el.dom.querySelector('.x-tab-inner') : null;
        return { onglet: o.getItemId(),
          ouvert: o.getItemId() === actif,
          classe: tab && tab.el ? String(tab.el.dom.className) : '',
          fond: tab && tab.el ? getComputedStyle(tab.el.dom).backgroundColor : null,
          couleurTexte: interieur ? getComputedStyle(interieur).color : null };
      });
    });
    ok('Chaque onglet porte sa propre classe de couleur',
      couleursOnglets.length === 4 && couleursOnglets.every((o) => /depot-onglet-/.test(o.classe)),
      JSON.stringify(couleursOnglets.map((o) => o.classe)));
    const fonds = couleursOnglets.map((o) => o.fond);
    const transparent = (c) => !c || /transparent|rgba\(0, 0, 0, 0\)/.test(c);
    ok('C est le fond de l onglet qui est coloré, et les quatre fonds sont différents',
      fonds.every((c) => !transparent(c)) && new Set(fonds).size === 4, JSON.stringify(fonds));
    ok('Le libellé reste blanc sur les quatre onglets',
      couleursOnglets.every((o) => /rgb\(255, 255, 255\)/.test(String(o.couleurTexte))),
      JSON.stringify(couleursOnglets.map((o) => o.couleurTexte)));
    const ongletOuvert = couleursOnglets.find((o) => o.ouvert);
    ok('L onglet ouvert se distingue des onglets fermés (teinte pleine contre teinte claire)',
      !!ongletOuvert && couleursOnglets.filter((o) => !o.ouvert).every((o) => o.fond !== ongletOuvert.fond),
      JSON.stringify({ ouvert: ongletOuvert && ongletOuvert.fond, autres: fonds }));

    /* Un privilege par onglet, vu depuis l ecran : le service dit a quoi l operateur a droit. */
    const droits = await p.evaluate(async () => {
      const r = await fetch('../api/v1/depot-extension/onglets');
      return JSON.parse(await r.text());
    });
    ok('Le service dit, onglet par onglet, à quoi l opérateur a droit',
      droits.success === true && droits.valorisation === true && droits.vente === true
      && droits.ca === true && droits.pointCaisse === true, JSON.stringify(droits));
    ok('Un seul sélecteur de dépôt pilote l écran', structure.unSeulSelecteurEcran === 1);
    ok('La saisie de vente garde son propre sélecteur (dépôt redemandé à chaque vente)',
      structure.selecteurDansLaVente === 1);

    /* ------------------------------------------- choix du dépôt, puis vue simple
     *
     * L écran s ouvre desormais sur la saisie de vente : on passe donc explicitement sur l onglet
     * Valorisation, comme le ferait l utilisateur. Seul l onglet AFFICHE interroge le serveur - un onglet
     * cache n a pas a charger quoi que ce soit. */
    await p.waitForFunction(() => {
      const c = Ext.ComponentQuery.query('depotextension #depotEcran')[0];
      return c && c.getStore().getCount() > 0;
    }, null, { timeout: 20000 });
    await p.evaluate(() => {
      const ong = Ext.ComponentQuery.query('depotextension #onglets')[0];
      ong.setActiveTab(ong.down('#ongletValorisation'));
    });
    await p.waitForTimeout(1500);
    const choisi = await p.evaluate((d) => {
      const c = Ext.ComponentQuery.query('depotextension #depotEcran')[0];
      const rec = c.getStore().findRecord('id', d);
      if (!rec) { return 'dépôt absent'; }
      c.setValue(d);
      c.fireEvent('select', c, [rec]);
      return c.getValue();
    }, DEPOT);
    ok('Le dépôt se choisit une fois en haut de l écran', choisi === DEPOT, String(choisi));
    await p.waitForFunction(() => {
      const g = Ext.ComponentQuery.query('depotextension depotextensionstock')[0];
      return g && g.getStore().getCount() > 0;
    }, null, { timeout: 20000 });
    ok('La vue simple liste les articles du dépôt',
      await p.evaluate(() => Ext.ComponentQuery.query('depotextension depotextensionstock')[0].getStore().getCount())
      === attendus.length);

    /* ------------------------------------------- la vue par emplacement */
    await p.evaluate(() => {
      const bt = Ext.ComponentQuery.query('depotextension #vueEmplacement')[0];
      bt.el.dom.click();
    });
    await p.waitForFunction(() => {
      const g = Ext.ComponentQuery.query('depotextension depotextensionemplacement')[0];
      return g && g.getStore().getCount() > 0;
    }, null, { timeout: 20000 });
    const ventilation = await p.evaluate(() => {
      const g = Ext.ComponentQuery.query('depotextension depotextensionemplacement')[0];
      const lignes = [];
      g.getStore().each((r) => lignes.push({ emplacement: r.get('emplacement'), articles: r.get('articles'),
        valeurAchat: r.get('valeurAchat'), valeurVente: r.get('valeurVente') }));
      const vues = Ext.ComponentQuery.query('depotextension #vues')[0];
      return { lignes: lignes, vueActive: vues.getLayout().getActiveItem().getXType(),
        totaux: g.down('#totaux').el.dom.textContent.trim() };
    });
    ok('La bascule affiche bien la vue par emplacement',
      ventilation.vueActive === 'depotextensionemplacement', ventilation.vueActive);
    ok('La valorisation est ventilée par rayon, sur plusieurs lignes',
      ventilation.lignes.length >= 2, JSON.stringify(ventilation.lignes));
    const sommeAchat = ventilation.lignes.reduce((s, l) => s + l.valeurAchat, 0);
    const sommeVente = ventilation.lignes.reduce((s, l) => s + l.valeurVente, 0);
    ok('La somme des lignes fait exactement le total du dépôt',
      sommeAchat === totalAchat && sommeVente === totalVente,
      'somme achat=' + sommeAchat + '/' + totalAchat + ' vente=' + sommeVente + '/' + totalVente);
    ok('Le total du dépôt est rappelé sous la ventilation, pour pouvoir vérifier la somme',
      ventilation.totaux.indexOf('Total du dépôt') >= 0, ventilation.totaux);

    /* ------------------------------------------- l onglet de vente, dépôt prérenseigné */
    await p.evaluate(() => {
      const ong = Ext.ComponentQuery.query('depotextension #onglets')[0];
      // par itemId et non par position : l ordre des onglets a change, et un privilege peut en retirer un
      ong.setActiveTab(ong.down('#ongletVente'));
    });
    await p.waitForTimeout(2500);
    ok('Le dépôt de l écran prérenseigne la saisie de vente',
      await p.evaluate(() => {
        const c = Ext.ComponentQuery.query('depotextension doventeendepot #depotVente')[0];
        return c ? c.getValue() : null;
      }) === DEPOT);
    ok('La saisie de vente est bien celle de l écran de vente dupliqué (tiers payants, avoirs, préventes)',
      await p.evaluate(() => {
        const v = Ext.ComponentQuery.query('depotextension doventeendepot')[0];
        return !!v && !!v.down('#typeVente') && !!v.down('#contenu');
      }));

    /* ------------------------------------------- le dépôt de la vente est un REFLET de l écran
     * Deux retours de l'officine : le titre gardait le nom d'un dépôt précédent alors que plus rien n'était
     * choisi, et le dépôt disparaissait, encadré de rouge, après chaque vente validée. */
    const etatVente = () => p.evaluate(() => {
      const v = Ext.ComponentQuery.query('depotextension doventeendepot')[0];
      const cv = v.down('#depotVente');
      return { titre: v.title, valeur: cv.getValue(), lectureSeule: cv.readOnly === true,
        enErreur: !cv.isValid(), grise: !!(cv.el && cv.el.hasCls('vp-champ-impose')) };
    });

    let ev = await etatVente();
    ok('Le dépôt de la vente est en lecture seule : il vient de l écran, il ne se saisit pas ici',
      ev.lectureSeule === true && ev.grise === true, JSON.stringify(ev));
    ok('Il porte le dépôt choisi en haut, et le titre le nomme',
      ev.valeur === DEPOT && ev.titre.indexOf(NOM) >= 0, JSON.stringify(ev));
    ok('Il n est jamais en erreur : ce n est plus une saisie, c est un rappel', ev.enErreur === false);

    // remise à zéro, comme après une vente validée
    await p.evaluate(() => {
      const ctr = testextjs.app.getController('VenteEnDepotCtr');
      ctr.current = null;
      ctr.resetAll();
    });
    await p.waitForTimeout(1500);
    ev = await etatVente();
    ok('Après une vente validée, le dépôt en cours est CONSERVÉ et reste grisé',
      ev.valeur === DEPOT && ev.lectureSeule === true && ev.enErreur === false, JSON.stringify(ev));
    ok('Et le titre nomme toujours le dépôt', ev.titre.indexOf(NOM) >= 0, ev.titre);

    // on désélectionne en haut : le titre ne doit plus nommer aucun dépôt
    await p.evaluate(() => {
      Ext.ComponentQuery.query('depotextension #depotEcran')[0].setValue(null);
      testextjs.app.getController('DepotExtensionCtr').imposerLeDepotALaVente();
    });
    await p.waitForTimeout(1800);
    ev = await etatVente();
    ok('Sans dépôt choisi, le titre n en nomme aucun : il ne retarde jamais',
      !ev.valeur && ev.titre.indexOf(NOM) < 0 && ev.titre.indexOf('VENTE EN D') >= 0, JSON.stringify(ev));

    // on le remet pour la suite
    await p.evaluate((d) => {
      const c = Ext.ComponentQuery.query('depotextension #depotEcran')[0];
      const rec = c.getStore().findRecord('id', d);
      c.setValue(d); c.fireEvent('select', c, [rec]);
    }, DEPOT);
    await p.waitForTimeout(2000);

    /* ------------------------------------------- l onglet chiffre d affaires */
    await p.evaluate(() => {
      const ong = Ext.ComponentQuery.query('depotextension #onglets')[0];
      ong.setActiveTab(ong.down('#ongletCa'));
    });
    await p.waitForTimeout(1200);
    ok('L onglet Chiffre d affaires propose une période et ne charge rien tout seul',
      await p.evaluate(() => {
        const o = Ext.ComponentQuery.query('depotextension depotextensionca')[0];
        return !!o.down('#caDebut').getValue() && !!o.down('#caFin').getValue()
          && o.down('#caGrille').getStore().getCount() === 0;
      }));

    /* Retour du 17/09 : « par defaut mettre les dates du jour en periode ». */
    const periode = await p.evaluate(() => {
      const o = Ext.ComponentQuery.query('depotextension depotextensionca')[0];
      const jour = (d) => Ext.Date.format(d, 'Y-m-d');
      return { debut: jour(o.down('#caDebut').getValue()), fin: jour(o.down('#caFin').getValue()),
        aujourdhui: jour(new Date()), imprimer: o.down('#caImprimer').isDisabled() };
    });
    ok('La période part des dates DU JOUR',
      periode.debut === periode.aujourdhui && periode.fin === periode.aujourdhui, JSON.stringify(periode));
    ok('L impression reste inactive avant toute recherche : on n imprime pas une grille vide',
      periode.imprimer === true);

    /* Colonnes demandees par l officine, dans son ordre, et la colonne « reglement » retiree. */
    const colonnes = await p.evaluate(() => {
      const g = Ext.ComponentQuery.query('depotextension depotextensionca #caGrille')[0];
      return g.columns.map((c) => ({ texte: c.text, champ: c.dataIndex, somme: c.summaryType || '' }));
    });
    ok('Les colonnes sont celles demandées, dans l ordre demandé',
      JSON.stringify(colonnes.map((c) => c.champ))
        === JSON.stringify(['typeVente', 'montantTTC', 'montantNet', 'marge', 'nbreVente', 'montantEsp',
          'montantTp']), JSON.stringify(colonnes.map((c) => c.champ)));
    // « a quoi sert la colonne reglement ? » - a rien : le service ne la renseigne jamais pour ces lignes.
    ok('La colonne « règlement » a disparu',
      !colonnes.some((c) => c.champ === 'reglement'), JSON.stringify(colonnes.map((c) => c.champ)));
    ok('Chaque colonne de montant porte son total',
      colonnes.filter((c) => c.somme === 'sum').length === 6, JSON.stringify(colonnes));
    await p.evaluate(() => {
      Ext.ComponentQuery.query('depotextension depotextensionca #caRechercher')[0].el.dom.click();
    });
    await p.waitForFunction(() => {
      const o = Ext.ComponentQuery.query('depotextension depotextensionca')[0];
      return (o.down('#caTotaux').el.dom.textContent || '').indexOf('Lecture') < 0;
    }, null, { timeout: 60000 });
    const ca = await p.evaluate(() => {
      const o = Ext.ComponentQuery.query('depotextension depotextensionca')[0];
      return { totaux: o.down('#caTotaux').el.dom.textContent.trim(),
        lignes: o.down('#caGrille').getStore().getCount() };
    });
    ok('Le chiffre d affaires du dépôt répond et nomme le dépôt',
      ca.totaux.indexOf(NOM) >= 0 && /vente\(s\)/.test(ca.totaux), JSON.stringify(ca));
    ok('Le rappel explique où est l argent : caisse de l officine, chiffre au dépôt',
      await p.evaluate(() => {
        const o = Ext.ComponentQuery.query('depotextension depotextensionca')[0];
        const t = o.down('#caNote').el.dom.textContent;
        return /caisse de l'opérateur/.test(t) && /appartient au dépôt/.test(t);
      }));

    /* La ligne TOTAL est affichee sous la grille, et c est bien la somme des lignes. */
    const totalAffiche = await p.evaluate(() => {
      const g = Ext.ComponentQuery.query('depotextension depotextensionca #caGrille')[0];
      const chiffres = (t) => String(t).replace(/[^0-9-]/g, '');
      let sommeNet = 0;
      g.getStore().each((r) => { sommeNet += r.get('montantNet'); });
      const pied = g.el.dom.querySelector('.x-grid-row-summary');
      return { lignes: g.getStore().getCount(), sommeNet: sommeNet,
        pied: pied ? pied.textContent.replace(/\s+/g, ' ').trim() : null,
        piedChiffres: pied ? chiffres(pied.textContent) : null };
    });
    ok('Une ligne TOTAL est affichée sous les lignes',
      !!totalAffiche.pied && /TOTAL/.test(totalAffiche.pied), JSON.stringify(totalAffiche));
    ok('Le total du net est bien la somme des lignes',
      totalAffiche.lignes === 0
      || String(totalAffiche.piedChiffres).indexOf(String(Math.abs(totalAffiche.sommeNet))) >= 0,
      JSON.stringify(totalAffiche));

    /* L edition du chiffre d affaires : servie en flux, avec son modele jrxml. */
    ok('L impression devient active après la recherche',
      await p.evaluate(() =>
        Ext.ComponentQuery.query('depotextension depotextensionca #caImprimer')[0].isDisabled()) === false);
    const edition = await p.evaluate(async (d) => {
      const o = Ext.ComponentQuery.query('depotextension depotextensionca')[0];
      const jour = (x) => Ext.Date.format(o.down(x).getValue(), 'Y-m-d');
      const url = '../api/v1/depot-extension/ca/pdf?depotId=' + encodeURIComponent(d)
        + '&dtStart=' + jour('#caDebut') + '&dtEnd=' + jour('#caFin');
      const r = await fetch(url);
      const b = await r.arrayBuffer();
      return { statut: r.status, type: r.headers.get('content-type'),
        disposition: r.headers.get('content-disposition'), octets: Array.from(new Uint8Array(b)) };
    }, DEPOT);
    ok('Le chiffre d affaires s imprime, servi en flux dans l onglet',
      edition.statut === 200 && /application\/pdf/.test(edition.type) && /inline/.test(edition.disposition),
      JSON.stringify({ statut: edition.statut, type: edition.type, disposition: edition.disposition }));
    ok('Le document est un vrai PDF', Buffer.from(edition.octets).slice(0, 5).toString() === '%PDF-');
    const texteCa = texteDuPdf(edition.octets);
    /* Ce parcours ne produit pas de vente comptee par la balance (la caisse n'est pas cloturee) : l'edition
     * doit alors le DIRE, et non rendre un document vide que l'on prendrait pour une erreur. Le contenu
     * chiffre de cette edition est verifie par test-ca-depot, qui pose de vraies ventes. */
    ok('Sans vente sur la période, l édition le dit au lieu de rendre une page vide',
      /aucune vente sur la p.riode/.test(texteCa), texteCa.slice(0, 260));
    ok('L édition du chiffre d affaires refuse l officine',
      await p.evaluate(async () => {
        const r = await fetch('../api/v1/depot-extension/ca/pdf?depotId=1&dtStart=2026-01-01&dtEnd=2026-01-01');
        return r.status;
      }) === 400);

    /* ------------------------------------------- l onglet Point de caisse */
    await p.evaluate(() => {
      const ong = Ext.ComponentQuery.query('depotextension #onglets')[0];
      ong.setActiveTab(ong.down('#ongletPointCaisse'));
    });
    await p.waitForTimeout(3500);
    const pointCaisse = await p.evaluate(() => {
      const vue = Ext.ComponentQuery.query('depotextension pointcaisseview')[0];
      if (!vue) { return null; }
      const combo = vue.down('combobox');
      const grille = vue.down('gridpanel');
      return { rendu: vue.rendered, depot: combo ? combo.getValue() : null,
        grille: !!grille, colonnes: grille ? grille.columns.map((c) => c.text) : [] };
    });
    ok('L onglet Point de caisse embarque l écran existant, rendu et fonctionnel',
      !!pointCaisse && pointCaisse.rendu === true && pointCaisse.grille === true,
      JSON.stringify(pointCaisse && { rendu: pointCaisse.rendu, grille: pointCaisse.grille }));
    ok('Il porte les colonnes de l écran Point Caisse Dépôt, sans recopie',
      !!pointCaisse && pointCaisse.colonnes.indexOf('Caissière') >= 0
      && pointCaisse.colonnes.indexOf('Montant Net') >= 0, JSON.stringify(pointCaisse && pointCaisse.colonnes));
    // Le depot choisi en haut vaut pour cet onglet aussi : quatre onglets sous un seul titre doivent parler
    // du meme depot, sinon on lit des chiffres qui ne vont pas ensemble.
    ok('Le dépôt choisi en haut de l écran est imposé au point de caisse',
      !!pointCaisse && pointCaisse.depot === DEPOT, String(pointCaisse && pointCaisse.depot));

    /* ------------------------------------------- un privilege retire retire l onglet, ET ferme le service
     *
     * Masquer un onglet n est pas un controle d acces : on verifie les deux. Le privilege est retire au role
     * de l operateur le temps du controle, puis rendu. */
    const rolesCa = q("SELECT GROUP_CONCAT(rp.lg_ROLE_PRIVILEGE) FROM t_role_privelege rp"
      + " JOIN t_privilege p ON p.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID AND p.str_NAME = 'P_DEPOT_EXT_CA'"
      + " JOIN t_role_user ru ON ru.lg_ROLE_ID = rp.lg_ROLE_ID"
      + " JOIN t_user u ON u.lg_USER_ID = ru.lg_USER_ID AND u.str_LOGIN = 'admin'");
    if (rolesCa) {
      /* Les lignes a rendre sont relues et gardees EN MEMOIRE, et non dans une table temporaire :
       * chaque appel au client mariadb ouvre sa propre connexion, et une table temporaire meurt avec
       * la connexion qui l a creee. Mesure faite : la restauration echouait, et le privilege restait
       * retire au compte administrateur. */
      const sauvegarde = q("SELECT GROUP_CONCAT(CONCAT_WS('~', lg_ROLE_PRIVILEGE, lg_ROLE_ID,"
        + " lg_PRIVILEGE_ID) SEPARATOR '|') FROM t_role_privelege WHERE lg_ROLE_PRIVILEGE IN ('"
        + rolesCa.split(',').join("','") + "')").split('|').filter(Boolean)
        .map((l) => l.split('~'));
      const rendreLePrivilege = () => {
        sauvegarde.forEach((r) => {
          exec("INSERT IGNORE INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID,"
            + " dt_CREATED, dt_UPDATED) VALUES ('" + r[0] + "','" + r[1] + "','" + r[2] + "', NOW(), NOW());");
        });
      };
      exec("DELETE FROM t_role_privelege WHERE lg_ROLE_PRIVILEGE IN ('"
        + rolesCa.split(',').join("','") + "');");
      /* Contexte de navigation NEUF, et non un onglet de plus : la liste des privileges est mise en
       * cache dans la session HTTP a la connexion. Un second onglet partagerait le cookie, donc la
       * session, donc les privileges d avant le retrait - et le controle ne prouverait rien. */
      const ctx2 = await b.newContext({ viewport: { width: 1700, height: 1000 } });
      const p2 = await ctx2.newPage();
      try {
        await p2.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr',
          { waitUntil: 'domcontentloaded' });
        await p2.fill('#str_login', 'admin'); await p2.fill('#str_password', 'e2etest');
        await p2.click('#login');
        await p2.waitForURL('**/general/**', { timeout: 40000 });
        await p2.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
        await p2.waitForTimeout(1500);
        const refuse = await p2.evaluate(async () => {
          const r = await fetch('../api/v1/depot-extension/onglets');
          return JSON.parse(await r.text());
        });
        ok('Sans le privilège, le service ne propose plus cet onglet', refuse.ca === false,
          JSON.stringify(refuse));
        await p2.evaluate(() => { testextjs.app.getController('App').onRedirectTo('depotextension', {}); });
        await p2.waitForFunction(() => Ext.ComponentQuery.query('depotextension #onglets').length > 0,
          null, { timeout: 30000 });
        await p2.waitForTimeout(3500);
        const restants = await p2.evaluate(() => {
          const ong = Ext.ComponentQuery.query('depotextension #onglets')[0];
          return { onglets: ong.items.items.map((o) => o.getItemId()), actif: ong.getActiveTab().getItemId() };
        });
        ok('L onglet est retiré de l écran, pas seulement grisé',
          restants.onglets.indexOf('ongletCa') < 0 && restants.onglets.length === 3,
          JSON.stringify(restants));
        ok('L écran reste utilisable et s ouvre sur un onglet existant',
          restants.onglets.indexOf(restants.actif) >= 0, JSON.stringify(restants));
        const donnees = await p2.evaluate(async (d) => {
          const r = await fetch('../api/v1/depot-extension/ca?depotId=' + encodeURIComponent(d)
            + '&dtStart=2026-01-01&dtEnd=2026-12-31');
          return await r.text();
        }, DEPOT);
        ok('Et le service refuse les données, même appelé directement',
          /"success":false/.test(donnees) && /ne donne pas acc/.test(donnees), donnees.slice(0, 160));
        const editionRefusee = await p2.evaluate(async (d) => {
          const r = await fetch('../api/v1/depot-extension/ca/pdf?depotId=' + encodeURIComponent(d)
            + '&dtStart=2026-01-01&dtEnd=2026-12-31');
          return r.status;
        }, DEPOT);
        ok('L édition est refusée elle aussi', editionRefusee === 403, String(editionRefusee));
      } finally {
        rendreLePrivilege();
        await ctx2.close();
      }
      ok('Le privilège est rendu à la fin du contrôle',
        q("SELECT COUNT(*) FROM t_role_privelege WHERE lg_ROLE_PRIVILEGE IN ('"
          + rolesCa.split(',').join("','") + "')") === String(rolesCa.split(',').length));
    } else {
      ok('Sans le privilège, le service ne propose plus cet onglet', false,
        'le role de l operateur ne porte pas P_DEPOT_EXT_CA : controle impossible');
    }

    ok('Aucune erreur JavaScript pendant tout le parcours', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    console.log('\n' + res.filter(r => r.c).length + '/' + res.length + ' verifications');
    try { nettoyer(); } catch (e) { console.log('NETTOYAGE INCOMPLET : ' + String(e.message).slice(0, 300)); }
    process.exit(res.every(r => r.c) ? 0 : 1);
  }
})();
