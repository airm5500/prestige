package util;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;

/**
 * Demande du 28/10 (point 7) : une vente modifiee sans aucun changement ne doit pas etre validee (la validation annule
 * l'origine et cree une nouvelle vente identique). Regles pures, sans acces a la base : on compare l'etat de la vente
 * d'origine et celui que la validation de la copie enregistrerait.
 *
 * Tout ce qui se voit sur la vente compte : lignes (produit, quantite, prix, montant), type de vente, client, ayant
 * droit, medecin, remise, vendeur, modes de reglement (et leurs montants quand il y en a deux), tiers payants (taux et
 * numero de bon). Au moindre doute (valeur inconnue d'un cote), la vente est consideree comme modifiee : on ne bloque
 * jamais une vraie modification.
 */
public final class VenteSansChangement {

    private VenteSansChangement() {
    }

    /** Ce qui compte d'une vente pour dire si elle a change. */
    public static final class Etat {

        public final List<ComparaisonLignesVente.Ligne> lignes = new ArrayList<>();
        public String typeVente;
        public String client;
        public String ayantDroit;
        public String medecin;
        public String remise;
        public String vendeur;
        /** mode de reglement -> montant */
        public final Map<String, Integer> reglements = new TreeMap<>();
        /** compte tiers payant du client -> « taux|numero de bon » */
        public final Map<String, String> tiersPayants = new TreeMap<>();
        /**
         * Vente reglee en differe. Un differe n'enregistre pas de reglement « Différé » : seulement la part payee a la
         * vente, en especes (0 compris). C'est donc ce drapeau, et non les modes, qui distingue differe et comptant.
         */
        public boolean differe;
        /** differe : montant paye au moment de la vente */
        public Integer payeVente;

        public Etat reglement(String mode, Integer montant) {
            String m = normaliser(mode);
            if (m != null) {
                reglements.merge(m, montant == null ? 0 : montant, Integer::sum);
            }
            return this;
        }

        public Etat tiersPayant(String compte, Integer taux, String numeroBon) {
            tiersPayants.put(Objects.toString(normaliser(compte), "?"),
                    (taux == null ? "?" : String.valueOf(taux)) + "|" + Objects.toString(normaliser(numeroBon), ""));
            return this;
        }
    }

    /** Vrai seulement si rien n'a change entre la vente d'origine et la copie a valider. */
    public static boolean identiques(Etat origine, Etat copie) {
        if (origine == null || copie == null) {
            return false;
        }
        if (origine.lignes.isEmpty() || !ComparaisonLignesVente.comparer(origine.lignes, copie.lignes).isEmpty()) {
            return false;
        }
        if (!memes(origine.typeVente, copie.typeVente) || !memes(origine.client, copie.client)
                || !memes(origine.ayantDroit, copie.ayantDroit) || !memes(origine.medecin, copie.medecin)
                || !memes(origine.remise, copie.remise) || !memes(origine.vendeur, copie.vendeur)) {
            return false;
        }
        if (origine.differe != copie.differe) {
            return false;
        }
        if (origine.differe) {
            // differe des deux cotes : seule compte la part payee a la vente
            if (origine.payeVente == null || !origine.payeVente.equals(copie.payeVente)) {
                return false;
            }
        } else {
            if (!origine.reglements.keySet().equals(copie.reglements.keySet())) {
                return false;
            }
            // un seul mode : son montant est celui de la vente, deja compare par les lignes ; deux modes : la
            // repartition
            if (origine.reglements.size() > 1 && !origine.reglements.equals(copie.reglements)) {
                return false;
            }
        }
        return origine.tiersPayants.equals(copie.tiersPayants);
    }

    private static boolean memes(String a, String b) {
        return Objects.equals(normaliser(a), normaliser(b));
    }

    static String normaliser(String s) {
        if (s == null) {
            return null;
        }
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }
}
