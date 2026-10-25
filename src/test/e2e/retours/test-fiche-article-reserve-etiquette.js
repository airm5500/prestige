/* FICHE ARTICLE : RESERVE, DCI, ETIQUETTE (retours du 13/10, point 2). Par l'ecran « Articles », admin.
 *  Detail (icone « Detail ») :
 *   - bloc « Réserve, DCI et étiquette » : gestion en reserve, seuil mini rayon, capacite maxi rayon, quantite en
 *     reserve, code geo article et reserve, contenance (quantite detail), DCI, type d'etiquette ;
 *   - un exemple de l'etiquette telle qu'imprimee (texte du produit et code dessine).
 *  Modification (icone « Modifier ») :
 *   - le type d'etiquette se choisit dans la fiche (liste visible, type actuel preselectionne) ;
 *   - le changement passe par la mise a jour des types (journal) ; sans le droit P_SM_ETIQUETTE_TYPE : refuse, la
 *     raison s'affiche sous la liste, rien n'est enregistre ; aucune fenetre surgissante.
 * Le produit d'essai est remis a l'identique (valeurs, type, stock de reserve, DCI, journal).
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const privilegeEssai = require('../support/privilege-essai');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const droitType = privilegeEssai(q, exec, 'admin', 'P_SM_ETIQUETTE_TYPE');

/* produit actif, en stock au rayon, au type d'etiquette historique « CIP - PRIX » */
const [P, CIP] = q("SELECT CONCAT_WS('|', f.lg_FAMILLE_ID, f.int_CIP) FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
  + " WHERE f.str_STATUT = 'enable' AND f.lg_TYPEETIQUETTE_ID = '2' AND f.bool_DECONDITIONNE_EXIST = 1 AND f.bool_DECONDITIONNE = 0 AND f.int_NUMBERDETAIL > 1 AND f.int_CIP REGEXP '^[0-9]{6,13}$'"
  + " AND (SELECT COUNT(*) FROM t_famille x WHERE x.int_CIP = f.int_CIP) = 1 ORDER BY f.lg_FAMILLE_ID LIMIT 1").split('|');
const COLS = 'bool_RESERVE, int_SEUIL_MINI_RAYON, int_SEUIL_RESERVE, str_CODE_GEO_ARTICLE, str_CODE_GEO_ARTICLE_RESERVE, int_NUMBERDETAIL, lg_TYPEETIQUETTE_ID';
const ORIGINE = q(`SELECT CONCAT_WS('|', ${COLS.split(', ').map((c) => `IFNULL(${c}, 'NULL')`).join(', ')}) FROM t_famille WHERE lg_FAMILLE_ID = '${P}'`);
const DESIGNATION = q(`SELECT str_DESCRIPTION FROM t_famille WHERE lg_FAMILLE_ID = '${P}'`);
const CONTENANCE = q(`SELECT int_NUMBERDETAIL FROM t_famille WHERE lg_FAMILLE_ID = '${P}'`);
const DCI = q("SELECT lg_DCI_ID FROM t_dci ORDER BY lg_DCI_ID LIMIT 1");
const NOM_DCI = q(`SELECT str_NAME FROM t_dci WHERE lg_DCI_ID = '${DCI}'`);
const TSF = 'E2E-RES-ETQ';
const debut = q('SELECT NOW()');

function remettre() {
  const v = ORIGINE.split('|').map((x) => (x === 'NULL' ? 'NULL' : `'${x.replace(/'/g, "''")}'`));
  exec(`UPDATE t_famille SET ${COLS.split(', ').map((c, i) => `${c} = ${v[i]}`).join(', ')} WHERE lg_FAMILLE_ID = '${P}';`
    + `DELETE FROM t_type_stock_famille WHERE lg_TYPE_STOCK_FAMILLE_ID = '${TSF}';`
    + `DELETE FROM t_famille_dci WHERE lg_FAMILLE_DCI_ID = '${TSF}';`
    + `DELETE FROM t_etiquette_type_journal WHERE lg_FAMILLE_ID = '${P}' AND dt_CREATED >= '${debut}';`);
}

