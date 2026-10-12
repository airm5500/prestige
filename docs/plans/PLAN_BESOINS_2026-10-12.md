# Plan — besoins du 11/10/2026 (15 points)

Règles : aucune régression ; nouveaux écrans en REST (pas de JSP) ; aucune fenêtre surgissante pour les éditions ;
chaque nouvel écran ajouté à `correctifs-affichage.js` ; libellé de menu court (25 caractères au plus) ; un droit
par écran, revérifié côté serveur ; tests par le vrai chemin de l'écran, données d'essai retirées.

## Constats dans le code (base du plan)

| Point | Existant | Écart |
| --- | --- | --- |
| 1 Campagnes | Rappels traitement (`rappelstraitement`, REST `v1/rappels-habitude`), envoi SMS (Orange / LeTexto) et WhatsApp, modèles de messages, `t_client.dt_NAISSANCE` | pas de menu Campagnes, ni anniversaire ni fête |
| 2 Périmés | `saisieperime` (liste, Excel, CSV), données dans `t_warehouse`, zone via `t_famille.lg_ZONE_GEO_ID` | pas d'onglet Analyse |
| 3 Client différé | modif. client après vente dans Ventes terminées seulement si conditions ; nom recopié dans `t_preenregistrement` | pas de correction du nom (MOUSSA → INOUSSA) pendant/après un différé ; défaut vu : `update-vno-client` met l'adresse dans le téléphone |
| 4 Cachet | modèle de facture dynamique : texte fixe « LE PHARMACIEN » en bas | pas d'image cachet/signature |
| 5 Gestion caisse | onglet Liste : du jour – 1 mois au jour | à mettre : le jour |
| 6 Audit | Centre de support : 21 contrôles SQL (`t_support_controle`) | rien sur billetage, solde différé, carnet dépôt ; pas de rapport historisé ni de régularisation validée |
| 7 Réconciliation BL | recherche `v1/vente/search` limitée aux produits actifs ; réactivation existe (`v1/produit/enable-desactives/{id}`) | case « rechercher dans les désactivés » |
| 8 Menus | le libellé affiché est `str_DESCRIPTION` ; des renommages ont modifié `str_VALUE` (infobulle) | 9 libellés longs encore affichés |
| 9 Serveur | surveillance existante (pool, threads, heap, disque, watchdog, preflight) ; pas de réglages Payara dans le dépôt | recommandations selon la machine, suivi, cause des arrêts |
| 10 Set Valorisation | valorisation (4 modes, PDF Jasper externe, Excel), import Excel générique (`FichierTabulaire`) | menu réservé, valorisation libre ou ajustée à une valeur cible |
| 11 Pilotage | 10 onglets, tuiles, graphiques ExtJS, comparateur avec croisement HEURE | pastille onglet actif, icônes, onglets déplaçables, KPI, sélecteurs de graphe, onglet À suivre, KPI enregistrés, bande/courbe, tranche horaire |
| 12 Fréquentation | écran ancien en JSP, 10 tranches figées, infobulles tronquées | REST, tranche au choix, % du CA, correctifs-affichage |
| 13 Produits | `produitsxx` sans onglets ; sélecteur de période commun (`RaccourcisPeriode`) | onglet Analyse ventes/CA/marge par jour, semaine, mois, année ; 3 nouvelles périodes |
| 14 Prévisions | 3 onglets, journal de stock par produit (`articlemvt`) | onglet « Analyse de la demande » saisonnière |
| 15 Inventaire | par famille / zone / grossiste, intervalle de CODES | intervalle de lettres du nom dans un emplacement |

## Lots

- **Lot 1 (sans décision, en cours)** : 5 caisse du jour ; 7 désactivés en réconciliation BL ; 8 libellés de menus ;
  12 fréquentation horaire ; 15 inventaire partiel par lettres ; 13 périodes ajoutées au sélecteur commun ;
  correction du téléphone remplacé par l'adresse (3).
- **Lot 2 (sans décision)** : 2 analyse des périmés ; 3 correction du nom du client d'un différé ; 13 onglet Analyse
  produits ; 14 analyse de la demande ; 11 Pilotage (hors rentabilité nette).
- **Lot 3** : 6 Audit & rapprochements — analyse en lecture seule, rapport historisé, régularisations proposées et
  validées une par une (droit dédié, journal).
- **Lot 4 (après réponses)** : 1 Campagnes ; 4 cachet ; 10 Set Valorisation ; 11 rentabilité nette ; 9 réglages
  serveur recommandés.

Chaque lot : tests serveur + test de bout en bout par l'écran, commit et push par point.

## Décisions (12/10)

- **Fête** (campagnes) : fêtes du calendrier (nationales et religieuses), dates paramétrables.
- **Cachet** : image cachet/signature sur les factures et récaps du créateur de modèles, à la place du texte
  « LE PHARMACIEN » (image commune, ou propre au modèle).
- **Set Valorisation** : droit dédié, donné à personne par défaut ; valeur cible atteinte en ajustant les quantités
  proportionnellement ; rien n'est écrit dans le stock.
- **Rentabilité nette** : écran de saisie des charges mensuelles ; résultat net = marge brute − charges.
