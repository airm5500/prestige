package dal;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.Table;

/**
 * Modele de message SMS / WhatsApp des campagnes clients (point 2). Le contenu peut porter des variables : {client},
 * {prenom}, {nom}, {medicament}, {officine}, {telephone_officine}, {dernier_achat}.
 */
@Entity
@Table(name = "modele_message")
@NamedQueries({ @NamedQuery(name = "ModeleMessage.findAll", query = "SELECT m FROM ModeleMessage m ORDER BY m.libelle"),
        @NamedQuery(name = "ModeleMessage.findActifs", query = "SELECT m FROM ModeleMessage m WHERE m.actif = TRUE ORDER BY m.libelle") })
public class ModeleMessage implements Serializable {

    private static final long serialVersionUID = 1L;

    /** Valeurs du canal : SMS, WHATSAPP ou TOUS. */
    public static final String CANAL_SMS = "SMS";
    public static final String CANAL_WHATSAPP = "WHATSAPP";
    public static final String CANAL_TOUS = "TOUS";

    @Id
    @Column(name = "id", nullable = false, length = 40)
    private String id = UUID.randomUUID().toString();
    @Column(name = "libelle", nullable = false, length = 80)
    private String libelle;
    @Column(name = "canal", nullable = false, length = 10)
    private String canal = CANAL_TOUS;
    @Column(name = "contenu", nullable = false, length = 1000)
    private String contenu;
    @Column(name = "actif", nullable = false)
    private boolean actif = true;
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getLibelle() {
        return libelle;
    }

    public void setLibelle(String libelle) {
        this.libelle = libelle;
    }

    public String getCanal() {
        return canal;
    }

    public void setCanal(String canal) {
        this.canal = canal;
    }

    public String getContenu() {
        return contenu;
    }

    public void setContenu(String contenu) {
        this.contenu = contenu;
    }

    public boolean isActif() {
        return actif;
    }

    public void setActif(boolean actif) {
        this.actif = actif;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    /** Vrai si le modele peut servir sur ce canal (SMS ou WHATSAPP). */
    public boolean convientAuCanal(String canalDemande) {
        return CANAL_TOUS.equals(canal) || canalDemande == null || canalDemande.isBlank()
                || canal.equalsIgnoreCase(canalDemande.trim());
    }
}
