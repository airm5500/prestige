package util;

import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Date;
import java.util.Objects;
import org.apache.commons.lang3.StringUtils;

/**
 * @author koben
 */
public final class DateUtil {

    public static LocalDate getLastMonthFromDate(LocalDate date) {
        Objects.requireNonNull(date, "Le parametre de doit pas être null");
        LocalDate lastMonth = date.minusMonths(1);
        return LocalDate.of(lastMonth.getYear(), lastMonth.getMonth(), lastMonth.lengthOfMonth());
    }

    public static LocalDate getLastMonthFromNow() {
        LocalDate lastMonth = LocalDate.now().minusMonths(1);
        return LocalDate.of(lastMonth.getYear(), lastMonth.getMonth(), lastMonth.lengthOfMonth());
    }

    public static LocalDate getNthLastMonthFromNow(int nthnMoth) {
        LocalDate lastMonth = LocalDate.now().minusMonths(nthnMoth);
        return LocalDate.of(lastMonth.getYear(), lastMonth.getMonth(), 1);
    }

    public static String convertDateToDD_MM_YYYY(Date date) {
        DateFormat dateFormat = new SimpleDateFormat("dd/MM/yyyy");
        if (date != null) {
            return dateFormat.format(date);
        } else {
            return "";
        }
    }

    public static String convertDateToDD_MM_YYYY_HH_mm(Date date) {
        DateFormat dateFormat = new SimpleDateFormat("dd/MM/yyyy HH:mm");
        if (date != null) {
            return dateFormat.format(date);
        } else {
            return "";
        }
    }

    public static String convertDateToISO(Date date) {
        DateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd");
        if (date != null) {
            return dateFormat.format(date);
        } else {
            return "";
        }
    }

    public static String convertDate(Date date, SimpleDateFormat simpleDateFormat) {

        if (date != null) {
            return simpleDateFormat.format(date);
        } else {
            return "";
        }
    }

    public static String convertToString(Date date, SimpleDateFormat simpleDateFormat) {

        if (Objects.isNull(date)) {
            date = new Date();
        }
        return simpleDateFormat.format(date);
    }

    public static String convertToString(LocalDate date, DateTimeFormatter dateTimeFormatter) {

        if (Objects.isNull(date)) {
            date = LocalDate.now();
        }
        return dateTimeFormatter.format(date);
    }

    public static LocalDate convertStringToLocalDate(String date, DateTimeFormatter dateTimeFormatter) {

        if (StringUtils.isNotEmpty(date)) {
            return LocalDate.parse(date, dateTimeFormatter);
        }
        return LocalDate.now();
    }

    public static String convertDate(LocalDateTime date) {

        if (date != null) {
            return date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
        } else {
            return "";
        }
    }

    private DateUtil() {
    }

    public static LocalDate convertStringToDate(String date) {
        if (Objects.isNull(date)) {
            return null;
        }
        try {
            return LocalDate.parse(date, DateTimeFormatter.ofPattern("yyyyMMdd"));
        } catch (Exception e) {
            return null;
        }
    }

    public static String convertDateToString(LocalDate date) {
        if (Objects.isNull(date)) {
            return "";
        }
        try {
            return date.format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        } catch (Exception e) {
            return null;
        }
    }

    public static String convert(LocalDate date) {

        if (date != null) {
            return date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        } else {
            return null;
        }
    }

    public static Date from(LocalDate date) {

        if (date != null) {
            return DateCommonUtils.convertLocalDateToDate(date);
        } else {
            return null;
        }
    }

    public static LocalDate fromString(String date) {

        if (date != null) {
            return LocalDate.parse(date, DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        } else {
            return null;
        }
    }

    public static boolean validationDate(LocalDate startDate, LocalDate endDate) {
        return startDate.isAfter(endDate);
    }
}
