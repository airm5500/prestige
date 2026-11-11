/* PLAN DU 08/11, POINT 17 : INVENTAIRE EN COURS, FILTRE « PRIX ACHAT > PRIX VENTE ».
 *
 * Jeu d'essai : un inventaire en cours (E2E-PVA) de 10 lignes, emplacement 1 :
 *  - 5 produits dont le prix d'achat (PAF de la fiche) depasse le prix de vente, comptes ou non, quantites variees ;
 *  - 2 produits au PAF EGAL au prix de vente (ne sortent pas : strictement superieur) ;
 *  - 3 produits ordinaires (PAF < prix de vente).
 * Par l'ecran (menu Inventaire, icone « Editer » de la fiche, choix du filtre, « Imprimer filtre courant ») :
 *  - le combo propose « Prix achat > prix vente » ;
 *  - rapprochement ecran = base : les 5 lignes, CIP par CIP, PAF et prix de vente affiches = fiche ; total = 5 ;
 *  - coherence du comptage : filtre (5) + hors filtre (5) = « Tous » (10) ;
 *  - PDF du filtre courant = les 5 lignes de l'ecran (CIP present), aucune autre ; titre « (5 articles) » ;
 *  - la fiche d'un produit corrigee (PAF ramene sous le prix de vente) : apres actualisation, la ligne sort (4) ;
 *  - aucun stock modifie par le filtre ni l'impression.
 * Jeu d'essai retire et PAF remis a la fin.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const V = require('../outils/vues');
const { fichierEdition } = require('../support/editions');
const { execFileSync } = require('child_process');
const fs = require('fs');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '--raw'], { input: s, encoding: 'utf8' }).replace(/\r/g, '').trim();
const ID = 'E2E-PVA';
const prods = (cond, n) => q(`SELECT f.lg_FAMILLE_ID, f.int_CIP, f.int_PAF, f.int_PRICE, s.int_NUMBER_AVAILABLE, s.lg_FAMILLE_STOCK_ID FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'
  WHERE f.str_STATUT = 'enable' AND ${cond} ORDER BY f.lg_FAMILLE_ID LIMIT ${n}`).split('\n').filter(Boolean).map((l) => l.split('\t'));
const SUP = prods('f.int_PAF > f.int_PRICE', 5), EGAL = prods('f.int_PAF = f.int_PRICE AND f.int_PRICE > 0', 2), NORMAUX = prods('f.int_PAF < f.int_PRICE AND f.int_PAF > 0', 3);
const TOUS = [...SUP, ...EGAL, ...NORMAUX];
const nettoyer = () => q(`DELETE FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID = '${ID}'; DELETE FROM t_inventaire WHERE lg_INVENTAIRE_ID = '${ID}';`);
const stocks = () => q(`SELECT MD5(GROUP_CONCAT(CONCAT(lg_FAMILLE_STOCK_ID, ':', int_NUMBER_AVAILABLE, ':', int_NUMBER) ORDER BY 1)) FROM t_famille_stock WHERE lg_FAMILLE_STOCK_ID IN ('${TOUS.map((x) => x[5]).join("','")}')`);
const PAF_ORIGINE = SUP[0] ? SUP[0][2] : null;

(async () => {
  let b = null;
  const err = [];
  try {
    ok('Jeu d\'essai : 5 produits PAF > prix de vente, 2 égaux, 3 ordinaires (emplacement 1)', SUP.length === 5 && EGAL.length === 2 && NORMAUX.length === 3, `${SUP.length}/${EGAL.length}/${NORMAUX.length}`);
    nettoyer();
    q(`INSERT INTO t_inventaire (lg_INVENTAIRE_ID, str_NAME, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED, dt_UPDATED, lg_USER_ID, lg_EMPLACEMENT_ID)
      SELECT '${ID}', 'E2E prix achat', 'E2E filtre prix achat > prix vente', 'emplacement', 'enable', NOW(), NOW(), lg_USER_ID, '1' FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN}';`
      + TOUS.map((x, i) => `INSERT INTO t_inventaire_famille (lg_INVENTAIRE_ID, lg_FAMILLE_ID, int_NUMBER, int_NUMBER_INIT, str_STATUT, dt_CREATED, dt_UPDATED, bool_INVENTAIRE, str_UPDATED_ID, lg_FAMILLE_STOCK_ID)
      VALUES ('${ID}', '${x[0]}', ${Number(x[4]) + (i % 3) - 1}, ${x[4]}, 'enable', NOW(), ${i % 2 ? 'NOW()' : 'NULL'}, 1, '', '${x[5]}');`).join(''));
    const stocksAvant = stocks();
    b = await ENV_E2E.lancer(chromium);
    const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
    p.on('pageerror', (e) => err.push(e.message));
    await V.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const menu = await p.evaluate(() => { const r = Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().findChild('id', 'inventaire', true); return r ? [r.parentNode.get('text'), r.get('text')] : null; });
    await V.ouvrirMenu(p, menu[0], menu[1]);
    await p.waitForFunction((id) => { const g = Ext.ComponentQuery.query('inventaire')[0]; return g && !g.getStore().isLoading() && g.getStore().findExact('lg_INVENTAIRE_ID', id) >= 0; }, ID, { timeout: 60000 });
    const edit = await p.evaluate((id) => { const g = Ext.ComponentQuery.query('inventaire')[0];
      const col = g.headerCt.getGridColumns().find((c) => Array.isArray(c.items) && c.items.some((x) => x.handler === g.onEditClick));
      const n = g.getView().getNode(g.getStore().findExact('lg_INVENTAIRE_ID', id)); const td = n && col && n.querySelector('.x-grid-cell-' + col.getId());
      const i = td && (td.querySelector('.x-action-col-icon') || td.querySelector('img')); if (!i) { return null; } i.id = i.id || 'e2e-edit-inv'; return '#' + i.id; }, ID);
    ok('Liste des inventaires : icône « Editer » de la fiche E2E', !!edit, edit);
    await p.click(edit);
    const grille = () => p.waitForFunction(() => { const g = Ext.getCmp('gridpanelInventaireID'); return g && g.isVisible(true) && !g.getStore().isLoading(); }, null, { timeout: 60000 });
    await grille();
    await p.waitForTimeout(800);
    const libelles = await p.evaluate(() => Ext.getCmp('str_TYPE').getStore().collect('str_desc'));
    ok('Le filtre propose « Prix achat > prix vente », les filtres existants restent', libelles.includes('Prix achat > prix vente') && libelles.includes('Articles encore négatifs') && libelles.includes("Vendus après la création de l'inventaire") && libelles.length === 10, libelles.join(', '));
    const lire = () => p.evaluate(() => { const s = Ext.getCmp('gridpanelInventaireID').getStore(); return { total: s.getTotalCount(), lignes: s.getRange().map((r) => [String(r.get('int_CIP')), Number(r.get('int_PAF')), Number(r.get('int_PRICE'))]) }; });
    const choisirFiltre = async (libelle) => { await V.choisir(p, '#str_TYPE', libelle); await p.waitForTimeout(600); await grille(); return lire(); };

    const filtre = await choisirFiltre('Prix achat > prix vente');
    const attendu = SUP.map((x) => String(x[1])).sort();
    ok(`Écran = base : les ${attendu.length} lignes au PAF > prix de vente, CIP par CIP`, JSON.stringify(filtre.lignes.map((x) => x[0]).sort()) === JSON.stringify(attendu) && filtre.total === 5, JSON.stringify(filtre));
    ok('PAF et prix de vente affichés = fiche produit, et PAF > prix de vente sur chaque ligne', filtre.lignes.every(([cip, paf, pv]) => { const x = SUP.find((y) => String(y[1]) === cip); return x && paf === Number(x[2]) && pv === Number(x[3]) && paf > pv; }), JSON.stringify(filtre.lignes));
    const tous = await choisirFiltre('Tous');
    ok('Cohérence du comptage : filtre (5) + hors filtre (5) = Tous (10)', tous.total === 10 && filtre.total + TOUS.filter((x) => !(Number(x[2]) > Number(x[3]))).length === tous.total, tous.total);
    await choisirFiltre('Prix achat > prix vente');

    /* impression du filtre courant */
    const [rep] = await Promise.all([p.waitForResponse((r) => /inventaire\/filtre\/pdf/.test(r.url()), { timeout: 120000 }),
      p.context().waitForEvent('page', { timeout: 120000 }).then((pg) => pg.close().catch(() => {})).catch(() => {}), V.cliquer(p, '#btn_print_filtre')]);
    const o = await rep.json().catch(() => ({}));
    const f = o.url ? fichierEdition(o.url) : '';
    const pdf = f && fs.existsSync(f) ? execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ') : '';
    ok('« Imprimer filtre courant » écrit un PDF', o.success === true && !!pdf, JSON.stringify(o));
    const absents = attendu.filter((c) => !pdf.includes(c)), intrus = [...EGAL, ...NORMAUX].map((x) => String(x[1])).filter((c) => pdf.includes(c));
    ok('PDF = écran : les 5 CIP du filtre, aucun autre ; titre « Prix achat > prix vente (5 articles) »', absents.length === 0 && intrus.length === 0 && pdf.includes('Prix achat > prix vente (5 articles)'), JSON.stringify({ absents, intrus, debut: pdf.slice(0, 300) }));

    /* fiche corrigee : la ligne sort apres actualisation */
    q(`UPDATE t_famille SET int_PAF = GREATEST(int_PRICE - 1, 0) WHERE lg_FAMILLE_ID = '${SUP[0][0]}'`);
    const actualiser = await p.evaluate(() => { const t = Ext.getCmp('gridpanelInventaireID').down('pagingtoolbar'); const r = t && t.down('#refresh'); return r ? r.getId() : null; });
    await p.click('#' + actualiser);
    await p.waitForTimeout(600);
    await grille();
    const apres = await lire();
    ok('Fiche corrigée (PAF < prix de vente) : la ligne sort du filtre après actualisation (4 lignes)', apres.total === 4 && !apres.lignes.some((x) => x[0] === String(SUP[0][1])), JSON.stringify(apres));
    ok('Aucun stock modifié par le filtre ni l\'impression', stocks() === stocksAvant);
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    if (b) { await b.close(); }
    if (PAF_ORIGINE !== null) { q(`UPDATE t_famille SET int_PAF = ${PAF_ORIGINE} WHERE lg_FAMILLE_ID = '${SUP[0][0]}'`); }
    nettoyer();
    ok('Jeu d\'essai retiré, PAF remis', q(`SELECT COUNT(*) FROM t_inventaire WHERE lg_INVENTAIRE_ID = '${ID}'`) === '0' && (!SUP[0] || q(`SELECT int_PAF FROM t_famille WHERE lg_FAMILLE_ID = '${SUP[0][0]}'`) === String(PAF_ORIGINE)));
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
