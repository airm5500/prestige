"""Cahier de recette complet des tests d'ecran, avec le resultat obtenu par l'execution automatique.

    python outils/cahier_recette_complet.py SORTIE.xlsx DOSSIER_E2E LISTE.txt RES1.txt [RES2.txt ...] [--causes CAUSES.tsv]

Une ligne par test d'ecran : le scenario (commentaire d'en-tete du test : ce qui est fait et ce qui est attendu), les
controles faits par l'execution automatique avec leur valeur mesuree, le resultat obtenu, puis les colonnes du testeur
(resultat, statut, testeur, date, commentaire) et une colonne « Concorde » qui compare les deux resultats. Meme principe
que le cahier des corrections d'audit (docs/notices/CAHIER_RECETTE_AUDITS_2026-10-26.xlsx).
RES*.txt : sorties du lanceur, de la plus ancienne a la plus recente (un test rejoue garde son dernier resultat).
"""
import os
import re
import sys
from collections import OrderedDict

from openpyxl import Workbook
from openpyxl.formatting.rule import FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.cell.cell import ILLEGAL_CHARACTERS_RE
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

BLEU, VERT, ROUGE, GRIS, JAUNE = '2E75B6', 'E2EFDA', 'FCE4D6', 'F2F2F2', 'FFF2CC'
POLICE = 'Arial'
COLONNES = [('N°', 6), ('Test', 30), ('Scénario : ce qui est fait et ce qui est attendu', 62),
            ('Contrôles faits par Claude (valeur mesurée)', 70), ('Résultat Claude', 11), ('Écart constaté par Claude', 40),
            ('Catégorie et suite', 34), ('Résultat testeur', 30), ('Statut testeur', 11), ('Testeur', 12), ('Date', 11),
            ('Concorde ?', 11), ('Commentaire', 30)]
COL_CLAUDE, COL_STATUT, COL_CONCORDE = 5, 9, 12
ENTETE = 4
STATUTS = '"OK,Échec,Bloqué,Non joué"'
MODULES = {
    'achats': 'Achats et contrôles', 'analyse': 'Analyses', 'audit': 'Audit', 'audits': 'Corrections d\'audit',
    'caisse': 'Caisse', 'campagnes': 'Campagnes et WhatsApp', 'carnet-depot': 'Carnet dépôt', 'client': 'Clients',
    'ergonomie': 'Ergonomie', 'espace-produit': 'Espace produit', 'etape1': 'Menus et articles',
    'journal': 'Journal', 'productivite': 'Productivité', 'retours': 'Retours des officines',
    'securite': 'Sécurité', 'support': 'Centre de support', 'vente': 'Ventes', 'racine': 'Divers',
    'etape2': 'Étape 2', 'etape3': 'Étape 3', 'etape5': 'Étape 5', 'facturation': 'Facturation',
    'filtres': 'Filtres des écrans', 'inventaire': 'Inventaire', 'lot3': 'Lot 3', 'lot4': 'Lot 4',
    'mobile': 'Application mobile', 'perf': 'Performances', 'pilotage': 'Pilotage', 'points-28-10': 'Points du 28-10',
    'recap': 'Récapitulatifs', 'reglement': 'Règlements', 'stock': 'Stock',
}


def lire_resultats(chemin, resultats):
    test = None
    with open(chemin, encoding='utf-8', errors='replace') as f:
        for ligne in f:
            ligne = ligne.rstrip('\n')
            if ligne.startswith('=== '):
                test = ligne[4:].strip()
                resultats[test] = {'controles': [], 'code': None}
            elif test and (ligne.startswith('PASS') or ligne.startswith('FAIL')):
                resultats[test]['controles'].append((ligne.startswith('PASS'), ligne[4:].strip()))
            elif test and ligne.startswith('--- code'):
                resultats[test]['code'] = int(ligne.split()[-1])
                test = None


