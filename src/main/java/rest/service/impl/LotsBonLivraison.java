package rest.service.impl;

import dal.TLot;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;
import util.Constant;

/**
 * Lots d'une ligne de BL, retrouves par produit et numero de BL, et quantite que la cloture entre en stock.
 */
public final class LotsBonLivraison {

    private LotsBonLivraison() {
    }

    /**
     * Statut des lots d'un BL annule par un retour complet : ils ne comptent plus pour la reception d'un BL ressaisi
     * sous le meme numero (analyse du 30/10, docs/notices/ANALYSE_ANNULATION_BL.md).
     */
    public static final String HORS_SERVICE = Constant.STATUT_DELETE;

    /** Lots qui comptent pour la reception : tous, sauf ceux d'un BL annule. */
    public static List<TLot> actifs(List<TLot> lots) {
        return lots.stream().filter(l -> !HORS_SERVICE.equals(l.getStrSTATUT())).collect(Collectors.toList());
    }

    /** Quantite recue saisie dans les lots qui comptent (unites gratuites comprises). */
    public static int saisi(List<TLot> lots) {
        return actifs(lots).stream().mapToInt(l -> Objects.requireNonNullElse(l.getIntNUMBER(), 0)).sum();
    }

    /**
     * Quantite entree en stock par la cloture pour une ligne commandee {@code cmde} avec {@code ug} unites gratuites :
     * sans lot, la quantite commandee ; avec des lots, leur total borne a commande + UG ; null si les lots n'atteignent
     * pas la quantite commandee (ligne non saisie : la cloture est refusee).
     */
    public static Integer quantiteEntree(List<TLot> lots, int cmde, int ug) {
        if (actifs(lots).isEmpty()) {
            return cmde;
        }
        int total = saisi(lots);
        if (total < cmde) {
            return null;
        }
        return Math.min(total, cmde + ug);
    }
}
