package rest.service.impl.journal;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Retours du 10/10 (journal) : alertes tirees du fichier journal.
 * <ul>
 * <li>annulations en serie : un meme utilisateur annule au moins N ventes en M minutes (fenetre glissante ; les series
 * qui se chevauchent sont regroupees) ;</li>
 * <li>operations hors horaires : avant l'heure de debut ou apres l'heure de fin (connexions et deconnexions
 * exclues).</li>
 * </ul>
 */
public final class AlertesJournal {

    public static final String ANNULATION = "ANNULATION_DE_VENTE";
    private static final DateTimeFormatter JJ_HH = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    /** Une ligne du journal. */
    public static final class Ligne {
        final LocalDateTime quand;
        final String utilisateurId, utilisateur, type, action, description, poste;

        public Ligne(LocalDateTime quand, String utilisateurId, String utilisateur, String type, String action,
                String description, String poste) {
            this.quand = quand;
            this.utilisateurId = utilisateurId;
            this.utilisateur = utilisateur;
            this.type = type;
            this.action = action;
            this.description = description;
            this.poste = poste;
        }
    }

    private final int seuil, minutes;
    private final LocalTime debut, fin;

    public AlertesJournal(int seuilAnnulations, int fenetreMinutes, LocalTime debut, LocalTime fin) {
        this.seuil = Math.max(2, seuilAnnulations);
        this.minutes = Math.max(1, fenetreMinutes);
        this.debut = debut;
        this.fin = fin;
    }

    public JSONObject analyser(List<Ligne> lignes, int max) {
        JSONArray series = new JSONArray(), horaires = new JSONArray();
        Map<String, List<Ligne>> annulations = new LinkedHashMap<>();
        for (Ligne l : lignes) {
            if (ANNULATION.equals(l.type)) {
                annulations.computeIfAbsent(l.utilisateurId, k -> new ArrayList<>()).add(l);
            }
        }
        for (List<Ligne> a : annulations.values()) {
            a.sort(Comparator.comparing(x -> x.quand));
            int i = 0;
            while (i < a.size()) {
                /* plus longue serie commencant en i dont chaque annulation tient dans la fenetre depuis la premiere */
                int j = i;
                while (j + 1 < a.size() && !a.get(j + 1).quand.isAfter(a.get(i).quand.plusMinutes(minutes))) {
                    j++;
                }
                if (j - i + 1 >= seuil) {
                    /* prolonger tant que la serie continue (fenetre glissante) */
                    while (j + 1 < a.size()
                            && !a.get(j + 1).quand.isAfter(a.get(j + 1 - seuil + 1).quand.plusMinutes(minutes))) {
                        j++;
                    }
                    series.put(new JSONObject().put("utilisateur", a.get(i).utilisateur).put("nombre", j - i + 1)
                            .put("debut", a.get(i).quand.format(JJ_HH)).put("fin", a.get(j).quand.format(JJ_HH))
                            .put("poste", a.get(i).poste == null ? "" : a.get(i).poste));
                    i = j + 1;
                } else {
                    i++;
                }
            }
        }
        if (debut != null && fin != null) {
            for (Ligne l : lignes) {
                if ("AUTHENTIFICATION".equals(l.type) || "DECONNECTION".equals(l.type)) {
                    continue;
                }
                LocalTime h = l.quand.toLocalTime();
                if (h.isBefore(debut) || h.isAfter(fin)) {
                    horaires.put(new JSONObject().put("quand", l.quand.format(JJ_HH)).put("utilisateur", l.utilisateur)
                            .put("action", l.action).put("description", l.description == null ? "" : l.description)
                            .put("poste", l.poste == null ? "" : l.poste));
                }
            }
        }
        JSONArray horsHoraires = new JSONArray();
        for (int k = 0; k < horaires.length() && k < max; k++) {
            horsHoraires.put(horaires.get(k));
        }
        return new JSONObject().put("annulationsEnSerie", series).put("horsHoraires", horsHoraires)
                .put("nbHorsHoraires", horaires.length()).put("seuil", seuil).put("minutes", minutes)
                .put("debut", debut == null ? "" : debut.toString()).put("fin", fin == null ? "" : fin.toString());
    }
}
