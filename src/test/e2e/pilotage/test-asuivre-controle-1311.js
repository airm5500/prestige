/* PILOTAGE, onglet « À suivre » : « chargement alertes » (plan du 12/11).
 *
 * Constat (banc appaul, 13/11) : a l'ouverture du menu, l'ecran verifie d'abord les corrections tardives
 * (GET pilotage/controler : 0,8 s sur la copie, 2,7 s sur le banc appaul, 3,5 s mesurees chez l'officine le 20/09),
 * puis calcule l'onglet ouvert. Un clic sur un onglet PENDANT cette verification lancait tout de suite le calcul de
 * l'onglet, et la fin de la verification le relancait : « À suivre » etait calcule deux fois (ruptures des 90 jours,
 * demandes de treize mois), les courbes demandees deux fois, et la carte « Alertes », deja remplie, repassait a
 * « Chargement… » jusqu'a la seconde reponse.
 * Attendu : pendant la verification, l'onglet choisi attend ; il est calcule UNE fois, a la fin de la verification ;
 * une carte remplie ne revient jamais a « Chargement… ».
 *
 * Vrai chemin : menu ANALYSE DE GESTION > Pilotage de l'officine ; pendant la verification (retenue 3 s par le test,
 * comme chez l'officine), clic sur l'en-tete « Ventes » puis sur « À suivre ». Puis bouton « Actualiser » sur
 * « À suivre ». Lecture seule.
 * Controles :
 *  - bilan des requetes : onglet/asuivre une fois par geste (ouverture, Actualiser), onglet/ventes jamais (quitte
 *    avant la fin de la verification), courbes une fois chacune par geste, une verification par geste ;
 *  - la carte « Alertes » ne revient jamais a « Chargement… » une fois remplie ; aucun onglet ne reste masque ;
 *  - rapprochement : lignes de la carte « Alertes » = alertes de la reponse de l'onglet, une a une ; nombre de tuiles
 *    = tuiles de la reponse ;
 *  - aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu } = require('../outils/vues');

const RETENUE_MS = 3000;
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 500) + ']' : '')); }

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  try {
    const p = await (await b.newContext({ viewport: { width: 1700, height: 1000 } })).newPage();
    const erreurs = []; p.on('pageerror', (e) => erreurs.push(String(e.message)));
    let journal = [];
    let derniereSuivi = null;
    p.on('request', (r) => {
      const m = r.url().match(/api\/v1\/pilotage\/(onglet\/[a-z]+|controler|suivi\/[a-z]+)(?:\?.*mesure=([a-z]+))?/);
      if (m) { journal.push({ t: Date.now(), quoi: m[1] + (m[2] ? ':' + m[2] : '') }); }
    });
    p.on('response', async (r) => {
      if (/api\/v1\/pilotage\/onglet\/asuivre/.test(r.url())) { try { derniereSuivi = JSON.parse(await r.text()); } catch (e) { derniereSuivi = null; } }
    });
    /* la verification est retenue 3 s, comme chez l'officine : le clic tombe pendant qu'elle tourne */
    let controleRecu = 0;
    await p.route('**/api/v1/pilotage/controler**', async (route) => { controleRecu = Date.now(); await new Promise((f) => setTimeout(f, RETENUE_MS)); await route.continue(); });

    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const lib = await p.evaluate(() => { const n = Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().findChild('id', 'pilotage', true); return n ? [n.parentNode.get('text'), n.get('text')] : null; });
    if (!lib) { throw new Error('menu pilotage absent pour ce compte'); }

    /* releve de la carte « Alertes » toutes les 100 ms : remplie puis revenue a « Chargement… » ? */
    const surveiller = () => {
      const etat = { rempliA: null, retours: 0, arret: false };
      (async () => {
        while (!etat.arret) {
          const t = await p.evaluate(() => { const c = document.querySelector('.sv-carte[data-carte="alertes"]'); return c ? c.innerText : ''; }).catch(() => '');
          const enCharge = /Chargement/.test(t);
          if (!enCharge && /\S/.test(t.replace(/Alertes/, '')) && etat.rempliA === null) { etat.rempliA = Date.now(); }
          if (enCharge && etat.rempliA !== null) { etat.retours++; etat.rempliA = null; }
          await new Promise((f) => setTimeout(f, 100));
        }
      })();
      return etat;
    };
    const attendreCalme = async (limite) => {
      const fin = Date.now() + limite;
      let n = -1, stable = 0;
      while (Date.now() < fin) {
        await p.waitForTimeout(500);
        const masque = await p.evaluate(() => Array.prototype.some.call(document.querySelectorAll('.x-mask-msg'), (m) => m.offsetParent !== null));
        if (journal.length === n && !masque) { if (++stable >= 6) { return; } } else { stable = 0; n = journal.length; }
      }
      throw new Error('ecran toujours en chargement apres ' + limite + ' ms');
    };
    const compter = (quoi) => journal.filter((x) => x.quoi === quoi).length;
    const courbes = () => journal.filter((x) => /^suivi\/evolution/.test(x.quoi));
    const rapprocher = async (geste) => {
      const ecran = await p.evaluate(() => {
        const c = document.querySelector('.sv-carte[data-carte="alertes"]');
        const lignes = c ? Array.prototype.map.call(c.querySelectorAll('ul.pilotage-alertes > li'), (li) => li.textContent.trim()) : null;
        const t = Ext.ComponentQuery.query('pilotage')[0].down('#tuiles-asuivre');
        return { lignes, tuiles: t ? t.getStore().getCount() : -1 };
      });
      const api = derniereSuivi && derniereSuivi.alertes ? derniereSuivi.alertes.map((a) => String(a.texte).trim()) : null;
      ok(geste + ' : carte Alertes = reponse de l\'onglet, ligne a ligne', api && ecran.lignes && JSON.stringify(ecran.lignes) === JSON.stringify(api),
        'ecran ' + JSON.stringify(ecran.lignes).slice(0, 200) + ' / api ' + JSON.stringify(api).slice(0, 200));
      ok(geste + ' : tuiles = reponse de l\'onglet', derniereSuivi && ecran.tuiles === (derniereSuivi.tuiles || []).length,
        ecran.tuiles + ' / ' + (derniereSuivi && (derniereSuivi.tuiles || []).length));
    };

    /* --- geste 1 : ouverture, clic sur Ventes puis sur À suivre pendant la verification */
    journal = [];
    let suivi = surveiller();
    await ouvrirMenu(p, lib[0], lib[1]);
    await p.waitForFunction(() => Ext.ComponentQuery.query('pilotage #onglets')[0], null, { timeout: 60000 });
    const debutAttente = Date.now();
    while (!controleRecu && Date.now() - debutAttente < 60000) { await p.waitForTimeout(50); }
    const idOnglet = (i) => p.evaluate((x) => Ext.ComponentQuery.query('pilotage #onglets')[0].items.items.filter((o) => o.itemId === x)[0].tab.getId(), i);
    await p.click('#' + await idOnglet('onglet-ventes'));
    await p.waitForTimeout(300);
    await p.click('#' + await idOnglet('onglet-asuivre'));
    const clic = Date.now();
    ok('geste 1 : clics faits pendant la verification', clic - controleRecu < RETENUE_MS, (clic - controleRecu) + ' ms apres son depart');
    await attendreCalme(180000);
    suivi.arret = true;
    ok('geste 1 : une seule verification', compter('controler') === 1, compter('controler'));
    ok('geste 1 : « À suivre » calcule une fois', compter('onglet/asuivre') === 1, compter('onglet/asuivre'));
    ok('geste 1 : « Ventes », quitte pendant la verification, jamais calcule', compter('onglet/ventes') === 0, compter('onglet/ventes'));
    const c1 = courbes().map((x) => x.quoi);
    ok('geste 1 : chaque courbe demandee une fois', c1.length > 0 && c1.length === new Set(c1).size, c1.join(' '));
    ok('geste 1 : la carte Alertes ne revient pas a « Chargement… »', suivi.retours === 0 && suivi.rempliA !== null, 'retours ' + suivi.retours);
    const asuivre = journal.filter((x) => x.quoi === 'onglet/asuivre')[0];
    ok('geste 1 : calcul parti a la fin de la verification', asuivre && asuivre.t >= controleRecu + RETENUE_MS - 50,
      asuivre ? (asuivre.t - controleRecu) + ' ms apres le depart de la verification' : 'aucun');
    await rapprocher('geste 1');
    const masques = await p.evaluate(() => Ext.ComponentQuery.query('pilotage #onglets')[0].items.items
      .filter((o) => o.el && o.el.isMasked && o.el.isMasked()).map((o) => o.itemId));
    ok('geste 1 : aucun onglet ne garde un masque (Ventes, traverse pendant la verification)', masques.length === 0, masques.join(' '));

    /* --- geste 2 : « Actualiser » sur À suivre (verification puis un calcul) */
    journal = [];
    controleRecu = 0;
    suivi = surveiller();
    const idActualiser = await p.evaluate(() => Ext.ComponentQuery.query('pilotage #barrePeriode button[itemId=actualiser]')[0].getId());
    await p.click('#' + idActualiser);
    await attendreCalme(180000);
    suivi.arret = true;
    ok('geste 2 : une verification', compter('controler') === 1, compter('controler'));
    ok('geste 2 : « À suivre » calcule une fois', compter('onglet/asuivre') === 1, compter('onglet/asuivre'));
    const c2 = courbes().map((x) => x.quoi);
    ok('geste 2 : chaque courbe demandee une fois', c2.length > 0 && c2.length === new Set(c2).size, c2.join(' '));
    ok('geste 2 : carte Alertes remplie a la fin', suivi.rempliA !== null, 'retours ' + suivi.retours);
    await rapprocher('geste 2');

    ok('aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('deroulement du test', false, e.stack);
  } finally {
    await b.close();
  }
  const n = res.filter((r) => r.c).length;
  console.log('===== ' + n + '/' + res.length + (n === res.length ? ' PASS' : ' ECHEC') + ' =====');
  process.exit(n === res.length ? 0 : 1);
})();
