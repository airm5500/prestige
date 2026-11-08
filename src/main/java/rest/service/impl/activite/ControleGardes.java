package rest.service.impl.activite;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Plan du 08/11, point 15.8 (reponse Q17) : controle des gardes d'une periode, a cote de la carte d'affluence.
 * <ul>
 * <li>une garde declaree sans aucune vente est signalee (garde mal creee : dates ou heures fausses) ;</li>
 * <li>une nuit (21 h - 6 h) avec des ventes qu'aucune garde ne couvre est signalee (garde non declaree).</li>
 * </ul>
 * Une vente est datee de son ouverture, comme la carte d'affluence. Calcul pur, sans base : verifie par
 * ControleGardesCoherenceTest.
 */
public final class ControleGardes {

    public static final int DEBUT_NUIT = 21;
    public static final int FIN_NUIT = 6;
    private static final DateTimeFormatter JM = DateTimeFormatter.ofPattern("dd/MM");
    private static final DateTimeFormatter JMH = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private ControleGardes() {
    }

    /** Une garde declaree : [debut, fin[. */
    public static final class Garde {

        final String id;
        final String libelle;
        final LocalDateTime debut;
        final LocalDateTime fin;

        public Garde(String id, String libelle, LocalDateTime debut, LocalDateTime fin) {
            this.id = id;
            this.libelle = libelle;
            this.debut = debut;
            this.fin = fin;
        }

        boolean couvre(LocalDateTime t) {
            return !t.isBefore(debut) && t.isBefore(fin);
        }
    }

    /** Ventes (ouvertures) dans [debut, fin[. */
    public static long ventesEntre(List<LocalDateTime> ventes, LocalDateTime debut, LocalDateTime fin) {
        return ventes.stream().filter(t -> !t.isBefore(debut) && t.isBefore(fin)).count();
    }

    /**
     * @param ventes
     *            ouvertures des ventes, au moins du debut de la periode au lendemain de sa fin a 6 h
     * @param gardes
     *            gardes qui chevauchent la periode
     * @param debut
     *            premier jour de la periode
     * @param fin
     *            dernier jour de la periode (sa nuit va jusqu'au lendemain 6 h)
     */
    public static Map<String, Object> analyser(List<LocalDateTime> ventes, List<Garde> gardes, LocalDate debut,
            LocalDate fin) {
        List<Map<String, Object>> lesGardes = new ArrayList<>();
        List<Map<String, Object>> sansVente = new ArrayList<>();
        for (Garde g : gardes) {
            long n = ventesEntre(ventes, g.debut, g.fin);
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", g.id);
            m.put("libelle", g.libelle);
            m.put("debut", g.debut.format(JMH));
            m.put("fin", g.fin.format(JMH));
            m.put("ventes", n);
            lesGardes.add(m);
            if (n == 0) {
                sansVente.add(m);
            }
        }
        List<Map<String, Object>> nuits = new ArrayList<>();
        for (LocalDate d = debut; !d.isAfter(fin); d = d.plusDays(1)) {
            LocalDateTime de = d.atTime(DEBUT_NUIT, 0), a = d.plusDays(1).atTime(FIN_NUIT, 0);
            long n = ventes.stream()
                    .filter(t -> !t.isBefore(de) && t.isBefore(a) && gardes.stream().noneMatch(g -> g.couvre(t)))
                    .count();
            if (n > 0) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("nuit", d.toString());
                m.put("libelle", "Nuit du " + d.format(JM) + " au " + d.plusDays(1).format(JM));
                m.put("ventes", n);
                nuits.add(m);
            }
        }
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("gardes", lesGardes);
        r.put("gardesSansVente", sansVente);
        r.put("nuitsSansGarde", nuits);
        return r;
    }

    /** Carte d'affluence d'une garde : les ventes ouvertes pendant la garde. */
    public static List<AgregatsActivite.Vente> pendant(List<AgregatsActivite.Vente> ventes, LocalDateTime debut,
            LocalDateTime fin) {
        List<AgregatsActivite.Vente> l = new ArrayList<>();
        for (AgregatsActivite.Vente v : ventes) {
            if (!v.ouverture.isBefore(debut) && v.ouverture.isBefore(fin)) {
                l.add(v);
            }
        }
        return l;
    }
}
