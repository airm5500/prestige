package toolkits.utils;

import java.text.SimpleDateFormat;
import java.util.*;
import toolkits.parameters.commonparameter;
import toolkits.parameters.commonEnumm;
import toolkits.parameters.commonKeys;
import toolkits.security.Md5;

/**
 * Titre : Releve Description : Copyright : Copyright (c) 2007 Soci�t� : SOftech
 * inc
 *
 * @author Thierry Bekola
 * @version 1.0
 */
public class date {

    private String catime;
    private String date;
    int mm, ss, hh, mois, jour, annee, mls;
    Date newDate_depart, lastDate_depart;
    Date newDate_return, lastDate_return;
    final public static SimpleDateFormat formatterMysqlShort = new SimpleDateFormat("yyyy-MM-dd");
    final public static SimpleDateFormat formatterMysqlShort2 = new SimpleDateFormat("yyyy/MM/dd");
    final public static SimpleDateFormat formatterMysql = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
    final public static SimpleDateFormat formatterOrange = new SimpleDateFormat("dd-MM-yyyy HH:mm:ss");
    final public static SimpleDateFormat formatterUI = new SimpleDateFormat("E-d-MMMM-yy");
    final public static SimpleDateFormat formatterShort = new SimpleDateFormat("dd/MM/yyyy");
    final public static SimpleDateFormat formatterShortBis = new SimpleDateFormat("dd/MM/yy");
    final public static SimpleDateFormat formatterPMUC_PAYMENT = new SimpleDateFormat("dd/MM/yyyy");
    final public static SimpleDateFormat backabaseUiFormat = new SimpleDateFormat("dd/MM/yyyy");
    final public static SimpleDateFormat backabaseUiFormat1 = new SimpleDateFormat("dd/MM/yyyy HH:mm:ss");
    final public static SimpleDateFormat backabaseUiFormat2 = new SimpleDateFormat("dd-MM-yyyy");
    final public static SimpleDateFormat NomadicUiFormat = new SimpleDateFormat("MM/dd/yyyy");
    final public static SimpleDateFormat NomadicUiFormat_Time = new SimpleDateFormat("HH:mm:ss");
    final public static SimpleDateFormat NomadicUiFormatTime = new SimpleDateFormat("HH:mm");
    final public static SimpleDateFormat formatterUI2 = new SimpleDateFormat("E d MMMM yy HH:mm:ss");
    final public static SimpleDateFormat formatterMysql2 = new SimpleDateFormat("yyyy-MM-dd HH:mm");
    final public static SimpleDateFormat FORMATTERMOUNTHYEAR = new SimpleDateFormat("MM/yy");
    final public static SimpleDateFormat FORMATTERMOUNTHFULLYEAR = new SimpleDateFormat("MM/yyyy");
    final public static SimpleDateFormat FORMATTERMOUNTHYEARSQL = new SimpleDateFormat("MM-yy");
    final public static SimpleDateFormat FORMATTERMOUNTH = new SimpleDateFormat("M");
    final public static SimpleDateFormat FORMATTERYEAR = new SimpleDateFormat("yyyy");
    final public static SimpleDateFormat FULDATE = new SimpleDateFormat("EE d MMMM yyyy");
    final public static SimpleDateFormat FILENAME = new SimpleDateFormat("HH_mm_ss");

    public date() {
        newDate_depart = new Date();
        newDate_return = new Date();
        lastDate_depart = new Date();
        lastDate_return = new Date();
        Calendar now = Calendar.getInstance();
        mm = now.get(Calendar.MINUTE);
        ss = now.get(Calendar.SECOND);
        mls = now.get(Calendar.MILLISECOND);
        hh = now.get(Calendar.HOUR_OF_DAY);
        mois = now.get(Calendar.MONTH) + 1;
        jour = now.get(Calendar.DAY_OF_MONTH);
        annee = now.get(Calendar.YEAR);
        this.catime = (String.valueOf(annee) + "" + String.valueOf(mois) + "" + String.valueOf(jour) + "" + String.valueOf(hh) + "" + String.valueOf(mm) + "" + String.valueOf(ss) + "" + String.valueOf(mls));
    }

    public String getDateTime() {
        newDate_depart = new Date();
        newDate_return = new Date();
        lastDate_depart = new Date();
        lastDate_return = new Date();
        Calendar now = Calendar.getInstance();
        mm = now.get(Calendar.MINUTE);
        ss = now.get(Calendar.SECOND);
        mls = now.get(Calendar.MILLISECOND);
        hh = now.get(Calendar.HOUR_OF_DAY);
        mois = now.get(Calendar.MONTH) + 1;
        jour = now.get(Calendar.DAY_OF_MONTH);
        annee = now.get(Calendar.YEAR);
        this.catime = (String.valueOf(annee) + "_" + String.valueOf(mois) + "_" + String.valueOf(jour) + "_" + String.valueOf(hh) + "_" + String.valueOf(mm));

        return this.catime;
    }

