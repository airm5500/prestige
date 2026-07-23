package rest.service;

import javax.ejb.Local;
import org.json.JSONObject;

/**
 * Ecrans Promotions et Historique de promotions en REST. Les regles reprennent celles utilisees par la vente
 * (bll.preenregistrement) : types REMISE / PRIX SPECIAL / UNITES GRATUITES, produit marque blPROMOTED, promotion active
 * tant que sa date de fin n'est pas depassee.
 */
@Local
public interface PromotionService {

    /** Liste paginee des promotions (recherche par type), avec bl_ACTIVE calcule et le nombre de produits. */
    JSONObject listPromotions(String search, int start, int limit);

    /** Creation d'une promotion (type + dates, fin >= debut). */
    JSONObject createPromotion(String type, String dtStart, String dtEnd);

    /** Modification des dates (et du type uniquement si la promotion n'a pas encore de produit). */
    JSONObject updatePromotion(int promotionId, String type, String dtStart, String dtEnd);

    /** Cloture immediate : date de fin a hier et retrait du drapeau promotion sur tous ses produits. */
    JSONObject cloturerPromotion(int promotionId);

    /** Produits d'une promotion (pagines, recherche CIP/nom). */
    JSONObject listProduits(int promotionId, String search, int start, int limit);

    /** Ajout (ou mise a jour) d'un produit dans la promotion, avec calcul du prix promotionnel selon le type. */
    JSONObject addProduit(int promotionId, String familleId, int discount, double promoPrice, int packNumber,
            int activeAt);

    /** Retrait d'un produit de la promotion (drapeau promotion retire du produit). */
    JSONObject removeProduit(int promotionProductId);

    /** Historique des promotions (pagine, recherche CIP/nom/type). */
    JSONObject listHistorique(String search, int start, int limit);
}
