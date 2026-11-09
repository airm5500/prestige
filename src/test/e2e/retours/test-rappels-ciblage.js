/* RAPPELS TRAITEMENT : CIBLAGE LIBRE ET « ENVOYER AUX RÉSULTATS » (plan avoir du 08/11, point 5).
 *
 * Jeu d'essai (8 clients « ZZCIB », numeros fictifs 0100993xxx, ventes datees, retires a la fin), produit P1 :
 *  C1 3 ventes de P1 (dont 2 mixtes P1 + P2 : seul P1 compte au montant), tel.  -> retenu, joignable, 3 achats
 *  C2 2 ventes, numero seulement dans l'ancien champ adresse                     -> retenu, joignable
 *  C3 1 vente (minimum 2)                                                        -> ecarte
 *  C4 2 ventes dont 1 annulee                                                    -> ecarte
 *  C5 2 ventes, aucun numero                                                     -> retenu, non joignable (motif)
 *  C6 2 ventes de P2 seulement                                                   -> ecarte
 *  C7 2 ventes dont 1 hors periode (8 mois)                                      -> ecarte
 *  C8 2 ventes, fiche « ne pas citer les medicaments »                           -> retenu, joignable, message neutre
 * Par l'ecran, a 1366 x 768 :
 *  - Campagnes > onglet « Rappel traitement » > « Ciblage libre » puis menu « Rappels traitement » > « Ciblage libre » :
 *    meme produit (choisi par la liste deroulante), meme periode, minimum 2 -> memes lignes (client, telephone,
 *    achats, montant, dernier achat) sur les deux ecrans, et egales au calcul independant en base ;
 *  - « Envoyer aux résultats » (WhatsApp simule, mode test) : 1er clic = « Confirmer l'envoi à 3 client(s) », rien
 *    n'est envoye ; 2e clic = envoi ;
 *  - bilan : une campagne « Rappel traitement » (3 lignes PREPARE, 3 envoyes), 3 notifications, 3 WhatsApp simules,
 *    rien pour C5, aucun rappel inscrit, ventes inchangees ; {medicament} = nom de P1 sauf pour C8 (message neutre) ;
 *  - aide « ? » ouverte et fermee ; aucune erreur JavaScript, aucune fenetre.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });

/* deux produits sans aucune vente depuis 400 jours : seuls les clients d'essai les ont achetes, aucun client reel
 * n'apparait dans les resultats ni ne recoit de message (meme simule) ; CIP unique pour le choix dans la liste */
const SANS_VENTE = "f.str_STATUT = 'enable' AND NOT EXISTS (SELECT 1 FROM t_preenregistrement_detail d JOIN t_preenregistrement v ON v.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID"
  + " WHERE d.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND v.dt_UPDATED >= DATE_SUB(NOW(), INTERVAL 400 DAY))";
const P1 = q("SELECT f.lg_FAMILLE_ID FROM t_famille f WHERE " + SANS_VENTE + " AND CHAR_LENGTH(f.int_CIP) >= 7"
  + " AND (SELECT COUNT(*) FROM t_famille g WHERE g.int_CIP LIKE CONCAT('%', f.int_CIP, '%') OR g.str_NAME LIKE CONCAT('%', f.int_CIP, '%')) = 1 ORDER BY f.lg_FAMILLE_ID LIMIT 1");
const P2 = q("SELECT f.lg_FAMILLE_ID FROM t_famille f WHERE " + SANS_VENTE + " AND f.lg_FAMILLE_ID <> '" + P1 + "' ORDER BY f.lg_FAMILLE_ID LIMIT 1");
const CIP1 = q(`SELECT int_CIP FROM t_famille WHERE lg_FAMILLE_ID = '${P1}'`);
const NOM1 = q(`SELECT str_NAME FROM t_famille WHERE lg_FAMILLE_ID = '${P1}'`);
const IDS = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => 'E2E-CIB-' + i);
const clients = "('" + IDS.join("','") + "')";

