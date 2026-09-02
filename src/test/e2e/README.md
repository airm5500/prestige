# Tests E2E — deconditionnement des produits detail

Deux tests a executer contre un Payara local avec le WAR deploye, sur une base de TEST
(jamais la production). Ils completent les tests unitaires (`mvn test`) en verifiant le
comportement reel : navigateur pour l'ecran de caisse, requetes paralleles pour la concurrence.

## 1. `ui-caisse-deconditionnement.js` — l'ecran de caisse dans un vrai Chromium

Pilote l'ecran de vente comme une caissiere (formulaire de connexion, combo produit, champ
quantite, popups ExtJS) et verifie :

- **UI-1** : vendre exactement le stock vendable (0 en rayon + 1 boite) est accepte apres le
  popup « Voulez-vous faire un deconditionnement ? » — non-regression du `<` strict qui
  refusait le dernier detail disponible ;
- **UI-2** : une unite au-dela est refusee « Le stock est insuffisant » ;
- **UI-3** (optionnel) : la reprise d'un panier dont la boite a disparu affiche immediatement
  « Stock insuffisant pour ... » (endpoint `controle-detail`).

```sh
npm install playwright-core
BASE=http://localhost:8080/prestige LOGIN=... PASSWORD=... \
CIP=8835833D QTE_VENDABLE=100 [VENTE_UI3=<id vente en cours>] \
node ui-caisse-deconditionnement.js
```

Poser les stocks AVANT : detail a 0, boite parent a 1 (`int_NUMBERDETAIL` = QTE_VENDABLE).
Le produit doit etre trouvable par la recherche caisse (ligne `t_famille_grossiste`).
Pour UI-3 : creer une vente en cours du produit, mettre la boite a 0, passer son id.

Note : la page de connexion exige le fichier de configuration
`.../CONF/LABOREX/CONF/config_laborex_v1.xml` (chemins standards des postes) —
sur un environnement neuf, en creer un minimal avec `APP_NAME`/`APP_VERSION`.

## 2. `concurrence-derniere-boite.sh` — deux caisses se disputent la derniere boite

Deux ventes du meme produit detail, cloturees strictement en parallele alors qu'une seule
tient dans la boite restante. Verifie a chaque tour : jamais de stock negatif, jamais deux
clotures reussies. La protection vient du verrou optimiste `@Version` de `t_famille_stock` :
la perdante recoit une erreur et son retry aboutit a un refus metier clair (ou au succes si
le stock restant suffit).

```sh
BASE=http://localhost:8080/prestige LOGIN=... PASSWORD=... DB=capitale \
DETAIL_ID=... PARENT_ID=... USER_ID=... QTE=60 TOURS=5 \
./concurrence-derniere-boite.sh
```

Prerequis : caisse ouverte pour l'utilisateur (`t_resume_caisse`, statut `is_Using`).
Les ventes creees sont a purger apres le test.

## Resultats de reference (02/09/2026, base capitale)

- Concurrence : 5/5 tours qte=60 -> une seule cloture, stocks 40/0, jamais de negatif ;
  3/3 tours qte=40 -> la perdante du verrou optimiste reussit au retry, stocks 20/0.
- UI : 6/6 assertions (vendable exact accepte, au-dela refuse, avertissement a la reprise).
