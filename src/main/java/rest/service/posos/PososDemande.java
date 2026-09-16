package rest.service.posos;

import java.util.ArrayList;
import java.util.List;

/**
 * Demande d'analyse envoyee a Posos.
 *
 * <p>
 * Les produits sont identifies PAR LEUR NOM ({@code t_famille.str_NAME}) : c'est le choix de l'officine, et c'est Posos
 * qui fait la correspondance avec son referentiel. Le CIP est joint quand il est connu, a titre d'indice
 * supplementaire, mais il n'est pas ce qui identifie le produit.
 *
 * <p>
 * Le contexte patient est facultatif et volontairement minimal : age, sexe, grossesse, insuffisance renale ou
 * hepatique. Rien d'identifiant - ni nom, ni telephone, ni numero d'assure - ne quitte l'officine.
 */
public class PososDemande {

    private List<Produit> produits = new ArrayList<>();
    private Contexte contexte;

    public List<Produit> getProduits() {
        return produits;
    }

    public void setProduits(List<Produit> produits) {
        this.produits = produits == null ? new ArrayList<>() : produits;
    }

    public Contexte getContexte() {
        return contexte;
    }

    public void setContexte(Contexte contexte) {
        this.contexte = contexte;
    }

    public static class Produit {

        /** Nom du produit tel qu'il est tenu par l'officine. C'est lui qui identifie le produit. */
        private String nom;
        /** Quantite servie, si elle est connue. */
        private Integer quantite;
        /** Posologie saisie par le prescripteur, en texte libre, si elle est connue. */
        private String posologie;
        /** Indice supplementaire, jamais l'identifiant : Posos fait la correspondance sur le nom. */
        private String cip;

        public String getNom() {
            return nom;
        }

        public void setNom(String nom) {
            this.nom = nom;
        }

        public Integer getQuantite() {
            return quantite;
        }

        public void setQuantite(Integer quantite) {
            this.quantite = quantite;
        }

        public String getPosologie() {
            return posologie;
        }

        public void setPosologie(String posologie) {
            this.posologie = posologie;
        }

        public String getCip() {
            return cip;
        }

        public void setCip(String cip) {
            this.cip = cip;
        }
    }

    /** Contexte clinique, sans aucune donnee identifiante. */
    public static class Contexte {

        private Integer age;
        /** « F » ou « M ». */
        private String sexe;
        private Boolean grossesse;
        private Boolean allaitement;
        private Boolean insuffisanceRenale;
        private Boolean insuffisanceHepatique;

        public Integer getAge() {
            return age;
        }

        public void setAge(Integer age) {
            this.age = age;
        }

        public String getSexe() {
            return sexe;
        }

        public void setSexe(String sexe) {
            this.sexe = sexe;
        }

        public Boolean getGrossesse() {
            return grossesse;
        }

        public void setGrossesse(Boolean grossesse) {
            this.grossesse = grossesse;
        }

        public Boolean getAllaitement() {
            return allaitement;
        }

        public void setAllaitement(Boolean allaitement) {
            this.allaitement = allaitement;
        }

        public Boolean getInsuffisanceRenale() {
            return insuffisanceRenale;
        }

        public void setInsuffisanceRenale(Boolean insuffisanceRenale) {
            this.insuffisanceRenale = insuffisanceRenale;
        }

        public Boolean getInsuffisanceHepatique() {
            return insuffisanceHepatique;
        }

        public void setInsuffisanceHepatique(Boolean insuffisanceHepatique) {
            this.insuffisanceHepatique = insuffisanceHepatique;
        }
    }
}
