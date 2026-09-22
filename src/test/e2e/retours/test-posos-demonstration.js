/* MODE DEMONSTRATION DE L'ANALYSE POSOS (provisoire, 23/09), JOUE A L'ECRAN.
 *
 *  - active cote serveur seulement (POSOS_MODE=demonstration dans posos.properties du BANC, remis en etat apres) ;
 *  - bandeau rouge « MODE DEMONSTRATION » sur l'ecran Analyse posologie ;
 *  - produits saisis au clavier : Sintrom + Brufen -> « Association deconseillee » en tete, avertissement affiche ;
 *  - depuis une ordonnance (Doliprane 1 g + Efferalgan codeine, allaitement) : doublon et contre-indication ;
 *  - un produit inconnu des regles est dit « non couvert », rien n'est invente ;
 *  - hors mode demonstration, rien ne change (le bouton reste desactive sans Posos configure).
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
const MARQUE = 'E2E-DEMO';

(async () => {
  const avant = fs.existsSync(CONF) ? fs.readFileSync(CONF) : null;
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1700, height: 1000 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    fs.writeFileSync(CONF, (avant ? avant.toString() : '') + '\nPOSOS_MODE=demonstration\n');
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(1500);
    const idDe = (sel) => p.evaluate((s) => { const c = Ext.ComponentQuery.query(s)[0]; return c ? c.getId() : null; }, sel);
    const clic = async (sel) => { await p.click('#' + (await idDe(sel))); await p.waitForTimeout(1200); };

    /* ---------------------------------------------------------------- ecran Analyse posologie */
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('pososmanager', {}));
    await p.waitForFunction(() => { const z = Ext.ComponentQuery.query('pososmanager #etatPasserelle')[0]; return z && z.getEl() && /DÉMONSTRATION|configur/.test(z.getEl().dom.textContent); }, null, { timeout: 30000 });
    const etat = await p.evaluate(() => { const z = Ext.ComponentQuery.query('pososmanager #etatPasserelle')[0].getEl().dom; const b = z.querySelector('.posos-demo'); return { texte: z.textContent, fond: b ? getComputedStyle(b).backgroundColor : '', bouton: Ext.ComponentQuery.query('pososmanager #analyser')[0].isDisabled() }; });
    ok('Bandeau rouge « MODE DÉMONSTRATION » et bouton Analyser actif', /MODE DÉMONSTRATION/.test(etat.texte) && etat.fond === 'rgb(192, 57, 43)' && etat.bouton === false, JSON.stringify(etat));
    const choisir = async (texte, nom) => {
      await p.click('#' + (await idDe('pososmanager #produit')) + '-inputEl');
      await p.keyboard.type(texte, { delay: 50 });
      await p.waitForFunction((n) => { const c = Ext.ComponentQuery.query('pososmanager #produit')[0]; return c.isExpanded && c.getStore().findExact('strNAME', n) >= 0; }, nom, { timeout: 20000 });
      const r = await p.evaluate((n) => { const c = Ext.ComponentQuery.query('pososmanager #produit')[0]; const k = c.getPicker().getNode(c.getStore().findExact('strNAME', n)); k.scrollIntoView(); const b = k.getBoundingClientRect(); return { x: b.left + 10, y: b.top + b.height / 2 }; }, nom);
      await p.mouse.click(r.x, r.y); await p.waitForTimeout(600);
    };
    await choisir('SINTROM', 'SINTROM 4MG CPR SEC B/30');
    await choisir('BRUFEN 400', 'BRUFEN 400MG CPR DRG B/30');
    await choisir('TAHOR 20', 'TAHOR 20MG CPR B/28');
    await clic('pososmanager #analyser');
    await p.waitForFunction(() => Ext.ComponentQuery.query('pososmanager #alertes')[0].getStore().getCount() > 0, null, { timeout: 20000 });
    const ecran = await p.evaluate(() => { const s = Ext.ComponentQuery.query('pososmanager #alertes')[0].getStore(); const m = Ext.ComponentQuery.query('pososmanager #messageAnalyse')[0].getEl().dom.textContent; return { premiere: s.getAt(0).get('gravite'), libelle: s.getAt(0).get('libelle'), conduite: s.getAt(0).get('recommandation'), n: s.getCount(), message: m, tahor: s.getRange().some((r) => (r.get('produits') || []).indexOf('TAHOR 20MG CPR B/28') >= 0) }; });
    ok('Sintrom + Brufen : « Association déconseillée » EN TÊTE, risque hémorragique', ecran.premiere === 'Association déconseillée' && /hémorragique/.test(ecran.libelle), JSON.stringify(ecran));
    ok('La conduite à tenir propose le paracétamol et cite sa source', /paracétamol/.test(ecran.conduite) && /Source : Thésaurus ANSM/.test(ecran.conduite), ecran.conduite);
    ok('L avertissement DÉMONSTRATION accompagne le résultat, contenu dit non validé', /DÉMONSTRATION/.test(ecran.message) && /NON ENCORE VALID/.test(ecran.message), ecran.message);
    ok('Tahor, inconnu des règles : « non couvert », et aucune alerte inventée à son sujet', /non couvert/.test(ecran.message) && /TAHOR/.test(ecran.message) && !ecran.tahor, ecran.message);

    /* ---------------------------------------------------------------- depuis une ordonnance */
    const client = q("SELECT lg_CLIENT_ID FROM t_client WHERE str_STATUT='enable' LIMIT 1");
    const cree = await p.evaluate(async (c) => { const r = await fetch('../api/v1/ordonnance-client/enregistrer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: c.client, dateOrdonnance: new Date().toISOString().slice(0, 10), observations: c.marque, allaitement: true, produits: [{ libelle: 'DOLIPRANE 1G CPR B/8', quantite: 1, posologie: '1 cp 3 fois par jour' }, { libelle: 'EFFERALGAN CODEINE CPR EFFV B/16', quantite: 1, posologie: '1 cp si douleur' }] }) }); return JSON.parse(await r.text()); }, { client, marque: MARQUE });
    ok('Précondition : ordonnance Doliprane 1 g + Efferalgan codéine, allaitement', cree.success === true, JSON.stringify(cree));
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('ordonnanceclient', {}));
    await p.waitForFunction((id) => { const e = Ext.ComponentQuery.query('ordonnanceclient')[0]; return e && e.storeOrdonnances.findExact('id', id) >= 0; }, cree.id, { timeout: 30000 });
    await p.waitForTimeout(800);
    const pos = await p.evaluate((id) => { const g = Ext.ComponentQuery.query('ordonnanceclient #grilleOrdonnances')[0]; const n = g.getView().getNode(g.getStore().findExact('id', id)); n.scrollIntoView(); const r = n.querySelector('.ordo-act-consulter').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, cree.id);
    await p.mouse.click(pos.x, pos.y); await p.waitForTimeout(1500);
    await clic('ordonnanceclient #vueFiche button[itemId=analyserPosos]');
    await p.waitForFunction(() => Ext.ComponentQuery.query('ordonnanceclient')[0].storeAlertesFiche.getCount() > 0, null, { timeout: 20000 });
    const fiche = await p.evaluate(() => { const e = Ext.ComponentQuery.query('ordonnanceclient')[0]; const g = e.down('#alertesFiche'); return { gravites: e.storeAlertesFiche.getRange().map((r) => r.get('gravite')), libelles: e.storeAlertesFiche.getRange().map((r) => r.get('libelle')).join(' | '), message: g.down('#messagePosos').getEl().dom.textContent, rouges: g.getEl().dom.querySelectorAll('.ordo-alerte-majeure').length }; });
    ok('Fiche : contre-indication (codéine et allaitement) en tête, doublon de paracétamol majeur', fiche.gravites[0] === 'Contre-indication' && /allaitement/.test(fiche.libelles) && fiche.gravites.indexOf('Majeure') >= 0 && /paracétamol/.test(fiche.libelles), JSON.stringify(fiche));
    ok('Fiche : les alertes majeures sont en rouge, l avertissement DÉMONSTRATION est affiché', fiche.rouges >= 2 && /DÉMONSTRATION/.test(fiche.message), fiche.rouges + ' / ' + fiche.message.slice(0, 120));
    ok('Forme effervescente : le sodium est signalé', /sodium/.test(fiche.libelles));

    /* ---------------------------------------------------------------- hors demonstration */
    fs.writeFileSync(CONF, avant ? avant : '');
    const statut = await p.evaluate(async () => JSON.parse(await (await fetch('../api/v1/posos/status')).text()));
    ok('Mode retiré de la configuration : la passerelle redevient « Posos », non configurée', statut.mode === 'posos' && statut.configuree === false, JSON.stringify({ mode: statut.mode, configuree: statut.configuree }));
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Le parcours va au bout', false, e.message + ' ' + (e.stack || '').split('\n')[1]);
  } finally {
    if (avant !== null) { fs.writeFileSync(CONF, avant); } else if (fs.existsSync(CONF)) { fs.unlinkSync(CONF); }
    await b.close();
    exec("DELETE d FROM t_ordonnance_client_detail d JOIN t_ordonnance_client o ON o.lg_ORDONNANCE_ID=d.lg_ORDONNANCE_ID WHERE o.str_OBSERVATIONS='" + MARQUE + "'; DELETE FROM t_ordonnance_client WHERE str_OBSERVATIONS='" + MARQUE + "'");
    const kos = res.filter((r) => !r.c);
    console.log('\n' + res.filter((r) => r.c).length + '/' + res.length + ' controles OK');
    process.exit(kos.length ? 1 : 0);
  }
})();
