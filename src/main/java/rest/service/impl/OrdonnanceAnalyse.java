package rest.service.impl;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Analyse des ordonnances saisies (retour du 22/09) : taux, service, satisfaction, ventilations.
 *
 * <p>
 * Sans base de donnees, pour que chaque taux se verifie sur un jeu construit a la main. Les definitions, arretees avec
 * l'officine :
 * <ul>
 * <li><b>taux d'annulation</b> = ordonnances annulees / ordonnances saisies ;</li>
 * <li><b>satisfaction</b> = lignes servies EN ENTIER / lignes dont le service est renseigne ;</li>
 * <li><b>taux de service</b> = ordonnances entierement servies / ordonnances dont le service est renseigne.</li>
 * </ul>
 * Les annulees sont ecartees des taux de service, et les lignes « a renseigner » ne comptent ni pour ni contre : un
 * service qu'on n'a pas saisi n'est pas un service refuse. Leur nombre est donne a part, pour qu'un taux calcule sur
 * peu de lignes renseignees se lise comme tel.
 */
public final class OrdonnanceAnalyse {

    /** Une ordonnance telle que la lit {@link OrdonnanceClientSql#analyse}. */
    public static final class Ordonnance {
        final String statut;
        final String clientId;
        final String medecin;
        final String etablissement;
        final String typeClient;
        final int nbLignes;
        final int nbRenseignees;
        final int nbServies;
        final int qteServie;

        public Ordonnance(String statut, String clientId, String medecin, String etablissement, String typeClient,
                int nbLignes, int nbRenseignees, int nbServies, int qteServie) {
            this.statut = statut;
            this.clientId = clientId;
            this.medecin = medecin;
            this.etablissement = etablissement;
            this.typeClient = typeClient;
            this.nbLignes = nbLignes;
            this.nbRenseignees = nbRenseignees;
            this.nbServies = nbServies;
            this.qteServie = qteServie;
        }

        boolean annulee() {
            return dal.TOrdonnanceClient.STATUT_ANNULEE.equals(statut);
        }

        String etat() {
            return OrdonnanceClientSaisie.etatService(nbLignes, nbRenseignees, nbServies, qteServie);
        }
    }

    /** Libelle des valeurs absentes dans les ventilations : une ordonnance sans prescripteur reste comptee. */
    static final String NON_RENSEIGNE = "Non renseigné";

    private OrdonnanceAnalyse() {
    }

    /** Taux en pourcentage a une decimale, ou null si le denominateur est nul (« pas de donnee », et non 0 %). */
    static Double taux(long numerateur, long denominateur) {
        if (denominateur <= 0) {
            return null;
        }
        return Math.round(numerateur * 1000.0 / denominateur) / 10.0;
    }

    /** Compteurs d'un groupe d'ordonnances : le meme calcul sert la synthese et chaque ligne de ventilation. */
    static final class Compteur {
        int ordonnances;
        int annulees;
        int lignes;
        int lignesRenseignees;
        int lignesServies;
        int servies;
        int partielles;
        int nonServies;
        int aRenseigner;
        final Set<String> clients = new HashSet<>();

        void ajouter(Ordonnance o) {
            ordonnances++;
            if (o.clientId != null) {
                clients.add(o.clientId);
            }
            if (o.annulee()) {
                annulees++;
                return;
            }
            lignes += o.nbLignes;
            lignesRenseignees += o.nbRenseignees;
            lignesServies += o.nbServies;
            switch (o.etat()) {
            case OrdonnanceClientSaisie.SERVICE_SERVIE:
                servies++;
                break;
            case OrdonnanceClientSaisie.SERVICE_PARTIELLE:
                partielles++;
                break;
            case OrdonnanceClientSaisie.SERVICE_NON_SERVIE:
                nonServies++;
                break;
            default:
                aRenseigner++;
            }
        }

        int actives() {
            return ordonnances - annulees;
        }

        JSONObject json() {
            int renseignees = servies + partielles + nonServies;
            return new JSONObject().put("ordonnances", ordonnances).put("clients", clients.size())
                    .put("annulees", annulees).put("actives", actives())
                    .put("tauxAnnulation", nul(taux(annulees, ordonnances))).put("lignes", lignes)
                    .put("lignesRenseignees", lignesRenseignees).put("lignesServies", lignesServies)
                    .put("lignesARenseigner", lignes - lignesRenseignees)
                    .put("satisfaction", nul(taux(lignesServies, lignesRenseignees))).put("servies", servies)
                    .put("partielles", partielles).put("nonServies", nonServies).put("aRenseigner", aRenseigner)
                    .put("tauxService", nul(taux(servies, renseignees)))
                    .put("produitsParOrdonnance", actives() == 0 ? 0 : Math.round(lignes * 10.0 / actives()) / 10.0);
        }
    }

    private static Object nul(Double v) {
        return v == null ? JSONObject.NULL : v;
    }

    /** Synthese et ventilations, pretes pour l'ecran. */
    public static JSONObject analyser(List<Ordonnance> ordonnances, JSONArray produits) {
        Compteur total = new Compteur();
        for (Ordonnance o : ordonnances) {
            total.ajouter(o);
        }
        return new JSONObject().put("success", true).put("synthese", total.json())
                .put("parPrescripteur", ventiler(ordonnances, o -> o.medecin))
                .put("parEtablissement", ventiler(ordonnances, o -> o.etablissement))
                .put("parType", ventiler(ordonnances, o -> o.typeClient))
                .put("produits", produits == null ? new JSONArray() : produits);
    }

    /** Une ligne par valeur de l'axe, de la plus frequente a la moins frequente, avec sa part du total. */
    static JSONArray ventiler(List<Ordonnance> ordonnances, Function<Ordonnance, String> axe) {
        Map<String, Compteur> groupes = new LinkedHashMap<>();
        for (Ordonnance o : ordonnances) {
            String cle = StringUtils.defaultIfBlank(StringUtils.trimToEmpty(axe.apply(o)), NON_RENSEIGNE);
            groupes.computeIfAbsent(cle, k -> new Compteur()).ajouter(o);
        }
        List<Map.Entry<String, Compteur>> tries = new ArrayList<>(groupes.entrySet());
        tries.sort(Comparator.<Map.Entry<String, Compteur>> comparingInt(e -> -e.getValue().ordonnances)
                .thenComparing(Map.Entry::getKey));
        JSONArray lignes = new JSONArray();
        int n = ordonnances.size();
        for (Map.Entry<String, Compteur> e : tries) {
            lignes.put(
                    e.getValue().json().put("libelle", e.getKey()).put("part", nul(taux(e.getValue().ordonnances, n))));
        }
        return lignes;
    }

    /** Une ligne de produit prescrit, avec son propre taux de satisfaction. */
    public static JSONObject produit(String libelle, int nbPrescriptions, int qtePrescrite, int nbRenseignees,
            int nbServies, int qteServie) {
        return new JSONObject().put("produit", StringUtils.defaultString(libelle))
                .put("nbPrescriptions", nbPrescriptions).put("qtePrescrite", qtePrescrite)
                .put("nbRenseignees", nbRenseignees).put("nbServies", nbServies).put("qteServie", qteServie)
                .put("satisfaction", nul(taux(nbServies, nbRenseignees)));
    }
}
