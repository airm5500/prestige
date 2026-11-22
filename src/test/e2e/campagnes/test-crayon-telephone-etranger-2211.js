/* CAMPAGNES : NUMERO ETRANGER SAISI PAR LE CRAYON (retour du 22/11 sur le point 8.3 du plan du 21/11).
 *
 * « je peux avoir un client avec un numero belge, francais ou autres ». Un numero precede de « + » ou de « 00 » et d'un
 * autre indicatif que celui de l'officine (225 par defaut) est accepte s'il compte 8 a 15 chiffres et garde sous la
 * forme « +32470123456 » ; un numero sans indicatif suit la regle ivoirienne d'avant.
 *
 * Jeu d'essai (clients de test ZZETR, accord WhatsApp donne) : F standard au numero invalide « 12345 » ; G assurance
 * sans numero ; H standard sans numero.
 * Par la vue Campagnes, onglet « Infos clients », au clavier et a la souris :
 *  - F : « 04 70 12 34 56 » (belge sans indicatif) est refuse, le message dit comment ecrire un numero etranger ;
 *    un numero etranger trop long est refuse ; « +32 470 12 34 56 » + Entree : la cellule se referme, la ligne devient
 *    joignable, le crayon redevient bleu ; en base telephone ET adresse = +32470123456 (client standard) ;
 *  - G : « 0033 6 12 34 56 78 » est accepte ; en base le telephone seul, +33612345678 ;
 *  - H : le numero belge de F est refuse (meme type, ecrit autrement : « 0032 470 12 34 56 ») ;
 *  - rapprochement : ligne de l'ecran = nouvelle recherche du serveur = base, pour les trois clients ;
 *  - bilan : seuls F et G sont modifies ; aucune campagne, ligne ni notification ; aucune fenetre.
 * Les noms des clients ne sont ni lus ni affiches.
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

const F = 'E2E-ETR-F', G_ = 'E2E-ETR-G', H = 'E2E-ETR-H';
const IDS = [F, G_, H];
const clients = "('" + IDS.join("','") + "')";
/* [id, nom, type, telephone] */
const JEU = [[F, 'ZZETRF', '6', '12345'], [G_, 'ZZETRG', '1', null], [H, 'ZZETRH', '6', null]];
const BE = '+32470123456', FR = '+33612345678';

const nettoyer = () => exec('DELETE FROM t_client WHERE lg_CLIENT_ID IN ' + clients + ';');
const fiche = (id, debut) => q(`SELECT CONCAT_WS('|', COALESCE(str_TELEPHONE, '~'), COALESCE(str_ADRESSE, '~'), dt_UPDATED >= '${debut}') FROM t_client WHERE lg_CLIENT_ID = '${id}'`);

