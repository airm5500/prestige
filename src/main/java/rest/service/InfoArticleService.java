package rest.service;

import java.time.LocalDate;
import java.util.List;
import rest.service.dto.InfoArticleDTO;

/**
 *
 * @author airman
 */
public interface InfoArticleService {

    List<InfoArticleDTO> fetchInfoArticles(LocalDate dtStart, String search);
}