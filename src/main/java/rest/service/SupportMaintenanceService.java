/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service;

import java.util.Map;
import javax.ejb.Local;

/**
 * Actions de maintenance du Centre de Support : vidage controle de tables de travail (etiquettes, suggestions,
 * commandes en cours...). Chaque action est tracee dans le journal des evenements.
 *
 * @author koben
 */
@Local
public interface SupportMaintenanceService {

    String ACTION_ETIQUETTES = "ETIQUETTES";
    String ACTION_SUGGESTIONS = "SUGGESTIONS";
    String ACTION_COMMANDES_EN_COURS = "COMMANDES_EN_COURS";
    String ACTION_LOTS_PERIMES_FANTOMES = "LOTS_PERIMES_FANTOMES";

    /**
     * Compteurs courants des donnees concernees par chaque action (affiches avant confirmation).
     */
    Map<String, Object> counts();

    /**
     * Execute l'action de vidage demandee (details supprimes avant les entetes) et trace l'operation dans le journal
     * des evenements. Retourne les nombres de lignes supprimees.
     */
    Map<String, Object> vider(String action, String utilisateur);
}
