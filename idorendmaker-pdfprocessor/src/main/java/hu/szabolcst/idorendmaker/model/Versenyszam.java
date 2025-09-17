package hu.szabolcst.idorendmaker.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Versenyszam {

	private String id;
	private String nev;
	private List<Versenyzo> nevezettek;

}
