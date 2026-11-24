/* CAMPAGNES ET RAPPELS : CORRIGER LE NUMERO D'UN CLIENT PAR LE CRAYON (plan du 21/11, point 8.3).
 *
 * Reponse du 22/11 : « droit, avec le crayon des Rappels mis de côté : accord ». Le droit P_CLIENT_STANDARD_MAJ vaut
 * pour tous les types de clients ; le crayon ✎ est dans la colonne Téléphone des onglets des Campagnes et du
 * « Ciblage libre » des Rappels.
 *
 * Jeu d'essai (clients de test ZZCRY, numeros fictifs 01009800xx, accord WhatsApp donne) :
 *   A standard, numero invalide « 12345 », 2 achats ; B assurance, sans numero ; C standard 0100980003 ;
 *   D assurance 0100980004 ; E standard sans numero, 2 achats.
 * Par les vues (admin), au clavier et a la souris :
 *  - crayon rouge pour A, B, E (numero absent ou invalide), bleu pour C et D ;
 *  - A : le numero de C (meme type) est refuse, « 12 » est refuse, l'erreur s'affiche sur le champ, rien n'est ecrit ;
 *    « 01 00 98 00 01 » + Entree : la cellule se referme, la ligne devient joignable ; en base telephone ET adresse
 *    (client standard) ;
 *  - B : Echap annule (rien d'ecrit) ; le numero de C est accepte (autre type) ; en base le telephone seul ;
 *  - D : le numero que B vient de prendre est refuse (meme type) ;
 *  - Rappels, « Ciblage libre » : E corrige depuis les resultats ;
 *  - rapprochement : ligne de l'ecran = nouvelle recherche du serveur = base, pour les cinq clients ;
 *  - 1366×768, 1280×720, 1920×1080 : le crayon tient dans sa cellule, le numero n'est pas masque ;
 *  - sans le droit : le service le dit, refuse l'enregistrement, et aucun crayon n'est dessine ;
 *  - bilan : seuls A, B et E sont modifies ; aucune campagne, ligne ou notification ; aucune fenetre.
 * Les noms des clients ne sont ni lus ni affiches : seuls les identifiants de test et les numeros fictifs le sont.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu } = require('../outils/vues');
const BASE = ENV_E2E.BASE;
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });

const A = 'E2E-CRY-A', B = 'E2E-CRY-B', C = 'E2E-CRY-C', D = 'E2E-CRY-D', E = 'E2E-CRY-E';
const IDS = [A, B, C, D, E];
const clients = "('" + IDS.join("','") + "')";
/* [id, nom, type, telephone, adresse] */
const JEU = [[A, 'ZZCRYA', '6', '12345', null], [B, 'ZZCRYB', '1', null, null], [C, 'ZZCRYC', '6', '0100980003', '0100980003'],
  [D, 'ZZCRYD', '1', '0100980004', null], [E, 'ZZCRYE', '6', null, null]];
const P1 = q("SELECT f.lg_FAMILLE_ID FROM t_famille f WHERE f.str_STATUT = 'enable' AND CHAR_LENGTH(f.int_CIP) >= 7 ORDER BY f.lg_FAMILLE_ID LIMIT 1");
const CIP = q(`SELECT int_CIP FROM t_famille WHERE lg_FAMILLE_ID = '${P1}'`);
const DROIT = "(SELECT lg_PRIVELEGE_ID FROM t_privilege WHERE str_NAME = 'P_CLIENT_STANDARD_MAJ')";
const ROLE = "(SELECT ru.lg_ROLE_ID FROM t_role_user ru JOIN t_user u ON u.lg_USER_ID = ru.lg_USER_ID WHERE u.str_LOGIN = '" + ENV_E2E.LOGIN + "' LIMIT 1)";
const RETIRER = 'DELETE FROM t_role_privelege WHERE lg_PRIVILEGE_ID = ' + DROIT + ' AND lg_ROLE_ID = ' + ROLE;
const RENDRE = 'INSERT INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED, dt_UPDATED)'
  + ' SELECT LEFT(UUID(), 40), ' + ROLE + ', ' + DROIT + ', NOW(), NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege'
  + ' WHERE lg_PRIVILEGE_ID = ' + DROIT + ' AND lg_ROLE_ID = ' + ROLE + ')';