def lire_causes(chemin):
    causes = {}
    with open(chemin, encoding='utf-8') as f:
        for ligne in f:
            if ligne.strip() and not ligne.startswith('#'):
                m = ligne.rstrip('\n').split('\t')
                causes[m[0]] = '%s : %s' % (m[1], m[2]) if len(m) > 2 and m[2] else m[1]
    return causes


def scenario(chemin):
    """Commentaire d'en-tete du test (premier bloc /* ... */ ou lignes // du debut), sans les marques de commentaire."""
    try:
        with open(chemin, encoding='utf-8', errors='replace') as f:
            texte = f.read(6000)
    except OSError:
        return ''
    m = re.match(r'\s*(?:#![^\n]*\n\s*)?/\*(.*?)\*/', texte, re.S)
    if m:
        lignes = [re.sub(r'^\s*\*\s?', '', l).rstrip() for l in m.group(1).split('\n')]
    else:
        lignes = []
        for l in texte.split('\n'):
            if l.strip().startswith('//'):
                lignes.append(l.strip()[2:].strip())
            elif l.strip() or lignes:
                break
    lignes = [l for l in lignes if l.strip() and not re.match(r'\s*(Lancement|Usage|node )', l)]
    return ILLEGAL_CHARACTERS_RE.sub('', '\n'.join(lignes).strip()[:3000])


def controle(passe, texte):
    texte = ILLEGAL_CHARACTERS_RE.sub('', re.sub(r'\s+', ' ', texte))
    nom, _, mesure = texte.partition('  [')
    mesure = mesure.rstrip(']')
    if len(mesure) > 90:
        mesure = mesure[:90] + '…'
    return ('✓ ' if passe else '✗ ') + nom.strip() + (' [' + mesure + ']' if mesure else '')


def module(test):
    return test.split('/')[0] if '/' in test else 'racine'


def bordure():
    s = Side(style='thin', color='BFBFBF')
    return Border(left=s, right=s, top=s, bottom=s)


def mode_emploi(ws, total, ok):
    lignes = [
        ('Cahier de recette complet : tests d\'écran de la branche d\'intégration', ''),
        ('', ''),
        ('Version testée', 'Branche integration/recette-2026-10-29, déployée sur le poste local (domain1, '
                           'http://localhost:8080/prestige), copie de travail laborex_v1_db.'),
        ('Résultat de Claude', '%d tests joués par l\'écran, %d OK, %d en échec. Chaque test a été joué seul, '
                               'par le vrai chemin de l\'écran, et retire ses données à la fin.' % (total, ok, total - ok)),
        ('Base', 'Une copie de travail uniquement, jamais une base de production.'),
        ('Une ligne', 'Un test d\'écran. « Scénario » dit ce qui est fait et ce qui est attendu ; « Contrôles faits par '
                      'Claude » liste chaque vérification (✓ conforme, ✗ écart) avec la valeur mesurée entre crochets.'),
        ('À remplir', 'Rejouer le scénario à l\'écran, noter ce que vous voyez dans « Résultat testeur », choisir le '
                      '« Statut testeur » (OK, Échec, Bloqué, Non joué), votre nom et la date.'),
        ('Comparaison', '« Concorde ? » se remplit seul : « Oui » si votre statut est celui de Claude, « Non » sinon '
                        '(ligne en jaune) ; ce sont ces lignes à examiner ensemble.'),
        ('Catégorie et suite', 'Pour les échecs déjà triés : la cause retenue et ce qui est prévu.'),
        ('Onglets', 'Synthèse, puis un onglet par module (dossier des tests).'),
    ]
    for a, b in lignes:
        ws.append([a, b])
    ws['A1'].font = Font(name=POLICE, bold=True, size=14, color=BLEU)
    for r in range(3, ws.max_row + 1):
        ws.cell(row=r, column=1).font = Font(name=POLICE, bold=True)
        ws.cell(row=r, column=2).font = Font(name=POLICE)
        ws.cell(row=r, column=2).alignment = Alignment(wrap_text=True, vertical='top')
        ws.cell(row=r, column=1).alignment = Alignment(vertical='top')
    ws.column_dimensions['A'].width = 22
    ws.column_dimensions['B'].width = 110


