/* RELAIS D'EXT.LOADER SUR LA TABLE DES SCRIPTS (rapport docs/notices/RAPPORT_CHARGE_2026-10-29.md, § 4.6).
 *
 * Test sans serveur ni navigateur : general/resources/js/scripts-groupes.js est execute dans un contexte isole avec
 * un Ext.Loader factice, et doit se comporter comme une balise <script> :
 *  - fichier de la table : execute une fois, en portee globale, de facon asynchrone, puis rappel d'Ext ;
 *  - fichier absent : confie au chargement d'origine (reseau) ;
 *  - deux demandes du meme fichier en attente : un seul passage, deux rappels ;
 *  - chargement synchrone (syncRequire) : execute tout de suite, l'attente asynchrone est annulee ;
 *  - erreur dans un fichier : signalee, le rappel part quand meme ;
 *  - page en construction : rien ne s'execute avant DOMContentLoaded (certains fichiers mesurent la page) ;
 *  - pas de table : Ext.Loader reste intact.
 *
 *   node src/test/e2e/perf/test-scripts-groupes.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const SOURCE = fs.readFileSync(path.join(__dirname, '../../../main/webapp/general/resources/js/scripts-groupes.js'), 'utf8');

function contexte(table, etat) {
  const reseau = [];
  const erreurs = [];
  const Loader = {
    isLoading: false,
    loadScriptFile(url, onLoad) { reseau.push(url); onLoad(); return this; },
  };
  const c = {
    Ext: { Loader },
    setTimeout: (f) => { try { f(); } catch (e) { erreurs.push(e.message); } },
    Promise,
    decodeURIComponent,
    document: { readyState: etat || 'complete', ecouteurs: [], addEventListener(n, f) { this.ecouteurs.push([n, f]); }, createElement: () => ({ set href(u) { this.pathname = new URL(u, 'http://poste/prestige/general/index.jsp').pathname; } }) },
  };
  c.window = c;
  if (table) { c.PRESTIGE_SCRIPTS = table; }
  vm.createContext(c);
  vm.runInContext(SOURCE, c, { filename: 'scripts-groupes.js' });
  return { c, Loader, reseau, erreurs };
}
const attendre = () => new Promise((r) => setImmediate(r));
let echecs = 0;
async function cas(nom, f) {
  try { await f(); console.log('ok   ' + nom); } catch (e) { echecs++; console.log('ECHEC ' + nom + ' : ' + e.message); }
}

(async () => {
  await cas('fichier de la table : asynchrone, une fois, portee globale', async () => {
    const t = contexte({ '/prestige/general/app/view/A.js': 'var globaleA = 1; compteur = (typeof compteur === "number" ? compteur : 0) + 1;' });
    let rappels = 0;
    t.Loader.loadScriptFile('/prestige/general/app/view/A.js', () => { rappels++; }, null, null, false);
    assert.strictEqual(rappels, 0, 'pas de rappel avant la fin de la tache en cours');
    await attendre();
    assert.strictEqual(rappels, 1);
    assert.strictEqual(t.c.globaleA, 1, 'la var du fichier est globale');
    assert.strictEqual(t.c.compteur, 1);
    assert.strictEqual(t.reseau.length, 0, 'aucune requete');
    assert.strictEqual(t.Loader.isLoading, true);
    t.Loader.loadScriptFile('/prestige/general/app/view/A.js', () => {}, null, null, false);
    await attendre();
    assert.strictEqual(t.c.compteur, 1, 'deja execute : jamais une seconde fois depuis la table');
    assert.deepStrictEqual(t.reseau, ['/prestige/general/app/view/A.js'], 'redemande : confiee a Ext, qui la sait chargee');
  });

  await cas('chemin relatif et parametre : retrouves', async () => {
    const t = contexte({ '/prestige/general/app/view/B.js': 'vuB = true;' });
    let ok = false;
    t.Loader.loadScriptFile('app/view/B.js?_dc=123', () => { ok = true; }, null, null, false);
    await attendre();
    assert.ok(ok && t.c.vuB && !t.reseau.length);
  });

  await cas('fichier absent : par le reseau', async () => {
    const t = contexte({});
    let ok = false;
    t.Loader.loadScriptFile('/prestige/general/app/view/Absent.js', () => { ok = true; }, null, null, false);
    assert.ok(ok);
    assert.deepStrictEqual(t.reseau, ['/prestige/general/app/view/Absent.js']);
  });

  await cas('deux demandes en attente : un passage, deux rappels', async () => {
    const t = contexte({ '/prestige/general/app/view/C.js': 'passagesC = (typeof passagesC === "number" ? passagesC : 0) + 1;' });
    let r = 0;
    t.Loader.loadScriptFile('/prestige/general/app/view/C.js', () => { r++; }, null, null, false);
    t.Loader.loadScriptFile('/prestige/general/app/view/C.js', () => { r++; }, null, null, false);
    await attendre();
    assert.strictEqual(t.c.passagesC, 1);
    assert.strictEqual(r, 2);
  });

  await cas('synchrone pendant une attente : tout de suite, attente annulee', async () => {
    const t = contexte({ '/prestige/general/app/view/D.js': 'passagesD = (typeof passagesD === "number" ? passagesD : 0) + 1;' });
    let async = 0;
    let sync = 0;
    t.Loader.loadScriptFile('/prestige/general/app/view/D.js', () => { async++; }, null, null, false);
    t.Loader.loadScriptFile('/prestige/general/app/view/D.js', () => { sync++; }, null, null, true);
    assert.strictEqual(sync, 1);
    assert.strictEqual(t.c.passagesD, 1);
    await attendre();
    assert.strictEqual(async, 0, 'Ext a retire la balise : son rappel ne part pas');
    assert.strictEqual(t.c.passagesD, 1);
  });

  await cas('erreur dans un fichier : signalee, rappel quand meme', async () => {
    const t = contexte({ '/prestige/general/app/view/E.js': 'throw new Error("casse");' });
    let ok = false;
    t.Loader.loadScriptFile('/prestige/general/app/view/E.js', () => { ok = true; }, null, null, false);
    await attendre();
    assert.ok(ok);
    assert.deepStrictEqual(t.erreurs, ['casse']);
  });

  await cas('page en construction : execution apres DOMContentLoaded', async () => {
    const t = contexte({ '/prestige/general/app/view/G.js': 'vuG = true;', '/prestige/general/app/view/H.js': 'vuH = true;' }, 'loading');
    let r = 0;
    t.Loader.loadScriptFile('/prestige/general/app/view/G.js', () => { r++; }, null, null, false);
    t.Loader.loadScriptFile('/prestige/general/app/view/H.js', () => { r++; }, null, null, false);
    await attendre();
    assert.strictEqual(r, 0, 'rien avant la fin de la construction');
    assert.ok(!t.c.vuG);
    assert.strictEqual(t.c.document.ecouteurs.length, 1, 'un seul ecouteur');
    t.c.document.readyState = 'interactive';
    t.c.document.ecouteurs[0][1]();
    await attendre();
    assert.ok(t.c.vuG && t.c.vuH && r === 2);
  });

  await cas('pas de table : Ext.Loader intact', async () => {
    const t = contexte(null);
    t.Loader.loadScriptFile('/prestige/general/app/view/F.js', () => {}, null, null, false);
    assert.deepStrictEqual(t.reseau, ['/prestige/general/app/view/F.js']);
  });

  console.log(echecs ? `\nECHEC : ${echecs} cas` : '\nOK');
  process.exitCode = echecs ? 1 : 0;
})();
