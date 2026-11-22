/* ECRAN DE VENTE : ICONES DESSINEES DES BOUTONS (plan du 21/11, point 7.1 ; reponse du 22/11 : « on essaie »).
 *
 * Sept boutons recoivent une icone dessinee au trait du theme (bleu #1E5FA8 ; vert pour terminer, orange pour mettre
 * en attente), chacune sur un fond blanc arrondi pour rester lisible sur un bouton clair ou fonce :
 *   Modifier le client, Suivi conso, Nouvel ayant droit, TERMINER LA VENTE, METTRE EN ATTENTE, Ventes en attente,
 *   POINT MOBILE MONEY ; dans la vente au comptant et dans la vente en depot.
 * Par les vues (admin) : Service client > Ventes > Nouvelle vente, a 1366×768, 1280×720 et 1920×1080 :
 *  - chaque bouton porte sa classe ic7-… et l'image dessinee est bien celle affichee (data:image/svg+xml), chargee ;
 *  - boutons visibles : icone de 24 px dans les actions de la vente (16 px ailleurs), dans le bouton, a gauche du
 *    libelle, libelle entier (non coupe) ;
 *  - boutons caches tant qu'ils ne servent pas (client, droit, assurance) : la meme regle les dessine (bouton temoin) ;
 *  - vente en depot et grilles des ayants droit : memes classes dans les sources servies ;
 *  - aucune erreur JavaScript. Bilan : l'ouverture de l'ecran n'ecrit aucune vente.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const BOUTONS = [['btnCloture', 'terminer', 24], ['btnStandBy', 'attente', 24], ['preventeSearchBtn', 'ventes-attente', 16], ['suiviConsoClient', 'suivi', 16],
  ['modifierClientStandard', 'client', 16], ['btnPointMobileMoney', 'mobile', 16]];
const TAILLES = [[1366, 768], [1280, 720], [1920, 1080]];

(async () => {
  const ventes0 = q("SELECT COUNT(*) FROM t_preenregistrement WHERE dt_CREATED >= NOW() - INTERVAL 1 DAY");
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const erreurs = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  const mesurer = () => p.evaluate((liste) => {
    const v = Ext.ComponentQuery.query('doventemanager').filter((x) => x.isVisible(true))[0];
    return liste.map(([id, nom, px]) => {
      const bt = v.down('#' + id);
      if (!bt) { return { id, absent: true }; }
      const o = { id, classe: (bt.iconCls || '').split(' ').includes('ic7-' + nom), visible: bt.isVisible(true) };
      if (o.visible && bt.btnIconEl) {
        const ic = bt.btnIconEl.dom, r = ic.getBoundingClientRect(), rb = bt.getEl().dom.getBoundingClientRect(), inner = bt.btnInnerEl.dom, ri = inner.getBoundingClientRect();
        const st = getComputedStyle(ic);
        o.image = /^url\("?data:image\/svg\+xml/.test(st.backgroundImage);
        o.taille = Math.round(r.width) + 'x' + Math.round(r.height) + '/' + st.backgroundSize;
        o.tailleOk = Math.round(r.width) === px && Math.round(r.height) === px && (st.backgroundSize === px + 'px ' + px + 'px' || st.backgroundSize === px + 'px');
        o.dedans = r.left >= rb.left - 1 && r.right <= rb.right + 1 && r.top >= rb.top - 1 && r.bottom <= rb.bottom + 1;
        /* position du texte lui-meme : la zone du libelle englobe la marge reservee a l'icone */
        const rg = document.createRange(); rg.selectNodeContents(inner); const rt = rg.getBoundingClientRect();
        o.aGauche = rt.width > 0 && r.right <= rt.left + 2 && r.left >= rb.left - 1;
        o.libelleEntier = inner.scrollWidth <= inner.clientWidth + 1;
      }
      return o;
    });
  }, BOUTONS);
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'SERVICE CLIENT', 'Ventes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('cloturerventemanager #addBtn').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await cliquer(p, 'cloturerventemanager #addBtn');
    await p.waitForFunction(() => Ext.ComponentQuery.query('doventemanager #btnCloture').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    for (const [l, h] of TAILLES) {
      await p.setViewportSize({ width: l, height: h }); await p.waitForTimeout(900);
      const m = await mesurer();
      const absents = m.filter((x) => x.absent || !x.classe).map((x) => x.id);
      ok(`${l}×${h} : les six boutons de la vente portent leur icône ic7`, absents.length === 0, JSON.stringify(absents));
      const vis = m.filter((x) => x.visible);
      const defauts = vis.filter((x) => !x.image || !x.tailleOk || !x.dedans || !x.aGauche || !x.libelleEntier);
      ok(`${l}×${h} : boutons visibles (${vis.map((x) => x.id).join(', ')}) : image dessinée, 24 px dans les actions et 16 px ailleurs, dans le bouton, à gauche, libellé entier`,
        vis.length >= 3 && defauts.length === 0, JSON.stringify(defauts.length ? defauts : vis));
    }
    await p.setViewportSize({ width: 1366, height: 768 }); await p.waitForTimeout(600);

    /* toutes les icones, y compris celles des boutons caches : un bouton temoin par classe, image chargee */
    const temoins = await p.evaluate(async () => {
      const noms = ['client', 'suivi', 'ayant', 'terminer', 'attente', 'ventes-attente', 'mobile'], out = {};
      for (const n of noms) {
        const bt = Ext.create('Ext.button.Button', { text: 'Témoin', iconCls: 'ic7 ic7-' + n, renderTo: Ext.getBody(), style: 'position:absolute;left:-500px;top:0' });
        const bg = getComputedStyle(bt.btnIconEl.dom).backgroundImage, m = /^url\("?(.*?)"?\)$/.exec(bg);
        const charge = m ? await new Promise((ok) => { const i = new Image(); i.onload = () => ok(i.naturalWidth > 0 || i.width > 0); i.onerror = () => ok(false); i.src = m[1]; }) : false;
        out[n] = { svg: /data:image\/svg\+xml/.test(bg), charge };
        bt.destroy();
      }
      return out;
    });
    const ko = Object.keys(temoins).filter((n) => !temoins[n].svg || !temoins[n].charge);
    ok('Les sept icônes sont des images dessinées qui se chargent (boutons cachés compris)', Object.keys(temoins).length === 7 && ko.length === 0, JSON.stringify(temoins));

    /* vente en depot et grilles des ayants droit : sources servies */
    const sources = await p.evaluate(async () => {
      const lire = async (u) => (await fetch(u + '?_=' + Date.now())).text();
      const depot = await lire('app/view/vente/endepot/VenteEnDepotView.js'), ad1 = await lire('app/view/vente/user/AyantDroitGrid.js'), ad2 = await lire('app/view/vente/endepot/AyantDroitGrid.js');
      return { depot: /ic7 ic7-ventes-attente/.test(depot) && /ic7 ic7-mobile/.test(depot),
        ayant: [ad1, ad2].every((s) => /addBtnAyantDroit',\s*\/\*[^*]*\*\/\s*iconCls: 'ic7 ic7-ayant'/.test(s)) };
    });
    ok('Vente en dépôt (Ventes en attente, Point mobile money) et « Nouvel ayant droit » : mêmes icônes', sources.depot && sources.ayant, JSON.stringify(sources));
    ok('Bilan : l\'ouverture de l\'écran n\'écrit aucune vente', q("SELECT COUNT(*) FROM t_preenregistrement WHERE dt_CREATED >= NOW() - INTERVAL 1 DAY") === ventes0);
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
