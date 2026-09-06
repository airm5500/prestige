/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service;

import commonTasks.dto.FactureDTO;
import commonTasks.dto.FactureDetailDTO;
import commonTasks.dto.Mode;
import commonTasks.dto.ModelFactureDTO;
import commonTasks.dto.ReportTypeTiersPayantFactureDTO;
import commonTasks.dto.VenteDetailsDTO;
import dal.TFacture;
import dal.TModelFacture;
import java.util.List;
import javax.ejb.Local;
import org.json.JSONException;
import org.json.JSONObject;

/**
 *
 * @author kkoffi
 */
@Local
public interface FacturationService {

    List<ModelFactureDTO> getAll();

    TFacture findFactureById(String idFacture);

    List<TFacture> findArangeOfFacture(List<String> ids);

    JSONObject update(String id, ModelFactureDTO modelFactureDTO) throws JSONException;

    JSONObject groupetierspayant(String query) throws JSONException;

    /**
     * Bons a facturer. {@code carnetDepot} separe les deux circuits : faux, on ne voit que les tiers payants ordinaires
     * ; vrai, on ne voit que les carnets depot. Le meme drapeau sert au comptage, sans quoi la pagination annoncerait
     * un nombre de pages sans rapport avec ce qu'elle affiche.
     */
    JSONObject provisoires(Mode mode, String groupTp, String typetp, String tpid, String codegroup, String dtStart,
            String dtEnd, String query, int start, int limit, boolean carnetDepot) throws JSONException;

    List<FactureDTO> provisoires10(String groupTp, String typetp, String tpid, String codegroup, boolean isTemplate,
            boolean all, int start, int limit, boolean carnetDepot);

    /**
     * Factures des carnets depot, provisoires ET definitives, pour l'onglet dedie de « Gerer carnet depot ».
     *
     * @param tpid
     *            restreint a un carnet precis ; vide ou null, tous les carnets depot
     */
    JSONObject facturesCarnetDepot(String tpid, int start, int limit) throws JSONException;

    /** Liste paginee des factures. {@code carnetDepot} y separe les deux circuits, comme pour les bons (RG-02). */
    JSONObject provisoires10(String groupTp, String typetp, String tpid, String codegroup, boolean isTemplate,
            int start, int limit, boolean carnetDepot) throws JSONException;

    void removeFacture(String idFacture);

    /**
     * Supprime plusieurs factures provisoires, comme le fait le bouton ligne a ligne. Une facture devenue definitive
     * n'est pas supprimee : elle est nommee dans le compte rendu.
     */
    JSONObject supprimerProvisoires(List<String> ids);

    /** Factures provisoires d'une periode, avec les filtres de l'ecran. Ne supprime rien. */
    List<FactureDTO> provisoiresDeLaPeriode(String groupTp, String typetp, String tpid, String codegroup,
            String dtStart, String dtEnd, boolean carnetDepot);

    List<FactureDetailDTO> findFacturesDetailsByFactureId(String id);

    List<VenteDetailsDTO> findArticleByFactureDetailsId(String id);

    List<VenteDetailsDTO> findArticleByFacturId(String id);

    TModelFacture modelFactureById(String lgMODELFACTUREID);

    /**
     * Modèles de facture proposés dans la liste déroulante de la fiche tiers payant.
     *
     * Reprend à l'identique la sélection de l'ancienne JSP : uniquement les modèles ACTIFS, filtrés sur le libellé ou
     * la valeur. La pagination se fait en base et non en mémoire — l'ancienne page chargeait la liste entière puis en
     * découpait une tranche.
     *
     * @param query
     *            texte saisi dans la liste déroulante, vide pour tout voir
     * @param start
     *            rang du premier élément
     * @param limit
     *            nombre d'éléments souhaités
     */
    JSONObject modelFacturesPourListeDeroulante(String query, int start, int limit) throws JSONException;

    ReportTypeTiersPayantFactureDTO exportReleveFacture(String invoiceFilter, String tiersPayantId, String codeFacture,
            String searchTerm, String dtStart, String dtEnd);
}
