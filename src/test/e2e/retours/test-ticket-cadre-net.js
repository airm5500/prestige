/* RETOUR DU 03/11 SUR LE TICKET DE VENTE A CREDIT : « avons-nous la possibilite de retirer le cadre du net a payer sur
 * les tickets dans les modeles de tickets ? »
 *
 * Par les vues, avec de vrais clics, dans le menu « Modeles de ticket » (Parametrages). Ce que le test etablit :
 *  - « Vente assurance » (80 mm) : l'option « Cadre autour du net a payer » existe et est active par defaut ;
 *  - l'apercu dessine le cadre : des traits horizontaux sur toute la largeur de la zone « Net a payer » ;
 *  - un clic sur l'option : l'apercu se redessine sans cadre (plus aucun trait), le net reste affiche, la zone
 *    est moins haute, « Enregistrer » s'active ;
 *  - « Enregistrer » : cadreNet = false en base pour ce ticket et cette largeur ;
 *  - l'option est aussi proposee pour le ticket Z (son « total especes » est encadre) ;
 *  - aucune erreur JavaScript.
 * Reglages remis comme avant.
 *
 * node retours/test-ticket-cadre-net.js
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
/* retour du 05/11 : l'enregistrement reporte les reglages communs (police, marge, en-tete, pied) sur tous les tickets :
   toute la table est mise de cote et remise a la fin */
const AVANT = TABLE();
const remettre = () => {
  q('DELETE FROM ticket_modele');
  AVANT.split('\n').filter(Boolean).forEach((l) => {
    const [t, lg, r, maj, u] = l.split('|');
    q(`INSERT INTO ticket_modele (ticket, largeur, reglages, maj, utilisateur) VALUES ('${t}', ${Number(lg)}, UNHEX('${r}'), ${maj ? `'${maj}'` : 'NOW()'}, UNHEX('${u}'))`);
  });
};

(async () => {
  /* depart des reglages par defaut : ceux du poste (personnalises) sont mis de cote et remis a la fin */
  q("DELETE FROM ticket_modele WHERE ticket = 'VENTE_ASSURANCE' AND largeur = 80");
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const racine = '.mtk';
  const apresApercu = async (action) => {
    const r = p.waitForResponse((x) => /modeles-ticket\/apercu/.test(x.url()), { timeout: 30000 });
    await action();
    await r;
    await p.locator(racine + ' .mtk-feuille img').waitFor({ timeout: 30000 });
    await p.waitForTimeout(400);
  };
  /* lit l'apercu affiche : zone « Net a payer » et nombre de traits horizontaux qui la traversent (haut et bas du
   * cadre) : une rangee de pixels sombre sur plus de 90 % de la largeur imprimable ; un texte n'en donne jamais */
  const lireNet = () => p.evaluate(async () => {
    const c = Ext.ComponentQuery.query('modelesticket')[0];
    const a = c.etat.apercu;
    const img = document.querySelector('.mtk .mtk-feuille img');
    if (!a || !img || !a.zones.NET) { return null; }
    await (img.decode ? img.decode() : Promise.resolve());
    const cv = document.createElement('canvas');
    cv.width = img.naturalWidth; cv.height = img.naturalHeight;
    const g = cv.getContext('2d');
    g.drawImage(img, 0, 0);
    const e = a.echelle || 2;
    const [y0, y1] = a.zones.NET;
    const x0 = Math.round(8 * e);
    const l = cv.width - 2 * x0;
    let traits = 0;
    for (let y = Math.max(0, Math.round(y0 * e) - 2); y < Math.min(cv.height, Math.round(y1 * e) + 2); y++) {
      const d = g.getImageData(x0, y, l, 1).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) { if (d[i] < 128) { n++; } }
      if (n > 0.9 * l) { traits++; }
    }
    return { hauteurZone: y1 - y0, traits, hauteur: a.hauteurImage };
  });
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const premier = p.waitForResponse((x) => /modeles-ticket\/apercu/.test(x.url()), { timeout: 60000 });
    await ouvrirMenu(p, MENU, 'Modèles de ticket');
    await premier;
    await p.locator(racine + ' .mtk-feuille img').waitFor({ timeout: 30000 });
    const largeur80 = p.locator(racine + ' .mtk-barre [data-choix=largeur][data-valeur="80"]');
    if (await largeur80.count()) {
      const actif = /mtk-on|actif|pressed/.test((await largeur80.getAttribute('class')) || '') || await largeur80.getAttribute('aria-pressed') === 'true';
      if (!actif) { await apresApercu(() => largeur80.click()); }
    }
    await apresApercu(() => p.locator(racine + ' .mtk-ticket[data-ticket=VENTE_ASSURANCE]').click());
    const cadre = p.locator(racine + ' [data-option=cadreNet]');
    ok('Vente assurance : option « Cadre autour du net à payer » proposée', await cadre.count() === 1);
    ok('Option active par défaut (rien ne change sans le vouloir)', await cadre.getAttribute('aria-checked') === 'true');
    const avec = await lireNet();
    ok('Aperçu : le net à payer est encadré (traits du haut et du bas)', avec && avec.traits >= 2, JSON.stringify(avec));

    await apresApercu(() => cadre.click());
    const sans = await lireNet();
    ok('Clic sur l\'option : elle passe à « non »', await cadre.getAttribute('aria-checked') === 'false');
    ok('Aperçu redessiné sans cadre (plus aucun trait)', sans && sans.traits === 0, JSON.stringify(sans));
    ok('Le net à payer reste affiché, dans une zone moins haute', sans && avec && sans.hauteurZone > 0 && sans.hauteurZone < avec.hauteurZone,
      avec && sans && avec.hauteurZone + ' → ' + sans.hauteurZone);
    const enregistrer = p.locator(racine + ' [data-action=enregistrer]');
    ok('« Enregistrer » actif', await enregistrer.isEnabled());
    await enregistrer.click();
    await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('modelesticket')[0]; return c && !c.etat.brouillons['80:VENTE_ASSURANCE']; }, null, { timeout: 30000 });
    const enBase = JSON.parse(q("SELECT reglages FROM ticket_modele WHERE ticket = 'VENTE_ASSURANCE' AND largeur = 80") || '{}');
    ok('Enregistrer : cadreNet = false en base (vente assurance, 80 mm)', enBase.cadreNet === false, JSON.stringify(enBase).slice(0, 250));

    await apresApercu(() => p.locator(racine + ' .mtk-ticket[data-ticket=TICKET_Z]').click());
    ok('Ticket Z : option proposée aussi', await p.locator(racine + ' [data-option=cadreNet]').count() === 1);
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    remettre();
    ok('Réglages remis comme avant', TABLE() === AVANT);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
