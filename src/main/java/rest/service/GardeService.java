package rest.service;

import java.time.LocalDateTime;
import java.util.List;

import javax.ejb.Local;

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
}
