#!/usr/bin/env python3
"""
Peuplement du BANC D'ESSAI (jamais une base de production) : 3 ans d'activite d'une officine, pour mesurer les
lenteurs avec un volume reel (retour du 14/10).

  - chiffre d'affaires quotidien de ~1,1 M (il y a 3 ans) a ~2,4 M (aujourd'hui), creux du dimanche, pic du samedi,
    saisons (fin d'annee, saison des pluies) ;
  - 78 % de ventes au comptant (VNO), 22 % de ventes assurees (VO, tiers payant 60 a 80 %) ;
  - reglements especes, Orange, Wave, MTN, Moov, carte ;
  - quelques produits tres vendus et une longue traine (loi de Zipf) ;
  - stock reconstruit EN REMONTANT LE TEMPS a partir du stock actuel : le stock d'aujourd'hui ne change pas ;
    reapprovisionnement par bons de livraison (commande + BL + lignes + mouvements d'entree) ;
  - ouverture de caisse quotidienne des caissiers ; 15 tiers payants, 3000 clients assures.

Chaque ligne est la copie d'une vraie ligne du banc (meme format que l'application) dont seuls les identifiants,
dates, produits, quantites et montants changent. Tous les identifiants commencent par 'f00d' :
  retrait complet : python3 peupler_banc.py --retirer

Usage : python3 peupler_banc.py [--base capitale] [--annees 3] [--graine 14] [--dossier /tmp/peuplement]
"""
import argparse
import csv
import datetime as dt
import json
import math
import os
import random
import subprocess
import sys
import uuid
from collections import defaultdict

P = argparse.ArgumentParser()
P.add_argument('--base', default='capitale')
P.add_argument('--annees', type=int, default=3)
P.add_argument('--graine', type=int, default=14)
P.add_argument('--dossier', default='/tmp/peuplement')
P.add_argument('--retirer', action='store_true')
A = P.parse_args()
R = random.Random(A.graine)
MARQUE = 'f00d'

TABLES = ['t_tiers_payant', 't_client', 't_compte_client', 't_ayant_droit', 't_compte_client_tiers_payant',
          't_order', 't_bon_livraison', 't_bon_livraison_detail', 't_reglement', 't_preenregistrement',
          't_preenregistrement_detail', 't_preenregistrement_compte_client_tiers_payent', 'vente_reglement',
          'mvttransaction', 't_recettes', 'hmvtproduit', 't_resume_caisse', 't_order_detail', 'ligne_resume_caisse']


def sql(q):
    r = subprocess.run(['mariadb', '--default-character-set=utf8mb4', A.base, '-sN', '--raw', '-e', q],
                       capture_output=True, text=True)
    if r.returncode:
        sys.exit('SQL : ' + r.stderr + '\n' + q[:500])
    return [l.split('\t') for l in r.stdout.splitlines()]


def colonnes(table):
    return [(c, int(n) if n not in ('NULL', '') else None) for c, n in sql(
        "SELECT COLUMN_NAME, IFNULL(CHARACTER_MAXIMUM_LENGTH, '') FROM information_schema.COLUMNS "
        f"WHERE TABLE_SCHEMA = '{A.base}' AND TABLE_NAME = '{table}' ORDER BY ORDINAL_POSITION")]


BITS = defaultdict(set)
for t, c in sql("SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = '"
                + A.base + "' AND DATA_TYPE = 'bit'"):
    BITS[t].add(c)


def modele(table, where):
    cols = [c for c, _ in colonnes(table)]
    obj = ', '.join(f"'{c}', CAST(`{c}` AS UNSIGNED)" if c in BITS[table] else f"'{c}', `{c}`" for c in cols)
    l = sql(f"SELECT JSON_OBJECT({obj}) FROM `{table}` WHERE {where} LIMIT 1")
    if not l:
        sys.exit(f'modele introuvable : {table} WHERE {where}')
    return json.loads(l[0][0])


