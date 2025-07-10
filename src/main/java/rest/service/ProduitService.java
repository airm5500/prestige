/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service;

import commonTasks.dto.MvtArticleParams;
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

    Params getValeurStock(int mode, LocalDate dtStart, String lgGROSSISTEID, String lgFAMILLEARTICLEID,
            String lgZONEGEOID, String end, String begin, String emplacementId);

    ValorisationDTO getValeurStockPdf(int mode, LocalDate dtStart, String lgGROSSISTEID, String lgFAMILLEARTICLEID,
            String lgZONEGEOID, String end, String begin, String emplacementId);

    JSONObject createProduit(CreationProduitDTO creationProduit);

    JSONObject createProduitDetail(CreationProduitDTO creationProduit);

    JSONObject updateProduitDetail(CreationProduitDTO creationProduit, String idProduit);

    TFamille createProduitFromRupture(CreationProduitDTO creationProduit, TGrossiste grossiste);

    TFamilleGrossiste createTFamilleGrossisteFromRupture(CreationProduitDTO creationProduit, TFamille famille,
            TGrossiste grossiste);
}
