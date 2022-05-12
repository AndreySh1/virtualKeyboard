/* eslint-disable no-param-reassign */
/* eslint-disable import/extensions */

import * as storage from './storage.js';

import language from './index.js'; //получаем массив(language.en английский, language.ru русский)


/*       create    */
function create(el, classNames, child, parent, ...dataAttr) {
let element = null;
try {
  element = document.createElement(el);
} catch (error) {
  throw new Error('Unable to create HTMLElement! Give a proper tag name');
}

if (classNames) element.classList.add(...classNames.split(' '));

if (child && Array.isArray(child)) {
  child.forEach((childElement) => childElement && element.appendChild(childElement));
} else if (child && typeof child === 'object') {
  element.appendChild(child);
} else if (child && typeof child === 'string') {
  element.innerHTML = child;
}

if (parent) {
  parent.appendChild(element);
}

if (dataAttr.length) {
  dataAttr.forEach(([attrName, attrValue]) => {
    if (attrValue === '') {
      element.setAttribute(attrName, '');
    }
    if (attrName.match(/value|id|placeholder|cols|rows|autocorrect|spellcheck/)) {
      element.setAttribute(attrName, attrValue);
    } else {
      element.dataset[attrName] = attrValue;
    }
  });
}
return element;
}
/*       /create    */


/*       key          */
class Key {
  constructor({ small, shift, code }) {
    this.code = code;
    this.small = small;
    this.shift = shift;
    this.isFnKey = Boolean(small.match(/Ctrl|arr|Alt|Shift|Tab|Back|Del|Enter|Caps|Win/));

    if (shift && shift.match(/[^a-zA-Zа-яА-ЯёЁ0-9]/)) {
      this.sub = create('div', 'sub', this.shift);
    } else {
      this.sub = create('div', 'sub', '');
    }

    this.letter = create('div', 'letter', small);
    this.div = create('div', 'keyboard__key', [this.sub, this.letter], null, ['code', this.code],
      this.isFnKey ? ['fn', 'true'] : ['fn', 'false']);
  }
}

/*     /key          */ 

const main = create('main', '',
  [create('h1', 'title', 'RSS Virtual Keyboard'),
    create('h3', 'subtitle', 'Windows keyboard'),
    create('p', 'hint', 'Use left <kbd>Ctrl</kbd> + <kbd>Alt</kbd> to switch language. Last language saves in localStorage')]);


export default class Keyboard {
    constructor(rowsOrder) {
    this.rowsOrder = rowsOrder;
    this.keysPressed = {};
    this.isCaps = false;
}

init(langCode) { //   код языка, принимает либо ru, либо en
    this.keyBase = language[langCode]; 
    this.output = create('textarea', 'output', null, main,
      ['placeholder', 'Start type something...'],
      ['rows', 5],
      ['cols', 50],
      ['spellcheck', false],
      ['autocorrect', 'off']);
    this.container = create('div', 'keyboard', null, main, ['language', langCode]);
    document.body.prepend(main);
    return this;
}

generateLayout() {
    this.keyButtons = [];
    this.rowsOrder.forEach((row, i) => {
      const rowElement = create('div', 'keyboard__row', null, this.container, ['row', i + 1]);
      rowElement.style.gridTemplateColumns = `repeat(${row.length}, 1fr)`;
      row.forEach((code) => {
        const keyObj = this.keyBase.find((key) => key.code === code);
        if (keyObj) {
          const keyButton = new Key(keyObj);
          this.keyButtons.push(keyButton);
          rowElement.appendChild(keyButton.div);
        }
      });
  });
  document.addEventListener('keydown', this.handleEvent);
  document.addEventListener('keyup', this.handleEvent);
  this.container.onmousedown = this.preHandleEvent;
  this.container.onmouseup = this.preHandleEvent;
}

preHandleEvent = (e) => {
    e.stopPropagation();
    const keyDiv = e.target.closest('.keyboard__key');
    if (!keyDiv) return;
    const { dataset: { code } } = keyDiv;
    if ((!code.match(/Caps/)) && (!code.match(/Shift/)) && (!code.match(/Control/)) && (!code.match(/Alt/)) ){
   keyDiv.addEventListener('mouseleave', this.resetButtonState);
    }
    
    this.handleEvent({ code, type: e.type });
  };


