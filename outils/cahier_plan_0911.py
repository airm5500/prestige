# -*- coding: utf-8 -*-
"""Ajoute (ou remplace) des cas dans la feuille « Plan du 09-11 » du cahier de recette et remet la synthèse à jour.

Usage : python -I outils/cahier_plan_0911.py <cahier.xlsx> <cas.json> <version> [points restants]
cas.json : liste d'objets {id, cas, ecran, objectif, existant, etapes, attendus, nettoyage, test, resultat, detail}.
Un cas dont l'identifiant existe déjà est remplacé ; les autres sont ajoutés à la suite, avec le style de la
dernière ligne.
"""
import copy
import json
import re
import sys

import openpyxl

FEUILLE = 'Plan du 09-11'
COLONNES = ['id', 'cas', 'ecran', 'objectif', 'existant', 'etapes', 'attendus', 'nettoyage', 'test', 'resultat', 'detail']


def main(chemin, fichier_cas, version, restants=None):
    with open(fichier_cas, encoding='utf-8') as f:
        cas = json.load(f)
    wb = openpyxl.load_workbook(chemin)
    ws = wb[FEUILLE]
    premiere = 5
    lignes = {ws.cell(r, 1).value: r for r in range(premiere, ws.max_row + 1) if ws.cell(r, 1).value}
    modele = max(lignes.values())
    for c in cas:
        r = lignes.get(c['id'])
        if r is None:
            r = max(lignes.values()) + 1
            for col in range(1, ws.max_column + 1):
                src, dst = ws.cell(modele, col), ws.cell(r, col)
                dst._style = copy.copy(src._style)
            ws.row_dimensions[r].height = ws.row_dimensions[modele].height
            lignes[c['id']] = r
        for i, k in enumerate(COLONNES, start=1):
            ws.cell(r, i).value = c[k]
    derniere = max(lignes.values())
    n = derniere - premiere + 1
    ok = sum(1 for r in range(premiere, derniere + 1) if ws.cell(r, 10).value == 'OK')
    ko = sum(1 for r in range(premiere, derniere + 1) if ws.cell(r, 10).value == 'Échec')
    ws.cell(2, 1).value = 'Version testée : branche plan/09112026 (' + version + ')'
    entete = re.sub(r'^\d+ cas (?:à|—) Claude\s*:\s*\d+ OK, \d+ en échec, \d+ non joués',
                    '%d cas — Claude : %d OK, %d en échec, %d non joués' % (n, ok, ko, n - ok - ko),
                    ws.cell(3, 1).value or '')
    if restants is not None:
        entete = re.sub(r'(hors cahier\)\s*:\s*)[^;]*;', lambda m: m.group(1) + restants + ' ;', entete)
    ws.cell(3, 1).value = entete
    syn = wb['Synthèse']
    for r in range(5, syn.max_row + 1):
        if syn.cell(r, 1).value == FEUILLE:
            syn.cell(r, 2).value = n
            syn.cell(r, 3).value = ok
            syn.cell(r, 4).value = ko
            syn.cell(r, 5).value = n - ok - ko
            for col in range(6, 12):
                v = syn.cell(r, col).value
                if isinstance(v, str):
                    syn.cell(r, col).value = re.sub(r'([LP])5:\1\d+', lambda m: '%s5:%s%d' % (m.group(1), m.group(1), derniere), v)
    wb.save(chemin)
    print('%s : %d cas (%d OK, %d en échec), lignes %d à %d' % (FEUILLE, n, ok, ko, premiere, derniere))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4] if len(sys.argv) > 4 else None)
