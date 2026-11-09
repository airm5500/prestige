package rest.service.extranet.commun;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import javax.persistence.EntityManager;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * BL du grossiste saisis ou non dans Prestige (demande du 09/11). Chaque ligne d'une liste de documents de l'extranet
 * (BL, factures) est comparee aux references des bons de livraison saisis ({@code t_bon_livraison.str_REF_LIVRAISON}).
 * Releve sur le poste : pour DPCI on saisit le n° de facture (R40237756), pour TEDIS le n° de document
 * (2629645160-BKE), pour Ubipharm le n° de facture (YOP-139749, BKE/765220) ; toutes les colonnes de numero sont donc
 * essayees. La comparaison ignore la casse, les espaces, tirets et barres, et les zeros de tete d'un numero. Un BL
 * saisi sous un grossiste qui n'est pas lie a cet extranet est signale.
 */
public final class BlSaisis {

    /** Listes de documents comparees aux BL saisis. */
    public static final Set<String> LISTES = new HashSet<>(
            Arrays.asList("DPCI_BL", "DPCI_FACTURES", "TEDIS_BL_QUINZAINE", "FACTURES"));

    private static final Pattern TITRE_NUMERO = Pattern.compile("^N° (BL|facture|document)$",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);

    /** BL saisis relus : depuis cette duree avant aujourd'hui. */
    public static final int MOIS = 24;

    private BlSaisis() {
    }

    /** Reference comparable : majuscules, lettres et chiffres seuls, sans zeros de tete si ce n'est qu'un nombre. */
    public static String normal(String s) {
        if (s == null) {
            return null;
        }
        String n = s.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]", "");
        if (n.matches("\\d+")) {
            n = n.replaceFirst("^0+(?=\\d)", "");
        }
        return n.isEmpty() ? null : n;
    }

    /** Index des colonnes de numero (N° BL, N° facture, N° document) d'apres leurs titres. */
    public static List<Integer> colonnes(JSONArray titres) {
        List<Integer> l = new ArrayList<>();
        for (int i = 0; titres != null && i < titres.length(); i++) {
            if (TITRE_NUMERO.matcher(titres.optString(i, "").trim()).matches()) {
                l.add(i);
            }
        }
        return l;
    }

    /** Un BL saisi : reference telle que saisie, date, grossiste, statut. */
    public static final class Saisi {
        public final String reference;
        public final String date;
        public final String grossisteId;
        public final String grossiste;
        public final boolean enCours;

        public Saisi(String reference, String date, String grossisteId, String grossiste, boolean enCours) {
            this.reference = reference;
            this.date = date;
            this.grossisteId = grossisteId;
            this.grossiste = grossiste;
            this.enCours = enCours;
        }
    }

    /**
     * Marque chaque ligne : {@code saisi} = {reference, date, grossiste, enCours, autreGrossiste} ou null ; ajoute le
     * resume {@code saisie} a la reponse. Sans effet sur une liste qui n'est pas une liste de documents.
     *
     * @param saisis
     *            references normalisees vers BL saisis (plus recent en premier)
     * @param lies
     *            grossistes lies a l'extranet (vide : aucun lien, pas de controle du grossiste)
     */
    public static void marquer(JSONObject reponse, Map<String, Saisi> saisis, Set<String> lies) {
        List<Integer> cols = colonnes(reponse.optJSONArray("colonnes"));
        JSONArray lignes = reponse.optJSONArray("lignes");
        if (cols.isEmpty() || lignes == null) {
            return;
        }
        int oui = 0, non = 0, autre = 0;
        for (int i = 0; i < lignes.length(); i++) {
            JSONObject l = lignes.getJSONObject(i);
            JSONArray c = l.optJSONArray("cellules");
            Saisi trouve = null;
            for (int k : cols) {
                String n = normal(c == null ? null : c.optString(k, null));
                if (n != null && saisis.containsKey(n)) {
                    trouve = saisis.get(n);
                    break;
                }
            }
            if (trouve == null) {
                non++;
                l.put("saisi", JSONObject.NULL);
                continue;
            }
            oui++;
            boolean ailleurs = !lies.isEmpty() && !lies.contains(trouve.grossisteId);
            if (ailleurs) {
                autre++;
            }
            l.put("saisi",
                    new JSONObject().put("reference", trouve.reference).put("date", trouve.date)
                            .put("grossiste", trouve.grossiste == null ? "" : trouve.grossiste)
                            .put("enCours", trouve.enCours).put("autreGrossiste", ailleurs));
        }
        JSONArray titres = new JSONArray();
        for (int k : cols) {
            titres.put(reponse.getJSONArray("colonnes").getString(k));
        }
        reponse.put("saisie", new JSONObject().put("colonnes", titres).put("saisis", oui).put("nonSaisis", non)
                .put("autreGrossiste", autre).put("grossistesLies", lies.size()));
    }

    /** BL saisis dans Prestige (sauf supprimes) depuis {@link #MOIS} mois, par reference normalisee. */
    @SuppressWarnings("unchecked")
    public static Map<String, Saisi> charger(EntityManager em) {
        Map<String, Saisi> m = new HashMap<>();
        List<Object[]> l = em
                .createNativeQuery("SELECT b.str_REF_LIVRAISON, DATE_FORMAT(b.dt_DATE_LIVRAISON, '%Y-%m-%d'),"
                        + " g.lg_GROSSISTE_ID, g.str_LIBELLE, b.str_STATUT FROM t_bon_livraison b"
                        + " LEFT JOIN t_order o ON o.lg_ORDER_ID = b.lg_ORDER_ID"
                        + " LEFT JOIN t_grossiste g ON g.lg_GROSSISTE_ID = o.lg_GROSSISTE_ID"
                        + " WHERE b.str_REF_LIVRAISON IS NOT NULL AND (b.str_STATUT IS NULL OR b.str_STATUT <> 'delete')"
                        + " AND (b.dt_DATE_LIVRAISON IS NULL OR b.dt_DATE_LIVRAISON >= DATE_SUB(CURDATE(), INTERVAL "
                        + MOIS + " MONTH)) ORDER BY b.dt_DATE_LIVRAISON DESC")
                .getResultList();
        for (Object[] o : l) {
            String n = normal((String) o[0]);
            if (n != null && !m.containsKey(n)) {
                m.put(n, new Saisi((String) o[0], (String) o[1], (String) o[2], (String) o[3], "enable".equals(o[4])));
            }
        }
        return m;
    }

    /** Branchement dans la lecture des listes gardees. */
    public static void marquer(EntityManager em, SourceExtranet source, String liste, JSONObject reponse) {
        if (!LISTES.contains(liste) || colonnes(reponse.optJSONArray("colonnes")).isEmpty()) {
            return;
        }
        Set<String> lies = new HashSet<>();
        for (Map.Entry<String, SourceExtranet> e : new LiaisonGrossistes(em).liens().entrySet()) {
            if (e.getValue() == source) {
                lies.add(e.getKey());
            }
        }
        marquer(reponse, charger(em), lies);
    }
}
