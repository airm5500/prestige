/*
 * conversion.java
 *
 * Created on 2 septembre 2008, 04:56
 *
 * To change this template, choose Tools | Template Manager
 * and open the template in the editor.
 */
package toolkits.utils;

import com.ibm.icu.text.RuleBasedNumberFormat;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.util.Locale;

import toolkits.parameters.commonEnumm;

/**
 *
 * @author Administrateur
 */
public class conversion {

    /**
     * Creates a new instance of conversion
     */
    public static String End_Time = "", Start_Time = "";

    public conversion() {
    }

    public static String DecryptStr_DATE_TIME(String Str_DATE_TIME) {
        int k = 0;
        String[] temp = null;
        temp = Str_DATE_TIME.split("/");
        return temp[2] + "-" + temp[1] + "-" + temp[0] + " 00:00:00";
    }

    public static void Decrypt_TIME(String Time_Period) {
        int k = 0;
        String[] temp = null;
        temp = Time_Period.split(" - ");
        Start_Time = temp[0];
        End_Time = temp[1];
    }

    public static String convertFromMillisToTimeAITA_FORMAT(long MM, String pattern) {
        long heures = MM / 60L;
        MM -= heures * 60L;
        return String.format("%02d:%02d", heures, MM);
    }

    public static String convertFromMillisToTime(long MM, String pattern) {
        long heures = MM / 60L;
        MM -= heures * 60L;
        String patern_ = ":00";
        return String.format("%02d:%02d", heures, MM) + "" + patern_;
    }

    public static String convertFromMillisToTimeToCustom(long MM, String pattern) {
        long heures = MM / 60L;
        long SS = 0;
        MM -= heures * 60L;
        return String.format("%02dhr %02dmn", heures, MM);
    }

    public static String convertFromMillisToTimeToCustom(long MM) {
        String result_ = "";
        long Day = MM / 1440L;
        long heures = MM / 60L;
        long SS = 0;
        MM -= Day * 1440L;
        heures = MM / 60L;
        MM -= heures * 60L;
        if (Day > 0) {

            result_ = String.format("%01dday %02dhr %02dmn", Day, heures, MM);
        } else {
            result_ = String.format("%02dhr %02dmn", heures, MM);
        }

        return result_;
    }

    public static long getlg_TIME(String MM) {
        long templg_TIME = 0;
        String[] temp = null;
        temp = MM.split(":");
        templg_TIME = (Long.parseLong(temp[0]) * 60) + (Long.parseLong(temp[1]));
        return templg_TIME;
    }

    public static double StringToDouble(String value_) {
        return Double.parseDouble(value_);
    }

    public static String DoubleFormatToAmount(double montant) {
        DecimalFormat df = new DecimalFormat();
        df.setMaximumFractionDigits(0); //arrondi � 2 chiffres apres la virgules
        df.setMinimumFractionDigits(0);
        return df.format(montant).toString();
    }

    public Boolean isDouble(String val) {
        try {
            char[] all = val.toCharArray();
            boolean kommata = false;
            for (int i = 0; i <= all.length - 1; i++) {
                if (Character.isDigit(all[i])) {
                } else if (all[i] == '.' || all[i] == ',') {
                    if (kommata == true) {
                        return false;
                    }
                    kommata = true;
                } else {
                    return false;
                }
            }
            return true;
        } catch (Exception ex) {
            return false;
        }
    }

    public int StringToInt(String Ovalue) {
        return Integer.parseInt(Ovalue);
    }

    public static String PhoneNumberFormat(String Str_country_indicatif, String str_phone_number) {
        try {
            long lg_phone_number = Long.parseLong(str_phone_number);

            DecimalFormatSymbols phoneNumberSymbols = new DecimalFormatSymbols();
            // Use space not comma to thousands: 10 000 not 10,000.
            phoneNumberSymbols.setGroupingSeparator('-');
            DecimalFormat phoneNumberFormat = new DecimalFormat("##,##,##,##", phoneNumberSymbols);
            String result_phone = phoneNumberFormat.format(lg_phone_number).toString();

            if (result_phone.length() < 11) {
                result_phone = "0" + result_phone;
            }

            return "(" + Str_country_indicatif + ") " + result_phone;
        } catch (Exception e) {
        }
        return Str_country_indicatif;
    }
  public static String PhoneNumberFormat( String str_phone_number) {
        String result_phone="";
      try {
            long lg_phone_number = Long.parseLong(str_phone_number);

            DecimalFormatSymbols phoneNumberSymbols = new DecimalFormatSymbols();
            // Use space not comma to thousands: 10 000 not 10,000.
            phoneNumberSymbols.setGroupingSeparator('-');
            DecimalFormat phoneNumberFormat = new DecimalFormat("##,##,##,##", phoneNumberSymbols);
            result_phone = phoneNumberFormat.format(lg_phone_number).toString();

            if (result_phone.length() < 11) {
                result_phone = "0" + result_phone;
            }

            
        } catch (Exception e) {
        }
        return  result_phone;
    }

    
    public static Double convertIntToDouble(int number) {
        Double result = 0.0;
        try {
            result = new Double(number +"");
        } catch (Exception e) {
        }
        return result;
    }
    
