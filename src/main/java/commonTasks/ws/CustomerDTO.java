/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package commonTasks.ws;

import java.io.Serializable;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 *
 * @author koben
 */
public class CustomerDTO implements Serializable {

    private static final long serialVersionUID = 1L;
    private String sexe;
    private LocalDate datNaiss;
    private String code;
    private String numAyantDroit;
    private String customerDTOId;
    private String firstName;
    private String lastName;
    private String phone;
    private String email;
    private String fullName;
    private int encours;
    private String type;
    private String uniqueId;

    private List<CustomerDTO> ayantDroits = new ArrayList<>();
    private List<ClientTiersPayantDTO> tiersPayants = new ArrayList<>();

    public String getUniqueId() {
        return uniqueId;
    }

    public void setUniqueId(String uniqueId) {
        this.uniqueId = uniqueId;
    }

    public CustomerDTO() {
    }

    public String getSexe() {
        return sexe;
    }

    public void setSexe(String sexe) {
        this.sexe = sexe;
    }

    public LocalDate getDatNaiss() {
        return datNaiss;
    }

    public void setDatNaiss(LocalDate datNaiss) {
        this.datNaiss = datNaiss;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getNumAyantDroit() {
        return numAyantDroit;
    }

    public void setNumAyantDroit(String numAyantDroit) {
        this.numAyantDroit = numAyantDroit;
    }

    public String getCustomerDTOId() {
        return customerDTOId;
    }

    public void setCustomerDTOId(String customerDTOId) {
        this.customerDTOId = customerDTOId;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public int getEncours() {
        return encours;
    }

    public void setEncours(int encours) {
        this.encours = encours;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public List<CustomerDTO> getAyantDroits() {
        return ayantDroits;
    }

    public void setAyantDroits(List<CustomerDTO> ayantDroits) {
        this.ayantDroits = ayantDroits;
    }

    public List<ClientTiersPayantDTO> getTiersPayants() {
        return tiersPayants;
    }

    public void setTiersPayants(List<ClientTiersPayantDTO> tiersPayants) {
        this.tiersPayants = tiersPayants;
    }

}
