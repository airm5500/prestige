package commonTasks.dto;

import java.io.Serializable;

/**
 * Plan du 10/11, point 2 : une ligne de l'edition rp_reserve_apres_entree.jrxml (fenetre « Seuil de réserve atteint »).
 * Valeurs deja mises en forme comme a l'ecran, pour que le PDF et la fenetre se comparent texte a texte.
 */
public class LigneReserveApresEntreeDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private final String cip;
    private final String nom;
    private final String sens;
    private final String rayon;
    private final String reserve;
    private final String seuilMini;
    private final String seuilMaxi;
    private final String quantite;

    public LigneReserveApresEntreeDTO(String cip, String nom, String sens, String rayon, String reserve,
            String seuilMini, String seuilMaxi, String quantite) {
        this.cip = nn(cip);
        this.nom = nn(nom);
        this.sens = nn(sens);
        this.rayon = nn(rayon);
        this.reserve = nn(reserve);
        this.seuilMini = nn(seuilMini);
        this.seuilMaxi = nn(seuilMaxi);
        this.quantite = nn(quantite);
    }

    private static String nn(String v) {
        return v == null ? "" : v;
    }

    public String getCip() {
        return cip;
    }

    public String getNom() {
        return nom;
    }

    public String getSens() {
        return sens;
    }

    public String getRayon() {
        return rayon;
    }

    public String getReserve() {
        return reserve;
    }

    public String getSeuilMini() {
        return seuilMini;
    }

    public String getSeuilMaxi() {
        return seuilMaxi;
    }

    public String getQuantite() {
        return quantite;
    }
}
