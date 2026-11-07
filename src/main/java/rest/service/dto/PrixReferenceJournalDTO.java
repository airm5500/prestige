package rest.service.dto;

import dal.PrixReferenceJournal;
import dal.PrixReferenceJournalAction;
import dal.PrixReferenceType;
import java.text.SimpleDateFormat;
import java.util.Objects;

/**
 * Ligne du journal des prix de reference telle que la fiche article l'affiche (cas 2 du 03/11/2026, Q2.6).
 */
public class PrixReferenceJournalDTO {

    private String id;
    private String date;
    private String qui;
    private String origine;
    private String tiersPayant;
    private String action;
    private String avant;
    private String apres;
    private String venteId;

    public PrixReferenceJournalDTO() {
    }

    public PrixReferenceJournalDTO(PrixReferenceJournal j, String libelleTiersPayant, String referenceVente) {
        this.id = j.getId();
        this.date = j.getDateAction() == null ? "" : new SimpleDateFormat("dd/MM/yyyy HH:mm").format(j.getDateAction());
        this.qui = Objects.requireNonNullElse(j.getUtilisateur(), "");
        this.origine = j.getAction() == PrixReferenceJournalAction.ANNULATION
                ? "Annulation — vente "
                        + (referenceVente == null || referenceVente.isEmpty() ? j.getVenteId() : referenceVente)
                : origine(j.getVenteId(), referenceVente);
        this.tiersPayant = Objects.requireNonNullElse(libelleTiersPayant, j.getTiersPayantId());
        this.action = j.getAction() == null ? "" : j.getAction().getLibelle();
        this.avant = resume(j.getAncienneValeur(), j.getAncienTaux(), j.getAncienType());
        this.apres = resume(j.getNouvelleValeur(), j.getNouveauTaux(), j.getNouveauType());
        this.venteId = j.getVenteId();
    }

    /** « Caisse — vente VO-… » quand la saisie vient d'une vente, « Fiche article » sinon. */
    public static String origine(String venteId, String referenceVente) {
        if (venteId == null || venteId.isEmpty()) {
            return "Fiche article";
        }
        String ref = referenceVente == null || referenceVente.isEmpty() ? venteId : referenceVente;
        return "Caisse — vente " + ref;
    }

    /** « prix 3 145 · taux 15 % » ; « — » quand il n'y a rien (avant un ajout, apres une suppression). */
    public static String resume(Integer valeur, Float taux, PrixReferenceType type) {
        if (valeur == null && taux == null) {
            return "—";
        }
        StringBuilder sb = new StringBuilder();
        if (valeur != null && type != PrixReferenceType.TAUX) {
            sb.append("prix ").append(String.format(java.util.Locale.ROOT, "%,d", valeur).replace(',', ' '));
        }
        if (taux != null && type != PrixReferenceType.PRIX_REFERENCE) {
            if (sb.length() > 0) {
                sb.append(" · ");
            }
            sb.append("taux ").append(taux.intValue()).append(" %");
        }
        return sb.length() == 0 ? "—" : sb.toString();
    }

    public String getId() {
        return id;
    }

    public String getDate() {
        return date;
    }

    public String getQui() {
        return qui;
    }

    public String getOrigine() {
        return origine;
    }

    public String getTiersPayant() {
        return tiersPayant;
    }

    public String getAction() {
        return action;
    }

    public String getAvant() {
        return avant;
    }

    public String getApres() {
        return apres;
    }

    public String getVenteId() {
        return venteId;
    }
}
