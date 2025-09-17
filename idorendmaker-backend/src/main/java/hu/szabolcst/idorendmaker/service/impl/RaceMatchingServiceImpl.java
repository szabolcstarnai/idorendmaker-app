package hu.szabolcst.idorendmaker.service.impl;

import hu.szabolcst.idorendmaker.mapper.RaceMatchingMapper;
import hu.szabolcst.idorendmaker.model.dto.competitor.CompetitorRaceInfoDto;
import hu.szabolcst.idorendmaker.model.dto.matching.CompetitorDataDto;
import hu.szabolcst.idorendmaker.model.dto.matching.ExtractedCompetitorDto;
import hu.szabolcst.idorendmaker.model.dto.matching.ExtractedRaceDto;
import hu.szabolcst.idorendmaker.model.dto.matching.PDFCleanupResultDto;
import hu.szabolcst.idorendmaker.model.dto.matching.PDFDeletionResultDto;
import hu.szabolcst.idorendmaker.model.dto.matching.PDFExtractionDto;
import hu.szabolcst.idorendmaker.model.dto.matching.PDFExtractionStatsDto;
import hu.szabolcst.idorendmaker.model.dto.matching.PDFProcessingResultDto;
import hu.szabolcst.idorendmaker.model.dto.matching.ProcessedVersenyszamDto;
import hu.szabolcst.idorendmaker.model.dto.matching.RaceWithCompetitorDataDto;
import hu.szabolcst.idorendmaker.model.entity.CompetitorEntry;
import hu.szabolcst.idorendmaker.model.entity.PDFExtraction;
import hu.szabolcst.idorendmaker.model.entity.Race;
import hu.szabolcst.idorendmaker.model.entity.RaceCompetitorAssociation;
import hu.szabolcst.idorendmaker.repository.jdbc.CompetitorEntryJdbcRepository;
import hu.szabolcst.idorendmaker.repository.jdbc.PDFExtractionJdbcRepository;
import hu.szabolcst.idorendmaker.repository.jdbc.RaceCompetitorAssociationJdbcRepository;
import hu.szabolcst.idorendmaker.repository.jdbc.RaceJdbcRepository;
import hu.szabolcst.idorendmaker.service.RaceMatchingService;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class RaceMatchingServiceImpl implements RaceMatchingService {

    private final PDFExtractionJdbcRepository pdfExtractionRepository;
    private final CompetitorEntryJdbcRepository competitorEntryRepository;
    private final RaceCompetitorAssociationJdbcRepository raceCompetitorAssociationRepository;
    private final RaceJdbcRepository raceRepository;
    private final RaceMatchingMapper raceMatchingMapper;

    @Transactional
    public PDFProcessingResultDto processPDFAndMatch(final String filename, final List<ProcessedVersenyszamDto> pdfData,
        final String fileHash) {
        try {
            log.info("Processing PDF: {} with {} races", filename, pdfData.size());

            if (fileHash != null && !fileHash.isEmpty()) {
                final Optional<PDFExtraction> existingExtraction = this.pdfExtractionRepository.findByFileHash(fileHash);
                if (existingExtraction.isPresent()) {
                    log.info("Found existing extraction for hash {}, reusing data", fileHash);

                    final PDFExtraction extraction = existingExtraction.get();
                    extraction.setStatus("session");
                    extraction.setExpiresAt(calculateSessionExpiry());
                    extraction.setExtractionStatus("completed");
                    this.pdfExtractionRepository.save(extraction);

                    final List<ExtractedRaceDto> list = loadExistingExtractionData(extraction.getId());

                    return this.raceMatchingMapper.createProcessingResultDto(true, extraction
                        .getId(), list, extraction
                        .getTotalCompetitors(), extraction.getTotalEntries(), null, true);
                }
            }

            final List<ExtractedRaceDto> extractedRaces = transformPDFData(pdfData);

            PDFExtraction pdfExtraction = new PDFExtraction();
            pdfExtraction.setFilename(filename);
            pdfExtraction.setFileHash(fileHash);
            pdfExtraction.setTotalRaces(extractedRaces.size());
            pdfExtraction.setTotalCompetitors(countUniqueCompetitors(extractedRaces));
            pdfExtraction.setTotalEntries(countTotalEntries(extractedRaces));
            pdfExtraction.setExtractionStatus("processing");
            pdfExtraction.setStatus("session");
            pdfExtraction.setExpiresAt(calculateSessionExpiry());
            pdfExtraction.setCreatedAt(LocalDateTime.now());

            pdfExtraction = this.pdfExtractionRepository.save(pdfExtraction);
            log.info("Created PDF extraction record with ID: {}", pdfExtraction.getId());

            storeCompetitorEntries(pdfExtraction.getId(), extractedRaces);

            matchRacesToDatabase(extractedRaces, pdfExtraction.getId());

            pdfExtraction.setExtractionStatus("completed");
            this.pdfExtractionRepository.save(pdfExtraction);

            log.info("PDF processing completed successfully");

            return this.raceMatchingMapper.createProcessingResultDto(true, pdfExtraction
                .getId(), extractedRaces, pdfExtraction
                .getTotalCompetitors(), pdfExtraction.getTotalEntries(), null, false);

        } catch (final Exception error) {
            log.error("Error processing PDF and matching races", error);
            return this.raceMatchingMapper.createProcessingResultDto(false, null,
                Collections.emptyList(), 0, 0, error
                    .getMessage(), false);
        }
    }


    @Transactional
    public List<RaceWithCompetitorDataDto> getFilteredRaces(final Integer pdfExtractionId) {
        try {
            final List<RaceCompetitorAssociation> raceAssociations = this.raceCompetitorAssociationRepository.findAllByPdfExtractionId(
                pdfExtractionId);

            final Map<Integer, List<RaceCompetitorAssociation>> raceMap = raceAssociations.stream()
                .collect(Collectors.groupingBy(RaceCompetitorAssociation::getRaceId));

            final List<RaceWithCompetitorDataDto> filteredRaces = new ArrayList<>();

            for (final Map.Entry<Integer, List<RaceCompetitorAssociation>> entry : raceMap.entrySet()) {
                final Integer raceId = entry.getKey();
                final List<RaceCompetitorAssociation> associations = entry.getValue();

                final Optional<Race> raceOpt = this.raceRepository.findById(raceId);
                if (raceOpt.isEmpty()) {
                    continue;
                }
                final Race race = raceOpt.get();

                final List<String> competitorIds = associations.stream().map(RaceCompetitorAssociation::getCompetitorId).distinct()
                    .collect(Collectors.toList());

                final List<String> topCompetitors = associations.stream().map(assoc -> assoc.getCompetitorEntry().getCompetitorName())
                    .distinct().limit(3L).collect(Collectors.toList());

                final RaceWithCompetitorDataDto dto = this.raceMatchingMapper.toRaceWithCompetitorDataDto(race);
                dto.setEntryCount(competitorIds.size());
                dto.setCompetitorIds(competitorIds);
                dto.setTopCompetitors(topCompetitors);
                dto.setPdfExtractionId(pdfExtractionId);

                filteredRaces.add(dto);
            }

            filteredRaces.sort((a, b) -> b.getEntryCount().compareTo(a.getEntryCount()));

            log.info("Retrieved {} filtered races for PDF extraction {}", filteredRaces.size(), pdfExtractionId);
            return filteredRaces;
        } catch (final Exception error) {
            log.error("Error getting filtered races", error);
            return Collections.emptyList();
        }
    }


    @Transactional
    public Map<String, CompetitorDataDto> getCompetitorData(final Integer pdfExtractionId) {
        try {
            final List<CompetitorEntry> competitors = this.competitorEntryRepository.findAllWithRaceAssociationsByPdfExtractionId(
                pdfExtractionId);

            final Map<String, CompetitorDataDto> competitorMap = new HashMap<>();

            for (final CompetitorEntry competitor : competitors) {
                final CompetitorDataDto dto = this.raceMatchingMapper.toCompetitorDataDto(competitor);

                final List<CompetitorRaceInfoDto> races = competitor.getRaceCompetitorAssociations().stream().map(assoc -> {
                    final CompetitorRaceInfoDto raceDto = new CompetitorRaceInfoDto();
                    raceDto.setRaceId(assoc.getRaceId());
                    raceDto.setRaceName(assoc.getRace().getName());
                    raceDto.setPdfRaceName(assoc.getPdfRaceName());
                    return raceDto;
                }).collect(Collectors.toList());

                dto.setRaces(races);
                competitorMap.put(competitor.getCompetitorId(), dto);
            }

            log.info("Retrieved competitor data for {} competitors", competitorMap.size());
            return competitorMap;
        } catch (final Exception error) {
            log.error("Error getting competitor data", error);
            return Collections.emptyMap();
        }
    }


    @Transactional
    public PDFExtractionStatsDto getPDFExtractionStats(final Integer pdfExtractionId) {
        try {
            final Optional<PDFExtraction> extractionOpt = this.pdfExtractionRepository.findById(pdfExtractionId);
            if (extractionOpt.isEmpty()) {
                throw new RuntimeException("PDF extraction " + pdfExtractionId + " not found");
            }

            final PDFExtraction extraction = extractionOpt.get();

            final List<Integer> matchedRaceIds = this.raceCompetitorAssociationRepository.findDistinctRaceIdsByPdfExtractionId(
                pdfExtractionId);

            final PDFExtractionStatsDto dto = this.raceMatchingMapper.toPDFExtractionStatsDto(extraction);
            dto.setMatchedRaces(matchedRaceIds.size());

            return dto;
        } catch (final Exception error) {
            log.error("Error getting PDF extraction stats", error);
            return null;
        }
    }


    @Transactional
    public void linkToSchedule(final Integer pdfExtractionId) {
        try {
            final Optional<PDFExtraction> extractionOpt = this.pdfExtractionRepository.findById(pdfExtractionId);
            if (extractionOpt.isEmpty()) {
                throw new RuntimeException("PDF extraction " + pdfExtractionId + " not found");
            }

            final PDFExtraction extraction = extractionOpt.get();
            extraction.setStatus("linked");
            extraction.setLinkedAt(LocalDateTime.now());
            extraction.setExpiresAt(null);
            this.pdfExtractionRepository.save(extraction);

            log.info("PDF extraction {} promoted to linked status", pdfExtractionId);
        } catch (final Exception error) {
            log.error("Error linking PDF extraction to schedule", error);
            throw new RuntimeException(error.getMessage());
        }
    }


    @Transactional
    public PDFCleanupResultDto cleanupExpiredSessions() {
        try {
            final LocalDateTime now = LocalDateTime.now();

            final List<PDFExtraction> expiredExtractions = this.pdfExtractionRepository.findExpiredSessionExtractions(now);

            final List<Integer> extractionIds = expiredExtractions.stream().map(PDFExtraction::getId).toList();

            if (extractionIds.isEmpty()) {
                return this.raceMatchingMapper.createCleanupResultDto(0, 0);
            }

            log.info("Cleaning up {} expired PDF extractions", extractionIds.size());

            int deletedAssociations = 0;
            int deletedCompetitors = 0;

            for (final Integer extractionId : extractionIds) {

                final List<RaceCompetitorAssociation> associations = this.raceCompetitorAssociationRepository.findAllByPdfExtractionId(
                    extractionId);
                deletedAssociations += associations.size();
                this.raceCompetitorAssociationRepository.deleteAll(associations);

                final List<CompetitorEntry> competitors = this.competitorEntryRepository.findAllByPdfExtractionId(extractionId);
                deletedCompetitors += competitors.size();
                this.competitorEntryRepository.deleteAll(competitors);
            }

            this.pdfExtractionRepository.deleteAll(expiredExtractions);

            final int totalDeleted = deletedAssociations + deletedCompetitors + expiredExtractions.size();

            log.info("Cleanup completed: {} extractions, {} total records deleted",
                expiredExtractions.size(), totalDeleted);

            return this.raceMatchingMapper.createCleanupResultDto(expiredExtractions.size(), totalDeleted);
        } catch (final Exception error) {
            log.error("Error during cleanup", error);
            throw new RuntimeException(error.getMessage());
        }
    }


    @Transactional
    public List<PDFExtractionDto> getAllPDFExtractions() {
        try {
            final List<PDFExtraction> extractions = this.pdfExtractionRepository.findAllWithSchedulesOrderByCreatedAtDesc();

            return extractions.stream().map(extraction -> {
                final PDFExtractionDto dto = this.raceMatchingMapper.toPDFExtractionDto(extraction);

                dto.setCompetitorEntriesCount((int) this.competitorEntryRepository.countByPdfExtractionId(extraction.getId()));

                dto.setRaceAssociationsCount(
                    (int) this.raceCompetitorAssociationRepository.countByPdfExtractionId(extraction.getId()));
                dto.setSchedulesUsingCount(Integer.valueOf((extraction.getSchedules() != null) ? extraction.getSchedules().size() : 0));
                dto.setCanDelete(
                    "session".equals(extraction.getStatus()) && (extraction.getSchedules() == null || extraction.getSchedules().isEmpty()));

                return dto;
            }).collect(Collectors.toList());
        } catch (final Exception error) {
            log.error("Error getting all PDF extractions", error);
            return Collections.emptyList();
        }
    }


    @Transactional
    public PDFDeletionResultDto deletePDFExtraction(final Integer pdfExtractionId) {
        try {
            final Optional<PDFExtraction> extractionOpt = this.pdfExtractionRepository.findByIdWithSchedules(pdfExtractionId);
            if (extractionOpt.isEmpty()) {
                throw new RuntimeException("PDF extraction " + pdfExtractionId + " not found");
            }

            final PDFExtraction extraction = getPdfExtraction(pdfExtractionId, extractionOpt.get());

            final List<CompetitorEntry> competitors = this.competitorEntryRepository.findAllByPdfExtractionId(pdfExtractionId);
            this.competitorEntryRepository.deleteAll(competitors);

            final List<RaceCompetitorAssociation> associations = this.raceCompetitorAssociationRepository.findAllByPdfExtractionId(
                pdfExtractionId);
            this.raceCompetitorAssociationRepository.deleteAll(associations);

            this.pdfExtractionRepository.delete(extraction);

            log.info("Successfully deleted PDF extraction {}", pdfExtractionId);
            return this.raceMatchingMapper.createDeletionResultDto(true, null);
        } catch (final Exception error) {
            log.error("Error deleting PDF extraction", error);
            return this.raceMatchingMapper.createDeletionResultDto(false, error.getMessage());
        }
    }


    public String calculateFileHash(final String filePath) {
        try {
            final byte[] fileBytes = Files.readAllBytes(Paths.get(filePath));
            final MessageDigest digest = MessageDigest.getInstance("SHA-256");
            final byte[] hashBytes = digest.digest(fileBytes);

            final StringBuilder sb = new StringBuilder();
            for (final byte b : hashBytes) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (final IOException | java.security.NoSuchAlgorithmException e) {
            log.error("Error calculating file hash for: {}", filePath, e);
            return null;
        }
    }


    @Transactional
    public void matchRacesToDatabase(final List<ExtractedRaceDto> extractedRaces, final Integer pdfExtractionId) {
        final List<Race> dbRaces = this.raceRepository.findAll();

        log.info("Matching {} extracted races against {} database races",
            extractedRaces.size(), dbRaces.size());

        for (final ExtractedRaceDto extractedRace : extractedRaces) {

            final Optional<Race> exactMatch = dbRaces.stream()
                .filter(dbRace -> normalizeRaceName(dbRace.getName()).equals(normalizeRaceName(extractedRace.getName()))).findFirst();

            if (exactMatch.isPresent()) {
                final Race race = exactMatch.get();
                log.info("Exact match found: \"{}\" → \"{}\"", extractedRace.getName(), race.getName());

                for (final ExtractedCompetitorDto competitor : extractedRace.getCompetitors()) {
                    final RaceCompetitorAssociation association = new RaceCompetitorAssociation();
                    association.setPdfExtractionId(pdfExtractionId);
                    association.setRaceId(race.getId());
                    association.setCompetitorId(competitor.getId());
                    association.setPdfRaceName(extractedRace.getName());
                    association.setMatchConfidence(1.0F);
                    this.raceCompetitorAssociationRepository.save(association);
                }

                extractedRace.setMatchedDatabaseRaceId(race.getId());
                extractedRace.setMatchConfidence(1.0D);
                continue;
            }
            log.info("No match found for race: \"{}\"", extractedRace.getName());

            extractedRace.setMatchConfidence(0.0D);
        }
    }


    @Transactional
    public void storeCompetitorEntries(final Integer pdfExtractionId, final List<ExtractedRaceDto> extractedRaces) {
        final Map<String, ExtractedCompetitorDto> uniqueCompetitors = new HashMap<>();

        for (final ExtractedRaceDto race : extractedRaces) {
            for (final ExtractedCompetitorDto competitor : race.getCompetitors()) {
                if (uniqueCompetitors.containsKey(competitor.getId())) {

                    final ExtractedCompetitorDto existing = uniqueCompetitors.get(competitor.getId());
                    existing.getRaceEntries().add(race.getName());
                    continue;
                }
                final ExtractedCompetitorDto newCompetitor = new ExtractedCompetitorDto();
                newCompetitor.setId(competitor.getId());
                newCompetitor.setName(competitor.getName());
                newCompetitor.setOrganization(competitor.getOrganization());
                newCompetitor.setBirthYear(competitor.getBirthYear());
                newCompetitor.setRaceEntries(new ArrayList<>(List.of(race.getName())));
                uniqueCompetitors.put(competitor.getId(), newCompetitor);
            }
        }

        for (final ExtractedCompetitorDto competitor : uniqueCompetitors.values()) {
            final CompetitorEntry entry = new CompetitorEntry();
            entry.setPdfExtractionId(pdfExtractionId);
            entry.setCompetitorId(competitor.getId());
            entry.setCompetitorName(competitor.getName());
            entry.setOrganization(competitor.getOrganization());
            entry.setBirthYear(competitor.getBirthYear());
            this.competitorEntryRepository.save(entry);
        }

        log.info("Stored {} unique competitors", uniqueCompetitors.size());
    }


    private static PDFExtraction getPdfExtraction(final Integer pdfExtractionId, final PDFExtraction extraction) {
        if ("linked".equals(extraction.getStatus()) || (extraction
            .getSchedules() != null && !extraction.getSchedules().isEmpty())) {
            final int scheduleCount = (extraction.getSchedules() != null) ? extraction.getSchedules().size() : 0;
            throw new RuntimeException(
                "Cannot delete PDF extraction " + pdfExtractionId + ": it is linked to " + scheduleCount + " schedule(s)");
        }

        return extraction;
    }

    private List<ExtractedRaceDto> transformPDFData(final List<ProcessedVersenyszamDto> pdfData) {
        return pdfData.stream().map(race -> {
            final List<ExtractedCompetitorDto> competitors = ((race.getNevezettek() != null)
                ? race.getNevezettek().stream().map(nevezett -> ExtractedCompetitorDto.builder()
                    .id(nevezett.getId())
                    .name(nevezett.getNev())
                    .organization(nevezett.getTagszervezet())
                    .birthYear(nevezett.getSzuletesiEv())
                    .build())
                .collect(Collectors.toList())
                : Collections.emptyList());
            final ExtractedRaceDto dto = new ExtractedRaceDto();
            dto.setId(race.getNev());
            dto.setName(race.getNev());
            dto.setCompetitors(competitors);
            dto.setMatchConfidence(0.0D);
            return dto;
        }).collect(Collectors.toList());
    }

    private int countUniqueCompetitors(final List<ExtractedRaceDto> extractedRaces) {
        final Set<String> uniqueCompetitors = new HashSet<>();
        for (final ExtractedRaceDto race : extractedRaces) {
            for (final ExtractedCompetitorDto competitor : race.getCompetitors()) {
                uniqueCompetitors.add(competitor.getId());
            }
        }
        return uniqueCompetitors.size();
    }

    private int countTotalEntries(final List<ExtractedRaceDto> extractedRaces) {
        return extractedRaces.stream()
            .mapToInt(race -> race.getCompetitors().size())
            .sum();
    }

    private LocalDateTime calculateSessionExpiry() {
        return LocalDateTime.now().plusHours(24L);
    }

    private String normalizeRaceName(final String name) {
        return name
            .toLowerCase()
            .trim()
            .replaceAll("\\s+", " ")
            .replaceAll("[^\\w\\s]", "");
    }


    private List<ExtractedRaceDto> loadExistingExtractionData(final Integer pdfExtractionId) {
        try {
            final List<RaceCompetitorAssociation> associations = this.raceCompetitorAssociationRepository.findAllByPdfExtractionId(
                pdfExtractionId);

            final Map<Integer, List<RaceCompetitorAssociation>> raceMap = associations.stream()
                .collect(Collectors.groupingBy(RaceCompetitorAssociation::getRaceId));

            final List<ExtractedRaceDto> extractedRaces = new ArrayList<>();

            for (final Map.Entry<Integer, List<RaceCompetitorAssociation>> entry : raceMap.entrySet()) {
                final Integer raceId = entry.getKey();
                final List<RaceCompetitorAssociation> raceAssociations = entry.getValue();

                if (raceAssociations.isEmpty()) {
                    continue;
                }
                final RaceCompetitorAssociation firstAssoc = raceAssociations.getFirst();

                final List<ExtractedCompetitorDto> competitors = raceAssociations.stream()
                    .filter(assoc -> (assoc.getCompetitorEntry() != null)).map(assoc -> {
                        final ExtractedCompetitorDto dto = new ExtractedCompetitorDto();
                        final CompetitorEntry competitorEntry = assoc.getCompetitorEntry();
                        dto.setId(competitorEntry.getCompetitorId());
                        dto.setName(competitorEntry.getCompetitorName());
                        dto.setOrganization(competitorEntry.getOrganization());
                        dto.setBirthYear(competitorEntry.getBirthYear());
                        dto.setRaceEntries(List.of(assoc.getPdfRaceName()));
                        return dto;
                    }).collect(Collectors.toList());

                final ExtractedRaceDto raceDto = new ExtractedRaceDto();
                raceDto.setId(firstAssoc.getPdfRaceName());
                raceDto.setName(firstAssoc.getPdfRaceName());
                raceDto.setCompetitors(competitors);
                raceDto.setMatchedDatabaseRaceId(raceId);
                raceDto.setMatchConfidence((double) firstAssoc.getMatchConfidence());

                extractedRaces.add(raceDto);
            }

            log.info("Loaded {} existing races from extraction {}", extractedRaces.size(), pdfExtractionId);
            return extractedRaces;
        } catch (final Exception error) {
            log.error("Error loading existing extraction data", error);
            return Collections.emptyList();
        }
    }
}


/* Location:              C:\Users\Szabolcs\Documents\PROJECTS\idorendmaker-app\idorendmaker-backend\target\idorendmaker-backend-1.0.0.jar!\BOOT-INF\classes\hu\szabolcst\idorendmaker\service\impl\RaceMatchingServiceImpl.class
 * Java compiler version: 21 (65.0)
 * JD-Core Version:       1.1.3
 */