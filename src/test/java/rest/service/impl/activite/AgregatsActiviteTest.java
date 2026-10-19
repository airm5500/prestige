package rest.service.impl.activite;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import rest.service.dto.ActiviteAnalysesDTO;
import rest.service.impl.activite.AgregatsActivite.Bl;
import rest.service.impl.activite.AgregatsActivite.Totaux;
import rest.service.impl.activite.AgregatsActivite.Vente;

class AgregatsActiviteTest {

    static final LocalDateTime J = LocalDateTime.of(2026, 9, 7, 10, 0); // lundi

    /** vente ouverte a t, derniere ligne a t+saisie, encaissee a t+duree */
    static Vente v(String emp, LocalDateTime t, long saisie, long duree, long lignes, long montant) {
        return new Vente(emp, t, t.plusSeconds(saisie), t.plusSeconds(duree), lignes, montant);
    }

    static Bl bl(String emp, String gros, LocalDateTime commande, long total, long lignes, LocalDate livraison) {
        return new Bl(emp, gros, commande, commande.plusMinutes(1), commande.plusSeconds(total), livraison, lignes);
    }

    @Test
    @DisplayName("vente de plus d'une heure : ecartee des moyennes, comptee comme vente longue")
    void venteEcartee() {
        List<Vente> l = List.of(v("A", J, 30, 60, 2, 1000), v("A", J.plusMinutes(5), 100, 4000, 1, 500));
        Totaux t = AgregatsActivite.totaux(l, List.of(), 0);
        assertEquals(2, t.ventes);
        assertEquals(2, t.lignes);
        assertEquals(30, t.saisie);
        assertEquals(1, t.longues);
        assertEquals(15.0, t.secondesParLigne());
        assertEquals(750.0, t.panier());
    }

    @Test
    @DisplayName("heures : nombre de ventes et saisie moyenne des ventes retenues")
    void heures() {
        List<Vente> l = List.of(v("A", J, 20, 40, 1, 100), v("A", J.plusMinutes(10), 40, 50, 1, 100),
                v("B", J.plusHours(8), 10, 20, 1, 100));
        List<ActiviteAnalysesDTO.Heure> h = AgregatsActivite.heures(l);
        assertEquals(2, h.size());
        assertEquals(10, h.get(0).getHeure());
        assertEquals(2, h.get(0).getVentes());
        assertEquals(30, h.get(0).getSaisieMoyenne());
        assertEquals(18, h.get(1).getHeure());
    }

    @Test
    @DisplayName("carte : jour de la semaine (1 = lundi) et heure")
    void carte() {
        List<ActiviteAnalysesDTO.Cellule> c = AgregatsActivite
                .carte(List.of(v("A", J, 1, 2, 1, 1), v("A", J.plusDays(1), 1, 2, 1, 1)));
        assertEquals(1, c.get(0).getJour());
        assertEquals(10, c.get(0).getHeure());
        assertEquals(2, c.get(1).getJour());
    }

    @Test
    @DisplayName("operateurs : jours presents, ventes par jour, secondes par ligne, ventes longues")
    void operateurs() {
        List<Vente> l = new ArrayList<>();
        l.add(v("A", J, 30, 40, 2, 1000));
        l.add(v("A", J.plusDays(1), 60, 80, 3, 2000));
        l.add(v("A", J.plusDays(1).plusHours(1), 10, 700, 1, 300));
        l.add(v("B", J, 10, 20, 1, 100));
        List<ActiviteAnalysesDTO.Operateur> o = AgregatsActivite.operateurs(l, Map.of("A", "Alice", "B", "Bob"));
        ActiviteAnalysesDTO.Operateur a = o.get(0);
        assertEquals("Alice", a.getNom());
        assertEquals(2, a.getJours());
        assertEquals(3, a.getVentes());
        assertEquals(1.5, a.getVentesParJour());
        assertEquals(16.7, a.getSecondesParLigne()); // 100 s pour 6 lignes
        assertEquals(1, a.getVentesLongues());
        assertEquals(1100, a.getPanierMoyen());
    }

    @Test
    @DisplayName("grossistes : BL de plus de 4 h ecartes, tri du plus long au plus rapide")
    void grossistes() {
        List<Bl> l = List.of(bl("A", "DPCI", J, 2400, 10, null), bl("A", "LABOREX", J, 680, 10, null),
                bl("A", "DPCI", J, 5 * 3600, 10, null));
        List<ActiviteAnalysesDTO.Grossiste> g = AgregatsActivite.grossistes(l);
        assertEquals("DPCI", g.get(0).getNom());
        assertEquals(1, g.get(0).getBl());
        assertEquals(240.0, g.get(0).getSecondesParLigne());
        assertEquals(68.0, g.get(1).getSecondesParLigne());
    }

    @Test
    @DisplayName("retard des BL : jour meme, lendemain, 2 jours ou plus, date absente")
    void retard() {
        LocalDate d = J.toLocalDate();
        List<Bl> l = List.of(bl("A", "X", J, 60, 1, d), bl("A", "X", J, 60, 1, d.minusDays(1)),
                bl("A", "X", J, 60, 1, d.minusDays(3)), bl("A", "X", J, 60, 1, null));
        List<ActiviteAnalysesDTO.Tranche> r = AgregatsActivite.retardBl(l);
        assertEquals(1, r.get(0).getNombre());
        assertEquals(1, r.get(1).getNombre());
        assertEquals(1, r.get(2).getNombre());
        assertEquals("SANS", r.get(3).getCode());
        Totaux t = AgregatsActivite.totaux(List.of(), l, 0);
        assertEquals(1, t.blRetard);
    }

