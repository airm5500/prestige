/* Suppressions de vente : le (+) mort remplace par un bouton « Voir detail ».

   L'ecran ouvrait un (+) sur chaque ligne, alimente par un champ « details » que le serveur ne
   remplit jamais : la zone s'ouvrait vide. Le detail se demande desormais vente par vente.

   Le piege de cet ecran : sa colonne d'action emet UN SEUL evenement « click » pour toutes ses
   icones. Sans marqueur, ouvrir le detail declencherait une reimpression de ticket. C'est ce que
   verifient les assertions sur « action ». */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 260) + ']' : '')); }

const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();

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
    const vue = await p.evaluate(() => {
      const ecran = Ext.create('testextjs.view.vente.Removed', {renderTo: Ext.getBody()});
      const grille = ecran.down('gridpanel');
      const colonne = grille.down('actioncolumn');
      const actions = (colonne.items || []).map(i => i.action);
      const resultat = {
        // Le (+) doit avoir disparu : c'est lui qui alourdissait le chargement pour rien.
        sansExpander: !(grille.plugins || []).some(pl => pl.ptype === 'rowexpander'
          || (pl.$className || '').indexOf('RowExpander') >= 0),
        actions: actions,
        infobulles: (colonne.items || []).map(i => i.tooltip)
      };
      ecran.destroy();
      return resultat;
    });
    ok('Le (+) a disparu de l\'ecran des suppressions', vue.sansExpander);
    ok('La colonne d\'action porte deux icones', vue.actions.length === 2, vue.actions.join(','));
    ok('Chaque icone est marquee, pour ne pas confondre les deux actions',
      vue.actions.indexOf('imprimer') >= 0 && vue.actions.indexOf('detail') >= 0, vue.actions.join(','));
    ok('L\'icone de detail est explicite',
      vue.infobulles.some(t => /d.tail/i.test(String(t))), vue.infobulles.join(' | '));

    // le garde-fou du controleur : « detail » ne doit pas partir imprimer un ticket
    const aiguillage = await p.evaluate(() => {
      const ctrl = testextjs.app.getController('AnnulationCtr');
      const trace = [];
      const imprimer = ctrl.onPrintTicket;
      const voir = ctrl.voirDetail;
      ctrl.onPrintTicket = function () { trace.push('imprimer'); };
      ctrl.voirDetail = function () { trace.push('detail'); };
      const faux = {get: function () { return 'X'; }};
      ctrl.getVenteannulerGrid = function () {
        return {getStore: function () { return {getAt: function () { return faux; }}; }};
      };
      ctrl.handleActionColumn(null, 0, 0, {action: 'detail'}, null, null, null);
      ctrl.handleActionColumn(null, 0, 0, {action: 'imprimer'}, null, null, null);
      ctrl.onPrintTicket = imprimer;
      ctrl.voirDetail = voir;
      return trace;
    });
    ok('Cliquer « detail » ouvre le detail', aiguillage[0] === 'detail', aiguillage.join(','));
    ok('Cliquer « imprimer » imprime toujours le ticket', aiguillage[1] === 'imprimer', aiguillage.join(','));

    // le point d'entree generique rend TOUS les produits, pas seulement ceux de l'ordonnancier
    const vente = q("SELECT lg_PREENREGISTREMENT_ID FROM t_preenregistrement_detail LIMIT 1");
    if (vente) {
      const attendu = parseInt(q("SELECT COUNT(*) FROM t_preenregistrement_detail"
        + " WHERE lg_PREENREGISTREMENT_ID='" + vente + "'"), 10);
      const detail = await p.evaluate(async (id) => {
        const r = await fetch('../api/v1/ventestats/vente/detail/' + id, { credentials: 'same-origin' });
        return await r.json();
      }, vente);
      ok('Le detail generique rend tous les produits de la vente',
        detail.success === true && (detail.data || []).length === attendu,
        (detail.data || []).length + ' attendu ' + attendu);
    } else {
      ok('Le detail generique rend tous les produits de la vente', false, 'aucune vente detaillee en base');
    }

    const inconnu = await p.evaluate(async () => {
      const r = await fetch('../api/v1/ventestats/vente/detail/INEXISTANTE', { credentials: 'same-origin' });
      return await r.json();
    });
    ok('Une vente inconnue rend une liste vide, pas une erreur',
      inconnu.success === true && (inconnu.data || []).length === 0, JSON.stringify(inconnu));

    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Deroulement sans exception', false, e.message + '\n' + e.stack);
  } finally {
    await b.close();
  }
  const ko = res.filter(r => !r.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' assertions');
  process.exit(ko ? 1 : 0);
})();
