package hu.szabolcst.idorendmaker.model.entity.catalog;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "race_age_groups")
@IdClass(RaceAgeGroupId.class)
public class RaceAgeGroup {

    @Id
    @Column(name = "race_code")
    private String raceCode;

    @Id
    @Column(name = "age_group_code")
    private String ageGroupCode;
}
