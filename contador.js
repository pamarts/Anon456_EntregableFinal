"use strict";

(() => {
  const alphabet = "abcdefghijklmnñopqrstuvwxyz";
  const plainVowels = "aeiou";
  const accentedVowels = "áéíóú";
  const diaeresisVowel = "ü";
  const vowels = plainVowels + accentedVowels + diaeresisVowel;
  const consonants = alphabet.replace(/[aeiou]/g, "");
  const characters = [
    { name: "Lázaro", expression: /(?<![A-Za-zÁÉÍÓÚÜÑáéíóúüñ])Lázaro(?![A-Za-zÁÉÍÓÚÜÑáéíóúüñ])/g },
    { name: "ciego", expression: /(?<![A-Za-zÁÉÍÓÚÜÑáéíóúüñ])ciego(?![A-Za-zÁÉÍÓÚÜÑáéíóúüñ])/g },
    { name: "clérigo", expression: /(?<![A-Za-zÁÉÍÓÚÜÑáéíóúüñ])clérigo(?![A-Za-zÁÉÍÓÚÜÑáéíóúüñ])/g },
    { name: "arcipreste", expression: /(?<![A-Za-zÁÉÍÓÚÜÑáéíóúüñ])arcipreste(?![A-Za-zÁÉÍÓÚÜÑáéíóúüñ])/g },
    { name: "mi mujer", expression: /(?<![A-Za-zÁÉÍÓÚÜÑáéíóúüñ])mi(?:\s+)mujer(?![A-Za-zÁÉÍÓÚÜÑáéíóúüñ])/g }
  ];

  const status = document.querySelector("#status");
  const results = document.querySelector("#results");
  const countBody = document.querySelector("#count-body");
  const themeToggle = document.querySelector("#theme-toggle");

  function setStatus(message, isError = false) {
    status.textContent = message;
    status.classList.toggle("error", isError);
  }

  async function loadSourceText() {
    let response;
    try {
      response = await fetch(new URL("lazarillo_limpio.txt", document.baseURI), { cache: "no-store" });
    } catch {
      throw new Error("No se pudo acceder a lazarillo_limpio.txt. Comprueba que la página se sirve desde un servidor web.");
    }

    if (response.status === 404) {
      throw new Error("No se encontró lazarillo_limpio.txt en la misma carpeta que la página.");
    }
    if (!response.ok) {
      throw new Error(`No se pudo cargar lazarillo_limpio.txt (error HTTP ${response.status}).`);
    }

    let bytes;
    try {
      bytes = new Uint8Array(await response.arrayBuffer());
    } catch {
      throw new Error("Se produjo un error al leer lazarillo_limpio.txt.");
    }
    if (bytes.length < 3 || bytes[0] !== 0xef || bytes[1] !== 0xbb || bytes[2] !== 0xbf) {
      throw new Error("lazarillo_limpio.txt debe estar codificado en UTF-8 con BOM.");
    }
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(3));
    } catch {
      throw new Error("lazarillo_limpio.txt contiene datos que no son UTF-8 válidos.");
    }
  }

  function getCharacterCounts(text) {
    return characters.map(character => ({
      name: character.name,
      count: [...text.matchAll(character.expression)].length
    }));
  }

  function analyze(text) {
    const normalizedText = text.normalize("NFC");
    const wordMatches = normalizedText.match(/[A-Za-zñÑáéíóúüÁÉÍÓÚÜ]+/g) ?? [];
    const wordCounts = new Map();
    for (const word of wordMatches) {
      const key = word.toLocaleLowerCase("es");
      wordCounts.set(key, (wordCounts.get(key) ?? 0) + 1);
    }

    const letterCounts = new Map([...alphabet, ...accentedVowels, diaeresisVowel].map(letter => [letter, 0]));
    for (const letter of normalizedText.toLocaleLowerCase("es")) {
      if (letterCounts.has(letter)) {
        letterCounts.set(letter, letterCounts.get(letter) + 1);
      }
    }

    const vowelTotal = [...vowels].reduce((sum, letter) => sum + letterCounts.get(letter), 0);
    const consonantTotal = [...consonants].reduce((sum, letter) => sum + letterCounts.get(letter), 0);
    const wordTotal = [...wordCounts.values()].reduce((sum, count) => sum + count, 0);
    const rows = [
      { name: "Palabras", count: wordTotal },
      { name: "Vocales", count: vowelTotal },
      { name: "Consonantes", count: consonantTotal },
      ...getCharacterCounts(normalizedText)
    ];

    countBody.replaceChildren();
    for (const item of rows) {
      const row = document.createElement("tr");
      const name = document.createElement("th");
      name.scope = "row";
      name.textContent = item.name;
      const count = document.createElement("td");
      count.textContent = item.count.toLocaleString("es");
      row.append(name, count);
      countBody.append(row);
    }
    results.hidden = false;
  }

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

  loadSourceText()
    .then(text => {
      if (!text.trim()) {
        throw new Error("lazarillo_limpio.txt está vacío; no hay texto que analizar.");
      }
      analyze(text);
      setStatus("Análisis completado. El texto se ha normalizado en NFC.");
    })
    .catch(error => {
      results.hidden = true;
      setStatus(error instanceof Error ? error.message : "No se pudo completar el análisis.", true);
    });
})();
