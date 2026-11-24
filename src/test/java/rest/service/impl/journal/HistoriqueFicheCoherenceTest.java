package rest.service.impl.journal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import dal.enumeration.TypeLog;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;
import rest.service.impl.achats.ModificationBl;

/**
 * Retours du 23/11, proposition 2 : onglet « Historique », sur 3 000 journaux tires au hasard (graine fixe). Regles :
 * une ligne par trace d'un type produit (les autres sont ecartees), plus une creation si le journal n'en porte pas par
 * l'identifiant ; de la plus recente a la plus ancienne ; 500 lignes au plus ; rattachement : identifiant = cette
 * fiche, CIP avant la creation = fiche precedente, CIP partage = signale ; detail relu a l'identique.
 */
class HistoriqueFicheCoherenceTest {

    private static final String ID = "ID-FICHE";
    private static final String CIP = "8014527";
    private static final String CIP2 = "3000001239734";

    @Test
    void historiqueSurTroisMilleJournaux() throws Exception {
        Random r = new Random(20261126L);
        SimpleDateFormat f = new SimpleDateFormat("dd/MM/yyyy HH:mm");
        TypeLog[] tous = TypeLog.values();
        int precedentes = 0;
        int partages = 0;
        for (int i = 0; i < 3_000; i++) {
            Date creeLe = new Date(1_790_000_000_000L + r.nextInt(1_000_000) * 1000L);
            Map<String, Integer> parCip = new HashMap<>();
            parCip.put(CIP, 1 + r.nextInt(3));
            parCip.put(CIP2, 1);
            int n = r.nextInt(i % 50 == 0 ? 700 : 25);
            List<HistoriqueFiche.Ligne> l = new ArrayList<>();
            int produit = 0;
            boolean creationParId = false;
            for (int k = 0; k < n; k++) {
                TypeLog t = tous[r.nextInt(tous.length)];
                String ref = new String[] { ID, CIP, CIP2 }[r.nextInt(3)];
                Date le = new Date(creeLe.getTime() + (r.nextInt(400_000_000) - 100_000_000) * 100L);
                List<ModificationBl.Champ> champs = new ArrayList<>();
                for (int c = r.nextInt(3); c > 0; c--) {
                    champs.add(new ModificationBl.Champ("Champ " + c, "a" + r.nextInt(9), "b" + r.nextInt(9)));
                }
                l.add(new HistoriqueFiche.Ligne(le, t, "Desc " + k + " référence [" + ref + " ]",
                        champs.isEmpty() ? null : ModificationBl.detail(champs), ref,
                        r.nextBoolean() ? "U" + k : null));
                if (HistoriqueFiche.TYPES.contains(t)) {
                    produit++;
                    creationParId |= ID.equals(ref)
                            && (t == TypeLog.AJOUT_DE_NOUVEAU_PRODUIT || t == TypeLog.AJOUT_DE_DETAIL_PRODUIT);
                }
            }
            l.add(null);
            Collections.shuffle(l, r);
            JSONArray a = HistoriqueFiche.assembler(ID, creeLe, parCip, l, "AUTEUR CREATION");
            int attendu = Math.min(HistoriqueFiche.MAXI, produit + (creationParId ? 0 : 1));
            assertEquals(attendu, a.length(), "cas " + i);
            long avant = Long.MAX_VALUE;
            int creations = 0;
            for (int k = 0; k < a.length(); k++) {
                JSONObject o = a.getJSONObject(k);
                long t = f.parse(o.getString("le")).getTime();
                assertTrue(t <= avant, "cas " + i + " : ordre");
                avant = t;
                String fiche = o.getString("fiche");
                assertTrue(fiche.equals(HistoriqueFiche.CETTE_FICHE) || fiche.equals(HistoriqueFiche.FICHE_PRECEDENTE)
                        || fiche.equals(HistoriqueFiche.CIP_PARTAGE), fiche);
                assertTrue(!o.getString("quoi").contains("référence ["), "suffixe technique retire");
                if (fiche.equals(HistoriqueFiche.FICHE_PRECEDENTE)) {
                    precedentes++;
                    assertTrue(t < creeLe.getTime(), "fiche precedente : avant la creation");
                }
                if (fiche.equals(HistoriqueFiche.CIP_PARTAGE)) {
                    partages++;
                }
                if ("Création".equals(o.getString("action")) && fiche.equals(HistoriqueFiche.CETTE_FICHE)
                        && o.getString("quoi").equals("Création de la fiche")) {
                    creations++;
                    assertEquals("AUTEUR CREATION", o.getString("auteur"));
                }
            }
            if (!creationParId && attendu == produit + 1 && attendu < HistoriqueFiche.MAXI) {
                assertEquals(1, creations, "cas " + i + " : creation ajoutee une fois");
            }
            if (creationParId) {
                assertEquals(0, creations, "cas " + i + " : pas de creation en double");
            }
        }
        assertTrue(precedentes > 1_000 && partages > 1_000, precedentes + " / " + partages);
    }

