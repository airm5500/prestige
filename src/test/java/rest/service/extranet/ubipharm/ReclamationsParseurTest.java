package rest.service.extranet.ubipharm;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;
import rest.service.extranet.commun.ExtranetException;

/**
 * Lecture des reclamations Ubipharm sur des jeux d'essai RECONSTITUES a partir du plan du 07/11 (§7, §8) : aucune
 * capture reelle complete n'existe encore. Les valeurs de l'exemple du plan sont reprises a l'identique.
 */
class ReclamationsParseurTest {

    static String ressource(String nom) throws IOException {
        try (InputStream in = ReclamationsParseurTest.class
                .getResourceAsStream("/extranet/ubipharm/reclamations/" + nom)) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    @Test
    void detailExempleDuPlan() throws Exception {
        ReclamationUbipharm r = ReclamationsParseur.detail(ressource("reconstitue-detail-EXT1408456VRI.html"),
                "1408456", "VRI", "EXT");
        assertEquals("1408456", r.id());
        assertEquals("VRI", r.eta());
        assertEquals("EXT", r.appl());
        assertEquals("EXT1408456VRI", r.reference());
        assertEquals("UBIPHARM ZONE 4", r.agence());
        assertEquals("06/11/2026", r.dateEnvoiBrute());
        assertEquals(LocalDate.of(2026, 11, 6), r.dateEnvoi());
        assertEquals("06/11/2026", r.dateMiseAJourBrute());
        assertEquals(LocalDate.of(2026, 11, 6), r.dateMiseAJour());
        assertEquals("En traitement", r.statut());
        assertEquals(1, r.lignes().size());

        LigneReclamationUbipharm l = r.lignes().get(0);
        assertEquals(14, l.cellules().size());
        assertTrue(l.complete());
        assertEquals("", l.cellule(0));
        assertEquals("704579", l.cellule(1));
        assertEquals("23", l.cellule(2));
        assertEquals("RABE102", l.pscode());
        assertEquals("RABEMAC 20MG CPR B/14", l.designation());
        assertEquals("3000000218945", l.cip());
        assertEquals(Integer.valueOf(1), l.quantite());
        assertEquals("2 736 CFA", l.prixBrut());
        assertEquals(0, new BigDecimal("2736").compareTo(l.prix()));
        assertEquals("2805", l.cellule(6));
        assertEquals("PEREMPTION PROCHE.", l.motif());
        assertEquals("", l.cellule(8));
        /* colonne 9 : « Produit inconnu », sens a confirmer : gardee brute, aucun produit cree */
        assertEquals("Produit inconnu", l.cellule(9));
        assertEquals("Merci de bien vouloir déduire ce produit de la facturation (retour & déduction).",
                l.commentaire());
        assertEquals("Aucun commentaire", l.cellule(13));
        /* le script de la page n'a pas ete execute ni repris */
        assertFalse(r.toJson().toString().contains("document.write"));
    }

    @Test
    void colonnesSansTitreGardeesParPosition() throws Exception {
        ReclamationUbipharm r = ReclamationsParseur.detail(ressource("reconstitue-detail-EXT1408456VRI.html"),
                "1408456", "VRI", "EXT");
        assertEquals(Arrays.asList("", "N°", "#", "Produit facturé", "Qté", "Prix grossiste", "", "Motif", "Réponse",
                "Produit", "", "Commentaire", "", ""), r.entetes());
        ReclamationUbipharm v = ReclamationsParseur.detail(ressource("reconstitue-detail-variantes.html"), "1410730",
                "GNA", "YOP");
        assertEquals(14, v.entetes().size());
        assertEquals(12, v.entetes().stream().filter(String::isEmpty).count());
    }

    @Test
    void variantesProduitInconnuPrixInconnuEtLigneIncomplete() throws Exception {
        ReclamationUbipharm r = ReclamationsParseur.detail(ressource("reconstitue-detail-variantes.html"), "1410730",
                "GNA", "YOP");
        assertEquals("YOP1410730GNA", r.reference());
        assertEquals("Clôturée", r.statut());
        assertEquals("01/10/2026", r.dateEnvoiBrute());
        assertNull(r.agence(), "agence absente : null, pas une valeur voisine");
        assertNull(r.dateMiseAJourBrute());
        /* la ligne « Aucune donnée » (colspan) n'est pas une ligne */
        assertEquals(4, r.lignes().size());

        LigneReclamationUbipharm inconnu = r.lignes().get(0);
        assertNull(inconnu.pscode(), "Produit inconnu à data-pscode vide : aucun produit");
        assertNull(inconnu.designation());
        assertNull(inconnu.cip());
        assertEquals("Produit inconnu Réf. :", inconnu.cellule(3));
        assertEquals("700001 700002", inconnu.cellule(1));
        assertEquals(Integer.valueOf(3), inconnu.quantite());
        assertEquals("N/A", inconnu.prixBrut());
        assertNull(inconnu.prix(), "prix inconnu : null, jamais 0");
        assertEquals("CASSE", inconnu.motif());
        assertEquals("Produit cassé & abîmé", inconnu.commentaire());

        LigneReclamationUbipharm doli = r.lignes().get(1);
        assertEquals("DOLI500", doli.pscode());
        assertEquals("DOLIPRANE 500MG CPR B/16", doli.designation());
        assertEquals("3400930000001", doli.cip());
        assertEquals(Integer.valueOf(12), doli.quantite());
        assertEquals("0 CFA", doli.prixBrut());
        assertEquals(0, BigDecimal.ZERO.compareTo(doli.prix()), "zéro affiché : zéro");
        assertEquals("Accord", doli.cellule(8));
        assertNull(doli.commentaire());

        LigneReclamationUbipharm amox = r.lignes().get(2);
        assertEquals("AMOX1G", amox.pscode());
        assertEquals("AMOXICILLINE 1G", amox.designation());
        assertNull(amox.cip());
        assertNull(amox.quantite());
        assertNull(amox.prixBrut());
        assertNull(amox.prix());

        LigneReclamationUbipharm courte = r.lignes().get(3);
        assertFalse(courte.complete());
        assertEquals(5, courte.cellules().size());
        assertNull(courte.pscode(), "positions non sûres : rien n'est reconnu");
        assertNull(courte.quantite());
        assertEquals(3, courte.position());
    }

    @Test
    void pageSansTableauReclamationRefusee() {
        ExtranetException e = assertThrows(ExtranetException.class,
                () -> ReclamationsParseur.detail("<html><body><p>Erreur</p></body></html>", "1", "A", "B"));
        assertEquals(ExtranetException.Nature.REPONSE_INATTENDUE, e.nature());
    }

    @Test
    void listeLiensEXTYOPVRIEtSupprimee() throws Exception {
        List<ReclamationUbipharm> l = ReclamationsParseur.liste(ressource("reconstitue-liste-all.json"));
        assertEquals(5, l.size());

        ReclamationUbipharm a = l.get(0);
        assertEquals("1408456", a.id());
        assertEquals("VRI", a.eta());
        assertEquals("EXT", a.appl());
        assertEquals("EXT1408456VRI", a.reference());
        assertEquals("704579", a.numerosAssociesBrut());
        assertEquals(List.of("704579"), a.numerosAssocies());
        assertEquals("En traitement", a.statut());
        assertEquals(LocalDate.of(2026, 11, 6), a.dateEnvoi());
        assertNull(a.agence());
        assertNull(a.lignes(), "ligne de liste : lignes non chargées");

        /* parametres dans un autre ordre : lus par nom, appl YOP */
        ReclamationUbipharm b = l.get(1);
        assertEquals("1410730", b.id());
        assertEquals("GNA", b.eta());
        assertEquals("YOP", b.appl());
        assertEquals(List.of("700001", "700002"), b.numerosAssocies());
        assertEquals("Clôturée", b.statut(), "entités HTML décodées");

        /* appl VRI, eta EXT : jamais deduits de la reference ; « Supprimée » reste une ligne */
        ReclamationUbipharm c = l.get(2);
        assertEquals("1399001", c.id());
        assertEquals("EXT", c.eta());
        assertEquals("VRI", c.appl());
        assertEquals("Supprimée", c.statut());
        assertEquals("", c.numerosAssociesBrut());
        assertEquals(List.of(), c.numerosAssocies());

        ReclamationUbipharm d = l.get(3);
        assertEquals("701 702 703", d.numerosAssociesBrut());
        assertEquals(List.of("701", "702", "703"), d.numerosAssocies());
        assertEquals("", d.dateMiseAJourBrute());
        assertNull(d.dateMiseAJour());

        ReclamationUbipharm e = l.get(4);
        assertEquals("SP", e.eta());
        assertNull(e.numerosAssociesBrut());
        assertNull(e.numerosAssocies());
        assertEquals("31/02/2026", e.dateEnvoiBrute());
        assertNull(e.dateEnvoi(), "date impossible : null");
        assertEquals("N/A", e.dateMiseAJourBrute());
        assertNull(e.dateMiseAJour());
    }

    @Test
    void lienSansParametresValidesDonneNull() throws Exception {
        String json = "{\"datatables\":{\"recordsTotal\":3,\"recordsFiltered\":3,\"data\":["
                + "[\"<a href='AfficherReclamation?id=12x&eta=A&appl=B'>x</a>\",\"R1\",\"\",\"S\",\"\",\"\"],"
                + "[\"<span>pas de lien</span>\",\"R2\",\"\",\"S\",\"\",\"\"],"
                + "[\"<a href='AutrePage?id=5&eta=A&appl=B'>x</a>\",\"R3\",\"\",\"S\",\"\",\"\"]]}}";
        List<ReclamationUbipharm> l = ReclamationsParseur.liste(json);
        assertNull(l.get(0).id());
        assertEquals("A", l.get(0).eta());
        assertNull(l.get(0).cle());
        assertNull(l.get(1).id());
        assertNull(l.get(2).id(), "un lien vers une autre page n'est pas un lien de détail");
    }

    @Test
    void listeIncompleteOuMalFormeeRefusee() {
        String incomplete = "{\"msg\":[],\"datatables\":{\"recordsFiltered\":2,\"recordsTotal\":2,\"data\":["
                + "[\"<a href='AfficherReclamation?id=1&eta=A&appl=EXT'></a>\",\"R\",\"\",\"S\",\"\",\"\"]]}}";
        assertEquals(ExtranetException.Nature.PAGINATION,
                assertThrows(ExtranetException.class, () -> ReclamationsParseur.liste(incomplete)).nature());
        String filtreDifferent = "{\"datatables\":{\"recordsFiltered\":0,\"recordsTotal\":1,\"data\":["
                + "[\"\",\"R\",\"\",\"S\",\"\",\"\"]]}}";
        assertEquals(ExtranetException.Nature.PAGINATION,
                assertThrows(ExtranetException.class, () -> ReclamationsParseur.liste(filtreDifferent)).nature());
        String cinqCellules = "{\"datatables\":{\"recordsFiltered\":1,\"recordsTotal\":1,\"data\":["
                + "[\"\",\"R\",\"\",\"S\",\"\"]]}}";
        assertEquals(ExtranetException.Nature.REPONSE_INATTENDUE,
                assertThrows(ExtranetException.class, () -> ReclamationsParseur.liste(cinqCellules)).nature());
        assertEquals(ExtranetException.Nature.REPONSE_INATTENDUE,
                assertThrows(ExtranetException.class, () -> ReclamationsParseur.liste("<html>")).nature());
    }

    @Test
    void listeVideComplete() throws Exception {
        assertTrue(ReclamationsParseur
                .liste("{\"msg\":[],\"datatables\":{\"recordsFiltered\":0,\"data\":[],\"recordsTotal\":0}}").isEmpty());
    }

    @Test
    void toJsonSansHtml() throws Exception {
        String json = ReclamationsParseur.liste(ressource("reconstitue-liste-all.json")).get(0).toJson().toString();
        assertFalse(json.contains("<a"));
        assertFalse(json.contains("href"));
        assertFalse(json.contains("&amp;"));
        JSONObject d = ReclamationsParseur
                .detail(ressource("reconstitue-detail-EXT1408456VRI.html"), "1408456", "VRI", "EXT").toJson();
        String s = d.toString();
        assertFalse(s.contains("<"), s);
        assertFalse(s.contains("data-pscode"));
        assertFalse(s.contains("&nbsp;") || s.contains("&eacute;"));
        assertEquals("RABE102", d.getJSONArray("lignes").getJSONObject(0).getString("pscode"));
        assertEquals("2026-11-06", d.getString("dateEnvoi"));
    }
}
