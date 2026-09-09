package rest.service.impl;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import commonTasks.dto.FeuilleDeMatchSimpleLigneDTO;

/**
 * Le classement de la feuille de match simple (retour du 09/09).
 *
 * <p>
 * Les produits sont tries par quantite achetee decroissante. Les ex aequo partagent un rang ecrit comme une plage, «
 * 17-21 » : cinq produits achetes en meme quantite occupent les rangs 17 a 21 et portent tous cette mention, comme dans
 * le modele fourni. Le rang suivant reprend apres la plage.
 * </p>
 */
public final class FeuilleDeMatchSimple {

    private FeuilleDeMatchSimple() {
    }

    /** Trie et numerote ; la liste rendue est une nouvelle liste, les objets sont ceux recus (rang pose). */
    public static List<FeuilleDeMatchSimpleLigneDTO> classer(List<FeuilleDeMatchSimpleLigneDTO> lignes) {
        List<FeuilleDeMatchSimpleLigneDTO> classees = new ArrayList<>(
                lignes == null ? new ArrayList<FeuilleDeMatchSimpleLigneDTO>() : lignes);
        classees.sort(Comparator.comparingLong(FeuilleDeMatchSimpleLigneDTO::getQuantite).reversed()
                .thenComparing(Comparator.comparingLong(FeuilleDeMatchSimpleLigneDTO::getFrequence).reversed())
                .thenComparing(l -> l.getProduit() == null ? "" : l.getProduit()));
        int i = 0;
        while (i < classees.size()) {
            int j = i;
            while (j + 1 < classees.size() && classees.get(j + 1).getQuantite() == classees.get(i).getQuantite()) {
                j++;
            }
            String rang = i == j ? String.valueOf(i + 1) : (i + 1) + "-" + (j + 1);
            for (int k = i; k <= j; k++) {
                classees.get(k).setRang(rang);
            }
            i = j + 1;
        }
        return classees;
    }
}
