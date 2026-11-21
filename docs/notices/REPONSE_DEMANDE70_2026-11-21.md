# Réponse à la demande 70 : textes trop fins sur l'image du ticket en 58 mm (21/11/2026)

**De** : l'équipe du serveur Prestige.
**Pour** : Prestige Mobile V3 5.4.0 et PrestigePOS 1.17.0.
**Code** : branche `correctif/demande70-2111`, à partir de l'intégration `4afc885b4`. Elle n'est pas encore fusionnée,
ni livrée en officine.

Merci pour la mesure : elle est exacte. Sur l'image d'une vente assurance à deux organismes du banc d'essai, 33 % des
traits des textes faisaient un seul point d'imprimante en 58 mm, contre 2 % en 80 mm. Nous avons bien noté que la
demande 69 n'est pas émise.

## Ce qui change

Dans l'image du ticket seulement (`RenduTicket.dessinerImage`, routes `…/ticket/{type}/{id}/image`), en 58 mm :

- chaque texte non gras est dessiné une seconde fois, décalé d'un point d'imprimante vers la droite. C'est la deuxième
  solution proposée : ses traits font au moins deux points ;
- la mise en page ne change pas : mêmes lignes, même hauteur d'image, largeur exacte 384 points à 203 dpi. Le texte
  s'élargit d'un seul point, que le bord de l'image garde déjà ;
- tout reste en noir sur fond blanc ;
- le code-barres, le QR et les textes gras ne changent pas ;
- le 80 mm, l'aperçu du web et l'impression du poste ne changent pas.

La taille (8 points) et la police restent celles du modèle : passer à 9 points ou à une police plus large aurait
changé les retours à la ligne et la longueur du ticket.

Le renforcement de l'application ne gêne pas : sur ces traits déjà doublés, il ne trouve plus guère de traits d'un
point à doubler.

## Mesures (banc, vente assurance MUGEFCI 80 % + AGEMAS 20 %, 203 dpi, seuil 128)

| Image | Traits d'un seul point, avant | Après |
|---|---|---|
| 58 mm (384 × 1 077 points) | 33,1 % | 0,7 % |
| 80 mm (576 × 1 021 points) | 1,7 % | 1,7 % (identique) |

Sur les tickets d'exemple de chaque modèle en 58 mm, la part allait de 15 % (ticket Z) à 32 % (vente assurance). Après
le correctif, elle est sous 15 % pour tous.

## Tests

Chaque nouveau test a d'abord échoué sur l'ancien code.

- **`ImageTraitsEpaisTest`** (unitaire, chaque modèle de ticket) :
  - en 58 mm à 203 dpi, moins de 15 % des traits des textes font un seul point (code-barres et QR écartés) ;
  - en 58 et 80 mm, à 180, 203 et 300 dpi, le nouveau dessin ne fait que noircir : aucun point noir de l'ancien dessin
    ne disparaît, et l'image garde la même taille ;
  - le code-barres et le QR du pied sont identiques, point par point ;
  - le 80 mm est identique, point par point.
- **Tests des tickets** : les 125 tests passent, dont `ImageImprimanteCoherenceTest` (rien n'est coupé, sur chaque
  modèle et à des résolutions tirées au hasard).
- **Test d'écran `test-demande70-2111.js`**, par la route de l'application avec une vraie session, en lecture seule
  sur une vraie vente du banc :
  - 58 mm : PNG de 384 points, dimensions annoncées égales à celles du PNG, code-barres présent, 0,7 % de traits d'un
    point (33,1 % sur l'ancien code, où le contrôle échoue) ;
  - 80 mm : PNG de 576 points, part inchangée ;
  - rapprochement : le texte des mêmes tickets porte les deux organismes, et le taux du principal est celui de la
    base ;
  - prévente en 58 mm : le QR est toujours retrouvé ;
  - bilan : lire les images n'écrit rien.
- **Non-régression** : `test-demande63-1911.js` (images) 36/36, `test-demande66-2011.js` 29/29.

## Limites

- Le code-barres n'est pas décodé par un lecteur de codes : le test vérifie qu'il est identique, point par point, à
  celui de l'ancien code, qui était lu.
- Le résultat sur papier reste à confirmer sur un SUNMI V3.
