package rest.service.ticket;

import java.util.ArrayList;
import java.util.List;

/**
 * Monnaie des tickets d'une vente assurance avec vente comptant liee (ticket 1630805530, analyse du 08/11 validee).
 *
 * <p>
 * Le client tend une seule somme pour les deux ventes (part client + comptant). Le ticket assurance de la premiere
 * impression calculait sa monnaie avec le montant tendu a l'ecran (2 000 - 370 = 1 630), le ticket client combine avec
 * l'operation entiere (2 000 - 1 580 = 420) : 2 050 F rendus sur le papier. A la reimpression, le verse reparti en base
 * (790 et 1 210) sortait sur chaque ticket.
 * </p>
 *
 * <p>
 * Regle unique : le verse et la monnaie ne figurent que sur le ticket client combine. Le recapitulatif propre a chaque
 * vente garde la remise, la vente a terme, le net a payer et les modes de reglement ; « Montant Versé » et « Monnaie »
 * en sont retires, « Réglé » (= net a payer) est ajoute sauf pour un differe ou un net nul, puis « Vente liée » avec la
 * reference de l'autre vente. Seul l'affichage change : mouvements de caisse, recettes et reglements ne sont pas
 * touches.
 * </p>
 */
public final class MonnaieVenteLiee {

    public static final String REGLE = "Réglé";
    public static final String VENTE_LIEE = "Vente liée";

    private MonnaieVenteLiee() {
    }

    /**
     * Lignes « libelle;valeur;unite;gras » du recapitulatif d'une vente qui a une vente liee, telles qu'imprimees.
     *
     * @param lignes
     *            recapitulatif construit comme pour une vente seule (non modifie)
     * @param refLiee
     *            reference (ou numero de ticket) de l'autre vente ; vide : pas de renvoi
     */
    public static List<String> sansMonnaie(List<String> lignes, String refLiee) {
        List<String> r = new ArrayList<>();
        String net = null;
        boolean differe = false;
        for (String l : lignes) {
            String[] p = l.split(";", -1);
            String libelle = p[0].replace(":", "").trim();
            String valeur = p.length > 1 ? p[1].trim() : "";
            if (libelle.startsWith("Montant Versé") || libelle.startsWith("Monnaie")) {
                continue;
            }
            if (libelle.startsWith("Net à payer")) {
                net = valeur;
            } else if (libelle.equals("Règlement") && valeur.equals(ReglementTicket.DIFFERE)) {
                differe = true;
            }
            r.add(l);
        }
        if (!differe && net != null && entier(net) > 0) {
            r.add(REGLE + ": ;     " + net + "; F CFA;0");
        }
        if (refLiee != null && !refLiee.trim().isEmpty()) {
            // « n° » garde la reference en texte : un numero de ticket tout en chiffres serait lu comme un montant
            r.add(VENTE_LIEE + ": ;     n° " + refLiee.trim() + "; ;0");
        }
        return r;
    }

    /** Monnaie de l'operation (ticket combine) : verse total - (part client + net comptant), jamais negative. */
    public static int monnaie(int verseTotal, int partClient, int netComptant) {
        return Math.max(0, verseTotal - (partClient + netComptant));
    }

    static int entier(String v) {
        String t = v == null ? "" : v.replaceAll("[^0-9-]", "");
        try {
            return t.isEmpty() || t.equals("-") ? 0 : Integer.parseInt(t);
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}
