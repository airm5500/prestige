package commonTasks.dto;

/**
 * Ligne du "Suivi mouvement article complet" : aux quantites du suivi general (heritees de MvtProduitDTO) s'ajoutent
 * les mouvements internes rayon/reserve et les stocks rayon, reserve et total. Le DTO historique reste inchange afin de
 * ne pas modifier le contrat du "Suivi mouvement article 2".
 *
 * <p>
 * Un transfert rayon&lt;-&gt;reserve ne change pas le stock physique total : il n'est donc jamais compte dans les
 * entrees ni les sorties classiques. Seul l'ajustement de reserve (delta signe) modifie le stock total.
 */
public class MvtProduitCompletDTO extends MvtProduitDTO {

    private static final long serialVersionUID = 1L;

    /** Somme des ASSORT (rayon vers reserve) de la periode. */
    private int qtyVersReserve = 0;
    /** Somme des REASSORT (reserve vers rayon) de la periode. */
    private int qtyVersRayon = 0;
    /** Somme SIGNEE des AJUSTEMENT de reserve de la periode (stock reserve apres - avant). */
    private int qtyAjustReserve = 0;
    /** Stock reserve actuel de l'emplacement. */
    private int currentStockReserve = 0;
    /** Stock rayon (currentStock herite) + stock reserve. */
    private int currentStockTotal = 0;

    public MvtProduitCompletDTO() {
    }

    /** Copie d'une ligne du suivi general (jour ou totaux), a completer ensuite avec les mouvements internes. */
    public MvtProduitCompletDTO(MvtProduitDTO source) {
        setProduitId(source.getProduitId());
        setCip(source.getCip());
        setProduitName(source.getProduitName());
        if (source.getDateOperation() != null) {
            setDateOperation(source.getDateOperation());
        }
        setStockInit(source.getStockInit());
        setStockFinal(source.getStockFinal());
        setCurrentStock(source.getCurrentStock());
        setQtyVente(source.getQtyVente());
        setQtyAnnulation(source.getQtyAnnulation());
        setQtyRetour(source.getQtyRetour());
        setQtyRetourDepot(source.getQtyRetourDepot());
        setQtyInv(source.getQtyInv());
        setQtyPerime(source.getQtyPerime());
        setQtyAjust(source.getQtyAjust());
        setQtyAjustSortie(source.getQtyAjustSortie());
        setQtyDeconEntrant(source.getQtyDeconEntrant());
        setQtyDecondSortant(source.getQtyDecondSortant());
        setQtyEntree(source.getQtyEntree());
        setEcartInventaire(source.getEcartInventaire());
    }

    public int getQtyVersReserve() {
        return qtyVersReserve;
    }

    public void setQtyVersReserve(int qtyVersReserve) {
        this.qtyVersReserve = qtyVersReserve;
    }

    public int getQtyVersRayon() {
        return qtyVersRayon;
    }

    public void setQtyVersRayon(int qtyVersRayon) {
        this.qtyVersRayon = qtyVersRayon;
    }

    public int getQtyAjustReserve() {
        return qtyAjustReserve;
    }

    public void setQtyAjustReserve(int qtyAjustReserve) {
        this.qtyAjustReserve = qtyAjustReserve;
    }

    public int getCurrentStockReserve() {
        return currentStockReserve;
    }

    public void setCurrentStockReserve(int currentStockReserve) {
        this.currentStockReserve = currentStockReserve;
    }

    public int getCurrentStockTotal() {
        return currentStockTotal;
    }

    public void setCurrentStockTotal(int currentStockTotal) {
        this.currentStockTotal = currentStockTotal;
    }
}
