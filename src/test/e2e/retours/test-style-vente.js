/* STYLE DU MENU VENTE sur les anciens ecrans (demande de l'officine du 30/09) : lot 1 (preventes, devis), puis les lots\n * suivants compares avant / apres habillage.
 *
 * L'habillage (correctifs-affichage.js, habillerStyleVente) ne doit toucher qu'a la presentation. Le test pose une
 * proforma et une prevente de test, ouvre chaque ecran par son menu et verifie : fond et barre du theme, pagination
 * numerotee, icones au trait, et surtout qu'un clic sur chaque icone emet TOUJOURS le meme evenement vers le
 * controleur (capture sans executer l'action). Jeu d'essai retire a la fin.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, process.env.E2E_DETAIL ? 20000 : 500) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const crees = [];
let ordoVente = null;

/* Ecrans du lot : xtype, evenements attendus des icones de la ligne de test (dans l'ordre des colonnes). */
const ECRANS = [
  { xtype: 'preenregistrementmanager', evenements: ['toEdit', 'toPrint', 'toRemove'], ligne: 'prevente' },
  { xtype: 'devismanager', evenements: ['toTransform', 'toClone', 'toEdit', 'toRemove', 'toPrintTicket', 'toPdf', 'toBonPdf', 'toExportCsv', 'toExportWord', 'toExportExcel', 'toInventaireFromOneDevis'], ligne: 'devis' }
];

