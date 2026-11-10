package rest.service;

import java.util.List;
import javax.ejb.Local;
import rest.service.dto.ActiviteEmployeDTO;
import rest.service.dto.ActiviteFiltreDTO;
import rest.service.dto.ActiviteJournalDTO;

/**
 * Menu « Activité des équipes » : tout ce que fait chaque employe (journal, recherches) et analyses de productivite.
 * Lecture seule ; aucune donnee de client n'est lue.
 */
@Local
public interface ActiviteEquipesService {

    /** Employes proposes dans les filtres (utilisateurs de Prestige). */
    List<ActiviteEmployeDTO> employes();

    /** Journal des actions de la periode, filtre et pagine, avec les compteurs par type. */
    ActiviteJournalDTO journal(ActiviteFiltreDTO filtre);

    /** Analyses de la periode (et comparaison avec la periode precedente de meme duree). */
    rest.service.dto.ActiviteAnalysesDTO analyses(ActiviteFiltreDTO filtre);

    /** Toutes les lignes du journal filtre (export), au plus 100 000. */
    java.util.List<rest.service.dto.ActiviteLigneDTO> export(ActiviteFiltreDTO filtre);

    /**
     * Retour du 24/10 : anomalies par employe sur la periode (refus affiches, operations a risque, erreurs du logiciel)
     * et la liste des anomalies enregistrees (famille vide : toutes), les plus recentes d'abord.
     */
    rest.service.dto.ActiviteAnomaliesDTO anomalies(ActiviteFiltreDTO filtre, String famille);

    /**
     * Plan du 08/11, point 15.8 : controle des gardes de la periode (gardes sans vente, nuits 21 h - 6 h avec des
     * ventes sans garde declaree).
     */
    java.util.Map<String, Object> controleGardes(java.time.LocalDate debut, java.time.LocalDate fin);

    /**
     * Plan du 08/11, point 15.8 : carte d'affluence d'une garde (ventes ouvertes pendant la garde) ; null si absente.
     */
    java.util.Map<String, Object> carteGarde(String gardeId);

    /**
     * Plan du 09/11, point 10 : critere de duree des ventes enregistre pour tous (parametres
     * KEY_TABLEAU_BORD_SEUIL_VENTE_LONGUE_OP et _MIN) ; plus de 10 min s'il manque ou s'il est illisible.
     */
    rest.service.impl.activite.SeuilDuree seuilEnregistre();

    /** Enregistre le critere pour tous : success, seuilOperateur, seuilMinutes, seuilLibelle, msg. */
    java.util.Map<String, Object> enregistrerSeuil(String operateur, Integer minutes);

    /** Plan du 09/11, point 10 : libelle (String), debut et fin (LocalDateTime) d'une garde ; null si absente. */
    java.util.Map<String, Object> fenetreGarde(String gardeId);

    /** Plan du 08/11, point 15.1 : annulations par auteur de la vente et suivi des caissieres. */
    java.util.Map<String, Object> annulations(ActiviteFiltreDTO f);

    /** Plan du 08/11, point 15.1 : detail d'une ligne (role VENDEUR ou CAISSIER) : vente, motif, par qui, quand. */
    java.util.List<java.util.Map<String, Object>> detailAnnulations(java.time.LocalDate debut, java.time.LocalDate fin,
            String role, String id);

    /**
     * Plan avoir du 08/11, point 1 : CA par employe et par tranche horaire (taille 1 a 6 h ; attribution CAISSIER ou
     * VENDEUR), totaux par ligne et par colonne.
     */
    java.util.Map<String, Object> caTranches(ActiviteFiltreDTO f, Integer taille, String attribution);

    /** Une anomalie avec le fil de ce que l'employe a fait juste avant ; null si elle n'existe pas. */
    rest.service.dto.ActiviteAnomaliesDTO.Element anomalie(long id);
}
