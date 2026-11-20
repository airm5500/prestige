package rest.report.excel;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Plan du 19/11, point 9 : codes non retenus d'un import dans l'onglet « Liste réserve » (inconnus, ambigus, en
 * double). Avant, l'ecran montrait au plus 30 codes inconnus sur une ligne et seulement le nombre de codes en double ;
 * la liste entiere s'exporte maintenant en Excel et s'imprime.
 * <p>
 * Les lignes sont construites a partir du resultat de l'import que l'ecran a recu (meme ordre que le panneau et que
 * l'impression de l'ecran) : inconnus, puis ambigus, puis en double, chacun dans l'ordre du fichier. Colonnes : motif,
 * code (texte : les zeros de tete restent), designation, detail.
 */
public final class ImportReserveExcel {

    public static final String INCONNU = "Inconnu";
    public static final String AMBIGU = "Ambigu";
    public static final String EN_DOUBLE = "En double";

    private ImportReserveExcel() {
    }

    /** Detail d'un code en double : « lu 3 fois », « même produit que 8177202 », ou les deux. */
    public static String detailEnDouble(JSONObject d) {
        List<String> l = new ArrayList<>();
        if (d.optInt("fois", 1) > 1) {
            l.add("lu " + d.optInt("fois") + " fois");
        }
        if (!d.optString("memeQue", "").isEmpty()) {
            l.add("même produit que " + d.optString("memeQue"));
        }
        return String.join(" ; ", l);
    }

    /** Lignes {motif, code, designation, detail}. */
    public static List<String[]> lignes(JSONObject resultat) {
        List<String[]> l = new ArrayList<>();
        JSONArray inconnus = resultat.optJSONArray("inconnus");
        for (int i = 0; inconnus != null && i < inconnus.length(); i++) {
            l.add(new String[] { INCONNU, inconnus.optString(i), "", "aucun produit ne porte ce code" });
        }
        JSONArray ambigus = resultat.optJSONArray("ambigus");
        for (int i = 0; ambigus != null && i < ambigus.length(); i++) {
            JSONObject a = ambigus.optJSONObject(i);
            if (a == null) {
                continue;
            }
            List<String> noms = new ArrayList<>();
            JSONArray p = a.optJSONArray("produits");
            for (int k = 0; p != null && k < p.length(); k++) {
                noms.add(p.optString(k));
            }
            l.add(new String[] { AMBIGU, a.optString("code"), String.join(" / ", noms), "à cocher à la main" });
        }
        JSONArray doubles = resultat.optJSONArray("enDouble");
        for (int i = 0; doubles != null && i < doubles.length(); i++) {
            JSONObject d = doubles.optJSONObject(i);
            if (d != null) {
                l.add(new String[] { EN_DOUBLE, d.optString("code"), d.optString("designation"), detailEnDouble(d) });
            }
        }
        return l;
    }

    public static byte[] construire(JSONObject resultat) throws IOException {
        List<String[]> l = lignes(resultat);
        int inconnus = 0;
        int ambigus = 0;
        int doubles = 0;
        for (String[] x : l) {
            inconnus += INCONNU.equals(x[0]) ? 1 : 0;
            ambigus += AMBIGU.equals(x[0]) ? 1 : 0;
            doubles += EN_DOUBLE.equals(x[0]) ? 1 : 0;
        }
        return new ClasseurExcel<String[]>("Codes non retenus").titre("IMPORT LISTE RÉSERVE : CODES NON RETENUS")
                .critere("Codes lus", resultat.optInt("lus", 0))
                .critere(inconnus + " inconnu(s) · " + ambigus + " ambigu(s) · " + doubles + " code(s) en double")
                .texte("Motif", x -> x[0]).texte("Code", x -> x[1]).texte("Désignation", x -> x[2])
                .texte("Détail", x -> x[3]).construire(l);
    }
}
