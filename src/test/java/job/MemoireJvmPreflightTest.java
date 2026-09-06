package job;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

/**
 * Memoire maximale de la JVM au demarrage : une installation laissee au defaut de Payara (512 Mo) tient la matinee et
 * lache en fin de journee, sur une edition ou une statistique. L'auto-diagnostic doit le dire avant la panne.
 */
class MemoireJvmPreflightTest {

    private static long mo(long valeur) {
        return valeur * 1024L * 1024L;
    }

    @Test
    void memoireLaisseeAuDefautDInstallationEstSignaleeAvecLaCorrection() {
        // 512 Mo demandes a la JVM : Runtime.maxMemory() en rend un peu moins.
        SupportPreflight.Controle c = SupportPreflight.evaluerMemoireMax(mo(494), null);
        assertFalse(c.ok, c.detail);
        assertTrue(c.detail.contains("494 Mo"), c.detail);
        assertTrue(c.detail.contains("create-jvm-options -Xmx2048m"), c.detail);
    }

    @Test
    void memoireSuffisanteNeProduitAucuneAnomalie() {
        assertTrue(SupportPreflight.evaluerMemoireMax(mo(2048), null).ok);
        assertTrue(SupportPreflight.evaluerMemoireMax(mo(SupportPreflight.HEAP_MIN_MO_DEFAUT), null).ok);
    }

    @Test
    void leSeuilResteReglablePourUnPosteVolontairementModeste() {
        assertTrue(SupportPreflight.evaluerMemoireMax(mo(1024), "1024").ok);
        assertFalse(SupportPreflight.evaluerMemoireMax(mo(1024), "2048").ok);
        // Seuil illisible : la valeur par defaut s'applique, sans exception.
        assertFalse(SupportPreflight.evaluerMemoireMax(mo(512), "beaucoup").ok);
    }

    @Test
    void jvmQuiNeCommuniquePasSaLimiteNeDeclenchePasDAlerte() {
        assertTrue(SupportPreflight.evaluerMemoireMax(0L, null).ok);
        assertTrue(SupportPreflight.evaluerMemoireMax(Long.MAX_VALUE, null).ok);
    }
}
