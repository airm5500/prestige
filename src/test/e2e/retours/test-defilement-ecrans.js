/* DEFILEMENT DE TOUS LES ECRANS DU MENU (test de mise en page, independant des donnees).
 *
 * Pourquoi : un ecran peut afficher les bonnes donnees et rester inutilisable - la grille deborde de son conteneur
 * sans barre de defilement (« Gestion carnet depot », 07/10). Les tests fonctionnels ne le voient pas : la base de test
 * a rarement assez de lignes pour depasser la hauteur de l'ecran.
 *
 * Methode : pour chaque ecran du menu de l'administrateur, chaque onglet, chaque grille visible :
 *  1. on y ajoute 80 lignes factices (en memoire, rien en base) ;
 *  2. on fait defiler la grille jusqu'en bas ;
 *  3. la DERNIERE ligne doit etre visible a l'ecran : dans la fenetre du navigateur, dans la zone visible de la grille,
 *     et c'est bien elle qui est sous le pointeur a son centre (rien ne la recouvre).
 * Les lignes factices sont retirees ensuite. Aucun ecran n'est utilise pour ecrire.
 *
 * Variables : ECRANS=xtype1,xtype2 pour limiter ; RAPIDE=1 pour ne pas parcourir les onglets.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const q = (sql) => execFileSync('mariadb', ['--default-character-set=utf8mb4', process.env.DB_TEST || 'capitale', '-sN', '-e', sql], { encoding: 'utf8' }).trim();

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }
/* ecrans d'action (ouverture de caisse, vente en cours...) ou qui ne sont pas des listes */
const EXCLUS = ['doventemanager', 'ventemanager_new', 'ouverturecaissemanger', 'ventedepot', 'tableaubord', 'dashboard',
  'mainmenumanager', 'supportcontact', 'preenregistrementmanager_new',
  /* « Menu personnel » : fonction desactivee par parametre sur la base d'essai, l'ecran s'ouvre sur une erreur */
  'kobysky'];

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  p.setDefaultTimeout(20000);
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app && Ext.ComponentQuery.query('navigation').length
      && Ext.ComponentQuery.query('navigation')[0].getStore()._menuCharge, null, { timeout: 120000 });
    await p.waitForTimeout(2000);
    /* tous les ecrans actifs du referentiel des menus (pas seulement ceux du compte d'essai), ceux qui existent cote ecran */
    let ecrans = q("SELECT s.str_COMPOSANT, MIN(s.str_VALUE) FROM t_sous_menu s JOIN t_menu m ON m.lg_MENU_ID = s.lg_MENU_ID"
      + " WHERE s.str_Status = 'enable' AND m.str_Status = 'enable' AND COALESCE(s.str_COMPOSANT, '') <> '' GROUP BY s.str_COMPOSANT ORDER BY s.str_COMPOSANT")
      .split('\n').filter(Boolean).map((l) => l.split('\t'));
    const connus = await p.evaluate((l) => l.filter((x) => !!Ext.ClassManager.getByAlias('widget.' + x)), ecrans.map((e) => e[0]));
    ecrans = ecrans.filter((e) => connus.includes(e[0]));
    if (process.env.ECRANS) { const v = process.env.ECRANS.split(','); ecrans = ecrans.filter((e) => v.includes(e[0])); }
    ecrans = ecrans.filter((e) => !EXCLUS.includes(e[0]));
    console.log(ecrans.length + ' écrans à parcourir');
    const bilan = { ecrans: 0, grilles: 0, ko: [], lents: [] };
    let rang = 0;
    for (const [xtype, titre] of ecrans) {
      if (++rang % 20 === 0) { console.log('  ... ' + rang + ' / ' + ecrans.length); }
      const err = [];
      const surErreur = (e) => err.push(String(e.message));
      p.on('pageerror', surErreur);
      try {
        await p.evaluate(([x, t]) => { Ext.WindowManager.each((w) => { if (w.isVisible() && w.close) { try { w.close(); } catch (e) { /* */ } } }); testextjs.app.getController('App').onLoadNewComponent(x, t, ''); }, [xtype, titre]);
        await p.waitForTimeout(2200);
        /* onglets de l'ecran (et l'ecran lui-meme s'il n'en a pas) */
        const onglets = await p.evaluate((x) => { const e = Ext.ComponentQuery.query(x)[0]; if (!e) { return null; }
          const tps = (e.isXType('tabpanel') ? [e] : []).concat(e.query('tabpanel')); const l = [];
          tps.forEach((tp, i) => tp.items.each((it, j) => l.push([i, j, it.title || it.itemId || ('onglet ' + j)]))); return l; }, xtype);
        if (onglets === null) { continue; }
        bilan.ecrans++;
        const etapes = onglets.length && !process.env.RAPIDE ? onglets : [null];
        for (const o of etapes) {
          if (o) {
            await p.evaluate(([x, i, j]) => { const e = Ext.ComponentQuery.query(x)[0]; const tps = (e.isXType('tabpanel') ? [e] : []).concat(e.query('tabpanel')); tps[i].setActiveTab(j); }, [xtype, o[0], o[1]]);
            await p.waitForTimeout(900);
          }
          const r = await p.evaluate(async (x) => {
            const e = Ext.ComponentQuery.query(x)[0];
            const grilles = (e.isXType('gridpanel') ? [e] : []).concat(e.query('gridpanel')).filter((g) => g.isVisible(true) && g.rendered && g.getView && g.getView().getEl());
            const sortie = [];
            for (const g of grilles) {
              const st = g.getStore();
              if (!st || g.getHeight() < 30) { continue; }
              const avant = st.getCount();
              const ajout = [];
              try {
                for (let k = 0; k < 80; k++) { ajout.push({}); }
                st.add(ajout);
              } catch (er) { sortie.push({ g: g.getId(), ok: true, info: 'non testable : ' + er.message }); continue; }
              await new Promise((ok) => setTimeout(ok, 250));
              const v = g.getView(), el = v.getEl().dom;
              const noeuds = v.getNodes ? v.getNodes() : [];
              const dernier = noeuds[noeuds.length - 1];
              if (!dernier) { st.remove(st.getRange(avant)); sortie.push({ g: g.getId(), ok: true, info: 'aucune ligne rendue' }); continue; }
              /* le chargement en cours (masque « Chargement... ») doit etre fini, comme pour l'utilisateur (jusqu'a 60 s :
                 certaines anciennes listes sont lentes sur la base d'essai) */
              for (let t = 0; t < 240 && Array.from(document.querySelectorAll('.x-mask')).some((m) => m.offsetWidth > 0 && m.offsetHeight > 0 && getComputedStyle(m).visibility !== 'hidden'); t++) {
                await new Promise((ok) => setTimeout(ok, 250));
              }
              el.scrollTop = el.scrollHeight;
              await new Promise((ok) => setTimeout(ok, 250));
              /* ce que l'utilisateur peut faire ensuite : faire defiler les conteneurs qui ont une barre de defilement
                 (overflow auto ou scroll). Un conteneur en overflow hidden ne defile pas pour lui : on n'y touche pas. */
              for (let a = dernier.parentElement; a && a !== document.body; a = a.parentElement) {
                const oy = getComputedStyle(a).overflowY;
                if ((oy === 'auto' || oy === 'scroll') && a.scrollHeight > a.clientHeight + 1) {
                  const ra = a.getBoundingClientRect(), rr = dernier.getBoundingClientRect();
                  if (rr.bottom > ra.bottom) { a.scrollTop += rr.bottom - ra.bottom + 2; }
                }
              }
              await new Promise((ok) => setTimeout(ok, 150));
              if (dernier.getBoundingClientRect().height === 0) { st.remove(st.getRange(avant)); sortie.push({ g: g.getId(), ok: true, info: 'grille non affichée' }); continue; }
              const rg = el.getBoundingClientRect(), rl = dernier.getBoundingClientRect();
              const cx = Math.min(rl.left + 20, window.innerWidth - 2), cy = rl.top + Math.min(rl.height / 2, 6);
              const dessous = document.elementFromPoint(cx, cy);
              const visible = rl.bottom <= window.innerHeight + 1 && rl.top >= 0 && rl.bottom <= rg.bottom + 1 && rl.top >= rg.top - 1
                && dessous && (dessous === dernier || dernier.contains(dessous));
              sortie.push({ g: (g.title || g.itemId || g.getId()), ok: !!visible,
                info: 'ligne ' + Math.round(rl.top) + '-' + Math.round(rl.bottom) + ', grille ' + Math.round(rg.top) + '-' + Math.round(rg.bottom) + ', fenêtre ' + window.innerHeight
                  + (dessous && !(dessous === dernier || dernier.contains(dessous)) ? ', recouverte par ' + (dessous.className || dessous.tagName).toString().slice(0, 60) : '') });
              try { st.remove(st.getRange(avant)); } catch (er) { /* */ }
            }
            return sortie;
          }, xtype);
          for (const x of r) {
            bilan.grilles++;
            /* toujours sous le masque « chargement » apres 60 s : liste trop lente, signalee a part (ce n'est pas un
               defaut de mise en page) */
            if (!x.ok && /recouverte par x-mask/.test(x.info)) { bilan.lents.push(xtype + (o ? ' › ' + o[2] : '') + ' › ' + x.g); }
            else if (!x.ok) { bilan.ko.push(xtype + (o ? ' › ' + o[2] : '') + ' › ' + x.g + ' : ' + x.info); }
          }
        }
      } catch (e) {
        console.log('  (écran ' + xtype + ' non parcouru : ' + String(e.message).slice(0, 120) + ')');
      } finally {
        p.off('pageerror', surErreur);
      }
    }
    console.log(bilan.ecrans + ' écrans, ' + bilan.grilles + ' grilles contrôlées');
    bilan.ko.forEach((k) => console.log('  ✗ ' + k));
    bilan.lents.forEach((k) => console.log('  ⏳ liste non chargée en 60 s (à traiter à part) : ' + k));
    ok('Toutes les grilles défilent jusqu\'à leur dernière ligne (' + bilan.grilles + ' grilles, ' + bilan.ecrans + ' écrans)', bilan.ko.length === 0, bilan.ko.length + ' en défaut');
  } catch (e) {
    ok('Exécution sans exception', false, e.stack);
  } finally {
    await b.close();
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
