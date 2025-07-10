/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service;

import commonTasks.dto.TvaDTO;
import java.time.LocalDate;
import java.util.List;
import javax.ejb.Local;
import org.json.JSONObject;

/**
 *
 * @author koben
 */
@Local
public interface TvaService {

    JSONObject tvaData(LocalDate dtStart, LocalDate dtEnd, boolean checked, String emplacementId);

    List<TvaDTO> tva(LocalDate dtStart, LocalDate dtEnd, boolean checked, String emplacementId);

    boolean isExcludTiersPayantActive();
}
