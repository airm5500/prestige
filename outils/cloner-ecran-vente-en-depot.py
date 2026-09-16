# -*- coding: utf-8 -*-
"""Duplication mecanique de l'ecran de vente vers l'ecran « vente en depot ».

La consigne de l'officine est de ne PAS toucher a l'ecran de vente qui sert tous les jours.
On duplique donc, et la duplication est faite par ce script pour qu'elle soit fidele et
verifiable : chaque remplacement est compte et affiche.

A QUOI IL SERT AUJOURD'HUI
--------------------------
L'ecran « vente en depot » (xtype doventeendepot) est deja livre. Ce script est la trace de
sa fabrication, et l'outil pour la refaire : quand une correction est portee sur l'ecran de
vente de l'officine et doit etre reportee en depot, relancer ce script depuis la racine du
projet regenere le clone a l'identique -

    python3 outils/cloner-ecran-vente-en-depot.py

ATTENTION : la regeneration ecrase le clone et lui fait donc PERDRE les ajouts propres au
depot (selecteur de depot dans la vue ; depotIdDeVente / exigerDepot /
onDepotVenteSelect / orienterLecturesSurLeDepot / parametreDepot, l'injection de
depotVenteId dans buildSaleParams, le parametre depot des lectures de stock, la remise a
zero du depot et le titre, dans le controleur). Ces ajouts sont tous marques par un
commentaire mentionnant le depot : les reporter apres regeneration, puis relancer
src/test/e2e/retours/test-vente-en-depot.js, qui les verifie un par un.
"""
import io, os, re, sys

BASE = 'src/main/webapp/general/app/view'
CTRL = 'src/main/webapp/general/app/controller'
DEST = BASE + '/vente/endepot'

# xtype de l'ecran
ECRAN_SRC, ECRAN_DST = 'doventemanager', 'doventeendepot'

# Les 8 fenetres modales partagees : le controleur les pilote par des selecteurs NON
# qualifies par l'ecran. Sans clone dedie, un clic dans « nouveau client » declencherait
# le traitement des DEUX controleurs. Chaque fenetre recoit donc son propre xtype.
FENETRES = [
    ('vente/user/AddCarnet.js',           'testextjs.view.vente.user.AddCarnet',           'addCarnetwindow'),
    ('vente/user/addClientAssurance.js',  'testextjs.view.vente.user.addClientAssurance',  'addaddclientwindow'),
    ('vente/user/ClientGrid.js',          'testextjs.view.vente.user.ClientGrid',          'assuranceClient'),
    ('vente/user/AyantDroitGrid.js',      'testextjs.view.vente.user.AyantDroitGrid',      'ayantdroiGrid'),
    ('vente/user/ClientLambda.js',        'testextjs.view.vente.user.ClientLambda',        'clientLambda'),
    ('vente/user/Medecin.js',             'testextjs.view.vente.user.Medecin',             'medecin'),
    ('vente/user/OrdonnanceParcours.js',  'testextjs.view.vente.user.OrdonnanceParcours',  'ordonnanceparcours'),
    ('vente/ReglementGrid.js',            'testextjs.view.vente.ReglementGrid',            'reglementGrid'),
]

def classe_clone(nom):
    # testextjs.view.vente.user.Medecin -> testextjs.view.vente.endepot.Medecin
    court = nom.split('.')[-1]
    return 'testextjs.view.vente.endepot.' + court

def xtype_clone(x):
    return x + 'depot'

def lire(p):
    with io.open(p, encoding='utf-8') as f:
        return f.read()

def ecrire(p, s):
    with io.open(p, 'w', encoding='utf-8') as f:
        f.write(s)

ENTETE = (u"/* ECRAN DUPLIQUE - « vente en depot ».\n"
          u" *\n"
          u" * Copie de %s, orientee « je suis dans le depot ».\n"
          u" * L'officine a demande que l'ecran de vente de tous les jours ne soit pas touche : cet ecran est\n"
          u" * donc une duplication, pas une variante. Consequence a connaitre : une correction portee sur\n"
          u" * %s doit etre reportee ici.\n"
          u" *\n"
          u" * Le xtype est distinct pour que les selecteurs du controleur de l'officine ne rencontrent\n"
          u" * jamais cet ecran, et inversement.\n"
          u" */\n")

rapport = []

