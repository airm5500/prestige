/* ECRAN DE VENTE : ICONES DESSINEES DES BOUTONS (plan du 21/11, point 7.1 ; reponse du 22/11 : « on essaie »).
 *
 * Sept boutons recoivent une icone dessinee au trait du theme (bleu #1E5FA8 ; vert pour terminer, orange pour mettre
 * en attente), chacune sur un fond blanc arrondi pour rester lisible sur un bouton clair ou fonce :
 *   Modifier le client, Suivi conso, Nouvel ayant droit, TERMINER LA VENTE, METTRE EN ATTENTE, Ventes en attente,
 *   POINT MOBILE MONEY ; dans la vente au comptant et dans la vente en depot.
 * Retour du 22/11 (« les icones et boutons n'ont pas change ») : FICHE CLIENT, AFFICHER NET A PAYER, RETOUR, icones des
 * cartes assure et ayant droit, « Generer » et « Retirer » du numero de bon.
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
  ['modifierClientStandard', 'client', 16], ['btnPointMobileMoney', 'mobile', 16],
  /* retour du 22/11 : icones restantes */
  ['btnFicheClient', 'fiche', 24], ['netBtn', 'afficheur', 24], ['btnGoBack', 'retour', 24],
  ['btnModifierInfo', 'client', 16], ['suiviConsoAssure', 'suivi', 16], ['btnModifierAyant', 'ayant', 16]];
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
      ok(`${l}×${h} : les douze boutons de la vente portent leur icône ic7`, absents.length === 0, JSON.stringify(absents));
      const vis = m.filter((x) => x.visible);
      const defauts = vis.filter((x) => !x.image || !x.tailleOk || !x.dedans || !x.aGauche || !x.libelleEntier);
      ok(`${l}×${h} : boutons visibles (${vis.map((x) => x.id).join(', ')}) : image dessinée, 24 px dans les actions et 16 px ailleurs, dans le bouton, à gauche, libellé entier`,
        vis.length >= 3 && defauts.length === 0, JSON.stringify(defauts.length ? defauts : vis));
    }
    await p.setViewportSize({ width: 1366, height: 768 }); await p.waitForTimeout(600);

    /* toutes les icones, y compris celles des boutons caches : un bouton temoin par classe, image chargee */
    const temoins = await p.evaluate(async () => {
      const noms = ['client', 'suivi', 'ayant', 'terminer', 'attente', 'ventes-attente', 'mobile', 'fiche', 'afficheur', 'retour', 'generer', 'retirer'], out = {};
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
    ok('Les douze icônes sont des images dessinées qui se chargent (boutons cachés compris)', Object.keys(temoins).length === 12 && ko.length === 0, JSON.stringify(temoins));

    /* retour du 22/11 : « aucun relief, on ne sent pas qu'il y a des boutons » (cartes assure et ayant droit, bouton
     * vp-btn-plat). Les boutons des cartes n'apparaissent qu'avec un client assure choisi (ce qui ouvrirait une
     * vente) : un bouton temoin de la meme classe est pose dans l'ecran de vente, et la vraie souris le survole puis
     * l'enfonce. Relief = fond degrade, bord visible, ombre portee ; survol : bord plus fonce, ombre plus grande ;
     * clic : ombre interieure (le bouton s'enfonce). */
    const idTemoin = await p.evaluate(() => {
      const v = Ext.ComponentQuery.query('doventemanager').filter((x) => x.isVisible(true))[0];
      /* dans la zone .vp-vente qui porte les cartes (celle des boutons de la vente) */
      const zone = v.down('#btnModifierInfo').getEl() ? v.down('#btnModifierInfo').getEl().up('.vp-vente') : v.down('#btnCloture').getEl().up('.vp-vente');
      const bt = Ext.create('Ext.button.Button', { iconCls: 'ic7 ic7-client', cls: 'vp-btn-plat', width: 34, height: 34, renderTo: zone,
        style: 'position:absolute;left:300px;top:200px;z-index:99999' });
      window.__temoinRelief = bt; return bt.getId();
    });
    const relief = () => p.evaluate(() => { const bt = window.__temoinRelief, s = getComputedStyle(bt.getEl().dom), ic = bt.btnIconEl.dom.getBoundingClientRect();
      return { fond: s.backgroundImage, bord: s.borderTopWidth + ' ' + s.borderTopStyle + ' ' + s.borderTopColor, rayon: s.borderTopLeftRadius, ombre: s.boxShadow,
        dansVente: !!bt.getEl().up('.vp-vente'), icone: Math.round(ic.width) }; });
    await p.mouse.move(5, 5); await p.waitForTimeout(300);
    const r0 = await relief();
    await p.hover('#' + idTemoin); await p.waitForTimeout(400);
    const r1 = await relief();
    const boite = await p.locator('#' + idTemoin).boundingBox();
    await p.mouse.move(boite.x + boite.width / 2, boite.y + boite.height / 2); await p.mouse.down(); await p.waitForTimeout(300);
    const r2 = await relief();
    await p.mouse.up(); await p.mouse.move(5, 5);
    await p.evaluate(() => { window.__temoinRelief.destroy(); delete window.__temoinRelief; });
    ok('Boutons des cartes assuré et ayant droit : relief (fond dégradé, bord visible, ombre portée), icône de 22 px dans son cadre', r0.dansVente && /linear-gradient/.test(r0.fond)
      && /^1px solid/.test(r0.bord) && r0.rayon !== '0px' && r0.ombre !== 'none' && !/^inset/.test(r0.ombre) && r0.icone === 22, JSON.stringify(r0));
    ok('… au survol : bord plus foncé et ombre plus grande', r1.bord !== r0.bord && r1.ombre !== r0.ombre && !/^inset/.test(r1.ombre), JSON.stringify(r1));
    ok('… au clic : le bouton s\'enfonce (ombre intérieure)', /inset/.test(r2.ombre) && r2.ombre.split(/,(?![^(]*\))/).length === 1 && r2.ombre !== r0.ombre, JSON.stringify(r2));

    /* vente en depot et grilles des ayants droit : sources servies */
    const sources = await p.evaluate(async () => {
      const lire = async (u) => (await fetch(u + '?_=' + Date.now())).text();
      const depot = await lire('app/view/vente/endepot/VenteEnDepotView.js'), ad1 = await lire('app/view/vente/user/AyantDroitGrid.js'), ad2 = await lire('app/view/vente/endepot/AyantDroitGrid.js');
      const c1 = await lire('app/controller/VenteCtr.js'), c2 = await lire('app/controller/VenteEnDepotCtr.js');
      return { depot: /ic7 ic7-ventes-attente/.test(depot) && /ic7 ic7-mobile/.test(depot),
        bon: [c1, c2].every((s) => /text: 'Générer',\s*iconCls: 'ic7 ic7-generer'/.test(s) && /text: 'Retirer',\s*iconCls: 'ic7 ic7-retirer'/.test(s) && !/fam\/delete\.png/.test(s.slice(s.indexOf("text: 'Retirer'") - 200, s.indexOf("text: 'Retirer'") + 300))),
        ayant: [ad1, ad2].every((s) => /addBtnAyantDroit',\s*\/\*[^*]*\*\/\s*iconCls: 'ic7 ic7-ayant'/.test(s)) };
    });
    ok('Vente en dépôt (Ventes en attente, Point mobile money), « Nouvel ayant droit », « Générer » et « Retirer » du bon (comptant et dépôt) : mêmes icônes', sources.depot && sources.ayant && sources.bon, JSON.stringify(sources));
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
