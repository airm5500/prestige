/* Aide commune aux tests d'ecran de l'onglet « Securite » (cas 4, lot 4.B) : reglages, dossier de copies d'essai,
 * connexion tolerante, ouverture de l'onglet, lecture de l'etat affiche, journal et parametres de la base. Aucun
 * changement du pool de Payara ici : ces tests ne touchent pas au compte applicatif. */
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { connexion: connexionVue, ouvrirMenu, cliquer, BASE: BASE_HTTP } = require('../outils/vues');

const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const CLES = ['KEY_SECURITE_BASE', 'KEY_SECURITE_DERNIERE_ROTATION', 'KEY_SECURITE_DOSSIER_COPIES', 'KEY_SECURITE_FICHIER_IDENTIFIANTS', 'KEY_SAUVEGARDE_ACTIVE'];
const DOMAINE = ENV_E2E.PAYARA_DOMAINE;
const XML = DOMAINE + '/config/domain.xml';
const LOG = ENV_E2E.JOURNAL_SERVEUR;
const sql = (v) => String(v).replace(/\\/g, '\\\\').replace(/'/g, "''");
const parametre = (cle, valeur) => exec(valeur === null ? "DELETE FROM t_parameters WHERE str_KEY = '" + cle + "'"
  : "INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED) VALUES ('" + cle + "', '" + sql(valeur) + "', 'essai e2e', 'SYSTEME', 'enable', NOW()) ON DUPLICATE KEY UPDATE str_VALUE = VALUES(str_VALUE)");
/* toutes les lignes de t_parameters des cles du test, pour les remettre a l'identique */
const reglages = () => q("SELECT COALESCE(GROUP_CONCAT(CONCAT(str_KEY, '=', str_VALUE) ORDER BY str_KEY SEPARATOR '|'), 'NULL') FROM t_parameters WHERE str_KEY IN ('" + CLES.join("','") + "')");
function remettreReglages(avant) {
  exec("DELETE FROM t_parameters WHERE str_KEY IN ('" + CLES.join("','") + "');"
    + (avant && avant !== 'NULL' ? avant.split('|').map((kv) => { const i = kv.indexOf('=');
      return "INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED) VALUES ('" + kv.slice(0, i) + "', '" + sql(kv.slice(i + 1)) + "', 'Sécurité de la base', 'SYSTEME', 'enable', NOW());"; }).join('') : ''));
}
/* journal de securite : lignes apres un id, dans l'ordre, date a la seconde */
const journal = (apres) => q("SELECT CONCAT_WS('\t', id, DATE_FORMAT(dt_DATE, '%Y-%m-%d %H:%i:%s'), str_LOGIN, str_ACTION, str_RESULTAT, COALESCE(str_DETAIL, '')) FROM t_securite_journal WHERE id > " + apres + " ORDER BY id")
  .split('\n').filter((l) => l).map((l) => { const [id, date, login, action, resultat, detail] = l.split('\t'); return { id: Number(id), date, login, action, resultat, detail }; });
/* pool de Prestige dans domain.xml : compte et forme (valeur jamais affichee) */
function pool() {
  const xml = fs.readFileSync(XML, 'utf8');
  const bloc = (xml.match(/<jdbc-connection-pool[^>]*name="laborex_pool"[^>]*>[\s\S]*?<\/jdbc-connection-pool>/) || [''])[0];
  const prop = (n) => { const m = bloc.match(new RegExp('<property name="' + n + '" value="([^"]*)"', 'i')); return m ? m[1] : null; };
  return { user: prop('user'), forme: prop('password') === null ? 'INCONNU' : /^\$\{ALIAS=/.test(prop('password')) ? 'ALIAS' : 'CLAIR', alias: ((prop('password') || '').match(/^\$\{ALIAS=([^}]+)\}$/) || [])[1] || null };
}
const fauxDomainXml = (valeur) => '<domain><resources><jdbc-connection-pool name="laborex_pool" datasource-classname="x">\n<property name="user" value="ancien"/>\n<property name="password" value="' + valeur + '"/>\n</jdbc-connection-pool><jdbc-resource jndi-name="jdbc/__laborex_pool" pool-name="laborex_pool"/></resources></domain>\n';
/* dossier de copies d'essai : deux copies en clair, une sous alias, un fichier etranger */
function dossierCopies(tmp) {
  const d = path.join(tmp, 'copies');
  fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, 'domain.xml.avant-prestige-20261101-120000'), fauxDomainXml('FauxAncien1#2026'));
  fs.writeFileSync(path.join(d, 'domain.xml.avant-prestige-20261102-120000'), fauxDomainXml('FauxAncien2#2026'));
  fs.writeFileSync(path.join(d, 'domain.xml.avant-prestige-20261103-120000'), fauxDomainXml('${ALIAS=prestige-db}'));
  fs.writeFileSync(path.join(d, 'autre-fichier.txt'), 'ne doit pas etre supprime');
  return d;
}
/* la premiere connexion apres un deploiement peut depasser le delai ; une session deja ouverte renvoie a l'application */
async function connexion(p, login, mdp) {
  let e = null;
  for (let i = 0; i < 3; i++) {
    await p.goto(BASE_HTTP + '/security/index.html', { waitUntil: 'domcontentloaded' }).catch(() => {});
    await p.waitForTimeout(1500);
    if (/\/general\//.test(p.url())) {
      await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 240000 });
      await p.waitForFunction(() => { const n = Ext.ComponentQuery.query('navigation')[0]; return n && n.getStore().getRootNode().childNodes.length > 0 && !n.getStore().isLoading(); }, null, { timeout: 120000 });
      return;
    }
    try { await connexionVue(p, login, mdp); return; } catch (x) { e = x; }
  }
  throw e;
}
const S = (sel) => 'supportserveur #ongletSecurite ' + sel;
const texte = (p, sel) => p.evaluate((s) => { const c = Ext.ComponentQuery.query(s)[0]; return c && c.getEl() ? c.getEl().dom.textContent : ''; }, S(sel));
const attendreTexte = async (p, sel, motif, delai) => { const fin = Date.now() + (delai || 120000); let t = ''; while (Date.now() < fin) { t = await texte(p, sel); if (motif.test(t)) { return t; } await p.waitForTimeout(500); } return t; };
const inputId = (p, sel) => p.evaluate((s) => Ext.ComponentQuery.query(s)[0].inputId, S(sel));
const remplir = async (p, sel, v) => { await p.fill('#' + await inputId(p, sel), v); };
const boutonTexte = (p, sel) => p.evaluate((s) => Ext.ComponentQuery.query(s)[0].getText(), S(sel));
/* confirmation dans le bouton : premier clic arme, second clic execute */
const confirmer = async (p, sel) => { await cliquer(p, S(sel)); let t = await boutonTexte(p, sel); if (!/Confirmer/.test(t)) { await p.waitForTimeout(800); await cliquer(p, S(sel)); t = await boutonTexte(p, sel); } await p.waitForTimeout(300); await cliquer(p, S(sel)); return t; };
/* ouvre Centre de support > Stabilite du serveur > Securite */
async function ouvrirOnglet(p) {
  await ouvrirMenu(p, 'CENTRE DE SUPPORT', 'Stabilité du serveur');
  await p.waitForFunction(() => Ext.ComponentQuery.query('supportserveur').length > 0, null, { timeout: 30000 });
  await p.waitForFunction(() => Ext.ComponentQuery.query('supportserveur #ongletSecurite').length > 0, null, { timeout: 30000 });
  await p.click('.supportserveur .x-tab:has-text("Sécurité")');
  await attendreTexte(p, '#secStockage', /Pool Payara/);
}
/* etat affiche : lignes de l'onglet, boutons, journal du tableau (donnees du store, dans l'ordre affiche) */
async function etatAffiche(p) {
  return {
    alerte: await texte(p, '#secAlerte'),
    stockage: await texte(p, '#secStockage'),
    rotation: await texte(p, '#secRotationEtat'),
    purge: await boutonTexte(p, '#btnSecPurger'),
    aliasDesactive: await p.evaluate((s) => Ext.ComponentQuery.query(s)[0].isDisabled(), S('#btnSecAlias')),
    journal: await p.evaluate((s) => { const r = []; Ext.ComponentQuery.query(s)[0].getStore().each((x) => { r.push(x.getData()); }); return r; }, S('#secJournal'))
  };
}
/* rotation refusee (mauvais mot de passe de session) : une ligne REFUSE au journal, rien d'autre */
async function rotationRefusee(p) {
  await remplir(p, '#secMdpSession', 'mauvais-mot-de-passe');
  if (!await p.evaluate((s) => Ext.ComponentQuery.query(s)[0].isVisible(), S('#secFormulaire'))) { await cliquer(p, S('#btnSecRotation')); await p.waitForTimeout(300); }
  await remplir(p, '#secCompteRotation', 'compte_inexistant_e2e'); await remplir(p, '#secMdpRotation', 'ValeurSansImportance#1');
  await cliquer(p, S('#secModeGenerer'));
  await confirmer(p, '#btnSecLancer');
  return attendreTexte(p, '#secRotationMessage', /incorrect|Trop de refus/, 60000);
}
async function purger(p) {
  await remplir(p, '#secMdpSession', 'e2etest');
  await confirmer(p, '#btnSecPurger');
  const m = await attendreTexte(p, '#secMessage', /supprimée|Saisissez|incorrect/, 60000);
  await p.waitForTimeout(1500);
  return m;
}
/* lignes INFO du journal du serveur ecrites par le service (jamais une valeur) */
const lignesServeur = (depuis) => { const n = fs.statSync(LOG).size - depuis; if (n <= 0) { return []; } const fd = fs.openSync(LOG, 'r'); const b = Buffer.alloc(n); fs.readSync(fd, b, 0, n, depuis); fs.closeSync(fd);
  return (b.toString('utf8').match(/Sécurité de la base : [A-Z_]+ par [^\n]*? : [A-Z_]+/g) || []).map((l) => { const m = l.match(/Sécurité de la base : ([A-Z_]+) par (.*?) : ([A-Z_]+)/); return { action: m[1], login: m[2], resultat: m[3] }; }); };

module.exports = { ENV_E2E, BASE, BASE_HTTP, q, exec, CLES, DOMAINE, XML, LOG, parametre, reglages, remettreReglages, journal, pool, dossierCopies, connexion, ouvrirOnglet, S, texte, attendreTexte, remplir, confirmer, etatAffiche, rotationRefusee, purger, lignesServeur, os, fs, path, execFileSync };
