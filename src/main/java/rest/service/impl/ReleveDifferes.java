package rest.service.impl;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * RELEVE DES DIFFERES (onglet « Solde » de la gestion des differes, retours du 07/10). Calcul pur, sans base
 * (ReleveDifferesTest) : a partir du solde au debut de la periode et des operations de la periode, rend les lignes
 * chronologiques avec le solde apres chaque operation, et une ligne de total a la fin de chaque mois.
 *
 * Sens : une vente mise en differe est un DEBIT pour le client (il doit), un reglement est un CREDIT (il paie). Solde =
 * ce qui reste du = solde precedent + debit - credit.
 */
public final class ReleveDifferes {

    private static final DateTimeFormatter DATE_HEURE = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final String[] MOIS = { "janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août",
            "septembre", "octobre", "novembre", "décembre" };

    /** Une operation : vente differee (debit), reglement ou annulation d'une vente differee (credit). */
    public static final class Operation {
        final LocalDateTime date;
        final String libelle, reference, client;
        final long debit, credit;
        final String type;

        public Operation(LocalDateTime date, String libelle, String reference, String client, long debit, long credit) {
            this(date, libelle, reference, client, debit, credit, null);
        }

        /** type : VENTE, REGLEMENT ou ANNULATION ; null : deduit du sens (debit -> VENTE, sinon REGLEMENT) */
        public Operation(LocalDateTime date, String libelle, String reference, String client, long debit, long credit,
                String type) {
            this.date = date;
            this.libelle = libelle;
            this.reference = reference;
            this.client = client;
            this.debit = debit;
            this.credit = credit;
            this.type = type != null ? type : (debit > 0 ? "VENTE" : "REGLEMENT");
        }
    }

    /** Solde d'un client sur la periode (demande du 28/10, point 16 : un solde par client). */
    public static final class SoldeClient {
        final String client;
        final long soldeDebut, debit, credit;

        public SoldeClient(String client, long soldeDebut, long debit, long credit) {
            this.client = client;
            this.soldeDebut = soldeDebut;
            this.debit = debit;
            this.credit = credit;
        }
    }

    /**
     * Soldes par client : solde au debut de chaque client, plus ses debits et credits de la periode (lus dans les
     * operations). Tries par nom de client ; un client sans solde ni operation n'apparait pas.
     */
    public static JSONArray soldesParClient(java.util.Map<String, Long> soldesDebut, List<Operation> operations) {
        java.util.Map<String, long[]> parClient = new java.util.TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        soldesDebut.forEach((c, s) -> parClient.computeIfAbsent(c == null ? "" : c, k -> new long[3])[0] += s);
        for (Operation o : operations) {
            long[] t = parClient.computeIfAbsent(o.client == null ? "" : o.client, k -> new long[3]);
            t[1] += o.debit;
            t[2] += o.credit;
        }
        JSONArray l = new JSONArray();
        parClient.forEach((c, t) -> {
            if (t[0] != 0 || t[1] != 0 || t[2] != 0) {
                l.put(new JSONObject().put("client", c).put("soldeDebut", t[0]).put("debit", t[1]).put("credit", t[2])
                        .put("solde", t[0] + t[1] - t[2]));
            }
        });
        return l;
    }

    private ReleveDifferes() {
    }

    public static JSONObject releve(long soldeInitial, List<Operation> operations) {
        List<Operation> l = new ArrayList<>(operations);
        /* a la meme minute, la vente avant son reglement */
        l.sort(Comparator.comparing((Operation o) -> o.date).thenComparing(o -> o.credit > 0 ? 1 : 0));
        JSONArray lignes = new JSONArray();
        long solde = soldeInitial, totalDebit = 0, totalCredit = 0, moisDebit = 0, moisCredit = 0;
        String moisCourant = null;
        LocalDateTime dernier = null;
        for (Operation o : l) {
            String mois = cle(o.date);
            if (moisCourant != null && !moisCourant.equals(mois)) {
                lignes.put(totalMois(dernier, moisDebit, moisCredit, solde));
                moisDebit = 0;
                moisCredit = 0;
            }
            moisCourant = mois;
            dernier = o.date;
            solde += o.debit - o.credit;
            moisDebit += o.debit;
            moisCredit += o.credit;
            totalDebit += o.debit;
            totalCredit += o.credit;
            lignes.put(new JSONObject().put("type", o.type).put("date", o.date.format(DATE_HEURE))
                    .put("libelle", o.libelle).put("reference", o.reference == null ? "" : o.reference)
                    .put("client", o.client == null ? "" : o.client).put("debit", o.debit).put("credit", o.credit)
                    .put("solde", solde));
        }
        if (moisCourant != null) {
            lignes.put(totalMois(dernier, moisDebit, moisCredit, solde));
        }
        return new JSONObject().put("success", true).put("soldeInitial", soldeInitial).put("soldeFinal", solde)
                .put("totalDebit", totalDebit).put("totalCredit", totalCredit).put("data", lignes)
                .put("total", lignes.length());
    }

    private static String cle(LocalDateTime d) {
        return d.getYear() + "-" + d.getMonthValue();
    }

    private static JSONObject totalMois(LocalDateTime d, long debit, long credit, long solde) {
        String nom = MOIS[d.getMonthValue() - 1] + " " + d.getYear();
        return new JSONObject().put("type", "MOIS").put("date", "")
                .put("libelle", "Solde fin " + nom.substring(0, 1).toUpperCase(Locale.FRENCH) + nom.substring(1))
                .put("reference", "").put("client", "").put("debit", debit).put("credit", credit).put("solde", solde);
    }
}
