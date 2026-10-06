package rest.service;

import javax.ejb.Local;
import org.json.JSONObject;

/**
 * Analyse Suggestion / Commande (plan d'octobre, section 5, lot L12) : previsions de ventes par produit precalculees
 * (la nuit ou a la demande), quantite recommandee, alertes par ligne d'une suggestion ou d'une commande, tableau de
 * bord. Limite a la decision de stock (Q14).
 */
@Local
public interface PrevisionCommandeService {

    String SUGGESTION = "SUGGESTION";
    String COMMANDE = "COMMANDE";

    /** Recalcule toutes les previsions de l'emplacement. Rend {success, produits, fiabilite, duree}. */
    JSONObject recalculer(String emplacementId, String origine);

    /** Indicateurs : taux de rupture, valeur des invendus, couverture moyenne, fiabilite, dernier calcul. */
    JSONObject tableau(String emplacementId);

    /**
     * Previsions paginees. filtre : vide (tous), ACOMMANDER, RUPTURE, SURSTOCK, LENTE, PEU_FIABLE ; recherche sur le
     * nom ou le CIP.
     */
    JSONObject previsions(String emplacementId, String filtre, String recherche, int start, int limit);

    /** Detail d'un produit : historique mensuel, prevision de chaque methode, calcul de la quantite recommandee. */
    JSONObject produit(String emplacementId, String familleId);

    /** Suggestions et commandes recentes, a choisir pour l'analyse. */
    JSONObject aAnalyser(String emplacementId);

    /** Analyse ligne a ligne d'une suggestion ou d'une commande (type SUGGESTION ou COMMANDE). */
    JSONObject analyser(String emplacementId, String type, String id);
}
