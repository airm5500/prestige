/* POOL DE CONNEXIONS VERIFIE PAR L'AUTO-DIAGNOSTIC (retour support du 18/11, R3).
 *
 * CAISSE44 : « Communications link failure … 219 722 milliseconds ago ». Le reglage du pool (1-configurer-payara.ps1
 * -PoolSeulement : verification avant emploi, connectTimeout, socketTimeout, tcpKeepAlive) n'avait ete passe sur aucune
 * caisse, et rien ne le montrait. L'auto-diagnostic a maintenant un point « Pool de connexions a la base ».
 *
 * Rapprochement, par les clics (Centre de support) et dans deux etats du pool du domaine d'essai :
 *  - pool regle : la ligne de l'auto-diagnostic est verte ; Stabilite du serveur > Reglages conseilles montre
 *    « Delais et maintien des connexions » OK ; les valeurs affichees = celles d'asadmin get ;
 *  - pool deregle (socketTimeout=0, tcpKeepAlive=false, poses par asadmin puis domaine redemarre, comme le fait le
 *    script avec -Redemarrer) : la ligne est rouge, nomme les deux manques et eux seuls, donne la commande a passer ;
 *    l'onglet Reglages dit « a ajuster » avec les memes valeurs ; route = ecran ;
 *  - bilan : proprietes du pool remises a l'identique, domaine redemarre, pool joignable ; aucune erreur JavaScript.
 *
 * Le domaine est arrete puis redemarre apres chaque changement : une propriete du pool changee a chaud fait recreer le
 * pool par Payara, qui perd alors son mot de passe (« No password credential found », essai du 19/11 sur domain3).
 * Domaine d'essai seulement (PAYARA_DOMAINE) : le test refuse de tourner sur domain1.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu, cliquer } = require('../outils/vues');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const DOMAINE = ENV_E2E.PAYARA_DOMAINE;
const NOM_DOMAINE = path.basename(DOMAINE);
const xml = fs.readFileSync(DOMAINE + '/config/domain.xml', 'utf8');
const PORT_ADMIN = (xml.match(/port="(\d+)" name="admin-listener"/) || [])[1] || '4848';
const POOL = (xml.match(/<jdbc-resource[^>]*pool-name="([^"]+)"[^>]*jndi-name="jdbc\/__laborex_pool"/) || xml.match(/<jdbc-resource[^>]*jndi-name="jdbc\/__laborex_pool"[^>]*pool-name="([^"]+)"/) || [])[1];
const ASADMIN = path.resolve(DOMAINE, '../../../bin/asadmin.bat');
/* Payara a son propre JDK : JAVA_HOME du shell retire */
const ENV_ASADMIN = Object.assign({}, process.env); delete ENV_ASADMIN.JAVA_HOME;
const asadmin = (...a) => execFileSync('cmd.exe', ['/c', ASADMIN, '--port', PORT_ADMIN, ...a], { encoding: 'utf8', env: ENV_ASADMIN });
const CLES = ['is-connection-validation-required', 'property.connectTimeout', 'property.socketTimeout', 'property.tcpKeepAlive'];
const lirePool = () => {
  const o = {};
  for (const k of CLES) {
    const sortie = asadmin('get', 'resources.jdbc-connection-pool.' + POOL + '.' + k);
    const m = sortie.match(new RegExp('\\.' + k.replace(/\./g, '\\.') + '=(.*)'));
    o[k] = m ? m[1].trim() : '(absent)';
  }
  return o;
};
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
/* reglage puis redemarrage, comme 1-configurer-payara.ps1 -Redemarrer ; puis attente de l'application */
const poserEtRedemarrer = async (valeurs) => {
  for (const k of Object.keys(valeurs)) {
    if (valeurs[k] !== '(absent)') { asadmin('set', 'resources.jdbc-connection-pool.' + POOL + '.' + k + '=' + valeurs[k]); }
  }
  /* arret puis demarrage : restart-domain lance depuis un processus fils ne relance pas toujours le serveur (essai du
     19/11 : domaine arrete et jamais revenu) */
  const page = (process.env.BASE || 'http://localhost:8080/prestige') + '/security/index.html';
  const dossier = path.dirname(DOMAINE);
  execFileSync('cmd.exe', ['/c', ASADMIN, 'stop-domain', '--domaindir', dossier, NOM_DOMAINE], { encoding: 'utf8', env: ENV_ASADMIN });
  execFileSync('cmd.exe', ['/c', ASADMIN, 'start-domain', '--domaindir', dossier, NOM_DOMAINE], { stdio: 'ignore', env: ENV_ASADMIN, timeout: 300000 }); // sans tube : le serveur lance ne doit pas le garder
  const t0 = Date.now();
  while (Date.now() - t0 < 300000) {
    try {
      const r = await fetch(page);
      if (r.status === 200 && /Command ping-connection-pool executed successfully/.test(asadmin('ping-connection-pool', POOL))) { return true; }
    } catch (e) { /* domaine en cours de redemarrage */ }
    await attendre(3000);
  }
  return false;
};
const ms = (v) => (/^\d+$/.test(v) && Number(v) > 0 ? v + ' ms' : 'absent');