/* une vente close : lignes [produit, quantite, montant], il y a « jours » jours */
let nv = 0;
function vente(client, jours, lignes, annulee) {
  const id = 'E2E-CIB-V' + (++nv), total = lignes.reduce((s, l) => s + l[2], 0), d = `DATE_SUB(NOW(), INTERVAL ${jours} DAY)`;
  return "INSERT INTO t_preenregistrement (lg_PREENREGISTREMENT_ID, lg_CLIENT_ID, str_STATUT, b_IS_CANCEL, int_PRICE, dt_CREATED, dt_UPDATED)"
    + ` VALUES ('${id}', '${client}', 'is_Closed', ${annulee ? 1 : 0}, ${total}, ${d}, ${d});`
    + lignes.map((l, k) => "INSERT INTO t_preenregistrement_detail (lg_PREENREGISTREMENT_DETAIL_ID, lg_PREENREGISTREMENT_ID, lg_FAMILLE_ID, int_QUANTITY, int_PRICE, prixAchat, dt_CREATED, dt_UPDATED)"
      + ` VALUES ('${id}-D${k}', '${id}', '${l[0]}', ${l[1]}, ${l[2]}, 100, ${d}, ${d});`).join('');
}

function nettoyer(debut) {
  exec("DELETE FROM whatsapp_message WHERE client_id IN " + clients + ";"
    + "DELETE n FROM notification n JOIN notification_client nc ON nc.notification_id = n.id WHERE nc.client_id IN " + clients + ";"
    + "DELETE FROM notification_client WHERE client_id IN " + clients + ";"
    + (debut ? "DELETE c FROM t_campagne c WHERE c.created_at >= '" + debut + "' AND EXISTS (SELECT 1 FROM t_campagne_ligne l WHERE l.campagne_id = c.id AND l.lg_CLIENT_ID IN " + clients + ");" : '')
    + "DELETE FROM t_campagne_ligne WHERE lg_CLIENT_ID IN " + clients + ";"
    + "DELETE FROM t_rappel_habitude WHERE lg_CLIENT_ID IN " + clients + ";"
    + "DELETE d FROM t_preenregistrement_detail d WHERE d.lg_PREENREGISTREMENT_ID LIKE 'E2E-CIB-V%';"
    + "DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE 'E2E-CIB-V%';"
    + "DELETE FROM t_client WHERE lg_CLIENT_ID IN " + clients + ";");
}

