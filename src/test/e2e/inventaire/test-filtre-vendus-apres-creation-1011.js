/* PLAN DU 09/11, POINT 12 : INVENTAIRE EN COURS, FILTRE « VENDUS APRES LA CREATION DE L'INVENTAIRE » ET IMPRESSION.
 *
 * Regle : un produit de l'inventaire sort dans le filtre s'il a ete vendu depuis la creation de l'inventaire, sur
 * l'emplacement de l'inventaire : vente encaissee (is_Closed), non annulee, montant positif, encaissee a partir de la
 * date de creation. « Vendus depuis » = somme des quantites de ces ventes.
 *
 * Jeu d'essai : un inventaire en cours (E2E-VAC) de 10 lignes, emplacement 1, cree a une date passee D, sur les ventes
 * reelles de la base d'essai :
 *  - 5 produits vendus apres D (quantites totales variees : 1 et plus de 1) ;
 *  - 3 produits vendus seulement avant D ;
 *  - 2 produits dont les seules ventes apres D sont annulees.
 * Par l'ecran (menu Inventaire, icone « Editer », choix du filtre, « Imprimer filtre courant ») :
 *  - le combo propose « Vendus après la création de l'inventaire », les 9 filtres existants restent ;
 *  - rapprochement ecran = base : les 5 lignes, CIP par CIP, et la colonne « Vendus depuis » = somme en base ;
 *  - coherence : filtre (5) + hors filtre (5) = « Tous » (10), chaque quantite vendue > 0 ;
 *  - la colonne n'est affichee qu'avec ce filtre ;
 *  - PDF du filtre courant = les 5 lignes de l'ecran, aucune autre, ligne par ligne = base (stock theorique, compte,
 *    ecart = compte - theorique, vendus depuis) ; second PDF avec « Afficher stock » inverse : colonnes de stock
 *    retirees (ou ajoutees), memes quantites vendues ;
 *    titre « (5 articles) » ;
 *  - bilan : aucun stock ni aucune ligne d'inventaire modifies par le filtre ni l'impression.
 * Jeu d'essai retire a la fin.
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
const ID = 'E2E-VAC';
const LIBELLE = 'Vendus après la création de l\'inventaire';
/* D : 10 jours avant la derniere vente encaissee de la base d'essai */
const D = q(`SELECT DATE_FORMAT(DATE(MAX(dt_UPDATED)) - INTERVAL 10 DAY, '%Y-%m-%d 00:00:00') FROM t_preenregistrement WHERE str_STATUT = 'is_Closed' AND b_IS_CANCEL = 0 AND int_PRICE > 0`);
const VENTE = (cond) => `SELECT 1 FROM t_preenregistrement_detail d JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID
  JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID WHERE d.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND u.lg_EMPLACEMENT_ID = '1' AND ${cond}`;
const VALIDE = "p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0";
/* quantite vendue depuis D, calculee en base independamment de l'application */
const vendus = (idf) => q(`SELECT COALESCE(SUM(d.int_QUANTITY), 0) FROM t_preenregistrement_detail d JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID
  JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID WHERE d.lg_FAMILLE_ID = '${idf}' AND u.lg_EMPLACEMENT_ID = '1' AND ${VALIDE} AND p.dt_UPDATED >= '${D}'`);
const prods = (cond, n, ordre) => q(`SELECT f.lg_FAMILLE_ID, f.int_CIP, s.int_NUMBER_AVAILABLE, s.lg_FAMILLE_STOCK_ID FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'
  WHERE f.str_STATUT = 'enable' AND f.int_CIP REGEXP '^[0-9]{6,}$' AND ${cond} ORDER BY ${ordre || 'f.lg_FAMILLE_ID'} LIMIT ${n}`).split('\n').filter(Boolean).map((l) => l.split('\t'));
const APRES = `EXISTS (${VENTE(VALIDE + ` AND p.dt_UPDATED >= '${D}'`)})`;
const qte = (op) => `(SELECT SUM(d.int_QUANTITY) FROM t_preenregistrement_detail d JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID
  JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID WHERE d.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND u.lg_EMPLACEMENT_ID = '1' AND ${VALIDE} AND p.dt_UPDATED >= '${D}') ${op}`;