# ------------------------------------------------------------------------------------------------- retrait
CLES = {'t_tiers_payant': 'lg_TIERS_PAYANT_ID', 't_client': 'lg_CLIENT_ID', 't_compte_client': 'lg_COMPTE_CLIENT_ID',
        't_ayant_droit': 'lg_AYANTS_DROITS_ID', 't_compte_client_tiers_payant': 'lg_COMPTE_CLIENT_TIERS_PAYANT_ID',
        't_order': 'lg_ORDER_ID', 't_bon_livraison': 'lg_BON_LIVRAISON_ID',
        't_bon_livraison_detail': 'lg_BON_LIVRAISON_DETAIL', 't_reglement': 'lg_REGLEMENT_ID',
        't_preenregistrement': 'lg_PREENREGISTREMENT_ID', 't_preenregistrement_detail': 'lg_PREENREGISTREMENT_DETAIL_ID',
        't_preenregistrement_compte_client_tiers_payent': 'lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID',
        'vente_reglement': 'id', 'mvttransaction': 'uuid', 't_recettes': 'ID_RECETTE', 'hmvtproduit': 'uuid',
        't_resume_caisse': 'ld_CAISSE_ID', 't_order_detail': 'lg_ORDERDETAIL_ID', 'ligne_resume_caisse': 'resume_caisse_id'}

if A.retirer:
    q = 'SET FOREIGN_KEY_CHECKS = 0; ' + ' '.join(
        f"DELETE FROM `{t}` WHERE `{CLES[t]}` LIKE '{MARQUE}%';" for t in reversed(TABLES)) + ' SET FOREIGN_KEY_CHECKS = 1;'
    sql(q)
    print('Donnees de peuplement retirees.')
    sys.exit(0)

# ------------------------------------------------------------------------------------------------- identifiants
LONG = {t: dict(colonnes(t)) for t in TABLES}
compteur = [0]


def ident(table, col):
    n = LONG[table].get(col) or 40
    compteur[0] += 1
    if n >= 36:
        return MARQUE + uuid.UUID(int=R.getrandbits(128)).hex[4:8] + '-' + str(uuid.UUID(int=R.getrandbits(128)))[9:]
    return (MARQUE + '%016d' % compteur[0])[:n]


# ------------------------------------------------------------------------------------------------- modeles
VNO = '8dbeac97-0e3b-4246-844e-3113876ecda1'
VO = 'ea3d1866-bb9f-47e2-8eaa-6636907b08b7'
M = {
    'vno': modele('t_preenregistrement', f"lg_PREENREGISTREMENT_ID = '{VNO}'"),
    'vo': modele('t_preenregistrement', f"lg_PREENREGISTREMENT_ID = '{VO}'"),
    'det': modele('t_preenregistrement_detail', f"lg_PREENREGISTREMENT_ID = '{VNO}'"),
    'det_vo': modele('t_preenregistrement_detail', f"lg_PREENREGISTREMENT_ID = '{VO}'"),
    'regl': modele('t_reglement', f"str_REF_RESSOURCE = '{VNO}'"),
    'regl_vo': modele('t_reglement', f"str_REF_RESSOURCE = '{VO}'"),
    'vr': modele('vente_reglement', f"vente_id = '{VNO}'"),
    'mvt': modele('mvttransaction', f"pkey = '{VNO}'"),
    'mvt_vo': modele('mvttransaction', f"pkey = '{VO}'"),
    'rec': modele('t_recettes', f"str_REF_FACTURE = '{VNO}'"),
    'hmvt': modele('hmvtproduit', "typeMvt = '02' AND lg_PREENREGISTREMENT_DETAIL_ID IS NOT NULL"),
    'hmvt_bl': modele('hmvtproduit', "typeMvt = '01'"),
    'tp_vente': modele('t_preenregistrement_compte_client_tiers_payent', f"lg_PREENREGISTREMENT_ID = '{VO}'"),
    'bl': modele('t_bon_livraison', "str_STATUT = 'is_Closed' ORDER BY dt_UPDATED DESC"),
    'caisse': modele('t_resume_caisse', '1 = 1 ORDER BY dt_CREATED DESC'),
}
M['bl_det'] = modele('t_bon_livraison_detail', f"lg_BON_LIVRAISON_ID = '{M['bl']['lg_BON_LIVRAISON_ID']}'")
M['order'] = modele('t_order', f"lg_ORDER_ID = '{M['bl']['lg_ORDER_ID']}'")
M['order_det'] = modele('t_order_detail', "str_STATUT <> 'delete' ORDER BY dt_UPDATED DESC")
M['cctp'] = modele('t_compte_client_tiers_payant',
                   f"lg_COMPTE_CLIENT_TIERS_PAYANT_ID = '{M['tp_vente']['lg_COMPTE_CLIENT_TIERS_PAYANT_ID']}'")
