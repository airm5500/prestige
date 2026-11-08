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

/** Arrete le processus (code 2) si des comptes existent et qu'une source peut atteindre un vrai site. */
function verifier(q, base, domaine) {
  const comptes = Number(q('SELECT COUNT(*) FROM extranet_compte'));
  if (comptes === 0) {
    return;
  }
  let reste;
  try {
    reste = sourcesNonLocales(domaine);
  } catch (e) {
    reste = ['domain.xml illisible (' + domaine + ')'];
  }
  if (reste.length) {
    console.log('ARRET : ' + base + ' contient ' + comptes + ' compte(s) d’extranet (identifiants réels) et le domaine '
      + domaine + ' ne dirige pas vers une adresse locale : ' + reste.join(', ') + '. Test non lancé.');
    process.exit(2);
  }
  console.log('Garde : ' + comptes + ' compte(s) réel(s) en base, toutes les sources dirigées vers 127.0.0.1 : test autorisé.');
}

module.exports = { verifier, sourcesNonLocales, SOURCES };
