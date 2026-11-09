package rest.service.correspondance;

import java.util.List;
import java.util.Objects;

/**
 * Lot 4 : historique des prix d'un produit chez un grossiste (table prix_grossiste). Logique pure, sans requete.
 * <ul>
 * <li>une ligne n'est ecrite que si un prix lu differe du dernier prix connu de meme nature, pour ce produit chez ce
 * grossiste ;</li>
 * <li>un prix nul, negatif ou absent n'est pas un prix (ligne d'unites gratuites, colonne vide) : il n'est ni ecrit ni
 * compare ;</li>
 * <li>HT, TTC et INCONNUE ne sont jamais compares entre eux : la nature est celle lue, jamais deduite.</li>
 * </ul>
 */
public final class PrixGrossisteRegles {

    public enum Nature {
        HT, TTC, INCONNUE
    }

    /** Une lecture de prix, ou une ligne de l'historique. Un prix absent est null. */
    public static final class Lecture {
        public final Integer achat;
        public final Nature natureAchat;
        public final Integer pub;
        public final Nature naturePublic;

        public Lecture(Number achat, Nature natureAchat, Number pub, Nature naturePublic) {
            this.achat = prix(achat);
            this.natureAchat = natureAchat == null ? Nature.INCONNUE : natureAchat;
            this.pub = prix(pub);
            this.naturePublic = naturePublic == null ? Nature.INCONNUE : naturePublic;
        }

        public boolean vide() {
            return achat == null && pub == null;
        }
    }

    private PrixGrossisteRegles() {
    }

    /** Prix lu : null s'il est absent, nul, negatif ou hors des entiers. */
    public static Integer prix(Number lu) {
        return lu == null || lu.longValue() <= 0 || lu.longValue() > Integer.MAX_VALUE ? null : lu.intValue();
    }

    /** Dernier prix d'achat de cette nature dans l'historique (du plus ancien au plus recent), ou null. */
    public static Integer dernierAchat(List<Lecture> historique, Nature nature) {
        for (int i = historique.size() - 1; i >= 0; i--) {
            Lecture l = historique.get(i);
            if (l.achat != null && l.natureAchat == nature) {
                return l.achat;
            }
        }
        return null;
    }

    /** Dernier prix public de cette nature dans l'historique, ou null. */
    public static Integer dernierPublic(List<Lecture> historique, Nature nature) {
        for (int i = historique.size() - 1; i >= 0; i--) {
            Lecture l = historique.get(i);
            if (l.pub != null && l.naturePublic == nature) {
                return l.pub;
            }
        }
        return null;
    }

    /**
     * Faut-il ecrire la lecture ? {@code dernierAchat} et {@code dernierPublic} sont les derniers prix connus de la
     * nature de la lecture (null : aucun).
     */
    public static boolean aEcrire(Integer dernierAchat, Integer dernierPublic, Lecture l) {
        return (l.achat != null && !Objects.equals(l.achat, dernierAchat))
                || (l.pub != null && !Objects.equals(l.pub, dernierPublic));
    }

    /** Meme regle, l'historique etant donne en entier. */
    public static boolean aEcrire(List<Lecture> historique, Lecture l) {
        return aEcrire(dernierAchat(historique, l.natureAchat), dernierPublic(historique, l.naturePublic), l);
    }

    /** Ecart entre le prix public du grossiste et le prix de vente Prestige ; alerte au-dela du seuil. */
    public static final class Ecart {
        /** prix public du grossiste - prix Prestige (positif : le grossiste annonce plus cher). */
        public final int valeur;
        public final boolean alerte;

        Ecart(int valeur, boolean alerte) {
            this.valeur = valeur;
            this.alerte = alerte;
        }
    }

    /**
     * Comparaison en TTC seulement (le prix de vente Prestige est TTC) : un prix public d'une autre nature, absent, ou
     * un prix Prestige absent ou nul ne sont pas compares (null). Alerte si |ecart| depasse le seuil (un seuil negatif
     * vaut 0 : tout ecart).
     */
    public static Ecart ecartPublic(Integer prixPublic, Nature nature, Number prixPrestige, int seuil) {
        Integer prestige = prix(prixPrestige);
        Integer pub = prix(prixPublic);
        if (pub == null || prestige == null || nature != Nature.TTC) {
            return null;
        }
        long e = (long) pub - prestige;
        return new Ecart((int) e, Math.abs(e) > Math.max(0, seuil));
    }

    /** Seuil lu dans les parametres : entier positif ou nul, 0 si absent ou illisible. */
    public static int seuil(String lu) {
        try {
            return Math.max(0, Integer.parseInt(lu == null ? "" : lu.trim()));
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}
