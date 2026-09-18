# -*- coding: utf-8 -*-
"""Pictogrammes des modes de reglement qui n'en avaient pas.

Cinq operateurs mobile money ont leur logo (DJAMO, MOOV, MTN, ORANGE, WAVE) ;
les autres modes apparaissaient sans rien, et la liste etait batarde. Demande du
18/09 : « peux tu trouver des icones pour les autres modes de paiement de vente
pour que ce soit harmonise ? »

Ce ne sont pas des logos de marque : ce sont des PICTOGRAMMES dessines, un par
mode, dans le meme format que les logos existants (128x128 RGBA, pastille ronde)
pour que la liste soit homogene. Un logo de marque ne se dessine pas de memoire,
et pour CELPAID ou TRESORPAY il n'y en a aucun de disponible - une pastille
neutre est honnete, un faux logo ne l'est pas.

Le mecanisme de l'ecran de vente n'est pas touche : il cherche
resources/images/modes/<NOM>.png ou NOM est le libelle du mode en majuscules
sans caractere special. Il suffit donc de deposer les fichiers.
"""
from PIL import Image, ImageDraw

TAILLE = 128
ECH = 4  # dessin en 4x puis reduction : c'est ce qui donne les bords lisses


def pastille(couleur):
    img = Image.new('RGBA', (TAILLE * ECH, TAILLE * ECH), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse([0, 0, TAILLE * ECH - 1, TAILLE * ECH - 1], fill=couleur)
    return img, d


def finir(img, nom):
    img.resize((TAILLE, TAILLE), Image.LANCZOS).save(nom + '.png')


def e(v):
    """Coordonnee du dessin 128 vers l'echelle de travail."""
    return int(v * ECH)


BLANC = (255, 255, 255, 255)


def especes():
    """Billet vu de face, avec sa piece : le paiement en liquide."""
    img, d = pastille((30, 122, 60, 255))
    d.rounded_rectangle([e(24), e(44), e(104), e(88)], radius=e(6), fill=BLANC)
    d.ellipse([e(52), e(52), e(76), e(80)], outline=(30, 122, 60, 255), width=e(4))
    d.line([e(64), e(56), e(64), e(76)], fill=(30, 122, 60, 255), width=e(3))
    finir(img, 'ESPECES')


def carte_bancaire():
    """Carte avec sa bande magnetique et sa puce."""
    img, d = pastille((31, 78, 121, 255))
    d.rounded_rectangle([e(22), e(42), e(106), e(90)], radius=e(7), fill=BLANC)
    d.rectangle([e(22), e(54), e(106), e(64)], fill=(31, 78, 121, 255))
    d.rounded_rectangle([e(32), e(72), e(50), e(83)], radius=e(2), fill=(31, 78, 121, 255))
    d.line([e(60), e(78), e(96), e(78)], fill=(31, 78, 121, 255), width=e(4))
    finir(img, 'CARTEBANCAIRE')


def cheques():
    """Feuille de cheque : lignes d'ecriture et signature."""
    img, d = pastille((13, 124, 122, 255))
    d.rounded_rectangle([e(24), e(38), e(104), e(92)], radius=e(5), fill=BLANC)
    for y in (52, 64):
        d.line([e(34), e(y), e(94), e(y)], fill=(13, 124, 122, 255), width=e(4))
    # la signature, en trait libre : c'est ce qui distingue un cheque d'un billet
    d.line([e(38), e(80), e(52), e(72)], fill=(13, 124, 122, 255), width=e(4))
    d.line([e(52), e(72), e(64), e(82)], fill=(13, 124, 122, 255), width=e(4))
    d.line([e(64), e(82), e(80), e(70)], fill=(13, 124, 122, 255), width=e(4))
    finir(img, 'CHEQUES')


def virement():
    """Deux comptes et une fleche : l'argent passe de l'un a l'autre."""
    img, d = pastille((67, 56, 145, 255))
    d.ellipse([e(22), e(52), e(46), e(76)], fill=BLANC)
    d.ellipse([e(82), e(52), e(106), e(76)], fill=BLANC)
    d.line([e(48), e(64), e(80), e(64)], fill=BLANC, width=e(5))
    d.polygon([(e(78), e(56)), (e(92), e(64)), (e(78), e(72))], fill=BLANC)
    finir(img, 'VIREMENT')


def differe():
    """Horloge : le reglement est repousse a plus tard."""
    img, d = pastille((176, 122, 12, 255))
    d.ellipse([e(30), e(30), e(98), e(98)], outline=BLANC, width=e(6))
    d.line([e(64), e(64), e(64), e(44)], fill=BLANC, width=e(6))
    d.line([e(64), e(64), e(82), e(72)], fill=BLANC, width=e(6))
    finir(img, 'DIFFERE')


def devise():
    """Globe et signe monetaire : un reglement en monnaie etrangere."""
    img, d = pastille((122, 84, 44, 255))
    d.ellipse([e(30), e(30), e(98), e(98)], outline=BLANC, width=e(5))
    d.line([e(30), e(64), e(98), e(64)], fill=BLANC, width=e(4))
    d.ellipse([e(52), e(30), e(76), e(98)], outline=BLANC, width=e(4))
    finir(img, 'DEVISE')


def mobile_neutre(nom, couleur):
    """Telephone et piece : mode mobile money dont nous n'avons pas le logo.

    Volontairement NEUTRE et identique pour tous ces modes : inventer un logo
    pour la marque de quelqu'un d'autre serait une contrefacon approximative.
    """
    img, d = pastille(couleur)
    d.rounded_rectangle([e(42), e(26), e(86), e(102)], radius=e(7), fill=BLANC)
    d.rounded_rectangle([e(48), e(36), e(80), e(82)], radius=e(3), fill=couleur)
    d.ellipse([e(56), e(86), e(72), e(98)], outline=couleur, width=e(3))
    finir(img, nom)


especes()
carte_bancaire()
cheques()
virement()
differe()
devise()
mobile_neutre('CELPAID', (52, 73, 94, 255))
mobile_neutre('TRESORPAY', (86, 101, 115, 255))
print('pictogrammes produits')