    public String getDate() {
        newDate_depart = new Date();
        newDate_return = new Date();
        lastDate_depart = new Date();
        lastDate_return = new Date();
        Calendar now = Calendar.getInstance();
        mm = now.get(Calendar.MINUTE);
        ss = now.get(Calendar.SECOND);
        mls = now.get(Calendar.MILLISECOND);
        hh = now.get(Calendar.HOUR_OF_DAY);
        mois = now.get(Calendar.MONTH) + 1;
        jour = now.get(Calendar.DAY_OF_MONTH);
        annee = now.get(Calendar.YEAR);
        this.catime = (String.valueOf(annee) + "_" + String.valueOf(mois) + "_" + String.valueOf(jour));

        return this.catime;
    }

    public int getKeyYear() {
        Calendar now = Calendar.getInstance();
        annee = now.get(Calendar.YEAR);
        return annee - commonKeys.FIRST_YEAR;
    }

    public int getYear() {
        Calendar now = Calendar.getInstance();
        annee = now.get(Calendar.YEAR);
        return annee;
    }

    public int getYear(Date date) {
        Calendar cal = Calendar.getInstance();
        cal.setTime(date);
        annee = cal.get(Calendar.YEAR);
        return annee;
    }

    public String gettimeid() {
        newDate_depart = new Date();
        newDate_return = new Date();
        lastDate_depart = new Date();
        lastDate_return = new Date();
        Calendar now = Calendar.getInstance();
        mm = now.get(Calendar.MINUTE);
        ss = now.get(Calendar.SECOND);
        mls = now.get(Calendar.MILLISECOND);
        hh = now.get(Calendar.HOUR_OF_DAY);
        mois = now.get(Calendar.MONTH) + 1;
        jour = now.get(Calendar.DAY_OF_MONTH);
        annee = now.get(Calendar.YEAR);
        this.catime = (String.valueOf(annee) + "" + String.valueOf(mois) + "" + String.valueOf(jour) + "" + String.valueOf(hh) + "" + String.valueOf(mm) + "" + String.valueOf(ss) + "" + String.valueOf(mls));
        return this.catime + this.GetNumberRandom();
    }

    public String getComplexId() {
        newDate_depart = new Date();
        newDate_return = new Date();
        lastDate_depart = new Date();
        lastDate_return = new Date();
        Calendar now = Calendar.getInstance();
        mm = now.get(Calendar.MINUTE);
        ss = now.get(Calendar.SECOND);
        mls = now.get(Calendar.MILLISECOND);
        hh = now.get(Calendar.HOUR_OF_DAY);
        mois = now.get(Calendar.MONTH) + 1;
        jour = now.get(Calendar.DAY_OF_MONTH);
        annee = now.get(Calendar.YEAR);
        this.catime = (getKeyYear() + "" + String.valueOf(mois) + "" + String.valueOf(jour) + "" + String.valueOf(hh) + "" + String.valueOf(mm) + "" + String.valueOf(ss) + "" + String.valueOf(mls));
        this.catime = this.catime + this.GetNumberRandom();

        if (this.catime.length() < 20) {
            this.catime = this.catime + this.GetNumberRandom();
        }

        if (this.catime.length() == 20) {
            return this.catime;
        }
        if (this.catime.length() > 20) {
            this.catime = this.catime.substring(0, 20);
        }
        //  new logger().OCategory.info(this.catime.length());

        return this.catime;

    }

    public String getShortId(int int_size) {
        Calendar now = Calendar.getInstance();
        mm = now.get(Calendar.MINUTE);
        ss = now.get(Calendar.SECOND);
        mls = now.get(Calendar.MILLISECOND);
        this.catime = (String.valueOf(mm) + "" + String.valueOf(ss) + "" + String.valueOf(mls));
        int int_lenght = this.catime.length();
        while (int_lenght < int_size) {
            this.catime = this.catime + this.GetNumberRandom();
            int_lenght = this.catime.length();
        }
        return this.catime.substring(0, int_size);
    }

    public String getSimpletimeid() {
        newDate_depart = new Date();
        newDate_return = new Date();
        lastDate_depart = new Date();
        lastDate_return = new Date();
        Calendar now = Calendar.getInstance();
        mm = now.get(Calendar.MINUTE);
        ss = now.get(Calendar.SECOND);
        mls = now.get(Calendar.MILLISECOND);
        hh = now.get(Calendar.HOUR_OF_DAY);
        mois = now.get(Calendar.MONTH) + 1;
        jour = now.get(Calendar.DAY_OF_MONTH);
        String JOUR = "" + jour;
        if (jour < 10) {
            JOUR = "0" + jour;
        }

        String MOIS = "" + mois;
        if (mois < 10) {
            MOIS = "0" + mois;
        }
//String.valueOf(mls).substring(0,0)
        annee = now.get(Calendar.YEAR);
        this.catime = (getKeyYear() + "" + MOIS + "" + JOUR + "" + String.valueOf(hh) + "" + String.valueOf(mm) + "" + String.valueOf(ss) + "" + this.GetNumberRandom(9));
        if (this.catime.length() == 9) {
            System.out.println("bad id " + this.catime);
            this.catime = this.catime + this.GetNumberRandom(9) + this.GetNumberRandom(9);
        }
        if (this.catime.length() == 10) {
            System.out.println("bad id " + this.catime);
            this.catime = this.catime + this.GetNumberRandom(9);
        }
        if (this.catime.length() == 12) {
            System.out.println("bad id " + this.catime);
            this.catime = this.catime.substring(0, 11);
        }
        System.out.println(this.catime);
        String UPCA = Md5.SimpleUPCA(this.catime);
        return UPCA;
    }

