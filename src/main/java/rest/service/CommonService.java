/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service;

import commonTasks.dto.CategorieAyantdroitDTO;
import commonTasks.dto.ComboDTO;
import commonTasks.dto.ReglementDTO;
import commonTasks.dto.RemiseDTO;
import commonTasks.dto.RisqueDTO;
import commonTasks.dto.TypeRemiseDTO;
import commonTasks.dto.UserDTO;
import dal.TImprimante;
import dal.TMotifRetour;
import dal.TNatureVente;
import dal.TOfficine;
import dal.TPrivilege;
import dal.TTypeVente;
import dal.TVille;
import dal.MotifAjustement;
import dal.MotifRetourCarnet;
import dal.TUser;
import java.util.List;
import javax.ejb.Local;
import javax.print.PrintService;
import org.json.JSONException;
import org.json.JSONObject;

/**
 *
 * @author Kobena
 */
@Local
public interface CommonService {

    List<ReglementDTO> findReglements();

    List<ReglementDTO> findReglements(String id);

    List<UserDTO> findUsers(int start, int limit, String query, String empl);

    long findUsers(String query, String empl);

    List<UserDTO> findUsers(int start, int limit, String query, String empl, boolean excludeAdmin);

    long findUsers(String query, String empl, boolean excludeAdmin);

    List<TTypeVente> findAllTypeVente();

    List<TTypeVente> findTypeVente();

    List<TTypeVente> typeventeDevis();

    List<TypeRemiseDTO> findAllTTypeRemises();

    List<RemiseDTO> findAllRemise(String typeId);

    List<RemiseDTO> findAllRemise();

    List<TNatureVente> findNatureVente();

    boolean hasAuthority(List<TPrivilege> lstTPrivilege, String authorityName);

    boolean canShowAllSales(List<TPrivilege> lstTPrivilege);

    int nombreTickets(String param);

    boolean voirNumeroTicket();

    TOfficine findOfficine();

    PrintService findPrintService(String printerName);

    PrintService findPrintService();

    TImprimante findImprimanteByName();

    List<TVille> findVilles(String query);

    List<RisqueDTO> findRisques(String query);

    List<CategorieAyantdroitDTO> findCategorieAyantdroits(String query);

    boolean sansBon();

    Integer maximunproduit();

    List<ComboDTO> loadGroupeFournisseur();

    List<ComboDTO> loadFournisseur(String query);

    List<ComboDTO> loadRayons(String query);

    List<ComboDTO> familleArticles(String query);

    List<ComboDTO> gammeProduits(String query);

    List<ComboDTO> laboratoiresProduits(String query);

    boolean afficheurActif();

    JSONObject findDateMiseAJour() throws JSONException;

    boolean checkUg();

    List<TMotifRetour> motifsRetour();

    List<MotifAjustement> findAllTypeAjustements();

    List<MotifRetourCarnet> motifRetourCarnets();

    boolean findParam(String key);

    List<ComboDTO> findAllTypeReglement();

    boolean isNormalUse();

    /**
     * Liste des codes TVA actifs, au format historique {total, results:[{lg_CODE_TVA_ID, str_NAME, int_VALUE,
     * str_STATUT}]} pour remplacer ws_data_codetva.jsp sans toucher aux combos existants.
     */
    org.json.JSONObject loadTvas(String query);

    /**
     * Liste paginee des DCI actifs, au format historique {total, results:[{lg_DCI_ID, str_CODE, str_NAME, str_STATUT}]}
     * pour remplacer les ws_data.jsp DCI sans toucher aux combos existants.
     */
    org.json.JSONObject loadDcis(String query, int start, int limit);

    /**
     * Familles d'articles actives pour les filtres d'ecrans (memes cles JSON que la JSP historique
     * webservices/configmanagement/famillearticle/ws_data.jsp), paginees et filtrables par libelle/code.
     */
    org.json.JSONObject loadFamillesArticles(String query, int start, int limit);

    /** Villes actives (memes cles JSON que la JSP historique ville/ws_data.jsp). */
    org.json.JSONObject loadVilles(String query, int start, int limit);

    /** Types de client actifs, filtrables par str_TYPE (memes cles que typeclient/ws_data.jsp). */
    org.json.JSONObject loadTypesClient(String type, String query, int start, int limit);

    /** Categories d'ayant droit actives (memes cles que categorieayantdroit/ws_data.jsp). */
    org.json.JSONObject loadCategoriesAyantDroit(String query, int start, int limit);

    /** Risques actifs (memes cles que risque/ws_data.jsp). */
    org.json.JSONObject loadRisques(String query, int start, int limit);

    /** Types de tiers payant actifs (memes cles que typetierspayant/ws_data.jsp). */
    org.json.JSONObject loadTypesTiersPayant(String query, int start, int limit);

}
