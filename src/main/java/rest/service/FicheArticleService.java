/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service;

import commonTasks.dto.AddLot;
import commonTasks.dto.ArticleDTO;
import commonTasks.dto.VenteDetailsDTO;
import dal.TUser;
import enumeration.MargeEnum;
import java.util.Date;
import java.util.List;
import javax.ejb.Local;
import org.apache.commons.lang3.tuple.Pair;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.dto.UpdateProduit;

/**
 *
 * @author DICI
 */
@Local
public interface FicheArticleService {

    JSONObject produitPerimes(String query, int nbreMois, String dtStart, String dtEnd, String codeFamile,
            String codeRayon, String codeGrossiste, int start, int limit) throws JSONException;

    Pair<VenteDetailsDTO, List<VenteDetailsDTO>> produitPerimes(String query, int nbreMois, String dtStart,
            String dtEnd, String codeFamile, String codeRayon, String codeGrossiste, int start, int limit, boolean all);

    JSONObject modifierArticleDatePeremption(String lgFAMILLEID, String dtperemption) throws JSONException;

    List<ArticleDTO> articleSurStock(TUser u, String query, String codeFamile, String codeRayon, String codeGrossiste,
            int nbreMois, int nbreConsommation, int start, int limit, boolean all);

    JSONObject articleSurStock(TUser u, String query, String codeFamile, String codeRayon, String codeGrossiste,
            int nbreMois, int nbreConsommation, int start, int limit) throws JSONException;

    JSONObject comparaisonStock(TUser u, String query, MargeEnum filtreStock, MargeEnum filtreSeuil, String codeFamile,
            String codeRayon, String codeGrossiste, int stock, int seuil, int start, int limit) throws JSONException;

    List<ArticleDTO> comparaisonStock(TUser u, String query, MargeEnum filtreStock, MargeEnum filtreSeuil,
            String codeFamile, String codeRayon, String codeGrossiste, int stock, int seuil, int start, int limit,
            boolean all);

    Date getDateDerniereVente(String idProduit, String empl);

    Date getDateEntreeStock(String idProduit);

    Date getDateBonLivraison(String idProduit);

    Date getDateInventaire(String idProduit, String empl);

    List<VenteDetailsDTO> produitConsomamation(TUser u, String query, String dtStart, String dtEnd, String id);

    JSONObject produitConsomamation(TUser u, String query, String dtStart, String dtEnd, String id, int start,
            int limit) throws JSONException;

    boolean updateProduitAccount(String id, boolean account);

    JSONObject produitAccounts(String query, String rayon, String filtre, TUser u, int start, int limit)
            throws JSONException;

    JSONObject saisiePerimes(String query, String dtStart, String dtEnd, TUser u, String codeFamile, String codeRayon,
            String codeGrossiste, int start, int limit) throws JSONException;

    List<VenteDetailsDTO> saisiePerimes(String query, String dtStart, String dtEnd, String codeFamile, String codeRayon,
            String codeGrossiste, Integer grouby, int start, int limit, boolean all);

    void addLot(AddLot addLot);

    void updateProduitLiteInfo(UpdateProduit updateProduit);
}
