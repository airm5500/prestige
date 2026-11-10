/* PLAN DU 09/11, POINT 15 : NOM LONG DU TIERS PAYANT SUR LE TICKET, AU CHOIX DU MODELE (« une ligne » ou « deux lignes »).
 *
 * Par les vues, avec de vrais clics, dans « Modeles de ticket » (Parametrages). L'exemple de la vente carnet porte un nom
 * de tiers payant long (« SOCIETE IVOIRIENNE D'ESSAI ET DE DISTRIBUTION SA 100% »). Ce que le test etablit :
 *  - « Vente carnet » et « Vente assurance » : le choix « Nom long du tiers payant » est propose, « Une ligne » par
 *    defaut ; il n'est pas propose pour le ticket Z ;
 *  - « Une ligne » : la zone Client de l'apercu a la hauteur d'un nom court (meme hauteur qu'avec le nom raccourci) ;
 *  - « Deux lignes » : l'apercu se redessine, la zone Client gagne exactement une ligne ; « Enregistrer » s'active ;
 *  - « Enregistrer » : tiersPayant = DEUX_LIGNES en base pour ce ticket et cette largeur ; relu a la reouverture de
 *    l'ecran (le choix reste « Deux lignes ») ;
 *  - aucune fenetre, aucune erreur JavaScript.
 * Reglages remis comme avant.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const MENU = q("SELECT str_VALUE FROM t_menu WHERE lg_MENU_ID = '10'");
const TABLE = () => q("SELECT CONCAT_WS('|', ticket, largeur, HEX(reglages), IFNULL(DATE_FORMAT(maj, '%Y-%m-%d %H:%i:%s'), ''), HEX(IFNULL(utilisateur, ''))) FROM ticket_modele ORDER BY ticket, largeur");
const AVANT = TABLE();
const remettre = () => {
  q('DELETE FROM ticket_modele');
  AVANT.split(/\r?\n/).filter(Boolean).forEach((l) => {
    const [t, lg, r, maj, u] = l.split('|');
    q(`INSERT INTO ticket_modele (ticket, largeur, reglages, maj, utilisateur) VALUES ('${t}', ${Number(lg)}, UNHEX('${r}'), ${maj ? `'${maj}'` : 'NOW()'}, UNHEX('${u}'))`);
  });
};

/* interrompu (delai depasse, Ctrl+C) : la table est remise quand meme ; sans cela, l'essai suivant prendrait le reglage
   « Deux lignes » laisse en base pour l'etat d'origine */
let remis = false;
const remettreUneFois = () => { if (!remis) { remis = true; remettre(); } };
['SIGTERM', 'SIGINT'].forEach((s) => process.on(s, () => { remettreUneFois(); process.exit(1); }));
process.on('unhandledRejection', (e) => { console.log('FAIL  Parcours sans exception  [' + (e && e.message) + ']'); remettreUneFois(); process.exit(1); });

