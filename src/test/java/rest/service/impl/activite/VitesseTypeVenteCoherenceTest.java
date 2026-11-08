package rest.service.impl.activite;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

import org.junit.jupiter.api.Test;

import rest.service.dto.ActiviteAnalysesDTO;

/**
 * Plan du 08/11, points 15.5 et 15.7 : vitesse par type de vente. Regles verifiees sur des milliers de ventes tirees au
 * hasard (graine fixe), types, avoirs, durees et lignes varies (0 ligne, plus d'une heure, quantites differentes) :
 * <ul>
 * <li>type : avoir l'emporte ; 1 comptant, 2 assurance, 3 carnet, 4 et 5 depot, le reste « Autre » ;</li>
 * <li>somme des ventes par type = nombre de ventes ; somme des CA par type = CA total ; somme des ventes longues =
 * total ;</li>
 * <li>chaque type = le meme calcul que la vitesse par operateur fait sur ses seules ventes (secondes par ligne, lignes
 * par vente, panier) ;</li>
 * <li>seuls les types qui ont des ventes, dans l'ordre comptant, assurance, carnet, depot, avoir, autre ;</li>
 * <li>jamais negatif.</li>
 * </ul>
 */
class VitesseTypeVenteCoherenceTest {

    private static final String[] IDS = { "1", "2", "3", "4", "5", "6", null, " 2 " };

    @Test
    void libelles() {
        assertEquals("Comptant", AgregatsActivite.typeVente("1", false));
        assertEquals("Assurance", AgregatsActivite.typeVente("2", false));
        assertEquals("Assurance", AgregatsActivite.typeVente(" 2 ", false));
        assertEquals("Carnet", AgregatsActivite.typeVente("3", false));
        assertEquals("Dépôt", AgregatsActivite.typeVente("4", false));
        assertEquals("Dépôt", AgregatsActivite.typeVente("5", false));
        assertEquals("Autre", AgregatsActivite.typeVente("6", false));
        assertEquals("Autre", AgregatsActivite.typeVente(null, false));
        for (String id : IDS) {
            assertEquals("Avoir", AgregatsActivite.typeVente(id, true));
        }
    }

    @Test
    void milliersDeVentes() {
        Random r = new Random(15507);
        SeuilDuree seuil = SeuilDuree.defaut();
        for (int essai = 0; essai < 300; essai++) {
            List<AgregatsActivite.Vente> ventes = new ArrayList<>();
            Map<String, List<AgregatsActivite.Vente>> attendu = new HashMap<>();
            int n = r.nextInt(60);
            LocalDateTime base = LocalDateTime.of(2026, 10, 1, 8, 0);
            for (int i = 0; i < n; i++) {
                LocalDateTime o = base.plusDays(r.nextInt(20)).plusMinutes(r.nextInt(900));
                long duree = r.nextInt(10) == 0 ? 3600 + r.nextInt(5000) : r.nextInt(1500);
                long saisie = Math.min(duree, r.nextInt(1200));
                String id = IDS[r.nextInt(IDS.length)];
                boolean avoir = r.nextInt(15) == 0;
                AgregatsActivite.Vente v = new AgregatsActivite.Vente("E" + r.nextInt(5), o, o.plusSeconds(saisie),
                        o.plusSeconds(duree), r.nextInt(8), r.nextInt(50000), id, avoir);
                ventes.add(v);
                attendu.computeIfAbsent(AgregatsActivite.typeVente(id, avoir), k -> new ArrayList<>()).add(v);
            }
            List<ActiviteAnalysesDTO.Operateur> l = AgregatsActivite.typesVente(ventes, seuil);
            AgregatsActivite.Totaux tout = AgregatsActivite.totaux(ventes, List.of(), 0, seuil);
            assertEquals(tout.ventes, l.stream().mapToLong(ActiviteAnalysesDTO.Operateur::getVentes).sum());
            assertEquals(tout.montant, l.stream().mapToLong(ActiviteAnalysesDTO.Operateur::getChiffreAffaires).sum());
            assertEquals(tout.longues, l.stream().mapToLong(ActiviteAnalysesDTO.Operateur::getVentesLongues).sum());
            assertEquals(attendu.size(), l.size(), "seuls les types qui ont des ventes");
            int rang = -1;
            for (ActiviteAnalysesDTO.Operateur o : l) {
                int k = AgregatsActivite.TYPES_VENTE.indexOf(o.getNom());
                assertTrue(k > rang, "ordre des types");
                rang = k;
                assertEquals(o.getId(), o.getNom());
                /* meme calcul que la vitesse par operateur, sur les seules ventes du type */
                Map<String, String> noms = Map.of("X", o.getNom());
                List<AgregatsActivite.Vente> vs = new ArrayList<>();
                attendu.get(o.getNom()).forEach(v -> vs.add(new AgregatsActivite.Vente("X", v.ouverture,
                        v.derniereLigne, v.encaissement, v.lignes, v.montant)));
                ActiviteAnalysesDTO.Operateur ref = AgregatsActivite.operateurs(vs, noms, seuil).get(0);
                assertEquals(ref.getVentes(), o.getVentes());
                assertEquals(ref.getSecondesParLigne(), o.getSecondesParLigne());
                assertEquals(ref.getLignesParVente(), o.getLignesParVente());
                assertEquals(ref.getPanierMoyen(), o.getPanierMoyen());
                assertEquals(ref.getJours(), o.getJours());
                assertTrue(o.getSecondesParLigne() >= 0 && o.getLignesParVente() >= 0 && o.getPanierMoyen() >= 0);
            }
        }
    }
}
