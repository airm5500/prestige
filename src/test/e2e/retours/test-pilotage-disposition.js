/* PILOTAGE, rangement des tuiles et des cartes (retours du 12/10), comme le tableau de bord.
 *  - onglet « À suivre » : glisser une tuile, glisser une carte par son titre ; ordre enregistre pour
 *    l'utilisateur et retrouve a la reouverture du menu ; « Disposition par défaut » remet l'ordre d'origine ;
 *  - onglet « KPI Analyse » : glisser une tuile d'indicateur, ordre retrouve, « Ordre par défaut ».
 * La preference de disposition de l'admin est retiree a la fin (si elle n'existait pas avant).
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const SORTIE = process.env.SORTIE || ENV_E2E.TMP;
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const AVANT = q("SELECT COUNT(*) FROM t_preference_utilisateur WHERE lg_USER_ID = '" + ADMIN + "' AND str_CLE = 'pilotage.disposition'");
const nettoyer = () => { if (AVANT === '0') { q("DELETE FROM t_preference_utilisateur WHERE lg_USER_ID = '" + ADMIN + "' AND str_CLE = 'pilotage.disposition'"); } };

(async () => {
  nettoyer();
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const api = (u) => p.evaluate(async (u) => JSON.parse(await (await fetch(u)).text()), u);
  const ouvrir = async () => {
    await p.evaluate(() => { const e = Ext.ComponentQuery.query('pilotage')[0]; if (e) { e.destroy(); } testextjs.app.getController('App').onLoadNewComponent('pilotage', 'Pilotage', ''); });
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('pilotage')[0]; return e && e.stores.synthese.mois.getCount() > 0; }, null, { timeout: 120000 });
    await p.waitForTimeout(1500);
  };
  const onglet = async (cle, attente) => {
    await p.evaluate((cle) => { const t = Ext.ComponentQuery.query('pilotage #onglets')[0]; t.setActiveTab(t.down('#onglet-' + cle)); }, cle);
    await p.waitForFunction((cle) => Ext.ComponentQuery.query('pilotage')[0].stores[cle].tuiles.getCount() > 0, cle, { timeout: 120000 });
    await p.waitForTimeout(attente || 1500);
  };
  const tuiles = (zone) => p.evaluate((zone) => [...document.querySelectorAll(zone + ' .pilotage-tuile')].map((t) => t.getAttribute('data-cle')).join(','), zone);
  const cartes = () => p.evaluate(() => [...document.querySelectorAll('.sv-carte')].map((c) => c.getAttribute('data-carte')).join(','));
  const dispo = async () => (await api('../api/v1/preferences/pilotage.disposition')).valeur;
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForLoadState('networkidle'); await p.waitForTimeout(3000);
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app && Ext.ComponentQuery.query('navigation').length, null, { timeout: 120000 });
    await ouvrir();

    /* ------------------------------------------------ A suivre */
    await onglet('asuivre', 4000);
    const t0 = await tuiles('.pilotage-tuiles-suivi'), c0 = await cartes();
    ok('Ordre d\'origine des tuiles et des cartes', t0 === 'rotation,tauxRupture,evolPanier,rupturesVendus,rateesACommander,margeNegative,peremption'
      && c0 === 'alertes,frequentation,ca,encaisse,achats,tva,marge,panier,emplacements,familles', t0 + ' | ' + c0);
    const aide = await p.evaluate(() => document.querySelector('.sv-aide').textContent);
    ok('Le bandeau dit comment ranger (glisser) et propose la disposition par défaut', /Glissez les tuiles/.test(aide) && /Disposition par défaut/.test(aide), aide);
    await p.dragAndDrop('.pilotage-tuiles-suivi .pilotage-tuile[data-cle="peremption"]', '.pilotage-tuiles-suivi .pilotage-tuile[data-cle="rotation"]');
    await p.waitForTimeout(1200);
    const t1 = await tuiles('.pilotage-tuiles-suivi');
    ok('Glisser « Péremptions » sur la première tuile : elle passe en tête', /^peremption,rotation,/.test(t1), t1);
    /* deux cartes visibles ensemble (un defilement entre l'appui et le deplacement fausserait la source) */
    await p.evaluate(() => document.querySelector('.sv-carte[data-carte="alertes"]').scrollIntoView());
    await p.dragAndDrop('.sv-carte[data-carte="frequentation"] .sv-titre', '.sv-carte[data-carte="alertes"] .sv-titre');
    await p.waitForTimeout(1200);
    const c1 = await cartes();
    ok('Glisser la carte « Fréquentation » par son titre sur « Alertes » : elle passe en tête', /^frequentation,alertes,ca,/.test(c1), c1);
    await p.dragAndDrop('.sv-carte[data-carte="ca"] .sv-corps', '.sv-carte[data-carte="alertes"] .sv-titre').catch(() => {});
    await p.waitForTimeout(800);
    ok('Une carte ne se déplace pas depuis son contenu (graphiques, sélecteurs restent utilisables)', (await cartes()) === c1, await cartes());
    const d1 = await dispo();
    ok('Disposition enregistrée pour l\'utilisateur', d1 && /^peremption,rotation/.test((d1.tuiles.asuivre || []).join(',')) && /^frequentation,alertes/.test((d1.cartes || []).join(',')), JSON.stringify(d1));
    await p.screenshot({ path: SORTIE + '/pilotage-disposition.png' });

    /* ------------------------------------------------ KPI */
    await onglet('kpi');
    const k0 = await tuiles('.pilotage-onglet-kpi');
    await p.dragAndDrop('.pilotage-onglet-kpi .pilotage-tuile[data-cle="panier"]', '.pilotage-onglet-kpi .pilotage-tuile[data-cle="caTTC"]');
    await p.waitForTimeout(1200);
    const k1 = await tuiles('.pilotage-onglet-kpi');
    ok('KPI : glisser « Panier moyen » en tête (' + k0 + ')', k0 === 'caTTC,nbVentes,panier' && k1 === 'panier,caTTC,nbVentes', k1);

    /* ------------------------------------------------ reouverture */
    await ouvrir();
    await onglet('asuivre', 4000);
    const t2 = await tuiles('.pilotage-tuiles-suivi'), c2 = await cartes();
    ok('Menu rouvert : tuiles et cartes d\'« À suivre » dans l\'ordre choisi', t2 === t1 && c2 === c1, t2 + ' | ' + c2);
    await onglet('kpi');
    ok('Menu rouvert : tuiles des KPI dans l\'ordre choisi', (await tuiles('.pilotage-onglet-kpi')) === 'panier,caTTC,nbVentes', await tuiles('.pilotage-onglet-kpi'));
    await p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('pilotage #ordreKpiDefaut')[0].getId()));
    await p.waitForFunction(() => [...document.querySelectorAll('.pilotage-onglet-kpi .pilotage-tuile')].map((t) => t.getAttribute('data-cle')).join(',') === 'caTTC,nbVentes,panier', null, { timeout: 60000 });
    ok('KPI « Ordre par défaut » : retour à l\'ordre des cases cochées', true);
    await onglet('asuivre', 3000);
    await p.click('.sv-aide button[data-defaut]');
    await p.waitForFunction(() => [...document.querySelectorAll('.pilotage-tuiles-suivi .pilotage-tuile')].map((t) => t.getAttribute('data-cle'))[0] === 'rotation', null, { timeout: 60000 });
    const t3 = await tuiles('.pilotage-tuiles-suivi'), c3 = await cartes();
    await p.waitForTimeout(1000);
    const d3 = await dispo();
    ok('« Disposition par défaut » : ordre d\'origine des tuiles et des cartes, préférence remise à zéro', t3 === t0 && c3 === c0 && !d3.cartes && !d3.tuiles.asuivre && !d3.tuiles.kpi, t3 + ' | ' + c3 + ' | ' + JSON.stringify(d3));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Déroulé sans exception', false, e.stack);
  } finally {
    await b.close();
    nettoyer();
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
