/* CONTROLE DE SAISIE COTE SERVEUR : n'importe quoi dans les champs de recherche et de filtre (demande du 07/10).
 *
 * Pourquoi : un utilisateur peut taper des lettres dans une date, un nombre negatif, une apostrophe, un texte de 3 000
 * caracteres... Les tests fonctionnels n'essaient que des valeurs correctes. Ici on essaie les mauvaises.
 *
 * Methode (LECTURE SEULE, rien n'est ecrit en base) : toutes les lectures (GET) de l'API sont relevees dans le code
 * Java (classe @Path + methode @Path + @QueryParam / @PathParam). Chacune est appelee avec plusieurs jeux de valeurs
 * absurdes, le meme jeu dans tous ses parametres :
 *   vide, lettres, negatif, enorme, dates impossibles, apostrophe / injection SQL, balise script, texte tres long,
 *   caracteres speciaux.
 * Attendu : JAMAIS d'erreur interne (HTTP 500) ni de reponse au-dela de 30 s. Un refus propre (4xx, ou success:false,
 * ou une liste vide) est le bon comportement. Toute erreur interne est aussi notee dans le Centre de support : on
 * verifie que leur nombre n'augmente pas.
 * Les lectures qui ont un effet (envoi, synchronisation, deconnexion, appel exterieur...) sont ecartees.
 *
 * Variables : FILTRE=morceau d'url pour limiter ; JEUX=vide,lettres pour limiter les jeux.
 */
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const q = (sql) => execFileSync('mariadb', ['--default-character-set=utf8mb4', process.env.DB_TEST || 'capitale', '-sN', '-e', sql], { encoding: 'utf8' }).trim();

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 600) + ']' : '')); }

/* ------------------------------------------------------------------ relevé des lectures dans le code */
const RACINE = path.resolve(__dirname, '../../../main/java/rest');
function fichiers(d) { return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? fichiers(path.join(d, e.name)) : (e.name.endsWith('.java') ? [path.join(d, e.name)] : [])); }
function lectures() {
  const l = [];
  for (const f of fichiers(RACINE)) {
    const src = fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    const iClasse = src.search(/public\s+(final\s+)?class\s/);
    if (iClasse < 0) { continue; }
    const tete = src.slice(0, iClasse).match(/@Path\(\s*(?:value\s*=\s*)?"([^"]*)"\s*\)/g);
    if (!tete) { continue; }
    const base = tete[tete.length - 1].match(/"([^"]*)"/)[1].replace(/^\/|\/$/g, '');
    const corpsClasse = src.slice(iClasse);
    const re = /@GET\b([\s\S]*?)\{/g; let m;
    while ((m = re.exec(corpsClasse))) {
      const sig = m[1];
      /* corps de la methode : jusqu'a l'annotation de la methode suivante */
      const suite = corpsClasse.slice(re.lastIndex);
      const fin = suite.search(/@(GET|POST|PUT|DELETE|Path)\b/);
      const corps = fin < 0 ? suite : suite.slice(0, fin);
      const pm = sig.match(/@Path\(\s*(?:value\s*=\s*)?"([^"]*)"\s*\)/);
      const sous = pm ? pm[1].replace(/^\/|\/$/g, '') : '';
      const qp = []; const pp = [];
      const rp = /@(Query|Path)Param\(\s*(?:value\s*=\s*)?"([^"]+)"\s*\)\s*(?:@DefaultValue\([^)]*\)\s*)?(?:final\s+)?([\w.<>]+)/g; let x;
      while ((x = rp.exec(sig))) { (x[1] === 'Query' ? qp : pp).push({ nom: x[2], type: x[3] }); }
      l.push({ fichier: path.basename(f), chemin: (base + (sous ? '/' + sous : '')).replace(/\/+/g, '/'), qp, pp, agit: AGIT.test(corps) });
    }
  }
  return l;
}

