/* PLAN DU 14/11, POINT 5 : « Ouverture / clôture de caisse » en un seul ecran (SERVICE CLIENT).
 *
 * Parcours du compte d'essai, a la souris et au clavier, sur un ecran de portable (1366 x 768) :
 *  - le menu « Ouverture / clôture caisse » remplace les deux anciens (masques puisque l'utilisateur a le nouveau) ;
 *  - l'ecran tient dans la largeur, sans barre de defilement horizontale ;
 *  - caisse fermee : ouverture active, cloture grisee ; fond de caisse tape (15 500), « Ouvrir la caisse », « Non » au
 *    ticket ;
 *  - caisse ouverte : ouverture grisee, cloture active ; fond affiche = base ;
 *  - « Clôturer la caisse » : premier clic, le bouton demande confirmation, sans fenetre ; sans second clic en 10 s, il
 *    revient et rien n'est ecrit ; deux clics : fenetre de billetage (1 x 10 000, 1 x 5 000, 1 x 500), « VALIDER », OK ;
 *  - l'ecran relit son etat : caisse fermee, ouverture active, cloture grisee.
 * Bilan (base, compte d'essai, depuis le debut du test) :
 *  - ouverture : un fond (t_coffre_caisse), un resume de caisse en service (fond du matin 15 500), un mouvement de
 *    caisse « fond de caisse » de 15 500, une transaction de 15 500 pour ce mouvement, une trace « ouverture » ;
 *  - cloture : le resume passe a « is_Process », un billetage et un detail (1, 1, 0, 0, 1, 0), une trace « cloture » ;
 *    aucun autre resume ni mouvement.
 * La caisse deja ouverte du compte d'essai (autres tests) est mise de cote puis rendue ; tout ce que le test ecrit est
 * retire. Lancement seul : node src/test/e2e/caisse/test-caisse-ouverture-cloture-1511.js
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const { execFileSync } = require('child_process');

const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' })
  .replace(/\r/g, '').trim();
const res = [];
function ok(n, c, d) { res.push(!!c); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 320) + ']' : '')); }

const U = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
/* FOND=0 : l'usage de l'officine (2 802 caisses sur 2 804 ouvertes sans fond) */
const FOND = process.env.FOND !== undefined ? Number(process.env.FOND) : 15500;
const ECRAN = 'caisseouverturecloture';
/* caisses deja ouvertes du compte d'essai, mises de cote le temps du test */
const deCote = q("SELECT IFNULL(GROUP_CONCAT(ld_CAISSE_ID), '') FROM t_resume_caisse WHERE lg_USER_ID = '" + U + "' AND str_STATUT = 'is_Using'").split(',').filter(Boolean);
/* fonds attribues en attente : mis de cote aussi (l'ouverture les refuserait), puis rendus avec leur statut */
const fondsDeCote = q("SELECT IFNULL(GROUP_CONCAT(CONCAT(ID_COFFRE_CAISSE, '=', str_STATUT)), '') FROM t_coffre_caisse WHERE lg_USER_ID = '" + U
  + "' AND str_STATUT IN ('is_Waiting_validation', 'is_Assign')").split(',').filter(Boolean).map((x) => x.split('='));
const caisseAvant = q("SELECT IFNULL(MAX(CONCAT_WS('|', lg_CAISSE_ID, int_SOLDE, dt_UPDATED, IFNULL(lg_UPDATED_BY, ''))), '') FROM t_caisse WHERE lg_USER_ID = '" + U + "'");

const depuis = (table, col) => "FROM " + table + " WHERE lg_USER_ID = '" + U + "' AND " + col + " >= '" + DEBUT + "'";
const compter = (table, col, plus) => Number(q("SELECT COUNT(*) " + depuis(table, col) + (plus || '')));
const resumes = () => q("SELECT IFNULL(GROUP_CONCAT(CONCAT_WS('/', str_STATUT, int_SOLDE_MATIN)), '') " + depuis('t_resume_caisse', 'dt_CREATED'));