    public String getDateByHHmmss(String Minute) {

        Calendar now = Calendar.getInstance();
        mm = now.get(Calendar.MINUTE);
        ss = now.get(Calendar.SECOND);
        mls = now.get(Calendar.MILLISECOND);
        hh = now.get(Calendar.HOUR_OF_DAY);
        mois = now.get(Calendar.MONTH) + 1;
        jour = now.get(Calendar.DAY_OF_MONTH);
        annee = now.get(Calendar.YEAR);
        this.catime = (String.valueOf(annee) + "-" + String.valueOf(mois) + "-" + String.valueOf(jour) + " " + Minute);
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

    public static String GetDateNow(SimpleDateFormat Sformat) {

        Date actuelle = new Date();
        Calendar cal = Calendar.getInstance();
        cal.setTime(actuelle);
        actuelle = cal.getTime();
        String dat = Sformat.format(actuelle);
        return dat;
    }

    public static String DateToString(Date actuelle, SimpleDateFormat Sformat) {
        String dat = "";
        try {
            dat = Sformat.format(actuelle);
        } catch (Exception e) {
            dat = new date().GetDateNow(Sformat);
        }
        return dat;
    }

    /*ajouter un nombre de jour*/
    public String GetDateNowForSearch(int nb_day) {
        Date actuelle = new Date();
        Calendar cal = Calendar.getInstance();
        cal.setTime(actuelle);
        cal.add(Calendar.DATE, nb_day);
        actuelle = cal.getTime();
        String dat = backabaseUiFormat.format(actuelle);
        new logger().OCategory.info("date " + dat);
        return dat;
    }

    public static Date GetNewDate(int nb_day) {
        Date actuelle = new Date();
        Calendar cal = Calendar.getInstance();
        cal.setTime(actuelle);
        cal.add(Calendar.DATE, nb_day);
        actuelle = cal.getTime();
        return actuelle;
    }

    public static Date GetNewDate(Date ODate, int nb_day) {
        Date actuelle = ODate;
        Calendar cal = Calendar.getInstance();
        cal.setTime(actuelle);
        cal.add(Calendar.DATE, nb_day);
        actuelle = cal.getTime();
        return actuelle;
    }

    public static Date GetNewDate(Date ODate, int nb_heure, int nb_minute) {
        Date actuelle = ODate;
        Calendar cal = Calendar.getInstance();
        cal.setTime(actuelle);
        cal.add(Calendar.HOUR, nb_heure);
        cal.add(Calendar.MINUTE, nb_minute);
        actuelle = cal.getTime();
        return actuelle;
    }

    public static int GetDayToSeparate(Date odate_before, Date odate_after) {
        long lg_day = (odate_after.getTime() - odate_before.getTime()) / 3600000;
        lg_day = (lg_day / 24);
        return Integer.parseInt(Long.toString(lg_day));
    }

    public static int GetHourToSeparate(Date odate_before, Date odate_after) {
        long lg_day = (odate_after.getTime() - odate_before.getTime()) / 3600000;
        return Integer.parseInt(Long.toString(lg_day));
    }

    public static int GetMinuteToSeparate(Date odate_before, Date odate_after) {
        long lg_day = (odate_after.getTime() - odate_before.getTime()) / 60000;
        return Integer.parseInt(Long.toString(lg_day));
    }

    public static int GetSecToSeparate(Date odate_before, Date odate_after) {
        long lg_day = (odate_after.getTime() - odate_before.getTime()) / 1000;
        return Integer.parseInt(Long.toString(lg_day));
    }

    public static String getDateForLimitSearch(Date actuelle, int nb_day) {
        Calendar cal = Calendar.getInstance();
        cal.setTime(actuelle);
        cal.add(Calendar.DATE, nb_day);
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
        return this.date = String.valueOf(jour) + "-" + String.valueOf(mois) + "-" + String.valueOf(annee) + "  " + String.valueOf(hh) + ":" + String.valueOf(mm);
    }

    public String getdateTimeDate() {
        return this.date = String.valueOf(annee) + "-" + String.valueOf(mois) + "-" + String.valueOf(jour) + "  " + String.valueOf(hh) + ":" + String.valueOf(mm);
    }

    public String getidGET(String ID) {
        String ResultString = "";
        ResultString = ID.substring(0, 3);
        return ResultString;
    }

    public double get_double_value(String String_value) {
        double result;
        result = 0;
        Integer integer_value = new Integer(String_value);
        result = integer_value.doubleValue();
        return result;
    }

    public int is_number(String number) {
        int result = 0;
        int result2 = 0;
        String text = number;
        int textlen = text.length();
        char[] tabchar = new char[textlen];
        tabchar = text.toCharArray();
        if (textlen == 0) {
            result = 0;
        }
        int i = 0;

        char ch = tabchar[i];
        /*Character.getNumericValue(ch) <=9||*/
        while (Character.getNumericValue(ch) < 9 && i < textlen) {

            ch = tabchar[i];
            i++;
        }
        System.out.println(i + "  et  " + textlen);
        if (i == textlen) {
            result = 1;
        } else {
            result = 0;
        }
        return result;
    }

    public static void getAddTimeDate(String oTIME) {
        System.out.println(conversion.getlg_TIME(oTIME));
    }

    public static Date stringToDate(String sDate) {
        Date tempDate = new Date();
        try {
            tempDate = formatterMysql.parse(sDate);
        } catch (Exception ex) {
        }
        return tempDate;
    }

    public static Date TransactionIdToDate(String TransactionId) {
        Date tempDate = null;

        String YYYY = "";
        String MM = "";
        String DD = "";
        String HH = "";
        String MN = "";
        String SS = "";
        try {
            YYYY = TransactionId.substring(1, 3);
            MM = TransactionId.substring(3, 5);
            DD = TransactionId.substring(5, 7);
            HH = TransactionId.substring(8, 10);
            MN = TransactionId.substring(10, 12);
            tempDate = stringToDate("20" + YYYY + "-" + MM + "-" + DD + " " + HH + ":" + MN + ":00", formatterMysql);
            System.out.println("20" + YYYY + "-" + MM + "-" + DD + " " + HH + ":" + MN + ":00");
            System.out.println(tempDate);
        } catch (Exception ex) {
            System.out.println(ex.getMessage());
        }
        return tempDate;
    }

    public static Date TransferNumberToDate(String TransferNumber) {
        Date tempDate = null;

        String YYYY = "";
        String MM = "";
        String DD = "";
        String HH = "";
        String MN = "";
        String SS = "";
        try {
            YYYY = TransferNumber.substring(2, 4);
            MM = TransferNumber.substring(4, 6);
            DD = TransferNumber.substring(6, 8);
            HH = TransferNumber.substring(9, 11);
            MN = TransferNumber.substring(11, 13);
            tempDate = stringToDate("20" + YYYY + "-" + MM + "-" + DD + " " + HH + ":" + MN + ":00", formatterMysql);
            System.out.println("20" + YYYY + "-" + MM + "-" + DD + " " + HH + ":" + MN + ":00");
            System.out.println(tempDate);
        } catch (Exception ex) {
            System.out.println(ex.getMessage());
        }
        return tempDate;
    }

    public static Date stringToDate(String sDate, SimpleDateFormat Format) {
        Date tempDate = null;
        try {
            tempDate = Format.parse(sDate);
        } catch (Exception ex) {
            return new Date();
        }
        return tempDate;
    }

    public static String stringToDateUI(Date sDate) {
        String tempDate = null;
        try {
            tempDate = formatterUI.format(sDate);
        } catch (Exception ex) {
        }
        return tempDate;
    }

    public static String TimeUiToString(String Str_TIME) {
        String result = "";
        try {

            int k = 0;
            String[] temp = null;
            String Option_Day = "";
            temp = Str_TIME.split(":");
            int intHour = 0;
            intHour = Integer.parseInt(temp[0]);
            Option_Day = temp[1].substring(2, 3);
            if (Option_Day.equals("a")) {
                // Option_Day ="a";
                String s = temp[1].substring(0, 2);
                temp[1] = s;
                System.out.println(s);

            } else {
                // Option_Day ="p";
                String s = temp[1].substring(0, 2);
                temp[1] = s;
                intHour = intHour + 12;
            }
            Option_Day = "00";
            result = intHour + ":" + temp[1] + ":" + Option_Day;
        } catch (Exception ex) {
            System.err.println(ex.getMessage());
            new logger().OCategory.warn(ex.getMessage());
        }
        return result;
    }

    public static String stringToTimeUI(String Str_TIME) {
        String result = "";
        try {

            int k = 0;
            String[] temp = null;
            String Option_Day = "";
            temp = Str_TIME.split(":");
            int intHour = 0;
            intHour = Integer.parseInt(temp[0]);
            if (intHour <= 11) {
                Option_Day = "a";
            } else {
                Option_Day = "p";
                intHour = intHour - 12;
            }
            result = intHour + ":" + temp[1] + "" + Option_Day;
        } catch (Exception ex) {
            System.err.println(ex.getMessage());
            new logger().OCategory.warn(ex.getMessage());
        }
        return result;
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
        return String.valueOf((int) (Math.random() * 10000 + 1));
    }

    public static String GetNumberRandom(int patern) {
        String var = String.valueOf((int) (Math.random() * patern + 1));
        new logger().OCategory.fatal(var);
        return var;
    }

    public static Date GetDebutMois(Date Odate) {

        String TempDate = GetDateNow(formatterMysql);
        String[] temp_day = null;
        String[] temp = null;
        temp = TempDate.split(" ");
        temp_day = temp[0].split("-");
        int mois = Integer.parseInt(temp_day[1]);
        String StrMois = String.valueOf(mois);
        if (mois < 10) {
            StrMois = "0" + StrMois;
        }
        temp_day[2] = "01";
        TempDate = temp_day[0] + "-" + StrMois + "-" + temp_day[2] + " " + temp[1];
        Odate = stringToDate(TempDate, formatterMysql);
        return Odate;

    }

    public static Date GetFinMois(int Year, int Mount) {
        Calendar calendar = Calendar.getInstance();
        int year = Year;
        int month = Mount;
        int date = Calendar.DATE;
        System.out.println("date: " + date);
        calendar.set(year, month, date);
        int maxDay = calendar.getActualMaximum(Calendar.DAY_OF_MONTH);
        System.out.println("Max Day: " + maxDay);
        String StrMois = "";
        StrMois = "" + Mount;
        if (Mount < 10) {
            StrMois = "0" + Mount;
        }
        String ODate = Year + "-" + StrMois + "-" + maxDay + " 00:00:00";
        System.out.println("ODate: " + ODate);
        return stringToDate(ODate, formatterMysql);

    }

    public static Date GetDebutMois(int Year, int Mount) {

        String TempDate = GetDateNow(formatterMysql);
        String[] temp_day = null;
        String[] temp = null;
        temp = TempDate.split(" ");
        temp_day = temp[0].split("-");
        int mois = Integer.parseInt(temp_day[1]);
        String StrMois = String.valueOf(mois);

        //String StrMois = "";
        StrMois = "" + Mount;
        if (Mount < 10) {
            StrMois = "0" + Mount;
        }

        if (mois < 10) {
            StrMois = "0" + StrMois;
        }
        temp_day[2] = "01";

        String ODate = Year + "-" + StrMois + "-" + temp_day[2] + " 00:00:00";

        TempDate = Year + "-" + StrMois + "-" + temp_day[2] + " " + temp[1];

        return stringToDate(ODate, formatterMysql);


        /*

         Calendar calendar = Calendar.getInstance();
         int year = Year;
         int month = Mount;
         int date = Calendar.DATE;
         System.out.println("date: " + date);
         calendar.set(year, month, date);
         int maxDay = calendar.getActualMaximum(Calendar.DAY_OF_MONTH);
         System.out.println("Max Day: " + maxDay);
         String StrMois = "";
         StrMois = "" + Mount;
         if (Mount < 10) {
         StrMois = "0" + Mount;
         }
         String ODate = Year + "-" + StrMois + "-" + maxDay + " 00:00:00";
         System.out.println("ODate: " + ODate);
         return stringToDate(ODate, formatterMysql);
         */
    }

    public static Date GetDebutMois() {
        Date Odate = new Date();
        String TempDate = GetDateNow(formatterMysql);
        String[] temp_day = null;
        String[] temp = null;
        temp = TempDate.split(" ");
        temp_day = temp[0].split("-");
        int mois = Integer.parseInt(temp_day[1]);
        String StrMois = String.valueOf(mois);
        if (mois < 10) {
            StrMois = "0" + StrMois;
        }
        temp_day[2] = "01";
        TempDate = temp_day[0] + "-" + StrMois + "-" + temp_day[2] + " " + temp[1];
        Odate = stringToDate(TempDate, formatterMysql);
        System.out.println(Odate);
        return Odate;
    }

    public static String getDay(Date Odate) {
        Calendar cal = Calendar.getInstance();
        cal.setTime(Odate);
        String[] DayName = {commonEnumm.DAY_DIMANCHE, commonEnumm.DAY_LUNDI, commonEnumm.DAY_MARDI,
            commonEnumm.DAY_MERCREDI, commonEnumm.DAY_JEUDI, commonEnumm.DAY_VENDREDI, commonEnumm.DAY_SAMEDI};
        String Day = DayName[cal.get(Calendar.DAY_OF_WEEK) - 1];
        return Day;
    }

    public static String getMois(Date Odate) {
        Calendar cal = Calendar.getInstance();
        cal.setTime(Odate);
        String[] monthName = {commonparameter.January, commonparameter.February,
            commonparameter.March, commonparameter.April, commonparameter.May, commonparameter.June, commonparameter.July,
            commonparameter.August, commonparameter.August, commonparameter.October, commonparameter.November,
            commonparameter.December};
        String month = monthName[cal.get(Calendar.MONTH)];
        return month;
    }

    public static String getAnnee(Date Odate) {
        Calendar cal = Calendar.getInstance();
        cal.setTime(Odate);
        int annee = cal.get(Calendar.YEAR);
        return new Integer(annee).toString();
    }

    public static String getDayOfMonth(Date Odate) {
        Calendar cal = Calendar.getInstance();
        cal.setTime(Odate);
        int day = cal.get(Calendar.DAY_OF_MONTH);
        return new Integer(day).toString();
    }

    public static String getoHours(Date Odate) {
        Calendar cal = Calendar.getInstance();
        cal.setTime(Odate);
        int Oval = cal.get(Calendar.HOUR_OF_DAY);
        return new Integer(Oval).toString();
    }

    public static String getoTimeofDay(Date Odate) {
        Calendar cal = Calendar.getInstance();
        cal.setTime(Odate);
        int hour = cal.get(Calendar.HOUR_OF_DAY);
        int minute = cal.get(Calendar.MINUTE);
        int second = cal.get(Calendar.SECOND);
        return hour + ":" + minute + ":" + second;
    }

    public static String getoDay(Date Odate) {
        Calendar cal = Calendar.getInstance();
        cal.setTime(Odate);
        int Oval = cal.get(Calendar.DAY_OF_MONTH);
        return new Integer(Oval).toString();
    }

    public static String getoMois(Date Odate) {
        Calendar cal = Calendar.getInstance();
        cal.setTime(Odate);
        int Oval = cal.get(Calendar.MONTH);
        return new Integer(Oval + 1).toString();
    }

    public static String getoAnnee(Date Odate) {
        Calendar cal = Calendar.getInstance();
        cal.setTime(Odate);
        int Oval = cal.get(Calendar.YEAR);
        return new Integer(Oval).toString();
    }

    public static Date getDate(String str_Date, String Str_Time) {
        int h = 0, mm = 0;
        Date result = new Date();
        try {

            String[] temp_3 = null;
            temp_3 = str_Date.split("/");
            String Ostr_Date = temp_3[0] + "-" + temp_3[1] + "-" + temp_3[2];
            String Ostr_HEURE = Str_Time + ":00";
            System.out.println(Ostr_HEURE);
            System.out.println(Ostr_Date);
            result = stringToDate(Ostr_Date + " " + Ostr_HEURE, formatterMysql);
            System.out.println(result);
        } catch (Exception e) {
            new logger().OCategory.fatal(e.getMessage());
        }
        return result;
    }

    public static Date getDate_12_H(String str_Date, String Str_Time) {
        int h = 0, mm = 0;

        Date result = new Date();
        String[] temp = null;
        String[] temp_2 = null;
        String[] temp_3 = null;
        temp_3 = str_Date.split("/");
        temp = Str_Time.split(" ");
        temp_2 = temp[0].split(":");
        System.out.println(temp[0]);
        if (temp[1].equals(commonparameter.PM)) {
            h = new Integer(temp_2[0]);
            h = h + 12;
            if (h == 24) {
                h = 0;
            }
        } else {
            h = new Integer(temp_2[0]);
        }

        String Ostr_Date = temp_3[0] + "-" + temp_3[1] + "-" + temp_3[2];

        String Ostr_HEURE = new Integer(h).toString() + ":" + temp_2[1] + ":00";
        System.out.println(Ostr_HEURE);
        System.out.println(Ostr_Date);
        result = stringToDate(Ostr_Date + " " + Ostr_HEURE, formatterMysql);
        System.out.println(result);
        return result;
    }

    public static String getTime(Date ODate) {
        String result = "";
        String Str_O_Date = DateToString(ODate, formatterMysql);
        String[] temp = null;
        temp = Str_O_Date.split(" ");
        result = temp[1];
        String[] temp_2 = null;
        temp_2 = result.split(":");
        result = temp_2[0] + ":" + temp_2[1];
        return result;
    }

    public String GetDateLikeFaceBook(Date ODate) {

        int oval = 0;

        oval = this.GetSecToSeparate(ODate, new Date());
        if (oval < 60) {
            return "Il ya " + oval + " Seconde(s)";
        }

        oval = this.GetMinuteToSeparate(ODate, new Date());
        if (oval < 60) {
            return "Il ya " + oval + " Minute(s)";
        }
        oval = this.GetHourToSeparate(ODate, new Date());
        if (oval < 60) {
            return "Il ya " + oval + " Heure(s)";
        }
        oval = this.GetDayToSeparate(ODate, new Date());
        // if(oval < 24){
        return this.DateToString(ODate, formatterUI);
        // }

        //  return oval+" ";
    }

    public static String getTime_12_H(Date ODate) {
        String result = "";
        String Str_O_Date = DateToString(ODate, formatterMysql);
        String[] temp = null;
        temp = Str_O_Date.split(" ");
        result = temp[1];
        String[] temp_2 = null;
        temp_2 = result.split(":");
        int h = new Integer(temp_2[0]);
        if (h < 13) {

            result = h + ":" + temp_2[1] + " AM";
        } else {
            h = h - 12;
            result = h + ":" + temp_2[1] + " PM";
        }

        return result;
    }

    public static int getAge(Date Odate) {

        Date now = new Date();

        Calendar calnow = Calendar.getInstance();
        calnow.setTime(now);
        now = calnow.getTime();

        Calendar calOdate = Calendar.getInstance();
        calOdate.setTime(Odate);
        Odate = calOdate.getTime();

        System.out.println(now);
        System.out.println(Odate);

        int annee = calnow.get(Calendar.YEAR) - calOdate.get(Calendar.YEAR);
        return annee;
    }

    public static String GetNumberRandom(int debut, int fin) {
        int rand = new Integer(GetNumberRandom(fin));
        while (rand < debut) {
            rand = new Integer(GetNumberRandom(fin));
        }
        while (rand == debut) {
            rand = new Integer(GetNumberRandom(fin));
        }
        new logger().OCategory.fatal(rand);
        return rand + "";
    }

    //premier jour du mois passé
    public Date getFirstDayofPreviousMonth() {
        Calendar cal = Calendar.getInstance();

        cal.add(Calendar.MONTH, -1);

        cal.set(Calendar.DATE, 1);
        Date firstDateOfPreviousMonth = cal.getTime();

        new logger().OCategory.info("firstDateOfPreviousMonth " + firstDateOfPreviousMonth);

        return firstDateOfPreviousMonth;
    }
    //fin premier jour du mois passé

    //dernier jour du mois passé
    public Date getLastDayofPreviousMonth() {
        Calendar cal = Calendar.getInstance();

        cal.add(Calendar.MONTH, -1);

        cal.set(Calendar.DATE, cal.getActualMaximum(Calendar.DATE)); // changed calendar to cal

        Date lastDateOfPreviousMonth = cal.getTime();
        new logger().OCategory.info("lastDateOfPreviousMonth " + lastDateOfPreviousMonth);

        return lastDateOfPreviousMonth;
    }
    //fin dernier jour du mois passé

    //comparer deux dates 
    public int compareTwoDate(Date date1, Date date2) {
        int result = date1.compareTo(date2);
        if (result > 0) {
            System.out.println("Date1 is after Date2");
        } else if (result < 0) {
            System.out.println("Date1 is before Date2");
        } else if (result == 0) {
            System.out.println("Date1 is equal to Date2");
        } else {
            System.out.println("How to get here?");
        }
        new logger().OCategory.info("result " + result);
        return result;
    }
    //fin comparer deux dates 

    //premier jour du mois prochain
    public Date getFirstDayofNextMonth() {
        Calendar cal = Calendar.getInstance();

        cal.add(Calendar.MONTH, +1);

        cal.set(Calendar.DATE, 1);
        Date firstDateOfNextMonth = cal.getTime();

        new logger().OCategory.info("firstDateOfNextMonth " + firstDateOfNextMonth);

        return firstDateOfNextMonth;
    }
    //fin premier jour du mois prochain

    //dernier jour du mois prochain
    public Date getLastDayofNextMonth() {
        Calendar cal = Calendar.getInstance();

        cal.add(Calendar.MONTH, +1);

        cal.set(Calendar.DATE, cal.getActualMaximum(Calendar.DATE)); // changed calendar to cal

        Date lastDateOfNextMonth = cal.getTime();
        new logger().OCategory.info("lastDateOfNextMonth " + lastDateOfNextMonth);

        return lastDateOfNextMonth;
    }
    //fin dernier jour du mois prochain

    //difference entre deux date
    public static long getDifferenceBetweenDate(Date dtDEBUT, Date dtFIN) {
        long diffenrece;
        diffenrece = dtFIN.getTime() - dtDEBUT.getTime();
        diffenrece = diffenrece / 1000 / 60 / 60 / 24;
        new logger().OCategory.info("diffenrece " + diffenrece);
        return diffenrece;
    }
    //fin difference entre deux date

    //premier jour d'un mois donné
    public static Date getFirstDayofSomeMonth(int i) {
        Calendar cal = Calendar.getInstance();

        cal.add(Calendar.MONTH, i);

        cal.set(Calendar.DATE, 1);
        Date firstDateOfSomeMonth = cal.getTime();

        new logger().OCategory.info("firstDateOfSomeMonth " + firstDateOfSomeMonth);

        return firstDateOfSomeMonth;

    }
    //fin premier jour d'un mois donné

    //dernier jour d'un mois donné
    public Date getLastDayofPreviousMonth(int i) {
        Calendar cal = Calendar.getInstance();

        cal.add(Calendar.MONTH, i);

        cal.set(Calendar.DATE, cal.getActualMaximum(Calendar.DATE)); // changed calendar to cal

        Date lastDateOfPreviousMonth = cal.getTime();
        new logger().OCategory.info("lastDateOfPreviousMonth " + lastDateOfPreviousMonth);

        return lastDateOfPreviousMonth;
    }
    //fin dernier jour d'un mois donné

    /*
   
    
     */
    //dernier jour d'un mois donné
    public static Date getLastDayofSomeMonth(int i) {
        Calendar cal = Calendar.getInstance();

        cal.add(Calendar.MONTH, i);

        cal.set(Calendar.DATE, cal.getActualMaximum(Calendar.DATE)); // changed calendar to cal

        Date lastDateOfSomeMonth = cal.getTime();
        new logger().OCategory.info("lastDateOfSomeMonth " + lastDateOfSomeMonth);

        return lastDateOfSomeMonth;
    }
    //fin dernier jour d'un mois donné

    //jour d'un mois donné
    public Date getDayofSomeMonth(int i, int j) {
        Calendar cal = Calendar.getInstance();

        cal.add(Calendar.MONTH, i);

        cal.set(Calendar.DATE, j);
        Date dateOfSomeMonth = cal.getTime();

        new logger().OCategory.info("dateOfSomeMonth " + dateOfSomeMonth);

        return dateOfSomeMonth;
    }
    //fin premier jour d'un mois donné

    public void checkDate(Date date) {
        //Date date; // your date
        Calendar cal = Calendar.getInstance();
        cal.setTime(date);
        int year = cal.get(Calendar.YEAR);
        int month = cal.get(Calendar.MONTH);
        int day = cal.get(Calendar.DAY_OF_MONTH);
    }

    public Date getDayofSomeMonthAndYear(int i, int j, int k) {
        Calendar cal = Calendar.getInstance();

        cal.set(Calendar.DATE, i);
        cal.set(Calendar.MONTH, j - 1);
        cal.set(Calendar.YEAR, k);
        Date dateOfSomeMonth = cal.getTime();

        new logger().OCategory.info("dateOfSomeMonth " + dateOfSomeMonth);

        return dateOfSomeMonth;
    }

    public static Date getPreviousMonth(Date datevalue) {
        Calendar cal = Calendar.getInstance();
        cal.setTime(datevalue);
        cal.add(Calendar.MONTH, -1);

        return cal.getTime();
    }

    /*  fonction pour avoir les trois mois avant    */

    public static Date getPreviousMonth2(Date datevalue) {
        Calendar cal = Calendar.getInstance();
        cal.setTime(datevalue);
        cal.add(Calendar.MONTH, -1);
        int year = cal.get(Calendar.YEAR);
        int month = cal.get(Calendar.MONTH);
        int day = cal.getActualMinimum(Calendar.DAY_OF_MONTH);
        cal.set(year, month, day);

        return cal.getTime();
    }

    public static Date getPreviousQuarter(Date datevalue) {
        Calendar cal = Calendar.getInstance();
        cal.setTime(datevalue);
        cal.add(Calendar.MONTH, -3);
        int year = cal.get(Calendar.YEAR);
        int month = cal.get(Calendar.MONTH);
        int day = cal.getActualMinimum(Calendar.DAY_OF_MONTH);
        cal.set(year, month, day);
        return cal.getTime();
    }

    public static Date getPreviousHalfYear(Date datevalue) {
        Calendar cal = Calendar.getInstance();

        cal.setTime(datevalue);
        cal.add(Calendar.MONTH, -6);
        int year = cal.get(Calendar.YEAR);
        int month = cal.get(Calendar.MONTH);
        int day = cal.getActualMinimum(Calendar.DAY_OF_MONTH);
        cal.set(year, month, day);
        return cal.getTime();
    }

    public static Date getPreviousHalfYearIncludeCurrentMonth(Date datevalue) {
        Calendar cal = Calendar.getInstance();

        cal.setTime(datevalue);
        cal.add(Calendar.MONTH, -6);
        int year = cal.get(Calendar.YEAR);
        int month = cal.get(Calendar.MONTH);
        int day = cal.getActualMaximum(Calendar.DAY_OF_MONTH);
        cal.set(year, month, day);
        return cal.getTime();
    }

    public static Date getPreviousCurrenrHalfYear() {
        Calendar cal = Calendar.getInstance();

        cal.setTime(new Date());
        cal.add(Calendar.MONTH, -5);
        int year = cal.get(Calendar.YEAR);
        int month = cal.get(Calendar.MONTH);
        int day = cal.getActualMaximum(Calendar.DAY_OF_MONTH);
        cal.set(year, month, day);
        return cal.getTime();
    }

    public static Date getHalfYear(Date datevalue) {
        Calendar cal = Calendar.getInstance();
        cal.setTime(datevalue);
        cal.add(Calendar.MONTH, 5);
        int year = cal.get(Calendar.YEAR);
        int month = cal.get(Calendar.MONTH);
        int day = cal.getActualMaximum(Calendar.DAY_OF_MONTH);
        cal.set(year, month, day, 23, 59, 59);
        return cal.getTime();
    }

    public static Date getQuarter(Date datevalue) {
        Calendar cal = Calendar.getInstance();
        cal.setTime(datevalue);
        cal.add(Calendar.MONTH, 2);
        int year = cal.get(Calendar.YEAR);
        int month = cal.get(Calendar.MONTH);
        int day = cal.getActualMaximum(Calendar.DAY_OF_MONTH);
        cal.set(year, month, day, 23, 59, 59);
        return cal.getTime();
    }

    public static Date getPreviousYear(Date datevalue) {
        Calendar cal = Calendar.getInstance();
        cal.setTime(datevalue);
        cal.add(Calendar.YEAR, -1);
        return cal.getTime();
    }

    public static Date getcurrentMonthWithMaximunDays(Date datevalue) {
        Calendar cal = Calendar.getInstance();
        cal.setTime(datevalue);
        int year = cal.get(Calendar.YEAR);
        int month = cal.get(Calendar.MONTH);
        int day = cal.getActualMaximum(Calendar.DAY_OF_MONTH);
        cal.set(year, month, day);
        return cal.getTime();
    }

    public static Date getcurrentMonthWithMinimunDays(Date datevalue) {
        Calendar cal = Calendar.getInstance();
        cal.setTime(datevalue);
        int year = cal.get(Calendar.YEAR);
        int month = cal.get(Calendar.MONTH);
        int day = cal.getActualMinimum(Calendar.DAY_OF_MONTH);
        cal.set(year, month, day, 0, 0, 0);
        return cal.getTime();
    }

    public static Date getPreviousMonth(int i) {
        Calendar cal = Calendar.getInstance();

        cal.add(Calendar.MONTH, -i);
        int year = cal.get(Calendar.YEAR);
        int month = cal.get(Calendar.MONTH);
        int day = cal.getActualMinimum(Calendar.DAY_OF_MONTH);
        cal.set(year, month, day);

        return cal.getTime();
    }
}
