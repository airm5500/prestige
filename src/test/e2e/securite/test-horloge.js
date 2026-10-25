/* RAPPEL « DATE ET HEURE FAUSSES » (retours du 25/10, point 2).
 *  - horloge juste : aucun rappel ;
 *  - horloge du serveur fausse d'une heure (ecart a l'heure d'Internet simule par KEY_HORLOGE_ESSAI_DECALAGE) : toast
 *    « en avance de 1 h », avec « Mettre a jour » et « Masquer » ;
 *  - date reculee : une operation de caisse datee de dans 2 jours est signalee (sans Internet) ;
 *  - horloge de ce poste fausse (navigateur avance de 3 h) : signalee ; « Mettre a jour » dit comment synchroniser le
 *    poste, sans appel au serveur ;
 *  - « Mettre a jour » (heure du serveur) : appel de synchronisation (intercepte : Windows n'est pas touche par le
 *    test), compte rendu dans le toast ; « Masquer » retire le toast ;
 *  - au-dessus du toast WhatsApp quand les deux sont affiches ; aucune fenetre.
 * Parametre d'essai et operation posee retires a la fin.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 260) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sNr', '-e', s], { encoding: 'utf8' }).trim();
const M = 'E2E-HORLOGE';
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const CAISSE = q('SELECT lg_CAISSE_ID FROM t_caisse LIMIT 1');

function nettoyer() {
  q(`DELETE FROM t_parameters WHERE str_KEY = 'KEY_HORLOGE_ESSAI_DECALAGE'; DELETE FROM mvttransaction WHERE uuid = '${M}'`);
}
const etat = (p) => p.evaluate(async () => (await fetch('../api/v1/horloge/etat')).json());
const toast = (p) => p.evaluate(() => { const t = document.getElementById('phr-toast');
  return t ? { texte: t.innerText, bas: Math.round(innerHeight - t.getBoundingClientRect().bottom), raison: (t.querySelector('.phr-raison') || {}).textContent || '',
    bouton: (t.querySelector('[data-phr="mettre-a-jour"]') || {}).textContent } : null; });
const verifier = async (p) => { await p.evaluate(() => window.PrestigeAlerteHorloge.verifier()); await p.waitForTimeout(1500); };

(async () => {
  nettoyer();
  const b = await ENV_E2E.lancer(chromium);
  const dialogues = [];
  try {
    const ctx = await b.newContext({ viewport: { width: 1500, height: 900 } });
    const p = await ctx.newPage();
    p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await p.waitForFunction(() => !!window.PrestigeAlerteHorloge, null, { timeout: 30000 });

    let e = await etat(p);
    ok('Précondition : horloge du serveur juste, fuseau attendu (' + e.fuseauAttendu + '), heure d\'Internet joignable',
      e.success && e.anomalies.length === 0 && !!e.reference, JSON.stringify({ fuseau: e.fuseau, reference: e.reference, ecart: e.ecartSecondes, anomalies: e.anomalies }));
    await verifier(p);
    ok('Horloge juste : aucun rappel', (await toast(p)) === null);

    /* serveur en avance d'une heure (ecart simule) */
    q("INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED) VALUES ('KEY_HORLOGE_ESSAI_DECALAGE', '3600', 'essai e2e', 'CUSTOMER', 'enable', NOW())");
    await verifier(p);
    let t = await toast(p);
    ok('Serveur en avance d\'une heure : toast « en avance de 1 h », Mettre à jour et Masquer', t && /date ou l'heure n'est pas bonne/i.test(t.texte)
      && /en avance de 1 h/.test(t.texte) && /Mettre à jour/.test(t.texte) && /Masquer/.test(t.texte), t && t.texte);

    /* Mettre a jour : synchronisation demandee au serveur (interceptee) */
    let appels = 0;
    await p.route('**/api/v1/horloge/synchroniser', (r) => { appels++; r.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, msg: 'Heure synchronisée avec le serveur de temps de Windows.' }) }); });
    await p.click('#phr-toast [data-phr="mettre-a-jour"]');
    await p.waitForTimeout(2500); /* apres la verification relancee, qui redessine le toast */
    t = await toast(p);
    ok('« Mettre à jour » : synchronisation demandée au serveur, compte rendu gardé dans le toast', appels === 1 && t && /synchronisée/.test(t.raison) && t.bouton === 'Mis à jour', t && (t.raison + ' / ' + t.bouton));
    await p.unroute('**/api/v1/horloge/synchroniser');
    await p.waitForTimeout(2000);
    await p.click('#phr-toast [data-phr="masquer"]');
    await p.waitForTimeout(300);
    ok('« Masquer » retire le toast', (await toast(p)) === null);
    q("DELETE FROM t_parameters WHERE str_KEY = 'KEY_HORLOGE_ESSAI_DECALAGE'");

    /* date reculee : une operation de caisse datee de dans 2 jours */
    q("INSERT INTO mvttransaction (uuid, categorie, createdAt, mvtdate, pkey, reference, typeTransaction, caisse, lg_EMPLACEMENT_ID, lg_USER_ID, montant,"
      + " montantRegle, montantPaye, montantAcc, margeug, montantttcug, montantnetug, montanttvaug, typeMvtCaisseId, checked)"
      + ` VALUES ('${M}', 1, NOW() + INTERVAL 2 DAY, CURDATE() + INTERVAL 2 DAY, '${M}', '${M}', 0, '${CAISSE}', '1', '${ADMIN}', 0, 0, 0, 0, 0, 0, 0, 0, '1', 1)`);
    const p2 = await ctx.newPage();
    await p2.goto(p.url(), { waitUntil: 'domcontentloaded' }).catch(() => {});
    await p2.waitForFunction(() => !!window.PrestigeAlerteHorloge && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await verifier(p2);
    t = await toast(p2);
    ok('Date reculée (opération datée de dans 2 jours) : signalée', t && /a reculé/.test(t.texte), t && t.texte);
    await p2.close();
    q(`DELETE FROM mvttransaction WHERE uuid = '${M}'`);

    /* horloge de ce poste en avance de 3 h */
    const ctx3 = await b.newContext({ viewport: { width: 1500, height: 900 } });
    await ctx3.addInitScript(() => { const avant = Date.now; Date.now = () => avant() + 3 * 3600 * 1000; });
    const p3 = await ctx3.newPage();
    p3.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
    await vues.connexion(p3, ENV_E2E.LOGIN, 'e2etest');
    await p3.waitForFunction(() => !!window.PrestigeAlerteHorloge, null, { timeout: 30000 });
    let appels3 = 0;
    await p3.route('**/api/v1/horloge/synchroniser', (r) => { appels3++; r.fulfill({ status: 200, body: '{}' }); });
    await verifier(p3);
    t = await toast(p3);
    ok('Horloge de ce poste en avance de 3 h : signalée', t && /horloge de ce poste est en avance de 3 h/.test(t.texte), t && t.texte);
    await p3.click('#phr-toast [data-phr="mettre-a-jour"]');
    await p3.waitForTimeout(500);
    t = await toast(p3);
    ok('Poste seul en faute : « Mettre à jour » dit comment synchroniser ce poste, sans appel au serveur', appels3 === 0 && t && /Synchroniser maintenant/.test(t.raison), t && t.raison);

    /* au-dessus du toast WhatsApp */
    await p3.evaluate(() => { const w = document.createElement('div'); w.id = 'pwa-banniere'; w.style.cssText = 'position:fixed;right:16px;bottom:16px;height:90px;width:400px';
      document.body.appendChild(w); });
    await verifier(p3);
    const pile = await p3.evaluate(() => { const a = document.getElementById('phr-toast').getBoundingClientRect(), w = document.getElementById('pwa-banniere').getBoundingClientRect();
      return { horlogeBas: Math.round(a.bottom), whatsappHaut: Math.round(w.top) }; });
    ok('Au-dessus du toast WhatsApp, sans le recouvrir', pile.horlogeBas <= pile.whatsappHaut, JSON.stringify(pile));
    await ctx3.close();
    ok('Aucune fenêtre', dialogues.length === 0, dialogues.join(' | '));
  } catch (x) { ok('Parcours sans exception', false, x.stack); } finally {
    await b.close();
    nettoyer();
    ok('Essais retirés', q(`SELECT (SELECT COUNT(*) FROM mvttransaction WHERE uuid = '${M}') + (SELECT COUNT(*) FROM t_parameters WHERE str_KEY = 'KEY_HORLOGE_ESSAI_DECALAGE')`) === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
  process.exit(ko ? 1 : 0);
})();
