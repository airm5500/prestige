# Téléchargements proposés par les extranets (point 4 du 09/11)

Demande : « pour les documents dans chaque onglet en ligne on a l'option de téléchargement en csv, excel et txt pour
certains sur extranet, peut-on les avoir ici pour permettre les importations ? On utilise juste ce qui y est
disponible. »

Relevé fait le 09/11 dans le Chrome de l'utilisateur, connecté par lui-même, **en lecture seule** : lecture des pages
et des scripts seulement. Aucun clic sur un bouton d'export, aucun fichier téléchargé, aucune saisie. Les noms de
paramètres sont notés, jamais leurs valeurs.

## Ce qui existe, par grossiste

| Grossiste | Page | Document | Formats | Appel (GET sauf mention) | Paramètres | Fabriqué par |
|---|---|---|---|---|---|---|
| Ubipharm | Factures non relevées `/ListeFactures` | BLV d'une facture | **CSV, Excel, TXT** | `/BLVCSV`, `/BLVExcel`, `/BLVTxt` | `fcnum`, `etcoda` (dans le lien de chaque ligne) | serveur |
| Ubipharm | `/ListeFactures` | Factures non relevées | ZIP (PDF) | `/ReleveFacturesZIP` | `action`, `nonrlv` | serveur |
| Ubipharm | Factures, relevés, avoirs, ristournes, escomptes | Document | PDF | `GetPDF` | `format`, `annee`, `mois`, `clcode`, `soc`, `type`… | serveur |
| TEDIS | BL par quinzaine `/blparquizaine` | BL | **TXT, CSV** | `/exportationsBlTxt`, `/exportationsBlQuizainecsv` | `IDFACTURECLIENT` ; réponse texte, nom `BLV_<n° BL>` | serveur |
| TEDIS | Factures de quinzaine `/factureDequinzaine` | Relevés, avoirs, relevé par nature | impression (PDF) | `/releveclient`, `/etat` | — | serveur |
| DPCI | Mes documents → Factures `/geide?typeDocument=FACTURE` | Factures cochées | **CSV « 2 colonnes » et « 9 colonnes »** | `/module/geide/ExportDonnee.action` | `dateDebut`, `dateFin`, `typeDocument`, `nbColonnes`, `selectIdDocument` (liste) | serveur |
| DPCI | Mes documents → Avoirs | Avoirs cochés | **CSV** | `/module/geide/ExportDonnee.action` | idem | serveur |
| DPCI | BL, relevés, avantages commerciaux | Document | PDF / ZIP | `/module/geide/DownloadDocument.action` | `idDocument`, `export`, `type` | serveur |
| DPCI | Catalogue `/produits` | Produits | CSV | `/module/catalogue/ExportProduits.action` (POST) | `export`, `type` | serveur |
| DPCI | Commande | Commande | CSV | `/module/commande/ExportCommande.action` | `idCommande`, `export`, `type` | serveur |
| Copharmed | Mon espace → Factures | Facture | **CSV, XLS**, PDF | `ViewPharmacy-DownloadInvoiceCSVXLS` / `-DownloadInvoicePDF` | `InvoiceNo`, `Type=Invoices`, `Format=csv|xls` | serveur |
| Copharmed | Mon espace → Avoirs | Avoir | **CSV, XLS**, PDF | idem | `InvoiceNo`, `Type=CreditNotes`, `Format` | serveur |
| Copharmed | Détail d'une commande | Réponse à la commande | CSV | `ViewOrders-ExportCSV` | `OrderID` | serveur |

Non relevé : Copharmed « Relevés » (la page n'a pas répondu dans le délai), commandes de TEDIS.

Point commun : **tous les fichiers utiles à l'import sont fabriqués par le serveur de l'extranet** et s'obtiennent par
une simple requête GET avec la session déjà ouverte par le connecteur. Aucun n'est fabriqué dans le navigateur ; on
peut donc les récupérer depuis Prestige avec `TransportExtranet`, comme les listes actuelles.

Les BL du grossiste, ligne par ligne, sont disponibles chez **Ubipharm** (BLV CSV/Excel/TXT), **TEDIS** (BL TXT/CSV),
**DPCI** (factures en CSV 9 colonnes) et **Copharmed** (factures CSV/XLS). C'est ce qu'il faut pour importer un BL.

## Proposition d'implémentation

1. Dans chaque onglet de document (Factures non relevées Ubipharm, BL de quinzaine TEDIS, Factures et Avoirs DPCI,
   Factures et Avoirs Copharmed), une colonne « Fichier » avec les formats proposés par l'extranet (CSV, Excel, TXT).
2. Un appel REST `GET v1/extranet/{source}/document?liste=…&ligne=…&format=…` : le serveur de Prestige retrouve les
   paramètres de la ligne gardée (numéro, code établissement…), télécharge le fichier par la session du connecteur et
   le renvoie tel quel, nommé `<grossiste>_<n° document>.<ext>`. Rien n'est gardé sur le disque ; aucun cookie ni
   jeton ne quitte le serveur ; le contenu n'est pas journalisé.
3. Étape suivante, à valider : « Importer ce BL » qui ouvre le fichier dans l'import de BL existant.

Tests prévus : faux extranet (domain2) qui sert un CSV, un XLS et un TXT connus ; rapprochement fichier reçu = fichier
servi, octet par octet, pour chaque grossiste et format ; nom du fichier ; refus d'une ligne inconnue ou d'un format
non proposé ; aucune écriture en base (bilan avant / après).
