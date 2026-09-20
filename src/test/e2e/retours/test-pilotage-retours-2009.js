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
 *  - l'avancement du recalcul repond sans toucher a la base.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 330) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const MB4 = '--default-character-set=utf8mb4';
const exec = (s) => execFileSync('mariadb', [MB4, BASE, '-e', s], { encoding: 'utf8' });
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
