/* CONTROLE DE SAISIE A L'ECRAN : n'importe quoi dans chaque champ (demande du 07/10).
 *
 * Pour chaque ecran du menu, chaque onglet, puis chaque fenetre ouverte par un bouton de creation (« Ajouter »,
 * « Nouveau », « Créer »...) :
 *   - on TAPE au clavier des valeurs absurdes dans chaque champ (lettres, negatif, date impossible, apostrophe, balise,
 *     texte colle de 3 000 caracteres) ;
 *   - dans une fenetre, on clique ensuite sur le bouton d'enregistrement.
 * RIEN N'EST ECRIT EN BASE : toute requete d'ecriture (POST / PUT / DELETE, ou ancienne page *transaction*.jsp) est
 * interceptee et recoit une reponse d'echec factice ; on garde son contenu pour le rapport.
 *
 * Attendu (bloquant) :
 *   1. aucune erreur JavaScript, quoi qu'on tape ;
 *   2. aucune erreur interne du serveur (HTTP 500) sur les lectures declenchees (recherches, filtres) ;
 *   3. une date impossible (31/02/2026) est REFUSEE (champ en rouge), jamais transformee en une autre date ;
 *   4. un champ numerique ne garde jamais de lettres.
 * Rapport (non bloquant, a traiter ecran par ecran) : fenetres qui envoient au serveur malgre un champ obligatoire
 * vide ou invalide, et champs texte sans longueur maximale.
 *
 * Variables : ECRANS=xtype1,xtype2 pour limiter ; RAPIDE=1 sans onglets ; SORTIE=dossier du rapport.
 */
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const q = (sql) => execFileSync('mariadb', ['--default-character-set=utf8mb4', process.env.DB_TEST || 'capitale', '-sN', '-e', sql], { encoding: 'utf8' }).trim();

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 700) + ']' : '')); }
/* ecrans d'action (vente en cours, ouverture de caisse...) : ils ont leurs propres essais */
const EXCLUS = ['doventemanager', 'ventemanager_new', 'ouverturecaissemanger', 'ventedepot', 'tableaubord', 'dashboard',
  'mainmenumanager', 'supportcontact', 'preenregistrementmanager_new',
  /* « Achats fournisseurs » : procedure stockee de plus de 2 min sur la base d'essai (lenteur a traiter a part) ; l'ouvrir
     occupe un fil du serveur pendant des minutes */
  'achatfourManager'];
const CREER = /^\s*(\+\s*)?(ajouter|nouveau|nouvelle|nouvel|cr[ée]er)\b/i;
const ENREGISTRER = /^\s*(enregistrer|valider|sauvegarder|ajouter|cr[ée]er|confirmer|ok)\b/i;
const DATE_IMPOSSIBLE = '31/02/2026';
const LONG = 'Z'.repeat(3000);
/* une ecriture : tout ce qui n'est pas GET, et les anciennes lectures qui ecrivent (ws_transaction.jsp, create-inventaire,
   ponctionner, merge-suggestion, recalculer...) */
