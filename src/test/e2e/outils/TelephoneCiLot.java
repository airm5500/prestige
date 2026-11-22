import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;

/**
 * Reference Java des tests de scripts SQL sur les numeros (plan du 21/11, point 7) : lit une saisie par ligne, en
 * hexadecimal UTF-8 (pour garder espaces, tabulations et retours a la ligne), et ecrit le numero local a dix chiffres
 * retenu par l'ecran (TelephoneCi.controler apres le zero de tete retabli), ou « - » s'il n'est pas conforme.
 *
 * Lancement : java -cp target/classes src/test/e2e/outils/TelephoneCiLot.java &lt; saisies
 */
public class TelephoneCiLot {

    public static void main(String[] args) throws Exception {
        Class<?> saisie = Class.forName("rest.service.impl.ClientStandardSaisie");
        Method retablir = saisie.getDeclaredMethod("retablirZeroDeTete", String.class);
        retablir.setAccessible(true);
        BufferedReader in = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8));
        StringBuilder sortie = new StringBuilder();
        for (String l = in.readLine(); l != null; l = in.readLine()) {
            String x = new String(hex(l.trim()), StandardCharsets.UTF_8);
            util.TelephoneCi.Resultat r = util.TelephoneCi.controler((String) retablir.invoke(null, x));
            sortie.append(r.isValide() ? r.getLocal() : "-").append('\n');
        }
        System.out.print(sortie);
    }

    private static byte[] hex(String h) {
        byte[] b = new byte[h.length() / 2];
        for (int i = 0; i < b.length; i++) {
            b[i] = (byte) Integer.parseInt(h.substring(2 * i, 2 * i + 2), 16);
        }
        return b;
    }
}
