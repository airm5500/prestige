/* Evolution 6, point 1 : MENU DE PILOTAGE (premiere vague : Synthese, Ventes, Marge).
 *
 * Ce que le menu apporte et qui n'existait pas : chaque mois est isole et COMPARABLE a un autre, sans
 * exporter quoi que ce soit.
 *
 * Ce que le test etablit, en jouant l'ecran :
 *  - le menu existe, dans ANALYSE DE GESTION, sous son privilege, et le tableau de bord existant est INTACT ;
 *  - l'ecran s'ouvre sur la Synthese, avec ses tuiles, sa courbe et son detail mensuel ;
 *  - le selecteur de periode est un AXE DE COMPARAISON : « Vs mois precedent » fait apparaitre la variation
 *    sur chaque tuile, « Mois en cours » ne compare rien ;
 *  - les deux periodes comparees ont la MEME DUREE ECOULEE (le mois de reference est tronque au meme jour) ;
 *  - les chiffres servis sont EXACTEMENT ceux de la base, verifies par une requete independante ;
 *  - un onglet cache n'interroge pas le serveur ; changer d'onglet le charge ;
 *  - le mix de reglement porte une colonne par mode REELLEMENT rencontre ;
 *  - l'impression et l'export suivent l'onglet et l'axe, et sont refuses sans le privilege.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 330) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const MB4 = '--default-character-set=utf8mb4';
const exec = (s) => execFileSync('mariadb', [MB4, BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', [MB4, BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
/* Les octets nuls d'un classeur xls, retires pour pouvoir y lire les chaines. */
const NUL = new RegExp(String.fromCharCode(0), 'g');

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

