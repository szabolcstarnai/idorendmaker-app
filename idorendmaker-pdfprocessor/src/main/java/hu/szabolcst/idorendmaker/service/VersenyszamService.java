package hu.szabolcst.idorendmaker.service;

import hu.szabolcst.idorendmaker.model.Versenyszam;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

public interface VersenyszamService {

	/**
	 * Egy feltoltott PDF fileból adja vissza a versenyszamokat.
	 */
	List<Versenyszam> extractFromPdf(MultipartFile pdfFile) throws IOException;

}
