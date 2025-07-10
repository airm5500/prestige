package rest.service.dto;

/**
 *
 * @author koben
 */
public class UserDTO {

    private String roleId;
    private String firstName;
    private String lastName;
    private String login;
    private String emplacementId;
    private String securityId;
    private String password;

    public String getRoleId() {
        return roleId;
    }

    public void setRoleId(String roleId) {
        this.roleId = roleId;
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

    public String getLogin() {
        return login;
    }

    public void setLogin(String login) {
        this.login = login;
    }

    public String getEmplacementId() {
        return emplacementId;
    }

    public void setEmplacementId(String emplacementId) {
        this.emplacementId = emplacementId;
    }

    public String getSecurityId() {
        return securityId;
    }

    public void setSecurityId(String securityId) {
        this.securityId = securityId;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

}
