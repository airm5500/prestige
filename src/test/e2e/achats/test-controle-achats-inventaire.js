/* ETAT DE CONTROLE DES ACHATS : INVENTAIRE D'UN BON (retours du 13/10, point 5).
 *  - un bon de livraison entre en stock RAYON : l'inventaire cree depuis la ligne est un inventaire de l'emplacement
 *    (type « emplacement »), pas un inventaire reserve, et chaque produit y part de son stock rayon ;
 *  - la question puis le resultat s'affichent EN ENTIER dans la page (bandeau), sans fenetre surgissante ;
 *  - « Annuler » ne cree rien.
 * Par l'ecran, admin. Inventaires crees retires a la fin.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
const inventairesDuTest = () => `SELECT lg_INVENTAIRE_ID FROM t_inventaire WHERE dt_CREATED >= '${DEBUT}' AND str_NAME LIKE 'Inventaire%'`;

function retirer() {
  const ids = q(inventairesDuTest()).split('\n').filter(Boolean);
  if (ids.length) {
    const l = ids.map((x) => `'${x}'`).join(',');
    exec(`DELETE FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID IN (${l}); DELETE FROM t_inventaire WHERE lg_INVENTAIRE_ID IN (${l});`);
  }
}

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const dialogues = [];
  try {
    const p = await (await b.newContext({ viewport: { width: 1500, height: 950 } })).newPage();
    p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('etatscontrolemanager', {}));
    /* l'ecran s'ouvre sur la journee, qui peut n'avoir aucun BL (banc, petit matin) : les 30 derniers jours */
    await p.waitForFunction(() => Ext.getCmp('gridID') && Ext.getCmp('datedebut'), null, { timeout: 90000 });
    await p.evaluate(() => { Ext.getCmp('datedebut').setValue(Ext.Date.add(new Date(), Ext.Date.DAY, -30)); Ext.getCmp('datefin').setValue(new Date());
      Ext.ComponentQuery.query('etatscontrolemanager')[0].onRechClick(); });
    await p.waitForFunction(() => { const g = Ext.getCmp('gridID'); return g && !g.getStore().isLoading() && g.getStore().getCount() > 0; }, null, { timeout: 90000 });

    /* premier bon de la grille ayant des lignes */
    const bon = await p.evaluate(() => { const r = Ext.getCmp('gridID').getStore().getAt(0); return { id: r.get('lgBONLIVRAISONID'), ref: r.get('strREFLIVRAISON') }; });
    const attendus = q(`SELECT COUNT(DISTINCT d.lg_FAMILLE_ID) FROM t_bon_livraison_detail d JOIN t_famille_stock s ON s.lg_FAMILLE_ID = d.lg_FAMILLE_ID`
      + ` AND s.lg_EMPLACEMENT_ID = '1' AND s.str_STATUT = 'enable' WHERE d.lg_BON_LIVRAISON_ID = '${bon.id}'`);
    ok('Précondition : un bon avec des produits en stock', Number(attendus) > 0, bon.ref + ' : ' + attendus);

    const icone = async () => { await p.evaluate(() => { const g = Ext.getCmp('gridID'); const col = g.down('[header=INVENT.]') || g.columns.find((c) => c.text === 'INVENT.' || c.header === 'INVENT.');
      const c0 = g.getView().getCell(0, col); const cell = c0.dom || c0; cell.querySelector('img, .x-action-col-icon').setAttribute('data-e2e', 'inv'); });
      await p.click('[data-e2e=inv]'); await p.waitForTimeout(600); };
    const bande = () => p.evaluate(() => { const c = Ext.ComponentQuery.query('etatscontrolemanager #bandeInventaire')[0];
      const visible = !!(c && c.isVisible()); const el = visible ? c.getEl().dom : null;
      return { visible, texte: el ? el.innerText.replace(/\s+/g, ' ').trim() : '', tronque: el ? [...el.querySelectorAll('*')].some((e) => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow === 'hidden') : false,
        boite: Ext.ComponentQuery.query('messagebox').some((m) => m.isVisible()) }; });

    /* 1. Annuler ne cree rien */
    await icone();
    let e = await bande();
    ok('Question affichée dans la page, en entier, sans fenêtre', e.visible && !e.boite && e.texte.includes(bon.ref) && !e.tronque, JSON.stringify(e));
    ok('La question dit que l\'inventaire porte sur le stock rayon', /rayon/i.test(e.texte), e.texte);
    await p.click('etatscontrolemanager #bandeInventaire >> text=Annuler').catch(async () => { await p.evaluate(() => Ext.ComponentQuery.query('etatscontrolemanager #bandeInventaire button[text=Annuler]')[0].btnEl.dom.click()); });
    await p.waitForTimeout(500);
    ok('Annuler : rien n\'est créé, le bandeau disparaît', q(inventairesDuTest()) === '' && !(await bande()).visible);

    /* 2. creation */
    await icone();
    await p.evaluate(() => Ext.ComponentQuery.query('etatscontrolemanager #bandeInventaire #creerInventaire')[0].btnEl.dom.click());
    await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('etatscontrolemanager #bandeInventaire')[0]; return c && /créé|Aucun/.test(c.getEl().dom.innerText); }, null, { timeout: 60000 });
    e = await bande();
    const inv = q(inventairesDuTest()).split('\n').filter(Boolean);
    ok('Un inventaire créé', inv.length === 1, inv.length);
    const [type, empl] = q(`SELECT CONCAT_WS('|', str_TYPE, lg_EMPLACEMENT_ID) FROM t_inventaire WHERE lg_INVENTAIRE_ID = '${inv[0]}'`).split('|');
    ok('Inventaire de l\'emplacement (stock rayon), pas un inventaire réserve', type === 'emplacement' && empl === '1', type + ' / ' + empl);
    ok('Tous les produits du bon y sont', q(`SELECT COUNT(*) FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID = '${inv[0]}'`) === attendus);
    ok('Chaque produit part de son stock rayon', q(`SELECT COUNT(*) FROM t_inventaire_famille i JOIN t_famille_stock s ON s.lg_FAMILLE_ID = i.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'`
      + ` WHERE i.lg_INVENTAIRE_ID = '${inv[0]}' AND i.int_NUMBER_INIT <> s.int_NUMBER_AVAILABLE`) === '0');
    ok('Résultat affiché en entier dans la page, sans fenêtre', e.visible && !e.boite && /Inventaire créé/.test(e.texte) && e.texte.includes(attendus) && !e.tronque, e.texte);
    ok('Aucune fenêtre du navigateur', dialogues.length === 0, dialogues.join(' | '));
  } catch (x) {
    ok('Déroulé sans erreur', false, x.message);
  } finally {
    retirer();
    await b.close();
    ok('Inventaires d\'essai retirés', q(inventairesDuTest()) === '');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
  process.exit(ko ? 1 : 0);
})();
