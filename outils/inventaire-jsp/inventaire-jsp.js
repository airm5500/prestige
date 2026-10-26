#!/usr/bin/env node
/*
 * Inventaire des JSP de Prestige et de leurs appelants (preparation du passage complet en API REST).
 *
 * Lecture seule : le script lit le code (webapp, Java, migrations Flyway) et ecrit ses resultats dans le dossier
 * passe en argument (par defaut : le dossier temporaire). Il n'ouvre ni la base ni Payara.
 *
 *   node outils/inventaire-jsp/inventaire-jsp.js [dossier-de-sortie]
 *
 * Sorties :
 *   inventaire-jsp.json   : tout le detail (JSP, appels avec fichier:ligne, chaines ecran -> menu, API REST)
 *   inventaire-jsp.tsv    : une ligne par JSP (classement, appelants, ecrans racines)
 *   api-rest.tsv          : les points d'entree REST (verbe, chemin, classe:ligne)
 *
 * Methode, pour chaque JSP :
 *   1. Appels directs : toute chaine « xxx.jsp » hors commentaire, dans les .js/.jsp/.html/.java, resolue en chemin
 *      (prefixe du chemin, variable concatenee, ou nom de fichier unique). Les appels seulement en commentaire sont
 *      gardes a part (« commente »).
 *   2. Ecrans : le fichier ExtJS appelant est relie a ses classes (Ext.define, alias, xtype) ; on remonte le graphe
 *      « fichier A utilise la classe/xtype de B » (et vue -> controleur) jusqu'aux ecrans racines que rien d'autre
 *      n'ouvre. Un ecran racine s'ouvre par le menu (t_sous_menu.str_COMPOSANT) ou par un autre point d'entree.
 *   3. Libelles de menu : connus seulement quand une migration Flyway ou un commentaire de correctifs-affichage.js les
 *      donne ; sinon « a verifier a l'ecran » (les anciens menus ne sont qu'en base).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');

const RACINE = path.resolve(__dirname, '..', '..');
const WEBAPP = path.join(RACINE, 'src', 'main', 'webapp');
const JAVA = path.join(RACINE, 'src', 'main', 'java');
const MIGRATIONS = path.join(RACINE, 'src', 'main', 'resources', 'db', 'migration');
const SORTIE = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'inventaire-jsp'));

const rel = (f) => path.relative(RACINE, f).split(path.sep).join('/');
const relWeb = (f) => path.relative(WEBAPP, f).split(path.sep).join('/');

/* Bibliotheques tierces, sans appel a nos JSP */
const EXCLUS = [/[\\/]general[\\/]ext[\\/]/, /[\\/]general[\\/]build[\\/]/, /[\\/]node_modules[\\/]/, /\.min\.js$/,
    /[\\/]resources[\\/]boostrap[\\/]/, /[\\/]general[\\/]sass[\\/]/];

function lister(dir, exts, out = []) {
    if (!fs.existsSync(dir)) {
        return out;
    }
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const f = path.join(dir, e.name);
        if (EXCLUS.some((r) => r.test(f))) {
            continue;
        }
        if (e.isDirectory()) {
            lister(f, exts, out);
        } else if (exts.includes(path.extname(e.name).toLowerCase())) {
            out.push(f);
        }
    }
    return out;
}

const lire = (f) => fs.readFileSync(f, 'latin1');

/*
 * Blanchit les commentaires en gardant les numeros de ligne. JS/Java : // et bloc ; JSP/HTML : <%-- --%> et
 * <!-- -->, plus les commentaires JS/Java dans les blocs <script> et <% %> (approximation : on applique aussi le
 * blanchiment JS au reste du fichier, en ignorant les « // » precedes de « : » pour garder les URL http://).
 */
function blanchirJs(src) {
    let out = '', i = 0, n = src.length, ch, quote = null;
    while (i < n) {
        ch = src[i];
        if (quote) {
            out += ch;
            if (ch === '\\' && i + 1 < n) {
                out += src[i + 1];
                i += 2;
                continue;
            }
            if (ch === quote || (ch === '\n' && quote !== '`')) {
                quote = null;
            }
            i++;
            continue;
        }
        if (ch === '"' || ch === '\'' || ch === '`') {
            quote = ch;
            out += ch;
            i++;
            continue;
        }
        if (ch === '/' && src[i + 1] === '/' && src[i - 1] !== ':' && src[i - 1] !== '\\') {
            while (i < n && src[i] !== '\n') {
                out += ' ';
                i++;
            }
            continue;
        }
        if (ch === '/' && src[i + 1] === '*') {
            while (i < n && !(src[i] === '*' && src[i + 1] === '/')) {
                out += src[i] === '\n' ? '\n' : ' ';
                i++;
            }
            out += '  ';
            i += 2;
            continue;
        }
        out += ch;
        i++;
    }
    return out;
}

function blanchirBalises(src, debut, fin) {
    let out = '', i = 0;
    for (;;) {
        const a = src.indexOf(debut, i);
        if (a < 0) {
            return out + src.slice(i);
        }
        let b = src.indexOf(fin, a + debut.length);
        b = b < 0 ? src.length : b + fin.length;
        out += src.slice(i, a) + src.slice(a, b).replace(/[^\n]/g, ' ');
        i = b;
    }
}

function blanchir(f, src) {
    const ext = path.extname(f).toLowerCase();
    if (ext === '.js' || ext === '.java') {
        return blanchirJs(src);
    }
    let s = blanchirBalises(src, '<%--', '--%>');
    s = blanchirBalises(s, '<!--', '-->');
    return blanchirJs(s);
}

const ligneDe = (src, idx) => src.slice(0, idx).split('\n').length;

/* ---------- 1. JSP ---------- */
const jsps = lister(WEBAPP, ['.jsp', '.jspf']).map((f) => ({ abs: f, web: relWeb(f), nom: path.basename(f) }));
const parChemin = new Map(jsps.map((j) => [j.web.toLowerCase(), j]));

/* ---------- 2. Fichiers sources ---------- */
const sourcesWeb = lister(WEBAPP, ['.js', '.jsp', '.jspf', '.html', '.htm']);
const sourcesJava = lister(JAVA, ['.java']);
const sources = sourcesWeb.concat(sourcesJava).map((f) => {
    const brut = lire(f);
    return { abs: f, rel: rel(f), brut, net: blanchir(f, brut) };
});

/* Variables globales portant le chemin d'une JSP : var url_x = '../webservices/.../ws_data.jsp' */
const RE_REF = /([A-Za-z0-9_./-]*?)([A-Za-z0-9_-]+\.jspf?)(?![A-Za-z0-9_])/g;