async function session(b, err) {
  const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
  p.on('pageerror', (e) => err.push(String(e.message)));
  await connexion(p, ENV_E2E.LOGIN_SUPPORT, 'e2etest');
  return p;
}

/* Diagnostic & bugs > Auto-diagnostic : ligne du pool (couleur, texte) et reponse de la route */
async function diagnostic(p) {
  await ouvrirMenu(p, 'CENTRE DE SUPPORT', 'Diagnostic & bugs');
  await p.waitForFunction(() => Ext.ComponentQuery.query('supportdiagnostic').some((c) => c.isVisible(true)), null, { timeout: 60000 });
  const reponse = p.waitForResponse((r) => r.url().includes('support/diagnostic/preflight'), { timeout: 60000 });
  await cliquer(p, 'supportdiagnostic button#btnPreflight');
  const json = await (await reponse).json();
  await p.waitForFunction(() => Ext.ComponentQuery.query('window[title="Auto-diagnostic de la supervision"]').some((w) => w.isVisible()), null, { timeout: 30000 });
  const ligne = await p.evaluate(() => {
    const w = Ext.ComponentQuery.query('window[title="Auto-diagnostic de la supervision"]').filter((x) => x.isVisible())[0];
    const tr = [...w.getEl().dom.querySelectorAll('tr')].find((x) => x.textContent.includes('Pool de connexions a la base'));
    const r = tr ? { rouge: tr.querySelector('span').style.color === 'red', texte: tr.textContent } : null;
    w.close();
    return r;
  });
  const route = ((json.data || json).controles || []).find((c) => c.code === 'POOL');
  return { ligne, route };
}

/* Stabilite du serveur > Reglages conseilles : reglages par cle */
async function reglages(p) {
  await ouvrirMenu(p, 'CENTRE DE SUPPORT', 'Stabilité du serveur');
  await p.waitForFunction(() => Ext.ComponentQuery.query('supportserveur').some((c) => c.isVisible(true)), null, { timeout: 60000 });
  await p.click('.supportserveur .x-tab:has-text("Réglages conseillés")');
  await p.waitForFunction(() => Ext.ComponentQuery.query('supportserveur #reglages')[0].getStore().getCount() > 0, null, { timeout: 30000 });
  return p.evaluate(() => { const o = {}; Ext.ComponentQuery.query('supportserveur #reglages')[0].getStore().each((r) => { o[r.get('cle')] = { actuel: r.get('actuel'), niveau: r.get('niveau') }; }); return o; });
}

