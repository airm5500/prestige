/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package rest.service;

import javax.ejb.Local;
import javax.servlet.http.Part;
import org.json.JSONObject;

/**
 *
 * @author koben
 */
@Local
public interface DepotService {

    JSONObject importStockDepot(Part part);
}
