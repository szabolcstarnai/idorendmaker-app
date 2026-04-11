package hu.szabolcst.idorendmaker.model.dto.level;

import lombok.Data;

@Data
public class LevelDto {

    private String code;
    /**
     * Legacy integer id. Retained only so Phase 4b user services
     * ({@code CompetitorServiceImpl}, {@code ScheduleMapper}) keep
     * compiling until they're rewritten to the string-code contract.
     * Populated only by the legacy entity path; the catalog path leaves
     * this null. The REST API contract is {@code code}.
     *
     * @deprecated will be removed in Phase 4b.
     */
    // TODO(Phase 4b): remove this deprecated Integer id field once user services use string codes.
    @Deprecated
    private Integer id;
    private String name;
    private String levelType;
    private Integer sortOrder;
    private Boolean isDefault;

}
