package util.whatsapp;

import java.io.File;
import java.io.IOException;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.SocketException;
import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.concurrent.TimeUnit;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Retour du 25/10 : lancement du service compagnon WhatsApp Web par « Reconnecter » (administrateur). Seuls deux
 * lancements existent, sans aucune commande libre :
 * <ul>
 * <li>service Windows « prestige-whatsapp » installe (WinSW, outils/whatsapp-web/service-windows) : sc start ;</li>
 * <li>sinon, demarrer.bat du dossier du service en mode automatique (/auto : ni pause ni question), dans une fenetre a
 * part ; hors Windows, demarrer.sh du meme dossier.</li>
 * </ul>
 * Le dossier doit etre celui du compagnon de Prestige : package.json « prestige-whatsapp-web », src/serveur.js et le
 * script de demarrage.
 */
public final class LancementServiceWhatsApp {

    static final String SERVICE_WINDOWS = "prestige-whatsapp";
    static final String PAQUET = "prestige-whatsapp-web";

    private LancementServiceWhatsApp() {
    }

    static boolean windows() {
        return System.getProperty("os.name", "").toLowerCase().contains("win");
    }

    /** Vrai si l'hote designe cette machine (boucle locale ou une de ses adresses). */
    public static boolean estLocal(String hote) {
        if (StringUtils.isBlank(hote)) {
            return false;
        }
        try {
            InetAddress a = InetAddress.getByName(hote.replace("[", "").replace("]", ""));
            return a.isLoopbackAddress() || a.isAnyLocalAddress() || NetworkInterface.getByInetAddress(a) != null;
        } catch (UnknownHostException | SocketException e) {
            return false;
        }
    }

    /** Raison du refus, ou null si le dossier est bien celui du service compagnon (avec son script de demarrage). */
    static String verifierDossier(File d, String script) {
        if (!d.isDirectory()) {
            return "Dossier du service WhatsApp Web introuvable sur le serveur : " + d.getPath() + ".";
        }
        File paquet = new File(d, "package.json");
        String nom = null;
        try {
            nom = paquet.isFile()
                    ? new JSONObject(new String(Files.readAllBytes(paquet.toPath()), StandardCharsets.UTF_8))
                            .optString("name", null)
                    : null;
        } catch (IOException | JSONException e) {
            nom = null;
        }
        if (!PAQUET.equals(nom) || !new File(d, "src" + File.separator + "serveur.js").isFile()
                || !new File(d, script).isFile()) {
            return "Ce dossier n'est pas celui du service WhatsApp Web de Prestige (package.json, src\\serveur.js et "
                    + script + " attendus) : " + d.getPath() + ".";
        }
        return null;
    }

    private static boolean serviceWindowsInstalle() {
        try {
            Process p = new ProcessBuilder("sc.exe", "query", SERVICE_WINDOWS).redirectErrorStream(true)
                    .redirectOutput(ProcessBuilder.Redirect.DISCARD).start();
            return p.waitFor(10, TimeUnit.SECONDS) && p.exitValue() == 0;
        } catch (IOException e) {
            return false;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        }
    }

    /** Lance le service ; rend null si le lancement est parti, sinon la raison (pour l'administrateur). */
    public static String lancer(String dossier) {
        boolean windows = windows();
        ProcessBuilder pb;
        if (windows && serviceWindowsInstalle()) {
            pb = new ProcessBuilder("sc.exe", "start", SERVICE_WINDOWS);
        } else {
            if (StringUtils.isBlank(dossier)) {
                return "Dossier du service WhatsApp Web inconnu : indiquez-le dans Comptes WhatsApp (onglet WhatsApp Web).";
            }
            File d = new File(dossier.trim());
            String script = windows ? "demarrer.bat" : "demarrer.sh";
            String refus = verifierDossier(d, script);
            if (refus != null) {
                return refus;
            }
            pb = windows ? new ProcessBuilder("cmd.exe", "/c", "start", "Service WhatsApp Web - Prestige", "/min",
                    "cmd.exe", "/c", script, "/auto") : new ProcessBuilder("sh", script, "--auto");
            pb.directory(d);
        }
        pb.redirectErrorStream(true).redirectOutput(ProcessBuilder.Redirect.DISCARD);
        try {
            Process p = pb.start();
            /* sc start et « start » rendent la main tout de suite ; un echec immediat est signale */
            if (p.waitFor(15, TimeUnit.SECONDS) && p.exitValue() != 0) {
                return "Le démarrage du service WhatsApp Web a échoué (code " + p.exitValue() + ").";
            }
            return null;
        } catch (IOException e) {
            return "Le démarrage du service WhatsApp Web a échoué : " + e.getMessage();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return "Démarrage interrompu.";
        }
    }
}
