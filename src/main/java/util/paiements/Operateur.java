package util.paiements;

import java.util.Locale;

/**
 * Opérateurs mobile money de Côte d'Ivoire et leur mode de règlement Prestige (t_type_reglement) : la vente payée est
 * clôturée avec ce mode (7 Orange, 8 Moov, 9 MTN, 10 Wave).
 */
public enum Operateur {
    ORANGE("7", "OM"), MOOV("8", "MOOV"), MTN("9", "MTN"), WAVE("10", "WAVE");

    /** Identifiant du type de règlement Prestige. */
    public final String typeReglement;
    /** Canal / code opérateur côté agrégateur. */
    public final String canal;

    Operateur(String typeReglement, String canal) {
        this.typeReglement = typeReglement;
        this.canal = canal;
    }

    public String code() {
        return name().toLowerCase(Locale.ROOT);
    }

    /** null si inconnu. */
    public static Operateur de(String code) {
        if (code == null) {
            return null;
        }
        String c = code.trim().toUpperCase(Locale.ROOT);
        if ("OM".equals(c) || "ORANGE MONEY".equals(c)) {
            return ORANGE;
        }
        for (Operateur o : values()) {
            if (o.name().equals(c) || o.typeReglement.equals(c)) {
                return o;
            }
        }
        return null;
    }
}
