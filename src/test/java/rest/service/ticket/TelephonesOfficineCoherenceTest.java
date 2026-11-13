package rest.service.ticket;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;
import util.TelephonesOfficine;

/**
 * Plan du 12/11, telephone de l'officine double apres enregistrement : coherence du decoupage de la saisie de l'ecran
 * en deux colonnes (str_PHONE, str_AUTRESPHONES), de la relecture dans l'ecran et du ticket de caisse. Des milliers de
 * saisies tirees au hasard (graine fixe) : 0 a 6 numeros de 8 a 10 chiffres, parfois avec des espaces internes,
 * doublons, separateurs « ; , / | » melanges, espaces autour, segments vides, separateur en tete ou en fin. Regles :
 * <ul>
 * <li>colonnes = premier numero + les suivants separes par « ; », sans separateur dans le premier, sans vide ;</li>
 * <li>aucun numero perdu, aucun doublon, ordre de saisie garde ;</li>
 * <li>relecture dans l'ecran = numeros separes par « ; » ; enregistrer la relecture ne change plus rien ;</li>
 * <li>ticket = memes numeros, dans le meme ordre ;</li>
 * <li>donnees deja abimees (meme saisie dans les deux colonnes) : relues sans doublon.</li>
 * </ul>
 */
class TelephonesOfficineCoherenceTest {

    private static final long GRAINE = 20261113L;
    private static final int CAS = 20000;
    private static final String[] SEPARATEURS = { ";", ",", "/", "|" };

    private static String numero(Random r) {
        int longueur = 8 + r.nextInt(3);
        StringBuilder b = new StringBuilder("0");
        for (int i = 1; i < longueur; i++) {
            b.append((char) ('0' + r.nextInt(10)));
        }
        if (r.nextInt(5) == 0) {
            // ecrit par paires : « 01 02 03 04 05 »
            return b.toString().replaceAll("(\\d\\d)(?=\\d)", "$1 ");
        }
        return b.toString();
    }

    private static String espaces(Random r) {
        return r.nextInt(3) == 0 ? " " : (r.nextInt(6) == 0 ? "  " : "");
    }

    @Test
    void laSaisieEstRangeeEtRelueSansDoublon() {
        Random r = new Random(GRAINE);
        for (int t = 0; t < CAS; t++) {
            int n = r.nextInt(7);
            List<String> attendus = new ArrayList<>();
            List<String> saisis = new ArrayList<>();
            for (int i = 0; i < n; i++) {
                String num = !saisis.isEmpty() && r.nextInt(4) == 0 ? saisis.get(r.nextInt(saisis.size())) : numero(r);
                saisis.add(num);
                if (!attendus.contains(num)) {
                    attendus.add(num);
                }
            }
            StringBuilder saisie = new StringBuilder();
            if (r.nextInt(10) == 0) {
                saisie.append(SEPARATEURS[r.nextInt(4)]);
            }
            for (int i = 0; i < saisis.size(); i++) {
                if (i > 0) {
                    saisie.append(espaces(r)).append(SEPARATEURS[r.nextInt(4)]).append(espaces(r));
                    if (r.nextInt(10) == 0) {
                        saisie.append(SEPARATEURS[r.nextInt(4)]);
                    }
                }
                saisie.append(saisis.get(i));
            }
            if (r.nextInt(8) == 0) {
                saisie.append(SEPARATEURS[r.nextInt(4)]);
            }
            String s = saisie.toString();
            String cas = "cas " + t + " « " + s + " »";

            String[] colonnes = TelephonesOfficine.decouper(s);
            assertEquals(2, colonnes.length, cas);
            List<String> relus = new ArrayList<>();
            if (!colonnes[0].isEmpty()) {
                relus.add(colonnes[0]);
            }
            assertFalse(colonnes[0].matches(".*[;/,|].*"), cas + " : separateur dans le premier numero");
            if (!colonnes[1].isEmpty()) {
                for (String x : colonnes[1].split(";")) {
                    assertFalse(x.isEmpty(), cas + " : numero vide");
                    relus.add(x);
                }
            }
            assertEquals(attendus, relus, cas + " : numeros ranges en base");
            if (attendus.isEmpty()) {
                assertArrayEquals(new String[] { "", "" }, colonnes, cas);
            }

            String affiche = TelephonesOfficine.affiche(colonnes[0], colonnes[1]);
            assertEquals(String.join(";", attendus), affiche, cas + " : relecture dans l'ecran");
            assertArrayEquals(colonnes, TelephonesOfficine.decouper(affiche), cas + " : reenregistrement sans effet");
            assertEquals(String.join(" · ", attendus), ConversionTicket.telephones(colonnes[0], colonnes[1]),
                    cas + " : ticket");

            // donnees abimees par l'ancien enregistrement : la saisie entiere dans les deux colonnes
            String trim = s.trim();
            assertEquals(String.join(";", attendus), TelephonesOfficine.affiche(trim, trim),
                    cas + " : donnees abimees");
        }
    }

    @Test
    void casDuPlan() {
        assertArrayEquals(new String[] { "0102030405", "0404040506" },
                TelephonesOfficine.decouper("0102030405;0404040506"));
        assertArrayEquals(new String[] { "0102030405", "0404040506" },
                TelephonesOfficine.decouper("0102030405,0404040506"));
        assertArrayEquals(new String[] { "0102030405", "" }, TelephonesOfficine.decouper("0102030405"));
        assertArrayEquals(new String[] { "", "" }, TelephonesOfficine.decouper(""));
        assertArrayEquals(new String[] { "", "" }, TelephonesOfficine.decouper(null));
        assertEquals("0102030405;0404040506",
                TelephonesOfficine.affiche("0102030405,0404040506", "0102030405,0404040506"));
        assertEquals("0102030405", TelephonesOfficine.affiche("0102030405", "0102030405"));
        assertEquals("", TelephonesOfficine.affiche(null, null));
    }
}
