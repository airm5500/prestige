package util;

import com.ibm.icu.text.RuleBasedNumberFormat;
import dal.TPrivilege;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Year;
import java.util.List;
import java.util.Locale;

import java.util.stream.IntStream;

/**
 *
 * @author koben
 */
public final class CommonUtils {

    private static final int BEGIN = 2015;

    public static int[] getYears() {
        return IntStream.rangeClosed(Year.of(BEGIN).getValue(), Year.now().getValue()).toArray();
    }

    private CommonUtils() {

    }

    public static String encodeString(String key) {
        byte[] uniqueKey = key.getBytes();

        byte[] hash;
        try {
            hash = MessageDigest.getInstance("MD5").digest(uniqueKey);
        } catch (NoSuchAlgorithmException var6) {
            throw new Error("no MD5 support in this VM");
        }

        StringBuilder hashString = new StringBuilder();

        for (int i = 0; i < hash.length; ++i) {
            String hex = Integer.toHexString(hash[i]);
            if (hex.length() == 1) {
                hashString.append('0');
                hashString.append(hex.charAt(hex.length() - 1));
            } else {
                hashString.append(hex.substring(hex.length() - 2));
            }
        }

        return hashString.toString();
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

    public static boolean isCashTypeReglement(String reglId) {
        return Constant.MODE_ESP.equals(reglId);
    }

    public static boolean isMobileTypeReglement(String reglId) {

        return Constant.MODE_DJAMO.equals(reglId) || Constant.MODE_WAVE.equals(reglId)
                || Constant.TYPE_REGLEMENT_ORANGE.equals(reglId) || Constant.MODE_MOOV.equals(reglId)
                || Constant.MODE_MTN.equals(reglId) || Constant.MODE_CB.equals(reglId);
    }
}
