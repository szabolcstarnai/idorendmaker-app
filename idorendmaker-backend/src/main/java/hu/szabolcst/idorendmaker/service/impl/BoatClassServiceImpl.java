package hu.szabolcst.idorendmaker.service.impl;

import hu.szabolcst.idorendmaker.mapper.BoatClassMapper;
import hu.szabolcst.idorendmaker.model.dto.boatclass.BoatClassDto;
import hu.szabolcst.idorendmaker.repository.BoatClassRepository;
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
    @Transactional
    public List<BoatClassDto> getAllBoatClasses() {
        return boatClassRepository.findAllByOrderByNameAsc().stream()
            .map(boatClassMapper::toDto)
            .toList();
    }

    @Override
    @Transactional
    public List<String> getDistinctBoatTypes() {
        return boatClassRepository.findDistinctBoatTypes();
    }

    @Override
    @Transactional
    public List<String> getDistinctSeatCountTexts() {
        return boatClassRepository.findDistinctSeatCountTexts();
    }

    @Override
    @Transactional
    public Optional<BoatClassDto> getBoatClassById(final Integer id) {
        return boatClassRepository.findById(id).map(boatClassMapper::toDto);
    }

    @Override
    @Transactional
    public Optional<BoatClassDto> getBoatClassByName(final String name) {
        return Optional.ofNullable(boatClassRepository.findByName(name))
            .map(boatClassMapper::toDto);
    }
}