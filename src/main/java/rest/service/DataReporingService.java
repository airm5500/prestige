/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service;

import commonTasks.dto.ArticleDTO;
import commonTasks.dto.FamilleArticleStatDTO;
import dal.TUser;
import enumeration.MargeEnum;
import java.io.IOException;
import java.util.List;
import javax.ejb.Local;
import org.apache.commons.lang3.tuple.Pair;
import org.json.JSONException;
import org.json.JSONObject;

/**
 *
 * @author DICI
 */
@Local
public interface DataReporingService {

    Pair<Long, List<FamilleArticleStatDTO>> margeProduitsVendus(String dtStart, String dtEnd, String codeFamile,
            Integer critere, String query, TUser u, String codeRayon, String codeGrossiste, int start, int limit,
            boolean all, MargeEnum filtre);

    JSONObject margeProduitsVendus(String dtStart, String dtEnd, String codeFamile, Integer critere, String query,
            TUser u, String codeRayon, String codeGrossiste, int start, int limit, MargeEnum filtre)
            throws JSONException;

    Pair<Long, List<FamilleArticleStatDTO>> statsUnintesVendues(String dtStart, String dtEnd, String codeFamile,
            String query, TUser u, String codeRayon, String codeGrossiste, int start, int limit, boolean all);

    JSONObject statsUnintesVendues(String dtStart, String dtEnd, String codeFamile, String query, TUser u,
            String codeRayon, String codeGrossiste, int start, int limit) throws JSONException;

    Pair<Long, List<FamilleArticleStatDTO>> statsUnintesVenduesparGamme(String dtStart, String dtEnd, String codeFamile,
            String query, TUser u, String codeRayon, String codeGrossiste, String gammeId, int start, int limit,
            boolean all);

    Pair<Long, List<FamilleArticleStatDTO>> statsUnintesVenduesparLaboratoire(String dtStart, String dtEnd,
            String codeFamile, String query, TUser u, String codeRayon, String codeGrossiste, String laboratoireId,
            int start, int limit, boolean all);

    JSONObject statsUnintesVenduesparLaboratoire(String dtStart, String dtEnd, String codeFamile, String query, TUser u,
            String codeRayon, String codeGrossiste, String laboratoireId, int start, int limit) throws JSONException;

    JSONObject statsUnintesVenduesparGamme(String dtStart, String dtEnd, String codeFamile, String query, TUser u,
            String codeRayon, String codeGrossiste, String gammeId, int start, int limit) throws JSONException;

    List<ArticleDTO> statsArticlesInvendus(String dtStart, String dtEnd, String codeFamile, String query, TUser u,
            String codeRayon, String codeGrossiste, int stock, MargeEnum stockFiltre, int start, int limit,
            boolean all);

    JSONObject statsArticlesInvendus(String dtStart, String dtEnd, String codeFamile, String query, TUser u,
            String codeRayon, String codeGrossiste, int stock, MargeEnum stockFiltre, int start, int limit)
            throws JSONException;

    byte[] exportArticlesInvendusCsv(String dtStart, String dtEnd, String codeFamile, String query, TUser u,
            String codeRayon, String codeGrossiste, int stock, MargeEnum stockFiltre) throws IOException, JSONException;

    byte[] exportArticlesInvendusExcel(String dtStart, String dtEnd, String codeFamile, String query, TUser u,
            String codeRayon, String codeGrossiste, int stock, MargeEnum stockFiltre) throws IOException, JSONException;

    JSONObject createInventaireArticlesInvendus(String dtStart, String dtEnd, String codeFamile, String query, TUser u,
            String codeRayon, String codeGrossiste, int stock, MargeEnum stockFiltre) throws JSONException;
}
