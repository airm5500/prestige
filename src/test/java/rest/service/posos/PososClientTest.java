package rest.service.posos;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.util.HashMap;
import java.util.Map;
import org.json.JSONObject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Evolution 5, point 9 : la passerelle Posos, jouee contre un serveur simule.
 *
 * <p>
 * Le protocole est verifie de bout en bout sans reseau : jeton OAuth2 client_credentials, mise en cache, reprise apres
 * expiration, et surtout ce qui part et ce qui ne part pas - les produits sont envoyes PAR LEUR NOM, aucune donnee
 * identifiante du patient ne quitte l'officine, et une panne ne fait jamais croire qu'il n'y a pas d'alerte.
 */
public class PososClientTest {

    private PososClient client;
    private PososSimule simule;

    private static PososConfiguration config() {
        Map<String, String> m = new HashMap<>();
        m.put(PososConfiguration.CLE_URL, "https://api.exemple.test");
        m.put(PososConfiguration.CLE_CLIENT_ID, "identifiant-de-recette");
        m.put(PososConfiguration.CLE_CLIENT_SECRET, "secret-tres-confidentiel");
        return PososConfiguration.de(m);
    }

    private static PososDemande demandeSimple() {
        PososDemande d = new PososDemande();
        PososDemande.Produit p = new PososDemande.Produit();
        p.setNom("PARACETAMOL 500 MG COMPRIME");
        p.setQuantite(2);
        d.getProduits().add(p);
        PososDemande.Produit q = new PososDemande.Produit();
        q.setNom("IBUPROFENE 400 MG COMPRIME");
        d.getProduits().add(q);
        return d;
    }

    @BeforeEach
    public void avant() {
        client = new PososClient();
        simule = new PososSimule();
        client.setAppelant(simule);
    }

    @Test
    public void sansConfigurationLaSolutionIntermediaireRepondSansAucunAppel() {
        // Retour du 23/09 : sans acces Posos, c'est le mode demonstration qui repond - jamais un appel reseau.
        PososResultat r = client.analyser(PososConfiguration.de(new HashMap<>()), demandeSimple());
        assertTrue(r.isDemonstration(), "sans Posos configure, le mode demonstration repond");
        assertTrue(r.getAvertissement().contains("DÉMONSTRATION"));
        assertEquals(0, simule.appelsJeton);
        assertEquals(0, simule.appelsAnalyse);
    }

    @Test
    public void modeAucunSansConfigurationAucunAppelNEstTenteEtLIndisponibiliteEstDite() {
        java.util.Map<String, String> aucun = new HashMap<>();
        aucun.put("POSOS_MODE", "aucun");
        PososResultat r = client.analyser(PososConfiguration.de(aucun), demandeSimple());

        assertFalse(r.isDemonstration());
        assertFalse(r.isDisponible());
        assertTrue(r.getMessage().contains("pas configuré"), r.getMessage());
        assertEquals(0, simule.appelsJeton);
        assertEquals(0, simule.appelsAnalyse);
    }

    @Test
    public void unPososConfigurePrendLeRelaisDuModeDemonstration() {
        // Des que les acces sont renseignes, c'est Posos : la demonstration s'efface d'elle-meme.
        PososResultat r = client.analyser(config(), demandeSimple());
        assertFalse(r.isDemonstration());
        assertEquals(1, simule.appelsAnalyse);
    }

    @Test
    public void leJetonEstDemandeEnClientCredentialsPuisReutilise() {
        client.analyser(config(), demandeSimple());
        client.analyser(config(), demandeSimple());

        assertEquals(1, simule.appelsJeton, "le jeton doit etre mis en cache");
        assertEquals(2, simule.appelsAnalyse);
        assertEquals(java.util.List.of("client_credentials"), simule.parametre("grant_type"));
    }

