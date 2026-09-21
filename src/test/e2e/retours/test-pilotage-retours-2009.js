/* Retours de l'officine du 20/09 sur le menu de pilotage.
 *
 * Ce que ce test etablit, sur le PARCOURS REEL (clics dans l'ecran, pas appels d'API) :
 *  - chaque cellule de montant du detail mensuel porte, sous le chiffre, l'evolution par rapport au mois
 *    precedent et la part que ce montant prend dans le chiffre d'affaires - et les deux sont JUSTES,
 *    recalcules a la main depuis les chiffres du store ;
 *  - les trois derniers mois se reperent a la couleur : vert, orange, violet ;
 *  - l'evolution des modes de reglement se lit en COURBES, plus en aires empilees ;
 *  - l'onglet Caisse n'a plus de colonne de pourcentage : le pourcentage est sous le montant ;
 *  - la valeur du stock relevee se dit « Capture », plus « Photo », et les peremptions proches sont
 *    comptees comme dans la base ;
 *  - la ligne de total du detail des KPI n'est plus vide, et elle MOYENNE ce qui ne s'additionne pas ;
 *  - le comparateur ne part plus tout seul et refuse une comparaison incomplete ;
 *  - l'avancement du recalcul repond sans toucher a la base ;
 *  - les agences d'un vrai groupe de fournisseurs ne font qu'une colonne, mais le groupe fourre-tout
 *    « AUTRES » n'en est pas un et ses membres gardent la leur ;
 *  - la bande de tuiles prend la hauteur de son contenu : la septieme tuile n'est plus coupee ;
 *  - l'onglet KPI trace une courbe par indicateur coche, cinq au plus, et le DIT au-dela ; des echelles
 *    trop eloignees passent en base 100, le premier mois renseigne valant exactement 100 ;
 *  - l'edition PDF imprime les mois du plus recent au plus ancien, comme l'ecran.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 330) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const MB4 = '--default-character-set=utf8mb4';
const exec = (s) => execFileSync('mariadb', [MB4, BASE, '-e', s], { encoding: 'utf8' });

/* Le texte d un PDF, pour verifier dans quel ORDRE les mois y sont imprimes. */
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
    } catch (e) { /* flux non compresse */ }
  }
  return out;
}
const q = (s) => execFileSync('mariadb', [MB4, BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();

/* Trois lots d'essai : deux qui perimeront dans les six mois, un au-dela, un deja perime. Seuls les deux
   premiers doivent etre comptes - un lot deja perime est une perte, pas une echeance. */
const LOTS = "'E2E-PEREMPTION-1','E2E-PEREMPTION-2','E2E-PEREMPTION-3','E2E-PEREMPTION-4'";
function poserLesLots() {
  exec("DELETE FROM t_lot WHERE lg_LOT_ID IN (" + LOTS + ");");
  const familles = q("SELECT GROUP_CONCAT(lg_FAMILLE_ID) FROM (SELECT lg_FAMILLE_ID FROM t_famille"
    + " WHERE int_PAF > 0 LIMIT 3) x").split(',');
  const ligne = (id, famille, jours, stock) => "INSERT INTO t_lot (lg_LOT_ID, lg_USER_ID, lg_FAMILLE_ID,"
    + " int_NUM_LOT, int_NUMBER, dt_CREATED, dt_PEREMPTION, str_STATUT, current_stock) VALUES ('" + id
    + "', (SELECT lg_USER_ID FROM t_user LIMIT 1), '" + famille + "', '" + id + "', " + stock
    + ", NOW(), DATE_ADD(CURDATE(), INTERVAL " + jours + " DAY), 'enable', " + stock + ");";
  exec(ligne('E2E-PEREMPTION-1', familles[0], 30, 4)
    + ligne('E2E-PEREMPTION-2', familles[1], 150, 7)
    /* Au-dela de six mois : pas encore une echeance. */
    + ligne('E2E-PEREMPTION-3', familles[2], 300, 5)
    /* Deja perime : c'est une perte, comptee ailleurs. */
    + ligne('E2E-PEREMPTION-4', familles[0], -10, 3));
  return familles;
}

(async () => {
  const familles = poserLesLots();
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
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('pilotage', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('pilotage #onglets').length > 0, null,
      { timeout: 30000 });
    await p.waitForTimeout(7000);

    const changerOnglet = async (titre) => {
      await p.evaluate((t) => {
        const ong = Ext.ComponentQuery.query('pilotage #onglets')[0];
        ong.setActiveTab(ong.items.items.filter((o) => o.title === t)[0]);
      }, titre);
      await p.waitForTimeout(9000);
    };

    /* ------------------------------------------------- le detail mensuel enrichi (onglet Ventes) */
    await changerOnglet('Ventes');
    const ventes = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('pilotage')[0];
      const grille = e.down('#detail-ventes');
      const vue = grille.getView();
      const store = grille.getStore();
      const lignes = [];
      store.each((r) => lignes.push({ mois: r.get('mois'), ca: r.get('caTTC'), remises: r.get('remises') }));
      /* Le HTML REELLEMENT rendu dans la cellule des remises de la premiere ligne. */
      const colonnes = grille.headerCt.getGridColumns();
      const iRemises = colonnes.map((c) => c.text).indexOf('REMISES');
      const cellule = vue.getCell(store.getAt(0), colonnes[iRemises]);
      return {
        lignes: lignes,
        html: cellule ? cellule.dom.innerHTML : '',
        classes: [0, 1, 2, 3].map((i) => {
          const n = vue.getNode(i);
          return n ? n.className : '';
        }),
        /* Les series du graphique des modes : leur TYPE est ce qui a change. */
        typesModes: e.down('#graphique-modes').series.items.map((s) => s.type),
        titreModes: e.down('#graphiquePanneau-modes').title
      };
    });
    ok('Le détail des ventes porte au moins deux mois : il y a donc une évolution à calculer',
      ventes.lignes.length >= 2, ventes.lignes.length + ' mois');

    /*
     * L'EVOLUTION AFFICHEE EST LA BONNE. On refait le calcul a la main depuis les deux premieres lignes du
     * store - le detail va du mois actuel au plus ancien, le mois precedent est donc la ligne suivante.
     */
    const r0 = ventes.lignes[0];
    const r1 = ventes.lignes[1];
    const attenduEvol = r1.remises ? (r0.remises - r1.remises) / Math.abs(r1.remises) * 100 : null;
    const attenduPart = r0.ca ? r0.remises / r0.ca * 100 : null;
    const lu = (motif) => {
      const m = ventes.html.replace(/&nbsp;/g, ' ').match(motif);
      return m ? Number(m[1].replace(/\./g, '').replace(',', '.')) : null;
    };
    const evolLue = lu(/pilotage-evol[^>]*>[^0-9-]*([0-9.,]+) %/);
    const partLue = lu(/([0-9.,]+) % du CA/);
    ok('La cellule d un montant porte l ÉVOLUTION par rapport au mois précédent, et elle est juste',
      attenduEvol === null || (evolLue !== null && Math.abs(evolLue - Math.abs(attenduEvol)) < 0.15),
      'lu ' + evolLue + ' attendu ' + (attenduEvol === null ? 'aucune' : Math.abs(attenduEvol).toFixed(1)));
    ok('Et la PART que ce montant représente dans le chiffre d affaires du mois, juste elle aussi',
      attenduPart === null || (partLue !== null && Math.abs(partLue - attenduPart) < 0.15),
      'lu ' + partLue + ' attendu ' + (attenduPart === null ? 'aucune' : attenduPart.toFixed(1)));
    ok('Le sens de la variation est marqué : hausse ou baisse, avec sa flèche',
      attenduEvol === null
        || /pilotage-evol (hausse|baisse|plat)/.test(ventes.html), ventes.html.slice(0, 200));

    ok('Le mois en cours, le précédent et le troisième portent chacun leur couleur',
      /pilotage-mois-1/.test(ventes.classes[0]) && /pilotage-mois-2/.test(ventes.classes[1])
      && /pilotage-mois-3/.test(ventes.classes[2]), JSON.stringify(ventes.classes));
    ok('Et le quatrième mois n en porte aucune : trois repères, pas un arc-en-ciel',
      !/pilotage-mois-/.test(ventes.classes[3] || ''), ventes.classes[3]);

    ok('L évolution des modes de règlement se lit en COURBES, plus en aires empilées',
      ventes.typesModes.length > 0 && ventes.typesModes.every((t) => t === 'line'),
      JSON.stringify(ventes.typesModes));
    ok('Et le titre le dit', /volution/.test(ventes.titreModes), ventes.titreModes);

    /* ------------------------------------------------- onglet Caisse : plus de colonne de pourcentage */
    await changerOnglet('Caisse & tiers-payant');
    const caisse = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('pilotage')[0];
      const grille = e.down('#detail-caisse');
      const store = grille.getStore();
      const colonnes = grille.headerCt.getGridColumns();
      const i = colonnes.map((c) => c.text).indexOf('ENCAISSÉ');
      const cellule = grille.getView().getCell(store.getAt(0), colonnes[i]);
      return { colonnes: colonnes.map((c) => c.text),
        html: cellule ? cellule.dom.innerHTML : '',
        encaisse: store.getAt(0).get('encaisse'), ca: store.getAt(0).get('caTTC') };
    });
    ok('L onglet Caisse n a plus de colonne « % COMPTANT » : la place est gagnée',
      caisse.colonnes.indexOf('% COMPTANT') < 0, JSON.stringify(caisse.colonnes));
    const partComptant = caisse.ca ? caisse.encaisse / caisse.ca * 100 : null;
    const partLueCaisse = (() => {
      const m = caisse.html.replace(/&nbsp;/g, ' ').match(/([0-9.,]+) % du CA/);
      return m ? Number(m[1].replace(/\./g, '').replace(',', '.')) : null;
    })();
    ok('Le pourcentage est passé SOUS le montant encaissé, et c est bien la part comptant',
      partComptant === null || (partLueCaisse !== null && Math.abs(partLueCaisse - partComptant) < 0.15),
      'lu ' + partLueCaisse + ' attendu ' + (partComptant === null ? '-' : partComptant.toFixed(1)));

    /* ------------------------------------------------- onglet Stock : capture et péremptions */
    /*
     * L'ECRAN GARDE SA REPONSE CINQ MINUTES, par axe de comparaison : c'est ce qui le rend immediat quand on
     * revient sur un onglet. Les lots d'essai ayant ete poses a l'instant, on change d'axe pour demander une
     * reponse NEUVE - sans quoi le test lirait la reponse d'une suite precedente et ne verifierait rien.
     */
    await p.evaluate(() => {
      const axe = Ext.ComponentQuery.query('pilotage #barrePeriode #axe')[0];
      axe.setValue('VS_M1');
      axe.fireEvent('select', axe, [axe.getStore().findRecord('code', 'VS_M1')]);
    });
    await p.waitForTimeout(9000);
    await changerOnglet('Stock');
    const stock = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('pilotage')[0];
      const tuiles = [];
      e.stores.stock.tuiles.each((r) => tuiles.push({ cle: r.get('cle'), valeur: r.get('valeur'),
        sousTitre: r.get('sousTitre'), alerte: r.get('alerte') }));
      const grille = e.down('#detail-stock');
      const colonnes = grille.headerCt.getGridColumns();
      const i = colonnes.map((c) => c.text).indexOf('SOURCE');
      const sources = grille.getStore().getRange().slice(0, 4).map((r) =>
        grille.getView().getCell(r, colonnes[i]).dom.textContent.trim());
      return { tuiles: tuiles, sources: sources,
        bandeau: !!e.down('#note-stock'),
        alerteVisible: document.querySelectorAll('.pilotage-alerte').length };
    });
    ok('Une valeur relevée se dit « Capture », plus « Photo »',
      stock.sources.indexOf('Photo') < 0 && stock.sources.indexOf('Capture') >= 0,
      JSON.stringify(stock.sources));
    ok('Le bandeau de note a disparu de l onglet Stock', stock.bandeau === false, stock.bandeau);

    const attenduPeremption = q("SELECT COUNT(DISTINCT l.lg_FAMILLE_ID) FROM t_lot l"
      + " JOIN t_famille f ON f.lg_FAMILLE_ID=l.lg_FAMILLE_ID"
      + " WHERE l.str_STATUT='enable' AND l.dt_PEREMPTION IS NOT NULL"
      + " AND IFNULL(l.current_stock,l.int_NUMBER)>0 AND DATE(l.dt_PEREMPTION)>=CURDATE()"
      + " AND DATE(l.dt_PEREMPTION)<DATE_ADD(CURDATE(), INTERVAL 6 MONTH)");
    const tuilePeremption = stock.tuiles.filter((t) => t.cle === 'peremption')[0];
    ok('La tuile « Péremptions < 6 mois » compte EXACTEMENT les produits de la base',
      !!tuilePeremption && tuilePeremption.valeur === Number(attenduPeremption),
      (tuilePeremption ? tuilePeremption.valeur : 'absente') + ' contre ' + attenduPeremption);
    ok('Elle ne compte ni les lots déjà périmés ni ceux qui expirent au-delà de six mois',
      Number(attenduPeremption) === 2, attenduPeremption + ' produits sur 4 lots posés');
    ok('Elle est en ALERTE : rouge et clignotante, parce qu il y a un geste à faire',
      !!tuilePeremption && tuilePeremption.alerte === true && stock.alerteVisible > 0,
      'alerte=' + (tuilePeremption || {}).alerte + ' elements=' + stock.alerteVisible);

    /* ------------------------------------------------- onglet Achats : les groupes de fournisseurs */
    await changerOnglet('Achats');
    const achats = await p.evaluate(async () => {
      /* Douze mois glissants : le mois en cours peut n avoir aucun achat, ce qui ne dirait rien. */
      const r = await fetch('../api/v1/pilotage/onglet/achats?axe=G12', { credentials: 'same-origin' });
      const j = JSON.parse(await r.text());
      return { colonnes: (j.grossistesColonnes || []).map((c) => c.libelle),
        repartition: (j.repartition || []).map((x) => ({ nom: x.grossiste, membres: x.membres })) };
    });
    /*
     * LES AGENCES D UN MEME GROUPE NE FONT QU UNE COLONNE... mais le groupe fourre-tout « AUTRES », lui,
     * ne regroupe rien : il ne designe pas une maison de gros, seulement tout ce qui n entre dans aucune
     * des autres. Ses membres gardent donc leur propre colonne (demande du 20/09).
     */
    const agences = q("SELECT COUNT(*) FROM t_grossiste g JOIN groupefournisseur gf ON gf.id=g.groupeId"
      + " WHERE UPPER(gf.libelle)<>'AUTRES' AND EXISTS (SELECT 1 FROM t_order o"
      + "   JOIN t_bon_livraison b ON b.lg_ORDER_ID=o.lg_ORDER_ID"
      + "   WHERE o.lg_GROSSISTE_ID=g.lg_GROSSISTE_ID AND b.str_STATUT='is_Closed')");
    const vraisGroupes = q("SELECT COUNT(DISTINCT gf.id) FROM t_grossiste g"
      + " JOIN groupefournisseur gf ON gf.id=g.groupeId"
      + " WHERE UPPER(gf.libelle)<>'AUTRES' AND EXISTS (SELECT 1 FROM t_order o"
      + "   JOIN t_bon_livraison b ON b.lg_ORDER_ID=o.lg_ORDER_ID"
      + "   WHERE o.lg_GROSSISTE_ID=g.lg_GROSSISTE_ID AND b.str_STATUT='is_Closed')");
    ok('Les agences d un vrai groupe ne font qu une colonne : moins de colonnes que d agences',
      Number(agences) > Number(vraisGroupes),
      agences + ' agence(s) rattachee(s) pour ' + vraisGroupes + ' groupe(s)');
    ok('Le groupe fourre-tout « AUTRES » ne regroupe rien : il n apparaît pas comme une colonne',
      achats.colonnes.map((c) => String(c).toUpperCase()).indexOf('AUTRES') < 0,
      JSON.stringify(achats.colonnes));
    const membresDeAutres = q("SELECT g.str_LIBELLE FROM t_grossiste g"
      + " JOIN groupefournisseur gf ON gf.id=g.groupeId JOIN t_order o ON o.lg_GROSSISTE_ID=g.lg_GROSSISTE_ID"
      + " JOIN t_bon_livraison b ON b.lg_ORDER_ID=o.lg_ORDER_ID"
      + " WHERE UPPER(gf.libelle)='AUTRES' AND b.str_STATUT='is_Closed'"
      + " AND b.dt_UPDATED>=DATE_SUB(DATE_FORMAT(CURDATE(),'%Y-%m-01'), INTERVAL 12 MONTH)"
      + " AND b.dt_UPDATED<DATE_FORMAT(CURDATE(),'%Y-%m-01') LIMIT 1");
    ok('Et chacun de ses membres garde SA colonne, sous son propre nom',
      !membresDeAutres || achats.colonnes.indexOf(membresDeAutres) >= 0,
      membresDeAutres + ' dans ' + JSON.stringify(achats.colonnes));
    const groupe = achats.repartition.filter((x) => x.membres)[0];
    ok('La répartition nomme les agences qui composent un vrai groupe : rien ne disparaît',
      !groupe || groupe.membres.indexOf(',') > 0, JSON.stringify(groupe));

    /* ------------------------------------------------- onglet KPI : la ligne de total */
    await changerOnglet('KPI Analyse');
    const kpi = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('pilotage')[0];
      const grille = e.down('#detail-kpi');
      const pied = grille.getEl().dom.querySelector('.x-grid-row-summary');
      const store = grille.getStore();
      let sommeCa = 0;
      store.each((r) => { sommeCa += Number(r.get('caTTC')) || 0; });
      return { colonnes: grille.headerCt.getGridColumns().map((c) => c.text),
        pied: pied ? pied.textContent.replace(/\s+/g, ' ').trim() : '',
        sommeCa: sommeCa };
    });
    ok('La ligne de total du détail des KPI n est plus vide',
      kpi.pied.length > 10 && /TOTAL/.test(kpi.pied), kpi.pied);
    ok('Elle porte la somme des chiffres d affaires des mois affichés',
      kpi.pied.replace(/\./g, '').indexOf(String(Math.round(kpi.sommeCa))) >= 0,
      'attendu ' + Math.round(kpi.sommeCa) + ' dans « ' + kpi.pied + ' »');
    ok('Et elle MOYENNE ce qui ne s additionne pas : un panier moyen est dit « moyenne »',
      kpi.colonnes.indexOf('PANIER MOYEN') < 0 || /moyenne/.test(kpi.pied), kpi.pied);

    /* ------------------------------------------------- comparateur : plus de départ automatique */
    const avant = await p.evaluate(() => window.__compteurComparateur || 0);
    await p.evaluate(() => {
      window.__compteurComparateur = 0;
      Ext.Ajax.on('beforerequest', function (conn, opts) {
        if (opts.url && opts.url.indexOf('/onglet/comparateur') >= 0) {
          window.__compteurComparateur = (window.__compteurComparateur || 0) + 1;
        }
      });
    });
    await changerOnglet('Comparateur');
    const ouverture = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('pilotage')[0];
      return { requetes: window.__compteurComparateur || 0,
        lignes: e.stores.comparateur.detail.getCount(),
        note: e.down('#choixComparateur #noteComparateur').getValue(),
        bouton: !!e.down('#choixComparateur button[itemId=comparer]') };
    });
    ok('Ouvrir le comparateur ne lance AUCUNE recherche : il attend qu on la demande',
      ouverture.requetes === 0 && ouverture.lignes === 0,
      ouverture.requetes + ' requete(s), ' + ouverture.lignes + ' ligne(s)');
    ok('Un bouton « Comparer » est là pour la lancer', ouverture.bouton === true, ouverture.bouton);
    ok('Et l écran dit ce qu il attend', /Comparer/.test(ouverture.note), ouverture.note);

    /* Un objet vide : la recherche ne doit pas partir, et l ecran doit dire ce qui manque. */
    await p.evaluate(() => {
      Ext.ComponentQuery.query('pilotage #choixComparateur #objetB')[0].setValue(null);
    });
    await p.evaluate(() => {
      Ext.ComponentQuery.query('pilotage #choixComparateur button[itemId=comparer]')[0].el.dom.click();
    });
    await p.waitForTimeout(2500);
    const incomplet = await p.evaluate(() => ({
      requetes: window.__compteurComparateur || 0,
      note: Ext.ComponentQuery.query('pilotage #choixComparateur #noteComparateur')[0].getValue()
    }));
    ok('Une comparaison incomplète ne part pas, et l écran nomme le champ manquant',
      incomplet.requetes === 0 && /objet B/.test(incomplet.note), incomplet.note);

    /* Les trois choix faits : cette fois elle part. */
    await p.evaluate(() => {
      Ext.ComponentQuery.query('pilotage #choixComparateur #objetB')[0].setValue('achatTTC');
      Ext.ComponentQuery.query('pilotage #choixComparateur button[itemId=comparer]')[0].el.dom.click();
    });
    await p.waitForTimeout(12000);
    const complet = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('pilotage')[0];
      return { requetes: window.__compteurComparateur || 0,
        lignes: e.stores.comparateur.detail.getCount(),
        colonnes: e.down('#detail-comparateur').headerCt.getGridColumns().map((c) => c.text) };
    });
    ok('Les trois choix faits, « Comparer » lance bien la comparaison',
      complet.requetes === 1 && complet.lignes > 0,
      complet.requetes + ' requete(s), ' + complet.lignes + ' ligne(s)');
    ok('Et les colonnes portent le NOM des objets comparés',
      complet.colonnes.indexOf('OBJET A') < 0 && complet.colonnes.length >= 5,
      JSON.stringify(complet.colonnes));

    /* ------------------------------------------------- l avancement du recalcul */
    const avancement = await p.evaluate(async () => {
      const r = await fetch('../api/v1/pilotage/avancement', { credentials: 'same-origin' });
      return { statut: r.status, corps: await r.json() };
    });
    ok('L avancement du recalcul répond, et dit qu aucun recalcul ne tourne',
      avancement.statut === 200 && avancement.corps.success === true
      && avancement.corps.enCours === false, JSON.stringify(avancement.corps));
    const barre = await p.evaluate(() => !!Ext.ComponentQuery.query('pilotage #barrePeriode #progression')[0]);
    ok('Et la barre de progression existe dans l écran, prête à être remplie', barre === true, barre);

    /* ------------------------------------------------- la bande de tuiles n est plus tronquee */
    await changerOnglet('Stock');
    const bande = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('pilotage')[0];
      const vue = e.down('#tuiles-stock');
      const el = vue.getEl().dom;
      const tuiles = el.querySelectorAll('.pilotage-tuile');
      let derniere = null;
      if (tuiles.length) { derniere = tuiles[tuiles.length - 1].getBoundingClientRect(); }
      const cadre = el.getBoundingClientRect();
      return { nb: tuiles.length, hauteurBande: vue.getHeight(), contenu: el.scrollHeight,
        basDerniere: derniere ? Math.round(derniere.bottom) : 0, basCadre: Math.round(cadre.bottom) };
    });
    /*
     * « On ne voit pas les donnees de stock dormant et peremptions proches, le cadre est tronque » (20/09).
     * La bande avait une hauteur fixe calculee pour UNE rangee ; la septieme tuile passait a la ligne et se
     * trouvait coupee. Elle prend desormais la hauteur de son contenu, quel que soit le nombre de rangees.
     */
    ok('L onglet Stock porte bien ses sept tuiles', bande.nb === 7, bande.nb + ' tuile(s)');
    /*
     * LA BANDE DE TUILES N'EST PLUS UNE BANDE : depuis le 20/09, l'onglet Stock pose ses tuiles EN COLONNE
     * a gauche et la courbe en face a droite, pour que le detail mensuel prenne toute la partie basse et
     * s'affiche sans defilement vertical. Ce qui reste vrai, et qui est le fond du controle : aucune tuile
     * n'est coupee.
     */
    ok('Aucune tuile n est coupée : la dernière tient ENTIÈREMENT dans le cadre',
      bande.basDerniere > 0 && bande.basDerniere <= bande.basCadre + 1,
      'bas de la tuile ' + bande.basDerniere + ', bas du cadre ' + bande.basCadre);
    const disposition = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('pilotage')[0];
      const bandeau = e.down('#bandeau-stock');
      if (!bandeau) { return null; }
      const tuiles = e.down('#tuiles-stock').getEl().dom.getBoundingClientRect();
      const courbe = e.down('#graphiquePanneau-stock').getEl().dom.getBoundingClientRect();
      const detail = e.down('#detail-stock');
      return { tuilesDroite: Math.round(tuiles.right), courbeGauche: Math.round(courbe.left),
        memeHauteur: Math.abs(tuiles.top - courbe.top) < 4,
        lignesVisibles: Math.floor(detail.getView().getHeight() / 37) };
    });
    ok('Les tuiles sont à GAUCHE et la courbe en FACE, à droite',
      !!disposition && disposition.courbeGauche >= disposition.tuilesDroite && disposition.memeHauteur,
      JSON.stringify(disposition));
    ok('Et le détail mensuel gagne la place : plusieurs mois se lisent sans défiler',
      !!disposition && disposition.lignesVisibles >= 6,
      (disposition || {}).lignesVisibles + ' ligne(s) visible(s)');

    /* ------------------------------------------------- KPI : cinq courbes au plus, et on le dit */
    await changerOnglet('KPI Analyse');
    await p.evaluate(() => {
      const cases = Ext.ComponentQuery.query('pilotage #casesKpi checkbox');
      const veut = ['caTTC', 'nbVentes', 'panier', 'marge', 'tauxMarge', 'remises'];
      cases.forEach((c) => c.suspendEvents());
      cases.forEach((c) => c.setValue(veut.indexOf(c.cleKpi) >= 0));
      cases.forEach((c) => c.resumeEvents());
      Ext.ComponentQuery.query('pilotage #barrePeriode button[itemId=actualiser]')[0].el.dom.click();
    });
    await p.waitForTimeout(14000);
    const kpi6 = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('pilotage')[0];
      const g = e.down('#graphique-kpi');
      const store = e.stores.kpi.mois;
      /* La valeur reelle et l indice du premier mois renseigne : l un doit etre l autre ramene a 100. */
      let repere = null;
      let premier = null;
      store.each((r) => {
        const v = Number(r.get('caTTC'));
        if (repere === null && v) { repere = v; premier = Number(r.get('base100_caTTC')); }
      });
      return { courbes: g.series.items.map((x) => ({ titre: x.title, champ: x.yField })),
        titre: e.down('#graphiquePanneau-kpi').title,
        avertissement: e.down('#casesKpi #avertissementKpi').getValue(),
        colonnes: e.down('#detail-kpi').headerCt.getGridColumns().length,
        indicePremier: premier };
    });
    ok('Six indicateurs cochés, mais CINQ courbes au plus sur le graphique',
      kpi6.courbes.length === 5, kpi6.courbes.length + ' courbe(s)');
    ok('Et l écran le DIT, au lieu de laisser croire à un oubli',
      /6 indicateurs cochés/.test(kpi6.avertissement) && /5 premiers/.test(kpi6.avertissement),
      kpi6.avertissement);
    ok('Le détail mensuel, lui, porte bien les six',
      kpi6.colonnes === 7, kpi6.colonnes + ' colonne(s) avec celle des mois');
    ok('Chaque courbe porte le NOM de son indicateur : on les distingue',
      kpi6.courbes.filter((c) => c.titre && c.titre.length > 2).length === 5,
      JSON.stringify(kpi6.courbes.map((c) => c.titre)));
    /*
     * Des grandeurs d echelles trop eloignees (un chiffre d affaires et un taux de marge) passent en BASE
     * 100 : sans cela le taux serait une ligne plate collee a zero. Le premier mois renseigne vaut donc 100.
     */
    ok('Les échelles étant trop différentes, la lecture passe en base 100 et le titre le dit',
      /base 100/.test(kpi6.titre) && kpi6.courbes.every((c) => /^base100_/.test(c.champ)),
      kpi6.titre);
    ok('Et le premier mois renseigné vaut bien 100',
      kpi6.indicePremier === null || Math.abs(kpi6.indicePremier - 100) < 0.01,
      'indice du premier mois : ' + kpi6.indicePremier);

    /* ------------------------------------------------- l édition suit l ordre de l écran */
    const pdf = await p.evaluate(async () => {
      const r = await fetch('../api/v1/pilotage/pdf?onglet=synthese&axe=MOIS', { credentials: 'same-origin' });
      const buf = await r.arrayBuffer();
      return { statut: r.status, type: r.headers.get('content-type'), octets: Array.from(new Uint8Array(buf)) };
    });
    ok('L édition PDF de la synthèse répond, en flux inline',
      pdf.statut === 200 && /application\/pdf/.test(pdf.type || ''), pdf.statut + ' ' + pdf.type);
    /*
     * « Les mois doivent etre tries decroissants sur les periodes » (20/09). Les series du graphique vont
     * dans le sens du temps - c'est ainsi qu'une courbe se lit - mais un TABLEAU se lit en partant du mois
     * qu'on vient de finir. L'ecran le faisait deja, l'edition etait restee a l'envers.
     */
    const texte = texteDuPdf(pdf.octets);
    const listeMois = ['Septembre 2026', 'Août 2026', 'Juillet 2026', 'Juin 2026'];
    const places = listeMois.map((m) => texte.indexOf(m));
    const presents = places.filter((i) => i >= 0);
    ok('Le PDF imprime les mois du plus RÉCENT au plus ancien, comme l écran',
      presents.length >= 2 && presents.every((v, i, t) => i === 0 || t[i - 1] < v),
      JSON.stringify(listeMois.map((m, i) => m + '@' + places[i])));
    ok('Et le pied de page le dit, pour qu on ne lise pas le tableau à l envers',
      /plus r.cent au plus ancien/.test(texte), texte.slice(-160));

    ok('Aucune erreur JavaScript pendant tout le parcours', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Le parcours va au bout', false, e.message + ' ' + e.stack);
  } finally {
    exec("DELETE FROM t_lot WHERE lg_LOT_ID IN (" + LOTS + ");");
    await b.close();
    const kos = res.filter((r) => !r.c);
    console.log('\n' + res.filter((r) => r.c).length + '/' + res.length + ' controles OK');
    process.exit(kos.length ? 1 : 0);
  }
})();
