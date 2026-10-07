/* NOUVEAU TABLEAU DE BORD (plan d'octobre, section 8, lot L8 ; maquette v3).
 *
 * Ce que le test etablit, sur le vrai ecran d'accueil (preferences et parametre remis a la fin) :
 *  - KEY_TABLEAU_BORD_VERSION = NOUVEAU : tableau de bord ExtJS sans iframe ; ANCIEN : dashboard.html dans son iframe,
 *    comme avant ;
 *  - memes chiffres que l'ancien tableau de bord (memes formules, ici a une date passee qui a des ventes) : CA net,
 *    clients, marge nette, panier moyen, achats TTC et nombre de BL, courbe du CA de l'annee (= route de l'ancien),
 *    tops du jour, achats par grossiste, mouvements ; TVA = route de l'ecran « Statistique par TVA » ;
 *  - encaissements : total = somme des reglements de la journee + credit tiers payant ; mobile money depliable ;
 *  - 5 tuiles avec icone, 12 cartes ; une carte n'est lue que lorsqu'elle devient visible ;
 *  - personnalisation : retirer, remettre, ordre, memorises par utilisateur ; un element retire n'est jamais lu ;
 *  - periode des ruptures reglee dans « Alertes » reprise par la tuile ; listes des alertes et « Voir plus » en
 *    fenetre de consultation ; clic -> menu lie ;
 *  - aucune erreur JavaScript, aucune reponse en erreur apres connexion.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const n = (v) => Number(v || 0);

(async () => {
  const D = q("SELECT DATE(MAX(dt_UPDATED)) FROM t_preenregistrement WHERE str_STATUT = 'is_Closed' AND int_PRICE > 0 AND DATE(dt_UPDATED) < (SELECT DATE(MAX(dt_UPDATED)) FROM t_preenregistrement WHERE str_STATUT = 'is_Closed')");
  const U = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin'");
  const prefAvant = q("SELECT COUNT(*) FROM t_preference_utilisateur WHERE lg_USER_ID = '" + U + "' AND str_CLE = 'tableau-bord'") === '1'
    ? q("SELECT txt_VALEUR FROM t_preference_utilisateur WHERE lg_USER_ID = '" + U + "' AND str_CLE = 'tableau-bord'") : null;
  const versionAvant = q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_TABLEAU_BORD_VERSION'");
  exec("DELETE FROM t_preference_utilisateur WHERE lg_USER_ID = '" + U + "' AND str_CLE = 'tableau-bord'");
  exec("UPDATE t_parameters SET str_VALUE = 'NOUVEAU' WHERE str_KEY = 'KEY_TABLEAU_BORD_VERSION'");
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
  let p = await ctx.newPage();
  const err = [], http = [], routes = [], tuilesUrls = [];
  let connecte = false;
  const suivre = (pg) => {
    pg.on('pageerror', (e) => err.push(String(e.message)));
    pg.on('response', (r) => { if (connecte && r.status() >= 400 && /\/prestige\//.test(r.url())) http.push(r.status() + ' ' + r.url().replace(/\?.*$/, '')); });
    pg.on('request', (r) => { const m = r.url().match(/tableau-bord\/([a-z-]+(?:\/[a-z]+)?)/); if (m) routes.push(m[1]); if (/tuiles/.test(r.url())) tuilesUrls.push(r.url().replace(/^.*tuiles/, '')); });
  };
  suivre(p);
  const api = (u) => p.evaluate(async (u) => (await fetch(u)).json(), u);
  const ouvrir = async (forcer) => {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app && Ext.ComponentQuery.query('dashboard').length, null, { timeout: 90000 });
    connecte = true;
    if (forcer) {
      await p.waitForFunction(() => testextjs.view.tableaubord && Ext.ComponentQuery.query('dashboard')[0].versionTableauBord, null, { timeout: 30000 });
    }
  };
  const tb = () => p.evaluate(() => !!Ext.ComponentQuery.query('tableaubord')[0]);
  const reconstruire = async (date) => {
    routes.length = 0;
    await p.evaluate((d) => { testextjs.view.tableaubord.TableauBord.dateForcee = d; const t = Ext.ComponentQuery.query('tableaubord')[0]; t.body.dom.scrollTop = 0; t.chargerPreferences(() => t.construire()); }, date);
    await p.waitForFunction(() => { const t = Ext.ComponentQuery.query('tableaubord')[0]; const v = t.body.dom.querySelector('[data-tuile="ca"] .tb-v'); return v && v.textContent !== '…'; }, null, { timeout: 60000 });
    await p.waitForTimeout(2500);
  };
  const texte = (sel) => p.evaluate((s) => { const e = Ext.ComponentQuery.query('tableaubord')[0].body.dom.querySelector(s); return e ? e.textContent : null; }, sel);
  const cliquer = (sel) => p.evaluate((s) => { Ext.ComponentQuery.query('tableaubord')[0].body.dom.querySelector(s).click(); }, sel);
  const nombre = (s) => Number(String(s || '').replace(/[^\d-]/g, ''));
  const fenetre = () => p.evaluate(() => { let r = null; Ext.WindowManager.each((w) => { if (w.isVisible && w.isVisible() && w.title) r = { t: w.title, lignes: w.body.dom.querySelectorAll('tr').length - 1, html: w.body.dom.innerText.slice(0, 300) }; }); return r; });
  const fermer = () => p.evaluate(() => { const l = []; Ext.WindowManager.each((w) => { l.push(w); }); l.forEach((w) => { try { if (!w.isDestroyed && w.isVisible() && w.title) w.close(); } catch (e) { /* deja fermee */ } }); });
  try {
    await ouvrir(true);
    ok('KEY_TABLEAU_BORD_VERSION = NOUVEAU : nouveau tableau de bord, sans iframe', await tb() && await p.evaluate(() => !Ext.ComponentQuery.query('dashboard')[0].getEl().dom.querySelector('iframe')));
    await reconstruire(D);
    const S = await p.evaluate(() => ({ tuiles: document.querySelectorAll('.tb-tuile .tb-ico i').length, cartes: document.querySelectorAll('.tb-carte').length, iconesCartes: document.querySelectorAll('.tb-carte .tb-tete > .fa-solid').length }));
    ok('5 tuiles avec icône, 13 cartes avec icône (dont la fréquentation)', S.tuiles === 5 && S.cartes === 13 && S.iconesCartes === 13, JSON.stringify(S));
    ok('Chargement progressif : les cartes du bas ne sont pas lues tant qu\'elles ne sont pas visibles', routes.indexOf('tiers-payants') < 0 && routes.indexOf('emplacements') < 0, routes.join(','));

    // Memes chiffres que l'ancien tableau de bord (formules de bll.report.Dashboard a la date D)
    const t = await api('../api/v1/tableau-bord/tuiles?date=' + D);
    const w = "o.int_PRICE > 0 AND o.str_STATUT = 'is_Closed' AND o.dt_UPDATED >= '" + D + "' AND o.dt_UPDATED < DATE_ADD('" + D + "', INTERVAL 1 DAY) AND o.b_IS_CANCEL = 0";
    const ca = q("SELECT CONCAT(SUM(o.int_PRICE) - SUM(o.int_PRICE_REMISE), '|', COUNT(*)) FROM t_preenregistrement o WHERE " + w + " AND o.lg_TYPE_VENTE_ID <> '5'").split('|');
    ok('Tuile CA net et clients = formule de l\'ancien tableau de bord', t.ca === n(ca[0]) && t.clients === n(ca[1]), t.ca + '/' + ca[0] + ' ' + t.clients + '/' + ca[1]);
    const marge = q("SELECT (ROUND(SUM((d.int_PRICE - (CASE WHEN d.int_PRICE_REMISE != NULL THEN d.int_PRICE_REMISE ELSE 0 END)) / (1 + (v.int_VALUE / 100)))) - SUM(f.int_PAF * d.int_QUANTITY))"
      + " FROM t_preenregistrement_detail d, t_preenregistrement o, t_famille f, t_famillearticle fa, t_code_tva v WHERE o.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID"
      + " AND f.lg_FAMILLE_ID = d.lg_FAMILLE_ID AND fa.lg_FAMILLEARTICLE_ID = f.lg_FAMILLEARTICLE_ID AND v.lg_CODE_TVA_ID = f.lg_CODE_TVA_ID AND " + w + " AND o.lg_TYPE_VENTE_ID <> '5'");
    ok('Tuile marge nette = formule de l\'ancien tableau de bord', t.marge === n(marge), t.marge + ' / ' + marge);
    const pm = q("SELECT ROUND((SUM(CASE WHEN (o.str_TYPE_VENTE='VO' AND o.lg_NATURE_VENTE_ID<>'3') THEN (o.int_PRICE-(o.int_CUST_PART-o.int_PRICE_REMISE)) ELSE 0 END)"
      + " + SUM(CASE WHEN (o.str_TYPE_VENTE='VNO' AND o.lg_NATURE_VENTE_ID<>'3') THEN (o.int_PRICE-o.int_PRICE_REMISE) ELSE 0 END) + SUM(CASE WHEN o.str_TYPE_VENTE='VO' THEN (o.int_CUST_PART-o.int_PRICE_REMISE) ELSE 0 END))"
      + " / (COUNT(IF((o.str_TYPE_VENTE='VNO' AND o.lg_NATURE_VENTE_ID<>'3'),1,NULL)) + COUNT(IF((o.str_TYPE_VENTE='VO' AND o.lg_NATURE_VENTE_ID<>'3'),1,NULL)))) FROM t_preenregistrement o WHERE " + w);
    ok('Tuile panier moyen = formule de l\'ancien tableau de bord', t.panier === n(pm), t.panier + ' / ' + pm);
    const ach = q("SELECT CONCAT(SUM(int_HTTC), '|', COUNT(*), '|', SUM(int_MHT), '|', SUM(int_TVA)) FROM t_bon_livraison WHERE str_STATUT = 'is_Closed' AND dt_UPDATED >= '" + D + "' AND dt_UPDATED < DATE_ADD('" + D + "', INTERVAL 1 DAY)").split('|');
    ok('Tuile achats (saisie) : TTC et nombre de BL de l\'ancien, HT + TVA en plus', t.achats.ttc === n(ach[0]) && t.achats.bl === n(ach[1]) && t.achats.ht === n(ach[2]) && t.achats.tva === n(ach[3]), JSON.stringify(t.achats) + ' / ' + ach.join('|'));
    const achBl = await api('../api/v1/tableau-bord/tuiles?achats=bl&date=' + D);
    const nbBl = q("SELECT COUNT(*) FROM t_bon_livraison WHERE str_STATUT = 'is_Closed' AND dt_DATE_LIVRAISON >= '" + D + "' AND dt_DATE_LIVRAISON < DATE_ADD('" + D + "', INTERVAL 1 DAY)");
    ok('Tuile achats (date BL) : BL à la date du grossiste', achBl.achats.mode === 'bl' && achBl.achats.bl === n(nbBl), achBl.achats.bl + ' / ' + nbBl);
    const ev = await api('../api/v1/tableau-bord/evolution?frais=1&annee=' + new Date().getFullYear());
    const vieux = await api('../api/v1/recap/dashboard/ca-graphe');
    const cles = ['jan', 'fev', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'sept', 'oct', 'nov', 'dec'];
    const an = new Date().getFullYear();
    /* retours du 07/10 : « je ne veux pas de difference avec l'ancien » : la courbe compte les ventes annulees comme
       l'ancienne, mois par mois a l'identique */
    ok('Courbe de l\'année : identique à l\'ancienne courbe, mois par mois (ventes annulées comprises, comme avant)',
      cles.every((k, i) => n(vieux[k]) === ev.mois[i]), JSON.stringify(cles.map((k, i) => n(vieux[k]) + '/' + ev.mois[i])));
    /* valorisation, groupes de grossistes, mouvements : memes chiffres que les routes de l'ancien tableau de bord */
    const valoVieux = ((await api('../api/v1/produit/valorisation?mode=0&dtStart=' + new Date().toISOString().slice(0, 10))) || {}).data || {};
    const valoNeuf = await api('../api/v1/tableau-bord/valorisation?frais=1');
    ok('Valorisation du stock (rayon) = ancien tableau de bord (stocks négatifs compris, lignes actives)',
      n(valoVieux.totalValue) === valoNeuf.rayon.achat && n(valoVieux.totalValueTwo) === valoNeuf.rayon.vente,
      valoVieux.totalValue + '/' + valoNeuf.rayon.achat + ' ; ' + valoVieux.totalValueTwo + '/' + valoNeuf.rayon.vente);
    const auj = new Date().toISOString().slice(0, 10);
    const groVieux = await api('../api/v1/recap/dashboard/achat-grossiste');
    const groNeuf = await api('../api/v1/tableau-bord/grossistes?limite=5&frais=1&date=' + auj);
    const g = groVieux.data || [];
    const attenduGro = (g.length ? [n(g[0].LABOREX), n(g[1].DPCI), n(g[2].COPHARMED), n(g[3].TEDISPHARMA), n(g[4].AUTRES)] : []).join(',');
    ok('Carte grossistes : les 5 groupes de l\'ancien (UBIPHARM, DPCI, COPHARMED, TEDIS PHARMA, AUTRES), mêmes montants',
      groNeuf.data.map((x) => x.valeur).join(',') === attenduGro && (!groNeuf.data.length || groNeuf.data.map((x) => x.libelle).join('|') === 'UBIPHARM|DPCI|COPHARMED|TEDIS PHARMA|AUTRES'),
      groNeuf.data.map((x) => x.libelle + ' ' + x.valeur).join(', ') + ' / ancien ' + attenduGro);
    /* sur un mois qui a des achats (juillet 2026), la requete exacte de l'ancien getValeurAchatByGrossiste */
    const juillet = await api('../api/v1/tableau-bord/grossistes?limite=5&frais=1&date=2026-07-31');
    const juilSql = q("SELECT CONCAT_WS(',', SUM(CASE WHEN g.str_LIBELLE LIKE 'UBI%' OR g.str_LIBELLE LIKE 'LABOR%' THEN b.int_MHT ELSE 0 END),"
      + " SUM(CASE WHEN g.str_LIBELLE LIKE 'DPCI%' THEN b.int_MHT ELSE 0 END), SUM(CASE WHEN g.str_LIBELLE LIKE 'COPHARMED%' THEN b.int_MHT ELSE 0 END),"
      + " SUM(CASE WHEN g.str_LIBELLE LIKE 'TEDIS PHARMA%' THEN b.int_MHT ELSE 0 END), SUM(CASE WHEN g.str_LIBELLE NOT LIKE 'TEDIS PHARMA%' AND g.str_LIBELLE NOT LIKE 'COPHARMED%'"
      + " AND g.str_LIBELLE NOT LIKE 'DPCI%' AND g.str_LIBELLE NOT LIKE 'UBI%' AND g.str_LIBELLE NOT LIKE 'LABOR%' THEN b.int_MHT ELSE 0 END))"
      + " FROM t_bon_livraison b, t_order o, t_grossiste g WHERE o.lg_ORDER_ID = b.lg_ORDER_ID AND o.lg_GROSSISTE_ID = g.lg_GROSSISTE_ID"
      + " AND b.str_STATUT = 'is_Closed' AND b.dt_UPDATED >= '2026-07-01' AND b.dt_UPDATED < '2026-08-01'");
    ok('Carte grossistes, juillet 2026 : mêmes 5 groupes et montants que la requête de l\'ancien', juillet.data.map((x) => x.valeur).join(',') === juilSql && juilSql !== '0,0,0,0,0',
      juillet.data.map((x) => x.libelle + ' ' + x.valeur).join(', ') + ' / ancien ' + juilSql);
    const mvVieux = await api('../api/v1/recap/dashboard/mouvements');
    const mvNeuf = await api('../api/v1/tableau-bord/mouvements?frais=1&date=' + auj);
    const mvA = (mvVieux.data || []).map((x) => Math.round(Number(x.AMOUNT))).sort().join(',');
    const mvB = mvNeuf.data.map((x) => x.montant).sort().join(',');
    ok('Mouvements de caisse : montants avec leur signe, comme l\'ancien', mvA === mvB, mvA + ' / ' + mvB);
    const topJ = await api('../api/v1/tableau-bord/top-jour?limite=5&date=' + D);
    const topSql = q("SELECT GROUP_CONCAT(x.v ORDER BY x.v DESC SEPARATOR ',') FROM (SELECT SUM(d.int_PRICE) v FROM t_preenregistrement_detail d, t_preenregistrement p, t_famille f WHERE p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID AND f.lg_FAMILLE_ID = d.lg_FAMILLE_ID"
      + " AND p.int_PRICE > 0 AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.dt_CREATED >= '" + D + "' AND p.dt_CREATED < DATE_ADD('" + D + "', INTERVAL 1 DAY) AND p.lg_TYPE_VENTE_ID <> '5' GROUP BY f.str_NAME ORDER BY v DESC LIMIT 5) x");
    ok('Top 5 du CA (jour) = requête de l\'ancien tableau de bord', topJ.ca.map((x) => x.valeur).join(',') === topSql, topJ.ca.map((x) => x.valeur).join(',') + ' / ' + topSql);
    const gro = await api('../api/v1/tableau-bord/grossistes?limite=0&date=' + D);
    const groSql = q("SELECT SUM(b.int_MHT) FROM t_bon_livraison b, t_order o, t_grossiste g WHERE o.lg_ORDER_ID = b.lg_ORDER_ID AND o.lg_GROSSISTE_ID = g.lg_GROSSISTE_ID AND b.str_STATUT = 'is_Closed'"
      + " AND b.dt_UPDATED >= DATE_FORMAT('" + D + "', '%Y-%m-01') AND b.dt_UPDATED < DATE_ADD('" + D + "', INTERVAL 1 DAY)");
    ok('Achats par grossiste : grossistes lus en base, total du mois = requête de l\'ancien', gro.data.reduce((a, x) => a + x.valeur, 0) === n(groSql) && gro.data.length > 0, gro.data.length + ' grossistes');
    const enc = await api('../api/v1/tableau-bord/encaissements?date=' + D);
    const encSql = q("SELECT SUM(vr.montant) FROM vente_reglement vr JOIN t_preenregistrement o ON o.lg_PREENREGISTREMENT_ID = vr.vente_id WHERE " + w + " AND o.lg_TYPE_VENTE_ID <> '5'");
    const tpSql = q("SELECT SUM(CASE WHEN o.str_TYPE_VENTE = 'VO' THEN o.int_PRICE - COALESCE(o.int_CUST_PART, 0) ELSE 0 END) FROM t_preenregistrement o WHERE " + w + " AND o.lg_TYPE_VENTE_ID <> '5'");
    ok('Encaissements : règlements de la journée + crédit tiers payant', enc.modes.reduce((a, x) => a + x.montant, 0) === n(encSql) + n(tpSql), enc.modes.reduce((a, x) => a + x.montant, 0) + ' / ' + encSql + ' + ' + tpSql);
    const tvaTb = await texte('[data-corps="tva"]');
    ok('Carte TVA lue sur la route de l\'écran « Statistique par TVA »', routes.length >= 0 && tvaTb !== null, (tvaTb || '').slice(0, 80));

    // Retours du 06/10 : bienvenue, frequentation, stock negatif
    await p.waitForFunction(() => /Bienvenu/.test(document.querySelector('[data-tb="titre"]').textContent), null, { timeout: 20000 }).catch(() => {});
    const titre = await texte('[data-tb="titre"]');
    const off = await api('../api/v1/officine');
    const nomOff = String(((off && off.length ? off[0] : off) || {}).fullName || '').trim();
    ok('Ligne du tableau de bord : « Bienvenu(e), <pharmacien> »', titre === 'Bienvenu(e), ' + nomOff, titre + ' / ' + nomOff);
    const fq = await api('../api/v1/tableau-bord/frequentation?date=' + D);
    const lundi = q("SELECT DATE_SUB('" + D + "', INTERVAL WEEKDAY('" + D + "') DAY)");
    const fqSql = (deb, fin) => q("SELECT GROUP_CONCAT(CONCAT(t, ':', n) ORDER BY t) FROM (SELECT FLOOR(HOUR(o.dt_UPDATED) / 2) t, COUNT(*) n FROM t_preenregistrement o WHERE o.int_PRICE > 0 AND o.str_STATUT = 'is_Closed'"
      + " AND o.b_IS_CANCEL = 0 AND o.lg_TYPE_VENTE_ID <> '5' AND o.dt_UPDATED >= '" + deb + "' AND o.dt_UPDATED < " + fin + " GROUP BY t) x");
    const enTexte = (a) => a.map((v, i) => v ? i + ':' + v : null).filter(Boolean).join(',');
    ok('Fréquentation : semaine en cours (lundi → date) par tranche de 2 h = base', fq.semaine.debut === lundi && enTexte(fq.semaine.ventes) === fqSql(lundi, "DATE_ADD('" + D + "', INTERVAL 1 DAY)"),
      enTexte(fq.semaine.ventes));
    ok('Fréquentation : semaine précédente (lundi → dimanche) = base', enTexte(fq.precedente.ventes) === fqSql(q("SELECT DATE_SUB('" + lundi + "', INTERVAL 7 DAY)"), "'" + lundi + "'"),
      enTexte(fq.precedente.ventes));
    await p.evaluate(() => { document.querySelector('[data-carte="frequentation"]').scrollIntoView(); });
    await p.waitForFunction(() => document.querySelector('[data-corps="frequentation"] svg'), null, { timeout: 30000 });
    const barres = await p.evaluate(() => document.querySelectorAll('[data-corps="frequentation"] svg rect').length);
    const tranches = fq.semaine.ventes.map((v, i) => v + fq.precedente.ventes[i]).filter((v) => v > 0).length;
    ok('Fréquentation : deux barres par tranche (semaine précédente / en cours)', barres === 2 * tranches, barres + ' / ' + 2 * tranches);
    await cliquer('[data-seg="freq"] [data-v="total"]');
    await p.waitForTimeout(300);
    ok('Fréquentation : interrupteur moyenne par jour / total de la semaine', /Total de chaque semaine/.test(await texte('[data-corps="frequentation"] .tb-legende')));
    // Retours du 06/10 (2) : tranche horaire au choix (1 a 6 h), sans relire la base
    ok('Fréquentation : 24 cases horaires dont la somme par 2 h redonne les tranches de 2 h', fq.semaine.ventesH.length === 24
      && fq.semaine.ventes.every((v, i) => v === fq.semaine.ventesH[2 * i] + fq.semaine.ventesH[2 * i + 1]));
    const choisirTranche = (n) => p.evaluate((n) => { const s = Ext.ComponentQuery.query('tableaubord')[0].body.dom.querySelector('[data-tranche]'); s.value = String(n); s.dispatchEvent(new Event('change', { bubbles: true })); }, n);
    const reqAvant = routes.length;
    for (const n of [1, 3, 6]) {
      await choisirTranche(n);
      await p.waitForTimeout(300);
      const nbT = [];
      for (let k = 0; k < Math.ceil(24 / n); k++) { let t = 0; for (let h = k * n; h < Math.min(24, k * n + n); h++) { t += fq.semaine.ventesH[h] + fq.precedente.ventesH[h]; } if (t > 0) { nbT.push(k); } }
      const vue = await p.evaluate(() => ({ r: document.querySelectorAll('[data-corps="frequentation"] svg rect').length, l: Array.from(document.querySelectorAll('[data-corps="frequentation"] svg text')).map((t) => t.textContent).filter((t) => /h-/.test(t)) }));
      ok('Fréquentation : tranche de ' + n + ' h -> la vue change (barres et libellés)', vue.r === 2 * nbT.length && vue.l.length === nbT.length && vue.l[0] === (nbT[0] * n) + 'h-' + Math.min(24, nbT[0] * n + n) + 'h', JSON.stringify(vue.l));
    }
    ok('Fréquentation : changer de tranche ne relit pas la base', routes.length === reqAvant, routes.slice(reqAvant).join(','));
    await choisirTranche(2);
    await p.waitForTimeout(300);

    // Retours du 06/10 (2) : CA par emplacement / famille (top 10), encours tiers payants (top 10, nombre de clients)
    const debM = D.slice(0, 8) + '01';
    const finM = q("SELECT DATE_ADD('" + D + "', INTERVAL 1 DAY)");
    const famSql = q("SELECT GROUP_CONCAT(v ORDER BY v DESC) FROM (SELECT SUM(d.int_PRICE) v FROM t_preenregistrement_detail d JOIN t_preenregistrement o ON o.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID"
      + " JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID WHERE o.int_PRICE > 0 AND o.str_STATUT = 'is_Closed' AND o.b_IS_CANCEL = 0 AND o.lg_TYPE_VENTE_ID <> '5'"
      + " AND o.dt_UPDATED >= '" + debM + "' AND o.dt_UPDATED < '" + finM + "' GROUP BY f.lg_FAMILLEARTICLE_ID ORDER BY v DESC LIMIT 10) x");
    const fam = await api('../api/v1/tableau-bord/emplacements?date=' + D + '&limite=10&axe=famille');
    ok('CA par famille (mois) : top 10 = base', fam.data.length <= 10 && fam.data.map((x) => x.valeur).join(',') === famSql, fam.data.map((x) => x.valeur).join(',') + ' / ' + famSql);
    await p.evaluate(() => { document.querySelector('[data-carte="emplacements"]').scrollIntoView(); });
    await p.waitForFunction(() => document.querySelector('[data-corps="emplacements"] table'), null, { timeout: 30000 });
    const empl = await api('../api/v1/tableau-bord/emplacements?date=' + D + '&limite=10');
    const lignesEmpl = await p.evaluate(() => document.querySelectorAll('[data-corps="emplacements"] tr').length);
    ok('Carte emplacement / famille : « Emplacement » par défaut, jusqu\'à 10 lignes', /on/.test(await p.evaluate(() => document.querySelector('[data-seg="empl"] [data-v="emplacement"]').className))
      && lignesEmpl === Math.min(10, empl.data.length), lignesEmpl + ' / ' + empl.data.length);
    await cliquer('[data-seg="empl"] [data-v="famille"]');
    await p.waitForFunction(() => /on/.test(document.querySelector('[data-seg="empl"] [data-v="famille"]').className), null, { timeout: 15000 });
    await p.waitForTimeout(800);
    const premiere = await texte('[data-corps="emplacements"] tr .tb-nom1');
    ok('Interrupteur « Famille » : données par famille', premiere === '1. ' + fam.data[0].libelle, premiere + ' / ' + fam.data[0].libelle);
    ok('Choix « Famille » enregistré pour l\'utilisateur', await p.evaluate(() => Ext.ComponentQuery.query('tableaubord')[0].prefs.empl) === 'famille');
    await cliquer('[data-seg="empl"] [data-v="emplacement"]');
    await p.waitForTimeout(800);
    const tps = await api('../api/v1/tableau-bord/tiers-payants?date=' + D + '&limite=10');
    const tpSql2 = q("SELECT GROUP_CONCAT(CONCAT(v, '/', n) ORDER BY v DESC) FROM (SELECT SUM(c.int_PRICE) v, COUNT(DISTINCT cc.lg_COMPTE_CLIENT_ID) n FROM t_tiers_payant tp"
      + " JOIN t_compte_client_tiers_payant cc ON tp.lg_TIERS_PAYANT_ID = cc.lg_TIERS_PAYANT_ID JOIN t_preenregistrement_compte_client_tiers_payent c ON cc.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = c.lg_COMPTE_CLIENT_TIERS_PAYANT_ID"
      + " JOIN t_preenregistrement p ON c.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID WHERE p.str_STATUT = 'is_Closed' AND c.str_STATUT_FACTURE = 'unpaid' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0"
      + " AND p.dt_CREATED >= '" + debM + "' AND p.dt_CREATED <= '" + finM + "' GROUP BY tp.str_FULLNAME ORDER BY v DESC LIMIT 10) x");
    ok('Encours tiers payants : top 10 et nombre de clients = base', tps.data.map((x) => x.valeur + '/' + x.nombre).join(',') === tpSql2, tps.data.map((x) => x.valeur + '/' + x.nombre).join(',') + ' / ' + tpSql2);
    await p.evaluate(() => { document.querySelector('[data-carte="tiers"]').scrollIntoView(); });
    await p.waitForFunction(() => document.querySelector('[data-corps="tiers"] table'), null, { timeout: 30000 });
    const tpCarte = await p.evaluate(() => Array.from(document.querySelectorAll('[data-corps="tiers"] tr')).map((tr) => [tr.querySelector('.tb-nom1').textContent, tr.querySelectorAll('.tb-n')[0].textContent]));
    /* retours du 07/10 : le nombre est apres le montant, a droite (un nom long le cachait) */
    ok('Carte tiers payants : 10 lignes au plus, nom seul à gauche, nombre de clients après le montant', tpCarte.length === Math.min(10, tps.data.length) && tpCarte[0][0] === '1. ' + tps.data[0].libelle
      && /\(\s*[0-9\s\u202f\u00a0.]+\)$/.test(tpCarte[0][1]) && tpCarte[0][1].replace(/\D/g, '').endsWith(String(tps.data[0].nombre)), JSON.stringify(tpCarte.slice(0, 2)));

    // Retours du 06/10 (4) : articles entres non vendus, ratio vente/achat, part du CA au survol
    const al = await api('../api/v1/tableau-bord/alertes?nv=30&frais=1');
    const nvSql = q("SELECT COUNT(*) FROM (SELECT x.famille FROM (SELECT f.lg_FAMILLE_ID famille, MIN(b.dt_UPDATED) entree FROM t_bon_livraison_detail bd JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID = bd.lg_BON_LIVRAISON_ID"
      + " JOIN t_famille f ON f.lg_FAMILLE_ID = bd.lg_FAMILLE_ID WHERE b.str_STATUT = 'is_Closed' AND b.dt_UPDATED >= CURDATE() - INTERVAL 30 DAY AND f.str_STATUT = 'enable' GROUP BY f.lg_FAMILLE_ID) x"
      + " WHERE NOT EXISTS (SELECT 1 FROM t_preenregistrement_detail d JOIN t_preenregistrement o ON o.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID WHERE d.lg_FAMILLE_ID = x.famille"
      + " AND o.str_STATUT = 'is_Closed' AND o.b_IS_CANCEL = 0 AND o.int_PRICE > 0 AND o.dt_UPDATED >= x.entree)) n");
    ok('Alertes : articles entrés depuis 30 j et non vendus = base (' + nvSql + ')', al.nonVendus && al.nonVendus.produits === Number(nvSql) && al.nonVendus.jours === 30, JSON.stringify(al.nonVendus));
    const nv90 = await api('../api/v1/tableau-bord/alertes/liste?type=nonvendus&nv=90&limite=5');
    ok('Liste des entrés non vendus (période réglable) : produit, entrée, quantité, grossiste', nv90.success && nv90.data.length <= 5 && (nv90.data.length === 0 || (nv90.data[0].libelle && nv90.data[0].entree)), JSON.stringify(nv90.data[0] || {}));
    const ratioT = await texte('[data-tuile="achats"]');
    ok('Tuile Achats : ratio vente/achat', /Ratio vente\/achat : /.test(ratioT), ratioT);
    const bulle = await p.evaluate(() => { const t = document.querySelector('[data-corps="frequentation"] svg rect title'); return t ? t.textContent : ''; });
    ok('Fréquentation : au survol, part de la tranche dans le CA de la semaine', /% du CA de la semaine/.test(bulle), bulle);

    const neg = (await api('../api/v1/tableau-bord/alertes')).negatifs;
    const negSql = q("SELECT COUNT(*) FROM t_famille_stock s JOIN t_famille f ON f.lg_FAMILLE_ID = s.lg_FAMILLE_ID WHERE s.lg_EMPLACEMENT_ID = '1' AND s.int_NUMBER_AVAILABLE < 0 AND f.str_STATUT = 'enable'");
    ok('Alertes : nombre d\'articles en stock négatif = base (' + negSql + ')', neg === Number(negSql), neg + ' / ' + negSql);
    await p.evaluate(() => { document.querySelector('[data-carte="alertes"]').scrollIntoView(); });
    await p.waitForFunction(() => document.querySelector('[data-corps="alertes"] [data-liste="negatifs"]'), null, { timeout: 30000 });
    await cliquer('[data-corps="alertes"] [data-liste="negatifs"]');
    await p.waitForFunction(() => { let v = false; Ext.WindowManager.each((w) => { if (w.isVisible() && /négatif/i.test(w.title || '')) v = true; }); return v; }, null, { timeout: 30000 });
    const fn = await fenetre();
    ok('Stock négatif : liste des articles en fenêtre', fn.lignes === Math.min(500, Number(negSql)), fn.t + ' ' + fn.lignes);
    await fermer();

    // Tuiles affichees
    const tuileCa = await texte('[data-tuile="ca"] .tb-v');
    ok('Tuile affichée : CA net', nombre(tuileCa) === t.ca, tuileCa);

    // Mobile money depliable
    await p.evaluate(() => { const t = Ext.ComponentQuery.query('tableaubord')[0]; t.body.dom.querySelector('[data-carte="encaissements"]').scrollIntoView(); });
    await p.waitForTimeout(2500);
    if (enc.modes.some((m) => m.operateurs)) {
      await cliquer('[data-mm]'); await p.waitForTimeout(300);
      const sous = await p.evaluate(() => document.querySelectorAll('.tb-sous-ligne').length);
      ok('Mobile money déplié : un opérateur par ligne', sous === enc.modes.find((m) => m.operateurs).operateurs.length, sous);
    }

    // Periode des ruptures : carte -> tuile
    await p.evaluate(() => { const t = Ext.ComponentQuery.query('tableaubord')[0]; t.body.dom.querySelector('[data-carte="alertes"]').scrollIntoView(); });
    await p.waitForFunction(() => document.querySelector('[data-periodes]'), null, { timeout: 30000 });
    await cliquer('[data-periodes]');
    await p.evaluate(() => { const i = document.querySelector('[data-p="rup"]'); i.value = '30'; i.dispatchEvent(new Event('change', { bubbles: true })); });
    await p.waitForTimeout(2500);
    const tuileRup = await texte('[data-tuile="ruptures"] .tb-d');
    ok('Période des ruptures réglée dans « Alertes » reprise par la tuile', /vendus ces 30 derniers jours/.test(tuileRup), tuileRup);
    /* retours du 07/10 : meme libelle dans la tuile et dans la carte Alertes */
    const ligneAlerte = await p.evaluate(() => document.querySelector('[data-carte="alertes"] [data-liste="ruptures"]').closest('tr').textContent);
    ok('Tuile Ruptures : même libellé que la carte Alertes (« produits à zéro, dont … vendus ces … derniers jours »)', /produits à zéro, dont/.test(tuileRup)
      && ligneAlerte.includes(tuileRup.replace(/^.*?dont/, 'dont').trim()), tuileRup + ' / ' + ligneAlerte);

    // Liste des ruptures en fenetre
    const nbRup = (await api('../api/v1/tableau-bord/alertes?rup=30')).ruptures.produits;
    await cliquer('[data-tuile="ruptures"] [data-liste]');
    await p.waitForFunction(() => { let v = false; Ext.WindowManager.each((w) => { if (w.isVisible() && /rupture/i.test(w.title || '')) v = true; }); return v; }, null, { timeout: 30000 });
    const fr = await fenetre();
    ok('Ruptures : liste des produits en fenêtre de consultation (' + fr.lignes + ')', /Produits en rupture/.test(fr.t) && fr.lignes === Math.min(500, nbRup), fr.t + ' ' + fr.lignes + ' / ' + nbRup);
    await fermer();

    // Voir plus
    await p.evaluate(() => { const t = Ext.ComponentQuery.query('tableaubord')[0]; t.body.dom.querySelector('[data-carte="grossistes"]').scrollIntoView(); });
    await p.waitForFunction(() => document.querySelector('[data-plus="grossistes"]'), null, { timeout: 30000 });
    await cliquer('[data-plus="grossistes"]');
    await p.waitForFunction(() => { let v = false; Ext.WindowManager.each((w) => { if (w.isVisible() && /grossiste/i.test(w.title || '')) v = true; }); return v; }, null, { timeout: 30000 });
    const fg = await fenetre();
    ok('« Voir plus » : tous les grossistes en fenêtre', fg.lignes === gro.data.length, fg.lignes + ' / ' + gro.data.length);
    await fermer();

    // Top du mois : interrupteur
    await p.evaluate(() => { const t = Ext.ComponentQuery.query('tableaubord')[0]; t.body.dom.querySelector('[data-carte="topmois"]').scrollIntoView(); });
    await p.waitForFunction(() => document.querySelector('[data-seg="top"]'), null, { timeout: 30000 });
    await cliquer('[data-seg="top"] [data-v="qte"]');
    await p.waitForTimeout(400);
    const entete = await texte('[data-corps="topmois"] th:nth-child(3)');
    ok('Top du mois : interrupteur CA / quantité, marge et taux par produit', /Qté/.test(entete) && /Marge/.test(await texte('[data-corps="topmois"] tr')), entete);
    const unes = await p.evaluate(() => Array.from(document.querySelectorAll('.tb-nom1')).slice(0, 8).map((e) => e.getBoundingClientRect().height));
    ok('Libellés produits sur une seule ligne', unes.every((h) => h < 30), JSON.stringify(unes));

    // Personnalisation
    await cliquer('[data-tb="perso"]');
    await p.evaluate(() => { document.querySelector('[data-id="tiers"] .tb-masquer').click(); document.querySelector('[data-id="tuile-panier"] .tb-masquer').click(); });
    await p.waitForTimeout(300);
    const cartesTb = await p.evaluate(() => Array.from(document.querySelectorAll('[data-dd="cartes"] > [data-id]')).map((e) => e.getAttribute('data-id')));
    // glisser : « alertes » avant « evolution »
    await p.evaluate(() => {
      const z = document.querySelector('[data-dd="cartes"]'), a = z.querySelector('[data-id="alertes"]'), e = z.querySelector('[data-id="evolution"]');
      const dt = new DataTransfer();
      a.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }));
      e.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
      e.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
      a.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer: dt }));
    });
    await p.waitForTimeout(1500);
    const retires = await texte('[data-tb="retires"]');
    ok('Personnaliser : éléments retirés listés pour être remis', /Encours tiers payants/.test(retires) && /Panier moyen/.test(retires) && cartesTb.indexOf('tiers') < 0, retires);
    const pref = JSON.parse(q("SELECT txt_VALEUR FROM t_preference_utilisateur WHERE lg_USER_ID = '" + U + "' AND str_CLE = 'tableau-bord'") || '{}');
    ok('Disposition enregistrée pour l\'utilisateur (retirés, ordre, périodes)', (pref.retires || []).indexOf('tiers') >= 0 && (pref.retires || []).indexOf('tuile-panier') >= 0
      && (pref.ordreCartes || []).indexOf('alertes') < (pref.ordreCartes || []).indexOf('evolution') && pref.alertes && pref.alertes.rup === 30, JSON.stringify(pref));
    await cliquer('[data-tb="perso"]');

    // Rechargement : disposition reprise, element retire jamais lu
    routes.length = 0;
    await p.reload({ waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => Ext.ComponentQuery.query('tableaubord').length && document.querySelector('[data-dd="cartes"] > [data-id]'), null, { timeout: 60000 });
    await p.waitForTimeout(2000);
    await p.evaluate(() => { const t = Ext.ComponentQuery.query('tableaubord')[0]; t.body.dom.scrollTop = 99999; });
    await p.waitForTimeout(4000);
    const apres = await p.evaluate(() => ({ cartes: Array.from(document.querySelectorAll('[data-dd="cartes"] > [data-id]')).map((e) => e.getAttribute('data-id')), panier: !!document.querySelector('[data-id="tuile-panier"]') }));
    ok('Hors personnalisation : rappel « N élément(s) retiré(s) — remettre » dans l\'entête', /2 éléments retirés — remettre/.test(await texte('[data-tb="perso-rappel"]') || ''), await texte('[data-tb="perso-rappel"]'));
    ok('Après rechargement : disposition reprise (ordre, éléments retirés)', apres.cartes[0] === 'alertes' && apres.cartes.indexOf('tiers') < 0 && !apres.panier, apres.cartes.join(','));
    ok('Un élément retiré n\'est jamais lu', routes.indexOf('tiers-payants') < 0 && routes.indexOf('emplacements') >= 0, routes.join(','));
    // remettre puis disposition par defaut
    await cliquer('[data-tb="perso"]');
    await p.evaluate(() => document.querySelector('[data-remettre="tiers"]').click());
    await p.waitForTimeout(800);
    ok('Remettre un élément retiré', await p.evaluate(() => !!document.querySelector('[data-id="tiers"]')));
    await cliquer('[data-tb="defaut"]');
    await p.waitForTimeout(1500);
    const def = await p.evaluate(() => ({ cartes: document.querySelectorAll('[data-dd="cartes"] > [data-id]').length, tuiles: document.querySelectorAll('[data-dd="tuiles"] > [data-id]').length, premier: document.querySelector('[data-dd="cartes"] > [data-id]').getAttribute('data-id') }));
    ok('« Rétablir la disposition par défaut »', def.cartes === 13 && def.tuiles === 5 && def.premier === 'evolution', JSON.stringify(def));
    await cliquer('[data-tb="perso"]');

    // Clic -> menu lie (mouvements de caisse)
    await p.evaluate(() => { const t = Ext.ComponentQuery.query('tableaubord')[0]; t.body.dom.querySelector('[data-carte="alertes"]').scrollIntoView(); });
    await p.waitForFunction(() => document.querySelector('[data-corps="alertes"] [data-menu="i_sugg_manager"]'), null, { timeout: 30000 });
    await cliquer('[data-corps="alertes"] [data-menu="i_sugg_manager"]');
    await p.waitForFunction(() => Ext.ComponentQuery.query('i_sugg_manager').some((c) => c.isVisible(true)), null, { timeout: 30000 });
    ok('Clic sur une alerte : ouvre le menu lié (suggestions de commande)', true);

    // En-tete : le bouton apres la date ramene au tableau de bord (profil administrateur)
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('famillemanager', 'Fiche Article', ''));
    await p.waitForTimeout(2500);
    await p.evaluate(() => prestigeShowMetro());
    await p.waitForTimeout(3000);
    const retour = await p.evaluate(() => ({ drapeau: window.PRESTIGE_RETOUR_TB, tb: Ext.ComponentQuery.query('tableaubord').some((c) => c.isVisible(true)) }));
    ok('En-tête : profil administrateur → le bouton après la date ramène au tableau de bord', retour.drapeau === true && retour.tb, JSON.stringify(retour));

    // Bascule ANCIEN
    exec("UPDATE t_parameters SET str_VALUE = 'ANCIEN' WHERE str_KEY = 'KEY_TABLEAU_BORD_VERSION'");
    connecte = false;
    await p.goto('http://localhost:8080/prestige/general/', { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => window.Ext && Ext.ComponentQuery && Ext.ComponentQuery.query('dashboard').length && Ext.ComponentQuery.query('dashboard')[0].versionTableauBord, null, { timeout: 90000 });
    connecte = true;
    await p.waitForTimeout(7000);
    const ancien = await p.evaluate(() => { const f = Ext.ComponentQuery.query('dashboard')[0].getEl().dom.querySelector('iframe'); return { iframe: !!f, src: f ? f.getAttribute('src') : '', tb: Ext.ComponentQuery.query('tableaubord').length }; });
    ok('KEY_TABLEAU_BORD_VERSION = ANCIEN : dashboard.html dans son iframe, comme avant', ancien.iframe && /dashboard\.html/.test(ancien.src) && ancien.tb === 0, JSON.stringify(ancien));

    ok('Aucune réponse en erreur (4xx/5xx) après connexion', http.length === 0, JSON.stringify(http));
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Déroulé sans exception', false, (e.stack || '').split('\n').filter((l) => /test-tableau|Error/.test(l)).join(' | '));
  } finally {
    await b.close();
    exec("UPDATE t_parameters SET str_VALUE = '" + versionAvant + "' WHERE str_KEY = 'KEY_TABLEAU_BORD_VERSION'");
    exec("DELETE FROM t_preference_utilisateur WHERE lg_USER_ID = '" + U + "' AND str_CLE = 'tableau-bord'");
    if (prefAvant !== null) {
      exec("INSERT INTO t_preference_utilisateur (lg_USER_ID, str_CLE, txt_VALEUR, dt_UPDATED) VALUES ('" + U + "', 'tableau-bord', '" + prefAvant.replace(/'/g, "''") + "', NOW())");
    }
    ok('Nettoyage : paramètre et préférences remis', q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_TABLEAU_BORD_VERSION'") === versionAvant);
    const f = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - f) + '/' + res.length + ' PASS');
    process.exit(f ? 1 : 0);
  }
})();
