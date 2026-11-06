/* RETOUR DU 06/11 : LE CODE-BARRES ET LA DATE DU TICKET SONT DEUX BLOCS, CHACUN AVEC SA TAILLE.
 *
 * Ecran « Modèles de ticket », par les vues, avec de vrais clics (1366 × 768). Ce que le test etablit :
 *  - l'apercu montre un bloc « Date du ticket » juste au-dessus du code-barres, qui reste le dernier ;
 *  - choisir la date puis « + » deux fois agrandit la date, le code-barres ne bouge pas ;
 *  - choisir le code-barres puis « + » deux fois agrandit le code-barres, la date ne bouge pas ;
 *  - « Enregistrer » ecrit les deux tailles en base, et les reporte sur les autres tickets (reglages communs) ;
 *  - rapprochement : la date imprimee sur le ticket d'une vente (apercu, rien n'est imprime) = la date de la vente
 *    en base, et elle n'est plus a cote du code-barres ;
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
const remettre = () => {
  q('DELETE FROM ticket_modele');
  AVANT.split('\n').filter(Boolean).forEach((l) => {
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
  const composant = (f, x) => p.evaluate(f, x);
  const apresApercu = async (action) => {
    const r = p.waitForResponse((x) => /modeles-ticket\/apercu/.test(x.url()), { timeout: 30000 });
    await action();
    await r;
    await p.locator(racine + ' .mtk-feuille img').waitFor({ timeout: 30000 });
    await p.waitForTimeout(400);
  };
  const zone = (id) => p.locator(racine + ` .mtk-zone[data-bloc=${id}]`);
  const boite = async (id) => { const x = await zone(id).boundingBox(); return x ? { haut: Math.round(x.y), h: Math.round(x.height), bas: Math.round(x.y + x.height) } : null; };
  const plusDeux = async () => {
    await apresApercu(() => p.locator(racine + ' [data-taille="1"]').click());
    await apresApercu(() => p.locator(racine + ' [data-taille="1"]').click());
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

    /* deux blocs : la date juste au-dessus du code-barres */
    const d0 = await boite('DATE'), p0 = await boite('PIED');
    const ordre = await composant(() => Ext.ComponentQuery.query('modelesticket')[0].etat.apercu.ordre);
    ok('Aperçu : un bloc « Date du ticket » et un bloc « Code-barres », la date juste au-dessus, le code-barres le dernier',
      d0 && p0 && d0.bas <= p0.haut + 2 && ordre[ordre.length - 1] === 'PIED' && ordre[ordre.length - 2] === 'DATE',
      JSON.stringify({ d0, p0, ordre }));

    /* la date grandit, le code-barres ne bouge pas */
    await zone('DATE').click();
    await p.waitForTimeout(300);
    const libelleDate = await p.locator(racine + ' .mtk-selection').innerText();
    await plusDeux();
    const d1 = await boite('DATE'), p1 = await boite('PIED');
    ok('Date choisie d\'un clic : « Date du ticket »', /Date du ticket/.test(libelleDate), libelleDate.slice(0, 120));
    ok('« + » deux fois sur la date : la date grandit, le code-barres garde sa taille', d1.h > d0.h && Math.abs(p1.h - p0.h) <= 1,
      'date ' + d0.h + ' → ' + d1.h + ' ; code-barres ' + p0.h + ' → ' + p1.h);

    /* le code-barres grandit, la date ne bouge pas */
    await zone('PIED').click();
    await p.waitForTimeout(300);
    await plusDeux();
    const d2 = await boite('DATE'), p2 = await boite('PIED');
    ok('« + » deux fois sur le code-barres : il grandit, la date garde sa taille', p2.h > p1.h && Math.abs(d2.h - d1.h) <= 1,
      'code-barres ' + p1.h + ' → ' + p2.h + ' ; date ' + d1.h + ' → ' + d2.h);

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

    /* rapprochement : la date du ticket d'une vraie vente = la date de la vente en base */
    const vo = q("SELECT CONCAT_WS('|', lg_PREENREGISTREMENT_ID, DATE_FORMAT(dt_UPDATED, '%d/%m/%Y %H:%i')) FROM t_preenregistrement WHERE str_TYPE_VENTE = 'VO' AND str_STATUT = 'is_Closed' AND int_PRICE > 0 ORDER BY dt_UPDATED DESC LIMIT 1").split('|');
    if (vo[0]) {
      const ap = await p.evaluate(async (v) => (await fetch('../api/v1/vente/ticket/vo/' + v + '/apercu')).json(), vo[0]);
      const t = ap.tickets && ap.tickets[0];
      const dates = t ? t.blocs.filter((x) => x.id === 'DATE').flatMap((x) => x.elements.map((e) => e.a)) : [];
      const piedC = t ? t.blocs.filter((x) => x.id === 'PIED').flatMap((x) => x.elements.filter((e) => e.genre === 'PIED').map((e) => e.c || '')) : [];
      ok('Rapprochement : date imprimée dans son bloc = date de la vente en base (' + vo[1] + '), plus à côté du code-barres',
        dates.length === 1 && dates[0] === vo[1] && piedC.every((c) => c === ''), JSON.stringify({ dates, piedC, base: vo[1] }));
    } else {
      ok('Rapprochement : une vente assurance close existe pour comparer la date', false, 'aucune vente');
    }
    ok('Aucune fenêtre surgissante', !(await fenetres()));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    remettre();
    const apres = TABLE();
    ok('Réglages remis comme avant', apres === AVANT, apres.split('\n').length + ' contre ' + AVANT.split('\n').length);
    const echecs = res.filter((x) => !x.c).length;
    console.log((res.length - echecs) + '/' + res.length + (echecs ? ' ECHEC' : ' OK'));
    process.exit(echecs ? 1 : 0);
  }
})();
