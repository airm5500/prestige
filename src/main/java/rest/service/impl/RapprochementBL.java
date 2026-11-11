package rest.service.impl;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Retours du 09/10 (5) : rapprochement du releve d'un grossiste avec les BL et avoirs saisis dans Prestige.
 *
 * <ul>
 * <li>un BL du releve est rapproche du BL Prestige de meme numero (les chiffres du numero, le prefixe d'agence et les
 * lettres saisies sont ignores ; la sequence departage deux BL de meme numero) ;</li>
 * <li>un avoir du releve (AV/BL 793187 1) est rapproche d'un avoir Prestige du meme BL (sa reference d'avoir si elle
 * est saisie, sinon le montant le plus proche) ;</li>
 * <li>montants compares en valeur absolue, a la tolerance pres : RAPPROCHE ou ECART ;</li>
 * <li>sans correspondant : ABSENT_PRESTIGE (a saisir chez nous) ; BL / avoir Prestige de la periode absent du releve :
 * ABSENT_RELEVE (a reclamer ou a verifier aupres du grossiste).</li>
 * </ul>
 * Classe pure, sans base.
 */
public final class RapprochementBL {

    public enum Statut {
        RAPPROCHE, ECART, ABSENT_PRESTIGE, ABSENT_RELEVE
    }

    /** BL ou avoir enregistre dans Prestige. */
    public static class Piece {

        public final String id;
        public final boolean avoir;
        /** reference saisie (BL : N° BL ; avoir : N° du BL concerne) */
        public final String reference;
        /** avoir : reference de l'avoir du grossiste si saisie */
        public final String referenceAvoir;
        public final String sequence;
        public final LocalDate date;
        /** montant HT positif */
        public final long montantHt;

        public Piece(String id, boolean avoir, String reference, String referenceAvoir, String sequence, LocalDate date,
                long montantHt) {
            this.id = id;
            this.avoir = avoir;
            this.reference = reference;
            this.referenceAvoir = referenceAvoir;
            this.sequence = sequence;
            this.date = date;
            this.montantHt = montantHt;
        }
    }

    public static class Resultat {

        public final Statut statut;
        /** null pour ABSENT_RELEVE */
        public final ReleveGrossiste.Ligne releve;
        /** null pour ABSENT_PRESTIGE */
        public final Piece piece;
        /** montant releve (valeur absolue) - montant Prestige ; 0 si un cote manque */
        public final long ecart;

        Resultat(Statut statut, ReleveGrossiste.Ligne releve, Piece piece, long ecart) {
            this.statut = statut;
            this.releve = releve;
            this.piece = piece;
            this.ecart = ecart;
        }
    }

    private static final Pattern CHIFFRES = Pattern.compile("\\d+");
    /** Copharmed « 10-298560-00 » : agence, numero, suffixe */
    private static final Pattern AGENCE_NUMERO = Pattern.compile("^\\s*(\\d{2})[-\\s]?(\\d{5,7})[-\\s](\\d{2})\\s*$");

    private RapprochementBL() {
    }

    /** Numero d'un BL saisi : la plus longue suite de chiffres (« BKE-754695 » -> 754695, sans zeros de tete). */
    static String numero(String reference) {
        if (reference == null) {
            return "";
        }
        /* plan du 09/11 : Copharmed « 10-298560-00 » (agence, numero, suffixe) : l'agence distingue deux BL */
        Matcher c = AGENCE_NUMERO.matcher(reference);
        if (c.matches()) {
            return c.group(1) + c.group(2) + c.group(3);
        }
        Matcher m = CHIFFRES.matcher(reference);
        String meilleur = "";
        while (m.find()) {
            if (m.group().length() > meilleur.length()) {
                meilleur = m.group();
            }
        }
        String n = meilleur.replaceFirst("^0+(?=\\d)", "");
        return n;
    }

    /** Numero Copharmed avec son agence, ecrit « 10-298560-00 » ; null si la reference n'a pas cette forme. */
    static String avecAgence(String reference) {
        Matcher c = reference == null ? null : AGENCE_NUMERO.matcher(reference);
        return c != null && c.matches() ? c.group(1) + "-" + c.group(2) + "-" + c.group(3) : null;
    }

    private static boolean memeSequence(String a, String b) {
        return a != null && b != null && !a.trim().isEmpty() && numero(a).equals(numero(b));
    }

