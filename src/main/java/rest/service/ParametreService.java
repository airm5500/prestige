package rest.service;

import javax.ejb.Local;

/**
 *
 * @author koben
 */
@Local
public interface ParametreService {

    boolean isEnable(String key);

    boolean chekIsEnable(String key);

    /** Valeur brute (str_VALUE) d'un parametre, ou defaultValue si absent. */
    String getValue(String key, String defaultValue);
}
