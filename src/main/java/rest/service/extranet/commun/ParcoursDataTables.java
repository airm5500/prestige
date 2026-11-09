package rest.service.extranet.commun;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Lecture complete d'une liste DataTables (plan du 07/11, §6 et §7). Le nombre de pages est tire de la premiere reponse
 * (jamais code en dur) ; la lecture s'arrete en erreur sur :
 * <ul>
 * <li>une page vide avant la fin attendue ;</li>
 * <li>une page identique a la precedente ;</li>
 * <li>un total qui change en cours de lecture (jeu de donnees modifie) ;</li>
 * <li>une page plus longue que demandee ;</li>
 * <li>un nombre de pages au-dela de la limite ;</li>
 * <li>un total final different du nombre de lignes recues.</li>
 * </ul>
 * Dans tous ces cas, rien n'est presente comme complet.
 * <p>
 * Longueur servie (08/11) : si la premiere page, non vide, a moins de lignes que demande alors que la liste en annonce
 * davantage, le site plafonne ses pages ; la suite est lue avec cette longueur (le total final est toujours verifie).
 */
public final class ParcoursDataTables {

    /** Lit une page : start, length, draw. */
    public interface Page {
        JSONObject lire(int start, int length, int draw) throws ExtranetException;
    }

    /** Recoit chaque ligne (tableau de cellules), avec sa position globale (0, 1, 2...). */
    public interface Receveur {
        void ligne(int position, JSONArray cellules) throws ExtranetException;
    }

    /**
     * Enveloppe lue : { msg, datatables: { recordsTotal, recordsFiltered, data, draw } }, ou datatables a la racine.
     */
    public static final class Enveloppe {
        public final int recordsTotal;
        public final int recordsFiltered;
        public final JSONArray data;

        Enveloppe(int recordsTotal, int recordsFiltered, JSONArray data) {
            this.recordsTotal = recordsTotal;
            this.recordsFiltered = recordsFiltered;
            this.data = data;
        }

        public static Enveloppe lire(JSONObject racine) throws ExtranetException {
            try {
                JSONObject dt = racine.has("datatables") ? racine.getJSONObject("datatables") : racine;
                int total = dt.getInt("recordsTotal");
                int filtre = dt.has("recordsFiltered") ? dt.getInt("recordsFiltered") : total;
                JSONArray data = dt.getJSONArray("data");
                if (total < 0 || filtre < 0) {
                    throw new ExtranetException(ExtranetException.Nature.REPONSE_INATTENDUE, "Total négatif");
                }
                return new Enveloppe(total, filtre, data);
            } catch (JSONException e) {
                throw new ExtranetException(ExtranetException.Nature.REPONSE_INATTENDUE,
                        "Enveloppe DataTables illisible", e);
            }
        }
    }

    /** Compte rendu d'un parcours complet. */
    public static final class Bilan {
        public final int recordsTotal;
        public final int recordsFiltered;
        public final int lignes;
        public final int pages;

        Bilan(int recordsTotal, int recordsFiltered, int lignes, int pages) {
            this.recordsTotal = recordsTotal;
            this.recordsFiltered = recordsFiltered;
            this.lignes = lignes;
            this.pages = pages;
        }
    }

    private ParcoursDataTables() {
    }

    public static int pagesAttendues(int total, int longueur) {
        if (longueur <= 0) {
            throw new IllegalArgumentException("longueur");
        }
        return total <= 0 ? 1 : (total + longueur - 1) / longueur;
    }

    public static Bilan parcourir(Page page, int longueur, int pagesMax, Receveur receveur) throws ExtranetException {
        int draw = 1;
        Enveloppe premiere = Enveloppe.lire(page.lire(0, longueur, draw));
        int attendu = premiere.recordsFiltered;
        int servie = premiere.data.length();
        if (servie > 0 && servie < Math.min(longueur, attendu)) {
            longueur = servie;
        }
        int pages = pagesAttendues(attendu, longueur);
        if (pages > pagesMax) {
            throw new ExtranetException(ExtranetException.Nature.PAGINATION,
                    attendu + " lignes, soit " + pages + " pages : au-delà de la limite de " + pagesMax);
        }
        Avancement.restants(Math.max(0, pages - 1));
        int recues = 0;
        byte[] precedente = null;
        Enveloppe e = premiere;
        for (int p = 0; p < pages; p++) {
            if (p > 0) {
                draw++;
                e = Enveloppe.lire(page.lire(p * longueur, longueur, draw));
                if (e.recordsFiltered != attendu || e.recordsTotal != premiere.recordsTotal) {
                    throw new ExtranetException(ExtranetException.Nature.PAGINATION,
                            "Le total a changé pendant la lecture (" + attendu + " puis " + e.recordsFiltered
                                    + ") : liste modifiée, à relancer");
                }
            }
            int n = e.data.length();
            int prevu = Math.min(longueur, attendu - p * longueur);
            if (n == 0 && prevu > 0) {
                throw new ExtranetException(ExtranetException.Nature.PAGINATION,
                        "Page " + (p + 1) + " vide alors que " + prevu + " lignes étaient attendues");
            }
            if (n > longueur) {
                throw new ExtranetException(ExtranetException.Nature.PAGINATION,
                        "Page " + (p + 1) + " : " + n + " lignes pour " + longueur + " demandées");
            }
            byte[] empreinte = empreinte(e.data);
            if (precedente != null && n > 0 && Arrays.equals(precedente, empreinte)) {
                throw new ExtranetException(ExtranetException.Nature.PAGINATION,
                        "Page " + (p + 1) + " identique à la précédente");
            }
            precedente = empreinte;
            for (int i = 0; i < n; i++) {
                JSONArray cellules = e.data.optJSONArray(i);
                if (cellules == null) {
                    throw new ExtranetException(ExtranetException.Nature.REPONSE_INATTENDUE,
                            "Ligne " + (recues + 1) + " : tableau de cellules attendu");
                }
                receveur.ligne(recues++, cellules);
            }
        }
        if (recues != attendu) {
            throw new ExtranetException(ExtranetException.Nature.PAGINATION,
                    recues + " lignes reçues pour " + attendu + " annoncées");
        }
        return new Bilan(premiere.recordsTotal, attendu, recues, pages);
    }

    static byte[] empreinte(JSONArray data) {
        try {
            return MessageDigest.getInstance("SHA-256")
                    .digest(data.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
