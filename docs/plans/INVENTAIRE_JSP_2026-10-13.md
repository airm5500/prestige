# Inventaire des JSP encore utilisées (13/10/2026)

Objectif : passer toutes les JSP en API REST. Liste établie automatiquement : une JSP est « utilisée » si un fichier
de l'application (JS, JSP, HTML) cite son chemin. Une citation dans un écran que plus aucun menu n'ouvre la fait
compter quand même : à affiner écran par écran au moment de la migration.

| | Nombre |
|---|---|
| JSP présentes | 557 |
| **Utilisées** (citées par l'application) | **398** |
| Non citées (probablement mortes, à supprimer après vérification) | 159 |
| Utilisées sans contrôle de session propre (protégées depuis le 13/10 par le filtre de session) | 123 |

## Par domaine

| Domaine | JSP |
|---|---|
| `webservices/sm_user/famille` | 14 |
| `webservices/stockmanagement/suivistockvente` | 14 |
| `webservices/configmanagement/client` | 11 |
| `webservices/sm_user/detailsvente` | 11 |
| `webservices/sm_user/facturation` | 10 |
| `webservices/tierspayantmanagement/tierspayant` | 9 |
| `webservices/stockmanagement/inventaire` | 8 |
| `webservices/configmanagement/famillearticle` | 7 |
| `webservices/configmanagement/groupe` | 7 |
| `webservices/sm_user/defferredpayment` | 7 |
| `webservices/sm_user/reglement` | 7 |
| `webservices/Report/recapactivities` | 6 |
| `webservices/stockmanagement/perime` | 6 |
| `webservices/stockmanagement/stock` | 6 |
| `webservices/commandemanagement/bonlivraison` | 5 |
| `webservices/configmanagement/grossiste` | 5 |
| `webservices/sm_user/diffclient` | 5 |
| `webservices/sm_user/privilege` | 5 |
| `webservices/stockmanagement/ajustementmanagement` | 5 |
| `webservices/Report/statistiquevente` | 4 |
| `webservices/configmanagement/codegestion` | 4 |
| `webservices/configmanagement/compteclienttierspayant` | 4 |
| `webservices/configmanagement/dci` | 4 |
| `webservices/configmanagement/litige` | 4 |
| `webservices/configmanagement/zonegeographique` | 4 |
| `webservices/sm_user/outboudmessage` | 4 |
| `webservices/sm_user/utilisateur` | 4 |
| `webservices/stockmanagement/reserve` | 4 |
| `webservices/stockmanagement/retourdepot` | 4 |
| `general` | 3 |
| `webservices/Report/visitorstatistics` | 3 |
| `webservices/commandemanagement/evaluationoffreprix` | 3 |
| `webservices/commandemanagement/retourfournisseur` | 3 |
| `webservices/configmanagement/ayantdroit` | 3 |
| `webservices/configmanagement/compteclient` | 3 |
| `webservices/configmanagement/contreindication` | 3 |
| `webservices/configmanagement/emplacement` | 3 |
| `webservices/configmanagement/fabriquant` | 3 |
| `webservices/configmanagement/groupefamille` | 3 |
| `webservices/configmanagement/medecin` | 3 |
| `webservices/sm_user/detaildretrocession` | 3 |
| `webservices/sm_user/parameter` | 3 |
| `webservices/sm_user/preenregistrement` | 3 |
| `webservices/sm_user/preenregistrementcompteclient` | 3 |
| `webservices/sm_user/retrocession` | 3 |
| `webservices/tierspayantmanagement/clienttierspayant` | 3 |
| `webservices/Report/BalanceAgeDetaille` | 2 |
| `webservices/Report/BalanceAgeOrganisme` | 2 |
| `webservices/Report/DossierEnAttenteEdition` | 2 |
| `webservices/Report/Operateur` | 2 |
| `webservices/Report/RapportGestions` | 2 |
| `webservices/Report/Retrocessions` | 2 |
| `webservices/Report/RuptureStock` | 2 |
| `webservices/Report/achatfournisseur` | 2 |
| `webservices/Report/achatfournisseurs` | 2 |
| `webservices/Report/achatproduits` | 2 |
| `webservices/Report/analyseventestock` | 2 |
| `webservices/Report/comparaisonChiffreAffaire` | 2 |
| `webservices/Report/journaldesventes` | 2 |
| `webservices/Report/qtyorder` | 2 |
| `webservices/Report/statistictva` | 2 |
| `webservices/Report/statsAchats` | 2 |
| `webservices/Report/uniteGratuite` | 2 |
| `webservices/Report/venteavoirclient` | 2 |
| `webservices/Report/ventessocietes` | 2 |
| `webservices/commandemanagement/lots` | 2 |
| `webservices/configmanagement/categorieayantdroit` | 2 |
| `webservices/configmanagement/categoryclient` | 2 |
| `webservices/configmanagement/centrepayeur` | 2 |
| `webservices/configmanagement/codeacte` | 2 |
| `webservices/configmanagement/comapnies` | 2 |
| `webservices/configmanagement/dossiertierspayant` | 2 |
| `webservices/configmanagement/escomptesociete` | 2 |
| `webservices/configmanagement/etatarticle` | 2 |
| `webservices/configmanagement/fichesociete` | 2 |
| `webservices/configmanagement/formearticle` | 2 |
| `webservices/configmanagement/grilleremise` | 2 |
| `webservices/configmanagement/imprimantemanager` | 2 |
| `webservices/configmanagement/motifretour` | 2 |
| `webservices/configmanagement/optimisationquantite` | 2 |
| `webservices/configmanagement/regimecaisse` | 2 |
| `webservices/configmanagement/remise` | 2 |
| `webservices/configmanagement/risque` | 2 |
| `webservices/configmanagement/specialite` | 2 |
| `webservices/configmanagement/tableau` | 2 |
| `webservices/configmanagement/tauxmarque` | 2 |
| `webservices/configmanagement/tauxrembourssement` | 2 |
| `webservices/configmanagement/tranche` | 2 |
| `webservices/configmanagement/typeremise` | 2 |
| `webservices/configmanagement/typerisque` | 2 |
| `webservices/configmanagement/ville` | 2 |
| `webservices/configmanagement/workflowremisearticle` | 2 |
| `webservices/sm_user/alertevent` | 2 |
| `webservices/sm_user/entreestock` | 2 |
| `webservices/sm_user/info_officine` | 2 |
| `webservices/sm_user/language` | 2 |
| `webservices/sm_user/module` | 2 |
| `webservices/sm_user/role` | 2 |
| `webservices/sm_user/skin` | 2 |
| `webservices/sm_user/sous_menu` | 2 |
| `webservices/sm_user/suggerercde` | 2 |
| `webservices/sm_user/typedepense` | 2 |
| `webservices/sm_user/typerecette` | 2 |
| `webservices/stockmanagement/detailsdepot` | 2 |
| `webservices/stockmanagement/etiquette` | 2 |
| `webservices/stockmanagement/stockdepot` | 2 |
| `webservices/tierspayantmanagement/typetierspayant` | 2 |
| `app` | 1 |
| `index.jsp` | 1 |
| `security` | 1 |
| `webservices/Report/facturefournisseurs` | 1 |
| `webservices/Report/listeArticleVendus` | 1 |
| `webservices/Report/saisieperimes` | 1 |
| `webservices/commandemanagement/bonlivraisondetail` | 1 |
| `webservices/commandemanagement/etats` | 1 |
| `webservices/commandemanagement/order` | 1 |
| `webservices/commandemanagement/rupturefournisseur` | 1 |
| `webservices/configmanagement/etiquette` | 1 |
| `webservices/configmanagement/naturevente` | 1 |
| `webservices/configmanagement/tva` | 1 |
| `webservices/configmanagement/typeclient` | 1 |
| `webservices/configmanagement/typecontrat` | 1 |
| `webservices/configmanagement/typedepot` | 1 |
| `webservices/configmanagement/typeetiquette` | 1 |
| `webservices/configmanagement/typepassation` | 1 |
| `webservices/configmanagement/typevente` | 1 |
| `webservices/menumanagement/ws_tree_menu.jsp` | 1 |
| `webservices/sm_user/balance` | 1 |
| `webservices/sm_user/etatstock` | 1 |
| `webservices/sm_user/gestcaisse` | 1 |
| `webservices/sm_user/journalrecette` | 1 |
| `webservices/sm_user/journalvente` | 1 |
| `webservices/sm_user/menu` | 1 |
| `webservices/sm_user/migration` | 1 |
| `webservices/sm_user/modereglement` | 1 |
| `webservices/sm_user/mvtcaisse` | 1 |
| `webservices/sm_user/myaccount` | 1 |
| `webservices/sm_user/prixmodifies` | 1 |
| `webservices/sm_user/typereglement` | 1 |
| `webservices/sm_user/vente` | 1 |
| `webservices/sm_user/warehouseorder` | 1 |
| `webservices/usermanagement/ws_login.jsp` | 1 |
| `webservices/usermanagement/ws_transaction.jsp` | 1 |
| `webservices/ws_emplacement.jsp` | 1 |

## Détail : JSP → écrans qui l'appellent

### `webservices/sm_user/famille` (14)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `promotion/FamilleStore.js`, `stockmanagement/suivistockvente/SuiviStockVenteManager.js`, `stockmanagement/perime/PerimeManager.js` |
| `ws_data_codetva.jsp` | `configmanagement/famille/action/maxVente.js`, `configmanagement/parametreGeneraux/action/maxVente.js`, `commandemanagement/bonlivraison/ReconciliationPanel.js` |
| `ws_data_custom.jsp` | `configmanagement/famille/action/doDecondition.js` |
| `ws_data_initial.jsp` | `stockmanagement/dodepot/action/add.js`, `stockmanagement/reserve/action/addToReserve.js`, `sm_user/doventeretrocession/DoventeRetrocessionManager.js` |
| `ws_data_jdbc.jsp` | `stockmanagement/retourdepot/action/add.js`, `stockmanagement/ajustementmanagement/action/add.js`, `sm_user/diffclient/action/BuyDiffere.js` |
| `ws_data_other.jsp` | `stockmanagement/perime/action/add.js` |
| `ws_data_retourfrs.jsp` | `commandemanagement/retourfournisseur/action/add.js` |
| `ws_data_zonegeo.jsp` | `configmanagement/zonegeographique/action/changeProduitEmplacement.js` |
| `ws_datas.jsp` | `Statistics/Products.js` |
| `ws_generate_pdf.jsp` | `configmanagement/famille/FamilleManager.js`, `configmanagement/groupefamille/GroupeFamilleManager.js` |
| `ws_lots_peremptions_pdf.jsp` | `configmanagement/famille/FamilleManager.js` |
| `ws_search_data.jsp` | `SearchStore.js` |
| `ws_transaction.jsp` | `configmanagement/famille/FamilleManager.js`, `configmanagement/famille/action/comptabilite.js`, `configmanagement/famille/action/autreinfos.js` |
| `ws_updateperemptiondate.jsp` | `configmanagement/famille/FamilleManager.js` |

### `webservices/stockmanagement/suivistockvente` (14)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `stockmanagement/suivistockvente/SuiviStockVenteManager.js` |
| `ws_data_evaluation_ventemoyenne.jsp` | `stockmanagement/suivistockvente/EvaluationVenteMoyenneManager.js` |
| `ws_data_mouvement_commande.jsp` | `stockmanagement/suivistockvente/action/detailCommande.js` |
| `ws_data_mouvement_entree.jsp` | `stockmanagement/suivistockvente/action/detailEntree.js`, `stockmanagement/suivistockvente/action/detailArticle.js` |
| `ws_data_mouvement_other.jsp` | `stockmanagement/suivistockvente/action/detailOther.js` |
| `ws_data_mouvement_perime.jsp` | `stockmanagement/suivistockvente/action/detailPerime.js` |
| `ws_data_mouvement_retour.jsp` | `stockmanagement/suivistockvente/action/detailRetour.js` |
| `ws_data_mouvement_sortie.jsp` | `stockmanagement/suivistockvente/action/detailArticle.js` |
| `ws_data_mouvement_vente.jsp` | `stockmanagement/suivistockvente/action/detailVente.js` |
| `ws_data_recap_mouvement.jsp` | `stockmanagement/suivistockvente/action/detailStock.js` |
| `ws_generate_cmde_pdf.jsp` | `configmanagement/famille/action/detailArticle.js` |
| `ws_generate_pdf.jsp` | `configmanagement/famille/action/detailArticle.js` |
| `ws_generate_recap_pdf.jsp` | `stockmanagement/suivistockvente/action/detailStock.js` |
| `ws_produit_inventaire.jsp` | `stockmanagement/suivistockvente/action/detailInventaire.js` |

### `webservices/configmanagement/client` (11)

| JSP | Appelée par |
|---|---|
| `ws_clientvente_pdf.jsp` | `configmanagement/client/action/venteClient.js` |
| `ws_customer.jsp` | `sm_user/dovente/action/add.js` |
| `ws_data.jsp` | `Statistics/venteavoirclient.js`, `sm_user/preenregistrementcompteclient/PreenregistrementcompteclientManager.js`, `sm_user/suggerercde/action/add.js` |
| `ws_data_by_type.jsp` | `sm_user/retrocession/ConfrereManager.js` |
| `ws_data_compteclttierspayants.jsp` | `tierspayantmanagement/balanceagee_detail/BalanceageeRecapitulatifDetailManager.js`, `tierspayantmanagement/balanceagee_detail/BalanceageeDetailManager.js`, `tierspayantmanagement/balanceagee_detail/action/BalanceAgeeDetailsClient.js` |
| `ws_data_other.jsp` | `sm_user/doventeretrocession/ShowDetailRetrocessionManager.js`, `sm_user/doventeretrocession/DoventeRetrocessionManager.js` |
| `ws_generate_pdf.jsp` | `sm_user/preenregistrementcompteclient/PreenregistrementcompteclientManager.js`, `sm_user/diffclient/DiffManager.js`, `configmanagement/client/ClientDesactiveManager.js` |
| `ws_medecin_client_data.jsp` | `configmanagement/client/action/addMedecinClientItem.js` |
| `ws_medecin_client_transaction.jsp` | `configmanagement/client/action/addMedecinClientItem.js` |
| `ws_transaction.jsp` | `stockmanagement/dodepot/action/addclt.js`, `sm_user/preenregistrementcompteclient/PreenregistrementcompteclientManager.js`, `sm_user/suggerercde/action/add.js` |
| `ws_ventedetails.jsp` | `configmanagement/client/action/detailsVenteClient.js` |

### `webservices/sm_user/detailsvente` (11)

| JSP | Appelée par |
|---|---|
| `suggestion.jsp` | `VenteFinisCtr.js` |
| `ws_check_bon.jsp` | `LaborexWorkFlow.js` |
| `ws_data.jsp` | `stockmanagement/etatstock/action/detailTransactionClient.js`, `stockmanagement/reserve/action/detailTransactionClient.js`, `sm_user/journalvente/action/detailProduct.js` |
| `ws_data_customer.jsp` | `tierspayantmanagement/balanceagee_detail/action/BalanceAgeeDetailsClient.js`, `tierspayantmanagement/balanceagee_detail/action/detailTransactionClient.js` |
| `ws_data_famille_dci.jsp` | `sm_user/dovente/action/displayArticle.js`, `sm_user/reglement/action/displayBordereau.js`, `sm_user/reglement/action/displayDossier.js` |
| `ws_generate_devis__pdf.jsp` | `DevisListCtr.js` |
| `ws_generate_devis_pdf.jsp` | `LaborexWorkFlow.js` |
| `ws_generate_facture_pdf.jsp` | `StatVenteDepotCtr.js`, `VenteFinisCtr.js` |
| `ws_generate_pdf.jsp` | `LaborexWorkFlow.js`, `VenteFinisCtr.js` |
| `ws_init_data.jsp` | `sm_user/doventeretrocession/ShowDetailRetrocessionManager.js` |
| `ws_transaction.jsp` | `sm_user/detailsvente/DetailsVenteManager.js`, `sm_user/doventeretrocession/ShowDetailRetrocessionManager.js`, `sm_user/diffclient/action/add.js` |

### `webservices/sm_user/facturation` (10)

| JSP | Appelée par |
|---|---|
| `ws_data_detail_Bon.jsp` | `sm_user/editfacture/action/DetaillBon.js`, `sm_user/factureregle/action/DetaillBon.js` |
| `ws_data_detail_facture.jsp` | `sm_user/editbordereau/action/DetailFacture.js`, `sm_user/editfacture/action/DetailFacture.js`, `sm_user/factureregle/action/DetailFacture.js` |
| `ws_data_detail_fournisseur.jsp` | `sm_user/diffclient/action/BuyDiffere.js`, `sm_user/factureregle/action/add.js` |
| `ws_data_detail_fournisseur_facture.jsp` | `sm_user/editfacture/action/detailTransactionFournisseur.js`, `sm_user/editfacture/action/DetailFactureFournisseur.js`, `sm_user/factureregle/action/DetailFactureFournisseur.js` |
| `ws_groupeInvoices.jsp` | `sm_user/editfacture/EditFactureManagerSo.js` |
| `ws_rp_facture_fournisseur.jsp` | `sm_user/editfacture/EditFactureManagerSo.js`, `sm_user/editfacture/EditFactureManager.js`, `sm_user/factureregle/FactureRegleManager.js` |
| `ws_rp_facture_tiers_payant.jsp` | `sm_user/editfacture/EditFactureManagerSo.js`, `sm_user/editfacture/EditFactureManager.js`, `sm_user/factureregle/FactureRegleManager.js` |
| `ws_rp_print_all_invoices.jsp` | `sm_user/editfacture/action/add.js` |
| `ws_rp_releve_fne.jsp` | `sm_user/editfacture/EditFactureManager.js` |
| `ws_transaction.jsp` | `sm_user/editbordereau/EditBordereaumanager.js`, `sm_user/editbordereau/action/DetailFacture.js`, `sm_user/editfacture/action/DetaillBon.js` |

### `webservices/tierspayantmanagement/tierspayant` (9)

| JSP | Appelée par |
|---|---|
| `ws_client.jsp` | `configmanagement/litige/action/add.js`, `tierspayantmanagement/balanceagee_detail/action/BalanceAgeeDetailsClient.js`, `tierspayantmanagement/balanceagee_detail/action/detailTransactionClient.js` |
| `ws_clients_data_tierspayants.jsp` | `sm_user/editfacture/action/add.js` |
| `ws_data_balanceageedetail_facturation.jsp` | `tierspayantmanagement/balanceagee_detail/action/BalanceAgeeDetailsClient.js` |
| `ws_data_detail_facturation_client.jsp` | `stockmanagement/etatstock/action/detailTransactionClient.js`, `stockmanagement/reserve/action/detailTransactionClient.js`, `tierspayantmanagement/balanceagee_detail/action/detailTransactionClient.js` |
| `ws_data_facturation.jsp` | `configmanagement/litige/action/add.js`, `tierspayantmanagement/balanceagee_detail/BalanceageeRecapitulatifDetailManager.js`, `tierspayantmanagement/balanceagee_detail/action/BalanceAgeeDetailsClient.js` |
| `ws_data_other.jsp` | `configmanagement/litige/action/add.js`, `tierspayantmanagement/balanceagee_detail/BalanceageeRecapitulatifDetailManager.js`, `tierspayantmanagement/balanceagee_detail/BalanceageeDetailManager.js` |
| `ws_generate_pdf.jsp` | `sm_user/preenregistrementcompteclienttierspayant/PreenregistrementcompteclienttierspayantManager.js`, `tierspayantmanagement/tierspayant/TiersPayantManager.js`, `tierspayantmanagement/tierspayant/TiersPayantDesactiveManager.js` |
| `ws_search_data.jsp` | `sm_user/editfacture/EditFactureManagerSo.js`, `sm_user/editfacture/EditFactureManager.js`, `sm_user/reglement/ReglementManager.js` |
| `ws_transaction.jsp` | `sm_user/preenregistrementcompteclienttierspayant/PreenregistrementcompteclienttierspayantManager.js`, `sm_user/dovente/action/addTiersPayantItem.js`, `configmanagement/dossiertierspayant/DossierTiersPayantManager.js` |

### `webservices/stockmanagement/inventaire` (8)

| JSP | Appelée par |
|---|---|
| `ws_check_cloture_privilege.jsp` | `stockmanagement/inventaire/action/editInventaireManager.js` |
| `ws_data_check_emplacement.jsp` | `stockmanagement/inventaire/action/editInventaireManager.js` |
| `ws_data_check_emplacement_restants.jsp` | `stockmanagement/inventaire/action/editInventaireManager.js` |
| `ws_data_ecart_inventaire.jsp` | `stockmanagement/inventaire/EcartInventaireManager.js` |
| `ws_generate_pdf.jsp` | `stockmanagement/inventaire/InventaireManager.js`, `stockmanagement/inventaire/EcartInventaireManager.js`, `stockmanagement/inventaire/action/detailInventaireManager.js` |
| `ws_generate_pdf_check_emplacement.jsp` | `stockmanagement/inventaire/action/editInventaireManager.js` |
| `ws_generate_pdf_filtre.jsp` | `stockmanagement/inventaire/action/editInventaireManager.js` |
| `ws_transactions.jsp` | `stockmanagement/inventaire/InventaireManager.js`, `stockmanagement/inventaire/action/addBis.js`, `stockmanagement/inventaire/action/editInventaireManager.js` |

### `webservices/configmanagement/famillearticle` (7)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `Statistics/FamilleArticles.js`, `stockmanagement/etatstock/EtatStockManager.js`, `stockmanagement/inventaire/action/detailInventaireManager.js` |
| `ws_data_initial.jsp` | `configmanagement/famille/action/add.js`, `configmanagement/famille/action/add2.js` |
| `ws_data_inventaire.jsp` | `stockmanagement/inventaire/action/editInventaireManager.js` |
| `ws_data_maxVente.jsp` | `configmanagement/famille/FamilleManager.js`, `configmanagement/parametreGeneraux/ParametreGenerauxManager.js`, `configmanagement/parametreGeneraux/action/maxVente.js` |
| `ws_data_other.jsp` | `stockmanagement/etatstock/ValorisationStock.js`, `stockmanagement/inventaire/action/addBis.js`, `stockmanagement/valorisation/Valorisation.js` |
| `ws_transaction.jsp` | `configmanagement/famillearticle/FamilleArticleManager.js`, `configmanagement/famillearticle/action/add.js` |
| `ws_transaction_maxVente.jsp` | `configmanagement/famille/FamilleManager.js`, `configmanagement/famille/action/maxVente.js`, `configmanagement/parametreGeneraux/ParametreGenerauxManager.js` |

### `webservices/configmanagement/groupe` (7)

| JSP | Appelée par |
|---|---|
| `group_invoice_pdf.jsp` | `sm_user/editfacture/EditFactureManagerSo.js`, `tierspayantmanagement/groupetierspayant/groupeInvoices.js` |
| `ws_allinvoice_pdf.jsp` | `sm_user/editfacture/action/add.js` |
| `ws_groupe_notein.jsp` | `tierspayantmanagement/groupetierspayant/action/groupetierspayants.js` |
| `ws_groupe_tierspayant.jsp` | `tierspayantmanagement/groupetierspayant/action/groupetierspayants.js` |
| `ws_rp_recap_reglement_groupe.jsp` | `tierspayantmanagement/groupetierspayant/groupeInvoices.js`, `tierspayantmanagement/groupetierspayant/reglementGroup.js` |
| `ws_tiers_payantseach.jsp` | `Statistics/goupeTpSore.js` |
| `ws_transaction.jsp` | `sm_user/editfacture/EditFactureManagerSo.js` |

### `webservices/sm_user/defferredpayment` (7)

| JSP | Appelée par |
|---|---|
| `ws_client_data.jsp` | `sm_user/Defferedpaiement/DefferedPaiement.js` |
| `ws_data.jsp` | `sm_user/Defferedpaiement/DefferedPaiement.js` |
| `ws_deferredpayment_pdf.jsp` | `sm_user/Defferedpaiement/DefferedPaiement.js` |
| `ws_defferedclients.jsp` | `sm_user/Defferedpaiement/action/add.js` |
| `ws_details_deffered.jsp` | `sm_user/Defferedpaiement/action/DefferredDetails.js` |
| `ws_payment_data.jsp` | `sm_user/Defferedpaiement/action/add.js` |
| `ws_transaction.jsp` | `sm_user/Defferedpaiement/action/add.js` |

### `webservices/sm_user/reglement` (7)

| JSP | Appelée par |
|---|---|
| `ws_data_by_bordereau.jsp` | `sm_user/reglement/action/displayBordereau.js` |
| `ws_data_by_dossier.jsp` | `sm_user/reglement/action/displayDossier.js` |
| `ws_data_reglement_by_bordereau.jsp` | `sm_user/reglement/action/displayBordereau.js` |
| `ws_data_reglement_by_dossier.jsp` | `sm_user/reglement/action/displayDossier.js` |
| `ws_generate_reglement_pdf.jsp` | `sm_user/reglement/ReglementManager.js` |
| `ws_mode_reglemnt.jsp` | `sm_user/Defferedpaiement/action/add.js` |
| `ws_transaction.jsp` | `sm_user/reglement/action/displayBordereau.js`, `sm_user/reglement/action/DoReglement.js`, `sm_user/reglement/action/displayDossier.js` |

### `webservices/Report/recapactivities` (6)

| JSP | Appelée par |
|---|---|
| `ws_achats.jsp` | `Report/activities/rapportactivite.js` |
| `ws_credits.jsp` | `Report/activities/rapportactivite.js` |
| `ws_generate_pdf.jsp` | `Report/activities/rapportactivite.js` |
| `ws_mvts.jsp` | `Report/activities/rapportactivite.js` |
| `ws_reglements.jsp` | `Report/activities/rapportactivite.js` |
| `ws_totaux.jsp` | `Report/activities/rapportactivite.js` |

### `webservices/stockmanagement/perime` (6)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `stockmanagement/perime/PerimeManager.js` |
| `ws_data_famille.jsp` | `configmanagement/famille/action/detailArticle.js` |
| `ws_data_removetostock.jsp` | `stockmanagement/perime/PerimeRemoveToStockManager.js` |
| `ws_generate_pdf.jsp` | `stockmanagement/perime/PerimeManager.js` |
| `ws_generate_removeperime_pdf.jsp` | `stockmanagement/perime/PerimeRemoveToStockManager.js` |
| `ws_transaction.jsp` | `stockmanagement/perime/PerimeManager.js`, `stockmanagement/perime/action/add.js` |

### `webservices/stockmanagement/stock` (6)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `Statistics/AnalyseVente.js`, `stockmanagement/etatstock/EtatStockManager.js`, `stockmanagement/retourdepot/action/add.js` |
| `ws_data_valorisation.jsp` | `stockmanagement/etatstock/ValorisationStock.js` |
| `ws_etatstock_pdf.jsp` | `stockmanagement/etatstock/EtatStockManager.js` |
| `ws_generate_facture_pdf.jsp` | `stockmanagement/etatstock/ValorisationStock.js` |
| `ws_generate_valorisation_pdf.jsp` | `stockmanagement/etatstock/ValorisationStock.js` |
| `ws_transaction.jsp` | `stockmanagement/etatstock/EtatStockManager.js`, `sm_user/etatstock/EtatstockManager.js`, `sm_user/entreestock/EntreestockManager.js` |

### `webservices/commandemanagement/bonlivraison` (5)

| JSP | Appelée par |
|---|---|
| `ws_generate_etiquette_pdf.jsp` | `stockmanagement/etiquette/action/add.js` |
| `ws_generate_pdf.jsp` | `commandemanagement/etats/EtatControleManager.js`, `commandemanagement/bonlivraison/BonLivraisonManager.js`, `commandemanagement/bonlivraison/action/add.js` |
| `ws_quinzaine_data.jsp` | `commandemanagement/etats/action/quinzaineManager.js` |
| `ws_quinzaine_transaction.jsp` | `commandemanagement/etats/action/quinzaineManager.js`, `commandemanagement/etats/action/addQuinzaine.js` |
| `ws_transaction.jsp` | `commandemanagement/bonlivraison/action/editprice.js` |

### `webservices/configmanagement/grossiste` (5)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `Statistics/Grossistes.js`, `stockmanagement/etatstock/EtatStockManager.js`, `stockmanagement/inventaire/action/detailInventaireManager.js` |
| `ws_data_inventaire.jsp` | `stockmanagement/inventaire/action/editInventaireManager.js` |
| `ws_data_other.jsp` | `stockmanagement/etatstock/ValorisationStock.js`, `stockmanagement/inventaire/action/addBis.js`, `stockmanagement/valorisation/Valorisation.js` |
| `ws_generate_pdf.jsp` | `configmanagement/grossiste/GrossisteManager.js` |
| `ws_transaction.jsp` | `configmanagement/grossiste/GrossisteManager.js`, `configmanagement/grossiste/action/grossisteview.js`, `configmanagement/grossiste/action/add.js` |

### `webservices/sm_user/diffclient` (5)

| JSP | Appelée par |
|---|---|
| `ws_customer_data.jsp` | `sm_user/dovente/action/displayCustomer.js` |
| `ws_customer_last_transction_compte_client_data.jsp` | `LaborexWorkFlow.js` |
| `ws_data.jsp` | `sm_user/diffclient/DiffManager.js`, `sm_user/diffclient/action/BuyDiffere.js`, `sm_user/dovente/action/addclt.js` |
| `ws_generate_pdf.jsp` | `sm_user/diffclient/DiffManager.js` |
| `ws_transaction.jsp` | `sm_user/reglement/ReglementManager.js` |

### `webservices/sm_user/privilege` (5)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `sm_user/privilege/PrivilegeManager.js` |
| `ws_get_privilege_by_bt.jsp` | `sm_user/outboudmessage/OutboudmessageManager.js`, `sm_user/user/UserManager.js`, `sm_user/role/RoleManager.js` |
| `ws_role_data.jsp` | `sm_user/role/action/addPrivilegeItem.js`, `sm_user/role/action/addPrivilege.js`, `configmanagement/client/action/addMedecinClient.js` |
| `ws_role_transaction.jsp` | `sm_user/role/action/addPrivilegeItem.js` |
| `ws_transaction.jsp` | `sm_user/privilege/PrivilegeManager.js`, `sm_user/privilege/action/add.js` |

### `webservices/stockmanagement/ajustementmanagement` (5)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `stockmanagement/ajustementmanagement/ajustementManager.js` |
| `ws_data_detail.jsp` | `stockmanagement/ajustementmanagement/action/add.js`, `stockmanagement/ajustementmanagement/action/detailAjustement.js` |
| `ws_generate_pdf.jsp` | `stockmanagement/ajustementmanagement/ajustementManager.js`, `stockmanagement/ajustementmanagement/action/add.js`, `stockmanagement/ajustementmanagement/action/detailAjustement.js` |
| `ws_transaction.jsp` | `stockmanagement/ajustementmanagement/ajustementManager.js` |
| `ws_transaction_detail.jsp` | `stockmanagement/ajustementmanagement/action/add.js` |

### `webservices/Report/statistiquevente` (4)

| JSP | Appelée par |
|---|---|
| `ws_cumul_data.jsp` | `Statistics/VenteCumuls.js` |
| `ws_data.jsp` | `Statistics/Ventes.js` |
| `ws_graphe_data.jsp` | `Statistics/VenteChart.js` |
| `ws_statistiquevente_pdf.jsp` | `Report/statistiquevente/statistiqueventemanager.js`, `Report/statistiquevente/SalesStatistcManager.js`, `Report/ListeArticleVendus/ArticlesManager.js` |

### `webservices/configmanagement/codegestion` (4)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `configmanagement/famille/action/comptabilite.js`, `configmanagement/famille/action/autreinfos.js`, `configmanagement/famille/action/detailArticleOther.js` |
| `ws_generate_pdf.jsp` | `configmanagement/codegestion/CodeGestionManager.js` |
| `ws_generate_xls.jsp` | `configmanagement/codegestion/CodeGestionManager.js` |
| `ws_transaction.jsp` | `configmanagement/codegestion/CodeGestionManager.js`, `configmanagement/codegestion/action/add.js` |

### `webservices/configmanagement/compteclienttierspayant` (4)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `sm_user/preenregistrementcompteclienttierspayant/PreenregistrementcompteclienttierspayantManager.js`, `configmanagement/clientaccounttierspayant/ClientAccountTPManager.js`, `configmanagement/client/action/showclttierspayant.js` |
| `ws_data_tierspayant.jsp` | `sm_user/retrocession/action/addClient.js`, `sm_user/dovente/action/associateTiersPayantItem.js`, `configmanagement/client/action/addClient.js` |
| `ws_data_tierspayant_create.jsp` | `sm_user/dovente/action/add.js` |
| `ws_transaction_clt.jsp` | `stockmanagement/etatstock/action/detailTransactionClient.js`, `stockmanagement/reserve/action/detailTransactionClient.js`, `sm_user/dovente/action/addTiersPayant.js` |

### `webservices/configmanagement/dci` (4)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `stockmanagement/etatstock/EtatStockManager.js`, `configmanagement/famille/FamilleManager.js`, `configmanagement/dci/DciManager.js` |
| `ws_data_dci_famille.jsp` | `configmanagement/famille/action/add.js`, `configmanagement/famille/action/add2.js` |
| `ws_transaction.jsp` | `configmanagement/dci/DciManager.js`, `configmanagement/dci/action/add.js` |
| `ws_transaction_dci_famille.jsp` | `configmanagement/famille/action/add.js`, `configmanagement/famille/action/add2.js` |

### `webservices/configmanagement/litige` (4)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `configmanagement/litige/LitigeManager.js` |
| `ws_data_typelitige.jsp` | `configmanagement/litige/LitigeManager.js`, `configmanagement/litige/action/add.js` |
| `ws_transaction.jsp` | `configmanagement/litige/LitigeManager.js`, `configmanagement/litige/action/detailTransactionLitige.js`, `configmanagement/litige/action/add.js` |
| `ws_transaction2.jsp` | `configmanagement/litige/action/add.js` |

### `webservices/configmanagement/zonegeographique` (4)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `stockmanagement/etatstock/EtatStockManager.js`, `stockmanagement/inventaire/action/detailInventaireManager.js`, `stockmanagement/inventaire/action/addArticle.js` |
| `ws_data_inventaire.jsp` | `stockmanagement/inventaire/action/editInventaireManager.js` |
| `ws_data_other.jsp` | `stockmanagement/etatstock/ValorisationStock.js`, `stockmanagement/inventaire/action/addBis.js`, `stockmanagement/valorisation/Valorisation.js` |
| `ws_transaction.jsp` | `configmanagement/zonegeographique/ZoneGeographiqueManager.js`, `configmanagement/zonegeographique/action/add.js` |

### `webservices/sm_user/outboudmessage` (4)

| JSP | Appelée par |
|---|---|
| `ws_check_notification_mijournee_web.jsp` | `general/index.jsp` |
| `ws_check_notification_web.jsp` | `general/index.jsp` |
| `ws_check_notificationavoir_web.jsp` | `general/index.jsp` |
| `ws_transaction.jsp` | `sm_user/outboudmessage/OutboudmessageManager.js` |

### `webservices/sm_user/utilisateur` (4)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `stockmanagement/inventaire/action/editInventaireManager.js`, `vente/VenteAvoir.js`, `sm_user/user/UserManager.js` |
| `ws_data_imprimante.jsp` | `sm_user/user/action/addPrinter.js` |
| `ws_generate_pdf.jsp` | `sm_user/user/UserManager.js` |
| `ws_transaction.jsp` | `sm_user/user/UserManager.js`, `sm_user/user/action/addpwd_1.js`, `sm_user/user/action/add.js` |

### `webservices/stockmanagement/reserve` (4)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `stockmanagement/reserve/action/addToReserve.js` |
| `ws_generate_pdf_reserve.jsp` | `stockmanagement/reserve/ReserveGrid.js`, `stockmanagement/reserve/HistoriqueGrid.js`, `stockmanagement/reserve/action/historiqueGlobal.js` |
| `ws_generate_pdf_suggestion.jsp` | `stockmanagement/reserve/SuggestionsGrid.js`, `stockmanagement/reserve/action/traitementSuggestion.js` |
| `ws_transaction.jsp` | `stockmanagement/stockdepot/action/add.js`, `stockmanagement/reserve/action/addToReserve.js` |

### `webservices/stockmanagement/retourdepot` (4)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `stockmanagement/retourdepot/retourdepotManager.js` |
| `ws_data_detail.jsp` | `stockmanagement/retourdepot/action/add.js` |
| `ws_generate_pdf.jsp` | `stockmanagement/retourdepot/retourdepotManager.js`, `stockmanagement/retourdepot/action/add.js` |
| `ws_transaction.jsp` | `stockmanagement/retourdepot/retourdepotManager.js`, `stockmanagement/retourdepot/action/add.js` |

### `general` (3)

| JSP | Appelée par |
|---|---|
| `home/index.jsp` | `sm_user/mainmenu/MainMenuManager.js` |
| `home/view/sousmenus.jsp` | `general/home/index.jsp` |
| `index.jsp` | `index.jsp`, `security/index.jsp` |

### `webservices/Report/visitorstatistics` (3)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `Statistics/VISITORSTATISTICS.js` |
| `ws_graphe_data.jsp` | `Statistics/Tranches.js` |
| `ws_visitorstatistics_pdf.jsp` | `Report/analyseFrequentationOff/analyseFrequentationOffManager.js` |

### `webservices/commandemanagement/evaluationoffreprix` (3)

| JSP | Appelée par |
|---|---|
| `ws_data_detail.jsp` | `commandemanagement/evaluation/action/add.js` |
| `ws_generate_pdf.jsp` | `commandemanagement/evaluation/Evaluationoffreprix.js`, `commandemanagement/evaluation/action/add.js` |
| `ws_transaction.jsp` | `commandemanagement/evaluation/Evaluationoffreprix.js`, `commandemanagement/evaluation/action/add.js` |

### `webservices/commandemanagement/retourfournisseur` (3)

| JSP | Appelée par |
|---|---|
| `ws_data_bl_retour.jsp` | `commandemanagement/retourfournisseur/action/add.js` |
| `ws_generate_pdf.jsp` | `commandemanagement/retourfournisseur/retourFrsManager.js` |
| `ws_transaction.jsp` | `commandemanagement/retourfournisseur/retourFrsManager.js`, `commandemanagement/retourfournisseur/action/add.js`, `commandemanagement/retourfournisseur/action/reponseretourfournisseur.js` |

### `webservices/configmanagement/ayantdroit` (3)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `stockmanagement/etatstock/action/detailTransactionClient.js`, `stockmanagement/inventaire/action/addArticle.js`, `stockmanagement/reserve/action/detailTransactionClient.js` |
| `ws_generate_pdf.jsp` | `configmanagement/ayantdroit/AyantDroitManager.js` |
| `ws_transaction.jsp` | `sm_user/dovente/action/addAyant.js`, `sm_user/alertevent/action/adduserphonetoalert.js`, `sm_user/alertevent/action/adduserphonealertevent.js` |

### `webservices/configmanagement/compteclient` (3)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `sm_user/preenregistrementcompteclient/PreenregistrementcompteclientManager.js`, `sm_user/suggerercde/action/add.js`, `sm_user/dovente/action/addtp.js` |
| `ws_init_data.jsp` | `sm_user/dovente/action/addtp.js` |
| `ws_transaction.jsp` | `sm_user/preenregistrementcompteclient/PreenregistrementcompteclientManager.js`, `configmanagement/clientaccount/action/add.js`, `configmanagement/compteclient/CompteClientManager.js` |

### `webservices/configmanagement/contreindication` (3)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `configmanagement/contreindication/ContreIndicationManager.js`, `configmanagement/typereglement/ContreIndicationManager.js` |
| `ws_generate_pdf.jsp` | `configmanagement/contreindication/ContreIndicationManager.js` |
| `ws_transaction.jsp` | `configmanagement/contreindication/ContreIndicationManager.js`, `configmanagement/typereglement/ContreIndicationManager.js` |

### `webservices/configmanagement/emplacement` (3)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `stockmanagement/dodepot/action/importOrder.js`, `sm_user/user/action/add.js`, `configmanagement/emplacement/EmplacementManager.js` |
| `ws_data_other.jsp` | `stockmanagement/dodepot/action/add.js` |
| `ws_transaction.jsp` | `configmanagement/emplacement/EmplacementManager.js`, `configmanagement/emplacement/action/add.js` |

### `webservices/configmanagement/fabriquant` (3)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `stockmanagement/suivistockvente/SuiviStockVenteManager.js`, `configmanagement/fabriquant/FabricantManager.js`, `configmanagement/fabriquant/action/add.js` |
| `ws_generate_pdf.jsp` | `configmanagement/fabriquant/FabricantManager.js` |
| `ws_transaction.jsp` | `configmanagement/fabriquant/FabricantManager.js`, `configmanagement/fabriquant/action/add.js` |

### `webservices/configmanagement/groupefamille` (3)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `configmanagement/groupefamille/GroupeFamilleManager.js`, `configmanagement/groupefamille/action/add.js`, `configmanagement/risque/action/add.js` |
| `ws_generate_pdf.jsp` | `configmanagement/groupefamille/GroupeFamilleManager.js` |
| `ws_transaction.jsp` | `configmanagement/groupefamille/GroupeFamilleManager.js`, `configmanagement/groupefamille/action/add.js` |

### `webservices/configmanagement/medecin` (3)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `sm_user/retrocession/action/addClient.js`, `configmanagement/medecin/MedecinManager.js`, `configmanagement/medecin/action/add.js` |
| `ws_generate_pdf.jsp` | `configmanagement/medecin/MedecinManager.js` |
| `ws_transaction.jsp` | `configmanagement/medecin/MedecinManager.js`, `configmanagement/medecin/action/add.js`, `configmanagement/client/action/addmedecin.js` |

### `webservices/sm_user/detaildretrocession` (3)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `sm_user/doventeretrocession/ShowDetailRetrocessionManager.js`, `sm_user/doventeretrocession/DoventeRetrocessionManager.js` |
| `ws_generate_pdf.jsp` | `sm_user/doventeretrocession/ShowDetailRetrocessionManager.js`, `sm_user/doventeretrocession/DoventeRetrocessionManager.js` |
| `ws_transaction.jsp` | `sm_user/doventeretrocession/ShowDetailRetrocessionManager.js`, `sm_user/doventeretrocession/DoventeRetrocessionManager.js` |

### `webservices/sm_user/parameter` (3)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `stockmanagement/etatstock/action/editjourvente.js`, `stockmanagement/inventaire/action/editInventaireManager.js`, `stockmanagement/perime/action/addDatePeromption.js` |
| `ws_data_all.jsp` | `sm_user/parameter/ParameterManager.js` |
| `ws_transaction.jsp` | `stockmanagement/etatstock/action/editjourvente.js`, `stockmanagement/perime/action/addDatePeromption.js`, `stockmanagement/reserve/action/editjourvente.js` |

### `webservices/sm_user/preenregistrement` (3)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `sm_user/detailsvente/action/add.js`, `sm_user/cloturecaisse/CloturercaisseManager.js`, `sm_user/cloturecaisse/action/cloturevente.js` |
| `ws_generate_pdf.jsp` | `DevisListCtr.js` |
| `ws_transaction.jsp` | `sm_user/detailsvente/action/add.js`, `sm_user/cloturecaisse/CloturercaisseManager.js`, `sm_user/cloturecaisse/action/cloturevente.js` |

### `webservices/sm_user/preenregistrementcompteclient` (3)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `sm_user/preenregistrementcompteclient/PreenregistrementcompteclientManager.js` |
| `ws_generate_pdf.jsp` | `sm_user/preenregistrementcompteclient/PreenregistrementcompteclientManager.js` |
| `ws_transaction.jsp` | `sm_user/preenregistrementcompteclient/PreenregistrementcompteclientManager.js` |

### `webservices/sm_user/retrocession` (3)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `sm_user/doventeretrocession/ShowDetailRetrocessionManager.js`, `sm_user/doventeretrocession/DoventeRetrocessionManager.js`, `sm_user/retrocession/retrocessionManager.js` |
| `ws_generate_pdf.jsp` | `sm_user/doventeretrocession/ShowDetailRetrocessionManager.js`, `sm_user/doventeretrocession/DoventeRetrocessionManager.js`, `sm_user/retrocession/retrocessionManager.js` |
| `ws_transaction.jsp` | `sm_user/doventeretrocession/ShowDetailRetrocessionManager.js`, `sm_user/doventeretrocession/DoventeRetrocessionManager.js`, `sm_user/retrocession/retrocessionManager.js` |

### `webservices/tierspayantmanagement/clienttierspayant` (3)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `sm_user/preenregistrementcompteclienttierspayant/PreenregistrementcompteclienttierspayantManager.js`, `sm_user/dovente/action/addTiersPayantItem.js`, `sm_user/dovente/action/addTiersPayant.js` |
| `ws_transaction.jsp` | `sm_user/preenregistrementcompteclienttierspayant/PreenregistrementcompteclienttierspayantManager.js`, `sm_user/dovente/action/addTiersPayantItem.js` |
| `ws_transaction_vente.jsp` | `sm_user/dovente/action/associateTiersPayantItem.js` |

### `webservices/Report/BalanceAgeDetaille` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `Report/BalanceAgeDetaille/BalanceAgeDetailleManager.js` |
| `ws_transaction.jsp` | `Report/BalanceAgeDetaille/BalanceAgeDetailleManager.js` |

### `webservices/Report/BalanceAgeOrganisme` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `Report/BalanceAgeOrganisme/BalanceAgeOrganismeManager.js` |
| `ws_transaction.jsp` | `Report/BalanceAgeOrganisme/BalanceAgeOrganismeManager.js` |

### `webservices/Report/DossierEnAttenteEdition` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `Report/DossierEnAttenteEdition/DossierEnAttenteEditionManager.js` |
| `ws_transaction.jsp` | `Report/DossierEnAttenteEdition/DossierEnAttenteEditionManager.js` |

### `webservices/Report/Operateur` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `Statistics/Operateur.js` |
| `ws_operateur_pdf.jsp` | `Report/statActiviteOperateur/statActiviteOperateurManager.js` |

### `webservices/Report/RapportGestions` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `Statistics/RapporGestions.js` |
| `ws_rapportgestion_pdf.jsp` | `Report/RapportGestions/RapportGestionsManager.js` |

### `webservices/Report/Retrocessions` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `Statistics/Retrocessions.js` |
| `ws_retrocessions_pdf.jsp` | `Report/Retrocessions/RetrocessionsManager.js` |

### `webservices/Report/RuptureStock` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `Statistics/RuptureStoks.js` |
| `ws_rupture_pdf.jsp` | `Report/RuptureStock/RuptureStockManager.js` |

### `webservices/Report/achatfournisseur` (2)

| JSP | Appelée par |
|---|---|
| `ws_achatfour_pdf.jsp` | `Report/AchatsFournisseurs/AchatFournisseursManager.js` |
| `ws_data.jsp` | `Statistics/AchatFournisseurs.js` |

### `webservices/Report/achatfournisseurs` (2)

| JSP | Appelée par |
|---|---|
| `ws_achatsfournisseurs_pdf.jsp` | `Report/listeachatselonfournisseur/AchatManager.js` |
| `ws_data.jsp` | `Statistics/AchatGrossistes.js` |

### `webservices/Report/achatproduits` (2)

| JSP | Appelée par |
|---|---|
| `ws_achatproduct_pdf.jsp` | `Report/achatproduits/AchatProduitManager.js` |
| `ws_data.jsp` | `Statistics/AchatProduits.js` |

### `webservices/Report/analyseventestock` (2)

| JSP | Appelée par |
|---|---|
| `ws_analyseventestock_pdf.jsp` | `Report/analyseventestock/analyseventestockmanager.js` |
| `ws_data.jsp` | `Statistics/AnalyseVente.js` |

### `webservices/Report/comparaisonChiffreAffaire` (2)

| JSP | Appelée par |
|---|---|
| `ws_cafamille_pdf.jsp` | `Report/comparaisonCAFamilles/CAFamilleManager.js` |
| `ws_data.jsp` | `Statistics/FamillesCA.js` |

### `webservices/Report/journaldesventes` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `Report/journaldesventes/journaldesventesmanager.js` |
| `ws_transaction.jsp` | `Report/journaldesventes/journaldesventesmanager.js` |

### `webservices/Report/qtyorder` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `Statistics/OrderQty.js` |
| `ws_years.jsp` | `Report/statsAchats/statAchatsgrid.js` |

### `webservices/Report/statistictva` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `Statistics/TVAS.js` |
| `ws_statistiqueTVA_pdf.jsp` | `Report/resultatstva/TvaManager.js` |

### `webservices/Report/statsAchats` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `Statistics/QtyAchatsStore.js` |
| `ws_generate_pdf.jsp` | `Report/statsAchats/statAchatsgrid.js` |

### `webservices/Report/uniteGratuite` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `Statistics/UgStore.js` |
| `ws_generate_pdf.jsp` | `Report/uniteGratuite/UniteGratuite.js` |

### `webservices/Report/venteavoirclient` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `Statistics/venteavoirclient.js` |
| `ws_venteavoirclient_pdf.jsp` | `Report/venteavoirclient/venteavoirclientkmanager.js` |

### `webservices/Report/ventessocietes` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `Statistics/ventesocietes.js` |
| `ws_ventessocietes_pdf.jsp` | `Report/ventesocietereglement/ventesocietereglementManager.js` |

### `webservices/commandemanagement/lots` (2)

| JSP | Appelée par |
|---|---|
| `ws_lot_pdf.jsp` | `commandemanagement/lots/LotsManager.js` |
| `ws_transaction.jsp` | `configmanagement/famille/FamilleManager.js`, `commandemanagement/lots/LotGrid.js` |

### `webservices/configmanagement/categorieayantdroit` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `sm_user/retrocession/action/addClient.js`, `sm_user/dovente/action/add.js`, `sm_user/alertevent/action/adduserphonetoalert.js` |
| `ws_transaction.jsp` | `sm_user/alertevent/action/adduserphonetoalert.js`, `configmanagement/categorieayantdroit/CategorieAyantdroitManager.js`, `configmanagement/categorieayantdroit/action/add.js` |

### `webservices/configmanagement/categoryclient` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `configmanagement/client/action/add.js`, `configmanagement/categoryclient/CategoryClientManger.js` |
| `ws_transaction.jsp` | `configmanagement/categoryclient/CategoryClientManger.js`, `configmanagement/categoryclient/action/add.js` |

### `webservices/configmanagement/centrepayeur` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `configmanagement/centrepayeur/CentrePayeurManager.js`, `configmanagement/centrepayeur/action/add.js` |
| `ws_transaction.jsp` | `configmanagement/centrepayeur/CentrePayeurManager.js`, `configmanagement/centrepayeur/action/add.js` |

### `webservices/configmanagement/codeacte` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `configmanagement/famille/action/comptabilite.js`, `configmanagement/famille/action/autreinfos.js`, `configmanagement/famille/action/detailArticleOther.js` |
| `ws_transaction.jsp` | `configmanagement/codeacte/CodeActeManager.js` |

### `webservices/configmanagement/comapnies` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `companyStore.js`, `configmanagement/company/company.js`, `configmanagement/client/action/managerCompany.js` |
| `ws_transaction.jsp` | `configmanagement/company/company.js`, `configmanagement/company/action/add.js`, `configmanagement/client/action/managerCompany.js` |

### `webservices/configmanagement/dossiertierspayant` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `configmanagement/dossiertierspayant/DossierTiersPayantManager.js` |
| `ws_transaction.jsp` | `configmanagement/dossiertierspayant/DossierTiersPayantManager.js` |

### `webservices/configmanagement/escomptesociete` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `sm_user/doventeretrocession/ShowDetailRetrocessionManager.js`, `configmanagement/escomptesociete/EscompteSocieteManager.js`, `configmanagement/typesociete/action/add.js` |
| `ws_transaction.jsp` | `configmanagement/escomptesociete/EscompteSocieteManager.js` |

### `webservices/configmanagement/etatarticle` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `configmanagement/etatarticle/EtatArticleManager.js`, `configmanagement/etatarticle/action/add.js`, `commandemanagement/bonlivraison/action/editprice.js` |
| `ws_transaction.jsp` | `configmanagement/etatarticle/EtatArticleManager.js`, `configmanagement/etatarticle/action/add.js`, `commandemanagement/bonlivraison/action/editprice.js` |

### `webservices/configmanagement/fichesociete` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `configmanagement/fichesociete/FicheSocieteManager.js`, `configmanagement/fichesociete/action/add.js` |
| `ws_transaction.jsp` | `configmanagement/fichesociete/FicheSocieteManager.js`, `configmanagement/fichesociete/action/add.js` |

### `webservices/configmanagement/formearticle` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `configmanagement/famille/action/infogenerale.js`, `configmanagement/formearticle/FormeArticleManager.js`, `configmanagement/formearticle/action/add.js` |
| `ws_transaction.jsp` | `configmanagement/formearticle/FormeArticleManager.js`, `configmanagement/formearticle/action/add.js` |

### `webservices/configmanagement/grilleremise` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `configmanagement/workflowremisearticle/action/add.js`, `configmanagement/grilleremise/GrilleRemiseManager.js`, `configmanagement/grilleremise/action/add.js` |
| `ws_transaction.jsp` | `configmanagement/grilleremise/GrilleRemiseManager.js`, `configmanagement/grilleremise/action/add.js` |

### `webservices/configmanagement/imprimantemanager` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `configmanagement/imprimantemanager/ImprimanteManager.js` |
| `ws_transaction.jsp` | `configmanagement/imprimantemanager/ImprimanteManager.js`, `configmanagement/imprimantemanager/action/add.js` |

### `webservices/configmanagement/motifretour` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `configmanagement/motifretour/MotifRetourManager.js`, `commandemanagement/retourfournisseur/action/add.js` |
| `ws_transaction.jsp` | `configmanagement/motifretour/MotifRetourManager.js` |

### `webservices/configmanagement/optimisationquantite` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `configmanagement/optimisationquantite/OptimisationQuantiteManager.js`, `configmanagement/optimisationquantite/action/add.js`, `configmanagement/codegestion/action/add.js` |
| `ws_transaction.jsp` | `configmanagement/optimisationquantite/OptimisationQuantiteManager.js`, `configmanagement/optimisationquantite/action/add.js` |

### `webservices/configmanagement/regimecaisse` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `configmanagement/regimecaisse/RegimecaisseManager.js`, `configmanagement/regimecaisse/action/add.js`, `tierspayantmanagement/tierspayant/TiersPayantManager.js` |
| `ws_transaction.jsp` | `configmanagement/regimecaisse/RegimecaisseManager.js`, `configmanagement/regimecaisse/action/add.js` |

### `webservices/configmanagement/remise` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `sm_user/typeremise/TypeRemiseManager.js`, `sm_user/remise/action/add.js`, `sm_user/doventeretrocession/ShowDetailRetrocessionManager.js` |
| `ws_transaction.jsp` | `sm_user/typeremise/TypeRemiseManager.js`, `sm_user/remise/action/add.js`, `configmanagement/typeremise/TypeRemiseManager.js` |

### `webservices/configmanagement/risque` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `sm_user/retrocession/action/addClient.js`, `sm_user/dovente/action/add.js`, `configmanagement/risque/RisqueManager.js` |
| `ws_transaction.jsp` | `configmanagement/risque/RisqueManager.js`, `configmanagement/risque/action/add.js`, `configmanagement/typerisque/TyperisqueManager.js` |

### `webservices/configmanagement/specialite` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `configmanagement/medecin/action/add.js`, `configmanagement/specialite/SpecialiteManager.js`, `configmanagement/specialite/action/add.js` |
| `ws_transaction.jsp` | `configmanagement/specialite/SpecialiteManager.js`, `configmanagement/specialite/action/add.js` |

### `webservices/configmanagement/tableau` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `configmanagement/famille/action/autreinfos.js`, `configmanagement/tableau/TableauManager.js`, `configmanagement/tableau/action/add.js` |
| `ws_transaction.jsp` | `configmanagement/tableau/TableauManager.js`, `configmanagement/tableau/action/add.js` |

### `webservices/configmanagement/tauxmarque` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `configmanagement/famille/action/comptabilite.js`, `configmanagement/tauxmarque/TauxmarqueManager.js`, `configmanagement/tauxmarque/action/add.js` |
| `ws_transaction.jsp` | `configmanagement/tauxmarque/TauxmarqueManager.js`, `configmanagement/tauxmarque/action/add.js` |

### `webservices/configmanagement/tauxrembourssement` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `configmanagement/famille/action/comptabilite.js`, `configmanagement/tauxrembourssement/TauxrembourssementManager.js`, `configmanagement/tauxrembourssement/action/add.js` |
| `ws_transaction.jsp` | `configmanagement/tauxrembourssement/TauxrembourssementManager.js`, `configmanagement/tauxrembourssement/action/add.js` |

### `webservices/configmanagement/tranche` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `sm_user/doventeretrocession/DoventeRetrocessionManager.js`, `configmanagement/tranche/TrancheManager.js`, `configmanagement/tranche/action/add.js` |
| `ws_transaction.jsp` | `configmanagement/tranche/TrancheManager.js`, `configmanagement/tranche/action/add.js` |

### `webservices/configmanagement/typeremise` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `sm_user/typeremise/TypeRemiseManager.js`, `sm_user/remise/action/add.js`, `configmanagement/typeremise/TypeRemiseManager.js` |
| `ws_transaction.jsp` | `sm_user/typeremise/TypeRemiseManager.js`, `configmanagement/typeremise/TypeRemiseManager.js` |

### `webservices/configmanagement/typerisque` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `configmanagement/risque/action/add.js`, `configmanagement/typerisque/TyperisqueManager.js` |
| `ws_transaction.jsp` | `configmanagement/typerisque/TyperisqueManager.js` |

### `webservices/configmanagement/ville` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `sm_user/suggerercde/action/add.js`, `sm_user/retrocession/action/addClient.js`, `sm_user/client/action/add.js` |
| `ws_transaction.jsp` | `configmanagement/ville/VilleManager.js`, `configmanagement/ville/action/add.js` |

### `webservices/configmanagement/workflowremisearticle` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `configmanagement/workflowremisearticle/WorkflowremisearticleManager.js`, `configmanagement/workflowremisearticle/action/add.js` |
| `ws_transaction.jsp` | `configmanagement/workflowremisearticle/WorkflowremisearticleManager.js`, `configmanagement/workflowremisearticle/action/add.js` |

### `webservices/sm_user/alertevent` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `sm_user/alertevent/AlerteventManager.js`, `sm_user/alertevent/action/add.js`, `sm_user/alertevent/action/adduserphonealertevent.js` |
| `ws_transaction.jsp` | `sm_user/alertevent/AlerteventManager.js`, `sm_user/alertevent/action/add.js`, `sm_user/alertevent/action/adduserphonetoalert.js` |

### `webservices/sm_user/entreestock` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `sm_user/entreestock/EntreestockManager.js`, `sm_user/entreestock/action/add.js` |
| `ws_transaction.jsp` | `sm_user/entreestock/EntreestockManager.js`, `sm_user/entreestock/action/add.js` |

### `webservices/sm_user/info_officine` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `sm_user/info_officine/OfficineManager.js` |
| `ws_transaction.jsp` | `sm_user/info_officine/OfficineManager.js` |

### `webservices/sm_user/language` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `sm_user/user/action/add.js`, `sm_user/user/action/add_1.js`, `sm_user/alertevent/action/add.js` |
| `ws_transaction.jsp` | `sm_user/language/LanguageManager.js` |

### `webservices/sm_user/module` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `sm_user/menu/action/add.js`, `sm_user/module/ModuleManager.js`, `sm_user/role/action/addPrivilege.js` |
| `ws_transaction.jsp` | `sm_user/module/ModuleManager.js` |

### `webservices/sm_user/role` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `sm_user/user/action/add.js`, `sm_user/user/action/add_1.js`, `sm_user/role/RoleManager.js` |
| `ws_transaction.jsp` | `sm_user/role/RoleManager.js`, `sm_user/role/action/add.js` |

### `webservices/sm_user/skin` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `sm_user/user/action/add.js`, `sm_user/user/action/add_1.js`, `sm_user/skin/SkinManager.js` |
| `ws_transaction.jsp` | `sm_user/skin/SkinManager.js` |

### `webservices/sm_user/sous_menu` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `sm_user/sous_menu/SousmenuManager.js`, `sm_user/sous_menu/action/add.js`, `sm_user/remise/RemiseManager.js` |
| `ws_transaction.jsp` | `sm_user/sous_menu/SousmenuManager.js`, `sm_user/sous_menu/action/add.js`, `sm_user/remise/RemiseManager.js` |

### `webservices/sm_user/suggerercde` (2)

| JSP | Appelée par |
|---|---|
| `ws_generate_pdf.jsp` | `sm_user/suggerercde/SuggerercdeManager.js`, `commandemanagement/suggestion/Suggestion_Manager.js` |
| `ws_transaction.jsp` | `sm_user/suggerercde/SuggerercdeManager.js`, `configmanagement/famille/ArticleVendu.js`, `configmanagement/famille/action/detailArticleVendus.js` |

### `webservices/sm_user/typedepense` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `sm_user/typedepense/TypedepenseManager.js` |
| `ws_transaction.jsp` | `sm_user/typedepense/TypedepenseManager.js` |

### `webservices/sm_user/typerecette` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `sm_user/typerecette/TyperecetteManager.js` |
| `ws_transaction.jsp` | `sm_user/typerecette/TyperecetteManager.js` |

### `webservices/stockmanagement/detailsdepot` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `stockmanagement/dodepot/action/add.js` |
| `ws_transaction.jsp` | `stockmanagement/dodepot/action/add.js` |

### `webservices/stockmanagement/etiquette` (2)

| JSP | Appelée par |
|---|---|
| `ws_generate_etiquette_pdf.jsp` | `stockmanagement/etiquette/action/addBis.js` |
| `ws_generate_pdf.jsp` | `stockmanagement/etiquette/EtiquetteManager.js` |

### `webservices/stockmanagement/stockdepot` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `stockmanagement/stockdepot/StockDepotManager.js` |
| `ws_transaction.jsp` | `stockmanagement/stockdepot/StockDepotManager.js` |

### `webservices/tierspayantmanagement/typetierspayant` (2)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `sm_user/editfacture/action/add.js`, `sm_user/diffclient/action/BuyDiffere.js`, `sm_user/factureregle/action/add.js` |
| `ws_transaction.jsp` | `tierspayantmanagement/typetierspayant/TypeTiersPayantManager.js`, `tierspayantmanagement/typetierspayant/action/add.js` |

### `app` (1)

| JSP | Appelée par |
|---|---|
| `security/index.jsp` | `index.jsp`, `general/index.jsp` |

### `index.jsp` (1)

| JSP | Appelée par |
|---|---|
| `index.jsp` | `general/index.jsp`, `Header.js`, `sm_user/mainmenu/MainMenuManager.js` |

### `security` (1)

| JSP | Appelée par |
|---|---|
| `index.jsp` | `index.jsp`, `general/index.jsp` |

### `webservices/Report/facturefournisseurs` (1)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `Statistics/FacturesFournisseurs.js` |

### `webservices/Report/listeArticleVendus` (1)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `Statistics/ArticleVendus.js` |

### `webservices/Report/saisieperimes` (1)

| JSP | Appelée par |
|---|---|
| `ws_article_list.jsp` | `Report/saisieperimes/action/add.js` |

### `webservices/commandemanagement/bonlivraisondetail` (1)

| JSP | Appelée par |
|---|---|
| `ws_data_detail.jsp` | `sm_user/editfacture/action/detailTransactionFournisseur.js` |

### `webservices/commandemanagement/etats` (1)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `configmanagement/grossiste/action/grossisteview.js` |

### `webservices/commandemanagement/order` (1)

| JSP | Appelée par |
|---|---|
| `ws_transaction.jsp` | `sm_user/familleorder/FamilleOrderManager.js`, `sm_user/familleorder/action/add.js`, `sm_user/editbordereau/action/add.js` |

### `webservices/commandemanagement/rupturefournisseur` (1)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `commandemanagement/rupturefournisseur/RuptureFournisseurManager.js` |

### `webservices/configmanagement/etiquette` (1)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `configmanagement/famille/action/autreinfos.js`, `configmanagement/famille/action/detailArticleOther.js`, `configmanagement/famille/action/add.js` |

### `webservices/configmanagement/naturevente` (1)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `sm_user/diffclient/action/BuyDiffere.js`, `sm_user/reglement/action/DoReglement.js` |

### `webservices/configmanagement/tva` (1)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `Statistics/TVAS.js`, `sm_user/doventeretrocession/ShowDetailRetrocessionManager.js`, `sm_user/doventeretrocession/DoventeRetrocessionManager.js` |

### `webservices/configmanagement/typeclient` (1)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `sm_user/retrocession/action/addClient.js`, `sm_user/dovente/action/add.js`, `configmanagement/client/action/add.js` |

### `webservices/configmanagement/typecontrat` (1)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `tierspayantmanagement/tierspayant/TiersPayantManager.js`, `tierspayantmanagement/tierspayant/action/add.js` |

### `webservices/configmanagement/typedepot` (1)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `configmanagement/emplacement/action/add.js` |

### `webservices/configmanagement/typeetiquette` (1)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `configmanagement/famille/action/detailArticleOther.js`, `configmanagement/famille/action/add.js`, `configmanagement/famille/action/detailArticle.js` |

### `webservices/configmanagement/typepassation` (1)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `configmanagement/grossiste/action/grossisteview.js` |

### `webservices/configmanagement/typevente` (1)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `sm_user/doventeretrocession/ShowDetailRetrocessionManager.js`, `sm_user/doventeretrocession/DoventeRetrocessionManager.js` |

### `webservices/menumanagement/ws_tree_menu.jsp` (1)

| JSP | Appelée par |
|---|---|
| `webservices/menumanagement/ws_tree_menu.jsp` | `Navigation.js` |

### `webservices/sm_user/balance` (1)

| JSP | Appelée par |
|---|---|
| `ws_mvts.jsp` | `actions/Balance.js` |

### `webservices/sm_user/etatstock` (1)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `sm_user/etatstock/EtatstockManager.js` |

### `webservices/sm_user/gestcaisse` (1)

| JSP | Appelée par |
|---|---|
| `ws_generate_pdf.jsp` | `GestionCaisseCtr.js` |

### `webservices/sm_user/journalrecette` (1)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `sm_user/journalrecette/JournalRecetteManager.js` |

### `webservices/sm_user/journalvente` (1)

| JSP | Appelée par |
|---|---|
| `ws_generate_facture_attente_edition.jsp` | `sm_user/reglement/FactureenAttendeEditionManager.js` |

### `webservices/sm_user/menu` (1)

| JSP | Appelée par |
|---|---|
| `ws_transaction.jsp` | `sm_user/sous_menu/SousmenuManager.js`, `sm_user/sous_menu/action/add.js`, `sm_user/remise/RemiseManager.js` |

### `webservices/sm_user/migration` (1)

| JSP | Appelée par |
|---|---|
| `ws_transaction.jsp` | `stockmanagement/dodepot/action/importOrder.js`, `configmanagement/famille/action/importOrder.js` |

### `webservices/sm_user/modereglement` (1)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `sm_user/Defferedpaiement/action/add.js`, `sm_user/diffclient/action/BuyDiffere.js`, `sm_user/mvtcaisse/action/add.js` |

### `webservices/sm_user/mvtcaisse` (1)

| JSP | Appelée par |
|---|---|
| `ws_generate_pdf.jsp` | `sm_user/mvtcaisse/action/add.js` |

### `webservices/sm_user/myaccount` (1)

| JSP | Appelée par |
|---|---|
| `ws_transaction.jsp` | `configmanagement/ayantdroit/GenerateAyantDroitReport.js` |

### `webservices/sm_user/prixmodifies` (1)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `sm_user/mouvementprix/Mouvementprixvente.js` |

### `webservices/sm_user/typereglement` (1)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `sm_user/doventeretrocession/ShowDetailRetrocessionManager.js`, `sm_user/doventeretrocession/DoventeRetrocessionManager.js`, `sm_user/diffclient/action/BuyDiffere.js` |

### `webservices/sm_user/vente` (1)

| JSP | Appelée par |
|---|---|
| `ws_data.jsp` | `Statistics/Ventes.js`, `Statistics/Articles.js`, `stockmanagement/etatstock/action/detailTransactionClient.js` |

### `webservices/sm_user/warehouseorder` (1)

| JSP | Appelée par |
|---|---|
| `ws_transaction.jsp` | `sm_user/warehouseorder/WarehouseOrderManager.js` |

### `webservices/usermanagement/ws_login.jsp` (1)

| JSP | Appelée par |
|---|---|
| `webservices/usermanagement/ws_login.jsp` | `app/controler.js` |

### `webservices/usermanagement/ws_transaction.jsp` (1)

| JSP | Appelée par |
|---|---|
| `webservices/usermanagement/ws_transaction.jsp` | `Header.js` |

### `webservices/ws_emplacement.jsp` (1)

| JSP | Appelée par |
|---|---|
| `webservices/ws_emplacement.jsp` | `actions/Doublons.js` |

## JSP non citées (159)

`general/app/view/sm_user/typefacture/ws_data.jsp`, `webservices/MOBILES/configurationmanager/inventaire/ws_data_detail.jsp`, `webservices/MOBILES/configurationmanager/inventaire/ws_emplacement_inventaire.jsp`, `webservices/MOBILES/configurationmanager/inventaire/ws_transaction.jsp`, `webservices/MOBILES/utilisateur/ws_login.jsp`, `webservices/Report/BalanceAgeGenerale/ws_data.jsp`, `webservices/Report/BalanceAgeGenerale/ws_transaction.jsp`, `webservices/Report/Operateur/ws_graphe_data.jsp`, `webservices/Report/comparaisonChiffreAffaire/ws_transaction.jsp`, `webservices/Report/journaldesventes/ws_journaldesventes_pdf.jsp`, `webservices/Report/listeArticleVendus/ws_statistiquevente_pdf.jsp`, `webservices/Report/qtyorder/ws_generate_pdf.jsp`, `webservices/Report/recapactivities/ws_data.jsp`, `webservices/Report/saisieperimes/ws_data_pending.jsp`, `webservices/commandemanagement/bonlivraison/ws_data.jsp`, `webservices/commandemanagement/bonlivraison/ws_generate_etiquette_pdf_legacy.jsp`, `webservices/commandemanagement/bonlivraisondetail/ws_data.jsp`, `webservices/commandemanagement/lots/ws_data.jsp`, `webservices/commandemanagement/order/ws_data_init.jsp`, `webservices/commandemanagement/order/ws_data_order_passed_grossiste.jsp`, `webservices/commandemanagement/order/ws_data_suivi_grossiste.jsp`, `webservices/commandemanagement/orderdetail/ws_data.jsp`, `webservices/commandemanagement/orderdetail/ws_data_passed.jsp`, `webservices/commandemanagement/orderdetail/ws_data_suivi.jsp`, `webservices/commandemanagement/typesuggestion/ws_data.jsp`, `webservices/commandemanagement/ws_data_order_passed_grossiste.jsp`, `webservices/configmanagement/client/clientayantdroits.jsp`, `webservices/configmanagement/client/clienttierspayants.jsp`, `webservices/configmanagement/client/ws_clientTierspayant.jsp`, `webservices/configmanagement/client/ws_compteclient_tierspayant_transaction.jsp`, `webservices/configmanagement/client/ws_compteclt_tierspayant_data.jsp`, `webservices/configmanagement/client/ws_vente.jsp`, `webservices/configmanagement/compteclienttierspayant/ws_init_data.jsp`, `webservices/configmanagement/compteclienttierspayant/ws_transaction.jsp`, `webservices/configmanagement/etiquette/ws_transaction.jsp`, `webservices/configmanagement/fabriquant/ws_data_other.jsp`, `webservices/configmanagement/facture/ws_transaction.jsp`, `webservices/configmanagement/famillegrossiste/ws_data.jsp`, `webservices/configmanagement/famillegrossiste/ws_transaction.jsp`, `webservices/configmanagement/groupe/facture_data.jsp`, `webservices/configmanagement/groupe/ws_allbons.jsp`, `webservices/configmanagement/groupe/ws_data.jsp`, `webservices/configmanagement/groupe/ws_facturation.jsp`, `webservices/configmanagement/groupe/ws_groupeInvoices.jsp`, `webservices/configmanagement/groupe/ws_groupe_data.jsp`, `webservices/configmanagement/groupe/ws_groupebons.jsp`, `webservices/configmanagement/groupe/ws_invoiceDetails.jsp`, `webservices/configmanagement/groupe/ws_invoices.jsp`, `webservices/configmanagement/groupe/ws_reglement.jsp`, `webservices/configmanagement/groupe/ws_selectedBons.jsp`, `webservices/configmanagement/imprimantemanager/ws_generate_pdf.jsp`, `webservices/configmanagement/modereglement/ws_data.jsp`, `webservices/configmanagement/naturevente/ws_transaction.jsp`, `webservices/configmanagement/remise/ws_data_dovente.jsp`, `webservices/configmanagement/retourfournisseur/ws_data.jsp`, `webservices/configmanagement/retourfournisseur/ws_transaction.jsp`, `webservices/configmanagement/retourfournisseurdetail/ws_data.jsp`, `webservices/configmanagement/retourfournisseurdetail/ws_transaction.jsp`, `webservices/configmanagement/tierspayant/ws_data.jsp`, `webservices/configmanagement/typeclient/ws_transaction.jsp`, `webservices/configmanagement/typecontrat/ws_transaction.jsp`, `webservices/configmanagement/typepassation/ws_transaction.jsp`, `webservices/configmanagement/typevente/ws_transaction.jsp`, `webservices/configmanagement/typevente/ws_typeventes.jsp`, `webservices/dashboard/DailyCA.jsp`, `webservices/dashboard/ws_AchatByGrossistes.jsp`, `webservices/dashboard/ws_achat_by_grossiste.jsp`, `webservices/dashboard/ws_best_clients.jsp`, `webservices/dashboard/ws_data_mvt.jsp`, `webservices/dashboard/ws_data_top5.jsp`, `webservices/dashboard/ws_data_top5CA.jsp`, `webservices/dashboard/ws_graphe_data.jsp`, `webservices/sm_user/RecapOrganisme/ws_data.jsp`, `webservices/sm_user/RecapOrganisme/ws_recapOrganisme_pdf.jsp`, `webservices/sm_user/alertevent/ws_privilege.jsp`, `webservices/sm_user/detaildretrocession/ws_data_initial.jsp`, `webservices/sm_user/detaildretrocession/ws_init_data.jsp`, `webservices/sm_user/detailsvente/ws_data_avoir.jsp`, `webservices/sm_user/detailsvente/ws_data_litige_customer.jsp`, `webservices/sm_user/detailsvente/ws_generate_vac_pdf.jsp`, `webservices/sm_user/diffclient/ws_customer_dataOld.jsp`, `webservices/sm_user/facturation/ws_data.jsp`, `webservices/sm_user/facturation/ws_data_detail_tiers_payant.jsp`, `webservices/sm_user/facturation/ws_data_details_vente.jsp`, `webservices/sm_user/famille/ws_data_disable.jsp`, `webservices/sm_user/famille/ws_data_initial_last_goodversion.jsp`, `webservices/sm_user/famille/ws_data_jdbc_dci.jsp`, `webservices/sm_user/famille/ws_data_order.jsp`, `webservices/sm_user/famille/ws_data_peremption.jsp`, `webservices/sm_user/famille/ws_data_retourfrs_base.jsp`, `webservices/sm_user/famille/ws_get_famille.jsp`, `webservices/sm_user/gestcaisse/ws_data.jsp`, `webservices/sm_user/gestcaisse/ws_gestioncaisse_pdf.jsp`, `webservices/sm_user/journalvente/ws_facture_ententeedition.jsp`, `webservices/sm_user/journalvente/ws_facture_subrogatoire.jsp`, `webservices/sm_user/journalvente/ws_generate_facture_subrogatoire_pdf.jsp`, `webservices/sm_user/modereglement/ws_transaction.jsp`, `webservices/sm_user/notification/ws_data.jsp`, `webservices/sm_user/outboudmessage/ws_data.jsp`, `webservices/sm_user/outboudmessage/ws_privilege.jsp`, `webservices/sm_user/ouverturecaisse/ws_data.jsp`, `webservices/sm_user/ouverturecaisse/ws_generate_pdf.jsp`, `webservices/sm_user/ouverturecaisse/ws_transaction.jsp`, `webservices/sm_user/preenregistrementcompteclient/ws_generate_xls.jsp`, `webservices/sm_user/prixmodifies/ws_generate_pdf.jsp`, `webservices/sm_user/prixmodifies/ws_transaction.jsp`, `webservices/sm_user/reglement/ws_data.jsp`, `webservices/sm_user/reglement/ws_data_facture_paid.jsp`, `webservices/sm_user/reglement/ws_data_reglement.jsp`, `webservices/sm_user/reglement/ws_details_reglement.jsp`, `webservices/sm_user/role/ws_data_privilege.jsp`, `webservices/sm_user/suggerercde/ws_generate_xls.jsp`, `webservices/sm_user/tsnapshopdalyrecette/ws_data.jsp`, `webservices/sm_user/tsnapshopdalyrecette/ws_transaction.jsp`, `webservices/sm_user/typemvtcaisse/ws_transaction.jsp`, `webservices/sm_user/typereglement/ws_transaction.jsp`, `webservices/sm_user/utilisateur/ws_privilege.jsp`, `webservices/sm_user/vente/datas.jsp`, `webservices/sm_user/vente/ws_data_depot.jsp`, `webservices/sm_user/vente/ws_data_old_goodversion.jsp`, `webservices/sm_user/vente/ws_data_tierspayant.jsp`, `webservices/sm_user/vente/ws_data_user_sell.jsp`, `webservices/sm_user/vente/ws_generate_pdf.jsp`, `webservices/sm_user/vente/ws_generate_vente_withoutbon_pdf.jsp`, `webservices/sm_user/vente/ws_vente_without_bon.jsp`, `webservices/stockmanagement/depot/ws_data.jsp`, `webservices/stockmanagement/detailsdepot/ws_generate_facture_pdf.jsp`, `webservices/stockmanagement/detailsdepot/ws_generate_pdf.jsp`, `webservices/stockmanagement/detailsdepot/ws_init_data.jsp`, `webservices/stockmanagement/etiquette/ws_data.jsp`, `webservices/stockmanagement/etiquette/ws_data_detail.jsp`, `webservices/stockmanagement/etiquette/ws_data_type_etiquette.jsp`, `webservices/stockmanagement/etiquette/ws_transaction.jsp`, `webservices/stockmanagement/inventaire/ws_data.jsp`, `webservices/stockmanagement/inventaire/ws_data_article_unitaire.jsp`, `webservices/stockmanagement/inventaire/ws_data_inventaire_famille.jsp`, `webservices/stockmanagement/inventaire/ws_transaction.jsp`, `webservices/stockmanagement/reserve/ws_generate_pdf.jsp`, `webservices/stockmanagement/stock/ws_data_jour.jsp`, `webservices/stockmanagement/stock/ws_generate_valorisation_with_criteria_pdf.jsp`, `webservices/stockmanagement/stock/ws_productbyzone.jsp`, `webservices/stockmanagement/stock/ws_update.jsp`, `webservices/stockmanagement/stock/ws_valorisation.jsp`, `webservices/stockmanagement/stock/ws_zone.jsp`, `webservices/stockmanagement/suivistockvente/ws_data_detailentree.jsp`, `webservices/stockmanagement/suivistockvente/ws_data_detailsortie_famille.jsp`, `webservices/stockmanagement/suivistockvente/ws_data_mouvement_inventaire.jsp`, `webservices/stockmanagement/suivistockvente/ws_data_mouvement_stock.jsp`, `webservices/stockmanagement/suivistockvente/ws_data_statVente_famille.jsp`, `webservices/stockmanagement/suivistockvente/ws_datas.jsp`, `webservices/tierspayantmanagement/tierspayant/ws_client_data.jsp`, `webservices/tierspayantmanagement/tierspayant/ws_client_transaction.jsp`, `webservices/tierspayantmanagement/tierspayant/ws_data_balance_agee.jsp`, `webservices/tierspayantmanagement/tierspayant/ws_data_balance_agee_detail.jsp`, `webservices/tierspayantmanagement/tierspayant/ws_data_balance_agee_recapitulatifdetail.jsp`, `webservices/tierspayantmanagement/tierspayant/ws_data_model.jsp`, `webservices/tierspayantmanagement/tierspayant/ws_data_search.jsp`, `webservices/tierspayantmanagement/tierspayant/ws_data_tierspayant.jsp`, `webservices/tierspayantmanagement/tierspayant/ws_tierspayantaccount.jsp`