(async () => {
  droitType.remettre();
  ok('Précondition : un produit et une DCI', !!P && !!DCI, P + ' ' + DCI);
  exec(`UPDATE t_famille SET bool_RESERVE = 1, int_SEUIL_MINI_RAYON = 4, int_SEUIL_RESERVE = 18, str_CODE_GEO_ARTICLE = 'E2E-A12', str_CODE_GEO_ARTICLE_RESERVE = 'E2E-R07' WHERE lg_FAMILLE_ID = '${P}';`
    + `DELETE FROM t_type_stock_famille WHERE lg_TYPE_STOCK_FAMILLE_ID = '${TSF}';`
    + `INSERT INTO t_type_stock_famille (lg_TYPE_STOCK_FAMILLE_ID, lg_FAMILLE_ID, lg_TYPE_STOCK_ID, lg_EMPLACEMENT_ID, str_NAME, str_DESCRIPTION, dt_CREATED, str_STATUT, int_NUMBER) VALUES ('${TSF}', '${P}', '2', '1', 'reserve', 'reserve', NOW(), 'enable', 37);`
    + `INSERT INTO t_famille_dci (lg_FAMILLE_DCI_ID, lg_DCI_ID, lg_FAMILLE_ID, str_STATUT) VALUES ('${TSF}', '${DCI}', '${P}', 'enable');`);
  const reserveAttendue = q(`SELECT IFNULL(SUM(int_NUMBER), 0) FROM t_type_stock_famille WHERE lg_FAMILLE_ID = '${P}' AND lg_TYPE_STOCK_ID = '2' AND lg_EMPLACEMENT_ID = '1'`);
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const err = [], dialogues = [];
  const connecter = async () => {
    const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
    p.on('pageerror', (e) => err.push(e.message));
    p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
    /* ecran « Articles », recherche par CIP */
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('famillemanager', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('famillemanager').length > 0 && Ext.getCmp('rechecher'), null, { timeout: 30000 });
    await p.waitForTimeout(2000);
    await p.evaluate((cip) => { Ext.getCmp('rechecher').setValue(cip); Ext.ComponentQuery.query('famillemanager')[0].onRechClick(); }, CIP);
    await p.waitForFunction((id) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; return !g.getStore().isLoading() && g.getStore().findExact('lg_FAMILLE_ID', id) >= 0; }, P, { timeout: 60000 });
    return p;
  };
  const action = (p, nom) => p.evaluate(([id, nom]) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; g[nom](g, g.getStore().findExact('lg_FAMILLE_ID', id)); }, [P, nom]);
  try {
    let p = await connecter();

    /* ----- detail ----- */
    await action(p, 'onDetailClick');
    await p.waitForFunction(() => { const c = Ext.getCmp('detRes_apercu'); return c && c.getEl() && c.getEl().dom.querySelector('.pr-etq-apercu canvas'); }, null, { timeout: 30000 }).catch(() => {});
    await p.waitForFunction(() => /\w/.test((Ext.getCmp('detRes_dci') || { getValue: () => '' }).getValue().replace(/<[^>]+>|—/g, '')), null, { timeout: 10000 }).catch(() => {});
    const det = await p.evaluate(() => { const v = (id) => { const c = Ext.getCmp(id); return c ? String(c.getValue()).replace(/<[^>]+>/g, '') : null; };
      const fs = Ext.getCmp('fieldset_reserve_etiquette'), ap = Ext.getCmp('detRes_apercu').getEl().dom;
      return { visible: !!fs && fs.isVisible(), gestion: v('detRes_gestion'), mini: v('detRes_seuilMini'), capacite: v('detRes_capacite'), quantite: v('detRes_quantite'),
        geoA: v('detRes_geoArticle'), geoR: v('detRes_geoReserve'), contenance: v('detRes_contenance'), dci: v('detRes_dci'), type: v('detRes_typeEtiquette'),
        apercu: { code: !!ap.querySelector('.pr-etq-apercu canvas'), texte: (ap.querySelector('.pr-etq-apercu') || { innerText: '' }).innerText.replace(/\s+/g, ' ') } }; });
    ok('Détail : bloc « Réserve, DCI et étiquette » affiché', det.visible, JSON.stringify(det));
    ok('Réserve : gestion, seuil mini rayon, capacité maxi rayon, quantité en réserve', det.gestion === 'Oui' && det.mini === '4' && det.capacite === '18' && det.quantite === reserveAttendue,
      JSON.stringify(det) + ' réserve attendue ' + reserveAttendue);
    ok('Codes géo article et réserve, contenance', det.geoA === 'E2E-A12' && det.geoR === 'E2E-R07' && det.contenance === CONTENANCE, JSON.stringify(det));
    ok('DCI affichée', det.dci === NOM_DCI, det.dci + ' / ' + NOM_DCI);
    ok('Type d\'étiquette affiché', /CIP - PRIX/.test(det.type), det.type);
    ok('Exemple d\'étiquette : code dessiné et texte du produit', det.apercu.code && (det.apercu.texte.includes(CIP) || det.apercu.texte.includes(DESIGNATION.split(' ')[0])), JSON.stringify(det.apercu));
    await p.evaluate(() => Ext.ComponentQuery.query('window').filter((w) => w.isVisible()).forEach((w) => w.close()));

    /* ----- modification : type d'etiquette visible, change -> journal ----- */
    const ouvrirModif = async () => {
      await action(p, 'onEditClick');
      await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('combobox[itemId=lg_TYPEETIQUETTE_ID]').filter((x) => x.isVisible())[0]; return c && c.isVisible() && c.getValue(); }, null, { timeout: 30000 });
      await p.waitForTimeout(800);
    };
    await ouvrirModif();
    const avant = await p.evaluate(() => { const c = Ext.ComponentQuery.query('combobox[itemId=lg_TYPEETIQUETTE_ID]').filter((x) => x.isVisible())[0]; return { valeur: c.getValue(), texte: c.getRawValue(), visible: c.isVisible() }; });
    ok('Modification : la liste « Type d\'étiquette » est visible, type actuel présélectionné', avant.visible && avant.valeur === '2' && /CIP - PRIX/.test(avant.texte), JSON.stringify(avant));
    const enregistrer = async (type) => p.evaluate((t) => { const w = Ext.ComponentQuery.query('window').find((x) => x.isVisible() && x.down('combobox[itemId=lg_TYPEETIQUETTE_ID]'));
      w.down('combobox[itemId=lg_TYPEETIQUETTE_ID]').setValue(t); w.query('button').find((x) => x.text === 'Enregistrer').btnEl.dom.click(); }, type);

    /* sans le droit : refus visible sous la liste, rien n'est enregistre */
    await p.context().close();
    droitType.retirer();
    p = await connecter();
    await ouvrirModif();
    await enregistrer('TE_DATAMATRIX');
    await p.waitForFunction(() => { const m = Ext.ComponentQuery.query('displayfield[itemId=typeEtiquetteMessage]').pop(); return m && m.isVisible(); }, null, { timeout: 15000 }).catch(() => {});
    const refus = await p.evaluate(() => { const m = Ext.ComponentQuery.query('displayfield[itemId=typeEtiquetteMessage]').pop(); return { visible: m.isVisible(), texte: String(m.getValue()), fenetre: Ext.ComponentQuery.query('window').some((w) => w.isVisible() && w.down('combobox[itemId=lg_TYPEETIQUETTE_ID]')) }; });
    ok('Sans le droit : refus affiché sous la liste, la fiche reste ouverte, rien n\'est enregistré', refus.visible && /droit/.test(refus.texte) && refus.fenetre
      && q(`SELECT lg_TYPEETIQUETTE_ID FROM t_famille WHERE lg_FAMILLE_ID = '${P}'`) === '2', JSON.stringify(refus));
    await p.context().close();
    droitType.remettre();

    /* avec le droit : enregistre, journal */
    p = await connecter();
    await ouvrirModif();
    await enregistrer('TE_DATAMATRIX');
    for (let i = 0; i < 30 && q(`SELECT lg_TYPEETIQUETTE_ID FROM t_famille WHERE lg_FAMILLE_ID = '${P}'`) !== 'TE_DATAMATRIX'; i++) { await p.waitForTimeout(500); }
    await p.waitForFunction(() => !Ext.ComponentQuery.query('window').some((w) => w.isVisible() && w.down('combobox[itemId=lg_TYPEETIQUETTE_ID]')), null, { timeout: 15000 }).catch(() => {});
    const journal = q(`SELECT CONCAT_WS('|', ancien_type, nouveau_type) FROM t_etiquette_type_journal WHERE lg_FAMILLE_ID = '${P}' AND dt_CREATED >= '${debut}' ORDER BY dt_CREATED DESC LIMIT 1`);
    ok('Avec le droit : type enregistré, noté au journal des types, la fiche se ferme', q(`SELECT lg_TYPEETIQUETTE_ID FROM t_famille WHERE lg_FAMILLE_ID = '${P}'`) === 'TE_DATAMATRIX' && journal === '2|TE_DATAMATRIX', journal);
    const reste = q(`SELECT CONCAT_WS('|', bool_RESERVE, int_SEUIL_MINI_RAYON, int_SEUIL_RESERVE, str_CODE_GEO_ARTICLE, str_CODE_GEO_ARTICLE_RESERVE, int_NUMBERDETAIL) FROM t_famille WHERE lg_FAMILLE_ID = '${P}'`);
    ok('Le reste de la fiche est inchangé (réserve, codes géo, contenance)', reste === '1|4|18|E2E-A12|E2E-R07|' + CONTENANCE, reste);

    /* detail : l'exemple suit le nouveau type (code a deux dimensions) */
    await action(p, 'onDetailClick');
    await p.waitForFunction(() => { const c = Ext.getCmp('detRes_apercu'); return c && c.getEl() && c.getEl().dom.querySelector('.pr-etq-apercu canvas'); }, null, { timeout: 30000 }).catch(() => {});
    const det2 = await p.evaluate(() => { const cv = Ext.getCmp('detRes_apercu').getEl().dom.querySelector('canvas'); return { type: String(Ext.getCmp('detRes_typeEtiquette').getValue()).replace(/<[^>]+>/g, ''), carre: cv ? Math.abs(cv.width - cv.height) <= Math.max(cv.width, cv.height) : false }; });
    ok('Détail : l\'exemple suit le nouveau type (DataMatrix)', /DataMatrix/i.test(det2.type) && det2.carre, JSON.stringify(det2));
    ok('Aucune fenêtre surgissante, aucune erreur JavaScript', dialogues.length === 0 && err.length === 0, dialogues.concat(err).join(' | '));
  } catch (x) {
    ok('Déroulé sans erreur', false, x.message);
  } finally {
    await b.close();
    droitType.remettre();
    remettre();
    ok('Produit remis à l\'identique, données d\'essai retirées', q(`SELECT CONCAT_WS('|', ${COLS.split(', ').map((c) => `IFNULL(${c}, 'NULL')`).join(', ')}) FROM t_famille WHERE lg_FAMILLE_ID = '${P}'`) === ORIGINE
      && q(`SELECT COUNT(*) FROM t_famille_dci WHERE lg_FAMILLE_DCI_ID = '${TSF}'`) === '0' && q(`SELECT COUNT(*) FROM t_type_stock_famille WHERE lg_TYPE_STOCK_FAMILLE_ID = '${TSF}'`) === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
  process.exit(ko ? 1 : 0);
})();
