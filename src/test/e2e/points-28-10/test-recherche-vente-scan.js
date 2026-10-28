/* POINT 3 DU 28/10. SERVICE CLIENT > Ventes > Nouvelle vente, champ « N° ticket / scan » (compte e2e).
 *  - prevente retrouvee et chargee : la zone de recherche est videe, prete pour le scan suivant ;
 *  - vente non retrouvee : message sur la meme ligne (pas de fenetre), curseur dans la zone, saisie preselectionnee ;
 *  - « 5 » : prevente du jour n° 5 ; reference sans separateur : retrouvee ;
 *  - ticket scanne hors de la zone (curseur sur le produit) : la prevente est chargee, le champ produit n'est pas touche ;
 *  - saisie lente a la main : jamais prise pour un scan ;
 *  - aucune erreur JavaScript, aucune fenetre du navigateur. Prevente d'essai retiree par la route de l'ecran Ventes.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer, texteMessage, repondre } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const [FID, PU] = q("SELECT f.lg_FAMILLE_ID, f.int_PRICE FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
  + " WHERE f.str_STATUT = 'enable' AND s.int_NUMBER_AVAILABLE > 20 AND f.int_PRICE > 0 AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 AND COALESCE(f.lg_FAMILLE_PARENT_ID, '') = ''"
  + " ORDER BY f.int_CIP LIMIT 1").split('\t');

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = [], dialogues = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  const api = (m, u, c) => p.evaluate(([m2, u2, c2]) => new Promise((r) => Ext.Ajax.request({ url: u2, method: m2, jsonData: c2 || undefined,
    success: (x) => { try { r(JSON.parse(x.responseText)); } catch (e) { r({}); } }, failure: (x) => r({ success: false, status: x.status }) })), [m, u, c]);
  const preventes = [];
  const champ = 'doventemanager #preventeSearchField';
  const nouvelleVente = async () => {
    await ouvrirMenu(p, 'SERVICE CLIENT', 'Ventes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('cloturerventemanager #addBtn').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await cliquer(p, 'cloturerventemanager #addBtn');
    await p.waitForFunction((r) => Ext.ComponentQuery.query(r).some((x) => x.isVisible(true)), champ, { timeout: 60000 });
    await p.waitForTimeout(1500);
  };
  const scanner = async (texte) => {
    await nouvelleVente();
    await cliquer(p, champ);
    await p.waitForTimeout(300); // la douchette est declenchee apres le clic
    await p.keyboard.type(texte, { delay: 10 });
    await p.keyboard.press('Enter');
    await p.waitForTimeout(3500);
    const msg = await texteMessage(p);
    if (msg) { await repondre(p, 'ok').catch(() => {}); }
    const chargee = await p.evaluate(() => { const c = testextjs.app.getController('VenteCtr').current; return c && c.lgPREENREGISTREMENTID; });
    return { chargee, msg };
  };
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const creer = async () => {
      const add = await api('POST', '../api/v1/vente/add/vno', { typeVenteId: '1', natureVenteId: '1', produitId: FID, itemPu: parseInt(PU, 10), qte: 1, qteServie: 1,
        devis: false, prevente: true, remiseId: '', userVendeurId: ADMIN });
      const id = add.data && add.data.lgPREENREGISTREMENTID;
      preventes.push(id);
      await api('PUT', '../api/v1/vente/terminerprevente/' + id);
      return { id, ref: q(`SELECT str_REF FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${id}'`) };
    };
    const etatChamp = () => p.evaluate((c) => { const f = Ext.ComponentQuery.query(c)[0], i = f.inputEl.dom;
      return { valeur: f.getValue(), focus: document.activeElement === i, selection: i.value.substring(i.selectionStart, i.selectionEnd) }; }, champ);
    const v = await creer();
    ok('Précondition : prévente d\'essai créée', !!v.id && !!v.ref, v.ref);
    let r = await scanner(v.ref);
    ok('Vente retrouvée : chargée', r.chargee === v.id, JSON.stringify(r));
    let e = await etatChamp();
    ok('Vente retrouvée et chargée : zone de recherche vidée', e.valeur === '', JSON.stringify(e));

    const statut = () => p.evaluate(() => { const s = Ext.ComponentQuery.query('doventemanager #preventeStatut')[0]; return s && s.getEl() ? s.getEl().dom.innerText.trim() : null; });
    ok('Vente chargée : numéro rappelé en vert sur la même ligne', (await statut() || '').indexOf(v.ref + ' chargée') >= 0, await statut());

    /* vente introuvable : message sur la ligne, pas de fenetre, saisie preselectionnee */
    await nouvelleVente();
    await cliquer(p, champ);
    await p.waitForTimeout(300);
    await p.keyboard.type('999999_99999', { delay: 10 });
    await p.keyboard.press('Enter');
    await p.waitForTimeout(2500);
    ok('Vente introuvable : aucune fenêtre', !(await texteMessage(p)), await texteMessage(p));
    ok('Vente introuvable : message sur la même ligne', /Aucune vente en attente/.test(await statut() || ''), await statut());
    e = await etatChamp();
    ok('Vente introuvable : curseur dans la zone, saisie présélectionnée', e.focus && e.valeur === '999999_99999' && e.selection === '999999_99999', JSON.stringify(e));
    await p.keyboard.type('123', { delay: 10 });
    e = await etatChamp();
    ok('Le scan suivant remplace la saisie', e.valeur === '123', JSON.stringify(e));

    /* numero court : « 5 » = prevente du jour n° 5 */
    const v2 = await creer();
    const court = String(parseInt(v2.ref.split('_')[1], 10));
    let r2 = await scanner(court);
    ok('Saisie du seul numéro du jour (« ' + court + ' ») : prévente ' + v2.ref + ' chargée', r2.chargee === v2.id, JSON.stringify(r2));

    /* separateur perdu par la douchette */
    const v3 = await creer();
    r2 = await scanner(v3.ref.replace('_', ''));
    ok('Référence sans séparateur (« ' + v3.ref.replace('_', '') + ' ») : prévente chargée', r2.chargee === v3.id, JSON.stringify(r2));

    /* scan hors de la zone : curseur dans la recherche de produit */
    const v4 = await creer();
    await nouvelleVente();
    const produit = await p.evaluate(() => { const c = Ext.ComponentQuery.query('doventemanager #produit, doventemanager combobox[itemId=produit]')[0]
      || testextjs.app.getController('VenteCtr').getVnoproduitCombo(); c.focus(); return c ? c.getValue() : null; });
    await p.waitForTimeout(400);
    for (const ch of v4.ref) { await p.keyboard.type(ch, { delay: 0 }); }
    await p.keyboard.press('Enter');
    await p.waitForTimeout(3500);
    const charge4 = await p.evaluate(() => { const c = testextjs.app.getController('VenteCtr').current; return c && c.lgPREENREGISTREMENTID; });
    const produitApres = await p.evaluate(() => { const c = testextjs.app.getController('VenteCtr').getVnoproduitCombo(); return c.getRawValue(); });
    ok('Scan du ticket hors de la zone (curseur sur le produit) : prévente chargée', charge4 === v4.id, charge4);
    ok('Le champ produit garde sa valeur d\'avant le scan', !produitApres || produitApres === (produit || ''), JSON.stringify(produitApres));

    /* une saisie a la main lente n'est pas prise pour un scan */
    await nouvelleVente();
    await p.evaluate(() => { testextjs.app.getController('VenteCtr').getVnoproduitCombo().focus(); return true; });
    await p.keyboard.type('261028_00001', { delay: 120 });
    const lent = await p.evaluate(() => testextjs.app.getController('VenteCtr').getVnoproduitCombo().getRawValue());
    ok('Saisie lente dans le champ produit : laissée au champ produit', lent === '261028_00001', lent);
    await p.evaluate(() => { testextjs.app.getController('VenteCtr').getVnoproduitCombo().setValue(''); return true; });
    ok('Aucune erreur JavaScript, aucune fenêtre du navigateur', erreurs.length === 0 && dialogues.length === 0, erreurs.concat(dialogues).join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    for (const id of preventes.filter(Boolean)) { await p.evaluate((x) => fetch('../api/v1/ventestats/remove/' + x, { method: 'POST' }), id).catch(() => {}); }
    await b.close();
    const restantes = preventes.filter(Boolean).map((x) => `'${x}'`).join(',') || "''";
    ok('Préventes d\'essai retirées', q(`SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (${restantes}) AND str_STATUT IN ('is_Process', 'pending') AND b_IS_CANCEL = 0`) === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
