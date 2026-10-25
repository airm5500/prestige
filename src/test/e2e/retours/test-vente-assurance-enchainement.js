/* VENTE ASSURANCE ET CARNET : ENCHAINEMENT PAR ENTREE (retours du 25/10, point 5).
 *
 * Par les vues (admin), SERVICE CLIENT > Ventes > Nouvelle vente, pour le type ASSURANCE puis CARNET :
 *  - recherche d'un client inconnu, « ajouter un nouveau client ? » Oui : la fenetre du nouveau client s'ouvre ;
 *  - Entree fait passer, dans l'ordre : Nom -> Prenom -> Matricule -> Adresse -> Tiers payant (ou Carnet) -> Taux,
 *    puis le bouton d'enregistrement ;
 *  - le Taux accepte la frappe « 80 » (et pas seulement 0, 1 et 100) ;
 *  - fermeture par « Annuler » : aucun client cree. Aucune erreur JavaScript, aucune fenetre du navigateur.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer, attendreMessage, repondre } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const INCONNU = 'ZZE2EINCONNU';

(async () => {
  const clientsAvant = q('SELECT COUNT(*) FROM t_client');
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = [], dialogues = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  /* nom du champ qui a le focus dans la fenetre du nouveau client (ou « bouton ») */
  const focus = (fen) => p.evaluate((f) => {
    const w = Ext.ComponentQuery.query(f + '{isVisible()}')[0], a = document.activeElement;
    if (!w) { return 'fenetre absente'; }
    const c = w.query('field').find((x) => x.inputEl && x.inputEl.dom === a);
    if (c) { return c.getName(); }
    const btn = w.query('button').find((x) => x.el && x.el.dom.contains(a));
    return btn ? 'bouton' : (a && (a.name || a.id || a.tagName));
  }, fen);
  const parcours = async (type, libelle, fen, attendu) => {
    /* type de vente : boutons segmentes au-dessus de la recherche produit */
    await p.locator('text=/^\\s*' + libelle + '\\s*$/').filter({ visible: true }).first().click();
    await p.waitForTimeout(1500);
    await cliquer(p, 'doventemanager #contenu #clientSearchTextField');
    await p.keyboard.type(INCONNU, { delay: 10 });
    await p.keyboard.press('Enter');
    const m = await attendreMessage(p, 'nouveau client', 15000);
    ok(type + ' : client inconnu, « ajouter un nouveau client ? »', !!m, m);
    await repondre(p, 'yes');
    await p.waitForFunction((f) => Ext.ComponentQuery.query(f + '{isVisible()}').length > 0, fen, { timeout: 15000 });
    await p.waitForTimeout(1200);
    const ordre = [await focus(fen)];
    for (let i = 0; i < attendu.length - 1 && ordre[ordre.length - 1] !== 'bouton'; i++) {
      if (ordre[ordre.length - 1] === 'intPOURCENTAGE') {
        await p.keyboard.press('Control+A');
        await p.keyboard.type('80', { delay: 30 });
        const v = await p.evaluate((f) => Ext.ComponentQuery.query(f + '{isVisible()}')[0].down('#intPOURCENTAGE').getRawValue(), fen);
        ok(type + ' : le Taux accepte « 80 »', v === '80', v);
      } else if (i < 3 || ordre[ordre.length - 1] === 'strADRESSE') {
        await p.keyboard.type('E2E', { delay: 10 });
      }
      await p.keyboard.press('Enter');
      await p.waitForTimeout(500);
      ordre.push(await focus(fen));
    }
    ok(type + ' : Entrée enchaîne ' + attendu.join(' → '), ordre.join(',') === attendu.join(','), ordre.join(' → '));
    await p.evaluate((f) => { const w = Ext.ComponentQuery.query(f + '{isVisible()}')[0]; const btn = w.query('button').find((x) => /annuler/i.test(x.getText() || ''));
      btn.btnEl.dom.click(); }, fen);
    await p.waitForTimeout(800);
  };
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'SERVICE CLIENT', 'Ventes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('cloturerventemanager #addBtn').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await cliquer(p, 'cloturerventemanager #addBtn');
    await p.waitForFunction(() => Ext.ComponentQuery.query('doventemanager #typeVente').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    await parcours('ASSURANCE', 'Assurance', 'addaddclientwindow', ['strFIRSTNAME', 'strLASTNAME', 'strNUMEROSECURITESOCIAL', 'strADRESSE', 'lgTIERSPAYANTID', 'intPOURCENTAGE', 'bouton']);
    await parcours('CARNET', 'Carnet', 'addCarnetwindow', ['strFIRSTNAME', 'strLASTNAME', 'strNUMEROSECURITESOCIAL', 'strADRESSE', 'lgTIERSPAYANTID', 'intPOURCENTAGE', 'bouton']);
    ok('Annuler : aucun client créé', q('SELECT COUNT(*) FROM t_client') === clientsAvant);
    ok('Aucune erreur JavaScript, aucune fenêtre du navigateur', erreurs.length === 0 && dialogues.length === 0, erreurs.concat(dialogues).join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    const v = await p.evaluate(() => { const c = testextjs.app.getController('VenteCtr').current; return c && c.lgPREENREGISTREMENTID; }).catch(() => null);
    if (v) { await p.evaluate((id) => fetch('../api/v1/ventestats/remove/' + id, { method: 'POST' }), v).catch(() => {}); }
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
