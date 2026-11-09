package rest.service.extranet.ubipharm;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Une ligne de la liste des reapprovisionnements Ubipharm ({@code /ReturnProduitsReapproJSON}, plan du 07/11, §6).
 * <p>
 * La cle metier d'une ligne est inconnue : une ligne est reperee par sa position dans la liste lue ; un meme produit
 * peut apparaitre plusieurs fois (plusieurs agences ou evenements) et rien n'est dedoublonne.
 * <p>
 * Regles (§17) : references et codes en chaines ; null (absent), "" (vide), liste vide et inconnu (« N/A ») restent
 * distincts ; la date affichee est gardee brute a cote de sa lecture jj/mm/aaaa, sans heure et sans sens attribue ;
 * disponibilite (texte) ≠ stock ≠ colisage. Les cellules HTML brutes sont gardees pour la base, mais {@link #toJson()}
 * n'en contient jamais.
 */
public final class LigneReapproUbipharm {

    /** Disponibilite d'une agence, lue dans la colonne 4. */
    public static final class DisponibiliteAgence {
        /** Code agence ({@code data-etcoda}). */
        public final String etcode;
        /** Libelle de l'agence ({@code .tip-viewStock-etlib}). */
        public final String etlib;
        /** Disponibilite affichee (« En stock », « N/A »...) : un texte, jamais une quantite. */
        public final String dispo;
        /** Colisages lus dans le texte affiche : null si inconnus ou illisibles, liste vide si le texte est vide. */
        public final List<Integer> colisages;
        /** Texte affiche des colisages (« 120, 140 »), brut. */
        public final String colisageTexte;
        /** Attribut {@code data-colisage}, brut (null si absent). */
        public final String dataColisage;

        public DisponibiliteAgence(String etcode, String etlib, String dispo, List<Integer> colisages,
                String colisageTexte, String dataColisage) {
            this.etcode = etcode;
            this.etlib = etlib;
            this.dispo = dispo;
            this.colisages = colisages == null ? null : Collections.unmodifiableList(new ArrayList<>(colisages));
            this.colisageTexte = colisageTexte;
            this.dataColisage = dataColisage;
        }

        public JSONObject toJson() {
            return new JSONObject().put("etcode", nul(etcode)).put("etlib", nul(etlib)).put("dispo", nul(dispo))
                    .put("colisages", colisages == null ? JSONObject.NULL : new JSONArray(colisages))
                    .put("colisageTexte", nul(colisageTexte)).put("dataColisage", nul(dataColisage));
        }
    }

    public final int position;
    /** Reference Ubipharm ({@code data-pscode} du lien {@code a.popup-produit}). */
    public final String pscode;
    /** Texte du lien produit. */
    public final String designation;
    /** Premier {@code .td-detail} de la colonne 0 (code ou CIP affiche). */
    public final String code;
    /** Deuxieme {@code .td-detail} de la colonne 0, s'il existe. */
    public final String categorie;
    /** Textes de tous les {@code .td-detail} de la colonne 0, dans l'ordre (rien n'est perdu si l'ordre differe). */
    public final List<String> details;
    /** Colonne 1 telle qu'affichee ; sens metier non confirme. */
    public final String dateAffichee;
    /** Colonne 1 lue en jj/mm/aaaa ; null si absente ou dans un autre format. Aucune heure. */
    public final LocalDate date;
    /** Colonne 2. */
    public final String codeAgence;
    /** Colonne 3 (ex. « Normal »). */
    public final String statut;
    /** Colonne 4 : une entree par agence. */
    public final List<DisponibiliteAgence> disponibilites;
    /** Champs caches de la colonne 5 (seuls ceux-ci sont lus). */
    public final String pscodeCache;
    public final String cipCache;
    public final String etcodaCache;
    /** Cellules brutes, telles que recues (HTML) : pour la base seulement, jamais renvoyees a l'ecran. */
    public final List<String> cellulesBrutes;

    public LigneReapproUbipharm(int position, String pscode, String designation, List<String> details,
            String dateAffichee, LocalDate date, String codeAgence, String statut,
            List<DisponibiliteAgence> disponibilites, String pscodeCache, String cipCache, String etcodaCache,
            List<String> cellulesBrutes) {
        this.position = position;
        this.pscode = pscode;
        this.designation = designation;
        this.details = Collections.unmodifiableList(new ArrayList<>(details));
        this.code = this.details.isEmpty() ? null : this.details.get(0);
        this.categorie = this.details.size() < 2 ? null : this.details.get(1);
        this.dateAffichee = dateAffichee;
        this.date = date;
        this.codeAgence = codeAgence;
        this.statut = statut;
        this.disponibilites = Collections.unmodifiableList(new ArrayList<>(disponibilites));
        this.pscodeCache = pscodeCache;
        this.cipCache = cipCache;
        this.etcodaCache = etcodaCache;
        this.cellulesBrutes = Collections.unmodifiableList(new ArrayList<>(cellulesBrutes));
    }

    /** Champs normalises seulement : jamais de HTML. */
    public JSONObject toJson() {
        JSONArray d = new JSONArray();
        for (DisponibiliteAgence a : disponibilites) {
            d.put(a.toJson());
        }
        return new JSONObject().put("position", position).put("pscode", nul(pscode))
                .put("designation", nul(designation)).put("code", nul(code)).put("categorie", nul(categorie))
                .put("details", new JSONArray(details)).put("dateAffichee", nul(dateAffichee))
                .put("date", date == null ? JSONObject.NULL : date.toString()).put("codeAgence", nul(codeAgence))
                .put("statut", nul(statut)).put("disponibilites", d).put("pscodeCache", nul(pscodeCache))
                .put("cipCache", nul(cipCache)).put("etcodaCache", nul(etcodaCache));
    }

    static Object nul(Object o) {
        return o == null ? JSONObject.NULL : o;
    }
}
