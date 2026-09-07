import os, re, json, collections

RACINE = '/home/user/prestige'
SRC = os.path.join(RACINE, 'src/main')
EMBARQUES = set()
for f in os.listdir(os.path.join(SRC, 'resources/reports')):
    if f.endswith('.jrxml'):
        EMBARQUES.add(f[:-6])

# noms d'etats references dans le code
refs = collections.defaultdict(list)   # nom -> [(fichier, ligne, extrait)]

MOTIFS = [
    # String reportName = "xxx";  /  scr_report_file = "xxx";
    re.compile(r'\b(?:reportName|scr_report_file|nomModele|report_file)\s*=\s*"([A-Za-z0-9_\-]+)"'),
    # buildReport(parameters, "xxx", ...)
    re.compile(r'buildReport\s*\(\s*[^,]+,\s*"([A-Za-z0-9_\-]+)"'),
    # setPath_report_src(dir + "xxx" + ".jrxml")  /  dir + "xxx.jrxml"
    re.compile(r'scr_report_file\s*\+\s*"([A-Za-z0-9_\-]+)"'),
    re.compile(r'"([A-Za-z0-9_\-]+)\.jrxml"'),
    re.compile(r'compileFromClasspath\s*\(\s*"([A-Za-z0-9_\-]+)"'),
    re.compile(r'getReport\s*\(\s*"([A-Za-z0-9_\-]+)"'),
    # repli d'un modele configurable :  ... ? "nom_etat" : ...   ou   ... : "nom_etat"
    re.compile(r'(?:NomFichier|nomFichier|nomModele|reportName|modele)[^;\n]*[?:]\s*"([A-Za-z0-9_\-]+)"'),
]

for base, _, fichiers in os.walk(SRC):
    if '/webapp/general/ext' in base or '/webapp/general/build' in base:
        continue
    for nom in fichiers:
        if not nom.endswith(('.java', '.jsp')):
            continue
        chemin = os.path.join(base, nom)
        try:
            texte = open(chemin, encoding='utf-8', errors='replace').read()
            lignes = texte.split('\n')
        except OSError:
            continue
        for i, ligne in enumerate(lignes, 1):
            for motif in MOTIFS:
                for nomEtat in motif.findall(ligne):
                    if nomEtat in ('', 'jrxml') or len(nomEtat) < 3:
                        continue
                    refs[nomEtat].append((os.path.relpath(chemin, RACINE), i, ligne.strip()[:150]))
        # Un nom d'etat peut etre le REPLI d'un modele configurable, ecrit sur la ligne suivante :
        #     String nom = modele.getNomFichier().isEmpty()
        #             ? "facture_detail_articles" : modele.getNomFichier();
        # Une lecture ligne a ligne le manque : on relit donc le fichier par instructions.
        for instruction in re.split(r';', texte if 'texte' in dir() else '\n'.join(lignes)):
            if not re.search(r'NomFichier|nomFichier|nomModele|reportName', instruction):
                continue
            for nomEtat in re.findall(r'[?:]\s*"([A-Za-z0-9_\-]{3,})"', instruction):
                if nomEtat not in refs:
                    numero = next((k for k, l in enumerate(lignes, 1) if '"' + nomEtat + '"' in l), 0)
                    refs[nomEtat].append((os.path.relpath(chemin, RACINE), numero, nomEtat))

manquants, presents = {}, {}
for nom, sites in sorted(refs.items()):
    (presents if nom in EMBARQUES else manquants)[nom] = sites

print("=== ETATS EMBARQUES DANS LE WAR (%d) ===" % len(presents))
for nom in sorted(presents):
    print("  OK       %-40s %d appel(s)" % (nom, len(presents[nom])))
print()
print("=== ETATS NON EMBARQUES (%d) : ils dependent du repertoire d'etats de l'officine ===" % len(manquants))
for nom in sorted(manquants):
    print("  ABSENT   %s" % nom)
    for (f, l, extrait) in manquants[nom][:4]:
        print("             %s:%d" % (f, l))
json.dump({'embarques': sorted(presents), 'non_embarques': {k: [[a, b] for a, b, _ in v] for k, v in manquants.items()}},
          open('/tmp/claude-0/balayage/resultat.json', 'w'), indent=1)
