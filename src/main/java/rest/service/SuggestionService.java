package rest.service;

import commonTasks.dto.ArticleDTO;
import commonTasks.dto.VenteDetailsDTO;
import dal.*;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.dto.SuggestionDTO;
import rest.service.dto.SuggestionOrderDetailDTO;

import javax.ejb.Local;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import rest.service.dto.ArticleCsvDTO;

/**
 *
 * @author Kobena
 */
@Local

public interface SuggestionService {

    void makeSuggestionAuto(TFamilleStock familleStock, TFamille famille);

    void makeSuggestionAuto(String preenregistrement);

    Integer getQuantityReapportByCodeGestionArticle(TFamilleStock familleStock, TFamille famille);

    List<TCalendrier> nombresJourVente(LocalDate begin);

    List<TSuggestionOrderDetails> findFamillesBySuggestion(String suggestionId);

    JSONObject makeSuggestion(List<VenteDetailsDTO> datas) throws JSONException;

    JSONObject makeSuggestionFromArticleInvendus(List<ArticleDTO> datas, TUser tu) throws JSONException;

    /**
     * Suggestion de commande depuis une garde (retour du 08/09, H3) : une suggestion par grossiste du produit, la
     * quantite proposee etant la quantite vendue pendant la garde. Les produits sans grossiste ou deconditionnes sont
     * ignores et comptes.
     */
    JSONObject makeSuggestionDepuisGarde(java.util.Map<String, Long> quantitesParProduit, TUser tu);

    /** La meme, avec le commentaire porte par chaque suggestion creee (200 caracteres au plus). */
    JSONObject makeSuggestionDepuisGarde(java.util.Map<String, Long> quantitesParProduit, TUser tu, String commentaire);

    JSONObject makeSuggestion(Set<VenteDetailsDTO> datas) throws JSONException;

    JSONObject findCHDetailStock(String idProduit, String emplacement);

    void proccessSuggetion(TFamille famille, TEmplacement emplacementId);

    /** Motifs des produits retires d'une suggestion (t_suggestion_ligne_retiree). */
    String MOTIF_SUPPRESSION_USER = "SUPPRESSION_USER";

    String MOTIF_SUPPRESSION_EQUIVALENCE_DCI = "SUPPRESSION_EQUIVALENCE_DCI";

    /** Statuts du plan d'octobre (1.3) : dernier produit traite, puis commande passee. */
    String STATUT_CLOTUREE = "cloturee";

    String STATUT_COMMANDEE = "commandee";

    String MODE_COMMANDE_CSV = "CSV";

    String MODE_COMMANDE_PHARMAML = "PHARMAML";

    String MODE_COMMANDE_MANUEL = "MANUEL";

    java.util.Set<String> MODES_COMMANDE = java.util.Set.of(MODE_COMMANDE_CSV, MODE_COMMANDE_PHARMAML,
            MODE_COMMANDE_MANUEL);

    /** Dernier produit traite : statut « Clôturée » (sans effet sur une suggestion deja commandee). */
    JSONObject cloturer(String suggestionId);

    /** Statut « Commandée », avec la date, le mode (CSV, PHARMAML, MANUEL), l'utilisateur et la commande creee. */
    JSONObject marquerCommandee(String suggestionId, String mode, String orderId, TUser user);

    /** Plan d'octobre 1.5 : ce que la confirmation de « Commander par PharmaML » affiche. */
    JSONObject apercuCommandePharmaMl(String suggestionId);

    /** Commande creee depuis la suggestion (reprise si l'envoi doit etre relance). */
    void lierCommande(String suggestionId, String orderId);

    /** Liste filtree par statut (vide = tous). */
    JSONObject fetch(String query, String statut, int start, int limit);

    void removeItem(String itemId);

    /** Suppression d'une ligne, copiee d'abord dans les produits retires au nom de l'utilisateur. */
    void removeItem(String itemId, String userId);

    /**
     * Retire des lignes couvertes par des equivalents DCI. Cle : ligne ; valeur : quantite de reliquat (0 = retrait
     * simple). Les reliquats vont dans UNE nouvelle suggestion du meme grossiste, commentee « Reliquat substitution ».
     */
    JSONObject retirerLignesCouvertes(String suggestionId, java.util.Map<String, Integer> reliquats, TUser user);

    /** Produits retires de la suggestion et pas encore ramenes. */
    JSONObject lignesRetirees(String suggestionId);

    /** Ramene des produits retires (cle : retrait ; valeur : quantite, 0 = quantite d'origine). */
    JSONObject ramenerLignes(String suggestionId, java.util.Map<String, Integer> quantites);

    SuggestionDTO getSuggestionAmount(String suggestionId);

    void addItem(SuggestionOrderDetailDTO suggestionOrderDetail);

    void updateItemSeuil(SuggestionOrderDetailDTO suggestionOrderDetail);

    void updateItemQteCmde(SuggestionOrderDetailDTO suggestionOrderDetail);

    void updateItemQtePrixPaf(SuggestionOrderDetailDTO suggestionOrderDetail);

    void updateItemQtePrixVente(SuggestionOrderDetailDTO suggestionOrderDetail);

    SuggestionDTO create(SuggestionDTO suggestion);

    JSONObject fetch(String query, int start, int limit);

    void setToPending(String id);

    JSONObject diagnosticProduit(String query, int start, int limit) throws JSONException;

    JSONObject diagnosticManques(int start, int limit) throws JSONException;

    JSONObject creerSuggestionDepuisDiagnostic(List<String> famillesIds) throws JSONException;

    void makeSuggestionAuto(List<TPreenregistrementDetail> list, TEmplacement emplacementId);

    JSONObject fetchItems(String orderId, String search, int start, int limit);

    void cleanSuggestion(String suggestionId, TUser tUser);

    void deleteSuggestion(String suggestionId);

    boolean changeGrossiste(String suggestionId, String grossisteId);

    void mergeSuggestion(String suggestionId, String grossisteId);

    List<ArticleCsvDTO> buildBySuggestion(String suggestionId);

    JSONObject suggererQteReappro(Set<VenteDetailsDTO> datas);

    /** Cree une suggestion VIDE de type manuelle (statut is_Process) pour le grossiste donne. */
    JSONObject createSuggestionManuelle(String grossisteId);

    /**
     * Fusionne les suggestions cochees (au moins deux) comme la fusion des commandes en cours : les lignes s'ajoutent,
     * les doublons de produit additionnent leurs quantites, les suggestions sources sont supprimees, le resultat
     * devient manuelle (is_Process). Quand les suggestions melent plusieurs grossistes, grossisteCibleId designe celui
     * qui porte la fusion ; s'il manque, la reponse liste les grossistes possibles (choixGrossisteRequis) pour que
     * l'ecran fasse choisir.
     */
    JSONObject mergeSuggestionSelection(List<String> suggestionIds, String grossisteCibleId);

    /**
     * Eclate une suggestion en {@code nombre} suggestions manuelles, decoupees par nombre de lignes.
     *
     * <p>
     * L'inverse de la fusion : une commande trop grande en nombre de lignes pour etre traitee d'un seul coup est
     * decoupee en morceaux egaux. Aucune ligne n'est perdue ni dupliquee, et la suggestion de depart garde sa reference
     * en devenant le premier morceau.
     */
    JSONObject eclaterSuggestion(String suggestionId, int nombre);

}
