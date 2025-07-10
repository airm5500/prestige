/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package util;

import com.ibm.icu.text.RuleBasedNumberFormat;
import com.itextpdf.text.pdf.Barcode128;
import dal.TFamille;
import dal.TPreenregistrementDetail;
import dal.TPrivilege;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.text.DateFormat;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.imageio.ImageIO;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONObject;
import org.krysalis.barcode4j.HumanReadablePlacement;
import org.krysalis.barcode4j.impl.AbstractBarcodeBean;
import org.krysalis.barcode4j.impl.code128.Code128Bean;
import org.krysalis.barcode4j.output.bitmap.BitmapCanvasProvider;
import toolkits.utils.jdom;

/**
 *
 * @author Kobena
 */
public final class DateConverter {

    private static final Logger LOG = Logger.getLogger(DateConverter.class.getName());
    public static final String ACTIONDELETEINVOICE = "03092017";
    public static final String ACTIONDELETERETOUR = "030920171";
    public static final String ACTION_DELETE_RETOUR = "ACTION_DELETE_RETOUR";
    public static final String ACTIONDELETEAJUSTEMENT = "030920172";
    public static final String ACTIONDELETE = "06042016";
    public static final String DEPOT_EXTENSION = "5";
    public static final String DEPOT_AGREE = "4";
    public static final String ENTREE_EN_STOCK = "01";
    public static final String VENTE = "02";
    public static final String ANNULATION_DE_VENTE = "03";
    public static final String INVENTAIRE = "04";
    public static final String DECONDTIONNEMENT_POSITIF = "05";
    public static final String DECONDTIONNEMENT_NEGATIF = "06";
    public static final String AJUSTEMENT_NEGATIF = "07";
    public static final String AJUSTEMENT_POSITIF = "08";
    public static final String RETOUR_FOURNISSEUR = "09";
    public static final String NOUVEAU_PRODUIT = "10";
    public static final String TMVTP_VENTE_DEPOT_EXTENSION = "12";
    public static final String TMVTP_ANNUL_VENTE_DEPOT_EXTENSION = "14";
    public static final String TMVTP_RETOUR_DEPOT = "13";
    public static final String PERIME = "11";
    public static final String MODE_ESP = "1";
    public static final String OFFICINE = "1";
    public static final String VENTE_COMPTANT = "VNO";
    public static final String VENTE_ASSURANCE = "VO";
    public static final String STATUT_IS_CLOSED = "is_Closed";
    public static final String STATUT_FACTURE_UNPAID = "unpaid";
    public static final String STATUT_ENABLE = "enable";
    public static final String STATUT_RUPTURE = "RUPTURE";
    public static final String STATUT_DELETE = "delete";
    public static final String STATUT_DISABLE = "disable";
    public static final String OTHER = "OTHER";
    public static final String STATUT_IS_IN_USE = "is_Using";
    public static final String STATUT_IS_ASSIGN = "is_assign";
    public static final String STATUT_IS_WAITING_VALIDATION = "is_Waiting_validation";
    public static final String LABOREXCI = "LABOREX-CI";
    public static final String COPHARMED = "COPHARMED";
    public static final String TEDIS = "TEDIS PHAR.";
    public static final String AUTRES = "AUTRES";
    public static final String DPCI = "DPCI";
    public static final String MODE_CHEQUE = "2";
    public static final String MODE_VIREMENT = "6";
    public static final String MODE_CB = "3";
    public static final String MODE_DEVISE = "5";
    public static final String MODE_DIFF = "5";
    public static final String CODE_TVA = "2";
    public static final String CODE_TVA0 = "1";
    public static final String MVT_ENTREE_CAISSE = "5";
    public static final String MVT_SORTIE_CAISSE = "4";
    public static final String MVT_FOND_CAISSE = "1";
    public static final String MVT_REGLE_TP = "3";
    public static final String MVT_REGLE_DIFF = "2";
    public static final String MVT_REGLE_VO = "8";
    public static final String MVT_REGLE_VNO = "9";
    public static final String KEY_ACTIVATE_PEREMPTION_DATE = "KEY_ACTIVATE_PEREMPTION_DATE";
    public static final String DEFAUL_TYPEETIQUETTE = "2";
    public static final String ACTION_ENTREE_STOCK = "ENTREESTOCK";
    public static final String TYPE_ACTION_ADD = "ADD";
    public static final String TYPE_ACTION_VENTE = "VENTE";
    public static final String TYPE_ACTION_REMOVE = "REMOVE";
    public static final String TRANSACTION_DEBIT = "D";
    public static final String TRANSACTION_CREDIT = "C";
    public static final String CA_TTC = "CA TTC";
    public static final String CA_HT = "CA HT";
    public static final String DEPENSES = "DEPENCES";
    public static final String ENTREE_CAISSE = "ENTREES DE CAISSE";
    public static final String CA = "CHIFFRE D'AFFAIRES";
    public static final String ACHATS = "ACHATS";
    public static final String MARGE = "MARGE";
    public static final String TICKET_REGLEMENT = "TICKET_REGLEMENT";
    public static final String TICKET_REGLEMENT_CARNET_DEPOT = "TICKET_REGLEMENT_CARNET_DEPOT";
    public static final String TICKET_VENTE_DOUBLE = "TICKET_DOUBLE";
    public static final String ACTION_ANNULATION_VENTE = "ANNULE_VENTE";
    public static final String PASSE = "passed";
    public static final String MOTIF_ENTREE_CAISSE = "2";
    public static final String MOTIF_VENTE = "1";
    public static final String MOTIF_SORTIE_CAISSE = "3";
    public static final String ACTION_INVENTAIRE = "INVENTAIRE";
    public static final String STATUT_CHARGED = "charged";
    public static final String KEY_CODE_FACTURE = "KEY_CODE_FACTURE";
    public static final String VENTE_COMPTANT_ID = "1";
    public static final String VENTE_CARNET_ID = "3";
    public static final String VENTE_ASSURANCE_ID = "2";
    public static final String P_BT_MODIFICATION_DE_VENTE = "P_BT_MODIFICATION_DE_VENTE";
    public static final String STATUT_PROCESS = "is_Process";
    public static final String REMISE_CLIENT_ID = "54291527499392054530";
    public static final int TIERS_PAYANT_PRINCIPAL = 1;
    public static final String STATUT_AUTO = "auto";
    public static final String STATUT_PENDING = "pending";
    public static final String STATUT_PASSED = "passed";
    public static final String STATUT_PHARMA = "pharma";
    public static final String REGL_DIFF = "4";
    public static final int TYPE_FACTURE_GROUPE = 1;
    public static final int TYPE_FACTURE_UNIQUE = 0;
    public static final String TOUT = "TOUT";
    public static final String ALL = "ALL";
    public static final String ACTION_RETOURFOURNISSEUR = "RETOURFOURNISSEUR";
    public static final String ACTION_ENTREE_RETOUR_DEPOT = "ENTREESTOCK";
    public static final String KEY_PARAMS = "KEY_PARAMS";
    public static final String KEY_TAKE_INTO_ACCOUNT = "KEY_TAKE_INTO_ACCOUNT";
    public static final String KEY_NOMBRE_TICKETS_VNO = "KEY_NOMBRE_TICKETS_VNO";
    public static final String P_BTN_UPDATE_VENTE_CLIENT_TP = "P_BTN_UPDATE_VENTE_CLIENT_TP";
    public static final String SMS_TOKEN_TYPE = "Bearer";
    public static final String GRANT_TYPE = "client_credentials";
    public static final String KEY_SMS_CLOTURE_CAISSE = "KEY_SMS_CLOTURE_CAISSE";
    public static final String KEY_SMS_MODIF_PRIX_VENTE = "KEY_SMS_MODIF_PRIX_VENTE";
    public static final String KEY_MAIL_CLOTURE_CAISSE = "KEY_MAIL_CLOTURE_CAISSE";
    public static final String MODE_MOOV = "8";
    public static final String MODE_ORANGE = "10";
    public static final String TYPE_REGLEMENT_ORANGE = "7";
    public static final String MODE_MTN = "9";
    public static final String MODE_WAVE = "10";
    public static final String MODE_REGL_DIFFERE = "4";
    public static final String KEY_HEURE_EMAIL = "KEY_HEURE_EMAIL";
    public static final String CLIENT_ASSURANCE = "1";
    public static final String CLIENT_CARNET = "2";
    public static final String UPDATE_PRICE = "UPDATE_PRICE";
    public static final String P_AFFICHER_STOCK_A_LA_VENTE = "P_AFFICHER_STOCK_A_LA_VENTE";
    public static final String AIRTIME_USER = "AIRTIME_USER";
    public static final String VETERINAIRE = "51217125136245583494";
    public static final String ACTION_DESACTIVE_PRODUIT = "ACTION_DESACTIVE_PRODUIT";
    public static final String P_BTN_DESACTIVER_CLIENT = "P_BTN_DESACTIVER_CLIENT";
    public static final String P_BTN_DESACTIVER_TIERS_PAYANT = "P_BTN_DESACTIVER_TIERS_PAYANT";
    public static final String TIERS_PAYANT_CARNET_ID = "2";
    public static final String KEY_PRENDRE_EN_COMPTE_FOND_CAISSE = "KEY_PRENDRE_EN_COMPTE_FOND_CAISSE";
    public static final String KEY_COMMON_MANAGMENT = "KEY_COMMON";
    public static final String NOT = "NOT";
    public static final String WITH = "WITH";
    public static final String CHARGED = "charged";
    public static final String TYPE_VENTE_VNO = "1";
    public static final String KEY_CHECK_UG = "KEY_CHECK_UG";
    public static final String TICKET_ZZ = "TICKET_ZZ";
    /*
     * parametre nombre de mois à considerer
     */
    public static final String Q3 = "Q3";
    /*
     * QTE DE REAPPRO (EN NOMBRE DE SEMAINES) A DEFINIR
     */
    public static final String Q2 = "Q2";
    /*
     * SEUIL DE REAPPRO (EN NOMBRE DE SEMAINES) A DEFNIR
     */
    public static final String Q1 = "Q1";
    public static final String CAUTION_ID = "10";