  resetButtonState = ({ target: { dataset: { code } } }) => {
      const keyObj = this.keyButtons.find((key) => key.code === code);
      keyObj.div.classList.remove('active');
      keyObj.div.removeEventListener('mouseleave', this.resetButtonState);
  }


handleEvent = (e) => {
    if (e.stopPropagation) e.stopPropagation();
    const { code, type } = e;
    const keyObj = this.keyButtons.find((key) => key.code === code);
    if (!keyObj) return;
    this.output.focus();

    if (type.match(/keydown|mousedown/)) {
        if (type.match(/key/)) e.preventDefault();
        if (code.match(/Shift/)) this.shiftKey = true;

        if (this.shiftKey) this.switchUpperCase(true);

        keyObj.div.classList.add('active');
  
        if (code.match(/Caps/) && !this.isCaps) {
          this.isCaps = true;
          this.switchUpperCase(true);
        } else if (code.match(/Caps/) && this.isCaps) {
            this.isCaps = false;
            this.switchUpperCase(false);
            keyObj.div.classList.remove('active');
        }

        if (code.match(/Control/)) this.ctrKey = true;
        if (code.match(/Alt/)) this.altKey = true;
        
        if (code.match(/Control/) && this.altKey) this.switchLanguage();
        if (code.match(/Alt/) && this.ctrKey) this.switchLanguage();

        if (!this.isCaps) {
            this.printToOutput(keyObj, this.shiftKey ? keyObj.shift : keyObj.small);
        } else if (this.isCaps) {
            if (this.shiftKey) {
                this.printToOutput(keyObj, keyObj.sub.innerHTML ? keyObj.shift : keyObj.small);
            }else {
                this.printToOutput(keyObj, !keyObj.sub.innerHTML ? keyObj.shift : keyObj.small);
            }
        }
        
        } else if (type.match(/keyup|mouseup/)) {
            
            if (code.match(/Shift/)) {
                this.shiftKey = false;
                this.switchUpperCase(false);
            } 
            if (code.match(/Control/)) this.ctrKey = false;
            if (code.match(/Alt/)) this.altKey = false;

            if (!code.match(/Caps/)) keyObj.div.classList.remove('active');
        }
    }

    switchLanguage = () => {
        const langAbbr = Object.keys(language);
        let langIdx = langAbbr.indexOf(this.container.dataset.language);
        this.keyBase = langIdx + 1 < langAbbr.length ? language[langAbbr[langIdx += 1]]
        : language[langAbbr[langIdx -= langIdx]];

        this.container.dataset.language = langAbbr[langIdx];
        storage.set('kbLang', langAbbr[langIdx]);

        this.keyButtons.forEach((button) => {
            const keyObj = this.keyBase.find((key) => key.code === button.code);
            if (!keyObj) return;
            button.shift = keyObj.shift;
            button.small = keyObj.small;
            if (keyObj.shift && keyObj.shift.match(/[^a-zA-Zа-яА-ЯёЁ0-9]/g)) {
              button.sub.innerHTML = keyObj.shift;
            } else {
              button.sub.innerHTML = '';
            }
            button.letter.innerHTML = keyObj.small;
          });
          if (this.isCaps) this,this.switchUpperCase(true);
    }

    switchUpperCase(isTrue) {
        if (isTrue) {
          this.keyButtons.forEach((button) => {
            if (button.sub) {
              if (this.shiftKey) {
                button.sub.classList.add('sub-active');
                button.letter.classList.add('sub-inactive');
              }
            }
            if (!button.isFnKey && this.isCaps && !this.shiftKey && !button.sub.innerHTML) {
              button.letter.innerHTML = button.shift;
            } else if (!button.isFnKey && this.isCaps && this.shiftKey) {
              button.letter.innerHTML = button.small;
            } else if (!button.isFnKey && !button.sub.innerHTML) {
              button.letter.innerHTML = button.shift;
            }
          });
        } else {
          this.keyButtons.forEach((button) => {
            if (button.sub.innerHTML && !button.isFnKey) {
              button.sub.classList.remove('sub-active');
              button.letter.classList.remove('sub-inactive');
              if (!this.isCaps) {
                button.letter.innerHTML = button.small;
              } else if (!this.isCaps) {
                button.letter.innerHTML = button.shift;
              }
            } else if (!button.isFnKey) {
              if (this.isCaps) {
                button.letter.innerHTML = button.shift;
              } else {
                button.letter.innerHTML = button.small;
              }
            }
          });
        }
      }

    printToOutput(keyObj, symbol) {
        let cursorPos = this.output.selectionStart;
        const left = this.output.value.slice(0, cursorPos);
        const right = this.output.value.slice(cursorPos);
        const fnButtonsHandlers = {
          Tab: () => {
            this.output.value = `${left}\t${right}`;
            cursorPos += 1;
          },
          ArrowLeft: () => {
            cursorPos = cursorPos - 1 >= 0 ? cursorPos - 1 : 0;
          },
          ArrowRight: () => {
            cursorPos += 1;
          },
          ArrowUp: () => {
            const positionFromLeft = this.output.value.slice(0, cursorPos).match(/(\n).*$(?!\1)/g) || [[1]];
            cursorPos -= positionFromLeft[0].length;
          },
          ArrowDown: () => {
            const positionFromLeft = this.output.value.slice(cursorPos).match(/^.*(\n).*(?!\1)/) || [[1]];
            cursorPos += positionFromLeft[0].length;
          },
          Enter: () => {
            this.output.value = `${left}\n${right}`;
            cursorPos += 1;
          },
          Delete: () => {
            this.output.value = `${left}${right.slice(1)}`;
          },
          Backspace: () => {
            this.output.value = `${left.slice(0, -1)}${right}`;
            cursorPos -= 1;
          },
          Space: () => {
            this.output.value = `${left} ${right}`;
            cursorPos += 1;
          },
        };
        if (fnButtonsHandlers[keyObj.code]) fnButtonsHandlers[keyObj.code]();
        else if (!keyObj.isFnKey) {
          cursorPos += 1;
          this.output.value = `${left}${symbol || ''}${right}`;
        }
        this.output.setSelectionRange(cursorPos, cursorPos);
      }
    }

