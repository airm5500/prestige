package util;

import toolkits.security.Md5;
import toolkits.utils.conversion;
import toolkits.utils.logger;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import static util.DateConverter.getNumberRandom;

public class KeyUtilGen {

    private String catime;
    private String date;
    int mm;
    int ss;
    int hh;
    int mois;
    int jour;
    int annee;
    int mls;
    private final Date newDateDepart = new Date();
    private final Date lastDateDepart = newDateDepart;
    private final Date newDateReturn = newDateDepart;
    private final Date lastDateReturn = newDateDepart;
    public static final SimpleDateFormat formatterMysqlShort = new SimpleDateFormat("yyyy-MM-dd");
    public static final SimpleDateFormat formatterMysqlShort2 = new SimpleDateFormat("yyyy/MM/dd");
    public static final SimpleDateFormat formatterMysql = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
    public static final SimpleDateFormat formatterOrange = new SimpleDateFormat("dd-MM-yyyy HH:mm:ss");
    public static final SimpleDateFormat formatterUI = new SimpleDateFormat("E-d-MMMM-yy");
    public static final SimpleDateFormat formatterShort = new SimpleDateFormat("dd/MM/yyyy");
    public static final SimpleDateFormat formatterShortBis = new SimpleDateFormat("dd/MM/yy");
    public static final SimpleDateFormat formatterPMUC_PAYMENT = new SimpleDateFormat("dd/MM/yyyy");
    public static final SimpleDateFormat backabaseUiFormat = new SimpleDateFormat("dd/MM/yyyy");
    public static final SimpleDateFormat backabaseUiFormat1 = new SimpleDateFormat("dd/MM/yyyy HH:mm:ss");
    public static final SimpleDateFormat backabaseUiFormat2 = new SimpleDateFormat("dd-MM-yyyy");
    public static final SimpleDateFormat NomadicUiFormat = new SimpleDateFormat("MM/dd/yyyy");
    public static final SimpleDateFormat NomadicUiFormat_Time = new SimpleDateFormat("HH:mm:ss");
    public static final SimpleDateFormat NomadicUiFormatTime = new SimpleDateFormat("HH:mm");
    public static final SimpleDateFormat formatterUI2 = new SimpleDateFormat("E d MMMM yy HH:mm:ss");
    public static final SimpleDateFormat formatterMysql2 = new SimpleDateFormat("yyyy-MM-dd HH:mm");
    public static final SimpleDateFormat FORMATTERMOUNTHYEAR = new SimpleDateFormat("MM/yy");
    public static final SimpleDateFormat FORMATTERMOUNTHFULLYEAR = new SimpleDateFormat("MM/yyyy");
    public static final SimpleDateFormat FORMATTERMOUNTHYEARSQL = new SimpleDateFormat("MM-yy");
    public static final SimpleDateFormat FORMATTERMOUNTH = new SimpleDateFormat("M");
    public static final SimpleDateFormat FORMATTERYEAR = new SimpleDateFormat("yyyy");
    public static final SimpleDateFormat FULDATE = new SimpleDateFormat("EE d MMMM yyyy");
    public static final SimpleDateFormat FILENAME = new SimpleDateFormat("HH_mm_ss");

    public KeyUtilGen() {
        Calendar now = Calendar.getInstance();
        this.mm = now.get(12);
        this.ss = now.get(13);
        this.mls = now.get(14);
        this.hh = now.get(11);
        this.mois = now.get(2) + 1;
        this.jour = now.get(5);
        this.annee = now.get(1);
        this.catime = this.annee + "" + this.mois + "" + this.jour + "" + this.hh + "" + this.mm + "" + this.ss + ""
                + this.mls;
    }

    public String getDateTime() {

        Calendar now = Calendar.getInstance();
        this.mm = now.get(12);
        this.ss = now.get(13);
        this.mls = now.get(14);
        this.hh = now.get(11);
        this.mois = now.get(2) + 1;
        this.jour = now.get(5);
        this.annee = now.get(1);
        this.catime = this.annee + "_" + this.mois + "_" + this.jour + "_" + this.hh + "_" + this.mm;
        return this.catime;
    }

    public String getDate() {

        Calendar now = Calendar.getInstance();
        this.mm = now.get(12);
        this.ss = now.get(13);
        this.mls = now.get(14);
        this.hh = now.get(11);
        this.mois = now.get(2) + 1;
        this.jour = now.get(5);
        this.annee = now.get(1);
        this.catime = this.annee + "_" + this.mois + "_" + this.jour;
        return this.catime;
    }

