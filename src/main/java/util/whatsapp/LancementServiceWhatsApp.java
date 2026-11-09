package util.whatsapp;

import java.io.File;
import java.io.IOException;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.SocketException;
import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.Arrays;
import java.util.Comparator;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Retour du 25/10 : lancement du service compagnon WhatsApp Web par « Reconnecter » (administrateur). Seuls deux
 * lancements existent, sans aucune commande libre :
 * <ul>
 * <li>service Windows « prestige-whatsapp » installe (WinSW, outils/whatsapp-web/service-windows) : sc start ;</li>
 * <li>sinon, demarrer.bat du dossier du service en mode automatique (/auto : ni pause ni question), sans fenetre (plan
 * avoir du 08/11), journal dans journaux\demarrer.log ; hors Windows, demarrer.sh du meme dossier.</li>
 * </ul>
 * Le service Windows n'est demarre que s'il est celui du dossier indique (ou si aucun dossier n'est indique) : un autre
 * dossier, une instance d'essai par exemple, est lance par son propre script, sans toucher au service installe (retour
 * de Codex du 02/11, CAM-02). Le dossier doit etre celui du compagnon de Prestige : package.json «
 * prestige-whatsapp-web », src/serveur.js et le script de demarrage.
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

    /* package.json « prestige-whatsapp-web » et src/serveur.js (le script de demarrage est verifie au lancement) */
    private static boolean estService(File d) {
        return verifierDossier(d, "package.json") == null;
    }

    /**
     * Retour du 31/10 : « Parcourir » (administrateur). Sous-dossiers du chemin, tries, sans les fichiers ; sans
     * chemin, les lecteurs du serveur. Le dossier du service compagnon est signale.
     */
    public static JSONArray dossiers(String chemin) {
        File[] l = StringUtils.isBlank(chemin) ? File.listRoots()
                : new File(chemin.trim()).listFiles(f -> f.isDirectory() && !f.isHidden());
        JSONArray r = new JSONArray();
        if (l == null) {
            return r;
        }
        Arrays.sort(l, Comparator.comparing(f -> StringUtils.defaultIfEmpty(f.getName(), f.getPath()),
                String.CASE_INSENSITIVE_ORDER));
        for (int i = 0; i < l.length && i < 500; i++) {
            File f = l[i];
            r.put(new JSONObject().put("id", f.getAbsolutePath())
                    .put("text", StringUtils.defaultIfEmpty(f.getName(), f.getPath())).put("service", estService(f)));
        }
        return r;
    }

    private static final Pattern CHEMIN_SERVICE = Pattern.compile("BINARY_PATH_NAME\\s*:\\s*\"?([^\"\\r\\n]+?)\"?\\s*$",
            Pattern.MULTILINE);

    /**
     * Dossier du compagnon d'apres la configuration du service Windows (sortie de « sc qc ») : l'executable WinSW est
     * dans {@code <dossier>\service-windows}. Null si le chemin est absent.
     */
    static File dossierDuService(String sortieScQc) {
        Matcher m = CHEMIN_SERVICE.matcher(StringUtils.defaultString(sortieScQc));
        if (!m.find()) {
            return null;
        }
        File exe = new File(m.group(1).trim());
        File service = exe.getParentFile();
        return service == null ? null : service.getParentFile();
    }

    /** Dossier du service Windows installe, ou null s'il n'est pas installe. */
    private static File serviceWindowsInstalle() {
        try {
            Process p = new ProcessBuilder("sc.exe", "qc", SERVICE_WINDOWS).redirectErrorStream(true).start();
            String sortie = new String(p.getInputStream().readAllBytes(), StandardCharsets.ISO_8859_1);
            if (!p.waitFor(10, TimeUnit.SECONDS) || p.exitValue() != 0) {
                return null;
            }
            File d = dossierDuService(sortie);
            return d != null ? d : new File("");
        } catch (IOException e) {
            return null;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return null;
        }
    }

    /**
     * Vrai si le service Windows installe doit servir : aucun dossier indique, le dossier de ce service, ou un dossier
     * qui n'est pas celui du compagnon (plan avoir du 08/11 : la valeur par defaut C:\prestige\whatsapp-web peut n'etre
     * que le dossier des donnees du service Windows, ou ne pas exister). Un autre dossier du compagnon (une instance
     * d'essai) est lance par son propre script.
     */
    static boolean parLeServiceWindows(File installe, String dossier) {
        if (installe == null) {
            return false;
        }
        if (StringUtils.isBlank(dossier)) {
            return true;
        }
        File d = new File(dossier.trim());
        return memeDossier(installe, d) || !estService(d);
    }

    private static boolean memeDossier(File a, File b) {
        try {
            return a.getCanonicalPath().equalsIgnoreCase(b.getCanonicalPath());
        } catch (IOException e) {
            return a.getAbsolutePath().equalsIgnoreCase(b.getAbsolutePath());
        }
    }

    /** Message pour l'administrateur selon le code de sortie (null : le lancement est parti ou le service tourne). */
    static String resultat(boolean serviceWindows, int code) {
        if (code == 0 || (serviceWindows && code == 1056)) {
            /* 1056 : « une instance du service est deja en cours d'execution » */
            return null;
        }
        if (serviceWindows && code == 5) {
            return "Prestige n'a pas le droit de démarrer le service Windows « Prestige - WhatsApp » (code 5) : "
                    + "démarrez-le depuis les Services de Windows.";
        }
        return "Le démarrage du service WhatsApp Web a échoué (code " + code + ").";
    }

    /** Taille au-dela de laquelle le journal du lancement direct est mis de cote (demarrer.1.log). */
    static final long JOURNAL_MAX = 5L * 1024 * 1024;

    /** Journal du lancement direct : journaux\demarrer.log du dossier du service. */
    public static File journalDirect(File d) {
        return new File(new File(d, "journaux"), "demarrer.log");
    }

    /**
     * Cree le dossier des journaux ; un journal trop gros est garde sous demarrer.1.log (le precedent est remplace).
     */
    static void preparerJournal(File journal) {
        File dossier = journal.getParentFile();
        if (dossier != null && !dossier.isDirectory() && !dossier.mkdirs()) {
            return;
        }
        if (journal.length() > JOURNAL_MAX) {
            File ancien = new File(dossier, "demarrer.1.log");
            if (ancien.exists() && !ancien.delete()) {
                return;
            }
            journal.renameTo(ancien);
        }
    }

    /**
     * Commande du lancement direct (sans service Windows) : demarrer.bat du dossier, en mode automatique. Plan avoir du
     * 08/11, point 9 (« je ne veux pas que l'ecran noir reste affiche ») : plus de « start », qui ouvre toujours une
     * console, meme reduite. cmd est lance directement par Java, qui cree ses processus sans fenetre (CREATE_NO_WINDOW)
     * ; node et les commandes du script heritent de cette console invisible. La sortie va dans journaux\demarrer.log du
     * dossier, l'entree est vide (NUL) : ni pause ni question.
     */
    static ProcessBuilder commandeDirecte(File d, boolean windows) {
        String chemin = new File(d, windows ? "demarrer.bat" : "demarrer.sh").getAbsolutePath();
        ProcessBuilder pb = windows ? new ProcessBuilder("cmd.exe", "/c", chemin, "/auto")
                : new ProcessBuilder("sh", chemin, "--auto");
        pb.directory(d);
        pb.redirectErrorStream(true).redirectOutput(ProcessBuilder.Redirect.appendTo(journalDirect(d)))
                .redirectInput(ProcessBuilder.Redirect.from(new File(windows ? "NUL" : "/dev/null")));
        return pb;
    }

    /* ------------------------------------------------ configuration détaillée (plan avoir du 08/11, point 9) */

    private static final Pattern ETAT_SERVICE = Pattern.compile("STATE\\s*:\\s*\\d+\\s+([A-Z_]+)");
    private static final Pattern LOGPATH = Pattern.compile("<logpath>\\s*([^<]+?)\\s*</logpath>");

    /** Étapes du mode 1 (service Windows), d'après service-windows\LISEZMOI.txt. */
    static final String[] ETAPES_SERVICE = { "Installer Node.js 18 ou plus sur le serveur (https://nodejs.org).",
            "Copier WinSW 2.12 (WinSW-x64.exe) dans le dossier service-windows du service, renommé "
                    + "prestige-whatsapp.exe.",
            "Créer C:\\prestige\\whatsapp-web\\config.json à partir de config.exemple.json et y renseigner JETON, le "
                    + "même que le « Jeton partagé » de Prestige.",
            "Clic droit sur service-windows\\installer-service.bat > Exécuter en tant qu'administrateur : le service "
                    + "« Prestige - WhatsApp » démarre avec Windows, sans fenêtre.",
            "Dans Prestige, onglet « WhatsApp Web : connexion et règles » : scanner le QR code.",
            "Arrêt propre : service-windows\\arreter-service.bat (jamais par le Gestionnaire des tâches)." };

    /** Étapes du mode 2 (lancement direct par demarrer.bat). */
    static final String[] ETAPES_DIRECT = { "Installer Node.js 18 ou plus sur le serveur (https://nodejs.org).",
            "Dans le dossier du service, copier config.exemple.json en config.json et y renseigner JETON, le même "
                    + "que le « Jeton partagé » de Prestige.",
            "Indiquer ce dossier dans « Dossier du service » et enregistrer le compte Web.",
            "« Reconnecter » (bannière WhatsApp) démarre demarrer.bat sans fenêtre ; sa sortie va dans "
                    + "journaux\\demarrer.log du dossier. Un double-clic sur demarrer.bat l'ouvre au contraire dans une "
                    + "fenêtre.",
            "Dans Prestige, onglet « WhatsApp Web : connexion et règles » : scanner le QR code.",
            "Arrêt propre : arreter.bat du dossier." };

    /** État du service Windows d'après la sortie de « sc query » (RUNNING, STOPPED...), ou null. */
    static String etatServiceWindows(String sortieScQuery) {
        Matcher m = ETAT_SERVICE.matcher(StringUtils.defaultString(sortieScQuery));
        return m.find() ? m.group(1) : null;
    }

    /** Dossier des journaux du service Windows : logpath de service-windows\prestige-whatsapp.xml, sinon le défaut. */
    static String journauxService(File installe) {
        File xml = installe == null ? null : new File(new File(installe, "service-windows"), SERVICE_WINDOWS + ".xml");
        if (xml != null && xml.isFile()) {
            try {
                Matcher m = LOGPATH.matcher(new String(Files.readAllBytes(xml.toPath()), StandardCharsets.UTF_8));
                if (m.find()) {
                    return m.group(1);
                }
            } catch (IOException e) {
                /* illisible : le dossier par defaut */
            }
        }
        return WhatsAppCompte.DEFAUT_WEB_REPERTOIRE + File.separator + "journaux";
    }

    private static String scQuery() {
        try {
            Process p = new ProcessBuilder("sc.exe", "query", SERVICE_WINDOWS).redirectErrorStream(true).start();
            String sortie = new String(p.getInputStream().readAllBytes(), StandardCharsets.ISO_8859_1);
            return p.waitFor(10, TimeUnit.SECONDS) ? sortie : null;
        } catch (IOException e) {
            return null;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return null;
        }
    }

    /** Configuration détaillée du démarrage, pour le dossier enregistré dans le compte Web. Aucun jeton. */
    public static JSONObject configuration(String dossier) {
        boolean w = windows();
        File installe = w ? serviceWindowsInstalle() : null;
        return configuration(w, installe, installe == null ? null : etatServiceWindows(scQuery()), dossier);
    }

    /**
     * Mode 1 (service Windows) quand « Reconnecter » demarrerait le service installe, sinon mode 2 (lancement direct) :
     * meme regle que {@link #lancer(String)}.
     */
    static JSONObject configuration(boolean windows, File installe, String etatService, String dossier) {
        boolean parService = windows && parLeServiceWindows(installe, dossier);
        String d = StringUtils.trimToEmpty(dossier);
        String journaux = parService ? journauxService(installe)
                : d.isEmpty() ? "" : journalDirect(new File(d)).getPath();
        JSONObject service = new JSONObject().put("nom", SERVICE_WINDOWS).put("installe", installe != null)
                .put("dossier", installe == null || installe.getPath().isEmpty() ? "" : installe.getAbsolutePath())
                .put("etat", StringUtils.defaultString(etatService));
        return new JSONObject().put("mode", parService ? 1 : 2)
                .put("modeLibelle", parService ? "Par service Windows" : "Par lancement direct")
                .put("demarrage",
                        parService ? "sc start " + SERVICE_WINDOWS
                                : (d.isEmpty() ? "" : new File(d, windows ? "demarrer.bat" : "demarrer.sh").getPath()))
                .put("serviceWindows", service).put("dossier", d).put("journaux", journaux)
                .put("etapesService", new JSONArray(Arrays.asList(ETAPES_SERVICE)))
                .put("etapesDirect", new JSONArray(Arrays.asList(ETAPES_DIRECT)));
    }

    /** Lance le service ; rend null si le lancement est parti, sinon la raison (pour l'administrateur). */
    public static String lancer(String dossier) {
        boolean windows = windows();
        ProcessBuilder pb;
        boolean parService = windows && parLeServiceWindows(serviceWindowsInstalle(), dossier);
        if (parService) {
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
            /*
             * Retour du 25/10 : le script est designe par son chemin complet. Par son seul nom, cmd le cherche dans le
             * dossier courant, ce que Windows refuse quand NoDefaultCurrentDirectoryInExePath est pose dans
             * l'environnement de Payara : la fenetre s'ouvrait et se refermait sans rien lancer.
             */
            pb = commandeDirecte(d, windows);
            preparerJournal(journalDirect(d));
        }
        if (parService) {
            pb.redirectErrorStream(true).redirectOutput(ProcessBuilder.Redirect.DISCARD);
        }
        try {
            Process p = pb.start();
            /*
             * sc start rend la main tout de suite ; le lancement direct, lui, dure autant que le service : un echec
             * immediat (script absent, cmd refuse) est signale, sinon le lancement est parti.
             */
            if (p.waitFor(parService ? 15 : 3, TimeUnit.SECONDS)) {
                return resultat(parService, p.exitValue());
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