M['cc'] = modele('t_compte_client', f"lg_COMPTE_CLIENT_ID = '{M['cctp']['lg_COMPTE_CLIENT_ID']}'")
M['client'] = modele('t_client', f"lg_CLIENT_ID = '{M['cc']['lg_CLIENT_ID']}'")
M['ad'] = modele('t_ayant_droit', f"lg_CLIENT_ID = '{M['client']['lg_CLIENT_ID']}'")
M['tp'] = modele('t_tiers_payant', f"lg_TIERS_PAYANT_ID = '{M['cctp']['lg_TIERS_PAYANT_ID']}'")

# ------------------------------------------------------------------------------------------------- referentiels
PRODUITS = []
for fid, prix, paf, tva, stock in sql(
        "SELECT f.lg_FAMILLE_ID, f.int_PRICE, IFNULL(NULLIF(f.int_PAF, 0), ROUND(f.int_PRICE * 0.68)), "
        "IFNULL(t.int_VALUE, 0), IFNULL(s.int_NUMBER_AVAILABLE, 0) FROM t_famille f "
        "LEFT JOIN t_code_tva t ON t.lg_CODE_TVA_ID = f.lg_CODE_TVA_ID "
        "LEFT JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' "
        "WHERE f.str_STATUT = 'enable' AND f.int_PRICE > 0 AND f.int_PRICE <= 40000"):
    PRODUITS.append({'id': fid, 'prix': int(float(prix)), 'paf': int(float(paf)), 'tva': int(float(tva)),
                     'stock': max(0, int(float(stock)))})
# les produits les plus vendus sont surtout les moins chers (antalgiques, antipaludiques, vitamines...)
PRODUITS.sort(key=lambda p: p['prix'] * R.uniform(0.25, 4.0))
POIDS = [1.0 / (i + 8) ** 1.05 for i in range(len(PRODUITS))]  # Zipf : quelques produits tres vendus
CUMUL = []
s = 0
for w in POIDS:
    s += w
    CUMUL.append(s)


def produit():
    import bisect
    return PRODUITS[bisect.bisect_left(CUMUL, R.random() * CUMUL[-1])]


CAISSIERS = [u for (u,) in sql("SELECT lg_USER_ID FROM t_user WHERE str_STATUT = 'enable' AND str_LOGIN <> 'admin'")]
GROSSISTES = [g for (g,) in sql("SELECT lg_GROSSISTE_ID FROM t_grossiste WHERE str_STATUT = 'enable' LIMIT 5")]
MODES = [  # (mode de reglement, type de reglement, poids)
    ('1', '1', 70), ('10', '7', 10), ('11', '10', 8), ('9', '9', 5), ('8', '8', 3), ('5', '3', 4)]
NOMS = ['KOUASSI', 'KONAN', 'YAO', 'KOFFI', 'TRAORE', 'COULIBALY', 'OUATTARA', 'DIABATE', 'BAMBA', 'KONE', 'TOURE',
        'N GUESSAN', 'AKA', 'ASSI', 'GBAGBO', 'DIALLO', 'SANOGO', 'BROU', 'KOUAME', 'AHOUA', 'ZADI', 'GNAGNE']
PRENOMS = ['AMANI', 'AYA', 'AFFOUE', 'ADJOUA', 'KOFFI', 'MARIE', 'JEAN', 'AWA', 'FATOU', 'IBRAHIM', 'MOUSSA',
           'ESTELLE', 'SERGE', 'ARMAND', 'PRISCA', 'NADEGE', 'BLANDINE', 'HERVE', 'ROSINE', 'PATRICK']
ASSURANCES = ['MUGEF-CI', 'CNAM CMU', 'ASCOMA', 'SAHAM ASSURANCE', 'NSIA ASSURANCES', 'ALLIANZ CI', 'MCI CARE',
              'GRAS SAVOYE', 'SUNU ASSURANCES', 'AXA CI', 'ATLANTIQUE ASSURANCE', 'LOYALE ASSURANCE', 'SONAR CI',
              'INTER AFRICA', 'MUTUELLE ENSEIGNANTS']

os.makedirs(A.dossier, exist_ok=True)
FICHIERS = {}


