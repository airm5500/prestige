/* ETAT DE CONTROLE DES ACHATS (retour du 31/10, point 1) — lecture seule.
 *  - la recherche trouve un BL par un morceau du MILIEU de sa reference (« contient », et non plus « commence par ») ;
 *  - onglet « BL annulés » : les BL annules (retour complet du BL) de la periode, avec l'operateur qui a annule ;
 *    un BL annule n'apparait pas dans « Liste des BL ».
 * Donnees : un BL clos et un BL annule existants de la copie de l'officine (rien n'est cree).
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();

(async () => {
  const [REF] = q("SELECT b.str_REF_LIVRAISON FROM t_bon_livraison b JOIN t_order o ON o.lg_ORDER_ID = b.lg_ORDER_ID"
    + " WHERE b.str_STATUT = 'is_Closed' AND CHAR_LENGTH(b.str_REF_LIVRAISON) >= 6 ORDER BY b.dt_UPDATED DESC LIMIT 1").split('\t');
  const [ANN, ANN_LE] = q("SELECT b.str_REF_LIVRAISON, DATE(b.dt_UPDATED) FROM t_bon_livraison b JOIN t_order o ON o.lg_ORDER_ID = b.lg_ORDER_ID"
    + " WHERE b.str_STATUT = 'delete' AND b.int_HTTC > 0 ORDER BY b.dt_UPDATED DESC LIMIT 1").split('\t');
  const MILIEU = REF ? REF.slice(2, REF.length - 2) : '';
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  const clic = async (sel) => { await p.evaluate((s) => Ext.ComponentQuery.query(s)[0].getEl().dom.setAttribute('data-e2e', 'cible'), sel);
    await p.click('[data-e2e=cible]'); await p.evaluate(() => document.querySelector('[data-e2e=cible]').removeAttribute('data-e2e')); };
  const saisir = async (sel, v) => { await clic(sel); await p.keyboard.press('Control+A'); await p.keyboard.type(v, { delay: 40 }); };
  try {
    ok('Précondition : un BL clos et un BL annulé', REF && ANN, (REF || '-') + ' / ' + (ANN || '-'));
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('etatscontrolemanager', 'Contrôle des achats', ''));
    await p.waitForFunction(() => Ext.ComponentQuery.query('etatscontrolemanager').some((x) => x.isVisible(true)), null, { timeout: 30000 });
    await p.waitForFunction(() => !Ext.ComponentQuery.query('etatscontrolemanager')[0].getStore().isLoading(), null, { timeout: 60000 });

    /* « contient » : periode large, morceau du milieu de la reference */
    await saisir('etatscontrolemanager #datedebut', '01/01/2020');
    await saisir('etatscontrolemanager #rechecher', MILIEU);
    await p.keyboard.press('Enter');
    await p.waitForTimeout(800);
    await p.waitForFunction(() => !Ext.ComponentQuery.query('etatscontrolemanager')[0].getStore().isLoading(), null, { timeout: 120000 });
    const refs = await p.evaluate(() => Ext.ComponentQuery.query('etatscontrolemanager')[0].getStore().collect('str_REF_LIVRAISON'));
    ok('Recherche « contient » : le BL est trouvé par le milieu de sa référence', refs.includes(REF), MILIEU + ' -> ' + refs.slice(0, 5).join(', '));

    /* onglet BL annules */
    const onglets = await p.evaluate(() => Ext.ComponentQuery.query('controleachats #ongletsCa button').map((x) => x.text));
    ok('Onglet « BL annulés » présent', onglets.includes('BL annulés'), onglets.join(' | '));
    if (onglets.includes('BL annulés')) {
      await clic('controleachats #ca-annules');
      await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('controleachats #gridAnnules')[0]; return g && g.isVisible(true); }, null, { timeout: 20000 });
      await saisir('controleachats #anDebut', ANN_LE.split('-').reverse().join('/'));
      await saisir('controleachats #anRecherche', '');
      await clic('controleachats #anRechercher');
      await p.waitForTimeout(800);
      await p.waitForFunction(() => !Ext.ComponentQuery.query('controleachats #gridAnnules')[0].getStore().isLoading(), null, { timeout: 60000 });
      const l = await p.evaluate(() => Ext.ComponentQuery.query('controleachats #gridAnnules')[0].getStore().getRange().map((r) => r.data));
      const ligne = l.find((x) => x.refBl === ANN);
      ok('BL annulé listé avec sa date d\'annulation et son montant', ligne && ligne.annuleLe && ligne.montantTtc > 0, JSON.stringify(ligne && { ref: ligne.refBl, le: ligne.annuleLe, ttc: ligne.montantTtc }));
      ok('« Annulé par » renseigné (opérateur de la contre-passation)', ligne && ligne.annulePar, ligne ? (ligne.annulePar ? 'renseigné' : 'vide') : '-');
      ok('Aucune contre-passation (montant négatif) dans la liste', l.every((x) => x.montantTtc > 0), l.length + ' ligne(s)');
      const total = await p.evaluate(() => Ext.ComponentQuery.query('controleachats #anTotal')[0].text);
      ok('Total affiché', /BL annulé/.test(total), total);
    }
    ok('Aucune erreur JavaScript', !erreurs.length, erreurs.join(' | '));
  } catch (e) {
    ok('Déroulement du test', false, e.stack || e);
  } finally {
    await b.close();
    const k = res.filter((x) => x.c).length;
    console.log('\n' + k + '/' + res.length + (k === res.length ? ' OK' : ' ECHEC'));
    process.exit(k === res.length ? 0 : 1);
  }
})();
