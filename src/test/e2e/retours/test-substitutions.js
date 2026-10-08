/* SUBSTITUTIONS PHARMAML SUIVIES JUSQU'A LA COMMANDE (retours du 08/10 (7)). Faux grossiste local, par les ecrans :
 *  - commande A : un produit livre A LA PLACE d'un autre (EL) -> ajoute a la commande, badge « Remplace … » sur la
 *    ligne, « Retirer » l'enleve de la commande avant la reception (montant recalcule) ;
 *  - commande B : un equivalent PROPOSE (EP) -> pastille « 1 a decider » sur la liste des commandes ; clic = liste des
 *    ruptures limitee aux equivalents de B ; bandeau dans l'ecran de la commande ;
 *  - onglet « Substitutions » de la liste des ruptures : historique (etat, qui, quand, historique en info-bulle),
 *    filtre par etat ; « Annuler l'acceptation » tant que la rupture n'est pas renvoyee (la rupture reprend le produit
 *    d'origine, la proposition redevient a decider) ; plus possible une fois la rupture renvoyee ;
 *  - commande deja en reception (bon de livraison) : retrait refuse avec la raison ;
 *  - choix memorises : listes et supprimables ;
 *  - aucune erreur JavaScript ; tout est retire a la fin.
 */
const { execFileSync } = require('child_process');
const http = require('http');
const archives = require('./archives-pharmaml');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const SORTIE = process.env.SORTIE || '/tmp';
const PORT = 18776, G = '51217123531215794892';
const A = 'E2E-SUB-A', B = 'E2E-SUB-B', C = 'E2E-SUB-C', CMDS = [A, B, C];
let P = [], cips = [], noms = [], sauve = null, fgAvant = {};

const serveur = http.createServer((req, rep) => { let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => {
  const type = /\/el\//.test(req.url) ? 'EL' : 'EP', code = type === 'EL' ? cips[2] : cips[3];
  const lignes = [...b.matchAll(/<(?:\w+:)?LIGNE_N [^>]*Code_Produit="([^"]*)"[^>]*Quantite="(\d+)"/g)];
  rep.writeHead(200, { 'Content-Type': 'text/xml' });
  rep.end('<?xml version="1.0" encoding="UTF-8"?><CSRP_ENVELOPPE xmlns="urn:x-csrp:fr.csrp.protocole:enveloppe" Version_Protocole="1.0.0.0"><ENTETE><REF_MESSAGE>E2E</REF_MESSAGE></ENTETE><CORPS><MESSAGE_REPARTITEUR xmlns="urn:x-csrp:fr.csrp.protocole:message"><CORPS><REP_COMMANDE><NORMALE>'
    + lignes.map((m, i) => i === 0
      ? '<LIGNE_N Code_Produit="' + m[1] + '" Quantite_livree="' + Number(m[2]) + '"><PRIX_N Nature="PHAHT" Valeur="1500"/><PRIX_N Nature="PUBTC" Valeur="2500"/></LIGNE_N>'
      : '<LIGNE_N Code_Produit="' + m[1] + '" Quantite_livree="0"><PRIX_N Nature="PHAHT" Valeur="1400"/><PRIX_N Nature="PUBTC" Valeur="2300"/><INDISPONIBILITE_N Code_Reponse="0004" Additif="">'
        + '<PRODUIT_REMPLACANT Type_Remplacement="' + type + '" Type_Codification="CIP39" Code_Produit="' + code + '" Designation="SUBSTITUT E2E"/></INDISPONIBILITE_N></LIGNE_N>').join('')
    + '</NORMALE></REP_COMMANDE></CORPS></MESSAGE_REPARTITEUR></CORPS></CSRP_ENVELOPPE>');
}); });

