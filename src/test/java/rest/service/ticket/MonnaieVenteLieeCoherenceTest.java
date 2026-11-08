package rest.service.ticket;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import java.util.function.BiFunction;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;

/**
 * Monnaie des tickets d'une vente assurance avec vente comptant liee (ticket 1630805530, analyse du 08/11 validee).
 * Regles verifiees sur 5 000 operations tirees au hasard (graine fixe) : part client de 0 a 50 000 F, comptant de 5 a
 * 50 000 F, montant tendu egal au net, au-dessus du net ou au millier superieur, especes seules, especes + mobile,
 * differe ; le verse est reparti entre les deux ventes comme a la cloture (le comptant d'abord). Chaque ticket passe
 * par la conversion du ticket (modeles VENTE_ASSURANCE, VENTE et VENTE_MIXTE).
 * <ul>
 * <li>monnaie de l'operation = tendu - (part client + comptant), jamais negative ;</li>
 * <li>verse vente assurance + verse vente comptant = tendu ;</li>
 * <li>sur les trois tickets, « Monnaie rendue » n'apparait qu'une fois, sur le ticket combine, egale a la monnaie de
 * l'operation ; le verse n'apparait que sur le ticket combine ;</li>
 * <li>ticket de chaque vente : net inchange, « Réglé » = net (sauf differe ou net nul), un seul renvoi « Vente liée »
 * vers l'autre vente, les autres lignes gardees dans le meme ordre.</li>
 * </ul>
 * Le dernier test rejoue l'ancien ticket (recapitulatif imprime tel quel) : les memes controles y trouvent la monnaie
 * comptee deux fois (preuve qu'ils voient le defaut).
 */
class MonnaieVenteLieeCoherenceTest {

    private static final Pattern PAIRE = Pattern.compile("(?:PAIRE|ENCADRE)\\[([^|\\]]+?)\\s*\\|\\s*([^\\]]*)\\]");
    private static final long GRAINE = 20261108L;

    /** Paires (libelle, valeur) du ticket converti, tous blocs confondus. */
    private static List<String[]> paires(List<String> subtotal, ModeleTicket t) {
        ConversionTicket.Source s = ExemplesTicket.exemple(t, 80);
        s.subtotal = new ArrayList<>(subtotal);
        String texte = ConversionTicket.convertir(s, new ReglagesTicket(t)).blocsNonVides().stream()
                .filter(b -> b.id.equals(TicketDocument.REGLEMENT) || b.id.equals(TicketDocument.TOTAUX))
                .flatMap(b -> b.elements.stream()).map(Object::toString).collect(Collectors.joining("\n"));
        List<String[]> r = new ArrayList<>();
        Matcher m = PAIRE.matcher(texte.replace("**", ""));
        while (m.find()) {
            r.add(new String[] { m.group(1).trim(), m.group(2).trim() });
        }
        return r;
    }

    private static List<String> valeurs(List<String[]> p, String libelle) {
        return p.stream().filter(x -> x[0].equals(libelle)).map(x -> x[1]).collect(Collectors.toList());
    }

    private static int chiffres(String v) {
        String c = v.replaceAll("[^0-9]", "");
        return c.isEmpty() ? 0 : Integer.parseInt(c);
    }

    private static String ligne(String libelle, long valeur, String unite, int gras) {
        return libelle + ": ;     " + ConversionTicket.nombre(valeur) + ";" + unite + ";" + gras;
    }

    /** Une operation : part client, comptant, tendu, forme du reglement. */
    private static final class Operation {
        int partClient;
        int comptant;
        int tendu;
        int forme; // 0 especes, 1 especes + mobile, 2 differe
        String refVo;
        String refVno;

        int net() {
            return partClient + comptant;
        }

        boolean differe() {
            return forme == 2;
        }

        /*
         * repartition de la cloture (LigneComptant.parametresVenteComptant) : le comptant d'abord, le reste et la
         * monnaie sur la vente assurance
         */
        int verseVno() {
            return differe() ? 0 : comptant;
        }

        int verseVo() {
            return differe() ? 0 : tendu - verseVno();
        }
    }

    private static Operation tirer(Random g, int i) {
        Operation o = new Operation();
        o.partClient = g.nextInt(6) == 0 ? 0 : 5 * (1 + g.nextInt(10000));
        o.comptant = 5 * (1 + g.nextInt(10000));
        o.forme = g.nextInt(4) == 0 ? 2 : g.nextInt(3) == 0 ? 1 : 0;
        int net = o.net();
        int sorte = g.nextInt(3);
        o.tendu = sorte == 0 ? net
                : sorte == 1 ? net + 5 * (1 + g.nextInt(2000)) : (net / 1000 + 1 + g.nextInt(3)) * 1000;
        // numeros de ticket tout en chiffres ou references : ni l'un ni l'autre ne doit etre lu comme un montant
        o.refVo = g.nextBoolean() ? String.valueOf(1000000000L + g.nextInt(900000000)) : "261108_" + (10000 + i);
        o.refVno = g.nextBoolean() ? String.valueOf(1000000000L + g.nextInt(900000000)) : "261108_" + (20000 + i);
        return o;
    }

