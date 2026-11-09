/* CAMPAGNES : PANIER DE CLIENTS, TELEPHONE, FILTRES DE LISTE (plan avoir du 08/11, point 4).
 *
 * Jeu d'essai : 5 clients « ZZPAN » (WhatsApp accepte), numeros fictifs 0100990xxx, et quelques ventes datees d'un
 * produit existant ; tout est retire a la fin. Aucun vrai message : WhatsApp en mode test (simule).
 *  - Disposition : la zone « Ajouter des clients » est AU-DESSUS des clients de la liste ;
 *  - Panier (defaut confirme) : chercher A, cocher, chercher B, cocher... 5 recherches, 5 clients coches -> le panier
 *    en garde 5, « Ajouter les 5 client(s) » -> 5 membres en base ; retrait d'un client du panier ;
 *  - Telephone (defaut confirme) : str_TELEPHONE seul, adresse seule, les deux, aucun, adresse non numerique ;
 *    rapprochement base = recherche des listes = membres = destinataires d'une campagne = rappels des traitements =
 *    numero d'envoi WhatsApp (campagne et rappel) ;
 *  - Filtres de creation : produit achete + nombre d'achats, montant, sexe ; « Ajouter tous les résultats »
 *    (confirmation dans le bouton) ; resultats compares a un calcul SQL independant ;
 *  - bilan : exactement les traces attendues (membres, campagne, lignes, messages simules) ; aucune fenetre, aucune
 *    erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const NOM = 'E2E panier ' + Date.now();
const IDS = ['E2E-PAN-A', 'E2E-PAN-B', 'E2E-PAN-C', 'E2E-PAN-D', 'E2E-PAN-E'];
const clients = "('" + IDS.join("','") + "')";
/* [id, nom, telephone, adresse, sexe, numero attendu ('' : non joignable)] */
const JEU = [
  ['E2E-PAN-A', 'ZZPANA', '0100990001', null, 'F', '0100990001'], /* telephone seul */
  ['E2E-PAN-B', 'ZZPANB', null, '01 00 99 00 02', 'M', '0100990002'], /* adresse seule (fiche non reprise) */
  ['E2E-PAN-C', 'ZZPANC', '0100990003', '0500990013', 'F', '0100990003'], /* les deux : le telephone l'emporte */
  ['E2E-PAN-D', 'ZZPAND', null, null, 'M', ''], /* aucun */
  ['E2E-PAN-E', 'ZZPANE', null, 'Cocody Riviera 3', 'M', ''] /* adresse non numerique */
];
const ATTENDU = {};
JEU.forEach((x) => { ATTENDU[x[0]] = x[5]; });
const P1 = q("SELECT f.lg_FAMILLE_ID FROM t_famille f WHERE f.str_STATUT = 'enable' AND f.str_NAME LIKE 'DOLIPRANE 1000%' ORDER BY f.str_NAME LIMIT 1");
const P2 = q("SELECT f.lg_FAMILLE_ID FROM t_famille f WHERE f.str_STATUT = 'enable' AND f.str_NAME LIKE 'AMOXICILLINE%' ORDER BY f.str_NAME LIMIT 1");
const NOM_P1 = q(`SELECT str_NAME FROM t_famille WHERE lg_FAMILLE_ID = '${P1}'`);
const CAT = q("SELECT id FROM categorie_notification WHERE name = 'CAMPAGNE'");
const CAT_RAPPEL = q("SELECT COALESCE(GROUP_CONCAT(id), '0') FROM categorie_notification WHERE name IN ('RAPPEL_HABITUDE')");

function vente(id, client, famille, jour, montant) {
  return `INSERT INTO t_preenregistrement (lg_PREENREGISTREMENT_ID, lg_CLIENT_ID, str_STATUT, b_IS_CANCEL, int_PRICE, dt_CREATED, dt_UPDATED)
    VALUES ('${id}', '${client}', 'is_Closed', 0, ${montant}, '${jour} 10:00:00', '${jour} 10:00:00');
    INSERT INTO t_preenregistrement_detail (lg_PREENREGISTREMENT_DETAIL_ID, lg_PREENREGISTREMENT_ID, lg_FAMILLE_ID, int_QUANTITY, int_PRICE, prixAchat, dt_CREATED, dt_UPDATED)
    VALUES ('${id}-D', '${id}', '${famille}', 1, ${montant}, 500, '${jour} 10:00:00', '${jour} 10:00:00');`;
}

