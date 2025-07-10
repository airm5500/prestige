/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package commonTasks.ws;

import dal.TGroupeTierspayant;

/**
 *
 * @author koben
 */
public class GroupeTiersPayantDTO {

    private final String name;

    private final String adresse;

    private final String telephone;

    public GroupeTiersPayantDTO(TGroupeTierspayant groupeTierspayant) {
        this.name = groupeTierspayant.getStrLIBELLE();
        this.adresse = groupeTierspayant.getStrADRESSE();
        this.telephone = groupeTierspayant.getStrTELEPHONE();
    }

    public String getName() {
        return name;
    }

    public String getAdresse() {
        return adresse;
    }

    public String getTelephone() {
        return telephone;
    }

}
