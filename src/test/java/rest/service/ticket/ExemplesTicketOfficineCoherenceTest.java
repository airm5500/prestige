package rest.service.ticket;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Demande du 25/11 : l'apercu du menu « Modeles de ticket » montre l'officine de la base. Sur des milliers de fiches
 * tirees avec une graine fixe, pour chaque ticket et chaque largeur : une valeur remplie de la fiche remplace
 * l'exemple, telle quelle ; une valeur vide ou faite d'espaces garde l'exemple ; le reste du ticket ne change pas ; le
 * nom de l'officine arrive dans le texte dessine.
 */
class ExemplesTicketOfficineCoherenceTest {

    private static final String[] VALEURS = { null, "", "   ", "PHARMACIE SAINTE-MARIE", "Pharmacie de l'Étoile d'Or",
            "Dr N. KONÉ", "27 22 41 00 00", "Rue 12, Cocody — Abidjan", "A", "TRÈS LONG NOM DE PHARMACIE QUI DÉBORDE" };

    private static String tirer(Random r) {
        return VALEURS[r.nextInt(VALEURS.length)];
    }

    private static String attendu(String v, String exemple) {
        return v == null || v.trim().isEmpty() ? exemple : v;
    }

    @Test
    void chaqueValeurRempliePrimeEtUneValeurVideGardeLExemple() {
        Random r = new Random(20261125L);
        int[] largeurs = { 58, 80 };
        for (int i = 0; i < 4000; i++) {
            ModeleTicket t = ModeleTicket.values()[r.nextInt(ModeleTicket.values().length)];
            int mm = largeurs[r.nextInt(2)];
            String[] o = new String[10];
            for (int k = 0; k < o.length; k++) {
                o[k] = tirer(r);
            }
            ConversionTicket.Source ex = ExemplesTicket.exemple(t, mm);
            ConversionTicket.Source s = ExemplesTicket.avecOfficine(ExemplesTicket.exemple(t, mm), o[0], o[1], o[2],
                    o[3], o[4], o[5], o[6], o[7], o[8], o[9]);
            String[] avant = { ex.nomOfficine, ex.pharmacien, ex.adresse, ex.telephone, ex.autresTelephones, ex.enTete,
                    ex.cc, ex.rc, ex.commentaire1, ex.commentaire2 };
            String[] apres = { s.nomOfficine, s.pharmacien, s.adresse, s.telephone, s.autresTelephones, s.enTete, s.cc,
                    s.rc, s.commentaire1, s.commentaire2 };
            for (int k = 0; k < avant.length; k++) {
                assertEquals(attendu(o[k], avant[k]), apres[k], t + " " + mm + " champ " + k);
            }
            /* le reste de l'exemple ne bouge pas */
            assertEquals(ex.titre, s.titre);
            assertEquals(ex.datas, s.datas);
            assertEquals(ex.referencePied, s.referencePied);
            assertEquals(ex.papierMm, s.papierMm);
        }
    }

    @Test
    void leNomDeLaBaseEstDessineEtLExempleDisparait() {
        for (ModeleTicket t : ModeleTicket.values()) {
            for (int mm : new int[] { 58, 80 }) {
                ReglagesTicket reg = new ReglagesTicket(t);
                ConversionTicket.Source s = ExemplesTicket.avecOfficine(ExemplesTicket.exemple(t, mm),
                        "PHARMACIE SAINTE-MARIE", "", null, "", "", "", "", "", "", "");
                TicketDocument d = ConversionTicket.convertir(s, reg);
                StringBuilder tout = new StringBuilder();
                for (TicketDocument.Bloc b : d.blocsNonVides()) {
                    for (TicketDocument.Element e : b.elements) {
                        tout.append(e.a).append('|').append(e.b).append('|').append(e.c).append('|').append(e.d)
                                .append('\n');
                    }
                }
                String texte = tout.toString();
                assertTrue(texte.contains("PHARMACIE SAINTE-MARIE"), t + " " + mm);
                assertTrue(!texte.contains("PHARMACIE DU PLATEAU"), t + " " + mm);
            }
        }
    }
}
