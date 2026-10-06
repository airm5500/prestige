package commonTasks.dto;

import java.util.List;

/**
 * Corps JSON des actions sur des lignes de suggestion (plan d'octobre, 1.1 et 1.4) : { "lignes": [ { "id": "...",
 * "quantite": 3, "avecReliquat": true }, ... ] }.
 */
public class LignesSuggestionDTO {

    private List<LigneSuggestionDTO> lignes;

    public List<LigneSuggestionDTO> getLignes() {
        return lignes;
    }

    public void setLignes(List<LigneSuggestionDTO> lignes) {
        this.lignes = lignes;
    }

    public static class LigneSuggestionDTO {

        private String id;
        private Integer quantite;
        private Boolean avecReliquat;

        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }

        public Integer getQuantite() {
            return quantite;
        }

        public void setQuantite(Integer quantite) {
            this.quantite = quantite;
        }

        public Boolean getAvecReliquat() {
            return avecReliquat;
        }

        public void setAvecReliquat(Boolean avecReliquat) {
            this.avecReliquat = avecReliquat;
        }
    }
}
