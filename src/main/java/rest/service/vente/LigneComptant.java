package rest.service.vente;

import dal.TParameters;
import dal.TPreenregistrement;
import dal.TPreenregistrementDetail;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import javax.persistence.EntityManager;
import util.Constant;

/**
 * Cas 1 du 03/11/2026 : ligne « au comptant » dans une vente assurance (une saisie, deux ventes, deux tickets).
 *
 * <p>
 * Regles pures, sans acces a la base en dehors de {@link #actif(EntityManager)} : ce sont elles que les tests unitaires
 * verifient. Tout passe par le parametre {@code KEY_LIGNE_COMPTANT_VO} : a 0, aucune ligne n'est jamais consideree
 * comme comptant et aucun nouveau chemin n'est emprunte.
 */
public final class LigneComptant {

    public static final String PARAMETRE = "KEY_LIGNE_COMPTANT_VO";
    public static final String MSG_INACTIF = "Les lignes au comptant d'une vente assurance ne sont pas activées (paramètre "
            + PARAMETRE + ").";
    public static final String MSG_TYPE = "Une ligne au comptant ne se coche que dans une vente assurance.";
    public static final String MSG_PROMOTION = "Cette ligne est en promotion : une ligne au comptant d'une vente assurance "
            + "ne porte pas de promotion.";

    private LigneComptant() {
    }

    /** Le parametre vaut-il 1 ? Toute erreur de lecture vaut 0 : le chemin d'aujourd'hui s'applique. */
    public static boolean actif(EntityManager em) {
        try {
            TParameters p = em.find(TParameters.class, PARAMETRE);
            return p != null && valeurActive(p.getStrVALUE());
        } catch (RuntimeException e) {
            return false;
        }
    }

    static boolean valeurActive(String valeur) {
        return valeur != null && "1".equals(valeur.trim());
    }

    /** Vente assurance (type 2), la seule ou la colonne existe (Q1.7 : pas en carnet). */
    public static boolean estVenteAssurance(TPreenregistrement tp) {
        return tp != null && tp.getLgTYPEVENTEID() != null
                && Constant.VENTE_ASSURANCE_ID.equals(tp.getLgTYPEVENTEID().getLgTYPEVENTEID());
    }

    /**
     * Motif de refus du cochage d'une ligne, ou null si elle peut etre cochee / decochee.
     *
     * @param motifEtat
     *            motif rendu par le controle « vente modifiable » (null si la vente est modifiable)
     */
    public static String refusCochage(boolean actif, TPreenregistrement tp, TPreenregistrementDetail d, boolean cocher,
            String motifEtat) {
        if (!actif) {
            return MSG_INACTIF;
        }
        if (motifEtat != null) {
            return motifEtat;
        }
        if (!estVenteAssurance(tp)) {
            return MSG_TYPE;
        }
        if (cocher && d != null && d.getPromotionProduitId() != null) {
            return MSG_PROMOTION;
        }
        return null;
    }

    public static boolean aDesLignesComptant(Collection<TPreenregistrementDetail> lignes) {
        return lignes != null && lignes.stream().anyMatch(TPreenregistrementDetail::isComptant);
    }

    /** Lignes cochees, dans l'ordre recu. */
    public static List<TPreenregistrementDetail> lignesComptant(Collection<TPreenregistrementDetail> lignes) {
        List<TPreenregistrementDetail> res = new ArrayList<>();
        if (lignes != null) {
            lignes.stream().filter(TPreenregistrementDetail::isComptant).forEach(res::add);
        }
        return res;
    }

    /** Lignes qui restent a l'assurance (non cochees), dans l'ordre recu. */
    public static List<TPreenregistrementDetail> lignesAssurance(Collection<TPreenregistrementDetail> lignes) {
        List<TPreenregistrementDetail> res = new ArrayList<>();
        if (lignes != null) {
            lignes.stream().filter(d -> !d.isComptant()).forEach(res::add);
        }
        return res;
    }

    /**
     * Lignes a donner au moteur tiers-payant : toutes si le parametre est a 0, si la vente n'est pas une assurance ou
     * si aucune ligne n'est cochee (resultat identique a aujourd'hui) ; sinon les lignes non cochees.
     */
    public static List<TPreenregistrementDetail> lignesPourLeCalcul(boolean actif, TPreenregistrement tp,
            List<TPreenregistrementDetail> lignes) {
        if (!actif || !estVenteAssurance(tp) || !aDesLignesComptant(lignes)) {
            return lignes;
        }
        return lignesAssurance(lignes);
    }

    public static int montantTotal(Collection<TPreenregistrementDetail> lignes) {
        return lignes == null ? 0 : lignes.stream().mapToInt(d -> valeur(d.getIntPRICE())).sum();
    }

    public static int montantRemise(Collection<TPreenregistrementDetail> lignes) {
        return lignes == null ? 0 : lignes.stream().mapToInt(d -> valeur(d.getIntPRICEREMISE())).sum();
    }

    public static int montantTva(Collection<TPreenregistrementDetail> lignes) {
        return lignes == null ? 0 : lignes.stream().mapToInt(d -> valeur(d.getMontantTva())).sum();
    }

    /** Montant pris dans le chiffre d'affaires (lignes bool_ACCOUNT). */
    public static int montantAccount(Collection<TPreenregistrementDetail> lignes) {
        return lignes == null ? 0 : lignes.stream().filter(d -> !Boolean.FALSE.equals(d.getBoolACCOUNT()))
                .mapToInt(d -> valeur(d.getIntPRICE())).sum();
    }

    /** Net des lignes cochees : prix - remise produit (Q1.1 : la remise s'applique aussi au comptant). */
    public static int montantComptant(Collection<TPreenregistrementDetail> lignes) {
        List<TPreenregistrementDetail> c = lignesComptant(lignes);
        return Math.max(0, montantTotal(c) - montantRemise(c));
    }

    /** Arrondi au multiple de 5 superieur ou egal, comme le net de la caisse (0 reste 0). */
    public static int arrondi5(int v) {
        if (v <= 0) {
            return 0;
        }
        int r = v % 5;
        return r == 0 ? v : v + (5 - r);
    }

    /**
     * Q1.3 : le reglement recu est impute d'abord sur la vente comptant, puis sur la part client de la vente assurance.
     * Rend {paye sur le comptant, paye sur l'assurance}. Ce qui depasse les deux parts reste sur l'assurance (c'est la
     * monnaie, que la cloture assurance calcule deja).
     */
    public static int[] imputation(int montantPaye, int netComptant, int partClient) {
        int paye = Math.max(0, montantPaye);
        int comptant = Math.max(0, netComptant);
        int surComptant = Math.min(paye, comptant);
        int surAssurance = paye - surComptant;
        return new int[] { surComptant, surAssurance };
    }

    private static int valeur(Integer v) {
        return v == null ? 0 : v;
    }
}