(async () => {
  const produit = q("SELECT CONCAT_WS('|', f.lg_FAMILLE_ID, f.int_PRICE) FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID=f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID='1'"
    + " WHERE s.int_NUMBER_AVAILABLE>10 AND f.int_PRICE>0 AND f.str_STATUT='enable' ORDER BY f.str_NAME LIMIT 1").split('|');
  const user = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='admin'");
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } });
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(2000);
    const poster = (url, corps) => p.evaluate(async (a) => JSON.parse(await (await fetch(a.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(a.corps) })).text()), { url, corps });
    const base = { typeVenteId: '1', natureVenteId: '1', produitId: produit[0], itemPu: Number(produit[1]), qte: 1, qteServie: 1, remiseId: '', venteId: null, userVendeurId: user };
    const devis = (await poster('../api/v1/vente/devis', Object.assign({}, base, { devis: true, prevente: false }))).data.lgPREENREGISTREMENTID; crees.push(devis);
    const prevente = (await poster('../api/v1/vente/add/vno', Object.assign({}, base, { devis: false, prevente: true }))).data.lgPREENREGISTREMENTID; crees.push(prevente);
    const refs = { devis: q("SELECT str_REF FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID='" + devis + "'"), prevente: q("SELECT str_REF FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID='" + prevente + "'") };
    ok('Jeu d\'essai : une proforma et une prévente', !!refs.devis && !!refs.prevente, JSON.stringify(refs));

    for (const e of ECRANS) {
      await p.evaluate((x) => { testextjs.app.getController('App').onLoadNewComponent(x, x, ''); }, e.xtype);
      await p.waitForFunction((x) => { const c = Ext.ComponentQuery.query(x)[0]; return c && c.down('gridpanel') && c.down('gridpanel').rendered; }, e.xtype, { timeout: 30000 });
      await p.waitForTimeout(1500);
      /* la ligne de test, cherchee par sa reference comme l'utilisateur */
      await p.evaluate((a) => { const c = Ext.ComponentQuery.query(a.x)[0]; c.down('#query').setValue(a.ref); const s = c.down('#statut'); if (s) { s.setValue('ALL'); } const bt = c.down('#rechercher'); bt.fireEvent('click', bt); }, { x: e.xtype, ref: refs[e.ligne] });
      await p.waitForFunction((a) => { const g = Ext.ComponentQuery.query(a.x + ' gridpanel')[0]; return !g.getStore().isLoading() && g.getStore().findExact('strREF', a.ref) >= 0; }, { x: e.xtype, ref: refs[e.ligne] }, { timeout: 20000 });
      await p.waitForTimeout(500);
      const d = await p.evaluate((a) => { const c = Ext.ComponentQuery.query(a.x)[0]; const g = c.down('gridpanel'); const n = g.getView().getNode(g.getStore().findExact('strREF', a.ref));
        const barres = c.query('toolbar').filter((t) => t.hasCls('mv-barre'));
        return { theme: c.hasCls('theme-liste'), barre: barres.length, grille: g.hasCls('theme-grille'), pages: !!c.down('#pagesNumerotees'),
          icones: [...n.querySelectorAll('.act-ico')].filter((i) => i.offsetParent !== null).length, images: [...n.querySelectorAll('img.x-action-col-icon')].filter((i) => i.offsetParent !== null && !i.classList.contains('act-ico')).length,
          deborde: barres.filter((t) => t.rendered && t.isVisible(true)).some((t) => [...t.getEl().dom.querySelectorAll('.x-btn, .x-form-text')].some((x) => x.getBoundingClientRect().right > t.getEl().getRight() + 1)) }; }, { x: e.xtype, ref: refs[e.ligne] });
      ok(e.xtype + ' : fond et barre du thème, tableau, pagination numérotée, sans débordement', d.theme && d.barre >= 1 && d.grille && d.pages && !d.deborde, JSON.stringify(d));
      ok(e.xtype + ' : toutes les icônes de la ligne au trait (' + e.evenements.length + ')', d.icones === e.evenements.length && d.images === 0, JSON.stringify(d));
      /* chaque icone : l'evenement emis est capture (et annule) pour verifier le branchement sans executer l'action */
      const emis = await p.evaluate(async (a) => { const c = Ext.ComponentQuery.query(a.x)[0]; const g = c.down('gridpanel'); const vus = [];
        g.query('actioncolumn').forEach((col) => Ext.util.Observable.capture(col, (nom) => { if (/^to/.test(nom)) { vus.push(nom); return false; } return true; }));
        const n = g.getView().getNode(g.getStore().findExact('strREF', a.ref));
        for (const i of [...n.querySelectorAll('.act-ico')].filter((x) => x.offsetParent !== null)) { i.dispatchEvent(new MouseEvent('click', { bubbles: true })); await new Promise((r) => setTimeout(r, 50)); }
        g.query('actioncolumn').forEach((col) => Ext.util.Observable.releaseCapture(col));
        return vus; }, { x: e.xtype, ref: refs[e.ligne] });
      ok(e.xtype + ' : chaque icône émet le même événement qu\'avant vers le contrôleur', JSON.stringify(emis) === JSON.stringify(e.evenements), emis.join(','));
      await p.screenshot({ path: '/home/user/prestige/captures/style-' + e.xtype + '.png' });
    }

    /* Lots suivants : sur des donnees existantes, comparaison AVANT / APRES habillage. L'ecran est ouvert une fois sans
       habillage (liste videe le temps de l'ouverture), puis une fois habille ; sur la meme ligne, chaque icone doit
       emettre le meme evenement (capture et annule : aucune action n'est executee). */
    const COMPARES = ['ventemanager', 'venteannuler', 'suppressionsvente', 'ordonnancier',
      'pososmanager', 'articlevendurecapitulatif', 'gestcaissemanager', 'mvtcaissemanager',
      'facturesubrogatoireother', 'ventesrateesmanager', 'mouvementprixvente']
      .filter((x) => !process.env.E2E_ECRANS || process.env.E2E_ECRANS.split(',').indexOf(x) >= 0);
    /* Posos s'ouvre vide (une analyse se lance a la demande) : pas de ligne a comparer, seul l'habillage est verifie. */
    const SANS_LIGNES = ['pososmanager', 'facturesubrogatoireother'];
    /* Ventes ratees : registre vide sur le banc, une ligne de test est posee (retiree en fin de test). */
    exec("INSERT INTO t_vente_ratee (lg_VENTE_RATEE_ID, str_DESIGNATION, str_DESIGNATION_NORM, int_QUANTITE, str_MOTIF, dt_CREATED, str_STATUT)"
      + " VALUES ('e2e-style-vr', 'ZZ PRODUIT STYLE E2E', 'zz produit style e2e', 1, 'Rupture', NOW(), 'enable')");
    /* Mouvements de caisse : le journal liste les entrees / sorties / reglements tiers payant (3, 4, 5) ; le banc n'a que
       des fonds de caisse (1). Une entree de caisse de test (1 F, aujourd'hui) est posee, retiree en fin de test. */
    exec("CREATE TEMPORARY TABLE tmp_mc SELECT * FROM t_mvt_caisse WHERE lg_MODE_REGLEMENT_ID IS NOT NULL AND lg_USER_ID IS NOT NULL LIMIT 1;"
      + " UPDATE tmp_mc SET lg_MVT_CAISSE_ID='e2e-style-mc', lg_TYPE_MVT_CAISSE_ID='5', int_AMOUNT=1, bool_CHECKED=1, str_STATUT='enable',"
      + " str_COMMENTAIRE='ZZ STYLE E2E', dt_CREATED=NOW(), dt_UPDATED=NOW(), dt_DATE_MVT=NOW();"
      + " INSERT INTO t_mvt_caisse SELECT * FROM tmp_mc;");
    const releve = (x, habille) => p.evaluate(async (a) => {
      /* « avant » : ni la liste historique ni le theme partout (retours du 07/10) */
      const liste = window.PrestigeAffichage.ECRANS_STYLE_VENTE, garde = liste.slice(), partout = window.PrestigeAffichage.THEME_PARTOUT;
      if (!a.habille) { liste.length = 0; window.PrestigeAffichage.THEME_PARTOUT = false; }
      try {
        Ext.ComponentQuery.query(a.x).forEach((c) => c.destroy());
        testextjs.app.getController('App').onLoadNewComponent(a.x, a.x, '');
      } finally { liste.length = 0; garde.forEach((y) => liste.push(y)); window.PrestigeAffichage.THEME_PARTOUT = partout; }
      const attendre = async (f, ms) => { const t = Date.now(); while (Date.now() - t < ms) { if (f()) { return true; } await new Promise((r) => setTimeout(r, 200)); } return false; };
      await attendre(() => { const c = Ext.ComponentQuery.query(a.x)[0]; const gg = c && (c.isXType('gridpanel') ? c : c.down('gridpanel')); return gg && gg.rendered; }, 30000);
      const c = Ext.ComponentQuery.query(a.x)[0];
      const g = c.isXType('gridpanel') ? c : c.down('gridpanel');
      /* periode large pour avoir des lignes, puis la recherche de l'ecran */
      const d = c.down('#dtStart') || c.down('datefield'); if (d) { d.setValue(new Date(2020, 0, 1)); }
      const bt = c.down('#rechercher') || c.query('button').find((b) => /recherch/i.test(b.text || ''));
      if (bt) { if (bt.handler) { Ext.callback(bt.handler, bt.scope || bt, [bt]); } else { bt.fireEvent('click', bt); } } else { g.getStore().load(); }
      await attendre(() => !g.getStore().isLoading() && g.getStore().getCount() > 0, a.x === 'pososmanager' ? 2000 : 90000);
      await new Promise((r) => setTimeout(r, 800));
      const n = g.getView().getNode(0);
      const barres = c.query('toolbar').filter((t) => t.hasCls('mv-barre'));
      const sortie = { lignes: g.getStore().getCount(), theme: c.hasCls('theme-liste'), barres: barres.length, pages: !!c.down('#pagesNumerotees'),
        /* une icone masquee (x-hide-display) peut garder sa place, invisible (vente-theme.css, retours du 08/10) : non comptee */
        images: n ? [...n.querySelectorAll('img.x-action-col-icon')].filter((i) => i.offsetParent !== null && !i.classList.contains('x-hide-display') && getComputedStyle(i).visibility !== 'hidden' && !i.classList.contains('act-ico')).length : -1,
        traits: n ? [...n.querySelectorAll('.act-ico')].filter((i) => i.offsetParent !== null && !i.classList.contains('x-hide-display') && getComputedStyle(i).visibility !== 'hidden').length : -1,
        deborde: barres.filter((t) => t.rendered && t.isVisible(true)).some((t) => [...t.getEl().dom.querySelectorAll('.x-btn, .x-form-text')].some((x) => x.getBoundingClientRect().right > t.getEl().getRight() + 1)),
        barresPages: c.query('pagingtoolbar').length, icones: [],
        /* configuration des icones, meme sans ligne : info-bulle, fonction, masquage conditionnel ; et dessin au trait */
        config: g.query('actioncolumn').map((col) => (col.items || []).map((it) => (it.tooltip || '') + ' | ' + (it.handler ? String(it.handler).replace(/\s+/g, ' ').slice(0, 160) : '') + ' | ' + (it.getClass ? 'getClass' : '')).join(' / ')),
        nonTrait: [].concat(...g.query('actioncolumn').map((col) => (col.items || []).filter((it) => (it.icon || it.iconCls) && !/act-ico/.test(String(it.iconCls || '')) && !(it.getClass && /trait/.test(String(it.getClass)))).map((it) => (it.tooltip || '') + ' ' + (it.icon || it.iconCls)))),
        itemIds: c.query('[itemId]').map((x) => x.itemId).filter((i) => !/^pagesNumerotees$/.test(i)).sort().join(','), evenements: [] };
      if (n) {
        /* Chaque icone visible de la ligne : son info-bulle et sa fonction (signature du code), puis, si elle passe par un
           evenement (fireEvent, ou clic de colonne sans fonction propre), l'evenement emis, capture et annule. Une icone
           qui appelle directement son action (reimpression...) n'est PAS cliquee : sa fonction identique suffit. */
        g.query('actioncolumn').forEach((col) => Ext.util.Observable.capture(col, (nom, v, ri, ci, item) => { sortie.evenements.push(nom + (item && item.action ? ':' + item.action : '')); return false; }));
        for (const col of g.query('actioncolumn')) {
          /* liste groupee (factures) : la ligne porte aussi une cellule vide d'en-tete de groupe ; on prend celle des icones */
          const cell = [...n.querySelectorAll('.x-grid-cell-' + col.getItemId())].find((td) => td.querySelector('.x-action-col-icon'));
          for (let i = 0; cell && i < (col.items || []).length; i++) {
            const el = cell.querySelector('.x-action-col-' + i);
            if (!el || el.offsetParent === null || el.classList.contains('x-hide-display')) { continue; }
            const item = col.items[i];
            const code = item.handler ? String(item.handler).replace(/\s+/g, ' ') : '';
            sortie.icones.push((item.tooltip || item.altText || '') + ' | ' + code.slice(0, 160));
            if (!item.handler || /this\.fireEvent/.test(code)) { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); await new Promise((r) => setTimeout(r, 50)); }
          }
        }
        g.query('actioncolumn').forEach((col) => Ext.util.Observable.releaseCapture(col));
      }
      return sortie;
    }, { x, habille });
    /* L'ordonnancier ne liste que des ventes cloturees avec prescripteur : le banc n'en a pas. Un prescripteur de test
       est pose le temps du test sur une vente cloturee, puis retire (finally). */
    exec("INSERT INTO medecin (id, num_ordre, nom, created_at) VALUES ('e2e-style-medecin', 'E2E-STYLE-0001', 'ZZ DR STYLE E2E', NOW())");
    ordoVente = q("SELECT lg_PREENREGISTREMENT_ID FROM t_preenregistrement WHERE str_STATUT='is_Closed' AND b_IS_CANCEL=0 AND medecin_id IS NULL ORDER BY dt_UPDATED DESC LIMIT 1");
    exec("UPDATE t_preenregistrement SET medecin_id='e2e-style-medecin' WHERE lg_PREENREGISTREMENT_ID='" + ordoVente + "'");
    for (const x of COMPARES) {
      const avant = await releve(x, false);
      const apres = await releve(x, true);
      if (process.env.E2E_DETAIL) { console.log('   DETAIL ' + x + ' ' + JSON.stringify({ avant: { images: avant.images, traits: avant.traits, lignes: avant.lignes, icones: avant.icones }, apres: { images: apres.images, traits: apres.traits, lignes: apres.lignes, icones: apres.icones } })); }
      await p.screenshot({ path: '/home/user/prestige/captures/style-' + x + '.png' });
      ok(x + ' : habillé (fond, barres, tableau, pagination numérotée), sans débordement', !avant.theme && apres.theme && apres.barres >= 1 && (apres.pages || apres.barresPages === 0) && !apres.deborde, JSON.stringify({ avant: [avant.theme, avant.barres], apres }));
      ok(x + ' : configuration des icônes identique (fonctions, info-bulles), toutes au trait', JSON.stringify(apres.config) === JSON.stringify(avant.config) && apres.nonTrait.length === 0, 'non au trait : ' + JSON.stringify(apres.nonTrait) + ' ; ' + JSON.stringify(avant.config).slice(0, 200));
      ok(x + ' : icônes au trait, autant qu\'avant', (apres.lignes > 0 ? apres.images === 0 && apres.traits === avant.images : SANS_LIGNES.indexOf(x) >= 0), 'avant ' + avant.images + ' images, après ' + apres.traits + ' traits, ' + apres.images + ' images, lignes ' + apres.lignes);
      ok(x + ' : chaque icône garde sa fonction et son info-bulle, et émet le même événement qu\'avant', JSON.stringify(apres.icones) === JSON.stringify(avant.icones) && (avant.icones.length === avant.images || (avant.images === -1 && avant.icones.length === 0))
        && JSON.stringify(apres.evenements) === JSON.stringify(avant.evenements), 'icones ' + JSON.stringify(avant.icones).slice(0, 300) + ' / evenements avant ' + avant.evenements.join(',') + ' après ' + apres.evenements.join(','));
      ok(x + ' : mêmes composants nommés (itemId) qu\'avant', apres.itemIds === avant.itemIds, avant.itemIds === apres.itemIds ? '' : 'avant ' + avant.itemIds + ' / après ' + apres.itemIds);
    }
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (ex) {
    ok('Parcours sans exception', false, ex.message);
  } finally {
    await b.close();
    if (ordoVente) {
      exec("UPDATE t_preenregistrement SET medecin_id=NULL WHERE lg_PREENREGISTREMENT_ID='" + ordoVente + "' AND medecin_id='e2e-style-medecin'");
    }
    exec("DELETE FROM medecin WHERE id='e2e-style-medecin'");
    exec("DELETE FROM t_vente_ratee WHERE lg_VENTE_RATEE_ID='e2e-style-vr'");
    exec("DELETE FROM t_mvt_caisse WHERE lg_MVT_CAISSE_ID='e2e-style-mc'");
    for (const id of crees) {
      exec("DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID='" + id + "'; DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID='" + id + "';");
    }
    ok('Jeu d\'essai retiré (ventes de test, prescripteur de test)', crees.every((id) => q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID='" + id + "'") === '0')
      && q("SELECT COUNT(*) FROM medecin WHERE id='e2e-style-medecin'") === '0' && q("SELECT COUNT(*) FROM t_preenregistrement WHERE medecin_id='e2e-style-medecin'") === '0');
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
