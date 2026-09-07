package rest.service;

import java.util.List;
import javax.ejb.Local;
import org.json.JSONObject;
import rest.service.dto.StatCaisseRecetteDTO;

/**
 *
 * @author koben
 */
@Local
public interface StatCaisseRecetteService {

    List<StatCaisseRecetteDTO> fetchStatCaisseRecettes(String dateDebut, String dateFin, String typeRglementId,
            boolean groupByYear, String emplacementId);

    JSONObject getStatCaisseRecettes(String dateDebut, String dateFin, String typeRglementId, boolean groupByYear,
            String emplacementId);

    /**
     * Suivi des modes de reglement sur une periode (point 22).
     *
     * <p>
     * Rend, pour chaque mode REELLEMENT rencontre : le montant encaisse, le nombre d'operations, le montant moyen par
     * operation et la part dans le total ; puis, pour la courbe, une valeur par mode et par tranche de temps. Aucun
     * mode n'est ecrit d'avance : la synthese suit ce que l'officine encaisse.
     * </p>
     *
     * @param groupByYear
     *            regroupe par annee plutot que par jour, comme le tableau du recapitulatif
     */
    JSONObject suiviModesReglement(String dateDebut, String dateFin, boolean groupByYear, String emplacementId);

}
