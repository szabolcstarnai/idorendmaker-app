package hu.szabolcst.idorendmaker.model.dto.version;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AppVersionHistoryDto {

    private Integer id;
    private String version;
    private Boolean migrationsRun;
    private Boolean whatsNewSeen;
    private LocalDateTime migratedAt;
    private LocalDateTime seenAt;
    private LocalDateTime createdAt;

}