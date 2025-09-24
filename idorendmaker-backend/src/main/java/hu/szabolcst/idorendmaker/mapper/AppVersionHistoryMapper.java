package hu.szabolcst.idorendmaker.mapper;

import hu.szabolcst.idorendmaker.model.dto.version.AppVersionHistoryDto;
import hu.szabolcst.idorendmaker.model.entity.AppVersionHistory;
import org.springframework.stereotype.Component;

@Component
public class AppVersionHistoryMapper {

    public AppVersionHistoryDto toDto(AppVersionHistory entity) {
        if (entity == null) {
            return null;
        }

        return AppVersionHistoryDto.builder()
                .id(entity.getId())
                .version(entity.getVersion())
                .migrationsRun(entity.getMigrationsRun())
                .whatsNewSeen(entity.getWhatsNewSeen())
                .migratedAt(entity.getMigratedAt())
                .seenAt(entity.getSeenAt())
                .createdAt(entity.getCreatedAt())
                .build();
    }

    public AppVersionHistory toEntity(AppVersionHistoryDto dto) {
        if (dto == null) {
            return null;
        }

        AppVersionHistory entity = new AppVersionHistory();
        entity.setId(dto.getId());
        entity.setVersion(dto.getVersion());
        entity.setMigrationsRun(dto.getMigrationsRun());
        entity.setWhatsNewSeen(dto.getWhatsNewSeen());
        entity.setMigratedAt(dto.getMigratedAt());
        entity.setSeenAt(dto.getSeenAt());
        entity.setCreatedAt(dto.getCreatedAt());

        return entity;
    }

}