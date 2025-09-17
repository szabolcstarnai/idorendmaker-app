package hu.szabolcst.idorendmaker.service.impl;

import hu.szabolcst.idorendmaker.extractor.VersenyszamNevezesekExtractor;
import hu.szabolcst.idorendmaker.model.Versenyszam;
import hu.szabolcst.idorendmaker.service.VersenyszamService;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

@Service
public class VersenyszamServiceImpl implements VersenyszamService {

	@Override
	public List<Versenyszam> extractFromPdf(final MultipartFile pdfFile) throws IOException {
		final String originalFilename = pdfFile.getOriginalFilename();
		final String fileExtension = originalFilename != null
				? originalFilename.substring(originalFilename.lastIndexOf("."))
				: ".pdf";

		final Path tempFilePath = Files.createTempFile("upload-", fileExtension);
		final File tempFile = tempFilePath.toFile();
		try (final FileOutputStream fos = new FileOutputStream(tempFile)) {
			fos.write(pdfFile.getBytes());
		}

		final List<Versenyszam> result = VersenyszamNevezesekExtractor.extractFromPdf(tempFile.getAbsolutePath());
		Files.deleteIfExists(tempFilePath);

		return result;
	}

}