    /** Recapitulatif d'une vente tel que les services le construisent (avant la regle des ventes liees). */
    private static List<String> recap(Random g, int net, int verse, int forme, boolean assurance) {
        List<String> l = new ArrayList<>();
        if (g.nextInt(3) == 0) {
            l.add("* ;(-) " + ConversionTicket.nombre(5 + g.nextInt(2000)) + "; F CFA;1");
        }
        if (assurance && net == 0) {
            l.add(ligne("Vente à terme", 100 + g.nextInt(90000), " F CFA", 1));
            return forme == 2 ? ReglementTicket.differe(l, 0) : l;
        }
        l.add(ligne("Net à payer", net, " F CFA", 1));
        if (forme == 1) {
            int mobile = net == 0 ? 0 : g.nextInt(net + 1);
            l.add(ligne("Espèces", net - mobile, " ", 0));
            l.add(ligne("Mobile Money", mobile, " ", 0));
        } else {
            l.add("Règlement: ;     Espèces; ;0");
        }
        l.add(ligne("Montant Versé", verse, " F CFA", 0));
        l.add(ligne("Monnaie", Math.max(0, verse - net), " F CFA", 0));
        return forme == 2 ? ReglementTicket.differe(l, 0) : l;
    }

    private static TicketCombine.Entree combine(Operation o) {
        TicketCombine.Entree e = new TicketCombine.Entree();
        e.refVo = o.refVo;
        e.refVno = o.refVno;
        e.articlesVo = Collections.singletonList(new ConversionTicket.Article("PRODUIT ASSURANCE", 1, 9000, 9000, ""));
        e.articlesVno = Collections
                .singletonList(new ConversionTicket.Article("PRODUIT COMPTANT", 1, o.comptant, o.comptant, ""));
        e.tiersPayants = Collections.singletonList(new String[] { "ORGANISME", "70", "6300" });
        e.totalVo = 9000;
        e.partClientVo = o.partClient;
        e.totalVno = o.comptant;
        e.netVno = o.comptant;
        e.assure = "N. ESSAI";
        e.modeReglement = "Espèces";
        e.verse = o.verseVo() + o.verseVno();
        e.monnaie = MonnaieVenteLiee.monnaie(e.verse, e.partClientVo, e.netVno);
        e.differe = o.differe();
        return e;
    }

    /**
     * Controle les trois tickets d'une operation ; regle = recapitulatif imprime d'une vente liee (nouvelle regle ou
     * ancien ticket). Renvoie la liste des ecarts.
     */
    private static List<String> controler(Random g, Operation o, BiFunction<List<String>, String, List<String>> regle) {
        List<String> ecarts = new ArrayList<>();
        int monnaie = MonnaieVenteLiee.monnaie(o.verseVo() + o.verseVno(), o.partClient, o.comptant);
        if (monnaie != Math.max(0, o.differe() ? 0 - o.net() : o.tendu - o.net()) || monnaie < 0) {
            ecarts.add("monnaie de l'operation " + monnaie);
        }
        if (!o.differe() && o.verseVo() + o.verseVno() != o.tendu) {
            ecarts.add("verse reparti " + o.verseVo() + " + " + o.verseVno() + " != " + o.tendu);
        }
        List<String> rVo = recap(g, o.partClient, o.verseVo(), o.forme, true);
        List<String> rVno = recap(g, o.comptant, o.verseVno(), o.forme, false);
        List<String> tVo = regle.apply(rVo, o.refVno);
        List<String> tVno = regle.apply(rVno, o.refVo);
        List<String[]> pVo = paires(tVo, ModeleTicket.VENTE_ASSURANCE);
        List<String[]> pVno = paires(tVno, ModeleTicket.VENTE);
        List<String[]> pMix = paires(TicketCombine.construire(combine(o)).subtotal, ModeleTicket.VENTE_MIXTE);

        /* la monnaie : une seule fois, sur le combine, egale a celle de l'operation */
        int nbMonnaie = valeurs(pVo, "Monnaie rendue").size() + valeurs(pVno, "Monnaie rendue").size()
                + valeurs(pMix, "Monnaie rendue").size();
        int attendues = o.differe() ? 0 : 1;
        if (nbMonnaie != attendues) {
            ecarts.add("« Monnaie rendue » imprimee " + nbMonnaie + " fois");
        }
        if (!o.differe() && (valeurs(pMix, "Monnaie rendue").size() != 1
                || chiffres(valeurs(pMix, "Monnaie rendue").get(0)) != o.tendu - o.net())) {
            ecarts.add("monnaie du combine " + valeurs(pMix, "Monnaie rendue") + " != " + (o.tendu - o.net()));
        }
        for (String verse : new String[] { "Espèces versées", "Montant versé" }) {
            if (!valeurs(pVo, verse).isEmpty() || !valeurs(pVno, verse).isEmpty()) {
                ecarts.add("« " + verse + " » sur le ticket d'une vente");
            }
        }
        /* ticket de chaque vente : Réglé = net (sauf differe ou net nul), un seul renvoi, lignes gardees */
        Object[][] ventes = { { "assurance", rVo, tVo, pVo, o.partClient, o.refVno },
                { "comptant", rVno, tVno, pVno, o.comptant, o.refVo } };
        for (Object[] v : ventes) {
            @SuppressWarnings("unchecked")
            List<String> avant = (List<String>) v[1];
            @SuppressWarnings("unchecked")
            List<String> apres = (List<String>) v[2];
            @SuppressWarnings("unchecked")
            List<String[]> p = (List<String[]>) v[3];
            int net = (Integer) v[4];
            List<String> regle_ = valeurs(p, MonnaieVenteLiee.REGLE);
            boolean regleAttendu = !o.differe() && net > 0;
            if (regleAttendu ? regle_.size() != 1 || chiffres(regle_.get(0)) != net : !regle_.isEmpty()) {
                ecarts.add(v[0] + " : « Réglé » " + regle_ + " (net " + net + ")");
            }
            List<String> liee = valeurs(p, MonnaieVenteLiee.VENTE_LIEE);
            if (liee.size() != 1 || !liee.get(0).equals("n° " + v[5])) {
                ecarts.add(v[0] + " : renvoi " + liee + " != n° " + v[5]);
            }
            List<String> gardees = avant.stream().filter(l -> {
                String lib = l.split(";", -1)[0].replace(":", "").trim();
                return !lib.startsWith("Montant Versé") && !lib.startsWith("Monnaie");
            }).collect(Collectors.toList());
            if (!apres.subList(0, Math.min(apres.size(), gardees.size())).equals(gardees)) {
                ecarts.add(v[0] + " : lignes changees " + avant + " -> " + apres);
            }
        }
        return ecarts;
    }

