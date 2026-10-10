package rest.service.impl.caisse;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.IsoFields;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Retours du 10/10 (section 16) : analyse des ecarts de caisse, a partir des caisses fermees de la periode.
 * <ul>
 * <li>ecart = billetage − attendu (meme calcul que la Gestion de caisse) ; regle unique (Q9) : <b>negatif =
 * manquant</b>, positif = surplus ; au plus la tolerance (en valeur absolue) = caisse juste ;</li>
 * <li>une caisse fermee sans billetage n'a pas d'ecart mesurable : comptee a part, hors des ecarts ;</li>
 * <li>par caissier (recurrence = caisses en manquant ÷ caisses billetees), par semaine, par mois, par jour de la
 * semaine et par heure de fermeture ; plus gros ecarts ; tendance du dernier mois ; pistes.</li>
 * </ul>
 */
public final class AnalyseEcartsCaisse {

    private static final DateTimeFormatter JJ = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter JJ_HH = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final String[] JOURS = { "", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi",
            "dimanche" };

    /** Une caisse fermee. */
    private static final class Caisse {
        final String id, caissier;
        final LocalDateTime ouverture, fermeture;
        final long attendu, ecart;

        Caisse(String id, String caissier, LocalDateTime ouverture, LocalDateTime fermeture, long attendu, long ecart) {
            this.id = id;
            this.caissier = caissier;
            this.ouverture = ouverture;
            this.fermeture = fermeture;
            this.attendu = attendu;
            this.ecart = ecart;
        }
    }

    private static final class Cumul {
        final String libelle;
        int caisses, justes, manquants, surplus;
        long montantManquant, montantSurplus;

        Cumul(String libelle) {
            this.libelle = libelle;
        }

        void ajouter(long ecart, long tolerance) {
            caisses++;
            if (Math.abs(ecart) <= tolerance) {
                justes++;
            } else if (ecart < 0) {
                manquants++;
                montantManquant += ecart;
            } else {
                surplus++;
                montantSurplus += ecart;
            }
        }

        double recurrence() {
            return caisses == 0 ? 0 : Math.round(manquants * 1000.0 / caisses) / 10.0;
        }

        JSONObject json() {
            return new JSONObject().put("libelle", libelle).put("caisses", caisses).put("justes", justes)
                    .put("manquants", manquants).put("montantManquant", montantManquant).put("surplus", surplus)
                    .put("montantSurplus", montantSurplus).put("net", montantManquant + montantSurplus)
                    .put("recurrence", recurrence());
        }
    }

    private final long tolerance;
    private final List<Caisse> caisses = new ArrayList<>();
    private int sansBilletage;

    public AnalyseEcartsCaisse(long tolerance) {
        this.tolerance = Math.max(0, tolerance);
    }

    /**
     * Une caisse fermee : ouverture, fermeture (null : ouverture), attendu (solde du soir), billetage (null si aucun
     * billetage n'a ete saisi).
     */
    public void ajouter(String caisseId, String caissier, LocalDateTime ouverture, LocalDateTime fermeture,
            long attendu, Long billetage) {
        if (billetage == null) {
            sansBilletage++;
            return;
        }
        long a = Math.abs(attendu);
        caisses.add(new Caisse(caisseId, caissier == null ? "" : caissier.trim(), ouverture,
                fermeture == null ? ouverture : fermeture, a, billetage - a));
    }

