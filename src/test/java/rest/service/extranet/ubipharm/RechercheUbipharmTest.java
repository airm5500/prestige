package rest.service.extranet.ubipharm;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;
import rest.service.extranet.commun.ExtranetException;
import rest.service.extranet.commun.FauxExtranet;
import rest.service.extranet.commun.FauxExtranet.Appel;
import rest.service.extranet.commun.FauxExtranet.Reponse;
import rest.service.extranet.commun.SourceExtranet;
import rest.service.extranet.commun.TransportExtranet;

/**
 * Recherche Ubipharm par CIP, libelle ou DCI (demande du 08/11) contre un faux extranet local, au format releve le
 * 08/11 ({msg, datatables}). Rapprochement : chaque produit renvoye est compare a sa source (reference, designation,
 * CIP, statut, disponibilite, prix, colisage). GET seulement, motif et filtres transmis tels que la page les envoie.
 */
class RechercheUbipharmTest {

    static String cellueProduit(String pscode, String lib, String cip) {
        return "<a class='popup-produit' data-pscode='" + pscode + "' data-sheettype='P' href='#'>" + lib + "</a>"
                + "<div class='td-detail'>" + pscode + " - " + cip
                + "</div><div class='td-detail'>Catégorie : Méd</div>";
    }

    static JSONArray ligne(String pscode, String lib, String cip, String statut, String prix, String colisage) {
        return new JSONArray().put(cellueProduit(pscode, lib, cip)).put(statut)
                .put("<span class='badge'>En stock</span><div class='tooltip-stock'>CIP: " + cip + "</div>")
                .put("<div class='td-main'><span class='cell-pspttc'>" + prix + " CFA</span></div>")
                .put("<select class='form-control'><option>" + colisage + "</option><option>1</option></select>")
                .put("<div class='input-group'><input class='touchspin' value='0'></div>");
    }

    static Map<String, String> requete(String q) {
        Map<String, String> m = new LinkedHashMap<>();
        for (String p : q.split("&")) {
            int eg = p.indexOf('=');
            m.put(URLDecoder.decode(p.substring(0, eg), StandardCharsets.UTF_8),
                    URLDecoder.decode(p.substring(eg + 1), StandardCharsets.UTF_8));
        }
        return m;
    }

    @Test
    void rechercheParMotifGetSeulement() throws Exception {
        Random r = new Random(20261108);
        JSONArray data = new JSONArray();
        for (int i = 0; i < 60; i++) {
            data.put(ligne("PARA" + (100 + i), "PARACETAMOL " + (i * 50) + "MG", String.valueOf(3000000786700L + i),
                    i % 3 == 0 ? "Normal" : "Rupture", String.valueOf(500 + r.nextInt(5000)),
                    String.valueOf(1 + r.nextInt(400))));
        }
        try (FauxExtranet f = new FauxExtranet()) {
            f.routeAppel("/ReturnProduitsJSON",
                    a -> Reponse.json(new JSONObject().put("msg", "").put("datatables",
                            new JSONObject().put("recordsTotal", 446).put("recordsFiltered", 446).put("data", data))
                            .toString()));
            TransportExtranet t = f.transport(SourceExtranet.UBIPHARM, 0, "SESSIONID=essai");
            JSONObject res = RechercheUbipharm.rechercher(t, "  paracetamol  500 ", RechercheUbipharm.Champs.TOUT,
                    false, false);
            assertEquals(446, res.getInt("total"));
            assertTrue(res.getBoolean("tronque"));
            JSONArray l = res.getJSONArray("resultats");
            assertEquals(60, l.length());
            for (int i = 0; i < l.length(); i++) {
                JSONObject o = l.getJSONObject(i);
                JSONArray src = data.getJSONArray(i);
                assertEquals("PARA" + (100 + i), o.getString("pscode"));
                assertEquals("PARACETAMOL " + (i * 50) + "MG", o.getString("designation"));
                assertEquals(String.valueOf(3000000786700L + i), o.getString("cip"));
                assertEquals(src.getString(1), o.getString("statut"));
                assertTrue(o.getString("dispo").startsWith("En stock"), o.getString("dispo"));
                assertTrue(src.getString(3).contains(o.getString("prix").replace(" CFA", "")));
                assertTrue(src.getString(4).contains("<option>" + o.getString("colisage") + "</option>"));
            }
            List<Appel> appels = f.appels();
            assertEquals(1, appels.size());
            Appel a = appels.get(0);
            assertEquals("GET", a.methode, "lecture seule : aucun POST");
            assertEquals("XMLHttpRequest", a.ajax);
            assertTrue(a.referer.endsWith("/RechercheProduits"));
            Map<String, String> p = requete(a.requete);
            assertEquals("paracetamol 500", p.get("motifRecherche"), "espaces reduits");
            assertEquals("NAME,DCI", p.get("typeRecherche"));
            assertEquals("C", p.get("filtreRecherche"));
            assertEquals("false", p.get("filtreDispo"), "tous les produits, pas seulement en stock");
            assertEquals("100", p.get("length"));
            assertEquals("0", p.get("start"));
        }
    }

    @Test
    void parametresSelonLesChoix() {
        Map<String, String> p = RechercheUbipharm.parametres("3000000786710", RechercheUbipharm.Champs.CIP_LIBELLE,
                true, true);
        assertEquals("NAME", p.get("typeRecherche"));
        assertEquals("S", p.get("filtreRecherche"));
        assertEquals("true", p.get("filtreDispo"));
        assertEquals("DCI",
                RechercheUbipharm.parametres("x", RechercheUbipharm.Champs.DCI, false, false).get("typeRecherche"));
        assertEquals(RechercheUbipharm.Champs.TOUT, RechercheUbipharm.Champs.lire("n'importe"));
        assertNull(RechercheUbipharm.motif("a"));
        assertNull(RechercheUbipharm.motif("x".repeat(61)));
        assertEquals("ab", RechercheUbipharm.motif(" ab "));
    }

    @Test
    void reponsesRefusees() throws Exception {
        assertTrue(assertThrows(ExtranetException.class,
                () -> RechercheUbipharm.lire(new JSONObject().put("msg", "Session terminée"))).getMessage()
                        .contains("Session terminée"));
        JSONObject sansRef = new JSONObject().put("datatables", new JSONObject().put("recordsTotal", 1).put("data",
                new JSONArray().put(new JSONArray().put("<b>X</b>").put("").put("").put("").put(""))));
        assertTrue(assertThrows(ExtranetException.class, () -> RechercheUbipharm.lire(sansRef)).getMessage()
                .contains("sans référence"));
        JSONObject vide = new JSONObject().put("msg", "").put("datatables",
                new JSONObject().put("recordsTotal", 0).put("data", new JSONArray()));
        JSONObject r = RechercheUbipharm.lire(vide);
        assertEquals(0, r.getInt("total"));
        assertFalse(r.getBoolean("tronque"));
        assertThrows(IllegalArgumentException.class, () -> RechercheUbipharm.rechercher(null, "a", null, false, false));
        assertEquals("340",
                RechercheUbipharm.colisage("<select><option>1</option><option selected>340</option></select>"));
        assertEquals("12", RechercheUbipharm.colisage("12"));
    }
}
