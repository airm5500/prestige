package fileupload;

/**
 * Plan du 19/11, point 2 : cumul des lignes d'un fichier de grossiste qui portent le meme produit.
 * <p>
 * Une ligne du fichier apporte des boites payees ({@code quantite}) et/ou des unites gratuites ({@code ug}). Modele
 * DPCI : une ligne dont le prix d'achat ET le prix de vente valent 0 est une ligne d'UG (cas LITACOLD lignes 10, 19 et
 * 53 : 40 + 60 payes, 15 UG).
 * <p>
 * Regles (verifiees par {@code CumulLigneImportCoherenceTest}) :
 * <ul>
 * <li>quantite = somme des boites payees ; ug = somme des unites gratuites ;</li>
 * <li>montant = somme, ligne par ligne, de quantite payee x prix d'achat de la ligne : une ligne d'UG n'ajoute rien et
 * ne remet jamais le montant a 0 (defaut NEULORA lignes 22 et 39 : montant tombe a 0) ;</li>
 * <li>prix d'achat et prix de vente : ceux de la premiere ligne payee ; tant qu'aucune ligne payee n'est lue, ceux de
 * la fiche (jamais 0 sur une fiche qui a un prix : une ligne d'UG seule ne met pas le PAF du produit a 0).</li>
 * </ul>
 */
public final class CumulLigneImport {

    private final int quantite;
    private final int ug;
    private final int prixAchat;
    private final int prixVente;
    private final int montant;

    private CumulLigneImport(int quantite, int ug, int prixAchat, int prixVente, int montant) {
        this.quantite = quantite;
        this.ug = ug;
        this.prixAchat = prixAchat;
        this.prixVente = prixVente;
        this.montant = montant;
    }

    /** Modele DPCI : prix d'achat et prix de vente a 0 = ligne d'unites gratuites. */
    public static boolean estLigneUgDpci(double prixAchat, double prixVente) {
        return prixAchat == 0d && prixVente == 0d;
    }

    /**
     * Premiere ligne lue pour un produit.
     *
     * @param prixVente
     *            prix de vente du fichier, 0 si absent (on prend alors {@code prixVenteFiche}, comme avant)
     */
    public static CumulLigneImport premiere(int quantite, int ug, int prixAchat, int prixVente, int prixAchatFiche,
            int prixVenteFiche) {
        int q = Math.max(quantite, 0);
        int pa = q > 0 || prixAchat > 0 ? prixAchat : prixAchatFiche;
        int pv = prixVente == 0 ? prixVenteFiche : prixVente;
        return new CumulLigneImport(q, Math.max(ug, 0), pa, pv, q * prixAchat);
    }

    /** Ligne suivante du meme produit. Ligne d'UG seule ({@code quantite == 0}) : seules les UG changent. */
    public CumulLigneImport ajouter(int quantiteLigne, int ugLigne, int prixAchatLigne, int prixVenteLigne) {
        int q = Math.max(quantiteLigne, 0);
        int u = Math.max(ugLigne, 0);
        if (q == 0) {
            return new CumulLigneImport(quantite, ug + u, prixAchat, prixVente, montant);
        }
        boolean premierePayee = quantite == 0;
        int pa = premierePayee ? prixAchatLigne : prixAchat;
        int pv = premierePayee && prixVenteLigne > 0 ? prixVenteLigne : prixVente;
        return new CumulLigneImport(quantite + q, ug + u, pa, pv, montant + q * prixAchatLigne);
    }

    /** Etat d'une ligne de commande deja enregistree. */
    public static CumulLigneImport existant(int quantite, int ug, int prixAchat, int prixVente, int montant) {
        return new CumulLigneImport(quantite, ug, prixAchat, prixVente, montant);
    }

    public int getQuantite() {
        return quantite;
    }

    public int getUg() {
        return ug;
    }

    public int getPrixAchat() {
        return prixAchat;
    }

    public int getPrixVente() {
        return prixVente;
    }

    public int getMontant() {
        return montant;
    }
}
