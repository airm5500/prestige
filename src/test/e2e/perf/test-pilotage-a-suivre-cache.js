/* PILOTAGE, onglet « À suivre » : rouvert apres l'expiration du cache, il doit rester rapide (mesure du 02/11).
 *
 * Constat : les courbes d'evolution (GET pilotage/suivi/evolution, annee en cours face a N-1..N-3) etaient gardees dix
 * minutes, puis tout etait recalcule, annees closes comprises : environ 12 s d'attente sur le volume de l'officine,
 * a chaque retour sur l'onglet apres dix minutes. Les annees closes ne bougent plus : seule l'annee en cours doit etre
 * relue.
 *
 * Vrai chemin : menu ANALYSE DE GESTION > Pilotage de l'officine, clic sur l'en-tete « À suivre » (premier calcul,
 * non mesure), clic sur l'onglet « Ventes », attente de l'expiration du cache (10 min 30 s), puis nouveau clic sur
 * « À suivre » : chronometre jusqu'a la derniere reponse des courbes et la fin du chargement. Chaque reponse des
 * courbes est resumee par une empreinte, pour verifier que les chiffres ne changent pas. Lecture seule.
 * Variables : BASE (adresse de Prestige), E2E_LOGIN, ATTENTE_MS (attente avant le second clic, 630000 par defaut).
 */
const crypto = require('crypto');
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { BASE, connexion, ouvrirMenu } = require('../outils/vues');

const BUDGET_MS = 3000;
const ATTENTE_MS = Number(process.env.ATTENTE_MS || 630000);
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }

(async () => {
  console.log('Serveur : ' + BASE);
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1700, height: 1000 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(String(e.message)));
  let enVol = 0, dernier = Date.now();
  const courbes = [];
  p.on('request', () => { enVol++; dernier = Date.now(); });
  const fini = () => { enVol = Math.max(0, enVol - 1); dernier = Date.now(); };
  p.on('requestfinished', fini); p.on('requestfailed', fini);
  p.on('response', async (r) => {
    if (!/pilotage\/suivi\/evolution/.test(r.url())) { return; }
    const corps = await r.text().catch(() => '');
    /* parametres sans l'anti-cache d'ExtJS (_dc), qui change a chaque appel */
    courbes.push({ quand: Date.now(), parametres: (r.url().split('?')[1] || '').split('&').filter((x) => !/^_dc=/.test(x)).join('&'), statut: r.status(),
      empreinte: crypto.createHash('sha256').update(corps).digest('hex').slice(0, 12) });
  });
  const calme = async (limite) => {
    const fin = Date.now() + limite;
    while (Date.now() < fin) {
      if (enVol === 0 && Date.now() - dernier >= 400) {
        const masque = await p.evaluate(() => Array.prototype.some.call(document.querySelectorAll('.x-mask-msg'), (m) => m.offsetParent !== null));
        if (!masque) { return Date.now() - 400; }
      }
      await p.waitForTimeout(50);
    }
    throw new Error('onglet toujours en chargement apres ' + limite + ' ms');
  };
  const onglet = async (id) => p.evaluate((i) => Ext.ComponentQuery.query('pilotage #onglets')[0].items.items
    .filter((o) => o.itemId === i)[0].tab.getId(), id);
  const resume = (liste) => liste.map((c) => c.parametres + ' -> ' + c.statut + ' ' + c.empreinte).sort();
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'ANALYSE DE GESTION', "Pilotage de l'officine");
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('pilotage')[0]; return e && e.isVisible(true) && e.down('#onglet-asuivre'); }, null, { timeout: 120000 });
    await calme(300000);

    /* premier calcul : rempli le cache (non mesure, il peut venir d'un autre test) */
    let t0 = Date.now();
    await p.click('#' + await onglet('onglet-asuivre'));
    await calme(300000);
    const premier = courbes.filter((c) => c.quand >= t0);
    console.log('premier affichage : ' + (Date.now() - t0) + ' ms, ' + premier.length + ' courbes');
    ok('L onglet demande ses courbes d evolution', premier.length > 0 && premier.every((c) => c.statut === 200), resume(premier).join(' | '));

    await p.click('#' + await onglet('onglet-ventes'));
    await calme(120000);
    console.log('attente de ' + Math.round(ATTENTE_MS / 1000) + ' s (expiration du cache des courbes)');
    await p.waitForTimeout(ATTENTE_MS);

    t0 = Date.now();
    await p.click('#' + await onglet('onglet-asuivre'));
    const t1 = await calme(300000);
    const second = courbes.filter((c) => c.quand >= t0);
    ok('Apres l expiration du cache, l onglet « À suivre » se remplit dans son budget', t1 - t0 <= BUDGET_MS,
      (t1 - t0) + ' ms, budget ' + BUDGET_MS + ' ms, ' + second.length + ' courbes');
    ok('Les courbes rendent les memes chiffres qu au premier affichage', JSON.stringify(resume(premier)) === JSON.stringify(resume(second)),
      resume(second).join(' | '));
    ok('Aucune erreur JavaScript', erreurs.length === 0, JSON.stringify(erreurs.slice(0, 3)));
  } catch (e) {
    ok('Le test va jusqu au bout', false, String(e && e.message).slice(0, 300));
    await ENV_E2E.capture(p, 'echec');
  } finally {
    await b.close();
  }
  const echecs = res.filter((x) => !x.c).length;
  console.log((res.length - echecs) + '/' + res.length + ' controles respectes');
  process.exit(echecs ? 1 : 0);
})();
