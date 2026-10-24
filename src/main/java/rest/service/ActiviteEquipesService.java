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

    /** Une anomalie avec le fil de ce que l'employe a fait juste avant ; null si elle n'existe pas. */
    rest.service.dto.ActiviteAnomaliesDTO.Element anomalie(long id);
}
