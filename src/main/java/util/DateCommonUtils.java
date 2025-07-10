package util;

import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Date;
import java.util.Objects;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

/**
 *
 * @author koben
 */
public final class DateCommonUtils {

    private static final String DATE_FORMAT_DD_MM_YYYY_HH_MM_SS = "dd/MM/yyyy HH:mm:ss";
    private static final String HH_MM_SS = "HH:mm:ss";

    public static String formatDate(@NotNull Date date) {
        Objects.requireNonNull(date);

        return new SimpleDateFormat(DATE_FORMAT_DD_MM_YYYY_HH_MM_SS).format(date);
    }

    public static String formatToHour(@NotNull Date date) {
        Objects.requireNonNull(date);

        return new SimpleDateFormat(HH_MM_SS).format(date);
    }

    public static String formatDate(Date date, @NotBlank String dateFormat) {
        Objects.requireNonNull(date);
        Objects.requireNonNull(dateFormat);
        return new SimpleDateFormat(dateFormat).format(date);

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

    public static LocalDateTime convertLocalDateToLocalDateTime(LocalDate dateToConvert) {
        Objects.requireNonNull(dateToConvert);
        return dateToConvert.atStartOfDay();
    }

    private DateCommonUtils() {
    }

    public static String formatCurrentDate() {

        return LocalDateTime.now().format(DateTimeFormatter.ofPattern(DATE_FORMAT_DD_MM_YYYY_HH_MM_SS));
    }

    public static String formatLocalDateTime(@NotNull LocalDateTime dateToFormat, DateTimeFormatter dtf) {
        Objects.requireNonNull(dateToFormat);
        if (Objects.isNull(dtf)) {
            return dateToFormat.format(DateTimeFormatter.ofPattern(DATE_FORMAT_DD_MM_YYYY_HH_MM_SS));
        }

        return dateToFormat.format(dtf);

    }
}
