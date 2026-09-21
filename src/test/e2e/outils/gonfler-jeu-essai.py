#!/usr/bin/env python3
"""Gonfle le jeu d'essai du banc au VOLUME d'une officine reelle, avec de l'historique.

POURQUOI CET OUTIL EXISTE
-------------------------
Le jeu d'essai du banc compte environ cinquante mille ventes sur douze mois ; l'officine
en compte plus de trois cent quarante mille sur treize mois, et garde deux a trois ans
d'historique. Sept fois moins de volume, et c'est exactement ce qui a fait passer deux
lenteurs a travers les mailles : le controle des corrections tardives mesurait cent
soixante-six millisecondes ici et trois mille cent cinquante-trois chez elle. On ne peut
pas mesurer une lenteur qu'on n'a pas.

Cet outil DUPLIQUE les ventes et les achats existants en decalant leurs dates, pour
obtenir le meme volume et la meme profondeur d'historique. Il ne cree aucune donnee
inventee : ce sont les memes ventes, aux memes montants, a d'autres dates - ce qui suffit
pour mesurer, puisque la lenteur vient du VOLUME et non du contenu.

CE QU'IL NE FAIT PAS
--------------------
Il ne verifie pas la coherence des chiffres de l'officine : pour cela il faut ses vrais
chiffres, pas un multiple des miens. C'est l'objet du script d'anonymisation, qui permet
d'exporter une base reelle sans donnee nominative.

GARDE-FOU
---------
Il refuse de tourner sans la variable d'environnement GONFLER_JE_CONFIRME=oui, et refuse
toute base dont le nom n'a pas ete passe explicitement. Il n'a RIEN a faire sur une base
d'officine, et cette garde est la pour que personne ne l'y lance par accident.
"""
import os
import subprocess
import sys
import time

BASE = sys.argv[1] if len(sys.argv) > 1 else ''
# Decalages en mois : huit copies, de trois mois a deux ans en arriere. Elles couvrent
# ensemble aout 2023 a aout 2026 - donc toute l'annee 2024 - et multiplient le volume par neuf.
DECALAGES = [3, 6, 9, 12, 15, 18, 21, 24]


def sql(requete, silencieux=False):
    sortie = subprocess.run(['mariadb', '--default-character-set=utf8mb4', BASE, '-sN', '-e', requete],
                            capture_output=True, text=True)
    if sortie.returncode != 0 and not silencieux:
        raise SystemExit('SQL en echec : ' + sortie.stderr.strip())
    return sortie.stdout.strip()


def colonnes(table):
    """Les colonnes de la table, dans l'ordre : on doit les nommer pour en remplacer certaines."""
    return sql("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='" + BASE
               + "' AND TABLE_NAME='" + table + "' ORDER BY ORDINAL_POSITION").split('\n')


def copier(table, remplacements, filtre, n):
    """Duplique une table en substituant les colonnes de remplacements.

    Les valeurs de remplacements sont des expressions SQL ou %d est remplace par le numero
    de la copie et %m par son decalage en mois.
    """
    cols = colonnes(table)
    select = []
    for c in cols:
        expression = remplacements.get(c)
        select.append((expression.replace('%d', str(n)).replace('%m', str(DECALAGES[n - 1])))
                      if expression else '`' + c + '`')
    requete = ('INSERT IGNORE INTO `' + table + '` (`' + '`, `'.join(cols) + '`) SELECT '
               + ', '.join(select) + ' FROM `' + table + '`' + (' WHERE ' + filtre if filtre else ''))
    sql(requete)


def compter():
    return {
        'ventes': int(sql("SELECT COUNT(*) FROM t_preenregistrement")),
        'lignes': int(sql("SELECT COUNT(*) FROM t_preenregistrement_detail")),
        'reglements': int(sql("SELECT COUNT(*) FROM vente_reglement")),
        'bons': int(sql("SELECT COUNT(*) FROM t_bon_livraison")),
        'lignesBons': int(sql("SELECT COUNT(*) FROM t_bon_livraison_detail")),
    }


