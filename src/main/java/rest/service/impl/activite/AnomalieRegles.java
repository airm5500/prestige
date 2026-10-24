package rest.service.impl.activite;

import java.util.ArrayList;
import java.util.List;
import org.apache.commons.lang3.StringUtils;
import rest.service.dto.AnomalieDTO;
import util.Constant;

/**
 * Regles d'enregistrement d'une anomalie (retour du 24/10), sans base de donnees : famille connue, textes nettoyes
 * (balises retirees) et bornes, fil limite aux dernieres actions. Rend null si l'anomalie est a ignorer.
 */
public final class AnomalieRegles {

    public static final String REFUS = "REFUS";
    public static final String LOGICIEL = "LOGICIEL";

    private AnomalieRegles() {
    }

    public static AnomalieDTO nettoyer(AnomalieDTO d) {
        if (d == null) {
            return null;
        }
        String famille = StringUtils.upperCase(StringUtils.trimToEmpty(d.getFamille()));
        if (!REFUS.equals(famille) && !LOGICIEL.equals(famille)) {
            return null;
        }
        String message = texte(d.getMessage(), 300);
        if (message == null) {
            return null;
        }
        List<String> fil = new ArrayList<>();
        List<String> brut = d.getFil() == null ? new ArrayList<>() : d.getFil();
        for (String e : brut.subList(Math.max(0, brut.size() - Constant.ANOMALIE_FIL_MAX), brut.size())) {
            String t = texte(e, 200);
            if (t != null) {
                fil.add(t);
            }
        }
        return AnomalieDTO.builder().famille(famille).code(texte(d.getCode(), 80)).message(message)
                .ecran(texte(d.getEcran(), 120)).fil(fil).build();
    }

    /** Texte sans balises ni espaces superflus, borne ; null s'il est vide. */
    static String texte(String s, int max) {
        if (s == null) {
            return null;
        }
        String t = s.replaceAll("(?i)<br\\s*/?>", " ").replaceAll("<[^>]*>", "").replace("&nbsp;", " ")
                .replaceAll("[\\p{Cntrl}&&[^\\n]]", " ").replaceAll("\\s+", " ").trim();
        return t.isEmpty() ? null : StringUtils.abbreviate(t, max);
    }
}