    public int getKeyYear() {
        Calendar now = Calendar.getInstance();
        this.annee = now.get(1);
        return this.annee - 2015;
    }

    public int getYear() {
        Calendar now = Calendar.getInstance();
        this.annee = now.get(1);
        return this.annee;
    }

    public int getYear(Date date) {
        Calendar cal = Calendar.getInstance();
        cal.setTime(date);
        this.annee = cal.get(1);
        return this.annee;
    }

    public String gettimeid() {

        Calendar now = Calendar.getInstance();
        this.mm = now.get(12);
        this.ss = now.get(13);
        this.mls = now.get(14);
        this.hh = now.get(11);
        this.mois = now.get(2) + 1;
        this.jour = now.get(5);
        this.annee = now.get(1);
        this.catime = this.annee + "" + this.mois + "" + this.jour + "" + this.hh + "" + this.mm + "" + this.ss + ""
                + this.mls;
        return this.catime + GetNumberRandom();
    }

    public String getComplexId() {

        Calendar now = Calendar.getInstance();
        this.mm = now.get(12);
        this.ss = now.get(13);
        this.mls = now.get(14);
        this.hh = now.get(11);
        this.mois = now.get(2) + 1;
        this.jour = now.get(5);
        this.annee = now.get(1);
        this.catime = this.getKeyYear() + "" + this.mois + "" + this.jour + "" + this.hh + "" + this.mm + "" + this.ss
                + "" + this.mls;
        this.catime = this.catime + GetNumberRandom();
        if (this.catime.length() < 20) {
            this.catime = this.catime + GetNumberRandom();
        }

        if (this.catime.length() == 20) {
            return this.catime;
        } else {
            if (this.catime.length() > 20) {
                this.catime = this.catime.substring(0, 20);
            }

            return this.catime;
        }
    }

