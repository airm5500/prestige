/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks;

import commonTasks.dto.VenteResult;
import java.util.List;

/**
 *
 * @author Kobena
 */
public interface CommonTasksSrv {

    Integer getBalanceRegl(String dt_start, String dt_end, String typevente, String lgEmp, String lgTYPEREGLEMENTID)
            throws Exception;

    Integer getBalanceRegl(String dtstart, String typevente, String lgEmp);

    List<VenteResult> cumulDesVentesSurPeriode(String dt_start, String dt_end, String lgEmp, String typevente)
            throws Exception;

    List<VenteResult> cumulDesAchatsSurPeriode(String dt_start, String dt_end) throws Exception;

    List<VenteResult> cumulDesVentesVOSurPeriode(String dt_start, String dt_end, String lgEmp) throws Exception;

    Integer getBalanceAllTypeVenteRegl(String dtstart, String lgEmp) throws Exception;

    Integer getMontantDiffere(String dtstart, String lgEmp);

    Integer getMontantDiffere(String dtstart, String dt_end, String lgEmp);

    Integer getMontantAvoirAchat(String dtstart);
}
