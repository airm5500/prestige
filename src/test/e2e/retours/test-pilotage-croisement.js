/* PILOTAGE / COMPARATEUR : LE CROISEMENT (22/09).
 *
 * « A = chiffre d'affaires, B = frequence horaire » restait a plat : ce n'etait pas une comparaison mais un
 * CROISEMENT - une grandeur repartie selon un axe. Le comparateur gagne ce type : grandeur (chiffre, clients,
 * panier, marge, unites) PAR axe (heure de la journee, jour de la semaine, mode de reglement, vendeur), en barres.
 *
 * CE QUE CE TEST ETABLIT, sur le parcours reel et contre la base :
 *  - « Croiser » propose les cinq grandeurs et les quatre axes ;
 *  - chiffre × heure : une barre par heure de vente, chaque valeur EXACTEMENT celle de la base, les parts font 100 ;
 *  - clients × jour de la semaine : sept jours au plus, dans l'ordre lundi -> dimanche, valeurs exactes ;
 *  - × mode de reglement : la grandeur devient le montant regle et l'ecran le dit ;
 *  - × vendeur : du plus fort au plus faible ;
 *  - le graphique est en BARRES, le tableau porte l'axe, la valeur et la part, sans ecart ni rapport ;
 *  - revenir a « deux grandeurs » rend les deux courbes ;
 *  - l'impression et l'export repondent.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const VENTES = "p.int_PRICE>0 AND p.str_STATUT='is_Closed' AND p.b_IS_CANCEL=0 AND p.lg_TYPE_VENTE_ID<>'5'";
const proche = (a, b) => Math.abs(Number(a) - Number(b)) <= 1;

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1700, height: 1000 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('pilotage', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('pilotage #onglets').length > 0, null, { timeout: 30000 });
    await p.waitForFunction(() => { const z = Ext.ComponentQuery.query('pilotage #barrePeriode #zoneProgression')[0]; return !z || z.isHidden(); }, null, { timeout: 300000 });
    /* Douze mois glissants : la periode courante a des ventes au banc. */
    await p.evaluate(() => { const a = Ext.ComponentQuery.query('pilotage #barrePeriode combobox')[0]; a.setValue('G12'); a.fireEvent('select', a); });
    await p.waitForTimeout(2000);
    await p.evaluate(() => { const o = Ext.ComponentQuery.query('pilotage #onglets')[0]; o.setActiveTab(o.items.items.filter((t) => t.title === 'Comparateur')[0]); });
    await p.waitForTimeout(1500);
    const periode = await p.evaluate(async () => (await fetch('../api/v1/pilotage/onglet/synthese?axe=G12', { credentials: 'same-origin' })).json().then((r) => r.axe.periode));
    const iso = (d) => d.trim().split('/').reverse().join('-');
    const [d1, d2] = periode.split('->');
    const debut = iso(d1), fin = new Date(new Date(iso(d2)).getTime() + 86400000).toISOString().slice(0, 10);
    const OU = VENTES + " AND p.dt_UPDATED >= '" + debut + "' AND p.dt_UPDATED < '" + fin + "'";

    const choisir = async (type, a, bb) => {
      await p.evaluate(([type, a, bb]) => {
        const barre = Ext.ComponentQuery.query('pilotage #choixComparateur')[0];
        const t = barre.down('#typeComparaison'); t.setValue(type); t.fireEvent('select', t);
        if (a) { barre.down('#objetA').setValue(a); }
        if (bb) { barre.down('#objetB').setValue(bb); }
        barre.down('#comparer').el.dom.click();
      }, [type, a, bb]);
      await p.waitForFunction(() => { const o = Ext.ComponentQuery.query('pilotage #onglet-comparateur')[0]; const e = Ext.ComponentQuery.query('pilotage')[0]; return o && !(o.loadMask && o.loadMask.isVisible()) && e.stores.comparateur.mois.getCount() > 0; }, null, { timeout: 90000 });
      await p.waitForTimeout(900);
    };
    const lire = () => p.evaluate(() => {
      const e = Ext.ComponentQuery.query('pilotage')[0];
      const lignes = []; e.stores.comparateur.mois.each((r) => lignes.push({ libelle: r.get('libelle'), a: r.get('a'), b: r.get('b') }));
      const g = Ext.ComponentQuery.query('pilotage #graphique-comparateur')[0];
      const cols = e.down('#detail-comparateur').headerCt.getGridColumns();
      const tuiles = []; e.stores.comparateur.tuiles.each((r) => tuiles.push(r.get('libelle')));
      return { lignes, type: g ? g.series.items.map((s) => s.type).join(',') : '', rects: g ? g.el.query('svg rect').length : 0,
        cols: cols.map((c) => ({ t: c.text, v: !c.isHidden() })), note: e.down('#choixComparateur #noteComparateur').getValue(), titre: e.down('#graphiquePanneau-comparateur').title, tuiles,
        libelles: [e.down('#choixComparateur #objetA').getFieldLabel(), e.down('#choixComparateur #objetB').getFieldLabel()],
        a: e.down('#choixComparateur #objetA').getStore().getRange().map((r) => r.get('cle')), bb: e.down('#choixComparateur #objetB').getStore().getRange().map((r) => r.get('cle')) };
    });

    /* ---- chiffre x heure */
    await choisir('CROISER', 'caTTC', 'HEURE');
    let s = await lire();
    ok('« Croiser » propose cinq grandeurs et quatre axes, et renomme les champs « Grandeur » / « Par »',
      s.a.join(',') === 'caTTC,nbVentes,panier,marge,unites' && s.bb.join(',') === 'HEURE,JOUR,MODE,VENDEUR' && s.libelles.join('|') === 'Grandeur|Par', JSON.stringify([s.a, s.bb, s.libelles]));
    const heures = q("SELECT CONCAT(LPAD(HOUR(p.dt_UPDATED),2,'0'),'h|',ROUND(SUM(p.int_PRICE-IFNULL(p.int_PRICE_REMISE,0)))) FROM t_preenregistrement p WHERE " + OU + " GROUP BY HOUR(p.dt_UPDATED) ORDER BY HOUR(p.dt_UPDATED)").split('\n').filter(Boolean).map((l) => l.split('|'));
    const exact = heures.length === s.lignes.length && heures.every((h, i) => s.lignes[i].libelle === h[0] && proche(s.lignes[i].a, h[1]));
    const parts = s.lignes.reduce((t, l) => t + Number(l.b), 0);
    ok('Chiffre × heure : une ligne par heure de vente, dans l ordre, chaque valeur EXACTEMENT celle de la base', exact, s.lignes.length + ' heures contre ' + heures.length + ' | ' + JSON.stringify(s.lignes.slice(0, 3)));
    ok('Les parts font 100 %', Math.abs(parts - 100) < 0.3, parts.toFixed(2));
    ok('Le graphique est en BARRES, une par heure, et le titre nomme le croisement', /column/.test(s.type) && s.rects >= heures.length && /Chiffre d.affaires TTC par heure de la journée/.test(s.titre), s.type + ' ' + s.rects + ' ' + s.titre);
    ok('Le tableau porte l axe, la grandeur et la part - sans écart ni rapport', s.cols[0].t === 'HEURE DE LA JOURNÉE' && /AFFAIRES/.test(s.cols[1].t) && s.cols[2].t === 'PART %' && s.cols.slice(3).every((c) => !c.v), JSON.stringify(s.cols));
    ok('Trois tuiles : le total, le point fort (l heure la plus forte) et le nombre de valeurs', s.tuiles.length === 3 && /total/.test(s.tuiles[0]) && /Point fort/.test(s.tuiles[1]), JSON.stringify(s.tuiles));

    /* ---- clients x jour de la semaine */
    await choisir('CROISER', 'nbVentes', 'JOUR');
    s = await lire();
    const jours = q("SELECT CONCAT(WEEKDAY(p.dt_UPDATED),'|',COUNT(*)) FROM t_preenregistrement p WHERE " + OU + " GROUP BY WEEKDAY(p.dt_UPDATED) ORDER BY WEEKDAY(p.dt_UPDATED)").split('\n').filter(Boolean).map((l) => l.split('|'));
    const NOMS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    ok('Clients × jour de la semaine : lundi -> dimanche, chaque nombre de ventes EXACTEMENT celui de la base',
      jours.length === s.lignes.length && jours.every((j, i) => s.lignes[i].libelle === NOMS[Number(j[0])] && Number(s.lignes[i].a) === Number(j[1])), JSON.stringify(s.lignes));

    /* ---- x mode de reglement */
    await choisir('CROISER', 'caTTC', 'MODE');
    s = await lire();
    const modes = q("SELECT CONCAT(r.str_NAME,'|',ROUND(SUM(vr.montant))) FROM vente_reglement vr JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID=vr.vente_id JOIN t_type_reglement r ON r.lg_TYPE_REGLEMENT_ID=vr.type_regelement WHERE " + OU + " GROUP BY r.lg_TYPE_REGLEMENT_ID, r.str_NAME ORDER BY SUM(vr.montant) DESC").split('\n').filter(Boolean).map((l) => l.split('|'));
    ok('× mode de règlement : la grandeur devient le montant réglé (source vente_reglement), du plus fort au plus faible, valeurs exactes, et la note le dit',
      modes.length === s.lignes.length && modes.every((m, i) => s.lignes[i].libelle === m[0] && proche(s.lignes[i].a, m[1])) && /montant réglé/.test(s.note) && /RÉGLÉ/.test(s.cols[1].t), JSON.stringify(s.lignes.slice(0, 3)) + ' ' + s.cols[1].t);

    /* ---- x vendeur */
    await choisir('CROISER', 'marge', 'VENDEUR');
    s = await lire();
    const decroissant = s.lignes.every((l, i) => i === 0 || Number(l.a) <= Number(s.lignes[i - 1].a));
    ok('Marge × vendeur : du plus fort au plus faible, un nom par barre', s.lignes.length >= 1 && decroissant && s.lignes.every((l) => l.libelle && l.libelle.length > 1), JSON.stringify(s.lignes.slice(0, 3)));

    /* ---- editions */
    const pdf = await p.evaluate(async () => { const r = await fetch('../api/v1/pilotage/pdf?onglet=comparateur&axe=G12&type=CROISER&objetA=caTTC&objetB=HEURE', { credentials: 'same-origin' }); return { code: r.status, type: r.headers.get('content-type'), taille: (await r.blob()).size }; });
    const xls = await p.evaluate(async () => { const r = await fetch('../api/v1/pilotage/excel?onglet=comparateur&axe=G12&type=CROISER&objetA=nbVentes&objetB=JOUR', { credentials: 'same-origin' }); return { code: r.status, type: r.headers.get('content-type'), taille: (await r.blob()).size }; });
    ok('L impression et l export du croisement répondent', pdf.code === 200 && /pdf/.test(pdf.type) && pdf.taille > 2000 && xls.code === 200 && /excel/.test(xls.type) && xls.taille > 1500, JSON.stringify([pdf, xls]));

    /* ---- retour aux deux grandeurs : les courbes reviennent */
    await choisir('GRANDEUR', 'caTTC', 'achatTTC');
    s = await lire();
    ok('Revenir à « deux grandeurs » rend les deux courbes, les colonnes écart et rapport, et les libellés A / B',
      s.type === 'line,line' && s.cols.slice(3).every((c) => c.v) && s.libelles.join('|') === 'A|B' && s.cols[0].t === 'MOIS', s.type + ' ' + JSON.stringify(s.libelles));
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Le parcours va au bout', false, e.message + ' ' + (e.stack || '').split('\n')[1]);
  } finally {
    await b.close();
    const kos = res.filter((r) => !r.c);
    console.log('\n' + res.filter((r) => r.c).length + '/' + res.length + ' controles OK');
    process.exit(kos.length ? 1 : 0);
  }
})();
