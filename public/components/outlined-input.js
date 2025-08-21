class MyInput extends HTMLElement {
  constructor() {
    super();

    // Criando o Shadow DOM
    const shadow = this.attachShadow({ mode: 'open' });

    // Criando o input
    this.input = document.createElement('input');
    this.input.classList.add('outlined-input');

    // Definindo o type inicial (default: text)
    this.input.type = this.getAttribute('type') || 'text';

    // Definindo placeholder inicial
    if (this.hasAttribute('placeholder')) {
      this.input.placeholder = this.getAttribute('placeholder');
    }

    // Aplicando disabled se estiver definido
    if (this.hasAttribute('disabled')) {
      this.input.disabled = true;
    }

    // Estilos do Web Component
    const style = document.createElement('style');
    style.textContent = `
      .outlined-input {
        padding: 10px 15px;
        font-size: 14px;
        border: 1.5px solid #008781;
        border-radius: 7px;
        outline: none;
        font-family: "Poppins", sans-serif;
        transition: border-color 0.3s, box-shadow 0.3s;
        width: 100%;
        box-sizing: border-box;
      }

      .outlined-input:focus {
        border-color: rgb(0, 101, 95);
        box-shadow: 0 0 5px rgba(0, 101, 95, 0.5);
      }

      .outlined-input:disabled {
        background-color: #f0f0f0;
        color: #999;
        cursor: not-allowed;
      }
    `;

    // Adicionando ao shadow DOM
    shadow.appendChild(style);
    shadow.appendChild(this.input);
  }

  // Observando mudanças em atributos relevantes
  static get observedAttributes() {
    return ['placeholder', 'type', 'disabled'];
  }

  // Atualizando atributos dinamicamente
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'placeholder') {
      this.input.placeholder = newValue || '';
    }
    if (name === 'type') {
      this.input.type = newValue || 'text';
    }
    if (name === 'disabled') {
      this.input.disabled = newValue !== null;
    }
  }
}

customElements.define('filled-input', MyInput);
