package hu.szabolcst.idorendmaker.service.impl;

import hu.szabolcst.idorendmaker.mapper.LevelMapper;
import hu.szabolcst.idorendmaker.model.dto.level.LevelDto;
import hu.szabolcst.idorendmaker.repository.jdbc.LevelJdbcRepository;
import hu.szabolcst.idorendmaker.service.LevelService;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class LevelServiceImpl implements LevelService {

    private final LevelJdbcRepository levelRepository;
    private final LevelMapper levelMapper;

    @Transactional
    public List<LevelDto> getAllLevels() {
        Objects.requireNonNull(this.levelMapper);
        return this.levelRepository.findAllByOrderBySortOrderAsc().stream().map(this.levelMapper::toDto).toList();
    }


    @Transactional
    public LevelDto getDefaultLevel() {
        return this.levelMapper.toDto(this.levelRepository.findFirstByIsDefaultTrue());
    }


    @Transactional
    public Optional<LevelDto> getLevelById(final Integer id) {
        Objects.requireNonNull(this.levelMapper);
        return this.levelRepository.findById(id).map(this.levelMapper::toDto);
    }


    @Transactional
    public List<LevelDto> getLevelsByType(final String levelType) {
        Objects.requireNonNull(this.levelMapper);
        return this.levelRepository.findAllByLevelTypeOrderBySortOrder(levelType).stream().map(this.levelMapper::toDto).toList();
    }
}


/* Location:              C:\Users\Szabolcs\Documents\PROJECTS\idorendmaker-app\idorendmaker-backend\target\idorendmaker-backend-1.0.0.jar!\BOOT-INF\classes\hu\szabolcst\idorendmaker\service\impl\LevelServiceImpl.class
 * Java compiler version: 21 (65.0)
 * JD-Core Version:       1.1.3
 */