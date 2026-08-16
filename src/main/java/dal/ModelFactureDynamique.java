package dal;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Date;
import java.util.List;
import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.OneToMany;
import javax.persistence.OrderBy;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;

/**
 * Modele de facture dynamique cree par l'utilisateur (createur de modeles) : colonnes a afficher, libelles, ordre et
 * tri. Independant des modeles Jasper historiques (t_model_facture), qui restent inchanges.
 */
@Entity
@Table(name = "model_facture_dynamique")
public class ModelFactureDynamique implements Serializable {

    private static final long serialVersionUID = 1L;

    /** Le tri suit le champ tri de la fiche du tiers payant. */
    public static final String TRI_SELON_TIERS_PAYANT = "TIERS_PAYANT";
    public static final String TRI_ALPHABETIQUE = "ALPHABETIQUE";
    public static final String TRI_DATE_BON = "DATE_BON";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "str_NOM", nullable = false, length = 100)
    private String nom;

    @Column(name = "str_DESCRIPTION", length = 255)
    private String description;

    @Column(name = "str_MODE_TRI", length = 30)
    private String modeTri = TRI_SELON_TIERS_PAYANT;

    @Column(name = "str_STATUT", length = 20)
    private String statut = "enable";

    /** Afficher le bloc d'en-tete (nom de l'officine, bloc tiers payant, numero de facture). */
    @Column(name = "b_AFFICHER_ENTETE")
    private Boolean afficherEntete = Boolean.TRUE;

    /** Afficher le pied de page (filet et numerotation des pages). */
    @Column(name = "b_AFFICHER_PIED_PAGE")
    private Boolean afficherPiedPage = Boolean.TRUE;

    /** Detailler les produits de chaque bon : les lignes de vente sont affichees sous la ligne du bon. */
    @Column(name = "b_DETAILLER_PRODUITS")
    private Boolean detaillerProduits = Boolean.FALSE;

    /**
     * Taille de police des lignes de la facture, en points.
     *
     * 8 est la valeur d'origine, celle qui etait figee dans le code : un modele qui n'y touche pas garde exactement la
     * presentation qu'il avait. La descendre gagne de la place quand les colonnes sont nombreuses et que les noms sont
     * longs ; la monter rend la facture plus lisible quand il y a peu de colonnes.
     */
    @Column(name = "int_TAILLE_POLICE")
    private Integer taillePolice = TAILLE_POLICE_DEFAUT;

    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCreated;

    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUpdated;

    @OneToMany(mappedBy = "modele", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("ordre ASC")
    private List<ModelFactureDynamiqueColonne> colonnes = new ArrayList<>();

    /** Taille de police d'origine, figee dans le code avant que le createur ne la propose. */
    public static final int TAILLE_POLICE_DEFAUT = 8;

    /** En deca, plus rien n'est lisible sur papier. */
    public static final int TAILLE_POLICE_MINIMUM = 5;

    /** Au-dela, une ligne de bon ne tiendrait plus dans la hauteur prevue. */
    public static final int TAILLE_POLICE_MAXIMUM = 12;

    /**
     * Taille de police retenue, ramenee entre le minimum et le maximum.
     *
     * Une valeur absente ou aberrante - un modele cree avant cette option, ou une saisie fantaisiste - revient a la
     * taille d'origine plutot que de produire une facture illisible.
     */
    public int taillePoliceEffective() {
        if (taillePolice == null || taillePolice < TAILLE_POLICE_MINIMUM || taillePolice > TAILLE_POLICE_MAXIMUM) {
            return TAILLE_POLICE_DEFAUT;
        }
        return taillePolice;
    }

    public Integer getTaillePolice() {
        return taillePolice;
    }

    public void setTaillePolice(Integer taillePolice) {
        this.taillePolice = taillePolice;
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getNom() {
        return nom;
    }

    public void setNom(String nom) {
        this.nom = nom;
    }

    /** Vrai par defaut : un modele cree avant l'ajout de l'option garde l'en-tete complet. */
    public boolean isAfficherEntete() {
        return afficherEntete == null || afficherEntete;
    }

    public void setAfficherEntete(boolean afficherEntete) {
        this.afficherEntete = afficherEntete;
    }

    /** Vrai par defaut : un modele cree avant l'ajout de l'option garde le pied de page. */
    public boolean isAfficherPiedPage() {
        return afficherPiedPage == null || afficherPiedPage;
    }

    public void setAfficherPiedPage(boolean afficherPiedPage) {
        this.afficherPiedPage = afficherPiedPage;
    }

    /** Faux par defaut : un modele cree avant l'option garde une ligne par bon, sans detail des produits. */
    public boolean isDetaillerProduits() {
        return detaillerProduits != null && detaillerProduits;
    }

    public void setDetaillerProduits(boolean detaillerProduits) {
        this.detaillerProduits = detaillerProduits;
    }

    /** Colonnes du niveau BON (une ligne par dossier), dans l'ordre choisi. */
    public List<ModelFactureDynamiqueColonne> getColonnesBon() {
        return colonnesDuNiveau(ModelFactureDynamiqueColonne.NIVEAU_BON);
    }

    /** Colonnes du niveau PRODUIT (lignes de vente sous chaque bon), dans l'ordre choisi. */
    public List<ModelFactureDynamiqueColonne> getColonnesProduit() {
        return colonnesDuNiveau(ModelFactureDynamiqueColonne.NIVEAU_PRODUIT);
    }

    private List<ModelFactureDynamiqueColonne> colonnesDuNiveau(String niveau) {
        List<ModelFactureDynamiqueColonne> retenues = new ArrayList<>();
        for (ModelFactureDynamiqueColonne c : colonnes) {
            if (niveau.equals(c.getNiveau())) {
                retenues.add(c);
            }
        }
        retenues.sort(Comparator.comparing(ModelFactureDynamiqueColonne::getOrdre,
                Comparator.nullsLast(Comparator.naturalOrder())));
        return retenues;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getModeTri() {
        return modeTri;
    }

    public void setModeTri(String modeTri) {
        this.modeTri = modeTri;
    }

    public String getStatut() {
        return statut;
    }

    public void setStatut(String statut) {
        this.statut = statut;
    }

    public Date getDtCreated() {
        return dtCreated;
    }

    public void setDtCreated(Date dtCreated) {
        this.dtCreated = dtCreated;
    }

    public Date getDtUpdated() {
        return dtUpdated;
    }

    public void setDtUpdated(Date dtUpdated) {
        this.dtUpdated = dtUpdated;
    }

    public List<ModelFactureDynamiqueColonne> getColonnes() {
        return colonnes;
    }

    public void setColonnes(List<ModelFactureDynamiqueColonne> colonnes) {
        this.colonnes = colonnes;
    }
}
