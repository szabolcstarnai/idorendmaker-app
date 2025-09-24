package hu.szabolcst.idorendmaker;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.io.IOException;

@SpringBootApplication
public class IdorendMakerPdfProcessorApplication {

	public static void main(final String[] args) {
		System.setProperty("java.awt.headless", "true");
		SpringApplication.run(IdorendMakerPdfProcessorApplication.class, args);
	}

}
