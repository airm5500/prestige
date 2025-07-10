/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import java.io.Serializable;
import java.util.List;
import java.util.Objects;

/**
 *
 * @author Kobena
 *
 * @param <T>
 */
@SuppressWarnings({ "rawtypes", "unchecked" })
public class Result<T> implements Serializable {

    private final boolean success;
    private final T data;
    private final String msg;
    private final long total;
    private final T metaData;

    Result(boolean success, T data, long total) {
        this.success = success;
        this.data = data;
        this.msg = null;
        this.total = total;
        this.metaData = null;
    }

    Result(boolean success, T data, T metaData, long total) {
        this.success = success;
        this.data = data;
        this.msg = null;
        this.total = total;
        this.metaData = metaData;
    }

    Result(boolean success, String msg) {
        this.success = success;
        this.data = null;
        this.msg = msg;
        this.total = 0;
        this.metaData = null;
    }

    Result(T data) {
        this.success = true;
        this.data = data;
        this.msg = null;
        this.total = 0;
        this.metaData = null;
    }

    public boolean isSuccess() {
        return success;
    }

    public T getData() {
        return data;
    }

    public String getMsg() {
        return msg;
    }

    public long getTotal() {
        return total;
    }

    public T getMetaData() {
        return metaData;
    }

    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder("\"Result{\"");
        sb.append("success=").append(success);
        sb.append(", msg=").append(msg);
        sb.append(", total=").append(total);
        sb.append(", data=");
        if (data == null) {
            sb.append("null");
        } else if (data instanceof List) {
            List castList = (List) data;
            if (castList.isEmpty()) {
                sb.append("empty list");
            } else {
                Object firstItem = castList.get(0);
                sb.append("List of").append(firstItem.getClass());
            }
        } else {

            sb.append(data.toString());
        }
        sb.append("}");
        return sb.toString();
    }

    @Override
    public int hashCode() {
        int hash = 7;
        hash = 89 * hash + (this.success ? 1 : 0);
        hash = 89 * hash + Objects.hashCode(this.data);
        return hash;
    }

    @Override
    public boolean equals(Object obj) {
        if (obj == null) {
            return false;
        }
        if (getClass() != obj.getClass()) {
            return false;
        }
        final Result<?> other = (Result<?>) obj;
        if (this.success != other.success) {
            return false;
        }
        return Objects.deepEquals(this.data, other.data);
    }
}