function vente(id, client, jour) {
  return `INSERT INTO t_preenregistrement (lg_PREENREGISTREMENT_ID, lg_CLIENT_ID, str_STATUT, b_IS_CANCEL, int_PRICE, dt_CREATED, dt_UPDATED)
    VALUES ('${id}', '${client}', 'is_Closed', 0, 1000, '${jour} 10:00:00', '${jour} 10:00:00');
    INSERT INTO t_preenregistrement_detail (lg_PREENREGISTREMENT_DETAIL_ID, lg_PREENREGISTREMENT_ID, lg_FAMILLE_ID, int_QUANTITY, int_PRICE, prixAchat, dt_CREATED, dt_UPDATED)
    VALUES ('${id}-D', '${id}', '${P1}', 1, 1000, 500, '${jour} 10:00:00', '${jour} 10:00:00');`;
}
function nettoyer() {
  exec("DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID LIKE 'E2E-CRY-V%';"
    + "DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE 'E2E-CRY-V%';"
    + "DELETE FROM t_client WHERE lg_CLIENT_ID IN " + clients + ';');
}
/* la fiche en base : telephone|adresse|maj apres le debut */
const fiche = (id, debut) => q(`SELECT CONCAT_WS('|', COALESCE(str_TELEPHONE, '~'), COALESCE(str_ADRESSE, '~'), dt_UPDATED >= '${debut}') FROM t_client WHERE lg_CLIENT_ID = '${id}'`);

