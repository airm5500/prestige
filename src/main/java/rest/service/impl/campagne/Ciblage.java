package rest.service.impl.campagne;

import java.time.LocalDate;
import java.util.Collection;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/**
 * Plan avoir du 08/11, points 4 et 5 : ciblage par les achats (« clients ayant acheté »), commun aux listes de
 * diffusion, aux campagnes et aux rappels des traitements. Regles pures, sans base (testees a part) :
 * <ul>
 * <li>un achat = une vente cloturee du client sur la periode ; plusieurs lignes d'une meme vente (le produit, la
 * famille ou la DCI vises) comptent pour un seul achat, leurs montants s'additionnent ;</li>
 * <li>un client est retenu s'il a au moins {@code minAchats} achats et, si un montant est demande, au moins ce montant
 * cumule sur la periode ;</li>
 * <li>pour chaque client retenu : nombre d'achats, montant cumule, dernier achat.</li>
 * </ul>
 */
public final class Ciblage {

    /** Une ligne lue en base : client, vente, jour, montant de la vente (ou des lignes visees de la vente). */
    public static final class Achat {
        public final String clientId, venteId;
        public final LocalDate jour;
        public final long montant;

        public Achat(String clientId, String venteId, LocalDate jour, long montant) {
            this.clientId = clientId;
            this.venteId = venteId;
            this.jour = jour;
            this.montant = montant;
        }
    }

    /** Resume des achats d'un client retenu. */
    public static final class Resume {
        public int achats;
        public long montant;
        public LocalDate dernier;
    }

    private Ciblage() {
    }

    /**
     * Clients retenus, dans l'ordre de premiere apparition.
     *
     * @param minAchats
     *            nombre minimal d'achats (1 si null ou inferieur)
     * @param montantMin
     *            montant cumule minimal (null : pas de condition)
     */
    public static Map<String, Resume> retenir(Collection<Achat> achats, Integer minAchats, Long montantMin) {
        int min = minAchats == null || minAchats < 1 ? 1 : minAchats;
        Map<String, Resume> parClient = new LinkedHashMap<>();
        Map<String, Set<String>> ventes = new LinkedHashMap<>();
        for (Achat a : achats) {
            if (a == null || a.clientId == null || a.venteId == null) {
                continue;
            }
            Resume r = parClient.computeIfAbsent(a.clientId, k -> new Resume());
            if (ventes.computeIfAbsent(a.clientId, k -> new HashSet<>()).add(a.venteId)) {
                r.achats++;
            }
            r.montant += Math.max(0, a.montant);
            if (a.jour != null && (r.dernier == null || a.jour.isAfter(r.dernier))) {
                r.dernier = a.jour;
            }
        }
        parClient.values().removeIf(r -> r.achats < min || (montantMin != null && r.montant < montantMin));
        return parClient;
    }
}
