package rest.service.ticket;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Retour du 26/11 : sur le ticket client combine (vente assurance liee a une vente au comptant), la section assurance
 * porte une ligne « Crédit » = total des produits de la vente assurance, entre les produits et les organismes, comme «
 * Comptant » termine la section comptant. Rien d'autre ne change : organismes, remise, part du client, comptant, total
 * des deux ventes, net a payer, et l'ancien ticket garde ses cinq champs par ligne.
 */
class TicketCombineCreditCoherenceTest {

    private static String texte(TicketDocument d) {
        return d.blocsNonVides().stream().flatMap(b -> b.elements.stream()).map(Object::toString)
                .collect(Collectors.joining("\n"));
    }

    private static int compte(String t, String motif) {
        int n = 0;
        for (int i = t.indexOf(motif); i >= 0; i = t.indexOf(motif, i + 1)) {
            n++;
        }
        return n;
    }

    private static List<ConversionTicket.Article> articles(Random r, String prefixe, boolean credits) {
        int n = 1 + r.nextInt(5);
        List<ConversionTicket.Article> l = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            int q = r.nextInt(10) == 0 ? 0 : 1 + r.nextInt(4);
            int pu = r.nextInt(10) == 0 ? 0 : 50 + r.nextInt(30_000);
            List<String> c = credits && pu > 0 && q > 0
                    ? Collections.singletonList(CreditLigne.libelle(null, 70, pu * q * 70 / 100))
                    : Collections.emptyList();
            l.add(new ConversionTicket.Article(prefixe + " " + i, q, pu, pu * q, "", c));
        }
        return l;
    }

    private static int somme(List<ConversionTicket.Article> l) {
        return l.stream().mapToInt(a -> a.montant).sum();
    }

    @Test
    @DisplayName("Coherence : 5 000 tickets combines, une ligne « Crédit » = total assurance, avant les organismes, le reste intact")
    void creditTotalAssurance() {
        Random r = new Random(20261126L);
        for (int cas = 0; cas < 5_000; cas++) {
            String ici = "cas " + cas;
            TicketCombine.Entree e = new TicketCombine.Entree();
            e.refVo = "VO-" + cas;
            e.refVno = "VNO-" + cas;
            e.articlesVo = articles(r, "ASSUR", true);
            e.articlesVno = articles(r, "COMPT", false);
            e.totalVo = somme(e.articlesVo);
            e.totalVno = somme(e.articlesVno);
            int nTp = 1 + r.nextInt(3);
            List<String[]> tps = new ArrayList<>();
            int parts = 0;
            for (int i = 0; i < nTp; i++) {
                int part = e.totalVo == 0 ? 0 : r.nextInt(1 + (e.totalVo - parts) / 2);
                parts += part;
                tps.add(new String[] { "ORG" + i, String.valueOf(new int[] { 0, 1, 30, 70, 80, 100 }[r.nextInt(6)]),
                        String.valueOf(part) });
            }
            e.tiersPayants = tps;
            e.remiseVo = r.nextBoolean() ? 0 : r.nextInt(1 + (e.totalVo - parts));
            e.partClientVo = e.totalVo - parts - e.remiseVo;
            e.remiseVno = r.nextBoolean() ? 0 : r.nextInt(1 + e.totalVno);
            e.netVno = e.totalVno - e.remiseVno;
            e.assure = "N. ESSAI";
            e.modeReglement = "Espèces";
            e.verse = e.partClientVo + e.netVno;
            TicketCombine.Sortie s = TicketCombine.construire(e);

            /* sections : « Crédit » en tete des totaux assurance, une fois ; la section comptant n'en a pas */
            List<String[]> tVo = s.sections.get(0).totaux;
            List<String[]> tVno = s.sections.get(1).totaux;
            assertEquals("Crédit", tVo.get(0)[0], ici);
            assertEquals(ConversionTicket.nombre(e.totalVo), tVo.get(0)[1], ici + " : Crédit = total assurance");
            assertEquals(1, tVo.stream().filter(t -> t[0].startsWith("Crédit")).count(), ici);
            assertEquals(0, tVno.stream().filter(t -> t[0].startsWith("Crédit")).count(), ici);
            List<String> taux = TicketCombine.tauxImprimes(tps);
            for (int i = 0; i < nTp; i++) {
                assertEquals(tps.get(i)[0] + " " + taux.get(i) + " %", tVo.get(1 + i)[0], ici);
                assertEquals(ConversionTicket.nombre(Integer.parseInt(tps.get(i)[2])), tVo.get(1 + i)[1], ici);
            }
            assertEquals(1 + nTp + (e.remiseVo > 0 ? 1 : 0) + 1, tVo.size(), ici);
            assertEquals("Part du client", tVo.get(tVo.size() - 1)[0], ici);
            assertEquals(ConversionTicket.nombre(e.partClientVo), tVo.get(tVo.size() - 1)[1], ici);
            assertEquals("Comptant", tVno.get(tVno.size() - 1)[0], ici);
            assertEquals(ConversionTicket.nombre(e.netVno), tVno.get(tVno.size() - 1)[1], ici);
            /* regles de calcul : credit = organismes + remise + part du client ; ttc et net inchanges */
            assertEquals(e.totalVo, parts + e.remiseVo + e.partClientVo, ici);
            assertEquals(e.totalVo + e.totalVno, s.ttc, ici);
            assertEquals(e.partClientVo + e.netVno, s.net, ici);

            /* ancien ticket : la ligne suit le dernier produit assurance (ou son credit) et precede le 1er organisme */
            int lignesVo = 1 + e.articlesVo.size() + e.articlesVo.stream().mapToInt(a -> a.credits.size()).sum();
            assertEquals(" ; ;*Crédit*;;" + ConversionTicket.nombre(e.totalVo), s.datas.get(lignesVo), ici);
            assertTrue(s.datas.get(lignesVo + 1).startsWith(" ; ;" + tps.get(0)[0] + " "), ici);
            assertEquals(1, s.datas.stream().filter(l -> l.startsWith(" ; ;*Crédit*;;")).count(), ici);
            assertEquals(" ; ;*Comptant*;;" + ConversionTicket.nombre(e.netVno), s.datas.get(s.datas.size() - 3), ici);
            assertEquals(";;;;" + ConversionTicket.nombre(s.ttc), s.datas.get(s.datas.size() - 1), ici);
            for (String l : s.datas) {
                assertEquals(5, l.split(";", -1).length, ici + " : " + l);
            }

            /*
             * nouveau ticket : une seule ligne « Crédit », entre le dernier produit assurance et le 1er organisme ; «
             * Total des deux ventes » reste le TTC
             */
            if (cas % 10 == 0) {
                ConversionTicket.Source src = new ConversionTicket.Source();
                src.ticket = ModeleTicket.VENTE_MIXTE;
                src.papierMm = cas % 20 == 0 ? 80 : 58;
                src.titre = s.titre;
                src.infoTiersPayants = s.infoTiersPayants;
                src.datas = s.datas;
                src.subtotal = s.subtotal;
                src.articles = s.articles;
                src.sections = s.sections;
                TicketDocument doc = ConversionTicket.convertir(src, new ReglagesTicket(ModeleTicket.VENTE_MIXTE));
                String t = texte(doc);
                String ligne = "PAIRE[*Crédit* | " + ConversionTicket.nombre(e.totalVo) + " F";
                assertEquals(1, compte(t, "PAIRE[*Crédit* "), ici + " : " + t);
                assertEquals(1, compte(t, "PAIRE[*Comptant* | " + ConversionTicket.nombre(e.netVno) + " F"),
                        ici + " : " + t);
                /* retour du 26/11 : « *Crédit* » et « *Comptant* » en gras (libelle et montant), les autres non */
                for (TicketDocument.Element el : doc.existant(TicketDocument.CORPS).elements) {
                    if (el.genre == TicketDocument.Genre.PAIRE) {
                        boolean marque = el.a.equals("*Crédit*") || el.a.equals("*Comptant*");
                        assertEquals(marque ? TicketDocument.Style.GRAS : TicketDocument.Style.NORMAL, el.style,
                                ici + " : " + el);
                    }
                }
                int credit = t.indexOf(ligne);
                ConversionTicket.Article dernier = e.articlesVo.get(e.articlesVo.size() - 1);
                assertTrue(credit > t.indexOf("ARTICLE[" + dernier.designation + " "), ici + " : " + t);
                assertTrue(credit < t.indexOf("PAIRE[" + tps.get(0)[0]), ici + " : " + t);
                assertTrue(credit < t.indexOf("TEXTE[" + TicketCombine.TITRE_COMPTANT), ici + " : " + t);
                assertTrue(t.contains(
                        "PAIRE[" + TicketCombine.TTC_DEUX_VENTES + " | " + ConversionTicket.nombre(s.ttc) + " F"),
                        ici + " : " + t);
            }
        }
    }
}
