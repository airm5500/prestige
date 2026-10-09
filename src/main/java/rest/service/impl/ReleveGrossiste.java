package rest.service.impl;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Retours du 09/10 (5) : lecture du releve d'un grossiste (texte extrait du PDF, une ligne par operation).
 *
 * <pre>
 * Type   Numero BL / Seq client   Date BL    Montant HT
 * BL     BKE 754695 / 48          25/09/26       12 491
 * AV/BL  GNA 793187 1 / 57        15/09/26      -20 323     (avoir n° 1 sur le BL 793187)
 * </pre>
 *
 * Tolerant : espaces multiples, separateurs de milliers (espace, point, espace insecable), annee sur 2 ou 4 chiffres,
 * lignes parasites (en-tetes, filigrane « DUPLICATA », totaux) ignorees. Classe pure, sans base.
 */
public final class ReleveGrossiste {

    public enum Type {
        BL, AVOIR
    }

    /** Une operation du releve. */
    public static class Ligne {

        public final Type type;
        /** tel qu'imprime, ex. « VRI 683562 2 » */
        public final String numero;
        /** prefixe d'agence (« VRI »), peut etre vide */
        public final String agence;
        /** numero du BL (chiffres), ex. « 683562 » ; pour un avoir, le BL concerne */
        public final String numeroBl;
        /** rang de l'avoir sur ce BL (« 2 »), vide pour un BL */
        public final String indiceAvoir;
        public final String sequence;
        public final LocalDate date;
        /** montant HT signe (negatif pour un avoir) */
        public final long montantHt;

        Ligne(Type type, String numero, String agence, String numeroBl, String indiceAvoir, String sequence,
                LocalDate date, long montantHt) {
            this.type = type;
            this.numero = numero;
            this.agence = agence;
            this.numeroBl = numeroBl;
            this.indiceAvoir = indiceAvoir;
            this.sequence = sequence;
            this.date = date;
            this.montantHt = montantHt;
        }
    }

    /*
     * type | numero (prefixe facultatif, numero, indice facultatif) / sequence | date | montant. Le montant accepte les
     * separateurs de milliers et un signe moins eventuellement detache.
     */
    private static final Pattern LIGNE = Pattern.compile("(?i)(?:^|\\s)(AV\\s*/\\s*BL|AV|BL)\\s+"
            + "([A-Z]{1,6}\\s*)?(\\d{3,12})(?:\\s+(\\d{1,3}))?\\s*/\\s*(\\d{1,8})\\s+"
            + "(\\d{1,2}/\\d{1,2}/\\d{2,4})\\s+(-?\\s*\\d{1,3}(?:[ .\\u00a0\\u202f]?\\d{3})*)\\s*$");

    /* strict : une date impossible (31/02) est refusee, pas ramenee au 28/02 */
    private static final DateTimeFormatter JJ_MM_AA = DateTimeFormatter.ofPattern("d/M/uu")
            .withResolverStyle(java.time.format.ResolverStyle.STRICT);
    private static final DateTimeFormatter JJ_MM_AAAA = DateTimeFormatter.ofPattern("d/M/uuuu")
            .withResolverStyle(java.time.format.ResolverStyle.STRICT);

    private ReleveGrossiste() {
    }

    public static List<Ligne> lire(String texte) {
        List<Ligne> sortie = new ArrayList<>();
        if (texte == null) {
            return sortie;
        }
        for (String brute : texte.split("\\r?\\n")) {
            Ligne l = lireLigne(brute);
            if (l != null) {
                sortie.add(l);
            }
        }
        return sortie;
    }

    static Ligne lireLigne(String brute) {
        if (brute == null) {
            return null;
        }
        String s = brute.replace(' ', ' ').replace(' ', ' ').replace('\t', ' ').trim();
        Matcher m = LIGNE.matcher(s);
        if (!m.find()) {
            return null;
        }
        String t = m.group(1).replaceAll("\\s", "").toUpperCase();
        Type type = t.startsWith("AV") ? Type.AVOIR : Type.BL;
        String agence = m.group(2) == null ? "" : m.group(2).trim().toUpperCase();
        String numeroBl = m.group(3);
        String indice = m.group(4) == null ? "" : m.group(4);
        LocalDate date = date(m.group(6));
        if (date == null) {
            return null;
        }
        long montant;
        try {
            montant = Long.parseLong(m.group(7).replaceAll("[\\s.\\u00a0\\u202f]", ""));
        } catch (NumberFormatException e) {
            return null;
        }
        if (type == Type.AVOIR && montant > 0) {
            montant = -montant;
        }
        String numero = (agence.isEmpty() ? "" : agence + " ") + numeroBl + (indice.isEmpty() ? "" : " " + indice);
        return new Ligne(type, numero, agence, numeroBl, indice, m.group(5), date, montant);
    }

    private static LocalDate date(String v) {
        for (DateTimeFormatter f : new DateTimeFormatter[] { JJ_MM_AAAA, JJ_MM_AA }) {
            try {
                LocalDate d = LocalDate.parse(v, f);
                if (d.getYear() < 100) {
                    d = d.plusYears(2000);
                }
                return d;
            } catch (RuntimeException e) {
                // format suivant
            }
        }
        return null;
    }
}
