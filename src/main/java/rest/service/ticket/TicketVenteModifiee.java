package rest.service.ticket;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import rest.service.ticket.ConversionTicket.Article;
import rest.service.ticket.ConversionTicket.Section;

/**
 * Plan du 19/11, point 8 : ticket de la vente modifiee (« Ventes terminées », bouton « ticket vente modifiée »). Avant,
 * il ressortait le ticket de la seule nouvelle vente, comme « Réimprimer le ticket ». Il rappelle desormais, sur un
 * seul papier :
 * <ul>
 * <li>la vente d'origine (annulee par la modification) : lignes, parts des organismes, remise, part du client, ce que
 * le client avait paye ;</li>
 * <li>la vente modifiee : memes informations ;</li>
 * <li>les differences : total, remise, part de chaque organisme, part du client, deja paye, reste a payer ou a rendre
 * ;</li>
 * <li>le reglement de la validation de la modification : mode, montant verse, monnaie.</li>
 * </ul>
 * Construction pure, a partir des valeurs enregistrees (rien n'est recalcule hors des differences). Rend les sections
 * du nouveau modele (dessin du recu combine, {@link ModeleTicket#VENTE_MIXTE}) et les lignes de l'ancien ticket.
 */
public final class TicketVenteModifiee {

    public static final String TITRE_ORIGINE = "VENTE D'ORIGINE";
    public static final String TITRE_MODIFIEE = "VENTE MODIFIÉE";
    public static final String TITRE_DIFFERENCES = "DIFFÉRENCES";
    public static final String PART_CLIENT = "Part du client";
    public static final String PAYE_CLIENT = "Payé par le client";
    public static final String ECART_TOTAL = "Écart du total";
    public static final String ECART_REMISE = "Écart de la remise";
    public static final String ECART_PART = "Écart part ";
    public static final String ECART_CLIENT = "Écart part du client";
    public static final String DEJA_PAYE = "Déjà payé par le client";
    public static final String RESTE = "Reste à payer";
    public static final String A_RENDRE = "À rendre au client";

    /** Une vente : ce qui a ete enregistre. */
    public static final class Vente {
        public String ref = "";
        public String date = "";
        public List<Article> articles = Collections.emptyList();
        /** Nom, taux (entier) et part de chaque organisme. */
        public List<String[]> tiersPayants = Collections.emptyList();
        public int total;
        public int remise;
        public int partClient;
    }

    public static final class Entree {
        public Vente origine = new Vente();
        public Vente modifiee = new Vente();
        /** Ce que le client avait paye sur la vente d'origine. */
        public int payeOrigine;
        public String assure = "";
        /** Reglement de la validation de la modification. */
        public String modeReglement = "";
        public int verse;
        public int monnaie;
    }

    /** Les differences, aussi rendues a part pour les tests de coherence. */
    public static final class Ecarts {
        public int total;
        public int remise;
        public final Map<String, Integer> parts = new LinkedHashMap<>();
        public int partClient;
        public int dejaPaye;
        public int reste;
        public int aRendre;
    }

    private TicketVenteModifiee() {
    }

    public static Ecarts ecarts(Entree e) {
        Ecarts x = new Ecarts();
        x.total = e.modifiee.total - e.origine.total;
        x.remise = e.modifiee.remise - e.origine.remise;
        Map<String, Integer> avant = parts(e.origine.tiersPayants);
        Map<String, Integer> apres = parts(e.modifiee.tiersPayants);
        for (String nom : avant.keySet()) {
            x.parts.put(nom, apres.getOrDefault(nom, 0) - avant.get(nom));
        }
        for (String nom : apres.keySet()) {
            x.parts.putIfAbsent(nom, apres.get(nom));
        }
        x.partClient = e.modifiee.partClient - e.origine.partClient;
        x.dejaPaye = Math.max(0, e.payeOrigine);
        int solde = e.modifiee.partClient - x.dejaPaye;
        x.reste = Math.max(0, solde);
        x.aRendre = Math.max(0, -solde);
        return x;
    }

    private static Map<String, Integer> parts(List<String[]> tps) {
        Map<String, Integer> m = new LinkedHashMap<>();
        if (tps != null) {
            for (String[] t : tps) {
                m.merge(t[0], entier(t[2]), Integer::sum);
            }
        }
        return m;
    }