def main():
    if os.environ.get('GONFLER_JE_CONFIRME') != 'oui':
        raise SystemExit("refus : cet outil ecrit massivement en base.\n"
                         "Il n'a rien a faire sur une base d'officine.\n"
                         "Pour l'executer sur un banc d'essai : GONFLER_JE_CONFIRME=oui")
    if not BASE:
        raise SystemExit('usage : GONFLER_JE_CONFIRME=oui gonfler-jeu-essai.py <base>')

    avant = compter()
    print('AVANT : ' + ', '.join(k + '=' + str(v) for k, v in avant.items()))
    # « ORIGINE » : le jeu de depart, celui qu'on duplique. Sans ce marqueur, la deuxieme
    # copie dupliquerait la premiere et le volume exploserait de facon incontrolee.
    origine_vente = "lg_PREENREGISTREMENT_ID NOT LIKE 'c%-%'"
    origine_bon = "lg_BON_LIVRAISON_ID NOT LIKE 'c%-%'"

    debut = time.time()
    sql("SET GLOBAL foreign_key_checks = 0")
    try:
        for n in range(1, len(DECALAGES) + 1):
            t0 = time.time()
            # Les ventes, puis leurs lignes, puis leurs reglements : l'ordre des dependances.
            copier('t_preenregistrement', {
                'lg_PREENREGISTREMENT_ID': "CONCAT('c%d-', lg_PREENREGISTREMENT_ID)",
                'lg_PARENT_ID': "CASE WHEN lg_PARENT_ID IS NULL THEN NULL"
                                " ELSE CONCAT('c%d-', lg_PARENT_ID) END",
                'dt_CREATED': "DATE_SUB(dt_CREATED, INTERVAL %m MONTH)",
                'dt_UPDATED': "DATE_SUB(dt_UPDATED, INTERVAL %m MONTH)",
                'dt_ANNULER': "CASE WHEN dt_ANNULER IS NULL THEN NULL"
                              " ELSE DATE_SUB(dt_ANNULER, INTERVAL %m MONTH) END",
            }, origine_vente, n)
            copier('t_preenregistrement_detail', {
                'lg_PREENREGISTREMENT_DETAIL_ID': "CONCAT('c%d-', lg_PREENREGISTREMENT_DETAIL_ID)",
                'lg_PREENREGISTREMENT_ID': "CONCAT('c%d-', lg_PREENREGISTREMENT_ID)",
                'dt_CREATED': "DATE_SUB(dt_CREATED, INTERVAL %m MONTH)",
                'dt_UPDATED': "DATE_SUB(dt_UPDATED, INTERVAL %m MONTH)",
            }, "lg_PREENREGISTREMENT_ID NOT LIKE 'c%-%'", n)
            copier('vente_reglement', {
                'id': "CONCAT('c%d-', id)",
                'vente_id': "CONCAT('c%d-', vente_id)",
                'mvtDate': "DATE_SUB(mvtDate, INTERVAL %m MONTH)",
            }, "vente_id NOT LIKE 'c%-%'", n)
            # Les achats : le bon garde sa commande et donc son grossiste.
            copier('t_bon_livraison', {
                'lg_BON_LIVRAISON_ID': "CONCAT('c%d-', lg_BON_LIVRAISON_ID)",
                'dt_CREATED': "DATE_SUB(dt_CREATED, INTERVAL %m MONTH)",
                'dt_UPDATED': "DATE_SUB(dt_UPDATED, INTERVAL %m MONTH)",
            }, origine_bon, n)
            copier('t_bon_livraison_detail', {
                'lg_BON_LIVRAISON_DETAIL_ID': "CONCAT('c%d-', lg_BON_LIVRAISON_DETAIL_ID)",
                'lg_BON_LIVRAISON_ID': "CONCAT('c%d-', lg_BON_LIVRAISON_ID)",
            }, "lg_BON_LIVRAISON_ID NOT LIKE 'c%-%'", n)
            print('copie ' + str(n) + '/' + str(len(DECALAGES)) + ' (-' + str(DECALAGES[n - 1])
                  + ' mois) en ' + str(round(time.time() - t0)) + ' s')
    finally:
        sql("SET GLOBAL foreign_key_checks = 1")

    apres = compter()
    print('APRES : ' + ', '.join(k + '=' + str(v) for k, v in apres.items()))
    print('plage des ventes closes : ' + sql(
        "SELECT CONCAT(MIN(DATE(dt_UPDATED)), ' -> ', MAX(DATE(dt_UPDATED)))"
        " FROM t_preenregistrement WHERE str_STATUT='is_Closed'"))
    print('duree totale : ' + str(round(time.time() - debut)) + ' s')


if __name__ == '__main__':
    main()
