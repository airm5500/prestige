"""Rapport des tests d'ecran (Excel) : un onglet par module, une ligne par test, avec le resultat le plus recent.

    python outils/rapport_tests_ecran.py SORTIE.xlsx LISTE.txt RESULTATS1.txt [RESULTATS2.txt ...] [--causes CAUSES.tsv]

LISTE.txt : un test par ligne (chemin relatif a src/test/e2e). RESULTATS*.txt : sorties du lanceur
(« === test », lignes PASS / FAIL, « --- code N »), de la plus ancienne a la plus recente : un test rejoue plus tard
prend son dernier resultat. CAUSES.tsv (facultatif) : test <tab> categorie <tab> explication, pour les echecs tries.
Une page A4 paysage de large par onglet ; la hauteur suit le nombre de tests.
"""
import sys
from collections import OrderedDict

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

BLEU, VERT, ROUGE, GRIS = '2E75B6', 'E2EFDA', 'FCE4D6', 'F2F2F2'
COLONNES = [('Test', 46), ('Résultat', 11), ('Contrôles', 10), ('Premier contrôle en échec', 70),
            ('Catégorie', 22), ('Cause et suite', 60)]


def lire_resultats(chemin, resultats):
    test = None
    with open(chemin, encoding='utf-8', errors='replace') as f:
        for ligne in f:
            ligne = ligne.rstrip('\n')
            if ligne.startswith('=== '):
                test = ligne[4:].strip()
                resultats[test] = {'pass': 0, 'fail': 0, 'premier': '', 'code': None, 'source': chemin}
            elif test and ligne.startswith('PASS'):
                resultats[test]['pass'] += 1
            elif test and ligne.startswith('FAIL'):
                resultats[test]['fail'] += 1
                if not resultats[test]['premier']:
                    resultats[test]['premier'] = ligne[4:].strip()[:400]
            elif test and ligne.startswith('--- code'):
                resultats[test]['code'] = int(ligne.split()[-1])
                test = None


def lire_causes(chemin):
    causes = {}
    with open(chemin, encoding='utf-8') as f:
        for ligne in f:
            if ligne.strip() and not ligne.startswith('#'):
                morceaux = ligne.rstrip('\n').split('\t')
                causes[morceaux[0]] = (morceaux[1], morceaux[2] if len(morceaux) > 2 else '')
    return causes


def module(test):
    return test.split('/')[0] if '/' in test else 'racine'


def main():
    args = sys.argv[1:]
    causes = {}
    if '--causes' in args:
        i = args.index('--causes')
        causes = lire_causes(args[i + 1])
        del args[i:i + 2]
    sortie, liste, fichiers = args[0], args[1], args[2:]
    with open(liste, encoding='utf-8') as f:
        tests = [l.strip() for l in f if l.strip()]
    resultats = {}
    for chemin in fichiers:
        lire_resultats(chemin, resultats)

    par_module = OrderedDict()
    for t in sorted(tests, key=lambda x: (module(x), x)):
        par_module.setdefault(module(t), []).append(t)

    wb = Workbook()
    synthese = wb.active
    synthese.title = 'Synthèse'
    mince = Side(style='thin', color='BFBFBF')
    bord = Border(left=mince, right=mince, top=mince, bottom=mince)
    total_ok = total = 0
    lignes_synthese = []
    categories = {}
    for nom, liste_tests in par_module.items():
        ws = wb.create_sheet(nom[:31])
        ws.append(['TESTS D\'ÉCRAN — module ' + nom])
        ws['A1'].font = Font(bold=True, size=13, color=BLEU)
        ws.append([])
        ws.append([c for c, _ in COLONNES])
        for j, (_, largeur) in enumerate(COLONNES, 1):
            ws.column_dimensions[get_column_letter(j)].width = largeur
            c = ws.cell(row=3, column=j)
            c.font, c.fill = Font(bold=True, color='FFFFFF'), PatternFill('solid', fgColor=BLEU)
            c.alignment, c.border = Alignment(horizontal='center', vertical='center', wrap_text=True), bord
        ok_module = 0
        for t in liste_tests:
            r = resultats.get(t)
            if r is None:
                etat, controles, premier = 'Non joué', '', ''
            else:
                etat = 'OK' if r['code'] == 0 else 'Échec'
                controles = '%d / %d' % (r['pass'], r['pass'] + r['fail']) if r['pass'] + r['fail'] else ''
                premier = r['premier'] if etat == 'Échec' else ''
                if etat == 'Échec' and not premier:
                    premier = 'arrêt du test (code %s) sans contrôle en échec' % r['code']
            categorie, cause = causes.get(t, ('', '')) if etat != 'OK' else ('', '')
            if etat == 'OK':
                ok_module += 1
            elif categorie:
                categories[categorie] = categories.get(categorie, 0) + 1
            ws.append([t, etat, controles, premier, categorie, cause])
            n = ws.max_row
            for j in range(1, len(COLONNES) + 1):
                c = ws.cell(row=n, column=j)
                c.alignment, c.border = Alignment(vertical='top', wrap_text=True), bord
            ws.cell(row=n, column=2).fill = PatternFill('solid', fgColor=VERT if etat == 'OK' else ROUGE if etat == 'Échec' else GRIS)
        ws['A2'] = '%d tests, %d OK, %d en échec' % (len(liste_tests), ok_module, len(liste_tests) - ok_module)
        ws.freeze_panes = 'A4'
        ws.page_setup.orientation, ws.page_setup.paperSize = 'landscape', ws.PAPERSIZE_A4
        ws.page_setup.fitToWidth, ws.page_setup.fitToHeight = 1, 0
        ws.sheet_properties.pageSetUpPr.fitToPage = True
        ws.print_title_rows = '3:3'
        total_ok += ok_module
        total += len(liste_tests)
        lignes_synthese.append((nom, len(liste_tests), ok_module, len(liste_tests) - ok_module))

    synthese.append(['RAPPORT DES TESTS D\'ÉCRAN — branche d\'intégration'])
    synthese['A1'].font = Font(bold=True, size=14, color=BLEU)
    synthese.append(['%d tests : %d OK, %d en échec' % (total, total_ok, total - total_ok)])
    synthese.append([])
    synthese.append(['Module', 'Tests', 'OK', 'Échec'])
    for c in synthese[4]:
        c.font, c.fill = Font(bold=True, color='FFFFFF'), PatternFill('solid', fgColor=BLEU)
    for l in lignes_synthese:
        synthese.append(list(l))
    synthese.append([])
    synthese.append(['Échecs par catégorie', 'Tests'])
    for c in synthese[synthese.max_row]:
        c.font, c.fill = Font(bold=True, color='FFFFFF'), PatternFill('solid', fgColor=BLEU)
    for cat, n in sorted(categories.items(), key=lambda x: -x[1]):
        synthese.append([cat, n])
    for col, largeur in zip('ABCD', (40, 10, 10, 10)):
        synthese.column_dimensions[col].width = largeur
    synthese.page_setup.orientation, synthese.page_setup.paperSize = 'landscape', synthese.PAPERSIZE_A4
    synthese.page_setup.fitToWidth, synthese.page_setup.fitToHeight = 1, 1
    synthese.sheet_properties.pageSetUpPr.fitToPage = True
    wb.save(sortie)
    print('%d tests, %d OK, %d en échec -> %s' % (total, total_ok, total - total_ok, sortie))


if __name__ == '__main__':
    main()
