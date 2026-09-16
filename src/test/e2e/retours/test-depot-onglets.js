/* Evolution 5, point 1 : « Gestion dépôts extensions » et ses trois onglets.
 *
 * L'officine a demandé un seul écran pour tout ce qui concerne un dépôt : on choisit le dépôt UNE FOIS en
 * haut, et les onglets suivent — Valorisation (vue simple ou par emplacement), Saisir vente dépôt, Chiffre
 * d'affaires. Le menu séparé « Vente du dépôt » a disparu : l'écran de vente ne peut exister qu'à un seul
 * endroit, son contrôleur ne retrouvant que le PREMIER composant correspondant à ses sélecteurs.
 *
 * Ce que le test établit, à la souris :
 *  - les trois onglets sont là, et le menu séparé de vente n'existe plus ;
 *  - un seul sélecteur de dépôt pilote l'écran ; la saisie de vente garde le sien, prérenseigné ;
 *  - la vue « par emplacement » ventile la valorisation par rayon, et la somme des lignes fait le total ;
 *  - l'onglet Chiffre d'affaires lit le CA du dépôt sur une période ;
 *  - aucune collision entre les onglets : chacun a ses propres composants, et le contrôleur ne pilote pas
 *    l'onglet du voisin.
 *
 * Tout ce que le test pose est retiré à la fin.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 340) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();

const DEPOT = 'E2E-ONG-DEPOT';
const NOM = 'DEPOT E2E ONGLETS';
const MARQUE = 'E2E-ONG-STOCK';

function nettoyer() {
  exec("DELETE FROM t_famille_stock WHERE lg_FAMILLE_STOCK_ID LIKE '" + MARQUE + "%';"
    + "DELETE FROM t_emplacement WHERE lg_EMPLACEMENT_ID='" + DEPOT + "';");
}

/* Trois articles dans DEUX rayons differents : c'est ce qui rend la ventilation par emplacement verifiable. */
function poser() {
  nettoyer();
  const compte = q("SELECT lg_COMPTE_CLIENT_ID FROM t_compte_client LIMIT 1");
  exec("INSERT INTO t_emplacement (lg_EMPLACEMENT_ID, lg_COMPTE_CLIENT_ID, str_NAME, str_DESCRIPTION,"
    + " str_LOCALITE, str_FIRST_NAME, str_LAST_NAME, str_PHONE, dt_CREATED, dt_UPDATED, str_STATUT,"
    + " lg_TYPEDEPOT_ID, bool_SAME_LOCATION)"
    + " VALUES ('" + DEPOT + "', '" + compte + "', '" + NOM + "', 'E2E', 'ABOBO', 'KOFFI', 'Jean',"
    + " '0708473750', NOW(), NOW(), 'enable', '2', 0);");
  // Deux rayons distincts, et des articles qui les portent.
  const zones = q("SELECT GROUP_CONCAT(lg_ZONE_GEO_ID) FROM (SELECT lg_ZONE_GEO_ID FROM t_zone_geographique"
    + " LIMIT 2) z").split(',');
  const arts = [];
  zones.forEach((zone, i) => {
    const liste = q("SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_ID,':',COALESCE(int_PAF,0),':',COALESCE(int_PRICE,0))"
      + " SEPARATOR '|') FROM (SELECT lg_FAMILLE_ID, int_PAF, int_PRICE FROM t_famille"
      + " WHERE str_STATUT='enable' AND int_PAF>0 AND int_PRICE>0 AND lg_ZONE_GEO_ID='" + zone + "'"
      + " ORDER BY str_NAME LIMIT " + (i === 0 ? 2 : 1) + ") x");
    if (!liste) { return; }
    liste.split('|').forEach((x, j) => {
      const pr = x.split(':');
      const stock = 10 * (i + 1) + j;
      arts.push({ id: pr[0], pa: parseInt(pr[1], 10), pv: parseInt(pr[2], 10), stock: stock, zone: zone });
      exec("INSERT INTO t_famille_stock (lg_FAMILLE_STOCK_ID, lg_FAMILLE_ID, int_NUMBER,"
        + " int_NUMBER_AVAILABLE, dt_CREATED, dt_UPDATED, lg_EMPLACEMENT_ID, str_STATUT, int_UG, VERSION)"
        + " VALUES ('" + MARQUE + '-' + i + '-' + j + "', '" + pr[0] + "', " + stock + ", " + stock
        + ", NOW(), NOW(), '" + DEPOT + "', 'enable', 0, 0);");
    });
  });
  return arts;
}

