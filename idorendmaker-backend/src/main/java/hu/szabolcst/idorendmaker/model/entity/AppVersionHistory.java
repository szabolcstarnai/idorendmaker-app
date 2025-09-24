package hu.szabolcst.idorendmaker.model.entity;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class AppVersionHistory {

    private Integer id;
    private String version;
    private Boolean migrationsRun = Boolean.FALSE;
    private Boolean whatsNewSeen = Boolean.FALSE;
    private LocalDateTime migratedAt;
    private LocalDateTime seenAt;
    private LocalDateTime createdAt;

    public AppVersionHistory() {
        this.createdAt = LocalDateTime.now();
    }

    public AppVersionHistory(String version) {
        this();
        this.version = version;
    }

}