function nettoyer() {
  q("CREATE TEMPORARY TABLE e2e_oc_r AS SELECT ld_CAISSE_ID id " + depuis('t_resume_caisse', 'dt_CREATED') + ";"
    + " CREATE TEMPORARY TABLE e2e_oc_m AS SELECT lg_MVT_CAISSE_ID id " + depuis('t_mvt_caisse', 'dt_CREATED') + ";"
    + " DELETE FROM t_billetage_details WHERE lg_BILLETAGE_ID IN (SELECT lg_BILLETAGE_ID FROM t_billetage WHERE ld_CAISSE_ID IN (SELECT id FROM e2e_oc_r));"
    + " DELETE FROM t_billetage WHERE ld_CAISSE_ID IN (SELECT id FROM e2e_oc_r);"
    + " DELETE FROM ligne_resume_caisse WHERE resume_caisse_id IN (SELECT id FROM e2e_oc_r);"
    + " DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID IN (SELECT id FROM e2e_oc_r);"
    + " DELETE FROM mvttransaction WHERE pkey IN (SELECT id FROM e2e_oc_m);"
    + " DELETE FROM t_mvt_caisse WHERE lg_MVT_CAISSE_ID IN (SELECT id FROM e2e_oc_m);"
    + " DELETE FROM t_coffre_caisse WHERE lg_USER_ID = '" + U + "' AND dt_CREATED >= '" + DEBUT + "';"
    + " DELETE FROM t_event_log WHERE lg_USER_ID = '" + U + "' AND dt_CREATED >= '" + DEBUT + "' AND str_DESCRIPTION LIKE '%caisse%';"
    + " DELETE FROM notification_client WHERE notification_id IN (SELECT id FROM notification WHERE user_id = '" + U + "' AND created_at >= '" + DEBUT + "');"
    + " DELETE FROM notification WHERE user_id = '" + U + "' AND created_at >= '" + DEBUT + "';"
    + " DROP TEMPORARY TABLE e2e_oc_r; DROP TEMPORARY TABLE e2e_oc_m");
  if (caisseAvant) {
    const [id, solde, maj, par] = caisseAvant.split('|');
    q("UPDATE t_caisse SET int_SOLDE = " + solde + ", dt_UPDATED = '" + maj + "', lg_UPDATED_BY = " + (par ? "'" + par + "'" : 'NULL') + " WHERE lg_CAISSE_ID = '" + id + "'");
  } else {
    q("DELETE FROM t_caisse WHERE lg_USER_ID = '" + U + "' AND dt_CREATED >= '" + DEBUT + "'");
  }
  if (deCote.length) { q("UPDATE t_resume_caisse SET str_STATUT = 'is_Using' WHERE ld_CAISSE_ID IN ('" + deCote.join("','") + "')"); }
}

const etat = (p) => p.evaluate((e) => {
  const v = Ext.ComponentQuery.query(e).filter((x) => x.isVisible(true))[0];
  if (!v) { return null; }
  const d = (i) => v.down('#' + i);
  return { ouverture: !d('ocOuverture').isDisabled(), cloture: !d('ocCloture').isDisabled(), bandeau: d('ocEtat').getEl().dom.textContent,
    fond: String(d('ocFond').getValue()), bouton: d('ocBtnCloturer').getText(), titreO: d('ocOuverture').title, titreC: d('ocCloture').title };
}, ECRAN);
async function attendreEtat(p, ouverte) {
  return p.waitForFunction(([e, o]) => {
    const v = Ext.ComponentQuery.query(e).filter((x) => x.isVisible(true))[0];
    return v && v.down('#ocOuverture').isDisabled() === o && v.down('#ocCloture').isDisabled() === !o && /ferm|ouvert/.test(v.down('#ocEtat').getEl().dom.textContent);
  }, [ECRAN, ouverte], { timeout: 30000 }).then(() => true).catch(() => false);
}

