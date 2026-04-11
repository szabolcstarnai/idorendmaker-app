package hu.szabolcst.idorendmaker.service.impl;

import hu.szabolcst.idorendmaker.mapper.BoatClassMapper;
import hu.szabolcst.idorendmaker.model.dto.boatclass.BoatClassDto;
import hu.szabolcst.idorendmaker.repository.catalog.BoatClassRepository;
import hu.szabolcst.idorendmaker.service.BoatClassService;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class BoatClassServiceImpl implements BoatClassService {

    private final BoatClassRepository boatClassRepository;
    private final BoatClassMapper boatClassMapper;

    @Override
    @Transactional(readOnly = true, transactionManager = "catalogTransactionManager")
    public List<BoatClassDto> getAllBoatClasses() {
        return boatClassRepository.findAllByOrderByNameAsc().stream()
            .map(boatClassMapper::toDto)
            .toList();
    }

    @Override
    @Transactional(readOnly = true, transactionManager = "catalogTransactionManager")
    public List<String> getDistinctBoatTypes() {
        return boatClassRepository.findDistinctBoatTypeCodes();
    }

    @Override
    @Transactional(readOnly = true, transactionManager = "catalogTransactionManager")
    public List<String> getDistinctSeatCountTexts() {
        return boatClassRepository.findDistinctSeatCountTexts();
    }

    @Override
    @Transactional(readOnly = true, transactionManager = "catalogTransactionManager")
    public Optional<BoatClassDto> getBoatClassByCode(final String code) {
        return boatClassRepository.findById(code).map(boatClassMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true, transactionManager = "catalogTransactionManager")
    public Optional<BoatClassDto> getBoatClassByName(final String name) {
        return boatClassRepository.findByName(name).map(boatClassMapper::toDto);
    }
}
