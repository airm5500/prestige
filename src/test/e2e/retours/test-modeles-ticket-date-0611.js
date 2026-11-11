/* PLAN DU 06/11, POINT 1 : LA DATE RESTE A COTE DU CODE-BARRES, AVEC SA PROPRE TAILLE.
 *
 * Retour de l'utilisateur : « j'ai demande a dissocier le code-barres de la date et l'heure, pas de le renvoyer dans
 * la zone du haut ; le ramener a sa place mais qu'on puisse agrandir la taille ». Le 06/11, la date etait devenue un
 * bloc a part, au-dessus du trait du pied ; elle revient a cote du code-barres, et seule sa taille se regle a part.
 *
 * Ecran « Modèles de ticket », par les vues, avec de vrais clics (1366 × 768). Ce que le test etablit :
 *  - l'apercu n'a plus de bloc « Date du ticket » : la date est dans le pied, le code-barres reste le dernier ;
 *  - un clic sur le pied montre « Code-barres et date » avec deux reglages : « Taille du code-barres » et « Taille de
 *    la date » ;
 *  - « + » deux fois sur la date : la date grandit, le code-barres garde sa taille ;
 *  - « + » deux fois sur le code-barres : il grandit, la date garde sa taille ;
 *  - « Enregistrer » ecrit les deux tailles en base, et les reporte sur les autres tickets (reglages communs) ;
 *  - rapprochement : la date imprimee a cote du code-barres sur le ticket d'une vente (apercu, rien n'est imprime) = la
 *    date de la vente en base, et il n'y a pas de bloc date ailleurs sur le ticket ;
 *  - aucune fenetre, aucune erreur JavaScript.
 * Toute la table des reglages est remise comme avant.
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
const enBase = (t, l) => JSON.parse(q(`SELECT reglages FROM ticket_modele WHERE ticket = '${t}' AND largeur = ${l}`) || '{}');
const bloc = (r, id) => ((r.disposition || []).find((d) => d.bloc === id)) || {};
const TABLE = () => q("SELECT CONCAT_WS('|', ticket, largeur, HEX(reglages), DATE_FORMAT(maj, '%Y-%m-%d %H:%i:%s'), IFNULL(HEX(utilisateur), 'NULL')) FROM ticket_modele ORDER BY ticket, largeur");
const AVANT = TABLE();
/* copie de secours sur disque avant toute ecriture : si le processus meurt, la table se remet a la main depuis ce fichier */
const SECOURS = require('path').join(require('os').tmpdir(), 'ticket_modele_avant_' + process.pid + '.txt');
require('fs').writeFileSync(SECOURS, AVANT);
const remettre = () => {
  q('DELETE FROM ticket_modele');
  AVANT.split(/\r?\n/).filter(Boolean).forEach((l) => {
    const [t, lg, r, maj, u] = l.split('|');
    q(`INSERT INTO ticket_modele (ticket, largeur, reglages, maj, utilisateur) VALUES ('${t}', ${Number(lg)}, UNHEX('${r}'), '${maj}', ${u === 'NULL' ? 'NULL' : `UNHEX('${u}')`})`);
  });
};

