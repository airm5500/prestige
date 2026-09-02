package util;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Comparaison produit par produit des lignes d'une vente avant et apres modification (point 6, mouchard des ventes
 * modifiees). Regles pures, sans acces a la base.
 */
public final class ComparaisonLignesVente {

    private ComparaisonLignesVente() {
    }

    /** Une ligne de vente reduite a ce qui compte pour la comparaison. */
    public static final class Ligne {

        public final String produitId;
        public final String cip;
        public final String libelle;
        public final int quantite;
        public final int prixUnitaire;
        public final int montant;

        public Ligne(String produitId, String cip, String libelle, int quantite, int prixUnitaire, int montant) {
            this.produitId = produitId;
            this.cip = cip;
            this.libelle = libelle;
            this.quantite = quantite;
            this.prixUnitaire = prixUnitaire;
            this.montant = montant;
        }
    }

    /** Resultat pour un produit dont quelque chose a change. */
    public static final class Ecart {

        public static final String AJOUT = "AJOUT";
        public static final String RETRAIT = "RETRAIT";
        public static final String QUANTITE = "QUANTITE";
        public static final String PRIX = "PRIX";

        public final String produitId;
        public final String cip;
        public final String libelle;
        public final String action;
        public final int qteAvant;
        public final int qteApres;
        public final int puAvant;
        public final int puApres;
        public final int montantAvant;
        public final int montantApres;

        Ecart(String produitId, String cip, String libelle, String action, int qteAvant, int qteApres, int puAvant,
                int puApres, int montantAvant, int montantApres) {
            this.produitId = produitId;
            this.cip = cip;
            this.libelle = libelle;
            this.action = action;
            this.qteAvant = qteAvant;
            this.qteApres = qteApres;
            this.puAvant = puAvant;
            this.puApres = puApres;
            this.montantAvant = montantAvant;
            this.montantApres = montantApres;
        }
    }

    /**
     * Compare les lignes avant et apres. Un meme produit present plusieurs fois est cumule. Les produits inchanges
     * (meme quantite, meme prix unitaire, meme montant) ne sont pas retournes.
     */
    public static List<Ecart> comparer(List<Ligne> avant, List<Ligne> apres) {
        Map<String, Ligne> mapAvant = cumuler(avant);
        Map<String, Ligne> mapApres = cumuler(apres);
        List<Ecart> ecarts = new ArrayList<>();
        for (Map.Entry<String, Ligne> e : mapAvant.entrySet()) {
            Ligne a = e.getValue();
            Ligne b = mapApres.get(e.getKey());
            if (b == null) {
                ecarts.add(new Ecart(a.produitId, a.cip, a.libelle, Ecart.RETRAIT, a.quantite, 0, a.prixUnitaire, 0,
                        a.montant, 0));
            } else if (a.quantite != b.quantite) {
                ecarts.add(new Ecart(a.produitId, a.cip, a.libelle, Ecart.QUANTITE, a.quantite, b.quantite,
                        a.prixUnitaire, b.prixUnitaire, a.montant, b.montant));
            } else if (a.prixUnitaire != b.prixUnitaire || a.montant != b.montant) {
                ecarts.add(new Ecart(a.produitId, a.cip, a.libelle, Ecart.PRIX, a.quantite, b.quantite, a.prixUnitaire,
                        b.prixUnitaire, a.montant, b.montant));
            }
        }
        for (Map.Entry<String, Ligne> e : mapApres.entrySet()) {
            if (!mapAvant.containsKey(e.getKey())) {
                Ligne b = e.getValue();
                ecarts.add(new Ecart(b.produitId, b.cip, b.libelle, Ecart.AJOUT, 0, b.quantite, 0, b.prixUnitaire, 0,
                        b.montant));
            }
        }
        return ecarts;
    }

    private static Map<String, Ligne> cumuler(List<Ligne> lignes) {
        Map<String, Ligne> map = new LinkedHashMap<>();
        if (lignes == null) {
            return map;
        }
        for (Ligne l : lignes) {
            if (l == null) {
                continue;
            }
            String cle = Objects.toString(l.produitId, "");
            Ligne existante = map.get(cle);
            if (existante == null) {
                map.put(cle, l);
            } else {
                map.put(cle, new Ligne(existante.produitId, existante.cip, existante.libelle,
                        existante.quantite + l.quantite, existante.prixUnitaire, existante.montant + l.montant));
            }
        }
        return map;
    }
}
