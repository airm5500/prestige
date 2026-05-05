package util;

import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.util.Objects;

/**
 *
 * @author koben
 */
public final class NumberUtils {

    public static String formatLongToString(long number) {
        String result = "0";
        try {

            DecimalFormatSymbols amountSymbols = new DecimalFormatSymbols();

            amountSymbols.setGroupingSeparator(' ');

            DecimalFormat amountFormat = new DecimalFormat("###,###", amountSymbols);
            result = amountFormat.format(number);
        } catch (NumberFormatException ex) {

        }
        return result;
    }

    public static String formatIntToString(Integer number) {
        if (Objects.isNull(number)) {
            return "";
        }
        String result = "0";
        try {

            DecimalFormatSymbols amountSymbols = new DecimalFormatSymbols();

            amountSymbols.setGroupingSeparator(' ');

            DecimalFormat amountFormat = new DecimalFormat("###,###", amountSymbols);
            result = amountFormat.format(number);
        } catch (NumberFormatException ex) {

        }
        return result;
    }

    public static String formatIntToString(int number) {

        String result = "0";
        try {

            DecimalFormatSymbols amountSymbols = new DecimalFormatSymbols();

            amountSymbols.setGroupingSeparator(' ');

            DecimalFormat amountFormat = new DecimalFormat("###,###", amountSymbols);
            result = amountFormat.format(number);
        } catch (NumberFormatException ex) {

        }
        return result;
    }

    public static String formatIntToString(Double number) {
        if (Objects.isNull(number)) {
            return "";
        }
        String result = "0";
        try {

            DecimalFormatSymbols amountSymbols = new DecimalFormatSymbols();

            amountSymbols.setGroupingSeparator(' ');

            DecimalFormat amountFormat = new DecimalFormat("###,###", amountSymbols);
            result = amountFormat.format(number);
        } catch (NumberFormatException ex) {

        }
        return result;
    }

    public static Integer arrondiModuloOfNumber(Integer nbre, Integer modulo) {
        int result = 0;
        int tempModulo;
        float part;
        String tempV;
        try {

            tempV = String.valueOf(nbre).substring(String.valueOf(nbre).length() - 1, String.valueOf(nbre).length());

            tempModulo = Integer.valueOf(tempV) % modulo;

            part = (modulo - 1) / 2;

            result = ((part >= tempModulo) ? (nbre - tempModulo) : ((nbre - tempModulo) + modulo));

        } catch (NumberFormatException e) {

        }
        return result;
    }

    public static Integer doubleFromString(String doubleStringValue) {
        if (org.apache.commons.lang3.StringUtils.isEmpty(doubleStringValue)) {
            return null;
        }

        return (int) Double.parseDouble(doubleStringValue);

    }

    public static Integer intFromString(String intStringValue) {
        if (org.apache.commons.lang3.StringUtils.isEmpty(intStringValue)) {
            return null;
        }
        try {
            return Integer.valueOf(intStringValue);

        } catch (Exception e) {

            return doubleFromString(intStringValue);
        }

    }

    public static int arrondirAuMultipleDe5(int valeur) {
        return Math.round(valeur / 5f) * 5;
    }
}
