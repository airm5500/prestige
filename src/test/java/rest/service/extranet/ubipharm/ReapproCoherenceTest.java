package rest.service.extranet.ubipharm;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.regex.Pattern;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;
import rest.service.extranet.commun.ParcoursDataTables;

/**
 * Coherence de la collecte des reapprovisionnements, sur des milliers de lignes tirees au hasard (graine fixe) et
 * demandees par pages de 100 (08/11), servies par 100 ou plafonnees a 25 par le site :
 * <ul>
 * <li>toutes les lignes sont lues une fois et une seule, dans l'ordre (position = rang dans la liste) ;</li>
 * <li>un meme produit sur plusieurs agences, ou une ligne repetee, donne autant de lignes (aucun dedoublonnage) ;</li>
 * <li>une valeur inconnue (N/A) n'est jamais 0 ; zero et vide restent distincts ;</li>
 * <li>la date n'est lue que si elle est en jj/mm/aaaa, sans heure ;</li>
 * <li>toJson ne contient aucune balise ni aucun script.</li>
 * </ul>
 */
class ReapproCoherenceTest {

    private static final long GRAINE = 20261107L;
    private static final Pattern BALISE = Pattern.compile("<\\s*[a-zA-Z/!]");

    @Test
    void milliersDeLignesLuesUneFoisDansLOrdreSansDedoublonnage() throws Exception {
        Random r = new Random(GRAINE);
        int listes = 0, lignesVues = 0, inconnus = 0, zeros = 0, vides = 0, doublons = 0, multiAgences = 0;
        for (int essai = 0; essai < 12; essai++) {
            int n = essai == 0 ? 0 : essai == 1 ? 1 : essai == 2 ? 25 : essai == 3 ? 26 : 50 + r.nextInt(600);
            List<ReapproJeuEssai.Ligne> jeu = ReapproJeuEssai.generer(r, n);
            int[] appels = { 0 };
            int plafond = essai % 2 == 0 ? 0 : 25;
            int servie = plafond > 0 && n > plafond ? plafond : ReapproCollecteur.LONGUEUR;
            ReapproCollecteur.Resultat res = ReapproCollecteur.parcourir((start, length, draw) -> {
                appels[0]++;
                assertEquals(appels[0] == 1 ? ReapproCollecteur.LONGUEUR : servie, length);
                return ReapproJeuEssai.page(jeu, jeu.size(), start, plafond > 0 ? Math.min(length, plafond) : length,
                        draw);
            }, 1000);
            listes++;
            ParcoursDataTables.Bilan b = res.bilan;
            assertEquals(n, b.recordsTotal);
            assertEquals(n, b.lignes);
            assertEquals(n, res.lignes.size());
            assertEquals(100, ReapproCollecteur.LONGUEUR);
            assertEquals(ParcoursDataTables.pagesAttendues(n, servie), appels[0]);
            assertEquals(ParcoursDataTables.pagesAttendues(n, servie), b.pages);

            Map<String, Integer> attenduParProduit = new HashMap<>();
            Map<String, Integer> luParProduit = new HashMap<>();
            for (int i = 0; i < n; i++) {
                ReapproJeuEssai.Ligne a = jeu.get(i);
                LigneReapproUbipharm l = res.lignes.get(i);
                lignesVues++;
                assertEquals(i, l.position);
                assertEquals(a.pscode, l.pscode);
                assertEquals(a.designation, l.designation, "ligne " + i);
                assertEquals(a.code, l.code);
                assertEquals(a.categorie, l.categorie);
                assertEquals(a.cip, l.cipCache);
                assertEquals(a.pscode, l.pscodeCache);
                assertEquals(a.agence, l.etcodaCache);
                assertEquals(a.agence, l.codeAgence);
                assertEquals(a.statut, l.statut);
                assertEquals(a.dateAffichee, l.dateAffichee);
                if (a.dateValide) {
                    assertEquals(LocalDate.of(a.annee, a.mois, a.jour), l.date);
                } else {
                    assertNull(l.date);
                }
                assertEquals(a.agences.size(), l.disponibilites.size());
                if (a.agences.size() > 1) {
                    multiAgences++;
                }
                for (int k = 0; k < a.agences.size(); k++) {
                    ReapproJeuEssai.Agence ea = a.agences.get(k);
                    LigneReapproUbipharm.DisponibiliteAgence la = l.disponibilites.get(k);
                    assertEquals(ea.etcode, la.etcode);
                    assertEquals(ea.etlib, la.etlib);
                    assertEquals(ea.dispo, la.dispo);
                    assertEquals(ea.colisageTexte, la.colisageTexte);
                    assertEquals(ea.dataColisage, la.dataColisage);
                    assertEquals(ea.colisages, la.colisages);
                    if (ea.colisages == null) {
                        inconnus++;
                        assertNull(la.colisages, "N/A jamais 0");
                        assertEquals(JSONObject.NULL, la.toJson().get("colisages"));
                    } else if (ea.colisages.isEmpty()) {
                        vides++;
                        assertTrue(la.colisages.isEmpty());
                    } else if (ea.colisages.contains(0)) {
                        zeros++;
                    }
                    /* disponibilite = texte, jamais un nombre */
                    assertTrue(la.toJson().get("dispo") instanceof String);
                }
                if (i > 0 && a.pscode.equals(jeu.get(i - 1).pscode) && a.agence.equals(jeu.get(i - 1).agence)
                        && a.dateAffichee.equals(jeu.get(i - 1).dateAffichee)) {
                    doublons++;
                }
                attenduParProduit.merge(a.pscode, 1, Integer::sum);
                luParProduit.merge(l.pscode, 1, Integer::sum);

                String json = l.toJson().toString();
                assertFalse(BALISE.matcher(json).find(), json);
                assertFalse(json.contains("PIEGE"), json);
                assertFalse(l.toJson().has("cellulesBrutes"));
                assertEquals(6, l.cellulesBrutes.size());
            }
            assertEquals(attenduParProduit, luParProduit);
        }
        assertEquals(12, listes);
        assertTrue(lignesVues > 2000, "lignes : " + lignesVues);
        /* le jeu couvre bien tous les cas */
        assertTrue(inconnus > 100 && zeros > 100 && vides > 100, inconnus + " " + zeros + " " + vides);
        assertTrue(doublons > 10, "doublons : " + doublons);
        assertTrue(multiAgences > 500, "lignes a plusieurs agences : " + multiAgences);
    }
}
