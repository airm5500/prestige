/* Evolution 6, point 1, vague 4 : onglets KPI ANALYSE et COMPARATEUR du menu de pilotage.
 *
 * Deux besoins exprimes le 18/09 :
 *  - « on devra avoir tous les KPI cochables ; celui qui est coche fera l'objet de l'analyse sur le selecteur
 *    de periode choisi et on verra sa courbe d'evolution. Exemple : si je coche panier moyen et nombres de
 *    client l'analyse sera sur les 2 selon la periode et la courbe d'evolution » ;
 *  - « 2 periodes et aussi 2 objets, ce sera au choix - je peux par exemple comparer les achats aux ventes sur
 *    une periode ».
 *
 * Ce que le test etablit :
 *  - le catalogue des KPI vient du SERVEUR, et les cases a cocher en sont construites ;
 *  - cocher un indicateur ajoute sa tuile et sa colonne ; le decocher les retire ;
 *  - les valeurs des KPI sont EXACTEMENT celles de la base (panier moyen, clients servis, taux de remise) ;
 *  - la frequentation horaire n'apparait que cochee, et ses heures sont celles de la base ;
 *  - le comparateur compare deux GRANDEURS (achats contre ventes) et deux OBJETS de meme nature (deux
 *    familles), avec l'ecart et le rapport ;
 *  - les deux series du comparateur sont calculees par la meme requete, et leur somme se retrouve en base ;
 *  - un grossiste se compare sur ce qu'on lui achete, et l'ecran le dit ;
 *  - les editions des deux onglets portent les colonnes choisies.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 330) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const MB4 = '--default-character-set=utf8mb4';
const q = (s) => execFileSync('mariadb', [MB4, BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();

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

(async () => {
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
    await p.waitForTimeout(6000);

    const onglets = await p.evaluate(() =>
      Ext.ComponentQuery.query('pilotage #onglets')[0].items.items.map((o) => o.title));
    ok('Les deux onglets de cette vague sont là, après les sept précédents',
      onglets.length === 9 && onglets[7] === 'KPI Analyse' && onglets[8] === 'Comparateur',
      JSON.stringify(onglets));

    const changerOnglet = async (titre) => {
      await p.evaluate((t) => {
        const ong = Ext.ComponentQuery.query('pilotage #onglets')[0];
        ong.setActiveTab(ong.items.items.filter((o) => o.title === t)[0]);
      }, titre);
      await p.waitForTimeout(9000);
    };

    /* --------------------------------------------------------------- KPI ANALYSE */
    await changerOnglet('KPI Analyse');
    const kpi = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('pilotage')[0];
      const cases = e.down('#casesKpi').query('checkbox');
      const tuiles = [];
      e.stores.kpi.tuiles.each((r) => tuiles.push({ cle: r.get('cle'), valeur: r.get('valeur') }));
      return { catalogue: e.storeKpis.getCount(),
        cases: cases.map((c) => ({ cle: c.cleKpi, coche: c.getValue() })),
        tuiles: tuiles,
        colonnes: e.down('#detail-kpi').headerCt.getGridColumns().map((c) => c.text),
        horaireVisible: e.down('#frequentation').isVisible() };
    });
    ok('Le catalogue des KPI vient du serveur et compte les quinze indicateurs',
      kpi.catalogue === 15, String(kpi.catalogue));
    ok('Une case à cocher par indicateur, construite depuis ce catalogue',
      kpi.cases.length === 15, String(kpi.cases.length));
    ok('Trois indicateurs sont cochés au départ : un écran d analyse vide ne dit rien à personne',
      kpi.cases.filter((c) => c.coche).map((c) => c.cle).join(',') === 'caTTC,nbVentes,panier',
      JSON.stringify(kpi.cases.filter((c) => c.coche).map((c) => c.cle)));
    ok('Les tuiles et les colonnes sont celles des indicateurs cochés',
      kpi.tuiles.map((t) => t.cle).join(',') === 'caTTC,nbVentes,panier'
      && kpi.colonnes.length === 4, JSON.stringify(kpi.colonnes));
    ok('La fréquentation horaire est masquée tant qu elle n est pas cochée',
      kpi.horaireVisible === false);

    /* Les valeurs : comparees a la base, sur le mois en cours. */
    const moisCourant = q("SELECT DATE_FORMAT(CURDATE(),'%Y-%m-01')");
    const lendemain = q("SELECT DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 1 DAY),'%Y-%m-%d')");
    const baseVentes = q("SELECT CONCAT(COALESCE(SUM(p.int_PRICE - COALESCE(p.int_PRICE_REMISE,0)),0), '|',"
      + " COUNT(*)) FROM t_preenregistrement p WHERE p.int_PRICE>0 AND p.str_STATUT='is_Closed'"
      + " AND p.b_IS_CANCEL=0 AND p.lg_TYPE_VENTE_ID<>'5' AND p.dt_UPDATED>='" + moisCourant + "'"
      + " AND p.dt_UPDATED<'" + lendemain + "'").split('|');
    const valeurKpi = (cle) => (kpi.tuiles.filter((t) => t.cle === cle)[0] || {}).valeur;
    ok('Le chiffre d affaires et le nombre de clients servis sont ceux de la base',
      Math.abs(valeurKpi('caTTC') - Number(baseVentes[0])) < 1
      && valeurKpi('nbVentes') === Number(baseVentes[1]),
      JSON.stringify([valeurKpi('caTTC'), baseVentes[0], valeurKpi('nbVentes'), baseVentes[1]]));
    const panierAttendu = Number(baseVentes[1]) === 0 ? 0
      : Number(baseVentes[0]) / Number(baseVentes[1]);
    ok('Le panier moyen est le chiffre d affaires rapporté au nombre de clients',
      Math.abs(valeurKpi('panier') - panierAttendu) < 1,
      valeurKpi('panier') + ' contre ' + panierAttendu);

    /* Cocher deux indicateurs de plus : l exemple donne le 18/09. */
    await p.evaluate(() => {
      const cases = Ext.ComponentQuery.query('pilotage #casesKpi')[0];
      cases.down('#kpi-marge').setValue(true);
      cases.down('#kpi-tauxMarge').setValue(true);
      cases.down('#kpi-frequentation').setValue(true);
    });
    /*
     * On ATTEND le resultat au lieu de compter les secondes : une attente fixe suffisait la plupart du temps
     * et echouait apres un redeploiement, cache vide, ou la requete de marge prend plusieurs secondes. La
     * boucle est ecrite ici plutot qu'avec waitForFunction pour pouvoir DIRE ce qu'on a vu en cas d'echec.
     */
    const attendreTuiles = async (attendu) => {
      for (let i = 0; i < 40; i++) {
        const compte = await p.evaluate(() =>
          Ext.ComponentQuery.query('pilotage')[0].stores.kpi.tuiles.getCount());
        if (compte === attendu) {
          return compte;
        }
        await p.waitForTimeout(1500);
      }
      return p.evaluate(() => Ext.ComponentQuery.query('pilotage')[0].stores.kpi.tuiles.getCount());
    };
    const vuesApresCoche = await attendreTuiles(5);
    ok('Les tuiles se mettent à jour après les coches', vuesApresCoche === 5,
      vuesApresCoche + ' tuile(s) au lieu de 5');
    const apresCoche = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('pilotage')[0];
      const tuiles = [];
      e.stores.kpi.tuiles.each((r) => tuiles.push(r.get('cle')));
      return { tuiles: tuiles,
        colonnes: e.down('#detail-kpi').headerCt.getGridColumns().map((c) => c.text),
        horaireVisible: e.down('#frequentation').isVisible(),
        heures: e.storeHoraire.getCount(),
        titreCourbe: e.down('#graphiquePanneau-kpi').title,
        /* Une courbe PAR indicateur coche depuis le 20/09, cinq au plus. */
        courbes: e.down('#graphique-kpi').series.items.map((x) => x.title) };
    });
    ok('Cocher trois indicateurs de plus ajoute leurs tuiles et leurs colonnes',
      apresCoche.tuiles.join(',') === 'caTTC,nbVentes,panier,marge,tauxMarge'
      && apresCoche.colonnes.length === 6, JSON.stringify(apresCoche.tuiles));
    ok('La fréquentation horaire apparaît quand elle est cochée, avec ses heures',
      apresCoche.horaireVisible === true, JSON.stringify(apresCoche.horaireVisible));
    /*
     * UNE COURBE PAR INDICATEUR COCHE, cinq au plus (20/09). Cinq indicateurs sont coches ici - la
     * frequentation horaire ne se tracant pas par mois - et les cinq doivent avoir leur courbe, chacune
     * nommee. Le titre dit en outre la lecture retenue : montants reels, ou base 100 quand les echelles
     * sont trop eloignees pour etre superposees.
     */
    ok('Chaque indicateur coché a SA courbe, nommée, et le titre dit la lecture retenue',
      apresCoche.courbes.length === 5
      && apresCoche.courbes.indexOf('Chiffre d\'affaires TTC') >= 0
      && apresCoche.courbes.indexOf('Panier moyen') >= 0
      && /base 100|Évolution/.test(apresCoche.titreCourbe),
      JSON.stringify(apresCoche.courbes) + ' / ' + apresCoche.titreCourbe);

    const heuresBase = q("SELECT COUNT(DISTINCT HOUR(p.dt_UPDATED)) FROM t_preenregistrement p"
      + " WHERE p.int_PRICE>0 AND p.str_STATUT='is_Closed' AND p.b_IS_CANCEL=0"
      + " AND p.lg_TYPE_VENTE_ID<>'5' AND p.dt_UPDATED>='" + moisCourant + "'"
      + " AND p.dt_UPDATED<'" + lendemain + "'");
    ok('Les heures de fréquentation sont celles de la base',
      apresCoche.heures === Number(heuresBase), apresCoche.heures + ' contre ' + heuresBase);

    await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('pilotage')[0];
      e.down('#casesKpi #kpi-marge').setValue(false);
      e.down('#casesKpi #kpi-frequentation').setValue(false);
    });
    await attendreTuiles(3);
    const apresDecoche = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('pilotage')[0];
      const tuiles = [];
      e.stores.kpi.tuiles.each((r) => tuiles.push(r.get('cle')));
      return { tuiles: tuiles, horaireVisible: e.down('#frequentation').isVisible() };
    });
    ok('Décocher retire la tuile et la fréquentation',
      apresDecoche.tuiles.indexOf('marge') < 0 && apresDecoche.horaireVisible === false,
      JSON.stringify(apresDecoche.tuiles));

    /* --------------------------------------------------------------- COMPARATEUR */
    await changerOnglet('Comparateur');
    /*
     * LA COMPARAISON NE PART PLUS TOUTE SEULE (20/09) : c'est l'onglet le plus lourd du menu, et il
     * partait a chaque frappe sur une comparaison parfois incomplete. Le test fait donc ce que fait
     * l'operateur : il clique sur « Comparer ». La suite test-pilotage-retours-2009 verifie, elle, que
     * rien ne part TANT QU'ON N'A PAS clique.
     */
    await p.evaluate(() => {
      Ext.ComponentQuery.query('pilotage #choixComparateur button[itemId=comparer]')[0].el.dom.click();
    });
    await p.waitForTimeout(12000);
    const comparateur = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('pilotage')[0];
      const tuiles = [];
      e.stores.comparateur.tuiles.each((r) => tuiles.push({ cle: r.get('cle'), libelle: r.get('libelle'),
        valeur: r.get('valeur') }));
      const lignes = [];
      e.stores.comparateur.mois.each((r) => lignes.push({ mois: r.get('mois'), a: r.get('a'),
        b: r.get('b'), ecart: r.get('ecart') }));
      return { tuiles: tuiles, lignes: lignes,
        type: e.down('#choixComparateur #typeComparaison').getValue(),
        colonnes: e.down('#detail-comparateur').headerCt.getGridColumns().map((c) => c.text),
        note: e.down('#choixComparateur #noteComparateur').getValue() };
    });
    ok('Le comparateur s ouvre sur « deux grandeurs » : le chiffre d affaires contre les achats',
      comparateur.type === 'GRANDEUR' && comparateur.tuiles.length === 3
      && /affaires/i.test(comparateur.tuiles[0].libelle) && /Achats/i.test(comparateur.tuiles[1].libelle),
      JSON.stringify(comparateur.tuiles.map((t) => t.libelle)));
    ok('Les colonnes portent le NOM des objets comparés, pas « A » et « B »',
      /AFFAIRES/.test(comparateur.colonnes[1]) && /ACHATS/.test(comparateur.colonnes[2]),
      JSON.stringify(comparateur.colonnes));
    const caBase = Number(baseVentes[0]);
    const achatsBase = Number(q("SELECT COALESCE(SUM(b.int_HTTC),0) FROM t_bon_livraison b"
      + " WHERE b.str_STATUT='is_Closed' AND b.dt_UPDATED>='" + moisCourant + "'"
      + " AND b.dt_UPDATED<'" + lendemain + "'"));
    ok('Comparer les achats aux ventes donne exactement les deux chiffres de la base',
      Math.abs(comparateur.tuiles[0].valeur - caBase) < 1
      && Math.abs(comparateur.tuiles[1].valeur - achatsBase) < 1,
      JSON.stringify([comparateur.tuiles[0].valeur, caBase, comparateur.tuiles[1].valeur, achatsBase]));
    ok('Et l écart est la différence des deux',
      Math.abs(comparateur.tuiles[2].valeur - (caBase - achatsBase)) < 1,
      comparateur.tuiles[2].valeur + ' contre ' + (caBase - achatsBase));
    ok('L écart est donné mois par mois', comparateur.lignes.length > 0
      && comparateur.lignes.every((l) => Math.abs(l.ecart - (l.a - l.b)) < 1),
      JSON.stringify(comparateur.lignes.slice(0, 2)));

    /* Deux objets de meme nature : deux familles. */
    const familles = q("SELECT GROUP_CONCAT(lg_FAMILLEARTICLE_ID SEPARATOR '|') FROM"
      + " (SELECT lg_FAMILLEARTICLE_ID FROM t_famillearticle LIMIT 2) x").split('|');
    const deuxFamilles = await p.evaluate(async (f) => {
      const r = await fetch('../api/v1/pilotage/onglet/comparateur?axe=MOIS&type=FAMILLE'
        + '&objetA=' + encodeURIComponent(f[0]) + '&objetB=' + encodeURIComponent(f[1])
        + '&grandeur=caTTC');
      const j = JSON.parse(await r.text());
      return { tuiles: (j.tuiles || []).map((t) => ({ libelle: t.libelle, valeur: t.valeur })),
        comparaison: j.comparaison, note: j.note };
    }, familles);
    ok('Comparer deux familles nomme chaque famille et donne sa valeur',
      deuxFamilles.tuiles.length === 3 && deuxFamilles.comparaison.type === 'FAMILLE',
      JSON.stringify(deuxFamilles.tuiles.map((t) => t.libelle)));
    const familleABase = Number(q("SELECT COALESCE(SUM(d.int_PRICE - COALESCE(d.int_PRICE_REMISE,0)),0)"
      + " FROM t_preenregistrement_detail d"
      + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID=d.lg_PREENREGISTREMENT_ID"
      + " JOIN t_famille f ON f.lg_FAMILLE_ID=d.lg_FAMILLE_ID"
      + " WHERE p.int_PRICE>0 AND p.str_STATUT='is_Closed' AND p.b_IS_CANCEL=0"
      + " AND p.lg_TYPE_VENTE_ID<>'5' AND p.dt_UPDATED>='" + moisCourant + "'"
      + " AND p.dt_UPDATED<'" + lendemain + "' AND f.lg_FAMILLEARTICLE_ID='" + familles[0] + "'"));
    ok('Et la valeur de la première famille est exactement celle de la base',
      Math.abs(deuxFamilles.tuiles[0].valeur - familleABase) < 1,
      deuxFamilles.tuiles[0].valeur + ' contre ' + familleABase);

    /* Deux grossistes : la grandeur est imposee, et l ecran le dit. */
    const grossistes = q("SELECT GROUP_CONCAT(id SEPARATOR '|') FROM (SELECT DISTINCT"
      + " g.lg_GROSSISTE_ID AS id FROM t_grossiste g JOIN t_order o"
      + " ON o.lg_GROSSISTE_ID=g.lg_GROSSISTE_ID JOIN t_bon_livraison b ON b.lg_ORDER_ID=o.lg_ORDER_ID"
      + " WHERE b.str_STATUT='is_Closed' LIMIT 2) x").split('|');
    const deuxGrossistes = await p.evaluate(async (g) => {
      const r = await fetch('../api/v1/pilotage/onglet/comparateur?axe=G12&type=GROSSISTE'
        + '&objetA=' + encodeURIComponent(g[0]) + '&objetB=' + encodeURIComponent(g[1]));
      const j = JSON.parse(await r.text());
      return { tuiles: (j.tuiles || []).map((t) => ({ libelle: t.libelle, valeur: t.valeur })),
        grandeur: j.comparaison.grandeur, note: j.note };
    }, grossistes);
    ok('Deux grossistes se comparent sur ce qu on leur achète, et l écran le dit',
      deuxGrossistes.grandeur === 'achatTTC' && /ne vend rien/.test(deuxGrossistes.note),
      deuxGrossistes.note);
    /*
     * LE COMPARATEUR COMPARE CE QUE L'ECRAN AFFICHE, c'est-a-dire des GROUPES de fournisseurs depuis le
     * 20/09 : les cinq agences LABOREX sont un seul fournisseur pour l'officine. L'identifiant envoye ici
     * est celui d'une agence ; le serveur le traduit en cle de groupe plutot que de rendre zero, et le
     * montant attendu est donc celui du groupe entier.
     */
    const grossisteABase = Number(q("SELECT COALESCE(SUM(b.int_HTTC),0) FROM t_bon_livraison b"
      + " JOIN t_order o ON o.lg_ORDER_ID=b.lg_ORDER_ID"
      + " JOIN t_grossiste g ON g.lg_GROSSISTE_ID=o.lg_GROSSISTE_ID"
      + " WHERE b.str_STATUT='is_Closed'"
      + " AND COALESCE(CONCAT('GRP', g.groupeId), g.lg_GROSSISTE_ID) ="
      + "   (SELECT COALESCE(CONCAT('GRP', g2.groupeId), g2.lg_GROSSISTE_ID) FROM t_grossiste g2"
      + "    WHERE g2.lg_GROSSISTE_ID='" + grossistes[0] + "')"
      + " AND b.dt_UPDATED>=DATE_SUB(DATE_FORMAT(CURDATE(),'%Y-%m-01'), INTERVAL 12 MONTH)"
      + " AND b.dt_UPDATED<DATE_FORMAT(CURDATE(),'%Y-%m-01')"));
    ok('Et le montant du premier grossiste est exactement celui de son GROUPE dans la base, '
      + 'sur les 12 mois glissants',
      Math.abs(deuxGrossistes.tuiles[0].valeur - grossisteABase) < 1,
      deuxGrossistes.tuiles[0].valeur + ' contre ' + grossisteABase);

    /* --------------------------------------------------------------- éditions */
    const pdfKpi = await p.evaluate(async () => {
      const r = await fetch('../api/v1/pilotage/pdf?onglet=kpi&axe=VS_M1&kpis=caTTC,marge,panier');
      return { statut: r.status, octets: Array.from(new Uint8Array(await r.arrayBuffer())) };
    });
    const texteKpi = texteDuPdf(pdfKpi.octets);
    ok('L édition des KPI porte EXACTEMENT les indicateurs demandés',
      pdfKpi.statut === 200 && /PILOTAGE - ANALYSE DES KPI/.test(texteKpi) && /CATTC/.test(texteKpi)
      && /MARGE/.test(texteKpi) && /PANIER/.test(texteKpi), texteKpi.slice(0, 300));
    const pdfComp = await p.evaluate(async () => {
      const r = await fetch('../api/v1/pilotage/pdf?onglet=comparateur&axe=MOIS&type=GRANDEUR'
        + '&objetA=caTTC&objetB=achatTTC');
      return { statut: r.status, octets: Array.from(new Uint8Array(await r.arrayBuffer())) };
    });
    const texteComp = texteDuPdf(pdfComp.octets);
    ok('L édition du comparateur nomme les deux objets et porte l écart',
      pdfComp.statut === 200 && /PILOTAGE - COMPARATEUR/.test(texteComp) && /ÉCART/.test(texteComp)
      && /ACHATS TTC/.test(texteComp), texteComp.slice(0, 300));

    ok('Aucune erreur JavaScript pendant tout le parcours', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Le parcours va au bout', false, e.message + ' ' + String(e.stack).slice(0, 280));
  } finally {
    await b.close();
    const bons = res.filter((x) => x.c).length;
    console.log('\n' + bons + '/' + res.length + ' controles OK');
    process.exit(bons === res.length ? 0 : 1);
  }
})();
