package rest.service.impl;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Imprimante des tickets (retour support du 18/11, CAISSE11) : depuis le 13/11, le Payara des caisses tourne en service
 * Windows, sous le compte système, qui n'a pas d'imprimante par défaut. La réimpression échouait alors en 500 «
 * Imprimante inconnue ». Règle :
 * <ol>
 * <li>l'imprimante par défaut du compte qui fait tourner Payara, s'il en a une ;</li>
 * <li>sinon, s'il n'y a qu'une seule imprimante réelle installée (hors PDF, XPS, OneNote, télécopie), celle-ci ;</li>
 * <li>sinon aucune : l'écran le dit (voir {@link #message}).</li>
 * </ol>
 */
public final class ChoixImprimante {

    private static final String[] VIRTUELLES = { "pdf", "xps", "onenote", "fax", "télécopie", "telecopie", "send to",
            "envoyer vers", "snagit", "anydesk" };

    private ChoixImprimante() {
    }

    /** Imprimante logicielle (fichier, télécopie) : jamais choisie à la place d'une imprimante de tickets. */
    public static boolean virtuelle(String nom) {
        String n = nom == null ? "" : nom.toLowerCase(Locale.ROOT);
        for (String v : VIRTUELLES) {
            if (n.contains(v)) {
                return true;
            }
        }
        return false;
    }

    /**
     * @param parDefaut
     *            nom de l'imprimante par défaut, ou null
     * @param installees
     *            noms des imprimantes visibles par Payara
     *
     * @return le nom retenu, ou null
     */
    public static String choisir(String parDefaut, List<String> installees) {
        if (parDefaut != null && !parDefaut.trim().isEmpty()) {
            return parDefaut;
        }
        List<String> reelles = new ArrayList<>();
        if (installees != null) {
            for (String n : installees) {
                if (n != null && !n.trim().isEmpty() && !virtuelle(n)) {
                    reelles.add(n);
                }
            }
        }
        return reelles.size() == 1 ? reelles.get(0) : null;
    }

    /** Ce qui reste acquis quand le ticket ne sort pas, selon l'opération. */
    public static final String VENTE = "La vente est bien enregistrée.";
    public static final String REGLEMENT = "Le règlement est bien enregistré.";
    public static final String TICKET_Z = "Le ticket Z pourra être réimprimé une fois l'imprimante réglée.";

    public static String message(String poste, int imprimantesReelles, String acquis) {
        String p = poste == null || poste.trim().isEmpty() ? "de ce poste" : "du poste " + poste;
        return "Ticket non imprimé : le serveur Prestige " + p + " ne voit pas d'imprimante par défaut"
                + (imprimantesReelles > 1 ? " (" + imprimantesReelles + " imprimantes installées, aucune choisie)" : "")
                + ". " + acquis + " Prévenez le support : l'imprimante des tickets doit être"
                + " l'imprimante par défaut du compte qui fait tourner le service Payara.";
    }

    /** Message de la caissière quand aucune imprimante n'est retenue, pour une vente. */
    public static String message(String poste, int imprimantesReelles) {
        return message(poste, imprimantesReelles, VENTE);
    }
}
