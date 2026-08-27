/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service;

import commonTasks.dto.ArticleDTO;
import commonTasks.dto.MvtArticleParams;
import commonTasks.dto.MvtProduitCompletDTO;
import commonTasks.dto.MvtProduitDTO;
import commonTasks.dto.Params;
import commonTasks.dto.QueryDTO;
import commonTasks.dto.ValorisationDTO;
import dal.TFamille;
import dal.TFamilleGrossiste;
import dal.TFamilleStock;
import dal.TGrossiste;
import dal.TUser;
import java.time.LocalDate;
import java.util.List;
import javax.ejb.Local;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.dto.CreationProduitDTO;
import rest.service.dto.UpdateCipDTO;

/**
 *
 * @author DICI
 */
@Local
public interface ProduitService {

    JSONObject produitDesactives(QueryDTO dto, boolean all) throws JSONException;

    long produitsDesactivesCount(QueryDTO params);

    JSONObject supprimerProduitDesactive(String id, TUser tUser) throws JSONException;

    JSONObject activerProduitDesactive(String id, TUser tUser) throws JSONException;

    JSONObject desactiverProduitDesactive(String id, TUser tUser) throws JSONException;

    List<TFamilleStock> getByFamille(String idFamille);

    List<TFamilleGrossiste> getFamilleGrossistesByFamille(String idFamille);

    List<MvtProduitDTO> suivitMvtArcticle(MvtArticleParams params);

    JSONObject suivitMvtArcticleViewDatas(MvtArticleParams params) throws JSONException;

    /**
     * Suivi mouvement article COMPLET : quantites du suivi general completees par les mouvements internes rayon/reserve
     * et les stocks rayon, reserve et total. La liste couvre l'union des produits ayant bouge dans HMvtProduit OU dans
     * t_mouvement_reserve sur la periode. Le suivi 2 reste inchange.
     */
    JSONObject suivitMvtArticleCompletViewDatas(MvtArticleParams params) throws JSONException;

    /** Lignes du suivi complet (memes filtres), pour l'export. */
    List<MvtProduitCompletDTO> suivitMvtArticleComplet(MvtArticleParams params);

    /** Export Excel du suivi complet : porte sur toutes les lignes filtrees, pas sur la page affichee. */
    byte[] exportSuiviMvtArticleComplet(MvtArticleParams params) throws java.io.IOException;

    /**
     * Impression PDF du suivi complet en A4 paysage (iText, sans template Jasper a deployer). Memes lignes que l'ecran,
     * toutes pages confondues ; l'utilisateur figure dans le pied de page.
     */
    byte[] exportSuiviMvtArticleCompletPdf(MvtArticleParams params, TUser user);

    /**
     * Fiche PDF des mouvements d'UN article, jour par jour, en A4 paysage : stocks rayon et reserve debut/fin de
     * journee, flux classiques, mouvements internes de reserve et ligne TOTAL. Remplace pour l'ecran complet la fiche
     * Jasper SUIVIMVT qui ignore la reserve. {@code params} porte produitId, periode et magasinId.
     */
    byte[] exportFicheArticleCompletPdf(MvtArticleParams params, TUser user);

    /**
     * Detail jour par jour du suivi complet : agregats du suivi general (suivitEclate) completes des mouvements
     * internes de reserve par jour. Un jour ou seule la reserve a bouge apparait aussi, avec les stocks rayon debut/fin
     * lus dans la trace de reserve.
     */
    JSONObject suivitEclateCompletViewDatas(LocalDate dtStart, LocalDate dtEnd, String produitId, String empl)
            throws JSONException;

    JSONObject findAllFamilleArticle(String query) throws JSONException;

    JSONObject findAllFabricants(String query) throws JSONException;

    JSONObject findAllRayons(String query) throws JSONException;

    JSONObject suivitEclateViewDatas(LocalDate dtStart, LocalDate dtEnd, String produitId, String empl)
            throws JSONException;

    MvtProduitDTO suivitEclate(LocalDate dtStart, LocalDate dtEnd, String produitId, String empl);

    JSONObject suivitEclateVentes(LocalDate dtStart, LocalDate dtEnd, String produitId, String empl)
            throws JSONException;

    JSONObject suivitEclateAjustement(LocalDate dtStart, LocalDate dtEnd, String produitId, String empl,
            boolean positif) throws JSONException;

    JSONObject suivitEclateDecond(LocalDate dtStart, LocalDate dtEnd, String produitId, String empl, boolean positif)
            throws JSONException;

    JSONObject suivitEclateInv(LocalDate dtStart, LocalDate dtEnd, String produitId, String empl) throws JSONException;

    JSONObject suivitEclateAnnulation(LocalDate dtStart, LocalDate dtEnd, String produitId, String empl)
            throws JSONException;

    JSONObject suivitEclatePerime(LocalDate dtStart, LocalDate dtEnd, String produitId, String empl)
            throws JSONException;

    JSONObject suivitEclateEntree(LocalDate dtStart, LocalDate dtEnd, String produitId, String empl)
            throws JSONException;

    JSONObject suivitEclateRetourFour(LocalDate dtStart, LocalDate dtEnd, String produitId, String empl)
            throws JSONException;

    JSONObject suivitEclateRetourDepot(LocalDate dtStart, LocalDate dtEnd, String produitId, String empl)
            throws JSONException;

    TFamille findById(String produitId);

    JSONObject valorisationStock(int mode, LocalDate dtStart, String lgGROSSISTEID, String lgFAMILLEARTICLEID,
            String lgZONEGEOID, String end, String begin, String emplacementId) throws JSONException;

    /**
     * Compare, pour une date passee, la valorisation issue de l'archive JSON et celle issue du releve relationnel.
     * Outil de validation de la migration : aucune ecriture, les deux sources sont lues telles quelles.
     */
    JSONObject comparerValorisationHistorique(int mode, LocalDate dtStart, String lgGROSSISTEID,
            String lgFAMILLEARTICLEID, String lgZONEGEOID, String end, String begin, String emplacementId,
            String typeStock) throws JSONException;

    ValorisationDTO getValeurStockPdf(int mode, LocalDate dtStart, String lgGROSSISTEID, String lgFAMILLEARTICLEID,
            String lgZONEGEOID, String end, String begin, String emplacementId, String typeStock);

    JSONObject createProduit(CreationProduitDTO creationProduit);

    JSONObject createProduitDetail(CreationProduitDTO creationProduit);

    JSONObject updateProduitDetail(CreationProduitDTO creationProduit, String idProduit);

    TFamille createProduitFromRupture(CreationProduitDTO creationProduit, TGrossiste grossiste);

    TFamilleGrossiste createTFamilleGrossisteFromRupture(CreationProduitDTO creationProduit, TFamille famille,
            TGrossiste grossiste);

    JSONObject updateCodeCip(String familleId, UpdateCipDTO dto);

    // Suivi des unites gratuites : produits ayant du stock UG (intUG > 0) pour l'emplacement de l'utilisateur
    JSONObject suiviUg(TUser user, String query, int start, int limit) throws JSONException;

    List<ArticleDTO> suiviUgArticles(TUser user, String query);
}