def ecrire(table, ligne):
    if table not in FICHIERS:
        f = open(os.path.join(A.dossier, table + '.tsv'), 'w', newline='', encoding='utf-8')
        FICHIERS[table] = (f, [c for c, _ in colonnes(table)])
    f, cols = FICHIERS[table]
    vals = []
    for c in cols:
        v = ligne.get(c)
        if v is None:
            vals.append('\\N')
        else:
            if isinstance(v, (dict, list)):
                v = json.dumps(v)
            vals.append(str(v).replace('\\', '\\\\').replace('\t', ' ').replace('\n', ' ').replace('\r', ' '))
    f.write('\t'.join(vals) + '\n')


def copie(m, **v):
    d = dict(m)
    d.update(v)
    return d


def h(t):
    return t.strftime('%Y-%m-%d %H:%M:%S')


# ------------------------------------------------------------------------------------------------- assures
TP = []
for nom in ASSURANCES:
    i = ident('t_tiers_payant', 'lg_TIERS_PAYANT_ID')
    TP.append(i)
    ecrire('t_tiers_payant', copie(M['tp'], lg_TIERS_PAYANT_ID=i, str_NAME=nom, str_FULLNAME=nom,
                                   str_CODE_ORGANISME=nom[:10].replace(' ', ''), str_STATUT='enable'))
ASSURES = []
for n in range(3000):
    cid = ident('t_client', 'lg_CLIENT_ID')
    nom, pre = R.choice(NOMS), R.choice(PRENOMS)
    tel = '07%08d' % (40000000 + n * 7 + R.randrange(7))  # unique (telephone_standard est unique en base)
    nss = '%010d' % R.randrange(10 ** 9, 10 ** 10)
    ecrire('t_client', copie(M['client'], lg_CLIENT_ID=cid, str_FIRST_NAME=nom, str_LAST_NAME=pre,
                             str_ADRESSE=tel, str_TELEPHONE=tel, telephone_standard='+225' + tel,
                             str_CODE_INTERNE='SIM%05d' % n, str_NUMERO_SECURITE_SOCIAL=nss, email=None))
    ccid = ident('t_compte_client', 'lg_COMPTE_CLIENT_ID')
    ecrire('t_compte_client', copie(M['cc'], lg_COMPTE_CLIENT_ID=ccid, lg_CLIENT_ID=cid))
    ecrire('t_ayant_droit', copie(M['ad'], lg_AYANTS_DROITS_ID=cid, lg_CLIENT_ID=cid, str_FIRST_NAME=nom,
                                  str_LAST_NAME=pre, str_CODE_INTERNE='SIM%05d' % n, str_NUMERO_SECURITE_SOCIAL=nss))
    tp = TP[min(len(TP) - 1, int(R.expovariate(0.35)))]  # quelques assurances dominantes
    taux = R.choice([60, 70, 70, 80, 80, 80, 100])
    cct = ident('t_compte_client_tiers_payant', 'lg_COMPTE_CLIENT_TIERS_PAYANT_ID')
    ecrire('t_compte_client_tiers_payant', copie(M['cctp'], lg_COMPTE_CLIENT_TIERS_PAYANT_ID=cct,
                                                 lg_COMPTE_CLIENT_ID=ccid, lg_TIERS_PAYANT_ID=tp, int_POURCENTAGE=taux,
                                                 str_NUMERO_SECURITE_SOCIAL=nss))
    ASSURES.append((cid, cct, taux, nom, pre))

# ------------------------------------------------------------------------------------------------- ventes
existants = {d: int(n) for d, n in sql(
    "SELECT LEFT(str_REF, 6), MAX(CAST(SUBSTRING(str_REF, 8) AS UNSIGNED)) FROM t_preenregistrement "
    "WHERE str_REF REGEXP '^[0-9]{6}_[0-9]+$' GROUP BY LEFT(str_REF, 6)")}
maintenant = dt.datetime.now().replace(microsecond=0)
debut = (maintenant - dt.timedelta(days=365 * A.annees)).replace(hour=0, minute=0, second=0)
jours = (maintenant.date() - debut.date()).days + 1
SEMAINE = [1.08, 1.0, 1.0, 1.02, 1.1, 1.15, 0.55]
MOIS = {1: 0.95, 2: 0.92, 3: 0.97, 4: 1.0, 5: 1.03, 6: 1.1, 7: 1.12, 8: 1.0, 9: 0.98, 10: 1.0, 11: 1.02, 12: 1.12}
EVENEMENTS = defaultdict(list)  # produit -> [(instant, quantite, ligne hmvt)]
LIGNE_CAISSE = [9 * 10 ** 15]  # identifiants des lignes de cloture de caisse (bigint), hors de ceux de l'application
stats = defaultdict(int)