/* une lecture dont le code appelle une methode d'ecriture (meme si son nom ne le dit pas, ex. « ponctionner ») */
const AGIT = /\.(save|update|change|make|suggerer|compute|reclass|create|delete|remove|persist|merge|ponction|appliquer|apply|valider|cloturer|envoy|send|import|generer|recalcul|actualiser|marquer|faire|execute|traiter|reset|init|annuler|regler|transferer|fusionner|purger|archiver|desactiver|activer|enregistrer|ajouter|supprimer|modifier|creer)\w*\s*\(|executeUpdate|em\.(persist|merge|remove)/;
/* lectures qui font quelque chose (ou appellent l'exterieur) : jamais appelees ici */
/* ErpRessource : exports complets pour le logiciel comptable externe (sans champ de saisie, tres longs) */
const ECARTEES = /(^Erp|^v1\/erp|^Custom|^Maintenance|^v1\/maintenance|constraint|ponction|gettoken|suggerer|compute|reclass|logout|deconnexion|deconnect|envoy|send|sms|mail|whatsapp|sync|pharmaml|posos|cloturer|cloture|valider|supprim|delete|remove|reset|purge|imprimer-ticket|ticket-caisse|print|backup|sauvegard|webhook|test-connexion|ping-|appeler|transmettre|lancer|executer|run|update|maj|mise-a-jour|miseajour|generer|regenerer|creer|create|init|calcul|import|actualiser|migr|fusion|merge|close|ferme|ouvrir|annul|cancel|rembours|regler|reglement-|transfert|appliquer|modifier|activer|desactiv|enable|disable|archiv|notifier|marquer|lire-tout|vider|clean|nettoy|corrig|fix|repar|recalc|rattrap|bascul|demarrer|arreter|stop|start-)/i;

const LONG = 'x'.repeat(3000);
/* valeur absurde selon le jeu et le type ou le nom du parametre */
const JEUX = {
  vide: () => '',
  lettres: () => 'abc',
  negatif: (p) => /int|long|double|float|Integer|Long|Double|BigDecimal|short/i.test(p.type) ? '-999999' : '-1',
  enorme: () => '99999999999999999999',
  dates: (p) => /dt|date|jour|debut|fin|start|end|mois|annee|periode/i.test(p.nom) ? '2026-13-45' : '31/02/2026',
  apostrophe: () => "l'apostrophe' OR '1'='1' --",
  script: () => '<script>alert(1)</script>',
  long: () => LONG,
  speciaux: () => '%_\\;"é€😀\u0000'
};

(async () => {
  let toutes = lectures();
  const total = toutes.length;
  /* les exports (excel, pdf, csv) reprennent les filtres de leur liste, deja essayee : ils sont les plus lourds et
     occupaient les fils du serveur de longues minutes */
  const EXPORT = /(excel|pdf|csv|export|imprim)/i;
  /* lectures lentes CONNUES, a traiter a part (pas un defaut de saisie) : v1/info sans recherche renvoie tous les
     articles vendus sur 6 mois (interface pour un client externe, aucun ecran ne l'appelle) */
  const LENTES_CONNUES = /^v1\/info$/;
  toutes = toutes.filter((e) => !e.agit && !ECARTEES.test(e.chemin) && !ECARTEES.test(e.fichier) && !EXPORT.test(e.chemin) && !LENTES_CONNUES.test(e.chemin));
  const ecartees = total - toutes.length;
  if (process.env.FILTRE) { const fl = process.env.FILTRE.split(','); toutes = toutes.filter((e) => fl.some((x) => x.startsWith('=') ? e.chemin === x.slice(1) : e.chemin.includes(x))); }
  const jeux = process.env.JEUX ? process.env.JEUX.split(',') : Object.keys(JEUX);
  console.log(total + ' lectures relevées, ' + toutes.length + ' appelées (' + ecartees + ' écartées car elles agissent), ' + jeux.length + ' jeux de valeurs');
  ok('le relevé trouve les lectures de l\'API', total > 500, total);

  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext();
  const p = await ctx.newPage();
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    const supportAvant = Number(q('SELECT COALESCE(SUM(occurrences), 0) FROM t_application_event'));
    /* garde-fou : aucune table ne doit etre modifiee par des LECTURES. On releve les tables qui ont une date de
       creation ou de mise a jour (hors journaux et sessions), pour compter apres coup les lignes ecrites pendant
       l'essai. */
    const debutEssai = q("SELECT DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s')");
    const JOURNAUX = /^(t_application_event|t_application_event_occurrence|t_event_log|t_session_utilisateur|t_user_session|t_support_|t_mouchard|t_log|t_preference_utilisateur|flyway)/;
    const tablesDatees = q("SELECT CONCAT(c.TABLE_NAME, ':', c.COLUMN_NAME) FROM information_schema.COLUMNS c JOIN information_schema.TABLES t ON t.TABLE_SCHEMA = c.TABLE_SCHEMA AND t.TABLE_NAME = c.TABLE_NAME"
      + " WHERE c.TABLE_SCHEMA = DATABASE() AND t.TABLE_TYPE = 'BASE TABLE' AND c.DATA_TYPE IN ('datetime', 'timestamp') AND c.COLUMN_NAME IN ('dt_CREATED', 'dt_UPDATED', 'created_at', 'updated_at', 'modified_at')")
      .split('\n').filter(Boolean).map((l) => l.split(':')).filter((x) => !JOURNAUX.test(x[0]));
    const erreurs = []; const lents = []; let appels = 0;
    const appeler = async (e, jeu) => {
      let chemin = e.chemin.replace(/\{(\w+)(?::[^}]*)?\}/g, (_, n) => encodeURIComponent(JEUX[jeu]({ nom: n, type: 'String' }) || 'zz'));
      const qs = new URLSearchParams(); e.qp.forEach((x) => qs.append(x.nom, JEUX[jeu](x)));
      const url = 'http://localhost:8080/prestige/api/' + chemin + (e.qp.length ? '?' + qs.toString() : '');
      const t0 = Date.now(); appels++;
      try {
        /* une connexion gardee ouverte que le serveur vient de fermer (« socket hang up » immediat) : on reessaie une fois */
        const lire = () => ctx.request.get(url, { timeout: 30000, failOnStatusCode: false, maxRedirects: 0 });
        const r = await lire().catch((x) => { if (/hang up|ECONNRESET/.test(x.message) && Date.now() - t0 < 1000) { return lire(); } throw x; });
        if (r.status() >= 500) { erreurs.push(e.fichier + ' GET ' + e.chemin + ' [' + jeu + '] -> ' + r.status()); }
      } catch (x) {
        lents.push(e.fichier + ' GET ' + e.chemin + ' [' + jeu + '] ' + (Date.now() - t0) + ' ms : ' + String(x.message).split('\n')[0].slice(0, 80));
      }
    };
        /* une lecture sans parametre n'est appelee qu'une fois (rien a saisir) */
    const file = []; toutes.forEach((e) => (e.qp.length || e.pp.length ? jeux : jeux.slice(0, 1)).forEach((j) => file.push([e, j])));
    /* 2 appels a la fois : assez pour aller vite, sans occuper tous les fils du serveur */
    const travailleur = async () => { while (file.length) { const [e, j] = file.shift(); await appeler(e, j); } };
    await Promise.all([travailleur(), travailleur()]);
    console.log(appels + ' appels');
    /* la session est toujours ouverte : aucune lecture n'a deconnecte l'utilisateur */
    const session = await ctx.request.get('http://localhost:8080/prestige/api/v1/preferences/essai-saisie', { failOnStatusCode: false });
    ok('la session est toujours ouverte après tous les appels', session.status() < 400, session.status());
    ok('aucune erreur interne (HTTP 500) quelle que soit la saisie', erreurs.length === 0, erreurs.length + ' : ' + erreurs.slice(0, 15).join(' | '));
    ok('aucune lecture ne dépasse 30 s', lents.length === 0, lents.slice(0, 10).join(' | '));
    const ecrites = [];
    for (const [t, c] of tablesDatees) {
      try { const n = Number(q('SELECT COUNT(*) FROM `' + t + '` WHERE `' + c + "` >= '" + debutEssai + "'")); if (n > 0) { ecrites.push(t + '.' + c + ' : ' + n); } } catch (e) { /* table illisible */ }
    }
    ok('aucune table modifiée par les lectures (' + tablesDatees.length + ' colonnes de date surveillées)', ecrites.length === 0, ecrites.join(' | '));
    const supportApres = Number(q('SELECT COALESCE(SUM(occurrences), 0) FROM t_application_event'));
    ok('aucune nouvelle erreur au Centre de support', supportApres === supportAvant, (supportApres - supportAvant) + ' nouvelles');
    if (erreurs.length) { fs.writeFileSync(path.join(process.env.SORTIE || '/tmp', 'saisie-api-erreurs.txt'), erreurs.join('\n') + '\n\n' + lents.join('\n')); }
  } catch (e) {
    ok('déroulé sans exception', false, e.stack);
  } finally {
    await b.close();
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
