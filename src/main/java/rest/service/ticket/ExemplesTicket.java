package rest.service.ticket;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Calendar;
import java.util.Collections;
import java.util.List;
import rest.service.promotion.PromotionLigne;

/**
 * Tickets d'exemple de l'apercu du menu « Modeles de ticket » : donnees fictives, ecrites exactement comme Prestige les
 * prepare pour l'ancien ticket, pour que l'apercu passe par la meme conversion que l'impression.
 */
public final class ExemplesTicket {

    private ExemplesTicket() {
    }

    public static ConversionTicket.Source exemple(ModeleTicket t, int papierMm) {
        ConversionTicket.Source s = new ConversionTicket.Source();
        s.ticket = t;
        s.papierMm = papierMm;
        s.nomOfficine = "PHARMACIE DU PLATEAU";
        s.pharmacien = "Dr Awa KOUASSI";
        s.adresse = "Bd de la République, Abidjan";
        s.telephone = "27 20 00 00 00";
        s.autresTelephones = "07 00 00 00 00";
        s.enTete = "Ouvert 7 j/7 de 8 h à 22 h";
        s.cc = "1234567 X";
        s.rc = "CI-ABJ-2019-B-0000";
        s.commentaire1 = "Merci de votre confiance";
        Calendar c = Calendar.getInstance();
        c.set(2026, Calendar.NOVEMBER, 2, 17, 42, 0);
        s.operation = c.getTime();
        s.referencePied = "4K7Q2M9XPA";
        switch (t) {
        case PREVENTE:
            s.titre = "TICKET PREVENTE N° 0042";
            s.infoSellers = Arrays.asList("Date:: 02/11/2026 17:35", "Vendeur:: M.TOURE");
            s.datas = Arrays.asList("Total;5.210;0", "Remise;(-) 260;0", "Net à payer;4.950;1");
            s.articles = articles();
            break;
        case TICKET_Z:
            s.titre = "TICKET Z DU 02/11/2026  A  17:42";
            s.datas = Arrays.asList("RECAPITULATIF DE CAISSE: A.KONE ; ; ; ;1;0", " ; ; ; ; ; ; ",
                    "Espèce(vno/vo):;184.350; F CFA;;0;1", "Crédit(vno/vo):;41.200; F CFA;;0;1",
                    "Espèce Sortie:;-15.000; F CFA;;0;1", "OM (vno/vo):;22.500; F CFA;;0;1",
                    "Total espèce: ;169.350;F CFA;;1;1", "Total CB (vno/vo): ;12.000;F CFA;;1;1", " ; ; ; ; ; ; ",
                    "RECAPITULATIF DE CAISSE: M.TOURE ; ; ; ;1;0", " ; ; ; ; ; ; ",
                    "Espèce(vno/vo):;91.000; F CFA;;0;1", "Espèce Regl:;6.000; F CFA;;0;1",
                    "Total espèce: ;97.000;F CFA;;1;1", " ; ; ; ; ; ; ", "TOTAL ESP: ; 266.350; F CFA;;1;1;G",
                    "TOTAL OM: ; 22.500; F CFA;;1;1;G", "TOTAL (VNO/VO): ;41.200; F CFA;;1;1;G",
                    "TOTAL CB: ; 12.000; F CFA;;1;1;G");
            break;
        case MOUVEMENT_CAISSE:
            s.titre = "Sortie de caisse";
            s.datas = Arrays.asList("Code comptable: ;625100; ", "Libellé: ;Espèces; ", "Montant: ;15 000; F CFA",
                    "Opérateur: ;A.KONE; ");
            s.commentaires = Arrays.asList(" ;0", "Achat de fournitures de bureau;0");
            s.referencePied = "M2KQ8V5RDN";
            break;
        case REGLEMENT_DIFFERE:
        case REGLEMENT_FACTURE:
        case REGLEMENT_CARNET_DEPOT:
            boolean facture = t == ModeleTicket.REGLEMENT_FACTURE;
            s.infoTiersPayants = Collections.singletonList(facture || t == ModeleTicket.REGLEMENT_CARNET_DEPOT
                    ? "Tiers-payant :: MUGEF-CI" : "Client :: N. ESSAI");
            s.infoSellers = Collections.singletonList("Opérateur:: A.KONE");
            s.datas = Arrays.asList("NBRE DOSSIER(S);VERSE;RESTANT",
                    facture ? "2;350 000F CFA;0F CFA" : "3;20 000F CFA;7 450F CFA", " ; ; ");
            s.subtotal = Arrays.asList("Net à payer: ;     " + (facture ? "350.000" : "27.450") + "; F CFA;1",
                    "Règlement: ;     " + (facture ? "Chèque" : "Espèces") + "; ;0",
                    "Montant Versé: ;     " + (facture ? "350.000" : "20.000") + "; F CFA;0",
                    "Monnaie: ;     0; F CFA;0");
            s.pieces = facture
                    ? Arrays.asList(new String[] { "Facture n° 5957", "210000" },
                            new String[] { "Facture n° 6012", "140000" })
                    : Arrays.asList(new String[] { "Vente 261028_00041", "12300" },
                            new String[] { "Vente 261030_00007", "9650" },
                            new String[] { "Vente 261101_00112", "5500" });
            s.referencePied = "D4WQ7N2KXE";
            break;
        case VENTE_MIXTE:
            mixte(s);
            break;
        default:
            vente(s, t);
            break;
        }
        return s;
    }