const VENDUS = [...prods(`${qte('> 2')}`, 3), ...prods(`${qte('= 1')}`, 2)];
const AVANT = prods(`NOT ${APRES} AND EXISTS (${VENTE(VALIDE + ` AND p.dt_UPDATED >= '${D}' - INTERVAL 60 DAY AND p.dt_UPDATED < '${D}'`)})`, 3);
const ANNULES = prods(`NOT ${APRES} AND EXISTS (${VENTE(`p.b_IS_CANCEL = 1 AND p.dt_UPDATED >= '${D}'`)})`, 2);
const TOUS = [...VENDUS, ...AVANT, ...ANNULES];
const nettoyer = () => q(`DELETE FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID = '${ID}'; DELETE FROM t_inventaire WHERE lg_INVENTAIRE_ID = '${ID}';`);
const traces = () => q(`SELECT MD5(CONCAT(
  (SELECT IFNULL(GROUP_CONCAT(CONCAT(lg_FAMILLE_STOCK_ID, ':', int_NUMBER_AVAILABLE, ':', int_NUMBER) ORDER BY 1), '') FROM t_famille_stock WHERE lg_FAMILLE_STOCK_ID IN ('${TOUS.map((x) => x[3]).join("','")}')),
  (SELECT IFNULL(GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, ':', int_NUMBER, ':', int_NUMBER_INIT, ':', IFNULL(dt_UPDATED, '')) ORDER BY 1), '') FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID = '${ID}')))`);

