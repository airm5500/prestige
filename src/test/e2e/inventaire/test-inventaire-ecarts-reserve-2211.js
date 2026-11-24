/* PLAN DU 21/11, POINT 12 : LISTE DES ECARTS D'INVENTAIRE AVEC LE STOCK RESERVE (LU AU MOMENT DE L'IMPRESSION).
 *
 * Fiche d'inventaire (menu Inventaire, icone « Editer ») : a cote de « Afficher stock », un bouton « Afficher réserve ».
 *  - « Afficher réserve : NON » : « Imprimer liste des écarts » ouvre l'edition d'avant (ws_generate_pdf.jsp), inchangee ;
 *  - « Afficher réserve : OUI » : la liste des ecarts vient de l'API REST (inventaire/ecarts/pdf), avec la colonne
 *    « Stock réserve » lue au moment de l'impression.
 * Jeu d'essai : un inventaire en cours (E2E-IER, type emplacement) de 7 lignes, emplacement 1 :
 *  - 5 lignes avec ecart (-3, +2, -1, +5 et -7 sur un produit vendu cher), dont 2 produits geres en reserve (12 et 7) ;
 *  - 2 lignes sans ecart (jamais imprimees).
 * Controles :
 *  - rapprochement PDF = base, ligne par ligne : stock machine, compte, ecart = compte - machine, reserve = stock reserve
 *    en base, ecart x prix de vente, ecart x prix d'achat ; total par emplacement et total general = sommes en base ;
 *  - « au moment de l'impression » : la reserve change en base entre deux impressions, le second PDF montre la nouvelle ;
 *  - « Afficher stock : NON » : colonne stock machine retiree, memes lignes ;
 *  - filtre « manquant » de l'ecran : seules les lignes a ecart negatif ;
 *  - delai : clic -> PDF en moins de 15 s ; inventaire reel le plus charge en ecarts : nombre de lignes du PDF = base ;
 *  - bilan : aucun stock, aucune reserve, aucune ligne d'inventaire modifies par l'impression ;
 *  - 1366x768 et 1280x720 : les deux boutons entiers dans la barre.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const V = require('../outils/vues');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '--raw'], { input: s, encoding: 'utf8' }).replace(/\r/g, '').trim();
const ID = 'E2E-IER', MARQUE = 'E2E-IER-';
const TMP = process.env.TEMP || '.';
const nombre = (v) => { const s = String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); return (v < 0 ? '-' : '') + s; };
/* produits : stock emplacement 1, CIP numerique, emplacement (zone) renseigne, non geres en reserve, prix > 0 */
const PRODUITS = q(`SELECT f.lg_FAMILLE_ID, f.int_CIP, s.int_NUMBER_AVAILABLE, s.lg_FAMILLE_STOCK_ID, f.int_PRICE, f.int_PAF, z.str_LIBELLEE, COALESCE(f.bool_RESERVE, 0)
  FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' JOIN t_zone_geographique z ON z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID
  WHERE f.str_STATUT = 'enable' AND f.int_CIP REGEXP '^[0-9]{7,}$' AND f.int_PRICE > 0 AND f.int_PAF > 0 AND s.int_NUMBER_AVAILABLE BETWEEN 10 AND 300
  AND COALESCE(f.bool_RESERVE, 0) = 0 AND NOT EXISTS (SELECT 1 FROM t_type_stock_famille t WHERE t.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND t.lg_TYPE_STOCK_ID = '2')
  ORDER BY f.int_PRICE DESC LIMIT 7`).split('\n').filter(Boolean).map((l) => l.split('\t'));
const ECARTS = [-7, -3, 2, -1, 5, 0, 0];
const RESERVES = [12, 7, 0, 0, 0, 0, 0];
const nettoyer = () => q(`DELETE FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID = '${ID}'; DELETE FROM t_inventaire WHERE lg_INVENTAIRE_ID = '${ID}';`
  + ` DELETE FROM t_type_stock_famille WHERE lg_TYPE_STOCK_FAMILLE_ID LIKE '${MARQUE}%';`
  + PRODUITS.map((x) => ` UPDATE t_famille SET bool_RESERVE = ${x[7]} WHERE lg_FAMILLE_ID = '${x[0]}';`).join(''));