const liste = (a) => a.map((x) => "'" + x + "'").join(',');
function nettoyer() {
  archives.retirer(/E2E-SUB/);
  exec("DELETE FROM rupture_detail WHERE ruptureId IN (SELECT id FROM rupture WHERE reference IN (" + liste(CMDS) + ")); DELETE FROM rupture WHERE reference IN (" + liste(CMDS) + ");"
    + "DELETE FROM t_order_detail WHERE lg_ORDER_ID IN (" + liste(CMDS) + "); DELETE FROM t_order WHERE lg_ORDER_ID IN (" + liste(CMDS) + ");"
    + "DELETE FROM t_pharmaml_attente WHERE lg_SOURCE_ID IN (" + liste(CMDS) + ") OR lg_ID LIKE 'e2e-sub-%'; DELETE FROM t_pharmaml_remplacement WHERE lg_ORDER_ID IN (" + liste(CMDS) + ");"
    + "DELETE FROM t_pharmaml_reponse_ligne WHERE lg_SOURCE_ID IN (" + liste(CMDS) + ") OR lg_ORDER_ID IN (" + liste(CMDS) + ");");
  if (P.length) {
    exec("DELETE FROM t_pharmaml_equivalent_choix WHERE lg_FAMILLE_ID IN ('" + P[1] + "') AND str_CODE_REMPLACANT IN ('" + cips[2] + "', '" + cips[3] + "');");
    [2, 3].forEach((i) => exec("DELETE FROM t_famille_grossiste WHERE lg_FAMILLE_ID = '" + P[i] + "' AND lg_GROSSISTE_ID = '" + G + "'"
      + (fgAvant[i] ? " AND lg_FAMILLE_GROSSISTE_ID NOT IN (" + liste(fgAvant[i].split(',')) + ")" : '')));
  }
}
function poser(cmd) {
  exec("INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)"
    + " VALUES ('" + cmd + "', '" + cmd + "', 2, '" + G + "', (SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin' LIMIT 1), 'is_Process', NOW(), NOW(), 0, 0, 0)");
  P.slice(0, 2).forEach((p, i) => exec("INSERT INTO t_order_detail (lg_ORDERDETAIL_ID, lg_ORDER_ID, lg_FAMILLE_ID, lg_GROSSISTE_ID, int_NUMBER, int_PRICE, int_PAF_DETAIL, int_PRICE_DETAIL, str_STATUT, dt_CREATED, dt_UPDATED)"
    + " VALUES ('" + cmd + "-" + i + "', '" + cmd + "', '" + p + "', '" + G + "', " + (i + 2) + ", 0, 1000, 2000, 'is_Process', NOW(), NOW())"));
}
const url = (u) => exec("UPDATE t_grossiste SET str_URL_PHARMAML = " + (u === null ? 'NULL' : "'" + u + "'") + ", str_PHARMAML_VERSION_CMDE = '1.0.0.0' WHERE lg_GROSSISTE_ID = '" + G + "'");

