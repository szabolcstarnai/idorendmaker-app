package hu.szabolcst.idorendmaker.service.impl;

import hu.szabolcst.idorendmaker.mapper.LevelMapper;
import hu.szabolcst.idorendmaker.model.dto.level.LevelDto;
import hu.szabolcst.idorendmaker.repository.LevelRepository;
import hu.szabolcst.idorendmaker.service.LevelService;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class LevelServiceImpl implements LevelService {

	private final LevelRepository levelRepository;
	private final LevelMapper levelMapper;

	@Override
	@Transactional
	public List<LevelDto> getAllLevels() {
		return levelRepository.findAllByOrderBySortOrderAsc().stream().map(levelMapper::toDto).toList();
	}

	@Override
	@Transactional
	public LevelDto getDefaultLevel() {
		return levelMapper.toDto(levelRepository.findFirstByIsDefaultTrue());
	}

	@Override
	@Transactional
	public Optional<LevelDto> getLevelById(final Integer id) {
		return levelRepository.findById(id).map(levelMapper::toDto);
	}

	@Override
	@Transactional
	public List<LevelDto> getLevelsByType(final String levelType) {
		return levelRepository.findAllByLevelTypeOrderBySortOrder(levelType).stream().map(levelMapper::toDto).toList();
	}

}
