/* Evolution 5, point 1 (premiere partie) : ecran des depots d'extension.
 *
 * Le stock d'un depot d'extension est t_famille_stock pour l'emplacement du depot - la meme table que le
 * stock de l'officine, distinguee par son emplacement. Les donnees existaient donc deja, mais rien ne
 * permettait de les consulter depuis l'officine depot par depot, avec la valorisation de ce que le depot
 * detient, ni de l'emporter en Excel ou en PDF.
 *
 * Le parcours est joue a l'ecran : choix du depot, recherche, filtre famille, bascule « detenus
 * seulement », export Excel et edition PDF. Le depot et le stock poses par le test sont retires a la fin. */
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
  const arts = q("SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, ':', COALESCE(int_PAF,0), ':', COALESCE(int_PRICE,0),"
    + " ':', COALESCE(int_CIP,'')) SEPARATOR '|') FROM (SELECT lg_FAMILLE_ID, int_PAF, int_PRICE, int_CIP"
    + " FROM t_famille WHERE str_STATUT='enable' AND int_PAF>0 AND int_PRICE>0 AND int_CIP IS NOT NULL"
    + " ORDER BY str_NAME LIMIT 4) x").split('|')
    .map((x) => { const p = x.split(':'); return { id: p[0], pa: parseInt(p[1], 10), pv: parseInt(p[2], 10), cip: p[3] }; });
  const quantites = [12, 5, 40, 0]; // le dernier a zero : il ne doit pas sortir en mode « detenus seulement »
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
  const attendus = arts.filter((a) => a.stock > 0);
  const valeurAchat = attendus.reduce((s, a) => s + a.stock * a.pa, 0);
  const valeurVente = attendus.reduce((s, a) => s + a.stock * a.pv, 0);
  const quantite = attendus.reduce((s, a) => s + a.stock, 0);

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
    ok('Le sous-menu « Dépôts d extension » est posé sous la gestion du stock, avec son privilège',
      menu === "Depots d'extension|depotextension|P_SM_DEPOT_EXTENSION|55111546114940284023", menu);
    const visible = q("SELECT COUNT(*) FROM v_getallsousmenubyconnecteduser v JOIN t_user u ON u.lg_USER_ID=v.lg_USER_ID"
      + " WHERE u.str_LOGIN='admin' AND v.str_COMPOSANT='depotextension'");
    ok('Il est visible pour un profil administrateur', visible === '1', visible);

    await p.evaluate(() => { testextjs.app.getController('App').onRedirectTo('depotextension', {}); });
    await p.waitForFunction(() => Ext.ComponentQuery.query('depotextension').length > 0, null, { timeout: 25000 });
    await p.waitForTimeout(4000);

    /* 1. a l ouverture : aucun depot choisi, rien n est demande, editions inactives */
    const depart = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('depotextension')[0];
      return { lignes: e.getStore().getCount(), excel: e.down('#exporterExcel').isDisabled(),
        pdf: e.down('#imprimer').isDisabled(), message: e.down('#valorisation').el.dom.textContent.trim() };
    });
    ok('Tant qu aucun dépôt n est choisi, rien n est chargé et les éditions restent inactives',
      depart.lignes === 0 && depart.excel === true && depart.pdf === true && /Choisissez un d/.test(depart.message),
      JSON.stringify(depart));

    /* 2. la liste des depots ne propose que les depots d extension, pas l officine */
    const depots = await p.evaluate(() => {
      const c = Ext.ComponentQuery.query('depotextension combobox[itemId=depot]')[0];
      const v = []; c.getStore().each((r) => v.push([r.get('id'), r.get('nom')]));
      return v;
    });
    ok('Le choix ne propose que les dépôts d extension, jamais l officine',
      depots.length === 2 && depots.every((d) => d[0] !== '1')
      && depots.some((d) => d[1] === 'DEPOT E2E NORD'), JSON.stringify(depots));

    /* 3. choix du depot : stock et valorisation */
    const choisirDepot = async (id) => {
      await p.evaluate((d) => {
        const c = Ext.ComponentQuery.query('depotextension combobox[itemId=depot]')[0];
        c.setValue(d);
        c.fireEvent('select', c, [c.getStore().findRecord('id', d)].filter(Boolean));
      }, id);
      await p.waitForTimeout(4000);
    };
    await choisirDepot(DEPOT);
    let vue = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('depotextension')[0];
      const lignes = []; e.getStore().each((r) => lignes.push(r.data));
      return { total: e.getStore().getTotalCount(), lignes: lignes,
        valorisation: e.down('#valorisation').el.dom.textContent.trim(),
        excel: e.down('#exporterExcel').isDisabled(), pdf: e.down('#imprimer').isDisabled() };
    });
    ok('Le stock du dépôt s affiche : 3 articles détenus sur les 4 posés',
      vue.total === 3 && vue.lignes.length === 3, JSON.stringify({ total: vue.total }));
    ok('L article à zéro n est pas listé en mode « détenus seulement »',
      !vue.lignes.some((l) => l.stock === 0), JSON.stringify(vue.lignes.map((l) => l.stock)));
    ok('Les éditions deviennent actives', vue.excel === false && vue.pdf === false);

    // L'application sépare les milliers par un point ; on compare donc les chiffres seuls,
    // sans dépendre du séparateur retenu par le thème.
    const chiffres = (t) => String(t).replace(/[^0-9]/g, '');
    const contient = (texte, valeur) => chiffres(texte).indexOf(String(valeur)) >= 0;
    const n = (v) => String(v);
    ok('La valorisation du dépôt est exacte et porte sur toutes les lignes retenues',
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
    vue = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('depotextension')[0];
      return { total: e.getStore().getTotalCount(), lignes: e.getStore().getCount(),
        valorisation: e.down('#valorisation').el.dom.textContent.trim() };
    });
    ok('Un dépôt sans stock s affiche vide, et non avec le stock du dépôt précédent',
      vue.total === 0 && vue.lignes === 0 && /DEPOT E2E SUD/.test(vue.valorisation)
      && /0 article/.test(vue.valorisation), JSON.stringify(vue));

    /* 5. la bascule « detenus seulement » ouvre tout le referentiel */
    await choisirDepot(DEPOT);
    await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('depotextension')[0];
      e.down('#enStock').setValue(false);
    });
    await p.waitForTimeout(4000);
    const tous = await p.evaluate(() => Ext.ComponentQuery.query('depotextension')[0].getStore().getTotalCount());
    ok('Décocher « détenus seulement » fait apparaître la ligne à zéro', tous === 4, tous);
    await p.evaluate(() => { Ext.ComponentQuery.query('depotextension')[0].down('#enStock').setValue(true); });
    await p.waitForTimeout(3500);

    /* 6. recherche par CIP */
    await p.evaluate((cip) => {
      const e = Ext.ComponentQuery.query('depotextension')[0];
      e.down('#recherche').setValue(cip);
      const btn = e.down('#rechercher');
      btn.fireEvent('click', btn);
    }, attendus[0].cip);
    await p.waitForTimeout(4000);
    const cherche = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('depotextension')[0];
      const lignes = []; e.getStore().each((r) => lignes.push(r.get('cip')));
      return { total: e.getStore().getTotalCount(), lignes: lignes,
        valorisation: e.down('#valorisation').el.dom.textContent.trim() };
    });
    ok('La recherche par CIP ne garde que cet article, et la valorisation suit',
      cherche.total === 1 && cherche.lignes[0] === attendus[0].cip
      && contient(cherche.valorisation, attendus[0].stock * attendus[0].pa), JSON.stringify(cherche));

    await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('depotextension')[0];
      e.down('#recherche').setValue('');
      const btn = e.down('#rechercher');
      btn.fireEvent('click', btn);
    });
    await p.waitForTimeout(4000);

    /* 7. l edition PDF, servie en flux */
    const pdf = await recupererPdf(p, '../api/v1/depot-extension/stock/pdf?depotId=' + encodeURIComponent(DEPOT)
      + '&query=&familleId=&familleLibelle=&enStock=true');
    ok('L édition PDF est servie en flux dans l onglet',
      pdf.statut === 200 && /application\/pdf/.test(pdf.type) && /inline/.test(pdf.disposition),
      JSON.stringify({ statut: pdf.statut, type: pdf.type, disposition: pdf.disposition }));
    ok('Le document est un vrai PDF', Buffer.from(pdf.octets).slice(0, 5).toString() === '%PDF-');
    const texte = texteDuPdf(pdf.octets);
    ok('Le PDF nomme le dépôt et rappelle les critères',
      /STOCK DU DEPOT - DEPOT E2E NORD/.test(texte) && /D.p.t : DEPOT E2E NORD/.test(texte)
      && /d.tenus seulement/.test(texte), texte.slice(0, 260));
    ok('Le PDF porte les colonnes de stock et de valorisation',
      /Stock/.test(texte) && /Val\. achat/.test(texte) && /Val\. vente/.test(texte)
      && /TOTAL : 3 article/.test(texte), texte.slice(0, 300));

    /* 8. l export Excel */
    const excel = await p.evaluate(async (d) => {
      const r = await fetch('../api/v1/depot-extension/stock/excel?depotId=' + encodeURIComponent(d)
        + '&query=&familleId=&enStock=true');
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
