/* PLAN DU 14/11, POINT 9 : ECRAN DE VENTE, ZONE QUANTITE ET RECHERCHE PRODUIT (ergonomie).
 *  - la zone quantite etait trop grande (elle prenait un tiers de la ligne) ;
 *  - la liste de la recherche produit etait trop etroite : le nom etait coupe et le CIP le chevauchait ;
 *  - 10 produits par recherche, avec une barre de defilement verticale.
 * Attendu, sur un ecran de portable (1366 x 768) et un grand ecran (1600 x 900), pour la vente et la vente en depot
 * (meme vue) :
 *  - zone quantite : 140 px au plus, et la saisie produit garde au moins 60 % de la ligne ;
 *  - deux recherches tapees au clavier :
 *     . trois lettres qui ramenent beaucoup de produits aux noms longs : 15 produits affiches ;
 *     . quatre lettres qui ramenent au plus 15 produits dont plusieurs aux CIP de 13 chiffres (ils debordaient de la
 *       colonne CIP et touchaient le nom) : tous les produits de la base affiches ;
 *    pour chacune : aucune barre de defilement verticale, CIP et nom separes de 8 px au moins, noms entiers ;
 *  - rapprochement : les produits affiches sont ceux de la reponse du serveur (meme ordre) ;
 *  - vente en depot : le depot est choisi dans sa liste avant la saisie, comme l'utilisateur ;
 *  - la selection a la souris de la 12e proposition (sous l'ancienne limite de 10) l'inscrit dans la saisie produit.
 * Lecture seule : aucune vente n'est enregistree (le produit choisi n'est pas valide). Un depot d'extension d'essai,
 * avec du stock pour les produits recherches, est cree puis retire.
 * Lancement seul : node src/test/e2e/vente/test-ecran-vente-recherche-1511.js
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { connexion, choisir } = require('../outils/vues');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
/* trois lettres qui ramenent au moins 40 produits, aux noms les plus longs */
/* quatre lettres qui ramenent au plus 15 produits, dont plusieurs aux CIP de 13 chiffres (debordaient de la colonne CIP) */
const CIP_LONGS = q("SELECT LEFT(str_NAME, 4) p FROM t_famille WHERE str_STATUT = 'enable' AND str_NAME REGEXP '^[A-Z]{4}' GROUP BY p HAVING COUNT(*) BETWEEN 8 AND 15 AND SUM(CHAR_LENGTH(int_CIP) >= 13) >= 3 ORDER BY SUM(CHAR_LENGTH(int_CIP) >= 13) DESC, COUNT(*) DESC LIMIT 1");
const PREFIXE = q("SELECT LEFT(str_NAME, 3) p FROM t_famille WHERE str_STATUT = 'enable' AND str_NAME REGEXP '^[A-Z]{3}' GROUP BY p HAVING COUNT(*) >= 40 ORDER BY MAX(CHAR_LENGTH(str_NAME)) DESC LIMIT 1");

/* vente en depot : la recherche ne porte que sur le stock du depot. Un depot d'extension d'essai, avec du stock pour
 * tous les produits des deux recherches, est cree puis retire. */
const DEPOT = 'E2E-P1411-DEPOT', NOM_DEPOT = 'DEPOT E2E P1411';
function retirerDepot() {
  q("DELETE FROM t_famille_stock WHERE lg_EMPLACEMENT_ID = '" + DEPOT + "'; DELETE FROM reference WHERE emplacement_id = '" + DEPOT + "';"
    + " DELETE FROM t_emplacement WHERE lg_EMPLACEMENT_ID = '" + DEPOT + "'");
}

