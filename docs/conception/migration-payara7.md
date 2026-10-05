# Passage à Payara 7 et au JDK 21 — essai sur base réelle

> Bilan au 5 octobre 2026. Version d'essai : `scripts/migration-payara7/essai-payara7.patch` (3 commits,
> à appliquer sur `dev` + patchs des lots 1, 2 et 4 de la migration JDK 17) et
> `scripts/migration-payara7/toolkits-jakarta.patch` (TOOLKITS).
> La base réelle fournie (dépôt du 25 août 2026) n'a servi qu'au banc ; elle n'est ni versionnée ni publiée.

## 1. Le cadre, mesuré

| Combinaison | Résultat |
|---|---|
| Payara 5.2022.5 + JDK 17 | fonctionne (plan JDK 17, lots 0 à 4) |
| Payara 5.2022.5 + JDK 21 | démarre, mais **refuse de déployer** l'application |
| Payara 7.2026.9 + JDK 11 ou 17 | **refuse de démarrer** (bytecode 65) |
| Payara 7.2026.9 + JDK 21 | fonctionne |
| Payara 6 communautaire | plus de version depuis 6.2025.11 (novembre 2025) |

Payara 5 s'arrête au JDK 17, Payara 7 commence au JDK 21 : le JDK 17 reste l'étape intermédiaire, et le
passage à Payara 7 emporte ensemble le JDK 21, `jakarta.*` et Hibernate 7.

## 2. Le banc

