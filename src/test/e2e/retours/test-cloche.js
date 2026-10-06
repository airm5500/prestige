/* CLOCHE CONFIGURABLE (plan d'octobre, section 7, lot L9).
 *
 * Ce que le test etablit, sur le vrai en-tete (preferences de l'utilisateur remises a la fin) :
 *  - badge : UNE requete (v1/notifications-centre/compteurs) au lieu d'une par categorie, et plus de liste des avoirs
 *    a chaque rafraichissement ; memes nombres que les anciens compteurs (reserve, peremptions) et que la liste des
 *    avoirs (memes criteres) ;
 *  - par defaut : les trois categories historiques, dans leur ordre ;
 *  - « Choisir les notifications » : categories proposees selon le menu de l'utilisateur, cases a cocher et ordre par
 *    glisser-deposer, enregistres pour l'utilisateur ; le panneau et le badge suivent ;
 *  - nouvelles categories : compteurs = base (commandes non recues, suggestions commandees non recues, produits
 *    indisponibles) ; liste en panneau ;
 *  - repli : si le compteur agrege echoue, la cloche compte comme avant, categorie par categorie ;
 *  - aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });

(async () => {
  const U = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin'");
  const avant = q("SELECT COUNT(*) FROM t_preference_utilisateur WHERE lg_USER_ID = '" + U + "' AND str_CLE = 'cloche'") === '1'
    ? q("SELECT txt_VALEUR FROM t_preference_utilisateur WHERE lg_USER_ID = '" + U + "' AND str_CLE = 'cloche'") : null;
  exec("DELETE FROM t_preference_utilisateur WHERE lg_USER_ID = '" + U + "' AND str_CLE = 'cloche'");
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  const err = [], req = [];
  p.on('pageerror', (e) => err.push(String(e.message)));
  p.on('request', (r) => { const u = r.url(); if (/notifications-centre|en-attente|perimes|ventestats|preferences\/cloche/.test(u)) req.push(u.replace(/^.*\/api\/v1\//, '')); });
  const api = (u) => p.evaluate(async (u) => (await fetch(u)).json(), u);
  const badge = () => p.evaluate(() => { const e = document.getElementById('notif-badge'); return e && e.style.display !== 'none' ? e.textContent : '0'; });
  const rafraichir = async () => { req.length = 0; await p.evaluate(() => refreshNotificationBadge()); await p.waitForTimeout(2500); };
  const panneau = async () => {
    await p.evaluate(() => { const w = Ext.getCmp('notif-center-win'); if (w) w.close(); showNotificationCenter(); });
    await p.waitForFunction(() => Ext.getCmp('notif-center-win'), null, { timeout: 60000 });
    await p.waitForTimeout(500);
    return p.evaluate(() => Array.from(document.querySelectorAll('#notif-center-win .pn-label')).map((e) => e.textContent.trim()));
  };
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.PrestigeNotif && Ext.ComponentQuery.query('navigation').length && Ext.ComponentQuery.query('navigation')[0].getStore()._menuCharge, null, { timeout: 90000 });
    await p.waitForTimeout(2000);

    // Badge : une requete, memes nombres
    await rafraichir();
    const appels = req.filter((u) => !/preferences/.test(u));
    ok('Badge : une seule requête (compteurs agrégés), plus de liste des avoirs', appels.length === 1 && /notifications-centre\/compteurs/.test(appels[0]), JSON.stringify(appels));
    const c = await api('../api/v1/notifications-centre/compteurs?cles=reserve,perimes,avoirs');
    const r1 = await api('../api/v1/suggestion-reserve/en-attente/count');
    const r2 = await api('../api/v1/fichearticle/perimes/count?nbreMois=6&codeFamile=&codeRayon=&codeGrossiste=&query=&dtStart=&dtEnd=');
    const fin = new Date(), deb = new Date(); deb.setMonth(deb.getMonth() - 1); deb.setDate(deb.getDate() + 1);
    const f = (d) => d.toISOString().slice(0, 10);
    const r3 = await api('../api/v1/ventestats?onlyAvoir=true&sansBon=false&typeVenteId=&avoirStatut=EN_COURS&dtStart=' + f(deb) + '&dtEnd=' + f(fin) + '&start=0&limit=1');
    ok('Suggestions de réserve : même nombre que l\'ancien compteur', c.compteurs.reserve === Number(r1.total), c.compteurs.reserve + ' / ' + r1.total);
    ok('Péremptions : même nombre que l\'ancien compteur', c.compteurs.perimes === Number(r2.total), c.compteurs.perimes + ' / ' + r2.total);
    ok('Avoirs : même nombre que la liste affichée (mêmes critères)', c.compteurs.avoirs === Number(r3.total), c.compteurs.avoirs + ' / ' + r3.total);
    const tot = c.compteurs.reserve + c.compteurs.perimes + c.compteurs.avoirs;
    ok('Badge = somme des trois catégories historiques', await badge() === (tot > 99 ? '99+' : String(tot)), (await badge()) + ' / ' + tot);

    // Panneau par defaut
    const def = await panneau();
    ok('Par défaut : les catégories historiques seulement (sections non vides)', def.every((l) => /réserve|reserve|Peremptions|Péremptions|avoir/i.test(l)), JSON.stringify(def));

    // Choisir les notifications
    await p.evaluate(() => prestigeNotifConfigurer());
    await p.waitForFunction(() => Ext.getCmp('notif-config-win'), null, { timeout: 10000 });
    const choix = await p.evaluate(() => Array.from(document.querySelectorAll('#notif-config-win .pn-choix')).map((e) => ({ cle: e.getAttribute('data-cle'), coche: e.querySelector('input').checked })));
    ok('« Choisir les notifications » : historiques cochées, nouvelles proposées (menus de l\'utilisateur)', choix.slice(0, 3).every((x) => x.coche) && choix.length === 7
      && choix.slice(3).every((x) => !x.coche), JSON.stringify(choix));
    // cocher « commandes », decocher « perimes », mettre « commandes » en tete
    await p.evaluate(() => {
      const w = document.getElementById('notif-config-win');
      w.querySelector('[data-cle="commandes"] input').checked = true;
      w.querySelector('[data-cle="indisponibles"] input').checked = true;
      w.querySelector('[data-cle="perimes"] input').checked = false;
      const a = w.querySelector('[data-cle="commandes"]'), e = w.querySelector('[data-cle="reserve"]'), dt = new DataTransfer();
      a.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }));
      e.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
      e.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
      a.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer: dt }));
      Ext.getCmp('notif-config-win').down('#enregistrer').handler();
    });
    await p.waitForTimeout(3000);
    const pref = JSON.parse(q("SELECT txt_VALEUR FROM t_preference_utilisateur WHERE lg_USER_ID = '" + U + "' AND str_CLE = 'cloche'") || '{}');
    ok('Choix enregistré pour l\'utilisateur (cochées et ordre)', pref.ordre && pref.ordre[0] === 'commandes' && pref.actives.indexOf('perimes') < 0
      && pref.actives.indexOf('commandes') >= 0 && pref.actives.indexOf('indisponibles') >= 0, JSON.stringify(pref));
    await rafraichir();
    const appel2 = req.filter((u) => /compteurs/.test(u))[0] || '';
    ok('Badge : compteurs des catégories choisies seulement', /cles=commandes%2Creserve%2Cavoirs%2Cindisponibles|cles=commandes,reserve,avoirs,indisponibles/.test(appel2), appel2);
    const c2 = await api('../api/v1/notifications-centre/compteurs?cles=commandes,reserve,avoirs,indisponibles');
    const tot2 = c2.total;
    ok('Badge = somme des catégories choisies', await badge() === (tot2 > 99 ? '99+' : String(tot2)), (await badge()) + ' / ' + tot2);

    // Nouvelles categories = base
    const sqlCmd = q("SELECT COUNT(*) FROM t_order o WHERE o.str_STATUT = 'is_Closed' AND o.dt_UPDATED <= DATE_SUB(NOW(), INTERVAL 2 DAY) AND NOT EXISTS (SELECT 1 FROM t_bon_livraison b WHERE b.lg_ORDER_ID = o.lg_ORDER_ID AND b.str_STATUT = 'is_Closed')");
    ok('Commandes passées non reçues = base (' + sqlCmd + ')', c2.compteurs.commandes === Number(sqlCmd), c2.compteurs.commandes + ' / ' + sqlCmd);
    const sqlInd = q("SELECT COUNT(*) FROM t_disponibilite_produit d JOIN (SELECT lg_FAMILLE_ID, MAX(dt_CREATED) m FROM t_disponibilite_produit WHERE dt_CREATED >= DATE_SUB(NOW(), INTERVAL 7 DAY) GROUP BY lg_FAMILLE_ID) x"
      + " ON x.lg_FAMILLE_ID = d.lg_FAMILLE_ID AND x.m = d.dt_CREATED WHERE d.str_STATUT = 'NON'");
    ok('Produits indisponibles = base (' + sqlInd + ')', c2.compteurs.indisponibles === Number(sqlInd), c2.compteurs.indisponibles + ' / ' + sqlInd);
    const sc = await api('../api/v1/notifications-centre/compteurs?cles=suggestions-commandees,renouvellements');
    const sqlSc = q("SELECT COUNT(*) FROM t_suggestion_order s LEFT JOIN t_order o ON o.lg_ORDER_ID = s.lg_ORDER_ID WHERE s.str_STATUT = 'commandee' AND s.dt_COMMANDEE <= DATE_SUB(NOW(), INTERVAL 2 DAY)"
      + " AND (o.lg_ORDER_ID IS NULL OR o.str_STATUT <> 'is_Closed' OR NOT EXISTS (SELECT 1 FROM t_bon_livraison b WHERE b.lg_ORDER_ID = o.lg_ORDER_ID AND b.str_STATUT = 'is_Closed'))");
    ok('Suggestions commandées non reçues = base (' + sqlSc + ')', sc.compteurs['suggestions-commandees'] === Number(sqlSc), JSON.stringify(sc.compteurs));
    const lc = await api('../api/v1/notifications-centre/liste?cle=commandes&limit=50');
    ok('Liste « commandes non reçues » : même total que le compteur', lc.total === c2.compteurs.commandes && lc.results.length === Math.min(50, lc.total), lc.total + ' ' + lc.results.length);

    // Panneau avec le choix
    const sections = await panneau();
    const attendues = ['commandes', 'reserve', 'avoirs', 'indisponibles'].filter((k) => c2.compteurs[k] > 0);
    ok('Panneau : catégories choisies, dans l\'ordre choisi, péremptions retirées', sections.length === attendues.length && !sections.some((s) => /ptions/i.test(s))
      && (attendues[0] !== 'commandes' || /Commandes/.test(sections[0])), JSON.stringify(sections));
    await p.evaluate(() => { const w = Ext.getCmp('notif-center-win'); if (w) w.close(); });

    // Repli
    await p.route('**/notifications-centre/compteurs**', (r) => r.abort());
    await rafraichir();
    const repli = req.filter((u) => /en-attente|commandes|liste/.test(u));
    ok('Repli : compteur agrégé en échec → la cloche compte catégorie par catégorie', repli.length >= 2 && await badge() !== null, JSON.stringify(req));
    await p.unroute('**/notifications-centre/compteurs**');

    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Déroulé sans exception', false, (e.stack || '').split('\n').filter((l) => /test-cloche|Error/.test(l)).join(' | '));
  } finally {
    await b.close();
    exec("DELETE FROM t_preference_utilisateur WHERE lg_USER_ID = '" + U + "' AND str_CLE = 'cloche'");
    if (avant !== null) {
      exec("INSERT INTO t_preference_utilisateur (lg_USER_ID, str_CLE, txt_VALEUR, dt_UPDATED) VALUES ('" + U + "', 'cloche', '" + avant.replace(/'/g, "''") + "', NOW())");
    }
    ok('Nettoyage : préférence de la cloche remise', true);
    const n = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - n) + '/' + res.length + ' PASS');
    process.exit(n ? 1 : 0);
  }
})();
