package rest.service.facture;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

/**
 * Plan du 21/11, point 9 : regles de « Déjà facturé ? ». Une facture compte si elle est definitive et ni annulee par
 * avoir ni supprimee ; un bon est facture s'il est dans au moins une facture qui compte ; les factures annulees sont
 * listees a part ; la reponse compte exactement les bons factures.
 */
public class DejaFactureTest {

    private static final String[] STATUTS = { "enable", "paid", "is_Process", "avoir", "delete", "AVOIR" };
    private static final Integer[] TEMPLATES = { null, 0, 1 };

    @Test
    public void saisieEtMotifs() {
        assertNull(DejaFacture.saisie(null));
        assertNull(DejaFacture.saisie(" a "));
        assertEquals("KONAN AWA", DejaFacture.saisie("  KONAN    AWA "));
        assertEquals(60, DejaFacture.saisie(new String(new char[80]).replace('\0', 'x')).length());
        assertEquals(Arrays.asList("%KONAN%", "%AWA%"), DejaFacture.motifsNom("KONAN AWA"));
        assertEquals(Arrays.asList("%50\\%%", "%a\\_b%"), DejaFacture.motifsNom("50% a_b"), "% et _ neutralises");
        assertTrue(DejaFacture.motifsNom(null).isEmpty());
    }

    @Test
    public void casSimples() {
        assertTrue(DejaFacture.active("enable", null));
        assertTrue(DejaFacture.active("paid", 0));
        assertFalse(DejaFacture.active("avoir", 0), "annulee par avoir");
        assertFalse(DejaFacture.active("delete", null), "supprimee a l'ancienne");
        assertFalse(DejaFacture.active("enable", 1), "modele / provisoire");
        DejaFacture.Bon b = new DejaFacture.Bon();
        assertEquals(DejaFacture.NON_FACTURE, b.etat(), "sans facture : non facture");
        b.factures.add(new DejaFacture.Facture("F1", "1", new Date(1000), "avoir", 0, "A"));
        assertEquals(DejaFacture.NON_FACTURE, b.etat(), "seule facture annulee : non facture");
        assertEquals(1, b.annulees().size());
        b.factures.add(new DejaFacture.Facture("F2", "2", new Date(2000), "enable", 0, "A"));
        assertEquals(DejaFacture.FACTURE, b.etat(), "refacture apres l'avoir");
        assertEquals("F2", b.factureActive().id);
    }

    /** Coherence sur 5 000 bons tires au hasard (graine fixe), 0 a 4 factures chacun. */
    @Test
    public void coherenceSurDesMilliersDeBons() {
        Random r = new Random(21112026L);
        List<DejaFacture.Bon> bons = new java.util.ArrayList<>();
        int facturesAttendues = 0;
        for (int i = 0; i < 5000; i++) {
            DejaFacture.Bon b = new DejaFacture.Bon();
            b.id = "B" + i;
            b.montant = r.nextInt(3) == 0 ? 0 : 1 + r.nextInt(200000);
            int n = r.nextInt(5);
            int actives = 0, annulees = 0, modeles = 0;
            for (int k = 0; k < n; k++) {
                String statut = STATUTS[r.nextInt(STATUTS.length)];
                Integer template = TEMPLATES[r.nextInt(TEMPLATES.length)];
                b.factures.add(new DejaFacture.Facture("F" + i + "-" + k, "C" + k,
                        r.nextInt(4) == 0 ? null : new Date(r.nextInt(1000000)), statut, template, "ORG"));
                boolean modele = template != null && template != 0;
                boolean annulee = "avoir".equalsIgnoreCase(statut) || "delete".equals(statut);
                if (modele) {
                    modeles++;
                } else if (annulee) {
                    annulees++;
                } else {
                    actives++;
                }
            }
            DejaFacture.Facture f = b.factureActive();
            assertEquals(actives > 0, f != null, b.id);
            assertEquals(actives > 0 ? DejaFacture.FACTURE : DejaFacture.NON_FACTURE, b.etat(), b.id);
            assertEquals(annulees, b.annulees().size(), b.id + " : annulees");
            assertEquals(n, actives + annulees + modeles, b.id + " : chaque facture dans une seule categorie");
            if (f != null) {
                assertTrue(f.active());
                assertFalse(b.annulees().contains(f), "la facture qui compte n'est jamais une annulee");
                for (DejaFacture.Facture x : b.factures) {
                    if (x.active() && x.date != null && f.date != null) {
                        assertFalse(x.date.after(f.date), b.id + " : la plus recente des factures qui comptent");
                    }
                }
                facturesAttendues++;
            }
            bons.add(b);
        }
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("bons", bons);
        res.put("tronque", false);
        JSONObject j = DejaFacture.json(res);
        JSONArray data = j.getJSONArray("data");
        assertEquals(bons.size(), j.getInt("total"));
        assertEquals(facturesAttendues, j.getInt("factures"), "nombre de bons factures = somme des lignes");
        int somme = 0;
        for (int i = 0; i < data.length(); i++) {
            JSONObject o = data.getJSONObject(i);
            DejaFacture.Bon b = bons.get(i);
            assertEquals(b.id, o.getString("id"));
            assertEquals(b.montant, o.getInt("montant"), "montant = part tiers payant, jamais modifie");
            assertTrue(o.getInt("montant") >= 0);
            assertEquals(b.etat(), o.getString("etat"));
            assertEquals(DejaFacture.FACTURE.equals(b.etat()), !o.isNull("facture"),
                    "facture renseignee si et seulement si facture");
            if (!o.isNull("facture")) {
                assertEquals(b.factureActive().id, o.getJSONObject("facture").getString("id"));
            }
            assertEquals(b.annulees().size(), o.getJSONArray("annulees").length());
            somme += DejaFacture.FACTURE.equals(o.getString("etat")) ? 1 : 0;
        }
        assertEquals(facturesAttendues, somme);
    }

    @Test
    public void reponseVide() {
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("bons", Collections.emptyList());
        res.put("tronque", true);
        JSONObject j = DejaFacture.json(res);
        assertEquals(0, j.getInt("total"));
        assertTrue(j.getBoolean("tronque"));
        assertEquals(DejaFacture.LIMITE, j.getInt("limite"));
    }
}
