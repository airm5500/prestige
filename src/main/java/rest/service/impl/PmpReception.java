package rest.service.impl;

/**
 * Prix moyen pondere apres une reception (audit 06, EN-06 ; regle validee le 02/11).
 * <ul>
 * <li>l'ancien stock est valorise a l'ancien PMP (avant : au dernier prix d'achat de la fiche) ;</li>
 * <li>les UG entrent a cout nul : elles augmentent la quantite, pas la valeur ;</li>
 * <li>stock avant reception nul ou negatif : le PMP est le cout unitaire de la reception (avant : PMP negatif
 * possible).</li>
 * </ul>
 */
public final class PmpReception {

    private PmpReception() {
    }

    /**
     * @param stockAvant
     *            stock avant la reception
     * @param ancienPmp
     *            PMP avant la reception ; s'il est absent ou nul, le prix d'achat de la fiche
     * @param quantite
     *            quantite entree, UG comprises
     * @param ug
     *            dont unites gratuites
     * @param prixAchat
     *            prix d'achat unitaire de la reception
     *
     * @return le nouveau PMP, arrondi a l'unite ; null si rien n'entre (le PMP ne change pas)
     */
    public static Double calculer(int stockAvant, double ancienPmp, int quantite, int ug, int prixAchat) {
        if (quantite <= 0) {
            return null;
        }
        long payes = Math.max(0, quantite - Math.max(0, ug));
        double valeurEntree = (double) payes * prixAchat;
        if (stockAvant <= 0) {
            return (double) Math.round(valeurEntree / quantite);
        }
        return (double) Math.round((stockAvant * ancienPmp + valeurEntree) / (stockAvant + quantite));
    }
}
