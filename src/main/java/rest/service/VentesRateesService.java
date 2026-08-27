package rest.service;

import commonTasks.dto.VenteRateeDTO;
import commonTasks.dto.VenteRateeFiltres;
import dal.MotifVenteRatee;
import dal.TUser;
import dal.VenteRatee;
import java.util.List;
import javax.ejb.Local;
import org.json.JSONObject;

/**
 * Registre des ventes ratees : produits demandes par les clients mais non vendus. Chaque demande est une ligne
 * independante ; les saisies libres (produit inconnu) sont conservees et rattachables plus tard.
 */
@Local
public interface VentesRateesService {

    /** Motifs actifs, dans l'ordre d'affichage. Liste configurable en base. */
    List<MotifVenteRatee> motifs();

    /** Nombre de PRODUITS DISTINCTS non commandes dans la liste du jour (pastille du bouton panier). */
    int compteurJour();

    /** Lignes du jour, de la plus recente a la plus ancienne. */
    List<VenteRateeDTO> lignesDuJour();

    /**
     * Enregistre une demande. Si {@code familleId} est renseigne, le CIP et la designation officiels sont copies au
     * moment de la saisie ; sinon la saisie libre est conservee telle quelle. Date, heure et utilisateur sont
     * enregistres automatiquement.
     *
     * @return la demande creee
     */
    VenteRatee ajouter(VenteRateeDTO demande, TUser auteur);

    /** Modifie une demande existante (quantite, client, telephone, motif, commentaire, designation libre). */
    VenteRatee modifier(String id, VenteRateeDTO demande, TUser auteur);

    /** Retire une demande du registre (suppression logique). */
    void supprimer(String id, TUser auteur);

    /**
     * Demandes ACTIVES (non commandees, non supprimees) du meme produit que la demande donnee : [nombre de demandes,
     * quantite totale]. Sert a poser la confirmation de commande groupee.
     */
    int[] groupeActif(String id);

    /**
     * Marque comme commandee la demande donnee, ou toutes les demandes actives du meme produit si {@code toutes}.
     * Memorise la date, l'heure et l'utilisateur.
     *
     * @return le nombre de lignes marquees
     */
    int commander(String id, boolean toutes, TUser auteur);

    /**
     * Rattache une saisie libre a un produit de la base. Le libelle initialement saisi est conserve ; la demande
     * participe ensuite aux recherches et analyses du produit.
     */
    VenteRatee rattacher(String id, String familleId, TUser auteur);

    /** Recherche filtree du menu, de la plus recente a la plus ancienne. */
    List<VenteRateeDTO> recherche(VenteRateeFiltres filtres);

    /** Produits de la base pour la saisie rapide : [id, cip, designation, stock], 20 lignes au plus. */
    List<Object[]> rechercherProduits(String q);

    /** Indicateurs, classements et evolutions de l'analyse, sur la periode filtree. */
    JSONObject analyse(VenteRateeFiltres filtres);

    /** Utilisateurs ayant saisi au moins une demande : [id, nom complet], pour le filtre du menu. */
    List<Object[]> utilisateurs();
}