    @Test
    void rattachementEtDetail() {
        Date creeLe = new Date(1_800_000_000_000L);
        Map<String, Integer> parCip = new HashMap<>();
        parCip.put(CIP, 2);
        parCip.put(CIP2, 1);
        assertEquals(HistoriqueFiche.CETTE_FICHE, HistoriqueFiche.fiche(ID, creeLe, parCip,
                new HistoriqueFiche.Ligne(new Date(0), TypeLog.SUPPRESSION_DE_PRODUIT, "", null, ID, "")));
        assertEquals(HistoriqueFiche.FICHE_PRECEDENTE,
                HistoriqueFiche.fiche(ID, creeLe, parCip, new HistoriqueFiche.Ligne(new Date(creeLe.getTime() - 1_001),
                        TypeLog.SUPPRESSION_DE_PRODUIT, "", null, CIP, "")));
        assertEquals(HistoriqueFiche.CIP_PARTAGE,
                HistoriqueFiche.fiche(ID, creeLe, parCip, new HistoriqueFiche.Ligne(new Date(creeLe.getTime() - 1_000),
                        TypeLog.AJUSTEMENT_DE_PRODUIT, "", null, CIP, "")));
        assertEquals(HistoriqueFiche.CETTE_FICHE,
                HistoriqueFiche.fiche(ID, creeLe, parCip, new HistoriqueFiche.Ligne(new Date(creeLe.getTime() + 5),
                        TypeLog.AJUSTEMENT_DE_PRODUIT, "", null, CIP2, "")));
        JSONArray a = HistoriqueFiche.assembler(ID, creeLe, parCip,
                java.util.Arrays.asList(new HistoriqueFiche.Ligne(new Date(creeLe.getTime() + 60_000),
                        TypeLog.MODIFICATION_FICHE_PRODUIT, "Modification de la fiche référence [" + ID + " ]",
                        "Prix de vente : avant 1 000 → après 1 200\nStatut : avant désactivée → après active", ID,
                        "YAO BRIGITTE")),
                "");
        assertEquals(2, a.length());
        JSONObject o = a.getJSONObject(0);
        assertEquals("Modification de la fiche", o.getString("action"));
        assertEquals("Modification de la fiche", o.getString("quoi"));
        assertEquals(2, o.getJSONArray("champs").length());
        assertEquals("1 000", o.getJSONArray("champs").getJSONObject(0).getString("avant"));
        assertEquals("active", o.getJSONArray("champs").getJSONObject(1).getString("apres"));
        assertEquals("", a.getJSONObject(1).getString("auteur"));
    }

    @Test
    void cipEnregistre() {
        Random r = new Random(20261127L);
        for (int i = 0; i < 5_000; i++) {
            StringBuilder c = new StringBuilder();
            int n = 4 + r.nextInt(6);
            for (int k = 0; k < n; k++) {
                c.append(r.nextInt(10));
            }
            String s = c.toString();
            String e = rest.service.impl.TracesFicheService.cipEnregistre((r.nextBoolean() ? " " : "") + s);
            if (s.length() == 6) {
                int somme = 0;
                for (int k = 0; k < 6; k++) {
                    somme += (s.charAt(k) - '0') * (k + 2);
                }
                assertEquals(s + (somme % 11), e, s);
            } else {
                assertEquals(s, e, s);
            }
        }
        assertEquals("12A456", rest.service.impl.TracesFicheService.cipEnregistre("12A456"));
    }
}