def heure(jour):
    # ouverture 7 h 30 - 22 h, pointes en fin de matinee et en fin d'apres-midi
    while True:
        x = R.choice([R.gauss(10.5, 1.4), R.gauss(17.5, 1.6), R.uniform(7.5, 22)])
        if 7.5 <= x < 22:
            return dt.datetime.combine(jour, dt.time()) + dt.timedelta(seconds=int(x * 3600))


for k in range(jours):
    jour = debut.date() + dt.timedelta(days=k)
    avance = k / max(1, jours - 1)
    cible = (1.1e6 + 1.3e6 * avance ** 1.15) * SEMAINE[jour.weekday()] * MOIS[jour.month] * R.uniform(0.86, 1.14)
    if jour == maintenant.date():
        cible *= max(0.0, min(1.0, (maintenant.hour + maintenant.minute / 60 - 7.5) / 14.5))
    cle_jour = jour.strftime('%y%m%d')
    numero = existants.get(cle_jour, 0)
    caissiers = R.sample(CAISSIERS, min(len(CAISSIERS), 2 + (jour.weekday() < 6)))
    caisses = {}
    for c in caissiers:
        caisses[c] = ident('t_resume_caisse', 'ld_CAISSE_ID')
        ecrire('t_resume_caisse', copie(M['caisse'], ld_CAISSE_ID=caisses[c],
                                        lg_USER_ID=c, lg_CREATED_BY=c, lg_UPDATED_BY=c, dt_DAY=str(jour),
                                        dt_CREATED=h(dt.datetime.combine(jour, dt.time(7, 30))),
                                        dt_UPDATED=h(dt.datetime.combine(jour, dt.time(22, 0))),
                                        int_SOLDE_MATIN=R.choice([25000, 50000, 50000, 100000]),
                                        int_SOLDE_SOIR=0, str_STATUT='is_Closed' if jour < maintenant.date() else 'is_Using',
                                        ID_COFFRE_CAISSE=None))
    encaisse = defaultdict(int)  # (caissier, type de reglement) -> montant encaisse dans la journee
    ventes = []
    ca = 0
    while ca < cible:
        t = heure(jour)
        if t > maintenant:
            continue
        vo = R.random() < 0.22
        nb = max(1, min(8, int(R.expovariate(1 / (2.6 if vo else 1.3))) + 1))
        lignes = []
        vus = set()
        for _ in range(nb):
            p = produit()
            if p['id'] in vus:
                continue
            vus.add(p['id'])
            q = 1 if R.random() < 0.72 else R.choice([2, 2, 2, 3, 4, 5])
            lignes.append((p, q))
        total = sum(p['prix'] * q for p, q in lignes)
        ca += total
        ventes.append((t, vo, lignes, total))
    ventes.sort(key=lambda v: v[0])
    for t, vo, lignes, total in ventes:
        numero += 1
        ref = f'{cle_jour}_{numero:05d}'
        fin = t + dt.timedelta(seconds=R.randint(20, 240))
        vid = ident('t_preenregistrement', 'lg_PREENREGISTREMENT_ID')
        rid = ident('t_reglement', 'lg_REGLEMENT_ID')
        caissier = R.choice(caissiers)
        vendeur = caissier if R.random() < 0.7 else R.choice(caissiers)
        mode, typ, _ = R.choices(MODES, weights=[m[2] for m in MODES])[0]
        tva = sum(round(p['prix'] * q * p['tva'] / (100 + p['tva'])) for p, q in lignes)
        marge = sum((p['prix'] - p['paf']) * q for p, q in lignes)
        if vo:
            cid, cct, taux, nom, pre = R.choice(ASSURES)
            part_tp = round(total * taux / 100)
            part_client = total - part_tp
            v = copie(M['vo'], lg_CLIENT_ID=cid, lg_AYANTS_DROITS_ID=cid, str_FIRST_NAME_CUSTOMER=nom,
                      str_LAST_NAME_CUSTOMER=pre, int_CUST_PART=part_client, str_REF_BON=str(R.randrange(10 ** 6, 10 ** 7)))
        else:
            part_tp, part_client = 0, total
            v = copie(M['vno'])
        verse = part_client if mode != '1' else int(math.ceil(max(part_client, 1) / 1000.0) * 1000) + R.choice(
            [0, 0, 0, 1000, 5000])
        ecrire('t_reglement', copie(M['regl_vo' if vo else 'regl'], lg_REGLEMENT_ID=rid, str_REF_RESSOURCE=vid,
                                    lg_MODE_REGLEMENT_ID=mode, dt_CREATED=h(fin), dt_UPDATED=h(fin),
                                    dt_REGLEMENT=h(fin), lg_USER_ID=caissier))
        ecrire('t_preenregistrement', copie(
            v, lg_PREENREGISTREMENT_ID=vid, str_REF=ref, str_REF_TICKET=str(R.randrange(10 ** 9, 10 ** 10)),
            lg_USER_ID=vendeur, lg_USER_VENDEUR_ID=vendeur, lg_USER_CAISSIER_ID=caissier, int_PRICE=total,
            int_PRICE_OTHER=total, int_ACCOUNT=total, int_PRICE_REMISE=0, montantTva=tva, dt_CREATED=h(t),
            dt_UPDATED=h(fin), completion_date=h(fin), lg_REGLEMENT_ID=rid, str_STATUT='is_Closed', b_IS_CANCEL=0,
            str_POSTE=None, str_POSTE_SAISIE=None, str_IP=None))
        for p, q in lignes:
            did = ident('t_preenregistrement_detail', 'lg_PREENREGISTREMENT_DETAIL_ID')
            ecrire('t_preenregistrement_detail', copie(
                M['det_vo' if vo else 'det'], lg_PREENREGISTREMENT_DETAIL_ID=did, lg_PREENREGISTREMENT_ID=vid,
                lg_FAMILLE_ID=p['id'], int_QUANTITY=q, int_QUANTITY_SERVED=q, int_AVOIR=0, int_AVOIR_SERVED=q,
                int_PRICE=p['prix'] * q, int_PRICE_UNITAIR=p['prix'], int_PRICE_REMISE=0,
                montantTva=round(p['prix'] * q * p['tva'] / (100 + p['tva'])), valeurTva=p['tva'],
                prixAchat=p['paf'], dt_CREATED=h(t), dt_UPDATED=h(t), str_STATUT='is_Closed', str_LOTS_SCANNES=None))
            EVENEMENTS[p['id']].append((fin, q, copie(
                M['hmvt'], uuid=ident('hmvtproduit', 'uuid'), createdAt=h(fin), mvtdate=str(fin.date()), pkey=did,
                lg_PREENREGISTREMENT_DETAIL_ID=did, prixAchat=p['paf'], prixUn=p['prix'], qteMvt=q,
                valeurTva=p['tva'], lg_EMPLACEMENT_ID='1', lg_FAMILLE_ID=p['id'], lg_USER_ID=caissier, typeMvt='02',
                ug=0)))
        if vo:
            ecrire('t_preenregistrement_compte_client_tiers_payent', copie(
                M['tp_vente'], lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID=ident(
                    't_preenregistrement_compte_client_tiers_payent', 'lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID'),
                lg_PREENREGISTREMENT_ID=vid, lg_COMPTE_CLIENT_TIERS_PAYANT_ID=cct, lg_USER_ID=caissier,
                dt_CREATED=h(fin), dt_UPDATED=h(fin), int_PERCENT=taux, int_PRICE=part_tp, int_PRICE_RESTE=part_tp,
                str_STATUT_FACTURE='unpaid', str_REF_BON=v['str_REF_BON'], dbl_QUOTA_CONSO_VENTE=part_tp))
        ecrire('vente_reglement', copie(M['vr'], id=ident('vente_reglement', 'id'), montant=part_client,
                                        montant_attentu=part_client, mvtDate=h(fin), vente_id=vid,
                                        type_regelement=typ, montant_verse=verse, flag_id=None))
        ecrire('mvttransaction', copie(
            M['mvt_vo' if vo else 'mvt'], uuid=ident('mvttransaction', 'uuid'), avoidAmount=total, createdAt=h(fin),
            marge=marge, montant=total, montantCredit=part_tp, montantNet=total, montantPaye=part_client,
            montantRegle=part_client, montantRemise=0, montantRestant=0, montantTva=tva, montantVerse=verse,
            mvtdate=str(fin.date()), pkey=vid, reference=ref, caisse=caissier, typeReglementId=typ,
            lg_USER_ID=caissier, organisme=v.get('lg_CLIENT_ID') if vo else None,
            montantAcc=total if not vo else 0, vente_id=vid, flag_id=None))
        encaisse[(caissier, typ)] += part_client
        if part_client > 0:
            ecrire('t_recettes', copie(M['rec'], ID_RECETTE=ident('t_recettes', 'ID_RECETTE'), dt_CREATED=h(fin),
                                       dt_UPDATED=h(fin), int_AMOUNT=part_client, str_REF_FACTURE=vid,
                                       lg_USER_ID=caissier, str_DESCRIPTION='VO' if vo else 'VNO'))
        stats['ventes'] += 1
        stats['vo'] += vo
        stats['lignes'] += len(lignes)
        stats['ca'] += total
        if jour >= (maintenant.date() - dt.timedelta(days=30)):
            stats['ca30'] += total
            stats['jours30'] = 30
    # cloture des caisses de la journee (sauf aujourd'hui) : une ligne VENTE par type de reglement encaisse
    if jour < maintenant.date():
        for (c, typ), montant in sorted(encaisse.items()):
            LIGNE_CAISSE[0] += 1
            ecrire('ligne_resume_caisse', {'id': LIGNE_CAISSE[0], 'montant': montant, 'type_ligne': 0,
                                           'resume_caisse_id': caisses[c], 'type_reglement_id': typ})

