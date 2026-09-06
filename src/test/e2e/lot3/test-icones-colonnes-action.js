/* Assainissement de la classe « x-display-hide ».
   Cette classe n'existe dans aucune feuille de style : elle etait renvoyee pour AFFICHER une icone,
   et ne fonctionnait que par accident. Elle est remplacee partout par une chaine vide.
   On verifie ici, sur l'application deployee, que les icones concernees restent visibles et que
   celles qui doivent etre masquees le sont toujours. */
const { chromium } = require('playwright-core');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 260) + ']' : '')); }

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1700, height: 950 } });
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
  await p.waitForTimeout(3000);

  try {
    // La classe fantome ne doit exister nulle part, ni dans le code livre ni dans les styles.
    const dansLeCode = await p.evaluate(async () => {
      const fichiers = ['app/view/configmanagement/famille/FamilleManager.js',
        'app/view/commandemanagement/order/action/add.js',
        'app/view/sm_user/mvtcaisse/MvtCaisseManager.js',
        'app/view/stockmanagement/reserve/ReserveGrid.js'];
      const trouves = [];
      for (const f of fichiers) {
        const t = await (await fetch(f)).text();
        if (t.indexOf('x-display-hide') !== -1) { trouves.push(f); }
      }
      return trouves;
    });
    ok('la classe fantome a disparu des vues livrees', dansLeCode.length === 0, JSON.stringify(dansLeCode));

    /* On mesure l'EFFET des deux classes sur un element temoin, plutot que de parcourir les regles :
       les feuilles minifiees ne sont pas toutes lisibles par script, et c'est l'effet qui compte. */
    const dansLeStyle = await p.evaluate(() => {
      const mesurer = function (classe) {
        const temoin = document.createElement('div');
        temoin.className = classe;
        temoin.style.width = '20px';
        temoin.style.height = '20px';
        document.body.appendChild(temoin);
        const affiche = getComputedStyle(temoin).display !== 'none';
        temoin.remove();
        return affiche;
      };
      return { fantomeSansEffet: mesurer('x-display-hide'), vraieMasqueBien: !mesurer('x-hide-display') };
    });
    ok('la classe fantome n a effectivement aucun effet, elle n est definie nulle part',
       dansLeStyle.fantomeSansEffet, JSON.stringify(dansLeStyle));
    ok('la vraie classe de masquage, elle, masque bien', dansLeStyle.vraieMasqueBien, JSON.stringify(dansLeStyle));

    /* Comportement reel des deux ecritures dans une colonne d'action :
       chaine vide = icone visible ; « x-hide-display » = icone masquee. */
    const comportement = await p.evaluate(async () => {
      const grille = Ext.create('Ext.grid.Panel', {
        renderTo: Ext.getBody(), width: 460, height: 160,
        store: Ext.create('Ext.data.Store', { fields: ['montre'], data: [{ montre: true }, { montre: false }] }),
        columns: [{ dataIndex: 'montre', text: 'M' },
          { xtype: 'actioncolumn', width: 30, items: [{
              icon: 'resources/images/icons/fam/delete.png', tooltip: 'Action',
              getClass: function (v, m, enr) { return enr.get('montre') ? '' : 'x-hide-display'; } }] }]
      });
      await new Promise(r => setTimeout(r, 500));
      const icones = Array.from(grille.getEl().dom.querySelectorAll('.x-action-col-icon'));
      const etats = icones.map(i => ({
        classe: i.className,
        affichee: getComputedStyle(i).display !== 'none',
        largeur: Math.round(i.getBoundingClientRect().width)
      }));
      grille.destroy();
      return etats;
    });
    ok('la ligne « visible » affiche bien son icone',
       comportement[0] && comportement[0].affichee && comportement[0].largeur >= 16,
       JSON.stringify(comportement[0]));
    ok('la ligne « masquee » n a ni icone ni zone cliquable',
       comportement[1] && !comportement[1].affichee && comportement[1].largeur === 0,
       JSON.stringify(comportement[1]));

    /* Trois ecrans reels parmi les trente-quatre touches : les icones de ligne repondent present. */
    for (const [xtype, nom] of [['famillemanager', 'fiche article'], ['mvtcaissemanager', 'mouvements de caisse'],
                                ['tierspayantmanager', 'tiers payants']]) {
      await p.evaluate((x) => testextjs.app.getController('App').onRedirectTo(x, {}), xtype);
      await p.waitForTimeout(2600);
      const etat = await p.evaluate((x) => {
        const vue = Ext.ComponentQuery.query(x)[0];
        if (!vue) { return { ouvert: false }; }
        const el = vue.getEl().dom;
        const icones = Array.from(el.querySelectorAll('.x-action-col-icon'));
        const visibles = icones.filter(i => getComputedStyle(i).display !== 'none'
          && i.getBoundingClientRect().width >= 12);
        const fantomes = icones.filter(i => i.className.indexOf('x-display-hide') !== -1);
        return { ouvert: true, total: icones.length, visibles: visibles.length, fantomes: fantomes.length };
      }, xtype);
      ok('ecran ' + nom + ' : ouvert', etat.ouvert, JSON.stringify(etat));
      if (etat.ouvert && etat.total > 0) {
        ok('ecran ' + nom + ' : les icones de ligne sont visibles', etat.visibles > 0, JSON.stringify(etat));
        ok('ecran ' + nom + ' : aucune icone ne porte la classe fantome', etat.fantomes === 0, JSON.stringify(etat));
      }
    }

    ok('aucune erreur JavaScript', err.length === 0, err.slice(0, 3).join(' | '));
  } finally {
    await b.close();
  }
  const total = res.length, passes = res.filter(r => r.c).length;
  console.log('\n===== ' + passes + '/' + total + ' PASS =====');
  process.exit(passes === total ? 0 : 1);
})();
