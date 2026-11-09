package rest.service.presaisie;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Locale;

/**
 * Regles de la pre-saisie des bons de livraison (plan avoir du 08/11, point 6, phase 1), sans base de donnees : elles
 * se verifient par des tests unitaires.
 *
 * <p>
 * Le numero est range comme le fait la creation du BL (OrderServiceImpl.creerBonLivraison : espaces de bord retires,
 * majuscules, 20 caracteres au plus) : c'est ce qui permet de retrouver la pre-saisie quand le BL est cree. TTC = HT +
 * TVA, calcule par le serveur. Une pre-saisie ne se modifie, ne se supprime et ne passe a « Traite » que tant qu'elle
 * est « A saisir ».
 */
public final class PresaisieBlRegles {

    public static final String A_SAISIR = "A_SAISIR";
    public static final String TRAITE = "TRAITE";
    public static final String SUPPRIME = "SUPPRIME";

    public static final int NUMERO_MAX = 20;
    public static final int MOTIF_MIN = 3;
    public static final int MOTIF_MAX = 200;
    /** Garde-fou : un montant de BL au-dela est une faute de frappe (et le TTC deborderait d'un INT). */
    public static final long MONTANT_MAX = 1_000_000_000L;

    private PresaisieBlRegles() {
    }

    /** Numero tel que la creation du BL le range : trim + majuscules ; null si vide. */
    public static String normaliserNumero(String numero) {
        if (numero == null) {
            return null;
        }
        String n = numero.trim().toUpperCase(Locale.FRENCH);
        return n.isEmpty() ? null : n;
    }

    /** Cle d'unicite : un meme grossiste et un meme numero ne sont pre-saisis qu'une fois. */
    public static String cle(String grossisteId, String numero) {
        return grossisteId + "|" + normaliserNumero(numero);
    }

    public static long ttc(long ht, long tva) {
        return ht + tva;
    }

    public static String libelleEtat(String etat) {
        if (A_SAISIR.equals(etat)) {
            return "À saisir";
        }
        if (TRAITE.equals(etat)) {
            return "Traité";
        }
        if (SUPPRIME.equals(etat)) {
            return "Supprimé";
        }
        return etat;
    }

    public static boolean etatConnu(String etat) {
        return A_SAISIR.equals(etat) || TRAITE.equals(etat) || SUPPRIME.equals(etat);
    }

    /** Modification, suppression et passage a « Traite » : seulement depuis « A saisir ». */
    public static boolean modifiable(String etat) {
        return A_SAISIR.equals(etat);
    }

    /** Saisie lue et controlee ; {@link #erreur} non nul si elle est refusee. */
    public static final class Saisie {

        public String grossisteId;
        public String numero;
        public LocalDate date;
        public long ht;
        public long tva;
        public String sequence;
        public String commandeId;
        public String erreur;

        public long ttc() {
            return PresaisieBlRegles.ttc(ht, tva);
        }
    }

    /**
     * Controle les champs saisis (memes champs que la fenetre « Saisie du bon de livraison », plus le grossiste et la
     * commande facultative).
     *
     * @param aujourdhui
     *            date du jour (la date du BL ne peut pas etre dans le futur, comme dans la fenetre de creation)
     */
    public static Saisie controler(String grossisteId, String numero, String date, Object ht, Object tva,
            String sequence, String commandeId, LocalDate aujourdhui) {
        Saisie s = new Saisie();
        s.grossisteId = vide(grossisteId) ? null : grossisteId.trim();
        s.numero = normaliserNumero(numero);
        s.sequence = vide(sequence) ? null : sequence.trim();
        s.commandeId = vide(commandeId) ? null : commandeId.trim();
        if (s.grossisteId == null) {
            s.erreur = "Choisissez le grossiste.";
            return s;
        }
        if (s.numero == null) {
            s.erreur = "Le numéro du BL est obligatoire.";
            return s;
        }
        if (s.numero.length() > NUMERO_MAX) {
            s.erreur = "Le numéro du BL fait " + NUMERO_MAX + " caractères au plus.";
            return s;
        }
        if (vide(date)) {
            s.erreur = "La date du BL est obligatoire.";
            return s;
        }
        try {
            s.date = LocalDate.parse(date.trim());
        } catch (DateTimeParseException e) {
            s.erreur = "Date du BL illisible (attendu AAAA-MM-JJ).";
            return s;
        }
        if (s.date.isAfter(aujourdhui)) {
            s.erreur = "La date du BL ne peut pas être dans le futur.";
            return s;
        }
        Long h = montant(ht);
        Long t = montant(tva);
        if (h == null) {
            s.erreur = "Montant hors taxe : nombre entier positif ou nul attendu.";
            return s;
        }
        if (t == null) {
            s.erreur = "Montant TVA : nombre entier positif ou nul attendu.";
            return s;
        }
        if (h > MONTANT_MAX || t > MONTANT_MAX) {
            s.erreur = "Montant trop élevé (" + MONTANT_MAX + " au plus).";
            return s;
        }
        s.ht = h;
        s.tva = t;
        if (s.sequence != null && !s.sequence.matches("[A-Za-z0-9 ./-]{1," + NUMERO_MAX + "}")) {
            s.erreur = "N° de séquence : 20 caractères au plus, chiffres, lettres, espace, point, barre ou tiret.";
            return s;
        }
        return s;
    }

    /** Montant entier >= 0 ; absent ou vide = 0 (comme la creation du BL) ; null si illisible ou negatif. */
    static Long montant(Object v) {
        if (v == null) {
            return 0L;
        }
        if (v instanceof Number) {
            double d = ((Number) v).doubleValue();
            if (d < 0 || d != Math.floor(d) || Double.isInfinite(d)) {
                return null;
            }
            return (long) d;
        }
        String t = String.valueOf(v).trim().replace(" ", "").replace(" ", "");
        if (t.isEmpty()) {
            return 0L;
        }
        if (!t.matches("\\d{1,12}")) {
            return null;
        }
        return Long.parseLong(t);
    }

    /** Motif de suppression : obligatoire, 3 a 200 caracteres ; null si accepte, sinon le message. */
    public static String controlerMotif(String motif) {
        String m = motif == null ? "" : motif.trim();
        if (m.length() < MOTIF_MIN) {
            return "Le motif de la suppression est obligatoire (" + MOTIF_MIN + " caractères au moins).";
        }
        if (m.length() > MOTIF_MAX) {
            return "Le motif fait " + MOTIF_MAX + " caractères au plus.";
        }
        return null;
    }

    private static boolean vide(String s) {
        return s == null || s.trim().isEmpty();
    }
}
