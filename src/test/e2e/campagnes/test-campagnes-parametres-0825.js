/* CAMPAGNES : PARAMETRES DU 25/10 (point 14).
 *
 * Par les vues (admin), Campagnes SMS / WhatsApp > Campagnes > Paramètres :
 *  - canal propose des campagnes automatiques : WhatsApp ;
 *  - « Réponse comptée dans les » : 7 jours par defaut ; 0 ou 91 refuses (message, rien d'enregistre) ;
 *  - delai mis a 3 jours : dans le Journal, une reponse ecrite 5 jours apres l'envoi n'est plus comptee, celle ecrite
 *    2 jours apres l'est toujours ;
 *  - aucune erreur JavaScript, aucune fenetre. Parametres remis a leur valeur et jeu d'essai retire a la fin.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const CAMP = 'E2E-CPARAM', CLES = "'KEY_CAMPAGNE_AUTO_CANAL', 'KEY_CAMPAGNE_DELAI_REPONSE'";

function nettoyer() {
  q(`DELETE FROM whatsapp_discussion WHERE numero LIKE '2299000091%'; DELETE FROM whatsapp_message WHERE id LIKE 'E2E-CPARAM-%';`
    + ` DELETE FROM t_campagne_ligne WHERE campagne_id = '${CAMP}'; DELETE FROM t_campagne WHERE id = '${CAMP}';`
    + " DELETE FROM t_client WHERE lg_CLIENT_ID LIKE 'E2E-CPARAM-%';");
}

(async () => {
  const avant = q(`SELECT GROUP_CONCAT(CONCAT(str_KEY, '=', str_VALUE) ORDER BY str_KEY) FROM t_parameters WHERE str_KEY IN (${CLES})`);
  nettoyer();
  q(`INSERT INTO t_campagne (id, categorie, origine, statut, canal, nb_cibles, nb_envoyes, nb_exclus, created_at, traitee_at)`
    + ` VALUES ('${CAMP}', 'INFO_CLIENTS', 'MANUEL', 'ENVOYEE', 'WHATSAPP', 2, 2, 0, NOW(), NOW() + INTERVAL 1 DAY)`);
  [['DEUXJOURS', '22990000911', 2], ['CINQJOURS', '22990000912', 5]].forEach(([n, tel, j], i) => {
    const id = 'E2E-CPARAM-' + i;
    q(`INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, str_ADRESSE, lg_TYPE_CLIENT_ID, str_STATUT, dt_CREATED) VALUES ('${id}', 'E2EPARAM', '${n}', '${tel}', '6', 'enable', NOW())`);
    q(`INSERT INTO t_campagne_ligne (campagne_id, lg_CLIENT_ID, retenu, statut, lg_NOTIFICATION_ID) VALUES ('${CAMP}', '${id}', b'1', 'PREPARE', 'E2E-CPARAM-N${i}')`);
    q(`INSERT INTO whatsapp_message (id, notification_id, client_id, telephone, mode, simule, statut, created_at) VALUES ('E2E-CPARAM-${i}', 'E2E-CPARAM-N${i}', '${id}', '${tel}', 'WEB', 0, 'LU', NOW() - INTERVAL 10 DAY)`);
    q(`INSERT INTO whatsapp_discussion (numero, sens, type, texte, created_at) VALUES ('${tel}', 'E', 'TEXTE', 'E2E', NOW() - INTERVAL ${10 - j} DAY)`);
  });
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  const erreurs = [], dialogues = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  const P = 'campagnes #ongletParametres';
  const ouvrir = async (s) => { await p.click('#' + await p.evaluate((x) => Ext.ComponentQuery.query(x)[0].tab.getEl().dom.id, s)); await p.waitForTimeout(2000); };
  const repondus = async () => {
    await ouvrir('campagnes #ongletJournal');
    await p.waitForFunction((c) => Ext.ComponentQuery.query('campagnes #journal')[0].getStore().findExact('id', c) >= 0, CAMP, { timeout: 30000 });
    return p.evaluate((c) => { const s = Ext.ComponentQuery.query('campagnes #journal')[0].getStore(); return s.getAt(s.findExact('id', c)).get('repondus'); }, CAMP);
  };
  const enregistrer = async (v) => {
    await p.evaluate(([s, x]) => { Ext.ComponentQuery.query(s + ' #delaiReponse')[0].setValue(x); }, [P, v]);
    await cliquer(p, P + ' #enregistrer');
    await p.waitForTimeout(1500);
    return p.evaluate((s) => Ext.ComponentQuery.query(s + ' #etat')[0].getEl().dom.innerText, P);
  };
  try {
    await connexion(p, 'admin', 'e2etest');
    await ouvrirMenu(p, 'Campagnes SMS / WhatsApp', 'Campagnes');
    await p.waitForFunction(() => { const v = Ext.ComponentQuery.query('campagnes')[0]; return v && v.contexte; }, null, { timeout: 60000 });
    ok('Journal, délai par défaut (7 jours) : 2 réponses comptées', await repondus() === 2);
    await ouvrir(P);
    const v = await p.evaluate((s) => { const o = Ext.ComponentQuery.query(s)[0]; const d = o.down('#delaiReponse');
      return { canal: o.down('#canal').getValue(), delai: d ? d.getValue() : null, libelle: d ? d.getFieldLabel() : '' }; }, P);
    ok('Campagnes automatiques : canal WhatsApp', v.canal === 'WHATSAPP', JSON.stringify(v));
    ok('« Réponse comptée dans les » : 7 jours par défaut', v.delai === 7 && /Réponse comptée/.test(v.libelle), JSON.stringify(v));
    for (const x of [0, 91]) {
      const m = await enregistrer(x);
      ok('Délai ' + x + ' refusé, rien enregistré', /entre 1 et 90/.test(m) && q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_CAMPAGNE_DELAI_REPONSE'") === '7', m);
    }
    await enregistrer(3);
    ok('Délai 3 jours enregistré', q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_CAMPAGNE_DELAI_REPONSE'") === '3');
    ok('Journal, délai 3 jours : seule la réponse à 2 jours est comptée', await repondus() === 1);
    ok('Aucune erreur JavaScript, aucune fenêtre', erreurs.length === 0 && dialogues.length === 0
      && await p.evaluate(() => Ext.ComponentQuery.query('window').filter((w) => w.isVisible()).length) === 0, erreurs.concat(dialogues).join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
    nettoyer();
    avant.split(',').filter(Boolean).forEach((kv) => { const [k, val] = kv.split('='); q(`UPDATE t_parameters SET str_VALUE = '${val}' WHERE str_KEY = '${k}'`); });
    ok('Paramètres remis, jeu d\'essai retiré', q(`SELECT GROUP_CONCAT(CONCAT(str_KEY, '=', str_VALUE) ORDER BY str_KEY) FROM t_parameters WHERE str_KEY IN (${CLES})`) === avant
      && q(`SELECT COUNT(*) FROM t_campagne WHERE id = '${CAMP}'`) === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