def feuille(wb, nom, tests, resultats, causes, e2e, numero):
    ws = wb.create_sheet(MODULES.get(nom, nom)[:31])
    ws.append(['CAHIER DE RECETTE — ' + MODULES.get(nom, nom)])
    ws['A1'].font = Font(name=POLICE, bold=True, size=13, color=BLEU)
    ws.append([])
    ws.append([])
    ws.append([c for c, _ in COLONNES])
    b = bordure()
    for j, (_, largeur) in enumerate(COLONNES, 1):
        ws.column_dimensions[get_column_letter(j)].width = largeur
        c = ws.cell(row=ENTETE, column=j)
        c.font = Font(name=POLICE, bold=True, color='FFFFFF')
        c.fill = PatternFill('solid', fgColor=BLEU)
        c.alignment, c.border = Alignment(horizontal='center', vertical='center', wrap_text=True), b
    dv = DataValidation(type='list', formula1=STATUTS, allow_blank=True)
    ws.add_data_validation(dv)
    ok = 0
    for t in tests:
        numero += 1
        r = resultats.get(t)
        if r is None:
            etat, liste, ecart = 'Non joué', '', ''
        else:
            etat = 'OK' if r['code'] == 0 else 'Échec'
            liste = '\n'.join(controle(p, x) for p, x in r['controles'])
            n_ok = sum(1 for p, _ in r['controles'] if p)
            if r['controles']:
                liste = '%d / %d conformes\n' % (n_ok, len(r['controles'])) + liste
            ecarts = [controle(p, x)[2:] for p, x in r['controles'] if not p]
            ecart = '\n'.join(ecarts[:3]) if etat == 'Échec' else ''
            if etat == 'Échec' and not ecart:
                ecart = 'Test arrêté (code %s) avant la fin, sans contrôle en écart' % r['code']
                if r['code'] == 124:
                    ecart = 'Test arrêté : durée maximale de 15 min dépassée'
        if etat == 'OK':
            ok += 1
        ligne = ws.max_row + 1
        concorde = '=IF(I{0}="","",IF(I{0}=E{0},"Oui","Non"))'.format(ligne)
        ws.append([numero, t, scenario(os.path.join(e2e, t)), liste[:32000], etat, ecart,
                   causes.get(t, '') if etat != 'OK' else '', '', '', '', '', concorde, ''])
        for j in range(1, len(COLONNES) + 1):
            c = ws.cell(row=ligne, column=j)
            c.font = Font(name=POLICE, size=9)
            c.alignment, c.border = Alignment(vertical='top', wrap_text=True), b
        ws.cell(row=ligne, column=COL_CLAUDE).fill = PatternFill(
            'solid', fgColor=VERT if etat == 'OK' else ROUGE if etat == 'Échec' else GRIS)
        ws.cell(row=ligne, column=COL_CLAUDE).font = Font(name=POLICE, size=9, bold=True)
        dv.add(ws.cell(row=ligne, column=COL_STATUT))
    derniere = ws.max_row
    if derniere > ENTETE:
        ws.conditional_formatting.add('L%d:L%d' % (ENTETE + 1, derniere), FormulaRule(
            formula=['L%d="Non"' % (ENTETE + 1)], fill=PatternFill('solid', fgColor=JAUNE)))
    ws['A2'] = '%d tests : %d OK, %d en échec selon Claude' % (len(tests), ok, len(tests) - ok)
    ws['A2'].font = Font(name=POLICE, italic=True)
    ws.freeze_panes = 'C%d' % (ENTETE + 1)
    ws.auto_filter.ref = 'A%d:%s%d' % (ENTETE, get_column_letter(len(COLONNES)), derniere)
    ws.page_setup.orientation, ws.page_setup.paperSize = 'landscape', ws.PAPERSIZE_A4
    ws.page_setup.fitToWidth, ws.page_setup.fitToHeight = 1, 0
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.print_title_rows = '%d:%d' % (ENTETE, ENTETE)
    return numero, ok