    public static String AmountFormat(Integer Amount) {
        String result = "0";
        try {
            long lg_Amount = Long.parseLong(Amount.toString());

            DecimalFormatSymbols AmountSymbols = new DecimalFormatSymbols();
            // Use space not comma to thousands: 10 000 not 10,000.
            AmountSymbols.setGroupingSeparator(' ');
            DecimalFormat AmountFormat = new DecimalFormat("###,###", AmountSymbols);
            result = AmountFormat.format(lg_Amount).toString();
        } catch (Exception ex) {
            new logger().OCategory.error(date.GetDateNow() + " AmountFormat " + ex.getMessage());
        }
        return result;
    }
    
    public static String AmountFormat(Integer Amount, char separator) {
        String result = "0";
        try {
            long lg_Amount = Long.parseLong(Amount.toString());

            DecimalFormatSymbols AmountSymbols = new DecimalFormatSymbols();
            // Use space not comma to thousands: 10 000 not 10,000.
            AmountSymbols.setGroupingSeparator(separator);
            DecimalFormat AmountFormat = new DecimalFormat("###,###", AmountSymbols);
            result = AmountFormat.format(lg_Amount).toString();
        } catch (Exception ex) {
            new logger().OCategory.error(date.GetDateNow() + " AmountFormat " + ex.getMessage());
        }
        return result;
    }
    
  
    public static String GetDay_Of_Week(int nb_Day_Of_Week) {
        String tempdAY = "";
        if (nb_Day_Of_Week == 1) {
            tempdAY = commonEnumm.DAY_LUNDI;
        } else if (nb_Day_Of_Week == 2) {
            tempdAY = commonEnumm.DAY_MARDI;
        } else if (nb_Day_Of_Week == 3) {
            tempdAY = commonEnumm.DAY_MERCREDI;
        } else if (nb_Day_Of_Week == 4) {
            tempdAY = commonEnumm.DAY_JEUDI;
        } else if (nb_Day_Of_Week == 5) {
            tempdAY = commonEnumm.DAY_VENDREDI;
        } else if (nb_Day_Of_Week == 6) {
            tempdAY = commonEnumm.DAY_SAMEDI;
        } else if (nb_Day_Of_Week == 7) {
            tempdAY = commonEnumm.DAY_DIMANCHE;
        }
        return tempdAY;
    }

    public static String GetPhoneNumberBy(String ligne) {
        String temp_ = ligne;
        try {
            ligne = ligne.replace("(", "'");
            ligne = ligne.replace(")", "'");
            String[] temp = null;
            temp = ligne.split("'");
            temp_ = temp[1];
        } catch (Exception ex) {
        }
        return temp_;
    }

    public static Boolean IntToBoolean(Integer Ovalue) {
        Boolean flag2 = (Ovalue == 1) ? true : false;
        return flag2;
    }

    public Integer BooleanToInt(Boolean Ovalue) {
        int value = 0;
        if (Ovalue) {
            value = 1;
        }
        return value;
    }

    public static Boolean StringToBoolean(String Ovalue) {

        System.out.println(" Ovalue : " + Ovalue);
        Boolean flag2 = (Ovalue.equals("true")) ? true : false;
        return flag2;
    }

    public String BooleanToString(Boolean Ovalue) {
        String value = "false";
        if (Ovalue) {
            value = "true";
        }
        return value;
    }

    public static String GetNumberTowords(Double num) {

        RuleBasedNumberFormat formatter = new RuleBasedNumberFormat(Locale.FRANCE, RuleBasedNumberFormat.SPELLOUT);
        String result = formatter.format(num);
       // System.out.println(result);
        return result;

    }
    
    public static int division(int a, int b) {
        int mod = 0, result = 0;
        mod = a % b; 
        if(mod != 0) {
            mod = 1;
        }
        result = (a/b) + mod;
        new logger().OCategory.info("result "+result);
       return result;
    }
}
