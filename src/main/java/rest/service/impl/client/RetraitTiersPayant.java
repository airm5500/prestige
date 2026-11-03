package rest.service.impl.client;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * Regle du retrait d'un tiers-payant d'un client (plan « clients assures et tiers-payants », 02/11).
 *
 * <p>
 * Un client assure n'existe que par son assurance :
 * <ul>
 * <li>retirer son dernier tiers-payant actif desactive le client, dans la meme operation ;</li>
 * <li>retirer son principal alors qu'il lui reste un complementaire : ce complementaire devient le principal (priorite
 * 1), sans devenir regime obligatoire ;</li>
 * <li>retirer un complementaire ne change rien d'autre.</li>
 * </ul>
 * Le principal est le regime obligatoire actif ; a defaut, le lien actif de plus haute priorite (la plus petite). Cette
 * classe ne fait que decider : l'ecriture, en une seule transaction, est dans {@code ClientServiceImpl}.
 */
public final class RetraitTiersPayant {

    public enum Effet {
        /** Le lien n'est pas parmi les liens actifs du client. */
        INTROUVABLE,
        /** Retrait d'un complementaire. */
        SIMPLE,
        /** Retrait du principal : {@link Decision#promu} devient le principal. */
        PROMOTION,
        /** Retrait du dernier lien actif : le client est desactive. */
        DESACTIVATION_CLIENT
    }

    /** Lien actif d'un client vers un organisme. */
    public static final class Lien {
        public final String id;
        public final String nom;
        public final boolean regimeObligatoire;
        public final int priorite;

        public Lien(String id, String nom, boolean regimeObligatoire, Integer priorite) {
            this.id = id;
            this.nom = nom;
            this.regimeObligatoire = regimeObligatoire;
            this.priorite = priorite == null || priorite < 1 ? Integer.MAX_VALUE : priorite;
        }

        /** Lien d'un client vers un organisme, tel qu'enregistre. */
        public static Lien de(dal.TCompteClientTiersPayant l) {
            dal.TTiersPayant organisme = l.getLgTIERSPAYANTID();
            String nom = organisme == null || organisme.getStrFULLNAME() == null ? "" : organisme.getStrFULLNAME();
            return new Lien(l.getLgCOMPTECLIENTTIERSPAYANTID(), nom, Boolean.TRUE.equals(l.getBISRO()),
                    l.getIntPRIORITY());
        }
    }

    public static final class Decision {
        public final Effet effet;
        public final Lien promu;

        Decision(Effet effet, Lien promu) {
            this.effet = effet;
            this.promu = promu;
        }
    }

    private static final Comparator<Lien> PRINCIPAL_D_ABORD = Comparator.comparing((Lien l) -> !l.regimeObligatoire)
            .thenComparingInt(l -> l.priorite).thenComparing(l -> l.id);

    private RetraitTiersPayant() {
    }

    /**
     * @param lienRetire
     *            identifiant du lien a retirer
     * @param actifs
     *            liens actifs du client, celui a retirer compris
     */
    public static Decision decider(String lienRetire, List<Lien> actifs) {
        if (lienRetire == null || actifs.stream().noneMatch(l -> lienRetire.equals(l.id))) {
            return new Decision(Effet.INTROUVABLE, null);
        }
        if (actifs.size() == 1) {
            return new Decision(Effet.DESACTIVATION_CLIENT, null);
        }
        Lien principal = actifs.stream().min(PRINCIPAL_D_ABORD).get();
        if (!principal.id.equals(lienRetire)) {
            return new Decision(Effet.SIMPLE, null);
        }
        Optional<Lien> suivant = actifs.stream().filter(l -> !l.id.equals(lienRetire))
                .min(Comparator.comparingInt((Lien l) -> l.priorite).thenComparing(l -> l.id));
        return new Decision(Effet.PROMOTION, suivant.get());
    }
}
