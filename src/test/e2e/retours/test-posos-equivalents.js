/* EQUIVALENTS EN RAYON DANS LE RESULTAT DE L'ANALYSE (23/09), JOUES A L'ECRAN.
 *
 * Mode demonstration active sur le BANC le temps du test (posos.properties remis en etat), liens DCI du paracetamol
 * poses et marques puis retires.
 *
 *  - Sintrom + Brufen : l'alerte « association deconseillee » recommande le paracetamol ; la colonne « EN RAYON »
 *    montre les produits de paracetamol du catalogue, stock en bleu, prix en rouge ;
 *  - sur la fiche d'ordonnance (en modification) : l'icone de l'alerte ouvre ces produits, « Remplacer » change la
 *    ligne du Brufen, VIDE sa posologie (autre substance) et y met le curseur ;
 *  - une precaution d'espacement ne propose rien.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const fs = require('fs');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const CONF = process.env.POSOS_CONF || '/root/prestige/config/posos.properties';
const MARQUE = 'E2E-EQV-';
const PARA = ['DOLIPRANE 500MG CPR B/16', 'DOLIPRANE 1G CPR B/8', 'EFFERALGAN 500MG GEL B/16 ANF', 'DOLIPRANE 500MG CPR EFFV T/16'];
const sqlTexte = (v) => "'" + v.replace(/'/g, "''") + "'";

(async () => {
  const avant = fs.existsSync(CONF) ? fs.readFileSync(CONF) : null;
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1700, height: 1100 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    fs.writeFileSync(CONF, (avant ? avant.toString() : '') + '\nPOSOS_MODE=demonstration\n');
    const dciPara = q("SELECT lg_DCI_ID FROM t_dci WHERE str_NAME='PARACETAMOL' LIMIT 1");
    PARA.forEach((nom, i) => exec("INSERT INTO t_famille_dci (lg_FAMILLE_DCI_ID, lg_FAMILLE_ID, lg_DCI_ID, str_STATUT, dt_CREATED, dt_UPDATED)"
      + " SELECT '" + MARQUE + i + "', f.lg_FAMILLE_ID, '" + dciPara + "', 'enable', NOW(), NOW() FROM t_famille f WHERE f.str_NAME=" + sqlTexte(nom)
      + " AND f.str_STATUT='enable' AND NOT EXISTS (SELECT 1 FROM t_famille_dci x WHERE x.lg_FAMILLE_ID=f.lg_FAMILLE_ID) LIMIT 1"));
    const attendus = Number(q("SELECT COUNT(*) FROM t_famille_dci fd JOIN t_famille f ON f.lg_FAMILLE_ID=fd.lg_FAMILLE_ID WHERE fd.lg_DCI_ID='" + dciPara + "' AND f.str_STATUT='enable' AND (SELECT COUNT(*) FROM t_famille_dci y WHERE y.lg_FAMILLE_ID=f.lg_FAMILLE_ID)=1"));

    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(1500);
    const idDe = (sel) => p.evaluate((s) => { const c = Ext.ComponentQuery.query(s)[0]; return c ? c.getId() : null; }, sel);
    const clic = async (sel) => { await p.click('#' + (await idDe(sel))); await p.waitForTimeout(1200); };

    /* ---------------------------------------------------------------- ecran Analyse posologie */
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('pososmanager', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('pososmanager #produit').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(1200);
    const choisir = async (texte, nom) => {
      await p.click('#' + (await idDe('pososmanager #produit')) + '-inputEl');
      await p.keyboard.type(texte, { delay: 50 });
      await p.waitForFunction((n) => { const c = Ext.ComponentQuery.query('pososmanager #produit')[0]; return c.isExpanded && c.getStore().findExact('strNAME', n) >= 0; }, nom, { timeout: 20000 });
      const r = await p.evaluate((n) => { const c = Ext.ComponentQuery.query('pososmanager #produit')[0]; const k = c.getPicker().getNode(c.getStore().findExact('strNAME', n)); k.scrollIntoView(); const b = k.getBoundingClientRect(); return { x: b.left + 10, y: b.top + b.height / 2 }; }, nom);
      await p.mouse.click(r.x, r.y); await p.waitForTimeout(600);
    };
    await choisir('SINTROM', 'SINTROM 4MG CPR SEC B/30');
    await choisir('BRUFEN 400', 'BRUFEN 400MG CPR DRG B/30');
    await clic('pososmanager #analyser');
    await p.waitForFunction(() => Ext.ComponentQuery.query('pososmanager #alertes')[0].getStore().getCount() > 0, null, { timeout: 20000 });
    const ecran = await p.evaluate(() => { const g = Ext.ComponentQuery.query('pososmanager #alertes')[0]; const r = g.getStore().getAt(0); const col = g.down('#colEnRayon'); const cell = g.getView().getCell(r, col).dom; return { gravite: r.get('gravite'), proposer: r.get('proposer'), n: (r.get('equivalents') || []).length, stocks: (r.get('equivalents') || []).map((e) => e.stock), texte: cell.textContent, couleurs: [...cell.querySelectorAll('span')].map((s) => getComputedStyle(s).color) }; });
    ok('Analyse posologie : l alerte AVK + AINS recommande le paracétamol', ecran.gravite === 'Association déconseillée' && JSON.stringify(ecran.proposer) === '["PARACETAMOL"]', JSON.stringify(ecran));
    ok('Colonne « EN RAYON » : les produits de paracétamol du catalogue (tous, au plus 8)', ecran.n === Math.min(attendus, 8) && /DOLIPRANE|EFFERALGAN|PARACETAMOL/.test(ecran.texte), ecran.n + ' / ' + attendus + ' : ' + ecran.texte.slice(0, 160));
    ok('En stock d abord ; stock en bleu (ou rouge à 0), prix en rouge', ecran.stocks.every((s, i, a) => i === 0 || !(a[i - 1] <= 0 && s > 0)) && ecran.couleurs.indexOf('rgb(192, 57, 43)') >= 0, JSON.stringify(ecran.stocks) + ' ' + ecran.couleurs.join(' '));

    /* ---------------------------------------------------------------- fiche d ordonnance */
    const client = q("SELECT lg_CLIENT_ID FROM t_client WHERE str_STATUT='enable' LIMIT 1");
    const idBrufen = q("SELECT lg_FAMILLE_ID FROM t_famille WHERE str_NAME='BRUFEN 400MG CPR DRG B/30' LIMIT 1");
    const cree = await p.evaluate(async (c) => { const r = await fetch('../api/v1/ordonnance-client/enregistrer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: c.client, dateOrdonnance: new Date().toISOString().slice(0, 10), observations: c.marque, produits: [{ libelle: 'SINTROM 4MG CPR SEC B/30', quantite: 1, posologie: '1 cp le soir' }, { articleId: c.brufen, libelle: 'BRUFEN 400MG CPR DRG B/30', quantite: 1, posologie: '1 cp matin midi et soir' }] }) }); return JSON.parse(await r.text()); }, { client, marque: MARQUE, brufen: idBrufen });
    ok('Précondition : ordonnance Sintrom + Brufen', cree.success === true, JSON.stringify(cree));
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('ordonnanceclient', {}));
    await p.waitForFunction((id) => { const e = Ext.ComponentQuery.query('ordonnanceclient')[0]; return e && e.storeOrdonnances.findExact('id', id) >= 0; }, cree.id, { timeout: 30000 });
    await p.waitForTimeout(800);
    const pos = await p.evaluate((id) => { const g = Ext.ComponentQuery.query('ordonnanceclient #grilleOrdonnances')[0]; const n = g.getView().getNode(g.getStore().findExact('id', id)); n.scrollIntoView(); const r = n.querySelector('.ordo-act-modifier').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, cree.id);
    await p.mouse.click(pos.x, pos.y); await p.waitForTimeout(1500);
    await clic('ordonnanceclient #vueFiche button[itemId=analyserPosos]');
    await p.waitForFunction(() => Ext.ComponentQuery.query('ordonnanceclient')[0].storeAlertesFiche.getCount() > 0, null, { timeout: 20000 });
    const icones = await p.evaluate(() => { const g = Ext.ComponentQuery.query('ordonnanceclient #alertesFiche')[0]; return g.getStore().getRange().map((r, i) => { const k = g.getView().getNode(i).querySelector('.ordo-act-proposes'); return r.get('gravite') + ':' + (k && !k.classList.contains('x-item-disabled') ? 'actif' : 'grise'); }); });
    ok('Fiche : l icône « produits proposés » est active sur l alerte qui recommande, grisée sur les autres', icones[0] === 'Association déconseillée:actif' && icones.slice(1).every((x) => /grise$/.test(x)), icones.join(' | '));
    const posIcone = await p.evaluate(() => { const g = Ext.ComponentQuery.query('ordonnanceclient #alertesFiche')[0]; const r = g.getView().getNode(0).querySelector('.ordo-act-proposes').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await p.mouse.click(posIcone.x, posIcone.y); await p.waitForTimeout(800);
    const panneau = await p.evaluate(() => { const e = Ext.ComponentQuery.query('ordonnanceclient')[0]; const g = e.down('#grilleSubstituts'); return { visible: g.isVisible(), titre: g.title, n: e.storeSubstituts.getCount(), niveau: e.storeSubstituts.getCount() ? e.storeSubstituts.getAt(0).get('niveau') : '', message: g.down('#messageSubstituts').getEl().dom.textContent, badge: g.getView().getNode(0).textContent }; });
    ok('Le panneau montre les produits proposés, marqués « Proposé (analyse) », et dit quelle ligne sera remplacée', panneau.visible && panneau.n === Math.min(attendus, 8) && panneau.niveau === 'proposition' && /Proposé \(analyse\)/.test(panneau.badge) && /BRUFEN/.test(panneau.message), JSON.stringify(panneau).slice(0, 300));
    const premier = await p.evaluate(() => Ext.ComponentQuery.query('ordonnanceclient')[0].storeSubstituts.getAt(0).get('nom'));
    const posR = await p.evaluate(() => { const g = Ext.ComponentQuery.query('ordonnanceclient #grilleSubstituts')[0]; const r = g.getView().getNode(0).querySelector('.ordo-act-remplacer').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await p.mouse.click(posR.x, posR.y); await p.waitForTimeout(900);
    const lignes = await p.evaluate(() => { const e = Ext.ComponentQuery.query('ordonnanceclient')[0]; const g = e.down('#grilleProduits'); const ed = g.plugins[0]; const col = ed.getActiveColumn ? ed.getActiveColumn() : null; return { l: e.storeProduits.getRange().map((r) => r.get('libelle') + ' / ' + r.get('posologie')), col: col ? col.itemId : null }; });
    ok('« Remplacer » : le Brufen devient le produit choisi, sa posologie est VIDÉE et le curseur y est', lignes.l[1] === premier + ' / ' && lignes.l[0] === 'SINTROM 4MG CPR SEC B/30 / 1 cp le soir' && lignes.col === 'colPosologie', JSON.stringify(lignes));
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Le parcours va au bout', false, e.message + ' ' + (e.stack || '').split('\n')[1]);
  } finally {
    if (avant !== null) { fs.writeFileSync(CONF, avant); } else if (fs.existsSync(CONF)) { fs.unlinkSync(CONF); }
    await b.close();
    exec("DELETE FROM t_famille_dci WHERE lg_FAMILLE_DCI_ID LIKE '" + MARQUE + "%'");
    exec("DELETE d FROM t_ordonnance_client_detail d JOIN t_ordonnance_client o ON o.lg_ORDONNANCE_ID=d.lg_ORDONNANCE_ID WHERE o.str_OBSERVATIONS='" + MARQUE + "'; DELETE FROM t_ordonnance_client WHERE str_OBSERVATIONS='" + MARQUE + "'");
    ok('Remise en état (configuration, liens DCI, ordonnance de test)', !fs.readFileSync(CONF).toString().includes('POSOS_MODE') && q("SELECT COUNT(*) FROM t_famille_dci WHERE lg_FAMILLE_DCI_ID LIKE '" + MARQUE + "%'") === '0');
    const kos = res.filter((r) => !r.c);
    console.log('\n' + res.filter((r) => r.c).length + '/' + res.length + ' controles OK');
    process.exit(kos.length ? 1 : 0);
  }
})();
