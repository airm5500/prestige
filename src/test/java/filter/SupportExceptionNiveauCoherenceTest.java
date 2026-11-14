package filter;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.io.EOFException;
import java.io.IOException;
import java.sql.SQLException;
import java.util.Random;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Rapport d'exploitation du 13/11, point 10 : un envoi de mesures (support/rum) coupe par le poste pendant la lecture
 * de la requete (EOFException de Grizzly) etait classe ERROR au Centre de support.
 * <p>
 * Test de COHERENCE sur 3 000 exceptions tirees au hasard (graine fixe), enveloppees de 0 a 4 fois (EJBException,
 * RuntimeException, ProcessingException...). Regles : connexion coupee par le poste => INFO ; erreur de la JVM => FATAL
 * ; tout le reste => ERROR, y compris une fin de fichier LOCAL (EOFException hors Grizzly) ou une IOException « disque
 * plein ».
 * </p>
 */
class SupportExceptionNiveauCoherenceTest {

    /** EOFException levee par la lecture reseau de Grizzly, comme sur la caisse 4 le 13/11 */
    private static EOFException eofGrizzly() {
        EOFException e = new EOFException();
        e.setStackTrace(new StackTraceElement[] {
                new StackTraceElement("org.glassfish.grizzly.nio.transport.TCPNIOTransport", "read",
                        "TCPNIOTransport.java", 595),
                new StackTraceElement("org.glassfish.grizzly.AbstractReader", "read", "AbstractReader.java", 48) });
        return e;
    }

    private static EOFException eofFichier() {
        EOFException e = new EOFException("Unexpected end of ZLIB input stream");
        e.setStackTrace(new StackTraceElement[] {
                new StackTraceElement("java.util.zip.InflaterInputStream", "fill", "InflaterInputStream.java", 244) });
        return e;
    }

    /** classe nommee comme celle de Catalina/Grizzly, sans en dependre */
    static final class ClientAbortException extends IOException {
        private static final long serialVersionUID = 1L;

        ClientAbortException() {
            super("java.io.IOException: An established connection was aborted");
        }
    }

    private static Throwable envelopper(Throwable t, Random r) {
        int n = r.nextInt(5);
        for (int i = 0; i < n; i++) {
            switch (r.nextInt(3)) {
            case 0:
                t = new javax.ejb.EJBException(new Exception(t));
                break;
            case 1:
                t = new RuntimeException("enveloppe", t);
                break;
            default:
                t = new javax.ws.rs.ProcessingException(t);
            }
        }
        return t;
    }

    @Test
    @DisplayName("3 000 exceptions : INFO pour une connexion coupee par le poste, ERROR ou FATAL sinon")
    void classement() {
        Random r = new Random(20261113L);
        for (int i = 0; i < 3000; i++) {
            int cas = r.nextInt(9);
            Throwable racine;
            String attendu;
            switch (cas) {
            case 0:
                racine = eofGrizzly();
                attendu = "INFO";
                break;
            case 1:
                racine = new IOException(r.nextBoolean() ? "Connection reset by peer" : "Broken pipe");
                attendu = "INFO";
                break;
            case 2:
                racine = new ClientAbortException();
                attendu = "INFO";
                break;
            case 3:
                racine = eofFichier();
                attendu = "ERROR";
                break;
            case 4:
                racine = new IOException("No space left on device");
                attendu = "ERROR";
                break;
            case 5:
                racine = new SQLException("Communications link failure");
                attendu = "ERROR";
                break;
            case 6:
                racine = new NullPointerException();
                attendu = "ERROR";
                break;
            case 7:
                racine = new OutOfMemoryError("Java heap space");
                attendu = "FATAL";
                break;
            default:
                racine = new IllegalStateException("x" + r.nextInt(1000));
                attendu = "ERROR";
            }
            Throwable t = envelopper(racine, r);
            assertEquals(attendu, SupportExceptionMapper.niveau(t), "cas " + i + " : " + racine);
            assertEquals("INFO".equals(attendu), SupportExceptionMapper.envoiInterrompu(t),
                    "cas " + i + " : " + racine);
        }
    }

    @Test
    @DisplayName("La trace du 13/11 (caisse 4, support/rum) est classee INFO")
    void traceDu13() {
        assertEquals("INFO", SupportExceptionMapper.niveau(eofGrizzly()));
    }
}
