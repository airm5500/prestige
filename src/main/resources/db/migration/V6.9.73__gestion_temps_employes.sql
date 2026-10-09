-- Socle RH : dossier employe, absences et pointages multi-sources.
-- Les donnees biometriques ne sont volontairement jamais stockees : le mobile
-- transmet uniquement le resultat de la verification locale.
CREATE TABLE IF NOT EXISTS employee_profile (
    id VARCHAR(40) NOT NULL,
    user_id VARCHAR(40) NULL,
    employee_number VARCHAR(60) NOT NULL,
    badge_number VARCHAR(120) NULL,
    first_name VARCHAR(120) NOT NULL,
    last_name VARCHAR(120) NOT NULL,
    phone VARCHAR(40) NULL,
    email VARCHAR(160) NULL,
    hire_date DATE NULL,
    active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_employee_number (employee_number),
    UNIQUE KEY uk_employee_badge (badge_number),
    UNIQUE KEY uk_employee_user (user_id),
    CONSTRAINT fk_employee_user FOREIGN KEY (user_id) REFERENCES t_user (lg_USER_ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS employee_absence (
    id VARCHAR(40) NOT NULL,
    employee_id VARCHAR(40) NOT NULL,
    absence_type VARCHAR(20) NOT NULL COMMENT 'LEAVE or REST',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'APPROVED',
    note VARCHAR(500) NULL,
    created_by VARCHAR(40) NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    KEY idx_absence_employee_dates (employee_id, start_date, end_date),
    CONSTRAINT fk_absence_employee FOREIGN KEY (employee_id) REFERENCES employee_profile (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS attendance_import_batch (
    id VARCHAR(40) NOT NULL,
    file_name VARCHAR(255) NULL,
    imported_rows INT NOT NULL DEFAULT 0,
    rejected_rows INT NOT NULL DEFAULT 0,
    imported_by VARCHAR(40) NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS attendance_event (
    id VARCHAR(40) NOT NULL,
    employee_id VARCHAR(40) NOT NULL,
    event_time DATETIME NOT NULL,
    event_type VARCHAR(20) NOT NULL COMMENT 'CHECK_IN, CHECK_OUT or UNKNOWN',
    source VARCHAR(20) NOT NULL COMMENT 'MOBILE, DEVICE or MANUAL',
    source_event_id VARCHAR(120) NULL,
    device_id VARCHAR(120) NULL,
    verification_method VARCHAR(20) NULL COMMENT 'BADGE, BIOMETRIC or MANUAL',
    latitude DECIMAL(10,7) NULL,
    longitude DECIMAL(10,7) NULL,
    import_batch_id VARCHAR(40) NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_attendance_source_event (source, source_event_id),
    KEY idx_attendance_employee_time (employee_id, event_time),
    CONSTRAINT fk_attendance_employee FOREIGN KEY (employee_id) REFERENCES employee_profile (id),
    CONSTRAINT fk_attendance_batch FOREIGN KEY (import_batch_id) REFERENCES attendance_import_batch (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS employee_session (
    id VARCHAR(40) NOT NULL,
    employee_id VARCHAR(40) NOT NULL,
    user_id VARCHAR(40) NOT NULL,
    login_at DATETIME NOT NULL,
    logout_at DATETIME NULL,
    session_token VARCHAR(120) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_employee_session_token (session_token),
    KEY idx_employee_session_dates (employee_id, login_at, logout_at),
    CONSTRAINT fk_session_employee FOREIGN KEY (employee_id) REFERENCES employee_profile (id),
    CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES t_user (lg_USER_ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
