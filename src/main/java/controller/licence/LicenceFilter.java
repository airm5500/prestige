/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package controller.licence;

import dal.Licence;
import dal.TOfficine;
import java.io.IOException;
import java.io.PrintStream;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.time.LocalDate;
import java.util.Optional;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.annotation.WebFilter;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.apache.commons.codec.digest.DigestUtils;
import org.json.JSONObject;

/**
 *
 * @author koben
 */
@WebFilter(filterName = "LicenceFilter", urlPatterns = { "/custom", "/flag/list" })
public class LicenceFilter implements Filter {

    private static final boolean debug = true;
    private static final String KEY = "fabt#e}24=3";
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    private FilterConfig filterConfig = null;

    public LicenceFilter() {
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest httpReq = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;
        proceedWithAuth2(httpReq, httpResponse, chain);
    }

    /**
     * Return the filter configuration object for this filter.
     *
     * @return
     */
    public FilterConfig getFilterConfig() {
        return (this.filterConfig);
    }

    /**
     * Set the filter configuration object for this filter.
     *
     * @param filterConfig
     *            The filter configuration object
     */
    public void setFilterConfig(FilterConfig filterConfig) {
        this.filterConfig = filterConfig;
    }

    /**
     * Destroy method for this filter
     */
    @Override
    public void destroy() {
    }

    /**
     * Init method for this filter
     */
    @Override
    public void init(FilterConfig filterConfig) {
        this.filterConfig = filterConfig;
        if (filterConfig != null) {
            if (debug) {
                log("LicenceFilter:Initializing filter");
            }
        }
    }

    /**
     * Return a String representation of this object.
     */
    @Override
    public String toString() {
        if (filterConfig == null) {
            return ("LicenceFilter()");
        }
        StringBuilder sb = new StringBuilder("LicenceFilter(");
        sb.append(filterConfig);
        sb.append(")");
        return (sb.toString());
    }

    public static String getStackTrace(Throwable t) {
        String stackTrace = null;
        try {
            StringWriter sw = new StringWriter();
            PrintWriter pw = new PrintWriter(sw);
            t.printStackTrace(pw);
            pw.close();
            sw.close();
            stackTrace = sw.getBuffer().toString();
        } catch (IOException ex) {
        }
        return stackTrace;
    }

    public void log(String msg) {
        filterConfig.getServletContext().log(msg);
    }

    private String encode(String dataToEncode) {
        return DigestUtils.sha1Hex(dataToEncode);
    }

    private void sendProcessingError(ServletResponse response) {
        try {
            response.setContentType("application/json;charset=UTF-8");
            try (PrintStream ps = new PrintStream(response.getOutputStream()); PrintWriter pw = new PrintWriter(ps)) {
                JSONObject json = new JSONObject();
                json.put("success", false).put("msg", "Votre licence n'est pas valide");
                pw.print(json.toString());
            }
            response.getOutputStream().close();
        } catch (IOException ex) {
        }
    }

    private Optional<Licence> getOne(String officineName) {
        try {
            Licence licence = em.find(Licence.class, officineName);
            return Optional.ofNullable(licence);
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    private TOfficine getOfficine() {
        return em.find(TOfficine.class, "1");
    }

    private void proceedWithAuth2(HttpServletRequest httpReq, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (httpReq.getRequestURI().contains("/laborex/custom") || httpReq.getRequestURI().contains("v1/flag")) {
            Optional<Licence> lc = getOne(encode(KEY.concat(getOfficine().getStrNOMCOMPLET())));

            if (lc.isEmpty()) {
                sendProcessingError(response);
            } else {
                if (lc.get().getDateEnd().isBefore(LocalDate.now())) {
                    sendProcessingError(response);
                } else {
                    chain.doFilter(httpReq, response);
                }
            }

        } else {
            chain.doFilter(httpReq, response);
        }
    }

}