    public static List<Resultat> rapprocher(List<ReleveGrossiste.Ligne> releve, List<Piece> prestige, long tolerance) {
        long tol = Math.max(0, tolerance);
        Piece[] choix = new Piece[releve.size()];
        Set<String> utilisees = new HashSet<>();
        /* 1er passage : correspondances exactes (reference d'avoir, ou meme numero et meme montant) */
        for (int i = 0; i < releve.size(); i++) {
            ReleveGrossiste.Ligne l = releve.get(i);
            for (Piece p : candidates(l, prestige, utilisees)) {
                if (referenceAvoir(l, p) == 1 || Math.abs(Math.abs(l.montantHt) - Math.abs(p.montantHt)) <= tol) {
                    choix[i] = choix[i] == null ? p : meilleure(l, choix[i], p);
                }
            }
            if (choix[i] != null) {
                utilisees.add(choix[i].id);
            }
        }
        /* 2e passage : le reste, par numero (ecart de montant) */
        for (int i = 0; i < releve.size(); i++) {
            if (choix[i] != null) {
                continue;
            }
            ReleveGrossiste.Ligne l = releve.get(i);
            for (Piece p : candidates(l, prestige, utilisees)) {
                if (referenceAvoir(l, p) != -1) {
                    choix[i] = choix[i] == null ? p : meilleure(l, choix[i], p);
                }
            }
            if (choix[i] != null) {
                utilisees.add(choix[i].id);
            }
        }
        List<Resultat> sortie = new ArrayList<>();
        for (int i = 0; i < releve.size(); i++) {
            ReleveGrossiste.Ligne l = releve.get(i);
            if (choix[i] == null) {
                sortie.add(new Resultat(Statut.ABSENT_PRESTIGE, l, null, 0));
            } else {
                long ecart = Math.abs(l.montantHt) - Math.abs(choix[i].montantHt);
                sortie.add(new Resultat(Math.abs(ecart) <= tol ? Statut.RAPPROCHE : Statut.ECART, l, choix[i], ecart));
            }
        }
        for (Piece p : prestige) {
            if (!utilisees.contains(p.id)) {
                sortie.add(new Resultat(Statut.ABSENT_RELEVE, null, p, 0));
            }
        }
        return sortie;
    }

    private static List<Piece> candidates(ReleveGrossiste.Ligne l, List<Piece> prestige, Set<String> utilisees) {
        boolean avoir = l.type == ReleveGrossiste.Type.AVOIR;
        String num = numero(l.numeroBl);
        List<Piece> c = new ArrayList<>();
        for (Piece p : prestige) {
            if (p.avoir == avoir && !utilisees.contains(p.id) && (num.equals(numero(p.reference))
                    || avoir && !vide(p.referenceAvoir) && num.equals(numero(p.referenceAvoir)))) {
                c.add(p);
            }
        }
        return c;
    }

    /**
     * Avoir : 1 si la reference d'avoir saisie designe cette ligne (BL + indice), -1 si elle en designe une autre, 0 si
     * elle n'est pas saisie (ou pour un BL).
     */
    private static int referenceAvoir(ReleveGrossiste.Ligne l, Piece p) {
        if (l.type != ReleveGrossiste.Type.AVOIR || p.referenceAvoir == null || p.referenceAvoir.trim().isEmpty()) {
            return 0;
        }
        String r = p.referenceAvoir.replaceAll("\\s", "");
        if (r.endsWith(l.numeroBl + l.indiceAvoir)) {
            return 1;
        }
        /* plan du 09/11 : avoir designe par son propre numero (DPCI « AVO R11409455 », TEDIS « AV-2627127450-BKE ») */
        return l.indiceAvoir.isEmpty() && numero(l.numeroBl).equals(numero(r)) ? 1 : -1;
    }

    private static boolean vide(String s) {
        return s == null || s.trim().isEmpty();
    }

    /** Deux pieces Prestige de meme numero : reference d'avoir, puis sequence, puis montant le plus proche. */
    private static Piece meilleure(ReleveGrossiste.Ligne l, Piece a, Piece b) {
        if (l.type == ReleveGrossiste.Type.AVOIR) {
            boolean ra = a.referenceAvoir != null
                    && a.referenceAvoir.replaceAll("\\s", "").endsWith(l.numeroBl + l.indiceAvoir);
            boolean rb = b.referenceAvoir != null
                    && b.referenceAvoir.replaceAll("\\s", "").endsWith(l.numeroBl + l.indiceAvoir);
            if (ra != rb) {
                return ra ? a : b;
            }
        }
        boolean sa = memeSequence(a.sequence, l.sequence), sb = memeSequence(b.sequence, l.sequence);
        if (sa != sb) {
            return sa ? a : b;
        }
        long da = Math.abs(Math.abs(l.montantHt) - a.montantHt), db = Math.abs(Math.abs(l.montantHt) - b.montantHt);
        return db < da ? b : a;
    }

    /** Totaux : [releve BL, releve avoirs, Prestige BL, Prestige avoirs] (avoirs en negatif). */
    public static long[] totaux(List<ReleveGrossiste.Ligne> releve, List<Piece> prestige) {
        long[] t = new long[4];
        for (ReleveGrossiste.Ligne l : releve) {
            t[l.type == ReleveGrossiste.Type.AVOIR ? 1 : 0] += l.montantHt;
        }
        for (Piece p : prestige) {
            if (p.avoir) {
                t[3] -= Math.abs(p.montantHt);
            } else {
                t[2] += p.montantHt;
            }
        }
        return t;
    }
}
