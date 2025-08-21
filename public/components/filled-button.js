class MyButton extends HTMLElement {
  constructor() {
    super();

    const shadow = this.attachShadow({ mode: 'open' });

    this.button = document.createElement('button');
    this.button.classList.add('my-button');

    const slot = document.createElement('slot');
    this.button.appendChild(slot);

    const style = document.createElement('style');
    style.textContent = `
      .my-button {
        padding: 10px 20px;
        font-size: 12px;
        border: none;
        background: #008781;
        box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.25);
        border-radius: 7px;
        cursor: pointer;
        transition: background-color 0.3s;
        color: white;
        font-weight: bold;
        font-family: "Poppins";
        width: 100%;
      }
      .my-button:hover {
        background-color:rgb(0, 101, 95);
      }
    `;

    shadow.appendChild(style);
    shadow.appendChild(this.button);
  }

  connectedCallback() {
  }
}

customElements.define('filled-button', MyButton);