    // Runtime.getRuntime().totalMemory() -
    // Runtime.getRuntime().freeMemory()
    // String path = System.getProperty("user.home")
    private DateConverter() {
    }

    public static String getNumberRandom() {
        return String.valueOf((int) (Math.random() * 10000 + 1));
    }

    public static String phoneNumberFormat(String Str_country_indicatif, String str_phone_number) {
        try {
            long lg_phone_number = Long.parseLong(str_phone_number);

            DecimalFormatSymbols phoneNumberSymbols = new DecimalFormatSymbols();
            // Use space not comma to thousands: 10 000 not 10,000.
            phoneNumberSymbols.setGroupingSeparator('-');
            DecimalFormat phoneNumberFormat = new DecimalFormat("##,##,##,##", phoneNumberSymbols);
            String result_phone = phoneNumberFormat.format(lg_phone_number);

            if (result_phone.length() < 11) {
                result_phone = "0" + result_phone;
            }

            return "(" + Str_country_indicatif + ") " + result_phone;
        } catch (Exception e) {
        }
        return Str_country_indicatif;
    }

    public static String phoneNumberFormat(String str_phone_number) {
        String result_phone = "";
        try {
            long lg_phone_number = Long.parseLong(str_phone_number);

            DecimalFormatSymbols phoneNumberSymbols = new DecimalFormatSymbols();
            // Use space not comma to thousands: 10 000 not 10,000.
            phoneNumberSymbols.setGroupingSeparator('-');
            DecimalFormat phoneNumberFormat = new DecimalFormat("##,##,##,##", phoneNumberSymbols);
            result_phone = phoneNumberFormat.format(lg_phone_number);

            if (result_phone.length() < 11) {
                result_phone = "0" + result_phone;
            }

        } catch (Exception e) {
        }
        return result_phone;
    }

