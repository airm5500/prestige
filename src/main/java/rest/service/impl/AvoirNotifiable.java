package rest.service.impl;

/**
 * Demande du 28/10 (point 22) : a l'entree en stock, un client n'est prevenu (SMS / WhatsApp) que ses produits en avoir
 * sont disponibles que si le produit est vraiment arrive. Regle pure, sans base.
 */
final class AvoirNotifiable {

    private AvoirNotifiable() {
    }

    /**
     * @param quantiteEntree
     *            quantite du produit reellement entree en stock par ce bon
     * @param stockApres
     *            stock du produit apres l'entree
     * @param factureNonLivre
     *            produit retourne au fournisseur au motif « facturé non livré » sur ce bon
     */
    static boolean produitDisponible(int quantiteEntree, int stockApres, boolean factureNonLivre) {
        return quantiteEntree > 0 && stockApres > 0 && !factureNonLivre;
    }
}
