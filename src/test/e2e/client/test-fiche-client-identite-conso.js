/* FICHE CLIENT (retours du 13/10, points 13 et 14). Par la fenetre « Fiche client » de la gestion des clients, admin.
 *  - point 14 : un client sans date de naissance ni sexe : la fiche propose de les completer ; l'enregistrement met a
 *    jour la fiche client (t_client), sans fenetre ; ce qui est deja renseigne n'est jamais ecrase ; date future
 *    refusee ; le bloc disparait une fois la fiche complete ;
 *  - point 13 : suivi de consommation avec un choix « Par vente / Par produit », « Par vente » par defaut : chaque
 *    vente des 12 derniers mois (date, ticket, montant, produits) ; « Par produit » garde la vue d'avant.
 * Client d'essai cree puis retire ; le client aux ventes est lu sans etre modifie.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const C = 'E2E-FICHE-ID';
const retirer = () => exec(`DELETE FROM t_client_dossier WHERE lg_CLIENT_ID = '${C}'; DELETE FROM t_compte_client WHERE lg_CLIENT_ID = '${C}'; DELETE FROM t_client WHERE lg_CLIENT_ID = '${C}';`);
/* client aux ventes : celui qui a le plus de ventes cloturees sur 12 mois */
const [CV, NB_VENTES] = q("SELECT CONCAT_WS('|', p.lg_CLIENT_ID, COUNT(*)) FROM t_preenregistrement p WHERE p.lg_CLIENT_ID IS NOT NULL AND p.lg_CLIENT_ID <> ''"
  + " AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 AND p.dt_UPDATED >= CURDATE() - INTERVAL 12 MONTH"
  + " GROUP BY p.lg_CLIENT_ID ORDER BY COUNT(*) DESC LIMIT 1").split('|');

