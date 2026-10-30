/* Metro de Prestige (choix du 25/10) : icones (Lucide, licence ISC) et couleurs.
 *  - ECRANS : icone de chaque sous-menu, par composant (t_sous_menu.str_COMPOSANT) ;
 *  - MENUS : icone de chaque menu, par libelle en majuscules (t_menu.str_DESCRIPTION) ;
 *  - COULEURS : une couleur par menu ;
 *  - FAMILLES : groupes des sous-menus, d'apres les mots de leur libelle (la premiere regle qui convient l'emporte).
 * Un sous-menu ajoute plus tard sans icone ici prend celle de sa famille (voir PrestigeMetro.sansIcone()).
 */
window.PrestigeMetroIcones = {
  ECRANS: {
    // ecrans propres a certaines officines (menus anciens restes actifs dans leur base)
    "diffmanager": "hourglass", // Liste des Différés Client
    "managementreport": "chart-bar-stacked", // Rapport de Gestion 2
    "RapportGestions": "chart-column-big", // Rapport de Gestion
    "statistiqueTVA": "receipt-euro", // Statistiques sur TVA
    "ventecaissemanager": "scale-3d", // Balance Vente/Caisse
    "journalventemanager": "book-text", // Journal Vente
    "venteugs": "gift", // Ventes unités gratuites
    "ouverturecaisseempmanager": "coins", // Fonds de caisse
    "ventehistoriquedepotmanager": "package-open", // Liste des ventes dépots
    "ouverturecaissemanger": "lock-open", // Ouverture de Caisse
    "preenregistrementmanager": "clipboard-pen", // Pre-vente
    "cloturerventemanager": "shopping-cart", // Ventes
    "ventedepot": "store", // Vente dépôt
    "ventemanager": "receipt-text", // Vente terminées
    "pososmanager": "stethoscope", // Analyse Posologie
    "caissemanger": "lock", // Cloture de Caisse
    "venteannuler": "circle-slash", // Liste des ventes annulées
    "devismanager": "file-pen", // Proforma
    "modelemessagemanager": "message-square-text", // Modèles de messages
    "ventesrateesmanager": "search-x", // Ventes ratées
    "rappelshabitude": "alarm-clock", // Rappels traitement
    "venteavoirmanager": "undo-2", // Liste des avoirs
    "ordonnanceclient": "folder-heart", // Suivi dossier client
    "ordonnancier": "notebook-pen", // Ordonnancier
    "fideliteclients": "award", // Points fidélité
    "ventemanagerbis": "file-warning", // Ventes sans n° de bon
    "vendeurcaissiermanager": "contact-round", // Vendeurs et caissiers
    "corbeillevente": "trash-2", // Corbeille des ventes
    "suppressionsvente": "log-out", // Retraits et abandons
    "ticketzmanager": "ticket", // Ticket Z
    "facturesubrogatoireother": "building-2", // Bons par organisme
    "mvtcaissemanager": "arrow-left-right", // Mouvements de Caisse
    "visualisercaissemanager": "monitor", // Visualiser la caisse
    "gestcaissemanager": "wallet", // Gestion Caisse
    "listecaissemanager": "list", // Liste de Caisse
    "mvtcaissebismanager": "arrow-down-up", // Liste des mouvements
    "pointcaisseview": "map-pin-check", // Point Caisse Depot
    "balancesalecashdepot": "scale", // Balance Depot
    "balancesalecahs": "scale-3d", // Balance Vente/Caisse
    "cashmovements": "arrow-down-up", // Liste des mouvements
    "balancepara": "leaf", // Balance para
    "facturesubrogatoire": "files", // Liste des bons
    "articlevendurecapitulatif": "list-checks", // Articles vendus récap
    "caisserecetterecap": "calculator", // Caisse/recette
    "articlevendumanager": "shopping-basket", // Liste des articles vendus
    "mouvementprixvente": "eye", // Mouchard prix de vente
    "delayed": "hourglass", // Gestion des différés
    "facturemanager": "file-text", // Factures
    "reglementmanager": "credit-card", // Liste des Reglements
    "factureenattenteedition": "folder-clock", // Dossiers à facturer
    "recapOrganisme": "chart-pie", // Récap par organisme
    "groupeInvoices": "shield-check", // Factures Compagnies Ass
    "factureprovisoire": "file-clock", // Factures provisoires
    "modelfacture": "file-cog", // Modèle de facture
    "tpventes": "file-search", // Suivi des bons
    "modelfacturedynamique": "layout-template", // Modèles de facture
    "balanceagee_detail": "calendar-range", // Balance agée détaillée
    "balanceagee": "calendar-clock", // Balance âgée récap
    "clientdesactive": "user-x", // Clients désactivés
    "litige": "gavel", // Gestion des litiges
    "tierspayantdesactive": "shield-off", // Tiers payants désactivés
    "groupetierspayant": "network", // Groupe et Compagnie d'Ass
    "emplacement": "warehouse", // Emplacements/Depot
    "dossiertierspayantmanager": "folder-open", // Dossiers Tiers-payants
    "typetierspayantmanager": "tags", // Type tiers-payants
    "grilleremisemanager": "table-2", // Grille de Remise
    "tauxrembourssementmanager": "badge-percent", // Taux Rembourssement
    "tierspayantmanager": "shield", // Tiers-payants
    "remisemanager": "percent", // Remises
    "regimecaissemanager": "landmark", // Regimes Caisse
    "clientmanager": "users", // Clients
    "company": "building", // Societes
    "tpexclus": "shield-x", // Tiers-payants exclus
    "tierspExclus": "filter-x", // Gerer les tp a exclure
    "balancesalecahsCarnet": "book-open", // Balance carnet
    "tierpayantasdepot": "book-down", // Depot carnet
    "retourcarnetdepot": "book-up", // Retour carnet dépôt
    "reglementdepot": "book-marked", // Gestion carnet dépôt
    "cautiontierspayant": "hand-coins", // Cautions
    "depotextension": "git-branch-plus", // Gestion depots extensions
    "categorymanager": "user-cog", // Catégorie Client
    "ventesmodifieesmanager": "file-diff", // Ventes modifiées
    "SurStock": "package-plus", // Articles en sur-stock
    "logfile": "scroll-text", // Fichier Journal
    "gestionsurstock": "layers", // Gestion des surstocks
    "promotionhistorymanager": "history", // Historique des Promotions
    "promotionmanager": "megaphone", // Promotions
    "i_sugg_manager": "lightbulb", // Suggestion de reappro.
    "analysecommande": "trending-up", // Prévisions
    "i_order_manager": "shopping-cart", // Commande en cours
    "familleorder": "send", // Proposition Commande
    "commandemanager": "circle-check-big", // Validation Commande
    "peremptionscourtes": "timer", // Péremptions courtes
    "traitementcommandemanager": "cog", // Traitement Commande
    "warehouseorder": "repeat", // Transaction Commande
    "bonlivraisonmanager": "package-check", // Gestion des entrées
    "registerordermanager": "save", // Enregistrement Commande
    "rupturepharma": "package-x", // Liste des ruptures
    "historiquemanager": "history", // Historique
    "pointagebl": "list-todo", // Pointer BL et avoirs
    "etatscontrolemanager": "clipboard-check", // Etat de contrôle Achats
    "clientaccountmanager": "user-round-check", // Compte Client
    "retourfrsmanager": "truck", // Retour fournisseur
    "ugmanager": "gift", // Unites Gratuites
    "evaluationoffreprixmanager": "tag", // Offres de prix
    "LotStockManager": "barcode", // Liste des Lots
    "etatannuel": "calendar-check", // Etat de control annuel
    "achatgrossistemensuel": "calendar-days", // Achats mensuels grossiste
    "detailsmanager": "info", // Détails
    "produitsxx": "pill", // Produits
    "famillemanager": "file-box", // Fiche Article
    "doublons": "copy", // Gestion des doublons
    "retourdepot": "package-minus", // Retour dépot
    "zonegeographiquemanager": "map-pin", // Emplacement
    "produitscodegeo": "map", // Produits par code géo
    "familledisablemanager": "eye-off", // Liste Articles Désactivés
    "suivientreevente": "shuffle", // Suivi mouvement article
    "monitoringproduct": "route", // Suivi mouvement article2
    "detailentreesortie": "arrow-up-down", // Entrées / sorties détail
    "evaluationventemoyenne": "thumbs-up", // Evaluation des ventes
    "venteproduitmanager": "chart-column", // Vente Par Produit
    "articlemvtgrid": "move", // Articles Mouvementés
    "suivistockvente": "chart-area", // Suivi du stock et ventes
    "stockmort": "package-search", // Articles invendus
    "gammeproduits": "layout-grid", // Gamme produits
    "etatstock": "boxes", // Etat de stock
    "laboratoireproduits": "flask-conical", // Laboratoire produits
    "venteproduitannules": "circle-x", // Annulés en inventaire
    "importationgp": "refresh-cw", // Mise à jour produits
    "inventaire": "clipboard-list", // Travaux d'Inventaire
    "famillestockcomparaisonmanager": "git-compare", // Comparaison stock article
    "ajustementmanager": "sliders-horizontal", // Ajustement du Stock
    "statproductsell": "chart-bar-big", // Ventes par produit
    "saisieperime": "calendar-plus", // Saisie des périmés
    "perime": "calendar-x", // Gestion des périmés
    "perimeremovetostock": "calendar-minus", // Périmés rétirés du stock
    "peremptionquery": "calendar-search", // Recherche périmés
    "etiquetagepro": "printer", // Étiquettage Pro
    "etiquette": "tags", // Gestion étiquette
    "reservemanager": "warehouse", // Gestion des réserves
    "valorisationstock": "banknote", // Valorisation du stock
    "codegestionmanager": "hash", // Gerer Code Gestion
    "optimisationquantitemanager": "gauge", // Optimisation quantite
    "articlevendu": "shopping-basket", // Liste Article Vendus
    "monitoringarticlecomplet": "scan-search", // Suivi article complet
    "evolutionstock": "chart-line", // Evolution Stock
    "setvalorisation": "calculator", // Set valorisation
    "kobysky": "menu", // Menu personnel
    "info_officine": "hospital", // Identification Pharmacie
    "parametermanager": "settings", // Paramétrage général
    "devisemanager": "euro", // Gestion des devises
    "modereglementview": "credit-card", // Mode de règlements
    "tranchemanager": "list-ordered", // Gerer Tranche
    "villemanager": "map-pinned", // Gerer Ville
    "motifretourmanager": "undo", // Gerer Motif Retour
    "contreindicationmanager": "triangle-alert", // Gerer Contre Indication
    "typerisquemanager": "zap", // Gerer Type Risque
    "fichesocietemanager": "building", // Gerer Fiche Societe
    "medecinmanager": "stethoscope", // Gerer medecin
    "typeremisemanager": "ticket-percent", // Gerer Type Remise
    "ayantdroitmanager": "user-plus", // Gerer Ayant Droit
    "groupefamillemanager": "group", // Groupe famille
    "risquemanager": "shield-alert", // Gerer Risques
    "specialitemanager": "heart-pulse", // Gerer Specialite Medecin
    "famillearticlemanager": "folder-tree", // Gerer Famille
    "centrepayeurmanager": "landmark", // Gerer Centre Payeur
    "escomptesocietemanager": "percent", // Gerer Escompte Societe
    "categorieayantdroitmanager": "users-round", // Catégories ayants droit
    "etatarticlemanager": "toggle-right", // Gerer Etat Article
    "dcimanager": "atom", // Gerer les DCI
    "typesocietemanager": "briefcase", // Gerer Type Societe
    "formearticlemanager": "tablets", // Gerer Forme Article
    "workflowremisearticlemanager": "workflow", // Gerer workflow remise
    "groupegrossistes": "container", // Groupe grossistes
    "motifreglement": "message-square", // Motifs règlément
    "grossistemanager": "truck", // Gerer Grossistes
    "fabriquantmanager": "factory", // Gerer Fabricant
    "smsfournisseur": "smartphone", // Fournisseurs SMS
    "confreremanager": "handshake", // Gestion des confrères
    "retrocessionmanager": "arrow-right-left", // Retrocession
    "pilotage": "gauge", // Pilotage de l'officine
    "statfamilleartcl": "folder-tree", // Statistique famille
    "recap": "file-chart-column", // Rapport activité
    "compteExploitation": "calculator", // Compte d'exploitation
    "vingtquatrevingt": "chart-pie", // Chiffre d'Affaires 20/80
    "analysetierspayant": "shield-check", // Analyse tiers payants
    "statistiqueventemanager": "chart-column-big", // Statistiques des ventes
    "activiteequipes": "users", // Activité des équipes
    "facturepaidmanager": "receipt-text", // Facture Reglee
    "statistiquefamillearticlemanager": "chart-bar-stacked", // Stats famille article
    "journalmanager": "book-text", // Journal
    "RuptureStockManager": "package-x", // Ruptures de stock
    "comparaisonChiffreAffaireManager": "git-compare-arrows", // Comparaison CA familles
    "tableauPhama": "layout-dashboard", // Tableau de bord
    "statActiviteOperateurManager": "user-cog", // Activité opérateurs
    "analyseFrequentationOffManager": "footprints", // Fréquentation officine
    "statistiqueuniteventemanager": "hash", // Unités vendues
    "tableauPhamaCarnet": "book-open-check", // Tableau de bord carnet
    "recaptableaupharma": "clipboard-plus", // Tableau pharmacien
    "reportdynamiquemanager": "boxes", // Stock Par Produit
    "margeproducts": "trending-up", // Marge sur produits
    "journalrecettemanager": "notebook-tabs", // Journal Recette
    "statistiqueProvider": "truck", // CA par grossiste
    "statislaboratoireproduits": "flask-conical", // Stats produits / labo
    "statisgammeproduits": "layout-grid", // Stats produits / gamme
    "cazonegeomanager": "map", // CA emplacement / famille
    "statistiqueRayons": "map-pin", // CA par emplacement
    "suiviremise": "badge-percent", // Suivi remise
    "achatannuel": "calendar", // Achats annuels
    "caannuel": "chart-spline", // STATISTIQUE ANNUEL CA
    "orderstatscmp": "shopping-bag", // Statistique des achats
    "activitiessummary": "clipboard-list", // Récapitulatif activité
    "tvastat": "receipt-euro", // Statistique sur TVA
    "analyseventemanager": "scale", // Vente / stock famille
    "venteavoirclientkmanager": "user-round", // Ventes mensuelles client
    "achatproduitManager": "calendar-days", // Achats Mensuels Produits
    "ventesocieteManager": "building", // Ventes mensuelles société
    "achatfourManager": "building-2", // Achats fournisseurs
    "RetrocessionsManager": "arrow-right-left", // Rétrocessions
    "analysearticle": "search", // Analyse article
    "gardemanager": "moon-star", // Gestion des gardes
    "abcmanager": "arrow-down-a-z", // Classification ABC
    "feuilledematch": "trophy", // Feuille de match
    "alerteventmanager": "bell-dot", // Model Notification
    "outboudmessagemanager": "message-circle", // Gestion des Sms
    "smsRecap": "send-horizontal", // Envoi de SMS RECAP
    "categorieNotification": "folder", // Catégorie notification
    "menunotification": "bell", // Menu notifications
    "myaccountmanager": "circle-user-round", // Mon compte
    "usermanager": "users", // Utilisateurs
    "privilegemanager": "key-round", // Privileges
    "rolemanager": "id-card", // Gestion de profils
    "languagemanager": "languages", // Langues
    "basic-panels3": "power", // Deconnexion
    "tablemanager": "table", // Table
    "modulemanager": "puzzle", // Module
    "productitemmanager": "box", // Produit
    "menumanager": "menu", // Menu
    "sousmenumanager": "list-tree", // Sous-menu
    "tvamanager": "percent", // Tva
    "typedepensemanager": "circle-arrow-up", // Type Depense
    "typerecettemanager": "circle-arrow-down", // Type Recette
    "typecontenancemanager": "beaker", // Type Contenance
    "produitcontenancemanager": "package", // Produit Par Contenance
    "campagnes": "megaphone", // Campagnes
    "whatsappcomptes": "smartphone", // Comptes WhatsApp
    "whatsappdiscussions": "messages-square", // Discussions WhatsApp
    "rhmanager": "id-card", // Ressources humaines
    "avisclients": "star", // Avis clients
    "notification": "mail", // Email
    "supportcontact": "phone", // Me contacter
    "supporttickets": "life-buoy", // Tickets support
    "supportdiagnostic": "bug", // Diagnostic & bugs
    "supportserveur": "server", // Stabilité du serveur
    "supportsante": "activity", // Santé application
    "supporthistorique": "history", // Historique
    "supportmaintenance": "wrench", // Maintenance
    "auditrapprochements": "file-check" // Audit & rapprochements
  },
  MENUS: {
    "SERVICE CLIENT": "shopping-bag",
    "GESTION COURANTE": "wallet",
    "FACTURATION": "file-text",
    "GESTION DES TIERS-PAYANTS": "shield-plus",
    "MENU PHARMACIEN": "briefcase-medical",
    "GESTION DES PROMOTIONS": "megaphone",
    "GESTION DES COMMANDES": "truck",
    "GESTION DU STOCK": "package",
    "PARAMETRAGES": "sliders-horizontal",
    "RETROCESSION": "arrow-right-left",
    "ANALYSE DE GESTION": "chart-pie",
    "NOTIFICATIONS": "bell",
    "GESTION DES UTILISATEURS": "users",
    "CONFIGURATION": "settings",
    "CAMPAGNES SMS / WHATSAPP": "megaphone",
    "RESSOURCES HUMAINES": "id-card",
    "AVIS CLIENTS": "star",
    "GESTION CLIENT": "mail",
    "CENTRE DE SUPPORT": "life-buoy"
  },
  COULEURS: {
    "SERVICE CLIENT": "#0063B1",
    "GESTION COURANTE": "#107C10",
    "FACTURATION": "#C43E1C",
    "GESTION DES TIERS-PAYANTS": "#5C2D91",
    "MENU PHARMACIEN": "#00827F",
    "GESTION DES PROMOTIONS": "#B05E00",
    "GESTION DES COMMANDES": "#2D6FD0",
    "GESTION DU STOCK": "#1E7145",
    "PARAMETRAGES": "#7E3878",
    "RETROCESSION": "#B91D47",
    "ANALYSE DE GESTION": "#2B5797",
    "NOTIFICATIONS": "#B4135F",
    "GESTION DES UTILISATEURS": "#8E2C9E",
    "CONFIGURATION": "#4C5866",
    "CAMPAGNES SMS / WHATSAPP": "#0E7A6C",
    "RESSOURCES HUMAINES": "#8B4513",
    "AVIS CLIENTS": "#C21807",
    "GESTION CLIENT": "#B7480B",
    "CENTRE DE SUPPORT": "#0277BD"
  },
  /* couleurs de secours pour un menu absent de COULEURS */
  PALETTE: ["#0063B1", "#C43E1C", "#107C10", "#5C2D91", "#00827F", "#B4135F", "#B05E00", "#2B5797"],
  FAMILLES: [
    ["Caisse", "#107C10", "coins", /caisse|recette|fonds|ticket z|billet/i],
    ["Statistiques de vente", "#2B5797", "chart-column", /vente.*produit|evaluation des ventes|articles? vendus|statistique des ventes|ventes mensuelles|vente \/ stock/i],
    ["Périmés", "#C21807", "calendar-x", /périm|perim/i],
    ["Inventaire", "#5C2D91", "clipboard-list", /inventaire|ajustement/i],
    ["Étiquettes", "#B05E00", "tags", /étiquet|etiquet/i],
    ["Mouvements", "#0063B1", "arrow-left-right", /mouvement|entrées \/ sorties|evolution stock|suivi article|suivi du stock/i],
    ["Valorisation et réserves", "#7E3878", "banknote", /valorisation|etat de stock|comparaison stock|optimisation|réserve|reserve|code gestion|stock par produit|surstock|sur-stock/i],
    ["Produits", "#00827F", "pill", /produit|article|doublon|emplacement|gamme|laboratoire|détails|details|retour dépot|retour depot|code géo|code geo/i],
    ["Ventes", "#0063B1", "shopping-cart", /vente|pre-vente|proforma|posologie|ordonnancier|vendeur|retrait/i],
    ["Factures et règlements", "#C43E1C", "file-text", /factur|\bbons?\b|avoir|reglement|règlement|differ|différ|litige/i],
    ["Clients et tiers-payants", "#B4135F", "users", /client|tiers|assur|société|societe|ayant|carnet|caution|compagnie|organisme|regime|régime|remise|fidélit|fidelit|rappel|dossier/i],
    ["Commandes et achats", "#5C2D91", "truck", /commande|grossiste|achat|\bbl\b|fournisseur|rupture|prévision|prevision|suggestion|réappro|reappro|entrée|entree|offre|unites gratuites|lots/i],
    ["Analyses", "#2B5797", "chart-pie", /stat|analyse|\bca\b|chiffre|tableau|balance|bilan|marge|abc|rapport|pilotage|activit|évolution|evolution|comparaison|fréquentation|frequentation|récap|recap|exploitation|match|garde|tva|unités vendues/i],
    ["Messages", "#C21807", "message-square", /sms|whatsapp|message|notification|email|campagne|discussion|avis|contacter/i],
    ["Contrôle et historiques", "#8B4513", "history", /journal|historique|mouchard|audit|suivi|corbeille|annul|diagnostic|santé|stabilit|ticket/i],
    ["Utilisateurs", "#8E2C9E", "users", /utilisateur|compte|profil|privil|deconnexion|déconnexion|personnel|ressources|langue/i],
    ["Réglages", "#4C5866", "settings", /gerer|gérer|param|type|mode|module|table|menu|configuration|maintenance|devise|identification|forme|tranche|risque|famille|ville|motif|contre|specialit|fabricant|medecin|médecin|escompte|workflow|centre|tva|sous-menu/i]
  ],
  AUTRES: ["Autres écrans", "#B05E00", "layout-grid"]
};