(async () => {
  nettoyer();
  ok('Préalable : numéros fictifs 01009800xx libres, produit au CIP de 7 chiffres', q("SELECT COUNT(*) FROM t_client WHERE str_TELEPHONE LIKE '01009800%' OR str_ADRESSE LIKE '01009800%'") === '0' && !!CIP, CIP);
  exec(JEU.map((x) => 'INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, str_TELEPHONE, str_ADRESSE, str_SEXE, lg_TYPE_CLIENT_ID, str_STATUT,'
    + ` dt_CREATED, dt_UPDATED, bool_CONSENT_WHATSAPP, bool_CONSENT_SMS) VALUES ('${x[0]}', '${x[1]}', 'ESSAI', ${x[3] ? "'" + x[3] + "'" : 'NULL'},`
    + ` ${x[4] ? "'" + x[4] + "'" : 'NULL'}, 'F', '${x[2]}', 'enable', NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 1 DAY, 1, 1);`).join('')
    + vente('E2E-CRY-V1', A, q('SELECT CURDATE() - INTERVAL 20 DAY')) + vente('E2E-CRY-V2', A, q('SELECT CURDATE() - INTERVAL 10 DAY'))
    + vente('E2E-CRY-V3', E, q('SELECT CURDATE() - INTERVAL 15 DAY')) + vente('E2E-CRY-V4', E, q('SELECT CURDATE() - INTERVAL 5 DAY')));
  const debut = q('SELECT NOW()');
  const traces = () => q("SELECT CONCAT((SELECT COUNT(*) FROM t_campagne), '/', (SELECT COUNT(*) FROM t_campagne_ligne), '/', (SELECT COUNT(*) FROM notification), '/', (SELECT COUNT(*) FROM t_rappel_habitude))");
  const traces0 = traces();
  const fiches0 = IDS.map((id) => fiche(id, debut));

  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const erreurs = [], dialogues = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  const G = 'campagnes #onglet-INFO_CLIENTS #destinataires';
  const fenetres = () => p.evaluate(() => Ext.ComponentQuery.query('window').filter((w) => w.isVisible() && !w.isXType('messagebox') && !w.hasCls('x-tip')).length);
  const lignes = (g) => p.evaluate((s) => { const l = {}; Ext.ComponentQuery.query(s)[0].getStore().each((r) => { l[r.get('clientId')] = { telephone: r.get('telephone'), joignable: r.get('joignable'), motif: r.get('motif') }; }); return l; }, g);
  /* le crayon de la ligne du client : classe et position */
  const crayon = (g, id) => p.evaluate(([s, i]) => {
    const grid = Ext.ComponentQuery.query(s)[0], v = grid.getView(), n = v.getNode(grid.getStore().findExact('clientId', i));
    const c = n && n.querySelector('.crayon-tel');
    if (!c) { return null; }
    const r = c.getBoundingClientRect(), td = c.closest('td').getBoundingClientRect(), num = n.querySelector('.crayon-tel-numero');
    return { rouge: c.classList.contains('crayon-tel-alerte'), x: r.x + r.width / 2, y: r.y + r.height / 2,
      dedans: r.left >= td.left - 1 && r.right <= td.right + 1 && r.top >= td.top - 1 && r.bottom <= td.bottom + 1,
      numeroEntier: !num || num.scrollWidth <= num.clientWidth + 1 };
  }, [g, id]);
  const champ = () => p.evaluate(() => { const f = Ext.ComponentQuery.query('#champTelephone').filter((x) => x.isVisible(true))[0];
    return f ? { ouvert: true, focus: f.inputEl.dom === document.activeElement, erreur: (f.getActiveErrors() || [])[0] || '', valeur: f.getValue() } : { ouvert: false }; });
  const ouvrir = async (g, id) => {
    const c = await crayon(g, id);
    await p.mouse.click(c.x, c.y);
    await p.waitForFunction(() => Ext.ComponentQuery.query('#champTelephone').some((x) => x.isVisible(true)), null, { timeout: 10000 });
    await p.waitForTimeout(250);
  };
  const taper = async (texte, touche) => {
    await p.keyboard.press('Control+A');
    await p.keyboard.type(texte, { delay: 25 });
    if (touche === 'Enter') {
      const r = p.waitForResponse((x) => /client-telephone$/.test(x.url().split('?')[0]) && x.request().method() === 'POST', { timeout: 30000 });
      await p.keyboard.press('Enter');
      const rep = await (await r).json().catch(() => ({}));
      await p.waitForTimeout(500);
      return rep;
    }
    await p.keyboard.press(touche);
    await p.waitForTimeout(500);
    return null;
  };
  const rechercher = async () => {
    const idRech = await p.evaluate(() => Ext.ComponentQuery.query('campagnes #onglet-INFO_CLIENTS #recherche')[0].inputEl.id);
    await p.click('#' + idRech);
    await p.keyboard.press('Control+A');
    await p.keyboard.type('ZZCRY', { delay: 20 });
    const r = p.waitForResponse((x) => /campagnes?\/population/.test(x.url()), { timeout: 30000 });
    await p.keyboard.press('Enter');
    const rep = await (await r).json().catch(() => ({}));
    await p.waitForTimeout(900);
    return rep;
  };
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'CAMPAGNES SMS / WHATSAPP', 'Campagnes');
    await p.waitForFunction(() => { const v = Ext.ComponentQuery.query('campagnes')[0]; return v && v.contexte; }, null, { timeout: 60000 });
    await p.click('.x-tab:has-text("Infos clients")'); await p.waitForTimeout(1200);
    const rep0 = await rechercher();
    ok('Recherche « ZZCRY » : les cinq clients de test', rep0.success && (rep0.data || []).length === 5, (rep0.data || []).map((x) => x.clientId).join(','));

    /* couleurs du crayon */
    const couleurs = {};
    for (const id of IDS) { const c = await crayon(G, id); couleurs[id] = c ? (c.rouge ? 'rouge' : 'bleu') : 'absent'; }
    ok('Crayon rouge pour un numéro absent ou invalide (A, B, E), bleu sinon (C, D)', couleurs[A] === 'rouge' && couleurs[B] === 'rouge' && couleurs[E] === 'rouge'
      && couleurs[C] === 'bleu' && couleurs[D] === 'bleu', JSON.stringify(couleurs));

    /* A : refus (doublon du meme type, numero invalide), puis enregistrement */
    await ouvrir(G, A);
    let ch = await champ();
    ok('Clic sur le crayon : la cellule devient un champ, curseur dedans, sans fenêtre', ch.ouvert && ch.focus && (await fenetres()) === 0, JSON.stringify(ch));
    let rep = await taper('0100980003', 'Enter');
    ch = await champ();
    ok('A : le numéro d\'un autre client standard est refusé, l\'erreur est sur le champ resté ouvert', rep.success === false && /même type/.test(rep.message) && ch.ouvert && ch.erreur === rep.message, JSON.stringify({ rep, ch }));
    rep = await taper('12', 'Enter');
    ch = await champ();
    ok('A : « 12 » est refusé (numéro invalide), erreur sur le champ', rep.success === false && /Numéro invalide/.test(rep.message) && ch.ouvert && ch.erreur === rep.message, JSON.stringify({ rep, ch }));
    ok('A : rien n\'est écrit après les refus', fiche(A, debut) === fiches0[0], fiche(A, debut));
    rep = await taper('01 00 98 00 01', 'Enter');
    ch = await champ();
    let l = await lignes(G);
    ok('A : Entrée enregistre, la cellule se referme, la ligne devient joignable', rep.success && !ch.ouvert && l[A].telephone === '0100980001' && l[A].joignable === true && l[A].motif === '',
      JSON.stringify({ rep, ch, ligne: l[A] }));
    ok('A (standard) : en base, téléphone ET adresse = 0100980001', fiche(A, debut) === '0100980001|0100980001|1', fiche(A, debut));
    ok('A : crayon redevenu bleu', !(await crayon(G, A)).rouge);

    /* B : Echap annule, puis le numero de C (autre type) est accepte */
    await ouvrir(G, B);
    await taper('0100980002', 'Escape');
    ch = await champ();
    ok('B : Échap referme la cellule sans rien écrire', !ch.ouvert && fiche(B, debut) === fiches0[1] && (await lignes(G))[B].telephone === '', JSON.stringify({ ch, base: fiche(B, debut) }));
    await ouvrir(G, B);
    rep = await taper('0100980003', 'Enter');
    l = await lignes(G);
    ok('B (assurance) : le numéro d\'un client standard est accepté (unicité par type)', rep.success && l[B].telephone === '0100980003' && l[B].joignable === true, JSON.stringify({ rep, ligne: l[B] }));
    ok('B (assurance) : en base, le téléphone seul (adresse inchangée)', fiche(B, debut) === '0100980003|~|1', fiche(B, debut));

    /* D : le numero que B vient de prendre est refuse (meme type) ; Echap */
    await ouvrir(G, D);
    rep = await taper('0100980003', 'Enter');
    ok('D (assurance) : le numéro de B est refusé (même type)', rep.success === false && /même type/.test(rep.message) && (await champ()).erreur === rep.message, JSON.stringify(rep));
    await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    ok('D : rien n\'est écrit', fiche(D, debut) === fiches0[3] && !(await champ()).ouvert, fiche(D, debut));

    /* tailles d'ecran : le crayon tient dans la cellule, le numero entier */
    for (const [lg, ht] of [[1366, 768], [1280, 720], [1920, 1080]]) {
      await p.setViewportSize({ width: lg, height: ht }); await p.waitForTimeout(800);
      const m = await crayon(G, A), m2 = await crayon(G, C);
      ok(`${lg}×${ht} : crayon dans sa cellule, numéro entier`, m && m.dedans && m.numeroEntier && m2 && m2.dedans && m2.numeroEntier, JSON.stringify({ m, m2 }));
    }
    await p.setViewportSize({ width: 1366, height: 768 }); await p.waitForTimeout(600);

    /* rapprochement : ecran = nouvelle recherche du serveur = base */
    const ecran = await lignes(G);
    const rep2 = await rechercher();
    const serveur = {}; (rep2.data || []).forEach((x) => { serveur[x.clientId] = { telephone: x.telephone, joignable: x.joignable, motif: x.motif }; });
    const base = {}; IDS.forEach((id) => { base[id] = q(`SELECT COALESCE(NULLIF(str_TELEPHONE, ''), str_ADRESSE, '') FROM t_client WHERE lg_CLIENT_ID = '${id}'`); });
    const ecarts = IDS.filter((id) => !ecran[id] || !serveur[id] || ecran[id].telephone !== serveur[id].telephone || ecran[id].joignable !== serveur[id].joignable
      || ecran[id].motif !== serveur[id].motif || (serveur[id].joignable && serveur[id].telephone !== base[id]));
    ok('Rapprochement : ligne de l\'écran = nouvelle recherche du serveur = base (cinq clients)', ecarts.length === 0, JSON.stringify({ ecarts, ecran, serveur, base }));

    /* Rappels, ciblage libre : E */
    const hub = (corps) => p.evaluate(`(() => { const h = Ext.ComponentQuery.query('rappelstraitement').filter((x) => x.isVisible(true))[0]; ${corps} })()`);
    await p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('campagnes #ongletRappels')[0].tab.getEl().dom.id));
    await p.waitForFunction(() => Ext.ComponentQuery.query('campagnes rappelstraitement').some((h) => h.isVisible(true)), null, { timeout: 30000 });
    await p.click('#' + await hub("return h.down('#rp-liste').getEl().dom.id;")); await p.waitForTimeout(600);
    await p.click('#' + await hub("return h.down('#rp-ciblage').getEl().dom.id;")); await p.waitForTimeout(900);
    await p.click('#' + await hub("return h.down('#cbReference').inputEl.id;"));
    await p.keyboard.type(CIP, { delay: 30 });
    await p.waitForSelector('.x-boundlist:visible .x-boundlist-item', { timeout: 20000 }); await p.waitForTimeout(400);
    await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter'); await p.waitForTimeout(400);
    const rc = p.waitForResponse((x) => /rappels-habitude\/ciblage$/.test(x.url().split('?')[0]) && x.request().method() === 'POST', { timeout: 60000 });
    await p.keyboard.press('Enter');
    await rc; await p.waitForTimeout(1200);
    const GR = 'rappelstraitement #cbResultats';
    const presents = await p.evaluate((s) => Ext.ComponentQuery.query(s).filter((g) => g.isVisible(true))[0].getStore().collect('clientId'), GR);
    ok('Rappels, ciblage libre : A et E parmi les clients ayant acheté', presents.includes(A) && presents.includes(E), presents.filter((x) => /E2E-CRY/.test(x)).join(','));
    const ce = await crayon(GR, E);
    ok('Rappels : crayon rouge pour E (sans numéro), bleu pour A', ce && ce.rouge && (await crayon(GR, A)) && !(await crayon(GR, A)).rouge, JSON.stringify(ce));
    await ouvrir(GR, E);
    rep = await taper('05 00 98 00 05', 'Enter');
    l = await lignes(GR);
    ok('Rappels : E enregistré par Entrée, ligne joignable', rep.success && l[E].telephone === '0500980005' && l[E].joignable === true && !(await champ()).ouvert, JSON.stringify({ rep, ligne: l[E] }));
    ok('Rappels : E (standard) en base, téléphone et adresse', fiche(E, debut) === '0500980005|0500980005|1', fiche(E, debut));

    /* bilan */
    const autres = q(`SELECT COUNT(*) FROM t_client WHERE dt_UPDATED >= '${debut}' AND lg_CLIENT_ID NOT IN ('${A}', '${B}', '${E}')`);
    ok('Bilan : seuls A, B et E sont modifiés ; C et D intacts', autres === '0' && fiche(C, debut) === fiches0[2] && fiche(D, debut) === fiches0[3], autres);
    ok('Bilan : aucune campagne, ligne, notification ni rappel écrit', traces() === traces0, traces0 + ' -> ' + traces());
    ok('Aucune erreur JavaScript, aucune fenêtre', erreurs.length === 0 && dialogues.length === 0 && (await fenetres()) === 0, erreurs.concat(dialogues).join(' | '));

    /* sans le droit : nouvelle connexion (les droits sont lus a la connexion) */
    exec(RETIRER);
    const p2 = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
    try {
      await connexion(p2, ENV_E2E.LOGIN, 'e2etest');
    } finally {
      exec(RENDRE);
    }
    const droit = await p2.evaluate(async () => JSON.parse(await (await fetch('../api/v1/client-telephone/droit')).text()));
    ok('Sans le droit : le service le dit', droit.success === true && droit.modifier === false, JSON.stringify(droit));
    const refus = await p2.evaluate(async (id) => JSON.parse(await (await fetch('../api/v1/client-telephone', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: id, telephone: '0100980009' }) })).text()), D);
    ok('Sans le droit : l\'enregistrement est refusé par le serveur, rien n\'est écrit', refus.success === false && /profil/.test(refus.message) && fiche(D, debut) === fiches0[3], refus.message);
    await ouvrirMenu(p2, 'CAMPAGNES SMS / WHATSAPP', 'Campagnes');
    await p2.waitForFunction(() => { const v = Ext.ComponentQuery.query('campagnes')[0]; return v && v.contexte; }, null, { timeout: 60000 });
    await p2.click('.x-tab:has-text("Infos clients")'); await p2.waitForTimeout(1200);
    await p2.click('#' + await p2.evaluate(() => Ext.ComponentQuery.query('campagnes #onglet-INFO_CLIENTS #recherche')[0].inputEl.id));
    await p2.keyboard.type('ZZCRY', { delay: 20 });
    await p2.keyboard.press('Enter'); await p2.waitForTimeout(2500);
    const sans = await p2.evaluate((s) => { const g = Ext.ComponentQuery.query(s)[0]; return { lignes: g.getStore().getCount(), crayons: g.getEl().dom.querySelectorAll('.crayon-tel').length }; }, G);
    ok('Sans le droit : aucun crayon dans la liste', sans.lignes === 5 && sans.crayons === 0, JSON.stringify(sans));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    exec(RENDRE);
    await b.close();
    nettoyer();
  }
  ok('Données de test retirées', q('SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID IN ' + clients) === '0');
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
