"use strict";

(() => {
  const alphabet = "abcdefghijklmnñopqrstuvwxyz";
  const plainVowels = "aeiou";
  const accentedVowels = "áéíóú";
  const diaeresisVowel = "ü";
  const vowels = plainVowels + accentedVowels + diaeresisVowel;
  const consonants = alphabet.replace(/[aeiou]/g, "");
  const treatyNames = ["Primero", "Segundo", "Tercero", "Cuarto", "Quinto", "Sexto", "Séptimo"];
  const sections = [
    { id: "prologue", label: "Pról." },
    ...treatyNames.map((name, index) => ({ id: `treaty${index + 1}`, label: `T. ${["I", "II", "III", "IV", "V", "VI", "VII"][index]}` }))
  ];
  const characters = [
    { name: "Lázaro", expression: /(?<![A-Za-zÁÉÍÓÚÜÑáéíóúüñ])Lázaro(?![A-Za-zÁÉÍÓÚÜÑáéíóúüñ])/g },
    { name: "ciego", expression: /(?<![A-Za-zÁÉÍÓÚÜÑáéíóúüñ])ciego(?![A-Za-zÁÉÍÓÚÜÑáéíóúüñ])/g },
    { name: "clérigo", expression: /(?<![A-Za-zÁÉÍÓÚÜÑáéíóúüñ])clérigo(?![A-Za-zÁÉÍÓÚÜÑáéíóúüñ])/g },
    { name: "arcipreste", expression: /(?<![A-Za-zÁÉÍÓÚÜÑáéíóúüñ])arcipreste(?![A-Za-zÁÉÍÓÚÜÑáéíóúüñ])/g },
    { name: "mi mujer", expression: /(?<![A-Za-zÁÉÍÓÚÜÑáéíóúüñ])mi(?:\s+)mujer(?![A-Za-zÁÉÍÓÚÜÑáéíóúüñ])/g }
  ];

  const textInput = document.querySelector("#text-input");
  const fileInput = document.querySelector("#file-input");
  const fileName = document.querySelector("#file-name");
  const status = document.querySelector("#status");
  const results = document.querySelector("#results");
  const themeToggle = document.querySelector("#theme-toggle");

  function setStatus(message, isError = false) {
    status.textContent = message;
    status.classList.toggle("error", isError);
  }

  function encodeAndDecodePastedText(text) {
    const encoded = new TextEncoder().encode(text);
    const withBom = new Uint8Array(encoded.length + 3);
    withBom.set([0xef, 0xbb, 0xbf]);
    withBom.set(encoded, 3);
    return new TextDecoder("utf-8", { fatal: true }).decode(withBom);
  }

  async function getInputText() {
    const file = fileInput.files?.[0];
    if (!file) {
      return encodeAndDecodePastedText(textInput.value);
    }
    if (!file.name.toLocaleLowerCase("es").endsWith(".txt")) {
      throw new Error("Selecciona un archivo con extensión .TXT.");
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.length < 3 || bytes[0] !== 0xef || bytes[1] !== 0xbb || bytes[2] !== 0xbf) {
      throw new Error("El archivo debe estar codificado en UTF-8 con BOM.");
    }
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new Error("El archivo contiene datos que no son UTF-8 válidos.");
    }
  }

  function countCharacters(text, expression) {
    return [...text.matchAll(expression)].length;
  }

  function getSections(text) {
    const headings = [];
    const headingExpression = /^[ \t]*(Pr[oó]logo|Tratado[ \t]+(Primero|Segundo|Tercero|Cuarto|Quinto|Sexto|Séptimo))[ \t]*[:.]?[ \t]*$/gim;
    for (const match of text.matchAll(headingExpression)) {
      const isPrologue = /^Pr[oó]logo$/i.test(match[1]);
      const treatyNumber = isPrologue ? -1 : treatyNames.findIndex(name => name.toLocaleLowerCase("es") === match[2].toLocaleLowerCase("es"));
      headings.push({
        id: isPrologue ? "prologue" : `treaty${treatyNumber + 1}`,
        start: match.index,
        contentStart: match.index + match[0].length
      });
    }

    const result = Object.fromEntries(sections.map(section => [section.id, ""]));
    const firstTreaty = headings.find(heading => heading.id.startsWith("treaty"));
    const prologueHeading = headings.find(heading => heading.id === "prologue");
    const prologueStart = prologueHeading ? prologueHeading.contentStart : 0;
    const prologueEnd = firstTreaty ? firstTreaty.start : text.length;
    if (prologueEnd >= prologueStart) {
      result.prologue = text.slice(prologueStart, prologueEnd);
    }

    for (const [index, heading] of headings.entries()) {
      if (!heading.id.startsWith("treaty")) continue;
      const nextHeading = headings.slice(index + 1).find(candidate => candidate.id.startsWith("treaty"));
      result[heading.id] += text.slice(heading.contentStart, nextHeading ? nextHeading.start : text.length);
    }
    return result;
  }

  function buildLetterCount(label, value) {
    const cell = document.createElement("div");
    cell.className = "letter-count";
    const term = document.createElement("span");
    term.className = "letter-count-label";
    term.textContent = label;
    const count = document.createElement("span");
    count.className = "letter-count-value";
    count.textContent = value.toLocaleString("es");
    cell.append(term, count);
    return cell;
  }

  function buildVowelBreakdown(container, letterCounts) {
    container.replaceChildren();
    for (const vowel of ["a", "á", "e", "é", "i", "í", "o", "ó", "u", "ú", "ü"]) {
      container.append(buildLetterCount(vowel, letterCounts.get(vowel)));
    }

    const totals = document.createElement("div");
    totals.className = "vowel-groups";
    for (const vowel of plainVowels) {
      const variants = vowel === "u" ? ["u", "ú", "ü"] : [vowel, accentedVowels[plainVowels.indexOf(vowel)]];
      const total = variants.reduce((sum, letter) => sum + letterCounts.get(letter), 0);
      totals.append(buildLetterCount(vowel, total));
    }
    container.append(totals);
  }

  function renderCharacterTable(text) {
    const sectionTexts = getSections(text);
    const head = document.querySelector("#character-head");
    const body = document.querySelector("#character-body");
    const headerRow = document.createElement("tr");
    for (const label of ["Personaje", ...sections.map(section => section.label), "Total"]) {
      const cell = document.createElement("th");
      cell.scope = "col";
      cell.textContent = label;
      headerRow.append(cell);
    }
    head.replaceChildren(headerRow);
    body.replaceChildren();

    for (const character of characters) {
      const row = document.createElement("tr");
      const name = document.createElement("th");
      name.scope = "row";
      name.textContent = character.name;
      row.append(name);
      let total = 0;
      for (const section of sections) {
        const count = countCharacters(sectionTexts[section.id], character.expression);
        total += count;
        const cell = document.createElement("td");
        cell.textContent = count.toLocaleString("es");
        row.append(cell);
      }
      const totalCell = document.createElement("td");
      totalCell.textContent = total.toLocaleString("es");
      row.append(totalCell);
      body.append(row);
    }
  }

  function analyze(text) {
    const normalizedText = text.normalize("NFC");
    const wordMatches = normalizedText.match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+/g) ?? [];
    const letterCounts = new Map([...alphabet, ...accentedVowels, diaeresisVowel].map(letter => [letter, 0]));
    for (const letter of normalizedText.toLocaleLowerCase("es")) {
      if (letterCounts.has(letter)) {
        letterCounts.set(letter, letterCounts.get(letter) + 1);
      }
    }

    const vowelTotal = [...vowels].reduce((sum, letter) => sum + letterCounts.get(letter), 0);
    const consonantTotal = [...consonants].reduce((sum, letter) => sum + letterCounts.get(letter), 0);
    document.querySelector("#word-count").textContent = wordMatches.length.toLocaleString("es");
    document.querySelector("#vowel-count").textContent = vowelTotal.toLocaleString("es");
    document.querySelector("#consonant-count").textContent = consonantTotal.toLocaleString("es");
    buildVowelBreakdown(document.querySelector("#vowel-details"), letterCounts);
    const consonantDetails = document.querySelector("#consonant-details");
    consonantDetails.replaceChildren();
    for (const consonant of consonants) {
      consonantDetails.append(buildLetterCount(consonant, letterCounts.get(consonant)));
    }
    renderCharacterTable(normalizedText);
    textInput.value = normalizedText;
    results.hidden = false;
  }

  fileInput.addEventListener("change", () => {
    fileName.textContent = fileInput.files?.[0]?.name ?? "Ningún archivo seleccionado";
    if (fileInput.files?.[0]) textInput.value = "";
    setStatus("");
  });

  textInput.addEventListener("input", () => {
    if (textInput.value) {
      fileInput.value = "";
      fileName.textContent = "Ningún archivo seleccionado";
    }
    setStatus("");
  });

  document.querySelector("#analyze-button").addEventListener("click", async () => {
    setStatus("");
    try {
      const text = await getInputText();
      if (!text.trim()) {
        throw new Error("Introduce o carga un texto antes de iniciar el análisis.");
      }
      analyze(text);
      setStatus("Análisis completado. El texto se ha normalizado en NFC.");
    } catch (error) {
      results.hidden = true;
      setStatus(error instanceof Error ? error.message : "No se pudo completar el análisis. Inténtalo de nuevo.", true);
    }
  });

  document.querySelector("#clear-button").addEventListener("click", () => {
    textInput.value = "";
    fileInput.value = "";
    fileName.textContent = "Ningún archivo seleccionado";
    results.hidden = true;
    setStatus("");
    textInput.focus();
  });

  themeToggle.addEventListener("click", () => {
    const darkMode = document.documentElement.dataset.theme !== "dark";
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
    themeToggle.setAttribute("aria-pressed", String(darkMode));
    themeToggle.textContent = darkMode ? "Activar modo claro" : "Activar modo oscuro";
  });

  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    document.documentElement.dataset.theme = "dark";
    themeToggle.setAttribute("aria-pressed", "true");
    themeToggle.textContent = "Activar modo claro";
  }
})();
