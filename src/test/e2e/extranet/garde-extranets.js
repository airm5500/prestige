/* GARDE des tests d'ecran des extranets (incident du 08/11, puis choix de l'utilisateur du 08/11 « tout vers le faux »).
 *
 * Si la base contient des comptes d'extranet, ce sont des identifiants reels : l'ecran s'y connecte seul a
 * l'ouverture. Le test n'est alors accepte que si le domaine Payara teste dirige TOUTES les sources vers une adresse
 * locale (-DEXTRANET_<SOURCE>_URL=http://127.0.0.1:...) dans server-config : aucun appel ne peut atteindre un vrai site.
 * Les tests qui effacent des comptes (test-identifiants-extranet) n'utilisent pas cette garde : ils restent interdits
 * des qu'un compte existe.
 */
const fs = require('fs');
const path = require('path');

const SOURCES = ['UBIPHARM', 'TEDIS', 'COPHARMED', 'DPCI', 'MAYITE'];

/** Options de la JVM de server-config du domaine (texte des balises jvm-options). */
function optionsServeur(domaine) {
  const xml = fs.readFileSync(path.join(domaine, 'config', 'domain.xml'), 'utf8');
  const debut = xml.indexOf('<config name="server-config"');
  const bloc = debut < 0 ? '' : xml.slice(debut, xml.indexOf('</config>', debut));
  return [...bloc.matchAll(/<jvm-options>([^<]*)<\/jvm-options>/g)].map((m) => m[1]);
}

/** Sources dont l'adresse n'est pas locale dans le domaine (vide : tout vise 127.0.0.1). */
function sourcesNonLocales(domaine) {
  const o = optionsServeur(domaine);
  return SOURCES.filter((s) => !o.some((x) => new RegExp('^-DEXTRANET_' + s + '_URL=https?\\\\?://(127\\.0\\.0\\.1|localhost)\\\\?:').test(x)));
}

/**
 * Arrete le processus (code 2) si une source peut atteindre un vrai site. 09/11 : exige meme sans compte en base (avant :
 * sans compte, le test partait ; sur domain1, sans redirection, la lecture d'essai a vise le vrai site Ubipharm).
 */
function verifier(q, base, domaine) {
  const comptes = Number(q('SELECT COUNT(*) FROM extranet_compte'));
  let reste;
  try {
    reste = sourcesNonLocales(domaine);
  } catch (e) {
    reste = ['domain.xml illisible (' + domaine + ')'];
  }
  if (reste.length) {
    console.log('ARRET : le domaine ' + domaine + ' (' + base + ', ' + comptes + ' compte(s) d’extranet en base) ne dirige pas'
      + ' vers une adresse locale : ' + reste.join(', ') + '. Test non lancé (il viserait un vrai extranet).');
    process.exit(2);
  }
  console.log('Garde : toutes les sources dirigées vers 127.0.0.1 (' + comptes + ' compte(s) en base) : test autorisé.');
}

/*
 * Donnees d'extranet deja gardees (lues sur les vrais sites par l'utilisateur) : une lecture du test les remplace et son
 * nettoyage les effacerait. Copie complete avant le test, remise a l'identique apres (meme contenu, memes id), controlee
 * par CHECKSUM TABLE.
 */
function sauver(q, tables) {
  const avant = {};
  for (const t of tables) {
    q('DROP TABLE IF EXISTS e2e_sauve_' + t + '; CREATE TABLE e2e_sauve_' + t + ' AS SELECT * FROM ' + t);
    avant[t] = q('CHECKSUM TABLE ' + t).split('\t')[1];
  }
  return avant;
}

/** Remet les tables a leur copie ; renvoie la liste des tables dont l'empreinte differe encore (vide : identique). */
function restaurer(q, tables, avant) {
  const ordre = tables.slice().reverse();
  q('SET FOREIGN_KEY_CHECKS = 0; ' + ordre.map((t) => 'DELETE FROM ' + t + ';').join(' ') + ' '
    + tables.map((t) => 'INSERT INTO ' + t + ' SELECT * FROM e2e_sauve_' + t + ';').join(' ') + ' SET FOREIGN_KEY_CHECKS = 1;');
  const ecarts = tables.filter((t) => q('CHECKSUM TABLE ' + t).split('\t')[1] !== avant[t]);
  if (!ecarts.length) {
    q(tables.map((t) => 'DROP TABLE e2e_sauve_' + t + ';').join(' '));
  }
  return ecarts;
}

module.exports = { verifier, sourcesNonLocales, SOURCES, sauver, restaurer };
