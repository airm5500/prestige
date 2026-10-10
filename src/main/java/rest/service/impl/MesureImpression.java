package rest.service.impl;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Retours du 10/10 (journal du support : impression des tickets `vente/ticket/vo` et `vente/ticket/vno` de 24 a 39 s le
 * 08/10) : mesure, ticket par ticket, le temps passe dans chaque etape de l'impression, pour savoir ce qui la retient
 * (recherche de l'imprimante par Windows, preparation du travail d'impression, envoi au spouleur, ou le reste : lecture
 * de la vente et mise en page).
 * <p>
 * Le chronometre suit le fil de la requete (l'impression se fait d'un bout a l'autre dans le meme fil) ; hors d'une
 * mesure demarree, les etapes ne coutent rien et ne gardent rien. Aucune donnee de la vente n'y est conservee.
 */
public final class MesureImpression {

    public static final String RECHERCHE_IMPRIMANTE = "recherche de l'imprimante";
    public static final String PREPARATION_TRAVAIL = "préparation du travail d'impression";
    public static final String ENVOI_SPOULEUR = "envoi au spouleur";
    static final String RESTE = "lecture de la vente et mise en page";

    private static final ThreadLocal<MesureImpression> EN_COURS = new ThreadLocal<>();

    private final String libelle;
    private final long debut;
    private final Map<String, long[]> etapes = new LinkedHashMap<>();
    private long fin;
    private String imprimante;

    private MesureImpression(String libelle, long debut) {
        this.libelle = libelle;
        this.debut = debut;
    }

    /** Demarre la mesure de l'impression en cours dans ce fil (remplace une mesure oubliee). */
    public static void demarrer(String libelle) {
        EN_COURS.set(new MesureImpression(libelle, System.nanoTime()));
    }

    /** Ajoute la duree d'une etape (cumulee si l'etape revient : plusieurs exemplaires). */
    public static void etape(String nom, long debutNano) {
        MesureImpression m = EN_COURS.get();
        if (m != null) {
            m.ajouter(nom, (System.nanoTime() - debutNano) / 1_000_000L);
        }
    }

    /** Nom de l'imprimante trouvee (affiche dans le detail : une imprimante reseau injoignable se reconnait ainsi). */
    public static void imprimante(String nom) {
        MesureImpression m = EN_COURS.get();
        if (m != null && nom != null) {
            m.imprimante = nom;
        }
    }

    public String getImprimante() {
        return imprimante;
    }

    /** Termine la mesure du fil et la rend (null si aucune n'etait demarree). */
    public static MesureImpression terminer() {
        MesureImpression m = EN_COURS.get();
        EN_COURS.remove();
        if (m != null) {
            m.fin = System.nanoTime();
        }
        return m;
    }

    void ajouter(String nom, long ms) {
        long[] v = etapes.computeIfAbsent(nom, k -> new long[2]);
        v[0] += ms;
        v[1]++;
    }

    public long totalMs() {
        return ((fin == 0 ? System.nanoTime() : fin) - debut) / 1_000_000L;
    }

    public String getLibelle() {
        return libelle;
    }

    /** Duree d'une etape (ms), 0 si elle n'a pas eu lieu. */
    public long dureeMs(String nom) {
        long[] v = etapes.get(nom);
        return v == null ? 0 : v[0];
    }

    /**
     * Detail lisible : « total 27,4 s : recherche de l'imprimante 25,1 s ; envoi au spouleur 1,9 s (2 fois) ; lecture
     * de la vente et mise en page 0,4 s ». L'etape la plus longue vient en premier.
     */
    public String detail() {
        long total = totalMs();
        long mesure = 0;
        Map<String, long[]> toutes = new LinkedHashMap<>();
        for (Map.Entry<String, long[]> e : etapes.entrySet()) {
            toutes.put(e.getKey(), e.getValue());
            mesure += e.getValue()[0];
        }
        toutes.put(RESTE, new long[] { Math.max(0, total - mesure), 1 });
        StringBuilder sb = new StringBuilder("total ").append(secondes(total)).append(" : ");
        toutes.entrySet().stream().sorted((a, b) -> Long.compare(b.getValue()[0], a.getValue()[0])).forEach(e -> {
            if (sb.charAt(sb.length() - 2) != ':') {
                sb.append(" ; ");
            }
            sb.append(e.getKey()).append(' ').append(secondes(e.getValue()[0]));
            if (e.getValue()[1] > 1) {
                sb.append(" (").append(e.getValue()[1]).append(" fois)");
            }
        });
        return sb.toString();
    }

    /** Nom de l'etape la plus longue (reste compris) : ce qui retient l'impression. */
    public String etapeLaPlusLongue() {
        long mesure = 0;
        String nom = null;
        long max = -1;
        for (Map.Entry<String, long[]> e : etapes.entrySet()) {
            mesure += e.getValue()[0];
            if (e.getValue()[0] > max) {
                max = e.getValue()[0];
                nom = e.getKey();
            }
        }
        return totalMs() - mesure > max ? RESTE : nom;
    }

    static String secondes(long ms) {
        return String.format(java.util.Locale.FRANCE, "%.1f s", ms / 1000.0);
    }
}
