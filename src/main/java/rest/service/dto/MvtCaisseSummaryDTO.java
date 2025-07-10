package rest.service.dto;

import java.util.ArrayList;
import java.util.List;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

/**
 *
 * @author koben
 */
@Getter
@Setter
@Builder
public class MvtCaisseSummaryDTO {

    private long total;
    @Builder.Default
    private List<MvtCaisseModeDTO> modes = new ArrayList<>();

}
