package rest.service.facture;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Random;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.script.Invocable;
import javax.script.ScriptEngine;
import javax.script.ScriptEngineManager;

import org.junit.jupiter.api.Test;

/**
 * Demande du 15/11 : envoi des factures par WhatsApp. Regles verifiees sur des milliers de numeros tires au hasard
 * (graine fixe) :
 * <ul>
 * <li>controle de la fiche : mode WHATSAPP accepte si et seulement si le champ Mobile porte un numero mobile valide ;
 * le numero d'envoi est alors 225 + les 10 chiffres ; les autres modes ignorent le champ Mobile ;</li>
 * <li>rapprochement ecran / serveur : la regle de la fiche (numeroWhatsAppValide, add.js) rend le meme verdict que le
 * serveur sur chaque numero ;</li>
 * <li>legende : numero, organisme, periode, nombre de bons et montant net (formate comme dans l'email), rien d'autre.
 * </li>
 * </ul>
 */
class EnvoiFactureWhatsAppCoherenceTest {

    private static final long GRAINE = 20261115L;
    private static final int CAS = 4000;
    private static final String ADD_JS = "src/main/webapp/general/app/view/tierspayantmanagement/tierspayant/action/add.js";

    /** Numero tire au hasard : valide (formes variees) ou non (fixe, ancien format, prefixe, lettres, longueur). */
    private static String numero(Random r, boolean[] valide) {
        String[] prefixesMobiles = { "01", "05", "07" };
        String[] autresPrefixes = { "21", "25", "27", "02", "08", "09", "03", "10" };
        StringBuilder huit = new StringBuilder();
        for (int i = 0; i < 8; i++) {
            huit.append(r.nextInt(10));
        }
        int forme = r.nextInt(12);
        valide[0] = forme < 7;
        String dix = prefixesMobiles[r.nextInt(3)] + huit;
        switch (forme) {
        case 0:
            return dix;
        case 1:
            return dix.replaceAll("(\\d{2})(?=\\d)", "$1 ");
        case 2:
            return dix.replaceAll("(\\d{2})(?=\\d)", "$1.");
        case 3:
            return "+225 " + dix;
        case 4:
            return "00225" + dix;
        case 5:
            return "225" + dix;
        case 6:
            return " " + dix.substring(0, 2) + "-" + dix.substring(2) + " ";
        case 7:
            return autresPrefixes[r.nextInt(autresPrefixes.length)] + huit;
        case 8:
            return huit.toString();
        case 9:
            return dix.substring(0, 9);
        case 10:
            return dix.substring(0, 4) + "A" + dix.substring(5);
        default:
            return r.nextBoolean() ? "" : "   ";
        }
    }

    private static String chiffres(String numero) {
        String n = numero.replaceAll("[\\s.\\-()+]", "");
        if (n.startsWith("00225")) {
            n = n.substring(5);
        } else if (n.startsWith("225") && n.length() == 13) {
            n = n.substring(3);
        }
        return n;
    }

    @Test
    void ficheWhatsAppAccepteeSeulementAvecUnNumeroMobile() {
        Random r = new Random(GRAINE);
        boolean[] valide = new boolean[1];
        int vus = 0, refus = 0;
        for (int i = 0; i < CAS; i++) {
            String n = numero(r, valide);
            String motif = EnvoiFacture.controlerFiche(EnvoiFacture.WHATSAPP, "adresse@invalide", n);
            String envoi = EnvoiFacture.numeroWhatsApp(n);
            if (valide[0]) {
                vus++;
                assertNull(motif, n);
                assertEquals("225" + chiffres(n), envoi, n);
            } else {
                refus++;
                assertNotNull(motif, n);
                assertTrue(motif.startsWith("Envoi des factures par WhatsApp : "), motif);
                assertNull(envoi, n);
            }
            /* les autres modes ne regardent pas le champ Mobile */
            assertNull(EnvoiFacture.controlerFiche(EnvoiFacture.IMPRESSION, "", n), n);
            assertNull(EnvoiFacture.controlerFiche(EnvoiFacture.API, "", n), n);
            assertEquals(EnvoiFacture.controlerFiche(EnvoiFacture.MAIL, "a@b.ci", n) == null, true, n);
            assertNotNull(EnvoiFacture.controlerFiche(EnvoiFacture.MAIL, "", n), n);
        }
        assertTrue(vus > CAS / 3 && refus > CAS / 4, vus + " / " + refus);
        assertEquals(EnvoiFacture.WHATSAPP, EnvoiFacture.normaliserMode(" whatsapp "));
        assertEquals(EnvoiFacture.WHATSAPP, EnvoiFacture.modeEffectif("WhatsApp"));
    }

