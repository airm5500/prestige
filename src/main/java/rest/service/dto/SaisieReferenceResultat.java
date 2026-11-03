package rest.service.dto;

/**
 * Resultat d'une saisie de reference a la caisse (cas 2 du 03/11/2026) : un motif de refus, ou la reference ecrite.
 */
public class SaisieReferenceResultat {

    private final String motif;
    private final PrixReferenceDTO reference;

    private SaisieReferenceResultat(String motif, PrixReferenceDTO reference) {
        this.motif = motif;
        this.reference = reference;
    }

    public static SaisieReferenceResultat refus(String motif) {
        return new SaisieReferenceResultat(motif, null);
    }

    public static SaisieReferenceResultat ecrite(PrixReferenceDTO reference) {
        return new SaisieReferenceResultat(null, reference);
    }

    public boolean estRefusee() {
        return motif != null;
    }

    public String getMotif() {
        return motif;
    }

    public PrixReferenceDTO getReference() {
        return reference;
    }
}
