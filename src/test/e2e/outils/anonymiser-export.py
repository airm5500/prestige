#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ANONYMISATION D'UNE BASE AVANT DE L'EXPORTER HORS DE L'OFFICINE.

POURQUOI CET OUTIL EXISTE
-------------------------
Les lenteurs signalees par l'officine ne se voient que sur son volume reel : un banc d'essai
sept fois plus petit repond en deux cents millisecondes la ou son parc en demande trois mille.
Pour les reproduire il faut ses donnees - mais ses donnees portent des noms de patients, des
numeros de telephone, des posologies et des mots de passe, qui ne doivent JAMAIS sortir de chez
elle. Cet outil produit une copie qui garde les VOLUMES et les MONTANTS, seuls utiles a la
mesure, et remplace tout le reste.

LA GARANTIE LA PLUS IMPORTANTE : LA BASE DE PRODUCTION N'EST JAMAIS ECRITE
-------------------------------------------------------------------------
Le script ne se connecte a la base de production QU'EN LECTURE, le temps de la recopier. Toutes
les modifications portent sur la copie, dont le nom doit se terminer par « _anon » - une base de
travail ne peut donc pas etre prise pour cible par megarde. Si la cible existe deja, le script
s'arrete : il n'ecrase rien.

CE QUI EST REMPLACE
-------------------
  - l'identite des clients, de leurs ayants droit et des medecins : noms, adresses, telephones,
    courriels, dates de naissance ;
  - le nom et le telephone du client recopies sur chaque vente et sur chaque facture ;
  - l'identite des utilisateurs, leur identifiant de connexion et leur mot de passe ;
  - les ordonnances : numero, etablissement, observations, POSOLOGIES, et les pieces jointes,
    dont le chemin est vide - les images elles-memes ne sont de toute facon pas exportees ;
  - les messages envoyes et recus, et les numeros auxquels ils sont partis ;
  - TOUT SECRET : jetons d'acces, parametres chiffres, cles des fournisseurs de SMS, cles d'API.
    Aucun n'est remplace par une valeur plausible : ils sont VIDES, pour qu'un export ne puisse
    jamais servir a se connecter a quoi que ce soit.
  - l'identite de l'officine elle-meme.

CE QUI EST CONSERVE, ET POURQUOI
--------------------------------
Les ventes, leurs lignes, les montants, les dates, les stocks, les bons de livraison, les
grossistes et les articles : ce sont eux qui font le volume et les temps de reponse. Les liens
entre les tables sont conserves aussi - un client anonymise reste LE MEME client d'une vente a
l'autre - sans quoi les regroupements ne couteraient plus rien et la mesure serait faussee.