# ------------------------------------------------------------------------------------------------- stock et achats
# Stock reconstruit en remontant le temps : le stock d'aujourd'hui (t_famille_stock) ne change pas. A chaque debut
# de journee, si le stock remonte au-dessus d'environ 3 semaines de ventes, un BL du matin l'a fait monter.
LIVRAISONS = defaultdict(list)  # (jour, grossiste) -> [(produit, quantite, debut, fin)]
for p in PRODUITS:
    ev = EVENEMENTS.get(p['id'])
    if not ev:
        continue
    ev.sort(key=lambda e: e[0], reverse=True)
    par_jour = max(0.05, sum(q for _, q, _ in ev) / jours)
    haut = int(par_jour * 21) + 6
    bas = int(par_jour * 4) + 2
    stock = p['stock']
    i = 0
    while i < len(ev):
        jour = ev[i][0].date()
        while i < len(ev) and ev[i][0].date() == jour:
            t, q, hm = ev[i]
            hm['qteFinale'] = stock
            hm['qteDebut'] = stock + q
            stock += q
            ecrire('hmvtproduit', hm)
            i += 1
        if stock > haut:
            qte = stock - bas
            LIVRAISONS[(jour, R.choice(GROSSISTES))].append((p, qte, stock - qte, stock))
            stock -= qte
    stats['stock_initial'] += stock

