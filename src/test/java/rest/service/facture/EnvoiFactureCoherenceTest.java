package rest.service.facture;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Properties;
import java.util.Random;

import javax.mail.Address;
import javax.mail.BodyPart;
import javax.mail.Message;
import javax.mail.MessagingException;
import javax.mail.Multipart;
import javax.mail.Session;
import javax.mail.internet.MimeMessage;

import org.junit.jupiter.api.Test;

/**
 * Plan du 14/11, point 4 : regles de l'envoi des factures, verifiees sur des milliers de cas tires au hasard (graine
 * fixe).
 * <ul>
 * <li>mode : toute casse et tout blanc acceptes pour les trois modes, tout autre libelle refuse, vide = inchange ;</li>
 * <li>adresses : le champ se decoupe sur « ; », « , » et les blancs ; valides + invalides = morceaux, sans doublon
 * ;</li>
 * <li>fiche : le mode MAIL exige au moins une adresse et aucune invalide ; les autres modes n'exigent rien ;</li>
 * <li>message : destinataires = adresses valides de la fiche, dans l'ordre ; objet, piece jointe (nom, type, octets
 * identiques), montant en lettres de chiffres = montant de la facture ; relu apres ecriture/lecture MIME.</li>
 * </ul>
 */
class EnvoiFactureCoherenceTest {

    private static final long GRAINE = 20261115L;
    private static final String[] LOCAUX = { "compta", "factures", "jean.dupont", "a", "tp_42", "Service-Client",
            "o'neil", "x+y" };
    private static final String[] DOMAINES = { "mutuelle.ci", "assur-sante.com", "ex.co.uk", "laborex.org", "a1.fr" };
    private static final String[] INVALIDES = { "sans-arobase.ci", "deux@@a.ci", "@domaine.ci", "nom@", "nom@domaine",
            "nom@.ci", "no m@a.ci", "a..b@c.ci", ".a@b.ci", "a.@b.ci", "nom@domaine.c" };
    private static final String[] SEPARATEURS = { ";", ",", " ", " ; ", ",  ", "\t", ";;" };

    private static String adresseAuHasard(Random r) {
        return LOCAUX[r.nextInt(LOCAUX.length)] + r.nextInt(100) + "@" + DOMAINES[r.nextInt(DOMAINES.length)];
    }

