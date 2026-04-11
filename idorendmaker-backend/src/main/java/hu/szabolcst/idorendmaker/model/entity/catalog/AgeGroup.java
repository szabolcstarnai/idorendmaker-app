package hu.szabolcst.idorendmaker.model.entity.catalog;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "age_groups")
public class AgeGroup {

    @Id
    private String code;

    @Column(nullable = false)
    private String name;

    @Column(name = "sort_order")
    private Integer sortOrder;
}
