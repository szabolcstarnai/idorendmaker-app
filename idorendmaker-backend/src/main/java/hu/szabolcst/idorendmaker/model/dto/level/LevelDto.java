package hu.szabolcst.idorendmaker.model.dto.level;

import lombok.Data;

@Data
public class LevelDto {

    private String code;
    private String name;
    private String levelType;
    private Integer sortOrder;
    private Boolean isDefault;

}
