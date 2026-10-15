package util.paiements;

/**
 * B3 (Prestige Mobile) : statut d'un paiement mobile money. Les transitions sont dans {@link TransitionsPaiement} : un
 * paiement payé ne redevient jamais « en attente », une vente n'est jamais clôturée deux fois, un paiement arrivé APRÈS
 * une annulation ou une expiration est signalé (régularisation) et ne clôture rien.
 */
public enum StatutPaiement {
    EN_ATTENTE("en_attente"), PAYE("paye"), ECHOUE("echoue"), EXPIRE("expire"), ANNULE("annule"),
    /**
     * Argent reçu alors que le paiement était annulé ou expiré : à régulariser au comptoir (remboursement ou vente).
     */
    PAYE_APRES_ANNULATION("paye_apres_annulation");

    public final String code;

    StatutPaiement(String code) {
        this.code = code;
    }

    /** Plus rien n'est attendu du fournisseur (sauf un paiement tardif, toujours signalé). */
    public boolean termine() {
        return this != EN_ATTENTE;
    }

    public boolean argentRecu() {
        return this == PAYE || this == PAYE_APRES_ANNULATION;
    }

    public static StatutPaiement de(String code) {
        for (StatutPaiement s : values()) {
            if (s.code.equals(code)) {
                return s;
            }
        }
        return EN_ATTENTE;
    }
}
