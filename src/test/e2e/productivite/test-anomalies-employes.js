/* ANOMALIES PAR EMPLOYE (retour du 24/10) : ce qu'une personne a provoque, et ce qu'elle a fait juste avant.
 *
 * Trois familles : refus affiches a l'employe, operations a risque (annulations, modifications, remises, ventes
 * longues : deja dans les tables), erreurs du logiciel (rangees a part). Chaque anomalie est gardee a chaque fois, avec
 * l'employe, le poste, l'ecran et le fil de ses dernieres actions (ecrans, boutons, codes scannes ; jamais le texte
 * tape). Ecriture seulement quand une anomalie survient.
 * Par les vues (admin) :
 *  - vente (SERVICE CLIENT > Ventes > Nouvelle vente), lecture GS1 activee : un code « date + lot » scanne -> refus
 *    affiche -> une anomalie REFUS enregistree, avec l'ecran et le code scanne dans le fil ;
 *  - une erreur JavaScript survient -> une anomalie LOGICIEL, rangee a part ;
 *  - aucune autre ecriture pendant le travail normal (ouvrir les ecrans, taper) ;
 *  - ANALYSE DE GESTION > Activité des équipes > onglet « Anomalies » : ligne de l'employe (refus, erreurs du
 *    logiciel, operations a risque, pour 100 ventes) ; clic -> ses anomalies ; clic sur une anomalie -> « ce qu'il
 *    a fait avant » (ecran Ventes, code scanne) ;
 *  - aucune fenetre du navigateur, aucune erreur JavaScript hors celle provoquee. Donnees de l'essai retirees.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer, texteMessage, repondre } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const CODE = '172701011012345678';
const LECTURE = q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_VENTE_LECTURE_GS1'");
const ERREUR = 'E2E anomalie logicielle ' + Date.now();

(async () => {
  const table = q("SHOW TABLES LIKE 't_anomalie_employe'");
  const debut = q('SELECT NOW()');
  q("UPDATE t_parameters SET str_VALUE = '1' WHERE str_KEY = 'KEY_VENTE_LECTURE_GS1'");
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = [], dialogues = [], envois = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  p.on('request', (r) => { if (/api\/v1\/anomalies$/.test(r.url().replace(/\?.*/, '')) && r.method() === 'POST') { envois.push(r.postData()); } });
  let vente = null;
  try {
    ok('Table des anomalies créée par la migration', table === 't_anomalie_employe', table);
    await connexion(p, 'admin', 'e2etest');
    await ouvrirMenu(p, 'SERVICE CLIENT', 'Ventes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('cloturerventemanager #addBtn').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await cliquer(p, 'cloturerventemanager #addBtn');
    const champ = 'doventemanager #contenu [xtype=fieldcontainer] #produit';
    await p.waitForFunction((r) => Ext.ComponentQuery.query(r).some((x) => x.isVisible(true)), champ, { timeout: 60000 });
    await p.waitForTimeout(1500);
    ok('Travail normal (menu, nouvelle vente) : aucune écriture d\'anomalie', envois.length === 0, envois.length);
    await cliquer(p, champ);
    await p.keyboard.type(CODE, { delay: 5 });
    await p.keyboard.press('Enter');
    await p.waitForFunction(() => Ext.Msg.isVisible(), null, { timeout: 20000 }).catch(() => {});
    const boite = await texteMessage(p);
    await repondre(p, 'ok').catch(() => {});
    await p.waitForTimeout(1500);
    vente = await p.evaluate(() => { const c = testextjs.app.getController('VenteCtr').current; return c && c.lgPREENREGISTREMENTID; });
    ok('Refus affiché à l\'employé (code sans produit)', /ne contient pas le produit/.test(boite || ''), boite);
    ok('Une seule écriture : l\'anomalie du refus', envois.length === 1 && /REFUS/.test(envois[0]), envois.join(' | ').slice(0, 300));
    await p.evaluate((m) => { setTimeout(() => { throw new Error(m); }, 0); }, ERREUR);
    await p.waitForTimeout(2000);
    ok('Erreur JavaScript -> une anomalie LOGICIEL', envois.length === 2 && /LOGICIEL/.test(envois[1]), envois.slice(1).join(' | ').slice(0, 300));
    const enBase = q(`SELECT CONCAT_WS('|', famille, ecran, LOCATE('${CODE}', fil) > 0) FROM t_anomalie_employe WHERE created_at >= '${debut}' AND famille = 'REFUS' ORDER BY id DESC LIMIT 1`);
    ok('En base : REFUS, écran Ventes, code scanné dans le fil', /^REFUS\|.*Vente.*\|1$/.test(enBase), enBase);
    const brut = q(`SELECT message FROM t_anomalie_employe WHERE created_at >= '${debut}' AND famille = 'REFUS' ORDER BY id DESC LIMIT 1`);
    const filBrut = q(`SELECT fil FROM t_anomalie_employe WHERE created_at >= '${debut}' AND famille = 'REFUS' ORDER BY id DESC LIMIT 1`);
    ok('Fil sans paramètres d\'URL (aucun texte tapé)', filBrut.length > 0 && !/\?[a-zA-Z_]+=/.test(filBrut), filBrut.slice(0, 200));
    ok('Message enregistré tel que lu (apostrophe, sans entité HTML)', brut.includes("C'est") && !/&#\d+;|&[a-z]+;/.test(brut), brut.slice(0, 120));

    /* --- ecran Anomalies */
    await ouvrirMenu(p, 'ANALYSE DE GESTION', 'Activité des équipes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('activiteequipes #ae-anomalies').some((x) => x.isVisible(true)), null, { timeout: 60000 }).catch(() => {});
    const onglet = await p.evaluate(() => Ext.ComponentQuery.query('activiteequipes #ae-anomalies').length);
    ok('Onglet « Anomalies » présent', onglet === 1, onglet);
    if (onglet) {
      await cliquer(p, 'activiteequipes #ae-anomalies');
      await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('activiteequipes #anoEmployes')[0]; return g && !g.getStore().isLoading() && g.getStore().getCount() > 0; }, null, { timeout: 120000 });
      const ligne = await p.evaluate(() => { const g = Ext.ComponentQuery.query('activiteequipes #anoEmployes')[0];
        const r = g.getStore().findRecord('nom', 'Super Admin') || g.getStore().getAt(0); return r ? r.getData() : null; });
      ok('Ligne de l\'employé : refus ≥ 1, erreurs du logiciel ≥ 1, opérations à risque et ventes présentes', ligne && ligne.refus >= 1 && ligne.logiciel >= 1
        && ligne.annulations !== undefined && ligne.ventes !== undefined, JSON.stringify(ligne));
      const idLigne = await p.evaluate(() => { const g = Ext.ComponentQuery.query('activiteequipes #anoEmployes')[0]; const r = g.getStore().findRecord('nom', 'Super Admin');
        const n = g.getView().getNode(r); n.setAttribute('data-e2e', 'ligne-admin'); return true; });
      await p.click('[data-e2e=ligne-admin]');
      await p.waitForTimeout(2500);
      const liste = await p.evaluate(() => { const g = Ext.ComponentQuery.query('activiteequipes #anoListe')[0]; const l = []; g.getStore().each((r) => l.push(r.get('famille') + '|' + r.get('message'))); return l; });
      ok('Clic sur l\'employé : ses anomalies, dont le refus et l\'erreur du logiciel', liste.some((x) => /^REFUS\|.*ne contient pas le produit/.test(x)) && liste.some((x) => x.startsWith('LOGICIEL|') && x.includes(ERREUR)), liste.slice(0, 4).join(' ; '));
      await p.evaluate(() => { const g = Ext.ComponentQuery.query('activiteequipes #anoListe')[0]; const r = g.getStore().findBy((x) => x.get('famille') === 'REFUS');
        g.getView().getNode(g.getStore().getAt(r)).setAttribute('data-e2e', 'ano-refus'); });
      await p.click('[data-e2e=ano-refus]');
      await p.waitForTimeout(2500);
      const fil = await p.evaluate(() => Ext.ComponentQuery.query('activiteequipes #anoFil')[0].getEl().dom.textContent);
      ok('Clic sur l\'anomalie : « ce qu\'il a fait avant » (écran Ventes, code scanné)', /Vente/.test(fil) && fil.includes(CODE), fil.slice(0, 300));
    }
    ok('Aucune fenêtre du navigateur ; aucune erreur JavaScript hors celle provoquée', dialogues.length === 0 && erreurs.filter((e) => !e.includes(ERREUR)).length === 0, dialogues.concat(erreurs).join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    if (vente) { await p.evaluate((id) => fetch('../api/v1/ventestats/remove/' + id, { method: 'POST' }), vente).catch(() => {}); }
    await b.close();
    q(`UPDATE t_parameters SET str_VALUE = '${LECTURE}' WHERE str_KEY = 'KEY_VENTE_LECTURE_GS1'`);
    if (table) { q(`DELETE FROM t_anomalie_employe WHERE created_at >= '${debut}'`); }
    ok('Données de l\'essai retirées, paramètre remis', q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_VENTE_LECTURE_GS1'") === LECTURE
      && (!table || q(`SELECT COUNT(*) FROM t_anomalie_employe WHERE created_at >= '${debut}'`) === '0'));
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