    /** Ecart signe, lisible : « +1 500 », « -300 », « 0 ». */
    public static String signe(int n) {
        return (n > 0 ? "+" : "") + ConversionTicket.nombre(n);
    }

    public static TicketCombine.Sortie construire(Entree e) {
        TicketCombine.Sortie s = new TicketCombine.Sortie();
        Ecarts x = ecarts(e);
        s.titre = "Ticket N° " + e.modifiee.ref + " (vente modifiée)";
        s.net = x.reste;
        s.ttc = e.modifiee.total;

        List<String[]> totauxO = totauxVente(e.origine);
        totauxO.add(new String[] { PAYE_CLIENT, ConversionTicket.nombre(x.dejaPaye) });
        s.sections.add(new Section(
                TITRE_ORIGINE + " — " + e.origine.ref + (vide(e.origine.date) ? "" : " du " + e.origine.date),
                e.origine.articles, totauxO));
        s.sections.add(
                new Section(TITRE_MODIFIEE + " — " + e.modifiee.ref, e.modifiee.articles, totauxVente(e.modifiee)));

        List<String[]> diff = new ArrayList<>();
        diff.add(new String[] { ECART_TOTAL, signe(x.total) });
        if (x.remise != 0) {
            diff.add(new String[] { ECART_REMISE, signe(x.remise) });
        }
        x.parts.forEach((nom, v) -> diff.add(new String[] { ECART_PART + nom, signe(v) }));
        diff.add(new String[] { ECART_CLIENT, signe(x.partClient) });
        diff.add(new String[] { DEJA_PAYE, ConversionTicket.nombre(x.dejaPaye) });
        if (x.aRendre > 0) {
            diff.add(new String[] { A_RENDRE, ConversionTicket.nombre(x.aRendre) });
        } else {
            diff.add(new String[] { RESTE, ConversionTicket.nombre(x.reste) });
        }
        s.sections.add(new Section(TITRE_DIFFERENCES, Collections.emptyList(), diff));

        s.articles.addAll(e.origine.articles);
        s.articles.addAll(e.modifiee.articles);

        /* ancien ticket : memes informations en lignes « qte; *;designation;pu;montant » */
        for (Section sec : s.sections) {
            s.datas.add(" ; ;" + sec.titre + ";;");
            for (Article a : sec.articles) {
                s.datas.add(" " + a.quantite + "; *;" + coupe(a.designation, 20) + ";"
                        + ConversionTicket.nombre(a.prixUnitaire) + ";" + ConversionTicket.nombre(a.montant));
            }
            for (String[] t : sec.totaux) {
                s.datas.add(" ; ;" + t[0] + ";;" + t[1]);
            }
        }

        if (!vide(e.assure)) {
            s.infoTiersPayants.add("Assuré / bénéficiaire:: " + e.assure.trim());
        }
        s.subtotal.add("Net à payer: ;     " + ConversionTicket.nombre(x.reste) + "; F CFA;1");
        s.subtotal.add("Règlement: ;     " + (vide(e.modeReglement) ? "-" : e.modeReglement.trim()) + "; ;0");
        s.subtotal.add("Montant Versé: ;     " + ConversionTicket.nombre(Math.max(0, e.verse)) + "; F CFA;0");
        s.subtotal.add("Monnaie: ;     " + ConversionTicket.nombre(Math.max(0, e.monnaie)) + "; F CFA;0");
        return s;
    }

    private static List<String[]> totauxVente(Vente v) {
        List<String[]> t = new ArrayList<>();
        t.add(new String[] { "Total", ConversionTicket.nombre(v.total) });
        for (String[] tp : v.tiersPayants) {
            t.add(new String[] { tp[0] + " " + tp[1] + " %", ConversionTicket.nombre(entier(tp[2])) });
        }
        if (v.remise != 0) {
            t.add(new String[] { "(-) Remise", ConversionTicket.nombre(v.remise) });
        }
        t.add(new String[] { PART_CLIENT, ConversionTicket.nombre(v.partClient) });
        return t;
    }

    private static String coupe(String s, int n) {
        if (s == null) {
            return "";
        }
        return s.length() <= n ? s : s.substring(0, n);
    }

    static int entier(String v) {
        try {
            return Integer.parseInt(v.replaceAll("[^0-9-]", ""));
        } catch (RuntimeException e) {
            return 0;
        }
    }

    private static boolean vide(String v) {
        return v == null || v.trim().isEmpty();
    }
}
