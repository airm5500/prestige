package rest.service.ticket;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import rest.service.ticket.ConversionTicket.Article;
import rest.service.ticket.ConversionTicket.Section;

/**
 * Cas 1 du 03/11/2026 : ticket client combine (modele {@link ModeleTicket#VENTE_MIXTE}) : la vente assurance et la
 * vente comptant nees de la meme saisie sur un seul papier, un seul code-barres (celui de la vente assurance).
 *
 * <p>
 * Construction pure, a partir de valeurs deja calculees par la cloture : rien n'est recalcule ici. Rend a la fois les
 * lignes de l'ancien ticket (datas, sous-totaux, bloc client) et les sections du nouveau modele.
 */
public final class TicketCombine {

    public static final String TITRE_ASSURANCE = "VENTE ASSURANCE";
    public static final String TITRE_COMPTANT = "VENTE AU COMPTANT";
    public static final String TTC_DEUX_VENTES = "Total des deux ventes";

    /** Ce que la cloture a enregistre pour les deux ventes. */
    public static final class Entree {
        public String refVo = "";
        public String refVno = "";
        public List<Article> articlesVo = Collections.emptyList();
        public List<Article> articlesVno = Collections.emptyList();
        /** Nom, taux (entier) et part de chaque tiers-payant de la vente assurance. */
        public List<String[]> tiersPayants = Collections.emptyList();
        public int totalVo;
        public int remiseVo;
        public int partClientVo;
        public int totalVno;
        public int remiseVno;
        public int netVno;
        public String assure = "";
        /** Mode de reglement (un seul) ou lignes « nom, montant » (plusieurs). */
        public String modeReglement = "";
        public List<String[]> reglements = Collections.emptyList();
        public int verse;
        public int monnaie;
        /** Plan du 06/11 point 6 : vente differee, et acompte encaisse en especes (0 : rien). */
        public boolean differe;
        public int especesDiffere;
    }

    /** Ce que l'imprimeur recoit. */
    public static final class Sortie {
        public String titre = "";
        public final List<String> datas = new ArrayList<>();
        public final List<String> subtotal = new ArrayList<>();
        public final List<String> infoTiersPayants = new ArrayList<>();
        public final List<Section> sections = new ArrayList<>();
        public final List<Article> articles = new ArrayList<>();
        public int net;
        public int ttc;
    }

    private TicketCombine() {
    }

    public static Sortie construire(Entree e) {
        Sortie s = new Sortie();
        s.titre = "Ticket N° " + e.refVo + " | " + e.refVno;
        s.net = Math.max(0, e.partClientVo) + Math.max(0, e.netVno);
        s.ttc = e.totalVo + e.totalVno;

        /* section assurance */
        List<String[]> totauxVo = new ArrayList<>();
        for (String[] tp : e.tiersPayants) {
            totauxVo.add(new String[] { tp[0] + " " + tp[1] + " %", ConversionTicket.nombre(entier(tp[2])) });
        }
        if (e.remiseVo > 0) {
            totauxVo.add(new String[] { "(-) Remise", ConversionTicket.nombre(e.remiseVo) });
        }
        totauxVo.add(new String[] { "Part du client", ConversionTicket.nombre(e.partClientVo) });
        s.sections.add(new Section(TITRE_ASSURANCE + " — " + e.refVo, e.articlesVo, totauxVo));

        /* section comptant : retour du 03/11, plus de mention « LIGNE COMPTANT » sous les articles (le titre suffit) */
        List<Article> comptant = new ArrayList<>(e.articlesVno);
        List<String[]> totauxVno = new ArrayList<>();
        if (e.remiseVno > 0) {
            totauxVno.add(new String[] { "(-) Remise", ConversionTicket.nombre(e.remiseVno) });
        }
        totauxVno.add(new String[] { "Comptant", ConversionTicket.nombre(e.netVno) });
        s.sections.add(new Section(TITRE_COMPTANT + " — " + e.refVno, comptant, totauxVno));

        s.articles.addAll(e.articlesVo);
        s.articles.addAll(comptant);

        /* ancien ticket : memes informations en lignes « qte; *;designation;pu;montant » */
        s.datas.add(" ; ;" + TITRE_ASSURANCE + " " + e.refVo + ";;");
        for (Article a : e.articlesVo) {
            ligneArticle(s.datas, a);
        }
        for (String[] t : totauxVo) {
            s.datas.add(" ; ;" + t[0] + ";;" + t[1]);
        }
        s.datas.add(" ; ;" + TITRE_COMPTANT + " " + e.refVno + ";;");
        for (Article a : comptant) {
            ligneArticle(s.datas, a);
        }
        for (String[] t : totauxVno) {
            s.datas.add(" ; ;" + t[0] + ";;" + t[1]);
        }
        s.datas.add(";;;;------");
        s.datas.add(";;;;" + ConversionTicket.nombre(s.ttc));

        if (!vide(e.assure)) {
            s.infoTiersPayants.add("Assuré / bénéficiaire:: " + e.assure.trim());
        }

        s.subtotal.add("Net à payer: ;     " + ConversionTicket.nombre(s.net) + "; F CFA;1");
        if (e.reglements != null && e.reglements.size() > 1) {
            for (String[] r : e.reglements) {
                s.subtotal.add(r[0] + ": ;     " + ConversionTicket.nombre(entier(r[1])) + "; ;0");
            }
        } else {
            s.subtotal.add("Règlement: ;     " + (vide(e.modeReglement) ? "-" : e.modeReglement.trim()) + "; ;0");
        }
        s.subtotal.add("Montant Versé: ;     " + ConversionTicket.nombre(e.verse) + "; F CFA;0");
        s.subtotal.add("Monnaie: ;     " + ConversionTicket.nombre(Math.max(0, e.monnaie)) + "; F CFA;0");
        if (e.differe) {
            List<String> r = ReglementTicket.differe(s.subtotal, e.especesDiffere);
            s.subtotal.clear();
            s.subtotal.addAll(r);
        }
        return s;
    }

    private static void ligneArticle(List<String> datas, Article a) {
        datas.add(" " + a.quantite + "; *;" + coupe(a.designation, 20) + ";" + ConversionTicket.nombre(a.prixUnitaire)
                + ";" + ConversionTicket.nombre(a.montant));
        for (String c : a.credits) {
            datas.add(" ; ;" + c + ";;");
        }
    }

    private static String coupe(String s, int n) {
        if (s == null) {
            return "";
        }
        return s.length() <= n ? s : s.substring(0, n);
    }

    private static int entier(String v) {
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
