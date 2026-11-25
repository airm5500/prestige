/* DEMANDE DU 25/11 : « DETAIL SUR L'ARTICLE », BANDEAU D'IDENTIFICATION SUR UNE LIGNE.
 *
 * Retour de l'utilisateur (captures) : « pourquoi on affiche les donnees a la ligne sur plusieurs lignes ? je les veux
 * tous sur une ligne ; maximum sur 2 lignes si l'ecran utilise ne le permet pas ». Le bandeau (code, nom, peremption
 * proche, EAN 13, EAN fabricant, classe ABC) prenait une ligne par donnee.
 *
 * Lecture seule. Ecran des articles, recherche par le code, detail de l'article. Pour deux articles (l'un avec un lot
 * en stock, donc « Peremption proche », l'autre sans) et trois ecrans (1920 × 1080, 1366 × 768, 1100 × 700) :
 *  - grand ecran : toutes les donnees sur une ligne ; ecrans plus petits : deux lignes au plus ;
 *  - aucune donnee ne chevauche une autre, aucune n'est coupee, toutes restent dans le bandeau ;
 *  - rapprochement : code, nom, EAN 13, EAN fabricant et classe ABC affiches = base ;
 *  - temps d'affichage du detail < 5 s ; aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '--raw', '-sN', '-e', s], { encoding: 'utf8' }).replace(/\r/g, '').trim();
const COLONNES = "f.lg_FAMILLE_ID, f.int_CIP, f.str_NAME, IFNULL(f.int_EAN13, ''), IFNULL(f.code_ean_fabriquant, ''), IFNULL(f.lg_CLASSE_ABC_ID, '')";
/* article au nom long avec un lot en stock (« Péremption proche ») */
const AVEC_LOT = q('SELECT ' + COLONNES + " FROM t_famille f JOIN t_lot l ON l.lg_FAMILLE_ID = f.lg_FAMILLE_ID WHERE f.str_STATUT = 'enable'"
  + " AND f.int_CIP IS NOT NULL AND f.int_CIP <> '' AND l.dt_PEREMPTION IS NOT NULL AND l.current_stock > 0 ORDER BY CHAR_LENGTH(f.str_NAME) DESC, f.int_CIP LIMIT 1").split('\t');
/* article sans lot */
const SANS_LOT = q('SELECT ' + COLONNES + " FROM t_famille f WHERE f.str_STATUT = 'enable' AND f.int_CIP IS NOT NULL AND f.int_CIP <> ''"
  + ' AND NOT EXISTS (SELECT 1 FROM t_lot l WHERE l.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND l.current_stock > 0) ORDER BY f.int_CIP LIMIT 1').split('\t');