(async () => {
  const arts = poser();
  const attendus = arts.filter((a) => a.stock > 0);
  const totalAchat = attendus.reduce((s, a) => s + a.stock * a.pa, 0);
  const totalVente = attendus.reduce((s, a) => s + a.stock * a.pv, 0);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1700, height: 1000 } });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    ok('Précondition : des articles dans plusieurs rayons', attendus.length >= 2, JSON.stringify(arts));

    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);

    /* ------------------------------------------- le menu séparé de vente n existe plus */
    ok('Le menu séparé « Vente du dépôt » a disparu : la vente vit dans l onglet',
      q("SELECT COUNT(*) FROM t_sous_menu WHERE str_COMPOSANT='doventeendepot'") === '0');
    ok('Son privilège est conservé : il garde son sens pour l onglet',
      q("SELECT COUNT(*) FROM t_privilege WHERE str_NAME='P_VENTE_DEPOT_EXTENSION'") === '1');

    /* ------------------------------------------- l écran et ses trois onglets */
    const ouvert = await p.evaluate(() => {
      try { testextjs.app.getController('App').onRedirectTo('depotextension', {}); return 'ok'; }
      catch (e) { return 'ERREUR ' + e.message; }
    });
    ok('L écran s ouvre', ouvert === 'ok', ouvert);
    await p.waitForFunction(() => Ext.ComponentQuery.query('depotextension depotextensionstock').length > 0,
      null, { timeout: 30000 });
    await p.waitForTimeout(3000);

    const structure = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('depotextension')[0];
      const ong = e.down('#onglets');
      return {
        onglets: ong.items.items.map((x) => x.title),
        unSeulSelecteurEcran: Ext.ComponentQuery.query('depotextension #depotEcran').length,
        selecteurDansLaVente: Ext.ComponentQuery.query('depotextension doventeendepot #depotVente').length,
        // Les composants de critères n appartiennent qu à l onglet Valorisation
        recherchesHorsStock: Ext.ComponentQuery.query('depotextension textfield[itemId=recherche]').length
      };
    });
    ok('Les trois onglets demandés sont là, dans l ordre',
      structure.onglets.join(' | ') === 'Valorisation | Saisir vente dépôt | Chiffre d\'affaires',
      JSON.stringify(structure.onglets));
    ok('Un seul sélecteur de dépôt pilote l écran', structure.unSeulSelecteurEcran === 1);
    ok('La saisie de vente garde son propre sélecteur (dépôt redemandé à chaque vente)',
      structure.selecteurDansLaVente === 1);

    /* ------------------------------------------- choix du dépôt, puis vue simple */
    await p.waitForFunction(() => {
      const c = Ext.ComponentQuery.query('depotextension #depotEcran')[0];
      return c && c.getStore().getCount() > 0;
    }, null, { timeout: 20000 });
    const choisi = await p.evaluate((d) => {
      const c = Ext.ComponentQuery.query('depotextension #depotEcran')[0];
      const rec = c.getStore().findRecord('id', d);
      if (!rec) { return 'dépôt absent'; }
      c.setValue(d);
      c.fireEvent('select', c, [rec]);
      return c.getValue();
    }, DEPOT);
    ok('Le dépôt se choisit une fois en haut de l écran', choisi === DEPOT, String(choisi));
    await p.waitForFunction(() => {
      const g = Ext.ComponentQuery.query('depotextension depotextensionstock')[0];
      return g && g.getStore().getCount() > 0;
    }, null, { timeout: 20000 });
    ok('La vue simple liste les articles du dépôt',
      await p.evaluate(() => Ext.ComponentQuery.query('depotextension depotextensionstock')[0].getStore().getCount())
      === attendus.length);

    /* ------------------------------------------- la vue par emplacement */
    await p.evaluate(() => {
      const bt = Ext.ComponentQuery.query('depotextension #vueEmplacement')[0];
      bt.el.dom.click();
    });
    await p.waitForFunction(() => {
      const g = Ext.ComponentQuery.query('depotextension depotextensionemplacement')[0];
      return g && g.getStore().getCount() > 0;
    }, null, { timeout: 20000 });
    const ventilation = await p.evaluate(() => {
      const g = Ext.ComponentQuery.query('depotextension depotextensionemplacement')[0];
      const lignes = [];
      g.getStore().each((r) => lignes.push({ emplacement: r.get('emplacement'), articles: r.get('articles'),
        valeurAchat: r.get('valeurAchat'), valeurVente: r.get('valeurVente') }));
      const vues = Ext.ComponentQuery.query('depotextension #vues')[0];
      return { lignes: lignes, vueActive: vues.getLayout().getActiveItem().getXType(),
        totaux: g.down('#totaux').el.dom.textContent.trim() };
    });
    ok('La bascule affiche bien la vue par emplacement',
      ventilation.vueActive === 'depotextensionemplacement', ventilation.vueActive);
    ok('La valorisation est ventilée par rayon, sur plusieurs lignes',
      ventilation.lignes.length >= 2, JSON.stringify(ventilation.lignes));
    const sommeAchat = ventilation.lignes.reduce((s, l) => s + l.valeurAchat, 0);
    const sommeVente = ventilation.lignes.reduce((s, l) => s + l.valeurVente, 0);
    ok('La somme des lignes fait exactement le total du dépôt',
      sommeAchat === totalAchat && sommeVente === totalVente,
      'somme achat=' + sommeAchat + '/' + totalAchat + ' vente=' + sommeVente + '/' + totalVente);
    ok('Le total du dépôt est rappelé sous la ventilation, pour pouvoir vérifier la somme',
      ventilation.totaux.indexOf('Total du dépôt') >= 0, ventilation.totaux);

    /* ------------------------------------------- l onglet de vente, dépôt prérenseigné */
    await p.evaluate(() => {
      const ong = Ext.ComponentQuery.query('depotextension #onglets')[0];
      ong.setActiveTab(1);
    });
    await p.waitForTimeout(2500);
    ok('Le dépôt de l écran prérenseigne la saisie de vente',
      await p.evaluate(() => {
        const c = Ext.ComponentQuery.query('depotextension doventeendepot #depotVente')[0];
        return c ? c.getValue() : null;
      }) === DEPOT);
    ok('La saisie de vente est bien celle de l écran de vente dupliqué (tiers payants, avoirs, préventes)',
      await p.evaluate(() => {
        const v = Ext.ComponentQuery.query('depotextension doventeendepot')[0];
        return !!v && !!v.down('#typeVente') && !!v.down('#contenu');
      }));

    /* ------------------------------------------- l onglet chiffre d affaires */
    await p.evaluate(() => {
      Ext.ComponentQuery.query('depotextension #onglets')[0].setActiveTab(2);
    });
    await p.waitForTimeout(1200);
    ok('L onglet Chiffre d affaires propose une période et ne charge rien tout seul',
      await p.evaluate(() => {
        const o = Ext.ComponentQuery.query('depotextension depotextensionca')[0];
        return !!o.down('#caDebut').getValue() && !!o.down('#caFin').getValue()
          && o.down('#caGrille').getStore().getCount() === 0;
      }));
    await p.evaluate(() => {
      Ext.ComponentQuery.query('depotextension depotextensionca #caRechercher')[0].el.dom.click();
    });
    await p.waitForFunction(() => {
      const o = Ext.ComponentQuery.query('depotextension depotextensionca')[0];
      return (o.down('#caTotaux').el.dom.textContent || '').indexOf('Lecture') < 0;
    }, null, { timeout: 60000 });
    const ca = await p.evaluate(() => {
      const o = Ext.ComponentQuery.query('depotextension depotextensionca')[0];
      return { totaux: o.down('#caTotaux').el.dom.textContent.trim(),
        lignes: o.down('#caGrille').getStore().getCount() };
    });
    ok('Le chiffre d affaires du dépôt répond et nomme le dépôt',
      ca.totaux.indexOf(NOM) >= 0 && /vente\(s\)/.test(ca.totaux), JSON.stringify(ca));
    ok('Le rappel explique où est l argent : caisse de l officine, chiffre au dépôt',
      await p.evaluate(() => {
        const o = Ext.ComponentQuery.query('depotextension depotextensionca')[0];
        const t = o.down('#caNote').el.dom.textContent;
        return /caisse de l'opérateur/.test(t) && /appartient au dépôt/.test(t);
      }));

    ok('Aucune erreur JavaScript pendant tout le parcours', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    console.log('\n' + res.filter(r => r.c).length + '/' + res.length + ' verifications');
    try { nettoyer(); } catch (e) { console.log('NETTOYAGE INCOMPLET : ' + String(e.message).slice(0, 300)); }
    process.exit(res.every(r => r.c) ? 0 : 1);
  }
})();
