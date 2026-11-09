/* PLAN DU 08/11, POINT 20 : ETAT DE CONTROLE DES ACHATS, « VOIR LE DETAIL DU CONTROLE » : QUI A CONTROLE.
 *
 * Retour (Q20) : « la personne qui a controle doit s'afficher quand on ouvre le detail dans etat de controle des achats ».
 *
 * Jeu d'essai sur un BL clos de 7 lignes (valeurs d'origine sauvegardees puis remises) :
 *  - 3 lignes controlees par l'utilisateur A le 29/10/2026 18:30 ;
 *  - 2 lignes controlees par l'utilisateur B le 30/10/2026 09:15 (le plus recent) ;
 *  - 2 lignes jamais controlees.
 * Par l'ecran (menu, dates saisies, recherche du BL, clic sur l'icone de detail) :
 *  - rapprochement fenetre = base, ligne par ligne (par CIP) : « Controle par » et « Le » ; tiret sans controle ;
 *  - la liste garde son resume du bon (dernier controleur : B) ;
 *  - aucune donnee modifiee par l'affichage.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const V = require('../outils/vues');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '--raw'], { input: s, encoding: 'utf8' }).replace(/\r/g, '').trim();

const REF = 'BKE/767243';
const BL = q(`SELECT lg_BON_LIVRAISON_ID FROM t_bon_livraison WHERE str_REF_LIVRAISON = '${REF}' AND str_STATUT = 'is_Closed' LIMIT 1`);
const LIGNES = BL ? q(`SELECT lg_BON_LIVRAISON_DETAIL, IFNULL(lg_CONTROLE_USER, 'NULL'), IFNULL(DATE_FORMAT(dt_CONTROLE, '%Y-%m-%d %H:%i:%s'), 'NULL') FROM t_bon_livraison_detail
  WHERE lg_BON_LIVRAISON_ID = '${BL}' ORDER BY lg_BON_LIVRAISON_DETAIL`).split('\n').map((l) => l.split('\t')) : [];
const [UA, UB] = q(`SELECT lg_USER_ID FROM t_user WHERE str_STATUT = 'enable' AND str_LAST_NAME <> '' ORDER BY (str_LOGIN = '${ENV_E2E.LOGIN}') DESC, lg_USER_ID LIMIT 2`).split('\n');
const val = (x) => (x === 'NULL' ? 'NULL' : `'${x}'`);
const remettre = () => q(LIGNES.map(([id, u, d]) => `UPDATE t_bon_livraison_detail SET lg_CONTROLE_USER = ${val(u)}, dt_CONTROLE = ${val(d)} WHERE lg_BON_LIVRAISON_DETAIL = '${id}';`).join(''));
const empreinte = () => q(`SELECT MD5(GROUP_CONCAT(CONCAT_WS('|', lg_BON_LIVRAISON_DETAIL, int_QTE_RECUE, checked, IFNULL(quantite_controle, ''), IFNULL(lg_CONTROLE_USER, ''), IFNULL(dt_CONTROLE, '')) ORDER BY 1))
  FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID = '${BL}'`);

(async () => {
  let b = null;
  const err = [];
  try {
    ok('Jeu d\'essai : un BL clos de 7 lignes, deux utilisateurs', BL && LIGNES.length === 7 && UA && UB && UA !== UB, REF + ' ' + LIGNES.length);
    q(LIGNES.map(([id], i) => `UPDATE t_bon_livraison_detail SET lg_CONTROLE_USER = ${i < 3 ? `'${UA}'` : i < 5 ? `'${UB}'` : 'NULL'},`
      + ` dt_CONTROLE = ${i < 3 ? "'2026-10-29 18:30:00'" : i < 5 ? "'2026-10-30 09:15:00'" : 'NULL'} WHERE lg_BON_LIVRAISON_DETAIL = '${id}';`).join(''));
    const avant = empreinte();
    /* attendu, lu en base : CIP -> [par, le] */
    const base = {};
    q(`SELECT f.int_CIP, IFNULL(TRIM(CONCAT(COALESCE(u.str_FIRST_NAME, ''), ' ', COALESCE(u.str_LAST_NAME, ''))), ''), IFNULL(DATE_FORMAT(d.dt_CONTROLE, '%d/%m/%Y %H:%i'), '')
      FROM t_bon_livraison_detail d JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID LEFT JOIN t_user u ON u.lg_USER_ID = d.lg_CONTROLE_USER
      WHERE d.lg_BON_LIVRAISON_ID = '${BL}'`).split('\n').forEach((l) => { const [cip, par, le] = l.split('\t'); base[cip] = [par || '', le || '']; });
    const nomB = q(`SELECT TRIM(CONCAT(COALESCE(str_FIRST_NAME, ''), ' ', COALESCE(str_LAST_NAME, ''))) FROM t_user WHERE lg_USER_ID = '${UB}'`);

    b = await ENV_E2E.lancer(chromium);
    const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
    p.on('pageerror', (e) => err.push(e.message));
    await V.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const menu = await p.evaluate(() => { const r = Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().findChild('id', 'etatscontrolemanager', true); return r ? [r.parentNode.get('text'), r.get('text')] : null; });
    await V.ouvrirMenu(p, menu[0], menu[1]);
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('etatscontrolemanager')[0]; return g && g.isVisible(true) && !g.getStore().isLoading(); }, null, { timeout: 60000 });
    await V.saisir(p, '#datedebut', '01/10/2026');
    await V.saisir(p, '#datefin', '31/10/2026');
    await V.saisir(p, '#rechecher', REF);
    await p.keyboard.press('Enter');
    await p.waitForTimeout(800);
    await p.waitForFunction((bl) => { const s = Ext.ComponentQuery.query('etatscontrolemanager')[0].getStore(); return !s.isLoading() && s.findExact('lgBONLIVRAISONID', bl) >= 0; }, BL, { timeout: 60000 });
    const resume = await p.evaluate((bl) => { const s = Ext.ComponentQuery.query('etatscontrolemanager')[0].getStore(); const r = s.getAt(s.findExact('lgBONLIVRAISONID', bl)); return [r.raw.controlePar, r.raw.controleLe]; }, BL);
    ok(`Liste : le résumé du bon garde le dernier contrôleur (${nomB}, 30/10/2026 09:15)`, resume[0] === nomB && resume[1] === '30/10/2026 09:15', JSON.stringify(resume));
    /* icone de detail : par son gestionnaire */
    const sel = await p.evaluate((bl) => { const g = Ext.ComponentQuery.query('etatscontrolemanager')[0], s = g.getStore();
      const col = g.headerCt.getGridColumns().find((c) => c.items && c.items[0] && c.items[0].handler === g.onDetailControleClick);
      const n = g.getView().getNode(s.findExact('lgBONLIVRAISONID', bl)); const td = n && col && n.querySelector('.x-grid-cell-' + col.getId());
      const i = td && (td.querySelector('.x-action-col-icon') || td.querySelector('img') || td.firstChild); if (!i) { return null; } i.id = i.id || 'e2e-detail-controle'; return '#' + i.id; }, BL);
    ok('Icône « Voir le détail du contrôle » sur la ligne du BL', !!sel, sel);
    await p.click(sel);
    await p.waitForFunction((r) => Ext.ComponentQuery.query('window{isVisible()}').some((w) => (w.title || '').includes(r)), REF, { timeout: 20000 });
    await p.waitForTimeout(600);
    const fen = await p.evaluate((r) => { const w = Ext.ComponentQuery.query('window{isVisible()}').filter((x) => (x.title || '').includes(r)).pop(), g = w.down('grid');
      const cols = g.headerCt.getGridColumns(), iCip = cols.findIndex((c) => c.dataIndex === 'cip'), iPar = cols.findIndex((c) => c.itemId === 'colControlePar'), iLe = cols.findIndex((c) => c.itemId === 'colControleLe');
      const lignes = g.getStore().getRange().map((rec, i) => { const td = g.getView().getNode(i).querySelectorAll('td'); const t = (k) => (k >= 0 && td[k] ? td[k].innerText.trim() : '(colonne absente)'); return [t(iCip), t(iPar), t(iLe)]; });
      const largeur = g.getView().getEl().dom; return { entetes: cols.map((c) => c.text), lignes, deborde: largeur.scrollWidth > largeur.clientWidth + 1 }; }, REF);
    ok('Fenêtre de détail : colonnes « Contrôlé par » et « Le »', fen.entetes.includes('Contr&ocirc;l&eacute; par') && fen.entetes.includes('Le'), fen.entetes.join(', '));
    const ecarts = fen.lignes.filter(([cip, par, le]) => !base[cip] || (base[cip][0] || '—') !== par || base[cip][1] !== le);
    ok(`Fenêtre = base, ligne par ligne (${fen.lignes.length} lignes : 3 par A, 2 par B, 2 sans contrôle)`, fen.lignes.length === 7 && ecarts.length === 0
      && fen.lignes.filter((l) => l[1] === '—').length === 2 && new Set(fen.lignes.map((l) => l[1]).filter((x) => x !== '—')).size === 2, JSON.stringify(ecarts.length ? ecarts : fen.lignes));
    ok('La grille de détail ne déborde pas en largeur', !fen.deborde);
    ok('Aucune donnée modifiée par l\'affichage', empreinte() === avant);
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    if (b) { await b.close(); }
    if (LIGNES.length) { remettre(); }
    ok('Valeurs d\'origine remises', LIGNES.every(([id, u, d]) => q(`SELECT CONCAT(IFNULL(lg_CONTROLE_USER, 'NULL'), '|', IFNULL(DATE_FORMAT(dt_CONTROLE, '%Y-%m-%d %H:%i:%s'), 'NULL')) FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_DETAIL = '${id}'`) === u + '|' + d));
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
