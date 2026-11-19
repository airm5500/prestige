/* REFUS HTTP 400 GARDES AVEC LEUR DETAIL (retour support du 18/11, R6).
 *
 * Serveur d'appaul, 16/11 09:12 → 17:45 : 24 « Échec Ajax HTTP 400 » sur produit-search/fiche (Fiche article), sans
 * aucun detail (stack_extrait vide dans la copie de la base) : la reponse etait VIDE. Les refus de Prestige ont tous
 * un message ; une reponse vide vient de Payara, avant l'application (requete trop longue ou mal formee). L'evenement
 * garde maintenant la forme de la requete : methode, longueur de l'adresse, nom et longueur de chaque parametre, sans
 * les valeurs.
 *
 * Par les clics (admin), menu de la Fiche article, champ de recherche, touche Entree :
 *  1. recherche de 9 000 caracteres : Payara refuse (400, reponse vide) ; l'evenement du Centre de support dit
 *     « Réponse vide », la longueur de l'adresse (= celle envoyee par le navigateur) et search_value (9000 car.),
 *     sans la valeur tapee ;
 *  2. recherche avec un emoji : Prestige refuse avec son message (400) ; l'evenement garde ce message, pas la forme ;
 *  bilan : deux evenements, ni plus ni moins, retires a la fin avec leurs fichiers de detail ; aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu } = require('../outils/vues');
const { execFileSync } = require('child_process');
const fs = require('fs');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '--raw', '-e', s], { encoding: 'utf8' }).replace(/\r?\n$/, '');
const debut = q('SELECT NOW()');
const MOTIF = 'E2ERSIX';
const LONGUE = (MOTIF + 'x').repeat(1125); // 9 000 caracteres
const evenements = () => q(`SELECT IFNULL(GROUP_CONCAT(id), '') FROM t_application_event WHERE created_at >= '${debut}' AND url_ou_ecran LIKE '%produit-search/fiche%' AND message_court LIKE '%HTTP 400%'`);
const retirer = () => {
  const ids = evenements().split(',').filter(Boolean);
  for (const id of ids) {
    const f = q(`SELECT IFNULL(log_ref, '') FROM t_application_event WHERE id = '${id}'`);
    if (f && fs.existsSync(f)) { fs.unlinkSync(f); }
    q(`DELETE FROM t_application_event WHERE id = '${id}'`);
  }
  return ids.length;
};

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
  const err = [], envois = [];
  p.on('pageerror', (e) => err.push(String(e.message)));
  p.on('response', (r) => { if (r.url().includes('produit-search/fiche') && r.status() === 400) { envois.push(r.url()); } });
  const rechercher = async (texte) => {
    const rep = p.waitForResponse((r) => r.url().includes('produit-search/fiche') && r.url().includes('search_value=') && r.status() === 400, { timeout: 30000 });
    const champ = p.locator('#rechecher-inputEl');
    await champ.click(); await champ.fill(texte); await champ.press('Enter');
    const r = await rep;
    let corps = ''; try { corps = await r.text(); } catch (e) { corps = ''; }
    return { corps, adresse: r.url() };
  };
  const evenement = async (avant) => {
    for (let i = 0; i < 40; i++) {
      const ids = evenements().split(',').filter(Boolean).filter((x) => avant.indexOf(x) < 0);
      if (ids.length) { return { id: ids[0], stack: q(`SELECT IFNULL(stack_extrait, '') FROM t_application_event WHERE id = '${ids[0]}'`) }; }
      await p.waitForTimeout(500);
    }
    return null;
  };
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const menu = await p.evaluate(() => { let t = null; Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().cascadeBy((n) => { if (n.get('id') === 'famillemanager') { t = [n.parentNode.get('text'), n.get('text')]; } }); return t; });
    ok('Menu de la Fiche article trouvé', !!menu, JSON.stringify(menu));
    await ouvrirMenu(p, menu[0], menu[1]);
    await p.waitForFunction(() => Ext.ComponentQuery.query('famillemanager').some((x) => x.isVisible(true)) && Ext.getCmp('rechecher'), null, { timeout: 60000 });
    await p.waitForTimeout(1500);

    /* 1. recherche trop longue : reponse vide de Payara */
    let r = await rechercher(LONGUE);
    ok('Recherche de 9 000 caractères : 400 à réponse vide (refus de Payara)', r.corps === '', r.corps.slice(0, 100));
    let e = await evenement([]);
    ok('Un événement est créé', !!e);
    const s = e ? e.stack : '';
    ok('L\'événement dit « Réponse vide » et nomme search_value avec sa longueur', /Réponse vide/.test(s) && /search_value \(9000 car\.\)/.test(s), s.slice(0, 300));
    const lg = (s.match(/adresse complète : (\d+) car\./) || [])[1];
    const envoyee = r.adresse.replace(/^https?:\/\/[^/]+\/prestige\/api/, '../api');
    ok('Rapprochement : longueur de l\'adresse dans l\'événement = adresse envoyée par le navigateur (± 30 car.)', lg && Math.abs(Number(lg) - envoyee.length) <= 30, lg + ' / ' + envoyee.length);
    ok('La valeur tapée n\'est pas gardée', s.indexOf(MOTIF) < 0);
    const premier = e ? e.id : '';

    /* 2. emoji : refus de Prestige, avec son message */
    r = await rechercher('doli\u{1F600}');
    ok('Recherche avec un émoji : 400 avec le message de Prestige', /émojis/.test(r.corps), r.corps.slice(0, 120));
    e = await evenement([premier]);
    ok('L\'événement garde le message de Prestige, pas la forme de la requête', e && /émojis/.test(e.stack) && !/Réponse vide/.test(e.stack), e && e.stack.slice(0, 200));

    await p.waitForTimeout(3000);
    ok('Bilan : un événement par refus reçu par le navigateur, ni plus ni moins', evenements().split(',').filter(Boolean).length === envois.length && envois.length >= 2,
      evenements().split(',').filter(Boolean).length + ' événement(s) / ' + envois.length + ' refus');
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Déroulé sans exception', false, x.stack || x);
  } finally {
    await b.close();
    retirer();
    ok('Événements d\'essai retirés', evenements() === '');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