def main():
    args = sys.argv[1:]
    causes = {}
    if '--causes' in args:
        i = args.index('--causes')
        causes = lire_causes(args[i + 1])
        del args[i:i + 2]
    sortie, e2e, liste, fichiers = args[0], args[1], args[2], args[3:]
    with open(liste, encoding='utf-8') as f:
        tests = [l.strip() for l in f if l.strip()]
    resultats = {}
    for chemin in fichiers:
        lire_resultats(chemin, resultats)
    par_module = OrderedDict()
    for t in sorted(tests, key=lambda x: (module(x), x)):
        par_module.setdefault(module(t), []).append(t)

    wb = Workbook()
    emploi = wb.active
    emploi.title = 'Mode d\'emploi'
    synthese = wb.create_sheet('Synthèse')
    numero, total_ok, lignes = 0, 0, []
    for nom, liste_tests in par_module.items():
        avant = numero
        numero, ok = feuille(wb, nom, liste_tests, resultats, causes, e2e, numero)
        total_ok += ok
        lignes.append((MODULES.get(nom, nom), len(liste_tests), ok, len(liste_tests) - ok, avant + 1, numero))
    mode_emploi(emploi, len(tests), total_ok)

    synthese.append(['SYNTHÈSE — %d tests, %d OK, %d en échec selon Claude' % (len(tests), total_ok, len(tests) - total_ok)])
    synthese['A1'].font = Font(name=POLICE, bold=True, size=13, color=BLEU)
    synthese.append([])
    synthese.append(['Module', 'N°', 'Tests', 'OK Claude', 'Échec Claude', 'Joués testeur', 'Concordants', 'Discordants'])
    for c in synthese[3]:
        c.font, c.fill = Font(name=POLICE, bold=True, color='FFFFFF'), PatternFill('solid', fgColor=BLEU)
        c.alignment = Alignment(horizontal='center', wrap_text=True)
    for nom, n, ok, ko, de, a in lignes:
        f = "'%s'!" % nom[:31]
        plage = lambda col: '%s$%s$%d:$%s$%d' % (f, col, ENTETE + 1, col, ENTETE + n)
        synthese.append([nom, '%d à %d' % (de, a), n, ok, ko, '=COUNTA(%s)' % plage('I'),
                         '=COUNTIF(%s,"Oui")' % plage('L'), '=COUNTIF(%s,"Non")' % plage('L')])
    fin = synthese.max_row
    synthese.append(['Total', '', '=SUM(C4:C%d)' % fin, '=SUM(D4:D%d)' % fin, '=SUM(E4:E%d)' % fin,
                     '=SUM(F4:F%d)' % fin, '=SUM(G4:G%d)' % fin, '=SUM(H4:H%d)' % fin])
    for c in synthese[synthese.max_row]:
        c.font = Font(name=POLICE, bold=True)
    for col, largeur in zip('ABCDEFGH', (30, 12, 8, 10, 11, 11, 12, 12)):
        synthese.column_dimensions[col].width = largeur
    synthese.page_setup.orientation, synthese.page_setup.paperSize = 'landscape', synthese.PAPERSIZE_A4
    synthese.page_setup.fitToWidth, synthese.page_setup.fitToHeight = 1, 1
    synthese.sheet_properties.pageSetUpPr.fitToPage = True
    wb.save(sortie)
    print('%d tests, %d OK, %d en échec -> %s' % (len(tests), total_ok, len(tests) - total_ok, sortie))


if __name__ == '__main__':
    main()
