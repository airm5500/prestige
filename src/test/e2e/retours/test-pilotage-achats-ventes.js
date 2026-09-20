/* Onglet ACHATS / VENTES du menu de pilotage (demande de l'officine du 20/09).
 *
 * CE QU'IL REPOND. « Ce trimestre, ai-je achete plus que je n'ai vendu, et ou en suis-je par rapport a l'an
 * dernier ? » Trois annees civiles face a face, decoupees en trimestres (par defaut), semestres ou annees,
 * avec les ventes, les achats et leur RATIO sur la meme ligne.
 *
 * CE QUE CE TEST ETABLIT, sur le parcours reel :
 *  - l'onglet est ajoute EN DERNIER : aucun des onglets precedents n'a bouge ;
 *  - les ventes et les achats de chaque trimestre sont EXACTEMENT ceux de la base ;
 *  - le ratio est bien les ventes rapportees aux achats ;
 *  - le poids d'une periode est sa part dans l'annee, et la somme des poids d'une annee fait cent ;
 *  - la variation par rapport a la periode precedente est juste ;
 *  - changer de decoupage change le nombre de lignes : quatre trimestres, deux semestres, une annee -
 *    et les totaux d'une annee ne bougent pas d'un decoupage a l'autre ;
 *  - une comparaison qui n'a pas de sens n'est PAS affichee : ni « = 0,0 % » quand il n'y avait rien,
 *    ni « +864 311 696 % » quand la reference est negligeable ;
 *  - l'onglet ne declenche AUCUNE requete de calcul : il lit des agregats deja enregistres ;
 *  - l'impression et l'export repondent, et impriment les periodes dans leur ordre naturel.
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
    await p.waitForTimeout(7000);

    const onglets = await p.evaluate(() =>
      Ext.ComponentQuery.query('pilotage #onglets')[0].items.items.map((o) => o.title));
    ok('L onglet « Achats / Ventes » est ajouté EN DERNIER, sans déplacer les précédents',
      onglets[onglets.length - 1] === 'Achats / Ventes' && onglets[0] === 'Synthèse'
      && onglets[7] === 'KPI Analyse' && onglets[8] === 'Comparateur', JSON.stringify(onglets));

    /*
     * AUCUNE REQUETE DE CALCUL. L'onglet lit les agregats mensuels deja enregistres et les additionne : il ne
     * doit toucher ni aux ventes ni aux bons de livraison. On compte les requetes qu'il envoie.
     */
    await p.evaluate(() => {
      window.__appelsAV = 0;
      Ext.Ajax.on('beforerequest', function (conn, opts) {
        if (opts.url && opts.url.indexOf('/onglet/achatsventes') >= 0) {
          window.__appelsAV = (window.__appelsAV || 0) + 1;
        }
      });
    });

    const changerOnglet = async (titre) => {
      await p.evaluate((t) => {
        const ong = Ext.ComponentQuery.query('pilotage #onglets')[0];
        ong.setActiveTab(ong.items.items.filter((o) => o.title === t)[0]);
      }, titre);
      await p.waitForTimeout(9000);
    };
    const debut = Date.now();
    await changerOnglet('Achats / Ventes');
    const lire = () => p.evaluate(() => {
      const e = Ext.ComponentQuery.query('pilotage')[0];
      const grille = e.down('#detail-achatsventes');
      const store = grille.getStore();
      const lignes = [];
      store.each((r) => lignes.push(Ext.apply({}, r.data)));
      return { lignes: lignes,
        colonnes: grille.headerCt.getGridColumns().map((c) => c.text),
        titre: grille.title,
        appels: window.__appelsAV || 0,
        tuiles: (() => { const t = []; e.stores.achatsventes.tuiles.each((r) =>
          t.push({ cle: r.get('cle'), valeur: r.get('valeur') })); return t; })() };
    });
    const trimestres = await lire();
    ok('Le tableau porte quatre trimestres', trimestres.lignes.length === 4,
      trimestres.lignes.length + ' ligne(s)');
    ok('Et une requête, une seule, pour les remplir', trimestres.appels === 1,
      trimestres.appels + ' requete(s)');

    const anneeCourante = Number(q("SELECT YEAR(CURDATE())"));
    const prefixe = 'an' + anneeCourante + '_';

    /* Les ventes du premier trimestre de l annee en cours, dans la base. */
    const ventesT1 = Number(q("SELECT ROUND(COALESCE(SUM(p.int_PRICE - COALESCE(p.int_PRICE_REMISE,0)),0))"
      + " FROM t_preenregistrement p WHERE p.int_PRICE>0 AND p.str_STATUT='is_Closed' AND p.b_IS_CANCEL=0"
      + " AND p.lg_TYPE_VENTE_ID<>'5' AND QUARTER(p.dt_UPDATED)=1 AND YEAR(p.dt_UPDATED)=" + anneeCourante));
    const achatsT1 = Number(q("SELECT ROUND(COALESCE(SUM(b.int_HTTC),0)) FROM t_bon_livraison b"
      + " WHERE b.str_STATUT='is_Closed' AND QUARTER(b.dt_UPDATED)=1 AND YEAR(b.dt_UPDATED)="
      + anneeCourante));
    const t1 = trimestres.lignes[0];
    ok('Les ventes du trimestre 1 sont EXACTEMENT celles de la base',
      Math.abs(Number(t1[prefixe + 'ca']) - ventesT1) <= 1,
      t1[prefixe + 'ca'] + ' contre ' + ventesT1);
    ok('Les achats du trimestre 1 aussi',
      Math.abs(Number(t1[prefixe + 'achat']) - achatsT1) <= 1,
      t1[prefixe + 'achat'] + ' contre ' + achatsT1);
    ok('Le ratio est bien les ventes rapportées aux achats',
      achatsT1 === 0 || Math.abs(Number(t1[prefixe + 'ratio']) - ventesT1 / achatsT1) < 0.01,
      t1[prefixe + 'ratio'] + ' contre ' + (achatsT1 === 0 ? '-' : (ventesT1 / achatsT1).toFixed(2)));

    /* Le poids : la part de la periode dans son annee. La somme des quatre fait cent. */
    const sommePoids = trimestres.lignes.reduce((t, l) => t + (Number(l[prefixe + 'poidsCa']) || 0), 0);
    const totalAnnee = trimestres.lignes.reduce((t, l) => t + (Number(l[prefixe + 'ca']) || 0), 0);
    ok('La somme des poids d une année fait cent pour cent',
      totalAnnee === 0 || Math.abs(sommePoids - 100) < 0.2, sommePoids + ' %');

    /* La variation vs la periode precedente de la MEME annee. */
    const t2 = trimestres.lignes[1];
    const attendu = Number(t1[prefixe + 'ca']) ? (Number(t2[prefixe + 'ca']) - Number(t1[prefixe + 'ca']))
      / Math.abs(Number(t1[prefixe + 'ca'])) * 100 : null;
    ok('La variation du trimestre 2 par rapport au trimestre 1 est juste',
      attendu === null || Math.abs(Number(t2[prefixe + 'varCaPrec']) - attendu) < 0.1,
      t2[prefixe + 'varCaPrec'] + ' contre ' + (attendu === null ? '-' : attendu.toFixed(1)));

    /*
     * UNE COMPARAISON QUI N'A PAS DE SENS N'EST PAS AFFICHEE. Deux cas : la periode de reference etait vide
     * (on ne compare pas a rien), ou elle est negligeable devant la valeur (cinquante-cinq francs contre
     * quatre cent millions ne font pas une progression de 864 millions de pour cent, mais un demarrage).
     */
    const aberrantes = trimestres.lignes.filter((l) => {
      const t = Number(l[prefixe + 'varCaTaux']);
      return !isNaN(t) && l[prefixe + 'varCaTaux'] !== null && Math.abs(t) > 10000;
    });
    ok('Aucune variation aberrante n est affichée', aberrantes.length === 0,
      JSON.stringify(aberrantes.map((l) => l.libelle + '=' + l[prefixe + 'varCaTaux'])));
    const cellulesVides = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('pilotage')[0];
      return e.down('#detail-achatsventes').getEl().dom.innerHTML;
    });
    ok('Et aucune case ne dit « = 0,0 % » là où il n y a rien à comparer',
      cellulesVides.indexOf('= 0,0 % vs N-1') < 0,
      'la mention « = 0,0 % vs N-1 » figure encore dans le tableau');

    /* --------------------------------------------------------------- les trois découpages */
    const choisir = async (valeur) => {
      await p.evaluate((v) => {
        const c = Ext.ComponentQuery.query('pilotage #choixDecoupage #decoupage')[0];
        c.setValue(v);
        c.fireEvent('select', c, [c.getStore().findRecord('id', v)]);
      }, valeur);
      await p.waitForTimeout(9000);
      return lire();
    };
    const semestres = await choisir('SEMESTRE');
    ok('« Par semestre » donne deux lignes', semestres.lignes.length === 2,
      semestres.lignes.length + ' ligne(s)');
    const annuel = await choisir('ANNEE');
    ok('« Par année » en donne une seule', annuel.lignes.length === 1, annuel.lignes.length + ' ligne(s)');
    /*
     * LE TOTAL D'UNE ANNEE NE DEPEND PAS DU DECOUPAGE. Quatre trimestres, deux semestres ou une annee
     * entiere doivent donner exactement le meme total : c'est le controle qui prouve que le regroupement
     * ne perd ni ne double aucun mois.
     */
    const totalSemestres = semestres.lignes.reduce((t, l) => t + (Number(l[prefixe + 'ca']) || 0), 0);
    const totalAnnuel = Number(annuel.lignes[0][prefixe + 'ca']) || 0;
    ok('Le total de l année est le MÊME dans les trois découpages',
      Math.abs(totalAnnee - totalSemestres) <= 1 && Math.abs(totalAnnee - totalAnnuel) <= 1,
      [totalAnnee, totalSemestres, totalAnnuel].join(' / '));
    ok('Et le titre du tableau nomme le découpage affiché',
      /par année/.test(annuel.titre), annuel.titre);

    await choisir('TRIMESTRE');

    /* --------------------------------------------------------------- éditions */
    const edition = await p.evaluate(async () => {
      const r = await fetch('../api/v1/pilotage/pdf?onglet=achatsventes&axe=MOIS&decoupage=TRIMESTRE',
        { credentials: 'same-origin' });
      const buf = await r.arrayBuffer();
      const x = await fetch('../api/v1/pilotage/excel?onglet=achatsventes&axe=MOIS&decoupage=TRIMESTRE',
        { credentials: 'same-origin' });
      const xt = await x.text();
      return { statut: r.status, type: r.headers.get('content-type'),
        octets: Array.from(new Uint8Array(buf)), excel: x.status, tailleExcel: xt.length };
    });
    ok('L impression répond, en flux inline',
      edition.statut === 200 && /application\/pdf/.test(edition.type || ''),
      edition.statut + ' ' + edition.type);
    ok('L export Excel répond aussi', edition.excel === 200 && edition.tailleExcel > 0,
      edition.excel + ' / ' + edition.tailleExcel + ' octets');
    const texte = texteDuPdf(edition.octets);
    const i1 = texte.indexOf('Trimestre 1');
    const i4 = texte.indexOf('Trimestre 4');
    ok('Le PDF imprime les périodes dans leur ordre naturel : le premier trimestre avant le quatrième',
      i1 >= 0 && i4 > i1, 'T1@' + i1 + ' T4@' + i4);
    ok('Et il porte les ventes ET les achats des trois années',
      /VENTES/.test(texte) && /ACHATS/.test(texte), texte.slice(0, 200));

    const duree = Date.now() - debut;
    ok('Le parcours complet reste fluide', duree < 180000, Math.round(duree / 1000) + ' s');
    ok('Aucune erreur JavaScript pendant tout le parcours', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Le parcours va au bout', false, e.message + ' ' + e.stack);
  } finally {
    await b.close();
    const kos = res.filter((r) => !r.c);
    console.log('\n' + res.filter((r) => r.c).length + '/' + res.length + ' controles OK');
    process.exit(kos.length ? 1 : 0);
  }
})();
