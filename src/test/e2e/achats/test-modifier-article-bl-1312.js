/* « MODIFIER ARTICLE » DANS LE DETAIL D'UN BL (plan du 12/11 ; journaux d'appaul : erreur 500 sur
 * ws_transaction.jsp?mode=modifproductprice, JSP qui ne compile plus depuis la suppression de ses classes le 18/10).
 *
 * Vrai chemin de l'ecran, sur une COPIE de travail (DB_TEST + E2E_BASE_LIBRE) : menu > Bon de livraison, icone « Detail
 * livraison », icone « Modifier Article » de la ligne, saisie des prix, « Enregistrer ».
 *
 * Decision du 13/11 : comme avant le 18/10, la fiche article prend tout de suite les nouveaux prix.
 *
 * Jeu d'essai varie : un bon de 3 produits (quantites commandees 1, 2, 3), TVA du bon non nulle :
 *  - P1 : les quatre prix changent (prix de vente en hausse) ;
 *  - P2 : « Enregistrer » sans rien changer ;
 *  - P3 : prix de vente et PAF en baisse, quantite 3 ;
 *  - P1 encore, PAF vide : refuse a l'ecran, le champ reste signale (1,5 s apres), rien n'est envoye.
 * Controles :
 *  - rapprochement : prix de la ligne dans le tableau du detail = base = saisie ; montants HT et TTC de l'en-tete du
 *    detail = base = liste des bons = montant de depart + (nouveau PAF - ancien PAF) x quantite ; TVA inchangee ;
 *    fiche article (prix de vente, TIPS, PAF, PA tarif, taux de marque) et prix chez le grossiste = saisie ;
 *  - bilan : un mouvement de prix par prix de vente change (P1, P3), aucun pour P2 ; une trace par ligne modifiee ;
 *    stock et statut du bon inchanges ; rien d'autre ;
 *  - confirmation dans le bouton, aucune fenetre surgissante, aucune erreur JavaScript.
 * Les fiches article et prix grossiste touches sont sauvegardes puis remis ; tout ce que le test a cree est retire.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu, cliquer, saisir, texteMessage } = require('../outils/vues');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 700) + ']' : '')); }
const DB = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', DB, '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\r/g, '').trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', DB, '-e', s], { encoding: 'utf8' });

const PREFIXE = 'E2E-MAB';
const debut = q('SELECT NOW()');
const CANDIDATS = " FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' AND s.str_STATUT = 'enable'"
  + ' JOIN t_famille_grossiste fg ON fg.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND fg.lg_GROSSISTE_ID = f.lg_GROSSISTE_ID'
  + " WHERE f.str_STATUT = 'enable' AND f.int_PRICE > 500 AND f.int_PAF > 200 AND f.int_PAF < f.int_PRICE"
  + " AND (SELECT COUNT(*) FROM t_famille_grossiste x WHERE x.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND x.lg_GROSSISTE_ID = f.lg_GROSSISTE_ID) = 1";
const G = q('SELECT f.lg_GROSSISTE_ID' + CANDIDATS + ' AND f.lg_GROSSISTE_ID IS NOT NULL GROUP BY f.lg_GROSSISTE_ID ORDER BY COUNT(*) DESC LIMIT 1');
const P = q(`SELECT f.lg_FAMILLE_ID${CANDIDATS} AND f.lg_GROSSISTE_ID = '${G}' ORDER BY f.lg_FAMILLE_ID LIMIT 3`).split('\n').map((x) => x.trim()).filter(Boolean);
const QTES = [1, 2, 3];
const TVA = 523;
const LISTE = P.map((x) => "'" + x + "'").join(',');
const BL = PREFIXE + '-BL', ORD = PREFIXE + '-ORD', REF = 'E2EMAB' + String(Date.now()).slice(-6);
const SAUVE = ['t_famille', 't_famille_grossiste'];
const ligne = (prod) => BL + '-D' + P.indexOf(prod);

function retirer() {
  exec(`DELETE FROM t_mouvementprice WHERE dt_UPDATED >= '${debut}' AND lg_FAMILLE_ID IN (${LISTE || "''"});`
    + `DELETE FROM t_event_log WHERE dt_CREATED >= '${debut}' AND str_DESCRIPTION LIKE '%${REF}%';`
    + `DELETE FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID = '${BL}'; DELETE FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${BL}';`
    + `DELETE FROM t_order_detail WHERE lg_ORDER_ID = '${ORD}'; DELETE FROM t_order WHERE lg_ORDER_ID = '${ORD}';`);
}
function remettre() {
  retirer();
  if (q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'e2e_mab_t_famille'") === '1') {
    SAUVE.forEach((t) => {
      const cols = q(`SELECT GROUP_CONCAT(CONCAT('\`', COLUMN_NAME, '\` = VALUES(\`', COLUMN_NAME, '\`)')) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${t}'`);
      exec(`INSERT INTO ${t} SELECT * FROM e2e_mab_${t} ON DUPLICATE KEY UPDATE ${cols}; DROP TABLE e2e_mab_${t};`);
    });
  }
  exec(`DELETE FROM t_famille_history WHERE lg_FAMILLE_ID IN (${LISTE || "''"}) AND dt_CREATED >= '${debut}';`);
}
function sauver() {
  SAUVE.forEach((t) => exec(`DROP TABLE IF EXISTS e2e_mab_${t}; CREATE TABLE e2e_mab_${t} AS SELECT * FROM ${t} WHERE lg_FAMILLE_ID IN (${LISTE});`));
}
function creer() {
  const qte = 'CASE f.lg_FAMILLE_ID ' + P.map((x, i) => `WHEN '${x}' THEN ${QTES[i]}`).join(' ') + ' END';
  const idx = 'CASE f.lg_FAMILLE_ID ' + P.map((x, i) => `WHEN '${x}' THEN ${i}`).join(' ') + ' END';
  exec(`INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)`
    + ` SELECT '${ORD}', '${REF}', ${P.length}, '${G}', u.lg_USER_ID, 'is_Process', NOW(), NOW(), 0, 0, 0 FROM t_user u WHERE u.str_LOGIN = '${ENV_E2E.LOGIN}';`
    + `INSERT INTO t_bon_livraison (lg_BON_LIVRAISON_ID, str_REF_LIVRAISON, dt_DATE_LIVRAISON, int_MHT, int_TVA, int_HTTC, lg_ORDER_ID, str_STATUT, dt_CREATED, dt_UPDATED, lg_USER_ID)`
    + ` SELECT '${BL}', '${REF}', NOW(), SUM(${qte} * f.int_PAF), ${TVA}, SUM(${qte} * f.int_PAF) + ${TVA}, '${ORD}', 'enable', NOW(), NOW(), MAX(u.lg_USER_ID) FROM t_famille f, t_user u WHERE f.lg_FAMILLE_ID IN (${LISTE}) AND u.str_LOGIN = '${ENV_E2E.LOGIN}';`
    + `INSERT INTO t_bon_livraison_detail (lg_BON_LIVRAISON_DETAIL, lg_GROSSISTE_ID, lg_FAMILLE_ID, lg_BON_LIVRAISON_ID, int_QTE_CMDE, int_QTE_UG, int_QTE_RECUE, int_PRIX_REFERENCE, int_PRIX_VENTE, int_PAF, int_PA_REEL, lg_ZONE_GEO_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_QTE_MANQUANT, int_QTE_RETURN, int_INITSTOCK)`
    + ` SELECT CONCAT('${BL}-D', ${idx}), '${G}', f.lg_FAMILLE_ID, '${BL}', ${qte}, 0, 0, f.int_PRICE, f.int_PRICE, f.int_PAF, f.int_PAF, f.lg_ZONE_GEO_ID, 'enable', NOW(), NOW(), 0, 0, s.int_NUMBER_AVAILABLE`
    + ` FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' WHERE f.lg_FAMILLE_ID IN (${LISTE});`);
}
const prixLigne = (prod) => q(`SELECT CONCAT_WS('|', int_PRIX_VENTE, int_PRIX_REFERENCE, int_PAF, int_PA_REEL) FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_DETAIL = '${ligne(prod)}'`);
const fiche = (prod) => q(`SELECT CONCAT_WS('|', f.int_PRICE, IFNULL(f.int_PRICE_TIPS, f.int_PRICE), f.int_PAF, f.int_PAT, IFNULL(f.int_TAUX_MARQUE, ''), fg.int_PRICE, fg.int_PAF) FROM t_famille f`
  + ` JOIN t_famille_grossiste fg ON fg.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND fg.lg_GROSSISTE_ID = '${G}' WHERE f.lg_FAMILLE_ID = '${prod}'`);
const montants = () => q(`SELECT CONCAT_WS('|', int_MHT, int_TVA, int_HTTC, str_STATUT) FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${BL}'`);
const stocks = () => q(`SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, ':', int_NUMBER_AVAILABLE) ORDER BY lg_FAMILLE_ID) FROM t_famille_stock WHERE lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID IN (${LISTE})`);
/* taux de marque, meme regle que TauxMarque.calculer : (prix - PAF) / prix x 100, arrondi */
const taux = (prix, paf) => (prix > 0 ? String(Math.round((prix - paf) * 100 / prix)) : '');
const entier = (s) => Number(String(s || '').replace(/[^0-9-]/g, ''));

