/* RETOUR DU 10/11 : TROP DE BLANC A GAUCHE DU TICKET (STAR TSP100).
 *
 * Reglage « Début d'impression » de l'ecran « Modèles de ticket », par les vues, avec de vrais clics (1366 × 768).
 * Ce que le test etablit :
 *  - ergonomie : le reglage est visible sans defilement, sous « Marge du rouleau », valeur lisible (« 0 mm ») ;
 *  - « − » descend par demi-millimetre jusqu'a −3 mm, puis se grise ; « + » remonte ; aucune fenetre ;
 *  - « Enregistrer » ecrit la valeur en base pour ce ticket et la reporte sur tous les tickets de la meme largeur
 *    (rapprochement : valeur affichee sur chaque ticket = base, ticket par ticket) ;
 *  - la marge du rouleau et l'autre largeur (58 mm) ne bougent pas (bilan avant / apres : ni plus ni moins) ;
 *  - « Exporter » contient le reglage ;
 *  - aucune erreur JavaScript.
 * Toute la table des reglages est remise comme avant.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const fs = require('fs');
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
  AVANT.split(/\r?\n/).map((x) => x.trim()).filter(Boolean).forEach((l) => {
    const [t, lg, r, maj, u] = l.split('|');
    q(`INSERT INTO ticket_modele (ticket, largeur, reglages, maj, utilisateur) VALUES ('${t}', ${Number(lg)}, UNHEX('${r}'), ${maj ? `'${maj}'` : 'NOW()'}, UNHEX('${u}'))`);
  });
};
const enBase = (t, l) => JSON.parse(q(`SELECT reglages FROM ticket_modele WHERE ticket = '${t}' AND largeur = ${l}`) || '{}');
/* empreinte d'un reglage sans le debut ni la date : le reste ne doit pas bouger */
const sansDebut = (j) => { const c = Object.assign({}, j); delete c.debut; return JSON.stringify(c); };