const traces = () => q(`SELECT MD5(CONCAT(
  (SELECT IFNULL(GROUP_CONCAT(CONCAT(lg_FAMILLE_STOCK_ID, ':', int_NUMBER_AVAILABLE, ':', int_NUMBER) ORDER BY 1), '') FROM t_famille_stock WHERE lg_FAMILLE_STOCK_ID IN ('${PRODUITS.map((x) => x[3]).join("','")}')),
  (SELECT IFNULL(GROUP_CONCAT(CONCAT(lg_TYPE_STOCK_FAMILLE_ID, ':', int_NUMBER) ORDER BY 1), '') FROM t_type_stock_famille WHERE lg_FAMILLE_ID IN ('${PRODUITS.map((x) => x[0]).join("','")}')),
  (SELECT IFNULL(GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, ':', int_NUMBER, ':', int_NUMBER_INIT, ':', IFNULL(dt_UPDATED, '')) ORDER BY 1), '') FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID = '${ID}')))`);
/* ligne attendue, lue en base au moment du controle */
const attendu = (filtre, avecStock) => q(`SELECT f.int_CIP, i.int_NUMBER_INIT, i.int_NUMBER, f.int_PRICE, f.int_PAF,
  (SELECT COALESCE(SUM(t.int_NUMBER), 0) FROM t_type_stock_famille t WHERE t.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND t.lg_EMPLACEMENT_ID = '1' AND t.lg_TYPE_STOCK_ID = '2' AND t.str_STATUT = 'enable')
  FROM t_inventaire_famille i JOIN t_famille f ON f.lg_FAMILLE_ID = i.lg_FAMILLE_ID WHERE i.lg_INVENTAIRE_ID = '${ID}' AND i.bool_INVENTAIRE = 1 AND i.int_NUMBER <> i.int_NUMBER_INIT`)
  .split('\n').filter(Boolean).map((l) => l.split('\t').map((x, k) => (k ? Number(x) : x))).filter(([, m, c]) => (filtre === 'manquant' ? c - m < 0 : true))
  .map(([cip, m, c, pv, pa, r]) => ({ cip, m, c, e: c - m, r, pv, pa,
    queue: [avecStock ? m : null, c, c - m, r, nombre(pv * (c - m)), nombre(pa * (c - m))].filter((x) => x !== null).join(' ') }));