UTILISATION (chez l'officine, sur son serveur)
----------------------------------------------
    export ANONYMISER_JE_CONFIRME=oui
    python3 anonymiser-export.py --source <base_reelle> --cible <base_reelle>_anon \\
        [--dump /chemin/export.sql.gz]

Le script affiche un CONTROLE FINAL : il recompte, table par table, ce qui porterait encore une
donnee personnelle. Tant que ce controle n'annonce pas zero, l'export ne doit pas etre envoye.
Aucune valeur reelle n'est jamais affichee ni journalisee.
"""
import argparse
import os
import subprocess
import sys
import time

CONFIRMATION = 'ANONYMISER_JE_CONFIRME'


def sortir(message):
    print('ARRET : ' + message)
    sys.exit(1)


def mysql(base, sql, lecture_seule=False):
    """Execute du SQL. Le mode lecture seule sert aux controles sur la base d'origine."""
    if lecture_seule and not sql.lstrip().upper().startswith('SELECT'):
        sortir('tentative d ecriture sur une base ouverte en lecture seule')
    p = subprocess.run(['mysql', '--default-character-set=utf8mb4', base, '-sN', '-e', sql],
                       capture_output=True, text=True)
    if p.returncode != 0:
        sortir('SQL refuse : ' + p.stderr.strip()[:300])
    return p.stdout.strip()


def colonnes(base, table):
    brut = mysql(base, "SELECT COLUMN_NAME FROM information_schema.COLUMNS"
                       " WHERE TABLE_SCHEMA='%s' AND TABLE_NAME='%s'" % (base, table))
    return set(brut.split('\n')) if brut else set()


def existe(base, table):
    return mysql(base, "SELECT COUNT(*) FROM information_schema.TABLES"
                       " WHERE TABLE_SCHEMA='%s' AND TABLE_NAME='%s'" % (base, table)) == '1'


# ---------------------------------------------------------------------------------------------
# LE PLAN D'ANONYMISATION. Une entree par table : les colonnes a remplacer, et par quoi.
#
# « seq » numerote les lignes pour que deux clients differents restent differents : c'est ce qui
# preserve le cout des regroupements. Les identifiants techniques ne sont jamais touches, sinon
# les liens entre les tables seraient rompus et le volume ne voudrait plus rien dire.
# ---------------------------------------------------------------------------------------------
PLAN = [
    ('t_client', 'lg_CLIENT_ID', {
        'str_FIRST_NAME': "'Client'", 'str_LAST_NAME': "CONCAT('Anonyme ', %(ref)s)",
        'str_ADRESSE': "NULL", 'str_AUTRE_ADRESSE': "NULL",
        'str_TELEPHONE': "CONCAT('00000', %(ref)s)", 'telephone_standard': "NULL",
        'email': "NULL", 'dt_NAISSANCE': "NULL"}),
    ('t_ayant_droit', 'lg_AYANTS_DROITS_ID', {
        'str_FIRST_NAME': "'Ayant droit'", 'str_LAST_NAME': "CONCAT('Anonyme ', %(ref)s)",
        'dt_NAISSANCE': "NULL"}),
    ('t_medecin', 'lg_MEDECIN_ID', {
        'str_FIRST_NAME': "'Docteur'", 'str_LAST_NAME': "CONCAT('Anonyme ', %(ref)s)",
        'str_ADRESSE': "NULL", 'str_MAIL': "NULL", 'str_PHONE': "NULL"}),
    ('t_preenregistrement', None, {
        'str_FIRST_NAME_CUSTOMER': "NULL", 'str_LAST_NAME_CUSTOMER': "NULL",
        'str_PHONE_CUSTOME': "NULL"}),
    ('t_facture_detail', None, {
        'str_FIRST_NAME_CUSTOMER': "NULL", 'str_LAST_NAME_CUSTOMER': "NULL"}),
    ('t_litige', None, {'str_CLIENT_NAME': "NULL"}),
    # Les utilisateurs : l'identifiant de connexion et le mot de passe partent aussi. Le mot de passe
    # est VIDE et non remplace par un hache quelconque - un export ne doit ouvrir aucune session.
    # L'identifiant de connexion porte un index UNIQUE : il est derive de la cle de la ligne, qui
    # l'est aussi, et non d'un compteur dont l'ordre d'evaluation n'est pas garanti.
    ('t_user', 'lg_USER_ID', {
        'str_FIRST_NAME': "'Utilisateur'", 'str_LAST_NAME': "CONCAT('Anonyme ', %(ref)s)",
        'str_LOGIN': "CONCAT('user', %(ref)s)", 'str_PASSWORD': "''",
        'str_PHONE': "NULL", 'str_MAIL': "NULL"}),
    ('t_user_fone', None, {'str_PHONE': "NULL", 'str_NUMBER': "NULL"}),
    ('t_alert_event_user_fone', None, {'str_PHONE': "NULL", 'str_NUMBER': "NULL"}),
    # Les ordonnances portent des donnees de sante : la posologie et les observations partent.
    ('t_ordonnance_client', 'lg_ORDONNANCE_ID', {
        'str_NUMERO': "CONCAT('ORD', %(ref)s)", 'str_ETABLISSEMENT': "NULL",
        'str_OBSERVATIONS': "NULL", 'str_MOTIF_ANNULATION': "NULL"}),
    ('t_ordonnance_client_detail', None, {'str_POSOLOGIE': "NULL", 'str_DUREE': "NULL"}),
    ('t_ordonnance_client_piece', None, {
        'str_NOM_ORIGINE': "'piece.pdf'", 'str_CHEMIN': "NULL", 'str_TYPE_MIME': "NULL"}),
    ('t_inboud_message', None, {'str_PHONE': "NULL", 'str_MESSAGE': "NULL", 'str_CONTENT': "NULL"}),
    ('t_outboud_message', None, {'str_PHONE': "NULL", 'str_MESSAGE': "NULL", 'str_CONTENT': "NULL"}),
    ('t_support_ticket_message', None, {'message': "NULL", 'str_MESSAGE': "NULL"}),
    ('modele_message', None, {'corps': "NULL", 'contenu': "NULL"}),
    ('t_notification', None, {'message': "NULL", 'titre': "NULL"}),
    # L'identite de l'officine : un export ne doit pas dire de qui il vient.
    ('t_fiche_societe', None, {
        'str_ADRESSE_PRINCIPALE': "NULL", 'str_AUTRE_ADRESSE': "NULL",
        'str_CONTACTS_TELEPHONIQUES': "NULL", 'str_NAME': "'Officine anonymisee'",
        'str_EMAIL': "NULL"}),
    ('t_company', None, {'str_PHONE': "NULL", 'str_NAME': "'Officine anonymisee'"}),
    # C'est ICI que vit le nom imprime sur chaque ticket, avec le compte bancaire, le registre du
    # commerce et les references fiscales. La premiere version de cet outil ne regardait que
    # t_fiche_societe et t_company, vides sur le banc : le nom de l'officine serait parti avec
    # l'export sans que rien ne le signale.
    ('t_officine', None, {
        'str_NOM_ABREGE': "'OFFICINE'", 'str_NOM_COMPLET': "'Officine anonymisee'",
        'str_ADRESSSE_POSTALE': "NULL", 'str_FIRST_NAME': "NULL", 'str_LAST_NAME': "NULL",
        'str_PHONE': "NULL", 'str_AUTRESPHONES': "NULL", 'str_ENTETE': "NULL",
        'str_COMMENTAIRE1': "NULL", 'str_COMMENTAIRE2': "NULL",
        'str_COMMENTAIREOFFICINE': "NULL", 'str_COMPTE_BANCAIRE': "NULL",
        'str_COMPTE_CONTRIBUABLE': "NULL", 'str_REGISTRE_COMMERCE': "NULL",
        'str_REGISTRE_IMPOSITION': "NULL", 'str_CENTRE_IMPOSITION': "NULL",
        'str_NUM_COMPTABLE': "NULL"}),
    ('t_support_ticket', None, {
        'officine': "'Officine anonymisee'", 'description': "NULL", 'sujet': "NULL",
        'utilisateur': "NULL", 'affecte_a': "NULL", 'pieces_jointes': "NULL"}),
    ('t_emplacement', None, {
        'str_FIRST_NAME': "NULL", 'str_LAST_NAME': "NULL", 'str_PHONE': "NULL"}),
]

# LES SECRETS. Vides, jamais remplaces : un jeton plausible reste un jeton a essayer.
SECRETS = [
    ("sms_token", "UPDATE sms_token SET access_token='', app_header=''"),
    ("sms_fournisseur_param", "UPDATE sms_fournisseur_param SET valeur=''"),
    ("sms_fournisseur", "UPDATE sms_fournisseur SET dlr_callback_url=''"),
    # Tout parametre marque comme chiffre, plus ceux dont le nom annonce un secret.
    ("t_parameters", "UPDATE t_parameters SET str_VALUE=''"
                     " WHERE LOWER(IFNULL(str_IS_EN_KRYPTED,'')) IN ('1','true','oui','yes')"
                     " OR str_KEY REGEXP 'POSOS|TOKEN|SECRET|PASSWORD|PASSWD|SMTP|MAIL|API|LICEN'"),
]

# LE CONTROLE FINAL. Chaque ligne : ce qui ne devrait plus exister nulle part.
# LE CONTROLE FINAL. Chaque ligne : ce qui ne devrait plus exister nulle part.
#
# Une colonne declaree NOT NULL n'accepte pas d'etre mise a NULL : MariaDB y range une chaine vide.
# La donnee est bien partie, mais « IS NOT NULL » reste vrai - le premier jet de ces controles
# refusait l'export pour cette seule raison. On teste donc « ni NULL ni vide », qui dit ce qu'on
# veut vraiment savoir, quelle que soit la facon dont la colonne est declaree.
VIDE = "IFNULL(%s, '') = ''"


def rien(*colonnes):
    return ' OR '.join('NOT ' + VIDE % c for c in colonnes)


CONTROLES = [
    ('t_client', "str_LAST_NAME NOT LIKE 'Anonyme %' OR str_TELEPHONE NOT LIKE '00000%' OR "
                 + rien('str_ADRESSE', 'email') + " OR dt_NAISSANCE IS NOT NULL"),
    ('t_ayant_droit', "str_LAST_NAME NOT LIKE 'Anonyme %' OR dt_NAISSANCE IS NOT NULL"),
    ('t_medecin', "str_LAST_NAME NOT LIKE 'Anonyme %' OR " + rien('str_PHONE', 'str_MAIL')),
    ('t_preenregistrement', rien('str_LAST_NAME_CUSTOMER', 'str_PHONE_CUSTOME')),
    ('t_facture_detail', rien('str_LAST_NAME_CUSTOMER')),
    ('t_user', "str_PASSWORD <> '' OR str_LOGIN NOT LIKE 'user%' OR " + rien('str_MAIL')),
    ('t_ordonnance_client', rien('str_OBSERVATIONS', 'str_ETABLISSEMENT')),
    ('t_ordonnance_client_detail', rien('str_POSOLOGIE')),
    ('sms_token', "access_token <> ''"),
    ('sms_fournisseur_param', "valeur <> ''"),
    ('t_officine', "str_NOM_COMPLET <> 'Officine anonymisee' OR "
                   + rien('str_PHONE', 'str_COMPTE_BANCAIRE', 'str_ADRESSSE_POSTALE')),
    ('t_support_ticket', rien('description', 'sujet')),
]


def anonymiser(cible):
    debut = time.time()
    for table, cle, champs in PLAN:
        if not existe(cible, table):
            print('  %-32s absente de cette base, rien a faire' % table)
            continue
        presents = colonnes(cible, table)
        if cle and cle not in presents:
            print('  %-32s cle « %s » absente : table laissee telle quelle' % (table, cle))
            continue
        # La valeur de remplacement derive de la cle de la ligne : deux lignes differentes
        # restent differentes - ce qui preserve le cout des regroupements - et une meme ligne
        # donne toujours le meme resultat, de sorte que l'outil peut etre rejoue.
        ref = "SUBSTRING(MD5(%s), 1, 10)" % cle if cle else None
        retenus = {}
        for c, v in champs.items():
            if c not in presents:
                continue
            if '%(ref)s' in v:
                if not ref:
                    continue
                v = v % {'ref': ref}
            retenus[c] = v
        if not retenus:
            print('  %-32s aucune colonne concernee' % table)
            continue
        affectations = ', '.join('%s = %s' % (c, v) for c, v in sorted(retenus.items()))
        mysql(cible, 'UPDATE %s SET %s' % (table, affectations))
        nb = mysql(cible, 'SELECT COUNT(*) FROM %s' % table)
        print('  %-32s %8s ligne(s), %d colonne(s) remplacee(s)' % (table, nb, len(retenus)))
    print('')
    print('SECRETS')
    for table, sql in SECRETS:
        if not existe(cible, table):
            print('  %-32s absente' % table)
            continue
        try:
            mysql(cible, sql)
            print('  %-32s vide' % table)
        except SystemExit:
            print('  %-32s NON VIDE - a verifier a la main' % table)
            raise
    print('')
    print('anonymisation en %d s' % (time.time() - debut))


def controler(cible):
    print('')
    print('CONTROLE FINAL - ce qui porterait encore une donnee personnelle')
    total = 0
    for table, condition in CONTROLES:
        if not existe(cible, table):
            continue
        presentes = colonnes(cible, table)
        # Une condition qui nomme une colonne absente ne peut pas etre evaluee : on la saute
        # en le disant, plutot que de faire croire a un controle qui n'a pas eu lieu.
        mots = condition
        for signe in '(),\'':
            mots = mots.replace(signe, ' ')
        manquantes = [m for m in set(mots.split())
                      if m.startswith('str_') or m.startswith('dt_')]
        absentes = [m for m in manquantes if m not in presentes]
        if absentes:
            print('  %-32s CONTROLE IMPOSSIBLE : %s absente(s)' % (table, ', '.join(absentes)))
            continue
        n = int(mysql(cible, 'SELECT COUNT(*) FROM %s WHERE %s' % (table, condition)))
        total += n
        print('  %-32s %s' % (table, 'RIEN' if n == 0 else '%d LIGNE(S) A REPRENDRE' % n))
    print('')
    if total == 0:
        print('CONTROLE FINAL : RIEN NE RESTE. L export peut etre transmis.')
    else:
        print('CONTROLE FINAL : %d ligne(s) portent encore une donnee personnelle.' % total)
        print('N ENVOYEZ PAS CET EXPORT.')
    return total


def main():
    a = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    a.add_argument('--source', required=True, help='base reelle, ouverte EN LECTURE SEULE')
    a.add_argument('--cible', required=True, help='base de travail, son nom doit finir par _anon')
    a.add_argument('--dump', help='fichier .sql.gz a produire une fois l anonymisation faite')
    o = a.parse_args()

    if os.environ.get(CONFIRMATION) != 'oui':
        sortir('cet outil recopie puis modifie une base entiere. Pour confirmer :\n'
               '        export %s=oui' % CONFIRMATION)
    if not o.cible.endswith('_anon'):
        sortir('le nom de la base cible doit se terminer par « _anon ».\n'
               '        C est ce qui empeche de prendre une base de travail pour cible.')
    if o.cible == o.source:
        sortir('la source et la cible sont la meme base : la production serait modifiee')

    if mysql(o.source, "SELECT COUNT(*) FROM information_schema.SCHEMATA"
                       " WHERE SCHEMA_NAME='%s'" % o.source, lecture_seule=True) != '1':
        sortir('la base source « %s » est introuvable' % o.source)
    deja = subprocess.run(['mysql', '-sN', '-e', "SELECT COUNT(*) FROM information_schema.SCHEMATA"
                                                 " WHERE SCHEMA_NAME='%s'" % o.cible],
                          capture_output=True, text=True).stdout.strip()
    if deja == '1':
        sortir('la base cible « %s » existe deja : rien n a ete touche.\n'
               '        Supprimez-la vous-meme si vous voulez la refaire.' % o.cible)

    print('SOURCE (lecture seule) : %s' % o.source)
    print('CIBLE  (modifiee)      : %s' % o.cible)
    print('')
    print('RECOPIE')
    t0 = time.time()
    subprocess.run(['mysql', '-e', 'CREATE DATABASE `%s` CHARACTER SET utf8mb4' % o.cible],
                   check=True)
    recopie = subprocess.run(
        'mysqldump --single-transaction --routines --triggers --default-character-set=utf8mb4 '
        '%s | mysql --default-character-set=utf8mb4 %s' % (o.source, o.cible),
        shell=True)
    if recopie.returncode != 0:
        sortir('la recopie a echoue ; la base source n a PAS ete modifiee')
    print('  recopiee en %d s' % (time.time() - t0))
    print('')
    print('ANONYMISATION')
    anonymiser(o.cible)
    reste = controler(o.cible)

    if o.dump:
        if reste:
            sortir('aucun export produit tant que le controle final n est pas a zero')
        print('')
        print('EXPORT')
        t0 = time.time()
        d = subprocess.run('mysqldump --single-transaction --routines --triggers '
                           '--default-character-set=utf8mb4 %s | gzip -9 > %s'
                           % (o.cible, o.dump), shell=True)
        if d.returncode != 0:
            sortir('l export a echoue')
        taille = os.path.getsize(o.dump) / (1024.0 * 1024.0)
        print('  %s - %.1f Mo - en %d s' % (o.dump, taille, time.time() - t0))
    sys.exit(1 if reste else 0)


if __name__ == '__main__':
    main()
