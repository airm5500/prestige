package avisclients;

import java.time.LocalDateTime;
import java.util.Map;

/** Un avis lu en base, pour l'analyse. */
public final class Avis {

    public final String id;
    public final LocalDateTime date;
    public final int note;
    public final Map<String, String> criteres;
    public final String texte, employe, statut;
    /** Le client a demande une reponse et n'en a pas encore recu. */
    public final boolean reponseAttendue;

    public Avis(String id, LocalDateTime date, int note, Map<String, String> criteres, String texte, String employe,
            String statut, boolean reponseAttendue) {
        this.id = id;
        this.date = date;
        this.note = note;
        this.criteres = criteres;
        this.texte = texte;
        this.employe = employe;
        this.statut = statut;
        this.reponseAttendue = reponseAttendue;
    }

    public boolean negatif() {
        return note <= 2;
    }

    public boolean positif() {
        return note >= 4;
    }
}
