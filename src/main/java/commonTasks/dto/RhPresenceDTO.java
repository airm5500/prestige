package commonTasks.dto;

/**
 * Presence d'un employe sur une journee (plan d'octobre, section 3, lot L11b) : une ligne de la feuille de presence et
 * de l'export detaille du tableau RH. Les durees sont en minutes ; les textes sont prets a imprimer.
 */
public class RhPresenceDTO {

    private String employeId;
    private String employe;
    private String matricule;
    private String jour;
    private String prevu;
    private String entree;
    private String sortie;
    private int minutesPrevues;
    private int minutesPresence;
    private int retard;
    private int departAnticipe;
    private int heuresSup;
    private String absence;
    private String anomalies;
    private String pointages;

    public static String duree(int minutes) {
        if (minutes <= 0) {
            return "";
        }
        return minutes / 60 + " h " + (minutes % 60 < 10 ? "0" : "") + minutes % 60;
    }

    public String getPresenceTexte() {
        return duree(minutesPresence);
    }

    public String getPrevuTexte() {
        return duree(minutesPrevues);
    }

    public String getEmployeId() {
        return employeId;
    }

    public void setEmployeId(String employeId) {
        this.employeId = employeId;
    }

    public String getEmploye() {
        return employe;
    }

    public void setEmploye(String employe) {
        this.employe = employe;
    }

    public String getMatricule() {
        return matricule;
    }

    public void setMatricule(String matricule) {
        this.matricule = matricule;
    }

    public String getJour() {
        return jour;
    }

    public void setJour(String jour) {
        this.jour = jour;
    }

    public String getPrevu() {
        return prevu;
    }

    public void setPrevu(String prevu) {
        this.prevu = prevu;
    }

    public String getEntree() {
        return entree;
    }

    public void setEntree(String entree) {
        this.entree = entree;
    }

    public String getSortie() {
        return sortie;
    }

    public void setSortie(String sortie) {
        this.sortie = sortie;
    }

    public int getMinutesPrevues() {
        return minutesPrevues;
    }

    public void setMinutesPrevues(int minutesPrevues) {
        this.minutesPrevues = minutesPrevues;
    }

    public int getMinutesPresence() {
        return minutesPresence;
    }

    public void setMinutesPresence(int minutesPresence) {
        this.minutesPresence = minutesPresence;
    }

    public int getRetard() {
        return retard;
    }

    public void setRetard(int retard) {
        this.retard = retard;
    }

    public int getDepartAnticipe() {
        return departAnticipe;
    }

    public void setDepartAnticipe(int departAnticipe) {
        this.departAnticipe = departAnticipe;
    }

    public int getHeuresSup() {
        return heuresSup;
    }

    public void setHeuresSup(int heuresSup) {
        this.heuresSup = heuresSup;
    }

    public String getAbsence() {
        return absence;
    }

    public void setAbsence(String absence) {
        this.absence = absence;
    }

    public String getAnomalies() {
        return anomalies;
    }

    public void setAnomalies(String anomalies) {
        this.anomalies = anomalies;
    }

    public String getPointages() {
        return pointages;
    }

    public void setPointages(String pointages) {
        this.pointages = pointages;
    }
}