(async () => {
  if (/domain1$/i.test(DOMAINE)) { console.log('Refus : domaine d\'essai seulement (PAYARA_DOMAINE)'); process.exit(2); }
  const avant = lirePool();
  console.log('pool ' + POOL + ' de ' + NOM_DOMAINE + ' avant : ' + JSON.stringify(avant));
  const err = [];
  let b = null, deregle = false;
  try {
    ok('Précondition : pool d\'essai réglé (vérification, délais, tcpKeepAlive)', avant['is-connection-validation-required'] === 'true'
      && Number(avant['property.socketTimeout']) >= 60000 && Number(avant['property.connectTimeout']) > 0 && avant['property.tcpKeepAlive'] === 'true', JSON.stringify(avant));

    /* 1. pool regle */
    b = await ENV_E2E.lancer(chromium);
    let p = await session(b, err);
    let d = await diagnostic(p);
    ok('Pool réglé : ligne « Pool de connexions à la base » présente et verte', d.ligne && !d.ligne.rouge, JSON.stringify(d.ligne));
    ok('Rapprochement écran / asadmin : valeurs lues', d.ligne && d.ligne.texte.includes('delai de lecture ' + ms(avant['property.socketTimeout']))
      && d.ligne.texte.includes('delai de connexion ' + ms(avant['property.connectTimeout'])) && d.ligne.texte.includes('tcpKeepAlive oui')
      && d.ligne.texte.includes('verification activee'), d.ligne && d.ligne.texte);
    ok('Route = écran (OK)', d.route && d.route.ok === true && d.ligne.texte.includes(d.route.detail), JSON.stringify(d.route));
    let r = await reglages(p);
    const attenduOk = 'connexion ' + ms(avant['property.connectTimeout']) + ', lecture ' + ms(avant['property.socketTimeout']) + ', tcpKeepAlive oui';
    ok('Réglages conseillés : « Délais et maintien des connexions » OK, valeurs = asadmin', r['pool-delais'] && r['pool-delais'].niveau === 'OK'
      && r['pool-delais'].actuel === attenduOk, JSON.stringify(r['pool-delais']) + ' / ' + attenduOk);
    ok('Réglages conseillés : « Contrôle des connexions » activé, comme asadmin', r['pool-validation'] && r['pool-validation'].niveau === 'OK', JSON.stringify(r['pool-validation']));
    await b.close(); b = null;

    /* 2. pool deregle, domaine redemarre */
    deregle = true;
    ok('Domaine redémarré avec le pool déréglé', await poserEtRedemarrer({ 'property.socketTimeout': '0', 'property.tcpKeepAlive': 'false' }));
    const pool2 = lirePool();
    ok('asadmin : délai de lecture et tcpKeepAlive retirés', pool2['property.socketTimeout'] === '0' && pool2['property.tcpKeepAlive'] === 'false', JSON.stringify(pool2));
    b = await ENV_E2E.lancer(chromium);
    p = await session(b, err);
    d = await diagnostic(p);
    const manque = d.ligne ? d.ligne.texte.slice(d.ligne.texte.indexOf('manque :')) : '';
    ok('Pool déréglé : ligne rouge', d.ligne && d.ligne.rouge, JSON.stringify(d.ligne));
    ok('La ligne nomme les deux manques, et eux seuls', /delai de lecture/.test(manque) && /tcpKeepAlive/.test(manque)
      && !/verification avant emploi/.test(manque) && !/delai de connexion/.test(manque), manque);
    ok('La ligne donne la commande à passer sur le poste', d.ligne && d.ligne.texte.includes('1-configurer-payara.ps1 -PoolSeulement -Redemarrer'), d.ligne && d.ligne.texte);
    ok('Route = écran (ANOMALIE)', d.route && d.route.ok === false && d.ligne.texte.includes(d.route.detail), JSON.stringify(d.route));
    ok('Aucun mot de passe affiché', d.ligne && !/password|secret/i.test(d.ligne.texte));
    r = await reglages(p);
    ok('Réglages conseillés : « à ajuster », lecture absente, tcpKeepAlive non (= asadmin)', r['pool-delais'] && r['pool-delais'].niveau !== 'OK'
      && r['pool-delais'].actuel === 'connexion ' + ms(pool2['property.connectTimeout']) + ', lecture absent, tcpKeepAlive non', JSON.stringify(r['pool-delais']));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Déroulé sans exception', false, e.stack || e);
  } finally {
    if (b) { await b.close(); }
    if (deregle) {
      ok('Bilan : domaine redémarré, pool joignable', await poserEtRedemarrer(avant));
    }
    const apres = lirePool();
    ok('Bilan : propriétés du pool remises à l\'identique', JSON.stringify(apres) === JSON.stringify(avant), JSON.stringify(apres));
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' PASS');
  process.exit(ko ? 1 : 0);
})();
