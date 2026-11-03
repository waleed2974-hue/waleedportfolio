/**
 * Utility for splitting element text into nested spans for vertical mask reveals.
 * Structure:
 * <span class="split-word-mask">
 *   <span class="split-char">C</span>...
 * </span>
 */

export function splitTextChars(element) {
  if (!element) return [];

  const text = element.textContent.trim();
  const words = text.split(/\s+/);
  element.innerHTML = '';
  element.setAttribute('aria-label', text);

  const charElements = [];

  words.forEach((word, wordIndex) => {
    const wordMask = document.createElement('span');
    wordMask.className = 'split-word-mask';
    wordMask.style.display = 'inline-block';
    wordMask.style.overflow = 'hidden';
    wordMask.style.verticalAlign = 'bottom';
    wordMask.style.whiteSpace = 'nowrap';

    const chars = Array.from(word);
    chars.forEach((char) => {
      const charSpan = document.createElement('span');
      charSpan.className = 'split-char';
      charSpan.style.display = 'inline-block';
      charSpan.textContent = char;
      wordMask.appendChild(charSpan);
      charElements.push(charSpan);
    });

    element.appendChild(wordMask);

    // Add space between words if not last
    if (wordIndex < words.length - 1) {
      const space = document.createTextNode(' ');
      element.appendChild(space);
    }
  });

  return charElements;
}

export function splitTextWords(element) {
  if (!element) return [];

  const text = element.textContent.trim();
  const words = text.split(/\s+/);
  element.innerHTML = '';
  element.setAttribute('aria-label', text);

  const wordElements = [];

  words.forEach((word, wordIndex) => {
    const wordMask = document.createElement('span');
    wordMask.className = 'split-word-mask';
    wordMask.style.display = 'inline-block';
    wordMask.style.overflow = 'hidden';
    wordMask.style.verticalAlign = 'bottom';

    const innerWord = document.createElement('span');
    innerWord.className = 'split-word';
    innerWord.style.display = 'inline-block';
    innerWord.textContent = word;

    wordMask.appendChild(innerWord);
    element.appendChild(wordMask);
    wordElements.push(innerWord);

    if (wordIndex < words.length - 1) {
      const space = document.createTextNode(' ');
      element.appendChild(space);
    }
  });

  return wordElements;
}
