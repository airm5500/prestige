/* RETOURS DU 07/10 (2e serie). Par les ecrans, admin ; rien n'est laisse en base.
 *  - tableau de bord : ligne « Veille » sous le CA net (= CA de la veille) ; « Imprimer (PDF) » : page A4 PAYSAGE
 *    avec les tuiles et les cartes, puis retour a l'etat normal ;
 *  - boites de message : texte sur plusieurs lignes jamais coupe ; deconnexion au nouveau design ;
 *  - info-bulles : bleues, visibles assez longtemps pour etre lues ;
 *  - previsions : produit sur une ligne, (i) sur chaque tuile qui ouvre le detail ; menus renommes avec explication ;
 *  - fiche article : chemin du fichier image affiche ; differes : filtre regle / partiel / non regle ;
 *  - tiers payants : fiche de chaque client ; aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', process.env.DB_TEST || 'capitale', '-sN', '-e', s], { encoding: 'utf8' }).trim();
const SORTIE = process.env.SORTIE || '/tmp';

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const api = (u, o) => p.evaluate(async ([u, o]) => JSON.parse(await (await fetch(u, o || {})).text()), [u, o]);
  const famille = q("SELECT lg_FAMILLE_ID FROM t_famille WHERE str_STATUT = 'enable' ORDER BY lg_FAMILLE_ID LIMIT 1");
  let imageId = null;
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app && Ext.ComponentQuery.query('navigation').length
      && Ext.ComponentQuery.query('navigation')[0].getStore()._menuCharge, null, { timeout: 120000 });
    await p.waitForTimeout(2000);

    /* ------------------------------------------------ tableau de bord */
    const jour = new Date(), hier = new Date(Date.now() - 86400000);
    const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    /* un jour de la base d'essai qui a des ventes, et dont la veille en a aussi */
    const jv = q("SELECT DATE(p.dt_UPDATED) FROM t_preenregistrement p WHERE p.str_STATUT = 'is_Closed' AND p.int_PRICE > 0"
      + " AND EXISTS (SELECT 1 FROM t_preenregistrement x WHERE x.str_STATUT = 'is_Closed' AND x.int_PRICE > 0 AND DATE(x.dt_UPDATED) = DATE(p.dt_UPDATED) - INTERVAL 1 DAY)"
      + " ORDER BY p.dt_UPDATED DESC LIMIT 1");
    const jvVeille = q("SELECT DATE('" + jv + "') - INTERVAL 1 DAY");
    const t = await api('../api/v1/tableau-bord/tuiles?date=' + jv);
    const th = await api('../api/v1/tableau-bord/tuiles?date=' + jvVeille);
    ok('CA de la veille renvoyé avec le CA du jour (= CA calculé pour la veille), évolution juste', t.caVeille === th.ca && t.caVeille > 0
      && t.evolutionVeille === Math.round((t.ca - th.ca) * 1000 / th.ca) / 10, jv + ' : ' + t.ca + ' / veille ' + t.caVeille + ' = ' + th.ca + ' ; ' + t.evolutionVeille + ' %');
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('tableaubord', {}));
    await p.waitForFunction(() => { const z = document.querySelector('[data-tuile="ca"] .tb-veille'); return z && z.textContent.length > 5; }, null, { timeout: 30000 });
    const ligne = await p.evaluate(() => document.querySelector('[data-tuile="ca"] .tb-veille').textContent);
    const aujourdhui = await api('../api/v1/tableau-bord/tuiles?date=' + iso(jour));
    ok('Tuile CA net : ligne de comparaison à la veille', /^Veille : /.test(ligne) && (aujourdhui.evolutionVeille === null ? !/vs veille/.test(ligne) : /vs veille/.test(ligne)), ligne);
    await p.waitForTimeout(3000);
    await p.evaluate(() => { window.__imprime = 0; window.print = () => { window.__imprime++; }; });
    await p.click('[data-tb="imprimer"]');
    await p.waitForFunction(() => window.__imprime === 1, null, { timeout: 5000 });
    const zone = await p.evaluate(() => { const z = document.getElementById('tb-impression'); return { tuiles: z ? z.querySelectorAll('[data-tuile]').length : 0, cartes: z ? z.querySelectorAll('[data-carte]').length : 0,
      page: (document.getElementById('tb-page-paysage') || {}).textContent, classe: document.documentElement.classList.contains('tb-imprime') }; });
    ok('Impression : copie des tuiles et des cartes, page A4 paysage demandée', zone.tuiles >= 5 && zone.cartes >= 3 && /A4 landscape/.test(zone.page || '') && zone.classe, JSON.stringify(zone));
    await p.emulateMedia({ media: 'print' });
    const pdf = await p.pdf({ preferCSSPageSize: true, printBackground: true, path: SORTIE + '/tableau-bord.pdf' });
    const boite = /\/MediaBox\s*\[\s*0 0 ([\d.]+) ([\d.]+)/.exec(pdf.toString('latin1'));
    ok('PDF produit en paysage (largeur > hauteur)', boite && Number(boite[1]) > Number(boite[2]), boite ? boite[1] + ' x ' + boite[2] : 'MediaBox ?');
    await p.emulateMedia({ media: 'screen' });
    await p.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    const apres = await p.evaluate(() => ({ zone: !!document.getElementById('tb-impression'), page: !!document.getElementById('tb-page-paysage'), classe: document.documentElement.classList.contains('tb-imprime') }));
    ok('Après l\'impression : écran normal, mise en page paysage retirée (les autres éditions ne changent pas)', !apres.zone && !apres.page && !apres.classe, JSON.stringify(apres));

    /* ------------------------------------------------ boites de message */
    await p.evaluate(() => Ext.MessageBox.show({ title: 'Fin de la saisie', width: 380, icon: Ext.MessageBox.QUESTION, buttons: Ext.MessageBox.YESNO,
      msg: 'Dernier produit de la suggestion traité : la suggestion est <b>clôturée</b>.<br><br>Voulez-vous générer le fichier CSV ?' }));
    await p.waitForTimeout(900);
    const coupe = await p.evaluate(() => { const w = Ext.MessageBox, corps = w.body.dom, out = [];
      corps.querySelectorAll('*').forEach((n) => { const o = getComputedStyle(n).overflowY; if ((o === 'hidden' || o === 'auto') && n.scrollHeight > n.clientHeight + 1) { out.push(n.className.slice(0, 40)); } });
      const texte = w.msg.getEl().dom.getBoundingClientRect(), bas = corps.getBoundingClientRect(); return { out, visible: texte.bottom <= bas.bottom + 1 }; });
    ok('Boîte de message étroite : tout le texte visible (rien de coupé)', coupe.out.length === 0 && coupe.visible, JSON.stringify(coupe));
    await p.evaluate(() => Ext.MessageBox.hide());
    await p.evaluate(() => prestigeHeaderLogout());
    await p.waitForTimeout(700);
    const deco = await p.evaluate(() => { const w = Ext.MessageBox; return { theme: w.hasCls('mb-theme') && w.hasCls('deco-boite'), icone: !!(w.iconComponent && w.iconComponent.isVisible() && w.iconComponent.getEl().dom.offsetWidth > 0),
      oui: w.msgButtons.yes.getText(), non: w.msgButtons.no.getText(), texte: w.msg.getEl().dom.textContent }; });
    await p.screenshot({ path: SORTIE + '/deconnexion.png', clip: { x: 500, y: 330, width: 600, height: 300 } });
    ok('Déconnexion : nouveau design, une seule icône, « Se déconnecter » / « Annuler »', deco.theme && !deco.icone && /Se déconnecter/.test(deco.oui) && deco.non === 'Annuler', JSON.stringify(deco));
    await p.evaluate(() => Ext.MessageBox.msgButtons.no.btnEl.dom.click());
    await p.waitForTimeout(500);
    ok('« Annuler » : toujours connecté', (await p.evaluate(() => !Ext.MessageBox.isVisible())) && /general/.test(p.url()));

    /* ------------------------------------------------ menus */
    const menus = await p.evaluate(() => { const s = Ext.ComponentQuery.query('navigation')[0].getStore(); return ['rappelshabitude', 'analysecommande'].map((id) => { const n = s.getNodeById(id); return n ? n.get('text') + '|' + (n.raw.aide || '') : id + ' ?'; }); });
    ok('Menus renommés, explication en info-bulle', /^Rappels traitement\|.+/.test(menus[0]) && /^Prévisions vente \/ achat \/ analyse\|Prévisions de ventes/.test(menus[1]), menus.join(' / '));
    /* « oui, passe les autres menus en libelle court » : libelle court, explication en info-bulle */
    const COURTS = { rhmanager: 'Ressources humaines', gardemanager: 'Gestion des gardes', analysearticle: 'Analyse article',
      whatsappcomptes: 'Comptes WhatsApp', modelemessagemanager: 'Modèles de messages', detailsmanager: 'Détails',
      ventesmodifieesmanager: 'Ventes modifiées', RetrocessionsManager: 'Évolution des rétrocessions',
      analyseFrequentationOffManager: 'Fréquentation officine', statActiviteOperateurManager: 'Activité opérateurs' };
    const lus = await p.evaluate((ids) => { const s = Ext.ComponentQuery.query('navigation')[0].getStore(); return ids.map((id) => { const n = s.getNodeById(id); return n ? [id, n.get('text'), n.raw.aide || ''] : [id, null, '']; }); }, Object.keys(COURTS));
    const fautes = lus.filter((l) => l[1] !== null && (l[1] !== COURTS[l[0]] || l[2].length <= l[1].length));
    ok('Autres menus : libellé court et explication en info-bulle', lus.some((l) => l[1] !== null) && fautes.length === 0, JSON.stringify(fautes.length ? fautes : lus.map((l) => l[1])));

    /* ------------------------------------------------ previsions */
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('analysecommande', 'Prévisions vente / achat / analyse', ''));
    await p.waitForFunction(() => document.querySelectorAll('.ac-tuile .ac-info').length >= 5, null, { timeout: 60000 });
    const info = await p.evaluate(() => document.querySelectorAll('.ac-tuile .ac-info').length);
    ok('Un (i) sur chaque tuile', info === document_tuiles(), info);
    function document_tuiles() { return 5; }
    await p.click('.ac-tuile[data-filtre="RUPTURE"] .ac-info');
    await p.waitForTimeout(800);
    const det = await p.evaluate(() => { const w = Ext.ComponentQuery.query('window[title=Taux de rupture]')[0]; return w ? { theme: w.hasCls('fen-theme'), texte: w.body.dom.textContent } : null; });
    ok('(i) : détail de la tuile (définition, calcul, chiffres)', det && det.theme && /stock nul/.test(det.texte) && /%/.test(det.texte), JSON.stringify(det).slice(0, 200));
    const ongletAvant = await p.evaluate(() => Ext.ComponentQuery.query('analysecommande')[0].getActiveTab().itemId);
    ok('(i) n\'ouvre pas la liste (le clic reste sur le détail)', ongletAvant === 'ongletTableau', ongletAvant);
    await p.evaluate(() => { const w = Ext.ComponentQuery.query('window[title=Taux de rupture]')[0]; w.down('button[text=Voir les produits]').btnEl.dom.click(); });
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('analysecommande #ongletPrevisions')[0]; return g && g.isVisible() && !g.getStore().isLoading(); }, null, { timeout: 30000 });
    await p.evaluate(() => { const g = Ext.ComponentQuery.query('analysecommande #ongletPrevisions')[0]; g.down('#filtre').setValue(''); g.getStore().loadPage(1); });
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('analysecommande #ongletPrevisions')[0]; return !g.getStore().isLoading() && g.getStore().getCount() > 0; }, null, { timeout: 30000 });
    const lignes = await p.evaluate(() => { const g = Ext.ComponentQuery.query('analysecommande #ongletPrevisions')[0]; const cells = [...g.getView().getEl().dom.querySelectorAll('.ac-une-ligne .x-grid-cell-inner')];
      return { n: cells.length, br: cells.filter((c) => c.querySelector('br')).length, hautes: cells.filter((c) => c.getBoundingClientRect().height > 26).length, bulle: !!cells[0].parentNode.getAttribute('data-qtip') }; });
    ok('Prévisions : produit, code et grossiste sur une seule ligne (texte complet en info-bulle)', lignes.n > 0 && lignes.br === 0 && lignes.hautes === 0 && lignes.bulle, JSON.stringify(lignes));

    /* ------------------------------------------------ info-bulles */
    const entete = await p.evaluate(() => { const g = Ext.ComponentQuery.query('analysecommande #ongletPrevisions')[0]; const c = g.headerCt.getGridColumns().find((x) => x.text === 'Recommandé'); return c.getEl().id; });
    await p.hover('#' + entete);
    await p.waitForFunction(() => { const t = Ext.tip.QuickTipManager.getQuickTip(); return t.isVisible(); }, null, { timeout: 5000 });
    await p.waitForTimeout(7000);
    const bulle = await p.evaluate(() => { const t = Ext.tip.QuickTipManager.getQuickTip(); return { visible: t.isVisible(), bleue: t.hasCls('bulle-theme'), fond: getComputedStyle(t.getEl().dom).backgroundColor, texte: t.body.dom.textContent }; });
    ok('Info-bulle : bleue, encore visible après 7 s, texte précis', bulle.visible && bulle.bleue && /30, 95, 168/.test(bulle.fond) && /stock de sécurité/.test(bulle.texte), JSON.stringify(bulle));
    await p.mouse.move(5, 5);

    /* ------------------------------------------------ chemin du fichier image */
    const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    await p.evaluate(async ([f, b64]) => { const fd = new FormData(); fd.append('fichier', new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], { type: 'image/png' }), 'x.png');
      await fetch('../api/v1/produit-images/' + f, { method: 'POST', body: fd }); }, [famille, png]);
    const liste = await api('../api/v1/produit-images/' + famille);
    imageId = liste.data && liste.data.length ? liste.data[liste.data.length - 1].id : null;
    const img = (liste.data || []).find((x) => x.id === imageId) || {};
    const enBase = q("SELECT str_CHEMIN FROM t_famille_image WHERE lg_ID = '" + imageId + "'");
    ok('Image : chemin en base (t_famille_image.str_CHEMIN) et chemin complet du fichier sur le serveur', img.chemin === enBase && /images-produits\/\d{4}\/\d{2}\//.test(enBase)
      && img.fichier && img.fichier.endsWith(enBase.split('/').pop()) && !!liste.dossier, JSON.stringify({ chemin: img.chemin, fichier: img.fichier, dossier: liste.dossier }));

    /* ------------------------------------------------ differes : filtre */
    const etats = {};
    for (const e of ['NON_SOLDES', 'NON_REGLES', 'PARTIELS', 'REGLES', 'TOUS']) {
      const r = await api('../api/v1/reglement/liste?dtStart=2015-01-01&dtEnd=' + iso(jour) + '&query=&userId=&etat=' + e);
      etats[e] = r.data ? r.data.map((x) => x.etat) : null;
    }
    const coherent = etats.NON_REGLES.every((x) => x === 'NON_REGLE') && etats.PARTIELS.every((x) => x === 'PARTIEL') && etats.REGLES.every((x) => x === 'REGLE')
      && etats.NON_SOLDES.length === etats.NON_REGLES.length + etats.PARTIELS.length && etats.TOUS.length === etats.NON_SOLDES.length + etats.REGLES.length;
    ok('Différés : filtre réglé / partiel / non réglé cohérent (tous = non soldés + réglés)', coherent, JSON.stringify(Object.fromEntries(Object.entries(etats).map(([k, v]) => [k, v ? v.length : 'erreur']))));
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('delayed', 'Gestion des différés', ''));
    await p.waitForFunction(() => Ext.ComponentQuery.query('delayed #etatDiffere').length > 0, null, { timeout: 30000 });
    const combo = await p.evaluate(() => { const c = Ext.ComponentQuery.query('delayed #etatDiffere')[0]; return c.getStore().collect('l').join('|') + ' / ' + c.getValue(); });
    ok('Différés : liste « État » à l\'écran (non soldés par défaut, comme avant)', /Non réglés\|Réglés partiellement\|Réglés\|Tous \/ NON_SOLDES$/.test(combo), combo);

    /* ------------------------------------------------ tiers payants : fiche client */
    const tp = q("SELECT tp.str_FULLNAME FROM t_tiers_payant tp JOIN t_compte_client_tiers_payant c ON c.lg_TIERS_PAYANT_ID = tp.lg_TIERS_PAYANT_ID WHERE tp.str_STATUT = 'enable' GROUP BY tp.lg_TIERS_PAYANT_ID ORDER BY COUNT(*) DESC LIMIT 1");
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('tierspayantmanager', {}));
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('tierspayantmanager')[0]; return g && !g.getStore().isLoading() && g.getStore().getCount() > 0; }, null, { timeout: 30000 });
    await p.evaluate((nom) => { const g = Ext.ComponentQuery.query('tierspayantmanager')[0]; g.getStore().load({ params: { search_value: nom, query: nom } }); }, tp);
    await p.waitForFunction(() => !Ext.ComponentQuery.query('tierspayantmanager')[0].getStore().isLoading(), null, { timeout: 30000 });
    const ouvert = await p.evaluate((nom) => { const g = Ext.ComponentQuery.query('tierspayantmanager')[0]; const i = g.getStore().findExact('str_FULLNAME', nom); if (i < 0) { return false; } g.onClientsClick(g, i); return true; }, tp);
    await p.waitForFunction(() => { const w = Ext.ComponentQuery.query('window[title^=Clients du tiers payant]')[0]; return w && w.down('grid').getStore().getCount() > 0; }, null, { timeout: 30000 });
    await p.click('.x-window .x-action-col-icon[data-qtip^="Fiche client"]');
    await p.waitForFunction(() => Ext.ComponentQuery.query('suiviconsofenetre').length > 0 && /Chargement/.test(document.body.textContent) === false || Ext.ComponentQuery.query('suiviconsofenetre').length > 0, null, { timeout: 15000 });
    await p.waitForTimeout(2500);
    const fiche = await p.evaluate(() => { const w = Ext.ComponentQuery.query('suiviconsofenetre')[0]; return w ? { client: !!w.clientId, texte: w.getEl().dom.textContent.slice(0, 160) } : null; });
    ok('Tiers payant › clients : la fiche du client s\'ouvre (identité, assurances, achats)', ouvert && fiche && fiche.client, JSON.stringify(fiche));
    await p.screenshot({ path: SORTIE + '/tp-fiche-client.png' });
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Déroulé sans exception', false, e.stack);
  } finally {
    if (imageId) {
      await p.evaluate(async ([f, i]) => fetch('../api/v1/produit-images/' + f + '/' + i, { method: 'DELETE' }), [famille, imageId]).catch(() => {});
    }
    await b.close();
    ok('Image d\'essai retirée', !imageId || q("SELECT COUNT(*) FROM t_famille_image WHERE lg_ID = '" + imageId + "'") === '0');
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
