/* CAMPAGNES : ONGLET FÊTES, LA LISTE DE DIFFUSION D'ABORD (plan avoir du 08/11, point 4).
 *
 * Avant : a l'ouverture de l'onglet Fêtes, la prochaine fete etait choisie et TOUS les clients actifs etaient charges
 * (jusqu'a 5 000 destinataires), avant tout choix. Attendu : rien n'est charge avant le choix de la liste de diffusion.
 *
 * Jeu d'essai : 3 clients « ZZFETE » (2 joignables WhatsApp, 1 sans numero) dans une liste « E2E fete ... ».
 * Par l'ecran, a 1366 x 768 :
 *  - ouverture de l'onglet : aucune recherche de destinataires, grille vide avec la consigne ; temps mesure ;
 *  - choix de la liste (clic dans la liste deroulante) : les destinataires sont exactement les membres en base
 *    (rapprochement ecran = base), titre « 2 joignable(s) sur 3 » ; temps mesure ;
 *  - « Tous les clients actifs » : la recherche porte sur tous les clients actifs (meme nombre qu'en base, plafond
 *    de 5 000 compris) ; temps mesure, pour comparaison avec l'ancien chargement d'office ;
 *  - aucune erreur JavaScript, aucune fenetre. Rien n'est envoye.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const NOM = 'E2E fete ' + Date.now();
const IDS = ['E2E-FETE-1', 'E2E-FETE-2', 'E2E-FETE-3'];

function nettoyer() {
  q("DELETE lc FROM t_campagne_liste_client lc JOIN t_campagne_liste l ON l.id = lc.liste_id WHERE l.nom LIKE 'E2E fete %';"
    + " DELETE FROM t_campagne_liste WHERE nom LIKE 'E2E fete %'; DELETE FROM t_client WHERE lg_CLIENT_ID LIKE 'E2E-FETE-%';");
}

(async () => {
  nettoyer();
  const tels = ['0100992001', '0500992002', ''];
  q(IDS.map((id, i) => "INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, str_TELEPHONE, lg_TYPE_CLIENT_ID, str_STATUT, dt_CREATED, dt_UPDATED, bool_CONSENT_WHATSAPP)"
    + ` VALUES ('${id}', 'ZZFETE', 'F${i + 1}', ${tels[i] ? "'" + tels[i] + "'" : 'NULL'}, '6', 'enable', NOW(), NOW(), 1);`).join('')
    + `INSERT INTO t_campagne_liste (id, nom, created_at) VALUES ('E2E-FETE-L', '${NOM}', NOW());`
    + IDS.map((id) => `INSERT INTO t_campagne_liste_client (liste_id, lg_CLIENT_ID, ajoute_at) VALUES ('E2E-FETE-L', '${id}', NOW());`).join(''));
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const erreurs = [], dialogues = [], recherches = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  p.on('request', (r) => { if (r.method() === 'POST' && /\/campagnes\/population/.test(r.url())) recherches.push(Date.now()); });
  const F = 'campagnes #onglet-FETE';
  const nombre = () => p.evaluate((s) => Ext.ComponentQuery.query(s + ' #destinataires')[0].getStore().getCount(), F);
  const titre = () => p.evaluate((s) => Ext.ComponentQuery.query(s + ' #destinataires')[0].title, F);
  /* fin d'une recherche : plus de masque de chargement et le titre a change */
  const attendreRecherche = (avant) => p.waitForFunction(([s, t]) => Ext.ComponentQuery.query(s + ' #destinataires')[0].title !== t, [F, avant], { timeout: 120000 });
  const choisirListe = async (texte) => {
    await p.click('#' + await p.evaluate((s) => Ext.ComponentQuery.query(s + ' #liste')[0].inputEl.dom.id, F));
    /* la liste deroulante de CE champ (une autre, deja ouverte, peut rester dans la page) */
    await p.waitForTimeout(300);
    /* champ deja actif : le clic a pu refermer la liste ; on rouvre par le bouton du champ, comme l'utilisateur */
    if (!await p.evaluate((s) => Ext.ComponentQuery.query(s + ' #liste')[0].isExpanded, F)) {
      await p.click('#' + await p.evaluate((s) => Ext.ComponentQuery.query(s + ' #liste')[0].triggerEl.first().dom.id, F));
    }
    await p.waitForFunction((s) => Ext.ComponentQuery.query(s + ' #liste')[0].isExpanded, F, { timeout: 15000 });
    const liste = await p.evaluate((s) => Ext.ComponentQuery.query(s + ' #liste')[0].getPicker().getEl().dom.id, F);
    /* les listes arrivent du serveur : attendre que la ligne voulue soit affichee, puis cliquer (re-resolue a chaque essai) */
    await p.waitForFunction(([s, t]) => { const c = Ext.ComponentQuery.query(s + ' #liste')[0]; return !c.getStore().isLoading() && c.getStore().find('affiche', t) >= 0; }, [F, texte], { timeout: 15000 });
    await p.locator('#' + liste + ' .x-boundlist-item', { hasText: texte }).first().click({ timeout: 15000 });
  };
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'CAMPAGNES SMS / WHATSAPP', 'Campagnes');
    await p.waitForFunction(() => { const v = Ext.ComponentQuery.query('campagnes')[0]; return v && v.contexte; }, null, { timeout: 60000 });

    /* 1. ouverture de l'onglet */
    const t0 = Date.now();
    await p.click('#' + await p.evaluate((s) => Ext.ComponentQuery.query(s)[0].tab.getEl().dom.id, F));
    await p.waitForFunction((s) => Ext.ComponentQuery.query(s + ' #fete')[0].getValue(), F, { timeout: 60000 });
    const titreOuverture = await titre();
    if (recherches.length) await attendreRecherche('Destinataires').catch(() => {});
    const tOuverture = Date.now() - t0;
    await p.waitForTimeout(2500);
    ok('Ouverture : aucune recherche de destinataires avant le choix de la liste', recherches.length === 0 && await nombre() === 0, recherches.length + ' recherche(s), ' + await nombre() + ' ligne(s)');
    ok('Ouverture : la consigne est affichée dans la grille vide', await p.evaluate((s) => /liste de diffusion/.test(Ext.ComponentQuery.query(s + ' #destinataires')[0].getView().el.dom.innerText), F));
    console.log('MESURE  ouverture de l\'onglet Fêtes : ' + tOuverture + ' ms (' + recherches.length + ' recherche(s))');

    /* 2. choix de la liste d'essai */
    const t1 = Date.now();
    await choisirListe(NOM);
    await attendreRecherche(titreOuverture);
    const tListe = Date.now() - t1;
    const vus = await p.evaluate((s) => { const l = []; Ext.ComponentQuery.query(s + ' #destinataires')[0].getStore().each((r) => l.push(r.get('clientId') || r.get('id'))); return l.sort().join(','); }, F);
    const base = q("SELECT GROUP_CONCAT(lg_CLIENT_ID ORDER BY lg_CLIENT_ID) FROM t_campagne_liste_client WHERE liste_id = 'E2E-FETE-L'");
    ok('Liste choisie : destinataires = membres de la liste en base', vus === base, vus + ' / ' + base);
    ok('Liste choisie : 2 joignables sur 3 (le client sans numéro compte, non joignable)', /2 joignable\(s\) sur 3/.test(await titre()), await titre());
    console.log('MESURE  choix de la liste (3 clients) : ' + tListe + ' ms');

    /* 3. tous les clients actifs */
    const avant = await titre();
    const t2 = Date.now();
    await choisirListe('Tous les clients actifs');
    await attendreRecherche(avant);
    const tTous = Date.now() - t2;
    const actifs = Math.min(5000, Number(q("SELECT COUNT(*) FROM t_client WHERE str_STATUT = 'enable'")));
    const total = Number(((await titre()).match(/sur (\d+)/) || [])[1]);
    ok('« Tous les clients actifs » : même nombre qu\'en base (plafond de 5 000 compris)', total === Number(q("SELECT COUNT(*) FROM t_client WHERE str_STATUT = 'enable'")) || (total >= actifs && await nombre() === actifs), await titre() + ' / base ' + actifs);
    console.log('MESURE  « Tous les clients actifs » (ancien chargement d\'office) : ' + tTous + ' ms');
    ok('Aucune erreur JavaScript, aucune fenêtre', erreurs.length === 0 && dialogues.length === 0
      && await p.evaluate(() => Ext.ComponentQuery.query('window').filter((w) => w.isVisible()).length) === 0, erreurs.concat(dialogues).join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Jeu d\'essai retiré', q("SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID LIKE 'E2E-FETE-%'") === '0' && q("SELECT COUNT(*) FROM t_campagne_liste WHERE nom LIKE 'E2E fete %'") === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