(async () => {
  /* depart connu : 80 mm aux valeurs par defaut, 58 mm comme en base */
  q('DELETE FROM ticket_modele WHERE largeur = 80');
  const avant58 = q("SELECT CONCAT_WS('|', ticket, HEX(reglages)) FROM ticket_modele WHERE largeur = 58 ORDER BY ticket");
  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const R = '.mtk';
  const fenetres = () => p.evaluate(() => Ext.ComponentQuery.query('window').some((w) => w.isVisible()));
  const apresApercu = async (action) => {
    const r = p.waitForResponse((x) => /modeles-ticket\/apercu/.test(x.url()), { timeout: 30000 });
    await action(); await r;
    await p.locator(R + ' .mtk-feuille img').waitFor({ timeout: 30000 });
    await p.waitForTimeout(300);
  };
  const valeur = async () => (await p.locator(R + ' [data-valeur-debut]').innerText()).trim();
  const moins = () => p.locator(R + ' [data-debut="-1"]');
  const plus = () => p.locator(R + ' [data-debut="1"]');
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const premier = p.waitForResponse((x) => /modeles-ticket\/apercu/.test(x.url()), { timeout: 60000 });
    await ouvrirMenu(p, MENU, 'Modèles de ticket');
    await premier;
    await p.locator(R + ' .mtk-feuille img').waitFor({ timeout: 30000 });
    const l80 = p.locator(R + ' .mtk-barre [data-choix=largeur][data-valeur="80"]');
    if (await l80.getAttribute('aria-checked') !== 'true') { await apresApercu(() => l80.click()); }
    await apresApercu(() => p.locator(R + ' .mtk-ticket[data-ticket=VENTE]').click());

    /* ergonomie */
    const champ = await p.evaluate(() => {
      const v = document.querySelector('.mtk [data-valeur-debut]');
      if (!v) { return null; }
      const c = v.closest('.mtk-champ'), r = c.getBoundingClientRect(), libelles = Array.from(document.querySelectorAll('.mtk .mtk-champ > span:first-child')).map((s) => s.firstChild.textContent.trim());
      return { libelle: c.querySelector('span').firstChild.textContent.trim(), aide: c.querySelector('small').textContent,
        visible: r.top >= 0 && r.bottom <= window.innerHeight, rang: libelles.indexOf('Début d\'impression') - libelles.indexOf('Marge du rouleau'),
        coupe: Array.from(c.querySelectorAll('button,span')).some((x) => x.scrollWidth > x.clientWidth + 1) };
    });
    ok('Réglage « Début d\'impression » présent, juste sous « Marge du rouleau », visible sans défiler, rien de coupé',
      champ && champ.libelle === 'Début d\'impression' && champ.rang === 1 && champ.visible && !champ.coupe, JSON.stringify(champ));
    ok('Aide : − rapproche du bord gauche, largeur inchangée, commun', champ && /rapproche/.test(champ.aide) && /largeur ne change pas/.test(champ.aide) && /commun/.test(champ.aide), champ && champ.aide);
    ok('Valeur par défaut : 0 mm', await valeur() === '0 mm', await valeur());
    ok('« Enregistrer » inactif tant que rien ne change', !(await p.locator(R + ' [data-action=enregistrer]').isEnabled()));

    /* − par demi-millimetre jusqu'a −3 mm */
    const vus = [];
    for (let i = 0; i < 6; i++) { await apresApercu(() => moins().click()); vus.push(await valeur()); }
    ok('« − » descend par demi-millimetre : −0,5 … −3 mm', vus.join(' ') === '−0,5 mm −1 mm −1,5 mm −2 mm −2,5 mm −3 mm', vus.join(' '));
    ok('À −3 mm, « − » est grisé, « + » reste actif', await moins().isDisabled() && await plus().isEnabled());
    ok('Aucune fenêtre', !(await fenetres()));
    const bloquants = await p.evaluate(() => Ext.ComponentQuery.query('modelesticket')[0].etat.apercu.bloquants);
    ok('Aucun problème bloquant à −3 mm', bloquants.length === 0, bloquants.join(' | '));

    /* enregistrement et report sur tous les tickets de 80 mm */
    const enr = p.locator(R + ' [data-action=enregistrer]');
    ok('« Enregistrer » actif', await enr.isEnabled());
    let charge = p.waitForResponse((x) => /modeles-ticket\?/.test(x.url()) && x.request().method() === 'GET', { timeout: 30000 });
    const rep = p.waitForResponse((x) => /modeles-ticket/.test(x.url()) && x.request().method() === 'PUT', { timeout: 30000 });
    await enr.click();
    const msg = JSON.parse(await (await rep).text()).msg;
    await charge; await p.waitForTimeout(600);
    ok('Message : enregistré et reporté sur les autres tickets', /enregistré/.test(msg) && /reportés sur 10 autres tickets/.test(msg), msg);
    const tickets = q('SELECT DISTINCT ticket FROM ticket_modele WHERE largeur = 80 ORDER BY ticket').split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
    const bases = tickets.map((t) => [t, enBase(t, 80).debut]);
    ok('Base : −3 sur les 11 tickets de 80 mm', bases.length === 11 && bases.every(([, d]) => d === -3), JSON.stringify(bases));

    /* rapprochement ecran = base, ticket par ticket */
    const ecarts = [];
    for (const t of tickets) {
      await apresApercu(() => p.locator(R + ` .mtk-ticket[data-ticket=${t}]`).click());
      const affiche = await valeur(), attendu = enBase(t, 80).debut;
      const lu = Number(affiche.replace('−', '-').replace(',', '.').replace(' mm', ''));
      if (lu !== attendu) { ecarts.push(t + ' ' + affiche + ' / ' + attendu); }
    }
    ok('Rapprochement : valeur affichée = base, sur chacun des 11 tickets', ecarts.length === 0, ecarts.join(' ; '));

    /* « + » remonte : −2 mm, enregistre ; la marge ne bouge pas */
    await apresApercu(() => p.locator(R + ' .mtk-ticket[data-ticket=TICKET_Z]').click());
    await apresApercu(() => plus().click());
    await apresApercu(() => plus().click());
    ok('« + » remonte : −2 mm', await valeur() === '−2 mm', await valeur());
    const avantZ = enBase('VENTE', 80);
    charge = p.waitForResponse((x) => /modeles-ticket\?/.test(x.url()) && x.request().method() === 'GET', { timeout: 30000 });
    await p.locator(R + ' [data-action=enregistrer]').click();
    await charge; await p.waitForTimeout(600);
    const apres = tickets.map((t) => enBase(t, 80));
    ok('Base : −2 sur les 11 tickets, marge du rouleau toujours à 0', apres.every((j) => j.debut === -2 && j.marge === 0), JSON.stringify(apres.map((j) => [j.ticket, j.debut, j.marge])));
    ok('Bilan : sur la vente, seul le début a changé', sansDebut(enBase('VENTE', 80)) === sansDebut(avantZ));
    const apres58 = q("SELECT CONCAT_WS('|', ticket, HEX(reglages)) FROM ticket_modele WHERE largeur = 58 ORDER BY ticket");
    ok('Bilan : les tickets de 58 mm sont inchangés', apres58 === avant58);

    /* export */
    const tel = p.waitForEvent('download', { timeout: 30000 });
    await p.locator(R + ' [data-action=exporter]').click();
    const fichier = await (await tel).path();
    const exporte = JSON.parse(fs.readFileSync(fichier, 'utf8'));
    ok('Exporter : le début d\'impression est dans le fichier (80 mm : −2, 58 mm : 0)',
      exporte.largeurs['80'].VENTE.debut === -2 && (exporte.largeurs['58'].VENTE.debut || 0) === 0, JSON.stringify([exporte.largeurs['80'].VENTE.debut, exporte.largeurs['58'].VENTE.debut]));

    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Déroulé sans erreur', false, e.message);
  } finally {
    await b.close();
    remettre();
    const apresRemise = TABLE();
    ok('Réglages remis comme avant', apresRemise === AVANT, (AVANT.split(/\r?\n/).filter(Boolean).length) + ' ligne(s)');
    console.log(res.filter((x) => x.c).length + '/' + res.length + ' OK');
  }
})();