(async () => {
  retirer();
  exec(`INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, str_STATUT, dt_CREATED, lg_TYPE_CLIENT_ID) VALUES ('${C}', 'ZZFICHE', 'Identite', 'enable', NOW(), '6');`
    + `INSERT INTO t_compte_client (lg_COMPTE_CLIENT_ID, lg_CLIENT_ID, str_STATUT, dt_CREATED) VALUES ('${C}-cpt', '${C}', 'enable', NOW())`);
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const err = [], dialogues = [];
  try {
    const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
    p.on('pageerror', (e) => err.push(e.message));
    p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
    const ouvrirFiche = async (id, nom) => {
      await p.evaluate(() => Ext.ComponentQuery.query('window').filter((w) => w.isVisible()).forEach((w) => w.close()));
      await p.evaluate(([id, nom]) => { Ext.syncRequire('testextjs.view.serviceclient.ordonnance.FenetreFicheClient'); testextjs.view.serviceclient.ordonnance.FenetreFicheClient.ouvrir(id, nom); }, [id, nom]);
      await p.waitForFunction(() => { const v = Ext.ComponentQuery.query('#vueFicheClient')[0]; return v && v.dossier && v.down('#fcCorps').isVisible(); }, null, { timeout: 30000 });
      await p.waitForTimeout(1500);
    };

    /* ----- point 14 : completer l'identite ----- */
    await ouvrirFiche(C, 'ZZFICHE Identite');
    let bloc = await p.evaluate(() => { const v = Ext.ComponentQuery.query('#vueFicheClient')[0], c = v.down('#fcCompleter');
      return { visible: !!c && c.isVisible(), date: !!c && c.down('#fcNaissance').isVisible(), sexe: !!c && c.down('#fcSexe').isVisible() }; });
    ok('Client sans date ni sexe : la fiche propose de les compléter', bloc.visible && bloc.date && bloc.sexe, JSON.stringify(bloc));
    const champ = await p.evaluate(() => Ext.ComponentQuery.query('#vueFicheClient #fcNaissance')[0].inputEl.id);
    await p.fill('#' + champ, '01/01/2099');
    await p.evaluate(() => { Ext.ComponentQuery.query('#vueFicheClient #fcCompleterBtn')[0].btnEl.dom.click(); });
    await p.waitForTimeout(1500);
    ok('Date future : refusée, rien n\'est écrit', q(`SELECT IFNULL(dt_NAISSANCE, 'VIDE') FROM t_client WHERE lg_CLIENT_ID = '${C}'`) === 'VIDE');
    await p.fill('#' + champ, '12/05/1975');
    await p.evaluate(() => { Ext.ComponentQuery.query('#vueFicheClient #fcSexe')[0].setValue({ fcSexeChoix: 'M' }); });
    await p.evaluate(() => { Ext.ComponentQuery.query('#vueFicheClient #fcCompleterBtn')[0].btnEl.dom.click(); });
    await p.waitForFunction(() => /complétée|enregistr/i.test(Ext.ComponentQuery.query('#vueFicheClient #fcMessage')[0].getEl().dom.innerText), null, { timeout: 15000 }).catch(() => {});
    await p.waitForTimeout(1500);
    ok('Enregistré sur la fiche client', q(`SELECT CONCAT_WS('|', DATE(dt_NAISSANCE), str_SEXE) FROM t_client WHERE lg_CLIENT_ID = '${C}'`) === '1975-05-12|M',
      q(`SELECT CONCAT_WS('|', IFNULL(dt_NAISSANCE, 'VIDE'), IFNULL(str_SEXE, 'VIDE')) FROM t_client WHERE lg_CLIENT_ID = '${C}'`));
    bloc = await p.evaluate(() => { const v = Ext.ComponentQuery.query('#vueFicheClient')[0]; const c = v.down('#fcCompleter');
      return { visible: !!c && c.isVisible(), identite: v.down('#fcIdentite').getEl().dom.innerText.replace(/\s+/g, ' ') }; });
    ok('Fiche complète : le bloc disparaît, l\'identité affiche date, âge et sexe', !bloc.visible && /12\/05\/1975/.test(bloc.identite) && /Masculin/.test(bloc.identite), JSON.stringify(bloc));
    const ecrase = await p.evaluate(async (c) => (await fetch('../api/v1/ordonnance-client/client/' + c + '/identite', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ naissance: '1990-01-01', sexe: 'F' }) })).json(), C);
    ok('Ce qui est déjà renseigné n\'est jamais écrasé', q(`SELECT CONCAT_WS('|', DATE(dt_NAISSANCE), str_SEXE) FROM t_client WHERE lg_CLIENT_ID = '${C}'`) === '1975-05-12|M', JSON.stringify(ecrase));

    /* ----- point 13 : par vente / par produit ----- */
    ok('Précondition : un client avec des ventes sur 12 mois', Number(NB_VENTES) > 0, CV + ' : ' + NB_VENTES);
    await ouvrirFiche(CV, 'Client aux ventes');
    await p.waitForFunction(() => /\S/.test(Ext.ComponentQuery.query('#vueFicheClient #fcConsoCorps')[0].getEl().dom.innerText), null, { timeout: 30000 });
    await p.waitForTimeout(1000);
    const vue = () => p.evaluate(() => { const v = Ext.ComponentQuery.query('#vueFicheClient')[0], s = v.down('#fcConsoMode');
      const t = v.down('#fcConsoCorps').getEl().dom; return { choix: s ? s.items.getRange().map((x) => x.text + (x.pressed ? '*' : '')) : null,
        entetes: [...t.querySelectorAll('th')].map((x) => x.innerText.trim()), lignes: t.querySelectorAll('tbody tr').length }; });
    let v1 = await vue();
    ok('Choix « Par vente / Par produit », « Par vente » par défaut', Array.isArray(v1.choix) && v1.choix.some((x) => /Par vente\*/.test(x)) && v1.choix.some((x) => /^Par produit$/.test(x)), JSON.stringify(v1.choix));
    ok('Par vente : une ligne par vente (date, ticket, montant, produits)', v1.entetes.join('|').match(/Date.*Ticket.*Montant.*Produits/i) && v1.lignes === Math.min(Number(NB_VENTES), 50),
      JSON.stringify(v1));
    await p.evaluate(() => { const s = Ext.ComponentQuery.query('#vueFicheClient #fcConsoMode')[0]; s.items.getRange().find((x) => /Par produit/.test(x.text)).btnEl.dom.click(); });
    await p.waitForFunction(() => [...Ext.ComponentQuery.query('#vueFicheClient #fcConsoCorps')[0].getEl().dom.querySelectorAll('th')].some((x) => /Fréquence/.test(x.innerText)), null, { timeout: 20000 }).catch(() => {});
    const v2 = await vue();
    ok('Par produit : la vue d\'avant (produit, achats, fréquence, habitude)', /Produit.*Achats.*Fréquence/i.test(v2.entetes.join('|')) && v2.lignes > 0, JSON.stringify(v2));
    ok('Aucune fenêtre surgissante, aucune erreur JavaScript', dialogues.length === 0 && err.length === 0, dialogues.concat(err).join(' | '));
  } catch (x) {
    ok('Déroulé sans erreur', false, x.message);
  } finally {
    await b.close();
    retirer();
    ok('Client d\'essai retiré', q(`SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID = '${C}'`) === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
  process.exit(ko ? 1 : 0);
})();
