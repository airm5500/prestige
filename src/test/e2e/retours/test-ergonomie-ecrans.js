/* ERGONOMIE DE TOUS LES ECRANS DU MENU (test de mise en page, independant des donnees), demande du 07/10.
 *
 * Pourquoi : un ecran peut fonctionner et rester penible a utiliser : un bouton coupe au bord de la barre (« Créer un
 * inv… » dans Analyse article), un libelle tronque (« Emplacemen »), un libelle sur deux lignes qui decale la barre.
 * Les essais fonctionnels ne le voient pas.
 *
 * Pour chaque ecran du menu (fenetre de 1366 x 768, la plus courante en officine), chaque onglet :
 *   1. aucun element d'une barre d'outils ne depasse le bord droit de la barre (rien de coupe ni de cache) ;
 *   2. aucun libelle de champ n'est tronque (texte plus large que sa place) ;
 *   3. aucun bouton n'a son texte coupe.
 * Le test n'ecrit rien. Les ecrans d'action (vente en cours...) ont leurs propres essais.
 *
 * Variables : ECRANS=xtype1,xtype2 pour limiter ; RAPIDE=1 sans les onglets ; LARGEUR / HAUTEUR de la fenetre.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const q = (sql) => execFileSync('mariadb', ['--default-character-set=utf8mb4', process.env.DB_TEST || 'capitale', '-sN', '-e', sql], { encoding: 'utf8' }).trim();

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const EXCLUS = ['doventemanager', 'ventemanager_new', 'ouverturecaissemanger', 'ventedepot', 'tableaubord', 'dashboard',
  'mainmenumanager', 'supportcontact', 'preenregistrementmanager_new', 'kobysky'];

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: Number(process.env.LARGEUR || 1366), height: Number(process.env.HAUTEUR || 768) } })).newPage();
  p.setDefaultTimeout(20000);
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app && Ext.ComponentQuery.query('navigation').length
      && Ext.ComponentQuery.query('navigation')[0].getStore()._menuCharge, null, { timeout: 120000 });
    await p.waitForTimeout(2000);
    let ecrans = q("SELECT s.str_COMPOSANT, MIN(s.str_VALUE) FROM t_sous_menu s JOIN t_menu m ON m.lg_MENU_ID = s.lg_MENU_ID"
      + " WHERE s.str_Status = 'enable' AND m.str_Status = 'enable' AND COALESCE(s.str_COMPOSANT, '') <> '' GROUP BY s.str_COMPOSANT ORDER BY s.str_COMPOSANT")
      .split('\n').filter(Boolean).map((l) => l.split('\t'));
    const connus = await p.evaluate((l) => l.filter((x) => !!Ext.ClassManager.getByAlias('widget.' + x)), ecrans.map((e) => e[0]));
    ecrans = ecrans.filter((e) => connus.includes(e[0]) && !EXCLUS.includes(e[0]));
    if (process.env.ECRANS) { const v = process.env.ECRANS.split(','); ecrans = ecrans.filter((e) => v.includes(e[0])); }
    console.log(ecrans.length + ' écrans à parcourir');
    const defauts = { barres: [], libelles: [], boutons: [] };
    let rang = 0;
    for (const [xtype, titre] of ecrans) {
      if (++rang % 20 === 0) { console.log('  ... ' + rang + ' / ' + ecrans.length); }
      try {
        await p.evaluate(([x, t]) => { Ext.WindowManager.each((w) => { if (w.isVisible() && w.close && w !== Ext.Msg) { try { w.close(); } catch (e) { /* */ } } }); testextjs.app.getController('App').onLoadNewComponent(x, t, ''); }, [xtype, titre]);
        await p.waitForTimeout(2000);
        const onglets = await p.evaluate((x) => { const e = Ext.ComponentQuery.query(x)[0]; if (!e) { return null; }
          const tps = (e.isXType('tabpanel') ? [e] : []).concat(e.query('tabpanel')); const l = [];
          tps.forEach((tp, i) => tp.items.each((it, j) => l.push([i, j, it.title || ('onglet ' + j)]))); return l; }, xtype);
        if (onglets === null) { continue; }
        for (const o of (onglets.length && !process.env.RAPIDE ? onglets : [null])) {
          if (o) {
            await p.evaluate(([x, i, j]) => { const e = Ext.ComponentQuery.query(x)[0]; const tps = (e.isXType('tabpanel') ? [e] : []).concat(e.query('tabpanel'));
              if (tps[i] && tps[i].items.getAt(j)) { tps[i].setActiveTab(j); } }, [xtype, o[0], o[1]]);
            await p.waitForTimeout(700);
          }
          const r = await p.evaluate((x) => {
            const e = Ext.ComponentQuery.query(x)[0];
            const visible = (c) => c.rendered && c.isVisible(true) && c.getEl() && c.getEl().dom.offsetWidth > 0;
            const sortie = { barres: [], libelles: [], boutons: [] };
            /* 1. barres d'outils : un element au-dela du bord droit (ou cache par le debordement) */
            e.query('toolbar').filter(visible).forEach((tb) => {
              const rb = tb.getEl().dom.getBoundingClientRect();
              tb.items.each((it) => {
                if (!it.rendered || !it.getEl() || it.hidden) { return; }
                const ri = it.getEl().dom.getBoundingClientRect();
                if (ri.width > 0 && ri.right > rb.right + 2) {
                  sortie.barres.push((it.text || it.fieldLabel || it.emptyText || it.itemId || it.xtype) + ' dépasse de ' + Math.round(ri.right - rb.right) + ' px');
                }
              });
            });
            /* 2. libelles de champ tronques ou passes a la ligne */
            e.query('field').filter(visible).forEach((f) => {
              if (!f.labelEl || f.hideLabel || !f.fieldLabel) { return; }
              const el = f.labelEl.dom;
              const style = getComputedStyle(el);
              if (el.scrollWidth > el.clientWidth + 1 && style.overflow !== 'visible') { sortie.libelles.push('« ' + f.fieldLabel + ' » tronqué'); }
              else if (el.offsetHeight > parseFloat(style.lineHeight || 16) * 1.6 + 6 && f.labelAlign !== 'top') { sortie.libelles.push('« ' + f.fieldLabel + ' » sur deux lignes'); }
            });
            /* 3. texte de bouton coupe */
            e.query('button').filter(visible).forEach((bt) => {
              const t = bt.btnInnerEl && bt.btnInnerEl.dom;
              if (t && bt.text && t.scrollWidth > t.clientWidth + 2) { sortie.boutons.push('« ' + bt.text + ' » coupé'); }
            });
            return sortie;
          }, xtype);
          const lieu = xtype + (o ? ' › ' + o[2] : '');
          r.barres.forEach((x) => defauts.barres.push(lieu + ' : ' + x));
          r.libelles.forEach((x) => defauts.libelles.push(lieu + ' : ' + x));
          r.boutons.forEach((x) => defauts.boutons.push(lieu + ' : ' + x));
        }
      } catch (e) {
        console.log('  (écran ' + xtype + ' : ' + String(e.message).split('\n')[0].slice(0, 100) + ')');
      }
    }
    for (const [k, l] of Object.entries(defauts)) { [...new Set(l)].forEach((x) => console.log('  ✗ [' + k + '] ' + x)); }
    ok('Aucun élément de barre d\'outils coupé au bord de l\'écran', defauts.barres.length === 0, defauts.barres.length + ' défaut(s)');
    ok('Aucun libellé de champ tronqué ou sur deux lignes', defauts.libelles.length === 0, defauts.libelles.length + ' défaut(s)');
    ok('Aucun texte de bouton coupé', defauts.boutons.length === 0, defauts.boutons.length + ' défaut(s)');
  } catch (e) {
    ok('Déroulé sans exception', false, e.stack);
  } finally {
    await b.close();
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
