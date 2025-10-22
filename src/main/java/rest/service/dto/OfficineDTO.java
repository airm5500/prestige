
package rest.service.dto;

/**
 *
 * @author airman
 */
public class OfficineDTO {

    private String id;
    private String fullName;
    private String nomComplet;
    private String note;
    private String address;
    private String phone;
    private String name;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getFullName() {
        return fullName;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getNomComplet() {
        return nomComplet;
    }

    public void setNomComplet(String nomComplet) {
        this.nomComplet = nomComplet;
    }

    public OfficineDTO() {
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public OfficineDTO(String id, String fullName, String nomComplet) {
        this.id = id;
        this.fullName = fullName;
        this.nomComplet = nomComplet;
    }

}
