package rest.service.ticket;

import java.util.ArrayList;
import java.util.List;

/**
 * Plan du 06/11, point 6 : le reglement imprime d'une vente differee.
 *
 * <p>
 * Le differe est range avec les especes dans les mouvements de caisse : le ticket imprimait « Espèces versées : 0 » et
 * « Monnaie rendue : 0 » (ou « Espèces : 0 » dans le detail des reglements), comme si le client avait paye en especes.
 * Pour une vente differee, les lignes de reglement du recapitulatif (« Règlement », « Montant Versé », « Monnaie »,
 * detail par mode) sont remplacees par « Règlement : Différé », suivi de « Espèces versées » seulement si un acompte a
 * ete encaisse. La remise, la vente a terme et le net a payer ne changent pas.
 * </p>
 *
 * <p>
 * Seul l'affichage change : les mouvements de caisse, les recettes et les dettes ne sont pas touches.
 * </p>
 */
public final class ReglementTicket {

    public static final String DIFFERE = "Différé";
    public static final String ESPECES_VERSEES = "Espèces versées";

    private ReglementTicket() {
    }

    /**
     * Lignes « libelle;valeur;unite;gras » du recapitulatif, telles qu'imprimees pour une vente differee.
     *
     * @param lignes
     *            recapitulatif construit pour une vente payee (non modifie)
     * @param especes
     *            acompte encaisse en especes (0 : rien n'a ete paye)
     */
    public static List<String> differe(List<String> lignes, int especes) {
        List<String> r = new ArrayList<>();
        for (String l : lignes) {
            String libelle = l.split(";", -1)[0].replace(":", "").trim();
            if (libelle.equals("*") || libelle.startsWith("Vente à terme") || libelle.startsWith("Net à payer")) {
                r.add(l);
            }
        }
        r.add("Règlement: ;     " + DIFFERE + "; ;0");
        if (especes > 0) {
            r.add(ESPECES_VERSEES + ": ;     " + ConversionTicket.nombre(especes) + "; F CFA;0");
        }
        return r;
    }
}
