package rest.service.impl;

import commonTasks.dto.ErpTiersPayantDTO;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.TreeSet;
import java.util.stream.Collectors;

/**
 * Demande 67 (application Prestige Pharmacien, 20/11) : {@code GET v1/ca-credit} pagine, filtre et totalise cote
 * serveur. Les parametres sont facultatifs : sans eux, la liste d'origine est renvoyee telle quelle.
 * <ul>
 * <li>{@code query} : « contient », sans tenir compte de la casse, sur le client, l'ayant droit, le numero de facture
 * et le libelle du tiers payant ;</li>
 * <li>{@code tiersPayant} : libelle (sans tenir compte de la casse) ou identifiant du tiers payant ;</li>
 * <li>avec {@code limit} : une page triee par date decroissante puis numero de facture, et les totaux de toutes les
 * lignes retenues ({@code total}, {@code montant}, {@code clients}), plus les tiers payants de la periode avant filtre
 * ({@code tiersPayants}). {@code limit} a 0 : les totaux seuls.</li>
 * </ul>
 */
public final class PageCaCredit {

    static final Comparator<ErpTiersPayantDTO> ORDRE = Comparator
            .comparing(ErpTiersPayantDTO::getMvtDate, Comparator.nullsLast(Comparator.reverseOrder()))
            .thenComparing(ErpTiersPayantDTO::getNumFacturation, Comparator.nullsLast(Comparator.naturalOrder()));

    private PageCaCredit() {
    }

    private static boolean contient(String valeur, String recherche) {
        return valeur != null && valeur.toLowerCase(Locale.ROOT).contains(recherche);
    }

    /** Lignes retenues par la recherche et le tiers payant, dans l'ordre d'origine. */
    static List<ErpTiersPayantDTO> filtrer(List<ErpTiersPayantDTO> lignes, String query, String tiersPayant) {
        String q = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        String tp = tiersPayant == null ? "" : tiersPayant.trim();
        if (q.isEmpty() && tp.isEmpty()) {
            return lignes;
        }
        return lignes.stream()
                .filter(o -> q.isEmpty() || contient(o.getClientName(), q) || contient(o.getAyantDroitName(), q)
                        || contient(o.getNumFacturation(), q) || contient(o.getTiersPayantLibelle(), q))
                .filter(o -> tp.isEmpty()
                        || (o.getTiersPayantLibelle() != null && tp.equalsIgnoreCase(o.getTiersPayantLibelle().trim()))
                        || tp.equals(o.getTiersPayantId()))
                .collect(Collectors.toList());
    }

    /** Sans {@code limit} : la liste (filtree si une recherche ou un tiers payant est donne). */
    public static List<ErpTiersPayantDTO> liste(List<ErpTiersPayantDTO> lignes, String query, String tiersPayant) {
        return filtrer(lignes, query, tiersPayant);
    }

    /** Avec {@code limit} : une page et les totaux. La liste recue n'est pas modifiee. */
    public static Map<String, Object> page(List<ErpTiersPayantDTO> lignes, Integer start, int limit, String query,
            String tiersPayant) {
        List<ErpTiersPayantDTO> retenues = new ArrayList<>(filtrer(lignes, query, tiersPayant));
        retenues.sort(ORDRE);
        int debut = Math.max(0, start == null ? 0 : start);
        int taille = Math.max(0, limit);
        List<ErpTiersPayantDTO> data = debut >= retenues.size() || taille == 0 ? Collections.emptyList()
                : retenues.subList(debut, Math.min(retenues.size(), debut + taille));
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("total", (long) retenues.size());
        r.put("montant", retenues.stream().mapToLong(ErpTiersPayantDTO::getMontant).sum());
        r.put("clients",
                retenues.stream()
                        .map(o -> o.getClientId() != null ? "id:" + o.getClientId() : "nom:" + o.getClientName())
                        .distinct().count());
        r.put("tiersPayants", new ArrayList<>(lignes.stream().map(ErpTiersPayantDTO::getTiersPayantLibelle)
                .filter(Objects::nonNull).collect(Collectors.toCollection(TreeSet::new))));
        r.put("data", new ArrayList<>(data));
        return r;
    }
}
