/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service;

import java.util.List;
import java.util.Map;
import javax.ejb.Local;

/**
 * Veilleur de coherence du Centre de Support : execute les controles SQL parametres (t_support_controle) en batch ou a
 * la demande, journalise les anomalies dans le journal des evenements et cree un ticket de synthese pour les controles
 * non "dry_run".
 *
 * @author koben
 */
@Local
public interface SupportCoherenceService {

    /**
     * Execute tous les controles actifs.
     *
     * @return une synthese par controle : code, libelle, nbCas, dryRun, erreur.
     */
    List<Map<String, Object>> runActiveChecks();
}
