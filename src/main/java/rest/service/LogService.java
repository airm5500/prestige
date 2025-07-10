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

    void updateItem(TUser user, String ref, String desc, TypeLog typeLog, Object T, Date date);

    void updateLogFile(TUser user, String ref, String desc, TypeLog typeLog, Object T, String remoteHost,
            String remoteAddr);
}
