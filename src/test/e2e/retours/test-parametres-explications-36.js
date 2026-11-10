/* RETOUR DU 10/11/2026 : explications depliables des 36 parametres crees depuis janvier 2026 (valeur 0 ou 1), par le
 * bouton « i » de l'ecran « Gestion des parametres ». Lecture seule, compte de test.
 *  - 35 des 36 ont une explication en base ; SEMOIS_ABC_LOG n'en a pas (aucun code ne le lit) ;
 *  - rapprochement base / service : pour chacun, le service de liste donne exactement l'explication de la base, et
 *    seulement pour les parametres que le profil voit ;
 *  - rapprochement service / ecran : pour CHACUN des parametres expliques visibles, recherche par sa cle, bouton « i »,
 *    clic, et l'explication depliee porte la regle, le tableau (entetes et cas) et les rappels de la base, sans
 *    fenetre ; second clic : repliee ;
 *  - SEMOIS_ABC_LOG, s'il est visible, n'a pas de bouton.
 * Lancement seul : node src/test/e2e/retours/test-parametres-explications-36.js   (BASE : adresse du serveur)
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', '-sN', '--raw', ENV_E2E.BASE, '-e', s], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();
const URL = (process.env.BASE || 'http://localhost:8080/prestige').replace(/\/$/, '');
const LES_36 = ['SEMOIS_ABC_LOG', 'SEMOIS_ABC', 'ABC_AUTO_RECLASS', 'SEMOIS_PAR_PRODUIT', 'KEY_SMS_AVOIR_IMMEDIAT', 'SUPPORT_WATCHDOG_ENABLED', 'SUPPORT_SLOWLOG_ENABLED',
  'SUPPORT_NOTIFY_ENABLED', 'SUPPORT_MONITOR_ENABLED', 'SUPPORT_AUTO_TICKET_ENABLED', 'SUGGESTION_RESERVE_HOOK_VENTE', 'KEY_ETIQUETTE_TELECHARGEMENT', 'KEY_ETIQUETTE_ESPACE_V_MM',
  'KEY_ETIQUETTE_ESPACE_H_MM', 'KEY_ETIQUETTE_DECALAGE_Y_MM', 'KEY_ETIQUETTE_DECALAGE_X_MM', 'SUPPORT_DB_MONITOR_ENABLED', 'ACCES_DEPANNAGE_ACTIF', 'KEY_VENTE_LECTURE_GS1',
  'KEY_CONTROLE_ACHAT_DELAI_SAISIE_JOURS', 'KEY_TICKET_LENT_SEUIL_MS', 'KEY_JOURNAL_CONSERVATION_MOIS', 'KEY_ETIQUETTE_CODE_PAR_PRODUIT', 'KEY_ENTETES_X_USER_INFO', 'KEY_AVIS_ACTIF',
  'KEY_EMPREINTES_PARTAGEES', 'KEY_CONNEXION_BADGE', 'KEY_BORNE_POINTAGE_RESEAU_LOCAL', 'KEY_PRIX_REF_CAISSE', 'KEY_LIGNE_COMPTANT_VO', 'KEY_SAUVEGARDE_ACTIVE', 'KEY_PRIX_REF_BASE_PAR_TP',
  'KEY_NETTOYER_SUGGESTION_OUVERTURE', 'KEY_CONNEXION_BADGE_PIN', 'KEY_CORRESPONDANCE_SEUIL_ECART_PRIX', 'KEY_AFFICHER_STOCK_GROSSISTE'];

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  try {
    const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
    p.on('pageerror', (e) => err.push(e.message));
    await p.goto(URL + '/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 240000 });
    await p.waitForTimeout(1500);

    /* base */
    const enBase = {};
    q("SELECT CONCAT(str_KEY, '\\t', explication) FROM parametre_explication").split(/\r?\n/).filter(Boolean).forEach((l) => { const i = l.indexOf('\t'); enBase[l.slice(0, i)] = JSON.parse(l.slice(i + 1)); });
    const expliques = LES_36.filter((k) => enBase[k]);
    ok('Base : 35 des 36 paramètres ont une explication ; SEMOIS_ABC_LOG (lu par aucun code) n\'en a pas', expliques.length === 35 && !enBase.SEMOIS_ABC_LOG, expliques.length + ' ; manquants : ' + LES_36.filter((k) => !enBase[k]).join(','));
    ok('Base : chaque explication a une règle, et un tableau dont chaque ligne a la largeur des entêtes', expliques.every((k) => { const x = enBase[k];
      return x.regle && x.regle.length >= 60 && (!x.cas || x.cas.every((c) => !x.entetes || c.length === x.entetes.length)); }));

    /* service */
    const liste = await p.evaluate(async () => (await fetch('../api/v1/app-params/liste?start=0&limit=0')).json());
    const parCle = {}; liste.results.forEach((x) => { parCle[x.str_KEY] = x; });
    const visibles = expliques.filter((k) => parCle[k]);
    ok('Service : les paramètres expliqués visibles par le profil (' + visibles.length + '/35) portent exactement l\'explication de la base',
      visibles.length >= 30 && visibles.every((k) => parCle[k].explication && JSON.stringify(JSON.parse(parCle[k].explication)) === JSON.stringify(enBase[k])),
      visibles.filter((k) => !parCle[k].explication || JSON.stringify(JSON.parse(parCle[k].explication)) !== JSON.stringify(enBase[k])).join(','));
    ok('Service : aucune explication pour un paramètre qui n\'en a pas en base', liste.results.every((x) => !x.explication || enBase[x.str_KEY]),
      liste.results.filter((x) => x.explication && !enBase[x.str_KEY]).map((x) => x.str_KEY).join(','));

    /* ecran : chaque parametre explique, par la recherche puis le bouton « i » */
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('parametermanager', 'Paramètres', ''));
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('parametermanager')[0]; return g && g.rendered && g.getStore().getCount() > 0; }, null, { timeout: 30000 });
    await p.waitForTimeout(800);
    const chercher = (cle) => p.evaluate((c) => new Promise((fin) => { const g = Ext.ComponentQuery.query('parametermanager')[0]; Ext.getCmp('rechecher').setValue(c);
      g.getStore().on('load', () => setTimeout(() => fin(true), 150), null, { single: true }); g.onRechClick(); setTimeout(() => fin(false), 20000); }), cle);
    const etat = (cle) => p.evaluate((c) => {
      const g = Ext.ComponentQuery.query('parametermanager')[0], r = g.getStore().findRecord('str_KEY', c, 0, false, true, true);
      if (!r) { return null; }
      const ligne = g.getView().getNode(r), suivante = ligne.nextElementSibling, corps = suivante ? suivante.querySelector('.param-explication') : null;
      return { bouton: ligne.querySelectorAll('.param-info').length, visible: !!(corps && corps.getBoundingClientRect().height > 0),
        regle: corps && corps.querySelector('p') ? corps.querySelector('p').textContent : '',
        tableau: corps ? Array.from(corps.querySelectorAll('tr')).map((tr) => Array.from(tr.children).map((x) => x.textContent)) : [],
        rappels: corps ? Array.from(corps.querySelectorAll('li')).map((li) => li.textContent) : [], fenetres: Ext.ComponentQuery.query('window').filter((w) => w.isVisible()).length };
    }, cle);
    const cliquerI = async (cle) => {
      const id = await p.evaluate((c) => { const g = Ext.ComponentQuery.query('parametermanager')[0], r = g.getStore().findRecord('str_KEY', c, 0, false, true, true);
        const i = g.getView().getNode(r).querySelector('.param-info'); i.id = 'e2e-i-' + c; return i.id; }, cle);
      await p.click('#' + id);
      await p.waitForTimeout(250);
    };
    const ecarts = [];
    for (const cle of visibles) {
      await chercher(cle);
      let e = await etat(cle);
      if (!e || e.bouton !== 1 || e.visible) { ecarts.push(cle + ' : bouton ou repli initial ' + JSON.stringify(e && { b: e.bouton, v: e.visible })); continue; }
      await cliquerI(cle);
      e = await etat(cle);
      const x = enBase[cle];
      const attenduTableau = x.cas ? (x.entetes ? [x.entetes] : []).concat(x.cas) : [];
      if (!e.visible || e.fenetres !== 0 || e.regle !== x.regle || JSON.stringify(e.tableau) !== JSON.stringify(attenduTableau) || JSON.stringify(e.rappels) !== JSON.stringify(x.rappels || [])) {
        ecarts.push(cle + ' : dépliée ' + e.visible + ', fenêtres ' + e.fenetres + ', règle ' + (e.regle === x.regle) + ', tableau ' + (JSON.stringify(e.tableau) === JSON.stringify(attenduTableau)));
        continue;
      }
      await cliquerI(cle);
      e = await etat(cle);
      if (e.visible) { ecarts.push(cle + ' : ne se replie pas'); }
    }
    ok('Écran : pour chacun des ' + visibles.length + ' paramètres, bouton « i », explication dépliée sous la ligne sans fenêtre (règle, tableau et rappels = base), puis repliée', ecarts.length === 0, ecarts.slice(0, 4).join(' | '));
    if (parCle.SEMOIS_ABC_LOG) {
      await chercher('SEMOIS_ABC_LOG');
      const e = await etat('SEMOIS_ABC_LOG');
      ok('Écran : SEMOIS_ABC_LOG, que le code ne lit pas, n\'a pas de bouton « i »', e && e.bouton === 0, JSON.stringify(e));
    } else {
      ok('SEMOIS_ABC_LOG n\'est pas visible par ce profil : rien à vérifier à l\'écran', true);
    }
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
    process.exit(ko ? 1 : 0);
  }
})();
