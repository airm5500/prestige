/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service;

import commonTasks.dto.FamilleArticleStatDTO;
import commonTasks.dto.VenteDetailsDTO;
import dal.TUser;
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
public interface FamilleArticleService {

    Pair<FamilleArticleStatDTO, List<FamilleArticleStatDTO>> statistiqueParFamilleArticle(String dtStart, String dtEnd,
            String codeFamile, String query, TUser u, String codeRayon, String codeGrossiste);

    JSONObject statistiqueParFamilleArticleView(String dtStart, String dtEnd, String codeFamile, String query, TUser u,
            String codeRayon, String codeGrossiste) throws JSONException;

    List<VenteDetailsDTO> geVingtQuatreVingt(String dtStart, String dtEnd, TUser u, String codeFamile, String codeRayon,
            String codeGrossiste, int start, int limit, boolean all, boolean qtyOrCa);

    JSONObject geVingtQuatreVingt(String dtStart, String dtEnd, TUser u, String codeFamile, String codeRayon,
            String codeGrossiste, int start, int limit, boolean qtyOrCa);

    Pair<FamilleArticleStatDTO, List<FamilleArticleStatDTO>> statistiqueParRayons(String dtStart, String dtEnd,
            String codeFamile, String query, TUser u, String codeRayon, String codeGrossiste);

    Pair<FamilleArticleStatDTO, List<FamilleArticleStatDTO>> statistiqueParGrossistes(String dtStart, String dtEnd,
            String codeFamile, String query, TUser u, String codeRayon, String codeGrossiste);

    JSONObject statistiqueParRayonsView(String dtStart, String dtEnd, String codeFamile, String query, TUser u,
            String codeRayon, String codeGrossiste) throws JSONException;

    JSONObject statistiqueParGrossistesView(String dtStart, String dtEnd, String codeFamile, String query, TUser u,
            String codeRayon, String codeGrossiste) throws JSONException;

    JSONObject statistiqueParFamilleArticleViewVeto(String dtStart, String dtEnd, String codeFamile, String query,
            TUser u, String codeRayon, String codeGrossiste) throws JSONException;

    Pair<FamilleArticleStatDTO, List<FamilleArticleStatDTO>> statistiqueParFamilleArticleVeto(String dtStart,
            String dtEnd, String codeFamile, String query, TUser u, String codeRayon, String codeGrossiste);
}