function nettoyer(debut) {
  exec("DELETE lc FROM t_campagne_liste_client lc JOIN t_campagne_liste l ON l.id = lc.liste_id WHERE l.nom LIKE 'E2E panier %';"
    + "DELETE FROM t_campagne_liste WHERE nom LIKE 'E2E panier %';"
    + "DELETE FROM whatsapp_message WHERE client_id IN " + clients + ";"
    + "DELETE nc FROM notification_client nc WHERE nc.client_id IN " + clients + ";"
    + "DELETE FROM notification WHERE type_notification IN (" + CAT + "," + CAT_RAPPEL + ") AND entity_ref IN " + clients + ";"
    + (debut ? "DELETE l FROM t_campagne_ligne l JOIN t_campagne c ON c.id = l.campagne_id WHERE c.created_at >= '" + debut + "' AND l.lg_CLIENT_ID IN " + clients + ";"
      + "DELETE c FROM t_campagne c WHERE c.created_at >= '" + debut + "' AND NOT EXISTS (SELECT 1 FROM t_campagne_ligne l WHERE l.campagne_id = c.id);" : '')
    + "DELETE FROM t_campagne_ligne WHERE lg_CLIENT_ID IN " + clients + ";"
    + "DELETE FROM t_rappel_habitude WHERE lg_CLIENT_ID IN " + clients + ";"
    + "DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID LIKE 'E2E-PAN-V%';"
    + "DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE 'E2E-PAN-V%';"
    + "DELETE FROM t_client WHERE lg_CLIENT_ID IN " + clients + ";");
}