# ---------------------------------------------------------------- les 8 fenetres
for rel, cls, xt in FENETRES:
    src = os.path.join(BASE, rel)
    s = lire(src)
    n_cls = s.count("'" + cls + "'")
    s = s.replace("'" + cls + "'", "'" + classe_clone(cls) + "'")
    # xtype : uniquement la declaration de la classe
    motif = "xtype: '" + xt + "'"
    n_xt = s.count(motif)
    s = s.replace(motif, "xtype: '" + xtype_clone(xt) + "'")
    # Auto-references internes (up/down/ComponentQuery sur son propre xtype) : sinon le clone
    # remonterait vers un xtype qu'il ne porte plus et ne trouverait rien.
    n_self = 0
    for forme in ("up('", "down('", "ComponentQuery.query('"):
        n_self += s.count(forme + xt + "'")
        s = s.replace(forme + xt + "'", forme + xtype_clone(xt) + "'")
    if n_self:
        print("      %s : %d auto-reference(s) reorientee(s)" % (xt, n_self))
    dst = os.path.join(DEST, os.path.basename(rel))
    ecrire(dst, ENTETE % (rel, rel) + s)
    rapport.append((os.path.basename(rel), n_cls, n_xt))

print("Fenetres clonees :")
for nom, a, b in rapport:
    print("   %-28s classe:%d xtype:%d" % (nom, a, b))

# ---------------------------------------------------------------- l'ecran
src = os.path.join(BASE, 'vente/VenteView.js')
s = lire(src)
n = s.count(ECRAN_SRC)
s = s.replace(ECRAN_SRC, ECRAN_DST)
s = s.replace(ECRAN_SRC.capitalize(), ECRAN_DST.capitalize())
n_cls = s.count("'testextjs.view.vente.VenteView'")
s = s.replace("'testextjs.view.vente.VenteView'", "'testextjs.view.vente.endepot.VenteEnDepotView'")
s = s.replace(u"title: 'VENTE AU COMPTANT'", u"title: 'VENTE EN DEPÔT'")
# Le titre est pose DEUX fois : en config de classe, et reecrit dans initComponent.
s = s.replace(u"me.title = 'VENTE AU COMPTANT';",
              u"me.title = 'VENTE EN D\u00c9P\u00d4T \u2013 VENTE AU COMPTANT';")
ecrire(os.path.join(DEST, 'VenteEnDepotView.js'), ENTETE % ('vente/VenteView.js', 'vente/VenteView.js') + s)
print("\nEcran clone : VenteEnDepotView.js  xtype:%d classe:%d" % (n, n_cls))

# ---------------------------------------------------------------- le controleur
src = os.path.join(CTRL, 'VenteCtr.js')
s = lire(src)
n_ecran = s.count(ECRAN_SRC)
s = s.replace(ECRAN_SRC, ECRAN_DST)
# Forme capitalisee : le getter engendre par « ref: 'doventemanager' » s'appelle
# getDoventemanager(). Sans cette ligne, le ref est renomme mais pas ses appels.
n_maj = s.count(ECRAN_SRC.capitalize())
s = s.replace(ECRAN_SRC.capitalize(), ECRAN_DST.capitalize())
n_cls = s.count("'testextjs.controller.VenteCtr'")
s = s.replace("'testextjs.controller.VenteCtr'", "'testextjs.controller.VenteEnDepotCtr'")
s = s.replace("'testextjs.view.vente.VenteView'", "'testextjs.view.vente.endepot.VenteEnDepotView'")

# Les classes des 8 fenetres clonees
total_cls = 0
for rel, cls, xt in FENETRES:
    c = s.count("'" + cls + "'")
    total_cls += c
    s = s.replace("'" + cls + "'", "'" + classe_clone(cls) + "'")

# Les selecteurs des 8 fenetres : uniquement en TETE de chaine de selection, c'est-a-dire
# juste apres la quote ouvrante. On ne touche donc jamais a un itemId, un champ ni une
# variable qui porterait le meme nom (« medecin » est aussi un mot du domaine).
total_sel = 0
for rel, cls, xt in FENETRES:
    motif = re.compile(r"'" + re.escape(xt) + r"(?=[ '\[#])")
    total_sel += len(motif.findall(s))
    s = motif.sub("'" + xtype_clone(xt), s)

ecrire(os.path.join(CTRL, 'VenteEnDepotCtr.js'), ENTETE % ('controller/VenteCtr.js', 'controller/VenteCtr.js') + s)
print("Controleur clone : VenteEnDepotCtr.js  xtype ecran:%d (dont %d getters capitalises) classe:%d classes fenetres:%d selecteurs fenetres:%d"
      % (n_ecran, n_maj, n_cls, total_cls, total_sel))