    @Test
    void cinqMilleOperations() {
        Random g = new Random(GRAINE);
        int differes = 0;
        int avecMonnaie = 0;
        int partNulle = 0;
        for (int i = 0; i < 5000; i++) {
            Operation o = tirer(g, i);
            differes += o.differe() ? 1 : 0;
            avecMonnaie += !o.differe() && o.tendu > o.net() ? 1 : 0;
            partNulle += o.partClient == 0 ? 1 : 0;
            List<String> ecarts = controler(g, o, MonnaieVenteLiee::sansMonnaie);
            assertTrue(ecarts.isEmpty(), "operation " + i + " (part " + o.partClient + ", comptant " + o.comptant
                    + ", tendu " + o.tendu + ", forme " + o.forme + ") : " + ecarts);
        }
        // jeux varies : chaque famille de cas est representee
        assertTrue(differes > 500 && avecMonnaie > 1500 && partNulle > 400,
                differes + " / " + avecMonnaie + " / " + partNulle);
    }

    @Test
    void ticket1630805530() {
        // part client 370, comptant 1 210, le client tend 2 000 : 420 de monnaie, une seule fois
        Operation o = new Operation();
        o.partClient = 370;
        o.comptant = 1210;
        o.tendu = 2000;
        o.refVo = "261107_00134";
        o.refVno = "261107_00135";
        assertEquals(790, o.verseVo());
        assertEquals(420, MonnaieVenteLiee.monnaie(o.verseVo() + o.verseVno(), 370, 1210));
        assertEquals(Collections.emptyList(), controler(new Random(1), o, MonnaieVenteLiee::sansMonnaie));
        List<String[]> p = paires(MonnaieVenteLiee.sansMonnaie(recap(new Random(2), 370, 790, 0, true), "261107_00135"),
                ModeleTicket.VENTE_ASSURANCE);
        assertEquals(Collections.singletonList("370 F CFA"), valeurs(p, MonnaieVenteLiee.REGLE));
        assertEquals(Collections.singletonList("n° 261107_00135"), valeurs(p, MonnaieVenteLiee.VENTE_LIEE));
    }

    @Test
    void jamaisNegative() {
        Random g = new Random(GRAINE + 1);
        for (int i = 0; i < 5000; i++) {
            int pc = g.nextInt(50000), nc = g.nextInt(50000), verse = g.nextInt(120000);
            int m = MonnaieVenteLiee.monnaie(verse, pc, nc);
            assertTrue(m >= 0 && m == Math.max(0, verse - pc - nc), verse + " " + pc + " " + nc + " -> " + m);
        }
    }

    @Test
    void ancienTicketDetecte() {
        // ancien ticket : recapitulatif imprime tel quel (verse et monnaie sur chaque vente, sans renvoi)
        Random g = new Random(GRAINE);
        int detectes = 0;
        int avecMonnaie = 0;
        for (int i = 0; i < 2000; i++) {
            Operation o = tirer(g, i);
            List<String> ecarts = controler(g, o, (lignes, ref) -> lignes);
            if (!o.differe()) {
                avecMonnaie++;
                detectes += ecarts.stream().anyMatch(e -> e.startsWith("« Monnaie rendue » imprimee")) ? 1 : 0;
            }
        }
        assertEquals(avecMonnaie, detectes,
                "la monnaie comptee plusieurs fois doit etre vue sur chaque operation payee");
    }
}
