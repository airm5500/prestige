/* PLAN DU 21/11, POINT 5 : ecran de connexion, un oeil a droite du mot de passe pour l'afficher ou le masquer.
 *  - l'oeil est dans le champ, a droite, visible, et le texte saisi ne passe pas dessous ;
 *  - un clic affiche le mot de passe (type texte, libelle « Masquer »), un second clic le masque ;
 *  - il se remasque a chaque tentative de connexion : par le bouton et par Entree, mot de passe faux ;
 *  - le clavier ne change pas : Tab va du mot de passe au bouton « Se connecter », Entree connecte toujours,
 *    y compris avec le mot de passe affiche ; le focus reste dans le champ apres un clic sur l'oeil ;
 *  - aucune erreur JavaScript, en 1366x768 et en 1280x720.
 * Rien n'est ecrit en base (la tentative fausse est celle d'un identifiant inconnu).
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  try {
    for (const [l, h] of [[1366, 768], [1280, 720]]) {
      const p = await (await b.newContext({ viewport: { width: l, height: h } })).newPage();
      p.on('pageerror', (e) => err.push(e.message));
      await p.goto(process.env.BASE + '/security/index.html', { waitUntil: 'domcontentloaded' });
      await p.waitForSelector('#str_password', { timeout: 30000 });
      const t = l + 'x' + h + ' : ';
      const oeil = p.locator('#pl-oeil-mdp');
      ok(t + 'œil présent à côté du mot de passe', await oeil.count() === 1 && await oeil.isVisible());
      if (await oeil.count() !== 1) { continue; }
      const g = await p.evaluate(() => {
        const c = document.getElementById('str_password').getBoundingClientRect(), o = document.getElementById('pl-oeil-mdp').getBoundingClientRect();
        const s = getComputedStyle(document.getElementById('str_password'));
        return { dedans: o.left >= c.left && o.right <= c.right + 1 && o.top >= c.top - 1 && o.bottom <= c.bottom + 1, droite: o.left > c.left + c.width / 2,
          marge: parseFloat(s.paddingRight) >= o.width, l: Math.round(o.width), h: Math.round(o.height) };
      });
      ok(t + 'œil dans le champ, à droite, le texte ne passe pas dessous, assez grand pour le clic', g.dedans && g.droite && g.marge && g.l >= 24 && g.h >= 24, JSON.stringify(g));
      const etat = () => p.evaluate(() => { const o = document.getElementById('pl-oeil-mdp'); return { type: document.getElementById('str_password').type,
        presse: o.getAttribute('aria-pressed'), libelle: o.getAttribute('aria-label'), focus: document.activeElement && document.activeElement.id }; });
      { const e0 = await etat(); ok(t + 'au départ : masqué, libellé « Afficher le mot de passe »', e0.type === 'password' && e0.presse === 'false' && e0.libelle === 'Afficher le mot de passe', JSON.stringify(e0)); }
      await p.fill('#str_login', 'e2e-inconnu-2111');
      await p.click('#str_password'); await p.keyboard.type('Secret 2111');
      await oeil.click();
      const e1 = await etat();
      ok(t + 'clic : mot de passe affiché, libellé « Masquer », focus resté dans le champ', e1.type === 'text' && e1.presse === 'true' && e1.libelle === 'Masquer le mot de passe' && e1.focus === 'str_password', JSON.stringify(e1));
      ok(t + 'la valeur saisie est intacte', await p.inputValue('#str_password') === 'Secret 2111');
      await oeil.click();
      const e2 = await etat();
      ok(t + 'second clic : masqué de nouveau', e2.type === 'password' && e2.presse === 'false' && e2.libelle === 'Afficher le mot de passe', JSON.stringify(e2));
      await p.focus('#str_password'); await p.keyboard.press('Tab');
      ok(t + 'Tab : du mot de passe au bouton « Se connecter » (l\'œil hors du parcours)', await p.evaluate(() => document.activeElement.id) === 'login');

      /* tentative par le bouton, mot de passe affiche */
      await oeil.click();
      const rep1 = p.waitForResponse((r) => /authentification|login|connexion|auth/i.test(r.url()) && r.request().method() === 'POST', { timeout: 20000 }).catch(() => null);
      await p.click('#login'); await rep1; await p.waitForTimeout(800);
      ok(t + 'tentative par le bouton : remasqué', (await etat()).type === 'password');
      /* tentative par Entree, mot de passe affiche */
      await oeil.click(); await p.focus('#str_password');
      const rep2 = p.waitForResponse((r) => r.request().method() === 'POST', { timeout: 20000 }).catch(() => null);
      await p.keyboard.press('Enter'); await rep2; await p.waitForTimeout(800);
      const e3 = await etat();
      ok(t + 'tentative par Entrée : remasqué, toujours sur l\'écran de connexion', e3.type === 'password' && /security\/index/.test(p.url()), JSON.stringify(e3));
      await p.close();
    }

    /* Entree connecte toujours, mot de passe affiche */
    const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
    p.on('pageerror', (e) => err.push(e.message));
    await p.goto(process.env.BASE + '/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.waitForSelector('#str_password');
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.click('#str_password'); await p.keyboard.type('e2etest');
    if (await p.locator('#pl-oeil-mdp').count()) { await p.click('#pl-oeil-mdp'); }
    await p.focus('#str_password'); await p.keyboard.press('Enter');
    const connecte = await p.waitForURL('**/general/**', { timeout: 60000 }).then(() => true).catch(() => false);
    ok('Entrée avec le mot de passe affiché : connexion réussie', connecte, p.url());
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack || x.message);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
