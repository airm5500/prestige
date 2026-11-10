package rest.service.ticket;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.util.Random;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;
import rest.service.ticket.TicketDocument.Style;

/**
 * Plan du 09/11, point 15 : nom long du tiers payant, au choix du modele de ticket.
 * <ul>
 * <li>« une ligne » (defaut) : nom raccourci par « … », taux et montant sur la meme ligne ;</li>
 * <li>« deux lignes » : nom sur deux lignes au plus (la seconde raccourcie par « … »), taux et montant a droite,
 * centres sur les deux lignes.</li>
 * </ul>
 * Un libelle qui tient, ou sans taux, ne change pas.
 */
class TicketTiersPayantNomLongTest {

    private static final String G = String.valueOf(TicketDocument.GRAS_DEBUT);
    private static final String F = String.valueOf(TicketDocument.GRAS_FIN);
    private static final String LONG = "MUTUELLE GÉNÉRALE DES FONCTIONNAIRES ET AGENTS DE L'ÉTAT DE CÔTE D'IVOIRE";

    @Test
    void casDeBaseUneLigne() {
        String long1 = "MUTUELLE GÉNÉRALE DES FONCTIONNAIRES ET AGENTS DE L'ÉTAT [" + TicketDocument.gras("80%") + "]";
        String r = RenduTicket.organismePour(long1, 120);
        assertNotNull(r);
        assertTrue(r.endsWith(" [" + G + "80%" + F + "]"), r);
        assertTrue(r.startsWith("MUTUELLE"), r);
        assertTrue(r.contains("…"), r);
        assertTrue(RenduTicket.largeurPour(r) <= 120, r);
        /* « : » de fin garde */
        String r2 = RenduTicket.organismePour(long1 + " :", 120);
        assertTrue(r2.endsWith("] :"), r2);
        /* forme « NOM 80 % » du bloc client */
        String r3 = RenduTicket.organismePour("MUTUELLE GÉNÉRALE DES FONCTIONNAIRES ET AGENTS 80 %", 110);
        assertTrue(r3.endsWith(" 80 %") && r3.contains("…"), r3);
        /* tient : rien ne change ; sans taux : rien ne change (coupure ordinaire) */
        assertNull(RenduTicket.organismePour("MUGEF-CI [" + TicketDocument.gras("80%") + "]", 200));
        assertNull(RenduTicket.organismePour("Espèces versées par le client au comptoir de la pharmacie", 60));
    }

    @Test
    void casDeBaseDeuxLignes() {
        String[] d = RenduTicket.organismeDeuxPour(LONG + " [" + TicketDocument.gras("80%") + "] :", 130);
        assertNotNull(d);
        assertEquals("[" + G + "80%" + F + "] :", d[2]);
        assertTrue(d[0].startsWith("MUTUELLE"), d[0]);
        assertTrue(d[1].endsWith("…"), d[1]);
        /* nom qui tient sur deux lignes sans etre raccourci */
        String[] e = RenduTicket.organismeDeuxPour("MUTUELLE GÉNÉRALE DES AGENTS [" + TicketDocument.gras("70%") + "]",
                160);
        assertNotNull(e);
        assertEquals("MUTUELLE GÉNÉRALE DES AGENTS", (e[0] + " " + e[1]).trim());
        assertNull(RenduTicket.organismeDeuxPour("MUGEF-CI [" + TicketDocument.gras("80%") + "]", 200));
        assertNull(RenduTicket.organismeDeuxPour("Espèces versées par le client au comptoir de la pharmacie", 60));
    }

    /** Libelles tires au hasard (graine fixe) : regles des deux presentations. */
    @Test
    void reglesSurDesMilliersDeLibelles() {
        Random r = new Random(20261115L);
        String lettres = "ABCDEFGHIJKLMNOPQRSTUVWXYZÉÈ '-.abcdefghij";
        int uneVue = 0, deuxVues = 0;
        for (int essai = 0; essai < 5000; essai++) {
            StringBuilder nom = new StringBuilder();
            int n = 1 + r.nextInt(70);
            nom.append((char) ('A' + r.nextInt(26)));
            for (int i = 1; i < n; i++) {
                nom.append(lettres.charAt(r.nextInt(lettres.length())));
            }
            String nomPropre = nom.toString().trim().replaceAll("\\s+", " ");
            String taux = (r.nextInt(100) + 1) + (r.nextBoolean() ? "" : "," + r.nextInt(10)) + "%";
            String suffixe;
            switch (r.nextInt(4)) {
            case 0:
                suffixe = " [" + TicketDocument.gras(taux) + "]";
                break;
            case 1:
                suffixe = " [" + TicketDocument.gras(taux) + "] :";
                break;
            case 2:
                suffixe = " " + taux.replace("%", " %");
                break;
            default:
                suffixe = "";
            }
            String libelle = nomPropre + suffixe;
            double l = 50 + r.nextInt(200);
            boolean tient = RenduTicket.largeurPour(libelle) <= l;

            /* une ligne */
            String res = RenduTicket.organismePour(libelle, l);
            if (tient || suffixe.isEmpty()) {
                assertNull(res, libelle + " / " + l);
            } else if (res == null) {
                /* pas meme la place du taux et d'une lettre : coupure ordinaire */
                assertTrue(RenduTicket.largeurPour(nomPropre.charAt(0) + "…") + RenduTicket.largeurPour(suffixe) > l,
                        libelle + " / " + l);
            } else {
                uneVue++;
                assertTrue(RenduTicket.largeurPour(res) <= l + 0.5, "une seule ligne : " + res + " / " + l);
                assertTrue(res.endsWith(suffixe), "taux garde : " + res);
                String debut = res.substring(0, res.length() - suffixe.length());
                assertTrue(debut.endsWith("…"), res);
                String garde = debut.substring(0, debut.length() - 1);
                assertTrue(!garde.isEmpty() && nomPropre.startsWith(garde),
                        "debut du nom : " + res + " / " + nomPropre);
            }

            /* deux lignes */
            String[] d = RenduTicket.organismeDeuxPour(libelle, l);
            if (tient || suffixe.isEmpty()) {
                assertNull(d, libelle + " / " + l);
                continue;
            }
            if (d == null) {
                continue;
            }
            deuxVues++;
            assertEquals(suffixe.trim(), d[2], "taux entier");
            double place = l - RenduTicket.largeurPour(d[2]) - 4;
            assertTrue(RenduTicket.largeurPour(d[0]) <= place + 0.5 && RenduTicket.largeurPour(d[1]) <= place + 0.5,
                    "chaque ligne dans sa colonne : " + d[0] + " / " + d[1] + " / " + place);
            assertTrue(!d[0].isEmpty() && !d[1].isEmpty(), "deux lignes");
            String l2 = d[1].endsWith("…") ? d[1].substring(0, d[1].length() - 1) : d[1];
            assertTrue(nomPropre.replace(" ", "").startsWith((d[0] + l2).replace(" ", "")),
                    "le nom, dans l'ordre : " + d[0] + " / " + d[1] + " / " + nomPropre);
            if (!d[1].endsWith("…")) {
                assertEquals(nomPropre.replace(" ", ""), (d[0] + d[1]).replace(" ", ""), "nom entier quand il tient");
            }
        }
        assertTrue(uneVue > 500 && deuxVues > 500, "jeu varie : " + uneVue + " / " + deuxVues);
    }