    public static String getId() {
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

    public String getShortId(int intSize) {
        Calendar now = Calendar.getInstance();
        this.mm = now.get(12);
        this.ss = now.get(13);
        this.mls = now.get(14);
        this.catime = this.mm + "" + this.ss + "" + this.mls;

        for (int int_lenght = this.catime.length(); int_lenght < intSize; int_lenght = this.catime.length()) {
            this.catime = this.catime + GetNumberRandom();
        }

        return this.catime.substring(0, intSize);
    }

    public String getSimpletimeid() {

        Calendar now = Calendar.getInstance();
        this.mm = now.get(12);
        this.ss = now.get(13);
        this.mls = now.get(14);
        this.hh = now.get(11);
        this.mois = now.get(2) + 1;
        this.jour = now.get(5);
        String jourr = "" + this.jour;
        if (this.jour < 10) {
            jourr = "0" + this.jour;
        }

        String MOIS = "" + this.mois;
        if (this.mois < 10) {
            MOIS = "0" + this.mois;
        }

        this.annee = now.get(1);
        this.catime = this.getKeyYear() + "" + MOIS + "" + jourr + "" + this.hh + "" + this.mm + "" + this.ss + ""
                + GetNumberRandom(9);
        if (this.catime.length() == 9) {
            System.out.println("bad id " + this.catime);
            this.catime = this.catime + GetNumberRandom(9) + GetNumberRandom(9);
        }

        if (this.catime.length() == 10) {
            System.out.println("bad id " + this.catime);
            this.catime = this.catime + GetNumberRandom(9);
        }

        if (this.catime.length() == 12) {
            System.out.println("bad id " + this.catime);
            this.catime = this.catime.substring(0, 11);
        }

        String UPCA = Md5.SimpleUPCA(this.catime);
        return UPCA;
    }

    public String getDateByHHmmss(String Minute) {
        Calendar now = Calendar.getInstance();
        this.mm = now.get(12);
        this.ss = now.get(13);
        this.mls = now.get(14);
        this.hh = now.get(11);
        this.mois = now.get(2) + 1;
        this.jour = now.get(5);
        this.annee = now.get(1);
        this.catime = this.annee + "-" + this.mois + "-" + this.jour + " " + Minute;
        return this.catime;
    }

    public static String GetDateNow() {
        Date actuelle = new Date();
        Calendar cal = Calendar.getInstance();
        cal.setTime(actuelle);
        actuelle = cal.getTime();
        String dat = formatterUI.format(actuelle);
        return dat;
    }

    public static Date GetDateNow_Date() {
        Date actuelle = new Date();
        Calendar cal = Calendar.getInstance();
        cal.setTime(actuelle);
        actuelle = cal.getTime();
        return actuelle;
    }

    public static String getDateNow(SimpleDateFormat format) {
        Date actuelle = new Date();
        Calendar cal = Calendar.getInstance();
        cal.setTime(actuelle);
        actuelle = cal.getTime();
        String dat = format.format(actuelle);
        return dat;
    }

    public static String dateToString(Date actuelle, SimpleDateFormat Sformat) {
        String dat = "";

        try {
            dat = Sformat.format(actuelle);
        } catch (Exception var4) {

            dat = getDateNow(Sformat);
        }

        return dat;
    }

    public String GetDateNowForSearch(int nb_day) {
        Date actuelle = new Date();
        Calendar cal = Calendar.getInstance();
        cal.setTime(actuelle);
        cal.add(5, nb_day);
        actuelle = cal.getTime();
        String dat = backabaseUiFormat.format(actuelle);
        (new logger()).OCategory.info("date " + dat);
        return dat;
    }

    public static String getDateForLimitSearch(Date actuelle, int nb_day) {
        Calendar cal = Calendar.getInstance();
        cal.setTime(actuelle);
        cal.add(5, nb_day);
        actuelle = cal.getTime();
        String dat = formatterMysql.format(actuelle);
        return dat;
    }

    public static String getAddTimeUi(long lg_TIME, long lg_NB_TIME) {
        long lg_time = lg_TIME + lg_NB_TIME;
        return conversion.convertFromMillisToTimeToCustom(lg_time, "");
    }

    public static String getAddTime(long lg_TIME, long lg_NB_TIME) {
        long lg_time = lg_TIME + lg_NB_TIME;
        return conversion.convertFromMillisToTime(lg_time, "");
    }

    public String getdate() {
        return this.date = this.jour + "-" + this.mois + "-" + this.annee + "  " + this.hh + ":" + this.mm;
    }

    public String getdateTimeDate() {
        return this.date = this.annee + "-" + this.mois + "-" + this.jour + "  " + this.hh + ":" + this.mm;
    }

    public String getidGET(String ID) {
        String ResultString = "";
        ResultString = ID.substring(0, 3);
        return ResultString;
    }

    public double get_double_value(String String_value) {
        double result = 0.0;
        Integer integer_value = Integer.valueOf(String_value);
        result = integer_value.doubleValue();
        return result;
    }

    public static Date stringToDate(String sDate) {
        Date tempDate = new Date();

        try {
            tempDate = formatterMysql.parse(sDate);
        } catch (Exception var3) {
        }

        return tempDate;
    }

    public static Date stringToDate(String sDate, SimpleDateFormat Format) {
        Date tempDate = null;

        try {
            tempDate = Format.parse(sDate);
            return tempDate;
        } catch (Exception var4) {
            return new Date();
        }
    }

    public static String stringToDateUI(Date sDate) {
        String tempDate = null;

        try {
            tempDate = formatterUI.format(sDate);
        } catch (Exception var3) {
        }

        return tempDate;
    }

    public static String DoubleToAmount(double db_Amount) {
        String[] temp = null;
        String Str_db_Amount = String.valueOf(db_Amount);
        Str_db_Amount = Str_db_Amount.replace(';', '.');
        return Str_db_Amount;
    }

    public static String DoubleToAmount(double db_Amount, String Paterne) {
        String[] temp = null;
        String Str_db_Amount = String.valueOf(db_Amount);
        temp = Str_db_Amount.split(".");
        return temp[0] + Paterne;
    }

    public static String GetNumberRandom() {
        return String.valueOf((int) (Math.random() * 10000.0 + 1.0));
    }

    public static String GetNumberRandom(int patern) {
        String var = String.valueOf((int) (Math.random() * (double) patern + 1.0));
        (new logger()).OCategory.fatal(var);
        return var;
    }

    public static String getDay(Date Odate) {
        Calendar cal = Calendar.getInstance();
        cal.setTime(Odate);
        String[] DayName = new String[] { "DIMANCHE", "LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "SAMEDI" };
        String Day = DayName[cal.get(7) - 1];
        return Day;
    }

    public static String getMois(Date Odate) {
        Calendar cal = Calendar.getInstance();
        cal.setTime(Odate);
        String[] monthName = new String[] { "Janvier", "Fevrier", "Mars", "Avril", "Mai", "Juin", "Juillet", "Aout",
                "Aout", "Octobre", "Novembre", "Decembre" };
        String month = monthName[cal.get(2)];
        return month;
    }

    public static String getAnnee(Date Odate) {
        Calendar cal = Calendar.getInstance();
        cal.setTime(Odate);
        int annee = cal.get(1);
        return (Integer.valueOf(annee)).toString();
    }

    public static String getDayOfMonth(Date Odate) {
        Calendar cal = Calendar.getInstance();
        cal.setTime(Odate);
        int day = cal.get(5);
        return (Integer.valueOf(day)).toString();
    }

    public static String getoHours(Date Odate) {
        Calendar cal = Calendar.getInstance();
        cal.setTime(Odate);
        int Oval = cal.get(11);
        return (Integer.valueOf(Oval)).toString();
    }

    public static String getoDay(Date Odate) {
        Calendar cal = Calendar.getInstance();
        cal.setTime(Odate);
        int Oval = cal.get(5);
        return (Integer.valueOf(Oval)).toString();
    }

    public static String getoMois(Date Odate) {
        Calendar cal = Calendar.getInstance();
        cal.setTime(Odate);
        int Oval = cal.get(2);
        return (Integer.valueOf(Oval + 1)).toString();
    }

    public static String getoAnnee(Date Odate) {
        Calendar cal = Calendar.getInstance();
        cal.setTime(Odate);
        int Oval = cal.get(1);
        return (Integer.valueOf(Oval)).toString();
    }

    public static String getTime(Date ODate) {
        String result = "";
        String Str_O_Date = dateToString(ODate, formatterMysql);
        String[] temp = null;
        temp = Str_O_Date.split(" ");
        result = temp[1];
        String[] temp_2 = null;
        temp_2 = result.split(":");
        result = temp_2[0] + ":" + temp_2[1];
        return result;
    }

    public static String GetNumberRandom(int debut, int fin) {
        int rand;
        for (rand = Integer.parseInt(GetNumberRandom(fin)); rand < debut; rand = Integer
                .parseInt(GetNumberRandom(fin))) {
        }

        while (rand == debut) {
            rand = Integer.parseInt(GetNumberRandom(fin));
        }

        (new logger()).OCategory.fatal(rand);
        return rand + "";
    }

    public Date getFirstDayofPreviousMonth() {
        Calendar cal = Calendar.getInstance();
        cal.add(2, -1);
        cal.set(5, 1);
        Date firstDateOfPreviousMonth = cal.getTime();
        (new logger()).OCategory.info("firstDateOfPreviousMonth " + firstDateOfPreviousMonth);
        return firstDateOfPreviousMonth;
    }

    public Date getLastDayofPreviousMonth() {
        Calendar cal = Calendar.getInstance();
        cal.add(2, -1);
        cal.set(5, cal.getActualMaximum(5));
        Date lastDateOfPreviousMonth = cal.getTime();
        (new logger()).OCategory.info("lastDateOfPreviousMonth " + lastDateOfPreviousMonth);
        return lastDateOfPreviousMonth;
    }

    public Date getFirstDayofNextMonth() {
        Calendar cal = Calendar.getInstance();
        cal.add(2, 1);
        cal.set(5, 1);
        Date firstDateOfNextMonth = cal.getTime();
        (new logger()).OCategory.info("firstDateOfNextMonth " + firstDateOfNextMonth);
        return firstDateOfNextMonth;
    }

    public Date getLastDayofNextMonth() {
        Calendar cal = Calendar.getInstance();
        cal.add(2, 1);
        cal.set(5, cal.getActualMaximum(5));
        Date lastDateOfNextMonth = cal.getTime();
        (new logger()).OCategory.info("lastDateOfNextMonth " + lastDateOfNextMonth);
        return lastDateOfNextMonth;
    }

    public static long getDifferenceBetweenDate(Date dtDEBUT, Date dtFIN) {
        long diffenrece = dtFIN.getTime() - dtDEBUT.getTime();
        diffenrece = diffenrece / 1000L / 60L / 60L / 24L;
        (new logger()).OCategory.info("diffenrece " + diffenrece);
        return diffenrece;
    }
}
