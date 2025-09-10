class MyAlert extends HTMLElement {
  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    const type = this.getAttribute('type') || 'normalized';
    let h1Text = '';
    let pText = '';

    if (type === 'danger') {
      const date = this.getAttribute('date') || '00/00/0000';
      h1Text = 'Há uma inconsistência no apontamento de horas!';
      pText = `O ponto de saída do dia ${date} não foi registrado. Corrija manualmente ou entre em contato com o seu gestor.`;
    } else if (type === 'alert') {
      const corrections = this.getAttribute('corrections') || '0';
      const date = this.getAttribute('date') || '00/00/0000';
      h1Text = 'Cuidado com as correções manuais!';
      pText = `Você tem ${corrections} correções manuais para fazer até dia ${date}.`;
    } else {
      h1Text = 'Não há inconsistências!';
      pText = 'Não há inconsistências no apontamento de horas. Continue assim!';
    }

    this.shadow.innerHTML = `
      <style>
        :host {
          display: block;
          border-radius: 5px;
          padding: 15px;
          font-family: "Poppins", sans-serif;
          box-shadow: 0px 2px 6px rgba(0,0,0,0.1);
          margin-bottom: 10px;
        }
        .danger {
          padding: 15px;
          border-left: 4px solid #f00;
          border-radius: 8px;
          box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.11);
        }
        .alert {
          padding: 10px;
          border-left: 4px solid #ff0;
           border-radius: 8px;
           box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.11);
        }
        .normalized {
          padding: 10px;
          border-left: 4px solid #0f0;
          border-radius: 8px;
          box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.11);

        }
        h1 {
          margin: 0 0 5px 0;
          font-size: 16px;
        }
        p {
          margin: 0;
          font-size: 14px;
        }
      </style>
      <div class="${type}">
        <h1>${h1Text}</h1>
        <p>${pText}</p>
      </div>
    `;
  }
}

customElements.define('my-alert', MyAlert);
