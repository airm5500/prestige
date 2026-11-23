package rest.report.excel;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONObject;

/**
 * Retour du 22/11 (lot 9) : export Excel et CSV de la liste des ventes annulees (menu « Liste des ventes annulées »).
 * Memes lignes que l'ecran (criteres et ordre), toutes pages, memes colonnes, et une derniere ligne TOTAL (nombre de
 * ventes, somme des montants).
 */
public final class VentesAnnuleesExport {

    /** Colonnes, dans l'ordre de l'ecran : titre et cle de la ligne JSON. */
    static final String[][] COLONNES = { { "Référence", "strREF" }, { "Type de vente", "strTYPEVENTE" },
            { "Montant", "intPRICE" }, { "Date vente", "dtCREATED" }, { "Heure vente", "HEUREVENTE" },
            { "Date annulation", "dateAnnulation" }, { "Heure annulation", "heureAnnulation" },
            { "Opérateur", "userFullName" }, { "Vendeur", "userVendeurName" }, { "Caissier", "userCaissierName" },
            { "Motif", "motif" } };

    private static final DateTimeFormatter JJ = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private VentesAnnuleesExport() {
    }

    public static String periode(LocalDate du, LocalDate au) {
        return (du == null ? "" : du.format(JJ)) + " au " + (au == null ? "" : au.format(JJ));
    }

    /** Somme des montants des lignes. */
    public static long total(List<JSONObject> lignes) {
        long t = 0;
        for (JSONObject l : lignes) {
            t += l.optLong("intPRICE", 0L);
        }
        return t;
    }

    /** Lignes de l'ecran suivies de la ligne TOTAL. */
    static List<JSONObject> avecTotal(List<JSONObject> lignes) {
        List<JSONObject> l = new ArrayList<>(lignes);
        l.add(new JSONObject().put("strREF", "TOTAL").put("strTYPEVENTE", lignes.size() + " vente(s)")
                .put("intPRICE", total(lignes)).put("total", true));
        return l;
    }

    public static byte[] xlsx(List<JSONObject> lignes, String periode, String recherche, String motif)
            throws IOException {
        ClasseurExcel<JSONObject> c = new ClasseurExcel<JSONObject>("Ventes annulées")
                .titre("LISTE DES VENTES ANNULÉES").critere("Période", periode);
        if (StringUtils.isNotBlank(recherche)) {
            c.critere("Recherche", recherche);
        }
        if (StringUtils.isNotBlank(motif)) {
            c.critere("Motif", motif);
        }
        for (String[] col : COLONNES) {
            if ("intPRICE".equals(col[1])) {
                c.nombre(col[0], o -> o.optLong(col[1], 0L));
            } else {
                c.texte(col[0], o -> o.optString(col[1], ""));
            }
        }
        return c.construire(avecTotal(lignes));
    }

    /** CSV (UTF-8 avec BOM, « ; ») : montants en nombres entiers, sans separateur de milliers. */
    public static byte[] csv(List<JSONObject> lignes) {
        StringBuilder sb = new StringBuilder("﻿");
        for (int i = 0; i < COLONNES.length; i++) {
            sb.append(i == 0 ? "" : ";").append(champ(COLONNES[i][0]));
        }
        sb.append("\r\n");
        for (JSONObject o : avecTotal(lignes)) {
            for (int i = 0; i < COLONNES.length; i++) {
                String cle = COLONNES[i][1];
                String v = "intPRICE".equals(cle) ? String.valueOf(o.optLong(cle, 0L)) : o.optString(cle, "");
                sb.append(i == 0 ? "" : ";").append(champ(v));
            }
            sb.append("\r\n");
        }
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    /** Champ entre guillemets ; une valeur qui commence par = + - @ est neutralisee (formule de tableur). */
    static String champ(String v) {
        String s = StringUtils.defaultString(v);
        if (!s.isEmpty() && "=+-@".indexOf(s.charAt(0)) >= 0 && !s.matches("-?\\d+")) {
            s = "'" + s;
        }
        return "\"" + s.replace("\"", "\"\"") + "\"";
    }
}