    public static String amountFormat(Integer Amount, char separator) {
        String result = "0";
        try {
            long lg_Amount = Long.parseLong(Amount.toString());

            DecimalFormatSymbols amountSymbols = new DecimalFormatSymbols();
            // Use space not comma to thousands: 10 000 not 10,000.
            amountSymbols.setGroupingSeparator(separator);
            DecimalFormat amountFormat = new DecimalFormat("###,###", amountSymbols);
            result = amountFormat.format(lg_Amount);
        } catch (NumberFormatException ex) {

        }
        return result;
    }

    public static Integer arrondiModuloOfNumber(Integer nbre, Integer modulo) {
        int result = 0, tempModulo;
        float part;
        String tempV;
        try {

            tempV = String.valueOf(nbre).substring(String.valueOf(nbre).length() - 1, String.valueOf(nbre).length());

            tempModulo = Integer.valueOf(tempV) % modulo;

            part = (modulo - 1) / 2;

            result = (int) ((part >= tempModulo) ? (nbre - tempModulo) : ((nbre - tempModulo) + modulo));

        } catch (NumberFormatException e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return result;
    }

    public static String getShortId(int intSize) {
        Calendar now = Calendar.getInstance();
        int mm = now.get(Calendar.MINUTE);
        int ss = now.get(Calendar.SECOND);
        int mls = now.get(Calendar.MILLISECOND);
        String catime = (String.valueOf(mm) + "" + ss + "" + mls);
        int intlenght = catime.length();
        while (intlenght < intSize) {
            catime = catime + getNumberRandom();
            intlenght = catime.length();
        }
        return catime.substring(0, intSize);
    }

    public static LocalDate convertDateToLocalDate(Date dateToConvert) {
        if (dateToConvert == null) {
            return LocalDate.now();
        }
        return dateToConvert.toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
    }

    public static Date convertLocalDateToDate(LocalDate dateToConvert) {
        return java.util.Date.from(dateToConvert.atStartOfDay().atZone(ZoneId.systemDefault()).toInstant());
    }

    public static LocalDateTime convertDateToLocalDateTime(Date dateToConvert) {
        if (dateToConvert == null) {
            return new Date().toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime();
        }
        return dateToConvert.toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime();
    }

    public static Date convertLocalDateTimeToDate(LocalDateTime dateToConvert) {
        return java.util.Date.from(dateToConvert.atZone(ZoneId.systemDefault()).toInstant());
    }

    public static String amountFormat(Integer amount) {
        String result = "0";
        try {
            long lgAmount = Long.parseLong(amount.toString());

            DecimalFormatSymbols amountSymbols = new DecimalFormatSymbols();

            amountSymbols.setGroupingSeparator(' ');

            DecimalFormat amountFormat = new DecimalFormat("###,###", amountSymbols);
            result = amountFormat.format(lgAmount);
        } catch (NumberFormatException ex) {

        }
        return result;
    }

    public static String getComplexId() {
        Calendar now = Calendar.getInstance();
        int mm = now.get(Calendar.MINUTE);
        int ss = now.get(Calendar.SECOND);
        int mls = now.get(Calendar.MILLISECOND);
        String catime = (String.valueOf(mm) + "" + ss + "" + mls);
        int intLenght = catime.length();
        if (intLenght < 20) {
            catime = catime + getNumberRandom();
        }
        if (intLenght == 20) {
            return catime;
        }
        if (intLenght > 20) {
            return catime.substring(0, 20);
        }
        return catime;
    }

    public static boolean hasAuthorityByName(List<TPrivilege> lstTPrivilege, String authorityName) {
        java.util.function.Predicate<TPrivilege> p = e -> e.getStrNAME().equalsIgnoreCase(authorityName);
        return lstTPrivilege.stream().anyMatch(p);
    }

    public static boolean hasAuthorityById(List<TPrivilege> lstTPrivilege, String id) {
        java.util.function.Predicate<TPrivilege> p = e -> e.getLgPRIVELEGEID().equals(id);
        return lstTPrivilege.stream().anyMatch(p);
    }

    public static String convertionChiffeLettres(Integer num) {
        RuleBasedNumberFormat formatter = new RuleBasedNumberFormat(Locale.FRANCE, RuleBasedNumberFormat.SPELLOUT);
        return formatter.format(num);

    }

    public static String buildLineBarecode(String data) {
        String file = null;
        try {
            Barcode128 barcode128 = new Barcode128();
            barcode128.setCode(data);
            barcode128.setBaseline(10);
            barcode128.setBarHeight(50);
            barcode128.setCodeType(Barcode128.CODE128);
            java.awt.Image img = barcode128.createAwtImage(Color.BLACK, Color.WHITE);
            BufferedImage bi = new BufferedImage(100, 70, BufferedImage.BITMASK);
            Graphics2D gd = bi.createGraphics();
            gd.drawImage(img, 4, 2, null);
            gd.setColor(Color.BLACK);
            gd.drawString(data, 10, 65);
            gd.dispose();
            file = jdom.barecode_file + data + ".png";
            File f = new File(file);
            ImageIO.write(bi, "png", f);
        } catch (IOException ex) {

        }
        return file;

    }

    public static String getNumberTowords(Number num) {
        RuleBasedNumberFormat formatter = new RuleBasedNumberFormat(Locale.FRANCE, RuleBasedNumberFormat.SPELLOUT);
        return formatter.format(num);

    }

    public static Integer getRemise(double tauxRemise, int taux,
            List<TPreenregistrementDetail> lstTPreenregistrementDetail) {
        if (taux < 100 || tauxRemise <= 0.0) {
            return 0;
        }
        double sumRemise = 0;
        for (TPreenregistrementDetail x : lstTPreenregistrementDetail) {
            TFamille famille = x.getLgFAMILLEID();
            if (!StringUtils.isEmpty(famille.getStrCODEREMISE()) && !famille.getStrCODEREMISE().equals("2")
                    && !famille.getStrCODEREMISE().equals("3")) {
                sumRemise += (Double.valueOf(x.getIntPRICE()) * tauxRemise);

            }
        }
        return (int) Math.round(sumRemise);

    }

    public static String buildbarcodeOther(String data, String str_file_name) {
        FileOutputStream out = null;
        try {

            out = new FileOutputStream(new File(str_file_name));
            AbstractBarcodeBean barcode = new Code128Bean();
            // barcode.setBarHeight(50.0);
            barcode.setFontName("Calibri (Corps)");
            barcode.setFontSize(15.0);
            barcode.setMsgPosition(HumanReadablePlacement.HRP_NONE);
            barcode.setModuleWidth(0.8);
            BitmapCanvasProvider canvas = new BitmapCanvasProvider(out, "image/x-png", 160,
                    BufferedImage.TYPE_BYTE_BINARY, false, 0);
            barcode.generateBarcode(canvas, data);
            try {
                canvas.finish();
            } catch (IOException ex) {
                LOG.log(Level.SEVERE, null, ex);
            }
        } catch (FileNotFoundException ex) {
            LOG.log(Level.SEVERE, null, ex);
        } finally {
            try {
                out.close();
            } catch (IOException ex) {
                LOG.log(Level.SEVERE, null, ex);
            }
        }
        return str_file_name;
    }

    /**
     *
     * @param Q1
     *            SEUIL DE REAPPRO (EN NOMBRE DE SEMAINES) A DEFNIR
     * @param Q2
     *            QTE DE REAPPRO (EN NOMBRE DE SEMAINES) A DEFINIR
     * @param Q3
     *            SOMME DE LA CONSOMMATION SUR LA VALEUR DU PARAMETRE GENERAL Q3
     * @param Q3_parametre
     *            VALEUR DU PARAMETRE GENERAL
     *
     * @return ON RETOURNE UNE PAIR DE VALEUR <b>seuilReappo</b>,<b>qteReappro</b>
     */
    public static JSONObject calculSeuiQteReappro(int Q1, int Q2, double Q3, int Q3_parametre) {
        /*
         * valeur calculee de la consommation du produit sur une semaine
         */
        double divente = (Double.valueOf(Q3_parametre) * 4);
        double Q4 = 0.5;
        if (divente > 0) {
            Q4 = (Q3 / divente);
        }
        Integer seuilReappro = (int) Math.ceil(Q4 * Q1);
        Integer qteReappro = (int) Math.ceil(Q4 * Q2);
        return new JSONObject().put("seuilReappro", seuilReappro).put("qteReappro", qteReappro);
    }

    public static LocalDate convertLongToLacalDate(long value) {
        return Instant.ofEpochMilli(value).atZone(ZoneId.systemDefault()).toLocalDate();
    }

    public static LocalDateTime convertLongToLacalDateTime(long value) {
        return Instant.ofEpochMilli(value).atZone(ZoneId.systemDefault()).toLocalDateTime();
    }

    public static String convertDateToDD_MM_YYYY(Date date) {
        DateFormat dateFormat = new SimpleDateFormat("dd/MM/yyyy");
        if (date != null) {
            return dateFormat.format(date);
        } else {
            return dateFormat.format(new Date());
        }
    }

    public static String convertLocalDateToDD_MM_YYYY(LocalDate localDate) {
        if (localDate != null) {
            return localDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        } else {
            return LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
    }

    public static String convertDateToYYYY_MM_DD(Date date) {
        SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd");
        if (date != null) {
            return dateFormat.format(date);
        } else {
            return dateFormat.format(new Date());
        }
    }

    public static String formatDateToEEEE_dd_MM_yyyy_HH_mm(Date date) {
        if (date != null) {
            return new SimpleDateFormat("EEEE dd MM yyyy HH:mm").format(date);
        } else {
            return new SimpleDateFormat("EEEE dd MM yyyy HH:mm").format(new Date());
        }
    }

    public static int convertSectoDay(int n) {
        return n / (24 * 3600);
    }

    public static Date dateFromString(String dateFromString) {
        try {
            return new SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS").parse(dateFromString);
        } catch (ParseException ex) {
            Logger.getLogger(DateConverter.class.getName()).log(Level.SEVERE, null, ex);
        }
        return null;
    }

    public static String convertDateToDD_MM_YYYY_HH_mm(Date date) {
        DateFormat dateFormat = new SimpleDateFormat("dd/MM/yyyy HH:mm");
        if (date != null) {
            return dateFormat.format(date);
        } else {
            return "";
        }
    }

    public static String amountFormat(long lgAmount, char separator) {
        String result = "0";
        try {
            DecimalFormatSymbols amountSymbols = new DecimalFormatSymbols();
            amountSymbols.setGroupingSeparator(separator);
            DecimalFormat amountFormat = new DecimalFormat("###,###", amountSymbols);
            result = amountFormat.format(lgAmount);
        } catch (NumberFormatException ex) {

        }
        return result;
    }

    public static LocalDate convertDateToLocalDateAndReturnNull(Date dateToConvert) {
        if (dateToConvert == null) {
            return null;
        }
        return dateToConvert.toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
    }

    public static LocalDateTime convertDateToLocalDateTimeElseNull(Date dateToConvert) {
        if (dateToConvert == null) {
            return null;
        }
        return dateToConvert.toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime();
    }

}
