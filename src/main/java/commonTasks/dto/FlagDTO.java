/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import dal.Flag;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

/**
 *
 * @author koben
 */
public class FlagDTO {

    private String id, dateStart, dateEnd;
    private Integer montant;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getDateStart() {
        return dateStart;
    }

    public void setDateStart(String dateStart) {
        this.dateStart = dateStart;
    }

    public String getDateEnd() {
        return dateEnd;
    }

    public void setDateEnd(String dateEnd) {
        this.dateEnd = dateEnd;
    }

    public Integer getMontant() {
        return montant;
    }

    public void setMontant(Integer montant) {
        this.montant = montant;
    }

    public FlagDTO(Flag f) {
        this.id = f.getId();
        this.dateStart = LocalDate.parse(String.valueOf(f.getDateStart()), DateTimeFormatter.ofPattern("yyyyMMdd"))
                .format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        this.dateEnd = LocalDate.parse(String.valueOf(f.getDateEnd()), DateTimeFormatter.ofPattern("yyyyMMdd"))
                .format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        ;
        this.montant = f.getMontant();
    }

}
