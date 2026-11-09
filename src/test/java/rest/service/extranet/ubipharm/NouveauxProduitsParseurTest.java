package rest.service.extranet.ubipharm;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;
import rest.service.extranet.ubipharm.NouveauProduitUbipharm.DisponibiliteAgence;

/** Lecture de la page « Nouveaux produits » sur des jeux reconstitues (structures du plan du 07/11, §3, seulement). */
class NouveauxProduitsParseurTest {

    static String jeu(String nom) throws IOException {
        try (InputStream in = NouveauxProduitsParseurTest.class
                .getResourceAsStream("/extranet/ubipharm/nouveaux/" + nom)) {
            assertNotNull(in, nom);
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private static NouveauxProduitsParseur.Resultat lire(String nom) throws IOException {
        return new NouveauxProduitsParseur().analyser(jeu(nom));
    }

    @Test
    void plusieursProduitsAvecTitresDeColonnesEtEntitesDecodees() throws Exception {
        NouveauxProduitsParseur.Resultat r = lire("reconstitue-nouveaux-produits.html");
        List<NouveauProduitUbipharm> l = r.lignes();
        /* les liens ecrits dans le script ne sont pas des produits */
        assertEquals(Arrays.asList("FAIR248", "0042ABC", ""),
                l.stream().map(NouveauProduitUbipharm::pscode).collect(Collectors.toList()));
        assertEquals(Arrays.asList(1, 2, 3),
                l.stream().map(NouveauProduitUbipharm::position).collect(Collectors.toList()));
        assertFalse(r.paginationDetectee());

        NouveauProduitUbipharm a = l.get(0);
        assertEquals("1", a.sheettype());
        assertEquals("FAIRE & DÉFAIRE CRÈME 50 ML", a.designation());
        assertEquals("3000001262862", a.cip());
        assertEquals(NouveauProduitUbipharm.CIP_DETAIL, a.cipSource());
        assertEquals("PARAPHARMACIE", a.categorie());
        assertEquals("07/11/2026", a.dateAffichee());
        assertEquals(LocalDate.of(2026, 11, 7), a.date());
        assertEquals("Mise en place", a.mouvement());
        /* la bulle d'agences n'entre pas dans la disponibilite globale */
        assertEquals("En stock", a.disponibiliteBrute());
        assertEquals("En stock", a.disponibilite());

        NouveauProduitUbipharm b = l.get(1);
        assertEquals("L'HUILE D’ARGAN <BIO>", b.designation());
        /* CIP en chaine : zeros de tete gardes, etiquette retiree */
        assertEquals("0123456", b.cip());
        assertEquals("COSMÉTIQUE", b.categorie());
        /* date affichee avec heure : le jour est lu, l'heure n'est pas gardee */
        assertEquals("06/11/2026 14:35", b.dateAffichee());
        assertEquals(LocalDate.of(2026, 11, 6), b.date());
        assertEquals("Nouveau référencement", b.mouvement());
        /* N/A : inconnu, jamais 0 */
        assertEquals("N/A", b.disponibiliteBrute());
        assertNull(b.disponibilite());

        /* produit sans reference : "" (attribut vide), pas null ; cellules vides = "" */
        NouveauProduitUbipharm c = l.get(2);
        assertEquals("", c.pscode());
        assertNull(c.cip());
        assertNull(c.cipSource());
        assertEquals("", c.categorie());
        assertEquals("", c.dateAffichee());
        assertNull(c.date());
        assertEquals("Oui", c.disponibilite());
        assertTrue(c.agences().isEmpty());
    }

    @Test
    void plusieursAgencesDisponibilitesTexteEtColisagesMultiples() throws Exception {
        List<NouveauProduitUbipharm> l = lire("reconstitue-nouveaux-produits.html").lignes();
        List<DisponibiliteAgence> ag = l.get(0).agences();
        assertEquals(Arrays.asList("BKE", "GNA", "YOP"),
                ag.stream().map(DisponibiliteAgence::etcoda).collect(Collectors.toList()));
        assertEquals("UBIPHARM BOUAKE", ag.get(0).etlib());
        assertEquals("Agence de Bouaké", ag.get(0).lgetlib());
        /* « Oui » et « En stock » restent du texte */
        assertEquals("Oui", ag.get(0).disponibilite());
        assertEquals(Collections.singletonList(12), ag.get(0).colisages());
        assertEquals("N/A", ag.get(1).disponibiliteBrute());
        assertNull(ag.get(1).disponibilite());
        assertNull(ag.get(1).colisages());
        assertEquals("N/A", ag.get(1).colisagesBrut());
        assertEquals("En stock", ag.get(2).disponibilite());
        assertEquals(Arrays.asList(12, 24), ag.get(2).colisages());
        assertEquals("12, 24", ag.get(2).colisagesBrut());

        List<DisponibiliteAgence> ag2 = l.get(1).agences();
        assertEquals(Arrays.asList("VRI", "BKE"),
                ag2.stream().map(DisponibiliteAgence::etcoda).collect(Collectors.toList()));
        /* data-colisage porte par la cellule interieure */
        assertEquals(Arrays.asList(6, 10, 20), ag2.get(0).colisages());
        assertNull(ag2.get(0).lgetlib());
        /* « 0 » affiche reste un texte ; colisage vide = liste vide, pas inconnu */
        assertEquals("0", ag2.get(1).disponibilite());
        assertEquals("", ag2.get(1).colisagesBrut());
        assertEquals(Collections.emptyList(), ag2.get(1).colisages());
    }

    @Test
    void cipParChampCacheSansTitresEtBulleDansUnAttribut() throws Exception {
        NouveauxProduitsParseur.Resultat r = lire("reconstitue-sans-entete-cip-cache.html");
        List<NouveauProduitUbipharm> l = r.lignes();
        /* deux liens (image + texte) sur la meme ligne : un seul produit */
        assertEquals(2, l.size());
        NouveauProduitUbipharm a = l.get(0);
        assertEquals("DOLI500", a.pscode());
        assertEquals("DOLIPRANE 500 MG CPR B/16", a.designation());
        assertEquals("3400930000014", a.cip());
        assertEquals(NouveauProduitUbipharm.CIP_CHAMP_CACHE, a.cipSource());
        /* sans titre de colonne : seule la date est reconnue, le reste est inconnu */
        assertEquals(LocalDate.of(2026, 11, 1), a.date());
        assertNull(a.categorie());
        assertNull(a.mouvement());
        assertNull(a.disponibiliteBrute());
        assertEquals(Arrays.asList("BKE", "VRI"),
                a.agences().stream().map(DisponibiliteAgence::etcoda).collect(Collectors.toList()));
        assertEquals("En stock", a.agences().get(0).disponibilite());
        assertEquals(Collections.singletonList(24), a.agences().get(0).colisages());
        assertEquals(Arrays.asList(120, 140), a.agences().get(1).colisages());

        NouveauProduitUbipharm b = l.get(1);
        assertEquals("00012345", b.cip());
        assertEquals(1, b.agences().size());
        DisponibiliteAgence g = b.agences().get(0);
        assertEquals("GNA", g.etcoda());
        assertEquals("UBIPHARM GAGNOA", g.etlib());
        assertNull(g.disponibilite());
        assertNull(g.colisages());
        assertFalse(r.paginationDetectee());
    }

    @Test
    void paginationVisibleSignalee() throws Exception {
        NouveauxProduitsParseur.Resultat r = lire("reconstitue-pagination.html");
        assertTrue(r.paginationDetectee());
        assertEquals(1, r.lignes().size());
        assertEquals("1111111", r.lignes().get(0).cip());
        assertEquals(LocalDate.of(2026, 11, 5), r.lignes().get(0).date());
    }

    @Test
    void pageSansProduitDonneUneListeVideEtPaginationCacheeIgnoree() throws Exception {
        NouveauxProduitsParseur.Resultat r = lire("reconstitue-vide.html");
        assertTrue(r.lignes().isEmpty());
        assertFalse(r.paginationDetectee());
        assertTrue(new NouveauxProduitsParseur().analyser("").lignes().isEmpty());
        assertTrue(new NouveauxProduitsParseur().analyser(null).lignes().isEmpty());
    }

    @Test
    void scriptIgnoreEtJsonSansHtml() throws Exception {
        for (NouveauProduitUbipharm p : lire("reconstitue-nouveaux-produits.html").lignes()) {
            assertFalse(p.pscode().startsWith("SCRIPT"));
            String j = p.toJson().toString();
            assertFalse(j.contains("<td") || j.contains("<div") || j.contains("<a ") || j.contains("tip-viewStock"), j);
        }
        JSONObject j = lire("reconstitue-nouveaux-produits.html").lignes().get(1).toJson();
        assertEquals(JSONObject.NULL, j.get("disponibilite"));
        assertEquals("N/A", j.get("disponibiliteBrute"));
        assertEquals("2026-11-06", j.get("date"));
        assertEquals("0123456", j.get("cip"));
        assertEquals(JSONObject.NULL, j.getJSONArray("agences").getJSONObject(0).get("lgetlib"));
        assertEquals(JSONObject.NULL, lire("reconstitue-nouveaux-produits.html").lignes().get(0).toJson()
                .getJSONArray("agences").getJSONObject(1).get("colisages"));
    }
}