    private static int hauteur(String nom, String tp, int mm, int paires) {
        TicketDocument doc = new TicketDocument(ModeleTicket.VENTE);
        for (int i = 0; i < paires; i++) {
            doc.bloc(TicketDocument.CLIENT).paire(nom + " [" + TicketDocument.gras("80%") + "] :", "12 500 F CFA",
                    Style.NORMAL);
            doc.bloc(TicketDocument.CORPS).paire(nom + " [" + TicketDocument.gras("70%") + "]", "6 909 F CFA",
                    Style.NORMAL);
        }
        ReglagesTicket r = ReglagesTicket.depuis(ModeleTicket.VENTE, new JSONObject().put("tiersPayant", tp));
        BufferedImage img = new BufferedImage(400, 2000, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        try {
            RenduTicket.Resultat res = RenduTicket.dessiner(g, doc, r, mm, 0, 0);
            assertTrue(res.debordements.isEmpty(), res.debordements.toString());
            return res.hauteur;
        } finally {
            g.dispose();
        }
    }

    /** Vrai chemin du dessin : hauteur du ticket selon le reglage, rien ne deborde. */
    @Test
    void dessinSelonLeReglage() {
        for (int mm : new int[] { 58, 80 }) {
            int court = hauteur("MUGEF", ReglagesTicket.TP_UNE_LIGNE, mm, 1);
            assertEquals(court, hauteur(LONG, ReglagesTicket.TP_UNE_LIGNE, mm, 1),
                    mm + " mm, une ligne : meme hauteur, nom long ou court");
            /* deux lignes : une ligne de plus par tiers payant = la hauteur de deux paires courtes de plus */
            assertEquals(hauteur("MUGEF", ReglagesTicket.TP_UNE_LIGNE, mm, 2),
                    hauteur(LONG, ReglagesTicket.TP_DEUX_LIGNES, mm, 1),
                    mm + " mm, deux lignes : exactement 2 lignes par nom");
            assertEquals(court, hauteur("MUGEF", ReglagesTicket.TP_DEUX_LIGNES, mm, 1),
                    mm + " mm, deux lignes : un nom court reste sur une ligne");
        }
    }

    /** Le reglage est garde dans le modele et relu ; une valeur inconnue revient au defaut. */
    @Test
    void reglageGardeEtRelu() {
        ReglagesTicket defaut = new ReglagesTicket(ModeleTicket.VENTE_ASSURANCE);
        assertEquals(ReglagesTicket.TP_UNE_LIGNE, defaut.tiersPayant());
        assertEquals(ReglagesTicket.TP_UNE_LIGNE, defaut.json().getString("tiersPayant"));
        ReglagesTicket deux = ReglagesTicket.depuis(ModeleTicket.VENTE_ASSURANCE,
                defaut.json().put("tiersPayant", ReglagesTicket.TP_DEUX_LIGNES));
        assertEquals(ReglagesTicket.TP_DEUX_LIGNES, deux.tiersPayant());
        assertEquals(ReglagesTicket.TP_DEUX_LIGNES,
                ReglagesTicket.depuis(ModeleTicket.VENTE_ASSURANCE, deux.json()).tiersPayant());
        assertEquals(ReglagesTicket.TP_UNE_LIGNE, ReglagesTicket
                .depuis(ModeleTicket.VENTE_ASSURANCE, new JSONObject().put("tiersPayant", "N'IMPORTE")).tiersPayant());
        assertEquals(ReglagesTicket.TP_UNE_LIGNE,
                ReglagesTicket.depuis(ModeleTicket.VENTE_ASSURANCE, new JSONObject()).tiersPayant(),
                "reglage enregistre avant le point 15 : une ligne");
    }
}
