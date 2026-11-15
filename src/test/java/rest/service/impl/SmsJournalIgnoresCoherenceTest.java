package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.logging.Handler;
import java.util.logging.Level;
import java.util.logging.LogRecord;
import java.util.logging.Logger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Exploitation du 14/11, S5 : 551 lignes « Envoi SMS ignore » dans le journal d'appaul, une par SMS pendant la
 * suspension des envois (forfait Orange expire).
 * <p>
 * COHERENCE sur 300 pannes tirees au hasard (graine fixe) : 1 a 400 envois ignores, espaces de 0 a 10 min, panne de
 * quelques secondes a plus de 24 h, suspension renouvelee toutes les heures par un envoi d'essai refuse, puis un envoi
 * accepte. Le chemin est le vrai : {@code SmsImpl.envoisSuspendus} avec le vrai coupe-circuit, horloge simulee, et les
 * lignes ecrites par le journal de SmsImpl sont relevees. Regles : pendant la panne, au plus une ligne a son debut et
 * une par heure entamee ; a la reprise, exactement une ligne de bilan qui donne le nombre exact d'envois ignores ; hors
 * panne, aucune ligne ; le bilan d'une panne ne compte jamais les envois d'une autre.
 * </p>
 */
class SmsJournalIgnoresCoherenceTest {

    /** Horloge que le test fait avancer. */
    static final class HorlogeReglable extends Clock {
        Instant maintenant = LocalDateTime.of(2026, 11, 14, 7, 0).toInstant(ZoneOffset.UTC);

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return maintenant;
        }

        void avancer(long secondes) {
            maintenant = maintenant.plusSeconds(secondes);
        }
    }

    private final List<LogRecord> lignes = new ArrayList<>();
    private final Logger journal = Logger.getLogger(SmsImpl.class.getName());
    private final Handler capteur = new Handler() {
        @Override
        public void publish(LogRecord r) {
            if (r.getLevel().intValue() >= Level.INFO.intValue()) {
                lignes.add(r);
            }
        }

        @Override
        public void flush() {
        }

        @Override
        public void close() {
        }
    };
    private boolean parentAvant;

    @BeforeEach
    void capter() {
        parentAvant = journal.getUseParentHandlers();
        journal.setUseParentHandlers(false);
        journal.addHandler(capteur);
    }

    @AfterEach
    void rendre() {
        journal.removeHandler(capteur);
        journal.setUseParentHandlers(parentAvant);
    }

    private static boolean envoisSuspendus(SmsImpl sms) throws Exception {
        Method m = SmsImpl.class.getDeclaredMethod("envoisSuspendus");
        m.setAccessible(true);
        return (Boolean) m.invoke(sms);
    }

    private static String texte(LogRecord r) {
        return r.getParameters() == null ? r.getMessage()
                : java.text.MessageFormat.format(r.getMessage(), r.getParameters());
    }

    @Test
    @DisplayName("Envois ignores : une ligne au debut, une par heure, un bilan exact a la reprise")
    void regroupement() throws Exception {
        Random hasard = new Random(20261115L);
        Pattern nombre = Pattern.compile("(\\d+) envoi\\(s\\) SMS ignore\\(s\\)");
        for (int panne = 0; panne < 300; panne++) {
            HorlogeReglable h = new HorlogeReglable();
            h.avancer(hasard.nextInt(86400));
            SmsCoupeCircuit circuit = new SmsCoupeCircuit(h);
            SmsImpl sms = new SmsImpl();
            Field f = SmsImpl.class.getDeclaredField("coupeCircuit");
            f.setAccessible(true);
            f.set(sms, circuit);

            // hors panne : aucune ligne
            lignes.clear();
            assertTrue(!envoisSuspendus(sms));
            assertEquals(0, lignes.size(), "hors panne");

            // la panne commence : 3 refus de configuration
            for (int i = 0; i < SmsCoupeCircuit.SEUIL; i++) {
                circuit.enregistrerRefus("POL0001", "Expired contract");
            }
            Instant debut = h.maintenant;
            int envois = 1 + hasard.nextInt(400);
            int ecart = hasard.nextInt(601);
            int ignores = 0;
            lignes.clear();
            for (int i = 0; i < envois; i++) {
                if (!circuit.suspendu()) {
                    // reprise horaire : l'envoi d'essai est refuse, la suspension repart
                    circuit.enregistrerRefus("POL0001", "Expired contract");
                }
                if (envoisSuspendus(sms)) {
                    ignores++;
                }
                h.avancer(hasard.nextInt(ecart + 1));
            }
            long heures = (h.maintenant.getEpochSecond() - debut.getEpochSecond()) / 3600 + 1;
            int pendant = lignes.size();
            assertTrue(pendant >= 1 && pendant <= 1 + heures, "panne " + panne + " : " + pendant + " ligne(s) pour "
                    + ignores + " envoi(s) ignore(s) en " + heures + " heure(s) entamee(s)");

            // reprise : un envoi accepte, puis l'envoi suivant n'est plus suspendu
            circuit.enregistrerSucces();
            lignes.clear();
            assertTrue(!envoisSuspendus(sms));
            assertEquals(1, lignes.size(), "panne " + panne + " : une ligne de bilan a la reprise");
            Matcher m = nombre.matcher(texte(lignes.get(0)));
            assertTrue(m.find(), texte(lignes.get(0)));
            assertEquals(ignores, Integer.parseInt(m.group(1)),
                    "panne " + panne + " : nombre d'envois ignores du bilan");

            // apres la reprise : plus rien, et une nouvelle panne repart de zero
            lignes.clear();
            assertTrue(!envoisSuspendus(sms));
            assertEquals(0, lignes.size(), "apres le bilan");
        }
    }
}
