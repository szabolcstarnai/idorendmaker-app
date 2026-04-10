package hu.szabolcst.idorendmaker.model.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
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
    @Column(name = "race_id")
    private Integer raceId;

    @Id
    @Column(name = "age_group_id")
    private Integer ageGroupId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "race_id", insertable = false, updatable = false)
    private Race race;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "age_group_id", insertable = false, updatable = false)
    private AgeGroup ageGroup;
}