(async () => {
  q('DELETE FROM ticket_modele WHERE largeur = 80');
  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const fenetres = () => p.evaluate(() => Ext.ComponentQuery.query('window').some((w) => w.isVisible()));
  const racine = '.mtk';
  const apercu = () => p.evaluate(() => { const a = Ext.ComponentQuery.query('modelesticket')[0].etat.apercu; return { ordre: a.ordre, zones: a.zones, pied: a.pied || null }; });
  const apresApercu = async (action) => {
    const r = p.waitForResponse((x) => /modeles-ticket\/apercu/.test(x.url()), { timeout: 30000 });
    r.catch(() => null); /* un bouton absent ne doit pas faire mourir le processus avant la remise en etat */
    await action();
    await r;
    await p.locator(racine + ' .mtk-feuille img').waitFor({ timeout: 30000 });
    await p.waitForTimeout(400);
  };
  const plusDeux = async (attr) => {
    await apresApercu(() => p.locator(racine + ` [${attr}="1"]`).click({ timeout: 5000 }));
    await apresApercu(() => p.locator(racine + ` [${attr}="1"]`).click({ timeout: 5000 }));
  };
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const premier = p.waitForResponse((x) => /modeles-ticket\/apercu/.test(x.url()), { timeout: 60000 });
    await ouvrirMenu(p, MENU, 'Modèles de ticket');
    await premier;
    await p.locator(racine + ' .mtk-feuille img').waitFor({ timeout: 30000 });
    const l80 = p.locator(racine + ' .mtk-barre [data-choix=largeur][data-valeur="80"]');
    if (await l80.getAttribute('aria-checked') !== 'true') { await apresApercu(() => l80.click()); }
    await apresApercu(() => p.locator(racine + ' .mtk-ticket[data-ticket=VENTE]').click());

    /* la date n'est plus un bloc a part */
    const a0 = await apercu();
    ok('Aperçu : pas de bloc « Date du ticket » au-dessus du pied, le code-barres reste le dernier',
      !a0.zones.DATE && a0.ordre[a0.ordre.length - 1] === 'PIED' && a0.pied && a0.pied.codeBarres > 0 && a0.pied.policeDate > 0,
      JSON.stringify({ zones: Object.keys(a0.zones), pied: a0.pied }));

    /* un clic sur le pied : deux reglages */
    await p.locator(racine + ' .mtk-zone[data-bloc=PIED]').click();
    await p.waitForTimeout(300);
    const sel = await p.locator(racine + ' .mtk-selection').innerText();
    ok('Clic sur le pied : « Code-barres et date », avec « Taille du code-barres » et « Taille de la date »',
      /Code-barres et date/.test(sel) && /Taille du code-barres/.test(sel) && /Taille de la date/.test(sel), sel.replace(/\s+/g, ' ').slice(0, 200));

    /* la date grandit, le code-barres ne bouge pas */
    await plusDeux('data-taille-date');
    const a1 = await apercu();
    ok('« + » deux fois sur la date : la date grandit, le code-barres garde sa taille',
      a1.pied.policeDate > a0.pied.policeDate && a1.pied.codeBarres === a0.pied.codeBarres && !a1.zones.DATE,
      'date ' + a0.pied.policeDate + ' → ' + a1.pied.policeDate + ' pt ; code-barres ' + a0.pied.codeBarres + ' → ' + a1.pied.codeBarres);

    /* le code-barres grandit, la date ne bouge pas */
    await plusDeux('data-taille');
    const a2 = await apercu();
    ok('« + » deux fois sur le code-barres : il grandit, la date garde sa taille',
      a2.pied.codeBarres > a1.pied.codeBarres && a2.pied.policeDate === a1.pied.policeDate,
      'code-barres ' + a1.pied.codeBarres + ' → ' + a2.pied.codeBarres + ' ; date ' + a1.pied.policeDate + ' → ' + a2.pied.policeDate + ' pt');

    /* enregistrement : deux tailles en base, reportees sur les autres tickets */
    const charge = p.waitForResponse((x) => /modeles-ticket\?/.test(x.url()) && x.request().method() === 'GET', { timeout: 30000 });
    await p.locator(racine + ' [data-action=enregistrer]').click();
    await charge;
    await p.waitForTimeout(800);
    const vente = enBase('VENTE', 80), z = enBase('TICKET_Z', 80), assurance = enBase('VENTE_ASSURANCE', 80);
    ok('En base : date à +2 et code-barres à +2 sur la vente', bloc(vente, 'DATE').taille === 2 && bloc(vente, 'PIED').taille === 2,
      JSON.stringify({ date: bloc(vente, 'DATE'), pied: bloc(vente, 'PIED') }));
    ok('Réglages communs : les deux tailles reportées sur la vente assurance et le ticket Z',
      bloc(assurance, 'DATE').taille === 2 && bloc(assurance, 'PIED').taille === 2 && bloc(z, 'DATE').taille === 2 && bloc(z, 'PIED').taille === 2,
      JSON.stringify({ assurance: [bloc(assurance, 'DATE'), bloc(assurance, 'PIED')], z: [bloc(z, 'DATE'), bloc(z, 'PIED')] }));

    /* rapprochement : la date du ticket d'une vraie vente = la date de la vente en base, a cote du code-barres */
    const vo = q("SELECT CONCAT_WS('|', lg_PREENREGISTREMENT_ID, DATE_FORMAT(dt_UPDATED, '%d/%m/%Y %H:%i')) FROM t_preenregistrement WHERE str_TYPE_VENTE = 'VO' AND str_STATUT = 'is_Closed' AND int_PRICE > 0 ORDER BY dt_UPDATED DESC LIMIT 1").split('|');
    if (vo[0]) {
      const ap = await p.evaluate(async (v) => (await fetch('../api/v1/vente/ticket/vo/' + v + '/apercu')).json(), vo[0]);
      const t = ap.tickets && ap.tickets[0];
      const blocsDate = t ? t.blocs.filter((x) => x.id === 'DATE' && x.elements.length) : [];
      const piedC = t ? t.blocs.filter((x) => x.id === 'PIED').flatMap((x) => x.elements.filter((e) => e.genre === 'PIED').map((e) => e.c || '')) : [];
      ok('Rapprochement : date imprimée à côté du code-barres = date de la vente en base (' + vo[1] + '), aucun bloc date ailleurs',
        piedC.length === 1 && piedC[0] === vo[1] && blocsDate.length === 0, JSON.stringify({ piedC, blocsDate: blocsDate.length, base: vo[1] }));
    } else {
      ok('Rapprochement : une vente assurance close existe pour comparer la date', false, 'aucune vente');
    }
    ok('Aucune fenêtre surgissante', !(await fenetres()));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close().catch(() => null);
    remettre();
    const apres = TABLE();
    ok('Réglages remis comme avant', apres === AVANT, apres.split('\n').length + ' contre ' + AVANT.split('\n').length);
    if (apres === AVANT) { require('fs').unlinkSync(SECOURS); } else { console.log('Copie de secours : ' + SECOURS); }
    const echecs = res.filter((x) => !x.c).length;
    console.log((res.length - echecs) + '/' + res.length + (echecs ? ' ECHEC' : ' OK'));
    process.exit(echecs ? 1 : 0);
  }
})();
