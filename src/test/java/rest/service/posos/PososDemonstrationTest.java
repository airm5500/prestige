package rest.service.posos;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;

/**
 * MODE DEMONSTRATION (provisoire) : les cas prepares pour la presentation, joues avec les LIBELLES EXACTS du catalogue
 * de l'officine. Rien n'est invente : un produit inconnu des regles est rendu « non reconnu ».
 */
public class PososDemonstrationTest {

    private static final PososDemonstration DEMO = PososDemonstration.livree();

    private static PososResultat analyser(PososDemande.Contexte c, String... produits) {
        PososDemande d = new PososDemande();
        List<PososDemande.Produit> l = new ArrayList<>();
        for (String nom : produits) {
            PososDemande.Produit p = new PososDemande.Produit();
            p.setNom(nom);
            l.add(p);
        }
        d.setProduits(l);
        d.setContexte(c);
        return DEMO.analyser(d);
    }

    private static List<String> gravites(PososResultat r, String nature) {
        return r.getAlertes().stream().filter(a -> a.getType().equals(nature)).map(PososResultat.Alerte::getGravite)
                .collect(Collectors.toList());
    }

    private static boolean contient(PososResultat r, String gravite, String morceau) {
        return r.getAlertes().stream()
                .anyMatch(a -> a.getGravite().equals(gravite) && a.getLibelle().contains(morceau));
    }

    @Test
    public void reconnaissanceParDebutDeMotEtFormesLocalesExclues() {
        assertEquals("CIPROFLOXACINE", DEMO.substances("CIPRO DENK 500MG CPR B/10").get(0).optString("code"));
        // Un collyre n'a pas les interactions de la forme orale.
        assertTrue(DEMO.substances("CIPRO 0,3% COLL 5ML").isEmpty());
        // « CR » exclut les cremes, mais ne doit pas exclure le laboratoire CREAT.
        assertFalse(DEMO.substances("PARACETAMOL CREAT 500MG CPR B/120").isEmpty());
        // Efferalgan codeine : deux substances.
        assertEquals(2, DEMO.substances("EFFERALGAN CODEINE CPR EFFV B/16").size());
    }

    @Test
    public void cas1DolipraneEtFercefol() {
        PososResultat r = analyser(null, "DOLIPRANE 500MG CPR B/16", "FERCEFOL CPR B/30");
        assertTrue(r.isDisponible() && r.isDemonstration());
        assertTrue(gravites(r, "Interaction").isEmpty(), "aucune interaction paracetamol / fer");
        assertTrue(contient(r, "Information", "1 g par prise"));
        assertTrue(contient(r, "Information", "selles en noir"));
        assertTrue(r.getProduitsNonReconnus().isEmpty());
        // Forme effervescente : le sodium est signale.
        assertTrue(contient(analyser(null, "DOLIPRANE 500MG CPR EFFV T/16"), "Information", "sodium"));
    }

    @Test
    public void cas2CiproFerAntiacide() {
        PososResultat r = analyser(null, "CIPRO DENK 500MG CPR B/10", "FERCEFOL CPR B/30", "MAALOX BUV SUSP FV 250ML");
        assertEquals(3, gravites(r, "Interaction").size());
        assertTrue(gravites(r, "Interaction").stream().allMatch(g -> g.equals("Précaution d'emploi")));
        assertEquals(0, r.nombreMajeures());
    }

    @Test
    public void cas3AvkEtAins() {
        PososResultat r = analyser(null, "SINTROM 4MG CPR SEC B/30", "BRUFEN 400MG CPR DRG B/30");
        assertTrue(contient(r, "Association déconseillée", "risque hémorragique"));
        assertEquals("Association déconseillée", r.getAlertes().get(0).getGravite(), "la plus grave en tete");
        assertTrue(r.nombreMajeures() >= 1);
        // Le paracetamol propose en substitution a sa propre precaution avec l'AVK.
        assertTrue(contient(analyser(null, "SINTROM 4MG CPR SEC B/30", "DOLIPRANE 1G CPR B/8"), "Précaution d'emploi",
                "4 g/j"));
    }

    @Test
    public void cas4MetformineInsuffisanceRenaleEtCorticoide() {
        PososDemande.Contexte c = new PososDemande.Contexte();
        c.setInsuffisanceRenale(true);
        PososResultat r = analyser(c, "GLUCOPHAGE 850MG CPR B/30 AFR", "CELESTENE 2MG CPR DISP SEC B/20");
        assertTrue(contient(r, "Contre-indication", "DFG"));
        assertTrue(contient(r, "À prendre en compte", "glycémie"));
        // Sans le contexte, la contre-indication renale ne sort pas.
        assertFalse(contient(analyser(null, "GLUCOPHAGE 850MG CPR B/30 AFR"), "Contre-indication", "DFG"));
    }

