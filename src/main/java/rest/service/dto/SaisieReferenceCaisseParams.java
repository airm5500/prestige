package rest.service.dto;

import commonTasks.dto.TiersPayantParams;
import java.util.ArrayList;
import java.util.List;

/**
 * Corps du PUT v1/prix-reference/vente/{venteId}/ligne/{detailId} (cas 2 du 03/11/2026) : la reference saisie pour un
 * tiers-payant, et ce que l'ecran envoie deja a net/assurance pour relancer le calcul du net.
 */
public class SaisieReferenceCaisseParams {

    private String tiersPayantId;
    private Integer valeur;
    private Integer taux;
    private String remiseId;
    private List<TiersPayantParams> tierspayants = new ArrayList<>();

    public String getTiersPayantId() {
        return tiersPayantId;
    }

    public void setTiersPayantId(String tiersPayantId) {
        this.tiersPayantId = tiersPayantId;
    }

    public Integer getValeur() {
        return valeur;
    }

    public void setValeur(Integer valeur) {
        this.valeur = valeur;
    }

    public Integer getTaux() {
        return taux;
    }

    public void setTaux(Integer taux) {
        this.taux = taux;
    }

    public String getRemiseId() {
        return remiseId;
    }

    public void setRemiseId(String remiseId) {
        this.remiseId = remiseId;
    }

    public List<TiersPayantParams> getTierspayants() {
        return tierspayants;
    }

    public void setTierspayants(List<TiersPayantParams> tierspayants) {
        this.tierspayants = tierspayants == null ? new ArrayList<>() : tierspayants;
    }
}
