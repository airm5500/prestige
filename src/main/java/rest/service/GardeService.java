package rest.service;

import java.time.LocalDateTime;
import java.util.List;

import javax.ejb.Local;

import commonTasks.dto.GardeCommandeDTO;
import commonTasks.dto.GardeKpiDTO;
import commonTasks.dto.GardeVendeurDTO;
import commonTasks.dto.GardeProduitDTO;
import commonTasks.dto.GardeTrancheDTO;
import commonTasks.dto.GardeVenteLigneDTO;
import dal.Garde;
import rest.service.impl.AnalyseGarde;

/**
 * Les periodes de garde et leur analyse.
 *
 * <p>
 * La garde ne reconstruit pas les etats de gestion : elle nomme une periode, que les ecrans existants savent deja
 * exploiter. Ce service n'apporte que ce qu'aucun ecran ne sait faire -- la repartition par tranche horaire et la
 * classification ABC sur la fenetre horaire EXACTE de la garde.
 * </p>
 */
@Local
public interface GardeService {

    List<Garde> lister();

    /** Les gardes d'une annee (retour du 08/09) ; nulle : toutes. */
    List<Garde> lister(Integer annee);

    /** Les annees pour lesquelles au moins une garde existe, de la plus recente a la plus ancienne. */
    List<Integer> annees();

    /** Suppression de plusieurs gardes d'un coup ; rend le nombre reellement supprime. */
    int supprimer(List<String> ids);

    Garde parId(String id);

    /**
     * Enregistre une garde.
     *
     * @throws SaisieRefusee
     *             si le libelle est vide, si la fin n'est pas posterieure au debut, ou si une garde couvre deja
     *             exactement la meme periode ; le message est destine a l'utilisateur
     */
    Garde enregistrer(String id, String libelle, LocalDateTime debut, LocalDateTime fin);

    /** @return true si la garde existait et a ete supprimee */
    boolean supprimer(String id);

    /**
     * Les lignes de vente de la fenetre EXACTE de la garde.
     *
     * <p>
     * Memes exclusions que la classification ABC de l'application : ventes cloturees, non annulees, de montant
     * strictement positif, hors type de vente 5. Deux perimetres differents donneraient deux verites.
     * </p>
     */
    List<GardeVenteLigneDTO> lignesDeVente(LocalDateTime debut, LocalDateTime fin);

    List<GardeTrancheDTO> tranches(Garde garde, int heuresParTranche);

    /** Classification ABC sur la fenetre exacte de la garde, avec les seuils parametres dans t_classe_abc. */
    List<GardeProduitDTO> abc(Garde garde);

    AnalyseGarde.Indicateurs indicateurs(Garde garde);

    /** Les indicateurs reels de la garde (H2) : ventes, clients, chiffre, marge, rates, credit, chiffre par mode. */
    GardeKpiDTO kpi(Garde garde);

    /** Les vendeurs de la garde (H3), du plus gros chiffre au plus petit. */
    List<GardeVendeurDTO> vendeurs(Garde garde);

    /** Les vendeurs sur plusieurs gardes cumulees (H3). */
    List<GardeVendeurDTO> vendeurs(List<Garde> gardes);

    /** Les produits commandes pendant la garde et ce qui s'en est vendu (H3), les non vendus en tete. */
    List<GardeCommandeDTO> commandes(Garde garde);

    /** Les tranches horaires cumulees sur plusieurs gardes (H3) : l'historique qui dit quand il faut du monde. */
    List<GardeTrancheDTO> tranches(List<Garde> gardes, int heuresParTranche);

    /** Quantite vendue par produit pendant la garde : ce qui part en suggestion. */
    java.util.Map<String, Long> quantitesVendues(Garde garde);
}