(async () => {
  ok('Précondition : deux produits, P1 avec un CIP', P1 && P2 && CIP1, P1 + ' / ' + P2);
  nettoyer(null);
  const debut = q('SELECT NOW()');
  const compteAvant = q("SELECT CONCAT_WS('|', actif, mode_test, COALESCE(phone_number_id,'~'), COALESCE(access_token,'~')) FROM whatsapp_compte WHERE mode = 'API'");
  const modeAvant = q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_WHATSAPP_MODE_DEFAUT'");
  exec("UPDATE whatsapp_compte SET actif = 1, mode_test = 1, phone_number_id = COALESCE(phone_number_id, '1234567890'), access_token = COALESCE(access_token, 'E2E-CMP-JETON') WHERE mode = 'API';"
    + "UPDATE t_parameters SET str_VALUE = 'API' WHERE str_KEY = 'KEY_WHATSAPP_MODE_DEFAUT';");
  /* [telephone, adresse, citer] */
  const fiches = [['0100993001', null, 1], [null, '0500993002', 1], ['0100993003', null, 1], ['0100993004', null, 1],
    [null, 'Cocody, rue 12', 1], ['0100993006', null, 1], ['0100993007', null, 1], ['0700993008', null, 0]];
  const s = (v) => (v === null ? 'NULL' : "'" + v + "'");
  exec(IDS.map((id, i) => "INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, str_TELEPHONE, str_ADRESSE, lg_TYPE_CLIENT_ID, str_STATUT, dt_CREATED, dt_UPDATED, bool_CONSENT_WHATSAPP, bool_MSG_MEDICAMENTS)"
    + ` VALUES ('${id}', 'ZZCIB', 'C${i + 1}', ${s(fiches[i][0])}, ${s(fiches[i][1])}, '6', 'enable', NOW(), NOW(), 1, ${fiches[i][2]});`).join('')
    + vente(IDS[0], 10, [[P1, 3, 4500], [P2, 1, 600]]) + vente(IDS[0], 40, [[P1, 1, 1500], [P2, 1, 800]]) + vente(IDS[0], 70, [[P1, 3, 4500]])
    + vente(IDS[1], 15, [[P1, 1, 1500]]) + vente(IDS[1], 100, [[P1, 1, 1450]])
    + vente(IDS[2], 20, [[P1, 1, 1500]])
    + vente(IDS[3], 25, [[P1, 1, 1500]]) + vente(IDS[3], 30, [[P1, 1, 1500]], true)
    + vente(IDS[4], 12, [[P1, 1, 1500]]) + vente(IDS[4], 50, [[P1, 2, 3000]])
    + vente(IDS[5], 12, [[P2, 1, 800]]) + vente(IDS[5], 50, [[P2, 1, 800]])
    + vente(IDS[6], 12, [[P1, 1, 1500]]) + vente(IDS[6], 245, [[P1, 1, 1500]])
    + vente(IDS[7], 5, [[P1, 1, 1500]]) + vente(IDS[7], 35, [[P1, 1, 1500]]));
  const ventesAvant = q("SELECT CONCAT(COUNT(*), ':', SUM(int_PRICE)) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE 'E2E-CIB-V%'");

  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const erreurs = [], dialogues = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  /* le hub « Rappels traitement » visible (onglet des campagnes ou ecran du menu) */
  const hub = (corps) => p.evaluate(`(() => { const h = Ext.ComponentQuery.query('rappelstraitement').filter((x) => x.isVisible(true))[0]; ${corps} })()`);
  const cliquerHub = async (sel) => { await p.click('#' + await hub(`return h.down('${sel}').getEl().dom.id;`)); };
  const lignes = () => hub("const l = []; h.down('#cbResultats').getStore().each((r) => l.push([r.get('client'), r.get('telephone'), r.get('achats'), r.get('montant'), r.get('dernierAchat'), r.get('joignable') ? 'J' : 'N'].join(':'))); return l.sort().join(' | ');");

  /* calcul independant : ventes distinctes de P1, closes, non annulees, sur la periode de l'ecran */
  const attenduBase = (du, au) => q("SELECT GROUP_CONCAT(x ORDER BY x SEPARATOR ' | ') FROM (SELECT CONCAT(CONCAT(c.str_FIRST_NAME, ' ', c.str_LAST_NAME), ':',"
    + " COALESCE(NULLIF(c.str_TELEPHONE, ''), IF(c.str_ADRESSE REGEXP '^0[157][0-9]{8}$', c.str_ADRESSE, '')), ':', COUNT(DISTINCT v.lg_PREENREGISTREMENT_ID), ':', SUM(d.int_PRICE), ':',"
    + " DATE(MAX(v.dt_UPDATED)), ':', IF(COALESCE(NULLIF(c.str_TELEPHONE, ''), IF(c.str_ADRESSE REGEXP '^0[157][0-9]{8}$', c.str_ADRESSE, NULL)) IS NULL, 'N', 'J')) AS x"
    + " FROM t_client c JOIN t_preenregistrement v ON v.lg_CLIENT_ID = c.lg_CLIENT_ID JOIN t_preenregistrement_detail d ON d.lg_PREENREGISTREMENT_ID = v.lg_PREENREGISTREMENT_ID"
    + ` WHERE c.lg_CLIENT_ID IN ${clients} AND d.lg_FAMILLE_ID = '${P1}' AND v.str_STATUT = 'is_Closed' AND v.b_IS_CANCEL = 0 AND v.int_PRICE > 0`
    + ` AND v.dt_UPDATED >= '${du}' AND v.dt_UPDATED < DATE_ADD('${au}', INTERVAL 1 DAY) GROUP BY c.lg_CLIENT_ID HAVING COUNT(DISTINCT v.lg_PREENREGISTREMENT_ID) >= 2) t`);

  /* ouvre « Ciblage libre », choisit P1 par son CIP dans la liste deroulante, recherche */
  const cibler = async () => {
    await cliquerHub('#rp-ciblage');
    await p.waitForFunction(() => Ext.ComponentQuery.query('rappelstraitement').some((h) => h.isVisible(true) && h.down('#cbResultats') && h.down('#cbResultats').isVisible(true)), null, { timeout: 15000 });
    await p.click('#' + await hub("return h.down('#cbReference').inputEl.dom.id;"));
    await p.keyboard.type(CIP1);
    await p.waitForSelector('.x-boundlist:visible .x-boundlist-item', { timeout: 15000 });
    await p.locator('.x-boundlist:visible .x-boundlist-item', { hasText: CIP1 }).first().click();
    const choisi = await hub("return h.down('#cbReference').getValue();");
    await cliquerHub('#cbChercher');
    await p.waitForFunction(() => Ext.ComponentQuery.query('rappelstraitement').some((h) => h.isVisible(true) && /trouvé/.test(h.down('#cbResultats').title || '')), null, { timeout: 60000 });
    return choisi;
  };
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });

    /* 1. Campagnes > Rappel traitement > Ciblage libre */
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('campagnes', 'Campagnes', ''));
    await p.waitForFunction(() => { const v = Ext.ComponentQuery.query('campagnes')[0]; return v && v.contexte; }, null, { timeout: 60000 });
    const ongletRappels = await p.evaluate(() => { const t = Ext.ComponentQuery.query('campagnes #ongletRappels')[0]; return t && t.tab && !t.tab.hidden ? t.tab.getEl().dom.id : null; });
    ok('Campagnes : onglet « Rappel traitement » visible', !!ongletRappels);
    await p.click('#' + ongletRappels);
    await p.waitForFunction(() => Ext.ComponentQuery.query('campagnes rappelstraitement').some((h) => h.isVisible(true)), null, { timeout: 30000 });
    const aideCampagnes = await p.evaluate(() => { const a = Ext.ComponentQuery.query('campagnes #aideRappels')[0]; return a ? a.getEl().dom.innerText : ''; });
    ok('Campagnes : l\'onglet s\'explique à l\'écran', /traitement/i.test(aideCampagnes) && aideCampagnes.length > 60, aideCampagnes);
    const choixC = await cibler();
    ok('Campagnes : le produit choisi dans la liste est P1', choixC === P1, choixC);
    const ecranCampagnes = await lignes();
    const crit = await hub("const f = h.filtresCiblage(); return [f.achatDu, f.achatAu, f.minAchats];");
    const base = attenduBase(crit[0], crit[1]);
    /* garde-fou : aucun client reel dans les resultats (sinon arret avant tout envoi, sans afficher de nom) */
    const horsEssai = (l) => l.split(' | ').filter((x) => x && !x.startsWith('ZZCIB ')).length;
    if (horsEssai(ecranCampagnes)) { throw new Error(horsEssai(ecranCampagnes) + ' client(s) hors jeu d\'essai dans les résultats : arrêt avant envoi'); }
    ok('Rapprochement campagnes = base (4 retenus : C1 3 achats, C2 par l\'adresse, C5 non joignable, C8)', ecranCampagnes === base && base.split(' | ').length === 4 && crit[2] === 2, ecranCampagnes + ' || ' + base);

    /* 2. Menu Rappels traitement > Ciblage libre */
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('rappelshabitude', 'Rappels traitement', ''));
    await p.waitForFunction(() => Ext.ComponentQuery.query('rappelstraitement').some((h) => h.isVisible(true) && !h.up('campagnes')), null, { timeout: 60000 });
    await cliquerHub('#rp-aide');
    const aide = await hub("const a = h.down('#rp-texte-aide'); return a.isVisible() ? a.getEl().dom.innerText : '';");
    ok('Aide « ? » : liste par défaut (3 achats, 35 jours, 3 jours), « préparer » et ciblage expliqués', /au moins 3 fois en un an/.test(aide) && /35 jours/.test(aide) && /3 jours/.test(aide) && /prépar/i.test(aide) && /ciblage/i.test(aide), aide.slice(0, 300));
    await cliquerHub('#rp-aide');
    ok('Aide « ? » : refermée au second clic', await hub("return !h.down('#rp-texte-aide').isVisible();"));
    const choixR = await cibler();
    const ecranRappels = await lignes();
    if (horsEssai(ecranRappels)) { throw new Error(horsEssai(ecranRappels) + ' client(s) hors jeu d\'essai dans les résultats : arrêt avant envoi'); }
    ok('Rapprochement rappels = campagnes = base, ligne par ligne', choixR === P1 && ecranRappels === ecranCampagnes && ecranRappels === base, ecranRappels);
    ok('Seuls les joignables sont cochés (3), C5 affiche son motif', await hub("return h.down('#cbResultats').getSelectionModel().getCount();") === 3
      && /\S/.test(await hub("const s = h.down('#cbResultats').getStore(); return s.getAt(s.findBy((r) => !r.get('joignable'))).get('motif') || '';")));

    /* 3. Envoyer aux resultats : message libre avec {medicament} */
    await hub("h.down('#cbModele').clearValue(); h.down('#cbTexte').setValue('Bonjour {prenom}, pensez à renouveler {medicament}.'); return 1;");
    await p.waitForTimeout(300);
    ok('Bouton : « Envoyer aux 3 résultat(s) »', /Envoyer aux 3 résultat/.test(await hub("return h.down('#cbEnvoyer').getText();")));
    await cliquerHub('#cbEnvoyer');
    await p.waitForTimeout(800);
    ok('1er clic : confirmation dans le bouton, rien n\'est envoyé', /Confirmer l'envoi à 3 client/.test(await hub("return h.down('#cbEnvoyer').getText();"))
      && q(`SELECT COUNT(*) FROM notification_client WHERE client_id IN ${clients}`) === '0');
    await cliquerHub('#cbEnvoyer');
    for (let i = 0; i < 40 && q(`SELECT COUNT(*) FROM whatsapp_message WHERE client_id IN ${clients}`) !== '3'; i++) { await p.waitForTimeout(500); }
    const etat = await hub("return h.down('#cbEtat').getEl().dom.innerText;");
    ok('2e clic : envoi annoncé à l\'écran', /3 message\(s\)/.test(etat), etat);

    /* 4. bilan */
    const camp = q(`SELECT CONCAT_WS(':', c.categorie, c.canal, c.nb_cibles, c.nb_envoyes, c.nb_exclus) FROM t_campagne c WHERE c.created_at >= '${debut}' AND EXISTS (SELECT 1 FROM t_campagne_ligne l WHERE l.campagne_id = c.id AND l.lg_CLIENT_ID IN ${clients})`);
    ok('Bilan : une seule campagne « Rappel traitement », WhatsApp, 3 envoyés', camp === 'TRAITEMENT:WHATSAPP:3:3:0', camp);
    const lignesCamp = q(`SELECT GROUP_CONCAT(CONCAT(lg_CLIENT_ID, ':', statut) ORDER BY lg_CLIENT_ID) FROM t_campagne_ligne WHERE lg_CLIENT_ID IN ${clients}`);
    ok('Bilan : lignes PREPARE pour C1, C2, C8, rien pour les autres', lignesCamp === 'E2E-CIB-1:PREPARE,E2E-CIB-2:PREPARE,E2E-CIB-8:PREPARE', lignesCamp);
    const wa = q(`SELECT GROUP_CONCAT(CONCAT(client_id, ':', telephone, ':', statut) ORDER BY client_id) FROM whatsapp_message WHERE client_id IN ${clients}`);
    ok('Bilan : 3 WhatsApp simulés, au numéro de l\'écran (C2 par l\'adresse)', wa === 'E2E-CIB-1:0100993001:SIMULE,E2E-CIB-2:0500993002:SIMULE,E2E-CIB-8:0700993008:SIMULE', wa);
    ok('Bilan : 3 notifications, une par client', q(`SELECT GROUP_CONCAT(client_id ORDER BY client_id) FROM notification_client WHERE client_id IN ${clients}`) === 'E2E-CIB-1,E2E-CIB-2,E2E-CIB-8');
    const cite = (id) => q(`SELECT COUNT(*) FROM notification n JOIN notification_client nc ON nc.notification_id = n.id WHERE nc.client_id = '${id}' AND n.message LIKE '%${NOM1.replace(/'/g, "''")}%'`);
    ok('{medicament} : nom de P1 pour C1 et C2, message neutre pour C8', cite(IDS[0]) === '1' && cite(IDS[1]) === '1' && cite(IDS[7]) === '0');
    ok('Bilan : aucun rappel inscrit, ventes inchangées', q(`SELECT COUNT(*) FROM t_rappel_habitude WHERE lg_CLIENT_ID IN ${clients}`) === '0'
      && q("SELECT CONCAT(COUNT(*), ':', SUM(int_PRICE)) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE 'E2E-CIB-V%'") === ventesAvant);
    ok('Aucune erreur JavaScript, aucune fenêtre', erreurs.length === 0 && dialogues.length === 0
      && await p.evaluate(() => Ext.ComponentQuery.query('window').filter((w) => w.isVisible()).length) === 0, erreurs.concat(dialogues).join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
    nettoyer(debut);
    const v = compteAvant.split('|').map((x) => (x === '~' ? 'NULL' : "'" + x.replace(/'/g, "''") + "'"));
    exec(`UPDATE whatsapp_compte SET actif = ${v[0]}, mode_test = ${v[1]}, phone_number_id = ${v[2]}, access_token = ${v[3]} WHERE mode = 'API';`
      + `UPDATE t_parameters SET str_VALUE = '${modeAvant}' WHERE str_KEY = 'KEY_WHATSAPP_MODE_DEFAUT';`);
    ok('Jeu d\'essai retiré, compte et paramètre remis', q(`SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID IN ${clients}`) === '0'
      && q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE 'E2E-CIB-V%'") === '0'
      && q("SELECT CONCAT_WS('|', actif, mode_test, COALESCE(phone_number_id,'~'), COALESCE(access_token,'~')) FROM whatsapp_compte WHERE mode = 'API'") === compteAvant);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