    /** Rapprochement : la regle de la fiche (JavaScript) et celle du serveur rendent le meme verdict. */
    @Test
    void regleDeLaFicheIdentiqueAuServeur() throws Exception {
        String source = new String(Files.readAllBytes(Paths.get(ADD_JS)), StandardCharsets.UTF_8);
        Matcher m = Pattern.compile("function numeroWhatsAppValide\\(champMobile\\) \\{.*?\\n\\}", Pattern.DOTALL)
                .matcher(source);
        assertTrue(m.find(), "numeroWhatsAppValide absente de add.js");
        ScriptEngine js = new ScriptEngineManager().getEngineByName("nashorn");
        assertNotNull(js, "moteur JavaScript");
        js.eval(m.group());
        Invocable f = (Invocable) js;
        Random r = new Random(GRAINE + 1);
        boolean[] valide = new boolean[1];
        for (int i = 0; i < CAS; i++) {
            String n = numero(r, valide);
            Object ecran = f.invokeFunction("numeroWhatsAppValide", n);
            boolean ecranAccepte = Boolean.TRUE.equals(ecran);
            boolean serveurAccepte = EnvoiFacture.controlerFiche(EnvoiFacture.WHATSAPP, null, n) == null;
            assertEquals(serveurAccepte, ecranAccepte, "« " + n + " » : écran " + ecran);
            if (!ecranAccepte) {
                assertTrue(String.valueOf(ecran).startsWith("Envoi des factures par WhatsApp : "),
                        String.valueOf(ecran));
            }
        }
    }

    @Test
    void legendeDeLaFacture() {
        Random r = new Random(GRAINE + 2);
        for (int i = 0; i < CAS; i++) {
            String numero = "F" + (100000 + r.nextInt(900000));
            String organisme = r.nextInt(5) == 0 ? "" : "ORGANISME " + r.nextInt(100);
            String periode = r.nextInt(4) == 0 ? "" : "du 01/10/2026 au 31/10/2026";
            double net = r.nextInt(5) == 0 ? 0 : r.nextInt(50000000) + r.nextDouble();
            int bons = 1 + r.nextInt(400);
            String officine = r.nextInt(6) == 0 ? "" : "PHARMACIE " + r.nextInt(50);
            String l = EnvoiFacture.legende(organisme, numero, periode, net, bons, officine);
            String[] lignes = l.split("\n");
            assertTrue(lignes[0].startsWith("Facture " + numero), l);
            assertEquals(!organisme.isEmpty(), lignes[0].contains(" - " + organisme), l);
            assertTrue(l.contains("Nombre de bons : " + bons + "\n"), l);
            /* meme montant que le corps de l'email */
            assertTrue(l.contains("Montant net : " + EnvoiFacture.montant(net)), l);
            assertTrue(EnvoiFacture.corps(organisme, numero, periode, net, bons, officine)
                    .contains("Montant net : " + EnvoiFacture.montant(net)));
            assertEquals(!periode.isEmpty(), l.contains("Période : " + periode), l);
            assertEquals(!officine.isEmpty(), l.endsWith("\n" + officine), l);
            assertFalse(l.contains("null"), l);
            assertTrue(l.length() <= util.Constant.WHATSAPP_DISCUSSION_TEXTE_MAX, l);
            assertEquals(4 + (periode.isEmpty() ? 0 : 1) + (officine.isEmpty() ? 0 : 1) - 1, lignes.length, l);
        }
    }
}
