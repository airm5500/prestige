/* Retour du 17/09, point 3 : « la page s'est réduite, la vue est tronquée — pourquoi malgré toutes
 * les corrections on a encore ce problème ? »
 *
 * Cause, reproduite et mesurée ici, pas supposée : ExtJS 4.2 appelle tous les écouteurs de
 * redimensionnement de fenêtre dans une boucle sans try/catch (Ext.util.Event.fire). Le premier qui
 * lève une exception interrompt la boucle, et l'écouteur du viewport — celui qui donne sa taille à
 * toute l'application — est le DERNIER de la liste. Résultat : la fenêtre grandit, le contenu garde
 * son ancienne largeur, une bande blanche apparaît à droite, et c'est définitif puisque
 * Ext.EventManager.fireResize a déjà mémorisé la nouvelle taille avant de déclencher les écouteurs :
 * aucun autre événement ne sera émis pour cette largeur.
 *
 * Ce défaut échappait aux correctifs précédents (sections 4 et 5 de correctifs-affichage.js) : le
 * moteur de mise en page va parfaitement bien, personne ne lui a simplement dit que la fenêtre avait
 * changé de taille.
 *
 * Ce que le test établit :
 *  - sans écouteur fautif, rien ne change (non-régression du cas normal) ;
 *  - avec un écouteur fautif en tête de liste, le contenu suit TOUT DE MÊME la fenêtre ;
 *  - l'écouteur fautif est signalé (console et Centre de Support), il n'est pas avalé en silence ;
 *  - la sémantique d'ExtJS est conservée : un écouteur qui renvoie false interrompt la chaîne ;
 *  - l'ordre d'appel est conservé, et l'isolation n'est posée qu'une fois.
 *
 * Le test n'écrit rien en base.
 */
const { chromium } = require('playwright-core');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 340) + ']' : '')); }

/* Largeur du panneau central : c'est LUI qui reste figé quand le défaut se produit, pas le viewport
 * (dont l'élément est étiré par le CSS et ment donc sur la taille réellement mise en page). */
