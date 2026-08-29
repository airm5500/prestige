package commonTasks.dto;

import java.util.List;

/** Corps JSON de la fusion des suggestions cochees : { "suggestionId": [id1, id2, ...] }. */
public class SuggestionIdsDTO {

    private List<String> suggestionId;
    /** Grossiste choisi pour porter la fusion quand les suggestions cochees melent plusieurs grossistes. */
    private String grossisteId;

    public List<String> getSuggestionId() {
        return suggestionId;
    }

    public void setSuggestionId(List<String> suggestionId) {
        this.suggestionId = suggestionId;
    }

    public String getGrossisteId() {
        return grossisteId;
    }

    public void setGrossisteId(String grossisteId) {
        this.grossisteId = grossisteId;
    }
}