const ECRANS = [{ l: 1920, h: 1080, max: 1 }, { l: 1366, h: 768, max: 2 }, { l: 1100, h: 700, max: 2 }];
const IDS = ['int_CIP', 'str_DESCRIPTION', 'peremption_proche_detail', 'int_EAN13', 'eanFabricantDetail', 'classe_abc_detail'];

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  try {
    ok('Préconditions : un article avec lot en stock, un sans lot', AVEC_LOT[0] && SANS_LOT[0], AVEC_LOT[1] + ' / ' + SANS_LOT[1]);
    for (const e of ECRANS) {
      const p = await (await b.newContext({ viewport: { width: e.l, height: e.h } })).newPage();
      const erreurs = []; p.on('pageerror', (x) => erreurs.push(x.message));
      await connexion(p, ENV_E2E.LOGIN, 'e2etest');
      await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('famillemanager', {}));
      await p.waitForFunction(() => Ext.ComponentQuery.query('famillemanager').length > 0 && Ext.getCmp('rechecher'), null, { timeout: 30000 });
      for (const [art, libelle] of [[AVEC_LOT, 'avec lot'], [SANS_LOT, 'sans lot']]) {
        const [id, cip, nom, ean13, eanFab, abc] = art;
        /* recherche tapee au clavier, comme l'utilisateur */
        const champ = await p.evaluate(() => Ext.getCmp('rechecher').inputEl.dom.id);
        await p.click('#' + champ);
        await p.keyboard.press('Control+A');
        await p.keyboard.type(cip);
        await p.keyboard.press('Enter');
        await p.waitForFunction((x) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; return !g.getStore().isLoading() && g.getStore().findExact('lg_FAMILLE_ID', x) >= 0; }, id, { timeout: 60000 });
        const t0 = Date.now();
        await p.evaluate((x) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; g.onDetailClick(g, g.getStore().findExact('lg_FAMILLE_ID', x)); }, id);
        await p.waitForFunction((c) => { const f = Ext.getCmp('int_CIP'); return f && f.isVisible(true) && String(f.getValue()) === c; }, cip, { timeout: 30000 });
        if (libelle === 'avec lot') { await p.waitForFunction(() => { const c = Ext.getCmp('peremption_proche_detail'); return c && c.isVisible(); }, null, { timeout: 15000 }).catch(() => {}); }
        const delai = Date.now() - t0;
        await p.waitForTimeout(800);
        const m = await p.evaluate((ids) => {
          const bandeau = Ext.ComponentQuery.query('#bandeauArticle')[0].getEl().dom.getBoundingClientRect();
          const z = ids.map((i) => { const c = Ext.getCmp(i); if (!c || !c.isVisible(true)) { return null; }
            const el = c.getEl().dom, r = el.getBoundingClientRect(), v = c.inputEl || c.bodyEl || c.getEl();
            /* texte coupe : la valeur deborde de sa case */
            const coupe = Array.from(el.querySelectorAll('.x-form-display-field')).some((d) => d.scrollWidth > d.clientWidth + 1);
            return { id: i, haut: Math.round(r.top), bas: Math.round(r.bottom), g: Math.round(r.left), d: Math.round(r.right), coupe,
              texte: (el.querySelector('.x-form-display-field') || el).textContent.trim() }; }).filter(Boolean);
          return { bandeau: { g: Math.round(bandeau.left), d: Math.round(bandeau.right) }, z };
        }, IDS);
        /* lignes : deux donnees sont sur la meme ligne si leurs bandes verticales se recouvrent */
        const lignes = [];
        m.z.slice().sort((a, x) => a.haut - x.haut).forEach((x) => {
          const l = lignes.find((y) => x.haut < y.bas - 4 && x.bas > y.haut + 4);
          if (l) { l.bas = Math.max(l.bas, x.bas); l.ids.push(x.id); } else { lignes.push({ haut: x.haut, bas: x.bas, ids: [x.id] }); }
        });
        const ici = `${e.l} × ${e.h}, article ${libelle}`;
        ok(`${ici} : ${m.z.length} données sur ${lignes.length} ligne(s), ${e.max} au plus`, lignes.length <= e.max, lignes.map((l) => l.ids.join('+')).join(' / '));
        const chevauche = m.z.some((a, i) => m.z.some((x, j) => j > i && a.g < x.d - 1 && x.g < a.d - 1 && a.haut < x.bas - 1 && x.haut < a.bas - 1));
        ok(`${ici} : aucune donnée ne chevauche une autre, aucune coupée, toutes dans le bandeau`,
          !chevauche && m.z.every((x) => !x.coupe && x.g >= m.bandeau.g - 1 && x.d <= m.bandeau.d + 1), JSON.stringify(m.z.map((x) => [x.id, x.g, x.d, x.haut, x.coupe])));
        const t = Object.fromEntries(m.z.map((x) => [x.id, x.texte]));
        /* la base garde la classe sous la forme ABC_CLASSE_A : l'ecran montre la lettre */
        const lettre = abc ? abc.split('_').pop() : 'Non classe';
        ok(`${ici} : code, nom, EAN 13, EAN fabricant et classe ABC = base`, t.int_CIP === cip && t.str_DESCRIPTION === nom
          && (t.int_EAN13 || '') === ean13 && (eanFab ? t.eanFabricantDetail === eanFab : t.eanFabricantDetail === 'aucun')
          && t.classe_abc_detail === lettre, JSON.stringify({ t, base: { cip, nom, ean13, eanFab, lettre } }));
        ok(`${ici} : « Péremption proche » ${libelle === 'avec lot' ? 'affichée' : 'absente'}`, !!t.peremption_proche_detail === (libelle === 'avec lot'), t.peremption_proche_detail);
        ok(`${ici} : détail affiché en moins de 5 000 ms`, delai < 5000, delai + ' ms');
        /* fermeture de la fenetre du detail (croix), comme l'utilisateur */
        await p.evaluate(() => { const w = Ext.getCmp('int_CIP').up('window'); if (w) { w.close(); } });
        await p.waitForTimeout(400);
      }
      ok(`${e.l} × ${e.h} : aucune erreur JavaScript`, !erreurs.length, erreurs.join(' | '));
      await p.context().close();
    }
  } catch (x) {
    ok('Déroulement du test', false, x.stack || x);
  } finally {
    await b.close();
    const k = res.filter((x) => x.c).length;
    console.log('\n' + k + '/' + res.length + (k === res.length ? ' OK' : ' ECHEC'));
    process.exit(k === res.length ? 0 : 1);
  }
})();
