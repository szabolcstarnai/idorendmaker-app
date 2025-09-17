package hu.szabolcst.idorendmaker.model.dto.level;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDateTime;
import lombok.Data;

@Data
public class LevelDto {

    private Integer id;
    private String name;
    private String levelType;
    private Integer sortOrder;
    private Boolean isDefault;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS")
    private LocalDateTime createdAt;

}