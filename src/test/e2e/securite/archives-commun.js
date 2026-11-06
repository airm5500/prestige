/* Aide commune aux tests d'ecran des archives chiffrees (cas 4, lot 4.C) : cle des archives posee par le VRAI script
 * 7-cle-archive.ps1 (fichier DPAPI dans un dossier d'essai, trace dans la base par le compte d'essai), fichier
 * d'identifiants de sauvegarde chiffre (DPAPI) a partir des options du compte d'essai, reglages de la sauvegarde
 * (dossier d'essai, pas de copie, automatique coupee), onglet Sauvegardes (sauvegarder, valoriser), lecture d'une
 * archive chiffree par le module PowerShell (cle captee a la creation : elle n'est affichee qu'une fois), empreinte
 * d'un dump. Tout est retire a la fin par chaque test. */
const C = require('./securite-commun');
const { ENV_E2E, q, exec, fs, os, path, execFileSync } = C;
const zlib = require('zlib');
const readline = require('readline');

const RACINE = path.resolve(__dirname, '..', '..', '..', '..');
const OFFICINE = path.join(RACINE, 'outils', 'officine');
const MODULE = path.join(OFFICINE, 'archive-chiffree.ps1');
const CLES = C.CLES.concat(['KEY_SAUVEGARDE_DOSSIER', 'KEY_SAUVEGARDE_COPIE', 'KEY_SAUVEGARDE_GARDER_HEURES', 'KEY_SAUVEGARDE_GARDER_JOURS',
  'KEY_SECURITE_FICHIER_CLE_ARCHIVE', 'KEY_SECURITE_CLE_ARCHIVE_DATE', 'KEY_SECURITE_DERNIER_ESSAI_RESTAURATION', 'KEY_SECURITE_DERNIER_ESSAI_RESULTAT']);
