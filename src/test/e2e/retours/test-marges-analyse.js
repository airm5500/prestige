/* MARGE SUR PRODUITS VENDUS — ONGLET ANALYSE (retours du 13/10, point 21). Par l'ecran, admin. Lecture des ventes du banc.
 *  - le menu ouvre Liste / Analyse ; la liste existante est dedans, inchangee ;
 *  - septembre 2026 : CA HT, achat, marge, taux de marque (marge / HT) et taux de marge (marge / achat) = calcul SQL
 *    independant sur le meme perimetre que la liste ;
 *  - comparaisons : periode precedente de meme duree (aout 2026 : 31 jours avant), moyennes 3 et 6 mois ; six mois ;
 *    familles ;
 *  - objectifs reglables a l'ecran (message dans le bouton) : vert a l'objectif ou au-dessus, rouge en dessous ;
 *  - periode a l'envers refusee.
 * Les objectifs d'origine sont remis.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const EMPL = q("SELECT lg_EMPLACEMENT_ID FROM t_user WHERE str_LOGIN = 'admin'");
const perimetre = (d, f) => `FROM t_preenregistrement_detail d JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID`
  + ` WHERE p.dt_UPDATED >= '${d}' AND p.dt_UPDATED < '${f}' AND u.lg_EMPLACEMENT_ID = '${EMPL}' AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 AND p.lg_TYPE_VENTE_ID <> '5'`;
const sql = (d, f) => { const [ttc, remise, tva, achat] = q(`SELECT CONCAT_WS('|', SUM(d.int_PRICE), SUM(IFNULL(d.int_PRICE_REMISE, 0)), SUM(IFNULL(d.montantTva, 0)), SUM(IFNULL(d.prixAchat, 0) * d.int_QUANTITY)) ${perimetre(d, f)}`).split('|').map(Number);
  const ht = ttc - remise - tva, marge = ht - achat; return { ht, achat, marge, tauxMarque: Math.round(marge * 10000 / ht) / 100, tauxMarge: Math.round(marge * 10000 / achat) / 100 }; };
const OBJ0 = ['KEY_OBJECTIF_TAUX_MARQUE', 'KEY_OBJECTIF_TAUX_MARGE'].map((k) => q(`SELECT IFNULL((SELECT str_VALUE FROM t_parameters WHERE str_KEY = '${k}'), 'ABSENT')`));

(async () => {
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const err = [], dialogues = [];
  try {
    ok('Précondition : objectifs présents (25 % et 33,33 % par défaut)', OBJ0.every((x) => x !== 'ABSENT'), OBJ0.join(' / '));
    const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
    p.on('pageerror', (e) => err.push(e.message));
    p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);

    /* le menu ouvre le conteneur, la liste dedans */
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('margeproducts', 'Marge sur produits', ''));
    await p.waitForFunction(() => Ext.ComponentQuery.query('margeonglets margeproducts').length > 0, null, { timeout: 30000 });
    ok('Le menu ouvre Liste / Analyse, la liste existante dedans', await p.evaluate(() => !!Ext.ComponentQuery.query('margeonglets #mg-analyse')[0]
      && window.PrestigeAffichage.ECRANS_COLLES.includes('margeonglets')));

    /* API sur septembre 2026 */
    const api = await p.evaluate(async () => (await fetch('../api/v1/datareporting/marges/analyse?dtStart=2026-09-01&dtEnd=2026-09-30')).json());
    const sep = sql('2026-09-01', '2026-10-01'), aout = sql('2026-08-01', '2026-09-01');
    const c = api.courante || {};
    ok('Septembre : CA HT, achat, marge = calcul SQL', c.ht === sep.ht && c.achat === sep.achat && c.marge === sep.marge, JSON.stringify(c) + ' / ' + JSON.stringify(sep));
    ok('Taux de marque = marge ÷ HT, taux de marge = marge ÷ achat', c.tauxMarque === sep.tauxMarque && c.tauxMarge === sep.tauxMarge && c.tauxMarge > c.tauxMarque,
      c.tauxMarque + ' / ' + c.tauxMarge);
    /* 30 jours avant le 01/09 : du 02/08 au 31/08 */
    const prec = sql('2026-08-02', '2026-09-01');
    ok('Période précédente de même durée (02/08 – 31/08)', api.precedente.debut === '2026-08-02' && api.precedente.fin === '2026-08-31' && api.precedente.marge === prec.marge,
      JSON.stringify(api.precedente));
    const moy3 = sql('2026-06-01', '2026-09-01');
    ok('Moyenne des 3 derniers mois (juin–août) : taux et marge mensuelle', api.moyenne3.tauxMarque === moy3.tauxMarque && api.moyenne3.marge === Math.trunc(moy3.marge / 3),
      JSON.stringify(api.moyenne3) + ' / ' + JSON.stringify(moy3));
    ok('Six derniers mois, août avec ses chiffres', api.mois.length === 6 && api.mois[4].mois === '2026-08' && api.mois[4].marge === aout.marge, JSON.stringify(api.mois.map((m) => m.mois)));
    ok('Familles : 15 au plus, triées par marge', api.familles.length >= 1 && api.familles.length <= 15 && api.familles.every((f, i, t) => i === 0 || t[i - 1].marge >= f.marge));
    const inv = await p.evaluate(async () => (await fetch('../api/v1/datareporting/marges/analyse?dtStart=2026-09-30&dtEnd=2026-09-01')).json());
    ok('Période à l\'envers : refus clair', inv.success === false && /précéder/.test(inv.msg), inv.msg);

    /* ecran : septembre, objectifs */
    await p.evaluate(() => { const o = Ext.ComponentQuery.query('margeonglets')[0]; o.analyse.down('#mgDebut').setValue(new Date(2026, 8, 1)); o.analyse.down('#mgFin').setValue(new Date(2026, 8, 30)); o.afficher('analyse'); });
    await p.waitForFunction(() => !!Ext.ComponentQuery.query('margeonglets')[0].donnees, null, { timeout: 60000 });
    const etat = () => p.evaluate(() => { const d = Ext.ComponentQuery.query('margeonglets #mgContenu')[0].getEl().dom;
      return { tuiles: [...d.querySelectorAll('.pml-tuile')].map((t) => t.className + ' :: ' + t.innerText.replace(/\s+/g, ' ')), comparaisons: d.querySelectorAll('tr.mg-comp').length,
        mois: d.querySelectorAll('tr.mg-mois').length, familles: d.querySelectorAll('tr.mg-famille').length, texte: d.innerText }; });
    let e = await etat();
    ok('Écran : tuiles taux de marque et taux de marge, comparaisons (4), six mois, familles', /Taux de marque/.test(e.tuiles[0]) && /Taux de marge/.test(e.tuiles[1]) && e.comparaisons === 4 && e.mois === 6 && e.familles >= 1,
      JSON.stringify(e.tuiles.slice(0, 2)));
    const regler = async (marque, marge) => {
      await p.evaluate(([a, m]) => { const o = Ext.ComponentQuery.query('margeonglets')[0]; o.analyse.down('#mgObjMarque').setValue(a); o.analyse.down('#mgObjMarge').setValue(m);
        o.analyse.down('#mgObjEnregistrer').btnEl.dom.click(); }, [marque, marge]);
      await p.waitForFunction(() => /enregistrés|invalides|Refus|doit/.test(Ext.ComponentQuery.query('margeonglets #mgObjEnregistrer')[0].getText()), null, { timeout: 10000 }).catch(() => {});
      const t = await p.evaluate(() => Ext.ComponentQuery.query('margeonglets #mgObjEnregistrer')[0].getText());
      await p.waitForTimeout(2700);
      return t;
    };
    let m = await regler(1, 1);
    e = await etat();
    ok('Objectifs bas : enregistrés (message dans le bouton), tuiles en vert', /Objectifs enregistrés/.test(m) && /mg-ok/.test(e.tuiles[0]) && /mg-ok/.test(e.tuiles[1])
      && q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_OBJECTIF_TAUX_MARQUE'") === '1.0', m + ' ' + e.tuiles[0]);
    m = await regler(99, 999);
    e = await etat();
    ok('Objectifs hauts : tuiles en rouge', /mg-ko/.test(e.tuiles[0]) && /mg-ko/.test(e.tuiles[1]), e.tuiles[0]);
    m = await regler(150, 30);
    ok('Objectif hors bornes : refusé dans le bouton, rien n\'est enregistré', !/Objectifs enregistrés/.test(m) && q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_OBJECTIF_TAUX_MARQUE'") === '99.0', m);
    ok('Aucune fenêtre surgissante, aucune erreur JavaScript', dialogues.length === 0 && err.length === 0, dialogues.concat(err).join(' | '));
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack);
  } finally {
    await b.close();
    ['KEY_OBJECTIF_TAUX_MARQUE', 'KEY_OBJECTIF_TAUX_MARGE'].forEach((k, i) => { if (OBJ0[i] !== 'ABSENT') { q(`UPDATE t_parameters SET str_VALUE = '${OBJ0[i]}' WHERE str_KEY = '${k}'`); } });
    ok('Objectifs d\'origine remis', ['KEY_OBJECTIF_TAUX_MARQUE', 'KEY_OBJECTIF_TAUX_MARGE'].every((k, i) => q(`SELECT IFNULL((SELECT str_VALUE FROM t_parameters WHERE str_KEY = '${k}'), 'ABSENT')`) === OBJ0[i]));
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
  process.exit(ko ? 1 : 0);
})();