    /** Cas 1 du 03/11/2026 : les deux ventes de la maquette validee (noms fictifs). */
    private static void mixte(ConversionTicket.Source s) {
        TicketCombine.Entree e = new TicketCombine.Entree();
        e.refVo = "VO-2026-01039";
        e.refVno = "VNO-2026-01040";
        e.articlesVo = Arrays.asList(
                new ConversionTicket.Article("RAPICLAV 1G CPR B/14", 1, 6725, 6725, "",
                        Collections.singletonList(CreditLigne.libelle(null, 70, 4708))),
                new ConversionTicket.Article("ISOLONE 20MG CPR EFFV B/20", 1, 3145, 3145, "",
                        Collections.singletonList(CreditLigne.libelle(null, 70, 2201))));
        e.articlesVno = Collections
                .singletonList(new ConversionTicket.Article("KETODERM 2% CREME T/15G", 1, 4135, 4135, ""));
        e.tiersPayants = Collections.singletonList(new String[] { "MCI-CARE", "70", "6909" });
        e.totalVo = 9870;
        e.remiseVo = 148;
        e.partClientVo = 2810;
        e.totalVno = 4135;
        e.remiseVno = 207;
        e.netVno = 3930;
        e.assure = "N. ESSAI";
        e.modeReglement = "Espèces";
        e.verse = 6740;
        e.monnaie = 0;
        TicketCombine.Sortie c = TicketCombine.construire(e);
        s.titre = c.titre;
        s.infoSellers = Collections.singletonList("Caissier(e):: A.KONE   |   Vendeur:: M.TOURE");
        s.infoTiersPayants = c.infoTiersPayants;
        s.datas = c.datas;
        s.subtotal = c.subtotal;
        s.articles = c.articles;
        s.sections = c.sections;
        s.commentaires = Arrays.asList("Merci de votre confiance;0");
    }

    private static List<ConversionTicket.Article> articles() {
        return Arrays.asList(
                new ConversionTicket.Article("DOLIPRANE 1000 MG CPR B/8", 2, 1205, 2410, "Lot B2417 · 08/2028"),
                new ConversionTicket.Article("AMOXICILLINE BIOGARAN 1 G CPR B/14", 1, 2150, 2150,
                        "Lot 4A0931 · 03/2027"),
                // plan du 08/11, point 16 : une ligne en promotion, pour voir l'option dans l'apercu
                new ConversionTicket.Article("SÉRUM PHYSIOLOGIQUE UNIDOSES B/40", 1, 650, 650, "",
                        Collections.singletonList(PromotionLigne.mention(null, null, null, null, 0))));
    }

    private static void vente(ConversionTicket.Source s, ModeleTicket t) {
        s.titre = "Ticket N° 0127" + (t == ModeleTicket.VENTE ? "" : " | Bon N°:: 558213");
        s.infoSellers = Collections.singletonList("Caissier(e):: A.KONE   |   Vendeur:: M.TOURE");
        s.articles = articles();
        s.datas = new ArrayList<>(
                Arrays.asList(" 2; *;DOLIPRANE 1000MG CP;1.205;2.410", " 1; *;AMOXICILLINE BIOGAR;2.150;2.150",
                        " 1; *;SERUM PHYSIOLOGIQU;650;650", ";;;;------", ";;;;5.210"));
        s.commentaires = Arrays.asList("Merci de votre confiance;0");
        switch (t) {
        case VENTE_ASSURANCE:
            s.infoTiersPayants = Arrays.asList("Matricule Assuré:: MAT-00000", "Bénéficiaire:: N. ESSAI",
                    "Part du Client:: 990  CFA", "MUGEF-CI   80% :: 3.960  CFA");
            s.subtotal = Arrays.asList("* ;(-) 260; F CFA;1", "Vente à terme: ;    3.960; F CFA;1",
                    "Net à payer: ;     990; F CFA;1", "Règlement: ;     Espèces; ;0",
                    "Montant Versé: ;     1.000; F CFA;0", "Monnaie: ;     10; F CFA;0");
            break;
        case VENTE_CARNET:
            s.infoTiersPayants = Arrays.asList("Nom du Client:: N. ESSAI",
                    "SOCIÉTÉ IVOIRIENNE D'ESSAI ET DE DISTRIBUTION SA   100% :: 4.950  CFA");
            s.subtotal = Arrays.asList("* ;(-) 260; F CFA;1", "Vente à terme: ;    4.950; F CFA;1",
                    "Net à payer: ;     0; F CFA;1");
            s.encoursCarnet = "48 200 F CFA";
            break;
        case VENTE_DEPOT:
            s.infoSellers = Arrays.asList("Caissier(e):: A.KONE   |   Vendeur:: M.TOURE", "Dépôt: DÉPÔT COCODY",
                    "Client(e):: K. GÉRANT");
            s.subtotal = Arrays.asList("* ;(-) 260; F CFA;1", "Vente à terme: ;    4.950; F CFA;1",
                    "Net à payer: ;     0; F CFA;1");
            break;
        default:
            s.subtotal = Arrays.asList("* ;(-) 260; F CFA;1", "Net à payer: ;     4.950; F CFA;1",
                    "Règlement: ;     Espèces; ;0", "Montant Versé: ;     5.000; F CFA;0",
                    "Monnaie: ;     50; F CFA;0");
            break;
        }
    }
}
