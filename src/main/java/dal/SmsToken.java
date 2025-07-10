/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import java.io.Serializable;
import java.time.LocalDateTime;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Index;
import javax.persistence.Table;
import javax.persistence.UniqueConstraint;
import javax.validation.constraints.NotNull;
import org.json.JSONPropertyName;

/**
 *
 * @author koben
 */
@Entity
@Table(name = "sms_token", indexes = { @Index(name = "sms_token_index", columnList = "access_token")

}, uniqueConstraints = { @UniqueConstraint(name = "sms_token_un", columnNames = { "access_token" }) })

public class SmsToken implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "id", nullable = false, length = 16)
    private String id;
    @NotNull
    @Column(name = "expires_in", nullable = false)
    private Integer expiresIn;
    @NotNull
    @Column(name = "access_token", nullable = false, length = 200)
    private String accessToken;
    @NotNull
    @Column(name = "app_header", nullable = false, length = 1000)
    private String header;
    @NotNull
    @Column(name = "create_date", nullable = false)
    private LocalDateTime createDate = LocalDateTime.now();

    public void setId(String id) {
        this.id = id;
    }

    public String getId() {
        return id;
    }

    @JSONPropertyName("expires_in")
    public Integer getExpiresIn() {
        return expiresIn;
    }

    public void setExpiresIn(Integer expiresIn) {
        this.expiresIn = expiresIn;
    }

    @JSONPropertyName("access_token")
    public String getAccessToken() {
        return accessToken;
    }

    public void setAccessToken(String accessToken) {
        this.accessToken = accessToken;
    }

    public String getHeader() {
        return header;
    }

    public void setHeader(String header) {
        this.header = header;
    }

    public LocalDateTime getCreateDate() {
        return createDate;
    }

    public void setCreateDate(LocalDateTime createDate) {
        this.createDate = createDate;
    }

    public SmsToken() {
    }

}