(async () => {
  console.log('Serveur : ' + (process.env.BASE || '') + ', base ' + DB + ', grossiste ' + G);
  ok('Précondition : 3 produits d\'un même grossiste, avec leur prix chez ce grossiste', P.length === 3, P.length + ' produits');
  if (P.length !== 3) { process.exit(1); }
  remettre();
  sauver();
  creer();
  const stockAvant = stocks();
  const depart = {};
  P.forEach((x) => { const [pv, tips, paf, pat] = prixLigne(x).split('|').map(Number); depart[x] = { pv, tips, paf, pat }; });
  const montantDepart = montants().split('|').map((v, i) => (i < 3 ? Number(v) : v));
  const SAISIES = [
    { prod: P[0], pv: depart[P[0]].pv + 100, tips: depart[P[0]].pv + 50, paf: depart[P[0]].paf + 37, pat: depart[P[0]].paf + 41 },
    { prod: P[1], pv: depart[P[1]].pv, tips: depart[P[1]].tips, paf: depart[P[1]].paf, pat: depart[P[1]].pat },
    { prod: P[2], pv: depart[P[2]].pv - 75, tips: depart[P[2]].tips, paf: depart[P[2]].paf - 23, pat: depart[P[2]].pat },
  ];
  const ficheAvant = Object.fromEntries(P.map((x) => [x, fiche(x)]));
  const b = await ENV_E2E.lancer(chromium);
  const surgies = [];
  try {
    const p = await (await b.newContext({ viewport: { width: 1700, height: 1000 } })).newPage();
    const erreurs = []; p.on('pageerror', (e) => erreurs.push(String(e.message)));
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const libelles = await p.evaluate(() => {
      const n = Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().findChild('id', 'bonlivraisonmanager', true);
      return n ? { parent: n.parentNode.get('text'), entree: n.get('text') } : null;
    });
    if (!libelles) { throw new Error('menu bonlivraisonmanager absent pour ce compte'); }
    await ouvrirMenu(p, libelles.parent, libelles.entree);
    await p.waitForFunction((bl) => { const g = Ext.ComponentQuery.query('bonlivraisonmanager')[0]; return g && g.isVisible(true) && !g.getStore().isLoading() && g.getStore().findExact('lg_BON_LIVRAISON_ID', bl) >= 0; }, BL, { timeout: 120000 });
    const icone = await p.evaluate((bl) => { const g = Ext.ComponentQuery.query('bonlivraisonmanager')[0], v = g.getView();
      const n = v.getNode(g.getStore().findExact('lg_BON_LIVRAISON_ID', bl)); n.scrollIntoView();
      const img = n.querySelector('img.x-action-col-0'); img.id = img.id || 'e2e-detail-bl'; return img.id; }, BL);
    await p.click('#' + icone);
    await p.waitForFunction(() => { const g = Ext.getCmp('gridpanelID'); return g && g.isVisible(true) && !g.getStore().isLoading() && g.getStore().getCount() === 3; }, null, { timeout: 120000 });
    await p.waitForTimeout(800);

    const ouvrir = async (prod) => {
      const id = await p.evaluate((pr) => {
        const g = Ext.getCmp('gridpanelID');
        const cols = g.headerCt.getGridColumns();
        const col = cols.find((c) => c.items && c.items[0] && c.items[0].tooltip === 'Modifier Article');
        const n = g.getView().getNode(g.getStore().findExact('lg_FAMILLE_ID', pr));
        n.scrollIntoView();
        const img = n.querySelector('.x-grid-cell-' + col.id + ' img');
        img.id = 'e2e-modifier-' + pr.replace(/[^A-Za-z0-9]/g, '');
        return img.id;
      }, prod);
      console.log('ouverture de « Modifier Article » pour ' + prod);
      await p.click('#' + id, { timeout: 15000 }).catch(async (e) => {
        const vues = await p.evaluate(() => Ext.ComponentQuery.query('window{isVisible()}').map((w) => w.title || w.getId()));
        if (process.env.E2E_DEBUG) { await p.screenshot({ path: process.env.E2E_DEBUG }); }
        throw new Error('clic impossible sur Modifier Article (' + prod + '), fenetres visibles : ' + JSON.stringify(vues) + ' ; ' + e.message.split(/\r?\n/)[0]);
      });
      await p.waitForFunction(() => Ext.ComponentQuery.query('window{isVisible()} button[text=Enregistrer]').length > 0, null, { timeout: 20000 });
      await p.waitForTimeout(500);
    };
    const bouton = 'window{isVisible()} button[text=Enregistrer]';
    for (const s of SAISIES) {
      await ouvrir(s.prod);
      await saisir(p, '#int_PRIX_VENTE', String(s.pv));
      await saisir(p, '#int_PRIX_REFERENCE', String(s.tips));
      await saisir(p, '#int_PA_REEL', String(s.pat));
      await saisir(p, '#int_PAF', String(s.paf));
      const idBouton = await p.evaluate((r) => Ext.ComponentQuery.query(r)[0].getId(), bouton);
      const textes = [];
      await p.click('#' + idBouton);
      const fin = Date.now() + 20000;
      while (Date.now() < fin) {
        const etat = await p.evaluate((idb) => { const c = Ext.getCmp(idb); return c && !c.isDestroyed ? c.getText() : null; }, idBouton);
        if (etat && textes.indexOf(etat) < 0) { textes.push(etat); }
        const m = await texteMessage(p);
        if (m) { surgies.push(m); await p.evaluate(() => Ext.ComponentQuery.query('messagebox{isVisible()}').forEach((x) => x.close())); }
        if (etat === null) { break; }
        await p.waitForTimeout(100);
      }
      s.textes = textes;
      /* une boite arrivee apres la fermeture (ancien code : erreur 500 annoncee apres coup) est relevee et fermee */
      const tardive = Date.now() + 3000;
      while (Date.now() < tardive) {
        const m = await texteMessage(p);
        if (m) { surgies.push(m); await p.evaluate(() => Ext.ComponentQuery.query('messagebox{isVisible()}').forEach((x) => x.close())); break; }
        await p.waitForTimeout(200);
      }
      await p.waitForFunction(() => !Ext.getCmp('gridpanelID').getStore().isLoading(), null, { timeout: 30000 });
      await p.waitForTimeout(600);
    }
    /* P1 encore, PAF vide : refuse a l'ecran */
    await ouvrir(P[0]);
    const envoisAvant = [];
    p.on('request', (r) => { if (/\/prix$/.test(r.url()) || /modifproductprice/.test(r.url())) { envoisAvant.push(r.url()); } });
    await cliquer(p, '#int_PAF'); await p.keyboard.press('Control+A'); await p.keyboard.press('Delete'); await p.keyboard.press('Tab');
    await p.click('#' + await p.evaluate((r) => Ext.ComponentQuery.query(r)[0].getId(), bouton));
    await p.waitForTimeout(1500);
    const vide = await p.evaluate(() => ({ invalide: !!Ext.getCmp('int_PAF') && Ext.getCmp('int_PAF').hasActiveError(), ouverte: Ext.ComponentQuery.query('window{isVisible()} button[text=Enregistrer]').length > 0 }));
    ok('PAF vide : champ signalé, fenêtre ouverte, rien n\'est envoyé', vide.invalide && vide.ouverte && envoisAvant.length === 0, JSON.stringify(vide) + ' envois ' + envoisAvant.length);
    await p.evaluate(() => { const x = Ext.ComponentQuery.query('window{isVisible()} button[text=Annuler]')[0]; if (x) { x.up('window').close(); } Ext.ComponentQuery.query('messagebox{isVisible()}').forEach((m) => m.close()); });
    await p.waitForTimeout(500);

    /* --- rapprochement --- */
    const tableau = await p.evaluate(() => {
      const g = Ext.getCmp('gridpanelID');
      const o = {};
      g.getStore().getRange().forEach((r) => { o[r.get('lg_FAMILLE_ID')] = [r.get('int_PRIX_VENTE'), r.get('int_PRIX_REFERENCE'), r.get('int_PAF'), r.get('int_PA_REEL')].join('|'); });
      return o;
    });
    const entete = await p.evaluate(() => ['ig_mht', 'ig_tva', 'ig_ttc'].map((id) => (Ext.fly(id) ? Ext.fly(id).dom.textContent : null)));
    let attenduHT = montantDepart[0];
    SAISIES.forEach((s) => { attenduHT += (s.paf - depart[s.prod].paf) * QTES[P.indexOf(s.prod)]; });
    const enBase = montants().split('|');
    for (const s of SAISIES) {
      const attendu = [s.pv, s.tips, s.paf, s.pat].join('|');
      ok(`${s.prod} : prix de la ligne, tableau = base = saisie`, tableau[s.prod] === attendu && prixLigne(s.prod) === attendu, 'tableau ' + tableau[s.prod] + ' base ' + prixLigne(s.prod) + ' saisie ' + attendu);
      const attenduFiche = [s.pv, s.tips, s.paf, s.pat, taux(s.pv, s.paf), s.pv, s.paf].join('|');
      const inchange = s.prod === P[1];
      ok(`${s.prod} : fiche article et prix grossiste = saisie${inchange ? ' (rien ne change)' : ''}`,
        fiche(s.prod).split('|').slice(0, 4).join('|') === attenduFiche.split('|').slice(0, 4).join('|')
        && fiche(s.prod).split('|').slice(5).join('|') === attenduFiche.split('|').slice(5).join('|')
        && (inchange ? fiche(s.prod) === ficheAvant[s.prod] || fiche(s.prod).split('|')[4] === taux(s.pv, s.paf) : fiche(s.prod).split('|')[4] === taux(s.pv, s.paf)),
        'fiche ' + fiche(s.prod) + ' ; attendu ' + attenduFiche + ' ; avant ' + ficheAvant[s.prod]);
      ok(`${s.prod} : confirmation dans le bouton`, s.textes.some((t) => /modifi/i.test(t)), JSON.stringify(s.textes));
    }
    ok('montant HT : en-tête = base = départ + (nouveau PAF − ancien PAF) × quantité',
      Number(enBase[0]) === attenduHT && entier(entete[0]) === attenduHT, 'base ' + enBase[0] + ' en-tête ' + entete[0] + ' attendu ' + attenduHT + ' (départ ' + montantDepart[0] + ')');
    ok('TVA inchangée, TTC = HT + TVA à l\'en-tête et en base', Number(enBase[1]) === TVA && Number(enBase[2]) === attenduHT + TVA && entier(entete[2]) === attenduHT + TVA,
      'base ' + enBase.join('|') + ' en-tête ' + entete.join('|'));
    /* liste des bons, apres retour */
    await ouvrirMenu(p, libelles.parent, libelles.entree);
    await p.waitForFunction((bl) => { const g = Ext.ComponentQuery.query('bonlivraisonmanager')[0]; return g && !g.getStore().isLoading() && g.getStore().findExact('lg_BON_LIVRAISON_ID', bl) >= 0; }, BL, { timeout: 60000 });
    const liste = await p.evaluate((bl) => { const g = Ext.ComponentQuery.query('bonlivraisonmanager')[0]; const r = g.getStore().getAt(g.getStore().findExact('lg_BON_LIVRAISON_ID', bl)); return [r.get('int_MHT'), r.get('int_HTTC')]; }, BL);
    ok('liste des bons : montants HT et TTC = base', Number(liste[0]) === attenduHT && Number(liste[1]) === attenduHT + TVA, JSON.stringify(liste));

    /* --- bilan --- */
    const mvtPrix = Object.fromEntries(P.map((x) => [x, q(`SELECT CONCAT_WS('|', COUNT(*), IFNULL(GROUP_CONCAT(CONCAT(int_PRICE_OLD, '>', int_PRICE_NEW)), '')) FROM t_mouvementprice WHERE lg_FAMILLE_ID = '${x}' AND dt_UPDATED >= '${debut}'`)]));
    ok('bilan : un mouvement de prix pour P1 et P3 (ancien > nouveau), aucun pour P2',
      mvtPrix[P[0]] === `1|${depart[P[0]].pv}>${SAISIES[0].pv}` && mvtPrix[P[1]] === '0|' && mvtPrix[P[2]] === `1|${depart[P[2]].pv}>${SAISIES[2].pv}`, JSON.stringify(mvtPrix));
    /* une trace par fiche article dont un des quatre prix change (P2 aussi si sa fiche differait de sa ligne) */
    const tracesAttendues = SAISIES.filter((s) => ficheAvant[s.prod].split('|').slice(0, 4).join('|') !== [s.pv, s.tips, s.paf, s.pat].join('|')).length;
    const traces = q(`SELECT COUNT(*) FROM t_event_log WHERE dt_CREATED >= '${debut}' AND str_DESCRIPTION LIKE '%${REF}%'`);
    ok('bilan : une trace par fiche article dont un prix change (' + tracesAttendues + ')', Number(traces) === tracesAttendues, traces);
    ok('bilan : stock et statut du bon inchangés', stocks() === stockAvant && enBase[3] === 'enable', stocks() + ' / ' + stockAvant + ' ; ' + enBase[3]);
    ok('aucune fenêtre surgissante', surgies.length === 0, surgies.join(' | '));
    ok('aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Le test va jusqu\'au bout', false, String(e && e.stack).slice(0, 600));
  } finally {
    await b.close();
    remettre();
    ok('Données d\'essai retirées, fiches remises', stocks() === stockAvant && P.every((x) => fiche(x) === ficheAvant[x])
      && q(`SELECT COUNT(*) FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${BL}'`) === '0'
      && q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE 'e2e\\_mab\\_%'") === '0');
  }
  const echecs = res.filter((r) => !r.c).length;
  console.log('\n===== ' + (res.length - echecs) + '/' + res.length + (echecs ? ' FAIL' : ' PASS') + ' =====');
  process.exit(echecs ? 1 : 0);
})();