    private static String semaine(LocalDateTime d) {
        return d.get(IsoFields.WEEK_BASED_YEAR) + "-S"
                + String.format("%02d", d.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR));
    }

    public JSONObject json(int nbPlusGros) {
        Cumul total = new Cumul("Total");
        Map<String, Cumul> parCaissier = new TreeMap<>(), parSemaine = new TreeMap<>(), parMois = new TreeMap<>();
        Map<String, String> debutSemaine = new LinkedHashMap<>();
        Map<Integer, Cumul> parJour = new TreeMap<>(), parHeure = new TreeMap<>();
        for (Caisse c : caisses) {
            total.ajouter(c.ecart, tolerance);
            parCaissier.computeIfAbsent(c.caissier, Cumul::new).ajouter(c.ecart, tolerance);
            String s = semaine(c.ouverture);
            parSemaine.computeIfAbsent(s, Cumul::new).ajouter(c.ecart, tolerance);
            debutSemaine.putIfAbsent(s,
                    c.ouverture.toLocalDate().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).format(JJ));
            parMois.computeIfAbsent(c.ouverture.toLocalDate().toString().substring(0, 7), Cumul::new).ajouter(c.ecart,
                    tolerance);
            int j = c.ouverture.getDayOfWeek().getValue();
            parJour.computeIfAbsent(j, k -> new Cumul(JOURS[k])).ajouter(c.ecart, tolerance);
            int h = c.fermeture.getHour();
            parHeure.computeIfAbsent(h, k -> new Cumul(String.format("%02d h - %02d h", k, k + 1))).ajouter(c.ecart,
                    tolerance);
        }
        JSONArray caissiers = new JSONArray();
        parCaissier.values().stream()
                .sorted(Comparator.comparingLong((Cumul c) -> c.montantManquant).thenComparing(c -> c.libelle))
                .forEach(c -> caissiers.put(c.json()));
        JSONArray semaines = new JSONArray();
        parSemaine.forEach((k, c) -> semaines.put(c.json().put("semaine", k).put("debut", debutSemaine.get(k))));
        JSONArray mois = new JSONArray();
        parMois.forEach((k, c) -> mois.put(c.json().put("mois", k)));
        JSONArray jours = new JSONArray();
        parJour.forEach((k, c) -> jours.put(c.json().put("jour", k)));
        JSONArray heures = new JSONArray();
        parHeure.forEach((k, c) -> heures.put(c.json().put("heure", k)));
        JSONArray plusGros = new JSONArray();
        caisses.stream().filter(c -> Math.abs(c.ecart) > tolerance)
                .sorted(Comparator.comparingLong((Caisse c) -> -Math.abs(c.ecart)).thenComparing(c -> c.ouverture))
                .limit(nbPlusGros)
                .forEach(c -> plusGros.put(new JSONObject().put("caisse", c.id).put("caissier", c.caissier)
                        .put("ouverture", c.ouverture.format(JJ_HH)).put("fermeture", c.fermeture.format(JJ_HH))
                        .put("attendu", c.attendu).put("billetage", c.attendu + c.ecart).put("ecart", c.ecart)));
        return new JSONObject()
                .put("total", total.json().put("sansBilletage", sansBilletage).put("tolerance", tolerance))
                .put("caissiers", caissiers).put("semaines", semaines).put("mois", mois).put("jours", jours)
                .put("heures", heures).put("plusGros", plusGros).put("tendance", tendance(parMois))
                .put("pistes", pistes(parCaissier, parJour, parHeure));
    }

    /** Dernier mois compare a la moyenne des mois precedents (montant des manquants). */
    static JSONObject tendance(Map<String, Cumul> parMois) {
        List<Cumul> l = new ArrayList<>(parMois.values());
        if (l.size() < 2) {
            return new JSONObject().put("sens", "INCONNUE").put("texte", "Pas assez de mois pour une tendance.");
        }
        Cumul dernier = l.get(l.size() - 1);
        double moyenne = l.subList(0, l.size() - 1).stream().mapToLong(c -> c.montantManquant).average().orElse(0);
        long d = dernier.montantManquant;
        /* montants negatifs : plus petit = plus de manquant */
        String sens = Math.abs(d - moyenne) <= Math.max(1000, Math.abs(moyenne) * 0.1) ? "STABLE"
                : d < moyenne ? "HAUSSE" : "BAISSE";
        String texte = "STABLE".equals(sens) ? "Manquants stables"
                : "HAUSSE".equals(sens) ? "Manquants en hausse" : "Manquants en baisse";
        return new JSONObject().put("sens", sens).put("dernier", d).put("moyenne", Math.round(moyenne)).put("texte",
                texte + " : " + d + " F le dernier mois contre " + Math.round(moyenne) + " F en moyenne avant.");
    }

    /** Pistes : caissier aux manquants recurrents, jour et heure de fermeture ou les manquants se concentrent. */
    static JSONArray pistes(Map<String, Cumul> parCaissier, Map<Integer, Cumul> parJour, Map<Integer, Cumul> parHeure) {
        JSONArray p = new JSONArray();
        parCaissier.values().stream().filter(c -> c.caisses >= 3 && c.manquants >= 2 && c.recurrence() >= 30)
                .sorted(Comparator.comparingDouble(Cumul::recurrence).reversed()).limit(3)
                .forEach(c -> p.put("Caissier aux manquants récurrents : " + c.libelle + " (" + c.manquants + " sur "
                        + c.caisses + " caisses, " + c.montantManquant + " F)."));
        concentration(parJour, "Jour", p);
        concentration(parHeure, "Heure de fermeture", p);
        return p;
    }

    private static void concentration(Map<Integer, Cumul> m, String quoi, JSONArray p) {
        int totalManquants = m.values().stream().mapToInt(c -> c.manquants).sum();
        if (totalManquants < 3) {
            return;
        }
        m.values().stream().max(Comparator.comparingInt((Cumul c) -> c.manquants)).ifPresent(c -> {
            double part = c.manquants * 100.0 / totalManquants;
            if (part >= 40 && m.size() > 1) {
                p.put(quoi + " à surveiller : " + c.libelle + " (" + c.manquants + " manquant(s) sur " + totalManquants
                        + ", " + Math.round(part) + " %).");
            }
        });
    }
}
