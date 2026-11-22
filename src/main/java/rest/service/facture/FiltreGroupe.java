package rest.service.facture;

/**
 * Retour du 22/11 : selecteur de groupe de tiers payant de la liste des factures (Facturation > Facture). Le meme
 * parametre « groupe » est lu par la liste, l'impression du releve et l'export Excel : les trois donnent les memes
 * factures.
 */
public final class FiltreGroupe {

    private FiltreGroupe() {
    }

    /** Identifiant du groupe saisi, ou null (tous les groupes) si vide ou illisible. */
    public static Integer lire(String valeur) {
        if (valeur == null || valeur.trim().isEmpty()) {
            return null;
        }
        try {
            return Integer.valueOf(valeur.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
