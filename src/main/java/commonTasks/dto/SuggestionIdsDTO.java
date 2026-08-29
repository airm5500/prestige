package commonTasks.dto;

import java.util.List;

/** Corps JSON de la fusion des suggestions cochees : { "suggestionId": [id1, id2, ...] }. */
public class SuggestionIdsDTO {

    private List<String> suggestionId;

    public List<String> getSuggestionId() {
        return suggestionId;
    }

    public void setSuggestionId(List<String> suggestionId) {
        this.suggestionId = suggestionId;
    }
}