function normaliserPrefixe(p) {
    let s = p.replace(/\\/g, '/');
    const iw = s.toLowerCase().lastIndexOf('webservices/');
    if (iw >= 0) {
        return s.slice(iw);
    }
    s = s.replace(/^(\.\.?\/)+/, '').replace(/^\/?prestige\//, '').replace(/^\//, '');
    return s;
}

function resoudre(source, prefixe, nom, ligneTexte) {
    /* une URL relative ecrite dans un .js se resout depuis la page qui le charge (general/index.jsp), pas depuis le .js */
    const dirSource = source.abs.endsWith(".js") && source.abs.startsWith(path.join(WEBAPP, "general"))
        ? path.join(WEBAPP, "general") : path.dirname(source.abs);
    const p = normaliserPrefixe(prefixe);
    /* 1. chemin relatif au fichier appelant (includes JSP, pages voisines) */
    if (prefixe && !prefixe.startsWith('/') && source.abs.startsWith(WEBAPP)) {
        const cand = relWeb(path.resolve(dirSource, prefixe + nom)).toLowerCase();
        if (parChemin.has(cand)) {
            return { jsp: [parChemin.get(cand)], mode: 'chemin relatif' };
        }
    }
    /* 2. suffixe de chemin */
    if (p) {
        const suff = (p + nom).toLowerCase();
        const c = jsps.filter((j) => j.web.toLowerCase().endsWith(suff) || ('/' + j.web.toLowerCase()).endsWith('/' + suff));
        if (c.length) {
            return { jsp: c, mode: c.length === 1 ? 'chemin' : 'chemin ambigu' };
        }
        if (p.includes('/')) {
            return { jsp: [], mode: 'introuvable (JSP absente du depot)' };
        }
    }
    /* 3. variable concatenee : url + "ws_login.jsp" */
    const m = new RegExp('([A-Za-z_$][\\w$]*)\\s*\\+\\s*["\']' + nom.replace('.', '\\.')).exec(ligneTexte);
    if (m) {
        const def = new RegExp('\\b' + m[1].replace('$', '\\$') + '\\s*=\\s*["\']([^"\']*)["\']').exec(source.net);
        if (def) {
            const r = resoudre(source, def[1], nom, '');
            if (r.jsp.length) {
                return { jsp: r.jsp, mode: 'variable ' + m[1] };
            }
        }
    }
    /* 4. meme dossier que l'appelant */
    if (source.abs.startsWith(WEBAPP)) {
        const cand = relWeb(path.join(dirSource, nom)).toLowerCase();
        if (parChemin.has(cand)) {
            return { jsp: [parChemin.get(cand)], mode: 'meme dossier' };
        }
    }
    /* 5. nom de fichier seul */
    const c = jsps.filter((j) => j.nom.toLowerCase() === nom.toLowerCase());
    return { jsp: c, mode: c.length === 1 ? 'nom unique' : (c.length ? 'nom ambigu' : 'introuvable') };
}

const appels = []; // {jsp, source, ligne, texte, mode, commente, java}
const nonResolus = [];
for (const s of sources) {
    for (const [texte, commente] of [[s.net, false], [s.brut, true]]) {
        RE_REF.lastIndex = 0;
        let m;
        while ((m = RE_REF.exec(texte))) {
            if (commente && s.net.slice(m.index, m.index + m[0].length) === m[0]) {
                continue; // deja compte hors commentaire
            }
            const ligne = ligneDe(texte, m.index);
            const ligneTexte = s.brut.split('\n')[ligne - 1] || '';
            const r = resoudre(s, m[1], m[2], ligneTexte);
            if (!r.jsp.length || r.mode.endsWith('ambigu')) {
                nonResolus.push({ source: s.rel, ligne, ref: m[0], mode: r.mode, candidats: r.jsp.map((j) => j.web), commente });
            }
            if (r.mode === 'nom ambigu' || r.mode === 'chemin ambigu') {
                continue;
            }
            for (const j of r.jsp) {
                if (j.abs === s.abs) {
                    continue; // une JSP qui se cite elle-meme (formulaire vers soi, commentaire d'en-tete)
                }
                appels.push({ jsp: j.web, source: s.rel, ligne, texte: ligneTexte.trim().slice(0, 200), mode: r.mode, commente,
                    java: s.abs.endsWith('.java') });
            }
        }
    }
}

/* Variables globales definies avec le chemin d'une JSP puis employees ailleurs */
/* seulement les var de premier niveau (debut de ligne), aux noms assez precis pour ne pas se confondre avec « url: » */
const RE_VAR = /^(?:var\s+|window\.)([A-Za-z_$][\w$]{5,})\s*=\s*["']([^"']*\.jspf?)[^"']*["']/gm;
const varsGlobales = [];
for (const s of sources.filter((x) => x.abs.endsWith('.js'))) {
    RE_VAR.lastIndex = 0;
    let m;
    while ((m = RE_VAR.exec(s.net))) {
        const nom = path.basename(m[2]);
        const r = resoudre(s, m[2].slice(0, m[2].length - nom.length), nom, '');
        if (r.jsp.length === 1 && /^url|^URL|_url|Url/.test(m[1])) {
            varsGlobales.push({ variable: m[1], jsp: r.jsp[0].web, source: s.rel });
        }
    }
}
for (const v of varsGlobales) {
    const re = new RegExp('(^|[^\\w$.])' + v.variable.replace(/\$/g, '\\$') + '(?![\\w$])(?!\\s*:)', 'g');
    for (const s of sources.filter((x) => x.abs.endsWith('.js') && x.rel !== v.source)) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(s.net))) {
            /* une redefinition locale (var x = ...) dans le fichier n'est pas un emploi de la globale */
            if (new RegExp('\\bvar\\s+' + v.variable.replace(/\$/g, '\\$') + '\\b').test(s.net)) {
                break;
            }
            const ligne = ligneDe(s.net, m.index);
            appels.push({ jsp: v.jsp, source: s.rel, ligne, texte: (s.brut.split('\n')[ligne - 1] || '').trim().slice(0, 200),
                mode: 'variable globale ' + v.variable + ' (definie dans ' + v.source + ')', commente: false, java: false });
            break;
        }
    }
}

/*
 * URL declaree mais jamais employee : « var url_x = '...jsp' » dont la variable n'est lue nulle part (ni dans le
 * fichier, ni ailleurs, les var de premier niveau etant globales). Un tel appel ne part jamais : il ne compte pas.
 * Un emploi = l'identifiant hors declaration, hors affectation, hors acces « .x » et hors cle « x: ».
 */