(async () => {
  await new Promise((r) => serveur.listen(PORT, '127.0.0.1', r));
  sauve = q("SELECT CONCAT(IFNULL(str_URL_PHARMAML, 'NULL'), '|', str_PHARMAML_VERSION_CMDE) FROM t_grossiste WHERE lg_GROSSISTE_ID = '" + G + "'").split('|');
  const lus = q("SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, ':', int_CIP, ':', REPLACE(str_NAME, ':', ' ')) ORDER BY str_NAME SEPARATOR '|') FROM (SELECT lg_FAMILLE_ID, int_CIP, str_NAME FROM t_famille WHERE str_STATUT='enable'"
    + " AND int_CIP REGEXP '^[0-9]{7}$' AND (SELECT COUNT(*) FROM t_famille x WHERE x.int_CIP = t_famille.int_CIP) = 1 ORDER BY str_NAME LIMIT 4) x").split('|');
  P = lus.map((x) => x.split(':')[0]); cips = lus.map((x) => x.split(':')[1]); noms = lus.map((x) => x.split(':').slice(2).join(':'));
  [2, 3].forEach((i) => { fgAvant[i] = q("SELECT IFNULL(GROUP_CONCAT(lg_FAMILLE_GROSSISTE_ID), '') FROM t_famille_grossiste WHERE lg_FAMILLE_ID = '" + P[i] + "' AND lg_GROSSISTE_ID = '" + G + "'"); });
  nettoyer();
  const { chromium } = require('playwright-core');
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const envoyer = (cmd) => p.evaluate(async (id) => JSON.parse(await (await fetch('../api/v1/pharma/' + id, { method: 'PUT' })).text()), cmd);
  const ouvrirCommandes = async (texte, attendue) => {
    await p.evaluate(() => { testextjs.app.getController('App').onRedirectTo('i_order_manager', {}); });
    await p.waitForFunction(() => Ext.ComponentQuery.query('i_order_manager').length > 0 && Ext.ComponentQuery.query('i_order_manager')[0].isVisible(), null, { timeout: 30000 });
    await p.waitForTimeout(1000);
    await p.evaluate((t) => { Ext.getCmp('rechecher').setValue(t); Ext.ComponentQuery.query('i_order_manager')[0].onRechClick(); }, texte);
    await p.waitForFunction((ref) => { const st = Ext.ComponentQuery.query('i_order_manager')[0].getStore(); return !st.isLoading() && st.findExact('str_REF_ORDER', ref) >= 0; }, attendue, { timeout: 30000 });
    await p.waitForTimeout(500);
  };
  /* une grille peut se redessiner entre le reperage et le clic : reperage puis clic, plusieurs essais */
  const cliquer = async (reperer, arg, id) => {
    for (let essai = 0; essai < 5; essai++) {
      await p.evaluate(reperer, arg);
      try { await p.click('#' + id, { timeout: 4000 }); return; } catch (e) { if (essai === 4) { throw e; } await p.waitForTimeout(700); }
    }
  };
  const lignesSubst = () => p.evaluate((refs) => { const g = Ext.ComponentQuery.query('rupturepharma #grilleSubstitutions')[0]; const o = {};
    g.getStore().each((r) => { if (refs.includes(r.get('reference'))) { const n = g.getView().getNode(r);
      o[r.get('reference')] = { statut: r.get('statut'), qui: r.get('utilisateur'), annuler: !!(n && n.querySelector('.subst-annuler')), retirer: !!(n && n.querySelector('.subst-retirer')),
        texte: n ? n.textContent : '', tip: n && n.querySelector('.etat-subst') ? n.querySelector('.etat-subst').closest('td').getAttribute('data-qtip') : '' }; } }); return o; }, CMDS);
  const rechargerSubst = async () => {
    await p.evaluate(() => Ext.ComponentQuery.query('rupturepharma')[0].chargerSubstitutions());
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('rupturepharma #grilleSubstitutions')[0]; return !g.getStore().isLoading(); }, null, { timeout: 20000 });
    await p.waitForTimeout(400);
  };
  const cliquerSubst = async (ref, cls) => {
    await cliquer((a) => { const g = Ext.ComponentQuery.query('rupturepharma #grilleSubstitutions')[0]; const r = g.getStore().getAt(g.getStore().findExact('reference', a.ref));
      const x = r && g.getView().getNode(r) && g.getView().getNode(r).querySelector('.' + a.cls); if (x) { x.id = 'e2e-subst-clic'; } }, { ref, cls }, 'e2e-subst-clic');
  };
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);

    /* reponses : A et C avec un produit livre a la place (EL), B avec un equivalent propose (EP) */
    url('http://127.0.0.1:' + PORT + '/el/'); poser(A); poser(C); await envoyer(A); await envoyer(C);
    url('http://127.0.0.1:' + PORT + '/ep/'); poser(B); await envoyer(B);
    const lien = q("SELECT CONCAT(str_STATUT, '|', IF(lg_ORDERDETAIL_ID IS NULL, 'sans', 'avec')) FROM t_pharmaml_remplacement WHERE lg_ORDER_ID = '" + A + "'");
    ok('Produit livré à la place (EL) : ajouté à la commande, lié à sa ligne', lien === 'AJOUTE|avec', lien);

    /* 1) liste des commandes : pastille « 1 a decider » sur B seulement */
    await ouvrirCommandes('E2E-SUB', B);
    const pastilles = await p.evaluate(() => { const g = Ext.ComponentQuery.query('i_order_manager')[0]; const o = {};
      g.getStore().each((r) => { const n = g.getView().getNode(r); const s = n && n.querySelector('.pml-a-decider'); o[r.get('str_REF_ORDER')] = s ? s.textContent : ''; if (s && r.get('str_REF_ORDER') === 'E2E-SUB-B') { s.id = 'e2e-a-decider'; } });
      const h = g.down('#colEnvoiPharmaml').getEl().dom.querySelector('.x-column-header-text'); const cell = g.getEl().dom.querySelector('#e2e-a-decider');
      const inner = cell && cell.closest('.x-grid-cell-inner'); return { o, coupe: inner ? inner.scrollWidth > inner.clientWidth + 1 : true }; });
    await p.screenshot({ path: SORTIE + '/substitutions-liste-commandes.png' });
    ok('Liste des commandes : « 1 à décider » sur B, rien sur A, pastille entière', pastilles.o[B] === '1 à décider' && pastilles.o[A] === '' && !pastilles.coupe, JSON.stringify(pastilles));

    /* 2) clic sur la pastille : liste des ruptures limitee aux equivalents de B */
    /* la liste peut se redessiner (rechargement) : l'element est retrouve juste avant chaque essai de clic */
    for (let essai = 0; essai < 4; essai++) {
      await p.evaluate(() => { const g = Ext.ComponentQuery.query('i_order_manager')[0]; const r = g.getStore().getAt(g.getStore().findExact('str_REF_ORDER', 'E2E-SUB-B'));
        const s = r && g.getView().getNode(r) && g.getView().getNode(r).querySelector('.pml-a-decider'); if (s) { s.id = 'e2e-a-decider'; } });
      try { await p.click('#e2e-a-decider', { timeout: 5000 }); break; } catch (e) { if (essai === 3) { throw e; } await p.waitForTimeout(800); }
    }
    await p.waitForFunction((ref) => { const e = Ext.ComponentQuery.query('rupturepharma #grilleEquivalents')[0]; return e && e.rendered && !e.getStore().isLoading() && /rupture E2E-SUB-B/.test(e.title) && e.getStore().getCount() > 0; }, B, { timeout: 30000 });
    const eq = await p.evaluate(() => { const e = Ext.ComponentQuery.query('rupturepharma #grilleEquivalents')[0]; const refs = []; e.getStore().each((r) => refs.push(r.get('reference'))); return { refs, titre: e.title }; });
    ok('Clic sur la pastille : liste des ruptures, équivalents de B seulement', eq.refs.length === 1 && eq.refs[0] === B, JSON.stringify(eq));
    await cliquer(() => { const g = Ext.ComponentQuery.query('rupturepharma #grilleEquivalents')[0]; const n = g.getView().getNodes()[0]; const a = n && n.querySelector('.eq-accepter'); if (a) { a.id = 'e2e-accepter'; } }, null, 'e2e-accepter');
    await p.waitForFunction(() => /accepté/.test(Ext.ComponentQuery.query('rupturepharma #infoEquivalent')[0].getEl().dom.textContent), null, { timeout: 20000 });
    const msgAcc = await p.evaluate(() => Ext.ComponentQuery.query('rupturepharma #infoEquivalent')[0].getEl().dom.textContent);
    ok('Acceptation : le message indique qu\'elle est annulable dans l\'onglet « Substitutions »', /Annulable dans l'onglet « Substitutions »/.test(msgAcc), msgAcc);

    /* 3) onglet Substitutions */
    /* retours du 08/10 (12) : depuis « Commandes en cours », la pastille ouvre l'ecran a onglets (onglet Substitutions
     * du meme ecran) ; depuis le menu « Liste des ruptures », l'onglet de l'ecran des ruptures */
    const idOnglet = await p.evaluate(() => { const h = Ext.ComponentQuery.query('commandesencours')[0];
      if (h && h.isVisible()) { return h.down('#cec-substitutions').getId(); }
      const t = Ext.ComponentQuery.query('rupturepharma #ongletsRuptures')[0]; return t.getTabBar().items.getAt(1).getId(); });
    await p.click('#' + idOnglet);
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('rupturepharma #grilleSubstitutions')[0]; return g && g.isVisible() && !g.getStore().isLoading() && g.getStore().findExact('reference', 'E2E-SUB-B') >= 0; }, null, { timeout: 20000 });
    await p.waitForTimeout(500);
    let l = await lignesSubst();
    const qui = q("SELECT TRIM(CONCAT(IFNULL(str_FIRST_NAME,''), ' ', IFNULL(str_LAST_NAME,''))) FROM t_user WHERE str_LOGIN = 'admin'");
    ok('Onglet « Substitutions » : A livrée (Retirer), B acceptée (Annuler), qui a décidé, historique en info-bulle',
      l[A] && l[A].statut === 'AJOUTE' && l[A].retirer && l[B] && l[B].statut === 'ACCEPTE' && l[B].annuler && l[B].qui === qui && /Acceptée par/.test(l[B].tip), JSON.stringify(l));
    const miseEnPage = await p.evaluate(() => { const g = Ext.ComponentQuery.query('rupturepharma #grilleSubstitutions')[0];
      return { tronques: [...g.getEl().dom.querySelectorAll('.x-column-header-text')].filter((h) => h.textContent && h.scrollWidth > h.clientWidth + 1).map((h) => h.textContent),
        choix: Ext.ComponentQuery.query('rupturepharma #grilleChoix')[0].isVisible(),
        actionsCoupees: [...g.getEl().dom.querySelectorAll('.subst-annuler, .subst-retirer')].filter((a) => { const c = a.closest('.x-grid-cell-inner'); return c.scrollWidth > c.clientWidth + 1; }).length }; });
    ok('Mise en page : en-têtes entiers, liens d\'action entiers, choix mémorisés visibles sous l\'historique', miseEnPage.tronques.length === 0 && miseEnPage.choix && miseEnPage.actionsCoupees === 0, JSON.stringify(miseEnPage));
    await p.screenshot({ path: SORTIE + '/substitutions-onglet.png' });

    /* 4) annuler l'acceptation */
    await cliquerSubst(B, 'subst-annuler');
    await p.waitForFunction(() => /annulée/.test(Ext.ComponentQuery.query('rupturepharma #infoSubstitution')[0].getEl().dom.textContent), null, { timeout: 20000 });
    const apresAnnul = q("SELECT CONCAT(r.str_STATUT, '|', d.produitId, '|', IFNULL(r.str_HISTORIQUE, '')) FROM t_pharmaml_remplacement r JOIN rupture_detail d ON d.id = r.lg_RUPTURE_DETAIL_ID WHERE r.lg_ORDER_ID = '" + B + "'").split('|');
    ok('Annuler : la rupture reprend le produit d\'origine, la proposition redevient « à décider », historique daté',
      apresAnnul[0] === 'PROPOSE' && apresAnnul[1] === P[1] && /Acceptée par .* ; .*Acceptation annulée par /.test(apresAnnul[2]), apresAnnul.join(' | '));
    await rechargerSubst();
    l = await lignesSubst();
    ok('Après annulation : B « à décider », plus de lien Annuler, décision dans l\'onglet Ruptures', l[B].statut === 'PROPOSE' && !l[B].annuler && /onglet Ruptures/.test(l[B].texte), JSON.stringify(l[B]));

    /* 5) rupture renvoyee : annulation impossible */
    const idProp = q("SELECT lg_ID FROM t_pharmaml_remplacement WHERE lg_ORDER_ID = '" + B + "'");
    await p.evaluate(async (id) => (await fetch('../api/v1/pharma/remplacements/' + id + '?decision=ACCEPTER', { method: 'POST' })).text(), idProp);
    const rupB = q("SELECT d.ruptureId FROM t_pharmaml_remplacement r JOIN rupture_detail d ON d.id = r.lg_RUPTURE_DETAIL_ID WHERE r.lg_ORDER_ID = '" + B + "'");
    exec("INSERT INTO t_pharmaml_attente (lg_ID, lg_GROSSISTE_ID, str_SOURCE, lg_SOURCE_ID, str_VERSION, str_STATUT, dt_ENVOI) VALUES ('e2e-sub-1', '" + G + "', 'RUPTURE', '" + rupB + "', '1.0.0.0', 'TRAITEE', NOW())");
    await rechargerSubst();
    l = await lignesSubst();
    const refus = await p.evaluate(async (id) => (await fetch('../api/v1/pharma/substitutions/' + id + '/annuler', { method: 'POST' })).json(), idProp);
    ok('Rupture déjà renvoyée : plus d\'annulation (raison affichée, refus du serveur)', !l[B].annuler && /rupture déjà renvoyée au grossiste/.test(l[B].texte)
      && refus.success === false && /rupture déjà renvoyée/.test(refus.msg), JSON.stringify({ l: l[B], refus }));

    /* 6) commande C deja en reception : retrait refuse */
    exec("UPDATE t_order SET str_STATUT = 'passed' WHERE lg_ORDER_ID = '" + C + "'");
    await rechargerSubst();
    l = await lignesSubst();
    ok('Commande déjà en réception (bon de livraison) : pas de « Retirer », raison affichée', !l[C].retirer && /bon de livraison/.test(l[C].texte), JSON.stringify(l[C]));

    /* 7) filtre par etat */
    await p.evaluate(() => { const c = Ext.ComponentQuery.query('rupturepharma #filtreEtatSubst')[0]; c.setValue('AJOUTE'); c.fireEvent('select', c, [c.getStore().getAt(4)]); });
    await p.waitForFunction(() => !Ext.ComponentQuery.query('rupturepharma #grilleSubstitutions')[0].getStore().isLoading(), null, { timeout: 15000 });
    await p.waitForTimeout(300);
    const filtre = await p.evaluate(() => { const st = Ext.ComponentQuery.query('rupturepharma #grilleSubstitutions')[0].getStore(); const s = new Set(); st.each((r) => s.add(r.get('statut'))); return [...s]; });
    ok('Filtre « Livrées (ajoutées) » : uniquement des substitutions livrées', filtre.length >= 1 && filtre.every((x) => x === 'AJOUTE'), JSON.stringify(filtre));
    await p.evaluate(() => { const c = Ext.ComponentQuery.query('rupturepharma #filtreEtatSubst')[0]; c.setValue(''); });

    /* 8) choix memorises : liste et suppression */
    exec("INSERT INTO t_pharmaml_equivalent_choix (lg_FAMILLE_ID, str_CODE_REMPLACANT, str_CHOIX, lg_USER_ID, dt_UPDATED) VALUES ('" + P[1] + "', '" + cips[3] + "', 'ACCEPTER', NULL, NOW())");
    await rechargerSubst();
    await p.waitForFunction(() => !Ext.ComponentQuery.query('rupturepharma #grilleChoix')[0].getStore().isLoading(), null, { timeout: 15000 });
    await p.waitForTimeout(300);
    const idx = await p.evaluate((a) => { const g = Ext.ComponentQuery.query('rupturepharma #grilleChoix')[0]; let i = -1;
      g.getStore().each((r, k) => { if (r.get('familleId') === a.f && r.get('codeRemplacant') === a.c) { i = k; } });
      if (i >= 0) { g.getView().getNode(g.getStore().getAt(i)).querySelector('.choix-supprimer').id = 'e2e-choix'; } return i; }, { f: P[1], c: cips[3] });
    ok('Choix mémorisé affiché (« Toujours accepter »)', idx >= 0, idx);
    await cliquer((a) => { const g = Ext.ComponentQuery.query('rupturepharma #grilleChoix')[0]; g.getStore().each((r) => { if (r.get('familleId') === a.f && r.get('codeRemplacant') === a.c) { const n = g.getView().getNode(r); if (n) { n.querySelector('.choix-supprimer').id = 'e2e-choix'; } } }); }, { f: P[1], c: cips[3] }, 'e2e-choix');
    await p.waitForFunction(() => /Choix supprimé/.test(Ext.ComponentQuery.query('rupturepharma #infoSubstitution')[0].getEl().dom.textContent), null, { timeout: 15000 });
    ok('Choix supprimé de la base', q("SELECT COUNT(*) FROM t_pharmaml_equivalent_choix WHERE lg_FAMILLE_ID = '" + P[1] + "' AND str_CODE_REMPLACANT = '" + cips[3] + "'") === '0');

    /* 9) ecran de la commande A : badge « Remplace … » et retrait avant reception */
    const montantAvant = Number(q("SELECT int_PRICE FROM t_order WHERE lg_ORDER_ID = '" + A + "'"));
    const prixLigne = Number(q("SELECT r.int_PRICE FROM t_order_detail r JOIN t_pharmaml_remplacement x ON x.lg_ORDERDETAIL_ID = r.lg_ORDERDETAIL_ID WHERE x.lg_ORDER_ID = '" + A + "'"));
    await ouvrirCommandes(A, A);
    await p.evaluate((ref) => { const g = Ext.ComponentQuery.query('i_order_manager')[0]; g.onManageDetailsClick(g, g.getStore().findExact('str_REF_ORDER', ref)); }, A);
    await p.waitForFunction(() => { const g = Ext.getCmp('gridpanelID'); return g && g.isVisible() && !g.getStore().isLoading() && g.getStore().getCount() === 2 && g.getEl().dom.querySelector('.badge-substitution'); }, null, { timeout: 30000 });
    const badge = await p.evaluate(() => { const g = Ext.getCmp('gridpanelID'); const bd = g.getEl().dom.querySelector('.badge-substitution'); const r = g.getEl().dom.querySelector('.retirer-substitution');
      if (r) { r.id = 'e2e-retirer'; } const cell = bd.closest('td').getBoundingClientRect(), rr = r ? r.getBoundingClientRect() : null, bb = bd.getBoundingClientRect();
      return { texte: bd.textContent, tip: bd.closest('td').getAttribute('data-qtip'), retirer: !!r,
        visibles: !!rr && rr.width > 0 && rr.right <= cell.right + 1 && bb.width > 20 && bb.left >= cell.left - 1 }; });
    await p.screenshot({ path: SORTIE + '/substitutions-commande.png' });
    ok('Commande : badge « Remplace <produit d\'origine> » sous le nom, info-bulle, lien « Retirer » visible dans la cellule', badge.texte === 'Remplace ' + noms[1] && /livré par .* à la place de/.test(badge.tip) && badge.retirer && badge.visibles, JSON.stringify(badge));
    await cliquer(() => { const r = Ext.getCmp('gridpanelID').getEl().dom.querySelector('.retirer-substitution'); if (r) { r.id = 'e2e-retirer'; } }, null, 'e2e-retirer');
    await p.waitForFunction(() => Ext.MessageBox.isVisible() && /Retirer/.test(Ext.MessageBox.msg.getEl().dom.textContent), null, { timeout: 10000 });
    const oui = await p.evaluate(() => (Ext.MessageBox.down('button[itemId=yes]') || Ext.MessageBox.msgButtons.yes).getId());
    await p.click('#' + oui);
    await p.waitForFunction(() => { const g = Ext.getCmp('gridpanelID'); return !g.getStore().isLoading() && g.getStore().getCount() === 1; }, null, { timeout: 20000 });
    const apresRetrait = q("SELECT CONCAT(x.str_STATUT, '|', (SELECT COUNT(*) FROM t_order_detail d WHERE d.lg_ORDERDETAIL_ID = x.lg_ORDERDETAIL_ID), '|', o.int_PRICE, '|', x.str_HISTORIQUE) FROM t_pharmaml_remplacement x JOIN t_order o ON o.lg_ORDER_ID = x.lg_ORDER_ID WHERE x.lg_ORDER_ID = '" + A + "'").split('|');
    ok('Retirer : ligne enlevée de la commande, montant recalculé, état « Retirée », historique', apresRetrait[0] === 'RETIRE' && apresRetrait[1] === '0'
      && Number(apresRetrait[2]) === Number(q("SELECT COALESCE(SUM(int_NUMBER * int_PAF_DETAIL), 0) FROM t_order_detail WHERE lg_ORDER_ID = '" + A + "'")) && Number(apresRetrait[2]) > 0
      && /Retiré de la commande par/.test(apresRetrait[3]), apresRetrait.join(' | ') + ' avant ' + montantAvant + ' ligne ' + prixLigne);

    /* 10) ecran de la commande B : bandeau des equivalents a decider (la proposition est acceptee : plus de bandeau) */
    exec("UPDATE t_pharmaml_remplacement SET str_STATUT = 'PROPOSE' WHERE lg_ORDER_ID = '" + B + "'");
    await ouvrirCommandes(B, B);
    await p.evaluate((ref) => { const g = Ext.ComponentQuery.query('i_order_manager')[0]; g.onManageDetailsClick(g, g.getStore().findExact('str_REF_ORDER', ref)); }, B);
    await p.waitForFunction(() => { const g = Ext.getCmp('gridpanelID'); return g && g.isVisible() && !g.getStore().isLoading() && g.down('#bandeauSubstitutions'); }, null, { timeout: 30000 });
    const bandeau = await p.evaluate(() => Ext.getCmp('gridpanelID').down('#bandeauSubstitutions').getEl().dom.textContent);
    ok('Commande B : bandeau « 1 équivalent(s) proposé(s) … à décider » avec lien vers les ruptures', /1 équivalent\(s\) proposé\(s\) par le grossiste à décider : ouvrir la liste des ruptures/.test(bandeau), bandeau);
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    serveur.close();
    nettoyer();
    exec("UPDATE t_grossiste SET str_URL_PHARMAML = " + (sauve[0] === 'NULL' ? 'NULL' : "'" + sauve[0] + "'") + ", str_PHARMAML_VERSION_CMDE = '" + sauve[1] + "' WHERE lg_GROSSISTE_ID = '" + G + "'");
    ok('Données d\'essai retirées, grossiste remis', q("SELECT COUNT(*) FROM t_order WHERE lg_ORDER_ID IN (" + liste(CMDS) + ")") === '0'
      && q("SELECT COUNT(*) FROM t_pharmaml_remplacement WHERE lg_ORDER_ID IN (" + liste(CMDS) + ")") === '0'
      && q("SELECT CONCAT(IFNULL(str_URL_PHARMAML, 'NULL'), '|', str_PHARMAML_VERSION_CMDE) FROM t_grossiste WHERE lg_GROSSISTE_ID = '" + G + "'") === sauve.join('|'));
    const n = res.filter((x) => x.c).length;
    console.log('\n' + n + '/' + res.length + ' OK');
    process.exit(n === res.length ? 0 : 1);
  }
})();
