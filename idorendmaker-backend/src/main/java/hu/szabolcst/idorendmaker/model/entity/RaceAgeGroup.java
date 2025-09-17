package hu.szabolcst.idorendmaker.model.entity;

import lombok.Data;

@Data
public class RaceAgeGroup {

    private Integer raceId;
    private Integer ageGroupId;
    private Race race;
    private AgeGroup ageGroup;

}