    @Test
    public void cas5Grossesse() {
        PososDemande.Contexte c = new PososDemande.Contexte();
        c.setGrossesse(true);
        PososResultat r = analyser(c, "BRUFEN 400MG CPR DRG B/30", "DOXY DENK 100MG CPR B/20", "FERCEFOL CPR B/30");
        assertTrue(contient(r, "Contre-indication", "6e mois"));
        assertTrue(contient(r, "Contre-indication", "2e trimestre"));
        assertTrue(contient(r, "Précaution d'emploi", "cycline"));
    }

    @Test
    public void cas6Levothyroxine() {
        PososResultat r = analyser(null, "LEVOTHYROX 75MCG CPR SEC B/30", "FERCEFOL CPR B/30",
                "MAALOX BUV SUSP FV 250ML");
        assertTrue(contient(r, "Précaution d'emploi", "lévothyroxine"));
        assertEquals(3, gravites(r, "Interaction").size());
    }

    @Test
    public void cas7DoublonParacetamolEtCodeineAllaitement() {
        PososDemande.Contexte c = new PososDemande.Contexte();
        c.setAllaitement(true);
        PososResultat r = analyser(c, "DOLIPRANE 1G CPR B/8", "EFFERALGAN CODEINE CPR EFFV B/16");
        assertTrue(contient(r, "Majeure", "paracétamol"), "doublon de paracetamol");
        assertTrue(contient(r, "Contre-indication", "allaitement"));
        assertTrue(r.nombreMajeures() >= 2);
    }

    @Test
    public void cas8PaludismeMarqueAConfirmer() {
        PososResultat r = analyser(null, "COARTEM 80/480MG CPR B/6", "CLARITHROMYCINE BIOG 500MG CPR PELL B/10");
        assertTrue(r.getAlertes().stream().anyMatch(a -> a.getRecommandation().contains("à confirmer")));
    }

    @Test
    public void produitInconnuNonReconnuEtRienInvente() {
        PososResultat r = analyser(null, "TAHOR 20MG CPR B/28", "DOLIPRANE 500MG CPR B/16");
        assertEquals(List.of("TAHOR 20MG CPR B/28"), r.getProduitsNonReconnus());
        assertTrue(r.getAlertes().stream().noneMatch(a -> a.getProduits().contains("TAHOR 20MG CPR B/28")));
    }

    @Test
    public void avertissementDitQueLeContenuNEstPasValide() {
        assertTrue(DEMO.avertissement().contains("DÉMONSTRATION"));
        assertTrue(DEMO.avertissement().contains("NON ENCORE VALIDÉ"));
    }

    @Test
    public void modeActiveUniquementCoteServeurEtSansAppelReseau() {
        PososConfiguration conf = PososConfiguration.de(java.util.Map.of("POSOS_MODE", "demonstration"));
        assertTrue(conf.modeDemonstration() && conf.estUtilisable());
        assertFalse(conf.estConfiguree(), "aucun identifiant Posos n'est pour autant pretendu present");
        assertEquals("demonstration", conf.diagnostic().get("mode"));
        PososClient client = new PososClient();
        client.setAppelant(new PososClient.Appelant() {
            public PososClient.Reponse poster(String u, java.util.Map<String, String> e, javax.ws.rs.core.Form f,
                    int d) {
                throw new AssertionError("aucun appel reseau en demonstration");
            }

            public PososClient.Reponse posterJson(String u, java.util.Map<String, String> e, String c, int d) {
                throw new AssertionError("aucun appel reseau en demonstration");
            }
        });
        PososDemande d = new PososDemande();
        PososDemande.Produit p = new PososDemande.Produit();
        p.setNom("DOLIPRANE 500MG CPR B/16");
        d.setProduits(List.of(p));
        PososResultat r = client.analyser(conf, d);
        assertTrue(r.isDemonstration() && r.getAvertissement().contains("DÉMONSTRATION"));
    }

    @Test
    public void lesAlertesQuiRecommandentUneAutreSubstanceLaNomment() {
        PososResultat r = analyser(null, "SINTROM 4MG CPR SEC B/30", "BRUFEN 400MG CPR DRG B/30");
        PososResultat.Alerte avkAins = r.getAlertes().get(0);
        assertEquals(List.of("PARACETAMOL"), avkAins.getProposer());
        // C'est l'AINS qui se remplace, JAMAIS l'anticoagulant.
        assertEquals(List.of("BRUFEN 400MG CPR DRG B/30"), avkAins.getARemplacer());
        PososDemande.Contexte c = new PososDemande.Contexte();
        c.setAllaitement(true);
        PososResultat codeine = analyser(c, "EFFERALGAN CODEINE CPR EFFV B/16", "FERCEFOL CPR B/30");
        assertTrue(codeine.getAlertes().stream().anyMatch(a -> a.getGravite().equals("Contre-indication")
                && a.getARemplacer().equals(List.of("EFFERALGAN CODEINE CPR EFFV B/16"))));
        // Une simple precaution d'espacement ne propose pas d'autre produit.
        PososResultat fer = analyser(null, "CIPRO DENK 500MG CPR B/10", "FERCEFOL CPR B/30");
        assertTrue(fer.getAlertes().stream().allMatch(a -> a.getProposer().isEmpty()));
    }
}
