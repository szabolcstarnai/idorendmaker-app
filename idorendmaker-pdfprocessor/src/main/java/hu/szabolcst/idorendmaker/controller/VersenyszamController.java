package hu.szabolcst.idorendmaker.controller;

import hu.szabolcst.idorendmaker.model.PDFProcessingErrorResponse;
import hu.szabolcst.idorendmaker.model.Versenyszam;
import hu.szabolcst.idorendmaker.service.VersenyszamService;
import java.io.IOException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/versenyszam")
public class VersenyszamController {

	private final VersenyszamService versenyszamService;

	@PostMapping(value = "/extract", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public ResponseEntity<?> extractFromPdf(@RequestParam("file") final MultipartFile file) {
		// Validate file is not empty
		if (file.isEmpty()) {
			log.error("Received empty file");
			final PDFProcessingErrorResponse errorResponse = PDFProcessingErrorResponse.emptyFileError();
			return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
		}

		// Validate file type is PDF
		if (!"application/pdf".equals(file.getContentType())) {
			log.error("Received non-PDF file: {}", file.getContentType());
			final PDFProcessingErrorResponse errorResponse = new PDFProcessingErrorResponse(
				"INVALID_FILE_TYPE",
				"File type is not PDF",
				"Csak PDF fájlokat lehet feldolgozni. A kiválasztott fájl típusa: " + file.getContentType()
			);
			return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
		}

		try {
			final List<Versenyszam> versenyszamok = versenyszamService.extractFromPdf(file);

			// Check if we extracted any data
			if (versenyszamok == null || versenyszamok.isEmpty()) {
				log.warn("No data extracted from PDF file: {}", file.getOriginalFilename());
				final PDFProcessingErrorResponse errorResponse = PDFProcessingErrorResponse.invalidContentError();
				return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(errorResponse);
			}

			return ResponseEntity.ok(versenyszamok);
		} catch (final IOException e) {
			log.error("Error processing PDF file: {}", file.getOriginalFilename(), e);

			// Distinguish between different types of IO errors
			final String errorMessage = e.getMessage();
			final PDFProcessingErrorResponse errorResponse;

			if (errorMessage != null && errorMessage.toLowerCase().contains("corrupt")) {
				errorResponse = PDFProcessingErrorResponse.corruptedFileError();
			} else if (errorMessage != null && errorMessage.toLowerCase().contains("format")) {
				errorResponse = PDFProcessingErrorResponse.formatError();
			} else {
				errorResponse = PDFProcessingErrorResponse.processingError();
			}

			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
		} catch (final Exception e) {
			log.error("Unexpected error processing PDF file: {}", file.getOriginalFilename(), e);
			final PDFProcessingErrorResponse errorResponse = PDFProcessingErrorResponse.processingError();
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
		}
	}

}