    @Test
    public void leSecretVoyageEnBasicEtJamaisDansLeCorps() {
        client.analyser(config(), demandeSimple());

        String autorisation = simule.autorisationsRecues.get(0);
        assertTrue(autorisation != null && autorisation.startsWith("Basic "), String.valueOf(autorisation));
        // Le corps du formulaire ne doit pas reprendre le secret quand l'en-tete Basic est utilise.
        assertTrue(simule.parametre("client_secret").isEmpty(), simule.parametre("client_secret").toString());
        assertTrue(simule.parametre("client_id").isEmpty());
    }

    @Test
    public void leSecretPeutAussiVoyagerDansLeCorpsSiPososLExige() {
        Map<String, String> m = new HashMap<>();
        m.put(PososConfiguration.CLE_URL, "https://api.exemple.test");
        m.put(PososConfiguration.CLE_CLIENT_ID, "identifiant-de-recette");
        m.put(PososConfiguration.CLE_CLIENT_SECRET, "secret-tres-confidentiel");
        m.put(PososConfiguration.CLE_BASIC, "0");

        client.analyser(PososConfiguration.de(m), demandeSimple());

        assertEquals(java.util.List.of("identifiant-de-recette"), simule.parametre("client_id"));
        assertEquals(java.util.List.of("secret-tres-confidentiel"), simule.parametre("client_secret"));
        assertEquals(null, simule.autorisationsRecues.get(0));
    }

    @Test
    public void lAnalyseEstAppeleeAvecLeJetonPorteur() {
        client.analyser(config(), demandeSimple());

        assertEquals("Bearer jeton-simule", simule.autorisationsRecues.get(1));
        assertTrue(simule.urlsAppelees.get(0).endsWith(PososConfiguration.TOKEN_PATH_DEFAUT),
                simule.urlsAppelees.toString());
        assertTrue(simule.urlsAppelees.get(1).endsWith(PososConfiguration.ANALYSIS_PATH_DEFAUT),
                simule.urlsAppelees.toString());
    }

    @Test
    public void lesProduitsPartentParLeurNom() {
        client.analyser(config(), demandeSimple());

        JSONObject envoye = new JSONObject(simule.corpsRecus.get(0));
        assertEquals(2, envoye.getJSONArray("products").length());
        assertEquals("PARACETAMOL 500 MG COMPRIME", envoye.getJSONArray("products").getJSONObject(0).getString("name"));
        assertEquals(2, envoye.getJSONArray("products").getJSONObject(0).getInt("quantity"));
        // Le deuxieme produit n'a pas de quantite : le champ ne doit pas etre invente.
        assertFalse(envoye.getJSONArray("products").getJSONObject(1).has("quantity"));
    }

    @Test
    public void unProduitSansNomEstEcarteAuLieuDePartirVide() {
        PososDemande d = demandeSimple();
        PososDemande.Produit vide = new PososDemande.Produit();
        vide.setNom("   ");
        d.getProduits().add(vide);

        client.analyser(config(), d);

        assertEquals(2, new JSONObject(simule.corpsRecus.get(0)).getJSONArray("products").length());
    }

    @Test
    public void aucuneDonneeIdentifianteDuPatientNeQuitteLOfficine() {
        PososDemande d = demandeSimple();
        PososDemande.Contexte c = new PososDemande.Contexte();
        c.setAge(34);
        c.setSexe("f");
        c.setGrossesse(Boolean.TRUE);
        c.setInsuffisanceRenale(Boolean.FALSE);
        d.setContexte(c);

        client.analyser(config(), d);

        String corps = simule.corpsRecus.get(0);
        JSONObject patient = new JSONObject(corps).getJSONObject("patient");
        assertEquals(34, patient.getInt("age"));
        assertEquals("F", patient.getString("sex"));
        assertTrue(patient.getBoolean("pregnant"));
        assertFalse(patient.getBoolean("renalImpairment"));
        // Le contexte est clinique : rien qui designe une personne.
        for (String interdit : new String[] { "name", "firstName", "lastName", "phone", "nom", "prenom", "telephone",
                "socialSecurity", "insuree" }) {
            assertFalse(patient.has(interdit), interdit + " ne doit pas figurer : " + corps);
        }
    }

