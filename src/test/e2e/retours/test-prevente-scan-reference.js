/* VENTE : SCAN DU TICKET DE PREVENTE DE L'APPLICATION MOBILE (retour du 25/10).
 *
 * Le ticket de prevente de l'application mobile porte la reference (« 261025_00145 »). Selon la disposition du
 * clavier emulee par la douchette, le « _ » arrive comme « ) » : « 261025)00145 », et la vente n'etait pas retrouvee.
 * Par les vues (admin), SERVICE CLIENT > Ventes > Nouvelle vente, champ « N° ticket / scan » :
 *  - reference tapee avec « ) » a la place de « _ » : la prevente est chargee ;
 *  - meme chose avec un autre separateur mal lu (« ° ») ; identifiant du QR Prestige avec « ) » au lieu de « - » ;
 *  - le champ montre la valeur corrigee ; une saisie avec apostrophe ne charge rien (recherche en parametres) ;
 *  - reference exacte : toujours chargee ;
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
    /* une prevente neuve par cas : une prevente chargee a la caisse n'est plus en attente */
    const creer = async () => {
      const add = await api('POST', '../api/v1/vente/add/vno', { typeVenteId: '1', natureVenteId: '1', produitId: FID, itemPu: parseInt(PU, 10), qte: 1, qteServie: 1,
        devis: false, prevente: true, remiseId: '', userVendeurId: ADMIN });
      const id = add.data && add.data.lgPREENREGISTREMENTID;
      preventes.push(id);
      await api('PUT', '../api/v1/vente/terminerprevente/' + id);
      return { id, ref: q(`SELECT str_REF FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${id}'`) };
    };
    let v = await creer();
    ok('Précondition : prévente d\'essai créée, référence AAMMJJ_NNNNN', /^\d{6}_\d{5}$/.test(v.ref), v.ref);
    let r = await scanner(v.ref.replace('_', ')'));
    ok('« ' + v.ref.replace('_', ')') + ' » (« ) » au lieu de « _ ») : prévente chargée', r.chargee === v.id, JSON.stringify(r));
    let affiche = await p.evaluate(() => Ext.ComponentQuery.query('doventemanager #preventeSearchField')[0].getValue());
    ok('Le champ montre la référence corrigée', affiche === v.ref, affiche);
    v = await creer();
    r = await scanner(v.ref.replace('_', '°'));
    ok('« ' + v.ref.replace('_', '°') + ' » : prévente chargée', r.chargee === v.id, JSON.stringify(r));
    v = await creer();
    r = await scanner(v.ref);
    ok('Référence exacte : prévente chargée', r.chargee === v.id, JSON.stringify(r));
    v = await creer();
    r = await scanner(v.id.replace(/-/g, ')'));
    ok('Identifiant (QR du ticket Prestige) avec « ) » au lieu de « - » : prévente chargée', r.chargee === v.id, JSON.stringify(r));
    r = await scanner("261025' OR '1'='1");
    ok('Saisie avec apostrophe : aucune vente chargée, message « aucune prévente »', !r.chargee && /Aucune prévente/.test(r.msg || ''), JSON.stringify(r));
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