(async () => {
  {
    retirerDepot();
    const compte = q('SELECT lg_COMPTE_CLIENT_ID FROM t_compte_client LIMIT 1');
    q("INSERT INTO t_emplacement (lg_EMPLACEMENT_ID, lg_COMPTE_CLIENT_ID, str_NAME, str_DESCRIPTION, str_LOCALITE, str_FIRST_NAME, str_LAST_NAME,"
      + " str_PHONE, dt_CREATED, dt_UPDATED, str_STATUT, lg_TYPEDEPOT_ID, bool_SAME_LOCATION) VALUES ('" + DEPOT + "', '" + compte + "', 'DEPOT E2E P1411',"
      + " 'E2E', 'ESSAI', 'E2E', 'Essai', '', NOW(), NOW(), 'enable', '2', 0)");
    q("INSERT INTO t_famille_stock (lg_FAMILLE_STOCK_ID, lg_FAMILLE_ID, int_NUMBER, int_NUMBER_AVAILABLE, dt_CREATED, dt_UPDATED, lg_EMPLACEMENT_ID,"
      + " str_STATUT, int_UG, VERSION) SELECT CONCAT('E2EP1411', LEFT(MD5(f.lg_FAMILLE_ID), 20)), f.lg_FAMILLE_ID, 30, 30, NOW(), NOW(), '" + DEPOT + "',"
      + " 'enable', 0, 0 FROM t_famille f WHERE f.str_STATUT = 'enable' AND (f.str_NAME LIKE '" + PREFIXE + "%' OR f.str_NAME LIKE '" + CIP_LONGS + "%')");
  }
  const b = await ENV_E2E.lancer(chromium);
  try {
    for (const [ecran, ouvrir] of [['vente', 'doventemanager'], ['vente en dépôt', 'doventeendepot']]) {
      for (const [l, h] of [[1366, 768], [1600, 900]]) {
        const t = ecran + ' ' + l + ' x ' + h + ' : ';
        const p = await (await b.newContext({ viewport: { width: l, height: h } })).newPage();
        const err = []; p.on('pageerror', (e) => err.push(e.message));
        await connexion(p, ENV_E2E.LOGIN, 'e2etest');
        await p.evaluate((x) => testextjs.app.getController('App').onRedirectTo(x, { isEdit: false, record: {} }), ouvrir);
        const pret = await p.waitForFunction((x) => { const c = Ext.ComponentQuery.query(x + ' #contenu [xtype=fieldcontainer] #produit')[0]; return c && c.isVisible(true); }, ouvrir, { timeout: 30000 })
          .then(() => true).catch(() => false);
        if (!pret) { ok(t + 'écran ouvert', false); await p.close(); continue; }
        await p.waitForTimeout(1500);
        /* fermer une eventuelle question au demarrage */
        await p.evaluate(() => Ext.ComponentQuery.query('messagebox{isVisible()}').forEach((m) => m.close()));
        /* vente en depot : le depot se choisit avant toute saisie, comme l'utilisateur (premier depot de la liste) */
        if (ouvrir === 'doventeendepot') {
          const depot = await choisir(p, 'doventeendepot #depotVente', NOM_DEPOT).catch((e) => 'erreur ' + e.message);
          ok(t + 'dépôt d\'essai choisi dans la liste', depot && depot.indexOf(NOM_DEPOT) >= 0, depot);
          await p.waitForTimeout(800);
          await p.evaluate(() => Ext.ComponentQuery.query('messagebox{isVisible()}').forEach((m) => m.close()));
        }
        const m = await p.evaluate((x) => {
          const pr = Ext.ComponentQuery.query(x + ' #contenu [xtype=fieldcontainer] #produit')[0], qt = Ext.ComponentQuery.query(x + ' #contenu [xtype=fieldcontainer] #qtyField')[0];
          const ligne = pr.ownerCt.getEl().dom.getBoundingClientRect().width;
          return { quantite: Math.round(qt.getEl().dom.getBoundingClientRect().width), produit: Math.round(pr.getEl().dom.getBoundingClientRect().width), ligne: Math.round(ligne) };
        }, ouvrir);
        ok(t + 'zone quantité de 140 px au plus, saisie produit au moins 60 % de la ligne', m.quantite <= 140 && m.produit >= 0.6 * m.ligne, JSON.stringify(m));

        /* deux recherches tapees comme l'utilisateur : trois lettres (noms longs), puis un debut de CIP de 13 chiffres */
        let liste = null;
        for (const cherche of [PREFIXE, CIP_LONGS]) {
        const recues = []; const ecoute = (x) => { if (x.url().indexOf('/vente/search') >= 0) { recues.push(x); } }; p.on('response', ecoute);
        const champ = await p.evaluate((x) => '#' + Ext.ComponentQuery.query(x + ' #contenu [xtype=fieldcontainer] #produit')[0].inputEl.id, ouvrir);
        await p.click(champ);
        await p.keyboard.press('Control+A'); await p.keyboard.press('Backspace');
        await p.keyboard.type(cherche, { delay: 60 });
        await p.waitForTimeout(2500);
        p.off('response', ecoute);
        const r = recues.filter((x) => decodeURIComponent(x.url()).indexOf(cherche) >= 0).pop() || null;
        await p.waitForSelector('.x-boundlist-item:visible', { timeout: 20000 });
        await p.waitForTimeout(800);
        const serveur = r ? await r.json().catch(() => null) : null;
        liste = await p.evaluate((x) => {
          const pr = Ext.ComponentQuery.query(x + ' #contenu [xtype=fieldcontainer] #produit')[0], pk = pr.getPicker(), el = pk.listEl ? pk.listEl.dom : pk.getEl().dom;
          const items = Array.from(pk.getEl().dom.querySelectorAll('.x-boundlist-item'));
          const lignes = items.map((it) => {
            const spans = it.querySelectorAll('span span'), cip = spans[0], rItem = it.getBoundingClientRect();
            /* le nom est le texte qui suit le CIP dans la ligne : mesure par une plage de texte */
            const n = cip ? cip.nextSibling : null, rg = document.createRange();
            let nom = null;
            if (n && n.nodeType === 3) { rg.selectNodeContents(n); const b = rg.getBoundingClientRect(); nom = { gauche: b.left, droite: b.right, texte: n.textContent.trim(), hauteur: b.height }; }
            /* etendue reelle du texte du CIP (il peut deborder de sa colonne) */
            const rc = cip ? (() => { const g = document.createRange(); g.selectNodeContents(cip); return g.getBoundingClientRect(); })() : null;
            return { cip: cip ? cip.textContent.trim() : '', finCip: rc ? rc.right : 0, nom, droiteItem: rItem.right, hauteurItem: rItem.height };
          });
          return { n: items.length, defilement: el.scrollHeight > el.clientHeight + 1, largeur: Math.round(pk.getEl().dom.getBoundingClientRect().width), lignes };
        }, ouvrir);
        const attendu = cherche === PREFIXE ? 15 : Number(q("SELECT COUNT(*) FROM t_famille WHERE str_STATUT = 'enable' AND str_NAME LIKE '" + cherche + "%' AND UPPER(str_NAME) NOT LIKE 'RV %'"));
        ok(t + attendu + ' produits affichés pour « ' + cherche + ' »', liste.n === attendu, liste.n + ' produit(s)');
        ok(t + cherche + ' : aucune barre de défilement verticale dans la liste', !liste.defilement, JSON.stringify({ defilement: liste.defilement, largeur: liste.largeur }));
        /* un ecart lisible (8 px au moins) entre la fin du CIP et le debut du nom */
        const chevauche = liste.lignes.filter((x) => !x.nom || x.nom.gauche < x.finCip + 8);
        ok(t + cherche + ' : CIP et nom sans chevauchement (écart de 8 px au moins)', chevauche.length === 0, chevauche.map((x) => x.cip + ' (' + Math.round(x.nom ? x.nom.gauche - x.finCip : -1) + ' px)').join(', '));
        /* nom entier : sur une seule ligne et avant le bord droit de la proposition */
        const coupes = liste.lignes.filter((x) => x.nom && (x.nom.droite > x.droiteItem + 0.5 || x.nom.hauteur > 24));
        ok(t + cherche + ' : noms entiers (ni coupés ni sur deux lignes), liste de ' + liste.largeur + ' px', coupes.length === 0, coupes.map((x) => x.nom.texte).join(' | '));
        /* rapprochement avec la reponse du serveur */
        const donnees = serveur ? (serveur.data || serveur.results || serveur.liste || serveur) : [];
        const attendus = Array.isArray(donnees) ? donnees.filter((x) => !/^RV /i.test(x.strNAME || '')).slice(0, 15).map((x) => String(x.intCIP || '').trim()) : [];
        ok(t + cherche + ' : produits affichés = réponse du serveur, même ordre', attendus.length === liste.n && JSON.stringify(attendus) === JSON.stringify(liste.lignes.map((x) => x.cip)),
          (r ? r.url().replace(/^.*\/api/, '') : 'aucune réponse') + ' ; serveur ' + attendus.slice(0, 4).join(',') + '… ; écran ' + liste.lignes.slice(0, 4).map((x) => x.cip).join(',') + '…');
        }
        /* choix a la souris de la 12e proposition */
        const douze = p.locator('.x-boundlist-item:visible').nth(11);
        const cip12 = liste.lignes[11] ? liste.lignes[11].cip : null;
        if (cip12) {
          await douze.click();
          await p.waitForTimeout(800);
          const choisi = await p.evaluate((x) => { const pr = Ext.ComponentQuery.query(x + ' #contenu [xtype=fieldcontainer] #produit')[0]; const r = pr.findRecordByValue(pr.getValue()); return r ? String(r.get('intCIP')) : null; }, ouvrir);
          ok(t + 'la 12e proposition se choisit à la souris', choisi === cip12, choisi + ' / ' + cip12);
        } else {
          ok(t + 'la 12e proposition se choisit à la souris', false, 'moins de 12 propositions');
        }
        ok(t + 'aucune erreur JavaScript', err.length === 0, err.join(' | '));
        await p.close();
      }
    }
  } catch (e) {
    ok('Déroulé sans exception', false, e.stack);
  } finally {
    await b.close();
    retirerDepot();
    ok('Nettoyage : dépôt d\'essai et son stock retirés', q("SELECT COUNT(*) FROM t_emplacement WHERE lg_EMPLACEMENT_ID = '" + DEPOT + "'") === '0'
      && q("SELECT COUNT(*) FROM t_famille_stock WHERE lg_EMPLACEMENT_ID = '" + DEPOT + "'") === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