    @Test
    @DisplayName("jours : saisie cumulee des ventes et des BL retenus, par date")
    void jours() {
        List<ActiviteAnalysesDTO.Jour> j = AgregatsActivite.jours(
                List.of(v("A", J, 30, 40, 1, 1), v("A", J.plusMinutes(1), 20, 30, 1, 1)),
                List.of(bl("A", "X", J, 600, 3, null)));
        assertEquals(1, j.size());
        assertEquals(2, j.get(0).getVentes());
        assertEquals(50, j.get(0).getSaisieVentes());
        assertEquals(1, j.get(0).getBl());
        assertEquals(600, j.get(0).getSaisieBl());
    }

    @Test
    @DisplayName("indicateurs : evolution en %, absente sans reference")
    void indicateurs() {
        Totaux t = new Totaux(), p = new Totaux();
        t.ventes = 120;
        p.ventes = 100;
        t.jours = 6;
        List<ActiviteAnalysesDTO.Indicateur> i = AgregatsActivite.indicateurs(t, p, 4);
        assertEquals(20.0, i.get(0).getEvolution());
        assertNull(i.get(4).getEvolution()); // BL : 0 sur la precedente
        assertEquals(4.0, i.get(i.size() - 1).getValeur());
    }

    @Test
    @DisplayName("constats : pic qui ralentit, operateur lent, grossiste lent, BL en retard, baisse d'activite")
    void constats() {
        List<ActiviteAnalysesDTO.Heure> h = List.of(
                ActiviteAnalysesDTO.Heure.builder().heure(10).ventes(50).saisieMoyenne(30).build(),
                ActiviteAnalysesDTO.Heure.builder().heure(18).ventes(400).saisieMoyenne(60).build());
        List<ActiviteAnalysesDTO.Operateur> o = List.of(
                ActiviteAnalysesDTO.Operateur.builder().nom("Alice").ventes(100).secondesParLigne(10).build(),
                ActiviteAnalysesDTO.Operateur.builder().nom("Bob").ventes(100).secondesParLigne(12).build(),
                ActiviteAnalysesDTO.Operateur.builder().nom("Carl").ventes(100).secondesParLigne(30).build());
        List<ActiviteAnalysesDTO.Grossiste> g = List.of(
                ActiviteAnalysesDTO.Grossiste.builder().nom("DPCI").bl(18).secondesParLigne(240).build(),
                ActiviteAnalysesDTO.Grossiste.builder().nom("ISOLE").bl(1).secondesParLigne(500).build(),
                ActiviteAnalysesDTO.Grossiste.builder().nom("LABOREX").bl(30).secondesParLigne(68).build());
        List<ActiviteAnalysesDTO.Tranche> r = List.of(
                ActiviteAnalysesDTO.Tranche.builder().code("J0").nombre(5).build(),
                ActiviteAnalysesDTO.Tranche.builder().code("J2").nombre(5).build());
        Totaux t = new Totaux(), p = new Totaux();
        t.ventes = 80;
        t.jours = 10;
        p.ventes = 100;
        p.jours = 10;
        List<ActiviteAnalysesDTO.Constat> c = AgregatsActivite.constats(h, o, g, r, List.of(), t, p);
        String tout = c.toString();
        assertTrue(tout.contains("Pic de 18 h : la saisie ralentit"), tout);
        assertTrue(tout.contains("Saisie à accompagner : Carl"), tout);
        assertTrue(tout.contains("BL DPCI longs à saisir"), tout);
        assertFalse(tout.contains("ISOLE"), tout); // un seul BL : pas de conclusion
        assertTrue(tout.contains("BL saisis en retard"), tout);
        assertTrue(tout.contains("Activité en baisse"), tout);
        assertFalse(tout.contains("Rien de particulier"), tout);
    }

    @Test
    @DisplayName("constats : rien de particulier quand il n'y a pas d'ecart")
    void constatsVides() {
        Totaux t = new Totaux();
        List<ActiviteAnalysesDTO.Constat> c = AgregatsActivite.constats(List.of(), List.of(), List.of(), List.of(),
                List.of(), t, t);
        assertEquals("Rien de particulier", c.get(0).getTitre());
    }

    @Test
    @DisplayName("actions sensibles : taux d'annulation pour 1 000 ventes, tri par annulations + modifications")
    void sensibles() {
        List<ActiviteAnalysesDTO.Sensible> s = AgregatsActivite.sensibles(Map.of("A", 1000L, "B", 500L),
                Map.of("A", 2L, "B", 5L), Map.of("A", 1L), Map.of("A", 3000L), Map.of("A", "Alice", "B", "Bob"));
        assertEquals("Bob", s.get(0).getNom());
        assertEquals(10.0, s.get(0).getTauxAnnulation());
        assertEquals(3000, s.get(1).getRemises());
    }

    @Test
    @DisplayName("repartition : actions par type, employes tries par volume")
    void repartition() {
        List<Object[]> l = List.of(new Object[] { "A", "VENTE", 3L }, new Object[] { "B", "VENTE", 10L },
                new Object[] { "A", "BL", 2L });
        List<ActiviteAnalysesDTO.Repartition> r = AgregatsActivite.repartition(l, Map.of("A", "Alice", "B", "Bob"));
        assertEquals("Bob", r.get(0).getNom());
        assertEquals(2L, r.get(1).getActions().get("BL"));
    }
}
