import { get, patch } from "./connection.js";

// função única de login
async function realizarLogin(email, senha) {
    // 1. Pre-login
    const usuario = await get("/usuarios/preLogin", { email, senha });
    const idUsuario = usuario.id;

    // 2. Logar usuário
    const usuarioLogado = await patch(`/usuarios/${idUsuario}/logar`);
    return usuarioLogado;
}

document.addEventListener("DOMContentLoaded", () => {
    const btnLogin = document.getElementById("btn-login");

    btnLogin.addEventListener("click", async () => {
        const emailField = document.querySelector('filled-input[type="email"]');
        const senhaField = document.querySelector('filled-input[type="password"]');

        const email = getFilledInputValue(emailField).trim();
        const senha = getFilledInputValue(senhaField).trim();

        // validação de campos obrigatórios
        if (!email || !senha) {
            alert("Por favor, preencha o email e a senha.");
            return;
        }

        try {
            const usuarioArray = await get("/usuarios/preLogin", { email, senha });
            const usuario = Array.isArray(usuarioArray) ? usuarioArray[0] : usuarioArray;

            console.log(usuario);
            alert(`Boas Vindas, ${usuario.nome}!`);

            // Redireciona conforme cargo
            if (usuario.cargo === "GERENTE") {
                window.location.href = "./system/dashboard.html";
            } else {
                window.location.href = "./system/baterponto.html";
            }

        } catch (error) {
            alert("Falha no login: " + error.message);
        }
    });
});

function getFilledInputValue(filledInput) {
    // tenta pegar o valor direto
    if ("value" in filledInput) return filledInput.value;
    // se tiver shadow DOM
    const internalInput = filledInput.shadowRoot?.querySelector("input");
    return internalInput?.value || "";
}