const reglages = () => q("SELECT COALESCE(GROUP_CONCAT(CONCAT(str_KEY, '=', str_VALUE) ORDER BY str_KEY SEPARATOR '|'), 'NULL') FROM t_parameters WHERE str_KEY IN ('" + CLES.join("','") + "')");
function remettreReglages(avant) {
  exec("DELETE FROM t_parameters WHERE str_KEY IN ('" + CLES.join("','") + "');"
    + (avant && avant !== 'NULL' ? avant.split('|').map((kv) => { const i = kv.indexOf('=');
      return "INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED) VALUES ('" + kv.slice(0, i) + "', '" + kv.slice(i + 1).replace(/\\/g, '\\\\').replace(/'/g, "''") + "', 'Sauvegardes / sécurité', 'SYSTEME', 'enable', NOW());"; }).join('') : ''));
}
const ps = (commande) => execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', commande], { encoding: 'utf8' });
const psFichier = (script, args) => execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script].concat(args), { encoding: 'utf8' });
const compteWindows = process.env.USERDOMAIN + '\\' + process.env.USERNAME;
/* fichier d'identifiants de sauvegarde : les options du compte d'essai (deja [client] user/password/host/port), chiffrees DPAPI */
function identifiants(fichier) {
  const options = (ENV_E2E.MARIADB[0] || '').replace('--defaults-extra-file=', '');
  ps(". '" + path.join(OFFICINE, 'identifiants-sauvegarde.ps1') + "'; $c = [IO.File]::ReadAllText('" + options + "'); [IO.File]::WriteAllText('" + fichier + "', (Chiffrer-Options $c), (New-Object System.Text.UTF8Encoding($false))); icacls '" + fichier + "' /inheritance:r /grant:r '*S-1-5-18:F' '*S-1-5-32-544:F' '" + compteWindows + ":R' | Out-Null");
  return fichier;
}
/* la cle par le vrai script 7 : fichier DPAPI, trace dans la base ; la cle affichee une fois est captee pour verifier les archives */
function creerCle(fichierCle, fichierIdentifiants) {
  const sortie = psFichier(path.join(OFFICINE, '7-cle-archive.ps1'), ['-Creer', '-FichierCle', fichierCle, '-ComptePayara', compteWindows, '-Base', C.BASE, '-FichierOptions', fichierIdentifiants, '-Client', 'mariadb.exe']);
  const cle = (sortie.match(/^\s*([A-Za-z2-9]{4}(?:-[A-Za-z2-9]{4}){7})\s*$/m) || [])[1] || '';
  return { sortie, cle };
}
/* dechiffre une archive avec la cle captee (module PowerShell) ; leve si la cle ne convient pas */
function dechiffrer(archive, vers, cle) {
  return ps(". '" + MODULE + "'; Dechiffrer-Fichier '" + archive + "' '" + vers + "' (Octets-Cle '" + cle + "')").trim();
}
const tailleChiffree = (clair) => 44 + (Math.floor(clair / 16) + 1) * 16 + 32;
const magie = (fichier) => fs.readFileSync(fichier).slice(0, 8).toString('latin1');
const estGzip = (fichier) => { const b = fs.readFileSync(fichier).slice(0, 2); return b[0] === 0x1f && b[1] === 0x8b; };
/* empreinte d'un dump .sql.gz : INSERT par table (nombre, condensat), tables creees, fin */
function empreinte(fichierGz) {
  return new Promise((fini, echec) => {
    const r = { tables: {}, creees: 0, fin: '' };
    const rl = readline.createInterface({ input: fs.createReadStream(fichierGz).pipe(zlib.createGunzip()).on('error', echec), crlfDelay: Infinity });
    rl.on('line', (l) => {
      if (l.startsWith('INSERT INTO `')) { const t = l.slice(13, l.indexOf('`', 13)); r.tables[t] = (r.tables[t] || 0) + 1; }
      else if (l.startsWith('CREATE TABLE')) { r.creees++; }
      else if (l.startsWith('-- Dump completed')) { r.fin = 'Dump completed'; }
    });
    rl.on('close', () => fini(r));
  });
}
/* onglet Sauvegardes */
const S = (sel) => 'supportserveur #ongletSauvegardes ' + sel;
const idComposant = (p, sel) => p.evaluate((s) => Ext.ComponentQuery.query(s)[0].getId(), S(sel));
async function ouvrirSauvegardes(p) {
  await p.click('.supportserveur .x-tab:has-text("Sauvegardes")');
  await p.waitForFunction((s) => { const e = Ext.ComponentQuery.query(s)[0]; return e && /Outil de sauvegarde/.test(e.getEl().dom.textContent); }, S('#sauvEtat'), { timeout: 30000 });
}
const texteSauvegardes = (p) => p.evaluate((s) => Ext.ComponentQuery.query(s)[0].getEl().dom.textContent, S('#sauvEtat'));
const texteRestaurer = (p) => p.evaluate((s) => Ext.ComponentQuery.query(s)[0].getEl().dom.textContent, S('#sauvRestaurer'));
async function sauvegarder(p, apres) {
  await p.click('#' + await idComposant(p, '#btnSauvMaintenant'));
  const t0 = Date.now();
  await p.waitForFunction(([s, i]) => { const r = Ext.ComponentQuery.query(s)[0].getStore().getAt(0); return r && r.get('id') > i && r.get('statut') !== 'EN_COURS'; },
    [S('#sauvListe'), apres], { timeout: 900000, polling: 3000 }).catch(() => {});
  const ligne = await p.evaluate((s) => Ext.ComponentQuery.query(s)[0].getStore().getAt(0).getData(), S('#sauvListe'));
  ligne.duree = Math.round((Date.now() - t0) / 1000);
  return ligne;
}
async function valoriser(p) {
  await p.click('.supportserveur .sauv-valoriser >> nth=0');
  await p.waitForFunction((s) => { const e = Ext.ComponentQuery.query(s)[0]; return e && e.isVisible() && /calculée en|échec|Échec|illisible|absente/.test(e.getEl().dom.textContent); }, S('#sauvValoEntete'), { timeout: 900000, polling: 2000 });
  const entete = await p.evaluate((s) => Ext.ComponentQuery.query(s)[0].getEl().dom.textContent, S('#sauvValoEntete'));
  const t = { entete };
  if (/calculée en/.test(entete)) {
    for (const m of [1, 2, 3]) {
      await p.evaluate(([s, v]) => Ext.ComponentQuery.query(s)[0].select(v), [S('#sauvValoPar'), String(m)]);
      await p.waitForTimeout(800);
      t[m] = await p.evaluate((s) => { const r = { lignes: 0, achatRayon: 0, venteRayon: 0, achatReserve: 0, venteReserve: 0 };
        Ext.ComponentQuery.query(s)[0].getStore().each((x) => { r.lignes++; ['achatRayon', 'venteRayon', 'achatReserve', 'venteReserve'].forEach((k) => { r[k] += x.get(k); }); }); return r; }, S('#sauvValoListe'));
    }
  }
  return t;
}
const ligneSauvegarde = (id) => q("SELECT CONCAT_WS('<|>', id, statut, COALESCE(fichier, ''), taille_octets, COALESCE(copie, ''), COALESCE(message, '')) FROM t_sauvegarde WHERE id = " + id);
const listing = (d) => fs.existsSync(d) ? fs.readdirSync(d).sort() : [];

module.exports = Object.assign({}, C, { CLES, reglages, remettreReglages, RACINE, OFFICINE, MODULE, ps, psFichier, compteWindows, identifiants, creerCle, dechiffrer, tailleChiffree, magie, estGzip, empreinte,
  SAUV: S, ouvrirSauvegardes, texteSauvegardes, texteRestaurer, sauvegarder, valoriser, ligneSauvegarde, listing });