(async () => {
  nettoyer(null);
  const debut = q('SELECT NOW()');
  const compteAvant = q("SELECT CONCAT_WS('|', actif, mode_test, COALESCE(phone_number_id,'~'), COALESCE(access_token,'~')) FROM whatsapp_compte WHERE mode = 'API'");
  const modeAvant = q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_WHATSAPP_MODE_DEFAUT'");
  ok('Numéros fictifs libres en base', q("SELECT COUNT(*) FROM t_client WHERE str_TELEPHONE LIKE '0100990%' OR str_ADRESSE LIKE '01 00 99 00%'") === '0');
  exec("UPDATE whatsapp_compte SET actif = 1, mode_test = 1, phone_number_id = COALESCE(phone_number_id, '1234567890'), access_token = COALESCE(access_token, 'E2E-CMP-JETON') WHERE mode = 'API';"
    + "UPDATE t_parameters SET str_VALUE = 'API' WHERE str_KEY = 'KEY_WHATSAPP_MODE_DEFAUT';"
    + JEU.map((x) => "INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, str_TELEPHONE, str_ADRESSE, str_SEXE, lg_TYPE_CLIENT_ID, str_STATUT, dt_CREATED, dt_UPDATED, bool_CONSENT_WHATSAPP)"
      + ` VALUES ('${x[0]}', '${x[1]}', 'ESSAI', ${x[2] ? "'" + x[2] + "'" : 'NULL'}, ${x[3] ? "'" + x[3] + "'" : 'NULL'}, '${x[4]}', '6', 'enable', NOW(), NOW(), 1);`).join('')
    /* A : 3 achats du produit (3 000) ; B : 1 achat (1 000) ; C : 2 achats d'un autre produit (2 x 1 500) ; D : 2 achats du produit dans la meme vente */
    + vente('E2E-PAN-V1', 'E2E-PAN-A', P1, q('SELECT CURDATE() - INTERVAL 70 DAY'), 1000) + vente('E2E-PAN-V2', 'E2E-PAN-A', P1, q('SELECT CURDATE() - INTERVAL 40 DAY'), 1000)
    + vente('E2E-PAN-V3', 'E2E-PAN-A', P1, q('SELECT CURDATE() - INTERVAL 10 DAY'), 1000) + vente('E2E-PAN-V4', 'E2E-PAN-B', P1, q('SELECT CURDATE() - INTERVAL 20 DAY'), 1000)
    + vente('E2E-PAN-V5', 'E2E-PAN-C', P2, q('SELECT CURDATE() - INTERVAL 30 DAY'), 1500) + vente('E2E-PAN-V6', 'E2E-PAN-C', P2, q('SELECT CURDATE() - INTERVAL 5 DAY'), 1500)
    + vente('E2E-PAN-V7', 'E2E-PAN-D', P1, q('SELECT CURDATE() - INTERVAL 15 DAY'), 800)
    + "INSERT INTO t_preenregistrement_detail (lg_PREENREGISTREMENT_DETAIL_ID, lg_PREENREGISTREMENT_ID, lg_FAMILLE_ID, int_QUANTITY, int_PRICE, prixAchat, dt_CREATED, dt_UPDATED)"
    + ` SELECT 'E2E-PAN-V7-D2', 'E2E-PAN-V7', '${P1}', 1, 700, 500, dt_CREATED, dt_UPDATED FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = 'E2E-PAN-V7';`
    /* lignes de rappel (habitudes) pour comparer le numero affiche par l'ecran des rappels */
    + IDS.map((id, i) => `INSERT INTO t_rappel_habitude (id, lg_CLIENT_ID, lg_FAMILLE_ID, dt_DERNIER_ACHAT, dt_PREVU, int_FREQUENCE, int_ACHATS, str_STATUT, dt_CREATED)
       VALUES ('E2E-PAN-R${i}', '${id}', '${P1}', CURDATE() - INTERVAL 28 DAY, CURDATE() + INTERVAL 2 DAY, 30, 3, 'A_PREPARER', NOW());`).join(''));

  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const erreurs = [], dialogues = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  const L = 'campagnes #ongletListes';
  const etat = () => p.evaluate((s) => Ext.ComponentQuery.query(s + ' #etat')[0].getEl().dom.innerText, L);
  const fenetres = () => p.evaluate(() => Ext.ComponentQuery.query('window').filter((w) => w.isVisible() && !w.isXType('messagebox')).length);
  const idListe = () => q(`SELECT id FROM t_campagne_liste WHERE nom = '${NOM}'`);
  const membresBase = () => q(`SELECT COALESCE(GROUP_CONCAT(lg_CLIENT_ID ORDER BY lg_CLIENT_ID), '') FROM t_campagne_liste_client WHERE liste_id = '${idListe()}'`);
  const grille = (sel) => p.evaluate((s) => { const l = []; Ext.ComponentQuery.query(s)[0].getStore().each((r) => l.push(r.data)); return l; }, sel);
  const taper = async (sel, texte) => {
    await p.click('#' + await p.evaluate((s) => Ext.ComponentQuery.query(s)[0].inputEl.dom.id, sel), { clickCount: 3 });
    await p.keyboard.press('Backspace');
    await p.keyboard.type(texte, { delay: 30 });
  };
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'CAMPAGNES SMS / WHATSAPP', 'Campagnes');
    await p.waitForFunction(() => { const v = Ext.ComponentQuery.query('campagnes')[0]; return v && v.contexte; }, null, { timeout: 60000 });
    await p.click('#' + await p.evaluate((s) => Ext.ComponentQuery.query(s)[0].tab.getEl().dom.id, L));
    await p.waitForTimeout(1500);

    /* --------------------------------------------------------------- disposition */
    const pos = await p.evaluate((s) => {
      const o = Ext.ComponentQuery.query(s)[0], z = o.down('#zoneAjout'), m = o.down('#membres');
      return z && m ? { z: z.getEl().getY(), m: m.getEl().getY(), zh: z.getHeight(), mh: m.getHeight() } : null;
    }, L);
    ok('Disposition : « Ajouter des clients » au-dessus des clients de la liste', pos && pos.z < pos.m && pos.zh > 150 && pos.mh > 100, JSON.stringify(pos));

    /* --------------------------------------------------------------- liste */
    await p.click('#' + await p.evaluate((s) => Ext.ComponentQuery.query(s + ' #nomListe')[0].inputEl.dom.id, L));
    await p.keyboard.type(NOM);
    await p.keyboard.press('Enter');
    await p.waitForFunction((s) => Ext.ComponentQuery.query(s + ' #listes')[0].getSelectionModel().getCount() === 1, L, { timeout: 15000 });

    /* --------------------------------------------------------------- panier : 5 recherches, 5 clients coches */
    for (const x of JEU) {
      await taper(L + ' #rechercheClient', x[1]);
      await p.waitForFunction(([s, id]) => { const st = Ext.ComponentQuery.query(s + ' #trouves')[0].getStore(); return st.getCount() === 1 && st.getAt(0).get('clientId') === id; }, [L, x[0]], { timeout: 15000 });
      /* la case a cocher de la ligne, par un vrai clic */
      const caseId = await p.evaluate((s) => { const g = Ext.ComponentQuery.query(s + ' #trouves')[0]; return g.getView().getNode(0).querySelector('.x-grid-row-checker').id || null; }, L);
      if (caseId) {
        await p.click('#' + caseId);
      } else {
        const box = await p.evaluate((s) => { const g = Ext.ComponentQuery.query(s + ' #trouves')[0]; const r = g.getView().getNode(0).querySelector('.x-grid-row-checker').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, L);
        await p.mouse.click(box.x, box.y);
      }
      await p.waitForTimeout(300);
    }
    const panier = await p.evaluate((s) => { const g = Ext.ComponentQuery.query(s + ' #panier')[0]; return g ? g.getStore().collect('clientId').sort().join(',') : 'pas de panier'; }, L);
    ok('Panier : 5 clients cochés dans 5 recherches sont tous gardés', panier === IDS.join(','), panier);
    const bouton = await p.evaluate((s) => Ext.ComponentQuery.query(s + ' #ajouterMembres')[0].getText(), L);
    ok('Bouton « Ajouter les 5 client(s) »', bouton === 'Ajouter les 5 client(s)', bouton);
    await cliquer(p, L + ' #ajouterMembres');
    await p.waitForFunction((s) => Ext.ComponentQuery.query(s + ' #membres')[0].getStore().getCount() >= 1, L, { timeout: 15000 });
    await p.waitForTimeout(800);
    ok('5 membres en base (défaut : un seul ajouté)', membresBase() === IDS.join(','), membresBase());
    ok('Panier vidé après l\'ajout, message dans l\'écran', await p.evaluate((s) => { const g = Ext.ComponentQuery.query(s + ' #panier')[0]; return g ? g.getStore().getCount() : -1; }, L) === 0 && /5 client\(s\) ajouté/.test(await etat()), await etat());

    /* retrait d'un client du panier */
    await taper(L + ' #rechercheClient', 'ZZPAN');
    await p.waitForFunction((s) => Ext.ComponentQuery.query(s + ' #trouves')[0].getStore().getCount() === 5, L, { timeout: 15000 });
    await p.evaluate((s) => { const g = Ext.ComponentQuery.query(s + ' #trouves')[0]; g.getSelectionModel().select([g.getStore().findRecord('clientId', 'E2E-PAN-A'), g.getStore().findRecord('clientId', 'E2E-PAN-B')], true); }, L);
    const retirer = await p.evaluate((s) => { const g = Ext.ComponentQuery.query(s + ' #panier')[0]; const i = g.getStore().findExact('clientId', 'E2E-PAN-A'); const r = g.getView().getNode(i).querySelector('.cmp-retirer').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, L);
    await p.mouse.click(retirer.x, retirer.y);
    await p.waitForTimeout(400);
    const apres = await p.evaluate((s) => { const o = Ext.ComponentQuery.query(s)[0]; return [o.down('#panier').getStore().collect('clientId').join(','), o.down('#trouves').getSelectionModel().getSelection().map((r) => r.get('clientId')).join(',')]; }, L);
    ok('Retrait du panier : le client sort du panier et est décoché', apres[0] === 'E2E-PAN-B' && apres[1] === 'E2E-PAN-B', apres.join(' | '));
    await cliquer(p, L + ' #viderPanier');
    await p.waitForTimeout(300);

    /* --------------------------------------------------------------- telephone : listes */
    const trouves = await grille(L + ' #trouves');
    const membres = await grille(L + ' #membres');
    const base = {};
    q(`SELECT lg_CLIENT_ID, COALESCE(str_TELEPHONE, ''), COALESCE(str_ADRESSE, '') FROM t_client WHERE lg_CLIENT_ID IN ${clients}`).split(/\r?\n/).forEach((l) => { const c = l.split('\t'); base[c[0]] = c.slice(1); });
    const ecarts = [];
    IDS.forEach((id) => {
      const t = trouves.find((r) => r.clientId === id), m = membres.find((r) => r.clientId === id);
      if (!t || t.telephone !== ATTENDU[id]) { ecarts.push('recherche ' + id + '=' + (t && t.telephone)); }
      if (!m || m.telephone !== ATTENDU[id]) { ecarts.push('membres ' + id + '=' + (m && m.telephone)); }
    });
    ok('Téléphone : recherche des listes = membres = règle (téléphone, sinon adresse valide)', ecarts.length === 0, ecarts.join(' ; ') + ' / base ' + JSON.stringify(base));

    /* --------------------------------------------------------------- filtres de creation */
    const filtrer = async (valeurs) => {
      await p.evaluate(([s, v]) => {
        const o = Ext.ComponentQuery.query(s)[0];
        ['rechercheClient', 'ajSexe', 'ajAgeMin', 'ajAgeMax', 'ajMoisAchat', 'ajMinAchats', 'ajMontant'].forEach((k) => { const c = o.down('#' + k); c.suspendEvents(); c.setValue(k === 'ajSexe' || k === 'ajMoisAchat' ? '' : null); c.resumeEvents(); });
        o.down('#ajReference').clearValue();
        Object.keys(v).forEach((k) => { if (k !== 'ajReference') { const c = o.down('#' + k); c.suspendEvents(); c.setValue(v[k]); c.resumeEvents(); } });
      }, [L, valeurs]);
      if (valeurs.ajReference) {
        /* produit : par la liste de choix (frappe de 2 lettres au moins, puis choix) */
        await taper(L + ' #ajReference', valeurs.ajReference.slice(0, 8));
        await p.waitForFunction(([s, nom]) => { const c = Ext.ComponentQuery.query(s + ' #ajReference')[0]; return c.getStore().findExact('libelle', nom) >= 0; }, [L, valeurs.ajReference], { timeout: 15000 });
        await p.evaluate(([s, nom]) => { const c = Ext.ComponentQuery.query(s + ' #ajReference')[0]; const r = c.getStore().getAt(c.getStore().findExact('libelle', nom)); c.select(r); c.fireEvent('select', c, [r]); c.collapse(); }, [L, valeurs.ajReference]);
      }
      await cliquer(p, L + ' #chercherAjout');
      await p.waitForFunction((s) => /Résultats/.test(Ext.ComponentQuery.query(s + ' #trouves')[0].title) && !Ext.ComponentQuery.query(s + ' #trouves')[0].el.isMasked(), L, { timeout: 30000 });
      await p.waitForTimeout(500);
      return (await grille(L + ' #trouves')).map((r) => r.clientId).filter((id) => id.startsWith('E2E-PAN-')).sort().join(',');
    };
    /* calcul independant : clients ZZPAN ayant au moins N ventes du produit sur 12 mois */
    const sqlProduit = (n) => q(`SELECT COALESCE(GROUP_CONCAT(x.c ORDER BY x.c), '') FROM (SELECT p.lg_CLIENT_ID c FROM t_preenregistrement p JOIN t_preenregistrement_detail d ON d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
      WHERE p.lg_CLIENT_ID IN ${clients} AND d.lg_FAMILLE_ID = '${P1}' AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 AND p.dt_UPDATED >= CURDATE() - INTERVAL 12 MONTH
      GROUP BY p.lg_CLIENT_ID HAVING COUNT(DISTINCT p.lg_PREENREGISTREMENT_ID) >= ${n}) x`);
    const r1 = await filtrer({ rechercheClient: 'ZZPAN', ajReference: NOM_P1, ajMinAchats: 2 });
    ok('Filtre produit, 2 achats au moins : A seul (D : deux lignes d\'une même vente = 1 achat) = calcul SQL', r1 === 'E2E-PAN-A' && r1 === sqlProduit(2), r1 + ' / sql ' + sqlProduit(2));
    const r2 = await filtrer({ rechercheClient: 'ZZPAN', ajReference: NOM_P1 });
    ok('Filtre produit, sans minimum : A, B, D = calcul SQL', r2 === 'E2E-PAN-A,E2E-PAN-B,E2E-PAN-D' && r2 === sqlProduit(1), r2 + ' / sql ' + sqlProduit(1));
    const sqlMontant = (m) => q(`SELECT COALESCE(GROUP_CONCAT(x.c ORDER BY x.c), '') FROM (SELECT p.lg_CLIENT_ID c FROM t_preenregistrement p WHERE p.lg_CLIENT_ID IN ${clients}
      AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 AND p.dt_UPDATED >= CURDATE() - INTERVAL 3 MONTH GROUP BY p.lg_CLIENT_ID HAVING SUM(p.int_PRICE) >= ${m}) x`);
    const r3 = await filtrer({ rechercheClient: 'ZZPAN', ajMoisAchat: 3, ajMontant: 3000 });
    ok('Filtre montant 3 000 sur 3 mois : A (3 000) et C (3 000), pas B ni D = calcul SQL', r3 === 'E2E-PAN-A,E2E-PAN-C' && r3 === sqlMontant(3000), r3 + ' / sql ' + sqlMontant(3000));
    const r4 = await filtrer({ rechercheClient: 'ZZPAN', ajSexe: 'F' });
    ok('Filtre sexe : A et C (femmes)', r4 === 'E2E-PAN-A,E2E-PAN-C', r4);
    const r5 = await filtrer({ rechercheClient: 'ZZPAN', ajMontant: 999999 });
    ok('Filtre sans résultat : liste vide, « Ajouter tous les résultats » désactivé', r5 === '' && await p.evaluate((s) => Ext.ComponentQuery.query(s + ' #ajouterResultats')[0].isDisabled(), L), r5);

    /* « Ajouter tous les resultats » sur une nouvelle liste : retirer d'abord les 5, puis ajouter les femmes */
    exec(`DELETE FROM t_campagne_liste_client WHERE liste_id = '${idListe()}'`);
    const r6 = await filtrer({ rechercheClient: 'ZZPAN', ajSexe: 'F' });
    await cliquer(p, L + ' #ajouterResultats');
    await p.waitForTimeout(400);
    const conf = await p.evaluate((s) => Ext.ComponentQuery.query(s + ' #ajouterResultats')[0].getText(), L);
    ok('« Ajouter tous les résultats » : confirmation dans le bouton, rien ajouté au 1er clic', /Confirmer : ajouter les 2 résultat/.test(conf) && membresBase() === '' && await fenetres() === 0, conf);
    await cliquer(p, L + ' #ajouterResultats');
    await p.waitForTimeout(1500);
    ok('« Ajouter tous les résultats » au 2e clic : A et C en base, message', r6 === 'E2E-PAN-A,E2E-PAN-C' && membresBase() === 'E2E-PAN-A,E2E-PAN-C' && /2 client\(s\) ajouté/.test(await etat()), membresBase() + ' / ' + await etat());

    /* --------------------------------------------------------------- telephone : campagne (Infos clients) et envoi */
    await p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('campagnes #onglet-INFO_CLIENTS')[0].tab.getEl().dom.id));
    await p.waitForTimeout(1500);
    await p.evaluate(() => { const o = Ext.ComponentQuery.query('campagnes #onglet-INFO_CLIENTS')[0]; o.down('#recherche').setValue('ZZPAN'); });
    await cliquer(p, 'campagnes #onglet-INFO_CLIENTS #voir');
    await p.waitForFunction(() => /Destinataires : \d+ joignable/.test(Ext.ComponentQuery.query('campagnes #onglet-INFO_CLIENTS #destinataires')[0].title), null, { timeout: 30000 });
    await p.waitForTimeout(500);
    const dest = await grille('campagnes #onglet-INFO_CLIENTS #destinataires');
    const ecartsC = IDS.filter((id) => { const r = dest.find((x) => x.clientId === id); return !r || r.telephone !== ATTENDU[id] || r.joignable !== (ATTENDU[id] !== ''); });
    ok('Campagne : numéro et « joignable » selon la règle (A téléphone seul : joignable ; D, E : non)', ecartsC.length === 0, ecartsC.join(',') + ' ' + JSON.stringify(dest.map((r) => r.clientId + ':' + r.telephone + ':' + r.joignable)));
    await p.evaluate(() => { const o = Ext.ComponentQuery.query('campagnes #onglet-INFO_CLIENTS')[0]; o.down('#modele').clearValue(); o.down('#texte').setValue('Bonjour {prenom}, essai e2e panier.'); });
    await p.waitForTimeout(600);
    await cliquer(p, 'campagnes #onglet-INFO_CLIENTS #envoyer');
    await p.waitForTimeout(300);
    await cliquer(p, 'campagnes #onglet-INFO_CLIENTS #envoyer');
    await p.waitForFunction(() => /en cours d'envoi/.test(Ext.ComponentQuery.query('campagnes #onglet-INFO_CLIENTS #etat')[0].getEl().dom.innerText), null, { timeout: 30000 });
    for (let i = 0; i < 30 && q(`SELECT COUNT(*) FROM whatsapp_message WHERE client_id IN ${clients}`) !== '3'; i++) { await p.waitForTimeout(500); }
    const envoisC = q(`SELECT COALESCE(GROUP_CONCAT(CONCAT(client_id, ':', telephone, ':', statut) ORDER BY client_id), '') FROM whatsapp_message WHERE client_id IN ${clients}`);
    ok('Envoi de la campagne : numéro d\'envoi = règle, pour A, B, C seulement (simulé)', envoisC === 'E2E-PAN-A:0100990001:SIMULE,E2E-PAN-B:0100990002:SIMULE,E2E-PAN-C:0100990003:SIMULE', envoisC);

    /* --------------------------------------------------------------- telephone : rappels des traitements */
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('rappelshabitude', 'Rappels traitement', ''));
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('rappelshabitude')[0]; return g && g.getStore().isLoading && !g.getStore().isLoading(); }, null, { timeout: 30000 });
    await p.evaluate(() => { const g = Ext.ComponentQuery.query('rappelshabitude')[0]; g.down('#query').setValue('ZZPAN'); });
    await cliquer(p, 'rappelshabitude #btnRechercher');
    await p.waitForFunction(() => Ext.ComponentQuery.query('rappelshabitude')[0].getStore().getCount() === 5, null, { timeout: 30000 });
    const rap = await grille('rappelshabitude');
    const ecartsR = IDS.filter((id) => { const r = rap.find((x) => x.clientId === id); return !r || (r.telephone || '') !== ATTENDU[id]; });
    ok('Rappels : numéro affiché = règle = campagne', ecartsR.length === 0, ecartsR.join(',') + ' ' + JSON.stringify(rap.map((r) => r.clientId + ':' + r.telephone)));
    /* envoi du rappel par WhatsApp, par les vrais boutons (le message de confirmation existant est une boite ExtJS) */
    exec(`DELETE FROM whatsapp_message WHERE client_id IN ${clients}`);
    await p.evaluate(() => { const g = Ext.ComponentQuery.query('rappelshabitude')[0]; g.getSelectionModel().selectAll(); });
    await cliquer(p, 'rappelshabitude #btnSms');
    await p.waitForTimeout(300);
    await cliquer(p, 'rappelshabitude #envWhatsapp');
    await p.waitForFunction(() => Ext.ComponentQuery.query('messagebox')[0] && Ext.ComponentQuery.query('messagebox')[0].isVisible(), null, { timeout: 10000 });
    await p.evaluate(() => { const m = Ext.ComponentQuery.query('messagebox')[0]; m.down('button[itemId=yes]').btnEl.dom.click(); });
    for (let i = 0; i < 30 && q(`SELECT COUNT(*) FROM whatsapp_message WHERE client_id IN ${clients}`) !== '3'; i++) { await p.waitForTimeout(500); }
    const envoisR = q(`SELECT COALESCE(GROUP_CONCAT(CONCAT(client_id, ':', telephone, ':', statut) ORDER BY client_id), '') FROM whatsapp_message WHERE client_id IN ${clients}`);
    ok('Envoi du rappel : même numéro que la campagne (A téléphone seul envoyé), D et E refusés', envoisR === envoisC, envoisR);
    await p.evaluate(() => { const m = Ext.ComponentQuery.query('messagebox')[0]; if (m && m.isVisible()) { m.down('button[itemId=ok]').btnEl.dom.click(); } });

    /* --------------------------------------------------------------- bilan */
    const camp = q(`SELECT CONCAT(c.categorie, ':', c.nb_cibles, ':', c.nb_envoyes, ':', c.nb_exclus) FROM t_campagne c WHERE c.created_at >= '${debut}' AND EXISTS (SELECT 1 FROM t_campagne_ligne l WHERE l.campagne_id = c.id AND l.lg_CLIENT_ID IN ${clients})`);
    const lignes = q(`SELECT GROUP_CONCAT(CONCAT(l.lg_CLIENT_ID, ':', l.statut) ORDER BY l.lg_CLIENT_ID) FROM t_campagne_ligne l JOIN t_campagne c ON c.id = l.campagne_id WHERE c.created_at >= '${debut}' AND l.lg_CLIENT_ID IN ${clients}`);
    const notifs = q(`SELECT COUNT(*) FROM notification WHERE type_notification = ${CAT} AND entity_ref IN ${clients}`);
    const notifsR = q(`SELECT COUNT(*) FROM notification WHERE type_notification IN (${CAT_RAPPEL}) AND entity_ref IN ${clients}`);
    ok('Bilan : une campagne (5 clients, 3 préparés, 2 écartés), 3 notifications de campagne, 3 de rappel', camp === 'INFO_CLIENTS:5:3:2'
      && lignes === 'E2E-PAN-A:PREPARE,E2E-PAN-B:PREPARE,E2E-PAN-C:PREPARE,E2E-PAN-D:EXCLU,E2E-PAN-E:EXCLU' && notifs === '3' && notifsR === '3', [camp, lignes, notifs, notifsR].join(' | '));
    ok('Aucune erreur JavaScript, aucune fenêtre surgissante du navigateur', erreurs.length === 0 && dialogues.length === 0, erreurs.concat(dialogues).join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
    nettoyer(debut);
    const v = compteAvant.split('|').map((x) => (x === '~' ? 'NULL' : "'" + x.replace(/'/g, "''") + "'"));
    exec(`UPDATE whatsapp_compte SET actif = ${v[0]}, mode_test = ${v[1]}, phone_number_id = ${v[2]}, access_token = ${v[3]} WHERE mode = 'API';`
      + `UPDATE t_parameters SET str_VALUE = '${modeAvant}' WHERE str_KEY = 'KEY_WHATSAPP_MODE_DEFAUT';`);
    ok('Jeu d\'essai retiré, compte WhatsApp remis', q(`SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID IN ${clients}`) === '0'
      && q("SELECT COUNT(*) FROM t_campagne_liste WHERE nom LIKE 'E2E panier %'") === '0' && q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE 'E2E-PAN-V%'") === '0'
      && q(`SELECT COUNT(*) FROM t_campagne c WHERE c.created_at >= '${debut}' AND c.categorie = 'INFO_CLIENTS' AND NOT EXISTS (SELECT 1 FROM t_campagne_ligne l WHERE l.campagne_id = c.id)`) === '0'
      && q("SELECT CONCAT_WS('|', actif, mode_test, COALESCE(phone_number_id,'~'), COALESCE(access_token,'~')) FROM whatsapp_compte WHERE mode = 'API'") === compteAvant);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