(async () => {
  let b = null;
  const err = [];
  try {
    const qtes = VENDUS.map((x) => Number(vendus(x[0])));
    ok('Jeu d\'essai : 5 produits vendus après D (quantités variées), 3 vendus avant seulement, 2 aux ventes annulées après D',
      VENDUS.length === 5 && AVANT.length === 3 && ANNULES.length === 2 && qtes.some((x) => x === 1) && qtes.some((x) => x > 2) && new Set(TOUS.map((x) => x[0])).size === 10,
      `${D} ${VENDUS.length}/${AVANT.length}/${ANNULES.length} qtes ${qtes.join(',')}`);
    ok('Jeu d\'essai : les produits hors filtre n\'ont aucune vente valide depuis D', [...AVANT, ...ANNULES].every((x) => vendus(x[0]) === '0'), '');
    nettoyer();
    q(`INSERT INTO t_inventaire (lg_INVENTAIRE_ID, str_NAME, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED, dt_UPDATED, lg_USER_ID, lg_EMPLACEMENT_ID)
      SELECT '${ID}', 'E2E vendus apres creation', 'E2E filtre vendus apres creation', 'emplacement', 'enable', '${D}', '${D}', lg_USER_ID, '1' FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN}';`
      + TOUS.map((x, i) => `INSERT INTO t_inventaire_famille (lg_INVENTAIRE_ID, lg_FAMILLE_ID, int_NUMBER, int_NUMBER_INIT, str_STATUT, dt_CREATED, dt_UPDATED, bool_INVENTAIRE, str_UPDATED_ID, lg_FAMILLE_STOCK_ID)
      VALUES ('${ID}', '${x[0]}', ${Number(x[2]) + (i % 3) - 1}, ${x[2]}, 'enable', '${D}', ${i % 2 ? 'NOW()' : 'NULL'}, 1, '', '${x[3]}');`).join(''));
    const avant = traces();
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
    ok('Le filtre propose « ' + LIBELLE + ' », les 9 filtres existants restent', libelles.includes(LIBELLE) && libelles.includes('Prix achat > prix vente') && libelles.includes('Articles encore négatifs') && libelles.length === 10, libelles.join(', '));
    const lire = () => p.evaluate(() => { const g = Ext.getCmp('gridpanelInventaireID'), s = g.getStore();
      const col = g.headerCt.getGridColumns().find((c) => c.itemId === 'colVendusDepuis');
      return { total: s.getTotalCount(), colonne: !!(col && col.isVisible()), titre: col ? col.text : null,
        lignes: s.getRange().map((r) => [String(r.get('int_CIP')), r.raw.int_VENDU_DEPUIS]),
        affiche: s.getRange().map((r) => { const n = g.getView().getNode(r), td = n && col && n.querySelector('.x-grid-cell-' + col.getItemId()); return td ? td.textContent.trim() : null; }) }; });
    const choisirFiltre = async (libelle) => { await V.choisir(p, '#str_TYPE', libelle); await p.waitForTimeout(600); await grille(); await p.waitForTimeout(300); return lire(); };

    const filtre = await choisirFiltre(LIBELLE);
    const attendu = VENDUS.map((x, i) => [String(x[1]), qtes[i]]).sort();
    ok('Écran = base : les 5 lignes vendues après la création, CIP par CIP', JSON.stringify(filtre.lignes.map((x) => x[0]).sort()) === JSON.stringify(attendu.map((x) => x[0])) && filtre.total === 5, JSON.stringify(filtre.lignes));
    ok('Écran = base : « Vendus depuis » de chaque ligne = somme des quantités vendues en base', JSON.stringify(filtre.lignes.map((x) => [x[0], Number(x[1])]).sort()) === JSON.stringify(attendu), JSON.stringify({ ecran: filtre.lignes, base: attendu }));
    ok('La colonne « Vendus depuis » est affichée avec ce filtre et montre les quantités', filtre.colonne && JSON.stringify(filtre.affiche.map(Number).sort()) === JSON.stringify(filtre.lignes.map((x) => Number(x[1])).sort()), JSON.stringify({ titre: filtre.titre, affiche: filtre.affiche }));
    ok('Cohérence : chaque quantité vendue est > 0', filtre.lignes.every((x) => Number(x[1]) > 0), '');
    const tous = await choisirFiltre('Tous');
    ok('Cohérence du comptage : filtre (5) + hors filtre (5) = Tous (10)', tous.total === 10 && filtre.total + AVANT.length + ANNULES.length === tous.total, tous.total);
    ok('Avec « Tous », la colonne « Vendus depuis » est masquée', !tous.colonne, '');
    await choisirFiltre(LIBELLE);

    /* impression du filtre courant, avec puis sans les colonnes de stock (bouton « Afficher stock ») */
    const lignesBase = {};
    q(`SELECT f.int_CIP, i.int_NUMBER_INIT, i.int_NUMBER FROM t_inventaire_famille i JOIN t_famille f ON f.lg_FAMILLE_ID = i.lg_FAMILLE_ID WHERE i.lg_INVENTAIRE_ID = '${ID}'`)
      .split('\n').filter(Boolean).forEach((l) => { const [c, init, n] = l.split('\t'); lignesBase[c] = [Number(init), Number(n)]; });
    const imprimer = async () => {
      const [rep] = await Promise.all([p.waitForResponse((r) => /inventaire\/filtre\/pdf/.test(r.url()), { timeout: 120000 }),
        p.context().waitForEvent('page', { timeout: 120000 }).then((pg) => pg.close().catch(() => {})).catch(() => {}), V.cliquer(p, '#btn_print_filtre')]);
      const o = await rep.json().catch(() => ({}));
      const f = o.url ? fichierEdition(o.url) : '';
      const pdf = f && fs.existsSync(f) ? execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ') : '';
      /* segment de chaque CIP : du CIP au CIP suivant (ou au pied de page) ; nombres de fin de segment */
      const pos = attendu.map(([c]) => [c, pdf.indexOf(c)]).sort((a, b) => a[1] - b[1]);
      const fins = {};
      pos.forEach(([c, i], k) => {
        const page = pdf.indexOf('Page', i);
        const fin = k + 1 < pos.length ? pos[k + 1][1] : (page > 0 ? page : pdf.length);
        const mots = pdf.slice(i, fin).trim().split(' ');
        const t = [];
        for (let j = mots.length - 1; j >= 0 && /^-?\d+$/.test(mots[j]); j--) { t.unshift(Number(mots[j])); }
        fins[c] = t;
      });
      return { o, pdf, fins };
    };
    /* avec stock : stock theorique | compte | ecart | vendus ; sans : compte | vendus */
    const verifie = (fins, avecStock) => attendu.filter(([c, n]) => {
      const t = fins[c] || [], [init, compte] = lignesBase[c] || [];
      if (avecStock) { const [a, b2, e, v] = t.slice(-4); return !(a === init && b2 === compte && e === compte - init && v === n); }
      const [b2, v] = t.slice(-2); return !(b2 === compte && v === n);
    });
    const stockOui = await p.evaluate(() => Ext.getCmp('chk_show_stock_print').getValue() === true);
    const i1 = await imprimer();
    ok('« Imprimer filtre courant » écrit un PDF (stock affiché : ' + (stockOui ? 'OUI' : 'NON') + ')', i1.o.success === true && !!i1.pdf, JSON.stringify(i1.o));
    const absents = attendu.filter(([c]) => !i1.pdf.includes(c)), intrus = [...AVANT, ...ANNULES].map((x) => String(x[1])).filter((c) => i1.pdf.includes(c));
    ok('PDF = écran : les 5 CIP du filtre, aucun autre ; titre « (5 articles) »', absents.length === 0 && intrus.length === 0 && i1.pdf.includes(LIBELLE + ' (5 articles)'), JSON.stringify({ absents, intrus, debut: i1.pdf.slice(0, 300) }));
    ok('PDF : colonnes CIP, Désignation, Emplacement, Compté et Vendus depuis', /CIP/.test(i1.pdf) && /Désignation/.test(i1.pdf) && /Emplacement/.test(i1.pdf) && /Compté/.test(i1.pdf) && /Vendus depuis/.test(i1.pdf), i1.pdf.slice(0, 400));
    const faux1 = verifie(i1.fins, stockOui);
    ok('PDF = base, ligne par ligne : ' + (stockOui ? 'stock théorique, compté, écart (= compté − théorique), ' : 'compté, ') + 'vendus depuis',
      faux1.length === 0 && /Stock théorique/.test(i1.pdf) === stockOui && /Écart/.test(i1.pdf) === stockOui, JSON.stringify({ faux1, fins: i1.fins, base: lignesBase }));
    await V.cliquer(p, '#chk_show_stock_print');
    await p.waitForTimeout(300);
    const i2 = await imprimer();
    const faux2 = verifie(i2.fins, !stockOui);
    ok('Second PDF (« Afficher stock » inversé) : colonnes de stock ' + (stockOui ? 'retirées' : 'ajoutées') + ', mêmes lignes et mêmes quantités vendues',
      i2.o.success === true && faux2.length === 0 && /Stock théorique/.test(i2.pdf) === !stockOui, JSON.stringify({ faux2, fins: i2.fins }));
    /* rapprochement a grande echelle : 4 inventaires reels en cours (les 3 plus recents de 20 a 5 000 lignes incluses, et le
       plus recent de plus de 5 000 lignes). Pour chaque ligne de
       « Tous » : presente dans le filtre si et seulement si sa quantite vendue en base (calcul SQL independant) est > 0,
       et « Vendus depuis » = cette quantite. */
    const inclus = (op) => `SELECT i.lg_INVENTAIRE_ID FROM t_inventaire i WHERE i.str_STATUT = 'enable' AND i.lg_INVENTAIRE_ID <> '${ID}'
      AND (SELECT COUNT(*) FROM t_inventaire_famille f WHERE f.lg_INVENTAIRE_ID = i.lg_INVENTAIRE_ID AND f.bool_INVENTAIRE = 1) ${op} ORDER BY i.dt_CREATED DESC`;
    /* les 3 plus recents de 20 a 5 000 lignes incluses, et le plus recent de plus de 5 000 lignes */
    const reels = [...q(inclus('BETWEEN 20 AND 5000') + ' LIMIT 3').split('\n'), q(inclus('> 5000') + ' LIMIT 1')].filter(Boolean);
    let cas = 0, vendusVus = 0;
    const ecarts = [];
    for (const inv of reels) {
      const base = {};
      q(`SELECT i.lg_INVENTAIRE_FAMILLE_ID, SUM(d.int_QUANTITY) FROM t_inventaire_famille i JOIN t_inventaire v ON v.lg_INVENTAIRE_ID = i.lg_INVENTAIRE_ID
          JOIN t_preenregistrement_detail d ON d.lg_FAMILLE_ID = i.lg_FAMILLE_ID JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID
          JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID
          WHERE i.lg_INVENTAIRE_ID = '${inv}' AND ${VALIDE} AND p.dt_UPDATED >= v.dt_CREATED AND u.lg_EMPLACEMENT_ID = v.lg_EMPLACEMENT_ID
          GROUP BY i.lg_INVENTAIRE_FAMILLE_ID`).split('\n').filter(Boolean).forEach((l) => { const [k, n] = l.split('\t'); base[k] = Number(n); });
      const api = await p.evaluate(async (id) => { const u = (t) => '../api/v1/inventaire/detail?lg_INVENTAIRE_ID=' + id + '&str_TYPE=' + t + '&start=0&limit=100000';
        const tous = (await (await fetch(u('ALL'))).json()).results.map((r) => String(r.lg_INVENTAIRE_FAMILLE_ID));
        const filtre = (await (await fetch(u('VENDUS_APRES'))).json()).results.map((r) => [String(r.lg_INVENTAIRE_FAMILLE_ID), r.int_VENDU_DEPUIS]);
        return { tous, filtre }; }, inv);
      const dansFiltre = new Map(api.filtre);
      api.tous.forEach((k) => { cas++; const attenduN = base[k] || 0, vu = dansFiltre.has(k) ? Number(dansFiltre.get(k)) : 0;
        if ((attenduN > 0) !== dansFiltre.has(k) || vu !== attenduN) { ecarts.push(inv + ':' + k + ' base ' + attenduN + ' écran ' + vu); } });
      const tousSet = new Set(api.tous);
      api.filtre.forEach(([k]) => { vendusVus++; if (!tousSet.has(k)) { ecarts.push(inv + ':' + k + ' hors de « Tous »'); } });
    }
    ok(`Rapprochement à grande échelle : ${reels.length} inventaires réels, ${cas} lignes, ${vendusVus} vendues après création, filtre et quantités = base`,
      reels.length === 4 && cas > 1000 && vendusVus > 50 && ecarts.length === 0, ecarts.slice(0, 8).join(' | '));
    ok('Bilan : aucun stock ni aucune ligne d\'inventaire modifiés par le filtre ni l\'impression', traces() === avant);
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    if (b) { await b.close(); }
    nettoyer();
    ok('Jeu d\'essai retiré', q(`SELECT COUNT(*) FROM t_inventaire WHERE lg_INVENTAIRE_ID = '${ID}'`) === '0' && q(`SELECT COUNT(*) FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID = '${ID}'`) === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
