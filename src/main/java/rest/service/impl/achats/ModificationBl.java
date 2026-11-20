package rest.service.impl.achats;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

/**
 * Plan du 19/11, point 12 : trace d'une modification des informations d'un BL (numero, date de livraison, montant HT,
 * TVA, grossiste) et de son reglement.
 * <ul>
 * <li>{@link #differences} : les champs reellement changes, avec leur valeur avant et apres ;</li>
 * <li>{@link #detail} / {@link #lire} : le detail ecrit dans le journal (une ligne par champ) et sa relecture, pour
 * l'onglet « Modifications des BL » ;</li>
 * <li>{@link #reglement} : le reglement d'un BL apres modification de son TTC (le montant deja regle est garde).</li>
 * </ul>
 */
public final class ModificationBl {

    public static final String NUMERO = "Numéro";
    public static final String DATE = "Date de livraison";
    public static final String HT = "Montant HT";
    public static final String TVA = "TVA";
    public static final String TTC = "Montant TTC";
    public static final String GROSSISTE = "Grossiste";
    public static final String RESTANT = "Reste à payer";
    public static final String STATUT = "Règlement";
    public static final String REGLE_LE = "Réglé le";
    public static final String MONTANT_REGLE = "Montant réglé";

    static final String NON_REGLE = "NON REGLE";
    static final String REGLE_EN_PARTIE = "REGLE EN PARTIE";
    static final String REGLE = "REGLE";

    private static final String AVANT = "avant ";
    private static final String APRES = " → après ";
    private static final String SEP = " : ";
    private static final DateTimeFormatter JJ_MM_AAAA = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private ModificationBl() {
    }

    /** Informations d'un BL, telles qu'avant ou apres la modification. */
    public static final class Etat {
        final String numero;
        final LocalDate date;
        final Integer ht;
        final Integer tva;
        final String grossiste;

        public Etat(String numero, LocalDate date, Integer ht, Integer tva, String grossiste) {
            this.numero = numero;
            this.date = date;
            this.ht = ht;
            this.tva = tva;
            this.grossiste = grossiste;
        }

        Integer ttc() {
            return ht == null && tva == null ? null : (ht == null ? 0 : ht) + (tva == null ? 0 : tva);
        }
    }

    /** Un champ change : {libelle, avant, apres}, valeurs deja mises en forme. */
    public static final class Champ {
        public final String libelle;
        public final String avant;
        public final String apres;

        public Champ(String libelle, String avant, String apres) {
            this.libelle = libelle;
            this.avant = avant;
            this.apres = apres;
        }

        @Override
        public boolean equals(Object o) {
            if (!(o instanceof Champ)) {
                return false;
            }
            Champ c = (Champ) o;
            return libelle.equals(c.libelle) && avant.equals(c.avant) && apres.equals(c.apres);
        }

        @Override
        public int hashCode() {
            return Objects.hash(libelle, avant, apres);
        }

        @Override
        public String toString() {
            return libelle + SEP + AVANT + avant + APRES + apres;
        }
    }

    /** Les champs changes, dans l'ordre de l'ecran ; le TTC suit quand le HT ou la TVA change. Liste vide : rien. */
    public static List<Champ> differences(Etat avant, Etat apres) {
        List<Champ> l = new ArrayList<>();
        ajouter(l, NUMERO, texte(avant.numero), texte(apres.numero));
        ajouter(l, DATE, date(avant.date), date(apres.date));
        ajouter(l, HT, montant(avant.ht), montant(apres.ht));
        ajouter(l, TVA, montant(avant.tva), montant(apres.tva));
        ajouter(l, TTC, montant(avant.ttc()), montant(apres.ttc()));
        ajouter(l, GROSSISTE, texte(avant.grossiste), texte(apres.grossiste));
        return l;
    }

    /** Ajoute un champ s'il a change (sert aussi au reglement). */
    public static void ajouter(List<Champ> l, String libelle, String avant, String apres) {
        if (!avant.equals(apres)) {
            l.add(new Champ(libelle, avant, apres));
        }
    }

    /** Detail ecrit dans le journal : une ligne par champ, « Libelle : avant X → après Y ». */
    public static String detail(List<Champ> champs) {
        StringBuilder b = new StringBuilder();
        for (Champ c : champs) {
            if (b.length() > 0) {
                b.append('\n');
            }
            b.append(c);
        }
        return b.toString();
    }

    /** Relecture du detail du journal ; une ligne illisible est rendue telle quelle (libelle vide). */
    public static List<Champ> lire(String detail) {
        if (detail == null || detail.trim().isEmpty()) {
            return Collections.emptyList();
        }
        List<Champ> l = new ArrayList<>();
        for (String ligne : Arrays.asList(detail.split("\n"))) {
            int s = ligne.indexOf(SEP + AVANT);
            int a = ligne.lastIndexOf(APRES);
            if (s < 0 || a < s) {
                l.add(new Champ("", "", ligne));
                continue;
            }
            l.add(new Champ(ligne.substring(0, s), ligne.substring(s + SEP.length() + AVANT.length(), a),
                    ligne.substring(a + APRES.length())));
        }
        return l;
    }

    /** Valeur mise en forme d'un texte : une seule ligne, « (vide) » si absent. */
    public static String texte(String v) {
        String t = v == null ? "" : v.replaceAll("[\\r\\n]+", " ").trim();
        return t.isEmpty() ? "(vide)" : t;
    }

    public static String date(LocalDate d) {
        return d == null ? "(vide)" : d.format(JJ_MM_AAAA);
    }

    public static String montant(Integer m) {
        if (m == null) {
            return "(vide)";
        }
        String s = String.valueOf(Math.abs((long) m));
        StringBuilder b = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            if (i > 0 && (s.length() - i) % 3 == 0) {
                b.append(' ');
            }
            b.append(s.charAt(i));
        }
        return (m < 0 ? "-" : "") + b;
    }

    /**
     * Reglement d'un BL apres changement de son TTC. Le montant deja regle est garde ; le reste a payer et le statut en
     * decoulent. Un BL jamais regle garde son statut et, s'il n'en avait pas, aucun reste a payer.
     *
     * @return {reste a payer (null = inchange), statut}
     */
    public static Object[] reglement(int ttc, Integer regle, String statut, Integer restant) {
        int r = regle == null ? 0 : regle;
        if (r <= 0) {
            boolean jamaisRegle = statut == null || NON_REGLE.equals(statut);
            if (jamaisRegle) {
                return new Object[] { restant == null ? null : Math.max(0, ttc), statut };
            }
            /* statut « regle » sans montant (donnees anciennes) : on garde le statut, rien a payer */
            return new Object[] { REGLE.equals(statut) ? 0 : Math.max(0, ttc), statut };
        }
        int reste = Math.max(0, ttc - r);
        return new Object[] { reste, reste == 0 ? REGLE : REGLE_EN_PARTIE };
    }
}