    @Test
    public void sansContexteAucunPatientNEstEnvoye() {
        client.analyser(config(), demandeSimple());

        assertFalse(new JSONObject(simule.corpsRecus.get(0)).has("patient"));
    }

    @Test
    public void unJetonRefuseDonneUnResultatIndisponibleEtNonUnResultatVide() {
        simule.statutJeton = 401;

        PososResultat r = client.analyser(config(), demandeSimple());

        assertFalse(r.isDisponible());
        assertTrue(r.getMessage().contains("refusé"), r.getMessage());
        assertEquals(0, simule.appelsAnalyse, "aucune analyse ne doit etre tentee sans jeton");
    }

    @Test
    public void unJetonExpireCotePososEstReprisUneFois() {
        simule.refuserLePremierAppel = true;
        simule.corpsAnalyse = "{\"alerts\":[{\"severity\":\"majeure\",\"label\":\"Association déconseillée\"}]}";

        PososResultat r = client.analyser(config(), demandeSimple());

        assertTrue(r.isDisponible(), r.getMessage());
        assertEquals(1, r.getAlertes().size());
        assertEquals(2, simule.appelsJeton, "le jeton doit etre redemande apres un 401");
        assertEquals(2, simule.appelsAnalyse);
    }

    @Test
    public void uneAnalyseRefuseeDonneUnResultatIndisponible() {
        simule.statutAnalyse = 500;

        PososResultat r = client.analyser(config(), demandeSimple());

        assertFalse(r.isDisponible());
        assertTrue(r.getMessage().contains("500"), r.getMessage());
    }

    @Test
    public void uneReponseIllisibleNeFaitPasCroireQuIlNyAPasDAlerte() {
        simule.corpsAnalyse = "ceci n'est pas du JSON";

        PososResultat r = client.analyser(config(), demandeSimple());

        assertFalse(r.isDisponible());
        assertTrue(r.getAlertes().isEmpty());
    }

    @Test
    public void uneDemandeSansProduitEstRefuseeAvantTouteConnexion() {
        PososResultat r = client.analyser(config(), new PososDemande());

        assertFalse(r.isDisponible());
        assertEquals(0, simule.appelsJeton);
    }

    @Test
    public void changerLesIdentifiantsJetteLeJetonEnCache() {
        // Sans cela, une revocation cote Posos restait sans effet pendant toute la duree du jeton : la
        // passerelle aurait continue a presenter l'ancien.
        client.analyser(config(), demandeSimple());
        assertEquals(1, simule.appelsJeton);

        Map<String, String> autre = new HashMap<>();
        autre.put(PososConfiguration.CLE_URL, "https://api.exemple.test");
        autre.put(PososConfiguration.CLE_CLIENT_ID, "nouvel-identifiant");
        autre.put(PososConfiguration.CLE_CLIENT_SECRET, "nouveau-secret");
        client.analyser(PososConfiguration.de(autre), demandeSimple());

        assertEquals(2, simule.appelsJeton, "un changement d'identifiants doit redemander un jeton");
    }

    @Test
    public void leJetonResteEnCacheQuandLaConfigurationNeChangePas() {
        client.analyser(config(), demandeSimple());
        // Une configuration reconstruite a l'identique ne doit PAS invalider le cache.
        client.analyser(config(), demandeSimple());

        assertEquals(1, simule.appelsJeton);
    }

    @Test
    public void leStatutNeRendJamaisDeSecretMemeJetonEnCache() {
        client.analyser(config(), demandeSimple());

        Map<String, Object> etat = client.statut(config());
        String rendu = etat.toString();

        assertEquals(Boolean.TRUE, etat.get("jetonEnCache"));
        assertFalse(rendu.contains("secret-tres-confidentiel"), rendu);
        assertFalse(rendu.contains("identifiant-de-recette"), rendu);
        assertFalse(rendu.contains("jeton-simule"), rendu);
    }
}