for (jour, grossiste), lignes in sorted(LIVRAISONS.items()):
    t = dt.datetime.combine(jour, dt.time(7, R.randint(0, 25)))
    oid = ident('t_order', 'lg_ORDER_ID')
    ecrire('t_order', copie(M['order'], lg_ORDER_ID=oid, lg_GROSSISTE_ID=grossiste, dt_CREATED=h(t - dt.timedelta(days=1)),
                            dt_UPDATED=h(t), str_STATUT='is_Closed', int_LINE=len(lignes),
                            int_PRICE=sum(p['paf'] * q for p, q, _, _ in lignes),
                            str_REF_ORDER='CMD' + jour.strftime('%y%m%d') + str(R.randint(100, 999))))
    bid = ident('t_bon_livraison', 'lg_BON_LIVRAISON_ID')
    mht = sum(p['paf'] * q for p, q, _, _ in lignes)
    tva = sum(round(p['paf'] * q * p['tva'] / 100) for p, q, _, _ in lignes)
    ecrire('t_bon_livraison', copie(M['bl'], lg_BON_LIVRAISON_ID=bid, str_REF_LIVRAISON=str(R.randrange(10 ** 11, 10 ** 12)),
                                    dt_DATE_LIVRAISON=h(dt.datetime.combine(jour, dt.time())), int_MHT=mht, int_TVA=tva,
                                    int_HTTC=mht + tva, lg_ORDER_ID=oid, dt_CREATED=h(t), dt_UPDATED=h(t),
                                    lg_USER_ID=R.choice(CAISSIERS), STATUS='REGLE' if jour < maintenant.date() - dt.timedelta(days=45) else 'NON REGLE'))
    for p, q, avant, apres in lignes:
        ecrire('t_order_detail', copie(M['order_det'], lg_ORDERDETAIL_ID=ident('t_order_detail', 'lg_ORDERDETAIL_ID'),
                                       lg_ORDER_ID=oid, lg_FAMILLE_ID=p['id'], lg_GROSSISTE_ID=grossiste, int_NUMBER=q,
                                       int_PRICE=p['paf'] * q, int_PAF_DETAIL=p['paf'], int_PRICE_DETAIL=p['prix'],
                                       int_QTE_MANQUANT=0, int_QTE_REP_GROSSISTE=q, str_STATUT='is_Closed',
                                       dt_CREATED=h(t - dt.timedelta(days=1)), dt_UPDATED=h(t), int_ORERSTATUS=2,
                                       prixAchat=p['paf'], ug=0, lots='[]', checked=0, quantite_controle=None))
        did = ident('t_bon_livraison_detail', 'lg_BON_LIVRAISON_DETAIL')
        ecrire('t_bon_livraison_detail', copie(M['bl_det'], lg_BON_LIVRAISON_DETAIL=did, lg_GROSSISTE_ID=grossiste,
                                               lg_FAMILLE_ID=p['id'], lg_BON_LIVRAISON_ID=bid, int_QTE_CMDE=q,
                                               int_QTE_UG=0, int_QTE_RECUE=q, int_PRIX_REFERENCE=p['prix'],
                                               int_PRIX_VENTE=p['prix'], int_PAF=p['paf'], int_PA_REEL=p['paf'],
                                               dt_CREATED=h(t), dt_UPDATED=h(t), int_QTE_MANQUANT=0, int_INITSTOCK=avant,
                                               prixTarif=p['paf'], lots='[]'))
        ecrire('hmvtproduit', copie(M['hmvt_bl'], uuid=ident('hmvtproduit', 'uuid'), createdAt=h(t), mvtdate=str(jour),
                                    pkey=did, prixAchat=p['paf'], prixUn=p['prix'], qteDebut=avant, qteFinale=apres,
                                    qteMvt=q, valeurTva=p['tva'], lg_EMPLACEMENT_ID='1', lg_FAMILLE_ID=p['id'],
                                    lg_USER_ID=R.choice(CAISSIERS), typeMvt='01', ug=0,
                                    lg_PREENREGISTREMENT_DETAIL_ID=None))
        stats['bl_lignes'] += 1
    stats['bl'] += 1

