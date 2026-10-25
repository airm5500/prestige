/* INVENTAIRE PARTIEL PAR LETTRES (besoins du 11/10, point 15), par l'ecran de creation :
 * un emplacement (ex. COLLYRES ET GOUTTES AURICULAIRES), produits de la lettre F a M, puis de A a E ; compare a
 * l'inventaire complet du meme emplacement cree par le meme ecran : memes produits, filtres sur la 1re lettre du nom.
 * Champ masque pour un inventaire de reserve ; intervalle a l'envers refuse. Inventaires d'essai retires a la fin.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN'], { input: s, encoding: 'utf8' }).trim();
const LOGIN = process.env.E2E_LOGIN || 'admin';
const EMP = q(`SELECT lg_EMPLACEMENT_ID FROM t_user WHERE str_LOGIN = '${LOGIN}'`);
const [ZONE, LIB] = q(`SELECT z.lg_ZONE_GEO_ID, z.str_LIBELLEE FROM t_famille f JOIN t_zone_geographique z ON z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID
  JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '${EMP}' WHERE f.str_STATUT = 'enable'
  GROUP BY z.lg_ZONE_GEO_ID HAVING SUM(UPPER(LEFT(TRIM(f.str_NAME), 1)) BETWEEN 'F' AND 'M') > 2
  AND SUM(UPPER(LEFT(TRIM(f.str_NAME), 1)) BETWEEN 'A' AND 'E') > 2 ORDER BY COUNT(*) LIMIT 1`).split('\t');
const NOMS = ['E2E-LETTRES-TOUT', 'E2E-LETTRES-F-M', 'E2E-LETTRES-A-E'];
const nettoyer = () => q(`DELETE i FROM t_inventaire_famille i JOIN t_inventaire v ON v.lg_INVENTAIRE_ID = i.lg_INVENTAIRE_ID WHERE v.str_NAME LIKE 'E2E-LETTRES-%';
  DELETE FROM t_inventaire WHERE str_NAME LIKE 'E2E-LETTRES-%';`);
const produits = (nom) => q(`SELECT f.str_NAME FROM t_inventaire_famille i JOIN t_inventaire v ON v.lg_INVENTAIRE_ID = i.lg_INVENTAIRE_ID
  JOIN t_famille f ON f.lg_FAMILLE_ID = i.lg_FAMILLE_ID WHERE v.str_NAME = '${nom}' ORDER BY f.lg_FAMILLE_ID`).split('\n').filter(Boolean);

(async () => {
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await (await b.newContext({ viewport: { width: 1500, height: 950 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  /* creation par l'ecran : type Emplacement, emplacement coche, lettres, bouton « Creer l'inventaire » */
  const creer = async (nom, debut, fin, attendu = 'Infos') => {
    await p.evaluate(() => Ext.ComponentQuery.query('inventaire')[0].onAddClick());
    await p.waitForFunction(() => { try { const c = Ext.ComponentQuery.query('inventaireselectioncriteres')[0]; return !!(c && c.rendered && c.up('window').down('#lettreDebut')); } catch (e) { return false; } }, null, { timeout: 15000 });
    await p.waitForTimeout(800);
    await p.evaluate(([nom, zone, lib, debut, fin]) => {
      const w = Ext.ComponentQuery.query('inventaireselectioncriteres')[0].up('window');
      Ext.getCmp('str_NAME').setValue(nom);
      const t = Ext.getCmp('str_TYPE_TRANSACTION'); t.setValue('Emplacement'); t.fireEvent('select', t);
      const pan = w.down('inventaireselectioncriteres'); pan.selection = {}; pan.selection[zone] = lib;
      if (debut) { w.down('#lettreDebut').setValue(debut); }
      if (fin) { w.down('#lettreFin').setValue(fin); }
      w.query('button').filter((x) => /er l.inventaire/.test(x.text))[0].btnEl.dom.click();
    }, [nom, ZONE, LIB, debut, fin]);
    await p.waitForFunction((t) => Ext.MessageBox.isVisible() && Ext.MessageBox.title === t, attendu, { timeout: 120000 });
    const msg = await p.evaluate(() => Ext.MessageBox.msg.getEl().dom.innerText);
    await p.evaluate(() => Ext.MessageBox.hide());
    await p.evaluate(() => { try { const c = Ext.ComponentQuery.query('inventaireselectioncriteres')[0]; if (c) { c.up('window').close(); } } catch (e) { /* deja fermee */ } });
    return msg;
  };
  try {
    ok('Précondition : emplacement avec des produits de A à E et de F à M', !!ZONE, LIB);
    nettoyer();
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForLoadState('networkidle').catch(() => {});
    await p.waitForTimeout(3000);
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('inventaire', 'Inventaire', ''));
    await p.waitForFunction(() => Ext.ComponentQuery.query('inventaire').length > 0, null, { timeout: 30000 });

    await creer(NOMS[0], null, null);
    const tout = produits(NOMS[0]);
    ok('Inventaire complet de l\'emplacement créé (référence)', tout.length > 4, tout.length);
    const m1 = await creer(NOMS[1], 'F', 'M');
    const fm = produits(NOMS[1]);
    const attenduFM = tout.filter((n) => { const l = n.trim().charAt(0).toUpperCase(); return l >= 'F' && l <= 'M'; });
    ok('De F à M : seulement les produits F à M de l\'emplacement', fm.length === attenduFM.length && fm.every((n, i) => n === attenduFM[i]), fm.length + ' / ' + attenduFM.length);
    ok('Message : nombre d\'articles inventoriés', new RegExp(fm.length + ' article').test(m1), m1);
    await creer(NOMS[2], 'A', 'E');
    const ae = produits(NOMS[2]);
    ok('Puis de A à E : produits A à E, aucun en commun avec F à M', ae.length > 0 && ae.every((n) => { const l = n.trim().charAt(0).toUpperCase(); return l >= 'A' && l <= 'E'; })
      && !ae.some((n) => fm.includes(n)), ae.length);
    /* intervalle a l'envers : refuse avant envoi */
    await p.evaluate(() => Ext.ComponentQuery.query('inventaire')[0].onAddClick());
    await p.waitForFunction(() => { try { const c = Ext.ComponentQuery.query('inventaireselectioncriteres')[0]; return !!(c && c.rendered && c.up('window').down('#lettreDebut')); } catch (e) { return false; } }, null, { timeout: 15000 });
    await p.waitForTimeout(800);
    const refus = await p.evaluate(() => {
      const w = Ext.ComponentQuery.query('inventaireselectioncriteres')[0].up('window');
      Ext.getCmp('str_NAME').setValue('E2E-LETTRES-ENVERS');
      const t = Ext.getCmp('str_TYPE_TRANSACTION'); t.setValue('Emplacement'); t.fireEvent('select', t);
      w.down('#lettreDebut').setValue('M'); w.down('#lettreFin').setValue('F');
      w.query('button').filter((x) => /er l.inventaire/.test(x.text))[0].btnEl.dom.click();
      return Ext.MessageBox.isVisible() ? Ext.MessageBox.msg.getEl().dom.innerText : '';
    });
    ok('Intervalle à l\'envers (M à F) : refus clair', /précéder/.test(refus), refus);
    await p.evaluate(() => Ext.MessageBox.hide());
    const masque = await p.evaluate(() => { const w = Ext.ComponentQuery.query('inventaireselectioncriteres')[0].up('window');
      const t = Ext.getCmp('str_TYPE_TRANSACTION'); t.setValue('Reserve'); t.fireEvent('select', t); return w.down('#lettresNom').isHidden(); });
    ok('Inventaire de réserve : champ « Lettres du nom » masqué', masque);
    ok('Aucun inventaire créé pour l\'intervalle refusé', q("SELECT COUNT(*) FROM t_inventaire WHERE str_NAME = 'E2E-LETTRES-ENVERS'") === '0');
    ok('Aucune erreur de page', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('deroulement', false, e.stack);
  } finally {
    nettoyer();
    await b.close();
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' verifications');
    process.exit(ko ? 1 : 0);
  }
})();