const emplois = new Map();
for (const s of sources.filter((x) => x.abs.endsWith('.js') || /\.jspf?$|\.html?$/.test(x.abs))) {
    const re = /(\.\s*|\b(?:var|let|const)\s+)?([A-Za-z_$][\w$]*)(\s*:(?!:)|\s*=(?!=))?/g;
    let m;
    while ((m = re.exec(s.net))) {
        if (!m[1] && !m[3]) {
            emplois.set(m[2], (emplois.get(m[2]) || 0) + 1);
        }
    }
}
for (const a of appels.filter((x) => !x.commente && !x.java)) {
    const d = /^\s*(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*['"][^'"]*\.jspf?/.exec(a.texte);
    if (d && !emplois.get(d[1])) {
        a.inutilisee = d[1];
    }
}
for (const n of nonResolus) {
    const s = sources.find((x) => x.rel === n.source);
    const d = /^\s*(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=/.exec(s ? s.brut.split('\n')[n.ligne - 1] || '' : '');
    if (d && !emplois.get(d[1])) {
        n.inutilisee = d[1];
    }
}
const actif = (x) => !x.commente && !x.inutilisee;

/* ---------- 3. Graphe ExtJS ---------- */
const APP = path.join(WEBAPP, 'general', 'app');
const fichiersApp = sources.filter((s) => s.abs.startsWith(APP) && s.abs.endsWith('.js'));
const autresJs = sources.filter((s) => s.abs.endsWith('.js') && !s.abs.startsWith(APP));
const parClasse = new Map(); // nom de classe -> fichier
const parXtype = new Map(); // xtype -> [fichiers]
const infos = new Map(); // fichier -> {classes, xtypes, controleur, selecteurs}

function ajouterXtype(x, f) {
    if (!parXtype.has(x)) {
        parXtype.set(x, []);
    }
    if (!parXtype.get(x).includes(f)) {
        parXtype.get(x).push(f);
    }
}

for (const s of fichiersApp.concat(autresJs)) {
    const classes = [], xtypes = [];
    let m;
    const reDef = /Ext\.define\(\s*['"]([\w.]+)['"]/g;
    while ((m = reDef.exec(s.net))) {
        classes.push(m[1]);
        parClasse.set(m[1], s.rel);
    }
    const reAlias = /alias\s*:\s*(\[[^\]]*\]|['"][^'"]+['"])/g;
    while ((m = reAlias.exec(s.net))) {
        for (const a of m[1].match(/widget\.([\w-]+)/g) || []) {
            xtypes.push(a.slice(7));
        }
    }
    /* xtype declare au niveau du define : meme indentation que « extend: » */
    const lignes = s.net.split('\n');
    const lExtend = lignes.find((l) => /^\s*extend\s*:/.test(l));
    if (lExtend) {
        const ind = lExtend.match(/^\s*/)[0].length;
        for (const l of lignes) {
            const mx = /^(\s*)xtype\s*:\s*['"]([\w-]+)['"]/.exec(l);
            if (mx && mx[1].length === ind) {
                xtypes.push(mx[2]);
            }
        }
    }
    const controleur = /extend\s*:\s*['"]Ext\.app\.Controller['"]/.test(s.net);
    const selecteurs = [];
    if (controleur) {
        const reSel = /selector\s*:\s*['"]([^'"]+)['"]/g;
        while ((m = reSel.exec(s.net))) {
            selecteurs.push(m[1].trim().split(/[\s#>[.]/)[0]);
        }
        const iCtl = s.net.search(/\bcontrol\s*\(\s*\{|\bcontrol\s*:\s*\{/);
        if (iCtl >= 0) {
            const reCle = /^\s*['"]([^'"]+)['"]\s*:\s*\{/gm;
            reCle.lastIndex = iCtl;
            while ((m = reCle.exec(s.net))) {
                selecteurs.push(m[1].trim().split(/[\s#>[.]/)[0]);
            }
        }
        const v = /views\s*:\s*\[([^\]]*)\]/.exec(s.net);
        if (v) {
            for (const c of v[1].match(/['"][\w.]+['"]/g) || []) {
                selecteurs.push('classe:' + c.slice(1, -1));
            }
        }
    }
    infos.set(s.rel, { classes, xtypes: [...new Set(xtypes)], controleur, selecteurs: [...new Set(selecteurs.filter(Boolean))] });
    for (const x of new Set(xtypes)) {
        ajouterXtype(x, s.rel);
    }
}

/* Aretes : utilisateur -> utilise, avec preuve fichier:ligne. app.js (liste de tous les requires) est exclu. */
const aretes = new Map(); // cible -> [{de, ligne, comment}]
function arete(de, vers, ligne, comment) {
    if (de === vers) {
        return;
    }
    if (!aretes.has(vers)) {
        aretes.set(vers, []);
    }
    const l = aretes.get(vers);
    if (!l.some((a) => a.de === de)) {
        l.push({ de, ligne, comment });
    }
}
const XTYPES_NATIFS = new Set(['panel', 'grid', 'gridpanel', 'button', 'textfield', 'combobox', 'combo', 'container',
    'fieldset', 'form', 'toolbar', 'window', 'tabpanel', 'label', 'displayfield', 'datefield', 'numberfield',
    'hiddenfield', 'checkbox', 'radiogroup', 'radiofield', 'checkboxgroup', 'pagingtoolbar', 'tbfill', 'tbseparator',
    'menu', 'menuitem', 'image', 'textareafield', 'textarea', 'timefield', 'filefield', 'fieldcontainer', 'treepanel',
    'chart', 'actioncolumn', 'rownumberer', 'splitbutton', 'component', 'box', 'tbtext', 'gridcolumn', 'datecolumn',
    'numbercolumn', 'checkcolumn', 'templatecolumn', 'booleancolumn', 'segmentedbutton', 'dataview', 'cycle']);

for (const s of fichiersApp.concat(autresJs)) {
    if (/general\/(app|bootstrap)\.js$|correctifs-affichage\.js$/.test(s.rel)) { // listes de classes ou d'xtypes, pas des ouvertures d'ecran
        continue;
    }
    let m;
    const reCl = /(?:['"]|\bnew\s+)(testextjs\.[\w.]+)/g; // chaine ou « new testextjs.view.X(...) »
    while ((m = reCl.exec(s.net))) {
        const f = parClasse.get(m[1]);
        if (f) {
            arete(s.rel, f, ligneDe(s.net, m.index), 'classe ' + m[1]);
        }
    }
    const reX = /(?:xtype\s*:\s*|onLoadNewComponent\w*\(\s*|Ext\.widget\(\s*|widget\.|xtype\s*={1,3}\s*)['"]?([\w-]+)['"]?/g;
    while ((m = reX.exec(s.net))) {
        if (XTYPES_NATIFS.has(m[1])) {
            continue;
        }
        /* onLoadNewComponent(...) ou « var xtype = 'x' » (passe ensuite a onLoadNewComponent) : ouverture d'un ecran entier */
        const nav = /^onLoadNewComponent/.test(m[0]) || /^xtype\s*=\s*[^=]/.test(m[0]);
        for (const f of parXtype.get(m[1]) || []) {
            arete(s.rel, f, ligneDe(s.net, m.index), (nav ? 'ouvre l\'ecran ' : 'xtype ') + m[1]);
        }
    }
    /* App.ecranReel : « if (xtype === 'a' ...) return 'b' » -> l'ecran a ouvre b */
    const reRe = /xtype\s*===\s*['"]([\w-]+)['"][^\n]*\n\s*return\s+['"]([\w-]+)['"]/g;
    while ((m = reRe.exec(s.net))) {
        for (const fa of parXtype.get(m[1]) || []) {
            for (const fb of parXtype.get(m[2]) || []) {
                arete(fa, fb, ligneDe(s.net, m.index), 'ecranReel ' + m[1] + ' -> ' + m[2] + ' (' + s.rel + ')');
            }
        }
    }
    /* vue -> controleur */
    const inf = infos.get(s.rel);
    if (inf && inf.controleur) {
        for (const sel of inf.selecteurs) {
            const vues = sel.startsWith('classe:') ? [parClasse.get(sel.slice(7))].filter(Boolean) : (parXtype.get(sel) || []);
            for (const v of vues) {
                /* preuve : ligne ou le controleur cite la vue (selecteur ou nom de classe) */
                const iSel = s.net.indexOf(sel.startsWith('classe:') ? sel.slice(7) : sel);
                arete(v, s.rel, 0, 'vue pilotee par ' + path.basename(s.rel) + (iSel >= 0 ? ':' + ligneDe(s.net, iSel) : '')
                    + ' (selecteur ' + sel + ')');
            }
        }
    }
}

/* ---------- 4. Menus connus par le code (migrations, correctifs-affichage.js) ---------- */
const menusParComposant = new Map(); // xtype -> [{libelle, menuParent, preuve}]
const libelleMenu = new Map(); // lg_MENU_ID -> libelle
function parserValeurs(txt) {
    const out = [];
    let i = 0, cur = '', q = null;
    for (; i < txt.length; i++) {
        const c = txt[i];
        if (q) {
            if (c === '\\') {
                cur += txt[++i];
            } else if (c === q && txt[i + 1] === q) {
                cur += c;
                i++;
            } else if (c === q) {
                q = null;
            } else {
                cur += c;
            }
        } else if (c === '\'' || c === '"') {
            q = c;
        } else if (c === ',') {
            out.push(cur.trim());
            cur = '';
        } else {
            cur += c;
        }
    }
    out.push(cur.trim());
    return out;
}
const migrations = fs.existsSync(MIGRATIONS) ? fs.readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort() : [];
const menusMig = [];
for (const f of migrations) {
    const src = fs.readFileSync(path.join(MIGRATIONS, f), 'utf8');
    const re = /INSERT\s+(?:IGNORE\s+)?INTO\s+`?(t_sous_menu|t_menu)`?\s*\(([^)]*)\)\s*VALUES\s*([\s\S]*?);\s*(?:\n|$)/gi;
    let m;
    while ((m = re.exec(src))) {
        const cols = m[2].split(',').map((c) => c.replace(/[`\s]/g, ''));
        const tuples = m[3].match(/\((?:[^()']|'(?:[^'\\]|\\.|'')*')*\)/g) || [];
        for (const t of tuples) {
            const v = parserValeurs(t.slice(1, -1));
            const o = {};
            cols.forEach((c, k) => (o[c] = v[k]));
            const ligne = ligneDe(src, m.index);
            if (m[1].toLowerCase() === 't_menu') {
                if (o.lg_MENU_ID) {
                    libelleMenu.set(o.lg_MENU_ID, o.str_DESCRIPTION);
                }
            } else if (o.str_COMPOSANT) {
                menusMig.push({ composant: o.str_COMPOSANT, libelle: o.str_DESCRIPTION, lgMenu: o.lg_MENU_ID,
                    statut: o.str_Status || o.str_STATUS, preuve: 'src/main/resources/db/migration/' + f + ':' + ligne });
            }
        }
    }
    /* renommages : UPDATE t_sous_menu SET str_DESCRIPTION = '...' ... WHERE str_COMPOSANT = '...' */
    const reU = /UPDATE\s+`?t_sous_menu`?\s+SET\s+([\s\S]*?)\s+WHERE\s+([\s\S]*?);/gi;
    while ((m = reU.exec(src))) {
        const d = /str_DESCRIPTION\s*=\s*'((?:[^'\\]|\\.|'')*)'/i.exec(m[1]);
        const c = /str_COMPOSANT\s*(?:=|IN\s*\()\s*'([^']+)'/i.exec(m[2]);
        const st = /str_Status\s*=\s*'(\w+)'/i.exec(m[1]);
        if (c && (d || st)) {
            menusMig.push({ composant: c[1], libelle: d ? d[1].replace(/''/g, '\'') : null, statut: st ? st[1] : null, renommage: true,
                preuve: 'src/main/resources/db/migration/' + f + ':' + ligneDe(src, m.index) });
        }
    }
}
for (const x of menusMig) {
    if (!menusParComposant.has(x.composant)) {
        menusParComposant.set(x.composant, []);
    }
    menusParComposant.get(x.composant).push(x);
}
/* commentaires « // MODULE > Libelle » ou « // menu « Libelle » » de correctifs-affichage.js */
const CORRECTIFS = path.join(WEBAPP, 'general', 'resources', 'js', 'correctifs-affichage.js');
const libellesCorrectifs = new Map();
if (fs.existsSync(CORRECTIFS)) {
    const lignes = fs.readFileSync(CORRECTIFS, 'utf8').split('\n');
    lignes.forEach((l, k) => {
        const m = /^\s*'([\w-]+)',?\s*\/\/\s*(.+)$/.exec(l);
        if (m && /[>«]/.test(m[2])) {
            libellesCorrectifs.set(m[1], { libelle: m[2].trim(), preuve: rel(CORRECTIFS) + ':' + (k + 1) });
        }
        const m2 = /^\s*\/\/\s*menu\s+«\s*([^»]+)»\s*(?:\(([^)]*)\))?/.exec(l);
        const suiv = /^\s*'([\w-]+)'/.exec(lignes[k + 1] || '');
        if (m2 && suiv && !libellesCorrectifs.has(suiv[1])) {
            libellesCorrectifs.set(suiv[1], { libelle: (m2[2] ? m2[2].split(',')[0].trim() + ' > ' : '') + m2[1].trim(),
                preuve: rel(CORRECTIFS) + ':' + (k + 1) });
        }
    });
}
const masques = (() => {
    const src = fs.existsSync(CORRECTIFS) ? fs.readFileSync(CORRECTIFS, 'utf8') : '';
    const m = /MENUS_MASQUES\s*=\s*\[([\s\S]*?)\];/.exec(src);
    return m ? (blanchirJs(m[1]).match(/'[\w-]+'/g) || []).map((x) => x.slice(1, -1)) : [];
})();

/* ---------- 5. API REST ---------- */
const api = [];
for (const s of sources.filter((x) => x.abs.startsWith(JAVA))) {
    const mc = /^@Path\(\s*"([^"]*)"\s*\)/m.exec(s.brut);
    if (!mc) {
        continue;
    }
    const base = mc[1].replace(/^\/|\/$/g, '');
    const lignes = s.brut.split('\n');
    let verbe = null, sous = '', debut = 0;
    lignes.forEach((l, k) => {
        if (k <= ligneDe(s.brut, mc.index) - 1) {
            return;
        }
        const v = /^\s*@(GET|POST|PUT|DELETE|PATCH)\b/.exec(l);
        if (v) {
            verbe = v[1];
            debut = k + 1;
        }
        const p = /^\s*@Path\(\s*"([^"]*)"\s*\)/.exec(l);
        if (p) {
            sous = p[1].replace(/^\//, '');
        }
        const meth = /^\s*public\s+[\w<>,\s?[\]]+\s+(\w+)\s*\(/.exec(l);
        if (meth && verbe) {
            api.push({ verbe, chemin: '/api/' + base + (sous ? '/' + sous : ''), classe: s.rel, ligne: debut, methode: meth[1] });
            verbe = null;
            sous = '';
        }
    });
}
/* appels REST depuis chaque fichier web : « api/v1/... » */
const appelsApi = new Map();
for (const s of sources.filter((x) => x.abs.startsWith(WEBAPP))) {
    const re = /api\/v1\/[\w{}\-/]+/g;
    let m;
    const l = new Set();
    while ((m = re.exec(s.net))) {
        l.add(m[0].replace(/\/+$/, ''));
    }
    if (l.size) {
        appelsApi.set(s.rel, [...l].sort());
    }
}

/* ---------- 6. Menus de la base locale (export lecture seule, facultatif) ---------- */
const MENUS_TSV = path.join(__dirname, 'menus-base-locale.tsv');
const menusBase = new Map(); // composant -> [{menu, sousMenu, statut, preuve}]
if (fs.existsSync(MENUS_TSV)) {
    fs.readFileSync(MENUS_TSV, 'utf8').split(/\r?\n/).forEach((l, k) => {
        const c = l.split('\t');
        if (k === 0 || c.length < 4 || !c[2]) {
            return;
        }
        if (!menusBase.has(c[2])) {
            menusBase.set(c[2], []);
        }
        menusBase.get(c[2]).push({ menu: c[0], sousMenu: c[1], statut: c[3], privilege: c[4], preuve: rel(MENUS_TSV) + ':' + (k + 1) });
    });
}

/*
 * Points d'entree hors menu : la coquille de l'application. On s'y arrete (sinon tout serait relie a tout par App.js
 * ou par l'en-tete) et on les note comme entree.
 */
const COQUILLE = {
    'src/main/webapp/general/app/view/Viewport.js': 'coquille (Viewport)',
    'src/main/webapp/general/app/view/Main.js': 'coquille (Main)',
    'src/main/webapp/general/app/view/Navigation.js': 'arbre des menus (Navigation)',
    'src/main/webapp/general/app/view/ContentPanel.js': 'zone centrale (ContentPanel)',
    'src/main/webapp/general/app/view/Header.js': 'en-tete (boutons et raccourcis du bandeau)',
    'src/main/webapp/general/app/controller/App.js': 'controleur App (ouverture des ecrans)',
    'src/main/webapp/general/app/view/sm_user/mainmenu/MainMenuManager.js': 'ancien menu metro (MainMenuManager)',
    'src/main/webapp/general/app/view/dashboard.js': 'ecran d\'accueil (tableau de bord)'
};

function remonter(fichier) {
    /* BFS inverse : on s'arrete sur un ecran de menu, une entree de la coquille ou un ecran que rien n'ouvre */
    const vus = new Map([[fichier, null]]);
    const file = [fichier];
    const out = [];
    const chaineDe = (f) => {
        const ch = [];
        for (let c = f; vus.get(c); c = vus.get(c).aval) {
            const v = vus.get(c);
            ch.push(c + (v.ligne ? ':' + v.ligne : '') + ' → ' + v.aval + ' [' + v.comment + ']');
        }
        return ch;
    };
    while (file.length) {
        const f = file.shift();
        const xtypes = (infos.get(f) || { xtypes: [] }).xtypes;
        const menus = [];
        for (const x of xtypes) {
            for (const m of menusBase.get(x) || []) {
                menus.push(Object.assign({ xtype: x, masque: masques.includes(x) }, m));
            }
        }
        if (menus.length) {
            out.push({ type: 'menu', fichier: f, xtypes, menus, chaine: chaineDe(f) });
            continue;
        }
        if (COQUILLE[f] || !f.includes('/general/app/')) {
            out.push({ type: 'entree', fichier: f, xtypes, entree: COQUILLE[f] || 'script hors application ExtJS', chaine: chaineDe(f) });
            continue;
        }
        const amont = aretes.get(f) || [];
        if (!amont.length) {
            out.push({ type: 'orphelin', fichier: f, xtypes, chaine: chaineDe(f) });
            continue;
        }
        for (const a of amont) {
            if (!vus.has(a.de)) {
                vus.set(a.de, { aval: f, ligne: a.ligne, comment: a.comment });
                file.push(a.de);
            }
        }
    }
    return out;
}

function libellesCode(xtypes) {
    const out = [];
    for (const x of xtypes) {
        for (const m of menusParComposant.get(x) || []) {
            out.push({ xtype: x, libelle: m.libelle, menu: libelleMenu.get(m.lgMenu) || null, statut: m.statut, preuve: m.preuve });
        }
        if (libellesCorrectifs.has(x)) {
            out.push(Object.assign({ xtype: x }, libellesCorrectifs.get(x)));
        }
    }
    return out;
}

/* ---------- 7. Classement ---------- */
const resultat = [];
for (const j of jsps) {
    const a = appels.filter((x) => x.jsp === j.web);
    const actifs = a.filter(actif);
    const ecrans = new Map();
    for (const x of actifs.filter((y) => y.source.endsWith('.js'))) {
        for (const r of remonter(x.source)) {
            if (!ecrans.has(r.fichier)) {
                ecrans.set(r.fichier, Object.assign({ preuves: [], libellesCode: libellesCode(r.xtypes) }, r, { chaine: undefined }));
            }
            ecrans.get(r.fichier).preuves.push({ appel: x.source + ':' + x.ligne, chaine: r.chaine });
        }
    }
    const pages = actifs.filter((y) => !y.source.endsWith('.js'));
    resultat.push({ jsp: j.web, appels: a, ecrans: [...ecrans.values()], pages });
}

/*
 * Classes (dans cet ordre de priorite) :
 *   menu actif      : au moins un ecran ouvert par un sous-menu actif et non masque
 *   hors menu       : appelee par la coquille (en-tete, accueil, connexion...), une page HTML/JSP vivante ou du Java
 *   menu inactif    : seulement par des sous-menus desactives, supprimes ou masques
 *   orpheline       : seulement par des ecrans ExtJS qu'aucun menu ni aucun autre ecran n'ouvre
 *   morte           : aucun appel, ou seulement en commentaire, ou seulement par des JSP mortes
 */
function classer() {
    const parJsp = new Map(resultat.map((r) => [r.jsp, r]));
    const vivantes = (src) => {
        const w = src.replace(/^src\/main\/webapp\//, '');
        const r = parJsp.get(w);
        return !r || !r.classe || !/^(morte|orpheline)/.test(r.classe);
    };
    for (const r of resultat) {
        r.classe = null;
    }
    let change = true;
    while (change) {
        change = false;
        for (const r of resultat) {
            let c;
            const pagesVivantes = r.pages.filter((p) => !p.source.startsWith('src/main/webapp/') || !/\.jspf?$/.test(p.source) || vivantes(p.source));
            if (r.ecrans.some((e) => e.type === 'menu' && e.menus.some((m) => m.statut === 'enable' && !m.masque))) {
                c = 'menu actif';
            } else if (r.ecrans.some((e) => e.type === 'entree') || pagesVivantes.length) {
                c = 'hors menu';
            } else if (r.ecrans.some((e) => e.type === 'menu')) {
                c = 'menu inactif ou masque';
            } else if (r.ecrans.length) {
                c = 'orpheline (ecran sans entree)';
            } else if (r.pages.length) {
                c = 'morte (appelee seulement par des JSP mortes)';
            } else if (r.appels.some((x) => x.inutilisee)) {
                c = 'morte (URL declaree mais jamais employee)';
            } else if (r.appels.length) {
                c = 'morte (appel seulement en commentaire)';
            } else {
                c = 'morte (aucun appel)';
            }
            if (c !== r.classe) {
                r.classe = c;
                change = true;
            }
        }
    }
}
classer();

fs.mkdirSync(SORTIE, { recursive: true });
/* ---------- 8. Mesures des JSP, actions, equivalents REST ---------- */
function mesurer(j) {
    const brut = fs.readFileSync(j.abs);
    const src = brut.toString('latin1');
    let utf8 = true;
    try {
        new TextDecoder('utf-8', { fatal: true }).decode(brut);
    } catch (e) {
        utf8 = false;
    }
    const modes = new Set();
    for (const l of src.split('\n')) {
        if (/mode|action|str_ACTION|task/i.test(l)) {
            let m;
            const re = /\.equals(?:IgnoreCase)?\(\s*"(\w+)"\s*\)|"(\w+)"\.equals(?:IgnoreCase)?\(\s*(?:mode|action|str_ACTION|task)/g;
            while ((m = re.exec(l))) {
                const v = m[1] || m[2];
                if (v && !/^(null|true|false)$/.test(v)) {
                    modes.add(v);
                }
            }
        }
    }
    const nom = j.nom.toLowerCase();
    const actions = new Set();
    for (const m of modes) {
        const x = m.toLowerCase();
        if (/creat|add|ajout|insert|new|save|enregistr|import/.test(x)) {
            actions.add('creation');
        } else if (/updat|edit|modif|chang|valid|clotur|clos|clore|clotu|clôt|close|cancel|annul|reset|reinit|regl|pay|transf|merge|fusion|appl|enable|disable|activ|desactiv|lock|unlock/.test(x)) {
            actions.add('modification');
        } else if (/delet|remov|suppr|del$|destroy/.test(x)) {
            actions.add('suppression');
        } else if (/print|pdf|ticket|impr|edit/.test(x)) {
            actions.add('impression');
        } else if (/export|excel|csv|xls/.test(x)) {
            actions.add('export');
        } else {
            actions.add('autre (' + m + ')');
        }
    }
    if (/pdf|generate|ws_rp_|print|ticket|etiquet|facture.*rp|report/.test(nom)) {
        actions.add('impression');
    }
    if (/export|excel|csv|xls/.test(nom)) {
        actions.add('export');
    }
    if (/data|search|get|list|check|show|tree|stat|dashboard|_json|count|load/.test(nom) || (!actions.size && !/transaction/.test(nom))) {
        actions.add('lecture');
    }
    if (/transaction/.test(nom) && !modes.size) {
        actions.add('ecriture (mode non lisible)');
    }
    return {
        lignes: src.split('\n').length,
        utf8,
        modes: [...modes],
        actions: [...actions].sort(),
        ecrit: /getTransaction\(\)\.begin|\.persist\(|\.merge\(|\.remove\(|executeUpdate|update\w*\(|create\w*\(|delete\w*\(/.test(src),
        jdbc: /jconnexion|java\.sql\.|DriverManager|createStatement|prepareStatement/.test(src),
        jasper: /report\.reportManager|net\.sf\.jasperreports|\.jrxml|\.jasper\b/.test(src),
        imports: (src.match(/<%@\s*page\s+import=/g) || []).length,
        beans: (src.match(/<jsp:useBean/g) || []).length
    };
}
const parJspRes = new Map(resultat.map((r) => [r.jsp, r]));
for (const j of jsps) {
    const r = parJspRes.get(j.web);
    Object.assign(r, mesurer(j));
    /* modes reellement envoyes par les ecrans (« mode=xxx » dans la ligne d'appel) */
    const envoyes = new Set();
    for (const a of r.appels.filter(actif)) {
        let m;
        const re = /mode=(\w+)/g;
        while ((m = re.exec(a.texte))) {
            envoyes.add(m[1]);
        }
    }
    r.modesEnvoyes = [...envoyes];
    /* classes Java (REST surtout) qui disent remplacer ou reprendre cette JSP, en commentaire */
    r.restMentions = [...new Set(r.appels.filter((x) => x.java && x.commente).map((x) => x.source + ':' + x.ligne))];
}

/* Ecrans de menu : fermeture en aval (fichiers ouverts par l'ecran, sans entrer dans un autre ecran de menu) */
const aval = new Map();
for (const [vers, l] of aretes) {
    for (const a of l) {
        if (!aval.has(a.de)) {
            aval.set(a.de, []);
        }
        aval.get(a.de).push({ vers, nav: /^ouvre l'ecran/.test(a.comment) });
    }
}
const estEcranMenu = (f) => (infos.get(f) || { xtypes: [] }).xtypes.some((x) => menusBase.has(x));
/* Fichiers d'un ecran : ses fenetres, stores et controleurs, sans entrer dans un autre ecran (menu ou ouvert en entier) */
function fermeture(racine) {
    const vus = new Set([racine]);
    const file = [racine];
    while (file.length) {
        const f = file.shift();
        for (const v of aval.get(f) || []) {
            if (!v.nav && !vus.has(v.vers) && !estEcranMenu(v.vers) && !COQUILLE[v.vers]) {
                vus.add(v.vers);
                file.push(v.vers);
            }
        }
    }
    return [...vus];
}
const apiDe = (f) => {
    const s = new Set();
    for (const x of fermeture(f)) {
        for (const a of appelsApi.get(x) || []) {
            s.add(a);
        }
    }
    return [...s].sort();
};
/* Ecran qui porte l'appel : la cible de la derniere ouverture d'ecran de la chaine (racine -> ... -> appelant) */
function porteur(chaine) {
    for (let i = chaine.length - 1; i >= 0; i--) {
        if (chaine[i].includes('[ouvre l\'ecran ')) {
            const m = /→ (\S+) \[/.exec(chaine[i]);
            return m ? m[1] : null;
        }
    }
    return null;
}

/* Regroupement par sous-menu, et ecrans secondaires (ouverts en entier depuis un autre ecran) */
const ecransMenu = new Map(); // cle menu|sous-menu|xtype -> {...}
const secondaires = new Map(); // fichier -> {...}
for (const r of resultat) {
    for (const e of r.ecrans.filter((x) => x.type === 'menu')) {
        for (const m of e.menus) {
            const k = m.menu + '|' + m.sousMenu + '|' + m.xtype + '|' + m.statut; // un meme composant peut avoir une ligne supprimee et une active
            if (!ecransMenu.has(k)) {
                ecransMenu.set(k, { menu: m.menu, sousMenu: m.sousMenu, xtype: m.xtype, statut: m.statut, masque: m.masque,
                    preuveMenu: m.preuve, fichier: e.fichier, api: apiDe(e.fichier), jsps: [], ouvre: [] });
            }
            const em = ecransMenu.get(k);
            for (const p of e.preuves) {
                const por = porteur(p.chaine);
                if (!por) {
                    if (!em.jsps.some((x) => x.jsp === r.jsp)) {
                        em.jsps.push({ jsp: r.jsp, preuve: p });
                    }
                    continue;
                }
                if (!secondaires.has(por)) {
                    secondaires.set(por, { fichier: por, xtypes: (infos.get(por) || { xtypes: [] }).xtypes, api: apiDe(por), jsps: [], menus: [] });
                }
                const sec = secondaires.get(por);
                if (!sec.jsps.some((x) => x.jsp === r.jsp)) {
                    sec.jsps.push({ jsp: r.jsp, preuve: p });
                }
                if (!sec.menus.includes(m.menu + ' > ' + m.sousMenu)) {
                    sec.menus.push(m.menu + ' > ' + m.sousMenu);
                }
                if (!em.ouvre.includes(por)) {
                    em.ouvre.push(por);
                }
            }
        }
    }
}

/* Complexite d'une JSP : points ; d'un ecran : somme */
function points(r) {
    let p = 1;
    if (r.lignes > 150) {
        p++;
    }
    if (r.lignes > 400) {
        p++;
    }
    if (r.ecrit) {
        p += 2;
    }
    if (r.jasper) {
        p++;
    }
    if (r.jdbc) {
        p++;
    }
    if (r.modes.length > 5) {
        p++;
    }
    return p;
}
const SENSIBLE = /vente|caisse|reglement|r[eè]glement|facture|factur|differ|tiers|stock|inventaire|ajustement|commande|bon|livraison|retour|avoir|depot|retrocession|perime/i;
for (const em of [...ecransMenu.values(), ...secondaires.values()]) {
    const rs = em.jsps.map((x) => parJspRes.get(x.jsp));
    em.points = rs.reduce((s, r) => s + points(r), 0);
    em.ecrit = rs.some((r) => r.ecrit && /creation|modification|suppression|ecriture/.test(r.actions.join(',')));
    em.actions = [...new Set(rs.flatMap((r) => r.actions))].sort();
    em.complexite = !rs.length ? '-' : (em.points <= 4 ? 'faible' : (em.points <= 12 ? 'moyenne' : 'forte'));
    const texte = (em.sousMenu || '') + ' ' + (em.xtype || em.xtypes.join(' ')) + ' ' + em.fichier;
    em.risque = !rs.length ? '-' : ((em.ecrit && SENSIBLE.test(texte)) ? 'eleve' : (em.ecrit ? 'moyen' : 'faible'));
}

const decrire = (e) => e.type === 'menu'
    ? e.menus.map((m) => m.menu + ' > ' + m.sousMenu + ' (' + m.xtype + ', ' + m.statut + (m.masque ? ', masque' : '') + ')').join(' ; ')
    : (e.type === 'entree' ? e.entree + ' ' + e.fichier : 'orphelin ' + e.fichier);
const court = (f) => f.split('src/main/webapp/general/app/').join('app/').split('src/main/webapp/').join('');

fs.mkdirSync(SORTIE, { recursive: true });
const tsv = ['jsp\tclasse\tlignes\tutf8\tactions\tappelants\tecrans'];
for (const r of resultat) {
    tsv.push([r.jsp, r.classe, r.lignes, r.utf8 ? 'UTF-8' : 'ISO-8859-1', r.actions.join(','),
        [...new Set(r.appels.filter(actif).map((x) => x.source + ':' + x.ligne))].join(' '),
        r.ecrans.map(decrire).join(' | ')].join('\t'));
}
fs.writeFileSync(path.join(SORTIE, 'inventaire-jsp.tsv'), tsv.join('\n') + '\n');
fs.writeFileSync(path.join(SORTIE, 'api-rest.tsv'), ['verbe\tchemin\tmethode\tclasse:ligne']
    .concat(api.map((x) => [x.verbe, x.chemin, x.methode, x.classe + ':' + x.ligne].join('\t'))).join('\n') + '\n');

/* Annexe des preuves : une entree par JSP */
const md = [];
const esc = (s) => String(s).replace(/\|/g, '\\|');
const ordre = ['menu actif', 'menu inactif ou masque', 'hors menu', 'orpheline (ecran sans entree)',
    'morte (appelee seulement par des JSP mortes)', 'morte (URL declaree mais jamais employee)', 'morte (appel seulement en commentaire)',
    'morte (aucun appel)'];
md.push('# Annexe : preuves JSP → écran → menu (générée)', '',
    'Produite par `outils/inventaire-jsp/inventaire-jsp.js` le ' + new Date().toISOString().slice(0, 10) + '. Chaque lien porte le fichier et la ligne.',
    'Libellés de menu : `outils/inventaire-jsp/menus-base-locale.tsv` (export en lecture seule de `t_menu`/`t_sous_menu` de la copie locale, '
    + 'numéro de ligne du fichier). Chaîne : « A:ligne → B » se lit « A, à cette ligne, ouvre ou utilise B ».', '');
for (const cl of ordre) {
    const rs = resultat.filter((r) => r.classe === cl).sort((a, b) => a.jsp.localeCompare(b.jsp));
    if (!rs.length) {
        continue;
    }
    md.push('## ' + cl + ' (' + rs.length + ')', '');
    for (const r of rs) {
        md.push('### `' + r.jsp + '`', '');
        md.push('- ' + r.lignes + ' lignes, ' + (r.utf8 ? 'UTF-8' : '**ISO-8859-1**') + ' ; actions : ' + r.actions.join(', ')
            + (r.modes.length ? ' ; modes lus : ' + r.modes.join(', ') : '')
            + (r.ecrit ? ' ; écrit en base' : '') + (r.jasper ? ' ; JasperReports' : '') + (r.jdbc ? ' ; JDBC direct' : ''));
        const act = r.appels.filter(actif);
        const com = r.appels.filter((x) => (x.commente && !x.java) || x.inutilisee);
        if (act.length) {
            md.push('- Appels : ' + act.slice(0, 12).map((x) => '`' + court(x.source) + ':' + x.ligne + '`').join(', ')
                + (act.length > 12 ? ' (+' + (act.length - 12) + ')' : ''));
        }
        if (com.length) {
            md.push('- Appels en commentaire seulement : ' + com.slice(0, 6).map((x) => '`' + court(x.source) + ':' + x.ligne + '`').join(', '));
        }
        for (const e of r.ecrans) {
            const p = e.preuves[0];
            const chaine = p.chaine.length ? ' ; chaîne : ' + p.chaine.map((c) => court(c).replace(/src\/main\/webapp\/general\/app\//g, 'app/')).join(' ; ') : '';
            if (e.type === 'menu') {
                md.push('- Menu : ' + e.menus.map((m) => '**' + m.menu + ' > ' + m.sousMenu + '** (`' + m.xtype + '`, ' + m.statut
                    + (m.masque ? ', masqué' : '') + ', `' + m.preuve.replace('outils/inventaire-jsp/', '') + '`)').join(' ; ')
                    + ' ; écran `' + court(e.fichier) + '` ; appel `' + court(p.appel) + '`' + chaine);
            } else if (e.type === 'entree') {
                md.push('- Entrée hors menu : ' + e.entree + ' (`' + court(e.fichier) + '`) ; appel `' + court(p.appel) + '`' + chaine);
            } else {
                md.push('- Écran sans entrée : `' + court(e.fichier) + '`' + (e.xtypes.length ? ' (xtype `' + e.xtypes.join('`, `') + '`, ouvert par aucun menu ni écran)' : ' (aucune classe ne le référence)')
                    + ' ; appel `' + court(p.appel) + '`' + chaine);
            }
        }
        for (const p of r.pages) {
            md.push('- Page : `' + court(p.source) + ':' + p.ligne + '`' + (p.java ? ' (Java)' : ''));
        }
        if (r.restMentions.length) {
            md.push('- Java qui la cite en commentaire (souvent « remplace … ») : ' + r.restMentions.map((x) => '`' + x + '`').join(', '));
        }
        md.push('');
    }
}
md.push('## Appels vers des JSP absentes du dépôt', '', '| Appelant | Référence |', '|---|---|');
for (const n of nonResolus.filter((x) => actif(x) && /introuvable/.test(x.mode))) {
    md.push('| `' + court(n.source) + ':' + n.ligne + '` | `' + esc(n.ref) + '` |');
}
fs.writeFileSync(path.join(SORTIE, 'annexe-preuves.md'), md.join('\n') + '\n');

/* Tableaux par menu (fragment du rapport) */
/*
 * Priorite : P1 = lecture/impression seulement, ou toutes les JSP de l'ecran ont deja leur equivalent REST cite en
 * commentaire ; P2 = ecritures hors flux d'argent ou de stock ; P3 = ecritures sur un flux sensible (vente, caisse,
 * reglement, facture, stock, commande...). Un menu desactive, supprime ou masque n'a pas de priorite.
 */
function priorite(e) {
    if ((e.statut && e.statut !== 'enable') || e.masque) {
        return '— (menu inactif)';
    }
    if (!e.jsps.length) {
        return '—';
    }
    if (e.jsps.every((x) => parJspRes.get(x.jsp).restMentions.length)) {
        return 'P1 (REST déjà écrit)';
    }
    return e.risque === 'faible' ? 'P1' : (e.risque === 'moyen' ? 'P2' : 'P3');
}
const rang = (e) => ({ P1: 1, P2: 2, P3: 3 })[e.priorite.slice(0, 2)] || 4;
const actionsCourtes = (l) => [...new Set(l.map((a) => (a.startsWith('autre') ? 'autre' : a)))].join(', ');
const listeJsp = (l) => {
    const js = [...new Set(l.map((x) => x.jsp.replace('webservices/', '')))].sort();
    return js.length <= 4 ? js.map((x) => '`' + x + '`').join('<br>') : js.slice(0, 3).map((x) => '`' + x + '`').join('<br>') + '<br>… ' + js.length + ' JSP';
};
for (const e of [...ecransMenu.values(), ...secondaires.values()]) {
    e.priorite = priorite(e);
}
const t = [];
const menusOrd = [...new Set([...ecransMenu.values()].map((e) => e.menu))].sort();
t.push('| Menu | Écrans avec JSP | JSP distinctes (propres aux écrans) | P1 | P2 | P3 | Inactifs |', '|---|---|---|---|---|---|---|');
for (const mn of menusOrd) {
    const es = [...ecransMenu.values()].filter((e) => e.menu === mn);
    const n = (p) => es.filter((e) => e.priorite.startsWith(p)).length;
    t.push('| ' + mn + ' | ' + es.length + ' | ' + new Set(es.flatMap((e) => e.jsps.map((x) => x.jsp))).size + ' | ' + n('P1') + ' | ' + n('P2') + ' | ' + n('P3')
        + ' | ' + n('— (menu') + ' |');
}
t.push('');
for (const mn of menusOrd) {
    const es = [...ecransMenu.values()].filter((e) => e.menu === mn)
        .sort((a, b) => rang(a) - rang(b) || a.points - b.points);
    t.push('### ' + mn, '', '| Sous-menu (écran) | JSP | Actions | API REST déjà appelées par l\'écran | Complexité | Priorité |', '|---|---|---|---|---|---|');
    for (const e of es) {
        const etat = e.statut !== 'enable' ? ' — *' + e.statut + '*' : (e.masque ? ' — *masqué*' : '');
        const la = e.api.length ? e.api.length + ' (' + e.api.slice(0, 2).map((x) => '`' + x.replace('api/v1/', '') + '`').join(', ') + (e.api.length > 2 ? ', …' : '') + ')' : 'aucune';
        const ouvre = e.ouvre.length ? '<br>+ ouvre ' + e.ouvre.map((f) => '`' + ((infos.get(f) || {}).xtypes || [])[0] + '`').join(', ') : '';
        t.push('| ' + esc(e.sousMenu) + etat + ' (`' + e.xtype + '`) | ' + (listeJsp(e.jsps) || '—') + ouvre + ' | ' + actionsCourtes(e.actions) + ' | ' + la + ' | '
            + e.complexite + (e.jsps.length ? ' (' + e.points + ' pts), risque ' + e.risque : '') + ' | ' + e.priorite + ' |');
    }
    t.push('');
}
t.push('### Écrans secondaires (ouverts en entier depuis un écran de menu)', '',
    '| Écran | JSP | Actions | Ouvert depuis | API REST déjà appelées | Complexité | Priorité |', '|---|---|---|---|---|---|---|');
for (const s of [...secondaires.values()].sort((a, b) => rang(a) - rang(b) || b.points - a.points)) {
    const menus = s.menus.length <= 3 ? s.menus.join('<br>') : s.menus.slice(0, 2).join('<br>') + '<br>… ' + s.menus.length + ' menus';
    t.push('| `' + (s.xtypes[0] || court(s.fichier)) + '` (`' + court(s.fichier) + '`) | ' + listeJsp(s.jsps) + ' | ' + actionsCourtes(s.actions) + ' | ' + esc(menus) + ' | '
        + (s.api.length ? s.api.length : 'aucune') + ' | ' + s.complexite + ' (' + s.points + ' pts), risque ' + s.risque + ' | ' + s.priorite + ' |');
}
t.push('');
fs.writeFileSync(path.join(SORTIE, 'tableaux-menus.md'), t.join('\n') + '\n');

fs.writeFileSync(path.join(SORTIE, 'inventaire-jsp.json'), JSON.stringify({
    genere: new Date().toISOString(), nbJsp: jsps.length, menusMigrations: menusMig, libellesCorrectifs: [...libellesCorrectifs],
    menusMasques: masques, nonResolus, varsGlobales, api, appelsApi: [...appelsApi], infos: [...infos], aretes: [...aretes],
    ecransMenu: [...ecransMenu.values()], secondaires: [...secondaires.values()], resultat
}, null, 1));
const compte = {};
for (const r of resultat) {
    compte[r.classe] = (compte[r.classe] || 0) + 1;
}
console.log('JSP : ' + jsps.length + ' ; ' + JSON.stringify(compte) + ' ; ecrans de menu : ' + ecransMenu.size
    + ' ; appels vers JSP absentes : ' + nonResolus.filter((x) => actif(x) && /introuvable/.test(x.mode)).length + ' ; points REST : ' + api.length);
console.log('Sorties : ' + SORTIE);
