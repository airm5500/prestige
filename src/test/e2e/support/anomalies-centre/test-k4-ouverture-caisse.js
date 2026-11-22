/* K4 DU RAPPORT ANOMALIES_CENTRE_SUPPORT_2026-10-26 (§ 19) : montant illisible a l'ouverture de caisse.
 *
 * Officine, 29/10 : « JsonbException ... java.lang.Integer » sur POST caisse/ouvrir-caisse. Le champ « Montant » acceptait
 * les decimales et le vide, alors que le serveur attend un entier. Sur la version actuelle le serveur refuse proprement
 * (400 « Valeur saisie invalide pour « amount » »), mais l'ecran affichait « Le serveur n'a pas repondu (erreur 400) ».
 *
 * Parcours par le menu (compte e2e). La lecture de l'etat de la caisse (billetage/ouventure-data) est interceptee pour
 * presenter une caisse attribuee et non ouverte : le bouton « Ouvrir caisse » s'affiche quel que soit l'etat reel du
 * compte. Aucune caisse n'est ouverte :
 *  - montant decimal puis vide : avant, la demande part au serveur (le vide est coupe par l'essai, par prudence) ;
 *    apres, rien ne part et le champ dit pourquoi ;
 *  - refus du serveur (400 en JSON, intercepte) : le message du serveur est affiche, et non « n'a pas repondu ».
 * Les envois au centre de support sont interceptes.
 *
 * node support/anomalies-centre/test-k4-ouverture-caisse.js   (BASE=http://localhost:9080/prestige ; MENU="SERVICE CLIENT")
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../../outils/poste');
const { connexion, ouvrirMenu, cliquer } = require('../../outils/vues');

const res = [];
function ok(n, c, d) { res.push(!!c); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const fenetres = (p) => p.evaluate(() => Ext.ComponentQuery.query('messagebox{isVisible()}').map((m) => (m.msg && m.msg.getEl() ? m.msg.getEl().dom.innerText : '?')));
const fermerFenetres = (p) => p.evaluate(() => Ext.ComponentQuery.query('messagebox{isVisible()}').forEach((m) => m.close()));

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  await p.route('**/api/v1/support/events', (r) => r.request().method() === 'POST' ? r.fulfill({ status: 200, body: '{}' }) : r.continue());
  /* caisse attribuee, pas encore ouverte : etat lu par l'ecran, rien n'est ecrit */
  await p.route('**/api/v1/billetage/ouventure-data*', (r) => r.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ success: true, data: { id: 'E2E-K4', firstName: 'E2E', lastName: 'K4', amount: 0, inUse: false } }) }));
  /* ouverture : par prudence, seul un montant decimal (refuse a la lecture par le serveur) va jusqu'au serveur */
  const envois = [];
  let reponseServeur = null;
  await p.route('**/api/v1/caisse/ouvrir-caisse*', async (r) => {
    const corps = r.request().postData() || '';
    envois.push(corps);
    let montant = null; try { montant = JSON.parse(corps).amount; } catch (e) { /* illisible */ }
    if (reponseServeur) { return r.fulfill(reponseServeur); }
    if (/^\d+[.,]\d+$/.test(String(montant))) { return r.continue(); }
    return r.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ success: false, msg: 'E2E : envoi coupe' }) });
  });
  const montant = '#coffreCaisseAmount input';
  const essayer = async (valeur) => {
    envois.length = 0; await fermerFenetres(p);
    await p.locator(montant).fill(valeur);
    await cliquer(p, '#btnValidate');
    await p.waitForTimeout(2500);
    const champ = await p.evaluate(() => { const c = Ext.getCmp('coffreCaisseAmount'); return { valide: c.isValid(), erreurs: c.getErrors(), saisi: c.getRawValue() }; });
    return { envois: envois.slice(), msgs: await fenetres(p), champ };
  };
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    /* plan du 14/11, point 5 : le menu « Ouverture de Caisse » est masque quand le menu unique « Ouverture / clôture
       caisse » est present ; l'ancien ecran reste alors ouvert par son composant, comme le fait l'application */
    const ancienMenu = await p.evaluate(() => { let t = false; Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().cascadeBy((n) => { if (n.get('id') === 'ouverturecaissemanger') { t = true; } }); return t; });
    if (ancienMenu) {
      await ouvrirMenu(p, process.env.MENU || 'SERVICE CLIENT', 'Ouverture de Caisse');
    } else {
      await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('ouverturecaissemanger', 'Ouverture de Caisse', ''));
    }
    await p.waitForFunction(() => { const v = Ext.getCmp('btnValidate'); return v && v.isVisible(true); }, null, { timeout: 60000 });
    await p.waitForTimeout(800);

    for (const valeur of ['1500.5', '']) {
      const r = await essayer(valeur);
      ok('montant « ' + valeur + ' » : rien n\'est envoyé, le champ dit pourquoi', r.envois.length === 0 && !r.champ.valide && r.champ.erreurs.length === 1 && r.champ.saisi.replace(',', '.') === valeur, JSON.stringify(r));
    }

    /* refus du serveur : son message est lu */
    reponseServeur = { status: 400, contentType: 'application/json', body: JSON.stringify({ success: false, msg: 'Valeur saisie invalide pour « amount » : un nombre entier est attendu.' }) };
    const r = await essayer('1500');
    ok('refus du serveur (400) : son message est affiché', r.envois.length === 1 && r.msgs.some((m) => /nombre entier est attendu/.test(m)) && !r.msgs.some((m) => /n'a pas répondu/.test(m)), JSON.stringify(r));
    await fermerFenetres(p);

    /* meme parcours sur l'ecran unique « Ouverture/clôture caisse » (plan du 14/11, point 5), ouvert par son menu */
    const nouveau = await p.evaluate(() => { let t = false; Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().cascadeBy((n) => { if (n.get('id') === 'caisseouverturecloture') { t = true; } }); return t; });
    if (nouveau) {
      reponseServeur = null;
      await ouvrirMenu(p, process.env.MENU || 'SERVICE CLIENT', 'Ouverture/clôture caisse');
      await p.mouse.click(1500, 850);
      const ECRAN = 'caisseouverturecloture';
      await p.waitForFunction((e) => { const v = Ext.ComponentQuery.query(e).filter((x) => x.isVisible(true))[0]; return v && !v.down('#ocOuverture').isDisabled(); }, ECRAN, { timeout: 30000 });
      const essayerNouveau = async (valeur) => {
        envois.length = 0; await fermerFenetres(p);
        const id = await p.evaluate((e) => Ext.ComponentQuery.query(e).filter((x) => x.isVisible(true))[0].down('#ocMontant').inputEl.id, ECRAN);
        await p.locator('#' + id).fill(valeur);
        await cliquer(p, ECRAN + ' #ocBtnOuvrir');
        await p.waitForTimeout(2500);
        return p.evaluate((e) => { const v = Ext.ComponentQuery.query(e).filter((x) => x.isVisible(true))[0], c = v.down('#ocMontant');
          return { valide: c.isValid(), erreurs: c.getErrors(), saisi: c.getRawValue(), etat: v.down('#ocEtat').getEl().dom.textContent }; }, ECRAN)
          .then(async (champ) => ({ envois: envois.slice(), msgs: await fenetres(p), champ }));
      };
      for (const valeur of ['1500.5', '']) {
        const r = await essayerNouveau(valeur);
        ok('écran unique, montant « ' + valeur + ' » : rien n\'est envoyé, le champ dit pourquoi', r.envois.length === 0 && !r.champ.valide && r.champ.erreurs.length === 1 && r.champ.saisi.replace(',', '.') === valeur, JSON.stringify(r));
      }
      reponseServeur = { status: 400, contentType: 'application/json', body: JSON.stringify({ success: false, msg: 'Valeur saisie invalide pour « amount » : un nombre entier est attendu.' }) };
      const r2 = await essayerNouveau('1500');
      ok('écran unique, refus du serveur (400) : son message reste affiché, sans fenêtre, le montant tapé reste', r2.envois.length === 1 && /nombre entier est attendu/.test(r2.champ.etat) && r2.msgs.length === 0 && r2.champ.saisi === '1500', JSON.stringify(r2));
    }
    ok('aucune erreur JavaScript', erreurs.length === 0, JSON.stringify(erreurs));
  } catch (x) { ok('parcours sans exception', false, x.message); } finally {
    await b.close();
    const echecs = res.filter((x) => !x).length;
    console.log('\n' + (res.length - echecs) + '/' + res.length + ' PASS');
    process.exit(echecs ? 1 : 0);
  }
})();
