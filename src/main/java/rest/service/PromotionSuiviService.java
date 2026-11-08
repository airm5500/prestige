package rest.service;

import java.time.LocalDate;
import java.util.List;
import javax.ejb.Local;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.promotion.PromotionAnalyse;

/**
 * Plan du 06/11, point 3.5 (demande du 07/11) : onglets Historique, Ventes en promotion et Analyse de l'ecran
 * Promotions.
 */
@Local
public interface PromotionSuiviService {

    /** Filtres de l'historique : du, au (yyyy-MM-dd), action, type, produit (nom ou CIP), utilisateur, promotion. */
    final class FiltreHistorique {
        public LocalDate du;
        public LocalDate au;
        public String action;
        public String type;
        public String produit;
        public String utilisateur;
        public Integer promotion;
    }

    /** Journal des promotions, trie (date, action, type, produit, utilisateur, promotion ; ASC ou DESC). */
    JSONObject historique(FiltreHistorique f, String tri, String sens, int start, int limit);

    /** Utilisateurs presents dans le journal (pour le filtre). */
    JSONArray utilisateursHistorique();

    /** Lignes vendues en promotion sur la periode (ventes terminees, non annulees). */
    List<PromotionAnalyse.Ligne> ventes(LocalDate du, LocalDate au, String type, String produit, String vendeur);

    /** Vendeurs ayant vendu en promotion sur la periode (pour le filtre). */
    JSONArray vendeurs(LocalDate du, LocalDate au);

    String officine();
}
