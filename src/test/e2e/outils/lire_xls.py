# -*- coding: utf-8 -*-
"""Lit un classeur .xls (BIFF8, exports Excel de Prestige) et ecrit ses lignes en JSON sur la sortie standard :
une liste de feuilles, chacune { "nom": ..., "lignes": [[cellule, ...], ...] }. Les nombres entiers sont rendus en
entiers, les cellules vides en chaines vides. Appele par les tests d'ecran (rapprochement des exports), via xlrd.

    python -X utf8 src/test/e2e/outils/lire_xls.py fichier.xls
"""
import json
import sys

import xlrd


def cellule(c):
    if c.ctype == xlrd.XL_CELL_NUMBER:
        return int(c.value) if float(c.value).is_integer() else c.value
    if c.ctype in (xlrd.XL_CELL_EMPTY, xlrd.XL_CELL_BLANK):
        return ''
    if c.ctype == xlrd.XL_CELL_BOOLEAN:
        return bool(c.value)
    return str(c.value)


def main(chemin):
    classeur = xlrd.open_workbook(chemin)
    feuilles = []
    for f in classeur.sheets():
        lignes = [[cellule(f.cell(r, c)) for c in range(f.ncols)] for r in range(f.nrows)]
        feuilles.append({'nom': f.name, 'lignes': lignes})
    sys.stdout.write(json.dumps(feuilles, ensure_ascii=False))


if __name__ == '__main__':
    main(sys.argv[1])