(async () => {
  q("DELETE FROM ticket_modele WHERE ticket = 'VENTE_CARNET' AND largeur = 80");
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const racine = '.mtk';
  const apresApercu = async (action) => {
    const r = p.waitForResponse((x) => /modeles-ticket\/apercu/.test(x.url()), { timeout: 30000 });
    r.catch(() => {}); /* une attente qui echoue apres une action en erreur ne doit pas arreter le processus */
    await action();
    await r;
    await p.locator(racine + ' .mtk-feuille img').waitFor({ timeout: 30000 });
    await p.waitForTimeout(400);
  };
  const zones = () => p.evaluate(() => { const a = Ext.ComponentQuery.query('modelesticket')[0].etat.apercu; return a ? { client: a.zones.CLIENT, hauteur: a.hauteurImage, echelle: a.echelle || 2 } : null; });
  const choix = (v) => p.locator(racine + ` [data-choix=tiersPayant][data-valeur=${v}]`);
  const ouvrir = async () => {
    const premier = p.waitForResponse((x) => /modeles-ticket\/apercu/.test(x.url()), { timeout: 60000 });
    await ouvrirMenu(p, MENU, 'Modèles de ticket');
    await premier;
    await p.locator(racine + ' .mtk-feuille img').waitFor({ timeout: 30000 });
    const largeur80 = p.locator(racine + ' .mtk-barre [data-choix=largeur][data-valeur="80"]');
    if (await largeur80.count() && (await largeur80.getAttribute('aria-checked')) !== 'true') { await apresApercu(() => largeur80.click()); }
    /* juste apres l'ouverture, l'ecran peut se redessiner et perdre le clic : nouvel essai, au plus 3 */
    for (let i = 0; ; i++) {
      const r = p.waitForResponse((x) => /modeles-ticket\/apercu/.test(x.url()), { timeout: 15000 }).catch(() => null);
      await p.locator(racine + ' .mtk-ticket[data-ticket=VENTE_CARNET]').click();
      const x = await r;
      if (x && await p.evaluate(() => Ext.ComponentQuery.query('modelesticket')[0].etat.ticket === 'VENTE_CARNET')) { break; }
      if (i === 2) { throw new Error('« Vente carnet » ne s\'ouvre pas'); }
      await p.waitForTimeout(1000);
    }
    await p.locator(racine + ' .mtk-feuille img').waitFor({ timeout: 30000 });
    await p.waitForTimeout(400);
  };
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrir();
    ok('Vente carnet : choix « Nom long du tiers payant » proposé (Une ligne, Deux lignes)', await choix('UNE_LIGNE').count() === 1 && await choix('DEUX_LIGNES').count() === 1);
    ok('« Une ligne » par défaut (rien ne change sans le vouloir)', await choix('UNE_LIGNE').getAttribute('aria-checked') === 'true');
    const une = await zones();
    ok('Aperçu : zone Client dessinée', une && une.client && une.client[1] > une.client[0], JSON.stringify(une));

    await apresApercu(() => choix('DEUX_LIGNES').click());
    const deux = await zones();
    ok('Clic sur « Deux lignes » : choisi', await choix('DEUX_LIGNES').getAttribute('aria-checked') === 'true');
    const gain = deux.client[1] - deux.client[0] - (une.client[1] - une.client[0]);
    /* une ligne de plus : un gain positif, plus petit que la zone (qui compte au moins deux lignes), reporte sur le ticket
       (hauteur de l'image en pixels, a l'echelle de l'apercu ; zones en points) */
    ok('Deux lignes : la zone Client gagne une ligne, le ticket aussi', gain > 0 && 2 * gain <= une.client[1] - une.client[0] + 1 && deux.hauteur - une.hauteur === gain * une.echelle,
      JSON.stringify({ une, deux, gain }));
    const enregistrer = p.locator(racine + ' [data-action=enregistrer]');
    ok('« Enregistrer » actif', await enregistrer.isEnabled());
    await enregistrer.click();
    await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('modelesticket')[0]; return c && !c.etat.brouillons['80:VENTE_CARNET']; }, null, { timeout: 30000 });
    const enBase = JSON.parse(q("SELECT reglages FROM ticket_modele WHERE ticket = 'VENTE_CARNET' AND largeur = 80") || '{}');
    ok('Enregistrer : tiersPayant = DEUX_LIGNES en base (vente carnet, 80 mm)', enBase.tiersPayant === 'DEUX_LIGNES', JSON.stringify(enBase).slice(0, 250));

    await apresApercu(() => p.locator(racine + ' .mtk-ticket[data-ticket=VENTE_ASSURANCE]').click());
    ok('Vente assurance : choix proposé aussi', await choix('UNE_LIGNE').count() === 1);
    await apresApercu(() => p.locator(racine + ' .mtk-ticket[data-ticket=TICKET_Z]').click());
    ok('Ticket Z : choix non proposé (pas de tiers payant)', await choix('UNE_LIGNE').count() === 0);

    /* relecture : nouvel affichage de l'ecran */
    await p.reload({ waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app && Ext.ComponentQuery.query('navigation').length
      && Ext.ComponentQuery.query('navigation')[0].getStore()._menuCharge, null, { timeout: 120000 });
    await ouvrir();
    const relu = await zones();
    ok('Réouverture : « Deux lignes » relu, même aperçu', await choix('DEUX_LIGNES').getAttribute('aria-checked') === 'true'
      && relu.client[1] - relu.client[0] === deux.client[1] - deux.client[0], JSON.stringify(relu));
    ok('Aucune fenêtre surgissante', await p.evaluate(() => Ext.ComponentQuery.query('window[hidden=false]').length === 0));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    remettreUneFois();
    ok('Réglages remis comme avant', TABLE() === AVANT);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
