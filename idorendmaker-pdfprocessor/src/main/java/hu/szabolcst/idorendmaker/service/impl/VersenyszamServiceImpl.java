package hu.szabolcst.idorendmaker.service.impl;

import hu.szabolcst.idorendmaker.extractor.VersenyszamNevezesekExtractor;
import hu.szabolcst.idorendmaker.model.Versenyszam;
import hu.szabolcst.idorendmaker.service.VersenyszamService;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Service
public class VersenyszamServiceImpl implements VersenyszamService {

	@Override
	public List<Versenyszam> extractFromPdf(final MultipartFile pdfFile) throws IOException {
		final String originalFilename = pdfFile.getOriginalFilename();
		log.info("Starting PDF extraction for file: {}", originalFilename);

		final String fileExtension = originalFilename != null
				? originalFilename.substring(originalFilename.lastIndexOf("."))
				: ".pdf";

		Path tempFilePath = null;
		try {
			// Create temporary file for processing
			tempFilePath = Files.createTempFile("pdf-upload-", fileExtension);
			final File tempFile = tempFilePath.toFile();

			log.debug("Created temporary file: {}", tempFilePath);

			// Write uploaded file content to temporary file
			try (final FileOutputStream fos = new FileOutputStream(tempFile)) {
				fos.write(pdfFile.getBytes());
				log.debug("Written {} bytes to temporary file", pdfFile.getSize());
			} catch (final IOException e) {
				log.error("Failed to write PDF content to temporary file: {}", originalFilename, e);
				throw new IOException("Failed to process uploaded file: " + e.getMessage(), e);
			}

			// Extract data from PDF using the extractor
			final List<Versenyszam> result;
			try {
				result = VersenyszamNevezesekExtractor.extractFromPdf(tempFile.getAbsolutePath());
				log.info("Successfully extracted {} versenyszám(ok) from PDF: {}",
					result != null ? result.size() : 0, originalFilename);
			} catch (final IOException e) {
				log.error("PDF extraction failed for file: {}", originalFilename, e);

				// Provide more context based on the exception message
				final String errorMessage = e.getMessage();
				if (errorMessage != null) {
					if (errorMessage.contains("COSDocument has been closed") ||
						errorMessage.contains("document is closed")) {
						throw new IOException("PDF document is corrupted or invalid format", e);
					} else if (errorMessage.contains("Invalid object stream") ||
							errorMessage.contains("Illegal character") ||
							errorMessage.contains("Parsing Error")) {
						throw new IOException("PDF format is corrupted or unsupported", e);
					} else if (errorMessage.contains("stream") ||
							errorMessage.contains("encoding")) {
						throw new IOException("PDF encoding format is not supported", e);
					}
				}

				// Re-throw with format context for generic errors
				throw new IOException("PDF format is incompatible with MKKSZ document structure", e);
			}

			return result;

		} finally {
			// Always clean up temporary file
			if (tempFilePath != null) {
				try {
					Files.deleteIfExists(tempFilePath);
					log.debug("Cleaned up temporary file: {}", tempFilePath);
				} catch (final IOException e) {
					log.warn("Failed to delete temporary file: {}", tempFilePath, e);
				}
			}
		}
	}

}