(async () => {
  if (deCote.length) { q("UPDATE t_resume_caisse SET str_STATUT = 'E2E1511' WHERE ld_CAISSE_ID IN ('" + deCote.join("','") + "')"); }
  fondsDeCote.forEach(([id]) => q("UPDATE t_coffre_caisse SET str_STATUT = 'E2E1511' WHERE ID_COFFRE_CAISSE = '" + id + "'"));
  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  await p.route('**/api/v1/support/events', (r) => (r.request().method() === 'POST' ? r.fulfill({ status: 200, body: '{}' }) : r.continue()));
  try {
    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const menus = await p.evaluate(() => { const ids = []; Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().cascadeBy((n) => { ids.push(n.get('id')); }); return ids; });
    ok('Menu « Ouverture / clôture caisse » présent, les deux anciens masqués',
      menus.indexOf(ECRAN) >= 0 && menus.indexOf('ouverturecaissemanger') < 0 && menus.indexOf('caissemanger') < 0,
      JSON.stringify(['caisseouverturecloture', 'ouverturecaissemanger', 'caissemanger'].map((x) => x + '=' + (menus.indexOf(x) >= 0))));
    await vues.ouvrirMenu(p, 'SERVICE CLIENT', 'Ouverture / clôture caisse');
    /* refermer le volet du menu par un clic dans une zone vide de l'ecran (jamais dans l'en-tete : la cloche y est) */
    await p.mouse.move(1250, 700); await p.mouse.click(1250, 700);
    ok('Aucune fenêtre ouverte par la navigation', !(await p.evaluate(() => !!Ext.getCmp('notif-center-win'))), '');
    const ferme0 = await attendreEtat(p, false);
    const e0 = await etat(p);
    ok('Caisse fermée : ouverture active, clôture grisée, bandeau « fermée »', ferme0 && e0.ouverture && !e0.cloture && /fermée/.test(e0.bandeau), JSON.stringify(e0));
    const largeur = await p.evaluate((e) => { const v = Ext.ComponentQuery.query(e).filter((x) => x.isVisible(true))[0], el = v.body.dom, r = v.getEl().dom.getBoundingClientRect();
      const o = v.down('#ocOuverture').getEl().dom.getBoundingClientRect(), c = v.down('#ocCloture').getEl().dom.getBoundingClientRect();
      return { defile: el.scrollWidth > el.clientWidth + 1, droite: Math.round(r.right), fenetre: window.innerWidth, gauche: Math.round(o.left), finCloture: Math.round(c.right), cote: o.right <= c.left };
    }, ECRAN);
    ok('Ergonomie : l\'écran tient dans la largeur (1366 px), ouverture à gauche, clôture à droite, sans défilement horizontal',
      !largeur.defile && largeur.finCloture <= largeur.fenetre && largeur.cote, JSON.stringify(largeur));

    /* ouverture */
    const montant = await p.evaluate((e) => Ext.ComponentQuery.query(e)[0].down('#ocMontant').inputEl.id, ECRAN);
    /* fond negatif : refuse dans le champ, rien n'est ecrit */
    await p.click('#' + montant, { clickCount: 3 });
    await p.keyboard.press('Control+A');
    await p.keyboard.type('-500', { delay: 30 });
    await vues.cliquer(p, ECRAN + ' #ocBtnOuvrir');
    await p.waitForTimeout(1500);
    const neg = await p.evaluate((e) => { const c = Ext.ComponentQuery.query(e)[0].down('#ocMontant'); return { saisi: c.getRawValue(), valide: c.isValid(), erreur: String(c.getActiveError() || '') }; }, ECRAN);
    ok('Fond de -500 : refusé dans le champ, aucune fenêtre, aucune caisse ouverte', !neg.valide && neg.erreur !== '' && (await vues.texteMessage(p)) === '' && resumes() === '', JSON.stringify(neg));
    await p.click('#' + montant, { clickCount: 3 });
    await p.keyboard.press('Control+A');
    await p.keyboard.type(String(FOND), { delay: 30 });
    const saisi = await p.evaluate((e) => Ext.ComponentQuery.query(e)[0].down('#ocMontant').getRawValue(), ECRAN);
    ok('Saisie : le champ affiche le fond tapé', String(saisi).replace(/\D/g, '') === String(FOND), saisi);
    await vues.cliquer(p, ECRAN + ' #ocBtnOuvrir');
    const question = await vues.attendreMessage(p, 'impression', 20000);
    ok('Ouverture : la question d\'impression du ticket est posée', !!question, question);
    if (question) { await vues.repondre(p, 'no'); }
    const ouverte = await attendreEtat(p, true);
    await p.waitForFunction((e) => /\d/.test(String(Ext.ComponentQuery.query(e)[0].down('#ocFond').getValue())), ECRAN, { timeout: 15000 }).catch(() => {});
    const e1 = await etat(p);
    ok('Caisse ouverte : ouverture grisée, clôture active, bandeau « ouverte »', ouverte && !e1.ouverture && e1.cloture && /ouverte/.test(e1.bandeau), JSON.stringify(e1));
    const mvt = q("SELECT IFNULL(GROUP_CONCAT(CONCAT_WS('/', lg_MVT_CAISSE_ID, lg_TYPE_MVT_CAISSE_ID, int_AMOUNT)), '') " + depuis('t_mvt_caisse', 'dt_CREATED'));
    const mvtId = mvt.split('/')[0];
    const bilanO = {
      fonds: q("SELECT IFNULL(GROUP_CONCAT(int_AMOUNT), '') FROM t_coffre_caisse WHERE lg_USER_ID = '" + U + "' AND dt_CREATED >= '" + DEBUT + "'"),
      resumes: resumes(), mvt: mvt.replace(/^[^/]*\//, ''),
      transactions: mvtId ? q("SELECT IFNULL(GROUP_CONCAT(montant), '') FROM mvttransaction WHERE pkey = '" + mvtId + "'") : '',
      traces: compter('t_event_log', 'dt_CREATED', " AND str_DESCRIPTION LIKE 'Ouverture de la caisse%'")
    };
    ok('Bilan ouverture : un fond, un résumé en service (15 500), un mouvement « fond de caisse » de 15 500, une transaction, une trace',
      /* colonnes decimales (15500.000) : on compare des nombres */
      Number(bilanO.fonds) === FOND && bilanO.resumes === 'is_Using/' + FOND && bilanO.mvt.split('/')[0] === '1' && Number(bilanO.mvt.split('/')[1]) === FOND
      && bilanO.transactions === String(FOND) && bilanO.traces === 1,
      JSON.stringify(bilanO));
    ok('Rapprochement : fond affiché = base (' + FOND + ')', e1.fond.replace(/\D/g, '') === String(FOND), e1.fond);

    /* cloture : premier clic sans suite */
    await vues.cliquer(p, ECRAN + ' #ocBtnCloturer');
    await p.waitForTimeout(400);
    const e2 = await etat(p);
    const fenetres = await p.evaluate(() => Ext.ComponentQuery.query('window').filter((w) => w.isVisible(true)).map((w) => w.xtype + ':' + (w.title || '')));
    const fenetre = fenetres.length > 0;
    const message2 = await vues.texteMessage(p);
    ok('Premier clic : le bouton demande confirmation, aucune fenêtre', e2.bouton === 'Confirmer la clôture ?' && !fenetre && message2 === '', JSON.stringify({ e2, fenetres, message2 }));
    await p.waitForTimeout(10600);
    const e3 = await etat(p);
    ok('Sans second clic en 10 s : le bouton revient, rien n\'est écrit', e3.bouton === 'Clôturer la caisse' && resumes() === 'is_Using/' + FOND, e3.bouton + ' ; ' + resumes());
    /* deux clics, billetage */
    await vues.cliquer(p, ECRAN + ' #ocBtnCloturer');
    await p.waitForTimeout(300);
    await vues.cliquer(p, ECRAN + ' #ocBtnCloturer');
    await p.waitForFunction(() => { const c = Ext.getCmp('int_NB_DIX'); return c && c.isVisible(true); }, null, { timeout: 30000 });
    for (const [id, n] of [['int_NB_DIX', '1'], ['int_NB_CINQ', '1'], ['int_NB_CINQ_CENT', '1']]) {
      await p.click('#' + (await p.evaluate((x) => Ext.getCmp(x).inputEl.id, id)));
      await p.keyboard.type(n);
    }
    await p.keyboard.press('Tab');
    await vues.cliquer(p, 'window[title=BILLETAGE] button[text=VALIDER]');
    const info = await vues.attendreMessage(p, 'succès', 30000);
    if (info) { await vues.repondre(p, 'ok'); }
    const ferme = await attendreEtat(p, false);
    const e4 = await etat(p);
    ok('Après la clôture : l\'écran reste ouvert et relit son état (fermée, ouverture active, clôture grisée)',
      !!info && ferme && e4.ouverture && !e4.cloture && /fermée/.test(e4.bandeau), JSON.stringify(e4));
    const bilanC = {
      resumes: resumes(),
      billetage: q("SELECT IFNULL(GROUP_CONCAT(CONCAT_WS('/', d.int_NB_DIX_MIL, d.int_NB_CINQ_MIL, d.int_NB_DEUX_MIL, d.int_NB_MIL, d.int_NB_CINQ_CENT, d.int_AUTRE)), '')"
        + " FROM t_billetage b JOIN t_billetage_details d ON d.lg_BILLETAGE_ID = b.lg_BILLETAGE_ID WHERE b.ld_CAISSE_ID IN (SELECT ld_CAISSE_ID " + depuis('t_resume_caisse', 'dt_CREATED') + ")"),
      mvts: compter('t_mvt_caisse', 'dt_CREATED'),
      traces: compter('t_event_log', 'dt_CREATED', " AND str_DESCRIPTION LIKE 'Cloture de la caisse%'")
    };
    ok('Bilan clôture : le résumé passe à « is_Process », un billetage (1, 1, 0, 0, 1, 0), une trace, aucun autre mouvement',
      bilanC.resumes === 'is_Process/' + FOND && bilanC.billetage === '1/1/0/0/1/0' && bilanC.mvts === 1 && bilanC.traces === 1, JSON.stringify(bilanC));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack + ' ' + erreurs.join(' | '));
  } finally {
    await b.close();
    nettoyer();
    fondsDeCote.forEach(([id, st]) => q("UPDATE t_coffre_caisse SET str_STATUT = '" + st + "' WHERE ID_COFFRE_CAISSE = '" + id + "'"));
    ok('Nettoyage : rien ne reste du test, la caisse mise de côté est rendue',
      compter('t_resume_caisse', 'dt_CREATED') === 0 && compter('t_mvt_caisse', 'dt_CREATED') === 0
      && q("SELECT COUNT(*) FROM t_resume_caisse WHERE lg_USER_ID = '" + U + "' AND str_STATUT = 'is_Using'") === String(deCote.length));
    const echecs = res.filter((x) => !x).length;
    console.log('\n' + (res.length - echecs) + '/' + res.length + (echecs ? ' ECHEC' : ' OK'));
    process.exit(echecs ? 1 : 0);
  }
})();
