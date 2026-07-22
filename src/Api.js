const BASE_URL = "http://127.0.0.1:8000"

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Ошибка сервера" }))
    throw new Error(err.detail || "Ошибка")
  }
  return res.json()
}

export const register = (login, password) =>
  request("/users", { method: "POST", body: JSON.stringify({ login, password }) })

export const getUser = (userId) =>
  request(`/users/${userId}`)

export const patchBalance = (userId, amount) =>
  request(`/users/${userId}/balance`, {
    method: "PATCH",
    body: JSON.stringify({ amount }),
  })

export const createSession = (login, password) =>
  request("/sessions", { method: "POST", headers: { login, password } })

export const deleteSession = (secret) =>
  request("/sessions", { method: "DELETE", headers: { "session-secret": secret } })

export const getEvents = (sportSlug = null) =>
  request(sportSlug ? `/events?sport_slug=${sportSlug}` : "/events")

export const createBet = (userId, secret, eventId, outcome, amount) =>
  request(`/users/${userId}/bets`, {
    method: "POST",
    headers: { "session-secret": secret },
    body: JSON.stringify({ event_id: eventId, outcome, amount }),
  })

export const getUserBets = (userId, secret) =>
  request(`/users/${userId}/bets`, {
    headers: { "session-secret": secret },
  })