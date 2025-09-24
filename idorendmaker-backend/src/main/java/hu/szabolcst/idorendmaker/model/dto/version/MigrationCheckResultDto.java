package hu.szabolcst.idorendmaker.model.dto.version;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MigrationCheckResultDto {

    private List<String> migrationsRun;
    private List<String> unseenVersions;
    private List<String> errors;

}