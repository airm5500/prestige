package rest.service.filtre;

import java.math.BigDecimal;
import java.util.Locale;

/**
 * Filtre de comparaison sur un montant, partage par les ecrans qui en demandent un.
 *
 * <p>
 * Les points 10 et 21 du cahier des charges reclament le meme filtre : egal a, different de, superieur a, superieur ou
 * egal, inferieur a, inferieur ou egal. L'ecrire deux fois menait a deux comportements differents sur les bords -
 * valeur vide, virgule decimale, separateur de milliers.
 *
 * <p>
 * Un operateur absent ou une valeur vide ne filtrent rien : l'ecran s'ouvre alors comme avant.
 */
public final class FiltreMontant {

    /** Operateurs proposes par les ecrans. Les libelles courts sont ceux envoyes par le client. */
    public enum Operateur {
        EGAL("eq"), DIFFERENT("ne"), SUPERIEUR("gt"), SUPERIEUR_OU_EGAL("gte"), INFERIEUR("lt"),
        INFERIEUR_OU_EGAL("lte");

        private final String code;

        Operateur(String code) {
            this.code = code;
        }

        public String getCode() {
            return code;
        }

        /** Operateur correspondant au code recu, ou null si le code est vide ou inconnu. */
        public static Operateur parCode(String code) {
            if (code == null || code.trim().isEmpty()) {
                return null;
            }
            String recherche = code.trim().toLowerCase(Locale.ROOT);
            for (Operateur o : values()) {
                if (o.code.equals(recherche) || o.name().toLowerCase(Locale.ROOT).equals(recherche)) {
                    return o;
                }
            }
            return null;
        }
    }

    private final Operateur operateur;
    private final BigDecimal reference;

    private FiltreMontant(Operateur operateur, BigDecimal reference) {
        this.operateur = operateur;
        this.reference = reference;
    }

    /**
     * Filtre construit a partir de ce que l'ecran envoie. Rend un filtre inactif - qui laisse tout passer - quand
     * l'operateur ou la valeur manquent, ou quand la valeur n'est pas un nombre.
     */
    public static FiltreMontant de(String codeOperateur, String valeur) {
        Operateur op = Operateur.parCode(codeOperateur);
        BigDecimal montant = nombre(valeur);
        if (op == null || montant == null) {
            return new FiltreMontant(null, null);
        }
        return new FiltreMontant(op, montant);
    }

    /** Vrai quand aucun filtrage n'est demande. */
    public boolean inactif() {
        return operateur == null || reference == null;
    }

    /**
     * Le montant passe-t-il le filtre ? Un montant illisible est ecarte des qu'un filtre est actif : le laisser passer
     * reviendrait a presenter une ligne qui ne repond pas au critere demande.
     */
    public boolean accepte(Object montant) {
        if (inactif()) {
            return true;
        }
        BigDecimal valeur = nombre(montant);
        if (valeur == null) {
            return false;
        }
        int comparaison = valeur.compareTo(reference);
        switch (operateur) {
        case EGAL:
            return comparaison == 0;
        case DIFFERENT:
            return comparaison != 0;
        case SUPERIEUR:
            return comparaison > 0;
        case SUPERIEUR_OU_EGAL:
            return comparaison >= 0;
        case INFERIEUR:
            return comparaison < 0;
        case INFERIEUR_OU_EGAL:
            return comparaison <= 0;
        default:
            return true;
        }
    }

    /** Rappel du critere retenu, pour l'en-tete des exports et des impressions. Vide si inactif. */
    public String libelle() {
        if (inactif()) {
            return "";
        }
        return libelleOperateur() + " " + reference.toPlainString();
    }

    private String libelleOperateur() {
        switch (operateur) {
        case EGAL:
            return "égal à";
        case DIFFERENT:
            return "différent de";
        case SUPERIEUR:
            return "supérieur à";
        case SUPERIEUR_OU_EGAL:
            return "supérieur ou égal à";
        case INFERIEUR:
            return "inférieur à";
        default:
            return "inférieur ou égal à";
        }
    }

    /**
     * Lecture d'un montant quelle que soit son ecriture : nombre, ou texte avec virgule decimale et separateurs de
     * milliers, comme l'affichent les ecrans. Rend null si rien n'est exploitable.
     */
    private static BigDecimal nombre(Object valeur) {
        if (valeur == null) {
            return null;
        }
        if (valeur instanceof Number) {
            return new BigDecimal(valeur.toString());
        }
        String texte = valeur.toString().trim();
        if (texte.isEmpty()) {
            return null;
        }
        // Espaces, y compris insecables, retires : les ecrans les emploient comme separateur de
        // milliers.
        texte = texte.replace(" ", "").replace("\u00a0", "");
        if (texte.contains(",")) {
            // Virgule presente : c'est la decimale, les points ne peuvent etre que des milliers.
            texte = texte.replace(".", "").replace(",", ".");
        } else if (texte.matches("-?\\d{1,3}(\\.\\d{3})+")) {
            // Pas de virgule, mais des groupes de trois chiffres apres chaque point : c'est un
            // separateur de milliers, comme l'affichent les grilles (1.000 = mille). Un point
            // isole suivi d'autre chose reste une decimale : « 1.5 » vaut un et demi.
            texte = texte.replace(".", "");
        }
        try {
            return new BigDecimal(texte);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
