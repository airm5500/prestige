/* MENU « ACTIVITE DES EQUIPES », ONGLET « ANALYSES » (demande du 13/10).
 *
 * Par les vues : ANALYSE DE GESTION > « Activité des équipes », bouton « Analyses », periode de septembre 2026
 * saisie au clavier, Actualiser.
 *  - tuiles : ventes encaissees et BL entres egaux a la base (requetes independantes), fleches d'evolution presentes ;
 *  - constats d'aide a la decision affiches ;
 *  - les 8 graphiques sont dessines (series non vides), la carte d'affluence a 7 lignes ;
 *  - survol d'une barre : l'infobulle s'affiche avec le detail ;
 *  - clic sur la barre d'un operateur : la liste « Employé » prend sa valeur, les tuiles ne comptent que ses ventes ;
 *  - ergonomie : chaque graphique a son aide « ? », la page defile, aucune erreur JavaScript ;
 *  - droit : un profil sans le menu recoit 403 sur la route des analyses.
 * Aucune donnee creee hors du compte sans droit, retire a la fin.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer, saisir } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const D = '2026-09-01', F = '2026-10-01';
const VENTES = (emp) => q(`SELECT COUNT(*) FROM t_preenregistrement p WHERE p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0`
  + ` AND p.lg_TYPE_VENTE_ID <> '5' AND p.dt_UPDATED >= '${D}' AND p.dt_UPDATED < '${F}'` + (emp ? ` AND p.lg_USER_ID = '${emp}'` : '')
  + ` AND EXISTS (SELECT 1 FROM t_preenregistrement_detail d WHERE d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID)`);
const BL = q(`SELECT COUNT(*) FROM t_bon_livraison b WHERE b.str_STATUT = 'is_Closed' AND b.dt_CREATED >= '${D}' AND b.dt_CREATED < '${F}'`
  + ` AND EXISTS (SELECT 1 FROM t_order o WHERE o.lg_ORDER_ID = b.lg_ORDER_ID)`
  + ` AND EXISTS (SELECT 1 FROM t_bon_livraison_detail d WHERE d.lg_BON_LIVRAISON_ID = b.lg_BON_LIVRAISON_ID)`);
const ID = 'E2E-AE-SANS2', LOGIN = 'e2e-ae-sans2', MDP = 'E2e-Ae-Sans-8';
const ROLE_VENDEUR = q("SELECT lg_ROLE_ID FROM t_role WHERE str_NAME = 'Vendeur'");
const retirer = () => q(`DELETE FROM t_role_user WHERE lg_USER_ID = '${ID}'; DELETE FROM t_event_log WHERE lg_USER_ID = '${ID}'; DELETE FROM t_user WHERE lg_USER_ID = '${ID}'`);

(async () => {
  retirer();
  q(`INSERT INTO t_user (lg_USER_ID, str_LOGIN, str_PASSWORD, str_FIRST_NAME, str_LAST_NAME, str_FUNCTION, str_STATUT, lg_EMPLACEMENT_ID, dt_CREATED, int_CONNEXION)`
    + ` VALUES ('${ID}', '${LOGIN}', MD5('${MDP}'), 'E2E', 'SANS DROIT', 'Vendeur', 'enable', '1', NOW(), 0)`);
  q(`INSERT INTO t_role_user (lg_USER_ROLE_ID, lg_ROLE_ID, lg_USER_ID, dt_CREATED) VALUES ('${ID}', '${ROLE_VENDEUR}', '${ID}', NOW())`);
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const attendre = () => p.waitForFunction(() => { const a = Ext.ComponentQuery.query('activiteequipes')[0].analyses;
    return a.rendered && !(a.loadMask && a.loadMask.isVisible()) && document.querySelectorAll('.ae-tuile').length > 0; }, null, { timeout: 180000 })
    .then(() => p.waitForTimeout(1200));
  const tuiles = () => p.evaluate(() => Array.from(document.querySelectorAll('.ae-tuile')).reduce((o, e) => {
    o[e.getAttribute('data-code')] = { v: e.querySelector('.v').textContent.replace(/[^\d,]/g, ''), e: e.querySelector('.e').className }; return o; }, {}));
  try {
    await connexion(p, 'admin', 'e2etest');
    await ouvrirMenu(p, 'ANALYSE DE GESTION', 'Activité des équipes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('activiteequipes').some((c) => c.isVisible(true)), null, { timeout: 60000 });
    await saisir(p, 'activiteequipes #aeDebut', '01/09/2026');
    await saisir(p, 'activiteequipes #aeFin', '30/09/2026');
    await cliquer(p, 'activiteequipes button[itemId=ae-analyses]');
    await attendre();
    await cliquer(p, 'activiteequipes #aeActualiser');
    await attendre();
    let t = await tuiles();
    ok('Tuiles de septembre : ventes encaissées et BL entrés = base', t.VENTES && t.VENTES.v === VENTES() && t.BL && t.BL.v === BL,
      JSON.stringify({ v: t.VENTES, bl: t.BL }) + ' / ' + VENTES() + ' ' + BL);
    ok('Tuiles : 9 indicateurs, évolution colorée sur la période précédente', Object.keys(t).length === 9
      && Object.values(t).filter((x) => /bon|mal/.test(x.e)).length >= 3, JSON.stringify(t));
    const brut = await p.evaluate(() => document.querySelector('.ae-tuile[data-code="VENTES"] .v').textContent);
    const attendu = VENTES().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
    ok('Ergonomie : nombres à la française (16 530, pas 16,530)', brut === attendu, JSON.stringify(brut) + ' / ' + JSON.stringify(attendu));
    const constats = await p.locator('.ae-constat').count();
    ok('Constats d\'aide à la décision affichés', constats >= 1, constats);

    const graphes = await p.evaluate(() => {
      const a = Ext.ComponentQuery.query('activiteequipes')[0].analyses, o = {};
      ['gHeures', 'gJours', 'gOperateurs', 'gGrossistes', 'gRetard', 'gLongues', 'gSensibles', 'gRepartition'].forEach((id) => {
        const c = a.down('#' + id); o[id] = c.rendered ? c.series.getAt(0).items.length : -1; });
      o.carte = document.querySelectorAll('.ae-carte tr').length - 1;
      o.aides = a.query('tool[type=help]').length;
      return o;
    });
    ok('Les 8 graphiques sont dessinés, carte d\'affluence de 7 jours', Object.entries(graphes).filter(([k]) => /^g/.test(k)).every(([, n]) => n > 0)
      && graphes.carte === 7, JSON.stringify(graphes));
    ok('Ergonomie : chaque graphique (9) a son aide « ? »', graphes.aides === 9, graphes.aides);

    /* survol d'une barre d'operateur : infobulle avec le detail */
    const cOp = p.locator('#' + await p.evaluate(() => Ext.ComponentQuery.query('activiteequipes')[0].analyses.down('#cOperateurs').id));
    await cOp.scrollIntoViewIfNeeded();
    const barre = await p.evaluate(() => {
      const c = Ext.ComponentQuery.query('activiteequipes')[0].analyses.down('#gOperateurs'), it = c.series.getAt(0).items[0];
      const r = c.el.dom.getBoundingClientRect(), bb = it.sprite.getBBox();
      return { x: r.left + bb.x + bb.width / 2, y: r.top + bb.y + bb.height / 2, id: it.storeItem.get('id'), nom: it.storeItem.get('libelle') };
    });
    await p.mouse.move(barre.x - 5, barre.y); await p.mouse.move(barre.x, barre.y);
    await p.waitForTimeout(900);
    const bulle = await p.evaluate(() => Array.from(document.querySelectorAll('.x-tip')).filter((e) => e.offsetParent).map((e) => e.textContent).join(' | '));
    ok('Survol d\'une barre : l\'infobulle donne le détail de l\'opérateur', bulle.indexOf('par ligne') >= 0 && bulle.indexOf('ventes') >= 0, bulle);

    /* clic sur la barre : filtre sur l'employe */
    await p.mouse.down(); await p.mouse.up();
    await p.waitForFunction((id) => Ext.ComponentQuery.query('activiteequipes #aeEmploye')[0].getValue() === id, barre.id, { timeout: 10000 });
    await p.waitForTimeout(500);
    await attendre();
    t = await tuiles();
    const vEmp = VENTES(barre.id);
    ok('Clic sur la barre : « Employé » prend sa valeur, les tuiles ne comptent que ses ventes', t.VENTES.v === vEmp, barre.nom + ' ' + t.VENTES.v + ' / ' + vEmp);

    const defile = await p.evaluate(() => { const b = Ext.ComponentQuery.query('activiteequipes')[0].analyses.body.dom; return b.scrollHeight > b.clientHeight; });
    ok('Ergonomie : la page des analyses défile', defile);
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));

    const p2 = await (await b.newContext()).newPage();
    await connexion(p2, LOGIN, MDP);
    const code = await p2.evaluate(async () => (await fetch('../api/v1/activite-equipes/analyses?debut=2026-09-01&fin=2026-09-30')).status);
    ok('Profil sans le droit : analyses refusées (403)', code === 403, code);
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    retirer();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
