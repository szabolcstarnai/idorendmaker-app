package hu.szabolcst.idorendmaker.model.entity;

import java.io.Serializable;
import java.util.Objects;

public class RaceAgeGroupId implements Serializable {

    private Integer raceId;
    private Integer ageGroupId;

    public RaceAgeGroupId() {
    }

    public RaceAgeGroupId(final Integer raceId, final Integer ageGroupId) {
        this.raceId = raceId;
        this.ageGroupId = ageGroupId;
    }

    @Override
    public boolean equals(final Object o) {
        if (this == o) return true;
        if (!(o instanceof RaceAgeGroupId that)) return false;
        return Objects.equals(raceId, that.raceId) && Objects.equals(ageGroupId, that.ageGroupId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(raceId, ageGroupId);
    }
}