/* Le CA tel que la base le donne, avec la definition du tableau de bord existant. */
function caDeLaBase(debut, finExclue) {
  return q("SELECT COALESCE(SUM(p.int_PRICE - COALESCE(p.int_PRICE_REMISE,0)),0)"
    + " FROM t_preenregistrement p WHERE p.int_PRICE>0 AND p.str_STATUT='is_Closed' AND p.b_IS_CANCEL=0"
    + " AND p.lg_TYPE_VENTE_ID<>'5' AND p.dt_UPDATED>='" + debut + "' AND p.dt_UPDATED<'" + finExclue + "'");
}

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1700, height: 1000 } });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    const menu = q("SELECT CONCAT(s.str_VALUE, '|', s.P_KEY, '|', m.str_VALUE) FROM t_sous_menu s"
      + " JOIN t_menu m ON m.lg_MENU_ID=s.lg_MENU_ID WHERE s.str_COMPOSANT='pilotage'");
    ok('Le menu « Pilotage » est dans ANALYSE DE GESTION, sous son privilège',
      menu === 'Pilotage|P_SM_PILOTAGE|ANALYSE DE GESTION', menu);
    const libelles = q("SELECT CONCAT(CHAR_LENGTH(str_VALUE), '/', CHAR_LENGTH(str_DESCRIPTION))"
      + " FROM t_sous_menu WHERE str_COMPOSANT='pilotage'").split('/');
    ok('Libellé et description restent courts (règle de l officine : 25 et 30)',
      Number(libelles[0]) <= 25 && Number(libelles[1]) <= 30, libelles.join('/'));

    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);

    /* « On ne touche pas au dashboard existant » : son service repond toujours. */
    const dashboard = await p.evaluate(async () => {
      const r = await fetch('../api/v1/recap/dashboard/daily');
      return { statut: r.status, taille: (await r.text()).length };
    });
    ok('Le tableau de bord existant répond comme avant : il n est pas touché',
      dashboard.statut === 200 && dashboard.taille > 10, JSON.stringify(dashboard));

    const ouvert = await p.evaluate(() => {
      try { testextjs.app.getController('App').onRedirectTo('pilotage', {}); return 'ok'; }
      catch (e) { return 'ERREUR ' + e.message; }
    });
    ok('L écran de pilotage s ouvre', ouvert === 'ok', ouvert);
    await p.waitForFunction(() => Ext.ComponentQuery.query('pilotage #onglets').length > 0, null,
      { timeout: 30000 });
    await p.waitForTimeout(6000);

    const structure = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('pilotage')[0];
      const onglets = e.down('#onglets');
      return {
        onglets: onglets.items.items.map((o) => o.title),
        actif: onglets.getActiveTab().cleOnglet,
        axes: e.storeAxes.getCount(),
        axeChoisi: e.down('#barrePeriode #axe').getValue(),
        datesGrisees: e.down('#barrePeriode #dtStart').isDisabled()
          && e.down('#barrePeriode #dtEnd').isDisabled(),
        tuiles: e.stores.synthese.tuiles.getCount(),
        mois: e.stores.synthese.mois.getCount(),
        graphique: !!e.down('#graphique-synthese'),
        detail: !!e.down('#detail-synthese')
      };
    });
    ok('Les trois onglets de cette vague sont là, la Synthèse en premier',
      structure.onglets.join(' | ') === 'Synthèse | Ventes | Marge' && structure.actif === 'synthese',
      JSON.stringify(structure.onglets));
    ok('Les six axes de comparaison viennent du SERVEUR, pas du JavaScript',
      structure.axes === 6, String(structure.axes));
    ok('L écran s ouvre sur « Mois en cours », et les dates ne servent que pour la période personnalisée',
      structure.axeChoisi === 'MOIS' && structure.datesGrisees === true, JSON.stringify(structure));
    ok('La Synthèse porte ses tuiles, sa courbe et son détail mensuel',
      structure.tuiles === 6 && structure.mois > 0 && structure.graphique && structure.detail,
      JSON.stringify(structure));

    const lireTuiles = () => p.evaluate(() => {
      const e = Ext.ComponentQuery.query('pilotage')[0];
      const out = [];
      e.stores[e.down('#onglets').getActiveTab().cleOnglet].tuiles.each((r) => out.push({
        cle: r.get('cle'), libelle: r.get('libelle'), valeur: r.get('valeur'),
        reference: r.get('reference'), variation: r.get('variation')
      }));
      return { tuiles: out, rappel: e.down('#barrePeriode #rappelAxe').getValue() };
    });

    let vue = await lireTuiles();
    ok('Sans comparaison, aucune tuile ne porte de variation',
      vue.tuiles.every((t) => t.variation === null || t.variation === undefined),
      JSON.stringify(vue.tuiles.map((t) => t.variation)));

    const poserAxe = async (code) => {
      await p.evaluate((c) => {
        const combo = Ext.ComponentQuery.query('pilotage #barrePeriode #axe')[0];
        combo.setValue(c);
        combo.fireEvent('select', combo, [combo.getStore().findRecord('code', c)].filter(Boolean));
      }, code);
      await p.waitForTimeout(7000);
    };

    await poserAxe('VS_M1');
    vue = await lireTuiles();
    ok('« Vs mois précédent » fait apparaître la variation sur les tuiles',
      vue.tuiles.filter((t) => t.variation !== null && t.variation !== undefined).length >= 3,
      JSON.stringify(vue.tuiles.map((t) => t.cle + '=' + t.variation)));
    ok('Le rappel dit ce qui est comparé à quoi, et pourquoi',
      /comparé à/.test(vue.rappel) && /meme jour|même jour/.test(vue.rappel), vue.rappel);

    const aujourdhui = new Date();
    const j = aujourdhui.getDate();
    const iso = (d) => Ext2iso(d);
    function Ext2iso(d) {
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return d.getFullYear() + '-' + mm + '-' + dd;
    }
    const premierDuMois = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 1);
    const lendemain = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), j + 1);
    const premierMoisPrec = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth() - 1, 1);
    const finMoisPrec = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth() - 1, j + 1);
    const caCourant = Number(caDeLaBase(iso(premierDuMois), iso(lendemain)));
    const caReference = Number(caDeLaBase(iso(premierMoisPrec), iso(finMoisPrec)));
    const tuileCa = vue.tuiles.filter((t) => t.cle === 'caTTC')[0];
    ok('Le chiffre d affaires affiché est EXACTEMENT celui de la base',
      Math.abs(tuileCa.valeur - caCourant) < 1, tuileCa.valeur + ' contre ' + caCourant);
    ok('La référence est le mois précédent ARRÊTÉ AU MÊME JOUR, pas le mois entier',
      Math.abs(tuileCa.reference - caReference) < 1, tuileCa.reference + ' contre ' + caReference);
    /*
     * Le controle du controle : si le mois precedent porte des ventes APRES le jour d'arret, alors le mois
     * entier doit donner un autre chiffre que le mois tronque - c'est ce qui prouve que la troncature est
     * reellement appliquee. Sur un jeu de donnees qui s'arrete en cours de mois, les deux sont egaux : le
     * controle n'a alors rien a prouver et le dit, au lieu d'echouer sur une limite du jeu d'essai.
     */
    const moisEntier = Number(caDeLaBase(iso(premierMoisPrec), iso(premierDuMois)));
    if (moisEntier !== caReference) {
      ok('Contrôle du contrôle : le mois précédent ENTIER donne bien un autre chiffre',
        moisEntier > caReference, moisEntier + ' (entier) contre ' + caReference + ' (tronqué)');
    } else {
      ok('Contrôle du contrôle : aucune vente après le jour d arrêt sur ce jeu d essai, '
        + 'entier et tronqué se confondent', true, moisEntier + ' = ' + caReference);
    }

    await poserAxe('G12');
    vue = await lireTuiles();
    ok('« Glissant 12 mois » compare douze mois complets aux douze précédents',
      /12 mois complets/.test(vue.rappel) && /12 mois précédents/.test(vue.rappel), vue.rappel);
    await poserAxe('YTD');
    vue = await lireTuiles();
    ok('« Cumul annuel » compare les deux cumuls arrêtés au même jour',
      /Cumul \d{4}/.test(vue.rappel) && /comparé à/.test(vue.rappel), vue.rappel);
    await poserAxe('PERSO');
    const datesActives = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('pilotage')[0];
      return { debut: !e.down('#barrePeriode #dtStart').isDisabled(),
        fin: !e.down('#barrePeriode #dtEnd').isDisabled(),
        valeurDebut: Ext.Date.format(e.down('#barrePeriode #dtStart').getValue(), 'Y-m-d') };
    });
    ok('« Période personnalisée » réveille les deux dates et les prérenseigne',
      datesActives.debut && datesActives.fin && !!datesActives.valeurDebut, JSON.stringify(datesActives));
    await poserAxe('VS_N1');
    vue = await lireTuiles();
    ok('« Vs même mois l an dernier » compare au même mois de l année précédente',
      /comparé à/.test(vue.rappel) && new RegExp(String(aujourdhui.getFullYear() - 1)).test(vue.rappel),
      vue.rappel);

    const changerOnglet = async (titre) => {
      await p.evaluate((t) => {
        const onglets = Ext.ComponentQuery.query('pilotage #onglets')[0];
        const cible = onglets.items.items.filter((o) => o.title === t)[0];
        onglets.setActiveTab(cible);
      }, titre);
      await p.waitForTimeout(9000);
    };

    const avantVentes = await p.evaluate(() =>
      Ext.ComponentQuery.query('pilotage')[0].stores.ventes.mois.getCount());
    ok('Un onglet caché n a rien demandé au serveur', avantVentes === 0, String(avantVentes));

    await changerOnglet('Ventes');
    const ventes = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('pilotage')[0];
      const grille = e.down('#detail-ventes');
      return { mois: e.stores.ventes.mois.getCount(), tuiles: e.stores.ventes.tuiles.getCount(),
        /*
         * headerCt.getGridColumns() et non grille.columns : le second rend la CONFIGURATION de depart,
         * pas les colonnes vivantes - et les colonnes de modes sont ajoutees au chargement.
         */
        colonnes: grille.headerCt.getGridColumns().map((c) => c.text) };
    });
    ok('L onglet Ventes se charge quand on l ouvre', ventes.mois > 0 && ventes.tuiles === 5,
      JSON.stringify({ mois: ventes.mois, tuiles: ventes.tuiles }));
    const modesBase = q("SELECT GROUP_CONCAT(DISTINCT UPPER(r.str_NAME) ORDER BY r.str_NAME SEPARATOR '|')"
      + " FROM vente_reglement vr JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID=vr.vente_id"
      + " JOIN t_type_reglement r ON r.lg_TYPE_REGLEMENT_ID=vr.type_regelement"
      + " WHERE p.str_STATUT='is_Closed' AND p.b_IS_CANCEL=0 AND p.lg_TYPE_VENTE_ID<>'5'"
      + " AND p.dt_UPDATED >= DATE_SUB(DATE_FORMAT(CURDATE(),'%Y-%m-01'), INTERVAL 12 MONTH)");
    const modes = modesBase ? modesBase.split('|') : [];
    ok('Le détail des ventes porte une colonne par mode de règlement rencontré',
      modes.length > 0 && modes.every((m) => ventes.colonnes.indexOf(m) >= 0),
      JSON.stringify({ attendus: modes, colonnes: ventes.colonnes }));

    await changerOnglet('Marge');
    const marge = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('pilotage')[0];
      const out = [];
      e.stores.marge.tuiles.each((r) => out.push({ cle: r.get('cle'), valeur: r.get('valeur') }));
      const premier = e.stores.marge.mois.getAt(0);
      return { tuiles: out, mois: e.stores.marge.mois.getCount(),
        ligne: premier ? { caHT: premier.get('caHT'), cout: premier.get('coutAchat'),
          marge: premier.get('marge'), taux: premier.get('tauxMarge') } : null };
    });
    ok('L onglet Marge donne la marge, son taux, le CA HT et le coût d achat',
      marge.tuiles.map((t) => t.cle).join(',') === 'marge,tauxMarge,caHT,coutAchat,ratioVA',
      JSON.stringify(marge.tuiles.map((t) => t.cle)));
    ok('La marge d un mois est bien le CA hors taxes moins le coût d achat',
      marge.ligne && Math.abs((marge.ligne.caHT - marge.ligne.cout) - marge.ligne.marge) <= 1,
      JSON.stringify(marge.ligne));
    ok('Et le taux de marge est la marge rapportée au CA hors taxes',
      marge.ligne && Math.abs((marge.ligne.caHT === 0 ? 0
        : marge.ligne.marge / marge.ligne.caHT * 100) - marge.ligne.taux) < 0.1,
      JSON.stringify(marge.ligne));

    const pdf = await p.evaluate(async () => {
      const r = await fetch('../api/v1/pilotage/pdf?onglet=marge&axe=VS_M1&dtStart=&dtEnd=');
      const b2 = await r.arrayBuffer();
      return { statut: r.status, type: r.headers.get('content-type'),
        disposition: r.headers.get('content-disposition'), octets: Array.from(new Uint8Array(b2)) };
    });
    ok('L édition est servie EN FLUX, inline',
      pdf.statut === 200 && /application\/pdf/.test(pdf.type) && /inline/.test(pdf.disposition),
      JSON.stringify({ statut: pdf.statut, type: pdf.type }));
    const textePdf = texteDuPdf(pdf.octets);
    ok('Elle porte le titre de l onglet et le rappel de l axe comparé',
      /PILOTAGE - MARGE/.test(textePdf) && /comparé à/.test(textePdf), textePdf.slice(0, 300));
    /* Dans le texte extrait d'un PDF, les parentheses sont echappees : on cherche donc sans elles. */
    ok('Elle porte les totaux de la période ET le détail mensuel',
      /Marge :/.test(textePdf) && textePdf.indexOf('TOTAL') >= 0 && /CA HT/.test(textePdf),
      textePdf.slice(0, 500));
    ok('Elle est paginée', /Page 1/.test(textePdf), textePdf.slice(-200));

    const excel = await p.evaluate(async (motifNul) => {
      const r = await fetch('../api/v1/pilotage/excel?onglet=ventes&axe=MOIS&dtStart=&dtEnd=');
      const octets = new Uint8Array(await r.arrayBuffer());
      let t = '';
      for (let i = 0; i < octets.length; i++) { t += String.fromCharCode(octets[i]); }
      return { statut: r.status, disposition: r.headers.get('content-disposition'),
        taille: octets.length, texte: t.split(String.fromCharCode(0)).join('') };
    });
    ok('L export Excel répond, en pièce attachée',
      excel.statut === 200 && excel.taille > 1000 && /attachment/.test(excel.disposition),
      JSON.stringify({ statut: excel.statut, taille: excel.taille }));
    ok('Il porte les colonnes de l onglet, modes de règlement compris',
      excel.texte.indexOf('CA TTC') >= 0 && excel.texte.indexOf('PANIER MOYEN') >= 0
      && (modes.length === 0 || excel.texte.indexOf(modes[0]) >= 0), JSON.stringify(modes));

    const roleAdmin = q("SELECT ru.lg_ROLE_ID FROM t_role_user ru JOIN t_user u ON u.lg_USER_ID=ru.lg_USER_ID"
      + " WHERE u.str_LOGIN='admin' LIMIT 1");
    const priv = q("SELECT lg_PRIVELEGE_ID FROM t_privilege WHERE str_NAME='P_SM_PILOTAGE'");
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
      const refus = await p2.evaluate(async () => {
        const donnees = await fetch('../api/v1/pilotage/onglet/synthese?axe=MOIS');
        const pdf2 = await fetch('../api/v1/pilotage/pdf?onglet=synthese&axe=MOIS');
        const xls = await fetch('../api/v1/pilotage/excel?onglet=synthese&axe=MOIS');
        return { donnees: JSON.parse(await donnees.text()), pdf: pdf2.status, excel: xls.status };
      });
      ok('Sans le privilège, les chiffres sont refusés',
        refus.donnees.success === false && /profil/i.test(refus.donnees.message),
        JSON.stringify(refus.donnees));
      ok('Et les deux éditions aussi (403)', refus.pdf === 403 && refus.excel === 403, JSON.stringify(refus));
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
    const bons = res.filter((x) => x.c).length;
    console.log('\n' + bons + '/' + res.length + ' controles OK');
    process.exit(bons === res.length ? 0 : 1);
  }
})();
