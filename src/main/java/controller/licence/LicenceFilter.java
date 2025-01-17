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
@WebFilter(filterName = "LicenceFilter", urlPatterns = {"/*"})
public class LicenceFilter implements Filter {

    private static final boolean debug = true;
    private static final String KEY = "fabt#e}24=3";
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    private FilterConfig filterConfig = null;

    public LicenceFilter() {
    }

    private void doBeforeProcessing(ServletRequest req, ServletResponse res)
            throws IOException, ServletException {
        if (debug) {
            log("LicenceFilter:DoBeforeProcessing");
        }
        HttpServletRequest httpReq = (HttpServletRequest) req;
        log("getRequestURI=========>>  " + httpReq.getRequestURI());

    }

    private void doAfterProcessing(ServletRequest request, ServletResponse response)
            throws IOException, ServletException {
        if (debug) {
            log("LicenceFilter:DoAfterProcessing");
        }

    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response,
            FilterChain chain)
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
     * @param filterConfig The filter configuration object
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

    private void sendProcessingError(Throwable t, ServletResponse response) {
        String stackTrace = getStackTrace(t);

        if (stackTrace != null && !stackTrace.equals("")) {
            try {
                response.setContentType("text/html");
                PrintStream ps = new PrintStream(response.getOutputStream());
                PrintWriter pw = new PrintWriter(ps);
                pw.print("<html>\n<head>\n<title>Error</title>\n</head>\n<body>\n"); //NOI18N

                // PENDING! Localize this for next official release
                pw.print("<h1>The resource did not process correctly</h1>\n<pre>\n");
                pw.print(stackTrace);
                pw.print("</pre></body>\n</html>"); //NOI18N
                pw.close();
                ps.close();
                response.getOutputStream().close();
            } catch (Exception ex) {
            }
        } else {
            try {
                PrintStream ps = new PrintStream(response.getOutputStream());
                t.printStackTrace(ps);
                ps.close();
                response.getOutputStream().close();
            } catch (Exception ex) {
            }
        }
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
        } catch (Exception ex) {
        }
        return stackTrace;
    }

    public void log(String msg) {
        filterConfig.getServletContext().log(msg);
    }

    private String encode(String dataToEncode) {
        return DigestUtils.sha1Hex(dataToEncode);
    }

    private void proceedWithAuth(HttpServletRequest httpReq, HttpServletResponse response, FilterChain chain) throws ServletException, IOException {
        if (httpReq.getRequestURI().contains("v1/vente") && !httpReq.getRequestURI().contains("v1/vente/search")) {
            Optional<Licence> lc = getOne(encode(getOfficine().getStrNOMABREGE()));
            if (lc.isPresent()) {
                if (lc.get().getDateEnd().isBefore(LocalDate.now())) {
                    sendProcessingError(response);
                } else {
                    chain.doFilter(httpReq, response);
                }
            } else {
                sendProcessingError(response);
            }

        } else {
            if (httpReq.getRequestURI().contains("/laborex/custom")) {
                Optional<Licence> lc = getOne(encode(KEY.concat(getOfficine().getStrNOMCOMPLET())));
                if (lc.get().getDateEnd().isBefore(LocalDate.now())) {
                    sendProcessingError(response);
                } else {
                    chain.doFilter(httpReq, response);
                }
            } else {
                chain.doFilter(httpReq, response);
            }

        }

    }

    private void sendProcessingError(ServletResponse response) {
        try {
            response.setContentType("application/json;charset=UTF-8");
            try ( PrintStream ps = new PrintStream(response.getOutputStream());  PrintWriter pw = new PrintWriter(ps)) {
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

    private void proceedWithAuth2(HttpServletRequest httpReq, HttpServletResponse response, FilterChain chain) throws ServletException, IOException {
        if (httpReq.getRequestURI().contains("/laborex/custom")|| httpReq.getRequestURI().contains("v1/flag")) {
            Optional<Licence> lc = getOne(encode(KEY.concat(getOfficine().getStrNOMCOMPLET())));
            if(lc.isEmpty()){
                   sendProcessingError(response);
            }else{
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