    @Test
    void modesNormalisesOuRefuses() {
        Random r = new Random(GRAINE);
        for (int i = 0; i < 3000; i++) {
            String mode = EnvoiFacture.MODES.get(r.nextInt(EnvoiFacture.MODES.size()));
            StringBuilder ecrit = new StringBuilder();
            for (char c : mode.toCharArray()) {
                ecrit.append(r.nextBoolean() ? Character.toLowerCase(c) : c);
            }
            String saisi = (r.nextBoolean() ? "  " : "") + ecrit + (r.nextBoolean() ? " \t" : "");
            assertEquals(mode, EnvoiFacture.normaliserMode(saisi), saisi);
            assertEquals(mode, EnvoiFacture.modeEffectif(saisi), saisi);
        }
        for (String vide : new String[] { null, "", "   ", "\t" }) {
            assertNull(EnvoiFacture.normaliserMode(vide));
            assertEquals(EnvoiFacture.IMPRESSION, EnvoiFacture.modeEffectif(vide));
        }
        for (String inconnu : new String[] { "EMAIL", "courrier", "API2", "IMPRESSIONS", "fax", "0", "1" }) {
            IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                    () -> EnvoiFacture.normaliserMode(inconnu));
            assertTrue(e.getMessage().contains(inconnu));
            assertEquals(EnvoiFacture.IMPRESSION, EnvoiFacture.modeEffectif(inconnu));
        }
    }

    @Test
    void adressesDecoupeesEtTriees() {
        Random r = new Random(GRAINE + 1);
        for (int i = 0; i < 5000; i++) {
            int n = r.nextInt(5);
            List<String> attenduesValides = new ArrayList<>();
            List<String> attenduesInvalides = new ArrayList<>();
            StringBuilder champ = new StringBuilder(r.nextBoolean() ? " " : "");
            for (int k = 0; k < n; k++) {
                boolean valide = r.nextInt(4) != 0;
                String a = valide ? adresseAuHasard(r) : INVALIDES[r.nextInt(INVALIDES.length)];
                if (a.contains(" ")) {
                    // une adresse avec un blanc se decoupe : ce n'est plus un seul morceau
                    continue;
                }
                List<String> cible = valide ? attenduesValides : attenduesInvalides;
                boolean doublon = attenduesValides.stream().anyMatch(x -> x.equalsIgnoreCase(a))
                        || attenduesInvalides.stream().anyMatch(x -> x.equalsIgnoreCase(a));
                if (!doublon) {
                    cible.add(a);
                }
                champ.append(k == 0 ? "" : SEPARATEURS[r.nextInt(SEPARATEURS.length)])
                        .append(r.nextInt(5) == 0 ? a.toUpperCase(Locale.ROOT) : a);
            }
            String c = champ.toString();
            List<String> valides = EnvoiFacture.adresses(c);
            List<String> invalides = EnvoiFacture.adressesInvalides(c);
            assertEquals(attenduesValides.size(), valides.size(), c);
            assertEquals(attenduesInvalides.size(), invalides.size(), c);
            assertEquals(EnvoiFacture.morceaux(c).size(), valides.size() + invalides.size(), c);
            for (int k = 0; k < valides.size(); k++) {
                assertTrue(valides.get(k).equalsIgnoreCase(attenduesValides.get(k)), c);
            }
            // regle de la fiche
            String motif = EnvoiFacture.controlerFiche(EnvoiFacture.MAIL, c);
            if (!invalides.isEmpty()) {
                assertNotNull(motif, c);
                assertTrue(motif.contains("invalide"), motif);
            } else if (valides.isEmpty()) {
                assertNotNull(motif, c);
                assertTrue(motif.contains("renseignez"), motif);
            } else {
                assertNull(motif, c);
            }
            assertNull(EnvoiFacture.controlerFiche(EnvoiFacture.IMPRESSION, c), c);
            assertNull(EnvoiFacture.controlerFiche(EnvoiFacture.API, c), c);
        }
        for (String a : INVALIDES) {
            assertFalse(EnvoiFacture.adresseValide(a), a);
        }
    }

    @Test
    void montantsEtNoms() {
        Random r = new Random(GRAINE + 2);
        for (int i = 0; i < 5000; i++) {
            long v = r.nextInt(3) == 0 ? r.nextInt(1000) : (long) (r.nextDouble() * 50_000_000L);
            String m = EnvoiFacture.montant(v);
            assertTrue(m.endsWith(" F CFA"), m);
            String chiffres = m.substring(0, m.length() - " F CFA".length());
            assertEquals(v, Long.parseLong(chiffres.replace(" ", "")), m);
            // groupes de trois chiffres
            String[] groupes = chiffres.split(" ");
            for (int g = 1; g < groupes.length; g++) {
                assertEquals(3, groupes[g].length(), m);
            }
        }
        assertEquals("0 F CFA", EnvoiFacture.montant(0));
        assertEquals("1 F CFA", EnvoiFacture.montant(0.5));
        assertEquals("Facture_Mutuelle_Ecole_FT_2026_0042.pdf",
                EnvoiFacture.nomPieceJointe("Mutuelle École", "FT/2026/0042"));
        assertEquals("Facture.pdf", EnvoiFacture.nomPieceJointe("", null));
        assertEquals("Facture_a_1.pdf", EnvoiFacture.nomPieceJointe("  à  ", "1"));
    }

    @Test
    void messageRelu() throws Exception {
        Random r = new Random(GRAINE + 3);
        Properties props = new Properties();
        // expediteur connu de la session : pas de recherche du nom de la machine pour l'identifiant du message
        props.put("mail.from", "officine@exemple.ci");
        Session session = Session.getInstance(props);
        for (int i = 0; i < 400; i++) {
            List<String> dest = new ArrayList<>();
            int n = 1 + r.nextInt(3);
            while (dest.size() < n) {
                String a = adresseAuHasard(r);
                if (dest.stream().noneMatch(x -> x.equalsIgnoreCase(a))) {
                    dest.add(a);
                }
            }
            byte[] pdf = new byte[1 + r.nextInt(20000)];
            r.nextBytes(pdf);
            pdf[0] = '%';
            String numero = "FT" + (1000 + r.nextInt(9000));
            String organisme = r.nextBoolean() ? "Mutuelle École" : "IPS-CNAM";
            long net = r.nextInt(5_000_000);
            int bons = r.nextInt(300);
            String corps = EnvoiFacture.corps(organisme, numero, "Du 01/10/2026 Au 31/10/2026", net, bons, "Officine");
            String nom = EnvoiFacture.nomPieceJointe(organisme, numero);
            MimeMessage msg = EnvoiFacture.construire(session, "officine@exemple.ci", dest,
                    EnvoiFacture.objet(numero, "Officine"), corps, pdf, nom);

            ByteArrayOutputStream sortie = new ByteArrayOutputStream();
            msg.writeTo(sortie);
            MimeMessage relu = new MimeMessage(session, new ByteArrayInputStream(sortie.toByteArray()));
            Address[] to = relu.getRecipients(Message.RecipientType.TO);
            assertEquals(dest.size(), to.length);
            for (int k = 0; k < to.length; k++) {
                assertEquals(dest.get(k), to[k].toString());
            }
            assertNull(relu.getRecipients(Message.RecipientType.CC));
            assertNull(relu.getRecipients(Message.RecipientType.BCC));
            assertEquals("Facture " + numero + " - Officine", relu.getSubject());
            Multipart parties = (Multipart) relu.getContent();
            assertEquals(2, parties.getCount());
            String texte = (String) parties.getBodyPart(0).getContent();
            assertTrue(texte.contains(numero) && texte.contains(EnvoiFacture.montant(net))
                    && texte.contains("Nombre de bons : " + bons), texte);
            BodyPart piece = parties.getBodyPart(1);
            assertEquals(nom, piece.getFileName());
            assertTrue(piece.getContentType().toLowerCase(Locale.ROOT).startsWith("application/pdf"));
            try (InputStream in = piece.getInputStream()) {
                ByteArrayOutputStream b = new ByteArrayOutputStream();
                in.transferTo(b);
                assertArrayEquals(pdf, b.toByteArray());
            }
        }
        assertThrows(MessagingException.class, () -> EnvoiFacture.construire(session, "o@exemple.ci", new ArrayList<>(),
                "x", "y", new byte[] { 1 }, "f.pdf"));
        assertThrows(MessagingException.class, () -> EnvoiFacture.construire(session, "o@exemple.ci",
                Arrays.asList("a@b.ci"), "x", "y", new byte[0], "f.pdf"));
    }
}
