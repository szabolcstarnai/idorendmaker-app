package hu.szabolcst.idorendmaker.model.entity.catalog;

import java.io.Serializable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class RaceAgeGroupId implements Serializable {

    private String raceCode;
    private String ageGroupCode;
}
