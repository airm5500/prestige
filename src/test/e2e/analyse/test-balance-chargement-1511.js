/* PLAN DU 14/11, POINT 8 : BALANCE VENTE CAISSE, AUCUN SIGNE DE CHARGEMENT AU CLIC SUR « RECHERCHER ».
 *
 * Defaut : le masque de chargement etait pose sur une grille cachee (jamais visible) et le bouton restait actif ;
 * l'utilisateur recliquait, et chaque clic relancait le calcul cote serveur.
 *
 * Parcours (menu GESTION COURANTE > Balance Vente/Caisse2) : dates saisies, puis trois clics rapides sur
 * « rechercher ». Le serveur repond lentement (2,5 s de delai ajoute a la reponse, pour voir l'etat « en cours »).
 * Attendu :
 *  - un seul appel au serveur pour les trois clics ;
 *  - pendant le calcul : un masque « Recherche en cours » visible sur la balance, bouton « rechercher » desactive ;
 *  - apres la reponse : masque retire, bouton reactive, et la ventilation affichee = reponse du serveur (nombre de
 *    ventes, montant TTC) ;
 *  - meme chose quand le serveur echoue (erreur 500) : le bouton revient, le masque part ;
 *  - trois periodes differentes (mois, trimestre, jour sans vente) donnent trois resultats coherents.
 * Lecture seule : aucune donnee posee.
 * Lancement seul : node src/test/e2e/analyse/test-balance-chargement-1511.js
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu, saisir } = require('../outils/vues');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const sansMasque = (p) => p.waitForFunction(() => !Array.from(document.querySelectorAll('.x-mask')).some((m) => m.offsetParent !== null), null, { timeout: 120000 });
const jj = (d) => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
const RECHERCHE = /\/balancesalecash\?/;

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  try {
    const ctx = await b.newContext({ viewport: { width: 1500, height: 950 } });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => err.push(String(e.message)));
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'GESTION COURANTE', 'Balance Vente/Caisse2');
    await p.waitForFunction(() => Ext.ComponentQuery.query('balancesalecahs #balanceGrid').length > 0, null, { timeout: 20000 });
    await p.waitForFunction(() => !Ext.ComponentQuery.query('balancesalecahs #balanceGrid')[0].getStore().isLoading(), null, { timeout: 120000 });
    await sansMasque(p);
    /* la souris quitte le volet du menu, qui se replie */
    await p.mouse.move(1000, 600);
    await p.mouse.click(1000, 900);
    await p.waitForTimeout(1200);

    let appels = 0, panne = false;
    await p.route(RECHERCHE, async (route) => {
      appels++;
      if (panne) { await new Promise((r) => setTimeout(r, 2500)); return route.fulfill({ status: 500, body: '{}' }); }
      const r = await route.fetch();
      await new Promise((x) => setTimeout(x, 2500));
      return route.fulfill({ response: r });
    });
    const bouton = async () => p.evaluate(() => { const x = Ext.ComponentQuery.query('balancesalecahs #rechercher')[0]; const r = x.getEl().dom.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, inactif: x.isDisabled() }; });
    const masqueVisible = () => p.evaluate(() => Array.from(document.querySelectorAll('.x-mask')).some((m) => m.offsetParent !== null
      && m.getBoundingClientRect().width > 200 && m.getBoundingClientRect().height > 100));

    const fin = new Date();
    const PERIODES = [
      ['mois', new Date(fin.getFullYear(), fin.getMonth() - 1, fin.getDate()), fin],
      ['trimestre', new Date(fin.getFullYear(), fin.getMonth() - 3, fin.getDate()), fin],
      ['jour sans vente', new Date(2001, 0, 1), new Date(2001, 0, 1)],
    ];
    for (const [nom, du, au] of PERIODES) {
      await saisir(p, 'balancesalecahs #dtStart', jj(du));
      await saisir(p, 'balancesalecahs #dtEnd', jj(au));
      appels = 0;
      const reponse = p.waitForResponse((r) => RECHERCHE.test(r.url()), { timeout: 180000 });
      const c = await bouton();
      /* trois clics rapides, a la souris, comme un utilisateur qui ne voit rien venir */
      await p.mouse.click(c.x, c.y);
      await p.waitForTimeout(300);
      const pendant = { masque: await masqueVisible(), inactif: (await bouton()).inactif };
      await p.mouse.click(c.x, c.y);
      await p.waitForTimeout(300);
      await p.mouse.click(c.x, c.y);
      const r = await reponse;
      const json = await r.json().catch(() => ({}));
      await p.waitForTimeout(800);
      await p.waitForFunction(() => !Ext.ComponentQuery.query('balancesalecahs #balanceGrid')[0].getStore().isLoading(), null, { timeout: 180000 });
      await p.waitForTimeout(3500);
      const apres = { masque: await masqueVisible(), inactif: (await bouton()).inactif };
      ok(nom + ' : un seul appel au serveur pour trois clics', appels === 1, appels + ' appel(s)');
      ok(nom + ' : pendant le calcul, masque visible et bouton désactivé', pendant.masque && pendant.inactif, JSON.stringify(pendant));
      ok(nom + ' : après la réponse, masque retiré et bouton réactivé', !apres.masque && !apres.inactif, JSON.stringify(apres));
      /* rapprochement : la ventilation affichee reprend la reponse du serveur */
      const ecran = await p.evaluate(() => { const v = Ext.ComponentQuery.query('balancesalecahs #ventilationBalance')[0];
        return v && v.getEl() ? v.getEl().dom.innerText.replace(/\s+/g, ' ') : ''; });
      const v = json.ventilation;
      if (v && v.comptant) {
        const m = json.metaData || {};
        /* tuiles de la ventilation, lues comme l'utilisateur les voit (« NB VENTES 8.831 ») */
        const tout = await p.evaluate(() => Ext.ComponentQuery.query('balancesalecahs')[0].getEl().dom.innerText.replace(/\s+/g, ' '));
        const lireTuile = (libelle) => { const x = new RegExp(libelle + ' ([\\d.]+)', 'i').exec(tout); return x ? Number(x[1].replace(/\D/g, '')) : null; };
        const tuiles = { nbreVente: lireTuile('NB VENTES'), montantAchat: lireTuile('MONTANT ACHAT') };
        ok(nom + ' : nombre de ventes et montant achat affichés = réponse du serveur', tuiles.nbreVente === Number(m.nbreVente) && tuiles.montantAchat === Math.round(Number(m.montantAchat)),
          JSON.stringify(tuiles) + ' / serveur ' + m.nbreVente + ' ; ' + m.montantAchat);
      } else {
        ok(nom + ' : « Aucune vente sur la période » affiché', /Aucune vente/.test(ecran), ecran.slice(0, 200));
      }
    }

    /* echec du serveur : le bouton doit revenir */
    panne = true; appels = 0;
    const c = await bouton();
    await p.mouse.click(c.x, c.y);
    await p.waitForTimeout(300);
    await p.mouse.click(c.x, c.y);
    await p.waitForTimeout(4500);
    const e = { masque: await masqueVisible(), inactif: (await bouton()).inactif };
    ok('Serveur en erreur : un seul appel, masque retiré et bouton réactivé', appels === 1 && !e.masque && !e.inactif, appels + ' appel(s) ' + JSON.stringify(e));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack + ' ' + err.join(' | '));
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
