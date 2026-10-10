package rest.service.impl.controle;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

class TableauControleAchatTest {

    @Test
    void delaiDeSaisieParRapportAuSeuil() {
        TableauControleAchat t = new TableauControleAchat(1);
        t.ajouter("1", "LABOREX", "G1", "LABOREX GAGNOA", true, 0, 1000); // saisi le jour meme : bon
        t.ajouter("1", "LABOREX", "G1", "LABOREX GAGNOA", false, 1, 2000); // 1 jour : bon (au plus le seuil)
        t.ajouter("1", "LABOREX", "G2", "LABOREX ABIDJAN", true, 2, 3000); // 2 jours : en retard
        t.ajouter("2", "DPCI", "G3", "DPCI", false, null, 500); // date inconnue
        TableauControleAchat.Compteur total = t.total();
        assertEquals(4, total.bons);
        assertEquals(2, total.controles);
        assertEquals(50, total.pourcentageControles());
        assertEquals(2, total.dansDelai);
        assertEquals(1, total.enRetard);
        assertEquals(1, total.delaiInconnu);
        assertEquals(67, total.pourcentageDansDelai()); // 2 sur 3 connus
        assertEquals(1.0, total.delaiMoyen(), 1e-9); // (0 + 1 + 2) / 3
        assertEquals(6500, total.montant);
    }

    @Test
    void seuilParametrable() {
        TableauControleAchat t = new TableauControleAchat(3);
        t.ajouter("1", "A", "G1", "X", true, 2, 0);
        t.ajouter("1", "A", "G1", "X", true, 3, 0);
        t.ajouter("1", "A", "G1", "X", true, 4, 0);
        assertEquals(2, t.total().dansDelai);
        assertEquals(1, t.total().enRetard);
        // seuil negatif ramene a 0 : seul le jour meme est dans le delai
        TableauControleAchat z = new TableauControleAchat(-5);
        z.ajouter("1", "A", "G1", "X", true, 0, 0);
        z.ajouter("1", "A", "G1", "X", true, 1, 0);
        assertEquals(1, z.total().dansDelai);
    }

    @Test
    void repartitionParGroupeEtGrossiste() {
        TableauControleAchat t = new TableauControleAchat(1);
        t.ajouter("1", "LABOREX", "G1", "LABOREX GAGNOA", true, 0, 0);
        t.ajouter("1", "LABOREX", "G2", "LABOREX ABIDJAN", true, 0, 0);
        t.ajouter("1", "LABOREX", "G2", "LABOREX ABIDJAN", false, 5, 0);
        t.ajouter(null, null, "G9", "GROSSISTE SANS GROUPE", false, 0, 0);
        t.ajouter("2", "DPCI", "G3", "DPCI", true, 0, 0);
        List<TableauControleAchat.Compteur> g = t.groupes();
        assertEquals("LABOREX", g.get(0).libelle);
        assertEquals("DPCI", g.get(1).libelle);
        assertEquals(TableauControleAchat.SANS_GROUPE, g.get(2).libelle); // toujours en dernier
        JSONObject j = t.json();
        assertEquals(3, j.getJSONArray("groupes").getJSONObject(0).getInt("bons"));
        assertEquals("LABOREX ABIDJAN", j.getJSONArray("groupes").getJSONObject(0).getJSONArray("grossistes")
                .getJSONObject(0).getString("libelle"));
        assertEquals(2, j.getJSONArray("groupes").getJSONObject(0).getJSONArray("grossistes").length());
        assertEquals(5, j.getJSONObject("total").getInt("bons"));
        assertEquals(1, j.getInt("seuil"));
    }

    @Test
    void videSansDivisionParZero() {
        TableauControleAchat t = new TableauControleAchat(1);
        assertEquals(0, t.total().pourcentageControles());
        assertEquals(0, t.total().pourcentageDansDelai());
        assertEquals(0.0, t.total().delaiMoyen(), 1e-9);
        assertEquals(0, t.json().getJSONArray("groupes").length());
    }
}
