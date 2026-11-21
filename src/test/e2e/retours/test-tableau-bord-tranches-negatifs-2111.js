/* TABLEAU DE BORD : TOUTE LA JOURNEE DANS « FREQUENTATION », ETAT DU STOCK DEJA FILTRE SUR LES NEGATIFS (plan du 21/11,
 * point 2).
 *
 * Defauts signales :
 *  - « je ne vois pas les heures 0-6h et 22h-24h qd j'ai la tranche 2h ; verifie par des tests on doit avoir les heures
 *    de la journee representees » : l'ecran ne dessinait que les tranches ayant eu une vente ;
 *  - « au clic sur ouvrir etat de stock on doit avoir la requete des negatifs lancee » : l'etat du stock s'ouvrait sur
 *    la liste complete.
 *
 * Vrai ecran d'accueil (preferences remises a la fin), a une date passee qui a des ventes :
 *  1. « Total de la semaine », pour chaque tranche de 1 a 6 h : les tranches couvrent 0 h a 24 h sans trou ni
 *     chevauchement (nombre = arrondi superieur de 24 / pas) ; pour chaque tranche et chaque semaine, la valeur affichee
 *     (bulle de la barre) = somme des heures de la tranche renvoyees par le serveur ; total des tranches = total de la
 *     semaine = base (requete SQL directe) ;
 *  2. alerte « stock négatif » : la fenetre liste les produits ; bouton « Ouvrir l'état du stock » (vrai clic) : l'etat
 *     du stock s'ouvre avec « Inferieur a » et 0 deja poses, la recherche lancee ; nombre de produits = nombre de
 *     l'alerte = base ; chaque ligne affichee a un stock negatif et figure dans la liste de l'alerte ;
 *  3. sans passer par l'alerte, l'etat du stock s'ouvre comme avant (aucun filtre) ;
 *  4. aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { ouvrirMenu } = require('../outils/vues');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).replace(/\r/g, '').trim();

(async () => {
  /* le jour le plus vendu des deux derniers mois de la copie : beaucoup de tranches horaires remplies, d'autres vides */
  const D = q("SELECT DATE(dt_UPDATED) FROM t_preenregistrement WHERE str_STATUT = 'is_Closed' AND int_PRICE > 0 AND b_IS_CANCEL = 0 AND dt_UPDATED >= (SELECT MAX(dt_UPDATED) FROM t_preenregistrement) - INTERVAL 60 DAY AND WEEKDAY(dt_UPDATED) >= 2 GROUP BY DATE(dt_UPDATED) ORDER BY COUNT(*) DESC LIMIT 1");
  const U = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
  const EMPL = q(`SELECT lg_EMPLACEMENT_ID FROM t_user WHERE lg_USER_ID = '${U}'`);
  const prefAvant = q("SELECT COUNT(*) FROM t_preference_utilisateur WHERE lg_USER_ID = '" + U + "' AND str_CLE = 'tableau-bord'") === '1'
    ? q("SELECT txt_VALEUR FROM t_preference_utilisateur WHERE lg_USER_ID = '" + U + "' AND str_CLE = 'tableau-bord'") : null;
  q("DELETE FROM t_preference_utilisateur WHERE lg_USER_ID = '" + U + "' AND str_CLE = 'tableau-bord'");
  const lundi = q(`SELECT DATE_SUB('${D}', INTERVAL WEEKDAY('${D}') DAY)`);
  const lundiAvant = q(`SELECT DATE_SUB('${lundi}', INTERVAL 7 DAY)`);
  const ventesSql = (deb, fin) => +q(`SELECT COUNT(*) FROM t_preenregistrement o WHERE o.int_PRICE > 0 AND o.str_STATUT = 'is_Closed' AND o.b_IS_CANCEL = 0 AND o.lg_TYPE_VENTE_ID <> '5' AND o.dt_UPDATED >= '${deb}' AND o.dt_UPDATED < ${fin}`);
  const totalSemaine = ventesSql(lundi, `DATE_ADD('${D}', INTERVAL 1 DAY)`), totalAvant = ventesSql(lundiAvant, `'${lundi}'`);
  const NEG = q(`SELECT f.int_CIP FROM t_famille_stock s JOIN t_famille f ON f.lg_FAMILLE_ID = s.lg_FAMILLE_ID WHERE s.lg_EMPLACEMENT_ID = '${EMPL}' AND s.int_NUMBER_AVAILABLE < 0 AND f.str_STATUT = 'enable'`).split('\n').filter(Boolean);
  ok('Précondition : une date avec des ventes (' + D + '), des produits en stock négatif (' + NEG.length + ')', !!D && totalSemaine > 0 && NEG.length > 0, totalSemaine + ' ventes');

  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  let etape = 'connexion';
  try {
    await p.goto((process.env.BASE || 'http://localhost:8080/prestige') + '/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app && testextjs.view.tableaubord && Ext.ComponentQuery.query('tableaubord').length, null, { timeout: 90000 });
    await p.evaluate((d) => { testextjs.view.tableaubord.TableauBord.dateForcee = d; const t = Ext.ComponentQuery.query('tableaubord')[0]; t.body.dom.scrollTop = 0; t.chargerPreferences(() => t.construire()); }, D);
    await p.waitForFunction(() => { const v = Ext.ComponentQuery.query('tableaubord')[0].body.dom.querySelector('[data-tuile="ca"] .tb-v'); return v && v.textContent !== '…'; }, null, { timeout: 60000 });
    await p.waitForTimeout(2000);
    const fq = await p.evaluate(async (d) => (await fetch('../api/v1/tableau-bord/frequentation?date=' + d)).json(), D);
    ok('Serveur : 24 heures par semaine, total = base (semaine en cours ' + totalSemaine + ', précédente ' + totalAvant + ')',
      fq.semaine.ventesH.length === 24 && fq.semaine.ventesH.reduce((s, x) => s + x, 0) === totalSemaine && fq.precedente.ventesH.reduce((s, x) => s + x, 0) === totalAvant,
      fq.semaine.ventesH.join(','));

    /* 1. toutes les tranches, de 0 h a 24 h */
    etape = 'frequentation';
    await p.evaluate(() => { document.querySelector('[data-carte="frequentation"]').scrollIntoView(); });
    await p.waitForFunction(() => document.querySelector('[data-corps="frequentation"] svg'), null, { timeout: 30000 });
    await p.click('[data-seg="freq"] [data-v="total"]');
    await p.waitForTimeout(300);
    for (const n of [1, 2, 3, 4, 5, 6]) {
      await p.selectOption('[data-tranche]', String(n));
      await p.waitForTimeout(300);
      const vue = await p.evaluate(() => {
        const svg = document.querySelector('[data-corps="frequentation"] svg');
        const lib = Array.from(svg.querySelectorAll('text')).map((t) => t.textContent).filter((t) => /^\d+h-\d+h$/.test(t));
        const bulles = Array.from(svg.querySelectorAll('rect title')).map((t) => t.textContent);
        return { lib, bulles };
      });
      const attendues = []; for (let k = 0; k < Math.ceil(24 / n); k++) { attendues.push((k * n) + 'h-' + Math.min(24, k * n + n) + 'h'); }
      ok('Tranche de ' + n + ' h : ' + attendues.length + ' tranches de 0h à 24h, sans trou ni chevauchement', JSON.stringify(vue.lib) === JSON.stringify(attendues), JSON.stringify(vue.lib));
      const somme = (h, k) => h.slice(k * n, Math.min(24, k * n + n)).reduce((s, x) => s + x, 0);
      const ecarts = [];
      let totS = 0, totP = 0;
      attendues.forEach((t, k) => {
        const bs = vue.bulles.find((x) => x.startsWith('Semaine en cours, ' + t + ' : '));
        const bp = vue.bulles.find((x) => x.startsWith('Semaine précédente, ' + t + ' : '));
        const vs = bs ? +bs.split(' : ')[1].split(' ')[0].replace(/[^\d]/g, '') : NaN;
        const vp = bp ? +bp.split(' : ')[1].split(' ')[0].replace(/[^\d]/g, '') : NaN;
        totS += vs; totP += vp;
        if (vs !== somme(fq.semaine.ventesH, k) || vp !== somme(fq.precedente.ventesH, k)) { ecarts.push(t + ' : ' + vs + '/' + somme(fq.semaine.ventesH, k) + ' ' + vp + '/' + somme(fq.precedente.ventesH, k)); }
      });
      ok('Tranche de ' + n + ' h : chaque barre = somme de ses heures (deux semaines), totaux = base', ecarts.length === 0 && totS === totalSemaine && totP === totalAvant, ecarts.join(' ; ') || totS + ' / ' + totP);
    }
    await p.selectOption('[data-tranche]', '2');

    /* 2. alerte stock negatif -> etat du stock filtre */
    etape = 'alerte';
    await p.evaluate(() => { document.querySelector('[data-carte="alertes"]').scrollIntoView(); });
    await p.waitForFunction(() => document.querySelector('[data-corps="alertes"] [data-liste="negatifs"]'), null, { timeout: 30000 });
    await p.click('[data-corps="alertes"] [data-liste="negatifs"]');
    await p.waitForFunction(() => { let v = false; Ext.WindowManager.each((w) => { if (w.isVisible() && /négatif/i.test(w.title || '')) v = true; }); return v; }, null, { timeout: 30000 });
    const cipsAlerte = await p.evaluate(() => { let r = []; Ext.WindowManager.each((w) => { if (w.isVisible() && /négatif/i.test(w.title || '')) { r = Array.from(w.body.dom.querySelectorAll('tr')).slice(1).map((tr) => tr.children[1].textContent.trim()); } }); return r; });
    ok('Fenêtre « Articles en stock négatif » : mêmes produits que la base', JSON.stringify(cipsAlerte.slice().sort()) === JSON.stringify(NEG.slice().sort()), cipsAlerte.length + ' / ' + NEG.length);
    const bouton = p.locator('.x-window').filter({ visible: true, hasText: 'stock négatif' }).locator('.x-btn').filter({ hasText: 'Ouvrir l\'état du stock' }).first();
    await bouton.click();
    etape = 'etat du stock';
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('etatstock')[0]; return g && g.isVisible(true) && !g.getStore().isLoading() && g.getStore().lastOptions; }, null, { timeout: 60000 });
    await p.waitForTimeout(800);
    const es = await p.evaluate(() => { const g = Ext.ComponentQuery.query('etatstock')[0], s = g.getStore();
      return { filtre: Ext.getCmp('str_TYPE_TRANSACTION').getValue(), qte: Ext.getCmp('int_NUMBER').getValue(), total: s.getTotalCount(),
        lignes: s.getRange().map((r) => ({ cip: String(r.get('int_CIP')), stock: Number(r.get('int_NUMBER')) })) }; });
    ok('État du stock ouvert depuis l\'alerte : « Inférieur à » et 0 déjà posés', es.filtre === 'LESS' && String(es.qte) === '0', JSON.stringify({ f: es.filtre, q: es.qte }));
    ok('État du stock : recherche lancée, ' + NEG.length + ' produit(s) = nombre de l\'alerte = base', es.total === NEG.length, es.total + ' / ' + NEG.length);
    ok('État du stock : chaque ligne a un stock négatif et figure dans l\'alerte', es.lignes.length > 0 && es.lignes.every((l) => l.stock < 0 && NEG.includes(l.cip)), JSON.stringify(es.lignes.slice(0, 3)));

    /* 3. ouverture ordinaire : aucun filtre */
    etape = 'ouverture ordinaire';
    await ouvrirMenu(p, 'GESTION DE STOCK', 'Etat de stock').catch(async () => {
      await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('etatstock', 'Etat de stock', ''));
    });
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('etatstock')[0]; return g && g.isVisible(true) && !g.getStore().isLoading() && g.getStore().getTotalCount() > 0; }, null, { timeout: 60000 });
    const es2 = await p.evaluate(() => ({ filtre: Ext.getCmp('str_TYPE_TRANSACTION').getValue(), total: Ext.ComponentQuery.query('etatstock')[0].getStore().getTotalCount() }));
    ok('Ouverture ordinaire de l\'état du stock : aucun filtre, liste complète (comme avant)', !es2.filtre && es2.total > NEG.length, JSON.stringify(es2));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Parcours sans exception (étape ' + etape + ')', false, e.stack);
  } finally {
    await b.close();
    q("DELETE FROM t_preference_utilisateur WHERE lg_USER_ID = '" + U + "' AND str_CLE = 'tableau-bord'");
    if (prefAvant !== null) { q("INSERT INTO t_preference_utilisateur (lg_USER_ID, str_CLE, txt_VALEUR, dt_UPDATED) VALUES ('" + U + "', 'tableau-bord', '" + prefAvant.replace(/'/g, "''") + "', NOW())"); }
    ok('Nettoyage : préférences du tableau de bord remises', (q("SELECT COUNT(*) FROM t_preference_utilisateur WHERE lg_USER_ID = '" + U + "' AND str_CLE = 'tableau-bord'") === '1') === (prefAvant !== null));
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
