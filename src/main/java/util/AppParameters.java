/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package util;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.FileSystems;
import java.nio.file.Files;
import java.util.Properties;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.apache.commons.lang3.StringUtils;

/**
 *
 * @author koben
 */
public final class AppParameters {

    private static final Logger LOG = Logger.getLogger(AppParameters.class.getName());
    private static AppParameters instance;
    // identifiants de l'API SMS Orange : seulement dans dicisms.properties ou la fiche du fournisseur SMS, jamais
    // dans le code ni dans Git (retour du 23/10)
    public String applicationId = "";
    public String clientId = "";
    public String clientSecret = "";
    public String header = "";
    // compte expediteur des mails : seulement dans le fichier de configuration (cles email et password), jamais
    // dans le code ni dans Git
    public String email = "";
    public String password = "";
    public String pathsmsapitokenendpoint = util.sms.SmsProviderCatalog.ORANGE_TOKEN_ENDPOINT_DEFAUT;
    public String pathsmsapisendmessageurl = util.sms.SmsProviderCatalog.ORANGE_SEND_URL_DEFAUT;
    public String senderAddress = util.sms.SmsProviderCatalog.ORANGE_SENDER_ADDRESS_DEFAUT;
    // Consultation solde / contrats / statistiques (API Orange SMS admin).
    public String pathsmsapiadminbaseurl = util.sms.SmsProviderCatalog.ORANGE_ADMIN_BASE_URL_DEFAUT;
    // Souscription aux Delivery Receipts (DR).
    public String pathsmsapisubscriptionurl = util.sms.SmsProviderCatalog.ORANGE_SUBSCRIPTION_URL_DEFAUT;
    // URL publique du callback DR de Prestige (à renseigner pour activer les DR).
    public String smsdrcallbackurl = "";
    public String accesstoken = "", expiresin = "7776000";
    public String mobile = "", smtpHost = "smtp.gmail.com", protocol = "smtps";
    public String mailOfficine = "";

    public String pathWindow = System.getProperty("user.home") + File.separator + "Documents" + File.separator
            + "dicisms.properties";
    public String pathUnix = System.getProperty("user.home") + File.separator + "Home" + File.separator
            + "dicisms.properties";
    String Os = System.getProperty("os.name");
    Pattern pattern = Pattern.compile("Windows");

    Matcher m = pattern.matcher(Os);
    // Emplacement historique s'il existe deja (aucune regression sur les installations en place),
    // sinon le fichier de configuration sur le disque de donnees (D: puis F: puis E:), accessible
    // en ecriture par le compte de service Windows.
    String path = resoudreCheminConfig(m.find() ? pathWindow : pathUnix);

    private static String resoudreCheminConfig(String cheminHistorique) {
        if (new File(cheminHistorique).exists()) {
            return cheminHistorique;
        }
        // Meme regle, tenue en UN seul endroit : les autres fichiers de configuration du poste (posos.properties)
        // se rangent dans ce meme dossier, plutot que chacun dans le sien.
        return StockageDisque.fichierConfiguration("dicisms.properties").toString();
    }

    public String fneUrl;
    public String fnePkey;
    public String fnepointOfSale;

    public String pharmaMlDir;

    private AppParameters() {
        Properties prop = new Properties();

        try (InputStream in = Files.newInputStream(FileSystems.getDefault().getPath(path))) {
            prop.load(in);

            applicationId = prop.getProperty("applicationId");
            mobile = prop.getProperty("mobile");
            clientId = prop.getProperty("clientId");
            clientSecret = prop.getProperty("clientSecret");
            header = prop.getProperty("header");
            pathsmsapitokenendpoint = prop.getProperty("pathsmsapitokenendpoint");
            pathsmsapisendmessageurl = prop.getProperty("pathsmsapisendmessageurl");
            senderAddress = prop.getProperty("senderAddress");
            String adminBase = prop.getProperty("pathsmsapiadminbaseurl");
            if (StringUtils.isNotEmpty(adminBase)) {
                pathsmsapiadminbaseurl = adminBase;
            }
            String subscriptionUrl = prop.getProperty("pathsmsapisubscriptionurl");
            if (StringUtils.isNotEmpty(subscriptionUrl)) {
                pathsmsapisubscriptionurl = subscriptionUrl;
            }
            String drCallback = prop.getProperty("smsdrcallbackurl");
            if (StringUtils.isNotEmpty(drCallback)) {
                smsdrcallbackurl = drCallback;
            }
            accesstoken = prop.getProperty("accesstoken");
            expiresin = prop.getProperty("expiresin");
            email = prop.getProperty("email");
            mailOfficine = prop.getProperty("usermail");
            String password0 = prop.getProperty("password");
            if (StringUtils.isNotEmpty(password0)) {
                password = password0;
            }
            String smtphost0 = prop.getProperty("smtphost");
            if (StringUtils.isNotEmpty(smtphost0)) {
                smtpHost = smtphost0;
            }
            String pro = prop.getProperty("protocol");
            if (StringUtils.isNotEmpty(pro)) {
                protocol = pro;
            }
            String fnePkey0 = prop.getProperty("fnePkey");

            if (StringUtils.isNotEmpty(fnePkey0)) {
                fnePkey = fnePkey0;
            }

            String fneUrl0 = prop.getProperty("fneUrl");

            if (StringUtils.isNotEmpty(fneUrl0)) {
                fneUrl = fneUrl0;
            }

            String fnepointOfSale0 = prop.getProperty("fnepointOfSale");

            if (StringUtils.isNotEmpty(fnepointOfSale0)) {
                fnepointOfSale = fnepointOfSale0;
            }
            pharmaMlDir = prop.getProperty("pharmaMlDir");
        } catch (IOException e) {
            createFile(prop, path);

        }

    }

    private void createFile(Properties prop, String propFileName) {
        try {
            prop.setProperty("applicationId", applicationId);
            prop.setProperty("clientId", clientId);
            prop.setProperty("clientSecret", clientSecret);
            prop.setProperty("header", header);
            prop.setProperty("email", email);
            prop.setProperty("pathsmsapitokenendpoint", pathsmsapitokenendpoint);
            prop.setProperty("pathsmsapisendmessageurl", pathsmsapisendmessageurl);
            prop.setProperty("senderAddress", senderAddress);
            prop.setProperty("pathsmsapiadminbaseurl", pathsmsapiadminbaseurl);
            prop.setProperty("pathsmsapisubscriptionurl", pathsmsapisubscriptionurl);
            prop.setProperty("smsdrcallbackurl", smsdrcallbackurl);
            prop.setProperty("expiresin", expiresin);
            prop.setProperty("accesstoken", accesstoken);
            prop.setProperty("mobile", mobile);
            prop.setProperty("password", password);
            prop.setProperty("protocol", protocol);
            prop.setProperty("smtphost", smtpHost);
            prop.setProperty("usermail", mailOfficine);

            prop.store(new FileOutputStream(propFileName), "Fichier de configuartion notification sms , mail");
        } catch (IOException e) {
            LOG.log(Level.SEVERE, "", e);
        }

    }

    /** Adresse et mot de passe de l'expediteur des mails tous deux renseignes. */
    public static boolean expediteurConfigure(String email, String password) {
        return StringUtils.isNoneBlank(email, password);
    }

    public boolean expediteurConfigure() {
        return expediteurConfigure(email, password);
    }

    public static AppParameters getInstance() {
        if (instance == null) {
            instance = new AppParameters();

        }
        return instance;
    }
}
