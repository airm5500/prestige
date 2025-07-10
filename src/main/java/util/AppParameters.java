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
    public String applicationId = "MT7XwvGX6qGAPdfQ";
    public String clientId = "fJaOlJgwU2ggcRWmIlbU9s7jY8tbsRy8";
    public String clientSecret = "UgTURjiCK1rZtsnA";
    public String header = "Basic ZkphT2xKZ3dVMmdnY1JXbUlsYlU5czdqWTh0YnNSeTg6VWdUVVJqaUNLMXJadHNuQQ==";
    public String email = "dici.servtech@gmail.com";
    public String password = "dici@2020";
    public String pathsmsapitokenendpoint = "https://api.orange.com/oauth/v2/token";
    public String pathsmsapisendmessageurl = "https://api.orange.com/smsmessaging/v1/outbound/tel%3A%2B225000000/requests";
    public String senderAddress = "tel:+225000000";
    public String accesstoken = "kqJ1LJkaFgeBCzsy2NCeiKPF95Mb", expiresin = "7776000";
    public String mobile = "", smtpHost = "smtp.gmail.com", protocol = "smtps";
    public String mailOfficine = "";

    public String pathWindow = System.getProperty("user.home") + File.separator + "Documents" + File.separator
            + "dicisms.properties";
    public String pathUnix = System.getProperty("user.home") + File.separator + "Home" + File.separator
            + "dicisms.properties";
    String Os = System.getProperty("os.name");
    Pattern pattern = Pattern.compile("Windows");

    Matcher m = pattern.matcher(Os);
    String path = (m.find() ? pathWindow : pathUnix);

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
            System.out.println("fnePkey  " + fnePkey0);
            String fneUrl0 = prop.getProperty("fneUrl");

            if (StringUtils.isNotEmpty(fneUrl0)) {
                fneUrl = fneUrl0;
            }
            System.out.println("fneUrl  " + fneUrl);
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

    public static AppParameters getInstance() {
        if (instance == null) {
            instance = new AppParameters();

        }
        return instance;
    }
}
