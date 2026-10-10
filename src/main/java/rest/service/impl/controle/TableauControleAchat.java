package rest.service.impl.controle;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Retours du 10/10 (Q7) : tableau de bord du controle des achats, calcule a partir des BL de la periode.
 * <ul>
 * <li>delai de saisie = date de saisie du BL − date du BL du grossiste (jours) ; au plus le seuil = « dans le delai »,
 * au-dela = « en retard » ; un BL sans date reste « delai inconnu » ;</li>
 * <li>controle = controle termine ;</li>
 * <li>totaux, puis par groupe de grossistes, et par grossiste dans chaque groupe.</li>
 * </ul>
 */
public final class TableauControleAchat {

    public static final String SANS_GROUPE = "Sans groupe";

    /** Compteurs d'un ensemble de BL (total, groupe ou grossiste). */
    public static final class Compteur {
        public final String id, libelle;
        public int bons, controles, dansDelai, enRetard, delaiInconnu;
        public long montant, sommeDelais;
        final Map<String, Compteur> enfants = new LinkedHashMap<>();

        Compteur(String id, String libelle) {
            this.id = id;
            this.libelle = libelle;
        }

        void ajouter(boolean controle, Integer delai, int seuil, long montantBl) {
            bons++;
            montant += montantBl;
            if (controle) {
                controles++;
            }
            if (delai == null) {
                delaiInconnu++;
            } else if (delai <= seuil) {
                dansDelai++;
                sommeDelais += Math.max(0, delai);
            } else {
                enRetard++;
                sommeDelais += delai;
            }
        }

        public int pourcentageControles() {
            return bons == 0 ? 0 : (int) Math.round(controles * 100.0 / bons);
        }

        public int pourcentageDansDelai() {
            int connus = dansDelai + enRetard;
            return connus == 0 ? 0 : (int) Math.round(dansDelai * 100.0 / connus);
        }

        /** Delai moyen de saisie en jours (une decimale), sur les BL dont les deux dates sont connues. */
        public double delaiMoyen() {
            int connus = dansDelai + enRetard;
            return connus == 0 ? 0 : Math.round(sommeDelais * 10.0 / connus) / 10.0;
        }

        JSONObject json() {
            return new JSONObject().put("id", id).put("libelle", libelle).put("bons", bons).put("controles", controles)
                    .put("pctControles", pourcentageControles()).put("dansDelai", dansDelai).put("enRetard", enRetard)
                    .put("delaiInconnu", delaiInconnu).put("pctDansDelai", pourcentageDansDelai())
                    .put("delaiMoyen", delaiMoyen()).put("montant", montant);
        }
    }

    private final int seuil;
    private final Compteur total = new Compteur("", "Total");

    public TableauControleAchat(int seuil) {
        this.seuil = Math.max(0, seuil);
    }

    public void ajouter(String groupeId, String groupeLibelle, String grossisteId, String grossisteLibelle,
            boolean controle, Integer delai, Integer montant) {
        long m = montant == null ? 0 : montant;
        boolean sansGroupe = groupeId == null || groupeId.isEmpty();
        String gid = sansGroupe ? "" : groupeId;
        total.ajouter(controle, delai, seuil, m);
        Compteur g = total.enfants.computeIfAbsent(gid,
                k -> new Compteur(k, sansGroupe ? SANS_GROUPE : nonVide(groupeLibelle, "Groupe " + k)));
        g.ajouter(controle, delai, seuil, m);
        String fid = grossisteId == null ? "" : grossisteId;
        g.enfants.computeIfAbsent(fid, k -> new Compteur(k, nonVide(grossisteLibelle, "Grossiste inconnu")))
                .ajouter(controle, delai, seuil, m);
    }

    private static String nonVide(String s, String defaut) {
        return s == null || s.trim().isEmpty() ? defaut : s.trim();
    }

    public Compteur total() {
        return total;
    }

    /** Groupes du plus grand nombre de BL au plus petit ; « Sans groupe » en dernier. */
    public List<Compteur> groupes() {
        return trier(total.enfants.values().stream().collect(Collectors.toList()));
    }

    private static List<Compteur> trier(List<Compteur> l) {
        l.sort(Comparator.<Compteur> comparingInt(c -> SANS_GROUPE.equals(c.libelle) ? 1 : 0)
                .thenComparing(Comparator.<Compteur> comparingInt(c -> c.bons).reversed())
                .thenComparing(c -> c.libelle));
        return l;
    }

    public JSONObject json() {
        JSONArray groupes = new JSONArray();
        for (Compteur g : groupes()) {
            JSONArray grossistes = new JSONArray();
            for (Compteur f : trier(g.enfants.values().stream().collect(Collectors.toList()))) {
                grossistes.put(f.json());
            }
            groupes.put(g.json().put("grossistes", grossistes));
        }
        return new JSONObject().put("total", total.json()).put("groupes", groupes).put("seuil", seuil);
    }
}
