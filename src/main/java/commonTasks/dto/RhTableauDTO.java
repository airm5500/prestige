package commonTasks.dto;

/** Une ligne du tableau RH (plan d'octobre, section 3) : un employe sur la periode. Durees en minutes. */
public class RhTableauDTO {

    private String employeId;
    private String employe;
    private String matricule;
    private int joursPrevus;
    private int joursPresents;
    private double joursAbsenceJustifiee;
    private int absencesNonJustifiees;
    private int retards;
    private int minutesRetard;
    private int departsAnticipes;
    private int minutesPrevues;
    private int minutesPresence;
    private int heuresSup;
    private int anomalies;

    public String getRetardTexte() {
        return RhPresenceDTO.duree(minutesRetard);
    }

    public String getHeuresSupTexte() {
        return RhPresenceDTO.duree(heuresSup);
    }

    public String getPresenceTexte() {
        return RhPresenceDTO.duree(minutesPresence);
    }

    public String getPrevuTexte() {
        return RhPresenceDTO.duree(minutesPrevues);
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

    public int getJoursPrevus() {
        return joursPrevus;
    }

    public void setJoursPrevus(int joursPrevus) {
        this.joursPrevus = joursPrevus;
    }

    public int getJoursPresents() {
        return joursPresents;
    }

    public void setJoursPresents(int joursPresents) {
        this.joursPresents = joursPresents;
    }

    public double getJoursAbsenceJustifiee() {
        return joursAbsenceJustifiee;
    }

    public void setJoursAbsenceJustifiee(double joursAbsenceJustifiee) {
        this.joursAbsenceJustifiee = joursAbsenceJustifiee;
    }

    public int getAbsencesNonJustifiees() {
        return absencesNonJustifiees;
    }

    public void setAbsencesNonJustifiees(int absencesNonJustifiees) {
        this.absencesNonJustifiees = absencesNonJustifiees;
    }

    public int getRetards() {
        return retards;
    }

    public void setRetards(int retards) {
        this.retards = retards;
    }

    public int getMinutesRetard() {
        return minutesRetard;
    }

    public void setMinutesRetard(int minutesRetard) {
        this.minutesRetard = minutesRetard;
    }

    public int getDepartsAnticipes() {
        return departsAnticipes;
    }

    public void setDepartsAnticipes(int departsAnticipes) {
        this.departsAnticipes = departsAnticipes;
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

    public int getHeuresSup() {
        return heuresSup;
    }

    public void setHeuresSup(int heuresSup) {
        this.heuresSup = heuresSup;
    }

    public int getAnomalies() {
        return anomalies;
    }

    public void setAnomalies(int anomalies) {
        this.anomalies = anomalies;
    }
}
