package rest.service.extranet.ubipharm;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Une ligne du tableau {@code #reclamation} du detail d'une reclamation Ubipharm (plan du 07/11, §8).
 *
 * <p>
 * Les cellules sont gardees TELLES QUELLES, en texte, PAR POSITION (14 attendues, plusieurs sans titre) : on ne leur
 * prete aucun sens qui n'est pas documente. Seules les positions dont le sens est observe donnent un champ reconnu :
 * <ul>
 * <li>3 : produit facture (pscode lu dans {@code data-pscode}, designation, CIP) ;</li>
 * <li>4 : quantite reclamee ;</li>
 * <li>5 : prix grossiste affiche (brut et decimal, sans devise deduite) ;</li>
 * <li>7 : motif ;</li>
 * <li>11 : commentaire de la demande (ne prouve pas l'accord du grossiste).</li>
 * </ul>
 * Une valeur introuvable reste null ; un montant inconnu reste null, jamais 0. Le commentaire et le motif ne sont
 * jamais journalises.
 */
public final class LigneReclamationUbipharm {

    /** Nombre de colonnes observe dans le tableau #reclamation. */
    public static final int COLONNES = 14;

    private final int position;
    private final List<String> cellules;
    private final String pscode;
    private final String designation;
    private final String cip;
    private final Integer quantite;
    private final String prixBrut;
    private final BigDecimal prix;
    private final String motif;
    private final String commentaire;

    public LigneReclamationUbipharm(int position, List<String> cellules, String pscode, String designation, String cip,
            Integer quantite, String prixBrut, BigDecimal prix, String motif, String commentaire) {
        this.position = position;
        this.cellules = cellules == null ? Collections.emptyList()
                : Collections.unmodifiableList(new ArrayList<>(cellules));
        this.pscode = pscode;
        this.designation = designation;
        this.cip = cip;
        this.quantite = quantite;
        this.prixBrut = prixBrut;
        this.prix = prix;
        this.motif = motif;
        this.commentaire = commentaire;
    }

    /** Rang de la ligne dans le tableau (0, 1, 2...). */
    public int position() {
        return position;
    }

    /** Texte brut de chaque cellule, par position (entites HTML decodees, aucun balisage). */
    public List<String> cellules() {
        return cellules;
    }

    /** Cellule a une position, ou null si la ligne n'a pas cette colonne. */
    public String cellule(int i) {
        return i >= 0 && i < cellules.size() ? cellules.get(i) : null;
    }

    /** Vrai si la ligne a exactement les 14 colonnes observees : les champs reconnus ne sont lus que dans ce cas. */
    public boolean complete() {
        return cellules.size() == COLONNES;
    }

    public String pscode() {
        return pscode;
    }

    public String designation() {
        return designation;
    }

    public String cip() {
        return cip;
    }

    public Integer quantite() {
        return quantite;
    }

    public String prixBrut() {
        return prixBrut;
    }

    public BigDecimal prix() {
        return prix;
    }

    public String motif() {
        return motif;
    }

    public String commentaire() {
        return commentaire;
    }

    /** JSON sans HTML : seulement du texte decode. */
    public JSONObject toJson() {
        return new JSONObject().put("position", position).put("cellules", new JSONArray(cellules))
                .put("complete", complete()).put("pscode", nul(pscode)).put("designation", nul(designation))
                .put("cip", nul(cip)).put("quantite", nul(quantite)).put("prixBrut", nul(prixBrut))
                .put("prix", nul(prix)).put("motif", nul(motif)).put("commentaire", nul(commentaire));
    }

    static Object nul(Object o) {
        return o == null ? JSONObject.NULL : o;
    }
}
