// Base URL do backend
export const BASE_URL = "http://localhost:8080";

// Função genérica para fazer GET
export async function get(endpoint, headers = {}) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: "GET",
    headers: headers
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Erro desconhecido no GET");
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