(async () => {
  nettoyer();
  ok('Préalable : numéros étrangers d\'essai libres', q(`SELECT COUNT(*) FROM t_client WHERE str_TELEPHONE IN ('${BE}', '${FR}') OR str_ADRESSE IN ('${BE}', '${FR}')`) === '0');
  exec(JEU.map((x) => 'INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, str_TELEPHONE, str_ADRESSE, str_SEXE, lg_TYPE_CLIENT_ID, str_STATUT,'
    + ` dt_CREATED, dt_UPDATED, bool_CONSENT_WHATSAPP, bool_CONSENT_SMS) VALUES ('${x[0]}', '${x[1]}', 'ESSAI', ${x[3] ? "'" + x[3] + "'" : 'NULL'},`
    + ` NULL, 'F', '${x[2]}', 'enable', NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 1 DAY, 1, 1);`).join(''));
  const debut = q('SELECT NOW()');
  const traces = () => q("SELECT CONCAT((SELECT COUNT(*) FROM t_campagne), '/', (SELECT COUNT(*) FROM t_campagne_ligne), '/', (SELECT COUNT(*) FROM notification))");
  const traces0 = traces();
  const fiches0 = IDS.map((id) => fiche(id, debut));

  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const erreurs = [], dialogues = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  const GR = 'campagnes #onglet-INFO_CLIENTS #destinataires';
  const fenetres = () => p.evaluate(() => Ext.ComponentQuery.query('window').filter((w) => w.isVisible() && !w.isXType('messagebox') && !w.hasCls('x-tip')).length);
  const lignes = () => p.evaluate((s) => { const l = {}; Ext.ComponentQuery.query(s)[0].getStore().each((r) => { l[r.get('clientId')] = { telephone: r.get('telephone'), joignable: r.get('joignable'), motif: r.get('motif') }; }); return l; }, GR);
  const crayon = (id) => p.evaluate(([s, i]) => {
    const grid = Ext.ComponentQuery.query(s)[0], n = grid.getView().getNode(grid.getStore().findExact('clientId', i));
    const c = n && n.querySelector('.crayon-tel');
    if (!c) { return null; }
    const r = c.getBoundingClientRect(), num = n.querySelector('.crayon-tel-numero');
    return { rouge: c.classList.contains('crayon-tel-alerte'), x: r.x + r.width / 2, y: r.y + r.height / 2, numeroEntier: !num || num.scrollWidth <= num.clientWidth + 1 };
  }, [GR, id]);
  const champ = () => p.evaluate(() => { const f = Ext.ComponentQuery.query('#champTelephone').filter((x) => x.isVisible(true))[0];
    return f ? { ouvert: true, erreur: (f.getActiveErrors() || [])[0] || '' } : { ouvert: false }; });
  const ouvrir = async (id) => {
    const c = await crayon(id);
    await p.mouse.click(c.x, c.y);
    await p.waitForFunction(() => Ext.ComponentQuery.query('#champTelephone').some((x) => x.isVisible(true)), null, { timeout: 10000 });
    await p.waitForTimeout(250);
  };
  const taper = async (texte) => {
    await p.keyboard.press('Control+A');
    await p.keyboard.type(texte, { delay: 25 });
    const r = p.waitForResponse((x) => /client-telephone$/.test(x.url().split('?')[0]) && x.request().method() === 'POST', { timeout: 30000 });
    await p.keyboard.press('Enter');
    const rep = await (await r).json().catch(() => ({}));
    await p.waitForTimeout(500);
    return rep;
  };
  const rechercher = async () => {
    await p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('campagnes #onglet-INFO_CLIENTS #recherche')[0].inputEl.id));
    await p.keyboard.press('Control+A');
    await p.keyboard.type('ZZETR', { delay: 20 });
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
    ok('Recherche « ZZETR » : les trois clients de test', rep0.success && (rep0.data || []).length === 3, (rep0.data || []).map((x) => x.clientId).join(','));

    /* F : refus, puis numero belge */
    await ouvrir(F);
    let rep = await taper('04 70 12 34 56');
    let ch = await champ();
    ok('F : « 04 70 12 34 56 » (sans indicatif) refusé ; le message dit d\'écrire l\'indicatif, sur le champ resté ouvert',
      rep.success === false && /indicatif/.test(rep.message) && /\+33 6 12 34 56 78/.test(rep.message) && ch.ouvert && ch.erreur === rep.message, JSON.stringify({ rep, ch }));
    rep = await taper('+32 470 12 34 56 78 90 12');
    ch = await champ();
    ok('F : numéro étranger de 17 chiffres refusé (nombre de chiffres)', rep.success === false && /étranger/.test(rep.message) && ch.ouvert, JSON.stringify({ rep, ch }));
    ok('F : rien n\'est écrit après les refus', fiche(F, debut) === fiches0[0], fiche(F, debut));
    rep = await taper('+32 470 12 34 56');
    ch = await champ();
    let l = await lignes();
    ok('F : « +32 470 12 34 56 » + Entrée enregistre, la cellule se referme, la ligne devient joignable',
      rep.success && !ch.ouvert && l[F].telephone === BE && l[F].joignable === true && l[F].motif === '', JSON.stringify({ rep, ch, ligne: l[F] }));
    ok('F (standard) : en base, téléphone ET adresse = ' + BE, fiche(F, debut) === `${BE}|${BE}|1`, fiche(F, debut));
    const cf = await crayon(F);
    ok('F : crayon redevenu bleu, numéro entier dans la cellule', cf && !cf.rouge && cf.numeroEntier, JSON.stringify(cf));

    /* G : numero francais ecrit avec 00 */
    await ouvrir(G_);
    rep = await taper('0033 6 12 34 56 78');
    l = await lignes();
    ok('G (assurance) : « 0033 6 12 34 56 78 » accepté, gardé ' + FR + ', ligne joignable', rep.success && l[G_].telephone === FR && l[G_].joignable === true, JSON.stringify({ rep, ligne: l[G_] }));
    ok('G (assurance) : en base, le téléphone seul (adresse inchangée)', fiche(G_, debut) === `${FR}|~|1`, fiche(G_, debut));

    /* H : le numero de F, ecrit autrement, est refuse (meme type) */
    await ouvrir(H);
    rep = await taper('0032 470 12 34 56');
    ok('H (standard) : le numéro belge de F, écrit « 0032 … », est refusé (même type)', rep.success === false && /même type/.test(rep.message) && (await champ()).erreur === rep.message, JSON.stringify(rep));
    await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    ok('H : rien n\'est écrit', fiche(H, debut) === fiches0[2] && !(await champ()).ouvert, fiche(H, debut));

    /* rapprochement : ecran = nouvelle recherche du serveur = base */
    const ecran = await lignes();
    const rep2 = await rechercher();
    const serveur = {}; (rep2.data || []).forEach((x) => { serveur[x.clientId] = { telephone: x.telephone, joignable: x.joignable, motif: x.motif }; });
    const base = {}; IDS.forEach((id) => { base[id] = q(`SELECT COALESCE(NULLIF(str_TELEPHONE, ''), str_ADRESSE, '') FROM t_client WHERE lg_CLIENT_ID = '${id}'`); });
    const ecarts = IDS.filter((id) => !ecran[id] || !serveur[id] || ecran[id].telephone !== serveur[id].telephone || ecran[id].joignable !== serveur[id].joignable
      || ecran[id].motif !== serveur[id].motif || (serveur[id].joignable && serveur[id].telephone !== base[id]));
    ok('Rapprochement : ligne de l\'écran = nouvelle recherche du serveur = base (trois clients)', ecarts.length === 0
      && serveur[F].telephone === BE && serveur[G_].telephone === FR && serveur[H].joignable === false, JSON.stringify({ ecarts, ecran, serveur, base }));

    /* bilan */
    const autres = q(`SELECT COUNT(*) FROM t_client WHERE dt_UPDATED >= '${debut}' AND lg_CLIENT_ID NOT IN ('${F}', '${G_}')`);
    ok('Bilan : seuls F et G sont modifiés ; H intact', autres === '0' && fiche(H, debut) === fiches0[2], autres);
    ok('Bilan : aucune campagne, ligne ni notification écrite', traces() === traces0, traces0 + ' -> ' + traces());
    ok('Aucune erreur JavaScript, aucune fenêtre', erreurs.length === 0 && dialogues.length === 0 && (await fenetres()) === 0, erreurs.concat(dialogues).join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
    nettoyer();
  }
  ok('Données de test retirées', q('SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID IN ' + clients) === '0');
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
