package rest.service.extranet.ubipharm;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Une reclamation Ubipharm, lue dans la liste ({@code /ReturnReclamationsTransmisesJSON}) ou dans le detail
 * ({@code /AfficherReclamation}) (plan du 07/11, §7 et §8).
 *
 * <ul>
 * <li>{@code id}, {@code eta}, {@code appl} sont EXTRAITS du lien de detail (liste) ou repris de la requete (detail),
 * jamais reconstruits en decoupant la reference ; {@code appl} n'est pas toujours EXT (YOP, VRI...) ;</li>
 * <li>les numeros associes gardent la chaine brute ET la liste (nature a confirmer) ;</li>
 * <li>les dates gardent le texte brut ET la date lue (sans heure inventee) ;</li>
 * <li>l'agence n'est connue que par le detail ; {@code lignes} est null pour une ligne de liste (non chargees), liste
 * vide pour un detail sans ligne ;</li>
 * <li>une reclamation « Supprimée » reste une reclamation (statut garde tel quel).</li>
 * </ul>
 */
public final class ReclamationUbipharm {

    private final String id;
    private final String eta;
    private final String appl;
    private final String reference;
    private final String numerosAssociesBrut;
    private final String statut;
    private final String dateEnvoiBrute;
    private final String dateMiseAJourBrute;
    private final String agence;
    private final List<String> entetes;
    private final List<LigneReclamationUbipharm> lignes;

    public ReclamationUbipharm(String id, String eta, String appl, String reference, String numerosAssociesBrut,
            String statut, String dateEnvoiBrute, String dateMiseAJourBrute, String agence, List<String> entetes,
            List<LigneReclamationUbipharm> lignes) {
        this.id = id;
        this.eta = eta;
        this.appl = appl;
        this.reference = reference;
        this.numerosAssociesBrut = numerosAssociesBrut;
        this.statut = statut;
        this.dateEnvoiBrute = dateEnvoiBrute;
        this.dateMiseAJourBrute = dateMiseAJourBrute;
        this.agence = agence;
        this.entetes = entetes == null ? null : Collections.unmodifiableList(new ArrayList<>(entetes));
        this.lignes = lignes == null ? null : Collections.unmodifiableList(new ArrayList<>(lignes));
    }

    public String id() {
        return id;
    }

    public String eta() {
        return eta;
    }

    public String appl() {
        return appl;
    }

    /** Cle de la reclamation : id, eta et appl tires du lien. null si l'un manque. */
    public String cle() {
        return id == null || eta == null || appl == null ? null : id + "|" + eta + "|" + appl;
    }

    public String reference() {
        return reference;
    }

    public String numerosAssociesBrut() {
        return numerosAssociesBrut;
    }

    /** Numeros associes separes par des espaces, en chaines ; liste vide si aucun, null si la cellule est absente. */
    public List<String> numerosAssocies() {
        return numeros(numerosAssociesBrut);
    }

    public String statut() {
        return statut;
    }

    public String dateEnvoiBrute() {
        return dateEnvoiBrute;
    }

    public LocalDate dateEnvoi() {
        return ReclamationsParseur.date(dateEnvoiBrute);
    }

    public String dateMiseAJourBrute() {
        return dateMiseAJourBrute;
    }

    public LocalDate dateMiseAJour() {
        return ReclamationsParseur.date(dateMiseAJourBrute);
    }

    /** Agence (detail seulement) ; null si introuvable ou ligne de liste. */
    public String agence() {
        return agence;
    }

    /** Titres des colonnes du tableau #reclamation, par position ("" pour une colonne sans titre) ; null en liste. */
    public List<String> entetes() {
        return entetes;
    }

    /** Lignes du detail ; null pour une ligne de liste. */
    public List<LigneReclamationUbipharm> lignes() {
        return lignes;
    }

    static List<String> numeros(String brut) {
        if (brut == null) {
            return null;
        }
        List<String> l = new ArrayList<>();
        for (String s : brut.trim().split("\\s+")) {
            if (!s.isEmpty()) {
                l.add(s);
            }
        }
        return l;
    }

    /** JSON sans HTML : seulement du texte decode. */
    public JSONObject toJson() {
        List<String> n = numerosAssocies();
        LocalDate de = dateEnvoi(), dm = dateMiseAJour();
        JSONObject o = new JSONObject().put("id", nul(id)).put("eta", nul(eta)).put("appl", nul(appl))
                .put("reference", nul(reference)).put("numerosAssociesBrut", nul(numerosAssociesBrut))
                .put("numerosAssocies", n == null ? JSONObject.NULL : new JSONArray(n)).put("statut", nul(statut))
                .put("dateEnvoiBrute", nul(dateEnvoiBrute))
                .put("dateEnvoi", de == null ? JSONObject.NULL : de.toString())
                .put("dateMiseAJourBrute", nul(dateMiseAJourBrute))
                .put("dateMiseAJour", dm == null ? JSONObject.NULL : dm.toString()).put("agence", nul(agence))
                .put("entetes", entetes == null ? JSONObject.NULL : new JSONArray(entetes));
        if (lignes == null) {
            o.put("lignes", JSONObject.NULL);
        } else {
            JSONArray a = new JSONArray();
            lignes.forEach(l -> a.put(l.toJson()));
            o.put("lignes", a);
        }
        return o;
    }

    private static Object nul(Object o) {
        return o == null ? JSONObject.NULL : o;
    }
}
