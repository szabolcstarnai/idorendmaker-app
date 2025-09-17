package hu.szabolcst.idorendmaker.config;

import org.springframework.aot.hint.RuntimeHints;
import org.springframework.aot.hint.RuntimeHintsRegistrar;
import org.springframework.context.annotation.ImportRuntimeHints;

class PdfboxHints implements RuntimeHintsRegistrar {
	@Override
	public void registerHints(final RuntimeHints hints, final ClassLoader classLoader) {
		hints.resources().registerPattern(".*windows-1252.*");
		hints.resources().registerPattern(".*ISO-8859-1.*");
	}
}

@ImportRuntimeHints(PdfboxHints.class)
public class PdfboxConfig {}
