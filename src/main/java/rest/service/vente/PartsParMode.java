package rest.service.vente;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Part d'une vente payee dans chaque mode de reglement.
 *
 * <p>
 * Une vente payee en plusieurs modes (especes + mobile money, mobile + mobile) n'a qu'UNE ligne de mouvement
 * ({@code mvttransaction}) : un seul mode (le mode principal de la vente) et le montant total. Le detail juste est dans
 * {@code vente_reglement}, une ligne par mode. Lire le mode du mouvement pour compter l'argent par mode met toute la
 * vente dans le mode principal : 34 ventes especes + mobile comptees entierement en especes a Pontmain (14-18/11).
 * </p>
 *
 * <p>
 * Regle (la meme que le ticket Z depuis le 16/09) : si la vente porte PLUS D'UN reglement, chaque mode recoit la somme
 * de ses lignes de reglement ; sinon tout le montant du mouvement va au mode du mouvement, comme avant. Classe sans
 * base, verifiee par PartsParModeCoherenceTest ; {@link #sqlPart} est la meme regle en SQL.
 * </p>
 */
public final class PartsParMode {

    private PartsParMode() {
    }

    /** Une ligne de reglement de la vente : mode et montant. */
    public static final class Reglement {

        private final String mode;
        private final long montant;

        public Reglement(String mode, long montant) {
            this.mode = mode;
            this.montant = montant;
        }

        public String getMode() {
            return mode;
        }

        public long getMontant() {
            return montant;
        }
    }

    /** Vrai si la vente doit etre lue dans ses reglements (plus d'une ligne). */
    public static boolean detaillee(Collection<Reglement> reglements) {
        return reglements != null && reglements.size() > 1;
    }

    /** Montant par mode, dans l'ordre des reglements (ou le seul mode du mouvement). */
    public static Map<String, Long> parts(String modeMouvement, long montantMouvement,
            Collection<Reglement> reglements) {
        Map<String, Long> parts = new LinkedHashMap<>();
        if (detaillee(reglements)) {
            for (Reglement r : reglements) {
                if (r != null && r.getMode() != null) {
                    parts.merge(r.getMode().trim(), r.getMontant(), Long::sum);
                }
            }
        } else if (modeMouvement != null) {
            parts.put(modeMouvement.trim(), montantMouvement);
        }
        return parts;
    }

    /** Part du mode {@code mode} (0 si la vente n'a rien paye dans ce mode). */
    public static long part(String mode, String modeMouvement, long montantMouvement,
            Collection<Reglement> reglements) {
        Long p = parts(modeMouvement, montantMouvement, reglements).get(mode);
        return p == null ? 0 : p;
    }

    /**
     * La meme regle en SQL, pour une ligne {@code mvttransaction} d'alias {@code alias} : expression de la part du mode
     * {@code mode} (litteral, jamais une saisie) ; {@code colonne} est le montant du mouvement a prendre quand la vente
     * n'a qu'un reglement (montantPaye, montantRegle...).
     */
    public static String sqlPart(String alias, String colonne, String mode) {
        if (!mode.matches("[0-9A-Za-z_]+") || !alias.matches("[A-Za-z_]+") || !colonne.matches("[A-Za-z_]+")) {
            throw new IllegalArgumentException("mode, alias ou colonne invalide");
        }
        return "(CASE WHEN (SELECT COUNT(*) FROM vente_reglement vrc WHERE vrc.vente_id = " + alias + ".pkey) > 1"
                + " THEN (SELECT COALESCE(SUM(vrp.montant), 0) FROM vente_reglement vrp WHERE vrp.vente_id = " + alias
                + ".pkey AND vrp.type_regelement = '" + mode + "')" + " WHEN " + alias + ".typeReglementId = '" + mode
                + "' THEN " + alias + "." + colonne + " ELSE 0 END)";
    }
}
