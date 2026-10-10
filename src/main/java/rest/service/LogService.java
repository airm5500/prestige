/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service;

import commonTasks.dto.LogDTO;
import dal.TUser;
import dal.enumeration.TypeLog;
import java.time.LocalDate;
import java.util.Date;
import java.util.List;
import javax.ejb.Local;
import org.json.JSONException;
import org.json.JSONObject;

/**
 *
 * @author DICI
 */
@Local
public interface LogService {

    void updateLogFile(TUser user, String ref, String desc, TypeLog typeLog, Object T);

    void updateItem(TUser user, String ref, String desc, TypeLog typeLog, Object T);

    JSONObject filtres(String query) throws JSONException;

    List<LogDTO> logs(String query, LocalDate dtStart, LocalDate dtEnd, int start, int limit, boolean all,
            String userId, int criteria);

    JSONObject logs(String query, LocalDate dtStart, LocalDate dtEnd, int start, int limit, String userId, int criteria)
            throws JSONException;

    /** Export Excel du fichier journal : toutes les lignes des criteres, pas la seule page affichee. */
    byte[] exportExcel(String query, LocalDate dtStart, LocalDate dtEnd, String userId, int criteria)
            throws java.io.IOException;

    void updateItem(TUser user, String ref, String desc, TypeLog typeLog, Object T, Date date);

    void updateLogFile(TUser user, String ref, String desc, TypeLog typeLog, Object T, String remoteHost,
            String remoteAddr);

    /* ------------------------------------------------------------ retours du 10/10 (journal) */

    /** Ligne de journal avec le detail avant / apres d'une modification. */
    void journaliser(TUser user, String ref, String desc, TypeLog typeLog, Object t, String detail);

    List<LogDTO> logs(String query, LocalDate dtStart, LocalDate dtEnd, int start, int limit, boolean all,
            String userId, int criteria, String poste);

    JSONObject logs(String query, LocalDate dtStart, LocalDate dtEnd, int start, int limit, String userId, int criteria,
            String poste) throws JSONException;

    byte[] exportExcel(String query, LocalDate dtStart, LocalDate dtEnd, String userId, int criteria, String poste)
            throws java.io.IOException;

    /** Alertes de la periode : annulations en serie, operations hors horaires (parametres KEY_JOURNAL_*). */
    JSONObject alertes(LocalDate dtStart, LocalDate dtEnd);

    /** Postes connus (pour le filtre). */
    JSONObject postes();

    /** Conservation : supprime les lignes plus anciennes que KEY_JOURNAL_CONSERVATION_MOIS (0 = rien). */
    int purger();

    /**
     * Ligne de journal ecrite dans sa propre transaction : une erreur d'ecriture du journal ne fait jamais echouer
     * l'operation (vente, prevente, suppression de facture...).
     */
    void journaliserSansRisque(TUser user, String ref, String desc, TypeLog typeLog, String table, String detail);
}