- **Base** : le dépôt réel, chargé dans MariaDB 10.11 réglé comme sous Windows (`lower_case_table_names=1`, base en
  `utf8mb3` comme les tables d'origine), puis neutralisé : réglages d'envoi de SMS et de courriel à 0, aucun jeton,
  mot de passe de banc pour un compte administrateur, accès de dépannage fermé.
- **Aucun envoi possible** : les serveurs du banc tournent avec un proxy mort (HTTP, HTTPS et SOCKS) ; FNE, PharmaML,
  SMS, courriel et support ne peuvent rien joindre.
- **Mise à jour de la base** (5.9.7 → 6.9.72, voir § 5) : faite une fois, sauvegardée, puis restaurée avant chaque
  passage.
- **Référence** : `dev` + lots 1, 2 et 4, sur Payara 5 / JDK 17. **Essai** : la même révision convertie, sur
  Payara 7 / JDK 21. Mêmes réglages de domaine (pool, pilote 5.1.49, locale fr_FR, Cp1252, mémoire).
- **Comparaison** : 740 appels en lecture avec une session réelle — 499 services REST et 241 pages JSP de données
  (`ws_data*.jsp`) — période du 1er au 12 août 2026 ; réponses normalisées (JSON trié, contenu des tableurs, texte
  des PDF, horodatages du jour masqués). Les services en GET qui modifient des données sont écartés.

## 3. Résultat de la comparaison

| | Référence (Payara 5 / JDK 17) | Essai (Payara 7 / JDK 21) |
|---|---|---|
| Déploiement | réussi | réussi |
| Réponses 200 / 500 / 400 / 404 | 707 / 18 / 7 / 3 | **707 / 18 / 7 / 3** |
| Identiques au caractère près | — | **670** |
| Même contenu, autre ordre | — | 18 |
| Diagnostics (mémoire, disque, heures, versions) et pages d'erreur | — | 13 + 8 |
| Écart de résultat | — | 1 (§ 4, défaut existant révélé) |

Les 18 erreurs 500 existent à l'identique dans la référence (défauts actuels, § 6).

**Ordre des lignes** : 18 réponses contiennent exactement les mêmes lignes dans un autre ordre (requêtes sans
`ORDER BY` complet, que le SQL d'Hibernate 7 fait lire autrement). Une liste paginée en découle : la 25e ligne d'une
page change. À traiter par des tris explicites sur les écrans concernés.

## 4. Ce que la conversion a demandé

| Point | Cause | Correction |
|---|---|---|
| 824 classes, 6444 imports `javax.*` | Jakarta EE | OpenRewrite (`JakartaEE11`, `MigrateToHibernate71`) |
| TOOLKITS | `javax.mail` | `jakarta.mail` fourni par le serveur (13 imports) ; sources reçues identiques aux jars en service, instruction par instruction |
| Lombok 1.18.26 | incompatible avec le compilateur du JDK 21 | 1.18.48 |
| Constantes du métamodèle (`INT_NU_MB_ER_…`) | nommage du nouveau générateur | 16 références renommées |
| `MySQL5InnoDBDialect`, `SunOneJtaPlatform` | retirés | `MariaDBDialect`, `GlassFishJtaPlatform` |
| Amélioration du bytecode | Hibernate 7 l'inscrit par défaut : `ClassCircularityError` sous Payara 7 | désactivée, comme sous Hibernate 5 |
| Entités introuvables | le scanner est sorti du noyau d'Hibernate 7 | `hibernate-scan-jandex` |
| 81 colonnes `Double` avec `precision`/`scale` | refusé par Hibernate 7 (ignoré par Hibernate 5) | attributs retirés : aucun effet sur les données |
| Métamodèle partagé (`TFamille_`…) | EclipseLink (`DALPU`) le remplit avec ses objets, qu'Hibernate 7 refuse | `DALPU` liste ses 247 entités ; un test garde la liste à jour |
| Requêtes natives : `BigInteger` → `Long`, `java.sql.Date` → `LocalDate` | nouveaux types d'Hibernate 7 | `Number` (13 lectures) ; `prefer_jdbc_datetime_types` |
| `YEAR()` déclaré en `Date` | Hibernate 7 convertit l'année en date | déclaré en `Integer` |
| Paramètres `?2` sans `?1` | refusé par Hibernate 7 | paramètres nommés (liste des clients) |
| `OrderDetailLot` | les types JSON doivent être sérialisables | `Serializable` |
| `commons-fileupload` 1.5 | `javax.servlet` | `commons-fileupload2` (2.0.0-M4, seule version Jakarta publiée) |

Tests unitaires : **1072 / 1072** sur JDK 21.

## 5. Décisions à prendre avant la production

1. **`hibernate.hbm2ddl.auto` ne doit pas rester à `update`.** Mesuré sur la base réelle, Hibernate 7 modifierait
   124 colonnes existantes, dont **56 qu'il raccourcit** (par exemple les textes de l'officine de `text` à
   `varchar(255)`, la réponse FNE de `longtext` à `tinytext`), échouerait sur 85 autres et tenterait d'altérer des
   vues. Hibernate 5 ne faisait qu'ajouter tables et colonnes. **Recommandation : `none`**, le schéma étant tenu par
   Flyway seul — ce qui demande d'écrire un script Flyway pour toute nouvelle entité.
2. **Génération des identifiants de 6 entités** (`GenerationType.AUTO` : motifs de règlement, carnets…). Hibernate 5
   les tirait de la table commune `hibernate_sequence` ; Hibernate 7 veut une séquence par table. Tables vides sur
   cette base, donc sans collision ici, mais un site où elles ont des lignes aurait des doublons. À trancher :
   identifiants `IDENTITY` (les tables sont en `AUTO_INCREMENT`) ou générateur explicite sur `hibernate_sequence`.
3. **`commons-fileupload2`** n'existe qu'en version d'étape (2.0.0-M4). Alternative : l'API standard
   `request.getParts()` de Servlet 6, à porter dans 5 classes.
4. **Pilote MySQL** : la production utilise 5.1.23, qui plante sur MariaDB récent ; à aligner (5.1.49 au banc, ou
   un pilote MariaDB récent) au moment de Payara 7.

## 6. Défauts existants trouvés en chemin (indépendants de la migration)

| Défaut | Effet |
|---|---|
| Mise à jour d'une base en 5.9.7 : Hibernate crée colonnes et tables **avant** Flyway | 11 migrations échouent sur « colonne déjà existante » et demandent une reprise à la main |
| `SupportControle.requeteSql` sans longueur | Hibernate crée `VARCHAR(255)` avant le `TEXT` prévu par V6.4.1 : requêtes de contrôle **tronquées sans erreur**, puis V6.4.5 échoue |
| Clé étrangère de `t_facture.groupeTp_id` | types différents : la contrainte n'est jamais créée |
| `InventaireServiceImpl` (inventaire depuis les produits annulés) | SQL natif sur une colonne `boolINVENTAIRE` qui n'existe pas (`bool_INVENTAIRE`) |
| Statistiques des unités vendues | `CASE WHEN type de vente … THEN SUM(…)` par famille : VNO et VO dépendent d'une ligne prise au hasard ; il faudrait `SUM(CASE …)` |
| 18 services en erreur 500 dans la référence comme dans l'essai | `fichierSortie` nul (journal), paramètres manquants, données incomplètes |

## 7. Ce qui reste à mesurer

- **Les écritures** : ventes (comptant, assurance, différé), réception d'un bon de livraison, inventaire, caisse,
  règlements. La comparaison n'a couvert que la lecture ; c'est là que le comportement d'Hibernate 7 (écriture des
  modifications, cascades) peut encore différer.
- Les états de site (`D:\CONF\LABOREX\REPORTS`) et l'impression des tickets.
- La précompilation des 546 JSP sous Payara 7 (au banc, la précompilation en masse épuise les descripteurs de
  fichiers, sous Payara 5 comme sous 7 ; en production les JSP se compilent à la première ouverture).
- Le fonctionnement de longue durée (traitements de nuit, mémoire).
