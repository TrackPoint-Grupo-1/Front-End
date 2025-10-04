// Base URL do backend
export const BASE_URL = "http://localhost:8080";

export async function get(endpoint, headers = {}) {
  const url = `${BASE_URL}${endpoint}`;
  console.log("GET URL:", url); // 👈 loga a URL completa

  const response = await fetch(url, {
    method: "GET",
    headers: headers
  });

  if (!response.ok) {
    let errorText;
    try {
      // tenta interpretar como JSON
      const errorData = await response.json();
      errorText = errorData.message || JSON.stringify(errorData);
    } catch {
      // se não for JSON, pega texto mesmo (HTML do erro 404 por ex.)
      errorText = await response.text();
    }
    throw new Error(`Erro no GET [${response.status}]: ${errorText}`);
  }

  return response.json();
}

// Função genérica para PATCH
export async function patch(endpoint, body = null, headers = {}) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...headers
    },
    body: body ? JSON.stringify(body) : null
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Erro desconhecido no PATCH");
  }

  return response.json();
}
