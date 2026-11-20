/* VENTE : PRIX UNITAIRE DECIMAL SAISI DANS LA GRILLE (journal de Pontmain, 17/11 ; leana, capitale).
 *
 * « Valeur saisie invalide pour itemPu : un nombre entier est attendu » (400) sur vente/update/item/vno : la cellule
 * P.U. acceptait le point, un prix decimal partait au serveur.
 * Parcours par les vues (admin, SERVICE CLIENT > Ventes > nouvelle vente, un article), clic sur la cellule P.U.,
 * frappe au clavier, Entree :
 *  - « 12,5 » puis « 1,500 » (virgule decimale du poste en francais ; le point est deja refuse a la frappe par l'editeur) : refus par un bandeau (pas de fenetre), prix precedent garde a l'ecran et en base,
 *    aucune requete de modification envoyee, aucun refus du serveur ;
 *  - un prix entier (prix d'origine + 5) : envoye, accepte ; rapprochement ecran / requete / base (prix unitaire et
 *    montant de la ligne = prix x quantite) ;
 *  - aucune erreur JavaScript, aucune fenetre.
 * La vente d'essai et le stock de l'article sont remis a la fin.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const [PRODUIT, CIP, STOCK, STOCK_TOTAL] = q("SELECT f.lg_FAMILLE_ID, f.int_CIP, s.int_NUMBER_AVAILABLE, s.int_NUMBER FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID"
  + " AND s.lg_EMPLACEMENT_ID = '1' WHERE f.str_STATUT = 'enable' AND s.int_NUMBER_AVAILABLE > 50 AND LENGTH(f.int_CIP) = 7 AND IFNULL(f.bool_DECONDITIONNE, 0) = 0"
  + " ORDER BY f.int_CIP DESC LIMIT 1 OFFSET 3").split('\t');
const ventes = [];

function nettoyer() {
  for (const v of ventes) {
    const det = "(SELECT lg_PREENREGISTREMENT_DETAIL_ID FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + v + "')";
    q("DELETE FROM hmvtproduit WHERE lg_PREENREGISTREMENT_DETAIL_ID IN " + det + "; DELETE FROM t_preenregistrement_compte_client WHERE lg_PREENREGISTREMENT_ID = '" + v + "';"
      + " DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + v + "'; DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v + "'");
  }
  q("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = " + STOCK + ", int_NUMBER = " + STOCK_TOTAL + " WHERE lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID = '" + PRODUIT + "'");
}

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const dialogues = []; p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  const modifs = []; p.on('request', (r) => { if (/vente\/update\/item\/vno/.test(r.url())) { modifs.push(r.postData()); } });
  const echecs = []; p.on('response', (r) => { if (/vente\/update\/item\/vno/.test(r.url()) && r.status() >= 400) { echecs.push(r.status()); } });
  const boites = () => p.evaluate(() => (Ext.MessageBox.isVisible() ? [Ext.MessageBox.msg.getEl().dom.innerText] : []));
  try {
    ok('Jeu d\'essai : un article en stock', !!CIP, CIP);
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'SERVICE CLIENT', 'Ventes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('cloturerventemanager #addBtn').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await cliquer(p, 'cloturerventemanager #addBtn');
    const CHAMP = 'doventemanager #contenu [xtype=fieldcontainer] #produit';
    await p.waitForFunction((r) => Ext.ComponentQuery.query(r).some((x) => x.isVisible(true)), CHAMP, { timeout: 60000 });
    await p.waitForTimeout(1500);
    await cliquer(p, CHAMP);
    await p.keyboard.type(CIP, { delay: 30 });
    await p.keyboard.press('Enter');
    await p.waitForFunction(() => { const c = testextjs.app.getController('VenteCtr').current; return c && parseInt(c.intPRICE, 10) > 0; }, null, { timeout: 20000 });
    const vente = await p.evaluate(() => testextjs.app.getController('VenteCtr').current.lgPREENREGISTREMENTID);
    ventes.push(vente);
    await p.waitForLoadState('networkidle').catch(() => {});
    await p.waitForTimeout(1200);
    const prixBase = () => q("SELECT CONCAT(int_PRICE_UNITAIR, '/', int_PRICE, '/', int_QUANTITY) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + vente + "' LIMIT 1");
    const prixEcran = () => p.evaluate(() => { const g = Ext.ComponentQuery.query('doventemanager gridpanel').filter((x) => x.isVisible(true) && x.getStore().getCount() > 0)[0];
      const r = g.getStore().getAt(0); return r.get('intPRICEUNITAIR') + '/' + r.get('intPRICE') + '/' + r.get('intQUANTITY'); });
    const avant = prixBase();
    const pu0 = Number(avant.split('/')[0]);
    const taper = async (texte) => {
      const id = await p.evaluate(() => { const g = Ext.ComponentQuery.query('doventemanager gridpanel').filter((x) => x.isVisible(true) && x.getStore().getCount() > 0)[0];
        const col = g.columns.filter((c) => c.dataIndex === 'intPRICEUNITAIR')[0]; const cell = g.getView().getCell(g.getStore().getAt(0), col);
        cell.dom.id = cell.dom.id || 'e2e-pu'; return cell.dom.id; });
      await p.click('#' + id);
      await p.waitForTimeout(500);
      await p.keyboard.press('Control+A');
      await p.keyboard.type(texte, { delay: 40 });
      await p.keyboard.press('Enter');
      await p.waitForLoadState('networkidle').catch(() => {});
      await p.waitForTimeout(1500);
    };
    ok('Ouverture : le prix de la ligne à l\'écran = base', (await prixEcran()) === avant, (await prixEcran()) + ' / ' + avant);
    let nbBandeaux = 0;
    for (const t of ['12,5', '1,500']) {
      const n = modifs.length;
      await taper(t);
      const bandeaux = await p.evaluate(() => Array.from(document.querySelectorAll('.prestige-toast')).map((x) => x.textContent).filter((x) => /nombre entier de francs/.test(x)));
      /* le plus recent est en tete ; ExtJS a deja ramene « 1,500 » a « 1,5 » a la validation */
      const bandeau = bandeaux.length === nbBandeaux + 1 ? bandeaux[0] : '';
      nbBandeaux = bandeaux.length;
      const ecran = await prixEcran(), base = prixBase(), mb = await boites();
      ok(`P.U. « ${t} » : refusé par un bandeau, rien d'envoyé, prix précédent gardé à l'écran et en base`,
        modifs.length === n && echecs.length === 0 && /conservé/.test(bandeau) && ecran === avant && base === avant && mb.length === 0,
        `envois ${modifs.length - n} refus ${echecs.join(',')} écran ${ecran} base ${base} fenêtre ${mb.join(' ')} « ${bandeau.slice(0, 120)} »`);
      if (mb.length) { await p.keyboard.press('Enter').catch(() => {}); }
      await p.keyboard.press('Escape').catch(() => {});
      await p.waitForTimeout(300);
    }
    const nouveau = pu0 + 5;
    const n = modifs.length;
    await taper(String(nouveau));
    const envoi = modifs.slice(n).map((m) => { try { return JSON.parse(m).itemPu; } catch (e) { return m; } });
    const apres = prixBase();
    const [pu, mt, qte] = apres.split('/').map(Number);
    ok('P.U. entier : envoyé une fois, accepté', envoi.length === 1 && Number(envoi[0]) === nouveau && echecs.length === 0, JSON.stringify(envoi) + ' ' + echecs.join(','));
    ok('Rapprochement écran / requête / base : prix unitaire, montant = prix × quantité', pu === nouveau && mt === pu * qte && (await prixEcran()) === apres, `base ${apres} écran ${await prixEcran()}`);
    ok('Aucune fenêtre', dialogues.length === 0 && (await boites()).length === 0, dialogues.join(' | '));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Vente d\'essai retirée, stock remis', ventes.every((v) => q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v + "'") === '0')
      && q("SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID = '" + PRODUIT + "'") === STOCK);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
