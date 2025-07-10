
package rest.service.v2.dto;

/**
 *
 * @author koben
 */
public class VersionDTO {
    private String user;
    private String date;
    private String version;
    private String jdkVersion;

    @Override
    public String toString() {
        return "VersionDTO{" + "user=" + user + ", date=" + date + ", version=" + version + ", jdkVersion=" + jdkVersion
                + '}';
    }

    public String getUser() {
        return user;
    }

    public String getJdkVersion() {
        return jdkVersion;
    }

    public void setJdkVersion(String jdkVersion) {
        this.jdkVersion = jdkVersion;
    }

    public void setUser(String user) {
        this.user = user;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public String getVersion() {
        return version;
    }

    public void setVersion(String version) {
        this.version = version;
    }

}
