/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package toolkits.utils;

import java.text.NumberFormat;
import java.text.ParseException;
import java.time.LocalDate;
import java.time.Month;
import java.time.Period;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 *
 * @author KKOFFI
 */
public class Util {
public static final String ACTIONDELETEINVOICE="03092017";
public static final String ACTIONDELETERETOUR="030920171";
public static final String ACTIONDELETEAJUSTEMENT="030920172";
public static final String MVTSORTIE="Sorties de caisse";
    public static JSONObject getYearsInterval() {
        JSONObject data = new JSONObject();
        try {

            JSONArray array = new JSONArray();
            LocalDate start = LocalDate.of(2015, Month.JANUARY, 1);
            LocalDate now = LocalDate.now();
            Period p = Period.between(start, now);

            for (int i = 0; i <= p.getYears(); i++) {
                try {
                    JSONObject js = new JSONObject();
                    js.put("id", i);
                    js.put("YEAR", (start.getYear() + i));
                    array.put(i, js);
                } catch (JSONException ex) {

                }
            }
            data.put("data", array);
            data.put("total", array.length());

        } catch (JSONException ex) {

        }
        return data;
    }

 public   static String getFormattedLongValue(long x) {
        return NumberFormat.getInstance(Locale.FRANCE).format(x);
    }

 public   static String getFormattedDoubleValue(double x) {
        return NumberFormat.getInstance(Locale.FRANCE).format(x);
    }

 public    static String getFormattedIntegerValue(Integer x) {
        return NumberFormat.getInstance(Locale.FRANCE).format(x);
    }
 public static long formatStringToLong(String x ){
       
     try {
            return NumberFormat.getInstance(Locale.FRANCE).parse(x).longValue();
        } catch (ParseException ex) {
           
            return 0l;
            
        }
 }
  public static Integer formatStringToInt(String x ){
       
     try {
            return NumberFormat.getInstance(Locale.FRANCE).parse(x).intValue();
        } catch (ParseException ex) {
           
            return 0;
            
        }
 }
}
