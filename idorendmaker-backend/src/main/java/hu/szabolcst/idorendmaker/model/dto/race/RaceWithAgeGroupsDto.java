package hu.szabolcst.idorendmaker.model.dto.race;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Data;
import lombok.Setter;

@Data
public class RaceWithAgeGroupsDto {

    private Integer id;
    private String name;
    private String discipline;
    private String boatClass;
    private String gender;
    private String distance;
    private Integer occurrence;
    private Boolean hidden;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS")
    private LocalDateTime createdAt;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS")
    private LocalDateTime updatedAt;
    private List<AgeGroupDto> ageGroups;

}