(async () => {
  let b = null;
  const err = [];
  try {
    ok('Jeu d\'essai : 7 produits à emplacement, prix renseignés, non gérés en réserve', PRODUITS.length === 7, PRODUITS.length);
    nettoyer();
    q(`INSERT INTO t_inventaire (lg_INVENTAIRE_ID, str_NAME, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED, dt_UPDATED, lg_USER_ID, lg_EMPLACEMENT_ID)
      SELECT '${ID}', 'E2E écarts réserve', 'E2E écarts réserve', 'emplacement', 'enable', NOW(), NOW(), lg_USER_ID, '1' FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN}';`
      + PRODUITS.map((x, i) => `INSERT INTO t_inventaire_famille (lg_INVENTAIRE_ID, lg_FAMILLE_ID, int_NUMBER, int_NUMBER_INIT, str_STATUT, dt_CREATED, dt_UPDATED, bool_INVENTAIRE, str_UPDATED_ID, lg_FAMILLE_STOCK_ID)
      VALUES ('${ID}', '${x[0]}', ${Number(x[2]) + ECARTS[i]}, ${x[2]}, 'enable', NOW(), NOW(), 1, '', '${x[3]}');`).join('')
      + PRODUITS.slice(0, 2).map((x, i) => `UPDATE t_famille SET bool_RESERVE = 1 WHERE lg_FAMILLE_ID = '${x[0]}';
      INSERT INTO t_type_stock_famille (lg_TYPE_STOCK_FAMILLE_ID, lg_FAMILLE_ID, lg_TYPE_STOCK_ID, lg_EMPLACEMENT_ID, str_NAME, str_DESCRIPTION, dt_CREATED, dt_UPDATED, str_STATUT, int_NUMBER)
      VALUES ('${MARQUE}T${i}', '${x[0]}', '2', '1', 'E2E', 'E2E', NOW(), NOW(), 'enable', ${RESERVES[i]});`).join(''));
    const avant = traces();
    b = await ENV_E2E.lancer(chromium);
    const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => err.push(e.message));
    await V.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const menu = await p.evaluate(() => { const r = Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().findChild('id', 'inventaire', true); return r ? [r.parentNode.get('text'), r.get('text')] : null; });
    await V.ouvrirMenu(p, menu[0], menu[1]);
    await p.waitForFunction((id) => { const g = Ext.ComponentQuery.query('inventaire')[0]; return g && !g.getStore().isLoading() && g.getStore().findExact('lg_INVENTAIRE_ID', id) >= 0; }, ID, { timeout: 60000 });
    const edit = await p.evaluate((id) => { const g = Ext.ComponentQuery.query('inventaire')[0];
      const col = g.headerCt.getGridColumns().find((c) => Array.isArray(c.items) && c.items.some((x) => x.handler === g.onEditClick));
      const n = g.getView().getNode(g.getStore().findExact('lg_INVENTAIRE_ID', id)); const td = n && col && n.querySelector('.x-grid-cell-' + col.getId());
      const i = td && (td.querySelector('.x-action-col-icon') || td.querySelector('img')); if (!i) { return null; } i.id = i.id || 'e2e-edit-inv'; return '#' + i.id; }, ID);
    await p.click(edit);
    await p.waitForFunction(() => { const g = Ext.getCmp('gridpanelInventaireID'); return g && g.isVisible(true) && !g.getStore().isLoading(); }, null, { timeout: 60000 });
    await p.waitForTimeout(800);

    /* ----- les deux boutons de la barre, a deux tailles d'ecran ----- */
    for (const [l, h] of [[1366, 768], [1280, 720]]) {
      await p.setViewportSize({ width: l, height: h }); await p.waitForTimeout(800);
      const bt = await p.evaluate(() => { const r = (id) => { const c = Ext.getCmp(id); if (!c || !c.isVisible(true)) { return null; } const e = c.getEl().dom.getBoundingClientRect(); return { g: Math.round(e.left), d: Math.round(e.right) }; };
        const g = Ext.getCmp('gridpanelInventaireID').getEl().dom.getBoundingClientRect(); return { stock: r('chk_show_stock_print'), reserve: r('chk_show_reserve_print'), texte: Ext.getCmp('chk_show_reserve_print') && Ext.getCmp('chk_show_reserve_print').getEl().dom.textContent, grille: Math.round(g.right) }; });
      ok(`${l}×${h} : « Afficher stock » et « Afficher réserve : NON » entiers dans la barre de la fiche`, !!bt.stock && !!bt.reserve && bt.reserve.g >= bt.stock.d && bt.reserve.d <= bt.grille && /Afficher réserve : NON/.test(bt.texte), JSON.stringify(bt));
    }
    await p.setViewportSize({ width: 1366, height: 768 }); await p.waitForTimeout(600);

    const imprimer = async () => {
      const debut = Date.now();
      const [rep, page] = await Promise.all([
        ctx.waitForEvent('response', { predicate: (r) => /ecarts\/pdf|ws_generate_pdf/.test(r.url()), timeout: 60000 }).catch(() => null),
        ctx.waitForEvent('page', { timeout: 60000 }).catch(() => null), V.cliquer(p, '#btn_print_ecart')]);
      const url = rep ? rep.url() : (page ? page.url() : '');
      const delai = Date.now() - debut;
      /* le visualiseur PDF de l'onglet garde le corps : meme lien, relu avec la session de l'ecran */
      let corps = null;
      if (rep && /ecarts\/pdf/.test(url)) { corps = await rep.body().catch(() => null); if (!corps || corps.slice(0, 4).toString() !== '%PDF') { corps = await (await ctx.request.get(url)).body(); } }
      if (page) { await page.close().catch(() => {}); }
      let texte = '';
      if (corps) { const f = path.join(TMP, 'e2e-ecarts-reserve.pdf'); fs.writeFileSync(f, corps); texte = execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' '); }
      return { url, texte, delai, pdf: !!corps && corps.slice(0, 4).toString() === '%PDF' };
    };
    const lignesKo = (texte, lignes) => lignes.filter((l) => { const i = texte.indexOf(' ' + l.cip + ' '); if (i < 0) { return true; } const fin = texte.indexOf(' Total ', i); return texte.slice(i, fin > 0 ? fin : undefined).indexOf(l.queue) < 0; });

    /* ----- reserve NON : edition d'avant ----- */
    const stockAvant = await p.evaluate(() => Ext.getCmp('chk_show_stock_print').getValue());
    if (!stockAvant) { await V.cliquer(p, '#chk_show_stock_print'); await p.waitForTimeout(300); }
    const i0 = await imprimer();
    ok('« Afficher réserve : NON » : « Imprimer liste des écarts » ouvre l\'édition d\'avant (inchangée)', /ws_generate_pdf\.jsp\?.*str_NAME_FILE=ecart/.test(i0.url) && !/ecarts\/pdf/.test(i0.url), i0.url);

    /* ----- reserve OUI, stock OUI ----- */
    await V.cliquer(p, '#chk_show_reserve_print'); await p.waitForTimeout(300);
    ok('Le bouton passe à « Afficher réserve : OUI »', /Afficher réserve : OUI/.test(await p.evaluate(() => Ext.getCmp('chk_show_reserve_print').getEl().dom.textContent)));
    const i1 = await imprimer();
    const l1 = attendu('', true);
    ok('« Afficher réserve : OUI » : PDF servi par l\'API REST (inventaire/ecarts/pdf), en moins de 15 s', i1.pdf && /api\/v1\/inventaire\/ecarts\/pdf\?.*showReserve=true/.test(i1.url) && i1.delai < 15000, i1.url + ' ' + i1.delai + ' ms');
    ok('PDF : colonnes Stock machine, Stock compté, Écart, Stock réserve et valeurs de l\'écart ; sous-titre « stock réserve au … »', /Stock machine/.test(i1.texte) && /Stock compté/.test(i1.texte) && /Stock réserve/.test(i1.texte)
      && /prix vente/.test(i1.texte) && /stock réserve au \d\d\/\d\d\/\d{4}/.test(i1.texte), i1.texte.slice(0, 400));
    const sansEcart = PRODUITS.filter((x, i) => ECARTS[i] === 0).map((x) => x[1]).filter((c) => i1.texte.indexOf(' ' + c + ' ') >= 0);
    ok('PDF = base : les 5 lignes à écart, aucune ligne sans écart', l1.length === 5 && sansEcart.length === 0, JSON.stringify({ n: l1.length, sansEcart }));
    const ko1 = lignesKo(i1.texte, l1);
    ok('PDF = base, ligne par ligne : stock machine, compté, écart (= compté − machine), réserve (12 et 7 en base), écart × prix vente, écart × prix achat', ko1.length === 0
      && l1.some((l) => l.r === 12) && l1.some((l) => l.r === 7), JSON.stringify(ko1.map((l) => l.cip + ' attendu « ' + l.queue + ' »')));
    const tot = l1.reduce((t, l) => ({ n: t.n + 1, e: t.e + l.e, cv: t.cv + l.pv * l.c, ca: t.ca + l.pa * l.c, ev: t.ev + l.pv * l.e, ea: t.ea + l.pa * l.e }), { n: 0, e: 0, cv: 0, ca: 0, ev: 0, ea: 0 });
    const ligneTotal = [tot.n, tot.e, nombre(tot.cv), nombre(tot.ca), nombre(tot.ev), nombre(tot.ea)].join(' ');
    ok('Total général = sommes en base (produits, écart, valeur comptée et valeur de l\'écart aux deux prix)', i1.texte.indexOf('Total général') >= 0 && i1.texte.slice(i1.texte.lastIndexOf('Produits Écart Valeur comptée')).indexOf('Écart × prix achat ' + ligneTotal + ' ') >= 0, ligneTotal);
    const zones = {};
    l1.forEach((l) => { const z = PRODUITS.find((x) => x[1] === l.cip)[6]; zones[z] = (zones[z] || 0) + l.e; });
    const zonesKo = Object.entries(zones).filter(([z, e]) => !new RegExp('Total ' + z.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\(\\d+ produits?\\)( \\S+)*? ' + e + ' ').test(i1.texte));
    ok('Total de chaque emplacement = somme de ses écarts en base', zonesKo.length === 0, JSON.stringify({ zones, zonesKo }));

    /* ----- au moment de l'impression : la reserve change en base ----- */
    q(`UPDATE t_type_stock_famille SET int_NUMBER = 20 WHERE lg_TYPE_STOCK_FAMILLE_ID = '${MARQUE}T0'`);
    const i2 = await imprimer();
    const l2 = attendu('', true), ko2 = lignesKo(i2.texte, l2);
    ok('Au moment de l\'impression : réserve passée de 12 à 20 en base, le second PDF montre 20', ko2.length === 0 && l2.some((l) => l.r === 20) && !l2.some((l) => l.r === 12), JSON.stringify(ko2.map((l) => l.cip)));
    q(`UPDATE t_type_stock_famille SET int_NUMBER = 12 WHERE lg_TYPE_STOCK_FAMILLE_ID = '${MARQUE}T0'`);

    /* ----- stock NON ----- */
    await V.cliquer(p, '#chk_show_stock_print'); await p.waitForTimeout(300);
    const i3 = await imprimer();
    const l3 = attendu('', false), ko3 = lignesKo(i3.texte, l3);
    ok('« Afficher stock : NON » : colonne stock machine retirée, mêmes lignes, réserve gardée', !/Stock machine/.test(i3.texte) && /Stock réserve/.test(i3.texte) && ko3.length === 0, JSON.stringify(ko3.map((l) => l.cip + ' « ' + l.queue + ' »')));
    await V.cliquer(p, '#chk_show_stock_print'); await p.waitForTimeout(300);

    /* ----- filtre « manquant » de l'ecran ----- */
    const valeurs = await p.evaluate(() => Ext.getCmp('str_TYPE').getStore().collect('str_desc'));
    if (valeurs.includes('Articles manquants')) {
      await V.choisir(p, '#str_TYPE', 'Articles manquants'); await p.waitForTimeout(1200);
      const i4 = await imprimer();
      const l4 = attendu('manquant', true), ko4 = lignesKo(i4.texte, l4);
      const surplus = l1.filter((l) => l.e > 0).map((l) => l.cip).filter((c) => i4.texte.indexOf(' ' + c + ' ') >= 0);
      ok('Filtre « manquant » : seules les 3 lignes à écart négatif, en ligne avec la base', l4.length === 3 && ko4.length === 0 && surplus.length === 0 && /Manquants/.test(i4.texte), JSON.stringify({ ko4: ko4.map((l) => l.cip), surplus }));
      await V.choisir(p, '#str_TYPE', 'Tous'); await p.waitForTimeout(800);
    } else {
      ok('Filtre « manquant » proposé par l\'écran', false, valeurs.join(','));
    }

    /* ----- inventaire reel le plus charge en ecarts : nombre de lignes et delai ----- */
    const reel = q(`SELECT i.lg_INVENTAIRE_ID, COUNT(*) FROM t_inventaire i JOIN t_inventaire_famille f ON f.lg_INVENTAIRE_ID = i.lg_INVENTAIRE_ID
      WHERE f.bool_INVENTAIRE = 1 AND f.int_NUMBER <> f.int_NUMBER_INIT AND i.lg_INVENTAIRE_ID <> '${ID}' GROUP BY i.lg_INVENTAIRE_ID ORDER BY 2 DESC LIMIT 1`).split('\t');
    const mesure = await p.evaluate(async (id) => { const t = performance.now(); const r = await fetch('../api/v1/inventaire/ecarts/pdf?lg_INVENTAIRE_ID=' + encodeURIComponent(id) + '&showStock=true&showReserve=true');
      const bytes = new Uint8Array(await r.arrayBuffer()); let s = ''; for (let i = 0; i < bytes.length; i += 8192) { s += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192)); }
      return { http: r.status, ms: Math.round(performance.now() - t), b64: btoa(s) }; }, reel[0]);
    const fr = path.join(TMP, 'e2e-ecarts-reel.pdf'); fs.writeFileSync(fr, Buffer.from(mesure.b64, 'base64'));
    const tr = execFileSync('pdftotext', ['-raw', fr, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ');
    const nPdf = Number((tr.slice(tr.lastIndexOf('Produits Écart Valeur comptée')).match(/Écart × prix achat (\d+) /) || [])[1]);
    ok(`Inventaire réel le plus chargé (${reel[1]} écarts en base) : PDF en moins de 15 s, nombre de produits du total = base`, mesure.http === 200 && mesure.ms < 15000 && nPdf === Number(reel[1]), JSON.stringify({ ms: mesure.ms, nPdf, base: reel[1] }));

    ok('Bilan : aucun stock, aucune réserve, aucune ligne d\'inventaire modifiés par les impressions', traces() === avant);
    const sansSession = await (await b.newContext()).request.get((process.env.BASE || 'http://localhost:8080/prestige') + '/api/v1/inventaire/ecarts/pdf?lg_INVENTAIRE_ID=' + ID);
    ok('Sans session : refusé (401), aucun PDF', sansSession.status() === 401, sansSession.status());
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    if (b) { await b.close(); }
    nettoyer();
    ok('Jeu d\'essai retiré, indicateurs de réserve remis', q(`SELECT COUNT(*) FROM t_inventaire WHERE lg_INVENTAIRE_ID = '${ID}'`) === '0' && q(`SELECT COUNT(*) FROM t_type_stock_famille WHERE lg_TYPE_STOCK_FAMILLE_ID LIKE '${MARQUE}%'`) === '0'
      && PRODUITS.every((x) => q(`SELECT COALESCE(bool_RESERVE, 0) FROM t_famille WHERE lg_FAMILLE_ID = '${x[0]}'`) === x[7]));
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
