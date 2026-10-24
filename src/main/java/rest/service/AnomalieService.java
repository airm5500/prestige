package rest.service;

import javax.ejb.Local;
import rest.service.dto.AnomalieDTO;

/** Anomalies par employe (retour du 24/10) : enregistrement a chaque occurrence. */
@Local
public interface AnomalieService {

    /** Enregistre l'anomalie de cet employe ; false si elle est ignoree (famille inconnue, plafond horaire atteint). */
    boolean enregistrer(String userId, String poste, AnomalieDTO anomalie);
}
