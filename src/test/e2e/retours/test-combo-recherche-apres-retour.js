/* RECHERCHE D'ARTICLE PARTIE APRES LA FERMETURE DE L'ECRAN DE VENTE (retour support du 18/11, R5).
 *
 * Serveur d'appaul, CAISSE11, 16/11 13:15 (et 13/11, deux fois) : « Cannot read properties of null (reading
 * 'loadPage') », pile ext-all.js : DelayedTask -> doRawQuery -> doQuery -> doRemoteQuery -> loadPage. La frappe dans
 * une liste deroulante programme sa recherche une demi-seconde plus tard (queryDelay) ; ExtJS 4.2.1 n'annule cette
 * recherche qu'a la sortie du champ, pas a la destruction de la liste. Le caissier tape le debut d'un nom puis clique
 * RETOUR : l'ecran de vente est detruit, la recherche part sur une liste sans magasin et plante.
 *
 * Par les clics (compte e2e), SERVICE CLIENT > Ventes, « Nouvelle vente » :
 *  1. trois lettres tapees dans la recherche d'article puis RETOUR, aussitot, apres 150 ms et apres 300 ms (avant la
 *     demi-seconde), avec des debuts de nom differents : aucune erreur JavaScript, aucune recherche envoyee apres le
 *     clic, aucun evenement au Centre de support ;
 *  2. la recherche marche toujours : trois lettres tapees puis attente, la liste affiche les articles renvoyes par le
 *     serveur (rapprochement : lignes affichees = articles de la reponse) ;
 *  bilan : aucune vente creee par ces essais (t_preenregistrement), aucun evenement JS ; ventes eventuelles retirees.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu, cliquer } = require('../outils/vues');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '--raw', '-e', s], { encoding: 'utf8' }).replace(/\r?\n$/, '');
const debut = q('SELECT NOW()');
const idUser = q(`SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN}'`);
const ventes = () => q(`SELECT IFNULL(GROUP_CONCAT(lg_PREENREGISTREMENT_ID), '') FROM t_preenregistrement WHERE dt_CREATED >= '${debut}' AND lg_USER_ID = '${idUser}'`);
const evenementsJs = () => q(`SELECT COUNT(*) FROM t_application_event WHERE last_seen_at >= '${debut}' AND (message_court LIKE '%loadPage%' OR stack_extrait LIKE '%loadPage%')`);
/* debuts de nom d'articles actifs, tous differents */
const debuts = q("SELECT DISTINCT LOWER(LEFT(str_NAME, 3)) FROM t_famille WHERE str_STATUT = 'enable' AND str_NAME REGEXP '^[A-Za-z]{3}' ORDER BY 1 LIMIT 40")
  .split(/\r?\n/).filter(Boolean);
const CHAMP = 'doventemanager #contenu [xtype=fieldcontainer] #produit';

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const err = [];
  const recherches = [];
  p.on('pageerror', (e) => err.push(String(e.message)));
  p.on('request', (r) => { if (r.url().includes('/api/v1/vente/search')) { recherches.push({ t: Date.now(), url: r.url() }); } });
  const ouvrirVente = async () => {
    await ouvrirMenu(p, 'SERVICE CLIENT', 'Ventes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('cloturerventemanager #addBtn').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await cliquer(p, 'cloturerventemanager #addBtn');
    await p.waitForFunction((r) => Ext.ComponentQuery.query(r).some((x) => x.isVisible(true)), CHAMP, { timeout: 60000 });
    await p.waitForTimeout(1200);
  };
  try {
    ok('Jeu d\'essai : au moins 7 débuts de nom d\'article différents', debuts.length >= 7, debuts.length);
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirVente();
    const delai = await p.evaluate((r) => Ext.ComponentQuery.query(r)[0].queryDelay, CHAMP);
    ok('La recherche d\'article est différée (queryDelay > 300 ms)', delai > 300, delai);

    /* 1. frappe puis RETOUR avant la recherche differee */
    let i = 0;
    for (const attente of [0, 150, 300, 0, 150, 300]) {
      const texte = debuts[i++];
      const n0 = err.length;
      await cliquer(p, CHAMP);
      await p.keyboard.type(texte, { delay: 20 });
      if (attente) { await p.waitForTimeout(attente); }
      await cliquer(p, 'doventemanager #btnGoBack');
      const clic = Date.now();
      await p.waitForTimeout(1500);
      const apres = recherches.filter((x) => x.t > clic).length;
      ok(`« ${texte} » puis RETOUR après ${attente} ms : aucune erreur JavaScript, aucune recherche envoyée après le clic`,
        err.length === n0 && apres === 0, JSON.stringify(err.slice(n0)) + ' ; recherches après : ' + apres);
      await p.evaluate(() => { if (Ext.Msg && Ext.Msg.isVisible()) { Ext.Msg.hide(); } });
      await ouvrirVente();
    }

    /* 2. la recherche marche toujours : liste = reponse du serveur */
    const texte = debuts[i];
    const rep = p.waitForResponse((r) => r.url().includes('/api/v1/vente/search') && r.url().toLowerCase().includes(encodeURIComponent(texte)) && r.status() === 200, { timeout: 30000 });
    await cliquer(p, CHAMP);
    await p.keyboard.type(texte, { delay: 20 });
    const r = await rep;
    const corps = await r.json().catch(() => null);
    const lignesServeur = corps ? (corps.data || corps.results || corps.root || []).length : -1;
    await p.waitForTimeout(1000);
    const lignesEcran = await p.evaluate((ch) => { const c = Ext.ComponentQuery.query(ch)[0]; const l = c.getPicker(); return l && l.isVisible() ? l.getNodes().length : -1; }, CHAMP);
    ok(`Recherche « ${texte} » après les retours : la liste s'ouvre avec des articles`, lignesEcran > 0, lignesEcran);
    ok('Rapprochement : lignes de la liste = articles de la réponse du serveur', lignesServeur === lignesEcran, lignesEcran + ' / ' + lignesServeur);
    await p.keyboard.press('Escape');
    await cliquer(p, 'doventemanager #btnGoBack');
    await p.waitForTimeout(1500);

    /* bilan */
    ok('Bilan : aucune vente créée par ces essais', ventes() === '', ventes());
    ok('Bilan : aucun événement « loadPage » au Centre de support', evenementsJs() === '0', evenementsJs());
    ok('Aucune erreur JavaScript sur tout le parcours', err.length === 0, [...new Set(err)].join(' | '));
  } catch (x) {
    ok('Déroulé sans exception', false, x.stack || x);
  } finally {
    for (const id of ventes().split(',').filter(Boolean)) {
      await p.evaluate((v) => fetch('../api/v1/ventestats/remove/' + v, { method: 'POST' }).then((x) => x.status), id).catch(() => 0);
    }
    q(`DELETE FROM t_application_event WHERE last_seen_at >= '${debut}' AND (message_court LIKE '%loadPage%' OR stack_extrait LIKE '%loadPage%')`);
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