for f, _ in FICHIERS.values():
    f.close()

# ------------------------------------------------------------------------------------------------- chargement
ordre = [t for t in TABLES if t in FICHIERS]
charge = 'SET FOREIGN_KEY_CHECKS = 0; SET UNIQUE_CHECKS = 0; SET autocommit = 0;\n'
for t in ordre:
    # colonnes BIT : chargees par une variable puis converties (LOAD DATA y mettrait le code du caractere)
    cols = ', '.join(f'@b_{c}' if c in BITS[t] else f'`{c}`' for c in FICHIERS[t][1])
    conv = ', '.join(f'`{c}` = IF(@b_{c} IS NULL, NULL, CAST(@b_{c} AS UNSIGNED))' for c in FICHIERS[t][1] if c in BITS[t])
    charge += (f"LOAD DATA LOCAL INFILE '{os.path.join(A.dossier, t + '.tsv')}' INTO TABLE `{t}` CHARACTER SET utf8mb4 "
               f"FIELDS TERMINATED BY '\\t' ESCAPED BY '\\\\' LINES TERMINATED BY '\\n' ({cols})"
               + (f" SET {conv}" if conv else '') + ";\nCOMMIT;\n")
charge += 'SET FOREIGN_KEY_CHECKS = 1; SET UNIQUE_CHECKS = 1;\n'
open(os.path.join(A.dossier, 'charger.sql'), 'w').write(charge)
print(json.dumps({k: (round(v) if isinstance(v, float) else v) for k, v in stats.items()}, ensure_ascii=False))
print(f"CA moyen par jour sur 30 jours : {round(stats['ca30'] / 30):,} ; ventes : {stats['ventes']:,} ; "
      f"lignes : {stats['lignes']:,} ; BL : {stats['bl']:,}".replace(',', ' '))
print('Chargement : mariadb --local-infile=1 ' + A.base + ' < ' + os.path.join(A.dossier, 'charger.sql'))
