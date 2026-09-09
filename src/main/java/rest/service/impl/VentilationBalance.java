package rest.service.impl;

import commonTasks.dto.BalanceDTO;
import commonTasks.dto.SummaryDTO;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.dto.BalanceVenteItemDTO;
import rest.service.dto.ModeReglementMontantDTO;
import util.Constant;
import util.DateConverter;

/**
 * La ventilation de la balance vente / caisse (retour du 09/09, point 4).
 *
 * <p>
 * Le document affiche sous les lignes VO / VNO repond a des questions que la balance ne posait pas : quelle part des
 * clients paie comptant, quelle part du chiffre d'affaires passe par le mobile money et par quel operateur, combien de
 * mouvements de caisse, de reglements tiers payant, de ventes a credit. Tout est calcule ICI, a partir des chiffres que
 * la balance a deja produits : aucune nouvelle requete, donc aucun risque que le document et la grille au-dessus ne
 * racontent pas la meme chose.
 * </p>
 *
 * <p>
 * Classe pure, sans base ni conteneur, pour etre verifiee a la main dans un test unitaire.
 * </p>
 */
public final class VentilationBalance {

    private VentilationBalance() {
    }

    /**
     * @param balances
     *            les lignes VNO (comptant) et VO (credit) de la balance
     * @param summary
     *            le resume de la balance (chiffre d'affaires net, especes, mobile, tiers payant...)
     * @param modes
     *            le montant encaisse par mode de reglement, tous modes confondus
     * @param mouvements
     *            les autres mouvements de caisse (fonds, entrees, sorties, reglements differes et tiers payant), avec
     *            leur nombre
     */
    public static JSONObject construire(List<BalanceDTO> balances, SummaryDTO summary,
            List<ModeReglementMontantDTO> modes, List<BalanceVenteItemDTO> mouvements) {
        BalanceDTO comptant = ligne(balances, Constant.VENTE_COMPTANT);
        BalanceDTO credit = ligne(balances, Constant.VENTE_ASSURANCE);
        long ventesComptant = comptant == null ? 0 : comptant.getNbreVente();
        long ventesCredit = credit == null ? 0 : credit.getNbreVente();
        long montantComptant = comptant == null ? 0 : comptant.getMontantNet();
        long montantCredit = credit == null ? 0 : credit.getMontantNet();
        long totalVentes = ventesComptant + ventesCredit;
        // Le chiffre d'affaires de reference est le net TTC de la balance : c'est lui que la colonne « % »
        // de la grille utilise deja pour repartir VO et VNO.
        long chiffreAffaires = summary == null ? montantComptant + montantCredit : summary.getMontantNet();

        JSONObject json = new JSONObject();
        json.put("totalVentes", totalVentes).put("chiffreAffaires", chiffreAffaires);
        json.put("comptant", bloc(ventesComptant, montantComptant, totalVentes, chiffreAffaires));
        json.put("credit", bloc(ventesCredit, montantCredit, totalVentes, chiffreAffaires));

        // Les modes, du plus encaisse au moins encaisse ; le mobile est en plus regroupe avec ses operateurs.
        List<ModeReglementMontantDTO> tries = new ArrayList<>(modes == null ? List.of() : modes);
        tries.sort(Comparator.comparingLong(ModeReglementMontantDTO::getMontant).reversed()
                .thenComparing(ModeReglementMontantDTO::getLibelle, String.CASE_INSENSITIVE_ORDER));
        JSONArray listeModes = new JSONArray();
        JSONArray operateurs = new JSONArray();
        long montantMobile = 0;
        long montantEspeces = 0;
        for (ModeReglementMontantDTO mode : tries) {
            JSONObject o = new JSONObject().put("modeId", mode.getModeId()).put("libelle", mode.getLibelle())
                    .put("mobile", mode.isMobile()).put("montant", mode.getMontant())
                    .put("part", pourcentage(mode.getMontant(), chiffreAffaires));
            listeModes.put(o);
            if (mode.isMobile()) {
                montantMobile += mode.getMontant();
                operateurs.put(o);
            } else if (Constant.MODE_ESP.equals(mode.getModeId())) {
                montantEspeces += mode.getMontant();
            }
        }
        json.put("modes", listeModes);
        json.put("mobile", new JSONObject().put("montant", montantMobile)
                .put("part", pourcentage(montantMobile, chiffreAffaires)).put("operateurs", operateurs));
        json.put("especes", new JSONObject().put("montant", montantEspeces).put("part",
                pourcentage(montantEspeces, chiffreAffaires)));
        // La part a credit du chiffre d'affaires : ce que les organismes doivent, et non ce que les clients
        // ont verse au comptoir.
        long montantTp = summary == null ? 0 : summary.getMontantTp();
        json.put("creditCa",
                new JSONObject().put("montant", montantTp).put("part", pourcentage(montantTp, chiffreAffaires)));

        JSONObject caisse = new JSONObject();
        caisse.put("fondCaisse", mouvement(mouvements, DateConverter.MVT_FOND_CAISSE));
        caisse.put("entrees", mouvement(mouvements, DateConverter.MVT_ENTREE_CAISSE));
        caisse.put("sorties", mouvement(mouvements, DateConverter.MVT_SORTIE_CAISSE));
        caisse.put("reglementsTp", mouvement(mouvements, DateConverter.MVT_REGLE_TP));
        caisse.put("reglementsDifferes", mouvement(mouvements, DateConverter.MVT_REGLE_DIFF));
        JSONObject entrees = caisse.getJSONObject("entrees");
        JSONObject sorties = caisse.getJSONObject("sorties");
        caisse.put("mouvements", new JSONObject().put("nombre", entrees.getLong("nombre") + sorties.getLong("nombre"))
                .put("montant", entrees.getLong("montant") - sorties.getLong("montant")));
        caisse.put("ventesCredit", new JSONObject().put("nombre", ventesCredit).put("montant", montantCredit));
        json.put("caisse", caisse);
        return json;
    }

    private static BalanceDTO ligne(List<BalanceDTO> balances, String typeVente) {
        if (balances == null) {
            return null;
        }
        return balances.stream().filter(b -> typeVente.equals(b.getTypeVente())).findFirst().orElse(null);
    }

    private static JSONObject bloc(long ventes, long montant, long totalVentes, long chiffreAffaires) {
        return new JSONObject().put("ventes", ventes).put("montant", montant)
                .put("partVentes", pourcentage(ventes, totalVentes))
                .put("partMontant", pourcentage(montant, chiffreAffaires));
    }

    private static JSONObject mouvement(List<BalanceVenteItemDTO> mouvements, String typeMvtCaisse) {
        long nombre = 0;
        long montant = 0;
        for (BalanceVenteItemDTO m : mouvements == null ? List.<BalanceVenteItemDTO> of() : mouvements) {
            if (typeMvtCaisse.equals(m.getTypeMvtCaisse())) {
                nombre += m.getNombre();
                montant += Objects.isNull(m.getMontantTTC()) ? 0 : m.getMontantTTC().longValue();
            }
        }
        return new JSONObject().put("nombre", nombre).put("montant", montant);
    }

    /** Part en pourcentage, a une decimale ; zero quand le total est nul. */
    public static double pourcentage(long valeur, long total) {
        if (total == 0) {
            return 0d;
        }
        return BigDecimal.valueOf(valeur).multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(Math.abs(total)), 1, RoundingMode.HALF_UP).doubleValue();
    }
}