const mesurer = () => {
  const cp = Ext.getCmp('content-panel');
  return { fenetre: window.innerWidth, contenu: cp ? cp.getWidth() : null };
};

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1200, height: 800 } });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(2500);

    /* ------------------------------------------------------ le correctif est bien en place */
    ok('L isolation des écouteurs de redimensionnement est posée',
      await p.evaluate(() => !!(Ext.EventManager.resizeEvent && Ext.EventManager.resizeEvent.fire.isolationPrestige)));
    ok('Elle n est posée qu une fois : un second appel ne la réinstalle pas',
      await p.evaluate(() => window.PrestigeAffichage.isolerEcouteursRedimensionnement() === false));
    ok('L écouteur du viewport est bien le dernier de la liste : c est ce qui rend le défaut si grave',
      await p.evaluate(() => {
        const l = Ext.EventManager.resizeEvent.listeners;
        const v = Ext.ComponentQuery.query('viewport')[0];
        return l.length > 1 && l[l.length - 1].scope === v;
      }));

    /* ------------------------------------------------------ cas normal : rien ne change */
    await p.setViewportSize({ width: 1500, height: 800 });
    await p.waitForTimeout(1200);
    const normal = await p.evaluate(mesurer);
    ok('Sans écouteur fautif, le contenu suit la fenêtre',
      normal.contenu !== null && normal.fenetre - normal.contenu < 60, JSON.stringify(normal));

    /* ------------------------------------------------------ un écouteur fautif en tête de liste */
    await p.evaluate(() => {
      window.__ordreAppels = [];
      const r = Ext.EventManager.resizeEvent;
      // en tête : c'est la position la plus défavorable, tous les autres sont derrière lui
      r.listeners.unshift(r.createListener(function () {
        window.__ordreAppels.push('fautif');
        throw new Error('ecouteur de redimensionnement fautif (test)');
      }));
      r.listeners.splice(1, 0, r.createListener(function () { window.__ordreAppels.push('suivant'); }));
      // on observe ce qui est signalé au Centre de Support, sans rien envoyer au serveur
      window.__signales = [];
      window.__prestigeSupport = window.__prestigeSupport || {};
      window.__prestigeSupport.signaler = function (i) { window.__signales.push(i); };
    });
    await p.setViewportSize({ width: 1750, height: 800 });

    await p.waitForTimeout(1500);
    const apres = await p.evaluate(mesurer);
    ok('Avec un écouteur fautif, le contenu suit TOUT DE MÊME la fenêtre : plus de bande blanche',
      apres.contenu !== null && apres.fenetre - apres.contenu < 60, JSON.stringify(apres));
    ok('Les écouteurs suivants ont bien été appelés, dans l ordre',
      await p.evaluate(() => JSON.stringify(window.__ordreAppels) === '["fautif","suivant"]'),
      await p.evaluate(() => JSON.stringify(window.__ordreAppels)));
    ok('Le drapeau « firing » est remis à plat : il resterait bloqué à true sans le correctif',
      await p.evaluate(() => Ext.EventManager.resizeEvent.firing === false));
    ok('L écouteur fautif est signalé au Centre de Support, il n est pas avalé en silence',
      await p.evaluate(() => window.__signales.some(s => /ecouteur en erreur/.test(s.messageCourt || ''))),
      await p.evaluate(() => JSON.stringify(window.__signales.map(s => s.messageCourt))));

    /* ------------------------------------------------------ deuxième redimensionnement : pas de séquelle */
    await p.setViewportSize({ width: 1400, height: 800 });
    await p.waitForTimeout(1500);
    const second = await p.evaluate(mesurer);
    ok('Un second redimensionnement est encore suivi : le défaut n était pas seulement retardé',
      second.contenu !== null && second.fenetre - second.contenu < 60, JSON.stringify(second));

    /* ------------------------------------------------------ sémantique ExtJS conservée */
    ok('Un écouteur qui renvoie false interrompt toujours la chaîne, comme dans ExtJS',
      await p.evaluate(() => {
        const r = Ext.EventManager.resizeEvent;
        const memoire = r.listeners.slice(0);
        const vus = [];
        r.listeners = [
          r.createListener(function () { vus.push('a'); return false; }),
          r.createListener(function () { vus.push('b'); })
        ];
        const retour = r.fire(100, 100);
        r.listeners = memoire;
        return vus.join(',') === 'a' && retour === false;
      }));
    ok('Une chaîne complète renvoie true',
      await p.evaluate(() => {
        const r = Ext.EventManager.resizeEvent;
        const memoire = r.listeners.slice(0);
        r.listeners = [r.createListener(function () { })];
        const retour = r.fire(100, 100);
        r.listeners = memoire;
        return retour === true;
      }));
    ok('Un écouteur qui se désabonne pendant l appel ne fait pas sauter le suivant',
      await p.evaluate(() => {
        const r = Ext.EventManager.resizeEvent;
        const memoire = r.listeners.slice(0);
        const vus = [];
        const second = function () { vus.push('second'); };
        const premier = function () { vus.push('premier'); Ext.EventManager.removeResizeListener(premier); };
        r.listeners = [r.createListener(premier), r.createListener(second)];
        r.fire(100, 100);
        r.listeners = memoire;
        return vus.join(',') === 'premier,second';
      }));

    /* ------------------------------------------------------ un écran collé qui échoue ne fige plus la page */
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('depotextension', {}));
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('depotextension')[0]; return e && e.rendered; }, null, { timeout: 40000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => {
      // on casse l ajustement de l ecran colle, comme le ferait une mise en page en erreur
      const e = Ext.ComponentQuery.query('depotextension')[0];
      e.setSize = function () { throw new Error('mise en page de l ecran en erreur (test)'); };
    });
    await p.setViewportSize({ width: 1650, height: 800 });
    await p.waitForTimeout(1500);
    const colle = await p.evaluate(mesurer);
    ok('Un écran collé dont l ajustement échoue ne rétracte plus la page entière',
      colle.contenu !== null && colle.fenetre - colle.contenu < 60, JSON.stringify(colle));

    ok('Aucune erreur JavaScript autre que celles posées par le test',
      err.every(m => /\(test\)/.test(m)), err.join(' | '));
  } catch (e) {
    ok('parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    console.log('\n' + res.filter(r => r.c).length + '/' + res.length + ' verifications');
    process.exit(res.every(r => r.c) ? 0 : 1);
  }
})();