const ecriture = (req) => req.method() !== 'GET' || /transaction|[?&]mode=(create|update|delete)|create|update|delete|merge|ponction|recalcul|valider|clotur|import|envoy|annul|supprim|gener|maintenance|correction/i.test(req.url().replace(/[?].*$/, '') + (req.url().includes('mode=') ? req.url().replace(/^[^?]*/, '') : ''));

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  p.setDefaultTimeout(20000);
  const erreursJs = []; const erreurs500 = []; const envois = [];
  let ecranCourant = '';
  p.on('pageerror', (e) => erreursJs.push(ecranCourant + ' : ' + String(e.message).slice(0, 160)));
  p.on('response', (r) => { if (r.status() >= 500) { erreurs500.push(ecranCourant + ' : ' + r.request().method() + ' ' + r.url().replace(/^.*\/prestige\//, '').slice(0, 140) + ' -> ' + r.status()); } });
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app && Ext.ComponentQuery.query('navigation').length
      && Ext.ComponentQuery.query('navigation')[0].getStore()._menuCharge, null, { timeout: 120000 });
    await p.waitForTimeout(2000);
    /* a partir d'ici, aucune ecriture n'atteint le serveur */
    await p.route('**/*', (route) => {
      const req = route.request();
      if (!ecriture(req)) { return route.continue(); }
      envois.push({ ecran: ecranCourant, url: req.url().replace(/^.*\/prestige\//, ''), corps: req.postData() || '' });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: false, msg: 'essai de saisie : rien n\'est enregistre', message: 'essai de saisie : rien n\'est enregistre' }) });
    });
    const supportAvant = Number(q('SELECT COALESCE(SUM(occurrences), 0) FROM t_application_event'));

    let ecrans = q("SELECT s.str_COMPOSANT, MIN(s.str_VALUE) FROM t_sous_menu s JOIN t_menu m ON m.lg_MENU_ID = s.lg_MENU_ID"
      + " WHERE s.str_Status = 'enable' AND m.str_Status = 'enable' AND COALESCE(s.str_COMPOSANT, '') <> '' GROUP BY s.str_COMPOSANT ORDER BY s.str_COMPOSANT")
      .split('\n').filter(Boolean).map((l) => l.split('\t'));
    const connus = await p.evaluate((l) => l.filter((x) => !!Ext.ClassManager.getByAlias('widget.' + x)), ecrans.map((e) => e[0]));
    ecrans = ecrans.filter((e) => connus.includes(e[0]) && !EXCLUS.includes(e[0]));
    if (process.env.ECRANS) { const v = process.env.ECRANS.split(','); ecrans = ecrans.filter((e) => v.includes(e[0])); }
    console.log(ecrans.length + ' écrans à parcourir');

    const bilan = { champs: 0, dates: 0, nombres: 0, fenetres: 0, datesKo: [], nombresKo: [], sansControle: [], sansLongueur: new Set() };

    /* champs saisissables visibles d'un conteneur (ecran ou fenetre) */
    const relever = (selecteur) => p.evaluate((sel) => {
      const c = sel.fenetre ? Ext.getCmp(sel.fenetre) : Ext.ComponentQuery.query(sel.xtype)[0];
      if (!c) { return []; }
      return c.query('textfield').filter((f) => f.isVisible(true) && !f.isDisabled() && !f.readOnly && f.inputEl && f.inputEl.dom
        && f.inputEl.dom.offsetWidth > 0 && !f.isXType('filefield') && !f.isXType('timefield') && f.editable !== false)
        .map((f) => ({ id: f.inputEl.dom.id, cmp: f.id, nom: f.fieldLabel || f.emptyText || f.name || f.itemId || f.id,
          type: f.isXType('datefield') ? 'date' : (f.isXType('numberfield') ? 'nombre' : (f.isXType('combobox') ? 'liste' : 'texte')),
          maxLength: f.maxLength, obligatoire: f.allowBlank === false }));
    }, selecteur);

    /* tape une valeur dans un champ comme un utilisateur ; renvoie ce que le champ en a fait */
    const taper = async (champ, valeur, entree) => {
      try {
        await p.click('#' + champ.id, { timeout: 3000 });
        await p.keyboard.press('Control+A');
        if (valeur.length > 50) { await p.fill('#' + champ.id, valeur, { timeout: 3000 }); } else { await p.keyboard.type(valeur, { delay: 5 }); }
        if (entree) { await p.keyboard.press('Enter'); } else { await p.keyboard.press('Tab'); }
      } catch (e) { return null; }
      await p.waitForTimeout(entree ? 500 : 150);
      return p.evaluate((id) => { const f = Ext.getCmp(id); if (!f || f.isDestroyed) { return null; }
        const v = f.getValue(); return { brut: f.getRawValue ? f.getRawValue() : '', valide: f.isValid(), valeur: v instanceof Date ? Ext.Date.format(v, 'd/m/Y') : v }; }, champ.cmp);
    };

    /* essaie toutes les valeurs absurdes dans les champs d'un conteneur */
    const essayerChamps = async (selecteur, lieu, entree) => {
      const champs = await relever(selecteur);
      for (const c of champs) {
        bilan.champs++;
        if (c.type === 'date') {
          bilan.dates++;
          const r = await taper(c, DATE_IMPOSSIBLE, false);
          if (r && (r.valide || (r.valeur && r.valeur !== DATE_IMPOSSIBLE))) { bilan.datesKo.push(lieu + ' / ' + c.nom + ' : ' + JSON.stringify(r)); }
          await taper(c, 'abc', entree);
        } else if (c.type === 'nombre') {
          bilan.nombres++;
          const r = await taper(c, 'abc12x', false);
          if (r && /[a-z]/i.test(String(r.brut))) { bilan.nombresKo.push(lieu + ' / ' + c.nom + ' : « ' + r.brut + ' »'); }
          await taper(c, '-999999', false); await taper(c, '99999999999999', entree);
        } else {
          for (const v of ["l'apostrophe' OR '1'='1", '<b>gras</b><script>x()</script>', '%_\\']) { await taper(c, v, entree); }
          await taper(c, LONG, entree);
          if (c.type === 'texte' && (!c.maxLength || c.maxLength > 100000) && selecteur.fenetre) { bilan.sansLongueur.add(lieu + ' / ' + c.nom); }
        }
        /* une boite de message ouverte par la saisie (refus, alerte) : on la ferme comme l'utilisateur */
        await p.evaluate(() => { const m = Ext.Msg; if (m && m.isVisible()) { m.hide(); } });
      }
    };

    const fermerFenetres = () => p.evaluate(() => { Ext.WindowManager.each((w) => { if (w.isVisible() && w.close && w !== Ext.Msg) { try { w.close(); } catch (e) { /* */ } } }); if (Ext.Msg && Ext.Msg.isVisible()) { Ext.Msg.hide(); } });

    for (const [xtype, titre] of ecrans) {
      ecranCourant = xtype;
      try {
        await fermerFenetres();
        await p.evaluate(([x, t]) => testextjs.app.getController('App').onLoadNewComponent(x, t, ''), [xtype, titre]);
        await p.waitForTimeout(2000);
        const onglets = await p.evaluate((x) => { const e = Ext.ComponentQuery.query(x)[0]; if (!e) { return null; }
          const tps = (e.isXType('tabpanel') ? [e] : []).concat(e.query('tabpanel')); const l = [];
          tps.forEach((tp, i) => tp.items.each((it, j) => l.push([i, j]))); return l; }, xtype);
        if (onglets === null) { continue; }
        for (const o of (onglets.length && !process.env.RAPIDE ? onglets : [null])) {
          if (o) {
            await p.evaluate(([x, i, j]) => { const e = Ext.ComponentQuery.query(x)[0]; const tps = (e.isXType('tabpanel') ? [e] : []).concat(e.query('tabpanel'));
              const tp = tps[i]; if (tp && tp.items.getAt(j)) { tp.setActiveTab(tp.items.getAt(j)); } }, [xtype, o[0], o[1]]);
            await p.waitForTimeout(800);
          }
          await essayerChamps({ xtype }, titre + (o ? ' (onglet ' + (o[1] + 1) + ')' : ''), true);
          await fermerFenetres();
        }
        /* fenetres de creation ouvertes depuis l'ecran */
        const boutons = await p.evaluate(([x, motif]) => { const e = Ext.ComponentQuery.query(x)[0]; if (!e) { return []; }
          const re = new RegExp(motif, 'i');
          return e.query('button').filter((bt) => bt.isVisible(true) && !bt.isDisabled() && re.test(bt.text || '') && bt.btnEl).map((bt) => bt.id); }, [xtype, CREER.source]);
        for (const idBouton of boutons.slice(0, 3)) {
          await fermerFenetres();
          const avant = await p.evaluate(() => { const l = []; Ext.WindowManager.each((w) => { if (w.isVisible()) { l.push(w.id); } }); return l; });
          await p.evaluate((id) => { const bt = Ext.getCmp(id); if (bt && bt.btnEl) { bt.btnEl.dom.click(); } }, idBouton);
          await p.waitForTimeout(1500);
          const fen = await p.evaluate((av) => { let f = null; Ext.WindowManager.each((w) => { if (w.isVisible() && av.indexOf(w.id) < 0 && w !== Ext.Msg && !w.isXType('messagebox')) { f = { id: w.id, titre: w.title }; } }); return f; }, avant);
          if (!fen) { continue; }
          bilan.fenetres++;
          const lieu = titre + ' > ' + (fen.titre || 'fenêtre');
          await essayerChamps({ fenetre: fen.id }, lieu, false);
          /* enregistrer avec ces valeurs : l'ecran doit refuser ou le serveur (intercepte ici) recoit l'envoi */
          const nAvant = envois.length;
          const invalides = await p.evaluate(([id, motif]) => { const w = Ext.getCmp(id); if (!w || w.isDestroyed) { return null; }
            const inv = w.query('field').filter((f) => f.isVisible(true) && !f.isDisabled() && f.isValid && !f.isValid()).map((f) => f.fieldLabel || f.name || f.id);
            const re = new RegExp(motif, 'i'); const bt = w.query('button').filter((x) => x.isVisible(true) && !x.isDisabled() && re.test(x.text || '') && x.btnEl)[0];
            if (bt) { bt.btnEl.dom.click(); }
            return { inv, bouton: bt ? bt.text : null }; }, [fen.id, ENREGISTRER.source]);
          await p.waitForTimeout(1500);
          if (invalides && invalides.bouton && invalides.inv.length && envois.length > nAvant) {
            bilan.sansControle.push(lieu + ' : envoyé au serveur malgré ' + invalides.inv.slice(0, 4).join(', ') + ' invalide(s)');
          }
          await fermerFenetres();
        }
      } catch (e) {
        console.log('  (écran ' + xtype + ' : ' + String(e.message).split('\n')[0].slice(0, 120) + ')');
      }
    }
    ecranCourant = '';
    console.log(bilan.champs + ' champs essayés (' + bilan.dates + ' dates, ' + bilan.nombres + ' nombres), ' + bilan.fenetres + ' fenêtres de création, ' + envois.length + ' envois interceptés');
    ok('aucune erreur JavaScript quoi qu\'on tape', erreursJs.length === 0, erreursJs.length + ' : ' + [...new Set(erreursJs)].slice(0, 12).join(' | '));
    ok('aucune erreur interne du serveur (HTTP 500) sur les recherches', erreurs500.length === 0, [...new Set(erreurs500)].slice(0, 12).join(' | '));
    ok('date impossible ' + DATE_IMPOSSIBLE + ' refusée dans tous les champs date (' + bilan.dates + ')', bilan.dates > 0 && bilan.datesKo.length === 0, bilan.datesKo.slice(0, 8).join(' | '));
    ok('aucun champ numérique ne garde de lettres (' + bilan.nombres + ')', bilan.nombresKo.length === 0, bilan.nombresKo.slice(0, 8).join(' | '));
    ok('aucune nouvelle erreur au Centre de support', Number(q('SELECT COALESCE(SUM(occurrences), 0) FROM t_application_event')) === supportAvant);
    const rapport = ['# Rapport de saisie (non bloquant)', '', '## Fenêtres qui envoient au serveur malgré un champ invalide (' + bilan.sansControle.length + ')']
      .concat(bilan.sansControle.map((x) => '- ' + x), ['', '## Champs texte de fenêtre sans longueur maximale (' + bilan.sansLongueur.size + ')'], [...bilan.sansLongueur].map((x) => '- ' + x));
    fs.writeFileSync(path.join(process.env.SORTIE || '/tmp', 'saisie-ecrans-rapport.md'), rapport.join('\n') + '\n');
    console.log('Rapport : ' + bilan.sansControle.length + ' fenêtres sans contrôle, ' + bilan.sansLongueur.size + ' champs texte sans longueur maximale');
  } catch (e) {
    ok('déroulé sans exception', false, e.stack);
  } finally {
    await b.close();
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
