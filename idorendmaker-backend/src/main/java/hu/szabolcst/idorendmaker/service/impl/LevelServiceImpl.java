package hu.szabolcst.idorendmaker.service.impl;

import hu.szabolcst.idorendmaker.mapper.LevelMapper;
import hu.szabolcst.idorendmaker.model.dto.level.LevelDto;
import hu.szabolcst.idorendmaker.repository.catalog.LevelRepository;
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
	@Transactional(readOnly = true, transactionManager = "catalogTransactionManager")
	public List<LevelDto> getAllLevels() {
		return levelRepository.findAllByOrderBySortOrderAsc().stream().map(levelMapper::toDto).toList();
	}

	@Override
	@Transactional(readOnly = true, transactionManager = "catalogTransactionManager")
	public LevelDto getDefaultLevel() {
		return levelRepository.findFirstByIsDefaultTrue().map(levelMapper::toDto).orElse(null);
	}

	@Override
	@Transactional(readOnly = true, transactionManager = "catalogTransactionManager")
	public Optional<LevelDto> getLevelByCode(final String code) {
		return levelRepository.findById(code).map(levelMapper::toDto);
	}

	@Override
	@Transactional(readOnly = true, transactionManager = "catalogTransactionManager")
	public List<LevelDto> getLevelsByType(final String levelType) {
		return levelRepository.findAllByLevelTypeOrderBySortOrderAsc(levelType).stream().map(levelMapper::toDto).toList();
	}

}
